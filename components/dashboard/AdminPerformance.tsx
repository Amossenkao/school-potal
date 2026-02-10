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
import { getClassNameById } from '@/components/dashboard/academicYear';

const PASS_MARK = 70;

type GradeItem = {
	grade?: number;
	classId?: string;
	subject?: string;
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
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	useEffect(() => {
		if (!selectedYear) return;
		const controller = new AbortController();

		const fetchGrades = async () => {
			try {
				setIsLoading(true);
				setErrorMessage('');
				const response = await fetch(
					`/api/grades?academicYear=${encodeURIComponent(selectedYear)}`,
					{ signal: controller.signal },
				);
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
	}, [selectedYear]);

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

	const classAverages = useMemo(() => {
		const map = new Map<string, number[]>();
		numericGrades.forEach((item) => {
			const classId = item.classId || 'Unknown';
			if (!map.has(classId)) map.set(classId, []);
			map.get(classId)!.push(item.grade as number);
		});
		return Array.from(map.entries()).map(([classId, values]) => ({
			className: getClassNameById(schoolProfile, classId),
			average: Number(
				(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
			),
		}));
	}, [numericGrades, schoolProfile]);

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

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Performance Overview</CardTitle>
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
				<Card>
					<CardHeader>
						<CardTitle>Average by Class</CardTitle>
					</CardHeader>
					<CardContent>
						{classAverages.length === 0 ? (
							<p className="text-sm text-muted-foreground">No data.</p>
						) : (
							<ChartContainer
								config={{
									average: { label: 'Average', color: 'hsl(221, 83%, 53%)' },
								}}
								className="h-[260px]"
							>
								<BarChart data={classAverages}>
									<CartesianGrid vertical={false} strokeDasharray="3 3" />
									<XAxis dataKey="className" tickLine={false} axisLine={false} />
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
							className="h-[260px]"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
								<Pie
									data={passFailData}
									dataKey="value"
									nameKey="label"
									innerRadius={60}
									outerRadius={90}
									stroke="transparent"
								>
									{passFailData.map((item) => (
										<Cell key={item.label} fill={`var(--color-${item.label})`} />
									))}
								</Pie>
								<ChartLegend
									content={<ChartLegendContent nameKey="label" />}
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
							className="h-[260px]"
						>
							<BarChart data={subjectAverages}>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis dataKey="subject" tickLine={false} axisLine={false} />
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