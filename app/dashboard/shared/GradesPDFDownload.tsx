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
	{ id: 'first', label: '1st Period', value: 'first' },
	{ id: 'second', label: '2nd Period', value: 'second' },
	{ id: 'third', label: '3rd Period', value: 'third' },
	{
		id: 'third_period_exam',
		label: '3rd Period Exam',
		value: 'third_period_exam',
	},
	{ id: 'fourth', label: '4th Period', value: 'fourth' },
	{ id: 'fifth', label: '5th Period', value: 'fifth' },
	{ id: 'sixth', label: '6th Period', value: 'sixth' },
	{
		id: 'sixth_period_exam',
		label: '6th Period Exam',
		value: 'sixth_period_exam',
	},
];

// Constants for pagination
const STUDENTS_PER_PAGE = 35;

// PDF Styles
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
		flex: 2,
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
});

// School Header Component
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
				<Text style={styles.schoolAddress}>{school.address.join('\n')}</Text>
			</View>
			<View>
				{school.logoUrl && <Image src={school.logoUrl} style={styles.logo} />}
			</View>
		</View>
		<Text style={styles.reportTitle}>MASTER GRADE SHEET</Text>
		{isFirstPage && (
			<View style={styles.infoSection}>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Teacher:</Text>
					<Text style={{ color: 'white' }}>{teacherName}</Text>
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
				{/* <Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Date:</Text>{' '}
					{new Date().toLocaleDateString()}
				</Text> */}
			</View>
		)}
	</View>
);

// Table Header Component
const TableHeader: React.FC = () => (
	<View style={[styles.tableRow, styles.tableHeader]} fixed>
		<Text style={styles.tableCellName}>Student Name</Text>
		{periods.map((period) => (
			<Text key={period.value} style={styles.tableCell}>
				{period.label}
			</Text>
		))}
	</View>
);

// Student Row Component
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
							? grade.toFixed(0)
							: grade
						: ''}
				</Text>
			);
		})}
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
		'___________________________';

	const students = gradeData?.students || [];

	return (
		<Document>
			<Page size="A4" orientation="portrait" style={styles.page}>
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
					isFirstPage={true}
					school={school}
				/>

				{/* Grades Table */}
				<View style={styles.table}>
					<TableHeader />
					{students.length > 0 ? (
						students.map((student: any, index: number) => (
							<StudentRow key={student.studentId || index} student={student} />
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

				{/* Page Number */}
				<Text
					style={styles.pageNumber}
					render={({ pageNumber, totalPages }) =>
						`Page ${pageNumber} of ${totalPages}`
					}
					fixed
				/>

				{/* Footer */}
				<Text style={styles.footer} fixed>
					Generated by {school.name} e-Potal System
				</Text>
			</Page>
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
