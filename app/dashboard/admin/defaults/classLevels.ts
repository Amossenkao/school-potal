import type { ClassLevels, AcademicPeriod, Semester } from '@/types/schoolProfile';

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

export const DEFAULT_PAYMENT_PLANS = [
	{
		id: 'full-payment', name: 'Full Payment', description: 'Pay all fees at registration', isActive: true,
		installments: [
			{ id: 'full-1st', label: '1st (During Registration)', percentage: '', fixedAmount: '', fixedAmountCurrency: 'LRD', dueWindow: '' },
		],
	},
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
		feeAdjustments: [],
	};
}
