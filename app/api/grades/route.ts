import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser, getTenantFromRequest } from '@/middleware';
import { now } from 'mongoose';

// -----------------------------------------------------------------------------
// Types and Interfaces
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
		periods: Record<string, number>;
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

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getCurrentAcademicYear() {
	const date = now().getDate();
	const month = now().getMonth();
	const year = now().getFullYear();

	if (month >= 8 && month <= 12) {
		return `${year}/${year + 1}`;
	}

	return `${year - 1}/${year}`;
}

function getSubmissionId(classId: string, period: string, subject: string) {
	return `${getCurrentAcademicYear()}-${classId}-${period}-${subject}`
		.replaceAll(/[\/\s+]/gi, '')
		.toLowerCase();
}

/**
 * Validates the grades array to ensure proper structure.
 */
function validateGrades(grades: any[]): { isValid: boolean; message?: string } {
	if (!Array.isArray(grades)) {
		return { isValid: false, message: 'Grades must be an array.' };
	}

	console.log(grades);

	for (const grade of grades) {
		if (
			!grade.studentId ||
			!grade.name ||
			!grade.period ||
			(grade.grade && typeof grade.grade !== 'number') ||
			grade.grade < 60 ||
			grade.grade > 100
		) {
			return {
				isValid: false,
				message: `Invalid grade entry for ${grade.name || 'a student'}.`,
			};
		}
	}
	return { isValid: true };
}

/**
 * Calculates statistics for a set of grades.
 */
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

/**
 * Calculates ranks for students based on their averages, handling ties properly.
 * Students with the same rounded average get the same rank.
 */
function calculateRanks(
	students: Array<{ studentId: string; average: number }>
) {
	if (students.length === 0) return [];

	// Round averages to 1 decimal place for ranking
	const studentsWithRoundedAvg = students.map((student) => ({
		...student,
		roundedAverage: parseFloat(student.average.toFixed(1)),
	}));

	// Sort by rounded average (descending)
	const sortedStudents = [...studentsWithRoundedAvg].sort(
		(a, b) => b.roundedAverage - a.roundedAverage
	);

	// Assign ranks, handling ties
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

/**
 * Parses comma-separated student IDs from query parameter
 */
function parseStudentIds(studentIdsParam: string | null): string[] | null {
	if (!studentIdsParam) return null;
	return studentIdsParam
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
}

/**
 * 1. Processes periodic report for entire class
 */
function processClassPeriodicReport(
	grades: GradeRecord[],
	classId: string,
	period: string,
	studentIds?: string[]
): StudentPeriodicReport[] {
	const studentsMap = new Map<string, StudentPeriodicReport>();

	// Filter for the specific class and period, and group by student
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
			studentsMap.get(g.studentId)!.subjects.push({
				subject: g.subject,
				grade: g.grade,
			});
		});

	// Calculate averages and stats for each student
	const studentsWithAverages = Array.from(studentsMap.values()).map(
		(student) => {
			const stats = getStats(student.subjects);
			return {
				...student,
				periodicAverage: stats.average,
				incompletes: stats.incompletes,
				passes: stats.passes,
				fails: stats.fails,
			};
		}
	);

	// Calculate ranks based on rounded averages for ALL students in the class
	const rankedData = calculateRanks(
		studentsWithAverages.map((s) => ({
			studentId: s.studentId,
			average: s.periodicAverage,
		}))
	);

	// Apply ranks to students
	studentsWithAverages.forEach((student) => {
		const rankData = rankedData.find((r) => r.studentId === student.studentId);
		student.rank = (rankData as any)?.rank || 0;
	});

	let result = studentsWithAverages.sort((a, b) => a.rank - b.rank);

	// Filter by specific student IDs if provided, AFTER ranking is done
	if (studentIds && studentIds.length > 0) {
		result = result.filter((student) => studentIds.includes(student.studentId));
	}

	return result;
}

/**
 * 3. Processes masters report for a subject across all periods
 */
function processMastersReport(
	grades: GradeRecord[],
	classId: string,
	subject?: string,
	teacherId?: string,
	studentIds?: string[]
): MastersReport {
	let filteredGrades = grades.filter((g) => g.classId === classId);

	if (subject) {
		filteredGrades = filteredGrades.filter((g) => g.subject === subject);
	}
	if (teacherId) {
		filteredGrades = filteredGrades.filter((g) => g.teacherId === teacherId);
	}
	if (studentIds && studentIds.length > 0) {
		filteredGrades = filteredGrades.filter((g) =>
			studentIds.includes(g.studentId)
		);
	}

	const studentsMap = new Map<string, any>();
	const periodsSet = new Set<string>();

	// Group grades by student and collect all periods
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
		student.periods[g.period] = g.grade;
		student.grades.push({ grade: g.grade });
	});

	// Calculate overall averages for each student
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

	// Calculate period statistics
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
		students: studentsWithAverages,
		periodStats,
	};
}

/**
 * 4. Processes yearly report for entire class with corrected semester average calculation
 */
function processClassYearlyReport(
	grades: GradeRecord[],
	classId: string,
	studentIds?: string[]
): StudentYearlyReport[] {
	const studentsMap = new Map<string, StudentYearlyReport>();
	const subjectsSet = new Set<string>();

	// Group all grades by student and subject
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

	// Calculate periodic, subject-level semester, and overall semester/yearly averages for each student
	studentsMap.forEach((student) => {
		const allSubjects = Array.from(subjectsSet);

		// Calculate subject-level averages for each period
		allSubjects.forEach((subject) => {
			// Find grades for the current subject across periods
			const getGradeForPeriod = (period: string) =>
				student.periods[period]?.find((g) => g.subject === subject)?.grade;

			const firstPeriodGrade = getGradeForPeriod('firstPeriod');
			const secondPeriodGrade = getGradeForPeriod('secondPeriod');
			const thirdPeriodGrade = getGradeForPeriod('thirdPeriod');
			const firstSemesterExamGrade = getGradeForPeriod('thirdPeriodExam');

			const fourthPeriodGrade = getGradeForPeriod('fourthPeriod');
			const fifthPeriodGrade = getGradeForPeriod('fifthPeriod');
			const sixthPeriodGrade = getGradeForPeriod('sixthPeriod');
			const secondSemesterExamGrade = getGradeForPeriod('sixthPeriodExam');

			// Calculate First Semester Average for the subject
			const firstSemGrades = [
				firstPeriodGrade,
				secondPeriodGrade,
				thirdPeriodGrade,
			].filter((grade): grade is number => grade !== undefined);
			if (firstSemGrades.length > 0) {
				const periodsAverage =
					firstSemGrades.reduce((a, b) => a + b, 0) / firstSemGrades.length;
				if (firstSemesterExamGrade !== undefined) {
					student.firstSemesterAverage[subject] = Math.round(
						(periodsAverage + firstSemesterExamGrade) / 2
					);
				} else {
					student.firstSemesterAverage[subject] = Math.round(periodsAverage);
				}
			}

			// Calculate Second Semester Average for the subject
			const secondSemesterPeriods = [
				'fourthPeriod',
				'fifthPeriod',
				'sixthPeriod',
			];
			const secondSemGrades = secondSemesterPeriods
				.map((p) => getGradeForPeriod(p))
				.filter((grade): grade is number => grade !== undefined);

			if (secondSemGrades.length > 0) {
				const periodsAverage =
					secondSemGrades.reduce((a, b) => a + b, 0) / secondSemGrades.length;
				if (secondSemesterExamGrade !== undefined) {
					student.secondSemesterAverage[subject] = Math.round(
						(periodsAverage + secondSemesterExamGrade) / 2
					);
				} else {
					student.secondSemesterAverage[subject] = Math.round(periodsAverage);
				}
			}
		});

		// Calculate Overall Periodic Averages
		for (const period in student.periods) {
			const periodGrades = student.periods[period];
			const periodStats = getStats(periodGrades);
			student.periodAverages[period] = periodStats.average;
		}

		// Calculate Overall Semester Averages and Yearly Average from subject averages
		const firstSemAverages = Object.values(student.firstSemesterAverage).filter(
			(avg) => !isNaN(avg)
		);
		if (firstSemAverages.length > 0) {
			student.periodAverages.firstSemesterAverage = parseFloat(
				(
					firstSemAverages.reduce((a, b) => a + b, 0) / firstSemAverages.length
				).toFixed(1)
			);
		}

		const secondSemAverages = Object.values(
			student.secondSemesterAverage
		).filter((avg) => !isNaN(avg));
		if (secondSemAverages.length > 0) {
			student.periodAverages.secondSemesterAverage = parseFloat(
				(
					secondSemAverages.reduce((a, b) => a + b, 0) /
					secondSemAverages.length
				).toFixed(1)
			);
		}

		const sem1Avg = student.periodAverages.firstSemesterAverage;
		const sem2Avg = student.periodAverages.secondSemesterAverage;

		if (sem1Avg !== undefined && sem2Avg !== undefined) {
			student.yearlyAverage = parseFloat(((sem1Avg + sem2Avg) / 2).toFixed(1));
		} else if (sem1Avg !== undefined) {
			student.yearlyAverage = sem1Avg;
		} else if (sem2Avg !== undefined) {
			student.yearlyAverage = sem2Avg;
		} else {
			student.yearlyAverage = 0;
		}
	});

	const studentsArray = Array.from(studentsMap.values());

	// Define all keys for which ranks should be calculated
	const allPeriodsAndAverages = [
		...new Set(
			grades.filter((g) => g.classId === classId).map((g) => g.period)
		),
		'firstSemesterAverage',
		'secondSemesterAverage',
	];

	// Calculate ranks for each period and semester average on the full class
	allPeriodsAndAverages.forEach((period) => {
		const periodRanks = calculateRanks(
			studentsArray.map((s) => ({
				studentId: s.studentId,
				average: s.periodAverages[period] || 0,
			}))
		);

		periodRanks.forEach((r) => {
			const student = studentsMap.get(r.studentId);
			if (student) {
				student.ranks[period] = (r as any).rank;
			}
		});
	});

	// Calculate yearly ranks separately on the full class
	const yearlyRanks = calculateRanks(
		studentsArray.map((s) => ({
			studentId: s.studentId,
			average: s.yearlyAverage,
		}))
	);

	yearlyRanks.forEach((r) => {
		const student = studentsMap.get(r.studentId);
		if (student) {
			student.ranks.yearly = (r as any).rank;
		}
	});

	let finalResult = studentsArray.sort(
		(a, b) => (a.ranks.yearly || Infinity) - (b.ranks.yearly || Infinity)
	);

	// Filter by specific student IDs if provided, after all calculations and rankings are complete
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
		const tenant = getTenantFromRequest(request);
		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthenticated' },
				{ status: 401 }
			);
		}

		const { Grade } = await getTenantModels(tenant);
		const { searchParams } = new URL(request.url);

		const academicYear = searchParams.get('academicYear') || '2024/2025';
		let classId = searchParams.get('classId');
		const period = searchParams.get('period');
		let studentIdsParam = searchParams.get('studentIds');
		const subject = searchParams.get('subject');
		let teacherId = searchParams.get('teacherId');

		let studentIds = parseStudentIds(studentIdsParam);

		if (currentUser.role === 'student') {
			studentIds = [currentUser.studentId];
			teacherId = null;
		} else if (currentUser.role === 'teacher') {
			teacherId = currentUser.teacherId;
		}

		if (!classId && studentIds && studentIds.length > 0) {
			const studentGradeEntry = await Grade.findOne({
				studentId: { $in: studentIds },
				academicYear,
			}).lean();
			if (studentGradeEntry) {
				classId = studentGradeEntry.classId;
			} else {
				return NextResponse.json(
					{
						success: false,
						message:
							'No grades found for these students to determine their class.',
					},
					{ status: 404 }
				);
			}
		}

		let reportData: any;
		let gradesForRanking: GradeRecord[];
		const queryFilter: any = { academicYear };

		if (classId) {
			queryFilter.classId = classId;
		}
		if (teacherId) {
			queryFilter.teacherId = teacherId;
		}

		// This filter is for fetching all grades of the entire class to correctly calculate ranks
		const rankingFilter: any = { ...queryFilter };
		if (period) {
			rankingFilter.period = period;
		}

		gradesForRanking = (await Grade.find(rankingFilter).lean()) as any[];

		if (period) {
			if (!classId) {
				return NextResponse.json(
					{
						success: false,
						message: 'classId is required for periodic reports',
					},
					{ status: 400 }
				);
			}

			const fullClassReport = processClassPeriodicReport(
				gradesForRanking,
				classId,
				period,
				studentIds || undefined
			);

			reportData = fullClassReport;

			if (
				studentIds &&
				studentIds.length === 1 &&
				fullClassReport.length === 1
			) {
				reportData = fullClassReport[0];
			} else if (
				studentIds &&
				studentIds.length > 0 &&
				fullClassReport.length === 0
			) {
				return NextResponse.json(
					{
						success: false,
						message: 'Student reports not found for this period',
					},
					{ status: 404 }
				);
			}
		} else if (classId) {
			if (subject) {
				reportData = processMastersReport(
					gradesForRanking,
					classId,
					subject,
					teacherId || undefined,
					studentIds || undefined
				);
			} else {
				reportData = processClassYearlyReport(
					gradesForRanking,
					classId,
					studentIds || undefined
				);

				if (studentIds && studentIds.length === 1 && reportData.length === 1) {
					reportData = reportData[0];
				} else if (
					studentIds &&
					studentIds.length > 0 &&
					reportData.length === 0
				) {
					return NextResponse.json(
						{ success: false, message: 'Student yearly reports not found' },
						{ status: 404 }
					);
				}
			}
		} else {
			const grades = (await Grade.find(queryFilter).lean()) as any[];
			const stats = getStats(grades.map((g: any) => ({ grade: g.grade })));

			return NextResponse.json({
				success: true,
				data: { grades, stats },
			});
		}

		return NextResponse.json({
			success: true,
			data: {
				report: reportData,
				academicYear,
				classId,
				period,
				studentIds: studentIds,
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

export async function POST(request: NextRequest) {
	try {
		const tenant = getTenantFromRequest(request);
		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const teacher = await authorizeUser(request, ['teacher']);
		if (!teacher) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}
		const { Grade } = await getTenantModels(tenant);

		const body = await request.json();
		const { classId, subject, grades } = body;
		console.log('Received body:', body);

		// Validation
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

		const validation = validateGrades(grades);
		if (!validation.isValid) {
			return NextResponse.json(
				{ success: false, message: validation.message },
				{ status: 400 }
			);
		}

		// Check for existing approved grades for each student/period combination
		const studentPeriodPairs = grades.map((g: any) => ({
			studentId: g.studentId,
			period: g.period,
		}));

		const existingApprovedGrades = await Grade.find({
			$or: studentPeriodPairs.map((pair) => ({
				studentId: pair.studentId,
				period: pair.period,
				subject,
				academicYear: getCurrentAcademicYear(),
				status: 'Approved',
			})),
		});

		if (existingApprovedGrades.length > 0) {
			const conflicts = existingApprovedGrades
				.map((g: any) => `${g.studentName} (${g.period})`)
				.join(', ');
			return NextResponse.json(
				{
					success: false,
					message: `Cannot submit grades. The following students already have approved grades for their respective periods and subject: ${conflicts}`,
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
		const tenant = getTenantFromRequest(request);
		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const currentUser = await authorizeUser(request, ['teacher']);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const { Grade } = await getTenantModels(tenant);
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

export async function PATCH(request: NextRequest) {
	try {
		const tenant = getTenantFromRequest(request);
		if (!tenant) {
			return NextResponse.json(
				{ success: false, message: 'Tenant not found' },
				{ status: 400 }
			);
		}

		const currentUser = await authorizeUser(request);
		if (
			!currentUser ||
			!['administrator', 'system_admin'].includes(currentUser.role)
		) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 403 }
			);
		}

		const { Grade } = await getTenantModels(tenant);
		const body = await request.json();
		const { submissionId, studentId, status } = body;

		if (!submissionId || !studentId || !status) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields' },
				{ status: 400 }
			);
		}

		if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
			return NextResponse.json(
				{
					success: false,
					message: 'Invalid status. Must be Approved, Rejected, or Pending.',
				},
				{ status: 400 }
			);
		}

		const result = await Grade.findOneAndUpdate(
			{ submissionId, studentId },
			{ $set: { status, lastUpdated: new Date() } },
			{ new: true }
		);

		if (!result) {
			return NextResponse.json(
				{ success: false, message: 'Grade record not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		console.error('Error in grades PATCH:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
