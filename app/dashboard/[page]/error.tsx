'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {

	useEffect(() => {
		console.error('Dashboard page error:', error);
	}, [error]);

	return (
		<div className="min-h-[60vh] flex items-center justify-center px-4">
			<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
				<h2 className="text-xl font-semibold text-foreground">
					Something went wrong
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					We couldn&apos;t load this dashboard page. Please try again.
				</p>
				<div className="mt-6 flex justify-center">
					<button
						type="button"
						onClick={reset}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-primary-foreground hover:bg-primary/90"
					>
						<RotateCw className="h-4 w-4" />
						Try Again
					</button>
				</div>
			</div>
		</div>
	);
}
