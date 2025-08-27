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
} from 'lucide-react';

// Mocked school store
const upstairs = {
	name: 'Upstairs Christian Academy',
	classLevels: {
		Morning: {
			'Senior High': {
				subjects: ['Math', 'Biology', 'English', 'Physics', 'Chemistry'],
				classes: [
					{ classId: 'Morning-GradeTenA', name: 'Grade 10-A' },
					{ classId: 'Morning-GradeElevenA', name: 'Grade 11-A' },
				],
			},
		},
	},
};

const useSchoolStore = (selector: (state: any) => any) => {
	const state = { school: upstairs };
	return selector(state);
};

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
	teacherId: string;
	teacherName: string;
	submittedAt: string;
	lastUpdated: string;
	requests: GradeChangeRequest[];
	status: 'Pending' | 'Approved' | 'Rejected' | 'Partially Approved';
	stats: {
		totalRequests: number;
	};
}

const periods = [
	{ id: 'first', label: 'First Period', value: 'firstPeriod' },
	{ id: 'second', label: 'Second Period', value: 'secondPeriod' },
];

const PageLoading = ({ fullScreen = true }: { fullScreen?: boolean }) => (
	<div
		className={`flex justify-center items-center ${
			fullScreen ? 'min-h-screen' : 'py-8'
		}`}
	>
		<Loader2 className="h-8 w-8 animate-spin text-primary" />
	</div>
);

const GradeRequests: React.FC = () => {
	const currentSchool = useSchoolStore((state) => state.school);
	// Data states
	const [bulkRequests, setBulkRequests] = useState<BulkGradeRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Modal states
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);

	// Selection and action states
	const [selectedBulkRequest, setSelectedBulkRequest] =
		useState<BulkGradeRequest | null>(null);
	const [selectedBulkRequests, setSelectedBulkRequests] = useState<Set<string>>(
		new Set()
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
	const [filters, setFilters] = useState({ status: 'Pending' });

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

	// --- DATA FETCHING & PROCESSING ---
	const fetchRequests = async () => {
		try {
			setLoading(true);
			setError('');
			const response = await fetch('/api/grades/requests');
			if (!response.ok) {
				throw new Error('Failed to fetch grade change requests');
			}
			const data = await response.json();
			setBulkRequests(data.data.report);
		} catch (err) {
			console.error('Error fetching grade change requests:', err);
			setError('Failed to fetch requests. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRequests();
	}, []);

	// API interaction simulation
	const updateRequestStatus = async (payload: {
		requestIds: string[];
		status: 'Approved' | 'Rejected';
		adminRejectionReason?: string;
	}) => {
		setIsProcessing(true);
		try {
			const response = await fetch('/api/grades/requests', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				throw new Error('API request failed');
			}
			await fetchRequests(); // Refresh data on success
		} catch (error) {
			console.error('Error updating grade status:', error);
			// You might want to show an error toast to the user here
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
						selectedIndividualRequests.has(r.requestId)
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
						selectedIndividualRequests.has(r.requestId)
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
			.sort(
				(a, b) =>
					new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
			);
	}, [bulkRequests, filters, searchQuery, classMap]);

	const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
	const currentSlice = filteredRequests.slice(
		(currentPage - 1) * rowsPerPage,
		currentPage * rowsPerPage
	);

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
		status: BulkGradeRequest['status'] | GradeChangeRequest['status']
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
		status: BulkGradeRequest['status'] | GradeChangeRequest['status']
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
		return grade >= 70 ? 'text-green-600' : 'text-red-600';
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
			(g) => g.status === 'Pending'
		);

		return (
			<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
				<div className="bg-card rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border">
					{/* Modal Header */}
					<div className="p-6 border-b">
						<div className="flex justify-between items-start">
							<div>
								<h3 className="text-xl font-semibold">
									Grade Change Request Batch
								</h3>
								<div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
									<span className="flex items-center gap-1.5">
										<User className="h-4 w-4" />
										{selectedBulkRequest.teacherName}
									</span>
									<span className="flex items-center gap-1.5">
										<BookOpen className="h-4 w-4" />
										{selectedBulkRequest.subject}
									</span>
									<span className="flex items-center gap-1.5">
										<GraduationCap className="h-4 w-4" />
										{classMap.get(selectedBulkRequest.classId)}
									</span>
									<span className="flex items-center gap-1.5">
										<Calendar className="h-4 w-4" />
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
					<div className="p-6 overflow-y-auto flex-grow">
						<table className="min-w-full divide-y divide-border">
							<thead className="bg-muted/50">
								<tr>
									<th className="p-3 text-left">
										<input
											type="checkbox"
											onChange={(e) => {
												if (e.target.checked)
													setSelectedIndividualRequests(
														new Set(selectableRequests.map((g) => g.requestId))
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
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
										Student
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
										Grade Change
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
										Teacher's Reason
									</th>
									<th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
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
										<td className="p-3">
											<input
												type="checkbox"
												disabled={req.status !== 'Pending'}
												checked={selectedIndividualRequests.has(req.requestId)}
												onChange={() => {
													const newSet = new Set(selectedIndividualRequests);
													if (newSet.has(req.requestId))
														newSet.delete(req.requestId);
													else newSet.add(req.requestId);
													setSelectedIndividualRequests(newSet);
												}}
												className="rounded border-input disabled:opacity-50"
											/>
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
											{req.studentName}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm text-center font-semibold">
											<span className={getGradeColor(req.originalGrade)}>
												{req.originalGrade ?? 'N/A'}
											</span>
											<ArrowRight className="inline-block h-3 w-3 mx-1 text-muted-foreground" />
											<span className={getGradeColor(req.requestedGrade)}>
												{req.requestedGrade}
											</span>
										</td>
										<td className="px-4 py-4 text-sm text-muted-foreground max-w-sm truncate">
											{req.reasonForChange}
										</td>
										<td className="px-4 py-4 whitespace-nowrap text-sm text-center">
											<span
												className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
													req.status
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
					{/* Modal Footer */}
					{['Pending', 'Partially Approved'].includes(
						selectedBulkRequest.status
					) && (
						<div className="p-6 border-t bg-muted flex justify-between items-center">
							<div className="text-sm text-muted-foreground">
								{selectedIndividualRequests.size > 0
									? `${selectedIndividualRequests.size} pending request(s) selected`
									: 'Actions apply to all pending requests'}
							</div>
							<div className="flex gap-3">
								<button
									onClick={() => setShowRejectModal(true)}
									className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center gap-2"
								>
									<XCircle className="h-4 w-4" /> Reject{' '}
									{selectedIndividualRequests.size > 0
										? 'Selected'
										: 'All Pending'}
								</button>
								<button
									onClick={handleModalApprove}
									disabled={isProcessing}
									className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
								>
									{isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}{' '}
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
		<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div className="bg-card rounded-lg shadow-xl w-full max-w-md border">
				<div className="p-6 border-b flex justify-between items-center">
					<h3 className="text-lg font-semibold text-destructive">
						{isBulk ? 'Bulk Reject Requests' : 'Reject Request(s)'}
					</h3>
					<button
						onClick={() =>
							isBulk ? setShowBulkRejectModal(false) : setShowRejectModal(false)
						}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="p-6">
					<p className="text-muted-foreground mb-4">
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
						rows={4}
						className="w-full rounded-md border-input bg-background shadow-sm focus:ring-destructive focus:border-destructive"
					/>
				</div>
				<div className="p-6 border-t bg-muted flex justify-end gap-3">
					<button
						onClick={isBulk ? handleBulkReject : handleModalReject}
						disabled={
							isProcessing ||
							!(isBulk ? bulkRejectionReason : rejectionReason).trim()
						}
						className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-2"
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
					<div className="flex justify-between items-start mb-4">
						<div>
							<h2 className="text-2xl font-bold">Grade Change Requests</h2>
							<p className="text-muted-foreground mt-1">
								Review, approve, or reject teacher requests to change student
								grades.
							</p>
						</div>
						<button
							onClick={fetchRequests}
							disabled={loading}
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
						>
							{loading && <Loader2 className="h-4 w-4 animate-spin" />} Refresh
						</button>
					</div>
					<div className="flex flex-wrap gap-4 items-center">
						<div className="relative w-full sm:w-auto flex-grow">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Search by teacher, subject, class..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8 w-full rounded-md border-input bg-background shadow-sm p-2 text-sm"
							/>
						</div>
						<select
							value={filters.status}
							onChange={(e) =>
								setFilters((f) => ({ ...f, status: e.target.value }))
							}
							className="w-full sm:w-auto rounded-md border-input bg-background shadow-sm p-2 text-sm"
						>
							<option value="Pending">Pending</option>
							<option value="All">All Statuses</option>
							<option value="Approved">Approved</option>
							<option value="Rejected">Rejected</option>
						</select>
					</div>
				</div>

				{/* Bulk Actions Bar */}
				{selectedBulkRequests.size > 0 && (
					<div className="bg-primary/10 border-t border-primary/20 p-4 flex items-center justify-between">
						<span className="text-sm font-medium text-primary">
							{selectedBulkRequests.size} batch(es) selected
						</span>
						<div className="flex gap-2">
							<button
								onClick={handleBulkApprove}
								disabled={isProcessing}
								className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
							>
								{isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}{' '}
								<Check className="h-3 w-3" /> Approve All Pending
							</button>
							<button
								onClick={() => setShowBulkRejectModal(true)}
								className="px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded-md hover:bg-destructive/90 flex items-center gap-1"
							>
								<XCircle className="h-3 w-3" /> Reject All Pending
							</button>
							<button
								onClick={() => setSelectedBulkRequests(new Set())}
								className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-md hover:bg-secondary/80"
							>
								Clear Selection
							</button>
						</div>
					</div>
				)}

				{/* Main Table */}
				<div className="border-t">
					{loading ? (
						<PageLoading fullScreen={false} />
					) : error ? (
						<div className="p-6 text-center text-destructive">{error}</div>
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
																s.status
															)
														).length > 0 &&
														selectedBulkRequests.size ===
															filteredRequests.filter((s) =>
																['Pending', 'Partially Approved'].includes(
																	s.status
																)
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
																batch.status
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
													{batch.stats.totalRequests}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm">
													<span
														className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
															batch.status
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
							<div className="flex items-center justify-between p-4">
								<div className="text-sm text-muted-foreground">
									Showing <strong>{(currentPage - 1) * rowsPerPage + 1}</strong>
									–
									<strong>
										{Math.min(
											currentPage * rowsPerPage,
											filteredRequests.length
										)}
									</strong>{' '}
									of <strong>{filteredRequests.length}</strong> batches
								</div>
								<div className="flex items-center space-x-2">
									<button
										className="px-2 py-1 text-sm border rounded-md disabled:opacity-50"
										onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
										disabled={currentPage === 1}
									>
										Previous
									</button>
									<div className="text-sm">
										Page {currentPage} of {totalPages}
									</div>
									<button
										className="px-2 py-1 text-sm border rounded-md disabled:opacity-50"
										onClick={() =>
											setCurrentPage((p) => Math.min(p + 1, totalPages))
										}
										disabled={currentPage === totalPages}
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

export default GradeRequests;
