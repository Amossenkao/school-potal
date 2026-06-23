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
	ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { PageLoading } from '@/components/loading';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	getTeacherAcademicYears,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';
import { lockBodyScroll } from '@/utils/scrollLock';

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
	subjects: {
		year: string;
		classes: { classId: string; subjects: string[] }[];
	}[];
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

interface ConfirmationModalState {
	isOpen: boolean;
	reason: string;
	isError?: boolean;
	errorMessage?: string;
}

interface RawSubmittedGrade {
	submissionId: string;
	studentId: string;
	grade: number | null;
	status: 'Approved' | 'Rejected' | 'Pending';
	lastUpdated?: string;
}

interface GradeRequestBatchRequest {
	_id: string;
	requestId?: string;
	studentId: string;
	studentName: string;
	originalGrade: number | null;
	requestedGrade: number;
	reasonForChange: string;
	status: 'Pending' | 'Approved' | 'Rejected';
	adminRejectionReason?: string;
	[key: string]: any;
}

interface GradeRequestBatchEntry {
	batchId: string;
	subject: string;
	classId: string;
	period: string;
	submittedAt: string;
	lastUpdated?: string;
	academicYear?: string;
	teacherUsername?: string;
	teacherName?: string;
	status: 'Pending' | 'Approved' | 'Rejected' | 'Partially Approved';
	requests: GradeRequestBatchRequest[];
	stats?: { totalRequests: number };
	[key: string]: any;
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
const PASS_MARK = 70;
const PASS_GRADE_CLASS = 'text-[var(--grade-pass)] font-semibold';
const FAIL_GRADE_CLASS = 'text-[var(--grade-fail)] font-semibold';

const TeacherGradeSubmissions = () => {
	const school = useSchoolStore((state) => state.school);
	const setGradesForYear = useSchoolStore((state) => state.setGradesForYear);
	const setGradeRequestsForYear = useSchoolStore(
		(state) => state.setGradeRequestsForYear,
	);
	const { user } = useAuth();
	const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
	const [submittedGrades, setSubmittedGrades] = useState<GradeSubmission[]>([]);
	const [academicYear, setAcademicYear] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	const [loading, setLoading] = useState({
		teacherInfo: true,
		// true only on initial load when there is nothing to show yet
		submittedGrades: false,
	});
	// true during cursor-aware refresh; table stays visible
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState({
		teacherInfo: '',
		submittedGrades: '',
	});

	// Subscribe to store so realtime / background-sync updates flow in
	// automatically without triggering a full re-fetch.
	const scopedGrades = useSchoolStore(
		(state) =>
			getScopedAcademicYearValue(state.gradesByAcademicYear, academicYear)
				.value,
	);

	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [selectedGrade, setSelectedGrade] = useState<GradeSubmission | null>(
		null,
	);
	const [gradeChangeStudents, setGradeChangeStudents] = useState<
		GradeChangeRequestStudent[]
	>([]);
	const [activeModalStudentId, setActiveModalStudentId] = useState<
		string | null
	>(null);
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
	const isAnyModalOpen =
		showDetailsModal || confirmationModal.isOpen || resultModalOpen;

	useEffect(() => {
		if (!resultModalOpen) return;
		const timer = setTimeout(() => {
			setResultModalOpen(false);
			setNotification(null);
		}, 9000);
		return () => clearTimeout(timer);
	}, [resultModalOpen, notification]);

	useEffect(() => {
		if (!isAnyModalOpen) return;
		return lockBodyScroll();
	}, [isAnyModalOpen]);

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

	const teacherYears = useMemo(
		() => getTeacherAcademicYears(teacherInfo),
		[teacherInfo],
	);

	const availableAcademicYears = useMemo(() => {
		return teacherYears;
	}, [teacherYears]);

	const allowedAcademicYears = useMemo(
		() =>
			sortAcademicYearsDesc(
				school?.settings?.teacherSettings
					?.viewTeacherGradeSubmissionsAcademicYears || [],
			),
		[school],
	);

	const isSelectedAcademicYearAllowed = useMemo(() => {
		if (!academicYear) return false;
		return allowedAcademicYears.some((year) =>
			areAcademicYearsEqual(year, academicYear),
		);
	}, [academicYear, allowedAcademicYears]);

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
				submissionsMap.values(),
			).map((submission: any) => {
				const gradeValues = submission.grades.map((g: any) => g.grade);
				const validGrades = gradeValues.filter(
					(g: number) => g !== null && g !== undefined,
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
					new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
			);

			setSubmittedGrades(processedSubmissions);
		},
		[teacherInfo?.username],
	);

	// Initial load — shows full-table spinner only when there is nothing to
	// display yet. Reads from store first; only fetches from API when the store
	// has no snapshot for this year.
	const loadSubmittedGrades = useCallback(async () => {
		if (!teacherInfo || !academicYear || !isSelectedAcademicYearAllowed) {
			setSubmittedGrades([]);
			setError((prev) => ({ ...prev, submittedGrades: '' }));
			setLoading((prev) => ({ ...prev, submittedGrades: false }));
			return;
		}

		const schoolState = useSchoolStore.getState();
		const scopedStoreSnapshot = getScopedAcademicYearValue(
			schoolState.gradesByAcademicYear || {},
			academicYear,
		);
		const hasYearSnapshot = Boolean(scopedStoreSnapshot.key);
		const cachedGrades = Array.isArray(scopedStoreSnapshot.value)
			? scopedStoreSnapshot.value
			: [];

		// Store already has data for this year — no network call needed.
		if (hasYearSnapshot) {
			processSubmittedGrades(cachedGrades);
			setError((prev) => ({ ...prev, submittedGrades: '' }));
			setLoading((prev) => ({ ...prev, submittedGrades: false }));
			return;
		}

		// Only block the table with a spinner when there is nothing to show yet.
		if (submittedGrades.length === 0) {
			setLoading((prev) => ({ ...prev, submittedGrades: true }));
		}

		try {
			setError((prev) => ({ ...prev, submittedGrades: '' }));
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

			setGradesForYear(academicYear, grades);
			processSubmittedGrades(grades);
			setError((prev) => ({ ...prev, submittedGrades: '' }));
		} catch (err) {
			console.error('Error fetching submitted grades:', err);
			if (submittedGrades.length === 0) {
				setError((prev) => ({
					...prev,
					submittedGrades: 'Failed to load submitted grades.',
				}));
			}
		} finally {
			setLoading((prev) => ({ ...prev, submittedGrades: false }));
		}
	}, [
		academicYear,
		teacherInfo,
		processSubmittedGrades,
		setGradesForYear,
		isSelectedAcademicYearAllowed,
		submittedGrades.length,
	]);

	// Cursor-aware refresh — resumes the background sync from the watermark
	// cursor so only grades newer than what the store already has are fetched.
	// The table stays fully visible; only the button reflects the syncing state.
	const handleRefresh = useCallback(async () => {
		if (!academicYear || !isSelectedAcademicYearAllowed || isSyncing) return;
		setIsSyncing(true);

		try {
			const CURSOR_KEY = `sync_cursor_grades_${academicYear}`;
			const hasCursor = Boolean(localStorage.getItem(CURSOR_KEY));

			if (hasCursor) {
				// Resume background sync from the watermark cursor.
				// Each chunk calls mergeGradesForYear, which triggers the
				// scopedGrades selector below and re-renders the table
				// progressively as new records arrive.
				await useSchoolStore.getState().runBackgroundGradeSync(academicYear);
			} else {
				// No cursor — re-derive from the current store state in case
				// something changed via a realtime event.
				const schoolState = useSchoolStore.getState();
				const scopedStoreSnapshot = getScopedAcademicYearValue(
					schoolState.gradesByAcademicYear || {},
					academicYear,
				);
				const storeGrades = Array.isArray(scopedStoreSnapshot.value)
					? scopedStoreSnapshot.value
					: [];
				processSubmittedGrades(storeGrades);
			}
		} catch (err) {
			console.error('Error refreshing grades:', err);
		} finally {
			setIsSyncing(false);
		}
	}, [
		academicYear,
		isSelectedAcademicYearAllowed,
		isSyncing,
		processSubmittedGrades,
	]);

	// Triggered on academic-year context change; store updates flow in via
	// the scopedGrades effect below and should not retrigger this.
	useEffect(() => {
		void loadSubmittedGrades();
	}, [academicYear, teacherInfo, isSelectedAcademicYearAllowed]);

	// When the store's gradesByAcademicYear is updated (by the background sync,
	// realtime events, or applyLocalSubmittedGradeUpdates) re-derive the table
	// without touching the loading state.
	useEffect(() => {
		if (!Array.isArray(scopedGrades)) return;
		processSubmittedGrades(scopedGrades);
	}, [scopedGrades]);

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

	const yearAssignment = useMemo(() => {
		return (teacherInfo?.subjects || []).find((entry) =>
			areAcademicYearsEqual(entry.year, academicYear),
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
			.filter((c) => {
				if (filters.session && c.session !== filters.session) return false;
				if (filters.gradeLevel && c.level !== filters.gradeLevel) return false;
				if (filters.classId && c.classId !== filters.classId) return false;
				return true;
			})
			.map((c) => c.classId);

		const subjectSet = new Set<string>();
		(yearAssignment?.classes || []).forEach((c) => {
			if (classIds.includes(c.classId)) {
				(c.subjects || []).forEach((s) => subjectSet.add(s));
			}
		});
		return Array.from(subjectSet);
	}, [
		assignedClasses,
		yearAssignment,
		filters.session,
		filters.gradeLevel,
		filters.classId,
	]);

	const availableLevels = useMemo(() => {
		const classIds = assignedClasses
			.filter((c) => !filters.session || c.session === filters.session)
			.filter((c) => {
				if (!filters.subject) return true;
				const classData = yearAssignment?.classes?.find(
					(entry) => entry.classId === c.classId,
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
					(entry) => entry.classId === c.classId,
				);
				return classData?.subjects?.includes(filters.subject);
			}
			return true;
		});
	}, [
		assignedClasses,
		filters.session,
		filters.gradeLevel,
		filters.subject,
		yearAssignment,
	]);

	const hasNoClasses = assignedClasses.length === 0;
	const showAcademicYearFilter = availableAcademicYears.length > 1;
	const showSessionFilter = !hasNoClasses && availableSessions.length > 1;
	const showLevelFilter = !hasNoClasses && availableLevels.length > 1;
	const showClassFilter = !hasNoClasses && availableClasses.length > 0;
	const showSubjectFilter = !hasNoClasses && availableSubjects.length > 0;
	const showPeriodFilter = !hasNoClasses && periods.length > 0;
	const canAccessSelectedAcademicYear =
		Boolean(academicYear) && isSelectedAcademicYearAllowed;

	const showNotification = (
		type: 'success' | 'error' | 'info',
		message: string,
	) => {
		setNotification({ type, message });
		setResultModalOpen(true);
	};

	const deriveSubmissionStatus = (
		submission: GradeSubmission,
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

	const calculateSubmissionStats = (
		grades: Array<{ grade: number | null }>,
	): GradeSubmission['stats'] => {
		const validGrades = grades
			.map((entry) => entry.grade)
			.filter((grade): grade is number => grade !== null);
		const totalStudents = grades.length;
		const passes = validGrades.filter((grade) => grade >= PASS_MARK).length;
		const fails = validGrades.length - passes;
		const incompletes = totalStudents - validGrades.length;
		const average =
			validGrades.length > 0
				? validGrades.reduce((sum, grade) => sum + grade, 0) /
					validGrades.length
				: 0;

		return {
			totalStudents,
			passes,
			fails,
			incompletes,
			average: parseFloat(average.toFixed(1)),
		};
	};

	const deriveBatchStatus = (
		requests: GradeRequestBatchRequest[],
	): GradeRequestBatchEntry['status'] => {
		const statuses = new Set(requests.map((request) => request.status));
		if (statuses.size === 1) {
			return statuses.values().next().value as GradeRequestBatchEntry['status'];
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

	const applyLocalSubmittedGradeUpdates = (
		updatedGrades: RawSubmittedGrade[],
	) => {
		if (!teacherInfo?.username || !academicYear || updatedGrades.length === 0) {
			return;
		}

		const updateMap = new Map<string, RawSubmittedGrade>();
		updatedGrades.forEach((grade) => {
			if (!grade?.submissionId || !grade?.studentId) return;
			updateMap.set(`${grade.submissionId}:${grade.studentId}`, grade);
		});
		if (updateMap.size === 0) return;

		const nowIso = new Date().toISOString();
		setSubmittedGrades((previous) =>
			previous.map((submission) => {
				let changed = false;
				const nextGrades = submission.grades.map((student) => {
					const updated = updateMap.get(
						`${submission.submissionId}:${student.studentId}`,
					);
					if (!updated) return student;
					changed = true;
					return {
						...student,
						grade:
							typeof updated.grade === 'number' || updated.grade === null
								? updated.grade
								: student.grade,
						status:
							updated.status === 'Approved' ||
							updated.status === 'Rejected' ||
							updated.status === 'Pending'
								? updated.status
								: student.status,
					};
				});

				if (!changed) return submission;

				const nextSubmission = {
					...submission,
					grades: nextGrades,
					lastUpdated: nowIso,
				};

				return {
					...nextSubmission,
					status: deriveSubmissionStatus(nextSubmission),
					stats: calculateSubmissionStats(nextGrades),
				};
			}),
		);

		const schoolState = useSchoolStore.getState();
		const scopedStoreSnapshot = getScopedAcademicYearValue(
			schoolState.gradesByAcademicYear || {},
			academicYear,
		);
		const sourceGrades = Array.isArray(scopedStoreSnapshot.value)
			? (scopedStoreSnapshot.value as RawSubmittedGrade[])
			: [];
		if (!Array.isArray(sourceGrades) || sourceGrades.length === 0) return;

		const nextRawGrades = sourceGrades.map((grade) => {
			const updated = updateMap.get(`${grade.submissionId}:${grade.studentId}`);
			if (!updated) return grade;
			return {
				...grade,
				grade:
					typeof updated.grade === 'number' || updated.grade === null
						? updated.grade
						: grade.grade,
				status:
					updated.status === 'Approved' ||
					updated.status === 'Rejected' ||
					updated.status === 'Pending'
						? updated.status
						: grade.status,
				lastUpdated: updated.lastUpdated || nowIso,
			};
		});

		setGradesForYear(academicYear, nextRawGrades);
	};

	const syncCreatedGradeRequestsLocally = (createdRequests: any[]) => {
		if (
			!teacherInfo?.username ||
			!academicYear ||
			createdRequests.length === 0
		) {
			return;
		}

		const requestCacheKey = `gradeRequests:${academicYear}:${teacherInfo.username}`;
		const schoolState = useSchoolStore.getState();
		const scopedStoreSnapshot = getScopedAcademicYearValue(
			schoolState.gradeRequestsByAcademicYear || {},
			academicYear,
		);
		const sourceBatches = Array.isArray(scopedStoreSnapshot.value)
			? (scopedStoreSnapshot.value as GradeRequestBatchEntry[])
			: getClientCache<GradeRequestBatchEntry[]>(requestCacheKey) || [];

		const batchesById = new Map<string, GradeRequestBatchEntry>();
		sourceBatches.forEach((batch) => {
			const batchId = String(batch?.batchId || '');
			if (!batchId) return;
			batchesById.set(batchId, {
				...batch,
				batchId,
				requests: Array.isArray(batch?.requests) ? batch.requests : [],
			});
		});

		const nowIso = new Date().toISOString();
		createdRequests.forEach((request, index) => {
			const batchId = String(request?.batchId || `batch-${index + 1}`);
			const requestIdValue = request?._id || request?.requestId || request?.id;
			const requestId = String(
				requestIdValue || `${batchId}-${request?.studentId || index + 1}`,
			);
			const normalizedStatus =
				request?.status === 'Approved' || request?.status === 'Rejected'
					? request.status
					: 'Pending';
			const normalizedRequest: GradeRequestBatchRequest = {
				...request,
				_id: requestId,
				requestId,
				batchId,
				studentId: String(request?.studentId || ''),
				studentName: String(
					request?.studentName || request?.name || 'Unknown Student',
				),
				originalGrade:
					typeof request?.originalGrade === 'number' ||
					request?.originalGrade === null
						? request.originalGrade
						: null,
				requestedGrade:
					typeof request?.requestedGrade === 'number'
						? request.requestedGrade
						: Number(request?.requestedGrade || 0),
				reasonForChange: String(
					request?.reasonForChange || request?.reason || '',
				),
				status: normalizedStatus,
			};

			const existingBatch = batchesById.get(batchId);
			if (!existingBatch) {
				const nextBatch: GradeRequestBatchEntry = {
					batchId,
					academicYear: String(request?.academicYear || academicYear),
					period: String(request?.period || selectedGrade?.period || ''),
					classId: String(request?.classId || selectedGrade?.gradeLevel || ''),
					subject: String(request?.subject || selectedGrade?.subject || ''),
					teacherUsername: String(
						request?.teacherUsername || teacherInfo.username,
					),
					teacherName: String(request?.teacherName || teacherInfo.name || ''),
					submittedAt: String(request?.submittedAt || nowIso),
					lastUpdated: String(
						request?.lastUpdated || request?.submittedAt || nowIso,
					),
					status: 'Pending',
					requests: [normalizedRequest],
					stats: { totalRequests: 1 },
				};
				batchesById.set(batchId, nextBatch);
				return;
			}

			const existingIndex = existingBatch.requests.findIndex((entry) => {
				const entryId = String(entry?.requestId || entry?._id || '');
				return entryId === requestId;
			});
			if (existingIndex >= 0) {
				existingBatch.requests[existingIndex] = {
					...existingBatch.requests[existingIndex],
					...normalizedRequest,
				};
			} else {
				existingBatch.requests = [normalizedRequest, ...existingBatch.requests];
			}
			existingBatch.status = deriveBatchStatus(existingBatch.requests);
			existingBatch.lastUpdated = String(
				request?.lastUpdated || request?.submittedAt || nowIso,
			);
			existingBatch.stats = { totalRequests: existingBatch.requests.length };
		});

		const nextBatches = Array.from(batchesById.values()).sort((a, b) => {
			const aDate = new Date(a.lastUpdated || a.submittedAt).getTime();
			const bDate = new Date(b.lastUpdated || b.submittedAt).getTime();
			return bDate - aDate;
		});

		setGradeRequestsForYear(academicYear, nextBatches);
		setClientCache(requestCacheKey, nextBatches);
		window.dispatchEvent(
			new CustomEvent('grading:requests:updated', {
				detail: { academicYear, teacherUsername: teacherInfo.username },
			}),
		);
	};

	const getModalGradeColor = (grade: number | null) => {
		if (grade === null || grade === undefined) return 'text-muted-foreground';
		if (grade >= PASS_MARK) return PASS_GRADE_CLASS;
		return FAIL_GRADE_CLASS;
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
		status: 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved',
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
		status: 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved',
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
					}),
				)
				.map((g) => ({
					studentId: g.studentId,
					name: g.name,
					currentGrade: g.grade,
					newGrade: '',
					selected: false,
					status: g.status,
				})),
		);
		setShowDetailsModal(true);
		setConfirmationModal({
			isOpen: false,
			reason: '',
			isError: false,
			errorMessage: '',
		});
	};

	const handleOpenConfirmationModal = () => {
		const changes = gradeChangeStudents.filter(
			(s) =>
				s.selected && s.newGrade.trim() !== '' && !isNaN(Number(s.newGrade)),
		);

		if (changes.length === 0) {
			showNotification(
				'info',
				'Please select at least one student and provide a valid new grade.',
			);
			return;
		}

		const hasApprovedChange = changes.some((s) => s.status === 'Approved');

		if (hasApprovedChange && selectedGrade) {
			const periodValue = selectedGrade.period;
			const allowedPeriods =
				school?.settings?.teacherSettings?.gradeChangeRequestPeriods || [];
			const isRequestAllowed = allowedPeriods.includes(periodValue);

			if (!isRequestAllowed) {
				setConfirmationModal({
					isOpen: true,
					reason: '',
					isError: true,
					errorMessage: `Grade change requests for approved grades are not currently allowed for ${
						periods.find((p) => p.value === periodValue)?.label || 'this period'
					}. Please contact an administrator.`,
				});
				return;
			}
		}

		if (hasApprovedChange) {
			setConfirmationModal({
				isOpen: true,
				reason: '',
				isError: false,
				errorMessage: '',
			});
		} else {
			handleFinalSubmit();
		}
	};

	const handleFinalSubmit = async () => {
		if (!selectedGrade) return;

		if (confirmationModal.isError) {
			setConfirmationModal({
				isOpen: false,
				reason: '',
				isError: false,
				errorMessage: '',
			});
			showNotification(
				'error',
				confirmationModal.errorMessage ||
					'Cannot submit request due to school settings error.',
			);
			return;
		}

		const changes = gradeChangeStudents
			.filter(
				(s) =>
					s.selected && s.newGrade.trim() !== '' && !isNaN(Number(s.newGrade)),
			)
			.map((s) => ({
				studentId: s.studentId,
				name: s.name,
				originalGrade: s.currentGrade,
				requestedGrade: Number(s.newGrade),
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
				c.requestedGrade > 100,
		);
		if (invalidChanges.length > 0) {
			showNotification(
				'error',
				'Grades must be between 60 and 100 before submitting.',
			);
			return;
		}

		const requiresReason = changes.some((c) => {
			const student = gradeChangeStudents.find(
				(s) => s.studentId === c.studentId,
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
				'A reason is required for changing approved grades.',
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
					result.message || 'Failed to submit grade change request.',
				);
			}

			if (result?.queued) {
				showNotification(
					'info',
					'You are offline. Grade change requests were queued and will sync when you reconnect.',
				);
				setShowDetailsModal(false);
				return;
			}

			if (result.success) {
				const createdRequests = Array.isArray(result?.data?.createdRequests)
					? result.data.createdRequests
					: [];
				const updatedGrades = Array.isArray(result?.data?.updatedGrades)
					? (result.data.updatedGrades as RawSubmittedGrade[])
					: [];
				if (createdRequests.length === 0 && updatedGrades.length === 0) {
					showNotification(
						'info',
						'No new requests were created. This may be because a pending request already exists for the selected grades.',
					);
				} else {
					showNotification('success', result.message);
				}
				if (updatedGrades.length > 0) {
					applyLocalSubmittedGradeUpdates(updatedGrades);
				}
				if (createdRequests.length > 0) {
					syncCreatedGradeRequestsLocally(createdRequests);
				}
				window.dispatchEvent(new CustomEvent('grading:counts:refresh'));
			} else {
				throw new Error(result.message || 'An unknown error occurred.');
			}

			setShowDetailsModal(false);
			// After a successful grade-change submission, trigger a background
			// sync so the table reflects the latest server state without a full
			// blocking re-fetch.
			void handleRefresh();
		} catch (err: any) {
			showNotification('error', `Error: ${err.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		setLoading((prev) => ({ ...prev, teacherInfo: true }));
		try {
			if (user && user.role === 'teacher') {
				setTeacherInfo(user as unknown as TeacherInfo);
			}
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
	}, [user]);

	useEffect(() => {
		if (!teacherInfo) return;
		const defaultAcademicYear =
			pickMostRecentAcademicYear(availableAcademicYears) || '';
		const selectedIsAvailable = availableAcademicYears.some((year) =>
			areAcademicYearsEqual(year, academicYear),
		);
		if (!academicYear || !selectedIsAvailable) {
			setAcademicYear(defaultAcademicYear);
		}
	}, [teacherInfo, availableAcademicYears, academicYear]);

	const handleGradeInputChange = (studentId: string, newGrade: string) => {
		if (
			newGrade !== '' &&
			(isNaN(Number(newGrade)) || !/^\d*\.?\d*$/.test(newGrade))
		) {
			return;
		}
		setGradeChangeStudents((prev) =>
			prev.map((s) =>
				s.studentId === studentId
					? { ...s, newGrade, selected: newGrade !== '' ? true : s.selected }
					: s,
			),
		);
	};

	const handleGradeInputKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
	) => {
		const { key } = event;

		if (
			!['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
				key,
			)
		)
			return;

		const currentInput = event.currentTarget;
		const inputs = Array.from(
			document.querySelectorAll<HTMLInputElement>(
				'[data-grade-change-input="true"]:not(:disabled)',
			),
		);
		const currentIndex = inputs.indexOf(currentInput);
		if (currentIndex === -1 || inputs.length <= 1) return;

		let nextInput: HTMLInputElement | undefined;

		if (key === 'Enter' || key === 'ArrowRight' || key === 'ArrowDown') {
			nextInput = inputs[currentIndex + 1] || inputs[0];
		} else if (key === 'ArrowLeft' || key === 'ArrowUp') {
			nextInput = inputs[currentIndex - 1] || inputs[inputs.length - 1];
		}

		if (nextInput) {
			event.preventDefault();
			nextInput.focus({ preventScroll: true });
			nextInput.select();
			nextInput.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	};

	const renderResultModal = () => {
		if (!notification || !resultModalOpen) return null;
		const tone =
			notification.type === 'success'
				? {
						accent: 'bg-emerald-500',
						border: 'border-emerald-200 dark:border-emerald-800',
						iconWrap:
							'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
						title: 'Success',
						icon: CheckCircle,
					}
				: notification.type === 'error'
					? {
							accent: 'bg-destructive',
							border: 'border-destructive/30',
							iconWrap: 'bg-destructive/10 text-destructive',
							title: 'Something went wrong',
							icon: XCircle,
						}
					: {
							accent: 'bg-amber-500',
							border: 'border-amber-200 dark:border-amber-800',
							iconWrap:
								'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
							title: 'Heads up',
							icon: Info,
						};
		const Icon = tone.icon;
		return (
			<div className="fixed inset-0 z-[1000] bg-black/35 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain">
				<div className="flex min-h-full items-center justify-center">
					<div
						className={`relative bg-card rounded-xl border ${tone.border} shadow-2xl w-full max-w-md overflow-hidden`}
						role="status"
						aria-live="polite"
					>
						<div className={`h-1.5 w-full ${tone.accent}`} />
						<button
							type="button"
							onClick={() => {
								setResultModalOpen(false);
								setNotification(null);
							}}
							className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							aria-label="Close notification"
						>
							<X className="h-4 w-4" />
						</button>
						<div className="p-6 pr-12">
							<div className="flex items-start gap-4">
								<div
									className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}
								>
									<Icon className="h-5 w-5" />
								</div>
								<div className="min-w-0">
									<p className="text-base font-semibold text-foreground">
										{tone.title}
									</p>
									<p className="mt-1 text-sm leading-6 text-muted-foreground">
										{notification.message}
									</p>
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-6 py-3">
							<p className="text-xs text-muted-foreground">
								This message will close automatically.
							</p>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									setResultModalOpen(false);
									setNotification(null);
								}}
							>
								Dismiss
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	};

	const filteredAndSortedGrades = useMemo(
		() => applySorting(applyFilters(submittedGrades)),
		[submittedGrades, filters, sortConfig, availableClasses],
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [filters, sortConfig, rowsPerPage, submittedGrades]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredAndSortedGrades.length / rowsPerPage),
	);
	const currentPageSafe = Math.min(currentPage, totalPages);
	const currentSlice = filteredAndSortedGrades.slice(
		(currentPageSafe - 1) * rowsPerPage,
		currentPageSafe * rowsPerPage,
	);

	const renderConfirmationErrorModal = () => {
		if (!confirmationModal.isOpen) return null;

		if (confirmationModal.isError) {
			return (
				<div className="fixed inset-0 z-[1000] bg-black/25 backdrop-blur-[1px] p-4 overflow-y-auto overscroll-contain">
					<div className="flex min-h-full items-center justify-center">
						<div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain border border-destructive/50">
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
				</div>
			);
		}

		return (
			<div className="fixed inset-0 z-[1000] bg-black/25 backdrop-blur-[1px] p-4 overflow-y-auto overscroll-contain">
				<div className="flex min-h-full items-center justify-center">
					<div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain border">
						<h3 className="text-lg font-semibold mb-2">
							Reason for Grade Change Request
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							You are editing one or more <strong>approved grades</strong>.
							Please provide a reason for this change. This will be sent for
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
			</div>
		);
	};

	const renderDetailsModal = () =>
		selectedGrade && (
			<div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px] p-4 overflow-y-auto overscroll-contain">
				<div className="flex min-h-full items-center justify-center">
					<div className="bg-background rounded-lg border shadow-xl w-full max-w-5xl max-h-[calc(100dvh-2rem)] flex flex-col">
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

						{renderConfirmationErrorModal()}

						<div className="p-6 overflow-y-auto overscroll-contain flex-grow">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-border">
									<thead className="bg-muted/50">
										<tr>
											<th className="p-3 text-left">
												<input
													type="checkbox"
													tabIndex={-1}
													onChange={(e) =>
														setGradeChangeStudents((prev) =>
															prev.map((s) => ({
																...s,
																selected: e.target.checked,
															})),
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
										{gradeChangeStudents.map((student) => {
											const isActive =
												activeModalStudentId === student.studentId;
											return (
												<tr
													key={student.studentId}
													className={`${student.selected ? 'bg-primary/5' : ''} hover:bg-muted/30 transition-colors`}
												>
													<td className="p-3">
														<input
															type="checkbox"
															tabIndex={-1}
															checked={student.selected}
															onChange={() =>
																setGradeChangeStudents((prev) =>
																	prev.map((s) =>
																		s.studentId === student.studentId
																			? { ...s, selected: !s.selected }
																			: s,
																	),
																)
															}
															className="rounded border-border accent-primary"
														/>
													</td>
													<td
														className={`px-6 py-4 whitespace-nowrap transition-colors ${isActive ? 'bg-primary' : ''}`}
													>
														<span
															className={`text-sm font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}
														>
															{student.name}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-center">
														<span
															className={getModalGradeColor(
																student.currentGrade,
															)}
														>
															{student.currentGrade ?? 'N/A'}
														</span>
													</td>
													<td className="px-6 py-4">
														{(() => {
															const validation = getGradeValidationStatus(
																student.newGrade,
															);
															const isInvalid =
																!validation.isValid && student.newGrade !== '';
															return (
																<div className="flex flex-col items-center gap-1">
																	<input
																		type="text"
																		value={student.newGrade}
																		data-grade-change-input="true"
																		onChange={(e) =>
																			handleGradeInputChange(
																				student.studentId,
																				e.target.value,
																			)
																		}
																		onFocus={() =>
																			setActiveModalStudentId(student.studentId)
																		}
																		onBlur={() => setActiveModalStudentId(null)}
																		onKeyDown={handleGradeInputKeyDown}
																		disabled={!student.selected}
																		className={`w-20 h-10 rounded-lg border-2 text-center text-base font-semibold focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${getModalGradeColor(
																			student.newGrade === ''
																				? null
																				: Number(student.newGrade),
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
																student.status,
															)}`}
														>
															{getStatusIcon(student.status)}
														</span>
													</td>
												</tr>
											);
										})}
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
		<div className="min-h-screen bg-background p-4 sm:p-6">
			<div className="w-full">
				<div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<BarChart3 className="h-6 w-6 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								Grade Submissions
							</h1>
							<p className="text-sm text-muted-foreground">
								Track and manage your submitted grades
							</p>
						</div>
					</div>
					<Button
						onClick={() => (window.location.href = '/dashboard/submit-grades')}
						className="flex items-center gap-2"
					>
						<Plus className="h-4 w-4" />
						Submit New Grades
					</Button>
				</div>

				{renderResultModal()}

				<div className="space-y-6">
					{/* Compact Filter Toolbar */}
					{(showAcademicYearFilter || !hasNoClasses) && (
						<div className="bg-card border border-border rounded-xl shadow-sm">
							<div className="flex flex-wrap gap-2 p-2.5 sm:p-3 items-end">
								{showAcademicYearFilter && (
									<FilterSelect
										label="Year"
										value={academicYear}
										onChange={(v) => setAcademicYear(v)}
										options={availableAcademicYears.map((y) => ({
											label: y,
											value: y,
										}))}
									/>
								)}

								{canAccessSelectedAcademicYear && showSessionFilter && (
									<FilterSelect
										label="Session"
										value={filters.session}
										onChange={(v) =>
											setFilters({
												...filters,
												session: v,
												gradeLevel: '',
												classId: '',
											})
										}
										placeholder="All Sessions"
										options={availableSessions.map((s) => ({
											label: s,
											value: s,
										}))}
									/>
								)}

								{canAccessSelectedAcademicYear && showLevelFilter && (
									<FilterSelect
										label="Level"
										value={filters.gradeLevel}
										onChange={(v) =>
											setFilters({ ...filters, gradeLevel: v, classId: '' })
										}
										placeholder="All Levels"
										options={availableLevels.map((l) => ({
											label: l,
											value: l,
										}))}
									/>
								)}

								{canAccessSelectedAcademicYear && showClassFilter && (
									<FilterSelect
										label="Class"
										value={filters.classId}
										onChange={(v) => setFilters({ ...filters, classId: v })}
										placeholder="All Classes"
										options={availableClasses.map((c) => ({
											label: c.name,
											value: c.classId,
										}))}
										disabled={availableClasses.length === 1}
									/>
								)}

								{canAccessSelectedAcademicYear && showSubjectFilter && (
									<FilterSelect
										label="Subject"
										value={filters.subject}
										onChange={(v) => setFilters({ ...filters, subject: v })}
										placeholder="All Subjects"
										options={availableSubjects.map((s) => ({
											label: s,
											value: s,
										}))}
										disabled={availableSubjects.length === 1}
									/>
								)}

								{canAccessSelectedAcademicYear && showPeriodFilter && (
									<FilterSelect
										label="Period"
										value={filters.period}
										onChange={(v) => setFilters({ ...filters, period: v })}
										placeholder="All Periods"
										options={periods.map((p) => ({
											label: p.label,
											value: p.value,
										}))}
									/>
								)}

								{canAccessSelectedAcademicYear && (
									<div className="flex items-center gap-2 ml-auto">
										{/* Refresh button — isSyncing reflects cursor-aware refresh;
										    loading.submittedGrades reflects the initial empty-table
										    load. Both disable the button but only isSyncing keeps
										    the table visible. */}
										<Button
											onClick={handleRefresh}
											disabled={loading.submittedGrades || isSyncing}
											className="h-8 flex items-center gap-2 px-3 text-sm"
											variant="outline"
										>
											{isSyncing ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<RefreshCw className="h-3.5 w-3.5" />
											)}
											{isSyncing ? 'Syncing…' : 'Refresh'}
										</Button>

										<FilterSelect
											label="Rows"
											value={String(rowsPerPage)}
											onChange={(v) => {
												setRowsPerPage(Number(v));
												setCurrentPage(1);
											}}
											options={[
												{ label: '5', value: '5' },
												{ label: '10', value: '10' },
												{ label: '25', value: '25' },
												{ label: '50', value: '50' },
											]}
										/>
									</div>
								)}
							</div>
						</div>
					)}

					{academicYear && !isSelectedAcademicYearAllowed && (
						<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm shadow-sm">
							Grade submission review is not allowed for academic year{' '}
							<strong>{academicYear}</strong>. Please select an allowed academic
							year.
						</div>
					)}

					{canAccessSelectedAcademicYear && (
						<>
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
											You are currently not assigned to any classes or subjects
											for grading in the{' '}
											<span className="font-semibold text-foreground">
												{academicYear || 'selected'}
											</span>{' '}
											academic year.
										</p>
										<p className="text-xs text-muted-foreground/80 mt-3 border-t border-border/60 pt-3">
											Please contact your school administrator to update your
											profile assignments.
										</p>
									</div>
								</div>
							) : (
								<div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
									<div className="p-4 sm:p-6 border-b border-border bg-muted/20">
										<h3 className="text-lg font-semibold text-foreground">
											Recent Grade Submissions
										</h3>
										<p className="text-muted-foreground text-sm">
											View details or request changes to submitted grades.
										</p>
									</div>
									{loading.submittedGrades && submittedGrades.length === 0 ? (
										<PageLoading
											fullScreen={false}
											message="Loading Submissions..."
										/>
									) : error.submittedGrades ? (
										<div className="p-6 text-center text-destructive">
											{error.submittedGrades}
										</div>
									) : submittedGrades?.length === 0 ? (
										<div className="p-12 text-center text-muted-foreground">
											<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
												<Clock className="w-6 h-6 text-muted-foreground/50" />
											</div>
											<p>No grades have been submitted yet.</p>
										</div>
									) : filteredAndSortedGrades.length === 0 ? (
										<div className="p-12 text-center text-muted-foreground">
											<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
												<Info className="w-6 h-6 text-muted-foreground/50" />
											</div>
											<p>No submissions match your filters.</p>
										</div>
									) : (
										<>
											<div className="overflow-x-auto">
												<table className="w-full min-w-[800px]">
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
																	className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors"
																	onClick={() =>
																		handleSort(key as keyof GradeSubmission)
																	}
																>
																	<div className="flex items-center gap-2">
																		{key === 'classId'
																			? 'Class'
																			: key
																					.replace(/([A-Z])/g, ' $1')
																					.replace(/^./, (str) =>
																						str.toUpperCase(),
																					)}
																		{getSortIcon(key as keyof GradeSubmission)}
																	</div>
																</th>
															))}
															<th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
																Actions
															</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-border bg-background">
														{currentSlice.map((grade) => (
															<tr
																key={grade.submissionId}
																className="hover:bg-muted/50 transition-colors"
															>
																<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
																	{grade.subject}
																</td>
																<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
																	{classMap.get(grade.gradeLevel) ||
																		grade.gradeLevel}
																</td>
																<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
																	{
																		periods.find(
																			(p) => p.value === grade.period,
																		)?.label
																	}
																</td>
																<td className="px-6 py-4 whitespace-nowrap text-sm">
																	<span
																		className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClasses(
																			grade.status,
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
																		variant="secondary"
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
											<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-t border-border bg-muted/20">
												<div className="text-sm text-muted-foreground">
													Showing{' '}
													<strong className="text-foreground">
														{(currentPageSafe - 1) * rowsPerPage + 1}
													</strong>
													–
													<strong className="text-foreground">
														{Math.min(
															currentPageSafe * rowsPerPage,
															filteredAndSortedGrades.length,
														)}
													</strong>{' '}
													of{' '}
													<strong className="text-foreground">
														{filteredAndSortedGrades.length}
													</strong>{' '}
													submissions
												</div>
												<div className="flex items-center justify-between gap-2 sm:justify-start">
													<button
														className="w-full px-3 py-1.5 text-sm font-medium border bg-background text-foreground rounded-md hover:bg-muted disabled:opacity-50 sm:w-auto transition-colors"
														onClick={() =>
															setCurrentPage((p) => Math.max(p - 1, 1))
														}
														disabled={currentPageSafe === 1}
													>
														Previous
													</button>
													<div className="text-sm text-muted-foreground px-2">
														Page {currentPageSafe} of {totalPages}
													</div>
													<button
														className="w-full px-3 py-1.5 text-sm font-medium border bg-background text-foreground rounded-md hover:bg-muted disabled:opacity-50 sm:w-auto transition-colors"
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
							)}
						</>
					)}
				</div>
			</div>
			{showDetailsModal && renderDetailsModal()}
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
	<div className="flex flex-col gap-0.5 min-w-[120px]">
		<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
			{label}
		</span>
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className={`h-8 w-full pl-3 pr-8 rounded-lg border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${
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

export default TeacherGradeSubmissions;
