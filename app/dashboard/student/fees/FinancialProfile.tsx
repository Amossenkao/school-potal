'use client';
import React, { useMemo, useState, useEffect } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
	Loader2,
	AlertCircle,
	BookOpen,
	TrendingUp,
	TrendingDown,
	Wallet,
	RefreshCw,
	ChevronDown,
	CalendarClock,
} from 'lucide-react';
import isEqual from 'lodash/isEqual';

const formatCurrency = (value: number) =>
	value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type CurrencyMap = Record<string, number>;

const sumByCurrency = (items: Array<{ amount: number; currency: string }>): CurrencyMap => {
	const map: CurrencyMap = {};
	for (const item of items) {
		const c = item.currency || 'LRD';
		map[c] = (map[c] || 0) + item.amount;
	}
	return map;
};

const CurrencyLines = ({ amounts }: { amounts: CurrencyMap }) => (
	<>
		{Object.entries(amounts).map(([currency, value]) => (
			<span key={currency} className="block">
				{currency} {formatCurrency(value)}
			</span>
		))}
	</>
);

export default function FinancialProfile() {
	const { user, isLoading } = useAuth();
	const school = useSchoolStore((s) => s.school);

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
		const academicYear = currentAcademicYear;
		return resolveStudentFeeGroups(
			(user as any).classId,
			school,
			academicYear,
		);
	}, [user, school, currentAcademicYear]);

	const allResolvedFees = useMemo(() => {
		if (!school) return [];
		const results: Array<{
			sessionName: string;
			groupName: string;
			feeName: string;
			categoryId: string;
			categoryName: string;
			amount: number;
			currency: string;
			isRequired: boolean;
			installments: { installmentId: string; label: string; amount: number }[];
			scholarshipId?: string;
		}> = [];

		for (const { sessionName, feeGroup } of feeGroups) {
			const rsf = resolveResolvedScheduledFees(feeGroup, school, studentGroupIds);
			for (const rf of rsf) {
				results.push({
					sessionName,
					groupName: feeGroup.name,
					feeName: rf.feeDefinition?.name || rf.scheduledFee.feeId,
					categoryId: rf.feeDefinition?.category || '',
					categoryName: rf.categoryName,
					amount: rf.scheduledFee.amount.amount,
					currency: rf.scheduledFee.amount.currency,
					isRequired: rf.scheduledFee.isRequired,
					installments: resolveFeeInstallmentAmounts(
						rf.scheduledFee,
						rf.installmentCatalog,
						rf.scheduledFee.amount.amount,
					),
					scholarshipId: (rf.scheduledFee as any).scholarshipId || undefined,
				});
			}
		}
		return results;
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

	const totalsByCurrency = useMemo(() => {
		const dueMap: CurrencyMap = {};
		const requiredMap: CurrencyMap = {};
		for (const fee of adjustedFees) {
			const c = fee.currency || 'LRD';
			dueMap[c] = (dueMap[c] || 0) + fee.effectiveAmount;
			if (fee.isRequired) {
				requiredMap[c] = (requiredMap[c] || 0) + fee.effectiveAmount;
			}
		}
		const paidRecords = (user as any)?.payments || [];
		const paidMap = sumByCurrency(paidRecords.map((r: any) => ({ amount: r.paymentAmount, currency: r.currency || 'LRD' })));
		const allCurrencies = [...new Set([...Object.keys(dueMap), ...Object.keys(paidMap)])];
		const result: Record<string, { totalDue: number; requiredFees: number; optionalFees: number; paid: number; balance: number }> = {};
		for (const c of allCurrencies) {
			const due = dueMap[c] || 0;
			const paid = paidMap[c] || 0;
			result[c] = {
				totalDue: due,
				requiredFees: requiredMap[c] || 0,
				optionalFees: due - (requiredMap[c] || 0),
				paid,
				balance: due - paid,
			};
		}
		return result;
	}, [adjustedFees, user]);

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

	const groupedByCategory = useMemo(() => {
		const groups: Record<string, typeof adjustedFees> = {};
		for (const fee of adjustedFees) {
			const key = fee.categoryName;
			if (!groups[key]) groups[key] = [];
			groups[key].push(fee);
		}
		return groups;
	}, [adjustedFees]);

	const categoryTotals = useMemo(() => {
		const result: Record<string, { total: CurrencyMap; paid: CurrencyMap }> = {};
		for (const [categoryName, fees] of Object.entries(groupedByCategory)) {
			const total: CurrencyMap = {};
			const paid: CurrencyMap = {};
			for (const fee of fees) {
				const c = fee.currency || 'LRD';
				const paidAmt = paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0;
				const remaining = Math.max(0, fee.effectiveAmount - paidAmt);
				if (remaining > 0) {
					total[c] = (total[c] || 0) + fee.effectiveAmount;
					paid[c] = (paid[c] || 0) + paidAmt;
				}
			}
			result[categoryName] = { total, paid };
		}
		return result;
	}, [groupedByCategory, paidByFeeName]);

	const installmentCatalog = useMemo(
		() => school?.financialConfig?.installments ?? [],
		[school],
	);

	const installmentSummary = useMemo(() => {
		const due: Record<string, CurrencyMap> = {};
		const paid: Record<string, CurrencyMap> = {};
		const payments = (user as any)?.payments || [];
		for (const fee of adjustedFees) {
			const c = fee.currency || 'LRD';
			for (const s of fee.installments) {
				if (!due[s.installmentId]) due[s.installmentId] = {};
				const ratio = fee.amount > 0 ? s.amount / fee.amount : 0;
				due[s.installmentId][c] = (due[s.installmentId][c] || 0) + fee.effectiveAmount * ratio;
			}
		}
		for (const r of payments) {
			if (!r.installmentId) continue;
			const cur = r.currency || 'LRD';
			if (!paid[r.installmentId]) paid[r.installmentId] = {};
			paid[r.installmentId][cur] = (paid[r.installmentId][cur] || 0) + (r.paymentAmount || 0);
		}
		return { due, paid };
	}, [adjustedFees, user]);

	// Installments with at least one currency where (due - paid) > 0
	const visibleInstallments = useMemo(() => {
		return installmentCatalog.filter((inst) => {
			const due = installmentSummary.due[inst.id] || {};
			const paid = installmentSummary.paid[inst.id] || {};
			const currencies = [
				...new Set([...Object.keys(due), ...Object.keys(paid)]),
			];
			if (currencies.length === 0) return false;
			return currencies.some((c) => (due[c] || 0) - (paid[c] || 0) > 0);
		});
	}, [installmentCatalog, installmentSummary]);

	const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

	const toggleCategory = (categoryName: string) =>
		setOpenCategories((prev) => ({ ...prev, [categoryName]: !prev[categoryName] }));

	const studentType: 'new' | 'old' = childView.studentType ?? 'old';
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Parents load the selected child's payments on mount / child switch
	useEffect(() => {
		if (user?.role !== 'parent') return;
		refreshFinancialProfile();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.role, (user as any)?.studentId]);

	const refreshFinancialProfile = async () => {
		setIsRefreshing(true);
		try {
			const url =
				user?.role === 'parent' && childView.studentId
					? `/api/payments?studentId=${encodeURIComponent(childView.studentId)}`
					: '/api/payments';
			const res = await fetch(url);
			const json = await res.json();
			if (!res.ok) throw new Error(json.message || 'Failed to refresh');
			const { payments: freshPayments, school: freshSchool } = json.data;

			const currentUser = useAuth.getState().user;
			if (currentUser && Array.isArray(freshPayments)) {
				const updated = { ...currentUser, payments: freshPayments };
				useAuth.setState({ user: updated });
			}

			const currentSchool = useSchoolStore.getState().school;
			if (freshSchool && !isEqual(currentSchool, freshSchool)) {
				useSchoolStore.getState().setSchool(freshSchool);
			}
		} catch (e: any) {
			console.error('Refresh failed', e);
		} finally {
			setIsRefreshing(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
					<p className="text-muted-foreground">Loading financial profile...</p>
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
					</CardContent>
				</Card>
			</div>
		);
	}

	if (allResolvedFees.length === 0) {
		return (
			<div className="min-h-screen bg-background">
				<div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
					<div className="mb-8 rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/70">
						<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
							Financial Profile
						</h1>
						<p className="text-base sm:text-lg text-muted-foreground">
							View your fee balances and payment summary
						</p>
					</div>
					<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
						<CardContent className="p-4 sm:p-6 text-center">
							<AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
							<h3 className="text-lg font-semibold mb-2">No Fees Found</h3>
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
			<div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
				{/* Header */}
				<div className="mb-6 sm:mb-8 rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-6 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/70">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0">
							<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">
								Financial Profile
							</h1>
							<p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
								View your fee balances and payment summary
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm dark:border-gray-800/80 dark:bg-gray-900/70 dark:text-gray-300">
								<Wallet className="h-3 w-3" />
								{feeGroups.length} fee group{feeGroups.length !== 1 ? 's' : ''}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={refreshFinancialProfile}
								disabled={isRefreshing}
							>
								<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
							</Button>
						</div>
					</div>
				</div>

				<div className="space-y-8">
					{/* Student Info */}
					<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
						<CardHeader className="pb-3 sm:pb-6">
							<CardTitle className="text-base sm:text-lg">Student Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex gap-3 sm:gap-4 items-start border border-gray-200/70 p-3 sm:p-4 rounded-xl bg-muted/40 dark:border-gray-800/70">
								<Avatar className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 ring-2 ring-primary/20">
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
								<div className="flex-1 min-w-0">
									<h3 className="text-base sm:text-lg font-semibold truncate">
										{childView.name}
									</h3>
									<p className="text-xs sm:text-sm text-muted-foreground break-words">
										Student ID: {childView.studentId}
									</p>
									<p className="text-xs sm:text-sm text-muted-foreground">
										Class: {childView.className || '—'}
									</p>
									<p className="text-xs sm:text-sm text-muted-foreground">
										Student Type: {studentType === 'new' ? 'New Student' : 'Old Student'}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Summary Cards */}
					<div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader className="pb-2">
								<CardDescription>Total Due</CardDescription>
								<CardTitle className="flex flex-col items-start gap-1 text-amber-600 dark:text-amber-400">
									<TrendingDown className="h-5 w-5 shrink-0" />
									<CurrencyLines amounts={Object.fromEntries(
										Object.entries(totalsByCurrency).map(([c, t]) => [c, t.totalDue])
									)} />
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Fees for the current academic year
								</p>
							</CardContent>
						</Card>

						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader className="pb-2">
								<CardDescription>Total Paid</CardDescription>
								<CardTitle className="flex flex-col items-start gap-1 text-green-600 dark:text-green-400">
									<TrendingUp className="h-5 w-5 shrink-0" />
									<CurrencyLines amounts={Object.fromEntries(
										Object.entries(totalsByCurrency).map(([c, t]) => [c, t.paid])
									)} />
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Amount paid towards fees
								</p>
							</CardContent>
						</Card>

						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70 sm:col-span-2 lg:col-span-1">
							<CardHeader className="pb-2">
								<CardDescription>Outstanding Balance</CardDescription>
								<CardTitle className="flex flex-col items-start gap-1 text-red-600 dark:text-red-400">
									<Wallet className="h-5 w-5 shrink-0" />
									<CurrencyLines amounts={Object.fromEntries(
										Object.entries(totalsByCurrency).map(([c, t]) => [c, t.balance])
									)} />
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Remaining amount to be paid
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Installments — only show if at least one has an outstanding balance */}
					{visibleInstallments.length > 0 && (
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader className="pb-3 sm:pb-6">
								<CardTitle className="flex items-center gap-2 text-base sm:text-lg">
									<CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
									Installments
								</CardTitle>
								<CardDescription>
									Payment breakdown by school-defined installment
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 sm:space-y-3">
									{visibleInstallments.map((inst) => {
										const due = installmentSummary.due[inst.id] || {};
										const paid = installmentSummary.paid[inst.id] || {};
										const currencies = [
											...new Set([...Object.keys(due), ...Object.keys(paid)]),
										].filter((c) => (due[c] || 0) - (paid[c] || 0) > 0);
										return (
											<div
												key={inst.id}
												className="flex flex-col gap-2 rounded-lg border p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
											>
												<div className="min-w-0">
													<p className="break-words font-medium text-sm sm:text-base">{inst.label}</p>
													{inst.dueWindow && (
														<p className="mt-0.5 text-xs text-muted-foreground">{inst.dueWindow}</p>
													)}
												</div>
												<div className="shrink-0 text-left sm:text-right">
													{currencies.map((c) => {
														const dueVal = due[c] || 0;
														const paidVal = paid[c] || 0;
														const outstanding = dueVal - paidVal;
														return (
															<p key={c} className="text-sm">
																<span className="font-semibold">
																	{c} {formatCurrency(outstanding)}
																</span>
																<span className="text-muted-foreground"> outstanding</span>
																{paidVal > 0 && (
																	<span className="text-muted-foreground">
																		{' '}· Paid {c} {formatCurrency(paidVal)}
																	</span>
																)}
															</p>
														);
													})}
												</div>
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Fees by Category */}
					{Object.entries(groupedByCategory).map(([categoryName, fees]) => {
						// Only show fees that have an outstanding balance
						const unpaidFees = fees.filter((fee) => {
							const paid =
								paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0;
							return Math.max(0, fee.effectiveAmount - paid) > 0;
						});

						// Skip the entire category card if there's nothing due
						if (unpaidFees.length === 0) return null;

						const isOpen = openCategories[categoryName] ?? false;
						const totals = categoryTotals[categoryName] || { total: {}, paid: {} };
						return (
							<Card key={categoryName} className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
								<CardHeader className="pb-3 sm:pb-6">
									<div
										role="button"
										tabIndex={0}
										aria-expanded={isOpen}
										onClick={() => toggleCategory(categoryName)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												toggleCategory(categoryName);
											}
										}}
										className="flex w-full cursor-pointer items-center justify-between gap-2 sm:gap-4"
									>
										<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
											<BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
											<span className="text-base sm:text-lg font-semibold">
												{categoryName}
											</span>
											<span className="text-xs sm:text-sm font-normal text-muted-foreground whitespace-nowrap">
												{unpaidFees.length} fee{unpaidFees.length !== 1 ? 's' : ''} due
											</span>
										</div>
										<div className="flex shrink-0 items-center gap-2 sm:gap-3">
											<div className="text-right">
												{Object.entries(totals.total).map(([c, v]) => (
													<div key={c} className="whitespace-nowrap">
														<span className="text-sm sm:text-base font-semibold">
															{c} {formatCurrency(v)}
														</span>
														{(totals.paid[c] || 0) > 0 && (
															<span className="ml-1 text-xs text-muted-foreground hidden sm:inline">
																· Paid {c} {formatCurrency(totals.paid[c] || 0)}
															</span>
														)}
													</div>
												))}
											</div>
											<ChevronDown
												className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
											/>
										</div>
									</div>
								</CardHeader>
								{isOpen && (
									<CardContent className="pt-0">
										<div className="space-y-2 sm:space-y-3">
											{unpaidFees.map((fee, idx) => {
												const paid = paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0;
												const remaining = Math.max(0, fee.effectiveAmount - paid);
												const hasDiscount = fee.discount > 0;
												return (
													<div
														key={idx}
														className="flex flex-col gap-2 rounded-lg border p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
													>
														<div className="min-w-0">
															<p className="break-words font-medium text-sm sm:text-base">
																{fee.feeName}
															</p>
															<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
																{fee.isRequired ? (
																	<span className="text-amber-600 dark:text-amber-400 font-medium">Required</span>
																) : (
																	<span className="text-green-600 dark:text-green-400 font-medium">Optional</span>
																)}
																{fee.installments.length > 0 && (
																	<span className="break-words">
																		{fee.installments.map((s, si) => (
																			<span key={s.installmentId}>
																				{si > 0 && <span className="text-gray-300 dark:text-gray-600"> · </span>}
																				{s.label}: {fee.currency} {formatCurrency(s.amount)}
																			</span>
																		))}
																	</span>
																)}
															</div>
															{fee.scholarshipNames.length > 0 && (
																<div className="mt-1 flex flex-wrap items-center gap-1">
																	{fee.scholarshipNames.map((name) => (
																		<span key={name} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
																			{name}
																		</span>
																	))}
																	{hasDiscount && (
																		<span className="text-xs font-medium text-primary">
																			Saved {fee.currency} {formatCurrency(fee.discount)}
																		</span>
																	)}
																</div>
															)}
															<div className="mt-1 break-words text-xs text-muted-foreground">
																<span>Paid {fee.currency} {formatCurrency(paid)} / Remaining {fee.currency} {formatCurrency(remaining)}</span>
															</div>
														</div>
														<div className="shrink-0 text-left sm:text-right">
															{hasDiscount ? (
																<>
																	<p className="font-semibold text-primary">{fee.currency} {formatCurrency(fee.effectiveAmount)}</p>
																	<p className="text-xs text-muted-foreground line-through">{fee.currency} {formatCurrency(fee.amount)}</p>
																</>
															) : (
																<p className="font-semibold">{fee.currency} {formatCurrency(fee.effectiveAmount)}</p>
															)}
															<p className="text-xs text-muted-foreground">{fee.groupName}</p>
														</div>
													</div>
												);
											})}
										</div>
									</CardContent>
								)}
							</Card>
						);
					})}
				</div>
			</div>
		</div>
	);
}
