'use client';

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { getFirstSchoolAddressLines } from '@/utils/schoolAddresses';

/**
 * The graduation letter itself — one titled fee item per real bill under the
 * school's designated graduation-fee category, plus the narrative facts
 * (deadline, ceremony date, late fee, cutoffs) the admin entered for this
 * batch. Visual language matches Attestation.tsx: navy header, QR block, a
 * single Principal signature.
 */

export interface GraduationFeeItem {
	label: string;
	amount: number;
	currency: string;
}

export interface GraduationClearanceData {
	studentName: string;
	className: string;
	academicYear: string;
	date: string;
	graduationYear: string;
	items: GraduationFeeItem[];
	totalsByCurrency: Record<string, number>;
	paymentDeadline: string;
	ceremonyDate: string;
	lateFeeAmount: string;
	lateFeeCurrency: string;
	lateFeeCutoff: string;
	finalCutoff: string;
	outstandingByCurrency: Record<string, number>;
	principal: { name: string; title: string; resolved: boolean };
	qrDataUrl: string | null;
	verifyUrl: string;
}

const styles = StyleSheet.create({
	page: {
		padding: 50,
		fontFamily: 'Helvetica',
		fontSize: 11,
	},
	watermark: {
		position: 'absolute',
		top: '25%',
		left: '25%',
		width: '50%',
		opacity: 0.08,
		zIndex: -1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 26,
		borderBottomWidth: 2,
		borderBottomColor: '#1e3a8a',
		paddingBottom: 15,
	},
	logo: { width: 60, height: 60, marginRight: 15 },
	headerText: { textAlign: 'center' },
	schoolName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#1e3a8a',
		textTransform: 'uppercase',
	},
	schoolInfo: { fontSize: 9, color: '#4b5563', marginTop: 2 },
	title: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
		textTransform: 'uppercase',
		color: '#1e3a8a',
		marginBottom: 4,
	},
	studentLine: {
		fontSize: 12,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 18,
	},
	body: { lineHeight: 1.7, textAlign: 'justify', fontSize: 11 },
	paragraph: { marginBottom: 12 },
	requirementsHeading: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#1e3a8a',
		marginTop: 4,
		marginBottom: 8,
		textTransform: 'uppercase',
	},
	requirementRow: { flexDirection: 'row', marginBottom: 6 },
	requirementIndex: { width: 18, fontWeight: 'bold', color: '#1e3a8a' },
	requirementText: { flex: 1 },
	totalRow: {
		marginTop: 6,
		marginBottom: 14,
		fontWeight: 'bold',
		color: '#1e3a8a',
	},
	balanceBox: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 6,
		padding: 12,
		marginBottom: 16,
		backgroundColor: '#f9fafb',
	},
	balanceBoxCleared: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
	balanceBoxDue: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
	balanceLabel: {
		fontSize: 9,
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: 1,
		color: '#4b5563',
	},
	balanceValueOk: { fontSize: 12, fontWeight: 'bold', color: '#15803d', marginTop: 3 },
	balanceValueDue: { fontSize: 12, fontWeight: 'bold', color: '#b91c1c', marginTop: 3 },
	closing: { fontSize: 11, marginTop: 6, marginBottom: 4 },
	qrSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 16,
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 6,
		padding: 14,
		backgroundColor: '#f9fafb',
	},
	qrInfo: { flex: 1, paddingRight: 12 },
	qrLabel: {
		fontSize: 11,
		fontWeight: 'bold',
		color: '#1e3a8a',
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	qrHint: { fontSize: 9, color: '#6b7280', marginTop: 4, lineHeight: 1.5 },
	verifyUrl: { fontSize: 7, color: '#9ca3af', marginTop: 4 },
	qrBox: { width: 90, height: 90 },
	qr: { width: '100%', height: '100%' },
	footer: { marginTop: 32 },
	sigBlock: {
		width: '55%',
		marginTop: 30,
		borderTopWidth: 1,
		borderTopColor: '#1e3a8a',
		paddingTop: 6,
		fontSize: 10,
		fontWeight: 'bold',
		color: '#1e3a8a',
	},
	sigTitle: { fontSize: 9, fontWeight: 'normal', color: '#4b5563', marginTop: 2 },
});

export const GraduationClearanceDocument = ({
	data,
	school,
}: {
	data: GraduationClearanceData;
	school: any;
}) => {
	const schoolName = school?.identity?.name || 'School';
	const schoolLogo = school?.branding?.logoUrl || '';
	const schoolAddress = getFirstSchoolAddressLines(school?.contact?.addresses).join('\n');
	const schoolContact = (school?.contact?.phones || []).join(' / ');

	const currencies = Object.keys(data.totalsByCurrency);
	const cleared = Object.values(data.outstandingByCurrency).every((v) => v <= 0);

	let requirementIndex = 0;
	const nextIndex = () => {
		requirementIndex += 1;
		return requirementIndex;
	};

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{schoolLogo ? <Image src={schoolLogo} style={styles.watermark} /> : null}

				<View style={styles.header}>
					{schoolLogo ? <Image src={schoolLogo} style={styles.logo} /> : null}
					<View style={styles.headerText}>
						<Text style={styles.schoolName}>{schoolName}</Text>
						{schoolAddress ? <Text style={styles.schoolInfo}>{schoolAddress}</Text> : null}
						{schoolContact ? <Text style={styles.schoolInfo}>{schoolContact}</Text> : null}
					</View>
				</View>

				<Text style={styles.title}>Preliminary Clearance {data.graduationYear}</Text>
				<Text style={styles.studentLine}>{data.studentName}</Text>

				<View style={styles.body}>
					<Text style={styles.paragraph}>Dear Student {data.studentName},</Text>
					<Text style={styles.paragraph}>
						Having thoroughly viewed your academic performance, taking into
						consideration the curriculum prescribed by the Ministry of
						Education, in line with our school policies and standards set, we
						are pleased to inform you that you have satisfactorily completed
						all academic requirements of {schoolName}.
					</Text>
					<Text style={styles.paragraph}>
						Therefore, you can proceed to the office of the registrar for an
						update on your financial status with the school. Meanwhile, below
						is a list of requirements for this year&apos;s graduation ceremony.
					</Text>

					<View>
						{data.items.map((item) => (
							<View style={styles.requirementRow} key={item.label}>
								<Text style={styles.requirementIndex}>{nextIndex()}.</Text>
								<Text style={styles.requirementText}>
									Pay {item.label} of {item.currency} {item.amount.toFixed(2)}
								</Text>
							</View>
						))}
						{currencies.length > 0 && (
							<Text style={styles.totalRow}>
								Total fee:{' '}
								{currencies
									.map((c) => `${c} ${data.totalsByCurrency[c].toFixed(2)}`)
									.join(' + ')}
							</Text>
						)}
						{data.paymentDeadline && (
							<View style={styles.requirementRow}>
								<Text style={styles.requirementIndex}>{nextIndex()}.</Text>
								<Text style={styles.requirementText}>
									The deadline for this payment is {data.paymentDeadline}.
								</Text>
							</View>
						)}
						{data.ceremonyDate && (
							<View style={styles.requirementRow}>
								<Text style={styles.requirementIndex}>{nextIndex()}.</Text>
								<Text style={styles.requirementText}>
									Graduation is {data.ceremonyDate}.
								</Text>
							</View>
						)}
						{data.lateFeeAmount && (
							<View style={styles.requirementRow}>
								<Text style={styles.requirementIndex}>{nextIndex()}.</Text>
								<Text style={styles.requirementText}>
									Late payment made after the deadline warrants a fine of{' '}
									{data.lateFeeCurrency} {data.lateFeeAmount}
									{data.lateFeeCutoff ? `, through ${data.lateFeeCutoff}` : ''}.
								</Text>
							</View>
						)}
						{data.finalCutoff && (
							<View style={styles.requirementRow}>
								<Text style={styles.requirementIndex}>{nextIndex()}.</Text>
								<Text style={styles.requirementText}>
									Absolutely no payment will be accepted after {data.finalCutoff}.
								</Text>
							</View>
						)}
					</View>

					<View style={[styles.balanceBox, cleared ? styles.balanceBoxCleared : styles.balanceBoxDue]}>
						<Text style={styles.balanceLabel}>Current Account Status</Text>
						{cleared ? (
							<Text style={styles.balanceValueOk}>
								Zero balance — tuition, graduation fees, and all other fees are
								settled as of {data.date}.
							</Text>
						) : (
							<Text style={styles.balanceValueDue}>
								Outstanding balance as of {data.date}:{' '}
								{Object.entries(data.outstandingByCurrency)
									.filter(([, amount]) => amount > 0)
									.map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
									.join(', ')}
							</Text>
						)}
						<Text style={{ fontSize: 8, color: '#6b7280', marginTop: 4 }}>
							No student will be allowed to take part in the graduation
							exercise without a zero balance — this includes tuition,
							graduation fees, and all other fees on record.
						</Text>
					</View>

					<Text style={styles.closing}>Please accept our congratulations!</Text>
					<Text style={styles.closing}>Kindest regards,</Text>
				</View>

				<View style={styles.qrSection}>
					<View style={styles.qrInfo}>
						<Text style={styles.qrLabel}>Scan to Verify</Text>
						<Text style={styles.qrHint}>
							Scan to confirm this student&apos;s real, current balance and
							graduation-fee status online.
						</Text>
						<Text style={styles.verifyUrl}>{data.verifyUrl}</Text>
					</View>
					<View style={styles.qrBox}>
						{data.qrDataUrl ? <Image src={data.qrDataUrl} style={styles.qr} /> : null}
					</View>
				</View>

				<View style={styles.footer}>
					<Text style={{ fontSize: 11 }}>Signed: _____________________________</Text>
					<View style={styles.sigBlock}>
						<Text>{data.principal.resolved ? data.principal.name : ' '}</Text>
						<Text style={styles.sigTitle}>
							{data.principal.title || 'Principal'}, {schoolName}
						</Text>
					</View>
				</View>
			</Page>
		</Document>
	);
};
