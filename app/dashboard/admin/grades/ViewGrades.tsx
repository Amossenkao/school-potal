'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import MasterGradeSheet from '../reports/MasterGradeSheets';

const TeacherGradeManagement = () => {
	const [activeTab, setActiveTab] = useState('overview');
	const [showSubmitModal, setShowSubmitModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showFilterModal, setShowFilterModal] = useState(false);
	const [selectedGradeForEdit, setSelectedGradeForEdit] = useState(null);
	const [editReason, setEditReason] = useState('');
	const [selectedPeriods, setSelectedPeriods] = useState([]);
	const [selectedSubject, setSelectedSubject] = useState('');
	const [selectedClass, setSelectedClass] = useState('');
	const [selectedMasterClass, setSelectedMasterClass] = useState('');
	const [gradeForm, setGradeForm] = useState([]);
	const [editStudents, setEditStudents] = useState([]);
	const [selectedStudentsForEdit, setSelectedStudentsForEdit] = useState([]);
	const [loading, setLoading] = useState({
		loadingStudents: false,
		submittingGrades: false,
		submittingEditRequest: false,
	});

	// Filter states
	const [filters, setFilters] = useState({
		subject: '',
		class: '',
		status: '',
		period: '',
		dateRange: '',
	});

	// Sorting states
	const [sortConfig, setSortConfig] = useState({
		key: null,
		direction: 'asc',
	});

	// Mock data - would come from backend
	const teacherInfo = {
		name: 'Sarah Johnson',
		subjects: ['Mathematics', 'Algebra II'],
		classes: {
			Mathematics: ['10A', '10B', '10C'],
			'Algebra II': ['11A', '11B'],
		},
	};

	const periods = [
		{ id: 'first', label: 'First Period', value: 'first' },
		{ id: 'second', label: 'Second Period', value: 'second' },
		{ id: 'third', label: 'Third Period', value: 'third' },
		{ id: 'fourth', label: 'Fourth Period', value: 'fourth' },
	];

	const [submittedGrades, setSubmittedGrades] = useState([
		{
			id: 1,
			subject: 'Mathematics',
			class: '10A',
			period: 'First Period',
			submittedDate: '2024-07-20',
			studentCount: 28,
			status: 'submitted',
		},
		{
			id: 2,
			subject: 'Algebra II',
			class: '11A',
			period: 'First Period',
			submittedDate: '2024-07-18',
			studentCount: 25,
			status: 'submitted',
		},
		{
			id: 3,
			subject: 'Mathematics',
			class: '10B',
			period: 'Second Period',
			submittedDate: '2024-07-15',
			studentCount: 30,
			status: 'pending',
		},
		{
			id: 4,
			subject: 'Mathematics',
			class: '10C',
			period: 'Third Period',
			submittedDate: '2024-07-22',
			studentCount: 26,
			status: 'submitted',
		},
		{
			id: 5,
			subject: 'Algebra II',
			class: '11B',
			period: 'Fourth Period',
			submittedDate: '2024-07-19',
			studentCount: 24,
			status: 'pending',
		},
	]);

	// Mock existing grades for students (simulating database)
	const [existingGrades, setExistingGrades] = useState({
		'10A': {
			STU001: { first: 85, second: null, third: 92, fourth: null },
			STU002: { first: 92, second: 94, third: null, fourth: null },
			STU003: { first: null, second: 82, third: 85, fourth: 80 },
			STU004: { first: 88, second: null, third: 87, fourth: 91 },
			STU005: { first: 91, second: 89, third: null, fourth: null },
		},
		'10B': {
			STU006: { first: 87, second: 90, third: null, fourth: null },
			STU007: { first: null, second: 84, third: 86, fourth: null },
		},
		'11A': {
			STU008: { first: 94, second: null, third: 96, fourth: 93 },
			STU009: { first: null, second: 87, third: 91, fourth: null },
		},
	});
	const [masterGrades, setMasterGrades] = useState({
		'10A': [
			{
				id: 1,
				name: 'John Smith',
				studentId: 'STU001',
				grades: {
					period1: 85,
					period2: 88,
					period3: 92,
					period4: 87,
					period5: 90,
					period6: 89,
				},
				average: 88.5,
			},
			{
				id: 2,
				name: 'Emily Davis',
				studentId: 'STU002',
				grades: {
					period1: 92,
					period2: 94,
					period3: 91,
					period4: 93,
					period5: 95,
					period6: 90,
				},
				average: 92.5,
			},
			{
				id: 3,
				name: 'Michael Brown',
				studentId: 'STU003',
				grades: {
					period1: 78,
					period2: 82,
					period3: 85,
					period4: 80,
					period5: 83,
					period6: 86,
				},
				average: 82.3,
			},
			{
				id: 4,
				name: 'Sarah Wilson',
				studentId: 'STU004',
				grades: {
					period1: 88,
					period2: 85,
					period3: 87,
					period4: 91,
					period5: 89,
					period6: 92,
				},
				average: 88.7,
			},
			{
				id: 5,
				name: 'David Johnson',
				studentId: 'STU005',
				grades: {
					period1: 91,
					period2: 89,
					period3: 93,
					period4: 88,
					period5: 90,
					period6: 94,
				},
				average: 90.8,
			},
		],
		'10B': [
			{
				id: 6,
				name: 'Lisa Anderson',
				studentId: 'STU006',
				grades: {
					period1: 87,
					period2: 90,
					period3: 85,
					period4: 89,
					period5: 91,
					period6: 88,
				},
				average: 88.3,
			},
			{
				id: 7,
				name: 'Robert Taylor',
				studentId: 'STU007',
				grades: {
					period1: 82,
					period2: 84,
					period3: 86,
					period4: 83,
					period5: 85,
					period6: 87,
				},
				average: 84.5,
			},
		],
		'10C': [
			{
				id: 10,
				name: 'Alex Rodriguez',
				studentId: 'STU010',
				grades: {
					period1: 89,
					period2: 91,
					period3: 88,
					period4: 90,
					period5: 92,
					period6: 89,
				},
				average: 89.8,
			},
		],
		'11A': [
			{
				id: 8,
				name: 'Jennifer Martinez',
				studentId: 'STU008',
				grades: {
					period1: 94,
					period2: 92,
					period3: 96,
					period4: 93,
					period5: 95,
					period6: 91,
				},
				average: 93.5,
			},
			{
				id: 9,
				name: 'Christopher Lee',
				studentId: 'STU009',
				grades: {
					period1: 89,
					period2: 87,
					period3: 91,
					period4: 88,
					period5: 90,
					period6: 92,
				},
				average: 89.5,
			},
		],
		'11B': [
			{
				id: 11,
				name: 'Maria Garcia',
				studentId: 'STU011',
				grades: {
					period1: 86,
					period2: 88,
					period3: 90,
					period4: 87,
					period5: 89,
					period6: 91,
				},
				average: 88.5,
			},
		],
	});

	// Helper function to get all classes
	const getAllClasses = () => {
		return Object.values(teacherInfo.classes).flat();
	};

	// Calculate stats
	const stats = {
		totalClasses: getAllClasses().length,
		submittedGrades: submittedGrades.filter((g) => g.status === 'submitted')
			.length,
		pendingGrades: submittedGrades.filter((g) => g.status === 'pending').length,
		totalStudents: submittedGrades.reduce((sum, g) => sum + g.studentCount, 0),
	};

	// Helper function to get grade color
	const getGradeColor = (grade) => {
		if (grade >= 90) return 'text-green-600 font-semibold';
		if (grade >= 80) return 'text-blue-600';
		if (grade >= 70) return 'text-yellow-600';
		return 'text-red-600';
	};

	// Filtering and sorting functions
	const applyFilters = (grades) => {
		return grades.filter((grade) => {
			if (filters.subject && grade.subject !== filters.subject) return false;
			if (filters.class && grade.class !== filters.class) return false;
			if (filters.status && grade.status !== filters.status) return false;
			if (filters.period && grade.period !== filters.period) return false;
			return true;
		});
	};

	const applySorting = (grades) => {
		if (!sortConfig.key) return grades;

		return [...grades].sort((a, b) => {
			let aValue = a[sortConfig.key];
			let bValue = b[sortConfig.key];

			// Handle date sorting
			if (sortConfig.key === 'submittedDate') {
				aValue = new Date(aValue);
				bValue = new Date(bValue);
			}

			// Handle string sorting
			if (typeof aValue === 'string') {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}

			if (aValue < bValue) {
				return sortConfig.direction === 'asc' ? -1 : 1;
			}
			if (aValue > bValue) {
				return sortConfig.direction === 'asc' ? 1 : -1;
			}
			return 0;
		});
	};

	const handleSort = (key) => {
		let direction = 'asc';
		if (sortConfig.key === key && sortConfig.direction === 'asc') {
			direction = 'desc';
		}
		setSortConfig({ key, direction });
	};

	const getSortIcon = (columnName) => {
		if (sortConfig.key !== columnName) {
			return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
		}
		return sortConfig.direction === 'asc' ? (
			<ArrowUp className="h-3 w-3 text-foreground" />
		) : (
			<ArrowDown className="h-3 w-3 text-foreground" />
		);
	};

	// Get filtered and sorted grades
	const filteredAndSortedGrades = applySorting(applyFilters(submittedGrades));

	const handlePeriodChange = (periodValue) => {
		setSelectedPeriods((prev) =>
			prev.includes(periodValue)
				? prev.filter((p) => p !== periodValue)
				: [...prev, periodValue]
		);
	};

	const handleSubjectChange = (subject) => {
		setSelectedSubject(subject);
		setSelectedClass(''); // Reset class when subject changes
	};

	const loadStudentsForGrading = async () => {
		if (selectedSubject && selectedClass && selectedPeriods.length > 0) {
			setLoading((prev) => ({ ...prev, loadingStudents: true }));

			// Simulate API call delay
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Mock student data - would come from backend
			const mockStudents = [
				{ id: 1, name: 'John Smith', studentId: 'STU001' },
				{ id: 2, name: 'Emily Davis', studentId: 'STU002' },
				{ id: 3, name: 'Michael Brown', studentId: 'STU003' },
				{ id: 4, name: 'Sarah Wilson', studentId: 'STU004' },
				{ id: 5, name: 'David Johnson', studentId: 'STU005' },
			];

			// Initialize form with existing grades for selected periods
			const initialGradeForm = mockStudents.map((student) => {
				const studentGrades = {};
				selectedPeriods.forEach((period) => {
					const existingGrade =
						existingGrades[selectedClass]?.[student.studentId]?.[period];
					studentGrades[period] = existingGrade || '';
				});

				return {
					...student,
					grades: studentGrades,
				};
			});

			setGradeForm(initialGradeForm);
			setLoading((prev) => ({ ...prev, loadingStudents: false }));
		}
	};

	const handleGradeChange = (
		studentId: string,
		period: string,
		grade: string
	) => {
		setGradeForm((prev: any) =>
			prev.map((student: any) =>
				student.id === studentId
					? {
							...student,
							grades: {
								...student.grades,
								[period]: grade === '' ? '' : parseInt(grade) || 0,
							},
					  }
					: student
			)
		);
	};

	const handleSubmitGrades = async () => {
		setLoading((prev) => ({ ...prev, submittingGrades: true }));

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Would submit to backend
		console.log('Submitting grades:', {
			subject: selectedSubject,
			class: selectedClass,
			periods: selectedPeriods,
			grades: gradeForm,
		});

		// Update existing grades
		const updatedExistingGrades = { ...existingGrades };
		gradeForm.forEach((student) => {
			if (!updatedExistingGrades[selectedClass]) {
				updatedExistingGrades[selectedClass] = {};
			}
			if (!updatedExistingGrades[selectedClass][student.studentId]) {
				updatedExistingGrades[selectedClass][student.studentId] = {};
			}

			Object.entries(student.grades).forEach(([period, grade]) => {
				if (grade !== '' && grade !== null) {
					updatedExistingGrades[selectedClass][student.studentId][period] =
						grade;
				}
			});
		});

		setExistingGrades(updatedExistingGrades);

		// Add to submitted grades
		const newSubmission = {
			id: submittedGrades.length + 1,
			subject: selectedSubject,
			class: selectedClass,
			period: selectedPeriods
				.map((p) => periods.find((period) => period.value === p)?.label)
				.join(', '),
			submittedDate: new Date().toISOString().split('T')[0],
			studentCount: gradeForm.length,
			status: 'submitted',
		};

		setSubmittedGrades((prev) => [...prev, newSubmission]);
		setShowSubmitModal(false);
		setGradeForm([]);
		setSelectedPeriods([]);
		setSelectedSubject('');
		setSelectedClass('');
		setActiveTab('overview');
		setLoading((prev) => ({ ...prev, submittingGrades: false }));
	};

	const handleEditGrade = (grade) => {
		// Load students for the selected grade submission
		const mockStudents = [
			{ id: 1, name: 'John Smith', studentId: 'STU001' },
			{ id: 2, name: 'Emily Davis', studentId: 'STU002' },
			{ id: 3, name: 'Michael Brown', studentId: 'STU003' },
			{ id: 4, name: 'Sarah Wilson', studentId: 'STU004' },
			{ id: 5, name: 'David Johnson', studentId: 'STU005' },
		];

		// Get existing grades for these students
		const studentsWithGrades = mockStudents.map((student) => {
			const studentExistingGrades =
				existingGrades[grade.class]?.[student.studentId] || {};
			return {
				...student,
				currentGrades: studentExistingGrades,
				newGrades: { ...studentExistingGrades },
				selected: false,
			};
		});

		setEditStudents(studentsWithGrades);
		setSelectedGradeForEdit(grade);
		setShowEditModal(true);
	};

	const handleStudentSelectionForEdit = (studentId) => {
		setEditStudents((prev) =>
			prev.map((student) =>
				student.id === studentId
					? { ...student, selected: !student.selected }
					: student
			)
		);
	};

	const handleEditGradeChange = (studentId, period, newGrade) => {
		setEditStudents((prev) =>
			prev.map((student) =>
				student.id === studentId
					? {
							...student,
							newGrades: {
								...student.newGrades,
								[period]: newGrade === '' ? null : parseInt(newGrade) || 0,
							},
					  }
					: student
			)
		);
	};

	const handleSubmitEditRequest = async () => {
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

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Would submit edit request to backend
		console.log('Submitting grade change request:', {
			gradeId: selectedGradeForEdit.id,
			students: selectedStudents.map((student) => ({
				studentId: student.studentId,
				studentName: student.name,
				currentGrades: student.currentGrades,
				newGrades: student.newGrades,
			})),
			reason: editReason,
			requestedBy: teacherInfo.name,
			requestDate: new Date().toISOString(),
		});

		alert(
			'Grade change request has been sent to the system administrator for approval.'
		);
		setShowEditModal(false);
		setSelectedGradeForEdit(null);
		setEditReason('');
		setEditStudents([]);
		setSelectedStudentsForEdit([]);
		setLoading((prev) => ({ ...prev, submittingEditRequest: false }));
	};

	const resetFilters = () => {
		setFilters({
			subject: '',
			class: '',
			status: '',
			period: '',
			dateRange: '',
		});
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'submitted':
				return 'bg-green-100 text-green-800';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const getStatusIcon = (status) => {
		switch (status) {
			case 'submitted':
				return <CheckCircle className="h-4 w-4" />;
			case 'pending':
				return <Clock className="h-4 w-4" />;
			default:
				return <AlertCircle className="h-4 w-4" />;
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-blue-100 rounded-lg">
							<BarChart3 className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Grade Management
							</h1>
							<p className="text-gray-600">
								Manage and submit grades for your classes
							</p>
						</div>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<div className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">
									Total Classes
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{stats.totalClasses}
								</p>
							</div>
							<div className="p-3 rounded-lg bg-blue-100">
								<Users className="h-6 w-6 text-blue-600" />
							</div>
						</div>
					</div>

					<div className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">
									Submitted Grades
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{stats.submittedGrades}
								</p>
							</div>
							<div className="p-3 rounded-lg bg-green-100">
								<CheckCircle className="h-6 w-6 text-green-600" />
							</div>
						</div>
					</div>

					<div className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">
									Pending Reviews
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{stats.pendingGrades}
								</p>
							</div>
							<div className="p-3 rounded-lg bg-yellow-100">
								<Clock className="h-6 w-6 text-yellow-600" />
							</div>
						</div>
					</div>

					<div className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">
									Total Students
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{stats.totalStudents}
								</p>
							</div>
							<div className="p-3 rounded-lg bg-purple-100">
								<BookOpen className="h-6 w-6 text-purple-600" />
							</div>
						</div>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="mb-6">
					<div className="flex gap-1 bg-gray-200 p-1 rounded-lg w-fit">
						<button
							onClick={() => setActiveTab('overview')}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								activeTab === 'overview'
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Grade Overview
						</button>
						<button
							onClick={() => setActiveTab('submit')}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								activeTab === 'submit'
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Submit Grades
						</button>
						<button
							onClick={() => setActiveTab('mastersheet')}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								activeTab === 'mastersheet'
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'
							}`}
						>
							Master Grade Sheet
						</button>
					</div>
				</div>

				{activeTab === 'overview' && (
					<div className="space-y-6">
						{/* Controls */}
						<div className="flex flex-col sm:flex-row gap-4">
							<div className="flex gap-2">
								<button
									onClick={() => setShowFilterModal(true)}
									className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<Filter className="h-4 w-4" />
									Filter
									{Object.values(filters).some((f) => f) && (
										<span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
											Active
										</span>
									)}
								</button>
								<button
									onClick={() => setShowSubmitModal(true)}
									className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									<Plus className="h-4 w-4" />
									Submit New Grades
								</button>
							</div>
						</div>

						{/* Grades Table */}
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												<button
													onClick={() => handleSort('subject')}
													className="flex items-center gap-1 hover:text-gray-700"
												>
													Subject & Class
													{getSortIcon('subject')}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												<button
													onClick={() => handleSort('period')}
													className="flex items-center gap-1 hover:text-gray-700"
												>
													Period
													{getSortIcon('period')}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												<button
													onClick={() => handleSort('studentCount')}
													className="flex items-center gap-1 hover:text-gray-700"
												>
													Students
													{getSortIcon('studentCount')}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												<button
													onClick={() => handleSort('status')}
													className="flex items-center gap-1 hover:text-gray-700"
												>
													Status
													{getSortIcon('status')}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												<button
													onClick={() => handleSort('submittedDate')}
													className="flex items-center gap-1 hover:text-gray-700"
												>
													Submitted Date
													{getSortIcon('submittedDate')}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{filteredAndSortedGrades.map((grade) => (
											<tr
												key={grade.id}
												className="hover:bg-gray-50 transition-colors"
											>
												<td className="px-6 py-4">
													<div>
														<div className="text-sm font-medium text-gray-900">
															{grade.subject}
														</div>
														<div className="text-sm text-gray-500">
															Class {grade.class}
														</div>
													</div>
												</td>
												<td className="px-6 py-4">
													<span className="text-sm text-gray-900">
														{grade.period}
													</span>
												</td>
												<td className="px-6 py-4">
													<span className="text-sm text-gray-900">
														{grade.studentCount} students
													</span>
												</td>
												<td className="px-6 py-4">
													<span
														className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
															grade.status
														)}`}
													>
														{getStatusIcon(grade.status)}
														{grade.status.charAt(0).toUpperCase() +
															grade.status.slice(1)}
													</span>
												</td>
												<td className="px-6 py-4 text-sm text-gray-500">
													{new Date(grade.submittedDate).toLocaleDateString()}
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center gap-2">
														<button className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors">
															<Eye className="h-4 w-4" />
														</button>
														<button
															onClick={() => handleEditGrade(grade)}
															className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
														>
															<Edit className="h-4 w-4" />
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'submit' && (
					<div className="space-y-6">
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-6">
								Submit New Grades
							</h2>

							{/* Grade Submission Form */}
							<div className="space-y-6">
								{/* Period Selection */}
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-3">
										Select Period(s)
									</label>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
										{periods.map((period) => (
											<label
												key={period.id}
												className="flex items-center space-x-2 cursor-pointer"
											>
												<input
													type="checkbox"
													checked={selectedPeriods.includes(period.value)}
													onChange={() => handlePeriodChange(period.value)}
													className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												/>
												<span className="text-sm text-gray-900">
													{period.label}
												</span>
											</label>
										))}
									</div>
								</div>

								{/* Subject Selection */}
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-2">
										Subject
									</label>
									<select
										className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={selectedSubject}
										onChange={(e) => handleSubjectChange(e.target.value)}
									>
										<option value="">Select Subject</option>
										{teacherInfo.subjects.map((subject) => (
											<option key={subject} value={subject}>
												{subject}
											</option>
										))}
									</select>
								</div>

								{/* Class Selection */}
								{selectedSubject && (
									<div>
										<label className="block text-sm font-medium text-gray-900 mb-2">
											Class
										</label>
										<select
											className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
											value={selectedClass}
											onChange={(e) => setSelectedClass(e.target.value)}
										>
											<option value="">Select Class</option>
											{teacherInfo.classes[selectedSubject]?.map(
												(className) => (
													<option key={className} value={className}>
														{className}
													</option>
												)
											)}
										</select>
									</div>
								)}

								{/* Load Students Button */}
								{selectedSubject &&
									selectedClass &&
									selectedPeriods.length > 0 && (
										<div>
											<button
												onClick={loadStudentsForGrading}
												disabled={loading.loadingStudents}
												className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
											>
												{loading.loadingStudents ? (
													<>
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
														Loading Students...
													</>
												) : (
													'Load Students for Grading'
												)}
											</button>
										</div>
									)}

								{/* Grade Input Table */}
								{gradeForm.length > 0 && (
									<div className="mt-6">
										<h3 className="text-md font-medium text-gray-900 mb-4">
											Enter Grades for {selectedSubject} - Class {selectedClass}
										</h3>
										<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
											<div className="overflow-x-auto">
												<table className="w-full">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-4 py-3 text-left text-sm font-medium text-gray-500 sticky left-0 bg-gray-50 z-10">
																Student Name
															</th>
															{selectedPeriods.map((period) => (
																<th
																	key={period}
																	className="px-4 py-3 text-center text-sm font-medium text-gray-500 min-w-[120px]"
																>
																	{
																		periods.find((p) => p.value === period)
																			?.label
																	}{' '}
																	Grade
																</th>
															))}
														</tr>
													</thead>
													<tbody className="divide-y divide-gray-200">
														{gradeForm.map((student) => (
															<tr key={student.id}>
																<td className="px-4 py-3 text-sm text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 min-w-[180px]">
																	<div>
																		<div className="font-medium">
																			{student.name}
																		</div>
																		<div className="text-xs text-gray-500">
																			{student.studentId}
																		</div>
																	</div>
																</td>
																{selectedPeriods.map((period) => {
																	const existingGrade =
																		existingGrades[selectedClass]?.[
																			student.studentId
																		]?.[period];
																	const isReadonly =
																		existingGrade !== null &&
																		existingGrade !== undefined;

																	return (
																		<td
																			key={period}
																			className="px-4 py-3 text-center"
																		>
																			<input
																				type="number"
																				min="0"
																				max="100"
																				value={student.grades[period] || ''}
																				onChange={(e) =>
																					handleGradeChange(
																						student.id,
																						period,
																						e.target.value
																					)
																				}
																				readOnly={isReadonly}
																				className={`w-20 p-2 border rounded text-center focus:outline-none focus:ring-2 ${
																					isReadonly
																						? 'bg-gray-100 border-gray-300 text-gray-600 cursor-not-allowed'
																						: 'bg-white border-gray-300 focus:ring-blue-500'
																				}`}
																				placeholder={isReadonly ? '' : '0-100'}
																			/>
																			{isReadonly && (
																				<div className="text-xs text-gray-500 mt-1">
																					Already graded
																				</div>
																			)}
																		</td>
																	);
																})}
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>

										<div className="mt-4 flex gap-3">
											<button
												onClick={() => setGradeForm([])}
												className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
											>
												Cancel
											</button>
											<button
												onClick={handleSubmitGrades}
												disabled={loading.submittingGrades}
												className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
											>
												{loading.submittingGrades ? (
													<>
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
														Submitting...
													</>
												) : (
													'Submit Grades'
												)}
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === 'mastersheet' && (
					<div className="space-y-6">
						{/* Master Grade Sheet Table */}
						<MasterGradeSheet />
					</div>
				)}

				{/* Filter Modal */}
				{showFilterModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
						<div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-semibold text-gray-900">
									Filter Grades
								</h2>
								<button
									onClick={() => setShowFilterModal(false)}
									className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
								>
									<X className="h-5 w-5" />
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-900 mb-2">
										Subject
									</label>
									<select
										className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={filters.subject}
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												subject: e.target.value,
											}))
										}
									>
										<option value="">All Subjects</option>
										{teacherInfo.subjects.map((subject) => (
											<option key={subject} value={subject}>
												{subject}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-900 mb-2">
										Class
									</label>
									<select
										className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={filters.class}
										onChange={(e) =>
											setFilters((prev) => ({ ...prev, class: e.target.value }))
										}
									>
										<option value="">All Classes</option>
										{getAllClasses().map((className) => (
											<option key={className} value={className}>
												{className}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-900 mb-2">
										Status
									</label>
									<select
										className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={filters.status}
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												status: e.target.value,
											}))
										}
									>
										<option value="">All Statuses</option>
										<option value="submitted">Submitted</option>
										<option value="pending">Pending</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-900 mb-2">
										Period
									</label>
									<select
										className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={filters.period}
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												period: e.target.value,
											}))
										}
									>
										<option value="">All Periods</option>
										{periods.map((period) => (
											<option key={period.id} value={period.label}>
												{period.label}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="mt-6 flex gap-3">
								<button
									onClick={resetFilters}
									className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
								>
									Reset
								</button>
								<button
									onClick={() => setShowFilterModal(false)}
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									Apply Filters
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Edit Grade Modal */}
				{showEditModal && selectedGradeForEdit && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
						<div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-semibold text-gray-900">
									Request Grade Change
								</h2>
								<button
									onClick={() => setShowEditModal(false)}
									className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
								>
									<X className="h-5 w-5" />
								</button>
							</div>

							<div className="space-y-6">
								<div className="p-4 bg-gray-50 rounded-lg">
									<p className="text-sm text-gray-600">Grade Details:</p>
									<p className="font-medium text-gray-900">
										{selectedGradeForEdit.subject} - Class{' '}
										{selectedGradeForEdit.class}
									</p>
									<p className="text-sm text-gray-600">
										{selectedGradeForEdit.period} •{' '}
										{selectedGradeForEdit.studentCount} students
									</p>
								</div>

								{/* Student Selection */}
								<div>
									<h3 className="text-md font-medium text-gray-900 mb-3">
										Select Students for Grade Changes:
									</h3>
									<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
										<div className="overflow-x-auto">
											<table className="w-full">
												<thead className="bg-gray-50">
													<tr>
														<th className="px-4 py-3 text-left">
															<input
																type="checkbox"
																onChange={(e) => {
																	const allSelected = e.target.checked;
																	setEditStudents((prev) =>
																		prev.map((student) => ({
																			...student,
																			selected: allSelected,
																		}))
																	);
																}}
																checked={editStudents.every((s) => s.selected)}
																className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
															/>
														</th>
														<th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
															Student
														</th>
														<th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
															Current Grades
														</th>
														<th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
															New Grades
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-gray-200">
													{editStudents.map((student) => (
														<tr
															key={student.id}
															className={student.selected ? 'bg-blue-50' : ''}
														>
															<td className="px-4 py-3">
																<input
																	type="checkbox"
																	checked={student.selected}
																	onChange={() =>
																		handleStudentSelectionForEdit(student.id)
																	}
																	className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
																/>
															</td>
															<td className="px-4 py-3">
																<div>
																	<div className="text-sm font-medium text-gray-900">
																		{student.name}
																	</div>
																	<div className="text-xs text-gray-500">
																		{student.studentId}
																	</div>
																</div>
															</td>
															<td className="px-4 py-3">
																<div className="flex gap-2 justify-center flex-wrap">
																	{periods.map((period) => (
																		<div
																			key={period.value}
																			className="text-center"
																		>
																			<div className="text-xs text-gray-500 mb-1">
																				{period.label}
																			</div>
																			<div className="w-16 px-2 py-1 bg-gray-100 border rounded text-sm text-center">
																				{student.currentGrades[period.value] ??
																					'N/A'}
																			</div>
																		</div>
																	))}
																</div>
															</td>
															<td className="px-4 py-3">
																<div className="flex gap-2 justify-center flex-wrap">
																	{periods.map((period) => (
																		<div
																			key={period.value}
																			className="text-center"
																		>
																			<div className="text-xs text-gray-500 mb-1">
																				{period.label}
																			</div>
																			<input
																				type="number"
																				min="0"
																				max="100"
																				value={
																					student.newGrades[period.value] ?? ''
																				}
																				onChange={(e) =>
																					handleEditGradeChange(
																						student.id,
																						period.value,
																						e.target.value
																					)
																				}
																				disabled={!student.selected}
																				className={`w-16 p-1 border rounded text-sm text-center focus:outline-none focus:ring-2 ${
																					student.selected
																						? 'bg-white border-gray-300 focus:ring-blue-500'
																						: 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
																				}`}
																				placeholder="0-100"
																			/>
																		</div>
																	))}
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-900 mb-2">
										Reason for Grade Change Request *
									</label>
									<textarea
										className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
										rows="4"
										value={editReason}
										onChange={(e) => setEditReason(e.target.value)}
										placeholder="Please provide a detailed reason for requesting these grade changes..."
									/>
								</div>

								<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
									<p className="text-sm text-yellow-800">
										<strong>Note:</strong> This will send a grade change request
										to the system administrator for approval. You will be
										notified once the request is reviewed.
									</p>
								</div>
							</div>

							<div className="mt-6 flex gap-3">
								<button
									onClick={() => {
										setShowEditModal(false);
										setEditReason('');
										setEditStudents([]);
									}}
									className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleSubmitEditRequest}
									disabled={loading.submittingEditRequest}
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
								>
									{loading.submittingEditRequest ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											Sending Request...
										</>
									) : (
										<>
											<Send className="h-4 w-4" />
											Send Request
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Submit Modal (Quick Access) */}
				{showSubmitModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
						<div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">
								Quick Grade Submission
							</h2>
							<p className="text-sm text-gray-600 mb-4">
								Use the "Submit Grades" tab for detailed grade entry, or
								continue here for quick access.
							</p>

							<div className="flex gap-3">
								<button
									onClick={() => setShowSubmitModal(false)}
									className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={() => {
										setShowSubmitModal(false);
										setActiveTab('submit');
									}}
									className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									Go to Submit Grades
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default TeacherGradeManagement;
