import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
	useId,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Student {
	id: string;
	name: string;
}

export interface StudentMultiSelectProps {
	students: Student[];
	selectedStudents: string[];
	onSelectionChange: (studentIds: string[]) => void;
	/** Max pills shown in the trigger before "+N more" */
	maxVisiblePills?: number;
	/** Accessible label for the control */
	label?: string;
	/** Panel max-height in px (default 240) */
	panelMaxHeight?: number;
	className?: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
	name
		.split(' ')
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

const getFirstName = (name: string) => name.split(' ')[0];
const getLastName = (name: string) => name.split(' ').slice(1).join(' ');

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ChipProps {
	student: Student;
	isSelected: boolean;
	onToggle: (id: string) => void;
}

const StudentChip = React.memo(function StudentChip({
	student,
	isSelected,
	onToggle,
}: ChipProps) {
	return (
		<div
			role="option"
			aria-selected={isSelected}
			tabIndex={0}
			onClick={() => onToggle(student.id)}
			onKeyDown={(e) => {
				if (e.key === ' ' || e.key === 'Enter') {
					e.preventDefault();
					onToggle(student.id);
				}
			}}
			className={`relative flex flex-col items-start gap-0.5 p-2 rounded-md cursor-pointer select-none outline-none min-w-0 transition-colors
				focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
				${isSelected
					? 'border border-primary/60 bg-accent'
					: 'border border-border bg-card'}`}
		>
			{/* Avatar */}
			<div
				className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-medium mb-0.5 shrink-0 transition-colors
					${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
				aria-hidden="true"
			>
				{getInitials(student.name)}
			</div>

			{/* Name lines */}
			<span
				className={`text-xs font-medium leading-tight truncate max-w-full
					${isSelected ? 'text-primary' : 'text-foreground'}`}
			>
				{getFirstName(student.name)}
			</span>
			<span className="text-[10px] leading-tight text-muted-foreground truncate max-w-full">
				{getLastName(student.name)}
			</span>

			{/* Check mark */}
			<svg
				aria-hidden="true"
				className={`absolute top-[5px] right-1.5 text-primary transition-opacity
					${isSelected ? 'opacity-100' : 'opacity-0'}`}
				width="11"
				height="11"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={3}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M20 6L9 17l-5-5" />
			</svg>
		</div>
	);
});

// ─── Main component ──────────────────────────────────────────────────────────

export const StudentMultiSelect = React.memo(function StudentMultiSelect({
	students,
	selectedStudents,
	onSelectionChange,
	maxVisiblePills = 3,
	label = 'Select specific students',
	panelMaxHeight = 240,
	className = '',
}: StudentMultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	const wrapperRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const panelId = useId();
	const labelId = useId();

	// ── Derived state ────────────────────────────────────────────────────────

	const selectedSet = useMemo(
		() => new Set(selectedStudents),
		[selectedStudents],
	);

	const filteredStudents = useMemo(() => {
		const q = searchTerm.toLowerCase().trim();
		if (!q) return students;
		return students.filter((s) => s.name.toLowerCase().includes(q));
	}, [students, searchTerm]);

	const filteredIds = useMemo(
		() => new Set(filteredStudents.map((s) => s.id)),
		[filteredStudents],
	);

	const selectedStudentObjects = useMemo(
		() => students.filter((s) => selectedSet.has(s.id)),
		[students, selectedSet],
	);

	const visiblePills = selectedStudentObjects.slice(0, maxVisiblePills);
	const overflowCount = selectedStudentObjects.length - maxVisiblePills;

	// ── Handlers ─────────────────────────────────────────────────────────────

	const toggle = useCallback(
		(id: string) => {
			const next = selectedSet.has(id)
				? selectedStudents.filter((sid) => sid !== id)
				: [...selectedStudents, id];
			onSelectionChange(next);
		},
		[selectedStudents, selectedSet, onSelectionChange],
	);

	const handleSelectAll = useCallback(() => {
		const nonFiltered = selectedStudents.filter((id) => !filteredIds.has(id));
		onSelectionChange([
			...new Set([...nonFiltered, ...filteredStudents.map((s) => s.id)]),
		]);
	}, [filteredStudents, selectedStudents, filteredIds, onSelectionChange]);

	const handleClear = useCallback(() => {
		onSelectionChange(selectedStudents.filter((id) => !filteredIds.has(id)));
	}, [selectedStudents, filteredIds, onSelectionChange]);

	const handleInvert = useCallback(() => {
		const nonFiltered = selectedStudents.filter((id) => !filteredIds.has(id));
		const invertedFiltered = filteredStudents
			.filter((s) => !selectedSet.has(s.id))
			.map((s) => s.id);
		onSelectionChange([...nonFiltered, ...invertedFiltered]);
	}, [
		filteredStudents,
		selectedStudents,
		selectedSet,
		filteredIds,
		onSelectionChange,
	]);

	const openPanel = useCallback(() => {
		setIsOpen(true);
		// Defer to let DOM update before focusing
		setTimeout(() => searchRef.current?.focus(), 10);
	}, []);

	const closePanel = useCallback(() => {
		setIsOpen(false);
		setSearchTerm('');
	}, []);

	const togglePanel = useCallback(() => {
		if (isOpen) closePanel();
		else openPanel();
	}, [isOpen, openPanel, closePanel]);

	// ── Outside-click & keyboard dismiss ────────────────────────────────────

	useEffect(() => {
		if (!isOpen) return;

		const onPointerDown = (e: PointerEvent) => {
			if (!wrapperRef.current?.contains(e.target as Node)) closePanel();
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				closePanel();
				triggerRef.current?.focus();
			}
		};

		document.addEventListener('pointerdown', onPointerDown, { capture: true });
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, {
				capture: true,
			});
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [isOpen, closePanel]);

	// ── Render ───────────────────────────────────────────────────────────────

	return (
		<div
			className={`relative w-full ${className}`}
			ref={wrapperRef}
		>
			{/* Label */}
			<label
				id={labelId}
				className="block text-sm font-medium text-foreground mb-1.5"
			>
				{label}{' '}
				<span className="text-muted-foreground font-normal">(optional)</span>
			</label>

			{/* Trigger */}
			<button
				ref={triggerRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-controls={panelId}
				aria-labelledby={labelId}
				onClick={togglePanel}
				className={`flex items-center gap-1.5 w-full min-h-[40px] py-[5px] px-2.5 bg-card cursor-pointer text-left transition-colors box-border
					focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
					${isOpen
						? 'rounded-t-lg border border-primary/60 border-b-0'
						: 'rounded-lg border border-border'}`}
			>
				{/* Pills row */}
				<div className="flex items-center flex-nowrap gap-1 flex-1 overflow-hidden min-w-0">
					{selectedStudentObjects.length === 0 ? (
						<span className="text-sm text-muted-foreground">
							All students included
						</span>
					) : (
						<>
							{visiblePills.map((s) => (
								<span
									key={s.id}
									className="inline-flex items-center gap-0.5 bg-accent text-primary rounded-full py-0.5 pl-1.5 pr-2 text-xs font-medium whitespace-nowrap shrink-0"
								>
									{getFirstName(s.name)}
									<span
										role="button"
										aria-label={`Remove ${getFirstName(s.name)}`}
										tabIndex={0}
										onClick={(e) => {
											e.stopPropagation();
											toggle(s.id);
										}}
										onKeyDown={(e) => {
											if (e.key === ' ' || e.key === 'Enter') {
												e.preventDefault();
												e.stopPropagation();
												toggle(s.id);
											}
										}}
										className="cursor-pointer opacity-60 text-[15px] leading-none flex items-center hover:opacity-100 transition-opacity"
									>
										×
									</span>
								</span>
							))}

							{overflowCount > 0 && (
								<span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
									+{overflowCount} more
								</span>
							)}
						</>
					)}
				</div>

				{/* Selected count badge */}
				{selectedStudentObjects.length > 0 && (
					<span className="text-[11px] font-medium text-primary bg-accent rounded-full py-px px-2 shrink-0 whitespace-nowrap">
						{selectedStudentObjects.length}
					</span>
				)}

				{/* Chevron */}
				<svg
					aria-hidden="true"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={`shrink-0 text-muted-foreground transition-transform duration-200
						${isOpen ? 'rotate-180' : 'rotate-0'}`}
				>
					<path d="M6 9l6 6 6-6" />
				</svg>
			</button>

			{/* Panel */}
			{isOpen && (
				<div
					id={panelId}
					role="listbox"
					aria-multiselectable="true"
					aria-label="Students"
					className="absolute top-full left-0 right-0 z-50 bg-card border border-primary/60 border-t-none rounded-b-lg flex flex-col shadow-lg"
				>
					{/* Search */}
					<div className="flex items-center gap-1.5 px-2.5 py-[7px] border-b border-border">
						<svg
							aria-hidden="true"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-muted-foreground shrink-0"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="M21 21l-4.35-4.35" />
						</svg>

						<input
							ref={searchRef}
							type="text"
							placeholder="Search by name…"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							aria-label="Search students"
							className="flex-1 border-none bg-transparent text-sm text-foreground outline-none p-0 min-w-0"
						/>

						{searchTerm && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => {
									setSearchTerm('');
									searchRef.current?.focus();
								}}
								className="bg-none border-none p-0.5 cursor-pointer text-muted-foreground flex items-center shrink-0 hover:text-foreground transition-colors"
							>
								<svg
									width="13"
									height="13"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={2.5}
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						)}
					</div>

					{/* Action bar */}
					<div className="flex items-center gap-0 px-2 py-1 border-b border-border bg-muted flex-wrap row-gap-0.5">
						{[
							{ label: 'Select all', handler: handleSelectAll },
							{ label: 'Clear', handler: handleClear },
							{ label: 'Invert', handler: handleInvert },
						].map(({ label: btnLabel, handler }, i) => (
							<React.Fragment key={btnLabel}>
								{i > 0 && (
									<span
										aria-hidden="true"
										className="w-px h-3 bg-border shrink-0 mx-0.5"
									/>
								)}
								<button
									type="button"
									onClick={handler}
									className="text-[11px] text-muted-foreground cursor-pointer py-[3px] px-[7px] rounded bg-none border-none transition-colors whitespace-nowrap hover:bg-card hover:text-foreground"
								>
									{btnLabel}
								</button>
							</React.Fragment>
						))}

						<span className="ml-auto text-[11px] text-muted-foreground pl-1 whitespace-nowrap">
							{searchTerm
								? `${filteredStudents.length} of ${students.length}`
								: `${selectedStudents.length} selected`}
						</span>
					</div>

					{/* Student grid — scrollable */}
					<div
						className={`overflow-y-auto ${filteredStudents.length > 0 ? 'grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1 p-2' : 'block p-0'}`}
						style={{ maxHeight: panelMaxHeight }}
					>
						{filteredStudents.length > 0 ? (
							filteredStudents.map((student) => (
								<StudentChip
									key={student.id}
									student={student}
									isSelected={selectedSet.has(student.id)}
									onToggle={toggle}
								/>
							))
						) : (
							<p className="text-center py-6 px-4 text-sm text-muted-foreground m-0">
								No students match &ldquo;{searchTerm}&rdquo;
							</p>
						)}
					</div>
				</div>
			)}

			{/* Footer: summary when closed */}
			{!isOpen && selectedStudentObjects.length > 0 && (
				<p className="mt-1.5 text-xs text-muted-foreground">
					{selectedStudentObjects.length <= 3
						? selectedStudentObjects.map((s) => getFirstName(s.name)).join(', ')
						: `${selectedStudentObjects.length} students selected`}
				</p>
			)}
		</div>
	);
});

export default StudentMultiSelect;
