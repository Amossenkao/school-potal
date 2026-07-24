'use client';

import { useParams, useRouter } from 'next/navigation';
import SchoolProfilePanel from '@/app/dashboard/admin/components/SchoolProfilePanel';

export default function SchoolDetailPage() {
	const params = useParams();
	const router = useRouter();
	const host = (params?.id as string || '').trim();

	if (!host) {
		return <div className="py-20 text-center text-sm text-red-500">School not found</div>;
	}

	return (
		<SchoolProfilePanel
			host={host}
			onClose={() => router.push('/dashboard/schools')}
			onOpenAdmins={(h) => router.push(`/dashboard/admin/schools/${encodeURIComponent(h)}/admins`)}
		/>
	);
}
