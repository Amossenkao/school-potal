export const TENANT_THEME_NAMES = [
	'auroraForge',
	'blueprint',
	'chromaticPop',
	'cyberBloom',
	'deepSignal',
	'electricCitrus',
	'emberMint',
	'glassLagoon',
	'goldCircuit',
	'inkCoral',
	'jadePixel',
	'lunarViolet',
	'metroPulse',
	'orchidVolt',
	'polarSignal',
	'roseQuartz',
	'solarGraphite',
	'tidalCopper',
	'velvetAqua',
	'zenithSky',
] as const;

export type TenantThemeName = (typeof TENANT_THEME_NAMES)[number];

export const DEFAULT_TENANT_THEME_NAME: TenantThemeName = 'auroraForge';

export const isTenantThemeName = (value: unknown): value is TenantThemeName =>
	typeof value === 'string' &&
	(TENANT_THEME_NAMES as readonly string[]).includes(value);
