import { useState, useEffect } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export function useBreakpoint(): Breakpoint | null {
	const [breakpoint, setBreakpoint] = useState<Breakpoint | null>(null);

	useEffect(() => {
		const calculateBreakpoint = () => {
			const width = window.innerWidth;
			if (width < 850) setBreakpoint('sm');
			else if (width < 1024) setBreakpoint('md');
			else if (width < 1280) setBreakpoint('lg');
			else if (width < 1536) setBreakpoint('xl');
			else setBreakpoint('2xl');
		};

		calculateBreakpoint();
		if (typeof window === 'undefined') return;
		window.addEventListener('resize', calculateBreakpoint);
		return () => window.removeEventListener('resize', calculateBreakpoint);
	}, []);

	return breakpoint;
}
