import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/middleware';
import { getTenantModels } from '@/models';
import { updateUserSessionNotifications } from '@/utils/session';
import { Notification } from '@/types';

export async function PATCH(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { action, notificationId, tab } = body;

		const { User } = await getTenantModels();
		const user = await User.findById(currentUser.userId);

		if (!user) {
			return NextResponse.json(
				{ success: false, message: 'User not found.' },
				{ status: 404 }
			);
		}

		switch (action) {
			// a. Mark a single notification as read
			case 'markAsRead': {
				if (!notificationId) {
					return NextResponse.json(
						{ success: false, message: 'Notification ID is required.' },
						{ status: 400 }
					);
				}
				const notification = user.notifications.id(notificationId);
				console.log('Marking notification as read:', notificationId);
				if (notification) {
					notification.read = true;
				}
				break;
			}

			// b. Mark all notifications as read (optionally by tab)
			case 'markAllAsRead': {
				const tabToFilter = !tab || tab.toLowerCase() === 'all' ? 'all' : tab;
				user.notifications.forEach((notif: Notification) => {
					if (
						!notif.read &&
						(tabToFilter === 'all' ||
							notif.type.toLowerCase() === tabToFilter.toLowerCase())
					) {
						notif.read = true;
					}
				});
				break;
			}

			// c. Dismiss a notification from the dropdown
			case 'dismiss': {
				if (!notificationId) {
					return NextResponse.json(
						{ success: false, message: 'Notification ID is required.' },
						{ status: 400 }
					);
				}
				const notification = user.notifications.id(notificationId);
				if (notification) {
					notification.dismissed = true;
				}
				break;
			}

			// d. Delete non-essential notifications
			case 'delete': {
				if (!notificationId) {
					return NextResponse.json(
						{ success: false, message: 'Notification ID is required.' },
						{ status: 400 }
					);
				}
				const notification = user.notifications.id(notificationId);
				if (!notification) {
					return NextResponse.json(
						{ success: false, message: 'Notification not found.' },
						{ status: 404 }
					);
				}
				if (['Grades', 'Security'].includes(notification.type)) {
					return NextResponse.json(
						{
							success: false,
							message: 'Essential notifications cannot be deleted.',
						},
						{ status: 403 }
					);
				}
				user.notifications.pull(notificationId);
				break;
			}

			default:
				return NextResponse.json(
					{ success: false, message: 'Invalid action provided.' },
					{ status: 400 }
				);
		}

		await user.save();
		await updateUserSessionNotifications(
			currentUser.userId,
			user.notifications
		);

		return NextResponse.json({
			success: true,
			message: `Action '${action}' completed successfully.`,
			data: {
				notifications: user.notifications,
			},
		});
	} catch (error) {
		console.error('Error processing notification action:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// Kept GET method for fetching notifications
export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
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

		const notifications = (user.notifications || []).sort(
			(a: any, b: any) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);

		return NextResponse.json({
			success: true,
			data: {
				notifications,
				unreadCount: user.notifications.filter((n: any) => !n.read).length,
			},
		});
	} catch (error) {
		console.error('Error fetching notifications:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
