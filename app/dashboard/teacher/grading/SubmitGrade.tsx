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

const periods = [
	{ id: 'first', label: 'First Period', value: 'firstPeriod' },
	{ id: 'second', label: 'Second Period', value: 'secondPeriod' },
	{ id: 'third', label: 'Third Period', value: 'thirdPeriod' },
	{ id: 'third_exam', label: 'Third Period Exam', value: 'thirdPeriodExam' },
	{ id: 'fourth', label: 'Fourth Period', value: 'fourthPeriod' },
	{ id: 'fifth', label: 'Fifth Period', value: 'fifthPeriod' },
	{ id: 'sixth', label: 'Sixth Period', value: 'sixthPeriod' },
	{ id: 'sixth_exam', label: 'Sixth Period Exam', value: 'sixthPeriodExam' },
];

const SubmitGrade: React.FC<GradeSubmitProps> = ({
	teacherInfo,
	academicYear,
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

	const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

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

	// Helper functions
	const uniqueSubjects = useMemo(() => {
		if (!teacherInfo?.subjects) return [];
		const subjectsWithSessions = teacherInfo.subjects.map((s) => ({
			subject: s.subject,
			session: s.session,
		}));
		const uniqueSubjectsMap = new Map();
		subjectsWithSessions.forEach((s) => uniqueSubjectsMap.set(s.subject, s));
		return Array.from(uniqueSubjectsMap.values());
	}, [teacherInfo]);

	const classesBySubject = useMemo(() => {
		if (!teacherInfo?.subjects || !school) return {};
		const result: {
			[subject: string]: {
				session: string;
				level: string;
				classId: string;
				name: string;
			}[];
		} = {};
		teacherInfo.subjects.forEach((s) => {
			if (!result[s.subject]) {
				result[s.subject] = [];
			}
			const classesInLevel =
				school.classLevels?.[s.session]?.[s.level]?.classes || [];
			classesInLevel.forEach((cls) => {
				result[s.subject].push({
					session: s.session,
					level: s.level,
					classId: cls.classId,
					name: cls.name,
				});
			});
		});
		return result;
	}, [teacherInfo, school]);

	const orderedSelectedPeriods = useMemo(() => {
		return periods
			.filter((period) => selectedPeriods.includes(period.value))
			.map((period) => period.value);
	}, [selectedPeriods]);

	const classesForSelectedSubject = useMemo(() => {
		if (!selectedSubject) return [];
		return classesBySubject[selectedSubject] || [];
	}, [selectedSubject, classesBySubject]);

	const sessionsForSelectedSubject = useMemo(() => {
		const sessions = classesForSelectedSubject.map((cls) => cls.session);
		return [...new Set(sessions)];
	}, [classesForSelectedSubject]);

	const levelsForSelectedSession = useMemo(() => {
		if (!selectedSession) return [];
		const levels = classesForSelectedSubject
			.filter((cls) => cls.session === selectedSession)
			.map((cls) => cls.level);
		return [...new Set(levels)];
	}, [selectedSession, classesForSelectedSubject]);

	const classesForSelectedLevelAndSession = useMemo(() => {
		if (!selectedSession || !selectedClassLevel) return [];
		return classesForSelectedSubject.filter(
			(cls) =>
				cls.session === selectedSession && cls.level === selectedClassLevel
		);
	}, [selectedSession, selectedClassLevel, classesForSelectedSubject]);

	// Auto-selection effects
	useEffect(() => {
		// Auto-select subject if only one available
		if (
			uniqueSubjects.length === 1 &&
			selectedSubject !== uniqueSubjects[0].subject
		) {
			setSelectedSubject(uniqueSubjects[0].subject);
		}
	}, [uniqueSubjects, selectedSubject]);

	useEffect(() => {
		// Auto-select session if only one available for the selected subject
		if (
			sessionsForSelectedSubject.length === 1 &&
			selectedSession !== sessionsForSelectedSubject[0]
		) {
			setSelectedSession(sessionsForSelectedSubject[0]);
		} else if (
			sessionsForSelectedSubject.length > 1 &&
			selectedSession &&
			!sessionsForSelectedSubject.includes(selectedSession)
		) {
			// Reset session if it's no longer valid for the selected subject
			setSelectedSession('');
		} else if (sessionsForSelectedSubject.length === 0) {
			setSelectedSession('');
		}
	}, [sessionsForSelectedSubject, selectedSession]);

	useEffect(() => {
		// Auto-select class level if only one available for the selected session
		if (
			levelsForSelectedSession.length === 1 &&
			selectedClassLevel !== levelsForSelectedSession[0]
		) {
			setSelectedClassLevel(levelsForSelectedSession[0]);
		} else if (
			levelsForSelectedSession.length > 1 &&
			selectedClassLevel &&
			!levelsForSelectedSession.includes(selectedClassLevel)
		) {
			// Reset class level if it's no longer valid for the selected session
			setSelectedClassLevel('');
		} else if (levelsForSelectedSession.length === 0) {
			setSelectedClassLevel('');
		}
	}, [levelsForSelectedSession, selectedClassLevel]);

	useEffect(() => {
		// Auto-select class if only one available for the selected level and session
		if (
			classesForSelectedLevelAndSession.length === 1 &&
			selectedClassId !== classesForSelectedLevelAndSession[0].classId
		) {
			setSelectedClassId(classesForSelectedLevelAndSession[0].classId);
		} else if (
			classesForSelectedLevelAndSession.length > 1 &&
			selectedClassId &&
			!classesForSelectedLevelAndSession.some(
				(cls) => cls.classId === selectedClassId
			)
		) {
			// Reset class if it's no longer valid
			setSelectedClassId('');
		} else if (classesForSelectedLevelAndSession.length === 0) {
			setSelectedClassId('');
		}
	}, [classesForSelectedLevelAndSession, selectedClassId]);

	const loadStudentsForGrading = useCallback(async () => {
		if (!selectedSubject || !selectedClassId || !selectedSession) return;

		setLoading((prev) => ({ ...prev, studentsForGrading: true }));
		setError((prev) => ({ ...prev, studentsForGrading: '' }));
		setStudentsForGrading([]);
		setNotification(null);
		setHasAttemptedLoad(true);

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
			const existingGradesRes = await fetch(
				`/api/grades?academicYear=${academicYear}&classId=${selectedClassId}&subject=${selectedSubject}`
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
						existingGrade.status !== 'Rejected' // Restore this check
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
	}, [academicYear, selectedClassId, selectedSubject, selectedSession]);

	useEffect(() => {
		if (hasAttemptedLoad) {
			loadStudentsForGrading();
		}
	}, [selectedClassId, hasAttemptedLoad, loadStudentsForGrading]);

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

	const handleSubjectChange = (subject: string) => {
		setSelectedSubject(subject);
		setSelectedSession('');
		setSelectedClassLevel('');
		setSelectedClassId('');
	};

	const handleSessionChange = (session: string) => {
		setSelectedSession(session);
		setSelectedClassLevel('');
		setSelectedClassId('');
	};

	const handleClassLevelChange = (level: string) => {
		setSelectedClassLevel(level);
		setSelectedClassId('');
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

	// Validation function for grades
	const validateGrades = (): { isValid: boolean; errors: string[] } => {
		const errors: string[] = [];
		let invalidGradeCount = 0;

		studentsForGrading.forEach((student) => {
			selectedPeriods.forEach((period) => {
				const gradeInfo = student.grades[period];
				if (
					gradeInfo &&
					!gradeInfo.hasExistingGrade &&
					gradeInfo.grade !== ''
				) {
					const grade = Number(gradeInfo.grade);
					if (grade < 60 || grade > 100) {
						invalidGradeCount++;
					}
				}
			});
		});

		if (invalidGradeCount > 0) {
			errors.push(
				`${invalidGradeCount} grade${
					invalidGradeCount > 1 ? 's' : ''
				} must be between 60 and 100 (inclusive).`
			);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	};

	const handleSubmitGrades = async () => {
		if (selectedPeriods.length === 0) {
			showNotification(
				'error',
				'Please select at least one period to submit grades for.'
			);
			return;
		}

		// Validate grades before submission
		const validation = validateGrades();
		if (!validation.isValid) {
			showNotification('error', validation.errors.join(' '));
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

	// Determine which dropdowns to show based on available options
	const showSubjectSelect = uniqueSubjects.length > 1;
	const showSessionSelect = sessionsForSelectedSubject.length > 1;
	const showClassLevelSelect = levelsForSelectedSession.length > 1;
	const showClassSelect = classesForSelectedLevelAndSession.length > 1;

	// Popup Notification component
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

	// Empty state component
	const EmptyStudentsState = () => {
		if (!hasAttemptedLoad || loading.studentsForGrading) return null;

		const className = classesForSelectedLevelAndSession.find(
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
				<div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
					<p className="font-medium mb-1">This could mean:</p>
					<ul className="text-left space-y-1">
						<li>• The class hasn't been assigned any students yet</li>
						<li>• Students may be enrolled in a different session or level</li>
						<li>• There might be a data synchronization issue</li>
					</ul>
				</div>
				<button
					onClick={loadStudentsForGrading}
					className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
				>
					<svg
						className="w-4 h-4 mr-2"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Try Again
				</button>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<PopupNotification />

			<div className="p-6 bg-card border border-border rounded-lg shadow-sm">
				<h3 className="text-xl font-semibold mb-2 text-foreground">
					Submit New Grades
				</h3>
				<p className="text-muted-foreground mb-6">
					{showSubjectSelect ||
					showSessionSelect ||
					showClassLevelSelect ||
					showClassSelect
						? 'Select a class and subject to start, then choose periods to grade.'
						: 'Choose periods to grade for your class.'}
				</p>

				{(showSubjectSelect ||
					showSessionSelect ||
					showClassLevelSelect ||
					showClassSelect) && (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
						{showSubjectSelect && (
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
									onChange={(e) => handleSubjectChange(e.target.value)}
									className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm"
								>
									<option value="">Select a Subject</option>
									{uniqueSubjects.map((s, index) => (
										<option
											key={`subject-${s.subject}-${index}`}
											value={s.subject}
										>
											{s.subject}
										</option>
									))}
								</select>
							</div>
						)}

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
									className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm disabled:opacity-50"
									disabled={!selectedSubject}
								>
									<option value="">Select a Session</option>
									{sessionsForSelectedSubject.map((session, index) => (
										<option key={`session-${session}-${index}`} value={session}>
											{session}
										</option>
									))}
								</select>
							</div>
						)}

						{showClassLevelSelect && (
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
									className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm disabled:opacity-50"
									disabled={!selectedSession}
								>
									<option value="">Select a Level</option>
									{levelsForSelectedSession.map((level, index) => (
										<option key={`level-${level}-${index}`} value={level}>
											{level}
										</option>
									))}
								</select>
							</div>
						)}

						{showClassSelect && (
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
									onChange={(e) => setSelectedClassId(e.target.value)}
									className="mt-1 block w-full rounded-md border border-input bg-background py-2 pl-3 pr-10 text-foreground focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm disabled:opacity-50"
									disabled={!selectedClassLevel}
								>
									<option value="">Select a Class</option>
									{classesForSelectedLevelAndSession.map((cls, index) => (
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
					</div>
				)}

				<button
					onClick={loadStudentsForGrading}
					className="w-full md:w-auto inline-flex justify-center rounded-md border border-transparent bg-primary px-4 md:px-6 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:text-sm disabled:opacity-50 mb-6 transition-colors"
					disabled={
						!selectedSubject ||
						!selectedClassId ||
						!selectedSession ||
						loading.studentsForGrading
					}
				>
					{loading.studentsForGrading ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						'Load Students for Grading'
					)}
				</button>

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

			{/* Show empty state if no students and has attempted load */}
			{studentsForGrading.length === 0 &&
				hasAttemptedLoad &&
				!loading.studentsForGrading && <EmptyStudentsState />}

			{studentsForGrading.length > 0 && selectedPeriods.length > 0 && (
				<div className="bg-card border border-border rounded-lg p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="text-xl font-semibold text-foreground">
								Grades for{' '}
								{
									classesForSelectedLevelAndSession.find(
										(c) => c.classId === selectedClassId
									)?.name
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

					<div className="overflow-x-auto rounded-lg border border-border">
						<div className="scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-muted/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
							<table className="min-w-full divide-y divide-border">
								<thead className="bg-muted/50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground tracking-wider sticky left-0 bg-muted/50 z-10 border-r border-border">
											Student Name
										</th>
										{orderedSelectedPeriods.map((period) => (
											<th
												key={`period-header-${period}`}
												className="px-3 py-3 text-center text-xs font-medium text-muted-foreground tracking-wider min-w-[80px]"
											>
												{periods.find((p) => p.value === period)?.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-border bg-background">
									{studentsForGrading.map((student, index) => (
										<tr
											key={`student-grading-${index}`}
											className="hover:bg-muted/20 transition-colors"
										>
											<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground sticky left-0 bg-background z-10 border-r border-border">
												{student.name}
											</td>
											{orderedSelectedPeriods.map((period) => (
												<td
													key={`grade-${student.studentId}-${period}`}
													className="px-3 py-3 whitespace-nowrap text-sm text-center min-w-[80px]"
												>
													<div className="relative space-y-1 flex flex-col items-center">
														{(() => {
															const validationStatus = getGradeValidationStatus(
																student.grades[period]?.grade
															);
															const gradeValue = student.grades[period]?.grade;
															const isExisting =
																student.grades[period]?.hasExistingGrade;
															const isInvalid =
																!validationStatus.isValid && gradeValue !== '';

															// Determine text color class - updated to apply color to existing grades
															let textColorClass = 'text-foreground'; // default
															if (isInvalid) {
																textColorClass = 'text-foreground';
															} else {
																textColorClass = getGradeDisplayColor(
																	gradeValue,
																	isExisting
																);
															}

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
																		className={`w-16 h-8 rounded-md border text-center text-sm focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background focus:border-ring transition-colors font-semibold ${textColorClass} ${
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
																	{/* Pass/Fail indicator for valid grades - only for new grades */}
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
														{student.grades[period]?.hasExistingGrade &&
															!student.grades[period]?.status && (
																<div className="text-xs text-muted-foreground">
																	Existing
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
