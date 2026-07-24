// app/api/school/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Document } from 'mongoose';
import { SchoolSettings, SchoolProfile as SchoolProfileType } from '@/types/schoolProfile';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import { getTenantModels } from '@/models';
import { getSchoolMeshModels } from '@/models/schoolmesh';
import {
	getSchoolProfile,
	getTenantConnectionByDbName,
	setSchoolProfileMemoryCache,
	clearSchoolProfileMemoryCache,
} from '@/lib/mongoose';
import { destroyAllUserSessions } from '@/utils/session';
import { bumpUsersVersion, extractAcademicYears } from '@/utils/userSync';
import bcrypt from 'bcryptjs';
import { redis } from '@/lib/redis';
import {
	publishPublicSyncEventSafe,
	publishSyncEventsForAcademicYearsSafe,
	publishSyncEventSafe,
	resolveTenantSyncKey,
} from '@/lib/realtimeSync';
import { authorizeUser } from '@/proxy';
import { normalizeHost } from '@/utils/host';
import { TENANT_THEMES } from '@/lib/tenantTheme';

// --- Settings sanitization helpers (migrated from /api/settings) ---

const ACADEMIC_PERIOD_VALUES = [
	'first', 'second', 'third', 'third_period_exam',
	'fourth', 'fifth', 'sixth', 'sixth_period_exam',
] as const;

const SEMESTER_VALUES = ['first', 'second'] as const;
const ACADEMIC_YEAR_KEY_REGEX = /^\d{4}-\d{4}$/;

const sanitizePeriods = (value: any): string[] =>
	Array.isArray(value)
		? value.filter((p) => ACADEMIC_PERIOD_VALUES.includes(p))
		: [];

const sanitizeSemesters = (value: any): string[] =>
	Array.isArray(value) ? value.filter((s) => SEMESTER_VALUES.includes(s)) : [];

function sanitizeStudentSettings(raw: any): any {
	if (!raw || typeof raw !== 'object') return undefined;
	const reportAccessByYear: Record<string, any> = {};
	const byYear = raw.reportAccessByYear;
	if (byYear && typeof byYear === 'object') {
		for (const [year, value] of Object.entries(byYear)) {
			if (!ACADEMIC_YEAR_KEY_REGEX.test(year)) continue;
			const v: any = value || {};
			reportAccessByYear[year] = {
				enabled: !!v.enabled,
				yearlyReportAccess: !!v.yearlyReportAccess,
				periods: sanitizePeriods(v.periods),
				semesters: sanitizeSemesters(v.semesters),
			};
		}
	}
	return {
		loginAccess: raw.loginAccess !== undefined ? !!raw.loginAccess : true,
		reportAccessByYear,
	};
}

function sanitizeTeacherSettings(raw: any): any {
	if (!raw || typeof raw !== 'object') return undefined;
	const permissionsByYear: Record<string, any> = {};
	const byYear = raw.permissionsByYear;
	if (byYear && typeof byYear === 'object') {
		for (const [year, value] of Object.entries(byYear)) {
			if (!ACADEMIC_YEAR_KEY_REGEX.test(year)) continue;
			const v: any = value || {};
			permissionsByYear[year] = {
				enabled: !!v.enabled,
				gradeSubmission: {
					enabled: !!v.gradeSubmission?.enabled,
					periods: sanitizePeriods(v.gradeSubmission?.periods),
				},
				viewGradeSubmissions: { enabled: !!v.gradeChangeRequest?.viewGradeSubmissions?.enabled },
				gradeChangeRequest: {
					enabled: !!v.gradeChangeRequest?.enabled,
					periods: sanitizePeriods(v.gradeChangeRequest?.periods),
				},
				viewMasters: { enabled: !!v.viewMasters?.enabled },
			};
		}
	}
	return {
		loginAccess: raw.loginAccess !== undefined ? !!raw.loginAccess : true,
		permissionsByYear,
	};
}

function collectChangedYears(oldMap: any, newMap: any): string[] {
	const oldM = oldMap && typeof oldMap === 'object' ? oldMap : {};
	const newM = newMap && typeof newMap === 'object' ? newMap : {};
	const years = new Set<string>([...Object.keys(oldM), ...Object.keys(newM)]);
	const changed: string[] = [];
	years.forEach((year) => {
		const before = JSON.stringify(oldM[year] ?? null);
		const after = JSON.stringify(newM[year] ?? null);
		if (before !== after) changed.push(year);
	});
	return changed;
}

async function runWithConcurrency<T>(
	items: T[],
	worker: (item: T) => Promise<void>,
	concurrency = 8,
) {
	if (!Array.isArray(items) || items.length === 0) return;
	const maxConcurrency = Math.max(1, Math.min(concurrency, items.length));
	let cursor = 0;
	const runners = Array.from({ length: maxConcurrency }, async () => {
		while (cursor < items.length) {
			const index = cursor++;
			await worker(items[index]);
		}
	});
	await Promise.all(runners);
}

// --- Helpers ---

async function getTenantUserCounts(dbName: string) {
	try {
		const connection = await getTenantConnectionByDbName(dbName);
		if (!connection) return { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };
		const User = connection.models.User;
		if (!User) return { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };
		const [students, teachers, administrators, systemAdmins] = await Promise.all([
			User.countDocuments({ role: 'student', isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'teacher', isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'administrator', isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'system_admin', isActive: true }).catch(() => 0),
		]);
		return { students, teachers, administrators, systemAdmins };
	} catch {
		return { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };
	}
}

function unauthorized() {
	return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ============================================================================
// GET /api/school
// - system_admin (no params): returns their school profile (existing behavior)
// - superadmin ?stats=true: global platform stats
// - superadmin ?all=true: list all schools
// - superadmin ?host=X: get specific school by host
// - superadmin ?host=X&stats=true: per-school stats
// ============================================================================
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const stats = url.searchParams.get('stats');
		const all = url.searchParams.get('all');
		const host = url.searchParams.get('host');

		// --- Superadmin branches ---
		if (stats === 'true' || all === 'true' || host) {
			const currentUser = await authorizeUser(request, 'superadmin');
			if (!currentUser) return unauthorized();

			const { SchoolProfile } = await getSchoolMeshModels();

			// Global stats
			if (stats === 'true' && !host) {
				const schools = await SchoolProfile.find({})
					.select('host dbName name initials isActive')
					.lean().exec();

				const activeSchools = schools.filter((s: any) => s.isActive);
				const inactiveSchools = schools.filter((s: any) => !s.isActive);
				let totalStudents = 0, totalTeachers = 0, totalAdministrators = 0, totalSystemAdmins = 0;

				const dbNames = [...new Set(schools.map((s: any) => s.dbName).filter(Boolean))] as string[];
				const counts = await Promise.all(dbNames.map(getTenantUserCounts));
				for (const c of counts) {
					totalStudents += c.students;
					totalTeachers += c.teachers;
					totalAdministrators += c.administrators;
					totalSystemAdmins += c.systemAdmins;
				}

				const totalUsers = totalStudents + totalTeachers + totalAdministrators + totalSystemAdmins;
				const recentSchools = schools.slice(-5).reverse().map((s: any) => ({
					name: s.name, host: s.host, initials: s.initials, isActive: s.isActive,
				}));

				return NextResponse.json({
					schools: { total: schools.length, active: activeSchools.length, inactive: inactiveSchools.length },
					users: { total: totalUsers, students: totalStudents, teachers: totalTeachers, administrators: totalAdministrators, systemAdmins: totalSystemAdmins },
					recentSchools,
				});
			}

			// Per-school stats
			if (stats === 'true' && host) {
				const cleanHost = normalizeHost(host);
				const school = await SchoolProfile.findOne({ host: cleanHost }).select('host dbName name').lean().exec();
				if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

				const connection = await getTenantConnectionByDbName((school as any).dbName);
				if (!connection) return NextResponse.json({ students: 0, teachers: 0, administrators: 0, systemAdmins: 0, total: 0 });

				const User = connection.models.User;
				if (!User) return NextResponse.json({ students: 0, teachers: 0, administrators: 0, systemAdmins: 0, total: 0 });

				const [students, teachers, administrators, systemAdmins] = await Promise.all([
					User.countDocuments({ role: 'student', isActive: true }).catch(() => 0),
					User.countDocuments({ role: 'teacher', isActive: true }).catch(() => 0),
					User.countDocuments({ role: 'administrator', isActive: true }).catch(() => 0),
					User.countDocuments({ role: 'system_admin', isActive: true }).catch(() => 0),
				]);

				return NextResponse.json({ students, teachers, administrators, systemAdmins, total: students + teachers + administrators + systemAdmins });
			}

			// All schools
			if (all === 'true') {
				const schools = await SchoolProfile.find({})
					.select('host dbName name slogan shortName initials logoUrl isActive address phones emails administrativePositions sysAdmin settings.studentSettings.loginAccess settings.teacherSettings.loginAccess settings.administratorSettings.loginAccess')
					.lean().exec();
				return NextResponse.json({ schools });
			}

			// Specific school by host
			if (host) {
				const cleanHost = normalizeHost(host);
				const school = await SchoolProfile.findOne({ host: cleanHost }).lean().exec();
				if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });
				return NextResponse.json({ school });
			}
		}

		// --- Default: existing system_admin behavior (no auth required) ---
		const profile = await getSchoolProfile();
		if (!profile) {
			return NextResponse.json({ error: 'School profile not found' }, { status: 404 });
		}
		const plainProfile = JSON.parse(JSON.stringify(profile));
		return NextResponse.json(plainProfile);
	} catch (error) {
		console.error('API Error fetching school profile:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

// ============================================================================
// POST /api/school
// superadmin: create new school (full bootstrap)
// ============================================================================
export async function POST(request: NextRequest) {
	const currentUser = await authorizeUser(request, 'superadmin');
	if (!currentUser) return unauthorized();

	try {
		const body = await request.json();
		const { name, shortName, host, dbName, sysAdmin, slogan, initials } = body;

		if (!name || !shortName || !host || !dbName || !sysAdmin) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
		}

		const { SchoolProfile } = await getSchoolMeshModels();
		const existing = await SchoolProfile.findOne({ $or: [{ host }, { dbName }] }).lean();
		if (existing) {
			return NextResponse.json({ error: 'A school with this host or database name already exists' }, { status: 409 });
		}

		const now = new Date().getFullYear();
		const currentYear = `${now}/${now + 1}`;

		const newSchool = await SchoolProfile.create({
			isActive: true,
			host,
			dbName,
			name,
			slogan: slogan || '',
			shortName,
			initials: initials || shortName.slice(0, 2).toUpperCase(),
			studentIdPrefix: shortName.slice(0, 3).toUpperCase(),
			logoUrl: '',
			firstAcademicYear: currentYear,
			currentAcademicYear: currentYear,
			administrativePositions: [],
			sysAdmin: { name: sysAdmin.name || '', phone: sysAdmin.phone || '', email: sysAdmin.email || '' },
			themeName: 'horizon',
			enabledFeatures: ['dashboard', 'user_management', 'profile_management', 'homepage'],
			roleFeatureAccess: { student: [], teacher: [], system_admin: [], administrator: {} },
			settings: {
				studentSettings: { loginAccess: true, reportAccessByYear: {} },
				teacherSettings: { loginAccess: true, permissionsByYear: {} },
				administratorSettings: { loginAccess: true },
			},
			address: [],
			phones: [],
			emails: [],
		});

		return NextResponse.json({ school: newSchool }, { status: 201 });
	} catch (error: any) {
		console.error('[school] POST error:', error);
		return NextResponse.json({ error: error.message || 'Failed to create school' }, { status: 500 });
	}
}

// ============================================================================
// PUT /api/school
// - superadmin with ?host=X: update school profile (all fields)
// - system_admin (no host param): update settings (migrated from /api/settings)
// ============================================================================
export async function PUT(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const hostParam = url.searchParams.get('host');

		// --- Superadmin: update school profile ---
		if (hostParam) {
			const currentUser = await authorizeUser(request, 'superadmin');
			if (!currentUser) return unauthorized();

			const cleanHost = normalizeHost(hostParam);
			const body = await request.json();
			const { SchoolProfile } = await getSchoolMeshModels();

			const school = await SchoolProfile.findOneAndUpdate(
				{ host: cleanHost },
				{ $set: body },
				{ new: true, runValidators: true },
			).lean();

			if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

			clearSchoolProfileMemoryCache(cleanHost);
			await redis.del(`school_profile:${cleanHost}`);

			await publishSyncEventSafe({
				tenantId: cleanHost,
				domain: 'school',
				reason: 'school-updated',
				payload: { school },
			});

			return NextResponse.json({ school });
		}

		// --- System admin: update settings (migrated from /api/settings POST) ---
		const currentUser = await authorizeUser(request, 'system_admin');
		if (!currentUser) {
			return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const host = request.headers.get('host');
		if (!host) {
			return NextResponse.json({ success: false, message: 'Host header is missing.' }, { status: 400 });
		}
		const cleanHost = normalizeHost(host);
		if (!cleanHost) {
			return NextResponse.json({ success: false, message: 'Unable to resolve tenant host.' }, { status: 400 });
		}

		const { Student, Teacher, Administrator } = await getTenantModels();
		const tenantsConnection = await (await import('@/lib/mongoose')).connectToTenantsDb();
		const SchoolProfileTenants =
			tenantsConnection.models.Profile ||
			tenantsConnection.model<SchoolProfileType & Document>('Profile', SchoolProfileSchema);

		const currentSchool: any = await SchoolProfileTenants.findOne({ host: cleanHost }).lean();
		if (!currentSchool) {
			return NextResponse.json({ success: false, message: 'School profile not found.' }, { status: 404 });
		}

		const tenantId = resolveTenantSyncKey({
			schoolProfile: currentSchool,
			tenantId: currentUser.tenantId,
			host: cleanHost,
		});

		const oldSettings = currentSchool?.settings;
		const body = await request.json();
		const {
			currentAcademicYear,
			studentSettings: rawStudentSettings,
			teacherSettings: rawTeacherSettings,
			administratorSettings,
			reportCardThemes,
			themeName,
			bulkUserActions,
			bulkPasswordResets,
		} = body;

		const studentSettings = rawStudentSettings !== undefined ? sanitizeStudentSettings(rawStudentSettings) : undefined;
		const teacherSettings = rawTeacherSettings !== undefined ? sanitizeTeacherSettings(rawTeacherSettings) : undefined;

		const updateObject: any = {};

		if (currentAcademicYear) {
			updateObject.currentAcademicYear = currentAcademicYear;
		}

		const hasSettingsPatch =
			studentSettings !== undefined ||
			teacherSettings !== undefined ||
			administratorSettings !== undefined ||
			reportCardThemes !== undefined;

		if (hasSettingsPatch) {
			const existingSettings = currentSchool?.settings || {};
			updateObject.settings = {
				...existingSettings,
				...(studentSettings !== undefined ? { studentSettings } : {}),
				...(teacherSettings !== undefined ? { teacherSettings } : {}),
				...(administratorSettings !== undefined ? { administratorSettings } : {}),
				...(reportCardThemes !== undefined ? { reportCardThemes } : {}),
			} as SchoolSettings;
		}

		if (themeName !== undefined) {
			if (typeof themeName !== 'string') {
				return NextResponse.json(
					{ success: false, message: `Invalid themeName. Expected one of: ${TENANT_THEMES.join(', ')}.` },
					{ status: 400 },
				);
			}
			updateObject.themeName = themeName;
		}

		const updatedSchoolProfile = await SchoolProfileTenants.findOneAndUpdate(
			{ host: cleanHost },
			{ $set: updateObject },
			{ new: true },
		).lean();

		if (!updatedSchoolProfile) {
			return NextResponse.json({ success: false, message: 'Failed to update school profile.' }, { status: 500 });
		}

		// Update caches
		const cacheKey = `school_profile:${cleanHost}`;
		await redis.set(cacheKey, JSON.stringify(updatedSchoolProfile), { ex: 60 * 60 * 24 * 30 });
		setSchoolProfileMemoryCache(cleanHost, updatedSchoolProfile);

		const quickCacheKey = `school_settings:${cleanHost}`;
		await redis.set(
			quickCacheKey,
			JSON.stringify({
				currentAcademicYear: updatedSchoolProfile.currentAcademicYear,
				settings: updatedSchoolProfile.settings,
				themeName: updatedSchoolProfile.themeName,
			}),
			{ ex: 60 * 5 },
		);

		// Destroy sessions for roles whose login access was just revoked
		if (oldSettings) {
			const sessionDestructionPromises: Promise<void>[] = [];

			if (oldSettings.studentSettings?.loginAccess === true && studentSettings?.loginAccess === false) {
				const studentsToLogout = await Student.find({ role: 'student' }).select('_id').lean();
				studentsToLogout.forEach((student: any) =>
					sessionDestructionPromises.push(destroyAllUserSessions(student._id.toString())),
				);
			}
			if (oldSettings.teacherSettings?.loginAccess === true && teacherSettings?.loginAccess === false) {
				const teachersToLogout = await Teacher.find({ role: 'teacher' }).select('_id').lean();
				teachersToLogout.forEach((teacher: any) =>
					sessionDestructionPromises.push(destroyAllUserSessions(teacher._id.toString())),
				);
			}
			if (oldSettings.administratorSettings?.loginAccess === true && administratorSettings?.loginAccess === false) {
				const adminsToLogout = await Administrator.find({ role: 'administrator' }).select('_id').lean();
				adminsToLogout.forEach((admin: any) =>
					sessionDestructionPromises.push(destroyAllUserSessions(admin._id.toString())),
				);
			}

			await Promise.all(sessionDestructionPromises);
		}

		// Perform Bulk User Actions
		if (bulkUserActions && Object.keys(bulkUserActions).length > 0) {
			const affectedYearsSet = new Set<string>();
			const collectAffectedYears = (users: any[]) => {
				users.forEach((user: any) => {
					extractAcademicYears(user).forEach((year) => {
						if (year) affectedYearsSet.add(year);
					});
				});
			};

			const processBulkAction = async (role: string, Model: any, action: 'activate' | 'deactivate') => {
				const isActive = action === 'activate';
				const usersToUpdate = await Model.find({ role, isActive: { $ne: isActive } })
					.select('_id role studentId classId academicYears subjects').lean();
				if (usersToUpdate.length === 0) return;

				const targetIds = usersToUpdate.map((user: any) => user._id);
				await Model.updateMany({ _id: { $in: targetIds } }, { $set: { isActive } });
				collectAffectedYears(usersToUpdate);

				if (!isActive) {
					await runWithConcurrency(
						usersToUpdate,
						async (user: any) => destroyAllUserSessions(user._id.toString()),
						25,
					);
				}
			};

			const processBulkPasswordReset = async (role: string, Model: any, commonPassword?: string) => {
				const usersToUpdate = await Model.find({ role })
					.select('_id username role studentId classId academicYears subjects').lean();
				if (usersToUpdate.length === 0) return;
				collectAffectedYears(usersToUpdate);

				const trimmedCommon = typeof commonPassword === 'string' ? commonPassword.trim() : '';

				if (trimmedCommon) {
					const hashedPassword = await bcrypt.hash(trimmedCommon, 12);
					await Model.updateMany(
						{ role },
						{ $set: { password: hashedPassword, defaultPassword: trimmedCommon, mustChangePassword: true, updatedAt: new Date() } },
					);
				} else {
					const bulkUpdates: any[] = [];
					await runWithConcurrency(
						usersToUpdate,
						async (user: any) => {
							const defaultPassword = String(user.username || '');
							const hashedPassword = await bcrypt.hash(defaultPassword, 12);
							bulkUpdates.push({
								updateOne: {
									filter: { _id: user._id },
									update: { $set: { password: hashedPassword, defaultPassword, mustChangePassword: true, updatedAt: new Date() } },
								},
							});
						},
						8,
					);
					if (bulkUpdates.length > 0) {
						await Model.bulkWrite(bulkUpdates, { ordered: false });
					}
				}

				await runWithConcurrency(
					usersToUpdate,
					async (user: any) => destroyAllUserSessions(user._id.toString()),
					25,
				);
			};

			const actionsToRun: Promise<void>[] = [];
			if (bulkUserActions['all-students']) {
				if (bulkUserActions['all-students'] === 'reset') {
					actionsToRun.push(processBulkPasswordReset('student', Student, bulkPasswordResets?.['all-students']));
				} else {
					actionsToRun.push(processBulkAction('student', Student, bulkUserActions['all-students']));
				}
			}
			if (bulkUserActions['all-teachers']) {
				if (bulkUserActions['all-teachers'] === 'reset') {
					actionsToRun.push(processBulkPasswordReset('teacher', Teacher, bulkPasswordResets?.['all-teachers']));
				} else {
					actionsToRun.push(processBulkAction('teacher', Teacher, bulkUserActions['all-teachers']));
				}
			}
			if (bulkUserActions['all-administrators']) {
				if (bulkUserActions['all-administrators'] === 'reset') {
					actionsToRun.push(processBulkPasswordReset('administrator', Administrator, bulkPasswordResets?.['all-administrators']));
				} else {
					actionsToRun.push(processBulkAction('administrator', Administrator, bulkUserActions['all-administrators']));
				}
			}

			await Promise.all(actionsToRun);

			if (affectedYearsSet.size > 0) {
				await bumpUsersVersion(Array.from(affectedYearsSet));
				await publishSyncEventsForAcademicYearsSafe({
					tenantId,
					domain: 'users',
					academicYears: Array.from(affectedYearsSet),
					actorId: currentUser.id,
					reason: 'bulk-user-action',
				});
			}
		}

		// Notify affected academic years
		const changedSettingsYears = new Set<string>();
		if (studentSettings !== undefined) {
			collectChangedYears(oldSettings?.studentSettings?.reportAccessByYear, studentSettings.reportAccessByYear)
				.forEach((year) => changedSettingsYears.add(year));
		}
		if (teacherSettings !== undefined) {
			collectChangedYears(oldSettings?.teacherSettings?.permissionsByYear, teacherSettings.permissionsByYear)
				.forEach((year) => changedSettingsYears.add(year));
		}
		if (changedSettingsYears.size > 0) {
			await publishSyncEventsForAcademicYearsSafe({
				tenantId,
				domain: 'school',
				academicYears: Array.from(changedSettingsYears),
				actorId: currentUser.id,
				reason: 'school-settings-updated',
			});
		}

		await publishSyncEventSafe({
			tenantId,
			domain: 'school',
			academicYear: String(updatedSchoolProfile.currentAcademicYear || ''),
			actorId: currentUser.id,
			reason: 'school-settings-updated',
		});
		await publishPublicSyncEventSafe({
			tenantId,
			domain: 'school',
			academicYear: String(updatedSchoolProfile.currentAcademicYear || ''),
			actorId: currentUser.id,
			reason: 'school-settings-updated',
		});

		return NextResponse.json({
			success: true,
			message: 'Settings and user actions applied successfully.',
			data: {
				currentAcademicYear: updatedSchoolProfile.currentAcademicYear,
				settings: updatedSchoolProfile.settings,
				themeName: updatedSchoolProfile.themeName,
			},
		});
	} catch (error) {
		console.error('Failed to update school settings:', error);
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
		return NextResponse.json(
			{ success: false, message: 'Failed to update school settings.', error: errorMessage },
			{ status: 500 },
		);
	}
}

// ============================================================================
// PATCH /api/school?host=X
// superadmin: toggle school active status
// ============================================================================
export async function PATCH(request: NextRequest) {
	const currentUser = await authorizeUser(request, 'superadmin');
	if (!currentUser) return unauthorized();

	try {
		const url = new URL(request.url);
		const hostParam = url.searchParams.get('host');
		if (!hostParam) return NextResponse.json({ error: 'host query parameter is required' }, { status: 400 });

		const cleanHost = normalizeHost(hostParam);
		const body = await request.json();
		const { SchoolProfile } = await getSchoolMeshModels();

		const school = await SchoolProfile.findOneAndUpdate(
			{ host: cleanHost },
			{ $set: body },
			{ new: true, runValidators: true },
		).lean();

		if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

		clearSchoolProfileMemoryCache(cleanHost);
		await redis.del(`school_profile:${cleanHost}`);

		await publishSyncEventSafe({
			tenantId: cleanHost,
			domain: 'school',
			reason: body.isActive !== undefined ? 'school-toggled-active' : 'school-updated',
			payload: { school },
		});

		return NextResponse.json({ school });
	} catch (error: any) {
		console.error('[school] PATCH error:', error);
		return NextResponse.json({ error: error.message || 'Failed to update school' }, { status: 500 });
	}
}

// ============================================================================
// DELETE /api/school?host=X
// superadmin: delete school
// ============================================================================
export async function DELETE(request: NextRequest) {
	const currentUser = await authorizeUser(request, 'superadmin');
	if (!currentUser) return unauthorized();

	try {
		const url = new URL(request.url);
		const hostParam = url.searchParams.get('host');
		if (!hostParam) return NextResponse.json({ error: 'host query parameter is required' }, { status: 400 });

		const cleanHost = normalizeHost(hostParam);
		const { SchoolProfile } = await getSchoolMeshModels();

		const result = await SchoolProfile.findOneAndDelete({ host: cleanHost }).lean();
		if (!result) return NextResponse.json({ error: 'School not found' }, { status: 404 });

		clearSchoolProfileMemoryCache(cleanHost);
		await redis.del(`school_profile:${cleanHost}`);

		await publishSyncEventSafe({
			tenantId: cleanHost,
			domain: 'school',
			reason: 'school-deleted',
			payload: { host: cleanHost },
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('[school] DELETE error:', error);
		return NextResponse.json({ error: error.message || 'Failed to delete school' }, { status: 500 });
	}
}
