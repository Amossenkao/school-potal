'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { PageLoading } from '@/components/loading';
import {
	ClearanceDocument,
	SHEET_COLORS,
	PERIODS,
} from '@/components/clearance/ClearancePDF';
import { useSchoolStore } from '@/store/schoolStore';
import { getCurrentAcademicYearFromSchoolProfile } from '@/utils/academicYearAccess';

export default function ClearancesPage() {
	const schoolProfile = useSchoolStore((s) => s.school);

	const [students, setStudents] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [showPreview, setShowPreview] = useState(false);

	const [division, setDivision] = useState('');
	const [gradeFilter, setGradeFilter] = useState('');
	const [period, setPeriod] = useState(PERIODS[0]);
	const [installment, setInstallment] = useState('1st');
	const [sheetColorName, setSheetColorName] = useState('White');
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
	const [manualStudents, setManualStudents] = useState('');
	const [isAnonymous, setIsAnonymous] = useState(false);

	const academicYear = useMemo(
		() => (schoolProfile ? getCurrentAcademicYearFromSchoolProfile(schoolProfile) || '' : ''),
		[schoolProfile],
	);

	const loadStudents = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/students');
			const json = await res.json();
			if (json.success) setStudents(json.data);
		} catch {
			console.error('Failed to load students');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadStudents();
	}, [loadStudents]);

	const classNames = useMemo(() => {
		const names = new Set(students.map((s) => s.className).filter(Boolean));
		return Array.from(names).sort();
	}, [students]);

	const filteredStudents = useMemo(() => {
		let list = students;
		if (division) {
			const divMap: Record<string, string[]> = {
				'Grade 12': ['Grade 12'],
				'Senior High': ['Grade 10', 'Grade 11'],
				'Junior High': ['Grade 7', 'Grade 8', 'Grade 9'],
				Elementary: ['Grade 4', 'Grade 5', 'Grade 6'],
				'Self Contained': ['Grade 1', 'Grade 2', 'Grade 3', 'K-I', 'K-II', 'Nursery', 'Daycare'],
			};
			const allowed = divMap[division] || [];
			list = list.filter((s) => allowed.some((a) => s.className?.startsWith(a)));
		}
		if (gradeFilter) {
			list = list.filter((s) => s.className === gradeFilter);
		}
		if (searchTerm) {
			const q = searchTerm.toLowerCase();
			list = list.filter(
				(s) =>
					`${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
					s.studentId.toLowerCase().includes(q),
			);
		}
		return list.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
	}, [students, division, gradeFilter, searchTerm]);

	const finalStudentList = useMemo(() => {
		const manualList = manualStudents
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean);
		return [...selectedStudents, ...manualList].sort((a, b) => a.localeCompare(b));
	}, [selectedStudents, manualStudents]);

	const currentTheme = useMemo(
		() => SHEET_COLORS.find((c) => c.name === sheetColorName) || SHEET_COLORS[0],
		[sheetColorName],
	);

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
						&larr; Back to Setup
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
						grade={gradeFilter || division}
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
		<div className="mx-auto max-w-6xl space-y-8 p-6">
			<div>
				<h1 className="text-2xl font-black tracking-tight">Clearance Generator</h1>
				<p className="text-sm text-muted-foreground">
					Generate exam clearance certificates for students. Academic Year: {academicYear}
				</p>
			</div>

			<div className="mb-8 flex items-center gap-4 rounded-2xl border-2 bg-slate-50 p-2 px-6 shadow-sm">
				<span className={`text-xs font-black transition-colors ${!isAnonymous ? 'text-blue-600' : 'text-slate-300'}`}>
					STANDARD
				</span>
				<button
					onClick={() => {
						setIsAnonymous((prev) => !prev);
						setGradeFilter('');
						setSearchTerm('');
						setSelectedStudents([]);
						setManualStudents('');
					}}
					className={`relative h-7 w-14 rounded-full transition-all duration-300 ${isAnonymous ? 'bg-orange-500 shadow-inner' : 'bg-slate-300'}`}
				>
					<div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${isAnonymous ? 'left-8' : 'left-1'}`} />
				</button>
				<span className={`text-xs font-black transition-colors ${isAnonymous ? 'text-orange-600' : 'text-slate-300'}`}>
					ANONYMOUS
				</span>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div className="rounded-2xl border-2 bg-slate-50 p-4">
					<label className="mb-2 block text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
						Sheet Color
					</label>
					<div className="flex justify-center gap-3">
						{SHEET_COLORS.map((color) => (
							<button
								key={color.name}
								type="button"
								onClick={() => setSheetColorName(color.name)}
								className={`h-8 w-8 rounded-full border-2 transition-all ${sheetColorName === color.name ? 'scale-125 border-blue-600 shadow-lg' : 'border-white hover:border-slate-200'}`}
								style={{
									backgroundColor:
										color.name === 'White' ? '#ffffff'
											: color.name === 'Blue' ? '#dbeafe'
												: color.name === 'Yellow' ? '#fef9c3'
													: '#fce7f3',
								}}
							/>
						))}
					</div>
				</div>

				<div className="rounded-2xl border-2 bg-slate-50 p-4">
					<label className="mb-2 block text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
						Division
					</label>
					<select
						value={division}
						onChange={(e) => {
							setDivision(e.target.value);
							setGradeFilter('');
							setSearchTerm('');
							setSelectedStudents([]);
						}}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						<option value="">All Divisions</option>
						{['Grade 12', 'Senior High', 'Junior High', 'Elementary', 'Self Contained'].map((d) => (
							<option key={d} value={d}>{d}</option>
						))}
					</select>
				</div>

				<div className="rounded-2xl border-2 bg-slate-50 p-4">
					<label className="mb-2 block text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
						Period
					</label>
					<select
						value={period}
						onChange={(e) => setPeriod(e.target.value)}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						{PERIODS.map((p) => (
							<option key={p} value={p}>{p} Period</option>
						))}
					</select>
				</div>

				<div className="rounded-2xl border-2 bg-slate-50 p-4">
					<label className="mb-2 block text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
						Installment
					</label>
					<select
						value={installment}
						onChange={(e) => setInstallment(e.target.value)}
						className="w-full bg-transparent font-black text-blue-900 outline-none"
					>
						{['1st', '2nd', '3rd', 'Final'].map((i) => (
							<option key={i} value={i}>{i} Installment</option>
						))}
					</select>
				</div>
			</div>

			{!isAnonymous && (
				<div className="space-y-6">
					{division && (
						<div className="flex flex-wrap gap-3 rounded-2xl border-2 bg-slate-50 p-4">
							{classNames
								.filter((cn) => {
									if (!division) return true;
									const divMap: Record<string, string[]> = {
										'Grade 12': ['Grade 12'],
										'Senior High': ['Grade 10', 'Grade 11'],
										'Junior High': ['Grade 7', 'Grade 8', 'Grade 9'],
										Elementary: ['Grade 4', 'Grade 5', 'Grade 6'],
										'Self Contained': ['Grade 1', 'Grade 2', 'Grade 3', 'K-I', 'K-II', 'Nursery', 'Daycare'],
									};
									return (divMap[division] || []).some((a) => cn.startsWith(a));
								})
								.map((cn) => (
									<button
										key={cn}
										type="button"
										onClick={() => {
											setGradeFilter(cn);
											setSearchTerm('');
											setSelectedStudents([]);
										}}
										className={`rounded-xl px-6 py-2 text-sm font-black transition-all ${gradeFilter === cn ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm hover:text-blue-600'}`}
									>
										{cn}
									</button>
								))}
						</div>
					)}

					{gradeFilter && (
						<div className="rounded-2xl border-2 bg-slate-50 p-6 shadow-inner">
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
										onClick={() => setSelectedStudents(filteredStudents.map((s) => `${s.firstName} ${s.lastName}`))}
										className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-blue-700"
									>
										Select All
									</button>
									<button
										type="button"
										onClick={() => setSelectedStudents([])}
										className="rounded-xl bg-slate-800 px-6 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-slate-900"
									>
										Clear
									</button>
								</div>
							</div>

							<div className="grid max-h-48 grid-cols-1 gap-3 overflow-y-auto pr-2 sm:grid-cols-2 md:grid-cols-4">
								{filteredStudents.map((s) => {
									const name = `${s.firstName} ${s.lastName}`;
									return (
										<label
											key={s.studentId}
											className={`flex cursor-pointer items-center rounded-2xl border-2 p-3 transition-all ${selectedStudents.includes(name) ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-transparent bg-white text-slate-500 hover:border-blue-200'}`}
										>
											<input
												type="checkbox"
												className="hidden"
												checked={selectedStudents.includes(name)}
												onChange={() =>
													setSelectedStudents((prev) =>
														prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
													)
												}
											/>
											<span className="truncate text-[10px] font-black uppercase tracking-wide">
												{name}
											</span>
										</label>
									);
								})}
							</div>
						</div>
					)}

					<div>
						<label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
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
				disabled={!isAnonymous && (!gradeFilter || finalStudentList.length === 0)}
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
