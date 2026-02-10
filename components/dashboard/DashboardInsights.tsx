'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	BarChart,
	Bar,
	CartesianGrid,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import type { SchoolProfile } from '@/types/schoolProfile';

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
		subjects?: {
			year: string;
			classes: { classId: string; subjects: string[] }[];
		}[];
		gender?: string;
		dateOfBirth?: string;
	};
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

const ageBuckets = [
	{ key: '10-12', min: 10, max: 12 },
	{ key: '13-15', min: 13, max: 15 },
	{ key: '16-18', min: 16, max: 18 },
	{ key: '19+', min: 19, max: 99 },
];

const normalizeGender = (value?: string) => {
	if (!value) return 'Unknown';
	const normalized = value.toLowerCase();
	if (normalized.startsWith('m')) return 'Male';
	if (normalized.startsWith('f')) return 'Female';
	return 'Other';
};

const getAge = (dateOfBirth?: string) => {
	if (!dateOfBirth) return null;
	const birthDate = new Date(dateOfBirth);
	if (Number.isNaN(birthDate.getTime())) return null;
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const hasHadBirthday =
		today.getMonth() > birthDate.getMonth() ||
		(today.getMonth() === birthDate.getMonth() &&
			today.getDate() >= birthDate.getDate());
	if (!hasHadBirthday) age -= 1;
	return age;
};

const getStudentClassLabel = (student: StudentRecord) =>
	student.historicalClass?.className ||
	student.className ||
	student.currentClass?.className ||
	'Unknown';

export default function DashboardInsights({
	schoolProfile,
	user,
}: DashboardInsightsProps) {
	const academicYearOptions = useMemo(() => {
		const current = schoolProfile.currentAcademicYear || '';
		const first = schoolProfile.firstAcademicYear || '';
		const parseStart = (value: string) => {
			const match = value.match(/^(\d{4})/);
			return match ? Number(match[1]) : null;
		};
		const startYear = parseStart(first);
		const endYear = parseStart(current);
		if (startYear && endYear && endYear >= startYear) {
			const years: Option[] = [];
			for (let year = endYear; year >= startYear; year -= 1) {
				years.push({
					value: `${year}-${year + 1}`,
					label: `${year}-${year + 1}`,
				});
			}
			return years;
		}
		if (current) {
			return [{ value: current, label: current }];
		}
		return [];
	}, [schoolProfile]);

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
	const [selectedYear, setSelectedYear] = useState(
		currentAcademicYear || academicYearOptions[0]?.value || ''
	);
	const [selectedClassId, setSelectedClassId] = useState('all');
	const [selectedGender, setSelectedGender] = useState('all');
	const [students, setStudents] = useState<StudentRecord[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const role = user?.role || 'student';
	const teacherClassIds = useMemo(() => {
		if (role !== 'teacher') return [];
		const relevantSubjects = user?.subjects?.filter((subject) =>
			selectedYear ? subject.year === selectedYear : true,
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
		if (!selectedYear && academicYearOptions.length > 0) {
			const nextYear =
				currentAcademicYear || academicYearOptions[0].value || '';
			setSelectedYear(nextYear);
		}
	}, [academicYearOptions, selectedYear, currentAcademicYear]);

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
					setStudents(Array.from(merged.values()));
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
			} catch (error) {
				if ((error as Error).name === 'AbortError') return;
				setErrorMessage(
					(error as Error).message || 'Unable to load student insights.'
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchStudents();
		return () => controller.abort();
	}, [selectedYear, selectedClassId, role, teacherClassIds, studentClassId, user]);

	const filteredStudents = useMemo(() => {
		if (selectedGender === 'all') return students;
		return students.filter(
			(student) => normalizeGender(student.gender) === selectedGender
		);
	}, [students, selectedGender]);

	const totalStudents = filteredStudents.length;
	const classBreakdown = useMemo(() => {
		const counts: Record<string, number> = {};
		filteredStudents.forEach((student) => {
			const label = getStudentClassLabel(student);
			counts[label] = (counts[label] || 0) + 1;
		});
		return Object.entries(counts)
			.map(([className, studentsCount]) => ({
				className,
				students: studentsCount,
			}))
			.sort((a, b) => b.students - a.students);
	}, [filteredStudents]);

	const genderData = useMemo(() => {
		const counts: Record<string, number> = {};
		filteredStudents.forEach((student) => {
			const label = normalizeGender(student.gender);
			counts[label] = (counts[label] || 0) + 1;
		});
		return Object.entries(counts).map(([label, value]) => ({
			label,
			value,
		}));
	}, [filteredStudents]);

	const ageGroups = useMemo(() => {
		const counts = Object.fromEntries(
			ageBuckets.map((bucket) => [bucket.key, 0])
		) as Record<string, number>;

		filteredStudents.forEach((student) => {
			const age = getAge(student.dateOfBirth);
			if (age === null) return;
			const bucket = ageBuckets.find(
				(item) => age >= item.min && age <= item.max
			);
			if (bucket) {
				counts[bucket.key] += 1;
			}
		});

		return ageBuckets.map((bucket) => ({
			group: bucket.key,
			students: counts[bucket.key],
		}));
	}, [filteredStudents]);

	const activeClassLabel =
		selectedClassId === 'all'
			? 'All classes'
			: classOptions.find((option) => option.value === selectedClassId)?.label ||
			  'Selected class';

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<CardTitle>Enrollment Insights</CardTitle>
						<p className="text-sm text-muted-foreground">
							Showing {activeClassLabel} for {selectedYear || 'current year'}.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
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
						{role !== 'student' ? (
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
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Gender
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedGender}
								onChange={(event) => setSelectedGender(event.target.value)}
							>
								<option value="all">All</option>
								<option value="Female">Female</option>
								<option value="Male">Male</option>
								<option value="Other">Other</option>
								<option value="Unknown">Unknown</option>
							</select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading insights…</p>
					) : errorMessage ? (
						<p className="text-sm text-red-500">{errorMessage}</p>
					) : (
						<p className="text-sm text-muted-foreground">
							Total students: {totalStudents}
						</p>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">Total Students</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{totalStudents}</div>
						<p className="text-xs text-muted-foreground">
							Based on current filters
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							Classes Represented
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{classBreakdown.length}</div>
						<p className="text-xs text-muted-foreground">
							Available in this dataset
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							Top Class Size
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">
							{classBreakdown[0]?.students || 0}
						</div>
						<p className="text-xs text-muted-foreground">
							{classBreakdown[0]?.className || 'No data'}
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Breakdown by Class</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={{
								students: { label: 'Students', color: 'hsl(217, 91%, 60%)' },
							}}
							className="h-[260px]"
						>
							<BarChart data={classBreakdown}>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis dataKey="className" tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} width={30} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar
									dataKey="students"
									fill="var(--color-students)"
									radius={[6, 6, 0, 0]}
								/>
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Gender Distribution</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={{
								Female: { label: 'Female', color: 'hsl(328, 85%, 63%)' },
								Male: { label: 'Male', color: 'hsl(221, 83%, 53%)' },
								Other: { label: 'Other', color: 'hsl(45, 90%, 55%)' },
								Unknown: { label: 'Unknown', color: 'hsl(220, 9%, 65%)' },
							}}
							className="h-[260px]"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
								<Pie
									data={genderData}
									dataKey="value"
									nameKey="label"
									innerRadius={60}
									outerRadius={90}
									stroke="transparent"
								>
									{genderData.map((item) => (
										<Cell
											key={item.label}
											fill={`var(--color-${item.label})`}
										/>
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
					<CardTitle>Age Group Distribution</CardTitle>
				</CardHeader>
				<CardContent>
					<ChartContainer
						config={{
							students: { label: 'Students', color: 'hsl(142, 70%, 45%)' },
						}}
						className="h-[260px]"
					>
						<BarChart data={ageGroups}>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis dataKey="group" tickLine={false} axisLine={false} />
							<YAxis tickLine={false} axisLine={false} width={30} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar
								dataKey="students"
								fill="var(--color-students)"
								radius={[6, 6, 0, 0]}
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>
		</div>
	);
}
