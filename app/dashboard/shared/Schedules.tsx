'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	CalendarRange,
	ChevronDown,
	ClipboardList,
	Loader2,
	MapPin,
	Pencil,
	Plus,
	Table2,
	X,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { SchoolProfile } from '@/types/schoolProfile';
import {
	clearClientCacheByPrefix,
	getClientCache,
	setClientCache,
} from '@/utils/clientCache';
import { useSchoolStore } from '@/store/schoolStore';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import { getStudentClassIdForAcademicYear } from '@/utils/academicYearAccess';
import ClassScopePicker, {
	type ClassScope,
} from '@/app/dashboard/shared/components/ClassScopePicker';
import TestScheduleEditor, {
	ACADEMIC_PERIODS,
	periodLabel,
	type TestScheduleRow,
} from '@/app/dashboard/shared/components/TestScheduleEditor';

/**
 * Class timetables and test schedules.
 *
 * Both are read as a grid of time against days. Test schedules are defined at
 * level rather than class: when every class in the level sits the same paper in
 * the same window, the cell shows only the subject, and the classes are named
 * only when they actually differ.
 */

type ClassScheduleItem = {
	id: string;
	classId?: string;
	className?: string;
	level: string;
	session: string;
	subject: string;
	isRecess?: boolean;
	dayOfWeek: string;
	startTime: string;
	endTime: string;
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ALL_WEEKDAYS = [
	'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

/**
 * Weekday shading. Written as whole class names so Tailwind can find them; the
 * values behind them live in lib/tenantTheme.ts and follow the active theme.
 */
const DAY_SHADES = [
	{ cell: 'bg-day-1', head: 'bg-day-1-head' },
	{ cell: 'bg-day-2', head: 'bg-day-2-head' },
	{ cell: 'bg-day-3', head: 'bg-day-3-head' },
	{ cell: 'bg-day-4', head: 'bg-day-4-head' },
	{ cell: 'bg-day-5', head: 'bg-day-5-head' },
];

const shadeFor = (day: string) =>
	DAY_SHADES[ALL_WEEKDAYS.indexOf(day) % DAY_SHADES.length] || DAY_SHADES[0];

const formatDate = (value: string) => {
	if (!value) return '';
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(year, (month || 1) - 1, day || 1);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const weekdayOf = (value: string) => {
	if (!value) return '';
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(year, (month || 1) - 1, day || 1);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const slotLabel = (slot: string) => slot.replace('-', ' – ');

/** Shared chip, so every control on the page looks and behaves the same. */
function Chip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
				active
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:text-foreground'
			}`}
		>
			{children}
		</button>
	);
}

type SchedulesProps = {
	user?: {
		role?: string;
		firstName?: string;
		className?: string;
		classId?: string;
		academicYears?: { year?: string; classId?: string; className?: string }[];
		subjects?: {
			year: string;
			classes: { classId: string; subjects: string[] }[];
		}[];
	};
	schoolProfile: SchoolProfile;
};

export default function Schedules({ user, schoolProfile }: SchedulesProps) {
	const rawUserRole = user?.role || 'student';
	const userRole = rawUserRole === 'parent' ? 'student' : rawUserRole;
	const canEdit = userRole === 'system_admin';

	const academicYear = String(
		schoolProfile?.identity?.currentAcademicYear || '',
	).trim();

	/* ── Class metadata from the profile ──────────────────────────────── */

	const classOptions = useMemo(() => {
		const options: {
			classId: string;
			className: string;
			subjects: string[];
			level: string;
			session: string;
		}[] = [];
		Object.entries(schoolProfile.academicConfig?.classLevels || {}).forEach(
			([sessionName, session]) => {
				Object.entries(session || {}).forEach(([levelName, level]) => {
					if (levelName === 'Self Contained') return;
					const subjects = (level.subjects || []).map((subject) => subject.name);
					level.classes?.forEach((klass) => {
						options.push({
							classId: klass.classId,
							className: klass.name,
							subjects,
							level: levelName,
							session: sessionName,
						});
					});
				});
			},
		);
		return options;
	}, [schoolProfile]);

	const classOptionsById = useMemo(() => {
		const map = new Map<string, (typeof classOptions)[number]>();
		classOptions.forEach((option) => map.set(option.classId, option));
		return map;
	}, [classOptions]);

	const levelOptions = useMemo(() => {
		const map = new Map<
			string,
			{ level: string; session: string; subjects: string[] }
		>();
		classOptions.forEach((option) => {
			const key = `${option.session}::${option.level}`;
			if (!map.has(key)) {
				map.set(key, {
					level: option.level,
					session: option.session,
					subjects: option.subjects,
				});
			}
		});
		return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
	}, [classOptions]);

	/* ── Data ─────────────────────────────────────────────────────────── */

	const [classSchedules, setClassSchedules] = useState<ClassScheduleItem[]>([]);
	const [testSchedules, setTestSchedules] = useState<TestScheduleRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [scheduleError, setScheduleError] = useState('');
	const [reloadToken, setReloadToken] = useState(0);
	/**
	 * A refresh must bypass the caches exactly once. Writing the fetched rows
	 * back into the store re-runs the effect, and without consuming the token
	 * that second pass would bypass the caches again, and so on.
	 */
	const consumedToken = useRef(0);

	const studentClassId = useMemo(() => {
		if (userRole !== 'student' || !academicYear) return '';
		return getStudentClassIdForAcademicYear(user as any, academicYear, {
			allowCurrentClassFallback: true,
			currentAcademicYear: academicYear,
			schoolProfile,
		});
	}, [userRole, user, academicYear, schoolProfile]);

	const scopedSchedules = useSchoolStore(
		(state) =>
			getScopedAcademicYearValue(state.schedulesByAcademicYear, academicYear)
				.value,
	);
	const setSchedulesForYear = useSchoolStore((state) => state.setSchedulesForYear);

	const mapClassRow = useCallback(
		(item: any): ClassScheduleItem => {
			const meta = item.classId ? classOptionsById.get(item.classId) : null;
			return {
				id: String(item._id || item.id || ''),
				classId: item.classId || meta?.classId || '',
				className: item.className || meta?.className || '',
				level: item.level || meta?.level || '',
				session: item.session || meta?.session || '',
				subject: item.subject || '',
				isRecess: item.isRecess || false,
				dayOfWeek: item.dayOfWeek || '',
				startTime: item.startTime || '',
				endTime: item.endTime || '',
			};
		},
		[classOptionsById],
	);

	const mapTestRow = useCallback(
		(item: any): TestScheduleRow => {
			const meta = item.classId ? classOptionsById.get(item.classId) : null;
			return {
				id: String(item._id || item.id || ''),
				groupId: item.groupId || '',
				title: item.title || '',
				period: item.period || '',
				level: item.level || meta?.level || '',
				session: item.session || meta?.session || '',
				classId: item.classId || '',
				className: item.className || meta?.className || '',
				subject: item.subject || '',
				date: item.startDate || item.date || '',
				startTime: item.startTime || '',
				endTime: item.endTime || '',
				venue: item.venue || item.location || '',
			};
		},
		[classOptionsById],
	);

	const visibleLevelKeys = useMemo(() => {
		if (userRole === 'student' && studentClassId) {
			const meta = classOptionsById.get(studentClassId);
			return meta ? [`${meta.session}::${meta.level}`] : [];
		}
		if (userRole === 'teacher' && user?.subjects) {
			const relevant = academicYear
				? user.subjects.filter((subject) =>
						areAcademicYearsEqual(subject.year, academicYear),
					)
				: user.subjects;
			const keys = new Set<string>();
			relevant
				.flatMap((subject) => subject.classes.map((klass) => klass.classId))
				.forEach((id) => {
					const meta = classOptionsById.get(id);
					if (meta) keys.add(`${meta.session}::${meta.level}`);
				});
			return Array.from(keys);
		}
		return levelOptions.map((option) => option.key);
	}, [
		userRole,
		studentClassId,
		user?.subjects,
		classOptionsById,
		levelOptions,
		academicYear,
	]);

	useEffect(() => {
		if (!academicYear) {
			setClassSchedules([]);
			setTestSchedules([]);
			return;
		}
		let cancelled = false;

		const forceNetwork = reloadToken !== consumedToken.current;
		consumedToken.current = reloadToken;

		const fetchSchedules = async () => {
			setScheduleError('');
			try {
				if (!forceNetwork) {
					const snapshot = getScopedAcademicYearValue(
						useSchoolStore.getState().schedulesByAcademicYear,
						academicYear,
					);
					if (snapshot.key) {
						const source: any = snapshot.value || {};
						if (cancelled) return;
						setClassSchedules((source.classSchedules || []).map(mapClassRow));
						setTestSchedules((source.testSchedules || []).map(mapTestRow));
						setIsLoading(false);
						return;
					}
				}

				setIsLoading(true);
				const uniqueKeys = Array.from(new Set(visibleLevelKeys));
				const classResults: ClassScheduleItem[] = [];
				const testResults: TestScheduleRow[] = [];

				for (const key of uniqueKeys) {
					const [session, level] = key.split('::');
					const classCacheKey = `schedules:class:${academicYear}:${session}:${level}`;
					const testCacheKey = `schedules:test:${academicYear}:${session}:${level}`;
					const cachedClass = forceNetwork
						? null
						: getClientCache<any[]>(classCacheKey);
					const cachedTest = forceNetwork
						? null
						: getClientCache<any[]>(testCacheKey);

					if (cachedClass) classResults.push(...cachedClass.map(mapClassRow));
					if (cachedTest) testResults.push(...cachedTest.map(mapTestRow));
					if (cachedClass && cachedTest) continue;

					const requests: { type: 'class' | 'test'; promise: Promise<Response> }[] =
						[];
					const params = (type: string) => {
						const search = new URLSearchParams({ type, session, level });
						if (academicYear) search.set('academicYear', academicYear);
						return search.toString();
					};
					if (!cachedClass) {
						requests.push({
							type: 'class',
							promise: fetch(`/api/schedules?${params('class')}`),
						});
					}
					if (!cachedTest) {
						requests.push({
							type: 'test',
							promise: fetch(`/api/schedules?${params('test')}`),
						});
					}
					if (requests.length === 0) continue;

					const responses = await Promise.all(requests.map((r) => r.promise));
					const payloads = await Promise.all(responses.map((r) => r.json()));

					responses.forEach((response, index) => {
						const payload = payloads[index];
						if (!response.ok || !payload?.success) return;
						const data = payload.data || [];
						if (requests[index].type === 'class') {
							classResults.push(...data.map(mapClassRow));
							setClientCache(classCacheKey, data);
						} else {
							testResults.push(...data.map(mapTestRow));
							setClientCache(testCacheKey, data);
						}
					});
				}

				if (cancelled) return;
				setClassSchedules(classResults);
				setTestSchedules(testResults);
				if (academicYear) {
					setSchedulesForYear(academicYear, {
						classSchedules: classResults,
						testSchedules: testResults,
					});
				}
			} catch (error) {
				console.error('Failed to fetch schedules:', error);
				if (!cancelled) setScheduleError('Failed to load schedules.');
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		fetchSchedules();
		return () => {
			cancelled = true;
		};
	}, [
		academicYear,
		visibleLevelKeys,
		mapClassRow,
		mapTestRow,
		scopedSchedules,
		setSchedulesForYear,
		reloadToken,
	]);

	const refresh = useCallback(() => {
		clearClientCacheByPrefix('schedules:');
		setReloadToken((token) => token + 1);
	}, []);

	/* ── Teacher scoping ──────────────────────────────────────────────── */

	const teacherClassSubjects = useMemo(() => {
		const map = new Map<string, Set<string>>();
		if (userRole !== 'teacher' || !Array.isArray(user?.subjects)) return map;
		const relevant = academicYear
			? user.subjects.filter((subject) =>
					areAcademicYearsEqual(subject.year, academicYear),
				)
			: user.subjects;
		relevant.forEach((entry) => {
			(entry.classes || []).forEach((klass) => {
				const classId = (klass.classId || '').trim();
				if (!classId) return;
				if (!map.has(classId)) map.set(classId, new Set());
				(klass.subjects || []).forEach((subject) => {
					const normalized = String(subject || '').trim().toLowerCase();
					if (normalized) map.get(classId)!.add(normalized);
				});
			});
		});
		return map;
	}, [userRole, user?.subjects, academicYear]);

	const teacherClassIds = useMemo(
		() => new Set(Array.from(teacherClassSubjects.keys())),
		[teacherClassSubjects],
	);

	const scopedClassSchedules = useMemo(() => {
		if (userRole !== 'teacher') return classSchedules;
		if (teacherClassSubjects.size === 0) return [];
		return classSchedules.filter((item) => {
			const classId = (item.classId || '').trim();
			if (!classId) return false;
			const assigned = teacherClassSubjects.get(classId);
			if (!assigned) return false;
			if (item.isRecess) return true;
			const subject = String(item.subject || '').trim().toLowerCase();
			return subject ? assigned.has(subject) : false;
		});
	}, [classSchedules, userRole, teacherClassSubjects]);

	/* ── Filters ──────────────────────────────────────────────────────── */

	const [view, setView] = useState<'timetable' | 'tests'>('timetable');
	const [scope, setScope] = useState<ClassScope>({
		session: '',
		level: '',
		classId: '',
	});
	const [selectedPeriod, setSelectedPeriod] = useState('');
	const [filtersExpanded, setFiltersExpanded] = useState(false);
	const [timetableDays, setTimetableDays] = useState<string[]>(() => {
		const index = new Date().getDay();
		return [index === 0 || index === 6 ? 'Monday' : DAYS_OF_WEEK[index - 1]];
	});
	const [testDays, setTestDays] = useState<string[]>([]);

	// A student is pinned to their own class; there is nothing to choose.
	useEffect(() => {
		if (userRole !== 'student' || !studentClassId) return;
		const meta = classOptionsById.get(studentClassId);
		if (!meta) return;
		setScope({
			session: meta.session,
			level: meta.level,
			classId: studentClassId,
		});
	}, [userRole, studentClassId, classOptionsById]);

	const activeLevel = scope.level
		? { session: scope.session, level: scope.level }
		: null;

	const classesForLevel = useMemo(() => {
		if (!activeLevel) return [];
		return classOptions
			.filter(
				(option) =>
					option.session === activeLevel.session &&
					option.level === activeLevel.level,
			)
			.map((option) => ({
				classId: option.classId,
				className: option.className,
			}))
			.sort((a, b) => a.className.localeCompare(b.className));
	}, [classOptions, activeLevel]);

	const levelSubjects = useMemo(() => {
		if (!activeLevel) return [];
		return (
			levelOptions.find(
				(option) =>
					option.level === activeLevel.level &&
					option.session === activeLevel.session,
			)?.subjects ?? []
		);
	}, [levelOptions, activeLevel]);

	/* ── Timetable ────────────────────────────────────────────────────── */

	const levelClassSchedules = useMemo(() => {
		if (!activeLevel) return [];
		return scopedClassSchedules.filter(
			(item) =>
				item.session === activeLevel.session && item.level === activeLevel.level,
		);
	}, [scopedClassSchedules, activeLevel]);

	const displayClasses = useMemo(() => {
		if (userRole === 'student') {
			const own = classesForLevel.find(
				(klass) => klass.classId === studentClassId,
			);
			if (own) return [own];
		}
		if (userRole === 'teacher') {
			const assigned = classesForLevel.filter((klass) =>
				teacherClassIds.has(klass.classId),
			);
			return assigned.length > 0
				? assigned
				: [{ classId: '__none__', className: 'No assigned classes' }];
		}
		const list = scope.classId
			? classesForLevel.filter((klass) => klass.classId === scope.classId)
			: [...classesForLevel];
		if (levelClassSchedules.some((item) => !item.classId)) {
			list.push({ classId: '__all__', className: 'All Classes' });
		}
		if (list.length === 0) list.push({ classId: '__none__', className: 'No classes' });
		return list;
	}, [
		classesForLevel,
		levelClassSchedules,
		userRole,
		studentClassId,
		teacherClassIds,
		scope.classId,
	]);

	const timeSlots = useMemo(() => {
		const slots = new Set<string>();
		levelClassSchedules.forEach((item) => {
			if (item.startTime && item.endTime) {
				slots.add(`${item.startTime}-${item.endTime}`);
			}
		});
		return Array.from(slots).sort();
	}, [levelClassSchedules]);

	const scheduleMatrix = useMemo(() => {
		const map: Record<
			string,
			Record<string, Record<string, ClassScheduleItem[]>>
		> = {};
		levelClassSchedules.forEach((item) => {
			const slot = `${item.startTime}-${item.endTime}`;
			const day = item.dayOfWeek || '';
			const classKey = item.classId || '__all__';
			map[slot] ??= {};
			map[slot][day] ??= {};
			map[slot][day][classKey] ??= [];
			map[slot][day][classKey].push(item);
		});
		return map;
	}, [levelClassSchedules]);

	/* ── Test schedules ───────────────────────────────────────────────── */

	const levelTestRows = useMemo(() => {
		if (!activeLevel) return [];
		let rows = testSchedules.filter(
			(row) =>
				row.session === activeLevel.session && row.level === activeLevel.level,
		);
		// A sitting with no class applies to the whole level.
		if (userRole === 'student' && studentClassId) {
			rows = rows.filter((row) => !row.classId || row.classId === studentClassId);
		} else if (userRole === 'teacher' && teacherClassIds.size > 0) {
			rows = rows.filter((row) => !row.classId || teacherClassIds.has(row.classId));
		} else if (scope.classId) {
			rows = rows.filter((row) => !row.classId || row.classId === scope.classId);
		}
		return rows;
	}, [
		testSchedules,
		activeLevel,
		userRole,
		studentClassId,
		teacherClassIds,
		scope.classId,
	]);

	/** Periods that actually have a schedule at this level. */
	const availablePeriods = useMemo(() => {
		const set = new Set<string>();
		levelTestRows.forEach((row) => set.add(row.period || ''));
		return ACADEMIC_PERIODS.filter((option) => set.has(option.value))
			.map((option) => option.value)
			.concat(set.has('') ? [''] : []);
	}, [levelTestRows]);

	// Exactly one period is viewed at a time; settle on a sensible one.
	useEffect(() => {
		if (availablePeriods.length === 0) return;
		if (!availablePeriods.includes(selectedPeriod)) {
			setSelectedPeriod(availablePeriods[0]);
		}
	}, [availablePeriods, selectedPeriod]);

	const periodRows = useMemo(
		() => levelTestRows.filter((row) => (row.period || '') === selectedPeriod),
		[levelTestRows, selectedPeriod],
	);

	const testGroups = useMemo(() => {
		const map = new Map<
			string,
			{ groupId: string; title: string; rows: TestScheduleRow[] }
		>();
		for (const row of periodRows) {
			// Rows written before schedules were grouped carry no groupId; keying
			// them by their own id keeps each standing alone.
			const key = row.groupId || `ungrouped:${row.id}`;
			if (!map.has(key)) {
				map.set(key, {
					groupId: row.groupId,
					title: row.title || 'Untitled test schedule',
					rows: [],
				});
			}
			map.get(key)!.rows.push(row);
		}
		return Array.from(map.values());
	}, [periodRows]);

	/** Weekdays the selected period's sittings actually fall on. */
	const testWeekdays = useMemo(() => {
		const present = new Set<string>();
		periodRows.forEach((row) => {
			const day = weekdayOf(row.date);
			if (day) present.add(day);
		});
		return ALL_WEEKDAYS.filter((day) => present.has(day));
	}, [periodRows]);

	// Default to every day the schedule uses, and re-default when it changes.
	const weekdaySignature = testWeekdays.join('|');
	useEffect(() => {
		setTestDays(weekdaySignature ? weekdaySignature.split('|') : []);
	}, [weekdaySignature]);

	const visibleTestDays = useMemo(
		() => testWeekdays.filter((day) => testDays.includes(day)),
		[testWeekdays, testDays],
	);

	/**
	 * Collapses a cell's rows to what a reader needs: one line per subject, and
	 * class names only when the sitting does not cover the whole level.
	 */
	const collapseCell = useCallback(
		(rows: TestScheduleRow[]) => {
			const bySubject = new Map<string, Set<string>>();
			const venues = new Map<string, string>();
			const dates = new Map<string, string>();
			for (const row of rows) {
				if (!bySubject.has(row.subject)) bySubject.set(row.subject, new Set());
				bySubject.get(row.subject)!.add(row.classId || '__all__');
				if (row.venue) venues.set(row.subject, row.venue);
				if (row.date) dates.set(row.subject, row.date);
			}
			return Array.from(bySubject.entries()).map(([subject, ids]) => {
				const coversLevel =
					ids.has('__all__') ||
					(classesForLevel.length > 0 &&
						classesForLevel.every((klass) => ids.has(klass.classId)));
				return {
					subject,
					venue: venues.get(subject) || '',
					date: dates.get(subject) || '',
					classNames: coversLevel
						? []
						: Array.from(ids).map(
								(id) => classOptionsById.get(id)?.className || id,
							),
				};
			});
		},
		[classesForLevel, classOptionsById],
	);

	/** Per group: the time rows, and the rows in each (slot, weekday) cell. */
	const buildTestGrid = useCallback(
		(rows: TestScheduleRow[]) => {
			const slots = Array.from(
				new Set(
					rows
						.filter((row) => row.startTime && row.endTime)
						.map((row) => `${row.startTime}-${row.endTime}`),
				),
			).sort();

			const cells = new Map<string, TestScheduleRow[]>();
			const datesByDay = new Map<string, Set<string>>();
			for (const row of rows) {
				const day = weekdayOf(row.date);
				if (!day) continue;
				const key = `${row.startTime}-${row.endTime}|${day}`;
				if (!cells.has(key)) cells.set(key, []);
				cells.get(key)!.push(row);
				if (!datesByDay.has(day)) datesByDay.set(day, new Set());
				datesByDay.get(day)!.add(row.date);
			}
			return { slots, cells, datesByDay };
		},
		[],
	);

	/* ── Editors ──────────────────────────────────────────────────────── */

	const [testEditorOpen, setTestEditorOpen] = useState(false);
	const [editingGroup, setEditingGroup] = useState<TestScheduleRow[]>([]);

	const [slotOpen, setSlotOpen] = useState(false);
	const [slotDay, setSlotDay] = useState('Monday');
	const [slotStart, setSlotStart] = useState('');
	const [slotEnd, setSlotEnd] = useState('');
	const [slotIsRecess, setSlotIsRecess] = useState(false);
	const [slotSaving, setSlotSaving] = useState(false);
	const [slotEntries, setSlotEntries] = useState<
		{ classId: string; className: string; subject: string; id?: string }[]
	>([]);
	const [slotEditingIds, setSlotEditingIds] = useState<string[]>([]);

	const timeToMinutes = (time: string) => {
		if (!time) return 0;
		const [hours, minutes] = time.split(':').map((value) => parseInt(value, 10));
		return hours * 60 + minutes;
	};

	const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
		timeToMinutes(aStart) < timeToMinutes(bEnd) &&
		timeToMinutes(bStart) < timeToMinutes(aEnd);

	const openAddSlot = () => {
		if (!activeLevel) return;
		setScheduleError('');
		setSlotDay(timetableDays[0] || DAYS_OF_WEEK[0]);
		setSlotStart('');
		setSlotEnd('');
		setSlotIsRecess(false);
		setSlotEditingIds([]);
		setSlotEntries(
			classesForLevel.map((klass) => ({
				classId: klass.classId,
				className: klass.className,
				subject: '',
			})),
		);
		setSlotOpen(true);
	};

	const openEditSlot = (day: string, slot: string) => {
		if (!activeLevel) return;
		const [start, end] = slot.split('-');
		const existing = levelClassSchedules.filter(
			(item) =>
				item.dayOfWeek === day &&
				item.startTime === start &&
				item.endTime === end,
		);
		const base = classesForLevel.map((klass) => {
			const match = existing.find((item) => item.classId === klass.classId);
			return {
				classId: klass.classId,
				className: klass.className,
				subject: match?.subject || '',
				id: match?.id,
			};
		});
		const general = existing
			.filter((item) => !item.classId)
			.map((item) => ({
				classId: '__all__',
				className: 'All Classes',
				subject: item.subject || '',
				id: item.id,
			}));
		setScheduleError('');
		setSlotDay(day);
		setSlotStart(start || '');
		setSlotEnd(end || '');
		setSlotIsRecess(existing.length > 0 && existing.every((item) => item.isRecess));
		setSlotEntries([...base, ...general]);
		setSlotEditingIds(existing.map((item) => item.id));
		setSlotOpen(true);
	};

	const handleSaveSlot = async () => {
		if (!activeLevel) return;
		setScheduleError('');
		if (!slotDay || !slotStart || !slotEnd) {
			setScheduleError('Pick a day and a time range.');
			return;
		}
		const entries = slotEntries.filter((entry) => entry.classId !== '__none__');
		if (entries.length === 0) {
			setScheduleError('No classes found for this level.');
			return;
		}
		const normalized = entries.map((entry) => ({
			...entry,
			subject: slotIsRecess ? 'Recess' : entry.subject,
		}));
		if (!slotIsRecess && normalized.some((entry) => !entry.subject)) {
			setScheduleError('Enter a subject for every class.');
			return;
		}
		if (!slotIsRecess) {
			const counts = new Map<string, number>();
			normalized.forEach((entry) => {
				const key = entry.subject.trim().toLowerCase();
				if (key) counts.set(key, (counts.get(key) || 0) + 1);
			});
			if (Array.from(counts.values()).some((count) => count > 1)) {
				setScheduleError(
					'A subject can only be assigned to one class per time slot.',
				);
				return;
			}
		}

		const editingIds = new Set(slotEditingIds);
		const conflict = normalized.some((entry) =>
			levelClassSchedules.some((item) => {
				if (editingIds.has(item.id)) return false;
				if (item.dayOfWeek !== slotDay) return false;
				const sameClass =
					entry.classId && item.classId
						? item.classId === entry.classId
						: !entry.classId || !item.classId;
				if (!sameClass) return false;
				return overlaps(slotStart, slotEnd, item.startTime, item.endTime);
			}),
		);
		if (conflict) {
			setScheduleError(
				'Schedule conflict: this class already has a subject at that time.',
			);
			return;
		}

		try {
			setSlotSaving(true);
			await Promise.all(
				normalized.map(async (entry) => {
					const response = await fetch('/api/schedules', {
						method: entry.id ? 'PATCH' : 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							type: 'class',
							id: entry.id || undefined,
							level: activeLevel.level,
							session: activeLevel.session,
							classId: entry.classId === '__all__' ? '' : entry.classId,
							className: entry.className,
							subject: entry.subject,
							isRecess: slotIsRecess,
							dayOfWeek: slotDay,
							startTime: slotStart,
							endTime: slotEnd,
							academicYear,
						}),
					});
					const result = await response.json();
					if (!response.ok || !result?.success) {
						throw new Error(result?.message || 'Failed to save schedule.');
					}
				}),
			);
			setSlotOpen(false);
			refresh();
		} catch (error) {
			console.error(error);
			setScheduleError(
				error instanceof Error ? error.message : 'Failed to save class schedule.',
			);
		} finally {
			setSlotSaving(false);
		}
	};

	const handleDeleteSlot = async () => {
		if (!activeLevel || slotEditingIds.length === 0) {
			setSlotOpen(false);
			return;
		}
		try {
			setSlotSaving(true);
			await Promise.all(
				slotEditingIds.map(async (id) => {
					const response = await fetch('/api/schedules', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							id,
							type: 'class',
							level: activeLevel.level,
							session: activeLevel.session,
						}),
					});
					const result = await response.json();
					if (!response.ok || !result?.success) {
						throw new Error(result?.message || 'Failed to delete schedule.');
					}
				}),
			);
			setSlotOpen(false);
			refresh();
		} catch (error) {
			console.error(error);
			setScheduleError('Failed to delete class schedule.');
		} finally {
			setSlotSaving(false);
		}
	};

	const dayChips = view === 'timetable' ? DAYS_OF_WEEK : testWeekdays;
	const activeDays = view === 'timetable' ? timetableDays : testDays;

	/** What the collapsed filter bar says it is currently showing. */
	const filterSummary = useMemo(() => {
		const parts: string[] = [
			view === 'timetable' ? 'Class timetable' : 'Test schedule',
		];
		if (scope.level) parts.push(scope.level);
		if (scope.classId) {
			parts.push(
				classOptionsById.get(scope.classId)?.className || scope.classId,
			);
		}
		if (view === 'tests' && selectedPeriod) parts.push(periodLabel(selectedPeriod));
		return parts.join(' • ');
	}, [view, scope.level, scope.classId, classOptionsById, selectedPeriod]);
	const toggleDay = (day: string) => {
		const setter = view === 'timetable' ? setTimetableDays : setTestDays;
		const source = view === 'timetable' ? DAYS_OF_WEEK : testWeekdays;
		setter((prev) => {
			if (prev.includes(day)) {
				const remaining = prev.filter((item) => item !== day);
				// Never leave the grid with no columns at all.
				return remaining.length > 0 ? remaining : prev;
			}
			return source.filter((item) => prev.includes(item) || item === day);
		});
	};

	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
			{/* ── Header ──────────────────────────────────────────────────── */}
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-black tracking-tight sm:text-3xl">
						Schedules
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Weekly class timetables and the test schedules published for each
						marking period.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold">
						<CalendarRange className="h-4 w-4 text-muted-foreground" />
						{academicYear || 'No academic year'}
					</span>
					{canEdit && (
						<button
							type="button"
							onClick={() => {
								if (view === 'tests') {
									setEditingGroup([]);
									setTestEditorOpen(true);
								} else {
									openAddSlot();
								}
							}}
							disabled={!activeLevel}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
						>
							<Plus className="h-4 w-4" />
							{view === 'tests' ? 'New test schedule' : 'Add class slot'}
						</button>
					)}
				</div>
			</header>

			{scheduleError && (
				<div className="flex items-start justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
					<span>{scheduleError}</span>
					<button
						type="button"
						onClick={() => setScheduleError('')}
						aria-label="Dismiss"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* ── Filters ─────────────────────────────────────────────────────
			    Collapsed behind a summary bar on small screens so the schedule
			    itself gets the room; always open from `md` up. */}
			<div className="space-y-2">
				<button
					type="button"
					onClick={() => setFiltersExpanded((open) => !open)}
					className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
				>
					<span className="flex items-center gap-2 overflow-hidden text-sm font-medium text-foreground">
						<span className="truncate">{filterSummary}</span>
					</span>
					<ChevronDown
						className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
							filtersExpanded ? 'rotate-180' : ''
						}`}
					/>
				</button>

				<div
					className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out md:grid-rows-[1fr] md:opacity-100 ${
						filtersExpanded
							? 'grid-rows-[1fr] opacity-100'
							: 'grid-rows-[0fr] opacity-0'
					}`}
				>
					<div className="flex flex-col gap-4 overflow-hidden">
						{/* What to show */}
						<div className="flex flex-wrap gap-1.5">
							<Chip
								active={view === 'timetable'}
								onClick={() => setView('timetable')}
							>
								<Table2 className="h-3.5 w-3.5" />
								Class timetable
							</Chip>
							<Chip active={view === 'tests'} onClick={() => setView('tests')}>
								<ClipboardList className="h-3.5 w-3.5" />
								Test schedule
							</Chip>
						</div>

						{/* Days */}
						{dayChips.length > 0 && (
							<div className="flex flex-wrap gap-1.5">
								{dayChips.map((day) => (
									<Chip
										key={day}
										active={activeDays.includes(day)}
										onClick={() => toggleDay(day)}
									>
										<span className="hidden sm:inline">{day}</span>
										<span className="sm:hidden">{day.slice(0, 3)}</span>
									</Chip>
								))}
							</div>
						)}

						{/* Session > level > class */}
						<ClassScopePicker
							schoolProfile={schoolProfile}
							value={scope}
							onChange={setScope}
							allowedLevelKeys={visibleLevelKeys}
							// A student's (or parent's) scope is their own class; the
							// trail tells them what they are looking at, nothing more.
							readOnly={rawUserRole === 'student' || rawUserRole === 'parent'}
						/>

						{/* Period — test schedules only, one at a time */}
						{view === 'tests' && availablePeriods.length > 0 && (
							<label className="flex flex-wrap items-center gap-2">
								<span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
									Period
								</span>
								<select
									value={selectedPeriod}
									onChange={(event) => setSelectedPeriod(event.target.value)}
									className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
								>
									{availablePeriods.map((value) => (
										<option key={value || 'none'} value={value}>
											{value ? periodLabel(value) : 'No period assigned'}
										</option>
									))}
								</select>
								<span className="text-xs text-muted-foreground">
									One period at a time.
								</span>
							</label>
						)}
					</div>
				</div>
			</div>

			{/* ── Content ─────────────────────────────────────────────────── */}
			{isLoading ? (
				<div className="flex min-h-[35vh] items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : !activeLevel ? (
				<div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
					<Table2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
					<p className="text-sm font-bold text-foreground">Choose a level</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Pick a session and level above to see its schedule.
					</p>
				</div>
			) : view === 'timetable' ? (
				<section className="overflow-hidden rounded-2xl border border-border bg-card">
					<header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
						<h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							{activeLevel.session} · {activeLevel.level}
						</h2>
						<span className="text-xs text-muted-foreground">
							{timeSlots.length} time slot{timeSlots.length === 1 ? '' : 's'}
						</span>
					</header>
					<div className="no-scrollbar overflow-x-auto">
						<table className="min-w-full border-collapse text-sm">
							<thead>
								<tr>
									<th
										rowSpan={2}
										className="sticky left-0 z-30 w-[7.5rem] min-w-[7.5rem] whitespace-nowrap border border-border bg-muted px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"
									>
										Time
									</th>
									{timetableDays.map((day) => (
										<th
											key={day}
											colSpan={displayClasses.length}
											className={`min-w-[6rem] border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-foreground ${shadeFor(day).head}`}
										>
											{day}
										</th>
									))}
								</tr>
								<tr>
									{timetableDays.map((day) =>
										displayClasses.map((klass) => (
											<th
												key={`${day}-${klass.classId}`}
												className={`min-w-[6rem] whitespace-nowrap border border-border px-2 py-1.5 text-center text-xs font-bold text-foreground ${shadeFor(day).head}`}
											>
												{klass.className}
											</th>
										)),
									)}
								</tr>
							</thead>
							<tbody>
								{timeSlots.length === 0 ? (
									<tr>
										<td
											colSpan={1 + timetableDays.length * displayClasses.length}
											className="px-4 py-10 text-center text-sm text-muted-foreground"
										>
											No class schedule for this level yet.
										</td>
									</tr>
								) : (
									timeSlots.map((slot) => (
										<tr key={slot}>
											<td className="sticky left-0 z-10 w-[7.5rem] min-w-[7.5rem] whitespace-nowrap border border-border bg-card px-3 py-2 text-xs font-bold tabular-nums text-foreground">
												{slotLabel(slot)}
											</td>
											{timetableDays.map((day) =>
												displayClasses.map((klass) => {
													const cell = scheduleMatrix[slot]?.[day] || {};
													const own = cell[klass.classId] || [];
													// A slot recorded with no class covers all of them.
													const shared =
														klass.classId !== '__all__' ? cell['__all__'] || [] : [];
													const items = [...own, ...shared];
													return (
														<td
															key={`${slot}-${day}-${klass.classId}`}
															onClick={() => canEdit && openEditSlot(day, slot)}
															className={`min-w-[6rem] border border-border px-2 py-2 align-top text-foreground ${shadeFor(day).cell} ${
																canEdit ? 'cursor-pointer hover:brightness-95' : ''
															}`}
														>
															{items.length === 0 ? (
																<span className="text-xs opacity-50">—</span>
															) : (
																items.map((item) => (
																	<p
																		key={item.id}
																		className="text-xs font-bold"
																	>
																		{item.isRecess ? 'Recess' : item.subject}
																	</p>
																))
															)}
														</td>
													);
												}),
											)}
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</section>
			) : testGroups.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
					<ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
					<p className="text-sm font-bold text-foreground">
						No test schedule published
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{availablePeriods.length > 0
							? 'Nothing for this period yet.'
							: 'Test schedules for this level will appear here once published.'}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{testGroups.map((group) => {
						const grid = buildTestGrid(group.rows);
						const columns = visibleTestDays.filter((day) =>
							grid.datesByDay.has(day),
						);
						return (
							<section
								key={group.groupId || group.rows[0]?.id}
								className="overflow-hidden rounded-2xl border border-border bg-card"
							>
								{/* One title for the whole schedule. */}
								<header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
									<div className="min-w-0">
										<h2 className="break-words text-base font-black text-foreground">
											{group.title}
										</h2>
										<p className="mt-0.5 text-xs text-muted-foreground">
											{periodLabel(group.rows[0]?.period)} · {activeLevel.level}
										</p>
									</div>
									{canEdit && group.groupId && (
										<button
											type="button"
											onClick={() => {
												setEditingGroup(group.rows);
												setTestEditorOpen(true);
											}}
											className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
										>
											<Pencil className="h-3.5 w-3.5" />
											Edit
										</button>
									)}
								</header>

								<div className="no-scrollbar overflow-x-auto">
									<table className="min-w-full border-collapse text-sm">
										<thead>
											<tr>
												<th className="sticky left-0 z-30 w-[7.5rem] min-w-[7.5rem] whitespace-nowrap border border-border bg-muted px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
													Time
												</th>
												{columns.map((day) => {
													const dates = Array.from(grid.datesByDay.get(day) || []);
													return (
														<th
															key={day}
															className={`min-w-[8rem] whitespace-nowrap border border-border px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-foreground ${shadeFor(day).head}`}
														>
															{day}
															{dates.length === 1 && (
																<span className="ml-1.5 font-medium opacity-70">
																	{formatDate(dates[0])}
																</span>
															)}
														</th>
													);
												})}
											</tr>
										</thead>
										<tbody>
											{grid.slots.length === 0 || columns.length === 0 ? (
												<tr>
													<td
														colSpan={1 + columns.length}
														className="px-4 py-10 text-center text-sm text-muted-foreground"
													>
														Nothing scheduled on the selected days.
													</td>
												</tr>
											) : (
												grid.slots.map((slot) => (
													<tr key={slot}>
														<td className="sticky left-0 z-10 w-[7.5rem] min-w-[7.5rem] whitespace-nowrap border border-border bg-card px-3 py-2 text-xs font-bold tabular-nums text-foreground">
															{slotLabel(slot)}
														</td>
														{columns.map((day) => {
															const rows = grid.cells.get(`${slot}|${day}`) || [];
															const entries = collapseCell(rows);
															const dates = Array.from(
																grid.datesByDay.get(day) || [],
															);
															return (
																<td
																	key={`${slot}-${day}`}
																	className={`min-w-[8rem] border border-border px-2 py-2 align-top text-foreground ${shadeFor(day).cell}`}
																>
																	{entries.length === 0 ? (
																		<span className="text-xs opacity-50">—</span>
																	) : (
																		entries.map((entry) => (
																			<div key={entry.subject} className="mb-1 last:mb-0">
																				<p className="text-xs font-bold">
																					{entry.subject}
																				</p>
																				{/* Named only when the sitting does not
																				    cover the whole level. */}
																				{entry.classNames.length > 0 && (
																					<p className="text-[11px] opacity-75">
																						{entry.classNames.join(', ')}
																					</p>
																				)}
																				{/* The date is in the column header when a
																				    weekday holds only one; name it here when
																				    the schedule spans more than one week. */}
																				{dates.length > 1 && entry.date && (
																					<p className="text-[11px] opacity-60">
																						{formatDate(entry.date)}
																					</p>
																				)}
																				{entry.venue && (
																					<p className="inline-flex items-center gap-1 text-[11px] opacity-75">
																						<MapPin className="h-2.5 w-2.5" />
																						{entry.venue}
																					</p>
																				)}
																			</div>
																		))
																	)}
																</td>
															);
														})}
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							</section>
						);
					})}
				</div>
			)}

			{/* ── Test schedule editor ────────────────────────────────────── */}
			{canEdit && activeLevel && (
				<TestScheduleEditor
					open={testEditorOpen}
					onOpenChange={setTestEditorOpen}
					existingRows={editingGroup}
					session={activeLevel.session}
					level={activeLevel.level}
					academicYear={academicYear}
					classes={classesForLevel}
					subjects={levelSubjects}
					onSaved={() => {
						setEditingGroup([]);
						refresh();
					}}
					onDeleted={() => {
						setEditingGroup([]);
						refresh();
					}}
				/>
			)}

			{/* ── Class slot editor ───────────────────────────────────────── */}
			{canEdit && (
				<Dialog open={slotOpen} onOpenChange={setSlotOpen}>
					<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
						<DialogHeader>
							<DialogTitle>
								{slotEditingIds.length > 0 ? 'Edit time slot' : 'Add time slot'}
							</DialogTitle>
						</DialogHeader>

						<div className="grid gap-3 sm:grid-cols-3">
							<label className="block space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Day
								</span>
								<select
									value={slotDay}
									onChange={(event) => setSlotDay(event.target.value)}
									className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								>
									{DAYS_OF_WEEK.map((day) => (
										<option key={day} value={day}>
											{day}
										</option>
									))}
								</select>
							</label>
							<label className="block space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									Start time
								</span>
								<input
									type="time"
									value={slotStart}
									onChange={(event) => setSlotStart(event.target.value)}
									className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</label>
							<label className="block space-y-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
									End time
								</span>
								<input
									type="time"
									value={slotEnd}
									onChange={(event) => setSlotEnd(event.target.value)}
									className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</label>
						</div>

						<label className="flex items-center gap-2 text-sm text-muted-foreground">
							<input
								type="checkbox"
								checked={slotIsRecess}
								onChange={(event) => setSlotIsRecess(event.target.checked)}
								className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
							/>
							Recess for this slot
						</label>

						<div className="space-y-2">
							{slotEntries.filter((entry) => entry.classId !== '__none__').length ===
							0 ? (
								<p className="text-sm text-muted-foreground">
									No classes found for this level.
								</p>
							) : (
								slotEntries
									.filter((entry) => entry.classId !== '__none__')
									.map((entry) => (
										<div
											key={entry.classId}
											className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"
										>
											<div>
												<p className="text-sm font-bold text-foreground">
													{entry.className}
												</p>
												<p className="text-xs text-muted-foreground">
													{entry.classId === '__all__'
														? 'Applies to all classes'
														: 'Class specific'}
												</p>
											</div>
											<label className="block space-y-1.5">
												<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
													Subject
												</span>
												<select
													value={slotIsRecess ? 'Recess' : entry.subject}
													disabled={slotIsRecess}
													onChange={(event) =>
														setSlotEntries((prev) =>
															prev.map((item) =>
																item.classId === entry.classId
																	? { ...item, subject: event.target.value }
																	: item,
															),
														)
													}
													className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
												>
													{slotIsRecess && <option value="Recess">Recess</option>}
													<option value="">Select subject</option>
													{levelSubjects.map((subject) => (
														<option key={subject} value={subject}>
															{subject}
														</option>
													))}
												</select>
											</label>
										</div>
									))
							)}
						</div>

						{scheduleError && (
							<p className="text-sm font-medium text-destructive">{scheduleError}</p>
						)}

						<DialogFooter className="flex-wrap gap-2 sm:justify-between">
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={handleSaveSlot}
									disabled={slotSaving}
									className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
								>
									{slotSaving && <Loader2 className="h-4 w-4 animate-spin" />}
									Save slot
								</button>
								<button
									type="button"
									onClick={() => setSlotOpen(false)}
									className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted"
								>
									Cancel
								</button>
							</div>
							{slotEditingIds.length > 0 && (
								<button
									type="button"
									onClick={handleDeleteSlot}
									disabled={slotSaving}
									className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
								>
									Delete slot
								</button>
							)}
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
