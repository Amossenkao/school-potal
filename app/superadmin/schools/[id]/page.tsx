'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
	ArrowLeft,
	Loader2,
	Save,
	Trash2,
	School,
	Settings,
	ShieldCheck,
} from 'lucide-react';

interface SchoolProfile {
	isActive: boolean;
	host: string;
	dbName: string;
	id?: string;
	name: string;
	slogan: string;
	shortName: string;
	initials: string;
	studentIdPrefix: string;
	logoUrl: string;
	logoUrl2?: string;
	yearFounded?: number;
	firstAcademicYear: string;
	currentAcademicYear: string;
	administrativePositions: { id: string; name: string }[];
	sysAdmin: { name: string; phone: string; email?: string };
	themeName?: string;
	enabledFeatures: string[];
	settings: {
		studentSettings: { loginAccess: boolean };
		teacherSettings: { loginAccess: boolean };
		administratorSettings: { loginAccess: boolean };
		gradingSettings?: {
			passMark: number;
			failureWeight: number;
			givesDoublePromotion: boolean;
			givesDemotion: boolean;
		};
	};
	address: string[];
	phones: string[];
	emails: string[];
}

type Tab = 'profile' | 'admin' | 'settings' | 'danger';

export default function SchoolDetailPage() {
	const params = useParams();
	const router = useRouter();
	const host = params?.id as string;

	const [school, setSchool] = useState<SchoolProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [activeTab, setActiveTab] = useState<Tab>('profile');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	useEffect(() => {
		if (host) fetchSchool();
	}, [host]);

	const fetchSchool = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/superadmin/schools/${host}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load school');
			setSchool(data.school);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const updateSchool = async (updates: Partial<SchoolProfile>) => {
		try {
			setSaving(true);
			setError('');
			setSuccess('');
			const res = await fetch(`/api/superadmin/schools/${host}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to save');
			setSchool((prev) => prev ? { ...prev, ...updates } : prev);
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
			router.push('/superadmin');
		} catch (e: any) {
			setError(e.message);
			setSaving(false);
		}
	};

	const handleFieldChange = useCallback(
		(field: keyof SchoolProfile, value: any) => {
			setSchool((prev) => prev ? { ...prev, [field]: value } : prev);
		},
		[]
	);

	const handleSysAdminChange = useCallback(
		(field: string, value: string) => {
			setSchool((prev) => prev ? { ...prev, sysAdmin: { ...prev.sysAdmin, [field]: value } } : prev);
		},
		[]
	);

	const handleSettingToggle = useCallback(
		(setting: string, value: boolean) => {
			setSchool((prev) => {
				if (!prev) return prev;
				const settings = { ...prev.settings };
				if (setting === 'studentLoginAccess') {
					settings.studentSettings = { ...settings.studentSettings, loginAccess: value };
				} else if (setting === 'teacherLoginAccess') {
					settings.teacherSettings = { ...settings.teacherSettings, loginAccess: value };
				} else if (setting === 'adminLoginAccess') {
					settings.administratorSettings = { ...settings.administratorSettings, loginAccess: value };
				}
				return { ...prev, settings };
			});
		},
		[]
	);

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

	const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
		{ key: 'profile', label: 'Profile', icon: School },
		{ key: 'admin', label: 'Sys Admin', icon: ShieldCheck },
		{ key: 'settings', label: 'Settings', icon: Settings },
		{ key: 'danger', label: 'Danger Zone', icon: Trash2 },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-3">
					<Link href="/superadmin" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">{school.name}</h1>
						<p className="text-sm text-gray-500">{school.host} · {school.dbName}</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => updateSchool({ isActive: !school.isActive })}
						disabled={saving}
						className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
							school.isActive
								? 'bg-green-100 text-green-700 hover:bg-green-200'
								: 'bg-red-100 text-red-700 hover:bg-red-200'
						}`}
					>
						{school.isActive ? 'Active' : 'Inactive'}
					</button>
					<button
						onClick={() => updateSchool(school)}
						disabled={saving}
						className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50 transition-colors"
					>
						{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
						Save
					</button>
				</div>
			</div>

			{/* Alerts */}
			{success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}
			{error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

			{/* Tabs */}
			<div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-800/50">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					return (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
								activeTab === tab.key
									? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
									: 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
							}`}
						>
							<Icon className="h-4 w-4" />
							<span className="hidden sm:inline">{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Tab content */}
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
				{activeTab === 'profile' && (
					<div className="space-y-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">School Profile</h3>
						<div className="grid gap-6 sm:grid-cols-2">
							<Field label="School Name" value={school.name} onChange={(v) => handleFieldChange('name', v)} />
							<Field label="Short Name" value={school.shortName} onChange={(v) => handleFieldChange('shortName', v)} />
							<Field label="Initials" value={school.initials} onChange={(v) => handleFieldChange('initials', v)} />
							<Field label="Slogan" value={school.slogan} onChange={(v) => handleFieldChange('slogan', v)} />
							<Field label="Student ID Prefix" value={school.studentIdPrefix} onChange={(v) => handleFieldChange('studentIdPrefix', v)} />
							<Field label="Logo URL" value={school.logoUrl} onChange={(v) => handleFieldChange('logoUrl', v)} />
							<Field label="Year Founded" value={String(school.yearFounded || '')} onChange={(v) => handleFieldChange('yearFounded', Number(v) || undefined)} />
							<Field label="Current Academic Year" value={school.currentAcademicYear} onChange={(v) => handleFieldChange('currentAcademicYear', v)} />
							<Field label="First Academic Year" value={school.firstAcademicYear} onChange={(v) => handleFieldChange('firstAcademicYear', v)} />
							<Field label="Theme" value={school.themeName || ''} onChange={(v) => handleFieldChange('themeName', v)} />
						</div>
						<div className="grid gap-6 sm:grid-cols-3">
							<MultiField label="Addresses" values={school.address} onChange={(v) => handleFieldChange('address', v)} />
							<MultiField label="Phones" values={school.phones} onChange={(v) => handleFieldChange('phones', v)} />
							<MultiField label="Emails" values={school.emails} onChange={(v) => handleFieldChange('emails', v)} />
						</div>
					</div>
				)}

				{activeTab === 'admin' && (
					<div className="space-y-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Admin Account</h3>
						<div className="grid gap-6 sm:grid-cols-2">
							<Field label="Admin Name" value={school.sysAdmin?.name || ''} onChange={(v) => handleSysAdminChange('name', v)} />
							<Field label="Phone" value={school.sysAdmin?.phone || ''} onChange={(v) => handleSysAdminChange('phone', v)} />
							<Field label="Email" value={school.sysAdmin?.email || ''} onChange={(v) => handleSysAdminChange('email', v)} />
						</div>
					</div>
				)}

				{activeTab === 'settings' && (
					<div className="space-y-6">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Login Access</h3>
						<div className="space-y-4">
							<Toggle label="Student Login Access" checked={school.settings?.studentSettings?.loginAccess ?? true} onChange={(v) => handleSettingToggle('studentLoginAccess', v)} />
							<Toggle label="Teacher Login Access" checked={school.settings?.teacherSettings?.loginAccess ?? true} onChange={(v) => handleSettingToggle('teacherLoginAccess', v)} />
							<Toggle label="Administrator Login Access" checked={school.settings?.administratorSettings?.loginAccess ?? true} onChange={(v) => handleSettingToggle('adminLoginAccess', v)} />
						</div>
						{school.settings?.gradingSettings && (
							<>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white pt-4 border-t border-gray-200 dark:border-gray-800">Grading</h3>
								<div className="grid gap-6 sm:grid-cols-2">
									<Field label="Pass Mark" value={String(school.settings.gradingSettings.passMark)} onChange={(v) => {
										const settings = { ...school.settings, gradingSettings: { ...school.settings.gradingSettings!, passMark: Number(v) } };
										setSchool((prev) => prev ? { ...prev, settings } : prev);
									}} />
									<Field label="Failure Weight" value={String(school.settings.gradingSettings.failureWeight)} onChange={(v) => {
										const settings = { ...school.settings, gradingSettings: { ...school.settings.gradingSettings!, failureWeight: Number(v) } };
										setSchool((prev) => prev ? { ...prev, settings } : prev);
									}} />
								</div>
							</>
						)}
					</div>
				)}

				{activeTab === 'danger' && (
					<div className="space-y-6">
						<h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
						<div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/10">
							<h4 className="font-semibold text-red-700 dark:text-red-400">Delete School</h4>
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">
								This will permanently remove the school and all its data. This action cannot be undone.
							</p>
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
							>
								<Trash2 className="h-4 w-4" />
								Delete School
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Delete confirmation */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
						<h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
						<p className="mt-2 text-sm text-gray-500">
							Type <span className="font-mono font-semibold">{school.name}</span> to confirm deletion.
						</p>
						<input
							type="text"
							placeholder="Type school name..."
							className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-gray-800 dark:bg-gray-800"
							id="delete-confirm-input"
							autoFocus
						/>
						<div className="mt-6 flex justify-end gap-3">
							<button
								onClick={() => setShowDeleteConfirm(false)}
								className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
							>
								Cancel
							</button>
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	return (
		<div>
			<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
			/>
		</div>
	);
}

function MultiField({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
	return (
		<div>
			<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
			<div className="mt-1.5 space-y-2">
				{(values || []).map((val, i) => (
					<input
						key={i}
						type="text"
						value={val}
						onChange={(e) => {
							const next = [...values];
							next[i] = e.target.value;
							onChange(next);
						}}
						className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
					/>
				))}
				<button
					type="button"
					onClick={() => onChange([...(values || []), ''])}
					className="text-xs text-[#465fff] font-medium hover:underline"
				>
					+ Add
				</button>
			</div>
		</div>
	);
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/50">
			<span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
			<div
				onClick={() => onChange(!checked)}
				className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#465fff]' : 'bg-gray-300'}`}
			>
				<div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-[22px]' : 'left-0.5'}`} />
			</div>
		</label>
	);
}
