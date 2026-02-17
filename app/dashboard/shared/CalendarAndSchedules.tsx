'use client';

import { useMemo, useState, useEffect, type FormEvent } from 'react';
import Calendar from '@/components/calendar/Calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { SchoolProfile } from '@/types/schoolProfile';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import { useSchoolStore } from '@/store/schoolStore';

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

type TestScheduleItem = {
	id: string;
	level: string;
	session: string;
	title?: string;
	subject: string;
	date: string;
	startTime: string;
	endTime: string;
	venue: string;
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const initialClassSchedules: ClassScheduleItem[] = [];
const initialTestSchedules: TestScheduleItem[] = [];

type CalendarAndSchedulesProps = {
	user?: {
		role?: string;
		firstName?: string;
		className?: string;
		classId?: string;
		subjects?: {
			year: string;
			classes: { classId: string; subjects: string[] }[];
		}[];
	};
	schoolProfile: SchoolProfile;
	mode?: 'all' | 'calendar' | 'schedules';
	defaultTab?: 'class-schedules' | 'test-schedules';
};

const emptyTestForm: TestScheduleItem = {
	id: '',
	level: '',
	session: '',
	title: '',
	subject: '',
	date: '',
	startTime: '',
	endTime: '',
	venue: '',
};

export default function CalendarAndSchedules({
	user,
	schoolProfile,
	mode = 'all',
	defaultTab = 'class-schedules',
}: CalendarAndSchedulesProps) {
	const userRole = user?.role || 'student';
	const isSystemAdmin = userRole === 'system_admin';
	const canViewAcademicCalendar = true;
	const showCalendar = mode === 'all' || mode === 'calendar';
	const showSchedules = mode === 'all' || mode === 'schedules';

	const classOptions = useMemo(() => {
		const options: {
			classId: string;
			className: string;
			subjects: string[];
			level: string;
			session: string;
		}[] = [];
		Object.entries(schoolProfile.classLevels || {}).forEach(
			([sessionName, session]) => {
				Object.entries(session || {}).forEach(([levelName, level]) => {
					if (levelName === 'Self Contained') {
						return;
					}
					const subjects = (level.subjects || []).map(
						(subject) => subject.name,
					);
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
		return Array.from(map.entries()).map(([key, value]) => ({
			key,
			...value,
		}));
	}, [classOptions]);

	const sessionOptions = useMemo(() => {
		const sessions = Object.keys(schoolProfile.classLevels || {});
		return sessions.filter((sessionName) => {
			const levels = schoolProfile.classLevels?.[sessionName] || {};
			return Object.keys(levels).some((level) => level !== 'Self Contained');
		});
	}, [schoolProfile]);

	const classOptionsById = useMemo(() => {
		const map = new Map<
			string,
			{
				classId: string;
				className: string;
				subjects: string[];
				level: string;
				session: string;
			}
		>();
		classOptions.forEach((option) => {
			map.set(option.classId, option);
		});
		return map;
	}, [classOptions]);

	const [classSchedules, setClassSchedules] = useState<ClassScheduleItem[]>(
		initialClassSchedules,
	);
	const [testSchedules, setTestSchedules] =
		useState<TestScheduleItem[]>(initialTestSchedules);
	const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
	const [scheduleError, setScheduleError] = useState('');

	const [testForm, setTestForm] = useState<TestScheduleItem>(emptyTestForm);
	const [isSavingClass, setIsSavingClass] = useState(false);
	const [isSavingTest, setIsSavingTest] = useState(false);
	const [activeScheduleTab, setActiveScheduleTab] = useState('');
	const [testViewTab, setTestViewTab] = useState('schedule');
	const [isClassModalOpen, setIsClassModalOpen] = useState(false);
	const [slotDay, setSlotDay] = useState('Monday');
	const [slotStartTime, setSlotStartTime] = useState('');
	const [slotEndTime, setSlotEndTime] = useState('');
	const [slotIsRecess, setSlotIsRecess] = useState(false);
	const [slotEntries, setSlotEntries] = useState<
		{
			classId: string;
			className: string;
			subject: string;
			id?: string;
		}[]
	>([]);
	const [slotEditingIds, setSlotEditingIds] = useState<string[]>([]);
	const academicYear = schoolProfile.currentAcademicYear || '';
	const scopedSchedules = useSchoolStore((state) =>
		academicYear ? state.schedulesByAcademicYear?.[academicYear] : undefined,
	);
	const setSchedulesForYear = useSchoolStore((state) => state.setSchedulesForYear);

	useEffect(() => {
		if (!showSchedules) return;

		const fetchSchedules = async () => {
			setScheduleError('');

			try {
				const schoolState = useSchoolStore.getState();
				const hasScopedSchedulesSnapshot = Boolean(
					academicYear &&
						Object.prototype.hasOwnProperty.call(
							schoolState.schedulesByAcademicYear || {},
							academicYear,
						),
				);
				if (hasScopedSchedulesSnapshot) {
					const mappedClass: ClassScheduleItem[] = (
						scopedSchedules?.classSchedules || []
					).map((item: any) => {
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
					});
					const mappedTest: TestScheduleItem[] = (
						scopedSchedules?.testSchedules || []
					).map((item: any) => {
						const meta = item.classId ? classOptionsById.get(item.classId) : null;
						return {
							id: String(item._id || item.id || ''),
							level: item.level || meta?.level || '',
							session: item.session || meta?.session || '',
							title: item.title || '',
							subject: item.subject || '',
							date: item.startDate || item.date || '',
							startTime: item.startTime || '',
							endTime: item.endTime || '',
							venue: item.venue || item.location || '',
						};
					});
					setClassSchedules(mappedClass);
					setTestSchedules(mappedTest);
					setIsLoadingSchedules(false);
					return;
				}
				setIsLoadingSchedules(true);

				const levelKeys: string[] = [];

				if (userRole === 'student' && user?.classId) {
					const meta = classOptionsById.get(user.classId);
					if (meta) {
						levelKeys.push(`${meta.session}::${meta.level}`);
					}
				} else if (userRole === 'teacher' && user?.subjects) {
					const relevantSubjects = academicYear
						? user.subjects.filter((subject) => subject.year === academicYear)
						: user.subjects;
					const classIds = relevantSubjects.flatMap((subject) =>
						subject.classes.map((klass) => klass.classId),
					);
					const uniqueKeys = new Set(
						classIds
							.map((id) => classOptionsById.get(id))
							.filter(Boolean)
							.map((meta) => `${meta!.session}::${meta!.level}`),
					);
					levelKeys.push(...Array.from(uniqueKeys));
				} else {
					levelKeys.push(...levelOptions.map((option) => option.key));
				}

				const uniqueKeys = Array.from(new Set(levelKeys));
				const classResults: ClassScheduleItem[] = [];
				const testResults: TestScheduleItem[] = [];
				const keysToFetch: { session: string; level: string }[] = [];

				for (const key of uniqueKeys) {
					const [session, level] = key.split('::');
					const classCacheKey = `schedules:class:${academicYear}:${session}:${level}`;
					const testCacheKey = `schedules:test:${academicYear}:${session}:${level}`;
					const cachedClassSchedules =
						getClientCache<ClassScheduleItem[]>(classCacheKey);
					const cachedTestSchedules =
						getClientCache<TestScheduleItem[]>(testCacheKey);

					if (cachedClassSchedules) {
						classResults.push(...cachedClassSchedules);
					}
					if (cachedTestSchedules) {
						testResults.push(...cachedTestSchedules);
					}
					if (!cachedClassSchedules || !cachedTestSchedules) {
						keysToFetch.push({ session, level });
					}
				}

				for (const { session, level } of keysToFetch) {
					const classCacheKey = `schedules:class:${academicYear}:${session}:${level}`;
					const testCacheKey = `schedules:test:${academicYear}:${session}:${level}`;
					const cachedClassSchedules =
						getClientCache<ClassScheduleItem[]>(classCacheKey);
					const cachedTestSchedules =
						getClientCache<TestScheduleItem[]>(testCacheKey);
					const classParams = new URLSearchParams({
						type: 'class',
						session,
						level,
					});
					const testParams = new URLSearchParams({
						type: 'test',
						session,
						level,
					});

					if (academicYear) {
						classParams.set('academicYear', academicYear);
						testParams.set('academicYear', academicYear);
					}

					const requests: Array<{
						type: 'class' | 'test';
						promise: Promise<Response>;
					}> = [];

					if (!cachedClassSchedules) {
						requests.push({
							type: 'class',
							promise: fetch(`/api/schedules?${classParams.toString()}`),
						});
					}
					if (!cachedTestSchedules) {
						requests.push({
							type: 'test',
							promise: fetch(`/api/schedules?${testParams.toString()}`),
						});
					}

					if (requests.length === 0) continue;

					const responses = await Promise.all(
						requests.map((request) => request.promise),
					);
					const payloads = await Promise.all(
						responses.map((response) => response.json()),
					);

					responses.forEach((response, index) => {
						const payload = payloads[index];
						const requestType = requests[index].type;
						if (requestType === 'class' && response.ok && payload?.success) {
							const mapped = (payload.data || []).map((item: any) => {
								const meta = item.classId
									? classOptionsById.get(item.classId)
									: null;
								return {
									id: item._id,
									classId: item.classId || meta?.classId || '',
									className: item.className || meta?.className || '',
									level: item.level || meta?.level || '',
									session: item.session || meta?.session || '',
									subject: item.subject,
									isRecess: item.isRecess || false,
									dayOfWeek: item.dayOfWeek || '',
									startTime: item.startTime || '',
									endTime: item.endTime || '',
								};
							});
							classResults.push(...mapped);
							setClientCache(classCacheKey, mapped);
						}
						if (requestType === 'test' && response.ok && payload?.success) {
							const mapped = (payload.data || []).map((item: any) => {
								const meta = item.classId
									? classOptionsById.get(item.classId)
									: null;
								return {
									id: item._id,
									level: item.level || meta?.level || '',
									session: item.session || meta?.session || '',
									title: item.title || '',
									subject: item.subject,
									date: item.startDate || '',
									startTime: item.startTime || '',
									endTime: item.endTime || '',
									venue: item.venue || item.location || '',
								};
							});
							testResults.push(...mapped);
							setClientCache(testCacheKey, mapped);
						}
					});
				}

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
				setScheduleError('Failed to load schedules.');
			} finally {
				setIsLoadingSchedules(false);
			}
		};

		fetchSchedules();
	}, [
		academicYear,
		showSchedules,
		user?.classId,
		userRole,
		user?.subjects,
		classOptionsById,
		levelOptions,
		scopedSchedules,
		setSchedulesForYear,
	]);

	const filteredClassSchedules = useMemo(() => {
		return classSchedules;
	}, [classSchedules]);

	const filteredTestSchedules = useMemo(() => {
		return testSchedules;
	}, [testSchedules]);

	const handleTestSubmit = (event: FormEvent) => {
		event.preventDefault();
		setScheduleError('');
		if (
			!testForm.level ||
			!testForm.session ||
			!testForm.subject ||
			!testForm.date ||
			!testForm.startTime ||
			!testForm.endTime
		) {
			return;
		}
		const saveSchedule = async () => {
			setIsSavingTest(true);
			const payload = {
				type: 'test',
				id: testForm.id || undefined,
				level: testForm.level,
				session: testForm.session,
				title: testForm.title,
				subject: testForm.subject,
				startDate: testForm.date,
				endDate: testForm.date,
				startTime: testForm.startTime,
				endTime: testForm.endTime,
				venue: testForm.venue,
				academicYear,
			};

			const response = await fetch('/api/schedules', {
				method: testForm.id ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message || 'Failed to save schedule.');
			}

			setTestSchedules((prev) => {
				const normalize = (item: any): TestScheduleItem => ({
					id: item._id,
					level: item.level,
					session: item.session,
					title: item.title || '',
					subject: item.subject,
					date: item.startDate || '',
					startTime: item.startTime || '',
					endTime: item.endTime || '',
					venue: item.venue || item.location || '',
				});

					const created: TestScheduleItem[] = Array.isArray(result.data)
						? (result.data as any[]).map((entry) => normalize(entry))
						: [normalize(result.data)];

				let next: TestScheduleItem[];
				if (testForm.id) {
						const updateMap = new Map<string, TestScheduleItem>(
							created.map((item) => [item.id, item]),
						);
						next = prev.map((item) => updateMap.get(item.id) || item);
				} else {
					next = [...created, ...prev];
				}
				setClientCache(
					`schedules:test:${academicYear}:${testForm.session}:${testForm.level}`,
					next,
				);
				return next;
			});
			resetTestForm();
		};

		saveSchedule()
			.catch((error) => {
				console.error(error);
				setScheduleError('Failed to save test schedule.');
			})
			.finally(() => setIsSavingTest(false));
	};

	const handleEditTest = (item: TestScheduleItem) => {
		setTestForm({
			...item,
		});
	};

	const handleDeleteTest = (item: TestScheduleItem) => {
		const removeSchedule = async () => {
			const response = await fetch('/api/schedules', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: item.id,
					type: 'test',
					level: item.level,
					session: item.session,
				}),
			});
			const result = await response.json();
			if (!response.ok || !result?.success) {
				throw new Error(result?.message || 'Failed to delete schedule.');
			}
			setTestSchedules((prev) => {
				const next = prev.filter((entry) => entry.id !== item.id);
				setClientCache(
					`schedules:test:${academicYear}:${item.session}:${item.level}`,
					next,
				);
				return next;
			});
		};

		removeSchedule().catch((error) => {
			console.error(error);
			setScheduleError('Failed to delete test schedule.');
		});
	};

	const testSubjectOptions = testForm.level
		? (levelOptions.find(
				(option) =>
					option.level === testForm.level &&
					option.session === testForm.session,
			)?.subjects ?? [])
		: [];

	const visibleLevelKeys = useMemo(() => {
		if (userRole === 'student' && user?.classId) {
			const meta = classOptionsById.get(user.classId);
			return meta ? [`${meta.session}::${meta.level}`] : [];
		}

		if (userRole === 'teacher' && user?.subjects) {
			const relevantSubjects = academicYear
				? user.subjects.filter((subject) => subject.year === academicYear)
				: user.subjects;
			const classIds = relevantSubjects.flatMap((subject) =>
				subject.classes.map((klass) => klass.classId),
			);
			const keys = new Set<string>();
			classIds.forEach((id) => {
				const meta = classOptionsById.get(id);
				if (meta) keys.add(`${meta.session}::${meta.level}`);
			});
			return Array.from(keys);
		}

		if (userRole === 'administrator') {
			return levelOptions.map((option) => option.key);
		}

		if (userRole === 'system_admin') {
			return levelOptions.map((option) => option.key);
		}

		return levelOptions.map((option) => option.key);
	}, [
		userRole,
		user?.classId,
		user?.subjects,
		classOptionsById,
		levelOptions,
		academicYear,
	]);

	const [selectedSession, setSelectedSession] = useState('');
	const sessionOptionsForUser = useMemo(() => {
		return sessionOptions.filter((session) =>
			visibleLevelKeys.some((key) => key.startsWith(`${session}::`)),
		);
	}, [sessionOptions, visibleLevelKeys]);

	const levelKeysForSession = useMemo(() => {
		return visibleLevelKeys.filter((key) =>
			selectedSession ? key.startsWith(`${selectedSession}::`) : true,
		);
	}, [visibleLevelKeys, selectedSession]);

	const activeLevelKey =
		activeScheduleTab || levelKeysForSession[0] || visibleLevelKeys[0] || '';
	const activeSessionLevel = useMemo(() => {
		if (!activeLevelKey) return null;
		const [session, level] = activeLevelKey.split('::');
		return { session: session || '', level: level || '' };
	}, [activeLevelKey]);
	const classesForLevel = useMemo(() => {
		if (!activeSessionLevel) return [];
		return classOptions
			.filter(
				(option) =>
					option.session === activeSessionLevel.session &&
					option.level === activeSessionLevel.level,
			)
			.map((option) => ({
				classId: option.classId,
				className: option.className,
			}))
			.sort((a, b) => a.className.localeCompare(b.className));
	}, [classOptions, activeSessionLevel]);
	const levelSubjects = useMemo(() => {
		if (!activeSessionLevel) return [];
		const match = levelOptions.find(
			(option) =>
				option.level === activeSessionLevel.level &&
				option.session === activeSessionLevel.session,
		);
		return match?.subjects ?? [];
	}, [levelOptions, activeSessionLevel]);

	useEffect(() => {
		if (!activeLevelKey) return;
		const [session, level] = activeLevelKey.split('::');
		setTestForm((prev) => ({
			...prev,
			session,
			level,
		}));
		setTestViewTab('schedule');
		setIsClassModalOpen(false);
		setSlotEntries([]);
		setSlotEditingIds([]);
	}, [activeLevelKey]);

	useEffect(() => {
		if (!activeScheduleTab && visibleLevelKeys.length > 0) {
			setActiveScheduleTab(visibleLevelKeys[0]);
		}
	}, [activeScheduleTab, visibleLevelKeys]);

	useEffect(() => {
		if (!selectedSession) {
			if (sessionOptionsForUser.length === 1) {
				setSelectedSession(sessionOptionsForUser[0]);
			} else if (sessionOptionsForUser.length > 1) {
				setSelectedSession(sessionOptionsForUser[0]);
			}
		}
	}, [selectedSession, sessionOptionsForUser]);

	useEffect(() => {
		if (!selectedSession) return;
		if (
			!activeScheduleTab ||
			!activeScheduleTab.startsWith(`${selectedSession}::`)
		) {
			const nextKey = levelKeysForSession[0];
			if (nextKey) {
				setActiveScheduleTab(nextKey);
			}
		}
	}, [selectedSession, activeScheduleTab, levelKeysForSession]);

	const classScheduleSource = useMemo(() => {
		if (!activeLevelKey) return filteredClassSchedules;
		const [session, level] = activeLevelKey.split('::');
		return filteredClassSchedules.filter(
			(item) => item.session === session && item.level === level,
		);
	}, [filteredClassSchedules, activeLevelKey]);

	const testScheduleSource = useMemo(() => {
		if (!activeLevelKey) return filteredTestSchedules;
		const [session, level] = activeLevelKey.split('::');
		return filteredTestSchedules.filter(
			(item) => item.session === session && item.level === level,
		);
	}, [filteredTestSchedules, activeLevelKey]);

	const canEditSchedules = userRole === 'system_admin';
	const canEditTestSchedules =
		userRole === 'system_admin' && testViewTab === 'manage';

	const levelLabel = (key: string) => {
		const match = levelOptions.find((option) => option.key === key);
		return match ? `${match.session} - ${match.level}` : key;
	};

	const resetTestForm = () => {
		const [session, level] = activeLevelKey.split('::');
		setTestForm({
			...emptyTestForm,
			session: session || '',
			level: level || '',
		});
	};

	const classTimeSlots = useMemo(() => {
		const slots = new Set<string>();
		classScheduleSource.forEach((item) => {
			if (item.startTime && item.endTime) {
				slots.add(`${item.startTime}-${item.endTime}`);
			}
		});
		return Array.from(slots).sort();
	}, [classScheduleSource]);

	const testTimeSlots = useMemo(() => {
		const slots = new Set<string>();
		testScheduleSource.forEach((item) => {
			if (item.startTime && item.endTime) {
				slots.add(`${item.startTime}-${item.endTime}`);
			}
		});
		return Array.from(slots).sort();
	}, [testScheduleSource]);

	const displayClasses = useMemo(() => {
		if (userRole === 'student') {
			const ownClass = classesForLevel.find(
				(klass) => klass.classId === user?.classId,
			);
			if (ownClass) {
				return [ownClass];
			}
		}

		const list = [...classesForLevel];
		const hasGeneral = classScheduleSource.some((item) => !item.classId);
		if (hasGeneral) {
			list.push({ classId: '__all__', className: 'All Classes' });
		}
		if (list.length === 0) {
			list.push({ classId: '__none__', className: 'No classes' });
		}
		return list;
	}, [classesForLevel, classScheduleSource, userRole, user?.classId]);

	const scheduleMatrix = useMemo(() => {
		const map: Record<
			string,
			Record<string, Record<string, ClassScheduleItem[]>>
		> = {};
		classScheduleSource.forEach((item) => {
			const slotKey = `${item.startTime}-${item.endTime}`;
			const day = item.dayOfWeek || '';
			const classKey = item.classId || '__all__';
			if (!map[slotKey]) {
				map[slotKey] = {};
			}
			if (!map[slotKey][day]) {
				map[slotKey][day] = {};
			}
			if (!map[slotKey][day][classKey]) {
				map[slotKey][day][classKey] = [];
			}
			map[slotKey][day][classKey].push(item);
		});
		return map;
	}, [classScheduleSource]);

	const getDefaultVisibleDays = () => {
		const today = new Date();
		const dayIndex = today.getDay(); // 0=Sunday, 6=Saturday
		const fallback = 'Monday';
		const dayName =
			dayIndex === 0 || dayIndex === 6
				? fallback
				: DAYS_OF_WEEK[dayIndex - 1] || fallback;
		return [dayName];
	};

	const [classVisibleDays, setClassVisibleDays] = useState<string[]>(
		getDefaultVisibleDays,
	);
	const [testVisibleDays, setTestVisibleDays] = useState<string[]>(
		getDefaultVisibleDays,
	);
	const classDaysStorageKey = `schedule:class:visibleDays:${activeLevelKey || 'all'}`;
	const testDaysStorageKey = `schedule:test:visibleDays:${activeLevelKey || 'all'}`;

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const loadDays = (key: string) => {
			try {
				const raw = window.localStorage.getItem(key);
				if (!raw) return null;
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return null;
				const normalized = DAYS_OF_WEEK.filter((day) => parsed.includes(day));
				return normalized.length > 0 ? normalized : null;
			} catch (error) {
				console.warn('Failed to read day selection from storage.', error);
				return null;
			}
		};
		const storedClassDays = loadDays(classDaysStorageKey);
		const storedTestDays = loadDays(testDaysStorageKey);
		if (storedClassDays) {
			setClassVisibleDays(storedClassDays);
		} else {
			setClassVisibleDays(getDefaultVisibleDays());
		}
		if (storedTestDays) {
			setTestVisibleDays(storedTestDays);
		} else {
			setTestVisibleDays(getDefaultVisibleDays());
		}
	}, [classDaysStorageKey, testDaysStorageKey]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(
			classDaysStorageKey,
			JSON.stringify(classVisibleDays),
		);
	}, [classVisibleDays]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(
			testDaysStorageKey,
			JSON.stringify(testVisibleDays),
		);
	}, [testVisibleDays]);

	const timeToMinutes = (time: string) => {
		if (!time) return 0;
		const [hours, minutes] = time
			.split(':')
			.map((value) => parseInt(value, 10));
		return hours * 60 + minutes;
	};
	const overlapsTime = (
		startA: string,
		endA: string,
		startB: string,
		endB: string,
	) => {
		const aStart = timeToMinutes(startA);
		const aEnd = timeToMinutes(endA);
		const bStart = timeToMinutes(startB);
		const bEnd = timeToMinutes(endB);
		return aStart < bEnd && bStart < aEnd;
	};

	const openAddSlotModal = () => {
		if (!activeSessionLevel) return;
		setScheduleError('');
		setSlotDay(DAYS_OF_WEEK[0]);
		setSlotStartTime('');
		setSlotEndTime('');
		setSlotIsRecess(false);
		setSlotEditingIds([]);
		setSlotEntries(
			classesForLevel.map((klass) => ({
				classId: klass.classId,
				className: klass.className,
				subject: '',
			})),
		);
		setIsClassModalOpen(true);
	};

	const openSlotModal = (day: string, slotKey: string) => {
		if (!activeSessionLevel) return;
		const [startTime, endTime] = slotKey.split('-');
		const existing = classScheduleSource.filter(
			(item) =>
				item.dayOfWeek === day &&
				item.startTime === startTime &&
				item.endTime === endTime,
		);
		const baseEntries = classesForLevel.map((klass) => {
			const match = existing.find((item) => item.classId === klass.classId);
			return {
				classId: klass.classId,
				className: klass.className,
				subject: match?.subject || '',
				id: match?.id,
			};
		});
		const generalEntries = existing
			.filter((item) => !item.classId)
			.map((item) => ({
				classId: '__all__',
				className: 'All Classes',
				subject: item.subject || '',
				id: item.id,
			}));
		setScheduleError('');
		setSlotDay(day);
		setSlotStartTime(startTime || '');
		setSlotEndTime(endTime || '');
		setSlotIsRecess(
			existing.length > 0 && existing.every((item) => item.isRecess),
		);
		setSlotEntries([...baseEntries, ...generalEntries]);
		setSlotEditingIds(existing.map((item) => item.id));
		setIsClassModalOpen(true);
	};

	const handleSaveSlot = async () => {
		if (!activeSessionLevel) return;
		setScheduleError('');
		if (!slotDay || !slotStartTime || !slotEndTime) {
			setScheduleError('Please select a day and time range.');
			return;
		}
		const entries = slotEntries.filter((entry) => entry.classId !== '__none__');
		if (entries.length === 0) {
			setScheduleError('No classes found for this level.');
			return;
		}
		const normalizedEntries = entries.map((entry) => ({
			...entry,
			subject: slotIsRecess ? 'Recess' : entry.subject,
		}));
		if (!slotIsRecess && normalizedEntries.some((entry) => !entry.subject)) {
			setScheduleError('Please enter subjects for all classes.');
			return;
		}
		if (!slotIsRecess) {
			const subjectCounts = new Map<string, number>();
			normalizedEntries.forEach((entry) => {
				const key = entry.subject.trim().toLowerCase();
				if (!key) return;
				subjectCounts.set(key, (subjectCounts.get(key) || 0) + 1);
			});
			const hasDuplicateSubject = Array.from(subjectCounts.values()).some(
				(count) => count > 1,
			);
			if (hasDuplicateSubject) {
				setScheduleError(
					'A subject can only be assigned to one class per time slot.',
				);
				return;
			}
		}

		const editingIds = new Set(slotEditingIds);
		const levelConflict = normalizedEntries.some((entry) =>
			classScheduleSource.some((item) => {
				if (editingIds.has(item.id)) return false;
				if (item.dayOfWeek !== slotDay) return false;
				const sameClass =
					entry.classId && item.classId
						? item.classId === entry.classId
						: !entry.classId || !item.classId;
				if (!sameClass) return false;
				return overlapsTime(
					slotStartTime,
					slotEndTime,
					item.startTime,
					item.endTime,
				);
			}),
		);
		if (levelConflict) {
			setScheduleError(
				'Schedule conflict: this class already has a subject at that time.',
			);
			return;
		}

		try {
			setIsSavingClass(true);
			const results = await Promise.all(
				normalizedEntries.map(async (entry) => {
					const payload = {
						type: 'class',
						id: entry.id || undefined,
						level: activeSessionLevel.level,
						session: activeSessionLevel.session,
						classId: entry.classId === '__all__' ? '' : entry.classId,
						className: entry.className,
						subject: entry.subject,
						isRecess: slotIsRecess,
						dayOfWeek: slotDay,
						startTime: slotStartTime,
						endTime: slotEndTime,
						academicYear,
					};
					const response = await fetch('/api/schedules', {
						method: entry.id ? 'PATCH' : 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(payload),
					});
					const result = await response.json();
					if (!response.ok || !result?.success) {
						throw new Error(result?.message || 'Failed to save schedule.');
					}
					return result.data;
				}),
			);

			const updatedItems = results.flatMap((item) =>
				Array.isArray(item) ? item : [item],
			);
			setClassSchedules((prev) => {
				const normalize = (item: any): ClassScheduleItem => ({
					id: item._id,
					classId: item.classId || '',
					className: item.className || '',
					level: item.level,
					session: item.session,
					subject: item.subject,
					isRecess: item.isRecess || false,
					dayOfWeek: item.dayOfWeek || '',
					startTime: item.startTime || '',
					endTime: item.endTime || '',
				});
				const next = [...prev];
				const indexById = new Map(next.map((item, idx) => [item.id, idx]));
				updatedItems.forEach((item) => {
					const normalized = normalize(item);
					const index = indexById.get(normalized.id);
					if (index === undefined) {
						next.push(normalized);
					} else {
						next[index] = normalized;
					}
				});
				setClientCache(
					`schedules:class:${academicYear}:${activeSessionLevel.session}:${activeSessionLevel.level}`,
					next,
				);
				return next;
			});
			setIsClassModalOpen(false);
		} catch (error) {
			console.error(error);
			setScheduleError('Failed to save class schedule.');
		} finally {
			setIsSavingClass(false);
		}
	};

	const handleDeleteSlot = async () => {
		if (!activeSessionLevel) return;
		if (slotEditingIds.length === 0) {
			setIsClassModalOpen(false);
			return;
		}
		try {
			setIsSavingClass(true);
			await Promise.all(
				slotEditingIds.map(async (id) => {
					const response = await fetch('/api/schedules', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							id,
							type: 'class',
							level: activeSessionLevel.level,
							session: activeSessionLevel.session,
						}),
					});
					const result = await response.json();
					if (!response.ok || !result?.success) {
						throw new Error(result?.message || 'Failed to delete schedule.');
					}
				}),
			);
			setClassSchedules((prev) => {
				const removeIds = new Set(slotEditingIds);
				const next = prev.filter((item) => !removeIds.has(item.id));
				setClientCache(
					`schedules:class:${academicYear}:${activeSessionLevel.session}:${activeSessionLevel.level}`,
					next,
				);
				return next;
			});
			setIsClassModalOpen(false);
		} catch (error) {
			console.error(error);
			setScheduleError('Failed to delete class schedule.');
		} finally {
			setIsSavingClass(false);
		}
	};

	const testScheduleByDay = useMemo(() => {
		const map: Record<string, Record<string, TestScheduleItem[]>> = {};
		testScheduleSource.forEach((item) => {
			const key = `${item.startTime}-${item.endTime}`;
			if (!map[key]) {
				map[key] = {};
			}
			const date = item.date ? new Date(item.date) : null;
			const dayLabel = date
				? date.toLocaleDateString('en-US', { weekday: 'long' })
				: '';
			if (!map[key][dayLabel]) {
				map[key][dayLabel] = [];
			}
			map[key][dayLabel].push(item);
		});
		return map;
	}, [testScheduleSource]);

	return (
		<div className="space-y-8">
			<div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/70 sm:p-6">
				<div className="pointer-events-none absolute -right-24 -top-28 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-900/30" />
				<div className="pointer-events-none absolute -bottom-28 left-12 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-900/20" />
				<div className="relative flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
							{mode === 'calendar'
								? 'Academic Calendar'
								: mode === 'schedules'
									? 'Schedules'
									: 'Calendar & Schedules'}
						</h1>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							{mode === 'calendar'
								? 'Track term dates, holidays, and key academic events.'
								: mode === 'schedules'
									? 'Review class timetables and upcoming tests.'
									: 'Track class schedules, upcoming tests, and key academic dates.'}
						</p>
					</div>
					<div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
						<span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
							Academic Year
						</span>
						<span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-100">
							{academicYear || 'N/A'}
						</span>
					</div>
				</div>
			</div>

			{showCalendar && canViewAcademicCalendar ? (
				<Card className="relative overflow-hidden border-gray-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/70">
					<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400/70 via-amber-300/70 to-emerald-400/70 dark:from-sky-500/40 dark:via-amber-500/40 dark:to-emerald-500/40" />
					<CardHeader>
						<CardTitle>Academic Calendar</CardTitle>
					</CardHeader>
					<CardContent>
						<Calendar
							canEdit={isSystemAdmin}
							academicYear={academicYear}
						/>
						{!isSystemAdmin ? (
							<p className="mt-4 text-sm text-muted-foreground"></p>
						) : null}
					</CardContent>
				</Card>
			) : null}

			{showSchedules ? (
				<Tabs defaultValue={defaultTab} className="w-full">
					<TabsList className="w-full justify-start">
						<TabsTrigger value="class-schedules">Class Schedules</TabsTrigger>
						<TabsTrigger value="test-schedules">Test Schedules</TabsTrigger>
					</TabsList>

					<TabsContent value="class-schedules">
						<Card className="relative overflow-hidden border-gray-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/70">
							<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400/70 via-cyan-300/70 to-teal-400/70 dark:from-indigo-500/40 dark:via-cyan-500/40 dark:to-teal-500/40" />
							<CardHeader>
								<CardTitle>Class Schedules</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{scheduleError ? (
									<p className="text-sm text-red-500">{scheduleError}</p>
								) : null}
								{sessionOptionsForUser.length > 1 ? (
									<div className="flex flex-wrap items-center gap-3">
										<span className="text-xs font-medium text-muted-foreground">
											Session
										</span>
										<div className="flex flex-wrap gap-2">
											{sessionOptionsForUser.map((session) => (
												<button
													key={session}
													type="button"
													onClick={() => setSelectedSession(session)}
													className={`rounded-full px-3 py-1 text-xs font-medium transition ${
														selectedSession === session
															? 'bg-primary text-primary-foreground'
															: 'bg-muted text-muted-foreground hover:bg-muted/70'
													}`}
												>
													{session}
												</button>
											))}
										</div>
									</div>
								) : null}
								{levelKeysForSession.length > 1 ? (
									<Tabs
										value={activeScheduleTab}
										onValueChange={setActiveScheduleTab}
									>
										<TabsList className="w-full flex-nowrap justify-start gap-2">
											{levelKeysForSession.map((key) => (
												<TabsTrigger key={key} value={key}>
													{levelLabel(key).replace(`${selectedSession} - `, '')}
												</TabsTrigger>
											))}
										</TabsList>
									</Tabs>
								) : levelKeysForSession.length === 1 ? (
									<p className="text-xs text-muted-foreground">
										Level:{' '}
										{levelLabel(levelKeysForSession[0]).replace(
											`${selectedSession} - `,
											'',
										)}
									</p>
								) : null}

								{canEditSchedules ? (
									<div className="flex flex-wrap items-center justify-end gap-3">
										<Button
											type="button"
											onClick={openAddSlotModal}
											disabled={
												!activeSessionLevel || classesForLevel.length === 0
											}
										>
											Add schedule
										</Button>
									</div>
								) : null}

								<div className="flex flex-wrap items-center gap-3">
									<span className="text-xs font-medium text-muted-foreground">
										Days
									</span>
									<div className="flex flex-wrap gap-3">
										{DAYS_OF_WEEK.map((day) => (
											<label
												key={day}
												className="flex items-center gap-2 text-xs text-muted-foreground"
											>
												<input
													type="checkbox"
													checked={classVisibleDays.includes(day)}
													onChange={(event) => {
														setClassVisibleDays((prev) => {
															if (event.target.checked) {
																const next = [...prev, day];
																return DAYS_OF_WEEK.filter((d) =>
																	next.includes(d),
																);
															}
															const remaining = prev.filter((d) => d !== day);
															return remaining.length > 0 ? remaining : prev;
														});
													}}
												/>
												{day}
											</label>
										))}
									</div>
								</div>

								<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
									{isLoadingSchedules ? (
										<div className="space-y-4 p-4">
											<div className="h-6 w-56 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
											<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
												{Array.from({ length: 6 }).map((_, index) => (
													<div
														key={`class-table-skeleton-${index}`}
														className="h-16 animate-pulse rounded-lg border border-gray-200/80 bg-gray-50/70 dark:border-gray-800/80 dark:bg-gray-900/60"
													/>
												))}
											</div>
											<div className="h-36 animate-pulse rounded-lg border border-gray-200/80 bg-gray-50/70 dark:border-gray-800/80 dark:bg-gray-900/60" />
										</div>
									) : (
										<table className="min-w-full border-collapse text-sm">
											<thead className="bg-gray-50 dark:bg-gray-900">
												<tr className="text-left text-gray-600 dark:text-gray-400">
													<th
														className="sticky left-0 top-0 z-40 border-2 border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
														rowSpan={2}
													>
														Time
													</th>
													{classVisibleDays.map((day) => (
														<th
															key={day}
															className="sticky top-0 z-30 border-2 border-gray-200 bg-gray-50 px-4 py-3 text-center dark:border-gray-800 dark:bg-gray-900"
															colSpan={displayClasses.length}
														>
															{day}
														</th>
													))}
												</tr>
												<tr className="text-left text-xs text-gray-500 dark:text-gray-400">
													{classVisibleDays.map((day) =>
														displayClasses.map((klass) => (
															<th
																key={`${day}-${klass.classId}`}
																className="sticky top-12 z-20 border-2 border-gray-200 bg-gray-50 px-2 py-2 text-center font-medium dark:border-gray-800 dark:bg-gray-900"
															>
																{klass.className}
															</th>
														)),
													)}
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
												{classTimeSlots.length === 0 ? (
													<tr>
														<td
															className="px-4 py-6 text-center text-sm text-muted-foreground"
															colSpan={
																1 +
																classVisibleDays.length * displayClasses.length
															}
														>
															No class schedules yet.
														</td>
													</tr>
												) : (
													classTimeSlots.map((slot) => (
														<tr
															key={slot}
															className="text-gray-800 dark:text-gray-200"
														>
															<td className="sticky left-0 z-10 border-2 border-gray-200 bg-white px-4 py-3 font-medium dark:border-gray-800 dark:bg-gray-950">
																{slot}
															</td>
															{classVisibleDays.map((day) =>
																displayClasses.map((klass) => {
																	const items =
																		scheduleMatrix[slot]?.[day]?.[
																			klass.classId
																		] || [];
																	const generalItems =
																		userRole === 'student' &&
																		klass.classId !== '__all__'
																			? scheduleMatrix[slot]?.[day]?.[
																					'__all__'
																				] || []
																			: [];
																	const mergedItems = [
																		...items,
																		...generalItems,
																	];
																	return (
																		<td
																			key={`${slot}-${day}-${klass.classId}`}
																			className={`border-2 border-gray-200 px-2 py-2 align-top dark:border-gray-800 ${
																				canEditSchedules
																					? 'cursor-pointer hover:bg-muted/40'
																					: ''
																			}`}
																			onClick={() =>
																				canEditSchedules &&
																				openSlotModal(day, slot)
																			}
																		>
																			<div className="space-y-1">
																				{mergedItems.length === 0 ? (
																					<span className="text-xs text-muted-foreground">
																						—
																					</span>
																				) : (
																					mergedItems.map((item) => (
																						<div
																							key={item.id}
																							className={`text-xs ${
																								item.isRecess
																									? 'text-amber-700 dark:text-amber-200'
																									: ''
																							}`}
																						>
																							<p className="font-semibold">
																								{item.isRecess
																									? 'Recess'
																									: item.subject}
																							</p>
																							{item.isRecess ? null : null}
																						</div>
																					))
																				)}
																			</div>
																		</td>
																	);
																}),
															)}
														</tr>
													))
												)}
											</tbody>
										</table>
									)}
								</div>
								<Dialog
									open={isClassModalOpen}
									onOpenChange={(open) => setIsClassModalOpen(open)}
								>
									<DialogContent className="max-w-3xl">
										<DialogHeader>
											<DialogTitle>Schedule slot</DialogTitle>
										</DialogHeader>
										<div className="grid gap-4 sm:grid-cols-3">
											<label className="flex flex-col gap-2 text-sm">
												<span className="text-muted-foreground">Day</span>
												<select
													className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
													value={slotDay}
													onChange={(event) => setSlotDay(event.target.value)}
												>
													{DAYS_OF_WEEK.map((day) => (
														<option key={day} value={day}>
															{day}
														</option>
													))}
												</select>
											</label>
											<label className="flex flex-col gap-2 text-sm">
												<span className="text-muted-foreground">
													Start time
												</span>
												<Input
													type="time"
													value={slotStartTime}
													onChange={(event) =>
														setSlotStartTime(event.target.value)
													}
												/>
											</label>
											<label className="flex flex-col gap-2 text-sm">
												<span className="text-muted-foreground">End time</span>
												<Input
													type="time"
													value={slotEndTime}
													onChange={(event) =>
														setSlotEndTime(event.target.value)
													}
												/>
											</label>
										</div>
										<label className="flex items-center gap-2 text-sm text-muted-foreground">
											<input
												type="checkbox"
												checked={slotIsRecess}
												onChange={(event) =>
													setSlotIsRecess(event.target.checked)
												}
											/>
											Recess period for this slot
										</label>
										<div className="space-y-3">
											{slotEntries.length === 0 ? (
												<p className="text-sm text-muted-foreground">
													No classes found for this level.
												</p>
											) : (
												slotEntries
													.filter((entry) => entry.classId !== '__none__')
													.map((entry) => (
														<div
															key={entry.classId}
															className="grid gap-3 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800 md:grid-cols-2"
														>
															<div className="md:col-span-1">
																<p className="font-medium">{entry.className}</p>
																<p className="text-xs text-muted-foreground">
																	{entry.classId === '__all__'
																		? 'Applies to all classes'
																		: 'Class specific'}
																</p>
															</div>
															<label className="flex flex-col gap-2 text-xs md:col-span-1">
																<span className="text-muted-foreground">
																	Subject
																</span>
																<select
																	className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
																	value={
																		slotIsRecess ? 'Recess' : entry.subject
																	}
																	onChange={(event) =>
																		setSlotEntries((prev) =>
																			prev.map((item) =>
																				item.classId === entry.classId
																					? {
																							...item,
																							subject: event.target.value,
																						}
																					: item,
																			),
																		)
																	}
																	disabled={slotIsRecess}
																>
																	{slotIsRecess ? (
																		<option value="Recess">Recess</option>
																	) : null}
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
										{scheduleError ? (
											<p className="text-sm text-red-500">{scheduleError}</p>
										) : null}
										<DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
											<div className="flex flex-wrap gap-2">
												<Button
													type="button"
													onClick={handleSaveSlot}
													disabled={isSavingClass}
												>
													{isSavingClass ? 'Saving...' : 'Save slot'}
												</Button>
												<Button
													type="button"
													variant="outline"
													onClick={() => setIsClassModalOpen(false)}
												>
													Cancel
												</Button>
											</div>
											{slotEditingIds.length > 0 ? (
												<Button
													type="button"
													variant="destructive"
													onClick={handleDeleteSlot}
													disabled={isSavingClass}
												>
													Delete slot
												</Button>
											) : null}
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="test-schedules">
						<Card className="relative overflow-hidden border-gray-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/70">
							<div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400/70 via-fuchsia-300/70 to-violet-400/70 dark:from-rose-500/40 dark:via-fuchsia-500/40 dark:to-violet-500/40" />
							<CardHeader>
								<CardTitle>Test Schedules</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{scheduleError ? (
									<p className="text-sm text-red-500">{scheduleError}</p>
								) : null}
								{sessionOptionsForUser.length > 1 ? (
									<div className="flex flex-wrap items-center gap-3">
										<span className="text-xs font-medium text-muted-foreground">
											Session
										</span>
										<div className="flex flex-wrap gap-2">
											{sessionOptionsForUser.map((session) => (
												<button
													key={session}
													type="button"
													onClick={() => setSelectedSession(session)}
													className={`rounded-full px-3 py-1 text-xs font-medium transition ${
														selectedSession === session
															? 'bg-primary text-primary-foreground'
															: 'bg-muted text-muted-foreground hover:bg-muted/70'
													}`}
												>
													{session}
												</button>
											))}
										</div>
									</div>
								) : null}
								{levelKeysForSession.length > 1 ? (
									<Tabs
										value={activeScheduleTab}
										onValueChange={setActiveScheduleTab}
									>
										<TabsList className="w-full flex-wrap justify-start gap-2 overflow-x-auto">
											{levelKeysForSession.map((key) => (
												<TabsTrigger key={key} value={key}>
													{levelLabel(key).replace(`${selectedSession} - `, '')}
												</TabsTrigger>
											))}
										</TabsList>
									</Tabs>
								) : levelKeysForSession.length === 1 ? (
									<p className="text-xs text-muted-foreground">
										Level:{' '}
										{levelLabel(levelKeysForSession[0]).replace(
											`${selectedSession} - `,
											'',
										)}
									</p>
								) : null}
								{userRole === 'system_admin' ? (
									<Tabs value={testViewTab} onValueChange={setTestViewTab}>
										<TabsList className="w-full justify-start">
											<TabsTrigger value="schedule">Schedule</TabsTrigger>
											<TabsTrigger value="manage">Manage</TabsTrigger>
										</TabsList>
										<TabsContent value="manage" className="mt-4">
											<form
												onSubmit={handleTestSubmit}
												className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
											>
												<Input
													placeholder="Title (e.g., 1st Period Test)"
													value={testForm.title}
													onChange={(event) =>
														setTestForm({
															...testForm,
															title: event.target.value,
														})
													}
												/>
												<select
													className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
													value={testForm.subject}
													onChange={(event) =>
														setTestForm({
															...testForm,
															subject: event.target.value,
														})
													}
													disabled={!testForm.level}
												>
													<option value="">
														{testForm.level
															? 'Select subject'
															: 'Select level first'}
													</option>
													{testSubjectOptions.map((subject) => (
														<option key={subject} value={subject}>
															{subject}
														</option>
													))}
												</select>
												<Input
													type="date"
													placeholder="Date"
													value={testForm.date}
													onChange={(event) =>
														setTestForm({
															...testForm,
															date: event.target.value,
														})
													}
												/>
												<Input
													type="time"
													placeholder="Start time"
													value={testForm.startTime}
													onChange={(event) =>
														setTestForm({
															...testForm,
															startTime: event.target.value,
														})
													}
												/>
												<Input
													type="time"
													placeholder="End time"
													value={testForm.endTime}
													onChange={(event) =>
														setTestForm({
															...testForm,
															endTime: event.target.value,
														})
													}
												/>
												<Input
													placeholder="Venue"
													value={testForm.venue}
													onChange={(event) =>
														setTestForm({
															...testForm,
															venue: event.target.value,
														})
													}
												/>
												<div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-3">
													<Button type="submit" disabled={isSavingTest}>
														{isSavingTest
															? 'Saving...'
															: testForm.id
																? 'Update Test'
																: 'Add Test'}
													</Button>
													<Button
														type="button"
														variant="outline"
														onClick={resetTestForm}
													>
														Clear
													</Button>
												</div>
											</form>
										</TabsContent>
										<TabsContent value="schedule" className="mt-4" />
									</Tabs>
								) : null}

								<div className="flex flex-wrap items-center gap-3">
									<span className="text-xs font-medium text-muted-foreground">
										Days
									</span>
									<div className="flex flex-wrap gap-3">
										{DAYS_OF_WEEK.map((day) => (
											<label
												key={day}
												className="flex items-center gap-2 text-xs text-muted-foreground"
											>
												<input
													type="checkbox"
													checked={testVisibleDays.includes(day)}
													onChange={(event) => {
														setTestVisibleDays((prev) => {
															if (event.target.checked) {
																const next = [...prev, day];
																return DAYS_OF_WEEK.filter((d) =>
																	next.includes(d),
																);
															}
															const remaining = prev.filter((d) => d !== day);
															return remaining.length > 0 ? remaining : prev;
														});
													}}
												/>
												{day}
											</label>
										))}
									</div>
								</div>

								<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
									{isLoadingSchedules ? (
										<div className="space-y-4 p-4">
											<div className="h-6 w-48 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
											<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
												{Array.from({ length: 6 }).map((_, index) => (
													<div
														key={`test-table-skeleton-${index}`}
														className="h-16 animate-pulse rounded-lg border border-gray-200/80 bg-gray-50/70 dark:border-gray-800/80 dark:bg-gray-900/60"
													/>
												))}
											</div>
											<div className="h-36 animate-pulse rounded-lg border border-gray-200/80 bg-gray-50/70 dark:border-gray-800/80 dark:bg-gray-900/60" />
										</div>
									) : (
										<table className="min-w-full text-sm">
											<thead className="bg-gray-50 dark:bg-gray-900">
												<tr className="text-left text-gray-600 dark:text-gray-400">
													<th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 dark:bg-gray-900">
														Time
													</th>
													{testVisibleDays.map((day) => (
														<th
															key={day}
															className="sticky top-0 z-20 bg-gray-50 px-4 py-3 dark:bg-gray-900"
														>
															{day}
														</th>
													))}
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200 dark:divide-gray-800">
												{testTimeSlots.length === 0 ? (
													<tr>
														<td
															className="px-4 py-6 text-center text-sm text-muted-foreground"
															colSpan={1 + testVisibleDays.length}
														>
															No test schedules yet.
														</td>
													</tr>
												) : (
													testTimeSlots.map((slot) => (
														<tr
															key={slot}
															className="text-gray-800 dark:text-gray-200"
														>
															<td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium dark:bg-gray-950">
																{slot}
															</td>
															{testVisibleDays.map((day) => (
																<td key={day} className="px-4 py-3 align-top">
																	<div className="space-y-2">
																		{(testScheduleByDay[slot]?.[day] || []).map(
																			(item) => (
																				<div
																					key={item.id}
																					className="rounded-md border border-gray-200 p-2 dark:border-gray-800"
																				>
																					{item.title ? (
																						<p className="text-xs font-medium text-muted-foreground">
																							{item.title}
																						</p>
																					) : null}
																					<p className="font-semibold">
																						{item.subject}
																					</p>
																					<p className="text-xs text-muted-foreground">
																						{item.session} - {item.level}
																					</p>
																					{canEditTestSchedules ? (
																						<div className="mt-2 flex flex-wrap gap-2">
																							<Button
																								type="button"
																								variant="outline"
																								size="sm"
																								onClick={() =>
																									handleEditTest(item)
																								}
																							>
																								Edit
																							</Button>
																							<Button
																								type="button"
																								variant="destructive"
																								size="sm"
																								onClick={() =>
																									handleDeleteTest(item)
																								}
																							>
																								Delete
																							</Button>
																						</div>
																					) : null}
																				</div>
																			),
																		)}
																	</div>
																</td>
															))}
														</tr>
													))
												)}
											</tbody>
										</table>
									)}
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			) : null}
		</div>
	);
}
