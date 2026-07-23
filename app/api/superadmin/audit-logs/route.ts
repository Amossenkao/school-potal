import { NextRequest, NextResponse } from 'next/server';
import { connectToTenantsDb } from '@/lib/mongoose';
import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema(
	{
		level: {
			type: String,
			enum: ['info', 'warning', 'error', 'success'],
			required: true,
			index: true,
		},
		category: {
			type: String,
			enum: ['system', 'school', 'auth', 'user', 'database'],
			required: true,
			index: true,
		},
		message: { type: String, required: true },
		details: { type: Schema.Types.Mixed },
		source: { type: String },
	},
	{ timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ level: 1, createdAt: -1 });

async function getAuditLogModel() {
	const conn = await connectToTenantsDb();
	return (conn.models.AuditLog || conn.model('AuditLog', AuditLogSchema)) as any;
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const level = searchParams.get('level');
		const category = searchParams.get('category');
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = parseInt(searchParams.get('limit') || '50', 10);
		const skip = (page - 1) * limit;

		const AuditLog = await getAuditLogModel();

		const filter: Record<string, any> = {};
		if (level) filter.level = level;
		if (category) filter.category = category;

		const [logs, total] = await Promise.all([
			AuditLog.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean()
				.exec(),
			AuditLog.countDocuments(filter).exec(),
		]);

		return NextResponse.json({
			logs,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error: any) {
		console.error('[superadmin/audit-logs] GET error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load audit logs' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { level, category, message, details, source } = body;

		if (!level || !category || !message) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
		}

		const AuditLog = await getAuditLogModel();
		const log = await AuditLog.create({ level, category, message, details, source });

		return NextResponse.json({ log }, { status: 201 });
	} catch (error: any) {
		console.error('[superadmin/audit-logs] POST error:', error);
		return NextResponse.json({ error: error.message || 'Failed to create audit log' }, { status: 500 });
	}
}
