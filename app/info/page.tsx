'use client';

import React from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	PDFViewer,
	Image,
} from '@react-pdf/renderer';

const colors = {
	ink: '#2f2f2a',
	inkSoft: '#4a4a43',
	accent: '#c78463',
	tan: '#b77c5d',
	paper: '#ffffff',
	warm: '#f3f1ee',
	line: '#1f1f1b',
	muted: '#8a8a84',
};

const styles = StyleSheet.create({
	bookletPage: {
		flexDirection: 'row',
		backgroundColor: colors.paper,
		padding: 24,
		fontFamily: 'Times-Roman',
		color: colors.ink,
	},
	subPage: {
		flexGrow: 1,
		flexBasis: 0,
		padding: 18,
		position: 'relative',
		border: '2pt solid #b08e74',
		borderRadius: 6,
		backgroundColor: colors.warm,
	},
	innerFrame: {
		position: 'absolute',
		top: 10,
		left: 10,
		right: 10,
		bottom: 10,
		border: '1pt dashed #c7a887',
		borderRadius: 4,
	},
	pageTexture: {
		position: 'absolute',
		top: 12,
		left: 12,
		right: 12,
		bottom: 12,
		borderRadius: 6,
		border: '1pt solid rgba(0,0,0,0.06)',
	},
	pageStamp: {
		position: 'absolute',
		top: 18,
		left: 18,
		width: 26,
		height: 26,
		borderRadius: 6,
		border: '1pt solid rgba(47,47,42,0.2)',
		transform: [{ rotate: '12deg' }],
	},
	pageStampInner: {
		position: 'absolute',
		top: 4,
		left: 4,
		right: 4,
		bottom: 4,
		borderRadius: 4,
		border: '1pt dashed rgba(47,47,42,0.25)',
	},
	pageRibbon: {
		position: 'absolute',
		top: 18,
		right: 18,
		width: 80,
		height: 6,
		borderRadius: 999,
		backgroundColor: 'rgba(199,132,99,0.35)',
	},
	corner: {
		position: 'absolute',
		width: 10,
		height: 10,
		borderColor: '#8f7a63',
	},
	cornerTopLeft: {
		top: 6,
		left: 6,
		borderTop: '2pt solid #8f7a63',
		borderLeft: '2pt solid #8f7a63',
	},
	cornerTopRight: {
		top: 6,
		right: 6,
		borderTop: '2pt solid #8f7a63',
		borderRight: '2pt solid #8f7a63',
	},
	cornerBottomLeft: {
		bottom: 6,
		left: 6,
		borderBottom: '2pt solid #8f7a63',
		borderLeft: '2pt solid #8f7a63',
	},
	cornerBottomRight: {
		bottom: 6,
		right: 6,
		borderBottom: '2pt solid #8f7a63',
		borderRight: '2pt solid #8f7a63',
	},
	gutter: {
		width: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	gutterDivider: {
		width: 1,
		height: '100%',
		backgroundColor: '#9f8d77',
	},
	subPageNumber: {
		position: 'absolute',
		bottom: 12,
		left: 0,
		right: 0,
		textAlign: 'center',
		fontSize: 14,
		color: colors.muted,
	},
	timeline: {
		marginTop: 6,
		marginBottom: 10,
	},
	timelineItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 10,
	},
	timelineLine: {
		width: 2,
		backgroundColor: colors.accent,
		marginHorizontal: 6,
		flexGrow: 1,
	},
	timelineDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: colors.accent,
		marginTop: 4,
	},
	timelineText: {
		fontSize: 9,
		color: colors.ink,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	imagePlaceholder: {
		border: '1pt solid #c9c9c2',
		backgroundColor: '#e9e6e1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	imageFill: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100%',
		height: '100%',
	},
	imageLabel: {
		fontSize: 10,
		color: colors.muted,
		letterSpacing: 1,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		color: colors.ink,
		textTransform: 'uppercase',
		lineHeight: 1.05,
	},
	sectionTitleTan: {
		color: colors.ink,
	},
	sectionRule: {
		height: 1,
		backgroundColor: colors.line,
		marginTop: 10,
		marginBottom: 16,
	},
	sectionRuleLight: {
		height: 1,
		backgroundColor: colors.paper,
		marginTop: 10,
		marginBottom: 16,
	},
	subTitle: {
		fontSize: 12,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		color: colors.accent,
		marginBottom: 6,
		textTransform: 'uppercase',
	},
	paragraph: {
		fontSize: 10,
		fontFamily: 'Times-Roman',
		lineHeight: 1.5,
		color: colors.inkSoft,
		marginBottom: 8,
	},
	paragraphLight: {
		color: '#f2f2ee',
	},
	bold: {
		fontWeight: 700,
	},
	bullet: {
		fontSize: 10,
		fontFamily: 'Times-Roman',
		lineHeight: 1.5,
		color: colors.inkSoft,
		marginBottom: 4,
	},
	listItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 4,
	},
	listBullet: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginTop: 4,
		marginRight: 6,
		backgroundColor: colors.accent,
	},
	listText: {
		flex: 1,
		fontSize: 10,
		fontFamily: 'Times-Roman',
		lineHeight: 1.5,
		color: colors.inkSoft,
	},
	bulletLight: {
		color: '#f2f2ee',
	},
	center: {
		textAlign: 'center',
	},
	uppercase: {
		textTransform: 'uppercase',
	},
	coverPage: {
		backgroundColor: colors.tan,
	},
	coverSmall: {
		fontSize: 16,
		letterSpacing: 1.2,
		lineHeight: 1.2,
		fontFamily: 'Helvetica-Bold',
		color: '#3e332b',
		textTransform: 'uppercase',
		textAlign: 'center',
	},
	coverTitle: {
		fontSize: 30,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		letterSpacing: 2,
		color: colors.ink,
		marginTop: 22,
		lineHeight: 1.05,
	},
	coverStudentHandbook: {
		fontSize: 16,
		letterSpacing: 3,
		marginTop: 12,
		fontFamily: 'Helvetica-Bold',
		color: colors.ink,
		textAlign: 'center',
	},
	coverDivider: {
		height: 1,
		backgroundColor: colors.ink,
		marginTop: 10,
		marginBottom: 8,
	},
	coverVertical: {
		fontSize: 26,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		letterSpacing: 2.4,
		color: colors.ink,
		marginTop: 30,
		textAlign: 'justify',
		// transform: [{ rotate: '90deg' }],
		// position: 'absolute',
		// left: -120,
		// top: 120,
		// width: 340,
	},

	coverRightColumn: {
		borderLeft: '2pt solid #6b4b36',
		paddingLeft: 18,
		height: '100%',
	},
	coverImage: {
		width: '100%',
		height: 280,
		marginBottom: 12,
	},
	coverBottomRule: {
		height: 1,
		backgroundColor: colors.ink,
		marginTop: 10,
		marginBottom: 6,
	},
	tocPage: {
		backgroundColor: colors.ink,
	},
	tocTitle: {
		fontSize: 26,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		color: '#f2f2ee',
		marginBottom: 16,
		textTransform: 'uppercase',
	},
	tocItem: {
		fontSize: 10,
		fontFamily: 'Times-Roman',
		color: '#f2f2ee',
		marginBottom: 6,
	},
	tocDivider: {
		width: 1,
		backgroundColor: '#f2f2ee',
		height: '100%',
		position: 'absolute',
		right: 0,
		top: 0,
	},
	statNumber: {
		fontSize: 16,
		fontWeight: 700,
		color: colors.accent,
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 9,
		color: colors.ink,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	miniTitle: {
		fontSize: 13,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		color: colors.ink,
		textTransform: 'uppercase',
		marginBottom: 8,
	},
	miniTitleAccent: {
		color: colors.accent,
	},
	calloutBox: {
		borderLeft: '3pt solid #111',
		paddingLeft: 10,
		marginBottom: 8,
	},
	lineColumn: {
		width: 6,
		alignItems: 'center',
		justifyContent: 'center',
	},
	lineColumnBar: {
		width: 3,
		backgroundColor: '#1f1f1b',
		height: '80%',
		borderRadius: 2,
	},
	circlePlaceholder: {
		width: 110,
		height: 110,
		borderRadius: 55,
		border: '1pt solid #c9c9c2',
		backgroundColor: '#e9e6e1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	teamName: {
		fontSize: 10,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		color: colors.ink,
		marginTop: 6,
	},
	teamRole: {
		fontSize: 9,
		fontFamily: 'Times-Roman',
		color: colors.inkSoft,
	},
	contactPage: {
		backgroundColor: colors.tan,
	},
	contactTitle: {
		fontSize: 15,
		fontWeight: 700,
		letterSpacing: 2,
		fontFamily: 'Helvetica-Bold',
		marginTop: 10,
	},
	contactInfo: {
		fontSize: 10,
		fontFamily: 'Times-Roman',
		color: colors.ink,
		marginTop: 4,
	},
	watermark: {
		position: 'absolute',
		top: '35%',
		left: 0,
		right: 0,
		textAlign: 'center',
		fontSize: 44,
		letterSpacing: 2,
		fontFamily: 'Helvetica-Bold',
		color: '#d8cec2',
		opacity: 0.35,
		transform: [{ rotate: '-30deg' }],
	},
});

const DEFAULT_IMAGE =
	'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';

const ImagePlaceholder = ({
	width,
	height,
	label = '',
	src = DEFAULT_IMAGE,
}) => (
	<View
		style={[styles.imagePlaceholder, { width, height }, { borderWidth: '0' }]}
	>
		<Image src={src} style={styles.imageFill} />
		<Text style={styles.imageLabel}>{label}</Text>
	</View>
);

const CirclePlaceholder = ({ size = 110, label = '', src = DEFAULT_IMAGE }) => (
	<View
		style={[
			styles.circlePlaceholder,
			{ width: size, height: size, borderRadius: size / 2 },
		]}
	>
		<Image src={src} style={[styles.imageFill, { borderRadius: size / 2 }]} />
		<Text style={styles.imageLabel}>{label}</Text>
	</View>
);

const BulletList = ({ items }: { items: string[] }) => (
	<View>
		{items.map((item, index) => (
			<View key={`${item}-${index}`} style={styles.listItem}>
				<View style={styles.listBullet} />
				<Text style={styles.listText}>{item}</Text>
			</View>
		))}
	</View>
);

type PageSlot = {
	content?: React.ReactNode;
	number?: number;
	numberColor?: string;
	style?: object;
};

const BookletPage = ({ left, right }: { left: PageSlot; right: PageSlot }) => (
	<Page size="A4" orientation="landscape" style={styles.bookletPage}>
		<View style={[styles.subPage, left.style]}>
			<View style={[styles.corner, styles.cornerTopLeft]} />
			<View style={[styles.corner, styles.cornerTopRight]} />
			<View style={[styles.corner, styles.cornerBottomLeft]} />
			<View style={[styles.corner, styles.cornerBottomRight]} />
			<View style={styles.innerFrame} />
			<View style={styles.pageTexture} />
			<View style={styles.pageStamp}>
				<View style={styles.pageStampInner} />
			</View>
			<View style={styles.pageRibbon} />
			{left.content}
			{left.number !== undefined ? (
				<Text
					style={[
						styles.subPageNumber,
						{ color: left.numberColor ?? colors.ink },
					]}
				>
					{left.number}
				</Text>
			) : null}
		</View>
		<View style={styles.gutter}>
			<View style={styles.gutterDivider} />
		</View>
		<View style={[styles.subPage, right.style]}>
			<View style={[styles.corner, styles.cornerTopLeft]} />
			<View style={[styles.corner, styles.cornerTopRight]} />
			<View style={[styles.corner, styles.cornerBottomLeft]} />
			<View style={[styles.corner, styles.cornerBottomRight]} />
			<View style={styles.innerFrame} />
			<View style={styles.pageTexture} />
			<View style={styles.pageStamp}>
				<View style={styles.pageStampInner} />
			</View>
			<View style={styles.pageRibbon} />
			{right.content}
			{right.number !== undefined ? (
				<Text
					style={[
						styles.subPageNumber,
						{ color: right.numberColor ?? colors.ink },
					]}
				>
					{right.number}
				</Text>
			) : null}
		</View>
	</Page>
);

const StudentHandbookDocument = () => {
	const tocNumberColor = '#f2f2ee';
	const blankWatermark = (
		<Text style={styles.watermark}>AS SAFA ISLAMIC INSTITUTE</Text>
	);
	const blankPage: PageSlot = { content: blankWatermark };
	const numberedPage = (
		index: number,
		content: React.ReactNode,
		style?: object,
		numberColor?: string,
	): PageSlot => ({
		content,
		style,
		number: index - 2,
		numberColor,
	});

	const coverFront = (
		<View style={styles.coverRightColumn}>
			<ImagePlaceholder width="100%" height={270} src="/Picture1.jpg" />
			<View style={styles.coverBottomRule} />
			<Text style={[styles.coverStudentHandbook, styles.uppercase]}>
				STUDENT HANDBOOK
			</Text>
		</View>
	);
	const coverBack = (
		<View
			style={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}
		>
			<ImagePlaceholder width="95%" height={'100%'} label="" src="/cover.png" />
		</View>
	);

	const toc1Left = (
		<View style={{ height: '100%' }}>
			<Text style={styles.tocTitle}>TABLE OF CONTENTS</Text>
			<View style={{ marginTop: 16 }}>
				<ImagePlaceholder width={350} height={200} src="/Picture2.jpg" />
			</View>
		</View>
	);

	const toc1Right = (
		<View style={{ height: '100%', position: 'relative', fontSize: '14' }}>
			<View style={styles.tocDivider} />
			<Text style={styles.tocItem}>SECTION 1: INTRODUCTION</Text>
			<Text style={styles.tocItem}>1.1 OUR HERITAGE AND ETHOS</Text>
			<Text style={styles.tocItem}>1.2 MISSION& VISION</Text>
			<Text style={styles.tocItem}>1.3 OUR MOTTO</Text>
			<Text style={styles.tocItem}>1.4 EDUCATIONAL PHILOSOPHY</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION 2: ADMISSION
			</Text>
			<Text style={styles.tocItem}>2.1 PLACEMENT EXAMINATION</Text>
			<Text style={styles.tocItem}>2.2 GENERAL ADMISSION PROCEDURES</Text>
			<Text style={styles.tocItem}>2.3 SPECIAL ADMISSION PROCEDURES</Text>
			<Text style={styles.tocItem}>2.3.1 SENIOR HIGH SCHOOL</Text>
			<Text style={styles.tocItem}>2.3.2 EARLY CHILDHOOD EDUCATION (ECE)</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION 3: ACADEMIC EVALUATION & GRADING
			</Text>
			<Text style={styles.tocItem}>3.1 GRADING SYSTEM</Text>
			<Text style={styles.tocItem}>3.2 PERIODIC ACADEMIC HONORS</Text>
			<Text style={styles.tocItem}>
				3.3 PROMOTION CRITERIA (SEMESTER & YEARLY)
			</Text>
			<Text style={styles.tocItem}>3.4 REMEDIAL CLASSES</Text>
			<Text style={styles.tocItem}>3.5 ACADEMIC PROBATION</Text>
			<Text style={styles.tocItem}>3.6 DEMOTION& FAILURE</Text>
			<Text style={styles.tocItem}>
				3.7 SPECIAL STANDARD BOARD EXAMINATIONS
			</Text>
		</View>
	);

	const toc2Left = (
		<View style={{ height: '100%' }}>
			<Text style={styles.tocTitle}>TABLE OF{'\n'}CONTENTS</Text>
			<View style={{ marginTop: 20 }}>
				<Text style={styles.tocItem}>
					SECTION 4: FEES AND TUITION PAYMENT POLICIES
				</Text>
				<Text style={styles.tocItem}>4.1 TUITION& FEES PAYMENT POLICY</Text>
				<Text style={styles.tocItem}>4.2 WAEC/WASSCE FEES</Text>
				<Text style={styles.tocItem}>4.3 OTHER FEES</Text>
				<Text style={[styles.tocItem, { marginTop: 10 }]}>
					SECTION 5: STUDENT UNIFORM & DRESS CODE
				</Text>
				<Text style={styles.tocItem}>5.1 OFFICIAL SCHOOL UNIFORM</Text>
				<Text style={styles.tocItem}>
					5.2 GUIDELINES FOR APPEARANCE& GROOMING
				</Text>
				<Text style={[styles.tocItem, { marginTop: 10 }]}>
					SECTION 5: LABORATORY, COMPUTER LAB & READING ROOM CONDUCT
				</Text>
				<Text style={[styles.tocItem, { marginTop: 10 }]}>
					SECTION 6: EXTRA-CURRICULAR ACTIVITIES
				</Text>
				<Text style={styles.tocItem}>6.1 SCHOLARS PROGRAM</Text>
			</View>
		</View>
	);

	const toc2Right = (
		<View style={{ height: '100%', position: 'relative' }}>
			<View style={styles.tocDivider} />
			<Text style={styles.tocItem}>SECTION 7: ACADEMIC ATTENDANCE</Text>
			<Text style={styles.tocItem}>7.1 TARDINESS& ABSENCES</Text>
			<Text style={styles.tocItem}>7.2 MAKE-UP WORK POLICY</Text>
			<Text style={styles.tocItem}>7.3 EXCUSED ABSENCES</Text>
			<Text style={styles.tocItem}>7.4 CLASS BOYCOTT</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION8: STUDENT BEHAVIOR & CONDUCT
			</Text>
			<Text style={styles.tocItem}>8.2 LOITERING</Text>
			<Text style={styles.tocItem}>8.3 EXIT PASS</Text>
			<Text style={styles.tocItem}>8.4 LANGUAGE POLICY</Text>
			<Text style={styles.tocItem}>8.5 BUSINESS TRANSACTIONS</Text>
			<Text style={styles.tocItem}>
				8.6 INTERPERSONAL RELATIONSHIPS& SOCIAL MEDIA CONDUCT
			</Text>
			<Text style={styles.tocItem}>8.7 GENERAL CONDUCT& ABUSE POLICY</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION 9: CHANNELS OF COMMUNICATION
			</Text>
			<Text style={styles.tocItem}>9.1 GRIEVANCE PROCEDURE</Text>
			<Text style={styles.tocItem}>9.2 OFFICIAL NOTICES</Text>
			<Text style={styles.tocItem}>9.3 POLICY ON ELECTRONIC DEVICES</Text>
		</View>
	);

	const toc3Left = (
		<View style={{ height: '100%' }}>
			<Text style={styles.tocTitle}>TABLE OF{'\n'}CONTENTS</Text>
			<View style={{ marginTop: 20 }}>
				<Text style={styles.tocItem}>SECTION 10: USE OF FACILITIES</Text>
				<Text style={styles.tocItem}>10.1 MISUSE OF RESTROOMS</Text>
				<Text style={[styles.tocItem, { marginTop: 10 }]}>
					SECTION 11: SUSPENSION AND EXPULSION
				</Text>
				<Text style={styles.tocItem}>11.1 SUSPENSION POLICY</Text>
				<Text style={styles.tocItem}>11.2 EXPULSION POLICY</Text>
				<Text style={[styles.tocItem, { marginTop: 10 }]}>
					SECTION 12: PARENT/GUARDIAN COMMUNICATION
				</Text>
				<Text style={styles.tocItem}>
					12.1 PARENT-TEACHER MEETINGS& PROGRAMS
				</Text>
				<Text style={styles.tocItem}>
					12.2 SCHOOL FEES AND FINANCIAL COMMITMENTS
				</Text>
				<Text style={[styles.tocItem, { marginTop: 10 }]}>
					SECTION 13: STUDENT COUNCIL GOVERNMENT
				</Text>
				<Text style={styles.tocItem}>13.1 CLASS LEADERSHIP</Text>
				<Text style={styles.tocItem}>13.2 SCHOOL-WIDE LEADERSHIP</Text>
				<Text style={styles.tocItem}>13.3 IMPEACHMENT& DISSOLUTION</Text>
			</View>
		</View>
	);

	const toc3Right = (
		<View style={{ height: '100%', position: 'relative' }}>
			<View style={styles.tocDivider} />
			<Text style={styles.tocItem}>SECTION 14: CHANNELS OF COMMUNICATION</Text>
			<Text style={styles.tocItem}>14.1 GRIEVANCE PROCEDURE</Text>
			<Text style={styles.tocItem}>14.2 OFFICIAL NOTICES</Text>
			<Text style={styles.tocItem}>14.3 POLICY ON ELECTRONIC DEVICES</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION 15: CARE OF SCHOOL PROPERTY
			</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION 16: MEDICAL & EMERGENCY PROTOCOLS
			</Text>
			<Text style={styles.tocItem}>16.1 MEDICAL SLIP</Text>
			<Text style={styles.tocItem}>16.2 EMERGENCY SITUATIONS</Text>
			<Text style={styles.tocItem}>16.3 POLICY ON SPIRITUAL HEALTH</Text>
			<Text style={styles.tocItem}>16.4 ROUTINE DRUG TESTING</Text>
			<Text style={styles.tocItem}>16.5 STUDENT PREGNANCY</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION 17: ASSEMBLY & DEVOTION
			</Text>
			<Text style={styles.tocItem}>17.1 MORNING ASSEMBLY</Text>
			<Text style={styles.tocItem}>17.2 POLICY ON LATENESS</Text>
			<Text style={styles.tocItem}>17.3 RECESSES& LUNCH BREAKS</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>
				SECTION 18: AMENDMENT OF HANDBOOK
			</Text>
			<Text style={styles.tocItem}>NATIONAL HOLIDAYS & THE PLEDGE</Text>
			<Text style={styles.tocItem}>THE NATIONAL ANTHEM</Text>
			<Text style={styles.tocItem}>LONE STAR FOREVER</Text>
			<Text style={styles.tocItem}>SCHOOL ODE</Text>
		</View>
	);

	const section1HeritageLeft = (
		<View>
			<Text style={styles.sectionTitle}>1.1 OUR HERITAGE{'\n'}AND ETHOS</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.paragraph}>
				Welcome to the distinguished academic community of As Safa Islamic
				Institute for Education and Training. Our institution, founded in 2025
				by As Safa Charity Foundation, kingdom Of Saudi Arabia (May Allah reward
				them).
			</Text>
			<Text style={styles.paragraph}>
				The school was established on a profound commitment to providing a
				holistic education that seamlessly integrates rigorous secular academics
				with deep Islamic moral instruction. We are dedicated to cultivating an
				inclusive environment where every child is empowered to realize their
				full potential and make guided, positive contributions to society. Our
				serene, purpose-built campus provides an ideal atmosphere for focused
				learning and character development
			</Text>
		</View>
	);

	const section1HeritageRight = (
		<View style={{ alignItems: 'flex-end' }}>
			<ImagePlaceholder width={350} height={190} src="Picture3.jpg" />
			<Text
				style={[
					styles.paragraph,
					{ marginTop: 20, textAlign: 'left', fontSize: '14' },
				]}
			>
				Henceforth, these rules are developed to maintain straight conducive and
				disciplinary order prioritizing Islamic moral fundamental values.
			</Text>
		</View>
	);

	const section1MissionLeft = (
		<View>
			<Text style={styles.sectionTitle}>1.2 MISSION &{'\n'}VISION</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.paragraph}>
				The mission of As Safa Islamic Institute is to deliver an exceptional
				education that nurtures the intellectual, spiritual, and ethical growth
				of every student. We are committed to developing well-rounded
				individuals equipped with the knowledge, skills, and moral compass to
				lead purposeful lives grounded in Islamic principles and service to
				Allah and humanity.
			</Text>
			<Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 18 }]}>
				1.3 Our Motto
			</Text>
			<Text style={styles.paragraph}>
				Instilling Faith, Integrity, and Excellence
			</Text>
		</View>
	);

	const section1MissionRight = (
		<View>
			<ImagePlaceholder width={300} height={170} src="/Picture4.jpg" />
			<Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 14 }]}>
				1.4 Educational Philosophy
			</Text>
			<Text
				style={{
					...styles.paragraph,
					marginTop: 10,
					fontSize: 12,
					fontStyle: 'italic',
				}}
			>
				As Safa Islamic Institute is dedicated to fostering harmony with the
				Creator, Almighty Allah, and elevating the moral character of our
				students. With a proud history of service, dedication and commitment in
				promoting righteousness and patriotism, we aim to provide a
				transformative learning experience that develops critical thinkers,
				responsible decision-makers, and active, virtuous community members.
				This institution will integrate a quality STEM (Science, Technology,
				Engineering, and Mathematic) curriculum with Islamic values promoting
				both academic excellence and moral integrity. Our philosophy nurtures
				the whole person-intellect, character, and practical skills-guided by
				the timeless principles of Islam, with a strong emphasis on
				self-reliance and moral excellence.
			</Text>
		</View>
	);

	const section2AdmissionLeft = (
		<View>
			<Text style={[styles.sectionTitle, styles.sectionTitleTan]}>
				SECTION 2:{'\n'}ADMISSION
			</Text>
			<View style={[styles.sectionRule, { backgroundColor: colors.ink }]} />
			<Text style={[styles.subTitle, { color: colors.ink }]}>
				2.1 PLACEMENT EXAMINATION
			</Text>
			<Text style={[styles.paragraph, { color: colors.ink }]}>
				As Safa Islamic Institute admits students aged 6-20 on a space-available
				basis. We welcome applicants from all backgrounds regardless of
				ethnicity, religion, race, gender, or political affiliation. Admission
				is contingent upon successfully passing one of our three placement
				examinations.
			</Text>
			<View style={{ flexDirection: 'row', marginTop: 10 }}>
				<View style={{ flex: 1, marginRight: 12 }}>
					<Text style={[styles.subTitle, { color: colors.ink }]}>
						Special Admission Procedures
					</Text>
					<Text
						style={[styles.paragraph, { color: colors.ink, marginBottom: 4 }]}
					>
						Senior High School (10th & 11th Graders){'\n'}Applicants must:
					</Text>
					<Text style={[styles.paragraph, { color: colors.ink }]}>
						Meet the general 70% pass requirement in core subjects. Pass a
						Concentration Exam in Life Sciences and Social Sciences. Submit all
						required documents, including a report card with a minimum 75%
						average from the last grade completed.
					</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={[styles.subTitle, { color: colors.ink }]}>
						Early Childhood Education (ECE)
					</Text>
					<Text style={[styles.paragraph, { color: colors.ink }]}>
						New Kindergarten students must pass the placement exam (70%
						minimum). All ECE students must provide on the first day: a
						blue/black book bag, a dozen hard-back copybooks and pencils, three
						sharpeners (with container), three erasers, and a 12-pack of color
						pencils.
					</Text>
				</View>
			</View>
		</View>
	);

	const section2AdmissionRight = (
		<View>
			<Text style={[styles.subTitle, { color: colors.ink }]}>
				General Admission Procedure{'\n'}Prospective students must:
			</Text>
			<BulletList
				items={[
					'Pass the placement exam with a minimum score of 70% in Mathematics, English, and Islamic Studies (Quran).',
					'Complete and submit the official Admission Form with a recent passport-sized photograph with white background.',
					'Provide certified copies of previous academic transcripts, a letter of recommendation, and the most recent report card.',
					'Demonstrate a record of good conduct.',
					'Incomplete applications will not be processed.',
				]}
			/>
		</View>
	);

	const section3UniformLeft = (
		<View>
			<Text style={[styles.sectionTitle, styles.sectionTitleTan]}>
				SECTION 3:{'\n'}STUDENT UNIFORM{'\n'}& DRESS CODE
			</Text>
			<View style={[styles.sectionRule, { backgroundColor: colors.ink }]} />
			<Text style={[styles.subTitle, { color: colors.ink }]}>
				3.1 Official School Uniform
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Pre-Primary: khaki short trousers (boys below the knees)/jumper
				(girls) with white-trimmed shirts and black shoes/socks.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Lower Elementary (1-3): khaki short trousers (boys below the
				knees)//jumper with white va-shirts (boys) and black shoes/socks.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Upper Elementary (4-6): khaki long trousers/jumper.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Junior High (7-9): khaki long trousers/jumper with white socks.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Senior High (10-11): khaki long trousers/jumper.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Senior Students (12th Grade): khaki long trousers/descending jumper
				with long-sleeve white shirts, khaki tie/bow, and white socks.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Note: White sneakers are reserved for P.E. & ROTC only.
			</Text>
		</View>
	);

	const section3UniformRight = (
		<View>
			<Text style={[styles.subTitle, { color: colors.ink }]}>
				3.2 Guidelines for Appearance & Grooming
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Uniforms must be worn neatly, properly, and completely at all times on
				campus.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Trousers must be worn at the waist; sagging, skinny, or tight fits are
				prohibited.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Dirty, torn, or unkempt uniforms will result in the student being sent
				home.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- The following are strictly prohibited: non-prescriptive eyewear,
				jewelry (rings, necklaces), earrings, nail polish, makeup, tattoos, body
				piercings, and fashionable haircuts.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Outerwear over the uniform is only permitted in inclement weather.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Female students must dress modestly at all times, covering their
				bodies and hair with hijabs. Sleeveless, short, or tight clothing is
				forbidden.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Hair must be clean and neatly braided (girls) or kept low and trimmed
				(boys). Mustache and whiskers are not permitted.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- Students are not permitted to carry casual clothing in school bags.
			</Text>
			<Text style={[styles.bullet, { color: colors.ink }]}>
				- A proper uniform is mandatory for all tests and examinations.
			</Text>
		</View>
	);

	const section4FeesLeft = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 4: FEES AND TUITION{'\n'}PAYMENT POLICIES
			</Text>
			<View style={styles.sectionRule} />
			<View style={styles.timeline}>
				<View style={styles.timelineItem}>
					<View style={styles.timelineDot} />
					<View style={{ marginLeft: 8, flex: 1 }}>
						<Text style={styles.statNumber}>1</Text>
						<Text style={styles.timelineText}>75% DURING REGISTRATION</Text>
					</View>
				</View>
				<View style={styles.timelineItem}>
					<View style={styles.timelineDot} />
					<View style={{ marginLeft: 8, flex: 1 }}>
						<Text style={styles.statNumber}>2</Text>
						<Text style={styles.timelineText}>
							10% DURING THE FIRST SEMESTER EXAM
						</Text>
					</View>
				</View>
				<View style={styles.timelineItem}>
					<View style={styles.timelineDot} />
					<View style={{ marginLeft: 8, flex: 1 }}>
						<Text style={styles.statNumber}>3</Text>
						<Text style={styles.timelineText}>
							10% BEFORE THE 5TH PERIOD TEST.
						</Text>
					</View>
				</View>
			</View>
			<ImagePlaceholder width={220} height={120} src="/Picture7.jpg" />
			<Text style={[styles.subTitle, { color: colors.ink, marginTop: 12 }]}>
				4.2 WAEC/WASSCE Fees
			</Text>
			<Text style={styles.paragraph}>
				Fees for Grades 3, 6, 9, and 12 are determined by WAEC. The school
				administration will announce deadlines. Candidates with more than five
				unexcused absences may be denied registration.
			</Text>
			<Text style={[styles.subTitle, { color: colors.ink }]}>
				4.3 Other Fees
			</Text>
			<Text style={styles.paragraph}>
				Additional fees may apply for the Year-end Senior Student Projects
			</Text>
		</View>
	);

	const section5AssemblyRight = (
		<View style={{ justifyContent: 'flex-start' }}>
			<Text style={styles.sectionTitle}>SECTION 5: ASSEMBLY & DEVOTION</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>5.1 MORNING ASSEMBLY</Text>
			<Text style={styles.paragraph}>
				Attendance at Morning Assembly is mandatory for all students before
				classes commence. Students must conduct themselves respectfully and
				refrain from noise. Devotions are led by senior students under staff
				supervision. Male and female students are separated during assembly and
				in classrooms; mixed-gender gatherings are prohibited.
			</Text>
			<Text style={styles.subTitle}>5.2 POLICY ON LATENESS</Text>
			<Text style={styles.paragraph}>
				School begins at 8:00 AM. Arrival after 7:50 AM is considered late. Gate
				will be closed at 8:10 at which time no student will be allow
				in.Consequences for lateness, based on frequency, range from campus
				service (cleaning duties) to a one-day suspension.
			</Text>
			<Text style={[styles.subTitle, { marginTop: 12 }]}>
				5.3 RECESSES & LUNCH BREAKS
			</Text>
			<Text style={styles.paragraph}>
				Recess hour runs from: 10:25 AM - 11:05AM (English Session follows until
				3:15 PM)
			</Text>
			<Text style={[styles.paragraph, { marginTop: 6 }]}>
				INSTRUCTIONAL HOURS: 8:00 AM - 3:15 PM{'\n'}LAB HOURS (SCIENCE): 3:15 PM
				- 4:15 PM{'\n'}COMPUTER LAB: AS PRESCRIBE ON DAILY CLASS SCHEDULE
			</Text>
			<ImagePlaceholder width={260} height={140} src="/Picture8.jpg" />
		</View>
	);

	const section6AttendanceLeft = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 6: ACADEMIC ATTENDANCE</Text>
			<View style={styles.sectionRule} />
			<View style={{ flexDirection: 'row' }}>
				<View style={{ flex: 1, marginRight: 10 }}>
					<Text style={styles.subTitle}>6.1 TARDINESS & ABSENCES</Text>
					<Text style={styles.paragraph}>
						Punctuality is essential. Parents must notify the school by 8:00 AM
						if a student will be absent or late. Students arriving after 8:00 AM
						must report to the Dean's office for a "Late Slip."
					</Text>
					<Text style={styles.paragraph}>
						Three incidents of tardiness may lead to disciplinary action. Five
						days of unexcused absence in a period may result in denial to take
						periodic tests. Ten days of unexcused absence may lead to
						suspension. Unexcused absence during a test results in an Incomplete
						(INC), which converts to a score of 60% if not cleared within one
						week. Seniors with 20+ unexcused absences in a year may be denied
						the right to sit for the WASSCE.
					</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.subTitle}>6.2 MAKE-UP WORK POLICY</Text>
					<Text style={styles.paragraph}>
						1. Submit a formal written excuse to the Dean's Office. 2. Provide a
						medical report from a licensed physician upon the student's return.
					</Text>
					<Text style={styles.paragraph}>
						Verbal excuses are not accepted. Failure to comply will result in an
						incomplete grade (60%).
					</Text>
				</View>
			</View>
		</View>
	);

	const section6AttendanceRight = (
		<View style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
			<ImagePlaceholder width={260} height={160} src="/Picture9.jpg" />
			<Text style={[styles.subTitle, { marginTop: 12 }]}>
				6.3 EXCUSED ABSENCES
			</Text>
			<Text style={styles.paragraph}>
				Permissible excused absences include: verified illness, medical
				appointments, death of an immediate family member (up to one week), and
				other necessary absences as approved.
			</Text>
			<Text style={styles.subTitle}>6.4 CLASS BOYCOTT</Text>
			<Text style={styles.paragraph}>
				Boycotting class is a serious offense punishable by suspension from one
				day to two weeks.
			</Text>
		</View>
	);

	const section7ConductLeft = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 7: STUDENT BEHAVIOR & {'\n'}CONDUCT
			</Text>
			<View style={styles.sectionRule} />
			<View style={{ flexDirection: 'row' }}>
				<View style={{ flex: 1, marginRight: 10 }}>
					<Text style={styles.subTitle}>7.1 CLASSROOM CONDUCT</Text>
					<Text style={styles.bullet}>
						- Students must stand to greet teachers and visitors.
					</Text>
					<Text style={styles.bullet}>
						- Respect class leadership; the class prefect is in charge in the
						teacher's absence.
					</Text>
					<Text style={styles.bullet}>
						- Address teachers and staff with formal titles (Master, Mistress,
						Miss, Sir, and Brother).
					</Text>
					<Text style={styles.bullet}>
						- Eating, noise-making, and the use of unauthorized electronic
						devices are prohibited.
					</Text>
					<Text style={styles.bullet}>
						- Bullying in any form is strictly forbidden.
					</Text>
					<Text style={styles.bullet}>
						- Organizing unsanctioned class activities is grounds for suspension
						or expulsion.
					</Text>
					<Text style={styles.bullet}>
						- Violations typically result in assigned campus service; repeat
						offenses may lead to suspension.
					</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.subTitle}>7.2 LOITERING</Text>
					<Text style={styles.paragraph}>
						Students are not to leave class without permission or exit pass or
						loiter in hallways during instructional time.
					</Text>
					<Text style={styles.subTitle}>7.3 EXIT PASS</Text>
					<Text style={styles.paragraph}>
						No student may leave campus during school hours without an official
						Exit Slip from the Dean's office
					</Text>
					<Text style={styles.subTitle}>
						7.6 INTERPERSONAL RELATIONSHIPS & SOCIAL MEDIA CONDUCT
					</Text>
					<Text style={styles.paragraph}>
						To uphold Islamic values, students are strictly forbidden from
						engaging in romantic relationships or inappropriate close contact
						with members of the opposite sex. Posting content on social media
						that suggests an inappropriate or illegal relationship, or that
						features the school uniform in a disreputable manner, is prohibited.
						Violations will lead to severe disciplinary action, including
						suspension or expulsion.
					</Text>
				</View>
			</View>
		</View>
	);

	const section7ConductRight = (
		<View>
			<Text
				style={[styles.subTitle, { textAlign: 'center', color: colors.ink }]}
			>
				AS AN ISLAMIC INSTITUTION, AS SAFA ISLAMIC INSTITUTE EXPECTS THE HIGHEST
				STANDARDS OF DISCIPLINE. INAPPROPRIATE CONDUCT OR ABUSIVE LANGUAGE WILL
				NOT BE TOLERATED.
			</Text>
			<View style={{ flexDirection: 'row', marginTop: 12 }}>
				<View style={{ flex: 1, marginRight: 10 }}>
					<Text style={styles.subTitle}>7.4 LANGUAGE POLICY</Text>
					<Text style={styles.paragraph}>
						The languages of communication on campus are English, Arabic, and
						French. The use of vernacular languages is discouraged.
					</Text>
					<Text style={styles.subTitle}>7.5 BUSINESS TRANSACTIONS</Text>
					<Text style={styles.paragraph}>
						Students are prohibited from engaging in any form of business or
						sales while in school uniform. Violators will have goods
						confiscated.
					</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.subTitle}>
						7.7 GENERAL CONDUCT & ABUSE POLICY
					</Text>
					<Text style={styles.paragraph}>
						Respect for all school authorities, staff, and fellow students are
						mandatory. Fighting, cheating, stealing, and academic malpractice
						are serious offenses with consequences up to expulsion. Possession
						or use of alcohol, drugs, tobacco, or any intoxicants is grounds for
						immediate expulsion. Possession of weapons or sharp objects is
						strictly forbidden. Students must not interfere with administrative
						decisions. Formal complaints against staff must be filed through the
						proper channel with the Dean's Office. Bribery, corruption, and "sex
						for favor" are expellable offenses. Involvement in other schools'
						student politics is prohibited. Gambling in any form is strictly
						prohibited; violator will immediately be immediate expulse
					</Text>
				</View>
			</View>
		</View>
	);

	const section8FacilitiesLeft = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 8: USE OF FACILITIES</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>8.1 MISUSE OF RESTROOMS</Text>
			<Text style={styles.paragraph}>
				Students must treat all facilities with care. Defacing restroom walls or
				doors with graffiti is prohibited and will be punished by being required
				to clean the facilities or other appropriate sanctions.
			</Text>
			<View style={{ marginTop: 18 }}>
				<ImagePlaceholder width={300} height={120} src="/Picture10.png" />
			</View>
		</View>
	);

	const section9ExpulsionRight = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 9: SUSPENSION AND{'\n'}EXPULSION
			</Text>
			<View style={styles.sectionRule} />
			<View style={{ flexDirection: 'row' }}>
				<View style={{ flex: 1, marginRight: 10 }}>
					<Text style={styles.subTitle}>9.1 SUSPENSION POLICY</Text>
					<Text style={styles.paragraph}>
						Students who receive two disciplinary slips or a warning letter may
						face suspension, which can be: Internal: Confinement to a designated
						area for assignments. Detention: Assigned campus service after
						school (up to one hour). External: Removal from school for a
						specified period.
					</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.subTitle}>9.2 EXPULSION POLICY</Text>
					<Text style={styles.paragraph}>
						Expulsion is a final recourse for severe misconduct, including:
						Impregnating a student or being pregnant. A second suspension.
						Fighting, especially with a weapon or causing serious injury.
						Assaulting a staff member. Theft or forgery of school documents.
						Involvement in a romantic relationship. Failing two consecutive
						academic years. Bribery and corruption. Gambling, drinking, smoking,
						or drug use. Any act that brings the institution's integrity into
						public disrepute.
					</Text>
				</View>
			</View>
		</View>
	);

	const section10ParentLeft = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 10:{'\n'}PARENT/GUARDIAN{'\n'}COMMUNICATION
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>
				10.1 PARENT-TEACHER MEETINGS & PROGRAMS
			</Text>
			<Text style={styles.paragraph}>
				The school organizes periodic conferences to discuss student welfare and
				performance. Written citations will specify the date and time. A fine of
				L$200.00 may be levied for non-attendance without a valid reason.
				Parents are also cited to special programs like award ceremonies,
				competitions, and graduation.
			</Text>
			<Text style={styles.subTitle}>10.2 SCHOOL FEES AND OTHER FEES</Text>
			<Text style={styles.paragraph}>
				The school will provide a one-week notice for settling financial
				commitments. Students may be barred from class if fees are not paid by
				the deadline. Notices for other fees will clearly state the purpose,
				amount, and due date.
			</Text>
		</View>
	);

	const section11EvaluationRight = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 11: ACADEMIC{'\n'}EVALUATION & GRADING
			</Text>
			<View style={styles.sectionRule} />
			<View style={{ flexDirection: 'row' }}>
				<View style={{ flex: 1, marginRight: 10 }}>
					<Text style={styles.subTitle}>11.1 GRADING SYSTEM</Text>
					<BulletList
						items={[
							'Assignments: 10 points',
							'Quizzes: 20 points',
							'Class work: 5 points',
							'Conduct: 5 points',
							'Class participation: 10 points',
							'Periodic Tests: 50 points',
							'Examinations: 100 points',
						]}
					/>
					<Text style={styles.subTitle}>
						11.3 PROMOTION CRITERIA (SEMESTER & YEARLY)
					</Text>
					<Text style={styles.paragraph}>
						Promotion requires maintaining Honor Roll status (or a 95%+ average
						for Senior High/transfers) with no grade below 90 points. Yearly
						promotion for all levels requires an overall 90% average with no
						failing grades.
					</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.subTitle}>11.2 PERIODIC ACADEMIC HONORS</Text>
					<BulletList
						items={[
							"Principal's List: 95.00 - 99.99%",
							'High Honor: 90.00 - 94.99%',
							'Honor Roll: 85.00 - 89.99%',
							'Students with two or more failing grades are placed on Academic Probation.',
						]}
					/>
					<Text style={styles.subTitle}>
						11.4 REMEDIAL CLASSES(SUMMER SCHOOL)
					</Text>
					<Text style={styles.paragraph}>
						Students failing a core subject (English, Math, science, social
						studies or any Arabic subject) must attend remedial classes during
						vacation. Three absences from remediation result in failure,
						requiring the student to repeat the class.
					</Text>
				</View>
			</View>
		</View>
	);

	const section11ContinuedLeft = (
		<View>
			<ImagePlaceholder width={230} height={140} src="/Picture11.jpg" />
			<Text style={[styles.subTitle, { marginTop: 12 }]}>
				11.5 ACADEMIC PROBATION
			</Text>
			<Text style={styles.paragraph}>
				New students scoring below 50%on the placement exam or with a previous
				average below 75% are placed on probation and must sign a Performance
				Bond.
			</Text>
		</View>
	);

	const section11ContinuedRight = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 11: ACADEMIC{'\n'}EVALUATION & GRADING
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>
				11.7 SPECIAL STANDARD BOARD EXAMINATION SSBE (MOCK)
			</Text>
			<Text style={styles.paragraph}>
				Terminal classes (Kindergarten, Grade 3, Grade 6, and Grade 9) will sit
				for a comprehensive SSBE at year's end. Successful candidates receive a
				Diploma of Completion.
			</Text>
			<Text style={styles.subTitle}>11.6 DEMOTION & FAILURE</Text>
			<Text style={styles.paragraph}>
				Students failing to meet promotion criteria, including an annual average
				below 70% or failure in one or more core subjects, will be required to
				repeat the class.
			</Text>
		</View>
	);

	const section12ActivitiesLeft = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 12: EXTRA-{'\n'}CURRICULAR{'\n'}ACTIVITIES
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.paragraph}>
				The school encourages participation in activities such as Quizzing,
				Debate, Spelling Bee, Press Club, Dawah, Quranic Competitions, and the
				Scholars Program. Membership is based on merit and interest, not
				discrimination.
			</Text>
			<Text style={styles.subTitle}>12.1 SCHOLARS PROGRAM</Text>
			<Text style={styles.paragraph}>
				This program honors students who consistently achieve above-average
				academic performance, recognizing their dedication and hard work
				throughout the year.
			</Text>
			<View style={{ marginTop: 18 }}>
				<ImagePlaceholder width={210} height={120} src="/Picture12.jpg" />
			</View>
		</View>
	);

	const section13CouncilRight = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 13: STUDENT{'\n'}COUNCIL GOVERNMENT
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>13.1 CLASS LEADERSHIP</Text>
			<Text style={styles.paragraph}>
				Each class elects a Prefect, Vice-Prefect, Secretary, and Treasurer.
				Class Presidents and Vice-Presidents serve in the Student Legislative
				Assembly (SLA).
			</Text>
			<Text style={styles.subTitle}>13.3 IMPEACHMENT</Text>
			<Text style={styles.paragraph}>
				The administration reserves the right to impeach council members or
				dissolve the council for serious breaches of school rules, electoral
				irregularities, financial misconduct, academic decline, or cheating.
			</Text>
			<Text style={styles.subTitle}>13.2 SCHOOL-WIDE LEADERSHIP</Text>
			<Text style={styles.paragraph}>
				Elections are conducted by an ad-hoc As Safa Islamic Institute Election
				Commission (ASEC). Candidates must: Have completed two years at the
				institute. Have a yearly average of at least 80% from the previous year.
				Maintain an 80% average with no failing grades in the first marking
				period. Obtain behavioral and financial clearances. Be duly registered
				with ASEC. Students with a behavior bond or suspension record are
				ineligible.
			</Text>
		</View>
	);

	const section14CommunicationLeft = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 14:{'\n'}CHANNELS OF{'\n'}COMMUNICATION
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>14.1 GRIEVANCE PROCEDURE</Text>
			<Text style={styles.paragraph}>
				Students must follow the chain of command for reporting issues:{'\n'}1.
				Class Prefect{'\n'}2. Class Teacher{'\n'}3. Class Sponsor{'\n'}4. Dean
				of Students{'\n'}5. Vice Principal for Administration (VPA){'\n'}6. The
				Principal
			</Text>
			<Text style={styles.subTitle}>14.2 OFFICIAL NOTICES</Text>
			<Text style={styles.paragraph}>
				Notices are sent home with students via hard copy. It is mandatory for
				parents to respond to citations concerning their child's conduct.
			</Text>
			<View style={{ marginTop: 12 }}>
				<ImagePlaceholder width={210} height={110} src="/Picture13.jpg" />
			</View>
		</View>
	);

	const section15PropertyRight = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 15: CARE OF SCHOOL{'\n'}PROPERTY
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.paragraph}>
				Students are obligated to protect all school property. Intentional
				damage must be repaired by the student at their cost. Dragging chairs,
				sitting on chair arms, leaning back in chairs, and writing on walls,
				doors, or furniture are prohibited and will be punished either by
				repayments by the said student, suspension for one week for repeated
				offense.
			</Text>
			<Text style={styles.subTitle}>14.3 POLICY ON ELECTRONIC DEVICES</Text>
			<Text style={styles.paragraph}>
				No Cell phones, iPods, laptops, or other electronic gadgets are strictly
				prohibited on campus. All confiscated/ seized electronic devices will be
				kept in the office of the Dean for a one-month period. Confiscated
				devices will be held, and repeated offenses may lead to confiscation of
				the materials untill the end of academic year. The administration will
				not be responsible for any lost or stolen electronic devices during
				class time.
			</Text>
		</View>
	);

	const section16MedicalLeft = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 16: MEDICAL &{'\n'}EMERGENCY{'\n'}PROTOCOLS
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>16.1 MEDICAL SLIP</Text>
			<Text style={styles.paragraph}>
				The school provides first aid for minor issues. Students feeling unwell
				must report to the Dean, who may issue a slip to go home for treatment.
			</Text>
			<Text style={styles.subTitle}>16.2 EMERGENCY SITUATIONS</Text>
			<Text style={styles.paragraph}>
				Parents must disclose all medical conditions during admission and keep
				emergency contact information current. In an emergency, the school will
				transport a child to a facility, after which responsibility falls to the
				parents.
			</Text>
		</View>
	);

	const section16MedicalRight = (
		<View>
			<View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
				<CirclePlaceholder size={150} src="/Picture14.png" />
			</View>
			<Text style={styles.subTitle}>16.3 POLICY ON SPIRITUAL HEALTH</Text>
			<Text style={styles.paragraph}>
				Students experiencing spiritual ailments ("Jinna sickness") must seek
				appropriate medical care and recover fully before returning to school to
				prevent disruption and risk to others. Providing false health
				information on admission forms is grounds for expulsion.
			</Text>
			<Text style={styles.subTitle}>16.4 ROUTINE DRUG TESTING</Text>
			<Text style={styles.paragraph}>
				All new students must provide a drug-free certificate or undergo
				testing. The institute conducts regular random drug tests. A positive
				test result leads to immediate expulsion.
			</Text>
			<Text style={styles.subTitle}>16.4 ROUTINE DRUG TESTING</Text>
			<Text style={styles.paragraph}>
				A legally married female student who becomes pregnant must take a
				temporary leave of absence. She may resume studies after giving birth,
				contingent on her health and the academic calendar. The institute does
				not allow pregnant students to attend classes to ensure their well-being
				and a safe school environment.
			</Text>
		</View>
	);

	const section17LabLeft = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 17: LABORATORY,{'\n'}COMPUTER LAB & READING{'\n'}ROOM CONDUCT
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.paragraph}>
				Students and parents must sign a technology and research agreement.
			</Text>
			<BulletList
				items={[
					'No food or drinks are allowed.',
					'Use is permitted only under direct teacher supervision.',
					'Facilities are for academic and educational purposes only; no games or photography.',
					'Students are liable for any materials they damage or misplace.',
				]}
			/>
			<Text style={[styles.subTitle, { marginTop: 10 }]}>OATH</Text>
			<Text style={styles.paragraph}>
				"I, having read all the rules set in this student handbook, do hereby
				solemnly swear to preserve, uphold, abide by, and protect every
				provision in this student handbook to the best of my ability. So help me
				Allah."
			</Text>
			<Text style={[styles.subTitle, { marginTop: 10 }]}>Islamic Holidays</Text>
			<BulletList
				items={[
					"Every Ramadan Ending Celebration (Eidul'fitr)",
					"Abraham Day Celebration (Eidul'adha)",
				]}
			/>
		</View>
	);

	const section18AmendmentRight = (
		<View>
			<Text style={styles.sectionTitle}>
				SECTION 18: AMENDMENT OF{'\n'}HANDBOOK
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.paragraph}>
				The rules and policies in this handbook are subject to amendment by the
				administration as necessary, without prior notice to students or
				parents.
			</Text>
			<Text style={[styles.subTitle, { marginTop: 10 }]}>
				National Holidays of Liberia
			</Text>
			<BulletList
				items={[
					"January 1: New Year's Day",
					'First Monday in January after Presidential Election: Inauguration Day',
					'February 11: Armed Forces Day',
					'Second Wednesday in March: Decoration Day',
					'March 15: J.J. Roberts Birthday',
					'Second Friday in April: Fast & Prayer Day',
					'May 14: Unification Day',
					'July 26: Independence Day',
					'August 24: Flag Day',
					'First Thursday in November: Thanksgiving Day',
					'November 29: President William V. S. Tubman Birthday',
					'December 25: Christmas Day',
				]}
			/>
		</View>
	);

	const pledgeAnthemLeft = (
		<View>
			<Text style={styles.subTitle}>THE NATIONAL ANTHEM</Text>
			<Text style={styles.paragraph}>
				All hail Liberia hail! (All hail){'\n'}All hail Liberia hail! (All hail)
				{'\n'}This glorious land of liberty shall long be ours.{'\n'}Thou new
				her name, Green be her fame,{'\n'}And mighty be her powers,{'\n'}And
				mighty be her powers. (2x){'\n'}In joy and gladness, with our hearts
				united,{'\n'}We'll shout the freedom, of a race benighted.{'\n'}Long
				live Liberia, happy land!{'\n'}A home of glorious liberty{'\n'}By God's
				command (2x)
			</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>SECOND STANZA</Text>
			<Text style={styles.paragraph}>
				All hail Liberia hail! (All hail!){'\n'}All hail, Liberia hail (All
				hail!){'\n'}In union strong success is sure.{'\n'}We cannot fail! With
				God above{'\n'}our rights to prove{'\n'}We will o'er all prevail{'\n'}We
				will o'er all prevail!{'\n'}With heart and hand our country's cause
				defending,{'\n'}We'll meet the foe with velour unpretending.{'\n'}Long
				live Liberia, happy land!{'\n'}A home of glorious Liberty, By God's
				command!{'\n'}A home of glorious liberty, By God's command!
			</Text>
		</View>
	);

	const pledgeRight = (
		<View>
			<View style={{ alignItems: 'center', marginBottom: 8 }}>
				<CirclePlaceholder
					size={120}
					src="https://c7.alamy.com/comp/PYEMX7/symbol-of-liberia-national-emblem-PYEMX7.jpg"
				/>
			</View>
			<Text style={styles.subTitle}>THE PLEDGE</Text>
			<Text style={styles.paragraph}>
				I pledge allegiance to the flag of Liberia{'\n'}And to the Republic for
				which it stands{'\n'}One nation{'\n'}Indivisible with Liberty and
				justice for all.
			</Text>
		</View>
	);

	const loneStarLeft = (
		<View>
			<ImagePlaceholder width={'70%'} height={110} src="/Picture15.png" />
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>LONE STAR FOREVER</Text>
			<Text style={styles.paragraph}>
				When Freedom raised her glowing Fame on{'\n'}Montserrado verdant height
				{'\n'}She set within the dome of night,{'\n'}Midst lowering{'\n'}Skies
				and thunder-storm, the star of Liberty{'\n'}And seizing from the waking
				morn, its burnished{'\n'}Shield of golden flame, she lifted it in her
				proud name,{'\n'}And roused a nation long forlorn, to nobler destiny!
				{'\n'}Refrain{'\n'}The Lone Star forever, The Lone Star forever{'\n'}O
				Lone may it float, o'er land and o'er sea{'\n'}Desert it? No never,
				uphold it? Forever
			</Text>
		</View>
	);

	const loneStarRight = (
		<View>
			<Text style={styles.paragraph}>
				O shouts for the Lone Star banner..... All Hail{'\n'}Then speeding in
				her course, along{'\n'}The broad Atlantic's golden strand, she woke
				reverberant through the land{'\n'}A nation's loud triumphant song,{'\n'}
				The song of Liberty!{'\n'}And o'er Liberia's altar fires{'\n'}She wide
				the lone-starred flag unfurled, Proclaimed to an expectant world,{'\n'}
				The birth, for Africa's sons and sires, the birth of Liberty!{'\n'}Then
				forward, Sons of freedom march!{'\n'}Defend the sacred heritage{'\n'}The
				nation's call form age to age{'\n'}When-er it sounds "neat heaven's arch
				{'\n'}Whenever foes assail{'\n'}Be every ready to obey{'\n'}"Giant
				treason and rebellion's front{'\n'}"Grant foul aggression in the burant
				{'\n'}Of batter lay the hero's way{'\n'}All hail, Lone star, all hail
			</Text>
			<View style={{ marginTop: 20 }}>
				<Text style={[styles.subTitle, { color: colors.ink }]}>
					The School Ode
				</Text>
				<Text style={styles.paragraph}>To be developed!</Text>
			</View>
		</View>
	);

	const meetTeamLeft = (
		<View>
			<Text
				style={[
					styles.sectionTitle,
					{ color: colors.accent, marginBottom: 18, textAlign: 'center' },
				]}
			>
				MEET THE TEAM
			</Text>
			<CirclePlaceholder size={100} src="/principal.png" />
			<Text style={styles.teamName}>SHEICK ABDULLAH MANSAREY</Text>
			<Text style={styles.teamRole}>Principal</Text>

			<View style={styles.sectionRule} />
			<View style={{ height: 10 }} />
			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<View style={{ alignItems: 'center', width: '45%' }}>
					<CirclePlaceholder size={90} src="/vpi.png" />
					<Text style={styles.teamName}>SHEICK ALIEU V M SESAY</Text>
					<Text style={styles.teamRole}>Vice Principal For Administration</Text>
				</View>
				<View style={{ alignItems: 'center', width: '45%' }}>
					<CirclePlaceholder size={90} src="/vpa.png" />
					<Text style={styles.teamName}>MR. ABDULLAH TOURE</Text>
					<Text style={styles.teamRole}>Vice Principal For Instructions</Text>
				</View>
			</View>

			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<View style={{ marginTop: 16, alignItems: 'center' }}>
					<CirclePlaceholder size={90} src="/secretary.png" />
					<Text style={styles.teamName}>MR. ALIEU MARWANE SESAY</Text>
					<Text style={styles.teamRole}>Financial And General Secretary</Text>
				</View>

				<View style={{ marginTop: 16, alignItems: 'center' }}>
					<CirclePlaceholder size={90} src="/dean.png" />
					<Text style={styles.teamName}>MR. ABDULAI VAMUNYA NYEI</Text>
					<Text style={styles.teamRole}>Dean of Student Affairs</Text>
				</View>
			</View>
		</View>
	);

	const meetTeamRight = (
		<View style={{ alignItems: 'center', justifyContent: 'center' }}>
			<ImagePlaceholder width={300} height={160} src="/Picture1.jpg" />
			<View style={styles.coverBottomRule} />
			<Text style={styles.contactTitle}>CONTACT US</Text>
			<Text style={styles.contactInfo}>
				Johnsonville Township, Montserrado County
			</Text>
			<Text style={styles.contactInfo}>Monrovia, Liberia</Text>
			<Text style={styles.contactInfo}>assufaislamicinstitute@gmail.com</Text>
		</View>
	);

	const pages: PageSlot[] = Array.from({ length: 45 }, () => blankPage);

	pages[1] = { content: coverFront, style: styles.coverPage };
	pages[2] = blankPage;
	pages[3] = numberedPage(3, toc1Left, styles.tocPage, tocNumberColor);
	pages[4] = numberedPage(4, toc1Right, styles.tocPage, tocNumberColor);
	pages[5] = numberedPage(5, toc2Left, styles.tocPage, tocNumberColor);
	pages[6] = numberedPage(6, toc2Right, styles.tocPage, tocNumberColor);
	pages[7] = numberedPage(7, toc3Left, styles.tocPage, tocNumberColor);
	pages[8] = numberedPage(8, toc3Right, styles.tocPage, tocNumberColor);
	pages[9] = numberedPage(9, section1HeritageLeft);
	pages[10] = numberedPage(10, section1HeritageRight);
	pages[11] = numberedPage(11, section1MissionLeft);
	pages[12] = numberedPage(12, section1MissionRight);
	pages[13] = numberedPage(13, section2AdmissionLeft, styles.coverPage);
	pages[14] = numberedPage(14, section2AdmissionRight, styles.coverPage);
	pages[15] = numberedPage(15, section3UniformLeft, styles.coverPage);
	pages[16] = numberedPage(16, section3UniformRight, styles.coverPage);
	pages[17] = numberedPage(17, section4FeesLeft, {
		backgroundColor: colors.warm,
	});
	pages[18] = numberedPage(18, section5AssemblyRight, {
		backgroundColor: colors.warm,
	});
	pages[19] = numberedPage(19, section6AttendanceLeft);
	pages[20] = numberedPage(20, section6AttendanceRight);
	pages[21] = numberedPage(21, section7ConductLeft);
	pages[22] = numberedPage(22, section7ConductRight);
	pages[23] = numberedPage(23, section8FacilitiesLeft);
	pages[24] = numberedPage(24, section9ExpulsionRight);
	pages[25] = numberedPage(25, section10ParentLeft);
	pages[26] = numberedPage(26, section11EvaluationRight);
	pages[27] = numberedPage(27, section11ContinuedLeft);
	pages[28] = numberedPage(28, section11ContinuedRight);
	pages[29] = numberedPage(29, section12ActivitiesLeft);
	pages[30] = numberedPage(30, section13CouncilRight);
	pages[31] = numberedPage(31, section14CommunicationLeft);
	pages[32] = numberedPage(32, section15PropertyRight);
	pages[33] = numberedPage(33, section16MedicalLeft);
	pages[34] = numberedPage(34, section16MedicalRight);
	pages[35] = numberedPage(35, section17LabLeft);
	pages[36] = numberedPage(36, section18AmendmentRight);
	pages[37] = numberedPage(37, pledgeAnthemLeft);
	pages[38] = numberedPage(38, pledgeRight);
	pages[39] = numberedPage(39, loneStarLeft);
	pages[40] = numberedPage(40, loneStarRight);
	pages[41] = numberedPage(41, meetTeamLeft);
	pages[42] = numberedPage(42, meetTeamRight);
	pages[43] = blankPage;
	pages[44] = { content: coverBack, style: styles.coverPage };

	const sheetMap: Array<[number, number]> = [
		[44, 1],
		[2, 43],
		[42, 3],
		[4, 41],
		[40, 5],
		[6, 39],
		[38, 7],
		[8, 37],
		[36, 9],
		[10, 35],
		[34, 11],
		[12, 33],
		[32, 13],
		[14, 31],
		[30, 15],
		[16, 29],
		[28, 17],
		[18, 27],
		[26, 19],
		[20, 25],
		[24, 21],
		[22, 23],
	];

	return (
		<Document>
			{sheetMap.map(([leftIndex, rightIndex], index) => (
				<BookletPage
					key={`sheet-${index}`}
					left={pages[leftIndex] ?? blankPage}
					right={pages[rightIndex] ?? blankPage}
				/>
			))}
		</Document>
	);
};

const ClearancePage = () => {
	return (
		<div style={{ width: '100%', height: '100vh' }}>
			<PDFViewer width="100%" height="100%">
				<StudentHandbookDocument />
			</PDFViewer>
		</div>
	);
};

export default ClearancePage;
