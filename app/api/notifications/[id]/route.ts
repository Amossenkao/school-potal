import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/middleware';
import { getTenantModels } from '@/models';
import { updateUserSessionNotifications } from '@/utils/session';

export async function PATCH(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const notificationId = searchParams.get('id');
		if (!notificationId) {
			return NextResponse.json(
				{ success: false, message: 'Notification ID is required.' },
				{ status: 400 }
			);
		}

		const { User } = await getTenantModels();
		const user = await User.findById(currentUser.userId);

		if (!user) {
			return NextResponse.json(
				{ success: false, message: 'User not found.' },
				{ status: 404 }
			);
		}

		const notification = user.notifications.id(notificationId);
		if (!notification) {
			return NextResponse.json(
				{ success: false, message: 'Notification not found.' },
				{ status: 404 }
			);
		}

		notification.read = true;
		await user.save();

		await updateUserSessionNotifications(
			currentUser.userId,
			user.notifications
		);

		return NextResponse.json({
			success: true,
			message: 'Notification marked as read.',
			data: user.notifications,
		});
	} catch (error) {
		console.error('Error marking notification as read:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
