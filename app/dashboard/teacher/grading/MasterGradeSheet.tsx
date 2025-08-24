'use client';
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import GradesPDFDownload from './GradesPDFDownload';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore'; // Import schoolStore

// Types
interface SubjectInfo {
	subject: string;
	level: string;
	session: 'Morning' | 'Night';
	_id?: string;
}

interface TeacherInfo {
	name: string;
	userId: string;
	teacherId: string;
	role: 'teacher';
	subjects: SubjectInfo[];
	sponsorClass: string | null;
}

interface Student {
	studentId: string;
	studentName: string;
	periods?: { [key: string]: any };
}

interface UserInfo {
	tenantId?: string;
	purpose?: string;
	userId: string;
	username?: string;
	firstName?: string;
	lastName?: string;
	role: 'teacher' | 'system_admin';
	gender?: string;
	dateOfBirth?: string;
	address?: string;
	phone?: string;
	email?: string;
	isActive?: boolean;
	teacherId?: string;
	subjects?: SubjectInfo[];
	sponsorClass?: string | null;
}

interface GradeMasterProps {
	academicYear: string;
	loading: boolean;
	error: string;
}

const periods = [
	{ id: 'first', label: '1st Period', value: 'firstPeriod' },
	{ id: 'second', label: '2nd Period', value: 'secondPeriod' },
	{ id: 'third', label: '3rd Period', value: 'thirdPeriod' },
	{ id: 'third_exam', label: '3rd Period Exam', value: 'thirdPeriodExam' },
	{ id: 'fourth', label: '4th Period', value: 'fourthPeriod' },
	{ id: 'fifth', label: '5th Period', value: 'fifthPeriod' },
	{ id: 'sixth', label: '6th Period', value: 'sixthPeriod' },
	{ id: 'sixth_exam', label: '6th Period Exam', value: 'sixthPeriodExam' },
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

// Helper function to extract grade value from grade object or primitive
const getGradeValue = (grade: any): number | null => {
	if (grade == null) return null;
	if (typeof grade === 'number') return grade;
	if (typeof grade === 'string') {
		const parsed = parseFloat(grade);
		return isNaN(parsed) ? null : parsed;
	}
	if (typeof grade === 'object' && grade.grade != null) {
		return typeof grade.grade === 'number'
			? grade.grade
			: parseFloat(grade.grade);
	}
	return null;
};

// Helper function to format grade for display
const formatGrade = (grade: any): string => {
	const gradeValue = getGradeValue(grade);
	if (gradeValue == null) return '-';
	return gradeValue.toFixed(0);
};

const MasterGradeSheet: React.FC<GradeMasterProps> = ({
	academicYear,
	loading: parentLoading,
	error: parentError,
}) => {
	const { user: userInfo } = useAuth(); // Get user from auth
	const currentSchool = useSchoolStore((state) => state.school); // Get school from store

	const [selectedSession, setSelectedSession] = useState('');
	const [selectedMasterClassLevel, setSelectedMasterClassLevel] = useState('');
	const [selectedMasterGradeLevel, setSelectedMasterGradeLevel] = useState('');
	const [selectedMasterSubject, setSelectedMasterSubject] = useState('');
	const [studentsData, setStudentsData] = useState<Student[]>([]);
	const [gradesData, setGradesData] = useState<any>(null);
	const [combinedData, setCombinedData] = useState<Student[]>([]);
	const [pdfKey, setPdfKey] = useState(0); // Add this state for PDF component key
	const [loading, setLoading] = useState({
		students: false,
		grades: false,
		subjects: false,
	});
	const [error, setError] = useState({
		students: '',
		grades: '',
		subjects: '',
	});

	const combineStudentsAndGrades = (students: Student[], grades: any) => {
		const gradesMap = new Map();

		// Create a map of grades by studentId
		if (grades?.students) {
			grades.students.forEach((gradeStudent: any) => {
				gradesMap.set(gradeStudent.studentId, gradeStudent.periods || {});
			});
		}

		// Combine all students with their grades (if any)
		return students.map((student) => ({
			...student,
			periods: gradesMap.get(student.studentId) || {},
		}));
	};

	// Get teacher's available sessions
	const getTeacherSessions = (): string[] => {
		if (!userInfo?.subjects) return [];

		const sessions = Array.from(
			new Set(userInfo.subjects.map((subj) => subj.session))
		);
		return sessions;
	};

	// Get teacher's available class levels for selected session
	const getTeacherClassLevels = (): string[] => {
		if (!userInfo?.subjects) return [];

		const filteredSubjects = selectedSession
			? userInfo.subjects.filter((subj) => subj.session === selectedSession)
			: userInfo.subjects;

		const levels = Array.from(
			new Set(filteredSubjects.map((subj) => subj.level))
		);
		return levels;
	};

	// Get teacher's available classes for selected session and level
	const getTeacherClasses = () => {
		if (
			!selectedSession ||
			!selectedMasterClassLevel ||
			!currentSchool?.classLevels
		)
			return [];

		const sessionData = currentSchool.classLevels[selectedSession];
		const levelData = sessionData?.[selectedMasterClassLevel];

		if (!levelData?.classes) return [];

		// Check if teacher has subjects for this session and level
		const hasSubjectsForLevel = userInfo?.subjects?.some(
			(subj) =>
				subj.session === selectedSession &&
				subj.level === selectedMasterClassLevel
		);

		return hasSubjectsForLevel ? levelData.classes : [];
	};

	// Get teacher's available subjects for selected session and level
	const getTeacherSubjects = (): string[] => {
		if (!userInfo?.subjects) return [];

		let filteredSubjects = userInfo.subjects;

		if (selectedSession) {
			filteredSubjects = filteredSubjects.filter(
				(subj) => subj.session === selectedSession
			);
		}

		if (selectedMasterClassLevel) {
			filteredSubjects = filteredSubjects.filter(
				(subj) => subj.level === selectedMasterClassLevel
			);
		}

		const subjects = Array.from(
			new Set(filteredSubjects.map((subj) => subj.subject))
		);
		return subjects.sort();
	};

	// Auto-selection logic
	useEffect(() => {
		if (!userInfo) return;

		if (userInfo.role === 'teacher') {
			// Auto-select session if teacher only has one
			const teacherSessions = getTeacherSessions();
			if (teacherSessions.length === 1 && !selectedSession) {
				setSelectedSession(teacherSessions[0]);
			}

			// Auto-select class level if teacher only has one for current session
			const teacherLevels = getTeacherClassLevels();
			if (
				teacherLevels.length === 1 &&
				!selectedMasterClassLevel &&
				selectedSession
			) {
				setSelectedMasterClassLevel(teacherLevels[0]);
			}

			// Auto-select subject if teacher only has one for the selected session and level
			const teacherSubjects = getTeacherSubjects();
			if (
				teacherSubjects.length === 1 &&
				!selectedMasterSubject &&
				selectedSession &&
				selectedMasterClassLevel
			) {
				setSelectedMasterSubject(teacherSubjects[0]);
			}

			// Auto-select class if only one available
			const availableClasses = getAvailableClasses();
			if (
				availableClasses.length === 1 &&
				!selectedMasterGradeLevel &&
				selectedSession &&
				selectedMasterClassLevel
			) {
				setSelectedMasterGradeLevel(availableClasses[0].classId);
			}
		}
	}, [
		userInfo,
		selectedSession,
		selectedMasterClassLevel,
		selectedMasterSubject,
	]);

	// Fetch students when class is selected
	useEffect(() => {
		if (selectedMasterGradeLevel) {
			const fetchStudents = async () => {
				setLoading((prev) => ({ ...prev, students: true }));
				setError((prev) => ({ ...prev, students: '' }));

				try {
					const res = await fetch(
						`/api/users?role=student&classId=${selectedMasterGradeLevel}`
					);

					if (!res.ok) {
						throw new Error('Failed to fetch students');
					}

					const data = await res.json();

					// Handle the actual students API response structure
					if (data.success) {
						// Transform the students data to match our expected format
						const students = data.data.map((student: any) => ({
							studentId: student.studentId,
							studentName: `${student.firstName} ${student.lastName}`.trim(),
						}));
						setStudentsData(students);
					} else {
						throw new Error(data.message || 'Failed to fetch students');
					}
				} catch (err) {
					setError((prev) => ({
						...prev,
						students: 'Failed to load students.',
					}));
					console.error('Error fetching students:', err);
					setStudentsData([]);
				} finally {
					setLoading((prev) => ({ ...prev, students: false }));
				}
			};

			fetchStudents();
		} else {
			setStudentsData([]);
		}
	}, [academicYear, selectedMasterGradeLevel]);

	// Fetch grades when both class and subject are selected
	useEffect(() => {
		if (selectedMasterGradeLevel && selectedMasterSubject) {
			const fetchGrades = async () => {
				setLoading((prev) => ({ ...prev, grades: true }));
				setError((prev) => ({ ...prev, grades: '' }));

				try {
					const res = await fetch(
						`/api/grades?academicYear=${academicYear}&classId=${selectedMasterGradeLevel}&subject=${selectedMasterSubject}`
					);

					if (!res.ok) {
						throw new Error('Failed to fetch grades');
					}

					const data = await res.json();

					// Handle the actual API response structure
					if (data.success) {
						setGradesData(data.data?.report || null);
					} else {
						throw new Error('API returned unsuccessful response');
					}
				} catch (err) {
					setError((prev) => ({ ...prev, grades: 'Failed to load grades.' }));
					console.error('Error fetching grades:', err);
					setGradesData(null);
				} finally {
					setLoading((prev) => ({ ...prev, grades: false }));
				}
			};

			fetchGrades();
		} else {
			setGradesData(null);
		}
	}, [academicYear, selectedMasterGradeLevel, selectedMasterSubject]);

	// Combine data whenever students or grades change
	useEffect(() => {
		if (studentsData.length > 0) {
			const combined = combineStudentsAndGrades(studentsData, gradesData);
			setCombinedData(combined);
			// Force PDF component to re-render when data changes
			setPdfKey((prev) => prev + 1);
		} else {
			setCombinedData([]);
			setPdfKey((prev) => prev + 1);
		}
	}, [studentsData, gradesData]);

	// Reset PDF key when class or subject changes
	useEffect(() => {
		setPdfKey((prev) => prev + 1);
	}, [selectedMasterGradeLevel, selectedMasterSubject]);

	const getGradeColor = (grade: number | null) => {
		if (grade == null) return 'text-muted-foreground';
		return grade >= 70
			? 'text-primary font-semibold'
			: 'text-destructive font-semibold';
	};

	// Dynamic functions based on school profile (for system admin)
	const getAvailableSessions = () => {
		if (userInfo?.role === 'system_admin') {
			if (!currentSchool?.classLevels) return [];
			return Object.keys(currentSchool.classLevels);
		}

		// For teachers, return their available sessions
		return getTeacherSessions();
	};

	const getAvailableClassLevels = () => {
		if (userInfo?.role === 'system_admin') {
			if (!selectedSession || !currentSchool?.classLevels) return [];
			const sessionData = currentSchool.classLevels[selectedSession];
			return sessionData ? Object.keys(sessionData) : [];
		}

		// For teachers, return their available class levels
		return getTeacherClassLevels();
	};

	const getAvailableClasses = () => {
		if (userInfo?.role === 'system_admin') {
			if (
				!selectedSession ||
				!selectedMasterClassLevel ||
				!currentSchool?.classLevels
			)
				return [];

			const sessionData = currentSchool.classLevels[selectedSession];
			const levelData = sessionData?.[selectedMasterClassLevel];
			return levelData?.classes || [];
		}

		// For teachers, return their available classes
		return getTeacherClasses();
	};

	const getAvailableSubjects = () => {
		if (userInfo?.role === 'system_admin') {
			if (
				!selectedSession ||
				!selectedMasterClassLevel ||
				!currentSchool?.classLevels
			)
				return [];

			const sessionData = currentSchool.classLevels[selectedSession];
			const levelData = sessionData?.[selectedMasterClassLevel];
			return levelData?.subjects ? levelData.subjects.sort() : [];
		}

		// For teachers, return their available subjects
		return getTeacherSubjects();
	};

	const getGradeStats = () => {
		return periods.reduce((stats, period) => {
			if (!combinedData.length) {
				stats[period.value] = {
					passes: 0,
					fails: 0,
					incompletes: 0,
					classAverage: 0,
				};
				return stats;
			}

			let passes = 0,
				fails = 0,
				incompletes = 0,
				total = 0,
				sum = 0;

			combinedData.forEach((student) => {
				const grade = getGradeValue(student.periods?.[period.value]);
				if (grade != null) {
					total++;
					sum += grade;
					grade >= 70 ? passes++ : fails++;
				} else {
					incompletes++;
				}
			});

			stats[period.value] = {
				passes,
				fails,
				incompletes,
				classAverage: total > 0 ? sum / total : 0,
			};
			return stats;
		}, {} as any);
	};

	const stats = getGradeStats();
	const statRows = [
		{
			label: 'Number of Passes',
			key: 'passes',
			className: 'font-semibold text-primary',
		},
		{
			label: 'Number of Fails',
			key: 'fails',
			className: 'font-semibold text-destructive',
		},
		{
			label: 'Number of Incompletes',
			key: 'incompletes',
			className: 'font-semibold text-muted-foreground',
		},
		{ label: 'Class Average', key: 'classAverage', className: '' },
	];

	const isLoading = loading.students || loading.grades || loading.subjects;
	const hasError = error.students || error.grades || error.subjects;
	const errorMessage = error.students || error.grades || error.subjects;

	// Show loading for parent component
	if (parentLoading) return <PageLoading fullScreen={false} />;
	if (parentError)
		return (
			<div className="text-center text-destructive py-8">{parentError}</div>
		);

	// Show message if user data is not available
	if (!userInfo) {
		return (
			<div className="text-center text-muted-foreground py-8">
				User information is not available. Please refresh the page.
			</div>
		);
	}

	// Show message if teacher has no assigned subjects
	if (
		userInfo.role === 'teacher' &&
		(!userInfo.subjects || userInfo.subjects.length === 0)
	) {
		return (
			<div className="text-center text-muted-foreground py-8">
				You have not been assigned to any subjects. Please contact the
				administrator.
			</div>
		);
	}

	// Show message if school data is not available (for system admin)
	if (userInfo.role === 'system_admin' && !currentSchool?.classLevels) {
		return (
			<div className="text-center text-muted-foreground py-8">
				School profile data is not available. Please contact the administrator.
			</div>
		);
	}

	// Determine if session selector should be shown
	const shouldShowSessionSelector = () => {
		if (userInfo?.role === 'system_admin') return true;
		return getTeacherSessions().length > 1;
	};

	// Determine if level selector should be shown
	const shouldShowLevelSelector = () => {
		return getAvailableClassLevels().length > 1;
	};

	// Determine if subject selector should be shown
	const shouldShowSubjectSelector = () => {
		return getAvailableSubjects().length > 1;
	};

	// Determine if class selector should be shown
	const shouldShowClassSelector = () => {
		const availableClasses = getAvailableClasses();
		return availableClasses.length > 1;
	};

	return (
		<div className="space-y-6">
			<style jsx>{`
				.custom-scrollbar {
					scrollbar-width: thin;
					scrollbar-color: #8b5cf6 #f1f5f9;
				}

				.custom-scrollbar::-webkit-scrollbar {
					height: 16px;
					width: 16px;
				}

				.custom-scrollbar::-webkit-scrollbar-track {
					background: linear-gradient(
						90deg,
						#f1f5f9 0%,
						#e2e8f0 50%,
						#f1f5f9 100%
					);
					border-radius: 12px;
					box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
				}

				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: linear-gradient(
						135deg,
						#8b5cf6 0%,
						#7c3aed 50%,
						#6d28d9 100%
					);
					border-radius: 12px;
					border: 2px solid #f1f5f9;
					box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3),
						inset 0 1px 2px rgba(255, 255, 255, 0.2);
					transition: all 0.3s ease;
				}

				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: linear-gradient(
						135deg,
						#7c3aed 0%,
						#6d28d9 50%,
						#5b21b6 100%
					);
					box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4),
						inset 0 1px 2px rgba(255, 255, 255, 0.3);
					transform: scale(1.05);
				}

				.custom-scrollbar::-webkit-scrollbar-thumb:active {
					background: linear-gradient(
						135deg,
						#6d28d9 0%,
						#5b21b6 50%,
						#4c1d95 100%
					);
					box-shadow: 0 2px 4px rgba(139, 92, 246, 0.5),
						inset 0 2px 4px rgba(0, 0, 0, 0.1);
					transform: scale(0.95);
				}

				.custom-scrollbar::-webkit-scrollbar-corner {
					background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
					border-radius: 12px;
				}

				/* Add a subtle glow effect on hover */
				.custom-scrollbar:hover::-webkit-scrollbar-thumb {
					animation: scrollbarGlow 2s ease-in-out infinite alternate;
				}

				@keyframes scrollbarGlow {
					from {
						box-shadow: 0 6px 12px rgba(139, 92, 246, 0.4),
							inset 0 1px 2px rgba(255, 255, 255, 0.3);
					}
					to {
						box-shadow: 0 8px 16px rgba(139, 92, 246, 0.6),
							inset 0 1px 2px rgba(255, 255, 255, 0.4),
							0 0 20px rgba(139, 92, 246, 0.3);
					}
				}

				/* Responsive scrollbar for smaller screens */
				@media (max-width: 640px) {
					.custom-scrollbar::-webkit-scrollbar {
						height: 12px;
						width: 12px;
					}

					.custom-scrollbar::-webkit-scrollbar-track {
						border-radius: 8px;
					}

					.custom-scrollbar::-webkit-scrollbar-thumb {
						border-radius: 8px;
						border: 1px solid #f1f5f9;
					}
				}
			`}</style>
			<div className="p-6 bg-card border rounded-lg shadow-sm">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
					<h3 className="text-xl font-semibold text-card-foreground">
						Master Grade Sheet
						{userInfo?.role === 'system_admin' && (
							<span className="ml-2 text-sm text-muted-foreground font-normal">
								(Admin View - All Access)
							</span>
						)}
					</h3>
					<p className="text-sm text-muted-foreground mt-1 sm:mt-0">
						{userInfo?.role === 'system_admin'
							? 'View grades for any class and subject.'
							: 'View all grades for your assigned classes and subjects.'}
					</p>
				</div>

				{/* Dynamic grid based on how many selectors need to be shown */}
				<div
					className={`grid grid-cols-1 gap-4 ${
						[
							shouldShowSessionSelector(),
							shouldShowLevelSelector(),
							shouldShowClassSelector(),
							shouldShowSubjectSelector(),
						].filter(Boolean).length > 2
							? 'md:grid-cols-2 lg:grid-cols-4'
							: 'md:grid-cols-2'
					}`}
				>
					{/* Session selector */}
					{shouldShowSessionSelector() && (
						<div>
							<label
								htmlFor="session-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Session
							</label>
							<select
								id="session-select"
								value={selectedSession}
								onChange={(e) => {
									setSelectedSession(e.target.value);
									setSelectedMasterClassLevel('');
									setSelectedMasterGradeLevel('');
									setSelectedMasterSubject('');
								}}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
							>
								<option value="">Select Session</option>
								{getAvailableSessions().map((session) => (
									<option key={session} value={session}>
										{session}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Class Level selector */}
					{shouldShowLevelSelector() && (
						<div>
							<label
								htmlFor="master-class-level-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Class Level
							</label>
							<select
								id="master-class-level-select"
								value={selectedMasterClassLevel}
								onChange={(e) => {
									setSelectedMasterClassLevel(e.target.value);
									setSelectedMasterGradeLevel('');
									setSelectedMasterSubject('');
								}}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm disabled:opacity-50"
								disabled={shouldShowSessionSelector() && !selectedSession}
							>
								<option value="">Select Level</option>
								{getAvailableClassLevels().map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Class selector */}
					{shouldShowClassSelector() && (
						<div>
							<label
								htmlFor="master-class-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Class
							</label>
							<select
								id="master-class-select"
								value={selectedMasterGradeLevel}
								onChange={(e) => {
									setSelectedMasterGradeLevel(e.target.value);
									setSelectedMasterSubject('');
								}}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm disabled:opacity-50"
								disabled={
									(shouldShowSessionSelector() && !selectedSession) ||
									(shouldShowLevelSelector() && !selectedMasterClassLevel)
								}
							>
								<option value="">Select Class</option>
								{getAvailableClasses().map((cls) => (
									<option key={cls.classId} value={cls.classId}>
										{cls.name}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Subject selector */}
					{shouldShowSubjectSelector() && (
						<div>
							<label
								htmlFor="master-subject-select"
								className="block text-sm font-medium text-card-foreground"
							>
								Subject
							</label>
							<select
								id="master-subject-select"
								value={selectedMasterSubject}
								onChange={(e) => setSelectedMasterSubject(e.target.value)}
								className="mt-1 block w-full rounded-md border-input bg-background py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-ring focus:border-ring sm:text-sm disabled:opacity-50"
								disabled={
									(shouldShowSessionSelector() && !selectedSession) ||
									(shouldShowLevelSelector() && !selectedMasterClassLevel) ||
									(shouldShowClassSelector() && !selectedMasterGradeLevel)
								}
							>
								<option value="">Select Subject</option>
								{getAvailableSubjects().map((sub) => (
									<option key={sub} value={sub}>
										{sub}
									</option>
								))}
							</select>
						</div>
					)}
				</div>
			</div>

			{selectedMasterGradeLevel && selectedMasterSubject && (
				<div className="bg-card border rounded-lg p-4 sm:p-6 shadow-sm min-w-0">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
						<h3 className="text-lg sm:text-xl font-semibold text-card-foreground">
							Sheet for{' '}
							{getAvailableClasses().find(
								(cls) => cls.classId === selectedMasterGradeLevel
							)?.name ||
								// Fallback: try to get class name from student data if available
								(studentsData.length > 0
									? studentsData[0].studentName.split(' ').slice(0, 2).join(' ')
									: selectedMasterGradeLevel)}{' '}
							- {selectedMasterSubject}
						</h3>
						<div className="mt-2 sm:mt-0">
							{combinedData.length > 0 && (
								<GradesPDFDownload
									key={pdfKey} // Add key prop to force re-render
									disabled={isLoading}
									userInfo={userInfo}
									gradeData={{
										...gradesData,
										students: combinedData.map((student) => ({
											...student,
											periods: Object.fromEntries(
												Object.entries(student.periods || {}).map(
													([key, value]: [string, any]) => [
														key,
														getGradeValue(value),
													]
												)
											),
										})),
									}}
									classLevel={
										getAvailableClasses().find(
											(cls) => cls.classId === selectedMasterGradeLevel
										)?.name || selectedMasterGradeLevel
									}
									subject={selectedMasterSubject}
									academicYear={academicYear}
								/>
							)}
						</div>
					</div>
					{isLoading ? (
						<PageLoading fullScreen={false} />
					) : hasError ? (
						<div className="text-destructive">{errorMessage}</div>
					) : combinedData.length > 0 ? (
						<div
							className="relative overflow-x-auto border rounded-lg custom-scrollbar"
							style={{ maxHeight: '70vh' }}
						>
							<table className="table-fixed w-full divide-y divide-border">
								<thead className="bg-muted">
									<tr>
										<th
											scope="col"
											className="sticky top-0 left-0 z-30 bg-muted px-3 sm:px-6 py-3 text-left font-medium text-muted-foreground uppercase tracking-wider border-r border-border text-xs w-[140px] sm:w-[200px]"
										>
											Student Name
										</th>
										{periods.map((p) => (
											<th
												key={p.id}
												scope="col"
												className="sticky top-0 z-20 bg-muted px-3 sm:px-6 py-3 text-center font-medium text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0 text-xs w-[90px] sm:w-[120px]"
											>
												{p.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-border bg-background">
									{combinedData.map((student) => (
										<tr key={student.studentId}>
											<td className="sticky left-0 z-10 bg-card px-3 sm:px-6 py-4 font-medium text-foreground whitespace-nowrap border-r border-border text-sm">
												{student.studentName}
											</td>
											{periods.map((p) => {
												const grade = student.periods?.[p.value];
												const gradeValue = getGradeValue(grade);
												return (
													<td
														key={`${student.studentId}-${p.id}`}
														className="px-3 sm:px-6 py-4 text-center whitespace-nowrap border-r border-border last:border-r-0 text-sm"
													>
														<span className={getGradeColor(gradeValue)}>
															{formatGrade(grade)}
														</span>
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
								<tfoot className="border-t-2 border-border">
									{statRows.map((row) => (
										<tr key={row.key}>
											<th
												scope="row"
												className="sticky left-0 z-10 bg-muted px-3 sm:px-6 py-3 text-left font-semibold text-foreground border-r border-border text-sm"
											>
												{row.label}
											</th>
											{periods.map((p) => {
												const statValue = stats[p.value]?.[row.key];
												return (
													<td
														key={`${row.key}-${p.id}`}
														className="px-3 sm:px-6 py-3 text-center font-semibold whitespace-nowrap border-r border-border last:border-r-0 bg-muted/50 text-sm"
													>
														<span
															className={
																row.key === 'classAverage'
																	? getGradeColor(statValue ?? 0)
																	: row.className
															}
														>
															{row.key === 'classAverage'
																? statValue > 0
																	? statValue.toFixed(1)
																	: '-'
																: statValue ?? 0}
														</span>
													</td>
												);
											})}
										</tr>
									))}
								</tfoot>
							</table>
						</div>
					) : studentsData.length > 0 ? (
						<div className="p-6 text-center text-muted-foreground">
							Students loaded ({studentsData.length} students) but no grades
							data available.
						</div>
					) : (
						<div className="p-6 text-center text-muted-foreground">
							{loading.students
								? 'Loading students...'
								: 'No students found for the selected class.'}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default MasterGradeSheet;
