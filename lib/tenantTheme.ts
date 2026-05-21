import {
	DEFAULT_TENANT_THEME_NAME,
	TENANT_THEME_NAMES,
	type TenantThemeName,
} from '@/types/tenantTheme';

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Add the following 20 new theme names to TENANT_THEME_NAMES in
// @/types/tenantTheme.ts:
//   'nebula' | 'volcanic' | 'sakura' | 'void' | 'neonoir' | 'sandstorm' |
//   'solstice' | 'absinthe' | 'ultraviolet' | 'prism' | 'thunderstorm' |
//   'pharaoh' | 'samurai' | 'habanero' | 'biodome' | 'carnival' |
//   'radioactive' | 'quicksilver' | 'catacomb' | 'bioluminescent'
// ─────────────────────────────────────────────────────────────────────────────

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
	if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
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
		baseRgb.b + (targetRgb.b - baseRgb.b) * clampedRatio,
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
		[r1, g1] = [chroma, x];
	} else if (hPrime >= 1 && hPrime < 2) {
		[r1, g1] = [x, chroma];
	} else if (hPrime >= 2 && hPrime < 3) {
		[g1, b1] = [chroma, x];
	} else if (hPrime >= 3 && hPrime < 4) {
		[g1, b1] = [x, chroma];
	} else if (hPrime >= 4 && hPrime < 5) {
		[r1, b1] = [x, chroma];
	} else {
		[r1, b1] = [chroma, x];
	}
	const match = l - chroma / 2;
	return rgbToHex((r1 + match) * 255, (g1 + match) * 255, (b1 + match) * 255);
};

const shiftHue = (hex: string, degrees: number): string => {
	const { h, s, l } = hexToHsl(hex);
	return hslToHex((h + degrees + 360) % 360, s, l);
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
	return COLOR_SCALE_STOPS.reduce((acc, stop) => {
		acc[stop] = applyTone(activeBase, toneMap[stop]);
		return acc;
	}, {} as ColorScale);
};

const scaleToVariables = (
	families: readonly string[],
	scale: ColorScale,
): ThemeVariables =>
	families.reduce((acc, family) => {
		COLOR_SCALE_STOPS.forEach((stop) => {
			acc[`--color-${family}-${stop}`] = scale[stop];
		});
		return acc;
	}, {} as ThemeVariables);

const buildDerivedThemeVariables = (
	theme: TenantThemeDefinition,
	mode: ThemeMode,
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
		mode === 'dark' ? 0.26 : 0.18,
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
		'--color-gray-dark':
			mode === 'dark' ? neutralScale['950'] : neutralScale['900'],
		'--color-theme-pink-500': dangerScale['500'],
		'--color-theme-purple-500': infoScale['500'],
		'--color-black': neutralScale['950'],
		'--destructive': mode === 'dark' ? dangerScale['400'] : dangerScale['600'],
		'--ring': mode === 'dark' ? infoScale['300'] : infoScale['400'],
		'--primary': mode === 'dark' ? infoScale['400'] : infoScale['600'],
		'--primary-foreground': mode === 'dark' ? neutralScale['950'] : '#ffffff',
		'--accent': mode === 'dark' ? infoScale['900'] : infoScale['50'],
		'--accent-foreground':
			mode === 'dark' ? neutralScale['50'] : neutralScale['900'],
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
	darkText = '#0f172a',
): string =>
	contrastRatio(background, lightText) >= contrastRatio(background, darkText)
		? lightText
		: darkText;

// ─────────────────────────────────────────────────────────────────────────────
// 40 ULTRA-CREATIVE THEME PALETTES
// Organized: 20 reimagined classics + 20 bold new themes
// Each palette chosen for maximum visual impact in both light and dark mode
// ─────────────────────────────────────────────────────────────────────────────

const CONTRAST_THEME_PALETTES: Record<TenantThemeName, ContrastThemePalette> = {
	// ── REIMAGINED CLASSICS ───────────────────────────────────────────────────

	/**
	 * HORIZON — Hyperspace violet tears through a solar gold corona.
	 * Deep space launch energy: the moment before warp drive engages.
	 */
	horizon: {
		label: 'Hyperspace Violet & Solar Gold',
		primary: '#3b0764',
		secondary: '#f59e0b',
		lightAccent: '#fef9c3',
		lightSidebar: '#1e0a38',
		lightSidebarAccent: '#2d1254',
		darkAccent: '#1a1000',
		darkSidebar: '#0d0520',
		darkSidebarAccent: '#1a0a38',
	},

	/**
	 * OCEAN — Abyssal midnight navy fused with phosphorescent seafoam.
	 * 4,000 meters down: pressure darkness broken by living light.
	 */
	ocean: {
		label: 'Abyssal Midnight & Phosphor Foam',
		primary: '#0c4a6e',
		secondary: '#06d6a0',
		lightAccent: '#ecfdf5',
		lightSidebar: '#041018',
		lightSidebarAccent: '#071e30',
		darkAccent: '#021810',
		darkSidebar: '#020810',
		darkSidebarAccent: '#041520',
	},

	/**
	 * EMERALD — Poison malachite green meets volcanic basalt black.
	 * Primordial earth: mineral-rich, dense, and ancient.
	 */
	emerald: {
		label: 'Poison Malachite & Volcanic Basalt',
		primary: '#064e3b',
		secondary: '#1c1917',
		lightAccent: '#f0fdf4',
		lightSidebar: '#0a2018',
		lightSidebarAccent: '#0f3028',
		darkAccent: '#040d06',
		darkSidebar: '#020a06',
		darkSidebarAccent: '#071a0e',
	},

	/**
	 * SUNSET — Magenta dusk bleeds into cobalt night sky.
	 * The exact moment the sun vanishes: chromatic and cinematic.
	 */
	sunset: {
		label: 'Magenta Dusk & Cobalt Night',
		primary: '#be185d',
		secondary: '#1e40af',
		lightAccent: '#fce7f3',
		lightSidebar: '#fff0f8',
		lightSidebarAccent: '#fad8ec',
		darkAccent: '#0d0a2a',
		darkSidebar: '#0a0520',
		darkSidebarAccent: '#150a38',
	},

	/**
	 * MIDNIGHT — Supernova plasma orange ignites against space-black void.
	 * A star dying: furious orange light against absolute darkness.
	 */
	midnight: {
		label: 'Supernova Plasma & Space Void',
		primary: '#ea580c',
		secondary: '#09090b',
		lightAccent: '#fff7ed',
		lightSidebar: '#0a0a0c',
		lightSidebarAccent: '#18161a',
		darkAccent: '#1c0800',
		darkSidebar: '#050506',
		darkSidebarAccent: '#100804',
	},

	/**
	 * CORAL — Living reef scarlet pulses against abyssal cerulean deep.
	 * The world's most biodiverse ecosystem: vivid and irreplaceable.
	 */
	coral: {
		label: 'Living Reef Scarlet & Abyss Cerulean',
		primary: '#e11d48',
		secondary: '#0369a1',
		lightAccent: '#fff1f2',
		lightSidebar: '#fff5f6',
		lightSidebarAccent: '#ffe4e8',
		darkAccent: '#001828',
		darkSidebar: '#040c18',
		darkSidebarAccent: '#081828',
	},

	/**
	 * FOREST — Ancient redwood bark red stands against lichen silver mist.
	 * A 2,000-year-old tree: rust-dark core wrapped in cool silver fog.
	 */
	forest: {
		label: 'Ancient Redwood & Lichen Silver',
		primary: '#7c2d12',
		secondary: '#64748b',
		lightAccent: '#f8fafc',
		lightSidebar: '#3d1208',
		lightSidebarAccent: '#5a1f10',
		darkAccent: '#0d0604',
		darkSidebar: '#1a0804',
		darkSidebarAccent: '#2a1008',
	},

	/**
	 * COPPER — Verdigris oxidized teal fused with molten raw copper.
	 * A bronze statue left to weather: the color of time itself.
	 */
	copper: {
		label: 'Verdigris Patina & Molten Copper',
		primary: '#0d9488',
		secondary: '#c2410c',
		lightAccent: '#fff7ed',
		lightSidebar: '#041a18',
		lightSidebarAccent: '#072e28',
		darkAccent: '#1c0600',
		darkSidebar: '#020e0c',
		darkSidebarAccent: '#051a16',
	},

	/**
	 * ROSE — Dried rose petal mauve against deep Prussian ink.
	 * A pressed flower in an old letter: faded beauty, dark longing.
	 */
	rose: {
		label: 'Dried Rose Mauve & Prussian Ink',
		primary: '#9d174d',
		secondary: '#1e3a5f',
		lightAccent: '#fdf2f8',
		lightSidebar: '#fff5fb',
		lightSidebarAccent: '#fce7f3',
		darkAccent: '#0d0818',
		darkSidebar: '#080514',
		darkSidebarAccent: '#120a24',
	},

	/**
	 * SLATE — Raw graphite concrete wall slashed by laser crimson.
	 * Brutalist architecture meets a fire alarm: industrial and urgent.
	 */
	slate: {
		label: 'Raw Graphite & Laser Crimson',
		primary: '#1e293b',
		secondary: '#ef4444',
		lightAccent: '#fef2f2',
		lightSidebar: '#0f172a',
		lightSidebarAccent: '#1e293b',
		darkAccent: '#200000',
		darkSidebar: '#080c14',
		darkSidebarAccent: '#111827',
	},

	/**
	 * AURORA — Polar aurora teal dances with geomagnetic solar crimson.
	 * Charged particles colliding at the magnetic pole: nature's light show.
	 */
	aurora: {
		label: 'Polar Aurora & Geomagnetic Crimson',
		primary: '#0d9488',
		secondary: '#dc2626',
		lightAccent: '#f0fdfa',
		lightSidebar: '#ecfdf5',
		lightSidebarAccent: '#d1fae5',
		darkAccent: '#140000',
		darkSidebar: '#021a18',
		darkSidebarAccent: '#043028',
	},

	/**
	 * AMETHYST — Royal dark amethyst crystal facets catch solar gold.
	 * A Victorian jewel box: rich purple shadows with gold fire inside.
	 */
	amethyst: {
		label: 'Royal Amethyst Crystal & Solar Gold',
		primary: '#581c87',
		secondary: '#d97706',
		lightAccent: '#fefce8',
		lightSidebar: '#1a0840',
		lightSidebarAccent: '#2a1260',
		darkAccent: '#1a1000',
		darkSidebar: '#0d0420',
		darkSidebarAccent: '#180830',
	},

	/**
	 * RUBY — Imperial blood ruby deep red against arctic platinum silver.
	 * Crown jewels in a frozen vault: heat and cold in tension.
	 */
	ruby: {
		label: 'Imperial Blood Ruby & Arctic Platinum',
		primary: '#991b1b',
		secondary: '#94a3b8',
		lightAccent: '#f8fafc',
		lightSidebar: '#f1f5f9',
		lightSidebarAccent: '#e2e8f0',
		darkAccent: '#0f0505',
		darkSidebar: '#100606',
		darkSidebarAccent: '#1c0a0a',
	},

	/**
	 * GLACIER — Cracked glacier cobalt blue over subglacial volcanic orange.
	 * Ice shelf above, magma chamber below: tectonic beauty.
	 */
	glacier: {
		label: 'Cracked Glacier Blue & Subglacial Heat',
		primary: '#0369a1',
		secondary: '#ea580c',
		lightAccent: '#fff7ed',
		lightSidebar: '#e0f2fe',
		lightSidebarAccent: '#bae6fd',
		darkAccent: '#1c0600',
		darkSidebar: '#041828',
		darkSidebarAccent: '#082840',
	},

	/**
	 * CITRUS — Blood orange scorched fire against shadow obsidian black.
	 * The most vivid fruit split open in a dark room: all contrast, no apology.
	 */
	citrus: {
		label: 'Blood Orange Blaze & Shadow Obsidian',
		primary: '#c2410c',
		secondary: '#1c1917',
		lightAccent: '#fff7ed',
		lightSidebar: '#1c0a04',
		lightSidebarAccent: '#2a1208',
		darkAccent: '#1a0400',
		darkSidebar: '#0a0503',
		darkSidebarAccent: '#180804',
	},

	/**
	 * ESPRESSO — Triple-shot espresso roast with burnt caramel crema.
	 * The entire coffee shop distilled into a UI: warm, dark, complex.
	 */
	espresso: {
		label: 'Triple Roast Espresso & Burnt Caramel',
		primary: '#7c3522',
		secondary: '#d4a96a',
		lightAccent: '#fef9f0',
		lightSidebar: '#180a04',
		lightSidebarAccent: '#2a1208',
		darkAccent: '#1a0a00',
		darkSidebar: '#0c0602',
		darkSidebarAccent: '#1c0e06',
	},

	/**
	 * LAGOON — Maldives crystal-clear turquoise over volcanic black sand.
	 * The most beautiful beach on earth: impossible blue, impossible dark.
	 */
	lagoon: {
		label: 'Maldives Turquoise & Black Sand Shore',
		primary: '#0891b2',
		secondary: '#1c1917',
		lightAccent: '#ecfeff',
		lightSidebar: '#ecfeff',
		lightSidebarAccent: '#cffafe',
		darkAccent: '#041010',
		darkSidebar: '#040c10',
		darkSidebarAccent: '#071820',
	},

	/**
	 * EMBER — White-hot forge ember against carbon-black void.
	 * Steel at 1,400°C: incandescent core, cold darkness surrounding it.
	 */
	ember: {
		label: 'White-Hot Forge & Carbon Void',
		primary: '#f97316',
		secondary: '#0c0a09',
		lightAccent: '#fff7ed',
		lightSidebar: '#0c0a09',
		lightSidebarAccent: '#1c1512',
		darkAccent: '#1c0800',
		darkSidebar: '#060504',
		darkSidebarAccent: '#100a06',
	},

	/**
	 * ORCHID — Black orchid deep violet blooms with rose gold petal dust.
	 * The rarest flower in darkness: opulent, mysterious, warm.
	 */
	orchid: {
		label: 'Black Orchid Violet & Rose Gold Dust',
		primary: '#3b0764',
		secondary: '#be9b7b',
		lightAccent: '#fdf4ff',
		lightSidebar: '#1a0430',
		lightSidebarAccent: '#2a0850',
		darkAccent: '#180a08',
		darkSidebar: '#0a0218',
		darkSidebarAccent: '#180630',
	},

	/**
	 * GILDED — Imperial jade green throne inlaid with burnished brass gold.
	 * A Qing dynasty imperial chamber: jade, brass, eternity.
	 */
	gilded: {
		label: 'Imperial Jade & Burnished Brass Gold',
		primary: '#065f46',
		secondary: '#b45309',
		lightAccent: '#fef3c7',
		lightSidebar: '#022c22',
		lightSidebarAccent: '#064e3b',
		darkAccent: '#1a0e00',
		darkSidebar: '#011a14',
		darkSidebarAccent: '#033d2e',
	},

	// ── 20 BOLD NEW THEMES ────────────────────────────────────────────────────

	/**
	 * NEBULA — A star nursery pulses: nebula magenta gas clouds lit by
	 * newborn stardust gold. The sidebar is the void between galaxies.
	 */
	nebula: {
		label: 'Nebula Magenta & Stardust Gold',
		primary: '#9d174d',
		secondary: '#f59e0b',
		lightAccent: '#fef9c3',
		lightSidebar: '#1a0424',
		lightSidebarAccent: '#2d0840',
		darkAccent: '#1a1000',
		darkSidebar: '#0d0214',
		darkSidebarAccent: '#1e0628',
	},

	/**
	 * VOLCANIC — Pyroclastic obsidian shell veined with magma orange rivers.
	 * A stratovolcano cross-section: black crust, molten core bleeding through.
	 */
	volcanic: {
		label: 'Pyroclastic Obsidian & Magma River',
		primary: '#292524',
		secondary: '#f97316',
		lightAccent: '#fff7ed',
		lightSidebar: '#0f0d0c',
		lightSidebarAccent: '#1e1410',
		darkAccent: '#1c1008',
		darkSidebar: '#080605',
		darkSidebarAccent: '#1a0e09',
	},

	/**
	 * SAKURA — Cherry blossom silk pink brushed against matcha bamboo green.
	 * A Japanese garden in April: soft petals, strong stems, fleeting beauty.
	 */
	sakura: {
		label: 'Cherry Blossom Silk & Matcha Bamboo',
		primary: '#db2777',
		secondary: '#15803d',
		lightAccent: '#f0fdf4',
		lightSidebar: '#fff0f8',
		lightSidebarAccent: '#fce7f3',
		darkAccent: '#021408',
		darkSidebar: '#0a0508',
		darkSidebarAccent: '#1a0c14',
	},

	/**
	 * VOID — An event horizon swallows all light; a single pulsar white
	 * signal pierces through. Maximum negative space, maximum tension.
	 */
	void: {
		label: 'Event Horizon & Pulsar Signal',
		primary: '#09090b',
		secondary: '#e4e4e7',
		lightAccent: '#fafafa',
		lightSidebar: '#fafafa',
		lightSidebarAccent: '#f4f4f5',
		darkAccent: '#18181b',
		darkSidebar: '#030303',
		darkSidebarAccent: '#0d0d0f',
	},

	/**
	 * NEONOIR — Wet asphalt city slick, slashed by electric acid-lime neon.
	 * A 3 AM detective story: dark streets, buzzing signs, rain-soaked chrome.
	 */
	neonoir: {
		label: 'Wet Asphalt Noir & Acid Lime Neon',
		primary: '#18181b',
		secondary: '#84cc16',
		lightAccent: '#f7ffe4',
		lightSidebar: '#0a0a0b',
		lightSidebarAccent: '#141416',
		darkAccent: '#0e1a00',
		darkSidebar: '#050506',
		darkSidebarAccent: '#0f0f12',
	},

	/**
	 * SANDSTORM — Saharan burnt terracotta dunes meet electric storm-petrel blue.
	 * Desert and Atlantic collide: ancient heat, approaching tempest.
	 */
	sandstorm: {
		label: 'Saharan Terracotta & Storm-Petrel Blue',
		primary: '#b45309',
		secondary: '#0369a1',
		lightAccent: '#e0f2fe',
		lightSidebar: '#fdf6ed',
		lightSidebarAccent: '#f5e4c8',
		darkAccent: '#001828',
		darkSidebar: '#1e0c00',
		darkSidebarAccent: '#2e1800',
	},

	/**
	 * SOLSTICE — Midsummer vermilion sun bleeds into winter cosmos indigo.
	 * The year's turning point: maximum fire against maximum cold.
	 */
	solstice: {
		label: 'Midsummer Vermilion & Winter Cosmos',
		primary: '#b91c1c',
		secondary: '#312e81',
		lightAccent: '#eef2ff',
		lightSidebar: '#312e81',
		lightSidebarAccent: '#3730a3',
		darkAccent: '#0d0820',
		darkSidebar: '#0f0e26',
		darkSidebarAccent: '#1a1840',
	},

	/**
	 * ABSINTHE — La Fée Verte's botanical chartreuse against laudanum violet.
	 * Belle époque excess: the green fairy dances in a purple haze.
	 */
	absinthe: {
		label: 'La Fée Verte & Laudanum Violet',
		primary: '#4d7c0f',
		secondary: '#4c1d95',
		lightAccent: '#f3e8ff',
		lightSidebar: '#0a1402',
		lightSidebarAccent: '#1a2a10',
		darkAccent: '#150a28',
		darkSidebar: '#050a01',
		darkSidebarAccent: '#100820',
	},

	/**
	 * ULTRAVIOLET — A blacklight floods the room: UV deep indigo irradiates
	 * reactor-core chartreuse. Beyond visible — scientific and strange.
	 */
	ultraviolet: {
		label: 'Blacklight Indigo & Reactor Chartreuse',
		primary: '#3b0764',
		secondary: '#65a30d',
		lightAccent: '#f7ffe4',
		lightSidebar: '#180430',
		lightSidebarAccent: '#240850',
		darkAccent: '#081600',
		darkSidebar: '#0c0220',
		darkSidebarAccent: '#180c30',
	},

	/**
	 * PRISM — Spectral hot magenta refracts into cool deep teal.
	 * White light split by glass: two extremes of the visible spectrum.
	 */
	prism: {
		label: 'Spectral Magenta & Refractive Teal',
		primary: '#be185d',
		secondary: '#0d9488',
		lightAccent: '#f0fdfa',
		lightSidebar: '#fff0f8',
		lightSidebarAccent: '#fce7f3',
		darkAccent: '#021a18',
		darkSidebar: '#080515',
		darkSidebarAccent: '#100a20',
	},

	/**
	 * THUNDERSTORM — A cumulonimbus storm cell dark navy charged by
	 * forked lightning arc yellow. The air tastes like ozone.
	 */
	thunderstorm: {
		label: 'Cumulonimbus Navy & Lightning Arc',
		primary: '#1e3a5f',
		secondary: '#fbbf24',
		lightAccent: '#fefce8',
		lightSidebar: '#0c1828',
		lightSidebarAccent: '#142240',
		darkAccent: '#1c1400',
		darkSidebar: '#080e18',
		darkSidebarAccent: '#101c30',
	},

	/**
	 * PHARAOH — Lapis lazuli tomb blue as deep as the Nile, with
	 * solar falcon god gold. Divine power. Five thousand years of it.
	 */
	pharaoh: {
		label: 'Lapis Lazuli Tomb & Solar Falcon Gold',
		primary: '#1d4ed8',
		secondary: '#ca8a04',
		lightAccent: '#fef9c3',
		lightSidebar: '#1e3a8a',
		lightSidebarAccent: '#2563eb',
		darkAccent: '#1a1200',
		darkSidebar: '#0f1f4a',
		darkSidebarAccent: '#1a2e6a',
	},

	/**
	 * SAMURAI — Sumi ink black as a brushstroke, cut by dawn-light crimson.
	 * A brushed calligraphy scroll, a sword's edge at first light.
	 */
	samurai: {
		label: 'Sumi Ink Black & Dawn Crimson Edge',
		primary: '#1c1917',
		secondary: '#dc2626',
		lightAccent: '#fff1f2',
		lightSidebar: '#0f0e0d',
		lightSidebarAccent: '#1c1917',
		darkAccent: '#200000',
		darkSidebar: '#080807',
		darkSidebarAccent: '#141210',
	},

	/**
	 * HABANERO — Inferno chili fire red vs. glacial blue water immersion.
	 * The hottest pepper on earth dropped in an ice bath: pure sensation.
	 */
	habanero: {
		label: 'Inferno Chili Red & Glacial Blue',
		primary: '#b91c1c',
		secondary: '#0369a1',
		lightAccent: '#e0f2fe',
		lightSidebar: '#180606',
		lightSidebarAccent: '#280a0a',
		darkAccent: '#001828',
		darkSidebar: '#0a0303',
		darkSidebarAccent: '#180606',
	},

	/**
	 * BIODOME — Engineered viridian glass biosphere encased in carbon steel.
	 * Solarpunk future: life thriving inside industrial architecture.
	 */
	biodome: {
		label: 'Engineered Viridian & Carbon Steel',
		primary: '#064e3b',
		secondary: '#1f2937',
		lightAccent: '#f0fdf4',
		lightSidebar: '#020e08',
		lightSidebarAccent: '#041a10',
		darkAccent: '#040d06',
		darkSidebar: '#010703',
		darkSidebarAccent: '#0a1410',
	},

	/**
	 * CARNIVAL — Mardi Gras deep violet crown with saffron marigold confetti.
	 * Rio at peak carnival: the parade float, the feathers, the noise.
	 */
	carnival: {
		label: 'Mardi Gras Violet & Saffron Confetti',
		primary: '#7e22ce',
		secondary: '#ca8a04',
		lightAccent: '#fef9c3',
		lightSidebar: '#fdf4ff',
		lightSidebarAccent: '#f3e8ff',
		darkAccent: '#1a1000',
		darkSidebar: '#0e0418',
		darkSidebarAccent: '#1a0a28',
	},

	/**
	 * RADIOACTIVE — Uranium core yellow-green glows against fallout void black.
	 * A nuclear warning sign: do not touch, do not look away.
	 */
	radioactive: {
		label: 'Uranium Core & Fallout Void',
		primary: '#3f6212',
		secondary: '#09090b',
		lightAccent: '#f7ffe4',
		lightSidebar: '#080b03',
		lightSidebarAccent: '#121908',
		darkAccent: '#080a00',
		darkSidebar: '#040505',
		darkSidebarAccent: '#0a1204',
	},

	/**
	 * QUICKSILVER — Liquid mercury silver flows against volcanic crimson heat.
	 * Elemental alchemy: the unstable, reflective, reactive element #80.
	 */
	quicksilver: {
		label: 'Liquid Mercury & Volcanic Crimson',
		primary: '#475569',
		secondary: '#b91c1c',
		lightAccent: '#fff1f2',
		lightSidebar: '#f1f5f9',
		lightSidebarAccent: '#e2e8f0',
		darkAccent: '#1a0000',
		darkSidebar: '#090e14',
		darkSidebarAccent: '#111c2a',
	},

	/**
	 * CATACOMB — Ancient limestone gray against torchlight amber.
	 * The Paris ossuary at 60 feet below: stone, silence, one flame.
	 */
	catacomb: {
		label: 'Ancient Limestone & Torchlight Amber',
		primary: '#44403c',
		secondary: '#b45309',
		lightAccent: '#fef3c7',
		lightSidebar: '#fafaf9',
		lightSidebarAccent: '#f5f5f4',
		darkAccent: '#1c0e00',
		darkSidebar: '#0d0c0b',
		darkSidebarAccent: '#1c1a18',
	},

	/**
	 * BIOLUMINESCENT — Mariana abyssal dark ocean with anglerfish phosphor glow.
	 * 2km below the surface: absolute black, and something alive, glowing green.
	 */
	bioluminescent: {
		label: 'Mariana Abyss & Anglerfish Phosphor',
		primary: '#164e63',
		secondary: '#4ade80',
		lightAccent: '#f0fdf4',
		lightSidebar: '#061018',
		lightSidebarAccent: '#0c1f2e',
		darkAccent: '#021008',
		darkSidebar: '#030a10',
		darkSidebarAccent: '#071520',
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// Theme builder
// ─────────────────────────────────────────────────────────────────────────────

const buildContrastTheme = (
	name: TenantThemeName,
	palette: ContrastThemePalette,
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
				CONTRAST_THEME_PALETTES[themeName],
			);
			return acc;
		},
		{} as Record<TenantThemeName, TenantThemeDefinition>,
	);

const serializeThemeVariables = (variables: ThemeVariables) =>
	Object.entries(variables)
		.map(([key, value]) => `${key}:${value};`)
		.join('');

export const getTenantTheme = (
	themeName?: string | null,
): TenantThemeDefinition =>
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
		'tenant-theme',
	) as HTMLStyleElement | null;
	if (!tenantThemeStyle) {
		tenantThemeStyle = document.createElement('style');
		tenantThemeStyle.id = 'tenant-theme';
	}
	tenantThemeStyle.textContent = css;
	document.head.appendChild(tenantThemeStyle);

	let themeColorMeta = document.querySelector(
		'meta[name="theme-color"]',
	) as HTMLMetaElement | null;
	if (!themeColorMeta) {
		themeColorMeta = document.createElement('meta');
		themeColorMeta.setAttribute('name', 'theme-color');
	}
	themeColorMeta.setAttribute('content', resolvedTheme.themeColor);
	document.head.appendChild(themeColorMeta);
	document.documentElement.setAttribute('data-theme', resolvedTheme.name);
};

export const TENANT_THEME_OPTIONS = TENANT_THEME_NAMES.map((name) => ({
	name,
	label: TENANT_THEMES[name].label,
}));
