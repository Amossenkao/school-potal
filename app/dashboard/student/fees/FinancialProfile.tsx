'use client';
import React, { useMemo } from 'react';
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
} from '@/utils/resolveStudentFeeGroup';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import {
	Loader2,
	AlertCircle,
	BookOpen,
	TrendingUp,
	TrendingDown,
	Wallet,
	CheckCircle,
} from 'lucide-react';

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
			<span key={currency} className="block whitespace-nowrap">
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
			categoryName: string;
			amount: number;
			currency: string;
			isRequired: boolean;
			installmentLabel: string | null;
		}> = [];

		for (const { sessionName, feeGroup } of feeGroups) {
			const rsf = resolveResolvedScheduledFees(feeGroup, school, studentGroupIds);
			for (const rf of rsf) {
				results.push({
					sessionName,
					groupName: feeGroup.name,
					feeName: rf.feeDefinition?.name || rf.scheduledFee.feeId,
					categoryName: rf.categoryName,
					amount: rf.scheduledFee.amount.amount,
					currency: rf.scheduledFee.amount.currency,
					isRequired: rf.scheduledFee.isRequired,
					installmentLabel: rf.installmentLabel,
				});
			}
		}
		return results;
	}, [feeGroups, school, studentGroupIds]);

	const totalsByCurrency = useMemo(() => {
		const dueMap = sumByCurrency(allResolvedFees);
		const requiredMap = sumByCurrency(allResolvedFees.filter((f) => f.isRequired));
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
	}, [allResolvedFees, user]);

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
		const groups: Record<string, typeof allResolvedFees> = {};
		for (const fee of allResolvedFees) {
			const key = fee.categoryName;
			if (!groups[key]) groups[key] = [];
			groups[key].push(fee);
		}
		return groups;
	}, [allResolvedFees]);

	const studentType: 'new' | 'old' = (user as any)?.studentType ?? 'old';

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
				<div className="w-full px-4 sm:px-6 lg:px-8 py-8">
					<div className="mb-8 rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/70">
						<h1 className="text-3xl sm:text-4xl font-bold mb-2">
							Financial Profile
						</h1>
						<p className="text-lg text-muted-foreground">
							View your fee balances and payment summary
						</p>
					</div>
					<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
						<CardContent className="p-6 text-center">
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
			<div className="w-full px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="mb-8 rounded-2xl border border-gray-200/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800/70 dark:bg-gray-950/70">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h1 className="text-3xl sm:text-4xl font-bold mb-2">
								Financial Profile
							</h1>
							<p className="text-lg text-muted-foreground">
								View your fee balances and payment summary
							</p>
						</div>
						<div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 shadow-sm dark:border-gray-800/80 dark:bg-gray-900/70 dark:text-gray-300">
							<Wallet className="h-3 w-3" />
							{feeGroups.length} fee group{feeGroups.length !== 1 ? 's' : ''}
						</div>
					</div>
				</div>

				<div className="space-y-8">
					{/* Student Info */}
					<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
						<CardHeader>
							<CardTitle>Student Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex gap-4 items-center border border-gray-200/70 p-4 rounded-xl bg-muted/40 dark:border-gray-800/70">
								<Avatar className="w-14 h-14 ring-2 ring-primary/20">
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
								<div>
									<h3 className="text-lg font-semibold">
										{user.firstName} {user.lastName}
									</h3>
									<p className="text-sm text-muted-foreground">
										Student ID: {(user as any).studentId || user.id}
									</p>
									<p className="text-sm text-muted-foreground">
										Class: {(user as any).className || '—'}
									</p>
									<p className="text-sm text-muted-foreground">
										Student Type: {studentType === 'new' ? 'New Student' : 'Old Student'}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Summary Cards */}
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

					{/* Fees by Category */}
					{Object.entries(groupedByCategory).map(([categoryName, fees]) => (
						<Card key={categoryName} className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<BookOpen className="h-5 w-5" />
									{categoryName}
								</CardTitle>
								<CardDescription>{fees.length} fee{fees.length !== 1 ? 's' : ''}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{fees.map((fee, idx) => {
										const paid = paidByFeeName[`${fee.feeName}::${fee.currency}`] || 0;
										const remaining = Math.max(0, fee.amount - paid);
										const isCleared = paid >= fee.amount;
										return (
											<div
												key={idx}
												className="flex items-center justify-between gap-4 rounded-lg border p-4"
											>
												<div>
													<p className="font-medium">
														{fee.feeName}
														{isCleared && <CheckCircle className="inline h-4 w-4 ml-1.5 -mt-0.5 text-green-600" />}
													</p>
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														{fee.isRequired ? (
															<span className="text-amber-600 dark:text-amber-400 font-medium">Required</span>
														) : (
															<span className="text-green-600 dark:text-green-400 font-medium">Optional</span>
														)}
														{fee.installmentLabel && (
															<span>Due: {fee.installmentLabel}</span>
														)}
													</div>
													<div className="text-xs text-muted-foreground mt-1">
														{isCleared ? (
															<span className="text-green-600 font-medium">Cleared</span>
														) : paid > 0 ? (
															<span>Paid {fee.currency} {formatCurrency(paid)} / Remaining {fee.currency} {formatCurrency(remaining)}</span>
														) : null}
													</div>
												</div>
												<div className="text-right shrink-0">
													<p className="font-semibold whitespace-nowrap">{fee.currency} {formatCurrency(fee.amount)}</p>
													<p className="text-xs text-muted-foreground">{fee.groupName}</p>
												</div>
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}
