'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
import { ArrowLeft, Download, ShieldCheck, X } from 'lucide-react';
import {
	SharedFilter,
	type Student as FilterStudent,
} from '@/app/dashboard/shared/components/SharedFilter';
import { PageLoading } from '@/components/loading';
import { useSchoolStore } from '@/store/schoolStore';
import useAuth from '@/store/useAuth';
import { isStudentRole } from '@/utils/effectiveRole';
import { getClassMetaById } from '@/app/api/chat/utils';
import {
	DEFAULT_DOCUMENT_FILTERS,
	documentFilterConfig,
	resolveDocumentStudents,
	type DocumentFilters,
} from '@/app/dashboard/shared/documentFilters';
import { buildStudentFullName, normalizeStudentId } from '@/app/dashboard/digital-id/verification';

// ── PDF styles ──────────────────────────────────────────────────────────────

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
		marginBottom: 24,
	},
	qrSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 30,
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 6,
		padding: 14,
		backgroundColor: '#f9fafb',
	},
	qrInfo: {
		flex: 1,
		paddingRight: 12,
	},
	qrLabel: {
		fontSize: 11,
		fontWeight: 'bold',
		color: '#1e3a8a',
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	qrHint: {
		fontSize: 9,
		color: '#6b7280',
		marginTop: 4,
		lineHeight: 1.5,
	},
	verifyUrl: {
		fontSize: 7,
		color: '#9ca3af',
		marginTop: 4,
	},
	qrBox: {
		width: 96,
		height: 96,
	},
	qr: {
		width: '100%',
		height: '100%',
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

// ── PDF document ────────────────────────────────────────────────────────────

const AttestationDocument = ({ data, school }: { data: any; school: any }) => {
	const schoolName = school?.identity?.name || 'School';
	const shortName = school?.identity?.shortName || schoolName;
	const schoolMotto = school?.identity?.slogan || '';
	const schoolLogo = school?.branding?.logoUrl || '';
	const schoolAddress =
		school?.contact?.addresses?.[0]?.lines?.join(', ') || '';
	const schoolContact = (school?.contact?.phones || []).join(' / ');

	const pronoun =
		data.gender === 'male'
			? { subject: 'he', possessive: 'his' }
			: data.gender === 'female'
				? { subject: 'she', possessive: 'her' }
				: { subject: 'they', possessive: 'their' };

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{schoolLogo ? <Image src={schoolLogo} style={styles.watermark} /> : null}

				<View style={styles.header}>
					{schoolLogo ? <Image src={schoolLogo} style={styles.logo} /> : null}
					<View style={styles.headerText}>
						<Text style={styles.schoolName}>{schoolName}</Text>
						{schoolAddress ? (
							<Text style={styles.schoolInfo}>{schoolAddress}</Text>
						) : null}
						{schoolContact ? (
							<Text style={styles.schoolInfo}>{schoolContact}</Text>
						) : null}
					</View>
				</View>

				<Text style={styles.title}>Certificate of Attestation</Text>

				<View style={styles.body}>
					<Text>Date: {data.date}</Text>
					<Text style={{ marginTop: 20 }}>
						This is to certify that{' '}
						<Text style={{ fontWeight: 'bold' }}>{data.studentName}</Text>, who
						enrolled in the{' '}
						<Text style={{ fontWeight: 'bold' }}>{data.program}</Text> program
						at this institution during the academic year {data.academicYear},
						has demonstrated satisfactory academic progress and good conduct
						throughout {pronoun.possessive} period of study.
					</Text>
					<Text style={{ marginTop: 15 }}>
						This attestation is issued upon the request of{' '}
						<Text style={{ fontWeight: 'bold' }}>{data.studentName}</Text> for
						any legal or educational purpose {pronoun.subject} may require.
					</Text>
					<Text style={{ marginTop: 15 }}>
						We confirm that the above information is true and correct to the
						best of our knowledge.
					</Text>
				</View>

				<View style={styles.qrSection}>
					<View style={styles.qrInfo}>
						<Text style={styles.qrLabel}>Scan to Verify</Text>
						<Text style={styles.qrHint}>
							Scan this QR code to verify the authenticity of this attestation
							online.
						</Text>
						<Text style={styles.verifyUrl}>{data.verifyUrl}</Text>
					</View>
					<View style={styles.qrBox}>
						{data.qrDataUrl ? (
							<Image src={data.qrDataUrl} style={styles.qr} />
						) : null}
					</View>
				</View>

				<View style={styles.footer}>
					<View style={styles.sigBlock}>
						<Text>Registrar</Text>
					</View>
					<View style={styles.sigBlock}>
						<Text>Principal</Text>
					</View>
				</View>

				{schoolMotto ? <Text style={styles.motto}>{schoolMotto}</Text> : null}

				<Text
					style={{ textAlign: 'center', fontSize: 8, color: '#9ca3af', marginTop: 12 }}
				>
					{shortName} · Official Document · {data.verifyUrl}
				</Text>
			</Page>
		</Document>
	);
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function AttestationPage() {
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const user = useAuth((state) => state.user);
	const isStudent = isStudentRole(user?.role);

	const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_DOCUMENT_FILTERS);
	const [students, setStudents] = useState<any[]>([]);
	const [step, setStep] = useState<'filter' | 'documents'>('filter');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [selectedStudentId, setSelectedStudentId] = useState('');
	const [qrDataUrl, setQrDataUrl] = useState('');
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
		[
			filters.className,
			filters.academicYear,
			filters.selectedStudents,
			isStudent,
			user,
			usersByAcademicYear,
			setUsersForYear,
			school,
		],
	);

	const handleBack = useCallback(() => {
		setStep('filter');
		setError('');
	}, []);

	useEffect(() => {
		if (!students.length) {
			setSelectedStudentId('');
			return;
		}
		setSelectedStudentId((prev) =>
			students.some((s) => s.studentId === prev) ? prev : students[0].studentId,
		);
	}, [students]);

	const selectedStudent = useMemo(
		() => students.find((s) => s.studentId === selectedStudentId) || null,
		[students, selectedStudentId],
	);

	useEffect(() => {
		let cancelled = false;
		setQrDataUrl('');
		if (!selectedStudent) return;
		const studentId = normalizeStudentId(
			selectedStudent.studentId,
			selectedStudent.id,
			selectedStudent._id,
		);
		if (!studentId) return;
		const url = `${window.location.origin}/verify?id=${encodeURIComponent(
			studentId,
		)}&academicYear=${encodeURIComponent(filters.academicYear)}`;
		QRCode.toDataURL(url, {
			errorCorrectionLevel: 'M',
			margin: 1,
			width: 256,
			color: { dark: '#111111', light: '#FFFFFF' },
		})
			.then((dataUrl) => {
				if (!cancelled) setQrDataUrl(dataUrl);
			})
			.catch(() => {
				/* leave QR empty */
			});
		return () => {
			cancelled = true;
		};
	}, [selectedStudent, filters.academicYear]);

	const attestationData = useMemo(() => {
		if (!selectedStudent) return null;
		const studentId = normalizeStudentId(
			selectedStudent.studentId,
			selectedStudent.id,
			selectedStudent._id,
		);
		const classMeta = getClassMetaById(
			school?.academicConfig?.classLevels,
			selectedStudent.className,
		);
		const program = classMeta?.className || selectedStudent.className || '—';
		const verifyUrl = `${window.location.origin}/verify?id=${encodeURIComponent(
			studentId,
		)}&academicYear=${encodeURIComponent(filters.academicYear)}`;
		return {
			studentName:
				selectedStudent.fullName ||
				buildStudentFullName(selectedStudent) ||
				'—',
			gender: selectedStudent.gender || 'neutral',
			program,
			academicYear: filters.academicYear,
			date: new Date().toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			}),
			qrDataUrl,
			verifyUrl,
		};
	}, [selectedStudent, school, filters.academicYear, qrDataUrl]);

	const handleDownload = useCallback(async () => {
		if (!attestationData) return;
		setDownloading(true);
		try {
			const blob = await pdf(
				<AttestationDocument data={attestationData} school={school} />,
			).toBlob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `Attestation_${attestationData.studentName.replace(/\s+/g, '_')}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error('Attestation PDF generation failed:', e);
			alert('Could not generate the attestation PDF. Please try again.');
		} finally {
			setDownloading(false);
		}
	}, [attestationData, school]);

	if (step === 'filter') {
		return (
			<div className="p-4">
				{error && (
					<div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						<span>{error}</span>
						<button
							type="button"
							onClick={() => setError('')}
							className="text-destructive/70 hover:text-destructive"
							aria-label="Dismiss error"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				)}
				{loading ? (
					<PageLoading
						fullScreen={false}
						variant="minimal"
						size="sm"
						message="Loading students…"
					/>
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
			{/* Toolbar */}
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
					<h1 className="mt-1 text-xl font-semibold text-foreground">
						Attestation Certificates
					</h1>
					<p className="text-sm text-muted-foreground">
						{students.length} certificate{students.length === 1 ? '' : 's'} ·{' '}
						{filters.academicYear}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-5 lg:flex-row">
				{/* Student list */}
				<div className="w-full flex-shrink-0 lg:w-72">
					<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Students
					</p>
					<div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
						{students.map((student, index) => {
							const isActive = student.studentId === selectedStudentId;
							return (
								<button
									type="button"
									key={student?.studentId || student?.id || student?._id || index}
									onClick={() => setSelectedStudentId(student.studentId)}
									className={`flex min-w-0 flex-shrink-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors lg:w-full ${
										isActive
											? 'border-primary/40 bg-primary/10 text-primary'
											: 'border-border bg-card text-foreground hover:bg-muted'
									}`}
								>
									<span className="min-w-0">
										<span className="block truncate text-sm font-medium">
											{student.fullName || '—'}
										</span>
										<span className="block truncate font-mono text-[11px] text-muted-foreground">
											{student.studentId}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* Preview */}
				<div className="min-w-0 flex-1">
					<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-foreground">
									{attestationData?.studentName || '—'}
								</p>
								<p className="text-xs text-muted-foreground">
									Certificate preview · {filters.academicYear}
								</p>
							</div>
							<button
								type="button"
								onClick={handleDownload}
								disabled={downloading || !attestationData?.qrDataUrl}
								className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
							>
								<Download className="h-4 w-4" />
								{downloading ? 'Preparing…' : 'Download PDF'}
							</button>
						</div>

						{attestationData ? (
							<Suspense
								fallback={
									<div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
										Loading certificate preview…
									</div>
								}
							>
								<PDFViewer width="100%" height="700">
									<AttestationDocument
										data={attestationData}
										school={school}
									/>
								</PDFViewer>
							</Suspense>
						) : (
							<div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
								Select a student to preview their attestation.
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Verification note */}
			<div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
				<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
				<p className="text-xs leading-relaxed text-muted-foreground">
					Each certificate carries a QR code linking to the school&apos;s online
					verification page. Recipients can scan it to confirm the student and
					academic year directly.
				</p>
			</div>
		</div>
	);
}
