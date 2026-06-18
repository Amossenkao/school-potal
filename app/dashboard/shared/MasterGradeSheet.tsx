'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import GradesPDFDownload from './GradesPDFDownload';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
import { PageLoading } from '@/components/loading';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
	normalizeAcademicYear as normalizeAcademicYearValue,
} from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	getTeacherAcademicYears,
	pickCurrentOrMostRecentAcademicYear,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';

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
	subjects?: {
		year: string;
		classes: { classId: string; subjects: string[] }[];
	}[];
	sponsorClass?: string | null;
}
interface GradeMasterProps {
	academicYear: string;
	loading: boolean;
	error: string;
	teacherInfo?: UserInfo | null;
}

const periods = [
	{ id: 'first', label: '1st Pd', value: 'first' },
	{ id: 'second', label: '2nd Pd', value: 'second' },
	{ id: 'third', label: '3rd Pd', value: 'third' },
	{ id: 'third_exam', label: '3rd Pd Exam', value: 'third_period_exam' },
	{ id: 'fourth', label: '4th Pd', value: 'fourth' },
	{ id: 'fifth', label: '5th Pd', value: 'fifth' },
	{ id: 'sixth', label: '6th Pd', value: 'sixth' },
	{ id: 'sixth_exam', label: '6th Pd Exam', value: 'sixth_period_exam' },
];

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

const PASS_MARK = 70;
const PASS_GRADE_CLASS = 'text-[var(--grade-pass)] font-semibold';
const FAIL_GRADE_CLASS = 'text-[var(--grade-fail)] font-semibold';
const ALL_CLASSES_VALUE = '__all_classes__';
const ALL_SUBJECTS_VALUE = '__all_subjects__';

const MasterGradeSheet: React.FC<GradeMasterProps> = ({
	academicYear: currentAcademicYear,
	loading: parentLoading,
	error: parentError,
	teacherInfo,
}) => {
	const userInfo = useAuth((state) => state.user);
	const currentSchool = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const gradesByAcademicYear = useSchoolStore(
		(state) => state.gradesByAcademicYear,
	);
	const mergeGradesForYear = useSchoolStore((state) => state.mergeGradesForYear);
	const usersByAcademicYearRef = useRef(usersByAcademicYear);
	const gradesByAcademicYearRef = useRef(gradesByAcademicYear);
	const { isOnline } = useNetworkStore();
	const effectiveUser = (teacherInfo || userInfo) as UserInfo | null;
	const schoolCurrentAcademicYear =
		currentSchool?.currentAcademicYear || currentAcademicYear;

	useEffect(() => {
		usersByAcademicYearRef.current = usersByAcademicYear;
	}, [usersByAcademicYear]);

	useEffect(() => {
		gradesByAcademicYearRef.current = gradesByAcademicYear;
	}, [gradesByAcademicYear]);

	const getClassMetaById = (classId: string) => {
		if (!classId || !currentSchool?.classLevels) return null;
		for (const [session, levels] of Object.entries(currentSchool.classLevels)) {
			if (!levels || typeof levels !== 'object') continue;
			for (const [level, levelData] of Object.entries(levels)) {
				if (!levelData?.classes || !Array.isArray(levelData.classes)) continue;
				const found = levelData.classes.find(
					(cls: any) => cls.classId === classId,
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
		const yearData = (effectiveUser?.subjects || []).find((s) =>
			areAcademicYearsEqual(s.year, selectedAcademicYear),
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
		const yearData = (effectiveUser?.subjects || []).find((s) =>
			areAcademicYearsEqual(s.year, selectedAcademicYear),
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
		const yearData = (effectiveUser?.subjects || []).find((s) =>
			areAcademicYearsEqual(s.year, selectedAcademicYear),
		);
		if (!yearData?.classes) return [];
		const classIds = yearData.classes
			.map((c) => c.classId)
			.filter((id) => {
				const meta = getClassMetaById(id);
				return meta?.session === session && meta?.level === level;
			});
		return classIds.map((id) => getClassMetaById(id)).filter(Boolean) as any[];
	};

	const getAllSubjects = (session: string, level: string) => {
		return (
			currentSchool?.classLevels?.[session]?.[level]?.subjects?.map(
				(s: any) => s.name,
			) || []
		);
	};
	const getTeacherSubjects = (session: string, level: string) => {
		const yearData = (effectiveUser?.subjects || []).find((s) =>
			areAcademicYearsEqual(s.year, selectedAcademicYear),
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
		const schoolYears = buildSchoolAcademicYearRange(currentSchool);
		if (effectiveUser?.role !== 'teacher') return schoolYears;
		return getTeacherAcademicYears(effectiveUser);
	}, [currentSchool, effectiveUser]);

	const allowedAcademicYears = useMemo(
		() =>
			sortAcademicYearsDesc(
				currentSchool?.settings?.teacherSettings?.viewMastersAcademicYears ||
					[],
			),
		[currentSchool],
	);

	const normalizeAcademicYear = (value?: string) => {
		return normalizeAcademicYearValue(value);
	};

	const defaultAcademicYear = useMemo(() => {
		if (effectiveUser?.role === 'teacher') {
			return pickMostRecentAcademicYear(availableAcademicYears) || '';
		}
		return (
			pickCurrentOrMostRecentAcademicYear(
				availableAcademicYears,
				schoolCurrentAcademicYear,
			) || ''
		);
	}, [availableAcademicYears, schoolCurrentAcademicYear, effectiveUser?.role]);

	const [selectedAcademicYear, setSelectedAcademicYear] = useState(
		normalizeAcademicYear(defaultAcademicYear),
	);
	const [selectedSession, setSelectedSession] = useState('');
	const [selectedLevel, setSelectedLevel] = useState('');
	const [selectedClass, setSelectedClass] = useState('');
	const [selectedSubject, setSelectedSubject] = useState('');
	const [activeClassIndex, setActiveClassIndex] = useState(0);
	const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
	const isSelectedAcademicYearAllowed = useMemo(() => {
		if (effectiveUser?.role !== 'teacher') return true;
		if (!selectedAcademicYear) return false;
		return allowedAcademicYears.some((year) =>
			areAcademicYearsEqual(year, selectedAcademicYear),
		);
	}, [effectiveUser?.role, selectedAcademicYear, allowedAcademicYears]);

	// --- Available options for each filter (dynamic per role) ---
	const sessions = useMemo(
		() =>
			effectiveUser?.role === 'system_admin'
				? getAllSessions()
				: getTeacherSessions(),
		[effectiveUser, currentSchool, selectedAcademicYear],
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

	const isSelfContainedLevel =
		String(selectedLevel || '')
			.trim()
			.toLowerCase() === 'self contained';

	const resolvedTeacher = useMemo(() => {
		const classId =
			selectedClass === ALL_CLASSES_VALUE
				? classes[activeClassIndex]?.classId
				: selectedClass;
		if (!classId || !selectedSubject) return effectiveUser;
		const yearKey = selectedAcademicYear;
		const scopedUsers = getScopedAcademicYearValue(
			usersByAcademicYear,
			yearKey,
		).value;
		const yearTeachers = scopedUsers?.teachers || [];
		const matchesYear = (year?: string) =>
			areAcademicYearsEqual(year, selectedAcademicYear);
		const match = yearTeachers.find((teacher: any) =>
			(teacher?.subjects || []).some(
				(s: any) =>
					matchesYear(s?.year) &&
					(s?.classes || []).some(
						(c: any) =>
							c?.classId === classId &&
							Array.isArray(c?.subjects) &&
							c.subjects.includes(selectedSubject),
					),
			),
		);
		return match || effectiveUser;
	}, [
		usersByAcademicYear,
		selectedAcademicYear,
		selectedClass,
		classes,
		activeClassIndex,
		selectedSubject,
		effectiveUser,
	]);

	// --- Auto-select and hide filter logic (per role) ---
	useEffect(() => {
		const isSelectedYearAvailable = availableAcademicYears.some((year) =>
			areAcademicYearsEqual(year, selectedAcademicYear),
		);
		if (!selectedAcademicYear || !isSelectedYearAvailable) {
			setSelectedAcademicYear(normalizeAcademicYear(defaultAcademicYear));
		}
	}, [availableAcademicYears, defaultAcademicYear, selectedAcademicYear]);

	useEffect(() => {
		if (sessions.length === 1) setSelectedSession(sessions[0]);
	}, [sessions]);

	useEffect(() => {
		if (classLevels.length === 1) setSelectedLevel(classLevels[0]);
	}, [classLevels]);

	useEffect(() => {
		if (classes.length === 1) setSelectedClass(classes[0].classId);
	}, [classes]);

	useEffect(() => {
		if (isSelfContainedLevel && selectedClass === ALL_CLASSES_VALUE) {
			setSelectedClass('');
		}
	}, [isSelfContainedLevel, selectedClass]);

	useEffect(() => {
		if (selectedClass === ALL_CLASSES_VALUE) {
			setActiveClassIndex(0);
			return;
		}
		setActiveClassIndex(0);
	}, [selectedClass, selectedSession, selectedLevel, selectedAcademicYear]);

	useEffect(() => {
		if (selectedClass !== ALL_CLASSES_VALUE) return;
		if (classes.length === 0) {
			setActiveClassIndex(0);
			return;
		}
		if (activeClassIndex >= classes.length) {
			setActiveClassIndex(0);
		}
	}, [selectedClass, classes, activeClassIndex]);

	useEffect(() => {
		if (selectedSubject === ALL_SUBJECTS_VALUE) {
			setActiveSubjectIndex(0);
			return;
		}
		setActiveSubjectIndex(0);
	}, [selectedSubject, selectedSession, selectedLevel, selectedClass]);

	useEffect(() => {
		if (selectedSubject !== ALL_SUBJECTS_VALUE) return;
		if (subjects.length === 0) {
			setActiveSubjectIndex(0);
			return;
		}
		if (activeSubjectIndex >= subjects.length) {
			setActiveSubjectIndex(0);
		}
	}, [selectedSubject, subjects, activeSubjectIndex]);

	// THIS FIX: if only one subject, auto-select it and reset if invalid!
	useEffect(() => {
		if (subjects.length === 1) setSelectedSubject(subjects[0]);
		else if (
			selectedSubject &&
			selectedSubject !== ALL_SUBJECTS_VALUE &&
			!subjects.includes(selectedSubject)
		) {
			setSelectedSubject('');
		}
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
	const [allClassesData, setAllClassesData] = useState<
		{ classId: string; className: string; students: Student[]; grades: any[] }[]
	>([]);
	const [allSubjectsData, setAllSubjectsData] = useState<
		{ subject: string; students: Student[]; grades: any[] }[]
	>([]);
	const activeClassData = useMemo(() => {
		if (selectedClass !== ALL_CLASSES_VALUE) return null;
		if (!Array.isArray(allClassesData) || allClassesData.length === 0)
			return null;
		return allClassesData[activeClassIndex] || null;
	}, [selectedClass, allClassesData, activeClassIndex]);
	const [pdfReady, setPdfReady] = useState(false);
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

	const pdfGradeData = useMemo(() => {
		if (selectedClass === ALL_CLASSES_VALUE) {
			return {
				multiClass: allClassesData.map((entry) => ({
					classId: entry.classId,
					className: entry.className,
					students: entry.students.map((student) => ({
						...student,
						periods: Object.fromEntries(
							Object.entries(student.periods || {}).map(
								([key, value]: [string, any]) => [key, getGradeValue(value)],
							),
						),
					})),
				})),
			};
		}
		if (selectedSubject === ALL_SUBJECTS_VALUE) {
			return {
				multiSubject: allSubjectsData.map((entry) => ({
					subject: entry.subject,
					students: entry.students.map((student) => ({
						...student,
						periods: Object.fromEntries(
							Object.entries(student.periods || {}).map(
								([key, value]: [string, any]) => [key, getGradeValue(value)],
							),
						),
					})),
				})),
			};
		}
		return {
			grades: gradesData,
			students: combinedData.map((student) => ({
				...student,
				periods: Object.fromEntries(
					Object.entries(student.periods || {}).map(
						([key, value]: [string, any]) => [key, getGradeValue(value)],
					),
				),
			})),
		};
	}, [
		gradesData,
		combinedData,
		selectedClass,
		selectedSubject,
		allClassesData,
		allSubjectsData,
	]);

	const combineStudentsAndGrades = (students: Student[], grades: any[]) => {
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

	const getStudentClassIdForYear = (student: any, academicYear: string) => {
		const yearEntry = Array.isArray(student?.academicYears)
			? student.academicYears.find((ay: any) =>
					areAcademicYearsEqual(ay?.year, academicYear),
				)
			: null;
		return (
			yearEntry?.classId ||
			student?.historicalClass?.classId ||
			student?.classId ||
			''
		);
	};

	const mapStudentRecord = (student: any): Student | null => {
		const studentId =
			student?.studentId ||
			student?.id ||
			student?._id ||
			student?.username ||
			'';
		if (!studentId) return null;
		const studentName =
			student?.studentName ||
			`${student?.firstName || ''} ${student?.lastName || ''}`.trim() ||
			student?.username ||
			student?.studentId ||
			String(studentId);
		return {
			studentId: String(studentId),
			studentName: String(studentName),
		};
	};

	const extractStudentsPayload = (data: any) => {
		if (Array.isArray(data?.data)) return data.data;
		if (Array.isArray(data?.data?.students)) return data.data.students;
		if (Array.isArray(data?.students)) return data.students;
		return [];
	};

	const getCachedStudentsForClass = (
		normalizedYear: string,
		classId: string,
	) => {
		const usersByYear = usersByAcademicYearRef.current || {};
		const scopedUsers = getScopedAcademicYearValue(
			usersByYear,
			normalizedYear,
		).value;
		const cachedUsers = Array.isArray(scopedUsers?.students)
			? scopedUsers.students
			: [];
		return cachedUsers
			.filter(
				(student: any) =>
					getStudentClassIdForYear(student, normalizedYear) === classId,
			)
			.map(mapStudentRecord)
			.filter(Boolean) as Student[];
	};

	const getCachedGradesForClass = (
		normalizedYear: string,
		classId: string,
		subject: string,
	) => {
		const gradesByYear = gradesByAcademicYearRef.current || {};
		const scopedGrades = getScopedAcademicYearValue(
			gradesByYear,
			normalizedYear,
		).value;
		const cachedGrades = Array.isArray(scopedGrades) ? scopedGrades : [];
		return cachedGrades.filter(
			(grade: any) =>
				grade?.classId === classId &&
				grade?.subject === subject &&
				areAcademicYearsEqual(grade?.academicYear, normalizedYear),
		);
	};

	useEffect(() => {
		if (effectiveUser?.role === 'teacher' && !isSelectedAcademicYearAllowed) {
			setStudentsData([]);
			setLoading((prev) => ({ ...prev, students: false }));
			setError((prev) => ({ ...prev, students: '' }));
			return;
		}
		if (selectedClass === ALL_CLASSES_VALUE) {
			return;
		}
		if (selectedSubject === ALL_SUBJECTS_VALUE) {
			return;
		}
		const activeClassId =
			selectedClass === ALL_CLASSES_VALUE
				? classes[activeClassIndex]?.classId || ''
				: selectedClass;
		if (activeClassId) {
			const fetchStudents = async () => {
				setError((prev) => ({ ...prev, students: '' }));
				try {
					const normalizedYear = normalizeAcademicYear(selectedAcademicYear);
					const filteredCachedStudents = getCachedStudentsForClass(
						normalizedYear,
						activeClassId,
					);

					if (filteredCachedStudents.length > 0) {
						setStudentsData(filteredCachedStudents);
						setLoading((prev) => ({ ...prev, students: false }));
						return;
					}

					if (!isOnline) {
						setStudentsData(filteredCachedStudents);
						setLoading((prev) => ({ ...prev, students: false }));
						return;
					}

					setLoading((prev) => ({ ...prev, students: true }));
					const res = await fetch(
						`/api/users?role=student&academicYear=${normalizedYear}&classId=${activeClassId}&limit=50000`,
					);
					if (!res.ok) {
						throw new Error('Failed to fetch students');
					}
					const data = await res.json();
					if (data.success) {
						const mappedStudents = extractStudentsPayload(data)
							.map(mapStudentRecord)
							.filter(Boolean) as Student[];
						setStudentsData(mappedStudents);
					} else {
						throw new Error(data.message || 'Failed to fetch students');
					}
				} catch (err) {
					const normalizedYear = normalizeAcademicYear(selectedAcademicYear);
					const filteredCachedStudents = getCachedStudentsForClass(
						normalizedYear,
						activeClassId,
					);
					if (filteredCachedStudents.length > 0) {
						setStudentsData(filteredCachedStudents);
						setError((prev) => ({ ...prev, students: '' }));
						setLoading((prev) => ({ ...prev, students: false }));
						return;
					}
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
	}, [
		selectedAcademicYear,
		selectedClass,
		classes,
		activeClassIndex,
		isOnline,
		usersByAcademicYear,
		effectiveUser?.role,
		isSelectedAcademicYearAllowed,
	]);

	useEffect(() => {
		if (effectiveUser?.role === 'teacher' && !isSelectedAcademicYearAllowed) {
			setGradesData([]);
			setLoading((prev) => ({ ...prev, grades: false }));
			setError((prev) => ({ ...prev, grades: '' }));
			return;
		}
		if (selectedClass === ALL_CLASSES_VALUE) {
			return;
		}
		if (selectedSubject === ALL_SUBJECTS_VALUE) {
			return;
		}
		const activeClassId =
			selectedClass === ALL_CLASSES_VALUE
				? classes[activeClassIndex]?.classId || ''
				: selectedClass;
		if (activeClassId && selectedSubject) {
			const fetchGrades = async () => {
				setError((prev) => ({ ...prev, grades: '' }));
				try {
					const normalizedYear = normalizeAcademicYear(selectedAcademicYear);
					const filteredCachedGrades = getCachedGradesForClass(
						normalizedYear,
						activeClassId,
						selectedSubject,
					);

					if (filteredCachedGrades.length > 0) {
						setGradesData(filteredCachedGrades);
						setLoading((prev) => ({ ...prev, grades: false }));
						return;
					}

					if (!isOnline) {
						setGradesData(filteredCachedGrades);
						setLoading((prev) => ({ ...prev, grades: false }));
						return;
					}

					setLoading((prev) => ({ ...prev, grades: true }));
					const res = await fetch(
						`/api/grades?academicYear=${normalizedYear}&classId=${activeClassId}&subject=${selectedSubject}`,
					);
					if (!res.ok) {
						throw new Error('Failed to fetch grades');
					}
					const data = await res.json();
					if (data.success) {
						const incomingGrades = Array.isArray(data.data?.grades)
							? data.data.grades
							: [];
						setGradesData(incomingGrades);
						mergeGradesForYear(normalizedYear, incomingGrades);
					} else {
						throw new Error('API returned unsuccessful response');
					}
				} catch (err) {
					const normalizedYear = normalizeAcademicYear(selectedAcademicYear);
					const filteredCachedGrades = getCachedGradesForClass(
						normalizedYear,
						activeClassId,
						selectedSubject,
					);
					if (filteredCachedGrades.length > 0) {
						setGradesData(filteredCachedGrades);
						setError((prev) => ({ ...prev, grades: '' }));
						setLoading((prev) => ({ ...prev, grades: false }));
						return;
					}
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
	}, [
		selectedAcademicYear,
		selectedClass,
		selectedSubject,
		classes,
		activeClassIndex,
		isOnline,
		gradesByAcademicYear,
		effectiveUser?.role,
		isSelectedAcademicYearAllowed,
		mergeGradesForYear,
	]);

	useEffect(() => {
		if (effectiveUser?.role === 'teacher' && !isSelectedAcademicYearAllowed) {
			setAllClassesData([]);
			setLoading((prev) => ({ ...prev, subjects: false }));
			setError((prev) => ({ ...prev, subjects: '' }));
			return;
		}
		if (
			selectedClass !== ALL_CLASSES_VALUE ||
			isSelfContainedLevel ||
			!selectedSubject ||
			classes.length === 0
		) {
			setAllClassesData([]);
			setLoading((prev) => ({ ...prev, subjects: false }));
			return;
		}
		const fetchAllClassesData = async () => {
			setError((prev) => ({ ...prev, subjects: '' }));
			try {
				const normalizedYear = normalizeAcademicYear(selectedAcademicYear);
				setLoading((prev) => ({ ...prev, subjects: true }));
				const results = await Promise.all(
					classes.map(async (cls: any) => {
						const classId = cls.classId;
						const cachedStudents = getCachedStudentsForClass(
							normalizedYear,
							classId,
						);
						const cachedGrades = getCachedGradesForClass(
							normalizedYear,
							classId,
							selectedSubject,
						);
						let students = cachedStudents;
						let grades = cachedGrades;

						if (students.length === 0 && isOnline) {
							const res = await fetch(
								`/api/users?role=student&academicYear=${normalizedYear}&classId=${classId}&limit=50000`,
							);
							if (res.ok) {
								const data = await res.json();
								if (data.success) {
									students = extractStudentsPayload(data)
										.map(mapStudentRecord)
										.filter(Boolean) as Student[];
								}
							}
						}

						if (grades.length === 0 && isOnline) {
							const res = await fetch(
								`/api/grades?academicYear=${normalizedYear}&classId=${classId}&subject=${selectedSubject}`,
							);
							if (res.ok) {
								const data = await res.json();
								if (data.success) {
									grades = Array.isArray(data.data?.grades)
										? data.data.grades
										: [];
									mergeGradesForYear(normalizedYear, grades);
								}
							}
						}

						const combined = combineStudentsAndGrades(students, grades)
							.slice()
							.sort((a, b) =>
								(a.studentName || '').localeCompare(
									b.studentName || '',
									undefined,
									{ sensitivity: 'base' },
								),
							);
						return {
							classId,
							className: cls?.name || classId,
							students: combined,
							grades,
						};
					}),
				);
				setAllClassesData(results);
			} catch (err) {
				console.error('Error fetching all classes data:', err);
				setError((prev) => ({ ...prev, subjects: 'Failed to load classes.' }));
				setAllClassesData([]);
			} finally {
				setLoading((prev) => ({ ...prev, subjects: false }));
			}
		};
		fetchAllClassesData();
	}, [
		selectedAcademicYear,
		selectedClass,
		selectedSubject,
		classes,
		isSelfContainedLevel,
		isOnline,
		effectiveUser?.role,
		isSelectedAcademicYearAllowed,
		mergeGradesForYear,
	]);

	useEffect(() => {
		if (effectiveUser?.role === 'teacher' && !isSelectedAcademicYearAllowed) {
			setAllSubjectsData([]);
			setLoading((prev) => ({ ...prev, subjects: false }));
			setError((prev) => ({ ...prev, subjects: '' }));
			return;
		}
		if (
			selectedSubject !== ALL_SUBJECTS_VALUE ||
			!isSelfContainedLevel ||
			!selectedClass ||
			subjects.length === 0
		) {
			setAllSubjectsData([]);
			setLoading((prev) => ({ ...prev, subjects: false }));
			return;
		}
		const fetchAllSubjectsData = async () => {
			setError((prev) => ({ ...prev, subjects: '' }));
			try {
				const normalizedYear = normalizeAcademicYear(selectedAcademicYear);
				setLoading((prev) => ({ ...prev, subjects: true }));
				const baseStudents = getCachedStudentsForClass(
					normalizedYear,
					selectedClass,
				);
				let students = baseStudents;
				if (students.length === 0 && isOnline) {
					const res = await fetch(
						`/api/users?role=student&academicYear=${normalizedYear}&classId=${selectedClass}&limit=50000`,
					);
					if (res.ok) {
						const data = await res.json();
						if (data.success) {
							students = extractStudentsPayload(data)
								.map(mapStudentRecord)
								.filter(Boolean) as Student[];
						}
					}
				}

				const results = await Promise.all(
					subjects.map(async (subject) => {
						let grades = getCachedGradesForClass(
							normalizedYear,
							selectedClass,
							subject,
						);
						if (grades.length === 0 && isOnline) {
							const res = await fetch(
								`/api/grades?academicYear=${normalizedYear}&classId=${selectedClass}&subject=${subject}`,
							);
							if (res.ok) {
								const data = await res.json();
								if (data.success) {
									grades = Array.isArray(data.data?.grades)
										? data.data.grades
										: [];
									mergeGradesForYear(normalizedYear, grades);
								}
							}
						}
						const combined = combineStudentsAndGrades(students, grades)
							.slice()
							.sort((a, b) =>
								(a.studentName || '').localeCompare(
									b.studentName || '',
									undefined,
									{ sensitivity: 'base' },
								),
							);
						return {
							subject,
							students: combined,
							grades,
						};
					}),
				);
				setAllSubjectsData(results);
			} catch (err) {
				console.error('Error fetching all subjects data:', err);
				setError((prev) => ({ ...prev, subjects: 'Failed to load subjects.' }));
				setAllSubjectsData([]);
			} finally {
				setLoading((prev) => ({ ...prev, subjects: false }));
			}
		};
		fetchAllSubjectsData();
	}, [
		selectedAcademicYear,
		selectedClass,
		selectedSubject,
		subjects,
		isSelfContainedLevel,
		isOnline,
		effectiveUser?.role,
		isSelectedAcademicYearAllowed,
		mergeGradesForYear,
	]);

	useEffect(() => {
		if (selectedClass === ALL_CLASSES_VALUE) {
			const activeStudents = Array.isArray(activeClassData?.students)
				? activeClassData?.students || []
				: [];
			setStudentsData(activeStudents);
			setGradesData(activeClassData?.grades || []);
			setCombinedData(activeStudents);
			return;
		}
		if (selectedSubject === ALL_SUBJECTS_VALUE) {
			const activeEntry = allSubjectsData[activeSubjectIndex] || null;
			const activeStudents = Array.isArray(activeEntry?.students)
				? activeEntry?.students || []
				: [];
			setStudentsData(activeStudents);
			setGradesData(activeEntry?.grades || []);
			setCombinedData(activeStudents);
			return;
		}
		if (studentsData.length > 0) {
			const combined = combineStudentsAndGrades(studentsData, gradesData || [])
				.slice()
				.sort((a, b) =>
					(a.studentName || '').localeCompare(b.studentName || '', undefined, {
						sensitivity: 'base',
					}),
				);
			setCombinedData(combined);
		} else if (gradesData.length > 0) {
			const derivedStudents = Array.from(
				new Map(
					gradesData.map((grade: any) => [
						String(grade?.studentId || ''),
						{
							studentId: String(grade?.studentId || ''),
							studentName: String(
								grade?.studentName || grade?.studentId || 'Unknown Student',
							),
						},
					]),
				).values(),
			).filter((student) => student.studentId) as Student[];
			const combined = combineStudentsAndGrades(
				derivedStudents,
				gradesData || [],
			)
				.slice()
				.sort((a, b) =>
					(a.studentName || '').localeCompare(b.studentName || '', undefined, {
						sensitivity: 'base',
					}),
				);
			setCombinedData(combined);
		} else {
			setCombinedData([]);
		}
	}, [
		studentsData,
		gradesData,
		selectedClass,
		selectedSubject,
		activeClassData,
		allSubjectsData,
		activeSubjectIndex,
	]);

	useEffect(() => {
		if (selectedClass && selectedSubject) {
			setPdfReady(false);
		}
	}, [selectedClass, selectedSubject, allClassesData]);

	const getGradeColor = (grade: number | null) => {
		if (grade == null) return 'text-muted-foreground';
		return grade >= PASS_MARK ? PASS_GRADE_CLASS : FAIL_GRADE_CLASS;
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
					grade >= PASS_MARK ? passes++ : fails++;
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
			className: PASS_GRADE_CLASS,
		},
		{
			label: 'Number of Fails',
			key: 'fails',
			className: FAIL_GRADE_CLASS,
		},
		{
			label: 'Number of Incompletes',
			key: 'incompletes',
			className: 'font-semibold text-muted-foreground',
		},
		{ label: 'Class Average', key: 'classAverage', className: '' },
	];

	const hasError = error.students || error.grades || error.subjects;
	const errorMessage = error.students || error.grades || error.subjects;
	const isLoadingData = loading.students || loading.grades || loading.subjects;
	const shouldWaitForPdf =
		!!selectedClass &&
		!!selectedSubject &&
		(selectedClass === ALL_CLASSES_VALUE
			? allClassesData.length > 0
			: selectedSubject === ALL_SUBJECTS_VALUE
				? allSubjectsData.length > 0
				: combinedData.length > 0) &&
		!isLoadingData &&
		!hasError;
	const isPdfPreparing = shouldWaitForPdf && !pdfReady;
	const isLoading = isLoadingData;

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
	const showSessionFilter =
		isSelectedAcademicYearAllowed && sessions.length > 1;
	const showLevelFilter =
		isSelectedAcademicYearAllowed && classLevels.length > 1;
	const showClassFilter = isSelectedAcademicYearAllowed && classes.length > 1;
	const showSubjectFilter =
		isSelectedAcademicYearAllowed && subjects.length > 1;

	return (
		<div className="space-y-6">
			<div className="bg-card border border-border rounded-xl shadow-sm">
				<div className="flex flex-wrap gap-2 p-2.5 sm:p-3 items-end">
					{showAcademicYearFilter && (
						<FilterSelect
							label="Year"
							value={selectedAcademicYear}
							onChange={handleAcademicYearChange}
							options={availableAcademicYears.map((year) => ({
								label: year,
								value: year,
							}))}
						/>
					)}
					{showSessionFilter && (
						<FilterSelect
							label="Session"
							value={selectedSession}
							onChange={handleSessionChange}
							placeholder="Session"
							options={sessions.map((session) => ({
								label: session,
								value: session,
							}))}
						/>
					)}
					{showLevelFilter && selectedSession && (
						<FilterSelect
							label="Level"
							value={selectedLevel}
							onChange={handleLevelChange}
							placeholder="Level"
							options={classLevels.map((level) => ({
								label: level,
								value: level,
							}))}
						/>
					)}
					{showClassFilter && selectedLevel && (
						<FilterSelect
							label="Class"
							value={selectedClass}
							onChange={handleClassChange}
							placeholder="Class"
							options={[
								...(!isSelfContainedLevel
									? [{ label: 'All Classes', value: ALL_CLASSES_VALUE }]
									: []),
								...classes.map((cls: any) => ({
									label: cls.name,
									value: cls.classId,
								})),
							]}
						/>
					)}
					{showSubjectFilter && selectedClass && (
						<FilterSelect
							label="Subject"
							value={selectedSubject}
							onChange={handleSubjectChange}
							placeholder="Subject"
							options={[
								...(isSelfContainedLevel
									? [{ label: 'All Subjects', value: ALL_SUBJECTS_VALUE }]
									: []),
								...subjects.map((subject) => ({
									label: subject,
									value: subject,
								})),
							]}
						/>
					)}
					{isLoadingData && (
						<div className="flex items-end pb-1">
							<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
						</div>
					)}
				</div>
			</div>
			{effectiveUser?.role === 'teacher' && !isSelectedAcademicYearAllowed && (
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
					Viewing master grade sheets is not allowed for academic year{' '}
					<strong>{selectedAcademicYear}</strong>. Please select an allowed
					academic year.
				</div>
			)}
			{selectedClass && selectedSubject && isSelectedAcademicYearAllowed && (
				<div className="bg-card border rounded-lg p-4 sm:p-6 shadow-sm min-w-0">
					{selectedClass === ALL_CLASSES_VALUE && classes.length > 1 && (
						<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-sm text-muted-foreground">
								Viewing class {activeClassIndex + 1} of {classes.length}
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() =>
										setActiveClassIndex((prev) => Math.max(0, prev - 1))
									}
									disabled={activeClassIndex === 0}
									className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
								>
									<ChevronLeft className="h-4 w-4" />
									Prev
								</button>
								<button
									type="button"
									onClick={() =>
										setActiveClassIndex((prev) =>
											Math.min(classes.length - 1, prev + 1),
										)
									}
									disabled={activeClassIndex >= classes.length - 1}
									className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
								>
									Next
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
					{selectedSubject === ALL_SUBJECTS_VALUE && subjects.length > 1 && (
						<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-sm text-muted-foreground">
								Viewing subject {activeSubjectIndex + 1} of {subjects.length}
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() =>
										setActiveSubjectIndex((prev) => Math.max(0, prev - 1))
									}
									disabled={activeSubjectIndex === 0}
									className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
								>
									<ChevronLeft className="h-4 w-4" />
									Prev
								</button>
								<button
									type="button"
									onClick={() =>
										setActiveSubjectIndex((prev) =>
											Math.min(subjects.length - 1, prev + 1),
										)
									}
									disabled={activeSubjectIndex >= subjects.length - 1}
									className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
								>
									Next
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
						<h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
							Sheet for{' '}
							{(selectedClass === ALL_CLASSES_VALUE
								? classes[activeClassIndex]?.name
								: classes.find((cls: any) => cls.classId === selectedClass)
										?.name) ||
								(studentsData.length > 0
									? studentsData[0].studentName.split(' ').slice(0, 2).join(' ')
									: selectedClass)}{' '}
							-{' '}
							{selectedSubject === ALL_SUBJECTS_VALUE
								? subjects[activeSubjectIndex] || 'All Subjects'
								: selectedSubject}
						</h3>
						<div className="mt-2 sm:mt-0">
							{combinedData.length > 0 && (
								<GradesPDFDownload
									disabled={isLoadingData || isPdfPreparing}
									teacherInfo={resolvedTeacher}
									gradeData={pdfGradeData}
									className={
										selectedClass === ALL_CLASSES_VALUE
											? 'All Classes'
											: classes.find(
													(cls: any) => cls.classId === selectedClass,
												)?.name || selectedClass
									}
									classLevel={selectedLevel}
									subject={
										selectedSubject === ALL_SUBJECTS_VALUE
											? 'All Subjects'
											: selectedSubject
									}
									academicYear={selectedAcademicYear}
									onReadyChange={setPdfReady}
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
											className="sticky top-0 left-0 z-30 bg-muted px-3 sm:px-6 py-3 text-left font-medium text-muted-foreground uppercase tracking-wider border-r border-border text-xs w-[180px] sm:w-[240px]"
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
												colSpan={1}
												className="sticky left-0 z-10 bg-muted px-3 sm:px-6 py-3 text-left font-semibold text-foreground border-r border-border text-sm whitespace-nowrap"
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
																: (statValue ?? 0)}
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
					{selectedClass === ALL_CLASSES_VALUE && classes.length > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<button
								type="button"
								onClick={() =>
									setActiveClassIndex((prev) => Math.max(0, prev - 1))
								}
								disabled={activeClassIndex === 0}
								className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
							>
								<ChevronLeft className="h-4 w-4" />
								Prev
							</button>
							<div className="text-sm text-muted-foreground">
								Class {activeClassIndex + 1} of {classes.length}
							</div>
							<button
								type="button"
								onClick={() =>
									setActiveClassIndex((prev) =>
										Math.min(classes.length - 1, prev + 1),
									)
								}
								disabled={activeClassIndex >= classes.length - 1}
								className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
							>
								Next
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					)}
					{selectedSubject === ALL_SUBJECTS_VALUE && subjects.length > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<button
								type="button"
								onClick={() =>
									setActiveSubjectIndex((prev) => Math.max(0, prev - 1))
								}
								disabled={activeSubjectIndex === 0}
								className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
							>
								<ChevronLeft className="h-4 w-4" />
								Prev
							</button>
							<div className="text-sm text-muted-foreground">
								Subject {activeSubjectIndex + 1} of {subjects.length}
							</div>
							<button
								type="button"
								onClick={() =>
									setActiveSubjectIndex((prev) =>
										Math.min(subjects.length - 1, prev + 1),
									)
								}
								disabled={activeSubjectIndex >= subjects.length - 1}
								className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50"
							>
								Next
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

interface FilterSelectProps {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
	placeholder?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
	label,
	value,
	onChange,
	options,
	placeholder,
}) => (
	<div className="flex flex-col gap-0.5">
		<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
			{label}
		</span>
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="h-8 pl-3 pr-8 rounded-lg border border-input bg-background text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring cursor-pointer hover:border-ring/50 transition-colors"
			>
				{placeholder && <option value="">{placeholder}</option>}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
		</div>
	</div>
);

export default MasterGradeSheet;
