import { connectToSchoolMeshDb } from '@/lib/mongoose';
import { Connection, Document } from 'mongoose';
import SuperAdminSchema from '@/models/schoolmesh/superadmin/SuperAdmin';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import ApplicationLogSchema, { type ApplicationLogDocument } from '@/models/ApplicationLog';
import MonitoringSnapshotSchema, { type MonitoringSnapshotDocument } from '@/models/MonitoringSnapshot';
import SystemAlertSchema, { type SystemAlertDocument } from '@/models/SystemAlert';

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
	const ApplicationLogModel = connection.models.ApplicationLog ||
		connection.model<ApplicationLogDocument>('ApplicationLog', ApplicationLogSchema);
	const MonitoringSnapshotModel = connection.models.MonitoringSnapshot ||
		connection.model<MonitoringSnapshotDocument>('MonitoringSnapshot', MonitoringSnapshotSchema);
	const SystemAlertModel = connection.models.SystemAlert ||
		connection.model<SystemAlertDocument>('SystemAlert', SystemAlertSchema);

	schoolMeshModels = {
		SuperAdmin: SuperAdminModel,
		SchoolProfile: SchoolProfileModel,
		ApplicationLog: ApplicationLogModel,
		MonitoringSnapshot: MonitoringSnapshotModel,
		SystemAlert: SystemAlertModel,
		connection,
	};

	return schoolMeshModels;
};
