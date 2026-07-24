'use client';

import { useParams, useRouter } from 'next/navigation';
import SchoolAdminsPanel from '@/app/dashboard/admin/components/SchoolAdminsPanel';

export default function SchoolAdminsPage() {
	const params = useParams();
	const router = useRouter();
	const host = (params?.id as string || '').trim();

	if (!host) {
		return <div className="py-20 text-center text-sm text-red-500">School not found</div>;
	}

	return (
		<SchoolAdminsPanel
			host={host}
			onClose={() => router.push('/dashboard/schools')}
			onOpenProfile={(h) => router.push(`/dashboard/admin/schools/${encodeURIComponent(h)}`)}
		/>
	);
}
