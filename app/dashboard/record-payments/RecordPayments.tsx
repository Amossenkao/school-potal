'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
	CheckCircle,
	ChevronDown,
	Loader2,
	Wallet,
	X,
	UserPlus,
	CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSchoolStore } from '@/store/schoolStore';
import {
	resolveStudentFees,
} from '@/utils/studentFeeBilling';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';
import {
	buildSchoolAcademicYearRange,
	pickCurrentOrMostRecentAcademicYear,
} from '@/utils/academicYearOptions';
import StudentFinder, {
	studentFullName,
} from '@/app/dashboard/shared/components/StudentFinder';
import { paymentItemRows } from '@/utils/payments';

// ─── Formatters ────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
	amount.toLocaleString('en-US', {
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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface InstallmentOption {
	installmentId: string;
	label: string;
	amount: number;
}

interface ResolvedFee {
	feeKey: string;
	feeDefId: string;
	feeName: string;
	categoryName: string;
	groupName: string;
	amount: number;
	currency: string;
	effectiveAmount: number;
	discount: number;
	scholarshipNames: string[];
	installments: InstallmentOption[];
	totalPaid: number;
}

interface CartFeeItem {
	feeKey: string;
	feeDefId: string;
	feeName: string;
	categoryName: string;
	groupName: string;
	outstanding: number;
	currency: string;
	installments: InstallmentOption[];
	/** selected installment; empty = whole fee (no installment) */
	installmentId?: string;
	/** true = pay in full; false = custom amount */
	payInFull: boolean;
	/** raw string for the custom input (no commas) */
	customAmount: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function resolveFeesForStudent(
	student: any,
	schoolProfile: any,
	academicYear: string,
	payments: any[],
): ResolvedFee[] {
	const year =
		academicYear ||
		getCurrentAcademicYearFromSchoolProfile(schoolProfile) ||
		'';
	const bills = resolveStudentFees(student, schoolProfile, year);

	// Payments are batches, so what a student has paid toward a fee is the sum
	// of the matching lines across every receipt.
	const rows = paymentItemRows(payments);

	const fees: ResolvedFee[] = [];
	for (const bill of bills) {
		const currency = bill.currency || 'LRD';
		const paid = rows
			.filter(
				(row) =>
					`${row.feeType}::${row.currency || 'LRD'}` ===
					`${bill.feeName}::${currency}`,
			)
			.reduce((sum, row) => sum + row.amount, 0);
		fees.push({
			feeKey: bill.feeKey,
			feeDefId: bill.feeId,
			feeName: bill.feeName,
			categoryName: bill.categoryName,
			groupName: bill.groupName || '',
			amount: bill.amount,
			currency,
			effectiveAmount: bill.effectiveAmount,
			discount: bill.discount,
			scholarshipNames: bill.scholarshipNames,
			installments: bill.installments.map((i) => ({
				installmentId: i.installmentId,
				label: i.label,
				amount: i.amount,
			})),
			totalPaid: paid,
		});
	}
	return fees;
}

/** Max amount payable for a cart item, honoring the selected installment. */
function itemMax(item: CartFeeItem): number {
	const cap = item.installmentId
		? item.installments.find((i) => i.installmentId === item.installmentId)
				?.amount ?? item.outstanding
		: item.outstanding;
	return Math.max(0, Math.min(item.outstanding, cap));
}

function effectiveAmount(item: CartFeeItem): number {
	if (item.payInFull) return itemMax(item);
	const parsed = parseFloat(item.customAmount);
	return isNaN(parsed) ? 0 : parsed;
}

function groupFeesByCategory(
	fees: ResolvedFee[],
): Record<string, ResolvedFee[]> {
	const groups: Record<string, ResolvedFee[]> = {};
	for (const fee of fees) {
		if (!groups[fee.categoryName]) groups[fee.categoryName] = [];
		groups[fee.categoryName].push(fee);
	}
	return groups;
}

// ─── Fee Modal ─────────────────────────────────────────────────────────────────

interface FeeModalProps {
	student: any;
	resolvedFees: ResolvedFee[];
	submitting: boolean;
	onRecord: (items: CartFeeItem[]) => void;
	onClose: () => void;
}

function FeeModal({
	student,
	resolvedFees,
	submitting,
	onRecord,
	onClose,
}: FeeModalProps) {
	// Local until recorded: closing the modal discards the selection.
	const [items, setItems] = useState<CartFeeItem[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Lock scroll while modal is open
	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	}, []);

	const selectedCurrency = items.length > 0 ? items[0].currency : null;

	const toggleFee = (fee: ResolvedFee) => {
		const outstanding = Math.max(0, fee.effectiveAmount - fee.totalPaid);
		if (outstanding <= 0) return;

		const exists = items.some((i) => i.feeKey === fee.feeKey);

		if (exists) {
			setItems((prev) => prev.filter((i) => i.feeKey !== fee.feeKey));
		} else {
			// Enforce single-currency per student
			if (selectedCurrency && selectedCurrency !== (fee.currency || 'LRD'))
				return;

			setItems((prev) => [
				...prev,
				{
					feeKey: fee.feeKey,
					feeDefId: fee.feeDefId,
					feeName: fee.feeName,
					categoryName: fee.categoryName,
					groupName: fee.groupName,
					outstanding,
					currency: fee.currency,
					installments: fee.installments,
					installmentId: undefined,
					// Paying a fee off in full is the common case, so it is the
					// default; switching the toggle off reveals the amount input.
					payInFull: true,
					customAmount: '',
				},
			]);
		}
	};

	const togglePayInFull = (feeKey: string, value: boolean) => {
		setItems((prev) =>
			prev.map((i) =>
				i.feeKey === feeKey
					? {
							...i,
							payInFull: value,
							customAmount: value ? '' : i.customAmount,
						}
					: i,
			),
		);
	};

	const updateCustomAmount = (feeKey: string, raw: string) => {
		const clean = formatNumberInput(raw);
		setItems((prev) =>
			prev.map((i) =>
				i.feeKey === feeKey ? { ...i, customAmount: clean } : i,
			),
		);
	};

	const updateInstallment = (feeKey: string, installmentId: string) => {
		setItems((prev) =>
			prev.map((i) =>
				i.feeKey === feeKey
					? {
							...i,
							installmentId: installmentId || undefined,
							// A fresh installment resets to a custom amount.
							payInFull: false,
							customAmount: '',
						}
					: i,
			),
		);
	};

	const handleSave = () => {
		setError(null);
		// Validate custom amounts
		for (const item of items) {
			const max = itemMax(item);
			if (!item.payInFull) {
				const parsed = parseFloat(item.customAmount);
				if (!item.customAmount || isNaN(parsed) || parsed <= 0) {
					setError(`Enter a valid amount for "${item.feeName}".`);
					return;
				}
				if (parsed > max) {
					setError(
						`Amount for "${item.feeName}" exceeds the outstanding balance of ${item.currency} ${formatCurrency(max)}.`,
					);
					return;
				}
			}
		}
		onRecord(items);
	};

	const groupedByCategory = groupFeesByCategory(resolvedFees);
	const totalByCurrency: Record<string, number> = {};
	for (const item of items) {
		const c = item.currency || 'LRD';
		totalByCurrency[c] = (totalByCurrency[c] || 0) + effectiveAmount(item);
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
			role="dialog"
			aria-modal="true"
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Panel */}
			<div className="relative z-10 w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85dvh] flex flex-col bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
					<div className="min-w-0">
						<p className="font-semibold text-foreground truncate">
							{student.firstName} {student.lastName}
						</p>
						<p className="text-xs text-muted-foreground">
							{student.studentId}
							{student.className ? ` · ${student.className}` : ''}
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
						aria-label="Close"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Fee list — scrollable */}
				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
					{Object.keys(groupedByCategory).length === 0 ? (
						<div className="text-center py-10 text-sm text-muted-foreground">
							No fees configured for this student.
						</div>
					) : (
						Object.entries(groupedByCategory).map(([categoryName, fees]) => (
							<div key={categoryName}>
								{/* Category label */}
								<div className="flex items-center gap-2 mb-3">
									<Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										{categoryName}
									</span>
								</div>

								<div className="space-y-2">
									{fees.map((fee) => {
										const remaining = Math.max(0, fee.effectiveAmount - fee.totalPaid);
										const isCleared = remaining <= 0;
										const isSelected = items.some(
											(i) => i.feeKey === fee.feeKey,
										);
										const selectedItem = items.find(
											(i) => i.feeKey === fee.feeKey,
										);
										const isCurrencyMismatch =
											!isCleared &&
											selectedCurrency !== null &&
											selectedCurrency !== (fee.currency || 'LRD');

										return (
											<div
												key={fee.feeKey}
												className={`rounded-xl border p-3.5 transition-colors ${
													isCleared
														? 'border-border bg-muted/40'
														: isCurrencyMismatch
															? 'border-border bg-muted/30 opacity-60'
															: isSelected
																? 'border-primary/40 bg-primary/5'
																: 'border-border bg-background'
												}`}
											>
												{/* Fee row: checkbox + name + amount */}
											<div className="flex items-center justify-between gap-3">
													{/* The whole name is the hit target, not just the 16px
													    box — a label wrapping the input means a tap
													    anywhere on the row toggles it. */}
													<label
														className={`flex items-center gap-3 min-w-0 ${
															isCleared || isCurrencyMismatch
																? 'cursor-default'
																: 'cursor-pointer'
														}`}
													>
														{isCleared ? (
															<CheckCircle className="h-4 w-4 text-success-500 shrink-0" />
														) : (
															<input
																type="checkbox"
																checked={isSelected}
																disabled={isCurrencyMismatch}
																onChange={() => toggleFee(fee)}
																className="h-4 w-4 rounded border-input text-primary focus:ring-primary disabled:opacity-40 shrink-0"
															/>
														)}
														<div className="min-w-0">
															<p className="text-sm font-medium text-foreground flex flex-wrap items-center gap-1.5">
																<span className="truncate">{fee.feeName}</span>
																{isCleared ? (
																	<span className="text-xs font-medium text-success-600">
																		Paid
																	</span>
																) : fee.discount > 0 && (
																	<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary whitespace-nowrap">
																		{fee.scholarshipNames.join(', ') || 'Scholarship'} −{fee.currency} {formatCurrency(fee.discount)}
																	</span>
																)}
															</p>
															{!isCleared && fee.totalPaid > 0 && (
																<p className="text-xs text-muted-foreground mt-0.5">
																	Paid {fee.currency}{' '}
																	{formatCurrency(fee.totalPaid)}
																	{' · '}Outstanding {fee.currency}{' '}
																	{formatCurrency(remaining)}
																</p>
															)}
															{isCurrencyMismatch && (
																<p className="text-xs text-muted-foreground">
																	Different currency — can't mix
																</p>
															)}
														</div>
													</label>
													<p
														className={`text-sm font-semibold whitespace-nowrap shrink-0 ${isCleared ? 'text-success-600' : 'text-foreground'}`}
													>
														{fee.currency} {formatCurrency(fee.effectiveAmount)}
													</p>
												</div>

												{/* Amount controls — only when selected and not cleared */}
												{isSelected && !isCleared && selectedItem && (
													<div className="mt-3 pt-3 border-t border-border/60 space-y-3">
														{/* Installment select */}
														{selectedItem.installments.length > 0 && (
															<div className="flex items-center gap-2">
																<span className="text-xs text-muted-foreground shrink-0">
																	Installment
																</span>
																<select
																	value={selectedItem.installmentId || ''}
																	onChange={(e) =>
																		updateInstallment(
																			fee.feeKey,
																			e.target.value,
																		)
																	}
																	className="flex-1 min-w-0 border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
																>
																	<option value="">
																		Whole fee (no installment)
																	</option>
																	{selectedItem.installments.map((inst) => (
																		<option
																			key={inst.installmentId}
																			value={inst.installmentId}
																		>
																			{inst.label} — {selectedItem.currency}{' '}
																			{formatCurrency(inst.amount)}
																		</option>
																	))}
																</select>
															</div>
														)}

														<div className="flex items-center justify-between gap-3">
															{/* Custom amount input — hidden when pay in full */}
															{!selectedItem.payInFull ? (
																<div className="flex items-center gap-2 flex-1">
																	<span className="text-xs text-muted-foreground shrink-0">
																		{selectedItem.currency}
																	</span>
																	<input
																		type="text"
																		inputMode="decimal"
																		value={displayWithCommas(
																			selectedItem.customAmount,
																		)}
																		onChange={(e) =>
																			updateCustomAmount(
																				fee.feeKey,
																				e.target.value,
																			)
																		}
																		placeholder="0.00"
																		className="flex-1 min-w-0 border border-input rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
																		autoFocus
																	/>
																	<span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
																		/ {formatCurrency(itemMax(selectedItem))}
																	</span>
																</div>
															) : (
																<div className="flex-1">
																	<p className="text-xs text-muted-foreground">
																		Full amount:{' '}
																		<span className="font-semibold text-foreground">
																			{selectedItem.currency}{' '}
																			{formatCurrency(itemMax(selectedItem))}
																		</span>
																	</p>
																</div>
															)}

															{/* Pay-in-full toggle */}
															<div className="flex flex-col items-center gap-1 shrink-0">
																<button
																	type="button"
																	role="switch"
																	aria-checked={selectedItem.payInFull}
																	onClick={() =>
																		togglePayInFull(
																			fee.feeKey,
																			!selectedItem.payInFull,
																		)
																	}
																	className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
																		selectedItem.payInFull
																			? 'bg-primary'
																			: 'bg-input'
																	}`}
																>
																	<span
																		className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
																			selectedItem.payInFull
																				? 'translate-x-[18px]'
																				: 'translate-x-0.5'
																		}`}
																	/>
																</button>
																<span className="text-[10px] text-muted-foreground leading-none">
																	Full
																</span>
															</div>
														</div>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						))
					)}
				</div>

				{/* Footer */}
				<div className="px-5 py-4 border-t border-border bg-muted/30 shrink-0">
					{error && <p className="text-xs text-destructive mb-3">{error}</p>}
					<div className="flex items-center justify-between gap-3">
						<div>
							{items.length > 0 ? (
								<>
									<p className="text-xs text-muted-foreground">
										{items.length} item{items.length !== 1 ? 's' : ''} selected
									</p>
									{Object.entries(totalByCurrency).map(([c, amt]) => (
										<p
											key={c}
											className="text-sm font-semibold text-foreground"
										>
											{c} {formatCurrency(amt)}
										</p>
									))}
								</>
							) : (
								<p className="text-xs text-muted-foreground">
									No fees selected
								</p>
							)}
						</div>
						<div className="flex items-center gap-2">
						<button
								onClick={onClose}
								disabled={submitting}
								className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								disabled={items.length === 0 || submitting}
								className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{submitting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Recording…
									</>
								) : (
									<>
										<CreditCard className="w-4 h-4" />
										Record payment
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RecordPaymentsPage() {
	const schoolProfile = useSchoolStore((s) => s.school);
	const usersByAcademicYear = useSchoolStore((s) => s.usersByAcademicYear);
	const paymentsByAcademicYear = useSchoolStore((s) => s.paymentsByAcademicYear);

	const [academicYear, setAcademicYear] = useState('');
	const [submitting, setSubmitting] = useState(false);

	// One student at a time: picking someone opens the modal, and recording
	// closes it. There is no session to build up, so there is nothing to hold
	// between selections.
	const [modalStudent, setModalStudent] = useState<any>(null);
	const [modalFees, setModalFees] = useState<ResolvedFee[]>([]);
	const [modalLoadingId, setModalLoadingId] = useState<string | null>(null);

	const academicYearOptions = useMemo(() => {
		if (!schoolProfile) return [];
		return buildSchoolAcademicYearRange(schoolProfile);
	}, [schoolProfile]);

	// Roster for the selected year, straight from the store cache.
	const roster = useMemo(() => {
		const yearData =
			usersByAcademicYear?.[academicYear] ||
			Object.entries(usersByAcademicYear || {}).find(
				([key]) =>
					key.replace(/\//g, '-') === academicYear.replace(/\//g, '-'),
			)?.[1];
		return Array.isArray((yearData as any)?.students)
			? (yearData as any).students
			: [];
	}, [usersByAcademicYear, academicYear]);

	// All payments from the school store, flat across academic years. Matches the
	// shape returned by /api/payments?studentId= (no year filter) so fee math is
	// unchanged.
	const allPayments = useMemo(() => {
		const all: any[] = [];
		Object.values(paymentsByAcademicYear || {}).forEach((yearPayments) => {
			if (Array.isArray(yearPayments)) all.push(...yearPayments);
		});
		return all;
	}, [paymentsByAcademicYear]);

	useEffect(() => {
		if (!schoolProfile) return;
		const years = buildSchoolAcademicYearRange(schoolProfile);
		setAcademicYear(
			pickCurrentOrMostRecentAcademicYear(
				years,
				getCurrentAcademicYearFromSchoolProfile(schoolProfile),
			) || '',
		);
	}, [schoolProfile]);

	// Resolve this student's fees, then open the modal on them.
	const openStudentModal = useCallback(
		async (student: any) => {
			const sid = String(student.studentId || '');
			setModalLoadingId(sid);
			try {
				const payments = allPayments.filter(
					(p) => String(p.studentId || '') === sid,
				);
				setModalFees(
					resolveFeesForStudent(student, schoolProfile, academicYear, payments),
				);
				setModalStudent(student);
			} finally {
				setModalLoadingId(null);
			}
		},
		[schoolProfile, academicYear, allPayments],
	);

	const handleRecord = useCallback(
		async (items: CartFeeItem[]) => {
			if (!modalStudent) return;
			const studentId = String(modalStudent.studentId || '');
			const name = studentFullName(modalStudent);
			setSubmitting(true);
			try {
				const payload = items.map((item) => ({
					feeId: item.feeDefId,
					feeName: item.feeName,
					categoryName: item.categoryName,
					amount: effectiveAmount(item),
					currency: item.currency,
					...(item.installmentId ? { installmentId: item.installmentId } : {}),
				}));
				const res = await fetch('/api/payments', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						studentId,
						items: payload,
						paymentAcademicYear: academicYear,
					}),
				});
				const json = await res.json();
				if (!json.success) {
					toast.error(`${name} — ${json.message || 'payment failed'}`, {
						duration: 7000,
					});
					return;
				}

				// Keep the school store payments current so financial pages read the
				// freshly recorded receipt without a refetch.
				if (Array.isArray(json.data?.payments)) {
					const byYear: Record<string, any[]> = {};
					(json.data.payments as any[]).forEach((p: any) => {
						const year = String(p?.paymentAcademicYear || academicYear).trim();
						if (!year) return;
						if (!byYear[year]) byYear[year] = [];
						byYear[year].push(p);
					});
					Object.entries(byYear).forEach(([year, payments]) => {
						useSchoolStore.getState().setPaymentsForYear(year, payments);
					});
				}

				toast.success(`${name} — payment recorded.`, { duration: 5000 });
				setModalStudent(null);
				setModalFees([]);
			} catch {
				toast.error(`${name} — network error.`, { duration: 7000 });
			} finally {
				setSubmitting(false);
			}
		},
		[modalStudent, academicYear],
	);

	return (
		<div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
						Record Payments
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Find a student, choose what they are paying, and record it.
					</p>
				</div>
				<FilterSelect
					label="Academic Year"
					value={academicYear}
					onChange={(v) => {
						setAcademicYear(v);
						setModalStudent(null);
						setModalFees([]);
					}}
					options={academicYearOptions.map((y) => ({ label: y, value: y }))}
					disabled={academicYearOptions.length < 2}
				/>
			</header>

			<div className="space-y-2">
				<h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
					<UserPlus className="h-4 w-4" />
					Find a student
					{modalLoadingId && (
						<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
					)}
				</h2>
				<StudentFinder
					students={roster}
					schoolProfile={schoolProfile}
					academicYear={academicYear}
					onSelect={openStudentModal}
					renderMeta={() => (
						<span className="text-xs text-muted-foreground">Record</span>
					)}
				/>
			</div>

			{modalStudent && (
				<FeeModal
					student={modalStudent}
					resolvedFees={modalFees}
					submitting={submitting}
					onRecord={handleRecord}
					onClose={() => {
						if (submitting) return;
						setModalStudent(null);
						setModalFees([]);
					}}
				/>
			)}
		</div>
	);
}


// ─── Reusable: FilterSelect ────────────────────────────────────────────────────

interface FilterSelectProps {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
	placeholder?: string;
	disabled?: boolean;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
	label,
	value,
	onChange,
	options,
	placeholder,
	disabled,
}) => (
	<div className="flex flex-col gap-0.5">
		<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
			{label}
		</span>
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className={`h-8 pl-3 pr-8 rounded-lg border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors ${
					disabled
						? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 border-input'
						: 'bg-background text-foreground cursor-pointer border-input hover:border-ring/50'
				}`}
			>
				{placeholder && !disabled && <option value="">{placeholder}</option>}
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
			{!disabled && (
				<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
			)}
		</div>
	</div>
);
