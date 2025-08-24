import React from 'react';
import { Download } from 'lucide-react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	PDFDownloadLink,
	Image,
} from '@react-pdf/renderer';
import { useSchoolStore } from '@/store/schoolStore';

// Types
interface TeacherInfo {
	name?: string;
	firstName?: string;
	lastName?: string;
	teacherId: string;
}

interface GradesPDFProps {
	teacherInfo: TeacherInfo | null;
	gradeData: any;
	classLevel: string;
	subject: string;
	academicYear: string;
	disabled?: boolean;
}

const periods = [
	{ id: 'first', label: '1st Period', value: 'firstPeriod' },
	{ id: 'second', label: '2nd Period', value: 'secondPeriod' },
	{ id: 'third', label: '3rd Period', value: 'thirdPeriod' },
	{ id: 'third_exam', label: '3rd Exam', value: 'thirdPeriodExam' },
	{ id: 'fourth', label: '4th Period', value: 'fourthPeriod' },
	{ id: 'fifth', label: '5th Period', value: 'fifthPeriod' },
	{ id: 'sixth', label: '6th Period', value: 'sixthPeriod' },
	{ id: 'sixth_exam', label: '6th Exam', value: 'sixthPeriodExam' },
];

// Constants for pagination
const STUDENTS_PER_PAGE = 35;

// PDF Styles - inspired by periodic report
const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		padding: 20,
		fontSize: 10,
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
		width: 50,
		height: 50,
	},
	headerContent: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 10,
	},
	schoolName: {
		fontSize: 14,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 2,
	},
	schoolAddress: {
		fontSize: 8,
		textAlign: 'center',
		marginBottom: 1,
		color: '#666',
	},
	reportTitle: {
		fontSize: 11,
		fontWeight: 'bold',
		textAlign: 'center',
		color: '#1a365d',
		marginBottom: 8,
		marginTop: 8,
	},
	infoSection: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 15,
		backgroundColor: '#f8fafc',
		padding: 8,
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
		flexGrow: 1,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 5,
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#e2e8f0',
		minHeight: 22,
		alignItems: 'center',
	},
	tableHeader: {
		backgroundColor: '#f7fafc',
		fontWeight: 'bold',
		borderBottomWidth: 2,
		borderBottomColor: '#2d3748',
		minHeight: 28,
	},
	tableCell: {
		flex: 1,
		padding: 4,
		textAlign: 'center',
		fontSize: 8,
	},
	tableCellName: {
		flex: 2,
		padding: 4,
		textAlign: 'left',
		fontSize: 8,
	},
	passGrade: {
		color: '#2563eb',
		fontWeight: 'bold',
	},
	failGrade: {
		color: '#dc2626',
		fontWeight: 'bold',
	},
	statsSection: {
		marginTop: 15,
		marginBottom: 30,
		backgroundColor: '#f8fafc',
		padding: 12,
		borderRadius: 5,
	},
	statsTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		marginBottom: 10,
		textAlign: 'center',
		color: '#1a365d',
		textDecoration: 'underline',
	},
	statsRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#e2e8f0',
		minHeight: 20,
		alignItems: 'center',
		backgroundColor: '#ffffff',
		paddingVertical: 2,
	},
	statsLabel: {
		flex: 2,
		fontWeight: 'bold',
		padding: 4,
		fontSize: 8,
		color: '#2d3748',
	},
	statsCell: {
		flex: 1,
		padding: 4,
		textAlign: 'center',
		fontSize: 8,
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
});

// School Header Component - inspired by periodic report
const SchoolHeader: React.FC<{
	teacherName: string;
	classLevel: string;
	subject: string;
	academicYear: string;
	totalStudents: number;
	isFirstPage: boolean;
	school: any;
}> = ({
	teacherName,
	classLevel,
	subject,
	academicYear,
	totalStudents,
	isFirstPage,
	school,
}) => (
	<View style={styles.header}>
		<View style={styles.headerRow}>
			<View>
				{school.logoUrl2 && <Image src={school.logoUrl2} style={styles.logo} />}
			</View>
			<View style={styles.headerContent}>
				<Text style={styles.schoolName}>{school.name}</Text>
				<Text style={styles.schoolAddress}>{school.address.join(', ')}</Text>
				<Text style={styles.schoolAddress}>
					P.O Box 2523 Montserrado County-Liberia
				</Text>
			</View>
			<View>
				{school.logoUrl && <Image src={school.logoUrl} style={styles.logo} />}
			</View>
		</View>

		<Text style={styles.reportTitle}>MASTER GRADE SHEET</Text>

		{isFirstPage && (
			<View style={styles.infoSection}>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Teacher:</Text> {teacherName}
				</Text>
				<Text style={styles.infoDivider}>|</Text>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Class:</Text> {classLevel}
				</Text>
				<Text style={styles.infoDivider}>|</Text>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Subject:</Text> {subject}
				</Text>
				<Text style={styles.infoDivider}>|</Text>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Academic Year:</Text>{' '}
					{academicYear}
				</Text>
				<Text style={styles.infoDivider}>|</Text>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Students:</Text> {totalStudents}
				</Text>
				<Text style={styles.infoDivider}>|</Text>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Date:</Text>{' '}
					{new Date().toLocaleDateString()}
				</Text>
			</View>
		)}
	</View>
);

// Table Header Component
const TableHeader: React.FC = () => (
	<View style={[styles.tableRow, styles.tableHeader]}>
		<Text style={styles.tableCellName}>Student Name</Text>
		{periods.map((period) => (
			<Text key={period.value} style={styles.tableCell}>
				{period.label}
			</Text>
		))}
	</View>
);

// Student Row Component - no averages calculated
const StudentRow: React.FC<{ student: any }> = ({ student }) => (
	<View style={styles.tableRow}>
		<Text style={styles.tableCellName}>{student.studentName}</Text>
		{periods.map((period) => {
			const grade = student.periods?.[period.value];
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
							? grade.toFixed(1)
							: grade
						: '-'}
				</Text>
			);
		})}
	</View>
);

// Statistics Section Component - no averages
const StatisticsSection: React.FC<{ stats: any }> = ({ stats }) => (
	<View style={styles.statsSection}>
		<Text style={styles.statsTitle}>CLASS STATISTICS - GRADE SUMMARY</Text>

		<View style={styles.table}>
			<TableHeader />

			<View style={[styles.statsRow, { backgroundColor: '#e8f5e8' }]}>
				<Text style={styles.statsLabel}>Number of Passes</Text>
				{periods.map((period) => (
					<Text
						key={`passes-${period.value}`}
						style={[styles.statsCell, styles.passGrade]}
					>
						{stats[period.value]?.passes || 0}
					</Text>
				))}
			</View>

			<View style={[styles.statsRow, { backgroundColor: '#ffe8e8' }]}>
				<Text style={styles.statsLabel}>Number of Fails</Text>
				{periods.map((period) => (
					<Text
						key={`fails-${period.value}`}
						style={[styles.statsCell, styles.failGrade]}
					>
						{stats[period.value]?.fails || 0}
					</Text>
				))}
			</View>

			<View style={[styles.statsRow, { backgroundColor: '#f0f0f0' }]}>
				<Text style={styles.statsLabel}>Incompletes</Text>
				{periods.map((period) => (
					<Text key={`incompletes-${period.value}`} style={styles.statsCell}>
						{stats[period.value]?.incompletes || 0}
					</Text>
				))}
			</View>

			<View style={[styles.statsRow, { backgroundColor: '#e8f4fd' }]}>
				<Text style={styles.statsLabel}>Class Average</Text>
				{periods.map((period) => {
					const avg = stats[period.value]?.classAverage || 0;
					return (
						<Text
							key={`average-${period.value}`}
							style={[
								styles.statsCell,
								avg >= 70 ? styles.passGrade : avg > 0 ? styles.failGrade : {},
							]}
						>
							{avg > 0 ? avg.toFixed(1) : '-'}
						</Text>
					);
				})}
			</View>
		</View>
	</View>
);

// PDF Document Component
const GradesPDF: React.FC<{
	teacherInfo: TeacherInfo | null;
	gradeData: any;
	classLevel: string;
	subject: string;
	academicYear: string;
	school: any;
}> = ({
	teacherInfo,
	gradeData,
	classLevel,
	subject,
	academicYear,
	school,
}) => {
	const teacherName =
		teacherInfo?.name ||
		`${teacherInfo?.firstName || ''} ${teacherInfo?.lastName || ''}`.trim() ||
		'Unknown Teacher';

	// Calculate statistics for each period - no averages
	const getGradeStats = (students: any[]) => {
		const stats: any = {};

		periods.forEach((period) => {
			let passes = 0;
			let fails = 0;
			let incompletes = 0;
			let totalGrades = 0;
			let gradeSum = 0;

			students.forEach((student: any) => {
				const grade = student.periods?.[period.value];

				if (grade !== null && grade !== undefined) {
					totalGrades++;
					gradeSum += grade;

					if (grade >= 70) {
						passes++;
					} else {
						fails++;
					}
				} else {
					incompletes++;
				}
			});

			const classAverage = totalGrades > 0 ? gradeSum / totalGrades : 0;

			stats[period.value] = { passes, fails, incompletes, classAverage };
		});

		return stats;
	};

	// Use students as-is, no average calculations
	const students = gradeData?.students || [];
	const stats = getGradeStats(students);

	// Split students into pages
	const studentPages = [];
	for (let i = 0; i < students.length; i += STUDENTS_PER_PAGE) {
		studentPages.push(students.slice(i, i + STUDENTS_PER_PAGE));
	}

	// If no students, create at least one page
	if (studentPages.length === 0) {
		studentPages.push([]);
	}

	return (
		<Document>
			{studentPages.map((pageStudents, pageIndex) => {
				const isFirstPage = pageIndex === 0;
				const isLastPage = pageIndex === studentPages.length - 1;
				const pageNumber = pageIndex + 1;
				const totalPages = studentPages.length;

				return (
					<Page
						key={pageIndex}
						size="A4"
						orientation="portrait"
						style={styles.page}
					>
						{/* Watermark */}
						<View style={styles.watermark}>
							{school.logoUrl && (
								<Image src={school.logoUrl} style={styles.watermarkImage} />
							)}
						</View>

						{/* School Header */}
						<SchoolHeader
							teacherName={teacherName}
							classLevel={classLevel}
							subject={subject}
							academicYear={academicYear}
							totalStudents={students.length}
							isFirstPage={isFirstPage}
							school={school}
						/>

						{/* Grades Table */}
						<View style={styles.table}>
							<TableHeader />

							{pageStudents.length > 0 ? (
								pageStudents.map((student: any, index: number) => (
									<StudentRow
										key={student.studentId || index}
										student={student}
									/>
								))
							) : (
								<View style={styles.tableRow}>
									<Text
										style={[
											styles.tableCellName,
											{ textAlign: 'center', flex: 10 },
										]}
									>
										No students found for this class and subject.
									</Text>
								</View>
							)}
						</View>

						{/* Statistics - only on last page */}
						{isLastPage && students.length > 0 && (
							<StatisticsSection stats={stats} />
						)}

						{/* Page Number */}
						<Text style={styles.pageNumber}>
							Page {pageNumber} of {totalPages}
						</Text>

						{/* Footer */}
						<Text style={styles.footer}>
							Generated by {school.name} Student Information System
						</Text>
					</Page>
				);
			})}
		</Document>
	);
};

// Main Component with School Store
const GradesPDFDownload: React.FC<GradesPDFProps> = ({
	teacherInfo,
	gradeData,
	classLevel,
	subject,
	academicYear,
	disabled = false,
}) => {
	const school = useSchoolStore((state) => state.school);

	const fileName = `${classLevel}_${subject}_Grades_${
		new Date().toISOString().split('T')[0]
	}.pdf`;

	if (!gradeData || !gradeData.students) {
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

	return (
		<PDFDownloadLink
			document={
				<GradesPDF
					teacherInfo={teacherInfo}
					gradeData={gradeData}
					classLevel={classLevel}
					subject={subject}
					academicYear={academicYear}
					school={school}
				/>
			}
			fileName={fileName}
		>
			{({ loading }) => (
				<button
					disabled={disabled || loading}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<Download className="w-4 h-4" />
					{loading ? 'Generating PDF...' : 'Download Grades'}
				</button>
			)}
		</PDFDownloadLink>
	);
};

export default GradesPDFDownload;
