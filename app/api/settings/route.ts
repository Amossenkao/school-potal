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
			};
		case 'teacher':
			return {
				...baseUser,
				teacherId: user.teacherId,
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
				{ status: 400 }
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
				SchoolProfileSchema
			);

		// --- MODIFICATION: Fetch current settings BEFORE updating ---
		const currentSchool: any = await SchoolProfile.findOne({
			host: cleanHost,
		}).lean();
		const oldSettings = currentSchool?.settings;

		const body = await request.json();
		const {
			studentSettings,
			teacherSettings,
			administratorSettings,
			bulkUserActions,
		} = body;

		// 1. Update School Settings on the Profile document
		if (studentSettings && teacherSettings && administratorSettings) {
			const newSettings: SchoolSettings = {
				studentSettings,
				teacherSettings,
				administratorSettings,
			};
			const updatedSchoolProfile = await SchoolProfile.findOneAndUpdate(
				{ host: cleanHost },
				{ $set: { settings: newSettings } },
				{ new: true }
			).lean();

			if (updatedSchoolProfile) {
				const cacheKey = `school_profile:${cleanHost}`;
				await redis.set(cacheKey, JSON.stringify(updatedSchoolProfile), {
					ex: 60 * 60 * 24 * 30,
				});
			}
		}

		// --- MODIFICATION: Check for login access changes and destroy sessions ---
		if (oldSettings) {
			const sessionDestructionPromises: any = [];

			// Check for Student login deactivation
			if (
				oldSettings.studentSettings.loginAccess === true &&
				studentSettings.loginAccess === false
			) {
				const studentsToLogout = await Student.find({ role: 'student' })
					.select('_id')
					.lean();
				studentsToLogout.forEach((student: any) =>
					sessionDestructionPromises.push(
						destroyAllUserSessions(student._id.toString())
					)
				);
			}

			// Check for Teacher login deactivation
			if (
				oldSettings.teacherSettings.loginAccess === true &&
				teacherSettings.loginAccess === false
			) {
				const teachersToLogout = await Teacher.find({ role: 'teacher' })
					.select('_id')
					.lean();
				teachersToLogout.forEach((teacher: any) =>
					sessionDestructionPromises.push(
						destroyAllUserSessions(teacher._id.toString())
					)
				);
			}

			// Check for Administrator login deactivation
			if (
				oldSettings.administratorSettings.loginAccess === true &&
				administratorSettings.loginAccess === false
			) {
				const adminsToLogout = await Administrator.find({
					role: 'administrator',
				})
					.select('_id')
					.lean();
				adminsToLogout.forEach((admin: any) =>
					sessionDestructionPromises.push(
						destroyAllUserSessions(admin._id.toString())
					)
				);
			}

			// Execute all session destructions concurrently
			await Promise.all(sessionDestructionPromises);
		}

		// 2. Perform Bulk User Actions (Activate/Deactivate)
		if (bulkUserActions && Object.keys(bulkUserActions).length > 0) {
			const processBulkAction = async (
				role: string,
				Model: any,
				action: 'activate' | 'deactivate'
			) => {
				const isActive = action === 'activate';
				const usersToUpdate = await Model.find({ role }).lean();
				if (usersToUpdate.length === 0) return;

				await Model.updateMany({ role }, { $set: { isActive } });

				const sessionUpdatePromises = usersToUpdate.map((user: any) => {
					const updatedSessionData = buildUserResponse({ ...user, isActive });
					return updateAllUserSessions(user._id.toString(), updatedSessionData);
				});
				await Promise.all(sessionUpdatePromises);
			};

			const actionsToRun = [];
			if (bulkUserActions['all-students']) {
				actionsToRun.push(
					processBulkAction('student', Student, bulkUserActions['all-students'])
				);
			}
			if (bulkUserActions['all-teachers']) {
				actionsToRun.push(
					processBulkAction('teacher', Teacher, bulkUserActions['all-teachers'])
				);
			}
			if (bulkUserActions['all-administrators']) {
				actionsToRun.push(
					processBulkAction(
						'administrator',
						Administrator,
						bulkUserActions['all-administrators']
					)
				);
			}

			await Promise.all(actionsToRun);
		}

		return NextResponse.json({
			success: true,
			message: 'Settings and user actions applied successfully.',
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
			{ status: 500 }
		);
	}
}
