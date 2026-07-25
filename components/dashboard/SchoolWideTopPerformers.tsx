'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClassNameById } from '@/components/dashboard/academicYear';
import {
	ALL_PERIODS,
	PERIOD_LABELS,
	SEMESTER_LABELS,
	buildClassSessionMap,
	buildTopPerformerRows,
	filterGradesByPeriodAndSemester,
	getSessionNames,
	normalizeNumericGrades,
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

type SchoolWideTopPerformersProps = {
	schoolProfile: SchoolProfile;
	grades: GradeItem[];
};

export default function SchoolWideTopPerformers({
	schoolProfile,
	grades,
}: SchoolWideTopPerformersProps) {
	const [selectedScope, setSelectedScope] = useState<TopPerformerScope>('yearly');
	const [selectedPeriod, setSelectedPeriod] = useState('all');
	const [selectedSemester, setSelectedSemester] = useState('all');
	const [topLimit, setTopLimit] = useState(10);

	const sessionNames = useMemo(() => getSessionNames(schoolProfile), [schoolProfile]);
	const classSessionMap = useMemo(() => buildClassSessionMap(schoolProfile), [schoolProfile]);
	const hasMultipleSessions = sessionNames.length > 1;
	const [selectedSession, setSelectedSession] = useState(() => sessionNames[0] ?? '');

	const periodOptions = useMemo(
		() =>
			ALL_PERIODS.map((period: string) => ({
				value: period,
				label: PERIOD_LABELS[period] || period,
			})),
		[],
	);

	const numericGrades = useMemo(
		() => normalizeNumericGrades(grades as RawGradeRecord[]),
		[grades],
	);

	const sessionFilteredGrades = useMemo(
		() =>
			selectedSession
				? numericGrades.filter((g) => classSessionMap.get(g.classId) === selectedSession)
				: numericGrades,
		[numericGrades, selectedSession, classSessionMap],
	);

	const filteredGrades = useMemo(
		() => filterGradesByPeriodAndSemester(sessionFilteredGrades, selectedPeriod, selectedSemester),
		[sessionFilteredGrades, selectedPeriod, selectedSemester],
	);

	const topRows = useMemo(
		() =>
			buildTopPerformerRows(filteredGrades, {
				scope: 'yearly',
				limit: topLimit,
				resolveClassLabel: (classId) => getClassNameById(schoolProfile, classId),
			}),
		[filteredGrades, topLimit, schoolProfile],
	);

	const maxAverage = useMemo(
		() => Math.max(...topRows.map((r) => r.average), 1),
		[topRows],
	);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<CardTitle>School-Wide Top Performers</CardTitle>
					<p className="text-sm text-muted-foreground">
						Top {topLimit} students across all classes.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					{hasMultipleSessions && (
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Session
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedSession}
								onChange={(e) => setSelectedSession(e.target.value)}
							>
								<option value="">All sessions</option>
								{sessionNames.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
					)}
					<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
						Period
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={selectedPeriod}
							onChange={(e) => {
								setSelectedPeriod(e.target.value);
								if (e.target.value !== 'all') setSelectedSemester('all');
							}}
						>
							<option value="all">All periods</option>
							{periodOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
						Semester
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={selectedSemester}
							onChange={(e) => {
								setSelectedSemester(e.target.value);
								if (e.target.value !== 'all') setSelectedPeriod('all');
							}}
							disabled={selectedPeriod !== 'all'}
						>
							<option value="all">All semesters</option>
							<option value="first">{SEMESTER_LABELS.first}</option>
							<option value="second">{SEMESTER_LABELS.second}</option>
						</select>
					</div>
					<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
						Top X
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={topLimit}
							onChange={(e) => setTopLimit(Number(e.target.value))}
						>
							<option value={5}>Top 5</option>
							<option value={10}>Top 10</option>
							<option value={20}>Top 20</option>
						</select>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{topRows.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No performer data available for the selected filters.
					</p>
				) : (
					<>
						{/* Horizontal bar visualization */}
						<div className="space-y-3">
							{topRows.slice(0, Math.min(topLimit, 10)).map((row, idx) => {
								const barWidth = (row.average / maxAverage) * 100;
								return (
									<motion.div
										key={row.studentId}
										initial={{ opacity: 0, x: -12 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ duration: 0.25, delay: idx * 0.03 }}
										className="flex items-center gap-3"
									>
										<span className="w-6 text-right text-xs font-semibold text-muted-foreground">
											{idx + 1}
										</span>
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-baseline justify-between gap-2">
												<span className="truncate text-sm font-medium text-foreground">
													{row.studentName}
												</span>
												<span className="shrink-0 text-xs text-muted-foreground">
													{row.classLabel}
												</span>
											</div>
											<div className="relative h-5 w-full overflow-hidden rounded-full bg-muted">
												<motion.div
													initial={{ width: 0 }}
													animate={{ width: `${barWidth}%` }}
													transition={{ duration: 0.6, delay: idx * 0.03 }}
													className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
												/>
												<span className="relative z-10 flex h-full items-center px-2 text-[11px] font-semibold text-primary-foreground">
													{row.average.toFixed(1)}
												</span>
											</div>
										</div>
									</motion.div>
								);
							})}
						</div>

						{/* Detailed table */}
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-12">#</TableHead>
										<TableHead>Student</TableHead>
										<TableHead>Class</TableHead>
										<TableHead className="text-right">Average</TableHead>
										<TableHead className="text-right">Records</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{topRows.map((row, idx) => (
										<TableRow key={row.studentId}>
											<TableCell className="font-medium text-muted-foreground">
												{idx + 1}
											</TableCell>
											<TableCell className="font-medium">
												{row.studentName}
											</TableCell>
											<TableCell>{row.classLabel}</TableCell>
											<TableCell className="text-right font-semibold">
												{row.average.toFixed(1)}
											</TableCell>
											<TableCell className="text-right text-muted-foreground">
												{row.count}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
