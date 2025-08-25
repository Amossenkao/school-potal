// context/ThemeContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSchoolStore } from '@/store/schoolStore';

const ThemeContext = createContext('light');

export function ThemeProvider({ children }) {
	const [theme, setTheme] = useState('light');
	const school = useSchoolStore((state) => state.school);

	useEffect(() => {
		// Set the theme from the school profile, or default to 'light'
		const schoolTheme = school?.customizations?.theme || 'light';
		setTheme(schoolTheme);
	}, [school]); // <-- This dependency is key!

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	}, [theme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
