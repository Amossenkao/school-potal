'use client';

import React, { useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
	pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { ReceiptContext } from '@/utils/paymentReceipt';

const money = (value: number) =>
	(Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		paddingTop: 30,
		paddingHorizontal: 36,
		paddingBottom: 44,
		fontSize: 9,
		color: '#0f172a',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	logo: { width: 52, height: 52 },
	schoolBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
	schoolName: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
		color: '#0f172a',
	},
	schoolAddress: {
		fontSize: 8,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 3,
	},
	divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 14 },
	titleRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
	kicker: {
		fontSize: 8,
		textTransform: 'uppercase',
		letterSpacing: 2,
		color: '#0ea5e9',
		marginBottom: 4,
	},
	receiptBadge: {
		borderWidth: 1,
		borderColor: '#0ea5e9',
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 10,
		alignItems: 'flex-end',
	},
	receiptBadgeLabel: { fontSize: 7, color: '#64748b', letterSpacing: 1 },
	receiptBadgeValue: {
		fontSize: 11,
		fontWeight: 'bold',
		color: '#0f172a',
		marginTop: 2,
	},

	metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
	metaCell: { width: '25%', marginBottom: 10, paddingRight: 8 },
	metaLabel: {
		fontSize: 7,
		color: '#64748b',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
	},
	metaValue: { fontSize: 9.5, fontWeight: 'bold', color: '#0f172a', marginTop: 3 },

	sectionTitle: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#0f172a',
		marginTop: 16,
		marginBottom: 5,
	},
	table: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRightWidth: 0,
		borderBottomWidth: 0,
	},
	row: { flexDirection: 'row' },
	headRow: { backgroundColor: '#e2e8f0' },
	totalRow: { backgroundColor: '#f1f5f9' },
	cell: {
		paddingVertical: 5,
		paddingHorizontal: 6,
		fontSize: 8,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderLeftWidth: 0,
		borderTopWidth: 0,
	},
	cellHead: { fontWeight: 'bold', fontSize: 7.5, color: '#334155' },
	bold: { fontWeight: 'bold' },
	paid: { color: '#047857' },
	due: { color: '#b91c1c' },

	summaryWrap: { flexDirection: 'row', marginTop: 16, gap: 10 },
	summaryCard: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 8,
		padding: 10,
		backgroundColor: '#f8fafc',
	},
	summaryLabel: {
		fontSize: 7,
		color: '#64748b',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
	},
	summaryValue: {
		fontSize: 13,
		fontWeight: 'bold',
		color: '#0f172a',
		marginTop: 4,
	},

	footerWrap: {
		marginTop: 18,
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	qrBox: { alignItems: 'center', width: 110 },
	qr: { width: 84, height: 84 },
	qrCaption: {
		fontSize: 6.5,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 4,
	},
	note: {
		flex: 1,
		fontSize: 7.5,
		color: '#64748b',
		lineHeight: 1.5,
		paddingRight: 12,
	},
	signature: { width: 150, alignItems: 'center', marginTop: 34 },
	signatureLine: {
		width: '100%',
		height: 1,
		backgroundColor: '#94a3b8',
		marginBottom: 4,
	},
	signatureLabel: { fontSize: 7, color: '#64748b' },
	pageNumber: {
		position: 'absolute',
		bottom: 18,
		right: 36,
		fontSize: 7,
		color: '#94a3b8',
	},
	stamp: {
		position: 'absolute',
		bottom: 18,
		left: 36,
		fontSize: 7,
		color: '#94a3b8',
	},
});

const schoolAddress = (school: any): string =>
	(Array.isArray(school?.contact?.addresses)
		? school.contact.addresses.flatMap((a: any) => a.lines || [])
		: []
	)
		.filter(Boolean)
		.join(', ');

function Meta({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.metaCell}>
			<Text style={styles.metaLabel}>{label}</Text>
			<Text style={styles.metaValue}>{value || '—'}</Text>
		</View>
	);
}

export const ReceiptDocument: React.FC<{
	context: ReceiptContext;
	school: any;
	qrDataUrl: string | null;
}> = ({ context, school, qrDataUrl }) => {
	const { payment, currency, lines, installments, overall, student } = context;

	return (
		<Document
			title={`Receipt ${payment.receiptNumber}`}
			author={school?.identity?.name || 'School'}
			subject={`Payment receipt for ${student.name}`}
		>
			<Page size="A4" style={styles.page}>
				{/* ── Letterhead ─────────────────────────────────────────── */}
				<View style={styles.header}>
					{school?.branding?.logoUrl2 ? (
						<Image src={school.branding.logoUrl2} style={styles.logo} />
					) : (
						<View style={styles.logo} />
					)}
					<View style={styles.schoolBlock}>
						<Text style={styles.schoolName}>
							{school?.identity?.name || 'School'}
						</Text>
						<Text style={styles.schoolAddress}>{schoolAddress(school)}</Text>
					</View>
					{school?.branding?.logoUrl ? (
						<Image src={school.branding.logoUrl} style={styles.logo} />
					) : (
						<View style={styles.logo} />
					)}
				</View>

				<View style={styles.divider} />

				<View style={styles.titleRow}>
					<View>
						<Text style={styles.kicker}>Official Payment Receipt</Text>
						<Text style={styles.title}>
							{currency} {money(context.receiptTotal)}
						</Text>
					</View>
					<View style={styles.receiptBadge}>
						<Text style={styles.receiptBadgeLabel}>RECEIPT No.</Text>
						<Text style={styles.receiptBadgeValue}>{payment.receiptNumber}</Text>
					</View>
				</View>

				{/* ── Who / when ─────────────────────────────────────────── */}
				<View style={styles.metaGrid}>
					<Meta label="Student" value={student.name} />
					<Meta label="Student ID" value={student.studentId} />
					<Meta label="Class" value={student.className} />
					<Meta label="Academic Year" value={context.academicYear} />
					<Meta label="Received From" value={payment.paidBy} />
					<Meta label="Payment Method" value={payment.paymentMethod || 'Cash'} />
					<Meta label="Date" value={payment.paymentDate} />
					<Meta label="Time" value={payment.paymentTime} />
				</View>

				{/* ── Items on this receipt ──────────────────────────────── */}
				<Text style={styles.sectionTitle}>Items Paid</Text>
				<View style={styles.table}>
					<View style={[styles.row, styles.headRow]}>
						<Text style={[styles.cell, styles.cellHead, { flex: 3 }]}>Fee</Text>
						<Text style={[styles.cell, styles.cellHead, { flex: 2 }]}>
							Installment
						</Text>
						<Text
							style={[styles.cell, styles.cellHead, { flex: 1.8, textAlign: 'right' }]}
						>
							Fee Total
						</Text>
						<Text
							style={[styles.cell, styles.cellHead, { flex: 1.8, textAlign: 'right' }]}
						>
							Paid Now
						</Text>
						<Text
							style={[styles.cell, styles.cellHead, { flex: 1.8, textAlign: 'right' }]}
						>
							Outstanding
						</Text>
					</View>
					{lines.map((line, index) => (
						<View style={styles.row} key={`${line.feeType}-${index}`} wrap={false}>
							<Text style={[styles.cell, { flex: 3 }]}>
								{line.feeType}
								{line.category ? `\n${line.category}` : ''}
							</Text>
							<Text style={[styles.cell, { flex: 2 }]}>
								{line.installmentLabel || 'Whole fee'}
							</Text>
							<Text style={[styles.cell, { flex: 1.8, textAlign: 'right' }]}>
								{line.feeTotal > 0 ? money(line.feeTotal) : '—'}
							</Text>
							<Text
								style={[
									styles.cell,
									styles.bold,
									styles.paid,
									{ flex: 1.8, textAlign: 'right' },
								]}
							>
								{money(line.amountPaid)}
							</Text>
							<Text
								style={[
									styles.cell,
									styles.bold,
									line.outstanding > 0 ? styles.due : styles.paid,
									{ flex: 1.8, textAlign: 'right' },
								]}
							>
								{money(line.outstanding)}
							</Text>
						</View>
					))}
					<View style={[styles.row, styles.totalRow]} wrap={false}>
						<Text style={[styles.cell, styles.bold, { flex: 5 }]}>
							Total paid on this receipt
						</Text>
						<Text style={[styles.cell, { flex: 1.8 }]}> </Text>
						<Text
							style={[
								styles.cell,
								styles.bold,
								styles.paid,
								{ flex: 1.8, textAlign: 'right' },
							]}
						>
							{currency} {money(context.receiptTotal)}
						</Text>
						<Text style={[styles.cell, { flex: 1.8 }]}> </Text>
						<Text style={[styles.cell, { flex: 1.8 }]}> </Text>
					</View>
				</View>

				{/* ── Installment position ───────────────────────────────── */}
				{installments.length > 0 && (
					<>
						<Text style={styles.sectionTitle}>Installment Position</Text>
						<View style={styles.table}>
							<View style={[styles.row, styles.headRow]}>
								<Text style={[styles.cell, styles.cellHead, { flex: 3 }]}>
									Installment
								</Text>
								<Text
									style={[
										styles.cell,
										styles.cellHead,
										{ flex: 2, textAlign: 'right' },
									]}
								>
									Expected
								</Text>
								<Text
									style={[
										styles.cell,
										styles.cellHead,
										{ flex: 2, textAlign: 'right' },
									]}
								>
									Paid
								</Text>
								<Text
									style={[
										styles.cell,
										styles.cellHead,
										{ flex: 2, textAlign: 'right' },
									]}
								>
									Outstanding
								</Text>
							</View>
							{installments.map((installment) => (
								<View
									style={styles.row}
									key={installment.installmentId}
									wrap={false}
								>
									<Text style={[styles.cell, { flex: 3 }]}>
										{installment.label}
									</Text>
									<Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>
										{money(installment.expected)}
									</Text>
									<Text
										style={[
											styles.cell,
											styles.paid,
											{ flex: 2, textAlign: 'right' },
										]}
									>
										{money(installment.paid)}
									</Text>
									<Text
										style={[
											styles.cell,
											styles.bold,
											installment.outstanding > 0 ? styles.due : styles.paid,
											{ flex: 2, textAlign: 'right' },
										]}
									>
										{money(installment.outstanding)}
									</Text>
								</View>
							))}
						</View>
					</>
				)}

				{/* ── Year position ──────────────────────────────────────── */}
				<View style={styles.summaryWrap}>
					<View style={styles.summaryCard}>
						<Text style={styles.summaryLabel}>Total Assessed ({currency})</Text>
						<Text style={styles.summaryValue}>{money(overall.expected)}</Text>
					</View>
					<View style={styles.summaryCard}>
						<Text style={styles.summaryLabel}>Balance Outstanding</Text>
						<Text
							style={[
								styles.summaryValue,
								overall.outstanding > 0 ? styles.due : styles.paid,
							]}
						>
							{money(overall.outstanding)}
						</Text>
					</View>
				</View>

				{/* ── Verification + signature ───────────────────────────── */}
				<View style={styles.footerWrap}>
					<View style={styles.qrBox}>
						{qrDataUrl ? (
							<Image src={qrDataUrl} style={styles.qr} />
						) : (
							<View style={styles.qr} />
						)}
						<Text style={styles.qrCaption}>
							Scan to verify this receipt
						</Text>
					</View>
					<Text style={styles.note}>
						This receipt was generated electronically by the{' '}
						{school?.identity?.name || 'school'} e-Potal System and is valid
						without a signature. Outstanding balances shown reflect the
						student&apos;s position at the time of printing and are based on the{' '}
						{context.academicYear} fee schedule with scholarships applied.
						Amounts are stated in {currency}.
					</Text>
					<View style={styles.signature}>
						<View style={styles.signatureLine} />
						<Text style={styles.signatureLabel}>Authorised Signature</Text>
					</View>
				</View>

				<Text style={styles.stamp} fixed>
					{payment.receiptNumber} · {payment.paymentDate} {payment.paymentTime}
				</Text>
				<Text
					style={styles.pageNumber}
					render={({ pageNumber, totalPages }) =>
						`Page ${pageNumber} of ${totalPages}`
					}
					fixed
				/>
			</Page>
		</Document>
	);
};

interface PaymentReceiptPDFProps {
	context: ReceiptContext;
	school: any;
	label?: string;
	className?: string;
}

/**
 * Builds the receipt on demand and hands the browser a blob to download.
 *
 * Deliberately not `usePDF`: that hook renders eagerly on mount, which meant
 * every opened receipt paid the cost of a PDF render whether or not anyone
 * downloaded it, and its container is only created inside the hook's own mount
 * effect — calling the returned updater before that settles blows up. Building
 * on click sidesteps both and matches how the student receipt already worked.
 */
const PaymentReceiptPDF: React.FC<PaymentReceiptPDFProps> = ({
	context,
	school,
	label = 'Generate Receipt',
	className = '',
}) => {
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleGenerate = useCallback(async () => {
		if (generating || !school) return;
		setGenerating(true);
		setError(null);
		let objectUrl: string | null = null;
		try {
			// A missing QR must not block the receipt.
			const qrDataUrl = await QRCode.toDataURL(context.verifyUrl, {
				errorCorrectionLevel: 'M',
				margin: 1,
				width: 256,
				color: { dark: '#0f172a', light: '#FFFFFF' },
			}).catch(() => null);

			const blob = await pdf(
				<ReceiptDocument
					context={context}
					school={school}
					qrDataUrl={qrDataUrl}
				/>,
			).toBlob();

			objectUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = `Receipt_${context.payment.receiptNumber}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (err) {
			console.error('Failed to generate receipt:', err);
			setError('Could not generate the receipt. Please try again.');
		} finally {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
			setGenerating(false);
		}
	}, [context, school, generating]);

	return (
		<span className="inline-flex flex-col items-end gap-1">
			<button
				type="button"
				onClick={handleGenerate}
				disabled={generating || !school}
				className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
					generating || !school
						? 'cursor-not-allowed bg-muted text-muted-foreground'
						: 'bg-primary text-primary-foreground hover:bg-primary/90'
				} ${className}`}
			>
				{generating ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Download className="h-4 w-4" />
				)}
				{generating ? 'Generating…' : label}
			</button>
			{error && <span className="text-xs text-destructive">{error}</span>}
		</span>
	);
};

export default PaymentReceiptPDF;
