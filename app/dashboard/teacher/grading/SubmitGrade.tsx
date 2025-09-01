// app/dashboard/teacher/grading/SubmitGrade.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';

// Types
interface TeacherInfo {
	name: string;
	userId: string;
	teacherId: string;
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

interface GradeSubmitProps {
	teacherInfo: TeacherInfo | null;
	academicYear: string;
	loading: boolean;
	error: string;
	onSwitchToOverview: () => void;
}

const allPeriods = [
	{ id: 'first', label: 'First Period', value: 'firstPeriod' },
	{ id: 'second', label: 'Second Period', value: 'secondPeriod' },
	{ id: 'third', label: 'Third Period', value: 'thirdPeriod' },
	{
		id: 'third_period_exam',
		label: 'Third Period Exam',
		value: 'thirdPeriodExam',
	},
	{ id: 'fourth', label: 'Fourth Period', value: 'fourthPeriod' },
	{ id: 'fifth', label: 'Fifth Period', value: 'fifthPeriod' },
	{ id: 'sixth', label: 'Sixth Period', value: 'sixthPeriod' },
	{
		id: 'sixth_period_exam',
		label: 'Sixth Period Exam',
		value: 'sixthPeriodExam',
	},
];

const SubmitGrade: React.FC<GradeSubmitProps> = ({
	teacherInfo,
	academicYear, // This is the current academic year, used as a default
	loading: parentLoading,
	error: parentError,
	onSwitchToOverview,
}) => {
	const school = useSchoolStore((state) => state.school);
	const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
	const [selectedSubject, setSelectedSubject] = useState('');
	const [selectedSession, setSelectedSession] = useState('');
	const [selectedClassLevel, setSelectedClassLevel] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [studentsForGrading, setStudentsForGrading] = useState<
		StudentForGrading[]
	>([]);

	// NEW: State for selected academic year
	const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

	const [loading, setLoading] = useState({
		studentsForGrading: false,
		submittingGrades: false,
	});
	const [error, setError] = useState({
		studentsForGrading: '',
	});

	const [notification, setNotification] = useState<{
		type: 'success' | 'error' | 'info';
		message: string;
		isVisible: boolean;
	} | null>(null);

	const periods = useMemo(() => {
		if (school?.settings?.teacherSettings?.gradeSubmissionPeriods) {
			const allowedPeriods =
				school.settings.teacherSettings.gradeSubmissionPeriods;
			return allPeriods.filter((p) => allowedPeriods.includes(p.id));
		}
		return allPeriods;
	}, [school]);

	// NEW: Memoize available academic years from settings
	const availableAcademicYears = useMemo(() => {
		return (
			school?.settings?.teacherSettings?.gradeSubmissionAcademicYears || [
				academicYear,
			]
		);
	}, [school, academicYear]);

	// NEW: Effect to auto-select academic year if only one is available
	useEffect(() => {
		if (availableAcademicYears.length === 1) {
			setSelectedAcademicYear(availableAcademicYears[0]);
		} else if (availableAcademicYears.includes(academicYear)) {
			setSelectedAcademicYear(academicYear);
		} else {
			setSelectedAcademicYear('');
		}
	}, [availableAcademicYears, academicYear]);

	// Effect to automatically clear the notification after 5 seconds
	useEffect(() => {
		if (notification?.isVisible) {
			const timer = setTimeout(() => {
				setNotification((prev) =>
					prev ? { ...prev, isVisible: false } : null
				);
				// Remove notification completely after fade out animation
				setTimeout(() => setNotification(null), 300);
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [notification?.isVisible]);

	// Show notification function
	const showNotification = (
		type: 'success' | 'error' | 'info',
		message: string
	) => {
		setNotification({ type, message, isVisible: true });
	};

	// Dismiss notification function
	const dismissNotification = () => {
		setNotification((prev) => (prev ? { ...prev, isVisible: false } : null));
		setTimeout(() => setNotification(null), 300);
	};

	// --- Top-Down Filter Logic ---

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

	// Check if the teacher is a "Self Contained" teacher
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
			// Find the specific sponsor class from the school profile
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
		// Only show subjects that the teacher is assigned to for that specific level and session.
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

	// Auto-selection effects for the new top-down flow
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
			!selectedAcademicYear // NEW: check for academic year
		)
			return;

		setLoading((prev) => ({ ...prev, studentsForGrading: true }));
		setError((prev) => ({ ...prev, studentsForGrading: '' }));
		setStudentsForGrading([]);
		setNotification(null);

		try {
			// Step 1: Fetch students for the selected class
			const studentsRes = await fetch(`/api/users?classId=${selectedClassId}`);
			if (!studentsRes.ok)
				throw new Error('Failed to fetch students for class');
			const studentsData = await studentsRes.json();
			const studentsList = studentsData.data;

			// Check if class has no students
			if (!studentsList || studentsList.length === 0) {
				setStudentsForGrading([]);
				return; // Exit early, let the UI show the empty state
			}

			// Step 2: Fetch existing grades report for the class and subject
			// UPDATED: Use selectedAcademicYear from state
			const existingGradesRes = await fetch(
				`/api/grades?academicYear=${selectedAcademicYear}&classId=${selectedClassId}&subject=${selectedSubject}`
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

			const initialStudentsForGrading = studentsList.map((student: any) => {
				const studentExistingPeriods =
					reportStudentsMap.get(student.studentId) || {};
				const grades: { [period: string]: GradeInputState } = {};

				periods.forEach(({ value: period }) => {
					const existingGrade = studentExistingPeriods[period];
					if (
						existingGrade &&
						existingGrade.grade !== undefined &&
						existingGrade.grade !== null &&
						existingGrade.status !== 'Rejected'
					) {
						grades[period] = {
							grade: existingGrade.grade,
							hasExistingGrade: true,
							status: existingGrade.status || 'Pending',
						};
					} else {
						grades[period] = {
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
			selectedAcademicYear
		) {
			loadStudentsForGrading();
		}
	}, [
		selectedSession,
		selectedClassLevel,
		selectedClassId,
		selectedSubject,
		selectedAcademicYear,
		loadStudentsForGrading,
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
		// Only allow numeric input and empty string
		if (value !== '' && (isNaN(Number(value)) || !/^\d*\.?\d*$/.test(value))) {
			return;
		}

		// If value is not empty, ensure it's within the valid range
		let numericValue: number | '' = '';
		if (value !== '') {
			const num = Number(value);
			// Allow intermediate values during typing (like "6" when typing "65")
			// but don't allow values that clearly exceed the range
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
	// Handlers to reset dependent dropdowns
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
			.filter((period) => selectedPeriods.includes(period.value))
			.map((period) => period.value);
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
			classId: selectedClassId,
			subject: selectedSubject,
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

			// Navigate after a small delay to allow the user to see the success message
			setTimeout(() => {
				onSwitchToOverview();
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

	// Helper function to get grade validation status
	const getGradeValidationStatus = (grade: number | '') => {
		if (grade === '') return { isValid: true, message: '' };
		const num = Number(grade);
		if (num < 60) return { isValid: false, message: 'Min: 60' };
		if (num > 100) return { isValid: false, message: 'Max: 100' };
		return { isValid: true, message: '' };
	};

	// Helper function to get grade display color based on pass/fail
	const getGradeDisplayColor = (
		grade: number | '',
		isExisting: boolean = false
	) => {
		if (grade === '' || Number(grade) < 60)
			return isExisting ? 'text-muted-foreground' : 'text-foreground';
		const num = Number(grade);
		if (num < 70) return 'text-red-600 dark:text-red-400'; // Fail
		return 'text-blue-600 dark:text-blue-400'; // Pass
	};

	if (parentLoading) {
		return (
			<div className="flex justify-center items-center py-8">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (parentError) {
		return (
			<div className="text-center text-destructive py-8">{parentError}</div>
		);
	}

	// Determine which dropdowns to show
	const showSessionSelect = availableSessions.length > 1;
	const showLevelSelect = availableLevels.length > 1;
	const showClassSelect =
		!isSelfContainedTeacher && availableClasses.length > 1;
	const showSubjectSelect = availableSubjects.length > 1;
	// NEW: Determine if academic year filter should be shown
	const showAcademicYearFilter = availableAcademicYears.length > 1;

	// Popup Notification component (self-contained, no changes needed)
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
				{/* Backdrop overlay */}
				<div
					className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
						notification.isVisible
							? 'opacity-100'
							: 'opacity-0 pointer-events-none'
					}`}
					onClick={dismissNotification}
				/>

				{/* Popup notification */}
				<div
					className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 transition-all duration-300 ${
						notification.isVisible
							? 'scale-100 opacity-100 translate-y-[-50%]'
							: 'scale-95 opacity-0 translate-y-[-45%] pointer-events-none'
					}`}
				>
					<div
						className={`${styles.bg} ${styles.text} border-2 rounded-xl shadow-2xl p-6 relative`}
					>
						{/* Icon and content */}
						<div className="flex items-start space-x-4">
							<div className={`flex-shrink-0 ${styles.iconColor}`}>
								<IconComponent className="w-6 h-6" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-base font-semibold leading-6">
									{notification.type.charAt(0).toUpperCase() +
										notification.type.slice(1)}
								</p>
								<p className="text-sm mt-1 opacity-90">
									{notification.message}
								</p>
							</div>
						</div>

						{/* Close button */}
						<button
							onClick={dismissNotification}
							className={`absolute top-4 right-4 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.iconColor}`}
							aria-label="Close notification"
						>
							<X className="w-5 h-5" />
						</button>

						{/* Progress bar for auto-dismiss */}
						<div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 rounded-b-xl overflow-hidden">
							<div
								className={`h-full ${
									notification.type === 'success'
										? 'bg-green-500'
										: notification.type === 'error'
										? 'bg-red-500'
										: 'bg-blue-500'
								} transition-all duration-[5000ms] ease-linear ${
									notification.isVisible ? 'w-0' : 'w-full'
								}`}
								style={{
									animation: notification.isVisible
										? 'shrink 5s linear forwards'
										: 'none',
								}}
							/>
						</div>
					</div>
				</div>

				<style jsx>{`
					@keyframes shrink {
						from {
							width: 100%;
						}
						to {
							width: 0%;
						}
					}
				`}</style>
			</>
		);
	};

	// Empty state component (self-contained, no changes needed)
	const EmptyStudentsState = () => {
		if (loading.studentsForGrading) return null;

		const className = availableClasses.find(
			(c) => c.classId === selectedClassId
		)?.name;

		return (
			<div className="bg-card border border-border rounded-lg p-8 shadow-sm text-center">
				<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
					<svg
						className="w-8 h-8 text-muted-foreground"
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
				<h3 className="text-lg font-semibold text-foreground mb-2">
					No Students Found
				</h3>
				<p className="text-muted-foreground mb-4">
					There are currently no students enrolled in{' '}
					<span className="font-medium">{className}</span> for{' '}
					<span className="font-medium">{selectedSubject}</span>.
				</p>
			</div>
		);
	};

	if (periods.length === 0) {
		return (
			<div className="bg-card border-l-4 border-yellow-500 rounded-r-lg p-6 shadow-sm text-center">
				<div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
					<AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
				</div>
				<h3 className="text-lg font-semibold text-foreground mb-2">
					Grade Submission Disabled
				</h3>
				<p className="text-muted-foreground">
					The administrator has not enabled grade submission for any academic
					periods at this time. Please check back later or contact an
					administrator for more information.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<style jsx>{`
				.custom-scrollbar {
					scrollbar-width: thin;
					scrollbar-color: #8b5cf6 #f1f5f9;
				}

				.custom-scrollbar::-webkit-scrollbar {
					height: 16px;
					width: 16px;
				}

				.custom-scrollbar::-webkit-scrollbar-track {
					background: linear-gradient(
						90deg,
						#f1f5f9 0%,
						#e2e8f0 50%,
						#f1f5f9 100%
					);
					border-radius: 12px;
					box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
				}

				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: linear-gradient(
						135deg,
						#8b5cf6 0%,
						#7c3aed 50%,
						#6d28d9 100%
					);
					border-radius: 12px;
					border: 2px solid #f1f5f9;
					box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3),
						inset 0 1px 2px rgba(255, 255, 255, 0.2);
					transition: all 0.3s ease;
				}

				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: linear-gradient(
						135deg,
						#7c3aed 0%,
						#6d28d9 50%,
						#5b21b6 100%
					);
					box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4),
						inset 0 1px 2px rgba(255, 255, 255, 0.3);
					transform: scale(1.05);
				}

				.custom-scrollbar::-webkit-scrollbar-thumb:active {
					background: linear-gradient(
						135deg,
						#6d28d9 0%,
						#5b21b6 50%,
						#4c1d95 100%
					);
					box-shadow: 0 2px 4px rgba(139, 92, 246, 0.5),
						inset 0 2px 4px rgba(0, 0, 0, 0.1);
					transform: scale(0.95);
				}

				.custom-scrollbar::-webkit-scrollbar-corner {
					background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
					border-radius: 12px;
				}

				/* Add a subtle glow effect on hover */
				.custom-scrollbar:hover::-webkit-scrollbar-thumb {
					animation: scrollbarGlow 2s ease-in-out infinite alternate;
				}

				@keyframes scrollbarGlow {
					from {
						box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4),
							inset 0 1px 2px rgba(255, 255, 255, 0.3);
					}
					to {
						box-shadow: 0 8px 16px rgba(139, 92, 246, 0.6),
							inset 0 1px 2px rgba(255, 255, 255, 0.4),
							0 0 20px rgba(139, 92, 246, 0.3);
					}
				}

				/* Responsive scrollbar for smaller screens */
				@media (max-width: 640px) {
					.custom-scrollbar::-webkit-scrollbar {
						height: 12px;
						width: 12px;
					}

					.custom-scrollbar::-webkit-scrollbar-track {
						border-radius: 8px;
					}

					.custom-scrollbar::-webkit-scrollbar-thumb {
						border-radius: 8px;
						border: 1px solid #f1f5f9;
					}
				}
			`}</style>
			<PopupNotification />

			<div className="p-6 bg-card border border-border rounded-lg shadow-sm">
				<h3 className="text-xl font-semibold mb-2 text-foreground">
					Submit New Grades
				</h3>
				<p className="text-muted-foreground mb-6">
					Follow the steps to select your class and subject.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
					{/* NEW: Academic Year Selector */}
					{showAcademicYearFilter && (
						<div>
							<label
								htmlFor="academic-year-select"
								className="block text-sm font-medium text-foreground"
							>
								Academic Year
							</label>
							<select
								id="academic-year-select"
								value={selectedAcademicYear}
								onChange={(e) => setSelectedAcademicYear(e.target.value)}
								className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm"
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
					{/* Session Selector */}
					{showSessionSelect && (
						<div>
							<label
								htmlFor="session-select"
								className="block text-sm font-medium text-foreground"
							>
								Session
							</label>
							<select
								id="session-select"
								value={selectedSession}
								onChange={(e) => handleSessionChange(e.target.value)}
								className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm"
							>
								<option value="">Select Session</option>
								{availableSessions.map((session, index) => (
									<option key={`session-${session}-${index}`} value={session}>
										{session}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Level Selector */}
					{showLevelSelect && selectedSession && (
						<div>
							<label
								htmlFor="class-level-select"
								className="block text-sm font-medium text-foreground"
							>
								Class Level
							</label>
							<select
								id="class-level-select"
								value={selectedClassLevel}
								onChange={(e) => handleClassLevelChange(e.target.value)}
								className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm"
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

					{/* Class Selector */}
					{showClassSelect && selectedClassLevel && (
						<div>
							<label
								htmlFor="class-select"
								className="block text-sm font-medium text-foreground"
							>
								Class
							</label>
							<select
								id="class-select"
								value={selectedClassId}
								onChange={(e) => handleClassChange(e.target.value)}
								className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm"
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
							<label className="block text-sm font-medium text-foreground">
								Class
							</label>
							<div className="mt-1 block w-full rounded-md border border-input bg-muted py-2 px-3 text-muted-foreground sm:text-sm">
								{availableClasses[0]?.name || 'Sponsor Class'}
							</div>
						</div>
					)}

					{/* Subject Selector */}
					{showSubjectSelect && selectedClassId && (
						<div>
							<label
								htmlFor="subject-select"
								className="block text-sm font-medium text-foreground"
							>
								Subject
							</label>
							<select
								id="subject-select"
								value={selectedSubject}
								onChange={(e) => setSelectedSubject(e.target.value)}
								className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm"
							>
								<option value="">Select Subject</option>
								{availableSubjects.map((subject, index) => (
									<option key={`subject-${subject}-${index}`} value={subject}>
										{subject}
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{loading.studentsForGrading && (
					<div className="flex justify-center items-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}

				{studentsForGrading.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Select Periods to Grade
						</label>
						<div className="flex flex-wrap gap-2">
							{periods.map((p) => (
								<div
									key={`period-${p.id}`}
									className="relative flex items-start"
								>
									<div className="flex h-5 items-center">
										<input
											id={`period-checkbox-${p.id}`}
											name="periods"
											type="checkbox"
											className="h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
											checked={selectedPeriods.includes(p.value)}
											onChange={(e) =>
												handlePeriodToggle(p.value, e.target.checked)
											}
										/>
									</div>
									<div className="ml-3 text-sm">
										<label
											htmlFor={`period-checkbox-${p.id}`}
											className="font-medium text-foreground"
										>
											{p.label}
										</label>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Show empty state if no students and filters are filled */}
			{studentsForGrading.length === 0 &&
				selectedSession &&
				selectedClassLevel &&
				selectedClassId &&
				selectedSubject && <EmptyStudentsState />}

			{studentsForGrading.length > 0 && selectedPeriods.length > 0 && (
				<div className="bg-card border border-border rounded-lg p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="text-xl font-semibold text-foreground">
								Grades for{' '}
								{
									availableClasses.find((c) => c.classId === selectedClassId)
										?.name
								}{' '}
								- {selectedSubject}
							</h3>
							{newGradesCount > 0 && (
								<p className="text-sm text-green-600 dark:text-green-400 mt-1">
									{newGradesCount} new grades ready to submit
								</p>
							)}
						</div>
					</div>

					{error.studentsForGrading && (
						<div className="text-destructive mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
							{error.studentsForGrading}
						</div>
					)}

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
									{orderedSelectedPeriods.map((period) => (
										<th
											key={`period-header-${period}`}
											scope="col"
											className="sticky top-0 z-20 bg-muted px-3 sm:px-6 py-3 text-center font-medium text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0 text-xs w-[90px] sm:w-[120px]"
										>
											{periods.find((p) => p.value === period)?.label}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-border bg-background">
								{studentsForGrading.map((student) => (
									<tr key={student.studentId}>
										<td className="sticky left-0 z-10 bg-card px-3 sm:px-6 py-4 font-medium text-foreground whitespace-nowrap border-r border-border text-sm">
											{student.name}
										</td>
										{orderedSelectedPeriods.map((period) => (
											<td
												key={`${student.studentId}-${period}`}
												className="px-3 sm:px-6 py-4 text-center whitespace-nowrap border-r border-border last:border-r-0 text-sm"
											>
												<div className="relative space-y-1 flex flex-col items-center">
													{(() => {
														const gradeInfo = student.grades[period];
														const validationStatus = getGradeValidationStatus(
															gradeInfo?.grade
														);
														const gradeValue = gradeInfo?.grade;
														const isExisting = gradeInfo?.hasExistingGrade;
														const isInvalid =
															!validationStatus.isValid && gradeValue !== '';
														let textColorClass = getGradeDisplayColor(
															gradeValue,
															isExisting
														);

														return (
															<>
																<input
																	type="text"
																	value={gradeValue || ''}
																	disabled={isExisting}
																	onChange={(e) =>
																		handleGradeChange(
																			student.studentId,
																			period,
																			e.target.value
																		)
																	}
																	placeholder="0"
																	className={`w-14 sm:w-16 h-8 rounded-md border text-center text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background focus:border-ring transition-colors font-semibold ${textColorClass} ${
																		isExisting
																			? 'bg-muted border-border cursor-not-allowed opacity-60'
																			: isInvalid
																			? 'bg-background border-red-500 focus:ring-red-500 focus:border-red-500'
																			: 'bg-background border-input hover:border-ring'
																	}`}
																	inputMode="numeric"
																	pattern="[0-9]*"
																/>
																{isInvalid && (
																	<div className="text-xs text-red-500 font-medium">
																		{validationStatus.message}
																	</div>
																)}
																{validationStatus.isValid &&
																	gradeValue !== '' &&
																	!isExisting &&
																	Number(gradeValue) >= 60 && (
																		<div
																			className={`text-xs font-medium ${
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
															</>
														);
													})()}
													{student.grades[period]?.hasExistingGrade &&
														student.grades[period]?.status && (
															<div
																className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(
																	student.grades[period].status!
																)}`}
															>
																{student.grades[period].status}
															</div>
														)}
												</div>
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="mt-6 flex justify-end items-center">
						<button
							onClick={handleSubmitGrades}
							className="inline-flex justify-center rounded-md border border-transparent bg-primary px-6 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm disabled:opacity-50 transition-colors"
							disabled={
								loading.submittingGrades ||
								studentsForGrading.length === 0 ||
								selectedPeriods.length === 0 ||
								newGradesCount === 0
							}
						>
							{loading.submittingGrades ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								`Submit ${newGradesCount} New Grades`
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default SubmitGrade;
