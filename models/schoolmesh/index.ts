import { connectToSchoolMeshDb } from '@/lib/mongoose';
import { Connection, Document } from 'mongoose';
import SuperAdminSchema from '@/models/schoolmesh/superadmin/SuperAdmin';
import SchoolProfileSchema from '@/models/profile/SchoolProfile';

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

	schoolMeshModels = {
		SuperAdmin: SuperAdminModel,
		SchoolProfile: SchoolProfileModel,
		connection,
	};

	return schoolMeshModels;
};
