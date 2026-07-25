'use client';

import { useEffect, useMemo, useState, memo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Users, Mars, Venus, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { SchoolProfile } from '@/types/schoolProfile';
import { buildAcademicYearOptions, getClassLevelLabel } from '@/components/dashboard/academicYear';
import StatCard from '@/components/dashboard/StatCard';
import TopPerformersByClass from '@/components/dashboard/TopPerformersByClass';
import SchoolWideTopPerformers from '@/components/dashboard/SchoolWideTopPerformers';
import { useSchoolStore } from '@/store/schoolStore';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	pickCurrentOrMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import {
	buildPassFailData,
	buildGradeBandData,
	computeSemesterAverageFromGrades,
	normalizeNumericGrades,
	type RawGradeRecord,
} from '@/components/dashboard/insightAnalytics';

// ─── Types ────────────────────────────────────────────────────────────────────

type GradeItem = {
	grade?: number | string | null;
	classId?: string | null;
	period?: string | null;
	status?: string | null;
	studentId?: string | null;
	studentName?: string | null;
	academicYear?: string | null;
};

type StudentRecord = {
	id: string;
	gender?: string;
	className?: string;
	classId?: string;
	historicalClass?: { className?: string; classId?: string };
	currentClass?: { className?: string; classId?: string };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_CHART_CLASS = 'h-[220px] sm:h-[270px] w-full aspect-auto';
const BAR_CHART_CLASS = 'h-[260px] sm:h-[300px] w-full aspect-auto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeGender = (value?: string) => {
	if (!value) return 'Unknown';
	const n = value.toLowerCase();
	if (n.startsWith('m')) return 'Male';
	if (n.startsWith('f')) return 'Female';
	return 'Other';
};

const getStudentClassId = (s: StudentRecord) =>
	s.historicalClass?.classId || s.classId || s.currentClass?.classId || '';

const getStudentClassLabel = (s: StudentRecord) =>
	s.historicalClass?.className || s.className || s.currentClass?.className || 'Unknown';

const getAverage = (values: number[]) => {
	if (values.length === 0) return 0;
	return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
};

// ─── Component ────────────────────────────────────────────────────────────────

const SystemAdminDashboard = memo(function SystemAdminDashboard({
	schoolProfile,
	user,
}: {
	schoolProfile: SchoolProfile;
	user: any;
}) {
	// ── Academic year ─────────────────────────────────────────────────────────
	const academicYearOptions = useMemo(
		() => buildAcademicYearOptions(schoolProfile),
		[schoolProfile],
	);
	const currentAcademicYear = schoolProfile.currentAcademicYear || '';
	const defaultAcademicYear = useMemo(
		() =>
			pickCurrentOrMostRecentAcademicYear(
				academicYearOptions.map((o) => o.value),
				currentAcademicYear,
			) || '',
		[academicYearOptions, currentAcademicYear],
	);
	const [selectedYear, setSelectedYear] = useState(defaultAcademicYear);
	const showAcademicYearSelector = academicYearOptions.length > 1;

	useEffect(() => {
		const ok = academicYearOptions.some((o) =>
			areAcademicYearsEqual(o.value, selectedYear),
		);
		if (!selectedYear || !ok) setSelectedYear(defaultAcademicYear);
	}, [academicYearOptions, defaultAcademicYear, selectedYear]);

	// ── Grade data ────────────────────────────────────────────────────────────
	const [grades, setGrades] = useState<GradeItem[]>([]);
	const [isLoadingGrades, setIsLoadingGrades] = useState(false);
	const [gradeError, setGradeError] = useState('');
	const gradesByAcademicYear = useSchoolStore((s) => s.gradesByAcademicYear);
	const setGradesForYear = useSchoolStore((s) => s.setGradesForYear);

	useEffect(() => {
		if (!selectedYear) return;
		const ctrl = new AbortController();

		const fetchGrades = async () => {
			try {
				setIsLoadingGrades(true);
				setGradeError('');
				const store = getScopedAcademicYearValue(gradesByAcademicYear, selectedYear).value;
				if (Array.isArray(store)) {
					setGrades(store as GradeItem[]);
					return;
				}
				const res = await fetch(
					`/api/grades?academicYear=${encodeURIComponent(selectedYear)}`,
					{ signal: ctrl.signal },
				);
				const payload = await res.json();
				if (!res.ok || !payload?.success) {
					throw new Error(payload?.message || 'Failed to load grade data.');
				}
				const data = payload?.data?.grades || payload?.data?.report?.grades || [];
				const safe = Array.isArray(data) ? (data as GradeItem[]) : [];
				setGrades(safe);
				setGradesForYear(selectedYear, safe);
			} catch (e) {
				if ((e as Error).name === 'AbortError') return;
				setGradeError((e as Error).message || 'Unable to load grade data.');
			} finally {
				setIsLoadingGrades(false);
			}
		};

		fetchGrades();
		return () => ctrl.abort();
	}, [selectedYear, gradesByAcademicYear, setGradesForYear]);

	// ── Student data ──────────────────────────────────────────────────────────
	const [students, setStudents] = useState<StudentRecord[]>([]);
	const [isLoadingStudents, setIsLoadingStudents] = useState(false);
	const usersByAcademicYear = useSchoolStore((s) => s.usersByAcademicYear);
	const setUsersForYear = useSchoolStore((s) => s.setUsersForYear);

	useEffect(() => {
		if (!selectedYear) return;
		const ctrl = new AbortController();

		const fetchStudents = async () => {
			try {
				setIsLoadingStudents(true);
				const scoped = getScopedAcademicYearValue(usersByAcademicYear, selectedYear).value;
				const storeStudents = scoped?.students;
				if (Array.isArray(storeStudents)) {
					setStudents(storeStudents as StudentRecord[]);
					return;
				}
				const res = await fetch(
					`/api/users?role=student&academicYear=${encodeURIComponent(selectedYear)}`,
					{ signal: ctrl.signal },
				);
				const payload = await res.json();
				if (!res.ok || !payload?.success) {
					throw new Error(payload?.message || 'Failed to load student data.');
				}
				const data = Array.isArray(payload.data)
					? payload.data
					: payload.data?.students || [];
				setStudents(data);
				setUsersForYear(selectedYear, { students: Array.isArray(data) ? data : [] }, { merge: true });
			} catch (e) {
				if ((e as Error).name === 'AbortError') return;
			} finally {
				setIsLoadingStudents(false);
			}
		};

		fetchStudents();
		return () => ctrl.abort();
	}, [selectedYear, usersByAcademicYear, setUsersForYear]);

	// ── Derived data ──────────────────────────────────────────────────────────
	const passMark = schoolProfile.settings?.gradingSettings?.passMark || 70;

	const numericGrades = useMemo(
		() => normalizeNumericGrades(grades as RawGradeRecord[]),
		[grades],
	);

	const averageGrade = useMemo(() => {
		if (numericGrades.length === 0) return 0;
		return Number(
			(numericGrades.reduce((sum, g) => sum + g.grade, 0) / numericGrades.length).toFixed(1),
		);
	}, [numericGrades]);

	const passFailData = useMemo(() => buildPassFailData(numericGrades, passMark), [numericGrades, passMark]);
	const gradeBandData = useMemo(() => buildGradeBandData(numericGrades), [numericGrades]);
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

	const passCount = passFailData.find((e) => e.label === 'Pass')?.value || 0;
	const totalRecords = numericGrades.length;
	const passRate = totalRecords > 0 ? Math.round((passCount / totalRecords) * 100) : 0;

	// Student demographics
	const totalStudents = students.length;
	const totalMales = useMemo(
		() => students.filter((s) => normalizeGender(s.gender) === 'Male').length,
		[students],
	);
	const totalFemales = useMemo(
		() => students.filter((s) => normalizeGender(s.gender) === 'Female').length,
		[students],
	);

	const genderPieData = useMemo(
		() => [
			{ label: 'Male', value: totalMales },
			{ label: 'Female', value: totalFemales },
			...(totalStudents - totalMales - totalFemales > 0
				? [{ label: 'Other', value: totalStudents - totalMales - totalFemales }]
				: []),
		],
		[totalStudents, totalMales, totalFemales],
	);

	const classBreakdown = useMemo(() => {
		const counts = new Map<string, { classId: string; className: string; total: number; male: number; female: number }>();
		students.forEach((s) => {
			const classId = getStudentClassId(s);
			const label = getStudentClassLabel(s);
			const key = classId || label;
			const gender = normalizeGender(s.gender);
			if (!counts.has(key)) counts.set(key, { classId, className: label, total: 0, male: 0, female: 0 });
			const e = counts.get(key)!;
			e.total += 1;
			if (gender === 'Male') e.male += 1;
			if (gender === 'Female') e.female += 1;
		});
		return Array.from(counts.values()).sort((a, b) => b.total - a.total);
	}, [students]);

	const classBarData = useMemo(
		() =>
			classBreakdown.map((c) => ({
				className: c.className.length > 14 ? c.className.slice(0, 13) + '…' : c.className,
				Male: c.male,
				Female: c.female,
			})),
		[classBreakdown],
	);

	const isLoading = isLoadingGrades || isLoadingStudents;

	return (
		<div className="space-y-8">
			{/* ── Header ──────────────────────────────────────────────────────── */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold">School Overview</h2>
					<p className="text-sm text-muted-foreground">
						Academic year: {selectedYear || 'N/A'}
					</p>
				</div>
				{showAcademicYearSelector && (
					<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
						Academic Year
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={selectedYear}
							onChange={(e) => setSelectedYear(e.target.value)}
						>
							{academicYearOptions.map((o) => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
					</div>
				)}
			</div>

			{gradeError && (
				<Card className="border border-destructive/50 bg-destructive/5 p-4">
					<p className="text-sm font-medium text-destructive">{gradeError}</p>
				</Card>
			)}

			{/* ── Summary Stats ───────────────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Total Students" value={String(totalStudents)} helper="Enrolled this year" icon={Users} index={0} />
				<StatCard label="Male Students" value={String(totalMales)} helper={totalStudents > 0 ? `${Math.round((totalMales / totalStudents) * 100)}% of total` : '—'} icon={Mars} index={1} />
				<StatCard label="Female Students" value={String(totalFemales)} helper={totalStudents > 0 ? `${Math.round((totalFemales / totalStudents) * 100)}% of total` : '—'} icon={Venus} index={2} />
				<StatCard label="Average Grade" value={averageGrade.toFixed(1)} helper={`${totalRecords} grade records`} icon={GraduationCap} index={3} />
			</div>

			{/* ── Demographics ────────────────────────────────────────────────── */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Gender Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoadingStudents ? (
							<p className="py-6 text-center text-sm text-muted-foreground">Loading student data…</p>
						) : totalStudents === 0 ? (
							<p className="py-6 text-center text-sm text-muted-foreground">No student data available.</p>
						) : (
							<ChartContainer
								config={{
									Male: { label: 'Male', color: 'hsl(210, 80%, 55%)' },
									Female: { label: 'Female', color: 'hsl(330, 70%, 60%)' },
									Other: { label: 'Other', color: 'hsl(150, 40%, 55%)' },
								}}
								className={PIE_CHART_CLASS}
							>
								<PieChart>
									<ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
									<Pie data={genderPieData} dataKey="value" nameKey="label" innerRadius={52} outerRadius={85} stroke="transparent" isAnimationActive animationDuration={700}>
										{genderPieData.map((entry) => (
											<Cell key={entry.label} fill={`var(--color-${entry.label})`} />
										))}
									</Pie>
									<ChartLegend content={<ChartLegendContent nameKey="label" />} />
								</PieChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Class Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoadingStudents ? (
							<p className="py-6 text-center text-sm text-muted-foreground">Loading student data…</p>
						) : classBarData.length === 0 ? (
							<p className="py-6 text-center text-sm text-muted-foreground">No student data available.</p>
						) : (
							<ChartContainer
								config={{
									Male: { label: 'Male', color: 'hsl(210, 80%, 55%)' },
									Female: { label: 'Female', color: 'hsl(330, 70%, 60%)' },
								}}
								className={BAR_CHART_CLASS}
							>
								<BarChart data={classBarData}>
									<CartesianGrid vertical={false} strokeOpacity={0.08} />
									<XAxis dataKey="className" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={60} />
									<YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<ChartLegend content={<ChartLegendContent />} />
									<Bar dataKey="Male" fill="var(--color-Male)" radius={[4, 4, 0, 0]} />
									<Bar dataKey="Female" fill="var(--color-Female)" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>
			</div>

			{/* ── Performance Overview ─────────────────────────────────────────── */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Pass vs Fail</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoadingGrades ? (
							<p className="py-6 text-center text-sm text-muted-foreground">Loading grades…</p>
						) : (
							<ChartContainer
								config={{
									Pass: { label: 'Pass', color: 'hsl(145, 63%, 42%)' },
									Fail: { label: 'Fail', color: 'hsl(0, 84%, 60%)' },
								}}
								className={PIE_CHART_CLASS}
							>
								<PieChart>
									<ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
									<Pie data={passFailData} dataKey="value" nameKey="label" innerRadius={52} outerRadius={85} stroke="transparent" isAnimationActive animationDuration={700}>
										{passFailData.map((entry) => (
											<Cell key={entry.label} fill={`var(--color-${entry.label})`} />
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Grade Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoadingGrades ? (
							<p className="py-6 text-center text-sm text-muted-foreground">Loading grades…</p>
						) : (
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
									<Pie data={gradeBandPieData} dataKey="value" nameKey="key" innerRadius={42} outerRadius={86} stroke="transparent" isAnimationActive animationDuration={700}>
										{gradeBandPieData.map((entry) => (
											<Cell key={entry.label} fill={`var(--color-${entry.key})`} />
										))}
									</Pie>
								</PieChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>
			</div>

			{/* ── Top Performers by Class ──────────────────────────────────────── */}
			<TopPerformersByClass schoolProfile={schoolProfile} grades={grades} />

			{/* ── School-Wide Top Performers ──────────────────────────────────── */}
			<SchoolWideTopPerformers schoolProfile={schoolProfile} grades={grades} />
		</div>
	);
});

export default SystemAdminDashboard;
