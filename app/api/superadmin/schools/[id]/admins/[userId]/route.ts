import { NextRequest, NextResponse } from 'next/server';
import { connectToTenantsDb, getTenantConnectionByDbName } from '@/lib/mongoose';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import UserSchema from '@/models/user/User';
import SystemAdminSchema from '@/models/user/SystemAdmin';
import bcrypt from 'bcryptjs';

async function getProfileModel() {
	const conn = await connectToTenantsDb();
	return (conn.models.Profile || conn.model('Profile', SchoolProfileSchema)) as any;
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; userId: string }> }
) {
	try {
		const { id, userId } = await params;
		const body = await request.json();
		const { firstName, middleName, lastName, phone, email, isActive } = body;

		const ProfileModel = await getProfileModel();
		const school = await ProfileModel.findOne({ host: id }).select('dbName').lean().exec();
		if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

		const connection = await getTenantConnectionByDbName(school.dbName);
		if (!connection) return NextResponse.json({ error: 'Could not connect to school database' }, { status: 500 });

		const User = (connection.models.User || connection.model('User', UserSchema)) as any;
		if (!User.discriminators?.system_admin) {
			User.discriminator('system_admin', SystemAdminSchema);
		}

		const updateData: any = {};
		if (firstName !== undefined) updateData.firstName = firstName;
		if (middleName !== undefined) updateData.middleName = middleName;
		if (lastName !== undefined) updateData.lastName = lastName;
		if (phone !== undefined) updateData.phone = phone;
		if (email !== undefined) updateData.email = email;
		if (isActive !== undefined) updateData.isActive = isActive;

		if (firstName !== undefined || middleName !== undefined || lastName !== undefined) {
			const current = await User.discriminators.system_admin.findById(userId).lean().exec();
			if (current) {
				const f = firstName ?? current.firstName;
				const m = middleName ?? current.middleName;
				const l = lastName ?? current.lastName;
				updateData.fullName = m ? `${f} ${m} ${l}` : `${f} ${l}`;
			}
		}

		updateData.updatedAt = new Date();

		const admin = await User.discriminators.system_admin
			.findByIdAndUpdate(userId, { $set: updateData }, { new: true })
			.select('firstName lastName fullName username phone email isActive')
			.lean()
			.exec();

		if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
		return NextResponse.json({ admin });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]/admins/[userId]] PUT error:', error);
		return NextResponse.json({ error: error.message || 'Failed to update admin' }, { status: 500 });
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; userId: string }> }
) {
	try {
		const { id, userId } = await params;
		const body = await request.json();
		const { action } = body;

		const ProfileModel = await getProfileModel();
		const school = await ProfileModel.findOne({ host: id }).select('dbName').lean().exec();
		if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

		const connection = await getTenantConnectionByDbName(school.dbName);
		if (!connection) return NextResponse.json({ error: 'Could not connect to school database' }, { status: 500 });

		const User = (connection.models.User || connection.model('User', UserSchema)) as any;
		if (!User.discriminators?.system_admin) {
			User.discriminator('system_admin', SystemAdminSchema);
		}

		if (action === 'toggle_active') {
			const admin = await User.discriminators.system_admin.findById(userId).lean().exec();
			if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

			const updated = await User.discriminators.system_admin
				.findByIdAndUpdate(userId, { $set: { isActive: !admin.isActive, updatedAt: new Date() } }, { new: true })
				.select('firstName lastName fullName username phone email isActive')
				.lean()
				.exec();

			return NextResponse.json({ admin: updated });
		}

		if (action === 'reset_password') {
			const admin = await User.discriminators.system_admin.findById(userId).lean().exec();
			if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

			const defaultPassword = admin.username;
			const hashedPassword = await bcrypt.hash(defaultPassword, 12);

			await User.discriminators.system_admin
				.findByIdAndUpdate(userId, { $set: { password: hashedPassword, defaultPassword, mustChangePassword: true, updatedAt: new Date() } })
				.exec();

			return NextResponse.json({
				credentials: { username: admin.username, defaultPassword, note: 'User must change password on next login' },
			});
		}

		return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]/admins/[userId]] PATCH error:', error);
		return NextResponse.json({ error: error.message || 'Failed to update admin' }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; userId: string }> }
) {
	try {
		const { id, userId } = await params;

		const ProfileModel = await getProfileModel();
		const school = await ProfileModel.findOne({ host: id }).select('dbName').lean().exec();
		if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

		const connection = await getTenantConnectionByDbName(school.dbName);
		if (!connection) return NextResponse.json({ error: 'Could not connect to school database' }, { status: 500 });

		const User = (connection.models.User || connection.model('User', UserSchema)) as any;
		if (!User.discriminators?.system_admin) {
			User.discriminator('system_admin', SystemAdminSchema);
		}

		const admin = await User.discriminators.system_admin.findByIdAndDelete(userId).lean().exec();
		if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]/admins/[userId]] DELETE error:', error);
		return NextResponse.json({ error: error.message || 'Failed to delete admin' }, { status: 500 });
	}
}
