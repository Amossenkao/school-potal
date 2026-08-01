import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser } from '@/proxy';
import { getTenantModels } from '@/models';
import { updateAllUserSessions } from '@/utils/session';
import {
	buildParentChildrenList,
	parentOwnsStudent,
	scopedParentSessionFields,
} from '@/lib/parentAccess';

export async function POST(request: NextRequest) {
	const currentUser = await authorizeUser(request);
	if (!currentUser) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
	}
	if (currentUser.role !== 'parent') {
		return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
	}

	const body = await request.json().catch(() => ({}));
	const studentId = String(body?.studentId || '').trim();
	if (!studentId) {
		return NextResponse.json(
			{ message: 'studentId is required' },
			{ status: 400 },
		);
	}

	const models = await getTenantModels();
	const parent = await models.Parent.findById(currentUser.id).lean();
	if (!parent) {
		return NextResponse.json({ message: 'Parent account not found' }, { status: 404 });
	}
	if (!parentOwnsStudent(parent, studentId)) {
		return NextResponse.json(
			{ message: 'You can only view your linked children' },
			{ status: 403 },
		);
	}

	const parentChildren = await buildParentChildrenList(models, parent);
	const child = parentChildren.find(
		(c) => c.studentId === studentId || c.username === studentId,
	);
	if (!child) {
		return NextResponse.json({ message: 'Child not found' }, { status: 404 });
	}

	const scoped = scopedParentSessionFields(child);

	await updateAllUserSessions(currentUser.id, scoped, {
		onlyUpdateFields: [
			'studentId',
			'classId',
			'className',
			'classLevel',
			'academicYears',
			'firstName',
			'middleName',
			'lastName',
			'fullName',
			'studentType',
			'profilePictureUrl',
		],
	});

	return NextResponse.json({
		success: true,
		data: {
			...scoped,
			parentChildren,
		},
	});
}
