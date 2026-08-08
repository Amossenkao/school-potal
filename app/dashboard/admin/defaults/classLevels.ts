import type { ClassLevels, AcademicPeriod, Semester } from '@/types/schoolProfile';
import {FEATURE_KEYS} from "@/types"

// ---------------------------------------------------------------------------
// Default class levels — common structure for Liberian schools
// ---------------------------------------------------------------------------

export const DEFAULT_CLASS_LEVELS: ClassLevels = {
	Morning: {
		'Daycare Division': {
			isSelfContained: true,
			classes: [
				{ classId: 'morning_nursery', name: 'Nursery', index: 0 },
				{ classId: 'morning_abc', name: 'ABC', index: 1 },
			],
			subjects: [
				{ name: 'Hygiene', isMajorSubject: false },
				{ name: 'Social Skills', isMajorSubject: false },
				{ name: 'Identifying Alphabets', isMajorSubject: false },
				{ name: 'Identifying Numbers', isMajorSubject: false },
				{ name: 'Tracing Numbers', isMajorSubject: false },
				{ name: 'Physical Education', isMajorSubject: false },
				{ name: 'Drawing', isMajorSubject: false },
				{ name: 'Recognizing Words', isMajorSubject: false },
				{ name: 'Phonics', isMajorSubject: false },
				{ name: 'Bible', isMajorSubject: false },
			],
		},
		'Lower Elementary': {
			isSelfContained: true,
			classes: [
				{ classId: 'morning_k1', name: 'K 1', index: 2 },
				{ classId: 'morning_k2', name: 'K 2', index: 3 },
				{ classId: 'morning_grade_1', name: 'Grade 1', index: 4 },
				{ classId: 'morning_grade_2', name: 'Grade 2', index: 5 },
				{ classId: 'morning_grade_3', name: 'Grade 3', index: 6 },
			],
			subjects: [
				{ name: 'Math', isMajorSubject: false },
				{ name: 'General Science', isMajorSubject: false },
				{ name: 'English', isMajorSubject: false },
				{ name: 'Social Studies', isMajorSubject: false },
				{ name: 'Health Science', isMajorSubject: false },
				{ name: 'Physical Education', isMajorSubject: false },
				{ name: 'Reading', isMajorSubject: false },
				{ name: 'Writing', isMajorSubject: false },
				{ name: 'Spelling', isMajorSubject: false },
				{ name: 'Phonics', isMajorSubject: false },
				{ name: 'Bible', isMajorSubject: false },
				{ name: 'Drawing', isMajorSubject: false },
			],
		},
		'Upper Elementary': {
			classes: [
				{ classId: 'morning_grade_4', name: 'Grade 4', index: 7 },
				{ classId: 'morning_grade_5', name: 'Grade 5', index: 8 },
				{ classId: 'morning_grade_6', name: 'Grade 6', index: 9 },
			],
			subjects: [
				{ name: 'Math', isMajorSubject: false },
				{ name: 'General Science', isMajorSubject: false },
				{ name: 'English', isMajorSubject: false },
				{ name: 'French', isMajorSubject: false },
				{ name: 'Social Studies', isMajorSubject: false },
				{ name: 'Health Science', isMajorSubject: false },
				{ name: 'Physical Education', isMajorSubject: false },
				{ name: 'Computer', isMajorSubject: false },
				{ name: 'Reading', isMajorSubject: false },
				{ name: 'Writing', isMajorSubject: false },
				{ name: 'Spelling', isMajorSubject: false },
				{ name: 'Phonics', isMajorSubject: false },
				{ name: 'Bible', isMajorSubject: false },
			],
		},
		'Junior High': {
			classes: [
				{ classId: 'morning_grade_7', name: 'Grade 7', index: 10 },
				{ classId: 'morning_grade_8', name: 'Grade 8', index: 11 },
				{ classId: 'morning_grade_9', name: 'Grade 9', index: 12 },
			],
			subjects: [
				{ name: 'Math', isMajorSubject: false },
				{ name: 'General Science', isMajorSubject: false },
				{ name: 'English', isMajorSubject: false },
				{ name: 'French', isMajorSubject: false },
				{ name: 'Geography', isMajorSubject: false },
				{ name: 'Health Science', isMajorSubject: false },
				{ name: 'Physical Education', isMajorSubject: false },
				{ name: 'Computer', isMajorSubject: false },
				{ name: 'History', isMajorSubject: false },
				{ name: 'Civics', isMajorSubject: false },
				{ name: 'Vocabulary', isMajorSubject: false },
				{ name: 'Phonics', isMajorSubject: false },
				{ name: 'Bible', isMajorSubject: false },
				{ name: 'Agriculture', isMajorSubject: false },
				{ name: 'Literature', isMajorSubject: false },
			],
		},
		'Senior High': {
			classes: [
				{ classId: 'morning_grade_10', name: 'Grade 10', index: 13 },
				{ classId: 'morning_grade_11', name: 'Grade 11', index: 14 },
				{ classId: 'morning_grade_12', name: 'Grade 12', index: 15 },
			],
			subjects: [
				{ name: 'Math', isMajorSubject: false },
				{ name: 'Biology', isMajorSubject: false },
				{ name: 'English', isMajorSubject: false },
				{ name: 'Physics', isMajorSubject: false },
				{ name: 'Chemistry', isMajorSubject: false },
				{ name: 'Computer', isMajorSubject: false },
				{ name: 'Economics', isMajorSubject: false },
				{ name: 'Government', isMajorSubject: false },
				{ name: 'Geography', isMajorSubject: false },
				{ name: 'History', isMajorSubject: false },
				{ name: 'Literature', isMajorSubject: false },
				{ name: 'Accounting', isMajorSubject: false },
				{ name: 'Bible', isMajorSubject: false },
				{ name: 'French', isMajorSubject: false },
				{ name: 'Agriculture', isMajorSubject: false },
				{ name: 'Practical', isMajorSubject: false },
				{ name: 'R.O.T.C', isMajorSubject: false },
			],
		},
	},
};

// ---------------------------------------------------------------------------
// Default administrative positions
// ---------------------------------------------------------------------------

export const DEFAULT_ADMIN_POSITIONS = [
	{ id: 'principal', name: 'Principal' },
	{ id: 'registrar', name: 'Registrar' },
	{ id: 'vpi', name: 'Vice Principal for Instruction (VPI)' },
	{ id: 'business_manager', name: 'Business Manager' },
	{ id: 'proprietor', name: 'Proprietor' },
];

// ---------------------------------------------------------------------------
// Default enabled features
// ---------------------------------------------------------------------------

export const DEFAULT_FEATURES = FEATURE_KEYS;

// ---------------------------------------------------------------------------
// Default role feature access
// ---------------------------------------------------------------------------

export const DEFAULT_ROLE_FEATURE_ACCESS = {
	system_admin: [
		'user_management', 'calendar_events', 'grade_management',
		'class_management', 'academic_reports',
		'student_attendance', 'ai_chat',
		'school_settings', 'support_system', 'audit',
	],
	teacher: [
		'community', 'calendar_events', 'grade_management',
		'student_attendance',
		'ai_chat',
	],
	student: [
		'calendar_events', 'fee_payment', 'academic_reports',
		'student_attendance', 'community', 'ai_chat',
	],
	parent: [
		'calendar_events', 'fee_payment', 'academic_reports',
		'student_attendance',
	],
	administrator: {} as Record<string, string[]>,
};

// ---------------------------------------------------------------------------
// Default grading settings
// ---------------------------------------------------------------------------

export const DEFAULT_GRADING_SETTINGS = {
	passMark: 50,
	gradeScale: { min: 0, max: 100 },
	summerSchoolWeight: 0,
	failureWeight: 0,
	hasSummerSchool: false,
	givesDoublePromotion: false,
	givesDemotion: false,
	promotionRules: [{ maxMajor: 0, maxMinor: 2 }],
	failureRules: [{ maxMajor: 2, maxMinor: 0 }],
	summerSchoolRules: [{ maxMajor: 1, maxMinor: 1 }],
	majorFailuresAllowed: 0,
	minorFailuresAllowed: 2,
	oneMajorWithMinorFailuresAllowed: 1,
};

// ---------------------------------------------------------------------------
// Normalize grading settings to always carry the three rule arrays. Profiles
// saved before the rule arrays existed only have the legacy threshold fields,
// so those are mapped onto the arrays here. Existing rule arrays take
// precedence and are kept as-is.
// ---------------------------------------------------------------------------

export function migrateLegacyGradingRules(settings: any): any {
	const src = settings && typeof settings === 'object' ? settings : {};
	const pickRule = (list: any): { maxMajor: number; maxMinor: number }[] => {
		if (Array.isArray(list) && list.length > 0) {
			return list
				.filter(
					(rule) =>
						rule &&
						typeof rule === 'object' &&
						Number.isFinite(Number(rule.maxMajor)) &&
						Number.isFinite(Number(rule.maxMinor)),
				)
				.map((rule) => ({
					maxMajor: Math.max(0, Number(rule.maxMajor)),
					maxMinor: Math.max(0, Number(rule.maxMinor)),
				}));
		}
		return [];
	};
	const promotionRules = pickRule(src.promotionRules);
	const failureRules = pickRule(src.failureRules);
	const summerSchoolRules = pickRule(src.summerSchoolRules);
	const majorFailuresAllowed = Number.isFinite(Number(src.majorFailuresAllowed))
		? Math.max(0, Number(src.majorFailuresAllowed))
		: 0;
	const minorFailuresAllowed = Number.isFinite(Number(src.minorFailuresAllowed))
		? Math.max(0, Number(src.minorFailuresAllowed))
		: 2;
	const oneMajorWithMinorFailuresAllowed = Number.isFinite(
		Number(src.oneMajorWithMinorFailuresAllowed),
	)
		? Math.max(0, Number(src.oneMajorWithMinorFailuresAllowed))
		: 1;
	return {
		passMark: Number.isFinite(Number(src.passMark)) ? Number(src.passMark) : 50,
		gradeScale: {
			min: Number.isFinite(Number(src.gradeScale?.min))
				? Number(src.gradeScale?.min)
				: 0,
			max: Number.isFinite(Number(src.gradeScale?.max))
				? Number(src.gradeScale?.max)
				: 100,
		},
		hasSummerSchool: src.hasSummerSchool === true,
		givesDoublePromotion: src.givesDoublePromotion === true,
		promotionRules:
			promotionRules.length > 0
				? promotionRules
				: [{ maxMajor: majorFailuresAllowed, maxMinor: minorFailuresAllowed }],
		failureRules: failureRules.length > 0 ? failureRules : [{ maxMajor: 2, maxMinor: 0 }],
		summerSchoolRules:
			summerSchoolRules.length > 0
				? summerSchoolRules
				: [{ maxMajor: 1, maxMinor: oneMajorWithMinorFailuresAllowed }],
	};
}

// ---------------------------------------------------------------------------
// Derive a slug id from a free-text class name. The next-class-after-last
// class is not offered by the school itself, so its id cannot come from the
// school's own class list; it is derived from the typed name (e.g.
// "Grade 12-B" -> "Grade_12_B").
// ---------------------------------------------------------------------------

export function deriveClassIdFromName(name: string): string {
	return (name || '')
		.trim()
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

// ---------------------------------------------------------------------------
// Backfill missing class indices (migration for profiles saved before the
// global index existed). Existing explicit indices are preserved; classes
// without one get the next free index in traversal order.
// ---------------------------------------------------------------------------

export function ensureClassIndices(
	classLevels: Record<string, any>,
): Record<string, any> {
	const data = JSON.parse(JSON.stringify(classLevels || {}));
	const all: any[] = [];
	for (const session of Object.values(data)) {
		if (!session || typeof session !== 'object') continue;
		for (const level of Object.values(session)) {
			if (!level?.classes || !Array.isArray(level.classes)) continue;
			level.classes.forEach((cls: any) => all.push(cls));
		}
	}
	// The index is the grade level, so classes that are sections of the same
	// grade (11-A/11-B) or the same grade across sessions (Morning/Night
	// Grade 11) must share it. Map normalized class names to an index so
	// classes missing one inherit the index of their same-grade siblings.
	const indexByName = new Map<string, number>();
	let next = 0;
	for (const cls of all) {
		if (typeof cls?.index === 'number' && Number.isFinite(cls.index)) {
			next = Math.max(next, cls.index + 1);
			const key = normalizeClassNameForIndex(cls.name);
			if (key && !indexByName.has(key)) indexByName.set(key, cls.index);
		}
	}
	for (const cls of all) {
		if (typeof cls?.index === 'number' && Number.isFinite(cls.index)) continue;
		const key = normalizeClassNameForIndex(cls.name);
		if (key && indexByName.has(key)) {
			cls.index = indexByName.get(key);
			continue;
		}
		cls.index = next;
		if (key) indexByName.set(key, next);
		next += 1;
	}
	return data;
}

const normalizeClassNameForIndex = (name?: string) =>
	(name || '')
		.toString()
		.replace(/\s*-?\s*[A-D]$/i, '')
		.trim()
		.toLowerCase();

// ---------------------------------------------------------------------------
// Build per-year settings for a range of academic years
// ---------------------------------------------------------------------------

const ALL_PERIODS: AcademicPeriod[] = ['first', 'second', 'third', 'third_period_exam', 'fourth', 'fifth', 'sixth', 'sixth_period_exam'];
const ALL_SEMESTERS: Semester[] = ['first', 'second'];

export function buildDefaultStudentSettings(years: string[]) {
	const reportAccessByYear: Record<string, { enabled: boolean; yearlyReportAccess: boolean; periods: AcademicPeriod[]; semesters: Semester[] }> = {};
	for (const year of years) {
		reportAccessByYear[year] = {
			enabled: true,
			yearlyReportAccess: true,
			periods: [...ALL_PERIODS],
			semesters: [...ALL_SEMESTERS],
		};
	}
	return { loginAccess: true, reportAccessByYear };
}

export function buildDefaultTeacherSettings(years: string[]) {
	const permissionsByYear: Record<string, {
		enabled: boolean;
		gradeSubmission: { enabled: boolean; periods: AcademicPeriod[] };
		viewGradeSubmissions: { enabled: boolean };
		gradeChangeRequest: { enabled: boolean; periods: AcademicPeriod[] };
		viewMasters: { enabled: boolean };
	}> = {};
	for (const year of years) {
		permissionsByYear[year] = {
			enabled: true,
			gradeSubmission: { enabled: true, periods: [...ALL_PERIODS] },
			viewGradeSubmissions: { enabled: true },
			gradeChangeRequest: { enabled: true, periods: [...ALL_PERIODS] },
			viewMasters: { enabled: true },
		};
	}
	return { loginAccess: true, permissionsByYear };
}

// ---------------------------------------------------------------------------
// Generate academic year range from first to current
// ---------------------------------------------------------------------------

export function getAcademicYearRange(firstYear: string, currentYear: string): string[] {
	const matchFirst = firstYear.match(/^(\d{4})/);
	const matchCurrent = currentYear.match(/^(\d{4})/);
	if (!matchFirst || !matchCurrent) return [firstYear, currentYear].filter(Boolean);

	const start = parseInt(matchFirst[1], 10);
	const end = parseInt(matchCurrent[1], 10);
	if (isNaN(start) || isNaN(end) || start > end) return [firstYear, currentYear].filter(Boolean);

	const years: string[] = [];
	for (let y = start; y <= end; y++) {
		years.push(`${y}-${y + 1}`);
	}
	return years;
}

// ---------------------------------------------------------------------------
// Default financial config — common currencies, fee definitions, payment plans
// and student groups for Liberian schools
// ---------------------------------------------------------------------------

export const DEFAULT_CURRENCIES = [
	{ code: 'LRD', label: 'Liberian Dollar', symbol: 'L$', isDefault: true },
	{ code: 'USD', label: 'United States Dollar', symbol: '$', isDefault: false },
];

export const DEFAULT_PAYMENT_CATEGORIES = [
	{ id: 'tuition', name: 'Tuition' },
	{ id: 'registration', name: 'Registration' },
	{ id: 'requirements', name: 'Requirements' },
	{ id: 'facility', name: 'Facility' },
	{ id: 'accessories', name: 'Accessories' },
	{ id: 'transport', name: 'Transport' },
	{ id: 'boarding', name: 'Boarding' },
	{ id: 'library', name: 'Library' },
	{ id: 'documents', name: 'Documents' },
	{ id: 'graduation', name: 'Graduation' },
	{ id: 'other', name: 'Other' },
];

export const DEFAULT_FEE_DEFINITIONS = [
	{ id: 'tuition', name: 'Tuition', category: 'tuition', description: 'Core academic tuition fee', isActive: true },
	{ id: 'reg-1st-sem', name: 'Registration (1st Semester)', category: 'registration', description: 'First semester registration', isActive: true },
	{ id: 'reg-2nd-sem', name: 'Registration (2nd Semester)', category: 'registration', description: 'Second semester registration', isActive: true },
	{ id: 'first-aid', name: 'First Aid', category: 'requirements', description: 'First aid kit fee', isActive: true },
	{ id: 'id-card', name: 'Computerized ID Card', category: 'requirements', description: 'Student identification card', isActive: true },
	{ id: 'pta', name: 'PTA', category: 'requirements', description: 'Parent-Teacher Association fee', isActive: true },
	{ id: 'breakage-fee', name: 'Breakage Fee', category: 'requirements', description: 'Lab and facility breakage deposit', isActive: true },
	{ id: 'e-portal', name: 'E-Portal', category: 'requirements', description: 'Online portal access fee', isActive: true },
	{ id: 'activities', name: 'Activities', category: 'requirements', description: 'School activities fee', isActive: true },
	{ id: 'field-trip', name: 'Field Trip', category: 'requirements', description: 'Educational field trip fee', isActive: true },
	{ id: 'computer-literacy', name: 'Computer Literacy', category: 'requirements', description: 'Computer lab and literacy fee', isActive: true },
	{ id: 'uniform-set', name: 'Uniform Set', category: 'accessories', description: 'School uniform set', isActive: true },
	{ id: 'wednesday-dress', name: 'Wednesday Dress Code', category: 'accessories', description: 'Wednesday casual dress uniform', isActive: true },
];

export const DEFAULT_INSTALLMENTS = [
	{ id: 'inst-1st', label: '1st Installment', dueWindow: '' },
	{ id: 'inst-2nd', label: '2nd Installment', dueWindow: '' },
];

export const DEFAULT_STUDENT_GROUPS = [
	{
		id: 'new-students', name: 'New Students', priority: 1, isActive: true,
		conditions: [{ field: 'studentType', operator: 'equals', value: 'new' }],
	},
	{
		id: 'returning-students', name: 'Returning Students', priority: 2, isActive: true,
		conditions: [{ field: 'studentType', operator: 'equals', value: 'returning' }],
	},
];

export function buildDefaultFeeSchedule(academicYear: string) {
	return {
		academicYear,
		sessionFeeSchedules: [],
		scholarships: [],
	};
}
