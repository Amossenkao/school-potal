'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
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

export function applyStoredUserTheme() {
	if (typeof window === 'undefined') return;
	const stored = localStorage.getItem(
		USER_THEME_STORAGE_KEY,
	) as TenantThemeName | null;
	if (stored) applyTenantThemeToDocument(stored);
}

// ─── Category groupings ───────────────────────────────────────────────────────

const CLASSIC_THEMES: TenantThemeName[] = [
	'horizon',
	'ocean',
	'emerald',
	'sunset',
	'midnight',
	'coral',
	'forest',
	'copper',
	'rose',
	'slate',
	'aurora',
	'amethyst',
	'ruby',
	'glacier',
	'citrus',
	'espresso',
	'lagoon',
	'ember',
	'orchid',
	'gilded',
];

const BOLD_THEMES: TenantThemeName[] = [
	'nebula',
	'volcanic',
	'sakura',
	'void',
	'neonoir',
	'sandstorm',
	'solstice',
	'absinthe',
	'ultraviolet',
	'prism',
	'thunderstorm',
	'pharaoh',
	'samurai',
	'habanero',
	'biodome',
	'carnival',
	'radioactive',
	'quicksilver',
	'catacomb',
	'bioluminescent',
];

// Curated stripe shown in the collapsed trigger
const TRIGGER_STRIPE: TenantThemeName[] = [
	'horizon',
	'sunset',
	'ocean',
	'aurora',
	'amethyst',
	'ember',
	'gilded',
	'nebula',
	'neonoir',
	'bioluminescent',
];

// ─── Dual-tone swatch ─────────────────────────────────────────────────────────

function DualSwatch({
	name,
	isActive,
	onClick,
}: {
	name: TenantThemeName;
	isActive: boolean;
	onClick: () => void;
}) {
	const theme = TENANT_THEMES[name];
	const primary = theme.themeColor;
	// Pull the compiled CSS-var values from the resolved theme objects
	const lightBg = theme.light['--sidebar'] ?? '#f8fafc';
	const darkBg = theme.dark['--sidebar'] ?? '#0f172a';
	const label =
		TENANT_THEME_OPTIONS.find((o) => o.name === name)?.label ?? name;

	return (
		<button
			type="button"
			title={label}
			onClick={onClick}
			className={[
				'relative flex items-center justify-center rounded-xl transition-all duration-150',
				'aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
				isActive
					? 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-[1.15] z-10'
					: 'hover:scale-[1.12] hover:ring-1 hover:ring-gray-300/80 dark:hover:ring-white/20 hover:ring-offset-1 hover:ring-offset-white dark:hover:ring-offset-gray-900',
			].join(' ')}
		>
			{/* Dual-tone circle: light half / dark half / primary center dot */}
			<span className="relative h-6 w-6 sm:h-7 sm:w-7 rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-sm">
				<span
					className="absolute inset-y-0 left-0 w-1/2"
					style={{ backgroundColor: lightBg }}
				/>
				<span
					className="absolute inset-y-0 right-0 w-1/2"
					style={{ backgroundColor: darkBg }}
				/>
				{/* center primary dot */}
				<span
					className="absolute rounded-full shadow"
					style={{
						inset: '22%',
						backgroundColor: primary,
					}}
				/>
			</span>

			{/* Active checkmark badge */}
			{isActive && (
				<span
					className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center ring-1 ring-white dark:ring-gray-900"
					style={{ backgroundColor: primary }}
				>
					<Check className="h-2 w-2 text-white" strokeWidth={3.5} />
				</span>
			)}
		</button>
	);
}

// ─── Section ──────────────────────────────────────────────────────────────────

function ThemeSection({
	title,
	themes,
	selected,
	onSelect,
}: {
	title: string;
	themes: TenantThemeName[];
	selected: TenantThemeName;
	onSelect: (n: TenantThemeName) => void;
}) {
	return (
		<div>
			<p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
				{title}
			</p>
			<div className="grid grid-cols-5 gap-1 sm:grid-cols-10 sm:gap-0.5">
				{themes.map((name) => (
					<DualSwatch
						key={name}
						name={name}
						isActive={selected === name}
						onClick={() => onSelect(name)}
					/>
				))}
			</div>
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserThemePicker() {
	const [selected, setSelected] = useState<TenantThemeName>(
		DEFAULT_TENANT_THEME_NAME,
	);
	const [isOpen, setIsOpen] = useState(false);

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

	const activeColor = TENANT_THEMES[selected].themeColor;
	const activeLabel =
		TENANT_THEME_OPTIONS.find((o) => o.name === selected)?.label ?? selected;

	return (
		<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
			{/* ── Trigger ──────────────────────────────────────────────────── */}
			<button
				type="button"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((v) => !v)}
				className="group relative w-full overflow-hidden text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
			>
				{/* Subtle theme-tinted backdrop */}
				<span
					className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.08] transition-opacity group-hover:opacity-[0.1]"
					style={{
						background: `radial-gradient(ellipse at 0% 50%, ${activeColor} 0%, transparent 70%)`,
					}}
					aria-hidden
				/>

				<div className="relative flex items-center gap-3 px-4 py-3.5">
					{/* Active theme swatch — rounded square with glow */}
					<span
						className="relative flex-shrink-0 h-6 w-6 rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105"
						style={{
							backgroundColor: activeColor,
							boxShadow: `0 0 0 3px color-mix(in srgb, ${activeColor} 25%, transparent),
							            0 2px 10px color-mix(in srgb, ${activeColor} 35%, transparent)`,
						}}
					/>

					{/* Labels */}
					<div className="min-w-0 flex-1">
						<p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 leading-none">
							Portal Theme
						</p>
						<p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
							{activeLabel}
						</p>
					</div>

					{/* Color stripe preview */}
					<div className="mr-1 hidden items-center gap-0.5 md:flex">
						{TRIGGER_STRIPE.map((name) => {
							const color = TENANT_THEMES[name].themeColor;
							const isIt = name === selected;
							return (
								<span
									key={name}
									className={[
										'rounded-full ring-1 ring-black/10 dark:ring-white/10 transition-transform',
										isIt
											? 'h-3 w-3 ring-2 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-gray-900'
											: 'h-2.5 w-2.5',
									].join(' ')}
									style={{ backgroundColor: color }}
								/>
							);
						})}
					</div>

					{/* Chevron */}
					<ChevronDown
						className={[
							'h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-300',
							isOpen ? 'rotate-180' : '',
						].join(' ')}
					/>
				</div>

				{/* Bottom accent line — active theme color */}
				<span
					className={[
						'absolute bottom-0 left-0 h-[2px] transition-all duration-500',
						isOpen ? 'w-full' : 'w-0',
					].join(' ')}
					style={{ backgroundColor: activeColor }}
					aria-hidden
				/>
			</button>

			{/* ── Expandable panel (CSS grid trick for smooth height) ──────── */}
			<div
				className={[
					'grid transition-all duration-300 ease-in-out',
					isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
				].join(' ')}
			>
				<div className="overflow-hidden">
					<div className="space-y-4 border-t border-gray-100 px-4 pb-5 pt-4 dark:border-gray-800">
						<ThemeSection
							title="Reimagined Classics"
							themes={CLASSIC_THEMES}
							selected={selected}
							onSelect={handleSelect}
						/>

						{/* Gradient rule */}
						<div
							className="h-px"
							style={{
								background: `linear-gradient(to right, transparent, ${activeColor}50, transparent)`,
							}}
						/>

						<ThemeSection
							title="Bold & New"
							themes={BOLD_THEMES}
							selected={selected}
							onSelect={handleSelect}
						/>

						{/* Footer hint */}
						<p className="text-center text-[10px] text-gray-400 dark:text-gray-600">
							Hover any swatch to preview · Changes apply instantly
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
