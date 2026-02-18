import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { redis } from '@/lib/redis';
import {
	connectToTenantsDb,
	getTenantConnectionByDbName,
} from '@/lib/mongoose';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import UserSchema from '@/models/user/User';
import type SchoolProfile, { FeatureKey } from '@/types/schoolProfile';
import { addSuperAdminNotification } from '@/lib/superAdminNotifications';

export interface SchoolSummary {
	id: string;
	host: string;
	dbName: string;
	shortName: string;
	displayName: string;
	logoUrl?: string;
	tagline: string;
	description: string;
	isActive: boolean;
	themeName?: string;
	sysAdminProfile: {
		name: string;
		phone: string;
		email?: string;
		office: string;
	};
	systemAdminUser: {
		id: string;
		username: string;
		firstName: string;
		lastName: string;
		phone: string;
		email?: string;
		isActive: boolean;
	} | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface AdminInput {
	name?: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	password?: string;
	phone?: string;
	email?: string;
	address?: string;
	gender?: string;
	dateOfBirth?: string;
	office?: string;
	isActive?: boolean;
}

export interface ActiveUserItem {
	id: string;
	name: string;
	username: string;
	phone?: string;
	email?: string;
	isActive: boolean;
	role: 'student' | 'teacher' | 'administrator' | 'system_admin';
	details?: Record<string, any>;
}

export interface SchoolDetailResult {
	school: SchoolSummary;
	profile: Record<string, any>;
	academicYears: string[];
	selectedAcademicYear: string;
	activeUsers: {
		students: ActiveUserItem[];
		teachers: ActiveUserItem[];
		administrators: ActiveUserItem[];
		systemAdmins: ActiveUserItem[];
	};
	activeUserCounts: {
		students: number;
		teachers: number;
		administrators: number;
		systemAdmins: number;
	};
}

const DEFAULT_ENABLED_FEATURES: FeatureKey[] = [
	'dashboard',
	'user_management',
	'profile_management',
	'homepage',
	'calendar_events',
	'grading_system',
	'academic_reports',
	'academic_resources',
	'class_management',
	'notifications',
	'support_system',
	'school_settings',
	'school_profile',
	'enrollment_info',
];

const DEFAULT_ADMIN_ROLE_ACCESS: Record<string, FeatureKey[]> = {
	principal: DEFAULT_ENABLED_FEATURES,
};

const EXCLUDED_PROFILE_KEYS = new Set([
	'_id',
	'__v',
	'settings',
	'whyChoose',
	'facilities',
	'team',
	'quickLinks',
	'academicLinks',
	'footerLinks',
	'heroImageUrl',
	'createdAt',
	'updatedAt',
]);

const normalizeHost = (value: string) =>
	String(value || '')
		.trim()
		.toLowerCase();

const inferDbNameFromHost = (host: string) =>
	host
		.replace(/\.[a-z]+$/i, '')
		.replace(/[^a-z0-9]/gi, '_')
		.toLowerCase();

const inferInitials = (value: string) =>
	value
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0]?.toUpperCase() || '')
		.join('')
		.slice(0, 5) || 'SCH';

const splitName = (input?: string, fallback = 'System Admin') => {
	const value = String(input || fallback).trim();
	const [firstName, ...rest] = value.split(/\s+/);
	return {
		firstName: firstName || 'System',
		lastName: rest.join(' ') || 'Admin',
	};
};

const asString = (value: unknown, fallback = '') =>
	typeof value === 'string' ? value.trim() : fallback;

const parseStringArray = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.map((entry) => String(entry).trim()).filter(Boolean);
	}
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
	return [];
};

const toPlain = (value: any) => JSON.parse(JSON.stringify(value || {}));

const SUPERADMIN_LIST_CONCURRENCY = (() => {
	const parsed = Number.parseInt(
		process.env.SUPERADMIN_LIST_SCHOOL_CONCURRENCY || '4',
		10,
	);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
})();

const mapWithConcurrency = async <T, R>(
	items: T[],
	worker: (item: T) => Promise<R>,
	concurrency: number,
): Promise<R[]> => {
	if (!Array.isArray(items) || items.length === 0) return [];
	const maxConcurrency = Math.max(1, Math.min(concurrency, items.length));
	const output: R[] = new Array(items.length);
	let cursor = 0;

	const runners = Array.from({ length: maxConcurrency }, async () => {
		while (cursor < items.length) {
			const currentIndex = cursor;
			cursor += 1;
			output[currentIndex] = await worker(items[currentIndex]);
		}
	});

	await Promise.all(runners);
	return output;
};

const getProfileModel = async () => {
	const connection = await connectToTenantsDb();
	return (
		connection.models.Profile ||
		connection.model<SchoolProfile>('Profile', SchoolProfileSchema)
	);
};

const getTenantUserModel = async (dbName: string) => {
	const connection = await getTenantConnectionByDbName(dbName);
	if (!connection) return null;
	return connection.models.User || connection.model('User', UserSchema);
};

const getTenantSystemAdminUser = async (dbName: string) => {
	try {
		const User = await getTenantUserModel(dbName);
		if (!User) return null;

		const admin = await User.findOne({ role: 'system_admin' })
			.select('username firstName lastName phone email isActive')
			.lean();
		if (!admin) return null;

		return {
			id: String(admin._id),
			username: String(admin.username || ''),
			firstName: String(admin.firstName || ''),
			lastName: String(admin.lastName || ''),
			phone: String(admin.phone || ''),
			email: admin.email ? String(admin.email) : undefined,
			isActive: Boolean(admin.isActive),
		};
	} catch (error) {
		console.warn(`[superadmin] Failed to read tenant system admin (${dbName}):`, error);
		return null;
	}
};

const schoolDisplayName = (profile: any) => {
	if (Array.isArray(profile?.name) && profile.name.length > 0) {
		return String(profile.name[0]);
	}
	return String(profile?.shortName || profile?.host || 'School');
};

const toSummary = async (profile: any): Promise<SchoolSummary> => ({
	id: String(profile._id),
	host: String(profile.host || ''),
	dbName: String(profile.dbName || ''),
	shortName: String(profile.shortName || ''),
	displayName: schoolDisplayName(profile),
	logoUrl: profile.logoUrl ? String(profile.logoUrl) : undefined,
	tagline: String(profile.tagline || ''),
	description: String(profile.description || ''),
	isActive: Boolean(profile.isActive),
	themeName: profile.themeName ? String(profile.themeName) : undefined,
	sysAdminProfile: {
		name: String(profile?.sysAdmin?.name || ''),
		phone: String(profile?.sysAdmin?.phone || ''),
		email: profile?.sysAdmin?.email
			? String(profile.sysAdmin.email)
			: undefined,
		office: String(profile?.sysAdmin?.office || 'Main Office'),
	},
	systemAdminUser: await getTenantSystemAdminUser(String(profile.dbName || '')),
	createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : undefined,
	updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : undefined,
});

const sanitizeSchoolProfileForSuperAdmin = (profile: any) => {
	const plain = toPlain(profile);
	const sanitized: Record<string, any> = {
		id: String(profile?._id || ''),
	};

	Object.entries(plain).forEach(([key, value]) => {
		if (EXCLUDED_PROFILE_KEYS.has(key)) return;
		sanitized[key] = value;
	});

	return sanitized;
};

const toActiveUser = (raw: any, role: ActiveUserItem['role']): ActiveUserItem => ({
	id: String(raw?._id || ''),
	name: `${raw?.firstName || ''} ${raw?.lastName || ''}`.trim() || raw?.username,
	username: String(raw?.username || ''),
	phone: raw?.phone ? String(raw.phone) : undefined,
	email: raw?.email ? String(raw.email) : undefined,
	isActive: Boolean(raw?.isActive),
	role,
	details:
		role === 'student'
			? {
				studentId: raw?.studentId,
				className: raw?.className,
			}
			: role === 'teacher'
				? {
					sponsorClass: raw?.sponsorClass || null,
				}
				: role === 'administrator'
					? {
						position: raw?.position,
					}
					: undefined,
});

const academicYearSort = (a: string, b: string) => {
	const aStart = Number.parseInt(String(a).split(/[-/]/)[0], 10);
	const bStart = Number.parseInt(String(b).split(/[-/]/)[0], 10);
	if (!Number.isNaN(aStart) && !Number.isNaN(bStart) && aStart !== bStart) {
		return bStart - aStart;
	}
	return String(b).localeCompare(String(a));
};

const resolveAcademicYears = async (User: any, profile: any) => {
	const years = new Set<string>();

	if (profile?.currentAcademicYear) {
		years.add(String(profile.currentAcademicYear));
	}
	if (profile?.firstAcademicYear) {
		years.add(String(profile.firstAcademicYear));
	}
	if (profile?.classLevels && typeof profile.classLevels === 'object') {
		Object.keys(profile.classLevels).forEach((year) => {
			if (year) years.add(String(year));
		});
	}

	const [studentYears, teacherYears, administratorYears] = await Promise.all([
		User.distinct('academicYears.year', { role: 'student' }),
		User.distinct('subjects.year', { role: 'teacher' }),
		User.distinct('academicYears.year', { role: 'administrator' }),
	]);

	[studentYears, teacherYears, administratorYears]
		.flat()
		.filter(Boolean)
		.forEach((year) => years.add(String(year)));

	if (years.size === 0) {
		years.add(getAcademicYear());
	}

	return Array.from(years).sort(academicYearSort);
};

const loadActiveUsersByAcademicYear = async (
	User: any,
	academicYear: string,
) => {
	const [studentsRaw, teachersRaw, administratorsRaw, systemAdminsRaw] =
		await Promise.all([
			User.find({
				role: 'student',
				isActive: true,
				'academicYears.year': academicYear,
			})
				.select('firstName lastName username phone email isActive studentId className')
				.lean(),
			User.find({
				role: 'teacher',
				isActive: true,
				$or: [
					{ 'subjects.year': academicYear },
					{ subjects: { $exists: false } },
					{ subjects: { $size: 0 } },
				],
			})
				.select('firstName lastName username phone email isActive sponsorClass')
				.lean(),
			User.find({
				role: 'administrator',
				isActive: true,
				$or: [
					{ 'academicYears.year': academicYear },
					{ academicYears: { $exists: false } },
					{ academicYears: { $size: 0 } },
				],
			})
				.select('firstName lastName username phone email isActive position')
				.lean(),
			User.find({
				role: 'system_admin',
				isActive: true,
			})
				.select('firstName lastName username phone email isActive')
				.lean(),
		]);

	const students = studentsRaw.map((entry: any) => toActiveUser(entry, 'student'));
	const teachers = teachersRaw.map((entry: any) => toActiveUser(entry, 'teacher'));
	const administrators = administratorsRaw.map((entry: any) =>
		toActiveUser(entry, 'administrator'),
	);
	const systemAdmins = systemAdminsRaw.map((entry: any) =>
		toActiveUser(entry, 'system_admin'),
	);

	return {
		students,
		teachers,
		administrators,
		systemAdmins,
		counts: {
			students: students.length,
			teachers: teachers.length,
			administrators: administrators.length,
			systemAdmins: systemAdmins.length,
		},
	};
};

export const clearSchoolProfileCache = async (host?: string) => {
	if (!host) return;
	try {
		await redis.del(`school_profile:${host}`);
	} catch (error) {
		console.warn(`[superadmin] Failed to clear cache for host ${host}:`, error);
	}
};

export const listSchools = async (): Promise<SchoolSummary[]> => {
	const Profile = await getProfileModel();
	const schools = await Profile.find({}).sort({ createdAt: -1 }).lean();
	return mapWithConcurrency(
		schools,
		(profile: any) => toSummary(profile),
		SUPERADMIN_LIST_CONCURRENCY,
	);
};

export const getSchoolById = async (id: string): Promise<any | null> => {
	if (!Types.ObjectId.isValid(id)) return null;
	const Profile = await getProfileModel();
	return Profile.findById(id);
};

const getAcademicYear = () => {
	const now = new Date();
	const year = now.getFullYear();
	return `${year}-${year + 1}`;
};

export const getSchoolDetailById = async (
	schoolId: string,
	requestedAcademicYear?: string,
): Promise<SchoolDetailResult> => {
	const school = await getSchoolById(schoolId);
	if (!school) {
		throw new Error('School not found.');
	}

	const User = await getTenantUserModel(String(school.dbName));
	if (!User) {
		throw new Error('Unable to connect to the tenant database.');
	}

	const academicYears = await resolveAcademicYears(User, school);
	const selectedAcademicYear =
		requestedAcademicYear && academicYears.includes(requestedAcademicYear)
			? requestedAcademicYear
			: String(school.currentAcademicYear || academicYears[0] || getAcademicYear());

	const activeUsers = await loadActiveUsersByAcademicYear(User, selectedAcademicYear);

	return {
		school: await toSummary(school.toObject()),
		profile: sanitizeSchoolProfileForSuperAdmin(school.toObject()),
		academicYears,
		selectedAcademicYear,
		activeUsers: {
			students: activeUsers.students,
			teachers: activeUsers.teachers,
			administrators: activeUsers.administrators,
			systemAdmins: activeUsers.systemAdmins,
		},
		activeUserCounts: activeUsers.counts,
	};
};

export const buildNewSchoolProfilePayload = (input: Record<string, any>) => {
	const host = normalizeHost(String(input.host || ''));
	const displayName = String(
		input.displayName || input.name || input.shortName || host || 'New School',
	).trim();
	const shortName = String(input.shortName || displayName || host).trim();
	const dbName = String(input.dbName || inferDbNameFromHost(host || shortName));
	const initials = String(input.initials || inferInitials(shortName));
	const academicYear = String(input.currentAcademicYear || getAcademicYear());
	const firstAcademicYear = String(input.firstAcademicYear || academicYear);

	const sysAdminSource =
		input.sysAdmin && typeof input.sysAdmin === 'object' ? input.sysAdmin : {};
	const sysAdminName = String(
		sysAdminSource.name || input.sysAdminName || 'System Admin',
	);
	const sysAdminPhone = String(
		sysAdminSource.phone || input.sysAdminPhone || '0000000000',
	);
	const sysAdminEmail =
		sysAdminSource.email || input.sysAdminEmail
			? String(sysAdminSource.email || input.sysAdminEmail)
			: undefined;
	const sysAdminOffice = String(
		sysAdminSource.office || input.sysAdminOffice || 'Main Office',
	);

	const enabledFeatures = Array.isArray(input.enabledFeatures)
		? input.enabledFeatures
		: DEFAULT_ENABLED_FEATURES;

	const roleFeatureAccess =
		input.roleFeatureAccess && typeof input.roleFeatureAccess === 'object'
			? input.roleFeatureAccess
			: {
					student: [],
					teacher: [],
					system_admin: DEFAULT_ENABLED_FEATURES,
					administrator: DEFAULT_ADMIN_ROLE_ACCESS,
				};

	return {
		isActive: input.isActive !== false,
		host,
		dbName,
		name: Array.isArray(input.name) ? input.name : [displayName],
		slogan: String(input.slogan || `${shortName} Excellence in Education`),
		shortName,
		initials,
		studentIdPrefix: String(input.studentIdPrefix || initials),
		logoUrl: String(
			input.logoUrl ||
				`https://placehold.co/200x200/0B3A6E/FFFFFF?text=${encodeURIComponent(
					initials,
				)}`,
		),
		logoUrl2: input.logoUrl2 ? String(input.logoUrl2) : undefined,
		description: String(
			input.description ||
				`${displayName} operates on SchoolMesh for modern academic and administrative workflows.`,
		),
		heroImageUrl: input.heroImageUrl ? String(input.heroImageUrl) : undefined,
		tagline: String(input.tagline || 'Connecting Schools. Empowering Learning.'),
		yearFounded: Number(input.yearFounded || new Date().getFullYear()),
		firstAcademicYear,
		currentAcademicYear: academicYear,
		administrativePositions: Array.isArray(input.administrativePositions)
			? input.administrativePositions
			: [
					{ id: 'principal', name: 'Principal' },
					{ id: 'vice_principal', name: 'Vice Principal' },
				],
		sysAdmin: {
			name: sysAdminName,
			phone: sysAdminPhone,
			email: sysAdminEmail,
			office: sysAdminOffice,
		},
		enabledFeatures,
		roleFeatureAccess,
		financialProfile:
			input.financialProfile && typeof input.financialProfile === 'object'
				? input.financialProfile
				: {},
		settings: input.settings || {
			studentSettings: {
				loginAccess: true,
				yearlyReportAccess: true,
				reportAccessPeriods: [],
				reportAccessSemesters: [],
			},
			teacherSettings: {
				loginAccess: true,
				gradeSubmissionPeriods: [],
				gradeSubmissionAcademicYears: [],
				viewMastersAcademicYears: [],
				viewGradeSubmissionsAcademicYears: [],
				gradeChangeRequestAcademicYears: [],
				gradeChangeRequestPeriods: [],
			},
			administratorSettings: {
				loginAccess: true,
			},
			gradingSettings: {
				passMark: 60,
				gradeScale: { min: 0, max: 100 },
				failuerWeight: 0.5,
				givesDoublePromotion: false,
				givesDemotion: false,
			},
		},
		themeName: input.themeName ? String(input.themeName) : 'horizon',
		whyChoose: Array.isArray(input.whyChoose) ? input.whyChoose : [],
		facilities: Array.isArray(input.facilities) ? input.facilities : [],
		team: Array.isArray(input.team) ? input.team : [],
		address: parseStringArray(input.address),
		phones: parseStringArray(input.phones),
		emails: parseStringArray(input.emails),
		hours: parseStringArray(input.hours),
		quickLinks: Array.isArray(input.quickLinks) ? input.quickLinks : [],
		academicLinks: Array.isArray(input.academicLinks) ? input.academicLinks : [],
		footerLinks: Array.isArray(input.footerLinks) ? input.footerLinks : [],
		classLevels:
			input.classLevels && typeof input.classLevels === 'object'
				? input.classLevels
				: {},
	};
};

export const createSchool = async (payload: Record<string, any>) => {
	const Profile = await getProfileModel();
	const document = buildNewSchoolProfilePayload(payload);

	if (!document.host || !document.dbName || !document.shortName) {
		throw new Error('host, dbName, and shortName are required.');
	}

	const existing = await Profile.findOne({
		$or: [{ host: document.host }, { dbName: document.dbName }],
	})
		.select('_id host dbName')
		.lean();
	if (existing) {
		throw new Error('A school with the same host or dbName already exists.');
	}

	const created = await Profile.create(document);
	await clearSchoolProfileCache(document.host);
	await addSuperAdminNotification({
		title: 'School Created',
		message: `${created.shortName} (${created.host}) was onboarded.`,
		type: 'success',
		metadata: {
			schoolId: String(created._id),
			host: created.host,
		},
	});
	return toSummary(created.toObject());
};

export const updateSchoolProfile = async (
	schoolId: string,
	payload: Record<string, any>,
) => {
	const school = await getSchoolById(schoolId);
	if (!school) {
		throw new Error('School not found.');
	}

	const previousHost = String(school.host || '');
	const previousShortName = String(school.shortName || '');

	if (typeof payload.host === 'string' && payload.host.trim()) {
		school.host = normalizeHost(payload.host);
	}
	if (typeof payload.dbName === 'string' && payload.dbName.trim()) {
		school.dbName = payload.dbName.trim();
	}
	if (typeof payload.shortName === 'string' && payload.shortName.trim()) {
		school.shortName = payload.shortName.trim();
	}
	if (typeof payload.displayName === 'string' && payload.displayName.trim()) {
		school.name = [payload.displayName.trim()];
	}
	if (typeof payload.slogan === 'string') {
		school.slogan = payload.slogan;
	}
	if (typeof payload.tagline === 'string') {
		school.tagline = payload.tagline;
	}
	if (typeof payload.description === 'string') {
		school.description = payload.description;
	}
	if (typeof payload.logoUrl === 'string') {
		school.logoUrl = payload.logoUrl;
	}
	if (typeof payload.logoUrl2 === 'string') {
		school.logoUrl2 = payload.logoUrl2;
	}
	if (typeof payload.studentIdPrefix === 'string') {
		school.studentIdPrefix = payload.studentIdPrefix;
	}
	if (typeof payload.currentAcademicYear === 'string') {
		school.currentAcademicYear = payload.currentAcademicYear;
	}
	if (typeof payload.firstAcademicYear === 'string') {
		school.firstAcademicYear = payload.firstAcademicYear;
	}
	if (typeof payload.yearFounded === 'number' && Number.isFinite(payload.yearFounded)) {
		school.yearFounded = payload.yearFounded;
	}
	if (typeof payload.themeName === 'string') {
		school.themeName = payload.themeName;
	}
	if (typeof payload.isActive === 'boolean') {
		school.isActive = payload.isActive;
	}
	if (payload.enabledFeatures && Array.isArray(payload.enabledFeatures)) {
		school.enabledFeatures = payload.enabledFeatures;
	}
	if (payload.roleFeatureAccess && typeof payload.roleFeatureAccess === 'object') {
		school.roleFeatureAccess = payload.roleFeatureAccess;
	}
	if (payload.administrativePositions && Array.isArray(payload.administrativePositions)) {
		school.administrativePositions = payload.administrativePositions;
	}
	if (payload.classLevels && typeof payload.classLevels === 'object') {
		school.classLevels = payload.classLevels;
	}
	if ('address' in payload) school.address = parseStringArray(payload.address);
	if ('phones' in payload) school.phones = parseStringArray(payload.phones);
	if ('emails' in payload) school.emails = parseStringArray(payload.emails);
	if ('hours' in payload) school.hours = parseStringArray(payload.hours);

	if (payload.sysAdmin && typeof payload.sysAdmin === 'object') {
		school.sysAdmin = {
			...school.sysAdmin,
			...(typeof payload.sysAdmin.name === 'string'
				? { name: payload.sysAdmin.name }
				: {}),
			...(typeof payload.sysAdmin.phone === 'string'
				? { phone: payload.sysAdmin.phone }
				: {}),
			...(typeof payload.sysAdmin.email === 'string'
				? { email: payload.sysAdmin.email }
				: {}),
			...(typeof payload.sysAdmin.office === 'string'
				? { office: payload.sysAdmin.office }
				: {}),
		};
	}

	await school.save();
	await clearSchoolProfileCache(previousHost);
	await clearSchoolProfileCache(String(school.host || ''));
	await addSuperAdminNotification({
		title: 'School Updated',
		message: `${previousShortName || school.shortName} profile was updated.`,
		type: 'info',
		metadata: {
			schoolId,
			host: school.host,
		},
	});
	return toSummary(school.toObject());
};

export const deleteSchool = async (schoolId: string) => {
	const school = await getSchoolById(schoolId);
	if (!school) {
		throw new Error('School not found.');
	}

	const host = String(school.host || '');
	const shortName = String(school.shortName || host);
	await school.deleteOne();
	await clearSchoolProfileCache(host);
	await addSuperAdminNotification({
		title: 'School Deleted',
		message: `${shortName} (${host}) was removed.`,
		type: 'warning',
		metadata: {
			schoolId,
			host,
		},
	});
};

export const createSchoolSystemAdmin = async (
	schoolId: string,
	payload: AdminInput,
) => {
	const school = await getSchoolById(schoolId);
	if (!school) {
		throw new Error('School not found.');
	}

	if (!payload.username || !payload.password || !payload.phone) {
		throw new Error('username, password, and phone are required.');
	}

	const User = await getTenantUserModel(String(school.dbName));
	if (!User) {
		throw new Error('Unable to connect to the tenant database.');
	}

	const existing = await User.findOne({ role: 'system_admin' }).lean();
	if (existing) {
		throw new Error('This school already has a system admin account.');
	}

	const fullName = payload.name || school.sysAdmin?.name || 'System Admin';
	const resolved = splitName(fullName);
	const passwordHash = await bcrypt.hash(String(payload.password), 10);

	const createdAdmin = await User.create({
		role: 'system_admin',
		firstName: payload.firstName || resolved.firstName,
		lastName: payload.lastName || resolved.lastName,
		username: String(payload.username).trim(),
		password: passwordHash,
		gender: payload.gender || 'unspecified',
		dateOfBirth: payload.dateOfBirth || '1990-01-01',
		phone: String(payload.phone).trim(),
		email: payload.email ? String(payload.email).trim() : undefined,
		address: payload.address || `${school.shortName || 'School'} Campus`,
		isActive: payload.isActive !== false,
		mustChangePassword: true,
	});

	school.sysAdmin = {
		...school.sysAdmin,
		name: `${createdAdmin.firstName} ${createdAdmin.lastName}`.trim(),
		phone: createdAdmin.phone,
		email: createdAdmin.email,
		office: payload.office || school.sysAdmin?.office || 'Main Office',
	};
	await school.save();
	await clearSchoolProfileCache(String(school.host || ''));
	await addSuperAdminNotification({
		title: 'System Admin Created',
		message: `System admin account created for ${school.shortName}.`,
		type: 'success',
		metadata: {
			schoolId,
			username: createdAdmin.username,
		},
	});

	return toSummary(school.toObject());
};

export const updateSchoolSystemAdmin = async (
	schoolId: string,
	payload: AdminInput,
) => {
	const school = await getSchoolById(schoolId);
	if (!school) {
		throw new Error('School not found.');
	}

	const User = await getTenantUserModel(String(school.dbName));
	if (!User) {
		throw new Error('Unable to connect to the tenant database.');
	}

	const existing = await User.findOne({ role: 'system_admin' });
	if (!existing) {
		throw new Error('No existing system admin account found for this school.');
	}

	if (payload.name) {
		const resolved = splitName(payload.name);
		existing.firstName = payload.firstName || resolved.firstName;
		existing.lastName = payload.lastName || resolved.lastName;
	}
	if (payload.firstName) existing.firstName = payload.firstName;
	if (payload.lastName) existing.lastName = payload.lastName;
	if (payload.username) existing.username = payload.username.trim();
	if (payload.phone) existing.phone = payload.phone.trim();
	if (typeof payload.email === 'string') {
		existing.email = payload.email.trim() || undefined;
	}
	if (typeof payload.isActive === 'boolean') {
		existing.isActive = payload.isActive;
	}
	if (payload.address) existing.address = payload.address;
	if (payload.gender) existing.gender = payload.gender;
	if (payload.dateOfBirth) existing.dateOfBirth = payload.dateOfBirth;
	if (payload.password) {
		existing.password = await bcrypt.hash(String(payload.password), 10);
		existing.mustChangePassword = true;
	}

	await existing.save();

	school.sysAdmin = {
		...school.sysAdmin,
		name: `${existing.firstName} ${existing.lastName}`.trim(),
		phone: existing.phone,
		email: existing.email,
		office: payload.office || school.sysAdmin?.office || 'Main Office',
	};
	await school.save();
	await clearSchoolProfileCache(String(school.host || ''));
	await addSuperAdminNotification({
		title: 'System Admin Updated',
		message: `System admin account updated for ${school.shortName}.`,
		type: 'info',
		metadata: {
			schoolId,
			username: existing.username,
		},
	});

	return toSummary(school.toObject());
};
