import { useState, useEffect } from 'react';

type Breakpoint =  'sm' | 'md' | 'lg' | 'xl' | '2xl';

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('sm');

  useEffect(() => {
    const calculateBreakpoint = () => {
      const width = window.innerWidth;

      if (width < 850) setBreakpoint('sm');    // sm
      else if (width < 1024) setBreakpoint('md');   // md
      else if (width < 1280) setBreakpoint('lg');   // lg
      else if (width < 1536) setBreakpoint('xl');   // xl
      else setBreakpoint('2xl');                    // 2xl+
    };

    calculateBreakpoint();
    window.addEventListener('resize', calculateBreakpoint);
    return () => window.removeEventListener('resize', calculateBreakpoint);
  }, []);

  return breakpoint;
}
