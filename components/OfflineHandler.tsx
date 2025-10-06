// components/OfflineHandler.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

	// Update current path reference
	useEffect(() => {
		if (isOnline || !authCheckFailed) {
			currentPathRef.current = pathname;
		}
	}, [pathname, isOnline, authCheckFailed]);

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
		}
	}, [pathname, isOnline, authCheckFailed]);

	return <>{children}</>;
}
