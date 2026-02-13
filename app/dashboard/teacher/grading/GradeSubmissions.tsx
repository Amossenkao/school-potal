'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
	Plus,
	CheckCircle,
	Clock,
	AlertCircle,
	X,
	Loader2,
	Info,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	XCircle,
	RefreshCw,
	BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import {
	getClientCache,
	setClientCache,
	clearClientCache,
} from '@/utils/clientCache';

// Types
interface StudentGrade {
	studentId: string;
	name: string;
	grade: number | null;
	status: 'Approved' | 'Rejected' | 'Pending';
	rank?: number;
}

interface GradeSubmission {
	submissionId: string;
	academicYear: string;
	period: string;
	gradeLevel: string;
	subject: string;
	teacherUsername: string;
	grades: (StudentGrade & { status: 'Approved' | 'Rejected' | 'Pending' })[];
	status: 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved';
	lastUpdated: string;
	stats: {
		incompletes: number;
		passes: number;
		fails: number;
		average: number;
		totalStudents: number;
	};
}

interface TeacherInfo {
	name: string;
	userId: string;
	username: string;
	role: 'teacher';
	subjects: { year: string; classes: { classId: string; subjects: string[] }[] }[];
}

interface GradeChangeRequestStudent {
	studentId: string;
	name: string;
	currentGrade: number | null;
	newGrade: string;
	selected: boolean;
	status: 'Approved' | 'Rejected' | 'Pending';
	reason?: string;
}

// UPDATED: Added errorMessage to handle error state for the modal
interface ConfirmationModalState {
	isOpen: boolean;
	reason: string;
	isError?: boolean;
	errorMessage?: string;
}

const periods = [
	{ id: 'first', label: '1st Period', value: 'first' },
	{ id: 'second', label: '2nd Period', value: 'second' },
	{ id: 'third', label: '3rd Period', value: 'third' },
	{
		id: 'third_period_exam',
		label: '3rd Period Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: '4th Period', value: 'fourth' },
	{ id: 'fifth', label: '5th Period', value: 'fifth' },
	{ id: 'sixth', label: '6th Period', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: '6th Period Exam',
		value: 'sixth_period_exam',
	},
];

const GradeSubmissions = () => {
	const school = useSchoolStore((state) => state.school);
	const schoolAcademicYear = useSchoolStore(
		(state) => state.school?.currentAcademicYear
	);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);
	const { user } = useAuth();
	const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
	const [submittedGrades, setSubmittedGrades] = useState<GradeSubmission[]>([]);
	const [academicYear, setAcademicYear] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	const [loading, setLoading] = useState({
		teacherInfo: true,
		submittedGrades: false,
	});
	const [error, setError] = useState({
		teacherInfo: '',
		submittedGrades: '',
	});

	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [selectedGrade, setSelectedGrade] = useState<GradeSubmission | null>(
		null
	);
	const [gradeChangeStudents, setGradeChangeStudents] = useState<
		GradeChangeRequestStudent[]
	>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmationModal, setConfirmationModal] =
		useState<ConfirmationModalState>({
			isOpen: false,
			reason: '',
			isError: false,
		});
	const [notification, setNotification] = useState<{
		type: 'success' | 'error' | 'info';
		message: string;
	} | null>(null);
	const [resultModalOpen, setResultModalOpen] = useState(false);

	useEffect(() => {
		if (!resultModalOpen) return;
		const timer = setTimeout(() => {
			setResultModalOpen(false);
			setNotification(null);
		}, 3500);
		return () => clearTimeout(timer);
	}, [resultModalOpen]);

	const [filters, setFilters] = useState({
		subject: '',
		session: '',
		gradeLevel: '',
		classId: '',
		period: '',
	});

	const [sortConfig, setSortConfig] = useState<{
		key: keyof GradeSubmission | null;
		direction: 'asc' | 'desc';
	}>({ key: 'lastUpdated', direction: 'desc' });

	const getAcademicYear = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;
		return currentMonth >= 8
			? `${currentYear}-${currentYear + 1}`
			: `${currentYear - 1}-${currentYear}`;
	};

	const processSubmittedGrades = useCallback(
		(grades: any[]) => {
			const submissionsMap = new Map<string, any>();
			grades.forEach((grade: any) => {
				if (!submissionsMap.has(grade.submissionId)) {
					submissionsMap.set(grade.submissionId, {
						submissionId: grade.submissionId,
						academicYear: grade.academicYear,
						period: grade.period,
						gradeLevel: grade.classId,
						subject: grade.subject,
						teacherUsername: grade.teacherUsername || teacherInfo?.username,
						lastUpdated: grade.lastUpdated,
						grades: [],
					});
				}
				const submission = submissionsMap.get(grade.submissionId);
				submission.grades.push({
					studentId: grade.studentId,
					name: grade.studentName,
					grade: grade.grade,
					status: grade.status,
				});
				if (grade.lastUpdated > submission.lastUpdated) {
					submission.lastUpdated = grade.lastUpdated;
				}
			});

			const processedSubmissions: GradeSubmission[] = Array.from(
				submissionsMap.values()
			).map((submission: any) => {
				const gradeValues = submission.grades.map((g: any) => g.grade);
				const validGrades = gradeValues.filter(
					(g: number) => g !== null && g !== undefined
				) as number[];
				const totalStudents = submission.grades.length;
				const passes = validGrades.filter((g: number) => g >= 70).length;
				const fails = validGrades.length - passes;
				const incompletes = totalStudents - validGrades.length;
				const average =
					validGrades.length > 0
						? validGrades.reduce((sum: number, g: number) => sum + g, 0) /
						  validGrades.length
						: 0;

				const statuses = submission.grades.map((s: any) => s.status);
				let overallStatus:
					| 'Approved'
					| 'Rejected'
					| 'Pending'
					| 'Partially Approved' = 'Pending';

				if (statuses.every((s: string) => s === 'Approved')) {
					overallStatus = 'Approved';
				} else if (statuses.every((s: string) => s === 'Rejected')) {
					overallStatus = 'Rejected';
				} else if (statuses.some((s: string) => s === 'Approved')) {
					overallStatus = 'Partially Approved';
				}

				return {
					...submission,
					status: overallStatus,
					stats: {
						totalStudents,
						passes,
						fails,
						incompletes,
						average: parseFloat(average.toFixed(1)),
					},
				};
			});

			processedSubmissions.sort(
				(a, b) =>
					new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
			);

			setSubmittedGrades(processedSubmissions);
		},
		[teacherInfo?.username]
	);

	const fetchSubmittedGrades = useCallback(
		async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
			if (!teacherInfo) return;

			const schoolState = useSchoolStore.getState();
			const gradesByYear = schoolState.gradesByAcademicYear || {};
			const hasYearSnapshot =
				Boolean(academicYear) &&
				Object.prototype.hasOwnProperty.call(gradesByYear, academicYear);
			const storeGrades =
				academicYear && Array.isArray(gradesByYear[academicYear])
					? gradesByYear[academicYear]
					: [];
			const cacheKey = `submittedGrades:${teacherInfo.username}:${academicYear}`;

			if (!forceRefresh && hasYearSnapshot) {
				processSubmittedGrades(storeGrades);
				setError((prev) => ({ ...prev, submittedGrades: '' }));
				setLoading((prev) => ({ ...prev, submittedGrades: false }));
				return;
			}

			if (!forceRefresh) {
				const cached = getClientCache<any[]>(cacheKey);
				if (cached) {
					processSubmittedGrades(cached);
					setError((prev) => ({ ...prev, submittedGrades: '' }));
					setLoading((prev) => ({ ...prev, submittedGrades: false }));
					return;
				}
			}

			setLoading((prev) => ({ ...prev, submittedGrades: true }));
			try {
				if (forceRefresh) {
					clearClientCache(cacheKey);
				}

				const res = await fetch(`/api/grades?academicYear=${academicYear}`, {
					cache: 'no-store',
				});
				if (!res.ok) throw new Error('Failed to fetch submitted grades');
				const data = await res.json();
				const grades = Array.isArray(data.data?.grades)
					? data.data.grades
					: Array.isArray(data.data?.report?.grades)
						? data.data.report.grades
						: [];

				setClientCache(cacheKey, grades);
				if (academicYear) {
					setGradesForYear(academicYear, grades);
				}
				processSubmittedGrades(grades);
				setError((prev) => ({ ...prev, submittedGrades: '' }));
			} catch (err) {
				setError((prev) => ({
					...prev,
					submittedGrades: 'Failed to load submitted grades.',
				}));
				console.error('Error fetching submitted grades:', err);
			} finally {
				setLoading((prev) => ({ ...prev, submittedGrades: false }));
			}
		},
		[academicYear, teacherInfo, processSubmittedGrades, setGradesForYear],
	);

	useEffect(() => {
		setLoading((prev) => ({ ...prev, teacherInfo: true }));
		try {
			if (user && user.role === 'teacher') {
				setTeacherInfo(user as TeacherInfo);
			}
			setAcademicYear(schoolAcademicYear || getAcademicYear());
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
	}, [user, schoolAcademicYear]);

	useEffect(() => {
		if (!teacherInfo || !academicYear) return;
		void fetchSubmittedGrades();
	}, [teacherInfo, academicYear, fetchSubmittedGrades]);

	const classMap = useMemo(() => {
		if (!school?.classLevels) return new Map();
		const map = new Map();
		Object.values(school.classLevels).forEach((session: any) => {
			Object.values(session).forEach((level: any) => {
				level.classes.forEach((cls: any) => {
					map.set(cls.classId, cls.name);
				});
			});
		});
		return map;
	}, [school]);

	const getClassMetaById = useCallback(
		(classId: string) => {
			if (!classId || !school?.classLevels) return null;
			for (const [session, levels] of Object.entries(school.classLevels)) {
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
		},
		[school],
	);

	const yearAssignment = useMemo(() => {
		return (teacherInfo?.subjects || []).find(
			(entry) => entry.year === academicYear
		);
	}, [teacherInfo, academicYear]);

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

	const availableSessions = useMemo(() => {
		return [...new Set(assignedClasses.map((c) => c.session))];
	}, [assignedClasses]);

	const availableSubjects = useMemo(() => {
		const classIds = assignedClasses
			.filter((c) => !filters.session || c.session === filters.session)
			.map((c) => c.classId);
		const subjectSet = new Set<string>();
		(yearAssignment?.classes || []).forEach((c) => {
			if (classIds.includes(c.classId)) {
				(c.subjects || []).forEach((s) => subjectSet.add(s));
			}
		});
		return Array.from(subjectSet);
	}, [assignedClasses, yearAssignment, filters.session]);

	const availableLevels = useMemo(() => {
		const classIds = assignedClasses
			.filter((c) => !filters.session || c.session === filters.session)
			.filter((c) => {
				if (!filters.subject) return true;
				const classData = yearAssignment?.classes?.find(
					(entry) => entry.classId === c.classId
				);
				return classData?.subjects?.includes(filters.subject);
			})
			.map((c) => c.level);
		return [...new Set(classIds)];
	}, [assignedClasses, filters.session, filters.subject, yearAssignment]);

	const availableClasses = useMemo(() => {
		return assignedClasses.filter((c) => {
			if (filters.session && c.session !== filters.session) return false;
			if (filters.gradeLevel && c.level !== filters.gradeLevel) return false;
			if (filters.subject) {
				const classData = yearAssignment?.classes?.find(
					(entry) => entry.classId === c.classId
				);
				return classData?.subjects?.includes(filters.subject);
			}
			return true;
		});
	}, [assignedClasses, filters.session, filters.gradeLevel, filters.subject, yearAssignment]);

	const showClassFilter = assignedClasses.length > 1;

	const showNotification = (
		type: 'success' | 'error' | 'info',
		message: string
	) => {
		setNotification({ type, message });
		setResultModalOpen(true);
	};

	const deriveSubmissionStatus = (
		submission: GradeSubmission
	): 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved' => {
		const gradeStatuses = submission.grades.map((g) => g.status);
		if (gradeStatuses.length === 0) return 'Pending';

		const allApproved = gradeStatuses.every((s) => s === 'Approved');
		const hasApproved = gradeStatuses.some((s) => s === 'Approved');
		const allRejected = gradeStatuses.every((s) => s === 'Rejected');

		if (allApproved) return 'Approved';
		if (hasApproved) return 'Partially Approved';
		if (allRejected) return 'Rejected';
		return 'Pending';
	};

	const getModalGradeColor = (grade: number | null) => {
		if (grade === null || grade === undefined) return 'text-muted-foreground';
		if (grade >= 70) return 'text-sky-500 font-semibold';
		return 'text-destructive font-semibold';
	};

	const getGradeValidationStatus = (gradeValue: string) => {
		if (gradeValue === '') return { isValid: true, message: '' };
		const num = Number(gradeValue);
		if (Number.isNaN(num)) return { isValid: false, message: 'Numbers only' };
		if (num < 60) return { isValid: false, message: 'Min: 60' };
		if (num > 100) return { isValid: false, message: 'Max: 100' };
		return { isValid: true, message: '' };
	};

	const applyFilters = (grades: GradeSubmission[]) =>
		grades.filter((grade) => {
			if (filters.subject && grade.subject !== filters.subject) return false;
			if (filters.classId && grade.gradeLevel !== filters.classId) return false;
			if (filters.period && grade.period !== filters.period) return false;

			if (filters.gradeLevel && !filters.classId) {
				const levelClasses = availableClasses.map((c) => c.classId);
				if (!levelClasses.includes(grade.gradeLevel)) return false;
			}
			if (filters.session) {
				const classMeta = getClassMetaById(grade.gradeLevel);
				if (!classMeta || classMeta.session !== filters.session) return false;
			}
			return true;
		});

	const applySorting = (grades: GradeSubmission[]) => {
		if (!sortConfig.key) return grades;
		return [...grades].sort((a, b) => {
			if (sortConfig.key === 'lastUpdated') {
				const aDate = new Date(a.lastUpdated).getTime();
				const bDate = new Date(b.lastUpdated).getTime();
				return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
			}
			const aValue = a[sortConfig.key!] as string;
			const bValue = b[sortConfig.key!] as string;
			if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
			return 0;
		});
	};

	const handleSort = (key: keyof GradeSubmission) =>
		setSortConfig((prev) => ({
			key,
			direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
		}));

	const getSortIcon = (columnName: keyof GradeSubmission) => {
		if (sortConfig.key !== columnName)
			return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
		return sortConfig.direction === 'asc' ? (
			<ArrowUp className="h-3 w-3" />
		) : (
			<ArrowDown className="h-3 w-3" />
		);
	};

	const getStatusClasses = (
		status: 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved'
	) => {
		switch (status) {
			case 'Approved':
				return 'bg-emerald-100 text-emerald-800';
			case 'Pending':
				return 'bg-amber-100 text-amber-800';
			case 'Partially Approved':
				return 'bg-sky-100 text-sky-800';
			case 'Rejected':
			default:
				return 'bg-destructive/10 text-destructive';
		}
	};

	const getStatusIcon = (
		status: 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved'
	) => {
		switch (status) {
			case 'Approved':
				return <CheckCircle className="h-4 w-4" />;
			case 'Pending':
				return <Clock className="h-4 w-4" />;
			case 'Partially Approved':
				return <Info className="h-4 w-4" />;
			default:
				return <AlertCircle className="h-4 w-4" />;
		}
	};

	const formatLastUpdated = (dateString: string) =>
		new Date(dateString).toLocaleString([], {
			dateStyle: 'short',
			timeStyle: 'short',
		});

	const openDetailsModal = (submission: GradeSubmission) => {
		setSelectedGrade(submission);
		setGradeChangeStudents(
			[...submission.grades]
				.sort((a, b) =>
					(a.name || '').localeCompare(b.name || '', undefined, {
						sensitivity: 'base',
					})
				)
				.map((g) => ({
					studentId: g.studentId,
					name: g.name,
					currentGrade: g.grade,
					newGrade: '',
					selected: false,
					status: g.status,
				}))
		);
		setShowDetailsModal(true);
		// Reset modal state on open
		setConfirmationModal({
			isOpen: false,
			reason: '',
			isError: false,
			errorMessage: '',
		});
	};

	// MODIFIED: Check school settings for grade change request period
	const handleOpenConfirmationModal = () => {
		const changes = gradeChangeStudents.filter(
			(s) =>
				s.selected && s.newGrade.trim() !== '' && !isNaN(Number(s.newGrade))
		);

		if (changes.length === 0) {
			showNotification(
				'info',
				'Please select at least one student and provide a valid new grade.'
			);
			return;
		}

		const hasApprovedChange = changes.some((s) => s.status === 'Approved');

		if (hasApprovedChange && selectedGrade) {
			const periodValue = selectedGrade.period;
			// Get the list of periods where grade change requests are allowed
			const allowedPeriods =
				school?.settings?.teacherSettings?.gradeChangeRequestPeriods || [];

			// Check if the current submission period is in the allowed list
			const isRequestAllowed = allowedPeriods.includes(periodValue);

			if (!isRequestAllowed) {
				// School settings do not allow grade change requests for this period's approved grades.
				setConfirmationModal({
					isOpen: true, // Open the modal
					reason: '',
					isError: true, // Set to error state
					errorMessage: `Grade change requests for approved grades are not currently allowed for ${
						periods.find((p) => p.value === periodValue)?.label || 'this period'
					}. Please contact an administrator.`,
				});
				return;
			}
		}

		// If no approved grades are being changed OR the period is allowed, show the reason modal
		if (hasApprovedChange) {
			setConfirmationModal({
				isOpen: true,
				reason: '',
				isError: false,
				errorMessage: '',
			});
		} else {
			// If only Pending or Rejected grades are being changed, submit directly without a reason
			handleFinalSubmit();
		}
	};

	const handleFinalSubmit = async () => {
		if (!selectedGrade) return;

		// IMPORTANT: Re-check for an error state before submitting, especially if this function is called directly
		if (confirmationModal.isError) {
			// If it's an error modal, submission should be blocked
			setConfirmationModal({
				isOpen: false,
				reason: '',
				isError: false,
				errorMessage: '',
			}); // Close modal without submitting
			showNotification(
				'error',
				confirmationModal.errorMessage ||
					'Cannot submit request due to school settings error.'
			);
			return;
		}

		const changes = gradeChangeStudents
			.filter(
				(s) =>
					s.selected && s.newGrade.trim() !== '' && !isNaN(Number(s.newGrade))
			)
			.map((s) => ({
				studentId: s.studentId,
				name: s.name,
				originalGrade: s.currentGrade,
				requestedGrade: Number(s.newGrade),
				// Use the reason from the modal if it was shown for an Approved grade change, otherwise a default for corrections
				reason:
					s.status === 'Approved'
						? confirmationModal.reason
						: 'Teacher grade correction',
			}));

		if (changes.length === 0) return;
		const invalidChanges = changes.filter(
			(c) =>
				Number.isNaN(c.requestedGrade) ||
				c.requestedGrade < 60 ||
				c.requestedGrade > 100
		);
		if (invalidChanges.length > 0) {
			showNotification(
				'error',
				'Grades must be between 60 and 100 before submitting.'
			);
			return;
		}

		// Check if a reason is required and is missing
		const requiresReason = changes.some((c) => {
			const student = gradeChangeStudents.find(
				(s) => s.studentId === c.studentId
			);
			return student?.status === 'Approved';
		});

		if (
			requiresReason &&
			confirmationModal.isOpen &&
			!confirmationModal.reason.trim()
		) {
			showNotification(
				'info',
				'A reason is required for changing approved grades.'
			);
			return;
		}

		setIsSubmitting(true);
		setConfirmationModal((prev) => ({ ...prev, isOpen: false }));

		try {
			const payload = {
				classId: selectedGrade.gradeLevel,
				subject: selectedGrade.subject,
				period: selectedGrade.period,
				requests: changes,
			};

			const res = await fetch('/api/grades/requests', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const result = await res.json();
			if (!res.ok) {
				throw new Error(
					result.message || 'Failed to submit grade change request.'
				);
			}

			if (result?.queued) {
				showNotification(
					'info',
					'You are offline. Grade change requests were queued and will sync when you reconnect.'
				);
				setShowDetailsModal(false);
				return;
			}

			if (result.success) {
				const { createdRequests, updatedGrades } = result.data;
				if (createdRequests.length === 0 && updatedGrades.length === 0) {
					showNotification(
						'info',
						'No new requests were created. This may be because a pending request already exists for the selected grades.'
					);
				} else {
					showNotification('success', result.message);
				}
				window.dispatchEvent(new CustomEvent('grading:counts:refresh'));
			} else {
				throw new Error(result.message || 'An unknown error occurred.');
			}

			setShowDetailsModal(false);
			fetchSubmittedGrades({ forceRefresh: true }); // Refresh the list from server
		} catch (err: any) {
			showNotification('error', `Error: ${err.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleGradeInputChange = (studentId: string, newGrade: string) => {
		if (newGrade !== '' && (isNaN(Number(newGrade)) || !/^\d*\.?\d*$/.test(newGrade))) {
			return;
		}
		setGradeChangeStudents((prev) =>
			prev.map((s) =>
				s.studentId === studentId
					? { ...s, newGrade, selected: newGrade !== '' }
					: s
			)
		);
	};

	const renderResultModal = () => {
		if (!notification || !resultModalOpen) return null;
		const tone =
			notification.type === 'success'
				? {
						bg: 'bg-green-50 border-green-200 text-green-800',
						icon: CheckCircle,
				  }
				: notification.type === 'error'
				? {
						bg: 'bg-red-50 border-red-200 text-red-800',
						icon: XCircle,
				  }
				: {
						bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
						icon: Info,
				  };
		const Icon = tone.icon;
		return (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[1000]">
				<div className="bg-card rounded-lg border shadow-xl w-full max-w-md">
					<div className={`p-6 rounded-lg border ${tone.bg}`}>
						<div className="flex items-start gap-3">
							<Icon className="h-5 w-5 flex-shrink-0" />
							<div>
								<p className="font-semibold capitalize">{notification.type}</p>
								<p className="text-sm mt-1">{notification.message}</p>
							</div>
						</div>
					</div>
					<div className="p-4 flex justify-end">
						<Button
							variant="outline"
							onClick={() => {
								setResultModalOpen(false);
								setNotification(null);
							}}
						>
							Close
						</Button>
					</div>
				</div>
			</div>
		);
	};

	const filteredAndSortedGrades = useMemo(
		() => applySorting(applyFilters(submittedGrades)),
		[submittedGrades, filters, sortConfig, availableClasses]
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [filters, sortConfig, rowsPerPage, submittedGrades]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredAndSortedGrades.length / rowsPerPage)
	);
	const currentPageSafe = Math.min(currentPage, totalPages);
	const currentSlice = filteredAndSortedGrades.slice(
		(currentPageSafe - 1) * rowsPerPage,
		currentPageSafe * rowsPerPage
	);

	const renderConfirmationErrorModal = () => {
		if (!confirmationModal.isOpen) return null;

		if (confirmationModal.isError) {
			// Renders the error modal
			return (
				<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] backdrop-blur-sm">
					<div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md border border-destructive/50">
						<div className="flex items-center gap-3 mb-4">
							<XCircle className="h-6 w-6 text-destructive flex-shrink-0" />
							<h3 className="text-xl font-bold text-destructive">
								Request Blocked
							</h3>
						</div>
						<p className="text-sm text-foreground mb-6">
							{confirmationModal.errorMessage ||
								'An unexpected error occurred. You cannot submit this request.'}
						</p>
						<div className="mt-4 flex justify-end">
							<Button
								onClick={() =>
									setConfirmationModal({ isOpen: false, reason: '' })
								}
								variant="destructive"
							>
								Close
							</Button>
						</div>
					</div>
				</div>
			);
		}

		// Renders the standard confirmation/reason modal
		return (
			<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] backdrop-blur-sm">
				<div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md border">
					<h3 className="text-lg font-semibold mb-2">
						Reason for Grade Change Request
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						You are editing one or more <strong>approved grades</strong>. Please
						provide a reason for this change. This will be sent for
						administrator review.
					</p>
					<textarea
						value={confirmationModal.reason}
						onChange={(e) =>
							setConfirmationModal((prev) => ({
								...prev,
								reason: e.target.value,
							}))
						}
						className="w-full rounded-md border border-input bg-background p-2"
						rows={4}
						placeholder="e.g., Correction of data entry error, re-evaluation of an assignment..."
					/>
					<div className="mt-4 flex justify-end gap-2">
						<Button
							onClick={() =>
								setConfirmationModal({ isOpen: false, reason: '' })
							}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							onClick={handleFinalSubmit}
							disabled={!confirmationModal.reason.trim() || isSubmitting}
						>
							{isSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Confirm & Submit'
							)}
						</Button>
					</div>
				</div>
			</div>
		);
	};

	const renderDetailsModal = () =>
		selectedGrade && (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
				<div className="bg-background rounded-lg border shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
					<div className="p-6 border-b">
						<div className="flex justify-between items-center">
							<h3 className="text-xl font-semibold text-foreground">
								Submission Details
							</h3>
							<button
								onClick={() => setShowDetailsModal(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="text-sm text-muted-foreground mt-1">
							{selectedGrade.subject} -{' '}
							{classMap.get(selectedGrade.gradeLevel) ||
								selectedGrade.gradeLevel}{' '}
							({periods.find((p) => p.value === selectedGrade.period)?.label})
						</div>
					</div>

					{/* Renders EITHER the confirmation or the error modal */}
					{renderConfirmationErrorModal()}

					<div className="p-6 overflow-y-auto flex-grow">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-border">
								<thead className="bg-muted/50">
									<tr>
										<th className="p-3 text-left">
											<input
												type="checkbox"
												onChange={(e) =>
													setGradeChangeStudents((prev) =>
														prev.map((s) => ({
															...s,
															selected: e.target.checked,
														}))
													)
												}
												className="rounded border-border accent-primary"
											/>
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
											Student Name
										</th>
										<th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
											Current Grade
										</th>
										<th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
											New Grade
										</th>
										<th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
											Status
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border bg-background">
									{gradeChangeStudents.map((student) => (
										<tr
											key={student.studentId}
											className={student.selected ? 'bg-primary/5' : ''}
										>
											<td className="p-3">
												<input
													type="checkbox"
													checked={student.selected}
													onChange={() =>
														setGradeChangeStudents((prev) =>
															prev.map((s) =>
																s.studentId === student.studentId
																	? { ...s, selected: !s.selected }
																	: s
															)
														)
													}
													className="rounded border-border accent-primary"
												/>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
												{student.name}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-center">
												<span
													className={getModalGradeColor(student.currentGrade)}
												>
													{student.currentGrade ?? 'N/A'}
												</span>
											</td>
										<td className="px-6 py-4">
											{(() => {
												const validation = getGradeValidationStatus(
													student.newGrade
												);
												const isInvalid =
													!validation.isValid && student.newGrade !== '';
												return (
													<div className="flex flex-col items-center gap-1">
														<input
															type="text"
															value={student.newGrade}
															onChange={(e) =>
																handleGradeInputChange(
																	student.studentId,
																	e.target.value
																)
															}
															disabled={!student.selected}
															className={`w-20 h-10 rounded-lg border-2 text-center text-base font-semibold focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${getModalGradeColor(
																student.newGrade === ''
																	? null
																	: Number(student.newGrade)
															)} ${
																isInvalid
																	? 'bg-background border-red-500 focus:ring-red-500'
																	: 'bg-background border-input hover:border-ring'
															} disabled:bg-muted disabled:cursor-not-allowed`}
															inputMode="numeric"
														/>
														{isInvalid && (
															<span className="text-xs text-red-500">
																{validation.message}
															</span>
														)}
													</div>
												);
											})()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-center">
											<span
												className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
													student.status
												)}`}
											>
												{getStatusIcon(student.status)}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

					<div className="p-6 border-t bg-muted/50 flex justify-end gap-3">
						<Button
							onClick={() => setShowDetailsModal(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							onClick={handleOpenConfirmationModal}
							disabled={
								isSubmitting ||
								gradeChangeStudents.filter((s) => s.selected).length === 0
							}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
						>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							Submit Request
						</Button>
					</div>
				</div>
			</div>
		);

	if (loading.teacherInfo) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading
					message="Loading grade submissions..."
					fullScreen={false}
				></PageLoading>
			</div>
		);
	}

	if (error.teacherInfo) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<div className="text-center text-destructive">{error.teacherInfo}</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="w-full">
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-primary/10 rounded-lg">
							<BarChart3 className="h-6 w-6 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								Grade Submissions
							</h1>
							<p className="text-muted-foreground">
								Track and manage your submitted grades
							</p>
						</div>
					</div>
				</div>

				{renderResultModal()}

				<div className="space-y-6">
					<div className="flex flex-col sm:flex-row gap-4 flex-wrap">
						<Button
							onClick={() =>
								(window.location.href = '/dashboard/submit-grades')
							}
							className="flex items-center gap-2"
						>
							<Plus className="h-4 w-4" />
							Submit New Grades
						</Button>

						{availableSessions.length > 1 && (
							<select
								value={filters.session}
								onChange={(e) =>
									setFilters({
										...filters,
										session: e.target.value,
										gradeLevel: '',
										classId: '',
									})
								}
								className="mt-1 block w-full sm:w-auto rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
							>
								<option value="">All Sessions</option>
								{availableSessions.map((s, i) => (
									<option key={`${s}-${i}`} value={s}>
										{s}
									</option>
								))}
							</select>
						)}

						{availableSubjects.length > 1 && (
							<select
								value={filters.subject}
								onChange={(e) =>
									setFilters({ ...filters, subject: e.target.value })
								}
								className="mt-1 block w-full sm:w-auto rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
							>
								<option value="">All Subjects</option>
								{availableSubjects.map((s, i) => (
									<option key={`${s}-${i}`} value={s}>
										{s}
									</option>
								))}
							</select>
						)}

						{availableLevels.length > 1 && (
							<select
								value={filters.gradeLevel}
								onChange={(e) =>
									setFilters({
										...filters,
										gradeLevel: e.target.value,
										classId: '',
									})
								}
								className="mt-1 block w-full sm:w-auto rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
							>
								<option value="">All Levels</option>
								{availableLevels.map((l, i) => (
									<option key={`${l}-${i}`} value={l}>
										{l}
									</option>
								))}
							</select>
						)}

						{showClassFilter && availableClasses.length > 0 && (
							<select
								value={filters.classId}
								onChange={(e) =>
									setFilters({ ...filters, classId: e.target.value })
								}
								className="mt-1 block w-full sm:w-auto rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
							>
								<option value="">All Classes</option>
								{availableClasses.map((c, i) => (
									<option key={`${c.classId}-${i}`} value={c.classId}>
										{c.name}
									</option>
								))}
							</select>
						)}

						<select
							value={filters.period}
							onChange={(e) =>
								setFilters({ ...filters, period: e.target.value })
							}
							className="mt-1 block w-full sm:w-auto rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
						>
							<option value="">All Periods</option>
							{periods.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>

						<Button
							onClick={() => fetchSubmittedGrades({ forceRefresh: true })}
							disabled={loading.submittedGrades}
							className="flex items-center gap-2"
							variant="outline"
						>
							<RefreshCw
								className={`h-4 w-4 ${
									loading.submittedGrades ? 'animate-spin' : ''
								}`}
							/>
							Refresh
						</Button>

						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Rows:</span>
							<select
								value={rowsPerPage}
								onChange={(e) => {
									setRowsPerPage(Number(e.target.value));
									setCurrentPage(1);
								}}
								className="w-[80px] rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
							>
								<option value="5">5</option>
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
							</select>
						</div>
					</div>

					<div className="bg-background border border-border rounded-lg overflow-hidden shadow-sm">
						<div className="p-6 border-b border-border">
							<h3 className="text-lg font-semibold text-foreground">
								Recent Grade Submissions
							</h3>
							<p className="text-muted-foreground text-sm">
								Track your submitted and pending grade submissions.
							</p>
						</div>
						{loading.submittedGrades ? (
							<PageLoading
								fullScreen={false}
								message="Loading Submissions..."
							/>
						) : error.submittedGrades ? (
							<div className="p-6 text-center text-destructive">
								{error.submittedGrades}
							</div>
						) : submittedGrades?.length === 0 ? (
							<div className="p-6 text-center text-muted-foreground">
								No grades have been submitted yet.
							</div>
						) : filteredAndSortedGrades.length === 0 ? (
							<div className="p-6 text-center text-muted-foreground">
								No submissions match your filters.
							</div>
						) : (
							<>
								<div className="overflow-x-auto">
									<table className="w-full">
									<thead className="bg-muted/50">
										<tr>
											{[
												'subject',
												'classId',
												'period',
												'status',
												'lastUpdated',
											].map((key) => (
												<th
													key={key}
													className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted"
													onClick={() =>
														handleSort(key as keyof GradeSubmission)
													}
												>
													<div className="flex items-center gap-2">
														{key === 'classId'
															? 'Class'
															: key
																	.replace(/([A-Z])/g, ' $1')
																	.replace(/^./, (str) => str.toUpperCase())}
														{getSortIcon(key as keyof GradeSubmission)}
													</div>
												</th>
											))}
											<th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border bg-background">
										{currentSlice.map((grade) => (
											<tr
												key={grade.submissionId}
												className="hover:bg-muted/70 transition-colors"
											>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
													{grade.subject}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{classMap.get(grade.gradeLevel) || grade.gradeLevel}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{periods.find((p) => p.value === grade.period)?.label}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm">
													<span
														className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
															grade.status
														)}`}
													>
														{getStatusIcon(grade.status)} {grade.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{formatLastUpdated(grade.lastUpdated)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<Button
														variant="outline"
														size="sm"
														onClick={() => openDetailsModal(grade)}
													>
														Details & Change Grade
													</Button>
												</td>
											</tr>
										))}
									</tbody>
									</table>
								</div>
								<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-t border-border">
									<div className="text-sm text-muted-foreground">
										Showing{' '}
										<strong>{(currentPageSafe - 1) * rowsPerPage + 1}</strong>–
										<strong>
											{Math.min(
												currentPageSafe * rowsPerPage,
												filteredAndSortedGrades.length
											)}
										</strong>{' '}
										of <strong>{filteredAndSortedGrades.length}</strong>{' '}
										submissions
									</div>
									<div className="flex items-center justify-between gap-2 sm:justify-start">
										<button
											className="w-full px-2 py-2 text-sm border rounded-md disabled:opacity-50 sm:w-auto"
											onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
											disabled={currentPageSafe === 1}
										>
											Previous
										</button>
										<div className="text-sm">
											Page {currentPageSafe} of {totalPages}
										</div>
										<button
											className="w-full px-2 py-2 text-sm border rounded-md disabled:opacity-50 sm:w-auto"
											onClick={() =>
												setCurrentPage((p) => Math.min(p + 1, totalPages))
											}
											disabled={currentPageSafe === totalPages}
										>
											Next
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
			{showDetailsModal && renderDetailsModal()}
		</div>
	);
};

export default GradeSubmissions;
