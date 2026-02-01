// components/OfflineHandler.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { useNetworkStore } from '@/store/networkStore';

export default function OfflineHandler({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const { isOnline, authCheckFailed } = useNetworkStore();
	const currentPathRef = useRef(pathname);
	const [showOfflineGate, setShowOfflineGate] = useState(false);

	// Update current path reference
	useEffect(() => {
		if (isOnline || !authCheckFailed) {
			currentPathRef.current = pathname;
			if (showOfflineGate) setShowOfflineGate(false);
		}
	}, [pathname, isOnline, authCheckFailed, showOfflineGate]);

	useEffect(() => {
		// Prevent navigation when offline by intercepting clicks
		const handleClickCapture = (e: MouseEvent) => {
			if (!isOnline && authCheckFailed) {
				const target = e.target as HTMLElement;

				// Find if the click was on a link or inside a link
				const link = target.closest('a');

				if (link) {
					const href = link.getAttribute('href');

					// Block internal dashboard navigation
					if (
						href &&
						(href.startsWith('/dashboard') || href.startsWith('/admin'))
					) {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();

						console.log(
							'[OfflineHandler] Navigation blocked - you are offline'
						);
						setShowOfflineGate(true);

						// Optional: Show toast notification
						// toast.warning('You are offline. Navigation is disabled.');

						return false;
					}
				}
			}
		};

		// Use capture phase to catch events before they bubble
		document.addEventListener('click', handleClickCapture, true);

		return () => {
			document.removeEventListener('click', handleClickCapture, true);
		};
	}, [isOnline, authCheckFailed]);

	// Prevent programmatic navigation when offline
	useEffect(() => {
		if (!isOnline && authCheckFailed && pathname !== currentPathRef.current) {
			// User tried to navigate while offline, stay on current page
			console.log('[OfflineHandler] Programmatic navigation blocked - offline');
			setShowOfflineGate(true);
			router.replace(currentPathRef.current);
		}
	}, [pathname, isOnline, authCheckFailed, router]);

	return (
		<>
			{children}
			{showOfflineGate && (
				<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
					<div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-2xl">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
							<WifiOff className="h-7 w-7 text-muted-foreground" />
						</div>
						<h2 className="mt-4 text-center text-xl font-semibold text-foreground">
							You're Offline
						</h2>
						<p className="mt-2 text-center text-sm text-muted-foreground">
							You're currently offline, so this page can't be loaded. Go back to
							your previous view and try again when you're connected.
						</p>
						<div className="mt-6 flex justify-center">
							<button
								type="button"
								onClick={() => setShowOfflineGate(false)}
								className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
							>
								Back
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
