'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Medal } from 'lucide-react';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClassNameById } from '@/components/dashboard/academicYear';
import {
	ALL_PERIODS,
	PERIOD_LABELS,
	SEMESTER_LABELS,
	buildClassSessionMap,
	buildTopPerformerRows,
	filterGradesByPeriodAndSemester,
	getOrderedClassIds,
	getSessionNames,
	normalizeNumericGrades,
	type NumericGradeRecord,
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

type TopPerformersByClassProps = {
	schoolProfile: SchoolProfile;
	grades: GradeItem[];
};

const CLASS_COLORS = [
	'border-l-blue-500',
	'border-l-amber-500',
	'border-l-emerald-500',
	'border-l-violet-500',
	'border-l-pink-500',
	'border-l-teal-500',
	'border-l-orange-500',
	'border-l-rose-500',
];

const MEDAL_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

export default function TopPerformersByClass({
	schoolProfile,
	grades,
}: TopPerformersByClassProps) {
	const [selectedScope, setSelectedScope] = useState<TopPerformerScope>('yearly');
	const [selectedPeriod, setSelectedPeriod] = useState('all');
	const [selectedSemester, setSelectedSemester] = useState('all');
	const [topLimit, setTopLimit] = useState(3);

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

	const orderedClassIds = useMemo(() => {
		const all = getOrderedClassIds(schoolProfile);
		if (!selectedSession) return all;
		return all.filter((id) => classSessionMap.get(id) === selectedSession);
	}, [schoolProfile, selectedSession, classSessionMap]);

	const topRows = useMemo(
		() =>
			buildTopPerformerRows(filteredGrades, {
				scope: 'class',
				limit: topLimit,
				resolveClassLabel: (classId) => getClassNameById(schoolProfile, classId),
				orderedClassIds,
			}),
		[filteredGrades, topLimit, schoolProfile, orderedClassIds],
	);

	const groupedByClass = useMemo(() => {
		const map = new Map<string, typeof topRows>();
		for (const row of topRows) {
			const classLabel = row.classLabel || 'Unknown Class';
			if (!map.has(classLabel)) map.set(classLabel, []);
			map.get(classLabel)!.push(row);
		}
		return Array.from(map.entries());
	}, [topRows]);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<CardTitle>Top Performers by Class</CardTitle>
					<p className="text-sm text-muted-foreground">
						Top {topLimit} student{topLimit > 1 ? 's' : ''} per class for the
						selected scope.
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
						Scope
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={selectedScope}
							onChange={(e) => setSelectedScope(e.target.value as TopPerformerScope)}
						>
							<option value="yearly">Yearly</option>
							<option value="semester">Semester</option>
							<option value="period">Period</option>
						</select>
					</div>
					{selectedScope === 'period' && (
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Period
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedPeriod}
								onChange={(e) => setSelectedPeriod(e.target.value)}
							>
								<option value="all">All periods</option>
								{periodOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					)}
					{selectedScope === 'semester' && (
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Semester
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedSemester}
								onChange={(e) => setSelectedSemester(e.target.value)}
							>
								<option value="all">All semesters</option>
								<option value="first">{SEMESTER_LABELS.first}</option>
								<option value="second">{SEMESTER_LABELS.second}</option>
							</select>
						</div>
					)}
					<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
						Top X
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={topLimit}
							onChange={(e) => setTopLimit(Number(e.target.value))}
						>
							<option value={3}>Top 3</option>
							<option value={5}>Top 5</option>
							<option value={10}>Top 10</option>
						</select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{groupedByClass.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No performer data available for the selected filters.
					</p>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{groupedByClass.map(([classLabel, students], classIdx) => (
							<motion.div
								key={classLabel}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.3, delay: classIdx * 0.04 }}
								className={`rounded-lg border border-l-4 bg-card p-4 shadow-sm ${
									CLASS_COLORS[classIdx % CLASS_COLORS.length]
								}`}
							>
								<h4 className="mb-3 text-sm font-semibold text-foreground">
									{classLabel}
								</h4>
								<ul className="space-y-2">
									{students.map((student, studentIdx) => (
										<li
											key={student.studentId}
											className="flex items-center justify-between gap-2 text-sm"
										>
											<div className="flex items-center gap-2 min-w-0">
												{studentIdx < 3 ? (
													<Medal
														className={`h-4 w-4 shrink-0 ${MEDAL_COLORS[studentIdx] || 'text-muted-foreground'}`}
													/>
												) : (
													<span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
														{studentIdx + 1}
													</span>
												)}
												<span className="truncate text-foreground">
													{student.studentName}
												</span>
											</div>
											<span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
												{student.average.toFixed(1)}
											</span>
										</li>
									))}
								</ul>
							</motion.div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
