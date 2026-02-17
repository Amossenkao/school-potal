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

type ContrastThemePalette = {
	label: string;
	primary: string;
	secondary: string;
	lightAccent?: string;
	lightSidebar?: string;
	lightSidebarAccent?: string;
	darkAccent?: string;
	darkSidebar?: string;
	darkSidebarAccent?: string;
};

const toLinearColorChannel = (value: number): number => {
	const normalized = value / 255;
	return normalized <= 0.04045
		? normalized / 12.92
		: ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string): number => {
	const { r, g, b } = hexToRgb(hex);
	return (
		0.2126 * toLinearColorChannel(r) +
		0.7152 * toLinearColorChannel(g) +
		0.0722 * toLinearColorChannel(b)
	);
};

const contrastRatio = (background: string, foreground: string): number => {
	const bg = relativeLuminance(background);
	const fg = relativeLuminance(foreground);
	const lighter = Math.max(bg, fg);
	const darker = Math.min(bg, fg);
	return (lighter + 0.05) / (darker + 0.05);
};

const getReadableForeground = (
	background: string,
	lightText = '#f9fafb',
	darkText = '#0f172a'
): string =>
	contrastRatio(background, lightText) >= contrastRatio(background, darkText)
		? lightText
		: darkText;

const CONTRAST_THEME_PALETTES: Record<TenantThemeName, ContrastThemePalette> = {
	horizon: {
		label: 'Cobalt & Amber',
		primary: '#1d4ed8',
		secondary: '#f59e0b',
	},
	ocean: {
		label: 'Teal & Coral',
		primary: '#0f766e',
		secondary: '#fb7185',
	},
	emerald: {
		label: 'Emerald & Indigo',
		primary: '#15803d',
		secondary: '#4338ca',
	},
	sunset: {
		label: 'Orange & Navy',
		primary: '#c2410c',
		secondary: '#1e3a8a',
	},
	midnight: {
		label: 'Indigo & Lime',
		primary: '#3730a3',
		secondary: '#84cc16',
	},
	coral: {
		label: 'Vermilion & Cyan',
		primary: '#ea580c',
		secondary: '#06b6d4',
	},
	forest: {
		label: 'Pine & Gold',
		primary: '#166534',
		secondary: '#d4af37',
	},
	copper: {
		label: 'Copper & Charcoal',
		primary: '#b45309',
		secondary: '#111827',
	},
	rose: {
		label: 'Fuchsia & Slate',
		primary: '#be185d',
		secondary: '#334155',
	},
	slate: {
		label: 'Graphite & Mint',
		primary: '#334155',
		secondary: '#10b981',
	},
	aurora: {
		label: 'Cyan & Plum',
		primary: '#0891b2',
		secondary: '#7c3aed',
	},
	amethyst: {
		label: 'Violet & Sunflower',
		primary: '#6d28d9',
		secondary: '#facc15',
	},
	ruby: {
		label: 'Ruby & Ice',
		primary: '#b91c1c',
		secondary: '#7dd3fc',
	},
	glacier: {
		label: 'Sky & Burgundy',
		primary: '#0284c7',
		secondary: '#9f1239',
	},
	citrus: {
		label: 'Lime & Royal',
		primary: '#65a30d',
		secondary: '#5b21b6',
	},
	espresso: {
		label: 'Espresso & Turquoise',
		primary: '#7c4a2d',
		secondary: '#2dd4bf',
	},
	lagoon: {
		label: 'Lagoon & Tangerine',
		primary: '#0e7490',
		secondary: '#f97316',
	},
	ember: {
		label: 'Ember & Electric Blue',
		primary: '#dc2626',
		secondary: '#2563eb',
	},
	orchid: {
		label: 'Orchid & Aqua',
		primary: '#a21caf',
		secondary: '#14b8a6',
	},
	gilded: {
		label: 'Gold & Black',
		primary: '#d4af37',
		secondary: '#0a0a0a',
		lightAccent: '#fff3c2',
		lightSidebar: '#0d0d0d',
		lightSidebarAccent: '#1f1a0a',
		darkAccent: '#19150a',
		darkSidebar: '#050505',
		darkSidebarAccent: '#221b0a',
	},
};

const buildContrastTheme = (
	name: TenantThemeName,
	palette: ContrastThemePalette
): TenantThemeDefinition => {
	const primaryColor = normalizeHexColor(palette.primary);
	const secondaryColor = normalizeHexColor(palette.secondary);

	const lightPrimary = mixHexColors(primaryColor, '#000000', 0.14);
	const lightAccent = palette.lightAccent
		? normalizeHexColor(palette.lightAccent)
		: mixHexColors(secondaryColor, '#ffffff', 0.9);
	const lightSidebar = palette.lightSidebar
		? normalizeHexColor(palette.lightSidebar)
		: mixHexColors(secondaryColor, '#ffffff', 0.86);
	const lightSidebarAccent = palette.lightSidebarAccent
		? normalizeHexColor(palette.lightSidebarAccent)
		: mixHexColors(secondaryColor, '#ffffff', 0.74);

	const darkPrimary = mixHexColors(primaryColor, '#ffffff', 0.22);
	const darkAccent = palette.darkAccent
		? normalizeHexColor(palette.darkAccent)
		: mixHexColors(secondaryColor, '#000000', 0.72);
	const darkSidebar = palette.darkSidebar
		? normalizeHexColor(palette.darkSidebar)
		: mixHexColors(secondaryColor, '#000000', 0.82);
	const darkSidebarAccent = palette.darkSidebarAccent
		? normalizeHexColor(palette.darkSidebarAccent)
		: mixHexColors(secondaryColor, '#000000', 0.62);
	const darkSidebarPrimary = mixHexColors(primaryColor, '#ffffff', 0.26);

	return defineTheme({
		name,
		label: palette.label,
		themeColor: primaryColor,
		light: {
			'--color-brand-500': primaryColor,
			'--color-brand-600': mixHexColors(primaryColor, '#000000', 0.18),
			'--color-brand-700': mixHexColors(primaryColor, '#000000', 0.32),
			'--primary': lightPrimary,
			'--primary-foreground': getReadableForeground(lightPrimary),
			'--accent': lightAccent,
			'--accent-foreground': getReadableForeground(lightAccent),
			'--ring': mixHexColors(secondaryColor, '#ffffff', 0.14),
			'--sidebar': lightSidebar,
			'--sidebar-foreground': getReadableForeground(lightSidebar),
			'--sidebar-primary': primaryColor,
			'--sidebar-primary-foreground': getReadableForeground(primaryColor),
			'--sidebar-accent': lightSidebarAccent,
			'--sidebar-accent-foreground': getReadableForeground(lightSidebarAccent),
			'--sidebar-border': mixHexColors(secondaryColor, '#ffffff', 0.55),
		},
		dark: {
			'--color-brand-500': mixHexColors(primaryColor, '#ffffff', 0.18),
			'--color-brand-600': mixHexColors(primaryColor, '#ffffff', 0.08),
			'--color-brand-700': primaryColor,
			'--primary': darkPrimary,
			'--primary-foreground': getReadableForeground(darkPrimary),
			'--accent': darkAccent,
			'--accent-foreground': getReadableForeground(darkAccent),
			'--ring': mixHexColors(secondaryColor, '#ffffff', 0.34),
			'--sidebar': darkSidebar,
			'--sidebar-foreground': getReadableForeground(darkSidebar),
			'--sidebar-primary': darkSidebarPrimary,
			'--sidebar-primary-foreground': getReadableForeground(darkSidebarPrimary),
			'--sidebar-accent': darkSidebarAccent,
			'--sidebar-accent-foreground': getReadableForeground(darkSidebarAccent),
			'--sidebar-border': mixHexColors(secondaryColor, '#ffffff', 0.18),
		},
	});
};

export const TENANT_THEMES: Record<TenantThemeName, TenantThemeDefinition> =
	TENANT_THEME_NAMES.reduce(
		(acc, themeName) => {
			acc[themeName] = buildContrastTheme(
				themeName,
				CONTRAST_THEME_PALETTES[themeName]
			);
			return acc;
		},
		{} as Record<TenantThemeName, TenantThemeDefinition>
	);

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

export const applyTenantThemeToDocument = (themeName?: string | null): void => {
	if (typeof document === 'undefined') return;

	const resolvedTheme = getTenantTheme(themeName);
	const css = buildTenantThemeCss(resolvedTheme.name);

	let tenantThemeStyle = document.getElementById(
		'tenant-theme'
	) as HTMLStyleElement | null;
	if (!tenantThemeStyle) {
		tenantThemeStyle = document.createElement('style');
		tenantThemeStyle.id = 'tenant-theme';
	}
	tenantThemeStyle.textContent = css;
	document.head.appendChild(tenantThemeStyle);

	let themeColorMeta = document.querySelector(
		'meta[name="theme-color"]'
	) as HTMLMetaElement | null;
	if (!themeColorMeta) {
		themeColorMeta = document.createElement('meta');
		themeColorMeta.setAttribute('name', 'theme-color');
	}
	themeColorMeta.setAttribute('content', resolvedTheme.themeColor);
	document.head.appendChild(themeColorMeta);
};

export const TENANT_THEME_OPTIONS = TENANT_THEME_NAMES.map((name) => ({
	name,
	label: TENANT_THEMES[name].label,
}));
