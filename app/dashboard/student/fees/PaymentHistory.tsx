'use client';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import useAuth from '@/store/useAuth'; // Assuming this is your global auth store
import { useSchoolStore } from '@/store/schoolStore';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
	pdf,
} from '@react-pdf/renderer';
import {
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
} from 'lucide-react';

const receiptStyles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		padding: 24,
		fontSize: 10,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	logo: {
		width: 55,
		height: 55,
	},
	headerCenter: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	schoolName: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	schoolDetails: {
		fontSize: 9,
		textAlign: 'center',
		color: '#5a5a5a',
	},
	divider: {
		height: 1,
		backgroundColor: '#e5e7eb',
		marginVertical: 10,
	},
	title: {
		fontSize: 12,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 12,
	},
	section: {
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 10,
		borderRadius: 6,
	},
	label: {
		fontSize: 9,
		color: '#6b7280',
		marginBottom: 2,
	},
	value: {
		fontSize: 11,
		fontWeight: 'bold',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
		gap: 8,
	},
});

const ReceiptDocument = ({ payment, school }: { payment: any; school: any }) => (
	<Document>
		<Page size="A4" style={receiptStyles.page}>
			<View style={receiptStyles.headerRow}>
				{school?.logoUrl ? (
					<Image src={school.logoUrl} style={receiptStyles.logo} />
				) : (
					<View style={receiptStyles.logo} />
				)}
				<View style={receiptStyles.headerCenter}>
					<Text style={receiptStyles.schoolName}>{school?.name}</Text>
					<Text style={receiptStyles.schoolDetails}>
						{Array.isArray(school?.address)
							? school.address.join('\n')
							: school?.address || ''}
					</Text>
				</View>
				{school?.logoUrl2 || school?.logoUrl ? (
					<Image
						src={school?.logoUrl2 || school?.logoUrl}
						style={receiptStyles.logo}
					/>
				) : (
					<View style={receiptStyles.logo} />
				)}
			</View>
			<View style={receiptStyles.divider} />
			<Text style={receiptStyles.title}>Payment Receipt</Text>
			<View style={receiptStyles.section}>
				<View style={receiptStyles.row}>
					<View>
						<Text style={receiptStyles.label}>Receipt Number</Text>
						<Text style={receiptStyles.value}>{payment.receiptNumber}</Text>
					</View>
					<View>
						<Text style={receiptStyles.label}>Academic Year</Text>
						<Text style={receiptStyles.value}>{payment.paymentAcademicYear}</Text>
					</View>
				</View>
				<View style={receiptStyles.row}>
					<View>
						<Text style={receiptStyles.label}>Paid By</Text>
						<Text style={receiptStyles.value}>{payment.paidBy}</Text>
					</View>
					<View>
						<Text style={receiptStyles.label}>Fee Type</Text>
						<Text style={receiptStyles.value}>{payment.feeType}</Text>
					</View>
				</View>
				<View style={receiptStyles.row}>
					<View>
						<Text style={receiptStyles.label}>Payment Method</Text>
						<Text style={receiptStyles.value}>{payment.category}</Text>
					</View>
					<View>
						<Text style={receiptStyles.label}>Amount</Text>
						<Text style={receiptStyles.value}>
							LRD {Number(payment.paymentAmount).toFixed(2)}
						</Text>
					</View>
				</View>
				<View style={receiptStyles.row}>
					<View>
						<Text style={receiptStyles.label}>Date</Text>
						<Text style={receiptStyles.value}>{payment.paymentDate}</Text>
					</View>
					<View>
						<Text style={receiptStyles.label}>Time</Text>
						<Text style={receiptStyles.value}>{payment.paymentTime}</Text>
					</View>
				</View>
			</View>
			<Text style={receiptStyles.schoolDetails}>
				This receipt is generated electronically and is valid without a
				signature.
			</Text>
		</Page>
	</Document>
);

export default function PaymentHistory() {
	const { user, isLoading } = useAuth(); // Get user from global state

	// Component states
	const [payments, setPayments] = useState<any[]>([]);
	const [isLoadingPayments, setIsLoadingPayments] = useState(false);
	const [error, setError] = useState('');
	const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(
		null,
	);
	const school = useSchoolStore((state) => state.school);

	const getPaymentTypeLabel = (type: string) => {
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

	// Filter states
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [typeFilter, setTypeFilter] = useState('all');
	const [dateFilter, setDateFilter] = useState('all');

	// Modal states
	const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
	const [showModal, setShowModal] = useState(false);

	const normalizePayments = useMemo(() => {
		const records = (user as any)?.financialProfile?.paymentRecords || [];
		return records.map((record: any) => ({
			id: record.id,
			type: record.feeType,
			amount: record.paymentAmount,
			status: 'completed',
			paymentMethod: record.category,
			phoneNumber: user?.phone || 'N/A',
			date: `${record.paymentDate}T${record.paymentTime || '00:00'}:00Z`,
			transactionId: record.receiptNumber,
			description: `${getPaymentTypeLabel(record.feeType)} - ${
				record.paymentAcademicYear
			}`,
			raw: record,
		}));
	}, [user]);

	const refreshPayments = () => {
		setError('');
		setPayments(normalizePayments);
	};

	// Fetch payment history
	useEffect(() => {
		if (!user) return;
		setIsLoadingPayments(true);
		setError('');
		try {
			setPayments(normalizePayments);
		} catch (error) {
			console.error('Error fetching payment history:', error);
			setError('Failed to load payment history');
		} finally {
			setIsLoadingPayments(false);
		}
	}, [user, normalizePayments]);

	// Filter payments based on search and selected filters
	const filteredPayments = useMemo(() => {
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

		return filtered;
	}, [payments, searchTerm, statusFilter, typeFilter, dateFilter]);

	const getPaymentTypeIcon = (type: string) => {
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

	const getStatusBadge = (status: string) => {
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

	const formatDate = (dateString?: string | null) => {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const viewPaymentDetails = (payment: any) => {
		setSelectedPayment(payment);
		setShowModal(true);
	};

	const closeModal = () => {
		setShowModal(false);
		setSelectedPayment(null);
	};

	const handleDownloadReceipt = useCallback(
		async (paymentRecord: any, receiptId: string) => {
			if (!school) return;
			try {
				setDownloadingReceiptId(receiptId);
				const blob = await pdf(
					<ReceiptDocument payment={paymentRecord} school={school} />,
				).toBlob();
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = `receipt-${receiptId}.pdf`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			} catch (downloadError) {
				console.error('Failed to download receipt:', downloadError);
			} finally {
				setDownloadingReceiptId((prev) => (prev === receiptId ? null : prev));
			}
		},
		[school],
	);

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
			<div className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
				{/* Header */}
				<div className="mb-6 sm:mb-8">
					<h1 className="mb-2 text-2xl font-bold sm:text-4xl">
						Payment History
					</h1>
					<p className="text-sm text-muted-foreground sm:text-base lg:text-lg">
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
						<div className="flex flex-col items-start gap-4 rounded-lg border bg-muted/50 p-4 sm:flex-row">
							<Avatar className="h-12 w-12">
								<AvatarImage
									src={
										user.profilePictureUrl ||
										user.avatar ||
										(user as any).profilePhoto ||
										''
									}
								/>
								<AvatarFallback>
									{user.firstName?.[0]}
									{user.lastName?.[0]}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<h3 className="text-lg font-semibold">
									{user.firstName} {user.lastName}
								</h3>
								<p className="text-sm text-muted-foreground">
									Student ID: {(user as any).studentId || user.id}
								</p>
								<p className="text-sm text-muted-foreground">
									Class: {(user as any).className || 'Grade 9'}
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
										onClick={refreshPayments}
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
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
											<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
												<div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:gap-4">
													<div className="rounded-lg bg-primary/10 p-2">
														<TypeIcon className="h-5 w-5 text-primary" />
													</div>
													<div className="min-w-0 flex-1">
														<div className="mb-1 flex flex-wrap items-center gap-2">
															<h4 className="font-semibold">
																{payment.description}
															</h4>
															{getStatusBadge(payment.status)}
														</div>
														<p className="mb-2 break-words text-sm text-muted-foreground">
															Payment ID: {payment.id} • Transaction:{' '}
															{payment.transactionId}
														</p>
														<div className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2 sm:text-sm lg:flex lg:flex-wrap lg:items-center lg:gap-4">
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
												<div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
													<div className="text-left sm:text-right">
														<p className="text-lg font-semibold">
															LRD {Number(payment.amount).toFixed(2)}
														</p>
														<p className="text-sm text-muted-foreground">
															{getPaymentTypeLabel(payment.type)}
														</p>
													</div>
													<div className="flex shrink-0 gap-2">
														{school ? (
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	handleDownloadReceipt(
																		payment.raw,
																		payment.id,
																	)
																}
																disabled={downloadingReceiptId === payment.id}
															>
																{downloadingReceiptId === payment.id ? (
																	<Loader2 className="h-4 w-4 animate-spin" />
																) : (
																	<Download className="h-4 w-4" />
																)}
															</Button>
														) : (
															<Button variant="outline" size="sm" disabled>
																<Download className="h-4 w-4" />
															</Button>
														)}
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

			<Dialog open={showModal} onOpenChange={(open) => setShowModal(open)}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Payment Details</DialogTitle>
					</DialogHeader>
					{selectedPayment ? (
						<div className="space-y-4 text-sm">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-muted-foreground">Receipt Number</p>
									<p className="font-semibold">
										{selectedPayment.raw.receiptNumber}
									</p>
								</div>
								<div className="text-right">
									<p className="text-muted-foreground">Amount</p>
									<p className="font-semibold">
										LRD {Number(selectedPayment.amount).toFixed(2)}
									</p>
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<p className="text-muted-foreground">Paid By</p>
									<p className="font-semibold">
										{selectedPayment.raw.paidBy}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Fee Type</p>
									<p className="font-semibold">
										{getPaymentTypeLabel(selectedPayment.type)}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Payment Method</p>
									<p className="font-semibold">
										{selectedPayment.paymentMethod === 'orange'
											? 'Orange Money'
											: selectedPayment.paymentMethod === 'lonester'
												? 'Lonester Mobile Money'
												: selectedPayment.paymentMethod}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Academic Year</p>
									<p className="font-semibold">
										{selectedPayment.raw.paymentAcademicYear}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Date</p>
									<p className="font-semibold">
										{selectedPayment.raw.paymentDate}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Time</p>
									<p className="font-semibold">
										{selectedPayment.raw.paymentTime}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Student ID</p>
									<p className="font-semibold">
										{(user as any)?.studentId || user?.id}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Status</p>
									<p className="font-semibold capitalize">
										{selectedPayment.status}
									</p>
								</div>
							</div>
						</div>
					) : null}
					<DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
						{selectedPayment && school ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									handleDownloadReceipt(selectedPayment.raw, selectedPayment.id)
								}
								disabled={downloadingReceiptId === selectedPayment.id}
							>
								{downloadingReceiptId === selectedPayment.id ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Downloading...
									</>
								) : (
									<>
										<Download className="mr-2 h-4 w-4" />
										Download Receipt
									</>
								)}
							</Button>
						) : (
							<Button type="button" variant="outline" size="sm" disabled>
								<Download className="h-4 w-4 mr-2" />
								Download Receipt
							</Button>
						)}
						<Button type="button" onClick={closeModal} size="sm">
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
