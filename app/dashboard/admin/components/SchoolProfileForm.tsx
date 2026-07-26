'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
	ArrowLeft, ArrowRight, Check, School, GraduationCap, Phone,
	ShieldCheck, Users, ToggleLeft, Loader2,
	DollarSign, ClipboardCheck, Trash2, Wand2, Save,
	Pencil, ChevronDown, ChevronRight,
} from 'lucide-react';
import {
	DEFAULT_CLASS_LEVELS, DEFAULT_ADMIN_POSITIONS, DEFAULT_FEATURES,
	DEFAULT_ROLE_FEATURE_ACCESS, buildFeeScheduleScaffold,
	buildDefaultStudentSettings, buildDefaultTeacherSettings,
	getAcademicYearRange,
} from '@/app/dashboard/admin/defaults/classLevels';
import { TENANT_THEME_NAMES, DEFAULT_TENANT_THEME_NAME } from '@/types/tenantTheme';
import type { FeatureKey } from '@/types/schoolProfile';

// ─── Constants ──────────────────────────────────────────────────────────────────

const FEATURE_KEYS: FeatureKey[] = [
	'dashboard', 'user_management', 'profile_management', 'ai_chat', 'homepage',
	'apps', 'attendance', 'teacher_attendance', 'grading_system', 'academic_reports',
	'academic_resources', 'calendar_events', 'class_management', 'fee_payment',
	'financial_reports', 'admissions', 'support_system', 'community', 'notifications',
	'school_settings',
];

const THEME_NAMES = TENANT_THEME_NAMES;

const ACADEMIC_PERIODS = [
	'first', 'second', 'third', 'third_period_exam', 'fourth', 'fifth', 'sixth', 'sixth_period_exam',
];

const SEMESTERS = ['first', 'second'];

// ─── Form state type (mirrors SchoolProfile structure) ──────────────────────────

interface TeacherYearPermissions {
	enabled: boolean;
	gradeSubmission: { enabled: boolean; periods: string[] };
	viewGradeSubmissions: { enabled: boolean };
	gradeChangeRequest: { enabled: boolean; periods: string[] };
	viewMasters: { enabled: boolean };
}

interface StudentYearReportAccess {
	enabled: boolean;
	yearlyReportAccess: boolean;
	periods: string[];
	semesters: string[];
}

export interface SchoolFormState {
	system: { host: string; dbName: string; isActive: boolean };
	identity: {
		name: string; shortName: string; initials: string; slogan: string;
		studentIdPrefix: string; yearFounded: string | number;
		firstAcademicYear: string; currentAcademicYear: string;
	};
	branding: { logoUrl: string; logoUrl2: string; themeName: string };
	contact: { addresses: { label?: string; lines: string[] }[]; phones: string[]; emails: string[] };
	academicConfig: {
		classLevels: Record<string, Record<string, {
			isSelfContained?: boolean;
			classes: { classId: string; name: string; feeGroup: string }[];
			subjects: { name: string; weight: number }[];
		}>>;
		gradingSettings: {
			passMark: number;
			gradeScale: { min: number; max: number };
			hasSummerSchool: boolean;
			givesDoublePromotion: boolean;
		};
	};
	userConfig: {
		administrativePositions: { id: string; name: string }[];
		sysAdmin: { name: string; phone: string; email: string };
		studentSettings: { loginAccess: boolean; reportAccessByYear: Record<string, StudentYearReportAccess> };
		teacherSettings: { loginAccess: boolean; permissionsByYear: Record<string, TeacherYearPermissions> };
		administratorSettings: { loginAccess: boolean };
	};
	featureConfig: {
		enabledFeatures: FeatureKey[];
		roleFeatureAccess: {
			student: FeatureKey[];
			teacher: FeatureKey[];
			system_admin: FeatureKey[];
			administrator: Record<string, FeatureKey[]>;
		};
	};
	financialConfig: { feeSchedules: Record<string, Record<string, unknown>> };
}

export const defaultFormState: SchoolFormState = {
	system: { host: '', dbName: '', isActive: true },
	identity: { name: '', shortName: '', initials: '', slogan: '', studentIdPrefix: '', yearFounded: '', firstAcademicYear: '', currentAcademicYear: '' },
	branding: { logoUrl: '', logoUrl2: '', themeName: DEFAULT_TENANT_THEME_NAME },
	contact: { addresses: [], phones: [], emails: [] },
	academicConfig: { classLevels: {}, gradingSettings: { passMark: 50, gradeScale: { min: 0, max: 100 }, hasSummerSchool: false, givesDoublePromotion: false } },
	userConfig: {
		administrativePositions: [...DEFAULT_ADMIN_POSITIONS],
		sysAdmin: { name: '', phone: '', email: '' },
		studentSettings: { loginAccess: true, reportAccessByYear: {} },
		teacherSettings: { loginAccess: true, permissionsByYear: {} },
		administratorSettings: { loginAccess: true },
	},
	featureConfig: {
		enabledFeatures: [...DEFAULT_FEATURES] as FeatureKey[],
		roleFeatureAccess: { ...DEFAULT_ROLE_FEATURE_ACCESS } as SchoolFormState['featureConfig']['roleFeatureAccess'],
	},
	financialConfig: { feeSchedules: {} },
};

// ─── Steps ──────────────────────────────────────────────────────────────────────

const STEPS = [
	{ label: 'School Identity', icon: School },
	{ label: 'Contact & Admin', icon: Phone },
	{ label: 'Academic', icon: GraduationCap },
	{ label: 'Grading', icon: ClipboardCheck },
	{ label: 'Features & Access', icon: ToggleLeft },
	{ label: 'Fee Schedules', icon: DollarSign },
];

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
	initialData?: Partial<SchoolFormState>;
	onSubmit: (data: SchoolFormState) => Promise<void>;
	submitLabel?: string;
	saving?: boolean;
}

// ─── Helper: deep merge ─────────────────────────────────────────────────────────

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
	const result = { ...base } as any;
	for (const key of Object.keys(override) as (keyof T)[]) {
		const val = override[key];
		if (val && typeof val === 'object' && !Array.isArray(val) && base[key] && typeof base[key] === 'object') {
			result[key] = deepMerge(base[key] as any, val as any);
		} else if (val !== undefined) {
			result[key] = val;
		}
	}
	return result;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function SchoolProfileForm({ initialData, onSubmit, submitLabel = 'Save', saving }: Props) {
	const [step, setStep] = useState(0);
	const [form, setForm] = useState<SchoolFormState>(() => deepMerge(defaultFormState, initialData || {}));

	// ── Generic nested update helper ──
	const update = useCallback((path: string, value: any) => {
		setForm((prev) => {
			const keys = path.split('.');
			const rebuild = (obj: any, depth: number): any => {
				if (depth === keys.length - 1) {
					return { ...obj, [keys[depth]]: value };
				}
				return { ...obj, [keys[depth]]: rebuild(obj[keys[depth]] || {}, depth + 1) };
			};
			return rebuild(prev, 0);
		});
	}, []);

	const handleSubmit = async () => { await onSubmit(form); };
	const isLast = step === STEPS.length - 1;

	// ── Auto-populate host/dbName/initials from shortName ──
	const prevShortName = useRef(form.identity.shortName);
	useEffect(() => {
		if (form.identity.shortName !== prevShortName.current) {
			prevShortName.current = form.identity.shortName;
			const slug = form.identity.shortName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
			if (slug) {
				setForm((prev) => {
					const next = { ...prev };
					const prevSlug = prevShortName.current.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
					if (!prev.system.host || prev.system.host === `${prevSlug}.schoolmesh.app`) {
						next.system = { ...next.system, host: `${slug}.schoolmesh.app` };
					}
					if (!prev.system.dbName || prev.system.dbName === `schoolmesh_${prevSlug}`) {
						next.system = { ...next.system, dbName: `schoolmesh_${slug}` };
					}
					if (!prev.identity.initials || prev.identity.initials === prevShortName.current.slice(0, 2).toUpperCase()) {
						next.identity = { ...next.identity, initials: form.identity.shortName.slice(0, 2).toUpperCase() };
					}
					if (!prev.identity.studentIdPrefix || prev.identity.studentIdPrefix === prevShortName.current.slice(0, 3).toUpperCase()) {
						next.identity = { ...next.identity, studentIdPrefix: form.identity.shortName.slice(0, 3).toUpperCase() };
					}
					return next;
				});
			}
		}
	}, [form.identity.shortName]);

	// ── Auto-populate currentAcademicYear from firstAcademicYear ──
	const prevFirstYear = useRef(form.identity.firstAcademicYear);
	useEffect(() => {
		if (form.identity.firstAcademicYear !== prevFirstYear.current) {
			prevFirstYear.current = form.identity.firstAcademicYear;
			if (form.identity.firstAcademicYear && !form.identity.currentAcademicYear) {
				update('identity.currentAcademicYear', form.identity.firstAcademicYear);
			}
		}
	}, [form.identity.firstAcademicYear, form.identity.currentAcademicYear, update]);

	// ── Auto-populate per-year settings when academic year range changes ──
	const prevCurrentYear = useRef(form.identity.currentAcademicYear);
	useEffect(() => {
		if (form.identity.currentAcademicYear !== prevCurrentYear.current) {
			prevCurrentYear.current = form.identity.currentAcademicYear;
			if (form.identity.firstAcademicYear && form.identity.currentAcademicYear) {
				const years = getAcademicYearRange(form.identity.firstAcademicYear, form.identity.currentAcademicYear);
				const existingStudentYears = Object.keys(form.userConfig.studentSettings.reportAccessByYear);
				const existingTeacherYears = Object.keys(form.userConfig.teacherSettings.permissionsByYear);
				const allYearsExist = years.every((y) => existingStudentYears.includes(y) && existingTeacherYears.includes(y));
				if (!allYearsExist && years.length > 0) {
					update('userConfig.studentSettings', buildDefaultStudentSettings(years));
					update('userConfig.teacherSettings', buildDefaultTeacherSettings(years));
				}
			}
		}
	}, [form.identity.firstAcademicYear, form.identity.currentAcademicYear, form.userConfig.studentSettings, form.userConfig.teacherSettings, update]);

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
								: 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-muted dark:text-gray-400'
							}`}>
							{isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
							<span className="hidden sm:inline">{s.label}</span>
						</button>
					);
				})}
			</div>

		<div className="rounded-xl border border-gray-200 bg-card p-4 sm:p-6 dark:border-gray-800 min-h-[400px]">
			<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-6">{STEPS[step].label}</h3>

				{/* ═══ Step 0: School Identity ═══ */}
				{step === 0 && (
					<div className="space-y-8">
						<div className="grid gap-5 sm:grid-cols-2">
							<div className="sm:col-span-2"><Field label="School Name" required value={form.identity.name} onChange={(v) => update('identity.name', v)} placeholder="e.g. Upstairs Christian Academy" /></div>
							<Field label="Short Name" required value={form.identity.shortName} onChange={(v) => update('identity.shortName', v)} onBlur={() => {
								const slug = form.identity.shortName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
								if (slug && !form.system.host) { update('system.host', `${slug}.schoolmesh.app`); update('system.dbName', `schoolmesh_${slug}`); }
								if (form.identity.shortName && !form.identity.initials) update('identity.initials', form.identity.shortName.slice(0, 2).toUpperCase());
								if (form.identity.shortName && !form.identity.studentIdPrefix) update('identity.studentIdPrefix', form.identity.shortName.slice(0, 3).toUpperCase());
							}} placeholder="e.g. Upstairs" />
							<Field label="Initials" required value={form.identity.initials} onChange={(v) => update('identity.initials', v)} placeholder="e.g. UCA" />
							<div className="sm:col-span-2"><Field label="Slogan" value={form.identity.slogan} onChange={(v) => update('identity.slogan', v)} placeholder="e.g. Excellence in Education" /></div>
							<Field label="Student ID Prefix" value={form.identity.studentIdPrefix} onChange={(v) => update('identity.studentIdPrefix', v)} placeholder="e.g. UCA" />
							<Field label="Year Founded" value={String(form.identity.yearFounded)} onChange={(v) => update('identity.yearFounded', v)} placeholder="e.g. 2011" />
							<Field label="First Academic Year" value={form.identity.firstAcademicYear} onChange={(v) => {
								update('identity.firstAcademicYear', v);
								if (v && !form.identity.currentAcademicYear) update('identity.currentAcademicYear', v);
							}} placeholder="e.g. 2025-2026" />
							<Field label="Current Academic Year" value={form.identity.currentAcademicYear} onChange={(v) => {
								update('identity.currentAcademicYear', v);
								if (v && Object.keys(form.academicConfig.classLevels).length > 0 && !form.financialConfig.feeSchedules[v]) {
									update('financialConfig.feeSchedules', { ...form.financialConfig.feeSchedules, ...buildFeeScheduleScaffold(form.academicConfig.classLevels, v) });
								}
								if (form.identity.firstAcademicYear && v) {
									const years = getAcademicYearRange(form.identity.firstAcademicYear, v);
									update('userConfig.studentSettings', buildDefaultStudentSettings(years));
									update('userConfig.teacherSettings', buildDefaultTeacherSettings(years));
								}
							}} placeholder="e.g. 2025-2026" />
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">System</h4>
							<div className="grid gap-5 sm:grid-cols-2">
								<div className="sm:col-span-2"><Field label="Host" required value={form.system.host} onChange={(v) => update('system.host', v)} placeholder="e.g. ucaliberia.vercel.app" /></div>
								<div className="sm:col-span-2"><Field label="Database Name" required value={form.system.dbName} onChange={(v) => update('system.dbName', v)} placeholder="e.g. schoolmesh_uca" /></div>
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Branding</h4>
							<div className="grid gap-5 sm:grid-cols-2">
								<div className="sm:col-span-2"><Field label="Logo URL" value={form.branding.logoUrl} onChange={(v) => update('branding.logoUrl', v)} placeholder="https://..." /></div>
								<div className="sm:col-span-2"><Field label="Secondary Logo URL" value={form.branding.logoUrl2} onChange={(v) => update('branding.logoUrl2', v)} placeholder="https://..." /></div>
								<div>
									<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Theme</label>
									<select value={form.branding.themeName} onChange={(e) => update('branding.themeName', e.target.value)}
										className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
										{THEME_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
									</select>
								</div>
								{form.branding.logoUrl && (
									<div>
										<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</label>
										<div className="mt-1.5 flex items-center gap-3">
											<img src={form.branding.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
											{form.branding.logoUrl2 && <img src={form.branding.logoUrl2} alt="Logo 2" className="h-12 w-12 rounded-lg object-contain border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* ═══ Step 1: Contact & Admin ═══ */}
				{step === 1 && (
					<div className="space-y-8">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Contact Information</h4>
							<div className="space-y-5">
								<div>
									<h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Addresses</h5>
									{form.contact.addresses.map((addr, i) => (
										<div key={i} className="flex items-start gap-2 mb-2">
											<input value={addr.lines.join(', ')} onChange={(e) => {
												const next = [...form.contact.addresses];
												next[i] = { ...next[i], lines: e.target.value.split(',').map((s) => s.trim()) };
												update('contact.addresses', next);
											}} placeholder="Address line..."
												className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<button onClick={() => update('contact.addresses', form.contact.addresses.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
										</div>
									))}
									<button onClick={() => update('contact.addresses', [...form.contact.addresses, { lines: [''] }])} className="text-sm text-[#465fff] font-medium hover:underline">+ Add</button>
								</div>
								<div><h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phone Numbers</h5><DynamicList values={form.contact.phones} onChange={(v) => update('contact.phones', v)} placeholder="+231 ..." /></div>
								<div><h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Emails</h5><DynamicList values={form.contact.emails} onChange={(v) => update('contact.emails', v)} placeholder="email@..." /></div>
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">System Admin</h4>
							<div className="grid gap-5 sm:grid-cols-2">
								<div className="sm:col-span-2"><Field label="Admin Name" required value={form.userConfig.sysAdmin.name} onChange={(v) => update('userConfig.sysAdmin.name', v)} placeholder="Full name" /></div>
								<Field label="Phone" required value={form.userConfig.sysAdmin.phone} onChange={(v) => update('userConfig.sysAdmin.phone', v)} placeholder="+231 ..." />
								<Field label="Email" value={form.userConfig.sysAdmin.email} onChange={(v) => update('userConfig.sysAdmin.email', v)} placeholder="email@..." />
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Administrative Positions</h4>
							<p className="text-xs text-gray-500 mb-3">Positions available in this school.</p>
							{form.userConfig.administrativePositions.map((pos, i) => (
								<div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-2">
									<input value={pos.id} onChange={(e) => { const next = [...form.userConfig.administrativePositions]; next[i] = { ...next[i], id: e.target.value }; update('userConfig.administrativePositions', next); }}
										placeholder="ID (e.g. principal)" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
									<input value={pos.name} onChange={(e) => { const next = [...form.userConfig.administrativePositions]; next[i] = { ...next[i], name: e.target.value }; update('userConfig.administrativePositions', next); }}
										placeholder="Display name (e.g. Principal)" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
									<button onClick={() => update('userConfig.administrativePositions', form.userConfig.administrativePositions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm self-end sm:self-auto">Remove</button>
								</div>
							))}
							<button onClick={() => update('userConfig.administrativePositions', [...form.userConfig.administrativePositions, { id: '', name: '' }])} className="text-sm text-[#465fff] font-medium hover:underline">+ Add Position</button>
						</div>
					</div>
				)}

				{/* ═══ Step 2: Academic ═══ */}
				{step === 2 && (
					<div className="space-y-8">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Class Levels</h4>
							<ClassLevelsEditor classLevels={form.academicConfig.classLevels} onChange={(v) => {
								update('academicConfig.classLevels', v);
								const year = form.identity.currentAcademicYear || form.identity.firstAcademicYear;
								if (year && Object.keys(v).length > 0) {
									const existing = Object.keys(form.financialConfig.feeSchedules);
									if (!existing.includes(year)) {
										update('financialConfig.feeSchedules', { ...form.financialConfig.feeSchedules, ...buildFeeScheduleScaffold(v, year) });
									}
								}
							}} onUseDefaults={() => {
								update('academicConfig.classLevels', DEFAULT_CLASS_LEVELS);
								const year = form.identity.currentAcademicYear || form.identity.firstAcademicYear;
								if (year) {
									update('financialConfig.feeSchedules', { ...form.financialConfig.feeSchedules, ...buildFeeScheduleScaffold(DEFAULT_CLASS_LEVELS, year) });
								}
							}} />
						</div>
					</div>
				)}

				{/* ═══ Step 3: Grading ═══ */}
				{step === 3 && (
					<div className="space-y-8">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Grading Settings</h4>
							<div className="grid gap-5 sm:grid-cols-2">
								<Field label="Pass Mark (%)" value={String(form.academicConfig.gradingSettings.passMark)} onChange={(v) => update('academicConfig.gradingSettings.passMark', Number(v) || 0)} placeholder="50" />
								<div>
									<label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade Scale</label>
									<div className="flex items-center gap-2 mt-1.5">
										<input type="number" value={form.academicConfig.gradingSettings.gradeScale.min} onChange={(e) => update('academicConfig.gradingSettings.gradeScale.min', Number(e.target.value) || 0)}
											className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="0" />
										<span className="text-gray-400">to</span>
										<input type="number" value={form.academicConfig.gradingSettings.gradeScale.max} onChange={(e) => update('academicConfig.gradingSettings.gradeScale.max', Number(e.target.value) || 100)}
											className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="100" />
									</div>
								</div>
							</div>
							<div className="space-y-3 mt-4">
								<ToggleRow label="Has summer school" checked={form.academicConfig.gradingSettings.hasSummerSchool} onChange={(v) => update('academicConfig.gradingSettings.hasSummerSchool', v)} />
								<ToggleRow label="Allow double promotion" checked={form.academicConfig.gradingSettings.givesDoublePromotion} onChange={(v) => update('academicConfig.gradingSettings.givesDoublePromotion', v)} />
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-6">
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Login Access</h4>
							<div className="space-y-3">
								<ToggleRow label="Students can log in" checked={form.userConfig.studentSettings.loginAccess} onChange={(v) => update('userConfig.studentSettings.loginAccess', v)} />
								<ToggleRow label="Teachers can log in" checked={form.userConfig.teacherSettings.loginAccess} onChange={(v) => update('userConfig.teacherSettings.loginAccess', v)} />
								<ToggleRow label="Administrators can log in" checked={form.userConfig.administratorSettings.loginAccess} onChange={(v) => update('userConfig.administratorSettings.loginAccess', v)} />
							</div>
						</div>
					</div>
				)}

				{/* ═══ Step 4: Features & Access ═══ */}
				{step === 4 && (
					<div className="space-y-8">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Enabled Features</h4>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{FEATURE_KEYS.map((key) => {
									const enabled = form.featureConfig.enabledFeatures.includes(key);
									return (
										<label key={key} onClick={() => update('featureConfig.enabledFeatures', enabled ? form.featureConfig.enabledFeatures.filter((f) => f !== key) : [...form.featureConfig.enabledFeatures, key])}
											className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${enabled ? 'border-[#465fff]/30 bg-[#465fff]/5' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-card'}`}>
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
										{form.featureConfig.enabledFeatures.map((key) => {
											const selected = form.featureConfig.roleFeatureAccess[role]?.includes(key);
											return (
												<button key={key} onClick={() => {
													const current = form.featureConfig.roleFeatureAccess[role] || [];
													update('featureConfig.roleFeatureAccess', { ...form.featureConfig.roleFeatureAccess, [role]: selected ? current.filter((f) => f !== key) : [...current, key] });
												}} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selected ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-gray-400'}`}>
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
								studentSettings={form.userConfig.studentSettings}
								teacherSettings={form.userConfig.teacherSettings}
								currentYear={form.identity.currentAcademicYear}
								onChange={(student, teacher) => {
									update('userConfig.studentSettings', student);
									update('userConfig.teacherSettings', teacher);
								}}
							/>
						</div>
					</div>
				)}

				{/* ═══ Step 5: Fee Schedules ═══ */}
				{step === 5 && (
					<div className="space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fee Schedules</h4>
							<p className="text-xs text-gray-500 mt-1">Fee groups are auto-generated from classLevels. Edit amounts below.</p>
						</div>
						{Object.keys(form.financialConfig.feeSchedules).length === 0 && Object.keys(form.academicConfig.classLevels).length > 0 && (
							<button onClick={() => {
								const year = form.identity.currentAcademicYear || form.identity.firstAcademicYear;
								if (year) update('financialConfig.feeSchedules', buildFeeScheduleScaffold(form.academicConfig.classLevels, year));
							}} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#465fff]/10 px-3 py-1.5 text-xs font-semibold text-[#465fff] hover:bg-[#465fff]/20 transition-colors">
								<Wand2 className="h-3.5 w-3.5" /> Generate from Class Levels
							</button>
						)}
					</div>
						{Object.keys(form.financialConfig.feeSchedules).length === 0 ? (
							<div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
								<DollarSignIcon className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
								<p className="text-sm text-gray-500">No fee schedules configured yet.</p>
								<p className="text-xs text-gray-400 mt-1">Set your academic years and class levels first, then fee groups will be auto-generated.</p>
							</div>
						) : (
							<div className="space-y-4">
								{Object.entries(form.financialConfig.feeSchedules).map(([year, yearData]: [string, any]) => (
									<div key={year} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
										<div className="bg-gray-50 dark:bg-muted/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
											<span className="text-sm font-semibold text-gray-900 dark:text-white">{year}</span>
											<button onClick={() => { const next = JSON.parse(JSON.stringify(form.financialConfig.feeSchedules)); delete next[year]; update('financialConfig.feeSchedules', next); }}
												className="text-xs text-red-400 hover:text-red-600 self-end sm:self-auto">Remove</button>
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
																				const next = JSON.parse(JSON.stringify(form.financialConfig.feeSchedules));
																				const fg = next[year]?.[sessionName]?.[fgKey];
																				if (fg) {
																					fg.tuitionAndRegistration = fg.tuitionAndRegistration || { old: {}, new: {} };
																					fg.tuitionAndRegistration.old = { ...fg.tuitionAndRegistration.old, tuition: Number(e.target.value) || 0 };
																				}
																				update('financialConfig.feeSchedules', next);
																			}}
																			className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="Old" />
																		<input type="number" value={fgData.tuitionAndRegistration?.new?.tuition || 0}
																			onChange={(e) => {
																				const next = JSON.parse(JSON.stringify(form.financialConfig.feeSchedules));
																				const fg = next[year]?.[sessionName]?.[fgKey];
																				if (fg) {
																					fg.tuitionAndRegistration = fg.tuitionAndRegistration || { old: {}, new: {} };
																					fg.tuitionAndRegistration.new = { ...fg.tuitionAndRegistration.new, tuition: Number(e.target.value) || 0 };
																				}
																				update('financialConfig.feeSchedules', next);
																			}}
																			className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="New" />
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
									value={JSON.stringify(form.financialConfig.feeSchedules, null, 2)}
									onChange={(e) => { try { update('financialConfig.feeSchedules', JSON.parse(e.target.value)); } catch {} }}
									rows={12}
									className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</details>
						</div>
					</div>
				)}
			</div>

		<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
			<button onClick={() => setStep((s) => s - 1)} disabled={step === 0}
				className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors dark:border-gray-800 dark:text-gray-400">
				<ArrowLeft className="h-4 w-4" /> Back
			</button>
			<div className="flex items-center justify-between sm:justify-end gap-3">
				<span className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</span>
				{!isLast && (
					<button onClick={handleSubmit} disabled={saving}
						className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors dark:border-gray-800 dark:text-gray-400">
						{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
						{saving ? 'Saving...' : 'Save'}
					</button>
				)}
				{isLast ? (
					<button onClick={handleSubmit} disabled={saving}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#465fff] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50 transition-colors">
						{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
						{saving ? 'Saving...' : submitLabel}
					</button>
				) : (
					<button onClick={() => setStep((s) => s + 1)}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#465fff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors">
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
	classLevels: SchoolFormState['academicConfig']['classLevels'];
	onChange: (v: SchoolFormState['academicConfig']['classLevels']) => void;
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
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].classes.push({ classId: `${session}-${newClassName.toLowerCase().replace(/\s+/g, '-')}`, name: newClassName, feeGroup: newClassFeeGroup || 'default' });
		onChange(data);
		setNewClassName('');
		setNewClassFeeGroup('');
	};

	const renameClass = (session: string, level: string, classIdx: number) => {
		if (!editClassName.trim()) { setEditingClass(null); return; }
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].classes[classIdx].name = editClassName;
		data[session][level].classes[classIdx].feeGroup = editClassFeeGroup || data[session][level].classes[classIdx].feeGroup;
		onChange(data);
		setEditingClass(null);
	};

	const deleteClass = (session: string, level: string, classIdx: number) => {
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].classes.splice(classIdx, 1);
		onChange(data);
	};

	const addSubject = (session: string, level: string) => {
		if (!newSubjectName.trim()) return;
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].subjects.push({ name: newSubjectName, weight: Number(newSubjectWeight) || 1 });
		onChange(data);
		setNewSubjectName('');
		setNewSubjectWeight('1');
	};

	const renameSubject = (session: string, level: string, subjectIdx: number) => {
		if (!editSubjectName.trim()) { setEditingSubject(null); return; }
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].subjects[subjectIdx].name = editSubjectName;
		data[session][level].subjects[subjectIdx].weight = Number(editSubjectWeight) || 1;
		onChange(data);
		setEditingSubject(null);
	};

	const deleteSubject = (session: string, level: string, subjectIdx: number) => {
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].subjects.splice(subjectIdx, 1);
		onChange(data);
	};

	return (
		<div className="space-y-4">
			{onUseDefaults && Object.keys(classLevels).length === 0 && (
				<button onClick={onUseDefaults} className="inline-flex items-center gap-1.5 rounded-lg bg-[#465fff]/10 px-3 py-1.5 text-xs font-semibold text-[#465fff] hover:bg-[#465fff]/20 transition-colors">
					<Wand2 className="h-3.5 w-3.5" /> Use Default Class Levels
				</button>
			)}
			<div className="flex gap-2">
				<input value={newSession} onChange={(e) => setNewSession(e.target.value)} placeholder="New session name (e.g. Morning)"
					className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
				<button onClick={() => { if (newSession.trim()) { onChange({ ...classLevels, [newSession.trim()]: {} }); setNewSession(''); setExpandedSession(newSession.trim()); } }}
					className="rounded-lg bg-[#465fff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors justify-center">+ Session</button>
			</div>
			{sessions.map((session) => (
				<div key={session} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
					<div className="flex items-center gap-2 bg-gray-50 dark:bg-muted/50 px-4 py-3 cursor-pointer" onClick={() => setExpandedSession(expandedSession === session ? null : session)}>
						{expandedSession === session ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
						{editingSession === session ? (
							<input autoFocus value={editSessionName} onChange={(e) => setEditSessionName(e.target.value)} onBlur={() => renameSession(session)} onKeyDown={(e) => { if (e.key === 'Enter') renameSession(session); if (e.key === 'Escape') setEditingSession(null); }}
								onClick={(e) => e.stopPropagation()} className="flex-1 rounded border border-[#465fff] bg-white px-2 py-0.5 text-sm outline-none dark:bg-muted dark:text-white" />
						) : (
							<span className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{session}</span>
						)}
						<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
							<button onClick={() => { setEditingSession(session); setEditSessionName(session); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-3.5 w-3.5" /></button>
							<button onClick={() => deleteSession(session)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
						</div>
					</div>
					{expandedSession === session && (
						<div className="p-4 space-y-3">
							{Object.keys(classLevels[session] || {}).map((level) => (
								<div key={level} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
									<div className="flex items-center gap-2 mb-2">
										{editingLevel?.session === session && editingLevel?.level === level ? (
											<input autoFocus value={editLevelName} onChange={(e) => setEditLevelName(e.target.value)} onBlur={() => renameLevel(session, level)} onKeyDown={(e) => { if (e.key === 'Enter') renameLevel(session, level); if (e.key === 'Escape') setEditingLevel(null); }}
												className="flex-1 rounded border border-[#465fff] bg-white px-2 py-0.5 text-sm outline-none dark:bg-muted dark:text-white" />
										) : (
											<span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{level}</span>
										)}
										<label className="flex items-center gap-1.5 text-xs text-gray-500">
											<input type="checkbox" checked={classLevels[session][level].isSelfContained || false}
												onChange={(e) => { const data = JSON.parse(JSON.stringify(classLevels)); data[session][level].isSelfContained = e.target.checked; onChange(data); }} />
											Self-contained
										</label>
										<button onClick={() => { setEditingLevel({ session, level }); setEditLevelName(level); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-3 w-3" /></button>
										<button onClick={() => deleteLevel(session, level)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
									</div>
									<div className="ml-4 space-y-1">
										{(classLevels[session][level].classes || []).map((cls: any, idx: number) => (
											<div key={idx} className="flex items-center gap-2 text-xs">
												{editingClass?.session === session && editingClass?.level === level && editingClass?.classIdx === idx ? (
													<>
														<input autoFocus value={editClassName} onChange={(e) => setEditClassName(e.target.value)} className="w-24 rounded border border-[#465fff] bg-white px-1.5 py-0.5 outline-none dark:bg-muted dark:text-white" />
														<input value={editClassFeeGroup} onChange={(e) => setEditClassFeeGroup(e.target.value)} placeholder="Fee group" className="w-24 rounded border border-gray-200 bg-white px-1.5 py-0.5 outline-none dark:bg-muted dark:text-white" />
														<button onClick={() => renameClass(session, level, idx)} className="text-[#465fff]">Save</button>
														<button onClick={() => setEditingClass(null)} className="text-gray-400">Cancel</button>
													</>
												) : (
													<>
														<span className="text-gray-700 dark:text-gray-300">{cls.name}</span>
														<span className="text-gray-400">({cls.feeGroup})</span>
														<button onClick={() => { setEditingClass({ session, level, classIdx: idx }); setEditClassName(cls.name); setEditClassFeeGroup(cls.feeGroup); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-2.5 w-2.5" /></button>
														<button onClick={() => deleteClass(session, level, idx)} className="text-red-400 hover:text-red-600"><Trash2 className="h-2.5 w-2.5" /></button>
													</>
												)}
											</div>
										))}
										<div className="flex items-center gap-2 mt-1">
											<input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Class name" onKeyDown={(e) => { if (e.key === 'Enter') addClass(session, level); }}
												className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<input value={newClassFeeGroup} onChange={(e) => setNewClassFeeGroup(e.target.value)} placeholder="Fee group" onKeyDown={(e) => { if (e.key === 'Enter') addClass(session, level); }}
												className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<button onClick={() => addClass(session, level)} className="text-xs text-[#465fff] font-medium">+ Add</button>
										</div>
									</div>
									{!classLevels[session][level].isSelfContained && (
										<div className="ml-4 mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
											<p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Subjects</p>
											{(classLevels[session][level].subjects || []).map((subj: any, idx: number) => (
												<div key={idx} className="flex items-center gap-2 text-xs mb-0.5">
													{editingSubject?.session === session && editingSubject?.level === level && editingSubject?.subjectIdx === idx ? (
														<>
															<input autoFocus value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} className="w-24 rounded border border-[#465fff] bg-white px-1.5 py-0.5 outline-none dark:bg-muted dark:text-white" />
															<input type="number" value={editSubjectWeight} onChange={(e) => setEditSubjectWeight(e.target.value)} className="w-12 rounded border border-gray-200 bg-white px-1.5 py-0.5 outline-none dark:bg-muted dark:text-white" />
															<button onClick={() => renameSubject(session, level, idx)} className="text-[#465fff]">Save</button>
															<button onClick={() => setEditingSubject(null)} className="text-gray-400">Cancel</button>
														</>
													) : (
														<>
															<span className="text-gray-700 dark:text-gray-300">{subj.name}</span>
															<span className="text-gray-400">×{subj.weight}</span>
															<button onClick={() => { setEditingSubject({ session, level, subjectIdx: idx }); setEditSubjectName(subj.name); setEditSubjectWeight(String(subj.weight)); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-2.5 w-2.5" /></button>
															<button onClick={() => deleteSubject(session, level, idx)} className="text-red-400 hover:text-red-600"><Trash2 className="h-2.5 w-2.5" /></button>
														</>
													)}
												</div>
											))}
											<div className="flex items-center gap-2 mt-1">
												<input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject" onKeyDown={(e) => { if (e.key === 'Enter') addSubject(session, level); }}
													className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
												<input type="number" value={newSubjectWeight} onChange={(e) => setNewSubjectWeight(e.target.value)} placeholder="W" onKeyDown={(e) => { if (e.key === 'Enter') addSubject(session, level); }}
													className="w-12 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
												<button onClick={() => addSubject(session, level)} className="text-xs text-[#465fff] font-medium">+ Add</button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

// ─── Academic Permissions Editor ────────────────────────────────────────────────
function AcademicPermissionsEditor({ studentSettings, teacherSettings, currentYear, onChange }: {
	studentSettings: SchoolFormState['userConfig']['studentSettings'];
	teacherSettings: SchoolFormState['userConfig']['teacherSettings'];
	currentYear: string;
	onChange: (student: typeof studentSettings, teacher: typeof teacherSettings) => void;
}) {
	const [year, setYear] = useState(currentYear || '');
	const studentYear = studentSettings.reportAccessByYear[year] || { enabled: false, yearlyReportAccess: false, periods: [] as string[], semesters: [] as string[] };
	const teacherYear = teacherSettings.permissionsByYear[year] || { enabled: false, gradeSubmission: { enabled: false, periods: [] as string[] }, viewGradeSubmissions: { enabled: false }, gradeChangeRequest: { enabled: false, periods: [] as string[] }, viewMasters: { enabled: false } };

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
									className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${studentYear.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
									{p.replace(/_/g, ' ')}
								</button>
							))}</div>
						</div>
						<div>
							<p className="text-xs font-semibold text-gray-500 mb-2">Semesters</p>
							<div className="flex flex-wrap gap-2">{SEMESTERS.map((s) => (
								<button key={s} onClick={() => updateStudentYear({ semesters: togglePeriod(studentYear.semesters, s) })}
									className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${studentYear.semesters.includes(s) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
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
										className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${teacherYear.gradeSubmission.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
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
										className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${teacherYear.gradeChangeRequest.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
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
				className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-muted dark:text-white" />
		</div>
	);
}

function DynamicList({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
	return (
		<div className="space-y-2">
			{values.map((val, i) => (
				<div key={i} className="flex items-center gap-2">
					<input value={val} onChange={(e) => { const next = [...values]; next[i] = e.target.value; onChange(next); }} placeholder={placeholder}
						className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
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

// Thin wrapper so the fee-schedules step can reference a component (keeps JSX compact)
function DollarSignIcon(props: React.SVGProps<SVGSVGElement>) {
	return <DollarSign {...props} />;
}
