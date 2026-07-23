'use client';

import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun, Palette, Info } from 'lucide-react';

const ACCENT_COLORS = [
	{ name: 'Indigo', value: '#465fff' },
	{ name: 'Blue', value: '#3b82f6' },
	{ name: 'Emerald', value: '#10b981' },
	{ name: 'Amber', value: '#f59e0b' },
	{ name: 'Rose', value: '#f43f5e' },
	{ name: 'Violet', value: '#8b5cf6' },
];

export default function SuperAdminSettingsPage() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="max-w-2xl space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
				<p className="text-sm text-gray-500 mt-1">
					Platform appearance and admin account settings.
				</p>
			</div>

			{/* Appearance */}
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
				<div className="flex items-center gap-3 mb-5">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#465fff]/10">
						<Palette className="h-4.5 w-4.5 text-[#465fff]" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Appearance</h2>
						<p className="text-xs text-gray-500">Customize the look and feel of the admin panel.</p>
					</div>
				</div>

				{/* Theme toggle */}
				<div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
					<div>
						<p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p>
						<p className="text-xs text-gray-500">Switch between light and dark mode.</p>
					</div>
					<button
						onClick={toggleTheme}
						className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors bg-gray-200 dark:bg-[#465fff]"
					>
						<span
							className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
								theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
							}`}
						>
							{theme === 'dark' ? (
								<Moon className="h-3.5 w-3.5 text-[#465fff]" />
							) : (
								<Sun className="h-3.5 w-3.5 text-amber-500" />
							)}
						</span>
					</button>
				</div>
			</div>

			{/* Admin Account */}
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
				<div className="flex items-center gap-3 mb-5">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
						<Info className="h-4.5 w-4.5 text-green-500" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Admin Account</h2>
						<p className="text-xs text-gray-500">Your superadmin account information.</p>
					</div>
				</div>
				<div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-500">Email</span>
						<span className="text-sm font-medium text-gray-900 dark:text-white">admin@schoolmesh.app</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-500">Role</span>
						<span className="inline-flex items-center rounded-full bg-[#465fff]/10 px-2.5 py-0.5 text-xs font-semibold text-[#465fff]">
							Super Admin
						</span>
					</div>
				</div>
			</div>

			{/* Platform Info */}
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
				<div className="flex items-center gap-3 mb-5">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
						<Info className="h-4.5 w-4.5 text-purple-500" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Platform Info</h2>
						<p className="text-xs text-gray-500">SchoolMesh platform details.</p>
					</div>
				</div>
				<div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-500">Version</span>
						<span className="text-sm font-medium text-gray-900 dark:text-white">1.0.0</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-sm text-gray-500">Environment</span>
						<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
							Production
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
