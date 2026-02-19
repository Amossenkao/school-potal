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
import { buildAcademicYearOptions } from '@/components/dashboard/academicYear';
import InsightMetricChart from '@/components/dashboard/InsightMetricChart';
import InsightChartTypeSelect from '@/components/dashboard/InsightChartTypeSelect';
import { useSchoolStore } from '@/store/schoolStore';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	getStudentAcademicYears,
	pickMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import {
	ALL_PERIODS,
	PERIOD_LABELS,
	SEMESTER_LABELS,
	buildAverageByDimension,
	buildGradeBandData,
	buildPassFailData,
	buildPeriodTrend,
	buildSemesterTrend,
	filterGradesByPeriodAndSemester,
	formatAxisLabel,
	normalizeNumericGrades,
	type ChartType,
	type RawGradeRecord,
} from '@/components/dashboard/insightAnalytics';

type GradeItem = {
	grade?: number | string | null;
	subject?: string | null;
	period?: string | null;
	status?: string | null;
	classId?: string | null;
	studentId?: string | null;
	studentName?: string | null;
	academicYear?: string | null;
};

type StudentPerformanceInsightsProps = {
	schoolProfile: SchoolProfile;
	user: {
		studentId?: string;
		academicYears?: { year?: string | null }[];
	};
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

export default function StudentPerformanceInsights({
	schoolProfile,
	user,
}: StudentPerformanceInsightsProps) {
	const academicYearOptions = useMemo(() => {
		const studentYears = getStudentAcademicYears(user);
		const schoolYears = buildAcademicYearOptions(schoolProfile).map(
			(option) => option.value,
		);
		const years = studentYears.length > 0 ? studentYears : schoolYears;
		return years.map((year) => ({ value: year, label: year }));
	}, [schoolProfile, user]);
	const currentAcademicYear = schoolProfile.currentAcademicYear || '';
	const defaultAcademicYear = useMemo(
		() =>
			pickMostRecentAcademicYear(
				academicYearOptions.map((option) => option.value),
				currentAcademicYear,
			) || '',
		[academicYearOptions, currentAcademicYear],
	);
	const [selectedYear, setSelectedYear] = useState(defaultAcademicYear);
	const [selectedPeriod, setSelectedPeriod] = useState('all');
	const [selectedSemester, setSelectedSemester] = useState('all');
	const [selectedSubject, setSelectedSubject] = useState('all');
	const [subjectChartType, setSubjectChartType] = useState<ChartType>('column');
	const [trendChartType, setTrendChartType] = useState<ChartType>('line');
	const [trendView, setTrendView] = useState<'period' | 'semester'>('period');
	const [grades, setGrades] = useState<GradeItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const gradesByAcademicYear = useSchoolStore((state) => state.gradesByAcademicYear);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);

	useEffect(() => {
		const selectedIsAvailable = academicYearOptions.some((option) =>
			areAcademicYearsEqual(option.value, selectedYear),
		);
		if (!selectedYear || !selectedIsAvailable) {
			setSelectedYear(defaultAcademicYear);
		}
	}, [academicYearOptions, defaultAcademicYear, selectedYear]);

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
		const normalizedStudentId = String(user?.studentId || '')
			.trim()
			.toLowerCase();

		const constrainStudentRecords = (records: GradeItem[]) =>
			records.filter((record) => {
				if (
					record.academicYear &&
					!areAcademicYearsEqual(record.academicYear, selectedYear)
				) {
					return false;
				}
				if (!normalizedStudentId) return true;
				const recordStudentId = String(record.studentId || '')
					.trim()
					.toLowerCase();
				if (!recordStudentId) return true;
				return recordStudentId === normalizedStudentId;
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
					setGrades(constrainStudentRecords(storeGrades as GradeItem[]));
					return;
				}

				const response = await fetch(
					`/api/grades?academicYear=${encodeURIComponent(selectedYear)}`,
					{ signal: controller.signal, cache: 'no-store' },
				);
				const payload = await response.json();
				if (!response.ok || !payload?.success) {
					throw new Error(payload?.message || 'Failed to load grades.');
				}
				const data = payload?.data?.grades || payload?.data?.report?.grades || [];
				const safeData = Array.isArray(data) ? (data as GradeItem[]) : [];
				setGrades(constrainStudentRecords(safeData));
				setGradesForYear(selectedYear, safeData);
			} catch (error) {
				if ((error as Error).name === 'AbortError') return;
				setErrorMessage(
					(error as Error).message || 'Unable to load performance data.',
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchGrades();
		return () => controller.abort();
	}, [selectedYear, gradesByAcademicYear, setGradesForYear, user?.studentId]);

	const passMark = schoolProfile.settings?.gradingSettings?.passMark || 70;
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

	const subjectAverages = useMemo(
		() => buildAverageByDimension(filteredGrades, (grade) => grade.subject),
		[filteredGrades],
	);

	const subjectOptions = useMemo(
		() => subjectAverages.map((entry) => entry.label),
		[subjectAverages],
	);

	useEffect(() => {
		if (selectedSubject !== 'all' && !subjectOptions.includes(selectedSubject)) {
			setSelectedSubject('all');
		}
	}, [selectedSubject, subjectOptions]);

	const trendSource = useMemo(() => {
		if (selectedSubject === 'all') return numericGrades;
		return numericGrades.filter((grade) => grade.subject === selectedSubject);
	}, [numericGrades, selectedSubject]);

	const periodTrend = useMemo(() => buildPeriodTrend(trendSource), [trendSource]);
	const semesterTrend = useMemo(
		() => buildSemesterTrend(trendSource),
		[trendSource],
	);
	const trendData = trendView === 'period' ? periodTrend : semesterTrend;

	const averageGrade = useMemo(
		() => getAverage(filteredGrades.map((grade) => grade.grade)),
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

	const passCount = passFailData.find((entry) => entry.label === 'Pass')?.value || 0;
	const totalCount = filteredGrades.length;
	const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;
	const strongestSubject = subjectAverages[0]?.label || 'N/A';

	const trendAverage = useMemo(
		() => getAverage(trendData.map((entry) => entry.average)),
		[trendData],
	);

	const periodOptions = ALL_PERIODS.map((period) => ({
		value: period,
		label: PERIOD_LABELS[period],
	}));

	return (
		<div className="space-y-6">
			<Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-blue-50/60 via-background to-cyan-50/60 dark:from-blue-950/20 dark:via-background dark:to-cyan-950/20">
				<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<CardTitle>My Performance Lab</CardTitle>
						<p className="text-sm text-muted-foreground">
							Track results by period, semester, and full academic year.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						{academicYearOptions.length > 1 ? (
							<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
								Academic Year
								<select
									className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
									value={selectedYear}
									onChange={(event) => setSelectedYear(event.target.value)}
								>
									{academicYearOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						) : null}
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
						<p className="text-sm text-muted-foreground">Loading performance…</p>
					) : errorMessage ? (
						<p className="text-sm text-red-500">{errorMessage}</p>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{[
								{
									label: 'Average Grade',
									value: averageGrade.toFixed(1),
									helper: 'Current filter',
								},
								{
									label: 'Pass Rate',
									value: `${passRate}%`,
									helper: `${passCount}/${totalCount} records`,
								},
								{
									label: 'Subjects',
									value: String(subjectAverages.length),
									helper: 'With graded entries',
								},
								{
									label: 'Strongest Subject',
									value: strongestSubject,
									helper: 'Highest average',
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
					<TabsTrigger value="trends">Trends</TabsTrigger>
					<TabsTrigger value="subjects">Subjects</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-6">
					<div className="grid gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Pass vs Fail</CardTitle>
							</CardHeader>
							<CardContent>
								<ChartContainer
									config={{
										Pass: { label: 'Pass', color: 'hsl(142, 72%, 40%)' },
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

				<TabsContent value="trends" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Performance Trend</CardTitle>
								<p className="text-sm text-muted-foreground">
									{selectedSubject === 'all'
										? 'Overall trend'
										: `${selectedSubject} trend`}{' '}
									| Average: {trendAverage.toFixed(1)}
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
								{subjectOptions.length > 1 ? (
									<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
										Subject
										<select
											className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
											value={selectedSubject}
											onChange={(event) => setSelectedSubject(event.target.value)}
										>
											<option value="all">Overall</option>
											{subjectOptions.map((subject) => (
												<option key={subject} value={subject}>
													{subject}
												</option>
											))}
										</select>
									</div>
								) : null}
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
									color="hsl(262, 83%, 58%)"
									xTickFormatter={(value) => formatAxisLabel(value, 16)}
								/>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="subjects" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Subject Performance</CardTitle>
								<p className="text-sm text-muted-foreground">
									Compare subject averages for {selectedYear}.
								</p>
							</div>
							<InsightChartTypeSelect
								label="Graph Type"
								value={subjectChartType}
								onChange={setSubjectChartType}
							/>
						</CardHeader>
						<CardContent>
							{subjectAverages.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No subject data available for this filter.
								</p>
							) : (
								<div className="space-y-4">
									<InsightMetricChart
										data={subjectAverages}
										chartType={subjectChartType}
										xKey="label"
										yKey="average"
										yLabel="Average Grade"
										color="hsl(221, 83%, 53%)"
										xTickFormatter={(value) => formatAxisLabel(value, 14)}
									/>
									<div className="overflow-x-auto rounded-lg border border-border">
										<table className="min-w-full text-sm">
											<thead className="bg-muted/50">
												<tr className="text-left text-muted-foreground">
													<th className="px-4 py-3">Subject</th>
													<th className="px-4 py-3">Average</th>
													<th className="px-4 py-3">Records</th>
												</tr>
											</thead>
											<tbody>
												{subjectAverages.map((entry) => (
													<tr key={entry.label} className="border-t border-border/70">
														<td className="px-4 py-3 font-medium">{entry.label}</td>
														<td className="px-4 py-3">{entry.average.toFixed(1)}</td>
														<td className="px-4 py-3">{entry.count}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
