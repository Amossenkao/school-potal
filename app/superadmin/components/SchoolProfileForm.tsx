'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
	ArrowLeft, ArrowRight, Check, School, Palette, GraduationCap, Phone,
	ShieldCheck, Users, Settings, ToggleLeft, Briefcase, Loader2,
	BookOpen, DollarSign, ClipboardCheck, Layers, Plus, Trash2, ChevronDown, ChevronRight, Pencil, X, Wand2,
} from 'lucide-react';
import {
	DEFAULT_CLASS_LEVELS, DEFAULT_ADMIN_POSITIONS, DEFAULT_FEATURES,
	DEFAULT_ROLE_FEATURE_ACCESS, DEFAULT_GRADING_SETTINGS,
	buildFeeScheduleScaffold, buildDefaultStudentSettings, buildDefaultTeacherSettings,
	getAcademicYearRange,
} from '../defaults/classLevels';

const FEATURE_KEYS = [
	'dashboard', 'user_management', 'profile_management', 'ai_chat', 'homepage',
	'apps', 'attendance', 'grading_system', 'academic_reports', 'academic_resources',
	'calendar_events', 'class_management', 'fee_payment', 'financial_reports',
	'admissions', 'support_system', 'community', 'notifications', 'school_settings',
];

const THEME_NAMES = [
	'horizon', 'sunset', 'ocean', 'forest', 'slate', 'midnight', 'rose', 'emerald',
];

const ACADEMIC_PERIODS = [
	'first', 'second', 'third', 'third_period_exam', 'fourth', 'fifth', 'sixth', 'sixth_period_exam',
];

const SEMESTERS = ['first', 'second'];

export interface SchoolFormData {
	isActive: boolean;
	host: string;
	dbName: string;
	name: string;
	slogan: string;
	shortName: string;
	initials: string;
	studentIdPrefix: string;
	logoUrl: string;
	logoUrl2: string;
	yearFounded: number | string;
	firstAcademicYear: string;
	currentAcademicYear: string;
	administrativePositions: { id: string; name: string }[];
	sysAdmin: { name: string; phone: string; email: string };
	themeName: string;
	enabledFeatures: string[];
	roleFeatureAccess: {
		student: string[];
		teacher: string[];
		system_admin: string[];
		administrator: Record<string, string[]>;
	};
	settings: {
		studentSettings: {
			loginAccess: boolean;
			reportAccessByYear: Record<string, { enabled: boolean; yearlyReportAccess: boolean; periods: string[]; semesters: string[] }>;
		};
		teacherSettings: {
			loginAccess: boolean;
			permissionsByYear: Record<string, {
				enabled: boolean;
				gradeSubmission: { enabled: boolean; periods: string[] };
				viewGradeSubmissions: { enabled: boolean };
				gradeChangeRequest: { enabled: boolean; periods: string[] };
				viewMasters: { enabled: boolean };
			}>;
		};
		administratorSettings: { loginAccess: boolean };
		gradingSettings: {
			passMark: number;
			gradeScale: { min: number; max: number };
			summerSchoolWeight: number;
			failureWeight: number;
			givesDoublePromotion: boolean;
			givesDemotion: boolean;
		};
	};
	classLevels: Record<string, Record<string, { isSelfContained?: boolean; classes: { classId: string; name: string; feeGroup: string }[]; subjects: { name: string; weight: number }[] }>>;
	feeSchedules: Record<string, Record<string, unknown>>;
	address: string[];
	phones: string[];
	emails: string[];
}

export const defaultFormData: SchoolFormData = {
	isActive: true, host: '', dbName: '', name: '', slogan: '', shortName: '',
	initials: '', studentIdPrefix: '', logoUrl: '', logoUrl2: '', yearFounded: '',
	firstAcademicYear: '', currentAcademicYear: '',
	administrativePositions: [...DEFAULT_ADMIN_POSITIONS],
	sysAdmin: { name: '', phone: '', email: '' },
	themeName: 'horizon',
	enabledFeatures: [...DEFAULT_FEATURES],
	roleFeatureAccess: { ...DEFAULT_ROLE_FEATURE_ACCESS },
	settings: {
		studentSettings: { loginAccess: true, reportAccessByYear: {} },
		teacherSettings: { loginAccess: true, permissionsByYear: {} },
		administratorSettings: { loginAccess: true },
		gradingSettings: { ...DEFAULT_GRADING_SETTINGS },
	},
	classLevels: {},
	feeSchedules: {},
	address: [], phones: [], emails: [],
};

const STEPS = [
	{ label: 'School Info', icon: School },
	{ label: 'Academic', icon: GraduationCap },
	{ label: 'Contact & Admin', icon: Phone },
	{ label: 'Features & Access', icon: ToggleLeft },
	{ label: 'Fee Schedules', icon: DollarSign },
	{ label: 'Grading & Settings', icon: ClipboardCheck },
];

interface Props {
	initialData?: Partial<SchoolFormData>;
	onSubmit: (data: SchoolFormData) => Promise<void>;
	submitLabel?: string;
	saving?: boolean;
}

export default function SchoolProfileForm({ initialData, onSubmit, submitLabel = 'Save', saving }: Props) {
	const [step, setStep] = useState(0);
	const [form, setForm] = useState<SchoolFormData>(() => ({
		...defaultFormData,
		...initialData,
		sysAdmin: { ...defaultFormData.sysAdmin, ...(initialData?.sysAdmin || {}) },
		roleFeatureAccess: { ...defaultFormData.roleFeatureAccess, ...(initialData?.roleFeatureAccess || {}) },
		settings: {
			...defaultFormData.settings,
			...(initialData?.settings || {}),
			studentSettings: { ...defaultFormData.settings.studentSettings, ...(initialData?.settings?.studentSettings || {}) },
			teacherSettings: { ...defaultFormData.settings.teacherSettings, ...(initialData?.settings?.teacherSettings || {}) },
			administratorSettings: { ...defaultFormData.settings.administratorSettings, ...(initialData?.settings?.administratorSettings || {}) },
			gradingSettings: { ...defaultFormData.settings.gradingSettings, ...(initialData?.settings?.gradingSettings || {}) },
		},
		classLevels: initialData?.classLevels || defaultFormData.classLevels,
		feeSchedules: initialData?.feeSchedules || defaultFormData.feeSchedules,
	}));

	const update = useCallback((field: string, value: any) => {
		setForm((prev) => {
			const keys = field.split('.');
			if (keys.length === 1) return { ...prev, [field]: value };
			if (keys.length === 2) {
				const parent = prev[keys[0] as keyof SchoolFormData] as any;
				return { ...prev, [keys[0]]: { ...parent, [keys[1]]: value } };
			}
			if (keys.length === 3) {
				const a = prev[keys[0] as keyof SchoolFormData] as any;
				const b = a?.[keys[1]];
				return { ...prev, [keys[0]]: { ...a, [keys[1]]: { ...b, [keys[2]]: value } } };
			}
			if (keys.length === 4) {
				const a = prev[keys[0] as keyof SchoolFormData] as any;
				const b = a?.[keys[1]]?.[keys[2]];
				return { ...prev, [keys[0]]: { ...a, [keys[1]]: { ...a[keys[1]], [keys[2]]: { ...b, [keys[3]]: value } } } };
			}
			return prev;
		});
	}, []);

	const handleSubmit = async () => { await onSubmit(form); };
	const isLast = step === STEPS.length - 1;

	// ── Auto-populate host/dbName/initials from shortName ──
	const prevShortName = useRef(form.shortName);
	useEffect(() => {
		if (form.shortName !== prevShortName.current) {
			prevShortName.current = form.shortName;
			const slug = form.shortName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
			if (slug) {
				setForm((prev) => {
					const next = { ...prev };
					if (!prev.host || prev.host === `${prevShortName.current.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}.schoolmesh.app`) {
						next.host = `${slug}.schoolmesh.app`;
					}
					if (!prev.dbName || prev.dbName === `schoolmesh_${prevShortName.current.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}`) {
						next.dbName = `schoolmesh_${slug}`;
					}
					if (!prev.initials || prev.initials === prevShortName.current.slice(0, 2).toUpperCase()) {
						next.initials = form.shortName.slice(0, 2).toUpperCase();
					}
					if (!prev.studentIdPrefix || prev.studentIdPrefix === prevShortName.current.slice(0, 3).toUpperCase()) {
						next.studentIdPrefix = form.shortName.slice(0, 3).toUpperCase();
					}
					return next;
				});
			}
		}
	}, [form.shortName]);

	// ── Auto-populate currentAcademicYear from firstAcademicYear ──
	const prevFirstYear = useRef(form.firstAcademicYear);
	useEffect(() => {
		if (form.firstAcademicYear !== prevFirstYear.current) {
			prevFirstYear.current = form.firstAcademicYear;
			if (form.firstAcademicYear && !form.currentAcademicYear) {
				update('currentAcademicYear', form.firstAcademicYear);
			}
		}
	}, [form.firstAcademicYear, form.currentAcademicYear, update]);

	// ── Auto-populate per-year settings when academic year range changes ──
	const prevCurrentYear = useRef(form.currentAcademicYear);
	useEffect(() => {
		if (form.currentAcademicYear !== prevCurrentYear.current) {
			prevCurrentYear.current = form.currentAcademicYear;
			if (form.firstAcademicYear && form.currentAcademicYear) {
				const years = getAcademicYearRange(form.firstAcademicYear, form.currentAcademicYear);
				const existingStudentYears = Object.keys(form.settings.studentSettings.reportAccessByYear);
				const existingTeacherYears = Object.keys(form.settings.teacherSettings.permissionsByYear);
				const allYearsExist = years.every((y) => existingStudentYears.includes(y) && existingTeacherYears.includes(y));
				if (!allYearsExist && years.length > 0) {
					update('settings.studentSettings', buildDefaultStudentSettings(years));
					update('settings.teacherSettings', buildDefaultTeacherSettings(years));
				}
			}
		}
	}, [form.firstAcademicYear, form.currentAcademicYear, form.settings.studentSettings, form.settings.teacherSettings, update]);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-1 overflow-x-auto pb-2">
				{STEPS.map((s, i) => {
					const Icon = s.icon;
					const isActive = i === step;
					const isDone = i < step;
					return (
						<button key={s.label} onClick={() => setStep(i)}
							className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
								isActive ? 'bg-[#465fff] text-white'
								: isDone ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
								: 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
							}`}>
							{isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
							<span className="hidden sm:inline">{s.label}</span>
						</button>
					);
				})}
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 min-h-[400px]">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{STEPS[step].label}</h3>

				{/* ═══ Step 0: School Info ═══ */}
				{step === 0 && (
					<div className="space-y-8">
						<div className="grid gap-5 sm:grid-cols-2">
							<div className="sm:col-span-2"><Field label="School Name" required value={form.name} onChange={(v) => update('name', v)} placeholder="e.g. Upstairs Christian Academy" /></div>
							<Field label="Short Name" required value={form.shortName} onChange={(v) => update('shortName', v)} onBlur={() => {
								const slug = form.shortName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
								if (slug && !form.host) { update('host', `${slug}.schoolmesh.app`); update('dbName', `schoolmesh_${slug}`); }
								if (form.shortName && !form.initials) update('initials', form.shortName.slice(0, 2).toUpperCase());
								if (form.shortName && !form.studentIdPrefix) update('studentIdPrefix', form.shortName.slice(0, 3).toUpperCase());
							}} placeholder="e.g. Upstairs" />
							<Field label="Initials" required value={form.initials} onChange={(v) => update('initials', v)} placeholder="e.g. UCA" />
							<div className="sm:col-span-2"><Field label="Slogan" value={form.slogan} onChange={(v) => update('slogan', v)} placeholder="e.g. Excellence in Education" /></div>
							<Field label="Student ID Prefix" value={form.studentIdPrefix} onChange={(v) => update('studentIdPrefix', v)} placeholder="e.g. UCA" />
							<Field label="Host" required value={form.host} onChange={(v) => update('host', v)} placeholder="e.g. ucaliberia.vercel.app" />
							<div className="sm:col-span-2"><Field label="Database Name" required value={form.dbName} onChange={(v) => update('dbName', v)} placeholder="e.g. uca" /></div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Branding</h4>
							<div className="grid gap-5 sm:grid-cols-2">
								<div className="sm:col-span-2"><Field label="Logo URL" value={form.logoUrl} onChange={(v) => update('logoUrl', v)} placeholder="https://..." /></div>
								<div className="sm:col-span-2"><Field label="Secondary Logo URL" value={form.logoUrl2} onChange={(v) => update('logoUrl2', v)} placeholder="https://..." /></div>
								<div>
									<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Theme</label>
									<select value={form.themeName} onChange={(e) => update('themeName', e.target.value)}
										className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white">
										{THEME_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
									</select>
								</div>
								{form.logoUrl && (
									<div>
										<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</label>
										<div className="mt-1.5 flex items-center gap-3">
											<img src={form.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
											{form.logoUrl2 && <img src={form.logoUrl2} alt="Logo 2" className="h-12 w-12 rounded-lg object-contain border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* ═══ Step 1: Academic ═══ */}
				{step === 1 && (
					<div className="space-y-8">
						<div className="grid gap-5 sm:grid-cols-2">
							<Field label="First Academic Year" value={form.firstAcademicYear} onChange={(v) => {
								update('firstAcademicYear', v);
								if (v && !form.currentAcademicYear) update('currentAcademicYear', v);
							}} placeholder="e.g. 2025-2026" />
							<Field label="Current Academic Year" value={form.currentAcademicYear} onChange={(v) => {
								update('currentAcademicYear', v);
								// Auto-generate fee schedule scaffold for new year
								if (v && Object.keys(form.classLevels).length > 0 && !form.feeSchedules[v]) {
									update('feeSchedules', { ...form.feeSchedules, ...buildFeeScheduleScaffold(form.classLevels, v) });
								}
								// Auto-populate per-year settings
								if (form.firstAcademicYear && v) {
									const years = getAcademicYearRange(form.firstAcademicYear, v);
									update('settings.studentSettings', buildDefaultStudentSettings(years));
									update('settings.teacherSettings', buildDefaultTeacherSettings(years));
								}
							}} placeholder="e.g. 2025-2026" />
							<Field label="Year Founded" value={String(form.yearFounded)} onChange={(v) => update('yearFounded', v)} placeholder="e.g. 2011" />
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Class Levels</h4>
							<ClassLevelsEditor classLevels={form.classLevels} onChange={(v) => {
								update('classLevels', v);
								// Auto-generate fee schedule scaffold from classLevels
								const year = form.currentAcademicYear || form.firstAcademicYear;
								if (year && Object.keys(v).length > 0) {
									const existing = Object.keys(form.feeSchedules);
									if (!existing.includes(year)) {
										update('feeSchedules', { ...form.feeSchedules, ...buildFeeScheduleScaffold(v, year) });
									}
								}
							}} onUseDefaults={() => {
								update('classLevels', DEFAULT_CLASS_LEVELS);
								const year = form.currentAcademicYear || form.firstAcademicYear;
								if (year) {
									update('feeSchedules', { ...form.feeSchedules, ...buildFeeScheduleScaffold(DEFAULT_CLASS_LEVELS, year) });
								}
							}} />
						</div>
					</div>
				)}

				{/* ═══ Step 2: Contact & Admin ═══ */}
				{step === 2 && (
					<div className="space-y-8">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Contact Information</h4>
							<div className="space-y-5">
								<div><h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Addresses</h5><DynamicList values={form.address} onChange={(v) => update('address', v)} placeholder="Address line..." /></div>
								<div><h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phone Numbers</h5><DynamicList values={form.phones} onChange={(v) => update('phones', v)} placeholder="+231 ..." /></div>
								<div><h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Emails</h5><DynamicList values={form.emails} onChange={(v) => update('emails', v)} placeholder="email@..." /></div>
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">System Admin</h4>
							<div className="grid gap-5 sm:grid-cols-2">
								<div className="sm:col-span-2"><Field label="Admin Name" required value={form.sysAdmin.name} onChange={(v) => update('sysAdmin.name', v)} placeholder="Full name" /></div>
								<Field label="Phone" required value={form.sysAdmin.phone} onChange={(v) => update('sysAdmin.phone', v)} placeholder="+231 ..." />
								<Field label="Email" value={form.sysAdmin.email} onChange={(v) => update('sysAdmin.email', v)} placeholder="email@..." />
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Administrative Positions</h4>
							<p className="text-xs text-gray-500 mb-3">Positions available in this school.</p>
							{form.administrativePositions.map((pos, i) => (
								<div key={i} className="flex items-center gap-3 mb-2">
									<input value={pos.id} onChange={(e) => { const next = [...form.administrativePositions]; next[i] = { ...next[i], id: e.target.value }; update('administrativePositions', next); }}
										placeholder="ID (e.g. principal)" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
									<input value={pos.name} onChange={(e) => { const next = [...form.administrativePositions]; next[i] = { ...next[i], name: e.target.value }; update('administrativePositions', next); }}
										placeholder="Display name (e.g. Principal)" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
									<button onClick={() => update('administrativePositions', form.administrativePositions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
								</div>
							))}
							<button onClick={() => update('administrativePositions', [...form.administrativePositions, { id: '', name: '' }])} className="text-sm text-[#465fff] font-medium hover:underline">+ Add Position</button>
						</div>
					</div>
				)}

				{/* ═══ Step 3: Features & Access ═══ */}
				{step === 3 && (
					<div className="space-y-8">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Enabled Features</h4>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{FEATURE_KEYS.map((key) => {
									const enabled = form.enabledFeatures.includes(key);
									return (
										<label key={key} onClick={() => update('enabledFeatures', enabled ? form.enabledFeatures.filter((f) => f !== key) : [...form.enabledFeatures, key])}
											className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${enabled ? 'border-[#465fff]/30 bg-[#465fff]/5' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900'}`}>
											<div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${enabled ? 'border-[#465fff] bg-[#465fff]' : 'border-gray-300'}`}>
												{enabled && <Check className="h-2.5 w-2.5 text-white" />}
											</div>
											<span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
										</label>
									);
								})}
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Role Feature Access</h4>
							{(['student', 'teacher', 'system_admin'] as const).map((role) => (
								<div key={role} className="mb-4">
									<h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 capitalize">{role.replace('_', ' ')}</h5>
									<div className="flex flex-wrap gap-2">
										{form.enabledFeatures.map((key) => {
											const selected = form.roleFeatureAccess[role]?.includes(key);
											return (
												<button key={key} onClick={() => {
													const current = form.roleFeatureAccess[role] || [];
													update('roleFeatureAccess', { ...form.roleFeatureAccess, [role]: selected ? current.filter((f) => f !== key) : [...current, key] });
												}} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selected ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>
													{key.replace(/_/g, ' ')}
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<AcademicPermissionsEditor
								studentSettings={form.settings.studentSettings}
								teacherSettings={form.settings.teacherSettings}
								currentYear={form.currentAcademicYear}
								onChange={(student, teacher) => {
									update('settings.studentSettings', student);
									update('settings.teacherSettings', teacher);
								}}
							/>
						</div>
					</div>
				)}

				{/* ═══ Step 4: Fee Schedules ═══ */}
				{step === 4 && (
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fee Schedules</h4>
								<p className="text-xs text-gray-500 mt-1">Fee groups are auto-generated from classLevels. Edit amounts below.</p>
							</div>
							{Object.keys(form.feeSchedules).length === 0 && Object.keys(form.classLevels).length > 0 && (
								<button onClick={() => {
									const year = form.currentAcademicYear || form.firstAcademicYear;
									if (year) update('feeSchedules', buildFeeScheduleScaffold(form.classLevels, year));
								}} className="inline-flex items-center gap-1.5 rounded-lg bg-[#465fff]/10 px-3 py-1.5 text-xs font-semibold text-[#465fff] hover:bg-[#465fff]/20 transition-colors">
									<Wand2 className="h-3.5 w-3.5" /> Generate from Class Levels
								</button>
							)}
						</div>
						{Object.keys(form.feeSchedules).length === 0 ? (
							<div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
								<DollarSign className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
								<p className="text-sm text-gray-500">No fee schedules configured yet.</p>
								<p className="text-xs text-gray-400 mt-1">Set your academic years and class levels first, then fee groups will be auto-generated.</p>
							</div>
						) : (
							<div className="space-y-4">
								{Object.entries(form.feeSchedules).map(([year, yearData]: [string, any]) => (
									<div key={year} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
										<div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex items-center justify-between">
											<span className="text-sm font-semibold text-gray-900 dark:text-white">{year}</span>
											<button onClick={() => { const next = JSON.parse(JSON.stringify(form.feeSchedules)); delete next[year]; update('feeSchedules', next); }}
												className="text-xs text-red-400 hover:text-red-600">Remove</button>
										</div>
										<div className="p-4 space-y-3">
											{Object.entries(yearData).filter(([k]) => k !== 'paymentWindows').map(([sessionName, sessionData]: [string, any]) => (
												<div key={sessionName}>
													<h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{sessionName}</h6>
													{Object.entries(sessionData).map(([fgKey, fgData]: [string, any]) => (
														<div key={fgKey} className="ml-3 mb-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
															<div className="flex items-center justify-between mb-2">
																<span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fgData.label || fgKey}</span>
																<span className="text-[10px] text-gray-400 font-mono">{fgKey}</span>
															</div>
															<div className="grid gap-3 sm:grid-cols-2">
																<div>
																	<p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Tuition (Old/New)</p>
																	<div className="flex gap-2">
																		<input type="number" value={fgData.tuitionAndRegistration?.old?.tuition || 0}
																			onChange={(e) => {
																				const next = JSON.parse(JSON.stringify(form.feeSchedules));
																				const fg = next[year]?.[sessionName]?.[fgKey];
																				if (fg) {
																					fg.tuitionAndRegistration = fg.tuitionAndRegistration || { old: {}, new: {} };
																					fg.tuitionAndRegistration.old = { ...fg.tuitionAndRegistration.old, tuition: Number(e.target.value) || 0 };
																				}
																				update('feeSchedules', next);
																			}}
																			className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" placeholder="Old" />
																		<input type="number" value={fgData.tuitionAndRegistration?.new?.tuition || 0}
																			onChange={(e) => {
																				const next = JSON.parse(JSON.stringify(form.feeSchedules));
																				const fg = next[year]?.[sessionName]?.[fgKey];
																				if (fg) {
																					fg.tuitionAndRegistration = fg.tuitionAndRegistration || { old: {}, new: {} };
																					fg.tuitionAndRegistration.new = { ...fg.tuitionAndRegistration.new, tuition: Number(e.target.value) || 0 };
																				}
																				update('feeSchedules', next);
																			}}
																			className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" placeholder="New" />
																	</div>
																</div>
																<div>
																	<p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Installments</p>
																	<p className="text-xs text-gray-500">{fgData.installments?.length || 0} payment periods</p>
																</div>
															</div>
														</div>
													))}
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						)}
						<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
							<details className="group">
								<summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">Edit Raw JSON</summary>
								<textarea
									value={JSON.stringify(form.feeSchedules, null, 2)}
									onChange={(e) => { try { update('feeSchedules', JSON.parse(e.target.value)); } catch {} }}
									rows={12}
									className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white"
								/>
							</details>
						</div>
					</div>
				)}

				{/* ═══ Step 5: Grading & Settings ═══ */}
				{step === 5 && (
					<div className="space-y-8">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Grading Settings</h4>
							<div className="grid gap-5 sm:grid-cols-2">
								<Field label="Pass Mark (%)" value={String(form.settings.gradingSettings.passMark)} onChange={(v) => update('settings.gradingSettings.passMark', Number(v) || 0)} placeholder="50" />
								<div>
									<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade Scale</label>
									<div className="flex items-center gap-2 mt-1.5">
										<input type="number" value={form.settings.gradingSettings.gradeScale.min} onChange={(e) => update('settings.gradingSettings.gradeScale.min', Number(e.target.value) || 0)}
											className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" placeholder="0" />
										<span className="text-gray-400">to</span>
										<input type="number" value={form.settings.gradingSettings.gradeScale.max} onChange={(e) => update('settings.gradingSettings.gradeScale.max', Number(e.target.value) || 100)}
											className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" placeholder="100" />
									</div>
								</div>
								<Field label="Summer School Weight" value={String(form.settings.gradingSettings.summerSchoolWeight)} onChange={(v) => update('settings.gradingSettings.summerSchoolWeight', Number(v) || 0)} placeholder="0" />
								<Field label="Failure Weight" value={String(form.settings.gradingSettings.failureWeight)} onChange={(v) => update('settings.gradingSettings.failureWeight', Number(v) || 0)} placeholder="0" />
							</div>
							<div className="space-y-3 mt-4">
								<ToggleRow label="Allow double promotion" checked={form.settings.gradingSettings.givesDoublePromotion} onChange={(v) => update('settings.gradingSettings.givesDoublePromotion', v)} />
								<ToggleRow label="Allow demotion" checked={form.settings.gradingSettings.givesDemotion} onChange={(v) => update('settings.gradingSettings.givesDemotion', v)} />
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Login Access</h4>
							<div className="space-y-3">
								<ToggleRow label="Students can log in" checked={form.settings.studentSettings.loginAccess} onChange={(v) => update('settings.studentSettings.loginAccess', v)} />
								<ToggleRow label="Teachers can log in" checked={form.settings.teacherSettings.loginAccess} onChange={(v) => update('settings.teacherSettings.loginAccess', v)} />
								<ToggleRow label="Administrators can log in" checked={form.settings.administratorSettings.loginAccess} onChange={(v) => update('settings.administratorSettings.loginAccess', v)} />
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="flex items-center justify-between">
				<button onClick={() => setStep((s) => s - 1)} disabled={step === 0}
					className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors dark:border-gray-800 dark:text-gray-400">
					<ArrowLeft className="h-4 w-4" /> Back
				</button>
				<div className="flex items-center gap-3">
					<span className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</span>
					{isLast ? (
						<button onClick={handleSubmit} disabled={saving}
							className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50 transition-colors">
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
							{saving ? 'Saving...' : submitLabel}
						</button>
					) : (
						<button onClick={() => setStep((s) => s + 1)}
							className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors">
							Next <ArrowRight className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Class Levels Editor ────────────────────────────────────────────────────────
function ClassLevelsEditor({ classLevels, onChange, onUseDefaults }: {
	classLevels: SchoolFormData['classLevels'];
	onChange: (v: SchoolFormData['classLevels']) => void;
	onUseDefaults?: () => void;
}) {
	const [newSession, setNewSession] = useState('');
	const [expandedSession, setExpandedSession] = useState<string | null>(null);
	const [editingSession, setEditingSession] = useState<string | null>(null);
	const [editSessionName, setEditSessionName] = useState('');
	const [newLevel, setNewLevel] = useState('');
	const [editingLevel, setEditingLevel] = useState<{ session: string; level: string } | null>(null);
	const [editLevelName, setEditLevelName] = useState('');
	const [newClassName, setNewClassName] = useState('');
	const [newClassFeeGroup, setNewClassFeeGroup] = useState('');
	const [editingClass, setEditingClass] = useState<{ session: string; level: string; classIdx: number } | null>(null);
	const [editClassName, setEditClassName] = useState('');
	const [editClassFeeGroup, setEditClassFeeGroup] = useState('');
	const [newSubjectName, setNewSubjectName] = useState('');
	const [newSubjectWeight, setNewSubjectWeight] = useState('1');
	const [editingSubject, setEditingSubject] = useState<{ session: string; level: string; subjectIdx: number } | null>(null);
	const [editSubjectName, setEditSubjectName] = useState('');
	const [editSubjectWeight, setEditSubjectWeight] = useState('1');

	const sessions = Object.keys(classLevels);

	const renameSession = (oldName: string) => {
		if (!editSessionName.trim() || editSessionName === oldName) { setEditingSession(null); return; }
		const data = { ...classLevels };
		data[editSessionName] = data[oldName];
		delete data[oldName];
		onChange(data);
		setEditingSession(null);
		setExpandedSession(editSessionName);
	};

	const deleteSession = (session: string) => {
		const data = { ...classLevels }; delete data[session]; onChange(data);
		if (expandedSession === session) setExpandedSession(null);
	};

	const renameLevel = (session: string, oldName: string) => {
		if (!editLevelName.trim() || editLevelName === oldName) { setEditingLevel(null); return; }
		const data = { ...classLevels };
		data[session][editLevelName] = data[session][oldName];
		delete data[session][oldName];
		onChange(data);
		setEditingLevel(null);
	};

	const deleteLevel = (session: string, level: string) => {
		const data = { ...classLevels }; delete data[session][level]; onChange(data);
	};

	const addClass = (session: string, level: string) => {
		if (!newClassName.trim()) return;
		const lvl = classLevels[session][level];
		onChange({
			...classLevels,
			[session]: { ...classLevels[session], [level]: { ...lvl, classes: [...lvl.classes, { classId: `cls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: newClassName.trim(), feeGroup: newClassFeeGroup.trim() || 'default' }] } },
		});
		setNewClassName(''); setNewClassFeeGroup('');
	};

	const saveEditClass = (session: string, level: string, classIdx: number) => {
		const lvl = classLevels[session][level];
		const newClasses = [...lvl.classes];
		newClasses[classIdx] = { ...newClasses[classIdx], name: editClassName, feeGroup: editClassFeeGroup };
		onChange({ ...classLevels, [session]: { ...classLevels[session], [level]: { ...lvl, classes: newClasses } } });
		setEditingClass(null);
	};

	const deleteClass = (session: string, level: string, classIdx: number) => {
		const lvl = classLevels[session][level];
		onChange({ ...classLevels, [session]: { ...classLevels[session], [level]: { ...lvl, classes: lvl.classes.filter((_, j) => j !== classIdx) } } });
	};

	const addSubject = (session: string, level: string) => {
		if (!newSubjectName.trim()) return;
		const lvl = classLevels[session][level];
		onChange({
			...classLevels,
			[session]: { ...classLevels[session], [level]: { ...lvl, subjects: [...lvl.subjects, { name: newSubjectName.trim(), weight: Number(newSubjectWeight) || 1 }] } },
		});
		setNewSubjectName(''); setNewSubjectWeight('1');
	};

	const saveEditSubject = (session: string, level: string, subjectIdx: number) => {
		const lvl = classLevels[session][level];
		const newSubjects = [...lvl.subjects];
		newSubjects[subjectIdx] = { name: editSubjectName, weight: Number(editSubjectWeight) || 1 };
		onChange({ ...classLevels, [session]: { ...classLevels[session], [level]: { ...lvl, subjects: newSubjects } } });
		setEditingSubject(null);
	};

	const deleteSubject = (session: string, level: string, subjectIdx: number) => {
		const lvl = classLevels[session][level];
		onChange({ ...classLevels, [session]: { ...classLevels[session], [level]: { ...lvl, subjects: lvl.subjects.filter((_, j) => j !== subjectIdx) } } });
	};

	const toggleSelfContained = (session: string, level: string) => {
		const lvl = classLevels[session][level];
		onChange({ ...classLevels, [session]: { ...classLevels[session], [level]: { ...lvl, isSelfContained: !lvl.isSelfContained } } });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-gray-500">Define academic sessions, levels, classes, and subjects. Click names to rename, or use the edit/delete icons.</p>
				{onUseDefaults && Object.keys(classLevels).length === 0 && (
					<button onClick={onUseDefaults}
						className="inline-flex items-center gap-1.5 rounded-lg bg-[#465fff]/10 px-3 py-1.5 text-xs font-semibold text-[#465fff] hover:bg-[#465fff]/20 transition-colors">
						<Wand2 className="h-3.5 w-3.5" /> Use Defaults
					</button>
				)}
			</div>

			{sessions.map((session) => (
				<div key={session} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
					<div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-4 py-3 gap-2">
						{editingSession === session ? (
							<div className="flex items-center gap-2 flex-1">
								<input autoFocus value={editSessionName} onChange={(e) => setEditSessionName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameSession(session)}
									className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
								<button onClick={() => renameSession(session)} className="text-xs text-green-600 font-medium">Save</button>
								<button onClick={() => setEditingSession(null)} className="text-xs text-gray-400">Cancel</button>
							</div>
						) : (
							<>
								<button onClick={() => setExpandedSession(expandedSession === session ? null : session)} className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
									{expandedSession === session ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
									{session}
									<span className="text-xs font-normal text-gray-400 ml-1">{Object.keys(classLevels[session] || {}).length} levels</span>
								</button>
								<div className="flex items-center gap-1">
									<button onClick={() => { setEditingSession(session); setEditSessionName(session); }} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
									<button onClick={() => deleteSession(session)} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
								</div>
							</>
						)}
					</div>
					{expandedSession === session && (
						<div className="p-4 space-y-4">
							{Object.keys(classLevels[session] || {}).map((level) => (
								<div key={level} className="ml-4 rounded-lg border border-gray-100 dark:border-gray-800 p-3 space-y-3">
									<div className="flex items-center justify-between gap-2">
										{editingLevel?.session === session && editingLevel.level === level ? (
											<div className="flex items-center gap-2 flex-1">
												<input autoFocus value={editLevelName} onChange={(e) => setEditLevelName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameLevel(session, level)}
													className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
												<button onClick={() => renameLevel(session, level)} className="text-[10px] text-green-600 font-medium">Save</button>
												<button onClick={() => setEditingLevel(null)} className="text-[10px] text-gray-400">Cancel</button>
											</div>
										) : (
											<>
												<div className="flex items-center gap-2">
													<h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">{level}</h5>
													<label onClick={() => toggleSelfContained(session, level)} className="flex items-center gap-1 cursor-pointer text-[10px] text-gray-400 hover:text-gray-600">
														<div className={`h-3 w-5 rounded-full transition-colors ${classLevels[session][level].isSelfContained ? 'bg-[#465fff]' : 'bg-gray-300'}`}>
															<div className={`h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${classLevels[session][level].isSelfContained ? 'translate-x-2.5' : 'translate-x-0.5'}`} />
														</div>
														SC
													</label>
												</div>
												<div className="flex items-center gap-1">
													<button onClick={() => { setEditingLevel({ session, level }); setEditLevelName(level); }} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"><Pencil className="h-3 w-3" /></button>
													<button onClick={() => deleteLevel(session, level)} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
												</div>
											</>
										)}
									</div>
									{/* Classes */}
									<div>
										<p className="text-xs font-semibold text-gray-500 mb-1">Classes</p>
										{(classLevels[session][level].classes || []).map((cls, ci) => (
											editingClass?.session === session && editingClass.level === level && editingClass.classIdx === ci ? (
												<div key={ci} className="flex items-center gap-2 mb-1">
													<input autoFocus value={editClassName} onChange={(e) => setEditClassName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditClass(session, level, ci)}
														className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
													<input value={editClassFeeGroup} onChange={(e) => setEditClassFeeGroup(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditClass(session, level, ci)}
														className="w-20 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
													<button onClick={() => saveEditClass(session, level, ci)} className="text-[10px] text-green-600 font-medium">Save</button>
													<button onClick={() => setEditingClass(null)} className="text-[10px] text-gray-400">Cancel</button>
												</div>
											) : (
												<div key={ci} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 py-0.5 group">
													<span>{cls.name}</span>
													<span className="text-gray-400">({cls.feeGroup})</span>
													<button onClick={() => { setEditingClass({ session, level, classIdx: ci }); setEditClassName(cls.name); setEditClassFeeGroup(cls.feeGroup); }}
														className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"><Pencil className="h-3 w-3" /></button>
													<button onClick={() => deleteClass(session, level, ci)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500"><X className="h-3 w-3" /></button>
												</div>
											)
										))}
										<div className="flex items-center gap-2 mt-1">
											<input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Class name" onKeyDown={(e) => e.key === 'Enter' && addClass(session, level)}
												className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
											<input value={newClassFeeGroup} onChange={(e) => setNewClassFeeGroup(e.target.value)} placeholder="Fee group" onKeyDown={(e) => e.key === 'Enter' && addClass(session, level)}
												className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
											<button onClick={() => addClass(session, level)} className="text-xs text-[#465fff] font-medium">+Add</button>
										</div>
									</div>
									{/* Subjects */}
									<div>
										<p className="text-xs font-semibold text-gray-500 mb-1">Subjects</p>
										{(classLevels[session][level].subjects || []).map((subj, si) => (
											editingSubject?.session === session && editingSubject.level === level && editingSubject.subjectIdx === si ? (
												<div key={si} className="flex items-center gap-2 mb-1">
													<input autoFocus value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditSubject(session, level, si)}
														className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
													<input value={editSubjectWeight} onChange={(e) => setEditSubjectWeight(e.target.value)} type="number" onKeyDown={(e) => e.key === 'Enter' && saveEditSubject(session, level, si)}
														className="w-14 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
													<button onClick={() => saveEditSubject(session, level, si)} className="text-[10px] text-green-600 font-medium">Save</button>
													<button onClick={() => setEditingSubject(null)} className="text-[10px] text-gray-400">Cancel</button>
												</div>
											) : (
												<div key={si} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 py-0.5 group">
													<span>{subj.name}</span>
													<span className="text-gray-400">w:{subj.weight}</span>
													<button onClick={() => { setEditingSubject({ session, level, subjectIdx: si }); setEditSubjectName(subj.name); setEditSubjectWeight(String(subj.weight)); }}
														className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"><Pencil className="h-3 w-3" /></button>
													<button onClick={() => deleteSubject(session, level, si)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500"><X className="h-3 w-3" /></button>
												</div>
											)
										))}
										<div className="flex items-center gap-2 mt-1">
											<input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject name" onKeyDown={(e) => e.key === 'Enter' && addSubject(session, level)}
												className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
											<input value={newSubjectWeight} onChange={(e) => setNewSubjectWeight(e.target.value)} placeholder="Weight" type="number" onKeyDown={(e) => e.key === 'Enter' && addSubject(session, level)}
												className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
											<button onClick={() => addSubject(session, level)} className="text-xs text-[#465fff] font-medium">+Add</button>
										</div>
									</div>
								</div>
							))}
							<div className="flex items-center gap-2 ml-4">
								<input value={newLevel} onChange={(e) => setNewLevel(e.target.value)} placeholder="New level name (e.g. Grade 1)"
									onKeyDown={(e) => e.key === 'Enter' && (() => { if (newLevel.trim()) { onChange({ ...classLevels, [session]: { ...classLevels[session], [newLevel.trim()]: { classes: [], subjects: [] } } }); setNewLevel(''); } })()}
									className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
								<button onClick={() => { if (newLevel.trim()) { onChange({ ...classLevels, [session]: { ...classLevels[session], [newLevel.trim()]: { classes: [], subjects: [] } } }); setNewLevel(''); } }}
									className="rounded-lg bg-[#465fff]/10 px-3 py-2 text-xs font-semibold text-[#465fff] hover:bg-[#465fff]/20">+ Level</button>
							</div>
						</div>
					)}
				</div>
			))}

			<div className="flex items-center gap-2">
				<input value={newSession} onChange={(e) => setNewSession(e.target.value)} placeholder="New session name (e.g. Morning)"
					onKeyDown={(e) => e.key === 'Enter' && (() => { if (newSession.trim()) { onChange({ ...classLevels, [newSession.trim()]: {} }); setNewSession(''); setExpandedSession(newSession.trim()); } })()}
					className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
				<button onClick={() => { if (newSession.trim()) { onChange({ ...classLevels, [newSession.trim()]: {} }); setNewSession(''); setExpandedSession(newSession.trim()); } }}
					className="rounded-lg bg-[#465fff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors">+ Session</button>
			</div>
		</div>
	);
}

// ─── Academic Permissions Editor ────────────────────────────────────────────────
function AcademicPermissionsEditor({ studentSettings, teacherSettings, currentYear, onChange }: {
	studentSettings: SchoolFormData['settings']['studentSettings'];
	teacherSettings: SchoolFormData['settings']['teacherSettings'];
	currentYear: string;
	onChange: (student: typeof studentSettings, teacher: typeof teacherSettings) => void;
}) {
	const [year, setYear] = useState(currentYear || '');
	const studentYear = studentSettings.reportAccessByYear[year] || { enabled: false, yearlyReportAccess: false, periods: [], semesters: [] };
	const teacherYear = teacherSettings.permissionsByYear[year] || { enabled: false, gradeSubmission: { enabled: false, periods: [] }, viewGradeSubmissions: { enabled: false }, gradeChangeRequest: { enabled: false, periods: [] }, viewMasters: { enabled: false } };

	const updateStudentYear = (patch: Partial<typeof studentYear>) => {
		onChange({ ...studentSettings, reportAccessByYear: { ...studentSettings.reportAccessByYear, [year]: { ...studentYear, ...patch } } }, teacherSettings);
	};
	const updateTeacherYear = (patch: Partial<typeof teacherYear>) => {
		onChange(studentSettings, { ...teacherSettings, permissionsByYear: { ...teacherSettings.permissionsByYear, [year]: { ...teacherYear, ...patch } } });
	};
	const togglePeriod = (current: string[], value: string) => current.includes(value) ? current.filter((p) => p !== value) : [...current, value];

	return (
		<div className="space-y-6">
			<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Per-Year Academic Permissions</h4>
			<p className="text-sm text-gray-500">Configure per-academic-year student report access and teacher permissions.</p>
			<Field label="Academic Year" value={year} onChange={setYear} placeholder="e.g. 2025-2026" />
			{year && (
				<>
					<div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
						<h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Student Report Access</h5>
						<ToggleRow label="Enabled for this year" checked={studentYear.enabled} onChange={(v) => updateStudentYear({ enabled: v })} />
						<ToggleRow label="Yearly report access" checked={studentYear.yearlyReportAccess} onChange={(v) => updateStudentYear({ yearlyReportAccess: v })} />
						<div>
							<p className="text-xs font-semibold text-gray-500 mb-2">Periods</p>
							<div className="flex flex-wrap gap-2">{ACADEMIC_PERIODS.map((p) => (
								<button key={p} onClick={() => updateStudentYear({ periods: togglePeriod(studentYear.periods, p) })}
									className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${studentYear.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
									{p.replace(/_/g, ' ')}
								</button>
							))}</div>
						</div>
						<div>
							<p className="text-xs font-semibold text-gray-500 mb-2">Semesters</p>
							<div className="flex flex-wrap gap-2">{SEMESTERS.map((s) => (
								<button key={s} onClick={() => updateStudentYear({ semesters: togglePeriod(studentYear.semesters, s) })}
									className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${studentYear.semesters.includes(s) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
									{s} semester
								</button>
							))}</div>
						</div>
					</div>
					<div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
						<h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Teacher Permissions</h5>
						<ToggleRow label="Enabled for this year" checked={teacherYear.enabled} onChange={(v) => updateTeacherYear({ enabled: v })} />
						<ToggleRow label="Grade submission" checked={teacherYear.gradeSubmission.enabled} onChange={(v) => updateTeacherYear({ gradeSubmission: { ...teacherYear.gradeSubmission, enabled: v } })} />
						{teacherYear.gradeSubmission.enabled && (
							<div className="ml-4"><p className="text-xs font-semibold text-gray-500 mb-2">Grade Submission Periods</p>
								<div className="flex flex-wrap gap-2">{ACADEMIC_PERIODS.map((p) => (
									<button key={p} onClick={() => updateTeacherYear({ gradeSubmission: { ...teacherYear.gradeSubmission, periods: togglePeriod(teacherYear.gradeSubmission.periods, p) } })}
										className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${teacherYear.gradeSubmission.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
										{p.replace(/_/g, ' ')}
									</button>
								))}</div>
							</div>
						)}
						<ToggleRow label="View grade submissions" checked={teacherYear.viewGradeSubmissions.enabled} onChange={(v) => updateTeacherYear({ viewGradeSubmissions: { enabled: v } })} />
						<ToggleRow label="Grade change requests" checked={teacherYear.gradeChangeRequest.enabled} onChange={(v) => updateTeacherYear({ gradeChangeRequest: { ...teacherYear.gradeChangeRequest, enabled: v } })} />
						{teacherYear.gradeChangeRequest.enabled && (
							<div className="ml-4"><p className="text-xs font-semibold text-gray-500 mb-2">Change Request Periods</p>
								<div className="flex flex-wrap gap-2">{ACADEMIC_PERIODS.map((p) => (
									<button key={p} onClick={() => updateTeacherYear({ gradeChangeRequest: { ...teacherYear.gradeChangeRequest, periods: togglePeriod(teacherYear.gradeChangeRequest.periods, p) } })}
										className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${teacherYear.gradeChangeRequest.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
										{p.replace(/_/g, ' ')}
									</button>
								))}</div>
							</div>
						)}
						<ToggleRow label="View masters" checked={teacherYear.viewMasters.enabled} onChange={(v) => updateTeacherYear({ viewMasters: { enabled: v } })} />
					</div>
				</>
			)}
		</div>
	);
}

// ─── Shared Components ──────────────────────────────────────────────────────────
function Field({ label, required, value, onChange, onBlur, placeholder }: {
	label: string; required?: boolean; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string;
}) {
	return (
		<div>
			<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label} {required && <span className="text-red-400">*</span>}</label>
			<input type="text" required={required} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
				className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
		</div>
	);
}

function DynamicList({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
	return (
		<div className="space-y-2">
			{values.map((val, i) => (
				<div key={i} className="flex items-center gap-2">
					<input value={val} onChange={(e) => { const next = [...values]; next[i] = e.target.value; onChange(next); }} placeholder={placeholder}
						className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" />
					<button onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
				</div>
			))}
			<button onClick={() => onChange([...values, ''])} className="text-sm text-[#465fff] font-medium hover:underline">+ Add</button>
		</div>
	);
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/50">
			<span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
			<div onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#465fff]' : 'bg-gray-300'}`}>
				<div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-[22px]' : 'left-0.5'}`} />
			</div>
		</label>
	);
}
