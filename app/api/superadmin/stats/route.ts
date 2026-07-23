import { NextResponse } from 'next/server';
import { connectToTenantsDb, getTenantConnectionByDbName } from '@/lib/mongoose';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import UserSchema from '@/models/user/User';
import StudentSchema from '@/models/user/Student';
import TeacherSchema from '@/models/user/Teacher';
import AdministratorSchema from '@/models/user/Administrator';

async function getProfileModel() {
	const conn = await connectToTenantsDb();
	return (conn.models.Profile || conn.model('Profile', SchoolProfileSchema)) as any;
}

async function getTenantUserCounts(dbName: string) {
	try {
		const connection = await getTenantConnectionByDbName(dbName);
		if (!connection) return { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };

		const User = (connection.models.User || connection.model('User', UserSchema)) as any;

		if (!User.discriminators?.student) {
			User.discriminator('student', StudentSchema);
		}
		if (!User.discriminators?.teacher) {
			User.discriminator('teacher', TeacherSchema);
		}
		if (!User.discriminators?.administrator) {
			User.discriminator('administrator', AdministratorSchema);
		}

		const StudentModel = User.discriminators.student;
		const TeacherModel = User.discriminators.teacher;
		const AdministratorModel = User.discriminators.administrator;

		const [students, teachers, administrators, systemAdmins] = await Promise.all([
			StudentModel.countDocuments({ isActive: true }).catch(() => 0),
			TeacherModel.countDocuments({ isActive: true }).catch(() => 0),
			AdministratorModel.countDocuments({ isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'system_admin', isActive: true }).catch(() => 0),
		]);

		return { students, teachers, administrators, systemAdmins };
	} catch {
		return { students: 0, teachers: 0, administrators: 0, systemAdmins: 0 };
	}
}

export async function GET() {
	try {
		const ProfileModel = await getProfileModel();
		const schools = await ProfileModel.find({})
			.select('host dbName name initials isActive')
			.lean()
			.exec();

		const activeSchools = schools.filter((s: any) => s.isActive);
		const inactiveSchools = schools.filter((s: any) => !s.isActive);

		let totalStudents = 0;
		let totalTeachers = 0;
		let totalAdministrators = 0;
		let totalSystemAdmins = 0;

		const dbNames = [...new Set(schools.map((s: any) => s.dbName).filter(Boolean))] as string[];

		const counts = await Promise.all(dbNames.map(getTenantUserCounts));

		for (const c of counts) {
			totalStudents += c.students;
			totalTeachers += c.teachers;
			totalAdministrators += c.administrators;
			totalSystemAdmins += c.systemAdmins;
		}

		const totalUsers = totalStudents + totalTeachers + totalAdministrators + totalSystemAdmins;

		const recentSchools = schools
			.slice(-5)
			.reverse()
			.map((s: any) => ({
				name: s.name,
				host: s.host,
				initials: s.initials,
				isActive: s.isActive,
			}));

		return NextResponse.json({
			schools: {
				total: schools.length,
				active: activeSchools.length,
				inactive: inactiveSchools.length,
			},
			users: {
				total: totalUsers,
				students: totalStudents,
				teachers: totalTeachers,
				administrators: totalAdministrators,
				systemAdmins: totalSystemAdmins,
			},
			recentSchools,
		});
	} catch (error: any) {
		console.error('[superadmin/stats] GET error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load stats' }, { status: 500 });
	}
}
