'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoutes';

interface AdminLayoutProps {
	children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
	return (
		<ProtectedRoute requiredRole="system_admin">{children}</ProtectedRoute>
	);
}
