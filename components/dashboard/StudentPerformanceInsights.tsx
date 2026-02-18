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
import { buildAcademicYearOptions } from '@/components/dashboard/academicYear';
import { useSchoolStore } from '@/store/schoolStore';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	getStudentAcademicYears,
	pickMostRecentAcademicYear,
} from '@/utils/academicYearOptions';

const PASS_MARK = 70;
const BAR_CHART_CLASS = 'h-[240px] sm:h-[280px] w-full aspect-auto';
const PIE_CHART_CLASS = 'h-[220px] sm:h-[260px] w-full aspect-auto';

type GradeItem = {
	grade?: number;
	subject?: string;
	status?: string;
};

type StudentPerformanceInsightsProps = {
	schoolProfile: SchoolProfile;
	user: {
		role?: string;
		studentId?: string;
		academicYears?: { year?: string | null }[];
	};
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
	const [selectedYear, setSelectedYear] = useState(
		defaultAcademicYear,
	);
	const [grades, setGrades] = useState<GradeItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const gradesByAcademicYear = useSchoolStore(
		(state) => state.gradesByAcademicYear
	);
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
		if (!selectedYear) return;
		const controller = new AbortController();

		const fetchGrades = async () => {
			try {
				setIsLoading(true);
				setErrorMessage('');
				const storeGrades = getScopedAcademicYearValue(
					gradesByAcademicYear,
					selectedYear,
				).value;
				if (Array.isArray(storeGrades)) {
					setGrades(storeGrades as GradeItem[]);
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
				setGrades(Array.isArray(data) ? data : []);
				if (Array.isArray(data)) {
					setGradesForYear(selectedYear, data);
				}
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
	}, [selectedYear, gradesByAcademicYear, setGradesForYear]);

	const numericGrades = useMemo(
		() => grades.filter((item) => typeof item.grade === 'number'),
		[grades],
	);

	const averageGrade = useMemo(() => {
		if (numericGrades.length === 0) return 0;
		const total = numericGrades.reduce(
			(sum, item) => sum + (item.grade as number),
			0,
		);
		return Number((total / numericGrades.length).toFixed(1));
	}, [numericGrades]);

	const passCount = numericGrades.filter(
		(item) => (item.grade as number) >= PASS_MARK,
	).length;
	const failCount = numericGrades.length - passCount;
	const passRate = numericGrades.length
		? Math.round((passCount / numericGrades.length) * 100)
		: 0;

	const subjectAverages = useMemo(() => {
		const map = new Map<string, number[]>();
		numericGrades.forEach((item) => {
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
	}, [numericGrades]);

	const passFailData = [
		{ label: 'Pass', value: passCount },
		{ label: 'Fail', value: failCount },
	];

	const formatAxisLabel = (value: string) =>
		value.length > 12 ? `${value.slice(0, 12)}…` : value;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<CardTitle>My Performance</CardTitle>
						<p className="text-sm text-muted-foreground">
							Academic year: {selectedYear || 'N/A'}
						</p>
					</div>
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
								<p className="text-xs text-muted-foreground">Pass Rate</p>
								<p className="text-2xl font-semibold">{passRate}%</p>
							</div>
							<div className="rounded-lg border border-border p-4">
								<p className="text-xs text-muted-foreground">Subjects Graded</p>
								<p className="text-2xl font-semibold">
									{subjectAverages.length}
								</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Average by Subject</CardTitle>
					</CardHeader>
					<CardContent>
						{subjectAverages.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No grades available.
							</p>
						) : (
							<ChartContainer
								config={{
									average: { label: 'Average', color: 'hsl(221, 83%, 53%)' },
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
		</div>
	);
}
