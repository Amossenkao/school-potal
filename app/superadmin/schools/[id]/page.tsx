'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
	ArrowLeft, Loader2, Trash2, Users, GraduationCap, BookOpen, ShieldCheck, UserPlus, Settings,
} from 'lucide-react';
import SchoolProfileForm, { SchoolFormData } from '../../components/SchoolProfileForm';
import { useSuperadminRealtime } from '../../hooks/useSuperadminRealtime';
import type { RealtimeEvent } from '@/lib/realtimeTypes';

interface SchoolStats {
	students: number;
	teachers: number;
	administrators: number;
	systemAdmins: number;
	total: number;
}

export default function SchoolDetailPage() {
	const params = useParams();
	const router = useRouter();
	const host = params?.id as string;

	const [school, setSchool] = useState<SchoolFormData | null>(null);
	const [stats, setStats] = useState<SchoolStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	useEffect(() => {
		if (host) {
			fetchSchool();
			fetchStats();
		}
	}, [host]);

	const fetchSchool = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/superadmin/schools/${host}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load school');
			setSchool({
				...data.school,
				logoUrl2: data.school.logoUrl2 || '',
				yearFounded: data.school.yearFounded || '',
				administrativePositions: data.school.administrativePositions || [],
				enabledFeatures: data.school.enabledFeatures || [],
				roleFeatureAccess: data.school.roleFeatureAccess || { student: [], teacher: [], system_admin: [], administrator: {} },
				settings: {
					studentSettings: { loginAccess: true, reportAccessByYear: {}, ...(data.school.settings?.studentSettings || {}) },
					teacherSettings: { loginAccess: true, permissionsByYear: {}, ...(data.school.settings?.teacherSettings || {}) },
					administratorSettings: { loginAccess: true, ...(data.school.settings?.administratorSettings || {}) },
					gradingSettings: { passMark: 50, gradeScale: { min: 0, max: 100 }, summerSchoolWeight: 0, failureWeight: 0, givesDoublePromotion: false, givesDemotion: false, ...(data.school.settings?.gradingSettings || {}) },
				},
				classLevels: data.school.classLevels || {},
				feeSchedules: data.school.feeSchedules || {},
				address: data.school.address || [],
				phones: data.school.phones || [],
				emails: data.school.emails || [],
			});
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const fetchStats = async () => {
		try {
			const res = await fetch(`/api/superadmin/schools/${host}/stats`);
			const data = await res.json();
			if (res.ok) setStats(data);
		} catch {}
	};

	const handleSave = async (data: SchoolFormData) => {
		try {
			setSaving(true);
			setError('');
			setSuccess('');
			const res = await fetch(`/api/superadmin/schools/${host}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to save');
			setSuccess('Changes saved successfully.');
			setTimeout(() => setSuccess(''), 3000);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	const deleteSchool = async () => {
		try {
			setSaving(true);
			const res = await fetch(`/api/superadmin/schools/${host}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete school');
			router.push('/superadmin/schools');
		} catch (e: any) {
			setError(e.message);
			setSaving(false);
		}
	};

	const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
		const reason = String(event.payload?.reason || event.reason || '').trim();
		if (reason === 'school-deleted') {
			router.push('/superadmin/schools');
			return;
		}
		if (reason === 'school-updated' || reason === 'school-toggled-active') {
			fetchSchool();
			fetchStats();
		}
	}, [router]);

	useSuperadminRealtime({ schoolHosts: [host], onEvent: handleRealtimeEvent });

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
			</div>
		);
	}

	if (!school) {
		return <div className="py-20 text-center text-sm text-red-500">{error || 'School not found'}</div>;
	}

	const statCards = stats ? [
		{ label: 'Students', value: stats.students, icon: GraduationCap, color: '#F59E0B', bg: 'bg-amber-50' },
		{ label: 'Teachers', value: stats.teachers, icon: BookOpen, color: '#8B5CF6', bg: 'bg-purple-50' },
		{ label: 'Administrators', value: stats.administrators, icon: Users, color: '#EC4899', bg: 'bg-pink-50' },
		{ label: 'System Admins', value: stats.systemAdmins, icon: ShieldCheck, color: '#465fff', bg: 'bg-[#465fff]/10' },
	] : [];

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-3">
					<Link href="/superadmin/schools" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">{school.name || 'School Details'}</h1>
						<p className="text-sm text-gray-500">{school.host} · {school.dbName}</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<Link
						href={`/superadmin/schools/${host}/admins`}
						className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:text-gray-400"
					>
						<ShieldCheck className="h-4 w-4" />
						Manage Admins
					</Link>
					<button
						onClick={() => setShowDeleteConfirm(true)}
						className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
					>
						<Trash2 className="h-4 w-4" />
						Delete
					</button>
				</div>
			</div>

			{success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}
			{error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

			{/* Stats Cards */}
			{stats && (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					{statCards.map((stat) => {
						const Icon = stat.icon;
						return (
							<div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
								<div className="flex items-center justify-between mb-2">
									<p className="text-xs font-medium text-gray-500">{stat.label}</p>
									<div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
										<Icon className="h-4 w-4" style={{ color: stat.color }} />
									</div>
								</div>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value.toLocaleString()}</p>
							</div>
						);
					})}
				</div>
			)}

			<SchoolProfileForm initialData={school} onSubmit={handleSave} submitLabel="Save Changes" saving={saving} />

			{showDeleteConfirm && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
						<h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
						<p className="mt-2 text-sm text-gray-500">
							Type <span className="font-mono font-semibold">{school.name}</span> to confirm.
						</p>
						<input
							type="text"
							placeholder="Type school name..."
							className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-gray-800 dark:bg-gray-800"
							id="delete-confirm-input"
							autoFocus
						/>
						<div className="mt-6 flex justify-end gap-3">
							<button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
							<button
								onClick={() => {
									const input = document.getElementById('delete-confirm-input') as HTMLInputElement;
									if (input?.value === school.name) deleteSchool();
								}}
								disabled={saving}
								className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
							>
								{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
