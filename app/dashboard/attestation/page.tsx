'use client';
import React, { Suspense, useMemo, useState } from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
	PDFViewer,
} from '@react-pdf/renderer';

const SCHOOL = {
	name: 'UPSTAIRS CHRISTIAN ACADEMY',
	address: 'Unity Town, Pipeline Road, Lower Johnsonville',
	poBox: 'P.O. Box 2523 Montserrado County-Liberia',
	contact: 'Cell #: 0886-851-802/0770-851-802/0886-022-009',
	motto: '"Learn Well To Be Successful"',
	logoUrl: 'https://res.cloudinary.com/dcalueltd/image/upload/v1753484515/school-management-system/uca/uca_logo2_kqlgdl.png',
};

const styles = StyleSheet.create({
	page: {
		padding: 50,
		fontFamily: 'Helvetica',
		fontSize: 12,
	},
	watermark: {
		position: 'absolute',
		top: '25%',
		left: '25%',
		width: '50%',
		opacity: 0.08,
		zIndex: -1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 30,
		borderBottomWidth: 2,
		borderBottomColor: '#1e3a8a',
		paddingBottom: 15,
	},
	logo: {
		width: 60,
		height: 60,
		marginRight: 15,
	},
	headerText: {
		textAlign: 'center',
	},
	schoolName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#1e3a8a',
		textTransform: 'uppercase',
	},
	schoolInfo: {
		fontSize: 9,
		color: '#4b5563',
		marginTop: 2,
	},
	title: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
		textTransform: 'uppercase',
		color: '#1e3a8a',
		marginBottom: 30,
		borderBottomWidth: 1,
		borderBottomColor: '#d1d5db',
		paddingBottom: 10,
	},
	body: {
		lineHeight: 1.8,
		textAlign: 'justify',
		fontSize: 12,
		marginBottom: 30,
	},
	fieldRow: {
		flexDirection: 'row',
		marginBottom: 12,
		alignItems: 'center',
	},
	fieldLabel: {
		fontWeight: 'bold',
		width: 100,
		fontSize: 11,
		color: '#1e3a8a',
		textTransform: 'uppercase',
	},
	fieldValue: {
		flex: 1,
		borderBottomWidth: 1,
		borderBottomColor: '#9ca3af',
		paddingBottom: 2,
		fontWeight: 'bold',
		fontSize: 12,
		paddingLeft: 8,
	},
	footer: {
		marginTop: 50,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	sigBlock: {
		width: '40%',
		borderTopWidth: 1,
		borderTopColor: '#1e3a8a',
		paddingTop: 6,
		textAlign: 'center',
		fontSize: 10,
		fontWeight: 'bold',
		color: '#1e3a8a',
	},
	motto: {
		textAlign: 'center',
		fontSize: 10,
		fontStyle: 'italic',
		color: '#6b7280',
		marginTop: 20,
	},
});

const AttestationDocument = ({ data }: { data: any }) => (
	<Document>
		<Page size="A4" style={styles.page}>
			<Image src={SCHOOL.logoUrl} style={styles.watermark} />

			<View style={styles.header}>
				<Image src={SCHOOL.logoUrl} style={styles.logo} />
				<View style={styles.headerText}>
					<Text style={styles.schoolName}>{SCHOOL.name}</Text>
					<Text style={styles.schoolInfo}>{SCHOOL.address}</Text>
					<Text style={styles.schoolInfo}>{SCHOOL.poBox}</Text>
					<Text style={styles.schoolInfo}>{SCHOOL.contact}</Text>
				</View>
			</View>

			<Text style={styles.title}>Certificate of Attestation</Text>

			<View style={styles.body}>
				<Text>Date: {data.date}</Text>
				<Text style={{ marginTop: 20 }}>
					This is to certify that <Text style={{ fontWeight: 'bold' }}>{data.studentName}</Text>,{' '}
					who enrolled in the <Text style={{ fontWeight: 'bold' }}>{data.program}</Text> program
					at this institution during the academic year {data.academicYear}, has demonstrated
					satisfactory academic progress and good conduct throughout {data.gender === 'male' ? 'his' : 'her'} period of study.
				</Text>
				<Text style={{ marginTop: 15 }}>
					This attestation is issued upon the request of{' '}
					<Text style={{ fontWeight: 'bold' }}>{data.studentName}</Text> for any legal or
					educational purpose {data.gender === 'male' ? 'he' : 'she'} may require.
				</Text>
				<Text style={{ marginTop: 15 }}>
					We confirm that the above information is true and correct to the best of our knowledge.
				</Text>
			</View>

			<View style={styles.footer}>
				<View style={styles.sigBlock}>
					<Text>Registrar</Text>
				</View>
				<View style={styles.sigBlock}>
					<Text>Principal</Text>
				</View>
			</View>

			<Text style={styles.motto}>{SCHOOL.motto}</Text>
		</Page>
	</Document>
);

export default function AttestationPage() {
	const [showPDF, setShowPDF] = useState(false);
	const [data, setData] = useState({
		studentName: '',
		gender: 'male',
		program: 'High School',
		academicYear: '2024-2025',
		date: new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}),
	});

	const pdfDocument = useMemo(
		() => <AttestationDocument data={data} />,
		[data],
	);

	const handleGenerate = () => {
		if (!data.studentName.trim()) {
			alert('Please enter the student name.');
			return;
		}
		setShowPDF(true);
	};

	if (showPDF) {
		return (
			<div className="h-screen w-full flex flex-col">
				<div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white flex justify-between items-center shadow-lg">
					<button
						onClick={() => setShowPDF(false)}
						className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
					>
						&larr; Back to Form
					</button>
					<span className="font-bold uppercase tracking-wide">
						Attestation Certificate
					</span>
					<div className="w-24" />
				</div>
				<Suspense
					fallback={
						<div className="flex-1 flex items-center justify-center text-gray-700">
							Loading document preview...
						</div>
					}
				>
					<PDFViewer width="100%" height="100%">
						{pdfDocument}
					</PDFViewer>
				</Suspense>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
			<div className="max-w-2xl mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-indigo-900 mb-2">
						Attestation Certificate
					</h1>
					<p className="text-gray-600 italic">Upstairs Christian Academy</p>
					<p className="text-sm text-gray-500 mt-2">
						Generate an official attestation certificate for a student.
					</p>
				</div>

				<div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg space-y-4">
					<div>
						<label className="block text-sm font-bold mb-2 text-gray-700">
							Student Name *
						</label>
						<input
							type="text"
							value={data.studentName}
							onChange={(e) => setData({ ...data, studentName: e.target.value })}
							placeholder="John Doe"
							className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-bold mb-2 text-gray-700">
								Gender
							</label>
							<select
								value={data.gender}
								onChange={(e) => setData({ ...data, gender: e.target.value })}
								className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
							>
								<option value="male">Male</option>
								<option value="female">Female</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-bold mb-2 text-gray-700">
								Program
							</label>
							<select
								value={data.program}
								onChange={(e) => setData({ ...data, program: e.target.value })}
								className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
							>
								<option value="High School">High School</option>
								<option value="Junior High">Junior High</option>
								<option value="Elementary">Elementary</option>
								<option value="Nursery">Nursery</option>
								<option value="Daycare">Daycare</option>
							</select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-bold mb-2 text-gray-700">
								Academic Year
							</label>
							<input
								type="text"
								value={data.academicYear}
								onChange={(e) => setData({ ...data, academicYear: e.target.value })}
								placeholder="2024-2025"
								className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="block text-sm font-bold mb-2 text-gray-700">
								Document Date
							</label>
							<input
								type="text"
								value={data.date}
								onChange={(e) => setData({ ...data, date: e.target.value })}
								placeholder="January 21, 2026"
								className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 focus:outline-none"
							/>
						</div>
					</div>

					<button
						onClick={handleGenerate}
						className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg mt-4 hover:from-blue-700 hover:to-indigo-700 transition transform hover:scale-105 shadow-lg"
					>
						Generate Attestation Certificate
					</button>
				</div>
			</div>
		</div>
	);
}
