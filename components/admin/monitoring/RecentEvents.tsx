import { Clock } from 'lucide-react';

interface EventItem {
	id?: string;
	timestamp?: string;
	createdAt?: string;
	level?: string;
	severity?: string;
	message?: string;
	schoolName?: string;
	schoolId?: string;
	module?: string;
}

function eventTime(event: EventItem) {
	const value = event.timestamp || event.createdAt;
	if (!value) return 'Now';
	return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function RecentEvents({ events }: { events: EventItem[] }) {
	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-5 flex items-center gap-2">
				<Clock className="h-5 w-5 text-[#465fff]" />
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Events</h2>
			</div>
			{events.length === 0 ? (
				<p className="py-8 text-center text-sm text-gray-500">No recent monitoring events.</p>
			) : (
				<div className="divide-y divide-gray-100 dark:divide-gray-800">
					{events.slice(0, 10).map((event, index) => (
						<div key={event.id || index} className="grid gap-3 py-3 sm:grid-cols-[70px_90px_1fr]">
							<span className="text-xs font-medium text-gray-500">{eventTime(event)}</span>
							<span className="text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
								{event.level || event.severity || 'info'}
							</span>
							<div>
								<p className="text-sm font-medium text-gray-900 dark:text-white">{event.message || 'Monitoring event'}</p>
								<p className="mt-1 text-xs text-gray-500">
									School: {event.schoolName || event.schoolId || 'Platform'} · Module: {event.module || 'Core'}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
