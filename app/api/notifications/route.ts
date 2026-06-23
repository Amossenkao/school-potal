import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { updateUserSessionNotifications } from '@/utils/session';
import { Notification } from '@/types';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';

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
		const currentUserId = currentUser.userId || currentUser.id;
		const user = await User.findById(currentUserId);

		if (!user) {
			return NextResponse.json(
				{ success: false, message: 'User not found.' },
				{ status: 404 }
			);
		}
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const tenantKey = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: request.headers.get('host'),
		});

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

			// a2. Mark a single notification as read and dismissed
			case 'markAsReadAndDismiss': {
				if (!notificationId) {
					return NextResponse.json(
						{ success: false, message: 'Notification ID is required.' },
						{ status: 400 }
					);
				}
				const notification = user.notifications.id(notificationId);
				if (notification) {
					notification.read = true;
					notification.dismissed = true;
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
		await updateUserSessionNotifications(currentUserId, user.notifications);
		await publishSyncEventSafe({
			tenantKey,
			domain: 'user',
			actorId: currentUserId,
			reason: `notifications-${String(action || 'update')}`,
			targetUserIds: [String(currentUserId)],
		});

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
		const currentUserId = currentUser.userId || currentUser.id;
		const user = await User.findById(currentUserId);

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
