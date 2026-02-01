'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	Loader2,
	CheckCircle,
	AlertCircle,
	Info,
	X,
	BarChart3,
	User,
	GraduationCap,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import { PageLoading } from '@/components/loading';

// Types
interface TeacherInfo {
	name: string;
	userId: string;
	username: string;
	role: 'teacher';
	subjects: { subject: string; level: string; session: string }[];
	sponsorClass?: string;
}

interface GradeInputState {
	grade: number | '';
	hasExistingGrade: boolean;
	status?: string;
}

interface StudentForGrading {
	studentId: string;
	name: string;
	grades: { [period: string]: GradeInputState };
}

const allPeriods = [
	{ id: 'first', label: 'First Period', value: 'first' },
	{ id: 'second', label: 'Second Period', value: 'second' },
	{ id: 'third', label: 'Third Period', value: 'third' },
	{
		id: 'third_period_exam',
		label: 'Third Period Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: 'Fourth Period', value: 'fourth' },
	{ id: 'fifth', label: 'Fifth Period', value: 'fifth' },
	{ id: 'sixth', label: 'Sixth Period', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: 'Sixth Period Exam',
		value: 'sixth_period_exam',
	},
];

const SubmitGrade: React.FC = () => {
	const school = useSchoolStore((state) => state.school);
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

	const getAcademicYear = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;
		return currentMonth >= 8
			? `${currentYear}-${currentYear + 1}`
			: `${currentYear - 1}-${currentYear}`;
	};

	const periods = useMemo(() => {
		if (school?.settings?.teacherSettings?.gradeSubmissionPeriods) {
			const allowedPeriods =
				school.settings.teacherSettings.gradeSubmissionPeriods;
			return allPeriods.filter((p) => allowedPeriods.includes(p.id));
		}
		return allPeriods;
	}, [school]);

	const availableAcademicYears = useMemo(() => {
		return (
			school?.settings?.teacherSettings?.gradeSubmissionAcademicYears || [
				getAcademicYear(),
			]
		);
	}, [school]);

	useEffect(() => {
		if (availableAcademicYears.length === 1) {
			setSelectedAcademicYear(availableAcademicYears[0]);
		} else if (availableAcademicYears.includes(getAcademicYear())) {
			setSelectedAcademicYear(getAcademicYear());
		} else {
			setSelectedAcademicYear('');
		}
	}, [availableAcademicYears]);

	useEffect(() => {
		if (notification?.isVisible) {
			const timer = setTimeout(() => {
				setNotification((prev) =>
					prev ? { ...prev, isVisible: false } : null
				);
				setTimeout(() => setNotification(null), 300);
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [notification?.isVisible]);

	const showNotification = (
		type: 'success' | 'error' | 'info',
		message: string
	) => {
		setNotification({ type, message, isVisible: true });
	};

	const dismissNotification = () => {
		setNotification((prev) => (prev ? { ...prev, isVisible: false } : null));
		setTimeout(() => setNotification(null), 300);
	};

	useEffect(() => {
		const fetchTeacherInfo = async () => {
			setLoading((prev) => ({ ...prev, teacherInfo: true }));
			try {
				const res = await fetch('/api/auth/me');
				if (!res.ok) throw new Error('Failed to fetch teacher info');
				const data = await res.json();
				setTeacherInfo(data.user);
				setError((prev) => ({ ...prev, teacherInfo: '' }));
			} catch (err) {
				setError((prev) => ({
					...prev,
					teacherInfo: 'Failed to load teacher information.',
				}));
				console.error(err);
			} finally {
				setLoading((prev) => ({ ...prev, teacherInfo: false }));
			}
		};
		fetchTeacherInfo();
	}, []);

	const availableSessions = useMemo(() => {
		if (!teacherInfo?.subjects) return [];
		return [...new Set(teacherInfo.subjects.map((s) => s.session))];
	}, [teacherInfo]);

	const availableLevels = useMemo(() => {
		if (!selectedSession || !teacherInfo?.subjects) return [];
		return [
			...new Set(
				teacherInfo.subjects
					.filter((s) => s.session === selectedSession)
					.map((s) => s.level)
			),
		];
	}, [selectedSession, teacherInfo]);

	const isSelfContainedTeacher = useMemo(() => {
		return availableLevels.includes('Self Contained');
	}, [availableLevels]);

	const availableClasses = useMemo(() => {
		if (
			!selectedSession ||
			!selectedClassLevel ||
			!school?.classLevels?.[selectedSession]?.[selectedClassLevel]
		)
			return [];

		if (isSelfContainedTeacher && teacherInfo?.sponsorClass) {
			const allClassesInLevel =
				school.classLevels[selectedSession]?.[selectedClassLevel]?.classes ||
				[];
			return allClassesInLevel.filter(
				(cls) => cls.classId === teacherInfo.sponsorClass
			);
		}

		return (
			school.classLevels[selectedSession][selectedClassLevel].classes || []
		);
	}, [
		selectedSession,
		selectedClassLevel,
		school,
		isSelfContainedTeacher,
		teacherInfo?.sponsorClass,
	]);

	const availableSubjects = useMemo(() => {
		if (!selectedSession || !selectedClassLevel || !teacherInfo?.subjects)
			return [];
		return [
			...new Set(
				teacherInfo.subjects
					.filter(
						(s) =>
							s.session === selectedSession && s.level === selectedClassLevel
					)
					.map((s) => s.subject)
			),
		];
	}, [selectedSession, selectedClassLevel, teacherInfo]);

	useEffect(() => {
		if (availableSessions.length === 1 && !selectedSession) {
			setSelectedSession(availableSessions[0]);
		}
	}, [availableSessions, selectedSession]);

	useEffect(() => {
		if (availableLevels.length === 1 && !selectedClassLevel) {
			setSelectedClassLevel(availableLevels[0]);
		}
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
		if (availableSubjects.length === 1 && !selectedSubject) {
			setSelectedSubject(availableSubjects[0]);
		}
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

		setLoading((prev) => ({ ...prev, studentsForGrading: true }));
		setError((prev) => ({ ...prev, studentsForGrading: '' }));
		setStudentsForGrading([]);
		setNotification(null);

		try {
			const studentsRes = await fetch(`/api/users?classId=${selectedClassId}`);
			if (!studentsRes.ok)
				throw new Error('Failed to fetch students for class');
			const studentsData = await studentsRes.json();
			const studentsList = studentsData.data;

			if (!studentsList || studentsList.length === 0) {
				setStudentsForGrading([]);
				return;
			}

			const existingGradesRes = await fetch(
				`/api/grades?academicYear=${selectedAcademicYear}&classId=${selectedClassId}&subject=${selectedSubject}&reportType=masters`
			);
			if (!existingGradesRes.ok)
				throw new Error('Failed to fetch existing grades');
			const existingGradesData = await existingGradesRes.json();

			const reportStudentsMap = new Map();
			if (existingGradesData.data?.report?.students) {
				existingGradesData.data.report.students.forEach((student: any) => {
					reportStudentsMap.set(student.studentId, student.periods);
				});
			}

			const periodIdToApiKey: Record<string, string> = {
				first: 'first',
				second: 'second',
				third: 'third',
				third_period_exam: 'third_period_exam',
				fourth: 'fourth',
				fifth: 'fifth',
				sixth: 'sixth',
				sixth_period_exam: 'six_period_exam',
			};

			const initialStudentsForGrading = studentsList.map((student: any) => {
				const studentExistingPeriods =
					reportStudentsMap.get(student.studentId) || {};
				const grades: { [period: string]: GradeInputState } = {};

				periods.forEach(({ id }) => {
					const apiPeriodKey = periodIdToApiKey[id] || id;
					const existingGrade = studentExistingPeriods[apiPeriodKey];

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
					} else {
						grades[id] = {
							grade: '',
							hasExistingGrade: false,
						};
					}
				});

				return {
					studentId: student.studentId,
					name: `${student.firstName} ${student.lastName}`,
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
		periods,
	]);

	useEffect(() => {
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
	]);

	const handlePeriodToggle = (periodValue: string, checked: boolean) => {
		if (checked) {
			setSelectedPeriods((prev) => [...prev, periodValue]);
		} else {
			setSelectedPeriods((prev) =>
				prev.filter((period) => period !== periodValue)
			);
		}
	};

	const handleGradeChange = (
		studentId: string,
		period: string,
		value: string
	) => {
		if (value !== '' && (isNaN(Number(value)) || !/^\d*\.?\d*$/.test(value))) {
			return;
		}

		let numericValue: number | '' = '';
		if (value !== '') {
			const num = Number(value);
			if (num > 100) {
				return;
			}
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
								},
							},
					  }
					: student
			)
		);
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
		setSelectedSubject('');
	};

	const orderedSelectedPeriods = useMemo(() => {
		return periods
			.filter((period) => selectedPeriods.includes(period.id))
			.map((period) => period.id);
	}, [selectedPeriods, periods]);

	const handleSubmitGrades = async () => {
		if (selectedPeriods.length === 0) {
			showNotification(
				'error',
				'Please select at least one period to submit grades for.'
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
					name: student.name,
					grade: Number(student.grades[period].grade),
					period: period,
				}))
		);

		if (gradesToSubmit.length === 0) {
			showNotification(
				'info',
				'No new grades to submit. Students may already have grades for the selected periods.'
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

			showNotification(
				'success',
				`Successfully submitted ${gradesToSubmit.length} grades!`
			);

			setTimeout(() => {
				window.location.href = '/dashboard/grade-submissions';
			}, 2000);
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

	const getStatusBadgeColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case 'approved':
				return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
			case 'rejected':
				return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};

	const getGradeValidationStatus = (grade: number | '') => {
		if (grade === '') return { isValid: true, message: '' };
		const num = Number(grade);
		if (num < 60) return { isValid: false, message: 'Min: 60' };
		if (num > 100) return { isValid: false, message: 'Max: 100' };
		return { isValid: true, message: '' };
	};

	const getGradeDisplayColor = (
		grade: number | '',
		isExisting: boolean = false
	) => {
		if (grade === '' || Number(grade) < 60)
			return isExisting ? 'text-muted-foreground' : 'text-foreground';
		const num = Number(grade);
		if (num < 70) return 'text-red-600 dark:text-red-400';
		return 'text-blue-600 dark:text-blue-400';
	};

	const showSessionSelect = availableSessions.length > 1;
	const showLevelSelect = availableLevels.length > 1;
	const showClassSelect =
		!isSelfContainedTeacher && availableClasses.length > 1;
	const showSubjectSelect = availableSubjects.length > 1;
	const showAcademicYearFilter = availableAcademicYears.length > 1;

	const PopupNotification = () => {
		if (!notification) return null;

		const getNotificationStyles = () => {
			switch (notification.type) {
				case 'success':
					return {
						bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
						text: 'text-green-800 dark:text-green-200',
						icon: CheckCircle,
						iconColor: 'text-green-500 dark:text-green-400',
					};
				case 'error':
					return {
						bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
						text: 'text-red-800 dark:text-red-200',
						icon: AlertCircle,
						iconColor: 'text-red-500 dark:text-red-400',
					};
				case 'info':
					return {
						bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
						text: 'text-blue-800 dark:text-blue-200',
						icon: Info,
						iconColor: 'text-blue-500 dark:text-blue-400',
					};
				default:
					return {
						bg: 'bg-muted border-border',
						text: 'text-foreground',
						icon: Info,
						iconColor: 'text-muted-foreground',
					};
			}
		};

		const styles = getNotificationStyles();
		const IconComponent = styles.icon;

		return (
			<>
				<div
					className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
						notification.isVisible
							? 'opacity-100'
							: 'opacity-0 pointer-events-none'
					}`}
					onClick={dismissNotification}
				/>
				<div
					className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md transition-all duration-300 ${
						notification.isVisible
							? 'scale-100 opacity-100'
							: 'scale-95 opacity-0 pointer-events-none'
					}`}
				>
					<div
						className={`${styles.bg} ${styles.text} border-2 rounded-xl shadow-2xl p-4 sm:p-6 relative`}
					>
						<div className="flex items-start space-x-3 sm:space-x-4">
							<div className={`flex-shrink-0 ${styles.iconColor}`}>
								<IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm sm:text-base font-semibold leading-5 sm:leading-6">
									{notification.type.charAt(0).toUpperCase() +
										notification.type.slice(1)}
								</p>
								<p className="text-xs sm:text-sm mt-1 opacity-90">
									{notification.message}
								</p>
							</div>
						</div>
						<button
							onClick={dismissNotification}
							className={`absolute top-3 right-3 sm:top-4 sm:right-4 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.iconColor}`}
							aria-label="Close notification"
						>
							<X className="w-4 h-4 sm:w-5 sm:h-5" />
						</button>
					</div>
				</div>
			</>
		);
	};

	const EmptyStudentsState = () => {
		if (loading.studentsForGrading) return null;

		const className = availableClasses.find(
			(c) => c.classId === selectedClassId
		)?.name;

		return (
			<div className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-sm text-center">
				<div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-3 sm:mb-4">
					<svg
						className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 4.354a4 4 0 110 5.292m15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
						/>
					</svg>
				</div>
				<h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
					No Students Found
				</h3>
				<p className="text-sm sm:text-base text-muted-foreground mb-4">
					There are currently no students enrolled in{' '}
					<span className="font-medium">{className}</span> for{' '}
					<span className="font-medium">{selectedSubject}</span>.
				</p>
			</div>
		);
	};

	if (loading.teacherInfo) {
		return <PageLoading fullScreen={false} message="Loading" />;
	}

	if (error.teacherInfo) {
		return (
			<div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
				<div className="text-center text-destructive">{error.teacherInfo}</div>
			</div>
		);
	}

	if (periods.length === 0) {
		return (
			<div className="min-h-screen bg-background p-4 sm:p-6">
				<div className="max-w-7xl mx-auto">
					<div className="mb-6 sm:mb-8">
						<div className="flex items-center gap-2 sm:gap-3 mb-2">
							<div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
								<BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
							</div>
							<div>
								<h1 className="text-xl sm:text-2xl font-bold text-foreground">
									Submit Grades
								</h1>
								<p className="text-xs sm:text-sm text-muted-foreground">
									Submit grades for your classes
								</p>
							</div>
						</div>
					</div>
					<div className="bg-card border-l-4 border-yellow-500 rounded-r-lg p-4 sm:p-6 shadow-sm text-center">
						<div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-3 sm:mb-4">
							<AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 dark:text-yellow-400" />
						</div>
						<h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
							Grade Submission Disabled
						</h3>
						<p className="text-sm sm:text-base text-muted-foreground">
							The administrator has not enabled grade submission for any
							academic periods at this time. Please check back later or contact
							an administrator for more information.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
			<div className="max-w-7xl mx-auto">
				<div className="mb-4 sm:mb-6 md:mb-8">
					<div className="flex items-center gap-2 sm:gap-3 mb-2">
						<div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
							<BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
						</div>
						<div>
							<h1 className="text-xl sm:text-2xl font-bold text-foreground">
								Submit Grades
							</h1>
							<p className="text-xs sm:text-sm text-muted-foreground">
								Submit grades for your classes
							</p>
						</div>
					</div>
				</div>

				<PopupNotification />

				<div className="space-y-4 sm:space-y-6">
					<div className="p-4 sm:p-6 bg-card border border-border rounded-lg shadow-sm">
						<h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-foreground">
							Submit New Grades
						</h3>
						<p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
							Follow the steps to select your class and subject.
						</p>

						<div className="space-y-3 sm:space-y-4">
							{showAcademicYearFilter && (
								<div>
									<label className="block text-sm font-medium text-foreground mb-1.5">
										Academic Year
									</label>
									<select
										value={selectedAcademicYear}
										onChange={(e) => setSelectedAcademicYear(e.target.value)}
										className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-foreground focus:border-ring focus:ring-2 focus:ring-ring text-sm sm:text-base"
									>
										<option value="">Select Year</option>
										{availableAcademicYears.map((year, index) => (
											<option key={`year-${year}-${index}`} value={year}>
												{year}
											</option>
										))}
									</select>
								</div>
							)}

							{showSessionSelect && (
								<div>
									<label className="block text-sm font-medium text-foreground mb-1.5">
										Session
									</label>
									<select
										value={selectedSession}
										onChange={(e) => handleSessionChange(e.target.value)}
										className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-foreground focus:border-ring focus:ring-2 focus:ring-ring text-sm sm:text-base"
									>
										<option value="">Select Session</option>
										{availableSessions.map((session, index) => (
											<option
												key={`session-${session}-${index}`}
												value={session}
											>
												{session}
											</option>
										))}
									</select>
								</div>
							)}

							{showLevelSelect && selectedSession && (
								<div>
									<label className="block text-sm font-medium text-foreground mb-1.5">
										Class Level
									</label>
									<select
										value={selectedClassLevel}
										onChange={(e) => handleClassLevelChange(e.target.value)}
										className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-foreground focus:border-ring focus:ring-2 focus:ring-ring text-sm sm:text-base"
									>
										<option value="">Select Level</option>
										{availableLevels.map((level, index) => (
											<option key={`level-${level}-${index}`} value={level}>
												{level}
											</option>
										))}
									</select>
								</div>
							)}

							{showClassSelect && selectedClassLevel && (
								<div>
									<label className="block text-sm font-medium text-foreground mb-1.5">
										Class
									</label>
									<select
										value={selectedClassId}
										onChange={(e) => handleClassChange(e.target.value)}
										className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-foreground focus:border-ring focus:ring-2 focus:ring-ring text-sm sm:text-base"
									>
										<option value="">Select Class</option>
										{availableClasses.map((cls, index) => (
											<option
												key={`class-${cls.classId}-${index}`}
												value={cls.classId}
											>
												{cls.name}
											</option>
										))}
									</select>
								</div>
							)}

							{isSelfContainedTeacher && (
								<div>
									<label className="block text-sm font-medium text-foreground mb-1.5">
										Class
									</label>
									<div className="block w-full rounded-lg border border-input bg-muted py-2.5 px-3 text-muted-foreground text-sm sm:text-base">
										{availableClasses[0]?.name || 'Sponsor Class'}
									</div>
								</div>
							)}

							{showSubjectSelect && selectedClassId && (
								<div>
									<label className="block text-sm font-medium text-foreground mb-1.5">
										Subject
									</label>
									<select
										value={selectedSubject}
										onChange={(e) => setSelectedSubject(e.target.value)}
										className="block w-full rounded-lg border border-input bg-background py-2.5 px-3 text-foreground focus:border-ring focus:ring-2 focus:ring-ring text-sm sm:text-base"
									>
										<option value="">Select Subject</option>
										{availableSubjects.map((subject, index) => (
											<option
												key={`subject-${subject}-${index}`}
												value={subject}
											>
												{subject}
											</option>
										))}
									</select>
								</div>
							)}
						</div>

						{loading.studentsForGrading && (
							<div className="mt-6">
								<PageLoading message="Loading Students..." fullScreen={false} />
							</div>
						)}

						{studentsForGrading.length > 0 && (
							<div className="mt-4 sm:mt-6">
								<label className="block text-sm font-medium text-foreground mb-2 sm:mb-3">
									Select Periods to Grade
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
									{periods.map((p) => (
										<label
											key={`period-${p.id}`}
											className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
										>
											<input
												type="checkbox"
												className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
												checked={selectedPeriods.includes(p.value)}
												onChange={(e) =>
													handlePeriodToggle(p.value, e.target.checked)
												}
											/>
											<span className="text-sm font-medium text-foreground">
												{p.label}
											</span>
										</label>
									))}
								</div>
							</div>
						)}
					</div>

					{studentsForGrading.length === 0 &&
						selectedSession &&
						selectedClassLevel &&
						selectedClassId &&
						selectedSubject && <EmptyStudentsState />}

					{studentsForGrading.length > 0 && selectedPeriods.length > 0 && (
						<div className="bg-card border border-border rounded-lg shadow-sm">
							<div className="p-4 sm:p-6 border-b border-border">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
									<div>
										<h3 className="text-lg sm:text-xl font-semibold text-foreground">
											Grade Students
										</h3>
										{newGradesCount > 0 && (
											<p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1">
												{newGradesCount} new grades ready to submit
											</p>
										)}
									</div>
								</div>
							</div>

							{error.studentsForGrading && (
								<div className="m-4 text-destructive p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
									{error.studentsForGrading}
								</div>
							)}

							<div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
								{studentsForGrading
									.slice()
									.sort((a, b) => a.name.localeCompare(b.name))
									.map((student) => (
										<div
											key={student.studentId}
											className="border border-border rounded-lg overflow-hidden"
										>
											<div className="w-full flex items-center justify-between p-3 sm:p-4 bg-muted">
												<div className="flex items-center gap-2 sm:gap-3">
													<div className="p-1.5 sm:p-2 bg-primary/10 rounded-full">
														<User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
													</div>
													<span className="font-medium text-sm sm:text-base text-foreground">
														{student.name}
													</span>
												</div>
											</div>

											<div className="p-3 sm:p-4 space-y-3 bg-background">
												{orderedSelectedPeriods.map((period) => {
													const gradeInfo = student.grades[period];
													const periodLabel = periods.find(
														(p) => p.value === period
													)?.label;
													const isExisting = gradeInfo?.hasExistingGrade;
													const gradeValue = gradeInfo?.grade;
													const validationStatus =
														getGradeValidationStatus(gradeValue);
													const isInvalid =
														!validationStatus.isValid && gradeValue !== '';

													return (
														<div
															key={period}
															className="flex items-center justify-between p-3 bg-muted rounded-lg"
														>
															<div className="flex-1">
																<div className="flex items-center gap-2 mb-1">
																	<GraduationCap className="w-4 h-4 text-muted-foreground" />
																	<span className="text-sm font-medium text-foreground">
																		{periodLabel}
																	</span>
																</div>
																{isExisting && gradeInfo.status && (
																	<span
																		className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(
																			gradeInfo.status
																		)}`}
																	>
																		{gradeInfo.status}
																	</span>
																)}
																{isInvalid && (
																	<div className="text-xs text-red-500 font-medium mt-1">
																		{validationStatus.message}
																	</div>
																)}
																{validationStatus.isValid &&
																	gradeValue !== '' &&
																	Number(gradeValue) >= 60 &&
																	!isExisting && (
																		<div
																			className={`text-xs font-medium mt-1 ${
																				Number(gradeValue) >= 70
																					? 'text-blue-600 dark:text-blue-400'
																					: 'text-red-600 dark:text-red-400'
																			}`}
																		>
																			{Number(gradeValue) >= 70
																				? 'Pass'
																				: 'Fail'}
																		</div>
																	)}
															</div>
															<div className="flex items-center gap-2">
																{isExisting ? (
																	<div
																		className={`text-xl sm:text-2xl font-bold ${getGradeDisplayColor(
																			gradeValue,
																			true
																		)}`}
																	>
																		{gradeValue}
																	</div>
																) : (
																	<input
																		type="text"
																		value={gradeValue || ''}
																		onChange={(e) =>
																			handleGradeChange(
																				student.studentId,
																				period,
																				e.target.value
																			)
																		}
																		placeholder="0"
																		className={`w-16 sm:w-20 h-12 sm:h-14 rounded-lg border-2 text-center text-lg sm:text-xl font-bold focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${getGradeDisplayColor(
																			gradeValue
																		)} ${
																			isInvalid
																				? 'bg-background border-red-500 focus:ring-red-500'
																				: 'bg-background border-input hover:border-ring'
																		}`}
																		inputMode="numeric"
																	/>
																)}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									))}
							</div>

							<div className="p-4 sm:p-6 border-t border-border">
								<button
									onClick={handleSubmitGrades}
									className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									disabled={
										loading.submittingGrades ||
										studentsForGrading.length === 0 ||
										selectedPeriods.length === 0 ||
										newGradesCount === 0
									}
								>
									{loading.submittingGrades ? (
										<>
											<Loader2 className="w-5 h-5 animate-spin" />
											<span>Submitting...</span>
										</>
									) : (
										<span>Submit {newGradesCount} New Grades</span>
									)}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SubmitGrade;
