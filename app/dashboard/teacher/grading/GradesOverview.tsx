'use client';

import React, { useState, useEffect } from 'react';
import {
	BookOpen,
	Plus,
	Eye,
	Edit,
	Filter,
	Calendar,
	Users,
	BarChart3,
	CheckCircle,
	Clock,
	AlertCircle,
	X,
	Send,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Loader2,
	Lock,
	Info,
	Check,
} from 'lucide-react';
import { PageLoading } from '@/components/loading';

// Types based on the MongoDB schema and API responses
interface StudentGrade {
	studentId: string;
	name: string;
	grade: number | null;
	status: 'Approved' | 'Rejected' | 'Pending';
	rank?: number;
}

interface SubjectGrades {
	academicYear: string;
	period: string;
	gradeLevel: string;
	subject: string;
	teacherId: string;
	grades: StudentGrade[];
	stats: {
		incompletes: number;
		passes: number;
		fails: number;
		average: number;
	};
}

interface TeacherInfo {
	name: string;
	userId: string;
	subjects: string[];
	classes: { [subject: string]: string[] };
}

interface StudentForGrading {
	studentId: string;
	name: string;
	grade: number | '';
}

const periods = [
	{ id: 'first', label: 'First Period', value: 'first' },
	{ id: 'second', label: 'Second Period', value: 'second' },
	{ id: 'third', label: 'Third Period', value: 'third' },
	{ id: 'third_exam', label: 'Third Period Exam', value: 'third_exam' },
	{ id: 'fourth', label: 'Fourth Period', value: 'fourth' },
	{ id: 'fifth', label: 'Fifth Period', value: 'fifth' },
	{ id: 'sixth', label: 'Sixth Period', value: 'sixth' },
	{ id: 'sixth_exam', label: 'Sixth Period Exam', value: 'sixth_exam' },
];

const TeacherGradeManagement = () => {
	const [activeTab, setActiveTab] = useState('overview');
	const [showEditModal, setShowEditModal] = useState(false);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showSubmitModal, setShowSubmitModal] = useState(false);
	const [showFilterModal, setShowFilterModal] = useState(false);
	const [selectedGradeForEdit, setSelectedGradeForEdit] =
		useState<SubjectGrades | null>(null);
	const [selectedGradeForView, setSelectedGradeForView] =
		useState<SubjectGrades | null>(null);
	const [editReason, setEditReason] = useState('');
	const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
	const [selectedSubject, setSelectedSubject] = useState('');
	const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
	const [selectedMasterGradeLevel, setSelectedMasterGradeLevel] = useState('');
	const [selectedMasterSubject, setSelectedMasterSubject] = useState('');
	const [studentsForGrading, setStudentsForGrading] = useState<
		StudentForGrading[]
	>([]);
	const [gradesToSubmit, setGradesToSubmit] = useState<StudentForGrading[]>([]);
	const [masterGradesData, setMasterGradesData] = useState<any[] | null>(null);
	const [editStudents, setEditStudents] = useState<any[]>([]);

	// API Data States
	const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
	const [submittedGrades, setSubmittedGrades] = useState<SubjectGrades[]>([]);
	const [academicYear, setAcademicYear] = useState<string>('');

	// Loading and Error States
	const [loading, setLoading] = useState({
		teacherInfo: true,
		submittedGrades: false,
		studentsForGrading: false,
		submittingGrades: false,
		masterGrades: false,
		studentsForEdit: false,
		submittingEditRequest: false,
	});
	const [error, setError] = useState({
		teacherInfo: '',
		submittedGrades: '',
		studentsForGrading: '',
		masterGrades: '',
		studentsForEdit: '',
	});

	// Filter states
	const [filters, setFilters] = useState({
		subject: '',
		gradeLevel: '',
		period: '',
	});

	// Sorting states
	const [sortConfig, setSortConfig] = useState<{
		key: keyof SubjectGrades | null;
		direction: 'asc' | 'desc';
	}>({
		key: null,
		direction: 'asc',
	});

	const getAcademicYear = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;
		if (currentMonth >= 9) {
			return `${currentYear}/${currentYear + 1}`;
		} else {
			return `${currentYear - 1}/${currentYear}`;
		}
	};

	// Fetch teacher info on component mount
	useEffect(() => {
		const fetchTeacherInfo = async () => {
			setLoading((prev) => ({ ...prev, teacherInfo: true }));
			try {
				const res = await fetch('/api/auth/me');
				if (!res.ok) throw new Error('Failed to fetch teacher info');
				const data = await res.json();
				setTeacherInfo(data.user);
				setAcademicYear(getAcademicYear());
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
		};
		fetchTeacherInfo();
	}, []);

	// Fetch submitted grades when activeTab is 'overview'
	useEffect(() => {
		if (activeTab === 'overview' && teacherInfo) {
			const fetchSubmittedGrades = async () => {
				setLoading((prev) => ({ ...prev, submittedGrades: true }));
				try {
					const res = await fetch(
						`/api/grades?academicYear=${academicYear}&teacherId=${teacherInfo.userId}`
					);
					if (!res.ok) throw new Error('Failed to fetch submitted grades');
					const data = await res.json();
					setSubmittedGrades(data.data.grades);
					console.log('SUBMITTED: ', data);
					setError((prev) => ({ ...prev, submittedGrades: '' }));
				} catch (err) {
					setError((prev) => ({
						...prev,
						submittedGrades: 'Failed to load submitted grades.',
					}));
					console.error(err);
				} finally {
					setLoading((prev) => ({ ...prev, submittedGrades: false }));
				}
			};
			fetchSubmittedGrades();
		}
	}, [activeTab, academicYear, teacherInfo]);

	// Function to load students for grading from the backend
	const loadStudentsForGrading = async () => {
		if (!selectedSubject || !selectedGradeLevel) return;

		setLoading((prev) => ({ ...prev, studentsForGrading: true }));
		setError((prev) => ({ ...prev, studentsForGrading: '' }));
		setStudentsForGrading([]);
		setGradesToSubmit([]);

		try {
			// Step 1: Fetch students for the selected class
			const studentsRes = await fetch(
				`/api/students?gradeLevel=${selectedGradeLevel}`
			);
			if (!studentsRes.ok)
				throw new Error('Failed to fetch students for class');
			const studentsData = await studentsRes.json();
			const studentsList = studentsData.user;

			// Step 2: Fetch existing grades for all students in the selected subject/class/periods
			const existingGradesRes = await fetch(
				`/api/grades?academicYear=${academicYear}&gradeLevel=${selectedGradeLevel}&subject=${selectedSubject}&teacherId=${teacherInfo?.userId}`
			);
			if (!existingGradesRes.ok)
				throw new Error('Failed to fetch existing grades');
			const existingGradesData = await existingGradesRes.json();

			const existingGradesMap: {
				[studentId: string]: { [period: string]: number };
			} = {};
			if (existingGradesData.grades.length > 0) {
				const subjectData = existingGradesData.grades.find(
					(g: any) =>
						g.gradeLevel === selectedGradeLevel && g.subject === selectedSubject
				);
				if (subjectData) {
					subjectData.grades.forEach((g: any) => {
						if (!existingGradesMap[g.studentId]) {
							existingGradesMap[g.studentId] = {};
						}
					});
				}
			}

			const initialStudentsForGrading = studentsList.map((student: any) => ({
				studentId: student.userId,
				name: student.name,
				grade: '',
			}));
			setStudentsForGrading(initialStudentsForGrading);
			setGradesToSubmit(initialStudentsForGrading);
		} catch (err) {
			setError((prev) => ({
				...prev,
				studentsForGrading: 'Failed to load students and existing grades.',
			}));
			console.error(err);
		} finally {
			setLoading((prev) => ({ ...prev, studentsForGrading: false }));
		}
	};

	const handleGradeChange = (studentId: string, value: string) => {
		setGradesToSubmit((prev) =>
			prev.map((student) =>
				student.studentId === studentId
					? { ...student, grade: value === '' ? '' : Number(value) }
					: student
			)
		);
	};

	const handleSubmitGrades = async () => {
		if (selectedPeriods.length === 0) {
			alert('Please select at least one period to submit grades for.');
			return;
		}

		setLoading((prev) => ({ ...prev, submittingGrades: true }));

		try {
			for (const period of selectedPeriods) {
				const gradesToSubmitForPeriod = gradesToSubmit
					.filter((student) => student.grade !== '' && student.grade !== null)
					.map((student) => ({
						studentId: student.studentId,
						name: student.name,
						grade: student.grade,
						status: 'Pending',
					}));

				if (gradesToSubmitForPeriod.length === 0) {
					continue;
				}

				const payload = {
					academicYear,
					period,
					gradeLevel: selectedGradeLevel,
					subject: selectedSubject,
					teacherId: teacherInfo?.userId,
					grades: gradesToSubmitForPeriod,
				};

				const res = await fetch('/api/grades', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});

				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(
						errorData.message || `Failed to submit grades for ${period}`
					);
				}
			}

			alert('Grades submitted successfully!');
			setStudentsForGrading([]);
			setGradesToSubmit([]);
			setSelectedPeriods([]);
			setSelectedSubject('');
			setSelectedGradeLevel('');
			setActiveTab('overview');
		} catch (err: any) {
			alert(err.message);
			console.error('Error submitting grades:', err);
		} finally {
			setLoading((prev) => ({ ...prev, submittingGrades: false }));
		}
	};

	const loadStudentsForEdit = async (submission: SubjectGrades) => {
		if (!submission) return;
		setLoading((prev) => ({ ...prev, studentsForEdit: true }));
		setError((prev) => ({ ...prev, studentsForEdit: '' }));

		try {
			const studentsWithGrades = submission.grades.map((student) => ({
				...student,
				currentGrade: student.grade,
				newGrade: student.grade,
				selected: false,
			}));

			setEditStudents(studentsWithGrades);
			setSelectedGradeForEdit(submission);
			setShowEditModal(true);
		} catch (err) {
			setError((prev) => ({
				...prev,
				studentsForEdit: 'Failed to load student grades for editing.',
			}));
			console.error(err);
		} finally {
			setLoading((prev) => ({ ...prev, studentsForEdit: false }));
		}
	};

	const handleEditGradeChange = (studentId: string, value: string) => {
		setEditStudents((prev) =>
			prev.map((student) =>
				student.studentId === studentId
					? { ...student, newGrade: value === '' ? '' : Number(value) }
					: student
			)
		);
	};

	const handleSubmitEditRequest = async () => {
		if (!selectedGradeForEdit) return;

		const selectedStudents = editStudents.filter((student) => student.selected);

		if (selectedStudents.length === 0) {
			alert('Please select at least one student for grade changes.');
			return;
		}

		if (!editReason.trim()) {
			alert('Please provide a reason for the grade change request.');
			return;
		}

		setLoading((prev) => ({ ...prev, submittingEditRequest: true }));

		try {
			for (const student of selectedStudents) {
				if (student.newGrade === '') {
					continue;
				}

				const payload = {
					academicYear: selectedGradeForEdit.academicYear,
					period: selectedGradeForEdit.period,
					gradeLevel: selectedGradeForEdit.gradeLevel,
					subject: selectedGradeForEdit.subject,
					studentId: student.studentId,
					grade: student.newGrade,
					status: 'Pending',
				};

				const res = await fetch('/api/grades', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});

				if (!res.ok) {
					const errorData = await res.json();
					throw new Error(
						errorData.message ||
							`Failed to submit edit request for student ${student.name}`
					);
				}
			}

			alert('Grade change request has been sent for approval.');
			setShowEditModal(false);
			setSelectedGradeForEdit(null);
			setEditReason('');
			setEditStudents([]);
			setActiveTab('overview');
		} catch (err: any) {
			alert(err.message);
			console.error('Error submitting edit request:', err);
		} finally {
			setLoading((prev) => ({ ...prev, submittingEditRequest: false }));
		}
	};

	// Fetch master grades when activeTab is 'master' and selections are made
	useEffect(() => {
		if (
			activeTab === 'master' &&
			selectedMasterGradeLevel &&
			selectedMasterSubject
		) {
			const fetchMasterGrades = async () => {
				setLoading((prev) => ({ ...prev, masterGrades: true }));
				setError((prev) => ({ ...prev, masterGrades: '' }));
				try {
					const res = await fetch(
						`/api/grades?academicYear=${academicYear}&gradeLevel=${selectedMasterGradeLevel}&subject=${selectedMasterSubject}`
					);
					if (!res.ok) throw new Error('Failed to fetch master grade sheet');
					const data = await res.json();
					setMasterGradesData(data.grades);
				} catch (err) {
					setError((prev) => ({
						...prev,
						masterGrades: 'Failed to load master grade sheet.',
					}));
					console.error(err);
				} finally {
					setLoading((prev) => ({ ...prev, masterGrades: false }));
				}
			};
			fetchMasterGrades();
		}
	}, [
		activeTab,
		academicYear,
		selectedMasterGradeLevel,
		selectedMasterSubject,
	]);

	// Helper functions
	const getAllGradeLevels = () => {
		if (!teacherInfo) return [];
		const gradeLevels = new Set<string>();
		Object.values(teacherInfo.classes).forEach((classes) => {
			classes.forEach((cls) => gradeLevels.add(cls));
		});
		return Array.from(gradeLevels);
	};

	const resetFilters = () => {
		setFilters({
			subject: '',
			gradeLevel: '',
			period: '',
		});
	};

	const getGradeColor = (grade: number | null) => {
		if (grade === null || grade === undefined) return 'text-muted-foreground';
		if (grade >= 90) return 'text-green-600 dark:text-green-400 font-semibold';
		if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
		if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	};

	const applyFilters = (grades: SubjectGrades[]) => {
		return grades?.filter((grade) => {
			if (filters.subject && grade.subject !== filters.subject) return false;
			if (filters.gradeLevel && grade.gradeLevel !== filters.gradeLevel)
				return false;
			if (filters.period && grade.period !== filters.period) return false;
			return true;
		});
	};

	const applySorting = (grades: SubjectGrades[]) => {
		if (!sortConfig.key) return grades;
		return grades;
	};

	const getSortIcon = (columnName: keyof SubjectGrades) => {
		if (sortConfig.key !== columnName) {
			return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
		}
		return sortConfig.direction === 'asc' ? (
			<ArrowUp className="h-3 w-3 text-foreground" />
		) : (
			<ArrowDown className="h-3 w-3 text-foreground" />
		);
	};

	const getStatusColor = (status: 'Approved' | 'Rejected' | 'Pending') => {
		switch (status) {
			case 'Approved':
				return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
			case 'Pending':
				return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};

	const getStatusIcon = (status: 'Approved' | 'Rejected' | 'Pending') => {
		switch (status) {
			case 'Approved':
				return <CheckCircle className="h-4 w-4" />;
			case 'Pending':
				return <Clock className="h-4 w-4" />;
			case 'Rejected':
				return <AlertCircle className="h-4 w-4" />;
			default:
				return <AlertCircle className="h-4 w-4" />;
		}
	};

	const getAvailableSubjects = () => {
		if (!teacherInfo || !selectedMasterGradeLevel) return [];
		const subjectSet = new Set<string>();
		Object.entries(teacherInfo.classes).forEach(([subject, gradeLevels]) => {
			if (gradeLevels.includes(selectedMasterGradeLevel)) {
				subjectSet.add(subject);
			}
		});
		return Array.from(subjectSet);
	};

	// Generate unique key for each grade row
	const generateGradeKey = (grade: SubjectGrades) => {
		return `${grade.academicYear}-${grade.period}-${grade.gradeLevel}-${grade.subject}-${grade.teacherId}`;
	};

	const filteredAndSortedGrades = applySorting(applyFilters(submittedGrades));

	// Render logic for different tabs
	const renderOverview = () => (
		<div className="space-y-6">
			{/* Actions */}
			<div className="flex flex-col sm:flex-row gap-4">
				<button
					onClick={() => setActiveTab('submit')}
					className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
				>
					<Plus className="h-4 w-4" />
					Submit New Grades
				</button>
				<button
					onClick={() => setShowFilterModal(true)}
					className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
				>
					<Filter className="h-4 w-4" />
					Filter
				</button>
			</div>
			{/* Grades Table */}
			<div className="bg-card border rounded-lg overflow-hidden">
				<div className="p-6 border-b border-border">
					<h3 className="text-lg font-semibold text-foreground">
						Recent Grade Submissions
					</h3>
					<p className="text-muted-foreground">
						Track your submitted and pending grade submissions
					</p>
				</div>
				{loading.submittedGrades ? (
					<PageLoading fullScreen={false} />
				) : error.submittedGrades ? (
					<div className="p-6 text-center text-destructive">
						{error.submittedGrades}
					</div>
				) : submittedGrades?.length === 0 ? (
					<div className="p-6 text-center text-muted-foreground">
						No grades have been submitted yet.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80">
										<div className="flex items-center gap-2">Subject</div>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80">
										<div className="flex items-center gap-2">Class</div>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80">
										<div className="flex items-center gap-2">Period</div>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Average
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{filteredAndSortedGrades?.map((grade) => (
									<tr
										key={generateGradeKey(grade)}
										className="hover:bg-muted/50"
									>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
											{grade.subject}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
											{grade.gradeLevel}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
											{periods.find((p) => p.value === grade.period)?.label ||
												grade.period}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
											<span className={getGradeColor(grade.stats.average)}>
												{grade.stats.average.toFixed(2)}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex items-center gap-2">
												<button
													onClick={() => loadStudentsForEdit(grade)}
													className="text-primary hover:text-primary/80"
													title="Edit Grades"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() => {
														setSelectedGradeForView(grade);
														setShowViewModal(true);
													}}
													className="text-secondary-foreground hover:text-secondary-foreground/80"
													title="View Grades"
												>
													<Eye className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);

	const renderSubmitGrades = () => (
		<div className="space-y-6">
			<div className="p-6 bg-card border rounded-lg">
				<h3 className="text-xl font-semibold mb-2">Submit New Grades</h3>
				<p className="text-muted-foreground mb-6">
					Select a class, subject, and periods to start grading.
				</p>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div>
						<label
							htmlFor="subject-select"
							className="block text-sm font-medium text-muted-foreground"
						>
							Subject
						</label>
						<select
							id="subject-select"
							value={selectedSubject}
							onChange={(e) => setSelectedSubject(e.target.value)}
							className="mt-1 block w-full rounded-md border-border bg-background py-2 pl-3 pr-10 text-foreground focus:border-primary focus:ring-primary sm:text-sm"
						>
							<option value="">Select a Subject</option>
							{teacherInfo?.subjects.map((subject, index) => (
								<option key={`subject-${subject}-${index}`} value={subject}>
									{subject}
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							htmlFor="class-select"
							className="block text-sm font-medium text-muted-foreground"
						>
							Class
						</label>
						<select
							id="class-select"
							value={selectedGradeLevel}
							onChange={(e) => setSelectedGradeLevel(e.target.value)}
							className="mt-1 block w-full rounded-md border-border bg-background py-2 pl-3 pr-10 text-foreground focus:border-primary focus:ring-primary sm:text-sm"
							disabled={!selectedSubject}
						>
							<option value="">Select a Class</option>
							{selectedSubject &&
								teacherInfo?.classes[selectedSubject]?.map((cls, index) => (
									<option key={`class-${cls}-${index}`} value={cls}>
										{cls}
									</option>
								))}
						</select>
					</div>
					<div>
						<label
							htmlFor="period-select"
							className="block text-sm font-medium text-muted-foreground mb-2"
						>
							Periods
						</label>
						<div className="flex flex-wrap gap-2">
							{periods.map((p) => (
								<div
									key={`period-${p.id}`}
									className="relative flex items-start"
								>
									<div className="flex h-5 items-center">
										<input
											id={`period-checkbox-${p.id}`}
											name="periods"
											type="checkbox"
											className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
											checked={selectedPeriods.includes(p.value)}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedPeriods((prev) => [...prev, p.value]);
												} else {
													setSelectedPeriods((prev) =>
														prev.filter((period) => period !== p.value)
													);
												}
											}}
										/>
									</div>
									<div className="ml-3 text-sm">
										<label
											htmlFor={`period-checkbox-${p.id}`}
											className="font-medium text-foreground"
										>
											{p.label}
										</label>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<button
					onClick={loadStudentsForGrading}
					className="w-full inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-sm disabled:opacity-50"
					disabled={
						!selectedSubject ||
						!selectedGradeLevel ||
						loading.studentsForGrading
					}
				>
					{loading.studentsForGrading ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						'Load Students for Grading'
					)}
				</button>
			</div>

			{studentsForGrading.length > 0 && (
				<div className="bg-card border rounded-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h3 className="text-xl font-semibold">
								Grades for {selectedGradeLevel} - {selectedSubject}
							</h3>
						</div>
					</div>

					{error.studentsForGrading && (
						<div className="text-destructive mb-4 p-3 bg-destructive/10 rounded-lg">
							{error.studentsForGrading}
						</div>
					)}

					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-border">
							<thead className="bg-muted">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Student Name
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Grade
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border bg-card">
								{gradesToSubmit.map((student) => (
									<tr key={`student-grading-${student.studentId}`}>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
											{student.name}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
											<input
												type="number"
												value={student.grade}
												onChange={(e) =>
													handleGradeChange(student.studentId, e.target.value)
												}
												min="0"
												max="100"
												placeholder="Enter grade"
												className="w-24 rounded-md border-border bg-background text-foreground text-center focus:ring-primary focus:border-primary"
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="mt-6 flex justify-end items-center">
						<button
							onClick={handleSubmitGrades}
							className="inline-flex justify-center rounded-md border border-transparent bg-primary px-6 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-sm disabled:opacity-50"
							disabled={
								loading.submittingGrades ||
								gradesToSubmit.length === 0 ||
								selectedPeriods.length === 0
							}
						>
							{loading.submittingGrades ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								`Submit Grades`
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);

	const renderMasterSheet = () => {
		const getMasterSheetData = () => {
			if (!masterGradesData || masterGradesData.length === 0) return null;
			const studentGradesMap = new Map();
			masterGradesData.forEach((submission) => {
				submission.grades.forEach((studentGrade) => {
					const studentId = studentGrade.studentId;
					if (!studentGradesMap.has(studentId)) {
						studentGradesMap.set(studentId, {
							studentId: studentId,
							name: studentGrade.name,
							grades: {},
						});
					}
					const studentEntry = studentGradesMap.get(studentId);
					studentEntry.grades[submission.period] = studentGrade.grade;
				});
			});
			return Array.from(studentGradesMap.values()).sort((a, b) =>
				a.name.localeCompare(b.name)
			);
		};

		const consolidatedData = getMasterSheetData();

		return (
			<div className="space-y-6">
				<div className="p-6 bg-card border rounded-lg">
					<h3 className="text-xl font-semibold mb-2">Master Grade Sheet</h3>
					<p className="text-muted-foreground mb-6">
						View all grades for a class and subject.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<div>
							<label
								htmlFor="master-class-select"
								className="block text-sm font-medium text-muted-foreground"
							>
								Class
							</label>
							<select
								id="master-class-select"
								value={selectedMasterGradeLevel}
								onChange={(e) => setSelectedMasterGradeLevel(e.target.value)}
								className="mt-1 block w-full rounded-md border-border bg-background py-2 pl-3 pr-10 text-foreground focus:border-primary focus:ring-primary sm:text-sm"
							>
								<option value="">Select a Class</option>
								{getAllGradeLevels().map((cls, index) => (
									<option key={`master-class-${cls}-${index}`} value={cls}>
										{cls}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="master-subject-select"
								className="block text-sm font-medium text-muted-foreground"
							>
								Subject
							</label>
							<select
								id="master-subject-select"
								value={selectedMasterSubject}
								onChange={(e) => setSelectedMasterSubject(e.target.value)}
								className="mt-1 block w-full rounded-md border-border bg-background py-2 pl-3 pr-10 text-foreground focus:border-primary focus:ring-primary sm:text-sm"
								disabled={!selectedMasterGradeLevel}
							>
								<option value="">Select a Subject</option>
								{getAvailableSubjects().map((subject, index) => (
									<option
										key={`master-subject-${subject}-${index}`}
										value={subject}
									>
										{subject}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
				{selectedMasterGradeLevel && selectedMasterSubject && (
					<div className="bg-card border rounded-lg p-6">
						<h3 className="text-xl font-semibold mb-4">
							Master Sheet for {selectedMasterGradeLevel} -{' '}
							{selectedMasterSubject}
						</h3>
						{loading.masterGrades ? (
							<PageLoading fullScreen={false} />
						) : error.masterGrades ? (
							<div className="text-destructive">{error.masterGrades}</div>
						) : consolidatedData && consolidatedData.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-border">
									<thead className="bg-muted">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
												Student Name
											</th>
											{periods.map((p) => (
												<th
													key={`master-period-header-${p.value}`}
													className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
												>
													{p.label}
												</th>
											))}
										</tr>
									</thead>
									<tbody className="divide-y divide-border bg-card">
										{consolidatedData.map((student) => (
											<tr key={`master-student-${student.studentId}`}>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
													{student.name}
												</td>
												{periods.map((p) => (
													<td
														key={`master-grade-${student.studentId}-${p.value}`}
														className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground"
													>
														<span
															className={getGradeColor(
																student.grades[p.value] ?? null
															)}
														>
															{student.grades[p.value] ?? '-'}
														</span>
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="p-6 text-center text-muted-foreground">
								No data available for the selected class and subject.
							</div>
						)}
					</div>
				)}
			</div>
		);
	};

	const renderFilterModal = () => (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
				<div
					className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
					aria-hidden="true"
				/>
				<div className="inline-block align-bottom bg-card rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
					<div className="flex justify-between items-center pb-3 border-b border-border">
						<h3 className="text-lg font-medium leading-6 text-foreground">
							Filter Grades
						</h3>
						<button
							onClick={() => setShowFilterModal(false)}
							className="text-muted-foreground hover:text-foreground"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					<div className="mt-4 space-y-4">
						<div>
							<label className="block text-sm font-medium text-muted-foreground">
								Subject
							</label>
							<select
								value={filters.subject}
								onChange={(e) =>
									setFilters({ ...filters, subject: e.target.value })
								}
								className="mt-1 block w-full rounded-md border-border bg-background text-foreground"
							>
								<option value="">All Subjects</option>
								{teacherInfo?.subjects.map((s, index) => (
									<option key={`filter-subject-${s}-${index}`} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-muted-foreground">
								Class
							</label>
							<select
								value={filters.gradeLevel}
								onChange={(e) =>
									setFilters({ ...filters, gradeLevel: e.target.value })
								}
								className="mt-1 block w-full rounded-md border-border bg-background text-foreground"
							>
								<option value="">All Classes</option>
								{getAllGradeLevels().map((c, index) => (
									<option key={`filter-class-${c}-${index}`} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-muted-foreground">
								Period
							</label>
							<select
								value={filters.period}
								onChange={(e) =>
									setFilters({ ...filters, period: e.target.value })
								}
								className="mt-1 block w-full rounded-md border-border bg-background text-foreground"
							>
								<option value="">All Periods</option>
								{periods.map((p) => (
									<option key={`filter-period-${p.value}`} value={p.value}>
										{p.label}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="mt-5 sm:mt-6 flex gap-2">
						<button
							type="button"
							onClick={resetFilters}
							className="inline-flex justify-center w-full rounded-md border border-border px-4 py-2 text-base font-medium text-secondary-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-sm"
						>
							Reset
						</button>
						<button
							type="button"
							onClick={() => setShowFilterModal(false)}
							className="inline-flex justify-center w-full rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-sm"
						>
							Apply
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-background text-foreground p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-primary/10 rounded-lg">
							<BarChart3 className="h-6 w-6 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								Grade Management
							</h1>
							<p className="text-muted-foreground">
								Manage and submit grades for your classes
							</p>
						</div>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="mb-6">
					<div className="border-b border-border">
						<nav className="-mb-px flex space-x-8">
							<button
								onClick={() => setActiveTab('overview')}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === 'overview'
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
								}`}
							>
								Overview
							</button>
							<button
								onClick={() => setActiveTab('submit')}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === 'submit'
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
								}`}
							>
								Submit Grades
							</button>
							<button
								onClick={() => setActiveTab('master')}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === 'master'
										? 'border-primary text-primary'
										: 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
								}`}
							>
								Master Grade Sheet
							</button>
						</nav>
					</div>
				</div>

				{/* Tab Content */}
				{loading.teacherInfo ? (
					<PageLoading fullScreen={false} />
				) : error.teacherInfo ? (
					<div className="text-center text-destructive">
						{error.teacherInfo}
					</div>
				) : (
					<>
						{activeTab === 'overview' && renderOverview()}
						{activeTab === 'submit' && renderSubmitGrades()}
						{activeTab === 'master' && renderMasterSheet()}
					</>
				)}
			</div>

			{/* Edit Modal */}
			{showEditModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							aria-hidden="true"
						/>
						<span
							className="hidden sm:inline-block sm:align-middle sm:h-screen"
							aria-hidden="true"
						>
							&#8203;
						</span>
						<div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
							<div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
								<div className="flex justify-between items-center pb-3 border-b border-border">
									<h3 className="text-xl font-medium leading-6 text-foreground">
										Edit Grade for {selectedGradeForEdit?.gradeLevel} -{' '}
										{selectedGradeForEdit?.subject} (
										{selectedGradeForEdit?.period})
									</h3>
									<button
										onClick={() => setShowEditModal(false)}
										className="text-muted-foreground hover:text-foreground"
									>
										<X className="h-5 w-5" />
									</button>
								</div>
								<div className="mt-4">
									<p className="text-sm text-muted-foreground mb-4">
										Select students and update their grades. Changes are subject
										to administrator approval.
									</p>
									{loading.studentsForEdit ? (
										<PageLoading fullScreen={false} />
									) : error.studentsForEdit ? (
										<div className="text-destructive">
											{error.studentsForEdit}
										</div>
									) : (
										<div className="overflow-x-auto">
											<table className="min-w-full divide-y divide-border">
												<thead className="bg-muted">
													<tr>
														<th className="p-3 text-left">
															<input
																type="checkbox"
																onChange={(e) =>
																	setEditStudents((prev) =>
																		prev.map((s) => ({
																			...s,
																			selected: e.target.checked,
																		}))
																	)
																}
																className="rounded text-primary focus:ring-primary"
															/>
														</th>
														<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
															Student Name
														</th>
														<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
															Current Grade
														</th>
														<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
															New Grade
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-border bg-card">
													{editStudents.map((student, index) => (
														<tr
															key={`edit-student-${student.studentId}-${index}`}
														>
															<td className="p-3">
																<input
																	type="checkbox"
																	checked={student.selected}
																	onChange={() =>
																		setEditStudents((prev) =>
																			prev.map((s) =>
																				s.studentId === student.studentId
																					? { ...s, selected: !s.selected }
																					: s
																			)
																		)
																	}
																	className="rounded text-primary focus:ring-primary"
																/>
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
																{student.name}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
																<span
																	className={getGradeColor(
																		student.currentGrade
																	)}
																>
																	{student.currentGrade ?? '-'}
																</span>
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
																<input
																	type="number"
																	value={student.newGrade}
																	onChange={(e) =>
																		handleEditGradeChange(
																			student.studentId,
																			e.target.value
																		)
																	}
																	min="0"
																	max="100"
																	className="w-20 rounded-md border-border bg-background text-foreground text-center"
																/>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
								<div className="mt-4">
									<label
										htmlFor="edit-reason"
										className="block text-sm font-medium text-muted-foreground"
									>
										Reason for Change
									</label>
									<textarea
										id="edit-reason"
										rows={3}
										value={editReason}
										onChange={(e) => setEditReason(e.target.value)}
										className="mt-1 block w-full rounded-md border-border bg-background text-foreground focus:ring-primary focus:border-primary"
									/>
								</div>
							</div>
							<div className="bg-card px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
								<button
									type="button"
									onClick={handleSubmitEditRequest}
									className="w-full inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
									disabled={loading.submittingEditRequest}
								>
									{loading.submittingEditRequest ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										'Submit Request'
									)}
								</button>
								<button
									type="button"
									onClick={() => setShowEditModal(false)}
									className="mt-3 w-full inline-flex justify-center rounded-md border border-border px-4 py-2 text-base font-medium text-secondary-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			{showViewModal && (
				<div className="fixed inset-0 z-50 overflow-y-auto">
					<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
						<div
							className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
							aria-hidden="true"
						/>
						<div className="inline-block align-bottom bg-card rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
							<div className="flex justify-between items-center pb-3 border-b border-border">
								<h3 className="text-lg font-medium leading-6 text-foreground">
									View Grade Submission
								</h3>
								<button
									onClick={() => setShowViewModal(false)}
									className="text-muted-foreground hover:text-foreground"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							<div className="mt-4">
								<p className="text-sm text-muted-foreground mb-4">
									Viewing grades for **{selectedGradeForView?.gradeLevel} -{' '}
									{selectedGradeForView?.subject}** during **
									{
										periods.find(
											(p) => p.value === selectedGradeForView?.period
										)?.label
									}
									**.
								</p>
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-border">
										<thead className="bg-muted">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
													Student Name
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
													Grade
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
													Status
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
													Rank
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-border bg-card">
											{selectedGradeForView?.grades.map((student, index) => (
												<tr key={`view-student-${student.studentId}-${index}`}>
													<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
														{student.name}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
														<span className={getGradeColor(student.grade)}>
															{student.grade ?? '-'}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
														<span
															className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
																student.status
															)}`}
														>
															{getStatusIcon(student.status)}
															{student.status}
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
														{student.rank ?? '-'}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
							<div className="mt-5 sm:mt-6">
								<button
									type="button"
									onClick={() => setShowViewModal(false)}
									className="w-full inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:text-sm"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			{showFilterModal && renderFilterModal()}
		</div>
	);
};

export default TeacherGradeManagement;
