'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import useAuth from '@/store/useAuth';
import { useSchoolStore } from '@/store/schoolStore';
import {
	resolveStudentFeeGroups,
	resolveStudentGroupIds,
	resolveResolvedScheduledFees,
} from '@/utils/resolveStudentFeeGroup';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

const formatCurrency = (amount: number) =>
	amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RecordPaymentsPage() {
	const { user } = useAuth();
	const schoolProfile = useSchoolStore((s) => s.school);

	const [students, setStudents] = useState<any[]>([]);
	const [selectedStudentId, setSelectedStudentId] = useState('');
	const [search, setSearch] = useState('');
	const [academicYear, setAcademicYear] = useState('');
	const [payments, setPayments] = useState<any[]>([]);
	const [amounts, setAmounts] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	const resolvedFees = useMemo(() => {
		if (!selectedStudentId || !schoolProfile) return [];
		const student = students.find((s) => s.studentId === selectedStudentId);
		if (!student) return [];

		const year = academicYear || getCurrentAcademicYearFromSchoolProfile(schoolProfile) || '';
		const studentGroups = schoolProfile.financialConfig?.studentGroups ?? [];
		const groupIds = resolveStudentGroupIds(student, studentGroups);
		const feeGroups = resolveStudentFeeGroups(student.classId, schoolProfile, year);

		const fees: Array<{
			feeDefId: string;
			feeName: string;
			categoryName: string;
			amount: number;
			currency: string;
			totalPaid: number;
		}> = [];

		for (const { feeGroup } of feeGroups) {
			const resolved = resolveResolvedScheduledFees(feeGroup, schoolProfile, groupIds);
			for (const rf of resolved) {
				const paid = payments
					.filter((p) => p.feeType === (rf.feeDefinition?.name || rf.scheduledFee.feeId))
					.reduce((sum, p) => sum + p.paymentAmount, 0);
				fees.push({
					feeDefId: rf.scheduledFee.feeId,
					feeName: rf.feeDefinition?.name || rf.scheduledFee.feeId,
					categoryName: rf.categoryName,
					amount: rf.scheduledFee.amount.amount,
					currency: rf.scheduledFee.amount.currency,
					totalPaid: paid,
				});
			}
		}
		return fees;
	}, [selectedStudentId, schoolProfile, students, academicYear, payments]);

	const loadStudents = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (search) params.set('search', search);
			const res = await fetch(`/api/students?${params}`);
			const json = await res.json();
			if (json.success) setStudents(json.data);
		} catch {
			setMessage({ type: 'error', text: 'Failed to load students.' });
		} finally {
			setLoading(false);
		}
	}, [search]);

	const loadPayments = useCallback(async (studentId: string) => {
		try {
			const res = await fetch(`/api/payments?studentId=${studentId}`);
			const json = await res.json();
			if (json.success) setPayments(json.data.payments || []);
		} catch {
			setPayments([]);
		}
	}, []);

	useEffect(() => {
		if (schoolProfile) {
			setAcademicYear(getCurrentAcademicYearFromSchoolProfile(schoolProfile) || '');
		}
	}, [schoolProfile]);

	useEffect(() => {
		if (selectedStudentId) {
			loadPayments(selectedStudentId);
			setAmounts({});
		}
	}, [selectedStudentId, loadPayments]);

	const handleSubmit = async () => {
		if (!selectedStudentId || resolvedFees.length === 0) return;

		const items = resolvedFees
			.filter((fee) => {
				const val = amounts[fee.feeDefId];
				return val && Number(val) > 0;
			})
			.map((fee) => ({
				feeId: fee.feeDefId,
				feeName: fee.feeName,
				categoryName: fee.categoryName,
				amount: Number(amounts[fee.feeDefId]),
				currency: fee.currency,
			}));

		if (items.length === 0) {
			setMessage({ type: 'error', text: 'Enter at least one payment amount.' });
			return;
		}

		setSubmitting(true);
		setMessage(null);
		try {
			const res = await fetch('/api/payments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId: selectedStudentId,
					items,
					paymentAcademicYear: academicYear,
				}),
			});
			const json = await res.json();
			if (json.success) {
				setMessage({ type: 'success', text: 'Payment recorded successfully.' });
				loadPayments(selectedStudentId);
				setAmounts({});
			} else {
				setMessage({ type: 'error', text: json.message });
			}
		} catch {
			setMessage({ type: 'error', text: 'Failed to record payment.' });
		} finally {
			setSubmitting(false);
		}
	};

	const selectedStudent = students.find((s) => s.studentId === selectedStudentId);

	return (
		<div className="mx-auto max-w-6xl space-y-8 p-6">
			<div>
				<h1 className="text-2xl font-black tracking-tight">Record Payments</h1>
				<p className="text-sm text-muted-foreground">
					Record a payment for a student against their assessed fees.
				</p>
			</div>

			{message && (
				<div
					className={`rounded-xl border p-4 text-sm font-bold ${
						message.type === 'success'
							? 'border-green-200 bg-green-50 text-green-800'
							: 'border-red-200 bg-red-50 text-red-800'
					}`}
				>
					{message.text}
				</div>
			)}

			<div className="flex gap-4">
				<div className="flex-1">
					<label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
						Search Student
					</label>
					<div className="flex gap-2">
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Name or ID..."
							className="flex-1 rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
						/>
						<button
							onClick={loadStudents}
							className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
						>
							Search
						</button>
					</div>
				</div>

				<div className="w-64">
					<label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
						Academic Year
					</label>
					<input
						type="text"
						value={academicYear}
						onChange={(e) => setAcademicYear(e.target.value)}
						placeholder="e.g. 2025-2026"
						className="w-full rounded-xl border-2 p-3 font-bold outline-none focus:border-blue-600"
					/>
				</div>
			</div>

			{students.length > 0 && (
				<div className="rounded-2xl border-2 p-4">
					<label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
						Select Student
					</label>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{students.map((s) => (
							<button
								key={s.studentId}
								onClick={() => setSelectedStudentId(s.studentId)}
								className={`rounded-xl border-2 p-3 text-left text-sm font-bold transition-all ${
									selectedStudentId === s.studentId
										? 'border-blue-600 bg-blue-600 text-white'
										: 'border-transparent bg-slate-50 hover:border-blue-200'
								}`}
							>
								{s.firstName} {s.lastName}
								<span className="block text-xs opacity-70">{s.studentId}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{loading && <p className="text-center text-sm text-muted-foreground">Loading students...</p>}

			{selectedStudent && (
				<div className="space-y-6">
					<div className="rounded-2xl border-2 bg-slate-50 p-4">
						<h2 className="mb-1 text-lg font-black">
							{selectedStudent.firstName} {selectedStudent.lastName}
						</h2>
						<p className="text-sm text-muted-foreground">
							{selectedStudent.studentId} &middot; {selectedStudent.className}
						</p>
					</div>

					<div className="rounded-2xl border-2">
						<div className="border-b-2 p-4">
							<h3 className="font-black">Assessed Fees</h3>
						</div>
						<div className="divide-y-2">
							{resolvedFees.map((fee) => {
								const outstanding = fee.amount - fee.totalPaid;
								const isPaid = outstanding <= 0;
								return (
									<div key={fee.feeDefId} className="flex items-center gap-4 p-4">
										<div className="flex-1">
											<p className="font-bold">{fee.feeName}</p>
											<p className="text-xs text-muted-foreground">
												{fee.categoryName} &middot; {fee.currency} {formatCurrency(fee.amount)}
												{fee.totalPaid > 0 && (
													<span className="ml-2 text-green-600">
														(paid {formatCurrency(fee.totalPaid)})
													</span>
												)}
											</p>
										</div>
										<div className="text-right">
											<p className={`text-sm font-bold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
												{isPaid ? 'PAID' : `Due: ${formatCurrency(outstanding)}`}
											</p>
										</div>
										{!isPaid && (
											<input
												type="number"
												min="0"
												max={outstanding}
												step="0.01"
												value={amounts[fee.feeDefId] || ''}
												onChange={(e) =>
													setAmounts((prev) => ({ ...prev, [fee.feeDefId]: e.target.value }))
												}
												placeholder="Amount"
												className="w-32 rounded-xl border-2 p-2 text-right font-bold outline-none focus:border-blue-600"
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{resolvedFees.some((f) => {
						const val = amounts[f.feeDefId];
						return val && Number(val) > 0;
					}) && (
						<button
							onClick={handleSubmit}
							disabled={submitting}
							className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-blue-700 disabled:opacity-50"
						>
							{submitting ? 'Recording...' : 'Record Payment'}
						</button>
					)}

					{payments.length > 0 && (
						<div className="rounded-2xl border-2">
							<div className="border-b-2 p-4">
								<h3 className="font-black">Payment History</h3>
							</div>
							<div className="divide-y-2">
								{payments.slice(0, 20).map((p: any) => (
									<div key={p.id} className="flex items-center justify-between p-4">
										<div>
											<p className="font-bold">{p.feeType}</p>
											<p className="text-xs text-muted-foreground">
												{p.paymentDate} &middot; {p.receiptNumber}
											</p>
										</div>
										<p className="font-black text-green-700">
											{p.currency} {formatCurrency(p.paymentAmount)}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
