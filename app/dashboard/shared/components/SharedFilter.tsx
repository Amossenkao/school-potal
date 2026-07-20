'use client';

import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from 'react';
import ReactDOM from 'react-dom';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import {
	areAcademicYearsEqual,
	getScopedAcademicYearValue,
} from '@/utils/academicYear';
import {
	buildSchoolAcademicYearRange,
	pickCurrentOrMostRecentAcademicYear,
	pickMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import { StudentMultiSelect } from './StudentMultiSelect';
import { PageLoading } from '@/components/loading';
import { getStudentAllowedAccess } from '@/utils/schoolSettingsAccess';
import { ChevronDown, Check, ArrowRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Student {
	id: string;
	name: string;
	className: string;
}

export interface BaseFilters {
	academicYear: string;
	selectedStudents: string[];
}

export interface YearlyReportFilters extends BaseFilters {
	session: string;
	classLevel: string;
	className: string;
	includeSponsorName: boolean;
	sponsorName: string;
	includePrincipalSignature: boolean;
	principalSignatureValue: string;
	includeDate: boolean;
	dateValue: string;
}

export interface SemesterReportFilters extends BaseFilters {
	session: string;
	classLevel: string;
	className: string;
	semester: 'first' | 'second' | '';
}

export interface PeriodicReportFilters extends BaseFilters {
	session: string;
	gradeLevel: string;
	className: string;
	period: string;
}

export type ExtraFilterConfig = {
	field: string;
	label: string;
	options: Array<{ value: string; label: string }>;
};

export type FilterConfig<T extends BaseFilters> = {
	gradeLevelField: 'classLevel' | 'gradeLevel';
	extraFilter?: ExtraFilterConfig;
	renderExtraFields?: (
		filters: T,
		setFilters: React.Dispatch<React.SetStateAction<T>>,
	) => React.ReactNode;
	validateCanSubmit?: (filters: T, isStudent: boolean) => boolean;
	studentViewTitle?: string;
	nonStudentViewTitle?: string;
	viewButtonText?: string;
	applyButtonText?: string;
	showStudentReset?: boolean;
	showNonStudentReset?: boolean;
	passStudentsToSubmit?: boolean;
	filterSessionsByUser?: boolean;
	showStudentSelect?: (filters: T, isSystemAdmin: boolean) => boolean;
	showGradeLevelWhenSingle?: boolean;
	showClassAlways?: boolean;
	buildStudentName?: (student: any) => string;
	normalizeStudentId?: (...ids: Array<unknown>) => string;
	onReset?: (
		setFilters: React.Dispatch<React.SetStateAction<T>>,
		defaultAcademicYear: string,
	) => void;
	autoSelectSingle?: boolean;
};

export interface SharedFilterProps<T extends BaseFilters> {
	filters: T;
	setFilters: React.Dispatch<React.SetStateAction<T>>;
	onSubmit: (activeStudents?: Student[]) => void;
	config: FilterConfig<T>;
	reportType?: 'yearly' | 'semester' | 'periodic';
}

// ─── Utility Functions ────────────────────────────────────────────────────────

const getCurrentAcademicYear = () => {
	const currentDate = new Date();
	const currentYear = currentDate.getFullYear();
	const currentMonth = currentDate.getMonth() + 1;
	if (currentMonth >= 8) {
		return `${currentYear}-${currentYear + 1}`;
	}
	return `${currentYear - 1}-${currentYear}`;
};

const getClassMetaById = (classLevels: any, classId?: string) => {
	if (!classLevels || !classId) return null;
	for (const [session, levels] of Object.entries(classLevels)) {
		if (!levels || typeof levels !== 'object') continue;
		for (const [level, levelData] of Object.entries(levels as any)) {
			if (!levelData?.classes || !Array.isArray(levelData.classes)) continue;
			const found = levelData.classes.find(
				(cls: any) => cls.classId === classId,
			);
			if (found) {
				return { session, level, name: found.name };
			}
		}
	}
	return null;
};

const defaultNormalizeStudentId = (...ids: Array<unknown>) => {
	for (const id of ids) {
		if (id === null || id === undefined) continue;
		const normalized = String(id).trim();
		if (normalized) return normalized;
	}
	return '';
};

const defaultBuildStudentName = (student: any) => {
	const fullName = [student?.firstName, student?.middleName, student?.lastName]
		.map((part) => (typeof part === 'string' ? part.trim() : ''))
		.filter(Boolean)
		.join(' ')
		.trim();
	if (fullName) return fullName;
	if (typeof student?.name === 'string' && student.name.trim())
		return student.name.trim();
	if (typeof student?.studentName === 'string' && student.studentName.trim())
		return student.studentName.trim();
	return '';
};

const getStudentClassIdForYear = (student: any, academicYear: string) => {
	const yearEntry = Array.isArray(student?.academicYears)
		? student.academicYears.find((ay: any) =>
				areAcademicYearsEqual(ay.year, academicYear),
			)
		: null;
	if (yearEntry?.classId) return yearEntry.classId;

	const historicalClassId = String(
		student?.historicalClass?.classId || '',
	).trim();
	const historicalAcademicYear = String(
		student?.historicalClass?.academicYear || '',
	).trim();
	if (
		historicalClassId &&
		(!historicalAcademicYear ||
			areAcademicYearsEqual(historicalAcademicYear, academicYear))
	) {
		return historicalClassId;
	}

	const directClassId = String(student?.classId || '').trim();
	if (directClassId) return directClassId;

	const currentClassId = String(student?.currentClass?.classId || '').trim();
	if (currentClassId) return currentClassId;

	return '';
};

const OFFLINE_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

// ─── FilterSelect — portal-based dropdown that escapes overflow-hidden ────────

const FilterSelect = ({
	label,
	value,
	onChange,
	options,
	placeholder,
	disabled = false,
	done = false,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: Array<{ value: string; label: string }>;
	placeholder: string;
	disabled?: boolean;
	done?: boolean;
}) => {
	const [open, setOpen] = useState(false);
	const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
	const buttonRef = useRef<HTMLButtonElement>(null);
	const selected = options.find((o) => o.value === value);

	// Measure button position and set dropdown coords each time it opens
	useEffect(() => {
		if (!open || !buttonRef.current) return;

		const updatePosition = () => {
			const rect = buttonRef.current!.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const dropdownHeight = Math.min(options.length * 40 + 8, 216); // ~max-h-52

			// Flip upward if not enough space below
			if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
				setDropdownStyle({
					position: 'fixed',
					top: rect.top - dropdownHeight - 4,
					left: rect.left,
					width: rect.width,
					zIndex: 9999,
				});
			} else {
				setDropdownStyle({
					position: 'fixed',
					top: rect.bottom + 4,
					left: rect.left,
					width: rect.width,
					zIndex: 9999,
				});
			}
		};

		updatePosition();
		window.addEventListener('scroll', updatePosition, true);
		window.addEventListener('resize', updatePosition);
		return () => {
			window.removeEventListener('scroll', updatePosition, true);
			window.removeEventListener('resize', updatePosition);
		};
	}, [open, options.length]);

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open]);

	const dropdown = open
		? ReactDOM.createPortal(
				<>
					{/* Backdrop — full screen invisible click target */}
					<div
						style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
						onClick={() => setOpen(false)}
					/>
					{/* The actual list */}
					<div
						style={dropdownStyle}
						className="rounded-lg border border-border bg-card shadow-lg overflow-hidden"
					>
						<ul className="py-1 max-h-52 overflow-y-auto">
							{options.map((opt) => (
								<li
									key={opt.value}
									onMouseDown={(e) => {
										// mousedown fires before the button's blur, preventing flicker
										e.preventDefault();
										onChange(opt.value);
										setOpen(false);
									}}
									className={`flex items-center justify-between px-3 py-2.5 text-sm cursor-pointer select-none transition-colors
										${
											opt.value === value
												? 'bg-primary/10 text-primary font-medium'
												: 'text-foreground hover:bg-muted'
										}`}
								>
									<span>{opt.label}</span>
									{opt.value === value && (
										<Check className="h-3.5 w-3.5 text-primary flex-shrink-0 ml-2" />
									)}
								</li>
							))}
						</ul>
					</div>
				</>,
				document.body,
			)
		: null;

	return (
		<div className="relative">
			{label && (
				<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
					{label}
				</p>
			)}
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled}
				onClick={() => !disabled && setOpen((p) => !p)}
				className={[
					'w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors',
					disabled
						? 'opacity-40 cursor-not-allowed border-border bg-muted/30'
						: 'border-border bg-background hover:border-foreground/30 cursor-pointer',
					done && !open && !disabled ? 'border-primary/40 bg-primary/5' : '',
					'focus:outline-none focus:ring-2 focus:ring-primary/30',
				]
					.filter(Boolean)
					.join(' ')}
			>
				<span
					className={
						selected
							? done && !open
								? 'text-primary font-medium'
								: 'text-foreground'
							: 'text-muted-foreground'
					}
				>
					{selected ? selected.label : placeholder}
				</span>
				<span className="flex-shrink-0 flex items-center gap-1">
					{done && selected && !open && (
						<Check className="h-3.5 w-3.5 text-primary" />
					)}
					<ChevronDown
						className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
					/>
				</span>
			</button>
			{dropdown}
		</div>
	);
};

// ─── StepDot — visual step indicator ─────────────────────────────────────────

const StepDot = ({
	done,
	active,
	index,
}: {
	done: boolean;
	active: boolean;
	index: number;
}) => (
	<div
		className={`h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-medium transition-colors
			${done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary/15 text-primary border border-primary/40' : 'bg-muted text-muted-foreground border border-border'}`}
	>
		{done ? <Check className="h-3 w-3" /> : index}
	</div>
);

// ─── SharedFilter Component ───────────────────────────────────────────────────

export const SharedFilter = <T extends BaseFilters>({
	filters,
	setFilters,
	onSubmit,
	config,
	reportType,
}: SharedFilterProps<T>) => {
	const currentSchool = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const user = useAuth((state) => state.user);
	const [students, setStudents] = useState<Student[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);

	const userRole = user?.role || 'student';
	const isSystemAdmin = userRole === 'system_admin';
	const isAdministrator = userRole === 'administrator';
	const isStudent = userRole === 'student';

	const gradeLevelField = config.gradeLevelField;
	const getGradeLevel = useCallback(
		(f: T) => (f as any)[gradeLevelField] as string,
		[gradeLevelField],
	);
	const normalize = config.normalizeStudentId || defaultNormalizeStudentId;
	const buildName = config.buildStudentName || defaultBuildStudentName;

	// ─── Academic Year Options ────────────────────────────────────────────────

	const studentAccessOptions = useMemo(() => {
		if (!isStudent || !user || !currentSchool) return [];
		return getStudentAllowedAccess(user, currentSchool);
	}, [isStudent, user, currentSchool]);

	const academicYearOptions = useMemo(() => {
		if (isStudent) {
			const filteredOptions = studentAccessOptions.filter((opt: any) => {
				if (reportType === 'yearly') return opt.yearlyReportAccess === true;
				if (reportType === 'semester')
					return Array.isArray(opt.semesters) && opt.semesters.length > 0;
				if (reportType === 'periodic')
					return Array.isArray(opt.periods) && opt.periods.length > 0;
				return true;
			});
			return filteredOptions.map((opt: any) => opt.academicYear);
		}
		return buildSchoolAcademicYearRange(currentSchool);
	}, [
		currentSchool,
		isStudent,
		isSystemAdmin,
		isAdministrator,
		userRole,
		user,
		studentAccessOptions,
		reportType,
	]);

	const defaultAcademicYear = useMemo(() => {
		const schoolCurrentAcademicYear =
			currentSchool?.currentAcademicYear || getCurrentAcademicYear();
		if (isStudent) {
			return (
				pickMostRecentAcademicYear(
					academicYearOptions,
					schoolCurrentAcademicYear,
				) || schoolCurrentAcademicYear
			);
		}
		return (
			pickCurrentOrMostRecentAcademicYear(
				academicYearOptions,
				schoolCurrentAcademicYear,
			) || schoolCurrentAcademicYear
		);
	}, [academicYearOptions, isStudent, currentSchool?.currentAcademicYear]);

	// ─── Available Options ────────────────────────────────────────────────────

	const availableSessions = useMemo(
		() =>
			currentSchool?.classLevels ? Object.keys(currentSchool.classLevels) : [],
		[currentSchool?.classLevels],
	);

	const userAvailableSessions = useMemo(() => {
		if (!config.filterSessionsByUser) return availableSessions;
		if (isSystemAdmin) return availableSessions;
		if (user?.session) return [user.session];
		return availableSessions;
	}, [
		config.filterSessionsByUser,
		isSystemAdmin,
		user?.session,
		availableSessions,
	]);

	const availableGradeLevels = useMemo(
		() =>
			filters.session && currentSchool?.classLevels?.[filters.session]
				? Object.keys(currentSchool.classLevels[filters.session])
				: [],
		[filters.session, currentSchool?.classLevels],
	);

	const availableClasses = useMemo(() => {
		const level = getGradeLevel(filters);
		if (
			filters.session &&
			level &&
			currentSchool?.classLevels?.[filters.session]?.[level]
		) {
			return currentSchool.classLevels[filters.session][level].classes || [];
		}
		return [];
	}, [filters.session, filters, currentSchool?.classLevels, getGradeLevel]);

	// ─── Extra Filter ─────────────────────────────────────────────────────────

	const extraFilter = config.extraFilter;
	const extraFilterValue = extraFilter
		? (filters as any)[extraFilter.field]
		: '';

	const filteredExtraOptions = useMemo(() => {
		if (!extraFilter) return [];
		return extraFilter.options;
	}, [extraFilter]);

	// ─── Auto-select Single Options ───────────────────────────────────────────

	useEffect(() => {
		if (isStudent) return;
		const shouldAutoSelect = config.autoSelectSingle !== false;

		if (
			shouldAutoSelect &&
			userAvailableSessions.length === 1 &&
			!filters.session
		) {
			setFilters((prev) => {
				const nextSession = userAvailableSessions[0];
				if (prev.session === nextSession) return prev;
				return {
					...prev,
					session: nextSession,
					[gradeLevelField]: '',
					className: '',
					selectedStudents: [],
				} as T;
			});
		}

		if (
			shouldAutoSelect &&
			filters.session &&
			availableGradeLevels.length === 1 &&
			!getGradeLevel(filters)
		) {
			setFilters((prev) => {
				const nextLevel = availableGradeLevels[0];
				if (getGradeLevel(prev) === nextLevel) return prev;
				return {
					...prev,
					[gradeLevelField]: nextLevel,
					className: '',
					selectedStudents: [],
				} as T;
			});
		}

		if (
			shouldAutoSelect &&
			getGradeLevel(filters) &&
			availableClasses.length === 1 &&
			!filters.className
		) {
			setFilters((prev) => ({
				...prev,
				className: availableClasses[0].classId,
				selectedStudents: [],
			}));
		}
	}, [
		config.autoSelectSingle,
		isStudent,
		userAvailableSessions,
		availableGradeLevels,
		availableClasses,
		filters.session,
		filters.className,
		gradeLevelField,
		getGradeLevel,
		setFilters,
	]);

	// ─── Student Auto-populate ────────────────────────────────────────────────

	useEffect(() => {
		if (!isStudent || !user) return;
		const yearEntry = Array.isArray(user.academicYears)
			? user.academicYears.find((ay: any) =>
					areAcademicYearsEqual(ay.year, filters.academicYear),
				)
			: null;
		const classIdForYear =
			yearEntry?.classId ||
			(areAcademicYearsEqual(
				filters.academicYear,
				currentSchool?.currentAcademicYear || getCurrentAcademicYear(),
			)
				? user.classId || ''
				: '');
		const classMeta = getClassMetaById(
			currentSchool?.classLevels,
			classIdForYear,
		);
		const currentStudentId = normalize(user?.studentId, user?.id, user?._id);

		setFilters((prev) => {
			const nextSession = classMeta?.session || '';
			const nextGradeLevel = classMeta?.level || '';
			const nextClassName = classIdForYear || '';
			const nextSelectedStudents = currentStudentId ? [currentStudentId] : [];
			const isSameSelection =
				prev.selectedStudents.length === nextSelectedStudents.length &&
				prev.selectedStudents.every(
					(studentId, index) => studentId === nextSelectedStudents[index],
				);
			if (
				prev.session === nextSession &&
				(prev as any)[gradeLevelField] === nextGradeLevel &&
				prev.className === nextClassName &&
				isSameSelection
			) {
				return prev;
			}
			return {
				...prev,
				session: nextSession,
				[gradeLevelField]: nextGradeLevel,
				className: nextClassName,
				selectedStudents: nextSelectedStudents,
			} as T;
		});
	}, [
		isStudent,
		user,
		filters.academicYear,
		setFilters,
		currentSchool,
		gradeLevelField,
		normalize,
	]);

	// ─── Extra Filter Auto-select (students) ──────────────────────────────────

	useEffect(() => {
		if (!extraFilter || !isStudent) return;
		if (filteredExtraOptions.length === 1 && !extraFilterValue) {
			setFilters(
				(prev) =>
					({
						...prev,
						[extraFilter.field]: filteredExtraOptions[0].value,
					}) as T,
			);
		} else if (
			extraFilterValue &&
			!filteredExtraOptions.find((opt) => opt.value === extraFilterValue)
		) {
			setFilters((prev) => ({ ...prev, [extraFilter.field]: '' }) as T);
		}
	}, [
		extraFilter,
		isStudent,
		filteredExtraOptions,
		extraFilterValue,
		setFilters,
	]);

	// ─── Keep Academic Year Valid ─────────────────────────────────────────────

	useEffect(() => {
		const isSelectedYearAvailable = academicYearOptions.some((year) =>
			areAcademicYearsEqual(year, filters.academicYear),
		);
		if (!filters.academicYear || !isSelectedYearAvailable) {
			setFilters(
				(prev) => ({ ...prev, academicYear: defaultAcademicYear }) as T,
			);
		}
	}, [
		filters.academicYear,
		academicYearOptions,
		defaultAcademicYear,
		setFilters,
	]);

	// ─── Fetch Students ───────────────────────────────────────────────────────

	useEffect(() => {
		if (!filters.className || isStudent) {
			setStudents([]);
			if (!isStudent) {
				setFilters((prev) =>
					prev.selectedStudents.length === 0
						? prev
						: ({ ...prev, selectedStudents: [] } as T),
				);
			}
			return;
		}

		const shouldShowStudentSelect = config.showStudentSelect
			? config.showStudentSelect(filters, isSystemAdmin)
			: true;
		if (!shouldShowStudentSelect) {
			setStudents([]);
			return;
		}

		let cancelled = false;

		const fetchStudents = async () => {
			setLoadingStudents(true);
			try {
				const offline =
					typeof navigator !== 'undefined' && navigator.onLine === false;
				const cachedUsers = getScopedAcademicYearValue(
					usersByAcademicYear,
					filters.academicYear,
				).value;
				if (cachedUsers?.students?.length) {
					const filtered = cachedUsers.students.filter(
						(student: any) =>
							getStudentClassIdForYear(student, filters.academicYear) ===
							filters.className,
					);
					if (filtered.length > 0 && !cancelled) {
						const mappedStudents = filtered.map((student: any) => ({
							id: normalize(student.studentId, student.id, student._id),
							name: buildName(student),
							className: getStudentClassIdForYear(
								student,
								filters.academicYear,
							),
						}));
						setStudents(mappedStudents);
						setLoadingStudents(false);
						return;
					}
				}
				const cacheKey = `filter:students:${filters.academicYear}:${filters.className}`;
				const cached = getClientCache<Student[]>(cacheKey);
				if (cached) {
					if (!cancelled) {
						setStudents(cached);
						setLoadingStudents(false);
					}
					return;
				}
				if (offline) {
					if (!cancelled) {
						setStudents([]);
						setLoadingStudents(false);
					}
					return;
				}
				const response = await fetch(
					`/api/users?classId=${filters.className}&role=student&academicYear=${filters.academicYear}`,
					{ cache: 'no-store' },
				);
				if (!response.ok) throw new Error('Failed to fetch students');
				const responseData = await response.json();
				if (responseData.success && responseData.data) {
					setUsersForYear(
						filters.academicYear,
						{
							students: Array.isArray(responseData.data)
								? responseData.data
								: [],
						},
						{ merge: true },
					);
					if (!cancelled) {
						const mappedStudents = responseData.data.map((student: any) => ({
							id: normalize(student.studentId, student.id, student._id),
							name: buildName(student),
							className: getStudentClassIdForYear(
								student,
								filters.academicYear,
							),
						}));
						setStudents(mappedStudents);
						setClientCache(cacheKey, mappedStudents, OFFLINE_CACHE_TTL_MS);
					}
				} else if (!cancelled) {
					setStudents([]);
				}
			} catch (error) {
				console.error('Error fetching students:', error);
				if (!cancelled) setStudents([]);
			} finally {
				if (!cancelled) setLoadingStudents(false);
			}
		};

		fetchStudents();
		return () => {
			cancelled = true;
		};
	}, [
		filters.className,
		filters.academicYear,
		isStudent,
		isSystemAdmin,
		setFilters,
		usersByAcademicYear,
		setUsersForYear,
		config.showStudentSelect,
		normalize,
		buildName,
	]);

	// ─── Validate Selected Students ───────────────────────────────────────────

	useEffect(() => {
		if (isStudent) return;
		const allowedIds = new Set(students.map((s) => s.id));
		setFilters((prev) => {
			if (!prev.selectedStudents.length) return prev;
			const nextSelected = prev.selectedStudents.filter((id) =>
				allowedIds.has(normalize(id)),
			);
			if (nextSelected.length === prev.selectedStudents.length) return prev;
			return { ...prev, selectedStudents: nextSelected } as T;
		});
	}, [students, isStudent, setFilters, normalize]);

	// ─── Can Submit ───────────────────────────────────────────────────────────

	const canSubmit = useMemo(() => {
		if (config.validateCanSubmit) {
			return config.validateCanSubmit(filters, isStudent);
		}
		return !!(
			filters.academicYear &&
			filters.className &&
			(extraFilter ? extraFilterValue : true)
		);
	}, [
		filters,
		isStudent,
		config.validateCanSubmit,
		extraFilterValue,
		extraFilter,
	]);

	// ─── Handle Submit ────────────────────────────────────────────────────────

	const handleSubmit = useCallback(() => {
		if (!canSubmit) return;
		if (config.passStudentsToSubmit && isStudent && user) {
			const studentAsList: Student[] = [
				{
					id: normalize(user.studentId, user.id),
					name: user.fullName || '',
					className: filters.className || user.classId || '',
				},
			];
			onSubmit(studentAsList);
		} else if (config.passStudentsToSubmit) {
			const activeStudents =
				filters.selectedStudents.length > 0
					? students.filter((s) => filters.selectedStudents.includes(s.id))
					: students;
			onSubmit(activeStudents);
		} else {
			onSubmit();
		}
	}, [
		canSubmit,
		config.passStudentsToSubmit,
		isStudent,
		user,
		filters.className,
		filters.selectedStudents,
		students,
		onSubmit,
		normalize,
	]);

	// ─── Handle Reset ─────────────────────────────────────────────────────────

	const handleReset = useCallback(() => {
		if (config.onReset) {
			config.onReset(setFilters, defaultAcademicYear);
		} else {
			setFilters((prev) => {
				const reset: any = { ...prev };
				reset.academicYear = defaultAcademicYear;
				reset.session = '';
				reset[gradeLevelField] = '';
				reset.className = '';
				reset.selectedStudents = [];
				if (extraFilter) reset[extraFilter.field] = '';
				return reset as T;
			});
		}
	}, [
		config.onReset,
		setFilters,
		defaultAcademicYear,
		gradeLevelField,
		extraFilter,
	]);

	// ─── Grid ref for responsive two-column layout (must be before any early return) ──
	const gridRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (isStudent) return; // no grid in student view
		const el = gridRef.current;
		if (!el) return;
		const apply = () => {
			el.style.gridTemplateColumns =
				el.offsetWidth >= 768 ? '320px 1fr' : 'repeat(1, minmax(0, 1fr))';
		};
		apply();
		const ro = new ResizeObserver(apply);
		ro.observe(el);
		return () => ro.disconnect();
	}, [isStudent]);

	// ─── Student View ─────────────────────────────────────────────────────────

	if (isStudent) {
		const isStudentInfoComplete = !!filters.className;

		return (
			<div className="flex items-center justify-center min-h-[60vh] py-10 bg-background text-foreground px-4">
				<div className="w-full max-w-sm">
					{/* Header */}
					<div className="mb-6 text-center">
						<p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
							{config.studentViewTitle || 'Report card'}
						</p>
						<h2 className="text-xl font-semibold text-foreground">
							Select your report
						</h2>
					</div>

					{/* Card */}
					<div className="rounded-2xl border border-border bg-card overflow-hidden">
						<div className="p-5 space-y-4">
							{academicYearOptions.length > 1 && (
								<FilterSelect
									label="Academic year"
									value={filters.academicYear}
									onChange={(v) =>
										setFilters((f) => ({ ...f, academicYear: v }) as T)
									}
									options={academicYearOptions.map((y) => ({
										value: y,
										label: y,
									}))}
									placeholder="Select year"
									done={!!filters.academicYear}
								/>
							)}

							{extraFilter && filteredExtraOptions.length > 0 && (
								<FilterSelect
									label={extraFilter.label}
									value={extraFilterValue}
									onChange={(v) =>
										setFilters((f) => ({ ...f, [extraFilter.field]: v }) as T)
									}
									options={filteredExtraOptions}
									placeholder={`Select ${extraFilter.label.toLowerCase()}`}
									done={!!extraFilterValue}
								/>
							)}

							{!isStudentInfoComplete && (
								<div className="rounded-lg border border-destructive/20 bg-destructive/8 p-3 text-xs text-destructive leading-relaxed">
									Your profile is missing class information. Contact an
									administrator.
								</div>
							)}
						</div>

						<div className="border-t border-border bg-muted/20 px-5 py-4 flex gap-2">
							{config.showStudentReset && (
								<button
									type="button"
									onClick={handleReset}
									className="px-4 py-2 text-sm rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
								>
									Reset
								</button>
							)}
							<button
								type="button"
								onClick={handleSubmit}
								disabled={!canSubmit}
								className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								{config.viewButtonText || 'View report'}
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// ─── Non-Student View ─────────────────────────────────────────────────────

	const shouldShowStudentSelect = config.showStudentSelect
		? config.showStudentSelect(filters, isSystemAdmin)
		: !!filters.className;

	// Build the filter steps for the left rail
	const showSession = userAvailableSessions.length > 1;
	const showGradeLevel = config.showGradeLevelWhenSingle
		? !!(filters.session && availableGradeLevels.length >= 1)
		: !!(filters.session && availableGradeLevels.length > 1);
	const showClass =
		config.showClassAlways ||
		!!(getGradeLevel(filters) && availableClasses.length > 1);

	// Step completion state
	const yearDone = !!filters.academicYear;
	const extraDone = !extraFilter || !!extraFilterValue;
	const sessionDone = !showSession || !!filters.session;
	const gradeDone = !showGradeLevel || !!getGradeLevel(filters);
	const classDone = !!filters.className;

	type Step = {
		key: string;
		label: string;
		index: number;
		done: boolean;
		active: boolean;
		render: () => React.ReactNode;
	};

	const steps: Step[] = [];
	let stepIndex = 1;

	// Academic year step
	if (academicYearOptions.length > 1) {
		const idx = stepIndex++;
		steps.push({
			key: 'year',
			label: 'Academic year',
			index: idx,
			done: yearDone,
			active: true,
			render: () => (
				<FilterSelect
					label=""
					value={filters.academicYear}
					onChange={(v) =>
						setFilters(
							(f) =>
								({
									...f,
									academicYear: v,
									session: '',
									[gradeLevelField]: '',
									className: '',
									selectedStudents: [],
								}) as T,
						)
					}
					options={academicYearOptions.map((y) => ({ value: y, label: y }))}
					placeholder="Select year"
					done={yearDone}
				/>
			),
		});
	}

	// Extra filter step
	if (extraFilter) {
		const prevDone = yearDone;
		const idx = stepIndex++;
		steps.push({
			key: 'extra',
			label: extraFilter.label,
			index: idx,
			done: !!extraFilterValue,
			active: prevDone,
			render: () => (
				<FilterSelect
					label=""
					value={extraFilterValue}
					onChange={(v) =>
						setFilters((f) => ({ ...f, [extraFilter.field]: v }) as T)
					}
					options={extraFilter.options}
					placeholder={`Select ${extraFilter.label.toLowerCase()}`}
					disabled={!prevDone}
					done={!!extraFilterValue}
				/>
			),
		});
	}

	// Session step
	if (showSession) {
		const prevDone = yearDone && extraDone;
		const idx = stepIndex++;
		steps.push({
			key: 'session',
			label: 'Session',
			index: idx,
			done: !!filters.session,
			active: prevDone,
			render: () => (
				<FilterSelect
					label=""
					value={filters.session}
					onChange={(v) =>
						setFilters(
							(f) =>
								({
									...f,
									session: v,
									[gradeLevelField]: '',
									className: '',
									selectedStudents: [],
								}) as T,
						)
					}
					options={userAvailableSessions.map((s) => ({ value: s, label: s }))}
					placeholder="Select session"
					disabled={!prevDone}
					done={!!filters.session}
				/>
			),
		});
	}

	// Grade level step
	if (showGradeLevel) {
		const prevDone = yearDone && extraDone && sessionDone;
		const idx = stepIndex++;
		steps.push({
			key: 'grade',
			label: 'Grade level',
			index: idx,
			done: !!getGradeLevel(filters),
			active: prevDone,
			render: () => (
				<FilterSelect
					label=""
					value={getGradeLevel(filters)}
					onChange={(v) =>
						setFilters(
							(f) =>
								({
									...f,
									[gradeLevelField]: v,
									className: '',
									selectedStudents: [],
								}) as T,
						)
					}
					options={availableGradeLevels.map((l) => ({ value: l, label: l }))}
					placeholder="Select grade"
					disabled={!prevDone}
					done={!!getGradeLevel(filters)}
				/>
			),
		});
	}

	// Class step
	if (showClass) {
		const prevDone = yearDone && extraDone && sessionDone && gradeDone;
		const idx = stepIndex++;
		steps.push({
			key: 'class',
			label: 'Class',
			index: idx,
			done: !!filters.className,
			active: prevDone,
			render: () => (
				<FilterSelect
					label=""
					value={filters.className}
					onChange={(v) =>
						setFilters(
							(f) =>
								({
									...f,
									className: v,
									selectedStudents: [],
								}) as T,
						)
					}
					options={availableClasses.map((c: any) => ({
						value: c.classId,
						label: c.name,
					}))}
					placeholder="Select class"
					disabled={!prevDone}
					done={!!filters.className}
				/>
			),
		});
	}

	// Progress: how many steps done out of total
	const totalSteps = steps.length;
	const doneSteps = steps.filter((s) => s.done).length;
	const progressPct =
		totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

	return (
		<div className="flex items-start justify-center min-h-[60vh] py-1 bg-background px-4">
			<div className="w-full max-w-4xl">
				{/* Page-level header */}
				<div className="mb-6">
					<p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">
						{config.nonStudentViewTitle || 'Report card'}
					</p>
					<h2 className="text-xl font-semibold text-foreground">
						Filter options
					</h2>
				</div>

				{/* Two-column layout: fixed 320px rail + fluid right panel, stacks on mobile */}
				<div
					ref={gridRef}
					className="grid gap-4 items-start"
					style={{ gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' }}
				>
					{/* ── Left: filter rail ── */}
					<div className="rounded-2xl border border-border bg-card overflow-visible">
						{/* Rail header with progress */}
						<div className="px-5 pt-5 pb-4 border-b border-border">
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-medium text-muted-foreground">
									Filters
								</span>
								<span className="text-xs font-medium text-primary">
									{doneSteps}/{totalSteps} done
								</span>
							</div>
							<div className="h-1 w-full rounded-full bg-muted overflow-hidden">
								<div
									className="h-full rounded-full bg-primary transition-all duration-500"
									style={{ width: `${progressPct}%` }}
								/>
							</div>
						</div>

						{/* Step list */}
						<div className="divide-y divide-border">
							{steps.map((step) => (
								<div
									key={step.key}
									className={`px-5 py-4 transition-colors ${step.active ? '' : 'opacity-40'}`}
								>
									{/* Step label row */}
									<div className="flex items-center gap-2.5 mb-3">
										<StepDot
											done={step.done}
											active={step.active}
											index={step.index}
										/>
										<span
											className={`text-sm font-medium ${step.done ? 'text-foreground' : step.active ? 'text-foreground' : 'text-muted-foreground'}`}
										>
											{step.label}
										</span>
									</div>
									{step.render()}
								</div>
							))}
						</div>

						{/* Extra fields (renderExtraFields) */}
						{config.renderExtraFields && (
							<div className="px-5 pb-4 border-t border-border pt-4">
								{config.renderExtraFields(filters, setFilters)}
							</div>
						)}

						{/* Action buttons */}
						<div className="px-5 py-4 border-t border-border bg-muted/20 flex gap-2">
							{config.showNonStudentReset && (
								<button
									type="button"
									onClick={handleReset}
									className="px-4 py-2 text-sm rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
								>
									Reset
								</button>
							)}
							<button
								type="button"
								onClick={handleSubmit}
								disabled={!canSubmit}
								className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								{config.applyButtonText || 'Apply filter'}
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</div>

					{/* ── Right: student picker ── */}
					{shouldShowStudentSelect && (
						<div className="rounded-2xl border border-border bg-card overflow-hidden">
							{/* Header */}
							<div className="px-5 py-4 border-b border-border flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-foreground">
										Students
									</p>
									{!loadingStudents && students.length > 0 && (
										<p className="text-xs text-muted-foreground mt-0.5">
											{students.length} in this class
											{filters.selectedStudents.length > 0 &&
												` · ${filters.selectedStudents.length} selected`}
										</p>
									)}
								</div>
								{filters.selectedStudents.length > 0 && (
									<button
										type="button"
										onClick={() =>
											setFilters((p) => ({ ...p, selectedStudents: [] }) as T)
										}
										className="text-xs text-muted-foreground hover:text-foreground transition-colors"
									>
										Clear selection
									</button>
								)}
							</div>

							{/* Content */}
							<div className="p-4">
								{!filters.className ? (
									<div className="py-12 text-center">
										<div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
											<svg
												className="h-5 w-5 text-muted-foreground"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1.5}
													d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
												/>
											</svg>
										</div>
										<p className="text-sm text-muted-foreground">
											Select a class to see students
										</p>
									</div>
								) : loadingStudents ? (
									<div className="py-12 flex items-center justify-center">
										<PageLoading
											fullScreen={false}
											variant="minimal"
											size="sm"
										/>
									</div>
								) : students.length === 0 ? (
									<div className="py-12 text-center">
										<p className="text-sm text-muted-foreground">
											No students found for this class
										</p>
									</div>
								) : (
									<StudentMultiSelect
										students={students}
										selectedStudents={filters.selectedStudents}
										onSelectionChange={(studentIds) =>
											setFilters(
												(prev) =>
													({ ...prev, selectedStudents: studentIds }) as T,
											)
										}
									/>
								)}
							</div>
						</div>
					)}

					{/* If no student select, show a summary card for visual balance */}
					{!shouldShowStudentSelect && filters.className && (
						<div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
							<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
								<Check className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">
									Ready to generate
								</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									All required filters are set. Click apply to continue.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
