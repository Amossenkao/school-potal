'use client';
import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoutes';

interface TeacherLayoutProps {
	children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
	return <ProtectedRoute requiredRole="teacher">{children}</ProtectedRoute>;
}
