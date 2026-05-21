export const TENANT_THEME_NAMES = [
	// Reimagined Classics
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

	// 20 Bold New Themes
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
] as const;

export type TenantThemeName = (typeof TENANT_THEME_NAMES)[number];

export const DEFAULT_TENANT_THEME_NAME: TenantThemeName = 'horizon';

export const isTenantThemeName = (value: unknown): value is TenantThemeName =>
	typeof value === 'string' &&
	(TENANT_THEME_NAMES as readonly string[]).includes(value);
