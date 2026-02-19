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
	buildSchoolAcademicYearRange,
	filterAcademicYearsByAllowed,
	getTeacherAcademicYears,
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
	buildTopPerformerRows,
	filterGradesByPeriodAndSemester,
	formatAxisLabel,
	normalizeNumericGrades,
	type ChartType,
	type RawGradeRecord,
	type TopPerformerScope,
} from '@/components/dashboard/insightAnalytics';

type GradeItem = {
	grade?: number | string | null;
	subject?: string | null;
	classId?: string | null;
	period?: string | null;
	status?: string | null;
	studentId?: string | null;
	studentName?: string | null;
	academicYear?: string | null;
};

type TeacherPerformanceInsightsProps = {
	schoolProfile: SchoolProfile;
	user: {
		subjects?: { year: string; classes: { classId: string; subjects: string[] }[] }[];
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

export default function TeacherPerformanceInsights({
	schoolProfile,
	user,
}: TeacherPerformanceInsightsProps) {
	const teacherYears = useMemo(() => getTeacherAcademicYears(user), [user]);
	const academicYearOptions = useMemo(() => {
		const schoolYears = buildSchoolAcademicYearRange(schoolProfile);
		if (teacherYears.length === 0) {
			return schoolYears.map((year) => ({ value: year, label: year }));
		}
		const scopedYears = filterAcademicYearsByAllowed(teacherYears, schoolYears);
		const years = scopedYears.length > 0 ? scopedYears : teacherYears;
		return years.map((year) => ({ value: year, label: year }));
	}, [schoolProfile, teacherYears]);
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
	const [selectedClassId, setSelectedClassId] = useState('all');
	const [selectedSubject, setSelectedSubject] = useState('all');
	const [selectedPeriod, setSelectedPeriod] = useState('all');
	const [selectedSemester, setSelectedSemester] = useState('all');
	const [overviewChartType, setOverviewChartType] = useState<ChartType>('column');
	const [trendChartType, setTrendChartType] = useState<ChartType>('line');
	const [topChartType, setTopChartType] = useState<ChartType>('bar');
	const [topScope, setTopScope] = useState<TopPerformerScope>('subject');
	const [topLimit, setTopLimit] = useState(10);
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

	const yearAssignment = useMemo(
		() =>
			user.subjects?.find((entry) =>
				areAcademicYearsEqual(entry.year, selectedYear),
			),
		[user.subjects, selectedYear],
	);

	const classOptions = useMemo(() => {
		const seen = new Set<string>();
		return (yearAssignment?.classes || [])
			.map((entry) => {
				const classId = entry.classId;
				if (!classId || seen.has(classId)) return null;
				seen.add(classId);
				return {
					value: classId,
					label: getClassNameById(schoolProfile, classId),
					subjects: Array.from(new Set(entry.subjects || [])),
				};
			})
			.filter(
				(entry): entry is { value: string; label: string; subjects: string[] } =>
					Boolean(entry),
			);
	}, [yearAssignment, schoolProfile]);

	const teacherClassIds = useMemo(
		() => classOptions.map((option) => option.value),
		[classOptions],
	);

	const subjectOptions = useMemo(() => {
		if (selectedClassId === 'all') {
			const allSubjects = classOptions.flatMap((entry) => entry.subjects);
			return Array.from(new Set(allSubjects)).sort((left, right) =>
				left.localeCompare(right),
			);
		}
		return (
			classOptions.find((entry) => entry.value === selectedClassId)?.subjects || []
		).sort((left, right) => left.localeCompare(right));
	}, [classOptions, selectedClassId]);

	useEffect(() => {
		if (classOptions.length === 0) {
			setSelectedClassId('all');
			return;
		}
		if (
			selectedClassId !== 'all' &&
			!classOptions.some((entry) => entry.value === selectedClassId)
		) {
			setSelectedClassId('all');
		}
	}, [classOptions, selectedClassId]);

	useEffect(() => {
		if (selectedSubject !== 'all' && !subjectOptions.includes(selectedSubject)) {
			setSelectedSubject('all');
		}
	}, [selectedSubject, subjectOptions]);

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
		if (teacherClassIds.length === 0) {
			setGrades([]);
			setIsLoading(false);
			setErrorMessage('');
			return;
		}
		const controller = new AbortController();
		const allowedClassIds = new Set(teacherClassIds);

		const constrainTeacherRecords = (records: GradeItem[]) =>
			records.filter((record) => {
				if (
					record.academicYear &&
					!areAcademicYearsEqual(record.academicYear, selectedYear)
				) {
					return false;
				}
				const classId = String(record.classId || '').trim();
				if (allowedClassIds.size > 0 && classId && !allowedClassIds.has(classId)) {
					return false;
				}
				if (selectedClassId !== 'all' && classId !== selectedClassId) {
					return false;
				}
				if (selectedSubject !== 'all') {
					const subject = String(record.subject || '').trim();
					if (subject !== selectedSubject) return false;
				}
				return true;
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
					setGrades(constrainTeacherRecords(storeGrades as GradeItem[]));
					return;
				}

				let url = `/api/grades?academicYear=${encodeURIComponent(selectedYear)}`;
				if (selectedClassId !== 'all') {
					url += `&classId=${encodeURIComponent(selectedClassId)}`;
				}
				if (selectedSubject !== 'all') {
					url += `&subject=${encodeURIComponent(selectedSubject)}`;
				}
				const response = await fetch(url, { signal: controller.signal });
				const payload = await response.json();
				if (!response.ok || !payload?.success) {
					throw new Error(payload?.message || 'Failed to load grade analytics.');
				}

				const data = payload?.data?.grades || payload?.data?.report?.grades || [];
				const safeData = Array.isArray(data) ? (data as GradeItem[]) : [];
				setGrades(constrainTeacherRecords(safeData));
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
	}, [
		selectedYear,
		selectedClassId,
		selectedSubject,
		teacherClassIds,
		gradesByAcademicYear,
		setGradesForYear,
	]);

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

	const periodTrend = useMemo(() => buildPeriodTrend(numericGrades), [numericGrades]);
	const semesterTrend = useMemo(
		() => buildSemesterTrend(numericGrades),
		[numericGrades],
	);
	const trendData = trendView === 'period' ? periodTrend : semesterTrend;

	const subjectAverages = useMemo(
		() => buildAverageByDimension(filteredGrades, (grade) => grade.subject),
		[filteredGrades],
	);
	const classAverages = useMemo(
		() =>
			buildAverageByDimension(filteredGrades, (grade) =>
				getClassNameById(schoolProfile, grade.classId || ''),
			),
		[filteredGrades, schoolProfile],
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

	const averageGrade = useMemo(
		() => getAverage(filteredGrades.map((grade) => grade.grade)),
		[filteredGrades],
	);
	const passCount = passFailData.find((entry) => entry.label === 'Pass')?.value || 0;
	const totalRecords = filteredGrades.length;
	const passRate = totalRecords > 0 ? Math.round((passCount / totalRecords) * 100) : 0;

	const topRows = useMemo(
		() =>
			buildTopPerformerRows(filteredGrades, {
				scope: topScope,
				limit: topLimit,
				resolveClassLabel: (classId) => getClassNameById(schoolProfile, classId),
			}),
		[filteredGrades, topScope, topLimit, schoolProfile],
	);

	const topChartData = useMemo(
		() =>
			topRows.map((entry) => ({
				label:
					entry.studentName.length > 18
						? `${entry.studentName.slice(0, 18)}…`
						: entry.studentName,
				average: entry.average,
				scopeLabel: entry.scopeLabel,
				records: entry.count,
			})),
		[topRows],
	);

	const trendAverage = useMemo(
		() => getAverage(trendData.map((entry) => entry.average)),
		[trendData],
	);

	const periodOptions = useMemo(() => {
		const configured =
			schoolProfile.settings?.teacherSettings?.gradeSubmissionPeriods || [];
		const source = configured.length > 0 ? configured : [...ALL_PERIODS];
		return source.map((period) => ({
			value: period,
			label: PERIOD_LABELS[period] || period,
		}));
	}, [schoolProfile]);

	return (
		<div className="space-y-6">
			<Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-emerald-50/60 via-background to-sky-50/60 dark:from-emerald-950/20 dark:via-background dark:to-sky-950/20">
				<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<CardTitle>Teaching Performance Lab</CardTitle>
						<p className="text-sm text-muted-foreground">
							Analyze class outcomes and identify top performers by academic year.
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
						{classOptions.length > 1 ? (
							<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
								Class
								<select
									className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
									value={selectedClassId}
									onChange={(event) => setSelectedClassId(event.target.value)}
								>
									<option value="all">All classes</option>
									{classOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						) : null}
						{subjectOptions.length > 1 ? (
							<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
								Subject
								<select
									className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
									value={selectedSubject}
									onChange={(event) => setSelectedSubject(event.target.value)}
								>
									<option value="all">All subjects</option>
									{subjectOptions.map((subject) => (
										<option key={subject} value={subject}>
											{subject}
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
						<p className="text-sm text-muted-foreground">Loading class analytics…</p>
					) : errorMessage ? (
						<p className="text-sm text-red-500">{errorMessage}</p>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{[
								{
									label: 'Average Grade',
									value: averageGrade.toFixed(1),
									helper: `${totalRecords} assessed records`,
								},
								{
									label: 'Pass Rate',
									value: `${passRate}%`,
									helper: `${passCount}/${totalRecords} passing`,
								},
								{
									label: 'Top Subject',
									value: subjectAverages[0]?.label || 'N/A',
									helper: 'Highest class average',
								},
								{
									label: 'Top Class',
									value: classAverages[0]?.label || 'N/A',
									helper: 'Best performing class',
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
					<TabsTrigger value="performance">Top Performers</TabsTrigger>
					<TabsTrigger value="trends">Trends</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Subject and Class Averages</CardTitle>
								<p className="text-sm text-muted-foreground">
									Compare averages with your selected filters.
								</p>
							</div>
							<InsightChartTypeSelect
								label="Graph Type"
								value={overviewChartType}
								onChange={setOverviewChartType}
							/>
						</CardHeader>
						<CardContent className="space-y-6">
							{subjectAverages.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No grade data available.
								</p>
							) : (
								<div className="grid gap-6 lg:grid-cols-2">
									<InsightMetricChart
										data={subjectAverages}
										chartType={overviewChartType}
										xKey="label"
										yKey="average"
										yLabel="Average Grade"
										color="hsl(221, 83%, 53%)"
										xTickFormatter={(value) => formatAxisLabel(value, 14)}
									/>
									<InsightMetricChart
										data={classAverages}
										chartType={overviewChartType}
										xKey="label"
										yKey="average"
										yLabel="Average Grade"
										color="hsl(157, 72%, 40%)"
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

				<TabsContent value="performance" className="space-y-6">
					<Card>
						<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<CardTitle>Top Performers</CardTitle>
								<p className="text-sm text-muted-foreground">
									View top results across subject, class, period, semester, or yearly.
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
										<option value="5">Top 5</option>
										<option value="10">Top 10</option>
										<option value="20">Top 20</option>
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
										color="hsl(266, 83%, 58%)"
										xTickFormatter={(value) => formatAxisLabel(value, 12)}
									/>
									<div className="overflow-x-auto rounded-lg border border-border">
										<table className="min-w-full text-sm">
											<thead className="bg-muted/50">
												<tr className="text-left text-muted-foreground">
													<th className="px-4 py-3">Scope</th>
													<th className="px-4 py-3">Student</th>
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
								<CardTitle>Performance Trend</CardTitle>
								<p className="text-sm text-muted-foreground">
									Average trend: {trendAverage.toFixed(1)}
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
									color="hsl(212, 91%, 54%)"
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
