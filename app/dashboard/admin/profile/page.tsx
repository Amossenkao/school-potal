'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
	Loader2,
	Save,
	Lock,
	User,
	Mail,
	Phone,
	MapPin,
	Calendar,
	Camera,
} from 'lucide-react';
import useAuth from '@/store/useAuth';
import AvatarPicker, { AvatarPickerModal } from '@/components/avatarPicker';

function AvatarDisplay({
	avatar,
	initials,
}: {
	avatar: string;
	initials: string;
}) {
	if (!avatar) {
		return (
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#465fff]/10 text-2xl font-bold text-[#465fff]">
				{initials}
			</div>
		);
	}
	return (
		<img
			src={avatar}
			alt="Avatar"
			className="h-20 w-20 rounded-full object-cover border-4 border-border shadow-md"
		/>
	);
}

export default function SuperAdminProfilePage() {
	const user = useAuth((state) => state.user);
	const setUser = useAuth((state) => state.setUser);

	const [saving, setSaving] = useState(false);
	const [savingPassword, setSavingPassword] = useState(false);
	const [showAvatarPicker, setShowAvatarPicker] = useState(false);

	const [form, setForm] = useState({
		firstName: user?.firstName || '',
		middleName: user?.middleName || '',
		lastName: user?.lastName || '',
		nickName: user?.nickName || '',
		phone: user?.phone || '',
		email: user?.email || '',
		address: user?.address || '',
		bio: user?.bio || '',
		gender: user?.gender || '',
		dateOfBirth: user?.dateOfBirth || '',
		avatar: user?.avatar || '',
	});

	const [passwordForm, setPasswordForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	const initials =
		[form.firstName || user?.firstName, form.lastName || user?.lastName]
			.filter(Boolean)
			.map((n) => (n as string).charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2) || 'SA';

	const updateField = (field: string, value: string) =>
		setForm((prev) => ({ ...prev, [field]: value }));

	const handleSaveProfile = async () => {
		try {
			setSaving(true);
			const res = await fetch('/api/auth/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || 'Failed to update profile');
			setUser({ ...user, ...data.user } as any);
			toast.success('Profile updated successfully');
		} catch (e: any) {
			toast.error(e.message || 'Failed to update profile');
		} finally {
			setSaving(false);
		}
	};

	const handleChangePassword = async () => {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error('New passwords do not match');
			return;
		}
		if (passwordForm.newPassword.length < 6) {
			toast.error('New password must be at least 6 characters');
			return;
		}
		try {
			setSavingPassword(true);
			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					oldPassword: passwordForm.currentPassword,
					newPassword: passwordForm.newPassword,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || 'Failed to change password');
			setUser({ ...user, ...data.user } as any);
			setPasswordForm({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
			toast.success('Password changed successfully');
		} catch (e: any) {
			toast.error(e.message || 'Failed to change password');
		} finally {
			setSavingPassword(false);
		}
	};

	if (!user) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl space-y-4 sm:space-y-6 px-0 sm:px-0">
			<div>
				<h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
					My Profile
				</h1>
				<p className="mt-1 text-xs sm:text-sm text-gray-500">
					Manage your account information and security settings.
				</p>
			</div>

			{/* Avatar & Basic Info */}
			<div className="rounded-xl border border-gray-200 bg-card p-4 sm:p-6 dark:border-gray-800">
				<div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
					{/* Avatar — clicking the preview opens the picker */}
					<div
						className="relative group cursor-pointer shrink-0"
						onClick={() => setShowAvatarPicker(true)}
					>
						<AvatarDisplay avatar={form.avatar} initials={initials} />
						<div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
							<Camera className="h-5 w-5 text-white" />
						</div>
					</div>

					<div className="text-center sm:text-left">
						<h2 className="text-lg font-bold text-gray-900 dark:text-white">
							{user.fullName}
						</h2>
						<p className="text-sm text-gray-500">@{user.username}</p>
						<p className="mt-1 inline-flex items-center rounded-full bg-[#465fff]/10 px-2.5 py-0.5 text-xs font-semibold text-[#465fff]">
							Super Admin
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								First Name
							</label>
							<div className="relative mt-1.5">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									type="text"
									value={form.firstName}
									onChange={(e) => updateField('firstName', e.target.value)}
									className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</div>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								Middle Name
							</label>
							<div className="relative mt-1.5">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									type="text"
									value={form.middleName}
									onChange={(e) => updateField('middleName', e.target.value)}
									className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								Last Name
							</label>
							<div className="relative mt-1.5">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									type="text"
									value={form.lastName}
									onChange={(e) => updateField('lastName', e.target.value)}
									className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</div>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								Nickname
							</label>
							<div className="relative mt-1.5">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									type="text"
									value={form.nickName}
									onChange={(e) => updateField('nickName', e.target.value)}
									className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</div>
						</div>
					</div>

					<div>
						<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
							Phone
						</label>
						<div className="relative mt-1.5">
							<Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								type="tel"
								value={form.phone}
								onChange={(e) => updateField('phone', e.target.value)}
								className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
							/>
						</div>
					</div>

					<div>
						<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
							Email
						</label>
						<div className="relative mt-1.5">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								type="email"
								value={form.email}
								onChange={(e) => updateField('email', e.target.value)}
								className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
							/>
						</div>
					</div>

					<div>
						<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
							Address
						</label>
						<div className="relative mt-1.5">
							<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								type="text"
								value={form.address}
								onChange={(e) => updateField('address', e.target.value)}
								className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								Gender
							</label>
							<select
								value={form.gender}
								onChange={(e) => updateField('gender', e.target.value)}
								className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
							>
								<option value="">Select…</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="other">Other</option>
							</select>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								Date of Birth
							</label>
							<div className="relative mt-1.5">
								<Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									type="date"
									value={form.dateOfBirth}
									onChange={(e) => updateField('dateOfBirth', e.target.value)}
									className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</div>
						</div>
					</div>

					<div>
						<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
							Bio
						</label>
						<textarea
							value={form.bio}
							onChange={(e) => updateField('bio', e.target.value)}
							rows={3}
							className="mt-1.5 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
						/>
					</div>
				</div>

				<div className="mt-6 flex justify-end">
					<button
						onClick={handleSaveProfile}
						disabled={saving}
						className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#465fff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a4fe6] disabled:opacity-50"
					>
						{saving ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Save className="h-4 w-4" />
						)}
						Save Profile
					</button>
				</div>
			</div>

			{/* Change Password */}
			<div className="rounded-xl border border-gray-200 bg-card p-4 sm:p-6 dark:border-gray-800">
				<div className="mb-5 flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
						<Lock className="h-4 w-4 text-orange-500" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
							Change Password
						</h2>
						<p className="text-xs text-gray-500">
							Update your password to keep your account secure.
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div>
						<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
							Current Password
						</label>
						<div className="relative mt-1.5">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<input
								type="password"
								value={passwordForm.currentPassword}
								onChange={(e) =>
									setPasswordForm((prev) => ({
										...prev,
										currentPassword: e.target.value,
									}))
								}
								className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								New Password
							</label>
							<div className="relative mt-1.5">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									type="password"
									value={passwordForm.newPassword}
									onChange={(e) =>
										setPasswordForm((prev) => ({
											...prev,
											newPassword: e.target.value,
										}))
									}
									className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</div>
						</div>
						<div>
							<label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
								Confirm New Password
							</label>
							<div className="relative mt-1.5">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
								<input
									type="password"
									value={passwordForm.confirmPassword}
									onChange={(e) =>
										setPasswordForm((prev) => ({
											...prev,
											confirmPassword: e.target.value,
										}))
									}
									className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-6 flex justify-end">
					<button
						onClick={handleChangePassword}
						disabled={
							savingPassword ||
							!passwordForm.currentPassword ||
							!passwordForm.newPassword ||
							!passwordForm.confirmPassword
						}
						className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
					>
						{savingPassword ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Lock className="h-4 w-4" />
						)}
						Change Password
					</button>
				</div>
			</div>

			{/* Avatar picker modal — rendered via the shared component */}
			<AvatarPickerModal
				open={showAvatarPicker}
				gender={form.gender || 'other'}
				currentAvatar={form.avatar}
				onSelect={(url) => {
					updateField('avatar', url);
					setShowAvatarPicker(false);
				}}
				onClose={() => setShowAvatarPicker(false)}
			/>
		</div>
	);
}
