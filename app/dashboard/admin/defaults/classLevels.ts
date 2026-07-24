import type { ClassLevels, FeeSchedules, AcademicPeriod, Semester } from '@/types/schoolProfile';

// ---------------------------------------------------------------------------
// Default class levels — common structure for Liberian schools
// ---------------------------------------------------------------------------

export const DEFAULT_CLASS_LEVELS: ClassLevels = {
	Morning: {
		'Daycare Division': {
			isSelfContained: true,
			classes: [
				{ classId: 'morning-nursery', name: 'Nursery', feeGroup: 'nursery-grade3' },
				{ classId: 'morning-abc', name: 'ABC', feeGroup: 'nursery-grade3' },
			],
			subjects: [
				{ name: 'Hygiene', weight: 1 },
				{ name: 'Social Skills', weight: 1 },
				{ name: 'Identifying Alphabets', weight: 1 },
				{ name: 'Identifying Numbers', weight: 1 },
				{ name: 'Tracing Numbers', weight: 1 },
				{ name: 'Physical Education', weight: 1 },
				{ name: 'Drawing', weight: 1 },
				{ name: 'Recognizing Words', weight: 1 },
				{ name: 'Phonics', weight: 1 },
				{ name: 'Bible', weight: 1 },
			],
		},
		'Lower Elementary': {
			isSelfContained: true,
			classes: [
				{ classId: 'morning-k1', name: 'K 1', feeGroup: 'nursery-grade3' },
				{ classId: 'morning-k2', name: 'K 2', feeGroup: 'nursery-grade3' },
				{ classId: 'morning-grade1', name: 'Grade 1', feeGroup: 'nursery-grade3' },
				{ classId: 'morning-grade2', name: 'Grade 2', feeGroup: 'nursery-grade3' },
				{ classId: 'morning-grade3', name: 'Grade 3', feeGroup: 'nursery-grade3' },
			],
			subjects: [
				{ name: 'Math', weight: 1 },
				{ name: 'General Science', weight: 1 },
				{ name: 'English', weight: 1 },
				{ name: 'Social Studies', weight: 1 },
				{ name: 'Health Science', weight: 1 },
				{ name: 'Physical Education', weight: 1 },
				{ name: 'Reading', weight: 1 },
				{ name: 'Writing', weight: 1 },
				{ name: 'Spelling', weight: 1 },
				{ name: 'Phonics', weight: 1 },
				{ name: 'Bible', weight: 1 },
				{ name: 'Drawing', weight: 1 },
			],
		},
		'Upper Elementary': {
			classes: [
				{ classId: 'morning-grade4', name: 'Grade 4', feeGroup: 'grade4-5' },
				{ classId: 'morning-grade5', name: 'Grade 5', feeGroup: 'grade4-5' },
				{ classId: 'morning-grade6', name: 'Grade 6', feeGroup: 'grade6' },
			],
			subjects: [
				{ name: 'Math', weight: 1 },
				{ name: 'General Science', weight: 1 },
				{ name: 'English', weight: 1 },
				{ name: 'French', weight: 1 },
				{ name: 'Social Studies', weight: 1 },
				{ name: 'Health Science', weight: 1 },
				{ name: 'Physical Education', weight: 1 },
				{ name: 'Computer', weight: 1 },
				{ name: 'Reading', weight: 1 },
				{ name: 'Writing', weight: 1 },
				{ name: 'Spelling', weight: 1 },
				{ name: 'Phonics', weight: 1 },
				{ name: 'Bible', weight: 1 },
			],
		},
		'Junior High': {
			classes: [
				{ classId: 'morning-grade7', name: 'Grade 7', feeGroup: 'grade7' },
				{ classId: 'morning-grade8', name: 'Grade 8', feeGroup: 'grade8' },
				{ classId: 'morning-grade9', name: 'Grade 9', feeGroup: 'grade9' },
			],
			subjects: [
				{ name: 'Math', weight: 1 },
				{ name: 'General Science', weight: 1 },
				{ name: 'English', weight: 1 },
				{ name: 'French', weight: 1 },
				{ name: 'Geography', weight: 1 },
				{ name: 'Health Science', weight: 1 },
				{ name: 'Physical Education', weight: 1 },
				{ name: 'Computer', weight: 1 },
				{ name: 'History', weight: 1 },
				{ name: 'Civics', weight: 1 },
				{ name: 'Vocabulary', weight: 1 },
				{ name: 'Phonics', weight: 1 },
				{ name: 'Bible', weight: 1 },
				{ name: 'Agriculture', weight: 1 },
				{ name: 'Literature', weight: 1 },
			],
		},
		'Senior High': {
			classes: [
				{ classId: 'morning-grade10', name: 'Grade 10', feeGroup: 'grade10' },
				{ classId: 'morning-grade11', name: 'Grade 11', feeGroup: 'grade11' },
				{ classId: 'morning-grade12', name: 'Grade 12', feeGroup: 'grade12' },
			],
			subjects: [
				{ name: 'Math', weight: 1 },
				{ name: 'Biology', weight: 1 },
				{ name: 'English', weight: 1 },
				{ name: 'Physics', weight: 1 },
				{ name: 'Chemistry', weight: 1 },
				{ name: 'Computer', weight: 1 },
				{ name: 'Economics', weight: 1 },
				{ name: 'Government', weight: 1 },
				{ name: 'Geography', weight: 1 },
				{ name: 'History', weight: 1 },
				{ name: 'Literature', weight: 1 },
				{ name: 'Accounting', weight: 1 },
				{ name: 'Bible', weight: 1 },
				{ name: 'French', weight: 1 },
				{ name: 'Agriculture', weight: 1 },
				{ name: 'Practical', weight: 1 },
				{ name: 'R.O.T.C', weight: 1 },
			],
		},
	},
};

// ---------------------------------------------------------------------------
// Default administrative positions
// ---------------------------------------------------------------------------

export const DEFAULT_ADMIN_POSITIONS = [
	{ id: 'principal', name: 'Principal' },
	{ id: 'dean', name: 'Dean of Students' },
	{ id: 'registrar', name: 'Registrar' },
	{ id: 'vpi', name: 'Vice Principal for Instruction (VPI)' },
	{ id: 'business_manager', name: 'Business Manager' },
	{ id: 'proprietor', name: 'Proprietor' },
];

// ---------------------------------------------------------------------------
// Default enabled features
// ---------------------------------------------------------------------------

export const DEFAULT_FEATURES = [
	'dashboard', 'calendar_events', 'community', 'profile_management',
	'ai_chat', 'grading_system', 'fee_payment', 'admissions',
	'user_management', 'academic_reports', 'school_settings',
	'notifications', 'support_system', 'apps', 'attendance',
];

// ---------------------------------------------------------------------------
// Default role feature access
// ---------------------------------------------------------------------------

export const DEFAULT_ROLE_FEATURE_ACCESS = {
	system_admin: [
		'dashboard', 'user_management', 'calendar_events', 'grading_system',
		'class_management', 'academic_reports', 'academic_resources',
		'attendance', 'admissions', 'profile_management', 'ai_chat',
		'notifications', 'school_settings', 'support_system',
	],
	teacher: [
		'dashboard', 'community', 'calendar_events', 'grading_system',
		'academic_resources', 'attendance', 'profile_management',
		'ai_chat', 'notifications',
	],
	student: [
		'dashboard', 'calendar_events', 'fee_payment', 'academic_reports',
		'attendance', 'community', 'profile_management', 'ai_chat',
		'notifications',
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
	givesDoublePromotion: false,
	givesDemotion: false,
};

// ---------------------------------------------------------------------------
// Build fee schedule scaffold from classLevels
// Generates a skeleton feeSchedules entry for the given academic year
// with a fee group for each unique feeGroup found in classLevels.
// ---------------------------------------------------------------------------

const EMPTY_FEE_GROUP = (label: string, classIds: string[]) => ({
	label,
	appliesTo: classIds,
	currency: 'LRD',
	tuitionAndRegistration: {
		old: { reg1stSem: 0, reg2ndSem: 0, tuition: 0, total: 0 },
		new: { reg1stSem: 0, reg2ndSem: 0, tuition: 0, total: 0 },
	},
	installments: [
		{ label: '1st (During Registration)', old: 0, new: 0 },
		{ label: '2nd', old: 0, new: 0 },
		{ label: '3rd', old: 0, new: 0 },
		{ label: '4th', old: 0, new: 0 },
	],
	requirements: [
		{ item: 'First Aid', amount: 0, dueAt: '1st' },
		{ item: 'PTA', amount: 0, dueAt: '1st' },
		{ item: 'Computerized ID Card', amount: 0, dueAt: '1st' },
		{ item: 'Breakage Fee', amount: 0, dueAt: '1st' },
	],
	accessories: [
		{ item: 'Uniform Set', amount: 0, dueAt: 'beforeRegistration', studentType: 'all' },
	],
});

export function buildFeeScheduleScaffold(classLevels: ClassLevels, academicYear: string): FeeSchedules {
	const feeGroupMap: Record<string, { label: string; classIds: string[] }> = {};

	for (const [_sessionName, session] of Object.entries(classLevels)) {
		for (const [levelName, level] of Object.entries(session)) {
			for (const cls of level.classes) {
				const fg = cls.feeGroup || 'default';
				if (!feeGroupMap[fg]) {
					feeGroupMap[fg] = { label: levelName, classIds: [] };
				}
				feeGroupMap[fg].classIds.push(cls.classId);
			}
		}
	}

	const sessionName = Object.keys(classLevels)[0] || 'Morning';
	const sessionFeeGroups: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(feeGroupMap)) {
		sessionFeeGroups[key] = EMPTY_FEE_GROUP(val.label, val.classIds);
	}

	return {
		[academicYear]: {
			paymentWindows: { '1st': 'During Registration' },
			[sessionName]: sessionFeeGroups,
		},
	};
}

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
