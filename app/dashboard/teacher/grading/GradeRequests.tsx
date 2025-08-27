'use client';
import React, { useState, useEffect, useMemo } from 'react';
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

// --- TYPES ---
interface TeacherInfo {
	teacherId: string;
	name: string;
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

const TeacherGradeChangeRequests = ({
	teacherInfo,
}: {
	teacherInfo: TeacherInfo;
}) => {
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

	const fetchRequests = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await fetch(`/api/grades/requests?academicYear=2025/2026`);
			if (!res.ok)
				throw new Error('Failed to fetch your grade change requests.');
			const data = await res.json();
			setRequests(data.data.report);
		} catch (err) {
			setError(
				'Could not load your grade change requests. Please try again later.'
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRequests();
	}, []);

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

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || 'Failed to withdraw request.');
			}
			await fetchRequests();
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

			if (!res.ok) {
				throw new Error('Failed to update request.');
			}

			await fetchRequests();
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
			<div className="text-center p-8">
				<Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
				<p className="mt-2 text-muted-foreground">Loading your requests...</p>
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
									className="p-2 border rounded-md w-2/3 bg-muted"
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
									className="p-2 border rounded-md w-2/3"
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

			{requests.length === 0 ? (
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
												<span className="text-red-500">
													{req.originalGrade}
												</span>
												<ArrowRight className="h-4 w-4 text-muted-foreground" />
												<span className="text-green-500">
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
			)}
		</div>
	);
};

export default TeacherGradeChangeRequests;
