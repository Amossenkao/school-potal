import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/proxy';
import { updateUserSessionNotifications } from '@/utils/session';
import { getSchoolProfile } from '@/lib/mongoose';
import { publishSyncEventSafe, resolveTenantSyncKey } from '@/lib/realtimeSync';
import { attachRanksToGrades } from '@/utils/gradeRanks';
import {
	getAcademicYearFilterValue,
	getCurrentAcademicYearFromSchoolProfile,
	getStudentClassIdForAcademicYear,
	getTeacherYearAssignment,
	resolveAcademicYearAccessContext,
} from '@/utils/academicYearAccess';

// Helper function to add notification to user and update their session
async function addNotificationToUser(
	User: any,
	userId: string,
	notification: any,
	options: {
		tenantKey?: string;
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
			{ new: true, select: 'notifications' }, // Only return notifications to minimize data transfer
		);

		if (updatedUser) {
			await updateUserSessionNotifications(userId, updatedUser.notifications);
			await publishSyncEventSafe({
				tenantKey: options.tenantKey || '',
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
// Types and Interfaces (Unchanged)
// -----------------------------------------------------------------------------
interface GradeRecord {
	submissionId: string;
	academicYear: string;
	period: string;
	classId: string;
	subject: string;
	teacherUsername: string;
	studentId: string;
	studentName: string;
	grade: number;
	status: string;
	lastUpdated: Date;
}

interface StudentPeriodicReport {
	studentId: string;
	studentName: string;
	subjects: Array<{
		subject: string;
		grade: number;
	}>;
	periodicAverage: number;
	rank: number;
	incompletes: number;
	passes: number;
	fails: number;
}

interface StudentYearlyReport {
	studentId: string;
	studentName: string;
	periods: Record<string, Array<{ subject: string; grade: number }>>;
	firstSemesterAverage: Record<string, number>;
	secondSemesterAverage: Record<string, number>;
	yearlySubjectAverages: Record<string, number>;
	periodAverages: Record<string, number>;
	yearlyAverage: number;
	ranks: Record<string, number>;
}

interface MastersReport {
	subject: string;
	teacherUsername: string;
	classId: string;
	students: Array<{
		studentId: string;
		studentName: string;
		periods: Record<string, { grade: number; status: string }>;
		overallAverage: number;
	}>;
	periodStats: Record<
		string,
		{
			incompletes: number;
			passes: number;
			fails: number;
			classAverage: number;
			totalStudents: number;
		}
	>;
}

interface GradeSubmissionReport {
	teacherUsername: string;
	academicYear: string;
	submissions: Array<{
		submissionId: string;
		classId: string;
		subject: string;
		period: string;
		totalStudents: number;
		pendingCount: number;
		approvedCount: number;
		rejectedCount: number;
		lastUpdated: Date;
		students: Array<{
			studentId: string;
			studentName: string;
			grade: number;
			status: string;
		}>;
	}>;
}

interface AllGradesReport {
	academicYear: string;
	totalRecords: number;
	grades: Array<{
		submissionId: string;
		academicYear: string;
		period: string;
		classId: string;
		subject: string;
		teacherUsername: string;
		studentId: string;
		studentName: string;
		grade: number;
		status: string;
		lastUpdated: Date;
		rank?: number | null;
		yearlyRank?: number | null;
		ranks?: Record<string, number | null>;
	}>;
}

// -----------------------------------------------------------------------------
// Helper Functions (Unchanged)
// -----------------------------------------------------------------------------

function getCurrentAcademicYear() {
	return getCurrentAcademicYearFromSchoolProfile();
}

function getSubmissionId(
	academicYear: string,
	classId: string,
	period: string,
	subject: string,
) {
	return `${academicYear}-${classId}-${period}-${subject}`
		.replaceAll(/[\/\s+]/gi, '')
		.toLowerCase();
}

function getStudentClassIdForYear(
	student: any,
	academicYear: string,
	currentAcademicYear: string,
) {
	return (
		getStudentClassIdForAcademicYear(student, academicYear, {
			allowCurrentClassFallback: true,
			currentAcademicYear,
		}) || null
	);
}

function getTeacherYearData(
	teacher: any,
	academicYear: string,
	currentAcademicYear: string,
) {
	return (
		getTeacherYearAssignment(teacher, academicYear, {
			currentAcademicYear,
		}) || null
	);
}

function getTeacherClassData(
	teacherYearData: any,
	classId: string,
): any | null {
	if (!teacherYearData?.classes || !classId) return null;
	return (
		teacherYearData.classes.find((c: any) => c.classId === classId) || null
	);
}

function getClassNameFromId(schoolProfile: any, id?: string) {
	if (!id || !schoolProfile?.classLevels) return id || '';
	for (const session of Object.values(schoolProfile.classLevels)) {
		if (!session || typeof session !== 'object') continue;
		for (const level of Object.values(session)) {
			if (!level?.classes || !Array.isArray(level.classes)) continue;
			const found = level.classes.find((cls: any) => cls.classId === id);
			if (found) return found.name || id;
		}
	}
	return id || '';
}

const PERIOD_LABELS: Record<string, string> = {
	first: '1st Period',
	second: '2nd Period',
	third: '3rd Period',
	third_period_exam: '3rd Period Exam',
	fourth: '4th Period',
	fifth: '5th Period',
	sixth: '6th Period',
	six_period_exam: '6th Period Exam',
	sixth_period_exam: '6th Period Exam',
};

function formatPeriodLabel(period: string) {
	return PERIOD_LABELS[period] || period;
}

function normalizeYearlyPeriodKey(period: string) {
	if (period === 'sixth_period_exam') return 'six_period_exam';
	return period;
}

function validateGrades(
	grades: any[],
	gradeMin = 0,
	gradeMax = 100,
): { isValid: boolean; message?: string } {
	if (!Array.isArray(grades)) {
		return { isValid: false, message: 'Grades must be an array.' };
	}
	for (const grade of grades) {
		if (
			!grade.studentId ||
			!grade.studentName ||
			!grade.period ||
			typeof grade.grade !== 'number' ||
			!Number.isFinite(grade.grade) ||
			grade.grade < gradeMin ||
			grade.grade > gradeMax
		) {
			return {
				isValid: false,
				message: `Invalid grade entry for ${grade.studentName || 'a student'}.`,
			};
		}
	}
	return { isValid: true };
}

function normalizeNamePart(value: unknown): string {
	if (typeof value !== 'string') return '';
	return value.trim().replace(/\s+/g, ' ');
}

function buildFullNameFromUser(user: any): string {
	return user.fullName;
}

function getStats(grades: Array<{ grade: number }>) {
	const validGrades = grades.filter(
		(g) => typeof g.grade === 'number' && !isNaN(g.grade),
	);
	const incompletes = grades.length - validGrades.length;
	const passes = validGrades.filter((g) => g.grade >= 70).length;
	const fails = validGrades.length - passes;
	const average =
		validGrades.length > 0
			? validGrades.reduce((acc, g) => acc + g.grade, 0) / validGrades.length
			: 0;
	return {
		incompletes,
		passes,
		fails,
		average: parseFloat(average.toFixed(1)),
		totalStudents: grades.length,
	};
}

function calculateRanks(
	students: Array<{ studentId: string; average: number }>,
) {
	if (students.length === 0) return [];
	const studentsWithRoundedAvg = students.map((student) => ({
		...student,
		roundedAverage: parseFloat(student.average.toFixed(1)),
	}));
	const sortedStudents = [...studentsWithRoundedAvg].sort(
		(a, b) => b.roundedAverage - a.roundedAverage,
	);
	let currentRank = 1;
	for (let i = 0; i < sortedStudents.length; i++) {
		if (
			i > 0 &&
			sortedStudents[i].roundedAverage < sortedStudents[i - 1].roundedAverage
		) {
			currentRank = i + 1;
		}
		(sortedStudents[i] as any).rank = currentRank;
	}
	return sortedStudents;
}

function parseStudentIds(studentIdsParam: string | null): string[] | null {
	if (!studentIdsParam) return null;
	return studentIdsParam
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
}

function removeDuplicateSubjects(
	grades: Array<{ subject: string; grade: number }>,
) {
	const subjectMap = new Map<string, number>();
	grades.forEach((grade) => {
		subjectMap.set(grade.subject, grade.grade);
	});
	return Array.from(subjectMap.entries()).map(([subject, grade]) => ({
		subject,
		grade,
	}));
}

// -----------------------------------------------------------------------------
// Report Processing Functions
// -----------------------------------------------------------------------------

function processAllGradesReport(
	grades: Array<
		GradeRecord & {
			rank?: number | null;
			yearlyRank?: number | null;
			ranks?: Record<string, number | null>;
		}
	>,
	academicYear: string,
): AllGradesReport {
	return {
		academicYear,
		totalRecords: grades.length,
		grades: grades.map((grade) => ({
			submissionId: grade.submissionId,
			academicYear: grade.academicYear,
			period: grade.period,
			classId: grade.classId,
			subject: grade.subject,
			teacherUsername: grade.teacherUsername,
			studentId: grade.studentId,
			studentName: grade.studentName,
			grade: grade.grade,
			status: grade.status,
			lastUpdated: grade.lastUpdated,
			rank:
				typeof grade.rank === 'number' && Number.isFinite(grade.rank)
					? grade.rank
					: undefined,
			yearlyRank:
				typeof grade.yearlyRank === 'number' &&
				Number.isFinite(grade.yearlyRank)
					? grade.yearlyRank
					: undefined,
			ranks:
				grade.ranks && typeof grade.ranks === 'object'
					? grade.ranks
					: undefined,
		})),
	};
}

function processGradeSubmissionReport(
	grades: GradeRecord[],
	teacherUsername: string,
): GradeSubmissionReport {
	// Filter grades by teacher
	const teacherGrades = grades.filter(
		(g) => g.teacherUsername === teacherUsername,
	);

	// Group by submission ID
	const submissionsMap = new Map<string, any>();

	teacherGrades.forEach((grade) => {
		if (!submissionsMap.has(grade.submissionId)) {
			submissionsMap.set(grade.submissionId, {
				submissionId: grade.submissionId,
				classId: grade.classId,
				subject: grade.subject,
				period: grade.period,
				lastUpdated: grade.lastUpdated,
				students: [],
			});
		}

		const submission = submissionsMap.get(grade.submissionId);
		submission.students.push({
			studentId: grade.studentId,
			studentName: grade.studentName,
			grade: grade.grade,
			status: grade.status,
		});

		// Update lastUpdated to the most recent
		if (grade.lastUpdated > submission.lastUpdated) {
			submission.lastUpdated = grade.lastUpdated;
		}
	});

	// Process each submission to add counts
	const submissions = Array.from(submissionsMap.values()).map((submission) => {
		const totalStudents = submission.students.length;
		const pendingCount = submission.students.filter(
			(s: any) => s.status === 'Pending',
		).length;
		const approvedCount = submission.students.filter(
			(s: any) => s.status === 'Approved',
		).length;
		const rejectedCount = submission.students.filter(
			(s: any) => s.status === 'Rejected',
		).length;

		return {
			...submission,
			totalStudents,
			pendingCount,
			approvedCount,
			rejectedCount,
		};
	});

	// Sort by most recent first
	submissions.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

	return {
		teacherUsername,
		academicYear: grades[0]?.academicYear || getCurrentAcademicYear(),
		submissions,
	};
}

function processClassPeriodicReport(
	grades: GradeRecord[],
	classId: string,
	period: string,
	studentIds?: string[],
): StudentPeriodicReport[] {
	const studentsMap = new Map<string, StudentPeriodicReport>();

	// Process all students in the class for ranking purposes
	grades
		.filter((g) => g.classId === classId && g.period === period)
		.forEach((g) => {
			if (!studentsMap.has(g.studentId)) {
				studentsMap.set(g.studentId, {
					studentId: g.studentId,
					studentName: g.studentName,
					subjects: [],
					periodicAverage: 0,
					rank: 0,
					incompletes: 0,
					passes: 0,
					fails: 0,
				});
			}
			studentsMap
				.get(g.studentId)!
				.subjects.push({ subject: g.subject, grade: g.grade });
		});

	// Calculate averages for all students
	const studentsWithAverages = Array.from(studentsMap.values()).map(
		(student) => {
			const cleanedSubjects = removeDuplicateSubjects(student.subjects);
			const stats = getStats(cleanedSubjects);
			return {
				...student,
				subjects: cleanedSubjects,
				periodicAverage: stats.average,
				incompletes: stats.incompletes,
				passes: stats.passes,
				fails: stats.fails,
			};
		},
	);

	// Calculate ranks based on ALL students in the class
	const rankedData = calculateRanks(
		studentsWithAverages.map((s) => ({
			studentId: s.studentId,
			average: s.periodicAverage,
		})),
	);

	// Apply ranks to all students
	studentsWithAverages.forEach((student) => {
		const rankData = rankedData.find((r) => r.studentId === student.studentId);
		student.rank = (rankData as any)?.rank || 0;
	});

	// Sort all students by rank
	let result = studentsWithAverages.sort((a, b) => a.rank - b.rank);

	// Filter by specific student IDs AFTER calculating ranks
	if (studentIds && studentIds.length > 0) {
		result = result.filter((student) => studentIds.includes(student.studentId));
	}

	return result;
}

function processMastersReport(
	grades: GradeRecord[],
	classId: string,
	subject?: string,
	teacherUsername?: string,
	studentIds?: string[],
): MastersReport {
	// Filter grades for the report (but don't filter by studentIds yet for ranking)
	let filteredGrades = grades.filter((g) => g.classId === classId);
	if (subject) {
		filteredGrades = filteredGrades.filter((g) => g.subject === subject);
	}
	if (teacherUsername) {
		filteredGrades = filteredGrades.filter(
			(g) => g.teacherUsername === teacherUsername,
		);
	}

	const studentsMap = new Map<string, any>();
	const periodsSet = new Set<string>();

	// Process all students for ranking
	filteredGrades.forEach((g) => {
		periodsSet.add(g.period);
		if (!studentsMap.has(g.studentId)) {
			studentsMap.set(g.studentId, {
				studentId: g.studentId,
				studentName: g.studentName,
				periods: {},
				grades: [],
			});
		}
		const student = studentsMap.get(g.studentId);
		student.periods[g.period] = { grade: g.grade, status: g.status };
		student.grades.push({ grade: g.grade });
	});

	// Calculate averages for all students
	const studentsWithAverages = Array.from(studentsMap.values()).map(
		(student) => {
			const stats = getStats(student.grades);
			return {
				studentId: student.studentId,
				studentName: student.studentName,
				periods: student.periods,
				overallAverage: stats.average,
			};
		},
	);

	// Filter by specific student IDs AFTER processing all students
	let finalStudents = studentsWithAverages;
	if (studentIds && studentIds.length > 0) {
		finalStudents = studentsWithAverages.filter((student) =>
			studentIds.includes(student.studentId),
		);
	}

	const periodStats: Record<string, any> = {};
	Array.from(periodsSet).forEach((period) => {
		const periodGrades = filteredGrades
			.filter((g) => g.period === period)
			.map((g) => ({ grade: g.grade }));
		periodStats[period] = getStats(periodGrades);
	});

	return {
		subject: subject || 'All Subjects',
		teacherUsername: teacherUsername || 'All Teachers',
		classId,
		students: finalStudents,
		periodStats,
	};
}

function processClassYearlyReport(
	grades: GradeRecord[],
	classId: string,
	studentIds?: string[],
): StudentYearlyReport[] {
	const studentsMap = new Map<string, StudentYearlyReport>();
	const subjectsSet = new Set<string>();

	// Process all students in the class for ranking
	grades
		.filter((g) => g.classId === classId)
		.forEach((g) => {
			if (!studentsMap.has(g.studentId)) {
				studentsMap.set(g.studentId, {
					studentId: g.studentId,
					studentName: g.studentName,
					periods: {},
					firstSemesterAverage: {},
					secondSemesterAverage: {},
					yearlySubjectAverages: {},
					periodAverages: {},
					yearlyAverage: 0,
					ranks: {},
				});
			}
			subjectsSet.add(g.subject);
			const student = studentsMap.get(g.studentId)!;
			const normalizedPeriod = normalizeYearlyPeriodKey(g.period);
			if (!student.periods[normalizedPeriod]) {
				student.periods[normalizedPeriod] = [];
			}
			student.periods[normalizedPeriod].push({
				subject: g.subject,
				grade: g.grade,
			});
		});

	// Calculate all averages and ranks for ALL students
	studentsMap.forEach((student) => {
		const allSubjects = Array.from(subjectsSet);
		Object.keys(student.periods).forEach((period) => {
			student.periods[period] = removeDuplicateSubjects(
				student.periods[period],
			);
		});

		allSubjects.forEach((subject) => {
			const getGradeForPeriod = (period: string) =>
				student.periods[period]?.find((g) => g.subject === subject)?.grade;
			const firstSemGrades = [
				getGradeForPeriod('first'),
				getGradeForPeriod('second'),
				getGradeForPeriod('third'),
			].filter((g): g is number => g !== undefined);
			if (firstSemGrades.length > 0) {
				const avg =
					firstSemGrades.reduce((a, b) => a + b, 0) / firstSemGrades.length;
				const exam = getGradeForPeriod('third_period_exam');
				student.firstSemesterAverage[subject] = parseFloat(
					(exam !== undefined ? (avg + exam) / 2 : avg).toFixed(1),
				);
			}

			const secondSemGrades = [
				getGradeForPeriod('fourth'),
				getGradeForPeriod('fifth'),
				getGradeForPeriod('sixth'),
			].filter((g): g is number => g !== undefined);
			if (secondSemGrades.length > 0) {
				const avg =
					secondSemGrades.reduce((a, b) => a + b, 0) / secondSemGrades.length;
				const exam = getGradeForPeriod('six_period_exam');
				student.secondSemesterAverage[subject] = parseFloat(
					(exam !== undefined ? (avg + exam) / 2 : avg).toFixed(1),
				);
			}

			const firstAvg = student.firstSemesterAverage[subject];
			const secondAvg = student.secondSemesterAverage[subject];
			if (firstAvg !== undefined && secondAvg !== undefined) {
				student.yearlySubjectAverages[subject] = parseFloat(
					((firstAvg + secondAvg) / 2).toFixed(1),
				);
			} else if (firstAvg !== undefined) {
				student.yearlySubjectAverages[subject] = firstAvg;
			} else if (secondAvg !== undefined) {
				student.yearlySubjectAverages[subject] = secondAvg;
			}
		});

		for (const period in student.periods) {
			student.periodAverages[period] = getStats(
				student.periods[period],
			).average;
		}
		const yearlyAvgs = Object.values(student.yearlySubjectAverages).filter(
			(avg) => !isNaN(avg) && avg > 0,
		);
		student.yearlyAverage =
			yearlyAvgs.length > 0
				? parseFloat(
						(yearlyAvgs.reduce((a, b) => a + b, 0) / yearlyAvgs.length).toFixed(
							1,
						),
					)
				: 0;
		student.periodAverages.yearlyAverage = student.yearlyAverage;

		const firstSemAvgs = Object.values(student.firstSemesterAverage).filter(
			(avg) => !isNaN(avg) && avg > 0,
		);
		if (firstSemAvgs.length > 0) {
			student.periodAverages.firstSemesterAverage = parseFloat(
				(firstSemAvgs.reduce((a, b) => a + b, 0) / firstSemAvgs.length).toFixed(
					1,
				),
			);
		}
		const secondSemAvgs = Object.values(student.secondSemesterAverage).filter(
			(avg) => !isNaN(avg) && avg > 0,
		);
		if (secondSemAvgs.length > 0) {
			student.periodAverages.secondSemesterAverage = parseFloat(
				(
					secondSemAvgs.reduce((a, b) => a + b, 0) / secondSemAvgs.length
				).toFixed(1),
			);
		}
	});

	const studentsArray = Array.from(studentsMap.values());
	const allPeriodsAndAverages = [
		...new Set(
			grades
				.filter((g) => g.classId === classId)
				.map((g) => normalizeYearlyPeriodKey(g.period)),
		),
		'firstSemesterAverage',
		'secondSemesterAverage',
	];

	// Calculate ranks for ALL students in the class
	allPeriodsAndAverages.forEach((period) => {
		const rankCandidates = studentsArray
			.map((s) => ({
				studentId: s.studentId,
				average: s.periodAverages[period],
			}))
			.filter(
				(entry) =>
					typeof entry.average === 'number' &&
					!isNaN(entry.average) &&
					entry.average > 0,
			) as Array<{ studentId: string; average: number }>;
		if (rankCandidates.length === 0) return;

		const periodRanks = calculateRanks(rankCandidates);
		periodRanks.forEach((r) => {
			const student = studentsMap.get(r.studentId);
			if (student) student.ranks[period] = (r as any).rank;
		});
	});

	const yearlyRankCandidates = studentsArray
		.map((s) => ({
			studentId: s.studentId,
			average: s.yearlyAverage,
		}))
		.filter((entry) => entry.average > 0);
	if (yearlyRankCandidates.length > 0) {
		const yearlyRanks = calculateRanks(yearlyRankCandidates);
		yearlyRanks.forEach((r) => {
			const student = studentsMap.get(r.studentId);
			if (student) student.ranks.yearly = (r as any).rank;
		});
	}

	// Sort all students by yearly rank
	let finalResult = studentsArray.sort(
		(a, b) => (a.ranks.yearly || Infinity) - (b.ranks.yearly || Infinity),
	);

	// Filter by specific student IDs AFTER calculating ranks
	if (studentIds && studentIds.length > 0) {
		finalResult = finalResult.filter((student) =>
			studentIds.includes(student.studentId),
		);
	}

	return finalResult;
}

// -----------------------------------------------------------------------------
// API Handlers
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthenticated' },
				{ status: 401 },
			);
		}

		const models = await getTenantModels();
		const { Grade } = models;
		const { searchParams } = new URL(request.url);
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const currentAcademicYear =
			getCurrentAcademicYearFromSchoolProfile(schoolProfile);
		const requestedAcademicYear = searchParams.get('academicYear');
		const roleProfile =
			currentUser.role === 'student'
				? await models.Student.findById(currentUser.id)
						.select('role studentId academicYears classId')
						.lean()
				: currentUser.role === 'teacher'
					? await models.Teacher.findById(currentUser.id)
							.select('role username subjects')
							.lean()
					: currentUser;
		if (!roleProfile) {
			return NextResponse.json(
				{ success: false, message: 'Profile not found' },
				{ status: 404 },
			);
		}
		const yearAccess = resolveAcademicYearAccessContext({
			user: roleProfile,
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
		const academicYearFilter = getAcademicYearFilterValue(academicYear);
		const classId = searchParams.get('classId');
		const period = searchParams.get('period');
		const semester = searchParams.get('semester');
		const subject = searchParams.get('subject');
		const status = searchParams.get('status');
		const teacherUsername = searchParams.get('teacherUsername');

		// --- System Admin ---
		if (currentUser.role === 'system_admin') {
			if (academicYear && classId && teacherUsername && subject) {
				const query: any = {
					academicYear: academicYearFilter,
					classId,
					teacherUsername,
					subject,
				};
				if (period) query.period = period;
				if (status) query.status = status;
				const rankingQuery: any = { academicYear: academicYearFilter, classId };
				if (status) rankingQuery.status = status;
				const [grades, rankingSource] = (await Promise.all([
					Grade.find(query).lean(),
					Grade.find(rankingQuery).lean(),
				])) as [GradeRecord[], GradeRecord[]];
				const rankedGrades = attachRanksToGrades(grades, rankingSource);
				return NextResponse.json({
					success: true,
					data: {
						grades: rankedGrades,
						academicYear,
						classId,
						teacherUsername,
						subject,
						period,
					},
				});
			}

			if (academicYear && classId && subject) {
				const query: any = {
					academicYear: academicYearFilter,
					classId,
					subject,
				};
				if (period) query.period = period;
				if (status) query.status = status;
				const rankingQuery: any = { academicYear: academicYearFilter, classId };
				if (status) rankingQuery.status = status;
				const [grades, rankingSource] = (await Promise.all([
					Grade.find(query).lean(),
					Grade.find(rankingQuery).lean(),
				])) as [GradeRecord[], GradeRecord[]];
				const rankedGrades = attachRanksToGrades(grades, rankingSource);
				return NextResponse.json({
					success: true,
					data: {
						grades: rankedGrades,
						academicYear,
						classId,
						subject,
						period,
					},
				});
			}

			if (academicYear && classId && period) {
				const query: any = {
					academicYear: academicYearFilter,
					classId,
					period,
				};
				if (status) query.status = status;
				const rankingQuery: any = { academicYear: academicYearFilter, classId };
				if (status) rankingQuery.status = status;
				const [grades, rankingSource] = (await Promise.all([
					Grade.find(query).lean(),
					Grade.find(rankingQuery).lean(),
				])) as [GradeRecord[], GradeRecord[]];
				const rankedGrades = attachRanksToGrades(grades, rankingSource);
				return NextResponse.json({
					success: true,
					data: { grades: rankedGrades, academicYear, classId, period },
				});
			}

			if (academicYear && classId) {
				const query: any = {
					academicYear: academicYearFilter,
					classId,
					status: status || 'Approved',
				};
				const grades = (await Grade.find(query).lean()) as GradeRecord[];
				const report = processClassYearlyReport(grades, classId);
				return NextResponse.json({
					success: true,
					data: { report, academicYear, classId },
				});
			}

			if (academicYear) {
				const query: any = { academicYear: academicYearFilter };
				if (status) query.status = status;
				const allGrades = (await Grade.find(query).lean()) as GradeRecord[];
				const rankedAllGrades = attachRanksToGrades(allGrades, allGrades);
				const report = processAllGradesReport(rankedAllGrades, academicYear);
				return NextResponse.json({
					success: true,
					data: { report, academicYear },
				});
			}
		}

		// --- Teacher ---
		if (currentUser.role === 'teacher') {
			const teacher = roleProfile;
			const yearData = getTeacherYearData(
				teacher,
				academicYear,
				currentAcademicYear,
			);
			if (!yearData) {
				return NextResponse.json(
					{
						success: false,
						message: 'You were not assigned to this academic year',
					},
					{ status: 403 },
				);
			}

			let allowedClassIds = (yearData.classes || []).map((c: any) => c.classId);
			if (classId) {
				if (!allowedClassIds.includes(classId)) {
					return NextResponse.json(
						{
							success: false,
							message: 'You are not assigned to this class for this year',
						},
						{ status: 403 },
					);
				}
				allowedClassIds = [classId];
			}

			if (subject) {
				if (!classId) {
					return NextResponse.json(
						{
							success: false,
							message: 'classId is required when filtering by subject',
						},
						{ status: 400 },
					);
				}
				const classData = getTeacherClassData(yearData, classId);
				const subjects = classData?.subjects || [];
				if (!subjects.includes(subject)) {
					return NextResponse.json(
						{
							success: false,
							message: 'You are not assigned to this subject for this class',
						},
						{ status: 403 },
					);
				}
			}

			const query: any = {
				academicYear: academicYearFilter,
				classId: { $in: allowedClassIds },
			};
			query.teacherUsername = currentUser.username;
			if (subject) query.subject = subject;
			if (period) query.period = period;
			if (status) query.status = status;

			const grades = (await Grade.find(query).lean()) as GradeRecord[];
			return NextResponse.json({
				success: true,
				data: {
					grades,
					academicYear,
					classId: classId || null,
					period,
					subject,
				},
			});
		}

		// --- Student ---
		if (currentUser.role === 'student') {
			const student = roleProfile;
			const studentClassId = getStudentClassIdForYear(
				student,
				academicYear,
				currentAcademicYear,
			);
			if (!studentClassId) {
				return NextResponse.json(
					{
						success: false,
						message: 'No class assigned for the requested academic year.',
					},
					{ status: 403 },
				);
			}
			if (classId && classId !== studentClassId) {
				return NextResponse.json(
					{
						success: false,
						message:
							'You can only access grades for your assigned class in the requested academic year.',
					},
					{ status: 403 },
				);
			}
			if (period) {
				const allowedPeriods =
					schoolProfile?.settings?.studentSettings?.reportAccessPeriods || [];
				if (!allowedPeriods.includes(period)) {
					return NextResponse.json(
						{
							success: false,
							message: 'You are not allowed to access grades for this period',
						},
						{ status: 403 },
					);
				}
			} else if (semester) {
				const allowedSemesters =
					schoolProfile?.settings?.studentSettings?.reportAccessSemesters || [];
				if (!allowedSemesters.includes(semester)) {
					return NextResponse.json(
						{
							success: false,
							message: 'You are not allowed to access grades for this semester',
						},
						{ status: 403 },
					);
				}
			} else if (
				schoolProfile?.settings?.studentSettings?.yearlyReportAccess === false
			) {
				return NextResponse.json(
					{
						success: false,
						message: 'You are not allowed to access yearly grades',
					},
					{ status: 403 },
				);
			}

			const query: any = {
				academicYear: academicYearFilter,
				studentId: student.studentId,
			};
			if (classId) query.classId = classId;
			if (period) query.period = period;
			if (subject) query.subject = subject;
			if (status) query.status = status;

			const grades = (await Grade.find(query).lean()) as GradeRecord[];
			let classContextId = studentClassId;
			const gradeClassIds = Array.from(
				new Set(
					grades
						.map((grade) => String(grade?.classId || '').trim())
						.filter(Boolean),
				),
			);
			if (
				classContextId &&
				gradeClassIds.length > 0 &&
				!gradeClassIds.includes(classContextId)
			) {
				classContextId = gradeClassIds[0];
			}
			if (!classContextId && gradeClassIds.length > 0) {
				classContextId = gradeClassIds[0];
			}
			if (!classContextId) {
				return NextResponse.json(
					{
						success: false,
						message: 'No class context found for the requested academic year.',
					},
					{ status: 403 },
				);
			}
			const classReportQuery: any = {
				academicYear: academicYearFilter,
				classId: classContextId,
				status: status || 'Approved',
			};
			const classGrades = (await Grade.find(
				classReportQuery,
			).lean()) as GradeRecord[];
			const rankedGrades = attachRanksToGrades(grades, classGrades);
			const studentIds = [student.studentId];

			let report: StudentYearlyReport[] | StudentPeriodicReport[] = [];
			if (period) {
				report = processClassPeriodicReport(
					classGrades,
					classContextId,
					period,
					studentIds,
				);
			} else {
				report = processClassYearlyReport(
					classGrades,
					classContextId,
					studentIds,
				);
			}

			return NextResponse.json({
				success: true,
				data: {
					grades: rankedGrades,
					report,
					academicYear,
					classId: classContextId,
					period,
					semester: semester || null,
				},
			});
		}

		return NextResponse.json(
			{ success: false, message: 'Invalid user role' },
			{ status: 403 },
		);
	} catch (error) {
		console.error('Error in grades GET:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// POST, PUT, PATCH handlers remain unchanged
export async function POST(request: NextRequest) {
	
	// Temporary RESTRICTION ON POSTING GRADES

	return NextResponse.json(
		{
			success: false,
			message:
				'MongoDB Cluster storage limit exceeded. Upgrade your cluster tier or delete data to continue writing.',
		},
		{ status: 500 },
	);

	try {
		const teacher = await authorizeUser(request, ['teacher']);
		if (!teacher) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}
		const models = await getTenantModels();
		const { Grade, User, Student } = models;
		const body = await request.json();
		const { classId, subject, period, grades, academicYear } = body;
		const resolvedAcademicYear = academicYear || getCurrentAcademicYear();
		const currentAcademicYear = getCurrentAcademicYear();

		if (!classId || !subject || !grades || !period) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields' },
				{ status: 400 },
			);
		}

		// Fetch school settings to check if grade submission is allowed
		const schoolProfile = await getSchoolProfile();
		const tenantKey = resolveTenantSyncKey({
			schoolProfile,
			tenantId: teacher.tenantId,
			host: request.headers.get('host'),
		});
		const className = getClassNameFromId(schoolProfile, classId) || classId;
		const passMark = schoolProfile?.settings?.gradingSettings?.passMark ?? 60;
		const gradeMin =
			schoolProfile?.settings?.gradingSettings?.gradeScale?.min ?? 0;
		const gradeMax =
			schoolProfile?.settings?.gradingSettings?.gradeScale?.max ?? 100;

		if (schoolProfile?.settings?.teacherSettings) {
			const { gradeSubmissionAcademicYears = [], gradeSubmissionPeriods = [] } =
				schoolProfile.settings.teacherSettings;

			if (
				!gradeSubmissionAcademicYears.includes(resolvedAcademicYear) ||
				!gradeSubmissionPeriods.includes(period)
			) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Grade submission is not currently open for this academic year or period.',
					},
					{ status: 403 },
				);
			}
		}

		const teacherRecord = await models.Teacher.findById(teacher.id)
			.select('subjects')
			.lean();
		const teacherYearData = getTeacherYearData(
			teacherRecord,
			resolvedAcademicYear,
			currentAcademicYear,
		);
		if (!teacherYearData) {
			return NextResponse.json(
				{
					success: false,
					message:
						'You are not assigned to this academic year for grade submission.',
				},
				{ status: 403 },
			);
		}
		const classData = getTeacherClassData(teacherYearData, classId);
		if (!classData) {
			return NextResponse.json(
				{
					success: false,
					message: 'You are not assigned to this class for this year.',
				},
				{ status: 403 },
			);
		}
		const allowedSubjects = classData.subjects || [];
		if (!allowedSubjects.includes(subject)) {
			return NextResponse.json(
				{
					success: false,
					message:
						'You are not authorized to submit grades for this class/subject.',
				},
				{ status: 403 },
			);
		}

		const validation = validateGrades(grades, gradeMin, gradeMax);
		if (!validation.isValid) {
			return NextResponse.json(
				{ success: false, message: validation.message },
				{ status: 400 },
			);
		}

		const studentPeriodPairs = grades.map((g: any) => ({
			studentId: g.studentId,
			period: g.period,
		}));

		// Fetch existing grades for these students/periods/subject/academicYear
		const existingGrades = await Grade.find({
			$or: studentPeriodPairs.map((pair: any) => ({
				studentId: pair.studentId,
				period: pair.period,
				subject,
				academicYear: resolvedAcademicYear,
			})),
		});

		// Separate grades by status
		const rejectedGrades = existingGrades.filter(
			(g: any) => g.status === 'Rejected',
		);
		const nonRejectedGrades = existingGrades.filter(
			(g: any) => g.status !== 'Rejected',
		);

		if (nonRejectedGrades.length > 0) {
			const conflicts = nonRejectedGrades
				.map((g: any) => `${g.studentName} (${g.period}) - ${g.status}`)
				.join(', ');
			return NextResponse.json(
				{
					success: false,
					message: `Cannot submit grades. The following students already have grades for their respective periods and subject: ${conflicts}`,
				},
				{ status: 409 },
			);
		}

		// Remove all rejected grades for these students/periods/subject/academicYear
		if (rejectedGrades.length > 0) {
			await Grade.deleteMany({
				$or: rejectedGrades.map((g: any) => ({
					studentId: g.studentId,
					period: g.period,
					subject,
					academicYear: resolvedAcademicYear,
				})),
			});
		}

		const submittedStudentIds: string[] = Array.from(
			new Set(
				grades
					.map((grade: any) => String(grade?.studentId || '').trim())
					.filter(Boolean),
			),
		);
		const duplicateStudentPeriodKeys = new Set<string>();
		for (const grade of grades) {
			const key = `${String(grade?.studentId || '').trim()}::${String(
				grade?.period || '',
			).trim()}`;
			if (duplicateStudentPeriodKeys.has(key)) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Duplicate grade entries detected for the same student and period.',
					},
					{ status: 400 },
				);
			}
			duplicateStudentPeriodKeys.add(key);
		}

		const studentNameById = new Map<string, string>();
		if (submittedStudentIds.length > 0) {
			const students = await Student.find({
				studentId: { $in: submittedStudentIds },
			})
				.select('studentId firstName middleName lastName classId academicYears')
				.lean();

			const validStudentIds = new Set<string>();
			students.forEach((student: any) => {
				const studentId = String(student?.studentId || '').trim();
				if (!studentId) return;
				const studentClassId = getStudentClassIdForYear(
					student,
					resolvedAcademicYear,
					currentAcademicYear,
				);
				if (studentClassId !== classId) return;
				validStudentIds.add(studentId);
				const fullName = buildFullNameFromUser(student);
				if (fullName) {
					studentNameById.set(studentId, fullName);
				}
			});

			const invalidStudents = submittedStudentIds.filter(
				(studentId) => !validStudentIds.has(studentId),
			);
			if (invalidStudents.length > 0) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Some students are not enrolled in this class for the selected academic year.',
						invalidStudentIds: invalidStudents,
					},
					{ status: 400 },
				);
			}
		}

		const lastUpdated = new Date();
		const gradeDocuments = grades.map((grade: any) => ({
			classId,
			subject,
			teacherUsername: teacher.username,
			academicYear: resolvedAcademicYear,
			period: grade.period,
			studentId: String(grade.studentId || '').trim(),
			studentName:
				studentNameById.get(String(grade.studentId || '').trim()) ||
				normalizeNamePart(grade.studentName || ''),
			grade: grade.grade,
			status: 'Pending',
			submissionId: getSubmissionId(
				resolvedAcademicYear,
				classId,
				grade.period,
				subject,
			),
			lastUpdated,
		}));
		const result = await Grade.insertMany(gradeDocuments);

		// Notify admins per submissionId (one notification per batch/period)
		const submissionSummary = new Map<
			string,
			{
				count: number;
				period: string;
				gradedCount: number;
				passes: number;
				fails: number;
			}
		>();
		for (const doc of gradeDocuments) {
			const isNumeric = typeof doc.grade === 'number' && !isNaN(doc.grade);
			const existing = submissionSummary.get(doc.submissionId);
			if (existing) {
				existing.count += 1;
				if (isNumeric) {
					existing.gradedCount += 1;
					if (doc.grade >= passMark) {
						existing.passes += 1;
					} else {
						existing.fails += 1;
					}
				}
			} else {
				submissionSummary.set(doc.submissionId, {
					count: 1,
					period: doc.period,
					gradedCount: isNumeric ? 1 : 0,
					passes: isNumeric && doc.grade >= passMark ? 1 : 0,
					fails: isNumeric && doc.grade < passMark ? 1 : 0,
				});
			}
		}

		const admins = await User.find({ role: 'system_admin' })
			.select('_id')
			.lean();
		const notificationPromises = [];
		for (const [submissionId, summary] of submissionSummary.entries()) {
			const details = {
				teacherName: teacher.fullName || teacher.username,
				className,
				period: formatPeriodLabel(summary.period),
				subject,
				studentsGraded: summary.gradedCount,
				passes: summary.passes,
				fails: summary.fails,
				academicYear: resolvedAcademicYear,
				submissionId,
			};
			const notification = {
				title: 'New Grade Submission',
				message: `${details.teacherName} submitted grades for ${details.className} • ${details.subject} • ${details.period}. ${details.studentsGraded} graded (${details.passes} pass, ${details.fails} fail).`,
				details: JSON.stringify(details),
				timestamp: new Date(),
				read: false,
				type: 'Grades',
			};
			for (const admin of admins) {
				notificationPromises.push(
					addNotificationToUser(User, admin._id.toString(), notification, {
						tenantKey,
						actorId: teacher.id,
						reason: 'grade-submission-notification',
					}),
				);
			}
		}
		await Promise.allSettled(notificationPromises);
		await publishSyncEventSafe({
			tenantKey,
			domain: 'grades',
			payload: { grades: gradeDocuments },
			academicYear: String(resolvedAcademicYear || ''),
			actorId: teacher.id,
			reason: 'grades-submitted',
			scope: {
				classIds: [String(classId)],
			},
		});

		return NextResponse.json({ success: true, data: result }, { status: 201 });
	} catch (error) {
		console.error('Error in grades POST:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['teacher']);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}
		const { Grade, Student } = await getTenantModels();
		const body = await request.json();
		const { submissionId, grades } = body;
		if (!submissionId || !grades) {
			return NextResponse.json(
				{ success: false, message: 'Missing submissionId or grades' },
				{ status: 400 },
			);
		}
		const existingSubmission = await Grade.findOne({ submissionId }).lean();
		if (
			!existingSubmission ||
			existingSubmission.teacherUsername !== currentUser.username
		) {
			return NextResponse.json(
				{ success: false, message: 'Submission not found or unauthorized' },
				{ status: 404 },
			);
		}
		if (existingSubmission.status === 'Approved') {
			return NextResponse.json(
				{
					success: false,
					message:
						'Cannot update an approved submission. Please request a grade change.',
				},
				{ status: 403 },
			);
		}

		const schoolProfile = await getSchoolProfile();
		const tenantKey = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: request.headers.get('host'),
		});
		const teacherSettings = schoolProfile?.settings?.teacherSettings;
		const submissionAcademicYear = String(
			existingSubmission.academicYear || '',
		);
		const submissionPeriods = Array.from(
			new Set(
				(grades || []).map((grade: any) => String(grade?.period || '').trim()),
			),
		).filter(Boolean);
		const allowedSubmissionYears = Array.isArray(
			teacherSettings?.gradeSubmissionAcademicYears,
		)
			? teacherSettings.gradeSubmissionAcademicYears
			: [];
		const allowedSubmissionPeriods = Array.isArray(
			teacherSettings?.gradeSubmissionPeriods,
		)
			? teacherSettings.gradeSubmissionPeriods
			: [];
		if (
			!allowedSubmissionYears.includes(submissionAcademicYear) ||
			submissionPeriods.some(
				(periodValue) => !allowedSubmissionPeriods.includes(periodValue),
			)
		) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Grade submission is not currently open for this academic year or period.',
				},
				{ status: 403 },
			);
		}

		const gradeMin =
			schoolProfile?.settings?.gradingSettings?.gradeScale?.min ?? 0;
		const gradeMax =
			schoolProfile?.settings?.gradingSettings?.gradeScale?.max ?? 100;
		const validation = validateGrades(grades, gradeMin, gradeMax);
		if (!validation.isValid) {
			return NextResponse.json(
				{ success: false, message: validation.message },
				{ status: 400 },
			);
		}

		const currentAcademicYear = getCurrentAcademicYear();
		const submittedStudentIds: string[] = Array.from(
			new Set(
				grades
					.map((grade: any) => String(grade?.studentId || '').trim())
					.filter(Boolean),
			),
		);
		const duplicateStudentPeriodKeys = new Set<string>();
		for (const grade of grades) {
			const key = `${String(grade?.studentId || '').trim()}::${String(
				grade?.period || '',
			).trim()}`;
			if (duplicateStudentPeriodKeys.has(key)) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Duplicate grade entries detected for the same student and period.',
					},
					{ status: 400 },
				);
			}
			duplicateStudentPeriodKeys.add(key);
		}

		const studentNameById = new Map<string, string>();
		if (submittedStudentIds.length > 0) {
			const students = await Student.find({
				studentId: { $in: submittedStudentIds },
			})
				.select('studentId firstName middleName lastName classId academicYears')
				.lean();
			const validStudentIds = new Set<string>();
			students.forEach((student: any) => {
				const studentId = String(student?.studentId || '').trim();
				if (!studentId) return;
				const studentClassId = getStudentClassIdForYear(
					student,
					submissionAcademicYear,
					currentAcademicYear,
				);
				if (studentClassId !== existingSubmission.classId) return;
				validStudentIds.add(studentId);
				const fullName = buildFullNameFromUser(student);
				if (fullName) {
					studentNameById.set(studentId, fullName);
				}
			});
			const invalidStudents = submittedStudentIds.filter(
				(studentId) => !validStudentIds.has(studentId),
			);
			if (invalidStudents.length > 0) {
				return NextResponse.json(
					{
						success: false,
						message:
							'Some students are not enrolled in this class for the submission academic year.',
						invalidStudentIds: invalidStudents,
					},
					{ status: 400 },
				);
			}
		}
		await Grade.deleteMany({ submissionId });
		const newGradeDocuments = grades.map((grade: any) => ({
			...existingSubmission,
			studentId: String(grade.studentId || '').trim(),
			studentName:
				studentNameById.get(String(grade.studentId || '').trim()) ||
				normalizeNamePart(grade.name),
			grade: grade.grade,
			period: grade.period,
			status: 'Pending',
			lastUpdated: new Date(),
		}));
		const result = await Grade.insertMany(newGradeDocuments);
		await publishSyncEventSafe({
			tenantKey,
			domain: 'grades',
			payload: { grades: newGradeDocuments },
			academicYear: String(submissionAcademicYear || ''),
			actorId: currentUser.id,
			reason: 'grades-updated',
			scope: {
				classIds: [String(existingSubmission.classId || '')].filter(Boolean),
			},
		});
		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		console.error('Error in grades PUT:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 },
		);
	}
}

async function updateGradeStatus(
	submissionId: string,
	studentId: string,
	status: string,
	rejectionReason?: string,
) {
	const { Grade, User } = await getTenantModels();

	if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
		return {
			success: false,
			message: 'Invalid status. Must be Approved, Rejected, or Pending.',
			status: 400,
		};
	}

	const update: any = { status, lastUpdated: new Date() };
	if (status === 'Rejected' && rejectionReason) {
		update.rejectionReason = rejectionReason;
	}

	const result = await Grade.findOneAndUpdate(
		{ submissionId, studentId },
		{ $set: update },
		{ new: true },
	);

	if (!result) {
		return {
			success: false,
			message: 'Grade record not found',
			status: 404,
		};
	}

	return { success: true, data: result, status: 200 };
}

export async function PATCH(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['system_admin']);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 403 },
			);
		}
		const tenantKey = resolveTenantSyncKey({
			tenantId: currentUser.tenantId,
			host: request.headers.get('host'),
		});

		const { User } = await getTenantModels();
		const body = await request.json();
		const updates = Array.isArray(body) ? body : [body];

		const results = await Promise.all(
			updates.map(
				async ({ submissionId, studentId, status, rejectionReason }) => {
					if (!submissionId || !studentId || !status) {
						return {
							success: false,
							message: 'Missing required fields',
							submissionId,
							studentId,
						};
					}

					// Use the new function to update the grade status
					const updateResult = await updateGradeStatus(
						submissionId,
						studentId,
						status,
						rejectionReason,
					);

					return {
						success: updateResult.success,
						data: updateResult.data || updateResult.message,
						submissionId,
						studentId,
					};
				},
			),
		);

		const successfulUpdates = results.filter((result) => result.success);
		const failedUpdates = results.filter((result) => !result.success);

		if (successfulUpdates.length > 0) {
			const teacherSummary = new Map<
				string,
				{
					count: number;
					status: string;
					subject: string;
					classId: string;
					period: string;
				}
			>();

			for (const update of successfulUpdates) {
				const data = update.data;
				if (!data?.teacherUsername) continue;
				const key = `${data.teacherUsername}|${data.submissionId}|${data.status}`;
				const existing = teacherSummary.get(key);
				if (existing) {
					existing.count += 1;
				} else {
					teacherSummary.set(key, {
						count: 1,
						status: data.status,
						subject: data.subject,
						classId: data.classId,
						period: data.period,
					});
				}
			}

			const notificationPromises = Array.from(teacherSummary.entries()).map(
				async ([key, summary]) => {
					const teacherUsername = key.split('|')[0];
					const teacher = await User.findOne({ username: teacherUsername })
						.select('_id')
						.lean();
					if (!teacher) return;
					const notification = {
						title: `Grades ${summary.status}`,
						message: `Your ${summary.count} grade${
							summary.count === 1 ? '' : 's'
						} for ${summary.subject} (${summary.period}) in ${
							summary.classId
						} have been ${summary.status.toLowerCase()}. (${summary.count} student${
							summary.count === 1 ? '' : 's'
						})`,
						timestamp: new Date(),
						read: false,
						type: 'Grades',
					};
					await addNotificationToUser(
						User,
						teacher._id.toString(),
						notification,
						{
							tenantKey,
							actorId: currentUser.id,
							reason: 'grade-status-notification',
						},
					);
				},
			);
			await Promise.allSettled(notificationPromises);
		}

		if (successfulUpdates.length > 0) {
			const years = Array.from(
				new Set(
					successfulUpdates
						.map((entry) => String(entry?.data?.academicYear || '').trim())
						.filter(Boolean),
				),
			);
			const classIds = Array.from(
				new Set(
					successfulUpdates
						.map((entry) => String(entry?.data?.classId || '').trim())
						.filter(Boolean),
				),
			);
			await Promise.all(
				(years.length > 0 ? years : ['']).map((academicYear) => {
					const gradesForYear = successfulUpdates
						.filter(entry => String(entry?.data?.academicYear || '').trim() === academicYear)
						.map(entry => entry.data);
					return publishSyncEventSafe({
						tenantKey,
						domain: 'grades',
						payload: { grades: gradesForYear },
						academicYear: academicYear || null,
						actorId: currentUser.id,
						reason: 'grades-status-updated',
						scope: { classIds },
					});
				}),
			);
		}

		return NextResponse.json({
			success: true,
			message: `${successfulUpdates.length} updates succeeded, ${failedUpdates.length} failed.`,
			results,
		});
	} catch (error) {
		console.error('Error in grades PATCH:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 },
		);
	}
}
