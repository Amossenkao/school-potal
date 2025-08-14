'use client';
import useAuth from '@/store/useAuth';
import DashboardHome from '@/components/DashboardHome';

export default function DashboardPage() {
	const { user } = useAuth();

	return (
		<>
			<title>Dashboard</title>
			<DashboardHome user={user} />
		</>
	);
}
