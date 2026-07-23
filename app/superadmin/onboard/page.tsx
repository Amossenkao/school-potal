'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SchoolProfileForm, { SchoolFormData } from '../components/SchoolProfileForm';

export default function SuperAdminOnboardPage() {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (data: SchoolFormData) => {
		try {
			setSaving(true);
			setError('');
			const res = await fetch('/api/superadmin/schools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to create school');
			router.push('/superadmin/schools');
		} catch (e: any) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link href="/superadmin/schools" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Onboard New School</h1>
					<p className="text-sm text-gray-500 mt-1">Register a new school on the platform.</p>
				</div>
			</div>

			{error && (
				<div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
			)}

			<SchoolProfileForm onSubmit={handleSubmit} submitLabel="Create School" saving={saving} />
		</div>
	);
}
