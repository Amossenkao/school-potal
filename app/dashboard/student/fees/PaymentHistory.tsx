'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useAuth from '@/store/useAuth'; // Assuming this is your global auth store
import {
	ArrowLeft,
	CheckCircle,
	XCircle,
	Loader2,
	FileText,
	AlertCircle,
	BookOpen,
	CreditCard,
	Download,
	MoreHorizontal,
	User,
	Phone,
	Calendar,
	Search,
	Filter,
	Eye,
	Receipt,
	X,
	DollarSign,
	Hash,
} from 'lucide-react';

export default function PaymentHistory() {
	const { user, isLoading } = useAuth(); // Get user from global state

	// Component states
	const [payments, setPayments] = useState([]);
	const [filteredPayments, setFilteredPayments] = useState([]);
	const [isLoadingPayments, setIsLoadingPayments] = useState(false);
	const [error, setError] = useState('');

	// Filter states
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [typeFilter, setTypeFilter] = useState('all');
	const [dateFilter, setDateFilter] = useState('all');

	// Modal states
	const [selectedPayment, setSelectedPayment] = useState(null);
	const [showModal, setShowModal] = useState(false);

	// API Configuration
	const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

	// Mock payment data (replace with actual API call)
	const mockPayments = [
		{
			id: 'PAY001',
			type: 'tuition',
			amount: 750.0,
			status: 'completed',
			paymentMethod: 'orange',
			phoneNumber: '+231 77 123 4567',
			date: '2024-08-05T10:30:00Z',
			transactionId: 'TXN123456789',
			description: 'Tuition Fees - Semester 1',
		},
		{
			id: 'PAY002',
			type: 'registration',
			amount: 150.0,
			status: 'completed',
			paymentMethod: 'lonester',
			phoneNumber: '+231 88 654 3210',
			date: '2024-07-20T14:15:00Z',
			transactionId: 'TXN987654321',
			description: 'Registration Fees - Academic Year 2024',
		},
		{
			id: 'PAY003',
			type: 'other',
			amount: 50.0,
			status: 'pending',
			paymentMethod: 'orange',
			phoneNumber: '+231 77 123 4567',
			date: '2024-08-08T09:00:00Z',
			transactionId: 'TXN456789123',
			description: 'Library Fees',
		},
		{
			id: 'PAY004',
			type: 'tuition',
			amount: 375.0,
			status: 'failed',
			paymentMethod: 'lonester',
			phoneNumber: '+231 88 654 3210',
			date: '2024-08-01T16:45:00Z',
			transactionId: 'TXN789123456',
			description: 'Partial Tuition Payment',
		},
	];

	// Fetch payment history
	useEffect(() => {
		if (user) {
			fetchPaymentHistory();
		}
	}, [user]);

	const fetchPaymentHistory = async () => {
		setIsLoadingPayments(true);
		setError('');

		try {
			// Replace with actual API call
			// const response = await fetch(`${API_BASE_URL}/payments/history/${user.id}`);
			// if (response.ok) {
			//   const data = await response.json();
			//   setPayments(data);
			// } else {
			//   throw new Error('Failed to fetch payment history');
			// }

			// Using mock data for demonstration
			setTimeout(() => {
				setPayments(mockPayments);
				setFilteredPayments(mockPayments);
				setIsLoadingPayments(false);
			}, 1000);
		} catch (error) {
			console.error('Error fetching payment history:', error);
			setError('Failed to load payment history');
			setIsLoadingPayments(false);
		}
	};

	// Filter payments based on search and filters
	useEffect(() => {
		let filtered = [...payments];

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(payment) =>
					payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
					payment.description
						.toLowerCase()
						.includes(searchTerm.toLowerCase()) ||
					payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Status filter
		if (statusFilter !== 'all') {
			filtered = filtered.filter((payment) => payment.status === statusFilter);
		}

		// Type filter
		if (typeFilter !== 'all') {
			filtered = filtered.filter((payment) => payment.type === typeFilter);
		}

		// Date filter
		if (dateFilter !== 'all') {
			const now = new Date();
			filtered = filtered.filter((payment) => {
				const paymentDate = new Date(payment.date);
				switch (dateFilter) {
					case 'today':
						return paymentDate.toDateString() === now.toDateString();
					case 'week':
						const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
						return paymentDate >= weekAgo;
					case 'month':
						const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
						return paymentDate >= monthAgo;
					default:
						return true;
				}
			});
		}

		setFilteredPayments(filtered);
	}, [payments, searchTerm, statusFilter, typeFilter, dateFilter]);

	const getPaymentTypeLabel = (type) => {
		switch (type) {
			case 'tuition':
				return 'Tuition Fees';
			case 'registration':
				return 'Registration Fees';
			case 'other':
				return 'Other Fees';
			default:
				return type;
		}
	};

	const getPaymentTypeIcon = (type) => {
		switch (type) {
			case 'tuition':
				return BookOpen;
			case 'registration':
				return FileText;
			case 'other':
				return MoreHorizontal;
			default:
				return CreditCard;
		}
	};

	const getStatusBadge = (status) => {
		const baseClasses =
			'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case 'completed':
				return (
					<span
						className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`}
					>
						<CheckCircle className="w-3 h-3 mr-1" />
						Completed
					</span>
				);
			case 'pending':
				return (
					<span
						className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`}
					>
						<Loader2 className="w-3 h-3 mr-1 animate-spin" />
						Pending
					</span>
				);
			case 'failed':
				return (
					<span
						className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`}
					>
						<XCircle className="w-3 h-3 mr-1" />
						Failed
					</span>
				);
			default:
				return (
					<span
						className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400`}
					>
						{status}
					</span>
				);
		}
	};

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const downloadReceipt = (payment) => {
		// Implement receipt download logic
		console.log('Downloading receipt for payment:', payment.id);
		// You can implement actual download functionality here
		// For example, generate a PDF or redirect to receipt endpoint
	};

	const viewPaymentDetails = (payment) => {
		setSelectedPayment(payment);
		setShowModal(true);
	};

	const closeModal = () => {
		setShowModal(false);
		setSelectedPayment(null);
	};

	// Show loading state while user data is being fetched
	if (isLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
					<p className="text-muted-foreground">Loading user information...</p>
				</div>
			</div>
		);
	}

	// Show error if no user is found
	if (!user) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Card className="max-w-md mx-auto">
					<CardContent className="p-6 text-center">
						<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">User Not Found</h3>
						<p className="text-muted-foreground mb-4">
							Unable to load user information. Please try logging in again.
						</p>
						<Button onClick={() => (window.location.href = '/login')}>
							Go to Login
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Main Content */}
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => window.history.back()}
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back
						</Button>
					</div>
					<h1 className="text-3xl sm:text-4xl font-bold mb-2">
						Payment History
					</h1>
					<p className="text-lg text-muted-foreground">
						View all your payment transactions and download receipts
					</p>
				</div>

				{/* Student Information Display */}
				<Card className="mb-8">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="h-5 w-5" />
							Student Information
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex gap-4 items-start border p-4 rounded-lg bg-muted/50">
							<Avatar className="w-12 h-12">
								<AvatarImage src={user.profilePhoto} />
								<AvatarFallback>
									{user.firstName?.[0]}
									{user.lastName?.[0]}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1">
								<h3 className="text-lg font-semibold">
									{user.firstName} {user.lastName}
								</h3>
								<p className="text-sm text-muted-foreground">
									Student ID: {user.id}
								</p>
								<p className="text-sm text-muted-foreground">
									Class: {user.class || 'Grade 9'}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Error State */}
				{error && (
					<Card className="mb-8 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
								<div>
									<h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
										Error Loading Payments
									</h3>
									<p className="text-red-700 dark:text-red-300">{error}</p>
									<Button
										onClick={fetchPaymentHistory}
										variant="outline"
										size="sm"
										className="mt-4"
									>
										Try Again
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Filters and Search */}
				<Card className="mb-8">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="h-5 w-5" />
							Filter Payments
						</CardTitle>
						<CardDescription>
							Search and filter your payment history
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							{/* Search */}
							<div>
								<label className="block text-sm font-medium mb-2">Search</label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
									<input
										type="text"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										placeholder="Payment ID, description..."
										className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
									/>
								</div>
							</div>

							{/* Status Filter */}
							<div>
								<label className="block text-sm font-medium mb-2">Status</label>
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
								>
									<option value="all">All Status</option>
									<option value="completed">Completed</option>
									<option value="pending">Pending</option>
									<option value="failed">Failed</option>
								</select>
							</div>

							{/* Type Filter */}
							<div>
								<label className="block text-sm font-medium mb-2">Type</label>
								<select
									value={typeFilter}
									onChange={(e) => setTypeFilter(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
								>
									<option value="all">All Types</option>
									<option value="tuition">Tuition Fees</option>
									<option value="registration">Registration Fees</option>
									<option value="other">Other Fees</option>
								</select>
							</div>

							{/* Date Filter */}
							<div>
								<label className="block text-sm font-medium mb-2">
									Date Range
								</label>
								<select
									value={dateFilter}
									onChange={(e) => setDateFilter(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
								>
									<option value="all">All Time</option>
									<option value="today">Today</option>
									<option value="week">Last 7 Days</option>
									<option value="month">Last 30 Days</option>
								</select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Payment History */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Receipt className="h-5 w-5" />
							Payment History
						</CardTitle>
						<CardDescription>
							{filteredPayments.length} of {payments.length} payments shown
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoadingPayments ? (
							<div className="text-center py-8">
								<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
								<p className="text-muted-foreground">
									Loading payment history...
								</p>
							</div>
						) : filteredPayments.length === 0 ? (
							<div className="text-center py-8">
								<Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
								<h3 className="text-lg font-semibold mb-2">
									No Payments Found
								</h3>
								<p className="text-muted-foreground mb-4">
									{payments.length === 0
										? "You haven't made any payments yet."
										: 'No payments match your current filters.'}
								</p>
								{payments.length === 0 && (
									<Button onClick={() => (window.location.href = '/pay-fees')}>
										<CreditCard className="h-4 w-4 mr-2" />
										Make Your First Payment
									</Button>
								)}
							</div>
						) : (
							<div className="space-y-4">
								{filteredPayments.map((payment) => {
									const TypeIcon = getPaymentTypeIcon(payment.type);
									return (
										<div
											key={payment.id}
											className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
										>
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
												<div className="flex items-start gap-4">
													<div className="p-2 rounded-lg bg-primary/10">
														<TypeIcon className="h-5 w-5 text-primary" />
													</div>
													<div className="flex-1">
														<div className="flex items-center gap-2 mb-1">
															<h4 className="font-semibold">
																{payment.description}
															</h4>
															{getStatusBadge(payment.status)}
														</div>
														<p className="text-sm text-muted-foreground mb-2">
															Payment ID: {payment.id} • Transaction:{' '}
															{payment.transactionId}
														</p>
														<div className="flex items-center gap-4 text-sm text-muted-foreground">
															<div className="flex items-center gap-1">
																<Calendar className="h-4 w-4" />
																{formatDate(payment.date)}
															</div>
															<div className="flex items-center gap-1">
																<Phone className="h-4 w-4" />
																{payment.phoneNumber}
															</div>
															<div className="flex items-center gap-1">
																<CreditCard className="h-4 w-4" />
																{payment.paymentMethod === 'orange'
																	? 'Orange Money'
																	: 'Lonester Mobile Money'}
															</div>
														</div>
													</div>
												</div>
												<div className="flex items-center gap-4">
													<div className="text-right">
														<p className="text-lg font-semibold">
															${payment.amount.toFixed(2)}
														</p>
														<p className="text-sm text-muted-foreground">
															{getPaymentTypeLabel(payment.type)}
														</p>
													</div>
													<div className="flex gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => downloadReceipt(payment)}
														>
															<Download className="h-4 w-4" />
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => viewPaymentDetails(payment)}
														>
															<Eye className="h-4 w-4" />
														</Button>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
