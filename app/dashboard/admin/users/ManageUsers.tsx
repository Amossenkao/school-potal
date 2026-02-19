'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
	Search,
	Plus,
	Filter,
	Users,
	GraduationCap,
	BookOpen,
	Shield,
	ChevronLeft,
	ChevronRight,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Edit,
	RotateCcw,
	Trash2,
	Eye,
	Power,
	CheckCircle,
	XCircle,
	X,
	MoreVertical,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button/Button';
import { PageLoading } from '@/components/loading';
import DeleteUserModal from '@/components/modals/DeleteUserModal';
import ResetPasswordModal from '@/components/modals/ResetPasswordModal';
import ViewUserModal from '@/components/modals/ViewUserModal';
import FilterUsersModal from '@/components/modals/FilterUsersModal';
import EditUserModal from '@/components/modals/EditUserModal';
import DeactivateUserModal from '@/components/modals/DeactivateUserModal';
import { useSchoolStore } from '@/store/schoolStore';
import { useNetworkStore } from '@/store/networkStore';
import { getClientCache, setClientCache } from '@/utils/clientCache';
import {
	buildSchoolAcademicYearRange,
	pickCurrentOrMostRecentAcademicYear,
} from '@/utils/academicYearOptions';

const API_URL = '/api/users';
const getManageUsersCacheKey = (academicYear: string) =>
	`manageUsers:v4:${academicYear}`;

// --- Portal Component for escaping containers ---
const Portal = ({ children }: { children: React.ReactNode }) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	return mounted ? createPortal(children, document.body) : null;
};

// --- Dropdown Menu Component (Styled with Tailwind) ---
const ActionDropdown = ({
	user,
	onAction,
}: {
	user: any;
	onAction: (actionType: string, user: any) => void;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState({});
	const dropdownRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		if (isOpen && buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			const spaceBelow = window.innerHeight - rect.bottom;
			const dropdownHeight = dropdownRef.current?.offsetHeight || 200;

			let top, bottom;
			if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
				bottom = window.innerHeight - rect.top + 8;
			} else {
				top = rect.bottom + 8;
			}
			setPosition({
				top,
				bottom,
				right: window.innerWidth - rect.right,
			});
		}
	}, [isOpen]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleAction = (actionType: string) => {
		onAction(actionType, user);
		setIsOpen(false);
	};

	return (
		<div>
			<button
				ref={buttonRef}
				onClick={() => setIsOpen(!isOpen)}
				className="inline-flex items-center justify-center w-8 h-8 rounded-lg border bg-card text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring focus:ring-offset-background"
			>
				<MoreVertical className="h-4 w-4" />
			</button>

			{isOpen && (
				<Portal>
					<div
						ref={dropdownRef}
						style={position}
						className="fixed z-50 w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
					>
						<div className="py-1" role="menu" aria-orientation="vertical">
							<button
								onClick={() => handleAction('view')}
								className="flex items-center w-full px-3 py-1.5 text-sm rounded-sm hover:bg-muted"
							>
								<Eye className="mr-2 h-4 w-4" />
								View
							</button>
							<button
								onClick={() => handleAction('edit')}
								className="flex items-center w-full px-3 py-1.5 text-sm rounded-sm hover:bg-muted"
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit
							</button>
							<button
								onClick={() => handleAction('reset-password')}
								className="flex items-center w-full px-3 py-1.5 text-sm rounded-sm hover:bg-muted"
							>
								<RotateCcw className="mr-2 h-4 w-4" />
								Reset Password
							</button>
							<button
								onClick={() => handleAction('toggle-status')}
								className="flex items-center w-full px-3 py-1.5 text-sm rounded-sm hover:bg-muted"
							>
								<Power className="mr-2 h-4 w-4" />
								{user.isActive ? 'Deactivate' : 'Activate'}
							</button>
							<div className="my-1 h-px bg-border" />
							<button
								onClick={() => handleAction('delete')}
								disabled={user.role === 'system_admin'}
								className="flex items-center w-full px-3 py-1.5 text-sm rounded-sm text-destructive hover:bg-destructive/10 disabled:text-muted-foreground disabled:bg-transparent disabled:cursor-not-allowed"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</button>
						</div>
					</div>
				</Portal>
			)}
		</div>
	);
};

// --- Reusable Feedback Toast Component (Styled with Tailwind) ---
const FeedbackToast = ({ type, message, onClose }: any) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 5000);
		return () => clearTimeout(timer);
	}, [onClose]);

	const isSuccess = type === 'success';
	const baseClasses =
		'flex items-start gap-4 p-4 rounded-lg shadow-lg border w-full max-w-sm';
	const colorClasses = isSuccess
		? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
		: 'bg-destructive/10 border-destructive/20 text-destructive';
	const Icon = isSuccess ? CheckCircle : XCircle;
	const iconColor = isSuccess ? 'text-green-500' : 'text-destructive';

	return (
		<div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-5 fade-in-0 duration-300">
			<div className={`${baseClasses} ${colorClasses}`}>
				<Icon className={`h-6 w-6 flex-shrink-0 ${iconColor}`} />
				<div className="flex-1">
					<h4 className="font-semibold">{isSuccess ? 'Success' : 'Error'}</h4>
					<p className="text-sm">{message}</p>
				</div>
				<button
					onClick={onClose}
					className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

// --- Main Dashboard Component ---
const UserManagementDashboard = () => {
	const [activeTab, setActiveTab] = useState('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [users, setUsers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [feedback, setFeedback] = useState({ type: '', message: '' });
	const totalUsersRef = useRef<number | null>(null);
	const roleCountsRef = useRef<Record<string, number>>({});

	// Modal State
	const [showEditModal, setShowEditModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
	const [showViewModal, setShowViewModal] = useState(false);
	const [showFilterModal, setShowFilterModal] = useState(false);
	const [showDeactivateModal, setShowDeactivateModal] = useState(false);

	const [editingUser, setEditingUser] = useState(null);
	const [deletingUser, setDeletingUser] = useState(null);
	const [viewingUser, setViewingUser] = useState(null);
	const [resetPasswordUser, setResetPasswordUser] = useState(null);
	const [deactivatingUser, setDeactivatingUser] = useState(null);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [serverPage, setServerPage] = useState(1);
	const [totalUsers, setTotalUsers] = useState<number | null>(null);
	const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
	const [isFetchingMore, setIsFetchingMore] = useState(false);
	const serverPageSize = 5000;
	// Sorting state
	const [sortField, setSortField] = useState('fullName');
	const [sortDirection, setSortDirection] = useState('asc');

	// Filter state
	const [statusFilter, setStatusFilter] = useState('all');
	const [sessionFilter, setSessionFilter] = useState('all');
	const [classLevelFilter, setClassLevelFilter] = useState('all');
	const [classFilter, setClassFilter] = useState('all');
	const [subjectFilter, setSubjectFilter] = useState('all');

	const router = useRouter();
	const schoolProfile = useSchoolStore((state: any) => state.school);
	const fetchSchool = useSchoolStore((state: any) => state.fetchSchool);
	const { isOnline } = useNetworkStore();
	const setUsersForYear = useSchoolStore(
		(state: any) => state.setUsersForYear,
	);
	const academicYearOptions = useMemo(
		() => buildSchoolAcademicYearRange(schoolProfile),
		[schoolProfile],
	);
	const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

	// Fixed availableClasses
	const availableClasses = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];
		const allClasses = [];

		Object.entries(schoolProfile.classLevels).forEach(([session, levels]) => {
			// Add null check for levels
			if (!levels || typeof levels !== 'object') return;

			Object.entries(levels).forEach(([level, levelData]) => {
				// Add comprehensive null checks for levelData and classes
				if (!levelData || typeof levelData !== 'object') return;
				if (!levelData.classes || !Array.isArray(levelData.classes)) return;

				levelData.classes.forEach((cls) => {
					// Add null check for individual class
					if (!cls) return;

					allClasses.push({
						...cls,
						session,
						level,
						displayName: `${cls.name} (${level} - ${session})`,
					});
				});
			});
		});
		return allClasses;
	}, [schoolProfile]);

	// Fixed availableSessions
	const availableSessions = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];
		return Object.keys(schoolProfile.classLevels);
	}, [schoolProfile]);

	// Fixed availableClassLevels
	const availableClassLevels = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];
		const levels = new Set();

		Object.values(schoolProfile.classLevels).forEach((sessionData) => {
			// Add null check for sessionData
			if (!sessionData || typeof sessionData !== 'object') return;

			Object.keys(sessionData).forEach((level) => levels.add(level));
		});
		return Array.from(levels);
	}, [schoolProfile]);

	// Fixed availableSubjects
	const availableSubjects = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];
		const subjects = new Set();

		Object.values(schoolProfile.classLevels).forEach((sessionData) => {
			// Add null check for sessionData
			if (!sessionData || typeof sessionData !== 'object') return;

			Object.values(sessionData).forEach((levelData) => {
				// Add null checks for levelData and subjects
				if (!levelData || typeof levelData !== 'object') return;
				if (!levelData.subjects || !Array.isArray(levelData.subjects)) return;

				levelData.subjects.forEach((subject: any) => {
					// Handle both string subjects and object subjects
					const subjectName =
						typeof subject === 'string' ? subject : subject?.name;
					if (subjectName) {
						subjects.add(subjectName);
					}
				});
			});
		});
		return Array.from(subjects).sort();
	}, [schoolProfile]);

	const normalizeUsers = (data: any) => {
		if (!data) return [];
		if (Array.isArray(data)) return data;
		if (data.students || data.teachers || data.administrators) {
			return [
				...(data.students || []),
				...(data.teachers || []),
				...(data.administrators || []),
			];
		}
		return [data];
	};

	const normalizeUser = (user: any) => {
		const id = user.id || user._id;
		const currentClass = user.currentClass || {};
		const historicalClass = user.historicalClass || {};
		const classId =
			user.classId || currentClass.classId || historicalClass.classId || null;
		const className =
			user.className ||
			currentClass.className ||
			historicalClass.className ||
			null;

		return {
			...user,
			id,
			_id: id,
			classId,
			className,
			isActive: user.isActive ?? true,
			createdAt: user.createdAt ?? null,
		};
	};

	const fetchUsers = useCallback(
		async (page = 1, replace = false) => {
			if (!selectedAcademicYear) {
				setUsers([]);
				setLoading(false);
				setIsFetchingMore(false);
				return;
			}
			const isInitialLoad = page === 1;
			if (isInitialLoad) {
				setLoading(true);
			} else {
				setIsFetchingMore(true);
			}

			try {
				const cacheKey = getManageUsersCacheKey(selectedAcademicYear);
				const params = new URLSearchParams();
				params.set('academicYear', selectedAcademicYear);
				params.set('limit', String(serverPageSize));
				params.set('page', String(page));
				params.set('includeCounts', '1');

				const res = await fetch(`${API_URL}?${params.toString()}`);
				const data = await res.json();
				if (data.success) {
					const userList = normalizeUsers(data.data)
						.filter(Boolean)
						.map(normalizeUser);
					let nextUsers: any[] = [];
					setUsers((currentUsers) => {
						if (replace || page === 1) {
							nextUsers = userList;
							return userList;
						}
						const seen = new Set(
							currentUsers.map((u) => u.id || u._id),
						);
						const merged = [...currentUsers];
						userList.forEach((user) => {
							const id = user.id || user._id;
							if (id && !seen.has(id)) {
								seen.add(id);
								merged.push(user);
							}
						});
						nextUsers = merged;
						return merged;
					});
					setServerPage(page);
					const nextTotal =
						data?.meta?.total !== undefined
							? data.meta.total
							: totalUsersRef.current;
					const nextCounts = data?.meta?.counts || roleCountsRef.current;
					if (data?.meta?.total !== undefined) {
						setTotalUsers(data.meta.total);
					}
					if (data?.meta?.counts) {
						setRoleCounts(data.meta.counts);
					}
					setClientCache(cacheKey, {
						users: replace || page === 1 ? userList : nextUsers,
						totalUsers: typeof nextTotal === 'number' ? nextTotal : null,
						roleCounts: nextCounts,
						serverPage: page,
					});

					const grouped = {
						students: userList.filter((u) => u.role === 'student'),
						teachers: userList.filter((u) => u.role === 'teacher'),
						administrators: userList.filter((u) => u.role === 'administrator'),
					};
					setUsersForYear(selectedAcademicYear, grouped, {
						merge: !(replace || page === 1),
					});
				} else if (replace) {
					setUsers([]);
				}
			} catch (e) {
				if (replace) {
					setUsers([]);
				}
			} finally {
				setLoading(false);
				setIsFetchingMore(false);
			}
		},
		[selectedAcademicYear, serverPageSize],
	);

	useEffect(() => {
		if (!schoolProfile) {
			fetchSchool();
		}
	}, [schoolProfile, fetchSchool]);

	useEffect(() => {
		totalUsersRef.current = totalUsers;
	}, [totalUsers]);

	useEffect(() => {
		roleCountsRef.current = roleCounts;
	}, [roleCounts]);

	useEffect(() => {
		if (!schoolProfile) return;
		const defaultAcademicYear =
			pickCurrentOrMostRecentAcademicYear(
				academicYearOptions,
				schoolProfile.currentAcademicYear,
			) || '';
		if (
			!selectedAcademicYear ||
			!academicYearOptions.includes(selectedAcademicYear)
		) {
			setSelectedAcademicYear(defaultAcademicYear);
		}
	}, [schoolProfile, academicYearOptions, selectedAcademicYear]);

	useEffect(() => {
		if (!schoolProfile || !selectedAcademicYear) return;
		setCurrentPage(1);
		setServerPage(1);
		setTotalUsers(null);
		setRoleCounts({});
		setUsers([]);
		const cacheKey = getManageUsersCacheKey(selectedAcademicYear);
		const cached = getClientCache<{
			users: any[];
			totalUsers: number | null;
			roleCounts: Record<string, number>;
			serverPage: number;
		}>(cacheKey);
		if (cached) {
			setUsers(cached.users || []);
			setTotalUsers(
				typeof cached.totalUsers === 'number' ? cached.totalUsers : null,
			);
			setRoleCounts(cached.roleCounts || {});
			setServerPage(cached.serverPage || 1);
			setLoading(false);
			return;
		}
		fetchUsers(1, true);
	}, [
		schoolProfile,
		selectedAcademicYear,
		fetchUsers,
	]);

	const userTypes = useMemo(() => {
		const totalCount = totalUsers ?? users.length;
		const studentCount =
			roleCounts.student ?? users.filter((u) => u.role === 'student').length;
		const teacherCount =
			roleCounts.teacher ?? users.filter((u) => u.role === 'teacher').length;
		const adminCount =
			roleCounts.administrator ??
			users.filter((u) => u.role === 'administrator').length;

		return [
			{ key: 'all', label: 'All Users', icon: Users, count: totalCount },
			{
				key: 'student',
				label: 'Students',
				icon: GraduationCap,
				count: studentCount,
			},
			{
				key: 'teacher',
				label: 'Teachers',
				icon: BookOpen,
				count: teacherCount,
			},
			{
				key: 'administrator',
				label: 'Administrators',
				icon: Shield,
				count: adminCount,
			},
		];
	}, [users, roleCounts, totalUsers]);

	const getFullName = (user: any) => {
		if (user.fullName) return user.fullName;
		const names = [user.firstName, user.middleName, user.lastName].filter(
			Boolean,
		);
		return names.join(' ');
	};

	const getClassDisplayName = (classId: any) => {
		if (!classId || !schoolProfile?.classLevels) return classId;
		const foundClass = availableClasses.find((cls) => cls.classId === classId);
		return foundClass ? foundClass.displayName : classId;
	};

	const getClassLevelFromId = (classId: any) => {
		if (!classId || !schoolProfile?.classLevels) return null;
		const foundClass = availableClasses.find((cls) => cls.classId === classId);
		return foundClass ? foundClass.level : null;
	};

	const getSessionFromId = (classId: any) => {
		if (!classId || !schoolProfile?.classLevels) return null;
		const foundClass = availableClasses.find((cls) => cls.classId === classId);
		return foundClass ? foundClass.session : null;
	};

	const getTeacherClassIds = (teacher: any) => {
		if (!teacher?.subjects) return [];
		const classIds: string[] = [];
		teacher.subjects.forEach((yearData: any) => {
			if (yearData?.year && yearData.year !== selectedAcademicYear) return;
			if (!yearData?.classes) return;
			yearData.classes.forEach((classData: any) => {
				if (classData?.classId) classIds.push(classData.classId);
			});
		});
		return classIds;
	};

	const getTeacherSubjects = (teacher: any) => {
		if (!teacher?.subjects) return [];
		const subjects = new Set<string>();
		teacher.subjects.forEach((yearData: any) => {
			if (yearData?.year && yearData.year !== selectedAcademicYear) return;
			if (!yearData?.classes) return;
			yearData.classes.forEach((classData: any) => {
				(classData?.subjects || []).forEach((subject: any) => {
					if (typeof subject === 'string') subjects.add(subject);
					else if (subject?.subject) subjects.add(subject.subject);
					else if (subject?.name) subjects.add(subject.name);
				});
			});
		});
		return Array.from(subjects);
	};

	const syncUsersSnapshot = useCallback(
		(
			nextUsers: any[],
			nextTotal: number | null = totalUsersRef.current,
			nextRoleCounts: Record<string, number> = roleCountsRef.current,
		) => {
			const cacheKey = getManageUsersCacheKey(selectedAcademicYear);
			setClientCache(cacheKey, {
				users: nextUsers,
				totalUsers: typeof nextTotal === 'number' ? nextTotal : null,
				roleCounts: nextRoleCounts,
				serverPage,
			});
			setUsersForYear(
				selectedAcademicYear,
				{
					students: nextUsers.filter((u) => u.role === 'student'),
					teachers: nextUsers.filter((u) => u.role === 'teacher'),
					administrators: nextUsers.filter((u) => u.role === 'administrator'),
				},
				{ merge: false },
			);
		},
		[selectedAcademicYear, serverPage, setUsersForYear],
	);

	const filteredAndSortedUsers = useMemo(() => {
		const filtered = users.filter((user) => {
			const fullName = getFullName(user).toLowerCase();
			const matchesTab = activeTab === 'all' || user.role === activeTab;
			const matchesSearch =
				fullName.includes(searchTerm.toLowerCase()) ||
				user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				user.username?.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesStatus =
				statusFilter === 'all' ||
				(statusFilter === 'active' && user.isActive !== false) ||
				(statusFilter === 'inactive' && user.isActive === false);
			const matchesSession =
				sessionFilter === 'all' ||
				(user.role === 'student' &&
					getSessionFromId(user.classId) === sessionFilter) ||
				(user.role === 'teacher' &&
					getTeacherClassIds(user).some(
						(classId) => getSessionFromId(classId) === sessionFilter,
					));
			const matchesClassLevel =
				classLevelFilter === 'all' ||
				(user.role === 'student' &&
					getClassLevelFromId(user.classId) === classLevelFilter) ||
				(user.role === 'teacher' &&
					getTeacherClassIds(user).some(
						(classId) => getClassLevelFromId(classId) === classLevelFilter,
					));
			const matchesClass =
				classFilter === 'all' ||
				(user.role === 'student' && user.classId === classFilter) ||
				(user.role === 'teacher' &&
					getTeacherClassIds(user).includes(classFilter));
			const matchesSubject =
				subjectFilter === 'all' ||
				(user.role === 'teacher' &&
					getTeacherSubjects(user).includes(subjectFilter));

			return (
				matchesTab &&
				matchesSearch &&
				matchesStatus &&
				matchesSession &&
				matchesClassLevel &&
				matchesClass &&
				matchesSubject
			);
		});

		filtered.sort((a, b) => {
			let aVal = a[sortField as keyof typeof a];
			let bVal = b[sortField as keyof typeof b];
			if (sortField === 'fullName') {
				aVal = getFullName(a);
				bVal = getFullName(b);
			}
			if (sortField === 'createdAt') {
				aVal = aVal ? new Date(aVal) : new Date(0);
				bVal = bVal ? new Date(bVal) : new Date(0);
			}
			if (typeof aVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = (bVal as string).toLowerCase();
			}
			if (sortDirection === 'asc') {
				return aVal > bVal ? 1 : -1;
			} else {
				return aVal < bVal ? 1 : -1;
			}
		});
		return filtered;
	}, [
		users,
		activeTab,
		searchTerm,
		statusFilter,
		sessionFilter,
		classLevelFilter,
		classFilter,
		subjectFilter,
		sortField,
		sortDirection,
	]);

	const isAdditionalFilterActive =
		searchTerm.trim().length > 0 ||
		statusFilter !== 'all' ||
		sessionFilter !== 'all' ||
		classLevelFilter !== 'all' ||
		classFilter !== 'all' ||
		subjectFilter !== 'all';

	const tabTotal =
		activeTab === 'all'
			? totalUsers ?? filteredAndSortedUsers.length
			: roleCounts[activeTab] ?? filteredAndSortedUsers.length;

	const hasMoreServer = !isAdditionalFilterActive
		? tabTotal > filteredAndSortedUsers.length
		: false;

	const displayTotalResults = isAdditionalFilterActive
		? filteredAndSortedUsers.length
		: tabTotal;

	const totalPages = Math.max(
		1,
		Math.ceil(displayTotalResults / itemsPerPage),
	);
	const canGoNext = currentPage < totalPages;
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedUsers = filteredAndSortedUsers.slice(
		startIndex,
		startIndex + itemsPerPage,
	);
	const pageStart = paginatedUsers.length > 0 ? startIndex + 1 : 0;
	const pageEnd =
		paginatedUsers.length > 0
			? Math.min(startIndex + itemsPerPage, filteredAndSortedUsers.length)
			: 0;

	const handleSort = (field: any) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	const handleNextPage = useCallback(() => {
		if (isFetchingMore) return;
		if (currentPage >= totalPages) return;
		setCurrentPage((prev) => prev + 1);
	}, [
		currentPage,
		totalPages,
		isFetchingMore,
	]);

	useEffect(() => {
		if (loading || isFetchingMore) return;
		if (isAdditionalFilterActive) return;
		if (!hasMoreServer) return;
		if (paginatedUsers.length > 0) return;
		if (startIndex < filteredAndSortedUsers.length) return;
		void fetchUsers(serverPage + 1, false);
	}, [
		loading,
		isFetchingMore,
		isAdditionalFilterActive,
		hasMoreServer,
		paginatedUsers.length,
		startIndex,
		filteredAndSortedUsers.length,
		fetchUsers,
		serverPage,
	]);

	const getSortIcon = (field: any) => {
		if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
		return sortDirection === 'asc' ? (
			<ArrowUp className="h-4 w-4" />
		) : (
			<ArrowDown className="h-4 w-4" />
		);
	};

	const resetFilters = () => {
		setStatusFilter('all');
		setSessionFilter('all');
		setClassLevelFilter('all');
		setClassFilter('all');
		setSubjectFilter('all');
	};

	useEffect(() => {
		setCurrentPage(1);
	}, [
		activeTab,
		searchTerm,
		statusFilter,
		sessionFilter,
		classLevelFilter,
		classFilter,
		subjectFilter,
		itemsPerPage,
	]);

	const getStatusColor = (isActive: boolean) => {
		return isActive
			? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
			: 'bg-destructive/10 text-destructive';
	};

	const getUserTypeColor = (role: string) => {
		switch (role) {
			case 'student':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
			case 'teacher':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
			case 'administrator':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
			default:
				return 'bg-muted text-muted-foreground';
		}
	};

	const handleAction = (actionType: string, user: any) => {
		if (
			!isOnline &&
			(actionType === 'reset-password' ||
				actionType === 'toggle-status' ||
				actionType === 'delete')
		) {
			window.dispatchEvent(new CustomEvent('offline:fetch'));
			return;
		}
		switch (actionType) {
			case 'view':
				setViewingUser(user);
				setShowViewModal(true);
				break;
			case 'edit':
				setEditingUser(user);
				setShowEditModal(true);
				break;
			case 'reset-password':
				setResetPasswordUser(user);
				setShowResetPasswordModal(true);
				break;
			case 'toggle-status':
				setDeactivatingUser(user);
				setShowDeactivateModal(true);
				break;
			case 'delete':
				setDeletingUser(user);
				setShowDeleteModal(true);
				break;
			default:
				break;
		}
	};

	const handleDeleteSuccess = (deletedUserId: string) => {
		setUsers((currentUsers) => {
			const deletedUser = currentUsers.find(
				(u) => (u.id || u._id) === deletedUserId,
			);
			const currentTotal =
				typeof totalUsersRef.current === 'number'
					? totalUsersRef.current
					: currentUsers.length;
			const currentCounts = roleCountsRef.current || {};
			if (deletedUser) {
				const nextTotal = Math.max(0, currentTotal - 1);
				setTotalUsers(nextTotal);
				if (deletedUser.role) {
					const nextRoleCounts = {
						...currentCounts,
						[deletedUser.role]: Math.max(
							0,
							(currentCounts[deletedUser.role] || 0) - 1,
						),
					};
					setRoleCounts(nextRoleCounts);
					roleCountsRef.current = nextRoleCounts;
					totalUsersRef.current = nextTotal;
				} else {
					totalUsersRef.current = nextTotal;
				}
			}
			const nextUsers = currentUsers.filter(
				(u) => (u.id || u._id) !== deletedUserId,
			);
			syncUsersSnapshot(
				nextUsers,
				totalUsersRef.current,
				roleCountsRef.current,
			);
			return nextUsers;
		});
	};

	const handleResetPasswordSuccess = () => {
		setFeedback({
			type: 'success',
			message: 'Password reset successfully',
		});
	};

	const handleDeactivateSuccess = (updatedUser: any) => {
		setUsers((currentUsers) => {
			const nextUsers = currentUsers.map((u) =>
				(u.id || u._id) === (updatedUser.id || updatedUser._id)
					? normalizeUser(updatedUser)
					: u,
			);
			syncUsersSnapshot(
				nextUsers,
				totalUsersRef.current,
				roleCountsRef.current,
			);
			return nextUsers;
		});
		setFeedback({
			type: 'success',
			message: `User ${
				updatedUser.isActive ? 'activated' : 'deactivated'
			} successfully`,
		});
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading
					message="Content Loading, Please wait..."
					fullScreen={false}
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background text-foreground p-6">
			{/* The rest of your component remains the same, no changes needed below this line */}
			<div className="max-w-none">
				{feedback.message && (
					<FeedbackToast
						type={feedback.type}
						message={feedback.message}
						onClose={() => setFeedback({ type: '', message: '' })}
					/>
				)}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-primary/10 rounded-lg">
							<Users className="h-6 w-6 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								User Management
							</h1>
							<p className="text-muted-foreground">
								Manage students, teachers, and administrators
							</p>
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					{userTypes.map((type) => {
						const IconComponent = type.icon;
						return (
							<div
								key={type.key}
								className={`p-6 rounded-lg border cursor-pointer transition-all ${
									activeTab === type.key
										? 'bg-primary/5 border-primary'
										: 'bg-card border-border hover:bg-card/80'
								}`}
								onClick={() => {
									setActiveTab(type.key);
									setCurrentPage(1);
								}}
							>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											{type.label}
										</p>
										<p className="text-2xl font-bold text-foreground">
											{type.count}
										</p>
									</div>
									<div
										className={`p-3 rounded-lg ${
											type.key === 'student'
												? 'bg-blue-100'
												: type.key === 'teacher'
													? 'bg-purple-100'
													: type.key === 'administrator'
														? 'bg-orange-100'
														: 'bg-gray-100'
										}`}
									>
										<IconComponent
											className={`h-6 w-6 ${
												type.key === 'student'
													? 'text-blue-600'
													: type.key === 'teacher'
														? 'text-purple-600'
														: type.key === 'administrator'
															? 'text-orange-600'
															: 'text-gray-600'
											}`}
										/>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<div className="flex flex-col sm:flex-row gap-4 mb-6">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<input
							type="text"
							placeholder="Search users..."
							className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								setCurrentPage(1);
							}}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						<select
							value={itemsPerPage}
							onChange={(e) => {
								setItemsPerPage(Number(e.target.value));
								setCurrentPage(1);
							}}
							className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
						>
							<option value={5}>5 rows</option>
							<option value={10}>10 rows</option>
							<option value={20}>20 rows</option>
							<option value={50}>50 rows</option>
							<option value={100}>100 rows</option>
						</select>
						<select
							value={selectedAcademicYear}
							onChange={(e) => {
								setSelectedAcademicYear(e.target.value);
								setCurrentPage(1);
							}}
							className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
						>
							{academicYearOptions.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
						<button
							onClick={() => setShowFilterModal(true)}
							className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-card/80 transition-colors"
						>
							<Filter className="h-4 w-4" />
							Filter
						</button>
						<button
							onClick={() => router.push('/dashboard/admin/users/AddUsers')}
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Add User
						</button>
					</div>
				</div>

				<div className="bg-card rounded-lg border border-border">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50">
								<tr>
									<th
										className="sticky left-0 bg-muted/50 px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70 z-10"
										onClick={() => handleSort('fullName')}
									>
										<div className="flex items-center gap-1">
											User
											{getSortIcon('fullName')}
										</div>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Type
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Details
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Username
									</th>
									<th
										className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
										onClick={() => handleSort('isActive')}
									>
										<div className="flex items-center gap-1">
											Status
											{getSortIcon('isActive')}
										</div>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{paginatedUsers.map((user) => (
									<tr
										key={user.id || user._id}
										className="hover:bg-muted/20 transition-colors"
									>
										<td className="sticky left-0 bg-card hover:bg-muted/20 px-4 sm:px-6 py-4 z-10">
											<div className="flex flex-col items-start sm:flex-row sm:items-center">
												<div
													className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 cursor-pointer"
													onClick={() => {
														setViewingUser(user);
														setShowViewModal(true);
													}}
													title={getFullName(user)}
												>
													<img
														src={
															user.avatar ||
															`https://ui-avatars.com/api/?name=${getFullName(
																user,
															)}`
														}
														alt={getFullName(user)}
														className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
													/>
												</div>
												<div className="mt-2 sm:mt-0 sm:ml-4 max-w-[150px]">
													<div
														className="text-sm font-medium text-foreground truncate cursor-pointer"
														title={getFullName(user)}
														onClick={() => {
															setViewingUser(user);
															setShowViewModal(true);
														}}
													>
														{getFullName(user)}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(
													user.role,
												)}`}
											>
												{user.role.charAt(0).toUpperCase() + user.role.slice(1)}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-muted-foreground">
											{user.role === 'student' &&
												(user.className ||
													(user.classId && getClassDisplayName(user.classId)))}
											{user.role === 'teacher' &&
												getTeacherSubjects(user).join(', ')}
											{user.role === 'administrator' && user.position}
										</td>
										<td className="px-6 py-4 text-sm text-muted-foreground">
											{user.username || '—'}
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
													user.isActive,
												)}`}
											>
												{user.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td className="px-6 py-4">
											<ActionDropdown user={user} onAction={handleAction} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">
								Showing {pageStart}-{pageEnd} of {displayTotalResults} results
							</span>
						</div>

						<div className="flex items-center gap-2">
							<Button
								onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
								variant="outline"
							>
								<ChevronLeft className="h-4 w-4" />
								<span className="hidden sm:inline">Previous</span>
							</Button>

							<div className="flex gap-0.5">
								{totalPages <= 5 ? (
									Array.from({ length: totalPages }, (_, i) => {
										const page = i + 1;
										return (
											<button
												key={page}
												onClick={() => setCurrentPage(page)}
												className={`px-3 py-1 rounded text-sm ${
													currentPage === page
														? 'bg-primary text-primary-foreground'
														: 'hover:bg-muted text-muted-foreground'
												}`}
											>
												{page}
											</button>
										);
									})
								) : (
									<>
										<button
											onClick={() => setCurrentPage(1)}
											className={`px-3 py-1 rounded text-sm ${
												currentPage === 1
													? 'bg-primary text-primary-foreground'
													: 'hover:bg-muted text-muted-foreground'
											}`}
										>
											1
										</button>
										{currentPage > 3 && <span className="px-2">...</span>}
										{currentPage > 1 && currentPage < totalPages && (
											<button
												onClick={() => setCurrentPage(currentPage)}
												className="px-3 py-1 rounded text-sm bg-primary text-primary-foreground"
											>
												{currentPage}
											</button>
										)}
										{currentPage < totalPages - 2 && (
											<span className="px-2">...</span>
										)}
										<button
											onClick={() => setCurrentPage(totalPages)}
											className={`px-3 py-1 rounded text-sm ${
												currentPage === totalPages
													? 'bg-primary text-primary-foreground'
													: 'hover:bg-muted text-muted-foreground'
											}`}
										>
											{totalPages}
										</button>
									</>
								)}
							</div>
							<Button
								onClick={() => void handleNextPage()}
								disabled={!canGoNext || isFetchingMore}
								className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
							>
								<span className="hidden sm:inline">Next</span>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>

			<DeleteUserModal
				isOpen={showDeleteModal}
				onClose={() => setShowDeleteModal(false)}
				deletingUser={deletingUser}
				onDeleteSuccess={handleDeleteSuccess}
				setFeedback={setFeedback}
			/>

			<ResetPasswordModal
				isOpen={showResetPasswordModal}
				onClose={() => setShowResetPasswordModal(false)}
				resetPasswordUser={resetPasswordUser}
				onResetSuccess={handleResetPasswordSuccess}
			/>

			<ViewUserModal
				isOpen={showViewModal}
				onClose={() => setShowViewModal(false)}
				viewingUser={viewingUser}
				schoolProfile={schoolProfile}
			/>

			<FilterUsersModal
				isOpen={showFilterModal}
				onClose={() => setShowFilterModal(false)}
				statusFilter={statusFilter}
				setStatusFilter={setStatusFilter}
				sessionFilter={sessionFilter}
				setSessionFilter={setSessionFilter}
				classLevelFilter={classLevelFilter}
				setClassLevelFilter={setClassLevelFilter}
				classFilter={classFilter}
				setClassFilter={setClassFilter}
				subjectFilter={subjectFilter}
				setSubjectFilter={setSubjectFilter}
				resetFilters={resetFilters}
				onApply={() => {
					setShowFilterModal(false);
					setCurrentPage(1);
				}}
				schoolProfile={schoolProfile}
				availableClasses={availableClasses}
				availableSessions={availableSessions}
				availableClassLevels={availableClassLevels}
				availableSubjects={availableSubjects}
			/>

			<DeactivateUserModal
				isOpen={showDeactivateModal}
				onClose={() => setShowDeactivateModal(false)}
				user={deactivatingUser}
				onSuccess={handleDeactivateSuccess}
				setFeedback={setFeedback}
			/>

			{showEditModal && editingUser && (
				<EditUserModal
					isOpen={showEditModal}
					onClose={() => setShowEditModal(false)}
					user={editingUser}
					onSave={(updatedUser: any, relatedUsers: any[] = []) => {
						const updates = [updatedUser, ...relatedUsers].filter(Boolean);
						const updateMap = new Map(
							updates.map((u) => [
								(u.id || u._id)?.toString(),
								normalizeUser(u),
							]),
						);
						setUsers((current) => {
							const nextUsers = current.map((u) => {
								const key = (u.id || u._id)?.toString();
								return updateMap.has(key) ? updateMap.get(key) : u;
							});
							syncUsersSnapshot(
								nextUsers,
								totalUsersRef.current,
								roleCountsRef.current,
							);
							return nextUsers;
						});
						setShowEditModal(false);
						setEditingUser(null);
						setFeedback({
							type: 'success',
							message: 'User updated successfully',
						});
					}}
					setFeedback={setFeedback}
					schoolProfile={schoolProfile}
					availableClasses={availableClasses}
					availableSubjects={availableSubjects}
				/>
			)}
		</div>
	);
};

export default UserManagementDashboard;
