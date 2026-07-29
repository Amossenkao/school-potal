'use client';

import {
	Document,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
} from '@react-pdf/renderer';

export type ThemeOption = {
	name: string;
	bg: string;
	theme: string;
	text: string;
};

export type ClearanceCardProps = {
	studentName: string;
	grade: string;
	period: string;
	installment: string;
	theme: ThemeOption;
	isAnonymous: boolean;
	division: string;
};

type ClearanceDocumentProps = {
	students: string[];
	grade: string;
	period: string;
	installment: string;
	theme: ThemeOption;
	isAnonymous: boolean;
	division: string;
};

const LOGO_URL =
	'https://res.cloudinary.com/dcalueltd/image/upload/v1753368059/school-management-system/uca/logo.png';
const LOGO_URL2 =
	'https://res.cloudinary.com/dcalueltd/image/upload/v1753484515/school-management-system/uca/uca_logo2_kqlgdl.png';

const createPdfStyles = (theme: ThemeOption) =>
	StyleSheet.create({
		page: {
			padding: 20,
			backgroundColor: '#ffffff',
		},
		card: {
			width: '48.5%',
			height: '48.5%',
			borderWidth: 3,
			borderColor: theme.theme,
			borderRadius: 12,
			padding: 4,
			position: 'relative',
			overflow: 'hidden',
		},
		innerBorder: {
			flex: 1,
			borderWidth: 1,
			borderColor: theme.theme,
			borderRadius: 8,
			padding: 15,
			backgroundColor: 'rgba(255,255,255,0.92)',
			flexDirection: 'column',
		},
		watermarkContainer: {
			position: 'absolute',
			top: '20%',
			left: '20%',
			width: '60%',
			height: '60%',
			opacity: 0.18,
			zIndex: -1,
		},
		watermarkImage: {
			width: '100%',
			height: '100%',
			objectFit: 'contain',
		},
		letterhead: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			borderBottomWidth: 1.5,
			borderBottomColor: theme.theme,
			paddingBottom: 8,
			marginBottom: 10,
		},
		logoImage: {
			width: 45,
			height: 45,
			objectFit: 'contain',
		},
		schoolInfo: {
			flex: 1,
			textAlign: 'center',
		},
		schoolName: {
			fontSize: 14,
			fontWeight: 'bold',
			color: theme.theme,
			textTransform: 'uppercase',
			letterSpacing: 1,
		},
		schoolAddress: {
			fontSize: 6.5,
			color: theme.text,
			marginTop: 1,
		},
		titleBar: {
			backgroundColor: theme.theme,
			paddingVertical: 5,
			borderRadius: 4,
			marginBottom: 12,
		},
		titleText: {
			fontSize: 10,
			color: '#ffffff',
			textAlign: 'center',
			fontWeight: 'bold',
			textTransform: 'uppercase',
			letterSpacing: 1.5,
		},
		detailsSection: {
			marginBottom: 8,
		},
		infoRow: {
			fontSize: 11,
			flexDirection: 'row',
			marginBottom: 6,
			alignItems: 'flex-end',
		},
		label: {
			fontWeight: 'bold',
			width: 60,
			color: theme.theme,
			fontSize: 10,
			textTransform: 'uppercase',
		},
		valueUnderline: {
			flex: 1,
			borderBottomWidth: 1,
			borderBottomColor: '#cccccc',
			marginLeft: 5,
			minHeight: 14,
			paddingLeft: 5,
		},
		boldValue: {
			fontWeight: 'bold',
			color: '#000000',
			fontSize: 12,
		},
		clearanceText: {
			fontSize: 13,
			lineHeight: 1.45,
			marginTop: 8,
			color: theme.text,
		},
		bold: {
			fontWeight: 'bold',
			color: '#000000',
		},
		footer: {
			marginTop: 'auto',
			paddingTop: 10,
			alignItems: 'center',
			width: '100%',
		},
		signatureRow: {
			flexDirection: 'row',
			alignItems: 'flex-end',
			width: '80%',
			marginTop: 20,
		},
		signedLabel: {
			fontSize: 11,
			fontWeight: 'bold',
			color: theme.theme,
			marginRight: 4,
		},
		line: {
			flex: 1,
			borderBottomWidth: 1.5,
			borderBottomColor: theme.theme,
		},
		registrar: {
			fontSize: 11,
			marginTop: 4,
			fontWeight: 'bold',
			color: theme.theme,
			textAlign: 'center',
		},
	});

const ClearanceCard = ({
	studentName,
	grade,
	period,
	installment,
	theme,
	isAnonymous,
	division,
}: ClearanceCardProps) => {
	const s = createPdfStyles(theme);

	return (
		<View style={s.card}>
			<View style={s.innerBorder}>
				<View style={s.watermarkContainer}>
					<Image style={s.watermarkImage} src={LOGO_URL2} />
				</View>

				<View style={s.letterhead}>
					<Image style={s.logoImage} src={LOGO_URL2} />
					<View style={s.schoolInfo}>
						<Text style={s.schoolName}>Upstairs Christian Academy</Text>
						<Text style={s.schoolAddress}>
							Unity Town, Pipeline Road Lower Johnsonville
						</Text>
						<Text style={s.schoolAddress}>
							PO Box 2553 Montserrado County, Liberia
						</Text>
						<Text style={s.schoolAddress}>
							Cell#: 0886851802/0770851802/0886022009
						</Text>
					</View>
					<Image style={s.logoImage} src={LOGO_URL} />
				</View>

				<View style={s.titleBar}>
					<Text style={s.titleText}>
						{division} • {period == "Mock" ? period : `${period} Period Exam`} Clearance
					</Text>
				</View>

				<View style={s.detailsSection}>
					<View style={s.infoRow}>
						<Text style={s.label}>Student:</Text>
						<View style={s.valueUnderline}>
							{!isAnonymous && <Text style={s.boldValue}>{studentName}</Text>}
						</View>
					</View>
					<View style={s.infoRow}>
						<Text style={s.label}>Class:</Text>
						<View style={s.valueUnderline}>
							{!isAnonymous && <Text style={s.boldValue}>{grade}</Text>}
						</View>
					</View>
				</View>

				<View style={s.clearanceText}>
					<Text>
						This is to certify that{' '}
						{isAnonymous ? (
							<Text>______________________</Text>
						) : (
							<Text style={s.bold}>{studentName}</Text>
						)}{' '}
						has fully paid the <Text style={s.bold}>{installment == "Final" ? "All required Payments" : `${installment} installment`}</Text>,
						and is cleared to write the{' '}
						<Text style={s.bold}>{period == "Mock" ? "Mock Exam" : `${period} Period Exam`}</Text>.
					</Text>
				</View>

				<View style={s.footer}>
					<View style={s.signatureRow}>
						<Text style={s.signedLabel}>Signed:</Text>
						<View style={s.line} />
					</View>
					<Text style={s.registrar}>The Registrar</Text>
				</View>
			</View>
		</View>
	);
};

export const ClearanceDocument = ({
	students,
	grade,
	period,
	installment,
	theme,
	isAnonymous,
	division,
}: ClearanceDocumentProps) => {
	const list = isAnonymous ? ['', '', '', ''] : students;
	const chunks: string[][] = [];

	for (let i = 0; i < list.length; i += 4) {
		chunks.push(list.slice(i, i + 4));
	}

	return (
		<Document>
			{chunks.map((group, pageIndex) => (
				<Page
					key={pageIndex}
					size="A4"
					orientation="landscape"
					style={createPdfStyles(theme).page}
				>
					<View
						style={{
							flexDirection: 'row',
							flexWrap: 'wrap',
							justifyContent: 'space-between',
							alignContent: 'space-between',
							height: '100%',
						}}
					>
						{group.map((student, index) => (
							<ClearanceCard
								key={`${student}-${index}`}
								studentName={student}
								grade={grade}
								period={period}
								installment={installment}
								theme={theme}
								isAnonymous={isAnonymous}
								division={division}
							/>
						))}
					</View>
				</Page>
			))}
		</Document>
	);
};

export const SHEET_COLORS = [
	{ name: 'White', bg: '#ffffff', theme: '#1e3a8a', text: '#1e293b' },
	{ name: 'Blue', bg: '#ffffff', theme: '#172554', text: '#000000' },
	{ name: 'Yellow', bg: '#ffffff', theme: '#000000', text: '#000000' },
	{ name: 'Pink', bg: '#ffffff', theme: '#701a75', text: '#000000' },
];

export const PERIODS = ['1st', '2nd', '3rd', '4th', '5th', '6th', 'Mock'];
