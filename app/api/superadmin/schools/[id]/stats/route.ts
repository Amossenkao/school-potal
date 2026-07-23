import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const ProfileModel = await getProfileModel();
		const school = await ProfileModel.findOne({ host: id }).select('host dbName name').lean().exec();

		if (!school) {
			return NextResponse.json({ error: 'School not found' }, { status: 404 });
		}

		const connection = await getTenantConnectionByDbName(school.dbName);
		if (!connection) {
			return NextResponse.json({
				students: 0, teachers: 0, administrators: 0, systemAdmins: 0, total: 0,
			});
		}

		const User = (connection.models.User || connection.model('User', UserSchema)) as any;

		if (!User.discriminators?.student) User.discriminator('student', StudentSchema);
		if (!User.discriminators?.teacher) User.discriminator('teacher', TeacherSchema);
		if (!User.discriminators?.administrator) User.discriminator('administrator', AdministratorSchema);

		const [students, teachers, administrators, systemAdmins] = await Promise.all([
			User.discriminators.student.countDocuments({ isActive: true }).catch(() => 0),
			User.discriminators.teacher.countDocuments({ isActive: true }).catch(() => 0),
			User.discriminators.administrator.countDocuments({ isActive: true }).catch(() => 0),
			User.countDocuments({ role: 'system_admin', isActive: true }).catch(() => 0),
		]);

		return NextResponse.json({
			students, teachers, administrators, systemAdmins,
			total: students + teachers + administrators + systemAdmins,
		});
	} catch (error: any) {
		console.error('[superadmin/schools/[id]/stats] GET error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load stats' }, { status: 500 });
	}
}
