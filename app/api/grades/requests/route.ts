import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/middleware';
import {
	updateAllUserSessions,
	updateUserSessionNotifications,
} from '@/utils/session';

// Helper function to get the current academic year
function getCurrentAcademicYear() {
	const date = new Date();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

// Helper function to safely prepare user data for session updates
function prepareUserDataForSession(userDoc: any) {
	// Convert Mongoose document to plain object if needed
	const plainDoc = userDoc.toObject ? userDoc.toObject() : userDoc;

	// Extract only the necessary fields and avoid Mongoose document methods
	const userData = {
		userId: plainDoc._id?.toString() || plainDoc.userId,
		username: plainDoc.username,
		email: plainDoc.email,
		firstName: plainDoc.firstName,
		lastName: plainDoc.lastName,
		role: plainDoc.role,
		isActive: plainDoc.isActive,
		teacherId: plainDoc.teacherId,
		notifications: plainDoc.notifications || [],
		// Add any other essential fields your session needs
		lastLogin: plainDoc.lastLogin,
		createdAt: plainDoc.createdAt,
		updatedAt: plainDoc.updatedAt,
	};

	// Remove undefined values to keep session clean
	return Object.fromEntries(
		Object.entries(userData).filter(([_, value]) => value !== undefined)
	);
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
	notification: any
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

		const { GradeChangeRequest } = await getTenantModels();
		const { searchParams } = new URL(request.url);
		const academicYear =
			searchParams.get('academicYear') || getCurrentAcademicYear();

		const query: any = { academicYear };

		// If the user is a teacher, only fetch their requests
		if (currentUser.role === 'teacher') {
			query.teacherId = currentUser.teacherId;
		}

		const allRequests = await GradeChangeRequest.find(query).lean();

		// Group requests by their batchId for the UI
		const groupedByBatch = allRequests.reduce((acc, request) => {
			const batchId = request.batchId;
			if (!acc[batchId]) {
				acc[batchId] = {
					batchId: request.batchId,
					academicYear: request.academicYear,
					period: request.period,
					classId: request.classId,
					subject: request.subject,
					teacherId: request.teacherId,
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
		}, {} as Record<string, any>);

		const report = Object.values(groupedByBatch).map((batch) => {
			const statuses = new Set(batch.requests.map((r: any) => r.status));
			let status: string = 'Pending';
			if (statuses.size === 1) {
				status = statuses.values().next().value;
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

		return NextResponse.json({ success: true, data: { report } });
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

		const { Grade, GradeChangeRequest, User } = await getTenantModels();
		const body = await request.json();
		const { classId, subject, period, requests } = body;

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

		const academicYear = getCurrentAcademicYear();
		const batchId = `BCR-${crypto.randomUUID()}`;
		const createdRequests: any[] = [];
		const updatedGrades: any[] = [];

		for (const req of requests) {
			const originalGradeDoc = await Grade.findOne({
				studentId: req.studentId,
				classId,
				subject,
				period,
				academicYear,
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
					teacherId: teacher.teacherId,
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
			const notification = {
				title: 'New Grade Change Request',
				message: `${teacher.firstName} ${teacher.lastName} submitted ${createdRequests.length} grade change request(s) for ${subject} in ${classId}.`,
				timestamp: new Date(),
				read: false,
				type: 'Grades',
			};
			const notificationPromises = admins.map((admin: any) =>
				addNotificationToUser(User, admin._id.toString(), notification)
			);
			await Promise.allSettled(notificationPromises);
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
					timestamp: new Date(),
					read: false,
					type: 'Grades',
				};

				if (!teacherNotifications.has(gradeRequest.teacherId)) {
					teacherNotifications.set(gradeRequest.teacherId, []);
				}
				teacherNotifications.get(gradeRequest.teacherId).push(notification);
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
					timestamp: new Date(),
					read: false,
					type: 'Grades',
				};

				if (!teacherNotifications.has(gradeRequest.teacherId)) {
					teacherNotifications.set(gradeRequest.teacherId, []);
				}
				teacherNotifications.get(gradeRequest.teacherId).push(notification);
			}
		}

		// Send notifications to teachers (batched by teacher)
		const notificationPromises = Array.from(teacherNotifications.entries()).map(
			async ([teacherId, notifications]) => {
				try {
					const teacherUser = await User.findOne({ teacherId })
						.select('_id')
						.lean();
					if (teacherUser) {
						// Add all notifications for this teacher at once
						for (const notification of notifications) {
							await addNotificationToUser(
								User,
								teacherUser._id.toString(),
								notification
							);
						}
						return true;
					}
					return false;
				} catch (error) {
					console.error(`Failed to notify teacher ${teacherId}:`, error);
					return false;
				}
			}
		);

		// Wait for all teacher notifications to complete
		await Promise.allSettled(notificationPromises);

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

		if (requestToUpdate.teacherId !== teacher.teacherId) {
			return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
		}

		if (requestToUpdate.status !== 'Pending') {
			return NextResponse.json(
				{ message: 'Cannot edit a request that is not pending' },
				{ status: 400 }
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

		if (requestToDelete.teacherId !== teacher.teacherId) {
			return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
		}
		if (requestToDelete.status !== 'Pending') {
			return NextResponse.json(
				{ message: 'Cannot withdraw a request that is not pending' },
				{ status: 400 }
			);
		}

		await GradeChangeRequest.findByIdAndDelete(requestId);

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
