'use client';
import React, { useMemo, useState, useEffect } from 'react';
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
import {
	resolveStudentFeeGroups,
	resolveStudentGroupIds,
	resolveResolvedScheduledFees,
	resolveFeeInstallmentAmounts,
} from '@/utils/resolveStudentFeeGroup';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import {
	applyScholarshipsToFees,
	resolveStudentScholarshipDefinitions,
} from '@/utils/scholarshipBilling';
import { resolveChildView } from '@/utils/childView';
import type { PaymentRecords } from '@/types';
import {
	Loader2,
	AlertCircle,
	Wallet,
	User,
	Phone,
	Sparkles,
	CheckCircle,
} from 'lucide-react';

const formatCurrency = (value: number) =>
	value.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const formatNumberInput = (value: string): string => {
	const stripped = value.replace(/,/g, '');
	const filtered = stripped.replace(/[^\d.]/g, '');
	const dotIndex = filtered.indexOf('.');
	if (dotIndex !== -1) {
		const before = filtered.slice(0, dotIndex + 1);
		const after = filtered.slice(dotIndex + 1).replace(/\./g, '');
		return before + after;
	}
	return filtered;
};

const displayWithCommas = (value: string): string => {
	if (!value) return '';
	const parts = value.split('.');
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return parts.join('.');
};

interface SelectedItem {
	key: string;
	label: string;
	feeId: string;
	categoryName: string;
	amount: number;
	currency: string;
	installmentId?: string;
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
	const [payInFullMap, setPayInFullMap] = useState<Record<string, boolean>>({});
	const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
	const [installmentTargets, setInstallmentTargets] = useState<Record<string, string>>({});
	const [amountError, setAmountError] = useState<string | null>(null);

	const currentAcademicYear = useMemo(() => {
		if (!school) return '';
		return getCurrentAcademicYearFromSchoolProfile(school);
	}, [school]);

	const studentGroupIds = useMemo(() => {
		if (!user || !school) return [] as string[];
		const groups = school.financialConfig?.studentGroups ?? [];
		return resolveStudentGroupIds(user, groups);
	}, [user, school]);

	const feeGroups = useMemo(() => {
		if (!user || !school) return [];
		return resolveStudentFeeGroups(
			(user as any).classId,
			school,
			currentAcademicYear,
		);
	}, [user, school, currentAcademicYear]);

	const allResolvedFees = useMemo(() => {
		if (!school) return [];
		const resolved: Array<{
			feeKey: string;
			feeId: string;
			feeName: string;
			categoryId: string;
			categoryName: string;
			amount: number;
			currency: string;
			groupName: string;
			installments: { installmentId: string; label: string; amount: number }[];
			scholarshipId?: string;
		}> = [];
		let feeIdx = 0;
		for (const { feeGroup } of feeGroups) {
			const rsf = resolveResolvedScheduledFees(feeGroup, school, studentGroupIds);
			for (const rf of rsf) {
				resolved.push({
					feeKey: `${feeGroup.id}-${rf.scheduledFee.feeId}-${feeIdx}`,
					feeId: rf.scheduledFee.feeId,
					feeName: rf.feeDefinition?.name || rf.scheduledFee.feeId,
					categoryId: rf.feeDefinition?.category || '',
					categoryName: rf.categoryName,
					amount: rf.scheduledFee.amount.amount,
					currency: rf.scheduledFee.amount.currency,
					groupName: feeGroup.name,
					installments: resolveFeeInstallmentAmounts(
						rf.scheduledFee,
						rf.installmentCatalog,
						rf.scheduledFee.amount.amount,
					),
					scholarshipId: (rf.scheduledFee as any).scholarshipId || undefined,
				});
				feeIdx++;
			}
		}
		return resolved;
	}, [feeGroups, school, studentGroupIds]);

	const childView = useMemo(() => resolveChildView(user), [user]);

	const feeSchedule = useMemo(() => {
		if (!school?.financialConfig?.feeSchedules) return null;
		return (
			school.financialConfig.feeSchedules.find(
				(s) => s.academicYear === currentAcademicYear,
			) || null
		);
	}, [school, currentAcademicYear]);

	const scholarships = useMemo(() => {
		if (!school) return [];
		return resolveStudentScholarshipDefinitions(
			{ scholarships: childView.scholarships },
			school,
			currentAcademicYear,
		);
	}, [school, childView.scholarships, currentAcademicYear]);

	const adjustedFees = useMemo(
		() =>
			applyScholarshipsToFees(
				allResolvedFees,
				scholarships,
				feeSchedule?.scholarships ?? [],
			),
		[allResolvedFees, scholarships, feeSchedule],
	);

	const groupedByCategory = useMemo(() => {
		const groups: Record<string, typeof adjustedFees> = {};
		for (const fee of adjustedFees) {
			const key = fee.categoryName;
			if (!groups[key]) groups[key] = [];
			groups[key].push(fee);
		}
		return groups;
	}, [adjustedFees]);

	const paidByFeeName = useMemo(() => {
		const records = (user as any)?.payments || [];
		const map: Record<string, number> = {};
		for (const r of records) {
			const cur = r.currency || 'LRD';
			const key = r.feeType && r.feeType !== 'fee'
				? `${r.feeType}::${cur}`
				: `${r.category}::${cur}`;
			map[key] = (map[key] || 0) + r.paymentAmount;
		}
		return map;
	}, [user]);

	useEffect(() => {
		if (user?.role !== 'parent') return;
		let cancelled = false;
		const load = async () => {
			try {
				const url =
					user?.role === 'parent' && childView.studentId
						? `/api/payments?studentId=${encodeURIComponent(childView.studentId)}`
						: '/api/payments';
				const res = await fetch(url);
				const json = await res.json();
				if (!res.ok || cancelled) return;
				const { payments: freshPayments } = json.data;
				if (Array.isArray(freshPayments)) {
					const currentUser = useAuth.getState().user;
					if (currentUser) {
						const updated = { ...currentUser, payments: freshPayments };
						useAuth.setState({ user: updated });
					}
				}
			} catch {
				// Swallow load errors; the fee list still renders.
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [user?.role, (user as any)?.studentId]);

	const selectedCurrency = useMemo(() => {
		return selected.length > 0 ? selected[0].currency || 'LRD' : null;
	}, [selected]);

	const toggleItem = (item: SelectedItem) => {
		const paid = paidByFeeName[`${item.label}::${item.currency}`] || 0;
		if (paid >= item.amount) return;

		const exists = selected.some((s) => s.key === item.key);
		if (exists) {
			setSelected((prev) => prev.filter((s) => s.key !== item.key));
			setCustomAmounts((prev) => {
				const { [item.key]: _, ...rest } = prev;
				return rest;
			});
			setPayInFullMap((prev) => {
				const { [item.key]: _, ...rest } = prev;
				return rest;
			});
		} else {
			const itemCurrency = item.currency || 'LRD';
			if (selectedCurrency && selectedCurrency !== itemCurrency) {
				return;
			}
			const outstanding = Math.max(0, item.amount - paid);
			const installmentId = installmentTargets[item.key] || undefined;
			setSelected((prev) => [...prev, { ...item, amount: outstanding, installmentId }]);
			setPayInFullMap((prev) => ({ ...prev, [item.key]: true }));
		}
	};

	const handleItemPayInFullChange = (key: string, value: boolean) => {
		setPayInFullMap((prev) => ({ ...prev, [key]: value }));
		setAmountError(null);
		const fee = adjustedFees.find((f) => f.feeKey === key);
		if (value) {
			const paid = fee ? paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0 : 0;
			const outstanding = fee ? Math.max(0, fee.effectiveAmount - paid) : 0;
			setSelected((prev) =>
				prev.map((s) => (s.key === key ? { ...s, amount: outstanding } : s)),
			);
			setCustomAmounts((prev) => {
				const { [key]: _, ...rest } = prev;
				return rest;
			});
		} else {
			setSelected((prev) =>
				prev.map((s) => (s.key === key ? { ...s, amount: 0 } : s)),
			);
		}
	};

	const handleCustomAmountChange = (key: string, raw: string) => {
		const clean = formatNumberInput(raw);
		setCustomAmounts((prev) => ({ ...prev, [key]: clean }));
		const parsed = parseFloat(clean);
		if (!isNaN(parsed)) {
			setSelected((prev) =>
				prev.map((s) => (s.key === key ? { ...s, amount: parsed } : s)),
			);
		}
	};

	const selectedByCurrency = useMemo(() => {
		const map: Record<string, number> = {};
		for (const s of selected) {
			const c = s.currency || 'LRD';
			map[c] = (map[c] || 0) + s.amount;
		}
		return map;
	}, [selected]);

	const handlePayment = async () => {
		if (!user || selected.length === 0 || !paymentMethod || !phoneNumber) {
			alert('Please select at least one fee item and fill in all fields');
			return;
		}

		setAmountError(null);

		for (const item of selected) {
			if (payInFullMap[item.key]) continue;
			const raw = customAmounts[item.key] || '';
			const parsed = parseFloat(raw);
			if (!raw || isNaN(parsed) || parsed <= 0) {
				setAmountError(`Please enter a valid payment amount for ${item.label}`);
				return;
			}
			const fee = adjustedFees.find((f) => f.feeKey === item.key);
			if (fee) {
				const paid = paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0;
				const outstanding = fee.effectiveAmount - paid;
				if (parsed > outstanding) {
					setAmountError(
						`The amount ${item.currency} ${formatCurrency(parsed)} exceeds the outstanding balance of ${item.currency} ${formatCurrency(outstanding)} for ${item.label}`,
					);
					return;
				}
			}
		}

		setIsProcessing(true);

		const items = selected.map((item) => ({
			key: item.key,
			feeName: item.label,
			feeId: item.feeId,
			categoryName: item.categoryName,
			amount: item.amount,
			currency: item.currency,
			installmentId: item.installmentId || undefined,
		}));

		let newRecords: PaymentRecords[];

		try {
			const res = await fetch('/api/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items,
					paymentMethod,
					phoneNumber,
					paymentAcademicYear: currentAcademicYear,
				}),
			});

			const result = await res.json();

			if (!result.success) {
				setAmountError(result.message || 'Payment failed');
				setIsProcessing(false);
				return;
			}

			newRecords = result.data.payments.slice(-selected.length);

			const updatedUser = {
				...user,
				payments: result.data.payments,
			};
			setUser(updatedUser as any);
		} catch {
			setAmountError('Payment failed. Please try again.');
			setIsProcessing(false);
			return;
		}

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
		setPayInFullMap({});
		setCustomAmounts({});
		setAmountError(null);
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

	if (allResolvedFees.length === 0) {
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
										Demo payment
										{Object.entries(selectedByCurrency).map(([c, amt]) => (
											<React.Fragment key={c}>
												{' '}{c} {formatCurrency(amt)}
											</React.Fragment>
										))} has been processed.
									</p>
									<div className="mt-3 text-sm text-green-700/80 dark:text-green-200/80 space-y-1">
										{receipts.map((r) => (
											<p key={r.id}>
												{r.category}: {r.currency || 'LRD'} {formatCurrency(r.paymentAmount)} —{' '}
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
												childView.avatar ||
												user.profilePictureUrl ||
												user.avatar ||
												(user as any).profilePhoto ||
												''
											}
										/>
										<AvatarFallback>
											{childView.name.charAt(0)}
											{childView.name.split(' ')[1]?.[0] || ''}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1">
										<h3 className="text-lg font-semibold">
											{childView.name}
										</h3>
										<p className="text-sm text-muted-foreground">
											Student ID: {childView.studentId}
										</p>
										<p className="text-sm text-muted-foreground">
											Class: {childView.className || '—'}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Fee Items grouped by category */}
						<div className="space-y-6">
							{Object.entries(groupedByCategory).map(([categoryName, fees]) => (
								<Card key={categoryName} className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Wallet className="h-5 w-5" />
											{categoryName}
										</CardTitle>
										<CardDescription>
											{fees.length} fee{fees.length !== 1 ? 's' : ''} in this category
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{fees.map((fee) => {
												const paid = paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0;
												const remaining = Math.max(0, fee.effectiveAmount - paid);
												const isCleared = paid >= fee.effectiveAmount;
												const isSelected = selected.some(
													(s) => s.key === fee.feeKey,
												);
												const isCurrencyMismatch = !isCleared && selectedCurrency !== null && selectedCurrency !== (fee.currency || 'LRD');
												return (
													<label
														key={fee.feeKey}
														className={`flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors ${
															isCleared
																? 'border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20 cursor-default'
																: isCurrencyMismatch
																	? 'border-gray-100 bg-gray-50/50 dark:border-gray-800/30 dark:bg-gray-900/20 cursor-not-allowed opacity-60'
																	: isSelected
																		? 'border-primary bg-primary/5 cursor-pointer'
																		: 'hover:bg-muted/50 cursor-pointer'
														}`}
													>
														<div className="flex items-center gap-3">
															{isCleared ? (
																<CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
															) : (
																<input
																	type="checkbox"
																	checked={isSelected}
																	disabled={isCurrencyMismatch}
																	onChange={() =>
														toggleItem({
															key: fee.feeKey,
															label: fee.feeName,
															feeId: fee.feeId,
															categoryName: fee.categoryName,
															amount: fee.effectiveAmount,
															currency: fee.currency,
														})
																	}
																	className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
																/>
															)}
															<div>
																<p className="font-medium">
																	{fee.feeName}
																	{isCleared && <span className="ml-2 text-xs font-medium text-green-600">Paid</span>}
																	{isCurrencyMismatch && <span className="ml-2 text-xs text-muted-foreground">({fee.currency})</span>}
																</p>
																<p className="text-xs text-muted-foreground">
																	{fee.groupName}
																</p>
																{fee.installments.length > 0 && (
																	<select
																		value={installmentTargets[fee.feeKey] || ''}
																		onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
																		onChange={(e) => {
																			e.stopPropagation();
																			const value = e.target.value;
																			setInstallmentTargets((prev) => ({ ...prev, [fee.feeKey]: value }));
																			setSelected((prev) =>
																				prev.map((s) => (s.key === fee.feeKey ? { ...s, installmentId: value || undefined } : s)),
																			);
																		}}
																		className="mt-1 block rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] outline-none focus:border-[#465fff] dark:border-gray-800 dark:bg-muted dark:text-white"
																	>
																		<option value="">Whole fee</option>
																		{fee.installments.map((inst) => (
																			<option key={inst.installmentId} value={inst.installmentId}>
																				{inst.label} · {fee.currency} {formatCurrency(inst.amount)}
																			</option>
																		))}
																	</select>
																)}
																{fee.scholarshipNames.length > 0 && (
																	<div className="mt-0.5 flex flex-wrap items-center gap-1">
																		{fee.scholarshipNames.map((name) => (
																			<span key={name} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
																				{name}
																			</span>
																		))}
																		{fee.discount > 0 && (
																			<span className="text-xs font-medium text-primary">
																				Saved {fee.currency} {formatCurrency(fee.discount)}
																			</span>
																		)}
																	</div>
																)}
																{isCleared ? (
																	<p className="text-xs text-green-600 font-medium mt-0.5">Cleared</p>
																) : isCurrencyMismatch ? (
																	<p className="text-xs text-muted-foreground mt-0.5">Different currency — not selectable</p>
																) : paid > 0 ? (
																	<p className="text-xs text-muted-foreground mt-0.5">
																		Paid {fee.currency} {formatCurrency(paid)} / Remaining {fee.currency} {formatCurrency(remaining)}
																	</p>
																) : null}
															</div>
														</div>
														<div className="text-right shrink-0">
															{fee.discount > 0 ? (
																<>
																	<p className={`font-semibold whitespace-nowrap ${isCleared ? 'text-green-600' : 'text-primary'}`}>
																		{fee.currency} {formatCurrency(fee.effectiveAmount)}
																	</p>
																	<p className="text-xs text-muted-foreground line-through whitespace-nowrap">
																		{fee.currency} {formatCurrency(fee.amount)}
																	</p>
																</>
															) : (
																<p className={`font-semibold whitespace-nowrap ${isCleared ? 'text-green-600' : ''}`}>
																	{fee.currency} {formatCurrency(fee.effectiveAmount)}
																</p>
															)}
														</div>
													</label>
												);
											})}
										</div>
									</CardContent>
								</Card>
							))}
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

										{/* Selected Items */}
										<div className="space-y-3">
											{selected.map((item) => {
												const isFull = payInFullMap[item.key] ?? true;
												const fee = adjustedFees.find((f) => f.feeKey === item.key);
												const paid = fee ? paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0 : 0;
												const outstanding = fee ? Math.max(0, fee.effectiveAmount - paid) : 0;
												return (
													<div key={item.key} className="flex items-center justify-between gap-2">
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium truncate">{item.label}</p>
															{isFull ? (
																<p className="text-xs text-muted-foreground">
																	Outstanding: {item.currency} {formatCurrency(outstanding)}
																	{paid > 0 && (
																		<span> of {item.currency} {formatCurrency(fee?.effectiveAmount || 0)}</span>
																	)}
																</p>
															) : (
																<div className="flex items-center gap-1 mt-0.5">
																	<span className="text-xs text-muted-foreground">{item.currency}</span>
																	<input
																		type="text"
																		inputMode="decimal"
																		value={displayWithCommas(customAmounts[item.key] ?? '')}
																		onChange={(e) => handleCustomAmountChange(item.key, e.target.value)}
																		placeholder="0.00"
																		className="w-28 text-right border border-border rounded-md px-1.5 py-0.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
																	/>
																	{outstanding > 0 && (
																		<span className="text-xs text-muted-foreground whitespace-nowrap">
																			/ {formatCurrency(outstanding)}
																		</span>
																	)}
																</div>
															)}
														</div>
														<button
															type="button"
															role="switch"
															aria-checked={isFull}
															onClick={() => handleItemPayInFullChange(item.key, !isFull)}
															className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
																isFull
																	? 'bg-primary'
																	: 'bg-gray-300 dark:bg-gray-600'
															}`}
														>
															<span
																className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
																	isFull ? 'translate-x-[18px]' : 'translate-x-0.5'
																}`}
															/>
														</button>
													</div>
												);
											})}
											<div className="border-t pt-2 mt-2 flex justify-between font-semibold">
												<span>Total</span>
												<span className="text-right">
													{Object.entries(selectedByCurrency).map(([c, amt]) => (
														<span key={c} className="block whitespace-nowrap">{c} {formatCurrency(amt)}</span>
													))}
												</span>
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

									{amountError && (
										<div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
											<p className="text-sm text-red-700 dark:text-red-300">{amountError}</p>
										</div>
									)}

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
												<Wallet className="h-4 w-4 mr-2 shrink-0" />
												<span className="truncate">
													Pay {Object.entries(selectedByCurrency).map(([c, amt]) => (
														<span key={c}>{c} {formatCurrency(amt)} </span>
													))}via {paymentMethod === 'orange'
														? 'Orange Money'
														: 'Lonester Mobile Money'}
												</span>
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
