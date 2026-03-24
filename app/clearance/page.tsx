'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
	Document,
	Image,
	Page,
	PDFViewer,
	StyleSheet,
	Text,
	View,
} from '@react-pdf/renderer';

import { PageLoading } from '@/components/loading';

const CONFIG_DATA = {
	periods: ['1st', '2nd', '3rd', '4th', '5th', '6th'],
	installments: ['1st', '2nd', '3rd', '4th'],
	divisions: [
		'Grade 12',
		'Senior High',
		'Junior High',
		'Elementary',
		'Self Contained',
	],
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

const DIVISION_RULES: Record<string, RegExp[]> = {
	'Grade 12': [/^Grade\s*12\b/i],
	'Senior High': [/^Grade\s*(10|11)\b/i],
	'Junior High': [/^Grade\s*(7|8|9)\b/i],
	Elementary: [/^Grade\s*(4|5|6)\b/i],
	'Self Contained': [
		/^Grade\s*(1|2|3)\b/i,
		/^K-I\b/i,
		/^K-II\b/i,
		/^Nursery\b/i,
		/^Daycare\b/i,
	],
};

const createStyles = (theme: {
	name: string;
	bg: string;
	theme: string;
	text: string;
}) =>
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
			opacity: 0.2,
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
			fontSize: 13,
			lineHeight: 1.5,
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

type StudentDatabase = Record<string, Record<string, string[]>>;

type ClearanceCardProps = {
	studentName: string;
	grade: string;
	period: string;
	installment: string;
	theme: { name: string; bg: string; theme: string; text: string };
	isAnonymous: boolean;
	division: string;
};

const ClearanceCard = ({
	studentName,
	grade,
	period,
	installment,
	theme,
	isAnonymous,
	division,
}: ClearanceCardProps) => {
	const s = createStyles(theme);

	return (
		<View style={s.card}>
			<View style={s.innerBorder}>
				<View style={s.watermarkContainer}>
					<Image style={s.watermarkImage} src={CONFIG_DATA.logoUrl2} />
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
						has fully paid the{' '}
						<Text style={s.bold}>{installment} installment,</Text> and is
						cleared to write the{' '}
						<Text style={s.bold}>{period} period test.</Text>
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

type ClearanceDocumentProps = {
	students: string[];
	grade: string;
	period: string;
	installment: string;
	theme: { name: string; bg: string; theme: string; text: string };
	isAnonymous: boolean;
	division: string;
};

const ClearanceDocument = ({
	students,
	grade,
	period,
	installment,
	theme,
	isAnonymous,
	division,
}: ClearanceDocumentProps) => {
	const list = isAnonymous ? ['', '', '', ''] : students;
	const chunks: string[][] = [];

	for (let i = 0; i < list.length; i += 4) {
		chunks.push(list.slice(i, i + 4));
	}

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
								key={`${name}-${idx}`}
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

const parseCSVLine = (line: string) => {
	return line
		.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
		.map((cell) => cell.trim().replace(/^"|"$/g, ''));
};

const normalizeHeader = (value: string) => value.replace(/^\uFEFF/, '').trim();

const getDivisionFromHeader = (header: string) => {
	const clean = normalizeHeader(header);

	for (const division of CONFIG_DATA.divisions) {
		const rules = DIVISION_RULES[division] || [];
		if (rules.some((rule) => rule.test(clean))) {
			return division;
		}
	}

	return null;
};

const buildStudentDatabase = (csvText: string): StudentDatabase => {
	const rows = csvText
		.split(/\r?\n/)
		.filter((row) => row.trim() !== '')
		.map(parseCSVLine);

	if (rows.length === 0) {
		return {
			'Grade 12': {},
			'Senior High': {},
			'Junior High': {},
			Elementary: {},
			'Self Contained': {},
		};
	}

	const headers = rows[0];

	const data: StudentDatabase = {
		'Grade 12': {},
		'Senior High': {},
		'Junior High': {},
		Elementary: {},
		'Self Contained': {},
	};

	headers.forEach((rawHeader, index) => {
		const header = normalizeHeader(rawHeader);

		if (!header || header.toLowerCase() === 'name') return;

		const division = getDivisionFromHeader(header);
		if (!division) return;

		data[division][header] = [];

		for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
			const name = rows[rowIndex]?.[index]?.trim();

			if (name && name.toLowerCase() !== 'name') {
				data[division][header].push(name);
			}
		}

		data[division][header].sort((a, b) => a.localeCompare(b));
	});

	return data;
};

export default function TestClearanceGenerator() {
	const [studentDatabase, setStudentDatabase] = useState<StudentDatabase>({
		'Grade 12': {},
		'Senior High': {},
		'Junior High': {},
		Elementary: {},
		'Self Contained': {},
	});
	const [loading, setLoading] = useState(true);
	const [showPreview, setShowPreview] = useState(false);
	const [isAnonymous, setIsAnonymous] = useState(false);

	const [division, setDivision] = useState('');
	const [grade, setGrade] = useState('');
	const [period, setPeriod] = useState(CONFIG_DATA.periods[0]);
	const [installment, setInstallment] = useState(CONFIG_DATA.installments[0]);
	const [sheetColorName, setSheetColorName] = useState('White');
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedDbStudents, setSelectedDbStudents] = useState<string[]>([]);
	const [manualStudents, setManualStudents] = useState('');

	useEffect(() => {
		const loadCSV = async () => {
			try {
				const response = await fetch('/students.csv');
				const text = await response.text();
				const parsedData = buildStudentDatabase(text);

				setStudentDatabase(parsedData);
			} catch (error) {
				console.error('Error loading student CSV:', error);
			} finally {
				setLoading(false);
			}
		};

		loadCSV();
	}, []);

	const currentTheme = useMemo(() => {
		return (
			CONFIG_DATA.sheetColors.find((c) => c.name === sheetColorName) ||
			CONFIG_DATA.sheetColors[0]
		);
	}, [sheetColorName]);

	const gradesInSelectedDivision = useMemo(() => {
		if (!division) return [];
		return Object.keys(studentDatabase[division] || {});
	}, [division, studentDatabase]);

	const filteredStudents = useMemo(() => {
		if (!division || !grade) return [];

		const students = studentDatabase[division]?.[grade] || [];
		return students.filter((name) =>
			name.toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [division, grade, studentDatabase, searchTerm]);

	const finalStudentList = useMemo(() => {
		const manualList = manualStudents
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean);

		return [...selectedDbStudents, ...manualList].sort((a, b) =>
			a.localeCompare(b),
		);
	}, [selectedDbStudents, manualStudents]);

	if (loading) {
		return <PageLoading message="Loading students..." variant="dots" />;
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
							setIsAnonymous((prev) => !prev);
							setDivision('');
							setGrade('');
							setSearchTerm('');
							setSelectedDbStudents([]);
							setManualStudents('');
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
							setSearchTerm('');
							setSelectedDbStudents([]);
						}}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						<option value="">Select Division...</option>
						{CONFIG_DATA.divisions.map((div) => (
							<option key={div} value={div}>
								{div}
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
					{division && (
						<div className="mb-8 flex gap-3 flex-wrap bg-slate-50 p-4 rounded-3xl border-2 border-slate-100">
							{gradesInSelectedDivision.length > 0 ? (
								gradesInSelectedDivision.map((g) => (
									<button
										key={g}
										onClick={() => {
											setGrade(g);
											setSearchTerm('');
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
								))
							) : (
								<p className="text-sm font-bold text-slate-400">
									No classes found for this division.
								</p>
							)}
						</div>
					)}

					{grade && (
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
										onClick={() => setSelectedDbStudents(filteredStudents)}
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
								{filteredStudents.map((name, idx) => (
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
														? prev.filter((student) => student !== name)
														: [...prev, name],
												)
											}
										/>

										<span className="font-black truncate text-[10px] upperca
