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

	// useEffect(() => {
	// 	const loadSchoolData = async () => {
	// 		setLoading(true);
	// 		try {
	// 			await new Promise((resolve) => setTimeout(resolve, 1000));
	// 			setSchool(currentSchool);
	// 		} catch (error) {
	// 			console.error('Failed to load school profile:', error);
	// 			setSchool(null);
	// 		} finally {
	// 			setLoading(false);
	// 		}
	// 	};
	// 	loadSchoolData();
	// }, [currentSchool]);

	const path = usePathname();
	const bp = useBreakpoint();
	const router = useRouter();

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

	// Local loading states for UI feedback
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isNavigatingToDashboard, setIsNavigatingToDashboard] = useState(false);
	const [isNavigatingHome, setIsNavigatingHome] = useState(false);
	const [isNavigatingToSection, setIsNavigatingToSection] = useState('');

	// Handle mounting and check auth status
	useEffect(() => {
		setMounted(true);

		// Skip if explicitly told to (e.g., during OTP flow)
		if (!skipStorageLoad) {
			checkAuthStatus();
		}
	}, [skipStorageLoad, checkAuthStatus]);

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
				{user && !isMobile && (
					<span className="text-sm text-muted-foreground">
						Welcome, {user.nickName || user.firstName || user.lastName}
					</span>
				)}

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
							Logging out...
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
					className="fixed inset-0 bg-black/50 z-40 md:hidden"
					onClick={closeSidebar}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`fixed top-0 right-0 h-full w-80 bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
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
					<div className="flex-1 overflow-y-auto p-4">
						<div className="space-y-4">
							{/* User info in mobile sidebar */}
							{user && isLoggedIn && (
								<div className="p-3 bg-muted rounded-lg">
									<p className="text-sm font-medium">
										{user.name || user.username}
									</p>
									<p className="text-xs text-muted-foreground capitalize">
										{user.role}
									</p>
								</div>
							)}

							{/* Navigation Links */}
							<div className="space-y-2">
								{!isHomePage && (
									<button
										onClick={() => handleNavClick('/')}
										disabled={isNavigatingHome}
										className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<LoadingIcon
											isLoading={isNavigatingHome}
											defaultIcon={Home}
										/>
										<span className="font-medium">Home</span>
									</button>
								)}

								{isHomePage && (
									<button
										onClick={() => handleNavClick('#about')}
										disabled={isSectionLoading('about')}
										className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<LoadingIcon
											isLoading={isSectionLoading('about')}
											defaultIcon={Info}
										/>
										<span className="font-medium">
											About {currentSchool.shortName}
										</span>
									</button>
								)}

								{/* Admissions Section */}
								<div className="space-y-1">
									<div className="flex items-center gap-3 p-3 text-muted-foreground">
										<UserPlus className="h-5 w-5" />
										<span className="font-medium">Admissions</span>
									</div>
									<div className="ml-8 space-y-1">
										<button
											onClick={() => handleNavClick('#information-sheets')}
											disabled={isSectionLoading('information-sheets')}
											className="flex items-center gap-2 p-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('information-sheets')}
												defaultIcon={FileText}
											/>
											Information Sheets
										</button>
										<button
											onClick={() => handleNavClick('#entrance')}
											disabled={isSectionLoading('entrance')}
											className="flex items-center gap-2 p-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('entrance')}
												defaultIcon={DoorOpen}
											/>
											Entrance
										</button>
										<button
											onClick={() => handleNavClick('#registration')}
											disabled={isSectionLoading('registration')}
											className="flex items-center gap-2 p-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('registration')}
												defaultIcon={ClipboardList}
											/>
											General Registration
										</button>
									</div>
								</div>

								{/* Payments Section */}
								<div className="space-y-1">
									<div className="flex items-center gap-3 p-3 text-muted-foreground">
										<CreditCard className="h-5 w-5" />
										<span className="font-medium">Payments</span>
									</div>
									<div className="ml-8 space-y-1">
										<button
											onClick={() => handleNavClick('#tuition-fees')}
											disabled={isSectionLoading('tuition-fees')}
											className="flex items-center gap-2 p-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('tuition-fees')}
												defaultIcon={DollarSign}
											/>
											Pay Tuition Fees
										</button>
										<button
											onClick={() => handleNavClick('#registration-fees')}
											disabled={isSectionLoading('registration-fees')}
											className="flex items-center gap-2 p-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('registration-fees')}
												defaultIcon={Receipt}
											/>
											Pay Registration Fees
										</button>
										<button
											onClick={() => handleNavClick('#other-fees')}
											disabled={isSectionLoading('other-fees')}
											className="flex items-center gap-2 p-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('other-fees')}
												defaultIcon={MoreHorizontal}
											/>
											Pay Other Fees
										</button>
									</div>
								</div>

								{!isLoginPage && (
									<>
										<button
											onClick={() => handleNavClick('#facilities')}
											disabled={isSectionLoading('facilities')}
											className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('facilities')}
												defaultIcon={Building}
											/>
											<span className="font-medium">Facilities</span>
										</button>

										<button
											onClick={() => handleNavClick('#team')}
											disabled={isSectionLoading('team')}
											className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LoadingIcon
												isLoading={isSectionLoading('team')}
												defaultIcon={Users}
											/>
											<span className="font-medium">Team</span>
										</button>
									</>
								)}
							</div>
						</div>
					</div>

					{/* Sidebar Footer - Auth Buttons */}
					<div className="p-4 border-t border-border">
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
						<div className="hidden md:flex items-center space-x-6">
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
							<div className="hidden md:flex">
								<AuthButtons />
							</div>

							{/* Mobile Menu Button */}
							<Button
								variant="ghost"
								size="sm"
								className="md:hidden"
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
