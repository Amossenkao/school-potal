'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClassNameById } from '@/components/dashboard/academicYear';
import { useSchoolStore } from '@/store/schoolStore';
import { getScopedAcademicYearValue } from '@/utils/academicYear';

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
	fullName?: string;
	classId?: string;
	isActive?: boolean;
};

export default function AdminEnrollment({
	schoolProfile,
	selectedYear,
}: AdminEnrollmentProps) {
	const sessions = useMemo(() => {
		const levels = schoolProfile.classLevels || {};
		return Object.keys(levels).filter((session) => {
			const sessionLevels = levels[session] || {};
			return Object.keys(sessionLevels).some(
				(level) => level !== 'Self Contained',
			);
		});
	}, [schoolProfile]);

	const [selectedSession, setSelectedSession] = useState('');
	const [selectedLevel, setSelectedLevel] = useState('');
	const [selectedClassId, setSelectedClassId] = useState('');
	const [students, setStudents] = useState<StudentRow[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [pageSize, setPageSize] = useState(10);
	const [pageIndex, setPageIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);

	useEffect(() => {
		if (sessions.length === 0) return;
		if (!selectedSession || !sessions.includes(selectedSession)) {
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
		if (levelOptions.length === 0) return;
		if (!selectedLevel || !levelOptions.includes(selectedLevel)) {
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
		if (classOptions.length === 0) return;
		const values = classOptions.map((klass) => klass.value);
		if (!selectedClassId || !values.includes(selectedClassId)) {
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
				const storeStudents = getScopedAcademicYearValue(
					usersByAcademicYear,
					selectedYear,
				).value?.students;
				if (Array.isArray(storeStudents)) {
					const filtered = storeStudents.filter(
						(student: StudentRow) => student.classId === selectedClassId,
					);
					setStudents(filtered);
					return;
				}

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
				if (Array.isArray(data)) {
					setUsersForYear(selectedYear, { students: data }, { merge: true });
				}
			} catch (error) {
				if ((error as Error).name === 'AbortError') return;
				setErrorMessage((error as Error).message || 'Unable to load students.');
			} finally {
				setIsLoading(false);
			}
		};

		fetchStudents();
		return () => controller.abort();
	}, [selectedYear, selectedClassId, usersByAcademicYear, setUsersForYear]);

	useEffect(() => {
		setPageIndex(0);
	}, [searchTerm, pageSize, selectedClassId, selectedYear]);

	const normalizedStudents = useMemo(() => {
		return students.map((student) => {
			const name =
				student.fullName ||
				(student.firstName && student.lastName
					? `${student.firstName} ${student.lastName}`
					: student.firstName || student.lastName) ||
				'—';
			const username =
				student.studentId || student.username || student.id || '';
			const classId = student.classId || selectedClassId;
			const className = getClassNameById(schoolProfile, classId) || '—';
			const status = student.isActive === false ? 'Inactive' : 'Active';
			return {
				key: student.id || student.studentId || student.username || name,
				name: name || '—',
				username: username || '—',
				className,
				status,
			};
		});
	}, [students, selectedClassId, schoolProfile]);

	const filteredStudents = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();
		if (!query) return normalizedStudents;
		return normalizedStudents.filter((student) =>
			student.name.toLowerCase().includes(query),
		);
	}, [normalizedStudents, searchTerm]);

	const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
	const safePageIndex = Math.min(pageIndex, totalPages - 1);
	const pagedStudents = filteredStudents.slice(
		safePageIndex * pageSize,
		safePageIndex * pageSize + pageSize,
	);

	useEffect(() => {
		if (pageIndex !== safePageIndex) {
			setPageIndex(safePageIndex);
		}
	}, [pageIndex, safePageIndex]);

	const downloadCsv = () => {
		if (filteredStudents.length === 0) return;
		const header = ['No', 'Name', 'Class', 'Username'];
		const rows = filteredStudents.map((student, index) => [
			index + 1,
			student.name,
			student.className,
			student.username,
		]);

		const csv = [header, ...rows]
			.map((row) =>
				row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
			)
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
							Select a class to view enrolled students for{' '}
							{selectedYear || 'N/A'}.
						</p>
					</div>
					<Button
						variant="outline"
						onClick={downloadCsv}
						disabled={filteredStudents.length === 0}
					>
						Download Data
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
						{levelOptions.length > 1 ? (
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
						) : null}
						{classOptions.length > 1 ? (
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
						) : null}
					</div>

					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading students…</p>
					) : errorMessage ? (
						<p className="text-sm text-red-500">{errorMessage}</p>
					) : filteredStudents.length === 0 ? (
						<p className="text-sm text-muted-foreground">No students found.</p>
					) : (
						<div className="space-y-4">
							<div className="flex flex-wrap items-end justify-between gap-3">
								<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									Search
									<input
										type="search"
										value={searchTerm}
										onChange={(event) => setSearchTerm(event.target.value)}
										placeholder="Search by name"
										className="h-9 w-64 max-w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
									/>
								</div>
								<div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
									Rows
									<select
										className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
										value={pageSize}
										onChange={(event) =>
											setPageSize(Number(event.target.value))
										}
									>
										<option value={10}>10</option>
										<option value={20}>20</option>
										<option value={50}>50</option>
										<option value={100}>100</option>
									</select>
								</div>
							</div>
							<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50 dark:bg-gray-900">
										<tr className="text-left text-gray-600 dark:text-gray-400">
											<th className="px-4 py-3">No</th>
											<th className="px-4 py-3">Name</th>
											<th className="px-4 py-3">Username</th>
											<th className="px-4 py-3">Class</th>
											<th className="px-4 py-3">Status</th>
										</tr>
									</thead>
									<tbody>
										{pagedStudents.map((student, index) => (
											<tr key={student.key || index} className="border-t">
												<td className="px-4 py-3">
													{safePageIndex * pageSize + index + 1}
												</td>
												<td className="px-4 py-3">{student.name}</td>
												<td className="px-4 py-3">{student.username}</td>
												<td className="px-4 py-3">{student.className}</td>
												<td className="px-4 py-3">
													<span
														className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
															student.status === 'Active'
																? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
																: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
														}`}
													>
														{student.status}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-xs text-muted-foreground">
									Page {safePageIndex + 1} of {totalPages} •{' '}
									{filteredStudents.length} students
								</p>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setPageIndex((prev) => Math.max(prev - 1, 0))
										}
										disabled={safePageIndex === 0}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setPageIndex((prev) => Math.min(prev + 1, totalPages - 1))
										}
										disabled={safePageIndex >= totalPages - 1}
									>
										Next
									</Button>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
