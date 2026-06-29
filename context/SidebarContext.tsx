'use client';
import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useLayoutEffect,
	useCallback,
	useMemo,
	useRef,
} from 'react';

// ── Split into two contexts so consumers only re-render when their slice changes ──
// State context: values that change (and trigger re-renders in consumers)
// Actions context: stable callbacks that never change

type SidebarState = {
	isExpanded: boolean;
	isMobileOpen: boolean;
	isHovered: boolean;
	activeItem: string | null;
	openSubmenu: string | null;
};

type SidebarActions = {
	toggleSidebar: () => void;
	toggleMobileSidebar: () => void;
	setIsHovered: (isHovered: boolean) => void;
	setActiveItem: (item: string | null) => void;
	toggleSubmenu: (item: string) => void;
	closeMobileSidebar: () => void;
};

// Keep the combined type for the public API (backward compat)
type SidebarContextType = SidebarState & SidebarActions;

const SidebarStateContext = createContext<SidebarState | undefined>(undefined);
const SidebarActionsContext = createContext<SidebarActions | undefined>(
	undefined,
);

// Public combined context (re-exports both for backward compat)
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const getInitialIsMobile = () => {
	if (typeof window === 'undefined') return false;
	return window.innerWidth < 768;
};

export const useSidebar = () => {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error('useSidebar must be used within a SidebarProvider');
	}
	return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isExpanded, setIsExpanded] = useState(true);
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(getInitialIsMobile);
	const [isHovered, setIsHoveredState] = useState(false);
	const [activeItem, setActiveItemState] = useState<string | null>(null);
	const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

	// Keep a ref to isMobile so callbacks don't need it in their dep arrays
	const isMobileRef = useRef(isMobile);
	isMobileRef.current = isMobile;

	useIsomorphicLayoutEffect(() => {
		const handleResize = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if (!mobile) setIsMobileOpen(false);
		};
		handleResize();
		window.addEventListener('resize', handleResize, { passive: true });
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	// ── Stable action callbacks (defined once, never recreated) ──────────────
	const toggleSidebar = useCallback(() => {
		setIsExpanded((prev) => !prev);
	}, []);

	const toggleMobileSidebar = useCallback(() => {
		setIsMobileOpen((prev) => !prev);
	}, []);

	const closeMobileSidebar = useCallback(() => {
		setIsMobileOpen(false);
	}, []);

	const setIsHovered = useCallback((value: boolean) => {
		setIsHoveredState(value);
	}, []);

	const setActiveItem = useCallback((item: string | null) => {
		setActiveItemState(item);
	}, []);

	const toggleSubmenu = useCallback((item: string) => {
		setOpenSubmenu((prev) => (prev === item ? null : item));
	}, []);

	// ── Derived state (avoids recomputing isExpanded downstream) ─────────────
	const effectiveIsExpanded = isMobile ? false : isExpanded;

	// ── Combined context value (stable actions + current state) ──────────────
	// Actions object is stable (all useCallback); state object changes on state update.
	// Single combined context keeps backward compat with existing useSidebar() calls.
	const contextValue = useMemo<SidebarContextType>(
		() => ({
			isExpanded: effectiveIsExpanded,
			isMobileOpen,
			isHovered,
			activeItem,
			openSubmenu,
			toggleSidebar,
			toggleMobileSidebar,
			setIsHovered,
			setActiveItem,
			toggleSubmenu,
			closeMobileSidebar,
		}),
		// Actions are stable refs — only state changes drive new object creation
		[
			effectiveIsExpanded,
			isMobileOpen,
			isHovered,
			activeItem,
			openSubmenu,
			toggleSidebar,
			toggleMobileSidebar,
			setIsHovered,
			setActiveItem,
			toggleSubmenu,
			closeMobileSidebar,
		],
	);

	return (
		<SidebarContext.Provider value={contextValue}>
			{children}
		</SidebarContext.Provider>
	);
};
