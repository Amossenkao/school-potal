import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type TextAlign = 'left' | 'center' | 'right';
export type TextVAlign = 'top' | 'middle' | 'bottom';

export type TextPlacement = {
	x: number;
	y: number;
	size?: number;
	align?: TextAlign;
	valign?: TextVAlign;
	maxWidth?: number;
	lineHeight?: number;
	boxHeight?: number;
	color?: { r: number; g: number; b: number };
	font?: 'normal' | 'bold';
};

export type TextPlacementMap = Record<
	string,
	TextPlacement | TextPlacement[]
>;

type DrawTextMapArgs = {
	page: PDFPage;
	values: Record<string, string | number | null | undefined>;
	placements: TextPlacementMap;
	fonts: { normal: PDFFont; bold?: PDFFont };
	defaultSize?: number;
	defaultColor?: { r: number; g: number; b: number };
	debug?: boolean;
};

const DEFAULT_COLOR = { r: 0, g: 0, b: 0 };

const toColor = (color: { r: number; g: number; b: number }) =>
	rgb(color.r, color.g, color.b);

const normalizeText = (value: string | number | null | undefined) => {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	return String(value);
};

const sanitizeTextForFont = (text: string, font: PDFFont) => {
	let sanitized = '';
	for (const char of text) {
		if (char === '\n' || char === '\r') {
			sanitized += char;
			continue;
		}
		if (char === '\t') {
			sanitized += ' ';
			continue;
		}
		try {
			font.encodeText(char);
			sanitized += char;
		} catch {
			sanitized += '?';
		}
	}
	return sanitized;
};

const safeWidthOfTextAtSize = (font: PDFFont, text: string, size: number) => {
	try {
		return font.widthOfTextAtSize(text, size);
	} catch {
		return font.widthOfTextAtSize(sanitizeTextForFont(text, font), size);
	}
};

const wrapText = (
	text: string,
	maxWidth: number,
	font: PDFFont,
	size: number,
) => {
	if (!text) return [''];
	const paragraphs = text.split(/\r?\n/);
	const lines: string[] = [];

	for (const paragraph of paragraphs) {
		if (!paragraph.trim()) {
			lines.push('');
			continue;
		}
		const words = paragraph.split(/\s+/);
		let line = '';
		for (const word of words) {
			const next = line ? `${line} ${word}` : word;
			if (safeWidthOfTextAtSize(font, next, size) <= maxWidth || !line) {
				line = next;
			} else {
				lines.push(line);
				line = word;
			}
		}
		if (line) lines.push(line);
	}

	return lines.length ? lines : [''];
};

const resolveAlignedX = (
	placement: TextPlacement,
	text: string,
	font: PDFFont,
	size: number,
) => {
	const width = safeWidthOfTextAtSize(font, text, size);
	if (placement.align === 'center') {
		return placement.x - width / 2;
	}
	if (placement.align === 'right') {
		return placement.x - width;
	}
	return placement.x;
};

const resolveAlignedY = (
	placement: TextPlacement,
	font: PDFFont,
	size: number,
) => {
	if (!placement.boxHeight || placement.valign !== 'middle') {
		return placement.y;
	}
	const textHeight = font.heightAtSize(size);
	return placement.y - (placement.boxHeight + textHeight) / 2;
};

const drawDebugBox = (
	page: PDFPage,
	placement: TextPlacement,
	label: string,
	font: PDFFont,
) => {
	const width = placement.maxWidth ?? 2;
	const height = placement.boxHeight ?? 2;
	let x = placement.x;
	if (placement.align === 'center') {
		x = placement.x - width / 2;
	} else if (placement.align === 'right') {
		x = placement.x - width;
	}
	const y = placement.boxHeight ? placement.y - placement.boxHeight : placement.y;
	page.drawRectangle({
		x,
		y,
		width,
		height,
		borderColor: rgb(1, 0, 0),
		borderWidth: 0.5,
		opacity: 0.15,
	});
	page.drawText(label, {
		x,
		y: y + height + 2,
		size: 6,
		font,
		color: rgb(1, 0, 0),
	});
};

export const drawTextMap = ({
	page,
	values,
	placements,
	fonts,
	defaultSize = 10,
	defaultColor = DEFAULT_COLOR,
	debug = false,
}: DrawTextMapArgs) => {
	Object.entries(values).forEach(([key, rawValue]) => {
		const placementEntry = placements[key];
		if (!placementEntry) return;
		const text = normalizeText(rawValue);
		if (text === '') return;

		const entries = Array.isArray(placementEntry)
			? placementEntry
			: [placementEntry];

		for (const placement of entries) {
			const size = placement.size ?? defaultSize;
			const font =
				placement.font === 'bold' && fonts.bold ? fonts.bold : fonts.normal;
			const color = toColor(placement.color ?? defaultColor);
			const maxWidth = placement.maxWidth;
			const safeText = sanitizeTextForFont(text, font);
			const lines = maxWidth
				? wrapText(safeText, maxWidth, font, size)
				: safeText.split(/\r?\n/);
			const lineHeight = placement.lineHeight ?? size + 2;
			let y = resolveAlignedY(placement, font, size);

			lines.forEach((line, index) => {
				const lineY = y - index * lineHeight;
				const x = resolveAlignedX(placement, line, font, size);
				page.drawText(line, {
					x,
					y: lineY,
					size,
					font,
					color,
				});
			});

			if (debug) {
				const label = `${key} @ ${placement.x.toFixed(1)},${placement.y.toFixed(1)}`;
				drawDebugBox(page, placement, label, fonts.normal);
			}
		}
	});
};
