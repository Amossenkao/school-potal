import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { authorizeUser, getTenantFromRequest } from '@/middleware';

// API Handlers
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

		const models = await getTenantModels(tenant);
		const { searchParams } = new URL(request.url);

		const academicYear =
			searchParams.get('academicYear') || getCurrentAcademicYear();
		const period = searchParams.get('period') || undefined;
		const gradeLevel = searchParams.get('classId') || undefined;
		const subject = searchParams.get('subject') || undefined;
		const studentId = searchParams.get('studentId') || undefined;
		const teacherId = searchParams.get('teacherId') || undefined;
		const submissionId = searchParams.get('submissionId') || undefined;
		const stauts = searchParams.get('status') || undefined;

		let result;

		switch (currentUser.role) {
			case 'student':
				result = await getStudentGrade(
					models,
					academicYear,
					currentUser.userId,
					{
						period,
					}
				);
				break;

			case 'teacher':
				result = await getTeacherGrades(
					models,
					academicYear,
					currentUser.userId,
					{
						period,
						gradeLevel,
						subject,
					}
				);

				break;

			case 'system_admin':
				// New logic to handle the periodic report request and the new report card
				const reportType = searchParams.get('reportType');
				if (
					reportType === 'periodic' &&
					academicYear &&
					period &&
					gradeLevel &&
					!subject &&
					!studentId
				) {
					result = await getPeriodicReport(models, academicYear, {
						period,
						gradeLevel,
					});
				} else if (reportType === 'reportcard' && academicYear && gradeLevel) {
					result = await getReportCardData(models, academicYear, {
						gradeLevel,
					});
				} else {
					result = await getGrades(models, academicYear, {
						period,
						gradeLevel,
						subject,
						studentId,
						teacherId,
					});
				}
				break;

			default:
				return NextResponse.json(
					{ success: false, message: 'Unauthorized role' },
					{ status: 403 }
				);
		}

		return NextResponse.json({
			success: true,
			data: result,
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

		const currentUser = await authorizeUser(request);
		if (
			!currentUser ||
			!['teacher', 'administrator', 'system_admin'].includes(currentUser.role)
		) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const models = await getTenantModels(tenant);
		const body = await request.json();

		const { academicYear, period, gradeLevel, subject, teacherId, grades } =
			body;

		// Validate required fields
		if (
			!academicYear ||
			!period ||
			!gradeLevel ||
			!subject ||
			!teacherId ||
			!grades
		) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Validate grades
		const validationResult = validateGrades(grades);
		if (!validationResult.isValid) {
			return NextResponse.json(
				{ success: false, message: validationResult.message },
				{ status: 400 }
			);
		}

		// Add or update grades in the nested structure
		const result = await updateNestedGrades(models, {
			academicYear,
			period,
			gradeLevel,
			subject,
			teacherId,
			grades,
		});

		return NextResponse.json({
			success: true,
			data: result,
		});
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

		const currentUser = await authorizeUser(request);
		if (
			!currentUser ||
			!['teacher', 'administrator', 'system_admin'].includes(currentUser.role)
		) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const models = await getTenantModels(tenant);
		const body = await request.json();

		const { academicYear, period, gradeLevel, subject, teacherId, grades } =
			body;

		if (!academicYear || !period || !gradeLevel || !subject || !grades) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Validate grades
		const validationResult = validateGrades(grades);
		if (!validationResult.isValid) {
			return NextResponse.json(
				{ success: false, message: validationResult.message },
				{ status: 400 }
			);
		}

		// Replace entire grade set for this subject
		const result = await updateNestedGrades(models, {
			academicYear,
			period,
			gradeLevel,
			subject,
			teacherId,
			grades,
			replace: true,
		});

		return NextResponse.json({
			success: true,
			data: result,
		});
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
			!['teacher', 'administrator', 'system_admin'].includes(currentUser.role)
		) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const models = await getTenantModels(tenant);
		const body = await request.json();

		const {
			academicYear,
			period,
			gradeLevel,
			subject,
			studentId,
			grade,
			status = 'Pending',
		} = body;

		if (
			!academicYear ||
			!period ||
			!gradeLevel ||
			!subject ||
			!studentId ||
			grade === undefined
		) {
			return NextResponse.json(
				{ success: false, message: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Validate single grade
		if (!validateSingleGrade(grade)) {
			return NextResponse.json(
				{ success: false, message: 'Invalid grade. Must be between 0 and 100' },
				{ status: 400 }
			);
		}

		// Validate status
		if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
			return NextResponse.json(
				{
					success: false,
					message: 'Invalid status. Must be Approved, Rejected, or Pending',
				},
				{ status: 400 }
			);
		}

		// Update single student grade
		const result = await updateSingleany(models, {
			academicYear,
			period,
			gradeLevel,
			subject,
			studentId,
			grade,
			status,
		});

		return NextResponse.json({
			success: true,
			data: result,
		});
	} catch (error) {
		console.error('Error in grades PATCH:', error);
		return NextResponse.json(
			{ success: false, message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

// Helper Functions

/**
 * Validates the grades array to ensure proper structure
 */
function validateGrades(grades: any[]): {
	isValid: boolean;
	message?: string;
} {
	if (!Array.isArray(grades)) {
		return {
			isValid: false,
			message: 'Grades must be an array of student grade objects',
		};
	}

	for (const grade of grades) {
		if (!grade.studentId || typeof grade.studentId !== 'string') {
			return {
				isValid: false,
				message: 'Each grade must have a valid studentId',
			};
		}

		if (!grade.name || typeof grade.name !== 'string') {
			return {
				isValid: false,
				message: 'Each grade must have a valid student name',
			};
		}

		if (!validateSingleGrade(grade.grade)) {
			return {
				isValid: false,
				message: `Invalid grade for ${grade.name}. Must be between 0 and 100`,
			};
		}

		if (!['Approved', 'Rejected', 'Pending'].includes(grade.status)) {
			return {
				isValid: false,
				message: `Invalid status for ${grade.name}. Must be Approved, Rejected, or Pending`,
			};
		}
	}

	return { isValid: true };
}

function validateSingleGrade(grade: any): boolean {
	return (
		typeof grade === 'number' && grade >= 0 && grade <= 100 && !isNaN(grade)
	);
}

/**
 * Calculates the average for a set of grades
 */
function calculateAverages(grades: any[]): number {
	const gradeValues = grades
		.map((g) => g.grade)
		.filter((g) => typeof g === 'number' && !isNaN(g));

	if (gradeValues.length === 0) return 0;

	const sum = gradeValues.reduce((acc, grade) => acc + grade, 0);
	return Math.round((sum / gradeValues.length) * 100) / 100; // Round to 2 decimal places
}

/**
 * This function will take a set of grades and return ranked students
 */
function calculateRanks(grades: any[]) {
	const validGrades = grades.filter(
		(g) => typeof g.grade === 'number' && !isNaN(g.grade)
	);

	// Sort by grade in descending order
	const sortedGrades = [...validGrades].sort((a, b) => b.grade - a.grade);

	// Assign ranks (handle ties)
	let currentRank = 1;
	const rankedGrades = [];

	for (let i = 0; i < sortedGrades.length; i++) {
		if (i > 0 && sortedGrades[i].grade < sortedGrades[i - 1].grade) {
			currentRank = i + 1;
		}
		rankedGrades.push({
			...sortedGrades[i],
			rank: currentRank,
		});
	}

	return rankedGrades;
}

/**
 * Returns the stats for a set of grades
 * The stats include the number of incompletes, passes, fails
 */
function getStats(grades: any[]) {
	let incompletes = 0;
	let passes = 0;
	let fails = 0;

	grades.forEach((studentGrade) => {
		const grade = studentGrade.grade;
		if (grade === null || grade === undefined || isNaN(grade)) {
			incompletes++;
		} else if (grade >= 70) {
			// Changed from 60 to 70 as per your sample
			passes++;
		} else {
			fails++;
		}
	});

	return {
		incompletes,
		passes,
		fails,
	};
}

function getCurrentAcademicYear(): string {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	// Assume academic year starts in September
	if (currentMonth >= 9) {
		return `${currentYear}/${currentYear + 1}`;
	} else {
		return `${currentYear - 1}/${currentYear}`;
	}
}

/**
 * Updates grades in the nested structure
 */
async function updateNestedGrades(
	models: any,
	params: {
		academicYear: string;
		period: string;
		gradeLevel: string;
		subject: string;
		teacherId: string;
		grades: any[];
		replace?: boolean;
	}
): Promise<any> {
	const {
		academicYear,
		period,
		gradeLevel,
		subject,
		teacherId,
		grades,
		replace = false,
	} = params;

	// Get or create the main grades document
	let gradesDoc = await models.Grade.findOne().lean();
	if (!gradesDoc) {
		gradesDoc = new models.Grade({ data: {} });
	}

	// Initialize nested structure if it doesn't exist
	if (!gradesDoc[academicYear]) {
		gradesDoc[academicYear] = {};
	}
	if (!gradesDoc[academicYear][period]) {
		gradesDoc[academicYear][period] = {};
	}
	if (!gradesDoc[academicYear][period][gradeLevel]) {
		gradesDoc[academicYear][period][gradeLevel] = {};
	}
	if (!gradesDoc[academicYear][period][gradeLevel][subject]) {
		gradesDoc[academicYear][period][gradeLevel][subject] = {
			teacherId,
			stats: { incompletes: 0, passes: 0, fails: 0, average: 0 },
			grades: [],
		};
	}

	// Update teacher ID
	gradesDoc[academicYear][period][gradeLevel][subject].teacherId = teacherId;

	// Update grades
	if (replace) {
		gradesDoc[academicYear][period][gradeLevel][subject].grades = grades;
	} else {
		// Merge grades - update existing students or add new ones
		const existingGrades =
			gradesDoc[academicYear][period][gradeLevel][subject].grades;

		grades.forEach((newGrade) => {
			const existingIndex = existingGrades.findIndex(
				(g: any) => g.studentId === newGrade.studentId
			);
			if (existingIndex !== -1) {
				// Update existing student
				existingGrades[existingIndex] = {
					...existingGrades[existingIndex],
					...newGrade,
				};
			} else {
				// Add new student
				existingGrades.push(newGrade);
			}
		});
	}

	// Recalculate stats
	const updatedGrades =
		gradesDoc[academicYear][period][gradeLevel][subject].grades;
	gradesDoc[academicYear][period][gradeLevel][subject].stats =
		getStats(updatedGrades);

	// Mark the nested field as modified for Mongoose
	gradesDoc.markModified('data');
	await gradesDoc.save();

	return {
		academicYear,
		period,
		gradeLevel,
		subject,
		teacherId,
		grades: calculateRanks(updatedGrades),
		stats: {
			...gradesDoc[academicYear][period][gradeLevel][subject].stats,
			average: calculateAverages(updatedGrades),
		},
	};
}

/**
 * Updates a single student's grade
 */
async function updateSingleany(
	models: any,
	params: {
		academicYear: string;
		period: string;
		gradeLevel: string;
		subject: string;
		studentId: string;
		grade: number;
		status: 'Approved' | 'Rejected' | 'Pending';
	}
): Promise<any> {
	const {
		academicYear,
		period,
		gradeLevel,
		subject,
		studentId,
		grade,
		status,
	} = params;

	let gradesDoc = await models.Grade.findOne().lean();
	if (!gradesDoc) {
		return { success: false, message: 'Grades document not found' };
	}

	// Check if the nested path exists
	if (!gradesDoc[academicYear]?.[period]?.[gradeLevel]?.[subject]) {
		return {
			success: false,
			message: 'Subject not found in the specified period and grade level',
		};
	}

	const subjectData = gradesDoc[academicYear][period][gradeLevel][subject];
	const studentIndex = subjectData.grades.findIndex(
		(g: any) => g.studentId === studentId
	);

	if (studentIndex === -1) {
		return { success: false, message: 'Student not found in this subject' };
	}

	// Update the specific student's grade and status
	subjectData.grades[studentIndex].grade = grade;
	subjectData.grades[studentIndex].status = status;

	// Recalculate stats
	subjectData.stats = getStats(subjectData.grades);

	gradesDoc.markModified('data');
	await gradesDoc.save();

	return {
		academicYear,
		period,
		gradeLevel,
		subject,
		studentId,
		updatedStudent: subjectData.grades[studentIndex],
		stats: {
			...subjectData.stats,
			average: calculateAverages(subjectData.grades),
		},
	};
}

/**
 * Returns grades for a specific student across periods/subjects
 */
async function getStudentGrade(
	models: any,
	academicYear: string,
	studentId: string,
	filters: { period?: string; gradeLevel?: string; subject?: string }
): Promise<any> {
	const gradesDoc = await models.Grade.findOne().lean();
	if (!gradesDoc || !gradesDoc[academicYear]) {
		return {
			grades: [],
			message: 'No grades found for the specified academic year',
		};
	}

	const studentGrades = [];
	const yearData = gradesDoc[academicYear];

	for (const [periodName, periodData] of Object.entries(yearData)) {
		if (filters.period && periodName !== filters.period) continue;

		for (const [gradeLevelName, gradeLevelData] of Object.entries(
			periodData as any
		)) {
			if (filters.gradeLevel && gradeLevelName !== filters.gradeLevel) continue;

			for (const [subjectName, subjectData] of Object.entries(
				gradeLevelData as any
			)) {
				if (filters.subject && subjectName !== filters.subject) continue;

				const subjectInfo = subjectData as any;
				const studentGrade = subjectInfo.grades.find(
					(g: any) => g._id === studentId
				);

				if (studentGrade) {
					studentGrades.push({
						academicYear,
						period: periodName,
						gradeLevel: gradeLevelName,
						subject: subjectName,
						teacherId: subjectInfo.teacherId,
						studentGrade,
						classStats: subjectInfo.stats,
						classAverage: calculateAverages(subjectInfo.grades),
					});
				}
			}
		}
	}

	return { grades: studentGrades };
}

/**
 * Get grades for a teacher's subjects
 */
async function getTeacherGrades(
	models: any,
	academicYear: string,
	teacherId: string,
	filters: { period?: string; gradeLevel?: string; subject?: string }
): Promise<any> {
	const gradesDoc = await models.Grade.findOne().lean();

	if (!gradesDoc || !gradesDoc[academicYear]) {
		return {
			grades: [],
			message: 'No grades found for the specified academic year',
		};
	}

	const teacherGrades = [];
	const yearData = gradesDoc[academicYear];

	for (const [periodName, periodData] of Object.entries(yearData)) {
		if (filters.period && periodName !== filters.period) continue;

		for (const [gradeLevelName, gradeLevelData] of Object.entries(
			periodData as any
		)) {
			if (filters.gradeLevel && gradeLevelName !== filters.gradeLevel) continue;

			for (const [subjectName, subjectData] of Object.entries(
				gradeLevelData as any
			)) {
				if (filters.subject && subjectName !== filters.subject) continue;

				const subjectInfo = subjectData as any;
				if (subjectInfo.teacherId === teacherId) {
					teacherGrades.push({
						academicYear,
						period: periodName,
						gradeLevel: gradeLevelName,
						subject: subjectName,
						teacherId: subjectInfo.teacherId,
						grades: calculateRanks(subjectInfo.grades),

						stats: {
							...subjectInfo.stats,
							average: calculateAverages(subjectInfo.grades),
						},
					});
				}
			}
		}
	}

	return { grades: teacherGrades };
}

/**
 * Get grades for administrators (full access)
 */
async function getGrades(
	models: any,
	academicYear: string,
	filters: {
		period?: string;
		gradeLevel?: string;
		subject?: string;
		studentId?: string;
		teacherId?: string;
	}
): Promise<any> {
	const gradesDoc = await models.Grade.findOne().lean();

	if (!gradesDoc || !gradesDoc[academicYear]) {
		return {
			grades: [],
			message: 'No grades found for the specified academic year',
		};
	}

	const allGrades = [];
	const yearData = gradesDoc[academicYear];

	for (const [periodName, periodData] of Object.entries(yearData)) {
		if (filters.period && periodName !== filters.period) continue;

		for (const [gradeLevelName, gradeLevelData] of Object.entries(
			periodData as any
		)) {
			if (filters.gradeLevel && gradeLevelName !== filters.gradeLevel) continue;

			for (const [subjectName, subjectData] of Object.entries(
				gradeLevelData as any
			)) {
				if (
					filters.subject &&
					subjectName.toLowerCase() !== filters.subject.toLowerCase()
				)
					continue;

				const subjectInfo = subjectData as any;
				if (filters.teacherId && subjectInfo.teacherId !== filters.teacherId)
					continue;

				let gradesToShow = subjectInfo.grades;
				if (filters.studentId) {
					const studentGrade = subjectInfo.grades.find(
						(g) => g.studentId === filters.studentId
					);
					gradesToShow = studentGrade ? [studentGrade] : [];
				}

				allGrades.push({
					academicYear,
					period: periodName,
					gradeLevel: gradeLevelName,
					subject: subjectName,
					teacherId: subjectInfo.teacherId,
					grades: calculateRanks(gradesToShow),
					stats: {
						...subjectInfo.stats,
						average: calculateAverages(subjectInfo.grades),
					},
				});
			}
		}
	}

	return { grades: allGrades };
}

/**
 * NEW HELPER FUNCTION: Calculates periodic average and rank for all students in a class.
 */
async function getPeriodicReport(
	models: any,
	academicYear: string,
	filters: { period: string; gradeLevel: string }
): Promise<any> {
	const gradesDoc = await models.Grade.findOne().lean();
	const { period, gradeLevel } = filters;

	if (
		!gradesDoc ||
		!gradesDoc[academicYear] ||
		!gradesDoc[academicYear][period] ||
		!gradesDoc[academicYear][period][gradeLevel]
	) {
		return {
			grades: [],
			message:
				'No grades found for the specified academic year, period, and grade level',
		};
	}

	const subjectGrades = gradesDoc[academicYear][period][gradeLevel];
	const studentPeriodicData: any = {};

	// Aggregate grades by student across all subjects for the period
	for (const [subjectName, subjectData] of Object.entries(subjectGrades)) {
		const subjectInfo = subjectData as any;
		subjectInfo.grades.forEach((studentGrade: any) => {
			const { studentId, name, grade } = studentGrade;

			if (!studentPeriodicData[studentId]) {
				studentPeriodicData[studentId] = {
					studentId,
					name,
					subjects: [],
					totalMarks: 0,
				};
			}
			studentPeriodicData[studentId].subjects.push({
				subject: subjectName,
				grade,
				rank: studentGrade.rank,
				classAverage: calculateAverages(subjectInfo.grades),
			});
			studentPeriodicData[studentId].totalMarks += grade;
		});
	}

	const studentsArray = Object.values(studentPeriodicData);

	// Calculate periodic average for each student
	const studentsWithAverages = studentsArray.map((student: any) => {
		const periodicAverage =
			student.subjects.length > 0
				? student.totalMarks / student.subjects.length
				: 0;
		return {
			...student,
			periodicAverage: parseFloat(periodicAverage.toFixed(2)),
		};
	});

	// Sort students by periodic average in descending order to determine rank
	studentsWithAverages.sort(
		(a: any, b: any) => b.periodicAverage - a.periodicAverage
	);

	// Assign ranks, handling ties
	let currentRank = 1;
	for (let i = 0; i < studentsWithAverages.length; i++) {
		if (
			i > 0 &&
			studentsWithAverages[i].periodicAverage <
				studentsWithAverages[i - 1].periodicAverage
		) {
			currentRank = i + 1;
		}
		studentsWithAverages[i].rank = currentRank;
	}

	// Sort students alphabetically by name
	studentsWithAverages.sort((a: any, b: any) => a.name.localeCompare(b.name));

	return { grades: studentsWithAverages };
}

async function getReportCardData(
	models: any,
	academicYear: string,
	filters: { gradeLevel: string }
): Promise<any> {
	const { gradeLevel: className } = filters;
	const gradesDoc = await models.Grade.findOne().lean();

	if (!gradesDoc || !gradesDoc[academicYear]) {
		return {
			grades: [],
			message: 'No grades found for the specified academic year.',
		};
	}

	const gradeLevelForApi = className.match(/\d+/)?.[0];
	if (!gradeLevelForApi) {
		return { grades: [], message: 'Invalid class name format.' };
	}

	const allStudentsInClass = await models.Student.find({
		classId: gradeLevelForApi,
	}).lean();

	if (allStudentsInClass.length === 0) {
		return { grades: [], message: 'No students found in this class.' };
	}

	const studentReportData = {};
	allStudentsInClass.forEach((student) => {
		studentReportData[student.studentId] = {
			studentId: student.studentId,
			name: `${student.firstName} ${student.lastName}`,
			subjects: {},
		};
	});

	const yearData = gradesDoc[academicYear];
	for (const [periodName, periodData] of Object.entries(yearData)) {
		if (!periodData[gradeLevelForApi]) continue;

		for (const [subjectName, subjectData] of Object.entries(
			periodData[gradeLevelForApi] as any
		)) {
			const subjectInfo = subjectData as any;
			subjectInfo.grades.forEach((studentGrade: any) => {
				const { studentId, grade } = studentGrade;
				if (studentReportData[studentId]) {
					if (!studentReportData[studentId].subjects[subjectName]) {
						studentReportData[studentId].subjects[subjectName] = {
							firstSemester: {
								ca1: null,
								ca2: null,
								ca3: null,
								exam: null,
								average: null,
							},
							secondSemester: {
								ca1: null,
								ca2: null,
								ca3: null,
								exam: null,
								average: null,
							},
							yearlyAverage: null,
						};
					}

					const periodMap = {
						firstPeriod: 'ca1',
						secondPeriod: 'ca2',
						thirdPeriod: 'ca3',
						thirdPeriodExam: 'exam',
						fourthPeriod: 'ca1',
						fifthPeriod: 'ca2',
						sixthPeriod: 'ca3',
						sixthPeriodExam: 'exam',
					};
					const semester = [
						'firstPeriod',
						'secondPeriod',
						'thirdPeriod',
						'thirdPeriodExam',
					].includes(periodName)
						? 'firstSemester'
						: 'secondSemester';
					const periodKey = periodMap[periodName];

					if (periodKey) {
						studentReportData[studentId].subjects[subjectName][semester][
							periodKey
						] = grade;
					}
				}
			});
		}
	}

	const studentsWithCalculatedAverages = Object.values(studentReportData).map(
		(student: any) => {
			for (const subjectName in student.subjects) {
				const subject = student.subjects[subjectName];
				const firstSemGrades = [
					subject.firstSemester.ca1,
					subject.firstSemester.ca2,
					subject.firstSemester.ca3,
					subject.firstSemester.exam,
				].filter((g) => g != null);
				subject.firstSemester.average =
					firstSemGrades.length > 0
						? parseFloat(
								(
									firstSemGrades.reduce((a, b) => a + b, 0) /
									firstSemGrades.length
								).toFixed(2)
						  )
						: null;

				const secondSemGrades = [
					subject.secondSemester.ca1,
					subject.secondSemester.ca2,
					subject.secondSemester.ca3,
					subject.secondSemester.exam,
				].filter((g) => g != null);
				subject.secondSemester.average =
					secondSemGrades.length > 0
						? parseFloat(
								(
									secondSemGrades.reduce((a, b) => a + b, 0) /
									secondSemGrades.length
								).toFixed(2)
						  )
						: null;

				const allGrades = [...firstSemGrades, ...secondSemGrades];
				subject.yearlyAverage =
					allGrades.length > 0
						? parseFloat(
								(
									allGrades.reduce((a, b) => a + b, 0) / allGrades.length
								).toFixed(2)
						  )
						: null;
			}
			return student;
		}
	);

	const periodsToRank = [
		'firstSemester.ca1',
		'firstSemester.ca2',
		'firstSemester.ca3',
		'firstSemester.exam',
		'firstSemester.average',
		'secondSemester.ca1',
		'secondSemester.ca2',
		'secondSemester.ca3',
		'secondSemester.exam',
		'secondSemester.average',
		'yearlyAverage',
	];

	for (const periodPath of periodsToRank) {
		const [semester, period] = periodPath.split('.');
		const scores = studentsWithCalculatedAverages
			.map((student) => {
				const allSubjects = Object.keys(student.subjects);
				let score = -1;
				if (allSubjects.length > 0) {
					let grades;
					if (period) {
						grades = allSubjects
							.map((s) => student.subjects[s][semester]?.[period])
							.filter((g) => g != null)
							.map((g) => parseFloat(g));
					} else {
						grades = allSubjects
							.map((s) => student.subjects[s].yearlyAverage)
							.filter((g) => g != null)
							.map((g) => parseFloat(g));
					}
					if (grades.length > 0) {
						score = grades.reduce((sum, g) => sum + g, 0) / grades.length;
					}
				}
				return { studentId: student.studentId, score };
			})
			.sort((a, b) => b.score - a.score);

		let rank = 1;
		for (let i = 0; i < scores.length; i++) {
			if (i > 0 && scores[i].score < scores[i - 1].score) {
				rank = i + 1;
			}
			const studentIndex = studentsWithCalculatedAverages.findIndex(
				(s) => s.studentId === scores[i].studentId
			);
			if (studentIndex !== -1) {
				if (!studentsWithCalculatedAverages[studentIndex].ranks) {
					studentsWithCalculatedAverages[studentIndex].ranks = {
						firstSemester: {},
						secondSemester: {},
					};
				}
				if (period) {
					studentsWithCalculatedAverages[studentIndex].ranks[semester][period] =
						scores[i].score === -1 ? null : rank;
				} else {
					studentsWithCalculatedAverages[studentIndex].ranks.yearlyRank =
						scores[i].score === -1 ? null : rank;
				}
			}
		}
	}

	studentsWithCalculatedAverages.sort((a: any, b: any) =>
		a.name.localeCompare(b.name)
	);
	return { grades: studentsWithCalculatedAverages };
}
