import {
	DEFAULT_TENANT_THEME_NAME,
	TENANT_THEME_NAMES,
	type TenantThemeName,
} from '@/types/tenantTheme';

type ThemeVariables = Record<string, string>;
type ThemeMode = 'light' | 'dark';
type ColorScaleStop =
	| '25'
	| '50'
	| '100'
	| '200'
	| '300'
	| '400'
	| '500'
	| '600'
	| '700'
	| '800'
	| '900'
	| '950';
type ColorScale = Record<ColorScaleStop, string>;

type TenantThemeDefinition = {
	name: TenantThemeName;
	label: string;
	themeColor: string;
	light: ThemeVariables;
	dark: ThemeVariables;
};

const COLOR_SCALE_STOPS: readonly ColorScaleStop[] = [
	'25',
	'50',
	'100',
	'200',
	'300',
	'400',
	'500',
	'600',
	'700',
	'800',
	'900',
	'950',
];

const LIGHT_TONE_MAP: Record<ColorScaleStop, number> = {
	'25': 0.95,
	'50': 0.9,
	'100': 0.82,
	'200': 0.68,
	'300': 0.5,
	'400': 0.25,
	'500': 0,
	'600': -0.12,
	'700': -0.24,
	'800': -0.38,
	'900': -0.52,
	'950': -0.68,
};

const DARK_TONE_MAP: Record<ColorScaleStop, number> = {
	'25': 0.94,
	'50': 0.88,
	'100': 0.78,
	'200': 0.62,
	'300': 0.44,
	'400': 0.2,
	'500': -0.02,
	'600': -0.16,
	'700': -0.3,
	'800': -0.44,
	'900': -0.58,
	'950': -0.74,
};

const COLOR_FAMILIES = {
	info: [
		'brand',
		'blue-light',
		'blue',
		'sky',
		'cyan',
		'teal',
		'indigo',
		'violet',
		'purple',
	] as const,
	success: ['success', 'green', 'emerald', 'lime'] as const,
	warning: ['warning', 'orange', 'amber', 'yellow'] as const,
	danger: ['error', 'red', 'rose', 'pink'] as const,
	neutral: ['gray', 'slate', 'zinc', 'neutral', 'stone'] as const,
};

const clamp = (value: number, min = 0, max = 255): number =>
	Math.min(max, Math.max(min, value));

const normalizeHexColor = (value: string): string => {
	const raw = value.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
		return raw.toLowerCase();
	}
	if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
		const [, r, g, b] = raw;
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}
	return '#2563eb';
};

const hexToRgb = (hex: string) => {
	const normalized = normalizeHexColor(hex);
	return {
		r: Number.parseInt(normalized.slice(1, 3), 16),
		g: Number.parseInt(normalized.slice(3, 5), 16),
		b: Number.parseInt(normalized.slice(5, 7), 16),
	};
};

const rgbToHex = (r: number, g: number, b: number): string =>
	`#${[r, g, b]
		.map((channel) => clamp(Math.round(channel)).toString(16).padStart(2, '0'))
		.join('')}`;

const mixHexColors = (base: string, target: string, ratio: number): string => {
	const clampedRatio = Math.min(1, Math.max(0, ratio));
	const baseRgb = hexToRgb(base);
	const targetRgb = hexToRgb(target);
	return rgbToHex(
		baseRgb.r + (targetRgb.r - baseRgb.r) * clampedRatio,
		baseRgb.g + (targetRgb.g - baseRgb.g) * clampedRatio,
		baseRgb.b + (targetRgb.b - baseRgb.b) * clampedRatio
	);
};

const hexToHsl = (hex: string) => {
	const { r, g, b } = hexToRgb(hex);
	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;
	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	const delta = max - min;
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1));
		switch (max) {
			case rNorm:
				h = 60 * (((gNorm - bNorm) / delta) % 6);
				break;
			case gNorm:
				h = 60 * ((bNorm - rNorm) / delta + 2);
				break;
			default:
				h = 60 * ((rNorm - gNorm) / delta + 4);
				break;
		}
	}
	if (h < 0) h += 360;
	return { h, s, l };
};

const hslToHex = (h: number, s: number, l: number): string => {
	if (s === 0) {
		const value = l * 255;
		return rgbToHex(value, value, value);
	}
	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const hPrime = h / 60;
	const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
	let r1 = 0;
	let g1 = 0;
	let b1 = 0;
	if (hPrime >= 0 && hPrime < 1) {
		r1 = chroma;
		g1 = x;
	} else if (hPrime >= 1 && hPrime < 2) {
		r1 = x;
		g1 = chroma;
	} else if (hPrime >= 2 && hPrime < 3) {
		g1 = chroma;
		b1 = x;
	} else if (hPrime >= 3 && hPrime < 4) {
		g1 = x;
		b1 = chroma;
	} else if (hPrime >= 4 && hPrime < 5) {
		r1 = x;
		b1 = chroma;
	} else {
		r1 = chroma;
		b1 = x;
	}
	const match = l - chroma / 2;
	return rgbToHex((r1 + match) * 255, (g1 + match) * 255, (b1 + match) * 255);
};

const shiftHue = (hex: string, degrees: number): string => {
	const { h, s, l } = hexToHsl(hex);
	const shifted = (h + degrees + 360) % 360;
	return hslToHex(shifted, s, l);
};

const applyTone = (baseColor: string, tone: number): string =>
	tone >= 0
		? mixHexColors(baseColor, '#ffffff', tone)
		: mixHexColors(baseColor, '#000000', Math.abs(tone));

const buildColorScale = (baseColor: string, mode: ThemeMode): ColorScale => {
	const normalizedBase = normalizeHexColor(baseColor);
	const toneMap = mode === 'dark' ? DARK_TONE_MAP : LIGHT_TONE_MAP;
	const activeBase =
		mode === 'dark'
			? mixHexColors(normalizedBase, '#ffffff', 0.08)
			: normalizedBase;
	return COLOR_SCALE_STOPS.reduce(
		(acc, stop) => {
			acc[stop] = applyTone(activeBase, toneMap[stop]);
			return acc;
		},
		{} as ColorScale
	);
};

const scaleToVariables = (
	families: readonly string[],
	scale: ColorScale
): ThemeVariables =>
	families.reduce((acc, family) => {
		COLOR_SCALE_STOPS.forEach((stop) => {
			acc[`--color-${family}-${stop}`] = scale[stop];
		});
		return acc;
	}, {} as ThemeVariables);

const buildDerivedThemeVariables = (
	theme: TenantThemeDefinition,
	mode: ThemeMode
): ThemeVariables => {
	const fallbackBrand =
		theme.light['--color-brand-500'] ||
		theme.dark['--color-brand-500'] ||
		theme.themeColor;
	const infoSeed =
		mode === 'dark'
			? theme.dark['--color-brand-500'] || fallbackBrand
			: theme.light['--color-brand-500'] || fallbackBrand;
	const successSeed = shiftHue(infoSeed, 105);
	const warningSeed = shiftHue(infoSeed, 55);
	const dangerSeed = shiftHue(infoSeed, -115);
	const neutralSeed = mixHexColors(
		mode === 'dark' ? '#8b95a7' : '#667085',
		infoSeed,
		mode === 'dark' ? 0.26 : 0.18
	);

	const infoScale = buildColorScale(infoSeed, mode);
	const successScale = buildColorScale(successSeed, mode);
	const warningScale = buildColorScale(warningSeed, mode);
	const dangerScale = buildColorScale(dangerSeed, mode);
	const neutralScale = buildColorScale(neutralSeed, mode);

	return {
		...scaleToVariables(COLOR_FAMILIES.info, infoScale),
		...scaleToVariables(COLOR_FAMILIES.success, successScale),
		...scaleToVariables(COLOR_FAMILIES.warning, warningScale),
		...scaleToVariables(COLOR_FAMILIES.danger, dangerScale),
		...scaleToVariables(COLOR_FAMILIES.neutral, neutralScale),
		'--color-gray-dark': mode === 'dark' ? neutralScale['950'] : neutralScale['900'],
		'--color-theme-pink-500': dangerScale['500'],
		'--color-theme-purple-500': infoScale['500'],
		'--color-black': neutralScale['950'],
		'--destructive': mode === 'dark' ? dangerScale['400'] : dangerScale['600'],
		'--ring': mode === 'dark' ? infoScale['300'] : infoScale['400'],
		'--primary': mode === 'dark' ? infoScale['400'] : infoScale['600'],
		'--primary-foreground': mode === 'dark' ? neutralScale['950'] : '#ffffff',
		'--accent': mode === 'dark' ? infoScale['900'] : infoScale['50'],
		'--accent-foreground': mode === 'dark' ? neutralScale['50'] : neutralScale['900'],
		'--sidebar-ring': mode === 'dark' ? infoScale['300'] : infoScale['400'],
		'--chart-1': infoScale['500'],
		'--chart-2': successScale['500'],
		'--chart-3': warningScale['500'],
		'--chart-4': dangerScale['500'],
		'--chart-5': infoScale['700'],
	};
};

const BASE_LIGHT_THEME_VARIABLES: ThemeVariables = {
	'--background': '#ffffff',
	'--foreground': '#101828',
	'--card': '#ffffff',
	'--card-foreground': '#101828',
	'--popover': '#ffffff',
	'--popover-foreground': '#101828',
	'--muted': '#f2f4f7',
	'--muted-foreground': '#667085',
	'--secondary': '#f2f4f7',
	'--secondary-foreground': '#1d2939',
	'--destructive': '#d92d20',
	'--border': '#e4e7ec',
	'--input': '#e4e7ec',
	'--accent': '#ecf3ff',
	'--primary': '#1d4ed8',
	'--primary-foreground': '#ffffff',
	'--accent-foreground': '#1d2939',
	'--ring': '#3b82f6',
	'--sidebar': '#f8fafc',
	'--sidebar-foreground': '#101828',
	'--sidebar-primary': '#1d4ed8',
	'--sidebar-primary-foreground': '#ffffff',
	'--sidebar-accent': '#e2e8f0',
	'--sidebar-accent-foreground': '#1d2939',
	'--sidebar-border': '#cbd5e1',
	'--sidebar-ring': '#3b82f6',
	'--chart-1': '#2563eb',
	'--chart-2': '#16a34a',
	'--chart-3': '#d97706',
	'--chart-4': '#dc2626',
	'--chart-5': '#4f46e5',
};

const BASE_DARK_THEME_VARIABLES: ThemeVariables = {
	'--background': '#0c111d',
	'--foreground': '#f9fafb',
	'--card': '#111827',
	'--card-foreground': '#f9fafb',
	'--popover': '#111827',
	'--popover-foreground': '#f9fafb',
	'--muted': '#1f2937',
	'--muted-foreground': '#98a2b3',
	'--secondary': '#1f2937',
	'--secondary-foreground': '#f9fafb',
	'--destructive': '#f04438',
	'--border': '#344054',
	'--input': '#344054',
	'--accent': '#1f2937',
	'--primary': '#60a5fa',
	'--primary-foreground': '#0f172a',
	'--accent-foreground': '#f9fafb',
	'--ring': '#60a5fa',
	'--sidebar': '#0f172a',
	'--sidebar-foreground': '#e2e8f0',
	'--sidebar-primary': '#60a5fa',
	'--sidebar-primary-foreground': '#0f172a',
	'--sidebar-accent': '#1f2937',
	'--sidebar-accent-foreground': '#e2e8f0',
	'--sidebar-border': '#334155',
	'--sidebar-ring': '#60a5fa',
	'--chart-1': '#60a5fa',
	'--chart-2': '#4ade80',
	'--chart-3': '#fbbf24',
	'--chart-4': '#fb7185',
	'--chart-5': '#818cf8',
};

const defineTheme = (theme: TenantThemeDefinition): TenantThemeDefinition => {
	const derivedLightVariables = buildDerivedThemeVariables(theme, 'light');
	const derivedDarkVariables = buildDerivedThemeVariables(theme, 'dark');
	return {
		...theme,
		light: {
			...BASE_LIGHT_THEME_VARIABLES,
			...derivedLightVariables,
			...theme.light,
		},
		dark: {
			...BASE_DARK_THEME_VARIABLES,
			...derivedDarkVariables,
			...theme.dark,
		},
	};
};

export const TENANT_THEMES: Record<TenantThemeName, TenantThemeDefinition> = {
	horizon: defineTheme({
		name: 'horizon',
		label: 'Horizon Blue',
		themeColor: '#2563eb',
		light: {
			'--color-brand-500': '#2563eb',
			'--color-brand-600': '#1d4ed8',
			'--color-brand-700': '#1e40af',
			'--primary': '#1d4ed8',
			'--accent': '#eff6ff',
			'--ring': '#3b82f6',
			'--sidebar': '#f7fbff',
			'--sidebar-foreground': '#0f172a',
			'--sidebar-primary': '#1d4ed8',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#e0efff',
			'--sidebar-accent-foreground': '#0f172a',
			'--sidebar-border': '#bfdbfe',
		},
		dark: {
			'--color-brand-500': '#60a5fa',
			'--color-brand-600': '#3b82f6',
			'--color-brand-700': '#2563eb',
			'--primary': '#60a5fa',
			'--accent': '#1e293b',
			'--ring': '#60a5fa',
			'--sidebar': '#0b1220',
			'--sidebar-foreground': '#e2e8f0',
			'--sidebar-primary': '#60a5fa',
			'--sidebar-primary-foreground': '#0f172a',
			'--sidebar-accent': '#1e293b',
			'--sidebar-accent-foreground': '#e2e8f0',
			'--sidebar-border': '#334155',
		},
	}),
	ocean: defineTheme({
		name: 'ocean',
		label: 'Ocean Teal',
		themeColor: '#0d9488',
		light: {
			'--color-brand-500': '#0d9488',
			'--color-brand-600': '#0f766e',
			'--color-brand-700': '#115e59',
			'--primary': '#0f766e',
			'--accent': '#ecfeff',
			'--ring': '#14b8a6',
			'--sidebar': '#f2fcfd',
			'--sidebar-foreground': '#082f49',
			'--sidebar-primary': '#0f766e',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#d1f5f2',
			'--sidebar-accent-foreground': '#082f49',
			'--sidebar-border': '#99f6e4',
		},
		dark: {
			'--color-brand-500': '#2dd4bf',
			'--color-brand-600': '#14b8a6',
			'--color-brand-700': '#0d9488',
			'--primary': '#2dd4bf',
			'--accent': '#1f2937',
			'--ring': '#2dd4bf',
			'--sidebar': '#062c30',
			'--sidebar-foreground': '#d1fae5',
			'--sidebar-primary': '#2dd4bf',
			'--sidebar-primary-foreground': '#042f2e',
			'--sidebar-accent': '#134e4a',
			'--sidebar-accent-foreground': '#d1fae5',
			'--sidebar-border': '#155e63',
		},
	}),
	emerald: defineTheme({
		name: 'emerald',
		label: 'Emerald Campus',
		themeColor: '#16a34a',
		light: {
			'--color-brand-500': '#16a34a',
			'--color-brand-600': '#15803d',
			'--color-brand-700': '#166534',
			'--primary': '#15803d',
			'--accent': '#f0fdf4',
			'--ring': '#22c55e',
			'--sidebar': '#f5fff7',
			'--sidebar-foreground': '#052e16',
			'--sidebar-primary': '#15803d',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#dcfce7',
			'--sidebar-accent-foreground': '#14532d',
			'--sidebar-border': '#bbf7d0',
		},
		dark: {
			'--color-brand-500': '#4ade80',
			'--color-brand-600': '#22c55e',
			'--color-brand-700': '#16a34a',
			'--primary': '#4ade80',
			'--accent': '#1f2937',
			'--ring': '#4ade80',
			'--sidebar': '#071f12',
			'--sidebar-foreground': '#dcfce7',
			'--sidebar-primary': '#4ade80',
			'--sidebar-primary-foreground': '#052e16',
			'--sidebar-accent': '#14532d',
			'--sidebar-accent-foreground': '#dcfce7',
			'--sidebar-border': '#166534',
		},
	}),
	sunset: defineTheme({
		name: 'sunset',
		label: 'Sunset Gold',
		themeColor: '#f59e0b',
		light: {
			'--color-brand-500': '#f59e0b',
			'--color-brand-600': '#d97706',
			'--color-brand-700': '#b45309',
			'--primary': '#d97706',
			'--accent': '#fffbeb',
			'--ring': '#f59e0b',
			'--sidebar': '#fffaf0',
			'--sidebar-foreground': '#451a03',
			'--sidebar-primary': '#d97706',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#fef3c7',
			'--sidebar-accent-foreground': '#78350f',
			'--sidebar-border': '#fcd34d',
		},
		dark: {
			'--color-brand-500': '#fbbf24',
			'--color-brand-600': '#f59e0b',
			'--color-brand-700': '#d97706',
			'--primary': '#fbbf24',
			'--accent': '#27272a',
			'--ring': '#fbbf24',
			'--sidebar': '#2c1702',
			'--sidebar-foreground': '#fef3c7',
			'--sidebar-primary': '#fbbf24',
			'--sidebar-primary-foreground': '#451a03',
			'--sidebar-accent': '#78350f',
			'--sidebar-accent-foreground': '#fef3c7',
			'--sidebar-border': '#92400e',
		},
	}),
	midnight: defineTheme({
		name: 'midnight',
		label: 'Midnight Indigo',
		themeColor: '#4f46e5',
		light: {
			'--color-brand-500': '#4f46e5',
			'--color-brand-600': '#4338ca',
			'--color-brand-700': '#3730a3',
			'--primary': '#4338ca',
			'--accent': '#eef2ff',
			'--ring': '#6366f1',
			'--sidebar': '#f6f8ff',
			'--sidebar-foreground': '#1e1b4b',
			'--sidebar-primary': '#4338ca',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#e0e7ff',
			'--sidebar-accent-foreground': '#312e81',
			'--sidebar-border': '#c7d2fe',
		},
		dark: {
			'--color-brand-500': '#818cf8',
			'--color-brand-600': '#6366f1',
			'--color-brand-700': '#4f46e5',
			'--primary': '#818cf8',
			'--accent': '#1f1f3a',
			'--ring': '#818cf8',
			'--sidebar': '#101225',
			'--sidebar-foreground': '#e0e7ff',
			'--sidebar-primary': '#818cf8',
			'--sidebar-primary-foreground': '#1e1b4b',
			'--sidebar-accent': '#312e81',
			'--sidebar-accent-foreground': '#e0e7ff',
			'--sidebar-border': '#3730a3',
		},
	}),
	coral: defineTheme({
		name: 'coral',
		label: 'Coral Bloom',
		themeColor: '#ea580c',
		light: {
			'--color-brand-500': '#ea580c',
			'--color-brand-600': '#c2410c',
			'--color-brand-700': '#9a3412',
			'--primary': '#c2410c',
			'--accent': '#fff7ed',
			'--ring': '#fb923c',
			'--sidebar': '#fff7f2',
			'--sidebar-foreground': '#431407',
			'--sidebar-primary': '#c2410c',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#ffedd5',
			'--sidebar-accent-foreground': '#7c2d12',
			'--sidebar-border': '#fdba74',
		},
		dark: {
			'--color-brand-500': '#fb923c',
			'--color-brand-600': '#f97316',
			'--color-brand-700': '#ea580c',
			'--primary': '#fb923c',
			'--accent': '#2a1a12',
			'--ring': '#fb923c',
			'--sidebar': '#2b1307',
			'--sidebar-foreground': '#ffedd5',
			'--sidebar-primary': '#fb923c',
			'--sidebar-primary-foreground': '#431407',
			'--sidebar-accent': '#7c2d12',
			'--sidebar-accent-foreground': '#ffedd5',
			'--sidebar-border': '#9a3412',
		},
	}),
	forest: defineTheme({
		name: 'forest',
		label: 'Forest Pine',
		themeColor: '#047857',
		light: {
			'--color-brand-500': '#047857',
			'--color-brand-600': '#065f46',
			'--color-brand-700': '#064e3b',
			'--primary': '#065f46',
			'--accent': '#ecfdf5',
			'--ring': '#10b981',
			'--sidebar': '#f2fff8',
			'--sidebar-foreground': '#022c22',
			'--sidebar-primary': '#065f46',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#d1fae5',
			'--sidebar-accent-foreground': '#065f46',
			'--sidebar-border': '#6ee7b7',
		},
		dark: {
			'--color-brand-500': '#34d399',
			'--color-brand-600': '#10b981',
			'--color-brand-700': '#059669',
			'--primary': '#34d399',
			'--accent': '#0f2a22',
			'--ring': '#34d399',
			'--sidebar': '#051d17',
			'--sidebar-foreground': '#d1fae5',
			'--sidebar-primary': '#34d399',
			'--sidebar-primary-foreground': '#022c22',
			'--sidebar-accent': '#14532d',
			'--sidebar-accent-foreground': '#d1fae5',
			'--sidebar-border': '#065f46',
		},
	}),
	copper: defineTheme({
		name: 'copper',
		label: 'Copper Clay',
		themeColor: '#b45309',
		light: {
			'--color-brand-500': '#b45309',
			'--color-brand-600': '#92400e',
			'--color-brand-700': '#78350f',
			'--primary': '#92400e',
			'--accent': '#fefce8',
			'--ring': '#d97706',
			'--sidebar': '#fdf9f3',
			'--sidebar-foreground': '#3f1d0b',
			'--sidebar-primary': '#92400e',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#fde7cc',
			'--sidebar-accent-foreground': '#78350f',
			'--sidebar-border': '#facc92',
		},
		dark: {
			'--color-brand-500': '#f59e0b',
			'--color-brand-600': '#d97706',
			'--color-brand-700': '#b45309',
			'--primary': '#f59e0b',
			'--accent': '#2b1b11',
			'--ring': '#f59e0b',
			'--sidebar': '#241408',
			'--sidebar-foreground': '#ffedd5',
			'--sidebar-primary': '#f59e0b',
			'--sidebar-primary-foreground': '#431407',
			'--sidebar-accent': '#7c2d12',
			'--sidebar-accent-foreground': '#ffedd5',
			'--sidebar-border': '#92400e',
		},
	}),
	rose: defineTheme({
		name: 'rose',
		label: 'Rose Petal',
		themeColor: '#db2777',
		light: {
			'--color-brand-500': '#db2777',
			'--color-brand-600': '#be185d',
			'--color-brand-700': '#9d174d',
			'--primary': '#be185d',
			'--accent': '#fff1f6',
			'--ring': '#ec4899',
			'--sidebar': '#fff6fa',
			'--sidebar-foreground': '#500724',
			'--sidebar-primary': '#be185d',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#fce7f3',
			'--sidebar-accent-foreground': '#831843',
			'--sidebar-border': '#f9a8d4',
		},
		dark: {
			'--color-brand-500': '#f472b6',
			'--color-brand-600': '#ec4899',
			'--color-brand-700': '#db2777',
			'--primary': '#f472b6',
			'--accent': '#2a1320',
			'--ring': '#f472b6',
			'--sidebar': '#2d1021',
			'--sidebar-foreground': '#fce7f3',
			'--sidebar-primary': '#f472b6',
			'--sidebar-primary-foreground': '#500724',
			'--sidebar-accent': '#831843',
			'--sidebar-accent-foreground': '#fce7f3',
			'--sidebar-border': '#9d174d',
		},
	}),
	slate: defineTheme({
		name: 'slate',
		label: 'Slate Steel',
		themeColor: '#0f766e',
		light: {
			'--color-brand-500': '#0f766e',
			'--color-brand-600': '#115e59',
			'--color-brand-700': '#134e4a',
			'--primary': '#115e59',
			'--accent': '#f1f5f9',
			'--ring': '#14b8a6',
			'--sidebar': '#f8fafc',
			'--sidebar-foreground': '#0f172a',
			'--sidebar-primary': '#115e59',
			'--sidebar-primary-foreground': '#ffffff',
			'--sidebar-accent': '#e2e8f0',
			'--sidebar-accent-foreground': '#1e293b',
			'--sidebar-border': '#cbd5e1',
		},
		dark: {
			'--color-brand-500': '#2dd4bf',
			'--color-brand-600': '#14b8a6',
			'--color-brand-700': '#0d9488',
			'--primary': '#2dd4bf',
			'--accent': '#1e293b',
			'--ring': '#2dd4bf',
			'--sidebar': '#0f172a',
			'--sidebar-foreground': '#e2e8f0',
			'--sidebar-primary': '#2dd4bf',
			'--sidebar-primary-foreground': '#042f2e',
			'--sidebar-accent': '#1e293b',
			'--sidebar-accent-foreground': '#e2e8f0',
			'--sidebar-border': '#334155',
		},
	}),
};

const serializeThemeVariables = (variables: ThemeVariables) =>
	Object.entries(variables)
		.map(([key, value]) => `${key}:${value};`)
		.join('');

export const getTenantTheme = (themeName?: string | null): TenantThemeDefinition =>
	TENANT_THEMES[(themeName as TenantThemeName) || DEFAULT_TENANT_THEME_NAME] ||
	TENANT_THEMES[DEFAULT_TENANT_THEME_NAME];

export const buildTenantThemeCss = (themeName?: string | null): string => {
	const theme = getTenantTheme(themeName);
	return `:root{${serializeThemeVariables(theme.light)}}.dark{${serializeThemeVariables(theme.dark)}}`;
};

export const resolveTenantThemeColor = (themeName?: string | null): string =>
	getTenantTheme(themeName).themeColor;

export const TENANT_THEME_OPTIONS = TENANT_THEME_NAMES.map((name) => ({
	name,
	label: TENANT_THEMES[name].label,
}));
