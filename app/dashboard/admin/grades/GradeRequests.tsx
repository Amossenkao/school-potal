'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
	CheckCircle,
	Clock,
	X,
	Loader2,
	Info,
	Check,
	XCircle,
	User,
	Calendar,
	BookOpen,
	GraduationCap,
	Eye,
	Search,
	ArrowRight,
	WifiOff,
	RefreshCw,
	ChevronDown,
} from 'lucide-react';

import { useNetworkStore } from '@/store/networkStore';
import { useSchoolStore } from '@/store/schoolStore';
import { PageLoading } from '@/components/loading';
import { lockBodyScroll } from '@/utils/scrollLock';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	pickCurrentOrMostRecentAcademicYear,
} from '@/utils/academicYearOptions';

// --- TYPES ---
interface GradeChangeRequest {
	requestId: string;
	batchId: string;
	studentId: string;
	studentName: string;
	originalGrade: number | null;
	requestedGrade: number;
	reasonForChange: string;
	status: 'Pending' | 'Approved' | 'Rejected';
	adminRejectionReason?: string;
}

interface BulkGradeRequest {
	batchId: string;
	academicYear: string;
	period: string;
	classId: string;
	subject: string;
	teacherUsername: string;
	teacherName: string;
	submittedAt: string;
	lastUpdated: string;
	requests: GradeChangeRequest[];
	status: 'Pending' | 'Approved' | 'Rejected' | 'Partially Approved';
	stats: {
		totalRequests: number;
	};
}

type UnknownRecord = Record<string, unknown>;
type NormalizedStatus =
	| GradeChangeRequest['status']
	| BulkGradeRequest['status'];

const isObjectRecord = (value: unknown): value is UnknownRecord =>
	typeof value === 'object' && value !== null;

const toStringSafe = (value: unknown, fallback = ''): string => {
	if (typeof value === 'string') return value;
	if (value === null || value === undefined) return fallback;
	return String(value);
};

const toNumberSafe = (value: unknown, fallback = 0): number => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
};

const normalizeRequestStatus = (
	status: unknown,
): GradeChangeRequest['status'] => {
	if (status === 'Approved' || status === 'Rejected') return status;
	return 'Pending';
};

const inferBatchStatus = (
	requests: GradeChangeRequest[],
): BulkGradeRequest['status'] => {
	const statuses = new Set(requests.map((request) => request.status));
	if (statuses.size === 1) {
		return statuses.values().next().value as BulkGradeRequest['status'];
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

const normalizeBatchStatus = (
	status: unknown,
	requests: GradeChangeRequest[],
): BulkGradeRequest['status'] => {
	if (
		status === 'Pending' ||
		status === 'Approved' ||
		status === 'Rejected' ||
		status === 'Partially Approved'
	) {
		return status;
	}
	return inferBatchStatus(requests);
};

const normalizeGradeRequest = (
	request: unknown,
	defaultBatchId: string,
	requestIndex: number,
): GradeChangeRequest => {
	const source = isObjectRecord(request) ? request : {};
	const fallbackRequestId = `${defaultBatchId}-request-${requestIndex}`;
	const requestedGradeValue = toNumberSafe(source.requestedGrade, 0);
	const originalGradeRaw = source.originalGrade;
	const originalGradeValue =
		originalGradeRaw === null
			? null
			: toNumberSafe(originalGradeRaw, Number.NaN);

	return {
		requestId: toStringSafe(source.requestId ?? source._id, fallbackRequestId),
		batchId: toStringSafe(source.batchId, defaultBatchId),
		studentId: toStringSafe(source.studentId),
		studentName: toStringSafe(source.studentName, 'Unknown Student'),
		originalGrade: Number.isNaN(originalGradeValue) ? null : originalGradeValue,
		requestedGrade: requestedGradeValue,
		reasonForChange: toStringSafe(source.reasonForChange),
		status: normalizeRequestStatus(source.status),
		adminRejectionReason:
			typeof source.adminRejectionReason === 'string'
				? source.adminRejectionReason
				: undefined,
	};
};

const normalizeBulkRequests = (input: unknown): BulkGradeRequest[] => {
	if (!Array.isArray(input)) return [];

	type BatchAccumulator = {
		batchId: string;
		academicYear: string;
		period: string;
		classId: string;
		subject: string;
		teacherUsername: string;
		teacherName: string;
		submittedAt: string;
		lastUpdated: string;
		requests: GradeChangeRequest[];
		status?: NormalizedStatus;
		statsTotalRequests?: unknown;
	};

	const batchesById = new Map<string, BatchAccumulator>();

	const getAccumulator = (batchId: string): BatchAccumulator => {
		const existing = batchesById.get(batchId);
		if (existing) return existing;
		const created: BatchAccumulator = {
			batchId,
			academicYear: '',
			period: '',
			classId: '',
			subject: '',
			teacherUsername: '',
			teacherName: '',
			submittedAt: '',
			lastUpdated: '',
			requests: [],
		};
		batchesById.set(batchId, created);
		return created;
	};

	const firstNonEmpty = (current: string, candidate: unknown): string =>
		current || toStringSafe(candidate);

	input.forEach((item, itemIndex) => {
		if (!isObjectRecord(item)) return;
		const fallbackBatchId = `batch-${itemIndex + 1}`;
		const batchId = toStringSafe(item.batchId, fallbackBatchId);
		const accumulator = getAccumulator(batchId);

		accumulator.academicYear = firstNonEmpty(
			accumulator.academicYear,
			item.academicYear,
		);
		accumulator.period = firstNonEmpty(accumulator.period, item.period);
		accumulator.classId = firstNonEmpty(accumulator.classId, item.classId);
		accumulator.subject = firstNonEmpty(accumulator.subject, item.subject);
		accumulator.teacherUsername = firstNonEmpty(
			accumulator.teacherUsername,
			item.teacherUsername,
		);
		accumulator.teacherName = firstNonEmpty(
			accumulator.teacherName,
			item.teacherName,
		);
		accumulator.submittedAt = firstNonEmpty(
			accumulator.submittedAt,
			item.submittedAt,
		);
		accumulator.lastUpdated = firstNonEmpty(
			accumulator.lastUpdated,
			item.lastUpdated ?? item.submittedAt,
		);

		if (accumulator.status === undefined && typeof item.status === 'string') {
			accumulator.status = item.status as NormalizedStatus;
		}

		if (
			accumulator.statsTotalRequests === undefined &&
			isObjectRecord(item.stats)
		) {
			accumulator.statsTotalRequests = item.stats.totalRequests;
		}

		const rawRequests = Array.isArray(item.requests) ? item.requests : [item];
		const requestStartIndex = accumulator.requests.length;
		rawRequests.forEach((request, requestIndex) => {
			accumulator.requests.push(
				normalizeGradeRequest(
					request,
					batchId,
					requestStartIndex + requestIndex + 1,
				),
			);
		});
	});

	return Array.from(batchesById.values()).map((batch) => {
		const normalizedStatus = normalizeBatchStatus(batch.status, batch.requests);
		const statsTotal = toNumberSafe(batch.statsTotalRequests, Number.NaN);
		return {
			batchId: batch.batchId,
			academicYear: batch.academicYear,
			period: batch.period,
			classId: batch.classId,
			subject: batch.subject,
			teacherUsername: batch.teacherUsername,
			teacherName: batch.teacherName,
			submittedAt: batch.submittedAt,
			lastUpdated: batch.lastUpdated || batch.submittedAt,
			requests: batch.requests,
			status: normalizedStatus,
			stats: {
				totalRequests: Number.isNaN(statsTotal)
					? batch.requests.length
					: statsTotal,
			},
		};
	});
};

const periods = [
	{ id: 'first', label: 'First Period', value: 'firstPeriod' },
	{ id: 'second', label: 'Second Period', value: 'secondPeriod' },
];

const GradeRequests: React.FC = () => {
	const currentSchool = useSchoolStore((state) => state.school);
	const currentAcademicYear = currentSchool?.currentAcademicYear || '';
	const academicYearOptions = useMemo(
		() => buildSchoolAcademicYearRange(currentSchool),
		[currentSchool],
	);
	const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
		currentAcademicYear || academicYearOptions[0] || '',
	);
	const setGradeRequestsForYear = useSchoolStore(
		(state) => state.setGradeRequestsForYear,
	);
	const scopedGradeRequests = useSchoolStore(
		(state) =>
			getScopedAcademicYearValue(
				state.gradeRequestsByAcademicYear,
				selectedAcademicYear,
			).value,
	);
	// Data states
	const [bulkRequests, setBulkRequests] = useState<BulkGradeRequest[]>([]);
	const [loading, setLoading] = useState(true);
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
	const [selectedBulkRequest, setSelectedBulkRequest] =
		useState<BulkGradeRequest | null>(null);
	const [selectedBulkRequests, setSelectedBulkRequests] = useState<Set<string>>(
		new Set(),
	);
	const [selectedIndividualRequests, setSelectedIndividualRequests] = useState<
		Set<string>
	>(new Set());
	const [rejectionReason, setRejectionReason] = useState('');
	const [bulkRejectionReason, setBulkRejectionReason] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);

	// Filter and pagination states
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [rowsPerPage, setRowsPerPage] = useState<number>(5);

	useEffect(() => {
		if (!isAnyModalOpen) return;

		return lockBodyScroll();
	}, [isAnyModalOpen]);
	const [filters, setFilters] = useState({ status: 'All' });

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

	useEffect(() => {
		const defaultAcademicYear =
			pickCurrentOrMostRecentAcademicYear(
				academicYearOptions,
				currentAcademicYear,
			) || '';
		const selectedIsAvailable = academicYearOptions.some((year) =>
			areAcademicYearsEqual(year, selectedAcademicYear),
		);
		if (!selectedAcademicYear || !selectedIsAvailable) {
			setSelectedAcademicYear(defaultAcademicYear);
		}
	}, [academicYearOptions, currentAcademicYear, selectedAcademicYear]);

	// --- DATA FETCHING & PROCESSING ---
	const fetchRequests = async (forceRefresh = false) => {
		if (!selectedAcademicYear) {
			setBulkRequests([]);
			setLoading(false);
			return;
		}
		const schoolState = useSchoolStore.getState();
		const cachedByYear = schoolState.gradeRequestsByAcademicYear || {};
		const scopedStoreSnapshot = getScopedAcademicYearValue(
			cachedByYear,
			selectedAcademicYear,
		);
		const hasYearSnapshot = Boolean(scopedStoreSnapshot.key);
		const cachedRequests = Array.isArray(scopedStoreSnapshot.value)
			? scopedStoreSnapshot.value
			: [];

		try {
			if (!forceRefresh && hasYearSnapshot) {
				setBulkRequests(normalizeBulkRequests(cachedRequests));
				setError('');
				setLoading(false);
				return;
			}

			if (!forceRefresh && bulkRequests.length > 0) {
				setError('');
			} else {
				setLoading(true);
			}
			setError('');
			const response = await fetch(
				`/api/grades/requests?academicYear=${selectedAcademicYear}`,
			);
			if (!response.ok) {
				throw new Error('Failed to fetch grade change requests');
			}
			const data = await response.json();
			const report = Array.isArray(data?.data?.report) ? data.data.report : [];
			const normalizedReport = normalizeBulkRequests(report);
			setBulkRequests(normalizedReport);
			setGradeRequestsForYear(selectedAcademicYear, normalizedReport);
		} catch (err) {
			console.error('Error fetching grade change requests:', err);
			if (bulkRequests.length === 0) {
				setError('Failed to fetch requests. Please try again.');
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void fetchRequests();
		// Cache refresh should follow academic year changes only.
	}, [selectedAcademicYear]);

	useEffect(() => {
		if (!Array.isArray(scopedGradeRequests)) return;
		setBulkRequests(normalizeBulkRequests(scopedGradeRequests));
		setLoading(false);
		setError('');
	}, [scopedGradeRequests]);

	const applyRequestStatusLocally = (payload: {
		requestIds: string[];
		status: 'Approved' | 'Rejected';
		adminRejectionReason?: string;
	}) => {
		if (payload.requestIds.length === 0) return;
		const targetIds = new Set(payload.requestIds);
		const nowIso = new Date().toISOString();

		const nextRequests = bulkRequests.map((batch) => {
			let changed = false;
			const nextBatchRequests = batch.requests.map((request) => {
				if (!targetIds.has(request.requestId) || request.status !== 'Pending') {
					return request;
				}
				changed = true;
				return {
					...request,
					status: payload.status,
					adminRejectionReason:
						payload.status === 'Rejected'
							? payload.adminRejectionReason
							: undefined,
				};
			});

			if (!changed) return batch;
			return {
				...batch,
				requests: nextBatchRequests,
				status: inferBatchStatus(nextBatchRequests),
				lastUpdated: nowIso,
				stats: { totalRequests: nextBatchRequests.length },
			};
		});

		setBulkRequests(nextRequests);
		if (selectedAcademicYear) {
			setGradeRequestsForYear(selectedAcademicYear, nextRequests);
		}
		if (selectedBulkRequest) {
			const refreshedSelected = nextRequests.find(
				(batch) => batch.batchId === selectedBulkRequest.batchId,
			);
			if (refreshedSelected) {
				setSelectedBulkRequest(refreshedSelected);
			}
		}
	};

	// API interaction simulation
	const updateRequestStatus = async (payload: {
		requestIds: string[];
		status: 'Approved' | 'Rejected';
		adminRejectionReason?: string;
	}) => {
		setIsProcessing(true);
		try {
			setActionNotice(null);
			const response = await fetch('/api/grades/requests', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(result.message || 'API request failed');
			}
			if (result?.queued) {
				applyRequestStatusLocally(payload);
				setActionNotice({
					type: 'info',
					message:
						'You are offline. Request approval/rejection was queued and will sync when you reconnect.',
				});
				return;
			}
			applyRequestStatusLocally(payload);
			window.dispatchEvent(new CustomEvent('grading:counts:refresh'));
			void fetchRequests(true);
		} catch (error) {
			console.error('Error updating grade status:', error);
			setActionNotice({
				type: 'error',
				message: 'Could not update request status. Please try again.',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	// --- ACTION HANDLERS ---
	const handleModalApprove = async () => {
		if (!selectedBulkRequest) return;
		const requestsToUpdate =
			selectedIndividualRequests.size > 0
				? selectedBulkRequest.requests.filter((r) =>
						selectedIndividualRequests.has(r.requestId),
					)
				: selectedBulkRequest.requests;

		const payload = {
			requestIds: requestsToUpdate.map((r) => r.requestId),
			status: 'Approved' as const,
		};
		if (payload.requestIds.length > 0) await updateRequestStatus(payload);
		setShowDetailsModal(false);
	};

	const handleModalReject = async () => {
		if (!selectedBulkRequest || !rejectionReason.trim()) return;
		const requestsToUpdate =
			selectedIndividualRequests.size > 0
				? selectedBulkRequest.requests.filter((r) =>
						selectedIndividualRequests.has(r.requestId),
					)
				: selectedBulkRequest.requests;

		const payload = {
			requestIds: requestsToUpdate.map((r) => r.requestId),
			status: 'Rejected' as const,
			adminRejectionReason: rejectionReason,
		};
		if (payload.requestIds.length > 0) await updateRequestStatus(payload);
		setShowRejectModal(false);
		setShowDetailsModal(false);
		setRejectionReason('');
	};

	const handleBulkApprove = async () => {
		const requestIds = Array.from(selectedBulkRequests).flatMap((batchId) => {
			const batch = bulkRequests.find((b) => b.batchId === batchId);
			return batch
				? batch.requests
						.filter((r) => r.status === 'Pending')
						.map((r) => r.requestId)
				: [];
		});
		if (requestIds.length > 0) {
			await updateRequestStatus({ requestIds, status: 'Approved' });
		}
		setSelectedBulkRequests(new Set());
	};

	const handleBulkReject = async () => {
		if (!bulkRejectionReason.trim()) return;
		const requestIds = Array.from(selectedBulkRequests).flatMap((batchId) => {
			const batch = bulkRequests.find((b) => b.batchId === batchId);
			return batch
				? batch.requests
						.filter((r) => r.status === 'Pending')
						.map((r) => r.requestId)
				: [];
		});
		if (requestIds.length > 0) {
			await updateRequestStatus({
				requestIds,
				status: 'Rejected',
				adminRejectionReason: bulkRejectionReason,
			});
		}
		setSelectedBulkRequests(new Set());
		setShowBulkRejectModal(false);
		setBulkRejectionReason('');
	};

	// --- FILTERING & PAGINATION ---
	const filteredRequests = useMemo(() => {
		const statusPriority: Record<BulkGradeRequest['status'], number> = {
			Pending: 0,
			'Partially Approved': 1,
			Rejected: 2,
			Approved: 3,
		};

		return bulkRequests
			.filter((req) => {
				if (filters.status && filters.status !== 'All') {
					if (
						filters.status === 'Pending' &&
						!['Pending', 'Partially Approved'].includes(req.status)
					)
						return false;
					else if (
						filters.status !== 'Pending' &&
						req.status !== filters.status
					)
						return false;
				}
				const query = searchQuery.toLowerCase();
				if (query) {
					return (
						req.teacherName.toLowerCase().includes(query) ||
						req.subject.toLowerCase().includes(query) ||
						(classMap.get(req.classId) || '').toLowerCase().includes(query)
					);
				}
				return true;
			})
			.sort((a, b) => {
				const statusDelta =
					(statusPriority[a.status] ?? 3) - (statusPriority[b.status] ?? 3);
				if (statusDelta !== 0) return statusDelta;
				const aTime = new Date(a.lastUpdated || a.submittedAt).getTime();
				const bTime = new Date(b.lastUpdated || b.submittedAt).getTime();
				return bTime - aTime;
			});
	}, [bulkRequests, filters, searchQuery, classMap]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredRequests.length / rowsPerPage),
	);
	const currentPageSafe = Math.min(currentPage, totalPages);
	const currentSlice = filteredRequests.slice(
		(currentPageSafe - 1) * rowsPerPage,
		currentPageSafe * rowsPerPage,
	);

	useEffect(() => {
		setCurrentPage(1);
	}, [filters.status, searchQuery, rowsPerPage]);

	useEffect(() => {
		setSelectedBulkRequests(new Set());
		setSelectedIndividualRequests(new Set());
		setSelectedBulkRequest(null);
		setCurrentPage(1);
	}, [selectedAcademicYear]);

	// --- SELECTION TOGGLES ---
	const toggleRequestSelection = (batchId: string) => {
		setSelectedBulkRequests((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(batchId)) newSet.delete(batchId);
			else newSet.add(batchId);
			return newSet;
		});
	};
	const toggleAllRequests = (checked: boolean) => {
		if (checked) {
			const selectable = filteredRequests
				.filter((s) => ['Pending', 'Partially Approved'].includes(s.status))
				.map((s) => s.batchId);
			setSelectedBulkRequests(new Set(selectable));
		} else {
			setSelectedBulkRequests(new Set());
		}
	};

	// --- UI HELPERS ---
	const getStatusClasses = (
		status: BulkGradeRequest['status'] | GradeChangeRequest['status'],
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
		status: BulkGradeRequest['status'] | GradeChangeRequest['status'],
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
				return <Info className="h-4 w-4" />;
		}
	};
	const getGradeColor = (grade: number | null) => {
		if (grade === null) return 'text-muted-foreground';
		return grade >= 70
			? 'text-[var(--grade-pass)]'
			: 'text-[var(--grade-fail)]';
	};
	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleString([], {
			dateStyle: 'short',
			timeStyle: 'short',
		});

	// --- RENDER METHODS ---
	const renderDetailsModal = () => {
		if (!selectedBulkRequest) return null;
		const selectableRequests = selectedBulkRequest.requests.filter(
			(g) => g.status === 'Pending',
		);

		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowDetailsModal(false); setSelectedIndividualRequests(new Set()); }}>
				<div className="bg-card rounded-lg shadow-xl w-full max-w-5xl max-h-[calc(100dvh-3rem)] flex flex-col border" onClick={(e) => e.stopPropagation()}>
					{/* Modal Header */}
						<div className="p-4 sm:p-5 border-b">
							<div className="flex justify-between items-start">
								<div>
									<h3 className="text-lg font-semibold">
										Grade Change Request Batch
									</h3>
									<div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
										<span className="flex items-center gap-1">
											<User className="h-3 w-3" />
											{selectedBulkRequest.teacherName}
										</span>
										<span className="flex items-center gap-1">
											<BookOpen className="h-3 w-3" />
											{selectedBulkRequest.subject}
										</span>
										<span className="flex items-center gap-1">
											<GraduationCap className="h-3 w-3" />
											{classMap.get(selectedBulkRequest.classId)}
										</span>
										<span className="flex items-center gap-1">
											<Calendar className="h-3 w-3" />
											Submitted: {formatDate(selectedBulkRequest.submittedAt)}
										</span>
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
						{/* Modal Body */}
						<div className="p-4 sm:p-5 overflow-y-auto overscroll-contain flex-grow">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-border">
									<thead className="bg-muted/50">
										<tr>
											<th className="p-2.5 text-left">
												<input
													type="checkbox"
													onChange={(e) => {
														if (e.target.checked)
															setSelectedIndividualRequests(
																new Set(
																	selectableRequests.map((g) => g.requestId),
																),
															);
														else setSelectedIndividualRequests(new Set());
													}}
													checked={
														selectableRequests.length > 0 &&
														selectedIndividualRequests.size ===
															selectableRequests.length
													}
													className="rounded border-input"
												/>
											</th>
											<th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
												Student
											</th>
											<th className="px-3 sm:px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">
												Grade Change
											</th>
											<th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">
												Teacher's Reason
											</th>
											<th className="px-3 sm:px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">
												Status
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{selectedBulkRequest.requests.map((req) => (
											<tr
												key={req.requestId}
												className={
													selectedIndividualRequests.has(req.requestId)
														? 'bg-primary/10'
														: ''
												}
											>
												<td className="p-2.5">
													<input
														type="checkbox"
														disabled={req.status !== 'Pending'}
														checked={selectedIndividualRequests.has(
															req.requestId,
														)}
														onChange={() => {
															const newSet = new Set(
																selectedIndividualRequests,
															);
															if (newSet.has(req.requestId))
																newSet.delete(req.requestId);
															else newSet.add(req.requestId);
															setSelectedIndividualRequests(newSet);
														}}
														className="rounded border-input disabled:opacity-50"
													/>
												</td>
												<td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm font-medium">
													{req.studentName}
												</td>
												<td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-center font-semibold">
													<span className={getGradeColor(req.originalGrade)}>
														{req.originalGrade ?? 'N/A'}
													</span>
													<ArrowRight className="inline-block h-3 w-3 mx-1 text-muted-foreground" />
													<span className={getGradeColor(req.requestedGrade)}>
														{req.requestedGrade}
													</span>
												</td>
												<td className="px-3 sm:px-4 py-3 text-xs text-muted-foreground max-w-sm truncate">
													{req.reasonForChange}
												</td>
												<td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-center">
													<span
														className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
															req.status,
														)}`}
													>
														{getStatusIcon(req.status)} {req.status}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
						{/* Modal Footer */}
						{['Pending', 'Partially Approved'].includes(
							selectedBulkRequest.status,
						) && (
							<div className="p-4 sm:p-5 border-t bg-muted flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-xs text-muted-foreground">
									{selectedIndividualRequests.size > 0
										? `${selectedIndividualRequests.size} pending request(s) selected`
										: 'Actions apply to all pending requests'}
								</div>
								<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
									<button
										onClick={() => setShowRejectModal(true)}
										className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center justify-center gap-2 sm:w-auto text-sm"
									>
										<XCircle className="h-4 w-4" /> Reject{' '}
										{selectedIndividualRequests.size > 0
											? 'Selected'
											: 'All Pending'}
									</button>
									<button
										onClick={handleModalApprove}
										disabled={isProcessing}
										className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 sm:w-auto text-sm"
									>
										{isProcessing && (
											<Loader2 className="h-4 w-4 animate-spin" />
										)}{' '}
										<Check className="h-4 w-4" /> Approve{' '}
										{selectedIndividualRequests.size > 0
											? 'Selected'
											: 'All Pending'}
									</button>
								</div>
							</div>
						)}
					</div>
			</div>
		);
	};

	const renderRejectModal = (isBulk: boolean) => (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() =>
			isBulk
				? setShowBulkRejectModal(false)
				: setShowRejectModal(false)
		}>
			<div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain border" onClick={(e) => e.stopPropagation()}>
				<div className="p-4 sm:p-5 border-b flex justify-between items-center">
					<h3 className="text-lg font-semibold text-destructive">
						{isBulk ? 'Bulk Reject Requests' : 'Reject Request(s)'}
					</h3>
					<button
						onClick={() =>
							isBulk
								? setShowBulkRejectModal(false)
								: setShowRejectModal(false)
						}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="p-4 sm:p-5">
					<p className="text-muted-foreground mb-3 text-sm">
						{isBulk
							? `You are rejecting all pending requests in ${selectedBulkRequests.size} batch(es).`
							: 'Provide a reason for rejection. This will be visible to the teacher.'}
					</p>
					<textarea
						value={isBulk ? bulkRejectionReason : rejectionReason}
						onChange={(e) =>
							isBulk
								? setBulkRejectionReason(e.target.value)
								: setRejectionReason(e.target.value)
						}
						placeholder="Enter detailed reason for rejection..."
						rows={3}
						className="w-full rounded-md border-input bg-background shadow-sm focus:ring-destructive focus:border-destructive text-sm"
					/>
				</div>
				<div className="p-4 sm:p-5 border-t bg-muted flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<button
						onClick={() =>
							isBulk
								? setShowBulkRejectModal(false)
								: setShowRejectModal(false)
						}
						className="w-full px-4 py-2 text-foreground bg-card border rounded-md hover:bg-muted sm:w-auto text-sm"
					>
						Cancel
					</button>
					<button
						onClick={isBulk ? handleBulkReject : handleModalReject}
						disabled={
							isProcessing ||
							!(isBulk ? bulkRejectionReason : rejectionReason).trim()
						}
						className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2 sm:w-auto text-sm"
					>
						{isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}{' '}
						<XCircle className="h-4 w-4" />{' '}
						{isBulk
							? `Reject ${selectedBulkRequests.size} Batches`
							: 'Confirm Rejection'}
					</button>
				</div>
			</div>
		</div>
	);

	// --- MAIN COMPONENT RENDER ---
	return (
		<div className="space-y-6 bg-background text-foreground p-4 md:p-6">
			<div className="bg-card border rounded-lg">
				{/* Header & Filters */}
				<div className="p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-4">
						<div>
							<h2 className="text-2xl font-bold">Grade Change Requests</h2>
							<p className="text-muted-foreground mt-1">
								Review, approve, or reject teacher requests to change student
								grades.
								{selectedAcademicYear
									? ` Academic year: ${selectedAcademicYear}`
									: ''}
							</p>
						</div>
						<button
							onClick={() => fetchRequests(true)}
							disabled={loading}
							className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}{' '}
							Refresh
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
					<div className="bg-card border border-border rounded-xl shadow-sm">
						<div className="flex flex-wrap gap-2 p-2.5 sm:p-3 items-end">
							{academicYearOptions.length > 1 && (
								<FilterSelect
									label="Year"
									value={selectedAcademicYear}
									onChange={setSelectedAcademicYear}
									options={academicYearOptions.map((year) => ({
										label: year,
										value: year,
									}))}
								/>
							)}

							<div className="flex flex-col gap-0.5 flex-1 min-w-[220px]">
								<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
									Search
								</span>
								<div className="relative">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
									<input
										type="text"
										placeholder="Teacher, subject, or class"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring hover:border-ring/50 transition-colors"
									/>
								</div>
							</div>

							<FilterSelect
								label="Status"
								value={filters.status}
								onChange={(status) => setFilters((f) => ({ ...f, status }))}
								options={[
									{ label: 'All Statuses', value: 'All' },
									{ label: 'Pending', value: 'Pending' },
									{
										label: 'Partially Approved',
										value: 'Partially Approved',
									},
									{ label: 'Approved', value: 'Approved' },
									{ label: 'Rejected', value: 'Rejected' },
								]}
							/>

							<FilterSelect
								label="Rows"
								value={String(rowsPerPage)}
								onChange={(rows) => setRowsPerPage(Number(rows))}
								options={[
									{ label: '5', value: '5' },
									{ label: '10', value: '10' },
									{ label: '25', value: '25' },
									{ label: '50', value: '50' },
								]}
							/>
						</div>
					</div>
				</div>

				{/* Bulk Actions Bar */}
				{selectedBulkRequests.size > 0 && (
					<div className="bg-primary/10 border-t border-primary/20 p-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<span className="text-sm font-medium text-primary">
								{selectedBulkRequests.size} batch(es) selected
							</span>
							<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
								<button
									onClick={handleBulkApprove}
									disabled={isProcessing}
									className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1 sm:w-auto"
								>
									{isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}{' '}
									<Check className="h-3 w-3" /> Approve All Pending
								</button>
								<button
									onClick={() => setShowBulkRejectModal(true)}
									className="w-full px-3 py-2 bg-destructive text-destructive-foreground text-sm rounded-md hover:bg-destructive/90 flex items-center justify-center gap-1 sm:w-auto"
								>
									<XCircle className="h-3 w-3" /> Reject All Pending
								</button>
								<button
									onClick={() => setSelectedBulkRequests(new Set())}
									className="w-full px-3 py-2 bg-secondary text-secondary-foreground text-sm rounded-md hover:bg-secondary/80 sm:w-auto"
								>
									Clear Selection
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Main Table */}
				<div className="border-t">
					{loading ? (
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
					) : filteredRequests.length === 0 ? (
						<div className="p-6 text-center text-muted-foreground">
							No grade change requests found.
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
													onChange={(e) => toggleAllRequests(e.target.checked)}
													checked={
														filteredRequests.filter((s) =>
															['Pending', 'Partially Approved'].includes(
																s.status,
															),
														).length > 0 &&
														selectedBulkRequests.size ===
															filteredRequests.filter((s) =>
																['Pending', 'Partially Approved'].includes(
																	s.status,
																),
															).length
													}
													className="rounded border-input"
												/>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Teacher / Subject
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Class
											</th>
											<th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
												# of Changes
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Status
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
												Submitted At
											</th>
											<th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{currentSlice.map((batch) => (
											<tr key={batch.batchId}>
												<td className="p-3">
													<input
														type="checkbox"
														checked={selectedBulkRequests.has(batch.batchId)}
														onChange={() =>
															toggleRequestSelection(batch.batchId)
														}
														disabled={
															!['Pending', 'Partially Approved'].includes(
																batch.status,
															)
														}
														className="rounded border-input disabled:opacity-50"
													/>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-foreground">
														{batch.teacherName}
													</div>
													<div className="text-sm text-muted-foreground">
														{batch.subject}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{classMap.get(batch.classId)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-center text-muted-foreground">
													{batch.stats?.totalRequests ?? batch.requests.length}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm">
													<span
														className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
															batch.status,
														)}`}
													>
														{getStatusIcon(batch.status)} {batch.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{formatDate(batch.submittedAt)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<button
														onClick={() => {
															setSelectedBulkRequest(batch);
															setShowDetailsModal(true);
															setSelectedIndividualRequests(new Set());
														}}
														className="text-primary hover:underline flex items-center gap-1"
													>
														<Eye className="h-4 w-4" /> Review
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{/* Pagination */}
							<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="text-sm text-muted-foreground">
									Showing{' '}
									<strong>{(currentPageSafe - 1) * rowsPerPage + 1}</strong>–
									<strong>
										{Math.min(
											currentPageSafe * rowsPerPage,
											filteredRequests.length,
										)}
									</strong>{' '}
									of <strong>{filteredRequests.length}</strong> batches
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
			{showRejectModal && renderRejectModal(false)}
			{showBulkRejectModal && renderRejectModal(true)}
		</div>
	);
};

interface FilterSelectProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
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

export default GradeRequests;
