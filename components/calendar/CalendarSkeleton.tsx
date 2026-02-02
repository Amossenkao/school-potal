'use client';

export default function CalendarSkeleton() {
	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
			<div className="flex items-center justify-between">
				<div className="h-6 w-40 animate-pulse rounded bg-muted"></div>
				<div className="flex gap-2">
					<div className="h-9 w-20 animate-pulse rounded bg-muted"></div>
					<div className="h-9 w-20 animate-pulse rounded bg-muted"></div>
				</div>
			</div>
			<div className="mt-6 grid grid-cols-7 gap-2">
				{Array.from({ length: 7 }).map((_, index) => (
					<div
						key={`header-${index}`}
						className="h-4 rounded bg-muted/70"
					></div>
				))}
			</div>
			<div className="mt-4 grid grid-cols-7 gap-2">
				{Array.from({ length: 35 }).map((_, index) => (
					<div
						key={`cell-${index}`}
						className="h-16 rounded bg-muted/40 animate-pulse"
					></div>
				))}
			</div>
		</div>
	);
}
