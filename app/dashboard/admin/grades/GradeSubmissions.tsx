'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
	Filter,
	CheckCircle,
	Clock,
	AlertCircle,
	X,
	Loader2,
	Info,
	Check,
	XCircle,
	User,
	Calendar,
	BookOpen,
	GraduationCap,
	Award,
	Laptop,
	Target,
	Heart,
	Users,
	Globe,
	Zap,
	FlaskConical,
	Building,
	Shield,
	Star,
	Wifi,
	WifiOff,
	Eye,
	Search,
	RefreshCw,
} from 'lucide-react';
import { useNetworkStore } from '@/store/networkStore';
import { useSchoolStore } from '@/store/schoolStore';
import { PageLoading } from '@/components/loading';
import { getScopedAcademicYearValue } from '@/utils/academicYear';
import { lockBodyScroll } from '@/utils/scrollLock';
import {
	buildSchoolAcademicYearRange,
	pickCurrentOrMostRecentAcademicYear,
} from '@/utils/academicYearOptions';

// Types
interface StudentGrade {
	studentId: string;
	name: string;
	grade: number | null;
	status: 'Approved' | 'Rejected' | 'Pending';
	rank?: number;
	rejectionReason?: string;
}

interface GradeSubmission {
	submissionId: string;
	academicYear: string;
	period: string;
	classId: string;
	subject: string;
	teacherUsername: string;
	teacherName: string;
	lastUpdated: string;
	grades: StudentGrade[];
	status: 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved';
	rejectionReason?: string;
	stats: {
		incompletes: number;
		passes: number;
		fails: number;
		average: number;
		totalStudents: number;
	};
}

interface RawGradeData {
	id: string;
	submissionId: string;
	studentId: string;
	studentName: string;
	academicYear: string;
	period: string;
	classId: string;
	subject: string;
	teacherUsername: string;
	teacherName: string;
	grade: number | null;
	status: 'Approved' | 'Rejected' | 'Pending';
	rejectionReason?: string;
	lastUpdated: string;
}

const periods = [
	{ id: 'first', label: '1st Pd', value: 'first' },
	{ id: 'second', label: '2nd Pd', value: 'second' },
	{ id: 'third', label: '3rd Pd', value: 'third' },
	{
		id: 'third_period_exam',
		label: '3rd Pd Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: '4th Pd', value: 'fourth' },
	{ id: 'fifth', label: '5th Pd', value: 'fifth' },
	{ id: 'sixth', label: '6th Pd', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: '6th Pd Exam',
		value: 'sixth_period_exam',
	},
];

const normalizeAcademicYear = (value?: string) =>
	value ? value.replace('/', '-') : '';

const AdminGradeManagement: React.FC = () => {
	const currentSchool = useSchoolStore((state) => state.school);
	const currentAcademicYear = currentSchool?.currentAcademicYear || '';
	const academicYearOptions = useMemo(
		() => buildSchoolAcademicYearRange(currentSchool),
		[currentSchool],
	);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);
	const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
		currentAcademicYear || academicYearOptions[0] || '',
	);
	const scopedGrades = useSchoolStore(
		(state) =>
			getScopedAcademicYearValue(
				state.gradesByAcademicYear,
				selectedAcademicYear,
			).value,
	);

	// Data states
	const [submissions, setSubmissions] = useState<GradeSubmission[]>([]);
	// loading = true only on initial load when there is nothing to show yet
	const [loading, setLoading] = useState(true);
	// isSyncing = true during cursor-aware refresh; table stays visible
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState('');
	const [actionNotice, setActionNotice] = useState<{
		type: 'info' | 'error';
		message: string;
	} | null>(null);
	const { isOnline } = useNetworkStore();

	// Modal states
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
	const isAnyModalOpen =
		showDetailsModal || showRejectModal || showBulkRejectModal;

	// Selection and action states
	const [selectedSubmission, setSelectedSubmission] =
		useState<GradeSubmission | null>(null);
	const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(
		new Set(),
	);
	const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
		new Set(),
	);
	const [rejectionReason, setRejectionReason] = useState('');
	const [bulkRejectionReason, setBulkRejectionReason] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [actionType, setActionType] = useState<'submission' | 'individual'>(
		'submission',
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [rowsPerPage, setRowsPerPage] = useState<number>(5);

	// Filter and sort states
	const [filters, setFilters] = useState({
		subject: '',
		classId: '',
		period: '',
		status: 'All',
	});


	useEffect(() => {
		if (!actionNotice) return;

		const timer = setTimeout(() => {
			setActionNotice(null);
		}, 10000);

		return () => clearTimeout(timer);
	}, [actionNotice]);

	useEffect(() => {
		if (!isAnyModalOpen) return;
		return lockBodyScroll();
	}, [isAnyModalOpen]);

	useEffect(() => {
		const defaultAcademicYear =
			pickCurrentOrMostRecentAcademicYear(
				academicYearOptions,
				currentAcademicYear,
			) || '';
		const selectedIsAvailable = academicYearOptions.some(
			(year) =>
				normalizeAcademicYear(year) ===
				normalizeAcademicYear(selectedAcademicYear),
		);
		if (!selectedAcademicYear || !selectedIsAvailable) {
			setSelectedAcademicYear(defaultAcademicYear);
		}
	}, [academicYearOptions, currentAcademicYear, selectedAcademicYear]);

	const getTeacherDisplayName = (teacher: any) => {
		if (!teacher) return '';
		return (
			teacher.fullName ||
			`${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
		);
	};

	const teacherNameByYearAndUsername = useMemo(() => {
		const map = new Map<string, string>();
		Object.entries(usersByAcademicYear || {}).forEach(([year, users]) => {
			(users?.teachers || []).forEach((teacher: any) => {
				const username =
					teacher?.username || teacher?.userId || teacher?.id || teacher?._id;
				const name = getTeacherDisplayName(teacher);
				if (!username || !name) return;
				map.set(`${normalizeAcademicYear(year)}:${username}`, name);
			});
		});
		return map;
	}, [usersByAcademicYear]);

	const teacherNameByUsername = useMemo(() => {
		const map = new Map<string, string>();
		Object.values(usersByAcademicYear || {}).forEach((users: any) => {
			(users?.teachers || []).forEach((teacher: any) => {
				const username =
					teacher?.username || teacher?.userId || teacher?.id || teacher?._id;
				const name = getTeacherDisplayName(teacher);
				if (!username || !name) return;
				map.set(username, name);
			});
		});
		return map;
	}, [usersByAcademicYear]);

	const classMap = useMemo(() => {
		if (!currentSchool?.classLevels) return new Map();
		const map = new Map<string, string>();
		Object.values(currentSchool.classLevels).forEach((session: any) => {
			Object.values(session).forEach((level: any) => {
				level.classes.forEach((cls: { classId: string; name: string }) => {
					map.set(cls.classId, cls.name);
				});
			});
		});
		return map;
	}, [currentSchool]);

	const resolveTeacherName = (
		username?: string,
		academicYear?: string,
		fallback?: string,
	) => {
		const normalizedYear = normalizeAcademicYear(academicYear);
		const fromYear =
			username && normalizedYear
				? teacherNameByYearAndUsername.get(`${normalizedYear}:${username}`)
				: undefined;
		const fromAny = username ? teacherNameByUsername.get(username) : undefined;
		return fromYear || fromAny || fallback || username || 'Unknown';
	};

	const parseDate = (value?: string) => {
		if (!value) return null;
		const parsed = new Date(value);
		const ts = parsed.getTime();
		return Number.isFinite(ts) ? ts : null;
	};

	const formatDate = (dateString?: string) => {
		const timestamp = parseDate(dateString);
		if (!timestamp) return '—';
		return new Date(timestamp).toLocaleString([], {
			dateStyle: 'short',
			timeStyle: 'short',
		});
	};

	const transformRawGrades = (rawGrades: RawGradeData[]) => {
		const groupedGrades = rawGrades.reduce(
			(acc, grade) => {
				if (!acc[grade.submissionId]) {
					acc[grade.submissionId] = [];
				}
				acc[grade.submissionId].push(grade);
				return acc;
			},
			{} as Record<string, RawGradeData[]>,
		);

		return Object.values(groupedGrades).map((grades) => {
			const firstGrade = grades[0];
			const resolvedTeacherName = resolveTeacherName(
				firstGrade.teacherUsername,
				firstGrade.academicYear,
				firstGrade.teacherName,
			);
			const latestUpdated =
				grades.reduce<string | null>((latest, grade) => {
					if (!grade?.lastUpdated) return latest;
					if (!latest) return grade.lastUpdated;
					return grade.lastUpdated > latest ? grade.lastUpdated : latest;
				}, null) || firstGrade.lastUpdated;
			const validGrades = grades
				.map((g) => g.grade)
				.filter((g): g is number => g !== null);

			const statuses = new Set(grades.map((g) => g.status));
			let submissionStatus: GradeSubmission['status'] = 'Pending';
			if (statuses.size === 1) {
				const onlyStatus = statuses.values().next().value as
					| GradeSubmission['status']
					| undefined;
				submissionStatus = onlyStatus || 'Pending';
			} else if (
				statuses.has('Pending') ||
				(statuses.has('Approved') && statuses.has('Rejected'))
			) {
				submissionStatus = 'Partially Approved';
			} else if (statuses.has('Approved')) {
				submissionStatus = 'Approved';
			} else if (statuses.has('Rejected')) {
				submissionStatus = 'Rejected';
			}

			return {
				submissionId: firstGrade.submissionId,
				academicYear: firstGrade.academicYear,
				period: firstGrade.period,
				classId: firstGrade.classId,
				subject: firstGrade.subject,
				teacherUsername: firstGrade.teacherUsername,
				teacherName: resolvedTeacherName,
				lastUpdated: latestUpdated,
				grades: grades.map((g) => ({
					studentId: g.studentId,
					name: g.studentName,
					grade: g.grade,
					status: g.status,
					rejectionReason: g.rejectionReason,
				})),
				status: submissionStatus,
				rejectionReason: grades.find((g) => g.rejectionReason)?.rejectionReason,
				stats: {
					totalStudents: grades.length,
					passes: validGrades.filter((g) => g >= 70).length,
					fails: validGrades.filter((g) => g < 70).length,
					incompletes: grades.length - validGrades.length,
					average:
						validGrades.length > 0
							? validGrades.reduce((a, b) => a + b, 0) / validGrades.length
							: 0,
				},
			};
		});
	};

	// Initial load — shows full-table spinner only when there is nothing to
	// display yet. Called on mount and when selectedAcademicYear changes.
const loadGrades = async () => {
	if (!selectedAcademicYear) {
		setSubmissions([]);
		setLoading(false);
		return;
	}

	const schoolState = useSchoolStore.getState();
	const scopedStoreSnapshot = getScopedAcademicYearValue(
		schoolState.gradesByAcademicYear || {},
		selectedAcademicYear,
	);
	const hasYearSnapshot = Boolean(scopedStoreSnapshot.key);
	const cachedGrades = Array.isArray(scopedStoreSnapshot.value)
		? scopedStoreSnapshot.value
		: [];

	if (hasYearSnapshot && cachedGrades.length > 0) {
		setSubmissions(transformRawGrades(cachedGrades as RawGradeData[]));
		setError('');
		setLoading(false);
	}

	if (submissions.length === 0) {
		setLoading(true);
	}

	// Fire it without awaiting to completely unblock the UI thread
	useSchoolStore
		.getState()
		.runBackgroundGradeSync(selectedAcademicYear, {
			mode: 'background-parallel',
		})
		.catch((err) => {
			console.error('Error fetching grades:', err);
			if (submissions.length === 0) {
				setError('Failed to fetch grade submissions. Please try again.');
			}
		})
		.finally(() => {
			setLoading(false);
		});
};


const handleRefresh = async (silent: boolean = false) => {
	if (!selectedAcademicYear || isSyncing) return;

	// Only trigger UI states if this is a manual user click
	if (!silent) {
		setIsSyncing(true);
		setActionNotice(null);
	}

	try {
		const startTime = Date.now();
		const CURSOR_KEY = `sync_cursor_grades_${selectedAcademicYear}`;
		const hasCursor = Boolean(localStorage.getItem(CURSOR_KEY));

		let result = { status: 'no-op', fetchedCount: 0 };

		if (hasCursor) {
			result = await useSchoolStore
				.getState()
				.runBackgroundGradeSync(selectedAcademicYear, {
					mode: 'refresh-sequential',
				});
		} else {
			const schoolState = useSchoolStore.getState();
			const scopedStoreSnapshot = getScopedAcademicYearValue(
				schoolState.gradesByAcademicYear || {},
				selectedAcademicYear,
			);
			const cachedGrades = Array.isArray(scopedStoreSnapshot.value)
				? scopedStoreSnapshot.value
				: [];
			setSubmissions(transformRawGrades(cachedGrades as RawGradeData[]));
			result = { status: 'success', fetchedCount: 0 };
		}

		// Only show delays and notices if this is a manual refresh
		if (!silent) {
			const elapsed = Date.now() - startTime;
			if (elapsed < 600) {
				await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
			}

			if (result.status === 'busy') {
				setActionNotice({
					type: 'info',
					message:
						'A background data sync is already running. Please wait a moment.',
				});
			} else if (result.status === 'error') {
				setActionNotice({
					type: 'error',
					message:
						'Failed to communicate with the server. Please check your connection.',
				});
			} else if (result.fetchedCount > 0) {
				setActionNotice({
					type: 'info',
					message: `Successfully fetched ${result.fetchedCount} new or updated grade records.`,
				});
			} else {
				setActionNotice({
					type: 'info',
					message: 'All grades are currently up to date.',
				});
			}
		}
	} catch (err) {
		console.error('Error refreshing grades:', err);
		if (!silent) {
			setActionNotice({
				type: 'error',
				message: 'Refresh failed. Please try again.',
			});
		}
	} finally {
		if (!silent) {
			setIsSyncing(false);
		}
	}
};

	// Triggered on academic-year context change; store updates flow in via
	// the scopedGrades effect below and should not retrigger this.
	useEffect(() => {
		void loadGrades();
	}, [selectedAcademicYear]);

	// When the store's gradesByAcademicYear is updated (by the background sync,
	// realtime events, or applySubmissionStatusLocally) re-derive the table
	// without touching the loading state.
	useEffect(() => {
		if (!Array.isArray(scopedGrades)) return;
		setSubmissions(transformRawGrades(scopedGrades as RawGradeData[]));
		setLoading(false);
		setError('');
	}, [scopedGrades]);

	useEffect(() => {
		setSelectedSubmissions(new Set());
		setSelectedStudents(new Set());
		setSelectedSubmission(null);
		setCurrentPage(1);
	}, [selectedAcademicYear]);

	const inferSubmissionStatus = (
		grades: StudentGrade[],
	): GradeSubmission['status'] => {
		const statuses = new Set(grades.map((grade) => grade.status));
		if (statuses.size === 1) {
			return statuses.values().next().value as GradeSubmission['status'];
		}
		if (
			statuses.has('Pending') ||
			(statuses.has('Approved') && statuses.has('Rejected'))
		) {
			return 'Partially Approved';
		}
		if (statuses.has('Approved')) return 'Approved';
		if (statuses.has('Rejected')) return 'Rejected';
		return 'Pending';
	};

	const applySubmissionStatusLocally = (
		payload: {
			submissionId: string;
			studentId: string;
			status: 'Approved' | 'Rejected';
			rejectionReason?: string;
		}[],
	) => {
		if (payload.length === 0) return;
		const nowIso = new Date().toISOString();
		const updateMap = new Map<
			string,
			{ status: 'Approved' | 'Rejected'; rejectionReason?: string }
		>();

		payload.forEach((update) => {
			if (!update?.submissionId || !update?.studentId) return;
			updateMap.set(`${update.submissionId}:${update.studentId}`, {
				status: update.status,
				rejectionReason: update.rejectionReason,
			});
		});
		if (updateMap.size === 0) return;

		const nextSubmissions = submissions.map((submission) => {
			let changed = false;
			const nextGrades = submission.grades.map((student) => {
				const update = updateMap.get(
					`${submission.submissionId}:${student.studentId}`,
				);
				if (!update || student.status !== 'Pending') return student;
				changed = true;
				return {
					...student,
					status: update.status,
					rejectionReason:
						update.status === 'Rejected' ? update.rejectionReason : undefined,
				};
			});

			if (!changed) return submission;
			return {
				...submission,
				grades: nextGrades,
				status: inferSubmissionStatus(nextGrades),
				lastUpdated: nowIso,
				rejectionReason: nextGrades.find((grade) => grade.rejectionReason)
					?.rejectionReason,
			};
		});

		setSubmissions(nextSubmissions);
		if (selectedSubmission) {
			const refreshedSelection = nextSubmissions.find(
				(item) => item.submissionId === selectedSubmission.submissionId,
			);
			if (refreshedSelection) {
				setSelectedSubmission(refreshedSelection);
			}
		}

		if (!selectedAcademicYear) return;
		const schoolState = useSchoolStore.getState();
		const scopedStoreSnapshot = getScopedAcademicYearValue(
			schoolState.gradesByAcademicYear || {},
			selectedAcademicYear,
		);
		const rawGrades = Array.isArray(scopedStoreSnapshot.value)
			? (scopedStoreSnapshot.value as RawGradeData[])
			: [];
		if (rawGrades.length === 0) return;

		const nextRawGrades = rawGrades.map((grade) => {
			const update = updateMap.get(`${grade.submissionId}:${grade.studentId}`);
			if (!update || grade.status !== 'Pending') return grade;
			return {
				...grade,
				status: update.status,
				rejectionReason:
					update.status === 'Rejected' ? update.rejectionReason : undefined,
				lastUpdated: nowIso,
			};
		});
		setGradesForYear(selectedAcademicYear, nextRawGrades);
	};

	// API interaction handlers
const updateGradesStatus = async (
	payload: {
		submissionId: string;
		studentId: string;
		status: 'Approved' | 'Rejected';
		rejectionReason?: string;
	}[],
) => {
	try {
		setActionNotice(null);
		const response = await fetch('/api/grades', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const result = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(result.message || 'API request failed');
		}
		if (result?.queued) {
			applySubmissionStatusLocally(payload);
			setActionNotice({
				type: 'info',
				message:
					'You are offline. Approval/rejection was queued and will sync when you reconnect.',
			});
			return;
		}
		applySubmissionStatusLocally(payload);
		window.dispatchEvent(new CustomEvent('grading:counts:refresh'));

		// Pass true to run the post-action refresh silently
		void handleRefresh(true);
	} catch (error) {
		console.error('Error updating grade status:', error);
		setActionNotice({
			type: 'error',
			message: 'Could not update grade status. Please try again.',
		});
	}
};

	// Modal and action handlers
	const handleApprove = async () => {
		if (!selectedSubmission) return;
		setIsProcessing(true);

		const studentsToApprove = selectedSubmission.grades
			.filter(
				(student) =>
					student.status === 'Pending' &&
					(selectedStudents.size === 0 ||
						selectedStudents.has(student.studentId)),
			)
			.map((student) => student.studentId);

		if (studentsToApprove.length > 0) {
			const payload = studentsToApprove.map((studentId) => ({
				submissionId: selectedSubmission.submissionId,
				studentId,
				status: 'Approved' as const,
			}));
			await updateGradesStatus(payload);
		}

		setShowDetailsModal(false);
		setIsProcessing(false);
	};

	const handleReject = async () => {
		if (!selectedSubmission || !rejectionReason.trim()) return;
		setIsProcessing(true);

		const studentsToReject = selectedSubmission.grades
			.filter(
				(student) =>
					student.status === 'Pending' &&
					(selectedStudents.size === 0 ||
						selectedStudents.has(student.studentId)),
			)
			.map((student) => student.studentId);

		if (studentsToReject.length > 0) {
			const payload = studentsToReject.map((studentId) => ({
				submissionId: selectedSubmission.submissionId,
				studentId,
				status: 'Rejected' as const,
				rejectionReason,
			}));
			await updateGradesStatus(payload);
		}

		setShowRejectModal(false);
		setShowDetailsModal(false);
		setRejectionReason('');
		setIsProcessing(false);
	};

	const handleBulkApprove = async () => {
		if (selectedSubmissions.size === 0) return;
		setIsProcessing(true);

		const payload = Array.from(selectedSubmissions).flatMap((submissionId) => {
			const submission = submissions.find(
				(s) => s.submissionId === submissionId,
			);
			return (
				submission?.grades
					.filter((g) => g.status === 'Pending')
					.map((g) => ({
						submissionId: submission.submissionId,
						studentId: g.studentId,
						status: 'Approved' as const,
					})) || []
			);
		});

		if (payload.length > 0) {
			await updateGradesStatus(payload);
		}

		setSelectedSubmissions(new Set());
		setIsProcessing(false);
	};

	const handleBulkReject = async () => {
		if (selectedSubmissions.size === 0 || !bulkRejectionReason.trim()) return;
		setIsProcessing(true);

		const payload = Array.from(selectedSubmissions).flatMap((submissionId) => {
			const submission = submissions.find(
				(s) => s.submissionId === submissionId,
			);
			return (
				submission?.grades
					.filter((g) => g.status === 'Pending')
					.map((g) => ({
						submissionId: submission.submissionId,
						studentId: g.studentId,
						status: 'Rejected' as const,
						rejectionReason: bulkRejectionReason,
					})) || []
			);
		});

		if (payload.length > 0) {
			await updateGradesStatus(payload);
		}

		setSelectedSubmissions(new Set());
		setShowBulkRejectModal(false);
		setBulkRejectionReason('');
		setIsProcessing(false);
	};

	// Get unique values for filters
	const getUniqueSubjects = () =>
		[...new Set(submissions.map((s) => s.subject))].sort();
	const getUniqueClasses = () => {
		const classIds = [...new Set(submissions.map((s) => s.classId))];
		return classIds
			.map((id) => ({ classId: id, name: classMap.get(id) || id }))
			.sort((a, b) => a.name.localeCompare(b.name));
	};

	// Filtering and sorting logic
	const filteredAndSortedSubmissions = useMemo(() => {
		let filtered = submissions.filter((sub) => {
			if (filters.status && filters.status !== 'All') {
				if (filters.status === 'Pending') {
					if (sub.status !== 'Pending' && sub.status !== 'Partially Approved')
						return false;
				} else {
					if (sub.status !== filters.status) return false;
				}
			}

			if (filters.subject && sub.subject !== filters.subject) return false;
			if (filters.classId && sub.classId !== filters.classId) return false;
			if (filters.period && sub.period !== filters.period) return false;

			const lowerCaseQuery = searchQuery.toLowerCase();
			if (searchQuery) {
				const teacherMatch =
					sub.teacherName &&
					sub.teacherName?.toLowerCase().includes(lowerCaseQuery);
				const subjectMatch =
					sub.subject && sub.subject.toLowerCase().includes(lowerCaseQuery);
				const classMatch = (classMap.get(sub.classId) || '')
					.toLowerCase()
					.includes(lowerCaseQuery);
				if (!teacherMatch && !subjectMatch && !classMatch) return false;
			}

			return true;
		});

		const statusPriority: Record<GradeSubmission['status'], number> = {
			Pending: 0,
			'Partially Approved': 1,
			Rejected: 1,
			Approved: 2,
		};

		return filtered.sort((a, b) => {
			const statusDelta =
				(statusPriority[a.status] ?? 3) - (statusPriority[b.status] ?? 3);
			if (statusDelta !== 0) return statusDelta;
			const aDate = parseDate(a.lastUpdated) || 0;
			const bDate = parseDate(b.lastUpdated) || 0;
			return bDate - aDate;
		});
	}, [submissions, filters, searchQuery, classMap, parseDate]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredAndSortedSubmissions.length / rowsPerPage),
	);
	const currentPageSafe = Math.min(currentPage, totalPages);
	const currentSlice = filteredAndSortedSubmissions.slice(
		(currentPageSafe - 1) * rowsPerPage,
		currentPageSafe * rowsPerPage,
	);

	// UI helper functions
	const getStatusClasses = (
		status: StudentGrade['status'] | GradeSubmission['status'],
	) => {
		switch (status) {
			case 'Approved':
				return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
			case 'Pending':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
			case 'Partially Approved':
				return 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300';
			case 'Rejected':
				return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};
	const getStatusIcon = (
		status: StudentGrade['status'] | GradeSubmission['status'],
	) => {
		switch (status) {
			case 'Approved':
				return <CheckCircle className="h-4 w-4" />;
			case 'Pending':
				return <Clock className="h-4 w-4" />;
			case 'Partially Approved':
				return <Info className="h-4 w-4" />;
			case 'Rejected':
				return <XCircle className="h-4 w-4" />;
			default:
				return <AlertCircle className="h-4 w-4" />;
		}
	};
	const getGradeColor = (grade: number | null) => {
		if (grade === null) return 'text-muted-foreground';
		return grade >= 70
			? 'text-[var(--grade-pass)] font-semibold'
			: 'text-[var(--grade-fail)] font-semibold';
	};

	// Selection toggles
	const toggleSubmissionSelection = (submissionId: string) => {
		setSelectedSubmissions((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(submissionId)) newSet.delete(submissionId);
			else newSet.add(submissionId);
			return newSet;
		});
	};
	const toggleAllSubmissions = (checked: boolean) => {
		if (checked) {
			const selectable = filteredAndSortedSubmissions
				.filter((s) => ['Pending', 'Partially Approved'].includes(s.status))
				.map((s) => s.submissionId);
			setSelectedSubmissions(new Set(selectable));
		} else {
			setSelectedSubmissions(new Set());
		}
	};

	const renderDetailsModal = () => {
		if (!selectedSubmission) return null;
		const selectableStudents = selectedSubmission.grades.filter(
			(g) => g.status === 'Pending',
		);

		return (
			<div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px] p-4 overflow-y-auto overscroll-contain">
				<div className="flex min-h-full items-center justify-center">
					<div className="bg-card rounded-lg shadow-xl w-full max-w-6xl max-h-[calc(100dvh-2rem)] flex flex-col border">
						<div className="p-6 border-b">
							<div className="flex justify-between items-center">
								<div>
									<h3 className="text-xl font-semibold">Submission Details</h3>
									<div className="text-sm text-muted-foreground mt-1 space-y-1">
										<div className="flex items-center gap-4">
											<span className="flex items-center gap-1">
												<User className="h-4 w-4" />
												{selectedSubmission.teacherName}
											</span>
											<span className="flex items-center gap-1">
												<BookOpen className="h-4 w-4" />
												{selectedSubmission.subject}
											</span>
											<span className="flex items-center gap-1">
												<GraduationCap className="h-4 w-4" />
												{classMap.get(selectedSubmission.classId) ||
													selectedSubmission.classId}
											</span>
										</div>
										<div className="flex items-center gap-4">
											<span className="flex items-center gap-1">
												<Calendar className="h-4 w-4" />
												{
													periods.find(
														(p) => p.value === selectedSubmission.period,
													)?.label
												}
											</span>
											<span>
												Last updated:{' '}
												{formatDate(selectedSubmission.lastUpdated)}
											</span>
										</div>
									</div>
								</div>
								<button
									onClick={() => setShowDetailsModal(false)}
									className="text-muted-foreground hover:text-foreground"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						<div className="p-6 overflow-y-auto overscroll-contain flex-grow">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-border">
									<thead className="bg-muted/50">
										<tr>
											<th className="p-3 text-left">
												<input
													type="checkbox"
													onChange={(e) => {
														if (e.target.checked)
															setSelectedStudents(
																new Set(
																	selectableStudents.map((g) => g.studentId),
																),
															);
														else setSelectedStudents(new Set());
													}}
													checked={
														selectableStudents.length > 0 &&
														selectedStudents.size === selectableStudents.length
													}
													className="rounded border-input"
												/>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Student Name
											</th>
											<th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
												Grade
											</th>
											<th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
												Status
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{selectedSubmission.grades.map((student) => (
											<tr
												key={student.studentId}
												className={
													selectedStudents.has(student.studentId)
														? 'bg-primary/10'
														: ''
												}
											>
												<td className="p-3">
													<input
														type="checkbox"
														disabled={student.status !== 'Pending'}
														checked={selectedStudents.has(student.studentId)}
														onChange={() => {
															const newSet = new Set(selectedStudents);
															if (newSet.has(student.studentId))
																newSet.delete(student.studentId);
															else newSet.add(student.studentId);
															setSelectedStudents(newSet);
														}}
														className="rounded border-input disabled:opacity-50"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
													{student.name}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-center">
													<span className={getGradeColor(student.grade)}>
														{student.grade ?? 'N/A'}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-center">
													<span
														className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
															student.status,
														)}`}
													>
														{getStatusIcon(student.status)} {student.status}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{['Pending', 'Partially Approved'].includes(
							selectedSubmission.status,
						) && (
							<div className="p-6 border-t bg-muted flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-sm text-muted-foreground">
									{selectedStudents.size > 0
										? `${selectedStudents.size} pending student(s) selected`
										: 'Actions will apply to all pending students'}
								</div>
								<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
									<button
										onClick={() => setShowDetailsModal(false)}
										className="w-full px-4 py-2 text-foreground bg-card border rounded-md hover:bg-muted sm:w-auto"
									>
										Cancel
									</button>
									<button
										onClick={() => {
											setActionType(
												selectedStudents.size > 0 ? 'individual' : 'submission',
											);
											setShowRejectModal(true);
										}}
										className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center justify-center gap-2 sm:w-auto"
									>
										<XCircle className="h-4 w-4" /> Reject{' '}
										{selectedStudents.size > 0 ? 'Selected' : 'All Pending'}
									</button>
									<button
										onClick={handleApprove}
										disabled={isProcessing}
										className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 sm:w-auto"
									>
										{isProcessing && (
											<Loader2 className="h-4 w-4 animate-spin" />
										)}{' '}
										<Check className="h-4 w-4" /> Approve{' '}
										{selectedStudents.size > 0 ? 'Selected' : 'All Pending'}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	const renderRejectModal = () => (
		<div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px] p-4 overflow-y-auto overscroll-contain">
			<div className="flex min-h-full items-center justify-center">
				<div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain border">
					<div className="p-6 border-b">
						<div className="flex justify-between items-center">
							<h3 className="text-lg font-semibold text-destructive">
								Reject Submission
							</h3>
							<button
								onClick={() => setShowRejectModal(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
					</div>
					<div className="p-6">
						<p className="text-muted-foreground mb-4">
							Please provide a reason for rejecting this{' '}
							{actionType === 'individual' ? 'student grade(s)' : 'submission'}:
						</p>
						<textarea
							value={rejectionReason}
							onChange={(e) => setRejectionReason(e.target.value)}
							placeholder="Enter detailed reason for rejection..."
							rows={4}
							className="w-full rounded-md border-input bg-background shadow-sm focus:ring-destructive focus:border-destructive"
						/>
					</div>
					<div className="p-6 border-t bg-muted flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							onClick={() => setShowRejectModal(false)}
							className="w-full px-4 py-2 text-foreground bg-card border rounded-md hover:bg-muted sm:w-auto"
						>
							Cancel
						</button>
						<button
							onClick={handleReject}
							disabled={isProcessing || !rejectionReason.trim()}
							className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2 sm:w-auto"
						>
							{isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
							<XCircle className="h-4 w-4" /> Reject
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	const renderBulkRejectModal = () => (
		<div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px] p-4 overflow-y-auto overscroll-contain">
			<div className="flex min-h-full items-center justify-center">
				<div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain border">
					<div className="p-6 border-b">
						<div className="flex justify-between items-center">
							<h3 className="text-lg font-semibold text-destructive">
								Bulk Reject Submissions
							</h3>
							<button
								onClick={() => setShowBulkRejectModal(false)}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
					</div>
					<div className="p-6">
						<p className="text-muted-foreground mb-4">
							You are about to reject {selectedSubmissions.size} submission(s).
							Please provide a reason:
						</p>
						<textarea
							value={bulkRejectionReason}
							onChange={(e) => setBulkRejectionReason(e.target.value)}
							placeholder="Enter detailed reason for rejection..."
							rows={4}
							className="w-full rounded-md border-input bg-background shadow-sm focus:ring-destructive focus:border-destructive"
						/>
					</div>
					<div className="p-6 border-t bg-muted flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							onClick={() => setShowBulkRejectModal(false)}
							className="w-full px-4 py-2 text-foreground bg-card border rounded-md hover:bg-muted sm:w-auto"
						>
							Cancel
						</button>
						<button
							onClick={handleBulkReject}
							disabled={isProcessing || !bulkRejectionReason.trim()}
							className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2 sm:w-auto"
						>
							{isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
							<XCircle className="h-4 w-4" /> Reject {selectedSubmissions.size}{' '}
							Submissions
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	// Main component render
	return (
		<div className="space-y-6 bg-background text-foreground p-4 md:p-6">
			<div className="bg-card border rounded-lg">
				<div className="p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-4">
						<div>
							<h2 className="text-2xl font-bold">
								Grade Submissions Management
							</h2>
							<p className="text-muted-foreground mt-1">
								Review and manage grade submissions from all teachers.
								{selectedAcademicYear
									? ` Academic year: ${selectedAcademicYear}`
									: ''}
							</p>
						</div>
						{/* Refresh button — isSyncing reflects cursor-aware refresh;
						    loading reflects the initial empty-table load. Both disable
						    the button but only isSyncing keeps the table visible. */}
						<button
							onClick={() => handleRefresh(false)}
							disabled={loading || isSyncing}
							className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
						>
							{isSyncing ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
							{isSyncing ? 'Syncing…' : 'Refresh'}
						</button>
					</div>

					{actionNotice && (
						<div
							className={`mb-4 rounded-md border px-4 py-2 text-sm ${
								actionNotice.type === 'error'
									? 'bg-destructive/10 border-destructive/20 text-destructive'
									: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
							}`}
						>
							{actionNotice.message}
						</div>
					)}

					{/* Filters */}
					<div className="flex flex-wrap gap-4 items-center">
						<div className="relative w-full sm:w-auto flex-grow">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Search by teacher, subject, class..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8 w-full rounded-md border-input bg-background shadow-sm focus:ring-primary focus:border-primary p-2 text-sm"
							/>
						</div>
						{academicYearOptions.length > 1 && (
							<select
								value={selectedAcademicYear}
								onChange={(e) => setSelectedAcademicYear(e.target.value)}
								className="w-full sm:w-auto rounded-md border-input bg-background shadow-sm focus:ring-primary focus:border-primary p-2 text-sm"
							>
								{academicYearOptions.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						)}
						<select
							value={filters.status}
							onChange={(e) =>
								setFilters((f) => ({
									...f,
									status: e.target.value,
									teacher: '',
								}))
							}
							className="w-full sm:w-auto rounded-md border-input bg-background shadow-sm focus:ring-primary focus:border-primary p-2 text-sm"
						>
							<option value="All">All Statuses</option>
							<option value="Pending">Pending</option>
							<option value="Partially Approved">Partially Approved</option>
							<option value="Rejected">Rejected</option>
							<option value="Approved">Approved</option>
						</select>
						<select
							value={filters.classId}
							onChange={(e) =>
								setFilters((f) => ({ ...f, classId: e.target.value }))
							}
							className="w-full sm:w-auto rounded-md border-input bg-background shadow-sm focus:ring-primary focus:border-primary p-2 text-sm"
						>
							<option value="">All Classes</option>
							{getUniqueClasses().map((cls) => (
								<option key={cls.classId} value={cls.classId}>
									{cls.name}
								</option>
							))}
						</select>
						<select
							value={filters.subject}
							onChange={(e) =>
								setFilters((f) => ({ ...f, subject: e.target.value }))
							}
							className="w-full sm:w-auto rounded-md border-input bg-background shadow-sm focus:ring-primary focus:border-primary p-2 text-sm"
						>
							<option value="">All Subjects</option>
							{getUniqueSubjects().map((subject) => (
								<option key={subject} value={subject}>
									{subject}
								</option>
							))}
						</select>
						<select
							value={filters.period}
							onChange={(e) =>
								setFilters((f) => ({ ...f, period: e.target.value }))
							}
							className="w-full sm:w-auto rounded-md border-input bg-background shadow-sm focus:ring-primary focus:border-primary p-2 text-sm"
						>
							<option value="">All Periods</option>
							{periods.map((period) => (
								<option key={period.value} value={period.value}>
									{period.label}
								</option>
							))}
						</select>
						<div className="flex items-center space-x-2">
							<span className="text-sm text-muted-foreground">Rows:</span>
							<select
								value={rowsPerPage}
								onChange={(e) => {
									setRowsPerPage(Number(e.target.value));
									setCurrentPage(1);
								}}
								className="w-[80px] rounded-md border-input bg-background p-2 text-sm"
							>
								<option value="5">5</option>
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
							</select>
						</div>
					</div>
				</div>

				{/* Bulk Actions Bar */}
				{selectedSubmissions.size > 0 && (
					<div className="bg-primary/10 border-t border-primary/20 p-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<span className="text-sm font-medium text-primary">
								{selectedSubmissions.size} submission(s) selected
							</span>
							<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
								<button
									onClick={handleBulkApprove}
									disabled={isProcessing}
									className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1 sm:w-auto"
								>
									{isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
									<Check className="h-3 w-3" /> Approve All Pending
								</button>
								<button
									onClick={() => setShowBulkRejectModal(true)}
									className="w-full px-3 py-2 bg-destructive text-destructive-foreground text-sm rounded-md hover:bg-destructive/90 flex items-center justify-center gap-1 sm:w-auto"
								>
									<XCircle className="h-3 w-3" /> Reject All Pending
								</button>
								<button
									onClick={() => setSelectedSubmissions(new Set())}
									className="w-full px-3 py-2 bg-secondary text-secondary-foreground text-sm rounded-md hover:bg-secondary/80 sm:w-auto"
								>
									Clear Selection
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Main Submissions Table
				    Full-table spinner only when loading AND there is nothing to show.
				    During a cursor-aware refresh (isSyncing), the table stays visible
				    and only the button reflects the in-progress state. */}
				<div className="border-t">
					{loading && submissions.length === 0 ? (
						<PageLoading fullScreen={false} />
					) : error ? (
						<div className="p-6 text-center text-destructive">
							{!isOnline ? (
								<div className="flex flex-col items-center gap-2 text-muted-foreground">
									<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
										<WifiOff className="h-6 w-6" />
									</div>
									<p className="text-sm">You&apos;re offline.</p>
								</div>
							) : (
								error
							)}
						</div>
					) : filteredAndSortedSubmissions.length === 0 ? (
						<div className="p-6 text-center text-muted-foreground">
							No grade submissions found.
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-border">
									<thead className="bg-muted/50">
										<tr>
											<th className="p-3 text-left">
												<input
													type="checkbox"
													onChange={(e) =>
														toggleAllSubmissions(e.target.checked)
													}
													checked={
														filteredAndSortedSubmissions.filter((s) =>
															['Pending', 'Partially Approved'].includes(
																s.status,
															),
														).length > 0 &&
														selectedSubmissions.size ===
															filteredAndSortedSubmissions.filter((s) =>
																['Pending', 'Partially Approved'].includes(
																	s.status,
																),
															).length
													}
													className="rounded border-input"
												/>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Teacher
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Subject
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Class
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Period
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Status
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Last Updated
											</th>
											<th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{currentSlice.map((submission) => (
											<tr key={submission.submissionId}>
												<td className="p-3">
													<input
														type="checkbox"
														checked={selectedSubmissions.has(
															submission.submissionId,
														)}
														onChange={() =>
															toggleSubmissionSelection(submission.submissionId)
														}
														disabled={
															!['Pending', 'Partially Approved'].includes(
																submission.status,
															)
														}
														className="rounded border-input disabled:opacity-50"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
													{submission.teacherName}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{submission.subject}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{classMap.get(submission.classId) ||
														submission.classId}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{
														periods.find((p) => p.value === submission.period)
															?.label
													}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm">
													<span
														className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
															submission.status,
														)}`}
													>
														{getStatusIcon(submission.status)}{' '}
														{submission.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{formatDate(submission.lastUpdated)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<button
														onClick={() => {
															setSelectedSubmission(submission);
															setShowDetailsModal(true);
															setSelectedStudents(new Set());
														}}
														className="text-primary hover:underline flex items-center gap-1"
													>
														<Eye className="h-4 w-4" /> View
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-sm text-muted-foreground">
									Showing{' '}
									<strong>{(currentPageSafe - 1) * rowsPerPage + 1}</strong>–
									<strong>
										{Math.min(
											currentPageSafe * rowsPerPage,
											filteredAndSortedSubmissions.length,
										)}
									</strong>{' '}
									of <strong>{filteredAndSortedSubmissions.length}</strong>{' '}
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

			{/* Modals */}
			{showDetailsModal && renderDetailsModal()}
			{showRejectModal && renderRejectModal()}
			{showBulkRejectModal && renderBulkRejectModal()}
		</div>
	);
};;

export default AdminGradeManagement;
