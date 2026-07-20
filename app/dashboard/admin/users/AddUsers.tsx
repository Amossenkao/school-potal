'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import ConflictModal from '@/components/modals/ConflictModal';
import { AnimatePresence, motion } from 'framer-motion';
import {
	buildSchoolAcademicYearRange,
	getCurrentAcademicYearLabel,
} from '@/utils/academicYearOptions';
import {
	ChevronLeft,
	ChevronRight,
	User,
	Users,
	Shield,
	ArrowLeft,
	CheckCircle,
	Copy,
	XCircle,
	Loader2,
	CheckCircle2,
	BookOpen,
	GraduationCap,
	UserCog,
	ClipboardList,
	MapPin,
	Phone,
	Mail,
	Calendar,
	Hash,
	FileText,
	Home,
	Briefcase,
	ChevronDown,
} from 'lucide-react';
import { fail } from 'assert';

// Helper function to build full name

const getFullName = (
	firstName: string,
	middleName?: string,
	lastName?: string,
) => {
	const capitalizeWord = (word: string) =>
		word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

	const normalizeFirstOrLast = (value: string = '') => {
		return value
			.trim()
			.replace(/\s+/g, ' ')
			.split(' ')
			.filter(Boolean)
			.map(capitalizeWord)
			.join(' ');
	};

	const normalizeMiddleName = (value?: string) => {
		if (!value) return undefined;

		return value
			.trim()
			.replace(/\s+/g, ' ')
			.split(' ')
			.filter(Boolean)
			.map((part) => {
				const clean = part.replace(/\./g, '');
				if (clean.length === 1) {
					return clean.toUpperCase() + '.';
				}

				// normal word
				return capitalizeWord(clean);
			})
			.join(' ');
	};

	const first = normalizeFirstOrLast(firstName);
	const middle = normalizeMiddleName(middleName);
	const last = normalizeFirstOrLast(lastName);

	return [first, middle, last]
		.filter(Boolean)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
};

/* ─────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────── */

const inputBase =
	'w-full px-3 py-2.5 rounded-lg border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors';
const inputError = 'border-destructive focus:ring-destructive/30';
const inputNormal = 'border-input';

const FieldIcon = ({ icon: Icon }: { icon: any }) => (
	<Icon className="w-3 h-3 text-muted-foreground/50 shrink-0" />
);

const Field = ({
	label,
	required,
	error,
	icon,
	children,
}: {
	label: string;
	required?: boolean;
	error?: string;
	icon?: any;
	children: React.ReactNode;
}) => (
	<div className="flex flex-col gap-1.5">
		<label className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
			{icon && <FieldIcon icon={icon} />}
			{label}
			{required && <span className="text-destructive ml-0.5">*</span>}
		</label>
		{children}
		{error && (
			<motion.p
				initial={{ opacity: 0, y: -3 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-[11px] text-destructive flex items-center gap-1"
			>
				<XCircle className="w-3 h-3 shrink-0" />
				{error}
			</motion.p>
		)}
	</div>
);

/* Themed radio dot */
const ThemedRadio = ({ checked }: { checked: boolean }) => (
	<div
		className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
			checked ? 'border-primary' : 'border-border'
		}`}
	>
		{checked && <div className="w-2 h-2 rounded-full bg-primary" />}
	</div>
);

/* Themed checkbox */
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

/* Themed switch */
const ThemedSwitch = ({
	checked,
	onChange,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
}) => (
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		onClick={() => onChange(!checked)}
		className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 ${
			checked ? 'bg-primary' : 'bg-muted'
		}`}
	>
		<span
			className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
				checked ? 'translate-x-6' : 'translate-x-1'
			}`}
		/>
	</button>
);

/* Level badge — theme tokens only */
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

/* Section card */
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

/* Review row */
const ReviewRow = ({
	label,
	value,
	capitalize,
}: {
	label: string;
	value: string;
	capitalize?: boolean;
}) => (
	<div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
		<span className="text-muted-foreground text-xs font-medium shrink-0 pt-0.5">
			{label}
		</span>
		<span
			className={`text-foreground font-semibold text-right text-sm leading-snug ${capitalize ? 'capitalize' : ''}`}
		>
			{value || '—'}
		</span>
	</div>
);

/* ─────────────────────────────────────────────
   MOBILE NAV TAB STRIP  (replaces sidebar on xs/sm)
   Shows as a horizontal scrollable pill row
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   DESKTOP SIDEBAR ITEM
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   TEACHER SESSION PANEL
───────────────────────────────────────────── */
const TeacherSessionPanel = ({
	session,
	formData,
	setFormData,
	isSCClassChecked,
	handleSelfContainedSelection,
	handleSubjectChange,
	getSelfContainedClasses,
	getClassLevels,
	isLevelSelfContained,
	getSubjectsBySessionAndLevel,
	getAllClassesForSession,
	getLevelStyle: getLvlStyle,
	uniqueSubjectNames,
	totalTeacherClasses,
	showSummaryInline,
}: any) => {
	const scClasses = getSelfContainedClasses(session);
	const regularLevels = getClassLevels(session).filter(
		(l: string) => !isLevelSelfContained(session, l),
	);

	return (
		<div className="space-y-4">
			{/* Inline summary strip — single session only */}
			{showSummaryInline && formData.teacher.subjects.length > 0 && (
				<div className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs">
					<span className="text-muted-foreground">
						Unique subjects:{' '}
						<span className="font-bold text-foreground ml-1">
							{uniqueSubjectNames}
						</span>
					</span>
					<span className="text-muted-foreground">
						Classes:{' '}
						<span className="font-bold text-foreground ml-1">
							{totalTeacherClasses}
						</span>
					</span>
					{formData.teacher.isSponsor && formData.teacher.sponsorClass && (
						<span className="text-muted-foreground">
							Sponsor Class:{' '}
							<span className="font-bold text-primary ml-1">
								{getAllClassesForSession(session).find(
									(c: any) => c.classId === formData.teacher.sponsorClass,
								)?.name ?? '—'}
							</span>
						</span>
					)}
				</div>
			)}

			{/* Self-contained classes */}
			{scClasses.length > 0 && (
				<SectionCard
					title="Self-Contained Classes"
					subtitle="Each class covers all its configured subjects. Pick any combination independently."
					icon={CheckCircle2}
				>
					<div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
						{scClasses.map((cls: any) => {
							const isChecked = isSCClassChecked(
								cls.classId,
								session,
								cls.level,
							);
							return (
								<motion.label
									key={cls.classId}
									whileTap={{ scale: 0.97 }}
									className={`relative flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-all active:scale-95 touch-manipulation ${
										isChecked
											? 'border-primary bg-primary/10 shadow-sm'
											: 'border-border hover:border-primary/40 bg-background'
									}`}
								>
									<input
										type="checkbox"
										checked={isChecked}
										onChange={(e) =>
											handleSelfContainedSelection(
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

			{/* Regular subjects by level */}
			{regularLevels.length > 0 && (
				<SectionCard
					title="Subjects by Level"
					subtitle="Check subjects this teacher will deliver across all classes in that level."
					icon={BookOpen}
				>
					<div className="space-y-3 max-h-[50vh] sm:max-h-64 overflow-y-auto pr-0.5">
						{regularLevels.map((level: string) => {
							const style = getLvlStyle(level);
							const subjects = getSubjectsBySessionAndLevel(session, level);
							const checkedCount = subjects.filter((sub: string) =>
								formData.teacher.subjects.some(
									(s: any) =>
										s.subject === sub &&
										s.level === level &&
										s.session === session &&
										!s.classId,
								),
							).length;
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
										{checkedCount > 0 && (
											<span className="text-xs text-muted-foreground">
												{checkedCount}/{subjects.length} selected
											</span>
										)}
									</div>
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
										{subjects.map((subject: string, idx: number) => {
											const isChecked = formData.teacher.subjects.some(
												(s: any) =>
													s.subject === subject &&
													s.level === level &&
													s.session === session &&
													!s.classId,
											);
											return (
												<motion.label
													key={`${subject}-${idx}`}
													whileTap={{ scale: 0.96 }}
													className={`relative flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer text-xs transition-all touch-manipulation ${
														isChecked
															? 'border-primary bg-primary/10 shadow-sm'
															: 'border-border bg-background hover:border-primary/40'
													}`}
												>
													<input
														type="checkbox"
														checked={isChecked}
														onChange={(e) =>
															handleSubjectChange(
																subject,
																level,
																session,
																e.target.checked,
															)
														}
														className="absolute opacity-0 w-0 h-0"
													/>
													<ThemedCheckbox checked={isChecked} />
													<span className="text-foreground leading-snug">
														{subject}
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

			{/* Class sponsorship */}
			<SectionCard
				title="Class Sponsorship"
				subtitle="Assign this teacher as homeroom sponsor for one class (optional)."
				icon={Users}
			>
				<select
					value={
						formData.teacher.sponsorClass &&
						getAllClassesForSession(session).find(
							(c: any) => c.classId === formData.teacher.sponsorClass,
						)
							? formData.teacher.sponsorClass
							: ''
					}
					onChange={(e) => {
						const hasSC = formData.teacher.subjects.some(
							(s: any) => s.session === session && s.classId,
						);
						if (hasSC) {
							const otherSubjects = formData.teacher.subjects.filter(
								(s: any) => s.session !== session,
							);
							setFormData({
								...formData,
								teacher: {
									...formData.teacher,
									subjects: otherSubjects,
									sponsorClass: e.target.value || null,
									isSponsor: !!e.target.value,
								},
							});
						} else {
							setFormData({
								...formData,
								teacher: {
									...formData.teacher,
									sponsorClass: e.target.value || null,
									isSponsor: !!e.target.value,
								},
							});
						}
					}}
					className={`${inputBase} ${inputNormal}`}
				>
					<option value="">No class sponsorship</option>
					{getAllClassesForSession(session)
						.filter((cls: any) => !isLevelSelfContained(session, cls.level))
						.map((cls: any) => (
							<option key={cls.classId} value={cls.classId}>
								{cls.name} ({cls.level})
							</option>
						))}
				</select>
			</SectionCard>
		</div>
	);
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
const DashboardUserForm = ({ onUserCreated, onBack }: any) => {
	const [currentStep, setCurrentStep] = useState(1);
	const [userType, setUserType] = useState('');
	const [errors, setErrors] = useState<any>({});
	const [isValidating, setIsValidating] = useState(false);
	const [createdUserInfo, setCreatedUserInfo] = useState<any>(null);
	const [showErrorModal, setShowErrorModal] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [conflictState, setConflictState] = useState(null);
	const [showConflictModal, setShowConflictModal] = useState(false);
	const [pendingUserData, setPendingUserData] = useState(null);
	const [activePanel, setActivePanel] = useState<string>('');

	const school = useSchoolStore((state) => state.school);
	const defaultEnrollmentSemester = '1st Semester';
	const currentAcademicYear = String(
		school?.currentAcademicYear || getCurrentAcademicYearLabel(),
	).trim();

	const enrollmentYearOptions = useMemo(() => {
		const years = buildSchoolAcademicYearRange(school || undefined);
		return years.length > 0
			? years
			: currentAcademicYear
				? [currentAcademicYear]
				: [];
	}, [school, currentAcademicYear]);

	const defaultEnrollmentYear = useMemo(() => {
		if (enrollmentYearOptions.includes(currentAcademicYear))
			return currentAcademicYear;
		return enrollmentYearOptions[0] || currentAcademicYear || '';
	}, [enrollmentYearOptions, currentAcademicYear]);

	const [formData, setFormData] = useState({
		firstName: '',
		middleName: '',
		lastName: '',
		gender: '',
		nickName: '',
		dateOfBirth: '',
		phone: '',
		email: '',
		address: '',
		bio: '',
		avatar: '',
		student: {
			session: '',
			classId: '',
			enrollmentYear: defaultEnrollmentYear,
			enrollmentSemester: defaultEnrollmentSemester,
			isNewStudent: true,
			guardian: {
				firstName: '',
				middleName: '',
				lastName: '',
				email: '',
				phone: '',
				address: '',
			},
		},
		teacher: {
			subjects: [] as Array<{
				subject: string;
				level: string;
				session: string;
				classId?: string;
			}>,
			isSponsor: false,
			sponsorClass: null as string | null,
		},
		administrator: { position: '' },
	});

	useEffect(() => {
		if (!defaultEnrollmentYear) return;
		setFormData((prev) => {
			const selectedYear = String(prev.student.enrollmentYear || '').trim();
			const isValid = enrollmentYearOptions.includes(selectedYear);
			const nextYear = isValid ? selectedYear : defaultEnrollmentYear;
			const nextSem =
				String(prev.student.enrollmentSemester || '').trim() ||
				defaultEnrollmentSemester;
			if (
				nextYear === prev.student.enrollmentYear &&
				nextSem === prev.student.enrollmentSemester
			)
				return prev;
			return {
				...prev,
				student: {
					...prev.student,
					enrollmentYear: nextYear,
					enrollmentSemester: nextSem,
				},
			};
		});
	}, [defaultEnrollmentYear, enrollmentYearOptions, defaultEnrollmentSemester]);

	/* ── School data helpers ── */
	const getSessions = () =>
		school?.classLevels ? Object.keys(school.classLevels) : [];
	const hasMultipleSessions = getSessions().length > 1;

	const getClassLevels = (session: string) =>
		school?.classLevels?.[session]
			? Object.keys(school.classLevels[session])
			: [];

	const isLevelSelfContained = (session: string, level: string) =>
		!!school?.classLevels?.[session]?.[level]?.isSelfContained;

	const getClassesBySessionAndLevel = (session: string, level: string) =>
		school?.classLevels?.[session]?.[level]?.classes ?? [];

	const getAllClassesForSession = (session: string) => {
		if (!school?.classLevels?.[session]) return [];
		const all: any[] = [];
		Object.keys(school.classLevels[session]).forEach((level) => {
			(school.classLevels[session][level].classes ?? []).forEach((cls: any) => {
				all.push({ ...cls, level, session });
			});
		});
		return all;
	};

	const getSubjectsBySessionAndLevel = (
		session: string,
		level: string,
	): string[] =>
		(school?.classLevels?.[session]?.[level]?.subjects ?? []).map(
			(s: any) => s.name,
		);

	const getSelfContainedClasses = (session: string) => {
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

	/* ── Admin positions ── */
	const adminPositions = useMemo(() => {
		const fromProfile = Array.isArray(school?.administrativePositions)
			? school.administrativePositions
					.map((item: any) => ({
						key: String(item?.id || '').trim(),
						name: String(item?.name || '').trim(),
					}))
					.filter((item: any) => item.key && item.name)
			: [];
		if (fromProfile.length > 0) return fromProfile;
		return (
			school?.roleFeatureAccess?.administrator
				? Object.keys(school.roleFeatureAccess.administrator)
				: []
		).map((key: string) => ({
			key,
			name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
		}));
	}, [school]);

	const selectedAdminPosition = useMemo(
		() =>
			adminPositions.find(
				(item: any) => item.key === formData.administrator.position,
			) || null,
		[adminPositions, formData.administrator.position],
	);

	const existingUsers = [
		{ email: 'john@school.edu' },
		{ email: 'jane@school.edu' },
	];

	/* ── Teacher: per-class SC toggle ── */
	const handleSelfContainedSelection = (
		classId: string,
		session: string,
		level: string,
		checked: boolean,
	) => {
		const withoutThis = formData.teacher.subjects.filter(
			(s) =>
				!(s.classId === classId && s.session === session && s.level === level),
		);
		let updatedSubjects = withoutThis;
		let updatedSponsor = formData.teacher.sponsorClass;
		let updatedIsSponsor = formData.teacher.isSponsor;

		if (checked) {
			const newSubjects = getSubjectsBySessionAndLevel(session, level).map(
				(name) => ({
					subject: name,
					level,
					session,
					classId,
				}),
			);
			updatedSubjects = [...withoutThis, ...newSubjects];
			if (!updatedSponsor) {
				updatedSponsor = classId;
				updatedIsSponsor = true;
			}
		} else {
			if (formData.teacher.sponsorClass === classId) {
				updatedSponsor = null;
				updatedIsSponsor = false;
			}
		}
		setFormData({
			...formData,
			teacher: {
				...formData.teacher,
				subjects: updatedSubjects,
				isSponsor: updatedIsSponsor,
				sponsorClass: updatedSponsor,
			},
		});
	};

	const isSCClassChecked = (classId: string, session: string, level: string) =>
		formData.teacher.subjects.some(
			(s) =>
				s.classId === classId && s.session === session && s.level === level,
		);

	/* ── Teacher: regular subject toggle ── */
	const handleSubjectChange = (
		subject: string,
		level: string,
		session: string,
		checked: boolean,
	) => {
		let updatedSubjects = [...formData.teacher.subjects];
		const hasSCInSession = updatedSubjects.some(
			(s) =>
				s.session === session &&
				isLevelSelfContained(session, s.level) &&
				s.classId,
		);
		if (hasSCInSession) {
			updatedSubjects = updatedSubjects.filter(
				(s) =>
					!(
						s.session === session &&
						isLevelSelfContained(session, s.level) &&
						s.classId
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
		setFormData({
			...formData,
			teacher: {
				...formData.teacher,
				subjects: updatedSubjects,
				sponsorClass: hasSCInSession ? null : formData.teacher.sponsorClass,
				isSponsor: hasSCInSession ? false : formData.teacher.isSponsor,
			},
		});
	};

	/* ── Teacher summary stats ── */
	const uniqueSubjectNames = useMemo(
		() => new Set(formData.teacher.subjects.map((s) => s.subject)).size,
		[formData.teacher.subjects],
	);

	const totalTeacherClasses = useMemo(() => {
		const ids = new Set<string>();
		formData.teacher.subjects
			.filter((s) => s.classId)
			.forEach((s) => s.classId && ids.add(s.classId));
		formData.teacher.subjects
			.filter((s) => !s.classId)
			.forEach((s) =>
				getClassesBySessionAndLevel(s.session, s.level).forEach((cls: any) =>
					ids.add(cls.classId),
				),
			);
		return ids.size;
	}, [formData.teacher.subjects]);

	const sessionSubjectCount = (session: string) =>
		formData.teacher.subjects.filter((s) => s.session === session).length;

	/* ── Build API payload ── */
	const buildTeacherSubjectsPayload = () => {
		const classMap = new Map<string, Set<string>>();
		formData.teacher.subjects
			.filter((s) => s.classId)
			.forEach((s) => {
				if (!classMap.has(s.classId!)) classMap.set(s.classId!, new Set());
				classMap.get(s.classId!)!.add(s.subject);
			});
		formData.teacher.subjects
			.filter((s) => !s.classId)
			.forEach((s) => {
				getClassesBySessionAndLevel(s.session, s.level).forEach((cls: any) => {
					if (!classMap.has(cls.classId)) classMap.set(cls.classId, new Set());
					classMap.get(cls.classId)!.add(s.subject);
				});
			});
		const classes = Array.from(classMap.entries()).map(
			([classId, subjectsSet]) => ({
				classId,
				subjects: Array.from(subjectsSet),
			}),
		);
		return classes.length > 0 ? [{ year: currentAcademicYear, classes }] : [];
	};

	/* ── Student handlers ── */
	const handleStudentSessionSelection = (session: string) => {
		setFormData((prev) => ({
			...prev,
			student: { ...prev.student, session, classId: '' },
		}));
		setActivePanel('class');
	};

	const handleStudentClassSelection = (classId: string, session: string) => {
		setFormData((prev) => ({
			...prev,
			student: { ...prev.student, classId, session },
		}));
	};

	/* ── Validation ── */
	const validateStep = async (step: number) => {
		setIsValidating(true);
		const e: any = {};
		if (step === 2) {
			if (!formData.firstName.trim()) e.firstName = 'First name is required';
			if (!formData.lastName.trim()) e.lastName = 'Last name is required';
			if (!formData.gender) e.gender = 'Gender is required';
			if (!formData.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
			if (!formData.phone.trim()) e.phone = 'Phone number is required';
			if (!formData.address.trim()) e.address = 'Address is required';
			if (formData.email && !/\S+@\S+\.\S+/.test(formData.email))
				e.email = 'Invalid email format';
			if (
				formData.email &&
				existingUsers.find((u) => u.email === formData.email)
			)
				e.email = 'Email already registered';
		}
		if (step === 3) {
			if (userType === 'student') {
				if (!formData.student.guardian.firstName.trim())
					e.guardianFirstName = 'First name required';
				if (!formData.student.guardian.lastName.trim())
					e.guardianLastName = 'Last name required';
				if (!formData.student.guardian.phone.trim())
					e.guardianPhone = 'Phone required';
				if (!formData.student.guardian.address.trim())
					e.guardianAddress = 'Address required';
			} else if (userType === 'teacher') {
				if (formData.teacher.subjects.length === 0)
					e.subjects = 'At least one subject must be selected';
				else if (buildTeacherSubjectsPayload().length === 0)
					e.subjects = 'Selected subjects did not map to any classes.';
			} else if (userType === 'administrator') {
				if (!formData.administrator.position)
					e.position = 'Position is required';
			}
		}
		if (step === 4 && userType === 'student') {
			if (!formData.student.session) e.session = 'Session is required';
			else if (!formData.student.classId)
				e.classId = 'Class selection required';
			if (!formData.student.enrollmentYear)
				e.enrollmentYear = 'Enrollment year required';
			if (!formData.student.enrollmentSemester)
				e.enrollmentSemester = 'Enrollment semester required';
		}
		setErrors(e);
		setIsValidating(false);
		return Object.keys(e).length === 0;
	};

	const handleNext = async () => {
		if (currentStep === getTotalSteps()) {
			await handleSubmit();
		} else if (await validateStep(currentStep)) {
			if (currentStep === 1) setActivePanel('');
			if (currentStep === 3 && userType === 'student') {
				const sessions = getSessions();
				setActivePanel(
					sessions.length > 1 ? '' : sessions.length === 1 ? 'class' : '',
				);
			}
			setCurrentStep((s) => s + 1);
		} else {
			setErrorMessage('Please fix the errors before continuing.');
			setShowErrorModal(true);
		}
	};

	const handlePrevious = () => setCurrentStep((s) => s - 1);

	/* ── API ── */
	const proceedWithUserCreation = async (userData: any, force = false) => {
		setIsValidating(true);
		const body = force
			? { ...userData, confirmReassignments: true }
			: { ...userData };
		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const result = await res.json();
			if (res.ok && result.success) {
				setCreatedUserInfo(result.data.user);
				if (onUserCreated) onUserCreated(result.data.user);
				setCurrentStep(getTotalSteps() + 1);
			} else if (res.status === 409 && result.requiresConfirmation) {
				setConflictState(result);
				setPendingUserData(userData);
				setShowConflictModal(true);
			} else {
				setErrorMessage(result.message || 'Failed to create user');
				setShowErrorModal(true);
			}
		} catch {
			setErrorMessage('Network error — please try again');
			setShowErrorModal(true);
		} finally {
			setIsValidating(false);
		}
	};

	const handleConfirmReassignment = async () => {
		if (pendingUserData) await proceedWithUserCreation(pendingUserData, true);
		setShowConflictModal(false);
	};

	const handleSubmit = async () => {
		const { firstName, middleName, lastName } = formData;
		const fullName = getFullName(firstName, middleName, lastName);
		const base = {
			role: userType,
			firstName,
			middleName,
			lastName,
			fullName,
			gender: formData.gender,
			nickName: formData.nickName || undefined,
			dateOfBirth: formData.dateOfBirth,
			isActive: true,
			mustChangePassword: true,
			phone: formData.phone,
			email: formData.email || undefined,
			address: formData.address,
			bio: formData.bio || undefined,
			avatar: formData.avatar || undefined,
		};
		let userData: any;
		if (userType === 'student') {
			const selectedClass = getAllClassesForSession(
				formData.student.session,
			).find((c: any) => c.classId === formData.student.classId);
			userData = {
				...base,
				session: formData.student.session,
				classId: formData.student.classId,
				className: selectedClass?.name,
				classLevel: selectedClass?.level,
				enrollmentYear: formData.student.enrollmentYear,
				enrollmentSemester: formData.student.enrollmentSemester,
				isNewStudent: formData.student.isNewStudent,
				guardian: formData.student.guardian,
			};
		} else if (userType === 'teacher') {
			userData = {
				...base,
				subjects: buildTeacherSubjectsPayload(),
				sponsorClass: formData.teacher.sponsorClass,
			};
		} else if (userType === 'administrator') {
			userData = { ...base, position: formData.administrator.position };
		} else {
			userData = base;
		}
		await proceedWithUserCreation(userData);
	};

	const resetForm = () => {
		setCurrentStep(1);
		setUserType('');
		setActivePanel('');
		setFormData({
			firstName: '',
			middleName: '',
			lastName: '',
			gender: '',
			nickName: '',
			dateOfBirth: '',
			phone: '',
			email: '',
			address: '',
			bio: '',
			avatar: '',
			student: {
				session: '',
				classId: '',
				enrollmentYear: defaultEnrollmentYear,
				enrollmentSemester: defaultEnrollmentSemester,
				isNewStudent: true,
				guardian: {
					firstName: '',
					middleName: '',
					lastName: '',
					email: '',
					phone: '',
					address: '',
				},
			},
			teacher: { subjects: [], isSponsor: false, sponsorClass: null },
			administrator: { position: '' },
		});
		setErrors({});
		setCreatedUserInfo(null);
	};

	const handleCopyCredentials = () => {
		if (createdUserInfo?.generatedCredentials) {
			const creds = `Username: ${createdUserInfo.generatedCredentials.username}\nPassword: ${createdUserInfo.generatedCredentials.defaultPassword}`;
			navigator.clipboard
				.writeText(creds)
				.then(() => alert('Credentials copied!'));
		}
	};

	const getTotalSteps = () => (userType === 'student' ? 5 : 4);
	const successStep = getTotalSteps() + 1;

	const stepMeta =
		userType === 'student'
			? [
					{ label: 'User Type', short: 'Type', icon: Users },
					{ label: 'Personal Info', short: 'Info', icon: User },
					{ label: 'Student', short: 'Student', icon: ClipboardList },
					{ label: 'Class', short: 'Class', icon: GraduationCap },
					{ label: 'Review', short: 'Review', icon: CheckCircle2 },
				]
			: [
					{ label: 'User Type', short: 'Type', icon: Users },
					{ label: 'Personal Info', short: 'Info', icon: User },
					{
						label: userType === 'teacher' ? 'Teaching' : 'Role',
						short: userType === 'teacher' ? 'Teaching' : 'Role',
						icon: ClipboardList,
					},
					{ label: 'Review', short: 'Review', icon: CheckCircle2 },
				];

	/* ═══════════════════════════════════════════
	   RENDER
	═══════════════════════════════════════════ */
	return (
		<div className="w-full max-w-5xl mx-auto px-3 sm:px-4 lg:px-6">
			<ConflictModal
				isOpen={showConflictModal}
				onClose={() => setShowConflictModal(false)}
				conflictState={conflictState}
				onConfirm={handleConfirmReassignment}
				isLoading={isValidating}
				userName={`${formData.firstName} ${formData.lastName}`}
				schoolProfile={school}
			/>

			{/* ── Header ── */}
			{currentStep <= getTotalSteps() && (
				<div className="mb-4 sm:mb-6">
					{/* Back + title row */}
					<div className="flex items-center gap-2 sm:gap-3 mb-4">
						{onBack && (
							<button
								onClick={onBack}
								className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 touch-manipulation"
								aria-label="Go back"
							>
								<ArrowLeft className="w-4 h-4" />
							</button>
						)}
						<div className="min-w-0">
							<h1 className="text-base sm:text-xl font-bold text-foreground leading-tight truncate">
								Create New User
							</h1>
							{school?.name && (
								<p className="text-xs text-muted-foreground mt-0.5 truncate">
									{school.name}
								</p>
							)}
						</div>
					</div>

					{/* Step indicator */}
					<div className="bg-card rounded-xl border border-border p-3 sm:p-4">
						<div className="flex items-center">
							{stepMeta.map((step, i) => {
								const stepNum = i + 1;
								const isDone = stepNum < currentStep;
								const isActive = stepNum === currentStep;
								const StepIcon = step.icon;
								return (
									<div key={i} className="flex items-center flex-1 min-w-0">
										<div className="flex flex-col items-center gap-1">
											<div
												className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${
													isDone
														? 'bg-primary text-primary-foreground'
														: isActive
															? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
															: 'bg-muted text-muted-foreground'
												}`}
											>
												{isDone ? (
													<CheckCircle2 className="w-4 h-4" />
												) : (
													<StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
												)}
											</div>
											<span
												className={`text-[9px] sm:text-[10px] font-semibold tracking-wide text-center leading-tight max-w-[48px] sm:max-w-none ${
													isActive
														? 'text-primary'
														: isDone
															? 'text-foreground/70'
															: 'text-muted-foreground'
												}`}
											>
												{step.short}
											</span>
										</div>
										{i < stepMeta.length - 1 && (
											<div
												className={`flex-1 h-0.5 mx-1 sm:mx-2 mb-4 transition-colors duration-300 ${
													stepNum < currentStep ? 'bg-primary' : 'bg-border'
												}`}
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* ── Content card ── */}
			<div className="bg-card rounded-xl border border-border overflow-hidden">
				<div className="p-4 sm:p-6 lg:p-8">
					{/* ══ STEP 1: User type ══ */}
					{currentStep === 1 && (
						<motion.div
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-5"
						>
							<div>
								<h2 className="text-base sm:text-lg font-bold text-foreground">
									Who are you adding?
								</h2>
								<p className="text-xs sm:text-sm text-muted-foreground mt-1">
									Choose a role for the new account. Each type has a different
									setup flow.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
								{(
									[
										{
											type: 'student',
											icon: GraduationCap,
											label: 'Student',
											desc: 'Enrol a learner and assign them to a class',
											detail: 'Student & guardian · Class assignment · Enrollment period',
										},
										{
											type: 'teacher',
											icon: BookOpen,
											label: 'Teacher',
											desc: 'Add a teaching staff member',
											detail: 'Subjects · Level teaching · Class sponsorship',
										},
										{
											type: 'administrator',
											icon: Shield,
											label: 'Administrator',
											desc: 'Create an administrative staff account',
											detail: 'Position · System access',
										},
									] as const
								).map(({ type, icon: Icon, label, desc, detail }) => {
									const isSelected = userType === type;
									return (
										<motion.button
											key={type}
											onClick={() => setUserType(type)}
											whileTap={{ scale: 0.97 }}
											className={`relative text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 touch-manipulation ${
												isSelected
													? 'border-primary bg-primary/5 shadow-sm'
													: 'border-border hover:border-primary/40 hover:bg-muted/40 active:bg-muted/60'
											}`}
										>
											{isSelected && (
												<motion.div
													layoutId="userTypeCheck"
													className="absolute top-3 right-3"
												>
													<CheckCircle2 className="w-4.5 h-4.5 text-primary" />
												</motion.div>
											)}
											<div
												className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-colors ${
													isSelected
														? 'bg-primary/10 text-primary'
														: 'bg-muted text-muted-foreground'
												}`}
											>
												<Icon className="w-5 h-5 sm:w-6 sm:h-6" />
											</div>
											<h3 className="font-bold text-foreground text-sm sm:text-base mb-1">
												{label}
											</h3>
											<p className="text-xs text-muted-foreground mb-2 sm:mb-3">
												{desc}
											</p>
											<p className="text-[10px] sm:text-xs text-muted-foreground/60 border-t border-border pt-2.5 leading-relaxed">
												{detail}
											</p>
										</motion.button>
									);
								})}
							</div>
						</motion.div>
					)}

					{/* ══ STEP 2: Personal info ══ */}
					{currentStep === 2 && (
						<motion.div
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-4"
						>
							<div>
								<h2 className="text-base sm:text-lg font-bold text-foreground">
									Personal Information
								</h2>
								<p className="text-xs sm:text-sm text-muted-foreground mt-1">
									Fill in the details for the new {userType}. Fields marked *
									are required.
								</p>
							</div>

							<SectionCard title="Name" icon={User}>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
									<Field
										label="First Name"
										required
										error={errors.firstName}
										icon={Hash}
									>
										<input
											type="text"
											value={formData.firstName}
											onChange={(e) =>
												setFormData({ ...formData, firstName: e.target.value })
											}
											className={`${inputBase} ${errors.firstName ? inputError : inputNormal}`}
											placeholder="e.g. James"
											autoComplete="given-name"
										/>
									</Field>
									<Field label="Middle Name" icon={Hash}>
										<input
											type="text"
											value={formData.middleName}
											onChange={(e) =>
												setFormData({ ...formData, middleName: e.target.value })
											}
											className={`${inputBase} ${inputNormal}`}
											placeholder="Optional"
											autoComplete="additional-name"
										/>
									</Field>
									<Field
										label="Last Name"
										required
										error={errors.lastName}
										icon={Hash}
									>
										<input
											type="text"
											value={formData.lastName}
											onChange={(e) =>
												setFormData({ ...formData, lastName: e.target.value })
											}
											className={`${inputBase} ${errors.lastName ? inputError : inputNormal}`}
											placeholder="e.g. Kofi"
											autoComplete="family-name"
										/>
									</Field>
								</div>
								<div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
									<Field label="Nickname" icon={Hash}>
										<input
											type="text"
											value={formData.nickName}
											onChange={(e) =>
												setFormData({ ...formData, nickName: e.target.value })
											}
											className={`${inputBase} ${inputNormal}`}
											placeholder="Optional"
										/>
									</Field>
									<Field label="Gender" required error={errors.gender}>
										<select
											value={formData.gender}
											onChange={(e) =>
												setFormData({ ...formData, gender: e.target.value })
											}
											className={`${inputBase} ${errors.gender ? inputError : inputNormal}`}
										>
											<option value="">Select</option>
											<option value="Male">Male</option>
											<option value="Female">Female</option>
											<option value="Other">Other</option>
										</select>
									</Field>
								</div>
							</SectionCard>

							<SectionCard title="Contact & Identity" icon={Phone}>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
									<Field
										label="Date of Birth"
										required
										error={errors.dateOfBirth}
										icon={Calendar}
									>
										<input
											type="date"
											value={formData.dateOfBirth}
											onChange={(e) =>
												setFormData({
													...formData,
													dateOfBirth: e.target.value,
												})
											}
											className={`${inputBase} ${errors.dateOfBirth ? inputError : inputNormal}`}
										/>
									</Field>
									<Field
										label="Phone"
										required
										error={errors.phone}
										icon={Phone}
									>
										<input
											type="tel"
											value={formData.phone}
											onChange={(e) =>
												setFormData({ ...formData, phone: e.target.value })
											}
											className={`${inputBase} ${errors.phone ? inputError : inputNormal}`}
											placeholder="+231 555 0000"
											autoComplete="tel"
										/>
									</Field>
									<Field label="Email" error={errors.email} icon={Mail}>
										<input
											type="email"
											value={formData.email}
											onChange={(e) =>
												setFormData({ ...formData, email: e.target.value })
											}
											className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
											placeholder="Optional"
											autoComplete="email"
										/>
									</Field>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
									<Field
										label="Home Address"
										required
										error={errors.address}
										icon={MapPin}
									>
										<textarea
											value={formData.address}
											onChange={(e) =>
												setFormData({ ...formData, address: e.target.value })
											}
											className={`${inputBase} ${errors.address ? inputError : inputNormal} resize-none`}
											rows={3}
											placeholder="Street, City, County"
										/>
									</Field>
									<Field label="Bio" icon={FileText}>
										<textarea
											value={formData.bio}
											onChange={(e) =>
												setFormData({ ...formData, bio: e.target.value })
											}
											className={`${inputBase} ${inputNormal} resize-none`}
											rows={3}
											placeholder="Brief introduction (optional)"
										/>
									</Field>
								</div>
							</SectionCard>
						</motion.div>
					)}

					{/* ══ STEP 3: Role-specific ══ */}
					{currentStep === 3 && (
						<motion.div
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
						>
							{/* ────── STUDENT: info + parent ────── */}
							{userType === 'student' && (
								<div className="space-y-4">
									<div>
										<h2 className="text-base sm:text-lg font-bold text-foreground">
											Student Details
										</h2>
										<p className="text-xs sm:text-sm text-muted-foreground mt-1">
											Set up student and guardian information for this
											student.
										</p>
									</div>

									<SectionCard
										title="Student Information"
										subtitle="Indicate whether this is a new or returning student"
										icon={GraduationCap}
									>
										<div className="flex items-center justify-between gap-4">
											<div className="min-w-0">
												<p className="text-sm font-medium text-foreground">
													New student
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{formData.student.isNewStudent
														? 'This student is new to the school'
														: 'This student is a returning / old student'}
												</p>
											</div>
											<ThemedSwitch
												checked={formData.student.isNewStudent}
												onChange={(checked) =>
													setFormData({
														...formData,
														student: {
															...formData.student,
															isNewStudent: checked,
														},
													})
												}
											/>
										</div>
									</SectionCard>

									<SectionCard
										title="Guardian Information"
										subtitle="The person responsible for this student"
										icon={Home}
									>
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
											<Field
												label="First Name"
												required
												error={errors.guardianFirstName}
												icon={Hash}
											>
												<input
													type="text"
													value={formData.student.guardian.firstName}
													onChange={(e) =>
														setFormData({
															...formData,
															student: {
																...formData.student,
																guardian: {
																	...formData.student.guardian,
																	firstName: e.target.value,
																},
															},
														})
													}
													className={`${inputBase} ${errors.guardianFirstName ? inputError : inputNormal}`}
													placeholder="First name"
													autoComplete="off"
												/>
											</Field>
											<Field label="Middle Name" icon={Hash}>
												<input
													type="text"
													value={formData.student.guardian.middleName}
													onChange={(e) =>
														setFormData({
															...formData,
															student: {
																...formData.student,
																guardian: {
																	...formData.student.guardian,
																	middleName: e.target.value,
																},
															},
														})
													}
													className={`${inputBase} ${inputNormal}`}
													placeholder="Optional"
												/>
											</Field>
											<Field
												label="Last Name"
												required
												error={errors.guardianLastName}
												icon={Hash}
											>
												<input
													type="text"
													value={formData.student.guardian.lastName}
													onChange={(e) =>
														setFormData({
															...formData,
															student: {
																...formData.student,
																guardian: {
																	...formData.student.guardian,
																	lastName: e.target.value,
																},
															},
														})
													}
													className={`${inputBase} ${errors.guardianLastName ? inputError : inputNormal}`}
													placeholder="Last name"
													autoComplete="off"
												/>
											</Field>
										</div>
										<div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
											<Field
												label="Phone"
												required
												error={errors.guardianPhone}
												icon={Phone}
											>
												<input
													type="tel"
													value={formData.student.guardian.phone}
													onChange={(e) =>
														setFormData({
															...formData,
															student: {
																...formData.student,
																guardian: {
																	...formData.student.guardian,
																	phone: e.target.value,
																},
															},
														})
													}
													className={`${inputBase} ${errors.guardianPhone ? inputError : inputNormal}`}
													placeholder="+231 555 0000"
												/>
											</Field>
											<Field label="Email" icon={Mail}>
												<input
													type="email"
													value={formData.student.guardian.email}
													onChange={(e) =>
														setFormData({
															...formData,
															student: {
																...formData.student,
																guardian: {
																	...formData.student.guardian,
																	email: e.target.value,
																},
															},
														})
													}
													className={`${inputBase} ${inputNormal}`}
													placeholder="Optional"
												/>
											</Field>
										</div>
										<div className="mt-3 sm:mt-4">
											<Field
												label="Address"
												required
												error={errors.guardianAddress}
												icon={MapPin}
											>
												<textarea
													value={formData.student.guardian.address}
													onChange={(e) =>
														setFormData({
															...formData,
															student: {
																...formData.student,
																guardian: {
																	...formData.student.guardian,
																	address: e.target.value,
																},
															},
														})
													}
													className={`${inputBase} ${errors.guardianAddress ? inputError : inputNormal} resize-none`}
													rows={2}
													placeholder="Street, City, County"
												/>
											</Field>
										</div>
									</SectionCard>
								</div>
							)}

							{/* ────── TEACHER ────── */}
							{userType === 'teacher' && (
								<div className="space-y-4">
									<div>
										<h2 className="text-base sm:text-lg font-bold text-foreground">
											Teaching Information
										</h2>
										<p className="text-xs sm:text-sm text-muted-foreground mt-1">
											Assign subjects and classes. Self-contained classes
											include all their subjects at once.
										</p>
									</div>

									{/* Mobile session tabs */}
									{hasMultipleSessions && (
										<MobileTabStrip
											items={getSessions().map((session) => ({
												id: session,
												label: session,
												icon: BookOpen,
												badge:
													sessionSubjectCount(session) > 0 ? (
														<span className="font-bold">
															{sessionSubjectCount(session)}
														</span>
													) : undefined,
											}))}
											activeId={activePanel}
											onSelect={setActivePanel}
										/>
									)}

									<div className="flex gap-4">
										{/* Desktop sidebar — multi-session only */}
										{hasMultipleSessions && (
											<div className="hidden sm:flex flex-col gap-1 w-40 lg:w-44 shrink-0">
												<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">
													Sessions
												</p>
												{getSessions().map((session) => {
													const count = sessionSubjectCount(session);
													const isActive = activePanel === session;
													return (
														<SidebarItem
															key={session}
															label={session}
															isActive={isActive}
															icon={BookOpen}
															badge={
																count > 0 ? (
																	<span
																		className={`shrink-0 text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}
																	>
																		{count}
																	</span>
																) : undefined
															}
															onClick={() => setActivePanel(session)}
														/>
													);
												})}
												{/* Sidebar summary */}
												{formData.teacher.subjects.length > 0 && (
													<div className="mt-3 pt-3 border-t border-border space-y-1.5">
														<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
															Summary
														</p>
														<div className="rounded-lg bg-muted/60 border border-border px-3 py-2.5 space-y-1.5 text-xs">
															<div className="flex justify-between gap-1">
																<span className="text-muted-foreground">
																	Subjects
																</span>
																<span className="font-bold text-foreground">
																	{uniqueSubjectNames}
																</span>
															</div>
															<div className="flex justify-between gap-1">
																<span className="text-muted-foreground">
																	Classes
																</span>
																<span className="font-bold text-foreground">
																	{totalTeacherClasses}
																</span>
															</div>
															<div className="flex justify-between gap-1">
																<span className="text-muted-foreground">
																	Sessions
																</span>
																<span className="font-bold text-foreground">
																	{
																		new Set(
																			formData.teacher.subjects.map(
																				(s) => s.session,
																			),
																		).size
																	}
																</span>
															</div>
															{formData.teacher.isSponsor &&
																formData.teacher.sponsorClass && (
																	<div className="pt-1 border-t border-border/50">
																		<span className="text-muted-foreground block">
																			Sponsor Class
																		</span>
																		<span className="font-bold text-primary break-words text-[11px]">
																			{getAllClassesForSession(
																				formData.teacher.subjects[0]?.session,
																			).find(
																				(c: any) =>
																					c.classId ===
																					formData.teacher.sponsorClass,
																			)?.name ?? '—'}
																		</span>
																	</div>
																)}
														</div>
													</div>
												)}
											</div>
										)}

										{/* Content panel */}
										<div className="flex-1 min-w-0">
											{!hasMultipleSessions ? (
												<TeacherSessionPanel
													session={getSessions()[0]}
													formData={formData}
													setFormData={setFormData}
													isSCClassChecked={isSCClassChecked}
													handleSelfContainedSelection={
														handleSelfContainedSelection
													}
													handleSubjectChange={handleSubjectChange}
													getSelfContainedClasses={getSelfContainedClasses}
													getClassLevels={getClassLevels}
													isLevelSelfContained={isLevelSelfContained}
													getSubjectsBySessionAndLevel={
														getSubjectsBySessionAndLevel
													}
													getAllClassesForSession={getAllClassesForSession}
													getLevelStyle={getLevelStyle}
													uniqueSubjectNames={uniqueSubjectNames}
													totalTeacherClasses={totalTeacherClasses}
													showSummaryInline
												/>
											) : !activePanel ? (
												<div className="min-h-[200px] sm:min-h-[360px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center p-6 gap-3">
													<BookOpen className="w-8 h-8 text-muted-foreground/30" />
													<p className="text-sm font-medium text-muted-foreground">
														<span className="sm:hidden">
															Tap a session above to begin
														</span>
														<span className="hidden sm:inline">
															Select a session to begin
														</span>
													</p>
												</div>
											) : (
												<motion.div
													key={activePanel}
													initial={{ opacity: 0, x: 6 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ duration: 0.16 }}
												>
													<TeacherSessionPanel
														session={activePanel}
														formData={formData}
														setFormData={setFormData}
														isSCClassChecked={isSCClassChecked}
														handleSelfContainedSelection={
															handleSelfContainedSelection
														}
														handleSubjectChange={handleSubjectChange}
														getSelfContainedClasses={getSelfContainedClasses}
														getClassLevels={getClassLevels}
														isLevelSelfContained={isLevelSelfContained}
														getSubjectsBySessionAndLevel={
															getSubjectsBySessionAndLevel
														}
														getAllClassesForSession={getAllClassesForSession}
														getLevelStyle={getLevelStyle}
													/>
												</motion.div>
											)}
										</div>
									</div>

									{/* Mobile summary bar — shown once anything is selected */}
									{formData.teacher.subjects.length > 0 &&
										hasMultipleSessions && (
											<div className="sm:hidden rounded-lg border border-border bg-muted/50 px-4 py-2.5 flex gap-4 text-xs">
												<span className="text-muted-foreground">
													Subjects:{' '}
													<span className="font-bold text-foreground">
														{uniqueSubjectNames}
													</span>
												</span>
												<span className="text-muted-foreground">
													Classes:{' '}
													<span className="font-bold text-foreground">
														{totalTeacherClasses}
													</span>
												</span>
											</div>
										)}

									{errors.subjects && (
										<motion.p
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="text-xs text-destructive flex items-center gap-1"
										>
											<XCircle className="w-3.5 h-3.5" /> {errors.subjects}
										</motion.p>
									)}
								</div>
							)}

							{/* ────── ADMINISTRATOR ────── */}
							{userType === 'administrator' && (
								<div className="space-y-4">
									<div>
										<h2 className="text-base sm:text-lg font-bold text-foreground">
											Administrative Role
										</h2>
										<p className="text-xs sm:text-sm text-muted-foreground mt-1">
											Assign an administrative position. Permissions are managed
											in system settings.
										</p>
									</div>
									<SectionCard title="Position Assignment" icon={Briefcase}>
										<div className="space-y-4">
											<Field
												label="Position"
												required
												error={errors.position}
												icon={UserCog}
											>
												<select
													value={formData.administrator.position}
													onChange={(e) =>
														setFormData({
															...formData,
															administrator: {
																...formData.administrator,
																position: e.target.value,
															},
														})
													}
													className={`${inputBase} ${errors.position ? inputError : inputNormal}`}
												>
													<option value="">Select a position</option>
													{adminPositions.map((pos: any) => (
														<option key={pos.key} value={pos.key}>
															{pos.name} ({pos.key})
														</option>
													))}
												</select>
											</Field>
											{formData.administrator.position && (
												<motion.div
													initial={{ opacity: 0, y: 4 }}
													animate={{ opacity: 1, y: 0 }}
													className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/50"
												>
													<CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
													<div>
														<p className="text-sm font-semibold text-foreground">
															{selectedAdminPosition?.name ??
																formData.administrator.position}
														</p>
														<p className="text-xs text-muted-foreground mt-0.5">
															Permissions for this role are configured in system
															settings.
														</p>
													</div>
												</motion.div>
											)}
										</div>
									</SectionCard>
								</div>
							)}
						</motion.div>
					)}

					{/* ══ STEP 4: Review ══ */}
					{currentStep === 4 && (
						<motion.div
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							className="space-y-4"
						>
							<div>
								<h2 className="text-base sm:text-lg font-bold text-foreground">
									Review & Confirm
								</h2>
								<p className="text-xs sm:text-sm text-muted-foreground mt-1">
									A username and temporary password will be generated on
									creation.
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Personal */}
								<div className="rounded-xl border border-border bg-card overflow-hidden">
									<div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
										<User className="w-3.5 h-3.5 text-primary" />
										<span className="text-sm font-semibold text-foreground">
											Personal Details
										</span>
									</div>
									<div className="p-4 space-y-0">
										<ReviewRow label="Role" value={userType} capitalize />
										<ReviewRow
											label="Full Name"
											value={getFullName(
												formData.firstName,
												formData.middleName,
												formData.lastName,
											)}
										/>
										<ReviewRow label="Gender" value={formData.gender} />
										<ReviewRow
											label="Date of Birth"
											value={formData.dateOfBirth}
										/>
										<ReviewRow label="Phone" value={formData.phone} />
										{formData.email && (
											<ReviewRow label="Email" value={formData.email} />
										)}
										<ReviewRow label="Address" value={formData.address} />
									</div>
								</div>

								{/* Role-specific */}
								<div className="rounded-xl border border-border bg-card overflow-hidden">
									<div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
										{userType === 'student' ? (
											<GraduationCap className="w-3.5 h-3.5 text-primary" />
										) : userType === 'teacher' ? (
											<BookOpen className="w-3.5 h-3.5 text-primary" />
										) : (
											<Shield className="w-3.5 h-3.5 text-primary" />
										)}
										<span className="text-sm font-semibold text-foreground">
											{userType === 'student'
												? 'Enrollment'
												: userType === 'teacher'
													? 'Teaching Assignment'
													: 'Admin Role'}
										</span>
									</div>
									<div className="p-4 space-y-0">
										{userType === 'student' && (
											<>
												<ReviewRow
													label="Session"
													value={formData.student.session}
												/>
												<ReviewRow
													label="Class"
													value={
														getAllClassesForSession(
															formData.student.session,
														).find(
															(c: any) =>
																c.classId === formData.student.classId,
														)?.name ?? '—'
													}
												/>
												<ReviewRow
													label="Enrollment Year"
													value={formData.student.enrollmentYear}
												/>
												<ReviewRow
													label="Semester"
													value={formData.student.enrollmentSemester}
												/>
												<div className="pt-3 mt-1">
													<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
														Guardian
													</p>
													<ReviewRow
														label="Name"
														value={getFullName(
															formData.student.guardian.firstName,
															formData.student.guardian.middleName,
															formData.student.guardian.lastName,
														)}
													/>
													<ReviewRow
														label="Phone"
														value={formData.student.guardian.phone}
													/>
													{formData.student.guardian.email && (
														<ReviewRow
															label="Email"
															value={formData.student.guardian.email}
														/>
													)}
												</div>
											</>
										)}
										{userType === 'teacher' && (
											<>
												<ReviewRow
													label="Unique Subjects"
													value={String(uniqueSubjectNames)}
												/>
												<ReviewRow
													label="Total Classes"
													value={String(totalTeacherClasses)}
												/>
												<ReviewRow
													label="Sessions"
													value={
														Array.from(
															new Set(
																formData.teacher.subjects.map((s) => s.session),
															),
														).join(', ') || '—'
													}
												/>
												{formData.teacher.isSponsor &&
													formData.teacher.sponsorClass && (
														<ReviewRow
															label="Class Sponsor"
															value={
																getAllClassesForSession(
																	formData.teacher.subjects[0]?.session,
																).find(
																	(c: any) =>
																		c.classId === formData.teacher.sponsorClass,
																)?.name ?? '—'
															}
														/>
													)}
											</>
										)}
										{userType === 'administrator' && (
											<ReviewRow
												label="Position"
												value={
													selectedAdminPosition
														? `${selectedAdminPosition.name} (${selectedAdminPosition.key})`
														: formData.administrator.position
												}
											/>
										)}
									</div>
								</div>
							</div>

							<div className="rounded-lg border border-border bg-muted/40 p-3.5 flex items-start gap-3">
								<CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
								<p className="text-xs text-muted-foreground leading-relaxed">
									Login credentials will be auto-generated. The new user will be
									prompted to change their password on first login.
								</p>
							</div>
						</motion.div>
					)}

					{/* ══ STEP 5: Success ══ */}
					{currentStep === 5 && createdUserInfo && (
						<motion.div
							initial={{ opacity: 0, scale: 0.97 }}
							animate={{ opacity: 1, scale: 1 }}
							className="flex flex-col items-center text-center space-y-5 py-4 sm:py-6"
						>
							<div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center">
								<CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
							</div>
							<div>
								<h2 className="text-xl sm:text-2xl font-bold text-foreground">
									Account Created!
								</h2>
								<p className="text-muted-foreground mt-1.5 text-sm">
									<span className="font-semibold text-foreground">
										{getFullName(
											formData.firstName,
											formData.middleName,
											formData.lastName,
										)}
									</span>{' '}
									account was successfully created.
								</p>
							</div>

							<div className="w-full max-w-sm rounded-xl border border-border bg-muted/50 overflow-hidden">
								<div className="px-4 py-3 border-b border-border bg-muted">
									<p className="text-sm font-semibold text-foreground">
										Generated Credentials
									</p>
								</div>
								<div className="p-4 space-y-3.5">
									<div className="flex items-center justify-between gap-3 flex-wrap">
										<span className="text-sm text-muted-foreground">
											Username
										</span>
										<code className="text-sm font-mono font-bold text-foreground bg-background border border-border px-2.5 py-1 rounded-lg break-all">
											{createdUserInfo.generatedCredentials.username}
										</code>
									</div>
									<div className="flex items-center justify-between gap-3 flex-wrap">
										<span className="text-sm text-muted-foreground">
											Temp. Password
										</span>
										<code className="text-sm font-mono font-bold text-foreground bg-background border border-border px-2.5 py-1 rounded-lg break-all">
											{createdUserInfo.generatedCredentials.defaultPassword}
										</code>
									</div>
									{createdUserInfo.generatedCredentials.note && (
										<p className="text-xs text-muted-foreground text-center pt-1 border-t border-border">
											{createdUserInfo.generatedCredentials.note}
										</p>
									)}
								</div>
							</div>

							<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
								<button
									onClick={handleCopyCredentials}
									className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors touch-manipulation"
								>
									<Copy className="w-4 h-4" /> Copy Credentials
								</button>
								<button
									onClick={resetForm}
									className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors touch-manipulation"
								>
									<Users className="w-4 h-4" /> Add Another User
								</button>
							</div>
						</motion.div>
					)}
				</div>
			</div>

			{/* Spacer so content isn't hidden behind the fixed footer nav */}
			{currentStep < 5 && <div className="h-20 sm:h-24" />}

			{/* ── Footer nav (fixed to viewport bottom) ── */}
			{currentStep < 5 && (
				<div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
					<div className="w-full max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
						<button
							onClick={
								currentStep === 1 ? (onBack ?? (() => {})) : handlePrevious
							}
							className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 touch-manipulation"
							disabled={isValidating}
						>
							<ChevronLeft className="w-4 h-4" />
							<span className="hidden xs:inline">
								{currentStep === 1 ? 'Back' : 'Previous'}
							</span>
						</button>

						<button
							onClick={handleNext}
							disabled={isValidating || (currentStep === 1 && !userType)}
							className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] sm:min-w-[120px] touch-manipulation"
						>
							{isValidating ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin shrink-0" />
									<span>
										{currentStep < getTotalSteps() ? 'Checking…' : 'Creating…'}
									</span>
								</>
							) : currentStep < getTotalSteps() ? (
								<>
									<span>Next</span>
									<ChevronRight className="w-4 h-4 shrink-0" />
								</>
							) : (
								<>
									<CheckCircle2 className="w-4 h-4 shrink-0" />
									<span>Create User</span>
								</>
							)}
						</button>
					</div>
				</div>
			)}

			{/* ── Error modal ── */}
			{showErrorModal && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
					<motion.div
						initial={{ opacity: 0, y: 20, scale: 0.97 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						className="bg-card border border-border p-5 sm:p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4 text-center"
					>
						<div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
							<XCircle className="w-5 h-5 text-destructive" />
						</div>
						<div>
							<h4 className="text-base font-bold text-foreground">
								Something went wrong
							</h4>
							<p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
								{errorMessage}
							</p>
						</div>
						<button
							onClick={() => setShowErrorModal(false)}
							className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors touch-manipulation"
						>
							Dismiss
						</button>
					</motion.div>
				</div>
			)}
		</div>
	);
};

export default DashboardUserForm;
