'use client';
import React, { useState } from 'react';
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
} from 'lucide-react';

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
	return (
		<button
			type="button"
			onClick={onChange}
			disabled={disabled}
			className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
        ${checked ? 'bg-primary' : 'bg-muted'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
		>
			<span
				className={`
          inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition-transform duration-200 ease-in-out
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
		<div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4 transition-colors hover:bg-muted/30">
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
		<div className="rounded-lg border border-border/50 bg-background/50 p-4 transition-colors hover:bg-muted/30">
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
						className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
					>
						<UserCheck className="h-4 w-4" />
						Activate All
					</button>
					<button
						onClick={onDeactivate}
						disabled={disabled || pendingAction === 'deactivate'}
						className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
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
	// State for settings that are toggled
	const [loginSettings, setLoginSettings] = useState({
		students: true,
		teachers: true,
		administrators: true,
	});

	const [reportAccess, setReportAccess] = useState({
		periodic: true,
		yearly: true,
	});

	const [gradeSubmissionPeriods, setGradeSubmissionPeriods] = useState([
		'first',
		'second',
	]);

	// State for pending bulk actions
	const [pendingBulkActions, setPendingBulkActions] = useState({});

	// State for UI feedback
	const [isSaving, setIsSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);

	const toggleLoginSetting = (role) => {
		setLoginSettings((prev) => ({ ...prev, [role]: !prev[role] }));
	};

	const toggleReportAccess = (type) => {
		setReportAccess((prev) => ({ ...prev, [type]: !prev[type] }));
	};

	const handlePeriodChange = (period) => {
		setGradeSubmissionPeriods((prev) =>
			prev.includes(period)
				? prev.filter((p) => p !== period)
				: [...prev, period]
		);
	};

	// Queue a bulk action instead of executing it immediately
	const handleQueueBulkAction = (category, action) => {
		setPendingBulkActions((prev) => ({
			...prev,
			[category]: action,
		}));
	};

	// Clear a pending bulk action
	const clearPendingBulkAction = (category) => {
		setPendingBulkActions((prev) => {
			const newActions = { ...prev };
			delete newActions[category];
			return newActions;
		});
	};

	// The single function to save all settings and actions
	const handleSaveSettings = async () => {
		setIsSaving(true);
		setSaveSuccess(false);

		// Collect all settings and pending actions
		const allSettings = {
			accessControl: loginSettings,
			reportAccess: reportAccess,
			academicPeriods: gradeSubmissionPeriods,
			bulkUserActions: pendingBulkActions, // Send the queued actions
			timestamp: new Date().toISOString(),
		};

		try {
			// Simulate a single API call for all settings and actions
			console.log('Saving settings and actions:', allSettings);

			// await fetch('/api/settings/save-all', {
			//   method: 'POST',
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify(allSettings)
			// });

			await new Promise((resolve) => setTimeout(resolve, 1500));

			setSaveSuccess(true);
			setPendingBulkActions({}); // Clear pending actions on success
			setTimeout(() => setSaveSuccess(false), 3000);
		} catch (error) {
			console.error('Error saving settings:', error);
			// Handle error (show error message, etc.)
		} finally {
			setIsSaving(false);
		}
	};

	const roleDescriptions = {
		students: 'Allow students to login to the portal',
		teachers: 'Allow teachers to login to the portal',
		administrators: 'Allow school administrators to login to the portal',
	};

	const reportDescriptions = {
		periodic: 'Enable access to periodic reports',
		yearly: 'Allow access to yearly academic reports',
	};

	const periodDescriptions = {
		first: 'First academic period of the year',
		second: 'Second academic period of the year',
		'third-period-exam': 'Third period examination period',
		fourth: 'Fourth academic period of the year',
		fifth: 'Fifth academic period of the year',
		'sixth-period-exam': 'Sixth period examination period',
	};

	const bulkActionCategories = {
		roles: [
			{
				key: 'all-students',
				label: 'All Students',
				description: 'Activate or deactivate all student accounts system-wide',
			},
			{
				key: 'all-teachers',
				label: 'All Teachers',
				description: 'Manage activation status for all teacher accounts',
			},
			{
				key: 'all-administrators',
				label: 'All Administrators',
				description: 'Control access for all administrative accounts',
			},
		],
		studentHierarchy: [
			{
				key: 'kindergarten',
				label: 'Kindergarten Students',
				description: 'Manage all students in kindergarten level',
			},
			{
				key: 'elementary',
				label: 'Elementary Students',
				description: 'Control access for elementary level students',
			},
			{
				key: 'junior-high',
				label: 'Junior High Students',
				description: 'Manage junior high school student accounts',
			},
			{
				key: 'senior-high',
				label: 'Senior High Students',
				description: 'Control access for senior high school students',
			},
			{
				key: 'specific-class',
				label: 'Specific Class',
				description: 'Target activation/deactivation for individual classes',
			},
		],
	};

	const academicPeriods = [
		'first',
		'second',
		'third-period-exam',
		'fourth',
		'fifth',
		'sixth-period-exam',
	];

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="mx-auto max-w-4xl space-y-8">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-4">
						<Cog className="h-8 w-8 text-primary" />
					</div>
					<h1 className="text-3xl font-bold text-foreground">
						System Settings
					</h1>
					<p className="text-muted-foreground max-w-2xl mx-auto">
						Configure access controls, permissions, user management, and system
						behavior for your academic management platform.
					</p>
				</div>

				{/* Success Message */}
				{saveSuccess && (
					<div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
						<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
						<p className="text-green-800 dark:text-green-200 font-medium">
							Settings saved successfully! Changes will be applied shortly.
						</p>
					</div>
				)}

				{/* Settings Sections */}
				<div className="space-y-6">
					{/* Login Control */}
					<SettingsSection
						icon={Shield}
						title="Access Control"
						description="Manage who can access the system and when"
					>
						{Object.entries(loginSettings).map(([role, enabled]) => (
							<SettingsItem
								key={role}
								label={role}
								description={roleDescriptions[role]}
								checked={enabled}
								onChange={() => toggleLoginSetting(role)}
							/>
						))}
					</SettingsSection>

					{/* Report Access */}
					<SettingsSection
						icon={FileText}
						title="Report Generation"
						description="Control which reports can be generated and accessed"
					>
						{Object.entries(reportAccess).map(([type, enabled]) => (
							<SettingsItem
								key={type}
								label={`${type} reports`}
								description={reportDescriptions[type]}
								checked={enabled}
								onChange={() => toggleReportAccess(type)}
							/>
						))}
					</SettingsSection>

					{/* Grade Submission Periods */}
					<SettingsSection
						icon={Calendar}
						title="Academic Periods"
						description="Define which grading periods are active for submissions"
					>
						{academicPeriods.map((period) => (
							<SettingsItem
								key={period}
								label={period.replace(/-/g, ' ')}
								description={periodDescriptions[period]}
								checked={gradeSubmissionPeriods.includes(period)}
								onChange={() => handlePeriodChange(period)}
							/>
						))}
					</SettingsSection>

					{/* Bulk User Management by Role */}
					<SettingsSection
						icon={Users}
						title="Bulk User Management"
						description="Queue actions to activate or deactivate user accounts in bulk. Changes are applied on save."
					>
						{bulkActionCategories.roles.map((category) => (
							<BulkActionItem
								key={category.key}
								label={category.label}
								description={category.description}
								onActivate={() =>
									handleQueueBulkAction(category.key, 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction(category.key, 'deactivate')
								}
								pendingAction={pendingBulkActions[category.key]}
								onClear={() => clearPendingBulkAction(category.key)}
								disabled={isSaving}
							/>
						))}
					</SettingsSection>

					{/* Bulk Student Management by Hierarchy */}
					<SettingsSection
						icon={GraduationCap}
						title="Student Hierarchy Management"
						description="Queue actions for student accounts by educational level. Changes are applied on save."
					>
						{bulkActionCategories.studentHierarchy.map((category) => (
							<BulkActionItem
								key={category.key}
								label={category.label}
								description={category.description}
								onActivate={() =>
									handleQueueBulkAction(category.key, 'activate')
								}
								onDeactivate={() =>
									handleQueueBulkAction(category.key, 'deactivate')
								}
								pendingAction={pendingBulkActions[category.key]}
								onClear={() => clearPendingBulkAction(category.key)}
								disabled={isSaving}
							/>
						))}
					</SettingsSection>
				</div>

				{/* Save Button */}
				<div className="flex justify-center pt-8">
					<button
						onClick={handleSaveSettings}
						disabled={isSaving}
						className={`inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
							isSaving
								? 'bg-muted text-muted-foreground cursor-not-allowed'
								: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
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
								Save Configuration
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
