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
import useAuth from '@/store/useAuth';

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

function SchoolHeader({
	academicYear,
	className,
}: {
	academicYear: string;
	className: string;
}) {
	const school = useSchoolStore((state) => state.school);
	return (
		<View style={{ marginBottom: 7 }}>
			<View
				style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
			>
				<View>
					<Image
						src={school?.logoUrl2 || school?.logoUrl}
						style={{ width: 35 }}
					/>
				</View>
				<View style={{ flex: 1, alignItems: 'center' }}>
					<Text
						style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}
					>
						{school?.name}
					</Text>
					<Text style={{ fontSize: 7, textAlign: 'center', marginBottom: 1 }}>
						{school?.address.join(', ')}
					</Text>
					<Text style={{ fontSize: 7, textAlign: 'center', marginBottom: 1 }}>
						P.O Box 2523 Montserrado County-Liberia
					</Text>
				</View>
				<View>
					<Image src={school?.logoUrl} style={{ width: 35 }} />
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
				Academic Year: {academicYear} &nbsp;&nbsp; Class: {className}
			</Text>
		</View>
	);
}

function FilterContent({
	filters,
	setFilters,
	onSubmit,
}: {
	filters: { academicYear: string; period: string };
	setFilters: React.Dispatch<
		React.SetStateAction<{
			academicYear: string;
			period: string;
		}>
	>;
	onSubmit: () => void;
}) {
	const academicYearOptions = [
		'2024/2025',
		'2023/2024',
		'2022/2023',
		'2021/2022',
	];

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
			<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6">
				<h2 className="text-lg font-semibold mb-4 text-center">
					Filter Periodic Report
				</h2>

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">
						Academic Year
					</label>
					<select
						value={filters.academicYear}
						onChange={(e) =>
							setFilters((f) => ({ ...f, academicYear: e.target.value }))
						}
						className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
					>
						<option value="">Select Academic Year</option>
						{academicYearOptions.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium mb-1">Period</label>
					<select
						value={filters.period}
						onChange={(e) =>
							setFilters((f) => ({ ...f, period: e.target.value }))
						}
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
						onClick={() => {
							setFilters({ academicYear: '', period: '' });
						}}
						className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 border border-border"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={onSubmit}
						className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary disabled:opacity-50"
						disabled={!filters.academicYear || !filters.period}
					>
						Apply Filter
					</button>
				</div>
			</div>
		</div>
	);
}

function ReportContent({
	reportFilters,
	onBack,
}: {
	reportFilters: { academicYear: string; period: string };
	onBack: () => void;
}) {
	const [studentData, setStudentData] = useState<PeriodicStudentData | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { user } = useAuth();
	const school = useSchoolStore((state) => state.school);

	useEffect(() => {
		const fetchPeriodicGrades = async () => {
			try {
				setLoading(true);
				setError(null);

				if (!user?.studentId) {
					throw new Error('Student ID not found');
				}

				const params = {
					studentIds: user.studentId,
					period: reportFilters.period,
					academicYear: reportFilters.academicYear,
					reportType: 'periodic',
				};

				const url = new URL('/api/grades', window.location.origin);
				Object.entries(params).forEach(([key, value]) => {
					if (value) url.searchParams.append(key, value as string);
				});

				const res = await fetch(url.toString());
				if (!res.ok) throw new Error('Failed to fetch periodic grades');
				const data = await res.json();

				if (!data.success || !data.data || !data.data.report) {
					throw new Error('No periodic student data found.');
				}

				setStudentData(data.data.report);
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
	}, [reportFilters.academicYear, reportFilters.period, user?.studentId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<PageLoading
					message="Loading your periodic report..."
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
						onClick={onBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

	if (!studentData) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] py-10 bg-background text-foreground">
				<div className="bg-card rounded-lg shadow border border-border w-full max-w-md p-6 text-center">
					<h2 className="text-lg font-semibold mb-4">No Data Found</h2>
					<p className="text-muted-foreground mb-6">
						No periodic report data found for the selected filters.
					</p>
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 border border-primary"
					>
						← Back to Filter
					</button>
				</div>
			</div>
		);
	}

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
							orientation="landscape"
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
									top: '10%',
									left: '50%',
									transform: 'translate(-50%, -50%)',
									opacity: 0.15,
									zIndex: -1,
								}}
							>
								<Image src={school?.logoUrl} style={{ width: 250 }} />
							</View>

							<View
								style={{
									flexDirection: 'row',
									width: '100%',
									justifyContent: 'center',
									alignItems: 'flex-start',
									flex: 1,
								}}
							>
								<View
									style={{
										width: '50%',
										borderWidth: 1,
										borderColor: '#cbd5e1',
										backgroundColor: '#f8fafc',
										borderRadius: 8,
										padding: 8,
										minHeight: 400,
										maxHeight: 'auto',
									}}
								>
									<SchoolHeader
										academicYear={reportFilters.academicYear}
										className={user?.classId || ''}
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
														s.subject.toLowerCase() ===
														subjectName.toLowerCase()
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
													{studentData.periodicAverage.toFixed(1)}
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
													Class Rank
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
							</View>
						</Page>
					</Document>
				</PDFViewer>
			</div>
		</div>
	);
}

export default function StudentPeriodicReport() {
	const [showReport, setShowReport] = useState(false);
	const [filters, setFilters] = useState<{
		academicYear: string;
		period: string;
	}>({
		academicYear: '',
		period: '',
	});

	return (
		<div className="w-full h-screen bg-background">
			{!showReport ? (
				<FilterContent
					filters={filters}
					setFilters={setFilters}
					onSubmit={() => setShowReport(true)}
				/>
			) : (
				<ReportContent
					reportFilters={filters}
					onBack={() => setShowReport(false)}
				/>
			)}
		</div>
	);
}
