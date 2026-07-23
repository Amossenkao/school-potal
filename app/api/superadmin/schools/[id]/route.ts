import { NextRequest, NextResponse } from 'next/server';
import { connectToTenantsDb, clearSchoolProfileMemoryCache } from '@/lib/mongoose';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import { redis } from '@/lib/redis';
import { publishSyncEventSafe } from '@/lib/realtimeSync';
import { destroyAllTenantSessions } from '@/utils/session';

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
		const school = await ProfileModel.findOne({ host: id }).lean().exec();

		if (!school) {
			return NextResponse.json({ error: 'School not found' }, { status: 404 });
		}

		return NextResponse.json({ school });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]] GET error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load school' }, { status: 500 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const ProfileModel = await getProfileModel();

		const school = await ProfileModel.findOneAndUpdate(
			{ host: id },
			{ $set: body },
			{ new: true, runValidators: true }
		).lean();

		if (!school) {
			return NextResponse.json({ error: 'School not found' }, { status: 404 });
		}

		clearSchoolProfileMemoryCache(id);
		await redis.del(`school_profile:${id}`);

		await publishSyncEventSafe({
			tenantId: id,
			domain: 'school',
			reason: 'school-updated',
			payload: { school },
		});

		return NextResponse.json({ school });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]] PUT error:', error);
		return NextResponse.json({ error: error.message || 'Failed to update school' }, { status: 500 });
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const ProfileModel = await getProfileModel();

		const school = await ProfileModel.findOneAndUpdate(
			{ host: id },
			{ $set: body },
			{ new: true, runValidators: true }
		).lean();

		if (!school) {
			return NextResponse.json({ error: 'School not found' }, { status: 404 });
		}

		clearSchoolProfileMemoryCache(id);
		await redis.del(`school_profile:${id}`);

		if (body.isActive === false) {
			await destroyAllTenantSessions(id);
		}

		await publishSyncEventSafe({
			tenantId: id,
			domain: 'school',
			reason: body.isActive !== undefined ? 'school-toggled-active' : 'school-updated',
			payload: { school },
		});

		return NextResponse.json({ school });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]] PATCH error:', error);
		return NextResponse.json({ error: error.message || 'Failed to update school' }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const ProfileModel = await getProfileModel();

		const result = await ProfileModel.findOneAndDelete({ host: id }).lean();
		if (!result) {
			return NextResponse.json({ error: 'School not found' }, { status: 404 });
		}

		clearSchoolProfileMemoryCache(id);
		await redis.del(`school_profile:${id}`);
		await destroyAllTenantSessions(id);

		await publishSyncEventSafe({
			tenantId: id,
			domain: 'school',
			reason: 'school-deleted',
			payload: { host: id },
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('[superadmin/schools/[id]] DELETE error:', error);
		return NextResponse.json({ error: error.message || 'Failed to delete school' }, { status: 500 });
	}
}
