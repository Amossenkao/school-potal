'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	Loader2,
	Clock,
	CheckCircle,
	XCircle,
	ArrowRight,
	Trash2,
	Edit,
	X,
	ChevronLeft,
	ChevronRight,
	RefreshCw,
} from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { lockBodyScroll } from '@/utils/scrollLock';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	getTeacherAcademicYears,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';
import { getAllowedGradeChangeRequestAcademicYears } from '@/utils/schoolSettingsAccess';

// --- TYPES ---
interface TeacherInfo {
	username: string;
	name: string;
	subjects?: { year: string }[];
}
interface GradeChangeRequest {
	_id: string;
	studentName: string;
	originalGrade: number;
	requestedGrade: number;
	reasonForChange: string;
	status: 'Pending' | 'Approved' | 'Rejected';
	adminRejectionReason?: string;
}
interface BatchRequest {
	batchId: string;
	subject: string;
	classId: string;
	period: string;
	submittedAt: string;
	status: 'Pending' | 'Approved' | 'Rejected' | 'Partially Approved';
	requests: GradeChangeRequest[];
}
interface EditModalState {
	isOpen: boolean;
	requestId: string;
	studentName: string;
	originalGrade: number;
	requestedGrade: string;
	reasonForChange: string;
}

const getGradeColor = (grade: number | null | undefined) => {
	if (grade === null || grade === undefined || Number.isNaN(Number(grade))) {
		return 'text-muted-foreground';
	}
	return Number(grade) >= 70
		? 'text-[var(--grade-pass)] font-semibold'
		: 'text-[var(--grade-fail)] font-semibold';
};

type UnknownRecord = Record<string, unknown>;

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
): BatchRequest['status'] => {
	const statuses = new Set(requests.map((request) => request.status));
	if (statuses.size === 1) {
		return statuses.values().next().value as BatchRequest['status'];
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
): BatchRequest['status'] => {
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
	const fallbackId = `${defaultBatchId}-request-${requestIndex}`;
	const resolvedId = toStringSafe(source._id ?? source.requestId, fallbackId);
	const originalGradeValue =
		source.originalGrade === null
			? Number.NaN
			: toNumberSafe(source.originalGrade, Number.NaN);

	return {
		_id: resolvedId,
		studentName: toStringSafe(source.studentName, 'Unknown Student'),
		originalGrade: Number.isNaN(originalGradeValue) ? 0 : originalGradeValue,
		requestedGrade: toNumberSafe(source.requestedGrade, 0),
		reasonForChange: toStringSafe(source.reasonForChange),
		status: normalizeRequestStatus(source.status),
		adminRejectionReason:
			typeof source.adminRejectionReason === 'string'
				? source.adminRejectionReason
				: undefined,
	};
};

const normalizeBatchRequests = (input: unknown): BatchRequest[] => {
	if (!Array.isArray(input)) return [];

	type BatchAccumulator = {
		batchId: string;
		subject: string;
		classId: string;
		period: string;
		submittedAt: string;
		status?: BatchRequest['status'];
		requests: GradeChangeRequest[];
		source?: UnknownRecord;
	};

	const batchesById = new Map<string, BatchAccumulator>();

	const getAccumulator = (batchId: string): BatchAccumulator => {
		const existing = batchesById.get(batchId);
		if (existing) return existing;
		const created: BatchAccumulator = {
			batchId,
			subject: '',
			classId: '',
			period: '',
			submittedAt: '',
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

		accumulator.subject = firstNonEmpty(accumulator.subject, item.subject);
		accumulator.classId = firstNonEmpty(accumulator.classId, item.classId);
		accumulator.period = firstNonEmpty(accumulator.period, item.period);
		accumulator.submittedAt = firstNonEmpty(
			accumulator.submittedAt,
			item.submittedAt,
		);

		if (accumulator.status === undefined && typeof item.status === 'string') {
			accumulator.status = item.status as BatchRequest['status'];
		}

		if (!accumulator.source) {
			accumulator.source = item;
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
		const status = normalizeBatchStatus(batch.status, batch.requests);
		const resolvedSubmittedAt = batch.submittedAt || new Date().toISOString();
		return {
			...(batch.source || {}),
			batchId: batch.batchId,
			subject: batch.subject,
			classId: batch.classId,
			period: batch.period,
			submittedAt: resolvedSubmittedAt,
			status,
			requests: batch.requests,
		};
	});
};

const TeacherGradeChangeRequests = ({
	teacherInfo,
}: {
	teacherInfo: TeacherInfo;
}) => {
	const authUser = useAuth((state) => state.user) as any;
	const school = useSchoolStore((state) => state.school);
	const teacherAcademicYears = useMemo(
		() => getTeacherAcademicYears(teacherInfo),
		[teacherInfo],
	);
	const fallbackAcademicYears = useMemo(() => {
		const allowedYears = Array.isArray(authUser?.allowedAcademicYears)
			? authUser.allowedAcademicYears
			: [];
		const subjectYears = Array.isArray(authUser?.subjects)
			? authUser.subjects.map((entry: any) => entry?.year).filter(Boolean)
			: [];
		return sortAcademicYearsDesc([...allowedYears, ...subjectYears]);
	}, [authUser]);
	const availableAcademicYears = useMemo(() => {
		if (teacherAcademicYears.length > 0) return teacherAcademicYears;
		if (fallbackAcademicYears.length > 0) return fallbackAcademicYears;
		return sortAcademicYearsDesc([school?.currentAcademicYear].filter(Boolean));
	}, [
		teacherAcademicYears,
		fallbackAcademicYears,
		school?.currentAcademicYear,
	]);
	const allowedAcademicYears = useMemo(
		() =>
			sortAcademicYearsDesc(
				getAllowedGradeChangeRequestAcademicYears(school) || [],
			),
		[school],
	);
	const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
	const isSelectedAcademicYearAllowed = useMemo(() => {
		if (!selectedAcademicYear) return false;
		return allowedAcademicYears.some((year) =>
			areAcademicYearsEqual(year, selectedAcademicYear),
		);
	}, [allowedAcademicYears, selectedAcademicYear]);
	const setGradeRequestsForYear = useSchoolStore(
		(state) => state.setGradeRequestsForYear,
	);
	const scopedGradeRequests = useSchoolStore((state) => {
		if (!selectedAcademicYear) return undefined;
		return getScopedAcademicYearValue(
			state.gradeRequestsByAcademicYear,
			selectedAcademicYear,
		).value;
	});
	const [requests, setRequests] = useState<BatchRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [editModal, setEditModal] = useState<EditModalState>({
		isOpen: false,
		requestId: '',
		studentName: '',
		originalGrade: 0,
		requestedGrade: '',
		reasonForChange: '',
	});

	useEffect(() => {
		if (!editModal.isOpen) return;

		return lockBodyScroll();
	}, [editModal.isOpen]);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(5);

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

	const fetchRequests = useCallback(
		async (skipCache = false) => {
			if (!teacherInfo?.username || !selectedAcademicYear) {
				setRequests([]);
				setLoading(false);
				return;
			}
			let hasCachedDisplay = false;
			try {
				const academicYear = selectedAcademicYear;
				const cacheKey = `gradeRequests:${academicYear}:${
					teacherInfo?.username || 'teacher'
				}`;

				if (!skipCache) {
					const storeState = useSchoolStore.getState();
					const scopedStoreSnapshot = getScopedAcademicYearValue(
						storeState.gradeRequestsByAcademicYear || {},
						academicYear,
					);
					const scopedStoreRequests = Array.isArray(scopedStoreSnapshot.value)
						? scopedStoreSnapshot.value
						: [];
					if (scopedStoreRequests.length > 0) {
						setRequests(normalizeBatchRequests(scopedStoreRequests));
						setError('');
						setLoading(false);
						hasCachedDisplay = true;
					}

					if (!hasCachedDisplay) {
						const cached = getClientCache<BatchRequest[]>(cacheKey);
						if (cached !== null && cached.length > 0) {
							setRequests(normalizeBatchRequests(cached));
							setError('');
							setLoading(false);
							hasCachedDisplay = true;
						}
					}
				}

				if (!hasCachedDisplay) {
					setLoading(true);
				}
				setError('');
				const res = await fetch(
					`/api/grades/requests?academicYear=${academicYear}`,
				);
				if (!res.ok)
					throw new Error('Failed to fetch your grade change requests.');
				const data = await res.json();
				const report = Array.isArray(data?.data?.report)
					? data.data.report
					: [];
				const normalizedReport = normalizeBatchRequests(report);
				setRequests(normalizedReport);
				setGradeRequestsForYear(academicYear, normalizedReport);
				setClientCache(cacheKey, normalizedReport);
			} catch (err) {
				if (!hasCachedDisplay) {
					setError(
						'Could not load your grade change requests. Please try again later.',
					);
				}
			} finally {
				setLoading(false);
			}
		},
		[teacherInfo?.username, selectedAcademicYear, setGradeRequestsForYear],
	);

	useEffect(() => {
		if (!teacherInfo?.username || !selectedAcademicYear) {
			setRequests([]);
			setLoading(false);
			return;
		}
		void fetchRequests();
	}, [teacherInfo?.username, selectedAcademicYear, fetchRequests]);

	useEffect(() => {
		if (
			!teacherInfo?.username ||
			!selectedAcademicYear ||
			!Array.isArray(scopedGradeRequests)
		) {
			return;
		}

		// Prevent an uninitialized empty store array from wiping out perfectly good cached/fetched data
		if (scopedGradeRequests.length === 0 && requests.length > 0) {
			return;
		}

		setRequests(normalizeBatchRequests(scopedGradeRequests));
		setError('');
		setLoading(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teacherInfo?.username, selectedAcademicYear, scopedGradeRequests]);

	useEffect(() => {
		const handleRequestUpdate = (
			event: CustomEvent<{ academicYear?: string; teacherUsername?: string }>,
		) => {
			const eventYear = event.detail?.academicYear;
			const eventTeacher = event.detail?.teacherUsername;
			const activeYear = selectedAcademicYear;
			if (!activeYear) return;
			if (eventTeacher && eventTeacher !== teacherInfo?.username) return;
			if (eventYear && !areAcademicYearsEqual(eventYear, activeYear)) return;
			void fetchRequests();
		};

		window.addEventListener(
			'grading:requests:updated',
			handleRequestUpdate as EventListener,
		);
		return () => {
			window.removeEventListener(
				'grading:requests:updated',
				handleRequestUpdate as EventListener,
			);
		};
	}, [teacherInfo?.username, selectedAcademicYear, fetchRequests]);

	const yearAssignment = useMemo(() => {
		const subjects = authUser?.subjects || teacherInfo?.subjects || [];
		return (subjects || []).find((entry: any) =>
			areAcademicYearsEqual(entry?.year, selectedAcademicYear),
		);
	}, [authUser, teacherInfo, selectedAcademicYear]);

	const filteredRequests = useMemo(() => {
		if (!requests.length) return [];

		if (!yearAssignment?.classes || !Array.isArray(yearAssignment.classes)) {
			return requests;
		}

		const allowedMap = new Map<string, Set<string>>();
		yearAssignment.classes.forEach((c: any) => {
			if (c?.classId && Array.isArray(c.subjects)) {
				allowedMap.set(
					String(c.classId).trim(),
					new Set(c.subjects.map((s: any) => String(s || '').trim())),
				);
			}
		});

		if (allowedMap.size === 0) return requests;

		return requests.filter((batch) => {
			const allowedSubjects = allowedMap.get(
				String(batch.classId || '').trim(),
			);
			return (
				allowedSubjects &&
				allowedSubjects.has(String(batch.subject || '').trim())
			);
		});
	}, [requests, yearAssignment]);

	useEffect(() => {
		setCurrentPage(1);
	}, [filteredRequests.length]);

	// Pagination Logic
	const paginatedRequests = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredRequests, currentPage, itemsPerPage]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredRequests.length / itemsPerPage),
	);

	const handleWithdraw = async (requestId: string) => {
		if (!confirm('Are you sure you want to withdraw this request?')) return;

		try {
			const res = await fetch(`/api/grades/requests?requestId=${requestId}`, {
				method: 'DELETE',
			});
			const result = await res.json().catch(() => ({}));

			if (!res.ok) {
				throw new Error(result.message || 'Failed to withdraw request.');
			}

			if (result?.queued) {
				alert(
					'You are offline. Request withdrawal was queued and will sync when you reconnect.',
				);
				return;
			}
			await fetchRequests(true);
			// Notify other components that grade requests have been updated
			window.dispatchEvent(
				new CustomEvent('grading:requests:updated', {
					detail: {
						academicYear: selectedAcademicYear,
						teacherUsername: teacherInfo?.username,
					},
				}),
			);
		} catch (err: any) {
			alert(`Error: ${err.message}`);
		}
	};

	const handleOpenEditModal = (request: GradeChangeRequest) => {
		setEditModal({
			isOpen: true,
			requestId: request._id,
			studentName: request.studentName,
			originalGrade: request.originalGrade,
			requestedGrade: String(request.requestedGrade),
			reasonForChange: request.reasonForChange,
		});
	};

	const handleSaveChanges = async () => {
		const { requestId, requestedGrade, reasonForChange } = editModal;

		try {
			const res = await fetch('/api/grades/requests', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					requestId,
					requestedGrade: Number(requestedGrade),
					reasonForChange,
				}),
			});
			const result = await res.json().catch(() => ({}));

			if (!res.ok) {
				throw new Error(result.message || 'Failed to update request.');
			}

			if (result?.queued) {
				alert(
					'You are offline. Request update was queued and will sync when you reconnect.',
				);
				setEditModal((prev) => ({ ...prev, isOpen: false }));
				return;
			}

			await fetchRequests(true);
			setEditModal({
				isOpen: false,
				requestId: '',
				studentName: '',
				originalGrade: 0,
				requestedGrade: '',
				reasonForChange: '',
			});
		} catch (err: any) {
			alert(`Error: ${err.message}`);
		}
	};

	if (loading) {
		return (
			<div className="text-center p-8 flex items-center justify-center min-h-[60vh]">
				<PageLoading fullScreen={false} message="Loading grade requests..." />
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center p-8 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
				{error}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{editModal.isOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
					onClick={() => setEditModal((p) => ({ ...p, isOpen: false }))}
				>
					<div
						className="bg-card p-4 sm:p-5 rounded-lg shadow-xl w-full max-w-md border"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex justify-between items-center mb-3">
							<h3 className="text-base font-semibold">
								Edit Grade Change Request
							</h3>
							<button
								onClick={() => setEditModal((p) => ({ ...p, isOpen: false }))}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<p className="text-xs text-muted-foreground mb-3">
							For {editModal.studentName}
						</p>
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<label className="w-1/3 text-sm">Original Grade</label>
								<input
									type="text"
									value={editModal.originalGrade}
									disabled
									className={`p-1.5 border rounded-md w-2/3 bg-muted text-sm ${getGradeColor(
										editModal.originalGrade,
									)}`}
								/>
							</div>
							<div className="flex items-center gap-3">
								<label className="w-1/3 text-sm">New Grade</label>
								<input
									type="number"
									value={editModal.requestedGrade}
									onChange={(e) =>
										setEditModal((p) => ({
											...p,
											requestedGrade: e.target.value,
										}))
									}
									className={`p-1.5 border rounded-md w-2/3 text-sm ${getGradeColor(
										editModal.requestedGrade === ''
											? null
											: Number(editModal.requestedGrade),
									)}`}
								/>
							</div>
							<div>
								<label className="block mb-1.5 text-sm">
									Reason for Change
								</label>
								<textarea
									value={editModal.reasonForChange}
									onChange={(e) =>
										setEditModal((p) => ({
											...p,
											reasonForChange: e.target.value,
										}))
									}
									className="w-full p-1.5 border rounded-md text-sm"
									rows={3}
								/>
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								onClick={() => setEditModal((p) => ({ ...p, isOpen: false }))}
								className="px-4 py-1.5 text-sm border rounded-md text-foreground hover:bg-muted"
							>
								Cancel
							</button>
							<button
								onClick={handleSaveChanges}
								className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
							>
								Save Changes
							</button>
						</div>
					</div>
				</div>
			)}
			<div className="bg-card border rounded-lg p-4">
				<div className="flex items-end gap-3">
					<div className="flex-1">
						<label className="block text-sm font-medium text-foreground mb-1">
							Academic Year
						</label>
						<select
							value={selectedAcademicYear}
							onChange={(e) => setSelectedAcademicYear(e.target.value)}
							className="w-full sm:w-auto rounded-md border-input bg-background shadow-sm p-2 text-sm"
						>
							{availableAcademicYears.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</div>
					{/* FIX: Refresh button is always shown when a year is selected,
					    not gated on isSelectedAcademicYearAllowed, so teachers can
					    always reload their data regardless of school settings state. */}
					{selectedAcademicYear && (
						<button
							onClick={() => fetchRequests(true)}
							disabled={loading}
							className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-muted disabled:opacity-50 transition-colors"
							title="Refresh grade requests"
						>
							<RefreshCw
								className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
							/>
							Refresh
						</button>
					)}
				</div>
			</div>

			{/* FIX: "Not allowed" is a warning banner only — it no longer hides the
			    request list. Teachers can still view their historical requests for
			    years that are no longer open for new submissions. */}
			{selectedAcademicYear && !isSelectedAcademicYearAllowed && (
				<div className="text-center text-amber-700 p-4 bg-amber-50 border border-amber-200 rounded-lg">
					<p>
						New grade change requests are not allowed for academic year{' '}
						<strong>{selectedAcademicYear}</strong>. Existing requests are shown
						below in read-only mode.
					</p>
				</div>
			)}

			{filteredRequests.length === 0 ? (
				<div className="text-center text-muted-foreground p-8 bg-card border rounded-lg">
					<p>You have not submitted any grade change requests.</p>
				</div>
			) : (
				<>
					<div className="space-y-4">
						{paginatedRequests.map((batch) => (
							<div
								key={batch.batchId}
								className="bg-card border rounded-lg shadow-sm"
							>
								<div className="p-4 border-b bg-muted/50">
									<h3 className="font-semibold text-foreground">
										{batch.subject} - Class {batch.classId}
									</h3>
									<p className="text-sm text-muted-foreground">
										Submitted: {new Date(batch.submittedAt).toLocaleString()}
									</p>
								</div>
								<div className="divide-y divide-border">
									{batch.requests.map((req) => (
										<div
											key={req._id}
											className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center"
										>
											<div className="md:col-span-2">
												<p className="font-medium text-foreground">
													{req.studentName}
												</p>
												<p className="text-sm text-muted-foreground italic">
													"{req.reasonForChange}"
												</p>
											</div>
											<div className="flex items-center justify-center gap-2 font-semibold">
												<span className={getGradeColor(req.originalGrade)}>
													{req.originalGrade}
												</span>
												<ArrowRight className="h-4 w-4 text-muted-foreground" />
												<span className={getGradeColor(req.requestedGrade)}>
													{req.requestedGrade}
												</span>
											</div>
											<div className="flex items-center justify-center gap-2 text-sm">
												{req.status === 'Pending' && (
													<Clock className="h-4 w-4 text-yellow-500" />
												)}
												{req.status === 'Approved' && (
													<CheckCircle className="h-4 w-4 text-green-500" />
												)}
												{req.status === 'Rejected' && (
													<XCircle className="h-4 w-4 text-red-500" />
												)}
												<span className="font-medium">{req.status}</span>
											</div>
											<div className="flex justify-end items-center gap-2">
												{/* FIX: Edit/Withdraw actions remain gated on
												    isSelectedAcademicYearAllowed AND Pending status —
												    read-only view for closed years is intentional. */}
												{req.status === 'Pending' &&
													isSelectedAcademicYearAllowed && (
														<>
															<button
																onClick={() => handleOpenEditModal(req)}
																className="text-sm text-blue-500 hover:underline flex items-center gap-1 px-3 py-1 rounded-md hover:bg-blue-500/10 transition-colors"
															>
																<Edit className="h-4 w-4" /> Edit
															</button>
															<button
																onClick={() => handleWithdraw(req._id)}
																className="text-sm text-red-500 hover:underline flex items-center gap-1 px-3 py-1 rounded-md hover:bg-red-500/10 transition-colors"
															>
																<Trash2 className="h-4 w-4" /> Withdraw
															</button>
														</>
													)}
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between mt-4">
						<span className="text-sm text-muted-foreground">
							Page {currentPage} of {totalPages}
						</span>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
								disabled={currentPage === 1}
								className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 flex items-center gap-1"
							>
								<ChevronLeft className="h-4 w-4" />
								Previous
							</button>
							<button
								onClick={() =>
									setCurrentPage((prev) => Math.min(prev + 1, totalPages))
								}
								disabled={currentPage === totalPages}
								className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 flex items-center gap-1"
							>
								Next
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default TeacherGradeChangeRequests;
