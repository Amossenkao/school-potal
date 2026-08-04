'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoutes';

/**
 * The pages in this group are aliases of pages under /dashboard/admin, whose
 * own layout restricts them to system admins. Because the aliases sit outside
 * app/dashboard/admin they do not inherit that guard, so this route group
 * re-applies it. The group name is parenthesised, so the URLs are unchanged
 * (/dashboard/schools, /dashboard/onboard, …).
 */
export default function SuperAdminAliasLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ProtectedRoute
			allowedRoles={['system_admin', 'superadmin']}
			spinnerVariant="school"
		>
			{children}
		</ProtectedRoute>
	);
}
