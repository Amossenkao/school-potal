export const TENANT_THEME_NAMES = [
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
] as const;

export type TenantThemeName = (typeof TENANT_THEME_NAMES)[number];

export const DEFAULT_TENANT_THEME_NAME: TenantThemeName = 'horizon';

export const isTenantThemeName = (value: unknown): value is TenantThemeName =>
	typeof value === 'string' &&
	(TENANT_THEME_NAMES as readonly string[]).includes(value);
