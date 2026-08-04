// modals/EditUserModal.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
	X,
	ChevronDown,
	AlertTriangle,
	Loader2,
	Users,
	BookOpen,
	CheckCircle2,
	Search,
	User,
	UserCheck,
	UserPlus,
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';
import { buildSchoolAcademicYearRange } from '@/utils/academicYearOptions';
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

const ThemedRadio = ({ checked }: { checked: boolean }) => (
	<div
		className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
			checked ? 'border-primary' : 'border-border'
		}`}
	>
		{checked && <div className="w-2 h-2 rounded-full bg-primary" />}
	</div>
);

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

const normalizeYearKey = (value: string) =>
	String(value || '')
		.trim()
		.replace(/[–—]/g, '-')
		.replace(/\s+/g, '')
		.replace(/\//g, '-');

const getLocalRoster = (
	usersByAcademicYear: Record<string, any>,
	academicYear: string,
) => {
	const target = normalizeYearKey(academicYear);
	if (!target) return undefined;
	const matchKey = Object.keys(usersByAcademicYear || {}).find(
		(key) => normalizeYearKey(key) === target,
	);
	if (!matchKey) return undefined;
	return usersByAcademicYear[matchKey];
};

const filterLocalUsers = (users: any[], query: string) =>
	(Array.isArray(users) ? users : []).filter((user) => {
		const name = [user?.fullName, user?.firstName, user?.middleName, user?.lastName]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		const username = String(user?.username || '').toLowerCase();
		const email = String(user?.email || '').toLowerCase();
		const phone = String(user?.phone || '').toLowerCase();
		const id = String(user?.id || user?._id || '').toLowerCase();
		return (
			name.includes(query) ||
			username.includes(query) ||
			email.includes(query) ||
			phone.includes(query) ||
			id.includes(query)
		);
	});

const EditUserModal = ({ isOpen, onClose, user, onSave, setFeedback }) => {
	const [formData, setFormData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [validationErrors, setValidationErrors] = useState<any[]>([]);
	const [conflictState, setConflictState] = useState<any>(null);
	const [showPromotionModal, setShowPromotionModal] = useState(false);
	const [showDemotionModal, setShowDemotionModal] = useState(false);
	const [showCarryOverModal, setShowCarryOverModal] = useState(false);
	const [activeTeacherSession, setActiveTeacherSession] = useState('');
	const [adminActiveSession, setAdminActiveSession] = useState('');
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
	const [parentEditAction, setParentEditAction] = useState<
		'keep' | 'assign' | 'create' | 'unlink'
	>('keep');
	const [parentDraft, setParentDraft] = useState<any>({
		searchTerm: '',
		parentId: '',
		parentLabel: '',
		firstName: '',
		middleName: '',
		lastName: '',
		email: '',
		phone: '',
		address: '',
	});
	const [parentSearchResults, setParentSearchResults] = useState<any[]>([]);
	const [parentSearching, setParentSearching] = useState(false);
	const [parentSearchDone, setParentSearchDone] = useState(false);
	const [parentErrors, setParentErrors] = useState<any>({});
	const parentSearchTimeout = useRef<any>(null);
	const [childSearchTerm, setChildSearchTerm] = useState('');
	const [childSearchResults, setChildSearchResults] = useState<any[]>([]);
	const [childSearching, setChildSearching] = useState(false);
	const [childSearchDone, setChildSearchDone] = useState(false);
	const [childDetailsMap, setChildDetailsMap] = useState<Record<string, any>>({});
	const childSearchTimeout = useRef<any>(null);

	const schoolProfile = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);
	const allowsDemotion =
		schoolProfile?.academicConfig?.gradingSettings?.givesDemotion === true;
	const allowsDoublePromotion =
		schoolProfile?.academicConfig?.gradingSettings?.givesDoublePromotion === true;

	const availablePermissions = useMemo(() => {
		return schoolProfile?.featureConfig?.enabledFeatures || [];
	}, [schoolProfile]);

	const getClassNameFromId = (classId) => {
		if (!classId || !schoolProfile?.academicConfig?.classLevels) return classId;
		for (const session of Object.values(schoolProfile.academicConfig.classLevels)) {
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
		!!schoolProfile?.academicConfig?.classLevels?.[session]?.[level]?.isSelfContained ||
		level === 'Self Contained';

	const getAllClassesWithSessionAndLevel = () => {
		if (!schoolProfile?.academicConfig?.classLevels) return [];
		const all: any[] = [];
		Object.entries(schoolProfile.academicConfig.classLevels).forEach(([session, levels]) => {
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
			if (!classId || !schoolProfile?.academicConfig?.classLevels) return null;
			for (const [session, levels] of Object.entries(schoolProfile.academicConfig.classLevels)) {
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
			if (!session || !schoolProfile?.academicConfig?.classLevels?.[session]) return [];
			const ordered: any[] = [];
			Object.entries(schoolProfile.academicConfig.classLevels[session]).forEach(
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

	const getAcademicYearStart = (year) => {
		if (!year || typeof year !== 'string') return null;
		const start = Number.parseInt(year.split('-')[0], 10);
		return Number.isFinite(start) ? start : null;
	};

	const getCurrentAcademicYear = () => schoolProfile?.identity.currentAcademicYear || '';

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

			const firstSession = schoolProfile?.academicConfig?.classLevels
				? Object.keys(schoolProfile.academicConfig.classLevels)[0]
				: '';
				setActiveTeacherSession(firstSession);
				setCarryOverActiveSession(firstSession);
			}

			if (userData.role === 'administrator') {
				userData.permissions = userData.permissions || [];
				const activeYear = getCurrentAcademicYear();
				const yearClasses =
					userData.classes?.find((entry: any) => entry.year === activeYear) ||
					(userData.classes || [])
						.slice()
						.sort((a: any, b: any) => (b.year || '').localeCompare(a.year || ''))[0];
				const selectionMap = new Map();
				(yearClasses?.classes || []).forEach((classData: any) => {
					const meta = getClassMetaById(classData.classId);
					if (!meta) return;
					const isSC = isLevelSelfContained(meta.session, meta.level);
					(classData.subjects || []).forEach((subjectValue: any) => {
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
				userData.adminClasses = Array.from(selectionMap.values());
				userData.isTeacher = userData.isTeacher || false;
			}

			setFormData(userData);
			setValidationErrors([]);
			setConflictState(null);
			setActionError('');

			setParentEditAction('keep');
			setParentDraft({
				searchTerm: '',
				parentId: '',
				parentLabel: '',
				firstName: '',
				middleName: '',
				lastName: '',
				email: '',
				phone: '',
				address: '',
			});
			setParentSearchResults([]);
			setParentSearchDone(false);
			setParentErrors({});

			setChildSearchTerm('');
			setChildSearchResults([]);
			setChildSearchDone(false);
			const childDetails: Record<string, any> = {};
			(Array.isArray(userData.parentChildren) ? userData.parentChildren : []).forEach(
				(c: any) => {
					const key = c?.studentId || c?.username;
					if (key) childDetails[key] = c;
				}
			);
			setChildDetailsMap(childDetails);

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
		schoolProfile?.academicConfig?.classLevels ? Object.keys(schoolProfile.academicConfig.classLevels) : [];
	const getClassLevels = (session) =>
		schoolProfile?.academicConfig?.classLevels?.[session]
			? Object.keys(schoolProfile.academicConfig.classLevels[session])
			: [];

	const getSubjectName = (subjectValue) => {
		if (typeof subjectValue === 'string') return subjectValue;
		if (subjectValue && typeof subjectValue === 'object')
			return subjectValue.name || subjectValue.subject || '';
		return '';
	};

		const getSubjectsBySessionAndLevel = (session, level) =>
			schoolProfile?.academicConfig?.classLevels?.[session]?.[level]?.subjects || [];

		const getAllClassesForSession = (session) => {
			if (!schoolProfile?.academicConfig?.classLevels?.[session]) return [];
			return Object.values(schoolProfile.academicConfig.classLevels[session]).flatMap(
			(level: any) => level.classes || [],
		);
	};

	const getClassesBySessionAndLevel = (session, level) =>
		schoolProfile?.academicConfig?.classLevels?.[session]?.[level]?.classes || [];

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
		if (!schoolProfile?.academicConfig?.classLevels?.[session]) return [];
		const allClasses: any[] = [];
		Object.entries(schoolProfile.academicConfig.classLevels[session]).forEach(
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

	const adminPositions = useMemo(() => {
		if (Array.isArray(schoolProfile?.userConfig.administrativePositions)) {
			return schoolProfile.userConfig.administrativePositions
				.map((pos: any) => pos.name)
				.filter(Boolean);
		}
		return [];
	}, [schoolProfile]);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const currentParent = user?.linkedParent || null;

	const handleParentDraftChange = (e: any) => {
		const { name, value } = e.target;
		setParentDraft((prev: any) => ({ ...prev, [name]: value }));
	};

	const searchParents = async (q: string) => {
		if (!q.trim()) {
			setParentSearchResults([]);
			setParentSearchDone(false);
			return;
		}
		const query = q.trim().toLowerCase();

		const localRoster = getLocalRoster(
			usersByAcademicYear as Record<string, any>,
			getCurrentAcademicYear(),
		);
		const localParents = filterLocalUsers(localRoster?.parents, query).slice(
			0,
			8,
		);
		if (localParents.length > 0) {
			setParentSearchResults(localParents);
			setParentSearchDone(true);
			return;
		}

		setParentSearching(true);
		try {
			const params = new URLSearchParams({
				role: 'parent',
				limit: '8',
				q: q.trim(),
			});
			const res = await fetch(`/api/users?${params.toString()}`);
			const data = await res.json();
			setParentSearchResults(Array.isArray(data?.data) ? data.data : []);
			setParentSearchDone(true);
		} catch {
			setParentSearchResults([]);
			setParentSearchDone(true);
		} finally {
			setParentSearching(false);
		}
	};

	const onParentSearchChange = (value: string) => {
		if (parentSearchTimeout.current) clearTimeout(parentSearchTimeout.current);
		setParentDraft((prev) => ({
			...prev,
			searchTerm: value,
			parentId: '',
			parentLabel: '',
		}));
		parentSearchTimeout.current = setTimeout(() => searchParents(value), 350);
	};

	const selectParent = (parent: any) => {
		const parentName =
			parent.fullName ||
			[parent.firstName, parent.middleName, parent.lastName]
				.filter(Boolean)
				.join(' ');
		setParentDraft((prev: any) => ({
			...prev,
			searchTerm: '',
			parentId: parent.id || parent._id,
			parentLabel: parentName,
		}));
		setParentSearchResults([]);
		setParentSearchDone(false);
		setParentErrors((prev: any) => ({ ...prev, parent: '' }));
	};

	const getParentDisplayName = (parent: any) =>
		parent?.fullName ||
		[parent?.firstName, parent?.middleName, parent?.lastName]
			.filter(Boolean)
			.join(' ') ||
		'Linked parent';

	const searchStudents = async (q: string) => {
		if (!q.trim()) {
			setChildSearchResults([]);
			setChildSearchDone(false);
			return;
		}
		const query = q.trim().toLowerCase();

		const localRoster = getLocalRoster(
			usersByAcademicYear as Record<string, any>,
			getCurrentAcademicYear(),
		);
		const localStudents = filterLocalUsers(localRoster?.students, query).slice(
			0,
			8,
		);
		if (localStudents.length > 0) {
			setChildSearchResults(localStudents);
			setChildSearchDone(true);
			return;
		}

		setChildSearching(true);
		try {
			const params = new URLSearchParams({
				role: 'student',
				limit: '8',
				q: q.trim(),
			});
			const res = await fetch(`/api/users?${params.toString()}`);
			const data = await res.json();
			setChildSearchResults(Array.isArray(data?.data) ? data.data : []);
			setChildSearchDone(true);
		} catch {
			setChildSearchResults([]);
			setChildSearchDone(true);
		} finally {
			setChildSearching(false);
		}
	};

	const onChildSearchChange = (value: string) => {
		if (childSearchTimeout.current) clearTimeout(childSearchTimeout.current);
		setChildSearchTerm(value);
		childSearchTimeout.current = setTimeout(() => searchStudents(value), 350);
	};

	const addChild = (student: any) => {
		const sid = student.studentId || student.username;
		if (!sid) return;
		setFormData((prev: any) => {
			const existing = Array.isArray(prev?.studentIds) ? prev.studentIds : [];
			if (existing.includes(sid)) return prev;
			return { ...prev, studentIds: [...existing, sid] };
		});
		setChildDetailsMap((prev) => ({ ...prev, [sid]: student }));
		setChildSearchResults([]);
		setChildSearchTerm('');
		setChildSearchDone(false);
	};

	const removeChild = (sid: string) => {
		setFormData((prev: any) => ({
			...prev,
			studentIds: Array.isArray(prev?.studentIds)
				? prev.studentIds.filter((c: string) => c !== sid)
				: [],
		}));
	};

	const getChildDisplayName = (sid: string) => {
		const c = childDetailsMap[sid];
		if (!c) return sid;
		return (
			c.fullName ||
			[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ') ||
			sid
		);
	};

	const getChildClassName = (sid: string) => {
		const c = childDetailsMap[sid];
		if (!c) return '';
		return (
			c.className || (c.classId ? getClassNameFromId(c.classId) : '') || ''
		);
	};

	const setParentAction = (
		action: 'keep' | 'assign' | 'create' | 'unlink',
	) => {
		setParentEditAction(action);
		setParentErrors({});
		if (action === 'assign') {
			setParentDraft((prev) => ({ ...prev, parentId: '', parentLabel: '' }));
		}
	};

	const validateParentAction = () => {
		const e: any = {};
		if (parentEditAction === 'assign') {
			if (!parentDraft.parentId) e.parent = 'Select a parent to assign';
		} else if (parentEditAction === 'create') {
			if (!parentDraft.firstName.trim() || !parentDraft.lastName.trim())
				e.parent = 'Parent first and last name are required';
			if (!parentDraft.phone.trim())
				e.parentContact = 'Phone number is required';
			if (parentDraft.email && !/\S+@\S+\.\S+/.test(parentDraft.email))
				e.parentEmail = 'Invalid email format';
		} else if (parentEditAction === 'unlink') {
			if (!currentParent?.id) e.parent = 'No linked parent to remove';
		}
		setParentErrors(e);
		return Object.keys(e).length === 0;
	};

	const buildParentPayload = () => {
		if (parentEditAction === 'assign') {
			return { mode: 'assign', parentId: parentDraft.parentId };
		}
		if (parentEditAction === 'create') {
			return {
				mode: 'create',
				firstName: parentDraft.firstName,
				middleName: parentDraft.middleName,
				lastName: parentDraft.lastName,
				email: parentDraft.email,
				phone: parentDraft.phone,
				address: parentDraft.address,
			};
		}
		if (parentEditAction === 'unlink') {
			return { mode: 'unlink', parentId: currentParent?.id };
		}
		return null;
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

	/* ── Admin teacher handlers ── */
	const handleAdminSubjectChange = (subject, level, session, checked) => {
		setFormData((prev) => {
			let updated = [...(prev.adminClasses || [])];
			const hasSCInSession = updated.some(
				(s) =>
					s.session === session &&
					s.classId &&
					isLevelSelfContained(session, s.level),
			);
			if (hasSCInSession) {
				updated = updated.filter(
					(s) =>
						!(
							s.session === session &&
							s.classId &&
							isLevelSelfContained(session, s.level)
						),
				);
			}
			if (checked) {
				updated.push({ subject, level, session });
			} else {
				updated = updated.filter(
					(s) =>
						!(
							s.subject === subject &&
							s.level === level &&
							s.session === session &&
							!s.classId
						),
				);
			}
			return { ...prev, adminClasses: updated };
		});
	};

	const handleAdminSelfContainedSelection = (classId, session, level, checked) => {
		setFormData((prev) => {
			const existing = [...(prev.adminClasses || [])];
			const filtered = existing.filter(
				(s) =>
					!(
						s.classId === classId &&
						s.session === session &&
						s.level === level
					),
			);
			if (checked) {
				const subjects = getSubjectsBySessionAndLevel(session, level)
					.map((sub: any) => getSubjectName(sub))
					.filter(Boolean)
					.map((name: string) => ({ subject: name, level, session, classId }));
				return { ...prev, adminClasses: [...filtered, ...subjects] };
			}
			return { ...prev, adminClasses: filtered };
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

		let payload = formData;
		if (user?.role === 'teacher') {
			payload = { ...formData, subjects: buildTeacherSubjectsPayload() };
		} else if (user?.role === 'administrator') {
			const academicYear = getCurrentAcademicYear();
			const classes = buildTeacherClassesPayloadFromSelections(
				formData.adminClasses || [],
				null,
			);
			payload = {
				...formData,
				classes: classes.length > 0 ? [{ year: academicYear, classes }] : [],
			};
		}
		const changedData = getChangedFields(user, payload);

		if (user?.role === 'student' && parentEditAction !== 'keep') {
			if (!validateParentAction()) {
				setValidationErrors([
					{ message: 'Please fix the parent account section.' },
				]);
				setIsLoading(false);
				return;
			}
			const parentPayload = buildParentPayload();
			if (parentPayload) (changedData as any).parent = parentPayload;
		}

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

			if (user?.role === 'student' && parentEditAction !== 'keep') {
				try {
					const refreshRes = await fetch(
						`/api/users?id=${updatedUser.id || updatedUser._id}&includeParents=1`,
					);
					const refreshData = await refreshRes.json();
					const refreshed = getUpdatedUserFromResponse(refreshData);
					if (refreshed) {
						onSave(refreshed, updatedReassignedTeachers);
						return;
					}
				} catch {
					// Fall through to the standard save path below
				}
			}

			if (user?.role === 'parent') {
				try {
					const refreshRes = await fetch(
						`/api/users?id=${updatedUser.id || updatedUser._id}&includeParents=1`,
					);
					const refreshData = await refreshRes.json();
					const refreshed = getUpdatedUserFromResponse(refreshData);
					if (refreshed) {
						onSave(refreshed, updatedReassignedTeachers);
						return;
					}
				} catch {
					// Fall through to the standard save path below
				}
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
			if (user?.isTeacher) {
				const latestClassEntry = (user.classes || [])
					.slice()
					.sort((a: any, b: any) => (b.year || '').localeCompare(a.year || ''))[0];
				const defaultSelections = mapYearEntryToTeacherSelections(
					{ classes: latestClassEntry?.classes || [] },
				);
				setCarryOverSubjects(defaultSelections);
				setCarryOverAssignmentsExpanded(defaultSelections.length > 0);
			}
		}
		setShowCarryOverModal(true);
	};

	const getAcademicYearOptions = () => {
		const years = new Set(buildSchoolAcademicYearRange(schoolProfile));
		if (schoolProfile?.identity.currentAcademicYear)
			years.add(schoolProfile.identity.currentAcademicYear);
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
			if (user?.isTeacher && carryOverSubjects.length > 0) {
				const classes = buildTeacherClassesPayloadFromSelections(
					carryOverSubjects,
					null,
				);
				if (classes.length > 0) {
					requestBody.classes = classes;
				}
			}
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
		showSponsorship = true,
	) => {
		return (
			<div className="space-y-4">
				<div className="space-y-3 max-h-[45vh] sm:max-h-64 overflow-y-auto pr-0.5">
					{getClassLevels(session).map((level) => {
						const style = getLevelStyle(level);
						const isSC = isLevelSelfContained(session, level);
						return (
							<div
								key={level}
								className={`rounded-lg border p-3 ${style.section}`}
							>
								<div className="mb-2">
									<span
										className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${style.badge}`}
									>
										{level}
									</span>
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{isSC
										? getClassesBySessionAndLevel(session, level).map((cls) => {
												const isChecked = subjects.some(
													(s) =>
														s.classId === cls.classId &&
														s.session === session &&
														s.level === level,
												);
												return (
													<motion.label
														key={cls.classId}
														whileTap={{ scale: 0.96 }}
														className={`relative flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer text-sm transition-all ${
															isChecked
																? 'border-primary bg-primary/10 shadow-sm'
																: 'border-border bg-background hover:border-primary/40'
														}`}
													>
														<input
															type="checkbox"
															checked={isChecked}
															onChange={(e) =>
																onSCChange(
																	cls.classId,
																	session,
																	level,
																	e.target.checked,
																)
															}
															className="absolute opacity-0 w-0 h-0"
														/>
														<ThemedCheckbox checked={isChecked} />
														<span className="text-foreground font-medium text-xs sm:text-sm truncate">
															{cls.name}
														</span>
													</motion.label>
												);
											})
										: getSubjectsBySessionAndLevel(session, level).map((subject, idx) => {
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
														className={`relative flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer text-xs transition-all ${
															isChecked
																? 'border-primary bg-primary/10 shadow-sm'
																: 'border-border bg-background hover:border-primary/40'
														}`}
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

				{showSponsorship && (
					<div>
						<label className="block text-sm font-medium text-foreground mb-1.5">
							Class Sponsorship
						</label>
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
					</div>
				)}
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
									<div className="mb-4">
										<p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">
											Session
										</p>
										<div className="flex gap-2 flex-wrap">
											{getSessions().map((s) => {
												const isSel = formData.session === s;
												return (
													<button
														key={s}
														type="button"
														onClick={() => handleStudentSessionChange(s)}
														className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all touch-manipulation ${isSel ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40 text-foreground'}`}
													>
														{isSel && (
															<CheckCircle2 className="inline w-3 h-3 mr-1" />
														)}
														{s}
													</button>
												);
											})}
										</div>
									</div>

									{formData.session && (
										<div className="space-y-3 max-h-[45vh] sm:max-h-64 overflow-y-auto pr-0.5 mb-4">
											{getClassLevels(formData.session).map((level) => {
												const style = getLevelStyle(level);
												return (
													<div
														key={level}
														className={`rounded-lg border p-3 ${style.section}`}
													>
														<div className="mb-2">
															<span
																className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${style.badge}`}
															>
																{level}
															</span>
														</div>
														<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
															{getClassesBySessionAndLevel(
																formData.session,
																level,
															).map((cls: any) => {
																const isSelected =
																	formData.classId === cls.classId;
																return (
																	<motion.label
																		key={cls.classId}
																		whileTap={{ scale: 0.96 }}
																		className={`relative flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer text-sm transition-all touch-manipulation ${isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-background hover:border-primary/40'}`}
																	>
																		<input
																			type="radio"
																			name="studentClass"
																			value={cls.classId}
																			checked={isSelected}
																			onChange={() =>
																				handleStudentClassChange(
																					cls.classId,
																				)
																			}
																			className="absolute opacity-0 w-0 h-0"
																		/>
																		<ThemedRadio
																			checked={isSelected}
																		/>
																		<span className="text-foreground font-medium text-xs sm:text-sm truncate">
																			{cls.name}
																		</span>
																	</motion.label>
																);
															})}
														</div>
													</div>
												);
											})}
										</div>
									)}

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

											<div className="mt-4">
												<label className="relative inline-flex items-center cursor-pointer">
													<input
														type="checkbox"
														name="canRecordAttendance"
														checked={!!formData.canRecordAttendance}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																canRecordAttendance: e.target.checked,
															}))
														}
														className="sr-only peer"
													/>
													<div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
													<span className="ml-3 text-sm font-medium text-foreground">
														{formData.canRecordAttendance
															? 'Can Record Attendance'
															: 'Cannot Record Attendance'}
													</span>
												</label>
											</div>
											<div className="mt-4">
												<label className="block text-sm font-medium text-foreground mb-2">
													Student Type
												</label>
												<select
													value={formData.studentType ?? 'old'}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															studentType: e.target.value as 'new' | 'old',
														}))
													}
													className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												>
													<option value="new">New Student</option>
													<option value="old">Old Student</option>
												</select>
											</div>
										</div>
									</div>
								</section>
								<section>
									<h5 className="font-semibold mb-3 text-lg border-b pb-2">
										Parent Account
									</h5>

									{currentParent && (
										<div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/40 mb-4">
											<div className="p-1.5 bg-primary/10 rounded-full shrink-0">
												<UserCheck className="h-4 w-4 text-primary" />
											</div>
											<div className="min-w-0">
												<p className="text-sm font-medium text-foreground truncate">
													{getParentDisplayName(currentParent)}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{currentParent.email ||
														currentParent.phone ||
														'Linked parent account'}
												</p>
											</div>
										</div>
									)}

									<div className="flex items-center gap-2 mb-4">
										{currentParent && (
											<button
												type="button"
												onClick={() => setParentAction('keep')}
												className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
													parentEditAction === 'keep'
														? 'bg-primary/15 text-primary'
														: 'bg-muted text-muted-foreground hover:bg-muted/70'
												}`}
											>
												<CheckCircle2 className="h-3.5 w-3.5" />
												Keep current
											</button>
										)}
										<button
											type="button"
											onClick={() => setParentAction('assign')}
											className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
												parentEditAction === 'assign'
													? 'bg-primary/15 text-primary'
													: 'bg-muted text-muted-foreground hover:bg-muted/70'
											}`}
										>
											<UserCheck className="h-3.5 w-3.5" />
											Search existing
										</button>
										<button
											type="button"
											onClick={() => setParentAction('create')}
											className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
												parentEditAction === 'create'
													? 'bg-primary/15 text-primary'
													: 'bg-muted text-muted-foreground hover:bg-muted/70'
											}`}
										>
											<UserPlus className="h-3.5 w-3.5" />
											Create new
										</button>
										{currentParent && (
											<button
												type="button"
												onClick={() => setParentAction('unlink')}
												className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
													parentEditAction === 'unlink'
														? 'bg-destructive/15 text-destructive'
														: 'bg-muted text-muted-foreground hover:bg-muted/70'
												}`}
											>
												<X className="h-3.5 w-3.5" />
												Remove
											</button>
										)}
									</div>

									{parentErrors.parent && (
										<p className="text-[11px] text-destructive mt-1 mb-2 flex items-center gap-1">
											<AlertTriangle className="w-3 h-3 shrink-0" />
											{parentErrors.parent}
										</p>
									)}

									{parentEditAction === 'unlink' && currentParent && (
										<div className="p-3 border border-destructive/30 bg-destructive/5 rounded-lg">
											<p className="text-sm text-foreground">
												This child will be removed from{' '}
												<strong>{getParentDisplayName(currentParent)}</strong>
												&apos;s account.
											</p>
										</div>
									)}

									{parentEditAction === 'assign' && (
										<>
											{!parentDraft.parentId ? (
												<>
													<div>
														<label className="block text-sm font-medium text-foreground mb-1">
															Search Parent
														</label>
														<div className="relative">
															<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
															<input
																type="text"
																value={parentDraft.searchTerm}
																onChange={(e: any) =>
																	onParentSearchChange(e.target.value)
																}
																className={`w-full p-2 pl-10 border rounded-lg bg-background shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-primary/40 text-foreground ${
																	parentErrors.parent
																		? 'border-destructive'
																		: 'border-border/70'
																}`}
																placeholder="Search by name, phone, or email..."
																autoComplete="off"
															/>
														</div>
													</div>
													{parentSearching && (
														<div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
															<Loader2 className="h-3.5 w-3.5 animate-spin" />
															Searching...
														</div>
													)}
													{!parentSearching &&
														parentSearchDone &&
														parentSearchResults.length === 0 && (
															<p className="text-xs text-muted-foreground mt-2">
																No matching parents found.{' '}
																<button
																	type="button"
																	className="text-primary underline underline-offset-2"
																	onClick={() => setParentAction('create')}
																>
																	Create a new parent instead
																</button>
															</p>
														)}
													{parentSearchResults.length > 0 && (
														<ul className="mt-2 divide-y divide-border border border-border rounded-lg">
															{parentSearchResults.map((parent: any) => (
																<li key={parent.id || parent._id}>
																	<button
																		type="button"
																		className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
																		onClick={() => selectParent(parent)}
																	>
																		<div className="p-1.5 bg-primary/10 rounded-full">
																			<User className="h-4 w-4 text-primary" />
																		</div>
																		<div className="flex-1 min-w-0">
																			<p className="text-sm font-medium text-foreground truncate">
																				{getParentDisplayName(parent)}
																			</p>
																			<p className="text-xs text-muted-foreground truncate">
																				{parent.email || parent.phone || 'No contact'}{' '}
																				•{' '}
																				{(parent.studentIds?.length || 0) +
																					' child' +
																					(parent.studentIds?.length === 1
																						? ''
																						: 'ren')}
																			</p>
																		</div>
																		<UserCheck className="h-4 w-4 text-primary shrink-0 mt-1" />
																	</button>
																</li>
															))}
														</ul>
													)}
												</>
											) : (
												<div className="flex items-center justify-between gap-3 p-3 border border-primary/30 bg-primary/5 rounded-lg">
													<div className="flex items-center gap-3 min-w-0">
														<div className="p-1.5 bg-primary/15 rounded-full shrink-0">
															<UserCheck className="h-4 w-4 text-primary" />
														</div>
														<div className="min-w-0">
															<p className="text-sm font-medium text-foreground truncate">
																{parentDraft.parentLabel || 'Selected parent'}
															</p>
															<p className="text-xs text-muted-foreground">
																This child will be linked to their account.
															</p>
														</div>
													</div>
													<button
														type="button"
														onClick={() =>
															setParentDraft((prev: any) => ({
																...prev,
																parentId: '',
																parentLabel: '',
															}))
														}
														className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground shrink-0"
													>
														Change
													</button>
												</div>
											)}
										</>
									)}

									{parentEditAction === 'create' && (
										<>
											<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
												<InputField
													label="Parent First Name"
													name="firstName"
													value={parentDraft.firstName}
													onChange={handleParentDraftChange}
													placeholder="First name"
												/>
												<InputField
													label="Parent Middle Name"
													name="middleName"
													value={parentDraft.middleName}
													onChange={handleParentDraftChange}
													placeholder="Optional"
												/>
												<InputField
													label="Parent Last Name"
													name="lastName"
													value={parentDraft.lastName}
													onChange={handleParentDraftChange}
													placeholder="Last name"
												/>
											</div>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
												<InputField
													label="Parent Phone"
													name="phone"
													value={parentDraft.phone}
													onChange={handleParentDraftChange}
													placeholder="+231 555 0000"
													required
												/>
												<InputField
													label="Parent Email"
													name="email"
													type="email"
													value={parentDraft.email}
													onChange={handleParentDraftChange}
													placeholder="Optional"
												/>
											</div>
											<div className="mt-4">
												<InputField
													label="Parent Address"
													name="address"
													value={parentDraft.address}
													onChange={handleParentDraftChange}
													placeholder="Optional"
												/>
											</div>
											{parentErrors.parentContact && (
												<p className="text-[11px] text-destructive mt-2 flex items-center gap-1">
													<AlertTriangle className="w-3 h-3 shrink-0" />
													{parentErrors.parentContact}
												</p>
											)}
											{parentErrors.parentEmail && (
												<p className="text-[11px] text-destructive mt-2 flex items-center gap-1">
													<AlertTriangle className="w-3 h-3 shrink-0" />
													{parentErrors.parentEmail}
												</p>
											)}
											<p className="text-xs text-muted-foreground mt-3">
												A parent account will be created with the phone
												number as their login username and a temporary password
												to change on first sign-in.
											</p>
										</>
									)}
								</section>
							</>
						)}

						{user?.role === 'parent' && (
							<>
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Linked Children
								</h5>
								{Array.isArray(formData?.studentIds) &&
								formData.studentIds.length > 0 ? (
									<div className="space-y-2 mb-4">
										{formData.studentIds.map((sid: string) => (
											<div
												key={sid}
												className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg bg-muted/40"
											>
												<div className="min-w-0">
													<p className="text-sm font-medium text-foreground truncate">
														{getChildDisplayName(sid)}
													</p>
													{getChildClassName(sid) && (
														<p className="text-xs text-muted-foreground truncate">
															Class: {getChildClassName(sid)}
														</p>
													)}
													<p className="text-xs text-muted-foreground truncate">
														Username: {sid}
													</p>
												</div>
												<button
													type="button"
													onClick={() => removeChild(sid)}
													className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors shrink-0"
												>
													<X className="h-3.5 w-3.5" />
													Remove
												</button>
											</div>
										))}
									</div>
								) : (
									<p className="text-sm text-muted-foreground mb-4">
										No children linked to this account yet.
									</p>
								)}

								<div>
									<label className="block text-sm font-medium text-foreground mb-1">
										Add a Child
									</label>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<input
											type="text"
											value={childSearchTerm}
											onChange={(e) => onChildSearchChange(e.target.value)}
											className="w-full p-2 pl-10 border rounded-lg bg-background shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-primary/40 text-foreground border-border/70"
											placeholder="Search students by name or username..."
											autoComplete="off"
										/>
									</div>
									{childSearching && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
											Searching...
										</div>
									)}
									{!childSearching && childSearchDone && childSearchResults.length === 0 && (
										<p className="text-xs text-muted-foreground mt-2">
											No matching students found.
										</p>
									)}
									{childSearchResults.length > 0 && (
										<ul className="mt-2 divide-y divide-border border border-border rounded-lg">
											{childSearchResults.map((student: any) => {
												const sid = student.studentId || student.username;
												const isLinked =
													Array.isArray(formData?.studentIds) &&
													formData.studentIds.includes(sid);
												return (
													<li key={student.id || student._id}>
														<button
															type="button"
															disabled={isLinked}
															className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
																isLinked
																	? 'opacity-50 cursor-not-allowed'
																	: 'hover:bg-muted/50'
															}`}
															onClick={() => addChild(student)}
														>
															<div className="p-1.5 bg-primary/10 rounded-full">
																<User className="h-4 w-4 text-primary" />
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-sm font-medium text-foreground truncate">
																	{student.fullName ||
																		[
																			student.firstName,
																			student.middleName,
																			student.lastName,
																		]
																			.filter(Boolean)
																			.join(' ')}
																</p>
																<p className="text-xs text-muted-foreground truncate">
																	Class:{' '}
																	{student.className ||
																		getClassNameFromId(student.classId) ||
																		'N/A'}{' '}
																	• {sid}
																</p>
															</div>
															{isLinked ? (
																<CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-1" />
															) : (
																<UserPlus className="h-4 w-4 text-primary shrink-0 mt-1" />
															)}
														</button>
													</li>
												);
											})}
										</ul>
									)}
								</div>
								<p className="text-xs text-muted-foreground mt-3">
									Removing a child unlinks their account from this parent. The
									student can be re-linked later.
								</p>
							</section>
							</>
						)}

						{user.role === 'administrator' && (
							<>
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
							<section>
								<h5 className="font-semibold mb-4 text-lg border-b pb-2">
									Teacher Role
								</h5>
								<div className="space-y-3">
									<p className="text-xs text-muted-foreground">
										Enable teaching capabilities for this administrator. They will inherit teacher-level feature access and can be assigned classes and subjects.
									</p>
									<label className="flex items-center gap-3 cursor-pointer">
										<input
											type="checkbox"
											checked={formData.isTeacher || false}
											onChange={(e) => {
												const checked = e.target.checked;
												setFormData((prev) => ({
													...prev,
													isTeacher: checked,
													adminClasses: checked ? prev.adminClasses || [] : [],
												}));
											}}
											className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										<div>
											<p className="text-sm font-medium text-foreground">Enable Teacher Role</p>
											<p className="text-xs text-muted-foreground">Grant class and subject assignments</p>
										</div>
									</label>
								</div>
							</section>
							{formData.isTeacher && (
								<section>
									<h5 className="font-semibold mb-4 text-lg border-b pb-2">
										Teaching Assignments
									</h5>

									<div className="mb-4">
										<p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">
											Session
										</p>
										<div className="flex gap-2 flex-wrap">
											{getSessions().map((s) => {
												const isSel =
													adminActiveSession === s ||
													(!adminActiveSession && getSessions()[0] === s);
												return (
													<button
														key={s}
														type="button"
														onClick={() => setAdminActiveSession(s)}
														className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all touch-manipulation ${isSel ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40 text-foreground'}`}
													>
														{isSel && (
															<CheckCircle2 className="inline w-3 h-3 mr-1" />
														)}
														{s}
													</button>
												);
											})}
										</div>
									</div>

									{(adminActiveSession || getSessions()[0]) &&
										renderTeacherSessionPanel(
											adminActiveSession || getSessions()[0],
											formData.adminClasses || [],
											null,
											handleAdminSelfContainedSelection,
											handleAdminSubjectChange,
											() => {},
											false,
										)}
								</section>
							)}
							<section>
								<h5 className="font-semibold mb-3 text-lg border-b pb-2">
									Feature Permissions
								</h5>
								<div className="space-y-3">
									<p className="text-xs text-muted-foreground">
										Select which features this administrator can access.
									</p>
									<div className="flex flex-wrap gap-2">
										{availablePermissions.map((feature) => {
											const perms = formData.permissions || [];
											const isSelected = perms.includes(feature);
											return (
												<button
													key={feature}
													type="button"
													onClick={() => {
														const newPerms = isSelected
															? perms.filter((p) => p !== feature)
															: [...perms, feature];
														setFormData({ ...formData, permissions: newPerms });
													}}
													className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
														isSelected
															? 'bg-primary text-primary-foreground'
															: 'bg-muted text-muted-foreground hover:bg-muted/80'
													}`}
												>
													{feature.replace(/_/g, ' ')}
												</button>
											);
										})}
									</div>
								</div>
							</section>
							<section>
								<h5 className="font-semibold mb-4 text-lg border-b pb-2">
									Attendance Permissions
								</h5>
								<div className="space-y-3">
									<p className="text-xs text-muted-foreground">
										Grant this administrator permission to record attendance.
									</p>
									<label className="flex items-center gap-3 cursor-pointer">
										<input
											type="checkbox"
											checked={formData.canRecordStudentAttendance || false}
											onChange={(e) =>
												handleInputChange({
													target: { name: 'canRecordStudentAttendance', value: e.target.checked },
												})
											}
											className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										<div>
											<p className="text-sm font-medium text-foreground">Record Student Attendance</p>
											<p className="text-xs text-muted-foreground">Allow recording class attendance for students</p>
										</div>
									</label>
									<label className="flex items-center gap-3 cursor-pointer">
										<input
											type="checkbox"
											checked={formData.canRecordTeacherAttendance || false}
											onChange={(e) =>
												handleInputChange({
													target: { name: 'canRecordTeacherAttendance', value: e.target.checked },
												})
											}
											className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										<div>
											<p className="text-sm font-medium text-foreground">Record Teacher Attendance</p>
											<p className="text-xs text-muted-foreground">Allow recording attendance for teachers</p>
										</div>
									</label>
								</div>
							</section>
							</>
						)}

						{user.role === 'teacher' && schoolProfile && (
							<section>
								<h5 className="font-semibold mb-4 text-lg border-b pb-2">
									Teaching Assignments
								</h5>

								<div className="mb-4">
									<p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">
										Session
									</p>
									<div className="flex gap-2 flex-wrap">
										{getSessions().map((s) => {
											const isSel =
												activeTeacherSession === s ||
												(!activeTeacherSession && getSessions()[0] === s);
											return (
												<button
													key={s}
													type="button"
													onClick={() => setActiveTeacherSession(s)}
													className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all touch-manipulation ${isSel ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40 text-foreground'}`}
												>
													{isSel && (
														<CheckCircle2 className="inline w-3 h-3 mr-1" />
													)}
													{s}
												</button>
											);
										})}
									</div>
								</div>

								{(activeTeacherSession || getSessions()[0]) &&
									renderTeacherSessionPanel(
										activeTeacherSession || getSessions()[0],
										formData.subjects || [],
										formData.sponsorClass,
										handleSelfContainedSelection,
										handleSubjectChange,
										handleSponsorClassChange,
									)}
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
						<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
						<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
						<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
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

											<div>
												<p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">
													Session
												</p>
												<div className="flex gap-2 flex-wrap">
													{getSessions().map((s) => {
														const isSel =
															carryOverActiveSession === s ||
															(!carryOverActiveSession && getSessions()[0] === s);
														return (
															<button
																key={s}
																type="button"
																onClick={() => setCarryOverActiveSession(s)}
																className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all touch-manipulation ${isSel ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40 text-foreground'}`}
															>
																{isSel && (
																	<CheckCircle2 className="inline w-3 h-3 mr-1" />
																)}
																{s}
															</button>
														);
													})}
												</div>
											</div>

											{(carryOverActiveSession || getSessions()[0]) &&
												renderTeacherSessionPanel(
													carryOverActiveSession || getSessions()[0],
													carryOverSubjects,
													carryOverSponsorClass,
													handleCarryOverSelfContainedSelection,
													handleCarryOverSubjectChange,
													handleCarryOverSponsorClassChange,
												)}
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
