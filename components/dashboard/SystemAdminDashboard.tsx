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
import { buildAcademicYearOptions, getClassNameById } from '@/components/dashboard/academicYear';
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
	buildClassSessionMap,
	getOrderedClassIds,
	getSessionNames,
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
	const currentAcademicYear = schoolProfile.identity.currentAcademicYear || '';
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

	const totalRecords = numericGrades.length;

	// ── Session & class filters ──────────────────────────────────────────────
	const sessionNames = useMemo(() => getSessionNames(schoolProfile), [schoolProfile]);
	const hasMultipleSessions = sessionNames.length > 1;
	const [selectedSession, setSelectedSession] = useState(() => sessionNames[0] ?? '');
	const classSessionMap = useMemo(() => buildClassSessionMap(schoolProfile), [schoolProfile]);

	const classFilterOptions = useMemo(() => {
		const allClassIds = getOrderedClassIds(schoolProfile);
		const filtered = selectedSession
			? allClassIds.filter((id) => classSessionMap.get(id) === selectedSession)
			: allClassIds;
		return filtered.map((id) => ({
			value: id,
			label: getClassNameById(schoolProfile, id),
		}));
	}, [schoolProfile, selectedSession, classSessionMap]);

	const [selectedClassId, setSelectedClassId] = useState('');

	// ── Student demographics ─────────────────────────────────────────────────
	const totalStudents = students.length;
	const totalMales = useMemo(
		() => students.filter((s) => normalizeGender(s.gender) === 'Male').length,
		[students],
	);
	const totalFemales = useMemo(
		() => students.filter((s) => normalizeGender(s.gender) === 'Female').length,
		[students],
	);

	// Filtered students for charts
	const filteredStudents = useMemo(
		() =>
			selectedClassId
				? students.filter((s) => getStudentClassId(s) === selectedClassId)
				: students,
		[students, selectedClassId],
	);

	// Gender bar data (Male, Female, Total)
	const genderBarData = useMemo(() => {
		const male = filteredStudents.filter((s) => normalizeGender(s.gender) === 'Male').length;
		const female = filteredStudents.filter((s) => normalizeGender(s.gender) === 'Female').length;
		const total = filteredStudents.length;
		return [{ name: 'Students', Male: male, Female: female, Total: total }];
	}, [filteredStudents]);

	// Age distribution pie data
	const AGE_RANGES = ['3-5', '6-9', '10-12', '13-15', '16-18', '19+'] as const;

	const ageDistributionData = useMemo(() => {
		const counts = new Map<string, number>();
		AGE_RANGES.forEach((r) => counts.set(r, 0));

		const now = new Date();
		filteredStudents.forEach((s) => {
			const dob = (s as any).dateOfBirth || (s as any).dob;
			if (!dob) return;
			const birth = new Date(dob);
			if (Number.isNaN(birth.getTime())) return;
			let age = now.getFullYear() - birth.getFullYear();
			const monthDiff = now.getMonth() - birth.getMonth();
			if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;

			if (age < 3) counts.set('3-5', (counts.get('3-5') || 0) + 1);
			else if (age <= 5) counts.set('3-5', (counts.get('3-5') || 0) + 1);
			else if (age <= 9) counts.set('6-9', (counts.get('6-9') || 0) + 1);
			else if (age <= 12) counts.set('10-12', (counts.get('10-12') || 0) + 1);
			else if (age <= 15) counts.set('13-15', (counts.get('13-15') || 0) + 1);
			else if (age <= 18) counts.set('16-18', (counts.get('16-18') || 0) + 1);
			else counts.set('19+', (counts.get('19+') || 0) + 1);
		});

		return AGE_RANGES
			.filter((r) => (counts.get(r) || 0) > 0)
			.map((r) => ({ label: r, value: counts.get(r) || 0 }));
	}, [filteredStudents]);

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

			{/* ── Demographics Filters ──────────────────────────────────────── */}
			<div className="flex flex-wrap gap-3">
				{hasMultipleSessions && (
					<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
						Session
						<select
							className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
							value={selectedSession}
							onChange={(e) => {
								setSelectedSession(e.target.value);
								setSelectedClassId('');
							}}
						>
							<option value="">All sessions</option>
							{sessionNames.map((s) => (
								<option key={s} value={s}>{s}</option>
							))}
						</select>
					</div>
				)}
				<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
					Class
					<select
						className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
						value={selectedClassId}
						onChange={(e) => setSelectedClassId(e.target.value)}
					>
						<option value="">All Classes</option>
						{classFilterOptions.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
				</div>
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
						) : filteredStudents.length === 0 ? (
							<p className="py-6 text-center text-sm text-muted-foreground">No student data available.</p>
						) : (
							<ChartContainer
								config={{
									Male: { label: 'Male', color: 'hsl(210, 80%, 55%)' },
									Female: { label: 'Female', color: 'hsl(330, 70%, 60%)' },
									Total: { label: 'Total', color: 'hsl(150, 40%, 55%)' },
								}}
								className={BAR_CHART_CLASS}
							>
								<BarChart data={genderBarData}>
									<CartesianGrid vertical={false} strokeOpacity={0.08} />
									<XAxis dataKey="name" tick={{ fontSize: 11 }} />
									<YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<ChartLegend content={<ChartLegendContent />} />
									<Bar dataKey="Male" fill="var(--color-Male)" radius={[4, 4, 0, 0]} />
									<Bar dataKey="Female" fill="var(--color-Female)" radius={[4, 4, 0, 0]} />
									<Bar dataKey="Total" fill="var(--color-Total)" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Age Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoadingStudents ? (
							<p className="py-6 text-center text-sm text-muted-foreground">Loading student data…</p>
						) : ageDistributionData.length === 0 ? (
							<p className="py-6 text-center text-sm text-muted-foreground">No age data available.</p>
						) : (
							<ChartContainer
								config={{
									'3-5': { label: '3-5 yrs', color: 'hsl(145, 63%, 42%)' },
									'6-9': { label: '6-9 yrs', color: 'hsl(199, 89%, 48%)' },
									'10-12': { label: '10-12 yrs', color: 'hsl(45, 93%, 47%)' },
									'13-15': { label: '13-15 yrs', color: 'hsl(24, 95%, 53%)' },
									'16-18': { label: '16-18 yrs', color: 'hsl(280, 65%, 55%)' },
									'19+': { label: '19+ yrs', color: 'hsl(0, 84%, 60%)' },
								}}
								className={PIE_CHART_CLASS}
							>
								<PieChart>
									<ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
									<Pie data={ageDistributionData} dataKey="value" nameKey="label" innerRadius={52} outerRadius={85} stroke="transparent" isAnimationActive animationDuration={700}>
										{ageDistributionData.map((entry) => (
											<Cell key={entry.label} fill={`var(--color-${entry.label})`} />
										))}
									</Pie>
									<ChartLegend content={<ChartLegendContent nameKey="label" />} />
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
