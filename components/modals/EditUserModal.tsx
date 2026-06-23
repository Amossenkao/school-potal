// modals/EditUserModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
	X,
	ChevronDown,
	AlertTriangle,
	Loader2,
	Users,
	BookOpen,
	CheckCircle2,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import ConflictModal from './ConflictModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

// ─────────────────────────────────────────────
// SHARED PRIMITIVES & HELPERS
// ─────────────────────────────────────────────

const ThemedCheckbox = ({ checked }: { checked: boolean }) => (
	<div
		className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
			checked ? 'bg-primary border-primary' : 'border-border bg-background'
		}`}
	>
		{checked && (
			<svg
				className="w-2.5 h-2.5 text-primary-foreground"
				fill="none"
				viewBox="0 0 10 8"
			>
				<path
					d="M1 4l3 3 5-6"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		)}
	</div>
);

const getLevelStyle = (level = '') => {
	const n = String(level).trim().toLowerCase();
	if (
		n.includes('elementary') ||
		n.includes('primary') ||
		n.includes('nursery')
	)
		return {
			section: 'border-border/60 bg-accent/20',
			badge: 'border-border bg-accent text-accent-foreground',
		};
	if (n.includes('junior') || n.includes('middle') || n.includes('jhs'))
		return {
			section: 'border-border/60 bg-muted/60',
			badge: 'border-border bg-muted text-foreground',
		};
	if (n.includes('senior') || n.includes('shs'))
		return {
			section: 'border-border/60 bg-secondary/30',
			badge: 'border-border bg-secondary text-secondary-foreground',
		};
	return {
		section: 'border-border/40 bg-card',
		badge: 'border-border bg-card text-foreground',
	};
};

const SectionCard = ({
	title,
	subtitle,
	icon: Icon,
	children,
	className = '',
}: {
	title: string;
	subtitle?: string;
	icon?: any;
	children: React.ReactNode;
	className?: string;
}) => (
	<div
		className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}
	>
		<div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-border bg-muted/40">
			{Icon && (
				<div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
					<Icon className="w-3.5 h-3.5" />
				</div>
			)}
			<div className="min-w-0">
				<p className="text-sm font-semibold text-foreground">{title}</p>
				{subtitle && (
					<p className="text-xs text-muted-foreground mt-0.5 leading-snug">
						{subtitle}
					</p>
				)}
			</div>
		</div>
		<div className="p-4 sm:p-5">{children}</div>
	</div>
);

const MobileTabStrip = ({
	items,
	activeId,
	onSelect,
}: {
	items: Array<{
		id: string;
		label: string;
		icon?: any;
		badge?: React.ReactNode;
	}>;
	activeId: string;
	onSelect: (id: string) => void;
}) => (
	<div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:hidden">
		{items.map((item) => {
			const Icon = item.icon;
			const isActive = activeId === item.id;
			return (
				<button
					key={item.id}
					type="button"
					onClick={() => onSelect(item.id)}
					className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
						isActive
							? 'bg-primary text-primary-foreground border-primary shadow-sm'
							: 'bg-card text-muted-foreground border-border hover:border-primary/40'
					}`}
				>
					{Icon && <Icon className="w-3 h-3 shrink-0" />}
					{item.label}
					{item.badge && <span className="ml-0.5">{item.badge}</span>}
				</button>
			);
		})}
	</div>
);

const SidebarItem = ({
	label,
	isActive,
	badge,
	icon: Icon,
	onClick,
}: {
	label: string;
	isActive: boolean;
	badge?: React.ReactNode;
	icon?: any;
	onClick: () => void;
}) => (
	<button
		type="button"
		onClick={onClick}
		className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-all duration-150 ${
			isActive
				? 'bg-primary text-primary-foreground shadow-sm'
				: 'text-foreground hover:bg-muted'
		}`}
	>
		<span className="flex items-center gap-2 truncate min-w-0">
			{Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
			<span className="truncate">{label}</span>
		</span>
		{badge}
	</button>
);

const getChangedFields = (originalUser, updatedFormData) => {
	const changes = {};
	if (!originalUser || !updatedFormData) return changes;

	Object.keys(updatedFormData).forEach((key) => {
		if (key === 'isSponsor') return;
		if (
			JSON.stringify(originalUser[key]) !== JSON.stringify(updatedFormData[key])
		) {
			changes[key] = updatedFormData[key];
		}
	});

	return changes;
};

const getUpdatedUserFromResponse = (data: any) =>
	data?.data?.user || data?.data?.student || data?.data || null;

const EditUserModal = ({ isOpen, onClose, user, onSave, setFeedback }) => {
	const [formData, setFormData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [validationErrors, setValidationErrors] = useState<any[]>([]);
	const [conflictState, setConflictState] = useState<any>(null);
	const [showPromotionModal, setShowPromotionModal] = useState(false);
	const [showDemotionModal, setShowDemotionModal] = useState(false);
	const [showCarryOverModal, setShowCarryOverModal] = useState(false);
	const [activeTeacherSession, setActiveTeacherSession] = useState('');
	const [carryOverActiveSession, setCarryOverActiveSession] = useState('');
	const [promotionForm, setPromotionForm] = useState({
		type: 'yearlyPromotion',
		classId: '',
		className: '',
		academicYear: '',
	});
	const [demotionForm, setDemotionForm] = useState({
		type: 'yearlyDemotion',
		classId: '',
		className: '',
		academicYear: '',
	});
	const [carryOverAcademicYear, setCarryOverAcademicYear] = useState('');
	const [carryOverSubjects, setCarryOverSubjects] = useState<any[]>([]);
	const [carryOverSponsorClass, setCarryOverSponsorClass] = useState<
		string | null
	>(null);
	const [carryOverPosition, setCarryOverPosition] = useState('');
	const [carryOverAssignmentsExpanded, setCarryOverAssignmentsExpanded] =
		useState(false);
	const [actionError, setActionError] = useState('');
	const [actionLoading, setActionLoading] = useState(false);

	const schoolProfile = useSchoolStore((state) => state.school);
	const allowsDemotion =
		schoolProfile?.settings?.gradingSettings?.givesDemotion === true;
	const allowsDoublePromotion =
		schoolProfile?.settings?.gradingSettings?.givesDoublePromotion === true;

	const getClassNameFromId = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return classId;
		for (const session of Object.values(schoolProfile.classLevels)) {
			if (!session || typeof session !== 'object') continue;
			for (const level of Object.values(session as Record<string, any>)) {
				if (!level?.classes || !Array.isArray(level.classes)) continue;
				const found = level.classes.find((cls) => cls.classId === classId);
				if (found) return found.name || classId;
			}
		}
		return classId;
	};

	const getYearsSpent = (profile) => {
		if (!profile) return 0;
		if (profile.role === 'student') return profile.academicYears?.length || 0;
		if (profile.role === 'teacher') {
			const years = new Set(
				(profile.subjects || []).map((s) => s.year).filter(Boolean),
			);
			return years.size;
		}
		if (profile.role === 'administrator')
			return profile.academicYears?.length || 0;
		return 0;
	};

	const getTeacherCurrentYearData = (profile) => {
		const years = (profile?.subjects || []).map((s) => s.year).filter(Boolean);
		if (years.length === 0) return null;
		const currentYear = years.sort((a, b) => b.localeCompare(a))[0];
		return (profile.subjects || []).find((s) => s.year === currentYear) || null;
	};

	const getAcademicYearTimeline = (profile) => {
		if (!profile || profile.role !== 'student') return [];
		return (profile.academicYears || [])
			.slice()
			.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
	};

	const getAdminTimeline = (profile) => {
		if (!profile || profile.role !== 'administrator') return [];
		return (profile.academicYears || [])
			.slice()
			.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
	};

	const isLevelSelfContained = (session, level) =>
		!!schoolProfile?.classLevels?.[session]?.[level]?.isSelfContained ||
		level === 'Self Contained';

	const getAllClassesWithSessionAndLevel = () => {
		if (!schoolProfile?.classLevels) return [];
		const all: any[] = [];
		Object.entries(schoolProfile.classLevels).forEach(([session, levels]) => {
			if (!levels || typeof levels !== 'object') return;
			Object.entries(levels).forEach(([level, levelData]: [string, any]) => {
				levelData.classes?.forEach((cls) => {
					all.push({ ...cls, session, level });
				});
			});
		});
		return all;
	};

	const getClassMetaById = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return null;
		for (const [session, levels] of Object.entries(schoolProfile.classLevels)) {
			if (!levels || typeof levels !== 'object') continue;
			for (const [level, levelData] of Object.entries(
				levels as Record<string, any>,
			)) {
				if (!levelData?.classes || !Array.isArray(levelData.classes)) continue;
				const found = levelData.classes.find((cls) => cls.classId === classId);
				if (found) return { ...found, session, level };
			}
		}
		return null;
	};

	const normalizeClassName = (name) => {
		if (!name) return '';
		return name.replace(/\s*-?\s*[A-D]$/i, '').trim();
	};

	const getOrderedClassesForSession = (session) => {
		if (!session || !schoolProfile?.classLevels?.[session]) return [];
		const ordered: any[] = [];
		Object.entries(schoolProfile.classLevels[session]).forEach(
			([level, levelData]: [string, any]) => {
				levelData.classes?.forEach((cls) => {
					ordered.push({ ...cls, session, level });
				});
			},
		);
		return ordered;
	};

	const getPromotionClassOptions = () => {
		const current = getClassMetaById(formData?.classId || user?.classId);
		if (!current) return getAllClassesWithSessionAndLevel();
		const ordered = getOrderedClassesForSession(current.session);
		const index = ordered.findIndex((cls) => cls.classId === current.classId);
		const currentBase = normalizeClassName(current.name);
		const higher = index >= 0 ? ordered.slice(index + 1) : ordered;
		return higher.filter((cls) => normalizeClassName(cls.name) !== currentBase);
	};

	const isAtHighestClass = () => {
		const current = getClassMetaById(formData?.classId || user?.classId);
		if (!current) return false;
		const ordered = getOrderedClassesForSession(current.session);
		const currentIndex = ordered.findIndex(
			(cls) => cls.classId === current.classId,
		);
		if (currentIndex === -1) return false;
		const currentBase = normalizeClassName(current.name);
		const hasHigherBaseClass = ordered
			.slice(currentIndex + 1)
			.some((cls) => normalizeClassName(cls.name) !== currentBase);
		return !hasHigherBaseClass;
	};

	const getDemotionClassOptions = () => {
		const current = getClassMetaById(formData?.classId || user?.classId);
		if (!current) return getAllClassesWithSessionAndLevel();
		const ordered = getOrderedClassesForSession(current.session);
		const index = ordered.findIndex((cls) => cls.classId === current.classId);
		const currentBase = normalizeClassName(current.name);
		const lower = index >= 0 ? ordered.slice(0, index) : ordered;
		return lower.filter((cls) => normalizeClassName(cls.name) !== currentBase);
	};

	const generateAcademicYears = (yearsAhead = 5) => {
		const years: string[] = [];
		const currentYear = new Date().getFullYear();
		for (let i = 0; i < yearsAhead + 3; i++) {
			const year = currentYear - 2 + i;
			years.push(`${year}-${year + 1}`);
		}
		return years;
	};

	const getAcademicYear = () => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();
		return currentMonth >= 7
			? `${currentYear}-${currentYear + 1}`
			: `${currentYear - 1}-${currentYear}`;
	};

	const getAcademicYearStart = (year) => {
		if (!year || typeof year !== 'string') return null;
		const start = Number.parseInt(year.split('-')[0], 10);
		return Number.isFinite(start) ? start : null;
	};

	const getCurrentAcademicYear = () =>
		schoolProfile?.currentAcademicYear || getAcademicYear();

	const getCurrentAndNextAcademicYears = () => {
		const currentYear = getCurrentAcademicYear();
		const currentStart = getAcademicYearStart(currentYear);
		if (!currentYear || currentStart === null) return [];
		const nextYear = `${currentStart + 1}-${currentStart + 2}`;
		return Array.from(new Set([currentYear, nextYear]));
	};

	const getLatestAcademicYearStartForUser = (profile) => {
		if (!profile) return null;
		let years: string[] = [];
		if (profile.role === 'student') {
			years = Array.isArray(profile.academicYears)
				? profile.academicYears.map((entry) => entry?.year)
				: [];
		} else if (profile.role === 'teacher') {
			years = Array.isArray(profile.subjects)
				? profile.subjects.map((entry) => entry?.year)
				: [];
		} else if (profile.role === 'administrator') {
			years = Array.isArray(profile.academicYears)
				? profile.academicYears.map((entry) => entry?.year)
				: [];
		}
		const starts = years
			.map((year) => getAcademicYearStart(year))
			.filter((start) => start !== null) as number[];
		if (starts.length === 0) return null;
		return Math.max(...starts);
	};

	const hasYearOptionLaterThanUser = (options, profile = user) => {
		if (!Array.isArray(options) || options.length === 0) return false;
		const latestStart = getLatestAcademicYearStartForUser(profile);
		if (latestStart === null) return options.length > 0;
		return options.some((year) => {
			const start = getAcademicYearStart(year);
			return start !== null && start > latestStart;
		});
	};

	useEffect(() => {
		if (user) {
			const userData = JSON.parse(JSON.stringify(user));
			if (userData.role === 'student' && userData.classId && schoolProfile) {
				const allClasses = getAllClassesWithSessionAndLevel();
				const foundClass = allClasses.find(
					(cls) => cls.classId === userData.classId,
				);
				if (foundClass) {
					userData.session = userData.session || foundClass.session;
					userData.classLevel = userData.classLevel || foundClass.level;
					userData.className = userData.className || foundClass.name;
				}
			}
			if (userData.role === 'teacher') {
				const activeYear = getCurrentAcademicYear();
				const yearData =
					userData.subjects?.find((entry) => entry.year === activeYear) ||
					(userData.subjects || [])
						.slice()
						.sort((a, b) => (b.year || '').localeCompare(a.year || ''))[0];

				const selectionMap = new Map();
				(yearData?.classes || []).forEach((classData) => {
					const meta = getClassMetaById(classData.classId);
					if (!meta) return;
					const isSC = isLevelSelfContained(meta.session, meta.level);
					(classData.subjects || []).forEach((subjectValue) => {
						const subjectName =
							typeof subjectValue === 'string'
								? subjectValue
								: subjectValue?.subject || subjectValue?.name;
						if (!subjectName) return;
						const key = isSC
							? `${meta.session}|${meta.level}|${classData.classId}|${subjectName}`
							: `${meta.session}|${meta.level}|${subjectName}`;

						if (!selectionMap.has(key)) {
							selectionMap.set(key, {
								subject: subjectName,
								level: meta.level,
								session: meta.session,
								classId: isSC ? classData.classId : undefined,
							});
						}
					});
				});
				userData.subjects = Array.from(selectionMap.values());

				const firstSession = schoolProfile?.classLevels
					? Object.keys(schoolProfile.classLevels)[0]
					: '';
				setActiveTeacherSession(firstSession);
				setCarryOverActiveSession(firstSession);
			}

			setFormData(userData);
			setValidationErrors([]);
			setConflictState(null);
			setActionError('');

			setPromotionForm({
				type: 'yearlyPromotion',
				classId: '',
				className: '',
				academicYear: '',
			});
			setDemotionForm({
				type: 'yearlyDemotion',
				classId: '',
				className: '',
				academicYear: '',
			});
			setCarryOverAcademicYear('');
			setCarryOverSubjects([]);
			setCarryOverSponsorClass(null);
			setCarryOverPosition(userData.position || '');
			setCarryOverAssignmentsExpanded(false);
		}
	}, [user, schoolProfile]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen]);

	const getSessions = () =>
		schoolProfile?.classLevels ? Object.keys(schoolProfile.classLevels) : [];
	const getClassLevels = (session) =>
		schoolProfile?.classLevels?.[session]
			? Object.keys(schoolProfile.classLevels[session])
			: [];

	const getSubjectName = (subjectValue) => {
		if (typeof subjectValue === 'string') return subjectValue;
		if (subjectValue && typeof subjectValue === 'object')
			return subjectValue.name || subjectValue.subject || '';
		return '';
	};

	const getSubjectsBySessionAndLevel = (session, level) =>
		schoolProfile?.classLevels?.[session]?.[level]?.subjects || [];

	const getAllClassesForSession = (session) => {
		if (!schoolProfile?.classLevels?.[session]) return [];
		return Object.values(schoolProfile.classLevels[session]).flatMap(
			(level: any) => level.classes || [],
		);
	};

	const getClassesBySessionAndLevel = (session, level) =>
		schoolProfile?.classLevels?.[session]?.[level]?.classes || [];

	const getSelfContainedClasses = (session) => {
		if (!session) return [];
		const result: any[] = [];
		getClassLevels(session).forEach((level) => {
			if (isLevelSelfContained(session, level)) {
				getClassesBySessionAndLevel(session, level).forEach((cls: any) =>
					result.push({ ...cls, level }),
				);
			}
		});
		return result;
	};

	const getAllClassesWithLevelsForSession = (session) => {
		if (!schoolProfile?.classLevels?.[session]) return [];
		const allClasses: any[] = [];
		Object.entries(schoolProfile.classLevels[session]).forEach(
			([level, levelData]: [string, any]) => {
				levelData.classes?.forEach((cls) => {
					allClasses.push({ ...cls, level });
				});
			},
		);
		return allClasses;
	};

	const getFullName = (profile) => {
		if (!profile) return 'User';
		return (
			[profile.firstName, profile.middleName, profile.lastName]
				.filter(Boolean)
				.join(' ')
				.trim() || 'User'
		);
	};

	const selectTriggerClass =
		'bg-background border-input hover:border-primary/40 focus:ring-2 focus:ring-primary/30 transition';

	const adminPositions = [
		'Principal',
		'Vice Principal',
		'Academic Director',
		'Dean of Students',
		'Registrar',
		'Finance Officer',
		'IT Administrator',
		'HR Manager',
		'Guidance Counselor',
		'Librarian',
		'Secretary',
		'Administrative Assistant',
	];

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleGuardianInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			guardian: { ...(prev.guardian || {}), [name]: value },
		}));
	};

	const handleStudentSessionChange = (newSession) => {
		setFormData((prev) => ({
			...prev,
			session: newSession,
			classId: '',
			className: '',
			classLevel: '',
		}));
	};

	const handleStudentClassChange = (newClassId) => {
		if (!newClassId) {
			setFormData((prev) => ({
				...prev,
				classId: '',
				className: '',
				classLevel: '',
			}));
			return;
		}
		const allClasses = getAllClassesWithLevelsForSession(formData.session);
		const selectedClass = allClasses.find((c) => c.classId === newClassId);
		if (selectedClass) {
			setFormData((prev) => ({
				...prev,
				classId: selectedClass.classId,
				className: selectedClass.name,
				classLevel: selectedClass.level,
			}));
		}
	};

	// Match logic from AddUser component exactly
	const handleSubjectChange = (subject, level, session, checked) => {
		setFormData((prev) => {
			let updatedSubjects = [...(prev.subjects || [])];
			const hasSCInSession = updatedSubjects.some(
				(s) =>
					s.session === session &&
					s.classId &&
					isLevelSelfContained(session, s.level),
			);

			if (hasSCInSession) {
				updatedSubjects = updatedSubjects.filter(
					(s) =>
						!(
							s.session === session &&
							s.classId &&
							isLevelSelfContained(session, s.level)
						),
				);
			}

			if (checked) {
				updatedSubjects.push({ subject, level, session });
			} else {
				updatedSubjects = updatedSubjects.filter(
					(s) =>
						!(
							s.subject === subject &&
							s.level === level &&
							s.session === session &&
							!s.classId
						),
				);
			}

			return {
				...prev,
				subjects: updatedSubjects,
				sponsorClass: hasSCInSession ? null : prev.sponsorClass,
			};
		});
	};

	const handleSelfContainedSelection = (classId, session, level, checked) => {
		setFormData((prev) => {
			const existingSubjects = prev.subjects || [];
			const withoutThis = existingSubjects.filter(
				(s) =>
					!(
						s.classId === classId &&
						s.session === session &&
						s.level === level
					),
			);

			let updatedSubjects = withoutThis;
			let updatedSponsor = prev.sponsorClass;

			if (checked) {
				const newSubjects = getSubjectsBySessionAndLevel(session, level)
					.map((subjectValue) => getSubjectName(subjectValue))
					.filter(Boolean)
					.map((name) => ({ subject: name, level, session, classId }));
				updatedSubjects = [...withoutThis, ...newSubjects];
				if (!updatedSponsor) updatedSponsor = classId;
			} else {
				if (prev.sponsorClass === classId) updatedSponsor = null;
			}

			return {
				...prev,
				subjects: updatedSubjects,
				sponsorClass: updatedSponsor,
			};
		});
	};

	const handleSponsorClassChange = (session, value) => {
		setFormData((prev) => {
			const normalizedValue = value === '__none__' ? null : value;
			const isSelfContained = (prev.subjects || []).some(
				(s) =>
					s.session === session &&
					s.classId &&
					isLevelSelfContained(session, s.level),
			);

			if (!isSelfContained) {
				return { ...prev, sponsorClass: normalizedValue };
			}

			const otherSubjects = (prev.subjects || []).filter(
				(s) => s.session !== session,
			);
			return {
				...prev,
				subjects: otherSubjects,
				sponsorClass: normalizedValue,
			};
		});
	};

	// Handlers for carry over using the same logic paradigm
	const handleCarryOverSelfContainedSelection = (
		classId,
		session,
		level,
		checked,
	) => {
		setCarryOverSubjects((prev) => {
			const withoutThis = (prev || []).filter(
				(s) =>
					!(
						s.classId === classId &&
						s.session === session &&
						s.level === level
					),
			);
			if (!checked) {
				if (carryOverSponsorClass === classId) setCarryOverSponsorClass(null);
				return withoutThis;
			}

			const newSubjects = getSubjectsBySessionAndLevel(session, level)
				.map((subjectValue) => getSubjectName(subjectValue))
				.filter(Boolean)
				.map((name) => ({ subject: name, level, session, classId }));

			if (!carryOverSponsorClass) setCarryOverSponsorClass(classId);
			return [...withoutThis, ...newSubjects];
		});
	};

	const handleCarryOverSponsorClassChange = (session, value) => {
		const normalizedValue = value === '__none__' ? null : value;
		const isSelfContained = (carryOverSubjects || []).some(
			(s) =>
				s.session === session &&
				s.classId &&
				isLevelSelfContained(session, s.level),
		);
		if (isSelfContained) {
			setCarryOverSubjects((prev) =>
				(prev || []).filter((s) => s.session !== session),
			);
		}
		setCarryOverSponsorClass(normalizedValue);
	};

	const handleCarryOverSubjectChange = (subject, level, session, checked) => {
		let updatedSubjects = [...(carryOverSubjects || [])];
		const hasSCInSession = updatedSubjects.some(
			(s) =>
				s.session === session &&
				s.classId &&
				isLevelSelfContained(session, s.level),
		);

		if (hasSCInSession) {
			updatedSubjects = updatedSubjects.filter(
				(s) =>
					!(
						s.session === session &&
						s.classId &&
						isLevelSelfContained(session, s.level)
					),
			);
			setCarryOverSponsorClass(null);
		}

		if (checked) {
			updatedSubjects.push({ subject, level, session });
		} else {
			updatedSubjects = updatedSubjects.filter(
				(s) =>
					!(
						s.subject === subject &&
						s.level === level &&
						s.session === session &&
						!s.classId
					),
			);
		}
		setCarryOverSubjects(updatedSubjects);
	};

	const getTeacherLatestYearEntry = (profile) => {
		const entries = Array.isArray(profile?.subjects) ? profile.subjects : [];
		if (entries.length === 0) return null;
		return (
			entries
				.filter((entry) => entry?.year)
				.slice()
				.sort(
					(a, b) =>
						(getAcademicYearStart(b?.year) ?? -1) -
						(getAcademicYearStart(a?.year) ?? -1),
				)[0] || null
		);
	};

	const mapYearEntryToTeacherSelections = (yearEntry) => {
		const selectionMap = new Map();
		(yearEntry?.classes || []).forEach((classData) => {
			const classMeta = getClassMetaById(classData?.classId);
			if (!classMeta) return;
			const isSC = isLevelSelfContained(classMeta.session, classMeta.level);
			(classData?.subjects || []).forEach((subjectValue) => {
				const subjectName =
					typeof subjectValue === 'string'
						? subjectValue
						: subjectValue?.subject || subjectValue?.name;
				if (!subjectName) return;
				const key = isSC
					? `${classMeta.session}|${classMeta.level}|${classData.classId}|${subjectName}`
					: `${classMeta.session}|${classMeta.level}|${subjectName}`;
				if (!selectionMap.has(key)) {
					selectionMap.set(key, {
						subject: subjectName,
						level: classMeta.level,
						session: classMeta.session,
						classId: isSC ? classData.classId : undefined,
					});
				}
			});
		});
		return Array.from(selectionMap.values());
	};

	const fetchReassignedTeachers = async (reassignments) => {
		const reassignedTeacherIds = Array.isArray(reassignments?.details)
			? reassignments.details
					.map((detail) => detail?.previousTeacher?.id)
					.filter(Boolean)
			: [];
		if (reassignedTeacherIds.length === 0) return [];
		const results = await Promise.all(
			reassignedTeacherIds.map(async (id) => {
				try {
					const res = await fetch(`/api/users?id=${id}`);
					if (!res.ok) return null;
					const data = await res.json();
					return data.data;
				} catch {
					return null;
				}
			}),
		);
		return results.filter(Boolean);
	};

	const handleSave = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		setValidationErrors([]);
		setConflictState(null);

		const payload =
			user?.role === 'teacher'
				? { ...formData, subjects: buildTeacherSubjectsPayload() }
				: formData;
		const changedData = getChangedFields(user, payload);

		if (Object.keys(changedData).length === 0) {
			setFeedback({ type: 'info', message: 'No changes were made.' });
			setIsLoading(false);
			onClose();
			return;
		}

		try {
			const res = await fetch(`/api/users?id=${user._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...changedData, forceAssignments: false }),
			});
			const data = await res.json();

			if (!res.ok) {
				if (res.status === 409 && data.requiresConfirmation) {
					setConflictState({
						conflicts: data.conflicts || [],
						conflictSummary: data.conflictSummary || {},
						errors: data.errors || [],
						changedData,
						mode: 'profile-update',
					});
				} else if (res.status === 400 && data.errors) {
					setValidationErrors(data.errors);
				} else {
					setValidationErrors([
						{ message: data.message || 'An unexpected error occurred.' },
					]);
				}
				setIsLoading(false);
				return;
			}

			const updatedReassignedTeachers = await fetchReassignedTeachers(
				data.reassignments,
			);
			const updatedUser = getUpdatedUserFromResponse(data);
			if (!updatedUser) {
				setFeedback({
					type: 'success',
					message: data?.message || 'No changes were made.',
				});
				setIsLoading(false);
				onClose();
				return;
			}
			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `User updated successfully. ${data.reassignments.count} assignment(s) were reassigned.`,
				});
			} else {
				setFeedback({ type: 'success', message: 'User updated successfully.' });
			}
			onSave(updatedUser, updatedReassignedTeachers);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'A network error occurred.';
			setValidationErrors([{ message }]);
			setIsLoading(false);
		}
	};

	const handleConfirmReassignment = async () => {
		if (!conflictState) return;
		setIsLoading(true);
		setValidationErrors([]);
		setActionError('');

		try {
			if (conflictState.mode === 'carry-over') {
				const res = await fetch(
					`/api/users?id=${user._id}&action=addAcademicYear`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							...(conflictState.requestBody || {}),
							confirmReassignments: true,
						}),
					},
				);
				const data = await res.json();
				if (!res.ok || !data.success)
					throw new Error(
						data.message || 'Failed to add academic year with reassignments.',
					);

				const updatedReassignedTeachers = await fetchReassignedTeachers(
					data.reassignments,
				);
				if (data.reassignments?.performed) {
					setFeedback({
						type: 'success',
						message: `Academic year added successfully. ${data.reassignments.count} assignment(s) were reassigned from other teachers.`,
					});
				} else {
					setFeedback({ type: 'success', message: data.message });
				}
				const updatedUser = getUpdatedUserFromResponse(data);
				if (updatedUser) onSave(updatedUser, updatedReassignedTeachers);
				setShowCarryOverModal(false);
				return;
			}

			if (!conflictState.changedData) return;
			const res = await fetch(`/api/users?id=${user._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...conflictState.changedData,
					confirmReassignments: true,
				}),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(
					data.message || 'Failed to update user with reassignments.',
				);

			const updatedReassignedTeachers = await fetchReassignedTeachers(
				data.reassignments,
			);
			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `User updated successfully. ${data.reassignments.count} assignment(s) were reassigned from other teachers.`,
				});
			} else {
				setFeedback({ type: 'success', message: 'User updated successfully.' });
			}
			const updatedUser = getUpdatedUserFromResponse(data);
			if (!updatedUser)
				throw new Error('User update response did not include user data.');

			onSave(updatedUser, updatedReassignedTeachers);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to confirm reassignments.';
			if (conflictState.mode === 'carry-over') setActionError(message);
			else setValidationErrors([{ message }]);
		} finally {
			setIsLoading(false);
			setConflictState(null);
		}
	};

	const handlePromotion = () => {
		const promotionYearOptions = getPromotionAcademicYearOptions();
		const latestStart = getLatestAcademicYearStartForUser(user);
		const defaultPromotionYear =
			promotionYearOptions.find((year) => {
				const start = getAcademicYearStart(year);
				return start !== null && latestStart !== null && start > latestStart;
			}) ||
			promotionYearOptions[0] ||
			'';

		setActionError('');
		setPromotionForm((prev) => ({
			...prev,
			type: allowsDoublePromotion ? prev.type : 'yearlyPromotion',
			classId: '',
			className: '',
			academicYear: defaultPromotionYear,
		}));
		setShowPromotionModal(true);
	};

	const handleDemotion = () => {
		setActionError('');
		setDemotionForm((prev) => ({
			...prev,
			classId: '',
			className: '',
			academicYear: '',
		}));
		setShowDemotionModal(true);
	};

	const handleCarryOver = () => {
		const options = getCarryOverAcademicYearOptions();
		const latestStart = getLatestAcademicYearStartForUser(user);
		setActionError('');
		setCarryOverAssignmentsExpanded(false);
		const defaultYear =
			options.find((year) => {
				const start = getAcademicYearStart(year);
				return start !== null && latestStart !== null && start > latestStart;
			}) ||
			options[0] ||
			'';

		setCarryOverAcademicYear(defaultYear);
		if (user?.role === 'teacher') {
			const latestYearEntry = getTeacherLatestYearEntry(user);
			const defaultSelections =
				mapYearEntryToTeacherSelections(latestYearEntry);
			setCarryOverSubjects(defaultSelections);
			setCarryOverSponsorClass(user?.sponsorClass || null);
		}
		if (user?.role === 'administrator') {
			const latestAdminYear = getAdminTimeline(user)[0];
			setCarryOverPosition(
				latestAdminYear?.position || user?.position || adminPositions[0],
			);
		}
		setShowCarryOverModal(true);
	};

	const getAcademicYearOptions = () => {
		const years = new Set(generateAcademicYears());
		if (schoolProfile?.currentAcademicYear)
			years.add(schoolProfile.currentAcademicYear);
		return Array.from(years).sort((a, b) => b.localeCompare(a));
	};

	const getPromotionAcademicYearOptions = () =>
		getCurrentAndNextAcademicYears();
	const getCarryOverAcademicYearOptions = () => {
		if (!user || !['teacher', 'administrator'].includes(user.role)) return [];
		return getCurrentAndNextAcademicYears();
	};

	const buildTeacherClassesPayloadFromSelections = (
		selections,
		sponsorClassValue,
	) => {
		const classMap = new Map();
		const normalizedSelections = Array.isArray(selections) ? selections : [];

		normalizedSelections.forEach((selection) => {
			if (selection.classId) {
				if (!classMap.has(selection.classId))
					classMap.set(selection.classId, new Set());
				classMap.get(selection.classId).add(selection.subject);
			} else {
				const classes = getClassesBySessionAndLevel(
					selection.session,
					selection.level,
				);
				classes.forEach((cls) => {
					if (!classMap.has(cls.classId)) classMap.set(cls.classId, new Set());
					classMap.get(cls.classId).add(selection.subject);
				});
			}
		});

		return Array.from(classMap.entries())
			.map(([classId, subjectsSet]) => ({
				classId,
				subjects: Array.from(subjectsSet as Set<string>).sort(),
			}))
			.filter((entry) => entry.subjects.length > 0)
			.sort((a, b) => a.classId.localeCompare(b.classId));
	};

	const buildTeacherSubjectsPayload = () => {
		const academicYear = getCurrentAcademicYear();
		const classes = buildTeacherClassesPayloadFromSelections(
			formData?.subjects || [],
			formData?.sponsorClass,
		);
		const existingSubjects = Array.isArray(user?.subjects) ? user.subjects : [];
		const otherYears = existingSubjects.filter(
			(entry) => entry.year !== academicYear,
		);
		const currentYearEntry = { year: academicYear, classes };
		return [...otherYears, currentYearEntry];
	};

	const handlePromotionSubmit = async () => {
		setActionError('');
		const promotionYearOptions = getPromotionAcademicYearOptions();
		if (
			promotionForm.type === 'yearlyPromotion' &&
			!hasYearOptionLaterThanUser(promotionYearOptions, user)
		) {
			setActionError(
				'No eligible promotion year is available from the current options.',
			);
			return;
		}
		if (isAtHighestClass()) {
			setActionError(
				'Cannot promote this student because they are already in the highest possible class.',
			);
			return;
		}
		if (!promotionForm.classId || !promotionForm.className) {
			setActionError('Please select a new class.');
			return;
		}
		if (
			promotionForm.type === 'yearlyPromotion' &&
			!promotionForm.academicYear
		) {
			setActionError('Please select the new academic year.');
			return;
		}
		if (
			promotionForm.type === 'yearlyPromotion' &&
			!promotionYearOptions.includes(promotionForm.academicYear)
		) {
			setActionError(
				'Yearly promotions must use the current academic year or the next academic year.',
			);
			return;
		}
		if (promotionForm.type === 'yearlyPromotion') {
			const latestStart = getLatestAcademicYearStartForUser(user);
			const selectedStart = getAcademicYearStart(promotionForm.academicYear);
			if (
				latestStart !== null &&
				selectedStart !== null &&
				selectedStart <= latestStart
			) {
				setActionError(
					"The selected year must be later than the student's latest academic year.",
				);
				return;
			}
		}

		setActionLoading(true);
		try {
			const res = await fetch(
				`/api/users?id=${user._id}&action=promote&type=${promotionForm.type}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						promotedToClassId: promotionForm.classId,
						promotedToClassName: promotionForm.className,
						newAcademicYear:
							promotionForm.type === 'yearlyPromotion'
								? promotionForm.academicYear
								: undefined,
					}),
				},
			);
			const data = await res.json();
			if (!res.ok || !data.success)
				throw new Error(data.message || 'Promotion failed.');

			const updatedUser = getUpdatedUserFromResponse(data);
			if (!updatedUser)
				throw new Error(
					'Promotion response did not include updated user data.',
				);

			onSave(updatedUser);
			setFeedback({ type: 'success', message: data.message });
			setShowPromotionModal(false);
		} catch (err) {
			setActionError(err instanceof Error ? err.message : 'Promotion failed.');
		} finally {
			setActionLoading(false);
		}
	};

	const handleDemotionSubmit = async () => {
		setActionError('');
		if (!demotionForm.classId || !demotionForm.className) {
			setActionError('Please select a new class.');
			return;
		}
		if (demotionForm.type === 'yearlyDemotion' && !demotionForm.academicYear) {
			setActionError('Please select the academic year to repeat.');
			return;
		}

		setActionLoading(true);
		try {
			const res = await fetch(
				`/api/users?id=${user._id}&action=demote&type=${demotionForm.type}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						demotedToClassId: demotionForm.classId,
						demotedToClassName: demotionForm.className,
						previousAcademicYear:
							demotionForm.type === 'yearlyDemotion'
								? demotionForm.academicYear
								: undefined,
					}),
				},
			);
			const data = await res.json();
			if (!res.ok || !data.success)
				throw new Error(data.message || 'Demotion failed.');

			const updatedUser = getUpdatedUserFromResponse(data);
			if (!updatedUser)
				throw new Error('Demotion response did not include updated user data.');

			onSave(updatedUser);
			setFeedback({ type: 'success', message: data.message });
			setShowDemotionModal(false);
		} catch (err) {
			setActionError(err instanceof Error ? err.message : 'Demotion failed.');
		} finally {
			setActionLoading(false);
		}
	};

	const handleCarryOverSubmit = async () => {
		setActionError('');
		setConflictState(null);
		const options = getCarryOverAcademicYearOptions();

		if (!hasYearOptionLaterThanUser(options, user)) {
			setActionError(
				'No eligible academic year is available from the current options.',
			);
			return;
		}
		if (!carryOverAcademicYear) {
			setActionError('Please select a new academic year.');
			return;
		}
		if (!options.includes(carryOverAcademicYear)) {
			setActionError(
				'Please select either the current academic year or the next academic year.',
			);
			return;
		}

		const latestStart = getLatestAcademicYearStartForUser(user);
		const selectedStart = getAcademicYearStart(carryOverAcademicYear);
		if (
			latestStart !== null &&
			selectedStart !== null &&
			selectedStart <= latestStart
		) {
			setActionError(
				"The selected year must be later than the user's latest academic year.",
			);
			return;
		}

		const requestBody: any = { newAcademicYear: carryOverAcademicYear };

		if (user?.role === 'teacher') {
			const classes = buildTeacherClassesPayloadFromSelections(
				carryOverSubjects,
				carryOverSponsorClass,
			);
			if (!Array.isArray(classes) || classes.length === 0) {
				setActionError(
					'Please select at least one class/subject assignment for the new academic year.',
				);
				return;
			}
			requestBody.classes = classes;
			requestBody.sponsorClass = carryOverSponsorClass || null;
		}

		if (user?.role === 'administrator') {
			if (!carryOverPosition) {
				setActionError('Please select a position for the new academic year.');
				return;
			}
			requestBody.position = carryOverPosition;
		}

		setActionLoading(true);
		try {
			const res = await fetch(
				`/api/users?id=${user._id}&action=addAcademicYear`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestBody),
				},
			);
			const data = await res.json();
			if (!res.ok) {
				if (res.status === 409 && data.requiresConfirmation) {
					setConflictState({
						conflicts: data.conflicts || [],
						conflictSummary: data.conflictSummary || {},
						errors: data.errors || [],
						mode: 'carry-over',
						requestBody,
					});
					return;
				}
				throw new Error(data.message || 'Failed to add academic year.');
			}
			if (!data.success)
				throw new Error(data.message || 'Failed to add academic year.');

			const updatedReassignedTeachers = await fetchReassignedTeachers(
				data.reassignments,
			);
			if (data.reassignments?.performed) {
				setFeedback({
					type: 'success',
					message: `Academic year added successfully. ${data.reassignments.count} assignment(s) were reassigned.`,
				});
			} else {
				setFeedback({ type: 'success', message: data.message });
			}

			const updatedUser = getUpdatedUserFromResponse(data);
			if (!updatedUser)
				throw new Error(
					'Academic year response did not include updated user data.',
				);

			onSave(updatedUser, updatedReassignedTeachers);
			setShowCarryOverModal(false);
		} catch (err) {
			setActionError(
				err instanceof Error ? err.message : 'Failed to add academic year.',
			);
		} finally {
			setActionLoading(false);
		}
	};

	const renderTeacherSessionPanel = (
		session,
		subjects,
		sponsorClass,
		onSCChange,
		onSubChange,
		onSponsorChange,
	) => {
		const scClasses = getSelfContainedClasses(session);
		const regularLevels = getClassLevels(session).filter(
			(l: string) => !isLevelSelfContained(session, l),
		);

		return (
			<div className="space-y-4">
				{scClasses.length > 0 && (
					<SectionCard
						title="Self-Contained Classes"
						subtitle="Each class covers all its configured subjects."
						icon={CheckCircle2}
					>
						<div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
							{scClasses.map((cls) => {
								const isChecked = subjects.some(
									(s) =>
										s.classId === cls.classId &&
										s.session === session &&
										s.level === cls.level,
								);
								return (
									<motion.label
										key={cls.classId}
										whileTap={{ scale: 0.97 }}
										className={`relative flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-all ${isChecked ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:border-primary/40 bg-background'}`}
									>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={(e) =>
												onSCChange(
													cls.classId,
													session,
													cls.level,
													e.target.checked,
												)
											}
											className="absolute opacity-0 w-0 h-0"
										/>
										<ThemedCheckbox checked={isChecked} />
										<div className="min-w-0">
											<span className="text-sm font-medium text-foreground block truncate">
												{cls.name}
											</span>
											<span className="text-[11px] text-muted-foreground">
												{cls.level}
											</span>
										</div>
									</motion.label>
								);
							})}
						</div>
					</SectionCard>
				)}

				{regularLevels.length > 0 && (
					<SectionCard
						title="Subjects by Level"
						subtitle="Check subjects this teacher will deliver across all classes in that level."
						icon={BookOpen}
					>
						<div className="space-y-3 max-h-[50vh] sm:max-h-64 overflow-y-auto pr-0.5">
							{regularLevels.map((level: string) => {
								const style = getLevelStyle(level);
								const subjectsByLevel = getSubjectsBySessionAndLevel(
									session,
									level,
								);
								return (
									<div
										key={level}
										className={`rounded-lg border p-3 ${style.section}`}
									>
										<div className="flex items-center gap-2 mb-2.5">
											<span
												className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${style.badge}`}
											>
												{level}
											</span>
										</div>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
											{subjectsByLevel.map((subject, idx) => {
												const subjectName = getSubjectName(subject);
												const isChecked = subjects.some(
													(s) =>
														s.subject === subjectName &&
														s.level === level &&
														s.session === session &&
														!s.classId,
												);
												return (
													<motion.label
														key={`${subjectName}-${idx}`}
														whileTap={{ scale: 0.96 }}
														className={`relative flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer text-xs transition-all ${isChecked ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-background hover:border-primary/40'}`}
													>
														<input
															type="checkbox"
															checked={isChecked}
															onChange={(e) =>
																onSubChange(
																	subjectName,
																	level,
																	session,
																	e.target.checked,
																)
															}
															className="absolute opacity-0 w-0 h-0"
														/>
														<ThemedCheckbox checked={isChecked} />
														<span className="text-foreground leading-snug">
															{subjectName}
														</span>
													</motion.label>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</SectionCard>
				)}

				<SectionCard
					title="Class Sponsorship"
					subtitle="Assign this teacher as homeroom sponsor for one class (optional)."
					icon={Users}
				>
					<Select
						value={
							sponsorClass &&
							getAllClassesForSession(session).find(
								(c: any) => c.classId === sponsorClass,
							)
								? sponsorClass
								: '__none__'
						}
						onValueChange={(val) => onSponsorChange(session, val)}
					>
						<SelectTrigger className={selectTriggerClass}>
							<SelectValue placeholder="No sponsorship" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="__none__">No sponsorship</SelectItem>
							{getAllClassesForSession(session)
								.filter((cls) => !isLevelSelfContained(session, cls.level))
								.map((cls) => (
									<SelectItem key={cls.classId} value={cls.classId}>
										{cls.name} ({cls.level})
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</SectionCard>
			</div>
		);
	};

	if (!isOpen || !formData) return null;

	return (
		<>
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
				<div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border">
					<header className="flex justify-between items-center p-4 sm:p-6 border-b border-border flex-shrink-0">
						<div className="flex items-center gap-3">
							<img
								src={
									formData?.avatar ||
									user?.avatar ||
									`https://ui-avatars.com/api/?name=${encodeURIComponent(getFullName(user))}&background=random`
								}
								alt={getFullName(user)}
								className="h-10 w-10 rounded-full border-2 border-primary/20 object-cover"
							/>
							<div>
								<h4 className="text-xl md:text-2xl font-semibold text-foreground">
									Edit User Profile
								</h4>
								<p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-none">
									{getFullName(user)}
								</p>
								{user?.role === 'student' && (
									<p className="text-[11px] text-muted-foreground/80 truncate max-w-[200px] sm:max-w-none">
										{formData?.className ||
											getClassNameFromId(formData?.classId || user?.classId) ||
											'No class assigned'}
									</p>
								)}
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-full hover:bg-muted transition-colors"
						>
							<X className="h-5 w-5" />
						</button>
					</header>

					<main className="overflow-y-auto flex-grow p-4 sm:p-8 space-y-6">
						{validationErrors.length > 0 && (
							<div className="text-sm text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
								<p className="font-semibold flex items-center mb-2">
									<AlertTriangle className="h-4 w-4 mr-2" />
									Please fix the following issues:
								</p>
								<ul className="list-disc pl-5 space-y-1">
									{validationErrors.map((err, index) => (
										<li key={index}>{err.message}</li>
									))}
								</ul>
							</div>
						)}

						<section>
							<h5 className="font-semibold mb-3 text-lg border-b pb-2">
								Profile Overview
							</h5>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">Role</p>
									<p className="text-md font-medium text-foreground capitalize">
										{user.role}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">
										Years with Institution
									</p>
									<p className="text-md font-medium text-foreground">
										{getYearsSpent(user)}
									</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Status</p>
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}
									>
										{user.isActive ? 'Active' : 'Inactive'}
									</span>
								</div>
							</div>
						</section>

						<section>
							<h5 className="font-semibold mb-3 text-lg border-b pb-2">
								Personal Information
							</h5>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<InputField
									label="First Name"
									name="firstName"
									value={formData.firstName}
									onChange={handleInputChange}
								/>
								<InputField
									label="Middle Name"
									name="middleName"
									value={formData.middleName}
									onChange={handleInputChange}
								/>
								<InputField
									label="Last Name"
									name="lastName"
									value={formData.lastName}
									onChange={handleInputChange}
								/>
								<InputField
									label="Email Address"
									name="email"
									type="email"
									value={formData.email}
									onChange={handleInputChange}
								/>
								<InputField
									label="Phone Number"
									name="phone"
									value={formData.phone}
									onChange={handleInputChange}
								/>
								<div className="sm:col-span-2">
									<InputField
										label="Address"
										name="address"
										value={formData.address}
										onChange={handleInputChange}
									/>
								</div>
							</div>
						</section>

						{user.role === 'student' && (
							<>
								<section>
									<h5 className="font-semibold mb-3 text-lg border-b pb-2">
										Academic Information
									</h5>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-foreground mb-1">
												Session
											</label>
											<Select
												value={formData.session || ''}
												onValueChange={handleStudentSessionChange}
											>
												<SelectTrigger className={selectTriggerClass}>
													<SelectValue placeholder="Select Session" />
												</SelectTrigger>
												<SelectContent>
													{getSessions().map((session) => (
														<SelectItem key={session} value={session}>
															{session}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div>
											<label className="block text-sm font-medium text-foreground mb-1">
												Class
											</label>
											<Select
												value={formData.classId || ''}
												onValueChange={handleStudentClassChange}
												disabled={!formData.session}
											>
												<SelectTrigger className={selectTriggerClass}>
													<SelectValue placeholder="Select Class" />
												</SelectTrigger>
												<SelectContent>
													{formData.session &&
														getClassLevels(formData.session).map((level) => {
															const levelStyle = getLevelStyle(level);
															return (
																<React.Fragment key={level}>
																	<div
																		className={`mx-1 mt-1 mb-1 inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${levelStyle.badge}`}
																	>
																		{level}
																	</div>
																	{getAllClassesWithLevelsForSession(
																		formData.session,
																	)
																		.filter((cls) => cls.level === level)
																		.map((cls) => (
																			<SelectItem
																				key={cls.classId}
																				value={cls.classId}
																			>
																				{cls.name}
																			</SelectItem>
																		))}
																</React.Fragment>
															);
														})}
												</SelectContent>
											</Select>
										</div>
										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												Late Registration Status
											</label>
											<label className="relative inline-flex items-center cursor-pointer w-max">
												<input
													type="checkbox"
													checked={!!formData.isLateRegistration}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															isLateRegistration: e.target.checked,
														}))
													}
													className="sr-only peer"
												/>
												<div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
												<span className="ml-3 text-sm font-medium text-foreground">
													{formData.isLateRegistration
														? 'Late Registered'
														: 'Standard Registration'}
												</span>
											</label>
										</div>
									</div>
								</section>
								<section>
									<h5 className="font-semibold mb-3 text-lg border-b pb-2">
										Guardian Information
									</h5>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<InputField
											label="Guardian First Name"
											name="firstName"
											value={formData.guardian?.firstName}
											onChange={handleGuardianInputChange}
										/>
										<InputField
											label="Guardian Middle Name"
											name="middleName"
											value={formData.guardian?.middleName}
											onChange={handleGuardianInputChange}
										/>
										<InputField
											label="Guardian Last Name"
											name="lastName"
											value={formData.guardian?.lastName}
											onChange={handleGuardianInputChange}
										/>
										<InputField
											label="Guardian Email"
											name="email"
											type="email"
											value={formData.guardian?.email}
											onChange={handleGuardianInputChange}
										/>
										<InputField
											label="Guardian Phone"
											name="phone"
											value={formData.guardian?.phone}
											onChange={handleGuardianInputChange}
										/>
										<div className="sm:col-span-2">
											<InputField
												label="Guardian Address"
												name="address"
												value={formData.guardian?.address}
												onChange={handleGuardianInputChange}
											/>
										</div>
									</div>
								</section>
							</>
						)}

						{user.role === 'administrator' && (
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Administrative Information
								</h5>
								<div>
									<label className="block text-sm font-medium text-foreground mb-1">
										Position
									</label>
									<Select
										value={formData.position}
										onValueChange={(value) =>
											handleInputChange({ target: { name: 'position', value } })
										}
									>
										<SelectTrigger className={selectTriggerClass}>
											<SelectValue placeholder="Select Position" />
										</SelectTrigger>
										<SelectContent>
											{adminPositions.map((pos) => (
												<SelectItem key={pos} value={pos}>
													{pos}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</section>
						)}

						{user.role === 'teacher' && schoolProfile && (
							<section>
								<h5 className="font-semibold mb-4 text-lg border-b pb-2">
									Teaching Assignments
								</h5>

								{getSessions().length > 1 && (
									<MobileTabStrip
										items={getSessions().map((session) => ({
											id: session,
											label: session,
											icon: BookOpen,
										}))}
										activeId={activeTeacherSession}
										onSelect={setActiveTeacherSession}
									/>
								)}

								<div className="flex gap-4">
									{getSessions().length > 1 && (
										<div className="hidden sm:flex flex-col gap-1 w-40 lg:w-44 shrink-0">
											<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">
												Sessions
											</p>
											{getSessions().map((session) => (
												<SidebarItem
													key={session}
													label={session}
													isActive={activeTeacherSession === session}
													icon={BookOpen}
													onClick={() => setActiveTeacherSession(session)}
												/>
											))}
										</div>
									)}

									<div className="flex-1 min-w-0">
										<AnimatePresence mode="wait">
											<motion.div
												key={activeTeacherSession}
												initial={{ opacity: 0, x: 6 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ duration: 0.16 }}
											>
												{renderTeacherSessionPanel(
													activeTeacherSession,
													formData.subjects || [],
													formData.sponsorClass,
													handleSelfContainedSelection,
													handleSubjectChange,
													handleSponsorClassChange,
												)}
											</motion.div>
										</AnimatePresence>
									</div>
								</div>
							</section>
						)}
					</main>

					<footer className="p-4 sm:p-6 bg-muted/50 border-t border-border rounded-b-xl flex-shrink-0 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
						<div className="w-full sm:w-auto">
							{user.role === 'student' && (
								<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
									<button
										type="button"
										onClick={handlePromotion}
										className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
									>
										Promote Student
									</button>
									{allowsDemotion && (
										<button
											type="button"
											onClick={handleDemotion}
											className="w-full sm:w-auto px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
										>
											Demote Student
										</button>
									)}
								</div>
							)}
							{(user.role === 'teacher' || user.role === 'administrator') && (
								<button
									type="button"
									onClick={handleCarryOver}
									className="w-full sm:w-auto px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
								>
									Bring To New Academic Year
								</button>
							)}
						</div>
						<div className="w-full sm:w-auto flex flex-col sm:flex-row sm:justify-end gap-2">
							<button
								type="button"
								onClick={onClose}
								className="w-full sm:w-auto px-6 py-2 rounded-lg hover:bg-muted/80 text-foreground"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={isLoading || !!conflictState}
								className="w-full sm:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
							>
								{isLoading ? (
									<span className="inline-flex items-center">
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Saving...
									</span>
								) : (
									'Save Changes'
								)}
							</button>
						</div>
					</footer>

					{/* PROMOTION MODAL */}
					{showPromotionModal && (
						<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
							<div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-xl">
								<div className="flex items-center justify-between p-4 border-b border-border">
									<h5 className="text-lg font-semibold text-foreground">
										Promote Student
									</h5>
									<button
										type="button"
										onClick={() => setShowPromotionModal(false)}
										className="p-2 rounded-full hover:bg-muted transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<div className="p-4 space-y-4">
									{actionError && (
										<p className="text-sm text-destructive">{actionError}</p>
									)}
									{isAtHighestClass() ? (
										<p className="text-sm text-muted-foreground">
											Cannot promote this student because they are already in
											the highest possible class.
										</p>
									) : (
										<>
											{allowsDoublePromotion ? (
												<div>
													<label className="block text-sm font-medium text-foreground mb-1">
														Promotion Type
													</label>
													<Select
														value={promotionForm.type}
														onValueChange={(val) =>
															setPromotionForm((prev) => ({
																...prev,
																type: val,
															}))
														}
													>
														<SelectTrigger className={selectTriggerClass}>
															<SelectValue placeholder="Select type" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="yearlyPromotion">
																Yearly Promotion
															</SelectItem>
															<SelectItem value="doublePromotion">
																Semester (Double) Promotion
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													Only yearly promotion is allowed.
												</p>
											)}
											<div>
												<label className="block text-sm font-medium text-foreground mb-1">
													New Class
												</label>
												<Select
													value={promotionForm.classId}
													onValueChange={(val) => {
														const sel = getPromotionClassOptions().find(
															(c) => c.classId === val,
														);
														setPromotionForm((p) => ({
															...p,
															classId: val,
															className: sel?.name || '',
														}));
													}}
												>
													<SelectTrigger className={selectTriggerClass}>
														<SelectValue placeholder="Select Class" />
													</SelectTrigger>
													<SelectContent>
														{getPromotionClassOptions().map((cls) => (
															<SelectItem key={cls.classId} value={cls.classId}>
																{cls.name} ({cls.level} - {cls.session})
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											{promotionForm.type === 'yearlyPromotion' && (
												<div>
													<label className="block text-sm font-medium text-foreground mb-1">
														New Academic Year
													</label>
													<Select
														value={promotionForm.academicYear}
														onValueChange={(val) =>
															setPromotionForm((p) => ({
																...p,
																academicYear: val,
															}))
														}
													>
														<SelectTrigger className={selectTriggerClass}>
															<SelectValue placeholder="Select Academic Year" />
														</SelectTrigger>
														<SelectContent>
															{getPromotionAcademicYearOptions().map((year) => (
																<SelectItem key={year} value={year}>
																	{year}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											)}
										</>
									)}
								</div>
								<div className="p-4 border-t border-border flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowPromotionModal(false)}
										className="px-4 py-2 rounded-lg hover:bg-muted/80"
									>
										Cancel
									</button>
									{!isAtHighestClass() && (
										<button
											type="button"
											onClick={handlePromotionSubmit}
											disabled={actionLoading}
											className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
										>
											{actionLoading ? 'Saving...' : 'Confirm Promotion'}
										</button>
									)}
								</div>
							</div>
						</div>
					)}

					{/* DEMOTION MODAL */}
					{showDemotionModal && (
						<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
							<div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-xl">
								<div className="flex items-center justify-between p-4 border-b border-border">
									<h5 className="text-lg font-semibold text-foreground">
										Demote Student
									</h5>
									<button
										type="button"
										onClick={() => setShowDemotionModal(false)}
										className="p-2 rounded-full hover:bg-muted transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<div className="p-4 space-y-4">
									{actionError && (
										<p className="text-sm text-destructive">{actionError}</p>
									)}
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											Demotion Type
										</label>
										<Select
											value={demotionForm.type}
											onValueChange={(val) =>
												setDemotionForm((p) => ({ ...p, type: val }))
											}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="yearlyDemotion">
													Yearly Demotion
												</SelectItem>
												<SelectItem value="semesterDemotion">
													Semester Demotion
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											New Class
										</label>
										<Select
											value={demotionForm.classId}
											onValueChange={(val) => {
												const sel = getDemotionClassOptions().find(
													(c) => c.classId === val,
												);
												setDemotionForm((p) => ({
													...p,
													classId: val,
													className: sel?.name || '',
												}));
											}}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select Class" />
											</SelectTrigger>
											<SelectContent>
												{getDemotionClassOptions().map((cls) => (
													<SelectItem key={cls.classId} value={cls.classId}>
														{cls.name} ({cls.level} - {cls.session})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									{demotionForm.type === 'yearlyDemotion' && (
										<div>
											<label className="block text-sm font-medium text-foreground mb-1">
												Academic Year to Repeat
											</label>
											<Select
												value={demotionForm.academicYear}
												onValueChange={(val) =>
													setDemotionForm((p) => ({ ...p, academicYear: val }))
												}
											>
												<SelectTrigger className={selectTriggerClass}>
													<SelectValue placeholder="Select Academic Year" />
												</SelectTrigger>
												<SelectContent>
													{getAcademicYearOptions().map((year) => (
														<SelectItem key={year} value={year}>
															{year}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>
								<div className="p-4 border-t border-border flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowDemotionModal(false)}
										className="px-4 py-2 rounded-lg hover:bg-muted/80"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleDemotionSubmit}
										disabled={actionLoading}
										className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
									>
										{actionLoading ? 'Saving...' : 'Confirm Demotion'}
									</button>
								</div>
							</div>
						</div>
					)}

					{/* CARRY OVER MODAL */}
					{showCarryOverModal && (
						<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
							<div className="bg-card w-full max-w-4xl max-h-[92vh] rounded-xl border border-border shadow-xl flex flex-col">
								<div className="flex items-center justify-between p-4 border-b border-border">
									<div>
										<h5 className="text-lg font-semibold text-foreground">
											Bring To New Academic Year
										</h5>
										<p className="text-xs text-muted-foreground mt-0.5">
											Current assignments are preselected by default.
										</p>
									</div>
									<button
										type="button"
										onClick={() => setShowCarryOverModal(false)}
										className="p-2 rounded-full hover:bg-muted transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
									{actionError && (
										<p className="text-sm text-destructive">{actionError}</p>
									)}
									<div>
										<label className="block text-sm font-medium text-foreground mb-1">
											New Academic Year
										</label>
										<Select
											value={carryOverAcademicYear}
											onValueChange={setCarryOverAcademicYear}
										>
											<SelectTrigger className={selectTriggerClass}>
												<SelectValue placeholder="Select Academic Year" />
											</SelectTrigger>
											<SelectContent>
												{getCarryOverAcademicYearOptions().map((year) => (
													<SelectItem key={year} value={year}>
														{year}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{user?.role === 'administrator' && (
										<div>
											<label className="block text-sm font-medium text-foreground mb-1">
												Position For New Year
											</label>
											<Select
												value={carryOverPosition}
												onValueChange={setCarryOverPosition}
											>
												<SelectTrigger className={selectTriggerClass}>
													<SelectValue placeholder="Select Position" />
												</SelectTrigger>
												<SelectContent>
													{adminPositions.map((pos) => (
														<SelectItem key={pos} value={pos}>
															{pos}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}

									{user?.role === 'teacher' && (
										<div className="space-y-4 mt-6">
											<div className="border-b border-border pb-2 mb-2">
												<h6 className="text-sm font-semibold text-foreground">
													Review Subject Assignments
												</h6>
											</div>

											{getSessions().length > 1 && (
												<MobileTabStrip
													items={getSessions().map((session) => ({
														id: session,
														label: session,
														icon: BookOpen,
													}))}
													activeId={carryOverActiveSession}
													onSelect={setCarryOverActiveSession}
												/>
											)}

											<div className="flex gap-4">
												{getSessions().length > 1 && (
													<div className="hidden sm:flex flex-col gap-1 w-40 lg:w-44 shrink-0">
														<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">
															Sessions
														</p>
														{getSessions().map((session) => (
															<SidebarItem
																key={session}
																label={session}
																isActive={carryOverActiveSession === session}
																icon={BookOpen}
																onClick={() =>
																	setCarryOverActiveSession(session)
																}
															/>
														))}
													</div>
												)}

												<div className="flex-1 min-w-0">
													<AnimatePresence mode="wait">
														<motion.div
															key={carryOverActiveSession}
															initial={{ opacity: 0, x: 6 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ duration: 0.16 }}
														>
															{renderTeacherSessionPanel(
																carryOverActiveSession,
																carryOverSubjects,
																carryOverSponsorClass,
																handleCarryOverSelfContainedSelection,
																handleCarryOverSubjectChange,
																handleCarryOverSponsorClassChange,
															)}
														</motion.div>
													</AnimatePresence>
												</div>
											</div>
										</div>
									)}
								</div>
								<div className="p-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
									<button
										type="button"
										onClick={() => setShowCarryOverModal(false)}
										className="w-full sm:w-auto px-4 py-2 rounded-lg hover:bg-muted/80"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleCarryOverSubmit}
										disabled={
											actionLoading ||
											getCarryOverAcademicYearOptions().length === 0
										}
										className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
									>
										{actionLoading ? 'Saving...' : 'Confirm'}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
			<ConflictModal
				isOpen={!!conflictState}
				onClose={() => setConflictState(null)}
				conflictState={conflictState}
				onConfirm={handleConfirmReassignment}
				isLoading={isLoading}
				userName={`${formData.firstName} ${formData.lastName}`}
				schoolProfile={schoolProfile}
			/>
		</>
	);
};

const InputField = ({ label, ...props }) => (
	<div>
		<label className="block text-sm font-medium text-foreground mb-1">
			{label}
		</label>
		<input
			{...props}
			className="w-full p-2 border border-border/70 rounded-lg bg-background shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-primary/40 text-foreground"
		/>
	</div>
);

export default EditUserModal;
