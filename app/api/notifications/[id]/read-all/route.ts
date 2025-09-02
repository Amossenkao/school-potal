import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/middleware';
import { getTenantModels } from '@/models';
import { updateUserSessionNotifications } from '@/utils/session';

export async function POST(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const { tab } = await request.json(); // e.g., 'all', 'Grades', 'Security'

		const { User } = await getTenantModels();
		const user = await User.findById(currentUser.userId);

		if (!user) {
			return NextResponse.json(
				{ success: false, message: 'User not found.' },
				{ status: 404 }
			);
		}

		user.notifications.forEach((notif: any) => {
			if (tab === 'all' || notif.type === tab) {
				notif.read = true;
			}
		});

		await user.save();

		// Update session
		await updateUserSessionNotifications(
			currentUser.userId,
			user.notifications
		);

		return NextResponse.json({
			success: true,
			message: 'Notifications marked as read.',
			data: user.notifications,
		});
	} catch (error) {
		console.error('Error marking all notifications as read:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
