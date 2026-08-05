'use client';

import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	ChevronRight,
	LayoutGrid,
	Search,
	Users,
	X,
} from 'lucide-react';

/**
 * Cache-first student lookup shared by the finance pages.
 *
 * Two ways in, both served entirely from the roster already in the school
 * store — no network call, and never a full roster dump on screen:
 *   • Search — type-ahead over name / ID / class, ranked, hard-capped.
 *   • Browse — drill down session → level → class, so the only list ever
 *     rendered is a single class.
 */

export interface StudentFinderStudent {
	studentId: string;
	firstName?: string;
	lastName?: string;
	className?: string;
	classId?: string;
	[key: string]: any;
}

interface StudentFinderProps {
	students: StudentFinderStudent[];
	schoolProfile: any;
	academicYear: string;
	onSelect: (student: StudentFinderStudent) => void;
	/** Student IDs already picked — rendered as "selected" and given a check. */
	selectedIds?: Set<string>;
	/** Right-hand content per result row, e.g. a balance or badge count. */
	renderMeta?: (student: StudentFinderStudent) => React.ReactNode;
	placeholder?: string;
	/** Cap on search results before asking the user to narrow down. */
	maxResults?: number;
	autoFocus?: boolean;
	/**
	 * Show the student ID beneath the name. Off for surfaces that identify
	 * students by name and class instead, such as the audit trail.
	 */
	showStudentId?: boolean;
	/** Extra classes for the outer wrapper. */
	className?: string;
}

const normalizeYear = (value?: string) => (value || '').replace(/\//g, '-');

export const studentFullName = (student: StudentFinderStudent): string =>
	`${student?.firstName || ''} ${student?.lastName || ''}`.trim() ||
	student?.fullName ||
	student?.username ||
	String(student?.studentId || 'Unknown');

/** The class a student sat in for a specific year, not their current one. */
export const classIdForYear = (
	student: StudentFinderStudent,
	academicYear: string,
): string => {
	const entry = Array.isArray(student?.academicYears)
		? student.academicYears.find(
				(item: any) => normalizeYear(item?.year) === normalizeYear(academicYear),
			)
		: null;
	return entry?.classId || student?.classId || '';
};

interface ClassNode {
	classId: string;
	className: string;
	session: string;
	level: string;
}

export function useClassDirectory(schoolProfile: any) {
	return useMemo(() => {
		const byId: Record<string, ClassNode> = {};
		const sessions: string[] = [];
		const levelsBySession: Record<string, string[]> = {};
		const classesByLevel: Record<string, ClassNode[]> = {};

		for (const [session, levels] of Object.entries(
			schoolProfile?.academicConfig?.classLevels || {},
		)) {
			if (!levels || typeof levels !== 'object') continue;
			sessions.push(session);
			levelsBySession[session] = [];
			for (const [level, levelData] of Object.entries(levels)) {
				if (!levelData || typeof levelData !== 'object') continue;
				levelsBySession[session].push(level);
				const key = `${session}::${level}`;
				classesByLevel[key] = [];
				for (const cls of (levelData as any).classes ?? []) {
					const node: ClassNode = {
						classId: cls.classId,
						className: cls.name || cls.classId,
						session,
						level,
					};
					byId[cls.classId] = node;
					classesByLevel[key].push(node);
				}
			}
		}
		return { byId, sessions, levelsBySession, classesByLevel };
	}, [schoolProfile]);
}

/** Prefix hits outrank substring hits, so "Jo" surfaces Joseph before Ajoke. */
function scoreMatch(haystack: string, needle: string): number {
	if (!haystack) return -1;
	const index = haystack.indexOf(needle);
	if (index === -1) return -1;
	if (index === 0) return 0;
	if (haystack[index - 1] === ' ') return 1;
	return 2;
}

export default function StudentFinder({
	students,
	schoolProfile,
	academicYear,
	onSelect,
	selectedIds,
	renderMeta,
	placeholder = 'Search by name, ID, or class…',
	maxResults = 8,
	autoFocus = false,
	showStudentId = true,
	className = '',
}: StudentFinderProps) {
	const [mode, setMode] = useState<'search' | 'browse'>('search');
	const [query, setQuery] = useState('');
	const [session, setSession] = useState<string | null>(null);
	const [level, setLevel] = useState<string | null>(null);
	const [classId, setClassId] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	// Keeps typing responsive on large rosters: the input updates immediately,
	// the (heavier) filtering trails one render behind.
	const deferredQuery = useDeferredValue(query);
	const directory = useClassDirectory(schoolProfile);

	const indexed = useMemo(
		() =>
			(students || []).map((student) => {
				const cid = classIdForYear(student, academicYear);
				const name = studentFullName(student);
				return {
					student,
					classId: cid,
					className:
						directory.byId[cid]?.className || student.className || '',
					haystackName: name.toLowerCase(),
					haystackId: String(student.studentId || student.username || '')
						.toLowerCase(),
					haystackClass: (
						directory.byId[cid]?.className ||
						student.className ||
						''
					).toLowerCase(),
				};
			}),
		[students, academicYear, directory.byId],
	);

	const searchResults = useMemo(() => {
		const needle = deferredQuery.trim().toLowerCase();
		if (!needle) return { rows: [], total: 0 };
		const scored: { row: (typeof indexed)[number]; score: number }[] = [];
		for (const row of indexed) {
			const score = Math.min(
				...[
					scoreMatch(row.haystackName, needle),
					scoreMatch(row.haystackId, needle),
					scoreMatch(row.haystackClass, needle) + 3,
				].filter((value) => value >= 0),
			);
			if (Number.isFinite(score) && score >= 0) scored.push({ row, score });
		}
		scored.sort(
			(a, b) =>
				a.score - b.score || a.row.haystackName.localeCompare(b.row.haystackName),
		);
		return {
			rows: scored.slice(0, maxResults).map((entry) => entry.row),
			total: scored.length,
		};
	}, [indexed, deferredQuery, maxResults]);

	const browseResults = useMemo(() => {
		if (!classId) return [];
		return indexed
			.filter((row) => row.classId === classId)
			.sort((a, b) => a.haystackName.localeCompare(b.haystackName));
	}, [indexed, classId]);

	const rows = mode === 'search' ? searchResults.rows : browseResults;

	useEffect(() => {
		setActiveIndex(0);
	}, [deferredQuery, classId, mode]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (rows.length === 0) return;
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setActiveIndex((prev) => (prev + 1) % rows.length);
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				setActiveIndex((prev) => (prev - 1 + rows.length) % rows.length);
			} else if (event.key === 'Enter') {
				event.preventDefault();
				const row = rows[activeIndex];
				if (row) onSelect(row.student);
			} else if (event.key === 'Escape') {
				setQuery('');
			}
		},
		[rows, activeIndex, onSelect],
	);

	const levels = session ? directory.levelsBySession[session] || [] : [];
	const classes =
		session && level ? directory.classesByLevel[`${session}::${level}`] || [] : [];

	const resultList = (
		<ul className="divide-y divide-border">
			{rows.map((row, index) => {
				const isSelected = selectedIds?.has(String(row.student.studentId));
				const isActive = mode === 'search' && index === activeIndex;
				return (
					<li key={row.student.studentId}>
						<button
							type="button"
							onClick={() => onSelect(row.student)}
							onMouseEnter={() => setActiveIndex(index)}
							className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors sm:px-4 ${
								isActive ? 'bg-muted' : 'hover:bg-muted/60'
							} ${isSelected ? 'bg-primary/5' : ''}`}
						>
							<span
								className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
									isSelected
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground'
								}`}
								aria-hidden
							>
								{studentFullName(row.student)
									.split(' ')
									.slice(0, 2)
									.map((part) => part[0] || '')
									.join('')
									.toUpperCase()}
							</span>
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-semibold text-foreground">
									{studentFullName(row.student)}
								</span>
								<span className="block truncate text-xs text-muted-foreground">
									{showStudentId
										? `${row.student.studentId}${row.className ? ` · ${row.className}` : ''}`
										: row.className || 'No class on record'}
								</span>
							</span>
							{renderMeta ? (
								<span className="shrink-0 text-right">
									{renderMeta(row.student)}
								</span>
							) : (
								<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
							)}
						</button>
					</li>
				);
			})}
		</ul>
	);

	return (
		<div className={`rounded-2xl border border-border bg-card ${className}`}>
			{/* Mode switch */}
			<div className="flex gap-1 border-b border-border p-2">
				{[
					{ id: 'search' as const, label: 'Search', icon: Search },
					{ id: 'browse' as const, label: 'Browse by class', icon: LayoutGrid },
				].map((tab) => {
					const TabIcon = tab.icon;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setMode(tab.id)}
							className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
								mode === tab.id
									? 'bg-muted text-foreground'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							<TabIcon className="h-3.5 w-3.5" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{mode === 'search' ? (
				<div>
					<div className="relative p-3">
						<Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<input
							ref={inputRef}
							type="text"
							value={query}
							autoFocus={autoFocus}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						/>
						{query && (
							<button
								type="button"
								onClick={() => {
									setQuery('');
									inputRef.current?.focus();
								}}
								className="absolute right-5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full hover:bg-muted"
								aria-label="Clear search"
							>
								<X className="h-3.5 w-3.5 text-muted-foreground" />
							</button>
						)}
					</div>

					{!query.trim() ? (
						<p className="px-4 pb-4 text-xs text-muted-foreground">
							Start typing a name, student ID, or class. Results come from the
							cached {academicYear || 'current'} roster —{' '}
							{indexed.length.toLocaleString()} student
							{indexed.length === 1 ? '' : 's'} indexed.
						</p>
					) : rows.length === 0 ? (
						<p className="px-4 pb-4 text-sm text-muted-foreground">
							No students match “{query.trim()}”.
						</p>
					) : (
						<>
							{resultList}
							<p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
								{searchResults.total > rows.length
									? `Showing ${rows.length} of ${searchResults.total} matches — keep typing to narrow down.`
									: `${searchResults.total} match${searchResults.total === 1 ? '' : 'es'}. Use ↑ ↓ and Enter to pick.`}
							</p>
						</>
					)}
				</div>
			) : (
				<div className="p-3">
					{/* Breadcrumb trail */}
					{(session || level || classId) && (
						<div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
							<button
								type="button"
								onClick={() => {
									setSession(null);
									setLevel(null);
									setClassId(null);
								}}
								className="font-bold text-primary hover:underline"
							>
								All
							</button>
							{session && (
								<>
									<ChevronRight className="h-3 w-3 text-muted-foreground" />
									<button
										type="button"
										onClick={() => {
											setLevel(null);
											setClassId(null);
										}}
										className="font-bold text-primary hover:underline"
									>
										{session}
									</button>
								</>
							)}
							{level && (
								<>
									<ChevronRight className="h-3 w-3 text-muted-foreground" />
									<button
										type="button"
										onClick={() => setClassId(null)}
										className="font-bold text-primary hover:underline"
									>
										{level}
									</button>
								</>
							)}
							{classId && (
								<>
									<ChevronRight className="h-3 w-3 text-muted-foreground" />
									<span className="font-bold text-foreground">
										{directory.byId[classId]?.className}
									</span>
								</>
							)}
						</div>
					)}

					{!session ? (
						<ChipGrid
							items={directory.sessions.map((name) => ({
								key: name,
								label: name,
							}))}
							onPick={(key) => setSession(key)}
							emptyMessage="No sessions configured."
						/>
					) : !level ? (
						<ChipGrid
							items={levels.map((name) => ({ key: name, label: name }))}
							onPick={(key) => setLevel(key)}
							emptyMessage="No levels in this session."
						/>
					) : !classId ? (
						<ChipGrid
							items={classes.map((node) => ({
								key: node.classId,
								label: node.className,
								hint: `${indexed.filter((row) => row.classId === node.classId).length}`,
							}))}
							onPick={(key) => setClassId(key)}
							emptyMessage="No classes at this level."
						/>
					) : browseResults.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No students enrolled in this class for {academicYear}.
						</p>
					) : (
						<div className="-mx-3 -mb-3 max-h-80 overflow-y-auto border-t border-border">
							{resultList}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * The drill-down grid used to step through sessions, levels and classes.
 * Exported so other screens present the same control rather than a lookalike.
 */
export function ChipGrid({
	items,
	onPick,
	emptyMessage,
}: {
	items: { key: string; label: string; hint?: string }[];
	onPick: (key: string) => void;
	emptyMessage: string;
}) {
	if (items.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				{emptyMessage}
			</p>
		);
	}
	return (
		<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => (
				<button
					key={item.key}
					type="button"
					onClick={() => onPick(item.key)}
					className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/60"
				>
					<span className="min-w-0 truncate text-sm font-semibold text-foreground">
						{item.label}
					</span>
					{item.hint !== undefined ? (
						<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
							<Users className="h-3 w-3" />
							{item.hint}
						</span>
					) : (
						<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
					)}
				</button>
			))}
		</div>
	);
}
