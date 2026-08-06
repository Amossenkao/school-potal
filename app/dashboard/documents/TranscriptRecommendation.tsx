'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
	PDFViewer,
	pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { ArrowLeft, Download, FileText, Loader2, ShieldCheck, X } from 'lucide-react';
import {
	SharedFilter,
	type Student as FilterStudent,
} from '@/app/dashboard/shared/components/SharedFilter';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { isStudentRole } from '@/utils/effectiveRole';
import {
	DEFAULT_DOCUMENT_FILTERS,
	documentFilterConfig,
	resolveDocumentStudents,
	type DocumentFilters,
} from '@/app/dashboard/shared/documentFilters';
import { buildStudentFullName, normalizeStudentId } from '@/app/dashboard/digital-id/verification';
import { resolveSignatory, type Signatory } from '@/utils/documentSignatory';

/**
 * A student's real, multi-year grade history, wired to `Grade`/`Student` via
 * `/api/documents/transcript` — no random or manually-typed grades. Both the
 * transcript and recommendation pages of a student's packet carry the exact
 * same QR (deterministic from studentId + latest year, per the verification
 * design), so scanning either one verifies the same underlying record.
 */

interface TranscriptYear {
	year: string;
	className: string;
	subjects: { name: string; grade: number }[];
	yearlyAverage: number;
	rank: number;
	classStudentCount: number;
}

interface TranscriptRecord {
	studentId: string;
	studentName: string;
	years: TranscriptYear[];
	overallAverage: number;
}

interface PacketData {
	studentId: string;
	studentName: string;
	gender: string;
	dateOfBirth: string;
	date: string;
	years: TranscriptYear[];
	overallAverage: number;
	verifyUrl: string;
	qrDataUrl: string | null;
	registrar: Signatory;
	principal: Signatory;
}

// ── PDF styles — shared visual language with Attestation.tsx ───────────────

const styles = StyleSheet.create({
	page: { padding: 42, fontFamily: 'Helvetica', fontSize: 10 },
	watermark: {
		position: 'absolute',
		top: '25%',
		left: '25%',
		width: '50%',
		opacity: 0.06,
		zIndex: -1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
		borderBottomWidth: 2,
		borderBottomColor: '#1e3a8a',
		paddingBottom: 12,
	},
	logo: { width: 52, height: 52, marginRight: 14 },
	headerText: { textAlign: 'center' },
	schoolName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#1e3a8a',
		textTransform: 'uppercase',
	},
	schoolInfo: { fontSize: 8.5, color: '#4b5563', marginTop: 2 },
	title: {
		fontSize: 14,
		fontWeight: 'bold',
		textAlign: 'center',
		textTransform: 'uppercase',
		color: '#1e3a8a',
		marginBottom: 16,
	},
	studentRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 14,
		fontSize: 9.5,
	},
	studentField: { fontWeight: 'bold' },
	table: {
		width: '100%',
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#1e3a8a',
		borderRadius: 3,
		overflow: 'hidden',
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#1e3a8a',
	},
	tableHeaderCell: {
		padding: 5,
		flex: 2,
		fontSize: 9,
		color: '#ffffff',
		fontWeight: 'bold',
	},
	tableHeaderMeta: {
		padding: 5,
		flex: 1,
		fontSize: 8.5,
		color: '#ffffff',
		textAlign: 'right',
	},
	subHeader: { flexDirection: 'row', backgroundColor: '#eef2ff' },
	cell: { padding: 4, borderRightWidth: 0.5, borderRightColor: '#d1d5db', flex: 1, fontSize: 8.5 },
	cellNarrow: {
		padding: 4,
		borderRightWidth: 0.5,
		borderRightColor: '#d1d5db',
		width: 42,
		fontSize: 8.5,
		textAlign: 'center',
	},
	row: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: '#e5e7eb' },
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
		fontSize: 9.5,
		fontWeight: 'bold',
		color: '#1e3a8a',
	},
	qrSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 14,
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 6,
		padding: 12,
		backgroundColor: '#f9fafb',
	},
	qrInfo: { flex: 1, paddingRight: 12 },
	qrLabel: { fontSize: 10, fontWeight: 'bold', color: '#1e3a8a', letterSpacing: 1, textTransform: 'uppercase' },
	qrHint: { fontSize: 8.5, color: '#6b7280', marginTop: 3, lineHeight: 1.4 },
	verifyUrl: { fontSize: 6.5, color: '#9ca3af', marginTop: 3 },
	qrBox: { width: 70, height: 70 },
	qr: { width: '100%', height: '100%' },
	footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
	sigBlock: {
		width: '42%',
		borderTopWidth: 1,
		borderTopColor: '#1e3a8a',
		paddingTop: 5,
		textAlign: 'center',
		fontSize: 9,
		fontWeight: 'bold',
		color: '#1e3a8a',
	},
	sigTitle: { fontSize: 7.5, fontWeight: 'normal', color: '#4b5563', marginTop: 1 },
	invalidNote: {
		fontSize: 7.5,
		fontStyle: 'italic',
		marginTop: 10,
		textAlign: 'center',
		color: '#b91c1c',
	},
	recPage: {
		padding: 50,
		fontFamily: 'Helvetica',
		fontSize: 11,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'space-between',
	},
	recBody: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
	recParagraph: { lineHeight: 1.7, textAlign: 'justify', marginBottom: 14 },
});

function DocumentFooter({ registrar, principal, schoolName }: { registrar: Signatory; principal: Signatory; schoolName: string }) {
	return (
		<View>
			<View style={styles.footer}>
				<View style={styles.sigBlock}>
					<Text>{registrar.resolved ? registrar.name : ' '}</Text>
					<Text style={styles.sigTitle}>{registrar.title}</Text>
				</View>
				<View style={styles.sigBlock}>
					<Text>{principal.resolved ? principal.name : ' '}</Text>
					<Text style={styles.sigTitle}>{principal.title}</Text>
				</View>
			</View>
			<Text style={styles.invalidNote}>
				Any correction and/or erasure on this document renders it invalid.
			</Text>
		</View>
	);
}

const TranscriptYearTable = ({ year }: { year: TranscriptYear }) => {
	const rows = Math.ceil(year.subjects.length / 2);
	return (
		<View style={styles.table}>
			<View style={styles.tableHeader}>
				<Text style={styles.tableHeaderCell}>
					{year.className} ({year.year})
				</Text>
				<Text style={styles.tableHeaderMeta}>Average: {year.yearlyAverage.toFixed(1)}</Text>
				<Text style={styles.tableHeaderMeta}>
					Rank: {year.rank || '—'}
					{year.classStudentCount ? ` of ${year.classStudentCount}` : ''}
				</Text>
			</View>
			<View style={styles.subHeader}>
				<Text style={styles.cell}>Subject</Text>
				<Text style={styles.cellNarrow}>Grade</Text>
				<Text style={styles.cell}>Subject</Text>
				<Text style={styles.cellNarrow}>Grade</Text>
			</View>
			{Array.from({ length: rows }).map((_, i) => {
				const left = year.subjects[i * 2];
				const right = year.subjects[i * 2 + 1];
				return (
					<View key={i} style={styles.row}>
						<Text style={styles.cell}>{left?.name || ''}</Text>
						<Text style={[styles.cellNarrow, { color: left && left.grade >= 70 ? '#1d4ed8' : '#b91c1c' }]}>
							{left ? left.grade.toFixed(0) : ''}
						</Text>
						<Text style={styles.cell}>{right?.name || ''}</Text>
						<Text style={[styles.cellNarrow, { color: right && right.grade >= 70 ? '#1d4ed8' : '#b91c1c' }]}>
							{right ? right.grade.toFixed(0) : ''}
						</Text>
					</View>
				);
			})}
		</View>
	);
};

const PacketDocument = ({ data, school }: { data: PacketData; school: any }) => {
	const schoolName = school?.identity?.name || 'School';
	const schoolLogo = school?.branding?.logoUrl || '';
	const schoolAddress = school?.contact?.addresses?.[0]?.lines?.join(', ') || '';
	const schoolContact = (school?.contact?.phones || []).join(' / ');

	const pronoun =
		data.gender === 'male'
			? { subject: 'he', possessive: 'his', object: 'him' }
			: data.gender === 'female'
				? { subject: 'she', possessive: 'her', object: 'her' }
				: { subject: 'they', possessive: 'their', object: 'them' };

	const firstYear = data.years[0]?.year || '';
	const lastYear = data.years[data.years.length - 1]?.year || '';
	const firstName = data.studentName.split(' ')[0] || data.studentName;

	return (
		<Document>
			{/* ── Page 1: Transcript ────────────────────────────────────────── */}
			<Page size="A4" style={styles.page}>
				{schoolLogo ? <Image src={schoolLogo} style={styles.watermark} /> : null}
				<View style={styles.header}>
					{schoolLogo ? <Image src={schoolLogo} style={styles.logo} /> : null}
					<View style={styles.headerText}>
						<Text style={styles.schoolName}>{schoolName}</Text>
						{schoolAddress ? <Text style={styles.schoolInfo}>{schoolAddress}</Text> : null}
						{schoolContact ? <Text style={styles.schoolInfo}>{schoolContact}</Text> : null}
					</View>
				</View>

				<Text style={styles.title}>Official Academic Transcript</Text>

				<View style={styles.studentRow}>
					<View>
						<Text style={styles.studentField}>Name: {data.studentName}</Text>
						{data.dateOfBirth ? (
							<Text style={styles.studentField}>Date of Birth: {data.dateOfBirth}</Text>
						) : null}
					</View>
					<View style={{ alignItems: 'flex-end' }}>
						<Text style={styles.studentField}>Date Issued: {data.date}</Text>
						<Text style={styles.studentField}>
							Years Covered: {firstYear}
							{lastYear && lastYear !== firstYear ? ` – ${lastYear}` : ''}
						</Text>
					</View>
				</View>

				{data.years.map((year) => (
					<TranscriptYearTable key={year.year} year={year} />
				))}

				<View style={styles.summaryRow}>
					<Text>Overall Average: {data.overallAverage.toFixed(1)}</Text>
				</View>

				<View style={styles.qrSection}>
					<View style={styles.qrInfo}>
						<Text style={styles.qrLabel}>Scan to Verify</Text>
						<Text style={styles.qrHint}>
							Scan to independently confirm this transcript against the school&apos;s
							live grade records.
						</Text>
						<Text style={styles.verifyUrl}>{data.verifyUrl}</Text>
					</View>
					<View style={styles.qrBox}>
						{data.qrDataUrl ? <Image src={data.qrDataUrl} style={styles.qr} /> : null}
					</View>
				</View>

				<DocumentFooter registrar={data.registrar} principal={data.principal} schoolName={schoolName} />
			</Page>

			{/* ── Page 2: Recommendation ───────────────────────────────────── */}
			<Page size="A4" style={styles.recPage}>
				{schoolLogo ? <Image src={schoolLogo} style={{ ...styles.watermark, top: '35%' }} /> : null}
				<View>
					<View style={styles.header}>
						{schoolLogo ? <Image src={schoolLogo} style={styles.logo} /> : null}
						<View style={styles.headerText}>
							<Text style={styles.schoolName}>{schoolName}</Text>
							{schoolAddress ? <Text style={styles.schoolInfo}>{schoolAddress}</Text> : null}
						</View>
					</View>
					<Text style={{ marginBottom: 6, fontSize: 12 }}>{data.date}</Text>
					<Text style={{ marginBottom: 16, fontSize: 12, fontWeight: 'bold' }}>Dear Sir/Madam:</Text>
				</View>

				<View style={styles.recBody}>
					<Text style={styles.recParagraph}>
						This document attests that <Text style={{ fontWeight: 'bold' }}>{data.studentName}</Text> is
						a graduate of {schoolName}, having completed{' '}
						{data.years.length > 1 ? `${data.years.length} years of study` : 'the required course of study'}
						{firstYear ? ` from ${firstYear}${lastYear && lastYear !== firstYear ? ` to ${lastYear}` : ''}` : ''}, with an overall
						average of {data.overallAverage.toFixed(1)}.
					</Text>
					<Text style={styles.recParagraph}>
						Throughout {pronoun.possessive} time at our school, {firstName} has demonstrated
						commendable character and conduct — respectful, disciplined, and consistently
						engaged with {pronoun.possessive} studies.
					</Text>
					<Text style={styles.recParagraph}>
						In view of {pronoun.possessive} academic record and conduct, {schoolName} confidently
						and highly recommends <Text style={{ fontWeight: 'bold' }}>{data.studentName}</Text> to any
						institution {pronoun.subject} wishes to attend.
					</Text>
					<Text style={styles.recParagraph}>
						We are confident that {pronoun.subject} will represent our school well and prove{' '}
						{pronoun.object === 'them' ? 'themselves' : pronoun.object === 'him' ? 'himself' : 'herself'} a
						responsible and capable member of any academic community.
					</Text>
					<Text style={{ marginTop: 20, fontSize: 12 }}>Best Regards,</Text>
					<Text style={{ fontSize: 12 }}>Yours in Education,</Text>
				</View>

				<View style={styles.qrSection}>
					<View style={styles.qrInfo}>
						<Text style={styles.qrLabel}>Scan to Verify</Text>
						<Text style={styles.qrHint}>
							Carries the same verification as the attached transcript.
						</Text>
						<Text style={styles.verifyUrl}>{data.verifyUrl}</Text>
					</View>
					<View style={styles.qrBox}>
						{data.qrDataUrl ? <Image src={data.qrDataUrl} style={styles.qr} /> : null}
					</View>
				</View>

				<DocumentFooter registrar={data.registrar} principal={data.principal} schoolName={schoolName} />
			</Page>
		</Document>
	);
};

// ── Page ─────────────────────────────────────────────────────────────────

export default function TranscriptRecommendationPage() {
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore((state) => state.usersByAcademicYear);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const user = useAuth((state) => state.user);
	const isStudent = isStudentRole(user?.role);

	const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_DOCUMENT_FILTERS);
	const [students, setStudents] = useState<any[]>([]);
	const [step, setStep] = useState<'filter' | 'documents'>('filter');
	const [loading, setLoading] = useState(false);
	const [preparing, setPreparing] = useState(false);
	const [error, setError] = useState('');
	const [selectedStudentId, setSelectedStudentId] = useState('');
	const [packetByStudent, setPacketByStudent] = useState<Record<string, PacketData>>({});
	const [downloading, setDownloading] = useState(false);

	const handleFilterSubmit = useCallback(
		async (_activeStudents?: FilterStudent[]) => {
			if (!filters.className) return;
			setLoading(true);
			setError('');
			try {
				const records = await resolveDocumentStudents({
					filters,
					isStudent,
					user,
					school,
					usersByAcademicYear,
					setUsersForYear,
				});
				if (records.length === 0) {
					setError('No students found for the selected class.');
					return;
				}
				setStudents(records);
				setStep('documents');
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Failed to load students.');
			} finally {
				setLoading(false);
			}
		},
		[filters, isStudent, user, usersByAcademicYear, setUsersForYear, school],
	);

	const handleBack = useCallback(() => {
		setStep('filter');
		setError('');
		setPacketByStudent({});
	}, []);

	/**
	 * Pulls each student's real multi-year grade history from
	 * `/api/documents/transcript` — the same endpoint `/verify` calls later —
	 * and builds one QR shared by both the transcript and recommendation
	 * pages, since it's derived purely from studentId + latest year.
	 */
	useEffect(() => {
		if (step !== 'documents' || students.length === 0) return;
		let cancelled = false;

		const run = async () => {
			setPreparing(true);
			setError('');
			try {
				const registrar = resolveSignatory(school, usersByAcademicYear, filters.academicYear, 'registrar');
				const principal = resolveSignatory(school, usersByAcademicYear, filters.academicYear, 'principal');
				const built: Record<string, PacketData> = {};

				await Promise.all(
					students.map(async (student) => {
						const studentId = normalizeStudentId(student.studentId, student.id, student._id);
						if (!studentId) return;
						const res = await fetch(`/api/documents/transcript?id=${encodeURIComponent(studentId)}`);
						const json = await res.json();
						if (!json?.success || !json.data?.valid) return;
						const record: TranscriptRecord = json.data;
						if (!record.years || record.years.length === 0) return;

						const latestYear = record.years[record.years.length - 1].year;
						const verifyUrl = `${window.location.origin}/verify?id=${encodeURIComponent(
							studentId,
						)}&academicYear=${encodeURIComponent(latestYear)}&type=transcript`;
						const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
							errorCorrectionLevel: 'M',
							margin: 1,
							width: 256,
							color: { dark: '#111111', light: '#FFFFFF' },
						}).catch(() => null);

						built[studentId] = {
							studentId,
							studentName: record.studentName || buildStudentFullName(student) || '—',
							gender: student.gender || 'neutral',
							dateOfBirth: student.dateOfBirth || '',
							date: new Date().toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							}),
							years: record.years,
							overallAverage: record.overallAverage,
							verifyUrl,
							qrDataUrl,
							registrar,
							principal,
						};
					}),
				);

				if (cancelled) return;
				setPacketByStudent(built);
				setSelectedStudentId((prev) => {
					const ids = Object.keys(built);
					return ids.includes(prev) ? prev : ids[0] || '';
				});
				if (Object.keys(built).length === 0) {
					setError(
						'No finalized grades were found for any selected student in this level. Approve grades first, then try again.',
					);
				}
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load grade records.');
			} finally {
				if (!cancelled) setPreparing(false);
			}
		};

		run();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step, students]);

	const selectedData = selectedStudentId ? packetByStudent[selectedStudentId] : null;
	const studentIds = Object.keys(packetByStudent);

	const handleDownload = useCallback(async () => {
		if (!selectedData) return;
		setDownloading(true);
		try {
			const blob = await pdf(<PacketDocument data={selectedData} school={school} />).toBlob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `Transcript_${selectedData.studentName.replace(/\s+/g, '_')}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error('Transcript PDF generation failed:', e);
			alert('Could not generate the transcript. Please try again.');
		} finally {
			setDownloading(false);
		}
	}, [selectedData, school]);

	if (step === 'filter') {
		return (
			<div className="p-4">
				{error && (
					<div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						<span>{error}</span>
						<button type="button" onClick={() => setError('')} aria-label="Dismiss error">
							<X className="h-4 w-4" />
						</button>
					</div>
				)}
				{loading ? (
					<PageLoading fullScreen={false} variant="minimal" size="sm" message="Loading students…" />
				) : (
					<SharedFilter<DocumentFilters>
						filters={filters}
						setFilters={setFilters}
						onSubmit={handleFilterSubmit}
						config={documentFilterConfig}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="p-4">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div>
					<button
						type="button"
						onClick={handleBack}
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to filters
					</button>
					<h1 className="mt-1 text-xl font-semibold text-foreground">Transcript &amp; Recommendation</h1>
					<p className="text-sm text-muted-foreground">
						{studentIds.length} of {students.length} student{students.length === 1 ? '' : 's'} have
						finalized grades · {filters.academicYear}
					</p>
				</div>
			</div>

			{error && (
				<div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					<span>{error}</span>
					<button type="button" onClick={() => setError('')} aria-label="Dismiss error">
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{preparing ? (
				<PageLoading fullScreen={false} variant="minimal" size="sm" message="Loading grade records…" />
			) : studentIds.length === 0 ? (
				<div className="flex h-[400px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
					<FileText className="h-8 w-8 text-muted-foreground/50" />
					No finalized grades found for these students yet.
				</div>
			) : (
				<div className="flex flex-col gap-5 lg:flex-row">
					<div className="w-full flex-shrink-0 lg:w-72">
						<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							Students
						</p>
						<div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
							{studentIds.map((id) => {
								const doc = packetByStudent[id];
								const isActive = id === selectedStudentId;
								return (
									<button
										type="button"
										key={id}
										onClick={() => setSelectedStudentId(id)}
										className={`flex min-w-0 flex-shrink-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full ${
											isActive
												? 'border-primary/40 bg-primary/10 text-primary'
												: 'border-border bg-card text-foreground hover:bg-muted'
										}`}
									>
										<span className="min-w-0">
											<span className="block truncate text-sm font-medium">{doc.studentName}</span>
											<span className="block truncate font-mono text-[11px] text-muted-foreground">{id}</span>
										</span>
										<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
											{doc.overallAverage.toFixed(0)}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="min-w-0 flex-1">
						<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
								<div className="min-w-0">
									<p className="truncate text-sm font-semibold text-foreground">
										{selectedData?.studentName || '—'}
									</p>
									<p className="text-xs text-muted-foreground">
										Transcript + recommendation preview · {selectedData?.years.length || 0} year
										{selectedData?.years.length === 1 ? '' : 's'}
									</p>
								</div>
								<button
									type="button"
									onClick={handleDownload}
									disabled={downloading || !selectedData}
									className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
								>
									<Download className="h-4 w-4" />
									{downloading ? 'Preparing…' : 'Download PDF'}
								</button>
							</div>

							{selectedData ? (
								<Suspense
									fallback={
										<div className="flex h-[700px] items-center justify-center text-sm text-muted-foreground">
											Loading preview…
										</div>
									}
								>
									<PDFViewer width="100%" height="700">
										<PacketDocument data={selectedData} school={school} />
									</PDFViewer>
								</Suspense>
							) : (
								<div className="flex h-[700px] items-center justify-center text-sm text-muted-foreground">
									Select a student to preview their packet.
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			<div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
				<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
				<p className="text-xs leading-relaxed text-muted-foreground">
					Grades, averages, and ranks are computed live from the school&apos;s approved
					grade records — never randomized or hand-typed. The transcript and
					recommendation share one QR code, since both concern the same student
					record.
				</p>
			</div>
		</div>
	);
}
