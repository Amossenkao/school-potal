'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClassNameById } from '@/components/dashboard/academicYear';
import InsightMetricChart from '@/components/dashboard/InsightMetricChart';
import InsightChartTypeSelect from '@/components/dashboard/InsightChartTypeSelect';
import { useSchoolStore } from '@/store/schoolStore';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	ALL_PERIODS,
	PERIOD_LABELS,
	SEMESTER_LABELS,
	buildAverageByDimension,
	buildClassAverages,
	buildGradeBandData,
	buildPassFailData,
	buildPeriodTrend,
	buildSemesterTrend,
	buildTopPerformerRows,
	computeSemesterAverageFromGrades,
	filterGradesByPeriodAndSemester,
	formatAxisLabel,
	getOrderedClassIds,
	normalizeNumericGrades,
	type ChartType,
	type RawGradeRecord,
	type TopPerformerScope,
} from '@/components/dashboard/insightAnalytics';

// ─── Types ────────────────────────────────────────────────────────────────────

type GradeItem = {
	grade?: number | string | null;
	classId?: string | null;
	subject?: string | null;
	period?: string | null;
	status?: string | null;
	studentId?: string | null;
	studentName?: string | null;
	academicYear?: string | null;
};

type AdminPerformanceProps = {
	schoolProfile: SchoolProfile;
	selectedYear: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_CHART_CLASS = 'h-[220px] sm:h-[270px] w-full aspect-auto';

const fadeVariant = {
	hidden: { opacity: 0, y: 10 },
	show: { opacity: 1, y: 0 },
};

const CLASS_PALETTE = [
	{ fill: '#3B82F6', light: '#EFF6FF', text: '#1D4ED8' }, // blue
	{ fill: '#F59E0B', light: '#FFFBEB', text: '#B45309' }, // amber
	{ fill: '#10B981', light: '#ECFDF5', text: '#047857' }, // emerald
	{ fill: '#EF4444', light: '#FEF2F2', text: '#B91C1C' }, // red
	{ fill: '#8B5CF6', light: '#F5F3FF', text: '#6D28D9' }, // violet
	{ fill: '#EC4899', light: '#FDF2F8', text: '#BE185D' }, // pink
	{ fill: '#14B8A6', light: '#F0FDFA', text: '#0F766E' }, // teal
	{ fill: '#F97316', light: '#FFF7ED', text: '#C2410C' }, // orange
];

const getAverage = (values: number[]) => {
	if (values.length === 0) return 0;
	return Number(
		(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
	);
};

// ─── Session / class-level helpers ───────────────────────────────────────────

/**
 * Returns the sessions defined in schoolProfile.classLevels as an array of
 * { key, label } objects, preserving the order they appear in the schema.
 */
function getSessions(
	schoolProfile: SchoolProfile,
): { key: string; label: string }[] {
	const classLevels = (schoolProfile as any).classLevels as
		| Record<string, any>
		| undefined;
	if (!classLevels) return [];
	return Object.keys(classLevels).map((key) => ({ key, label: key }));
}

/**
 * Returns the class-level groups within a given session.
 * e.g. ["Daycare", "Lower Elementary", "Upper Elementary", "Junior High", "Senior High"]
 */
function getClassLevelsForSession(
	schoolProfile: SchoolProfile,
	session: string,
): { key: string; label: string }[] {
	const classLevels = (schoolProfile as any).classLevels as
		| Record<string, any>
		| undefined;
	if (!classLevels || !classLevels[session]) return [];
	return Object.keys(classLevels[session]).map((key) => ({ key, label: key }));
}

/**
 * Returns the classIds belonging to a specific session + class level.
 */
function getClassIdsForLevel(
	schoolProfile: SchoolProfile,
	session: string,
	classLevel: string,
): string[] {
	const classLevels = (schoolProfile as any).classLevels as
		| Record<string, any>
		| undefined;
	if (
		!classLevels ||
		!classLevels[session] ||
		!classLevels[session][classLevel]
	)
		return [];
	const levelData = classLevels[session][classLevel];
	const classes = levelData.classes as
		| Array<{ classId: string; name: string }>
		| undefined;
	return classes ? classes.map((c) => c.classId) : [];
}

// ─── Performer bar chart ───────────────────────────────────────────────────────

type PerformerBarEntry = {
	label: string;
	average: number;
	scopeLabel: string;
	classLabel: string;
	studentName?: string;
	records: number;
};

type TooltipState = {
	x: number;
	y: number;
	entry: PerformerBarEntry;
	colorIdx: number;
} | null;

function assignBarColors(
	entries: PerformerBarEntry[],
	scope: TopPerformerScope,
): number[] {
	const classColorMap = new Map<string, number>();
	return entries.map((entry, idx) => {
		const key =
			scope === 'class'
				? entry.scopeLabel
				: entry.classLabel || entry.scopeLabel;
		if (classColorMap.has(key)) {
			return classColorMap.get(key)!;
		}
		const prevIdx =
			idx > 0 ? assignBarColors(entries.slice(0, idx), scope)[idx - 1] : -1;
		let pick = classColorMap.size % CLASS_PALETTE.length;
		if (pick === prevIdx) {
			pick = (pick + 1) % CLASS_PALETTE.length;
		}
		classColorMap.set(key, pick);
		return pick;
	});
}

type PerformerBarChartProps = {
	data: PerformerBarEntry[];
	scope: TopPerformerScope;
	maxGrade?: number;
};

function PerformerBarChart({
	data,
	scope,
	maxGrade = 100,
}: PerformerBarChartProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [tooltip, setTooltip] = useState<TooltipState>(null);
	const [dims, setDims] = useState({ width: 600, height: 320 });

	useEffect(() => {
		if (!containerRef.current) return;
		const ro = new ResizeObserver((entries) => {
			const rect = entries[0].contentRect;
			setDims({
				width: rect.width,
				height: Math.max(260, Math.min(420, rect.width * 0.52)),
			});
		});
		ro.observe(containerRef.current);
		return () => ro.disconnect();
	}, []);

	const colorIndices = useMemo(
		() => assignBarColors(data, scope),
		[data, scope],
	);

	if (data.length === 0) {
		return (
			<p className="text-sm text-muted-foreground py-6 text-center">
				No performer data available.
			</p>
		);
	}

	const PAD = { top: 24, right: 20, bottom: 64, left: 48 };
	const chartW = dims.width - PAD.left - PAD.right;
	const chartH = dims.height - PAD.top - PAD.bottom;

	const yMax = Math.ceil((maxGrade * 1.05) / 10) * 10;
	const yTicks = [0, 20, 40, 60, 80, 100].filter((t) => t <= yMax);

	const barGap = 8;
	const barW = Math.max(
		18,
		Math.min(54, (chartW - barGap * (data.length - 1)) / data.length - 2),
	);
	const groupW = barW + barGap;
	const totalW = groupW * data.length - barGap;
	const startX = (chartW - totalW) / 2;

	const yScale = (val: number) => chartH - (val / yMax) * chartH;

	return (
		<div ref={containerRef} className="relative w-full select-none">
			<svg
				ref={svgRef}
				width={dims.width}
				height={dims.height}
				viewBox={`0 0 ${dims.width} ${dims.height}`}
				className="overflow-visible"
			>
				<g transform={`translate(${PAD.left},${PAD.top})`}>
					{yTicks.map((tick) => {
						const y = yScale(tick);
						return (
							<g key={tick}>
								<line
									x1={0}
									y1={y}
									x2={chartW}
									y2={y}
									stroke="currentColor"
									strokeOpacity={tick === 0 ? 0.25 : 0.08}
									strokeWidth={tick === 0 ? 1.5 : 1}
								/>
								<text
									x={-8}
									y={y + 4}
									textAnchor="end"
									fontSize={11}
									fill="currentColor"
									fillOpacity={0.45}
									fontFamily="system-ui,sans-serif"
								>
									{tick}
								</text>
							</g>
						);
					})}

					{data.map((entry, idx) => {
						const colorIdx = colorIndices[idx];
						const color = CLASS_PALETTE[colorIdx];
						const barHeight = Math.max(4, (entry.average / yMax) * chartH);
						const bx = startX + idx * groupW;
						const by = chartH - barHeight;
						const rx = Math.min(6, barW / 4);
						const rawLabel = scope === 'class' ? entry.scopeLabel : entry.label;
						const displayLabel =
							rawLabel.length > 12 ? rawLabel.slice(0, 11) + '…' : rawLabel;

						return (
							<g
								key={idx}
								style={{ cursor: 'pointer' }}
								onMouseEnter={(e) => {
									const rect = containerRef.current!.getBoundingClientRect();
									const svgRect = svgRef.current!.getBoundingClientRect();
									const barCenterX =
										svgRect.left - rect.left + PAD.left + bx + barW / 2;
									const barTopY = svgRect.top - rect.top + PAD.top + by;
									setTooltip({ x: barCenterX, y: barTopY, entry, colorIdx });
								}}
								onMouseLeave={() => setTooltip(null)}
							>
								<rect
									x={bx - 3}
									y={by - 2}
									width={barW + 6}
									height={barHeight + 4}
									rx={rx + 2}
									fill={color.fill}
									opacity={0.12}
								/>
								<path
									d={`M ${bx + rx} ${by} h ${barW - 2 * rx} a ${rx} ${rx} 0 0 1 ${rx} ${rx} v ${barHeight - rx} H ${bx} v ${-(barHeight - rx)} a ${rx} ${rx} 0 0 1 ${rx} ${-rx} Z`}
									fill={color.fill}
									opacity={0.9}
								/>
								<rect
									x={bx + rx}
									y={by}
									width={barW - 2 * rx}
									height={3}
									fill="white"
									opacity={0.22}
									rx={1}
								/>
								<text
									x={bx + barW / 2}
									y={by - 6}
									textAnchor="middle"
									fontSize={10.5}
									fontWeight={600}
									fill={color.fill}
									fontFamily="system-ui,sans-serif"
								>
									{entry.average.toFixed(1)}
								</text>
								<text
									x={bx + barW / 2}
									y={chartH + 16}
									textAnchor="middle"
									fontSize={10.5}
									fill="currentColor"
									fillOpacity={0.6}
									fontFamily="system-ui,sans-serif"
								>
									{displayLabel}
								</text>
								{scope !== 'class' && entry.classLabel && (
									<text
										x={bx + barW / 2}
										y={chartH + 30}
										textAnchor="middle"
										fontSize={9}
										fill={color.fill}
										fillOpacity={0.8}
										fontFamily="system-ui,sans-serif"
									>
										{entry.classLabel.length > 10
											? entry.classLabel.slice(0, 9) + '…'
											: entry.classLabel}
									</text>
								)}
							</g>
						);
					})}
				</g>
			</svg>

			<AnimatePresence>
				{tooltip && (
					<motion.div
						key="tt"
						initial={{ opacity: 0, y: 4, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.97 }}
						transition={{ duration: 0.15 }}
						style={{
							position: 'absolute',
							left: tooltip.x,
							top: tooltip.y - 12,
							transform: 'translate(-50%, -100%)',
							zIndex: 50,
							pointerEvents: 'none',
						}}
					>
						<TooltipCard
							entry={tooltip.entry}
							colorIdx={tooltip.colorIdx}
							scope={scope}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function TooltipCard({
	entry,
	colorIdx,
	scope,
}: {
	entry: PerformerBarEntry;
	colorIdx: number;
	scope: TopPerformerScope;
}) {
	const color = CLASS_PALETTE[colorIdx];
	return (
		<div
			style={{
				background: 'var(--background, #fff)',
				borderRadius: 12,
				boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)',
				border: `1.5px solid ${color.fill}33`,
				padding: '12px 16px',
				minWidth: 160,
				maxWidth: 220,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					marginBottom: 8,
				}}
			>
				<span
					style={{
						width: 10,
						height: 10,
						borderRadius: '50%',
						background: color.fill,
						flexShrink: 0,
						display: 'inline-block',
					}}
				/>
				<span
					style={{
						fontSize: 12,
						fontWeight: 700,
						color: color.text,
						fontFamily: 'system-ui,sans-serif',
						letterSpacing: '0.01em',
					}}
				>
					{entry.classLabel || entry.scopeLabel}
				</span>
			</div>
			{scope !== 'class' && (
				<p
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: 'var(--foreground, #111)',
						fontFamily: 'system-ui,sans-serif',
						marginBottom: 2,
						lineHeight: 1.3,
					}}
				>
					{ entry.label}
				</p>
			)}
			{scope === 'class' && (
				<p
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: 'var(--foreground, #111)',
						fontFamily: 'system-ui,sans-serif',
						marginBottom: 2,
						lineHeight: 1.3,
					}}
				>
					{entry.studentName}
				</p>
			)}
			<div
				style={{ height: 1, background: `${color.fill}22`, margin: '8px 0' }}
			/>
			<div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
				<span
					style={{
						fontSize: 22,
						fontWeight: 800,
						color: color.fill,
						fontFamily: 'system-ui,sans-serif',
						lineHeight: 1,
					}}
				>
					{entry.average.toFixed(1)}
				</span>
				<span
					style={{
						fontSize: 11,
						color: 'var(--muted-foreground, #666)',
						fontFamily: 'system-ui,sans-serif',
					}}
				>
					avg
				</span>
			</div>
		</div>
	);
}

// ─── Class color legend ────────────────────────────────────────────────────────

function ClassColorLegend({
	entries,
	scope,
}: {
	entries: PerformerBarEntry[];
	scope: TopPerformerScope;
}) {
	const colorIndices = useMemo(
		() => assignBarColors(entries, scope),
		[entries, scope],
	);

	const legend = useMemo(() => {
		const seen = new Map<string, number>();
		entries.forEach((entry, idx) => {
			const key =
				scope === 'class'
					? entry.scopeLabel
					: entry.classLabel || entry.scopeLabel;
			if (!seen.has(key)) seen.set(key, colorIndices[idx]);
		});
		return Array.from(seen.entries());
	}, [entries, colorIndices, scope]);

	if (legend.length <= 1) return null;

	return (
		<div className="flex flex-wrap gap-3">
			{legend.map(([label, colorIdx]) => {
				const color = CLASS_PALETTE[colorIdx];
				return (
					<span
						key={label}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 6,
							fontSize: 12,
							fontFamily: 'system-ui,sans-serif',
							color: color.text,
							background: color.light,
							border: `1px solid ${color.fill}33`,
							borderRadius: 20,
							padding: '3px 10px 3px 8px',
						}}
					>
						<span
							style={{
								width: 8,
								height: 8,
								borderRadius: '50%',
								background: color.fill,
								display: 'inline-block',
							}}
						/>
						{label}
					</span>
				);
			})}
		</div>
	);
}

// ─── Filter select helper ─────────────────────────────────────────────────────

function FilterSelect({
	label,
	value,
	onChange,
	options,
	disabled,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
	disabled?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
			{label}
			<select
				className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
			>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	);
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AdminPerformance({
	schoolProfile,
	selectedYear,
}: AdminPerformanceProps) {
	const [grades, setGrades] = useState<GradeItem[]>([]);
	const [selectedPeriod, setSelectedPeriod] = useState('all');
	const [selectedSemester, setSelectedSemester] = useState('all');
	const [overviewChartType, setOverviewChartType] =
		useState<ChartType>('column');
	const [topChartType, setTopChartType] = useState<ChartType>('column');
	const [trendChartType, setTrendChartType] = useState<ChartType>('column');
	const [trendView, setTrendView] = useState<'period' | 'semester'>('period');
	const [topScope, setTopScope] = useState<TopPerformerScope>('class');
	const [topLimit, setTopLimit] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const gradesByAcademicYear = useSchoolStore(
		(state) => state.gradesByAcademicYear,
	);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);

	// ── Session / class-level state ──────────────────────────────────────────
	const sessions = useMemo(() => getSessions(schoolProfile), [schoolProfile]);
	const [selectedSession, setSelectedSession] = useState<string>(
		() => sessions[0]?.key ?? '',
	);

	// When school profile changes, reset to first session
	useEffect(() => {
		if (
			sessions.length > 0 &&
			!sessions.find((s) => s.key === selectedSession)
		) {
			setSelectedSession(sessions[0].key);
		}
	}, [sessions, selectedSession]);

	const classLevelsForSession = useMemo(
		() => getClassLevelsForSession(schoolProfile, selectedSession),
		[schoolProfile, selectedSession],
	);
	const [selectedClassLevel, setSelectedClassLevel] = useState<string>(
		() => classLevelsForSession[0]?.key ?? '',
	);

	// Reset class level when session changes
	useEffect(() => {
		if (
			classLevelsForSession.length > 0 &&
			!classLevelsForSession.find((l) => l.key === selectedClassLevel)
		) {
			setSelectedClassLevel(classLevelsForSession[0]?.key ?? '');
		}
	}, [classLevelsForSession, selectedClassLevel]);

	/** The classIds that belong to the currently selected session + class level. */
	const allowedClassIds = useMemo(
		() =>
			new Set(
				getClassIdsForLevel(schoolProfile, selectedSession, selectedClassLevel),
			),
		[schoolProfile, selectedSession, selectedClassLevel],
	);

	const showSessionFilter = sessions.length > 1;
	const showClassLevelFilter = classLevelsForSession.length > 1;

	// ── Period / semester state ───────────────────────────────────────────────
	useEffect(() => {
		setSelectedPeriod('all');
		setSelectedSemester('all');
	}, [selectedYear]);

	useEffect(() => {
		if (selectedSemester !== 'all') setSelectedPeriod('all');
	}, [selectedSemester]);

	useEffect(() => {
		if (selectedPeriod !== 'all') setSelectedSemester('all');
	}, [selectedPeriod]);

	// ── Grade fetching ────────────────────────────────────────────────────────
	useEffect(() => {
		if (!selectedYear) return;
		const controller = new AbortController();

		const constrainYearRecords = (records: GradeItem[]) =>
			records.filter((record) => {
				if (!record.academicYear) return true;
				return areAcademicYearsEqual(record.academicYear, selectedYear);
			});

		const fetchGrades = async () => {
			try {
				setIsLoading(true);
				setErrorMessage('');

				const storeGrades = getScopedAcademicYearValue(
					gradesByAcademicYear,
					selectedYear,
				).value;
				if (Array.isArray(storeGrades)) {
					setGrades(constrainYearRecords(storeGrades as GradeItem[]));
					return;
				}

				const response = await fetch(
					`/api/grades?academicYear=${encodeURIComponent(selectedYear)}`,
					{ signal: controller.signal },
				);
				const payload = await response.json();
				if (!response.ok || !payload?.success) {
					throw new Error(
						payload?.message || 'Failed to load grade analytics.',
					);
				}
				const data =
					payload?.data?.grades || payload?.data?.report?.grades || [];
				const safeData = Array.isArray(data) ? (data as GradeItem[]) : [];
				setGrades(constrainYearRecords(safeData));
				setGradesForYear(selectedYear, safeData);
			} catch (error) {
				if ((error as Error).name === 'AbortError') return;
				setErrorMessage(
					(error as Error).message || 'Unable to load grade analytics.',
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchGrades();
		return () => controller.abort();
	}, [selectedYear, gradesByAcademicYear, setGradesForYear]);

	const passMark = schoolProfile.settings?.gradingSettings?.passMark || 70;

	const orderedClassIds = useMemo(
		() => getOrderedClassIds(schoolProfile),
		[schoolProfile],
	);

	const numericGrades = useMemo(
		() => normalizeNumericGrades(grades as RawGradeRecord[]),
		[grades],
	);

	/**
	 * Grades filtered to only the classes in the selected session + class level.
	 * This is the base for all level-scoped analytics.
	 */
	const levelGrades = useMemo(
		() =>
			numericGrades.filter(
				(g) =>
					!g.classId ||
					allowedClassIds.size === 0 ||
					allowedClassIds.has(g.classId),
			),
		[numericGrades, allowedClassIds],
	);

	const filteredGrades = useMemo(
		() =>
			filterGradesByPeriodAndSemester(
				levelGrades,
				selectedPeriod,
				selectedSemester,
			),
		[levelGrades, selectedPeriod, selectedSemester],
	);

	const classAverages = useMemo(
		() =>
			buildClassAverages(filteredGrades, schoolProfile, (classId) =>
				getClassNameById(schoolProfile, classId),
			),
		[filteredGrades, schoolProfile],
	);

	const subjectAverages = useMemo(
		() => buildAverageByDimension(filteredGrades, (grade) => grade.subject),
		[filteredGrades],
	);

	const passFailData = useMemo(
		() => buildPassFailData(filteredGrades, passMark),
		[filteredGrades, passMark],
	);
	const gradeBandData = useMemo(
		() => buildGradeBandData(filteredGrades),
		[filteredGrades],
	);
	const gradeBandPieData = useMemo(
		() =>
			gradeBandData.map((entry) => {
				if (entry.label.startsWith('A')) return { key: 'A', ...entry };
				if (entry.label.startsWith('B')) return { key: 'B', ...entry };
				if (entry.label.startsWith('C')) return { key: 'C', ...entry };
				if (entry.label.startsWith('D')) return { key: 'D', ...entry };
				return { key: 'F', ...entry };
			}),
		[gradeBandData],
	);

	// Trend uses level-filtered grades (not period/semester filtered) so all periods show
	const periodTrend = useMemo(
		() => buildPeriodTrend(levelGrades),
		[levelGrades],
	);
	const semesterTrend = useMemo(
		() => buildSemesterTrend(levelGrades),
		[levelGrades],
	);
	const trendData = trendView === 'period' ? periodTrend : semesterTrend;

	const topRows = useMemo(
		() =>
			buildTopPerformerRows(filteredGrades, {
				scope: topScope,
				limit: topLimit,
				resolveClassLabel: (classId) =>
					getClassNameById(schoolProfile, classId),
				orderedClassIds,
			}),
		[filteredGrades, topScope, topLimit, schoolProfile, orderedClassIds],
	);

	const topChartData = useMemo(
		() =>
			topRows.map((entry) => ({
				label:
					topScope === 'class'
						? entry.scopeLabel
						: entry.studentName.length > 18
							? `${entry.studentName.slice(0, 18)}…`
							: entry.studentName,
				average: entry.average,
				scopeLabel: entry.scopeLabel,
				classLabel: entry.classLabel || '',
				studentName: entry.studentName,
				records: entry.count,
			})),
		[topRows, topScope],
	);

	const averageGrade = useMemo(() => {
		if (selectedSemester === 'first' || selectedSemester === 'second') {
			return computeSemesterAverageFromGrades(levelGrades, selectedSemester);
		}
		return getAverage(filteredGrades.map((grade) => grade.grade));
	}, [filteredGrades, levelGrades, selectedSemester]);

	const passCount =
		passFailData.find((entry) => entry.label === 'Pass')?.value || 0;
	const totalRecords = filteredGrades.length;
	const passRate =
		totalRecords > 0 ? Math.round((passCount / totalRecords) * 100) : 0;
	const uniqueStudents = useMemo(() => {
		const identifiers = new Set<string>();
		filteredGrades.forEach((grade) => {
			const key = `${grade.studentId || ''}::${grade.studentName || ''}`.trim();
			if (key) identifiers.add(key);
		});
		return identifiers.size;
	}, [filteredGrades]);
	const trendAverage = useMemo(
		() => getAverage(trendData.map((entry) => entry.average)),
		[trendData],
	);

	const periodOptions = useMemo(
		() =>
			ALL_PERIODS.map((period) => ({
				value: period,
				label: PERIOD_LABELS[period],
			})),
		[],
	);

	// ── Subtitle for the header card ─────────────────────────────────────────
	const scopeSubtitle = useMemo(() => {
		const parts: string[] = [];
		if (selectedSession) parts.push(selectedSession);
		if (selectedClassLevel) parts.push(selectedClassLevel);
		return parts.join(' · ');
	}, [selectedSession, selectedClassLevel]);

	return (
		<div className="space-y-6">
			{/* ── Header card with summary stats ── */}
			<Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-indigo-50/60 via-background to-sky-50/60 dark:from-indigo-950/20 dark:via-background dark:to-sky-950/20">
				<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<CardTitle>Performance Intelligence</CardTitle>
						<p className="text-sm text-muted-foreground">
							{scopeSubtitle
								? `${scopeSubtitle} — ${selectedYear || 'selected year'}`
								: `Deep analytics for ${selectedYear || 'selected year'}.`}
						</p>
					</div>

					{/* All scope + period filters grouped together */}
					<div className="flex flex-wrap gap-3">
						{/* Session filter — hidden when only one session exists */}
						{showSessionFilter && (
							<FilterSelect
								label="Session"
								value={selectedSession}
								onChange={(val) => setSelectedSession(val)}
								options={sessions.map((s) => ({
									value: s.key,
									label: s.label,
								}))}
							/>
						)}

						{/* Class level filter — hidden when only one level in the session */}
						{showClassLevelFilter && (
							<FilterSelect
								label="Class Level"
								value={selectedClassLevel}
								onChange={(val) => setSelectedClassLevel(val)}
								options={classLevelsForSession.map((l) => ({
									value: l.key,
									label: l.label,
								}))}
							/>
						)}

						{/* Period filter */}
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Period
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedPeriod}
								onChange={(event) => setSelectedPeriod(event.target.value)}
								disabled={selectedSemester !== 'all'}
							>
								<option value="all">All periods</option>
								{periodOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>

						{/* Semester filter */}
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Semester
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedSemester}
								onChange={(event) => setSelectedSemester(event.target.value)}
								disabled={selectedPeriod !== 'all'}
							>
								<option value="all">All semesters</option>
								<option value="first">{SEMESTER_LABELS.first}</option>
								<option value="second">{SEMESTER_LABELS.second}</option>
							</select>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading analytics…</p>
					) : errorMessage ? (
						<p className="text-sm text-red-500">{errorMessage}</p>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{[
								{
									label: 'Average Grade',
									value: averageGrade.toFixed(1),
									helper: `${totalRecords} grade records`,
								},
								{
									label: 'Pass Rate',
									value: `${passRate}%`,
									helper: `${passCount}/${totalRecords} passing`,
								},
								{
									label: 'Students Tracked',
									value: String(uniqueStudents),
									helper: 'Unique students in filter',
								},
								{
									label: 'Top Subject',
									value: subjectAverages[0]?.label || 'N/A',
									helper: 'Highest average score',
								},
							].map((stat, index) => (
								<motion.div
									key={stat.label}
									variants={fadeVariant}
									initial="hidden"
									animate="show"
									transition={{ duration: 0.28, delay: index * 0.05 }}
									className="rounded-lg border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
								>
									<p className="text-xs text-muted-foreground">{stat.label}</p>
									<p className="mt-1 text-2xl font-semibold">{stat.value}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{stat.helper}
									</p>
								</motion.div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto p-1">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="performers">Top Performers</TabsTrigger>
					<TabsTrigger value="trends">Trends</TabsTrigger>
				</TabsList>

				{/* ── Overview tab ── */}
				<TabsContent value="overview" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Class Averages</CardTitle>
								<p className="text-sm text-muted-foreground">
									Performance across{' '}
									<span className="font-medium text-foreground">
										{selectedClassLevel || 'all classes'}
									</span>{' '}
									{selectedSession ? `(${selectedSession})` : ''} for the
									selected period.
								</p>
							</div>
							<InsightChartTypeSelect
								label="Graph Type"
								value={overviewChartType}
								onChange={setOverviewChartType}
							/>
						</CardHeader>
						<CardContent>
							{classAverages.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No performance data available for the selected filters.
								</p>
							) : (
								<InsightMetricChart
									data={classAverages}
									chartType={overviewChartType}
									xKey="label"
									yKey="average"
									yLabel="Average Grade"
									color="hsl(206, 88%, 53%)"
									xTickFormatter={(value) => formatAxisLabel(value, 14)}
								/>
							)}
						</CardContent>
					</Card>

					<div className="grid gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Pass vs Fail</CardTitle>
							</CardHeader>
							<CardContent>
								<ChartContainer
									config={{
										Pass: { label: 'Pass', color: 'hsl(145, 63%, 42%)' },
										Fail: { label: 'Fail', color: 'hsl(0, 84%, 60%)' },
									}}
									className={PIE_CHART_CLASS}
								>
									<PieChart>
										<ChartTooltip
											content={<ChartTooltipContent nameKey="label" />}
										/>
										<Pie
											data={passFailData}
											dataKey="value"
											nameKey="label"
											innerRadius={52}
											outerRadius={85}
											stroke="transparent"
											isAnimationActive
											animationDuration={700}
										>
											{passFailData.map((entry) => (
												<Cell
													key={entry.label}
													fill={`var(--color-${entry.label})`}
												/>
											))}
										</Pie>
									</PieChart>
								</ChartContainer>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Grade Distribution</CardTitle>
							</CardHeader>
							<CardContent>
								<ChartContainer
									config={{
										A: { label: 'A (90-100)', color: 'hsl(145, 63%, 42%)' },
										B: { label: 'B (80-89)', color: 'hsl(199, 89%, 48%)' },
										C: { label: 'C (70-79)', color: 'hsl(45, 93%, 47%)' },
										D: { label: 'D (60-69)', color: 'hsl(24, 95%, 53%)' },
										F: { label: 'F (<60)', color: 'hsl(0, 84%, 60%)' },
									}}
									className={PIE_CHART_CLASS}
								>
									<PieChart>
										<ChartTooltip
											content={<ChartTooltipContent nameKey="key" />}
										/>
										<Pie
											data={gradeBandPieData}
											dataKey="value"
											nameKey="key"
											innerRadius={42}
											outerRadius={86}
											stroke="transparent"
											isAnimationActive
											animationDuration={700}
										>
											{gradeBandPieData.map((entry) => (
												<Cell
													key={entry.label}
													fill={`var(--color-${entry.key})`}
												/>
											))}
										</Pie>
									</PieChart>
								</ChartContainer>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				{/* ── Top Performers tab ── */}
				<TabsContent value="performers" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Top Performers</CardTitle>
								<p className="text-sm text-muted-foreground">
									Ranked by class, period, semester, or yearly average.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<FilterSelect
									label="Scope"
									value={topScope}
									onChange={(val) => setTopScope(val as TopPerformerScope)}
									options={[
										{ value: 'class', label: 'By Class' },
										{ value: 'period', label: 'By Period' },
										{ value: 'semester', label: 'By Semester' },
										{ value: 'yearly', label: 'Yearly Overall' },
									]}
								/>
								<FilterSelect
									label="Top X"
									value={String(topLimit)}
									onChange={(val) => setTopLimit(Number(val))}
									options={[1, 2, 3, 4, 5].map((n) => ({
										value: String(n),
										label: `Top ${n}`,
									}))}
								/>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{topRows.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No performer data available for the selected filters.
								</p>
							) : (
								<>
									<ClassColorLegend entries={topChartData} scope={topScope} />
									<PerformerBarChart data={topChartData} scope={topScope} />

									<div className="overflow-x-auto rounded-lg border border-border">
										<table className="min-w-full text-sm">
											<thead className="bg-muted/50">
												<tr className="text-left text-muted-foreground">
													<th className="px-4 py-3">Scope</th>
													<th className="px-4 py-3">Student</th>
													<th className="px-4 py-3">Class</th>
													<th className="px-4 py-3">Student ID</th>
													<th className="px-4 py-3">Average</th>
													<th className="px-4 py-3">Records</th>
												</tr>
											</thead>
											<tbody>
												{topRows.map((entry, idx) => {
													const colorIndices = assignBarColors(
														topChartData,
														topScope,
													);
													const colorIdx = colorIndices[idx];
													const color = CLASS_PALETTE[colorIdx];
													return (
														<tr
															key={entry.key}
															className="border-t border-border/70"
														>
															<td className="px-4 py-3">
																<span
																	style={{
																		display: 'inline-flex',
																		alignItems: 'center',
																		gap: 6,
																	}}
																>
																	<span
																		style={{
																			width: 8,
																			height: 8,
																			borderRadius: '50%',
																			background: color.fill,
																			display: 'inline-block',
																			flexShrink: 0,
																		}}
																	/>
																	{entry.scopeLabel}
																</span>
															</td>
															<td className="px-4 py-3 font-medium">
																{entry.studentName}
															</td>
															<td className="px-4 py-3">
																{entry.classLabel || '—'}
															</td>
															<td className="px-4 py-3">
																{entry.studentId || '—'}
															</td>
															<td className="px-4 py-3 font-semibold">
																{entry.average.toFixed(1)}
															</td>
															<td className="px-4 py-3">{entry.count}</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* ── Trends tab ── */}
				<TabsContent value="trends" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Year Trend</CardTitle>
								<p className="text-sm text-muted-foreground">
									Average trend for the year: {trendAverage.toFixed(1)}
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<FilterSelect
									label="Trend View"
									value={trendView}
									onChange={(val) => setTrendView(val as 'period' | 'semester')}
									options={[
										{ value: 'period', label: 'By period' },
										{ value: 'semester', label: 'By semester' },
									]}
								/>
								<InsightChartTypeSelect
									label="Graph Type"
									value={trendChartType}
									onChange={setTrendChartType}
								/>
							</div>
						</CardHeader>
						<CardContent>
							{trendData.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No trend data available for the selected filters.
								</p>
							) : (
								<InsightMetricChart
									data={trendData}
									chartType={trendChartType}
									xKey="label"
									yKey="average"
									yLabel="Average Grade"
									color="hsl(213, 94%, 58%)"
									xTickFormatter={(value) => formatAxisLabel(value, 16)}
								/>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
