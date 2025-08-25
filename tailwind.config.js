/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			// Add the fontFamily extension here
			fontFamily: {
				outfit: ['Outfit', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--b2))',
				input: 'hsl(var(--b2))',
				ring: 'hsl(var(--bc))',
				background: 'hsl(var(--b1))',
				foreground: 'hsl(var(--bc))',
				primary: {
					DEFAULT: 'hsl(var(--p))',
					foreground: 'hsl(var(--pc))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--s))',
					foreground: 'hsl(var(--sc))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--er))',
					foreground: 'hsl(var(--ec))',
				},
				muted: {
					DEFAULT: 'hsl(var(--b2))',
					foreground: 'hsl(var(--bc) / 0.5)',
				},
				accent: {
					DEFAULT: 'hsl(var(--a))',
					foreground: 'hsl(var(--ac))',
				},
				popover: {
					DEFAULT: 'hsl(var(--b1))',
					foreground: 'hsl(var(--bc))',
				},
				card: {
					DEFAULT: 'hsl(var(--b1))',
					foreground: 'hsl(var(--bc))',
				},
			},
		},
	},
	plugins: [require('daisyui')],
	daisyui: {
		themes: ['light', 'dark', 'cupcake'],
		logs: true,
	},
};
