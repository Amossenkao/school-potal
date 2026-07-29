'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSchoolStore } from '@/store/schoolStore';

const formatCurrency = (amount: number) =>
	amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminPaymentHistoryPage() {
	const schoolProfile = useSchoolStore((s) => s.school);
	const [payments, setPayments] = useState<any[]>([]);
	const [students, setStudents] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [feeTypeFilter, setFeeTypeFilter] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');

	useEffect(() => {
		const load = async () => {
			try {
				const [payRes, stuRes] = await Promise.all([
					fetch('/api/payments'),
					fetch('/api/students'),
				]);
				const payJson = await payRes.json();
				const stuJson = await stuRes.json();
				if (payJson.success) setPayments(payJson.data.payments || []);
				if (stuJson.success) setStudents(stuJson.data || []);
			} catch {
				console.error('Failed to load data');
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const studentMap = useMemo(() => {
		const map: Record<string, any> = {};
		for (const s of students) map[s.studentId] = s;
		return map;
	}, [students]);

	const feeTypes = useMemo(() => {
		const types = new Set(payments.map((p) => p.feeType).filter(Boolean));
		return Array.from(types).sort();
	}, [payments]);

	const filtered = useMemo(() => {
		let list = [...payments];
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(
				(p) =>
					p.studentId.toLowerCase().includes(q) ||
					p.receiptNumber.toLowerCase().includes(q) ||
					p.paidBy.toLowerCase().includes(q),
			);
		}
		if (feeTypeFilter) list = list.filter((p) => p.feeType === feeTypeFilter);
		if (dateFrom) list = list.filter((p) => p.paymentDate >= dateFrom);
		if (dateTo) list = list.filter((p) => p.paymentDate <= dateTo);
		return list;
	}, [payments, search, feeTypeFilter, dateFrom, dateTo]);

	if (loading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<p className="text-sm text-muted-foreground">Loading payment history...</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-8 p-6">
			<div>
				<h1 className="text-2xl font-black tracking-tight">Payment History</h1>
				<p className="text-sm text-muted-foreground">
					View all payments across the school. {filtered.length} payment(s) found.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by student ID, receipt, or payer..."
					className="rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
				/>
				<select
					value={feeTypeFilter}
					onChange={(e) => setFeeTypeFilter(e.target.value)}
					className="rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
				>
					<option value="">All Fee Types</option>
					{feeTypes.map((t) => (
						<option key={t} value={t}>{t}</option>
					))}
				</select>
				<input
					type="date"
					value={dateFrom}
					onChange={(e) => setDateFrom(e.target.value)}
					className="rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
				/>
				<input
					type="date"
					value={dateTo}
					onChange={(e) => setDateTo(e.target.value)}
					className="rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
				/>
			</div>

			<div className="rounded-2xl border-2">
				<div className="border-b-2 p-4">
					<h2 className="font-black">Payments</h2>
				</div>
				<div className="divide-y-2">
					{filtered.length === 0 ? (
						<p className="p-4 text-center text-sm text-muted-foreground">No payments match your filters.</p>
					) : (
						filtered.map((p) => {
							const s = studentMap[p.studentId];
							return (
								<div key={p.id} className="flex items-center justify-between p-4">
									<div className="flex-1">
										<p className="font-bold">
											{s ? `${s.firstName} ${s.lastName}` : p.studentId}
										</p>
										<p className="text-xs text-muted-foreground">
											{p.feeType} &middot; {p.paymentDate}
										</p>
										<p className="text-xs text-muted-foreground">
											Receipt: {p.receiptNumber} &middot; By: {p.paidBy}
										</p>
									</div>
									<div className="text-right">
										<p className="font-black text-green-700">
											{p.currency} {formatCurrency(p.paymentAmount)}
										</p>
										<p className="text-xs text-muted-foreground">{p.paymentMethod || 'cash'}</p>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
