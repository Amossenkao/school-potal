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

type ThemeOption = {
	name: string;
	bg: string;
	theme: string;
	text: string;
};

type StudentDatabase = Record<string, Record<string, string[]>>;

type ClearanceCardProps = {
	studentName: string;
	grade: string;
	period: string;
	installment: string;
	theme: ThemeOption;
	isAnonymous: boolean;
	division: string;
};

type ClearanceDocumentProps = {
	students: string[];
	grade: string;
	period: string;
	installment: string;
	theme: ThemeOption;
	isAnonymous: boolean;
	division: string;
};

const CONFIG = {
	periods: ['1st', '2nd', '3rd', '4th', '5th', '6th', 'Mock'],
	installments: ['1st', '2nd', '3rd', 'Final'],
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

const EMPTY_DATABASE: StudentDatabase = {
	'Grade 12': {},
	'Senior High': {},
	'Junior High': {},
	Elementary: {},
	'Self Contained': {},
};

const DIVISION_MATCHERS: Record<string, RegExp[]> = {
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

const createPdfStyles = (theme: ThemeOption) =>
	StyleSheet.create({
		page: {
			padding: 20,
			backgroundColor: '#ffffff',
		},
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
			backgroundColor: 'rgba(255,255,255,0.92)',
			flexDirection: 'column',
		},
		watermarkContainer: {
			position: 'absolute',
			top: '20%',
			left: '20%',
			width: '60%',
			height: '60%',
			opacity: 0.18,
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
		schoolInfo: {
			flex: 1,
			textAlign: 'center',
		},
		schoolName: {
			fontSize: 14,
			fontWeight: 'bold',
			color: theme.theme,
			textTransform: 'uppercase',
			letterSpacing: 1,
		},
		schoolAddress: {
			fontSize: 6.5,
			color: theme.text,
			marginTop: 1,
		},
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
			borderBottomColor: '#cccccc',
			marginLeft: 5,
			minHeight: 14,
			paddingLeft: 5,
		},
		boldValue: {
			fontWeight: 'bold',
			color: '#000000',
			fontSize: 12,
		},
		clearanceText: {
			fontSize: 13,
			lineHeight: 1.45,
			marginTop: 8,
			color: theme.text,
		},
		bold: {
			fontWeight: 'bold',
			color: '#000000',
		},
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
		line: {
			flex: 1,
			borderBottomWidth: 1.5,
			borderBottomColor: theme.theme,
		},
		registrar: {
			fontSize: 11,
			marginTop: 4,
			fontWeight: 'bold',
			color: theme.theme,
			textAlign: 'center',
		},
	});

function parseCSVLine(line: string): string[] {
	return line
		.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
		.map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

function normalizeValue(value: string): string {
	return value.replace(/^\uFEFF/, '').trim();
}

function getDivisionFromHeader(header: string): string | null {
	const cleanHeader = normalizeValue(header);

	for (const division of CONFIG.divisions) {
		const matchers = DIVISION_MATCHERS[division];
		if (matchers.some((regex) => regex.test(cleanHeader))) {
			return division;
		}
	}

	return null;
}

function buildStudentDatabase(csvText: string): StudentDatabase {
	const rows = csvText
		.split(/\r?\n/)
		.filter((row) => row.trim() !== '')
		.map(parseCSVLine);

	if (rows.length === 0) {
		return { ...EMPTY_DATABASE };
	}

	const headers = rows[0];
	const database: StudentDatabase = {
		'Grade 12': {},
		'Senior High': {},
		'Junior High': {},
		Elementary: {},
		'Self Contained': {},
	};

	headers.forEach((rawHeader, colIndex) => {
		const header = normalizeValue(rawHeader);

		if (!header || header.toLowerCase() === 'name') return;

		const division = getDivisionFromHeader(header);
		if (!division) return;

		database[division][header] = [];

		for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
			const name = rows[rowIndex]?.[colIndex]?.trim();
			if (name && name.toLowerCase() !== 'name') {
				database[division][header].push(name);
			}
		}

		database[division][header].sort((a, b) => a.localeCompare(b));
	});

	return database;
}

const ClearanceCard = ({
	studentName,
	grade,
	period,
	installment,
	theme,
	isAnonymous,
	division,
}: ClearanceCardProps) => {
	const s = createPdfStyles(theme);

	return (
		<View style={s.card}>
			<View style={s.innerBorder}>
				<View style={s.watermarkContainer}>
					<Image style={s.watermarkImage} src={CONFIG.logoUrl2} />
				</View>

				<View style={s.letterhead}>
					<Image style={s.logoImage} src={CONFIG.logoUrl2} />

					<View style={s.schoolInfo}>
						<Text style={s.schoolName}>Upstairs Christian Academy</Text>
						<Text style={s.schoolAddress}>
							Unity Town, Pipeline Road Lower Johnsonville
						</Text>
						<Text style={s.schoolAddress}>
							PO Box 2553 Montserrado County, Liberia
						</Text>
						<Text style={s.schoolAddress}>
							Cell#: 0886851802/0770851802/0886022009
						</Text>
					</View>

					<Image style={s.logoImage} src={CONFIG.logoUrl} />
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
							<Text>______________________</Text>
						) : (
							<Text style={s.bold}>{studentName}</Text>
						)}{' '}
						has fully paid the <Text style={s.bold}>{installment == "Final" ? "All required Payments" : `${installment} installment`} </Text>,
						and is cleared to write the{' '}
						<Text style={s.bold}>{period == "Mock" ? "Mock Exam" : `${period} test`}</Text>.
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
}: ClearanceDocumentProps) => {
	const list = isAnonymous ? ['', '', '', ''] : students;
	const chunks: string[][] = [];

	for (let i = 0; i < list.length; i += 4) {
		chunks.push(list.slice(i, i + 4));
	}

	return (
		<Document>
			{chunks.map((group, pageIndex) => (
				<Page
					key={pageIndex}
					size="A4"
					orientation="landscape"
					style={createPdfStyles(theme).page}
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
						{group.map((student, index) => (
							<ClearanceCard
								key={`${student}-${index}`}
								studentName={student}
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
	const [studentDatabase, setStudentDatabase] =
		useState<StudentDatabase>(EMPTY_DATABASE);
	const [loading, setLoading] = useState(true);
	const [showPreview, setShowPreview] = useState(false);
	const [isAnonymous, setIsAnonymous] = useState(false);

	const [division, setDivision] = useState('');
	const [grade, setGrade] = useState('');
	const [period, setPeriod] = useState(CONFIG.periods[0]);
	const [installment, setInstallment] = useState(CONFIG.installments[0]);
	const [sheetColorName, setSheetColorName] = useState('White');
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedDbStudents, setSelectedDbStudents] = useState<string[]>([]);
	const [manualStudents, setManualStudents] = useState('');

	useEffect(() => {
		const loadStudents = async () => {
			try {
				const response = await fetch('/students.csv');
				const text = await response.text();
				const database = buildStudentDatabase(text);
				setStudentDatabase(database);
			} catch (error) {
				console.error('Error loading student CSV:', error);
				setStudentDatabase({ ...EMPTY_DATABASE });
			} finally {
				setLoading(false);
			}
		};

		loadStudents();
	}, []);

	const currentTheme = useMemo(() => {
		return (
			CONFIG.sheetColors.find((color) => color.name === sheetColorName) ??
			CONFIG.sheetColors[0]
		);
	}, [sheetColorName]);

	const gradesInSelectedDivision = useMemo(() => {
		if (!division) return [];
		return Object.keys(studentDatabase[division] || {});
	}, [division, studentDatabase]);

	const filteredStudents = useMemo(() => {
		if (!division || !grade) return [];
		const students = studentDatabase[division]?.[grade] || [];

		return students.filter((student) =>
			student.toLowerCase().includes(searchTerm.toLowerCase()),
		);
	}, [division, grade, searchTerm, studentDatabase]);

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
			<div className="flex h-screen w-full flex-col bg-slate-900">
				<div className="z-10 flex items-center justify-between bg-white p-4 shadow-lg">
					<button
						onClick={() => setShowPreview(false)}
						className="rounded-xl bg-blue-600 px-6 py-2 font-bold text-white transition-colors hover:bg-blue-700"
					>
						← Back to Setup
					</button>

					<div className="text-center">
						<p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
		<div className="min-h-screen max-w-6xl mx-auto bg-white p-8">
			<div className="mb-10 flex flex-col items-center text-center">
				<h1 className="text-4xl font-black tracking-tight text-blue-900">
					CLEARANCE PORTAL
				</h1>

				<div className="mt-6 flex items-center gap-4 rounded-2xl border-2 border-slate-100 bg-slate-50 p-2 px-6 shadow-sm">
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
						className={`relative h-7 w-14 rounded-full transition-all duration-300 ${
							isAnonymous ? 'bg-orange-500 shadow-inner' : 'bg-slate-300'
						}`}
					>
						<div
							className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
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

			<div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
				<div className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
					<label className="mb-2 block text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
						Sheet Color
					</label>

					<div className="flex justify-center gap-3">
						{CONFIG.sheetColors.map((color) => (
							<button
								key={color.name}
								type="button"
								onClick={() => setSheetColorName(color.name)}
								className={`h-8 w-8 rounded-full border-2 transition-all ${
									sheetColorName === color.name
										? 'scale-125 border-blue-600 shadow-lg'
										: 'border-white hover:border-slate-200'
								}`}
								style={{
									backgroundColor:
										color.name === 'White'
											? '#ffffff'
											: color.name === 'Blue'
												? '#dbeafe'
												: color.name === 'Yellow'
													? '#fef9c3'
													: '#fce7f3',
								}}
							/>
						))}
					</div>
				</div>

				<div className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
					<label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
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
						{CONFIG.divisions.map((item) => (
							<option key={item} value={item}>
								{item}
							</option>
						))}
					</select>
				</div>

				<div className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
					<label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
						Period
					</label>

					<select
						value={period}
						onChange={(e) => setPeriod(e.target.value)}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						{CONFIG.periods.map((item) => (
							<option key={item} value={item}>
								{item} Period
							</option>
						))}
					</select>
				</div>

				<div className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
					<label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
						Installment
					</label>

					<select
						value={installment}
						onChange={(e) => setInstallment(e.target.value)}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						{CONFIG.installments.map((item) => (
							<option key={item} value={item}>
								{item} Installment
							</option>
						))}
					</select>
				</div>
			</div>

			{!isAnonymous && (
				<div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
					{division && (
						<div className="mb-8 flex flex-wrap gap-3 rounded-3xl border-2 border-slate-100 bg-slate-50 p-4">
							{gradesInSelectedDivision.length > 0 ? (
								gradesInSelectedDivision.map((item) => (
									<button
										key={item}
										type="button"
										onClick={() => {
											setGrade(item);
											setSearchTerm('');
											setSelectedDbStudents([]);
										}}
										className={`rounded-xl px-6 py-2 text-sm font-black transition-all ${
											grade === item
												? 'bg-blue-600 text-white shadow-lg'
												: 'bg-white text-slate-400 shadow-sm hover:text-blue-600'
										}`}
									>
										{item}
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
						<div className="mb-8 rounded-3xl border-2 border-slate-100 bg-slate-50 p-6 shadow-inner">
							<div className="mb-6 flex flex-col gap-4 md:flex-row md:justify-between">
								<input
									type="text"
									placeholder="Search student names..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="flex-1 rounded-2xl border-2 border-white p-3 px-5 font-bold outline-none shadow-sm focus:border-blue-600"
								/>

								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setSelectedDbStudents(filteredStudents)}
										className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-blue-700"
									>
										Select All
									</button>

									<button
										type="button"
										onClick={() => setSelectedDbStudents([])}
										className="rounded-xl bg-slate-800 px-6 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-slate-900"
									>
										Clear
									</button>
								</div>
							</div>

							<div className="grid max-h-48 grid-cols-1 gap-3 overflow-y-auto pr-2 sm:grid-cols-2 md:grid-cols-4">
								{filteredStudents.map((name, index) => (
									<label
										key={`${name}-${index}`}
										className={`flex cursor-pointer items-center rounded-2xl border-2 p-3 transition-all ${
											selectedDbStudents.includes(name)
												? 'border-blue-600 bg-blue-600 text-white shadow-md'
												: 'border-transparent bg-white text-slate-500 hover:border-blue-200'
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

										<span className="truncate text-[10px] font-black uppercase tracking-wide">
											{name}
										</span>
									</label>
								))}
							</div>
						</div>
					)}

					<div className="mb-10">
						<label className="ml-2 mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
							Manual Name Entry
						</label>

						<textarea
							value={manualStudents}
							onChange={(e) => setManualStudents(e.target.value)}
							placeholder="Samuel Lofa, Prince Carter..."
							className="h-24 w-full rounded-3xl border-2 border-slate-100 p-6 font-bold text-slate-700 outline-none shadow-sm focus:border-blue-500"
						/>
					</div>
				</div>
			)}

			<button
				type="button"
				onClick={() => setShowPreview(true)}
				disabled={!isAnonymous && (!grade || finalStudentList.length === 0)}
				className={`w-full rounded-3xl py-6 text-xl font-black shadow-2xl transition-all active:scale-95 ${
					isAnonymous
						? 'bg-orange-600 text-white shadow-orange-100'
						: 'bg-blue-600 text-white shadow-blue-100 disabled:bg-slate-200 disabled:shadow-none'
				}`}
			>
				{isAnonymous
					? 'PRINT ANONYMOUS MASTER'
					: `PRINT ${finalStudentList.length > 0 ? `(${finalStudentList.length}) ` : ''}CLEARANCES`}
			</button>
		</div>
	);
}
