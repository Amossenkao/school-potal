'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

const API_URL = '/api/users';

// --- NEW: Reusable Feedback Toast Component ---
const FeedbackToast = ({ type, message, onClose }) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 5000); // Auto-dismiss after 5 seconds

		return () => clearTimeout(timer);
	}, [onClose]);

	const isSuccess = type === 'success';
	const baseClasses =
		'flex items-start gap-4 p-4 rounded-lg shadow-lg border w-full max-w-sm';
	const colorClasses = isSuccess
		? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
		: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200';
	const Icon = isSuccess ? CheckCircle : XCircle;
	const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';

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

const UserManagementDashboard = () => {
	const [activeTab, setActiveTab] = useState('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [feedback, setFeedback] = useState({ type: '', message: '' });

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
	// Sorting state
	const [sortField, setSortField] = useState('name');
	const [sortDirection, setSortDirection] = useState('asc');

	// Filter state
	const [statusFilter, setStatusFilter] = useState('all');
	const [sessionFilter, setSessionFilter] = useState('all');
	const [classLevelFilter, setClassLevelFilter] = useState('all');
	const [classFilter, setClassFilter] = useState('all');
	const [subjectFilter, setSubjectFilter] = useState('all');

	const router = useRouter();
	const schoolProfile = useSchoolStore((state) => state.school);

	// Get all available classes from school profile
	const availableClasses = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];

		const allClasses = [];
		Object.entries(schoolProfile.classLevels).forEach(([session, levels]) => {
			Object.entries(levels).forEach(([level, levelData]) => {
				levelData.classes.forEach((cls) => {
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

	// Get all available sessions from school profile
	const availableSessions = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];
		return Object.keys(schoolProfile.classLevels);
	}, [schoolProfile]);

	// Get all available class levels from school profile
	const availableClassLevels = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];
		const levels = new Set();
		Object.values(schoolProfile.classLevels).forEach((sessionData) => {
			Object.keys(sessionData).forEach((level) => levels.add(level));
		});
		return Array.from(levels);
	}, [schoolProfile]);

	// Get all available subjects from school profile
	const availableSubjects = useMemo(() => {
		if (!schoolProfile?.classLevels) return [];
		const subjects = new Set();
		Object.values(schoolProfile.classLevels).forEach((sessionData) => {
			Object.values(sessionData).forEach((levelData) => {
				levelData.subjects.forEach((subject) => subjects.add(subject));
			});
		});
		return Array.from(subjects).sort();
	}, [schoolProfile]);

	const fetchUsers = async () => {
		setLoading(true);
		try {
			const res = await fetch(API_URL);
			const data = await res.json();
			if (data.success) {
				const userList = Array.isArray(data.data) ? data.data : [data.data];
				setUsers(userList.filter(Boolean));
			} else {
				setUsers([]);
			}
		} catch (e) {
			setUsers([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	const userTypes = useMemo(
		() => [
			{ key: 'all', label: 'All Users', icon: Users, count: users.length },
			{
				key: 'student',
				label: 'Students',
				icon: GraduationCap,
				count: users.filter((u) => u.role === 'student').length,
			},
			{
				key: 'teacher',
				label: 'Teachers',
				icon: BookOpen,
				count: users.filter((u) => u.role === 'teacher').length,
			},
			{
				key: 'administrator',
				label: 'Administrators',
				icon: Shield,
				count: users.filter((u) => u.role === 'administrator').length,
			},
		],
		[users]
	);

	const getFullName = (user) => {
		const names = [user.firstName, user.middleName, user.lastName].filter(
			Boolean
		);
		return names.join(' ');
	};

	// Helper function to get class display name from school profile
	const getClassDisplayName = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return classId;

		const foundClass = availableClasses.find((cls) => cls.classId === classId);
		return foundClass ? foundClass.displayName : classId;
	};

	// Helper function to get class level from class ID
	const getClassLevelFromId = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return null;

		const foundClass = availableClasses.find((cls) => cls.classId === classId);
		return foundClass ? foundClass.level : null;
	};

	// Helper function to get session from class ID
	const getSessionFromId = (classId) => {
		if (!classId || !schoolProfile?.classLevels) return null;

		const foundClass = availableClasses.find((cls) => cls.classId === classId);
		return foundClass ? foundClass.session : null;
	};

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
					user.subjects?.some((s) => s.session === sessionFilter));

			const matchesClassLevel =
				classLevelFilter === 'all' ||
				(user.role === 'student' &&
					getClassLevelFromId(user.classId) === classLevelFilter) ||
				(user.role === 'teacher' &&
					user.subjects?.some((s) => s.level === classLevelFilter));

			const matchesClass =
				classFilter === 'all' ||
				(user.role === 'student' && user.classId === classFilter);
			const matchesSubject =
				subjectFilter === 'all' ||
				(user.role === 'teacher' &&
					user.subjects?.some((s) => s.subject === subjectFilter));

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
			let aVal = a[sortField];
			let bVal = b[sortField];
			if (sortField === 'fullName') {
				aVal = getFullName(a);
				bVal = getFullName(b);
			}

			if (sortField === 'createdAt') {
				aVal = new Date(aVal);
				bVal = new Date(bVal);
			}

			if (typeof aVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
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
		schoolProfile,
		availableClasses,
	]);

	const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedUsers = filteredAndSortedUsers.slice(
		startIndex,
		startIndex + itemsPerPage
	);

	const handleSort = (field) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	const getSortIcon = (field) => {
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

	const getStatusColor = (isActive) => {
		return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
	};

	const getUserTypeColor = (role) => {
		switch (role) {
			case 'student':
				return 'bg-blue-100 text-blue-800';
			case 'teacher':
				return 'bg-purple-100 text-purple-800';
			case 'administrator':
				return 'bg-orange-100 text-orange-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const handleDeleteSuccess = (deletedUserId) => {
		setUsers((currentUsers) =>
			currentUsers.filter((u) => u._id !== deletedUserId)
		);
	};

	const handleResetPasswordSuccess = () => {
		setFeedback({
			type: 'success',
			message: 'Password reset successfully',
		});
	};

	const handleDeactivateSuccess = (updatedUser) => {
		setUsers((currentUsers) =>
			currentUsers.map((u) => (u._id === updatedUser._id ? updatedUser : u))
		);
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
			<div className="max-w-7xl mx-auto">
				{/* MODIFICATION: Render FeedbackToast instead of static banner */}
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
					<div className="flex gap-2">
						<button
							onClick={() => setShowFilterModal(true)}
							className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-card/80 transition-colors"
						>
							<Filter className="h-4 w-4" />
							Filter
						</button>
						<button
							onClick={() => router.push('/dashboard/add-users')}
							className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Add User
						</button>
					</div>
				</div>

				<div className="bg-card rounded-lg border border-border overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50">
								<tr>
									<th
										className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
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
									<th
										className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
										onClick={() => handleSort('isActive')}
									>
										<div className="flex items-center gap-1">
											Status
											{getSortIcon('isActive')}
										</div>
									</th>
									<th
										className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
										onClick={() => handleSort('createdAt')}
									>
										<div className="flex items-center gap-1">
											Join Date
											{getSortIcon('createdAt')}
										</div>
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{paginatedUsers.map((user) => (
									<tr
										key={user._id}
										className="hover:bg-muted/20 transition-colors"
									>
										<td className="px-6 py-4">
											<div className="flex items-center">
												<div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
													<img
														src={
															user.avatar ||
															`https://ui-avatars.com/api/?name=${getFullName(
																user
															)}`
														}
														alt={getFullName(user)}
														className="h-10 w-10 rounded-full"
													/>
												</div>
												<div className="ml-4">
													<div className="text-sm font-medium text-foreground">
														{getFullName(user)}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(
													user.role
												)}`}
											>
												{user.role.charAt(0).toUpperCase() + user.role.slice(1)}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-muted-foreground">
											{user.role === 'student' &&
												user.classId &&
												getClassDisplayName(user.classId)}
											{user.role === 'teacher' &&
												user.subjects &&
												user.subjects.map((s) => s.subject).join(', ')}
											{user.role === 'administrator' && user.position}
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
													user.isActive
												)}`}
											>
												{user.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-muted-foreground">
											{user.createdAt
												? new Date(user.createdAt).toLocaleDateString()
												: ''}
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<button
													onClick={() => {
														setViewingUser(user);
														setShowViewModal(true);
													}}
													className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
													title="View User"
												>
													<Eye className="h-4 w-4" />
												</button>
												<button
													onClick={() => {
														setEditingUser(user);
														setShowEditModal(true);
													}}
													className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
													title="Edit User"
												>
													<Edit className="h-4 w-4" />
												</button>
												<button
													onClick={() => {
														setResetPasswordUser(user);
														setShowResetPasswordModal(true);
													}}
													className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
													title="Reset User Password"
												>
													<RotateCcw className="h-4 w-4" />
												</button>
												<button
													onClick={() => {
														setDeactivatingUser(user);
														setShowDeactivateModal(true);
													}}
													className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
													title={
														user.isActive ? 'Deactivate User' : 'Activate User'
													}
												>
													<Power className="h-4 w-4" />
												</button>
												<button
													disabled={user.role == 'system_admin'}
													onClick={() => {
														setDeletingUser(user);
														setShowDeleteModal(true);
													}}
													className={`p-1 hover:bg-red-100 rounded text-muted-foreground hover:text-red-600 transition-colors ${
														user.role == 'system_admin'
															? 'cursor-not-allowed'
															: ''
													}`}
													title="Delete User"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex items-center justify-between p-4 border-t border-border">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Show</span>
							<select
								value={itemsPerPage}
								onChange={(e) => {
									setItemsPerPage(Number(e.target.value));
									setCurrentPage(1);
								}}
								className="bg-background border border-border rounded px-2 py-1 text-sm"
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
							</select>
							<span className="text-sm text-muted-foreground">
								of {filteredAndSortedUsers.length} results
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
								Previous
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
								onClick={() =>
									setCurrentPage(Math.min(totalPages, currentPage + 1))
								}
								disabled={currentPage === totalPages}
								className="p-2 rounded hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
							>
								Next
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
					onSave={(updatedUser) => {
						setUsers(
							users.map((u) => (u._id === updatedUser._id ? updatedUser : u))
						);
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
