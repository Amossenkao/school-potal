'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import GradesPDFDownload from './GradesPDFDownload';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';

// Types
interface Student {
	studentId: string;
	studentName: string;
	periods?: { [key: string]: any };
}
interface UserInfo {
	tenantId?: string;
	purpose?: string;
	userId: string;
	username?: string;
	firstName?: string;
	lastName?: string;
	role: 'teacher' | 'system_admin';
	gender?: string;
	dateOfBirth?: string;
	address?: string;
	phone?: string;
	email?: string;
	isActive?: boolean;
	subjects?: { year: string; classes: { classId: string; subjects: string[] }[] }[];
	sponsorClass?: string | null;
}
interface GradeMasterProps {
	academicYear: string;
	loading: boolean;
	error: string;
	teacherInfo?: UserInfo | null;
}

const periods = [
	{ id: 'first', label: '1st Period', value: 'first' },
	{ id: 'second', label: '2nd Period', value: 'second' },
	{ id: 'third', label: '3rd Period', value: 'third' },
	{ id: 'third_exam', label: '3rd Period Exam', value: 'third_period_exam' },
	{ id: 'fourth', label: '4th Period', value: 'fourth' },
	{ id: 'fifth', label: '5th Period', value: 'fifth' },
	{ id: 'sixth', label: '6th Period', value: 'sixth' },
	{ id: 'sixth_exam', label: '6th Period Exam', value: 'sixth_period_exam' },
];

const PageLoading = ({ fullScreen = true }: { fullScreen?: boolean }) => (
	<div
		className={`flex justify-center items-center ${
			fullScreen ? 'min-h-screen' : 'py-8'
		}`}
	>
		<Loader2 className="h-8 w-8 animate-spin text-primary" />
	</div>
);

// Helper function to extract grade value from grade object if it's "Approved"
const getGradeValue = (grade: any): number | null => {
	if (
		grade &&
		typeof grade === 'object' &&
		grade.grade != null &&
		grade.status === 'Approved'
	) {
		const parsed = parseFloat(grade.grade);
		return isNaN(parsed) ? null : parsed;
	}
	return null;
};

// Helper function to format grade for display
const formatGrade = (grade: any): string => {
	const gradeValue = getGradeValue(grade);
	if (gradeValue == null) return '';
	return gradeValue.toFixed(0);
};

const MasterGradeSheet: React.FC<GradeMasterProps> = ({
	academicYear: currentAcademicYear,
	loading: parentLoading,
	error: parentError,
	teacherInfo,
}) => {
	const { user: userInfo } = useAuth();
	const currentSchool = useSchoolStore((state) => state.school);
	const effectiveUser = teacherInfo || userInfo;

	const getClassMetaById = (classId: string) => {
		if (!classId || !currentSchool?.classLevels) return null;
		for (const [session, levels] of Object.entries(currentSchool.classLevels)) {
			if (!levels || typeof levels !== 'object') continue;
			for (const [level, levelData] of Object.entries(levels)) {
				if (!levelData?.classes || !Array.isArray(levelData.classes)) continue;
				const found = levelData.classes.find(
					(cls: any) => cls.classId === classId
				);
				if (found) return { ...found, session, level };
			}
		}
		return null;
	};

	// Helper functions for options per role
	const getAllSessions = () =>
		currentSchool?.classLevels ? Object.keys(currentSchool.classLevels) : [];
	const getTeacherSessions = () => {
		const yearData = (effectiveUser?.subjects || []).find(
			(s) => s.year === selectedAcademicYear
		);
		if (!yearData?.classes) return [];
		const sessions = yearData.classes
			.map((c) => getClassMetaById(c.classId)?.session)
			.filter(Boolean) as string[];
		return Array.from(new Set(sessions));
	};

	const getAllClassLevels = (session: string) => {
		if (!currentSchool?.classLevels?.[session]) return [];
		return Object.keys(currentSchool.classLevels[session]);
	};
	const getTeacherClassLevels = (session: string) => {
		const yearData = (effectiveUser?.subjects || []).find(
			(s) => s.year === selectedAcademicYear
		);
		if (!yearData?.classes) return [];
		const levels = yearData.classes
			.map((c) => getClassMetaById(c.classId))
			.filter((meta) => meta?.session === session)
			.map((meta) => meta?.level)
			.filter(Boolean) as string[];
		return Array.from(new Set(levels));
	};

	const getAllClasses = (session: string, level: string) => {
		return currentSchool?.classLevels?.[session]?.[level]?.classes || [];
	};
	const getTeacherClasses = (session: string, level: string) => {
		const yearData = (effectiveUser?.subjects || []).find(
			(s) => s.year === selectedAcademicYear
		);
		if (!yearData?.classes) return [];
		const classIds = yearData.classes
			.map((c) => c.classId)
			.filter((id) => {
				const meta = getClassMetaById(id);
				return meta?.session === session && meta?.level === level;
			});
		return classIds
			.map((id) => getClassMetaById(id))
			.filter(Boolean) as any[];
	};

	const getAllSubjects = (session: string, level: string) => {
		return (
			currentSchool?.classLevels?.[session]?.[level]?.subjects?.map(
				(s: any) => s.name
			) || []
		);
	};
	const getTeacherSubjects = (session: string, level: string) => {
		const yearData = (effectiveUser?.subjects || []).find(
			(s) => s.year === selectedAcademicYear
		);
		if (!yearData?.classes) return [];
		const subjects = new Set<string>();
		yearData.classes.forEach((c) => {
			const meta = getClassMetaById(c.classId);
			if (meta?.session === session && meta?.level === level) {
				(c.subjects || []).forEach((s) => subjects.add(s));
			}
		});
		return Array.from(subjects);
	};

	// -- Academic Years --
	const availableAcademicYears = useMemo(() => {
		const schoolYears =
			currentSchool?.settings?.teacherSettings?.viewMastersAcademicYears ||
			(currentSchool?.firstAcademicYear
				? [currentSchool.firstAcademicYear]
				: []);
		if (effectiveUser?.role !== 'teacher') return schoolYears;
		const teacherYears =
			effectiveUser?.subjects?.map((s) => s.year).filter(Boolean) || [];
		return schoolYears.filter((year) => teacherYears.includes(year));
	}, [currentSchool, effectiveUser]);

	const normalizeAcademicYear = (value?: string) => {
		if (!value) return '';
		return value.replace('/', '-');
	};

	const [selectedAcademicYear, setSelectedAcademicYear] = useState(
		normalizeAcademicYear(currentAcademicYear)
	);
	const [selectedSession, setSelectedSession] = useState('');
	const [selectedLevel, setSelectedLevel] = useState('');
	const [selectedClass, setSelectedClass] = useState('');
	const [selectedSubject, setSelectedSubject] = useState('');

	// --- Available options for each filter (dynamic per role) ---
	const sessions = useMemo(
		() =>
			effectiveUser?.role === 'system_admin'
				? getAllSessions()
				: getTeacherSessions(),
		[effectiveUser, currentSchool, selectedAcademicYear]
	);
	const classLevels = useMemo(() => {
		if (!selectedSession) return [];
		return effectiveUser?.role === 'system_admin'
			? getAllClassLevels(selectedSession)
			: getTeacherClassLevels(selectedSession);
	}, [selectedSession, effectiveUser, currentSchool, selectedAcademicYear]);
	const classes = useMemo(() => {
		if (!selectedSession || !selectedLevel) return [];
		return effectiveUser?.role === 'system_admin'
			? getAllClasses(selectedSession, selectedLevel)
			: getTeacherClasses(selectedSession, selectedLevel);
	}, [
		selectedSession,
		selectedLevel,
		effectiveUser,
		currentSchool,
		selectedAcademicYear,
	]);
	const subjects = useMemo(() => {
		if (!selectedSession || !selectedLevel) return [];
		return effectiveUser?.role === 'system_admin'
			? getAllSubjects(selectedSession, selectedLevel)
			: getTeacherSubjects(selectedSession, selectedLevel);
	}, [
		selectedSession,
		selectedLevel,
		effectiveUser,
		currentSchool,
		selectedAcademicYear,
	]);

	// --- Auto-select and hide filter logic (per role) ---
	useEffect(() => {
		if (availableAcademicYears.length === 1)
			setSelectedAcademicYear(normalizeAcademicYear(availableAcademicYears[0]));
		else if (
			!availableAcademicYears.some(
				(year) =>
					normalizeAcademicYear(year) ===
					normalizeAcademicYear(selectedAcademicYear)
			)
		)
			setSelectedAcademicYear(normalizeAcademicYear(availableAcademicYears[0]) || '');
	}, [availableAcademicYears, selectedAcademicYear]);

	useEffect(() => {
		if (sessions.length === 1) setSelectedSession(sessions[0]);
	}, [sessions]);

	useEffect(() => {
		if (classLevels.length === 1) setSelectedLevel(classLevels[0]);
	}, [classLevels]);

	useEffect(() => {
		if (classes.length === 1) setSelectedClass(classes[0].classId);
	}, [classes]);

	// THIS FIX: if only one subject, auto-select it and reset if invalid!
	useEffect(() => {
		if (subjects.length === 1) setSelectedSubject(subjects[0]);
		else if (!subjects.includes(selectedSubject)) setSelectedSubject('');
	}, [subjects, selectedSubject]);

	// Reset logic when parent filter changes
	const handleAcademicYearChange = (v: string) => {
		setSelectedAcademicYear(normalizeAcademicYear(v));
		setSelectedSession('');
		setSelectedLevel('');
		setSelectedClass('');
		setSelectedSubject('');
	};
	const handleSessionChange = (v: string) => {
		setSelectedSession(v);
		setSelectedLevel('');
		setSelectedClass('');
		setSelectedSubject('');
	};
	const handleLevelChange = (v: string) => {
		setSelectedLevel(v);
		setSelectedClass('');
		setSelectedSubject('');
	};
	const handleClassChange = (v: string) => {
		setSelectedClass(v);
		setSelectedSubject('');
	};
	const handleSubjectChange = (v: string) => {
		setSelectedSubject(v);
	};

	// ----------- DATA FETCHING LOGIC -----------
	const [studentsData, setStudentsData] = useState<Student[]>([]);
	const [gradesData, setGradesData] = useState<any[]>([]);
	const [combinedData, setCombinedData] = useState<Student[]>([]);
	const [pdfKey, setPdfKey] = useState(0);
	const [loading, setLoading] = useState({
		students: false,
		grades: false,
		subjects: false,
	});
	const [error, setError] = useState({
		students: '',
		grades: '',
		subjects: '',
	});

	const combineStudentsAndGrades = (
		students: Student[],
		grades: any[]
	) => {
		const gradesMap = new Map<string, Record<string, any>>();
		if (Array.isArray(grades)) {
			grades.forEach((grade) => {
				if (!gradesMap.has(grade.studentId)) {
					gradesMap.set(grade.studentId, {});
				}
				gradesMap.get(grade.studentId)![grade.period] = {
					grade: grade.grade,
					status: grade.status,
				};
			});
		}
		return students.map((student) => ({
			...student,
			periods: gradesMap.get(student.studentId) || {},
		}));
	};

	useEffect(() => {
		if (selectedClass) {
			const fetchStudents = async () => {
				setLoading((prev) => ({ ...prev, students: true }));
				setError((prev) => ({ ...prev, students: '' }));
				try {
					const res = await fetch(
						`/api/users?role=student&academicYear=${normalizeAcademicYear(
							selectedAcademicYear
						)}&classId=${selectedClass}`
					);
					if (!res.ok) {
						throw new Error('Failed to fetch students');
					}
					const data = await res.json();
					if (data.success) {
						const students = data.data.map((student: any) => ({
							studentId: student.studentId || student.id || student._id,
							studentName: `${student.firstName} ${student.lastName}`.trim(),
						}));
						setStudentsData(students);
					} else {
						throw new Error(data.message || 'Failed to fetch students');
					}
				} catch (err) {
					setError((prev) => ({
						...prev,
						students: 'Failed to load students.',
					}));
					console.error('Error fetching students:', err);
					setStudentsData([]);
				} finally {
					setLoading((prev) => ({ ...prev, students: false }));
				}
			};
			fetchStudents();
		} else {
			setStudentsData([]);
		}
	}, [selectedAcademicYear, selectedClass]);

	useEffect(() => {
		if (selectedClass && selectedSubject) {
			const fetchGrades = async () => {
				setLoading((prev) => ({ ...prev, grades: true }));
				setError((prev) => ({ ...prev, grades: '' }));
				try {
					const res = await fetch(
						`/api/grades?academicYear=${normalizeAcademicYear(
							selectedAcademicYear
						)}&classId=${selectedClass}&subject=${selectedSubject}`
					);
					if (!res.ok) {
						throw new Error('Failed to fetch grades');
					}
					const data = await res.json();
					if (data.success) {
						setGradesData(
							Array.isArray(data.data?.grades) ? data.data.grades : []
						);
					} else {
						throw new Error('API returned unsuccessful response');
					}
				} catch (err) {
					setError((prev) => ({ ...prev, grades: 'Failed to load grades.' }));
					console.error('Error fetching grades:', err);
					setGradesData([]);
				} finally {
					setLoading((prev) => ({ ...prev, grades: false }));
				}
			};
			fetchGrades();
		} else {
			setGradesData([]);
		}
	}, [selectedAcademicYear, selectedClass, selectedSubject]);

	useEffect(() => {
		if (studentsData.length > 0) {
			const combined = combineStudentsAndGrades(studentsData, gradesData || []);
			setCombinedData(combined);
			setPdfKey((prev) => prev + 1);
		} else {
			setCombinedData([]);
			setPdfKey((prev) => prev + 1);
		}
	}, [studentsData, gradesData]);

	useEffect(() => {
		setPdfKey((prev) => prev + 1);
	}, [selectedClass, selectedSubject]);

	const getGradeColor = (grade: number | null) => {
		if (grade == null) return 'text-muted-foreground';
		return grade >= (currentSchool?.settings?.gradingSettings?.passMark ?? 70)
			? 'text-primary font-semibold'
			: 'text-destructive font-semibold';
	};

	const getGradeStats = () => {
		return periods.reduce((stats, period) => {
			if (!combinedData.length) {
				stats[period.value] = {
					passes: 0,
					fails: 0,
					incompletes: 0,
					classAverage: 0,
				};
				return stats;
			}
			let passes = 0,
				fails = 0,
				incompletes = 0,
				total = 0,
				sum = 0;
			combinedData.forEach((student) => {
				const grade = getGradeValue(student.periods?.[period.value]);
				if (grade != null) {
					total++;
					sum += grade;
					grade >= (currentSchool?.settings?.gradingSettings?.passMark ?? 70)
						? passes++
						: fails++;
				} else {
					incompletes++;
				}
			});
			stats[period.value] = {
				passes,
				fails,
				incompletes,
				classAverage: total > 0 ? sum / total : 0,
			};
			return stats;
		}, {} as any);
	};

	const stats = getGradeStats();
	const statRows = [
		{
			label: 'Number of Passes',
			key: 'passes',
			className: 'font-semibold text-primary',
		},
		{
			label: 'Number of Fails',
			key: 'fails',
			className: 'font-semibold text-destructive',
		},
		{
			label: 'Number of Incompletes',
			key: 'incompletes',
			className: 'font-semibold text-muted-foreground',
		},
		{ label: 'Class Average', key: 'classAverage', className: '' },
	];

	const isLoading = loading.students || loading.grades || loading.subjects;
	const hasError = error.students || error.grades || error.subjects;
	const errorMessage = error.students || error.grades || error.subjects;

	if (parentLoading) return <PageLoading fullScreen={false} />;
	if (parentError)
		return (
			<div className="text-center text-destructive py-8">{parentError}</div>
		);
	if (!effectiveUser) {
		return (
			<div className="text-center text-muted-foreground py-8">
				User information is not available. Please refresh the page.
			</div>
		);
	}
	if (
		effectiveUser.role === 'teacher' &&
		(!effectiveUser.subjects || effectiveUser.subjects.length === 0)
	) {
		return (
			<div className="text-center text-muted-foreground py-8">
				You have not been assigned to any subjects. Please contact the
				administrator.
			</div>
		);
	}
	if (!currentSchool?.classLevels) {
		return (
			<div className="text-center text-muted-foreground py-8">
				School profile data is not available. Please contact the administrator.
			</div>
		);
	}

	// --- Filter visibility ---
	const showAcademicYearFilter = availableAcademicYears.length > 1;
	const showSessionFilter = sessions.length > 1;
	const showLevelFilter = classLevels.length > 1;
	const showClassFilter = classes.length > 1;
	const showSubjectFilter = subjects.length > 1;

	return (
		<div className="space-y-6">
			<div className="p-6 bg-card border rounded-lg shadow-sm">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
					<h3 className="text-xl font-semibold text-card-foreground">
						Master Grade Sheet
						{effectiveUser?.role === 'system_admin' && (
							<span className="ml-2 text-sm text-muted-foreground font-normal">
								(Admin View - All Access)
							</span>
						)}
					</h3>
					<p className="text-sm text-muted-foreground mt-1 sm:mt-0">
						{effectiveUser?.role === 'system_admin'
							? 'View grades for any class and subject.'
							: 'View all grades for your assigned classes and subjects.'}
					</p>
				</div>
				<div
					className={`grid grid-cols-1 gap-4 ${
						[
							showAcademicYearFilter,
							showSessionFilter,
							showLevelFilter,
							showClassFilter,
							showSubjectFilter,
						].filter(Boolean).length > 2
							? 'md:grid-cols-2 lg:grid-cols-4'
							: 'md:grid-cols-2'
					}`}
				>
					{showAcademicYearFilter && (
						<div>
							<label
								htmlFor="academic-year-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Academic Year
							</label>
							<select
								id="academic-year-select"
								value={selectedAcademicYear}
								onChange={(e) => handleAcademicYearChange(e.target.value)}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
							>
								<option value="">Select Year</option>
								{availableAcademicYears.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						</div>
					)}
					{showSessionFilter && (
						<div>
							<label
								htmlFor="session-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Session
							</label>
							<select
								id="session-select"
								value={selectedSession}
								onChange={(e) => handleSessionChange(e.target.value)}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
							>
								<option value="">Select Session</option>
								{sessions.map((session) => (
									<option key={session} value={session}>
										{session}
									</option>
								))}
							</select>
						</div>
					)}
					{showLevelFilter && (
						<div>
							<label
								htmlFor="master-class-level-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Class Level
							</label>
							<select
								id="master-class-level-select"
								value={selectedLevel}
								onChange={(e) => handleLevelChange(e.target.value)}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm disabled:opacity-50"
								disabled={showSessionFilter && !selectedSession}
							>
								<option value="">Select Level</option>
								{classLevels.map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
						</div>
					)}
					{showClassFilter && (
						<div>
							<label
								htmlFor="master-class-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Class
							</label>
							<select
								id="master-class-select"
								value={selectedClass}
								onChange={(e) => handleClassChange(e.target.value)}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm disabled:opacity-50"
								disabled={
									(showSessionFilter && !selectedSession) ||
									(showLevelFilter && !selectedLevel)
								}
							>
								<option value="">Select Class</option>
								{classes.map((cls: any) => (
									<option key={cls.classId} value={cls.classId}>
										{cls.name}
									</option>
								))}
							</select>
						</div>
					)}
					{showSubjectFilter && (
						<div>
							<label
								htmlFor="master-subject-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Subject
							</label>
							<select
								id="master-subject-select"
								value={selectedSubject}
								onChange={(e) => handleSubjectChange(e.target.value)}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm disabled:opacity-50"
								disabled={
									(showSessionFilter && !selectedSession) ||
									(showLevelFilter && !selectedLevel) ||
									(showClassFilter && !selectedClass)
								}
							>
								<option value="">Select Subject</option>
								{subjects.map((sub) => (
									<option key={sub} value={sub}>
										{sub}
									</option>
								))}
							</select>
						</div>
					)}
				</div>
			</div>
			{selectedClass && selectedSubject && (
				<div className="bg-card border rounded-lg p-4 sm:p-6 shadow-sm min-w-0">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
						<h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
							Sheet for{' '}
							{classes.find((cls: any) => cls.classId === selectedClass)
								?.name ||
								(studentsData.length > 0
									? studentsData[0].studentName.split(' ').slice(0, 2).join(' ')
									: selectedClass)}{' '}
							- {selectedSubject}
						</h3>
						<div className="mt-2 sm:mt-0">
							{combinedData.length > 0 && (
								<GradesPDFDownload
									key={pdfKey}
									disabled={isLoading}
									teacherInfo={effectiveUser}
									gradeData={{
										grades: gradesData,
										students: combinedData.map((student) => ({
											...student,
											periods: Object.fromEntries(
												Object.entries(student.periods || {}).map(
													([key, value]: [string, any]) => [
														key,
														getGradeValue(value),
													]
												)
											),
										})),
									}}
									className={
										classes.find((cls: any) => cls.classId === selectedClass)
											?.name || selectedClass
									}
									classLevel={selectedLevel}
									subject={selectedSubject}
									academicYear={selectedAcademicYear}
								/>
							)}
						</div>
					</div>
					{isLoading ? (
						<PageLoading fullScreen={false} />
					) : hasError ? (
						<div className="text-destructive">{errorMessage}</div>
					) : combinedData.length > 0 ? (
						<div
							className="relative overflow-x-auto border rounded-lg custom-scrollbar"
							style={{ maxHeight: '70vh' }}
						>
							<table className="table-fixed w-full divide-y divide-border">
								<thead className="bg-muted">
									<tr>
										<th
											scope="col"
											className="sticky top-0 left-0 z-30 bg-muted px-3 sm:px-6 py-3 text-left font-medium text-muted-foreground uppercase tracking-wider border-r border-border text-xs w-[140px] sm:w-[200px]"
										>
											Student Name
										</th>
										{periods.map((p) => (
											<th
												key={p.id}
												scope="col"
												className="sticky top-0 z-20 bg-muted px-3 sm:px-6 py-3 text-center font-medium text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0 text-xs w-[90px] sm:w-[120px]"
											>
												{p.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-border bg-background">
									{combinedData.map((student) => (
										<tr key={student.studentId}>
											<td className="sticky left-0 z-10 bg-card px-3 sm:px-6 py-4 font-medium text-foreground whitespace-nowrap border-r border-border text-sm">
												{student.studentName}
											</td>
											{periods.map((p) => {
												const grade = student.periods?.[p.value];
												const gradeValue = getGradeValue(grade);
												return (
													<td
														key={`${student.studentId}-${p.id}`}
														className="px-3 sm:px-6 py-4 text-center whitespace-nowrap border-r border-border last:border-r-0 text-sm"
													>
														<span className={getGradeColor(gradeValue)}>
															{formatGrade(grade)}
														</span>
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
								<tfoot className="border-t-2 border-border">
									{statRows.map((row) => (
										<tr key={row.key}>
											<th
												scope="row"
												className="sticky left-0 z-10 bg-muted px-3 sm:px-6 py-3 text-left font-semibold text-foreground border-r border-border text-sm"
											>
												{row.label}
											</th>
											{periods.map((p) => {
												const statValue = stats[p.value]?.[row.key];
												return (
													<td
														key={`${row.key}-${p.id}`}
														className="px-3 sm:px-6 py-3 text-center font-semibold whitespace-nowrap border-r border-border last:border-r-0 bg-muted/50 text-sm"
													>
														<span
															className={
																row.key === 'classAverage'
																	? getGradeColor(statValue ?? 0)
																	: row.className
															}
														>
															{row.key === 'classAverage'
																? statValue > 0
																	? statValue.toFixed(1)
																	: ''
																: statValue ?? 0}
														</span>
													</td>
												);
											})}
										</tr>
									))}
								</tfoot>
							</table>
						</div>
					) : studentsData.length > 0 ? (
						<div className="p-6 text-center text-muted-foreground">
							Students loaded ({studentsData.length} students) but no grades
							data available.
						</div>
					) : (
						<div className="p-6 text-center text-muted-foreground">
							{loading.students
								? 'Loading students...'
								: 'No students found for the selected class.'}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default MasterGradeSheet;
