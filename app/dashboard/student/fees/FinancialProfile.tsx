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
import { resolveStudentFeeGroup } from '@/utils/resolveStudentFeeGroup';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import type { FeeGroup } from '@/types/schoolProfile';
import {
	Loader2,
	AlertCircle,
	BookOpen,
	FileText,
	MoreHorizontal,
	Wallet,
	TrendingUp,
	TrendingDown,
	CreditCard,
	ClipboardList,
	Gift,
} from 'lucide-react';

const formatCurrency = (value: number) =>
	value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getInstallmentAmount = (
	inst: FeeGroup['installments'][number],
	studentType: 'old' | 'new',
) => {
	if (studentType === 'new' && inst.new != null) return inst.new;
	if (studentType === 'old' && inst.old != null) return inst.old;
	return inst.amount ?? 0;
};

export default function FinancialProfile() {
	const { user, isLoading } = useAuth();
	const school = useSchoolStore((s) => s.school);

	const resolved = useMemo(() => {
		if (!user || !school) return null;
		const academicYear = getCurrentAcademicYearFromSchoolProfile(school);
		return resolveStudentFeeGroup(
			(user as any).classId,
			school,
			academicYear,
		);
	}, [user, school]);

	const studentType: 'old' | 'new' = (user as any)?.isNewStudent
		? 'new'
		: 'old';

	const totals = useMemo(() => {
		if (!resolved) return null;
		const fg = resolved.feeGroup;

		const tuitionAndReg =
			fg.tuitionAndRegistration?.[studentType]?.total ?? 0;

		const installments = fg.installments.reduce(
			(sum, inst) => sum + getInstallmentAmount(inst, studentType),
			0,
		);

		const requirements = (fg.requirements || []).reduce(
			(sum, r) => sum + (r.amount || 0),
			0,
		);

		const accessories = (fg.accessories || [])
			.filter(
				(a) =>
					a.studentType === 'all' || a.studentType === studentType,
			)
			.reduce((sum, a) => sum + (a.amount || 0), 0);

		const totalDue = installments + requirements + accessories;

		// Placeholder — will be populated when payments data is available
		const totalPaid = 0;

		return { tuitionAndReg, installments, requirements, accessories, totalDue, totalPaid };
	}, [resolved, studentType]);

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

	if (!resolved || !totals) {
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

	const { feeGroup } = resolved;
	const { totalDue, totalPaid } = totals;

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
							{feeGroup.label}
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
										Student Type: {studentType === 'new' ? 'New Student' : 'Returning Student'}
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
								<CardTitle className="flex items-center gap-2">
									<TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
									LRD {formatCurrency(totalDue)}
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
								<CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
									<TrendingUp className="h-5 w-5" />
									LRD {formatCurrency(totalPaid)}
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
								<CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
									<Wallet className="h-5 w-5" />
									LRD {formatCurrency(totalDue - totalPaid)}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-xs text-muted-foreground">
									Remaining amount to be paid
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Tuition & Registration */}
					{feeGroup.tuitionAndRegistration && (
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<BookOpen className="h-5 w-5" />
									Tuition & Registration
								</CardTitle>
								<CardDescription>
									{studentType === 'new' ? 'New student' : 'Returning student'} rates
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground mb-1">1st Semester Registration</p>
										<p className="text-lg font-semibold">
											LRD {formatCurrency(feeGroup.tuitionAndRegistration[studentType].reg1stSem)}
										</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground mb-1">2nd Semester Registration</p>
										<p className="text-lg font-semibold">
											LRD {formatCurrency(feeGroup.tuitionAndRegistration[studentType].reg2ndSem)}
										</p>
									</div>
									<div className="rounded-lg border p-3">
										<p className="text-xs text-muted-foreground mb-1">Tuition</p>
										<p className="text-lg font-semibold">
											LRD {formatCurrency(feeGroup.tuitionAndRegistration[studentType].tuition)}
										</p>
									</div>
									<div className="rounded-lg border p-3 bg-primary/5">
										<p className="text-xs text-muted-foreground mb-1">Total</p>
										<p className="text-lg font-semibold text-primary">
											LRD {formatCurrency(feeGroup.tuitionAndRegistration[studentType].total)}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Installments */}
					{feeGroup.installments.length > 0 && (
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<ClipboardList className="h-5 w-5" />
									Payment Installments
								</CardTitle>
								<CardDescription>
									Scheduled payment milestones
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{feeGroup.installments.map((inst, idx) => {
										const amount = getInstallmentAmount(inst, studentType);
										return (
											<div
												key={idx}
												className="flex items-center justify-between gap-4 rounded-lg border p-4"
											>
												<div>
													<p className="font-medium">{inst.label}</p>
													{inst.dueWindow && (
														<p className="text-xs text-muted-foreground">
															Due: {inst.dueWindow}
														</p>
													)}
												</div>
												<div className="text-right">
													<p className="font-semibold">LRD {formatCurrency(amount)}</p>
													<p className="text-xs text-muted-foreground">—</p>
												</div>
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Requirements */}
					{feeGroup.requirements && feeGroup.requirements.length > 0 && (
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Requirements
								</CardTitle>
								<CardDescription>Required items and fees</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{feeGroup.requirements.map((req, idx) => (
										<div
											key={idx}
											className="flex items-center justify-between gap-4 rounded-lg border p-4"
										>
											<div>
												<p className="font-medium">{req.item}</p>
												<p className="text-xs text-muted-foreground">
													Due at: {req.dueWindow || req.dueAt}
												</p>
											</div>
											<div className="text-right">
												<p className="font-semibold">
													LRD {formatCurrency(req.amount)}
												</p>
												<p className="text-xs text-muted-foreground">—</p>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Accessories */}
					{feeGroup.accessories && feeGroup.accessories.length > 0 && (
						<Card className="border-gray-200/70 bg-white/90 shadow-sm dark:border-gray-800/70 dark:bg-gray-950/70">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Gift className="h-5 w-5" />
									Accessories
								</CardTitle>
								<CardDescription>Optional items available for purchase</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{feeGroup.accessories
										.filter(
											(a) =>
												a.studentType === 'all' ||
												a.studentType === studentType,
										)
										.map((acc, idx) => (
											<div
												key={idx}
												className="flex items-center justify-between gap-4 rounded-lg border p-4"
											>
												<div>
													<p className="font-medium">{acc.item}</p>
													<p className="text-xs text-muted-foreground">
														Due: {acc.dueAt}
													</p>
												</div>
												<div className="text-right">
													<p className="font-semibold">
														LRD {formatCurrency(acc.amount)}
													</p>
													<p className="text-xs text-muted-foreground">—</p>
												</div>
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
