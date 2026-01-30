import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { getSession } from '@/utils/session';

// Helper to determine the current academic year based on current date
function getAcademicYear(): string {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	// Academic years usually run July to June
	return currentMonth >= 7
		? `${currentYear}-${currentYear + 1}`
		: `${currentYear - 1}-${currentYear}`;
}

export async function GET(req: NextRequest) {
	try {
		const session = await getSession(req);
		if (!session) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const models = await getTenantModels(req);
		const currentUserId = session.userId;
		const currentYear = getAcademicYear();

		// Fetch the current user to determine permissions and context (like classId)
		const currentUser = await models.User.findById(currentUserId);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'User not found' },
				{ status: 404 },
			);
		}

		const userRole = currentUser.role;
		let studentsList: any[] = [];
		let teachersList: any[] = [];
		let adminsList: any[] = [];

		/**
		 * 1. DATA FETCHING LOGIC BASED ON ROLE
		 */
		if (userRole === 'student') {
			const myClassId = (currentUser as any).classId;

			// Students see: Classmates in their specific class
			studentsList = await models.User.find({
				role: 'student',
				classId: myClassId,
				_id: { $ne: currentUserId },
				isActive: true,
			});

			// Students see: Teachers assigned to their class this year
			teachersList = await models.User.find({
				role: 'teacher',
				isActive: true,
				subjects: {
					$elemMatch: {
						year: currentYear,
						'classes.classId': myClassId,
					},
				},
			});

			// Students see: All administrators
			adminsList = await models.User.find({
				role: 'administrator',
				isActive: true,
			});
		} else if (userRole === 'teacher') {
			const teacherSubjects = (currentUser as any).subjects || [];
			const currentYearData = teacherSubjects.find(
				(s: any) => s.year === currentYear,
			);
			const myClassIds =
				currentYearData?.classes.map((c: any) => c.classId) || [];

			// Teachers see: Students they currently teach
			studentsList = await models.User.find({
				role: 'student',
				classId: { $in: myClassIds },
				isActive: true,
			});

			// Teachers see: All fellow teachers
			teachersList = await models.User.find({
				role: 'teacher',
				_id: { $ne: currentUserId },
				isActive: true,
			});

			// Teachers see: All administrators
			adminsList = await models.User.find({
				role: 'administrator',
				isActive: true,
			});
		} else if (['administrator', 'system_admin'].includes(userRole)) {
			// Admins see everyone in the school directory
			studentsList = await models.User.find({
				role: 'student',
				isActive: true,
			});
			teachersList = await models.User.find({
				role: 'teacher',
				isActive: true,
			});
			adminsList = await models.User.find({
				role: 'administrator',
				_id: { $ne: currentUserId },
				isActive: true,
			});
		}

		/**
		 * 2. PRIVACY & FIELD FILTERING LOGIC
		 */
		const responseData = {
			students: studentsList.map((s) => ({
				firstName: s.firstName,
				lastName: s.lastName,
				email: s.email,
				phone:
					userRole !== 'student' || s.shareContactWithClassmates
						? s.phone
						: undefined,
				avatar: s.avatar || s.profilePictureUrl,
				bio: s.bio,
				nickname: s.nickname,
				gender: s.gender,
				className: s.className,
				role: 'student',
			})),

			teachers: teachersList.map((t) => ({
				firstName: t.firstName,
				lastName: t.lastName,
				email: t.email,
				phone: t.phone, // Always returned for staff
				avatar: t.avatar || t.profilePictureUrl,
				bio: t.bio,
				nickname: t.nickname,
				gender: t.gender,
				// Return subjects relevant to the current year
				subjects:
					t.subjects
						?.find((s: any) => s.year === currentYear)
						?.classes.flatMap((c: any) => c.subjects) || [],
				role: 'teacher',
			})),

			administrators: adminsList.map((a) => ({
				firstName: a.firstName,
				lastName: a.lastName,
				email: a.email,
				phone: a.phone, // Always returned for staff
				avatar: a.avatar || a.profilePictureUrl,
				bio: a.bio,
				nickname: a.nickname,
				gender: a.gender,
				position: a.position,
				role: 'administrator',
			})),
		};

		return NextResponse.json({
			success: true,
			data: responseData,
		});
	} catch (error: any) {
		console.error('Error in Community GET handler:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal Server Error' },
			{ status: 500 },
		);
	}
}
