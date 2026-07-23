'use client';

import React, { memo, useState, useCallback } from 'react';
import { useSidebar } from '@/context/SidebarContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
	LayoutDashboard,
	School,
	PlusCircle,
	Settings,
	ChevronLeft,
	ChevronRight,
	X,
	ScrollText,
} from 'lucide-react';

const NAV_ITEMS = [
	{ label: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
	{ label: 'Schools', href: '/superadmin/schools', icon: School },
	{ label: 'Onboard', href: '/superadmin/onboard', icon: PlusCircle },
	{ label: 'Audit Logs', href: '/superadmin/audit-logs', icon: ScrollText },
	{ label: 'Settings', href: '/superadmin/settings', icon: Settings },
];

const SuperAdminSidebar = memo(function SuperAdminSidebar() {
	const { isExpanded, isHovered, isMobileOpen, toggleSidebar, setIsHovered, closeMobileSidebar } = useSidebar();
	const pathname = usePathname();
	const [isHovering, setIsHovering] = useState(false);

	const effectiveExpanded = isMobileOpen ? true : isExpanded || isHovering;

	const handleNavClick = useCallback(() => {
		closeMobileSidebar();
	}, [closeMobileSidebar]);

	return (
		<aside
			className={`fixed top-0 left-0 z-40 h-screen bg-[#111827] text-white transition-all duration-300 ease-in-out flex flex-col ${
				effectiveExpanded ? 'w-[260px]' : 'w-[90px]'
			} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
			onMouseEnter={() => { setIsHovered(true); setIsHovering(true); }}
			onMouseLeave={() => { setIsHovered(false); setIsHovering(false); }}
		>
			{/* Logo */}
			<div className={`flex items-center gap-3 px-4 h-16 shrink-0 border-b border-white/10 ${effectiveExpanded ? 'justify-start' : 'justify-center'}`}>
				{effectiveExpanded ? (
					<Link href="/superadmin" className="flex items-center gap-2.5" onClick={handleNavClick}>
						<Image src="/images/SchoolMesh.png" alt="SchoolMesh" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
						<div>
							<p className="text-sm font-bold tracking-tight">School<span className="text-[#465fff]">Mesh</span></p>
							<p className="text-[9px] text-gray-400">Super Admin</p>
						</div>
					</Link>
				) : (
					<Link href="/superadmin" onClick={handleNavClick}>
						<Image src="/images/SchoolMesh.png" alt="SM" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
					</Link>
				)}
				<button onClick={closeMobileSidebar} className="ml-auto lg:hidden text-gray-400 hover:text-white">
					<X className="h-5 w-5" />
				</button>
			</div>

			{/* Nav */}
			<nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
				{NAV_ITEMS.map((item) => {
					const Icon = item.icon;
					const isActive = item.href === '/superadmin'
						? pathname === '/superadmin'
						: pathname.startsWith(item.href);
					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={handleNavClick}
							className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
								isActive
									? 'bg-[#465fff]/20 text-white'
									: 'text-gray-400 hover:text-white hover:bg-white/5'
							} ${effectiveExpanded ? '' : 'justify-center'}`}
							title={!effectiveExpanded ? item.label : undefined}
						>
							<Icon className="h-5 w-5 shrink-0" />
							{effectiveExpanded && <span>{item.label}</span>}
						</Link>
					);
				})}
			</nav>

		{/* Bottom section */}
		<div className="border-t border-white/10 px-3 py-3 space-y-1">
			<button
				onClick={toggleSidebar}
				className="hidden lg:flex items-center justify-center w-full rounded-lg py-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
				aria-label="Toggle sidebar"
			>
				{isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
				{effectiveExpanded && <span className="ml-2 text-xs">Collapse</span>}
			</button>
		</div>
		</aside>
	);
});

export default SuperAdminSidebar;
