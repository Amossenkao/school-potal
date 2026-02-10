'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClassNameById } from '@/components/dashboard/academicYear';

const normalizeLevelName = (level: string) =>
	level && level !== 'Self Contained' ? level : '';

type AdminEnrollmentProps = {
	schoolProfile: SchoolProfile;
	selectedYear: string;
};

type StudentRow = {
	id?: string;
	studentId?: string;
	username?: string;
	firstName?: string;
	lastName?: string;
	classId?: string;
};

export default function AdminEnrollment({
	schoolProfile,
	selectedYear,
}: AdminEnrollmentProps) {
	const sessions = useMemo(() => {
		const levels = schoolProfile.classLevels || {};
		return Object.keys(levels).filter((session) => {
			const sessionLevels = levels[session] || {};
			return Object.keys(sessionLevels).some((level) => level !== 'Self Contained');
		});
	}, [schoolProfile]);

	const [selectedSession, setSelectedSession] = useState('');
	const [selectedLevel, setSelectedLevel] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [students, setStudents] = useState<StudentRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	useEffect(() => {
		if (!selectedSession && sessions.length > 0) {
			setSelectedSession(sessions[0]);
		}
	}, [sessions, selectedSession]);

	const levelOptions = useMemo(() => {
		if (!selectedSession) return [];
		const sessionLevels = schoolProfile.classLevels?.[selectedSession] || {};
		return Object.keys(sessionLevels)
			.map((level) => normalizeLevelName(level))
			.filter(Boolean);
	}, [schoolProfile, selectedSession]);

	useEffect(() => {
		if (!selectedLevel && levelOptions.length > 0) {
			setSelectedLevel(levelOptions[0]);
		}
	}, [levelOptions, selectedLevel]);

	const classOptions = useMemo(() => {
		if (!selectedSession || !selectedLevel) return [];
		const sessionLevels = schoolProfile.classLevels?.[selectedSession] || {};
		const levelData = sessionLevels[selectedLevel] as any;
		const classes = levelData?.classes || [];
		return classes.map((klass: any) => ({
			value: klass.classId,
			label: klass.name,
		}));
	}, [schoolProfile, selectedSession, selectedLevel]);

	useEffect(() => {
		if (!selectedClassId && classOptions.length > 0) {
			setSelectedClassId(classOptions[0].value);
		}
	}, [classOptions, selectedClassId]);

	useEffect(() => {
		if (!selectedYear || !selectedClassId) return;
		const controller = new AbortController();

		const fetchStudents = async () => {
			try {
				setIsLoading(true);
				setErrorMessage('');
				const response = await fetch(
					`/api/users?role=student&academicYear=${encodeURIComponent(
						selectedYear,
					)}&classId=${encodeURIComponent(selectedClassId)}`,
					{ signal: controller.signal },
				);
				const payload = await response.json();
				if (!response.ok || !payload?.success) {
					throw new Error(payload?.message || 'Failed to load students.');
				}
				const data = Array.isArray(payload.data)
					? payload.data
					: payload.data?.students || [];
				setStudents(Array.isArray(data) ? data : []);
			} catch (error) {
				if ((error as Error).name === 'AbortError') return;
				setErrorMessage((error as Error).message || 'Unable to load students.');
			} finally {
				setIsLoading(false);
			}
		};

		fetchStudents();
		return () => controller.abort();
	}, [selectedYear, selectedClassId]);

	const downloadCsv = () => {
		if (students.length === 0) return;
		const header = ['Student Name', 'Student ID', 'Username', 'Class'];
		const rows = students.map((student) => {
			const name = `${student.firstName || ''} ${student.lastName || ''}`.trim();
			const studentId = student.studentId || student.username || student.id || '';
			const username = student.username || '';
			const className = getClassNameById(schoolProfile, selectedClassId);
			return [name, studentId, username, className];
		});

		const csv = [header, ...rows]
			.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
			.join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `enrollment-${selectedYear}-${selectedClassId}.csv`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<CardTitle>Enrollment</CardTitle>
						<p className="text-sm text-muted-foreground">
							Select a class to view enrolled students for {selectedYear || 'N/A'}.
						</p>
					</div>
					<Button variant="outline" onClick={downloadCsv} disabled={students.length === 0}>
						Download CSV
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-3">
						{sessions.length > 1 ? (
							<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
								Session
								<select
									className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
									value={selectedSession}
									onChange={(event) => {
										setSelectedSession(event.target.value);
										setSelectedLevel('');
										setSelectedClassId('');
									}}
								>
									{sessions.map((session) => (
										<option key={session} value={session}>
											{session}
										</option>
									))}
								</select>
							</div>
						) : null}
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Level
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedLevel}
								onChange={(event) => {
									setSelectedLevel(event.target.value);
									setSelectedClassId('');
								}}
							>
								{levelOptions.map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
							Class
							<select
								className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
								value={selectedClassId}
								onChange={(event) => setSelectedClassId(event.target.value)}
							>
								{classOptions.map((klass) => (
									<option key={klass.value} value={klass.value}>
										{klass.label}
									</option>
								))}
							</select>
						</div>
					</div>

					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading students…</p>
					) : errorMessage ? (
						<p className="text-sm text-red-500">{errorMessage}</p>
					) : students.length === 0 ? (
						<p className="text-sm text-muted-foreground">No students found.</p>
					) : (
						<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
							<table className="min-w-full text-sm">
								<thead className="bg-gray-50 dark:bg-gray-900">
									<tr className="text-left text-gray-600 dark:text-gray-400">
										<th className="px-4 py-3">Student</th>
										<th className="px-4 py-3">Student ID</th>
										<th className="px-4 py-3">Username</th>
									</tr>
								</thead>
								<tbody>
									{students.map((student, index) => (
										<tr key={student.id || student.studentId || index} className="border-t">
											<td className="px-4 py-3">
												{`${student.firstName || ''} ${student.lastName || ''}`.trim() || '—'}
											</td>
											<td className="px-4 py-3">
												{student.studentId || student.username || student.id || '—'}
											</td>
											<td className="px-4 py-3">{student.username || '—'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}