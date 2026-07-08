'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
	buildClassAverages, // new
	buildGradeBandData,
	buildPassFailData,
	buildPeriodTrend,
	buildSemesterTrend,
	buildTopPerformerRows,
	computeSemesterAverageFromGrades, // new
	filterGradesByPeriodAndSemester,
	formatAxisLabel,
	getOrderedClassIds, // new
	normalizeNumericGrades,
	type ChartType,
	type RawGradeRecord,
	type TopPerformerScope,
} from '@/components/dashboard/insightAnalytics';

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

const PIE_CHART_CLASS = 'h-[220px] sm:h-[270px] w-full aspect-auto';

const fadeVariant = {
	hidden: { opacity: 0, y: 10 },
	show: { opacity: 1, y: 0 },
};

const getAverage = (values: number[]) => {
	if (values.length === 0) return 0;
	return Number(
		(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
	);
};

export default function AdminPerformance({
	schoolProfile,
	selectedYear,
}: AdminPerformanceProps) {
	const [grades, setGrades] = useState<GradeItem[]>([]);
	const [selectedPeriod, setSelectedPeriod] = useState('all');
	const [selectedSemester, setSelectedSemester] = useState('all');
	const [overviewChartType, setOverviewChartType] = useState<ChartType>('column');
	const [topChartType, setTopChartType] = useState<ChartType>('column');
	const [trendChartType, setTrendChartType] = useState<ChartType>('column');
	const [trendView, setTrendView] = useState<'period' | 'semester'>('period');
	const [topScope, setTopScope] = useState<TopPerformerScope>('subject');
	const [topLimit, setTopLimit] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const gradesByAcademicYear = useSchoolStore((state) => state.gradesByAcademicYear);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);

	useEffect(() => {
		setSelectedPeriod('all');
		setSelectedSemester('all');
	}, [selectedYear]);

	useEffect(() => {
		if (selectedSemester !== 'all') {
			setSelectedPeriod('all');
		}
	}, [selectedSemester]);

	useEffect(() => {
		if (selectedPeriod !== 'all') {
			setSelectedSemester('all');
		}
	}, [selectedPeriod]);

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
					throw new Error(payload?.message || 'Failed to load grade analytics.');
				}
				const data = payload?.data?.grades || payload?.data?.report?.grades || [];
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
	const filteredGrades = useMemo(
		() =>
			filterGradesByPeriodAndSemester(
				numericGrades,
				selectedPeriod,
				selectedSemester,
			),
		[numericGrades, selectedPeriod, selectedSemester],
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

	const periodTrend = useMemo(() => buildPeriodTrend(numericGrades), [numericGrades]);
	const semesterTrend = useMemo(
		() => buildSemesterTrend(numericGrades),
		[numericGrades],
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
				classLabel: entry.classLabel,
				records: entry.count,
			})),
		[topRows, topScope],
	);

const averageGrade = useMemo(() => {
	if (selectedSemester === 'first' || selectedSemester === 'second') {
		return computeSemesterAverageFromGrades(numericGrades, selectedSemester);
	}
	return getAverage(filteredGrades.map((grade) => grade.grade));
}, [filteredGrades, numericGrades, selectedSemester]);

	
	const passCount = passFailData.find((entry) => entry.label === 'Pass')?.value || 0;
	const totalRecords = filteredGrades.length;
	const passRate = totalRecords > 0 ? Math.round((passCount / totalRecords) * 100) : 0;
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

	return (
		<div className="space-y-6">
			<Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-indigo-50/60 via-background to-sky-50/60 dark:from-indigo-950/20 dark:via-background dark:to-sky-950/20">
				<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<CardTitle>Performance Intelligence</CardTitle>
						<p className="text-sm text-muted-foreground">
							Deep analytics for {selectedYear || 'selected year'}.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
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
									<p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
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

				<TabsContent value="overview" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Class and Subject Averages</CardTitle>
								<p className="text-sm text-muted-foreground">
									Compare performance across classes and subjects.
								</p>
							</div>
							<InsightChartTypeSelect
								label="Graph Type"
								value={overviewChartType}
								onChange={setOverviewChartType}
							/>
						</CardHeader>
						<CardContent>
							{classAverages.length === 0 && subjectAverages.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No performance data available.
								</p>
							) : (
								<div className="grid gap-6 lg:grid-cols-2">
									<InsightMetricChart
										data={classAverages}
										chartType={overviewChartType}
										xKey="label"
										yKey="average"
										yLabel="Average Grade"
										color="hsl(206, 88%, 53%)"
										xTickFormatter={(value) => formatAxisLabel(value, 14)}
									/>
									<InsightMetricChart
										data={subjectAverages}
										chartType={overviewChartType}
										xKey="label"
										yKey="average"
										yLabel="Average Grade"
										color="hsl(270, 83%, 58%)"
										xTickFormatter={(value) => formatAxisLabel(value, 14)}
									/>
								</div>
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
										<ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
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
												<Cell key={entry.label} fill={`var(--color-${entry.label})`} />
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
										<ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
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
												<Cell key={entry.label} fill={`var(--color-${entry.key})`} />
											))}
										</Pie>
									</PieChart>
								</ChartContainer>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="performers" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Top X Performers</CardTitle>
								<p className="text-sm text-muted-foreground">
									Rank by subject, class, period, semester, or yearly.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									Scope
									<select
										className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
										value={topScope}
										onChange={(event) =>
											setTopScope(event.target.value as TopPerformerScope)
										}
									>
										<option value="subject">By Subject</option>
										<option value="class">By Class</option>
										<option value="period">By Period</option>
										<option value="semester">By Semester</option>
										<option value="yearly">Yearly Overall</option>
									</select>
								</div>
								<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									Top X
									<select
										className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
										value={String(topLimit)}
										onChange={(event) => setTopLimit(Number(event.target.value))}
									>
										<option value="1">Top 1</option>
										<option value="2">Top 2</option>
										<option value="3">Top 3</option>
										<option value="4">Top 4</option>
										<option value="5">Top 5</option>
									</select>
								</div>
								<InsightChartTypeSelect
									label="Graph Type"
									value={topChartType}
									onChange={setTopChartType}
								/>
							</div>
						</CardHeader>
						<CardContent className="space-y-5">
							{topRows.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No performer data available.
								</p>
							) : (
								<>
									<InsightMetricChart
										data={topChartData}
										chartType={topChartType}
										xKey="label"
										yKey="average"
										yLabel="Average Grade"
										color="hsl(275, 84%, 60%)"
										xTickFormatter={(value) => formatAxisLabel(value, 12)}
									/>
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
												{topRows.map((entry) => (
													<tr key={entry.key} className="border-t border-border/70">
														<td className="px-4 py-3">{entry.scopeLabel}</td>
														<td className="px-4 py-3 font-medium">{entry.studentName}</td>
														<td className="px-4 py-3">{entry.classLabel || '—'}</td>
														<td className="px-4 py-3">{entry.studentId || '—'}</td>
														<td className="px-4 py-3">{entry.average.toFixed(1)}</td>
														<td className="px-4 py-3">{entry.count}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>

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
								<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									Trend View
									<select
										className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
										value={trendView}
										onChange={(event) =>
											setTrendView(event.target.value as 'period' | 'semester')
										}
									>
										<option value="period">By period</option>
										<option value="semester">By semester</option>
									</select>
								</div>
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
									No trend data available.
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
