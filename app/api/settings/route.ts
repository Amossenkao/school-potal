// app/api/settings/route.ts

import { NextResponse } from 'next/server';
import mongoose, { Document } from 'mongoose';
import {
	SchoolSettings,
	SchoolProfile as SchoolProfileType,
} from '@/types/schoolProfile';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import { getTenantModels } from '@/models';
import { updateAllUserSessions, destroyAllUserSessions } from '@/utils/session';
import { bumpUsersVersion, extractAcademicYears } from '@/utils/userSync';
import bcrypt from 'bcryptjs';
import { redis } from '@/lib/redis';

// Helper function to build a consistent user object for session data.
function buildUserResponse(user: any) {
	const baseUser = {
		userId: user._id?.toString() ?? user.userId,
		username: user.username,
		firstName: user.firstName,
		middleName: user.middleName,
		lastName: user.lastName,
		role: user.role,
		isActive: user.isActive,
	};
	switch (user.role) {
		case 'student':
			return {
				...baseUser,
				studentId: user.studentId,
				classId: user.classId,
				className: user.className,
				classLevel: user.classLevel,
				session: user.session,
				shareContactWithClassmates: user.shareContactWithClassmates ?? false,
			};
		case 'teacher':
			return {
				...baseUser,
				subjects: user.subjects,
				sponsorClass: user.sponsorClass,
			};
		case 'administrator':
			return { ...baseUser, adminId: user.adminId, position: user.position };
		default:
			return baseUser;
	}
}

/**
 * Handles updating school settings and performing bulk user actions.
 * @param request The incoming Next.js request object.
 */
export async function POST(request: Request) {
	try {
		const host = request.headers.get('host');
		if (!host) {
			return NextResponse.json(
				{ success: false, message: 'Host header is missing.' },
				{ status: 400 },
			);
		}
		const cleanHost = host.split(':')[0];

		const { Student, Teacher, Administrator } = await getTenantModels();

		await mongoose.connect(process.env.MONGODB_URI || '', {
			dbName: 'tenants',
		});

		const SchoolProfile =
			mongoose.models.Profile ||
			mongoose.model<SchoolProfileType & Document>(
				'Profile',
				SchoolProfileSchema,
			);

		// Fetch current settings BEFORE updating
		const currentSchool: any = await SchoolProfile.findOne({
			host: cleanHost,
		}).lean();

		if (!currentSchool) {
			return NextResponse.json(
				{ success: false, message: 'School profile not found.' },
				{ status: 404 },
			);
		}

		const oldSettings = currentSchool?.settings;

		const body = await request.json();
		const {
			currentAcademicYear,
			studentSettings,
			teacherSettings,
			administratorSettings,
			bulkUserActions,
			bulkPasswordResets,
		} = body;

		// Prepare update object
		const updateObject: any = {};

		// 1. Update Current Academic Year if provided
		if (currentAcademicYear) {
			updateObject.currentAcademicYear = currentAcademicYear;
		}

		// 2. Update School Settings
		if (studentSettings && teacherSettings && administratorSettings) {
			const newSettings: SchoolSettings = {
				studentSettings,
				teacherSettings,
				administratorSettings,
			};
			updateObject.settings = newSettings;
		}

		// Update the school profile
		const updatedSchoolProfile = await SchoolProfile.findOneAndUpdate(
			{ host: cleanHost },
			{ $set: updateObject },
			{ new: true },
		).lean();

		if (!updatedSchoolProfile) {
			return NextResponse.json(
				{ success: false, message: 'Failed to update school profile.' },
				{ status: 500 },
			);
		}

		// Update cache immediately
		const cacheKey = `school_profile:${cleanHost}`;
		await redis.set(cacheKey, JSON.stringify(updatedSchoolProfile), {
			ex: 60 * 60 * 24 * 30, // 30 days
		});

		// Also update a shorter TTL cache for frequently accessed data
		const quickCacheKey = `school_settings:${cleanHost}`;
		await redis.set(
			quickCacheKey,
			JSON.stringify({
				currentAcademicYear: updatedSchoolProfile.currentAcademicYear,
				settings: updatedSchoolProfile.settings,
			}),
			{
				ex: 60 * 5, // 5 minutes for quick access
			},
		);

		// Check for login access changes and destroy sessions if needed
		if (oldSettings) {
			const sessionDestructionPromises: Promise<void>[] = [];

			// Check for Student login deactivation
			if (
				oldSettings.studentSettings?.loginAccess === true &&
				studentSettings?.loginAccess === false
			) {
				const studentsToLogout = await Student.find({ role: 'student' })
					.select('_id')
					.lean();
				studentsToLogout.forEach((student: any) =>
					sessionDestructionPromises.push(
						destroyAllUserSessions(student._id.toString()),
					),
				);
			}

			// Check for Teacher login deactivation
			if (
				oldSettings.teacherSettings?.loginAccess === true &&
				teacherSettings?.loginAccess === false
			) {
				const teachersToLogout = await Teacher.find({ role: 'teacher' })
					.select('_id')
					.lean();
				teachersToLogout.forEach((teacher: any) =>
					sessionDestructionPromises.push(
						destroyAllUserSessions(teacher._id.toString()),
					),
				);
			}

			// Check for Administrator login deactivation
			if (
				oldSettings.administratorSettings?.loginAccess === true &&
				administratorSettings?.loginAccess === false
			) {
				const adminsToLogout = await Administrator.find({
					role: 'administrator',
				})
					.select('_id')
					.lean();
				adminsToLogout.forEach((admin: any) =>
					sessionDestructionPromises.push(
						destroyAllUserSessions(admin._id.toString()),
					),
				);
			}

			// Execute all session destructions concurrently
			await Promise.all(sessionDestructionPromises);
		}

		// 3. Perform Bulk User Actions (Activate/Deactivate)
		if (bulkUserActions && Object.keys(bulkUserActions).length > 0) {
			const processBulkAction = async (
				role: string,
				Model: any,
				action: 'activate' | 'deactivate',
			) => {
				const isActive = action === 'activate';
				const usersToUpdate = await Model.find({ role }).lean();
				if (usersToUpdate.length === 0) return;

				await Model.updateMany({ role }, { $set: { isActive } });

				if (!isActive) {
					const sessionDestructionPromises = usersToUpdate.map((user: any) =>
						destroyAllUserSessions(user._id.toString()),
					);
					await Promise.all(sessionDestructionPromises);
					return;
				}

				const sessionUpdatePromises = usersToUpdate.map((user: any) => {
					const updatedSessionData = buildUserResponse({ ...user, isActive });
					return updateAllUserSessions(user._id.toString(), updatedSessionData);
				});
				await Promise.all(sessionUpdatePromises);

				const affectedYears = usersToUpdate.flatMap((user: any) =>
					extractAcademicYears(user),
				);
				await bumpUsersVersion(affectedYears);
			};

			const processBulkPasswordReset = async (
				role: string,
				Model: any,
				commonPassword?: string,
			) => {
				const usersToUpdate = await Model.find({ role }).lean();
				if (usersToUpdate.length === 0) return;

				const trimmedCommon =
					typeof commonPassword === 'string' ? commonPassword.trim() : '';

				if (trimmedCommon) {
					const hashedPassword = await bcrypt.hash(trimmedCommon, 12);
					await Model.updateMany(
						{ role },
						{
							$set: {
								password: hashedPassword,
								defaultPassword: trimmedCommon,
								mustChangePassword: true,
								updatedAt: new Date(),
							},
						},
					);
				} else {
					const bulkUpdates = await Promise.all(
						usersToUpdate.map(async (user: any) => {
							const defaultPassword = String(user.username || '');
							const hashedPassword = await bcrypt.hash(defaultPassword, 12);
							return {
								updateOne: {
									filter: { _id: user._id },
									update: {
										$set: {
											password: hashedPassword,
											defaultPassword,
											mustChangePassword: true,
											updatedAt: new Date(),
										},
									},
								},
							};
						}),
					);

					if (bulkUpdates.length > 0) {
						await Model.bulkWrite(bulkUpdates);
					}
				}

				const sessionDestructionPromises = usersToUpdate.map((user: any) =>
					destroyAllUserSessions(user._id.toString()),
				);
				await Promise.all(sessionDestructionPromises);

				const affectedYears = usersToUpdate.flatMap((user: any) =>
					extractAcademicYears(user),
				);
				await bumpUsersVersion(affectedYears);
			};

			const actionsToRun = [];
			if (bulkUserActions['all-students']) {
				if (bulkUserActions['all-students'] === 'reset') {
					actionsToRun.push(
						processBulkPasswordReset(
							'student',
							Student,
							bulkPasswordResets?.['all-students'],
						),
					);
				} else {
					actionsToRun.push(
						processBulkAction(
							'student',
							Student,
							bulkUserActions['all-students'],
						),
					);
				}
			}
			if (bulkUserActions['all-teachers']) {
				if (bulkUserActions['all-teachers'] === 'reset') {
					actionsToRun.push(
						processBulkPasswordReset(
							'teacher',
							Teacher,
							bulkPasswordResets?.['all-teachers'],
						),
					);
				} else {
					actionsToRun.push(
						processBulkAction(
							'teacher',
							Teacher,
							bulkUserActions['all-teachers'],
						),
					);
				}
			}
			if (bulkUserActions['all-administrators']) {
				if (bulkUserActions['all-administrators'] === 'reset') {
					actionsToRun.push(
						processBulkPasswordReset(
							'administrator',
							Administrator,
							bulkPasswordResets?.['all-administrators'],
						),
					);
				} else {
					actionsToRun.push(
						processBulkAction(
							'administrator',
							Administrator,
							bulkUserActions['all-administrators'],
						),
					);
				}
			}

			await Promise.all(actionsToRun);
		}

		return NextResponse.json({
			success: true,
			message: 'Settings and user actions applied successfully.',
			data: {
				currentAcademicYear: updatedSchoolProfile.currentAcademicYear,
				settings: updatedSchoolProfile.settings,
			},
		});
	} catch (error) {
		console.error('Failed to update school settings:', error);
		const errorMessage =
			error instanceof Error ? error.message : 'An unknown error occurred';
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to update school settings.',
				error: errorMessage,
			},
			{ status: 500 },
		);
	}
}

/**
 * GET endpoint to fetch current school settings
 */
export async function GET(request: Request) {
	try {
		const host = request.headers.get('host');
		if (!host) {
			return NextResponse.json(
				{ success: false, message: 'Host header is missing.' },
				{ status: 400 },
			);
		}
		const cleanHost = host.split(':')[0];

		// Try to get from cache first
		const quickCacheKey = `school_settings:${cleanHost}`;
		const cachedData = await redis.get(quickCacheKey);

		if (cachedData) {
			return NextResponse.json({
				success: true,
				data: JSON.parse(cachedData as string),
				source: 'cache',
			});
		}

		// If not in cache, fetch from database
		await mongoose.connect(process.env.MONGODB_URI || '', {
			dbName: 'tenants',
		});

		const SchoolProfile =
			mongoose.models.Profile ||
			mongoose.model<SchoolProfileType & Document>(
				'Profile',
				SchoolProfileSchema,
			);

		const school = await SchoolProfile.findOne({ host: cleanHost })
			.select('currentAcademicYear settings')
			.lean();

		if (!school) {
			return NextResponse.json(
				{ success: false, message: 'School profile not found.' },
				{ status: 404 },
			);
		}

		// Update cache
		await redis.set(
			quickCacheKey,
			JSON.stringify({
				currentAcademicYear: school.currentAcademicYear,
				settings: school.settings,
			}),
			{
				ex: 60 * 5, // 5 minutes
			},
		);

		return NextResponse.json({
			success: true,
			data: {
				currentAcademicYear: school.currentAcademicYear,
				settings: school.settings,
			},
			source: 'database',
		});
	} catch (error) {
		console.error('Failed to fetch school settings:', error);
		const errorMessage =
			error instanceof Error ? error.message : 'An unknown error occurred';
		return NextResponse.json(
			{
				success: false,
				message: 'Failed to fetch school settings.',
				error: errorMessage,
			},
			{ status: 500 },
		);
	}
}
