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
	student_name: { x: 67.8988113, y: 543.9407349, width: 231.8035813, height: 20 },
	student_id: { x: 67.8988113, y: 522.8097534, width: 150.9999924, height: 20 },
	class_name: { x: 67.8988113, y: 500.7859497, width: 150.9999924, height: 20 },
	academic_year: { x: 640.8154907, y: 500.7859497, width: 151, height: 20 },
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
	opts: { size?: number; align?: 'left' | 'center' | 'right' },
) => ({
	x: rect.x + paddingX,
	y: rect.y + rect.height,
	boxHeight: rect.height,
	valign: 'middle' as const,
	maxWidth: rect.width - paddingX * 2,
	size: opts.size,
	align: opts.align,
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
		size: 11 * scaleY,
		align: 'left',
	});
	placements.student_id = rectToPlacement(studentIdRect, 2 * scaleX, {
		size: 10 * scaleY,
		align: 'left',
	});
	placements.class_name = rectToPlacement(classNameRect, 2 * scaleX, {
		size: 10 * scaleY,
		align: 'left',
	});
	placements.academic_year = rectToPlacement(academicYearRect, 2 * scaleX, {
		size: 10 * scaleY,
		align: 'left',
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
	const maxRows = Math.max(subjectCount, 15);
	const rowHeight = tableHeight / maxRows;
	const rowFontSize = Math.max(
		6 * scaleY,
		Math.min(9 * scaleY, rowHeight - 4 * scaleY),
	);
	const subjectWidth = 180 * scaleX;
	const colWidth = 50 * scaleX;

	const columns = {
		subject: tableLeft,
		p1: tableLeft + subjectWidth,
		p2: tableLeft + subjectWidth + colWidth,
		p3: tableLeft + subjectWidth + colWidth * 2,
		exam1: tableLeft + subjectWidth + colWidth * 3,
		avg1: tableLeft + subjectWidth + colWidth * 4,
		p4: tableLeft + subjectWidth + colWidth * 5,
		p5: tableLeft + subjectWidth + colWidth * 6,
		p6: tableLeft + subjectWidth + colWidth * 7,
		exam2: tableLeft + subjectWidth + colWidth * 8,
		avg2: tableLeft + subjectWidth + colWidth * 9,
		year: tableLeft + subjectWidth + colWidth * 10,
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

	for (let index = 0; index < subjectCount; index += 1) {
		const row = String(index + 1).padStart(2, '0');
		const rowTop = tableTop - index * rowHeight;
		for (const col of rowFieldMap) {
			const fieldKey = `${col.key}_${row}`;
			if (col.key === 'subject') {
				placements[fieldKey] = {
					x: columns.subject + 2 * scaleX,
					y: rowTop,
					boxHeight: rowHeight,
					valign: 'middle',
					size: rowFontSize,
					align: col.align,
					maxWidth: col.width - 4 * scaleX,
				};
			} else {
				placements[fieldKey] = {
					x: columns[col.key as keyof typeof columns] + colWidth / 2,
					y: rowTop,
					boxHeight: rowHeight,
					valign: 'middle',
					size: rowFontSize,
					align: col.align,
					maxWidth: col.width,
				};
			}
		}
	}

	const avgRowTop = tableTop - maxRows * rowHeight - 6 * scaleY;
	const rankRowTop = avgRowTop - rowHeight;

	const summaryRow = (rowTop: number, fieldMap: Record<string, string>) => {
		Object.entries(fieldMap).forEach(([field, colKey]) => {
			placements[field] = {
				x: columns[colKey as keyof typeof columns] + colWidth / 2,
				y: rowTop,
				boxHeight: rowHeight,
				valign: 'middle',
				size: rowFontSize,
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
