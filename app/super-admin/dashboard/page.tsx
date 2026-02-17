'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	Bell,
	Building2,
	ChevronDown,
	ChevronRight,
	LogOut,
	Menu,
	Plus,
	RefreshCcw,
	School,
	Shield,
	Trash2,
	Users,
} from 'lucide-react';

type NavKey = 'schools' | 'add-school' | 'notifications';
type UserTabKey = 'students' | 'teachers' | 'administrators' | 'systemAdmins';

type SchoolSummary = {
	id: string;
	host: string;
	dbName: string;
	shortName: string;
	displayName: string;
	logoUrl?: string;
	tagline: string;
	description: string;
	isActive: boolean;
	themeName?: string;
	sysAdminProfile: {
		name: string;
		phone: string;
		email?: string;
		office: string;
	};
	systemAdminUser: {
		id: string;
		username: string;
		firstName: string;
		lastName: string;
		phone: string;
		email?: string;
		isActive: boolean;
	} | null;
};

type ActiveUser = {
	id: string;
	name: string;
	username: string;
	phone?: string;
	email?: string;
	isActive: boolean;
	role: 'student' | 'teacher' | 'administrator' | 'system_admin';
	details?: Record<string, unknown>;
};

type SchoolDetails = {
	school: SchoolSummary;
	profile: Record<string, unknown>;
	academicYears: string[];
	selectedAcademicYear: string;
	activeUsers: {
		students: ActiveUser[];
		teachers: ActiveUser[];
		administrators: ActiveUser[];
		systemAdmins: ActiveUser[];
	};
	activeUserCounts: {
		students: number;
		teachers: number;
		administrators: number;
		systemAdmins: number;
	};
};

type AdminForm = {
	name: string;
	username: string;
	phone: string;
	email: string;
	office: string;
	password: string;
	isActive: boolean;
};

type AddSchoolForm = {
	displayName: string;
	shortName: string;
	host: string;
	dbName: string;
	initials: string;
	studentIdPrefix: string;
	slogan: string;
	tagline: string;
	description: string;
	logoUrl: string;
	logoUrl2: string;
	themeName: string;
	yearFounded: string;
	firstAcademicYear: string;
	currentAcademicYear: string;
	address: string;
	phones: string;
	emails: string;
	hours: string;
	sysAdminName: string;
	sysAdminPhone: string;
	sysAdminEmail: string;
	sysAdminOffice: string;
	administrativePositionsJson: string;
	enabledFeaturesJson: string;
	roleFeatureAccessJson: string;
	classLevelsJson: string;
	settingsJson: string;
	isActive: boolean;
};

type SuperAdminNotification = {
	id: string;
	title: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error';
	createdAt: string;
};

const navItems: Array<{ id: NavKey; label: string; icon: typeof School }> = [
	{ id: 'schools', label: 'Schools', icon: School },
	{ id: 'add-school', label: 'Add School', icon: Plus },
	{ id: 'notifications', label: 'Notifications', icon: Bell },
];

const userTabs: Array<{ id: UserTabKey; label: string }> = [
	{ id: 'students', label: 'Students' },
	{ id: 'teachers', label: 'Teachers' },
	{ id: 'administrators', label: 'Administrators' },
	{ id: 'systemAdmins', label: 'System Admin' },
];

const initialAddSchoolForm: AddSchoolForm = {
	displayName: '',
	shortName: '',
	host: '',
	dbName: '',
	initials: '',
	studentIdPrefix: '',
	slogan: '',
	tagline: 'Connecting Schools. Empowering Learning.',
	description: '',
	logoUrl: '',
	logoUrl2: '',
	themeName: 'horizon',
	yearFounded: '',
	firstAcademicYear: '',
	currentAcademicYear: '',
	address: '',
	phones: '',
	emails: '',
	hours: '',
	sysAdminName: '',
	sysAdminPhone: '',
	sysAdminEmail: '',
	sysAdminOffice: 'Main Office',
	administrativePositionsJson:
		'[\n  {"id":"principal","name":"Principal"},\n  {"id":"vice_principal","name":"Vice Principal"}\n]',
	enabledFeaturesJson: '',
	roleFeatureAccessJson: '',
	classLevelsJson: '',
	settingsJson: '',
	isActive: true,
};

const emptyAdminForm: AdminForm = {
	name: '',
	username: '',
	phone: '',
	email: '',
	office: 'Main Office',
	password: '',
	isActive: true,
};

const parseOptionalJson = (label: string, value: string) => {
	if (!value.trim()) return undefined;
	try {
		return JSON.parse(value);
	} catch {
		throw new Error(`${label} JSON is invalid.`);
	}
};

const toStringArray = (value: string) =>
	value
		.split(/\n|,/)
		.map((entry) => entry.trim())
		.filter(Boolean);

const formatDateTime = (value?: string) => {
	if (!value) return '-';
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const roleLabel = (role: ActiveUser['role']) => {
	if (role === 'student') return 'Student';
	if (role === 'teacher') return 'Teacher';
	if (role === 'administrator') return 'Administrator';
	return 'System Admin';
};

const tone = (type: SuperAdminNotification['type']) => {
	if (type === 'success') return 'bg-[#22A06B]/10 border-[#22A06B]/30 text-[#0E7A4C]';
	if (type === 'warning') return 'bg-[#F4C542]/18 border-[#F4C542]/35 text-[#7A5A00]';
	if (type === 'error') return 'bg-[#D62828]/10 border-[#D62828]/30 text-[#A61C1C]';
	return 'bg-[#0B3A6E]/8 border-[#0B3A6E]/25 text-[#0B3A6E]';
};

export default function SuperAdminDashboardPage() {
	const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [activeNav, setActiveNav] = useState<NavKey>('schools');
	const [schools, setSchools] = useState<SchoolSummary[]>([]);
	const [selectedSchoolId, setSelectedSchoolId] = useState('');
	const [schoolDetails, setSchoolDetails] = useState<SchoolDetails | null>(null);
	const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
	const [activeUserTab, setActiveUserTab] = useState<UserTabKey>('students');
	const [adminForm, setAdminForm] = useState<AdminForm>(emptyAdminForm);
	const [addSchoolForm, setAddSchoolForm] = useState<AddSchoolForm>(initialAddSchoolForm);
	const [notifications, setNotifications] = useState<SuperAdminNotification[]>([]);
	const [isLoadingSchools, setIsLoadingSchools] = useState(true);
	const [isLoadingDetails, setIsLoadingDetails] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	const activeSchoolCount = useMemo(
		() => schools.filter((school) => school.isActive).length,
		[schools],
	);

	const tabUsers = useMemo(() => {
		if (!schoolDetails) return [];
		return schoolDetails.activeUsers[activeUserTab] || [];
	}, [activeUserTab, schoolDetails]);

	const handleUnauthorized = useCallback(() => {
		router.replace('/super-admin/login');
	}, [router]);

	const hydrateAdminForm = (school: SchoolSummary) => {
		setAdminForm({
			name: school.systemAdminUser
				? `${school.systemAdminUser.firstName} ${school.systemAdminUser.lastName}`.trim()
				: school.sysAdminProfile.name || '',
			username: school.systemAdminUser?.username || '',
			phone: school.systemAdminUser?.phone || school.sysAdminProfile.phone || '',
			email: school.systemAdminUser?.email || school.sysAdminProfile.email || '',
			office: school.sysAdminProfile.office || 'Main Office',
			password: '',
			isActive: school.systemAdminUser?.isActive ?? true,
		});
	};
	const fetchNotifications = useCallback(async () => {
		try {
			const response = await fetch('/api/superadmin/notifications', {
				credentials: 'include',
			});
			if (response.status === 401) {
				handleUnauthorized();
				return;
			}
			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload?.success === false) return;
			setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : []);
		} catch {
			// ignore notifications fetch errors as non-critical
		}
	}, [handleUnauthorized]);

	const fetchSchoolDetails = useCallback(
		async (schoolId: string, academicYear?: string) => {
			if (!schoolId) return;
			setIsLoadingDetails(true);
			try {
				const url = new URL(`/api/superadmin/schools/${schoolId}`, window.location.origin);
				if (academicYear) url.searchParams.set('academicYear', academicYear);

				const response = await fetch(url.toString(), { credentials: 'include' });
				if (response.status === 401) {
					handleUnauthorized();
					return;
				}
				const payload = await response.json().catch(() => ({}));
				if (!response.ok || payload?.success === false) {
					setError(payload?.message || 'Failed to load school details.');
					return;
				}
				const details: SchoolDetails = {
					school: payload.school,
					profile: payload.profile || {},
					academicYears: Array.isArray(payload.academicYears) ? payload.academicYears : [],
					selectedAcademicYear: payload.selectedAcademicYear || '',
					activeUsers: payload.activeUsers || {
						students: [],
						teachers: [],
						administrators: [],
						systemAdmins: [],
					},
					activeUserCounts: payload.activeUserCounts || {
						students: 0,
						teachers: 0,
						administrators: 0,
						systemAdmins: 0,
					},
				};
				setSchoolDetails(details);
				setSelectedAcademicYear(details.selectedAcademicYear || '');
				hydrateAdminForm(details.school);
			} catch {
				setError('Network error while loading school details.');
			} finally {
				setIsLoadingDetails(false);
			}
		},
		[handleUnauthorized],
	);

	const fetchSchools = useCallback(
		async (preferredSchoolId?: string) => {
			setIsLoadingSchools(true);
			try {
				const response = await fetch('/api/superadmin/schools', {
					credentials: 'include',
				});
				if (response.status === 401) {
					handleUnauthorized();
					return [] as SchoolSummary[];
				}
				const payload = await response.json().catch(() => ({}));
				if (!response.ok || payload?.success === false) {
					setError(payload?.message || 'Failed to load schools.');
					return [] as SchoolSummary[];
				}
				const nextSchools: SchoolSummary[] = Array.isArray(payload?.schools) ? payload.schools : [];
				setSchools(nextSchools);
				setSelectedSchoolId((current) => {
					if (nextSchools.some((school) => school.id === current)) return current;
					if (preferredSchoolId && nextSchools.some((school) => school.id === preferredSchoolId)) {
						return preferredSchoolId;
					}
					return nextSchools[0]?.id || '';
				});
				if (!nextSchools.length) setSchoolDetails(null);
				return nextSchools;
			} catch {
				setError('Network error while loading schools.');
				return [] as SchoolSummary[];
			} finally {
				setIsLoadingSchools(false);
			}
		},
		[handleUnauthorized],
	);

	useEffect(() => {
		void fetchSchools();
		void fetchNotifications();
	}, [fetchNotifications, fetchSchools]);

	useEffect(() => {
		if (!selectedSchoolId) return;
		void fetchSchoolDetails(selectedSchoolId);
	}, [fetchSchoolDetails, selectedSchoolId]);

	const refreshCurrent = async () => {
		setError('');
		setNotice('');
		if (activeNav === 'notifications') {
			await fetchNotifications();
			return;
		}
		await fetchSchools(selectedSchoolId || undefined);
		if (selectedSchoolId) {
			await fetchSchoolDetails(selectedSchoolId, selectedAcademicYear || undefined);
		}
	};

	const handleLogout = async () => {
		await fetch('/api/superadmin/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
		router.replace('/super-admin/login');
	};

	const handleDeleteSchool = async () => {
		if (!schoolDetails) return;
		if (!window.confirm(`Delete ${schoolDetails.school.displayName}? This cannot be undone.`)) return;
		setIsSaving(true);
		setError('');
		setNotice('');
		try {
			const response = await fetch(`/api/superadmin/schools/${schoolDetails.school.id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (response.status === 401) return handleUnauthorized();
			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload?.success === false) {
				setError(payload?.message || 'Failed to delete school.');
				return;
			}
			setNotice('School deleted successfully.');
			await fetchSchools();
		} catch {
			setError('Network error while deleting school.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleSaveSystemAdmin = async () => {
		if (!schoolDetails) return;
		const method = schoolDetails.school.systemAdminUser ? 'PUT' : 'POST';
		setIsSaving(true);
		setError('');
		setNotice('');
		try {
			const payload: Record<string, unknown> = {
				name: adminForm.name.trim(),
				username: adminForm.username.trim(),
				phone: adminForm.phone.trim(),
				email: adminForm.email.trim() || undefined,
				office: adminForm.office.trim() || 'Main Office',
				isActive: adminForm.isActive,
			};
			if (adminForm.password.trim()) payload.password = adminForm.password;

			const response = await fetch(`/api/superadmin/schools/${schoolDetails.school.id}/sysadmin`, {
				method,
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});
			if (response.status === 401) return handleUnauthorized();
			const result = await response.json().catch(() => ({}));
			if (!response.ok || result?.success === false) {
				setError(result?.message || 'Failed to save system admin.');
				return;
			}
			setNotice(method === 'PUT' ? 'System admin updated.' : 'System admin created.');
			await fetchSchoolDetails(schoolDetails.school.id, selectedAcademicYear || undefined);
			await fetchSchools(schoolDetails.school.id);
		} catch {
			setError('Network error while saving system admin.');
		} finally {
			setIsSaving(false);
		}
	};
	const handleCreateSchool = async () => {
		setIsSaving(true);
		setError('');
		setNotice('');
		try {
			const payload: Record<string, unknown> = {
				displayName: addSchoolForm.displayName.trim(),
				shortName: addSchoolForm.shortName.trim(),
				host: addSchoolForm.host.trim(),
				dbName: addSchoolForm.dbName.trim(),
				initials: addSchoolForm.initials.trim() || undefined,
				studentIdPrefix: addSchoolForm.studentIdPrefix.trim() || undefined,
				slogan: addSchoolForm.slogan.trim() || undefined,
				tagline: addSchoolForm.tagline.trim(),
				description: addSchoolForm.description.trim(),
				logoUrl: addSchoolForm.logoUrl.trim() || undefined,
				logoUrl2: addSchoolForm.logoUrl2.trim() || undefined,
				themeName: addSchoolForm.themeName.trim() || undefined,
				yearFounded: addSchoolForm.yearFounded
					? Number.parseInt(addSchoolForm.yearFounded, 10)
					: undefined,
				firstAcademicYear: addSchoolForm.firstAcademicYear.trim() || undefined,
				currentAcademicYear: addSchoolForm.currentAcademicYear.trim() || undefined,
				address: toStringArray(addSchoolForm.address),
				phones: toStringArray(addSchoolForm.phones),
				emails: toStringArray(addSchoolForm.emails),
				hours: toStringArray(addSchoolForm.hours),
				sysAdmin: {
					name: addSchoolForm.sysAdminName.trim() || undefined,
					phone: addSchoolForm.sysAdminPhone.trim() || undefined,
					email: addSchoolForm.sysAdminEmail.trim() || undefined,
					office: addSchoolForm.sysAdminOffice.trim() || undefined,
				},
				administrativePositions: parseOptionalJson(
					'administrativePositions',
					addSchoolForm.administrativePositionsJson,
				),
				enabledFeatures: parseOptionalJson('enabledFeatures', addSchoolForm.enabledFeaturesJson),
				roleFeatureAccess: parseOptionalJson(
					'roleFeatureAccess',
					addSchoolForm.roleFeatureAccessJson,
				),
				classLevels: parseOptionalJson('classLevels', addSchoolForm.classLevelsJson),
				settings: parseOptionalJson('settings', addSchoolForm.settingsJson),
				isActive: addSchoolForm.isActive,
			};
			Object.keys(payload).forEach((key) => {
				if (payload[key] === undefined) delete payload[key];
			});

			const response = await fetch('/api/superadmin/schools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload),
			});
			if (response.status === 401) return handleUnauthorized();
			const result = await response.json().catch(() => ({}));
			if (!response.ok || result?.success === false) {
				setError(result?.message || 'Failed to create school.');
				return;
			}
			setNotice('School created successfully.');
			setAddSchoolForm(initialAddSchoolForm);
			setActiveNav('schools');
			const newId = result?.school?.id || '';
			await fetchSchools(newId || undefined);
			if (newId) {
				setSelectedSchoolId(newId);
				await fetchSchoolDetails(newId);
			}
		} catch (createError: any) {
			setError(createError?.message || 'Failed to create school.');
		} finally {
			setIsSaving(false);
		}
	};

	const headerTitle =
		activeNav === 'add-school'
			? 'Add School'
			: activeNav === 'notifications'
				? 'Notifications'
				: 'Schools';

	const fieldInputClass =
		'rounded-lg border border-[#0B3A6E]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B3A6E]/45';

	return (
		<div className="min-h-screen bg-[#EEF3FB] text-[#0E1B2F]">
			<div className="flex min-h-screen">
				{sidebarOpen && (
					<button
						type="button"
						className="fixed inset-0 z-40 bg-black/35 lg:hidden"
						onClick={() => setSidebarOpen(false)}
						aria-label="Close sidebar"
					/>
				)}
				<aside
					className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-white/10 bg-[#041833] text-white transition-transform lg:static lg:translate-x-0 ${
						sidebarOpen ? 'translate-x-0' : '-translate-x-full'
					}`}
				>
					<div className="flex h-full flex-col p-5">
						<div className="flex items-center gap-3 border-b border-white/10 pb-5">
							<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4C542] text-[#041833]">
								<Shield className="h-5 w-5" />
							</div>
							<div>
								<p className="text-sm font-semibold">SchoolMesh</p>
								<p className="text-xs text-white/70">Super Admin</p>
							</div>
						</div>
						<nav className="mt-6 flex-1 space-y-2">
							{navItems.map((item) => {
								const Icon = item.icon;
								const isActive = activeNav === item.id;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => {
											setActiveNav(item.id);
											setSidebarOpen(false);
											setError('');
											setNotice('');
											if (item.id === 'notifications') void fetchNotifications();
										}}
										className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
											isActive
												? 'bg-[#F4C542] text-[#041833]'
												: 'text-white/85 hover:bg-white/10 hover:text-white'
										}`}
									>
										<span className="inline-flex items-center gap-2">
											<Icon className="h-4 w-4" />
											{item.label}
										</span>
										{isActive && <ChevronRight className="h-4 w-4" />}
									</button>
								);
							})}
						</nav>
						<div className="space-y-2 border-t border-white/10 pt-5">
							<button
								type="button"
								onClick={() => void refreshCurrent()}
								className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
							>
								<RefreshCcw className="h-4 w-4" />
								Refresh
							</button>
							<button
								type="button"
								onClick={handleLogout}
								className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D62828] px-3 py-2.5 text-sm font-semibold"
							>
								<LogOut className="h-4 w-4" />
								Logout
							</button>
						</div>
					</div>
				</aside>

				<div className="flex min-h-screen flex-1 flex-col">
					<header className="sticky top-0 z-30 border-b border-[#0B3A6E]/10 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => setSidebarOpen((open) => !open)}
									className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#0B3A6E]/15 text-[#0B3A6E] lg:hidden"
								>
									<Menu className="h-5 w-5" />
								</button>
								<div>
									<h1 className="text-lg font-semibold text-[#0B3A6E]">{headerTitle}</h1>
									<p className="text-sm text-[#1F2937]/70">
										Manage schools, system admins, and platform notifications.
									</p>
								</div>
							</div>
							<div className="hidden items-center gap-2 sm:flex">
								<span className="rounded-full bg-[#0B3A6E]/8 px-3 py-1 text-xs font-medium text-[#0B3A6E]">
									{schools.length} schools
								</span>
								<span className="rounded-full bg-[#22A06B]/10 px-3 py-1 text-xs font-medium text-[#0E7A4C]">
									{activeSchoolCount} active
								</span>
							</div>
						</div>
					</header>

					<main className="flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
						{error && <div className="rounded-xl bg-[#D62828]/10 px-4 py-3 text-sm text-[#A61C1C]">{error}</div>}
						{notice && <div className="rounded-xl bg-[#22A06B]/10 px-4 py-3 text-sm text-[#0E7A4C]">{notice}</div>}
						{activeNav === 'schools' && (
							<div className="space-y-5">
								<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
									<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5">
										<p className="text-xs uppercase tracking-wide text-[#1F2937]/65">Total Schools</p>
										<p className="mt-2 text-3xl font-bold text-[#0B3A6E]">{schools.length}</p>
									</div>
									<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5">
										<p className="text-xs uppercase tracking-wide text-[#1F2937]/65">Active Schools</p>
										<p className="mt-2 text-3xl font-bold text-[#22A06B]">{activeSchoolCount}</p>
									</div>
									<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5 sm:col-span-2 xl:col-span-1">
										<p className="text-xs uppercase tracking-wide text-[#1F2937]/65">Inactive Schools</p>
										<p className="mt-2 text-3xl font-bold text-[#D62828]">{schools.length - activeSchoolCount}</p>
									</div>
								</div>

								<div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
									<section className="rounded-2xl border border-[#0B3A6E]/12 bg-white p-4">
										<h2 className="mb-3 text-sm font-semibold text-[#0B3A6E]">Schools</h2>
										{isLoadingSchools ? (
											<p className="rounded-xl border border-dashed border-[#0B3A6E]/20 p-5 text-sm text-[#1F2937]/65">
												Loading schools...
											</p>
										) : schools.length === 0 ? (
											<p className="rounded-xl border border-dashed border-[#0B3A6E]/20 p-5 text-sm text-[#1F2937]/65">
												No schools available.
											</p>
										) : (
											<div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
												{schools.map((school) => (
													<button
														key={school.id}
														type="button"
														onClick={() => {
															setSelectedSchoolId(school.id);
															setActiveUserTab('students');
														}}
														className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${
															selectedSchoolId === school.id
																? 'border-[#0B3A6E]/35 bg-[#0B3A6E]/8'
																: 'border-[#0B3A6E]/10 hover:bg-[#0B3A6E]/5'
														}`}
													>
														<div className="h-10 w-10 overflow-hidden rounded-lg bg-[#0B3A6E]/8">
															{school.logoUrl ? (
																<img src={school.logoUrl} alt={school.displayName} className="h-full w-full object-cover" />
															) : (
																<div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#0B3A6E]">
																	{school.shortName?.slice(0, 2).toUpperCase() || 'SM'}
																</div>
															)}
														</div>
														<div className="min-w-0 flex-1">
															<p className="truncate text-sm font-semibold text-[#0E1B2F]">{school.displayName}</p>
															<p className="truncate text-xs text-[#1F2937]/65">{school.host}</p>
														</div>
														<ChevronRight className="h-4 w-4 text-[#1F2937]/45" />
													</button>
												))}
											</div>
										)}
									</section>

									<section className="space-y-4">
										{!schoolDetails ? (
											<div className="rounded-2xl border border-dashed border-[#0B3A6E]/20 bg-white px-5 py-10 text-sm text-[#1F2937]/65">
												Select a school to view details.
											</div>
										) : (
											<>
												<div className="rounded-2xl border border-[#0B3A6E]/12 bg-white p-5">
													<div className="flex flex-wrap items-start justify-between gap-3">
														<div>
															<h3 className="text-xl font-semibold text-[#0B3A6E]">{schoolDetails.school.displayName}</h3>
															<div className="mt-2 flex flex-wrap gap-2 text-xs text-[#1F2937]/70">
																<span className="rounded-full bg-[#0B3A6E]/8 px-2.5 py-1">Host: {schoolDetails.school.host}</span>
																<span className="rounded-full bg-[#0B3A6E]/8 px-2.5 py-1">DB: {schoolDetails.school.dbName}</span>
																<span className="rounded-full bg-[#0B3A6E]/8 px-2.5 py-1">Theme: {schoolDetails.school.themeName || 'horizon'}</span>
															</div>
														</div>
														<button
															type="button"
															onClick={handleDeleteSchool}
															disabled={isSaving}
															className="inline-flex items-center gap-2 rounded-lg bg-[#D62828]/10 px-3 py-2 text-xs font-semibold text-[#A61C1C]"
														>
															<Trash2 className="h-3.5 w-3.5" />
															Delete School
														</button>
													</div>

													<div className="mt-4 flex flex-wrap items-center gap-2">
														<div className="relative">
															<select
																value={selectedAcademicYear}
																onChange={(event) => {
																	const year = event.target.value;
																	setSelectedAcademicYear(year);
																	void fetchSchoolDetails(schoolDetails.school.id, year);
																}}
																className="appearance-none rounded-lg border border-[#0B3A6E]/20 bg-white px-3 py-2 pr-8 text-sm"
															>
																{schoolDetails.academicYears.map((year) => (
																	<option key={year} value={year}>
																		{year}
																	</option>
																))}
															</select>
															<ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F2937]/60" />
														</div>
														<span className="rounded-full bg-[#0B3A6E]/8 px-2.5 py-1 text-xs text-[#0B3A6E]">
															Students: {schoolDetails.activeUserCounts.students}
														</span>
														<span className="rounded-full bg-[#0B3A6E]/8 px-2.5 py-1 text-xs text-[#0B3A6E]">
															Teachers: {schoolDetails.activeUserCounts.teachers}
														</span>
														<span className="rounded-full bg-[#0B3A6E]/8 px-2.5 py-1 text-xs text-[#0B3A6E]">
															Admins: {schoolDetails.activeUserCounts.administrators}
														</span>
														<span className="rounded-full bg-[#0B3A6E]/8 px-2.5 py-1 text-xs text-[#0B3A6E]">
															System Admin: {schoolDetails.activeUserCounts.systemAdmins}
														</span>
													</div>

													<div className="mt-4 flex flex-wrap gap-2">
														{userTabs.map((tab) => (
															<button
																key={tab.id}
																type="button"
																onClick={() => setActiveUserTab(tab.id)}
																className={`rounded-lg px-3 py-2 text-xs font-semibold ${
																	activeUserTab === tab.id
																		? 'bg-[#0B3A6E] text-white'
																		: 'bg-[#0B3A6E]/8 text-[#0B3A6E]'
																}`}
															>
																{tab.label}
															</button>
														))}
													</div>

													<div className="mt-3 grid gap-2 md:grid-cols-2">
														{isLoadingDetails ? (
															<p className="rounded-lg border border-dashed border-[#0B3A6E]/20 p-4 text-sm text-[#1F2937]/65">
																Loading active users...
															</p>
														) : tabUsers.length === 0 ? (
															<p className="rounded-lg border border-dashed border-[#0B3A6E]/20 p-4 text-sm text-[#1F2937]/65">
																No active users in this category.
															</p>
														) : (
															tabUsers.map((user) => (
																<div key={user.id} className="rounded-lg border border-[#0B3A6E]/12 bg-[#F8FBFF] p-3">
																	<p className="text-sm font-semibold text-[#0E1B2F]">{user.name}</p>
																	<p className="text-xs text-[#1F2937]/70">@{user.username}</p>
																	<p className="mt-1 text-xs text-[#1F2937]/70">{roleLabel(user.role)}</p>
																	<p className="text-xs text-[#1F2937]/70">{user.phone || user.email || '-'}</p>
																</div>
															))
														)}
													</div>
												</div>

												<div className="grid gap-4 lg:grid-cols-2">
													<div className="rounded-2xl border border-[#0B3A6E]/12 bg-white p-5">
														<div className="mb-2 flex items-center gap-2">
															<Building2 className="h-4 w-4 text-[#0B3A6E]" />
															<h4 className="text-sm font-semibold text-[#0B3A6E]">School Profile (No Homepage/Settings)</h4>
														</div>
														<pre className="max-h-80 overflow-auto rounded-lg bg-[#F8FBFF] p-3 text-xs text-[#1F2937]">
															{JSON.stringify(schoolDetails.profile, null, 2)}
														</pre>
													</div>

													<div className="rounded-2xl border border-[#0B3A6E]/12 bg-white p-5">
														<div className="mb-3 flex items-center gap-2">
															<Users className="h-4 w-4 text-[#0B3A6E]" />
															<h4 className="text-sm font-semibold text-[#0B3A6E]">System Admin</h4>
														</div>
														<div className="grid gap-2">
															<input className={fieldInputClass} placeholder="Full name" value={adminForm.name} onChange={(event) => setAdminForm((prev) => ({ ...prev, name: event.target.value }))} />
															<input className={fieldInputClass} placeholder="Username" value={adminForm.username} onChange={(event) => setAdminForm((prev) => ({ ...prev, username: event.target.value }))} />
															<input className={fieldInputClass} placeholder="Phone" value={adminForm.phone} onChange={(event) => setAdminForm((prev) => ({ ...prev, phone: event.target.value }))} />
															<input className={fieldInputClass} placeholder="Email" value={adminForm.email} onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))} />
															<input className={fieldInputClass} placeholder="Office" value={adminForm.office} onChange={(event) => setAdminForm((prev) => ({ ...prev, office: event.target.value }))} />
															<input className={fieldInputClass} type="password" placeholder={schoolDetails.school.systemAdminUser ? 'New password (optional)' : 'Password'} value={adminForm.password} onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))} />
															<label className="inline-flex items-center gap-2 text-sm text-[#1F2937]/80">
																<input type="checkbox" checked={adminForm.isActive} onChange={(event) => setAdminForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
																Account active
															</label>
															<button
																type="button"
																onClick={handleSaveSystemAdmin}
																disabled={isSaving}
																className="rounded-lg bg-[#0B3A6E] px-4 py-2 text-sm font-semibold text-white"
															>
																{schoolDetails.school.systemAdminUser ? 'Update System Admin' : 'Create System Admin'}
															</button>
														</div>
													</div>
												</div>
											</>
										)}
									</section>
								</div>
							</div>
						)}

						{activeNav === 'add-school' && (
							<div className="space-y-4 rounded-2xl border border-[#0B3A6E]/12 bg-white p-5">
								<h2 className="text-base font-semibold text-[#0B3A6E]">Create School with Full Profile</h2>
								<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
									{(
										[
											['displayName', 'Display name'],
											['shortName', 'Short name'],
											['host', 'Host'],
											['dbName', 'DB name'],
											['initials', 'Initials'],
											['studentIdPrefix', 'Student ID prefix'],
											['slogan', 'Slogan'],
											['tagline', 'Tagline'],
											['logoUrl', 'Logo URL'],
											['logoUrl2', 'Secondary logo URL'],
											['themeName', 'Theme name'],
											['yearFounded', 'Year founded'],
											['firstAcademicYear', 'First academic year'],
											['currentAcademicYear', 'Current academic year'],
											['sysAdminName', 'System admin name'],
											['sysAdminPhone', 'System admin phone'],
											['sysAdminEmail', 'System admin email'],
											['sysAdminOffice', 'System admin office'],
										] as Array<[keyof AddSchoolForm, string]>
									).map(([key, label]) => (
										<input
											key={key}
											className={fieldInputClass}
											placeholder={label}
											value={String(addSchoolForm[key])}
											onChange={(event) =>
												setAddSchoolForm((prev) => ({ ...prev, [key]: event.target.value }))
											}
										/>
									))}
								</div>
								<textarea className={fieldInputClass} rows={3} placeholder="Description" value={addSchoolForm.description} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, description: event.target.value }))} />
								<div className="grid gap-2 lg:grid-cols-2">
									<textarea className={fieldInputClass} rows={3} placeholder="Addresses (comma or new line separated)" value={addSchoolForm.address} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, address: event.target.value }))} />
									<textarea className={fieldInputClass} rows={3} placeholder="Phones (comma or new line separated)" value={addSchoolForm.phones} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, phones: event.target.value }))} />
									<textarea className={fieldInputClass} rows={3} placeholder="Emails (comma or new line separated)" value={addSchoolForm.emails} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, emails: event.target.value }))} />
									<textarea className={fieldInputClass} rows={3} placeholder="Hours (comma or new line separated)" value={addSchoolForm.hours} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, hours: event.target.value }))} />
								</div>
								<div className="grid gap-2 lg:grid-cols-2">
									<textarea className={`${fieldInputClass} font-mono text-xs`} rows={5} placeholder="administrativePositions JSON" value={addSchoolForm.administrativePositionsJson} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, administrativePositionsJson: event.target.value }))} />
									<textarea className={`${fieldInputClass} font-mono text-xs`} rows={5} placeholder="enabledFeatures JSON" value={addSchoolForm.enabledFeaturesJson} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, enabledFeaturesJson: event.target.value }))} />
									<textarea className={`${fieldInputClass} font-mono text-xs`} rows={5} placeholder="roleFeatureAccess JSON" value={addSchoolForm.roleFeatureAccessJson} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, roleFeatureAccessJson: event.target.value }))} />
									<textarea className={`${fieldInputClass} font-mono text-xs`} rows={5} placeholder="classLevels JSON" value={addSchoolForm.classLevelsJson} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, classLevelsJson: event.target.value }))} />
									<textarea className={`${fieldInputClass} font-mono text-xs lg:col-span-2`} rows={6} placeholder="settings JSON" value={addSchoolForm.settingsJson} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, settingsJson: event.target.value }))} />
								</div>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<label className="inline-flex items-center gap-2 text-sm text-[#1F2937]/80">
										<input type="checkbox" checked={addSchoolForm.isActive} onChange={(event) => setAddSchoolForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
										School is active
									</label>
									<div className="flex items-center gap-2">
										<button type="button" onClick={() => setAddSchoolForm(initialAddSchoolForm)} className="rounded-lg border border-[#0B3A6E]/20 px-4 py-2 text-sm font-medium text-[#0B3A6E]">
											Reset
										</button>
										<button type="button" onClick={handleCreateSchool} disabled={isSaving} className="rounded-lg bg-[#0B3A6E] px-4 py-2 text-sm font-semibold text-white">
											Create School
										</button>
									</div>
								</div>
							</div>
						)}

						{activeNav === 'notifications' && (
							<div className="space-y-3 rounded-2xl border border-[#0B3A6E]/12 bg-white p-5">
								<div className="flex items-center justify-between">
									<h2 className="text-base font-semibold text-[#0B3A6E]">Notifications</h2>
									<button
										type="button"
										onClick={() => void fetchNotifications()}
										className="inline-flex items-center gap-2 rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-xs font-semibold text-[#0B3A6E]"
									>
										<RefreshCcw className="h-3.5 w-3.5" />
										Refresh
									</button>
								</div>
								{notifications.length === 0 ? (
									<p className="rounded-xl border border-dashed border-[#0B3A6E]/20 p-6 text-sm text-[#1F2937]/65">
										No notifications yet.
									</p>
								) : (
									notifications.map((entry) => (
										<div key={entry.id} className={`rounded-xl border px-4 py-3 ${tone(entry.type)}`}>
											<div className="flex items-center justify-between gap-2">
												<p className="text-sm font-semibold">{entry.title}</p>
												<p className="text-xs opacity-80">{formatDateTime(entry.createdAt)}</p>
											</div>
											<p className="mt-1 text-sm">{entry.message}</p>
										</div>
									))
								)}
							</div>
						)}
					</main>
				</div>
			</div>
		</div>
	);
}
