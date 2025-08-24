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
} from 'lucide-react';

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
	teacherId: string;
	grades: (StudentGrade & { status: 'Approved' | 'Rejected' | 'Pending' })[];
	status: 'Approved' | 'Rejected' | 'Pending' | 'Partially Approved';
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
	subjects: { subject: string; level: string }[];
	classes: { [subject: string]: string[] };
}

interface GradeChangeRequestStudent {
	studentId: string;
	name: string;
	currentGrade: number | null;
	newGrade: string;
	selected: boolean;
	status: 'Approved' | 'Rejected' | 'Pending';
}

interface GradeOverviewProps {
	submittedGrades: GradeSubmission[];
	loading: boolean;
	error: string;
	teacherInfo: TeacherInfo | null;
	onSwitchToSubmit: () => void;
	onGradeChangeRequest: (payload: {
		submissionId: string;
		reason: string;
		changes: { studentId: string; newGrade: number }[];
	}) => Promise<void>;
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
	submittedGrades = null,
	loading = false,
	error = '',
	teacherInfo = null,
	onSwitchToSubmit = () => console.log('Switch to submit'),
	onGradeChangeRequest = async (payload) =>
		console.log('Submitting grade change:', payload),
}) => {
	const [showFilterModal, setShowFilterModal] = useState(false);
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [selectedGrade, setSelectedGrade] = useState<GradeSubmission | null>(
		null
	);
	const [gradeChangeStudents, setGradeChangeStudents] = useState<
		GradeChangeRequestStudent[]
	>([]);
	const [changeReason, setChangeReason] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Filter states
	const [filters, setFilters] = useState({
		subject: '',
		gradeLevel: '',
		period: '',
	});
	// Sorting states
	const [sortConfig, setSortConfig] = useState<{
		key: keyof GradeSubmission | null;
		direction: 'asc' | 'desc';
	}>({ key: 'lastUpdated', direction: 'desc' });

	const getAllGradeLevels = () => {
		if (!teacherInfo?.subjects) return [];
		const gradeLevels = new Set<string>();
		teacherInfo.subjects.forEach((s) => gradeLevels.add(s.level));
		return Array.from(gradeLevels);
	};

	const resetFilters = () =>
		setFilters({ subject: '', gradeLevel: '', period: '' });

	/**
	 * NEW: Derives the overall status of a submission based on its individual grades.
	 */
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

	/**
	 * NEW: Simplified color logic for the modal (Pass/Fail only).
	 */
	const getModalGradeColor = (grade: number | null) => {
		if (grade === null || grade === undefined) return 'text-muted-foreground';
		if (grade >= 70) return 'text-sky-500 font-semibold'; // Blue for pass
		return 'text-destructive font-semibold'; // Red for fail
	};

	const applyFilters = (grades: GradeSubmission[]) =>
		grades?.filter((grade) => {
			if (filters.subject && grade.subject !== filters.subject) return false;
			if (filters.gradeLevel && grade.gradeLevel !== filters.gradeLevel)
				return false;
			if (filters.period && grade.period !== filters.period) return false;
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
		setChangeReason('');
		setShowDetailsModal(true);
	};

	const handleSubmitGradeChange = async () => {
		if (!selectedGrade) return;

		const changes = gradeChangeStudents
			.filter(
				(s) =>
					s.selected && s.newGrade.trim() !== '' && !isNaN(Number(s.newGrade))
			)
			.map((s) => ({ studentId: s.studentId, newGrade: Number(s.newGrade) }));

		if (changes.length === 0) {
			alert(
				'Please select at least one student and provide a valid new grade.'
			);
			return;
		}
		if (!changeReason.trim()) {
			alert('Please provide a reason for the grade change request.');
			return;
		}

		setIsSubmitting(true);
		try {
			await onGradeChangeRequest({
				submissionId: selectedGrade.submissionId,
				reason: changeReason,
				changes,
			});
			alert(`Grade change request submitted for ${changes.length} student(s).`);
			setShowDetailsModal(false);
		} catch (err: any) {
			alert(`Error: ${err.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	const filteredAndSortedGrades = applySorting(applyFilters(submittedGrades));

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
							{selectedGrade.subject} - {selectedGrade.gradeLevel} (
							{periods.find((p) => p.value === selectedGrade.period)?.label})
						</div>
					</div>

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
									<span className="text-muted-foreground">Fails (70):</span>
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
												{/* UPDATED: Using getModalGradeColor here */}
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
														setGradeChangeStudents((prev) =>
															prev.map((s) =>
																s.studentId === student.studentId
																	? { ...s, newGrade: e.target.value }
																	: s
															)
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

						<div className="mt-6 border-t border-border pt-6">
							<h4 className="font-medium text-foreground mb-2">
								Grade Change Request
							</h4>
							<p className="text-sm text-muted-foreground mb-4">
								Select students, enter new grades, and provide a reason.
								Requests require administrator approval.
							</p>
							<textarea
								id="change-reason"
								rows={4}
								value={changeReason}
								onChange={(e) => setChangeReason(e.target.value)}
								placeholder="Provide a detailed reason for the requested changes..."
								className="w-full rounded-md border-border shadow-sm focus:ring-primary focus:border-primary bg-background"
							/>
							{gradeChangeStudents.filter((s) => s.selected).length > 0 && (
								<div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
									<p className="text-sm text-amber-800">
										<strong>
											{gradeChangeStudents.filter((s) => s.selected).length}
										</strong>{' '}
										student(s) selected for grade change request.
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="p-6 border-t bg-muted/50 flex justify-end gap-3">
						<button
							onClick={() => setShowDetailsModal(false)}
							className="px-4 py-2 text-foreground bg-background border border-border rounded-md hover:bg-muted"
						>
							Cancel
						</button>
						<button
							onClick={handleSubmitGradeChange}
							disabled={
								isSubmitting ||
								gradeChangeStudents.filter((s) => s.selected).length === 0 ||
								!changeReason.trim()
							}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
						>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							Submit Request
						</button>
					</div>
				</div>
			</div>
		);

	const renderFilterModal = () => (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div className="bg-background rounded-lg border shadow-xl w-full max-w-sm">
				<div className="p-6 border-b">
					<div className="flex justify-between items-center">
						<h3 className="text-lg font-semibold text-foreground">
							Filter Grades
						</h3>
						<button
							onClick={() => setShowFilterModal(false)}
							className="text-muted-foreground hover:text-foreground"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>
				<div className="p-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							Subject
						</label>
						<select
							value={filters.subject}
							onChange={(e) =>
								setFilters({ ...filters, subject: e.target.value })
							}
							className="mt-1 block w-full rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
						>
							<option value="">All Subjects</option>
							{teacherInfo?.subjects.map((s, i) => (
								<option key={`${s.subject}-${i}`} value={s.subject}>
									{s.subject}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							Class
						</label>
						<select
							value={filters.gradeLevel}
							onChange={(e) =>
								setFilters({ ...filters, gradeLevel: e.target.value })
							}
							className="mt-1 block w-full rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
						>
							<option value="">All Classes</option>
							{getAllGradeLevels().map((c, i) => (
								<option key={`${c}-${i}`} value={c}>
									{c}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							Period
						</label>
						<select
							value={filters.period}
							onChange={(e) =>
								setFilters({ ...filters, period: e.target.value })
							}
							className="mt-1 block w-full rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
						>
							<option value="">All Periods</option>
							{periods.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="p-6 border-t bg-muted/50 flex justify-end gap-3">
					<button
						onClick={resetFilters}
						className="px-4 py-2 text-foreground bg-background border border-border rounded-md hover:bg-muted"
					>
						Reset
					</button>
					<button
						onClick={() => setShowFilterModal(false)}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
					>
						Apply Filters
					</button>
				</div>
			</div>
		</div>
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row gap-4">
				<button
					onClick={onSwitchToSubmit}
					className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-sm"
				>
					<Plus className="h-4 w-4" />
					Submit New Grades
				</button>
				<button
					onClick={() => setShowFilterModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 shadow-sm"
				>
					<Filter className="h-4 w-4" />
					Filter
				</button>
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
										'gradeLevel',
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
												{key
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
								{filteredAndSortedGrades?.map((grade) => {
									{
										/* UPDATED: Using deriveSubmissionStatus to get the calculated status */
									}
									const derivedStatus = deriveSubmissionStatus(grade);
									return (
										<tr key={grade.submissionId} className="hover:bg-muted/50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
												{grade.subject}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
												{grade.gradeLevel}
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
													className="text-primary hover:text-primary/80"
													title="View Details"
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
			{showFilterModal && renderFilterModal()}
		</div>
	);
};

export default GradeOverview;
