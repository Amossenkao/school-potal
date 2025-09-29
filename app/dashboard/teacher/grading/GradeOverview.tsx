'use client';
import React, { useState, useMemo } from 'react';
import {
	Plus,
	Filter,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you have a button component
import { useSchoolStore } from '@/store/schoolStore';

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
	gradeLevel: string; // This is actually the classId
	subject: string;
	teacherId: string;
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
	teacherId: string;
	role: 'teacher';
	subjects: { subject: string; level: string; session: string }[];
	classes: { [subject: string]: string[] };
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
}

interface GradeOverviewProps {
	submittedGrades: GradeSubmission[];
	loading: boolean;
	error: string;
	teacherInfo: TeacherInfo | null;
	onSwitchToSubmit: () => void;
	onRefresh: () => void;
	onEditGrade: (submission: GradeSubmission) => void;
	onViewGrade: (submission: GradeSubmission) => void;
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

const PageLoading = ({ fullScreen = true }: { fullScreen?: boolean }) => (
	<div
		className={`flex justify-center items-center ${
			fullScreen ? 'min-h-screen' : 'py-8'
		}`}
	>
		<Loader2 className="h-8 w-8 animate-spin text-primary" />
	</div>
);

const GradeOverview: React.FC<GradeOverviewProps> = ({
	submittedGrades = [],
	loading = false,
	error = '',
	teacherInfo = null,
	onSwitchToSubmit = () => console.log('Switch to submit'),
	onRefresh,
}) => {
	const school = useSchoolStore((state) => state.school);
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
		});
	const [notification, setNotification] = useState<{
		type: 'success' | 'error' | 'info';
		message: string;
	} | null>(null);

	// Filter states
	const [filters, setFilters] = useState({
		subject: '',
		session: '',
		gradeLevel: '',
		classId: '',
		period: '',
	});
	// Sorting states
	const [sortConfig, setSortConfig] = useState<{
		key: keyof GradeSubmission | null;
		direction: 'asc' | 'desc';
	}>({ key: 'lastUpdated', direction: 'desc' });

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

	const availableSessions = useMemo(() => {
		if (!teacherInfo?.subjects) return [];
		return [...new Set(teacherInfo.subjects.map((s) => s.session))];
	}, [teacherInfo]);

	const availableSubjects = useMemo(() => {
		if (!teacherInfo?.subjects) return [];
		let subjects = teacherInfo.subjects;
		if (filters.session) {
			subjects = subjects.filter((s) => s.session === filters.session);
		}
		return [...new Set(subjects.map((s) => s.subject))];
	}, [teacherInfo, filters.session]);

	const availableLevels = useMemo(() => {
		if (!teacherInfo?.subjects) return [];
		let subjects = teacherInfo.subjects;
		if (filters.session) {
			subjects = subjects.filter((s) => s.session === filters.session);
		}
		if (filters.subject) {
			subjects = subjects.filter((s) => s.subject === filters.subject);
		}
		return [...new Set(subjects.map((s) => s.level))];
	}, [teacherInfo, filters.session, filters.subject]);

	const availableClasses = useMemo(() => {
		if (!filters.gradeLevel || !school?.classLevels) return [];
		const classes: any[] = [];
		const sessionToFilter = filters.session || availableSessions[0];

		if (school.classLevels[sessionToFilter]?.[filters.gradeLevel]) {
			classes.push(
				...school.classLevels[sessionToFilter][filters.gradeLevel].classes
			);
		}
		return [...new Map(classes.map((item) => [item.classId, item])).values()];
	}, [filters.gradeLevel, filters.session, school, availableSessions]);

	const showNotification = (
		type: 'success' | 'error' | 'info',
		message: string
	) => {
		setNotification({ type, message });
		setTimeout(() => setNotification(null), 5000);
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
				const teacherSubject = teacherInfo?.subjects.find(
					(s) =>
						s.subject === grade.subject &&
						s.level ===
							Object.entries(school.classLevels[filters.session] || {}).find(
								([, levelData]: [string, any]) =>
									levelData.classes.some(
										(c: any) => c.classId === grade.gradeLevel
									)
							)?.[0] &&
						s.session === filters.session
				);
				if (!teacherSubject) return false;
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
			submission.grades.map((g) => ({
				studentId: g.studentId,
				name: g.name,
				currentGrade: g.grade,
				newGrade: '',
				selected: false,
				status: g.status,
			}))
		);
		setShowDetailsModal(true);
	};

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
		if (hasApprovedChange) {
			setConfirmationModal({ isOpen: true, reason: '' });
		} else {
			handleFinalSubmit();
		}
	};

	const handleFinalSubmit = async () => {
		if (!selectedGrade) return;

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
				reason:
					s.status === 'Approved'
						? confirmationModal.reason
						: 'Teacher grade correction',
			}));

		if (changes.length === 0) {
			return; // This case is handled by the opener, but as a safeguard.
		}

		if (
			changes.some((c) => c.reason === '') &&
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
			} else {
				throw new Error(result.message || 'An unknown error occurred.');
			}

			setShowDetailsModal(false);
		} catch (err: any) {
			showNotification('error', `Error: ${err.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleGradeInputChange = (studentId: string, newGrade: string) => {
		setGradeChangeStudents((prev) =>
			prev.map((s) =>
				s.studentId === studentId
					? { ...s, newGrade, selected: newGrade !== '' }
					: s
			)
		);
	};

	const filteredAndSortedGrades = useMemo(
		() => applySorting(applyFilters(submittedGrades)),
		[submittedGrades, filters, sortConfig, availableClasses]
	);

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

					{/* Confirmation Modal */}
					{confirmationModal.isOpen && (
						<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] backdrop-blur-sm">
							<div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md border">
								<h3 className="text-lg font-semibold mb-2">
									Reason for Change Request
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
									className="w-full rounded-md border-input bg-background p-2"
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
					)}

					<div className="p-6 overflow-y-auto flex-grow">
						<div className="bg-muted p-4 rounded-lg mb-6">
							<h5 className="text-sm font-medium text-foreground mb-2">
								Summary Statistics
							</h5>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Total:</span>
									<span className="ml-2 font-semibold text-foreground">
										{selectedGrade.stats.totalStudents}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Passes (≥70):</span>
									<span className="ml-2 font-semibold text-emerald-500">
										{selectedGrade.stats.passes}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Fails (&lt;70):</span>
									<span className="ml-2 font-semibold text-destructive">
										{selectedGrade.stats.fails}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Average:</span>
									<span className="ml-2 font-semibold text-foreground">
										{selectedGrade.stats.average.toFixed(1)}
									</span>
								</div>
							</div>
						</div>

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
												<input
													type="number"
													min="0"
													max="100"
													value={student.newGrade}
													onChange={(e) =>
														handleGradeInputChange(
															student.studentId,
															e.target.value
														)
													}
													disabled={!student.selected}
													className="w-24 p-2 text-center border border-border rounded-md bg-background disabled:bg-muted disabled:cursor-not-allowed"
												/>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-center">
												<span
													className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
														student.status
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

	return (
		<div className="space-y-6">
			{notification && (
				<div
					className={`p-4 rounded-md text-sm flex items-center gap-3 ${
						notification.type === 'success'
							? 'bg-green-100 text-green-800 border border-green-200'
							: notification.type === 'error'
							? 'bg-red-100 text-red-800 border border-red-200'
							: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
					}`}
				>
					{notification.type === 'success' && (
						<CheckCircle className="h-5 w-5" />
					)}
					{notification.type === 'error' && <XCircle className="h-5 w-5" />}
					{notification.type === 'info' && <Info className="h-5 w-5" />}
					<span>{notification.message}</span>
				</div>
			)}

			<div className="flex flex-col sm:flex-row gap-4">
				<Button onClick={onSwitchToSubmit} className="flex items-center gap-2">
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

				{filters.gradeLevel && availableClasses.length > 1 && (
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
					onChange={(e) => setFilters({ ...filters, period: e.target.value })}
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
					onClick={onRefresh}
					disabled={loading}
					className="flex items-center gap-2"
					variant="outline"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					Refresh
				</Button>
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
				{loading ? (
					<PageLoading fullScreen={false} />
				) : error ? (
					<div className="p-6 text-center text-destructive">{error}</div>
				) : submittedGrades?.length === 0 ? (
					<div className="p-6 text-center text-muted-foreground">
						No grades have been submitted yet.
					</div>
				) : (
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
											onClick={() => handleSort(key as keyof GradeSubmission)}
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
									<th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
										Students
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border bg-background">
								{filteredAndSortedGrades.map((grade) => {
									const derivedStatus = deriveSubmissionStatus(grade);
									const isRejected = derivedStatus === 'Rejected';
									return (
										<tr key={grade.submissionId} className="hover:bg-muted/50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
												{grade.subject}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
												{classMap.get(grade.gradeLevel) || grade.gradeLevel}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
												{periods.find((p) => p.value === grade.period)?.label ??
													grade.period}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span
													className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
														derivedStatus
													)}`}
												>
													{getStatusIcon(derivedStatus)} {derivedStatus}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
												{formatLastUpdated(grade.lastUpdated)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
												{grade.stats?.totalStudents ?? 'N/A'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												<button
													onClick={() => openDetailsModal(grade)}
													className="text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
													title={
														isRejected
															? 'Cannot modify a rejected submission'
															: 'View Details'
													}
													disabled={isRejected}
												>
													<Info className="h-5 w-5" />
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{showDetailsModal && renderDetailsModal()}
		</div>
	);
};

export default GradeOverview;
