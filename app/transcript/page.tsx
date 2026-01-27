'use client';
import React, { useState, useMemo } from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
	PDFViewer,
} from '@react-pdf/renderer';

// --- CONFIG & ASSETS ---
const SCHOOL_DETAILS = {
	name: 'UPSTAIRS CHRISTIAN ACADEMY',
	levels: 'Daycare, Nursery, Kindergarten, Elem. Junior & Senior High',
	address: 'Unity Town, Pipeline Road, Lower Johnsonville',
	poBox: 'P.O. Box 2523 Montserrado County-Liberia',
	contact: 'Cell #: 0886-851-802/0770-851-802/0886-022-009',
	email: 'Email: ucacademy2011@gmail.com',
	motto: '"Learn Well To Be Successful"',
	logoUrl:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1753368059/school-management-system/uca/logo.png',
	logoUrl2:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1753484515/school-management-system/uca/uca_logo2_kqlgdl.png',
	transcriptHeaderUrl: '/transcript-header.png',
	recommendationHeaderUrl: '/recommendation-header.png',
	mottoUrl: '/motto.png',
};

const AUTH_CREDENTIALS = {
	username: 'ucaadmin',
	password: 'upstairs2016',
};

const TRANSCRIPT_SUBJECTS = [
	['RME', 'Math'],
	['English', 'History'],
	['Literature', 'Chemistry'],
	['Geography', 'Biology'],
	['French', 'Agriculture'],
	['Computer', 'Economics'],
	['Accounting', 'R.O.T.C'],
	['Physics', 'Physics Pratical'],
];

// Generate random grade between 75-95
const randomGrade = () => (78 + Math.floor(Math.random() * 21)).toString();

// Calculate average from array of grades
const calculateAverage = (grades) => {
	const sum = grades.reduce((acc, grade) => acc + parseInt(grade), 0);
	return (sum / grades.length).toFixed(1);
};

// --- STYLING (Optimized for A4) ---
const styles = StyleSheet.create({
	page: {
		paddingLeft: 30,
		paddingRight: 30,
		paddingTop: 2,
		fontFamily: 'Helvetica',
		fontSize: 9,
	},
	recommendationPage: {
		paddingLeft: 30,
		paddingRight: 30,
		paddingTop: 30,
		fontFamily: 'Helvetica',
		fontSize: 12,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'space-between',
	},
	recommendationContent: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
	},
	headerImage: {
		width: '100%',
		marginBottom: 10,
	},
	letterBody: {
		marginTop: 12,
		lineHeight: 1.5,
		textAlign: 'justify',
		fontSize: 12,
	},
	signatureSection: {
		marginTop: 25,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	sigBlock: {
		width: '40%',
		borderTopWidth: 1,
		paddingTop: 4,
		textAlign: 'center',
		fontSize: 10,
		fontWeight: 'bold',
	},
	invalidNote: {
		fontSize: 9,
		fontStyle: 'italic',
		marginTop: 10,
		textAlign: 'center',
		color: 'red',
	},
	table: {
		width: '100%',
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#000',
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#f0f0f0',
		fontWeight: 'bold',
		borderBottomWidth: 1,
		fontSize: 8,
	},
	tableRow: { flexDirection: 'row', borderBottomWidth: 0.5 },
	cell: { padding: 3, borderRightWidth: 1, flex: 1, fontSize: 9 },
	cellNarrow: {
		padding: 3,
		borderRightWidth: 1,
		width: 45,
		fontSize: 9,
		textAlign: 'center',
	},
	gradeText: {
		fontSize: 9,
	},
	watermark: {
		position: 'absolute',
		top: '30%',
		left: '20%',
		width: '60%',
		opacity: 0.1,
		zIndex: -1,
	},
	mottoImage: {
		width: '50%',
		alignSelf: 'center',
		marginTop: 2,
	},
});

// --- SUB-COMPONENTS ---
const Footer = () => (
	<View>
		<View style={styles.signatureSection}>
			<View style={styles.sigBlock}>
				<Text>Registrar</Text>
			</View>
			<View style={styles.sigBlock}>
				<Text>Principal</Text>
			</View>
		</View>
		<Text style={styles.invalidNote}>
			Any correction and/or eraser on this document renders it invalid
		</Text>
		<Image src={SCHOOL_DETAILS.mottoUrl} style={styles.mottoImage} />
	</View>
);

const TranscriptTable = ({
	gradeLabel,
	academicYear,
	grades,
	yearAvg,
	rank,
}) => (
	<View style={styles.table}>
		<View style={styles.tableHeader}>
			<View style={[styles.cell, { flex: 2 }]}>
				<Text>
					{gradeLabel} ({academicYear})
				</Text>
			</View>
			<View style={[styles.cellNarrow, { width: 80 }]}>
				<Text>Yearly Ave: {yearAvg}</Text>
			</View>
			<View style={styles.cellNarrow}>
				<Text>Rank: {rank}</Text>
			</View>
		</View>
		<View style={styles.tableHeader}>
			<View style={styles.cell}>
				<Text>Subject</Text>
			</View>
			<View style={styles.cellNarrow}>
				<Text>Grade</Text>
			</View>
			<View style={styles.cell}>
				<Text>Subject</Text>
			</View>
			<View style={styles.cellNarrow}>
				<Text>Grade</Text>
			</View>
		</View>
		{TRANSCRIPT_SUBJECTS.map((pair, i) => (
			<View key={i} style={styles.tableRow}>
				<View style={styles.cell}>
					<Text>{pair[0]}</Text>
				</View>
				<View style={styles.cellNarrow}>
					<Text
						style={[
							styles.gradeText,
							{ color: parseInt(grades[i * 2]) >= 70 ? 'blue' : 'red' },
						]}
					>
						{grades[i * 2]}
					</Text>
				</View>
				<View style={styles.cell}>
					<Text>{pair[1]}</Text>
				</View>
				<View style={styles.cellNarrow}>
					<Text
						style={[
							styles.gradeText,
							{ color: parseInt(grades[i * 2 + 1]) >= 70 ? 'blue' : 'red' },
						]}
					>
						{grades[i * 2 + 1]}
					</Text>
				</View>
			</View>
		))}
	</View>
);

// --- MAIN DOCUMENT GENERATOR ---
const MultiDocument = ({ students }) => (
	<Document>
		{students.map((student, index) => {
			// Use provided grades or generate random ones
			const grade10Grades =
				student.grade10Grades ||
				Array(16)
					.fill(0)
					.map(() => randomGrade());
			const grade11Grades =
				student.grade11Grades ||
				Array(16)
					.fill(0)
					.map(() => randomGrade());
			const grade12Grades =
				student.grade12Grades ||
				Array(16)
					.fill(0)
					.map(() => randomGrade());

			// Calculate year averages
			const year10Avg = Number(calculateAverage(grade10Grades));
			const year11Avg = Number(calculateAverage(grade11Grades));
			const year12Avg = Number(calculateAverage(grade12Grades));

			// Calculate overall senior high average
			const seniorAvg = ((year10Avg + year11Avg + year12Avg) / 3).toFixed(1);

			// Use provided ranks or generate random ones
			const rank10 = student.rank10 || Math.floor(Math.random() * 25) + 1;
			const rank11 = student.rank11 || Math.floor(Math.random() * 25) + 1;
			const rank12 = student.rank12 || Math.floor(Math.random() * 25) + 1;

			return (
				<React.Fragment key={index}>
					{/* Transcript */}
					<Page size="A4" style={styles.page}>
						<Image src={SCHOOL_DETAILS.logoUrl2} style={styles.watermark} />
						<Image
							src={SCHOOL_DETAILS.transcriptHeaderUrl}
							style={styles.headerImage}
						/>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								marginBottom: 10,
								fontSize: 8.5,
							}}
						>
							<View style={{ width: '48%', fontSize: 10 }}>
								<Text style={{ fontWeight: 'bold' }}>Name: {student.name}</Text>
								<Text style={{ fontWeight: 'bold' }}>
									{' '}
									Date: {student.date}
								</Text>
							</View>
							<View
								style={{ width: '48%', alignItems: 'flex-end', fontSize: 10 }}
							>
								<Text style={{ marginTop: 3, fontWeight: 'bold' }}>
									Date Of Birth: {student.dateOfBirth}
								</Text>
								<Text style={{ marginTop: 3 }}>
									<Text style={{ fontWeight: 'bold' }}>
										{' '}
										Place Of Birth: {student.placeOfBirth}
									</Text>
								</Text>
							</View>
						</View>

						<TranscriptTable
							gradeLabel="Grade 10"
							academicYear={student.year10}
							grades={grade10Grades}
							yearAvg={year10Avg}
							rank={rank10}
						/>
						<TranscriptTable
							gradeLabel="Grade 11"
							academicYear={student.year11}
							grades={grade11Grades}
							yearAvg={year11Avg}
							rank={rank11}
						/>
						<TranscriptTable
							gradeLabel="Grade 12"
							academicYear={student.year12}
							grades={grade12Grades}
							yearAvg={year12Avg}
							rank={rank12}
						/>

						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								marginBottom: 8,
								fontSize: 8.5,
								fontWeight: 'bold',
							}}
						>
							<Text>Senior High Ave: {seniorAvg}</Text>
							<Text>Conduct: Good</Text>
						</View>
						<Footer />
					</Page>

					{/* Recommendation Letter */}
					<Page size="A4" style={styles.recommendationPage}>
						<View>
							<Image
								src={SCHOOL_DETAILS.logoUrl2}
								style={{ ...styles.watermark, top: '100%' }}
							/>
							<Image
								src={SCHOOL_DETAILS.recommendationHeaderUrl}
								style={styles.headerImage}
							/>
						</View>

						<View style={styles.recommendationContent}>
							<Text style={{ marginBottom: 20, fontSize: 12 }}>
								Date: {student.date}
							</Text>
							<Text
								style={{ marginBottom: 10, fontSize: 12, fontWeight: 'bold' }}
							>
								Dear Sir/Madam:
							</Text>

							<View style={styles.letterBody}>
								<Text>
									This document attests that{' '}
									<Text style={{ fontWeight: 'bold' }}>{student.name}</Text> is
									a graduate of the above-mentioned institution, the Upstairs
									Christian Academy.
									{'\n\n'}
									Throughout {student.gender === 'male' ? 'his' : 'her'} time at
									our school,{' '}
									<Text style={{ fontWeight: 'bold' }}>
										{student.name.split(' ')[0]}
									</Text>{' '}
									has demonstrated commendable character and conduct.{' '}
									{student.gender === 'male' ? 'He' : 'She'} is respectful,
									obedient, honest, and studious, consistently showing a
									positive attitude toward learning and a willingness to follow
									school rules and expectations.
									{'\n\n'}
									In view of these behavioral qualities and{' '}
									{student.gender === 'male' ? 'his' : 'her'} commitment to
									personal and academic growth, the Upstairs Christian Academy
									confidently and highly recommends{' '}
									<Text style={{ fontWeight: 'bold' }}>{student.name}</Text> to
									any institution {student.gender === 'male' ? 'he' : 'she'}{' '}
									wishes to attend.
									{'\n\n'}
									We are confident that{' '}
									{student.gender === 'male' ? 'he' : 'she'} will represent our
									school well and will prove{' '}
									{student.gender === 'male' ? 'himself' : 'herself'} to be a
									responsible, capable, and valuable member of any academic
									community.
								</Text>

								<View>
									<Text style={{ marginTop: 30, fontSize: 12 }}>
										Best Regards,
									</Text>
									<Text style={{ fontSize: 12 }}>Yours in Education,</Text>
								</View>
							</View>
						</View>

						<Footer />
					</Page>
				</React.Fragment>
			);
		})}
	</Document>
);

// --- LOGIN COMPONENT ---
const LoginScreen = ({ onLogin }) => {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');

	const handleLogin = (e) => {
		e.preventDefault();
		if (
			username === AUTH_CREDENTIALS.username &&
			password === AUTH_CREDENTIALS.password
		) {
			onLogin();
		} else {
			setError('Invalid username or password');
			setPassword('');
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center px-4">
			<div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-800 mb-2">
						UCA Document Portal
					</h1>
					<p className="text-gray-600">Upstairs Christian Academy</p>
					<div className="mt-4 w-16 h-1 bg-blue-600 mx-auto rounded"></div>
				</div>

				<form onSubmit={handleLogin} className="space-y-6">
					<div>
						<label className="block text-sm font-bold mb-2 text-gray-700">
							Username
						</label>
						<input
							type="text"
							className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
							placeholder="Enter username"
							value={username}
							onChange={(e) => {
								setUsername(e.target.value);
								setError('');
							}}
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-bold mb-2 text-gray-700">
							Password
						</label>
						<input
							type="password"
							className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
							placeholder="Enter password"
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								setError('');
							}}
							required
						/>
					</div>

					{error && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							{error}
						</div>
					)}

					<button
						type="submit"
						className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 transition transform hover:scale-105 shadow-lg"
					>
						Login
					</button>
				</form>

				<div className="mt-6 text-center text-sm text-gray-500">
					🔒 Secure Access Required
				</div>
			</div>
		</div>
	);
};

// --- MANUAL GRADE INPUT COMPONENT ---
const ManualGradeInput = ({ student, onUpdate, onCancel }) => {
	const [grades, setGrades] = useState({
		grade10: student.grade10Grades || Array(16).fill(''),
		grade11: student.grade11Grades || Array(16).fill(''),
		grade12: student.grade12Grades || Array(16).fill(''),
		rank10: student.rank10 || '',
		rank11: student.rank11 || '',
		rank12: student.rank12 || '',
	});

	const handleGradeChange = (year, index, value) => {
		const newGrades = { ...grades };
		newGrades[year][index] = value;
		setGrades(newGrades);
	};

	const handleRankChange = (year, value) => {
		setGrades({ ...grades, [year]: value });
	};

	const handleSave = () => {
		// Validate all grades are filled
		const allGrades = [...grades.grade10, ...grades.grade11, ...grades.grade12];
		if (allGrades.some((g) => !g || isNaN(g) || g < 0 || g > 100)) {
			alert('Please fill all grades with valid numbers (0-100)');
			return;
		}

		if (!grades.rank10 || !grades.rank11 || !grades.rank12) {
			alert('Please fill all rank fields');
			return;
		}

		onUpdate({
			...student,
			grade10Grades: grades.grade10,
			grade11Grades: grades.grade11,
			grade12Grades: grades.grade12,
			rank10: parseInt(grades.rank10),
			rank11: parseInt(grades.rank11),
			rank12: parseInt(grades.rank12),
		});
	};

	const renderGradeInputs = (year, yearLabel) => (
		<div
			key={year}
			className="bg-gray-50 p-4 rounded-lg border border-gray-200"
		>
			<div className="flex justify-between items-center mb-3">
				<h4 className="font-bold text-gray-800">{yearLabel}</h4>
				<div className="flex items-center gap-2">
					<label className="text-sm font-bold">Rank:</label>
					<input
						type="number"
						className="w-16 border-2 border-gray-300 p-1 rounded text-sm focus:border-blue-500 focus:outline-none"
						value={grades[`rank${year.slice(-2)}`]}
						onChange={(e) =>
							handleRankChange(`rank${year.slice(-2)}`, e.target.value)
						}
						min="1"
						placeholder="1"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				{TRANSCRIPT_SUBJECTS.map((pair, i) => (
					<React.Fragment key={i}>
						<div>
							<label className="block text-xs font-semibold mb-1 text-gray-600">
								{pair[0]}
							</label>
							<input
								type="number"
								className="w-full border-2 border-gray-300 p-2 rounded text-sm focus:border-blue-500 focus:outline-none"
								value={grades[year][i * 2]}
								onChange={(e) => handleGradeChange(year, i * 2, e.target.value)}
								min="0"
								max="100"
								placeholder="0-100"
							/>
						</div>
						<div>
							<label className="block text-xs font-semibold mb-1 text-gray-600">
								{pair[1]}
							</label>
							<input
								type="number"
								className="w-full border-2 border-gray-300 p-2 rounded text-sm focus:border-blue-500 focus:outline-none"
								value={grades[year][i * 2 + 1]}
								onChange={(e) =>
									handleGradeChange(year, i * 2 + 1, e.target.value)
								}
								min="0"
								max="100"
								placeholder="0-100"
							/>
						</div>
					</React.Fragment>
				))}
			</div>
		</div>
	);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
			<div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl my-8">
				<h2 className="text-2xl font-bold mb-4 text-gray-800">
					Enter Grades for {student.name}
				</h2>

				<div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
					{renderGradeInputs('grade10', `Grade 10 (${student.year10})`)}
					{renderGradeInputs('grade11', `Grade 11 (${student.year11})`)}
					{renderGradeInputs('grade12', `Grade 12 (${student.year12})`)}
				</div>

				<div className="flex gap-3 mt-6">
					<button
						onClick={handleSave}
						className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition"
					>
						Save Grades
					</button>
					<button
						onClick={onCancel}
						className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-bold hover:bg-gray-600 transition"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};

// --- MAIN COMPONENT ---
export default function DocumentPortal() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [students, setStudents] = useState([]);
	const [showPDF, setShowPDF] = useState(false);
	const [mode, setMode] = useState('random'); // 'random' or 'manual'
	const [editingStudent, setEditingStudent] = useState(null);
	const [formData, setFormData] = useState({
		name: '',
		gender: 'male',
		date: new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}),
		placeOfBirth: '',
		dateOfBirth: '',
		year10: '2022-2023',
		year11: '2023-2024',
		year12: '2024-2025',
	});

	const handleAddStudent = () => {
		if (!formData.name.trim()) {
			alert('Please enter student name');
			return;
		}

		if (!formData.placeOfBirth.trim() || !formData.dateOfBirth.trim()) {
			alert('Please fill in place and date of birth');
			return;
		}
		if (
			!formData.year10.trim() ||
			!formData.year11.trim() ||
			!formData.year12.trim()
		) {
			alert('Please fill in all academic years (e.g., 2020-2021)');
			return;
		}

		const newStudent = { ...formData };

		if (mode === 'manual') {
			// Open manual grade input
			setEditingStudent(newStudent);
		} else {
			// Add with random grades
			setStudents([...students, newStudent]);
			resetForm();
		}
	};

	const handleManualGradeUpdate = (updatedStudent) => {
		setStudents([...students, updatedStudent]);
		setEditingStudent(null);
		resetForm();
	};

	const resetForm = () => {
		setFormData({
			name: '',
			gender: 'male',
			date: formData.date,
			placeOfBirth: '',
			dateOfBirth: '',
			year10: '2022-2023',
			year11: '2023-2024',
			year12: '2024-2025',
		});
	};

	const handleRemoveStudent = (index) => {
		setStudents(students.filter((_, i) => i !== index));
	};

	const handleLogout = () => {
		setIsAuthenticated(false);
		setStudents([]);
		setShowPDF(false);
		resetForm();
	};

	if (!isAuthenticated) {
		return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
	}

	if (showPDF) {
		return (
			<div className="h-screen w-full flex flex-col">
				<div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white flex justify-between items-center shadow-lg">
					<button
						onClick={() => setShowPDF(false)}
						className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
					>
						← Back to Form
					</button>
					<span className="font-bold uppercase tracking-wide">
						Document Generator - {students.length} Student(s) -{' '}
						{students.length * 2} Documents
					</span>
					<button
						onClick={handleLogout}
						className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 transition"
					>
						Logout
					</button>
				</div>
				<PDFViewer width="100%" height="100%">
					<MultiDocument students={students} />
				</PDFViewer>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
			{editingStudent && (
				<ManualGradeInput
					student={editingStudent}
					onUpdate={handleManualGradeUpdate}
					onCancel={() => {
						setEditingStudent(null);
						resetForm();
					}}
				/>
			)}

			<div className="max-w-3xl mx-auto px-4">
				<div className="text-center mb-8">
					<div className="flex justify-between items-center mb-4">
						<div className="flex-1"></div>
						<div className="flex-1 text-center">
							<h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-indigo-900 mb-2">
								UCA Document Portal
							</h1>
							<p className="text-gray-600 italic">Upstairs Christian Academy</p>
						</div>
						<div className="flex-1 flex justify-end">
							<button
								onClick={handleLogout}
								className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold"
							>
								Logout
							</button>
						</div>
					</div>
					<p className="text-sm text-gray-500 mt-2">
						Generate Transcript & Recommendation Letter for each student
					</p>
				</div>

				<div className="space-y-6">
					{/* Mode Selection */}
					<div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
						<h2 className="text-xl font-bold mb-4 text-gray-800">
							Select Mode
						</h2>
						<div className="grid grid-cols-2 gap-4">
							<button
								onClick={() => setMode('random')}
								className={`p-4 rounded-lg border-2 transition ${
									mode === 'random'
										? 'border-blue-600 bg-blue-50'
										: 'border-gray-300 hover:border-blue-400'
								}`}
							>
								<div className="text-center">
									<div className="text-2xl mb-2">🎲</div>
									<div className="font-bold text-gray-800">Random Mode</div>
									<div className="text-sm text-gray-600 mt-1">
										Auto-generate grades (75-95)
									</div>
								</div>
							</button>
							<button
								onClick={() => setMode('manual')}
								className={`p-4 rounded-lg border-2 transition ${
									mode === 'manual'
										? 'border-blue-600 bg-blue-50'
										: 'border-gray-300 hover:border-blue-400'
								}`}
							>
								<div className="text-center">
									<div className="text-2xl mb-2">✏️</div>
									<div className="font-bold text-gray-800">Manual Mode</div>
									<div className="text-sm text-gray-600 mt-1">
										Enter grades manually
									</div>
								</div>
							</button>
						</div>
					</div>

					{/* Student Information Form */}
					<div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
						<h2 className="text-xl font-bold mb-4 text-gray-800">
							Add Student Information
						</h2>

						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-bold mb-2 text-gray-700">
										Student Name *
									</label>
									<input
										type="text"
										className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
										placeholder="John Doe"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
									/>
								</div>
								<div>
									<label className="block text-sm font-bold mb-2 text-gray-700">
										Gender *
									</label>
									<select
										className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
										value={formData.gender}
										onChange={(e) =>
											setFormData({ ...formData, gender: e.target.value })
										}
									>
										<option value="male">Male</option>
										<option value="female">Female</option>
									</select>
								</div>
							</div>

							<div>
								<label className="block text-sm font-bold mb-2 text-gray-700">
									Document Date *
								</label>
								<input
									type="text"
									className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
									placeholder="January 21, 2026"
									value={formData.date}
									onChange={(e) =>
										setFormData({ ...formData, date: e.target.value })
									}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-bold mb-2 text-gray-700">
										Place of Birth *
									</label>
									<input
										type="text"
										className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
										placeholder="Monrovia, Liberia"
										value={formData.placeOfBirth}
										onChange={(e) =>
											setFormData({
												...formData,
												placeOfBirth: e.target.value,
											})
										}
									/>
								</div>

								<div>
									<label className="block text-sm font-bold mb-2 text-gray-700">
										Date of Birth *
									</label>
									<input
										type="text"
										className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
										placeholder="January 15, 2005"
										value={formData.dateOfBirth}
										onChange={(e) =>
											setFormData({
												...formData,
												dateOfBirth: e.target.value,
											})
										}
									/>
								</div>
							</div>

							<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
								<h3 className="font-bold mb-3 text-blue-900">Academic Years</h3>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="block text-xs font-bold mb-1 text-gray-700">
											10th Grade Year *
										</label>
										<input
											type="text"
											className="w-full border-2 border-gray-300 p-2 rounded text-sm focus:border-blue-500 focus:outline-none"
											placeholder="2020-2021"
											value={formData.year10}
											onChange={(e) =>
												setFormData({ ...formData, year10: e.target.value })
											}
										/>
									</div>
									<div>
										<label className="block text-xs font-bold mb-1 text-gray-700">
											11th Grade Year *
										</label>
										<input
											type="text"
											className="w-full border-2 border-gray-300 p-2 rounded text-sm focus:border-blue-500 focus:outline-none"
											placeholder="2021-2022"
											value={formData.year11}
											onChange={(e) =>
												setFormData({ ...formData, year11: e.target.value })
											}
										/>
									</div>
									<div>
										<label className="block text-xs font-bold mb-1 text-gray-700">
											12th Grade Year *
										</label>
										<input
											type="text"
											className="w-full border-2 border-gray-300 p-2 rounded text-sm focus:border-blue-500 focus:outline-none"
											placeholder="2022-2023"
											value={formData.year12}
											onChange={(e) =>
												setFormData({ ...formData, year12: e.target.value })
											}
										/>
									</div>
								</div>
							</div>

							<button
								onClick={handleAddStudent}
								className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition transform hover:scale-105 shadow-md"
							>
								{mode === 'random'
									? '+ Add Student'
									: '+ Add Student & Enter Grades'}
							</button>
						</div>
					</div>

					{students.length > 0 && (
						<div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg">
							<h2 className="text-xl font-bold mb-4 text-gray-800">
								Students Added ({students.length})
							</h2>
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{students.map((student, index) => (
									<div
										key={index}
										className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition"
									>
										<div className="flex-1">
											<span className="font-bold text-gray-800">
												{student.name} ({student.gender})
											</span>
											<div className="text-sm text-gray-600 mt-1">
												<div>
													Born: {student.dateOfBirth} in {student.placeOfBirth}
												</div>
												<div>
													Years: {student.year10}, {student.year11},{' '}
													{student.year12}
												</div>
												{student.grade10Grades && (
													<div className="text-xs text-green-600 font-semibold">
														✓ Manual grades entered
													</div>
												)}
											</div>
										</div>
										<button
											onClick={() => handleRemoveStudent(index)}
											className="text-red-600 hover:text-red-800 font-bold ml-4 px-3 py-1 rounded hover:bg-red-100 transition"
										>
											✕
										</button>
									</div>
								))}
							</div>

							<button
								onClick={() => setShowPDF(true)}
								className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg mt-4 hover:from-blue-700 hover:to-indigo-700 transition transform hover:scale-105 shadow-lg"
							>
								📄 Generate Documents ({students.length} student
								{students.length > 1 ? 's' : ''} × 2 documents ={' '}
								{students.length * 2} total)
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
