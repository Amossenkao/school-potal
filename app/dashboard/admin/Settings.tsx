'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import {
	REPORT_CARD_THEMES,
	DEFAULT_REPORT_CARD_THEME,
} from '@/types/reportCardTheme';
import {
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
	FileText,
	ChevronDown,
	X,
	Loader2,
	XCircle,
	Check,
	Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Feedback Toast
// ---------------------------------------------------------------------------
const FeedbackToast = ({ type, message, onClose }: any) => {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

const ensureArray = (value: any) => (Array.isArray(value) ? value : []);

const parseAcademicYearStart = (value: any) => {
	if (!value || typeof value !== 'string') return null;
	const normalized = value.trim().replace(/[–—]/g, '-').replace(/\//g, '-');
	const match = normalized.match(/^(\d{4})-(\d{4})$/);
	if (!match) return null;
	const startYear = Number.parseInt(match[1], 10);
	return Number.isFinite(startYear) ? startYear : null;
};

const formatAcademicYear = (startYear: number) =>
	`${startYear}-${startYear + 1}`;

const shiftAcademicYear = (yearLabel: string, delta: number) => {
	const start = parseAcademicYearStart(yearLabel);
	if (start === null) return null;
	return formatAcademicYear(start + delta);
};

const buildAcademicYearRange = (
	startYearLabel: string,
	endYearLabel: string,
) => {
	let start = parseAcademicYearStart(startYearLabel);
	let end = parseAcademicYearStart(endYearLabel);
	if (start === null && end === null) return [];
	if (start === null) start = end;
	if (end === null) end = start;
	if (start === null || end === null) return [];
	const lower = Math.min(start, end);
	const upper = Math.max(start, end);
	const years: string[] = [];
	for (let year = lower; year <= upper; year += 1)
		years.push(formatAcademicYear(year));
	return years;
};

// ---------------------------------------------------------------------------
// MultiSelect
// ---------------------------------------------------------------------------
const MultiSelect = ({ options, selected, onChange, label }: any) => {
	const [isOpen, setIsOpen] = useState(false);
	const safeOptions = Array.isArray(options) ? options : [];
	const safeSelected = ensureArray(selected);

	return (
		<div className="relative w-full">
			<label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
				{label}
			</label>
			<div className="w-full rounded-lg border border-border bg-background p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
				<div className="flex flex-wrap gap-1.5 items-center min-h-[32px]">
					{safeSelected.map((itemValue: string) => {
						const itemLabel =
							safeOptions.find((o: any) => o.value === itemValue)?.label ||
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
									onClick={() =>
										onChange(
											safeSelected.filter((i: string) => i !== itemValue),
										)
									}
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
											.filter((o: any) => !safeSelected.includes(o.value))
											.map((option: any) => (
												<li
													key={option.value}
													onClick={() => {
														onChange([...safeSelected, option.value]);
														setIsOpen(false);
													}}
													className="text-foreground cursor-pointer select-none px-3 py-2 hover:bg-muted text-sm"
												>
													{option.label}
												</li>
											))}
										{safeOptions.filter(
											(o: any) => !safeSelected.includes(o.value),
										).length === 0 && (
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

// ---------------------------------------------------------------------------
// SingleSelect
// ---------------------------------------------------------------------------
const SingleSelect = ({ options, selected, onChange, label }: any) => {
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
						{options.find((o: any) => o.value === selected)?.label ||
							'Select...'}
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
								{options.map((option: any) => (
									<li
										key={option.value}
										onClick={() => {
											onChange(option.value);
											setIsOpen(false);
										}}
										className={`text-foreground cursor-pointer select-none px-3 py-2 hover:bg-muted text-sm ${selected === option.value ? 'bg-muted font-medium' : ''}`}
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

const ToggleSwitch = ({ checked, onChange, disabled = false }: any) => (
	<button
		type="button"
		onClick={onChange}
		disabled={disabled}
		className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-muted'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
	>
		<span
			className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`}
		/>
		<span className="sr-only">Toggle setting</span>
	</button>
);

const SettingsSection = ({ icon: Icon, title, description, children }: any) => (
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

const SettingsItem = ({
	label,
	description,
	checked,
	onChange,
	disabled = false,
}: any) => (
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
			<ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
		</div>
	</div>
);

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
}: any) => (
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
							className={`text-xs font-bold px-2 py-1 rounded-md ${pendingAction === 'activate' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : pendingAction === 'deactivate' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'}`}
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

// ---------------------------------------------------------------------------
// MockReportCard — miniature report card preview rendered in the chosen theme
// ---------------------------------------------------------------------------
const MockReportCard = ({ theme }: { theme: any }) => (
	<div
		className="relative w-full rounded-xl overflow-hidden shadow-lg aspect-[3/4]"
		style={{
			background: `linear-gradient(145deg, ${theme.previewFrom} 0%, ${theme.previewTo} 100%)`,
		}}
	>
		{/* Decorative background circles */}
		<div
			className="absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-20"
			style={{ background: theme.previewTo }}
		/>
		<div
			className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full opacity-15"
			style={{ background: theme.previewFrom }}
		/>

		<div className="relative z-10 p-3 h-full flex flex-col">
			{/* School header */}
			<div className="flex items-center gap-1.5 mb-2.5">
				<div className="h-5 w-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
					<FileText className="h-2.5 w-2.5 text-white" />
				</div>
				<div className="flex flex-col gap-0.5">
					<div className="h-1.5 w-14 rounded-full bg-white/50" />
					<div className="h-1 w-10 rounded-full bg-white/30" />
				</div>
			</div>

			{/* Title bar */}
			<div className="bg-white/20 rounded-md px-2 py-1 mb-2 text-center">
				<div className="h-1.5 w-16 rounded-full bg-white/60 mx-auto" />
			</div>

			{/* Student info */}
			<div className="mb-2 space-y-1">
				<div className="flex gap-1 items-center">
					<div className="h-1 w-6 rounded-full bg-white/40" />
					<div className="h-1 w-16 rounded-full bg-white/60" />
				</div>
				<div className="flex gap-1 items-center">
					<div className="h-1 w-6 rounded-full bg-white/40" />
					<div className="h-1 w-12 rounded-full bg-white/60" />
				</div>
			</div>

			{/* Grade table */}
			<div className="flex-1 bg-white/10 rounded-lg p-1.5 space-y-1">
				{/* Header */}
				<div className="flex gap-1 pb-1 border-b border-white/20">
					<div className="flex-1 h-1.5 rounded-full bg-white/50" />
					<div className="w-6 h-1.5 rounded-full bg-white/50" />
					<div className="w-6 h-1.5 rounded-full bg-white/50" />
				</div>
				{/* Rows */}
				{[70, 85, 55, 92, 78].map((score, i) => (
					<div key={i} className="flex gap-1 items-center">
						<div className="flex-1 h-1 rounded-full bg-white/30" />
						<div
							className="h-1.5 rounded-full bg-white/70"
							style={{ width: `${Math.max(14, score * 0.08)}px` }}
						/>
						<div
							className="h-1.5 rounded-full bg-white/50"
							style={{ width: `${Math.max(10, (100 - score) * 0.06)}px` }}
						/>
					</div>
				))}
			</div>

			{/* Footer */}
			<div className="mt-2 flex justify-between items-center">
				<div className="h-1 w-12 rounded-full bg-white/30" />
				<div className="h-3 w-10 rounded bg-white/20 flex items-center justify-center">
					<div className="h-1 w-6 rounded-full bg-white/50" />
				</div>
			</div>
		</div>
	</div>
);

// ---------------------------------------------------------------------------
// ReportCardThemePicker — reimagined accordion-style per-class-level selector
// ---------------------------------------------------------------------------
function ReportCardThemePicker({
	classLevels,
	themes,
	onChange,
}: {
	classLevels: string[];
	themes: Record<string, string>;
	onChange: (level: string, themeId: string) => void;
}) {
	const [expandedLevel, setExpandedLevel] = useState<string | null>(
		classLevels.length > 0 ? classLevels[0] : null,
	);

	if (classLevels.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No class levels configured.
			</p>
		);
	}

	const getTheme = (id: string) =>
		REPORT_CARD_THEMES.find((t) => t.id === id) ?? REPORT_CARD_THEMES[0];

	return (
		<div className="space-y-2.5">
			{classLevels.map((level) => {
				const currentThemeId = themes[level] || DEFAULT_REPORT_CARD_THEME;

				const currentTheme = getTheme(currentThemeId);
				const isExpanded = expandedLevel === level;

				return (
					<div
						key={level}
						className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${
							isExpanded
								? 'border-primary/50 shadow-md'
								: 'border-border hover:border-border/80'
						}`}
					>
						{/* ── Accordion header ── */}
						<button
							type="button"
							onClick={() => setExpandedLevel(isExpanded ? null : level)}
							className="w-full flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-muted/30 transition-colors text-left"
						>
							{/* Active theme gradient pill */}
							<div
								className="h-9 w-9 rounded-lg flex-shrink-0 shadow-sm ring-1 ring-black/10 dark:ring-white/10"
								style={{
									background: `linear-gradient(135deg, ${currentTheme.previewFrom}, ${currentTheme.previewTo})`,
								}}
							/>

							<div className="flex-1 min-w-0">
								<p className="font-semibold text-sm text-foreground leading-tight">
									{level}
								</p>
								<p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
									<span
										className="inline-block h-2 w-2 rounded-full flex-shrink-0"
										style={{
											background: currentTheme.previewFrom,
										}}
									/>
									{currentTheme.name}
								</p>
							</div>

							<ChevronDown
								className={`h-4 w-4 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
									isExpanded ? 'rotate-180' : ''
								}`}
							/>
						</button>

						{/* ── Expanded content ── */}
						{isExpanded && (
							<div className="border-t border-border bg-muted/10 p-4">
								<div className="flex flex-col sm:flex-row gap-5">
									{/* Left: live report card preview */}
									<div className="sm:w-28 flex-shrink-0">
										<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
											Live Preview
										</p>

										<MockReportCard theme={currentTheme} />

										<p className="mt-2 text-[10px] text-center text-muted-foreground font-medium">
											{currentTheme.name}
										</p>
									</div>

									{/* Right: theme palette grid */}
									<div className="flex-1 min-w-0">
										<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
											Select Theme
										</p>

										<div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
											{REPORT_CARD_THEMES.map((theme) => {
												const isSelected = currentThemeId === theme.id;

												return (
													<button
														key={theme.id}
														type="button"
														title={theme.name}
														onClick={() => onChange(level, theme.id)}
														className={`group relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
															isSelected
																? 'border-primary shadow-md'
																: 'border-transparent hover:border-muted-foreground/30'
														}`}
													>
														{/* Swatch */}
														<div
															className="h-11 w-full rounded-lg shadow-sm relative overflow-hidden transition-transform duration-150 group-hover:scale-105"
															style={{
																background: `linear-gradient(135deg, ${theme.previewFrom} 0%, ${theme.previewTo} 100%)`,
															}}
														>
															{/* shimmer */}
															<div
																className="absolute inset-0 opacity-25"
																style={{
																	backgroundImage:
																		'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.2) 4px, rgba(255,255,255,0.2) 5px)',
																}}
															/>

															{/* check */}
															{isSelected && (
																<div className="absolute inset-0 flex items-center justify-center">
																	<div className="h-6 w-6 rounded-full bg-white/95 shadow-md flex items-center justify-center">
																		<Check className="h-3.5 w-3.5 text-gray-800" />
																	</div>
																</div>
															)}
														</div>

														{/* label */}
														<span
															className={`text-[9px] leading-tight text-center font-semibold w-full truncate transition-colors ${
																isSelected
																	? 'text-primary'
																	: 'text-muted-foreground group-hover:text-foreground'
															}`}
														>
															{theme.name}
														</span>
													</button>
												);
											})}
										</div>

										{/* Active theme callout */}
										<div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
											<Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
											<p className="text-xs text-muted-foreground leading-snug">
												<span className="font-semibold text-foreground">
													{level}
												</span>{' '}
												report cards will use the{' '}
												<span
													className="font-semibold"
													style={{
														color: currentTheme.previewFrom,
													}}
												>
													{currentTheme.name}
												</span>{' '}
												theme.
											</p>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main Settings Component
// ---------------------------------------------------------------------------
export default function Settings() {
	const school = useSchoolStore((state) => state.school);
	const fetchSchool = useSchoolStore((state) => state.fetchSchool);
	const setSchool = useSchoolStore((state) => state.setSchool);

	const [currentAcademicYear, setCurrentAcademicYear] = useState('');
	const [studentSettings, setStudentSettings] = useState<any>(null);
	const [teacherSettings, setTeacherSettings] = useState<any>(null);
	const [administratorSettings, setAdministratorSettings] = useState<any>(null);
	const [reportCardThemes, setReportCardThemes] = useState<
		Record<string, string>
	>({});
	const [pendingBulkActions, setPendingBulkActions] = useState<
		Record<string, string>
	>({});
	const [bulkPasswordResets, setBulkPasswordResets] = useState<
		Record<string, string>
	>({});
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState({ type: '', message: '' });

	useEffect(() => {
		if (!school) fetchSchool();
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
			const administratorDefaults = { loginAccess: true };

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
			setReportCardThemes((school.settings as any).reportCardThemes || {});
			setIsLoading(false);
		}
	}, [school]);

	const allClassLevels = useMemo(() => {
		if (!school?.classLevels) return [] as string[];
		const levels = new Set<string>();
		Object.values(school.classLevels).forEach((session: any) => {
			if (session && typeof session === 'object')
				Object.keys(session).forEach((l) => levels.add(l));
		});
		return Array.from(levels);
	}, [school?.classLevels]);

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
			buildAcademicYearRange(firstAcademicYear, maxCurrentAcademicYearOption),
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
		return values.map((year) => ({ value: year, label: year }));
	}, [currentAcademicYearValues, baseCurrentAcademicYear]);

	const academicYearOptions = useMemo(() => {
		const fallbackYear = currentAcademicYear || baseCurrentAcademicYear;
		const values =
			settingsAcademicYearValues.length > 0
				? settingsAcademicYearValues
				: [fallbackYear];
		return values.map((year) => ({ value: year, label: year }));
	}, [
		settingsAcademicYearValues,
		currentAcademicYear,
		baseCurrentAcademicYear,
	]);

	useEffect(() => {
		if (!currentAcademicYearOptions.length) return;
		const hasCurrentOption = currentAcademicYearOptions.some(
			(o) => o.value === currentAcademicYear,
		);
		if (hasCurrentOption) return;
		const schoolCurrent = school?.currentAcademicYear;
		const fallbackValue =
			(schoolCurrent &&
				currentAcademicYearOptions.find((o) => o.value === schoolCurrent)
					?.value) ||
			currentAcademicYearOptions[currentAcademicYearOptions.length - 1]
				?.value ||
			currentAcademicYearOptions[0]?.value ||
			'';
		if (fallbackValue && fallbackValue !== currentAcademicYear)
			setCurrentAcademicYear(fallbackValue);
	}, [
		currentAcademicYear,
		currentAcademicYearOptions,
		school?.currentAcademicYear,
	]);

	useEffect(() => {
		if (!teacherSettings) return;
		const allowedAcademicYears = new Set(
			academicYearOptions.map((o) => o.value),
		);
		const sanitize = (years: any) =>
			ensureArray(years).filter((y: string) => allowedAcademicYears.has(y));
		setTeacherSettings((prev: any) => {
			if (!prev) return prev;
			const next = {
				...prev,
				gradeSubmissionAcademicYears: sanitize(
					prev.gradeSubmissionAcademicYears,
				),
				viewMastersAcademicYears: sanitize(prev.viewMastersAcademicYears),
				viewGradeSubmissionsAcademicYears: sanitize(
					prev.viewGradeSubmissionsAcademicYears,
				),
				gradeChangeRequestAcademicYears: sanitize(
					prev.gradeChangeRequestAcademicYears,
				),
			};
			const unchanged =
				JSON.stringify(next.gradeSubmissionAcademicYears) ===
					JSON.stringify(ensureArray(prev.gradeSubmissionAcademicYears)) &&
				JSON.stringify(next.viewMastersAcademicYears) ===
					JSON.stringify(ensureArray(prev.viewMastersAcademicYears)) &&
				JSON.stringify(next.viewGradeSubmissionsAcademicYears) ===
					JSON.stringify(ensureArray(prev.viewGradeSubmissionsAcademicYears)) &&
				JSON.stringify(next.gradeChangeRequestAcademicYears) ===
					JSON.stringify(ensureArray(prev.gradeChangeRequestAcademicYears));
			return unchanged ? prev : next;
		});
	}, [teacherSettings, academicYearOptions]);

	const toggleStudentSetting = (s: string) =>
		setStudentSettings((p: any) => ({ ...p, [s]: !p[s] }));
	const toggleTeacherSetting = (s: string) =>
		setTeacherSettings((p: any) => ({ ...p, [s]: !p[s] }));
	const toggleAdministratorSetting = (s: string) =>
		setAdministratorSettings((p: any) => ({ ...p, [s]: !p[s] }));

	const handleQueueBulkAction = (category: string, action: string) =>
		setPendingBulkActions((prev) => ({ ...prev, [category]: action }));
	const clearPendingBulkAction = (category: string) => {
		setPendingBulkActions((prev) => {
			const n = { ...prev };
			delete n[category];
			return n;
		});
		setBulkPasswordResets((prev) => {
			const n = { ...prev };
			delete n[category];
			return n;
		});
	};

	const handleReportCardThemeChange = (level: string, themeId: string) => {
		setReportCardThemes((prev) => ({ ...prev, [level]: themeId }));
	};

	const handleSaveSettings = async () => {
		setIsSaving(true);
		setFeedback({ type: '', message: '' });

		const payload = {
			currentAcademicYear,
			studentSettings,
			teacherSettings,
			administratorSettings,
			reportCardThemes,
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
				if (school) {
					setSchool({
						...school,
						currentAcademicYear,
						settings: {
							...school.settings,
							studentSettings,
							teacherSettings,
							administratorSettings,
							reportCardThemes,
						} as any,
					});
				}
				setFeedback({
					type: 'success',
					message: 'Settings saved successfully!',
				});
				setPendingBulkActions({});
				setBulkPasswordResets({});
			} else {
				setFeedback({
					type: 'error',
					message: data.message || 'Failed to save settings.',
				});
			}
		} catch {
			setFeedback({
				type: 'error',
				message: 'An error occurred while saving settings.',
			});
		} finally {
			setIsSaving(false);
		}
	};

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

	return (
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

				<div className="space-y-4 sm:space-y-6">
					{/* ── General Settings ── */}
					<SettingsSection
						icon={Calendar}
						title="General Settings"
						description="Configure academic year and system-wide settings"
					>
						<SingleSelect
							options={currentAcademicYearOptions}
							selected={currentAcademicYear}
							onChange={setCurrentAcademicYear}
							label="Current Academic Year"
						/>
					</SettingsSection>

					{/* ── Report Card Themes (reimagined) ── */}
					<SettingsSection
						icon={FileText}
						title="Report Card Themes"
						description="Choose the color theme applied to each class level's report cards when they are generated."
					>
						<ReportCardThemePicker
							classLevels={allClassLevels}
							themes={reportCardThemes}
							onChange={handleReportCardThemeChange}
						/>
					</SettingsSection>

					{/* ── Student Settings ── */}
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
								onChange={(v: string[]) =>
									setStudentSettings((p: any) => ({
										...p,
										reportAccessPeriods: v,
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
								onChange={(v: string[]) =>
									setStudentSettings((p: any) => ({
										...p,
										reportAccessSemesters: v,
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
								onReset={() => handleQueueBulkAction('all-students', 'reset')}
								pendingAction={pendingBulkActions['all-students']}
								onClear={() => clearPendingBulkAction('all-students')}
								passwordValue={bulkPasswordResets['all-students']}
								onPasswordChange={(v: string) =>
									setBulkPasswordResets((p) => ({ ...p, 'all-students': v }))
								}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>

					{/* ── Teacher Settings ── */}
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
							<MultiSelect
								options={academicYearOptions}
								selected={teacherSettings.gradeSubmissionAcademicYears}
								onChange={(v: string[]) =>
									setTeacherSettings((p: any) => ({
										...p,
										gradeSubmissionAcademicYears: v,
									}))
								}
								label="Academic Years"
							/>
							<MultiSelect
								options={academicPeriodsMap}
								selected={teacherSettings.gradeSubmissionPeriods}
								onChange={(v: string[]) =>
									setTeacherSettings((p: any) => ({
										...p,
										gradeSubmissionPeriods: v,
									}))
								}
								label="Periods"
							/>
						</div>
						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Permissions
							</h4>
							<MultiSelect
								options={academicYearOptions}
								selected={teacherSettings.viewMastersAcademicYears}
								onChange={(v: string[]) =>
									setTeacherSettings((p: any) => ({
										...p,
										viewMastersAcademicYears: v,
									}))
								}
								label="View Master Grade Sheets for Academic Years"
							/>
							<MultiSelect
								options={academicYearOptions}
								selected={teacherSettings.viewGradeSubmissionsAcademicYears}
								onChange={(v: string[]) =>
									setTeacherSettings((p: any) => ({
										...p,
										viewGradeSubmissionsAcademicYears: v,
									}))
								}
								label="View Grade Submissions for Academic Years"
							/>
						</div>
						<div className="pt-3 sm:pt-4 border-t border-border space-y-3">
							<h4 className="font-medium text-foreground text-sm sm:text-base">
								Grade Change Request Windows
							</h4>
							<MultiSelect
								options={academicYearOptions}
								selected={teacherSettings.gradeChangeRequestAcademicYears}
								onChange={(v: string[]) =>
									setTeacherSettings((p: any) => ({
										...p,
										gradeChangeRequestAcademicYears: v,
									}))
								}
								label="Academic Years"
							/>
							<MultiSelect
								options={academicPeriodsMap}
								selected={teacherSettings.gradeChangeRequestPeriods}
								onChange={(v: string[]) =>
									setTeacherSettings((p: any) => ({
										...p,
										gradeChangeRequestPeriods: v,
									}))
								}
								label="Periods"
							/>
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
								onReset={() => handleQueueBulkAction('all-teachers', 'reset')}
								pendingAction={pendingBulkActions['all-teachers']}
								onClear={() => clearPendingBulkAction('all-teachers')}
								passwordValue={bulkPasswordResets['all-teachers']}
								onPasswordChange={(v: string) =>
									setBulkPasswordResets((p) => ({ ...p, 'all-teachers': v }))
								}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>

					{/* ── Administrator Settings ── */}
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
								onPasswordChange={(v: string) =>
									setBulkPasswordResets((p) => ({
										...p,
										'all-administrators': v,
									}))
								}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>
				</div>
			</div>

			{/* ── Floating Save Button ── */}
			<div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-3 z-20 sm:bottom-6 sm:right-6 lg:right-8">
				<button
					onClick={handleSaveSettings}
					disabled={isSaving}
					className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isSaving ? 'cursor-not-allowed bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
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
}
