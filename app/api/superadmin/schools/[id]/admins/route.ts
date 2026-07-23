import { NextRequest, NextResponse } from 'next/server';
import { connectToTenantsDb, getTenantConnectionByDbName } from '@/lib/mongoose';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import UserSchema from '@/models/user/User';
import SystemAdminSchema from '@/models/user/SystemAdmin';
import bcrypt from 'bcryptjs';
import { publishSyncEventSafe } from '@/lib/realtimeSync';

async function getProfileModel() {
	const conn = await connectToTenantsDb();
	return (conn.models.Profile || conn.model('Profile', SchoolProfileSchema)) as any;
}

function generateSysId(): string {
	const year = new Date().getFullYear();
	const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
	return `SYS${year}${seq}`;
}

async function generateUniqueUsername(UserModel: any, maxAttempts = 10): Promise<string> {
	for (let i = 0; i < maxAttempts; i++) {
		const candidate = generateSysId();
		const exists = await UserModel.findOne({ username: candidate }).lean().exec();
		if (!exists) return candidate;
	}
	throw new Error('Failed to generate a unique username after multiple attempts');
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const ProfileModel = await getProfileModel();
		const school = await ProfileModel.findOne({ host: id }).select('dbName').lean().exec();
		if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

		const connection = await getTenantConnectionByDbName(school.dbName);
		if (!connection) return NextResponse.json({ admins: [] });

		const User = (connection.models.User || connection.model('User', UserSchema)) as any;
		if (!User.discriminators?.system_admin) {
			User.discriminator('system_admin', SystemAdminSchema);
		}

		const admins = await User.discriminators.system_admin
			.find({ role: 'system_admin' })
			.select('firstName lastName fullName username phone email isActive createdAt')
			.sort({ createdAt: -1 })
			.lean()
			.exec();

		return NextResponse.json({ admins: admins || [] });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]/admins] GET error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load admins' }, { status: 500 });
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const { firstName, middleName, lastName, phone, email, gender, dateOfBirth, address } = body;

		if (!firstName || !lastName || !phone) {
			return NextResponse.json({ error: 'firstName, lastName, and phone are required' }, { status: 400 });
		}

		const ProfileModel = await getProfileModel();
		const school = await ProfileModel.findOne({ host: id }).select('dbName').lean().exec();
		if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

		const connection = await getTenantConnectionByDbName(school.dbName);
		if (!connection) return NextResponse.json({ error: 'Could not connect to school database' }, { status: 500 });

		const User = (connection.models.User || connection.model('User', UserSchema)) as any;
		if (!User.discriminators?.system_admin) {
			User.discriminator('system_admin', SystemAdminSchema);
		}

		const username = await generateUniqueUsername(User.discriminators.system_admin);
		const defaultPassword = username;
		const hashedPassword = await bcrypt.hash(defaultPassword, 12);
		const fullName = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;

		const admin = await User.discriminators.system_admin.create({
			role: 'system_admin',
			firstName,
			middleName: middleName || '',
			lastName,
			fullName,
			username,
			password: hashedPassword,
			defaultPassword,
			mustChangePassword: true,
			phone,
			email: email || '',
			gender: gender || 'Other',
			dateOfBirth: dateOfBirth || '2000-01-01',
			address: address || '',
			isActive: true,
			createdAt: new Date(),
		});

		await publishSyncEventSafe({
			tenantId: id,
			domain: 'users',
			reason: 'user-created',
			payload: {
				userId: String(admin._id),
				user: {
					_id: String(admin._id),
					firstName: admin.firstName,
					lastName: admin.lastName,
					fullName: admin.fullName,
					username: admin.username,
					phone: admin.phone,
					email: admin.email,
					isActive: admin.isActive,
				},
			},
		});

		return NextResponse.json({
			user: {
				_id: admin._id,
				firstName: admin.firstName,
				lastName: admin.lastName,
				fullName: admin.fullName,
				username: admin.username,
				phone: admin.phone,
				email: admin.email,
				isActive: admin.isActive,
				generatedCredentials: {
					username,
					defaultPassword,
					note: 'User must change password on first login',
				},
			},
		}, { status: 201 });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]/admins] POST error:', error);
		return NextResponse.json({ error: error.message || 'Failed to create admin' }, { status: 500 });
	}
}
