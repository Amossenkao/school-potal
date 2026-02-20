'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSchoolStore } from '@/store/schoolStore';
import {
	Shield,
	Users,
	FileText,
	Calendar,
	Cog,
	Save,
	CheckCircle,
	GraduationCap,
	UserCheck,
	UserX,
	RotateCw,
	KeyRound,
	BookOpen,
	UserCog,
	Palette,
	ChevronDown,
	X,
	Loader2,
	XCircle,
} from 'lucide-react';
import {
	DEFAULT_TENANT_THEME_NAME,
	TENANT_THEME_NAMES,
	type TenantThemeName,
} from '@/types/tenantTheme';
import {
	TENANT_THEME_OPTIONS,
	applyTenantThemeToDocument,
} from '@/lib/tenantTheme';

// --- Reusable Feedback Toast Component ---
const FeedbackToast = ({ type, message, onClose }) => {
	useEffect(() => {
		const timer = setTimeout(onClose, 5000);
		return () => clearTimeout(timer);
	}, [onClose]);

	const isSuccess = type === 'success';
	const Icon = isSuccess ? CheckCircle : XCircle;
	const colorClasses = isSuccess
		? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
		: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200';
	const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';

	return (
		<div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[100] animate-in slide-in-from-top-5 fade-in-0 duration-300">
			<div
				className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border ${colorClasses}`}
			>
				<Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
				<div className="flex-1 min-w-0">
					<h4 className="font-semibold text-sm">
						{isSuccess ? 'Success' : 'Error'}
					</h4>
					<p className="text-xs mt-0.5 break-words">{message}</p>
				</div>
				<button
					onClick={onClose}
					className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

const getCurrentAcademicYear = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	if (month >= 8) return `${year}-${year + 1}`;
	return `${year - 1}-${year}`;
};

const academicPeriodsMap = [
	{ value: 'first', label: 'First Period' },
	{ value: 'second', label: 'Second Period' },
	{ value: 'third', label: 'Third Period' },
	{ value: 'third_period_exam', label: 'Third Period Exam' },
	{ value: 'fourth', label: 'Fourth Period' },
	{ value: 'fifth', label: 'Fifth Period' },
	{ value: 'sixth', label: 'Sixth Period' },
	{ value: 'sixth_period_exam', label: 'Sixth Period Exam' },
];

const semesterOptions = [
	{ value: 'first', label: '1st Semester' },
	{ value: 'second', label: '2nd Semester' },
];

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const parseAcademicYearStart = (value) => {
	if (!value || typeof value !== 'string') return null;
	const normalized = value.trim().replace(/[–—]/g, '-').replace(/\//g, '-');
	const match = normalized.match(/^(\d{4})-(\d{4})$/);
	if (!match) return null;
	const startYear = Number.parseInt(match[1], 10);
	return Number.isFinite(startYear) ? startYear : null;
};

const formatAcademicYear = (startYear) => `${startYear}-${startYear + 1}`;

const shiftAcademicYear = (yearLabel, delta) => {
	const start = parseAcademicYearStart(yearLabel);
	if (start === null) return null;
	return formatAcademicYear(start + delta);
};

const buildAcademicYearRange = (startYearLabel, endYearLabel) => {
	let start = parseAcademicYearStart(startYearLabel);
	let end = parseAcademicYearStart(endYearLabel);

	if (start === null && end === null) return [];
	if (start === null) start = end;
	if (end === null) end = start;
	if (start === null || end === null) return [];

	const lower = Math.min(start, end);
	const upper = Math.max(start, end);
	const years = [];
	for (let year = lower; year <= upper; year += 1) {
		years.push(formatAcademicYear(year));
	}
	return years;
};

// Improved MultiSelect with better mobile responsiveness
const MultiSelect = ({ options, selected, onChange, label }) => {
	const [isOpen, setIsOpen] = useState(false);
	const safeOptions = Array.isArray(options) ? options : [];
	const safeSelected = ensureArray(selected);

	const handleDeselect = (optionValue) => {
		onChange(safeSelected.filter((item) => item !== optionValue));
	};

	const handleSelect = (optionValue) => {
		if (!safeSelected.includes(optionValue)) {
			onChange([...safeSelected, optionValue]);
		}
	};

	return (
		<div className="relative w-full">
			<label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
				{label}
			</label>
			<div className="w-full rounded-lg border border-border bg-background p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
				<div className="flex flex-wrap gap-1.5 items-center min-h-[32px]">
					{safeSelected.map((itemValue) => {
						const itemLabel =
							safeOptions.find((o) => o.value === itemValue)?.label ||
							itemValue;
						return (
							<div
								key={itemValue}
								className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
							>
								<span className="max-w-[120px] sm:max-w-none truncate">
									{itemLabel}
								</span>
								<button
									type="button"
									onClick={() => handleDeselect(itemValue)}
									className="flex-shrink-0 text-primary/70 hover:text-primary"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						);
					})}
					<div className="relative flex-1 min-w-[80px]">
						<button
							type="button"
							onClick={() => setIsOpen(!isOpen)}
							className="w-full text-left bg-transparent focus:outline-none flex justify-between items-center gap-2 text-sm"
						>
							<span className="text-muted-foreground truncate">
								{safeSelected.length === 0 ? 'Select...' : 'Add...'}
							</span>
							<ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
						</button>
						{isOpen && (
							<>
								<div
									className="fixed inset-0 z-10"
									onClick={() => setIsOpen(false)}
								/>
								<div className="absolute z-20 mt-1 w-full sm:w-auto sm:min-w-[200px] rounded-md bg-card shadow-lg border border-border max-h-60 overflow-auto">
									<ul className="py-1">
										{safeOptions
											.filter((o) => !safeSelected.includes(o.value))
											.map((option) => (
												<li
													key={option.value}
													onClick={() => {
														handleSelect(option.value);
														setIsOpen(false);
													}}
													className="text-foreground cursor-pointer select-none px-3 py-2 hover:bg-muted text-sm"
												>
													{option.label}
												</li>
											))}
										{safeOptions.filter((o) => !safeSelected.includes(o.value))
											.length === 0 && (
											<li className="text-muted-foreground px-3 py-2 text-sm">
												All selected
											</li>
										)}
									</ul>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

// Single Select Component
const SingleSelect = ({ options, selected, onChange, label }) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="relative w-full">
			<label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
				{label}
			</label>
			<div className="relative">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="w-full rounded-lg border border-border bg-background p-3 text-left focus:border-primary focus:ring-2 focus:ring-primary/20 flex justify-between items-center"
				>
					<span className="text-sm">
						{options.find((o) => o.value === selected)?.label || 'Select...'}
					</span>
					<ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
				</button>
				{isOpen && (
					<>
						<div
							className="fixed inset-0 z-10"
							onClick={() => setIsOpen(false)}
						/>
						<div className="absolute z-20 mt-1 w-full rounded-md bg-card shadow-lg border border-border max-h-60 overflow-auto">
							<ul className="py-1">
								{options.map((option) => (
									<li
										key={option.value}
										onClick={() => {
											onChange(option.value);
											setIsOpen(false);
										}}
										className={`text-foreground cursor-pointer select-none px-3 py-2 hover:bg-muted text-sm ${
											selected === option.value ? 'bg-muted font-medium' : ''
										}`}
									>
										{option.label}
									</li>
								))}
							</ul>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

// Improved Toggle Switch
const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
	return (
		<button
			type="button"
			onClick={onChange}
			disabled={disabled}
			className={`
				relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
				${checked ? 'bg-primary' : 'bg-muted'}
				${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
			`}
		>
			<span
				className={`
					inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out
					${checked ? 'translate-x-6' : 'translate-x-1'}
				`}
			/>
			<span className="sr-only">Toggle setting</span>
		</button>
	);
};

// Improved Settings Section with better mobile layout
const SettingsSection = ({ icon: Icon, title, description, children }) => {
	return (
		<div className="rounded-lg sm:rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
			<div className="flex items-start gap-3 sm:gap-4 mb-4">
				<div className="rounded-lg bg-primary/10 p-2 sm:p-3 flex-shrink-0">
					<Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="text-base sm:text-lg font-semibold text-foreground">
						{title}
					</h3>
					{description && (
						<p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
							{description}
						</p>
					)}
				</div>
			</div>
			<div className="space-y-3 sm:space-y-4">{children}</div>
		</div>
	);
};

// Improved Settings Item with better mobile responsiveness
const SettingsItem = ({
	label,
	description,
	checked,
	onChange,
	disabled = false,
}) => {
	return (
		<div className="flex items-start sm:items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3 sm:p-4 transition-colors hover:bg-muted">
			<div className="flex-1 min-w-0">
				<div className="font-medium text-foreground text-sm sm:text-base capitalize break-words">
					{label}
				</div>
				{description && (
					<div className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
						{description}
					</div>
				)}
			</div>
			<div className="flex-shrink-0">
				<ToggleSwitch
					checked={checked}
					onChange={onChange}
					disabled={disabled}
				/>
			</div>
		</div>
	);
};

// Improved Bulk Action Item with stacked mobile layout
const BulkActionItem = ({
	label,
	description,
	onActivate,
	onDeactivate,
	onReset,
	pendingAction,
	onClear,
	passwordValue,
	onPasswordChange,
	disabled = false,
}) => {
	return (
		<div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4 transition-colors hover:bg-muted">
			<div className="space-y-3">
				<div className="flex-1 min-w-0">
					<div className="font-medium text-foreground text-sm sm:text-base capitalize break-words">
						{label}
					</div>
					{description && (
						<div className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
							{description}
						</div>
					)}
					{pendingAction && (
						<div className="mt-2 flex items-center gap-2 flex-wrap">
							<span
								className={`text-xs font-bold px-2 py-1 rounded-md ${
									pendingAction === 'activate'
										? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
										: pendingAction === 'deactivate'
											? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
											: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
								}`}
							>
								Pending:{' '}
								{pendingAction.charAt(0).toUpperCase() + pendingAction.slice(1)}
							</span>
							<button
								onClick={onClear}
								className="text-muted-foreground hover:text-foreground"
							>
								<RotateCw className="h-3 w-3" />
							</button>
						</div>
					)}
				</div>
				<div className="flex flex-col sm:flex-row gap-2 w-full">
					<button
						onClick={onActivate}
						disabled={disabled || pendingAction === 'activate'}
						className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
					>
						<UserCheck className="h-4 w-4" />
						<span>Activate All</span>
					</button>
					<button
						onClick={onDeactivate}
						disabled={disabled || pendingAction === 'deactivate'}
						className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
					>
						<UserX className="h-4 w-4" />
						<span>Deactivate All</span>
					</button>
					<button
						onClick={onReset}
						disabled={disabled || pendingAction === 'reset'}
						className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500"
					>
						<KeyRound className="h-4 w-4" />
						<span>Reset Passwords</span>
					</button>
				</div>
				{pendingAction === 'reset' && (
					<div className="space-y-2">
						<label className="block text-xs sm:text-sm font-medium text-foreground">
							Common Password (optional)
						</label>
						<input
							type="text"
							value={passwordValue || ''}
							onChange={(e) => onPasswordChange?.(e.target.value)}
							placeholder="Leave blank to reset to username"
							className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground"
							disabled={disabled}
						/>
						<p className="text-xs text-muted-foreground">
							If empty, all passwords reset to each user&apos;s username.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default function Settings() {
	const school = useSchoolStore((state) => state.school);
	const fetchSchool = useSchoolStore((state) => state.fetchSchool);
	const setSchool = useSchoolStore((state) => state.setSchool);

	const [currentAcademicYear, setCurrentAcademicYear] = useState('');
	const [studentSettings, setStudentSettings] = useState(null);
	const [teacherSettings, setTeacherSettings] = useState(null);
	const [administratorSettings, setAdministratorSettings] = useState(null);
	const [themeName, setThemeName] = useState<TenantThemeName>(
		DEFAULT_TENANT_THEME_NAME
	);
	const [pendingBulkActions, setPendingBulkActions] = useState({});
	const [bulkPasswordResets, setBulkPasswordResets] = useState({});
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState({ type: '', message: '' });
	const [isClientReady, setIsClientReady] = useState(false);
	const persistedThemeNameRef = useRef<TenantThemeName>(DEFAULT_TENANT_THEME_NAME);

	const applyThemePreview = (nextThemeName: TenantThemeName) => {
		applyTenantThemeToDocument(nextThemeName);
	};

	useEffect(() => {
		setIsClientReady(true);
	}, []);

	useEffect(() => {
		if (!school) {
			fetchSchool();
		}
	}, [school, fetchSchool]);

	useEffect(() => {
		if (school && school.settings) {
			const baseAcademicYear =
				school.currentAcademicYear || getCurrentAcademicYear();

			setCurrentAcademicYear(baseAcademicYear);
			const studentDefaults = {
				loginAccess: true,
				yearlyReportAccess: false,
				reportAccessPeriods: [],
				reportAccessSemesters: [],
			};
			const teacherDefaults = {
				loginAccess: true,
				gradeSubmissionPeriods: [],
				gradeSubmissionAcademicYears: [baseAcademicYear],
				viewMastersAcademicYears: [baseAcademicYear],
				viewGradeSubmissionsAcademicYears: [baseAcademicYear],
				gradeChangeRequestAcademicYears: [baseAcademicYear],
				gradeChangeRequestPeriods: [],
			};
			const administratorDefaults = {
				loginAccess: true,
			};

			const nextStudentSettings = {
				...studentDefaults,
				...(school.settings.studentSettings || {}),
			};
			nextStudentSettings.reportAccessPeriods = ensureArray(
				nextStudentSettings.reportAccessPeriods,
			);
			nextStudentSettings.reportAccessSemesters = ensureArray(
				nextStudentSettings.reportAccessSemesters,
			);

			const nextTeacherSettings = {
				...teacherDefaults,
				...(school.settings.teacherSettings || {}),
			};
			nextTeacherSettings.gradeSubmissionPeriods = ensureArray(
				nextTeacherSettings.gradeSubmissionPeriods,
			);
			nextTeacherSettings.gradeSubmissionAcademicYears = ensureArray(
				nextTeacherSettings.gradeSubmissionAcademicYears,
			);
			nextTeacherSettings.viewMastersAcademicYears = ensureArray(
				nextTeacherSettings.viewMastersAcademicYears,
			);
			nextTeacherSettings.viewGradeSubmissionsAcademicYears = ensureArray(
				nextTeacherSettings.viewGradeSubmissionsAcademicYears,
			);
			nextTeacherSettings.gradeChangeRequestAcademicYears = ensureArray(
				nextTeacherSettings.gradeChangeRequestAcademicYears,
			);
			nextTeacherSettings.gradeChangeRequestPeriods = ensureArray(
				nextTeacherSettings.gradeChangeRequestPeriods,
			);

			setStudentSettings(nextStudentSettings);
			setTeacherSettings(nextTeacherSettings);
			setAdministratorSettings({
				...administratorDefaults,
				...(school.settings.administratorSettings || {}),
			});
			setThemeName(
				TENANT_THEME_NAMES.includes(school.themeName as TenantThemeName)
					? (school.themeName as TenantThemeName)
					: DEFAULT_TENANT_THEME_NAME
			);
			setIsLoading(false);
		}
	}, [school]);

	useEffect(() => {
		persistedThemeNameRef.current = TENANT_THEME_NAMES.includes(
			school?.themeName as TenantThemeName
		)
			? (school?.themeName as TenantThemeName)
			: DEFAULT_TENANT_THEME_NAME;
	}, [school?.themeName]);

	useEffect(() => {
		applyThemePreview(themeName);
	}, [themeName]);

	useEffect(() => {
		return () => {
			applyThemePreview(persistedThemeNameRef.current);
		};
	}, []);

	const baseCurrentAcademicYear =
		school?.currentAcademicYear || getCurrentAcademicYear();
	const firstAcademicYear =
		school?.firstAcademicYear ||
		school?.currentAcademicYear ||
		currentAcademicYear ||
		getCurrentAcademicYear();
	const maxCurrentAcademicYearOption =
		shiftAcademicYear(baseCurrentAcademicYear, 5) || baseCurrentAcademicYear;

	const currentAcademicYearValues = useMemo(
		() =>
			buildAcademicYearRange(
				firstAcademicYear,
				maxCurrentAcademicYearOption,
			),
		[firstAcademicYear, maxCurrentAcademicYearOption],
	);
	const settingsAcademicYearValues = useMemo(
		() =>
			buildAcademicYearRange(
				firstAcademicYear,
				currentAcademicYear || baseCurrentAcademicYear,
			),
		[firstAcademicYear, currentAcademicYear, baseCurrentAcademicYear],
	);

	const currentAcademicYearOptions = useMemo(() => {
		const values =
			currentAcademicYearValues.length > 0
				? currentAcademicYearValues
				: [baseCurrentAcademicYear];
		return values.map((year) => ({
			value: year,
			label: year,
		}));
	}, [currentAcademicYearValues, baseCurrentAcademicYear]);

	const academicYearOptions = useMemo(() => {
		const fallbackYear = currentAcademicYear || baseCurrentAcademicYear;
		const values =
			settingsAcademicYearValues.length > 0
				? settingsAcademicYearValues
				: [fallbackYear];
		return values.map((year) => ({
			value: year,
			label: year,
		}));
	}, [settingsAcademicYearValues, currentAcademicYear, baseCurrentAcademicYear]);

	useEffect(() => {
		if (!currentAcademicYearOptions.length) return;
		const hasCurrentOption = currentAcademicYearOptions.some(
			(option) => option.value === currentAcademicYear,
		);
		if (hasCurrentOption) return;

		const schoolCurrent = school?.currentAcademicYear;
		const fallbackValue =
			(schoolCurrent &&
				currentAcademicYearOptions.find((option) => option.value === schoolCurrent)
					?.value) ||
			currentAcademicYearOptions[currentAcademicYearOptions.length - 1]?.value ||
			currentAcademicYearOptions[0]?.value ||
			'';
		if (fallbackValue && fallbackValue !== currentAcademicYear) {
			setCurrentAcademicYear(fallbackValue);
		}
	}, [currentAcademicYear, currentAcademicYearOptions, school?.currentAcademicYear]);

	useEffect(() => {
		if (!teacherSettings) return;
		const allowedAcademicYears = new Set(
			academicYearOptions.map((option) => option.value),
		);
		const sanitize = (years) =>
			ensureArray(years).filter((year) => allowedAcademicYears.has(year));

		setTeacherSettings((prev) => {
			if (!prev) return prev;
			const nextGradeSubmissionYears = sanitize(prev.gradeSubmissionAcademicYears);
			const nextViewMastersYears = sanitize(prev.viewMastersAcademicYears);
			const nextViewSubmissionsYears = sanitize(
				prev.viewGradeSubmissionsAcademicYears,
			);
			const nextGradeRequestYears = sanitize(
				prev.gradeChangeRequestAcademicYears,
			);

			const unchanged =
				JSON.stringify(nextGradeSubmissionYears) ===
					JSON.stringify(ensureArray(prev.gradeSubmissionAcademicYears)) &&
				JSON.stringify(nextViewMastersYears) ===
					JSON.stringify(ensureArray(prev.viewMastersAcademicYears)) &&
				JSON.stringify(nextViewSubmissionsYears) ===
					JSON.stringify(
						ensureArray(prev.viewGradeSubmissionsAcademicYears),
					) &&
				JSON.stringify(nextGradeRequestYears) ===
					JSON.stringify(ensureArray(prev.gradeChangeRequestAcademicYears));

			if (unchanged) return prev;
			return {
				...prev,
				gradeSubmissionAcademicYears: nextGradeSubmissionYears,
				viewMastersAcademicYears: nextViewMastersYears,
				viewGradeSubmissionsAcademicYears: nextViewSubmissionsYears,
				gradeChangeRequestAcademicYears: nextGradeRequestYears,
			};
		});
	}, [teacherSettings, academicYearOptions]);

	const toggleStudentSetting = (setting) =>
		setStudentSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
	const toggleTeacherSetting = (setting) =>
		setTeacherSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
	const toggleAdministratorSetting = (setting) =>
		setAdministratorSettings((prev) => ({
			...prev,
			[setting]: !prev[setting],
		}));

	const handleQueueBulkAction = (category, action) =>
		setPendingBulkActions((prev) => ({ ...prev, [category]: action }));
	const clearPendingBulkAction = (category) => {
		setPendingBulkActions((prev) => {
			const newActions = { ...prev };
			delete newActions[category];
			return newActions;
		});
		setBulkPasswordResets((prev) => {
			const next = { ...prev };
			delete next[category];
			return next;
		});
	};

	const handleSaveSettings = async () => {
		setIsSaving(true);
		setFeedback({ type: '', message: '' });

		const payload = {
			currentAcademicYear,
			studentSettings,
			teacherSettings,
			administratorSettings,
			themeName,
			bulkUserActions: pendingBulkActions,
			bulkPasswordResets,
		};

		try {
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (data.success) {
				const nextThemeName = (data?.data?.themeName as TenantThemeName) || themeName;
				setThemeName(nextThemeName);

				if (school) {
					setSchool({
						...school,
						currentAcademicYear,
						settings: {
							...school.settings,
							studentSettings,
							teacherSettings,
							administratorSettings,
						},
						themeName: nextThemeName,
					});
				}

				setFeedback({
					type: 'success',
					message:
						'Settings saved successfully! Theme and system settings are now active.',
				});
				setPendingBulkActions({});
				setBulkPasswordResets({});
			} else {
				setFeedback({
					type: 'error',
					message: data.message || 'Failed to save settings.',
				});
			}
		} catch (error) {
			setFeedback({
				type: 'error',
				message: 'An error occurred while saving settings.',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const themeOptions = TENANT_THEME_OPTIONS.map((theme) => ({
		value: theme.name,
		label: theme.label,
	}));

	if (
		isLoading ||
		!studentSettings ||
		!teacherSettings ||
		!administratorSettings
	) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-background">
				<Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
			</div>
		);
	}

	const saveActionBar = (
		<div className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-background/95 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur">
			<div className="flex justify-center px-3">
				<button
					onClick={handleSaveSettings}
					disabled={isSaving}
					className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto sm:px-8 sm:shadow-sm ${
						isSaving
							? 'cursor-not-allowed bg-muted text-muted-foreground'
							: 'bg-primary text-primary-foreground hover:bg-primary/90'
					}`}
				>
					{isSaving ? (
						<>
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
							Saving...
						</>
					) : (
						<>
							<Save className="h-4 w-4" />
							Save Settings
						</>
					)}
				</button>
			</div>
		</div>
	);

	return (
		<>
			<div className="min-h-screen bg-background p-3 pb-24 sm:p-6 sm:pb-28">
				{feedback.message && (
					<FeedbackToast
						type={feedback.type}
						message={feedback.message}
						onClose={() => setFeedback({ type: '', message: '' })}
					/>
				)}
				<div className="max-w-none space-y-4 sm:space-y-8">
					{/* Header */}
					<div className="space-y-2 px-2 text-center">
						<div className="mb-2 inline-flex items-center justify-center rounded-full bg-primary/10 p-2 sm:mb-4 sm:p-3">
							<Cog className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
						</div>
						<h1 className="text-2xl sm:text-3xl font-bold text-foreground">
							System Settings
						</h1>
						<p className="text-xs sm:text-sm text-muted-foreground max-w-3xl mx-auto">
							Configure access controls, permissions, user management, and system
							behavior for your e-Portal.
						</p>
					</div>

					{/* Settings Sections */}
					<div className="space-y-4 sm:space-y-6">
						{/* General Settings */}
						<SettingsSection
							icon={Calendar}
							title="General Settings"
							description="Configure academic year and system-wide settings"
						>
							<div className="space-y-3">
								<SingleSelect
									options={currentAcademicYearOptions}
									selected={currentAcademicYear}
									onChange={setCurrentAcademicYear}
									label="Current Academic Year"
								/>
							</div>
						</SettingsSection>

					<SettingsSection
						icon={Palette}
						title="System Theme"
						description="Choose the default tenant-wide theme used across the portal in light and dark modes"
					>
						<div className="space-y-3">
							<SingleSelect
								options={themeOptions}
								selected={themeName}
								onChange={(value) => setThemeName(value as TenantThemeName)}
								label="School Theme"
							/>
							<p className="text-xs text-muted-foreground">
								Selecting a theme previews it instantly. Click Save to apply it
								system-wide for all users.
							</p>
						</div>
					</SettingsSection>

					{/* Student Settings */}
					<SettingsSection
						icon={GraduationCap}
						title="Student Settings"
						description="Manage student access controls and report permissions"
					>
						<SettingsItem
							label="Login Access"
							description="Allow students to login to the portal"
							checked={studentSettings.loginAccess}
							onChange={() => toggleStudentSetting('loginAccess')}
						/>
						<SettingsItem
							label="Yearly Report Access"
							description="Allow students to access yearly academic reports"
							checked={studentSettings.yearlyReportAccess}
							onChange={() => toggleStudentSetting('yearlyReportAccess')}
						/>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Periodic Report Access
							</h4>
							<MultiSelect
								options={academicPeriodsMap}
								selected={studentSettings.reportAccessPeriods}
								onChange={(selectedPeriods) =>
									setStudentSettings((prev) => ({
										...prev,
										reportAccessPeriods: selectedPeriods,
									}))
								}
								label="Select periods students can view. Leave empty to disable."
							/>
						</div>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Semester Report Access
							</h4>
							<MultiSelect
								options={semesterOptions}
								selected={studentSettings.reportAccessSemesters}
								onChange={(selectedSemesters) =>
									setStudentSettings((prev) => ({
										...prev,
										reportAccessSemesters: selectedSemesters,
									}))
								}
								label="Select semesters students can view. Leave empty to disable."
							/>
						</div>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Bulk Student Management
							</h4>
							<BulkActionItem
								label="All Students"
								description="Activate or deactivate all student accounts system-wide"
								onActivate={() =>
									handleQueueBulkAction('all-students', 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction('all-students', 'deactivate')
								}
								onReset={() =>
									handleQueueBulkAction('all-students', 'reset')
								}
								pendingAction={pendingBulkActions['all-students']}
								onClear={() => clearPendingBulkAction('all-students')}
								passwordValue={bulkPasswordResets['all-students']}
								onPasswordChange={(value) =>
									setBulkPasswordResets((prev) => ({
										...prev,
										['all-students']: value,
									}))
								}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>

					{/* Teacher Settings */}
					<SettingsSection
						icon={BookOpen}
						title="Teacher Settings"
						description="Configure teacher access and grade submission permissions"
					>
						<SettingsItem
							label="Login Access"
							description="Allow teachers to login to the portal"
							checked={teacherSettings.loginAccess}
							onChange={() => toggleTeacherSetting('loginAccess')}
						/>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Grade Submission Windows
							</h4>
							<div className="space-y-3">
								<MultiSelect
									options={academicYearOptions}
									selected={teacherSettings.gradeSubmissionAcademicYears}
									onChange={(selectedYears) =>
										setTeacherSettings((prev) => ({
											...prev,
											gradeSubmissionAcademicYears: selectedYears,
										}))
									}
									label="Academic Years"
								/>
								<MultiSelect
									options={academicPeriodsMap}
									selected={teacherSettings.gradeSubmissionPeriods}
									onChange={(selectedPeriods) =>
										setTeacherSettings((prev) => ({
											...prev,
											gradeSubmissionPeriods: selectedPeriods,
										}))
									}
									label="Periods"
								/>
							</div>
						</div>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Permissions
							</h4>
							<div className="space-y-3">
								<MultiSelect
									options={academicYearOptions}
									selected={teacherSettings.viewMastersAcademicYears}
									onChange={(selectedYears) =>
										setTeacherSettings((prev) => ({
											...prev,
											viewMastersAcademicYears: selectedYears,
										}))
									}
									label="View Master Grade Sheets for Academic Years"
								/>
								<MultiSelect
									options={academicYearOptions}
									selected={teacherSettings.viewGradeSubmissionsAcademicYears}
									onChange={(selectedYears) =>
										setTeacherSettings((prev) => ({
											...prev,
											viewGradeSubmissionsAcademicYears: selectedYears,
										}))
									}
									label="View Grade Submissions for Academic Years"
								/>
							</div>
						</div>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Grade Change Request Windows
							</h4>
							<div className="space-y-3">
								<MultiSelect
									options={academicYearOptions}
									selected={teacherSettings.gradeChangeRequestAcademicYears}
									onChange={(selectedYears) =>
										setTeacherSettings((prev) => ({
											...prev,
											gradeChangeRequestAcademicYears: selectedYears,
										}))
									}
									label="Academic Years"
								/>
								<MultiSelect
									options={academicPeriodsMap}
									selected={teacherSettings.gradeChangeRequestPeriods}
									onChange={(selectedPeriods) =>
										setTeacherSettings((prev) => ({
											...prev,
											gradeChangeRequestPeriods: selectedPeriods,
										}))
									}
									label="Periods"
								/>
							</div>
						</div>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Bulk Teacher Management
							</h4>
							<BulkActionItem
								label="All Teachers"
								description="Activate or deactivate all teacher accounts system-wide"
								onActivate={() =>
									handleQueueBulkAction('all-teachers', 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction('all-teachers', 'deactivate')
								}
								onReset={() =>
									handleQueueBulkAction('all-teachers', 'reset')
								}
								pendingAction={pendingBulkActions['all-teachers']}
								onClear={() => clearPendingBulkAction('all-teachers')}
								passwordValue={bulkPasswordResets['all-teachers']}
								onPasswordChange={(value) =>
									setBulkPasswordResets((prev) => ({
										...prev,
										['all-teachers']: value,
									}))
								}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>

					{/* Administrator Settings */}
					<SettingsSection
						icon={UserCog}
						title="Administrator Settings"
						description="Control administrator access and system permissions"
					>
						<SettingsItem
							label="Login Access"
							description="Allow school administrators to login to the portal"
							checked={administratorSettings.loginAccess}
							onChange={() => toggleAdministratorSetting('loginAccess')}
						/>

						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Bulk Administrator Management
							</h4>
							<BulkActionItem
								label="All Administrators"
								description="Activate or deactivate all administrator accounts system-wide"
								onActivate={() =>
									handleQueueBulkAction('all-administrators', 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction('all-administrators', 'deactivate')
								}
								onReset={() =>
									handleQueueBulkAction('all-administrators', 'reset')
								}
								pendingAction={pendingBulkActions['all-administrators']}
								onClear={() => clearPendingBulkAction('all-administrators')}
								passwordValue={bulkPasswordResets['all-administrators']}
								onPasswordChange={(value) =>
									setBulkPasswordResets((prev) => ({
										...prev,
										['all-administrators']: value,
									}))
								}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>
					</div>
				</div>
			</div>
			{isClientReady ? createPortal(saveActionBar, document.body) : null}
		</>
	);
}
