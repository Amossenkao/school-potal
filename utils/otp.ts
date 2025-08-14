import { getSession, createSession, destroySession } from '@/utils/session';

export async function verifyOTP(
	sessionId: string,
	otp: string,
	host: string,
	userId: string
) {
	let success = false,
		status = 401,
		message = 'Invalid request';

	if (!otp || !sessionId || !host || !userId) {
		throw new Error('Missing required parameters for OTP verification');
	}

	try {
		const session = await getSession(sessionId);

		if (
			!session ||
			!session.userId ||
			!session.tenantId ||
			!session.otp ||
			session.tenantId !== host ||
			session.userId !== userId ||
			session.purpose !== 'otp_verification'
		) {
			message = 'Invalid or expired session';
		}

		if (session?.otp !== Number(otp)) {
			message = 'Invalid OTP';
		} else if (session?.otp === Number(otp)) {
			success = true;
			message = 'OTP verified successfully';
			status = 200;

			// Clear OTP from session after successful verification
			await destroySession(sessionId);
		}
	} catch (error) {
		message = 'Internal server error';
		status = 500;
	}

	return { success, message, status };
}

export async function sendOTP(userId: string, host: string) {
	if (!userId || !host) {
		throw new Error('Missing required parameters for sending OTP');
	}

	let success = false,
		status = 500,
		message,
		sessionId,
		otp;

	try {
		otp = Math.floor(100000 + Math.random() * 900000).toString();
		console.log('Generated OTP:', otp);

		sessionId = await createSession(
			{
				userId,
				tenantId: host,
				otp,
				purpose: 'otp_verification',
			},
			60 * 5
		);
		// This is where the actual logic for sending the OTP will live
		success = true;
		message = 'OTP sent successfully, please check your phone or email';
		status = 200;
	} catch (error) {
		console.error('Error sending OTP:', error);
		message = 'Internal server error';
		status = 500;
	}

	return {
		status,
		data: {
			success,
			message,
			sessionId,
			otp,
			requiresOTP: true,
			userId,
		},
	};
}
