import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser } from '@/middleware';
import { now } from 'mongoose';

// -----------------------------------------------------------------------------
// Types and Interfaces (Unchanged)
// -----------------------------------------------------------------------------
interface GradeRecord {
	submissionId: string;
	academicYear: string;
	period: string;
	classId: string;
	subject: string;
	teacherId: string;
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
	teacherId: string;
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
	teacherId: string;
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
		teacherId: string;
		studentId: string;
		studentName: string;
		grade: number;
		status: string;
		lastUpdated: Date;
	}>;
}

// -----------------------------------------------------------------------------
// Helper Functions (Unchanged)
// -----------------------------------------------------------------------------

function getCurrentAcademicYear() {
	const date = new Date();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function getSubmissionId(classId: string, period: string, subject: string) {
	return `${getCurrentAcademicYear()}-${classId}-${period}-${subject}`
		.replaceAll(/[\/\s+]/gi, '')
		.toLowerCase();
}

function validateGrades(grades: any[]): { isValid: boolean; message?: string } {
	if (!Array.isArray(grades)) {
		return { isValid: false, message: 'Grades must be an array.' };
	}
	for (const grade of grades) {
		if (
			!grade.studentId ||
			!grade.name ||
			!grade.period ||
			(grade.grade &&
				(typeof grade.grade !== 'number' ||
					grade.grade < 60 ||
					grade.grade > 100))
		) {
			return {
				isValid: false,
				message: `Invalid grade entry for ${grade.name || 'a student'}.`,
			};
		}
	}
	return { isValid: true };
}

function getStats(grades: Array<{ grade: number }>) {
	const validGrades = grades.filter(
		(g) => typeof g.grade === 'number' && !isNaN(g.grade)
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
	students: Array<{ studentId: string; average: number }>
) {
	if (students.length === 0) return [];
	const studentsWithRoundedAvg = students.map((student) => ({
		...student,
		roundedAverage: parseFloat(student.average.toFixed(1)),
	}));
	const sortedStudents = [...studentsWithRoundedAvg].sort(
		(a, b) => b.roundedAverage - a.roundedAverage
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
	grades: Array<{ subject: string; grade: number }>
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
	grades: GradeRecord[],
	academicYear: string
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
			teacherId: grade.teacherId,
			studentId: grade.studentId,
			studentName: grade.studentName,
			grade: grade.grade,
			status: grade.status,
			lastUpdated: grade.lastUpdated,
		})),
	};
}

function processGradeSubmissionReport(
	grades: GradeRecord[],
	teacherId: string
): GradeSubmissionReport {
	// Filter grades by teacher
	const teacherGrades = grades.filter((g) => g.teacherId === teacherId);

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
			(s: any) => s.status === 'Pending'
		).length;
		const approvedCount = submission.students.filter(
			(s: any) => s.status === 'Approved'
		).length;
		const rejectedCount = submission.students.filter(
			(s: any) => s.status === 'Rejected'
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
		teacherId,
		academicYear: grades[0]?.academicYear || getCurrentAcademicYear(),
		submissions,
	};
}

function processClassPeriodicReport(
	grades: GradeRecord[],
	classId: string,
	period: string,
	studentIds?: string[]
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
		}
	);

	// Calculate ranks based on ALL students in the class
	const rankedData = calculateRanks(
		studentsWithAverages.map((s) => ({
			studentId: s.studentId,
			average: s.periodicAverage,
		}))
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
	teacherId?: string,
	studentIds?: string[]
): MastersReport {
	// Filter grades for the report (but don't filter by studentIds yet for ranking)
	let filteredGrades = grades.filter((g) => g.classId === classId);
	if (subject) {
		filteredGrades = filteredGrades.filter((g) => g.subject === subject);
	}
	if (teacherId) {
		filteredGrades = filteredGrades.filter((g) => g.teacherId === teacherId);
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
		}
	);

	// Filter by specific student IDs AFTER processing all students
	let finalStudents = studentsWithAverages;
	if (studentIds && studentIds.length > 0) {
		finalStudents = studentsWithAverages.filter((student) =>
			studentIds.includes(student.studentId)
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
		teacherId: teacherId || 'All Teachers',
		classId,
		students: finalStudents,
		periodStats,
	};
}

function processClassYearlyReport(
	grades: GradeRecord[],
	classId: string,
	studentIds?: string[]
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
			if (!student.periods[g.period]) {
				student.periods[g.period] = [];
			}
			student.periods[g.period].push({ subject: g.subject, grade: g.grade });
		});

	// Calculate all averages and ranks for ALL students
	studentsMap.forEach((student) => {
		const allSubjects = Array.from(subjectsSet);
		Object.keys(student.periods).forEach((period) => {
			student.periods[period] = removeDuplicateSubjects(
				student.periods[period]
			);
		});

		allSubjects.forEach((subject) => {
			const getGradeForPeriod = (period: string) =>
				student.periods[period]?.find((g) => g.subject === subject)?.grade;
			const firstSemGrades = [
				getGradeForPeriod('firstPeriod'),
				getGradeForPeriod('secondPeriod'),
				getGradeForPeriod('thirdPeriod'),
			].filter((g): g is number => g !== undefined);
			if (firstSemGrades.length > 0) {
				const avg =
					firstSemGrades.reduce((a, b) => a + b, 0) / firstSemGrades.length;
				const exam = getGradeForPeriod('thirdPeriodExam');
				student.firstSemesterAverage[subject] = Math.round(
					exam !== undefined ? (avg + exam) / 2 : avg
				);
			}

			const secondSemGrades = [
				getGradeForPeriod('fourthPeriod'),
				getGradeForPeriod('fifthPeriod'),
				getGradeForPeriod('sixthPeriod'),
			].filter((g): g is number => g !== undefined);
			if (secondSemGrades.length > 0) {
				const avg =
					secondSemGrades.reduce((a, b) => a + b, 0) / secondSemGrades.length;
				const exam = getGradeForPeriod('sixthPeriodExam');
				student.secondSemesterAverage[subject] = Math.round(
					exam !== undefined ? (avg + exam) / 2 : avg
				);
			}

			const firstAvg = student.firstSemesterAverage[subject];
			const secondAvg = student.secondSemesterAverage[subject];
			if (firstAvg !== undefined && secondAvg !== undefined) {
				student.yearlySubjectAverages[subject] = parseFloat(
					((firstAvg + secondAvg) / 2).toFixed(1)
				);
			} else if (firstAvg !== undefined) {
				student.yearlySubjectAverages[subject] = firstAvg;
			} else if (secondAvg !== undefined) {
				student.yearlySubjectAverages[subject] = secondAvg;
			}
		});

		for (const period in student.periods) {
			student.periodAverages[period] = getStats(
				student.periods[period]
			).average;
		}
		const yearlyAvgs = Object.values(student.yearlySubjectAverages).filter(
			(avg) => !isNaN(avg) && avg > 0
		);
		student.yearlyAverage =
			yearlyAvgs.length > 0
				? parseFloat(
						(yearlyAvgs.reduce((a, b) => a + b, 0) / yearlyAvgs.length).toFixed(
							1
						)
				  )
				: 0;
		student.periodAverages.yearlyAverage = student.yearlyAverage;

		const firstSemAvgs = Object.values(student.firstSemesterAverage).filter(
			(avg) => !isNaN(avg) && avg > 0
		);
		if (firstSemAvgs.length > 0) {
			student.periodAverages.firstSemesterAverage = parseFloat(
				(firstSemAvgs.reduce((a, b) => a + b, 0) / firstSemAvgs.length).toFixed(
					1
				)
			);
		}
		const secondSemAvgs = Object.values(student.secondSemesterAverage).filter(
			(avg) => !isNaN(avg) && avg > 0
		);
		if (secondSemAvgs.length > 0) {
			student.periodAverages.secondSemesterAverage = parseFloat(
				(
					secondSemAvgs.reduce((a, b) => a + b, 0) / secondSemAvgs.length
				).toFixed(1)
			);
		}
	});

	const studentsArray = Array.from(studentsMap.values());
	const allPeriodsAndAverages = [
		...new Set(
			grades.filter((g) => g.classId === classId).map((g) => g.period)
		),
		'firstSemesterAverage',
		'secondSemesterAverage',
	];

	// Calculate ranks for ALL students in the class
	allPeriodsAndAverages.forEach((period) => {
		const periodRanks = calculateRanks(
			studentsArray.map((s) => ({
				studentId: s.studentId,
				average: s.periodAverages[period] || 0,
			}))
		);
		periodRanks.forEach((r) => {
			const student = studentsMap.get(r.studentId);
			if (student) student.ranks[period] = (r as any).rank;
		});
	});

	const yearlyRanks = calculateRanks(
		studentsArray.map((s) => ({
			studentId: s.studentId,
			average: s.yearlyAverage,
		}))
	);
	yearlyRanks.forEach((r) => {
		const student = studentsMap.get(r.studentId);
		if (student) student.ranks.yearly = (r as any).rank;
	});

	// Sort all students by yearly rank
	let finalResult = studentsArray.sort(
		(a, b) => (a.ranks.yearly || Infinity) - (b.ranks.yearly || Infinity)
	);

	// Filter by specific student IDs AFTER calculating ranks
	if (studentIds && studentIds.length > 0) {
		finalResult = finalResult.filter((student) =>
			studentIds.includes(student.studentId)
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
				{ status: 401 }
			);
		}

		const { Grade } = await getTenantModels();
		const { searchParams } = new URL(request.url);

		// --- 1. Extract and process parameters ---
		const academicYear =
			searchParams.get('academicYear') || getCurrentAcademicYear();
		let classId = searchParams.get('classId');
		const period = searchParams.get('period');
		const subject = searchParams.get('subject');
		const reportType = searchParams.get('reportType');
		let teacherId = searchParams.get('teacherId');
		let studentIds = parseStudentIds(searchParams.get('studentIds'));

		// --- 2. Check for system_admin requesting all grades for academic year ---
		if (
			currentUser.role === 'system_admin' &&
			academicYear &&
			!classId &&
			!period &&
			!subject &&
			!reportType &&
			!teacherId &&
			!studentIds
		) {
			// Fetch all grades for the academic year
			const allGrades = (await Grade.find({
				academicYear,
			}).lean()) as GradeRecord[];

			if (allGrades.length === 0) {
				return NextResponse.json({
					success: true,
					message: 'No grades found for this academic year.',
					data: {
						report: {
							academicYear,
							totalRecords: 0,
							grades: [],
						},
					},
				});
			}

			const reportData = processAllGradesReport(allGrades, academicYear);

			return NextResponse.json({
				success: true,
				data: {
					report: reportData,
					academicYear,
				},
			});
		}

		// --- 3. Apply security and role-based overrides ---
		if (currentUser.role === 'student') {
			studentIds = [currentUser.studentId];
			teacherId = null; // Students can't filter by teacher
			// A student's classId is the source of truth
			classId = currentUser.classId;
		} else if (currentUser.role === 'teacher') {
			// A teacher can only see their own grades unless they're requesting grade submissions
			if (reportType !== 'gradeSubmission') {
				teacherId = currentUser.teacherId;
			} else {
				// For grade submissions, use the teacherId from params or default to current user
				teacherId = teacherId || currentUser.teacherId;
			}
		}

		// --- 4. Handle gradeSubmission report type early ---
		if (reportType === 'gradeSubmission') {
			if (!teacherId) {
				return NextResponse.json(
					{
						success: false,
						message: 'teacherId is required for grade submission reports',
					},
					{ status: 400 }
				);
			}

			// Authorization check for grade submissions
			if (
				currentUser.role === 'teacher' &&
				currentUser.teacherId !== teacherId
			) {
				return NextResponse.json(
					{
						success: false,
						message: 'Teachers can only view their own grade submissions',
					},
					{ status: 403 }
				);
			}

			// Fetch all grades for the teacher
			const teacherGrades = (await Grade.find({
				academicYear,
				teacherId,
			}).lean()) as GradeRecord[];

			if (teacherGrades.length === 0) {
				return NextResponse.json({
					success: true,
					message: 'No grade submissions found for this teacher.',
					data: {
						report: {
							teacherId,
							academicYear,
							submissions: [],
						},
					},
				});
			}

			const reportData = processGradeSubmissionReport(teacherGrades, teacherId);

			return NextResponse.json({
				success: true,
				data: {
					report: reportData,
					academicYear,
					teacherId,
				},
			});
		}

		// --- 5. Build the primary database query for other report types ---
		const query: any = { academicYear };

		if (classId) {
			query.classId = classId;
		} else if (studentIds && studentIds.length > 0) {
			// If no classId, try to find it from the first student's record
			const studentRecord = await Grade.findOne({
				studentId: studentIds[0],
				academicYear,
			}).lean();
			if (studentRecord) {
				query.classId = studentRecord.classId;
				classId = studentRecord.classId; // Update classId for use below
			} else {
				return NextResponse.json(
					{
						success: true,
						message: 'No grades found for the student to determine class.',
						data: { report: [] },
					},
					{ status: 200 }
				);
			}
		}

		// For ranking, we need all grades for the determined class, regardless of selected students.
		const allGradesForClass = (await Grade.find({
			academicYear: query.academicYear,
			classId: query.classId,
		}).lean()) as GradeRecord[];

		// --- 6. Process the data based on report type ---
		let reportData: any;

		if (period) {
			// Periodic Report
			if (!query.classId) {
				return NextResponse.json(
					{
						success: false,
						message: 'classId is required for periodic reports',
					},
					{ status: 400 }
				);
			}
			reportData = processClassPeriodicReport(
				allGradesForClass,
				query.classId,
				period,
				studentIds || undefined
			);
			if (studentIds?.length === 1 && reportData.length === 1) {
				reportData = reportData[0]; // Return single object if one student was requested
			}
		} else if (subject) {
			// Masters Report
			reportData = processMastersReport(
				allGradesForClass,
				query.classId,
				subject,
				teacherId || undefined,
				studentIds || undefined
			);
		} else {
			// Yearly Report (default)
			if (!query.classId) {
				return NextResponse.json(
					{ success: false, message: 'classId is required for yearly reports' },
					{ status: 400 }
				);
			}
			reportData = processClassYearlyReport(
				allGradesForClass,
				query.classId,
				studentIds || undefined
			);
			if (studentIds?.length === 1 && reportData.length === 1) {
				reportData = reportData[0]; // Return single object if one student was requested
			}
		}

		// --- 7. Return the final response ---
		return NextResponse.json({
			success: true,
			data: {
				report: reportData,
				academicYear,
				classId: query.classId,
				period,
				studentIds,
			},
		});
	} catch (error) {
		console.error('Error in grades GET:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// POST, PUT, PATCH handlers remain unchanged
export async function POST(request: NextRequest) {
	try {
		const teacher = await authorizeUser(request, ['teacher']);
		if (!teacher) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}
		const { Grade } = await getTenantModels();
		const body = await request.json();
		const { classId, subject, grades } = body;
		if (!classId || !subject || !grades) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields' },
				{ status: 400 }
			);
		}
		const isAuthorized = teacher.subjects.some(
			(s: any) => s.subject === subject
		);
		if (!isAuthorized) {
			return NextResponse.json(
				{
					success: false,
					message:
						'You are not authorized to submit grades for this class/subject',
				},
				{ status: 403 }
			);
		}

		// Check if the teacher is a "Self Contained" teacher and validate the classId
		const isSelfContained = teacher.subjects.some(
			(s: any) => s.level === 'Self Contained'
		);
		if (isSelfContained && teacher.sponsorClass !== classId) {
			return NextResponse.json(
				{
					success: false,
					message:
						'Self Contained teachers can only submit grades for their own sponsor class.',
				},
				{ status: 403 }
			);
		}

		const validation = validateGrades(grades);
		if (!validation.isValid) {
			return NextResponse.json(
				{ success: false, message: validation.message },
				{ status: 400 }
			);
		}
		const studentPeriodPairs = grades.map((g: any) => ({
			studentId: g.studentId,
			period: g.period,
		}));
		const existingGrades = await Grade.find({
			$or: studentPeriodPairs.map((pair: any) => ({
				studentId: pair.studentId,
				period: pair.period,
				subject,
				academicYear: getCurrentAcademicYear(),
			})),
		});
		if (existingGrades.length > 0) {
			const conflicts = existingGrades
				.map((g: any) => `${g.studentName} (${g.period}) - ${g.status}`)
				.join(', ');
			return NextResponse.json(
				{
					success: false,
					message: `Cannot submit grades. The following students already have grades for their respective periods and subject: ${conflicts}`,
				},
				{ status: 409 }
			);
		}
		const lastUpdated = new Date();
		const gradeDocuments = grades.map((grade: any) => ({
			classId,
			subject,
			teacherId: teacher.teacherId,
			academicYear: getCurrentAcademicYear(),
			period: grade.period,
			studentId: grade.studentId,
			studentName: grade.name,
			grade: grade.grade,
			status: 'Pending',
			submissionId: getSubmissionId(classId, grade.period, subject),
			lastUpdated,
		}));
		const result = await Grade.insertMany(gradeDocuments);
		return NextResponse.json({ success: true, data: result }, { status: 201 });
	} catch (error) {
		console.error('Error in grades POST:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request, ['teacher']);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}
		const { Grade } = await getTenantModels();
		const body = await request.json();
		const { submissionId, grades } = body;
		if (!submissionId || !grades) {
			return NextResponse.json(
				{ success: false, message: 'Missing submissionId or grades' },
				{ status: 400 }
			);
		}
		const validation = validateGrades(grades);
		if (!validation.isValid) {
			return NextResponse.json(
				{ success: false, message: validation.message },
				{ status: 400 }
			);
		}
		const existingSubmission = await Grade.findOne({ submissionId }).lean();
		if (
			!existingSubmission ||
			existingSubmission.teacherId !== currentUser.teacherId
		) {
			return NextResponse.json(
				{ success: false, message: 'Submission not found or unauthorized' },
				{ status: 404 }
			);
		}
		if (existingSubmission.status === 'Approved') {
			return NextResponse.json(
				{
					success: false,
					message:
						'Cannot update an approved submission. Please request a grade change.',
				},
				{ status: 403 }
			);
		}
		await Grade.deleteMany({ submissionId });
		const newGradeDocuments = grades.map((grade: any) => ({
			...existingSubmission,
			studentId: grade.studentId,
			studentName: grade.name,
			grade: grade.grade,
			period: grade.period,
			status: 'Pending',
			lastUpdated: new Date(),
		}));
		const result = await Grade.insertMany(newGradeDocuments);
		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		console.error('Error in grades PUT:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

async function updateGradeStatus(
	submissionId: string,
	studentId: string,
	status: string
) {
	const { Grade } = await getTenantModels();

	if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
		return {
			success: false,
			message: 'Invalid status. Must be Approved, Rejected, or Pending.',
			status: 400,
		};
	}

	const result = await Grade.findOneAndUpdate(
		{ submissionId, studentId },
		{ $set: { status, lastUpdated: new Date() } },
		{ new: true }
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
				{ status: 403 }
			);
		}

		const body = await request.json();
		const updates = Array.isArray(body) ? body : [body];

		const results = await Promise.all(
			updates.map(async ({ submissionId, studentId, status }) => {
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
					status
				);

				return {
					success: updateResult.success,
					data: updateResult.data || updateResult.message,
					submissionId,
					studentId,
				};
			})
		);

		const successfulUpdates = results.filter((result) => result.success);
		const failedUpdates = results.filter((result) => !result.success);

		return NextResponse.json({
			success: true,
			message: `${successfulUpdates.length} updates succeeded, ${failedUpdates.length} failed.`,
			results,
		});
	} catch (error) {
		console.error('Error in grades PATCH:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
