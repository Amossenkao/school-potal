import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';
import {
	updateUserSessionNotifications,
} from '@/utils/session';
import crypto from 'crypto';
import { getSchoolProfile } from '@/lib/mongoose';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import {
	getAcademicYearFilterValue,
	getCurrentAcademicYearFromSchoolProfile,
	getTeacherClassAssignmentForAcademicYear,
	getTeacherYearAssignment,
	resolveAcademicYearAccessContext,
} from '@/utils/academicYearAccess';

function isGradeChangeWindowOpen(
	schoolProfile: any,
	academicYear: string,
	period: string,
): boolean {
	const settings = schoolProfile?.settings?.teacherSettings;
	if (!settings) return false;
	const years = Array.isArray(settings.gradeChangeRequestAcademicYears)
		? settings.gradeChangeRequestAcademicYears
		: [];
	const periods = Array.isArray(settings.gradeChangeRequestPeriods)
		? settings.gradeChangeRequestPeriods
		: [];
	return years.includes(academicYear) && periods.includes(period);
}

// Helper function to safely update user session with new notification
async function updateUserNotificationSession(
	userId: string,
	newNotifications: any[]
) {
	try {
		await updateUserSessionNotifications(userId, newNotifications);
		console.log(
			`Successfully updated session notifications for user ${userId}`
		);
	} catch (sessionError) {
		console.error(`Failed to update session for user ${userId}:`, sessionError);
		// Don't throw - this is a non-critical operation that shouldn't break the main flow
	}
}

// Helper function to add notification to user and update their session
async function addNotificationToUser(
	User: any,
	userId: string,
	notification: any,
	options: {
		tenantId?: string;
		actorId?: string | null;
		reason?: string;
	} = {},
) {
	try {
		const updatedUser = await User.findByIdAndUpdate(
			userId,
			{
				$push: { notifications: notification },
			},
			{ new: true, select: 'notifications' } // Only return notifications to minimize data transfer
		);

		if (updatedUser) {
			await updateUserNotificationSession(userId, updatedUser.notifications);
			await publishSyncEventSafe({
				tenantId: options.tenantId || '',
				domain: 'user',
				actorId: options.actorId || userId,
				reason: options.reason || 'user-notification',
				targetUserIds: [userId],
			});
			return true;
		}
		return false;
	} catch (error) {
		console.error(`Failed to add notification to user ${userId}:`, error);
		return false;
	}
}

// -----------------------------------------------------------------------------
// GET - Fetch Grade Change Requests (for Admin or Teacher)
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
	try {
		// Authorize for both admin and teacher roles
		const currentUser = await authorizeUser(request, [
			'system_admin',
			'teacher',
		]);
		if (!currentUser) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
		}

		const models = await getTenantModels();
		const { GradeChangeRequest } = models;
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const { searchParams } = new URL(request.url);
		const requestedAcademicYear = searchParams.get('academicYear');
		const accessUser =
			currentUser.role === 'teacher'
				? await models.Teacher.findById(currentUser.id)
						.select('role subjects username')
						.lean()
				: currentUser;
		if (!accessUser) {
			return NextResponse.json(
				{ success: false, message: 'Profile not found' },
				{ status: 404 },
			);
		}
		const yearAccess = resolveAcademicYearAccessContext({
			user: accessUser,
			schoolProfile,
			requestedAcademicYear,
		});
		if (yearAccess.requestedAcademicYear && !yearAccess.hasAccess) {
			return NextResponse.json(
				{
					success: false,
					message: 'You do not have access to this academic year.',
					defaultAcademicYear: yearAccess.defaultAcademicYear,
					allowedAcademicYears: yearAccess.allowedAcademicYears,
				},
				{ status: 403 },
			);
		}
		const academicYear = yearAccess.academicYear;

		const query: any = { academicYear: getAcademicYearFilterValue(academicYear) };

		// If the user is a teacher, only fetch their requests
		if (currentUser.role === 'teacher') {
			query.teacherUsername = currentUser.username;
		}

		const allRequests = await GradeChangeRequest.find(query).lean();

		// Group requests by their batchId for the UI
		const groupedByBatch = allRequests.reduce(
			(acc: Record<string, any>, request: any) => {
			const batchId = request.batchId;
			if (!acc[batchId]) {
				acc[batchId] = {
					batchId: request.batchId,
					academicYear: request.academicYear,
					period: request.period,
					classId: request.classId,
					subject: request.subject,
					teacherUsername: request.teacherUsername,
					teacherName: request.teacherName,
					submittedAt: request.submittedAt,
					requests: [],
				};
			}
			acc[batchId].requests.push({
				...request,
				requestId: request._id.toString(),
			});
			return acc;
			},
			{} as Record<string, any>,
		);

		const report = (Object.values(groupedByBatch) as any[]).map((batch: any) => {
			const statuses = new Set(batch.requests.map((r: any) => r.status));
			let status: string = 'Pending';
			if (statuses.size === 1) {
				const singleStatus = statuses.values().next().value as
					| string
					| undefined;
				if (singleStatus) status = singleStatus;
			} else if (
				statuses.has('Pending') ||
				(statuses.has('Approved') && statuses.has('Rejected'))
			) {
				status = 'Partially Approved';
			} else if (statuses.has('Approved')) {
				status = 'Approved';
			} else if (statuses.has('Rejected')) {
				status = 'Rejected';
			}
			return {
				...batch,
				status,
				stats: { totalRequests: batch.requests.length },
			};
		});

		// Sort by most recent submission
		report.sort(
			(a, b) =>
				new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
		);

		return NextResponse.json({
			success: true,
			data: { report },
			academicYear,
			defaultAcademicYear: yearAccess.defaultAcademicYear,
			allowedAcademicYears: yearAccess.allowedAcademicYears,
		});
	} catch (error) {
		console.error('Error fetching grade change requests:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// -----------------------------------------------------------------------------
// POST - Create New Grade Change Requests (for Teacher)
// -----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
	try {
		const teacher = await authorizeUser(request, ['teacher']);
		if (!teacher) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
		}

		const { Grade, GradeChangeRequest, User, Teacher } = await getTenantModels();
		const body = await request.json();
		const {
			classId,
			subject,
			period,
			requests,
			academicYear: requestedAcademicYear,
		} = body;

		if (
			!classId ||
			!subject ||
			!period ||
			!Array.isArray(requests) ||
			requests.length === 0
		) {
			return NextResponse.json(
				{ message: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Fetch school settings to check if grade change requests are allowed
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const tenantId = resolveTenantSyncKey({
			schoolProfile,
			tenantId: teacher.tenantId,
			host: request.headers.get('host'),
		});
		const teacherRecord = await Teacher.findById(teacher.id)
			.select('role subjects username')
			.lean();
		if (!teacherRecord) {
			return NextResponse.json(
				{ success: false, message: 'Teacher profile not found.' },
				{ status: 404 }
			);
		}
		const yearAccess = resolveAcademicYearAccessContext({
			user: teacherRecord,
			schoolProfile,
			requestedAcademicYear: requestedAcademicYear || null,
		});
		if (yearAccess.requestedAcademicYear && !yearAccess.hasAccess) {
			return NextResponse.json(
				{
					success: false,
					message: 'You do not have access to this academic year.',
					defaultAcademicYear: yearAccess.defaultAcademicYear,
					allowedAcademicYears: yearAccess.allowedAcademicYears,
				},
				{ status: 403 }
			);
		}
		const academicYear = yearAccess.academicYear;

		if (!isGradeChangeWindowOpen(schoolProfile, academicYear, period)) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Grade change requests are not currently open for this academic year or period.',
				},
				{ status: 403 }
			);
		}

		const teacherYearData = getTeacherYearAssignment(
			teacherRecord,
			academicYear,
			{ schoolProfile }
		);
		if (!teacherYearData) {
			return NextResponse.json(
				{
					success: false,
					message:
						'You are not assigned to this academic year for grade changes.',
				},
				{ status: 403 }
			);
		}

		const classData = getTeacherClassAssignmentForAcademicYear(
			teacherRecord,
			academicYear,
			classId,
			{ schoolProfile }
		);
		if (!classData) {
			return NextResponse.json(
				{
					success: false,
					message: 'You are not assigned to this class for this year.',
				},
				{ status: 403 }
			);
		}

		const allowedSubjects = classData?.subjects || [];
		if (!allowedSubjects.includes(subject)) {
			return NextResponse.json(
				{
					success: false,
					message: 'You are not assigned to this subject for this class.',
				},
				{ status: 403 }
			);
		}

		const batchId = `BCR-${crypto.randomUUID()}`;
		const createdRequests: any[] = [];
		const updatedGrades: any[] = [];

		for (const req of requests) {
			const originalGradeDoc = await Grade.findOne({
				studentId: req.studentId,
				classId,
				subject,
				period,
				academicYear: getAcademicYearFilterValue(academicYear),
			}); // Use full Mongoose doc here

			if (!originalGradeDoc) {
				console.warn(
					`Original grade not found for student ${req.studentId}, skipping.`
				);
				continue;
			}

			// Check if a pending request already exists for this grade
			const existingRequest = await GradeChangeRequest.findOne({
				originalGradeId: originalGradeDoc._id,
				status: 'Pending',
			}).lean();

			if (existingRequest) {
				console.log(
					`Duplicate pending request for student ${req.studentId}, skipping.`
				);
				continue;
			}

			// If the original grade is NOT approved, update it directly
			if (originalGradeDoc.status !== 'Approved') {
				originalGradeDoc.grade = req.requestedGrade;
				originalGradeDoc.status = 'Pending'; // Reset status for review
				originalGradeDoc.lastUpdated = new Date();
				await originalGradeDoc.save();
				updatedGrades.push(originalGradeDoc);
			} else {
				// If the grade IS approved, create a new change request
				const newRequest = {
					batchId,
					originalGradeId: originalGradeDoc._id,
					teacherUsername: teacher.username,
					teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
					studentId: req.studentId,
					studentName: req.name,
					classId,
					subject,
					period,
					academicYear,
					originalGrade: req.originalGrade,
					requestedGrade: req.requestedGrade,
					reasonForChange: req.reason,
					status: 'Pending' as const,
					submittedAt: new Date(),
					submissionId: originalGradeDoc.submissionId,
					lastUpdated: new Date(),
				};
				createdRequests.push(newRequest);
			}
		}

		let result = [];
		if (createdRequests.length > 0) {
			result = await GradeChangeRequest.insertMany(createdRequests);
			// Notify admins only if new requests were created
			const admins = await User.find({ role: 'system_admin' })
				.select('_id')
				.lean();
			const details = {
				teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
				className: classId,
				period,
				subject,
				academicYear,
				requestCount: createdRequests.length,
				requestStatus: 'Pending',
			};
			const notification = {
				title: 'New Grade Change Request',
				message: `${teacher.firstName} ${teacher.lastName} submitted ${createdRequests.length} grade change request(s) for ${subject} • ${classId} • ${period}.`,
				details: JSON.stringify(details),
				timestamp: new Date(),
				read: false,
				type: 'Grades',
			};
			const notificationPromises = admins.map((admin: any) =>
				addNotificationToUser(User, admin._id.toString(), notification, {
					tenantId,
					actorId: teacher.id,
					reason: 'grade-change-request-notification',
				}),
			);
			await Promise.allSettled(notificationPromises);
		}
		if (updatedGrades.length > 0) {
			await publishSyncEventSafe({
				tenantId,
				domain: 'grades',
				payload: { grades: updatedGrades },
				academicYear: String(academicYear || ''),
				actorId: teacher.id,
				reason: 'grades-updated-directly',
				scope: { classIds: [String(classId)] },
			});
		}
		if (createdRequests.length > 0) {
			await publishSyncEventSafe({
				tenantId,
				domain: 'gradeRequests',
				academicYear: String(academicYear || ''),
				actorId: teacher.id,
				reason: 'grade-requests-created',
				scope: { classIds: [String(classId)] },
			});
		}

		return NextResponse.json(
			{
				success: true,
				message: `${updatedGrades.length} grade(s) updated directly. ${createdRequests.length} grade change request(s) created.`,
				data: {
					createdRequests: result,
					updatedGrades: updatedGrades.map((g) => g.toObject()),
				},
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('Error creating grade change requests:', error);
		return NextResponse.json(
			{ message: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}
// -----------------------------------------------------------------------------
// PATCH - Approve or Reject Requests (for Admin)
// -----------------------------------------------------------------------------
export async function PATCH(request: NextRequest) {
	try {
		const admin = await authorizeUser(request, ['system_admin']);
		if (!admin) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
		}
		const tenantId = resolveTenantSyncKey({
			tenantId: admin.tenantId,
			host: request.headers.get('host'),
		});

		const { Grade, GradeChangeRequest, User } = await getTenantModels();
		const body = await request.json();
		const { requestIds, status, adminRejectionReason } = body;

		if (
			!Array.isArray(requestIds) ||
			!status ||
			(status === 'Rejected' && !adminRejectionReason)
		) {
			return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
		}

		const updatedRequests = [];
		const teacherNotifications = new Map(); // Group notifications by teacher

		for (const requestId of requestIds) {
			const gradeRequest = await GradeChangeRequest.findById(requestId);
			if (!gradeRequest || gradeRequest.status !== 'Pending') {
				continue;
			}

			if (status === 'Approved') {
				await Grade.findByIdAndUpdate(gradeRequest.originalGradeId, {
					$set: {
						grade: gradeRequest.requestedGrade,
						status: 'Approved',
						lastUpdated: new Date(),
					},
				});
				gradeRequest.status = 'Approved';
				gradeRequest.resolvedAt = new Date();
				await gradeRequest.save();
				updatedRequests.push(gradeRequest);

				// Prepare notification for teacher
				const notification = {
					title: 'Grade Change Approved',
					message: `Your request to change ${gradeRequest.studentName}'s grade in ${gradeRequest.subject} has been approved.`,
					details: JSON.stringify({
						teacherName: gradeRequest.teacherName,
						className: gradeRequest.classId,
						period: gradeRequest.period,
						subject: gradeRequest.subject,
						academicYear: gradeRequest.academicYear,
						studentName: gradeRequest.studentName,
						originalGrade: gradeRequest.originalGrade,
						requestedGrade: gradeRequest.requestedGrade,
						requestStatus: 'Approved',
						reasonForChange: gradeRequest.reasonForChange,
					}),
					timestamp: new Date(),
					read: false,
					type: 'Grades',
				};

				if (!teacherNotifications.has(gradeRequest.teacherUsername)) {
					teacherNotifications.set(gradeRequest.teacherUsername, []);
				}
				teacherNotifications
					.get(gradeRequest.teacherUsername)
					.push(notification);
			} else if (status === 'Rejected') {
				gradeRequest.status = 'Rejected';
				gradeRequest.adminRejectionReason = adminRejectionReason;
				gradeRequest.resolvedAt = new Date();
				await gradeRequest.save();
				updatedRequests.push(gradeRequest);

				// Prepare notification for teacher
				const notification = {
					title: 'Grade Change Rejected',
					message: `Your request to change ${gradeRequest.studentName}'s grade in ${gradeRequest.subject} has been rejected. Reason: ${adminRejectionReason}`,
					details: JSON.stringify({
						teacherName: gradeRequest.teacherName,
						className: gradeRequest.classId,
						period: gradeRequest.period,
						subject: gradeRequest.subject,
						academicYear: gradeRequest.academicYear,
						studentName: gradeRequest.studentName,
						originalGrade: gradeRequest.originalGrade,
						requestedGrade: gradeRequest.requestedGrade,
						requestStatus: 'Rejected',
						reasonForChange: gradeRequest.reasonForChange,
						adminRejectionReason,
					}),
					timestamp: new Date(),
					read: false,
					type: 'Grades',
				};

				if (!teacherNotifications.has(gradeRequest.teacherUsername)) {
					teacherNotifications.set(gradeRequest.teacherUsername, []);
				}
				teacherNotifications
					.get(gradeRequest.teacherUsername)
					.push(notification);
			}
		}

		// Send notifications to teachers (batched by teacher)
		const notificationPromises = Array.from(teacherNotifications.entries()).map(
			async ([teacherUsername, notifications]) => {
				try {
					const teacherUser = await User.findOne({ username: teacherUsername })
						.select('_id')
						.lean();
					if (teacherUser) {
						// Add all notifications for this teacher at once
						for (const notification of notifications) {
							await addNotificationToUser(
								User,
								teacherUser._id.toString(),
								notification,
								{
									tenantId,
									actorId: admin.id,
									reason: 'grade-request-status-notification',
								},
							);
						}
						return true;
					}
					return false;
				} catch (error) {
					console.error(
						`Failed to notify teacher ${teacherUsername}:`,
						error
					);
					return false;
				}
			}
		);

		// Wait for all teacher notifications to complete
		await Promise.allSettled(notificationPromises);

		if (updatedRequests.length > 0) {
			const classIds = Array.from(
				new Set(
					updatedRequests
						.map((request: any) => String(request?.classId || '').trim())
						.filter(Boolean),
				),
			);
			const years = Array.from(
				new Set(
					updatedRequests
						.map((request: any) => String(request?.academicYear || '').trim())
						.filter(Boolean),
				),
			);

			await Promise.all(
				(years.length > 0 ? years : ['']).map((academicYear) =>
					publishSyncEventSafe({
						tenantId,
						domain: 'gradeRequests',
						academicYear: academicYear || null,
						actorId: admin.id,
						reason: 'grade-requests-processed',
						scope: { classIds },
					}),
				),
			);

			if (status === 'Approved') {
				await Promise.all(
					(years.length > 0 ? years : ['']).map((academicYear) =>
						publishSyncEventSafe({
							tenantId,
							domain: 'grades',
							academicYear: academicYear || null,
							actorId: admin.id,
							reason: 'grades-approved-via-request',
							scope: { classIds },
						}),
					),
				);
			}
		}

		return NextResponse.json({
			success: true,
			message: `${updatedRequests.length} requests processed.`,
			data: updatedRequests,
		});
	} catch (error) {
		console.error('Error processing grade change requests:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// -----------------------------------------------------------------------------
// PUT - Edit a Pending Request (for Teacher)
// -----------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
	try {
		const teacher = await authorizeUser(request, ['teacher']);
		if (!teacher) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
		}
		const tenantId = resolveTenantSyncKey({
			tenantId: teacher.tenantId,
			host: request.headers.get('host'),
		});

		const { GradeChangeRequest } = await getTenantModels();
		const body = await request.json();
		const { requestId, requestedGrade, reasonForChange } = body;

		if (!requestId || requestedGrade === undefined || !reasonForChange) {
			return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
		}

		const requestToUpdate = await GradeChangeRequest.findById(requestId);

		if (!requestToUpdate) {
			return NextResponse.json(
				{ message: 'Request not found' },
				{ status: 404 }
			);
		}

		if (requestToUpdate.teacherUsername !== teacher.username) {
			return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
		}

		if (requestToUpdate.status !== 'Pending') {
			return NextResponse.json(
				{ message: 'Cannot edit a request that is not pending' },
				{ status: 400 }
			);
		}

		const schoolProfile = await getSchoolProfile();
		if (
			!isGradeChangeWindowOpen(
				schoolProfile,
				String(
					requestToUpdate.academicYear ||
						getCurrentAcademicYearFromSchoolProfile(schoolProfile),
				),
				String(requestToUpdate.period || ''),
			)
		) {
			return NextResponse.json(
				{
					success: false,
					message: 'Grade change requests are currently closed.',
				},
				{ status: 403 }
			);
		}

		const updatedRequest = await GradeChangeRequest.findByIdAndUpdate(
			requestId,
			{
				$set: {
					requestedGrade: requestedGrade,
					reasonForChange: reasonForChange,
					lastUpdated: new Date(),
				},
			},
			{
				new: true,
				runValidators: false,
			}
		);

		if (!updatedRequest) {
			return NextResponse.json(
				{ success: false, message: 'Request was not updated.' },
				{ status: 500 }
			);
		}
		await publishSyncEventSafe({
			tenantId,
			domain: 'gradeRequests',
			academicYear: String(updatedRequest.academicYear || ''),
			actorId: teacher.id,
			reason: 'grade-request-updated',
			scope: {
				classIds: [String(updatedRequest.classId || '')].filter(Boolean),
			},
		});

		return NextResponse.json({
			success: true,
			message: 'Request updated successfully.',
			data: updatedRequest,
		});
	} catch (error: any) {
		console.error('Error updating grade change request:', error);
		return NextResponse.json(
			{ message: 'Internal server error', error: error.message },
			{ status: 500 }
		);
	}
}

// -----------------------------------------------------------------------------
// DELETE - Withdraw a Request (for Teacher)
// -----------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
	try {
		const teacher = await authorizeUser(request, ['teacher']);
		if (!teacher) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
		}
		const tenantId = resolveTenantSyncKey({
			tenantId: teacher.tenantId,
			host: request.headers.get('host'),
		});

		const { GradeChangeRequest } = await getTenantModels();
		const { searchParams } = new URL(request.url);
		const requestId = searchParams.get('requestId');

		if (!requestId) {
			return NextResponse.json(
				{ message: 'Request ID is required' },
				{ status: 400 }
			);
		}

		const requestToDelete = await GradeChangeRequest.findById(requestId);

		if (!requestToDelete) {
			return NextResponse.json(
				{ message: 'Request not found' },
				{ status: 404 }
			);
		}

		if (requestToDelete.teacherUsername !== teacher.username) {
			return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
		}
		if (requestToDelete.status !== 'Pending') {
			return NextResponse.json(
				{ message: 'Cannot withdraw a request that is not pending' },
				{ status: 400 }
			);
		}

		const schoolProfile = await getSchoolProfile();
		if (
			!isGradeChangeWindowOpen(
				schoolProfile,
				String(
					requestToDelete.academicYear ||
						getCurrentAcademicYearFromSchoolProfile(schoolProfile),
				),
				String(requestToDelete.period || ''),
			)
		) {
			return NextResponse.json(
				{
					success: false,
					message: 'Grade change requests are currently closed.',
				},
				{ status: 403 }
			);
		}

		const deletedRequest = await GradeChangeRequest.findByIdAndDelete(requestId);
		await publishSyncEventSafe({
			tenantId,
			domain: 'gradeRequests',
			academicYear: String(
				deletedRequest?.academicYear || requestToDelete.academicYear || '',
			),
			actorId: teacher.id,
			reason: 'grade-request-withdrawn',
			scope: {
				classIds: [
					String(deletedRequest?.classId || requestToDelete.classId || ''),
				].filter(Boolean),
			},
		});

		return NextResponse.json({
			success: true,
			message: 'Request withdrawn successfully.',
		});
	} catch (error) {
		console.error('Error withdrawing grade change request:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
