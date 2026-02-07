import React, { useEffect, useMemo, useState } from 'react';
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
const STUDENTS_PER_PAGE = 28;

const SEMESTER_ONE_PERIODS = [
	'first',
	'second',
	'third',
	'third_period_exam',
];
const SEMESTER_TWO_PERIODS = [
	'fourth',
	'fifth',
	'sixth',
	'sixth_period_exam',
];

// PDF Styles
const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#FFFFFF',
		paddingTop: 24,
		paddingRight: 22,
		paddingBottom: 28,
		paddingLeft: 52, // extra binding margin
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
	coverTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		letterSpacing: 1.2,
		color: '#0f172a',
		marginTop: 30,
		marginBottom: 10,
	},
	coverSubtitle: {
		fontSize: 12,
		textAlign: 'center',
		color: '#334155',
		marginBottom: 24,
	},
	coverInfo: {
		marginTop: 18,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: '#f8fafc',
	},
	coverInfoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	coverLabel: {
		fontSize: 10,
		color: '#64748b',
	},
	coverValue: {
		fontSize: 11,
		color: '#0f172a',
		fontWeight: 'bold',
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
		flex: 2.2,
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
});

// School Header Component
const SchoolHeader: React.FC<{
	teacherName: string;
	className: string;
	subject: string;
	academicYear: string;
	totalStudents: number;
	isFirstPage: boolean;
	school: any;
}> = ({
	teacherName,
	className,
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
					<Text> {teacherName}</Text>
				</Text>
				<Text style={styles.infoDivider}>|</Text>
				<Text style={styles.infoText}>
					<Text style={{ fontWeight: 'bold' }}>Class:</Text> {className}
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

const CoverPage: React.FC<{
	school: any;
	academicYear: string;
	classLevel: string;
	className: string;
	subject: string;
	teacherName: string;
}> = ({ school, academicYear, classLevel, className, subject, teacherName }) => (
	<Page size="A4" orientation="landscape" style={styles.page}>
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
		<View style={styles.coverWatermark}>
			{school.logoUrl && (
				<Image src={school.logoUrl} style={styles.coverWatermarkImage} />
			)}
		</View>
		<Text style={styles.coverTitle}>MASTER GRADE SHEETS</Text>
		<Text style={styles.coverSubtitle}>
			Academic Records Compilation
		</Text>
		<View style={styles.coverInfo}>
			<View style={styles.coverInfoRow}>
				<Text style={styles.coverLabel}>Academic Year</Text>
				<Text style={styles.coverValue}>{academicYear}</Text>
			</View>
			<View style={styles.coverInfoRow}>
				<Text style={styles.coverLabel}>Class Level</Text>
				<Text style={styles.coverValue}>{classLevel || '—'}</Text>
			</View>
			<View style={styles.coverInfoRow}>
				<Text style={styles.coverLabel}>Class</Text>
				<Text style={styles.coverValue}>{className}</Text>
			</View>
			<View style={styles.coverInfoRow}>
				<Text style={styles.coverLabel}>Subject</Text>
				<Text style={styles.coverValue}>{subject}</Text>
			</View>
			<View style={styles.coverInfoRow}>
				<Text style={styles.coverLabel}>Teacher</Text>
				<Text style={styles.coverValue}>{teacherName}</Text>
			</View>
		</View>
	</Page>
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
		<Text style={styles.tableCell}>1st Sem Avg</Text>
		<Text style={styles.tableCell}>2nd Sem Avg</Text>
	</View>
);

// Student Row Component
const StudentRow: React.FC<{ student: any }> = ({ student }) => {
	const getAverage = (periodKeys: string[]) => {
		let total = 0;
		let count = 0;
		periodKeys.forEach((key) => {
			const grade = student.periods?.[key];
			if (typeof grade === 'number') {
				total += grade;
				count += 1;
			}
		});
		if (!count) return '';
		return (total / count).toFixed(1);
	};

	const semesterOneAvg = getAverage(SEMESTER_ONE_PERIODS);
	const semesterTwoAvg = getAverage(SEMESTER_TWO_PERIODS);

	return (
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
			<Text style={styles.tableCell}>{semesterOneAvg}</Text>
			<Text style={styles.tableCell}>{semesterTwoAvg}</Text>
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
	const teacherName =
		teacherInfo?.name ||
		`${teacherInfo?.firstName || ''} ${teacherInfo?.lastName || ''}`.trim() ||
		'___________________________';

	const students = gradeData?.students || [];
	const pages = Array.from(
		{ length: Math.ceil(students.length / STUDENTS_PER_PAGE) },
		(_, index) =>
			students.slice(
				index * STUDENTS_PER_PAGE,
				(index + 1) * STUDENTS_PER_PAGE
			)
	);

	return (
		<Document>
			<CoverPage
				school={school}
				academicYear={academicYear}
				classLevel={classLevel}
				className={className}
				subject={subject}
				teacherName={teacherName}
			/>

			{pages.map((pageStudents, index) => (
				<Page
					key={`page-${index}`}
					size="A4"
					orientation="landscape"
					style={styles.page}
				>
					<View style={styles.watermark}>
						{school.logoUrl && (
							<Image src={school.logoUrl} style={styles.watermarkImage} />
						)}
					</View>

					<SchoolHeader
						teacherName={teacherName}
						className={className}
						subject={subject}
						academicYear={academicYear}
						totalStudents={students.length}
						isFirstPage={false}
						school={school}
					/>

					<View style={styles.infoSection}>
						<Text style={styles.infoText}>
							<Text style={{ fontWeight: 'bold' }}>Academic Year:</Text>{' '}
							{academicYear}
						</Text>
						<Text style={styles.infoDivider}>|</Text>
						<Text style={styles.infoText}>
							<Text style={{ fontWeight: 'bold' }}>Class:</Text> {className}
						</Text>
						<Text style={styles.infoDivider}>|</Text>
						<Text style={styles.infoText}>
							<Text style={{ fontWeight: 'bold' }}>Subject:</Text> {subject}
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
									key={student.studentId || `${index}-${rowIndex}`}
									student={student}
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
}) => {
	const school = useSchoolStore((state) => state.school);
	const [shouldGenerate, setShouldGenerate] = useState(false);
	const [generationNonce, setGenerationNonce] = useState(0);
	const [instance, updateInstance] = usePDF({ document: null });

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

	const doc = useMemo(
		() => (
			<GradesPDF
				teacherInfo={teacherInfo}
				gradeData={gradeData}
				className={className}
				classLevel={classLevel}
				subject={subject}
				academicYear={academicYear}
				school={school}
			/>
		),
		[
			teacherInfo,
			gradeData,
			className,
			classLevel,
			subject,
			academicYear,
			school,
			generationNonce,
		]
	);

	useEffect(() => {
		if (!shouldGenerate) return;
		const run = () => updateInstance(doc);
		if (typeof (window as any).requestIdleCallback === 'function') {
			(window as any).requestIdleCallback(run, { timeout: 1000 });
		} else {
			setTimeout(run, 0);
		}
	}, [shouldGenerate, doc, updateInstance]);

	useEffect(() => {
		setShouldGenerate(false);
	}, [gradeData, className, classLevel, subject, academicYear]);

	const handleGenerate = () => {
		setGenerationNonce((prev) => prev + 1);
		setShouldGenerate(true);
	};

	return (
		<div className="flex items-center gap-3">
			<button
				disabled={disabled || instance.loading}
				onClick={handleGenerate}
				className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<Download className="w-4 h-4" />
				{instance.loading ? 'Generating PDF...' : 'Generate PDF'}
			</button>
			{instance.url && !instance.loading && (
				<a
					href={instance.url}
					download={fileName}
					className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
				>
					Download PDF
				</a>
			)}
		</div>
	);
};

export default GradesPDFDownload;
