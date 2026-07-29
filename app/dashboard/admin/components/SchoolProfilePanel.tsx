'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, Trash2, Users, GraduationCap, BookOpen, ShieldCheck, ToggleLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import SchoolProfileForm, { type SchoolFormState } from '@/app/dashboard/admin/components/SchoolProfileForm';
import { useSuperadminRealtime } from '@/app/dashboard/admin/hooks/useSuperadminRealtime';
import type { RealtimeEvent } from '@/lib/realtimeTypes';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { DEFAULT_TENANT_THEME_NAME } from '@/types/tenantTheme';

interface SchoolStats {
	students: number;
	teachers: number;
	administrators: number;
	systemAdmins: number;
	total: number;
}

const normalizeSchoolStats = (school: any): SchoolStats | null => {
	if (!school) return null;
	const source = school.stats || school.users || {};
	const stats = {
		students: Number(source.students || 0),
		teachers: Number(source.teachers || 0),
		administrators: Number(source.administrators || 0),
		systemAdmins: Number(source.systemAdmins || 0),
		total: Number(source.total || school.totalUsers || 0),
	};
	stats.total =
		stats.total ||
		stats.students + stats.teachers + stats.administrators + stats.systemAdmins;
	return stats;
};

const normalizeSchoolFormState = (school: any): SchoolFormState => {
	const sys = school?.system || {};
	const id = school?.identity || {};
	const br = school?.branding || {};
	const co = school?.contact || {};
	const ac = school?.academicConfig || {};
	const uc = school?.userConfig || {};
	const fc = school?.featureConfig || {};
	const fi = school?.financialConfig || {};

	return {
		system: {
			host: sys.host || school?.host || '',
			dbName: sys.dbName || school?.dbName || '',
			isActive: sys.isActive ?? school?.isActive ?? true,
			matchHost: (sys.host || school?.host || '').replace(/[.-]/g, '_') === (sys.dbName || school?.dbName || ''),
		},
		identity: {
			name: id.name || school?.name || '',
			shortName: id.shortName || school?.shortName || '',
			initials: id.initials || school?.initials || '',
			slogan: id.slogan || school?.slogan || '',
			studentIdPrefix: id.studentIdPrefix || school?.studentIdPrefix || '',
			yearFounded: id.yearFounded || school?.yearFounded || '',
			firstAcademicYear: id.firstAcademicYear || school?.firstAcademicYear || '',
			currentAcademicYear: id.currentAcademicYear || school?.currentAcademicYear || '',
		},
		branding: {
			logoUrl: br.logoUrl || school?.logoUrl || '',
			logoUrl2: br.logoUrl2 || school?.logoUrl2 || '',
			themeName: br.themeName || school?.themeName || DEFAULT_TENANT_THEME_NAME,
			reportCardThemes: br.reportCardThemes || school?.reportCardThemes || {},
		},
		contact: {
			addresses: co.addresses?.map((a: any) => ({
				label: a.label,
				lines: a.lines || [],
			})) || [],
			phones: co.phones || school?.phones || [],
			emails: co.emails || school?.emails || [],
			website: co.website || school?.website || '',
		},
		academicConfig: {
			classLevels: ac.classLevels || school?.classLevels || {},
			gradingSettings: {
				passMark: ac.gradingSettings?.passMark ?? 50,
				gradeScale: ac.gradingSettings?.gradeScale ?? { min: 0, max: 100 },
				hasSummerSchool: ac.gradingSettings?.hasSummerSchool ?? false,
				givesDoublePromotion: ac.gradingSettings?.givesDoublePromotion ?? false,
			},
		},
		userConfig: {
			administrativePositions: uc.administrativePositions || school?.administrativePositions || [],
			sysAdmin: uc.sysAdmin || school?.sysAdmin || { name: '', phone: '', email: '' },
			studentSettings: {
				loginAccess: uc.studentSettings?.loginAccess ?? true,
				reportAccessByYear: uc.studentSettings?.reportAccessByYear || {},
			},
			teacherSettings: {
				loginAccess: uc.teacherSettings?.loginAccess ?? true,
				permissionsByYear: uc.teacherSettings?.permissionsByYear || {},
			},
			administratorSettings: {
				loginAccess: uc.administratorSettings?.loginAccess ?? true,
			},
		},
		featureConfig: {
			enabledFeatures: fc.enabledFeatures || school?.enabledFeatures || [],
			roleFeatureAccess: fc.roleFeatureAccess || school?.roleFeatureAccess || {
				student: [],
				teacher: [],
				system_admin: [],
				administrator: {},
			},
		},
		financialConfig: {
			currencies: fi.currencies || school?.currencies || [],
			paymentCategories: fi.paymentCategories || school?.paymentCategories || [],
			feeDefinitions: fi.feeDefinitions || school?.feeDefinitions || [],
			paymentPlans: fi.paymentPlans || school?.paymentPlans || [],
			studentGroups: fi.studentGroups || school?.studentGroups || [],
			feeSchedules: fi.feeSchedules || school?.feeSchedules || [],
		},
	};
};

interface SchoolProfilePanelProps {
	host: string;
	onClose: () => void;
	onOpenAdmins?: (host: string) => void;
	onDeleted?: (host: string) => void;
}

export default function SchoolProfilePanel({ host, onClose, onOpenAdmins, onDeleted }: SchoolProfilePanelProps) {
	const cachedSchool = useAuth((state) =>
		state.superAdminSchools.find((item: any) => item.host === host),
	) as any;
	const upsertSuperAdminSchool = useAuth((state) => state.upsertSuperAdminSchool);
	const removeSuperAdminSchool = useAuth((state) => state.removeSuperAdminSchool);

	const [school, setSchool] = useState<SchoolFormState | null>(null);
	const [stats, setStats] = useState<SchoolStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [togglingActive, setTogglingActive] = useState(false);

	useEffect(() => {
		if (!host) return;
		const hasFullProfile =
			cachedSchool &&
			('classLevels' in cachedSchool ||
				'enabledFeatures' in cachedSchool ||
				'roleFeatureAccess' in cachedSchool ||
				'academicConfig' in cachedSchool ||
				'featureConfig' in cachedSchool);
		if (cachedSchool) {
			if (hasFullProfile) {
				setSchool(normalizeSchoolFormState(cachedSchool));
				setLoading(false);
			}
			const cachedStats = normalizeSchoolStats(cachedSchool);
			if (cachedStats) setStats(cachedStats);
		}
		if (!hasFullProfile) fetchSchool();
		if (!cachedSchool || !normalizeSchoolStats(cachedSchool)) fetchStats();
	}, [host, cachedSchool]);

	const lastFetchTime = useRef(0);
	const fetchSchool = async () => {
		const now = Date.now();
		if (now - lastFetchTime.current < 1000) return;
		lastFetchTime.current = now;
		try {
			setLoading((current) => current || !school);
			const res = await fetch(`/api/school?host=${encodeURIComponent(host)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load school');
			setSchool(normalizeSchoolFormState(data.school));
			upsertSuperAdminSchool(data.school);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const fetchStats = async () => {
		try {
			const res = await fetch(`/api/school?host=${encodeURIComponent(host)}&stats=true`);
			const data = await res.json();
			if (res.ok) {
				setStats(data);
				upsertSuperAdminSchool({
					host,
					stats: data,
					users: {
						students: data.students,
						teachers: data.teachers,
						administrators: data.administrators,
						systemAdmins: data.systemAdmins,
					},
					totalUsers: data.total,
				});
			}
		} catch {}
	};

	const handleSave = async (formState: SchoolFormState) => {
		try {
			setSaving(true);
			setError('');

			const res = await fetch(`/api/school?host=${encodeURIComponent(host)}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formState),
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to save');
			upsertSuperAdminSchool(result.school || formState);

			// Sync schoolStore.school if the saved school matches the one currently
			// viewed, so stale featureConfig / identity data doesn't linger in
			// components that read from schoolStore (e.g. AddUsers, EditUserModal).
			const currentSchool = useSchoolStore.getState().school;
			if (currentSchool?.system?.host === host && result.school) {
				useSchoolStore.getState().setSchool(result.school);
			}

			toast.success('Changes saved successfully');
		} catch (e: any) {
			setError(e.message);
			toast.error(e.message || 'Failed to save');
		} finally {
			setSaving(false);
		}
	};

	const toggleActive = async () => {
		try {
			setTogglingActive(true);
			const nextActive = !school?.system?.isActive;
			const res = await fetch(`/api/school?host=${encodeURIComponent(host)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: nextActive }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to toggle school status');
			}
			const data = await res.json();
			upsertSuperAdminSchool(data.school);
			setSchool(normalizeSchoolFormState(data.school));
			toast.success(nextActive ? 'School activated' : 'School deactivated');
		} catch (e: any) {
			setError(e.message);
			toast.error(e.message || 'Failed to toggle school status');
		} finally {
			setTogglingActive(false);
		}
	};

	const deleteSchool = async () => {
		try {
			setSaving(true);
			const res = await fetch(`/api/school?host=${encodeURIComponent(host)}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete school');
			removeSuperAdminSchool(host);
			onDeleted?.(host);
			toast.success('School deleted successfully');
			onClose();
		} catch (e: any) {
			setError(e.message);
			toast.error(e.message || 'Failed to delete school');
		} finally {
			setSaving(false);
		}
	};

	const lastEventTimestamp = useRef('');
	const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
		const reason = String(event.payload?.reason || '').trim();
		if (reason === 'school-deleted') {
			removeSuperAdminSchool(host);
			onDeleted?.(host);
			onClose();
			return;
		}
		if (reason === 'school-updated' || reason === 'school-toggled-active' || reason === 'school-settings-updated') {
			if (event.timestamp && event.timestamp === lastEventTimestamp.current) return;
			lastEventTimestamp.current = event.timestamp || '';
			const schoolData = event.payload?.school as Record<string, any> | undefined;
			if (schoolData?.host) upsertSuperAdminSchool(schoolData);
			fetchSchool();
			if (!stats) fetchStats();
		}
		const isUserEvent = ['user-created', 'account-deactivated', 'user-deleted'].includes(reason);
		if (isUserEvent) {
			fetchStats();
		}
	}, [host, removeSuperAdminSchool, stats, upsertSuperAdminSchool]);

	useSuperadminRealtime({ schoolHosts: [host], schoolTenantIds: [school?.system.dbName].filter(Boolean) as string[], onEvent: handleRealtimeEvent });

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
					<button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
						<ArrowLeft className="h-5 w-5" />
					</button>
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">{school?.identity.name || 'School Details'}</h1>
						<p className="text-sm text-gray-500">{school?.system.host} · {school?.system.dbName}</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					{onOpenAdmins && (
						<button
							onClick={() => onOpenAdmins(host)}
							className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:text-gray-400"
						>
							<ShieldCheck className="h-4 w-4" />
							Manage Admins
						</button>
					)}
					<button
						onClick={toggleActive}
						disabled={togglingActive || loading}
						className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
							school?.system?.isActive
								? 'border-orange-200 text-orange-600 hover:bg-orange-50'
								: 'border-green-200 text-green-600 hover:bg-green-50'
						}`}
					>
						{togglingActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <ToggleLeft className="h-4 w-4" />}
						{school?.system?.isActive ? 'Deactivate' : 'Activate'}
					</button>
					<button
						onClick={() => setShowDeleteConfirm(true)}
						className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
					>
						<Trash2 className="h-4 w-4" />
						Delete
					</button>
				</div>
			</div>

			{error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

			{stats && (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					{statCards.map((stat) => {
						const Icon = stat.icon;
						return (
							<div key={stat.label} className="rounded-xl border border-gray-200 bg-card p-4 dark:border-gray-800">
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

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
				</div>
			) : school ? (
				<SchoolProfileForm initialData={school} onSubmit={handleSave} submitLabel="Save Changes" saving={saving} />
			) : (
				<div className="py-20 text-center text-sm text-red-500">{error || 'School not found'}</div>
			)}

			{showDeleteConfirm && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
						<h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
						<p className="mt-2 text-sm text-gray-500">
							Type <span className="font-mono font-semibold">{school?.identity.name}</span> to confirm.
						</p>
						<input
							type="text"
							placeholder="Type school name..."
							className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-gray-800 dark:bg-muted"
							id="delete-confirm-input"
							autoFocus
						/>
						<div className="mt-6 flex justify-end gap-3">
							<button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
							<button
								onClick={() => {
									const input = document.getElementById('delete-confirm-input') as HTMLInputElement;
									if (input?.value === school?.identity.name) deleteSchool();
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
