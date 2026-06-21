'use client';

import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from 'react';
import {
	Loader2,
	CheckCircle,
	AlertCircle,
	Info,
	X,
	BarChart3,
	Clock,
	ChevronDown,
	Send,
	Save,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import { PageLoading } from '@/components/loading';
import useAuth from '@/store/useAuth';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import {
	getTeacherAcademicYears,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';

interface TeacherInfo {
	name: string;
	userId: string;
	username: string;
	role: 'teacher';
	subjects: {
		year: string;
		classes: { classId: string; subjects: string[] }[];
	}[];
	sponsorClass?: string;
}

interface GradeInputState {
	grade: number | '';
	hasExistingGrade: boolean;
	status?: string;
	isDraft?: boolean;
}

interface StudentForGrading {
	studentId: string;
	studentName: string;
	grades: { [period: string]: GradeInputState };
}

const allPeriods = [
	{ id: 'first', label: '1st', fullLabel: 'First Period', value: 'first' },
	{ id: 'second', label: '2nd', fullLabel: 'Second Period', value: 'second' },
	{ id: 'third', label: '3rd', fullLabel: 'Third Period', value: 'third' },
	{
		id: 'third_period_exam',
		label: '3rd Exam',
		fullLabel: 'Third Period Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: '4th', fullLabel: 'Fourth Period', value: 'fourth' },
	{ id: 'fifth', label: '5th', fullLabel: 'Fifth Period', value: 'fifth' },
	{ id: 'sixth', label: '6th', fullLabel: 'Sixth Period', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: '6th Exam',
		fullLabel: 'Sixth Period Exam',
		value: 'sixth_period_exam',
	},
];

const PASS_MARK = 70;
const PASS_GRADE_CLASS = 'text-[var(--grade-pass)]';
const FAIL_GRADE_CLASS = 'text-[var(--grade-fail)]';

const SubmitGrade: React.FC = () => {
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const gradesByAcademicYear = useSchoolStore(
		(state) => state.gradesByAcademicYear,
	);
	const mergeGradesForYear = useSchoolStore(
		(state) => state.mergeGradesForYear,
	);
	const user = useAuth((state) => state.user);

	const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
	const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
	const [selectedSubject, setSelectedSubject] = useState('');
	const [selectedSession, setSelectedSession] = useState('');
	const [selectedClassLevel, setSelectedClassLevel] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [studentsForGrading, setStudentsForGrading] = useState<
		StudentForGrading[]
	>([]);
	const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

	const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

	const [loading, setLoading] = useState({
		teacherInfo: true,
		studentsForGrading: false,
		submittingGrades: false,
	});
	const [error, setError] = useState({
		teacherInfo: '',
		studentsForGrading: '',
	});
	const [notification, setNotification] = useState<{
		type: 'success' | 'error' | 'info';
		message: string;
		isVisible: boolean;
	} | null>(null);
	const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
	const [activePeriod, setActivePeriod] = useState<string | null>(null);

	const usersByAcademicYearRef = useRef(usersByAcademicYear);
	const gradesByAcademicYearRef = useRef(gradesByAcademicYear);
	const tableScrollContainerRef = useRef<HTMLDivElement | null>(null);

	const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
	const [genRange, setGenRange] = useState({ min: '', max: '' });

	const getRandomGrade = (min: number, max: number) =>
		Math.floor(Math.random() * (max - min + 1)) + min;

	const getNormalizedGenerationRange = () => {
		const min = genRange.min === '' ? 60 : Number(genRange.min);
		const max = genRange.max === '' ? 100 : Number(genRange.max);

		if (
			Number.isNaN(min) ||
			Number.isNaN(max) ||
			min < 60 ||
			max > 100 ||
			min > max
		) {
			return null;
		}

		return { min, max };
	};

	const handleGenerateGrades = () => {
		const range = getNormalizedGenerationRange();
		if (!range) {
			showNotification('error', 'Generate grades between 60 and 100.');
			return;
		}

		setStudentsForGrading((prev) =>
			prev.map((student) => ({
				...student,
				grades: Object.fromEntries(
					Object.entries(student.grades).map(([period, gradeInfo]) => {
						if (
							selectedPeriods.includes(period) &&
							!gradeInfo.hasExistingGrade
						) {
							return [
								period,
								{
									...gradeInfo,
									grade: getRandomGrade(range.min, range.max),
									isDraft: true,
								},
							];
						}
						return [period, gradeInfo];
					}),
				),
			})),
		);
		setIsGenerateModalOpen(false);
	};

	useEffect(() => {
		usersByAcademicYearRef.current = usersByAcademicYear;
	}, [usersByAcademicYear]);
	useEffect(() => {
		gradesByAcademicYearRef.current = gradesByAcademicYear;
	}, [gradesByAcademicYear]);

	const getClassMetaById = useCallback(
		(classId: string) => {
			if (!classId || !school?.classLevels) return null;
			for (const [session, levels] of Object.entries(school.classLevels)) {
				if (!levels || typeof levels !== 'object') continue;
				for (const [level, levelData] of Object.entries(levels)) {
					if (!levelData?.classes || !Array.isArray(levelData.classes))
						continue;
					const found = levelData.classes.find(
						(cls: any) => cls.classId === classId,
					);
					if (found) return { ...found, session, level };
				}
			}
			return null;
		},
		[school],
	);

	const getStudentClassIdForYear = useCallback(
		(student: any, academicYear: string) => {
			const yearEntry = Array.isArray(student?.academicYears)
				? student.academicYears.find((ay: any) =>
						areAcademicYearsEqual(ay.year, academicYear),
					)
				: null;
			return yearEntry?.classId || student?.classId || '';
		},
		[],
	);

	const buildStudentFullName = useCallback((student: any) => {
		return (
			student?.fullName ||
			`${student?.firstName || ''} ${student?.lastName || ''}`.trim()
		);
	}, []);

	const getSubmissionId = useCallback(
		(academicYear: string, classId: string, period: string, subject: string) =>
			`${academicYear}-${classId}-${period}-${subject}`
				.replaceAll(/[\/\s+]/gi, '')
				.toLowerCase(),
		[],
	);

	const mergeSubmittedGradesCache = useCallback(
		(grades: any[]) => {
			if (
				!teacherInfo?.username ||
				!selectedAcademicYear ||
				grades.length === 0
			)
				return;
			const cacheKey = `submittedGrades:${teacherInfo.username}:${selectedAcademicYear}`;
			const cached = getClientCache<any[]>(cacheKey) || [];
			const merged = new Map<string, any>();
			const getKey = (grade: any) => {
				const naturalKey = [
					grade?.academicYear,
					grade?.classId,
					grade?.subject,
					grade?.period,
					grade?.studentId,
					grade?.teacherUsername,
				]
					.map((part) =>
						String(part || '')
							.trim()
							.toLowerCase(),
					)
					.join('|');
				if (naturalKey.replaceAll('|', '')) return naturalKey;
				const id = grade?._id || grade?.id;
				return id ? `id:${String(id)}` : '';
			};
			cached.forEach((grade) => merged.set(getKey(grade), grade));
			grades.forEach((grade) => merged.set(getKey(grade), grade));
			setClientCache(cacheKey, Array.from(merged.values()));
		},
		[teacherInfo?.username, selectedAcademicYear],
	);

	const periods = useMemo(() => {
		if (school?.settings?.teacherSettings?.gradeSubmissionPeriods) {
			const allowedPeriods =
				school.settings.teacherSettings.gradeSubmissionPeriods;
			return allPeriods.filter((p) => allowedPeriods.includes(p.id));
		}
		return allPeriods;
	}, [school]);

	const teacherYears = useMemo(
		() => getTeacherAcademicYears(teacherInfo),
		[teacherInfo],
	);
	const availableAcademicYears = useMemo(() => teacherYears, [teacherYears]);

	const allowedAcademicYears = useMemo(
		() =>
			sortAcademicYearsDesc(
				school?.settings?.teacherSettings?.gradeSubmissionAcademicYears || [],
			),
		[school],
	);

	const isSelectedAcademicYearAllowed = useMemo(() => {
		if (!selectedAcademicYear) return false;
		return allowedAcademicYears.some((year) =>
			areAcademicYearsEqual(year, selectedAcademicYear),
		);
	}, [allowedAcademicYears, selectedAcademicYear]);

	useEffect(() => {
		const defaultAcademicYear =
			pickMostRecentAcademicYear(availableAcademicYears) || '';
		const selectedIsAvailable = availableAcademicYears.some((year) =>
			areAcademicYearsEqual(year, selectedAcademicYear),
		);
		if (!selectedAcademicYear || !selectedIsAvailable) {
			setSelectedAcademicYear(defaultAcademicYear);
		}
	}, [availableAcademicYears, selectedAcademicYear]);

	useEffect(() => {
		setSelectedSession('');
		setSelectedClassLevel('');
		setSelectedClassId('');
		setSelectedSubject('');
		setSelectedPeriods([]);
		setStudentsForGrading([]);
	}, [selectedAcademicYear]);

	useEffect(() => {
		if (notification?.isVisible) {
			const timer = setTimeout(() => {
				setNotification((prev) =>
					prev ? { ...prev, isVisible: false } : null,
				);
				setTimeout(() => setNotification(null), 300);
			}, 9000);
			return () => clearTimeout(timer);
		}
	}, [notification?.isVisible]);

	const showNotification = (
		type: 'success' | 'error' | 'info',
		message: string,
	) => {
		setNotification({ type, message, isVisible: true });
	};

	const dismissNotification = () => {
		setNotification((prev) => (prev ? { ...prev, isVisible: false } : null));
		setTimeout(() => setNotification(null), 300);
	};

	useEffect(() => {
		setLoading((prev) => ({ ...prev, teacherInfo: true }));
		if (user && user.role === 'teacher') {
			setTeacherInfo(user as unknown as TeacherInfo);
			setError((prev) => ({ ...prev, teacherInfo: '' }));
		} else {
			setTeacherInfo(null);
			setError((prev) => ({
				...prev,
				teacherInfo: 'Failed to load teacher information.',
			}));
		}
		setLoading((prev) => ({ ...prev, teacherInfo: false }));
	}, [user]);

	const yearAssignment = useMemo(() => {
		return (teacherInfo?.subjects || []).find((entry) =>
			areAcademicYearsEqual(entry.year, selectedAcademicYear),
		);
	}, [teacherInfo, selectedAcademicYear]);

	const assignedClasses = useMemo(() => {
		const classes = yearAssignment?.classes || [];
		return classes
			.map((entry) => {
				const meta = getClassMetaById(entry.classId);
				return meta ? { ...meta, classId: entry.classId } : null;
			})
			.filter(Boolean) as Array<{
			classId: string;
			name: string;
			session: string;
			level: string;
		}>;
	}, [yearAssignment, getClassMetaById]);

	const availableSessions = useMemo(
		() => [...new Set(assignedClasses.map((c) => c.session))],
		[assignedClasses],
	);

	const availableLevels = useMemo(() => {
		if (!selectedSession) return [];
		return [
			...new Set(
				assignedClasses
					.filter((c) => c.session === selectedSession)
					.map((c) => c.level),
			),
		];
	}, [assignedClasses, selectedSession]);

	const isSelfContainedTeacher = useMemo(
		() => selectedClassLevel === 'Self Contained',
		[selectedClassLevel],
	);

	const availableClasses = useMemo(() => {
		if (!selectedSession || !selectedClassLevel) return [];
		let classes = assignedClasses.filter(
			(c) => c.session === selectedSession && c.level === selectedClassLevel,
		);
		if (isSelfContainedTeacher && teacherInfo?.sponsorClass) {
			classes = classes.filter((c) => c.classId === teacherInfo.sponsorClass);
		}
		return classes;
	}, [
		assignedClasses,
		selectedSession,
		selectedClassLevel,
		isSelfContainedTeacher,
		teacherInfo?.sponsorClass,
	]);

	const availableSubjects = useMemo(() => {
		if (!selectedClassId || !yearAssignment?.classes) return [];
		const classData = yearAssignment.classes.find(
			(c) => c.classId === selectedClassId,
		);
		return classData?.subjects || [];
	}, [selectedClassId, yearAssignment]);

	useEffect(() => {
		if (availableSessions.length === 1 && !selectedSession)
			setSelectedSession(availableSessions[0]);
	}, [availableSessions, selectedSession]);

	useEffect(() => {
		if (availableLevels.length === 1 && !selectedClassLevel)
			setSelectedClassLevel(availableLevels[0]);
	}, [availableLevels, selectedClassLevel]);

	useEffect(() => {
		if (isSelfContainedTeacher && teacherInfo?.sponsorClass) {
			setSelectedClassId(teacherInfo.sponsorClass);
		} else if (availableClasses.length === 1 && !selectedClassId) {
			setSelectedClassId(availableClasses[0].classId);
		}
	}, [
		availableClasses,
		selectedClassId,
		isSelfContainedTeacher,
		teacherInfo?.sponsorClass,
	]);

	useEffect(() => {
		if (availableSubjects.length === 1 && !selectedSubject)
			setSelectedSubject(availableSubjects[0]);
	}, [availableSubjects, selectedSubject]);

	const loadStudentsForGrading = useCallback(async () => {
		if (
			!selectedSubject ||
			!selectedClassId ||
			!selectedSession ||
			!selectedClassLevel ||
			!selectedAcademicYear
		)
			return;
		if (!isSelectedAcademicYearAllowed) {
			setStudentsForGrading([]);
			setError((prev) => ({ ...prev, studentsForGrading: '' }));
			setLoading((prev) => ({ ...prev, studentsForGrading: false }));
			return;
		}

		setLoading((prev) => ({ ...prev, studentsForGrading: true }));
		setError((prev) => ({ ...prev, studentsForGrading: '' }));
		setStudentsForGrading([]);
		setNotification(null);

		try {
			let studentsList: any[] = [];
			const cachedUsers = getScopedAcademicYearValue(
				usersByAcademicYearRef.current,
				selectedAcademicYear,
			).value;
			if (Array.isArray(cachedUsers?.students)) {
				studentsList = cachedUsers.students.filter(
					(student: any) =>
						getStudentClassIdForYear(student, selectedAcademicYear) ===
						selectedClassId,
				);
			} else {
				const studentsRes = await fetch(
					`/api/users?role=student&academicYear=${selectedAcademicYear}&classId=${selectedClassId}`,
				);
				if (!studentsRes.ok)
					throw new Error('Failed to fetch students for class');
				const studentsData = await studentsRes.json();
				studentsList = Array.isArray(studentsData?.data)
					? studentsData.data
					: Array.isArray(studentsData?.data?.students)
						? studentsData.data.students
						: [];
				setUsersForYear(
					selectedAcademicYear,
					{ students: studentsList },
					{ merge: true },
				);
			}

			if (!studentsList || studentsList.length === 0) {
				setStudentsForGrading([]);
				return;
			}

			let existingGradesData: any = null;
			const cachedGradesForYear = getScopedAcademicYearValue(
				gradesByAcademicYearRef.current,
				selectedAcademicYear,
			).value;
			const useCachedGrades = (source: any[]) => {
				const filtered = source.filter(
					(grade: any) =>
						grade?.classId === selectedClassId &&
						grade?.subject === selectedSubject,
				);
				existingGradesData = { data: { grades: filtered } };
			};

			if (Array.isArray(cachedGradesForYear)) {
				useCachedGrades(cachedGradesForYear);
			} else {
				try {
					const existingGradesRes = await fetch(
						`/api/grades?academicYear=${selectedAcademicYear}&classId=${selectedClassId}&subject=${selectedSubject}`,
					);
					if (existingGradesRes.ok) {
						existingGradesData = await existingGradesRes.json();
						const incomingGrades = Array.isArray(
							existingGradesData?.data?.grades,
						)
							? existingGradesData.data.grades
							: Array.isArray(existingGradesData?.data?.report?.grades)
								? existingGradesData.data.report.grades
								: [];
						mergeGradesForYear(selectedAcademicYear, incomingGrades);
					} else {
						useCachedGrades([]);
					}
				} catch {
					useCachedGrades([]);
				}
			}

			const reportStudentsMap = new Map();
			if (Array.isArray(existingGradesData?.data?.grades)) {
				existingGradesData.data.grades.forEach((grade: any) => {
					if (!reportStudentsMap.has(grade.studentId)) {
						reportStudentsMap.set(grade.studentId, {});
					}
					reportStudentsMap.get(grade.studentId)[grade.period] = {
						grade: grade.grade,
						status: grade.status,
					};
				});
			}

			// Load offline drafts
			const draftKey = `draftGrades_${teacherInfo?.username}_${selectedAcademicYear}_${selectedClassId}_${selectedSubject}`;
			let localDrafts: Record<string, number> = {};
			try {
				localDrafts = JSON.parse(localStorage.getItem(draftKey) || '{}');
			} catch (e) {
				console.error('Failed to parse draft grades from local storage', e);
			}

			const initialStudentsForGrading = studentsList.map((student: any) => {
				const studentKey = student.studentId || student.id || student._id;
				const studentExistingPeriods = reportStudentsMap.get(studentKey) || {};
				const grades: { [period: string]: GradeInputState } = {};

				periods.forEach(({ id }) => {
					const existingGrade = studentExistingPeriods[id];
					if (
						existingGrade &&
						existingGrade.grade !== undefined &&
						existingGrade.grade !== null &&
						existingGrade.status &&
						(existingGrade.status.toLowerCase() === 'approved' ||
							existingGrade.status.toLowerCase() === 'pending')
					) {
						grades[id] = {
							grade: existingGrade.grade,
							hasExistingGrade: true,
							status: existingGrade.status,
						};
					} else if (localDrafts[`${studentKey}-${id}`] !== undefined) {
						grades[id] = {
							grade: localDrafts[`${studentKey}-${id}`],
							hasExistingGrade: false,
							isDraft: true,
						};
					} else {
						grades[id] = { grade: '', hasExistingGrade: false };
					}
				});

				return {
					studentId: studentKey,
					studentName: buildStudentFullName(student),
					grades,
				};
			});

			setStudentsForGrading(initialStudentsForGrading);
		} catch (err) {
			setError((prev) => ({
				...prev,
				studentsForGrading: 'Failed to load students and existing grades.',
			}));
			console.error(err);
		} finally {
			setLoading((prev) => ({ ...prev, studentsForGrading: false }));
		}
	}, [
		selectedAcademicYear,
		selectedClassId,
		selectedSubject,
		selectedSession,
		isSelectedAcademicYearAllowed,
		periods,
		setUsersForYear,
		mergeGradesForYear,
		getStudentClassIdForYear,
		buildStudentFullName,
		teacherInfo?.username,
	]);

	useEffect(() => {
		if (!isSelectedAcademicYearAllowed) {
			setStudentsForGrading([]);
			setLoading((prev) => ({ ...prev, studentsForGrading: false }));
			return;
		}
		if (
			selectedSession &&
			selectedClassLevel &&
			selectedClassId &&
			selectedSubject &&
			selectedAcademicYear &&
			!loading.studentsForGrading
		) {
			loadStudentsForGrading();
		}
	}, [
		selectedSession,
		selectedClassLevel,
		selectedClassId,
		selectedSubject,
		selectedAcademicYear,
		isSelectedAcademicYearAllowed,
		loadStudentsForGrading,
	]);

	const handlePeriodToggle = (periodValue: string) => {
		setSelectedPeriods((prev) =>
			prev.includes(periodValue)
				? prev.filter((p) => p !== periodValue)
				: [...prev, periodValue],
		);
	};

	const handleGradeChange = (
		studentId: string,
		period: string,
		value: string,
	) => {
		if (value !== '' && (isNaN(Number(value)) || !/^\d*\.?\d*$/.test(value)))
			return;
		let numericValue: number | '' = '';
		if (value !== '') {
			const num = Number(value);
			if (num > 100) return;
			numericValue = num;
		}
		setStudentsForGrading((prev) =>
			prev.map((student) =>
				student.studentId === studentId
					? {
							...student,
							grades: {
								...student.grades,
								[period]: {
									...student.grades[period],
									grade: numericValue,
									isDraft: false,
								},
							},
						}
					: student,
			),
		);
	};

	const handleGradeBlur = (
		studentId: string,
		period: string,
		value: string,
	) => {
		setActiveStudentId(null);
		setActivePeriod(null);

		if (
			!teacherInfo?.username ||
			!selectedAcademicYear ||
			!selectedClassId ||
			!selectedSubject
		)
			return;

		const draftKey = `draftGrades_${teacherInfo.username}_${selectedAcademicYear}_${selectedClassId}_${selectedSubject}`;
		let drafts: Record<string, number> = {};
		try {
			drafts = JSON.parse(localStorage.getItem(draftKey) || '{}');
		} catch (e) {
			console.error('Error parsing drafts during blur save', e);
		}

		const mapKey = `${studentId}-${period}`;
		const num = Number(value);
		let updated = false;

		if (value === '') {
			if (drafts[mapKey] !== undefined) {
				delete drafts[mapKey];
				updated = true;
			}
		} else if (!Number.isNaN(num) && num >= 60 && num <= 100) {
			if (drafts[mapKey] !== num) {
				drafts[mapKey] = num;
				updated = true;
			}
		}

		if (updated) {
			localStorage.setItem(draftKey, JSON.stringify(drafts));
			setStudentsForGrading((prev) =>
				prev.map((student) =>
					student.studentId === studentId
						? {
								...student,
								grades: {
									...student.grades,
									[period]: {
										...student.grades[period],
										isDraft: value !== '',
									},
								},
							}
						: student,
				),
			);
		}
	};

	const handleSessionChange = (session: string) => {
		setSelectedSession(session);
		setSelectedClassLevel('');
		setSelectedClassId('');
		setSelectedSubject('');
	};

	const handleClassLevelChange = (level: string) => {
		setSelectedClassLevel(level);
		setSelectedClassId('');
		setSelectedSubject('');
	};

	const handleClassChange = (classId: string) => {
		setSelectedClassId(classId);

		const newClassData = yearAssignment?.classes.find(
			(c) => c.classId === classId,
		);
		const newClassSubjects = newClassData?.subjects || [];

		if (!newClassSubjects.includes(selectedSubject)) {
			setSelectedSubject('');
		}
	};

	const orderedSelectedPeriods = useMemo(() => {
		return periods
			.filter((period) => selectedPeriods.includes(period.id))
			.map((period) => period.id);
	}, [selectedPeriods, periods]);

	const needsAutoFocusRef = useRef(false);

	useEffect(() => {
		needsAutoFocusRef.current = true;
	}, [selectedAcademicYear, selectedClassId, selectedSubject, selectedPeriods]);

	useEffect(() => {
		if (
			needsAutoFocusRef.current &&
			!loading.studentsForGrading &&
			studentsForGrading.length > 0 &&
			selectedPeriods.length > 0
		) {
			const timer = setTimeout(() => {
				const inputs = Array.from(
					document.querySelectorAll<HTMLInputElement>(
						'[data-grade-input="true"]',
					),
				);
				const firstEmpty = inputs.find((input) => input.value.trim() === '');

				if (firstEmpty) {
					firstEmpty.focus({ preventScroll: true });
					firstEmpty.select();

					const scrollContainer = tableScrollContainerRef.current;
					if (scrollContainer) {
						const containerRect = scrollContainer.getBoundingClientRect();
						const inputRect = firstEmpty.getBoundingClientRect();

						const frozenColumn = scrollContainer.querySelector<HTMLElement>(
							'tbody td.sticky, thead th.sticky',
						);
						const frozenWidth = frozenColumn?.offsetWidth ?? 0;

						const frozenHeader =
							scrollContainer.querySelector<HTMLElement>('thead th.sticky');
						const frozenHeight = frozenHeader?.offsetHeight ?? 0;

						const visibleLeft = containerRect.left + frozenWidth;
						const visibleRight = containerRect.right;
						const visibleTop = containerRect.top + frozenHeight;
						const visibleBottom = containerRect.bottom;

						let scrollDeltaX = 0;
						let scrollDeltaY = 0;

						if (inputRect.left < visibleLeft) {
							scrollDeltaX = inputRect.left - visibleLeft - 16;
						} else if (inputRect.right > visibleRight) {
							scrollDeltaX = inputRect.right - visibleRight + 16;
						}

						if (inputRect.top < visibleTop) {
							scrollDeltaY = inputRect.top - visibleTop - 16;
						} else if (inputRect.bottom > visibleBottom) {
							scrollDeltaY = inputRect.bottom - visibleBottom + 16;
						}

						if (scrollDeltaX !== 0 || scrollDeltaY !== 0) {
							scrollContainer.scrollBy({
								left: scrollDeltaX,
								top: scrollDeltaY,
								behavior: 'smooth',
							});
						}
					}
				}
				needsAutoFocusRef.current = false;
			}, 50);

			return () => clearTimeout(timer);
		}
	}, [loading.studentsForGrading, studentsForGrading, selectedPeriods]);

	const handleGradeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		const { key } = event;

		if (
			!['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
				key,
			)
		)
			return;

		const currentInput = event.currentTarget;
		const inputs = Array.from(
			document.querySelectorAll<HTMLInputElement>('[data-grade-input="true"]'),
		);
		const currentIndex = inputs.indexOf(currentInput);
		if (currentIndex === -1 || inputs.length <= 1) return;

		let nextInput: HTMLInputElement | undefined;

		if (key === 'Enter' || key === 'ArrowRight') {
			nextInput = inputs[currentIndex + 1] || inputs[0];
		} else if (key === 'ArrowLeft') {
			nextInput = inputs[currentIndex - 1] || inputs[inputs.length - 1];
		} else if (key === 'ArrowDown' || key === 'ArrowUp') {
			const currentRowId = currentInput.getAttribute('data-student-id');
			const rowIds = [
				...new Set(inputs.map((i) => i.getAttribute('data-student-id'))),
			];
			const currentRowIndex = rowIds.indexOf(currentRowId);

			if (key === 'ArrowDown') {
				const nextRowId = rowIds[currentRowIndex + 1] || rowIds[0];
				nextInput = inputs.find(
					(i) => i.getAttribute('data-student-id') === nextRowId,
				);
			} else if (key === 'ArrowUp') {
				const prevRowId =
					rowIds[currentRowIndex - 1] || rowIds[rowIds.length - 1];
				nextInput = [...inputs].find(
					(i) => i.getAttribute('data-student-id') === prevRowId,
				);
			}
		}

		if (nextInput) {
			event.preventDefault();

			nextInput.focus({ preventScroll: true });
			nextInput.select();

			const scrollContainer = tableScrollContainerRef.current;
			if (scrollContainer) {
				const containerRect = scrollContainer.getBoundingClientRect();
				const inputRect = nextInput.getBoundingClientRect();

				const frozenColumn = scrollContainer.querySelector<HTMLElement>(
					'tbody td.sticky, thead th.sticky',
				);
				const frozenWidth = frozenColumn?.offsetWidth ?? 0;

				const frozenHeader =
					scrollContainer.querySelector<HTMLElement>('thead th.sticky');
				const frozenHeight = frozenHeader?.offsetHeight ?? 0;

				const visibleLeft = containerRect.left + frozenWidth;
				const visibleRight = containerRect.right;
				const visibleTop = containerRect.top + frozenHeight;
				const visibleBottom = containerRect.bottom;

				let scrollDeltaX = 0;
				let scrollDeltaY = 0;

				if (inputRect.left < visibleLeft) {
					scrollDeltaX = inputRect.left - visibleLeft - 16;
				} else if (inputRect.right > visibleRight) {
					scrollDeltaX = inputRect.right - visibleRight + 16;
				}

				if (inputRect.top < visibleTop) {
					scrollDeltaY = inputRect.top - visibleTop - 16;
				} else if (inputRect.bottom > visibleBottom) {
					scrollDeltaY = inputRect.bottom - visibleBottom + 16;
				}

				if (scrollDeltaX !== 0 || scrollDeltaY !== 0) {
					scrollContainer.scrollBy({
						left: scrollDeltaX,
						top: scrollDeltaY,
						behavior: 'smooth',
					});
				}
			}
		}
	};

	const handleSubmitGrades = async () => {
		if (!isSelectedAcademicYearAllowed) {
			showNotification(
				'error',
				`Grade submission is not allowed for academic year ${selectedAcademicYear}.`,
			);
			return;
		}
		if (selectedPeriods.length === 0) {
			showNotification(
				'error',
				'Please select at least one period to submit grades for.',
			);
			return;
		}

		setLoading((prev) => ({ ...prev, submittingGrades: true }));
		setNotification(null);

		const gradesToSubmit = studentsForGrading.flatMap((student) =>
			selectedPeriods
				.filter((period) => {
					const gradeInfo = student.grades[period];
					return (
						gradeInfo && !gradeInfo.hasExistingGrade && gradeInfo.grade !== ''
					);
				})
				.map((period) => ({
					studentId: student.studentId,
					studentName: student.studentName,
					grade: Number(student.grades[period].grade),
					period,
				})),
		);

		const invalidGrades = gradesToSubmit.filter(
			(grade) =>
				Number.isNaN(grade.grade) || grade.grade < 60 || grade.grade > 100,
		);
		if (invalidGrades.length > 0) {
			showNotification(
				'error',
				'Grades must be between 60 and 100 before submitting.',
			);
			setLoading((prev) => ({ ...prev, submittingGrades: false }));
			return;
		}

		if (gradesToSubmit.length === 0) {
			showNotification(
				'info',
				'No new grades to submit. Students may already have grades for the selected periods.',
			);
			setLoading((prev) => ({ ...prev, submittingGrades: false }));
			return;
		}

		const payload = {
			academicYear: selectedAcademicYear,
			classId: selectedClassId,
			subject: selectedSubject,
			period:
				selectedPeriods.length > 0 ? selectedPeriods[0] : allPeriods[0].id,
			grades: gradesToSubmit,
		};

		try {
			const res = await fetch('/api/grades', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || 'Failed to submit grades');
			}

			const data = await res.json().catch(() => ({}));
			const serverGrades = Array.isArray(data?.data) ? data.data : [];
			const optimisticGrades = gradesToSubmit.map((grade) => ({
				submissionId: getSubmissionId(
					selectedAcademicYear,
					selectedClassId,
					grade.period,
					selectedSubject,
				),
				academicYear: selectedAcademicYear,
				period: grade.period,
				classId: selectedClassId,
				subject: selectedSubject,
				teacherUsername: teacherInfo?.username || user?.username || '',
				studentId: grade.studentId,
				studentName: grade.studentName,
				grade: grade.grade,
				status: 'Pending',
				lastUpdated: new Date().toISOString(),
			}));
			const gradesForCache =
				serverGrades.length > 0 ? serverGrades : optimisticGrades;
			mergeGradesForYear(selectedAcademicYear, gradesForCache);
			mergeSubmittedGradesCache(gradesForCache);

			// Clear successfully submitted drafts from local storage
			const draftKey = `draftGrades_${teacherInfo?.username}_${selectedAcademicYear}_${selectedClassId}_${selectedSubject}`;
			let drafts: Record<string, number> = {};
			try {
				drafts = JSON.parse(localStorage.getItem(draftKey) || '{}');
				let modified = false;
				gradesToSubmit.forEach((g) => {
					const mapKey = `${g.studentId}-${g.period}`;
					if (drafts[mapKey] !== undefined) {
						delete drafts[mapKey];
						modified = true;
					}
				});
				if (modified) {
					localStorage.setItem(draftKey, JSON.stringify(drafts));
				}
			} catch (e) {
				console.error('Error clearing submitted drafts', e);
			}

			if (data?.queued) {
				showNotification(
					'info',
					'You are offline. Grades were queued and will sync when you reconnect.',
				);
				setStudentsForGrading((prev) =>
					prev.map((student) => ({
						...student,
						grades: Object.fromEntries(
							Object.entries(student.grades).map(([period, gradeInfo]) => {
								const wasSubmitted = gradesToSubmit.some(
									(g) =>
										g.studentId === student.studentId && g.period === period,
								);
								return wasSubmitted
									? [period, { grade: '', hasExistingGrade: false }]
									: [period, gradeInfo];
							}),
						),
					})),
				);
				return;
			}

			window.dispatchEvent(new CustomEvent('grading:counts:refresh'));
			showNotification(
				'success',
				`Successfully submitted ${gradesToSubmit.length} grades!`,
			);

			setStudentsForGrading((prev) =>
				prev.map((student) => ({
					...student,
					grades: Object.fromEntries(
						Object.entries(student.grades).map(([period, gradeInfo]) => {
							const submitted = gradesToSubmit.find(
								(g) => g.studentId === student.studentId && g.period === period,
							);
							if (submitted) {
								return [
									period,
									{
										grade: submitted.grade,
										hasExistingGrade: true,
										status: 'pending',
									},
								];
							}
							return [period, gradeInfo];
						}),
					),
				})),
			);
		} catch (err: any) {
			showNotification('error', `Error: ${err.message}`);
			console.error('Error submitting grades:', err);
		} finally {
			setLoading((prev) => ({ ...prev, submittingGrades: false }));
		}
	};

	const newGradesCount = useMemo(() => {
		return studentsForGrading.reduce((count, student) => {
			return (
				count +
				selectedPeriods.filter((period) => {
					const gradeInfo = student.grades[period];
					return (
						gradeInfo && !gradeInfo.hasExistingGrade && gradeInfo.grade !== ''
					);
				}).length
			);
		}, 0);
	}, [studentsForGrading, selectedPeriods]);

	const totalGradableSlots = useMemo(() => {
		return studentsForGrading.reduce((count, student) => {
			return (
				count +
				selectedPeriods.filter((period) => {
					const gradeInfo = student.grades[period];
					return gradeInfo && !gradeInfo.hasExistingGrade;
				}).length
			);
		}, 0);
	}, [studentsForGrading, selectedPeriods]);

	const getGradeValidationStatus = (grade: number | '') => {
		if (grade === '') return { isValid: true, message: '' };
		const num = Number(grade);
		if (num < 60) return { isValid: false, message: 'Min: 60' };
		if (num > 100) return { isValid: false, message: 'Max: 100' };
		return { isValid: true, message: '' };
	};

	const getGradeDisplayColor = (
		grade: number | '',
		isExisting: boolean = false,
	) => {
		if (grade === '')
			return isExisting ? 'text-muted-foreground' : 'text-foreground';
		const num = Number(grade);
		if (Number.isNaN(num))
			return isExisting ? 'text-muted-foreground' : 'text-foreground';
		if (num < PASS_MARK) return FAIL_GRADE_CLASS;
		return PASS_GRADE_CLASS;
	};

	const hasNoClasses = assignedClasses.length === 0;
	const showSessionSelect = !hasNoClasses && availableSessions.length > 1;
	const showLevelSelect = !hasNoClasses && availableLevels.length > 1;
	const showClassSelect =
		!hasNoClasses && !isSelfContainedTeacher && availableClasses.length > 0;
	const showSubjectSelect = !hasNoClasses && availableSubjects.length > 0;
	const showAcademicYearFilter = availableAcademicYears.length > 1;

	const Notification = () => {
		if (!notification) return null;

		const config = {
			success: {
				bg: 'bg-green-50/95 dark:bg-green-950/95 border-green-300 dark:border-green-700',
				text: 'text-green-800 dark:text-green-200',
				icon: CheckCircle,
				iconColor: 'text-green-500',
			},
			error: {
				bg: 'bg-red-50/95 dark:bg-red-950/95 border-red-300 dark:border-red-700',
				text: 'text-red-800 dark:text-red-200',
				icon: AlertCircle,
				iconColor: 'text-red-500',
			},
			info: {
				bg: 'bg-blue-50/95 dark:bg-blue-950/95 border-blue-300 dark:border-blue-700',
				text: 'text-blue-800 dark:text-blue-200',
				icon: Info,
				iconColor: 'text-blue-500',
			},
		}[notification.type];

		const Icon = config.icon;

		if (notification.type === 'error') {
			return (
				<>
					<div
						className={`fixed inset-0 bg-black/45 backdrop-blur-[2px] z-[80] transition-opacity duration-500 ${notification.isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
						onClick={dismissNotification}
					/>
					<div
						className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[90%] max-w-md transition-all duration-500 ${notification.isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
					>
						<div
							className={`${config.bg} ${config.text} border-2 rounded-xl shadow-2xl p-5 relative backdrop-blur-sm`}
						>
							<div className="flex items-start gap-3">
								<Icon
									className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`}
								/>
								<div className="flex-1 min-w-0">
									<p className="font-semibold text-sm">
										{notification.type.charAt(0).toUpperCase() +
											notification.type.slice(1)}
									</p>
									<p className="text-sm mt-0.5 opacity-100">
										{notification.message}
									</p>
								</div>
							</div>
							<button
								onClick={dismissNotification}
								className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
								aria-label="Close"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
				</>
			);
		}

		return (
			<div
				className={`fixed top-4 right-4 z-[90] w-[calc(100%-2rem)] max-w-sm transition-all duration-500 ${notification.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
			>
				<div
					className={`${config.bg} ${config.text} border-2 rounded-xl shadow-2xl px-4 py-3.5 flex items-start gap-3 backdrop-blur-sm`}
				>
					<Icon
						className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`}
					/>
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-sm capitalize">
							{notification.type}
						</p>
						<p className="text-sm opacity-100">{notification.message}</p>
					</div>
					<button
						onClick={dismissNotification}
						className="rounded-full p-0.5 hover:bg-black/10"
						aria-label="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
		);
	};

	if (loading.teacherInfo)
		return <PageLoading fullScreen={false} message="Loading" />;

	if (error.teacherInfo) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center p-4">
				<div className="text-center text-destructive">{error.teacherInfo}</div>
			</div>
		);
	}

	if (periods.length === 0) {
		return (
			<div className="min-h-screen bg-background p-4 sm:p-6">
				<div className="flex items-center gap-2 mb-6">
					<div className="p-2 bg-primary/10 rounded-lg">
						<BarChart3 className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h1 className="text-xl font-bold text-foreground">Submit Grades</h1>
						<p className="text-xs text-muted-foreground">
							Submit grades for your classes
						</p>
					</div>
				</div>
				<div className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 rounded-r-lg p-6 text-center">
					<AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
					<h3 className="font-semibold text-foreground mb-1">
						Grade Submission Disabled
					</h3>
					<p className="text-sm text-muted-foreground">
						No grade submission periods are enabled. Please contact an
						administrator.
					</p>
				</div>
			</div>
		);
	}

	const selectedClassName = availableClasses.find(
		(c) => c.classId === selectedClassId,
	)?.name;

	return (
		<div
			className="flex flex-col overflow-hidden"
			style={{ height: 'calc(94vh - var(--app-header-height, 4rem))' }}
		>
			<Notification />

			{/* ── Accordion Toggle for Mobile ── */}
			{(showAcademicYearFilter || !hasNoClasses) && (
				<div className="z-20 shrink-0 bg-background/95 backdrop-blur px-3 sm:px-4 pt-0 mt-0 pb-2 space-y-2 border-b border-border/50 shadow-sm">
					{/* Mobile Summary Bar */}
					<button
						onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
						className="md:hidden flex items-center justify-between w-full bg-card border border-border rounded-xl p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
					>
						<div className="flex items-center gap-2 text-sm font-medium text-foreground overflow-hidden">
							<span className="truncate">
								{selectedAcademicYear || 'Year'}
								{selectedClassName ? ` • ${selectedClassName}` : ''}
								{selectedSubject ? ` • ${selectedSubject}` : ''}
							</span>
						</div>
						<div className="flex items-center gap-2 shrink-0 pl-2">
							{selectedPeriods.length > 0 && (
								<span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
									{selectedPeriods.length} Selected
								</span>
							)}
							<ChevronDown
								className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`}
							/>
						</div>
					</button>

					{/* Collapsible Content */}
					<div
						className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out md:grid-rows-[1fr] md:opacity-100 ${
							isFiltersExpanded
								? 'grid-rows-[1fr] opacity-100'
								: 'grid-rows-[0fr] opacity-0'
						}`}
					>
						<div className="overflow-hidden flex flex-col gap-2">
							{/* Filters */}
							<div className="bg-card border border-border rounded-xl shadow-sm">
								<div className="flex flex-wrap gap-2 p-2.5 sm:p-3 items-end">
									{showAcademicYearFilter && (
										<FilterSelect
											label="Year"
											value={selectedAcademicYear}
											onChange={(v) => setSelectedAcademicYear(v)}
											options={availableAcademicYears.map((y) => ({
												label: y,
												value: y,
											}))}
										/>
									)}

									{isSelectedAcademicYearAllowed && showSessionSelect && (
										<FilterSelect
											label="Session"
											value={selectedSession}
											onChange={handleSessionChange}
											placeholder="Session"
											options={availableSessions.map((s) => ({
												label: s,
												value: s,
											}))}
										/>
									)}

									{isSelectedAcademicYearAllowed &&
										showLevelSelect &&
										selectedSession && (
											<FilterSelect
												label="Level"
												value={selectedClassLevel}
												onChange={handleClassLevelChange}
												placeholder="Level"
												options={availableLevels.map((l) => ({
													label: l,
													value: l,
												}))}
											/>
										)}

									{isSelectedAcademicYearAllowed &&
										showClassSelect &&
										selectedClassLevel && (
											<FilterSelect
												label="Class"
												value={selectedClassId}
												onChange={handleClassChange}
												placeholder="Class"
												options={availableClasses.map((c) => ({
													label: c.name,
													value: c.classId,
												}))}
												disabled={availableClasses.length === 1}
											/>
										)}

									{isSelectedAcademicYearAllowed &&
										!hasNoClasses &&
										isSelfContainedTeacher && (
											<div className="flex flex-col gap-0.5">
												<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
													Class
												</span>
												<div className="h-8 px-3 rounded-lg border border-input bg-muted text-muted-foreground text-sm flex items-center whitespace-nowrap cursor-not-allowed opacity-80">
													{availableClasses[0]?.name || 'Sponsor Class'}
												</div>
											</div>
										)}

									{isSelectedAcademicYearAllowed &&
										showSubjectSelect &&
										selectedClassId && (
											<FilterSelect
												label="Subject"
												value={selectedSubject}
												onChange={(v) => setSelectedSubject(v)}
												placeholder="Subject"
												options={availableSubjects.map((s) => ({
													label: s,
													value: s,
												}))}
												disabled={availableSubjects.length === 1}
											/>
										)}

									{isSelectedAcademicYearAllowed &&
										loading.studentsForGrading && (
											<div className="flex items-end pb-1">
												<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
											</div>
										)}
								</div>

								{selectedAcademicYear && !isSelectedAcademicYearAllowed && (
									<div className="mx-3 mb-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
										Grade submission is not allowed for{' '}
										<strong>{selectedAcademicYear}</strong>. Choose an allowed
										year.
									</div>
								)}
							</div>

							{/* Period chip strip */}
							{isSelectedAcademicYearAllowed &&
								!hasNoClasses &&
								studentsForGrading.length > 0 && (
									<div className="bg-card border border-border rounded-xl px-3 py-2.5 sm:px-4">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap mr-1">
												Periods
											</span>
											{periods.map((p) => {
												const isSelected = selectedPeriods.includes(p.value);
												const allGraded =
													studentsForGrading.length > 0 &&
													studentsForGrading.every(
														(s) => s.grades[p.id]?.hasExistingGrade,
													);

												return (
													<button
														key={p.id}
														onClick={() => handlePeriodToggle(p.value)}
														className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-150 ${
															isSelected
																? 'bg-primary text-primary-foreground border-primary shadow-sm'
																: allGraded
																	? 'bg-muted text-muted-foreground border-border opacity-60'
																	: 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent'
														}`}
													>
														{p.label}
														{allGraded && !isSelected && (
															<CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
														)}
													</button>
												);
											})}
										</div>
									</div>
								)}
						</div>
					</div>
				</div>
			)}

			{/* ── Bottom: scrollable main content area ── */}
			<div className="flex min-h-0 flex-1 flex-col px-3 sm:px-4 pt-2 pb-1">
				{hasNoClasses ? (
					<div className="flex-1 flex items-center justify-center p-6">
						<div className="bg-card border border-border rounded-xl p-8 text-center max-w-sm shadow-sm">
							<div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
								<AlertCircle className="w-7 h-7 text-muted-foreground" />
							</div>
							<h3 className="font-semibold text-foreground mb-1 text-base">
								No Classes Assigned
							</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								You are currently not assigned to any classes or subjects for
								grading in the{' '}
								<span className="font-semibold text-foreground">
									{selectedAcademicYear || 'selected'}
								</span>{' '}
								academic year.
							</p>
							<p className="text-xs text-muted-foreground/80 mt-3 border-t border-border/60 pt-3">
								Please contact your school administrator to update your profile
								assignments.
							</p>
						</div>
					</div>
				) : (
					<>
						{/* ── Empty state ── */}
						{isSelectedAcademicYearAllowed &&
							studentsForGrading.length === 0 &&
							selectedSession &&
							selectedClassLevel &&
							selectedClassId &&
							selectedSubject &&
							!loading.studentsForGrading && (
								<div className="bg-card border border-border rounded-xl p-8 text-center">
									<div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
										<svg
											className="w-7 h-7 text-muted-foreground"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={1.5}
												d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
											/>
										</svg>
									</div>
									<h3 className="font-semibold text-foreground mb-1">
										No Students Found
									</h3>
									<p className="text-sm text-muted-foreground">
										No students enrolled in{' '}
										<span className="font-medium">{selectedClassName}</span> for{' '}
										<span className="font-medium">{selectedSubject}</span>.
									</p>
								</div>
							)}

						{/* ── Grading table ── */}
						{isSelectedAcademicYearAllowed &&
							studentsForGrading.length > 0 &&
							selectedPeriods.length > 0 && (
								<div
									ref={tableScrollContainerRef}
									className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-sm"
								>
									{error.studentsForGrading && (
										<div className="mx-4 mt-3 text-destructive p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
											{error.studentsForGrading}
										</div>
									)}

									<table className="min-w-max w-full border-collapse">
										<thead className="bg-muted">
											<tr>
												<th className="sticky top-0 left-0 z-30 bg-muted border-b border-r border-border px-3 sm:px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[140px] sm:min-w-[200px]">
													Student
												</th>
												{orderedSelectedPeriods.map((period) => {
													const p = periods.find((x) => x.id === period);
													const isActiveCol = activePeriod === period;
													return (
														<th
															key={period}
															className={`sticky top-0 z-20 border-b border-r border-border px-3 sm:px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
																isActiveCol
																	? 'bg-primary text-primary-foreground'
																	: 'bg-muted text-muted-foreground'
															}`}
														>
															{p?.label || period}
														</th>
													);
												})}
											</tr>
										</thead>
										<tbody className="divide-y divide-border">
											{studentsForGrading
												.slice()
												.sort((a, b) =>
													a.studentName.localeCompare(b.studentName),
												)
												.map((student) => {
													const isActive =
														activeStudentId === student.studentId;
													return (
														<tr
															key={student.studentId}
															className="hover:bg-muted/30 transition-colors"
														>
															{/* Name cell */}
															<td
																className={`sticky left-0 z-10 border-r border-border px-3 sm:px-4 py-2.5 whitespace-nowrap transition-colors ${
																	isActive
																		? 'bg-primary'
																		: 'bg-card dark:bg-card'
																}`}
															>
																<span
																	className={`text-sm font-medium truncate max-w-[120px] sm:max-w-[200px] block ${
																		isActive
																			? 'text-primary-foreground'
																			: 'text-foreground'
																	}`}
																>
																	{student.studentName}
																</span>
															</td>

															{/* Grade cells */}
															{orderedSelectedPeriods.map((period) => {
																const gradeInfo = student.grades[period];
																const isExisting = gradeInfo?.hasExistingGrade;
																const gradeValue = gradeInfo?.grade;
																const validation =
																	getGradeValidationStatus(gradeValue);
																const isInvalid =
																	!validation.isValid && gradeValue !== '';

																return (
																	<td
																		key={period}
																		className="border-r border-border px-3 sm:px-4 py-2"
																	>
																		{isExisting ? (
																			<div className="flex items-center justify-center gap-1.5">
																				<span
																					className={`text-base font-semibold tabular-nums ${getGradeDisplayColor(gradeValue, true)}`}
																				>
																					{gradeValue}
																				</span>
																				{gradeInfo.status?.toLowerCase() ===
																					'approved' && (
																					<CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
																				)}
																				{gradeInfo.status?.toLowerCase() ===
																					'pending' && (
																					<Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
																				)}
																			</div>
																		) : (
																			<div className="flex flex-col items-center gap-0.5">
																				<div className="relative">
																					<input
																						type="text"
																						data-grade-input="true"
																						data-student-id={student.studentId}
																						data-period={period}
																						value={
																							gradeValue === ''
																								? ''
																								: String(gradeValue)
																						}
																						onChange={(e) =>
																							handleGradeChange(
																								student.studentId,
																								period,
																								e.target.value,
																							)
																						}
																						onFocus={() => {
																							setActiveStudentId(
																								student.studentId,
																							);
																							setActivePeriod(period);
																						}}
																						onBlur={(e) =>
																							handleGradeBlur(
																								student.studentId,
																								period,
																								e.target.value,
																							)
																						}
																						onKeyDown={handleGradeKeyDown}
																						placeholder="–"
																						inputMode="numeric"
																						className={`w-16 sm:w-20 h-9 rounded-lg border-2 text-center text-sm font-semibold focus:ring-2 focus:ring-ring focus:border-ring transition-colors bg-background ${getGradeDisplayColor(gradeValue)} ${
																							gradeInfo?.isDraft ? 'pr-4' : ''
																						} ${
																							isInvalid
																								? 'border-red-400 focus:ring-red-400'
																								: 'border-input hover:border-ring/50'
																						}`}
																					/>
																					{gradeInfo?.isDraft &&
																						gradeValue !== '' &&
																						validation.isValid && (
																							<div
																								className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
																								title="Unsubmitted Draft"
																							>
																								<Save className="w-3.5 h-3.5 text-primary/60" />
																							</div>
																						)}
																				</div>
																				{isInvalid && (
																					<span className="text-[10px] text-red-500 font-medium leading-none">
																						{validation.message}
																					</span>
																				)}
																				{validation.isValid &&
																					gradeValue !== '' &&
																					Number(gradeValue) >= 60 && (
																						<span
																							className={`text-[10px] font-medium leading-none ${Number(gradeValue) >= PASS_MARK ? PASS_GRADE_CLASS : FAIL_GRADE_CLASS}`}
																						>
																							{Number(gradeValue) >= PASS_MARK
																								? 'Pass'
																								: 'Fail'}
																						</span>
																					)}
																			</div>
																		)}
																	</td>
																);
															})}
														</tr>
													);
												})}
										</tbody>
									</table>
								</div>
							)}

						{isSelectedAcademicYearAllowed &&
							studentsForGrading.length > 0 &&
							selectedPeriods.length > 0 && (
								<div className="shrink-0 pt-5">
									<div className="flex items-center justify-between gap-2">
										<button
											onClick={() => setIsGenerateModalOpen(true)}
											disabled={
												loading.submittingGrades || totalGradableSlots === 0
											}
											className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-secondary px-3 py-3 text-sm font-semibold text-secondary-foreground shadow-lg transition-all hover:bg-secondary/80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none sm:px-5"
										>
											<BarChart3 className="w-4 h-4" />
											<span className="truncate">Generate Grades</span>
										</button>

										<button
											onClick={handleSubmitGrades}
											disabled={
												loading.submittingGrades || newGradesCount === 0
											}
											className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5"
										>
											{loading.submittingGrades ? (
												<>
													<Loader2 className="w-4 h-4 animate-spin" />
													<span className="truncate">Submitting…</span>
												</>
											) : (
												<>
													<Send className="w-4 h-4" />
													<span className="truncate">
														{newGradesCount > 0
															? `Submit ${newGradesCount} grade${newGradesCount !== 1 ? 's' : ''}`
															: 'No new grades'}
													</span>
												</>
											)}
										</button>
									</div>
								</div>
							)}
					</>
				)}
			</div>

			{isGenerateModalOpen &&
				(() => {
					const minVal = genRange.min === '' ? '' : Number(genRange.min);
					const maxVal = genRange.max === '' ? '' : Number(genRange.max);
					const isMinInvalid = minVal !== '' && (minVal < 60 || minVal > 100);
					const isMaxInvalid = maxVal !== '' && (maxVal < 60 || maxVal > 100);

					return (
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
							<div className="bg-card p-6 rounded-xl shadow-xl w-full max-w-xs border border-border">
								<h3 className="font-semibold mb-4 text-foreground">
									Generate Random Grades
								</h3>
								<div className="flex gap-4 mb-6">
									<div className="flex-1">
										<label className="text-xs font-medium text-muted-foreground block mb-1">
											Min
										</label>
										<input
											type="number"
											min={60}
											max={100}
											placeholder="60"
											value={genRange.min}
											onChange={(e) =>
												setGenRange((p) => ({ ...p, min: e.target.value }))
											}
											className={`w-full h-9 rounded-lg border-2 text-center text-sm font-semibold focus:ring-2 focus:ring-ring focus:border-ring transition-colors bg-background ${getGradeDisplayColor(minVal)} ${
												isMinInvalid
													? 'border-red-400 focus:ring-red-400'
													: 'border-input hover:border-ring/50'
											}`}
										/>
									</div>
									<div className="flex-1">
										<label className="text-xs font-medium text-muted-foreground block mb-1">
											Max
										</label>
										<input
											type="number"
											min={60}
											max={100}
											placeholder="100"
											value={genRange.max}
											onChange={(e) =>
												setGenRange((p) => ({ ...p, max: e.target.value }))
											}
											className={`w-full h-9 rounded-lg border-2 text-center text-sm font-semibold focus:ring-2 focus:ring-ring focus:border-ring transition-colors bg-background ${getGradeDisplayColor(maxVal)} ${
												isMaxInvalid
													? 'border-red-400 focus:ring-red-400'
													: 'border-input hover:border-ring/50'
											}`}
										/>
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => setIsGenerateModalOpen(false)}
										className="flex-1 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted"
									>
										Cancel
									</button>
									<button
										onClick={handleGenerateGrades}
										className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground"
									>
										Generate
									</button>
								</div>
							</div>
						</div>
					);
				})()}
		</div>
	);
};

/* ── Reusable compact filter select ── */
interface FilterSelectProps {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
	placeholder?: string;
	disabled?: boolean;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
	label,
	value,
	onChange,
	options,
	placeholder,
	disabled,
}) => (
	<div className="flex flex-col gap-0.5">
		<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
			{label}
		</span>
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className={`h-8 pl-3 pr-8 rounded-lg border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${
					disabled
						? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 border-input'
						: 'bg-background text-foreground cursor-pointer border-input hover:border-ring/50'
				}`}
			>
				{placeholder && !disabled && <option value="">{placeholder}</option>}
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
			{!disabled && (
				<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
			)}
		</div>
	</div>
);

export default SubmitGrade;
