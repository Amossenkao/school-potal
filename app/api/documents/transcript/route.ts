import { NextRequest, NextResponse } from 'next/server';
import { getTenantModels } from '@/models';
import { getSchoolProfile } from '@/lib/mongoose';
import { getClassMetaById } from '@/app/api/chat/utils';
import { processClassYearlyReport, type GradeRecordLike } from '@/utils/gradeRanks';

/**
 * Live transcript computation — the engine behind both the Transcript PDF and
 * `/verify?...&type=transcript`. Nothing is persisted: a scan always
 * recomputes from `Grade` records, so it can't be forged and never drifts
 * from what the school's actual grade history says.
 *
 * "Which years belong on the transcript" is resolved from real data rather
 * than a hardcoded Grade-10/11/12 assumption: it's every academic year the
 * student has a class inside the level literally named "Senior High" (schools
 * can and do have more than one session, e.g. Morning/Evening, so every
 * session's Senior High level is included). Schools that never named a level
 * "Senior High" fall back to whichever level the student's current class
 * belongs to — still real, just less presumptive about naming.
 */

function collectLevelClassIds(
	classLevels: Record<string, any>,
	predicate: (levelName: string) => boolean,
): Set<string> {
	const ids = new Set<string>();
	for (const session of Object.values(classLevels || {})) {
		if (!session || typeof session !== 'object') continue;
		for (const [levelName, levelData] of Object.entries(session as Record<string, any>)) {
			if (!predicate(levelName)) continue;
			for (const klass of (levelData as any)?.classes || []) {
				if (klass?.classId) ids.add(klass.classId);
			}
		}
	}
	return ids;
}

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const studentId = (searchParams.get('id') || '').trim();
		const requestedYear = (searchParams.get('academicYear') || '').trim();

		if (!studentId) {
			return NextResponse.json(
				{ success: false, message: 'Missing student ID.' },
				{ status: 400 },
			);
		}

		const models = await getTenantModels();
		const student = await models.Student.findOne({
			$or: [{ _id: studentId }, { studentId }],
		}).lean();

		if (!student) {
			return NextResponse.json({
				success: true,
				data: { valid: false, message: 'No matching student record was found.' },
			});
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile: any =
			typeof schoolProfileRaw === 'string' ? JSON.parse(schoolProfileRaw) : (schoolProfileRaw ?? {});
		const classLevels: Record<string, any> = schoolProfile?.academicConfig?.classLevels || {};

		let scopeIds = collectLevelClassIds(
			classLevels,
			(levelName) => levelName.trim().toLowerCase() === 'senior high',
		);
		if (scopeIds.size === 0) {
			const currentMeta = getClassMetaById(classLevels, student.classId);
			if (currentMeta) {
				scopeIds = collectLevelClassIds(
					classLevels,
					(levelName) => levelName === currentMeta.level,
				);
			}
		}

		const academicYears: { year: string; classId: string }[] = Array.isArray(student.academicYears)
			? student.academicYears
			: [];
		const relevantYears = academicYears
			.filter((entry) => entry?.classId && scopeIds.has(entry.classId))
			.sort((a, b) => a.year.localeCompare(b.year));

		if (relevantYears.length === 0) {
			return NextResponse.json({
				success: true,
				data: {
					valid: false,
					message: 'No academic-year records were found for this student at this level.',
				},
			});
		}

		const years: {
			year: string;
			className: string;
			subjects: { name: string; grade: number }[];
			yearlyAverage: number;
			rank: number;
			classStudentCount: number;
		}[] = [];

		for (const entry of relevantYears) {
			const grades = await models.Grade.find({
				classId: entry.classId,
				academicYear: entry.year,
				status: 'Approved',
			}).lean();
			if (!grades || grades.length === 0) continue;

			const classStudentCount = new Set(
				grades.map((g: any) => String(g.studentId || '')).filter(Boolean),
			).size;
			const reports = processClassYearlyReport(grades as GradeRecordLike[], entry.classId);
			const own = reports.find((r) => r.studentId === student.studentId);
			if (!own) continue;

			const classMeta = getClassMetaById(classLevels, entry.classId);
			years.push({
				year: entry.year,
				className: classMeta?.className || entry.classId,
				subjects: Object.entries(own.yearlySubjectAverages || {}).map(([name, grade]) => ({
					name,
					grade: Number(grade),
				})),
				yearlyAverage: own.yearlyAverage,
				rank: own.ranks?.yearly ?? 0,
				classStudentCount,
			});
		}

		if (years.length === 0) {
			return NextResponse.json({
				success: true,
				data: { valid: false, message: 'No finalized grades were found for this student.' },
			});
		}

		const overallAverage =
			years.reduce((sum, y) => sum + y.yearlyAverage, 0) / years.length;

		const studentName =
			[student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ').trim() ||
			String(student.studentId || '');

		return NextResponse.json({
			success: true,
			data: {
				valid: true,
				studentId: student.studentId,
				studentName,
				academicYear: requestedYear || years[years.length - 1].year,
				years,
				overallAverage,
				schoolName: schoolProfile?.identity?.name || '',
			},
		});
	} catch (error) {
		console.error('Transcript verification error:', error);
		return NextResponse.json(
			{ success: false, message: 'Verification failed.' },
			{ status: 500 },
		);
	}
}
