'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

	if (typeof student?.name === 'string' && student.name.trim()) {
		return student.name.trim();
	}

	if (typeof student?.studentName === 'string' && student.studentName.trim()) {
		return student.studentName.trim();
	}

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
			// Filter based on the specific report type requested
			const filteredOptions = studentAccessOptions.filter((opt: any) => {
				if (reportType === 'yearly') {
					return opt.yearlyReportAccess === true;
				}
				if (reportType === 'semester') {
					return Array.isArray(opt.semesters) && opt.semesters.length > 0;
				}
				if (reportType === 'periodic') {
					return Array.isArray(opt.periods) && opt.periods.length > 0;
				}

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

	// ─── Extra Filter (semester/period) ───────────────────────────────────────

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
				(prev) =>
					({
						...prev,
						academicYear: defaultAcademicYear,
					}) as T,
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
		const allowedIds = new Set(students.map((student) => student.id));
		setFilters((prev) => {
			if (!prev.selectedStudents.length) return prev;
			const nextSelected = prev.selectedStudents.filter((studentId) =>
				allowedIds.has(normalize(studentId)),
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

	// ─── Student View ─────────────────────────────────────────────────────────

	if (isStudent) {
		const isStudentInfoComplete = !!filters.className;
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-xl shadow border border-border w-full max-w-lg p-6 lg:p-8">
					<h2 className="text-lg font-semibold mb-5 text-center">
						{config.studentViewTitle || 'Filter Report Card'}
					</h2>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{academicYearOptions.length > 1 && (
							<div className="bg-muted/50 rounded-lg p-3">
								<label className="block text-sm font-medium mb-1.5">
									Academic Year
								</label>
								<select
									value={filters.academicYear}
									onChange={(e) =>
										setFilters(
											(f) =>
												({
													...f,
													academicYear: e.target.value,
												}) as T,
										)
									}
									className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
								>
									{academicYearOptions.map((year) => (
										<option key={year} value={year}>
											{year}
										</option>
									))}
								</select>
							</div>
						)}

						{extraFilter && filteredExtraOptions.length > 0 && (
							<div className="bg-muted/50 rounded-lg p-3">
								<label className="block text-sm font-medium mb-1.5">
									{extraFilter.label}
								</label>
								<select
									value={extraFilterValue}
									onChange={(e) =>
										setFilters(
											(f) =>
												({
													...f,
													[extraFilter.field]: e.target.value,
												}) as T,
										)
									}
									className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
								>
									<option value="">Select {extraFilter.label}</option>
									{filteredExtraOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					{!isStudentInfoComplete && (
						<div className="p-3 mb-4 mt-3 text-center text-sm bg-destructive/10 text-destructive rounded border border-destructive/20">
							Your profile is missing required class information. Please contact
							an administrator.
						</div>
					)}

					<div className="flex gap-2 mt-6">
						{config.showStudentReset && (
							<button
								type="button"
								onClick={handleReset}
								className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
							>
								Reset
							</button>
						)}
						<button
							type="button"
							onClick={handleSubmit}
							className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
							disabled={!canSubmit}
						>
							{config.viewButtonText || 'View Report'}
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ─── Non-Student View ─────────────────────────────────────────────────────

	const shouldShowStudentSelect = config.showStudentSelect
		? config.showStudentSelect(filters, isSystemAdmin)
		: !!filters.className;

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10">
			<div className="bg-card rounded-xl shadow border border-border w-full max-w-5xl p-6 lg:p-8">
				<h2 className="text-lg font-semibold mb-5 text-center">
					{config.nonStudentViewTitle || 'Filter Report Card'}
				</h2>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{academicYearOptions.length > 1 && (
						<div className="bg-muted/50 rounded-lg p-3">
							<label className="block text-sm font-medium mb-1.5">
								Academic Year
							</label>
							<select
								value={filters.academicYear}
								onChange={(e) =>
									setFilters(
										(f) =>
											({
												...f,
												academicYear: e.target.value,
												session: '',
												[gradeLevelField]: '',
												className: '',
												selectedStudents: [],
											}) as T,
									)
								}
								className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
							>
								{academicYearOptions.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						</div>
					)}

					{extraFilter && (
						<div className="bg-muted/50 rounded-lg p-3">
							<label className="block text-sm font-medium mb-1.5">
								{extraFilter.label}
							</label>
							<select
								value={extraFilterValue}
								onChange={(e) =>
									setFilters(
										(f) =>
											({
												...f,
												[extraFilter.field]: e.target.value,
											}) as T,
									)
								}
								className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
							>
								<option value="">Select {extraFilter.label}</option>
								{extraFilter.options.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					)}

					{userAvailableSessions.length > 1 && (
						<div className="bg-muted/50 rounded-lg p-3">
							<label className="block text-sm font-medium mb-1.5">
								Session
							</label>
							<select
								value={filters.session}
								onChange={(e) =>
									setFilters(
										(f) =>
											({
												...f,
												session: e.target.value,
												[gradeLevelField]: '',
												className: '',
												selectedStudents: [],
											}) as T,
									)
								}
								className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
								disabled={!filters.academicYear}
							>
								<option value="">Select Session</option>
								{userAvailableSessions.map((session) => (
									<option key={session} value={session}>
										{session}
									</option>
								))}
							</select>
						</div>
					)}

					{(config.showGradeLevelWhenSingle
						? filters.session && availableGradeLevels.length >= 1
						: filters.session && availableGradeLevels.length > 1) && (
						<div className="bg-muted/50 rounded-lg p-3">
							<label className="block text-sm font-medium mb-1.5">
								Grade Level
							</label>
							<select
								value={getGradeLevel(filters)}
								onChange={(e) =>
									setFilters(
										(f) =>
											({
												...f,
												[gradeLevelField]: e.target.value,
												className: '',
												selectedStudents: [],
											}) as T,
									)
								}
								className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
								disabled={!filters.session}
							>
								<option value="">Select Grade Level</option>
								{availableGradeLevels.map((level) => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
						</div>
					)}

					{config.showClassAlways ? (
						<div className="bg-muted/50 rounded-lg p-3">
							<label className="block text-sm font-medium mb-1.5">Class</label>
							<select
								value={filters.className}
								onChange={(e) =>
									setFilters(
										(f) =>
											({
												...f,
												className: e.target.value,
												selectedStudents: [],
											}) as T,
									)
								}
								className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
								disabled={!getGradeLevel(filters)}
							>
								<option value="">Select Class</option>
								{availableClasses.map((classInfo: any) => (
									<option key={classInfo.classId} value={classInfo.classId}>
										{classInfo.name}
									</option>
								))}
							</select>
						</div>
					) : (
						getGradeLevel(filters) &&
						availableClasses.length > 1 && (
							<div className="bg-muted/50 rounded-lg p-3">
								<label className="block text-sm font-medium mb-1.5">
									Class
								</label>
								<select
									value={filters.className}
									onChange={(e) =>
										setFilters(
											(f) =>
												({
													...f,
													className: e.target.value,
													selectedStudents: [],
												}) as T,
										)
									}
									className="w-full border border-border px-3 py-2 rounded bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
									disabled={!getGradeLevel(filters)}
								>
									<option value="">Select Class</option>
									{availableClasses.map((classInfo: any) => (
										<option key={classInfo.classId} value={classInfo.classId}>
											{classInfo.name}
										</option>
									))}
								</select>
							</div>
						)
					)}
				</div>

				{config.renderExtraFields && (
					<div className="mt-3">
						{config.renderExtraFields(filters, setFilters)}
					</div>
				)}

				{shouldShowStudentSelect && (
					<div className="mt-3">
						{loadingStudents ? (
							<div className="text-center py-4">
								<PageLoading fullScreen={false} variant="minimal" size="sm" />
							</div>
						) : (
							<StudentMultiSelect
								students={students}
								selectedStudents={filters.selectedStudents}
								onSelectionChange={(studentIds) =>
									setFilters(
										(prev) =>
											({
												...prev,
												selectedStudents: studentIds,
											}) as T,
									)
								}
							/>
						)}
					</div>
				)}

				<div className="flex justify-end gap-2 mt-6">
					{config.showNonStudentReset && (
						<button
							type="button"
							onClick={handleReset}
							className="px-6 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 border border-border"
						>
							Reset
						</button>
					)}
					<button
						type="button"
						onClick={handleSubmit}
						className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
						disabled={!canSubmit}
					>
						{config.applyButtonText || 'Apply Filter'}
					</button>
				</div>
			</div>
		</div>
	);
};;
