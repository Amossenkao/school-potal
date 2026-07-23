'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react';

export default function SuperAdminOnboardPage() {
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	const [form, setForm] = useState({
		name: '',
		shortName: '',
		initials: '',
		host: '',
		dbName: '',
		slogan: '',
		adminName: '',
		adminPhone: '',
		adminEmail: '',
	});

	const update = (field: string, value: string) =>
		setForm((prev) => ({ ...prev, [field]: value }));

	const generateDefaults = () => {
		const slug = form.shortName
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '')
			.slice(0, 12);
		if (slug && !form.host) update('host', `${slug}.schoolmesh.app`);
		if (slug && !form.dbName) update('dbName', `schoolmesh_${slug}`);
		if (form.shortName && !form.initials) update('initials', form.shortName.slice(0, 2).toUpperCase());
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError('');
		setSubmitting(true);

		try {
			const res = await fetch('/api/superadmin/schools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: form.name,
					shortName: form.shortName,
					initials: form.initials || form.shortName.slice(0, 2).toUpperCase(),
					host: form.host,
					dbName: form.dbName,
					slogan: form.slogan,
					sysAdmin: {
						name: form.adminName,
						phone: form.adminPhone,
						email: form.adminEmail,
					},
				}),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to onboard school');

			router.push('/superadmin');
		} catch (e: any) {
			setError(e.message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="max-w-2xl space-y-6">
			<div className="flex items-center gap-3">
				<Link href="/superadmin" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
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

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* School info */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">School Information</h3>
					<div className="grid gap-5 sm:grid-cols-2">
						<div className="sm:col-span-2">
							<Field label="School Name" required value={form.name} onChange={(v) => update('name', v)} placeholder="e.g. Springfield Academy" />
						</div>
						<Field label="Short Name" required value={form.shortName} onChange={(v) => update('shortName', v)} onBlur={generateDefaults} placeholder="e.g. Springfield" />
						<Field label="Initials" value={form.initials} onChange={(v) => update('initials', v)} placeholder="e.g. SA" />
						<Field label="Host" required value={form.host} onChange={(v) => update('host', v)} placeholder="e.g. springfield.schoolmesh.app" />
						<Field label="Database Name" required value={form.dbName} onChange={(v) => update('dbName', v)} placeholder="e.g. schoolmesh_springfield" />
						<div className="sm:col-span-2">
							<Field label="Slogan" value={form.slogan} onChange={(v) => update('slogan', v)} placeholder="e.g. Excellence in education" />
						</div>
					</div>
				</div>

				{/* Sys Admin info */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Admin Account</h3>
					<div className="grid gap-5 sm:grid-cols-2">
						<Field label="Admin Name" required value={form.adminName} onChange={(v) => update('adminName', v)} placeholder="Full name" />
						<Field label="Phone" required value={form.adminPhone} onChange={(v) => update('adminPhone', v)} placeholder="Phone number" />
						<div className="sm:col-span-2">
							<Field label="Email" value={form.adminEmail} onChange={(v) => update('adminEmail', v)} placeholder="Email address (optional)" />
						</div>
					</div>
				</div>

				<div className="flex justify-end">
					<button
						type="submit"
						disabled={submitting || !form.name || !form.shortName || !form.host || !form.dbName || !form.adminName || !form.adminPhone}
						className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50 transition-colors"
					>
						{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
						{submitting ? 'Creating...' : 'Create School'}
					</button>
				</div>
			</form>
		</div>
	);
}

function Field({
	label,
	required,
	value,
	onChange,
	onBlur,
	placeholder,
}: {
	label: string;
	required?: boolean;
	value: string;
	onChange: (v: string) => void;
	onBlur?: () => void;
	placeholder?: string;
}) {
	return (
		<div>
			<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
				{label} {required && <span className="text-red-400">*</span>}
			</label>
			<input
				type="text"
				required={required}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				placeholder={placeholder}
				className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
			/>
		</div>
	);
}
