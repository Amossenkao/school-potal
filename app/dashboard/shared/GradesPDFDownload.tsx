import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSchoolStore } from '@/store/schoolStore';

// Types
interface TeacherInfo {
	name?: string;
	firstName?: string;
	lastName?: string;
	fullName?: string;
	username: string;
}

interface GradesPDFProps {
	teacherInfo: TeacherInfo | null;
	gradeData: any;
	className: string;
	classLevel: string;
	subject: string;
	academicYear: string;
	disabled?: boolean;
	onReadyChange?: (ready: boolean) => void;
}

const periods = [
	{ id: 'first', label: '1st Pd', value: 'first' },
	{ id: 'second', label: '2nd Pd', value: 'second' },
	{ id: 'third', label: '3rd Pd', value: 'third' },
	{
		id: 'third_period_exam',
		label: '3rd Pd Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: '4th Pd', value: 'fourth' },
	{ id: 'fifth', label: '5th Pd', value: 'fifth' },
	{ id: 'sixth', label: '6th Pd', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: '6th Pd Exam',
		value: 'sixth_period_exam',
	},
];

// Constants for pagination
const STUDENTS_PER_PAGE = 22;

// PDF Styles
const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		paddingTop: 24,
		paddingRight: 22,
		paddingBottom: 28,
		paddingLeft: 70, // extra binding margin
		fontSize: 9,
	},
	header: {
		marginBottom: 15,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	logo: {
		width: 60,
		height: 60,
	},
	headerContent: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 10,
	},
	schoolName: {
		fontSize: 18,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 2,
	},
	schoolAddress: {
		fontSize: 12,
		textAlign: 'center',
		marginBottom: 1,
		color: '#666',
	},
	reportTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		textAlign: 'center',
		color: '#1a365d',
		marginBottom: 8,
		marginTop: 8,
	},
	coverPage: {
		flexDirection: 'column',
		backgroundColor: '#f8fafc',
		paddingTop: 34,
		paddingRight: 34,
		paddingBottom: 30,
		paddingLeft: 86,
		position: 'relative',
	},
	coverAccentBar: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		width: 52,
		backgroundColor: '#e2e8f0',
	},
	coverAccentStripe: {
		position: 'absolute',
		left: 52,
		top: 0,
		bottom: 0,
		width: 8,
		backgroundColor: '#38bdf8',
	},
	coverBackdrop: {
		position: 'absolute',
		right: -90,
		top: -60,
		width: 420,
		height: 420,
		borderRadius: 210,
		backgroundColor: '#e0f2fe',
		opacity: 0.8,
	},
	coverGlow: {
		position: 'absolute',
		right: 10,
		bottom: -110,
		width: 360,
		height: 360,
		borderRadius: 180,
		backgroundColor: '#bae6fd',
		opacity: 0.35,
	},
	coverRibbon: {
		position: 'absolute',
		right: -30,
		top: 90,
		width: 300,
		height: 96,
		backgroundColor: '#ffffff',
		transform: 'rotate(-12deg)',
		opacity: 0.9,
	},
	coverRibbonEdge: {
		position: 'absolute',
		right: -22,
		top: 106,
		width: 300,
		height: 6,
		backgroundColor: '#0ea5e9',
		transform: 'rotate(-12deg)',
	},
	coverHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	coverLogoBox: {
		width: 72,
		height: 72,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	coverSchoolBlock: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 12,
	},
	coverSchoolName: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#0f172a',
		textAlign: 'center',
	},
	coverSchoolAddress: {
		fontSize: 11,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 4,
	},
	coverDivider: {
		height: 1,
		backgroundColor: '#e2e8f0',
		marginTop: 16,
		marginBottom: 16,
	},
	coverTitleBlock: {
		marginTop: 6,
		marginBottom: 16,
	},
	coverKicker: {
		fontSize: 10,
		textTransform: 'uppercase',
		letterSpacing: 3,
		color: '#0ea5e9',
		marginBottom: 8,
	},
	coverTitleLarge: {
		fontSize: 30,
		fontWeight: 'bold',
		color: '#0f172a',
	},
	coverSubtitle: {
		fontSize: 11,
		color: '#475569',
		marginTop: 8,
	},
	coverMetaCard: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 18,
		backgroundColor: '#ffffff',
	},
	coverMetaRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 10,
	},
	coverMetaLabel: {
		width: 140,
		fontSize: 10,
		color: '#64748b',
	},
	coverMetaValue: {
		flex: 1,
		fontSize: 12,
		color: '#0f172a',
		fontWeight: 'bold',
	},
	coverFooter: {
		marginTop: 18,
		fontSize: 9,
		color: '#94a3b8',
	},
	coverBadge: {
		position: 'absolute',
		right: 40,
		bottom: 36,
		width: 110,
		height: 110,
		borderRadius: 55,
		backgroundColor: '#ffffff',
		borderWidth: 2,
		borderColor: '#0ea5e9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	coverBadgeText: {
		fontSize: 9,
		color: '#0ea5e9',
		letterSpacing: 1.4,
		textTransform: 'uppercase',
		textAlign: 'center',
	},
	coverBadgeYear: {
		fontSize: 16,
		color: '#0f172a',
		fontWeight: 'bold',
		marginTop: 6,
	},
	coverMetaGrid: {
		marginTop: 10,
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	coverMetaChip: {
		width: '48%',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		marginBottom: 10,
		marginRight: '4%',
		backgroundColor: '#f8fafc',
	},
	coverMetaChipRight: {
		marginRight: 0,
	},
	coverMetaChipWide: {
		width: '100%',
		marginRight: 0,
	},
	coverMetaChipLabel: {
		fontSize: 9,
		color: '#64748b',
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
	coverMetaChipValue: {
		fontSize: 12,
		color: '#0f172a',
		fontWeight: 'bold',
		marginTop: 6,
	},

	infoSection: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end',
		marginBottom: 15,
		backgroundColor: '#f8fafc',
		padding: 5,
		paddingTop: 10,
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#e2e8f0',
	},
	infoText: {
		fontSize: 9,
		color: '#2d3748',
		textAlign: 'center',
	},
	infoDivider: {
		marginHorizontal: 8,
		fontSize: 9,
		color: '#666',
		fontWeight: 'bold',
	},
	table: {
		width: '100%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#000',
		borderRightWidth: 0,
		borderBottomWidth: 0,
	},
	tableRow: {
		flexDirection: 'row',
	},
	tableHeader: {
		backgroundColor: '#f0f0f0',
	},
	tableCell: {
		flex: 1,
		padding: 5,
		fontSize: 8,
		textAlign: 'center',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#000',
		borderLeftWidth: 0,
		borderTopWidth: 0,
	},
	tableCellName: {
		flex: 2.3,
		padding: 5,
		fontSize: 8,
		textAlign: 'left',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#000',
		borderLeftWidth: 0,
		borderTopWidth: 0,
	},
	passGrade: {
		color: '#2563eb',
		fontWeight: 'bold',
	},
	failGrade: {
		color: '#dc2626',
		fontWeight: 'bold',
	},
	pageNumber: {
		position: 'absolute',
		bottom: 15,
		right: 20,
		fontSize: 8,
		color: '#666',
	},
	footer: {
		position: 'absolute',
		bottom: 15,
		left: 20,
		fontSize: 7,
		color: '#666',
	},
	watermark: {
		position: 'absolute',
		top: '40%',
		left: '50%',
		transform: 'translate(-50%, -50%)',
		opacity: 0.1,
		zIndex: -1,
	},
	watermarkImage: {
		width: 200,
		height: 200,
	},
	coverWatermark: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: 'translate(-50%, -50%)',
		opacity: 0.06,
	},
	coverWatermarkImage: {
		width: 260,
		height: 260,
	},
	tableCellNo: {
		flex: 0.5,
		padding: 5,
		fontSize: 8,
		textAlign: 'center',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#000',
		borderLeftWidth: 0,
		borderTopWidth: 0,
	},
});

const CoverPage: React.FC<{
	school: any;
	academicYear: string;
	classLevel: string;
	className: string;
	subject: string;
	teacherName: string;
	includeClass?: boolean;
	includeSubject?: boolean;
}> = ({
	school,
	academicYear,
	classLevel,
	className,
	subject,
	teacherName,
	includeClass = true,
	includeSubject = true,
}) => (
	<Page size="A4" orientation="landscape" style={styles.coverPage} wrap={false}>
		<View style={styles.coverAccentBar} fixed />
		<View style={styles.coverAccentStripe} fixed />
		<View style={styles.coverBackdrop} fixed />
		<View style={styles.coverGlow} fixed />
		<View style={styles.coverRibbon} fixed />
		<View style={styles.coverRibbonEdge} fixed />

		<View style={styles.coverHeader}>
			<View style={styles.coverLogoBox}>
				{typeof school.logoUrl2 === 'string' &&
				school.logoUrl2.trim().length > 0 ? (
					<Image src={school.logoUrl2} style={styles.logo} />
				) : (
					<View style={styles.logo} />
				)}
			</View>
			<View style={styles.coverSchoolBlock}>
				<Text style={styles.coverSchoolName}>{school.name || 'School'}</Text>
				<Text style={styles.coverSchoolAddress}>
					{(Array.isArray(school.address)
						? school.address
						: school.address
							? [school.address]
							: []
					)
						.filter(Boolean)
						.join('\n')}
				</Text>
			</View>
			<View style={styles.coverLogoBox}>
				{typeof school.logoUrl === 'string' &&
				school.logoUrl.trim().length > 0 ? (
					<Image src={school.logoUrl} style={styles.logo} />
				) : (
					<View style={styles.logo} />
				)}
			</View>
		</View>

		<View style={styles.coverDivider} />

		<View style={styles.coverTitleBlock}>
			<Text style={styles.coverKicker}>Master Grade Sheets</Text>
			<Text style={styles.coverTitleLarge}>Academic Record Book</Text>
			{/* <Text style={styles.coverTitleLarge}>Book</Text> */}
			<Text style={styles.coverSubtitle}>
				Official compilation for academic reporting, auditing, and archival.
			</Text>
		</View>

		<View style={styles.coverMetaCard}>
			<View style={styles.coverMetaRow}>
				<Text style={styles.coverMetaLabel}>Academic Year</Text>
				<Text style={styles.coverMetaValue}>{academicYear}</Text>
			</View>
			<View style={styles.coverMetaGrid}>
				<View style={styles.coverMetaChip}>
					<Text style={styles.coverMetaChipLabel}>Division</Text>
					<Text style={styles.coverMetaChipValue}>{classLevel || '-'}</Text>
				</View>
				{includeClass && (
					<View style={[styles.coverMetaChip, styles.coverMetaChipRight]}>
						<Text style={styles.coverMetaChipLabel}>Class</Text>
						<Text style={styles.coverMetaChipValue}>{className}</Text>
					</View>
				)}
				{includeSubject && (
					<View style={[styles.coverMetaChip, styles.coverMetaChipWide]}>
						<Text style={styles.coverMetaChipLabel}>Subject</Text>
						<Text style={styles.coverMetaChipValue}>{subject}</Text>
					</View>
				)}
				<View style={[styles.coverMetaChip, styles.coverMetaChipWide]}>
					<Text style={styles.coverMetaChipLabel}>Teacher</Text>
					<Text style={styles.coverMetaChipValue}>{teacherName}</Text>
				</View>
			</View>
		</View>

		<View style={styles.coverFooter}>
			<Text>Confidential • For official use only</Text>
		</View>

		<View style={styles.coverBadge} fixed>
			<Text style={styles.coverBadgeText}>Issued</Text>
			<Text style={styles.coverBadgeYear}>{academicYear}</Text>
		</View>
	</Page>
);

// Table Header Component
const TableHeader: React.FC = () => (
	<View style={[styles.tableRow, styles.tableHeader]} fixed>
		<Text style={styles.tableCellNo}>No.</Text>
		<Text style={styles.tableCellName}>Student Name</Text>
		{periods.map((period) => (
			<Text key={period.value} style={styles.tableCell}>
				{period.label}
			</Text>
		))}
	</View>
);

// Student Row Component
const StudentRow: React.FC<{ student: any; index: number }> = ({
	student,
	index,
}) => {
	return (
		<View style={styles.tableRow}>
			<Text style={styles.tableCellNo}>{index}</Text>
			<Text style={styles.tableCellName}>{student?.studentName || ''}</Text>
			{periods.map((period) => {
				const grade = student?.periods?.[period.value];
				return (
					<Text
						key={period.value}
						style={[
							styles.tableCell,
							grade >= 70
								? styles.passGrade
								: grade < 70 && grade !== null && grade !== undefined
									? styles.failGrade
									: {},
						]}
					>
						{grade !== null && grade !== undefined
							? typeof grade === 'number'
								? grade.toFixed(0)
								: grade
							: ''}
					</Text>
				);
			})}
		</View>
	);
};

// PDF Document Component
const GradesPDF: React.FC<{
	teacherInfo: TeacherInfo | null;
	gradeData: any;
	className: string;
	classLevel: string;
	subject: string;
	academicYear: string;
	school: any;
}> = ({
	teacherInfo,
	gradeData,
	className,
	classLevel,
	subject,
	academicYear,
	school,
}) => {
	const teacherName = teacherInfo?.fullName || '___________________________';

	const buildEmptyRows = (count: number, prefix: string) =>
		Array.from({ length: count }, (_, i) => ({
			studentId: `${prefix}-${i + 1}`,
			studentName: '',
			periods: {},
			__empty: true,
		}));

	const buildPagesForStudents = (students: any[], pageKeyPrefix: string) => {
		const sortedStudents = students.slice().sort((a: any, b: any) =>
			(a.studentName || '').localeCompare(b.studentName || '', undefined, {
				sensitivity: 'base',
			}),
		);

		const basePages = Array.from(
			{ length: Math.ceil(sortedStudents.length / STUDENTS_PER_PAGE) || 1 },
			(_, index) =>
				sortedStudents.slice(
					index * STUDENTS_PER_PAGE,
					(index + 1) * STUDENTS_PER_PAGE,
				),
		);

		const lastPageCount =
			basePages.length > 0 ? basePages[basePages.length - 1].length : 0;
		const remainingSlots = STUDENTS_PER_PAGE - lastPageCount;
		const shouldAddExtraPage = remainingSlots === 0 || remainingSlots < 8;

		if (remainingSlots > 0) {
			basePages[basePages.length - 1] = basePages[basePages.length - 1].concat(
				buildEmptyRows(remainingSlots, `${pageKeyPrefix}-empty-fill`),
			);
		}

		return shouldAddExtraPage
			? [
					...basePages,
					buildEmptyRows(STUDENTS_PER_PAGE, `${pageKeyPrefix}-empty-page`),
				]
			: basePages;
	};

	const multiClass = Array.isArray(gradeData?.multiClass)
		? gradeData.multiClass
		: null;
	const multiSubject = Array.isArray(gradeData?.multiSubject)
		? gradeData.multiSubject
		: null;

	const normalizedStudents = (
		Array.isArray(gradeData?.students) ? gradeData.students : []
	)
		.filter(Boolean)
		.map((student: any) => ({
			studentId: student.studentId ?? student.id ?? student._id ?? '',
			studentName: student.studentName ?? '',
			periods: student.periods ?? {},
		}));

	const pages =
		multiClass || multiSubject
			? []
			: buildPagesForStudents(normalizedStudents, 'single');

	return (
		<Document>
			<CoverPage
				school={school}
				academicYear={academicYear}
				classLevel={classLevel}
				className={className}
				subject={subject}
				teacherName={teacherName}
				includeClass={!multiClass}
				includeSubject={!multiSubject}
			/>

			{multiClass
				? multiClass.flatMap((entry: any, classIndex: number) => {
						const students = Array.isArray(entry?.students)
							? entry.students
							: [];
						const normalized = students.filter(Boolean).map((student: any) => ({
							studentId: student.studentId ?? student.id ?? student._id ?? '',
							studentName: student.studentName ?? '',
							periods: student.periods ?? {},
						}));
						const classPages = buildPagesForStudents(
							normalized,
							`class-${classIndex}`,
						);
						return classPages.map((pageStudents, index) => (
							<Page
								key={`class-${classIndex}-page-${index}`}
								size="A4"
								orientation="landscape"
								style={styles.page}
							>
								<View style={styles.watermark}>
									{typeof school.logoUrl === 'string' &&
									school.logoUrl.trim().length > 0 ? (
										<Image src={school.logoUrl} style={styles.watermarkImage} />
									) : (
										<View style={styles.watermarkImage} />
									)}
								</View>

								<View style={styles.infoSection}>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Academic Year:</Text>{' '}
										{academicYear}
									</Text>
									<Text style={styles.infoDivider}>|</Text>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Class:</Text>{' '}
										{entry?.className || ''}
									</Text>
									<Text style={styles.infoDivider}>|</Text>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Subject:</Text>{' '}
										{subject}
									</Text>
									<Text style={styles.infoDivider}>|</Text>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Teacher:</Text>{' '}
										{teacherName}
									</Text>
								</View>

								<View style={styles.table}>
									<TableHeader />
									{pageStudents.length > 0 ? (
										pageStudents.map((student: any, rowIndex: number) => (
											<StudentRow
												key={String(
													student?.studentId ||
														`${classIndex}-${index}-${rowIndex}`,
												)}
												student={student}
												index={index * STUDENTS_PER_PAGE + rowIndex + 1}
											/>
										))
									) : (
										<View style={styles.tableRow}>
											<Text
												style={[
													styles.tableCellName,
													{ textAlign: 'center', flex: 12 },
												]}
											>
												No students found for this class and subject.
											</Text>
										</View>
									)}
								</View>

								<Text
									style={styles.pageNumber}
									render={({ pageNumber, totalPages }) =>
										`Page ${pageNumber} of ${totalPages}`
									}
									fixed
								/>
								<Text style={styles.footer} fixed>
									Generated by {school.name} e-Potal System
								</Text>
							</Page>
						));
					})
				: multiSubject
					? multiSubject.flatMap((entry: any, subjectIndex: number) => {
							const students = Array.isArray(entry?.students)
								? entry.students
								: [];
							const normalized = students
								.filter(Boolean)
								.map((student: any) => ({
									studentId:
										student.studentId ?? student.id ?? student._id ?? '',
									studentName: student.studentName ?? '',
									periods: student.periods ?? {},
								}));
							const subjectPages = buildPagesForStudents(
								normalized,
								`subject-${subjectIndex}`,
							);
							return subjectPages.map((pageStudents, index) => (
								<Page
									key={`subject-${subjectIndex}-page-${index}`}
									size="A4"
									orientation="landscape"
									style={styles.page}
								>
									<View style={styles.watermark}>
										{typeof school.logoUrl === 'string' &&
										school.logoUrl.trim().length > 0 ? (
											<Image
												src={school.logoUrl}
												style={styles.watermarkImage}
											/>
										) : (
											<View style={styles.watermarkImage} />
										)}
									</View>

									<View style={styles.infoSection}>
										<Text style={styles.infoText}>
											<Text style={{ fontWeight: 'bold' }}>Academic Year:</Text>{' '}
											{academicYear}
										</Text>
										<Text style={styles.infoDivider}>|</Text>
										<Text style={styles.infoText}>
											<Text style={{ fontWeight: 'bold' }}>Class:</Text>{' '}
											{className}
										</Text>
										<Text style={styles.infoDivider}>|</Text>
										<Text style={styles.infoText}>
											<Text style={{ fontWeight: 'bold' }}>Subject:</Text>{' '}
											{entry?.subject || ''}
										</Text>
										<Text style={styles.infoDivider}>|</Text>
										<Text style={styles.infoText}>
											<Text style={{ fontWeight: 'bold' }}>Teacher:</Text>{' '}
											{teacherName}
										</Text>
									</View>

									<View style={styles.table}>
										<TableHeader />
										{pageStudents.length > 0 ? (
											pageStudents.map((student: any, rowIndex: number) => (
												<StudentRow
													key={String(
														student?.studentId ||
															`${subjectIndex}-${index}-${rowIndex}`,
													)}
													student={student}
													index={index * STUDENTS_PER_PAGE + rowIndex + 1}
												/>
											))
										) : (
											<View style={styles.tableRow}>
												<Text
													style={[
														styles.tableCellName,
														{ textAlign: 'center', flex: 12 },
													]}
												>
													No students found for this class and subject.
												</Text>
											</View>
										)}
									</View>

									<Text
										style={styles.pageNumber}
										render={({ pageNumber, totalPages }) =>
											`Page ${pageNumber} of ${totalPages}`
										}
										fixed
									/>
									<Text style={styles.footer} fixed>
										Generated by {school.name} e-Potal System
									</Text>
								</Page>
							));
						})
					: pages.map((pageStudents, index) => (
							<Page
								key={`page-${index}`}
								size="A4"
								orientation="landscape"
								style={styles.page}
							>
								<View style={styles.watermark}>
									{typeof school.logoUrl === 'string' &&
									school.logoUrl.trim().length > 0 ? (
										<Image src={school.logoUrl} style={styles.watermarkImage} />
									) : (
										<View style={styles.watermarkImage} />
									)}
								</View>

								<View style={styles.infoSection}>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Academic Year:</Text>{' '}
										{academicYear}
									</Text>
									<Text style={styles.infoDivider}>|</Text>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Class:</Text>{' '}
										{className}
									</Text>
									<Text style={styles.infoDivider}>|</Text>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Subject:</Text>{' '}
										{subject}
									</Text>
									<Text style={styles.infoDivider}>|</Text>
									<Text style={styles.infoText}>
										<Text style={{ fontWeight: 'bold' }}>Teacher:</Text>{' '}
										{teacherName}
									</Text>
								</View>

								<View style={styles.table}>
									<TableHeader />
									{pageStudents.length > 0 ? (
										pageStudents.map((student: any, rowIndex: number) => (
											<StudentRow
												key={String(
													student?.studentId || `${index}-${rowIndex}`,
												)}
												student={student}
												index={index * STUDENTS_PER_PAGE + rowIndex + 1}
											/>
										))
									) : (
										<View style={styles.tableRow}>
											<Text
												style={[
													styles.tableCellName,
													{ textAlign: 'center', flex: 12 },
												]}
											>
												No students found for this class and subject.
											</Text>
										</View>
									)}
								</View>

								<Text
									style={styles.pageNumber}
									render={({ pageNumber, totalPages }) =>
										`Page ${pageNumber} of ${totalPages}`
									}
									fixed
								/>
								<Text style={styles.footer} fixed>
									Generated by {school.name} e-Potal System
								</Text>
							</Page>
						))}
		</Document>
	);
};

// Main Component with School Store
const GradesPDFDownload: React.FC<GradesPDFProps> = ({
	teacherInfo,
	gradeData,
	className,
	classLevel,
	subject,
	academicYear,
	disabled = false,
	onReadyChange,
}) => {
	const school = useSchoolStore((state) => state.school);
	const [instance, updateInstance] = usePDF({ document: null });
	const lastRenderKeyRef = useRef<string>('');

	const fileName = `${classLevel}_${subject}_${className || 'Grades'}_${
		new Date().toISOString().split('T')[0]
	}.pdf`;

	if (!school) {
		return (
			<button
				disabled={true}
				className="px-4 py-2 bg-muted text-muted-foreground rounded-md cursor-not-allowed flex items-center gap-2"
			>
				<Download className="w-4 h-4" />
				Preparing PDF...
			</button>
		);
	}

	if (
		!gradeData ||
		(!gradeData.students && !gradeData.multiClass && !gradeData.multiSubject)
	) {
		return (
			<button
				disabled={true}
				className="px-4 py-2 bg-muted text-muted-foreground rounded-md cursor-not-allowed flex items-center gap-2"
			>
				<Download className="w-4 h-4" />
				Download Grades
			</button>
		);
	}

	const doc = useMemo(() => {
		if (!school) return null;
		return (
			<GradesPDF
				teacherInfo={teacherInfo}
				gradeData={gradeData}
				className={className}
				classLevel={classLevel}
				subject={subject}
				academicYear={academicYear}
				school={school}
			/>
		);
	}, [
		teacherInfo,
		gradeData,
		className,
		classLevel,
		subject,
		academicYear,
		school,
	]);

	const docRenderKey = useMemo(() => {
		const teacherKey = [
			teacherInfo?.username || '',
			teacherInfo?.name || '',
			teacherInfo?.firstName || '',
			teacherInfo?.lastName || '',
			teacherInfo?.fullName || '',
		].join('|');

		const studentKey = Array.isArray(gradeData?.multiClass)
			? gradeData.multiClass
					.map((entry: any) => {
						const students = Array.isArray(entry?.students)
							? entry.students
							: [];
						const classKey = students
							.map((student: any) => {
								const periodsSnapshot = periods
									.map((period) => {
										const v = student?.periods?.[period.value];
										return `${period.value}:${v ?? ''}`;
									})
									.join(',');
								return `${student?.studentId || ''}:${student?.studentName || ''}:${periodsSnapshot}`;
							})
							.join('|');
						return `${entry?.classId || ''}:${entry?.className || ''}:${classKey}`;
					})
					.join('||')
			: Array.isArray(gradeData?.multiSubject)
				? gradeData.multiSubject
						.map((entry: any) => {
							const students = Array.isArray(entry?.students)
								? entry.students
								: [];
							const subjectKey = students
								.map((student: any) => {
									const periodsSnapshot = periods
										.map((period) => {
											const v = student?.periods?.[period.value];
											return `${period.value}:${v ?? ''}`;
										})
										.join(',');
									return `${student?.studentId || ''}:${student?.studentName || ''}:${periodsSnapshot}`;
								})
								.join('|');
							return `${entry?.subject || ''}:${subjectKey}`;
						})
						.join('||')
				: (Array.isArray(gradeData?.students) ? gradeData.students : [])
						.map((student: any) => {
							const periodsSnapshot = periods
								.map((period) => {
									const v = student?.periods?.[period.value];
									return `${period.value}:${v ?? ''}`;
								})
								.join(',');
							return `${student?.studentId || ''}:${student?.studentName || ''}:${periodsSnapshot}`;
						})
						.join('|');

		return [
			school?.name || '',
			academicYear || '',
			classLevel || '',
			className || '',
			subject || '',
			teacherKey,
			studentKey,
		].join('||');
	}, [
		school?.name,
		academicYear,
		classLevel,
		className,
		subject,
		teacherInfo,
		gradeData,
	]);

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

	const isReady = Boolean(instance.url) && !instance.loading;
	useEffect(() => {
		onReadyChange?.(isReady);
	}, [isReady, onReadyChange]);

	return (
		<a
			href={isReady ? instance.url! : undefined}
			download={isReady ? fileName : undefined}
			className={`px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2 ${
				disabled || !isReady
					? 'bg-muted text-muted-foreground cursor-not-allowed'
					: 'bg-primary text-primary-foreground hover:bg-primary/90'
			}`}
			aria-disabled={disabled || !isReady}
			onClick={(event) => {
				if (disabled || !isReady) event.preventDefault();
			}}
		>
			<Download className="w-4 h-4" />
			{instance.loading ? 'Generating PDF...' : 'Download PDF'}
		</a>
	);
};

export default GradesPDFDownload;
