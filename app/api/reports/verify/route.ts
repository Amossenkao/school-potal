import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { processClassYearlyReport, GradeRecordLike } from '@/utils/gradeRanks';

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Walk the school profile's classLevels tree to find the record
 * whose classId matches the supplied id.
 * Returns { session, level, name } or null.
 */
function resolveClassMeta(
	classLevels: Record<string, any>,
	classId: string,
): { session: string; level: string; name: string } | null {
	if (!classLevels || !classId) return null;
	for (const [session, levels] of Object.entries(classLevels)) {
		if (!levels || typeof levels !== 'object') continue;
		for (const [level, levelData] of Object.entries(
			levels as Record<string, any>,
		)) {
			if (!Array.isArray(levelData?.classes)) continue;
			const found = levelData.classes.find((c: any) => c.classId === classId);
			if (found) {
				return { session, level, name: String(found.name || classId) };
			}
		}
	}
	return null;
}

/**
 * Extract the subject list for a given session + level from the school profile.
 * Falls back to an empty array if the path doesn't exist.
 */
function resolveSchoolSubjects(
	classLevels: Record<string, any>,
	session: string,
	level: string,
): string[] {
	const subjects: Array<any> = classLevels?.[session]?.[level]?.subjects ?? [];
	return subjects
		.map((s: any) => (typeof s === 'string' ? s : String(s?.name ?? '')))
		.filter(Boolean);
}

// ── route ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const studentId = searchParams.get('id');
		const academicYear = searchParams.get('academicYear');

		if (!studentId || !academicYear) {
			return NextResponse.json(
				{ success: false, message: 'Missing student ID or Academic Year' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const { Student, Grade } = models;

		// 1. Locate the student
		const student = await Student.findOne({
			$or: [{ _id: studentId }, { studentId }],
		}).lean();

		if (!student) {
			return NextResponse.json(
				{ success: false, message: 'Student record not found in the system.' },
				{ status: 404 },
			);
		}

		// 2. Resolve the classId for the requested academic year
		let classId: string = student.classId ?? '';
		if (Array.isArray(student.academicYears)) {
			const yearData = student.academicYears.find(
				(y: any) => y.year === academicYear,
			);
			if (yearData?.classId) classId = yearData.classId;
		}

		if (!classId) {
			return NextResponse.json(
				{
					success: false,
					message: `No class record found for ${student.fullName} in academic year ${academicYear}.`,
				},
				{ status: 404 },
			);
		}

		// 3. Load the school profile early — we need it for class metadata
		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile: Record<string, any> =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: (schoolProfileRaw ?? {});

		// 4. Resolve class display name, session, and level from the school profile
		const classLevels: Record<string, any> = schoolProfile?.classLevels ?? {};
		const classMeta = resolveClassMeta(classLevels, classId);

		// 5. Resolve the authoritative subject list from the school profile
		const schoolSubjects = classMeta
			? resolveSchoolSubjects(classLevels, classMeta.session, classMeta.level)
			: [];

		// 6. Fetch ALL approved grades for the entire class (needed for accurate ranks)
		const classGrades = await Grade.find({
			classId,
			academicYear,
			status: 'Approved',
		}).lean();

		if (!classGrades || classGrades.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message: 'No finalized grades found for this record.',
				},
				{ status: 404 },
			);
		}

		// 7. Count distinct students in the class for this year (for "X out of N")
		const distinctStudentIds = new Set(
			classGrades.map((g: any) => String(g.studentId ?? '')).filter(Boolean),
		);
		const classStudentCount = distinctStudentIds.size;

		// 8. Process the full class to generate averages and ranks
		const yearlyReports = processClassYearlyReport(
			classGrades as GradeRecordLike[],
			classId,
		);

		// 9. Extract the requested student's report
		const studentReport = yearlyReports.find(
			(r) => r.studentId === student.studentId,
		);

		if (!studentReport) {
			return NextResponse.json(
				{
					success: false,
					message: 'Report card data could not be generated for this student.',
				},
				{ status: 404 },
      );
      

    }
    
    studentReport.classStudentCount = classStudentCount;

		// 10. Determine classSubjects:
		//     Prefer the school profile list; fall back to what appears in the grades.
		const gradeSubjects = Array.from(
			new Set(
				classGrades
					.filter((g: any) => g.studentId === student.studentId)
					.map((g: any) => String(g.subject ?? ''))
					.filter(Boolean),
			),
		);
		const classSubjects =
			schoolSubjects.length > 0 ? schoolSubjects : gradeSubjects;

		// 11. Build the display class name: use the resolved name if available,
		//     otherwise fall back to the raw classId.
		const classDisplayName = classMeta?.name ?? classId;

		return NextResponse.json({
			success: true,

			studentData: studentReport,

			// Human-readable class name (e.g. "Grade 11-A")
			className: classDisplayName,

			classSubjects,

			// Total ranked students — used by the verify page for "# out of N"
			classStudentCount,

			reportFilters: {
				academicYear,
				session: classMeta?.session ?? '',
				classLevel: classMeta?.level ?? '',
				className: classId,
				selectedStudents: [],
				sponsorName: '',
			},

			school: schoolProfile,
		});
	} catch (error: any) {
		console.error('Verification Error:', error);
		return NextResponse.json(
			{
				success: false,
				message: 'An internal error occurred during verification.',
			},
			{ status: 500 },
		);
	}
}
