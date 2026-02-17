'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakPoint';
import { useRouter } from 'next/navigation';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Home,
	UserPlus,
	FileText,
	DoorOpen,
	ClipboardList,
	CreditCard,
	DollarSign,
	Receipt,
	MoreHorizontal,
	ChevronDown,
	Menu,
	Building,
	Users,
	LayoutDashboard,
	LogIn,
	X,
	Info,
	Loader2,
	KeyRound,
} from 'lucide-react';
import Logo from '../Logo';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';

export default function NavBar({ skipStorageLoad = false }) {
	const [school, setSchool] = useState<null | any>(null);
	const [loading, setLoading] = useState(true);
	const currentSchool = useSchoolStore((state) => state.school);

	// Get auth state and actions from store
	const {
		isLoggedIn,
		user,
		isLoading: authLoading,
		logout,
		checkAuthStatus,
	} = useAuth();

	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	const path = usePathname();
	// FIXED: Always call useBreakpoint() - hooks must be called unconditionally
	const breakpoint = useBreakpoint();
	const bp = mounted ? breakpoint : 'sm';
	const router = useRouter();

	// Local loading states for UI feedback
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isNavigatingToDashboard, setIsNavigatingToDashboard] = useState(false);
	const [isNavigatingHome, setIsNavigatingHome] = useState(false);
	const [isNavigatingToSection, setIsNavigatingToSection] = useState('');
	const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(
		null
	);

	// Handle mounting and check auth status
	useEffect(() => {
		setMounted(true);

		// Skip if explicitly told to (e.g., during OTP flow)
		if (!skipStorageLoad) {
			checkAuthStatus();
		}
	}, [skipStorageLoad, checkAuthStatus]);

	const handleMobileSubmenuToggle = (menuName: string) => {
		setOpenMobileSubmenu((prev) => (prev === menuName ? null : menuName));
	};

	const handleLogin = async () => {
		setIsLoggingIn(true);
		try {
			await router.push('/login');
		} finally {
			setTimeout(() => {
				setIsLoggingIn(false);
			}, 300);
		}
	};

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await logout();
			await router.push('/');
		} finally {
			setTimeout(() => {
				setIsLoggingOut(false);
			}, 300);
		}
	};

	const navigateToDashboard = async () => {
		setIsNavigatingToDashboard(true);
		try {
			if (user?.mustChangePassword) {
				await router.push('/login/account-setup');
			} else {
				await router.push('/dashboard');
			}
		} finally {
			setTimeout(() => {
				setIsNavigatingToDashboard(false);
			}, 300);
		}
	};

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	const closeSidebar = () => {
		setIsSidebarOpen(false);
	};

	const handleNavClick = async (href) => {
		if (href.startsWith('#')) {
			const sectionName = href.substring(1);
			setIsNavigatingToSection(sectionName);

			try {
				const element = document.querySelector(href);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth' });
					await new Promise((resolve) => setTimeout(resolve, 800));
				}
			} finally {
				setIsNavigatingToSection('');
			}
		} else {
			if (href === '/') {
				setIsNavigatingHome(true);
			}

			try {
				await router.push(href);
			} finally {
				setTimeout(() => {
					setIsNavigatingHome(false);
				}, 300);
			}
		}
		closeSidebar();
	};

	const isSectionLoading = (sectionName) => {
		return isNavigatingToSection === sectionName;
	};

	if (!mounted) {
		return null;
	}

	const isLoginPage = path === '/login' || path === '/home/login';
	const isHomePage = path === '/' || path === '/home';

	const LoadingIcon = ({ isLoading, defaultIcon: DefaultIcon }) => {
		return isLoading ? (
			<Loader2 className="h-4 w-4 animate-spin" />
		) : (
			<DefaultIcon className="h-4 w-4" />
		);
	};

	// Auth button component for reusability
	const AuthButtons = ({ className = '', isMobile = false }) => {
		if (isLoginPage) return null;

		if (authLoading) {
			return (
				<div className={`flex items-center gap-2 ${className}`}>
					<Button disabled variant="ghost" size={isMobile ? 'default' : 'sm'}>
						<Loader2 className="h-4 w-4 animate-spin mr-2" />
						Checking...
					</Button>
				</div>
			);
		}

		if (!isLoggedIn) {
			return (
				<Button
					onClick={handleLogin}
					disabled={isLoggingIn}
					className={`flex items-center gap-2 ${
						isMobile ? 'w-full' : ''
					} ${className}`}
					size={isMobile ? 'default' : 'sm'}
				>
					<LoadingIcon isLoading={isLoggingIn} defaultIcon={LogIn} />
					{isLoggingIn ? 'Loading...' : 'Login'}
				</Button>
			);
		}

		console.log(user);

		// User is logged in
		const getDashboardButtonState = () => {
			if (user?.mustChangePassword) {
				if (user.passwordChangedAt === null) {
					return {
						text: 'Setup Account',
						icon: UserPlus,
					};
				} else {
					return {
						text: 'Change Password',
						icon: KeyRound,
					};
				}
			}
			return {
				text: 'Dashboard',
				icon: LayoutDashboard,
			};
		};

		const dashboardButtonState = getDashboardButtonState();

		return (
			<div
				className={`flex items-center gap-2 ${
					isMobile ? 'flex-col space-y-2' : ''
				} ${className}`}
			>
				<Button
					onClick={navigateToDashboard}
					disabled={isNavigatingToDashboard}
					className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}
					size={isMobile ? 'default' : 'sm'}
				>
					<LoadingIcon
						isLoading={isNavigatingToDashboard}
						defaultIcon={dashboardButtonState.icon}
					/>
					{isNavigatingToDashboard ? 'Loading...' : dashboardButtonState.text}
				</Button>

				<Button
					variant="outline"
					onClick={handleLogout}
					disabled={isLoggingOut}
					className={isMobile ? 'w-full' : ''}
					size="sm"
				>
					{isLoggingOut ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
							Signing out...
						</>
					) : (
						'Logout'
					)}
				</Button>
			</div>
		);
	};

	return (
		<div className="sticky top-0 z-50">
			{/* Sidebar Overlay */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={closeSidebar}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`fixed top-0 right-0 h-full w-80 bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
					isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				<div className="flex flex-col h-full">
					{/* Sidebar Header */}
					<div className="flex items-center justify-between p-4 border-b border-border">
						<a href="/">
							<Logo />
						</a>
						<Button variant="ghost" size="sm" onClick={closeSidebar}>
							<X className="h-5 w-5" />
						</Button>
					</div>

					{/* Sidebar Navigation */}
					<div className="flex-1 overflow-y-auto ">
						<nav className="flex flex-col gap-2 py-4">
							{/* User info in mobile sidebar */}
							{user && isLoggedIn && (
								<div className="p-3 bg-muted rounded-lg mb-4 mx-4">
									<p className="text-sm font-medium">
										{user.firstName || user.username}
									</p>
									<p className="text-xs text-muted-foreground capitalize">
										{user.role.replaceAll('_', ' ').toLocaleUpperCase()}
									</p>
								</div>
							)}

							<ul className="flex flex-col gap-2 px-4">
								{!isHomePage && (
									<li>
										<button
											onClick={() => handleNavClick('/')}
											disabled={isNavigatingHome}
											className={`flex items-center gap-3 py-3 px-4 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
												isNavigatingHome
													? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
													: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
											}`}
										>
											<LoadingIcon
												isLoading={isNavigatingHome}
												defaultIcon={Home}
											/>
											<span className="font-medium">Home</span>
										</button>
									</li>
								)}

								{isHomePage && (
									<li>
										<button
											onClick={() => handleNavClick('#about')}
											disabled={isSectionLoading('about')}
											className={`flex items-center gap-3 py-3 px-4 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
												isSectionLoading('about')
													? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
													: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
											}`}
										>
											<LoadingIcon
												isLoading={isSectionLoading('about')}
												defaultIcon={Info}
											/>
											<span className="font-medium">
												About {currentSchool.shortName}
											</span>
										</button>
									</li>
								)}

								{/* Admissions Section */}
								<li>
									<button
										onClick={() => handleMobileSubmenuToggle('admissions')}
										className={`flex items-center justify-between w-full py-3 px-4 rounded-md text-sm transition-colors duration-150 ${
											openMobileSubmenu === 'admissions'
												? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
												: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
										}`}
									>
										<div className="flex items-center gap-3">
											<UserPlus className="h-5 w-5" />
											<span className="font-medium">Admissions</span>
										</div>
										<ChevronDown
											className={`h-4 w-4 transition-transform duration-200 ${
												openMobileSubmenu === 'admissions'
													? 'rotate-180 text-blue-600 dark:text-blue-400'
													: ''
											}`}
										/>
									</button>

									{/* Submenu items */}
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openMobileSubmenu === 'admissions'
												? 'max-h-96 opacity-100'
												: 'max-h-0 opacity-0'
										}`}
									>
										<ul className="mt-2 space-y-1 ml-8 pl-4 border-l border-gray-200 dark:border-gray-700">
											<li>
												<button
													onClick={() => handleNavClick('#information-sheets')}
													disabled={isSectionLoading('information-sheets')}
													className={`flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
														isSectionLoading('information-sheets')
															? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
															: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
													}`}
												>
													<LoadingIcon
														isLoading={isSectionLoading('information-sheets')}
														defaultIcon={FileText}
													/>
													<span>Information Sheets</span>
												</button>
											</li>
											<li>
												<button
													onClick={() => handleNavClick('#entrance')}
													disabled={isSectionLoading('entrance')}
													className={`flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
														isSectionLoading('entrance')
															? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
															: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
													}`}
												>
													<LoadingIcon
														isLoading={isSectionLoading('entrance')}
														defaultIcon={DoorOpen}
													/>
													<span>Entrance</span>
												</button>
											</li>
											<li>
												<button
													onClick={() => handleNavClick('#registration')}
													disabled={isSectionLoading('registration')}
													className={`flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
														isSectionLoading('registration')
															? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
															: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
													}`}
												>
													<LoadingIcon
														isLoading={isSectionLoading('registration')}
														defaultIcon={ClipboardList}
													/>
													<span>General Registration</span>
												</button>
											</li>
										</ul>
									</div>
								</li>

								{/* Payments Section */}
								<li>
									<button
										onClick={() => handleMobileSubmenuToggle('payments')}
										className={`flex items-center justify-between w-full py-3 px-4 rounded-md text-sm transition-colors duration-150 ${
											openMobileSubmenu === 'payments'
												? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
												: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
										}`}
									>
										<div className="flex items-center gap-3">
											<CreditCard className="h-5 w-5" />
											<span className="font-medium">Payments</span>
										</div>
										<ChevronDown
											className={`h-4 w-4 transition-transform duration-200 ${
												openMobileSubmenu === 'payments'
													? 'rotate-180 text-blue-600 dark:text-blue-400'
													: ''
											}`}
										/>
									</button>

									{/* Submenu items */}
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openMobileSubmenu === 'payments'
												? 'max-h-96 opacity-100'
												: 'max-h-0 opacity-0'
										}`}
									>
										<ul className="mt-2 space-y-1 ml-8 pl-4 border-l border-gray-200 dark:border-gray-700">
											<li>
												<button
													onClick={() => handleNavClick('#tuition-fees')}
													disabled={isSectionLoading('tuition-fees')}
													className={`flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
														isSectionLoading('tuition-fees')
															? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
															: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
													}`}
												>
													<LoadingIcon
														isLoading={isSectionLoading('tuition-fees')}
														defaultIcon={DollarSign}
													/>
													<span>Pay Tuition Fees</span>
												</button>
											</li>
											<li>
												<button
													onClick={() => handleNavClick('#registration-fees')}
													disabled={isSectionLoading('registration-fees')}
													className={`flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
														isSectionLoading('registration-fees')
															? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
															: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
													}`}
												>
													<LoadingIcon
														isLoading={isSectionLoading('registration-fees')}
														defaultIcon={Receipt}
													/>
													<span>Pay Registration Fees</span>
												</button>
											</li>
											<li>
												<button
													onClick={() => handleNavClick('#other-fees')}
													disabled={isSectionLoading('other-fees')}
													className={`flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
														isSectionLoading('other-fees')
															? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
															: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
													}`}
												>
													<LoadingIcon
														isLoading={isSectionLoading('other-fees')}
														defaultIcon={MoreHorizontal}
													/>
													<span>Pay Other Fees</span>
												</button>
											</li>
										</ul>
									</div>
								</li>

								{!isLoginPage && (
									<>
										<li>
											<button
												onClick={() => handleNavClick('#facilities')}
												disabled={isSectionLoading('facilities')}
												className={`flex items-center gap-3 py-3 px-4 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
													isSectionLoading('facilities')
														? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
														: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
												}`}
											>
												<LoadingIcon
													isLoading={isSectionLoading('facilities')}
													defaultIcon={Building}
												/>
												<span className="font-medium">Facilities</span>
											</button>
										</li>

										<li>
											<button
												onClick={() => handleNavClick('#team')}
												disabled={isSectionLoading('team')}
												className={`flex items-center gap-3 py-3 px-4 rounded-md text-sm transition-colors duration-150 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${
													isSectionLoading('team')
														? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
														: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
												}`}
											>
												<LoadingIcon
													isLoading={isSectionLoading('team')}
													defaultIcon={Users}
												/>
												<span className="font-medium">Team</span>
											</button>
										</li>
									</>
								)}
							</ul>
						</nav>
					</div>

					{/* Sidebar Footer - Auth Buttons */}
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<AuthButtons isMobile={true} />
					</div>
				</div>
			</div>

			{/* Navigation Bar */}
			<nav className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div
						className={`flex ${
							isLoginPage && bp !== 'sm' ? 'gap-18' : 'justify-between'
						} items-center h-16`}
					>
						{/* Logo */}
						<a href="/">
							<Logo />
						</a>

						{/* Desktop Navigation Links */}
						<div className="hidden lg:flex items-center space-x-6">
							{!isHomePage && (
								<button
									onClick={() => handleNavClick('/')}
									disabled={isNavigatingHome}
									className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<LoadingIcon
										isLoading={isNavigatingHome}
										defaultIcon={Home}
									/>
									Home
								</button>
							)}

							{isHomePage && (
								<button
									onClick={() => handleNavClick('#about')}
									disabled={isSectionLoading('about')}
									className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<LoadingIcon
										isLoading={isSectionLoading('about')}
										defaultIcon={Info}
									/>
									About {currentSchool.shortName}
								</button>
							)}

							{/* Admissions Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="flex items-center gap-2 text-sm font-medium hover:text-primary h-auto p-2"
									>
										<UserPlus className="h-4 w-4" />
										Admissions
										<ChevronDown className="h-3 w-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-56">
									<DropdownMenuItem
										className="flex items-center gap-2 cursor-pointer"
										onClick={() => handleNavClick('#information-sheets')}
										disabled={isSectionLoading('information-sheets')}
									>
										<LoadingIcon
											isLoading={isSectionLoading('information-sheets')}
											defaultIcon={FileText}
										/>
										Information Sheets
									</DropdownMenuItem>
									<DropdownMenuItem
										className="flex items-center gap-2 cursor-pointer"
										onClick={() => handleNavClick('#entrance')}
										disabled={isSectionLoading('entrance')}
									>
										<LoadingIcon
											isLoading={isSectionLoading('entrance')}
											defaultIcon={DoorOpen}
										/>
										Entrance
									</DropdownMenuItem>
									<DropdownMenuItem
										className="flex items-center gap-2 cursor-pointer"
										onClick={() => handleNavClick('#registration')}
										disabled={isSectionLoading('registration')}
									>
										<LoadingIcon
											isLoading={isSectionLoading('registration')}
											defaultIcon={ClipboardList}
										/>
										General Registration
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Payments Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="flex items-center gap-2 text-sm font-medium hover:text-primary h-auto p-2"
									>
										<CreditCard className="h-4 w-4" />
										Payments
										<ChevronDown className="h-3 w-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-56">
									<DropdownMenuItem
										className="flex items-center gap-2 cursor-pointer"
										onClick={() => handleNavClick('#tuition-fees')}
										disabled={isSectionLoading('tuition-fees')}
									>
										<LoadingIcon
											isLoading={isSectionLoading('tuition-fees')}
											defaultIcon={DollarSign}
										/>
										Pay Tuition Fees
									</DropdownMenuItem>
									<DropdownMenuItem
										className="flex items-center gap-2 cursor-pointer"
										onClick={() => handleNavClick('#registration-fees')}
										disabled={isSectionLoading('registration-fees')}
									>
										<LoadingIcon
											isLoading={isSectionLoading('registration-fees')}
											defaultIcon={Receipt}
										/>
										Pay Registration Fees
									</DropdownMenuItem>
									<DropdownMenuItem
										className="flex items-center gap-2 cursor-pointer"
										onClick={() => handleNavClick('#other-fees')}
										disabled={isSectionLoading('other-fees')}
									>
										<LoadingIcon
											isLoading={isSectionLoading('other-fees')}
											defaultIcon={MoreHorizontal}
										/>
										Pay Other Fees
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{!isLoginPage && (
								<>
									<button
										onClick={() => handleNavClick('#facilities')}
										disabled={isSectionLoading('facilities')}
										className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<LoadingIcon
											isLoading={isSectionLoading('facilities')}
											defaultIcon={Building}
										/>
										Facilities
									</button>
									<button
										onClick={() => handleNavClick('#team')}
										disabled={isSectionLoading('team')}
										className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<LoadingIcon
											isLoading={isSectionLoading('team')}
											defaultIcon={Users}
										/>
										Team
									</button>
								</>
							)}
						</div>

						{/* Desktop Auth Buttons & Mobile Menu Button */}
						<div className="flex items-center gap-4">
							{/* Desktop Auth Buttons */}
							<div className="hidden lg:flex">
								<AuthButtons />
							</div>

							{/* Mobile Menu Button */}
							<Button
								variant="ghost"
								size="sm"
								className="lg:hidden"
								onClick={toggleSidebar}
							>
								<Menu className="h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>
			</nav>
		</div>
	);
}
