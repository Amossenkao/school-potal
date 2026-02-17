'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	Building2,
	LogOut,
	Plus,
	RefreshCcw,
	Shield,
	Trash2,
	UserRoundCog,
} from 'lucide-react';

type School = {
	id: string;
	host: string;
	dbName: string;
	shortName: string;
	displayName: string;
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
	createdAt?: string;
	updatedAt?: string;
};

type ProfileForm = {
	displayName: string;
	shortName: string;
	host: string;
	dbName: string;
	tagline: string;
	isActive: boolean;
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

const initialNewSchoolForm = {
	host: '',
	dbName: '',
	displayName: '',
	shortName: '',
	tagline: 'Connecting Schools. Empowering Learning.',
	description: '',
	sysAdminName: '',
	sysAdminPhone: '',
	sysAdminEmail: '',
	sysAdminOffice: 'Main Office',
};

export default function SuperAdminDashboardPage() {
	const router = useRouter();
	const [schools, setSchools] = useState<School[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [newSchoolForm, setNewSchoolForm] = useState(initialNewSchoolForm);
	const [profileForms, setProfileForms] = useState<Record<string, ProfileForm>>({});
	const [adminForms, setAdminForms] = useState<Record<string, AdminForm>>({});

	const schoolCount = schools.length;
	const activeCount = useMemo(
		() => schools.filter((school) => school.isActive).length,
		[schools],
	);

	const initializeForms = useCallback((nextSchools: School[]) => {
		const nextProfileForms: Record<string, ProfileForm> = {};
		const nextAdminForms: Record<string, AdminForm> = {};

		nextSchools.forEach((school) => {
			nextProfileForms[school.id] = {
				displayName: school.displayName || '',
				shortName: school.shortName || '',
				host: school.host || '',
				dbName: school.dbName || '',
				tagline: school.tagline || '',
				isActive: school.isActive,
			};

			nextAdminForms[school.id] = {
				name:
					school.systemAdminUser
						? `${school.systemAdminUser.firstName} ${school.systemAdminUser.lastName}`
						: school.sysAdminProfile.name || '',
				username: school.systemAdminUser?.username || '',
				phone: school.systemAdminUser?.phone || school.sysAdminProfile.phone || '',
				email:
					school.systemAdminUser?.email || school.sysAdminProfile.email || '',
				office: school.sysAdminProfile.office || 'Main Office',
				password: '',
				isActive: school.systemAdminUser?.isActive ?? true,
			};
		});

		setProfileForms(nextProfileForms);
		setAdminForms(nextAdminForms);
	}, []);

	const fetchSchools = useCallback(async () => {
		setError('');
		setNotice('');
		setIsLoading(true);
		try {
			const response = await fetch('/api/superadmin/schools', {
				credentials: 'include',
			});
			if (response.status === 401) {
				router.replace('/super-admin/login');
				return;
			}

			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload?.success === false) {
				setError(payload?.message || 'Failed to load schools.');
				return;
			}
			const nextSchools = Array.isArray(payload?.schools) ? payload.schools : [];
			setSchools(nextSchools);
			initializeForms(nextSchools);
		} catch {
			setError('Network error while loading schools.');
		} finally {
			setIsLoading(false);
		}
	}, [initializeForms, router]);

	useEffect(() => {
		void fetchSchools();
	}, [fetchSchools]);

	const handleLogout = async () => {
		await fetch('/api/superadmin/logout', {
			method: 'POST',
			credentials: 'include',
		}).catch(() => undefined);
		router.replace('/super-admin/login');
	};

	const handleCreateSchool = async () => {
		setError('');
		setNotice('');
		setIsSaving(true);
		try {
			const response = await fetch('/api/superadmin/schools', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(newSchoolForm),
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload?.success === false) {
				setError(payload?.message || 'Failed to create school.');
				return;
			}
			setNotice('School created successfully.');
			setNewSchoolForm(initialNewSchoolForm);
			await fetchSchools();
		} catch {
			setError('Network error while creating school.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleUpdateSchool = async (schoolId: string) => {
		const form = profileForms[schoolId];
		if (!form) return;

		setError('');
		setNotice('');
		setIsSaving(true);
		try {
			const response = await fetch(`/api/superadmin/schools/${schoolId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(form),
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload?.success === false) {
				setError(payload?.message || 'Failed to update school.');
				return;
			}
			setNotice('School profile updated successfully.');
			await fetchSchools();
		} catch {
			setError('Network error while updating school.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteSchool = async (schoolId: string) => {
		if (!window.confirm('Delete this school profile? This cannot be undone.')) return;

		setError('');
		setNotice('');
		setIsSaving(true);
		try {
			const response = await fetch(`/api/superadmin/schools/${schoolId}`, {
				method: 'DELETE',
				credentials: 'include',
			});
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

	const handleSaveAdmin = async (schoolId: string, hasExistingAdmin: boolean) => {
		const form = adminForms[schoolId];
		if (!form) return;

		setError('');
		setNotice('');
		setIsSaving(true);
		try {
			const response = await fetch(
				`/api/superadmin/schools/${schoolId}/sysadmin`,
				{
					method: hasExistingAdmin ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(form),
				},
			);
			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload?.success === false) {
				setError(payload?.message || 'Failed to save system admin.');
				return;
			}
			setNotice(
				hasExistingAdmin
					? 'System admin updated successfully.'
					: 'System admin created successfully.',
			);
			await fetchSchools();
		} catch {
			setError('Network error while saving system admin.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#F4F7FC]">
			<header className="sticky top-0 z-30 border-b border-[#0B3A6E]/10 bg-white/95 backdrop-blur">
				<div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B3A6E] text-white">
							<Shield className="h-5 w-5" />
						</div>
						<div>
							<p className="text-sm font-semibold text-[#0B3A6E]">SchoolMesh Super Admin</p>
							<p className="text-xs text-[#1F2937]/70">Manage schools, profiles, and system admins</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => void fetchSchools()}
							className="inline-flex items-center gap-2 rounded-lg border border-[#0B3A6E]/20 bg-white px-3 py-2 text-xs font-semibold text-[#0B3A6E]"
						>
							<RefreshCcw className="h-3.5 w-3.5" />
							Refresh
						</button>
						<button
							type="button"
							onClick={handleLogout}
							className="inline-flex items-center gap-2 rounded-lg bg-[#D62828] px-3 py-2 text-xs font-semibold text-white"
						>
							<LogOut className="h-3.5 w-3.5" />
							Log Out
						</button>
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-wider text-[#1F2937]/65">Total Schools</p>
						<p className="mt-2 text-3xl font-bold text-[#0B3A6E]">{schoolCount}</p>
					</div>
					<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-wider text-[#1F2937]/65">Active Schools</p>
						<p className="mt-2 text-3xl font-bold text-[#22A06B]">{activeCount}</p>
					</div>
					<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-wider text-[#1F2937]/65">Inactive Schools</p>
						<p className="mt-2 text-3xl font-bold text-[#D62828]">{schoolCount - activeCount}</p>
					</div>
				</div>

				<div className="mt-6 rounded-2xl border border-[#0B3A6E]/10 bg-white p-5">
					<div className="mb-4 flex items-center gap-2">
						<Plus className="h-4 w-4 text-[#0B3A6E]" />
						<h2 className="text-sm font-semibold text-[#0B3A6E]">Create New School</h2>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<input
							placeholder="Host (e.g. abc.schoolmesh.io)"
							value={newSchoolForm.host}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, host: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
						<input
							placeholder="Database name"
							value={newSchoolForm.dbName}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, dbName: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
						<input
							placeholder="Display name"
							value={newSchoolForm.displayName}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, displayName: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
						<input
							placeholder="Short name"
							value={newSchoolForm.shortName}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, shortName: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
						<input
							placeholder="Tagline"
							value={newSchoolForm.tagline}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, tagline: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
						<input
							placeholder="System admin name"
							value={newSchoolForm.sysAdminName}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, sysAdminName: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
						<input
							placeholder="System admin phone"
							value={newSchoolForm.sysAdminPhone}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, sysAdminPhone: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
						<input
							placeholder="System admin email"
							value={newSchoolForm.sysAdminEmail}
							onChange={(event) =>
								setNewSchoolForm((prev) => ({ ...prev, sysAdminEmail: event.target.value }))
							}
							className="rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
						/>
					</div>

					<textarea
						placeholder="Description"
						value={newSchoolForm.description}
						onChange={(event) =>
							setNewSchoolForm((prev) => ({ ...prev, description: event.target.value }))
						}
						rows={3}
						className="mt-3 w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
					/>

					<div className="mt-4">
						<button
							type="button"
							onClick={handleCreateSchool}
							disabled={isSaving}
							className="rounded-lg bg-[#0B3A6E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
						>
							Create School
						</button>
					</div>
				</div>

				{error && <p className="mt-4 text-sm font-medium text-[#D62828]">{error}</p>}
				{notice && <p className="mt-4 text-sm font-medium text-[#0E7A4C]">{notice}</p>}

				<div className="mt-6 space-y-5">
					{isLoading ? (
						<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-6 text-sm text-[#1F2937]/70">
							Loading schools...
						</div>
					) : schools.length === 0 ? (
						<div className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-6 text-sm text-[#1F2937]/70">
							No schools found.
						</div>
					) : (
						schools.map((school) => {
							const profileForm = profileForms[school.id];
							const adminForm = adminForms[school.id];
							if (!profileForm || !adminForm) return null;

							return (
								<div
									key={school.id}
									className="rounded-2xl border border-[#0B3A6E]/10 bg-white p-5 shadow-sm"
								>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<p className="text-lg font-semibold text-[#0B3A6E]">{school.displayName}</p>
											<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#1F2937]/70">
												<span className="inline-flex items-center gap-1 rounded-full bg-[#0B3A6E]/7 px-2 py-1">
													<Building2 className="h-3 w-3" />
													{school.host}
												</span>
												<span className="rounded-full bg-[#0B3A6E]/7 px-2 py-1">DB: {school.dbName}</span>
												<span
													className={`rounded-full px-2 py-1 ${
														school.isActive
															? 'bg-[#22A06B]/15 text-[#0E7A4C]'
															: 'bg-[#D62828]/15 text-[#A61C1C]'
													}`}
												>
													{school.isActive ? 'Active' : 'Inactive'}
												</span>
											</div>
										</div>

										<button
											type="button"
											onClick={() => void handleDeleteSchool(school.id)}
											className="inline-flex items-center gap-2 rounded-lg bg-[#D62828]/10 px-3 py-2 text-xs font-semibold text-[#A61C1C]"
										>
											<Trash2 className="h-3.5 w-3.5" />
											Delete
										</button>
									</div>

									<div className="mt-5 grid gap-6 lg:grid-cols-2">
										<div className="rounded-xl border border-[#0B3A6E]/10 bg-[#F7FAFF] p-4">
											<p className="text-xs font-semibold uppercase tracking-wider text-[#0B3A6E]">School Profile</p>
											<div className="mt-3 space-y-3">
												<input
													value={profileForm.displayName}
													onChange={(event) =>
														setProfileForms((prev) => ({
															...prev,
															[school.id]: {
																...prev[school.id],
																displayName: event.target.value,
															},
														}))
													}
													placeholder="Display name"
													className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
												/>
												<div className="grid gap-3 sm:grid-cols-2">
													<input
														value={profileForm.shortName}
														onChange={(event) =>
															setProfileForms((prev) => ({
																...prev,
																[school.id]: {
																	...prev[school.id],
																	shortName: event.target.value,
																},
															}))
														}
														placeholder="Short name"
														className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
													/>
													<input
														value={profileForm.tagline}
														onChange={(event) =>
															setProfileForms((prev) => ({
																...prev,
																[school.id]: {
																	...prev[school.id],
																	tagline: event.target.value,
																},
															}))
														}
														placeholder="Tagline"
														className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
													/>
												</div>
												<input
													value={profileForm.host}
													onChange={(event) =>
														setProfileForms((prev) => ({
															...prev,
															[school.id]: {
																...prev[school.id],
																host: event.target.value,
															},
														}))
													}
													placeholder="Host"
													className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
												/>
												<input
													value={profileForm.dbName}
													onChange={(event) =>
														setProfileForms((prev) => ({
															...prev,
															[school.id]: {
																...prev[school.id],
																dbName: event.target.value,
															},
														}))
													}
													placeholder="DB name"
													className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
												/>
												<label className="inline-flex items-center gap-2 text-sm text-[#1F2937]/80">
													<input
														type="checkbox"
														checked={profileForm.isActive}
														onChange={(event) =>
															setProfileForms((prev) => ({
																...prev,
																[school.id]: {
																	...prev[school.id],
																	isActive: event.target.checked,
																},
															}))
														}
													/>
													School active
												</label>
												<button
													type="button"
													onClick={() => void handleUpdateSchool(school.id)}
													disabled={isSaving}
													className="rounded-lg bg-[#0B3A6E] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
												>
													Save School Profile
												</button>
											</div>
										</div>

										<div className="rounded-xl border border-[#0B3A6E]/10 bg-[#F7FAFF] p-4">
											<div className="mb-3 flex items-center gap-2">
												<UserRoundCog className="h-4 w-4 text-[#0B3A6E]" />
												<p className="text-xs font-semibold uppercase tracking-wider text-[#0B3A6E]">
													System Admin Account
												</p>
											</div>

											<div className="space-y-3">
												<input
													value={adminForm.name}
													onChange={(event) =>
														setAdminForms((prev) => ({
															...prev,
															[school.id]: {
																...prev[school.id],
																name: event.target.value,
															},
														}))
													}
													placeholder="Full name"
													className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
												/>
												<div className="grid gap-3 sm:grid-cols-2">
													<input
														value={adminForm.username}
														onChange={(event) =>
															setAdminForms((prev) => ({
																...prev,
																[school.id]: {
																	...prev[school.id],
																	username: event.target.value,
																},
															}))
														}
														placeholder="Username"
														className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
													/>
													<input
														value={adminForm.phone}
														onChange={(event) =>
															setAdminForms((prev) => ({
																...prev,
																[school.id]: {
																	...prev[school.id],
																	phone: event.target.value,
																},
															}))
														}
														placeholder="Phone"
														className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
													/>
												</div>
												<input
													value={adminForm.email}
													onChange={(event) =>
														setAdminForms((prev) => ({
															...prev,
															[school.id]: {
																...prev[school.id],
																email: event.target.value,
															},
														}))
													}
													placeholder="Email"
													className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
												/>
												<input
													value={adminForm.office}
													onChange={(event) =>
														setAdminForms((prev) => ({
															...prev,
															[school.id]: {
																...prev[school.id],
																office: event.target.value,
															},
														}))
													}
													placeholder="Office"
													className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
												/>
												<input
													type="password"
													value={adminForm.password}
													onChange={(event) =>
														setAdminForms((prev) => ({
															...prev,
															[school.id]: {
																...prev[school.id],
																password: event.target.value,
															},
														}))
													}
													placeholder={school.systemAdminUser ? 'New password (optional)' : 'Password'}
													className="w-full rounded-lg border border-[#0B3A6E]/20 px-3 py-2 text-sm"
												/>
												<label className="inline-flex items-center gap-2 text-sm text-[#1F2937]/80">
													<input
														type="checkbox"
														checked={adminForm.isActive}
														onChange={(event) =>
															setAdminForms((prev) => ({
																...prev,
																[school.id]: {
																	...prev[school.id],
																	isActive: event.target.checked,
																},
															}))
														}
													/>
													Admin active
												</label>
												<button
													type="button"
													onClick={() =>
														void handleSaveAdmin(school.id, Boolean(school.systemAdminUser))
													}
													disabled={isSaving}
													className="rounded-lg bg-[#0B3A6E] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
												>
													{school.systemAdminUser ? 'Update System Admin' : 'Create System Admin'}
												</button>
											</div>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			</main>
		</div>
	);
}
