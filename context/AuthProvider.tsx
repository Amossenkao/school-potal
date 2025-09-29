// app/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';

export default function AuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const { checkAuthStatus } = useAuth();

	useEffect(() => {
		let mounted = true;

		(async () => {
			// 1) authoritative call: try to get user + school from /api/auth/me
			await checkAuthStatus();

			if (mounted) {
				const currentSchool = useSchoolStore.getState().school;
				if (!currentSchool) {
					// fetchSchool() internally checks localStorage and prevents double fetches
					await useSchoolStore.getState().fetchSchool();
				}
			}
		})();

		const interval = setInterval(() => {
			checkAuthStatus();
		}, 15000); // every 15 seconds

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, [checkAuthStatus]);

	return <>{children}</>;
}
