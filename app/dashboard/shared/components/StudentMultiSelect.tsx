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
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: '2px',
				padding: '8px',
				borderRadius: '6px',
				border: isSelected
					? '0.5px solid var(--border-accent, #378add)'
					: '0.5px solid var(--border, rgba(0,0,0,0.12))',
				background: isSelected
					? 'var(--bg-accent, #e6f1fb)'
					: 'var(--surface-2, #fff)',
				cursor: 'pointer',
				position: 'relative',
				transition: 'border-color 0.1s, background 0.1s',
				userSelect: 'none',
				outline: 'none',
				minWidth: 0,
			}}
			onFocus={(e) =>
				(e.currentTarget.style.boxShadow =
					'0 0 0 2px var(--border-accent, #378add)')
			}
			onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
		>
			{/* Avatar */}
			<div
				style={{
					width: '26px',
					height: '26px',
					borderRadius: '50%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '10px',
					fontWeight: 500,
					marginBottom: '2px',
					flexShrink: 0,
					background: isSelected
						? 'var(--fill-accent, #378add)'
						: 'var(--surface-0, #f1efea)',
					color: isSelected
						? 'var(--on-accent, #fff)'
						: 'var(--text-secondary, #5f5e5a)',
					transition: 'background 0.1s, color 0.1s',
				}}
				aria-hidden="true"
			>
				{getInitials(student.name)}
			</div>

			{/* Name lines */}
			<span
				style={{
					fontSize: '12px',
					fontWeight: 500,
					lineHeight: '1.25',
					color: isSelected
						? 'var(--text-accent, #185fa5)'
						: 'var(--text-primary, #2c2c2a)',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					maxWidth: '100%',
				}}
			>
				{getFirstName(student.name)}
			</span>
			<span
				style={{
					fontSize: '10px',
					lineHeight: '1.25',
					color: 'var(--text-secondary, #888780)',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					maxWidth: '100%',
				}}
			>
				{getLastName(student.name)}
			</span>

			{/* Check mark */}
			<svg
				aria-hidden="true"
				style={{
					position: 'absolute',
					top: '5px',
					right: '6px',
					opacity: isSelected ? 1 : 0,
					transition: 'opacity 0.1s',
					color: 'var(--text-accent, #185fa5)',
				}}
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

	const triggerRadius = isOpen ? '8px 8px 0 0' : '8px';

	return (
		<div
			className={className}
			ref={wrapperRef}
			style={{ position: 'relative', width: '100%' }}
		>
			{/* Label */}
			<label
				id={labelId}
				style={{
					display: 'block',
					fontSize: '14px',
					fontWeight: 500,
					color: 'var(--text-primary, #2c2c2a)',
					marginBottom: '6px',
				}}
			>
				{label}{' '}
				<span style={{ color: 'var(--text-muted, #b4b2a9)', fontWeight: 400 }}>
					(optional)
				</span>
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
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
					width: '100%',
					minHeight: '40px',
					padding: '5px 10px',
					borderRadius: triggerRadius,
					border: isOpen
						? '0.5px solid var(--border-accent, #378add)'
						: '0.5px solid var(--border-strong, rgba(0,0,0,0.2))',
					borderBottom: isOpen ? 'none' : undefined,
					background: 'var(--surface-2, #fff)',
					cursor: 'pointer',
					textAlign: 'left',
					transition: 'border-color 0.15s',
					outline: 'none',
					boxSizing: 'border-box',
				}}
				onFocus={(e) =>
					!isOpen &&
					(e.currentTarget.style.boxShadow =
						'0 0 0 2px var(--border-accent, #378add)')
				}
				onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
			>
				{/* Pills row */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						flexWrap: 'nowrap',
						gap: '4px',
						flex: 1,
						overflow: 'hidden',
						minWidth: 0,
					}}
				>
					{selectedStudentObjects.length === 0 ? (
						<span
							style={{ fontSize: '14px', color: 'var(--text-muted, #b4b2a9)' }}
						>
							All students included
						</span>
					) : (
						<>
							{visiblePills.map((s) => (
								<span
									key={s.id}
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: '3px',
										background: 'var(--bg-accent, #e6f1fb)',
										color: 'var(--text-accent, #185fa5)',
										borderRadius: '99px',
										padding: '2px 7px 2px 6px',
										fontSize: '12px',
										fontWeight: 500,
										whiteSpace: 'nowrap',
										flexShrink: 0,
									}}
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
										style={{
											cursor: 'pointer',
											opacity: 0.6,
											fontSize: '15px',
											lineHeight: 1,
											display: 'flex',
											alignItems: 'center',
										}}
										onMouseEnter={(e) =>
											((e.currentTarget as HTMLElement).style.opacity = '1')
										}
										onMouseLeave={(e) =>
											((e.currentTarget as HTMLElement).style.opacity = '0.6')
										}
									>
										×
									</span>
								</span>
							))}

							{overflowCount > 0 && (
								<span
									style={{
										fontSize: '12px',
										color: 'var(--text-secondary, #888780)',
										whiteSpace: 'nowrap',
										flexShrink: 0,
									}}
								>
									+{overflowCount} more
								</span>
							)}
						</>
					)}
				</div>

				{/* Selected count badge */}
				{selectedStudentObjects.length > 0 && (
					<span
						style={{
							fontSize: '11px',
							fontWeight: 500,
							color: 'var(--text-accent, #185fa5)',
							background: 'var(--bg-accent, #e6f1fb)',
							borderRadius: '99px',
							padding: '1px 7px',
							flexShrink: 0,
							whiteSpace: 'nowrap',
						}}
					>
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
					style={{
						color: 'var(--text-secondary, #888780)',
						flexShrink: 0,
						transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
						transition: 'transform 0.18s',
					}}
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
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						right: 0,
						zIndex: 50,
						background: 'var(--surface-2, #fff)',
						border: '0.5px solid var(--border-accent, #378add)',
						borderTop: 'none',
						borderRadius: '0 0 8px 8px',
						display: 'flex',
						flexDirection: 'column',
						boxShadow:
							'0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
					}}
				>
					{/* Search */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
							padding: '7px 10px',
							borderBottom: '0.5px solid var(--border, rgba(0,0,0,0.1))',
						}}
					>
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
							style={{ color: 'var(--text-muted, #b4b2a9)', flexShrink: 0 }}
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
							style={{
								flex: 1,
								border: 'none',
								background: 'transparent',
								fontSize: '13px',
								color: 'var(--text-primary, #2c2c2a)',
								outline: 'none',
								padding: 0,
								minWidth: 0,
							}}
						/>

						{searchTerm && (
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => {
									setSearchTerm('');
									searchRef.current?.focus();
								}}
								style={{
									background: 'none',
									border: 'none',
									padding: '2px',
									cursor: 'pointer',
									color: 'var(--text-muted, #b4b2a9)',
									display: 'flex',
									alignItems: 'center',
									flexShrink: 0,
								}}
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
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0',
							padding: '4px 8px',
							borderBottom: '0.5px solid var(--border, rgba(0,0,0,0.1))',
							background: 'var(--surface-1, #f1efea)',
							flexWrap: 'wrap',
							rowGap: '2px',
						}}
					>
						{[
							{ label: 'Select all', handler: handleSelectAll },
							{ label: 'Clear', handler: handleClear },
							{ label: 'Invert', handler: handleInvert },
						].map(({ label: btnLabel, handler }, i) => (
							<React.Fragment key={btnLabel}>
								{i > 0 && (
									<span
										aria-hidden="true"
										style={{
											width: '1px',
											height: '12px',
											background: 'var(--border-strong, rgba(0,0,0,0.2))',
											flexShrink: 0,
											margin: '0 2px',
										}}
									/>
								)}
								<button
									type="button"
									onClick={handler}
									style={{
										fontSize: '11px',
										color: 'var(--text-secondary, #888780)',
										cursor: 'pointer',
										padding: '3px 7px',
										borderRadius: '4px',
										background: 'none',
										border: 'none',
										transition: 'background 0.12s, color 0.12s',
										whiteSpace: 'nowrap',
									}}
									onMouseEnter={(e) => {
										(e.currentTarget as HTMLElement).style.background =
											'var(--surface-2, #fff)';
										(e.currentTarget as HTMLElement).style.color =
											'var(--text-primary, #2c2c2a)';
									}}
									onMouseLeave={(e) => {
										(e.currentTarget as HTMLElement).style.background = 'none';
										(e.currentTarget as HTMLElement).style.color =
											'var(--text-secondary, #888780)';
									}}
								>
									{btnLabel}
								</button>
							</React.Fragment>
						))}

						<span
							style={{
								marginLeft: 'auto',
								fontSize: '11px',
								color: 'var(--text-muted, #b4b2a9)',
								paddingLeft: '4px',
								whiteSpace: 'nowrap',
							}}
						>
							{searchTerm
								? `${filteredStudents.length} of ${students.length}`
								: `${selectedStudents.length} selected`}
						</span>
					</div>

					{/* Student grid — scrollable */}
					<div
						style={{
							overflowY: 'auto',
							maxHeight: `${panelMaxHeight}px`,
							padding: filteredStudents.length > 0 ? '8px' : '0',
							// Responsive grid: fills available width, min 90px per chip
							display: filteredStudents.length > 0 ? 'grid' : 'block',
							gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
							gap: '4px',
							// Smooth scroll inertia on iOS
							WebkitOverflowScrolling: 'touch',
						}}
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
							<p
								style={{
									textAlign: 'center',
									padding: '24px 16px',
									fontSize: '13px',
									color: 'var(--text-muted, #b4b2a9)',
									margin: 0,
								}}
							>
								No students match &ldquo;{searchTerm}&rdquo;
							</p>
						)}
					</div>
				</div>
			)}

			{/* Footer: summary when closed */}
			{!isOpen && selectedStudentObjects.length > 0 && (
				<p
					style={{
						marginTop: '6px',
						fontSize: '12px',
						color: 'var(--text-secondary, #888780)',
					}}
				>
					{selectedStudentObjects.length <= 3
						? selectedStudentObjects.map((s) => getFirstName(s.name)).join(', ')
						: `${selectedStudentObjects.length} students selected`}
				</p>
			)}
		</div>
	);
});

export default StudentMultiSelect;
