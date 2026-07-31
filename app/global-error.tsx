'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
		fetch('/api/observability/client-error', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: error.name,
				message: error.message,
				stack: error.stack,
				digest: error.digest,
				module: 'global-error',
				operation: 'react.global_error_boundary',
				path: window.location.pathname,
			}),
			keepalive: true,
		}).catch(() => undefined);
	}, [error]);

	return (
		<html>
			<body>
				<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
					<h1 className="text-2xl font-semibold">Something went wrong</h1>
					<button
						className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
						onClick={reset}
						type="button"
					>
						Try again
					</button>
				</main>
			</body>
		</html>
	);
}
