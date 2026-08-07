'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Download } from 'lucide-react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	usePDF,
	Image,
} from '@react-pdf/renderer';
import { flattenSchoolAddressLines } from '@/utils/schoolAddresses';
import {
	formatAmount,
	percentOf,
	type CurrencyReport,
	type FinancialReport,
} from '@/utils/financialReport';

interface FinancialReportPDFProps {
	report: FinancialReport;
	school: any;
	preparedBy?: string;
	disabled?: boolean;
	onReadyChange?: (ready: boolean) => void;
}

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		paddingTop: 28,
		paddingRight: 32,
		paddingBottom: 40,
		paddingLeft: 44,
		fontSize: 9,
		color: '#0f172a',
	},
	coverPage: {
		flexDirection: 'column',
		backgroundColor: '#f8fafc',
		paddingTop: 40,
		paddingRight: 44,
		paddingBottom: 40,
		paddingLeft: 60,
		position: 'relative',
	},
	coverAccentBar: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		width: 34,
		backgroundColor: '#e2e8f0',
	},
	coverAccentStripe: {
		position: 'absolute',
		left: 34,
		top: 0,
		bottom: 0,
		width: 6,
		backgroundColor: '#0ea5e9',
	},
	coverBackdrop: {
		position: 'absolute',
		right: -80,
		top: -70,
		width: 340,
		height: 340,
		borderRadius: 170,
		backgroundColor: '#e0f2fe',
		opacity: 0.8,
	},
	coverGlow: {
		position: 'absolute',
		right: 20,
		bottom: -120,
		width: 300,
		height: 300,
		borderRadius: 150,
		backgroundColor: '#bae6fd',
		opacity: 0.35,
	},
	coverHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	coverLogoBox: {
		width: 64,
		height: 64,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	logo: { width: 54, height: 54 },
	coverSchoolBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
	coverSchoolName: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#0f172a',
		textAlign: 'center',
	},
	coverSchoolAddress: {
		fontSize: 10,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 4,
	},
	coverDivider: {
		height: 1,
		backgroundColor: '#e2e8f0',
		marginTop: 18,
		marginBottom: 18,
	},
	coverKicker: {
		fontSize: 9,
		textTransform: 'uppercase',
		letterSpacing: 3,
		color: '#0ea5e9',
		marginBottom: 8,
	},
	coverTitleLarge: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
	coverSubtitle: { fontSize: 10, color: '#475569', marginTop: 8, lineHeight: 1.5 },
	coverMetaGrid: { marginTop: 22, flexDirection: 'row', flexWrap: 'wrap' },
	coverMetaChip: {
		width: '48%',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginBottom: 10,
		marginRight: '4%',
		backgroundColor: '#ffffff',
	},
	coverMetaChipRight: { marginRight: 0 },
	coverMetaChipWide: { width: '100%', marginRight: 0 },
	coverMetaChipLabel: {
		fontSize: 8,
		color: '#64748b',
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
	coverMetaChipValue: {
		fontSize: 11,
		color: '#0f172a',
		fontWeight: 'bold',
		marginTop: 5,
	},
	coverHeadline: {
		marginTop: 6,
		borderWidth: 1,
		borderColor: '#bae6fd',
		borderRadius: 12,
		backgroundColor: '#ffffff',
		padding: 14,
	},
	coverHeadlineRow: { flexDirection: 'row', marginTop: 8 },
	coverHeadlineCell: { flex: 1 },
	coverHeadlineLabel: { fontSize: 8, color: '#64748b' },
	coverHeadlineValue: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#0f172a',
		marginTop: 3,
	},
	coverFooter: { marginTop: 'auto', fontSize: 8, color: '#94a3b8' },

	sectionHeaderBlock: { marginTop: 14, marginBottom: 6 },
	sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
	sectionSubtitle: { fontSize: 8, color: '#64748b', marginTop: 2 },
	currencyBanner: {
		backgroundColor: '#0f172a',
		color: '#ffffff',
		borderRadius: 8,
		paddingVertical: 8,
		paddingHorizontal: 12,
		marginBottom: 6,
	},
	currencyBannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' },
	currencyBannerSubtitle: { fontSize: 8, color: '#cbd5f5', marginTop: 3 },

	kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
	kpiCard: {
		width: '31.33%',
		marginRight: '3%',
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 8,
		padding: 9,
		backgroundColor: '#f8fafc',
	},
	kpiCardLast: { marginRight: 0 },
	kpiLabel: {
		fontSize: 7,
		color: '#64748b',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
	},
	kpiValue: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#0f172a',
		marginTop: 4,
	},
	kpiHint: { fontSize: 7, color: '#94a3b8', marginTop: 3 },

	table: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRightWidth: 0,
		borderBottomWidth: 0,
		marginTop: 4,
	},
	tableRow: { flexDirection: 'row' },
	tableHeaderRow: { backgroundColor: '#e2e8f0' },
	tableFooterRow: { backgroundColor: '#f1f5f9' },
	cell: {
		paddingVertical: 4,
		paddingHorizontal: 5,
		fontSize: 8,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderLeftWidth: 0,
		borderTopWidth: 0,
	},
	cellHeader: { fontWeight: 'bold', fontSize: 7.5, color: '#334155' },
	cellBold: { fontWeight: 'bold' },
	positive: { color: '#047857' },
	negative: { color: '#b91c1c' },
	note: {
		fontSize: 7.5,
		color: '#64748b',
		marginTop: 5,
		lineHeight: 1.4,
	},
	emptyNote: {
		fontSize: 8,
		color: '#94a3b8',
		paddingVertical: 6,
	},
	pageNumber: {
		position: 'absolute',
		bottom: 18,
		right: 32,
		fontSize: 7.5,
		color: '#94a3b8',
	},
	footer: {
		position: 'absolute',
		bottom: 18,
		left: 44,
		fontSize: 7.5,
		color: '#94a3b8',
	},
	watermark: {
		position: 'absolute',
		top: '38%',
		left: '28%',
		opacity: 0.05,
	},
	watermarkImage: { width: 240, height: 240 },
});

type Align = 'left' | 'right' | 'center';

interface Column<T> {
	header: string;
	flex: number;
	align?: Align;
	render: (row: T) => string;
	emphasis?: 'positive' | 'negative' | 'bold';
}

function DataTable<T>({
	columns,
	rows,
	total,
	emptyMessage = 'No data recorded.',
}: {
	columns: Column<T>[];
	rows: T[];
	total?: (string | number)[];
	emptyMessage?: string;
}) {
	if (rows.length === 0) {
		return <Text style={styles.emptyNote}>{emptyMessage}</Text>;
	}
	return (
		<View style={styles.table}>
			<View style={[styles.tableRow, styles.tableHeaderRow]} fixed>
				{columns.map((column, index) => (
					<Text
						key={`h-${index}`}
						style={[
							styles.cell,
							styles.cellHeader,
							{ flex: column.flex, textAlign: column.align || 'left' },
						]}
					>
						{column.header}
					</Text>
				))}
			</View>
			{rows.map((row, rowIndex) => (
				<View style={styles.tableRow} key={`r-${rowIndex}`} wrap={false}>
					{columns.map((column, index) => (
						<Text
							key={`c-${rowIndex}-${index}`}
							style={[
								styles.cell,
								{ flex: column.flex, textAlign: column.align || 'left' },
								column.emphasis === 'positive'
									? styles.positive
									: column.emphasis === 'negative'
										? styles.negative
										: column.emphasis === 'bold'
											? styles.cellBold
											: {},
							]}
						>
							{column.render(row)}
						</Text>
					))}
				</View>
			))}
			{total && (
				<View style={[styles.tableRow, styles.tableFooterRow]} wrap={false}>
					{columns.map((column, index) => (
						<Text
							key={`t-${index}`}
							style={[
								styles.cell,
								styles.cellBold,
								{ flex: column.flex, textAlign: column.align || 'left' },
							]}
						>
							{String(total[index] ?? '')}
						</Text>
					))}
				</View>
			)}
		</View>
	);
}

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
	title,
	subtitle,
}) => (
	<View style={styles.sectionHeaderBlock} wrap={false}>
		<Text style={styles.sectionTitle}>{title}</Text>
		{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
	</View>
);

const KpiCard: React.FC<{
	label: string;
	value: string;
	hint?: string;
	last?: boolean;
}> = ({ label, value, hint, last }) => (
	<View style={[styles.kpiCard, last ? styles.kpiCardLast : {}]}>
		<Text style={styles.kpiLabel}>{label}</Text>
		<Text style={styles.kpiValue}>{value}</Text>
		{hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
	</View>
);

const formatDate = (iso: string) => {
	if (!iso) return '—';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
};

const schoolAddress = (school: any): string =>
	flattenSchoolAddressLines(school?.contact?.addresses)
		.filter(Boolean)
		.join('\n');

const CurrencySection: React.FC<{
	report: FinancialReport;
	currency: CurrencyReport;
	school: any;
}> = ({ report, currency, school }) => {
	const { summary } = currency;
	const money = (value: number) => `${currency.code} ${formatAmount(value)}`;

	return (
		<Page size="A4" style={styles.page}>
			<View style={styles.watermark} fixed>
				{typeof school?.branding?.logoUrl === 'string' &&
				school.branding.logoUrl.trim().length > 0 ? (
					<Image src={school.branding.logoUrl} style={styles.watermarkImage} />
				) : (
					<View style={styles.watermarkImage} />
				)}
			</View>

			<View style={styles.currencyBanner} fixed>
				<Text style={styles.currencyBannerTitle}>
					{currency.label} ({currency.code}) — Financial Report
				</Text>
				<Text style={styles.currencyBannerSubtitle}>
					{report.schoolName} · Academic Year {report.academicYear} · All amounts
					in {currency.code}
				</Text>
			</View>

			{/* ── 1. Executive summary ───────────────────────────────────── */}
			<SectionHeader
				title="1. Executive Summary"
				subtitle="Assessed income, scholarship relief, collections, and receivables"
			/>
			<View style={styles.kpiGrid}>
				<KpiCard
					label="Gross Assessed"
					value={money(summary.gross)}
					hint="Before scholarships"
				/>
				<KpiCard
					label="Scholarships / Waivers"
					value={money(summary.discount)}
					hint={`${percentOf(summary.discount, summary.gross)}% of gross`}
				/>
				<KpiCard
					label="Net Expected Income"
					value={money(summary.expected)}
					hint="Billable receivable"
					last
				/>
				<KpiCard
					label="Total Collected"
					value={money(summary.collected)}
					hint={`${summary.transactions} transactions`}
				/>
				<KpiCard
					label="Outstanding Balance"
					value={money(summary.outstanding)}
					hint="Expected minus collected"
				/>
				<KpiCard
					label="Collection Rate"
					value={`${summary.rate}%`}
					hint={`${summary.studentsFullyPaid} of ${summary.studentsBilled} students cleared`}
					last
				/>
			</View>

			<SectionHeader
				title="2. Cash Position & Payer Status"
				subtitle="How the money arrived and who has settled"
			/>
			<DataTable
				columns={[
					{ header: 'Indicator', flex: 3, render: (r: any) => r.label },
					{ header: 'Value', flex: 2, align: 'right', render: (r: any) => r.value },
					{ header: 'Indicator', flex: 3, render: (r: any) => r.label2 },
					{ header: 'Value', flex: 2, align: 'right', render: (r: any) => r.value2 },
				]}
				rows={[
					{
						label: 'Students billed',
						value: String(summary.studentsBilled),
						label2: 'Transactions recorded',
						value2: String(summary.transactions),
					},
					{
						label: 'Fully paid',
						value: String(summary.studentsFullyPaid),
						label2: 'Average payment',
						value2: money(summary.averagePayment),
					},
					{
						label: 'Partially paid',
						value: String(summary.studentsPartiallyPaid),
						label2: 'Largest single payment',
						value2: money(summary.largestPayment),
					},
					{
						label: 'No payment yet',
						value: String(summary.studentsUnpaid),
						label2: 'Days with collections',
						value2: String(summary.activeDays),
					},
					{
						label: 'First collection',
						value: summary.firstPaymentDate || '—',
						label2: 'Average per active day',
						value2: money(summary.averagePerActiveDay),
					},
					{
						label: 'Latest collection',
						value: summary.lastPaymentDate || '—',
						label2: 'Strongest month',
						value2: `${summary.bestMonthLabel} · ${formatAmount(summary.bestMonthAmount)}`,
					},
				]}
			/>

			{/* ── 3. Cash inflow ─────────────────────────────────────────── */}
			<SectionHeader
				title="3. Cash Inflow by Month"
				subtitle="Fee collections received, in the order they were received"
			/>
			<DataTable
				columns={[
					{ header: 'Month', flex: 2.2, render: (r) => r.label },
					{
						header: 'Txns',
						flex: 1,
						align: 'right',
						render: (r) => String(r.transactions),
					},
					{
						header: 'Inflow',
						flex: 2.2,
						align: 'right',
						render: (r) => formatAmount(r.amount),
						emphasis: 'positive',
					},
					{
						header: '% of Year',
						flex: 1.4,
						align: 'right',
						render: (r) => `${r.share}%`,
					},
					{
						header: 'Cumulative',
						flex: 2.2,
						align: 'right',
						render: (r) => formatAmount(r.cumulative),
					},
				]}
				rows={currency.monthly}
				total={[
					'Total',
					String(summary.transactions),
					formatAmount(summary.collected),
					'100%',
					formatAmount(summary.collected),
				]}
				emptyMessage="No payments recorded for this academic year."
			/>

			{/* ── 4. Income by fee type ──────────────────────────────────── */}
			<SectionHeader
				title="4. Income by Fee Type"
				subtitle="Assessed, discounted, collected, and still owed per fee"
			/>
			<DataTable
				columns={[
					{ header: 'Fee', flex: 3, render: (r) => r.label },
					{
						header: 'Gross',
						flex: 1.9,
						align: 'right',
						render: (r) => formatAmount(r.gross),
					},
					{
						header: 'Discount',
						flex: 1.7,
						align: 'right',
						render: (r) => formatAmount(r.discount),
					},
					{
						header: 'Expected',
						flex: 1.9,
						align: 'right',
						render: (r) => formatAmount(r.expected),
					},
					{
						header: 'Collected',
						flex: 1.9,
						align: 'right',
						render: (r) => formatAmount(r.collected),
						emphasis: 'positive',
					},
					{
						header: 'Outstanding',
						flex: 1.9,
						align: 'right',
						render: (r) => formatAmount(r.outstanding),
						emphasis: 'negative',
					},
					{ header: '%', flex: 1, align: 'right', render: (r) => `${r.rate}%` },
				]}
				rows={currency.byFee}
				total={[
					'Total',
					formatAmount(summary.gross),
					formatAmount(summary.discount),
					formatAmount(summary.expected),
					formatAmount(summary.collected),
					formatAmount(summary.outstanding),
					`${summary.rate}%`,
				]}
			/>

			{/* ── 5. Income by category ──────────────────────────────────── */}
			<SectionHeader
				title="5. Income by Payment Category"
				subtitle="Fee types rolled up into their configured categories"
			/>
			<DataTable
				columns={[
					{ header: 'Category', flex: 3, render: (r) => r.label },
					{
						header: 'Expected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.expected),
					},
					{
						header: 'Collected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.collected),
						emphasis: 'positive',
					},
					{
						header: 'Outstanding',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.outstanding),
						emphasis: 'negative',
					},
					{ header: '%', flex: 1, align: 'right', render: (r) => `${r.rate}%` },
				]}
				rows={currency.byCategory}
			/>

			{/* ── 6. Installments ────────────────────────────────────────── */}
			<SectionHeader
				title="6. Installment Performance"
				subtitle="Payments allocated to installments in due order"
			/>
			<DataTable
				columns={[
					{ header: 'Installment', flex: 3, render: (r) => r.label },
					{
						header: 'Expected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.expected),
					},
					{
						header: 'Collected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.collected),
						emphasis: 'positive',
					},
					{
						header: 'Outstanding',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.outstanding),
						emphasis: 'negative',
					},
					{ header: '%', flex: 1, align: 'right', render: (r) => `${r.rate}%` },
				]}
				rows={currency.byInstallment}
			/>

			{/* ── 7. Sessions ────────────────────────────────────────────── */}
			<SectionHeader
				title="7. Income by Session"
				subtitle="Revenue contribution of each school session"
			/>
			<DataTable
				columns={[
					{ header: 'Session', flex: 3, render: (r) => r.label },
					{
						header: 'Expected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.expected),
					},
					{
						header: 'Collected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.collected),
						emphasis: 'positive',
					},
					{
						header: 'Outstanding',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.outstanding),
						emphasis: 'negative',
					},
					{ header: '%', flex: 1, align: 'right', render: (r) => `${r.rate}%` },
				]}
				rows={currency.bySession}
			/>

			{/* ── 8. Receivables by class ────────────────────────────────── */}
			<SectionHeader
				title="8. Receivables by Class"
				subtitle="Where the outstanding balance is concentrated"
			/>
			<DataTable
				columns={[
					{ header: 'Class', flex: 2.4, render: (r) => r.label },
					{ header: 'Session', flex: 1.6, render: (r) => r.session },
					{ header: 'Level', flex: 1.6, render: (r) => r.level },
					{
						header: 'Students',
						flex: 1.2,
						align: 'right',
						render: (r) => String(r.studentCount),
					},
					{
						header: 'Expected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.expected),
					},
					{
						header: 'Collected',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.collected),
						emphasis: 'positive',
					},
					{
						header: 'Outstanding',
						flex: 2,
						align: 'right',
						render: (r) => formatAmount(r.outstanding),
						emphasis: 'negative',
					},
					{ header: '%', flex: 1, align: 'right', render: (r) => `${r.rate}%` },
				]}
				rows={currency.byClass}
			/>

			{/* ── 9. Scholarships ────────────────────────────────────────── */}
			<SectionHeader
				title="9. Scholarship & Waiver Impact"
				subtitle="Income foregone through awards, by scholarship"
			/>
			<DataTable
				columns={[
					{ header: 'Scholarship', flex: 4, render: (r) => r.label },
					{
						header: 'Fee Awards',
						flex: 1.5,
						align: 'right',
						render: (r) => String(r.awards),
					},
					{
						header: 'Value Granted',
						flex: 2.2,
						align: 'right',
						render: (r) => formatAmount(r.discount),
					},
				]}
				rows={currency.scholarships}
				total={[
					'Total',
					String(
						currency.scholarships.reduce((sum, row) => sum + row.awards, 0),
					),
					formatAmount(summary.discount),
				]}
				emptyMessage="No scholarships or waivers applied for this year."
			/>

			<Text style={styles.note}>
				Expected income is derived from the {report.academicYear} fee schedule
				with student groups and scholarships applied, counting required fees
				only. Collections are recorded payments for the same year; unmatched or
				legacy payments are reported against the immediate-due bucket.
			</Text>

			<Text
				style={styles.pageNumber}
				render={({ pageNumber, totalPages }) =>
					`Page ${pageNumber} of ${totalPages}`
				}
				fixed
			/>
			<Text style={styles.footer} fixed>
				{report.schoolName} · Confidential financial record
			</Text>
		</Page>
	);
};

const FinancialReportDocument: React.FC<{
	report: FinancialReport;
	school: any;
	preparedBy: string;
}> = ({ report, school, preparedBy }) => {
	const currencyLine = report.currencies.length
		? report.currencies.map((c) => c.code).join(', ')
		: '—';
	const headline = report.currencies[0];

	return (
		<Document
			title={`Financial Report ${report.academicYear}`}
			author={report.schoolName}
			subject={`Income and cash flow report for ${report.academicYear}`}
		>
			<Page size="A4" style={styles.coverPage} wrap={false}>
				<View style={styles.coverAccentBar} fixed />
				<View style={styles.coverAccentStripe} fixed />
				<View style={styles.coverBackdrop} fixed />
				<View style={styles.coverGlow} fixed />

				<View style={styles.coverHeader}>
					<View style={styles.coverLogoBox}>
						{typeof school?.branding?.logoUrl2 === 'string' &&
						school.branding.logoUrl2.trim().length > 0 ? (
							<Image src={school.branding.logoUrl2} style={styles.logo} />
						) : (
							<View style={styles.logo} />
						)}
					</View>
					<View style={styles.coverSchoolBlock}>
						<Text style={styles.coverSchoolName}>{report.schoolName}</Text>
						<Text style={styles.coverSchoolAddress}>{schoolAddress(school)}</Text>
					</View>
					<View style={styles.coverLogoBox}>
						{typeof school?.branding?.logoUrl === 'string' &&
						school.branding.logoUrl.trim().length > 0 ? (
							<Image src={school.branding.logoUrl} style={styles.logo} />
						) : (
							<View style={styles.logo} />
						)}
					</View>
				</View>

				<View style={styles.coverDivider} />

				<Text style={styles.coverKicker}>Financial Reports</Text>
				<Text style={styles.coverTitleLarge}>Income & Cash Flow Report</Text>
				<Text style={styles.coverSubtitle}>
					A complete statement of assessed fees, scholarship relief, collections
					received, and outstanding receivables for the academic year — prepared
					for management review, audit, and archival.
				</Text>

				{headline && (
					<View style={styles.coverHeadline}>
						<Text style={styles.coverMetaChipLabel}>
							Headline figures ({headline.code})
						</Text>
						<View style={styles.coverHeadlineRow}>
							<View style={styles.coverHeadlineCell}>
								<Text style={styles.coverHeadlineLabel}>Expected income</Text>
								<Text style={styles.coverHeadlineValue}>
									{formatAmount(headline.summary.expected)}
								</Text>
							</View>
							<View style={styles.coverHeadlineCell}>
								<Text style={styles.coverHeadlineLabel}>Collected</Text>
								<Text style={styles.coverHeadlineValue}>
									{formatAmount(headline.summary.collected)}
								</Text>
							</View>
							<View style={styles.coverHeadlineCell}>
								<Text style={styles.coverHeadlineLabel}>Outstanding</Text>
								<Text style={styles.coverHeadlineValue}>
									{formatAmount(headline.summary.outstanding)}
								</Text>
							</View>
							<View style={styles.coverHeadlineCell}>
								<Text style={styles.coverHeadlineLabel}>Collection rate</Text>
								<Text style={styles.coverHeadlineValue}>
									{headline.summary.rate}%
								</Text>
							</View>
						</View>
					</View>
				)}

				<View style={styles.coverMetaGrid}>
					<View style={styles.coverMetaChip}>
						<Text style={styles.coverMetaChipLabel}>Academic Year</Text>
						<Text style={styles.coverMetaChipValue}>{report.academicYear}</Text>
					</View>
					<View style={[styles.coverMetaChip, styles.coverMetaChipRight]}>
						<Text style={styles.coverMetaChipLabel}>Students Enrolled</Text>
						<Text style={styles.coverMetaChipValue}>
							{report.studentsEnrolled}
						</Text>
					</View>
					<View style={styles.coverMetaChip}>
						<Text style={styles.coverMetaChipLabel}>Currencies Reported</Text>
						<Text style={styles.coverMetaChipValue}>{currencyLine}</Text>
					</View>
					<View style={[styles.coverMetaChip, styles.coverMetaChipRight]}>
						<Text style={styles.coverMetaChipLabel}>Generated</Text>
						<Text style={styles.coverMetaChipValue}>
							{formatDate(report.generatedAt)}
						</Text>
					</View>
					<View style={[styles.coverMetaChip, styles.coverMetaChipWide]}>
						<Text style={styles.coverMetaChipLabel}>Prepared By</Text>
						<Text style={styles.coverMetaChipValue}>{preparedBy}</Text>
					</View>
				</View>

				<Text style={styles.coverFooter}>
					Confidential • For official use only • Generated by the{' '}
					{report.schoolName} e-Potal System
				</Text>
			</Page>

			{report.currencies.map((currency) => (
				<CurrencySection
					key={currency.code}
					report={report}
					currency={currency}
					school={school}
				/>
			))}
		</Document>
	);
};

const FinancialReportPDF: React.FC<FinancialReportPDFProps> = ({
	report,
	school,
	preparedBy = 'School Administration',
	disabled = false,
	onReadyChange,
}) => {
	const [instance, updateInstance] = usePDF();
	const lastRenderKeyRef = useRef('');

	const fileName = `Financial_Report_${(report.academicYear || 'year').replace(
		/\//g,
		'-',
	)}_${new Date().toISOString().split('T')[0]}.pdf`;

	const doc = useMemo(() => {
		if (!school || report.currencies.length === 0) return null;
		return (
			<FinancialReportDocument
				report={report}
				school={school}
				preparedBy={preparedBy}
			/>
		);
	}, [report, school, preparedBy]);

	// Cheap fingerprint of everything the document renders, so the (expensive)
	// PDF render only re-runs when the numbers actually change.
	const docRenderKey = useMemo(() => {
		if (!doc) return '';
		return [
			report.schoolName,
			report.academicYear,
			report.studentsEnrolled,
			preparedBy,
			...report.currencies.map((currency) =>
				[
					currency.code,
					currency.summary.gross,
					currency.summary.discount,
					currency.summary.expected,
					currency.summary.collected,
					currency.summary.transactions,
					currency.byFee.length,
					currency.byClass.length,
					currency.monthly.length,
					currency.byInstallment.length,
					currency.scholarships.length,
				].join(':'),
			),
		].join('||');
	}, [doc, report, preparedBy]);

	useEffect(() => {
		if (!doc || !docRenderKey) return;
		if (lastRenderKeyRef.current === docRenderKey) return;
		lastRenderKeyRef.current = docRenderKey;

		let timeoutId: number | null = null;
		let idleId: number | null = null;
		const run = () => updateInstance(doc);
		if (typeof (window as any).requestIdleCallback === 'function') {
			idleId = (window as any).requestIdleCallback(run, { timeout: 1000 });
		} else {
			timeoutId = window.setTimeout(run, 0);
		}
		return () => {
			if (timeoutId !== null) window.clearTimeout(timeoutId);
			if (
				idleId !== null &&
				typeof (window as any).cancelIdleCallback === 'function'
			) {
				(window as any).cancelIdleCallback(idleId);
			}
		};
	}, [doc, docRenderKey, updateInstance]);

	const isReady = Boolean(instance.url) && !instance.loading && !!doc;

	useEffect(() => {
		onReadyChange?.(isReady);
	}, [isReady, onReadyChange]);

	return (
		<a
			href={isReady ? instance.url! : undefined}
			download={isReady ? fileName : undefined}
			className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
				disabled || !isReady
					? 'cursor-not-allowed bg-muted text-muted-foreground'
					: 'bg-primary text-primary-foreground hover:bg-primary/90'
			}`}
			aria-disabled={disabled || !isReady}
			onClick={(event) => {
				if (disabled || !isReady) event.preventDefault();
			}}
		>
			<Download className="h-4 w-4" />
			{!doc
				? 'No data to export'
				: instance.loading || !isReady
					? 'Preparing PDF…'
					: 'Download PDF'}
		</a>
	);
};

export default FinancialReportPDF;
