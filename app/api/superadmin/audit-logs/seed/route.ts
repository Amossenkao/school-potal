import { NextResponse } from 'next/server';
import { connectToTenantsDb } from '@/lib/mongoose';
import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema(
	{
		level: {
			type: String,
			enum: ['info', 'warning', 'error', 'success'],
			required: true,
		},
		category: {
			type: String,
			enum: ['system', 'school', 'auth', 'user', 'database'],
			required: true,
		},
		message: { type: String, required: true },
		details: { type: Schema.Types.Mixed },
		source: { type: String },
	},
	{ timestamps: true }
);

async function getAuditLogModel() {
	const conn = await connectToTenantsDb();
	return (conn.models.AuditLog || conn.model('AuditLog', AuditLogSchema)) as any;
}

const SEED_LOGS = [
	{ level: 'success', category: 'system', message: 'Platform started successfully', source: 'server' },
	{ level: 'info', category: 'database', message: 'Connected to tenants database', source: 'mongodb' },
	{ level: 'info', category: 'system', message: 'Redis cache connection established', source: 'redis' },
	{ level: 'success', category: 'school', message: 'School "Springfield Academy" onboarded', source: 'superadmin' },
	{ level: 'info', category: 'auth', message: 'Super admin login from 192.168.1.100', source: 'auth' },
	{ level: 'warning', category: 'system', message: 'High memory usage detected: 82%', source: 'monitor' },
	{ level: 'error', category: 'database', message: 'Connection timeout to tenant DB "schoolmesh_riverside" — retrying', source: 'mongodb', details: { timeout: 2500, retries: 2 } },
	{ level: 'info', category: 'user', message: 'Batch user import completed: 145 users across 3 schools', source: 'import' },
	{ level: 'success', category: 'school', message: 'School "Greenfield International" profile updated', source: 'superadmin' },
	{ level: 'warning', category: 'auth', message: 'Failed login attempt for system_admin from 10.0.0.55', source: 'auth', details: { ip: '10.0.0.55', attempts: 3 } },
	{ level: 'info', category: 'system', message: 'Scheduled backup completed successfully', source: 'cron' },
	{ level: 'error', category: 'system', message: 'Ably realtime channel error: connection limit reached', source: 'ably', details: { channel: 'school:grades' } },
	{ level: 'success', category: 'database', message: 'Indexes rebuilt for tenants database', source: 'mongodb' },
	{ level: 'info', category: 'school', message: 'School "Oakwood Prep" deactivated by super admin', source: 'superadmin' },
	{ level: 'warning', category: 'database', message: 'Slow query detected: 3.2s on grades collection', source: 'mongodb', details: { queryTime: 3200, collection: 'grades' } },
	{ level: 'info', category: 'auth', message: 'Session cleanup: 47 expired sessions removed', source: 'cron' },
	{ level: 'success', category: 'system', message: 'SSL certificate renewed for *.schoolmesh.app', source: 'certbot' },
	{ level: 'error', category: 'school', message: 'School "Pine Valley" database migration failed', source: 'migrate', details: { error: 'Field "feeSchedules" type mismatch', version: '2.4.0' } },
	{ level: 'info', category: 'user', message: 'System admin "John Doe" password changed', source: 'auth' },
	{ level: 'warning', category: 'system', message: 'Disk usage at 78% on primary server', source: 'monitor', details: { usage: '78%', path: '/var/data' } },
];

export async function POST() {
	try {
		const AuditLog = await getAuditLogModel();

		const now = Date.now();
		const logs = SEED_LOGS.map((entry, i) => ({
			...entry,
			createdAt: new Date(now - (SEED_LOGS.length - i) * 60000 * (5 + Math.floor(Math.random() * 25))),
		}));

		await AuditLog.insertMany(logs);

		return NextResponse.json({ success: true, count: logs.length });
	} catch (error: any) {
		console.error('[superadmin/audit-logs/seed] POST error:', error);
		return NextResponse.json({ error: error.message || 'Failed to seed audit logs' }, { status: 500 });
	}
}
