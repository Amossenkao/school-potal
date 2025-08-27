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
	BookOpen,
	UserCog,
} from 'lucide-react';

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
	return (
		<button
			type="button"
			onClick={onChange}
			disabled={disabled}
			className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${checked ? 'bg-blue-600' : 'bg-gray-300'}
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
		<div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
			<div className="flex items-start gap-4">
				<div className="rounded-lg bg-blue-50 p-3">
					<Icon className="h-5 w-5 text-blue-600" />
				</div>
				<div className="flex-1 space-y-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
						{description && (
							<p className="text-sm text-gray-600 mt-1">{description}</p>
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
		<div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-gray-100">
			<div className="flex-1">
				<div className="font-medium text-gray-900 capitalize">{label}</div>
				{description && (
					<div className="text-sm text-gray-600 mt-1">{description}</div>
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
		<div className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-gray-100">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between">
				<div className="flex-1 mb-3 sm:mb-0">
					<div className="font-medium text-gray-900 capitalize">{label}</div>
					{description && (
						<div className="text-sm text-gray-600 mt-1">{description}</div>
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
								className="text-gray-500 hover:text-gray-700"
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
	// State for student settings
	const [studentSettings, setStudentSettings] = useState({
		loginAccess: true,
		periodicReportAccess: false,
		yearlyReportAccess: false,
		reportAccessPeriods: [],
	});

	// State for teacher settings
	const [teacherSettings, setTeacherSettings] = useState({
		loginAccess: true,
		gradeSubmissionPeriods: [],
	});

	// State for administrator settings
	const [administratorSettings, setAdministratorSettings] = useState({
		loginAccess: true,
	});

	// State for pending bulk actions
	const [pendingBulkActions, setPendingBulkActions] = useState({});

	// State for UI feedback
	const [isSaving, setIsSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);

	// Student setting handlers
	const toggleStudentSetting = (setting) => {
		setStudentSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
	};

	const handleStudentPeriodChange = (period) => {
		setStudentSettings((prev) => ({
			...prev,
			reportAccessPeriods: prev.reportAccessPeriods.includes(period)
				? prev.reportAccessPeriods.filter((p) => p !== period)
				: [...prev.reportAccessPeriods, period],
		}));
	};

	// Teacher setting handlers
	const toggleTeacherSetting = (setting) => {
		setTeacherSettings((prev) => ({ ...prev, [setting]: !prev[setting] }));
	};

	const handleTeacherPeriodChange = (period) => {
		setTeacherSettings((prev) => ({
			...prev,
			gradeSubmissionPeriods: prev.gradeSubmissionPeriods.includes(period)
				? prev.gradeSubmissionPeriods.filter((p) => p !== period)
				: [...prev.gradeSubmissionPeriods, period],
		}));
	};

	// Administrator setting handlers
	const toggleAdministratorSetting = (setting) => {
		setAdministratorSettings((prev) => ({
			...prev,
			[setting]: !prev[setting],
		}));
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
			studentSettings,
			teacherSettings,
			administratorSettings,
			bulkUserActions: pendingBulkActions,
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

	const academicPeriods = [
		'first',
		'second',
		'third-period-exam',
		'fourth',
		'fifth',
		'sixth-period-exam',
	];

	const periodDescriptions = {
		first: 'First academic period of the year',
		second: 'Second academic period of the year',
		'third-period-exam': 'Third period examination period',
		fourth: 'Fourth academic period of the year',
		fifth: 'Fifth academic period of the year',
		'sixth-period-exam': 'Sixth period examination period',
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="mx-auto max-w-4xl space-y-8">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="inline-flex items-center justify-center rounded-full bg-blue-50 p-3 mb-4">
						<Cog className="h-8 w-8 text-blue-600" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
					<p className="text-gray-600 max-w-2xl mx-auto">
						Configure access controls, permissions, user management, and system
						behavior for your academic management platform.
					</p>
				</div>

				{/* Success Message */}
				{saveSuccess && (
					<div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
						<CheckCircle className="h-5 w-5 text-green-600" />
						<p className="text-green-800 font-medium">
							Settings saved successfully! Changes will be applied shortly.
						</p>
					</div>
				)}

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
							label="Periodic Report Access"
							description="Enable students to view periodic reports"
							checked={studentSettings.periodicReportAccess}
							onChange={() => toggleStudentSetting('periodicReportAccess')}
						/>
						<SettingsItem
							label="Yearly Report Access"
							description="Allow students to access yearly academic reports"
							checked={studentSettings.yearlyReportAccess}
							onChange={() => toggleStudentSetting('yearlyReportAccess')}
						/>

						{/* Student Report Access Periods */}
						<div className="mt-4 pt-4 border-t border-gray-200">
							<h4 className="font-medium text-gray-900 mb-3">
								Report Access Periods
							</h4>
							<p className="text-sm text-gray-600 mb-4">
								Select which academic periods students can access reports for
							</p>
							<div className="grid gap-2">
								{academicPeriods.map((period) => (
									<SettingsItem
										key={period}
										label={period.replace(/-/g, ' ')}
										description={periodDescriptions[period]}
										checked={studentSettings.reportAccessPeriods.includes(
											period
										)}
										onChange={() => handleStudentPeriodChange(period)}
									/>
								))}
							</div>
						</div>

						{/* Student Bulk Actions */}
						<div className="mt-4 pt-4 border-t border-gray-200">
							<h4 className="font-medium text-gray-900 mb-3">
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

						{/* Teacher Grade Submission Periods */}
						<div className="mt-4 pt-4 border-t border-gray-200">
							<h4 className="font-medium text-gray-900 mb-3">
								Grade Submission Periods
							</h4>
							<p className="text-sm text-gray-600 mb-4">
								Define which academic periods teachers can submit grades for
							</p>
							<div className="grid gap-2">
								{academicPeriods.map((period) => (
									<SettingsItem
										key={period}
										label={period.replace(/-/g, ' ')}
										description={periodDescriptions[period]}
										checked={teacherSettings.gradeSubmissionPeriods.includes(
											period
										)}
										onChange={() => handleTeacherPeriodChange(period)}
									/>
								))}
							</div>
						</div>

						{/* Teacher Bulk Actions */}
						<div className="mt-4 pt-4 border-t border-gray-200">
							<h4 className="font-medium text-gray-900 mb-3">
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
						<div className="mt-4 pt-4 border-t border-gray-200">
							<h4 className="font-medium text-gray-900 mb-3">
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
						className={`inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
							isSaving
								? 'bg-gray-300 text-gray-600 cursor-not-allowed'
								: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
						}`}
					>
						{isSaving ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"></div>
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
