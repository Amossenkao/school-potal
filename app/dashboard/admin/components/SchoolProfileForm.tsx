'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
	ArrowLeft, ArrowRight, Check, School, GraduationCap, Phone,
	ToggleLeft, Loader2,
	DollarSign, ClipboardCheck, Trash2, Wand2,
	Pencil, ChevronDown, ChevronRight,
} from 'lucide-react';
import {
	DEFAULT_CLASS_LEVELS, DEFAULT_ADMIN_POSITIONS, DEFAULT_FEATURES,
	DEFAULT_ROLE_FEATURE_ACCESS,
	DEFAULT_CURRENCIES, DEFAULT_FEE_DEFINITIONS, DEFAULT_INSTALLMENTS, DEFAULT_STUDENT_GROUPS,
	DEFAULT_PAYMENT_CATEGORIES,
	buildDefaultStudentSettings, buildDefaultTeacherSettings,
	buildDefaultFeeSchedule, getAcademicYearRange,
} from '@/app/dashboard/admin/defaults/classLevels';
import { TENANT_THEME_NAMES, DEFAULT_TENANT_THEME_NAME } from '@/types/tenantTheme';
import { REPORT_CARD_THEMES } from '@/types/reportCardTheme';
import { FEATURE_KEYS, type FeatureKey } from '@/types';

// ─── Constants ──────────────────────────────────────────────────────────────────


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
	system: { host: string; dbName: string; isActive: boolean; matchHost: boolean };
	identity: {
		name: string; shortName: string; initials: string; slogan: string;
		studentIdPrefix: string; yearFounded: string | number;
		firstAcademicYear: string; currentAcademicYear: string;
	};
	branding: { logoUrl: string; logoUrl2: string; themeName: string; reportCardThemes: Record<string, string> };
	contact: { addresses: string[]; phones: string[]; emails: string[]; website: string };
	academicConfig: {
		classLevels: Record<string, Record<string, {
			isSelfContained?: boolean;
			classes: { classId: string; name: string }[];
			subjects: { name: string; isMajorSubject?: boolean }[];
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
			parent: FeatureKey[];
		};
	};
	financialConfig: {
		currencies: { code: string; label: string; symbol: string; isDefault: boolean }[];
		paymentCategories: { id: string; name: string }[];
		feeDefinitions: { id: string; name: string; category: string; description: string; isActive: boolean }[];
		installments: { id: string; label: string; dueWindow: string }[];
		studentGroups: {
			id: string; name: string; priority: number; isActive: boolean;
			conditions: { field: string; operator: string; value: string }[];
		}[];
		feeSchedules: any[];
	};
}

export const defaultFormState: SchoolFormState = {
	system: { host: '', dbName: '', isActive: true, matchHost: true },
	identity: { name: '', shortName: '', initials: '', slogan: '', studentIdPrefix: '', yearFounded: '', firstAcademicYear: '', currentAcademicYear: '' },
	branding: { logoUrl: '', logoUrl2: '', themeName: DEFAULT_TENANT_THEME_NAME, reportCardThemes: {} },
	contact: { addresses: [], phones: [], emails: [], website: '' },
	academicConfig: { classLevels: {}, gradingSettings: { passMark: 70, gradeScale: { min: 60, max: 100 }, hasSummerSchool: false, givesDoublePromotion: false } },
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
	financialConfig: {
		currencies: DEFAULT_CURRENCIES.map((c) => ({ ...c })),
		paymentCategories: DEFAULT_PAYMENT_CATEGORIES.map((c) => ({ ...c })),
		feeDefinitions: DEFAULT_FEE_DEFINITIONS.map((f) => ({ ...f })),
		installments: DEFAULT_INSTALLMENTS.map((i) => ({ ...i })),
		studentGroups: DEFAULT_STUDENT_GROUPS.map((g) => ({ ...g, conditions: g.conditions.map((c) => ({ ...c })) })),
		feeSchedules: [],
	},
};

// ─── Steps ──────────────────────────────────────────────────────────────────────

const STEPS = [
	{ label: 'School Identity', icon: School },
	{ label: 'Contact & Admin', icon: Phone },
	{ label: 'Academic', icon: GraduationCap },
	{ label: 'Grading', icon: ClipboardCheck },
	{ label: 'Features & Access', icon: ToggleLeft },
	{ label: 'Financial', icon: DollarSign },
];

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
	initialData?: Partial<SchoolFormState>;
	onSubmit: (data: SchoolFormState) => Promise<void>;
	submitLabel?: string;
	saving?: boolean;
}

// ─── Helper: filter feature config to only include valid FEATURE_KEYS ──────────

function sanitizeFeatureConfig(
	featureConfig: Partial<SchoolFormState['featureConfig']>,
): SchoolFormState['featureConfig'] {
	const validKeys = (keys: string[]) => keys.filter((k): k is FeatureKey => FEATURE_KEYS.includes(k as FeatureKey));
	const studentKeys = featureConfig.roleFeatureAccess?.student ? validKeys(featureConfig.roleFeatureAccess.student) : [];
	return {
		enabledFeatures: featureConfig.enabledFeatures ? validKeys(featureConfig.enabledFeatures) : [],
		roleFeatureAccess: {
			student: studentKeys,
			teacher: featureConfig.roleFeatureAccess?.teacher ? validKeys(featureConfig.roleFeatureAccess.teacher) : [],
			system_admin: featureConfig.roleFeatureAccess?.system_admin ? validKeys(featureConfig.roleFeatureAccess.system_admin) : [],
			administrator: featureConfig.roleFeatureAccess?.administrator
				? Object.fromEntries(
					Object.entries(featureConfig.roleFeatureAccess.administrator).map(([pos, keys]) => [pos, validKeys(keys)]),
				)
				: {},
			parent: featureConfig.roleFeatureAccess?.parent
				? validKeys(featureConfig.roleFeatureAccess.parent).filter((key) => studentKeys.includes(key))
				: [],
		},
	};
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

// ─── Helper: keep fixed-payment scholarship fees in sync ────────────────────────
// For every fixed-payment scholarship, ensure a "Scholarships" fee group exists
// in each session and a "{name} Payment" scheduled fee (linked via scholarshipId)
// with the scholarship's amount/currency applies to all classes.

function syncScholarshipPaymentFees(
	schedules: any[],
	classLevels: Record<string, Record<string, { isSelfContained?: boolean; classes: { classId: string; name: string }[] }>>,
	feeDefinitions: any[],
): { schedules: any[]; feeDefinitions: any[] } {
	const allClassIds: string[] = [];
	for (const session of Object.values(classLevels)) {
		if (!session || typeof session !== 'object') continue;
		for (const level of Object.values(session)) {
			if (!level || typeof level !== 'object') continue;
			for (const cls of (level as any).classes ?? []) {
				if (cls?.classId) allClassIds.push(cls.classId);
			}
		}
	}

	const nextFeeDefs = [...feeDefinitions];

	const nextSchedules = schedules.map((schedule: any) => {
		const fixedPayments = (schedule.scholarships || []).filter(
			(s: any) =>
				s.scholarshipType === 'fixedPayment' &&
				String(s.name || '').trim(),
		);
		if (fixedPayments.length === 0) return schedule;

		// Ensure a fee definition "{name} Payment" exists for each scholarship.
		const defIdByScholarship = new Map<string, string>();
		for (const s of fixedPayments) {
			const defName = `${String(s.name).trim()} Payment`;
			const slug = `scholarship-${s.id}-payment`;
			const defIdx = nextFeeDefs.findIndex(
				(d) => d.id === slug || d.name === defName,
			);
			if (defIdx === -1) {
				nextFeeDefs.push({
					id: slug,
					name: defName,
					category: 'other',
					description: `Payment for the ${String(s.name).trim()} scholarship`,
					isActive: true,
				});
			} else if (nextFeeDefs[defIdx].name !== defName) {
				nextFeeDefs[defIdx] = { ...nextFeeDefs[defIdx], name: defName };
			}
			const existing = nextFeeDefs.find((d) => d.id === slug || d.name === defName);
			defIdByScholarship.set(s.id, existing!.id);
		}

		const sessions = (schedule.sessionFeeSchedules || []).map((sfs: any) => {
			const groups = [...(sfs.feeGroups || [])];
			let groupIdx = groups.findIndex(
				(g: any) => String(g.name || '').trim().toLowerCase() === 'scholarships',
			);
			if (groupIdx === -1) {
				groupIdx = groups.length;
				groups.push({
					id: `fg-scholarships-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					name: 'Scholarships',
					appliesToClassIds: [...allClassIds],
					scheduledFees: [],
				});
			} else {
				const currentIds = groups[groupIdx].appliesToClassIds || [];
				const merged = Array.from(new Set([...currentIds, ...allClassIds]));
				if (merged.length !== currentIds.length) {
					groups[groupIdx] = { ...groups[groupIdx], appliesToClassIds: merged };
				}
			}

			// Remove orphaned scholarship payment fees.
			let scheduledFees = (groups[groupIdx].scheduledFees || []).filter(
				(sf: any) =>
					!sf.scholarshipId ||
					fixedPayments.some((s: any) => s.id === sf.scholarshipId),
			);

			// Add/update payment fees for current fixed-payment scholarships.
			for (const s of fixedPayments) {
				const defId = defIdByScholarship.get(s.id)!;
				const feeIdx = scheduledFees.findIndex(
					(sf: any) => sf.scholarshipId === s.id || sf.feeId === defId,
				);
				const amount = {
					amount: Number(s.amount) || 0,
					currency: s.currency || 'LRD',
				};
				// Scholarship-level splits win; otherwise keep whatever splits the
				// admin configured directly on the fee.
				const scholarshipInstallments = (s.installments || []).map((en: any) => ({
					...en,
				}));
				if (feeIdx >= 0) {
					const existing = scheduledFees[feeIdx];
					scheduledFees[feeIdx] = {
						...existing,
						feeId: defId,
						amount,
						isRequired: true,
						scholarshipId: s.id,
						installments:
							scholarshipInstallments.length > 0
								? scholarshipInstallments
								: existing.installments || [],
					};
				} else {
					scheduledFees.push({
						feeId: defId,
						amount,
						isRequired: true,
						installments: scholarshipInstallments,
						applicableStudentGroupIds: [],
						scholarshipId: s.id,
					});
				}
			}

			groups[groupIdx] = { ...groups[groupIdx], scheduledFees };
			return { ...sfs, feeGroups: groups };
		});

		return { ...schedule, sessionFeeSchedules: sessions };
	});

	return { schedules: nextSchedules, feeDefinitions: nextFeeDefs };
}

// ─── Validation helpers ────────────────────────────────────────────────────────

function isValidPhone(phone: string): boolean {
	const cleaned = phone.replace(/[\s\-().]/g, '');
	return /^\+?\d{7,15}$/.test(cleaned);
}

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

type StepErrors = Record<string, string>;

function validateStep(stepIndex: number, form: SchoolFormState): StepErrors {
	const errors: StepErrors = {};

	if (stepIndex === 0) {
		if (!form.identity.name.trim()) errors['identity.name'] = 'School name is required';
		if (!form.identity.shortName.trim()) errors['identity.shortName'] = 'Short name is required';
		if (!form.identity.initials.trim()) errors['identity.initials'] = 'Initials are required';
		if (!form.system.host.trim()) errors['system.host'] = 'Host is required';
		if (!form.system.dbName.trim()) errors['system.dbName'] = 'Database name is required';
	}

	if (stepIndex === 1) {
		if (!form.userConfig.sysAdmin.name.trim()) errors['userConfig.sysAdmin.name'] = 'Admin name is required';
		if (!form.userConfig.sysAdmin.phone.trim()) {
			errors['userConfig.sysAdmin.phone'] = 'Admin phone is required';
		} else if (!isValidPhone(form.userConfig.sysAdmin.phone)) {
			errors['userConfig.sysAdmin.phone'] = 'Enter a valid phone number';
		}
		if (form.userConfig.sysAdmin.email.trim() && !isValidEmail(form.userConfig.sysAdmin.email)) {
			errors['userConfig.sysAdmin.email'] = 'Enter a valid email address';
		}
		for (let i = 0; i < form.contact.phones.length; i++) {
			const p = form.contact.phones[i];
			if (p.trim() && !isValidPhone(p)) {
				errors[`contact.phones.${i}`] = 'Invalid phone number';
			}
		}
		for (let i = 0; i < form.contact.emails.length; i++) {
			const e = form.contact.emails[i];
			if (e.trim() && !isValidEmail(e)) {
				errors[`contact.emails.${i}`] = 'Invalid email address';
			}
		}
	}

	if (stepIndex === 2) {
		if (Object.keys(form.academicConfig.classLevels).length === 0) {
			errors['academicConfig.classLevels'] = 'At least one class level session is required';
		}
	}

	if (stepIndex === 5) {
		const installmentIds = new Set(form.financialConfig.installments.map((i) => i.id).filter(Boolean));
		for (const s of form.financialConfig.feeSchedules) {
			for (const sfs of s.sessionFeeSchedules || []) {
				for (const fg of sfs.feeGroups || []) {
					for (const sf of fg.scheduledFees || []) {
						const amount = Number(sf.amount?.amount) || 0;
						for (const en of sf.installments || []) {
							if (en.installmentId && !installmentIds.has(en.installmentId)) {
								errors['financialConfig.installments'] = 'A fee split references an installment that no longer exists';
								return errors;
							}
						}
						const assigned = (sf.installments || []).reduce((sum: number, en: any) => {
							if (en.percentage !== undefined) return sum + (Number(en.percentage) || 0) * amount;
							return sum + (Number(en.fixedAmount) || 0);
						}, 0);
						if (assigned > amount + 0.000001) {
							errors['financialConfig.installments'] = 'A fee has installment totals that exceed its amount';
							return errors;
						}
					}
				}
			}
			for (const sch of s.scholarships || []) {
				if (sch.scholarshipType !== 'fixedPayment') continue;
				const schAmount = Number(sch.amount) || 0;
				for (const en of sch.installments || []) {
					if (en.installmentId && !installmentIds.has(en.installmentId)) {
						errors['financialConfig.installments'] = 'A scholarship split references an installment that no longer exists';
						return errors;
					}
				}
				const schAssigned = (sch.installments || []).reduce((sum: number, en: any) => {
					if (en.percentage !== undefined) return sum + (Number(en.percentage) || 0) * schAmount;
					return sum + (Number(en.fixedAmount) || 0);
				}, 0);
				if (schAssigned > schAmount + 0.000001) {
					errors['financialConfig.installments'] = `A scholarship (${String(sch.name || 'unnamed').trim()}) has installment totals that exceed its amount`;
					return errors;
				}
			}
		}
	}

	return errors;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function SchoolProfileForm({ initialData, onSubmit, submitLabel = 'Save', saving }: Props) {
	const [step, setStep] = useState(0);
	const [form, setForm] = useState<SchoolFormState>(() => {
		const merged = deepMerge(defaultFormState, initialData || {});
		merged.featureConfig = sanitizeFeatureConfig(merged.featureConfig);
		return merged;
	});
	const [errors, setErrors] = useState<StepErrors>({});
	const [expandedFeeGroups, setExpandedFeeGroups] = useState<Set<string>>(new Set());
	const [expandedFinancialSections, setExpandedFinancialSections] = useState<Set<string>>(new Set());
	const [expandedFeeDefs, setExpandedFeeDefs] = useState<Set<number>>(new Set());

	// ── Navigation with validation ──
	const navigateStep = useCallback((target: number) => {
		if (target < step) {
			setErrors({});
			setStep(target);
			return;
		}
		const validationErrors = validateStep(step, form);
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}
		setErrors({});
		setStep(target);
	}, [step, form]);

	const goNext = useCallback(() => {
		const validationErrors = validateStep(step, form);
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}
		setErrors({});
		setStep((s) => s + 1);
	}, [step, form]);

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
		setErrors((prev) => {
			if (prev[path]) {
				const next = { ...prev };
				delete next[path];
				return next;
			}
			return prev;
		});
	}, []);

	const handleSubmit = async () => { await onSubmit(form); };
	const isLast = step === STEPS.length - 1;

	// ── Auto-populate host/dbName from shortName ──
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
					if (prev.system.matchHost) {
						next.system = { ...next.system, dbName: (next.system.host || `${slug}.schoolmesh.app`).replace(/[.-]/g, '_') };
					} else if (!prev.system.dbName || prev.system.dbName === `schoolmesh_${prevSlug}`) {
						next.system = { ...next.system, dbName: `schoolmesh_${slug}` };
					}
					return next;
				});
			}
		}
	}, [form.identity.shortName]);

	// ── Auto-populate initials/studentIdPrefix from name (first letter of each word) ──
	const prevName = useRef(form.identity.name);
	useEffect(() => {
		if (form.identity.name !== prevName.current) {
			const prevInitials = prevName.current.trim().split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase();
			prevName.current = form.identity.name;
			const words = form.identity.name.trim().split(/\s+/).filter(Boolean);
			if (words.length > 0) {
				const initials = words.map(w => w[0]).join('').toUpperCase();
				setForm((prev) => {
					const next = { ...prev };
					if (!prev.identity.initials || prev.identity.initials === prevInitials) {
						next.identity = { ...next.identity, initials };
					}
					if (!prev.identity.studentIdPrefix || prev.identity.studentIdPrefix === prevInitials) {
						next.identity = { ...next.identity, studentIdPrefix: initials };
					}
					return next;
				});
			}
		}
	}, [form.identity.name]);

	// ── When matchHost is ON, mirror host → dbName (dots replaced with underscores) ──
	useEffect(() => {
		const expectedDbName = form.system.host.replace(/[.-]/g, '_');
		if (form.system.matchHost && expectedDbName !== form.system.dbName) {
			update('system.dbName', expectedDbName);
		}
	}, [form.system.matchHost, form.system.host]);

	// ── Auto-populate currentAcademicYear from firstAcademicYear ──
	const prevFirstYear = useRef(form.identity.firstAcademicYear);
	useEffect(() => {
		if (form.identity.firstAcademicYear !== prevFirstYear.current) {
			prevFirstYear.current = form.identity.firstAcademicYear;
			if (/^\d{4}-\d{4}$/.test(form.identity.firstAcademicYear) && !form.identity.currentAcademicYear) {
				update('identity.currentAcademicYear', form.identity.firstAcademicYear);
			}
		}
	}, [form.identity.firstAcademicYear, form.identity.currentAcademicYear, update]);

	// ── Auto-populate per-year settings when academic year range changes ──
	const prevCurrentYear = useRef(form.identity.currentAcademicYear);
	useEffect(() => {
		if (form.identity.currentAcademicYear !== prevCurrentYear.current) {
			prevCurrentYear.current = form.identity.currentAcademicYear;
			if (/^\d{4}-\d{4}$/.test(form.identity.firstAcademicYear) && /^\d{4}-\d{4}$/.test(form.identity.currentAcademicYear)) {
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

	// ── Sync fee schedule sessions with classLevels ──
	useEffect(() => {
		if (!form.identity.currentAcademicYear || !/^\d{4}-\d{4}$/.test(form.identity.currentAcademicYear)) return;
		const currentYear = form.identity.currentAcademicYear;
		const existingIdx = form.financialConfig.feeSchedules.findIndex((s) => s.academicYear === currentYear);

		// Build the expected session list from classLevels
		const sessionNames = Object.keys(form.academicConfig.classLevels);

		if (existingIdx === -1) {
			// No fee schedule for current year — create one with sessions from classLevels
			const sessions = sessionNames.map((name) => ({ sessionName: name, feeGroups: [] }));
			update('financialConfig.feeSchedules', [...form.financialConfig.feeSchedules, { academicYear: currentYear, sessionFeeSchedules: sessions, scholarships: [] }]);
		} else {
			// Fee schedule exists — sync its sessions with classLevels
			const existing = form.financialConfig.feeSchedules[existingIdx];
			const existingSessionNames = (existing.sessionFeeSchedules || []).map((s: any) => s.sessionName);
			const needsSync = sessionNames.length !== existingSessionNames.length || sessionNames.some((n) => !existingSessionNames.includes(n));
			if (needsSync) {
				const next = [...form.financialConfig.feeSchedules];
				const mergedSessions = sessionNames.map((name) => {
					const prev = (existing.sessionFeeSchedules || []).find((s: any) => s.sessionName === name);
					return prev || { sessionName: name, feeGroups: [] };
				});
				next[existingIdx] = { ...existing, sessionFeeSchedules: mergedSessions };
				update('financialConfig.feeSchedules', next);
			}
		}
	}, [form.identity.currentAcademicYear, form.academicConfig.classLevels, update]);

	// ── Keep fixed-payment scholarship payment fees in sync ──
	useEffect(() => {
		const synced = syncScholarshipPaymentFees(
			form.financialConfig.feeSchedules,
			form.academicConfig.classLevels,
			form.financialConfig.feeDefinitions,
		);
		const schedulesChanged =
			JSON.stringify(synced.schedules) !==
			JSON.stringify(form.financialConfig.feeSchedules);
		const defsChanged =
			JSON.stringify(synced.feeDefinitions) !==
			JSON.stringify(form.financialConfig.feeDefinitions);
		if (schedulesChanged) {
			update('financialConfig.feeSchedules', synced.schedules);
		}
		if (defsChanged) {
			update('financialConfig.feeDefinitions', synced.feeDefinitions);
		}
	}, [
		form.financialConfig.feeSchedules,
		form.financialConfig.feeDefinitions,
		form.academicConfig.classLevels,
		update,
	]);

	return (
		<div className="space-y-4">
			{/* ── Step Tabs ── */}
			<div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
				{STEPS.map((s, i) => {
					const Icon = s.icon;
					const isActive = i === step;
					const isDone = i < step;
					return (
						<button key={s.label} onClick={() => navigateStep(i)}
							className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
								isActive ? 'bg-[#465fff] text-white shadow-sm'
								: isDone ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
								: 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-muted dark:text-gray-400 dark:hover:bg-gray-700'
							}`}>
							{isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
							<span className="hidden min-[480px]:inline">{s.label}</span>
						</button>
					);
				})}
			</div>

		{/* ── Form Card ── */}
		<div className="rounded-xl border border-gray-200 bg-card p-3 sm:p-5 dark:border-gray-800 min-h-[400px]">
			<h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4 sm:mb-5">{STEPS[step].label}</h3>

				{/* ═══ Step 0: School Identity ═══ */}
				{step === 0 && (
					<div className="space-y-5">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="sm:col-span-2"><Field label="School Name" required value={form.identity.name} onChange={(v) => update('identity.name', v)} onBlur={() => {
							const words = form.identity.name.trim().split(/\s+/).filter(Boolean);
							if (words.length > 0) {
								const initials = words.map(w => w[0]).join('').toUpperCase();
								if (!form.identity.initials) update('identity.initials', initials);
								if (!form.identity.studentIdPrefix) update('identity.studentIdPrefix', initials);
							}
						}} placeholder="e.g. Upstairs Christian Academy" error={errors['identity.name']} /></div>
							<Field label="Short Name" required value={form.identity.shortName} onChange={(v) => update('identity.shortName', v)} onBlur={() => {
								const slug = form.identity.shortName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
								if (slug && !form.system.host) { update('system.host', `${slug}.schoolmesh.app`); update('system.dbName', `schoolmesh_${slug}`); }
							}} placeholder="e.g. Upstairs" error={errors['identity.shortName']} />
							<Field label="Initials" required value={form.identity.initials} onChange={(v) => update('identity.initials', v)} placeholder="e.g. UCA" error={errors['identity.initials']} />
							<Field label="Student ID Prefix" value={form.identity.studentIdPrefix} onChange={(v) => update('identity.studentIdPrefix', v)} placeholder="e.g. UCA" />
							<Field label="Slogan" value={form.identity.slogan} onChange={(v) => update('identity.slogan', v)} placeholder="e.g. Excellence in Education" />
							<div>
							<label className="block text-[11px] font-medium text-gray-500 mb-1">Year Founded</label>
							<input value={String(form.identity.yearFounded)} onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 4); update('identity.yearFounded', raw); }} placeholder="e.g. 2011" maxLength={4}
								className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
						</div>
						<YearRangeInput label="First Academic Year" value={form.identity.firstAcademicYear} onChange={(v) => { update('identity.firstAcademicYear', v); if (/^\d{4}-\d{4}$/.test(v) && !form.identity.currentAcademicYear) update('identity.currentAcademicYear', v); }} />
						<YearRangeInput label="Current Academic Year" value={form.identity.currentAcademicYear} onChange={(v) => { update('identity.currentAcademicYear', v); if (/^\d{4}-\d{4}$/.test(v) && form.identity.firstAcademicYear) { const years = getAcademicYearRange(form.identity.firstAcademicYear, v); update('userConfig.studentSettings', buildDefaultStudentSettings(years)); update('userConfig.teacherSettings', buildDefaultTeacherSettings(years)); } }} />
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System</h4>
							<div className="grid gap-3 sm:grid-cols-2">
							<div className="sm:col-span-2"><Field label="Host" required value={form.system.host} onChange={(v) => { const cleaned = v.toLowerCase().replace(/[^a-z0-9.-]/g, '').replace(/^[.-]+/, ''); update('system.host', cleaned); }} placeholder="e.g. ucaliberia.vercel.app" error={errors['system.host']} /></div>
							<div className="sm:col-span-2">
								<div className="flex items-end gap-3">
									<div className="flex-1 min-w-0">
										<Field label="Database Name" required value={form.system.dbName} onChange={(v) => update('system.dbName', v)} placeholder="e.g. schoolmesh_uca" disabled={form.system.matchHost} error={errors['system.dbName']} />
										</div>
										<CompactToggle label="Match Host" checked={form.system.matchHost} onChange={(newMatch) => {
											update('system.matchHost', newMatch);
											if (newMatch) update('system.dbName', form.system.host.replace(/[.-]/g, '_'));
										}} />
									</div>
								</div>
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Branding</h4>
							<div className="grid gap-3 sm:grid-cols-2">
								<Field label="Logo URL" value={form.branding.logoUrl} onChange={(v) => update('branding.logoUrl', v)} placeholder="https://..." />
								<Field label="Secondary Logo URL" value={form.branding.logoUrl2} onChange={(v) => update('branding.logoUrl2', v)} placeholder="https://..." />
								<div>
									<label className="text-[11px] font-medium text-gray-500">Theme</label>
									<select value={form.branding.themeName} onChange={(e) => update('branding.themeName', e.target.value)}
										className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
										{THEME_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
									</select>
								</div>
								{form.branding.logoUrl && (
									<div>
										<label className="text-[11px] font-medium text-gray-500">Preview</label>
										<div className="mt-1 flex items-center gap-2">
											<img src={form.branding.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-contain border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
											{form.branding.logoUrl2 && <img src={form.branding.logoUrl2} alt="Logo 2" className="h-10 w-10 rounded-lg object-contain border border-gray-200" onError={(e) => (e.currentTarget.style.display = 'none')} />}
										</div>
									</div>
								)}
							</div>
						</div>

					</div>
				)}

				{/* ═══ Step 1: Contact & Admin ═══ */}
				{step === 1 && (
					<div className="space-y-5">
						<div>
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h4>
							<div className="space-y-4">
								<div>
									<p className="text-[11px] font-medium text-gray-500 mb-1.5">Addresses</p>
									{form.contact.addresses.map((line, i) => (
										<div key={i} className="flex items-center gap-1.5 mb-1.5">
											<AddressInput value={line} onChange={(v) => {
												const next = [...form.contact.addresses];
												next[i] = v;
												update('contact.addresses', next);
											}} />
											<RemoveRow onClick={() => update('contact.addresses', form.contact.addresses.filter((_, j) => j !== i))} />
										</div>
									))}
									<AddButton label="Address" onClick={() => update('contact.addresses', [...form.contact.addresses, ''])} />
								</div>
							<div><p className="text-[11px] font-medium text-gray-500 mb-1.5">Phone Numbers</p><DynamicList values={form.contact.phones} onChange={(v) => update('contact.phones', v)} placeholder="+231 ..." inputType="tel" itemErrors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('contact.phones.')).map(([k, v]) => [Number(k.split('.')[2]), v]))} /></div>
							<div><p className="text-[11px] font-medium text-gray-500 mb-1.5">Emails</p><DynamicList values={form.contact.emails} onChange={(v) => update('contact.emails', v)} placeholder="email@..." inputType="email" itemErrors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('contact.emails.')).map(([k, v]) => [Number(k.split('.')[2]), v]))} /></div>
								<Field label="Website" value={form.contact.website} onChange={(v) => update('contact.website', v)} placeholder="https://..." />
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System Admin</h4>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="sm:col-span-2"><Field label="Admin Name" required value={form.userConfig.sysAdmin.name} onChange={(v) => update('userConfig.sysAdmin.name', v)} placeholder="Full name" error={errors['userConfig.sysAdmin.name']} /></div>
								<Field label="Phone" required value={form.userConfig.sysAdmin.phone} onChange={(v) => update('userConfig.sysAdmin.phone', v)} placeholder="+231 ..." inputType="tel" error={errors['userConfig.sysAdmin.phone']} />
								<Field label="Email" value={form.userConfig.sysAdmin.email} onChange={(v) => update('userConfig.sysAdmin.email', v)} placeholder="email@..." inputType="email" error={errors['userConfig.sysAdmin.email']} />
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Administrative Positions</h4>
							<div className="space-y-1.5">
								{form.userConfig.administrativePositions.map((pos, i) => (
									<div key={i} className="flex items-center gap-2">
										<input value={pos.name} onChange={(e) => {
											const next = [...form.userConfig.administrativePositions];
											const newName = e.target.value;
											next[i] = { ...next[i], name: newName, id: newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') };
											update('userConfig.administrativePositions', next);
										}}
											placeholder="Position name (e.g. Business Manager)" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
										<span className="text-[10px] text-gray-400 font-mono whitespace-nowrap hidden sm:inline">ID: {pos.id || '—'}</span>
										<RemoveRow onClick={() => update('userConfig.administrativePositions', form.userConfig.administrativePositions.filter((_, j) => j !== i))} />
									</div>
								))}
							</div>
							<AddButton label="Position" onClick={() => update('userConfig.administrativePositions', [...form.userConfig.administrativePositions, { id: '', name: '' }])} />
						</div>
					</div>
				)}

				{/* ═══ Step 2: Academic ═══ */}
				{step === 2 && (
					<div className="space-y-5">
						<div>
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Class Levels</h4>
						<ClassLevelsEditor classLevels={form.academicConfig.classLevels} onChange={(v) => {
							update('academicConfig.classLevels', v);
						}} onUseDefaults={() => {
							update('academicConfig.classLevels', DEFAULT_CLASS_LEVELS);
						}} />
						{errors['academicConfig.classLevels'] && <p className="text-[11px] text-red-500">{errors['academicConfig.classLevels']}</p>}
						</div>
						{(() => {
							const allLevels = new Set<string>();
							for (const session of Object.values(form.academicConfig.classLevels)) {
								for (const level of Object.keys(session)) allLevels.add(level);
							}
							const levels = Array.from(allLevels);
							if (levels.length === 0) return null;
							return (
								<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
									<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Report Card Themes by Class Level</h4>
									<div className="space-y-1.5">
										{levels.map((level) => (
											<div key={level} className="flex items-center gap-2">
												<span className="text-xs text-gray-600 dark:text-gray-400 min-w-0 flex-1 sm:flex-none sm:w-40 truncate">{level}</span>
												<select value={form.branding.reportCardThemes[level] || ''} onChange={(e) => update('branding.reportCardThemes', { ...form.branding.reportCardThemes, [level]: e.target.value })}
													className="flex-1 sm:flex-none rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
													<option value="">— Default —</option>
													{REPORT_CARD_THEMES.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
												</select>
											</div>
										))}
									</div>
								</div>
							);
						})()}
					</div>
				)}

				{/* ═══ Step 3: Grading ═══ */}
				{step === 3 && (
					<div className="space-y-5">
						<div>
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Grading Settings</h4>
							<div className="grid gap-3 sm:grid-cols-2">
								<Field label="Pass Mark (%)" value={String(form.academicConfig.gradingSettings.passMark)} onChange={(v) => update('academicConfig.gradingSettings.passMark', Number(v) || 0)} placeholder="70" inputType="number" />
								<div>
									<label className="text-[11px] font-medium text-gray-500">Grade Scale</label>
									<div className="flex items-center gap-1.5 mt-1">
										<input type="number" inputMode="numeric" value={form.academicConfig.gradingSettings.gradeScale.min} onChange={(e) => update('academicConfig.gradingSettings.gradeScale.min', Number(e.target.value) || 60)}
											className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="60" />
										<span className="text-gray-400 text-xs shrink-0">to</span>
										<input type="number" inputMode="numeric" value={form.academicConfig.gradingSettings.gradeScale.max} onChange={(e) => update('academicConfig.gradingSettings.gradeScale.max', Number(e.target.value) || 100)}
											className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="100" />
									</div>
								</div>
							</div>
							<div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-lg">
								<div className="px-3"><ToggleRow label="Has summer school" checked={form.academicConfig.gradingSettings.hasSummerSchool} onChange={(v) => update('academicConfig.gradingSettings.hasSummerSchool', v)} /></div>
								<div className="px-3"><ToggleRow label="Allow double promotion" checked={form.academicConfig.gradingSettings.givesDoublePromotion} onChange={(v) => update('academicConfig.gradingSettings.givesDoublePromotion', v)} /></div>
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
							<AcademicPermissionsEditor
								studentSettings={form.userConfig.studentSettings}
								teacherSettings={form.userConfig.teacherSettings}
								firstYear={form.identity.firstAcademicYear}
								currentYear={form.identity.currentAcademicYear}
								onChange={(student, teacher) => {
									update('userConfig.studentSettings', student);
									update('userConfig.teacherSettings', teacher);
								}}
							/>
						</div>
					</div>
				)}

				{/* ═══ Step 4: Features & Access ═══ */}
				{step === 4 && (
					<div className="space-y-5">
						<div>
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Enabled Features</h4>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{FEATURE_KEYS.map((key) => {
									const enabled = form.featureConfig.enabledFeatures.includes(key);
									return (
										<label key={key} onClick={() => update('featureConfig.enabledFeatures', enabled ? form.featureConfig.enabledFeatures.filter((f) => f !== key) : [...form.featureConfig.enabledFeatures, key])}
											className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors ${enabled ? 'border-[#465fff]/30 bg-[#465fff]/5' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-card'}`}>
											<div className={`h-3.5 w-3.5 rounded border-[1.5px] flex items-center justify-center transition-colors shrink-0 ${enabled ? 'border-[#465fff] bg-[#465fff]' : 'border-gray-300 dark:border-gray-600'}`}>
												{enabled && <Check className="h-2.5 w-2.5 text-white" />}
											</div>
											<span className="text-xs capitalize truncate">{key.replace(/_/g, ' ')}</span>
										</label>
									);
								})}
							</div>
						</div>
						<div className="border-t border-gray-100 dark:border-gray-800 pt-4">
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Role Feature Access</h4>
							{(['student', 'teacher', 'system_admin'] as const).map((role) => (
								<div key={role} className="mb-3">
									<h5 className="text-[11px] font-medium text-gray-500 mb-1.5 capitalize">{role.replace('_', ' ')}</h5>
									<div className="flex flex-wrap gap-1">
										{form.featureConfig.enabledFeatures.map((key) => {
											const selected = form.featureConfig.roleFeatureAccess[role]?.includes(key);
											return (
												<button key={key} onClick={() => {
													const current = form.featureConfig.roleFeatureAccess[role] || [];
													update('featureConfig.roleFeatureAccess', { ...form.featureConfig.roleFeatureAccess, [role]: selected ? current.filter((f) => f !== key) : [...current, key] });
												}} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${selected ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-gray-400'}`}>
													{key.replace(/_/g, ' ')}
												</button>
											);
										})}
									</div>
								</div>
							))}
							<div className="mb-3">
								<h5 className="text-[11px] font-medium text-gray-500 mb-1.5 capitalize">Parent</h5>
								{form.featureConfig.roleFeatureAccess.student.length > 0 ? (
									<div className="flex flex-wrap gap-1">
										{form.featureConfig.roleFeatureAccess.student.map((key) => {
											const selected = form.featureConfig.roleFeatureAccess.parent?.includes(key);
											return (
												<button key={key} onClick={() => {
													const current = form.featureConfig.roleFeatureAccess.parent || [];
													update('featureConfig.roleFeatureAccess', { ...form.featureConfig.roleFeatureAccess, parent: selected ? current.filter((f) => f !== key) : [...current, key] });
												}} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${selected ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-gray-400'}`}>
													{key.replace(/_/g, ' ')}
												</button>
											);
										})}
									</div>
								) : (
									<p className="text-[11px] text-gray-400">Enable features for Students to configure parent access.</p>
								)}
							</div>
						</div>
					</div>
				)}

			{/* ═══ Step 5: Financial ═══ */}
			{step === 5 && (
				<div className="space-y-0">
					{/* ── Currencies ── */}
					<div className="border-b border-gray-100 dark:border-gray-800">
						<button type="button" onClick={() => setExpandedFinancialSections((prev) => { const next = new Set(prev); next.has('currencies') ? next.delete('currencies') : next.add('currencies'); return next; })} className="w-full flex items-center gap-2 py-3 text-left">
							{expandedFinancialSections.has('currencies') ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Currencies</h4>
							{!expandedFinancialSections.has('currencies') && <span className="text-[10px] text-gray-400 font-mono">{form.financialConfig.currencies.length}</span>}
						</button>
						{expandedFinancialSections.has('currencies') && (
							<div className="pb-4 space-y-1.5 pl-5">
								{form.financialConfig.currencies.map((cur, i) => (
									<div key={i} className="flex items-center gap-1.5">
										<input value={cur.code} onChange={(e) => { const next = [...form.financialConfig.currencies]; next[i] = { ...next[i], code: e.target.value }; update('financialConfig.currencies', next); }}
											placeholder="Code" className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
										<input value={cur.label} onChange={(e) => { const next = [...form.financialConfig.currencies]; next[i] = { ...next[i], label: e.target.value }; update('financialConfig.currencies', next); }}
											placeholder="Label" className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
										<input value={cur.symbol} onChange={(e) => { const next = [...form.financialConfig.currencies]; next[i] = { ...next[i], symbol: e.target.value }; update('financialConfig.currencies', next); }}
											placeholder="$" className="w-12 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
										<CompactToggle label="Default" checked={cur.isDefault} onChange={(checked) => {
											const next = form.financialConfig.currencies.map((c, j) => ({ ...c, isDefault: j === i ? checked : false }));
											update('financialConfig.currencies', next);
										}} />
										<RemoveRow onClick={() => update('financialConfig.currencies', form.financialConfig.currencies.filter((_, j) => j !== i))} />
									</div>
								))}
								<AddButton label="Currency" onClick={() => update('financialConfig.currencies', [...form.financialConfig.currencies, { code: '', label: '', symbol: '', isDefault: form.financialConfig.currencies.length === 0 }])} />
							</div>
						)}
					</div>

					{/* ── Payment Categories ── */}
					<div className="border-b border-gray-100 dark:border-gray-800">
						<button type="button" onClick={() => setExpandedFinancialSections((prev) => { const next = new Set(prev); next.has('paymentCategories') ? next.delete('paymentCategories') : next.add('paymentCategories'); return next; })} className="w-full flex items-center gap-2 py-3 text-left">
							{expandedFinancialSections.has('paymentCategories') ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Payment Categories</h4>
							{!expandedFinancialSections.has('paymentCategories') && <span className="text-[10px] text-gray-400 font-mono">{form.financialConfig.paymentCategories.length}</span>}
						</button>
						{expandedFinancialSections.has('paymentCategories') && (
							<div className="pb-4 space-y-1.5 pl-5">
								{form.financialConfig.paymentCategories.map((cat, i) => (
									<div key={i} className="flex items-center gap-2">
										<input value={cat.name} onChange={(e) => {
											const newName = e.target.value;
											const newId = newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
											const next = [...form.financialConfig.paymentCategories];
											next[i] = { id: newId, name: newName };
											update('financialConfig.paymentCategories', next);
										}} placeholder="Category name" className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
										<span className="text-[10px] text-gray-400 font-mono whitespace-nowrap hidden sm:inline">{cat.id || '—'}</span>
										<RemoveRow onClick={() => update('financialConfig.paymentCategories', form.financialConfig.paymentCategories.filter((_, j) => j !== i))} />
									</div>
								))}
								<AddButton label="Category" onClick={() => update('financialConfig.paymentCategories', [...form.financialConfig.paymentCategories, { id: '', name: '' }])} />
							</div>
						)}
					</div>

					{/* ── Fee Definitions ── */}
					<div className="border-b border-gray-100 dark:border-gray-800">
						<button type="button" onClick={() => setExpandedFinancialSections((prev) => { const next = new Set(prev); next.has('feeDefinitions') ? next.delete('feeDefinitions') : next.add('feeDefinitions'); return next; })} className="w-full flex items-center gap-2 py-3 text-left">
							{expandedFinancialSections.has('feeDefinitions') ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Fee Definitions</h4>
							{!expandedFinancialSections.has('feeDefinitions') && <span className="text-[10px] text-gray-400 font-mono">{form.financialConfig.feeDefinitions.length}</span>}
						</button>
						{expandedFinancialSections.has('feeDefinitions') && (
							<div className="pb-4 pl-5 space-y-2">
								{form.financialConfig.feeDefinitions.map((fd, i) => {
									const fdExpanded = expandedFeeDefs.has(i);
									return (
										<div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
											<div className="flex items-center gap-2 px-2.5 py-2 cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-muted/30 transition-colors" onClick={() => setExpandedFeeDefs((prev) => { const next = new Set(prev); fdExpanded ? next.delete(i) : next.add(i); return next; })}>
												{fdExpanded ? <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />}
												<span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{fd.name || <span className="italic text-gray-400">Unnamed fee</span>}</span>
												<span className="text-[10px] text-gray-400 font-mono hidden sm:inline">{fd.category || '—'}</span>
												<CompactToggle label="" checked={fd.isActive} onChange={(checked) => { const next = [...form.financialConfig.feeDefinitions]; next[i] = { ...next[i], isActive: checked }; update('financialConfig.feeDefinitions', next); }} />
												<button onClick={(e) => { e.stopPropagation(); update('financialConfig.feeDefinitions', form.financialConfig.feeDefinitions.filter((_, j) => j !== i)); }} className="text-red-400 hover:text-red-500 text-[11px] font-medium">Remove</button>
											</div>
											{fdExpanded && (
												<div className="px-2.5 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-2.5">
													<div className="grid gap-2 sm:grid-cols-3">
														<input value={fd.name} onChange={(e) => { const next = [...form.financialConfig.feeDefinitions]; next[i] = { ...next[i], name: e.target.value }; update('financialConfig.feeDefinitions', next); }}
															placeholder="Fee name" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
														<select value={fd.category} onChange={(e) => { const next = [...form.financialConfig.feeDefinitions]; next[i] = { ...next[i], category: e.target.value }; update('financialConfig.feeDefinitions', next); }}
															className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
															<option value="">— Select —</option>
															{form.financialConfig.paymentCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
														</select>
														<input value={fd.description} onChange={(e) => { const next = [...form.financialConfig.feeDefinitions]; next[i] = { ...next[i], description: e.target.value }; update('financialConfig.feeDefinitions', next); }}
															placeholder="Description" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
													</div>
												</div>
											)}
										</div>
									);
								})}
								<AddButton label="Fee Definition" onClick={() => update('financialConfig.feeDefinitions', [...form.financialConfig.feeDefinitions, { id: `fee-${Date.now()}`, name: '', category: form.financialConfig.paymentCategories[0]?.id || '', description: '', isActive: true }])} />
							</div>
						)}
					</div>

					{/* ── Installments ── */}
					<div className="border-b border-gray-100 dark:border-gray-800">
						<button type="button" onClick={() => setExpandedFinancialSections((prev) => { const next = new Set(prev); next.has('installments') ? next.delete('installments') : next.add('installments'); return next; })} className="w-full flex items-center gap-2 py-3 text-left">
							{expandedFinancialSections.has('installments') ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Installments</h4>
							{!expandedFinancialSections.has('installments') && <span className="text-[10px] text-gray-400 font-mono">{form.financialConfig.installments.length}</span>}
						</button>
						{expandedFinancialSections.has('installments') && (
							<div className="pb-4 pl-5 space-y-2">
								<p className="text-[10px] text-gray-400">School-wide installment catalog. Fees split across installments reference these by id.</p>
								{form.financialConfig.installments.map((inst, i) => (
									<div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
										<div className="grid gap-2 sm:grid-cols-3">
											<input value={inst.id} onChange={(e) => { const next = [...form.financialConfig.installments]; next[i] = { ...next[i], id: e.target.value }; update('financialConfig.installments', next); }}
												placeholder="ID (e.g. inst-1st)" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<input value={inst.label} onChange={(e) => { const next = [...form.financialConfig.installments]; next[i] = { ...next[i], label: e.target.value }; update('financialConfig.installments', next); }}
												placeholder="Label" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<input value={inst.dueWindow} onChange={(e) => { const next = [...form.financialConfig.installments]; next[i] = { ...next[i], dueWindow: e.target.value }; update('financialConfig.installments', next); }}
												placeholder="Due (optional)" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
										</div>
										<div className="mt-2 flex justify-end">
											<RemoveRow onClick={() => update('financialConfig.installments', form.financialConfig.installments.filter((_, j) => j !== i))} />
										</div>
									</div>
								))}
								<AddButton label="Installment" onClick={() => update('financialConfig.installments', [...form.financialConfig.installments, { id: `inst-${Date.now()}`, label: '', dueWindow: '' }])} />
							</div>
						)}
					</div>

					{/* ── Student Groups ── */}
					<div className="border-b border-gray-100 dark:border-gray-800">
						<button type="button" onClick={() => setExpandedFinancialSections((prev) => { const next = new Set(prev); next.has('studentGroups') ? next.delete('studentGroups') : next.add('studentGroups'); return next; })} className="w-full flex items-center gap-2 py-3 text-left">
							{expandedFinancialSections.has('studentGroups') ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Student Groups</h4>
							{!expandedFinancialSections.has('studentGroups') && <span className="text-[10px] text-gray-400 font-mono">{form.financialConfig.studentGroups.length}</span>}
						</button>
						{expandedFinancialSections.has('studentGroups') && (
							<div className="pb-4 pl-5 space-y-2">
								{form.financialConfig.studentGroups.map((sg, i) => (
									<div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
										<div className="grid gap-2 sm:grid-cols-4 mb-2">
											<input value={sg.name} onChange={(e) => { const next = [...form.financialConfig.studentGroups]; next[i] = { ...next[i], name: e.target.value }; update('financialConfig.studentGroups', next); }}
												placeholder="Group name" className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<input type="number" inputMode="numeric" value={sg.priority} onChange={(e) => { const next = [...form.financialConfig.studentGroups]; next[i] = { ...next[i], priority: Number(e.target.value) || 0 }; update('financialConfig.studentGroups', next); }}
												placeholder="Priority" className="w-16 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<div className="flex items-center gap-2 sm:col-span-2">
												<CompactToggle label="Active" checked={sg.isActive} onChange={(checked) => { const next = [...form.financialConfig.studentGroups]; next[i] = { ...next[i], isActive: checked }; update('financialConfig.studentGroups', next); }} />
												<div className="ml-auto"><RemoveRow onClick={() => update('financialConfig.studentGroups', form.financialConfig.studentGroups.filter((_, j) => j !== i))} /></div>
											</div>
										</div>
										<div className="space-y-1">
											<p className="text-[10px] font-medium text-gray-400 uppercase">Conditions</p>
											{sg.conditions.map((cond, ci) => (
												<div key={ci} className="flex items-center gap-1">
													<input value={cond.field} onChange={(e) => { const next = [...form.financialConfig.studentGroups]; const sg2 = { ...next[i] }; const conds = [...sg2.conditions]; conds[ci] = { ...conds[ci], field: e.target.value }; sg2.conditions = conds; next[i] = sg2; update('financialConfig.studentGroups', next); }}
														placeholder="Field" className="flex-1 min-w-0 rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
													<select value={cond.operator} onChange={(e) => { const next = [...form.financialConfig.studentGroups]; const sg2 = { ...next[i] }; const conds = [...sg2.conditions]; conds[ci] = { ...conds[ci], operator: e.target.value }; sg2.conditions = conds; next[i] = sg2; update('financialConfig.studentGroups', next); }}
														className="w-24 rounded border border-gray-200 bg-white px-1 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
														{['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'in', 'notIn'].map((op) => <option key={op} value={op}>{op}</option>)}
													</select>
													<input value={cond.value} onChange={(e) => { const next = [...form.financialConfig.studentGroups]; const sg2 = { ...next[i] }; const conds = [...sg2.conditions]; conds[ci] = { ...conds[ci], value: e.target.value }; sg2.conditions = conds; next[i] = sg2; update('financialConfig.studentGroups', next); }}
														placeholder="Value" className="flex-1 min-w-0 rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
													<button onClick={() => { const next = [...form.financialConfig.studentGroups]; const sg2 = { ...next[i] }; sg2.conditions = sg2.conditions.filter((__, j) => j !== ci); next[i] = sg2; update('financialConfig.studentGroups', next); }} className="text-gray-400 hover:text-red-500 text-[10px] p-0.5">✕</button>
												</div>
											))}
											<button onClick={() => { const next = [...form.financialConfig.studentGroups]; const sg2 = { ...next[i] }; sg2.conditions = [...sg2.conditions, { field: '', operator: 'equals', value: '' }]; next[i] = sg2; update('financialConfig.studentGroups', next); }} className="text-[11px] text-[#465fff] font-medium">+ Condition</button>
										</div>
									</div>
								))}
								<AddButton label="Student Group" onClick={() => update('financialConfig.studentGroups', [...form.financialConfig.studentGroups, { id: `group-${Date.now()}`, name: '', priority: 0, isActive: true, conditions: [] }])} />
							</div>
						)}
					</div>

					{/* ── Fee Schedules ── */}
					<div className="border-b border-gray-100 dark:border-gray-800">
						<button type="button" onClick={() => setExpandedFinancialSections((prev) => { const next = new Set(prev); next.has('feeSchedules') ? next.delete('feeSchedules') : next.add('feeSchedules'); return next; })} className="w-full flex items-center gap-2 py-3 text-left">
							{expandedFinancialSections.has('feeSchedules') ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
							<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">Fee Schedules</h4>
							{!expandedFinancialSections.has('feeSchedules') && <span className="text-[10px] text-gray-400 font-mono">{form.financialConfig.feeSchedules.length} yr{form.financialConfig.feeSchedules.length !== 1 ? 's' : ''}</span>}
						</button>
						{expandedFinancialSections.has('feeSchedules') && (
							<div className="pb-4 pl-5">
						{form.financialConfig.feeSchedules.length === 0 ? (
							<div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
								<DollarSignIcon className="h-6 w-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
								<p className="text-xs text-gray-500">No fee schedules configured yet.</p>
							</div>
						) : (
							<div className="space-y-4">
								{form.financialConfig.feeSchedules.map((fs: any, i: number) => {
									const defaultCurrency = form.financialConfig.currencies.find((c) => c.isDefault)?.code || form.financialConfig.currencies[0]?.code || '';
									return (
										<div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
											<div className="flex items-center justify-between mb-3">
												<span className="text-sm font-semibold text-gray-900 dark:text-white">{fs.academicYear || 'Untitled Year'}</span>
												<button onClick={() => update('financialConfig.feeSchedules', form.financialConfig.feeSchedules.filter((__, j) => j !== i))} className="text-[11px] text-red-400 hover:text-red-500">Remove</button>
											</div>

											{/* ── Sessions ── */}
											<div className="space-y-3">
												{(fs.sessionFeeSchedules || []).map((sess: any, si: number) => {
													const sessionClasses: { classId: string; name: string }[] = [];
													const sessionData = form.academicConfig.classLevels[sess.sessionName];
													if (sessionData) {
														for (const [, level] of Object.entries(sessionData)) {
															for (const cls of (level as any).classes || []) sessionClasses.push({ classId: cls.classId, name: cls.name });
														}
													}
													return (
														<div key={si} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
															<div className="flex items-center gap-2 mb-2.5">
																<span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{sess.sessionName || 'Unnamed Session'}</span>
																<span className="text-[10px] text-gray-400">{sessionClasses.length} classes</span>
															</div>

															{/* ── Fee Groups ── */}
															<div className="space-y-2.5 ml-0 sm:ml-2">
																{(sess.feeGroups || []).map((fg: any, fi: number) => {
																	const fgKey = `${i}-${si}-${fi}`;
																	const isExpanded = expandedFeeGroups.has(fgKey);
																	const allClassIds = sessionClasses.map((c) => c.classId);
																	const allSelected = allClassIds.length > 0 && allClassIds.every((id) => (fg.appliesToClassIds || []).includes(id));
																	return (
																		<div key={fi} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-muted/30 overflow-hidden">
																			{/* Fee Group Accordion Header */}
																			<div className="flex items-center gap-2 px-2.5 py-2 cursor-pointer select-none hover:bg-gray-100/50 dark:hover:bg-muted/50 transition-colors" onClick={() => setExpandedFeeGroups((prev) => { const next = new Set(prev); if (next.has(fgKey)) next.delete(fgKey); else next.add(fgKey); return next; })}>
																				{isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
																				{/* On small screens: display name as text; on sm+: editable input */}
																				<span className="flex-1 min-w-0 text-xs text-gray-700 dark:text-gray-300 truncate sm:hidden">{fg.name || <span className="italic text-gray-400">Untitled group</span>}</span>
																				<input value={fg.name || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => {
																					const next = [...form.financialConfig.feeSchedules];
																					const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																					const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																					fgList[fi] = { ...fgList[fi], name: e.target.value };
																					sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																					update('financialConfig.feeSchedules', next);
																				}} placeholder="Group name" className="hidden sm:block flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
																				<button onClick={(e) => { e.stopPropagation(); const next = [...form.financialConfig.feeSchedules]; const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])]; const sg = { ...sessList[si] }; sg.feeGroups = (sg.feeGroups || []).filter((__: any, j: number) => j !== fi); sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s; update('financialConfig.feeSchedules', next); }} className="text-red-400 hover:text-red-500 text-[11px] font-medium sm:justify-self-end">Remove</button>
																			</div>

																			{/* Fee Group Body (collapsed by default) */}
																			{isExpanded && (
																				<div className="px-2.5 pb-2.5 space-y-2.5 border-t border-gray-200 dark:border-gray-800 pt-2.5">
																					{/* Group Name (editable on small screens where header shows text only) */}
																					<div className="sm:hidden">
																						<label className="text-[10px] font-medium text-gray-400 uppercase mb-1 block">Group Name</label>
																						<input value={fg.name || ''} onChange={(e) => {
																							const next = [...form.financialConfig.feeSchedules];
																							const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																							const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																							fgList[fi] = { ...fgList[fi], name: e.target.value };
																							sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																							update('financialConfig.feeSchedules', next);
																						}} placeholder="Group name (e.g. All Classes, Grade 7-9)" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
																					</div>

																					{/* Applies To Classes */}
																					<div>
																						<div className="flex items-center gap-2 mb-1.5">
																							<span className="text-[10px] font-medium text-gray-400 uppercase">Applies to</span>
																							{sessionClasses.length > 0 && (
																								<div className="flex items-center gap-1.5">
																									<button onClick={() => {
																										const next = [...form.financialConfig.feeSchedules];
																										const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																										const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																										fgList[fi] = { ...fgList[fi], appliesToClassIds: [...allClassIds] };
																										sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																										update('financialConfig.feeSchedules', next);
																									}} className={`text-[10px] font-medium transition-colors ${allSelected ? 'text-gray-400' : 'text-[#465fff] hover:text-[#3a4fe6]'}`}>Select All</button>
																									<span className="text-gray-300 dark:text-gray-600 text-[10px]">|</span>
																									<button onClick={() => {
																										const next = [...form.financialConfig.feeSchedules];
																										const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																										const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																										fgList[fi] = { ...fgList[fi], appliesToClassIds: [] };
																										sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																										update('financialConfig.feeSchedules', next);
																									}} className={`text-[10px] font-medium transition-colors ${!allSelected && (fg.appliesToClassIds || []).length === 0 ? 'text-gray-400' : 'text-[#465fff] hover:text-[#3a4fe6]'}`}>Unselect All</button>
																								</div>
																							)}
																						</div>
																						<div className="flex flex-wrap gap-1.5">
																							{sessionClasses.map((c) => {
																								const checked = (fg.appliesToClassIds || []).includes(c.classId);
																								return (
																									<label key={c.classId} className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
																										<input type="checkbox" checked={checked} onChange={() => {
																											const next = [...form.financialConfig.feeSchedules];
																											const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																											const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																											const currentIds = fgList[fi].appliesToClassIds || [];
																											fgList[fi] = { ...fgList[fi], appliesToClassIds: checked ? currentIds.filter((id: string) => id !== c.classId) : [...currentIds, c.classId] };
																											sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																											update('financialConfig.feeSchedules', next);
																										}} className="rounded" />
																										{c.name}
																									</label>
																								);
																							})}
																							{sessionClasses.length === 0 && <span className="text-[11px] text-gray-400 italic">No classes defined for this session</span>}
																						</div>
																					</div>

																					{/* Scheduled Fees */}
																					<div className="space-y-2">
																						{(fg.scheduledFees || []).map((sf: any, sfi: number) => {
																							const updateFee = (patch: any) => {
																								const next = [...form.financialConfig.feeSchedules];
																								const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																								const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																								const sfList = [...(fgList[fi].scheduledFees || [])];
																								sfList[sfi] = { ...sfList[sfi], ...patch };
																								fgList[fi] = { ...fgList[fi], scheduledFees: sfList };
																								sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																								update('financialConfig.feeSchedules', next);
																							};
																							return (
																								<div key={sfi} className="rounded-lg border border-gray-100 dark:border-gray-800 p-2">
																									<div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_auto] items-center">
																										<select value={sf.feeId || ''} onChange={(e) => updateFee({ feeId: e.target.value })}
																											className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																											<option value="">Select Fee</option>
																											{form.financialConfig.feeDefinitions.filter((f) => f.isActive).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
																										</select>
																										<div className="flex items-center gap-1.5 flex-wrap">
																											<select value={sf.amount?.currency || defaultCurrency} onChange={(e) => updateFee({ amount: { ...(sf.amount || {}), currency: e.target.value } })}
																												className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																												{form.financialConfig.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
																											</select>
																											<CurrencyInput value={sf.amount?.amount || 0} onChange={(num) => updateFee({ amount: { amount: num, currency: sf.amount?.currency || defaultCurrency } })} />
																											<label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
																												<input type="checkbox" checked={sf.isRequired !== false} onChange={(e) => updateFee({ isRequired: e.target.checked })} className="rounded" />
																												Required
																											</label>
																											<button onClick={() => {
																												const next = [...form.financialConfig.feeSchedules];
																												const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																												const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																												fgList[fi] = { ...fgList[fi], scheduledFees: (fgList[fi].scheduledFees || []).filter((__: any, j: number) => j !== sfi) };
																												sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																												update('financialConfig.feeSchedules', next);
																											}} className="text-red-400 hover:text-red-500 text-[11px] font-medium">Remove</button>
																										</div>
																									</div>
																									{/* Applicable Student Groups */}
																									{form.financialConfig.studentGroups.filter((g) => g.isActive).length > 0 && (
																										<div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
																											{form.financialConfig.studentGroups.filter((g) => g.isActive).map((g) => {
																												const checked = (sf.applicableStudentGroupIds || []).includes(g.id);
																												return (
																													<label key={g.id} className="inline-flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
																														<input type="checkbox" checked={checked} onChange={() => {
																															const next = [...form.financialConfig.feeSchedules];
																															const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																															const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																															const sfList = [...(fgList[fi].scheduledFees || [])];
																															const currentIds = sfList[sfi].applicableStudentGroupIds || [];
																															sfList[sfi] = { ...sfList[sfi], applicableStudentGroupIds: checked ? currentIds.filter((id: string) => id !== g.id) : [...currentIds, g.id] };
																															fgList[fi] = { ...fgList[fi], scheduledFees: sfList };
																															sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																															update('financialConfig.feeSchedules', next);
																														}} className="rounded" />
																														{g.name}
																													</label>
																												);
																											})}
																										</div>
																									)}

																									{/* Installment Split */}
																									<div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800 space-y-1">
																										<div className="flex items-center gap-2">
																											<span className="text-[10px] font-medium text-gray-400 uppercase">Installment Split</span>
																											{(sf.installments || []).length > 0 && (
																												<button onClick={() => updateFee({ installments: [] })} className="text-[10px] text-gray-400 hover:text-red-500 ml-auto">Clear</button>
																											)}
																										</div>
																										{(sf.installments || []).map((entry: any, ei: number) => {
																											const isPct = entry.percentage !== undefined;
																											const setEntry = (patch: any) => {
																												const entries = [...(sf.installments || [])];
																												entries[ei] = { ...entries[ei], ...patch };
																												updateFee({ installments: entries });
																											};
																											return (
																												<div key={ei} className="flex flex-wrap items-center gap-1.5">
																													<select value={entry.installmentId || ''} onChange={(e) => setEntry({ installmentId: e.target.value })}
																														className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																														<option value="">Select installment</option>
																														{form.financialConfig.installments.map((ins) => <option key={ins.id} value={ins.id}>{ins.label || ins.id}</option>)}
																													</select>
																													<select value={isPct ? 'pct' : 'fixed'} onChange={(e) => setEntry(e.target.value === 'pct' ? { percentage: 0, fixedAmount: undefined } : { fixedAmount: 0, percentage: undefined })}
																														className="rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																														<option value="pct">%</option>
																														<option value="fixed">Amount</option>
																													</select>
																													{isPct ? (
																														<input type="number" inputMode="numeric" min={0} max={100} value={Math.round((Number(entry.percentage) || 0) * 100)} onChange={(e) => setEntry({ percentage: (Number(e.target.value) || 0) / 100 })}
																															placeholder="%" className="w-16 rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
																													) : (
																														<CurrencyInput value={Number(entry.fixedAmount) || 0} onChange={(num) => setEntry({ fixedAmount: num })} />
																													)}
																													<button onClick={() => { const entries = [...(sf.installments || [])]; entries.splice(ei, 1); updateFee({ installments: entries }); }} className="text-gray-400 hover:text-red-500 text-[10px] p-0.5">✕</button>
																												</div>
																											);
																										})}
																										<button onClick={() => updateFee({ installments: [...(sf.installments || []), { installmentId: form.financialConfig.installments[0]?.id || '', percentage: 0 }] })} className="text-[11px] text-[#465fff] font-medium">+ Split</button>
																										{(() => {
																											const amount = Number(sf.amount?.amount) || 0;
																											const assigned = (sf.installments || []).reduce((sum: number, en: any) => {
																												if (en.percentage !== undefined) return sum + (Number(en.percentage) || 0) * amount;
																												return sum + (Number(en.fixedAmount) || 0);
																											}, 0);
																											const over = assigned > amount + 0.000001;
																											const pct = amount > 0 ? Math.min(100, (assigned / amount) * 100) : 0;
																											return (
																												<div className="pt-1">
																													<div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
																														<div className={`h-full rounded-full ${over ? 'bg-red-500' : assigned >= amount - 0.000001 ? 'bg-green-500' : 'bg-[#465fff]'}`} style={{ width: `${pct}%` }} />
																													</div>
																													<div className={`mt-1 text-[10px] ${over ? 'text-red-500' : 'text-gray-400'}`}>
																														Assigned {Math.round(assigned)} / {Math.round(amount)} {defaultCurrency} · empty means the full amount is due immediately
																														{over && ' · total exceeds the fee amount'}
																													</div>
																												</div>
																											);
																										})()}
																									</div>
																								</div>
																							);
																						})}
																						<button onClick={() => {
																							const next = [...form.financialConfig.feeSchedules];
																							const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																							const sg = { ...sessList[si] }; const fgList = [...(sg.feeGroups || [])];
																							const sfList = [...(fgList[fi].scheduledFees || [])];
																							sfList.push({ feeId: '', amount: { amount: 0, currency: defaultCurrency }, isRequired: true, installments: [], applicableStudentGroupIds: [] });
																							fgList[fi] = { ...fgList[fi], scheduledFees: sfList };
																							sg.feeGroups = fgList; sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																							update('financialConfig.feeSchedules', next);
																						}} className="text-[11px] text-[#465fff] font-medium">+ Add Fee</button>
																					</div>
																				</div>
																			)}
																		</div>
																	);
																})}
															</div>
															<button onClick={() => {
																const next = [...form.financialConfig.feeSchedules];
																const s = { ...next[i] }; const sessList = [...(s.sessionFeeSchedules || [])];
																const sg = { ...sessList[si] };
																const newIdx = (sg.feeGroups || []).length;
																								sg.feeGroups = [...(sg.feeGroups || []), { id: `fg-${Date.now()}`, name: '', appliesToClassIds: [], scheduledFees: [] }];
																sessList[si] = sg; s.sessionFeeSchedules = sessList; next[i] = s;
																update('financialConfig.feeSchedules', next);
																setExpandedFeeGroups((prev) => { const next = new Set(prev); next.add(`${i}-${si}-${newIdx}`); return next; });
															}} className="text-[11px] text-[#465fff] font-medium mt-2 inline-block">+ Add Fee Group</button>
														</div>
												);
											})}
										</div>

										{/* ── Scholarships ── */}
											<div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
												<h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Scholarships</h5>
												<div className="space-y-2">
													{(fs.scholarships || []).map((sch: any, sci: number) => (
														<div key={sci} className="rounded-lg border border-gray-200 dark:border-gray-800 p-2.5">
															<div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center mb-2">
																<input value={sch.name || ''} onChange={(e) => {
																	const next = [...form.financialConfig.feeSchedules];
																	const s = { ...next[i] };
																	const schs = [...(s.scholarships || [])];
																	schs[sci] = { ...schs[sci], name: e.target.value };
																	s.scholarships = schs; next[i] = s;
																	update('financialConfig.feeSchedules', next);
																}} placeholder="Scholarship name" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
																<div className="flex items-center gap-1.5 flex-wrap">
																	<select value={sch.scholarshipType || 'fixedDeduction'} onChange={(e) => {
																		const next = [...form.financialConfig.feeSchedules];
																		const s = { ...next[i] };
																		const schs = [...(s.scholarships || [])];
																		schs[sci] = { ...schs[sci], scholarshipType: e.target.value };
																		s.scholarships = schs; next[i] = s;
																		update('financialConfig.feeSchedules', next);
																	}} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																		<option value="fixedDeduction">Fixed Deduction</option>
																		<option value="fixedPayment">Fixed Payment</option>
																		<option value="percentage">Percentage</option>
																	</select>
																	<button onClick={() => {
																		const next = [...form.financialConfig.feeSchedules];
																		const s = { ...next[i] };
																		s.scholarships = (s.scholarships || []).filter((__: any, j: number) => j !== sci);
																		next[i] = s;
																		update('financialConfig.feeSchedules', next);
																	}} className="text-red-400 hover:text-red-500 text-[11px] font-medium">Remove</button>
																</div>
															</div>
															<div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
																<div>
																	<label className="text-[10px] font-medium text-gray-400">Amount / Percentage</label>
																	<input type="number" inputMode="numeric" value={sch.amount || ''} onChange={(e) => {
																		const next = [...form.financialConfig.feeSchedules];
																		const s = { ...next[i] };
																		const schs = [...(s.scholarships || [])];
																		schs[sci] = { ...schs[sci], amount: Number(e.target.value) || 0 };
																		s.scholarships = schs; next[i] = s;
																		update('financialConfig.feeSchedules', next);
																	}} placeholder={sch.scholarshipType === 'percentage' ? 'e.g. 0.10 for 10%' : '0'} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
																</div>
																{sch.scholarshipType !== 'percentage' && (
																	<div>
																		<label className="text-[10px] font-medium text-gray-400">Currency</label>
																		<select value={sch.currency || defaultCurrency} onChange={(e) => {
																			const next = [...form.financialConfig.feeSchedules];
																			const s = { ...next[i] };
																			const schs = [...(s.scholarships || [])];
																			schs[sci] = { ...schs[sci], currency: e.target.value };
																			s.scholarships = schs; next[i] = s;
																			update('financialConfig.feeSchedules', next);
																		}} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																			{form.financialConfig.currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
																		</select>
																	</div>
																)}
																<div>
																	<label className="text-[10px] font-medium text-gray-400">Description</label>
																	<input value={sch.description || ''} onChange={(e) => {
																		const next = [...form.financialConfig.feeSchedules];
																		const s = { ...next[i] };
																		const schs = [...(s.scholarships || [])];
																		schs[sci] = { ...schs[sci], description: e.target.value };
																		s.scholarships = schs; next[i] = s;
																		update('financialConfig.feeSchedules', next);
																	}} placeholder="Optional" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
																</div>
															</div>
															{/* Applies to payment categories */}
															<div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
																<span className="text-[10px] text-gray-400 self-center">Applies to:</span>
																{form.financialConfig.paymentCategories.map((cat) => {
																	const checked = (sch.appliesTo || []).includes(cat.id);
																	return (
																		<label key={cat.id} className="inline-flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
																			<input type="checkbox" checked={checked} onChange={() => {
																				const next = [...form.financialConfig.feeSchedules];
																				const s = { ...next[i] };
																				const schs = [...(s.scholarships || [])];
																				const current = schs[sci].appliesTo || [];
																				schs[sci] = { ...schs[sci], appliesTo: checked ? current.filter((id: string) => id !== cat.id) : [...current, cat.id] };
																				s.scholarships = schs; next[i] = s;
																				update('financialConfig.feeSchedules', next);
																			}} className="rounded" />
																			{cat.name}
																		</label>
																	);
																})}
																{form.financialConfig.paymentCategories.length === 0 && <span className="text-[10px] text-gray-400 italic">All categories</span>}
															</div>
															{/* Installment split for fixed-payment scholarships */}
															{sch.scholarshipType === 'fixedPayment' && (
																<div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
																	<div className="flex items-center gap-2">
																		<span className="text-[10px] font-medium text-gray-400 uppercase">Installment Split</span>
																		{(sch.installments || []).length > 0 && (
																			<button onClick={() => {
																				const next = [...form.financialConfig.feeSchedules];
																				const s = { ...next[i] };
																				const schs = [...(s.scholarships || [])];
																				schs[sci] = { ...schs[sci], installments: [] };
																				s.scholarships = schs; next[i] = s;
																				update('financialConfig.feeSchedules', next);
																			}} className="text-[10px] text-gray-400 hover:text-red-500 ml-auto">Clear</button>
																		)}
																	</div>
																	{(sch.installments || []).map((entry: any, ei: number) => {
																		const isPct = entry.percentage !== undefined;
																		const setEntry = (patch: any) => {
																			const next = [...form.financialConfig.feeSchedules];
																			const s = { ...next[i] };
																			const schs = [...(s.scholarships || [])];
																			const entries = [...(schs[sci].installments || [])];
																			entries[ei] = { ...entries[ei], ...patch };
																			schs[sci] = { ...schs[sci], installments: entries };
																			s.scholarships = schs; next[i] = s;
																			update('financialConfig.feeSchedules', next);
																		};
																		return (
																			<div key={ei} className="flex flex-wrap items-center gap-1.5">
																				<select value={entry.installmentId || ''} onChange={(e) => setEntry({ installmentId: e.target.value })}
																					className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																					<option value="">Select installment</option>
																					{form.financialConfig.installments.map((ins) => <option key={ins.id} value={ins.id}>{ins.label || ins.id}</option>)}
																				</select>
																				<select value={isPct ? 'pct' : 'fixed'} onChange={(e) => setEntry(e.target.value === 'pct' ? { percentage: 0, fixedAmount: undefined } : { fixedAmount: 0, percentage: undefined })}
																					className="rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white">
																					<option value="pct">%</option>
																					<option value="fixed">Amount</option>
																				</select>
																				{isPct ? (
																					<input type="number" inputMode="numeric" min={0} max={100} value={Math.round((Number(entry.percentage) || 0) * 100)} onChange={(e) => setEntry({ percentage: (Number(e.target.value) || 0) / 100 })}
																						placeholder="%" className="w-16 rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
																				) : (
																					<CurrencyInput value={Number(entry.fixedAmount) || 0} onChange={(num) => setEntry({ fixedAmount: num })} />
																				)}
																				<button onClick={() => {
																					const next = [...form.financialConfig.feeSchedules];
																					const s = { ...next[i] };
																					const schs = [...(s.scholarships || [])];
																					const entries = [...(schs[sci].installments || [])];
																					entries.splice(ei, 1);
																					schs[sci] = { ...schs[sci], installments: entries };
																					s.scholarships = schs; next[i] = s;
																					update('financialConfig.feeSchedules', next);
																				}} className="text-gray-400 hover:text-red-500 text-[10px] p-0.5">✕</button>
																			</div>
																		);
																	})}
																	<button onClick={() => {
																		const next = [...form.financialConfig.feeSchedules];
																		const s = { ...next[i] };
																		const schs = [...(s.scholarships || [])];
																		schs[sci] = { ...schs[sci], installments: [...(schs[sci].installments || []), { installmentId: form.financialConfig.installments[0]?.id || '', percentage: 0 }] };
																		s.scholarships = schs; next[i] = s;
																		update('financialConfig.feeSchedules', next);
																	}} className="text-[11px] text-[#465fff] font-medium">+ Split</button>
																	{(() => {
																		const schAmount = Number(sch.amount) || 0;
																		const assigned = (sch.installments || []).reduce((sum: number, en: any) => {
																			if (en.percentage !== undefined) return sum + (Number(en.percentage) || 0) * schAmount;
																			return sum + (Number(en.fixedAmount) || 0);
																		}, 0);
																		const over = assigned > schAmount + 0.000001;
																		const pct = schAmount > 0 ? Math.min(100, (assigned / schAmount) * 100) : 0;
																		return (
																			<div className="pt-1">
																				<div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
																					<div className={`h-full rounded-full ${over ? 'bg-red-500' : assigned >= schAmount - 0.000001 ? 'bg-green-500' : 'bg-[#465fff]'}`} style={{ width: `${pct}%` }} />
																				</div>
																				<div className={`mt-1 text-[10px] ${over ? 'text-red-500' : 'text-gray-400'}`}>
																					Assigned {Math.round(assigned)} / {Math.round(schAmount)} {sch.currency || defaultCurrency} · empty means the full fixed amount is due immediately
																					{over && ' · total exceeds the scholarship amount'}
																				</div>
																			</div>
																		);
																	})()}
																</div>
															)}
														</div>
													))}
													<button onClick={() => {
														const next = [...form.financialConfig.feeSchedules];
														const s = { ...next[i] };
														s.scholarships = [...(s.scholarships || []), { id: `sch-${Date.now()}`, name: '', description: '', scholarshipType: 'fixedDeduction', amount: 0, currency: defaultCurrency, appliesTo: [] }];
														next[i] = s;
														update('financialConfig.feeSchedules', next);
													}} className="text-[11px] text-[#465fff] font-medium">+ Add Scholarship</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
						<AddButton label="Fee Schedule" onClick={() => {
							const allYears = getAcademicYearRange(form.identity.firstAcademicYear, form.identity.currentAcademicYear);
							const usedYears = new Set(form.financialConfig.feeSchedules.map((s) => s.academicYear));
							const nextYear = [...allYears].reverse().find((yr) => !usedYears.has(yr)) || form.identity.currentAcademicYear || '';
							const existing = form.financialConfig.feeSchedules[form.financialConfig.feeSchedules.length - 1];
							const cloned = existing
								? JSON.parse(JSON.stringify({ ...existing, academicYear: nextYear }))
								: { ...buildDefaultFeeSchedule(nextYear), sessionFeeSchedules: Object.keys(form.academicConfig.classLevels).map((name) => ({ sessionName: name, feeGroups: [] })) };
							update('financialConfig.feeSchedules', [...form.financialConfig.feeSchedules, cloned]);
						}} />
						<div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
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
				</div>
			)}
		</div>

		<div className="flex items-center justify-between gap-3 pt-1">
			<button onClick={() => setStep((s) => s - 1)} disabled={step === 0}
				className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors dark:border-gray-800 dark:text-gray-400">
				<ArrowLeft className="h-3.5 w-3.5" /> Back
			</button>
			<div className="flex items-center gap-2">
				<span className="text-[11px] text-gray-400 tabular-nums">{step + 1}/{STEPS.length}</span>
				{!isLast && initialData && (
					<button onClick={handleSubmit} disabled={saving}
						className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#465fff]/30 px-4 py-2 text-xs font-semibold text-[#465fff] hover:bg-[#465fff]/5 disabled:opacity-50 transition-colors">
						{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
						{saving ? 'Saving...' : 'Save'}
					</button>
				)}
				{isLast ? (
					<button onClick={handleSubmit} disabled={saving}
						className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#465fff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50 transition-colors shadow-sm">
						{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
						{saving ? 'Saving...' : submitLabel}
					</button>
				) : (
					<button onClick={goNext}
						className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#465fff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3a4fe6] transition-colors shadow-sm">
						Next <ArrowRight className="h-3.5 w-3.5" />
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
	const [editingClass, setEditingClass] = useState<{ session: string; level: string; classIdx: number } | null>(null);
	const [editClassName, setEditClassName] = useState('');
	const [newSubjectName, setNewSubjectName] = useState('');
	const [newSubjectIsMajor, setNewSubjectIsMajor] = useState(false);
	const [editingSubject, setEditingSubject] = useState<{ session: string; level: string; subjectIdx: number } | null>(null);
	const [editSubjectName, setEditSubjectName] = useState('');
	const [editSubjectIsMajor, setEditSubjectIsMajor] = useState(false);

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
		const classId = `${session}_${newClassName.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`.toLowerCase();
		data[session][level].classes.push({ classId, name: newClassName });
		onChange(data);
		setNewClassName('');
	};

	const renameClass = (session: string, level: string, classIdx: number) => {
		if (!editClassName.trim()) { setEditingClass(null); return; }
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].classes[classIdx].name = editClassName;
		data[session][level].classes[classIdx].classId = `${session}_${editClassName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
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
		data[session][level].subjects.push({ name: newSubjectName, isMajorSubject: newSubjectIsMajor });
		onChange(data);
		setNewSubjectName('');
		setNewSubjectIsMajor(false);
	};

	const renameSubject = (session: string, level: string, subjectIdx: number) => {
		if (!editSubjectName.trim()) { setEditingSubject(null); return; }
		const data = JSON.parse(JSON.stringify(classLevels));
		data[session][level].subjects[subjectIdx].name = editSubjectName;
		data[session][level].subjects[subjectIdx].isMajorSubject = editSubjectIsMajor;
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
					<Wand2 className="h-3 w-3" /> Use Default Class Levels
				</button>
			)}
			{onUseDefaults && Object.keys(classLevels).length > 0 && (
				<button onClick={() => {
					let suffix = 2;
					let name = 'Morning';
					while (classLevels[name]) { name = `Morning ${suffix}`; suffix++; }
					const newLevels = JSON.parse(JSON.stringify(DEFAULT_CLASS_LEVELS));
					const entry = Object.entries(newLevels)[0];
					delete newLevels[entry[0]];
					newLevels[name] = entry[1];
					onChange({ ...classLevels, ...newLevels });
					setExpandedSession(name);
				}} className="inline-flex items-center gap-1.5 rounded-lg bg-[#465fff]/10 px-3 py-1.5 text-xs font-semibold text-[#465fff] hover:bg-[#465fff]/20 transition-colors">
					<Wand2 className="h-3.5 w-3.5" /> Add Default Session
				</button>
			)}
			<div className="flex gap-2">
				<input value={newSession} onChange={(e) => setNewSession(e.target.value)} placeholder="New session name"
					className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
				<button onClick={() => { if (newSession.trim()) { onChange({ ...classLevels, [newSession.trim()]: {} }); setNewSession(''); setExpandedSession(newSession.trim()); } }}
					className="rounded-lg bg-[#465fff] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3a4fe6] transition-colors shrink-0">+ Session</button>
			</div>
			{sessions.map((session) => (
				<div key={session} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
					<div className="flex items-center gap-2 bg-gray-50 dark:bg-muted/50 px-3 py-2.5 cursor-pointer" onClick={() => setExpandedSession(expandedSession === session ? null : session)}>
						{expandedSession === session ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
						{editingSession === session ? (
							<input autoFocus value={editSessionName} onChange={(e) => setEditSessionName(e.target.value)} onBlur={() => renameSession(session)} onKeyDown={(e) => { if (e.key === 'Enter') renameSession(session); if (e.key === 'Escape') setEditingSession(null); }}
								onClick={(e) => e.stopPropagation()} className="flex-1 rounded border border-[#465fff] bg-white px-2 py-0.5 text-xs outline-none dark:bg-muted dark:text-white" />
						) : (
							<span className="flex-1 text-xs font-semibold text-gray-900 dark:text-white">{session}</span>
						)}
						<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
							<button onClick={() => { setEditingSession(session); setEditSessionName(session); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-3 w-3" /></button>
							<button onClick={() => deleteSession(session)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
						</div>
					</div>
					{expandedSession === session && (
						<div className="p-3 space-y-2">
							{Object.keys(classLevels[session] || {}).map((level) => (
								<div key={level} className="rounded-lg border border-gray-100 dark:border-gray-800 p-2.5">
									<div className="flex items-center gap-1.5 mb-1.5">
										{editingLevel?.session === session && editingLevel?.level === level ? (
											<input autoFocus value={editLevelName} onChange={(e) => setEditLevelName(e.target.value)} onBlur={() => renameLevel(session, level)} onKeyDown={(e) => { if (e.key === 'Enter') renameLevel(session, level); if (e.key === 'Escape') setEditingLevel(null); }}
												className="flex-1 rounded border border-[#465fff] bg-white px-2 py-0.5 text-xs outline-none dark:bg-muted dark:text-white" />
										) : (
											<span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300">{level}</span>
										)}
										<label className="inline-flex items-center gap-1 text-[10px] text-gray-500">
											<input type="checkbox" checked={classLevels[session][level].isSelfContained || false}
												onChange={(e) => { const data = JSON.parse(JSON.stringify(classLevels)); data[session][level].isSelfContained = e.target.checked; onChange(data); }} />
											Self-contained
										</label>
										<button onClick={() => { setEditingLevel({ session, level }); setEditLevelName(level); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-2.5 w-2.5" /></button>
										<button onClick={() => deleteLevel(session, level)} className="text-red-400 hover:text-red-500"><Trash2 className="h-2.5 w-2.5" /></button>
									</div>
									<div className="ml-3 space-y-0.5">
										{(classLevels[session][level].classes || []).map((cls: any, idx: number) => (
											<div key={idx} className="flex items-center gap-1.5 text-[11px]">
												{editingClass?.session === session && editingClass?.level === level && editingClass?.classIdx === idx ? (
													<>
														<input autoFocus value={editClassName} onChange={(e) => setEditClassName(e.target.value)} className="w-28 rounded border border-[#465fff] bg-white px-1.5 py-0.5 text-[11px] outline-none dark:bg-muted dark:text-white" />
														<button onClick={() => renameClass(session, level, idx)} className="text-[#465fff] text-[10px]">Save</button>
														<button onClick={() => setEditingClass(null)} className="text-gray-400 text-[10px]">Cancel</button>
													</>
												) : (
													<>
														<span className="text-gray-700 dark:text-gray-300">{cls.name}</span>
														<button onClick={() => { setEditingClass({ session, level, classIdx: idx }); setEditClassName(cls.name); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-2 w-2" /></button>
														<button onClick={() => deleteClass(session, level, idx)} className="text-red-400 hover:text-red-500"><Trash2 className="h-2 w-2" /></button>
													</>
												)}
											</div>
										))}
										<div className="flex items-center gap-1.5 mt-1">
											<input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Class name" onKeyDown={(e) => { if (e.key === 'Enter') addClass(session, level); }}
												className="w-28 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<button onClick={() => addClass(session, level)} className="text-[11px] text-[#465fff] font-medium">+ Add</button>
										</div>
									</div>
									<div className="ml-3 mt-1.5 border-t border-gray-100 dark:border-gray-800 pt-1.5">
										<p className="text-[9px] font-medium text-gray-400 uppercase mb-0.5">Subjects</p>
										{(classLevels[session][level].subjects || []).map((subj: any, idx: number) => (
											<div key={idx} className="flex items-center gap-1.5 text-[11px] mb-0.5">
												{editingSubject?.session === session && editingSubject?.level === level && editingSubject?.subjectIdx === idx ? (
													<>
														<input autoFocus value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} className="w-20 rounded border border-[#465fff] bg-white px-1.5 py-0.5 text-[11px] outline-none dark:bg-muted dark:text-white" />
														<label className="inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
															<input type="checkbox" checked={editSubjectIsMajor} onChange={(e) => setEditSubjectIsMajor(e.target.checked)} className="rounded" />
															Major
														</label>
														<button onClick={() => renameSubject(session, level, idx)} className="text-[#465fff] text-[10px]">Save</button>
														<button onClick={() => setEditingSubject(null)} className="text-gray-400 text-[10px]">Cancel</button>
													</>
												) : (
													<>
														<span className="text-gray-700 dark:text-gray-300">{subj.name}</span>
														{subj.isMajorSubject ? (
															<span className="text-[9px] font-semibold text-[#465fff] bg-[#465fff]/10 px-1 py-0.5 rounded">Major</span>
														) : (
															<span className="text-[9px] font-semibold text-gray-400 bg-gray-100 dark:bg-muted px-1 py-0.5 rounded">Minor</span>
														)}
														<button onClick={() => { setEditingSubject({ session, level, subjectIdx: idx }); setEditSubjectName(subj.name); setEditSubjectIsMajor(subj.isMajorSubject || false); }} className="text-gray-400 hover:text-gray-600"><Pencil className="h-2 w-2" /></button>
														<button onClick={() => deleteSubject(session, level, idx)} className="text-red-400 hover:text-red-500"><Trash2 className="h-2 w-2" /></button>
													</>
												)}
											</div>
										))}
										<div className="flex items-center gap-1.5 mt-1">
											<input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject" onKeyDown={(e) => { if (e.key === 'Enter') addSubject(session, level); }}
												className="w-20 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
											<label className="inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
												<input type="checkbox" checked={newSubjectIsMajor} onChange={(e) => setNewSubjectIsMajor(e.target.checked)} className="rounded" />
												Major
											</label>
											<button onClick={() => addSubject(session, level)} className="text-[11px] text-[#465fff] font-medium">+ Add</button>
										</div>
									</div>
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
function AcademicPermissionsEditor({ studentSettings, teacherSettings, firstYear, currentYear, onChange }: {
	studentSettings: SchoolFormState['userConfig']['studentSettings'];
	teacherSettings: SchoolFormState['userConfig']['teacherSettings'];
	firstYear: string;
	currentYear: string;
	onChange: (student: typeof studentSettings, teacher: typeof teacherSettings) => void;
}) {
	const years = getAcademicYearRange(firstYear, currentYear);
	const sortedYears = [...years].sort((a, b) => {
		if (a === currentYear) return -1;
		if (b === currentYear) return 1;
		return a.localeCompare(b);
	});
	const [expandedYear, setExpandedYear] = useState(currentYear || '');

	const togglePeriod = (current: string[], value: string) => current.includes(value) ? current.filter((p) => p !== value) : [...current, value];

	return (
		<div className="space-y-3">
			<h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Per-Year Academic Permissions</h4>
			{years.length === 0 ? (
				<p className="text-xs text-gray-400">Set first and current academic years on the School Identity step.</p>
			) : (
				sortedYears.map((yr) => {
					const isExpanded = expandedYear === yr;
					const studentYear = studentSettings.reportAccessByYear[yr] || { enabled: false, yearlyReportAccess: false, periods: [] as string[], semesters: [] as string[] };
					const teacherYear = teacherSettings.permissionsByYear[yr] || { enabled: false, gradeSubmission: { enabled: false, periods: [] as string[] }, viewGradeSubmissions: { enabled: false }, gradeChangeRequest: { enabled: false, periods: [] as string[] }, viewMasters: { enabled: false } };

					const updateStudentYear = (patch: Partial<typeof studentYear>) => {
						onChange({ ...studentSettings, reportAccessByYear: { ...studentSettings.reportAccessByYear, [yr]: { ...studentYear, ...patch } } }, teacherSettings);
					};
					const updateTeacherYear = (patch: Partial<typeof teacherYear>) => {
						onChange(studentSettings, { ...teacherSettings, permissionsByYear: { ...teacherSettings.permissionsByYear, [yr]: { ...teacherYear, ...patch } } });
					};

					return (
						<div key={yr} className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
							<div className="flex items-center gap-2 bg-gray-50 dark:bg-muted/50 px-3 py-2 cursor-pointer select-none"
								onClick={() => setExpandedYear(isExpanded ? '' : yr)}>
								{isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
								<span className="flex-1 text-xs font-semibold text-gray-900 dark:text-white">{yr}</span>
								{yr === currentYear && <span className="text-[9px] font-semibold text-[#465fff] bg-[#465fff]/10 px-1.5 py-0.5 rounded-full">Current</span>}
							</div>
							{isExpanded && (
								<div className="p-3 space-y-3">
									<div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
										<h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">Student Report Access</h5>
										<ToggleRow label="Enabled for this year" checked={studentYear.enabled} onChange={(v) => updateStudentYear({ enabled: v })} />
										<ToggleRow label="Yearly report access" checked={studentYear.yearlyReportAccess} onChange={(v) => updateStudentYear({ yearlyReportAccess: v })} />
										<div>
											<p className="text-[11px] font-medium text-gray-500 mb-1.5">Periods</p>
											<div className="flex flex-wrap gap-1">{ACADEMIC_PERIODS.map((p) => (
												<button key={p} onClick={() => updateStudentYear({ periods: togglePeriod(studentYear.periods, p) })}
													className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${studentYear.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
													{p.replace(/_/g, ' ')}
												</button>
											))}</div>
										</div>
										<div>
											<p className="text-[11px] font-medium text-gray-500 mb-1.5">Semesters</p>
											<div className="flex flex-wrap gap-1">{SEMESTERS.map((s) => (
												<button key={s} onClick={() => updateStudentYear({ semesters: togglePeriod(studentYear.semesters, s) })}
													className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${studentYear.semesters.includes(s) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
													{s} semester
												</button>
											))}</div>
										</div>
									</div>
									<div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
										<h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">Teacher Permissions</h5>
										<ToggleRow label="Enabled for this year" checked={teacherYear.enabled} onChange={(v) => updateTeacherYear({ enabled: v })} />
										<ToggleRow label="Grade submission" checked={teacherYear.gradeSubmission.enabled} onChange={(v) => updateTeacherYear({ gradeSubmission: { ...teacherYear.gradeSubmission, enabled: v } })} />
										{teacherYear.gradeSubmission.enabled && (
											<div className="ml-3"><p className="text-[11px] font-medium text-gray-500 mb-1.5">Grade Submission Periods</p>
												<div className="flex flex-wrap gap-1">{ACADEMIC_PERIODS.map((p) => (
													<button key={p} onClick={() => updateTeacherYear({ gradeSubmission: { ...teacherYear.gradeSubmission, periods: togglePeriod(teacherYear.gradeSubmission.periods, p) } })}
														className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${teacherYear.gradeSubmission.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
														{p.replace(/_/g, ' ')}
													</button>
												))}</div>
											</div>
										)}
										<ToggleRow label="View grade submissions" checked={teacherYear.viewGradeSubmissions.enabled} onChange={(v) => updateTeacherYear({ viewGradeSubmissions: { enabled: v } })} />
										<ToggleRow label="Grade change requests" checked={teacherYear.gradeChangeRequest.enabled} onChange={(v) => updateTeacherYear({ gradeChangeRequest: { ...teacherYear.gradeChangeRequest, enabled: v } })} />
										{teacherYear.gradeChangeRequest.enabled && (
											<div className="ml-3"><p className="text-[11px] font-medium text-gray-500 mb-1.5">Change Request Periods</p>
												<div className="flex flex-wrap gap-1">{ACADEMIC_PERIODS.map((p) => (
													<button key={p} onClick={() => updateTeacherYear({ gradeChangeRequest: { ...teacherYear.gradeChangeRequest, periods: togglePeriod(teacherYear.gradeChangeRequest.periods, p) } })}
														className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${teacherYear.gradeChangeRequest.periods.includes(p) ? 'bg-[#465fff] text-white' : 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-gray-400'}`}>
														{p.replace(/_/g, ' ')}
													</button>
												))}</div>
											</div>
										)}
										<ToggleRow label="View masters" checked={teacherYear.viewMasters.enabled} onChange={(v) => updateTeacherYear({ viewMasters: { enabled: v } })} />
									</div>
								</div>
							)}
						</div>
					);
				})
			)}
		</div>
	);
}

// ─── Shared Components ──────────────────────────────────────────────────────────
function Field({ label, required, value, onChange, onBlur, placeholder, disabled, error, inputType }: {
	label: string; required?: boolean; value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; disabled?: boolean; error?: string; inputType?: 'text' | 'tel' | 'email' | 'number';
}) {
	const type = inputType || 'text';
	const inputMode = type === 'tel' ? 'tel' : type === 'email' ? 'email' : type === 'number' ? 'numeric' : undefined;
	return (
		<div>
			<label className="text-[11px] font-medium text-gray-500">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
			<input type={type} inputMode={inputMode} required={required} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} disabled={disabled}
				className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-muted dark:text-white ${
					error
						? 'border-red-400 focus:border-red-400 focus:ring-red-400/10 dark:border-red-400'
						: 'border-gray-200 focus:border-[#465fff] focus:ring-[#465fff]/10 dark:border-gray-800'
				}`} />
			{error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
		</div>
	);
}

function AddressInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	const ref = useRef<HTMLInputElement>(null);
	const mounted = useRef(false);
	useEffect(() => { if (!mounted.current) { mounted.current = true; if (!value) ref.current?.focus(); } }, []);
	return <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Address line..."
		className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />;
}

function DynamicList({ values, onChange, placeholder, itemErrors, inputType }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; itemErrors?: Record<number, string>; inputType?: 'text' | 'tel' | 'email' }) {
	const endRef = useRef<HTMLInputElement>(null);
	const prevLen = useRef(values.length);
	useEffect(() => { if (values.length > prevLen.current) endRef.current?.focus(); prevLen.current = values.length; }, [values.length]);
	const inputMode = inputType === 'tel' ? 'tel' : inputType === 'email' ? 'email' : undefined;
	return (
		<div className="space-y-1.5">
			{values.map((val, i) => (
				<div key={i}>
					<div className="flex items-center gap-1.5">
						<input ref={i === values.length - 1 ? endRef : undefined} value={val} type={inputType || 'text'} inputMode={inputMode}
							onChange={(e) => {
								let raw = e.target.value;
								if (inputType === 'tel') raw = raw.replace(/[^0-9+\-().\s]/g, '');
								const next = [...values]; next[i] = raw; onChange(next);
							}} placeholder={placeholder}
							className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-muted dark:text-white ${
								itemErrors?.[i]
									? 'border-red-400 focus:border-red-400 focus:ring-red-400/10 dark:border-red-400'
									: 'border-gray-200 focus:border-[#465fff] focus:ring-[#465fff]/10 dark:border-gray-800'
							}`} />
						<button onClick={() => onChange(values.filter((_, j) => j !== i))} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20">
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					</div>
					{itemErrors?.[i] && <p className="text-[11px] text-red-500 mt-1">{itemErrors[i]}</p>}
				</div>
			))}
			<button onClick={() => onChange([...values, ''])} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#465fff] hover:text-[#3a4fe6] transition-colors">
				<span className="text-base leading-none">+</span> Add
			</button>
		</div>
	);
}

function CurrencyInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
	const ref = useRef<HTMLInputElement>(null);
	const [display, setDisplay] = useState(value ? formatMoney(value) : '');
	const [focused, setFocused] = useState(false);

	useEffect(() => {
		if (!focused) {
			setDisplay(value ? formatMoney(value) : '');
		}
	}, [value, focused]);

	const handleChange = (raw: string) => {
		const cleaned = raw.replace(/[^0-9]/g, '');
		const num = Number(cleaned) || 0;
		setDisplay(cleaned ? formatMoney(num) : '');
		onChange(num);
	};

	return (
		<input
			ref={ref}
			value={display}
			onFocus={() => setFocused(true)}
			onBlur={() => setFocused(false)}
			onChange={(e) => handleChange(e.target.value)}
			placeholder={placeholder || '0'}
			inputMode="numeric"
			className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
		/>
	);
}

function formatMoney(n: number): string {
	return n.toLocaleString('en-US');
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="flex items-center justify-between gap-3 py-2 cursor-pointer group">
			<span className="text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white transition-colors">{label}</span>
			<button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
				className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#465fff]' : 'bg-gray-200 dark:bg-gray-700'}`}>
				<span className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
			</button>
		</label>
	);
}

function CompactToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
			<button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
				className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#465fff]' : 'bg-gray-200 dark:bg-gray-700'}`}>
				<span className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
			</button>
			<span className="text-xs text-gray-500">{label}</span>
		</label>
	);
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<button onClick={onClick} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#465fff] hover:text-[#3a4fe6] transition-colors">
			<span className="text-base leading-none">+</span> {label}
		</button>
	);
}

function RemoveRow({ onClick }: { onClick: () => void }) {
	return (
		<button onClick={onClick} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20 shrink-0">
			<Trash2 className="h-3.5 w-3.5" />
		</button>
	);
}

// Thin wrapper so the fee-schedules step can reference a component (keeps JSX compact)
function DollarSignIcon(props: React.SVGProps<SVGSVGElement>) {
	return <DollarSign {...props} />;
}

function YearRangeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	const parts = (value || '').split('-');
	const ref1 = useRef<HTMLInputElement>(null);
	const ref2 = useRef<HTMLInputElement>(null);
	const handleChange = (which: 1 | 2, raw: string) => {
		const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
		const first = which === 1 ? digits : (parts[0] || '');
		const second = which === 2 ? digits : (parts[1] || '');
		const finalVal = first && second ? `${first}-${second}` : first || second;
		onChange(finalVal);
		if (which === 1 && digits.length === 4) ref2.current?.focus();
	};
	return (
		<div>
			<label className="block text-[11px] font-medium text-gray-500 mb-1">{label}</label>
			<div className="flex items-center gap-1.5">
				<input ref={ref1} value={parts[0] || ''} onChange={(e) => handleChange(1, e.target.value)} placeholder="YYYY" maxLength={4}
					className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
				<span className="text-gray-400 text-xs font-medium shrink-0">&ndash;</span>
				<input ref={ref2} value={parts[1] || ''} onChange={(e) => handleChange(2, e.target.value)} placeholder="YYYY" maxLength={4}
					className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
			</div>
		</div>
	);
}

function KeyValueEditor({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
	const entries = Object.entries(value);
	const [newKey, setNewKey] = useState('');
	return (
		<div className="space-y-2">
			{entries.map(([k, v]) => (
				<div key={k} className="flex items-center gap-2">
					<input value={k} readOnly className="w-40 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono dark:border-gray-800 dark:bg-muted dark:text-white" />
					<input value={v} onChange={(e) => onChange({ ...value, [k]: e.target.value })} placeholder="Value"
						className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
					<button onClick={() => { const next = { ...value }; delete next[k]; onChange(next); }} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
				</div>
			))}
			<div className="flex items-center gap-2">
				<input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Key" onKeyDown={(e) => { if (e.key === 'Enter' && newKey.trim()) { onChange({ ...value, [newKey.trim()]: '' }); setNewKey(''); } }}
					className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" />
				<button onClick={() => { if (newKey.trim()) { onChange({ ...value, [newKey.trim()]: '' }); setNewKey(''); } }} className="text-sm text-[#465fff] font-medium hover:underline">+ Add</button>
			</div>
		</div>
	);
}
