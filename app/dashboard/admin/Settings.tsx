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
	XCircle,
} from 'lucide-react';

// Mock store for demo
const useSchoolStore = (selector) => {
	return selector({
		school: {
			settings: {
				studentSettings: {
					loginAccess: true,
					yearlyReportAccess: false,
					reportAccessPeriods: ['first', 'second'],
				},
				teacherSettings: {
					loginAccess: true,
					gradeSubmissionPeriods: ['first'],
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
};

// --- Reusable Feedback Toast Component ---
const FeedbackToast = ({ type, message, onClose }) => {
	useEffect(() => {
		const timer = setTimeout(onClose, 5000);
		return () => clearTimeout(timer);
	}, [onClose]);

	const isSuccess = type === 'success';
	const Icon = isSuccess ? CheckCircle : XCircle;

	return (
		<div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[100] animate-in slide-in-from-top-5 fade-in-0 duration-300">
			<div
				className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border ${
					isSuccess
						? 'bg-green-50 border-green-200 text-green-800'
						: 'bg-red-50 border-red-200 text-red-800'
				}`}
			>
				<Icon
					className={`h-5 w-5 flex-shrink-0 ${
						isSuccess ? 'text-green-500' : 'text-red-500'
					}`}
				/>
				<div className="flex-1 min-w-0">
					<h4 className="font-semibold text-sm">
						{isSuccess ? 'Success' : 'Error'}
					</h4>
					<p className="text-xs mt-0.5 break-words">{message}</p>
				</div>
				<button
					onClick={onClose}
					className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
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

// Improved MultiSelect with better mobile responsiveness
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
		<div className="relative w-full">
			<label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
				{label}
			</label>
			<div className="w-full rounded-lg border border-gray-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
				<div className="flex flex-wrap gap-1.5 items-center min-h-[32px]">
					{selected.map((itemValue) => {
						const itemLabel =
							options.find((o) => o.value === itemValue)?.label || itemValue;
						return (
							<div
								key={itemValue}
								className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
							>
								<span className="max-w-[120px] sm:max-w-none truncate">
									{itemLabel}
								</span>
								<button
									type="button"
									onClick={() => handleDeselect(itemValue)}
									className="flex-shrink-0 text-blue-600 hover:text-blue-800"
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
							<span className="text-gray-500 truncate">
								{selected.length === 0 ? 'Select...' : 'Add...'}
							</span>
							<ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
						</button>
						{isOpen && (
							<>
								<div
									className="fixed inset-0 z-10"
									onClick={() => setIsOpen(false)}
								/>
								<div className="absolute z-20 mt-1 w-full sm:w-auto sm:min-w-[200px] rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto">
									<ul className="py-1">
										{options
											.filter((o) => !selected.includes(o.value))
											.map((option) => (
												<li
													key={option.value}
													onClick={() => {
														handleSelect(option.value);
														setIsOpen(false);
													}}
													className="text-gray-900 cursor-pointer select-none px-3 py-2 hover:bg-gray-100 text-sm"
												>
													{option.label}
												</li>
											))}
										{options.filter((o) => !selected.includes(o.value))
											.length === 0 && (
											<li className="text-gray-400 px-3 py-2 text-sm">
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

// Improved Toggle Switch
const ToggleSwitch = ({ checked, onChange, disabled = false }) => {
	return (
		<button
			type="button"
			onClick={onChange}
			disabled={disabled}
			className={`
				relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
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

// Improved Settings Section with better mobile layout
const SettingsSection = ({ icon: Icon, title, description, children }) => {
	return (
		<div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
			<div className="flex items-start gap-3 sm:gap-4 mb-4">
				<div className="rounded-lg bg-blue-100 p-2 sm:p-3 flex-shrink-0">
					<Icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="text-base sm:text-lg font-semibold text-gray-900">
						{title}
					</h3>
					{description && (
						<p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
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
		<div className="flex items-start sm:items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3 sm:p-4">
			<div className="flex-1 min-w-0">
				<div className="font-medium text-gray-900 text-sm sm:text-base capitalize break-words">
					{label}
				</div>
				{description && (
					<div className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
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
	pendingAction,
	onClear,
	disabled = false,
}) => {
	return (
		<div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 sm:p-4">
			<div className="space-y-3">
				<div className="flex-1 min-w-0">
					<div className="font-medium text-gray-900 text-sm sm:text-base capitalize break-words">
						{label}
					</div>
					{description && (
						<div className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
							{description}
						</div>
					)}
					{pendingAction && (
						<div className="mt-2 flex items-center gap-2 flex-wrap">
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
				</div>
			</div>
		</div>
	);
};

export default function Settings() {
	const currentAcademicYear = getCurrentAcademicYear();
	const school = useSchoolStore((state) => state.school);

	const [studentSettings, setStudentSettings] = useState(null);
	const [teacherSettings, setTeacherSettings] = useState(null);
	const [administratorSettings, setAdministratorSettings] = useState(null);
	const [pendingBulkActions, setPendingBulkActions] = useState({});
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

	const handleSaveSettings = async () => {
		setIsSaving(true);
		setFeedback({ type: '', message: '' });

		const allSettings = {
			studentSettings,
			teacherSettings,
			administratorSettings,
			bulkUserActions: pendingBulkActions,
		};

		// Simulate API call
		setTimeout(() => {
			setFeedback({
				type: 'success',
				message:
					'Settings saved successfully! Changes will be applied shortly.',
			});
			setPendingBulkActions({});
			setIsSaving(false);
		}, 1000);
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
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-3 sm:p-6">
			{feedback.message && (
				<FeedbackToast
					type={feedback.type}
					message={feedback.message}
					onClose={() => setFeedback({ type: '', message: '' })}
				/>
			)}
			<div className="mx-auto max-w-4xl space-y-4 sm:space-y-8">
				{/* Header */}
				<div className="text-center space-y-2 px-2">
					<div className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2 sm:p-3 mb-2 sm:mb-4">
						<Cog className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
						System Settings
					</h1>
					<p className="text-xs sm:text-sm text-gray-600 max-w-3xl mx-auto">
						Configure access controls, permissions, user management, and system
						behavior for your e-Portal.
					</p>
				</div>

				{/* Settings Sections */}
				<div className="space-y-4 sm:space-y-6">
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

						<div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
							<h4 className="font-medium text-gray-900 text-sm sm:text-base">
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

						<div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
							<h4 className="font-medium text-gray-900 text-sm sm:text-base">
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

						<div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
							<h4 className="font-medium text-gray-900 text-sm sm:text-base">
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

						<div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
							<h4 className="font-medium text-gray-900 text-sm sm:text-base">
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

						<div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
							<h4 className="font-medium text-gray-900 text-sm sm:text-base">
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

						<div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
							<h4 className="font-medium text-gray-900 text-sm sm:text-base">
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

						<div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-3">
							<h4 className="font-medium text-gray-900 text-sm sm:text-base">
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

				{/* Save Button - Fixed on mobile */}
				<div className="sticky bottom-0 left-0 right-0 bg-gray-50 pt-4 pb-6 sm:pb-8 sm:static">
					<div className="flex justify-center px-3">
						<button
							onClick={handleSaveSettings}
							disabled={isSaving}
							className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-6 sm:px-8 py-3 text-sm font-medium shadow-lg sm:shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
								isSaving
									? 'bg-gray-300 text-gray-500 cursor-not-allowed'
									: 'bg-blue-600 text-white hover:bg-blue-700'
							}`}
						>
							{isSaving ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
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
		</div>
	);
}
