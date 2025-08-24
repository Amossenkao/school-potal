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
	Eye,
	Search,
} from 'lucide-react';

// In your actual application, you would import this from your store.
// For this example, we're mocking the store and its data.
const upstairs = {
	name: 'Upstairs Christian Academy',
	slogan: 'Excellence in Education',
	classLevels: {
		Morning: {
			'Self Contained': {
				subjects: [
					'Math',
					'General Science',
					'English',
					'French',
					'Social Studies',
					'Health Science',
					'Physical Education',
					'Computer',
					'Reading',
					'Writing',
					'Spelling',
					'Phonics',
					'Bible',
				],
				classes: [
					{ classId: 'Morning-Daycare', name: 'Daycare' },
					{ classId: 'Morning-Nursery', name: 'Nursery' },
					{ classId: 'Morning-kOne', name: 'K-I' },
					{ classId: 'Morning-kTwo', name: 'K-II' },
					{ classId: 'Morning-GradeOne', name: 'Grade 1' },
					{ classId: 'Morning-GradeTwo', name: 'Grade 2' },
					{ classId: 'Morning-GradeThree', name: 'Grade 3' },
				],
			},
			Elementary: {
				subjects: [
					'Math',
					'General Science',
					'English',
					'French',
					'Social Studies',
					'Health Science',
					'Physical Education',
					'Computer',
					'Reading',
					'Writing',
					'Spelling',
					'Phonics',
					'Bible',
				],
				classes: [
					{ classId: 'Morning-GradeFour', name: 'Grade 4' },
					{ classId: 'Morning-GradeFive', name: 'Grade 5' },
					{ classId: 'Morning-GradeSix', name: 'Grade 6' },
				],
			},
			'Junior High': {
				subjects: [
					'Math',
					'General Science',
					'English',
					'French',
					'Geography',
					'Health Science',
					'Physical Education',
					'Computer',
					'History',
					'Civics',
					'Vocabulary',
					'Phonics',
					'Bible',
					'Agriculture',
					'Literature',
				],
				classes: [
					{ classId: 'Morning-GradeSeven', name: 'Grade 7' },
					{ classId: 'Morning-GradeEight', name: 'Grade 8' },
					{ classId: 'Morning-GradeNine', name: 'Grade 9' },
				],
			},
			'Senior High': {
				subjects: [
					'Math',
					'Biology',
					'English',
					'Physics',
					'Chemistry',
					'Computer',
					'Economics',
					'Government',
					'Geography',
					'History',
					'Literature',
					'Accounting',
					'Bible',
					'French',
					'Agriculture',
				],
				classes: [
					{ classId: 'Morning-GradeTenA', name: 'Grade 10-A' },
					{ classId: 'Morning-GradeTenB', name: 'Grade 10-B' },
					{ classId: 'Morning-GradeElevenA', name: 'Grade 11-A' },
					{ classId: 'Morning-GradeElevenB', name: 'Grade 11-B' },
					{ classId: 'Morning-GradeTwelveA', name: 'Grade 12-A' },
					{ classId: 'Morning-GradeTwelveB', name: 'Grade 12-B' },
				],
			},
		},
		Night: {
			'Self Contained': {
				subjects: ['Math', 'Science', 'English', 'Arts', 'Social Studies'],
				classes: [
					{ classId: 'Night-Nursery', name: 'Nursery' },
					{ classId: 'Night-kOne', name: 'K-I' },
					{ classId: 'Night-kTwo', name: 'K-II' },
					{ classId: 'Night-GradeOne', name: 'Grade 1' },
					{ classId: 'Night-GradeTwo', name: 'Grade 2' },
					{ classId: 'Night-GradeThree', name: 'Grade 3' },
				],
			},
			Elementary: {
				subjects: [
					'Math',
					'General Science',
					'English',
					'French',
					'Social Studies',
					'Health Science',
					'Physical Education',
					'Computer',
					'Reading',
					'Writing',
					'Spelling',
					'Phonics',
					'Bible',
				],
				classes: [
					{ classId: 'Night-GradeFour', name: 'Grade 4' },
					{ classId: 'Night-GradeFive', name: 'Grade 5' },
					{ classId: 'Night-GradeSix', name: 'Grade 6' },
				],
			},
			'Junior High': {
				subjects: [
					'Math',
					'General Science',
					'English',
					'French',
					'Geography',
					'Health Science',
					'Physical Education',
					'Computer',
					'History',
					'Civics',
					'Vocabulary',
					'Phonics',
					'Bible',
					'Agriculture',
					'Literature',
				],
				classes: [
					{ classId: 'Night-GradeSeven', name: 'Grade 7' },
					{ classId: 'Night-GradeEight', name: 'Grade 8' },
					{ classId: 'Night-GradeNine', name: 'Grade 9' },
				],
			},
			'Senior High': {
				subjects: [
					'Math',
					'Biology',
					'English',
					'Physics',
					'Chemistry',
					'Computer',
					'Economics',
					'Government',
					'Geography',
					'History',
					'Literature',
					'Accounting',
					'Bible',
					'French',
					'Agriculture',
				],
				classes: [
					{ classId: 'Night-GradeTen', name: 'Grade 10' },
					{ classId: 'Night-GradeEleven', name: 'Grade 11' },
					{ classId: 'Night-GradeTwelve', name: 'Grade 12' },
				],
			},
		},
	},
};

const useSchoolStore = (selector: (state: any) => any) => {
	const state = {
		school: upstairs,
	};
	return selector(state);
};

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
	teacherId: string;
	teacherName: string;
	submittedAt: string;
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
	teacherId: string;
	teacherName: string;
	grade: number | null;
	status: 'Approved' | 'Rejected' | 'Pending';
	rejectionReason?: string;
	submittedAt: string;
	lastUpdated: string;
}

// Mock data for periods, replace with your actual data source if needed
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

// A simple loading component
const PageLoading = ({ fullScreen = true }: { fullScreen?: boolean }) => (
	<div
		className={`flex justify-center items-center ${
			fullScreen ? 'min-h-screen' : 'py-8'
		}`}
	>
		<Loader2 className="h-8 w-8 animate-spin text-primary" />
	</div>
);

const AdminGradeManagement: React.FC = () => {
	const currentSchool = useSchoolStore((state) => state.school);
	// Data states
	const [submissions, setSubmissions] = useState<GradeSubmission[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Modal states
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);

	// Selection and action states
	const [selectedSubmission, setSelectedSubmission] =
		useState<GradeSubmission | null>(null);
	const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(
		new Set()
	);
	const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
		new Set()
	);
	const [rejectionReason, setRejectionReason] = useState('');
	const [bulkRejectionReason, setBulkRejectionReason] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [actionType, setActionType] = useState<'submission' | 'individual'>(
		'submission'
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [rowsPerPage, setRowsPerPage] = useState<number>(5);

	// Filter and sort states
	const [filters, setFilters] = useState({
		subject: '',
		classId: '',
		period: '',
		status: 'Pending',
	});

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

	// Fetch and process grade data
	const fetchGrades = async () => {
		try {
			setLoading(true);
			setError('');
			// Replace with your actual API endpoint
			const response = await fetch('/api/grades?academicYear=2025/2026');
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			const rawGrades: RawGradeData[] = data.data.report.grades;

			// Group grades by submissionId to form submissions
			const groupedGrades = rawGrades.reduce((acc, grade) => {
				if (!acc[grade.submissionId]) {
					acc[grade.submissionId] = [];
				}
				acc[grade.submissionId].push(grade);
				return acc;
			}, {} as Record<string, RawGradeData[]>);

			// Transform grouped data into a more usable format
			const transformedSubmissions: GradeSubmission[] = Object.values(
				groupedGrades
			).map((grades) => {
				const firstGrade = grades[0];
				const validGrades = grades
					.map((g) => g.grade)
					.filter((g): g is number => g !== null);

				const statuses = new Set(grades.map((g) => g.status));
				let submissionStatus: GradeSubmission['status'] = 'Pending';
				if (statuses.size === 1) {
					submissionStatus = statuses.values().next().value;
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
					teacherId: firstGrade.teacherId,
					teacherName: firstGrade.teacherName,
					submittedAt: firstGrade.submittedAt,
					lastUpdated: firstGrade.lastUpdated,
					grades: grades.map((g) => ({
						studentId: g.studentId,
						name: g.studentName,
						grade: g.grade,
						status: g.status,
						rejectionReason: g.rejectionReason,
					})),
					status: submissionStatus,
					rejectionReason: grades.find((g) => g.rejectionReason)
						?.rejectionReason,
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

			setSubmissions(transformedSubmissions);
		} catch (err) {
			console.error('Error fetching grades:', err);
			setError('Failed to fetch grade submissions. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchGrades();
	}, []);

	// API interaction handlers
	const updateGradesStatus = async (
		payload: {
			submissionId: string;
			studentId: string;
			status: 'Approved' | 'Rejected';
			rejectionReason?: string;
		}[]
	) => {
		try {
			const response = await fetch('/api/grades', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				throw new Error('API request failed');
			}
			await fetchGrades(); // Refresh data on success
		} catch (error) {
			console.error('Error updating grade status:', error);
			// You might want to show an error toast to the user here
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
						selectedStudents.has(student.studentId))
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
						selectedStudents.has(student.studentId))
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
				(s) => s.submissionId === submissionId
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
				(s) => s.submissionId === submissionId
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

	// Filtering and Sorting logic
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

		return filtered;
	}, [submissions, filters, searchQuery, classMap]);

	const totalPages = Math.max(
		1,
		Math.ceil(filteredAndSortedSubmissions.length / rowsPerPage)
	);
	const currentPageSafe = Math.min(currentPage, totalPages);
	const currentSlice = filteredAndSortedSubmissions.slice(
		(currentPageSafe - 1) * rowsPerPage,
		currentPageSafe * rowsPerPage
	);

	// UI helper functions
	const getStatusClasses = (
		status: StudentGrade['status'] | GradeSubmission['status']
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
		status: StudentGrade['status'] | GradeSubmission['status']
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
			? 'text-green-600 dark:text-green-400 font-semibold'
			: 'text-red-600 dark:text-red-400 font-semibold';
	};
	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleString([], {
			dateStyle: 'short',
			timeStyle: 'short',
		});

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
			(g) => g.status === 'Pending'
		);

		return (
			<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
				<div className="bg-card rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border">
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
													(p) => p.value === selectedSubmission.period
												)?.label
											}
										</span>
										<span>
											Submitted: {formatDate(selectedSubmission.submittedAt)}
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

					<div className="p-6 overflow-y-auto flex-grow">
						<div className="bg-muted p-4 rounded-lg mb-6">
							<h5 className="text-sm font-medium mb-2">Summary Statistics</h5>
							<div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Total:</span>
									<span className="ml-2 font-semibold">
										{selectedSubmission.stats.totalStudents}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Passes (≥70):</span>
									<span className="ml-2 font-semibold text-green-600">
										{selectedSubmission.stats.passes}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Fails (&lt;70):</span>
									<span className="ml-2 font-semibold text-red-600">
										{selectedSubmission.stats.fails}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Incomplete:</span>
									<span className="ml-2 font-semibold text-amber-600">
										{selectedSubmission.stats.incompletes}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">Average:</span>
									<span className="ml-2 font-semibold">
										{selectedSubmission.stats.average.toFixed(1)}
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
												onChange={(e) => {
													if (e.target.checked)
														setSelectedStudents(
															new Set(
																selectableStudents.map((g) => g.studentId)
															)
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
										<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
											Rejection Reason
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
														student.status
													)}`}
												>
													{getStatusIcon(student.status)} {student.status}
												</span>
											</td>
											<td className="px-6 py-4 text-sm text-muted-foreground">
												{student.rejectionReason || '-'}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{['Pending', 'Partially Approved'].includes(
						selectedSubmission.status
					) && (
						<div className="p-6 border-t bg-muted flex justify-between items-center">
							<div className="text-sm text-muted-foreground">
								{selectedStudents.size > 0
									? `${selectedStudents.size} pending student(s) selected`
									: 'Actions will apply to all pending students'}
							</div>
							<div className="flex gap-3">
								<button
									onClick={() => setShowDetailsModal(false)}
									className="px-4 py-2 text-foreground bg-card border rounded-md hover:bg-muted"
								>
									Cancel
								</button>
								<button
									onClick={() => {
										setActionType(
											selectedStudents.size > 0 ? 'individual' : 'submission'
										);
										setShowRejectModal(true);
									}}
									className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 flex items-center gap-2"
								>
									<XCircle className="h-4 w-4" /> Reject{' '}
									{selectedStudents.size > 0 ? 'Selected' : 'All Pending'}
								</button>
								<button
									onClick={handleApprove}
									disabled={isProcessing}
									className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
								>
									{isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}{' '}
									<Check className="h-4 w-4" /> Approve{' '}
									{selectedStudents.size > 0 ? 'Selected' : 'All Pending'}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderRejectModal = () => (
		<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div className="bg-card rounded-lg shadow-xl w-full max-w-md border">
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
				<div className="p-6 border-t bg-muted flex justify-end gap-3">
					<button
						onClick={() => setShowRejectModal(false)}
						className="px-4 py-2 text-foreground bg-card border rounded-md hover:bg-muted"
					>
						Cancel
					</button>
					<button
						onClick={handleReject}
						disabled={isProcessing || !rejectionReason.trim()}
						className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-2"
					>
						{isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
						<XCircle className="h-4 w-4" /> Reject
					</button>
				</div>
			</div>
		</div>
	);

	const renderBulkRejectModal = () => (
		<div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
			<div className="bg-card rounded-lg shadow-xl w-full max-w-md border">
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
				<div className="p-6 border-t bg-muted flex justify-end gap-3">
					<button
						onClick={() => setShowBulkRejectModal(false)}
						className="px-4 py-2 text-foreground bg-card border rounded-md hover:bg-muted"
					>
						Cancel
					</button>
					<button
						onClick={handleBulkReject}
						disabled={isProcessing || !bulkRejectionReason.trim()}
						className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-2"
					>
						{isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
						<XCircle className="h-4 w-4" /> Reject {selectedSubmissions.size}{' '}
						Submissions
					</button>
				</div>
			</div>
		</div>
	);

	// Main component render
	return (
		<div className="space-y-6 bg-background text-foreground p-4 md:p-6">
			<div className="bg-card border rounded-lg">
				<div className="p-6">
					<div className="flex justify-between items-start mb-4">
						<div>
							<h2 className="text-2xl font-bold">
								Grade Submissions Management
							</h2>
							<p className="text-muted-foreground mt-1">
								Review and manage grade submissions from all teachers
							</p>
						</div>
						<button
							onClick={fetchGrades}
							disabled={loading}
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
						>
							{loading && <Loader2 className="h-4 w-4 animate-spin" />} Refresh
						</button>
					</div>
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
							<option value="Approved">Approved</option>
							<option value="Rejected">Rejected</option>
							<option value="Partially Approved">Partially Approved</option>
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
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-primary">
								{selectedSubmissions.size} submission(s) selected
							</span>
							<div className="flex gap-2">
								<button
									onClick={handleBulkApprove}
									disabled={isProcessing}
									className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
								>
									{isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
									<Check className="h-3 w-3" /> Approve All Pending
								</button>
								<button
									onClick={() => setShowBulkRejectModal(true)}
									className="px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded-md hover:bg-destructive/90 flex items-center gap-1"
								>
									<XCircle className="h-3 w-3" /> Reject All Pending
								</button>
								<button
									onClick={() => setSelectedSubmissions(new Set())}
									className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-md hover:bg-secondary/80"
								>
									Clear Selection
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Main Submissions Table */}
				<div className="border-t">
					{loading ? (
						<PageLoading fullScreen={false} />
					) : error ? (
						<div className="p-6 text-center text-destructive">{error}</div>
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
																s.status
															)
														).length > 0 &&
														selectedSubmissions.size ===
															filteredAndSortedSubmissions.filter((s) =>
																['Pending', 'Partially Approved'].includes(
																	s.status
																)
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
												Submitted At
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
															submission.submissionId
														)}
														onChange={() =>
															toggleSubmissionSelection(submission.submissionId)
														}
														disabled={
															!['Pending', 'Partially Approved'].includes(
																submission.status
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
															submission.status
														)}`}
													>
														{getStatusIcon(submission.status)}{' '}
														{submission.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
													{formatDate(submission.submittedAt)}
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
							<div className="flex items-center justify-between p-4">
								<div className="text-sm text-muted-foreground">
									Showing{' '}
									<strong>{(currentPageSafe - 1) * rowsPerPage + 1}</strong>–
									<strong>
										{Math.min(
											currentPageSafe * rowsPerPage,
											filteredAndSortedSubmissions.length
										)}
									</strong>{' '}
									of <strong>{filteredAndSortedSubmissions.length}</strong>{' '}
									submissions
								</div>
								<div className="flex items-center space-x-2">
									<button
										className="px-2 py-1 text-sm border rounded-md disabled:opacity-50"
										onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
										disabled={currentPageSafe === 1}
									>
										Previous
									</button>
									<div className="text-sm">
										Page {currentPageSafe} of {totalPages}
									</div>
									<button
										className="px-2 py-1 text-sm border rounded-md disabled:opacity-50"
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
};

export default AdminGradeManagement;
