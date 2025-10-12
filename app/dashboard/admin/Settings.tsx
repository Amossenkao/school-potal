'use client';
import React, { useState, useEffect, useCallback } from 'react';
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
	BookOpen,
	UserCog,
	ChevronDown,
	X,
	Loader2,
	XCircle,
} from 'lucide-react';

// NOTE: useSchoolStore is assumed to be defined externally, as in the original file.
// const useSchoolStore = (selector) => ({ school: { settings: {} } });
// Assuming a placeholder store structure for a runnable example:
const useSchoolStore = (selector) =>
	selector({
		school: {
			settings: {
				studentSettings: {
					loginAccess: true,
					yearlyReportAccess: false,
					reportAccessPeriods: [],
				},
				teacherSettings: {
					loginAccess: true,
					gradeSubmissionPeriods: [],
					gradeSubmissionAcademicYears: ['2025-2026'],
					viewMastersAcademicYears: ['2025-2026'],
					viewGradeSubmissionsAcademicYears: ['2025-2026'],
					gradeChangeRequestAcademicYears: ['2025-2026'],
					gradeChangeRequestPeriods: [],
				},
				administratorSettings: {
					loginAccess: true,
				},
			},
		},
	});

// --- Reusable Feedback Toast Component ---
const FeedbackToast = ({ type, message, onClose }) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 5000);

		return () => clearTimeout(timer);
	}, [onClose]);

	const isSuccess = type === 'success';
	// Adjusted for better mobile positioning: fixed top-4 inset-x-4
	const baseClasses =
		'flex items-start gap-4 p-4 rounded-xl shadow-xl border w-full max-w-sm mx-auto';
	const colorClasses = isSuccess
		? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
		: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200';
	const Icon = isSuccess ? CheckCircle : XCircle;
	const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';

	return (
		<div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-[100] animate-in slide-in-from-top-5 fade-in-0 duration-300">
			<div className={`${baseClasses} ${colorClasses}`}>
				<Icon className={`h-6 w-6 flex-shrink-0 ${iconColor}`} />
				<div className="flex-1">
					<h4 className="font-semibold">{isSuccess ? 'Success' : 'Error'}</h4>
					<p className="text-sm">{message}</p>
				</div>
				<button
					onClick={onClose}
					className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

// Helper to get the current academic year, e.g., "2025-2026"
const getCurrentAcademicYear = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	// Assuming academic year starts in August
	if (month >= 8) {
		return `${year}-${year + 1}`;
	}
	return `${year - 1}-${year}`;
};

// Map for periods with user-friendly labels
const academicPeriodsMap = [
	{ value: 'first', label: 'First Period' },
	{ value: 'second', label: 'Second Period' },
	{ value: 'third', label: 'Third Period' },
	{ value: 'fourth', label: 'Fourth Period' },
	{ value: 'fifth', label: 'Fifth Period' },
	{ value: 'sixth', label: 'Sixth Period' },
	{ value: 'third_period_exam', label: 'Third Period Exam' },
	{ value: 'sixth_period_exam', label: 'Sixth Period Exam' },
];

// MultiSelect Component - Enhanced for responsiveness and UX
const MultiSelect = ({ options, selected, onChange, label }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');

	const handleDeselect = (optionValue) => {
		onChange(selected.filter((item) => item !== optionValue));
	};

	const handleSelect = (optionValue) => {
		if (!selected.includes(optionValue)) {
			onChange([...selected, optionValue]);
		}
	};

	const filteredOptions = options
		.filter((o) => !selected.includes(o.value))
		.filter((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

	return (
		<div className="relative w-full">
			<label className="block text-sm font-medium text-foreground mb-1">
				{label}
			</label>
			<div
				className="w-full rounded-xl border border-border bg-card shadow-sm text-left text-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-150"
				onClick={() => setIsOpen(true)}
			>
				<div className="flex flex-wrap gap-2 p-2 items-center min-h-[44px]">
					{selected.map((itemValue) => {
						const itemLabel =
							options.find((o) => o.value === itemValue)?.label || itemValue;
						return (
							<div
								key={itemValue}
								className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap"
							>
								{itemLabel}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation(); // Prevent opening the dropdown
										handleDeselect(itemValue);
									}}
									className="ml-1 p-0.5 rounded-full text-primary/70 hover:text-primary hover:bg-primary/20 transition-colors"
									aria-label={`Deselect ${itemLabel}`}
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						);
					})}
					{selected.length === 0 && (
						<span className="text-sm text-muted-foreground ml-1">
							Select periods...
						</span>
					)}
					<button
						type="button"
						onClick={() => setIsOpen(!isOpen)}
						className="ml-auto p-1 rounded-full text-muted-foreground hover:bg-muted"
						aria-expanded={isOpen}
						aria-label="Toggle select dropdown"
					>
						<ChevronDown
							className={`h-5 w-5 transition-transform duration-200 ${
								isOpen ? 'rotate-180' : 'rotate-0'
							}`}
						/>
					</button>
				</div>
			</div>
			{isOpen && (
				<div
					className="absolute z-20 mt-1 w-full rounded-xl bg-card shadow-2xl border border-border animate-in fade-in-0 slide-in-from-top-1"
					onMouseLeave={() => setIsOpen(false)}
					onBlur={() => setIsOpen(false)}
					tabIndex={-1}
				>
					<div className="p-2 border-b border-border">
						<input
							type="text"
							placeholder="Search periods..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full p-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
						/>
					</div>
					<ul className="max-h-60 rounded-b-xl py-1 text-base overflow-y-auto focus:outline-none text-sm">
						{filteredOptions.length > 0 ? (
							filteredOptions.map((option) => (
								<li
									key={option.value}
									onClick={() => {
										handleSelect(option.value);
										setSearchTerm('');
										// Keeping dropdown open for quick multiple selections, but closing on click-away
									}}
									className="text-foreground cursor-pointer select-none relative py-2 px-4 hover:bg-muted transition-colors"
								>
									<span className="font-medium block truncate">
										{option.label}
									</span>
								</li>
							))
						) : (
							<li className="text-muted-foreground px-4 py-2">
								{searchTerm
									? 'No matching periods found.'
									: 'All periods selected.'}
							</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
};

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
	return (
		<button
			type="button"
			onClick={onChange}
			disabled={disabled}
			className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${checked ? 'bg-primary' : 'bg-muted-foreground/50'}
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

// Settings Section Component - Added responsive gap and padding
const SettingsSection = ({ icon: Icon, title, description, children }) => {
	return (
		<div className="group rounded-xl border border-border bg-card p-4 sm:p-6 shadow-md transition-all duration-200 hover:shadow-lg">
			<div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
				{/* Icon Block */}
				<div className="rounded-xl bg-primary/10 p-3 flex-shrink-0">
					<Icon className="h-6 w-6 text-primary" />
				</div>
				{/* Content Block */}
				<div className="flex-1 space-y-4 w-full">
					<div className="border-b border-border/50 pb-4 sm:pb-0 sm:border-b-0">
						<h3 className="text-xl font-bold text-foreground">{title}</h3>
						{description && (
							<p className="text-sm text-muted-foreground mt-1">
								{description}
							</p>
						)}
					</div>
					{/* Settings Items container - now uses responsive gap */}
					<div className="space-y-4 pt-4 sm:pt-0">{children}</div>
				</div>
			</div>
		</div>
	);
};

// Settings Item Component - Clean and responsive
const SettingsItem = ({
	label,
	description,
	checked,
	onChange,
	disabled = false,
}) => {
	return (
		<div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:bg-muted">
			<div className="flex-1">
				<div className="font-semibold text-foreground capitalize text-base">
					{label}
				</div>
				{description && (
					<div className="text-sm text-muted-foreground mt-1">
						{description}
					</div>
				)}
			</div>
			<div className="flex-shrink-0 pt-1">
				<ToggleSwitch
					checked={checked}
					onChange={onChange}
					disabled={disabled}
				/>
			</div>
		</div>
	);
};

// Bulk Action Item Component - Critically enhanced for mobile stacking
const BulkActionItem = ({
	label,
	description,
	onActivate,
	onDeactivate,
	pendingAction,
	onClear,
	disabled = false,
}) => {
	return (
		<div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between">
				{/* Text Block */}
				<div className="flex-1 mb-4 sm:mb-0">
					<div className="font-semibold text-foreground text-base capitalize">
						{label}
					</div>
					{description && (
						<div className="text-sm text-muted-foreground mt-1">
							{description}
						</div>
					)}
					{pendingAction && (
						<div className="mt-2 flex items-center gap-2">
							<span
								className={`text-xs font-bold px-3 py-1 rounded-full ${
									pendingAction === 'activate'
										? 'bg-green-600/20 text-green-800 dark:text-green-300'
										: 'bg-red-600/20 text-red-800 dark:text-red-300'
								}`}
							>
								Pending:{' '}
								{pendingAction.charAt(0).toUpperCase() + pendingAction.slice(1)}
							</span>
							<button
								onClick={onClear}
								className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-white/10"
								title="Clear Pending Action"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					)}
				</div>
				{/* Button Group - Stacks vertically on mobile, horizontal on sm+ */}
				<div className="flex flex-col space-y-2 w-full sm:w-auto sm:flex-row sm:gap-2 sm:ml-4">
					<button
						onClick={onActivate}
						disabled={disabled || pendingAction === 'activate'}
						className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
					>
						<UserCheck className="h-4 w-4" />
						Activate All
					</button>
					<button
						onClick={onDeactivate}
						disabled={disabled || pendingAction === 'deactivate'}
						className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
					>
						<UserX className="h-4 w-4" />
						Deactivate All
					</button>
				</div>
			</div>
		</div>
	);
};

export default function Settings() {
	const currentAcademicYear = getCurrentAcademicYear();
	const school = useSchoolStore((state) => state.school);

	// State for settings
	const [studentSettings, setStudentSettings] = useState(null);
	const [teacherSettings, setTeacherSettings] = useState(null);
	const [administratorSettings, setAdministratorSettings] = useState(null);

	// State for pending bulk actions
	const [pendingBulkActions, setPendingBulkActions] = useState({});

	// State for UI feedback
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState({ type: '', message: '' });

	useEffect(() => {
		if (school && school.settings) {
			setStudentSettings(
				school.settings.studentSettings || {
					loginAccess: true,
					yearlyReportAccess: false,
					reportAccessPeriods: [],
				}
			);
			setTeacherSettings(
				school.settings.teacherSettings || {
					loginAccess: true,
					gradeSubmissionPeriods: [],
					gradeSubmissionAcademicYears: [currentAcademicYear],
					viewMastersAcademicYears: [currentAcademicYear],
					viewGradeSubmissionsAcademicYears: [currentAcademicYear],
					gradeChangeRequestAcademicYears: [currentAcademicYear],
					gradeChangeRequestPeriods: [],
				}
			);
			setAdministratorSettings(
				school.settings.administratorSettings || {
					loginAccess: true,
				}
			);
			setIsLoading(false);
		}
	}, [school, currentAcademicYear]);

	// Memoized setting handlers
	const toggleStudentSetting = useCallback(
		(setting) =>
			setStudentSettings((prev) => ({ ...prev, [setting]: !prev[setting] })),
		[]
	);
	const toggleTeacherSetting = useCallback(
		(setting) =>
			setTeacherSettings((prev) => ({ ...prev, [setting]: !prev[setting] })),
		[]
	);
	const toggleAdministratorSetting = useCallback(
		(setting) =>
			setAdministratorSettings((prev) => ({
				...prev,
				[setting]: !prev[setting],
			})),
		[]
	);
	const handleQueueBulkAction = useCallback(
		(category, action) =>
			setPendingBulkActions((prev) => ({ ...prev, [category]: action })),
		[]
	);
	const clearPendingBulkAction = useCallback((category) => {
		setPendingBulkActions((prev) => {
			const newActions = { ...prev };
			delete newActions[category];
			return newActions;
		});
	}, []);

	// Save handler
	const handleSaveSettings = async () => {
		setIsSaving(true);
		setFeedback({ type: '', message: '' });

		const allSettings = {
			studentSettings,
			teacherSettings,
			administratorSettings,
			bulkUserActions: pendingBulkActions,
		};

		try {
			// Mock API call to simulate saving
			await new Promise((resolve) => setTimeout(resolve, 1500));
			const isSuccess = Math.random() > 0.1; // 90% chance of success

			if (isSuccess) {
				setFeedback({
					type: 'success',
					message:
						'Settings saved successfully! Changes will be applied shortly.',
				});
				setPendingBulkActions({});
			} else {
				throw new Error('Server simulation failed to save settings.');
			}
		} catch (error) {
			console.error('Error saving settings:', error);
			setFeedback({
				type: 'error',
				message: error.message || 'An unknown error occurred during saving.',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const academicYears = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];

	const academicYearOptions = academicYears.map((year) => ({
		value: year,
		label: year,
	}));

	if (
		isLoading ||
		!studentSettings ||
		!teacherSettings ||
		!administratorSettings
	) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
				<Loader2 className="h-12 w-12 animate-spin text-primary" />
				<p className="mt-4 text-primary font-medium">Loading Settings...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
			{feedback.message && (
				<FeedbackToast
					type={feedback.type}
					message={feedback.message}
					onClose={() => setFeedback({ type: '', message: '' })}
				/>
			)}
			<div className="mx-auto max-w-5xl space-y-8">
				{/* Header - Enhanced for mobile typography */}
				<header className="text-center space-y-2 pb-4">
					<div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-4">
						<Cog className="h-8 w-8 text-primary" />
					</div>
					<h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
						System Settings
					</h1>
					<p className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto">
						Configure access controls, permissions, user management, and system
						behavior for your e-Potal.
					</p>
				</header>

				{/* Settings Sections Grid - Full width on mobile, better spacing on desktop */}
				<div className="space-y-6">
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

						{/* Student Report Access Periods */}
						<div className="mt-4 pt-4 border-t border-border">
							<h4 className="font-semibold text-lg text-foreground mb-3">
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
								label="Select periods students can view."
							/>
						</div>

						{/* Student Bulk Actions */}
						<div className="mt-6 pt-4 border-t border-border">
							<h4 className="font-semibold text-lg text-foreground mb-3">
								Bulk Student Management
							</h4>
							<BulkActionItem
								label="All Students"
								description="Activate or deactivate all student accounts system-wide. This change is pending until settings are saved."
								onActivate={() =>
									handleQueueBulkAction('all-students', 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction('all-students', 'deactivate')
								}
								pendingAction={pendingBulkActions['all-students']}
								onClear={() => clearPendingBulkAction('all-students')}
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
						<div className="mt-4 pt-4 border-t border-border">
							<h4 className="font-semibold text-lg text-foreground mb-3">
								Grade Submission Windows
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

						<div className="mt-6 pt-4 border-t border-border space-y-4">
							<h4 className="font-semibold text-lg text-foreground mb-3">
								Access Permissions
							</h4>
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

						<div className="mt-6 pt-4 border-t border-border">
							<h4 className="font-semibold text-lg text-foreground mb-3">
								Grade Change Request Windows
							</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

						{/* Teacher Bulk Actions */}
						<div className="mt-6 pt-4 border-t border-border">
							<h4 className="font-semibold text-lg text-foreground mb-3">
								Bulk Teacher Management
							</h4>
							<BulkActionItem
								label="All Teachers"
								description="Activate or deactivate all teacher accounts system-wide. This change is pending until settings are saved."
								onActivate={() =>
									handleQueueBulkAction('all-teachers', 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction('all-teachers', 'deactivate')
								}
								pendingAction={pendingBulkActions['all-teachers']}
								onClear={() => clearPendingBulkAction('all-teachers')}
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

						{/* Administrator Bulk Actions */}
						<div className="mt-6 pt-4 border-t border-border">
							<h4 className="font-semibold text-lg text-foreground mb-3">
								Bulk Administrator Management
							</h4>
							<BulkActionItem
								label="All Administrators"
								description="Activate or deactivate all administrator accounts system-wide. This change is pending until settings are saved."
								onActivate={() =>
									handleQueueBulkAction('all-administrators', 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction('all-administrators', 'deactivate')
								}
								pendingAction={pendingBulkActions['all-administrators']}
								onClear={() => clearPendingBulkAction('all-administrators')}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>
				</div>

				{/* Save Button - Always visible, sticky footer on mobile? */}
				<div className="sticky bottom-0 left-0 right-0 p-4 sm:p-6 bg-card/95 backdrop-blur-sm border-t border-border z-10">
					<div className="flex justify-center mx-auto max-w-lg">
						<button
							onClick={handleSaveSettings}
							disabled={isSaving}
							className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-lg font-bold shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 ${
								isSaving
									? 'bg-muted-foreground/30 text-white/70 cursor-not-allowed'
									: 'bg-primary text-white hover:bg-primary/90'
							}`}
						>
							{isSaving ? (
								<>
									<Loader2 className="h-5 w-5 animate-spin" />
									Saving Changes...
								</>
							) : (
								<>
									<Save className="h-5 w-5" />
									Save Settings
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
