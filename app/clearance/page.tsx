'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
	Document,
	Page,
	PDFViewer,
	Text,
	View,
	StyleSheet,
	Image,
} from '@react-pdf/renderer';

// --- EDITABLE APP DATA ---
const CONFIG_DATA = {
	periods: ['1st', '2nd', '3rd', '4th', '5th', '6th'],
	installments: ['1st', '2nd', '3rd', '4th'],
	sheetColors: [
		{ name: 'White', bg: '#ffffff', theme: '#1e3a8a', text: '#1e293b' },
		{ name: 'Blue', bg: '#ffffff', theme: '#172554', text: '#000000' },
		{ name: 'Yellow', bg: '#ffffff', theme: '#000000', text: '#000000' },
		{ name: 'Pink', bg: '#ffffff', theme: '#701a75', text: '#000000' },
	],
	logoUrl:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1753368059/school-management-system/uca/logo.png',
	logoUrl2:
		'https://res.cloudinary.com/dcalueltd/image/upload/v1753484515/school-management-system/uca/uca_logo2_kqlgdl.png',
};

const createStyles = (theme) =>
	StyleSheet.create({
		page: { padding: 20, backgroundColor: '#ffffff' },
		card: {
			width: '48.5%',
			height: '48.5%',
			borderWidth: 3,
			borderColor: theme.theme,
			borderRadius: 12,
			padding: 4,
			position: 'relative',
			overflow: 'hidden',
		},
		innerBorder: {
			flex: 1,
			borderWidth: 1,
			borderColor: theme.theme,
			borderRadius: 8,
			padding: 15,
			backgroundColor: 'rgba(255, 255, 255, 0.9)',
			display: 'flex',
			flexDirection: 'column',
		},
		watermarkContainer: {
			position: 'absolute',
			top: '20%',
			left: '20%',
			width: '60%',
			height: '60%',
			opacity: 0.07,
			zIndex: -1,
		},
		watermarkImage: {
			width: '100%',
			height: '100%',
			objectFit: 'contain',
		},
		letterhead: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			borderBottomWidth: 1.5,
			borderBottomColor: theme.theme,
			paddingBottom: 8,
			marginBottom: 10,
		},
		logoImage: {
			width: 45,
			height: 45,
			objectFit: 'contain',
		},
		schoolInfo: { flex: 1, textAlign: 'center' },
		schoolName: {
			fontSize: 14,
			fontWeight: 'extrabold',
			color: theme.theme,
			textTransform: 'uppercase',
			letterSpacing: 1,
		},
		schoolAddress: { fontSize: 6.5, color: theme.text, marginTop: 1 },
		titleBar: {
			backgroundColor: theme.theme,
			paddingVertical: 5,
			borderRadius: 4,
			marginBottom: 12,
		},
		titleText: {
			fontSize: 10,
			color: '#ffffff',
			textAlign: 'center',
			fontWeight: 'bold',
			textTransform: 'uppercase',
			letterSpacing: 1.5,
		},
		detailsSection: {
			marginBottom: 8,
		},
		infoRow: {
			fontSize: 11,
			flexDirection: 'row',
			marginBottom: 6,
			alignItems: 'flex-end',
		},
		label: {
			fontWeight: 'bold',
			width: 60,
			color: theme.theme,
			fontSize: 10,
			textTransform: 'uppercase',
		},
		valueUnderline: {
			flex: 1,
			borderBottomWidth: 1,
			borderBottomColor: '#ccc',
			marginLeft: 5,
			minHeight: 14,
			paddingLeft: 5,
		},
		boldValue: {
			fontWeight: 'bold',
			color: '#000',
			fontSize: 12,
		},
		clearanceText: {
			fontSize: 13, // Slightly reduced to prevent overlap
			lineHeight: 1.5, // Tighter line height
			marginTop: 8,
			color: theme.text,
		},
		bold: { fontWeight: 'bold', color: '#000' },
		bodyNameLine: {
			width: 180,
			borderBottomWidth: 1,
			borderBottomColor: theme.theme,
			height: 12,
			marginBottom: -2,
		},
		footer: {
			marginTop: 'auto',
			paddingTop: 10,
			alignItems: 'center',
			width: '100%',
		},
		signatureRow: {
			flexDirection: 'row',
			alignItems: 'flex-end',
			width: '80%',
			marginTop: 20,
		},
		signedLabel: {
			fontSize: 11,
			fontWeight: 'bold',
			color: theme.theme,
			marginRight: 4,
		},
		line: { flex: 1, borderBottomWidth: 1.5, borderBottomColor: theme.theme },
		registrar: {
			fontSize: 11,
			marginTop: 4,
			fontWeight: 'bold',
			color: theme.theme,
			textAlign: 'center',
		},
	});

// --- PDF COMPONENTS ---
const ClearanceCard = ({
	studentName,
	grade,
	period,
	installment,
	theme,
	isAnonymous,
	division,
}) => {
	const s = createStyles(theme);
	return (
		<View style={s.card}>
			<View style={s.innerBorder}>
				<View style={s.watermarkContainer}>
					<Image style={s.watermarkImage} src={CONFIG_DATA.logoUrl} />
				</View>

				<View style={s.letterhead}>
					<Image style={s.logoImage} src={CONFIG_DATA.logoUrl2} />
					<View style={s.schoolInfo}>
						<Text style={s.schoolName}>Upstairs Christian Academy</Text>
						{[
							'Unity Town, Pipeline Road Lower Johnsonville',
							'PO Box 2553 Montserrado County, Liberia',
							'Cell#: 0886851802/0770851802/0886022009',
						].map((line, idx) => (
							<Text key={idx} style={s.schoolAddress}>
								{line}
							</Text>
						))}
					</View>
					<Image style={s.logoImage} src={CONFIG_DATA.logoUrl} />
				</View>

				<View style={s.titleBar}>
					<Text style={s.titleText}>
						{division} • {period} Period Test Clearance
					</Text>
				</View>

				<View style={s.detailsSection}>
					<View style={s.infoRow}>
						<Text style={s.label}>Student:</Text>
						<View style={s.valueUnderline}>
							{!isAnonymous && <Text style={s.boldValue}>{studentName}</Text>}
						</View>
					</View>
					<View style={s.infoRow}>
						<Text style={s.label}>Class:</Text>
						<View style={s.valueUnderline}>
							{!isAnonymous && <Text style={s.boldValue}>{grade}</Text>}
						</View>
					</View>
				</View>

				<View style={s.clearanceText}>
					<Text>
						This is to certify that{' '}
						{isAnonymous ? (
							<View style={s.bodyNameLine}>
								<Text>______________________</Text>
							</View>
						) : (
							<Text style={s.bold}>{studentName}</Text>
						)}{' '}
						is cleared with the{' '}
						<Text style={s.bold}>{installment} installment</Text> with zero
						balance and is cleared to write the{' '}
						<Text style={s.bold}>{period} period test.</Text>{' '}
					</Text>
				</View>

				<View style={s.footer}>
					<View style={s.signatureRow}>
						<Text style={s.signedLabel}>Signed:</Text>
						<View style={s.line} />
					</View>
					<Text style={s.registrar}>The Registrar</Text>
				</View>
			</View>
		</View>
	);
};

const ClearanceDocument = ({
	students,
	grade,
	period,
	installment,
	theme,
	isAnonymous,
	division,
}) => {
	const list = isAnonymous ? ['', '', '', ''] : students;
	const chunks = [];
	for (let i = 0; i < list.length; i += 4) chunks.push(list.slice(i, i + 4));

	return (
		<Document>
			{chunks.map((group, pageIdx) => (
				<Page
					key={pageIdx}
					size="A4"
					orientation="landscape"
					style={{ padding: 20, backgroundColor: '#ffffff' }}
				>
					<View
						style={{
							flexDirection: 'row',
							flexWrap: 'wrap',
							justifyContent: 'space-between',
							alignContent: 'space-between',
							height: '100%',
						}}
					>
						{group.map((name, idx) => (
							<ClearanceCard
								key={idx}
								studentName={name}
								grade={grade}
								period={period}
								installment={installment}
								theme={theme}
								isAnonymous={isAnonymous}
								division={division}
							/>
						))}
					</View>
				</Page>
			))}
		</Document>
	);
};

export default function TestClearanceGenerator() {
	const [studentDatabase, setStudentDatabase] = useState({});
	const [loading, setLoading] = useState(true);
	const [showPreview, setShowPreview] = useState(false);
	const [isAnonymous, setIsAnonymous] = useState(false);
	const [division, setDivision] = useState('');
	const [grade, setGrade] = useState('');
	const [period, setPeriod] = useState(CONFIG_DATA.periods[0]);
	const [installment, setInstallment] = useState(CONFIG_DATA.installments[0]);
	const [sheetColorName, setSheetColorName] = useState('White');
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedDbStudents, setSelectedDbStudents] = useState([]);
	const [manualStudents, setManualStudents] = useState('');

	useEffect(() => {
		const loadCSV = async () => {
			try {
				const response = await fetch('/students.csv');
				const text = await response.text();

				const rows = text.split(/\r?\n/).map((row) => {
					return row
						.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
						.map((cell) => cell.trim().replace(/^"|"$/g, ''));
				});

				const headers = rows[0];
				const data = {};

				headers.forEach((header, index) => {
					if (!header) return;

					let div = 'Senior High';
					if (header.match(/Grade [4-6]/)) div = 'Elementary';
					else if (header.match(/Grade [7-9]/)) div = 'Junior High';
					else if (
						['K-II', 'K-I', 'Nursery', 'Daycare'].includes(header) ||
						header.match(/Grade [1-3]$/)
					)
						div = 'Self-Contained';

					if (!data[div]) data[div] = {};
					data[div][header] = [];

					for (let i = 1; i < rows.length; i++) {
						const name = rows[i][index];
						if (name && name !== 'Name' && name !== '') {
							data[div][header].push(name);
						}
					}
					data[div][header].sort((a, b) => a.localeCompare(b));
				});

				setStudentDatabase(data);
				setLoading(false);
			} catch (error) {
				console.error('Error loading student CSV:', error);
				setLoading(false);
			}
		};

		loadCSV();
	}, []);

	const currentTheme = useMemo(
		() => CONFIG_DATA.sheetColors.find((c) => c.name === sheetColorName),
		[sheetColorName]
	);

	const finalStudentList = useMemo(() => {
		const combined = [
			...selectedDbStudents,
			...manualStudents
				.split(',')
				.map((n) => n.trim())
				.filter((n) => n !== ''),
		];
		return combined.sort((a, b) => a.localeCompare(b));
	}, [selectedDbStudents, manualStudents]);

	if (loading) {
		return (
			<div className="h-screen flex items-center justify-center font-black text-blue-900">
				LOADING STUDENT DATABASE...
			</div>
		);
	}

	if (showPreview) {
		return (
			<div className="w-full h-screen flex flex-col bg-slate-900">
				<div className="p-4 flex justify-between bg-white items-center shadow-lg z-10">
					<button
						onClick={() => setShowPreview(false)}
						className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
					>
						← Back to Setup
					</button>
					<div className="text-center">
						<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
							{isAnonymous ? 'Drafting Blank Forms' : 'Processing Student Data'}
						</p>
						<p className="font-black text-blue-900">
							{isAnonymous
								? 'ANONYMOUS MASTER'
								: `${finalStudentList.length} CLEARANCES`}
						</p>
					</div>
					<div className="w-24" />
				</div>
				<PDFViewer width="100%" height="100%">
					<ClearanceDocument
						students={finalStudentList}
						grade={grade}
						period={period}
						installment={installment}
						theme={currentTheme}
						isAnonymous={isAnonymous}
						division={division}
					/>
				</PDFViewer>
			</div>
		);
	}

	return (
		<div className="max-w-6xl mx-auto p-8 bg-white min-h-screen">
			<div className="text-center mb-10 flex flex-col items-center">
				<h1 className="text-4xl font-black text-blue-900 tracking-tight">
					CLEARANCE PORTAL
				</h1>

				<div className="mt-6 flex items-center gap-4 bg-slate-50 p-2 px-6 rounded-2xl border-2 border-slate-100 shadow-sm">
					<span
						className={`text-xs font-black transition-colors ${
							!isAnonymous ? 'text-blue-600' : 'text-slate-300'
						}`}
					>
						STANDARD
					</span>
					<button
						onClick={() => {
							setIsAnonymous(!isAnonymous);
							setGrade('');
							setSelectedDbStudents([]);
						}}
						className={`w-14 h-7 rounded-full relative transition-all duration-300 ${
							isAnonymous ? 'bg-orange-500 shadow-inner' : 'bg-slate-300'
						}`}
					>
						<div
							className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${
								isAnonymous ? 'left-8' : 'left-1'
							}`}
						/>
					</button>
					<span
						className={`text-xs font-black transition-colors ${
							isAnonymous ? 'text-orange-600' : 'text-slate-300'
						}`}
					>
						ANONYMOUS
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
				<div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
					<label className="text-[10px] font-black text-slate-400 uppercase mb-2 block text-center tracking-widest">
						Sheet Color
					</label>
					<div className="flex justify-center gap-3">
						{CONFIG_DATA.sheetColors.map((c) => (
							<button
								key={c.name}
								onClick={() => setSheetColorName(c.name)}
								className={`w-8 h-8 rounded-full border-2 transition-all ${
									sheetColorName === c.name
										? 'scale-125 border-blue-600 shadow-lg'
										: 'border-white hover:border-slate-200'
								}`}
								style={{
									backgroundColor:
										c.name === 'White'
											? '#fff'
											: c.name === 'Blue'
											? '#dbeafe'
											: c.name === 'Yellow'
											? '#fef9c3'
											: '#fce7f3',
								}}
							/>
						))}
					</div>
				</div>

				<div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
					<label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">
						Division
					</label>
					<select
						value={division}
						onChange={(e) => {
							setDivision(e.target.value);
							setGrade('');
							setSelectedDbStudents([]);
						}}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						<option value="">Select Division...</option>
						{Object.keys(studentDatabase).map((d) => (
							<option key={d} value={d}>
								{d}
							</option>
						))}
					</select>
				</div>

				<div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
					<label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">
						Period
					</label>
					<select
						value={period}
						onChange={(e) => setPeriod(e.target.value)}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						{CONFIG_DATA.periods.map((p) => (
							<option key={p} value={p}>
								{p} Period
							</option>
						))}
					</select>
				</div>

				<div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
					<label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">
						Installment
					</label>
					<select
						value={installment}
						onChange={(e) => setInstallment(e.target.value)}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						{CONFIG_DATA.installments.map((i) => (
							<option key={i} value={i}>
								{i} Installment
							</option>
						))}
					</select>
				</div>
			</div>

			{!isAnonymous && (
				<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
					{division && studentDatabase[division] && (
						<div className="mb-8 flex gap-3 flex-wrap bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
							{Object.keys(studentDatabase[division]).map((g) => (
								<button
									key={g}
									onClick={() => {
										setGrade(g);
										setSelectedDbStudents([]);
									}}
									className={`px-6 py-2 rounded-xl font-black text-sm transition-all ${
										grade === g
											? 'bg-blue-600 text-white shadow-lg'
											: 'bg-white text-slate-400 hover:text-blue-600 shadow-sm'
									}`}
								>
									{g}
								</button>
							))}
						</div>
					)}

					{grade && studentDatabase[division]?.[grade] && (
						<div className="mb-8 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 shadow-inner">
							<div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
								<input
									type="text"
									placeholder="Search student names..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="p-3 px-5 rounded-2xl border-2 border-white flex-1 outline-none focus:border-blue-600 font-bold shadow-sm"
								/>
								<div className="flex gap-2">
									<button
										onClick={() =>
											setSelectedDbStudents(
												studentDatabase[division][grade].filter((n) =>
													n.toLowerCase().includes(searchTerm.toLowerCase())
												)
											)
										}
										className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-blue-700 transition-colors"
									>
										Select All
									</button>
									<button
										onClick={() => setSelectedDbStudents([])}
										className="bg-slate-800 text-white px-6 py-2 rounded-xl font-black text-xs uppercase hover:bg-slate-900 transition-colors"
									>
										Clear
									</button>
								</div>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2">
								{studentDatabase[division][grade]
									.filter((n) =>
										n.toLowerCase().includes(searchTerm.toLowerCase())
									)
									.map((name, idx) => (
										<label
											key={`${name}-${idx}`}
											className={`flex items-center p-3 rounded-2xl border-2 cursor-pointer transition-all ${
												selectedDbStudents.includes(name)
													? 'bg-blue-600 border-blue-600 text-white shadow-md'
													: 'bg-white border-transparent text-slate-500 hover:border-blue-200'
											}`}
										>
											<input
												type="checkbox"
												className="hidden"
												checked={selectedDbStudents.includes(name)}
												onChange={() =>
													setSelectedDbStudents((prev) =>
														prev.includes(name)
															? prev.filter((s) => s !== name)
															: [...prev, name]
													)
												}
											/>
											<span className="font-black truncate text-[10px] uppercase tracking-wide">
												{name}
											</span>
										</label>
									))}
							</div>
						</div>
					)}

					<div className="mb-10">
						<label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-2 tracking-widest">
							Manual Name Entry
						</label>
						<textarea
							value={manualStudents}
							onChange={(e) => setManualStudents(e.target.value)}
							placeholder="Samuel Lofa, Prince Carter..."
							className="w-full border-2 border-slate-100 p-6 h-24 rounded-3xl outline-none focus:border-blue-500 font-bold text-slate-700 shadow-sm"
						/>
					</div>
				</div>
			)}

			<button
				onClick={() => setShowPreview(true)}
				disabled={!isAnonymous && (!grade || finalStudentList.length === 0)}
				className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-95 ${
					isAnonymous
						? 'bg-orange-600 text-white shadow-orange-100'
						: 'bg-blue-600 text-white shadow-blue-100 disabled:bg-slate-200 disabled:shadow-none'
				}`}
			>
				{isAnonymous
					? 'PRINT ANONYMOUS MASTER'
					: `PRINT ${
							finalStudentList.length > 0 ? `(${finalStudentList.length})` : ''
					  } CLEARANCES`}
			</button>
		</div>
	);
}
