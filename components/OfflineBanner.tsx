'use client';

import { useEffect, useState } from 'react';
import { useNetworkStore } from '@/store/networkStore';

export default function OfflineBanner() {
	const { isOnline, isSyncing } = useNetworkStore();
	const [visible, setVisible] = useState(false);
	const [justCameOnline, setJustCameOnline] = useState(false);

	useEffect(() => {
		if (!isOnline) {
			setJustCameOnline(false);
			setVisible(true);
			return;
		}

		if (isSyncing) {
			setVisible(true);
			setJustCameOnline(false);
			return;
		}

		if (visible && isOnline) {
			setJustCameOnline(true);
			const t = setTimeout(() => {
				setVisible(false);
				setJustCameOnline(false);
			}, 2500);
			return () => clearTimeout(t);
		}
	}, [isOnline, isSyncing]);

	if (!visible && !justCameOnline) return null;

	const isRecovering = justCameOnline || (isOnline && isSyncing);

	return (
		<div
			className={`
				fixed top-[var(--app-header-height,4rem)] left-1/2 -translate-x-1/2 z-[70]
				pointer-events-none
				transition-all duration-500 ease-out
				${visible || justCameOnline ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
			`}
			role="status"
			aria-live="polite"
		>
			<div
				className={`
					pointer-events-auto
					flex items-center gap-2
					px-3 py-1.5 sm:px-4 sm:py-2
					rounded-full
					border shadow-lg
					backdrop-blur-xl
					font-medium text-xs sm:text-[0.8rem]
					transition-colors duration-500
					${
						isRecovering
							? 'bg-success/10 border-success/30 text-success dark:text-success'
							: 'bg-error/10 border-error/30 text-error dark:text-error'
					}
				`}
			>
				<span className="relative flex h-2 w-2 shrink-0">
					<span
						className={`
							absolute inline-flex h-full w-full rounded-full
							${
								isRecovering
									? 'bg-success animate-ping'
									: 'bg-error animate-ping'
							}
							opacity-75
						`}
					/>
					<span
						className={`
							relative inline-flex h-2 w-2 rounded-full
							${isRecovering ? 'bg-success' : 'bg-error'}
						`}
					/>
				</span>

				{isRecovering ? (
					<span className="flex items-center gap-1.5">
						{isSyncing && !justCameOnline ? (
							<>
								<svg
									className="h-3.5 w-3.5 animate-spin"
									viewBox="0 0 24 24"
									fill="none"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="3"
									/>
									<path
										className="opacity-75"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										fill="currentColor"
									/>
								</svg>
								Syncing changes…
							</>
						) : (
							<>
								<svg
									className="h-3.5 w-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
								Back online
							</>
						)}
					</span>
				) : (
					<span className="flex items-center gap-1.5">
						<svg
							className="h-3.5 w-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M1 1l22 22" />
							<path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
							<path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
							<path d="M10.71 5.05A16 16 0 0122.56 9" />
							<path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
							<path d="M8.53 16.11a6 6 0 016.95 0" />
							<line x1="12" y1="20" x2="12.01" y2="20" />
						</svg>
						Offline
					</span>
				)}
			</div>
		</div>
	);
}
