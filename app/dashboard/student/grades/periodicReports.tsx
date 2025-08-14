'use client';
import React, { useState, useEffect } from 'react';
import {
	Document,
	Page,
	PDFViewer,
	Text,
	View,
	Image,
} from '@react-pdf/renderer';
import styles from './styles';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';

// Re-using constants and types from the original file
const JUNIOR_HIGH_SUBJECTS = [
	'Mathematics',
	'English',
	'General Science',
	'Health Science',
	'Vocabulary',
	'Phonics',
	'History',
	'Geography',
	'Literature',
	'Civics',
	'Physical Education',
	'Agriculture',
	'French',
	'Computer',
	'Bible',
];

interface StudentInfo {
	firstName: string;
	middleName: string;
	lastName: string;
	class: string;
	id: string;
	academicYear: string;
	grade: string;
}

interface PeriodicStudentData {
	studentId: string;
	name: string;
	subjects: Array<{
		subject: string;
		grade: number;
		rank: number;
		classAverage: number;
	}>;
	periodicAverage: number;
	rank: number;
}

const periodOptions = [
	{ value: 'firstPeriod', label: 'First Period' },
	{ value: 'secondPeriod', label: 'Second Period' },
	{ value: 'thirdPeriod', label: 'Third Period' },
	{ value: 'fourthPeriod', label: 'Fourth Period' },
	{ value: 'fifthPeriod', label: 'Fifth Period' },
	{ value: 'sixthPeriod', label: 'Sixth Period' },
];

function gradeStyle(score: number) {
	if (score < 70) {
		return {
			...styles.tableCell,
			color: 'red',
			fontSize: 10,
			fontWeight: 'bold',
		};
	} else {
		return {
			...styles.tableCell,
			color: 'blue',
			fontSize: 10,
			fontWeight: 'bold',
		};
	}
}

function SchoolHeader({ student }: { student: StudentInfo }) {
	const school = useSchoolStore((state) => state.school);
	return (
		<View style={{ marginBottom: 7 }}>
			<View
				style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
			>
				<View>
					<Image src={school.logoUrl} style={{ width: 35 }} />
				</View>
				<View style={{ flex: 1, alignItems: 'center' }}>
					<Text
						style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}
					>
						{school.name}
					</Text>
					<Text style={{ fontSize: 7, textAlign: 'center', marginBottom: 1 }}>
						{school.address.join(', ')}
					</Text>
					<Text style={{ fontSize: 7, textAlign: 'center', marginBottom: 1 }}>
						P.O Box 2523 Montserrado County-Liberia
					</Text>
				</View>
				<View>
					<Image src={school.logoUrl} style={{ width: 35 }} />
				</View>
			</View>
			<Text
				style={{
					fontWeight: 'bold',
					fontSize: 9,
					textAlign: 'center',
					color: '#1a365d',
					marginBottom: 2,
				}}
			>
				JUNIOR HIGH PERIODIC REPORT
			</Text>
			<Text style={{ fontSize: 8, textAlign: 'center', marginBottom: 1 }}>
				Academic Year: {student.academicYear} &nbsp;&nbsp; Class:{' '}
				{student.class}
			</Text>
		</View>
	);
}

function ReportContent({
	studentData,
	reportFilters,
	onBack,
}: {
	studentData: PeriodicStudentData;
	reportFilters: { academicYear: string; period: string; className: string };
	onBack: () => void;
}) {
	const school = useSchoolStore((state) => state.school);
	const selectedPeriodLabel =
		periodOptions.find((p) => p.value === reportFilters.period)?.label ||
		reportFilters.period;
	const title = `Periodic Report - ${studentData.name} - ${selectedPeriodLabel}`;

	return (
		<div className="w-full h-screen bg-background flex flex-col">
			<div className="flex justify-end px-8 py-4">
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border text-sm"
				>
					← Back to Filter
				</button>
			</div>
			<div className="flex-1">
				<PDFViewer className="w-full h-[calc(100vh-80px)] bg-background">
					<Document title={title}>
						<Page
							size="A4"
							orientation="portrait"
							style={{
								...styles.page,
								paddingTop: 20,
								paddingBottom: 20,
								paddingLeft: 20,
								paddingRight: 20,
							}}
							wrap={false}
						>
							<View
								style={{
									position: 'absolute',
									top: '50%',
									left: '50%',
									transform: 'translate(-50%, -50%)',
									opacity: 0.15,
									zIndex: -1,
								}}
							>
								<Image src={school.logoUrl} style={{ width: 250 }} />
							</View>
							<View
								style={{
									width: '100%',
									borderWidth: 1,
									borderColor: '#cbd5e1',
									backgroundColor: '#f8fafc',
									borderRadius: 8,
									padding: 8,
									minHeight: 400,
								}}
							>
								<SchoolHeader
									student={{
										firstName: studentData.name?.split(' ')[0] || '',
										middleName:
											studentData.name?.split(' ').length > 2
												? studentData.name.split(' ')[1]
												: '',
										lastName:
											studentData.name?.split(' ').length > 1
												? studentData.name.split(' ').slice(-1)[0]
												: '',
										class: reportFilters.className,
										id: studentData.studentId,
										academicYear: reportFilters.academicYear,
										grade: '',
									}}
								/>
								<View style={{ marginBottom: 8 }}>
									<Text style={{ fontWeight: 'bold', fontSize: 10 }}>
										{studentData.name}
									</Text>
									<Text style={{ fontSize: 9 }}>
										ID: {studentData.studentId}
									</Text>
									<Text style={{ fontSize: 9 }}>
										Period: {selectedPeriodLabel}
									</Text>
								</View>
								<View style={{ marginTop: 5, flex: 1 }}>
									<View
										style={{
											flexDirection: 'row',
											borderBottomWidth: 1,
											borderBottomColor: '#2d3748',
											marginBottom: 4,
											paddingBottom: 2,
										}}
									>
										<Text
											style={{
												fontWeight: 'bold',
												fontSize: 9,
												width: '60%',
											}}
										>
											Subject
										</Text>
										<Text
											style={{
												fontWeight: 'bold',
												fontSize: 9,
												width: '40%',
												textAlign: 'center',
											}}
										>
											Marks
										</Text>
									</View>
									{JUNIOR_HIGH_SUBJECTS.map((subjectName, sidx) => {
										const subject =
											studentData.subjects &&
											studentData.subjects.find(
												(s) =>
													s.subject.toLowerCase() === subjectName.toLowerCase()
											);
										const mark = subject ? subject.grade : '';
										return (
											<View
												key={sidx}
												style={{
													flexDirection: 'row',
													borderBottomWidth: 1,
													borderBottomColor: '#e2e8f0',
													minHeight: 18,
													alignItems: 'center',
												}}
											>
												<Text
													style={{
														fontSize: 9,
														width: '60%',
														paddingVertical: 1,
													}}
												>
													{subjectName}
												</Text>
												<Text
													style={{
														...gradeStyle(Number(mark)),
														width: '40%',
														textAlign: 'center',
														paddingVertical: 1,
													}}
												>
													{mark !== '' ? mark : '-'}
												</Text>
											</View>
										);
									})}
									<View
										style={{
											borderTopWidth: 1,
											borderTopColor: '#2d3748',
											paddingTop: 4,
										}}
									>
										<View
											style={{
												flexDirection: 'row',
												minHeight: 18,
												alignItems: 'center',
											}}
										>
											<Text
												style={{
													fontWeight: 'bold',
													fontSize: 9,
													width: '60%',
													paddingVertical: 1,
												}}
											>
												Periodic Average
											</Text>
											<Text
												style={{
													...styles.tableCell,
													fontWeight: 'bold',
													width: '40%',
													textAlign: 'center',
													fontSize: 9,
												}}
											>
												{studentData.periodicAverage.toFixed(2)}
											</Text>
										</View>
										<View
											style={{
												flexDirection: 'row',
												minHeight: 18,
												alignItems: 'center',
											}}
										>
											<Text
												style={{
													fontWeight: 'bold',
													fontSize: 9,
													width: '60%',
													paddingVertical: 1,
												}}
											>
												Overall Rank
											</Text>
											<Text
												style={{
													...styles.tableCell,
													fontWeight: 'bold',
													width: '40%',
													textAlign: 'center',
													fontSize: 9,
												}}
											>
												{studentData.rank}
											</Text>
										</View>
									</View>
								</View>
							</View>
						</Page>
					</Document>
				</PDFViewer>
			</div>
		</div>
	);
}

function FilterContent({
	filters,
	setFilters,
	onSubmit,
}: {
	filters: { period: string };
	setFilters: React.Dispatch<React.SetStateAction<{ period: string }>>;
	onSubmit: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Select Period for Report
				</h2>
				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Period</label>
					<select
						value={filters.period}
						onChange={(e) => setFilters({ ...filters, period: e.target.value })}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Period</option>
						{periodOptions.map((p) => (
							<option key={p.value} value={p.value}>
								{p.label}
							</option>
						))}
					</select>
				</div>
				<div className="flex gap-2 mt-6">
					<button
						type="button"
						onClick={() => setFilters({ period: '' })}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={onSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
						disabled={!filters.period}
					>
						View Report
					</button>
				</div>
			</div>
		</div>
	);
}

export default function StudentPeriodicReport() {
	const [showReport, setShowReport] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState('');
	const [studentData, setStudentData] = useState<PeriodicStudentData | null>(
		null
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const studentId = 'UCA202501';

	useEffect(() => {
		if (showReport && studentId && selectedPeriod) {
			const fetchPeriodicGrades = async () => {
				try {
					setLoading(true);
					setError(null);

					const params = {
						period: selectedPeriod,
						studentId, // Pass studentId to the API
					};

					const url = new URL('/api/grades', window.location.origin);
					Object.entries(params).forEach(([key, value]) => {
						if (value) url.searchParams.append(key, value as string);
					});

					const res = await fetch(url.toString());
					if (!res.ok) throw new Error('Failed to fetch periodic grades');
					const data = await res.json();

					console.log(data);
					if (
						!data.success ||
						!data.data ||
						!Array.isArray(data.data.grades) ||
						data.data.grades.length === 0
					) {
						throw new Error('No periodic student data found for this period.');
					}

					setStudentData(data.data.grades[0]); // We expect a single student result
				} catch (err) {
					console.error('Error fetching periodic grades:', err);
					setError(
						err instanceof Error ? err.message : 'Failed to load report data'
					);
				} finally {
					setLoading(false);
				}
			};

			fetchPeriodicGrades();
		}
	}, [showReport, studentId, selectedPeriod]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading
					message="Content Loading, Please wait..."
					fullScreen={false}
				/>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4 text-destructive">Error</h2>
					<p className="text-muted-foreground mb-6">{error}</p>
					<button
						type="button"
						onClick={() => {
							setShowReport(false);
							setError(null);
							setStudentData(null);
						}}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full h-screen bg-background">
			{!showReport || !studentData ? (
				<FilterContent
					filters={{ period: selectedPeriod }}
					setFilters={(f) => setSelectedPeriod(f.period)}
					onSubmit={() => {
						if (selectedPeriod) {
							setShowReport(true);
						}
					}}
				/>
			) : (
				<ReportContent
					studentData={studentData}
					reportFilters={{
						academicYear: '', // Academic year is not available from API without class, so leaving it as empty string
						period: selectedPeriod,
						className: '', // Class name is not available from API
					}}
					onBack={() => setShowReport(false)}
				/>
			)}
		</div>
	);
}
