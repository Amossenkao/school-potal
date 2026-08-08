/**
 * InstitutionalSeal — a vector "gold foil" seal for official PDF documents
 * (attestations, transcripts, clearances, diplomas).
 *
 * Rendered entirely with @react-pdf/renderer SVG primitives so it stays sharp
 * on screen, in print, and at any export DPI — no raster assets.
 *
 * Two engine constraints shaped this implementation:
 *
 *  1. `TextPath` is NOT exported by @react-pdf/renderer, so the circular
 *     lettering is laid out by rotating each glyph individually around the
 *     centre (see `ArcText`).
 *  2. SVG *filters* (feGaussianBlur / feDropShadow) are unsupported, so the
 *     embossed relief is built from layered geometry instead — concentric
 *     bevel rings plus a two-pass "engraved" text treatment (a pale highlight
 *     offset down-right beneath dark lettering). This is deliberately more
 *     print-faithful than a filter would be, since it degrades to real ink
 *     rather than vanishing.
 *
 * The palette runs from #6E5518 to #FAF4E0 — a wide enough tonal range that
 * the seal still reads as metal when printed in greyscale.
 */

import React from 'react';
import {
	Svg,
	Circle,
	Line,
	Path,
	G,
	Defs,
	LinearGradient,
	RadialGradient,
	Stop,
	Text as SvgText,
	View,
	Image,
} from '@react-pdf/renderer';

// ── Palette ──────────────────────────────────────────────────────────────────
// `warm` matches the gold already used by the document letterheads (#C9A84C)
// so the seal reads as part of the same stationery, not a bolted-on graphic.
const GOLD = {
	darkest: '#6E5518',
	dark: '#8A6C22',
	mid: '#B08D3A',
	warm: '#C9A84C',
	light: '#E2CE8C',
	pale: '#F2E5BC',
	highlight: '#FAF4E0',
	paper: '#FEFCF6',
};

// Authored in a fixed 200×200 viewBox and scaled by `size`, so every radius
// below is a stable design constant independent of the rendered dimensions.
const VB = 200;
const C = VB / 2;

const R = {
	outerEdge: 98,
	rimCentre: 87.5, // rim band centre — also the circular-text baseline radius
	rimWidth: 19, // band spans 78 → 97
	rimOuterBevel: 96.6,
	rimInnerBevel: 78.6,
	rimInnerShadow: 77.6,
	ringOuter: 74,
	ringInner: 71.2,
	beads: 67.5,
	medallion: 63,
	medallionBevel: 61.6,
	sunburstInner: 40,
	sunburstOuter: 59,
	logo: 38, // logo occupies 38% of the seal diameter
};

// @react-pdf's SVG prop types omit font fields even though the layout engine
// reads them off `style` (they flow through getFragments → layoutText).
const svgFont = (fontFamily: string, fontSize: number) =>
	({ fontFamily, fontSize }) as any;

const n = (value: number) => Number(value.toFixed(2));

// ── Circular text ────────────────────────────────────────────────────────────

/**
 * Shrinks the type until the lettering fits the arc it is allotted, so an
 * unusually long institution name tightens rather than overrunning into the
 * side ornaments.
 */
function fitArcText(
	length: number,
	radius: number,
	maxSpanDeg: number,
	preferredSize: number,
	minSize: number,
) {
	const degPerUnit = 360 / (2 * Math.PI * radius);
	let fontSize = preferredSize;
	while (fontSize > minSize) {
		// 0.72em is a good average advance width for tracked-out Times caps.
		const span = length * fontSize * 0.72 * degPerUnit;
		if (span <= maxSpanDeg) return { fontSize, span };
		fontSize -= 0.25;
	}
	return {
		fontSize: minSize,
		span: Math.min(maxSpanDeg, length * minSize * 0.72 * degPerUnit),
	};
}

interface ArcTextProps {
	text: string;
	radius: number;
	fontSize: number;
	spanDeg: number;
	/** 0 = top of the seal, 180 = bottom. */
	centreDeg: number;
	/** Bottom-arc lettering is flipped so it stays upright to the reader. */
	flip?: boolean;
}

const ArcText = ({
	text,
	radius,
	fontSize,
	spanDeg,
	centreDeg,
	flip = false,
}: ArcTextProps) => {
	const chars = Array.from(text);
	if (chars.length === 0) return null;

	const step = chars.length > 1 ? spanDeg / (chars.length - 1) : 0;
	// Bottom lettering is walked backwards so it still reads left-to-right.
	const start = flip ? centreDeg + spanDeg / 2 : centreDeg - spanDeg / 2;
	const direction = flip ? -1 : 1;

	const placed = chars.map((char, i) => {
		const angle = start + direction * step * i;
		const rad = (angle * Math.PI) / 180;
		return {
			char,
			x: n(C + radius * Math.sin(rad)),
			y: n(C - radius * Math.cos(rad)),
			rotation: n(flip ? angle + 180 : angle),
		};
	});

	// Pass 1 sits a pale highlight just below-right of pass 2, which reads as
	// lettering cut into the metal once the two are overlaid.
	const passes = [
		{ fill: GOLD.highlight, dx: 0.7, dy: 0.7, opacity: 0.9 },
		{ fill: GOLD.darkest, dx: 0, dy: 0, opacity: 1 },
	];

	return (
		<>
			{passes.flatMap((pass, passIndex) =>
				placed.map((glyph, i) => (
					<G
						key={`${passIndex}-${i}`}
						transform={`translate(${n(glyph.x + pass.dx)}, ${n(
							glyph.y + pass.dy,
						)}) rotate(${glyph.rotation})`}
					>
						<SvgText
							x={0}
							y={0}
							textAnchor="middle"
							dominantBaseline="central"
							fill={pass.fill}
							opacity={pass.opacity}
							style={svgFont('Times-Bold', fontSize)}
						>
							{glyph.char}
						</SvgText>
					</G>
				)),
			)}
		</>
	);
};

// ── Ornaments ────────────────────────────────────────────────────────────────

/** Small rotated diamond — separates the upper and lower lettering. */
const Diamond = ({
	angleDeg,
	radius,
	half,
}: {
	angleDeg: number;
	radius: number;
	half: number;
}) => {
	const rad = (angleDeg * Math.PI) / 180;
	const x = n(C + radius * Math.sin(rad));
	const y = n(C - radius * Math.cos(rad));
	return (
		<>
			<Path
				d={`M ${x} ${n(y - half)} L ${n(x + half)} ${y} L ${x} ${n(
					y + half,
				)} L ${n(x - half)} ${y} Z`}
				fill={GOLD.darkest}
			/>
			<Path
				d={`M ${x} ${n(y - half * 0.45)} L ${n(x + half * 0.45)} ${y} L ${x} ${n(
					y + half * 0.45,
				)} L ${n(x - half * 0.45)} ${y} Z`}
				fill={GOLD.highlight}
				opacity={0.75}
			/>
		</>
	);
};

// ── Component ────────────────────────────────────────────────────────────────

export interface InstitutionalSealProps {
	/** Institution name, set around the upper circumference. */
	name: string;
	/** Optional logo for the centre medallion; initials are used when absent. */
	logo?: string;
	/** Rendered diameter in PDF points. ~96pt ≈ 1.33in. */
	size?: number;
	/** Lower-circumference legend. */
	subtitle?: string;
	/**
	 * Distinguishes this instance's gradient ids. Required when several seals
	 * share a document, since SVG ids are a flat namespace.
	 */
	idPrefix?: string;
}

export default function InstitutionalSeal({
	name,
	logo,
	size = 96,
	subtitle = 'OFFICIAL SEAL',
	idPrefix = 'seal',
}: InstitutionalSealProps) {
	const displayName = (name || '').trim().toUpperCase();
	const displaySubtitle = (subtitle || '').trim().toUpperCase();

	const rimGradId = `${idPrefix}-rim`;
	const centreGradId = `${idPrefix}-centre`;

	// Kept clear of the 90°/270° diamonds.
	const nameFit = fitArcText(displayName.length, R.rimCentre, 170, 12.5, 7.25);
	const subtitleFit = fitArcText(
		displaySubtitle.length,
		R.rimCentre,
		120,
		10,
		6.5,
	);

	const initials =
		displayName
			.split(/\s+/)
			.filter(Boolean)
			.map((word) => word[0])
			.join('')
			.slice(0, 3) || '';

	const beadCount = 40;
	const sunburstCount = 36;
	const logoBox = (size * (R.logo * 2)) / VB;
	const logoOffset = (size - logoBox) / 2;

	return (
		<View style={{ width: size, height: size, position: 'relative' }}>
			<Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
				<Defs>
					{/* Diagonal sheen: the tonal reversals are what make flat vector
					    fill read as struck metal rather than a yellow ring. */}
					<LinearGradient
						id={rimGradId}
						gradientUnits="userSpaceOnUse"
						x1={30}
						y1={26}
						x2={172}
						y2={176}
					>
						<Stop offset={0} stopColor={GOLD.dark} />
						<Stop offset={0.16} stopColor={GOLD.warm} />
						<Stop offset={0.32} stopColor={GOLD.highlight} />
						<Stop offset={0.48} stopColor={GOLD.light} />
						<Stop offset={0.64} stopColor={GOLD.warm} />
						<Stop offset={0.84} stopColor={GOLD.dark} />
						<Stop offset={1} stopColor={GOLD.darkest} />
					</LinearGradient>

					{/* Light source sits high, so the medallion appears gently domed
					    while staying pale enough for a colour logo to stay legible. */}
					<RadialGradient
						id={centreGradId}
						gradientUnits="userSpaceOnUse"
						cx={C}
						cy={82}
						r={72}
					>
						<Stop offset={0} stopColor="#FFFEFA" />
						<Stop offset={0.5} stopColor="#FBF3DC" />
						<Stop offset={0.8} stopColor={GOLD.pale} />
						<Stop offset={1} stopColor={GOLD.light} />
					</RadialGradient>
				</Defs>

				{/* Ground */}
				<Circle cx={C} cy={C} r={R.outerEdge} fill={GOLD.paper} />

				{/* Rim: dark containing edge, metallic band, then bevel highlights
				    on both lips to lift it off the page. */}
				<Circle
					cx={C}
					cy={C}
					r={R.outerEdge}
					fill="none"
					stroke={GOLD.darkest}
					strokeWidth={1.4}
				/>
				<Circle
					cx={C}
					cy={C}
					r={R.rimCentre}
					fill="none"
					stroke={`url(#${rimGradId})`}
					strokeWidth={R.rimWidth}
				/>
				<Circle
					cx={C}
					cy={C}
					r={R.rimOuterBevel}
					fill="none"
					stroke={GOLD.highlight}
					strokeWidth={0.9}
					opacity={0.8}
				/>
				<Circle
					cx={C}
					cy={C}
					r={R.rimInnerBevel}
					fill="none"
					stroke={GOLD.pale}
					strokeWidth={0.8}
					opacity={0.75}
				/>
				<Circle
					cx={C}
					cy={C}
					r={R.rimInnerShadow}
					fill="none"
					stroke={GOLD.dark}
					strokeWidth={1.1}
				/>

				{/* Circular legend */}
				{displayName ? (
					<ArcText
						text={displayName}
						radius={R.rimCentre}
						fontSize={nameFit.fontSize}
						spanDeg={nameFit.span}
						centreDeg={0}
					/>
				) : null}
				{displaySubtitle ? (
					<ArcText
						text={displaySubtitle}
						radius={R.rimCentre}
						fontSize={subtitleFit.fontSize}
						spanDeg={subtitleFit.span}
						centreDeg={180}
						flip
					/>
				) : null}

				<Diamond angleDeg={90} radius={R.rimCentre} half={4.2} />
				<Diamond angleDeg={270} radius={R.rimCentre} half={4.2} />

				{/* Inner rules */}
				<Circle
					cx={C}
					cy={C}
					r={R.ringOuter}
					fill="none"
					stroke={GOLD.mid}
					strokeWidth={1}
				/>
				<Circle
					cx={C}
					cy={C}
					r={R.ringInner}
					fill="none"
					stroke={GOLD.light}
					strokeWidth={0.6}
					opacity={0.8}
				/>

				{/* Beading — the traditional milled-edge detail. */}
				{Array.from({ length: beadCount }).map((_, i) => {
					const rad = ((i * 360) / beadCount) * (Math.PI / 180);
					return (
						<Circle
							key={`bead-${i}`}
							cx={n(C + R.beads * Math.sin(rad))}
							cy={n(C - R.beads * Math.cos(rad))}
							r={1.4}
							fill={GOLD.mid}
						/>
					);
				})}

				{/* Centre medallion */}
				<Circle
					cx={C}
					cy={C}
					r={R.medallion}
					fill={`url(#${centreGradId})`}
				/>

				{/* Engine-turned rays — kept very faint so they suggest guilloché
				    without competing with the emblem. */}
				{Array.from({ length: sunburstCount }).map((_, i) => {
					const rad = ((i * 360) / sunburstCount) * (Math.PI / 180);
					const sin = Math.sin(rad);
					const cos = Math.cos(rad);
					return (
						<Line
							key={`ray-${i}`}
							x1={n(C + R.sunburstInner * sin)}
							y1={n(C - R.sunburstInner * cos)}
							x2={n(C + R.sunburstOuter * sin)}
							y2={n(C - R.sunburstOuter * cos)}
							stroke={GOLD.light}
							strokeWidth={0.35}
							opacity={0.5}
						/>
					);
				})}

				<Circle
					cx={C}
					cy={C}
					r={R.medallion}
					fill="none"
					stroke={GOLD.mid}
					strokeWidth={1.2}
				/>
				<Circle
					cx={C}
					cy={C}
					r={R.medallionBevel}
					fill="none"
					stroke={GOLD.pale}
					strokeWidth={0.6}
					opacity={0.7}
				/>

				{/* Initials stand in for a missing logo, engraved the same way as
				    the rim lettering so the seal never renders hollow. */}
				{!logo && initials ? (
					<>
						<SvgText
							x={n(C + 0.8)}
							y={n(C + 0.8)}
							textAnchor="middle"
							dominantBaseline="central"
							fill={GOLD.highlight}
							style={svgFont('Times-Bold', 30)}
						>
							{initials}
						</SvgText>
						<SvgText
							x={C}
							y={C}
							textAnchor="middle"
							dominantBaseline="central"
							fill={GOLD.darkest}
							style={svgFont('Times-Bold', 30)}
						>
							{initials}
						</SvgText>
					</>
				) : null}
			</Svg>

			{/* The emblem is overlaid rather than embedded because @react-pdf has
			    no SVG <Image>. `contain` guarantees the logo is never distorted,
			    and the slight transparency lets the gold ground tint it so it
			    belongs to the seal without losing its identity. */}
			{logo ? (
				<View
					style={{
						position: 'absolute',
						top: logoOffset,
						left: logoOffset,
						width: logoBox,
						height: logoBox,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Image
						src={logo}
						style={{
							width: '100%',
							height: '100%',
							objectFit: 'contain',
							opacity: 0.92,
						}}
					/>
				</View>
			) : null}
		</View>
	);
}
