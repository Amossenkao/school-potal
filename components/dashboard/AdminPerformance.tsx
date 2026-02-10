'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { SchoolProfile } from '@/types/schoolProfile';
import {
	getClassLevelLabel,
	getClassNameById,
} from '@/components/dashboard/academicYear';

const PASS_MARK = 70;
const ALL_PERIODS = [
	'first',
	'second',
	'third',
	'third_period_exam',
	'fourth',
	'fifth',
	'sixth',
	'sixth_period_exam',
];
const PERIOD_LABELS: Record<string, string> = {
	first: '1st Period',
	second: '2nd Period',
	third: '3rd Period',
	third_period_exam: '3rd Period Exam',
	fourth: '4th Period',
	fifth: '5th Period',
	sixth: '6th Period',
	sixth_period_exam: '6th Period Exam',
};
const SEMESTER_PERIODS: Record<string, string[]> = {
	first: ['first', 'second', 'third', 'third_period_exam'],
	second: ['fourth', 'fifth', 'sixth', 'sixth_period_exam'],
};
const BAR_CHART_CLASS = 'h-[240px] sm:h-[280px] w-full aspect-auto';
const PIE_CHART_CLASS = 'h-[220px] sm:h-[260px] w-full aspect-auto';

type GradeItem = {
	grade?: number;
	classId?: string;
	subject?: string;
	period?: string;
};

type AdminPerformanceProps = {
	schoolProfile: SchoolProfile;
	selectedYear: string;
};

export default function AdminPerformance({
	schoolProfile,
	selectedYear,
}: AdminPerformanceProps) {
	const [grades, setGrades] = useState<GradeItem[]>([]);
	const [selectedPeriod, setSelectedPeriod] = useState('all');
	const [selectedSemester, setSelectedSemester] = useState('all');
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	useEffect(() => {
		if (!selectedYear) return;
		const controller = new AbortController();

		const fetchGrades = async () => {
			try {
				setIsLoading(true);
				setErrorMessage('');
				let url = `/api/grades?academicYear=${encodeURIComponent(selectedYear)}`;
				if (selectedSemester === 'all' && selectedPeriod !== 'all') {
					url += `&period=${encodeURIComponent(selectedPeriod)}`;
				}
				const response = await fetch(url, { signal: controller.signal });
				const payload = await response.json();
				if (!response.ok || !payload?.success) {
					throw new Error(payload?.message || 'Failed to load performance data.');
				}
				const data =
					payload?.data?.report?.grades || payload?.data?.grades || [];
				setGrades(Array.isArray(data) ? data : []);
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
	}, [selectedYear, selectedPeriod, selectedSemester]);

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

	const periodOptions = useMemo(() => {
		return ALL_PERIODS.map((value) => ({
			value,
			label: PERIOD_LABELS[value] || value,
		}));
	}, []);

	const numericGrades = useMemo(
		() => grades.filter((item) => typeof item.grade === 'number'),
		[grades],
	);

	const filteredGrades = useMemo(() => {
		if (selectedSemester !== 'all') {
			const periods = SEMESTER_PERIODS[selectedSemester] || [];
			return numericGrades.filter(
				(item) => item.period && periods.includes(item.period),
			);
		}
		if (selectedPeriod !== 'all') {
			return numericGrades.filter((item) => item.period === selectedPeriod);
		}
		return numericGrades;
	}, [numericGrades, selectedSemester, selectedPeriod]);

	const averageGrade = useMemo(() => {
		if (filteredGrades.length === 0) return 0;
		const total = filteredGrades.reduce(
			(sum, item) => sum + (item.grade as number),
			0,
		);
		return Number((total / filteredGrades.length).toFixed(1));
	}, [filteredGrades]);

	const passCount = filteredGrades.filter(
		(item) => (item.grade as number) >= PASS_MARK,
	).length;
	const failCount = filteredGrades.length - passCount;

	const classAverages = useMemo(() => {
		const map = new Map<string, number[]>();
		filteredGrades.forEach((item) => {
			const classId = item.classId || 'Unknown';
			if (!map.has(classId)) map.set(classId, []);
			map.get(classId)!.push(item.grade as number);
		});
		return Array.from(map.entries()).map(([classId, values]) => ({
			classId,
			className: getClassNameById(schoolProfile, classId),
			average: Number(
				(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
			),
		}));
	}, [filteredGrades, schoolProfile]);

	const classLevels = useMemo(() => {
		const grouped = new Map<
			string,
			{ levelLabel: string; classes: { className: string; average: number }[] }
		>();
		classAverages.forEach((item) => {
			const levelLabel =
				getClassLevelLabel(schoolProfile, item.classId) || 'Other';
			if (!grouped.has(levelLabel)) {
				grouped.set(levelLabel, { levelLabel, classes: [] });
			}
			grouped.get(levelLabel)!.classes.push({
				className: item.className,
				average: item.average,
			});
		});
		return Array.from(grouped.values()).map((entry) => ({
			...entry,
			classes: entry.classes.sort((a, b) =>
				a.className.localeCompare(b.className),
			),
		}));
	}, [classAverages, schoolProfile]);

	const subjectAverages = useMemo(() => {
		const map = new Map<string, number[]>();
		filteredGrades.forEach((item) => {
			const subject = item.subject || 'Unknown';
			if (!map.has(subject)) map.set(subject, []);
			map.get(subject)!.push(item.grade as number);
		});
		return Array.from(map.entries()).map(([subject, values]) => ({
			subject,
			average: Number(
				(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
			),
		}));
	}, [filteredGrades]);

	const passFailData = [
		{ label: 'Pass', value: passCount },
		{ label: 'Fail', value: failCount },
	];

	const activeFilterLabel = useMemo(() => {
		if (selectedSemester === 'first') return '1st Semester';
		if (selectedSemester === 'second') return '2nd Semester';
		if (selectedPeriod !== 'all') {
			return PERIOD_LABELS[selectedPeriod] || selectedPeriod;
		}
		return 'All periods';
	}, [selectedSemester, selectedPeriod]);

	const formatAxisLabel = (value: string) =>
		value.length > 12 ? `${value.slice(0, 12)}…` : value;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<CardTitle>Performance Overview</CardTitle>
						<p className="text-sm text-muted-foreground">
							Filter: {activeFilterLabel}
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
								<option value="first">1st Semester</option>
								<option value="second">2nd Semester</option>
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
						<div className="grid gap-4 sm:grid-cols-3">
							<div className="rounded-lg border border-border p-4">
								<p className="text-xs text-muted-foreground">Average Grade</p>
								<p className="text-2xl font-semibold">{averageGrade}</p>
							</div>
							<div className="rounded-lg border border-border p-4">
								<p className="text-xs text-muted-foreground">Passes</p>
								<p className="text-2xl font-semibold">{passCount}</p>
							</div>
							<div className="rounded-lg border border-border p-4">
								<p className="text-xs text-muted-foreground">Fails</p>
								<p className="text-2xl font-semibold">{failCount}</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-3">
					<div>
						<h3 className="text-sm font-semibold text-foreground">
							Average by Class Level
						</h3>
						<p className="text-xs text-muted-foreground">
							Grouped by level for easier viewing on mobile.
						</p>
					</div>
					{classLevels.length === 0 ? (
						<p className="text-sm text-muted-foreground">No data.</p>
					) : (
						<div className="grid gap-4 sm:grid-cols-2">
							{classLevels.map((group) => (
								<Card key={group.levelLabel}>
									<CardHeader>
										<CardTitle className="text-sm">
											{group.levelLabel}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<ChartContainer
											config={{
												average: {
													label: 'Average',
													color: 'hsl(221, 83%, 53%)',
												},
											}}
											className={BAR_CHART_CLASS}
										>
											<BarChart
												data={group.classes}
												margin={{ top: 8, right: 12, left: 0, bottom: 24 }}
											>
												<CartesianGrid vertical={false} strokeDasharray="3 3" />
												<XAxis
													dataKey="className"
													tickLine={false}
													axisLine={false}
													interval="preserveStartEnd"
													minTickGap={8}
													angle={-25}
													textAnchor="end"
													height={48}
													tick={{ fontSize: 12 }}
													tickFormatter={formatAxisLabel}
												/>
												<YAxis tickLine={false} axisLine={false} width={30} />
												<ChartTooltip content={<ChartTooltipContent />} />
												<Bar
													dataKey="average"
													fill="var(--color-average)"
													radius={[6, 6, 0, 0]}
												/>
											</BarChart>
										</ChartContainer>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Pass vs Fail</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
						config={{
							Pass: { label: 'Pass', color: 'hsl(142, 70%, 45%)' },
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
								innerRadius={50}
								outerRadius={82}
								stroke="transparent"
							>
									{passFailData.map((item) => (
										<Cell key={item.label} fill={`var(--color-${item.label})`} />
									))}
								</Pie>
								<ChartLegend
									content={
										<ChartLegendContent nameKey="label" className="flex-wrap" />
									}
									verticalAlign="bottom"
								/>
							</PieChart>
						</ChartContainer>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Average by Subject</CardTitle>
				</CardHeader>
				<CardContent>
					{subjectAverages.length === 0 ? (
						<p className="text-sm text-muted-foreground">No data.</p>
					) : (
						<ChartContainer
							config={{
								average: { label: 'Average', color: 'hsl(262, 80%, 60%)' },
							}}
							className={BAR_CHART_CLASS}
						>
							<BarChart
								data={subjectAverages}
								margin={{ top: 8, right: 12, left: 0, bottom: 24 }}
							>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="subject"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
									minTickGap={8}
									angle={-25}
									textAnchor="end"
									height={48}
									tick={{ fontSize: 12 }}
									tickFormatter={formatAxisLabel}
								/>
								<YAxis tickLine={false} axisLine={false} width={30} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="average"
									fill="var(--color-average)"
									radius={[6, 6, 0, 0]}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
