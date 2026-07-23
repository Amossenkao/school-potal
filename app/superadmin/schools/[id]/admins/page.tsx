'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
	ArrowLeft, Loader2, Plus, Trash2, X, UserPlus, Copy, Check, Pencil, CheckCircle, Key, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useSuperadminRealtime } from '../../../hooks/useSuperadminRealtime';
import type { RealtimeEvent } from '@/lib/realtimeTypes';

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

export default function SchoolAdminsPage() {
	const params = useParams();
	const host = params?.id as string;

	const [admins, setAdmins] = useState<SystemAdminAccount[]>([]);
	const [loading, setLoading] = useState(true);
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

	useEffect(() => { if (host) fetchAdmins(); }, [host]);

	const fetchAdmins = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/superadmin/schools/${host}/admins`);
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
		if (reason === 'user-created' || reason === 'user-updated' || reason === 'user-deleted') {
			fetchAdmins();
		}
	}, []);

	useSuperadminRealtime({ schoolHosts: [host], onEvent: handleRealtimeEvent });

	const updateSuggestions = useCallback((firstName: string, lastName: string) => {
		setUsernameSuggestion(generateUsernameSuggestion(firstName, lastName));
		setPasswordSuggestion(generatePasswordSuggestion(firstName, lastName));
	}, []);

	const handleCreate = async () => {
		try {
			setCreating(true);
			setError('');
			const res = await fetch(`/api/superadmin/schools/${host}/admins`, {
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
			const res = await fetch(`/api/superadmin/schools/${host}/admins/${userId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editForm),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to update');
			setEditingId(null);
			fetchAdmins();
		} catch (e: any) {
			setError(e.message);
		} finally {
			setEditSaving(false);
		}
	};

	const handleDelete = async (userId: string) => {
		if (!confirm('Are you sure you want to delete this admin account?')) return;
		try {
			const res = await fetch(`/api/superadmin/schools/${host}/admins/${userId}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to delete');
			}
			fetchAdmins();
		} catch (e: any) {
			setError(e.message);
		}
	};

	const handleToggleActive = async (userId: string) => {
		try {
			setTogglingId(userId);
			const res = await fetch(`/api/superadmin/schools/${host}/admins/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'toggle_active' }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to toggle status');
			fetchAdmins();
		} catch (e: any) {
			setError(e.message);
		} finally {
			setTogglingId(null);
		}
	};

	const handleResetPassword = async (userId: string) => {
		if (!confirm('Reset this admin\'s password to their username? They will be forced to change it on next login.')) return;
		try {
			setResettingId(userId);
			const res = await fetch(`/api/superadmin/schools/${host}/admins/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'reset_password' }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to reset password');
			setResetCredentials(data.credentials);
		} catch (e: any) {
			setError(e.message);
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

	const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white';

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link href={`/superadmin/schools/${host}`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<div className="flex-1">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Admins</h1>
					<p className="text-sm text-gray-500">Manage system administrator accounts for this school.</p>
				</div>
				<button
					onClick={() => { setShowCreate(true); setCreatedUserInfo(null); }}
					className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] transition-colors"
				>
					<UserPlus className="h-4 w-4" />
					Add Admin
				</button>
			</div>

			{error && (
				<div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
					{error}
					<button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
				</div>
			)}

			{/* Create modal */}
			{showCreate && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
						<div className="flex items-center justify-between mb-5">
							<h3 className="text-lg font-bold text-gray-900 dark:text-white">New System Admin</h3>
							<button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
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
							<div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 dark:bg-blue-900/20 dark:border-blue-800">
								<p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Suggested Credentials</p>
								<div className="space-y-1">
									{usernameSuggestion && (
										<div className="flex items-center gap-2">
											<span className="text-xs text-blue-600 dark:text-blue-400">Username:</span>
											<code className="text-xs font-mono font-semibold text-blue-800 dark:text-blue-200">{usernameSuggestion}</code>
											<button onClick={() => copyToClipboard(usernameSuggestion, 'suggest-user')} className="text-blue-400 hover:text-blue-600">
												{copied === 'suggest-user' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
											</button>
										</div>
									)}
									{passwordSuggestion && (
										<div className="flex items-center gap-2">
											<span className="text-xs text-blue-600 dark:text-blue-400">Password:</span>
											<code className="text-xs font-mono font-semibold text-blue-800 dark:text-blue-200">{passwordSuggestion}</code>
											<button onClick={() => copyToClipboard(passwordSuggestion, 'suggest-pass')} className="text-blue-400 hover:text-blue-600">
												{copied === 'suggest-pass' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
											</button>
										</div>
									)}
								</div>
							</div>
						)}

						<div className="mt-6 flex justify-end gap-3">
							<button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
							<button
								onClick={handleCreate}
								disabled={creating || !form.firstName || !form.lastName || !form.phone}
								className="inline-flex items-center gap-2 rounded-lg bg-[#465fff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50 transition-colors"
							>
								{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
								{creating ? 'Creating...' : 'Create Admin'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Success modal (AddUsers.tsx pattern) */}
			{createdUserInfo && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 flex flex-col items-center text-center">
						<div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
							<CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
						</div>
						<div className="mb-5">
							<h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Created!</h3>
							<p className="text-sm text-gray-500 mt-1.5">
								<span className="font-semibold text-gray-900 dark:text-white">{createdUserInfo.fullName}</span>{' '}
								account was successfully created.
							</p>
						</div>

						<div className="w-full rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-5">
							<div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
								<p className="text-sm font-semibold text-gray-900 dark:text-white">Generated Credentials</p>
							</div>
							<div className="p-4 space-y-3">
								<div className="flex items-center justify-between gap-3">
									<span className="text-sm text-gray-500">Username</span>
									<code className="text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg break-all">
										{createdUserInfo.generatedCredentials.username}
									</code>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-sm text-gray-500">Temp. Password</span>
									<code className="text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg break-all">
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

						<div className="flex gap-3 w-full">
							<button
								onClick={handleCopyAllCredentials}
								className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white transition-colors"
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

			{/* Reset password credentials modal */}
			{resetCredentials && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 flex flex-col items-center text-center">
						<div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
							<Key className="w-8 h-8 text-amber-600 dark:text-amber-400" />
						</div>
						<div className="mb-5">
							<h3 className="text-xl font-bold text-gray-900 dark:text-white">Password Reset</h3>
							<p className="text-sm text-gray-500 mt-1.5">Password has been reset to the username.</p>
						</div>
						<div className="w-full rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-5">
							<div className="p-4 space-y-3">
								<div className="flex items-center justify-between gap-3">
									<span className="text-sm text-gray-500">Username</span>
									<code className="text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg break-all">
										{resetCredentials.username}
									</code>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-sm text-gray-500">New Password</span>
									<code className="text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg break-all">
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
						<div className="flex gap-3 w-full">
							<button
								onClick={() => {
									const creds = `Username: ${resetCredentials.username}\nPassword: ${resetCredentials.defaultPassword}`;
									navigator.clipboard.writeText(creds).then(() => setCopied('reset'));
									setTimeout(() => setCopied(''), 2000);
								}}
								className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white transition-colors"
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

			{/* Admins list */}
			<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
					</div>
				) : admins.length === 0 ? (
					<div className="py-20 text-center text-sm text-gray-500">No system admin accounts found.</div>
				) : (
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{admins.map((admin) => (
							<div key={admin._id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${!admin.isActive ? 'opacity-60' : ''}`}>
								<div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${admin.isActive ? 'bg-[#465fff]/10 text-[#465fff]' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
									{admin.firstName.charAt(0)}{admin.lastName.charAt(0)}
								</div>
								{editingId === admin._id ? (
									<div className="flex-1 grid gap-3 sm:grid-cols-3">
										<input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" placeholder="First name" />
										<input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" placeholder="Last name" />
										<input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white" placeholder="Phone" />
										<input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-gray-800 dark:text-white sm:col-span-3" placeholder="Email" />
									</div>
								) : (
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{admin.fullName}</p>
										<div className="flex items-center gap-3 mt-0.5">
											<span className="text-xs text-gray-500 font-mono">{admin.username}</span>
											<span className="text-xs text-gray-400">{admin.phone}</span>
											{admin.email && <span className="text-xs text-gray-400 hidden sm:inline">{admin.email}</span>}
										</div>
									</div>
								)}
								<div className="flex items-center gap-2 shrink-0">
									{editingId === admin._id ? (
										<>
											<button onClick={() => handleUpdate(admin._id)} disabled={editSaving} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
												{editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
											</button>
											<button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100">Cancel</button>
										</>
									) : (
										<>
											<button onClick={() => handleToggleActive(admin._id)} disabled={togglingId === admin._id}
												title={admin.isActive ? 'Deactivate' : 'Activate'}
												className={`rounded-lg p-2 transition-colors ${admin.isActive ? 'text-green-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
												{togglingId === admin._id ? <Loader2 className="h-4 w-4 animate-spin" /> : admin.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
											</button>
											<button onClick={() => handleResetPassword(admin._id)} disabled={resettingId === admin._id}
												title="Reset password"
												className="rounded-lg p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
												{resettingId === admin._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
											</button>
											<button onClick={() => startEdit(admin)} className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
												<Pencil className="h-4 w-4" />
											</button>
											<button onClick={() => handleDelete(admin._id)} className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
												<Trash2 className="h-4 w-4" />
											</button>
										</>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
