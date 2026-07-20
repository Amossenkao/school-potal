'use client';

import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
	useId,
} from 'react';
import ReactDOM from 'react-dom';

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
	/** Panel max-height in px (default 260) */
	panelMaxHeight?: number;
	className?: string;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
	name
		.split(' ')
		.map((p) => p[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

const getFirstName = (name: string) => name.split(' ')[0];
const getLastName = (name: string) => name.split(' ').slice(1).join(' ');

// ─── StudentChip ─────────────────────────────────────────────────────────────

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
		<button
			type="button"
			tabIndex={0}
			onClick={() => onToggle(student.id)}
			className={[
				'relative flex flex-col items-start gap-0.5 p-2 rounded-lg cursor-pointer select-none outline-none min-w-0 w-full text-left transition-colors',
				'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
				isSelected
					? 'border border-primary/50 bg-primary/8'
					: 'border border-border bg-card hover:bg-muted/50',
			].join(' ')}
		>
			{/* Avatar */}
			<div
				className={[
					'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold mb-0.5 shrink-0 transition-colors',
					isSelected
						? 'bg-primary text-primary-foreground'
						: 'bg-muted text-muted-foreground',
				].join(' ')}
				aria-hidden="true"
			>
				{getInitials(student.name)}
			</div>

			{/* Name lines */}
			<span
				className={[
					'text-xs font-medium leading-tight truncate max-w-full',
					isSelected ? 'text-primary' : 'text-foreground',
				].join(' ')}
			>
				{getFirstName(student.name)}
			</span>
			{getLastName(student.name) && (
				<span className="text-[10px] leading-tight text-muted-foreground truncate max-w-full">
					{getLastName(student.name)}
				</span>
			)}

			{/* Check badge */}
			{isSelected && (
				<span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center">
					<svg
						width="7"
						height="7"
						viewBox="0 0 24 24"
						fill="none"
						stroke="white"
						strokeWidth={3.5}
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M20 6L9 17l-5-5" />
					</svg>
				</span>
			)}
		</button>
	);
});

// ─── StudentMultiSelect ───────────────────────────────────────────────────────

export const StudentMultiSelect = React.memo(function StudentMultiSelect({
	students,
	selectedStudents,
	onSelectionChange,
	maxVisiblePills = 3,
	label = 'Select specific students',
	panelMaxHeight = 260,
	className = '',
}: StudentMultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	// Fixed position for the portal panel, computed from the trigger's bounding rect
	const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

	const triggerRef = useRef<HTMLButtonElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const labelId = useId();
	const panelId = useId();

	// ── Derived state ─────────────────────────────────────────────────────────

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

	// ── Position panel relative to trigger ───────────────────────────────────

	const computePanelStyle = useCallback(() => {
		if (!triggerRef.current) return;
		const rect = triggerRef.current.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		// Estimate panel height: search ~40 + actionbar ~34 + grid up to panelMaxHeight
		const estimatedPanel = panelMaxHeight + 80;

		if (spaceBelow < estimatedPanel && rect.top > estimatedPanel) {
			// Flip upward
			setPanelStyle({
				position: 'fixed',
				bottom: window.innerHeight - rect.top + 4,
				left: rect.left,
				width: rect.width,
				zIndex: 9999,
			});
		} else {
			setPanelStyle({
				position: 'fixed',
				top: rect.bottom + 4,
				left: rect.left,
				width: rect.width,
				zIndex: 9999,
			});
		}
	}, [panelMaxHeight]);

	// ── Open / close ──────────────────────────────────────────────────────────

	const openPanel = useCallback(() => {
		computePanelStyle();
		setIsOpen(true);
		setTimeout(() => searchRef.current?.focus(), 10);
	}, [computePanelStyle]);

	const closePanel = useCallback(() => {
		setIsOpen(false);
		setSearchTerm('');
	}, []);

	const togglePanel = useCallback(() => {
		if (isOpen) closePanel();
		else openPanel();
	}, [isOpen, openPanel, closePanel]);

	// ── Keep panel aligned on scroll / resize ────────────────────────────────

	useEffect(() => {
		if (!isOpen) return;
		const update = () => computePanelStyle();
		window.addEventListener('scroll', update, true);
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update, true);
			window.removeEventListener('resize', update);
		};
	}, [isOpen, computePanelStyle]);

	// ── Outside-click & Escape dismiss ───────────────────────────────────────

	useEffect(() => {
		if (!isOpen) return;
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Node;
			const inTrigger = triggerRef.current?.contains(target);
			// Portal panel is in document.body — identify it by data attribute
			const inPanel = (target as HTMLElement)?.closest?.(
				'[data-student-panel="true"]',
			);
			if (!inTrigger && !inPanel) closePanel();
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

	// ── Selection handlers ────────────────────────────────────────────────────

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

	// ── Portal panel ──────────────────────────────────────────────────────────

	const panel = isOpen
		? ReactDOM.createPortal(
				<div
					data-student-panel="true"
					style={panelStyle}
					className="rounded-xl border border-border bg-card shadow-lg flex flex-col overflow-hidden"
				>
					{/* Search row */}
					<div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card">
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
							className="flex-1 bg-transparent text-sm text-foreground outline-none border-none p-0 min-w-0 placeholder:text-muted-foreground"
						/>
						{searchTerm && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => {
									setSearchTerm('');
									searchRef.current?.focus();
								}}
								className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
					<div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
						{(
							[
								{ label: 'All', handler: handleSelectAll },
								{ label: 'Clear', handler: handleClear },
								{ label: 'Invert', handler: handleInvert },
							] as const
						).map(({ label: btnLabel, handler }, i) => (
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
									className="text-[11px] text-muted-foreground py-1 px-2 rounded hover:bg-card hover:text-foreground transition-colors whitespace-nowrap"
								>
									{btnLabel}
								</button>
							</React.Fragment>
						))}
						<span className="ml-auto text-[11px] text-muted-foreground pl-2 whitespace-nowrap">
							{searchTerm
								? `${filteredStudents.length} of ${students.length}`
								: `${selectedStudents.length} / ${students.length} selected`}
						</span>
					</div>

					{/* Student chip grid */}
					<div
						className="overflow-y-auto p-2"
						style={{ maxHeight: panelMaxHeight }}
					>
						{filteredStudents.length > 0 ? (
							<div
								className="grid gap-1.5"
								style={{
									gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
								}}
							>
								{filteredStudents.map((student) => (
									<StudentChip
										key={student.id}
										student={student}
										isSelected={selectedSet.has(student.id)}
										onToggle={toggle}
									/>
								))}
							</div>
						) : (
							<p className="text-center py-6 text-sm text-muted-foreground">
								No students match &ldquo;{searchTerm}&rdquo;
							</p>
						)}
					</div>
				</div>,
				document.body,
			)
		: null;

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className={`relative w-full ${className}`}>
			{/* Label */}
			<label
				id={labelId}
				className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5"
			>
				{label}{' '}
				<span className="normal-case tracking-normal font-normal">
					(optional)
				</span>
			</label>

			{/* Trigger button */}
			<button
				ref={triggerRef}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-controls={panelId}
				aria-labelledby={labelId}
				onClick={togglePanel}
				className={[
					'flex items-center gap-1.5 w-full min-h-[40px] py-1.5 px-3 bg-background cursor-pointer text-left transition-colors rounded-lg border',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
					isOpen
						? 'border-primary/40 ring-2 ring-primary/20'
						: 'border-border hover:border-foreground/30',
				].join(' ')}
			>
				{/* Pills / placeholder */}
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
									className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full py-0.5 pl-2 pr-1.5 text-xs font-medium whitespace-nowrap shrink-0"
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
										className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity flex items-center"
									>
										<svg
											width="10"
											height="10"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth={2.5}
											strokeLinecap="round"
										>
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
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

				{/* Count badge */}
				{selectedStudentObjects.length > 0 && (
					<span className="text-[11px] font-medium text-primary bg-primary/10 rounded-full py-px px-2 shrink-0 whitespace-nowrap">
						{selectedStudentObjects.length}
					</span>
				)}

				{/* Chevron */}
				<svg
					aria-hidden="true"
					width="15"
					height="15"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={`shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
				>
					<path d="M6 9l6 6 6-6" />
				</svg>
			</button>

			{/* Portal panel renders into document.body */}
			{panel}

			{/* Closed-state summary */}
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
