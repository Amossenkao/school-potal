'use client';
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import { resolveStudentFeeGroup } from '@/utils/resolveStudentFeeGroup';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import type { FeeDefinition, PaymentPlan, PaymentCategory, ScheduledFee } from '@/types/schoolProfile';
import type { PaymentRecords } from '@/types';
import {
	Loader2,
	AlertCircle,
	BookOpen,
	FileText,
	Wallet,
	User,
	Phone,
	Sparkles,
	Gift,
	CheckCircle,
} from 'lucide-react';

const formatCurrency = (value: number) =>
	value.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

interface SelectedItem {
	type: 'fee';
	key: string;
	label: string;
	amount: number;
	currency: string;
}

interface ResolvedFee {
	scheduledFee: ScheduledFee;
	feeDefinition: FeeDefinition | undefined;
	categoryName: string;
	installmentLabel: string | null;
}

export default function PayFees() {
	const { user, isLoading, setUser } = useAuth();
	const school = useSchoolStore((s) => s.school);

	const [selected, setSelected] = useState<SelectedItem[]>([]);
	const [paymentMethod, setPaymentMethod] = useState('');
	const [phoneNumber, setPhoneNumber] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success'>('idle');
	const [receipts, setReceipts] = useState<PaymentRecords[]>([]);

	const feeDefinitions = useMemo(
		() => school?.financialConfig?.feeDefinitions ?? [],
		[school],
	);

	const paymentPlans = useMemo(
		() => school?.financialConfig?.paymentPlans ?? [],
		[school],
	);

	const paymentCategories = useMemo(
		() => school?.financialConfig?.paymentCategories ?? [],
		[school],
	);

	const resolved = useMemo(() => {
		if (!user || !school) return null;
		const academicYear = getCurrentAcademicYearFromSchoolProfile(school);
		return resolveStudentFeeGroup(
			(user as any).classId,
			school,
			academicYear,
		);
	}, [user, school]);

	const resolvedFees = useMemo((): ResolvedFee[] => {
		if (!resolved) return [];
		const { feeGroup } = resolved;
		const plan = paymentPlans.find((p) => p.id === feeGroup.paymentPlanId);
		return feeGroup.scheduledFees.map((sf) => {
			const feeDef = feeDefinitions.find((fd) => fd.id === sf.feeId);
			const cat = paymentCategories.find((c) => c.id === feeDef?.category);
			const installment = sf.dueInstallmentId && plan
				? plan.installments.find((i) => i.id === sf.dueInstallmentId)
				: null;
			return {
				scheduledFee: sf,
				feeDefinition: feeDef,
				categoryName: cat?.name || feeDef?.category || 'Other',
				installmentLabel: installment?.label ?? null,
			};
		});
	}, [resolved, feeDefinitions, paymentPlans, paymentCategories]);

	const groupedFees = useMemo(() => {
		const groups: Record<string, ResolvedFee[]> = {};
		for (const rf of resolvedFees) {
			const key = rf.categoryName;
			if (!groups[key]) groups[key] = [];
			groups[key].push(rf);
		}
		return groups;
	}, [resolvedFees]);

	const currentAcademicYear = useMemo(() => {
		if (!school) return '';
		return getCurrentAcademicYearFromSchoolProfile(school);
	}, [school]);

	const toggleItem = (item: SelectedItem) => {
		setSelected((prev) => {
			const exists = prev.find((s) => s.key === item.key);
			if (exists) return prev.filter((s) => s.key !== item.key);
			return [...prev, item];
		});
	};

	const totalSelected = selected.reduce((sum, s) => sum + s.amount, 0);

	const handlePayment = async () => {
		if (!user || selected.length === 0 || !paymentMethod || !phoneNumber) {
			alert('Please select at least one fee item and fill in all fields');
			return;
		}

		setIsProcessing(true);

		await new Promise((r) => setTimeout(r, 1500));

		const now = new Date();
		const newRecords: PaymentRecords[] = selected.map((item) => ({
			id: `DEMO-${Date.now()}-${item.key}`,
			receiptNumber: `RCP-${Date.now()}-${item.key}`,
			paidBy: `${user.firstName} ${user.lastName}`,
			feeType: item.type,
			category: item.label,
			paymentAmount: item.amount,
			paymentAcademicYear: currentAcademicYear,
			paymentDate: now.toISOString().split('T')[0],
			paymentTime: now.toLocaleTimeString(),
		}));

		const updatedUser = {
			...user,
			financialProfile: {
				...(user as any).financialProfile,
				paymentRecords: [
					...((user as any).financialProfile?.paymentRecords || []),
					...newRecords,
				],
			},
		};
		setUser(updatedUser as any);

		setReceipts(newRecords);
		setPaymentStatus('success');
		setIsProcessing(false);
	};

	const resetForm = () => {
		setPaymentStatus('idle');
		setSelected([]);
		setPaymentMethod('');
		setPhoneNumber('');
		setReceipts([]);
	};

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

	if (!resolved) {
		return (
			<div className="min-h-screen bg-background">
				<div className="w-full px-4 sm:px-6 lg:px-8 py-8">
					<div className="mb-8 rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/70">
						<h1 className="text-3xl sm:text-4xl font-bold mb-2">
							Make Payment
						</h1>
						<p className="text-lg text-muted-foreground">
							Pay tuition, registration, or other fees in seconds
						</p>
					</div>
					<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
						<CardContent className="p-6 text-center">
							<AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
							<h3 className="text-lg font-semibold mb-2">No Fee Schedule Found</h3>
							<p className="text-muted-foreground">
								No fee schedule is available for your class and the current academic year.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="w-full px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8 rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/70">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h1 className="text-3xl sm:text-4xl font-bold mb-2">
								Make Payment
							</h1>
							<p className="text-lg text-muted-foreground">
								Select the fees you want to pay and complete your payment
							</p>
						</div>
						<div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm dark:border-gray-800/80 dark:bg-gray-900/70 dark:text-gray-300">
							<Sparkles className="h-3 w-3" />
							Demo Payment
						</div>
					</div>
				</div>

				{/* Success State */}
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
										Demo payment of {formatCurrency(totalSelected)} has been
										processed.
									</p>
									<div className="mt-3 text-sm text-green-700/80 dark:text-green-200/80 space-y-1">
										{receipts.map((r) => (
											<p key={r.id}>
												{r.category}: {formatCurrency(r.paymentAmount)} —{' '}
												{r.receiptNumber}
											</p>
										))}
									</div>
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

				{/* Payment Form */}
				{paymentStatus === 'idle' && (
					<div className="space-y-8">
						{/* Student Info */}
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
											Student ID: {(user as any).studentId || user.id}
										</p>
										<p className="text-sm text-muted-foreground">
											Class: {(user as any).className || '—'}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Fee Items grouped by category */}
						<div className="space-y-6">
							{Object.entries(groupedFees).map(([categoryName, fees]) => (
								<Card key={categoryName} className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<FileText className="h-5 w-5" />
											{categoryName}
										</CardTitle>
										<CardDescription>
											{fees.length} fee{fees.length !== 1 ? 's' : ''} in this category
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{fees.map((rf, idx) => {
												const isSelected = selected.some(
													(s) => s.key === `${rf.scheduledFee.feeId}-${idx}`,
												);
												return (
													<label
														key={`${rf.scheduledFee.feeId}-${idx}`}
														className={`flex items-center justify-between gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
															isSelected
																? 'border-primary bg-primary/5'
																: 'hover:bg-muted/50'
														}`}
													>
														<div className="flex items-center gap-3">
															<input
																type="checkbox"
																checked={isSelected}
																onChange={() =>
																	toggleItem({
																		type: 'fee',
																		key: `${rf.scheduledFee.feeId}-${idx}`,
																		label: rf.feeDefinition?.name || rf.scheduledFee.feeId,
																		amount: rf.scheduledFee.amount.amount,
																		currency: rf.scheduledFee.amount.currency,
																	})
																}
																className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
															/>
															<div>
																<p className="font-medium">
																	{rf.feeDefinition?.name || rf.scheduledFee.feeId}
																</p>
																<div className="flex items-center gap-2 text-xs text-muted-foreground">
																	{rf.scheduledFee.isRequired ? (
																		<span className="text-amber-600 dark:text-amber-400 font-medium">Required</span>
																	) : (
																		<span className="text-green-600 dark:text-green-400 font-medium">Optional</span>
																	)}
																	{rf.installmentLabel && (
																		<span>Due: {rf.installmentLabel}</span>
																	)}
																	{rf.feeDefinition?.flag && (
																		<span>· {rf.feeDefinition.flag}</span>
																	)}
																</div>
															</div>
														</div>
														<p className="font-semibold whitespace-nowrap">
															{rf.scheduledFee.amount.currency} {formatCurrency(rf.scheduledFee.amount.amount)}
														</p>
													</label>
												);
											})}
										</div>
									</CardContent>
								</Card>
							))}

							{resolvedFees.length === 0 && (
								<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
									<CardContent className="p-6 text-center">
										<AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
										<h3 className="text-lg font-semibold mb-2">No Fees Available</h3>
										<p className="text-muted-foreground">
											There are no scheduled fees for your class in this fee schedule.
										</p>
									</CardContent>
								</Card>
							)}
						</div>

						{/* Payment Method & Phone */}
						{selected.length > 0 && (
							<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Wallet className="h-5 w-5" />
										Payment Details
									</CardTitle>
									<CardDescription>
										Choose your payment method and enter your phone number
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
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

									{paymentMethod && (
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
									)}
								</CardContent>
							</Card>
						)}

						{/* Summary & Submit */}
						{selected.length > 0 && paymentMethod && phoneNumber && (
							<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
								<CardContent className="p-6">
									<div className="bg-muted/50 p-4 rounded-lg mb-4">
										<h4 className="font-medium mb-3">Payment Summary</h4>
										<div className="space-y-2">
											{selected.map((item) => (
												<div
													key={item.key}
													className="flex justify-between text-sm"
												>
													<span className="text-muted-foreground">
														{item.label}
													</span>
													<span className="font-medium">
														{item.currency} {formatCurrency(item.amount)}
													</span>
												</div>
											))}
											<div className="border-t pt-2 mt-2 flex justify-between font-semibold">
												<span>Total</span>
												<span>{selected[0]?.currency || ''} {formatCurrency(totalSelected)}</span>
											</div>
										</div>
										<div className="text-sm mt-3 space-y-1">
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
												<Wallet className="h-4 w-4 mr-2" />
												Pay {selected[0]?.currency || ''} {formatCurrency(totalSelected)} via{' '}
												{paymentMethod === 'orange'
													? 'Orange Money'
													: 'Lonester Mobile Money'}
											</>
										)}
									</Button>
								</CardContent>
							</Card>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
