'use client';

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

/**
 * Exam clearance slips, four to a landscape page.
 *
 * Visual language matches the other official documents (Attestation,
 * Graduation Clearance): navy header rule, school identity from real profile
 * data, QR verification block. There is no sheet-colour theming — these are
 * official records, and one consistent treatment across every document the
 * school issues is the point.
 *
 * Only students who have actually cleared the selected installment reach this
 * component; the balance check happens upstream, so a printed slip always
 * means what it says.
 */

const NAVY = '#1e3a8a';
const INK = '#1e293b';
const MUTED = '#4b5563';
const RULE = '#d1d5db';

export interface ClearanceStudentEntry {
	name: string;
	studentId: string;
	className: string;
	qrDataUrl: string | null;
	verifyUrl: string;
}

export interface ClearanceSchool {
	name: string;
	address: string;
	contact: string;
	logoUrl: string;
	logoUrl2: string;
}

type ClearanceDocumentProps = {
	students: ClearanceStudentEntry[];
	period: string;
	installment: string;
	className: string;
	academicYear: string;
	/** Blank slips to fill in by hand — no names, no balances, no QR. */
	isBlank: boolean;
	school: ClearanceSchool;
	/** How many blank slips to produce. */
	blankCount?: number;
};

const styles = StyleSheet.create({
	page: { padding: 18, backgroundColor: '#ffffff' },
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		alignContent: 'space-between',
		height: '100%',
	},
	card: {
		width: '48.8%',
		height: '48.8%',
		borderWidth: 1,
		borderColor: NAVY,
		borderRadius: 8,
		padding: 12,
		flexDirection: 'column',
		position: 'relative',
		overflow: 'hidden',
	},
	watermark: {
		position: 'absolute',
		top: '22%',
		left: '25%',
		width: '50%',
		opacity: 0.05,
		zIndex: -1,
	},
	letterhead: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1.5,
		borderBottomColor: NAVY,
		paddingBottom: 6,
		marginBottom: 8,
	},
	logo: { width: 30, height: 30, marginRight: 8, objectFit: 'contain' },
	schoolInfo: { flex: 1 },
	schoolName: {
		fontSize: 11,
		fontWeight: 'bold',
		color: NAVY,
		textTransform: 'uppercase',
	},
	schoolMeta: { fontSize: 5.5, color: MUTED, marginTop: 1 },
	title: {
		fontSize: 8,
		color: NAVY,
		fontWeight: 'bold',
		textAlign: 'center',
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 8,
	},
	infoRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 5 },
	label: {
		fontSize: 7,
		fontWeight: 'bold',
		color: NAVY,
		textTransform: 'uppercase',
		width: 42,
	},
	value: {
		flex: 1,
		borderBottomWidth: 0.75,
		borderBottomColor: RULE,
		marginLeft: 4,
		minHeight: 11,
		paddingLeft: 3,
		fontSize: 9,
		fontWeight: 'bold',
		color: INK,
	},
	body: { fontSize: 8.5, lineHeight: 1.45, color: INK, marginTop: 4 },
	bold: { fontWeight: 'bold', color: INK },
	cleared: { fontWeight: 'bold', color: '#15803d' },
	footer: { marginTop: 'auto', paddingTop: 6 },
	footerRow: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
	},
	signature: { flex: 1, marginRight: 6 },
	signatureLine: {
		borderBottomWidth: 1,
		borderBottomColor: NAVY,
		marginBottom: 2,
		marginTop: 12,
	},
	signatureLabel: { fontSize: 7, fontWeight: 'bold', color: NAVY },
	qrBox: { width: 32, height: 32 },
	qrCaption: { fontSize: 4.5, color: MUTED, textAlign: 'center', marginTop: 1 },
});

const ClearanceCard = ({
	student,
	period,
	installment,
	className,
	isBlank,
	school,
}: {
	student: ClearanceStudentEntry | null;
	period: string;
	installment: string;
	className: string;
	isBlank: boolean;
	school: ClearanceSchool;
}) => (
	<View style={styles.card}>
		{school.logoUrl2 ? <Image src={school.logoUrl2} style={styles.watermark} /> : null}

		<View style={styles.letterhead}>
			{school.logoUrl ? <Image style={styles.logo} src={school.logoUrl} /> : null}
			<View style={styles.schoolInfo}>
				<Text style={styles.schoolName}>{school.name}</Text>
				{school.address ? <Text style={styles.schoolMeta}>{school.address}</Text> : null}
				{school.contact ? <Text style={styles.schoolMeta}>{school.contact}</Text> : null}
			</View>
		</View>

		<Text style={styles.title}>{period} Clearance</Text>

		<View style={styles.infoRow}>
			<Text style={styles.label}>Student</Text>
			<Text style={styles.value}>{isBlank ? '' : student?.name}</Text>
		</View>
		<View style={styles.infoRow}>
			<Text style={styles.label}>Class</Text>
			<Text style={styles.value}>{isBlank ? '' : student?.className || className}</Text>
		</View>

		<View style={styles.body}>
			{isBlank ? (
				<Text>
					This is to certify that the above-named student has settled the{' '}
					<Text style={styles.bold}>{installment}</Text> and is cleared to write the{' '}
					<Text style={styles.bold}>{period}</Text>.
				</Text>
			) : (
				<Text>
					This is to certify that <Text style={styles.bold}>{student?.name}</Text> has
					settled the <Text style={styles.bold}>{installment}</Text> and is{' '}
					<Text style={styles.cleared}>cleared</Text> to write the{' '}
					<Text style={styles.bold}>{period}</Text>.
				</Text>
			)}
		</View>

		<View style={styles.footer}>
			<View style={styles.footerRow}>
				<View style={styles.signature}>
					<View style={styles.signatureLine} />
					<Text style={styles.signatureLabel}>Registrar</Text>
				</View>
				{!isBlank && student?.qrDataUrl ? (
					<View>
						<Image style={styles.qrBox} src={student.qrDataUrl} />
						<Text style={styles.qrCaption}>Verify</Text>
					</View>
				) : null}
			</View>
		</View>
	</View>
);

export const ClearanceDocument = ({
	students,
	period,
	installment,
	className,
	academicYear,
	isBlank,
	school,
	blankCount = 8,
}: ClearanceDocumentProps) => {
	const list: (ClearanceStudentEntry | null)[] = isBlank
		? Array.from({ length: blankCount }, () => null)
		: students;

	const pages: (ClearanceStudentEntry | null)[][] = [];
	for (let i = 0; i < list.length; i += 4) {
		pages.push(list.slice(i, i + 4));
	}
	if (pages.length === 0) pages.push([]);

	return (
		<Document>
			{pages.map((group, pageIndex) => (
				<Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
					<View style={styles.grid}>
						{group.map((student, index) => (
							<ClearanceCard
								key={student?.studentId || `blank-${pageIndex}-${index}`}
								student={student}
								period={period}
								installment={installment}
								className={className}
								isBlank={isBlank}
								school={school}
							/>
						))}
					</View>
				</Page>
			))}
		</Document>
	);
};
