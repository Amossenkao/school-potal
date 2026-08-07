'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
	ArrowLeft, Loader2, Plus, Trash2, X, UserPlus, Copy, Check, Pencil, CheckCircle, Key, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useSuperadminRealtime } from '@/app/dashboard/admin/hooks/useSuperadminRealtime';
import type { RealtimeEvent } from '@/lib/realtimeTypes';
import useAuth from '@/store/useAuth';

interface SystemAdminAccount {
	_id: string;
	firstName: string;
	middleName?: string;
	lastName: string;
	fullName: string;
	username: string;
	phone: string;
	email: string;
	isActive: boolean;
}

interface CreatedUserInfo {
	_id: string;
	fullName: string;
	generatedCredentials: {
		username: string;
		defaultPassword: string;
		note: string;
	};
}

function generateUsernameSuggestion(firstName: string, lastName: string): string {
	const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
	const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
	if (!f && !l) return '';
	return f + l.charAt(0);
}

function generatePasswordSuggestion(firstName: string, lastName: string): string {
	const f = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase().replace(/[^a-z]/g, '');
	const l = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase().replace(/[^a-z]/g, '');
	const num = Math.floor(1000 + Math.random() * 9000);
	return `${f}${l}@${num}`;
}

interface SchoolAdminsPanelProps {
	host: string;
	onClose: () => void;
	onOpenProfile?: (host: string) => void;
}

export default function SchoolAdminsPanel({ host, onClose, onOpenProfile }: SchoolAdminsPanelProps) {
	const cachedSchool = useAuth((state) =>
		state.superAdminSchools.find((school: any) => school.host === host),
	);

	const [admins, setAdmins] = useState<SystemAdminAccount[]>(() => {
		const cached = cachedSchool?.systemAdmins;
		return Array.isArray(cached) ? cached : [];
	});
	const [loading, setLoading] = useState(!cachedSchool?.systemAdmins?.length);
	const [error, setError] = useState('');
	const [showCreate, setShowCreate] = useState(false);
	const [creating, setCreating] = useState(false);
	const [createdUserInfo, setCreatedUserInfo] = useState<CreatedUserInfo | null>(null);
	const [copied, setCopied] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editSaving, setEditSaving] = useState(false);

	const [form, setForm] = useState({
		firstName: '', middleName: '', lastName: '', phone: '', email: '',
		gender: '', dateOfBirth: '', address: '',
	});
	const [usernameSuggestion, setUsernameSuggestion] = useState('');
	const [passwordSuggestion, setPasswordSuggestion] = useState('');

	const [editForm, setEditForm] = useState({
		firstName: '', middleName: '', lastName: '', phone: '', email: '',
		gender: '', dateOfBirth: '', address: '',
	});
	const [resetCredentials, setResetCredentials] = useState<{ username: string; defaultPassword: string; note: string } | null>(null);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [resettingId, setResettingId] = useState<string | null>(null);
	const [deleteConfirmAdmin, setDeleteConfirmAdmin] = useState<SystemAdminAccount | null>(null);
	const [resetConfirmAdmin, setResetConfirmAdmin] = useState<SystemAdminAccount | null>(null);

	useEffect(() => {
		if (!host) return;
		const hasCached = Array.isArray(cachedSchool?.systemAdmins) && cachedSchool.systemAdmins.length > 0;
		if (!hasCached) fetchAdmins();
	}, [host]);

	const fetchAdmins = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/users?host=${encodeURIComponent(host)}&role=system_admin`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to load admins');
			setAdmins(data.admins || []);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
		const reason = String(event.payload?.reason || '').trim();
		if (reason !== 'user-created' && reason !== 'user-updated' && reason !== 'user-deleted') return;
		// This panel also subscribes to the superadmin broadcast channel
		// (shared by every school), so another school's user event can land
		// here too — only refetch when it's actually about this school.
		const tenantId = String(event.tenantId || '').trim();
		if (tenantId && tenantId !== host && tenantId !== cachedSchool?.dbName) return;
		fetchAdmins();
	}, [host, cachedSchool?.dbName]);

	useSuperadminRealtime({ schoolHosts: [host], schoolTenantIds: cachedSchool?.dbName ? [cachedSchool.dbName] : [], onEvent: handleRealtimeEvent });

	const updateSuggestions = useCallback((firstName: string, lastName: string) => {
		setUsernameSuggestion(generateUsernameSuggestion(firstName, lastName));
		setPasswordSuggestion(generatePasswordSuggestion(firstName, lastName));
	}, []);

	const handleCreate = async () => {
		try {
			setCreating(true);
			setError('');
			const res = await fetch(`/api/users?host=${encodeURIComponent(host)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to create admin');
			setCreatedUserInfo(data.user);
			setShowCreate(false);
			setForm({ firstName: '', middleName: '', lastName: '', phone: '', email: '', gender: '', dateOfBirth: '', address: '' });
			setUsernameSuggestion('');
			setPasswordSuggestion('');
			fetchAdmins();
		} catch (e: any) {
			setError(e.message);
		} finally {
			setCreating(false);
		}
	};

	const startEdit = (admin: SystemAdminAccount) => {
		setEditingId(admin._id);
		setEditForm({
			firstName: admin.firstName,
			middleName: admin.middleName || '',
			lastName: admin.lastName,
			phone: admin.phone,
			email: admin.email || '',
			gender: '',
			dateOfBirth: '',
			address: '',
		});
	};

	const handleUpdate = async (userId: string) => {
		try {
			setEditSaving(true);
			const updatePayload = {
				firstName: editForm.firstName,
				middleName: editForm.middleName,
				lastName: editForm.lastName,
				phone: editForm.phone,
				email: editForm.email,
			};
			const res = await fetch(`/api/users?host=${encodeURIComponent(host)}&id=${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatePayload),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to update');
			setEditingId(null);
			fetchAdmins();
			toast.success('Admin updated successfully');
		} catch (e: any) {
			setError(e.message);
			toast.error(e.message || 'Failed to update admin');
		} finally {
			setEditSaving(false);
		}
	};

	const handleDelete = async (userId: string) => {
		setDeleteConfirmAdmin(null);
		try {
			const res = await fetch(`/api/users?host=${encodeURIComponent(host)}&id=${userId}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to delete');
			}
			fetchAdmins();
			toast.success('Admin deleted successfully');
		} catch (e: any) {
			setError(e.message);
			toast.error(e.message || 'Failed to delete admin');
		}
	};

	const handleToggleActive = async (userId: string) => {
		try {
			setTogglingId(userId);
			const res = await fetch(`/api/users?host=${encodeURIComponent(host)}&id=${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'toggle_active' }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to toggle status');
			fetchAdmins();
			toast.success('Admin status updated');
		} catch (e: any) {
			setError(e.message);
			toast.error(e.message || 'Failed to toggle status');
		} finally {
			setTogglingId(null);
		}
	};

	const handleResetPassword = async (userId: string) => {
		setResetConfirmAdmin(null);
		try {
			setResettingId(userId);
			// `resetPassword=true` is a query param, not a body action — the route
			// has no `reset_password` action, so the old body-only call fell
			// through to the generic update path and never touched the password.
			// That is why the previous password kept working and the default one
			// never did.
			const res = await fetch(
				`/api/users?host=${encodeURIComponent(host)}&id=${userId}&resetPassword=true`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				},
			);
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.message || data.error || 'Failed to reset password');
			setResetCredentials(data.data?.newCredentials ?? null);
			toast.success('Password reset successfully');
		} catch (e: any) {
			setError(e.message);
			toast.error(e.message || 'Failed to reset password');
		} finally {
			setResettingId(null);
		}
	};

	const copyToClipboard = (text: string, field: string) => {
		navigator.clipboard.writeText(text);
		setCopied(field);
		setTimeout(() => setCopied(''), 2000);
	};

	const handleCopyAllCredentials = () => {
		if (!createdUserInfo) return;
		const creds = `Username: ${createdUserInfo.generatedCredentials.username}\nPassword: ${createdUserInfo.generatedCredentials.defaultPassword}`;
		navigator.clipboard.writeText(creds).then(() => setCopied('all'));
		setTimeout(() => setCopied(''), 2000);
	};

	const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white';

	return (
		<div className="space-y-4 sm:space-y-6">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors shrink-0 mt-0.5">
					<ArrowLeft className="h-5 w-5" />
				</button>
				<div className="flex-1 min-w-0">
					<h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">System Admins</h1>
					<p className="text-xs sm:text-sm text-gray-500 truncate">
						Manage admins for {cachedSchool?.name || host || 'this school'}.
					</p>
				</div>
				<button
					onClick={() => { setShowCreate(true); setCreatedUserInfo(null); }}
					className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-[#465fff] px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors shrink-0"
				>
					<UserPlus className="h-4 w-4" />
					<span className="hidden xs:inline">Add Admin</span>
					<span className="xs:hidden">Add</span>
				</button>
			</div>

			{error && (
				<div className="rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
					<span className="truncate">{error}</span>
					<button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0"><X className="h-4 w-4" /></button>
				</div>
			)}

			{/* Create Admin Modal */}
			{showCreate && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
					<div className="w-full max-w-lg rounded-2xl bg-card p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
						<div className="flex items-center justify-between mb-4 sm:mb-5">
							<h3 className="text-lg font-bold text-gray-900 dark:text-white">New System Admin</h3>
							<button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
						</div>
						<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
							<div>
								<label className="text-xs font-semibold text-gray-500">First Name *</label>
								<input
									value={form.firstName}
									onChange={(e) => {
										const v = e.target.value;
										setForm((p) => ({ ...p, firstName: v }));
										updateSuggestions(v, form.lastName);
									}}
									className={`${inputClass} mt-1.5`}
									placeholder="John"
								/>
							</div>
							<div>
								<label className="text-xs font-semibold text-gray-500">Middle Name</label>
								<input
									value={form.middleName}
									onChange={(e) => setForm((p) => ({ ...p, middleName: e.target.value }))}
									className={`${inputClass} mt-1.5`}
									placeholder="Optional"
								/>
							</div>
							<div>
								<label className="text-xs font-semibold text-gray-500">Last Name *</label>
								<input
									value={form.lastName}
									onChange={(e) => {
										const v = e.target.value;
										setForm((p) => ({ ...p, lastName: v }));
										updateSuggestions(form.firstName, v);
									}}
									className={`${inputClass} mt-1.5`}
									placeholder="Doe"
								/>
							</div>
							<div>
								<label className="text-xs font-semibold text-gray-500">Phone *</label>
								<input
									value={form.phone}
									onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
									className={`${inputClass} mt-1.5`}
									placeholder="+231 ..."
								/>
							</div>
							<div>
								<label className="text-xs font-semibold text-gray-500">Gender</label>
								<select
									value={form.gender}
									onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
									className={`${inputClass} mt-1.5`}
								>
									<option value="">Select</option>
									<option value="Male">Male</option>
									<option value="Female">Female</option>
									<option value="Other">Other</option>
								</select>
							</div>
							<div>
								<label className="text-xs font-semibold text-gray-500">Date of Birth</label>
								<input
									type="date"
									value={form.dateOfBirth}
									onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
									className={`${inputClass} mt-1.5`}
								/>
							</div>
							<div className="sm:col-span-2">
								<label className="text-xs font-semibold text-gray-500">Email</label>
								<input
									value={form.email}
									onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
									className={`${inputClass} mt-1.5`}
									placeholder="email@..."
								/>
							</div>
							<div className="sm:col-span-2">
								<label className="text-xs font-semibold text-gray-500">Address</label>
								<textarea
									value={form.address}
									onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
									className={`${inputClass} mt-1.5 resize-none`}
									rows={2}
									placeholder="Street, City, County"
								/>
							</div>
						</div>

						{(usernameSuggestion || passwordSuggestion) && (
							<div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-3 sm:px-4 py-3 dark:bg-blue-900/20 dark:border-blue-800">
								<p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Suggested Credentials</p>
								<div className="space-y-1.5">
									{usernameSuggestion && (
										<div className="flex items-center gap-2">
											<span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">Username:</span>
											<code className="text-xs font-mono font-semibold text-blue-800 dark:text-blue-200 break-all">{usernameSuggestion}</code>
											<button onClick={() => copyToClipboard(usernameSuggestion, 'suggest-user')} className="text-blue-400 hover:text-blue-600 shrink-0">
												{copied === 'suggest-user' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
											</button>
										</div>
									)}
									{passwordSuggestion && (
										<div className="flex items-center gap-2">
											<span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">Password:</span>
											<code className="text-xs font-mono font-semibold text-blue-800 dark:text-blue-200 break-all">{passwordSuggestion}</code>
											<button onClick={() => copyToClipboard(passwordSuggestion, 'suggest-pass')} className="text-blue-400 hover:text-blue-600 shrink-0">
												{copied === 'suggest-pass' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
											</button>
										</div>
									)}
								</div>
							</div>
						)}

						<div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
							<button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
							<button
								onClick={handleCreate}
								disabled={creating || !form.firstName || !form.lastName || !form.phone}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#465fff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50 transition-colors"
							>
								{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
								{creating ? 'Creating...' : 'Create Admin'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Created Credentials Modal */}
			{createdUserInfo && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
					<div className="w-full max-w-md rounded-2xl bg-card p-4 sm:p-6 shadow-xl flex flex-col items-center text-center max-h-[90vh] overflow-y-auto">
						<div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3 sm:mb-4">
							<CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
						</div>
						<div className="mb-4 sm:mb-5">
							<h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Account Created!</h3>
							<p className="text-xs sm:text-sm text-gray-500 mt-1.5">
								<span className="font-semibold text-gray-900 dark:text-white">{createdUserInfo.fullName}</span>{' '}
								account was successfully created.
							</p>
						</div>

						<div className="w-full rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4 sm:mb-5">
							<div className="px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-muted/50">
								<p className="text-sm font-semibold text-gray-900 dark:text-white">Generated Credentials</p>
							</div>
							<div className="p-3 sm:p-4 space-y-3">
								<div className="flex items-center justify-between gap-2 sm:gap-3">
									<span className="text-xs sm:text-sm text-gray-500 shrink-0">Username</span>
									<code className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-muted border border-gray-200 dark:border-gray-700 px-2 sm:px-2.5 py-1 rounded-lg break-all text-right">
										{createdUserInfo.generatedCredentials.username}
									</code>
								</div>
								<div className="flex items-center justify-between gap-2 sm:gap-3">
									<span className="text-xs sm:text-sm text-gray-500 shrink-0">Temp. Password</span>
									<code className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-muted border border-gray-200 dark:border-gray-700 px-2 sm:px-2.5 py-1 rounded-lg break-all text-right">
										{createdUserInfo.generatedCredentials.defaultPassword}
									</code>
								</div>
								{createdUserInfo.generatedCredentials.note && (
									<p className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-800">
										{createdUserInfo.generatedCredentials.note}
									</p>
								)}
							</div>
						</div>

						<div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
							<button
								onClick={handleCopyAllCredentials}
								className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-muted hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white transition-colors"
							>
								{copied === 'all' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
								{copied === 'all' ? 'Copied!' : 'Copy Credentials'}
							</button>
							<button
								onClick={() => setCreatedUserInfo(null)}
								className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#465fff] text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors"
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reset Credentials Modal */}
			{resetCredentials && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
					<div className="w-full max-w-md rounded-2xl bg-card p-4 sm:p-6 shadow-xl flex flex-col items-center text-center max-h-[90vh] overflow-y-auto">
						<div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 sm:mb-4">
							<Key className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />
						</div>
						<div className="mb-4 sm:mb-5">
							<h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Password Reset</h3>
							<p className="text-xs sm:text-sm text-gray-500 mt-1.5">Password has been reset to the username.</p>
						</div>
						<div className="w-full rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-4 sm:mb-5">
							<div className="p-3 sm:p-4 space-y-3">
								<div className="flex items-center justify-between gap-2 sm:gap-3">
									<span className="text-xs sm:text-sm text-gray-500 shrink-0">Username</span>
									<code className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-muted border border-gray-200 dark:border-gray-700 px-2 sm:px-2.5 py-1 rounded-lg break-all text-right">
										{resetCredentials.username}
									</code>
								</div>
								<div className="flex items-center justify-between gap-2 sm:gap-3">
									<span className="text-xs sm:text-sm text-gray-500 shrink-0">New Password</span>
									<code className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-muted border border-gray-200 dark:border-gray-700 px-2 sm:px-2.5 py-1 rounded-lg break-all text-right">
										{resetCredentials.defaultPassword}
									</code>
								</div>
								{resetCredentials.note && (
									<p className="text-xs text-amber-600 dark:text-amber-400 text-center pt-2 border-t border-gray-200 dark:border-gray-800">
										{resetCredentials.note}
									</p>
								)}
							</div>
						</div>
						<div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
							<button
								onClick={() => {
									const creds = `Username: ${resetCredentials.username}\nPassword: ${resetCredentials.defaultPassword}`;
									navigator.clipboard.writeText(creds).then(() => setCopied('reset'));
									setTimeout(() => setCopied(''), 2000);
								}}
								className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-muted hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white transition-colors"
							>
								{copied === 'reset' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
								{copied === 'reset' ? 'Copied!' : 'Copy Credentials'}
							</button>
							<button
								onClick={() => setResetCredentials(null)}
								className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#465fff] text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors"
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Admins List */}
			<div className="rounded-xl border border-gray-200 bg-card dark:border-gray-800 overflow-hidden">
				{loading ? (
					<div className="flex items-center justify-center py-16 sm:py-20">
						<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
					</div>
				) : admins.length === 0 ? (
					<div className="py-16 sm:py-20 text-center text-sm text-gray-500 px-4">No system admin accounts found.</div>
				) : (
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{admins.map((admin) => (
							<div key={admin._id} className={`px-3 sm:px-5 py-3 sm:py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${!admin.isActive ? 'opacity-60' : ''}`}>
								{editingId === admin._id ? (
									/* Edit mode */
									<div className="space-y-3">
										<div className="flex items-center gap-3">
											<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${admin.isActive ? 'bg-[#465fff]/10 text-[#465fff]' : 'bg-gray-200 text-gray-400 dark:bg-muted dark:text-gray-500'}`}>
												{admin.firstName.charAt(0)}{admin.lastName.charAt(0)}
											</div>
											<p className="text-sm font-medium text-gray-900 dark:text-white truncate">Editing {admin.fullName}</p>
										</div>
										<div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
											<input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="First name" />
											<input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="Last name" />
											<input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white" placeholder="Phone" />
											<input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white sm:col-span-2" placeholder="Email" />
										</div>
										<div className="flex items-center gap-2 justify-end">
											<button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100">Cancel</button>
											<button onClick={() => handleUpdate(admin._id)} disabled={editSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
												{editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
												Save
											</button>
										</div>
									</div>
								) : (
									/* Display mode */
									<div className="flex items-start gap-3">
										<div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold mt-0.5 ${admin.isActive ? 'bg-[#465fff]/10 text-[#465fff]' : 'bg-gray-200 text-gray-400 dark:bg-muted dark:text-gray-500'}`}>
											{admin.firstName.charAt(0)}{admin.lastName.charAt(0)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between gap-2">
												<div className="min-w-0">
													<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{admin.fullName}</p>
													<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
														<span className="text-xs text-gray-500 font-mono">{admin.username}</span>
														<span className="text-xs text-gray-400">{admin.phone}</span>
														{admin.email && <span className="text-xs text-gray-400 hidden sm:inline">{admin.email}</span>}
													</div>
												</div>
												{/* Action buttons - desktop: inline, mobile: below info */}
												<div className="flex items-center gap-1 shrink-0">
													<button onClick={() => handleToggleActive(admin._id)} disabled={togglingId === admin._id}
														title={admin.isActive ? 'Deactivate' : 'Activate'}
														className={`rounded-lg p-1.5 sm:p-2 transition-colors ${admin.isActive ? 'text-green-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
														{togglingId === admin._id ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : admin.isActive ? <ToggleRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ToggleLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
													</button>
													<button onClick={() => setResetConfirmAdmin(admin)} disabled={resettingId === admin._id}
														title="Reset password"
														className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
														{resettingId === admin._id ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
													</button>
													<button onClick={() => startEdit(admin)} className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
														<Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
													</button>
													<button onClick={() => setDeleteConfirmAdmin(admin)} className="rounded-lg p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
														<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
													</button>
												</div>
											</div>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Delete Confirm Modal */}
			{deleteConfirmAdmin && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
					<div className="w-full max-w-sm rounded-2xl bg-card p-4 sm:p-6 shadow-xl">
						<h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Admin Account</h3>
						<p className="mt-2 text-sm text-gray-500">
							Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{deleteConfirmAdmin.fullName}</span>? This action cannot be undone.
						</p>
						<div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
							<button
								onClick={() => setDeleteConfirmAdmin(null)}
								className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => handleDelete(deleteConfirmAdmin._id)}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
							>
								<Trash2 className="h-4 w-4" />
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reset Confirm Modal */}
			{resetConfirmAdmin && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
					<div className="w-full max-w-sm rounded-2xl bg-card p-4 sm:p-6 shadow-xl">
						<h3 className="text-lg font-bold text-gray-900 dark:text-white">Reset Password</h3>
						<p className="mt-2 text-sm text-gray-500">
							Reset <span className="font-semibold text-gray-900 dark:text-white">{resetConfirmAdmin.fullName}</span>&apos;s password to their username? They will be forced to change it on next login.
						</p>
						<div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
							<button
								onClick={() => setResetConfirmAdmin(null)}
								className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => handleResetPassword(resetConfirmAdmin._id)}
								disabled={resettingId === resetConfirmAdmin._id}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
							>
								{resettingId === resetConfirmAdmin._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
								Reset Password
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}