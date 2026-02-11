import type { TextPlacementMap } from '@/utils/pdfText';

type BuildPlacementsArgs = {
	pageWidth: number;
	pageHeight: number;
	subjectCount: number;
};

const BASE_PAGE = {
	width: 841.89,
	height: 595.28,
};

const HEADER_RECTS = {
	student_name: {
		x: 66.8988113,
		y: 540.8097534,
		width: 231.8035813,
		height: 20,
	},
	class_name: { x: 67.8988113, y: 521.1, width: 150.9999924, height: 20 },
	student_id: { x: 67.8988113, y: 502.5, width: 150.9999924, height: 20 },
	academic_year: { x: 632.8154907, y: 500.7859497, width: 151, height: 20 },
};

const scaleRect = (
	rect: { x: number; y: number; width: number; height: number },
	scaleX: number,
	scaleY: number,
) => ({
	x: rect.x * scaleX,
	y: rect.y * scaleY,
	width: rect.width * scaleX,
	height: rect.height * scaleY,
});

const rectToPlacement = (
	rect: { x: number; y: number; width: number; height: number },
	paddingX: number,
	opts: {
		size?: number;
		align?: 'left' | 'center' | 'right';
		font?: 'normal' | 'bold';
	},
) => ({
	x: rect.x + paddingX,
	y: rect.y + rect.height,
	boxHeight: rect.height,
	valign: 'middle' as const,
	maxWidth: rect.width - paddingX * 2,
	size: opts.size,
	align: opts.align,
	font: opts.font,
});

export const buildReportPlacements = ({
	pageWidth,
	pageHeight,
	subjectCount,
}: BuildPlacementsArgs): TextPlacementMap => {
	const scaleX = pageWidth / BASE_PAGE.width;
	const scaleY = pageHeight / BASE_PAGE.height;

	const placements: TextPlacementMap = {};

	const studentNameRect = scaleRect(HEADER_RECTS.student_name, scaleX, scaleY);
	const studentIdRect = scaleRect(HEADER_RECTS.student_id, scaleX, scaleY);
	const classNameRect = scaleRect(HEADER_RECTS.class_name, scaleX, scaleY);
	const academicYearRect = scaleRect(
		HEADER_RECTS.academic_year,
		scaleX,
		scaleY,
	);

	placements.student_name = rectToPlacement(studentNameRect, 2 * scaleX, {
		size: 12 * scaleY,
		align: 'left',
		font: 'bold',
	});
	placements.student_id = rectToPlacement(studentIdRect, 2 * scaleX, {
		size: 12 * scaleY,
		align: 'left',
	});
	placements.class_name = rectToPlacement(classNameRect, 2 * scaleX, {
		size: 12 * scaleY,
		align: 'left',
	});
	placements.academic_year = rectToPlacement(academicYearRect, 2 * scaleX, {
		size: 12 * scaleY,
		align: 'left',
		font: 'bold',
	});

	placements.school_name = {
		x: pageWidth / 2,
		y: pageHeight - 18 * scaleY,
		size: 14 * scaleY,
		align: 'center',
		font: 'bold',
	};
	placements.school_address = {
		x: pageWidth / 2,
		y: pageHeight - 36 * scaleY,
		size: 8 * scaleY,
		align: 'center',
		maxWidth: 360 * scaleX,
		lineHeight: 10 * scaleY,
	};
	placements.report_title = {
		x: pageWidth / 2,
		y: pageHeight - 54 * scaleY,
		size: 10 * scaleY,
		align: 'center',
		font: 'bold',
	};
	placements.class_level = {
		x: pageWidth / 2,
		y: pageHeight - 68 * scaleY,
		size: 9 * scaleY,
		align: 'center',
		font: 'bold',
	};
	placements.sponsor_name = {
		x: pageWidth - 190 * scaleX,
		y: pageHeight - 86 * scaleY,
		size: 9 * scaleY,
		align: 'left',
		maxWidth: 180 * scaleX,
	};

	const tableLeft = 40 * scaleX;
	const tableTop = 420 * scaleY;
	const tableHeight = 240 * scaleY;
	// Keep row height fixed across templates; only row count changes by subject list.
	// Baseline is 13 subjects + 2 summary rows.
	const BASE_TOTAL_ROWS = 15;
	const subjectRows = Math.max(subjectCount, 1);
	const rowHeight = tableHeight / BASE_TOTAL_ROWS;
	const rowContentLift = rowHeight + 5 * scaleY;
	const summaryGap = 6 * scaleY;
	const summaryRowLift = rowHeight + 9 * scaleY;
	const rowFontSize = Math.max(
		6 * scaleY,
		Math.min(9 * scaleY, rowHeight - 4 * scaleY),
	);
	// Subject column style overrides (relative to other row cells).
	const subjectRowFontSize = Math.min(10 * scaleY, rowFontSize + 0.25 * scaleY);
	const subjectWidth = 180 * scaleX;
	const colWidth = 50 * scaleX;

	// Semester block spacing:
	// first semester:  p1, p2, p3, exam1, avg1
	// second semester: p4, p5, p6, exam2, avg2, year
	// Normal inter-column distance is `colWidth`; this value is the special gap
	// between `avg1` and `p4` to control semester gutter.
	const semesterGutter = 0.75 * colWidth;
	const firstSemesterStart = tableLeft + subjectWidth;
	const secondSemesterStart =
		firstSemesterStart + colWidth * 5 + semesterGutter + 1 * colWidth;

	const columns = {
		subject: tableLeft,
		p1: firstSemesterStart,
		p2: firstSemesterStart + colWidth,
		p3: firstSemesterStart + colWidth * 2,
		exam1: firstSemesterStart + colWidth * 3,
		avg1: firstSemesterStart + colWidth * 4,
		p4: secondSemesterStart - 0.45 * colWidth,
		p5: secondSemesterStart + colWidth - 0.2 * colWidth,
		p6: secondSemesterStart + colWidth * 2,
		exam2: secondSemesterStart + colWidth * 3 + 0.1 * colWidth,
		avg2: secondSemesterStart + colWidth * 4 + 0.35 * colWidth,
		year: secondSemesterStart + colWidth * 5 + 0.8 * colWidth,
	};

	const rowFieldMap = [
		{ key: 'subject', align: 'left' as const, width: subjectWidth },
		{ key: 'p1', align: 'center' as const, width: colWidth },
		{ key: 'p2', align: 'center' as const, width: colWidth },
		{ key: 'p3', align: 'center' as const, width: colWidth },
		{ key: 'exam1', align: 'center' as const, width: colWidth },
		{ key: 'avg1', align: 'center' as const, width: colWidth },
		{ key: 'p4', align: 'center' as const, width: colWidth },
		{ key: 'p5', align: 'center' as const, width: colWidth },
		{ key: 'p6', align: 'center' as const, width: colWidth },
		{ key: 'exam2', align: 'center' as const, width: colWidth },
		{ key: 'avg2', align: 'center' as const, width: colWidth },
		{ key: 'year', align: 'center' as const, width: colWidth },
	];
	const examAndAverageCols = new Set(['exam1', 'avg1', 'exam2', 'avg2']);
	const examAndAverageRightNudge = 0.2 * colWidth;

	for (let index = 0; index < subjectRows; index += 1) {
		const row = String(index + 1).padStart(2, '0');
		const rowTop = tableTop - index * rowHeight;
		for (const col of rowFieldMap) {
			const fieldKey = `${col.key}_${row}`;
			if (col.key === 'subject') {
				placements[fieldKey] = {
					// Move subject text further left.
					x: columns.subject - 10 * scaleX,
					// Subject column in this template sits one row lower than other columns.
					// Shift anchor up by exactly one row while keeping middle alignment.
					// Add more lift to move it further toward the top.
					y: rowTop + rowContentLift,
					// Vertical centering happens via `valign: 'middle'` + `boxHeight`.
					boxHeight: rowHeight,
					valign: 'middle',
					size: subjectRowFontSize,
					font: 'bold',
					// Left-align subject labels with slight left padding on x.
					align: col.align,
					// Make subject text box even narrower.
					maxWidth: col.width - 80 * scaleX,
				};
			} else {
				placements[fieldKey] = {
					// Shift grade cells left by slightly less than two columns.
					x:
						columns[col.key as keyof typeof columns] +
						colWidth / 2 -
						1.7 * colWidth +
						(examAndAverageCols.has(col.key) ? examAndAverageRightNudge : 0),
					// Match grade cells to subject row level.
					y: rowTop + rowContentLift,
					boxHeight: rowHeight,
					valign: 'middle',
					size: rowFontSize,
					align: col.align,
					maxWidth: col.width,
				};
			}
		}
	}

	const avgRowTop = tableTop - subjectRows * rowHeight - summaryGap;
	const rankRowTop = avgRowTop - rowHeight;

	const summaryRow = (rowTop: number, fieldMap: Record<string, string>) => {
		Object.entries(fieldMap).forEach(([field, colKey]) => {
			placements[field] = {
				// Shift summary cells left by slightly less than two columns.
				x:
					columns[colKey as keyof typeof columns] +
					colWidth / 2 -
					1.7 * colWidth +
					(examAndAverageCols.has(colKey) ? examAndAverageRightNudge : 0),
				// Keep summary rows slightly higher than current position.
				y: rowTop + summaryRowLift,
				boxHeight: rowHeight,
				valign: 'middle',
				size: rowFontSize,
				font: field.startsWith('rank_') ? ('bold' as const) : undefined,
				align: 'center',
				maxWidth: colWidth,
			};
		});
	};

	summaryRow(avgRowTop, {
		avg_p1: 'p1',
		avg_p2: 'p2',
		avg_p3: 'p3',
		avg_exam1: 'exam1',
		avg_sem1: 'avg1',
		avg_p4: 'p4',
		avg_p5: 'p5',
		avg_p6: 'p6',
		avg_exam2: 'exam2',
		avg_sem2: 'avg2',
		avg_year: 'year',
	});

	summaryRow(rankRowTop, {
		rank_p1: 'p1',
		rank_p2: 'p2',
		rank_p3: 'p3',
		rank_exam1: 'exam1',
		rank_sem1: 'avg1',
		rank_p4: 'p4',
		rank_p5: 'p5',
		rank_p6: 'p6',
		rank_exam2: 'exam2',
		rank_sem2: 'avg2',
		rank_year: 'year',
	});

	placements.promotion_student_name = {
		x: 110 * scaleX,
		y: 95 * scaleY,
		size: 10 * scaleY,
		align: 'left',
		maxWidth: 220 * scaleX,
	};
	placements.promotion_from_grade = {
		x: 110 * scaleX,
		y: 78 * scaleY,
		size: 10 * scaleY,
		align: 'left',
		maxWidth: 120 * scaleX,
	};
	placements.promotion_to_grade = {
		x: 260 * scaleX,
		y: 78 * scaleY,
		size: 10 * scaleY,
		align: 'left',
		maxWidth: 120 * scaleX,
	};
	placements.promotion_year = {
		x: 410 * scaleX,
		y: 78 * scaleY,
		size: 10 * scaleY,
		align: 'left',
		maxWidth: 120 * scaleX,
	};

	return placements;
};
