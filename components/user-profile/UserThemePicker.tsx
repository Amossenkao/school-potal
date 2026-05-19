'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
	TENANT_THEMES,
	TENANT_THEME_OPTIONS,
	applyTenantThemeToDocument,
} from '@/lib/tenantTheme';
import {
	DEFAULT_TENANT_THEME_NAME,
	type TenantThemeName,
} from '@/types/tenantTheme';

export const USER_THEME_STORAGE_KEY = 'user_theme_preference';

/**
 * Call this once (e.g. in a root layout) to apply the user's stored theme
 * before the rest of the page renders.
 */
export function applyStoredUserTheme() {
	if (typeof window === 'undefined') return;
	const stored = localStorage.getItem(
		USER_THEME_STORAGE_KEY,
	) as TenantThemeName | null;
	if (stored) {
		applyTenantThemeToDocument(stored);
	}
}

export default function UserThemePicker() {
	const [selected, setSelected] = useState<TenantThemeName>(
		DEFAULT_TENANT_THEME_NAME,
	);

	// Hydrate from localStorage on mount and apply
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem(
			USER_THEME_STORAGE_KEY,
		) as TenantThemeName | null;
		if (stored) {
			setSelected(stored);
			applyTenantThemeToDocument(stored);
		}
	}, []);

	const handleSelect = useCallback((name: TenantThemeName) => {
		setSelected(name);
		localStorage.setItem(USER_THEME_STORAGE_KEY, name);
		applyTenantThemeToDocument(name);
	}, []);

	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
			<h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
				Portal Theme
			</h3>
			<p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
				Your personal color theme — saved on this device only.
			</p>

			<div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
				{TENANT_THEME_OPTIONS.map((opt) => {
					const themeColor =
						TENANT_THEMES[opt.name as TenantThemeName].themeColor;
					const isActive = selected === opt.name;
					return (
						<button
							key={opt.name}
							type="button"
							title={opt.label}
							onClick={() => handleSelect(opt.name as TenantThemeName)}
							className={[
								'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all text-[11px] font-medium',
								isActive
									? 'border-primary ring-2 ring-primary/30 scale-105 shadow-sm'
									: 'border-transparent hover:border-gray-300 dark:hover:border-gray-600',
							].join(' ')}
						>
							<span
								className="h-7 w-7 rounded-full ring-1 ring-black/10 dark:ring-white/10"
								style={{ backgroundColor: themeColor }}
							/>
							<span className="w-full truncate text-center text-gray-600 dark:text-gray-300">
								{opt.label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
