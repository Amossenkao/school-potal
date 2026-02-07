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
	sectionTitle: {
		fontSize: 18,
		fontWeight: 700,
		fontFamily: 'Helvetica-Bold',
		color: colors.ink,
		textTransform: 'uppercase',
		lineHeight: 1.05,
	},
	sectionRule: {
		height: 1,
		backgroundColor: colors.line,
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
	coverPage: {
		backgroundColor: colors.tan,
	},
	coverStudentHandbook: {
		fontSize: 16,
		letterSpacing: 3,
		marginTop: 12,
		fontFamily: 'Helvetica-Bold',
		color: colors.ink,
		textAlign: 'center',
		textTransform: 'uppercase',
	},
	coverRightColumn: {
		borderLeft: '2pt solid #6b4b36',
		paddingLeft: 18,
		height: '100%',
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

const ImagePlaceholder = ({ width, height, label = '', src = DEFAULT_IMAGE }) => (
	<View style={[{ width, height }, { borderWidth: 0 }]}>
		<Image src={src} style={{ width: '100%', height: '100%' }} />
		{label ? <Text>{label}</Text> : null}
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

const CodeOfConductDocument = () => {
	const tocNumberColor = '#f2f2ee';
	const blankWatermark = (
		<Text style={styles.watermark}>AS SAFA ISLAMIC INSTITUTE</Text>
	);
	const blankPage: PageSlot = { content: blankWatermark };
	const numberedPage = (
		index: number,
		content: React.ReactNode,
		style?: object,
		numberColor?: string
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
			<Text style={styles.coverStudentHandbook}>
				TEACHER'S CODE OF CONDUCT
			</Text>
		</View>
	);

	const coverBack = (
		<View style={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
			<ImagePlaceholder width="95%" height={'100%'} label="" src="/cover.png" />
		</View>
	);

	const tocLeft = (
		<View style={{ height: '100%' }}>
			<Text style={styles.tocTitle}>TABLE OF CONTENTS</Text>
			<Text style={styles.tocItem}>1.0 INTRODUCTION & GUIDING PRINCIPLES</Text>
			<Text style={styles.tocItem}>1.1 WELCOME & PURPOSE</Text>
			<Text style={styles.tocItem}>1.2 MISSION STATEMENT</Text>
			<Text style={styles.tocItem}>1.3 VISION STATEMENT</Text>
			<Text style={styles.tocItem}>1.4 PROFESSIONAL ETHICS</Text>
			<Text style={styles.tocItem}>1.5 PROFESSIONAL EXPECTATIONS & STANDARDS</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>2.0 EMPLOYMENT POLICIES</Text>
			<Text style={styles.tocItem}>2.1 PROBATIONARY PERIOD FOR NEW EMPLOYEES</Text>
			<Text style={styles.tocItem}>2.2 NEW EMPLOYEE HEALTH CERTIFICATE</Text>
			<Text style={styles.tocItem}>2.3 JOB DUTIES</Text>
			<Text style={styles.tocItem}>2.4 JOB DESCRIPTION</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>3.0 HOURS OF WORK & PERFORMANCE</Text>
			<Text style={styles.tocItem}>3.1 HOURS OF WORK</Text>
			<Text style={styles.tocItem}>3.2 TIMEKEEPING REQUIREMENTS</Text>
			<Text style={styles.tocItem}>3.3 PERFORMANCE EVALUATION</Text>
			<Text style={styles.tocItem}>3.4 INVOLUNTARY TERMINATION & DISCIPLINE</Text>
			<Text style={styles.tocItem}>3.5 VOLUNTARY TERMINATION</Text>
		</View>
	);

	const tocRight = (
		<View style={{ height: '100%', position: 'relative' }}>
			<View style={styles.tocDivider} />
			<Text style={styles.tocItem}>4.0 WAGE AND SALARY</Text>
			<Text style={styles.tocItem}>4.1 WAGE AND SALARY</Text>
			<Text style={styles.tocItem}>4.2 PAY PERIOD</Text>
			<Text style={styles.tocItem}>4.3 OVERTIME POLICY</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>5.0 LEAVES & ABSENCES</Text>
			<Text style={styles.tocItem}>5.1 SICK/PERSONAL LEAVE</Text>
			<Text style={styles.tocItem}>5.2 BEREAVEMENT LEAVE</Text>
			<Text style={styles.tocItem}>5.3 LEAVE OF ABSENCE WITHOUT PAY</Text>
			<Text style={styles.tocItem}>5.4 FAMILY LEAVE</Text>
			<Text style={styles.tocItem}>5.4.1 MATERNITY LEAVE</Text>
			<Text style={styles.tocItem}>5.4.2 PROFESSIONAL DEVELOPMENT</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>6.0 PROFESSIONAL OPERATIONS</Text>
			<Text style={styles.tocItem}>6.1 LESSON PLANS</Text>
			<Text style={styles.tocItem}>6.2 SUGGESTIONS</Text>
			<Text style={styles.tocItem}>6.3 COMPLAINT HANDLING PROCEDURE</Text>
			<Text style={styles.tocItem}>6.4 CELL PHONE POLICY</Text>
			<Text style={styles.tocItem}>6.5 STANDARDS OF CONDUCT & CORRECTIVE ACTION</Text>
			<Text style={styles.tocItem}>6.5.1 CONFIDENTIALITY</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>7.0 WORKPLACE ENVIRONMENT</Text>
			<Text style={styles.tocItem}>7.1 SMOKING</Text>
			<Text style={styles.tocItem}>7.2 ALCOHOL & DRUGS</Text>
			<Text style={styles.tocItem}>7.3 HARASSMENT</Text>
			<Text style={styles.tocItem}>7.4 DRESS & PERSONAL APPEARANCE</Text>
			<Text style={[styles.tocItem, { marginTop: 10 }]}>8.0 CHANGES IN POLICY</Text>
			<Text style={styles.tocItem}>9.0 GRADING SYSTEM</Text>
		</View>
	);

	const section1IntroLeft = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 1: INTRODUCTION & GUIDING PRINCIPLES</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>1.1 WELCOME & PURPOSE</Text>
			<Text style={styles.paragraph}>
				Welcome to As Safa Islamic Institute for Education and Training,a community where faith and learning converge. This handbook serves as your guide to our institution's policies, regulations, mission, values, and the professional standards that define us. It is essential that all employees and volunteers read, understand, and adhere to the contents herein. . It is designed to support your success and ensure a cohesive, respectful, and high-achieving environment for all. Please read it thoroughly and refer to it often.
			</Text>
		</View>
	);

	const section1IntroRight = (
		<View>
			<Text style={styles.subTitle}>1.2 MISSION STATEMENT</Text>
			<Text style={styles.paragraph}>
				To be a premier Islamic educational institution, grounded in the Qur'an and Sunnah, dedicated to providing a quality academic education in an inclusive and respectful environment, as well as to empower students to achieve Islamic and academic excellence, developing citizens who embody the spirit of Islam and strive to improve their society through faith, perseverance, and service to others.
			</Text>
			<Text style={styles.subTitle}>1.3 VISION STATEMENT</Text>
			<Text style={styles.paragraph}>
				As Safa Islamic Institute is an Islamic educational institution dedicated to the tenets of the Qur'an and Sunnah. We provide a high-quality academic education within an nurturing Islamic environment, welcoming and respecting students from all religious, socio-economic, and cultural backgrounds.
			</Text>
		</View>
	);

	const section1EthicsLeft = (
		<View>
			<Text style={styles.subTitle}>1.4 PROFESSIONAL ETHICS</Text>
			<Text style={styles.paragraph}>
				All staff and volunteers are expected to uphold the highest ethical standards by:
			</Text>
			<BulletList
				items={[
					'Making the well-being of students the fundamental priority in all decisions and actions.',
					'Fulfilling professional responsibilities with honesty and integrity.',
					'Protecting the civil and human rights of all individuals and supporting due process.',
					'Obeying all laws and implementing administrative policies, rules, and regulations.',
					'Pursuing continuous professional development to enhance the effectiveness of our profession.',
					'Honoring all contracts until fulfillment or official release.',
					'Welcoming constructive supervision and performance evaluation.',
					"Creating a safe, secure, and challenging learning environment that respects each student's voice and individual learning style.",
					'Fostering strong, collaborative relationships with students and their parents to ensure every child\'s progress.',
				]}
			/>
		</View>
	);

	const section1ExpectationsRight = (
		<View>
			<Text style={styles.subTitle}>1.5 PROFESSIONAL EXPECTATIONS & STANDARDS</Text>
			<Text style={styles.paragraph}>
				To fulfill our mission, every staff member is expected to:
			</Text>
			<BulletList
				items={[
					'Exhibit a positive, enthusiastic, patient, and flexible attitude.',
					'Be fully prepared and begin all classes on time.',
					'Maintain current academic and professional knowledge.',
					'Provide timely and constructive assessment of student work.',
					'Be readily available to help students improve morally and academically.',
					'Identify and direct students to remedial services as needed.',
					'Employ diverse and dynamic teaching methods to encourage active student participation.',
				]}
			/>
		</View>
	);

	const section2Left = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 2: EMPLOYMENT POLICIES</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>2.1 PROBATIONARY PERIOD FOR NEW EMPLOYEES</Text>
			<Text style={styles.paragraph}>
				The first 90 days of employment constitute a probationary period to assess skills, capabilities, and alignment with the Institute's mission. This period may be extended at the administration's discretion. Upon successful completion, employment status will be reviewed and confirmed.
			</Text>
			<Text style={styles.subTitle}>2.2 NEW EMPLOYEE HEALTH CERTIFICATE</Text>
			<Text style={styles.paragraph}>
				All new employees must provide a current medical certificate(not more than six months old) from a recognized facility, confirming they are free from communicable diseases and are physically and mentally fit for duty.
			</Text>
		</View>
	);

	const section2Right = (
		<View>
			<Text style={styles.subTitle}>2.3 JOB DUTIES</Text>
			<Text style={styles.paragraph}>
				Job responsibilities will be explained during orientation. The Institute reserves the right to alter, change, or assign additional job duties as necessary. All staff are expected to cooperate with special projects and events. Morning assembly begins promptly at 7:40 AM, and all staff must be present by 7:30 AM.
			</Text>
			<Text style={styles.subTitle}>2.4 JOB DESCRIPTION</Text>
			<Text style={styles.paragraph}>
				Job descriptions serve as guidelines for staffing and training. They are subject to change, and employees may be assigned duties outside their normal scope. Significant, permanent changes in responsibility may result in a formal update to the job description.
			</Text>
		</View>
	);

	const section3Left = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 3: HOURS OF WORK & PERFORMANCE</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>3.1 HOURS OF WORK</Text>
			<Text style={styles.paragraph}>
				The standard work week is 31 hours, from 7:30 AM to 2:00 PM, Monday to Friday, including a 30-minute break. Schedules may be adjusted for meetings, conferences, and institutional needs.
			</Text>
			<Text style={styles.subTitle}>3.2 TIMEKEEPING REQUIREMENTS</Text>
			<Text style={styles.paragraph}>
				Accurate timekeeping is mandatory. All employees must sign in and out daily. Absences must be reported to the Principal or Vice-Principal for Administration as early as possible. Medical appointments should be scheduled outside school hours to maintain operational effectiveness.
			</Text>
		</View>
	);

	const section3Right = (
		<View>
			<Text style={styles.subTitle}>3.3 PERFORMANCE EVALUATION</Text>
			<Text style={styles.paragraph}>
				Employees will undergo formal evaluations at least twice per year, supplemented by informal observations. The process includes self-evaluation and a review discussion with administration. Positive evaluations do not guarantee salary increases or promotions.
			</Text>
			<Text style={styles.subTitle}>3.4 INVOLUNTARY TERMINATION & DISCIPLINE</Text>
			<Text style={styles.paragraph}>
				Violations of school policy may result in disciplinary action, including verbal warning, written warning, pay deduction, suspension without pay, or immediate termination. The Institute reserves the right to terminate employment at its discretion.
			</Text>
			<Text style={styles.subTitle}>3.5 VOLUNTARY TERMINATION</Text>
			<Text style={styles.paragraph}>
				Employees who resign must provide notice. Failure to report for five consecutive days without notice will be considered voluntary termination. All school property must be returned upon separation.
			</Text>
		</View>
	);

	const section4Left = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 4: WAGE AND SALARY</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>4.1 WAGE AND SALARY</Text>
			<Text style={styles.paragraph}>
				Compensation is structured to recognize individual effort and contribution, based on job requirements, scope of responsibilities, and physical/mental demands. Salary ranges are reviewed annually.
			</Text>
			<Text style={styles.subTitle}>4.2 PAY PERIOD</Text>
			<Text style={styles.paragraph}>
				Salaried staff are paid on a bi-monthly basis on the 25th of each month. The academic contract period runs from September 16th to July 16th. Orientation, faculty meetings, and other key events are considered part of salaried work.
			</Text>
			<Text style={styles.subTitle}>4.3 OVERTIME POLICY</Text>
			<Text style={styles.paragraph}>
				The Institute does not pay overtime. Work-related meetings and events outside regular hours are part of professional responsibilities. Any additional compensated work requires prior administrative agreement.
			</Text>
		</View>
	);

	const section5Right = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 5: LEAVES & ABSENCES</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>5.1 SICK/PERSONAL LEAVE</Text>
			<Text style={styles.paragraph}>
				Leave is provided for personal illness,injury, or a family emergency.
			</Text>
			<Text style={styles.subTitle}>5.2 BEREAVEMENT LEAVE</Text>
			<Text style={styles.paragraph}>
				Up to three days of paid leave are granted for the death of an immediate family member (spouse, children, parents, grandparents, siblings, and in-laws).
			</Text>
			<Text style={styles.subTitle}>5.3 LEAVE OF ABSENCE WITHOUT PAY</Text>
			<Text style={styles.paragraph}>
				Unpaid leave may be granted for unavoidable circumstances requiring prolonged absence, subject to administrative approval.
			</Text>
			<Text style={styles.subTitle}>5.4 FAMILY LEAVE</Text>
			<Text style={styles.paragraph}>
				5.4.1 Maternity Leave: The Institute maintains a non-discriminatory policy toward pregnant employees. Employees are expected to notify the Principal as soon as possible. A standard maternity leave of up to eight weeks is provided, with the possibility of extension supported by a physician's certification.
			</Text>
			<Text style={styles.paragraph}>
				5.4.2 Professional Development: All staff are required to engage in ongoing professional development to maintain teaching credentials and stay current with educational research and practices.
			</Text>
		</View>
	);

	const section6Left = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 6: PROFESSIONAL OPERATIONS</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>6.1 LESSON PLANS</Text>
			<Text style={styles.paragraph}>
				Detailed, step-by-step lesson plans with time durations must be prepared and available for substitutes at all times.
			</Text>
			<Text style={styles.subTitle}>6.2 SUGGESTIONS</Text>
			<Text style={styles.paragraph}>
				We encourage and welcome written or verbal suggestions to improve the quality and efficiency of our Institute.
			</Text>
			<Text style={styles.subTitle}>6.3 COMPLAINT HANDLING PROCEDURE</Text>
			<Text style={styles.paragraph}>
				Employees should first address job-related problems with the Vice-Principal for Administration. If unresolved; the complaint may be submitted in writing to the Principal for a final decision.
			</Text>
			<Text style={styles.subTitle}>6.4 CELL PHONE POLICY</Text>
			<Text style={styles.paragraph}>
				Cell phones must be turned off during teaching, student supervision, and meetings. Personal calls are prohibited during these times. In case of emergency, messages can be relayed through the Principal's office.
			</Text>
		</View>
	);

	const section6Right = (
		<View>
			<Text style={styles.subTitle}>6.5 STANDARDS OF CONDUCT & CORRECTIVE ACTION</Text>
			<Text style={styles.paragraph}>
				To maintain a professional environment, violations of standards will result in corrective action, up to and including termination. Infractions include, but are not limited to:
			</Text>
			<BulletList
				items={[
					'Falsifying any school documents.',
					'Unauthorized possession of school property or weapons.',
					'Using cell phones during instructional time.',
					'Engaging in or inciting disorderly conduct.',
					'Insubordination or refusal to perform assigned duties.',
					'Causing physical or emotional harm to a student.',
					'Breach of confidentiality.',
					'Unexcused absenteeism or tardiness.',
					'Failure to submit lesson plans or assessment materials on time.',
					'Soliciting or accepting bribes, gifts, or enticements for grades or favors.',
				]}
			/>
			<Text style={[styles.subTitle, { marginTop: 8 }]}>6.5.1 CONFIDENTIALITY</Text>
			<Text style={styles.paragraph}>
				All employees are responsible for safeguarding confidential information concerning students, finances, and personnel. Unauthorized disclosure is grounds for immediate termination and potential legal action.
			</Text>
		</View>
	);

	const section7Left = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 7: WORKPLACE ENVIRONMENT</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>7.1 SMOKING</Text>
			<Text style={styles.paragraph}>
				Smoking is strictly prohibited on all school premises and at all school-related activities.
			</Text>
			<Text style={styles.subTitle}>7.2 ALCOHOL & DRUGS</Text>
			<Text style={styles.paragraph}>
				In compliance with Islamic law and to ensure a safe workplace,the use, possession, or being under the influence of alcohol, illegal drugs, or intoxicants on school premises is strictly forbidden.
			</Text>
			<Text style={styles.subTitle}>7.3 HARASSMENT</Text>
			<Text style={styles.paragraph}>
				The Institute has zero tolerance for any form of harassment—sexual,racial, ethnic, or otherwise. This includes slurs, derogatory comments, unwelcome jokes, and visual or physical conduct. All incidents must be reported to the Principal immediately.
			</Text>
			<Text style={styles.subTitle}>7.4 DRESS & PERSONAL APPEARANCE</Text>
			<Text style={styles.paragraph}>
				Staff must maintain a professional, neat, and modest appearance. Inappropriate attire includes sweat suits, shorts, tight/revealing clothing, spaghetti straps, and beachwear. Hair and facial hair must be well-groomed. Female Muslim staff is required to wear the Hijab at all school functions; non-Muslim female staff must wear a head tie at school functions.
			</Text>
		</View>
	);

	const section8Right = (
		<View>
			<Text style={styles.sectionTitle}>SECTION 8: CHANGES IN POLICY</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.paragraph}>
				As Safa Islamic Institute reserves the right to modify, revise, or discontinue any policies at any time. Changes will be communicated via bulletin board or other appropriate means and are effective on the dates determined by the Institute.
			</Text>
			<Text style={styles.sectionTitle}>SECTION 9: GRADING SYSTEM</Text>
			<View style={styles.sectionRule} />
			<Text style={styles.subTitle}>ACTIVITY SCORE</Text>
			<BulletList
				items={[
					'Class work 5 points',
					'Class participation 5 points',
					'Assignment 10 points',
					'Attendants 10 opoints',
					'Quiz 20 points',
					'Test 40 points',
					'Semester Exam 100 points',
					'Final Exam 100 points',
				]}
			/>
		</View>
	);

	const totalPages = 20;
	const pages: PageSlot[] = Array.from({ length: totalPages + 1 }, () => blankPage);

	pages[1] = { content: coverFront, style: styles.coverPage };
	pages[2] = blankPage;
	pages[3] = numberedPage(3, tocLeft, styles.tocPage, tocNumberColor);
	pages[4] = numberedPage(4, tocRight, styles.tocPage, tocNumberColor);
	pages[5] = numberedPage(5, section1IntroLeft);
	pages[6] = numberedPage(6, section1IntroRight);
	pages[7] = numberedPage(7, section1EthicsLeft);
	pages[8] = numberedPage(8, section1ExpectationsRight);
	pages[9] = numberedPage(9, section2Left);
	pages[10] = numberedPage(10, section2Right);
	pages[11] = numberedPage(11, section3Left);
	pages[12] = numberedPage(12, section3Right);
	pages[13] = numberedPage(13, section4Left);
	pages[14] = numberedPage(14, section5Right);
	pages[15] = numberedPage(15, section6Left);
	pages[16] = numberedPage(16, section6Right);
	pages[17] = numberedPage(17, section7Left);
	pages[18] = numberedPage(18, section8Right);
	pages[19] = blankPage;
	pages[20] = { content: coverBack, style: styles.coverPage };

	const sheetMap: Array<[number, number]> = [];
	for (let i = 0; i < totalPages / 2; i += 2) {
		sheetMap.push([totalPages - i, i + 1]);
		sheetMap.push([i + 2, totalPages - i - 1]);
	}

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

const CodeOfConductPage = () => {
	return (
		<div style={{ width: '100%', height: '100vh' }}>
			<PDFViewer width="100%" height="100%">
				<CodeOfConductDocument />
			</PDFViewer>
		</div>
	);
};

export default CodeOfConductPage;
