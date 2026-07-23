import { NextRequest, NextResponse } from 'next/server';
import { connectToTenantsDb } from '@/lib/mongoose';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';

async function getProfileModel() {
	const conn = await connectToTenantsDb();
	return (conn.models.Profile || conn.model('Profile', SchoolProfileSchema)) as any;
}

export async function GET(request: NextRequest) {
	try {
		const ProfileModel = await getProfileModel();
		const schools = await ProfileModel.find({})
			.select('host dbName name slogan shortName initials logoUrl isActive address phones emails administrativePositions sysAdmin settings.studentSettings.loginAccess settings.teacherSettings.loginAccess settings.administratorSettings.loginAccess')
			.lean()
			.exec();

		return NextResponse.json({ schools });
	} catch (error: any) {
		console.error('[superadmin/schools] GET error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load schools' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { name, shortName, host, dbName, sysAdmin, slogan, initials } = body;

		if (!name || !shortName || !host || !dbName || !sysAdmin) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
		}

		const ProfileModel = await getProfileModel();

		const existing = await ProfileModel.findOne({ $or: [{ host }, { dbName }] }).lean();
		if (existing) {
			return NextResponse.json({ error: 'A school with this host or database name already exists' }, { status: 409 });
		}

		const now = new Date().getFullYear();
		const currentYear = `${now}/${now + 1}`;

		const newSchool = await ProfileModel.create({
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
		console.error('[superadmin/schools] POST error:', error);
		return NextResponse.json({ error: error.message || 'Failed to create school' }, { status: 500 });
	}
}
