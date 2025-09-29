'use client';
import { Bell, CheckCircle, Info, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import useAuth from '@/store/useAuth';

type Notification = {
	_id: string;
	title: string;
	message: string;
	type: 'Grades' | 'Security' | 'Profile';
	read: boolean;
	timestamp: string;
};

const NotificationDropdown = () => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdown = useRef<HTMLLIElement>(null);
	const { user } = useAuth();
	const unreadCount =
		user?.notifications?.filter((n: Notification) => !n.read).length || 0;

	useEffect(() => {
		const clickHandler = (event: MouseEvent) => {
			if (!dropdown.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('click', clickHandler);
		return () => document.removeEventListener('click', clickHandler);
	}, []);

	const getIcon = (type: Notification['type']) => {
		switch (type) {
			case 'Grades':
				return <CheckCircle className="w-5 h-5 text-green-500" />;
			case 'Security':
				return <ShieldCheck className="w-5 h-5 text-red-500" />;
			case 'Profile':
				return <User className="w-5 h-5 text-blue-500" />;
			default:
				return <Info className="w-5 h-5 text-gray-500" />;
		}
	};

	return (
		<li className="relative" ref={dropdown}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray-100 hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
			>
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1">
						<span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
					</span>
				)}
				<Bell className="w-5 h-5" />
			</button>

			{/* Dropdown Start */}
			<div
				className={`absolute right-0 mt-2.5 flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:w-80 ${
					isOpen ? 'block' : 'hidden'
				}`}
			>
				<div className="px-4.5 py-3">
					<h5 className="text-sm font-medium text-bodydark2">Notifications</h5>
				</div>

				<ul className="flex h-auto flex-col overflow-y-auto">
					{user?.notifications && user.notifications.length > 0 ? (
						user.notifications
							.slice() // Create a shallow copy to avoid mutating the original array
							.sort(
								(a, b) =>
									new Date(b.timestamp).getTime() -
									new Date(a.timestamp).getTime()
							)
							.map((notification: Notification) => (
								<li
									key={notification._id}
									className="border-t border-stroke hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
								>
									<Link
										className="flex gap-4.5 px-4.5 py-3"
										href="/dashboard/notifications"
									>
										<div className="h-12.5 w-12.5 rounded-full flex items-center justify-center bg-gray-100 dark:bg-meta-4">
											{getIcon(notification.type)}
										</div>
										<div>
											<h6 className="text-sm font-medium text-black dark:text-white">
												{notification.title}
											</h6>
											<p className="text-sm">{notification.message}</p>
											<p className="text-xs">
												{new Date(notification.timestamp).toLocaleDateString()}
											</p>
										</div>
									</Link>
								</li>
							))
					) : (
						<li className="flex items-center justify-center p-4">
							<p className="text-sm text-bodydark2">No new notifications</p>
						</li>
					)}
				</ul>
			</div>
			{/* Dropdown End */}
		</li>
	);
};

export default NotificationDropdown;
