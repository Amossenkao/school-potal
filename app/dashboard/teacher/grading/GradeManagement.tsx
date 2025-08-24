'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import GradeOverview from './GradeOverview';
import SubmitGrade from './SubmitGrade';
import MasterGradeSheet from './MasterGradeSheet';

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
	subjects: { subject: string; level: string }[];
	classes: { [subject: string]: string[] };
}

const PageLoading = ({ fullScreen = true }: { fullScreen?: boolean }) => (
	<div
		className={`flex justify-center items-center ${
			fullScreen ? 'min-h-screen' : 'py-8'
		}`}
	>
		<Loader2 className="h-8 w-8 animate-spin text-primary" />
	</div>
);

const GradeManagement = () => {
	const [activeTab, setActiveTab] = useState('overview');

	// API Data States
	const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
	const [submittedGrades, setSubmittedGrades] = useState<GradeSubmission[]>([]);
	const [academicYear, setAcademicYear] = useState<string>('');

	// Loading and Error States
	const [loading, setLoading] = useState({
		teacherInfo: true,
		submittedGrades: false,
	});
	const [error, setError] = useState({
		teacherInfo: '',
		submittedGrades: '',
	});

	const getAcademicYear = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;

		if (currentMonth >= 8) {
			return `${currentYear}/${currentYear + 1}`;
		} else {
			return `${currentYear - 1}/${currentYear}`;
		}
	};

	// Fetch teacher info on component mount
	useEffect(() => {
		console.log(getAcademicYear());
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
						`/api/grades?academicYear=${academicYear}&teacherId=${teacherInfo.teacherId}&reportType=gradeSubmission`
					);
					if (!res.ok) throw new Error('Failed to fetch submitted grades');
					const data = await res.json();

					// Process the new backend response structure
					const processedSubmissions: GradeSubmission[] =
						data.data.report.submissions.map((submission: any) => {
							// Calculate statistics from the grades
							const grades = submission.students.map(
								(student: any) => student.grade
							);
							const validGrades = grades.filter(
								(g: number) => g !== null && g !== undefined
							) as number[];
							const totalStudents = submission.totalStudents;
							const passes = validGrades.filter((g: number) => g >= 70).length;
							const fails = validGrades.length - passes;
							const incompletes = totalStudents - validGrades.length;
							const average =
								validGrades.length > 0
									? validGrades.reduce((sum: number, g: number) => sum + g, 0) /
									  validGrades.length
									: 0;

							// Determine overall submission status
							const statuses = submission.students.map(
								(student: any) => student.status
							);
							let overallStatus:
								| 'Approved'
								| 'Rejected'
								| 'Pending'
								| 'Partially Approved';

							if (statuses.every((s: string) => s === 'Approved')) {
								overallStatus = 'Approved';
							} else if (statuses.every((s: string) => s === 'Rejected')) {
								overallStatus = 'Rejected';
							} else if (statuses.some((s: string) => s === 'Approved')) {
								overallStatus = 'Partially Approved';
							} else {
								overallStatus = 'Pending';
							}

							return {
								submissionId: submission.submissionId,
								academicYear: data.data.academicYear,
								period: submission.period,
								gradeLevel: submission.classId,
								subject: submission.subject,
								teacherId: data.data.teacherId,
								lastUpdated: submission.lastUpdated,
								status: overallStatus,
								grades: submission.students.map((student: any) => ({
									studentId: student.studentId,
									name: student.studentName,
									grade: student.grade,
									status: student.status as 'Approved' | 'Rejected' | 'Pending',
								})),
								stats: {
									totalStudents,
									passes,
									fails,
									incompletes,
									average: parseFloat(average.toFixed(1)),
								},
							};
						});

					// Sort by most recent first
					processedSubmissions.sort(
						(a, b) =>
							new Date(b.lastUpdated).getTime() -
							new Date(a.lastUpdated).getTime()
					);

					setSubmittedGrades(processedSubmissions);
					setError((prev) => ({ ...prev, submittedGrades: '' }));
				} catch (err) {
					setError((prev) => ({
						...prev,
						submittedGrades: 'Failed to load submitted grades.',
					}));
					console.error('Error fetching submitted grades:', err);
				} finally {
					setLoading((prev) => ({ ...prev, submittedGrades: false }));
				}
			};
			fetchSubmittedGrades();
		}
	}, [activeTab, academicYear, teacherInfo]);

	const handleSwitchToSubmit = () => setActiveTab('submit');
	const handleSwitchToOverview = () => setActiveTab('overview');
	const handleEditGrade = (submission: GradeSubmission) =>
		console.log('Edit grade:', submission);
	const handleViewGrade = (submission: GradeSubmission) =>
		console.log('View grade:', submission);

	const tabButtonStyle = (tabName: string) =>
		`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
			activeTab === tabName
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
		}`;

	return (
		<div className="min-h-screen bg-background p-6">
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
								className={tabButtonStyle('overview')}
							>
								Overview
							</button>
							<button
								onClick={() => setActiveTab('submit')}
								className={tabButtonStyle('submit')}
							>
								Submit Grades
							</button>
							<button
								onClick={() => setActiveTab('master')}
								className={tabButtonStyle('master')}
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
						{activeTab === 'overview' && (
							<GradeOverview
								submittedGrades={submittedGrades}
								loading={loading.submittedGrades}
								error={error.submittedGrades}
								teacherInfo={teacherInfo}
								onSwitchToSubmit={handleSwitchToSubmit}
								onEditGrade={handleEditGrade}
								onViewGrade={handleViewGrade}
							/>
						)}
						{activeTab === 'submit' && (
							<SubmitGrade
								teacherInfo={teacherInfo}
								academicYear={academicYear}
								loading={loading.teacherInfo}
								error={error.teacherInfo}
								onSwitchToOverview={handleSwitchToOverview}
							/>
						)}
						{activeTab === 'master' && (
							<MasterGradeSheet
								teacherInfo={teacherInfo}
								academicYear={academicYear}
								loading={loading.teacherInfo}
								error={error.teacherInfo}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default GradeManagement;
