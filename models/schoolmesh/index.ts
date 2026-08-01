import { connectToSchoolMeshDb } from '@/lib/mongoose';
import { Connection, Document } from 'mongoose';
import SuperAdminSchema from '@/models/schoolmesh/superadmin/SuperAdmin';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import MonitoringSnapshotSchema, { type MonitoringSnapshotDocument } from '@/models/MonitoringSnapshot';
import SystemAlertSchema, { type SystemAlertDocument } from '@/models/SystemAlert';
import TenantDatabaseMetricSchema, { type TenantDatabaseMetricDocument } from '@/models/TenantDatabaseMetric';

import type { SuperAdmin } from '@/types';
import type { SchoolProfile } from '@/types/schoolProfile';

let schoolMeshModels: any = null;

export const getSchoolMeshModels = async () => {
	if (schoolMeshModels) return schoolMeshModels;

	const connection = await connectToSchoolMeshDb();

	const SuperAdminModel = connection.models.SuperAdmin ||
		connection.model<SuperAdmin & Document>('SuperAdmin', SuperAdminSchema);

	const SchoolProfileModel = connection.models.SchoolProfile ||
		connection.model<SchoolProfile & Document>('SchoolProfile', SchoolProfileSchema);
	const MonitoringSnapshotModel = connection.models.MonitoringSnapshot ||
		connection.model<MonitoringSnapshotDocument>('MonitoringSnapshot', MonitoringSnapshotSchema);
	const SystemAlertModel = connection.models.SystemAlert ||
		connection.model<SystemAlertDocument>('SystemAlert', SystemAlertSchema);
	const TenantDatabaseMetricModel = connection.models.TenantDatabaseMetric ||
		connection.model<TenantDatabaseMetricDocument>('TenantDatabaseMetric', TenantDatabaseMetricSchema);

	schoolMeshModels = {
		SuperAdmin: SuperAdminModel,
		SchoolProfile: SchoolProfileModel,
		MonitoringSnapshot: MonitoringSnapshotModel,
		SystemAlert: SystemAlertModel,
		TenantDatabaseMetric: TenantDatabaseMetricModel,
		connection,
	};

	return schoolMeshModels;
};
