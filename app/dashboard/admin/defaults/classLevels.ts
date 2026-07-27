import type { ClassLevels, AcademicPeriod, Semester } from '@/types/schoolProfile';

// ---------------------------------------------------------------------------
// Default class levels — common structure for Liberian schools
// ---------------------------------------------------------------------------

export const DEFAULT_CLASS_LEVELS: ClassLevels = {
	Morning: {
		'Daycare Division': {
			isSelfContained: true,
			classes: [
				{ classId: 'morning_nursery', name: 'Nursery' },
				{ classId: 'morning_abc', name: 'ABC' },
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
				{ classId: 'morning_k1', name: 'K 1' },
				{ classId: 'morning_k2', name: 'K 2' },
				{ classId: 'morning_grade_1', name: 'Grade 1' },
				{ classId: 'morning_grade_2', name: 'Grade 2' },
				{ classId: 'morning_grade_3', name: 'Grade 3' },
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
				{ classId: 'morning_grade_4', name: 'Grade 4' },
				{ classId: 'morning_grade_5', name: 'Grade 5' },
				{ classId: 'morning_grade_6', name: 'Grade 6' },
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
				{ classId: 'morning_grade_7', name: 'Grade 7' },
				{ classId: 'morning_grade_8', name: 'Grade 8' },
				{ classId: 'morning_grade_9', name: 'Grade 9' },
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
				{ classId: 'morning_grade_10', name: 'Grade 10' },
				{ classId: 'morning_grade_11', name: 'Grade 11' },
				{ classId: 'morning_grade_12', name: 'Grade 12' },
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
		scholarships: [],
	};
}
