'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import GradeSubmissions from './GradeSubmissions';
import SubmitGrade from './SubmitGrade';
import MasterGradeSheet from '../../shared/MasterGradeSheet';
import TeacherGradeChangeRequests from './GradeRequests';

interface TeacherInfo {
	name: string;
	userId: string;
	username: string;
	role: 'teacher';
	subjects: { year: string; classes: { classId: string; subjects: string[] }[] }[];
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
	const [academicYear, setAcademicYear] = useState<string>('');

	// Loading and Error States
	const [loading, setLoading] = useState({
		teacherInfo: true,
	});
	const [error, setError] = useState({
		teacherInfo: '',
	});

	const getAcademicYear = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1;

		if (currentMonth >= 8) {
			return `${currentYear}-${currentYear + 1}`;
		} else {
			return `${currentYear - 1}-${currentYear}`;
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

	const handleSwitchToSubmit = () => setActiveTab('submit');
	const handleSwitchToOverview = () => setActiveTab('overview');

	const tabButtonStyle = (tabName: string) =>
		`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
			activeTab === tabName
				? 'border-primary text-primary'
				: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
		}`;

	return (
		<div className="min-h-screen bg-background py-6 px-0">
			<div className="w-full">
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
								Masters
							</button>
							<button
								onClick={() => setActiveTab('requests')}
								className={tabButtonStyle('requests')}
							>
								Grade Requests
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
							<GradeSubmissions />
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
						{activeTab === 'requests' && (
							<TeacherGradeChangeRequests teacherInfo={teacherInfo} />
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default GradeManagement;
