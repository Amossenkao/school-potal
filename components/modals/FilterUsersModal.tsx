import React, { useState, useEffect } from 'react';

const FilterUsersModal = ({
	isOpen,
	onClose,
	statusFilter,
	setStatusFilter,
	sessionFilter,
	setSessionFilter,
	classLevelFilter,
	setClassLevelFilter,
	classFilter,
	setClassFilter,
	subjectFilter,
	setSubjectFilter,
	resetFilters,
	onApply,
	schoolProfile,
	availableSessions,
}: any) => {
	const [sessions, setSessions] = useState<string[]>([]);
	const [classLevels, setClassLevels] = useState<string[]>([]);
	const [classes, setClasses] = useState<any[]>([]);
	const [subjects, setSubjects] = useState<string[]>([]);
	const effectiveSession =
		sessionFilter !== 'all'
			? sessionFilter
			: sessions.length === 1
				? sessions[0]
				: 'all';
	const effectiveClassLevel =
		classLevelFilter !== 'all'
			? classLevelFilter
			: classLevels.length === 1
				? classLevels[0]
				: 'all';
	const showSessionFilter = sessions.length > 1;
	const showClassLevelFilter = classLevels.length > 1;

	useEffect(() => {
		if (Array.isArray(availableSessions) && availableSessions.length > 0) {
			setSessions(availableSessions);
			return;
		}
		if (schoolProfile?.classLevels) {
			setSessions(Object.keys(schoolProfile.classLevels));
			return;
		}
		setSessions([]);
	}, [schoolProfile, availableSessions]);

	useEffect(() => {
		if (sessions.length <= 1 && sessionFilter !== 'all') {
			setSessionFilter('all');
		}
	}, [sessions, sessionFilter, setSessionFilter]);

	useEffect(() => {
		if (
			effectiveSession !== 'all' &&
			schoolProfile?.classLevels?.[effectiveSession]
		) {
			setClassLevels(Object.keys(schoolProfile.classLevels[effectiveSession]));
		} else {
			setClassLevels([]);
		}
		setClassFilter('all');
		setSubjectFilter('all');
	}, [effectiveSession, schoolProfile, setClassFilter, setSubjectFilter]);

	useEffect(() => {
		if (classLevels.length <= 1 && classLevelFilter !== 'all') {
			setClassLevelFilter('all');
		}
	}, [classLevels, classLevelFilter, setClassLevelFilter]);

	useEffect(() => {
		if (
			effectiveSession !== 'all' &&
			effectiveClassLevel !== 'all' &&
			schoolProfile?.classLevels?.[effectiveSession]?.[effectiveClassLevel]
		) {
			setClasses(
				schoolProfile.classLevels[effectiveSession][effectiveClassLevel]
					.classes || []
			);
			setSubjects(
				(
					schoolProfile.classLevels[effectiveSession][effectiveClassLevel]
						.subjects || []
				)
					.map((subject: any) =>
						typeof subject === 'string' ? subject : subject?.name,
					)
					.filter(Boolean)
			);
		} else {
			setClasses([]);
			setSubjects([]);
		}
		setClassFilter('all');
		setSubjectFilter('all');
	}, [
		effectiveSession,
		effectiveClassLevel,
		schoolProfile,
		setClassFilter,
		setSubjectFilter,
	]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
				<h4 className="text-xl font-semibold text-foreground">Filter Users</h4>

				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						Status
					</label>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="w-full p-2 border border-border rounded-lg bg-background"
					>
						<option value="all">All</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>
				{showSessionFilter && (
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Session
						</label>
						<select
							value={sessionFilter}
							onChange={(e) => setSessionFilter(e.target.value)}
							className="w-full p-2 border border-border rounded-lg bg-background"
						>
							<option value="all">All</option>
							{sessions.map((session) => (
								<option key={session} value={session}>
									{session}
								</option>
							))}
						</select>
					</div>
				)}
				{effectiveSession !== 'all' && showClassLevelFilter && (
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							Class Level
						</label>
						<select
							value={classLevelFilter}
							onChange={(e) => setClassLevelFilter(e.target.value)}
							className="w-full p-2 border border-border rounded-lg bg-background"
						>
							<option value="all">All</option>
							{classLevels.map((level) => (
								<option key={level} value={level}>
									{level}
								</option>
							))}
						</select>
					</div>
				)}
				{effectiveClassLevel !== 'all' && (
					<>
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Class
							</label>
							<select
								value={classFilter}
								onChange={(e) => setClassFilter(e.target.value)}
								className="w-full p-2 border border-border rounded-lg bg-background"
							>
								<option value="all">All</option>
								{classes.map((c: any) => (
									<option key={c.classId} value={c.classId}>
										{c.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-foreground mb-2">
								Subject
							</label>
							<select
								value={subjectFilter}
								onChange={(e) => setSubjectFilter(e.target.value)}
								className="w-full p-2 border border-border rounded-lg bg-background"
							>
								<option value="all">All</option>
								{subjects.map((sub) => (
									<option key={sub} value={sub}>
										{sub}
									</option>
								))}
							</select>
						</div>
					</>
				)}

				<div className="flex justify-between mt-4">
					<button
						onClick={() => {
							resetFilters();
							onApply();
						}}
						className="px-4 py-2 bg-muted text-muted-foreground rounded-lg"
					>
						Reset
					</button>
					<div>
						<button
							onClick={onClose}
							className="px-4 py-2 text-muted-foreground rounded-lg"
						>
							Cancel
						</button>
						<button
							onClick={onApply}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
						>
							Apply Filters
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FilterUsersModal;
