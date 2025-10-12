'use client';
import React, { useState, useEffect } from 'react';
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
	XCircle, // Import XCircle for error icon
} from 'lucide-react';
import { useSchoolStore } from '@/store/schoolStore';

// --- Reusable Feedback Toast Component ---
const FeedbackToast = ({ type, message, onClose }) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 5000); // Auto-dismiss after 5 seconds

		return () => clearTimeout(timer);
	}, [onClose]);

	const isSuccess = type === 'success';
	const baseClasses =
		'flex items-start gap-4 p-4 rounded-lg shadow-lg border w-full max-w-sm';
	const colorClasses = isSuccess
		? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
		: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200';
	const Icon = isSuccess ? CheckCircle : XCircle;
	const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';

	return (
		<div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-5 fade-in-0 duration-300">
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
	const month = now.getMonth() + 1; // getMonth() is 0-indexed
	// Assuming academic year starts in August
	if (month >= 8) {
		return `${year}-${year + 1}`;
	}
	return `${year - 1}-${year}`;
};

// MODIFICATION: Create a map for periods with user-friendly labels
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

// MODIFICATION: Update MultiSelect to handle an array of objects
const MultiSelect = ({ options, selected, onChange, label }) => {
	const [isOpen, setIsOpen] = useState(false);

	const handleDeselect = (optionValue) => {
		onChange(selected.filter((item) => item !== optionValue));
	};

	const handleSelect = (optionValue) => {
		if (!selected.includes(optionValue)) {
			onChange([...selected, optionValue]);
		}
	};

	return (
		<div className="relative">
			<label className="block text-sm font-medium text-foreground mb-1">
				{label}
			</label>
			<div className="w-full rounded-lg border border-border bg-background p-2 text-left text-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
				<div className="flex flex-wrap gap-2 items-center">
					{selected.map((itemValue) => {
						const itemLabel =
							options.find((o) => o.value === itemValue)?.label || itemValue;
						return (
							<div
								key={itemValue}
								className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full"
							>
								{itemLabel}
								<button
									type="button"
									onClick={() => handleDeselect(itemValue)}
									className="ml-1 text-primary/70 hover:text-primary"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						);
					})}
					<div className="relative flex-1" style={{ minWidth: '100px' }}>
						<button
							type="button"
							onClick={() => setIsOpen(!isOpen)}
							className="w-full text-left bg-transparent focus:outline-none flex justify-between items-center"
						>
							<span className="text-muted-foreground">
								{selected.length === 0 ? 'Select...' : 'Add...'}
							</span>
							<ChevronDown className="h-5 w-5 text-muted-foreground" />
						</button>
						{isOpen && (
							<div
								className="absolute z-10 mt-1 w-full rounded-md bg-card shadow-lg border border-border"
								onMouseLeave={() => setIsOpen(false)}
							>
								<ul className="max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
									{options
										.filter((o) => !selected.includes(o.value))
										.map((option) => (
											<li
												key={option.value}
												onClick={() => {
													handleSelect(option.value);
													setIsOpen(false);
												}}
												className="text-foreground cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-muted"
											>
												<span className="font-normal block truncate">
													{option.label}
												</span>
											</li>
										))}
								</ul>
							</div>
						)}
					</div>
				</div>
			</div>
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

// Settings Section Component
const SettingsSection = ({ icon: Icon, title, description, children }) => {
	return (
		<div className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md">
			<div className="flex items-start gap-4">
				<div className="rounded-lg bg-primary/10 p-3">
					<Icon className="h-5 w-5 text-primary" />
				</div>
				<div className="flex-1 space-y-4">
					<div>
						<h3 className="text-lg font-semibold text-foreground">{title}</h3>
						{description && (
							<p className="text-sm text-muted-foreground mt-1">
								{description}
							</p>
						)}
					</div>
					<div className="space-y-3">{children}</div>
				</div>
			</div>
		</div>
	);
};

// Settings Item Component
const SettingsItem = ({
	label,
	description,
	checked,
	onChange,
	disabled = false,
}) => {
	return (
		<div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:bg-muted">
			<div className="flex-1">
				<div className="font-medium text-foreground capitalize">{label}</div>
				{description && (
					<div className="text-sm text-muted-foreground mt-1">
						{description}
					</div>
				)}
			</div>
			<ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
		</div>
	);
};

// Bulk Action Item Component with explicit buttons
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
		<div className="rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:bg-muted">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between">
				<div className="flex-1 mb-3 sm:mb-0">
					<div className="font-medium text-foreground capitalize">{label}</div>
					{description && (
						<div className="text-sm text-muted-foreground mt-1">
							{description}
						</div>
					)}
					{pendingAction && (
						<div className="mt-2 flex items-center gap-2">
							<span
								className={`text-xs font-bold px-2 py-1 rounded-md ${
									pendingAction === 'activate'
										? 'bg-green-100 text-green-800'
										: 'bg-red-100 text-red-800'
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
				<div className="flex gap-2 ml-auto sm:ml-4 flex-shrink-0">
					<button
						onClick={onActivate}
						disabled={disabled || pendingAction === 'activate'}
						className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
					>
						<UserCheck className="h-4 w-4" />
						Activate All
					</button>
					<button
						onClick={onDeactivate}
						disabled={disabled || pendingAction === 'deactivate'}
						className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
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
	// MODIFICATION: Use an object for feedback to include type and message
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

	// Setting handlers remain the same
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
	};

	// MODIFICATION: Updated save handler to show toast notifications
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
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(allSettings),
			});

			const result = await response.json();

			if (response.ok && result.success) {
				setFeedback({
					type: 'success',
					message:
						'Settings saved successfully! Changes will be applied shortly.',
				});
				setPendingBulkActions({});
			} else {
				throw new Error(result.message || 'Failed to save settings');
			}
		} catch (error: any) {
			console.error('Error saving settings:', error);
			setFeedback({
				type: 'error',
				message: error.message || 'An unknown error occurred.',
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
			<div className="flex items-center justify-center h-screen bg-background">
				<Loader2 className="h-12 w-12 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background p-6">
			{/* MODIFICATION: Render FeedbackToast component when there is a message */}
			{feedback.message && (
				<FeedbackToast
					type={feedback.type}
					message={feedback.message}
					onClose={() => setFeedback({ type: '', message: '' })}
				/>
			)}
			<div className="mx-auto max-w-4xl space-y-8">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-4">
						<Cog className="h-8 w-8 text-primary" />
					</div>
					<h1 className="text-3xl font-bold text-foreground">
						System Settings
					</h1>
					<p className="text-muted-foreground max-w-3xl mx-auto">
						Configure access controls, permissions, user management, and system
						behavior for your e-Potal.
					</p>
				</div>

				{/* Settings Sections */}
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
							<h4 className="font-medium text-foreground mb-3">
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

						{/* Student Bulk Actions */}
						<div className="mt-4 pt-4 border-t border-border">
							<h4 className="font-medium text-foreground mb-3">
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
							<h4 className="font-medium text-foreground mb-3">
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

						<div className="mt-4 pt-4 border-t border-border">
							<h4 className="font-medium text-foreground mb-3">Permissions</h4>
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

						<div className="mt-4 pt-4 border-t border-border">
							<h4 className="font-medium text-foreground mb-3">
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
						<div className="mt-4 pt-4 border-t border-border">
							<h4 className="font-medium text-foreground mb-3">
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
						<div className="mt-4 pt-4 border-t border-border">
							<h4 className="font-medium text-foreground mb-3">
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
								pendingAction={pendingBulkActions['all-administrators']}
								onClear={() => clearPendingBulkAction('all-administrators')}
								disabled={isSaving}
							/>
						</div>
					</SettingsSection>
				</div>

				{/* Save Button */}
				<div className="flex justify-center pt-8">
					<button
						onClick={handleSaveSettings}
						disabled={isSaving}
						className={`inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
							isSaving
								? 'bg-muted text-muted-foreground cursor-not-allowed'
								: 'bg-primary text-primary-foreground hover:bg-primary/90'
						}`}
					>
						{isSaving ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
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
		</div>
	);
}
