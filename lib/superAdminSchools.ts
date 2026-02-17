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

export interface SchoolSummary {
	id: string;
	host: string;
	dbName: string;
	shortName: string;
	displayName: string;
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
	return Promise.all(schools.map((profile: any) => toSummary(profile)));
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

export const buildNewSchoolProfilePayload = (input: Record<string, any>) => {
	const host = normalizeHost(String(input.host || ''));
	const displayName = String(
		input.displayName || input.name || input.shortName || host || 'New School',
	).trim();
	const shortName = String(input.shortName || displayName || host).trim();
	const dbName = String(input.dbName || inferDbNameFromHost(host || shortName));
	const initials = inferInitials(shortName);
	const academicYear = String(input.currentAcademicYear || getAcademicYear());
	const firstAcademicYear = String(input.firstAcademicYear || academicYear);
	const sysAdminName = String(input.sysAdminName || 'System Admin');
	const sysAdminPhone = String(input.sysAdminPhone || '0000000000');
	const sysAdminEmail = input.sysAdminEmail
		? String(input.sysAdminEmail)
		: undefined;
	const sysAdminOffice = String(input.sysAdminOffice || 'Main Office');

	return {
		isActive: input.isActive !== false,
		host,
		dbName,
		name: [displayName],
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
		enabledFeatures: Array.isArray(input.enabledFeatures)
			? input.enabledFeatures
			: DEFAULT_ENABLED_FEATURES,
		roleFeatureAccess: {
			student: [],
			teacher: [],
			system_admin: DEFAULT_ENABLED_FEATURES,
			administrator: DEFAULT_ADMIN_ROLE_ACCESS,
		},
		financialProfile: input.financialProfile || {},
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
		whyChoose: [],
		facilities: [],
		team: [],
		address: [],
		phones: [],
		emails: [],
		hours: [],
		quickLinks: [],
		academicLinks: [],
		footerLinks: [],
		classLevels: {},
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
	if (typeof payload.tagline === 'string') {
		school.tagline = payload.tagline;
	}
	if (typeof payload.description === 'string') {
		school.description = payload.description;
	}
	if (typeof payload.logoUrl === 'string') {
		school.logoUrl = payload.logoUrl;
	}
	if (typeof payload.themeName === 'string') {
		school.themeName = payload.themeName;
	}
	if (typeof payload.isActive === 'boolean') {
		school.isActive = payload.isActive;
	}

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
	return toSummary(school.toObject());
};

export const deleteSchool = async (schoolId: string) => {
	const school = await getSchoolById(schoolId);
	if (!school) {
		throw new Error('School not found.');
	}

	const host = String(school.host || '');
	await school.deleteOne();
	await clearSchoolProfileCache(host);
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

	return toSummary(school.toObject());
};
