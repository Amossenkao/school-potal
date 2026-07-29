'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchoolStore } from '@/store/schoolStore';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

const formatCurrency = (amount: number) =>
	amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinancialOverviewPage() {
	const schoolProfile = useSchoolStore((s) => s.school);
	const [payments, setPayments] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch('/api/payments');
				const json = await res.json();
				if (json.success) setPayments(json.data.payments || []);
			} catch {
				console.error('Failed to load payments');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const academicYear = useMemo(
		() => (schoolProfile ? getCurrentAcademicYearFromSchoolProfile(schoolProfile) || '' : ''),
		[schoolProfile],
	);

	const summary = useMemo(() => {
		const total = payments.reduce((sum, p) => sum + p.paymentAmount, 0);
		const byCurrency: Record<string, number> = {};
		const byFeeType: Record<string, number> = {};
		const byDate: Record<string, number> = {};
		for (const p of payments) {
			const cur = p.currency || 'LRD';
			byCurrency[cur] = (byCurrency[cur] || 0) + p.paymentAmount;
			byFeeType[p.feeType] = (byFeeType[p.feeType] || 0) + p.paymentAmount;
			const d = p.paymentDate;
			byDate[d] = (byDate[d] || 0) + p.paymentAmount;
		}
		const sortedDates = Object.keys(byDate).sort().reverse().slice(0, 10);
		const recentDaily = sortedDates.map((d) => ({ date: d, total: byDate[d] }));
		return { total, byCurrency, byFeeType, recentDaily, totalTransactions: payments.length };
	}, [payments]);

	if (loading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<p className="text-sm text-muted-foreground">Loading financial data...</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-8 p-6">
			<div>
				<h1 className="text-2xl font-black tracking-tight">Financial Overview</h1>
				<p className="text-sm text-muted-foreground">
					Academic Year: {academicYear}
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				<div className="rounded-2xl border-2 bg-green-50 p-6">
					<p className="text-xs font-black uppercase tracking-widest text-green-600">Total Collected</p>
					<p className="mt-2 text-3xl font-black text-green-900">
						{Object.entries(summary.byCurrency)
							.map(([cur, amt]) => `${cur} ${formatCurrency(amt)}`)
							.join(' / ')}
					</p>
					<p className="mt-1 text-sm text-green-700">{summary.totalTransactions} transactions</p>
				</div>

				<div className="rounded-2xl border-2 bg-blue-50 p-6">
					<p className="text-xs font-black uppercase tracking-widest text-blue-600">By Fee Type</p>
					<div className="mt-3 space-y-2">
						{Object.entries(summary.byFeeType)
							.sort(([, a], [, b]) => b - a)
							.slice(0, 5)
							.map(([fee, amt]) => (
								<div key={fee} className="flex justify-between text-sm">
									<span className="font-bold text-blue-900">{fee}</span>
									<span className="font-black text-blue-800">{formatCurrency(amt)}</span>
								</div>
							))}
					</div>
				</div>

				<div className="rounded-2xl border-2 bg-slate-50 p-6">
					<p className="text-xs font-black uppercase tracking-widest text-slate-500">Recent Days</p>
					<div className="mt-3 space-y-2">
						{summary.recentDaily.map(({ date, total }) => (
							<div key={date} className="flex justify-between text-sm">
								<span className="font-bold text-slate-700">{date}</span>
								<span className="font-black text-slate-900">{formatCurrency(total)}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="rounded-2xl border-2">
				<div className="border-b-2 p-4">
					<h2 className="font-black">Recent Transactions</h2>
				</div>
				<div className="divide-y-2">
					{payments.slice(0, 30).map((p) => (
						<div key={p.id} className="flex items-center justify-between p-4">
							<div>
								<p className="font-bold">{p.feeType}</p>
								<p className="text-xs text-muted-foreground">
									{p.studentId} &middot; {p.paymentDate} &middot; {p.receiptNumber}
								</p>
							</div>
							<div className="text-right">
								<p className="font-black text-green-700">
									{p.currency} {formatCurrency(p.paymentAmount)}
								</p>
								<p className="text-xs text-muted-foreground">{p.paidBy}</p>
							</div>
						</div>
					))}
					{payments.length === 0 && (
						<p className="p-4 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
					)}
				</div>
			</div>
		</div>
	);
}
