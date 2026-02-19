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
} from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import { useSchoolStore } from '@/store/schoolStore';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	getTeacherAcademicYears,
	pickMostRecentAcademicYear,
	sortAcademicYearsDesc,
} from '@/utils/academicYearOptions';

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

const TeacherGradeChangeRequests = ({
	teacherInfo,
}: {
	teacherInfo: TeacherInfo;
}) => {
	const teacherAcademicYears = useMemo(
		() => getTeacherAcademicYears(teacherInfo),
		[teacherInfo],
	);
	const availableAcademicYears = useMemo(
		() => teacherAcademicYears,
		[teacherAcademicYears],
	);
	const school = useSchoolStore((state) => state.school);
	const allowedAcademicYears = useMemo(
		() =>
			sortAcademicYearsDesc(
				school?.settings?.teacherSettings?.gradeChangeRequestAcademicYears || [],
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
			if (!isSelectedAcademicYearAllowed) {
				setRequests([]);
				setError('');
				setLoading(false);
				return;
			}
			try {
				const academicYear = selectedAcademicYear;
				const storeState = useSchoolStore.getState();
				const cachedByYear = storeState.gradeRequestsByAcademicYear || {};
				const scopedStoreSnapshot = getScopedAcademicYearValue(
					cachedByYear,
					academicYear,
				);
				const hasYearSnapshot = Boolean(scopedStoreSnapshot.key);
				const scopedStoreRequests = Array.isArray(scopedStoreSnapshot.value)
					? scopedStoreSnapshot.value
					: [];
				const cacheKey = `gradeRequests:${academicYear}:${
					teacherInfo?.username || 'teacher'
				}`;
				if (!skipCache && hasYearSnapshot) {
					setRequests(scopedStoreRequests as BatchRequest[]);
					setError('');
					setLoading(false);
					return;
				}

				if (!skipCache) {
					const cached = getClientCache<BatchRequest[]>(cacheKey);
					if (cached !== null) {
						setRequests(cached);
						setError('');
						setLoading(false);
						return;
					}
				}

				setLoading(true);
				setError('');
				const res = await fetch(
					`/api/grades/requests?academicYear=${academicYear}`
				);
				if (!res.ok)
					throw new Error('Failed to fetch your grade change requests.');
				const data = await res.json();
				const report = Array.isArray(data?.data?.report) ? data.data.report : [];
				setRequests(report);
				setGradeRequestsForYear(academicYear, report);
				setClientCache(cacheKey, report);
			} catch (err) {
				setError(
					'Could not load your grade change requests. Please try again later.'
				);
			} finally {
				setLoading(false);
			}
		},
		[
			teacherInfo?.username,
			selectedAcademicYear,
			setGradeRequestsForYear,
			isSelectedAcademicYearAllowed,
		]
	);

	useEffect(() => {
		if (
			!teacherInfo?.username ||
			!selectedAcademicYear ||
			!isSelectedAcademicYearAllowed
		) {
			setRequests([]);
			setLoading(false);
			return;
		}
		void fetchRequests();
	}, [
		teacherInfo?.username,
		selectedAcademicYear,
		fetchRequests,
		isSelectedAcademicYearAllowed,
	]);

	useEffect(() => {
		if (
			!teacherInfo?.username ||
			!selectedAcademicYear ||
			!Array.isArray(scopedGradeRequests)
		) {
			return;
		}
		setRequests(scopedGradeRequests as BatchRequest[]);
		setError('');
		setLoading(false);
	}, [teacherInfo?.username, selectedAcademicYear, scopedGradeRequests]);

	useEffect(() => {
		const handleRequestUpdate = (
			event: CustomEvent<{ academicYear?: string; teacherUsername?: string }>
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
			handleRequestUpdate as EventListener
		);
		return () => {
			window.removeEventListener(
				'grading:requests:updated',
				handleRequestUpdate as EventListener
			);
		};
	}, [teacherInfo?.username, selectedAcademicYear, fetchRequests]);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedAcademicYear]);

	// Pagination Logic
	const paginatedRequests = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return requests.slice(startIndex, startIndex + itemsPerPage);
	}, [requests, currentPage, itemsPerPage]);

	const totalPages = Math.ceil(requests.length / itemsPerPage);

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
					'You are offline. Request withdrawal was queued and will sync when you reconnect.'
				);
				return;
			}
			await fetchRequests(true);
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
					'You are offline. Request update was queued and will sync when you reconnect.'
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
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-semibold">
								Edit Grade Change Request
							</h3>
							<button
								onClick={() => setEditModal((p) => ({ ...p, isOpen: false }))}
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<p className="text-sm text-muted-foreground mb-4">
							For {editModal.studentName}
						</p>
						<div className="space-y-4">
							<div className="flex items-center gap-4">
								<label className="w-1/3">Original Grade</label>
								<input
									type="text"
									value={editModal.originalGrade}
									disabled
									className={`p-2 border rounded-md w-2/3 bg-muted ${getGradeColor(
										editModal.originalGrade,
									)}`}
								/>
							</div>
							<div className="flex items-center gap-4">
								<label className="w-1/3">New Grade</label>
								<input
									type="number"
									value={editModal.requestedGrade}
									onChange={(e) =>
										setEditModal((p) => ({
											...p,
											requestedGrade: e.target.value,
										}))
									}
									className={`p-2 border rounded-md w-2/3 ${getGradeColor(
										editModal.requestedGrade === ''
											? null
											: Number(editModal.requestedGrade),
									)}`}
								/>
							</div>
							<div>
								<label className="block mb-2">Reason for Change</label>
								<textarea
									value={editModal.reasonForChange}
									onChange={(e) =>
										setEditModal((p) => ({
											...p,
											reasonForChange: e.target.value,
										}))
									}
									className="w-full p-2 border rounded-md"
									rows={3}
								/>
							</div>
						</div>
						<div className="mt-6 flex justify-end">
							<button
								onClick={handleSaveChanges}
								className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
							>
								Save Changes
							</button>
						</div>
					</div>
				</div>
			)}
			<div className="bg-card border rounded-lg p-4">
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
			{selectedAcademicYear && !isSelectedAcademicYearAllowed ? (
				<div className="text-center text-amber-700 p-8 bg-amber-50 border border-amber-200 rounded-lg">
					<p>
						Grade requests are not allowed for academic year{' '}
						<strong>{selectedAcademicYear}</strong>. Please select an allowed
						academic year.
					</p>
				</div>
			) : null}
			{selectedAcademicYear && isSelectedAcademicYearAllowed && requests.length === 0 ? (
				<div className="text-center text-muted-foreground p-8 bg-card border rounded-lg">
					<p>You have not submitted any grade change requests.</p>
				</div>
			) : selectedAcademicYear && isSelectedAcademicYearAllowed ? (
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
												{req.status === 'Pending' && (
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
			) : null}
		</div>
	);
};

export default TeacherGradeChangeRequests;
