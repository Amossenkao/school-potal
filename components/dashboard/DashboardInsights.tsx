'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Users, Mars, Venus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClassLevelLabel } from '@/components/dashboard/academicYear';
import { useSchoolStore } from '@/store/schoolStore';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	getStudentAcademicYears,
	getTeacherAcademicYears,
	pickCurrentOrMostRecentAcademicYear,
	pickMostRecentAcademicYear,
} from '@/utils/academicYearOptions';

type DashboardInsightsProps = {
	schoolProfile: SchoolProfile;
	user: {
		id?: string;
		_id?: string;
		role?: string;
		classId?: string;
		className?: string;
		historicalClass?: { classId?: string; className?: string };
		currentClass?: { classId?: string; className?: string };
		academicYears?: { year?: string | null }[];
		subjects?: {
			year: string;
			classes: { classId: string; subjects: string[] }[];
		}[];
		gender?: string;
		dateOfBirth?: string;
	};
	selectedYear?: string;
	onYearChange?: (year: string) => void;
};

type StudentRecord = {
	id: string;
	gender?: string;
	dateOfBirth?: string;
	className?: string;
	classId?: string;
	historicalClass?: {
		className?: string;
		classId?: string;
	};
	currentClass?: {
		className?: string;
		classId?: string;
	};
};

type Option = {
	value: string;
	label: string;
};

const BAR_CHART_CLASS = 'h-[260px] sm:h-[300px] w-full aspect-auto';

const normalizeGender = (value?: string) => {
	if (!value) return 'Unknown';
	const normalized = value.toLowerCase();
	if (normalized.startsWith('m')) return 'Male';
	if (normalized.startsWith('f')) return 'Female';
	return 'Other';
};

const getStudentClassLabel = (student: StudentRecord) =>
	student.historicalClass?.className ||
	student.className ||
	student.currentClass?.className ||
	'Unknown';

const getStudentClassId = (student: StudentRecord) =>
	student.historicalClass?.classId ||
	student.classId ||
	student.currentClass?.classId ||
	'';

export default function DashboardInsights({
	schoolProfile,
	user,
	selectedYear: selectedYearProp,
}: DashboardInsightsProps) {
	const role = user?.role || 'student';
	const selectedGender = 'all';

	const academicYearOptions = useMemo(() => {
		const schoolYears = buildSchoolAcademicYearRange(schoolProfile);
		if (role === 'student') {
			const studentYears = getStudentAcademicYears(user);
			const years = studentYears.length > 0 ? studentYears : schoolYears;
			return years.map((year) => ({ value: year, label: year }));
		}
		if (role === 'teacher') {
			const teacherYears = getTeacherAcademicYears(user);
			const scopedYears = teacherYears.filter((year) =>
				schoolYears.some((schoolYear) =>
					areAcademicYearsEqual(schoolYear, year),
				),
			);
			const years =
				scopedYears.length > 0
					? scopedYears
					: teacherYears.length > 0
						? teacherYears
						: schoolYears;
			return years.map((year) => ({ value: year, label: year }));
		}
		return schoolYears.map((year) => ({ value: year, label: year }));
	}, [schoolProfile, user, role]);

	const baseClassOptions = useMemo(() => {
		const options: Option[] = [];
		const seen = new Set<string>();
		Object.values(schoolProfile.classLevels || {}).forEach((session) => {
			Object.values(session || {}).forEach((level) => {
				level.classes?.forEach((klass) => {
					if (seen.has(klass.classId)) return;
					seen.add(klass.classId);
					options.push({
						value: klass.classId,
						label: klass.name,
					});
				});
			});
		});
		return options;
	}, [schoolProfile]);

	const currentAcademicYear = schoolProfile.currentAcademicYear || '';
	const defaultAcademicYear = useMemo(() => {
		const years = academicYearOptions.map((option) => option.value);
		if (role === 'student' || role === 'teacher') {
			return pickMostRecentAcademicYear(years, currentAcademicYear) || '';
		}
		return (
			pickCurrentOrMostRecentAcademicYear(years, currentAcademicYear) || ''
		);
	}, [academicYearOptions, currentAcademicYear, role]);

	const isYearControlled = typeof selectedYearProp === 'string';
	const [internalYear, setInternalYear] = useState(defaultAcademicYear);
	const selectedYear = isYearControlled ? selectedYearProp || '' : internalYear;
	const [selectedClassId, setSelectedClassId] = useState('all');
	const [students, setStudents] = useState<StudentRecord[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);

	const teacherClassIds = useMemo(() => {
		if (role !== 'teacher') return [];
		const relevantSubjects = user?.subjects?.filter((subject) =>
			selectedYear ? areAcademicYearsEqual(subject.year, selectedYear) : true,
		);
		const classIds = (relevantSubjects || []).flatMap((subject) =>
			subject.classes.map((klass) => klass.classId),
		);
		return Array.from(new Set(classIds));
	}, [role, user?.subjects, selectedYear]);

	const studentClassId =
		user?.classId ||
		user?.historicalClass?.classId ||
		user?.currentClass?.classId ||
		'';

	const classOptions = useMemo(() => {
		if (role === 'student') {
			if (!studentClassId) return [];
			const match = baseClassOptions.find(
				(option) => option.value === studentClassId,
			);
			return match ? [match] : [];
		}
		if (role === 'teacher') {
			return baseClassOptions.filter((option) =>
				teacherClassIds.includes(option.value),
			);
		}
		return baseClassOptions;
	}, [role, baseClassOptions, teacherClassIds, studentClassId]);

	useEffect(() => {
		if (isYearControlled) return;
		const selectedIsAvailable = academicYearOptions.some((option) =>
			areAcademicYearsEqual(option.value, internalYear),
		);
		if (!internalYear || !selectedIsAvailable) {
			setInternalYear(defaultAcademicYear);
		}
	}, [
		academicYearOptions,
		internalYear,
		defaultAcademicYear,
		isYearControlled,
	]);

	useEffect(() => {
		if (role === 'student') {
			if (studentClassId) {
				setSelectedClassId(studentClassId);
			}
			return;
		}
		if (role === 'teacher') {
			if (teacherClassIds.length === 1) {
				setSelectedClassId(teacherClassIds[0]);
			} else {
				setSelectedClassId('all');
			}
			return;
		}
		setSelectedClassId('all');
	}, [role, studentClassId, teacherClassIds]);

	useEffect(() => {
		if (!selectedYear) return;
		const controller = new AbortController();

		const fetchStudents = async () => {
			try {
				setIsLoading(true);
				setErrorMessage('');
				const scopedUsers = getScopedAcademicYearValue(
					usersByAcademicYear,
					selectedYear,
				).value;
				const storeStudents = scopedUsers?.students;
				if (Array.isArray(storeStudents)) {
					if (role === 'teacher') {
						const targets =
							selectedClassId !== 'all' ? [selectedClassId] : teacherClassIds;
						const filtered = storeStudents.filter((student: StudentRecord) => {
							if (targets.length === 0) return false;
							const classId = getStudentClassId(student);
							return targets.includes(classId);
						});
						setStudents(filtered);
						return;
					}
					if (selectedClassId !== 'all') {
						const filtered = storeStudents.filter(
							(student: StudentRecord) =>
								getStudentClassId(student) === selectedClassId,
						);
						setStudents(filtered);
						return;
					}
					setStudents(storeStudents as StudentRecord[]);
					return;
				}
				if (role === 'student') {
					setStudents([
						{
							id: user?.id || user?._id || 'me',
							gender: user?.gender,
							dateOfBirth: user?.dateOfBirth,
							className:
								user?.className ||
								user?.historicalClass?.className ||
								user?.currentClass?.className ||
								'',
							classId: studentClassId || '',
							historicalClass: user?.historicalClass,
							currentClass: user?.currentClass,
						},
					]);
					return;
				}

				const fetchForClass = async (classId: string) => {
					const response = await fetch(
						`/api/users?role=student&academicYear=${encodeURIComponent(
							selectedYear,
						)}&classId=${encodeURIComponent(classId)}`,
						{ signal: controller.signal },
					);
					const payload = await response.json();
					if (!response.ok || !payload?.success) {
						throw new Error(payload?.message || 'Failed to load student data.');
					}
					return Array.isArray(payload.data)
						? payload.data
						: payload.data?.students || [];
				};

				if (role === 'teacher') {
					const targets =
						selectedClassId !== 'all' ? [selectedClassId] : teacherClassIds;
					if (targets.length === 0) {
						setStudents([]);
						return;
					}
					const results = await Promise.all(
						targets.map((classId) => fetchForClass(classId)),
					);
					const merged = new Map<string, StudentRecord>();
					results.flat().forEach((student: StudentRecord) => {
						const key = student.id || (student as any)._id;
						if (!key) return;
						merged.set(key, student);
					});
					const mergedStudents = Array.from(merged.values());
					setStudents(mergedStudents);
					setUsersForYear(
						selectedYear,
						{ students: mergedStudents as any[] },
						{ merge: true },
					);
					return;
				}

				const classParam =
					selectedClassId !== 'all'
						? `&classId=${encodeURIComponent(selectedClassId)}`
						: '';
				const response = await fetch(
					`/api/users?role=student&academicYear=${encodeURIComponent(
						selectedYear,
					)}${classParam}`,
					{ signal: controller.signal },
				);
				const payload = await response.json();
				if (!response.ok || !payload?.success) {
					throw new Error(payload?.message || 'Failed to load student data.');
				}
				const data = Array.isArray(payload.data)
					? payload.data
					: payload.data?.students || [];
				setStudents(data);
				setUsersForYear(
					selectedYear,
					{ students: Array.isArray(data) ? data : [] },
					{ merge: true },
				);
			} catch (error) {
				if ((error as Error).name === 'AbortError') return;
				setErrorMessage(
					(error as Error).message || 'Unable to load student insights.',
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStudents();
		return () => controller.abort();
	}, [
		selectedYear,
		selectedClassId,
		role,
		teacherClassIds,
		studentClassId,
		user,
		usersByAcademicYear,
		setUsersForYear,
	]);

	const filteredStudents = useMemo(() => {
		if (selectedGender === 'all') return students;
		return students.filter(
			(student) => normalizeGender(student.gender) === selectedGender,
		);
	}, [students, selectedGender]);

	const totalStudents = filteredStudents.length;
	const totalMales = useMemo(
		() =>
			filteredStudents.filter((s) => normalizeGender(s.gender) === 'Male')
				.length,
		[filteredStudents],
	);
	const totalFemales = useMemo(
		() =>
			filteredStudents.filter((s) => normalizeGender(s.gender) === 'Female')
				.length,
		[filteredStudents],
	);

	const classBreakdown = useMemo(() => {
		const counts = new Map<
			string,
			{
				classId: string;
				className: string;
				total: number;
				male: number;
				female: number;
			}
		>();
		filteredStudents.forEach((student) => {
			const classId = getStudentClassId(student);
			const label = getStudentClassLabel(student);
			const key = classId || label;
			const gender = normalizeGender(student.gender);

			if (!counts.has(key)) {
				counts.set(key, {
					classId,
					className: label,
					total: 0,
					male: 0,
					female: 0,
				});
			}
			const entry = counts.get(key)!;
			entry.total += 1;
			if (gender === 'Male') entry.male += 1;
			if (gender === 'Female') entry.female += 1;
		});
		return Array.from(counts.values()).sort((a, b) => b.total - a.total);
	}, [filteredStudents]);

	const classLevels = useMemo(() => {
		const grouped = new Map<
			string,
			{
				levelLabel: string;
				classes: {
					className: string;
					total: number;
					male: number;
					female: number;
				}[];
			}
		>();
		classBreakdown.forEach((entry) => {
			const levelLabel =
				getClassLevelLabel(schoolProfile, entry.classId) || 'Other';
			if (!grouped.has(levelLabel)) {
				grouped.set(levelLabel, { levelLabel, classes: [] });
			}
			grouped.get(levelLabel)!.classes.push({
				className: entry.className,
				total: entry.total,
				male: entry.male,
				female: entry.female,
			});
		});
		return Array.from(grouped.values()).map((entry) => ({
			...entry,
			classes: entry.classes.sort((a, b) =>
				a.className.localeCompare(b.className),
			),
		}));
	}, [classBreakdown, schoolProfile]);

	const formatAxisLabel = (value: string) =>
		value.length > 12 ? `${value.slice(0, 12)}…` : value;

	return (
		<div className="space-y-8">
			{/* Loading State Check */}
			{isLoading && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
					Updating insights…
				</div>
			)}

			{/* Error Messaging State */}
			{errorMessage && (
				<Card className="border border-destructive/50 bg-destructive/5 p-4">
					<p className="text-sm font-medium text-destructive">{errorMessage}</p>
				</Card>
			)}

			{/* Summary Stats Cards */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card className="relative overflow-hidden border border-border">
					<div className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
						<Users className="h-4 w-4" />
					</div>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Total Students
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-4xl font-bold tracking-tight text-foreground">
							{totalStudents}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							Enrolled across scope
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border border-border">
					<div className="absolute right-4 top-4 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
						<Mars className="h-4 w-4" />
					</div>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Male Students
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-4xl font-bold tracking-tight text-primary">
							{totalMales}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{totalStudents > 0
								? Math.round((totalMales / totalStudents) * 100)
								: 0}
							% of total
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden border border-border">
					<div className="absolute right-4 top-4 h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center text-chart-2">
						<Venus className="h-4 w-4" />
					</div>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Female Students
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-4xl font-bold tracking-tight text-chart-2">
							{totalFemales}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{totalStudents > 0
								? Math.round((totalFemales / totalStudents) * 100)
								: 0}
							% of total
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Class Level Breakdown Charts */}
			<div className="space-y-4">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h3 className="text-lg font-semibold tracking-tight">
							Breakdown by Class Level
						</h3>
						<p className="text-sm text-muted-foreground">
							Each chart shows Total, Male, and Female enrollment per class.
						</p>
					</div>
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<div className="flex items-center gap-1.5">
							<span className="h-3 w-3 rounded-sm bg-muted-foreground/60" />
							<span>Total</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="h-3 w-3 rounded-sm bg-primary" />
							<span>Male</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="h-3 w-3 rounded-sm bg-chart-2" />
							<span>Female</span>
						</div>
					</div>
				</div>

				{classLevels.length === 0 ? (
					<Card className="py-12 border border-border">
						<CardContent className="flex flex-col items-center justify-center text-center">
							<div className="mb-3">
								<Users className="h-8 w-8 text-muted-foreground" />
							</div>
							<p className="text-sm font-medium text-muted-foreground">
								No class data available for this context.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 lg:grid-cols-2">
						{classLevels.map((group) => (
							<Card
								key={group.levelLabel}
								className="flex flex-col border border-border"
							>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<CardTitle className="text-sm font-semibold">
											{group.levelLabel}
										</CardTitle>
										<span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
											{group.classes.length} class
											{group.classes.length !== 1 ? 'es' : ''}
										</span>
									</div>
								</CardHeader>
								<CardContent className="flex-1">
									<ChartContainer
										config={{
											total: {
												label: 'Total',
												color: 'var(--muted-foreground)',
											},
											male: {
												label: 'Male',
												color: 'var(--primary)',
											},
											female: {
												label: 'Female',
												color: 'var(--chart-2)',
											},
										}}
										className={BAR_CHART_CLASS}
									>
										<BarChart
											data={group.classes}
											margin={{ top: 8, right: 12, left: 0, bottom: 32 }}
											barCategoryGap="20%"
										>
											<CartesianGrid
												vertical={false}
												strokeDasharray="3 3"
												className="stroke-muted"
											/>
											<XAxis
												dataKey="className"
												tickLine={false}
												axisLine={false}
												interval="preserveStartEnd"
												minTickGap={8}
												angle={-30}
												textAnchor="end"
												height={50}
												tick={{ fontSize: 11 }}
												tickFormatter={formatAxisLabel}
												className="fill-muted-foreground"
											/>
											<YAxis
												tickLine={false}
												axisLine={false}
												width={36}
												tick={{ fontSize: 11 }}
												className="fill-muted-foreground"
											/>
											<ChartTooltip
												content={
													<ChartTooltipContent className="w-40 border border-border bg-background text-foreground" />
												}
												cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
											/>
											<Bar
												dataKey="total"
												fill="currentColor"
												className="text-muted-foreground/60"
												radius={[4, 4, 0, 0]}
												maxBarSize={32}
											/>
											<Bar
												dataKey="male"
												fill="currentColor"
												className="text-primary"
												radius={[4, 4, 0, 0]}
												maxBarSize={32}
											/>
											<Bar
												dataKey="female"
												fill="currentColor"
												className="text-chart-2"
												radius={[4, 4, 0, 0]}
												maxBarSize={32}
											/>
											<ChartLegend
												content={
													<ChartLegendContent className="flex-wrap justify-center gap-4 pt-2 text-muted-foreground" />
												}
												verticalAlign="bottom"
											/>
										</BarChart>
									</ChartContainer>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
