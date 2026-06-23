'use client';
import React, { useState } from 'react';
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
	Sparkles,
	Clock,
} from 'lucide-react';

export default function PayFees() {
	const { user, isLoading } = useAuth(); // Get user from global state

	// Payment form states
	const [paymentType, setPaymentType] = useState('');
	const [amount, setAmount] = useState('');
	const [paymentMethod, setPaymentMethod] = useState('');
	const [phoneNumber, setPhoneNumber] = useState('');

	// Payment processing states
	const [isProcessing, setIsProcessing] = useState(false);
	const [paymentStatus, setPaymentStatus] = useState('');
	const [paymentMessage, setPaymentMessage] = useState('');
	const [paymentResult, setPaymentResult] = useState<any>(null);

	// API Configuration
	const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
	const formatAmount = (value: string | number) => {
		const amountValue =
			typeof value === 'string' ? Number.parseFloat(value || '0') : value;
		return `LRD ${amountValue.toFixed(2)}`;
	};

	// Payment processing
	const handlePayment = async () => {
		if (!user || !paymentType || !amount || !paymentMethod || !phoneNumber) {
			alert('Please fill in all required fields');
			return;
		}

		setIsProcessing(true);
		setPaymentStatus('');
		setPaymentResult(null);

		try {
			const paymentData = {
				studentId: user.id,
				paymentType,
				amount: parseFloat(amount),
				paymentMethod,
				phoneNumber,
			};

			const response = await fetch(`${API_BASE_URL}/payments`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(paymentData),
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(result?.message || 'Payment failed');
			}
			setPaymentResult(result?.data || null);
			setPaymentStatus(result?.status || (result?.success ? 'success' : 'failed'));
			setPaymentMessage(
				result?.message ||
					`Payment of ${formatAmount(amount)} for ${paymentType} has been processed.`,
			);
		} catch (error) {
			console.error('Payment error:', error);
			setPaymentStatus('failed');
			setPaymentMessage(
				(error as Error).message ||
					'Payment failed. Please check your payment details and try again.'
			);
		} finally {
			setIsProcessing(false);
		}
	};

	const resetForm = () => {
		setPaymentStatus('');
		setPaymentMessage('');
		setPaymentType('');
		setAmount('');
		setPaymentMethod('');
		setPhoneNumber('');
		setPaymentResult(null);
	};

	const paymentTypes = [
		{ value: 'tuition', label: 'Tuition Fees', icon: BookOpen },
		{ value: 'registration', label: 'Registration Fees', icon: FileText },
		{ value: 'other', label: 'Other Fees', icon: MoreHorizontal },
	];

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
			<div className="w-full px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8 rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/70">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h1 className="text-3xl sm:text-4xl font-bold mb-2">
								Make Payment
							</h1>
							<p className="text-lg text-muted-foreground">
								Pay tuition, registration, or other fees in seconds
							</p>
						</div>
						<div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm dark:border-gray-800/80 dark:bg-gray-900/70 dark:text-gray-300">
							<Sparkles className="h-3 w-3" />
							Secure Student Payment
						</div>
					</div>
				</div>

				{/* Payment Status Messages */}
				{paymentStatus === 'success' && (
					<Card className="mb-8 border-green-200 bg-green-50/80 dark:bg-green-950/30 dark:border-green-800">
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
								<div>
									<h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
										Payment Successful!
									</h3>
									<p className="text-green-700 dark:text-green-300">
										{paymentMessage}
									</p>
									{paymentResult ? (
										<div className="mt-3 text-sm text-green-700/80 dark:text-green-200/80">
											<p>Receipt: {paymentResult.receiptNumber}</p>
											<p>Amount: {formatAmount(paymentResult.paymentAmount)}</p>
										</div>
									) : null}
									<div className="flex flex-col sm:flex-row gap-4 mt-4">
										<Button onClick={resetForm} variant="outline" size="sm">
											Make Another Payment
										</Button>
										<Button>
											<Download className="h-4 w-4 mr-2" />
											Download Receipt
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{paymentStatus === 'pending' && (
					<Card className="mb-8 border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800">
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
								<div>
									<h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
										Payment Pending
									</h3>
									<p className="text-amber-700 dark:text-amber-300">
										{paymentMessage}
									</p>
									{paymentResult ? (
										<div className="mt-3 text-sm text-amber-700/80 dark:text-amber-200/80">
											<p>Receipt: {paymentResult.receiptNumber}</p>
											<p>Amount: {formatAmount(paymentResult.paymentAmount)}</p>
										</div>
									) : null}
									<div className="flex flex-col sm:flex-row gap-4 mt-4">
										<Button onClick={resetForm} variant="outline" size="sm">
											Make Another Payment
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{paymentStatus === 'failed' && (
					<Card className="mb-8 border-red-200 bg-red-50/80 dark:bg-red-950/30 dark:border-red-800">
						<CardContent className="p-6">
							<div className="flex items-center gap-4">
								<XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
								<div>
									<h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
										Payment Failed
									</h3>
									<p className="text-red-700 dark:text-red-300">
										{paymentMessage}
									</p>
									<Button
										onClick={() => setPaymentStatus('')}
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

				{/* Main Payment Form */}
				{paymentStatus === '' && (
					<div className="space-y-8">
						{/* Student Information Display */}
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<User className="h-5 w-5" />
									Student Information
								</CardTitle>
								<CardDescription>Confirm your details below</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex gap-4 items-start border border-gray-200/70 p-4 rounded-xl bg-muted/40 dark:border-gray-800/70">
									<Avatar className="w-16 h-16 ring-2 ring-primary/20">
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
									<div className="flex-1">
										<h3 className="text-lg font-semibold">
											{user.firstName} {user.lastName}
										</h3>
										<p className="text-sm text-muted-foreground">
											Student ID: {user.studentId}
										</p>
										<p className="text-sm text-muted-foreground">
											Class: {user.className || 'Grade 9'}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Payment Form */}
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CreditCard className="h-5 w-5" />
									Payment Details
								</CardTitle>
								<CardDescription>
									Select the payment type and complete the form
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Payment Type */}
								<div>
									<label className="block text-sm font-medium mb-2">
										Payment Type
									</label>
									<select
										value={paymentType}
										onChange={(e) => {
											const selected = e.target.value;
											setPaymentType(selected);
											// Auto-populate amount if available in user outstanding fees
											if (
												user?.outstandingFees &&
												user.outstandingFees[selected]
											) {
												setAmount(user.outstandingFees[selected].toFixed(2));
											} else {
												setAmount('');
											}
										}}
										className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
									>
										<option value="">Select a payment type</option>
										{paymentTypes.map((type) => (
											<option key={type.value} value={type.value}>
												{type.label}
											</option>
										))}
									</select>
								</div>

								{/* Payment Method */}
								{paymentType && (
									<div>
										<label className="block text-sm font-medium mb-2">
											Payment Method
										</label>
										<select
											value={paymentMethod}
											onChange={(e) => setPaymentMethod(e.target.value)}
											className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
										>
											<option value="">Choose a payment method</option>
											<option value="orange">Orange Money</option>
											<option value="lonester">Lonester Mobile Money</option>
										</select>
									</div>
								)}

								{/* Phone Number and Amount */}
								{paymentMethod && (
									<>
										<div>
											<label className="block text-sm font-medium mb-2">
												<Phone className="h-4 w-4 inline mr-1" />
												Phone Number
											</label>
											<input
												type="tel"
												value={phoneNumber}
												onChange={(e) => setPhoneNumber(e.target.value)}
												placeholder="e.g. +231 77 123 4567"
												className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
											/>
											<p className="text-xs text-muted-foreground mt-1">
												Enter the phone number linked to your{' '}
												{paymentMethod === 'orange'
													? 'Orange Money'
													: 'Lonester Mobile Money'}{' '}
												account
											</p>
										</div>

										<div>
											<label className="block text-sm font-medium mb-2">
												Amount (LRD)
											</label>
											<input
												type="number"
												value={amount}
												onChange={(e) => setAmount(e.target.value)}
												placeholder="e.g. 250.00"
												step="0.01"
												min="0"
												className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
											/>
										</div>
									</>
								)}

								{/* Submit Button */}
								{paymentMethod && phoneNumber && amount && (
									<div className="pt-4">
										<div className="bg-muted/50 p-4 rounded-lg mb-4">
												<h4 className="font-medium mb-2">Payment Summary</h4>
												<div className="text-sm space-y-1">
													<p>
														<span className="text-muted-foreground">Type:</span>{' '}
													{
														paymentTypes.find((t) => t.value === paymentType)
															?.label
													}
													</p>
													<p>
														<span className="text-muted-foreground">Amount:</span>{' '}
														{formatAmount(amount)}
													</p>
													<p>
														<span className="text-muted-foreground">Method:</span>{' '}
														{paymentMethod === 'orange'
															? 'Orange Money'
														: 'Lonester Mobile Money'}
												</p>
												<p>
													<span className="text-muted-foreground">Phone:</span>{' '}
													{phoneNumber}
												</p>
											</div>
										</div>

										<Button
											onClick={handlePayment}
											disabled={isProcessing}
											className="w-full"
										>
											{isProcessing ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													Processing Payment...
												</>
											) : (
												<>
													<CreditCard className="h-4 w-4 mr-2" />
													Pay {formatAmount(amount || 0)} via{' '}
													{paymentMethod === 'orange'
														? 'Orange Money'
														: 'Lonester Mobile Money'}
												</>
											)}
										</Button>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
