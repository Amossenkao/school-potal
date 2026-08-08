'use client';

import React, {
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
	PDFViewer,
	pdf,
	Font,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { ArrowLeft, Download, ShieldCheck, X } from 'lucide-react';
import {
	SharedFilter,
	type Student as FilterStudent,
	type FilterConfig,
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
import { buildStudentFullName } from '@/app/dashboard/digital-id/verification';
import { resolveSignatory } from '@/utils/documentSignatory';
import { flattenSchoolAddressLines } from '@/utils/schoolAddresses';

// ── Fonts ────────────────────────────────────────────────────────────────────

Font.register({
	family: 'Great Vibes',
	src: '/fonts/GreatVibes-Regular.ttf',
});

// ── Design tokens ─────────────────────────────────────────────────────────────
// Clean white canvas — navy ink, gold geometry as the only accent.

const T = {
	navy: '#0F2357', // primary institution colour
	gold: '#C9A84C', // accent rules & ornament
	goldMid: '#D4B96A', // slightly lighter gold for the signature font
	bodyText: '#1A1A2E',
	black: '#000000', // ink colour reserved for the signature block
	slate: '#6B7280',
	slateLight: '#9CA3AF',
	ruleMid: '#D1D5DB',
	ruleLight: '#E5E7EB',
	white: '#FFFFFF',
};

// ── PDF styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	page: {
		paddingTop: 0,
		paddingBottom: 0,
		paddingHorizontal: 0,
		fontFamily: 'Helvetica',
		fontSize: 11,
		backgroundColor: T.white,
	},

	// ── Watermark ─────────────────────────────────────────────────────────────
	watermark: {
		position: 'absolute',
		top: '22%',
		left: '20%',
		width: '60%',
		opacity: 0.04,
		zIndex: -1,
	},

	// ── Letterhead ────────────────────────────────────────────────────────────
	// White background. The creativity comes from rule geometry:
	//   • a thick navy bar across the very top (3 px)
	//   • a gold bar directly beneath it (2 px)
	//   • logo · divider · name/address/slogan · divider · logo, grouped as one
	//     tight, centred lockup rather than spread to the page edges
	//   • a gold flourish (line–diamond–line) closing the header, seated above
	//     a final navy bar
	headerBand: {
		backgroundColor: T.white,
		paddingBottom: 0,
		paddingHorizontal: 0,
	},
	// Stacked accent bars — the institutional "stripe" at top of page.
	headerTopStripe: {
		flexDirection: 'column',
	},
	headerStripeNavy: {
		height: 5,
		backgroundColor: T.navy,
	},
	headerStripeGold: {
		height: 2,
		backgroundColor: T.gold,
	},

	// Inner row: logo · divider · text block · divider · logo — centred as one
	// compact group so the logos sit close to the name instead of pinned to
	// the far page margins.
	headerInner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 28,
		paddingTop: 16,
		paddingBottom: 14,
	},
	headerLogo: {
		width: 56,
		height: 56,
	},
	headerLogoPlaceholder: {
		width: 56,
		height: 56,
	},
	// Slim gold rule between each logo and the name/address block.
	headerDivider: {
		width: 1.5,
		height: 44,
		backgroundColor: T.gold,
		marginHorizontal: 14,
	},
	headerTextBlock: {
		alignItems: 'center',
		paddingHorizontal: 6,
		maxWidth: 300,
		flexShrink: 1,
	},
	headerSchoolName: {
		fontSize: 18,
		fontFamily: 'Helvetica-Bold',
		color: T.navy,
		textAlign: 'center',
		textTransform: 'uppercase',
		// No letterSpacing — extra spacing pushes long names to wrap
		marginBottom: 5,
	},
	headerAddress: {
		fontSize: 9,
		color: T.bodyText,
		textAlign: 'center',
		lineHeight: 1.55,
	},
	// Creative touch: the school's own slogan, set in a quiet gold italic.
	headerSlogan: {
		fontSize: 8,
		fontFamily: 'Helvetica-Oblique',
		color: T.gold,
		textAlign: 'center',
		marginTop: 5,
		letterSpacing: 0.5,
	},

	// Closing flourish — a short gold line, a rotated diamond, a short gold
	// line, then a full-width navy bar for institutional weight.
	headerBottomRules: {
		flexDirection: 'column',
		marginTop: 11,
	},
	headerOrnamentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 140,
	},
	headerOrnamentLine: {
		flex: 1,
		height: 1,
		backgroundColor: T.gold,
	},
	headerOrnamentDiamond: {
		width: 5,
		height: 5,
		marginHorizontal: 7,
		backgroundColor: T.gold,
		transform: 'rotate(45deg)',
	},
	headerCloseNavy: {
		height: 3,
		backgroundColor: T.navy,
		marginTop: 7,
	},

	// ── Body content ──────────────────────────────────────────────────────────
	bodyContent: {
		paddingHorizontal: 44,
		paddingTop: 20,
		paddingBottom: 140, // clear the fixed footer, which now sits above the page edge
	},
	dateLine: {
		fontSize: 11,
		color: T.bodyText,
		marginBottom: 14,
	},
	title: {
		fontSize: 15,
		fontFamily: 'Helvetica-Bold',
		textAlign: 'center',
		textTransform: 'uppercase',
		color: T.navy,
		letterSpacing: 1,
		marginBottom: 16,
	},
	toWhom: {
		fontSize: 11,
		fontFamily: 'Helvetica-Bold',
		textAlign: 'center',
		textTransform: 'uppercase',
		color: T.slate,
		letterSpacing: 0.6,
		marginBottom: 16,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: T.ruleLight,
	},
	paragraph: {
		lineHeight: 1.7,
		textAlign: 'justify',
		fontSize: 11,
		color: T.bodyText,
		marginBottom: 18,
	},
	closing: {
		fontSize: 11,
		color: T.bodyText,
		marginBottom: 2,
	},

	// ── Footer ────────────────────────────────────────────────────────────────
	// White background — framed only by rule geometry at the top.
	// Signature (left) and QR (right) are vertically centred on the same row.
	// Raised off the physical page edge (bottom: 24, not 0) so it reads as a
	// proper document footer with breathing room beneath it.
	footerStrip: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 24,
		backgroundColor: T.white,
	},
	// Mirror of the header closing rules, inverted order.
	footerTopRules: {
		flexDirection: 'column',
	},
	footerRuleNavy: {
		height: 3,
		backgroundColor: T.navy,
	},
	footerRuleGold: {
		height: 1.5,
		backgroundColor: T.gold,
	},
	footerInner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 28,
		paddingTop: 6,
		paddingBottom: 8,
	},

	// Signature block — left side.
	// Fixed width (not flex: 1) — a flex-growing container here would let the
	// signature line's default stretch fill every pixel up to the QR block.
	signatureBlock: {
		width: 200,
		justifyContent: 'center',
	},
	signedLabel: {
		fontSize: 8.5,
		color: T.black,
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 3,
	},
	signatureLine: {
		borderBottomWidth: 1,
		borderBottomColor: T.black,
		paddingBottom: 3,
		marginBottom: 4,
	},
	signatureText: {
		fontSize: 11,
		fontFamily: 'Helvetica-Bold',
		color: T.black,
	},
	signatureFontStyle: {
		fontFamily: 'Great Vibes',
		fontSize: 19,
		color: T.black,
		letterSpacing: 0.5,
	},
	// "Principal, School Name" — centred under the signature line
	signatureTitleText: {
		fontSize: 8.5,
		color: T.black,
		textAlign: 'center',
		marginTop: 2,
	},

	// QR block — right side
	qrBlock: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	qrBox: {
		borderWidth: 1,
		borderColor: T.ruleMid,
		borderStyle: 'dashed',
		borderRadius: 3,
		padding: 3,
		backgroundColor: T.white,
	},
	qrImage: {
		width: 68,
		height: 68,
	},
	qrLabel: {
		fontSize: 7.5,
		color: T.bodyText,
		marginTop: 3,
		textAlign: 'center',
	},
});

// ── PDF document ──────────────────────────────────────────────────────────────

const AttestationDocument = ({
	data,
	school,
}: {
	data: any[];
	school: any;
}) => {
	const schoolName = school?.identity?.name || 'School';
	const logoUrl = school?.branding?.logoUrl || '';
	const logoUrl2 = school?.branding?.logoUrl2 || '';
	const addressLines = flattenSchoolAddressLines(school?.contact?.addresses);
	const addressString = addressLines.join('\n');
	const slogan = school?.identity?.slogan || '';
	const leftLogo = logoUrl2 || logoUrl;
	const rightLogo = logoUrl;

	return (
		<Document>
			{data.map((item, index) => (
				<Page key={item.id || index} size="A4" style={styles.page}>
					{/* ── Watermark ─────────────────────────────────────────── */}
					{logoUrl ? <Image src={logoUrl} style={styles.watermark} /> : null}

					{/* ── Letterhead ─────────────────────────────────────────── */}
					<View style={styles.headerBand} fixed>
						{/* Opening stripe: navy bar → gold bar */}
						<View style={styles.headerTopStripe}>
							<View style={styles.headerStripeNavy} />
							<View style={styles.headerStripeGold} />
						</View>

						{/* Logo · divider · name + address + slogan · divider · logo —
						    grouped tightly and centred as one lockup */}
						<View style={styles.headerInner}>
							{leftLogo ? (
								<Image src={leftLogo} style={styles.headerLogo} />
							) : (
								<View style={styles.headerLogoPlaceholder} />
							)}
							{leftLogo ? <View style={styles.headerDivider} /> : null}

							<View style={styles.headerTextBlock}>
								<Text style={styles.headerSchoolName}>{schoolName}</Text>
								{addressString ? (
									<Text style={styles.headerAddress}>{addressString}</Text>
								) : null}
								{slogan ? (
									<Text style={styles.headerSlogan}>&ldquo;{slogan}&rdquo;</Text>
								) : null}
							</View>

							{rightLogo ? <View style={styles.headerDivider} /> : null}
							{rightLogo ? (
								<Image src={rightLogo} style={styles.headerLogo} />
							) : (
								<View style={styles.headerLogoPlaceholder} />
							)}
						</View>

						{/* Closing flourish: gold line – diamond – gold line, then navy bar */}
						<View style={styles.headerBottomRules}>
							<View style={styles.headerOrnamentRow}>
								<View style={styles.headerOrnamentLine} />
								<View style={styles.headerOrnamentDiamond} />
								<View style={styles.headerOrnamentLine} />
							</View>
							<View style={styles.headerCloseNavy} />
						</View>
					</View>

					{/* ── Body ──────────────────────────────────────────────── */}
					<View style={styles.bodyContent}>
						<Text style={styles.dateLine}>{item.date}</Text>

						<Text style={styles.title}>Letter of Attestation</Text>
						<Text style={styles.toWhom}>To Whom It May Concern</Text>

						<Text style={styles.paragraph}>
							This letter serves as an official attestation that{' '}
							<Text style={{ fontFamily: 'Helvetica-Bold' }}>
								{item.studentName}
							</Text>{' '}
							was a duly enrolled student of the {schoolName} and has
							successfully completed all the academic and graduation
							requirements prescribed by both the Ministry of Education and the{' '}
							{schoolName} for the successful completion of {item.program}.
						</Text>

						<Text style={styles.paragraph}>
							Having satisfactorily fulfilled all required coursework, academic
							obligations, and institutional requirements,{' '}
							<Text style={{ fontFamily: 'Helvetica-Bold' }}>
								{item.studentName}
							</Text>{' '}
							has qualified for graduation from our institution for the{' '}
							{item.academicYear} academic year.
						</Text>

						<Text style={styles.paragraph}>
							At the time of issuing this letter however, the student&apos;s
							official academic transcript and High School Diploma are still
							undergoing the school&apos;s standard processing procedures and
							have therefore not yet been issued.
						</Text>

						<Text style={styles.paragraph}>
							This letter is therefore issued at the student&apos;s request as
							temporary official confirmation of the successful completion of
							all graduation requirements pending the release of the
							aforementioned documents.
						</Text>

						<Text style={styles.paragraph}>
							Should you require any additional information or verification
							regarding this attestation, please do not hesitate to contact the
							administration of {schoolName} on the contact details provided
							above.
						</Text>

						<Text style={styles.closing}>
							We appreciate your kind consideration.
						</Text>
						<Text style={styles.closing}>Respectfully,</Text>
					</View>

					{/* ── Footer — signature LEFT · motto CENTRE · QR RIGHT ──── */}
					<View style={styles.footerStrip} fixed>
						{/* Opening rules: navy bar → gold thin */}
						<View style={styles.footerTopRules}>
							<View style={styles.footerRuleNavy} />
							<View style={styles.footerRuleGold} />
						</View>

						<View style={styles.footerInner}>
							{/* Signature block */}
							<View style={styles.signatureBlock}>
								<Text style={styles.signedLabel}>Signed</Text>
								{/* The signature name sits above the rule line */}
								<View style={styles.signatureLine}>
									{item.principalName ? (
										<Text
											style={
												item.principalSignature
													? styles.signatureFontStyle
													: styles.signatureText
											}
										>
											{item.principalSignature || item.principalName}
										</Text>
									) : null}
								</View>
								{/* Principal title — centred under the line */}
								{item.principalName ? (
									<Text style={styles.signatureTitleText}>
										Principal, {schoolName}
									</Text>
								) : null}
							</View>

							{/* QR */}
							<View style={styles.qrBlock}>
								<View style={styles.qrBox}>
									{item.qrDataUrl ? (
										<Image src={item.qrDataUrl} style={styles.qrImage} />
									) : null}
								</View>
								<Text style={styles.qrLabel}>Scan to verify</Text>
							</View>
						</View>
					</View>
				</Page>
			))}
		</Document>
	);
};

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
	id,
	checked,
	onChange,
	label,
}: {
	id: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}) {
	return (
		<label
			htmlFor={id}
			className="flex items-center gap-3 cursor-pointer select-none"
		>
			<div className="relative">
				<input
					id={id}
					type="checkbox"
					checked={checked}
					onChange={(e) => onChange(e.target.checked)}
					className="sr-only"
				/>
				<div
					className={`w-10 h-6 rounded-full transition-colors duration-200 ${
						checked ? 'bg-primary' : 'bg-muted'
					}`}
				/>
				<div
					className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
						checked ? 'translate-x-4' : 'translate-x-0'
					}`}
				/>
			</div>
			<span className="text-sm font-medium">{label}</span>
		</label>
	);
}

// ── Filter config ─────────────────────────────────────────────────────────────

const attestationFilterConfig: FilterConfig<DocumentFilters> = {
	...documentFilterConfig,
	renderExtraFields: (f, setF) => {
		if (!f.className) return null;
		return (
			<div className="bg-muted/50 rounded-lg p-3">
				<label className="block text-sm font-medium mb-2">Report Options</label>
				<div className="flex flex-col gap-3">
					<Toggle
						id="include-principal-signature"
						checked={!!f.includePrincipalSignature}
						label="Principal's Signature"
						onChange={(checked) => {
							setF((prev) => ({ ...prev, includePrincipalSignature: checked }));
						}}
					/>
					{f.includePrincipalSignature && (
						<input
							id="principal-signature-value"
							type="text"
							value={f.principalSignatureValue}
							onChange={(e) => {
								const value = e.target.value;
								setF((prev) => ({
									...prev,
									principalSignatureValue: value,
								}));
							}}
							placeholder="e.g., Pst. Emmanuel B. Tarr, Sr."
							className="w-full border border-border px-3 py-2 rounded bg-background text-foreground"
						/>
					)}
				</div>
			</div>
		);
	},
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AttestationPage() {
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const user = useAuth((state) => state.user);
	const isStudent = isStudentRole(user?.role);

	const [filters, setFilters] = useState<DocumentFilters>(
		DEFAULT_DOCUMENT_FILTERS,
	);
	const [students, setStudents] = useState<any[]>([]);
	const [step, setStep] = useState<'filter' | 'documents'>('filter');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
	const [downloading, setDownloading] = useState(false);

	// ── Filter submit ──────────────────────────────────────────────────────────

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
				setQrDataUrls({});
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

	// ── QR generation ─────────────────────────────────────────────────────────

	useEffect(() => {
		let cancelled = false;
		if (students.length === 0) return;
		const urlsByStudent: Record<string, string> = {};

		Promise.all(
			students.map(async (student) => {
				const internalId = student?.id || student?._id;
				if (!internalId) return;
				const url =
					`${window.location.origin}/verify` +
					`?id=${encodeURIComponent(internalId)}` +
					`&academicYear=${encodeURIComponent(filters.academicYear)}` +
					`&type=attestation`;
				try {
					const dataUrl = await QRCode.toDataURL(url, {
						errorCorrectionLevel: 'M',
						margin: 1,
						width: 256,
						color: { dark: '#0F2357', light: '#FFFFFF' },
					});
					urlsByStudent[internalId] = dataUrl;
				} catch {
					/* leave QR empty */
				}
			}),
		).then(() => {
			if (!cancelled) setQrDataUrls(urlsByStudent);
		});

		return () => {
			cancelled = true;
		};
	}, [students, filters.academicYear]);

	// ── Attestation data ───────────────────────────────────────────────────────

	const attestations = useMemo(() => {
		if (students.length === 0) return [];
		const date = new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		const principal = resolveSignatory(
			school,
			usersByAcademicYear,
			filters.academicYear,
			'principal',
		);

		// A school may not have a formal "Principal" position assigned in the
		// system at all — resolveSignatory degrades to { resolved: false } in
		// that case. The manual signature toggle exists precisely as a fallback
		// for that, so it must be able to drive the whole block on its own
		// rather than only supplementing a name that resolveSignatory found.
		const manualSignature = filters.includePrincipalSignature
			? filters.principalSignatureValue.trim()
			: '';
		const displayName = principal?.resolved ? principal.name : manualSignature;

		return students.map((student) => {
			const internalId = student?.id || student?._id || '';
			const classMeta = getClassMetaById(
				school?.academicConfig?.classLevels,
				student.className,
			);
			const program =
				classMeta?.level || classMeta?.className || student.className || '—';
			return {
				id: internalId,
				studentName: student.fullName || buildStudentFullName(student) || '—',
				program,
				academicYear: filters.academicYear,
				date,
				qrDataUrl: qrDataUrls[internalId] || '',
				principalName: displayName,
				principalSignature: manualSignature,
			};
		});
	}, [
		students,
		school,
		filters.academicYear,
		filters.includePrincipalSignature,
		filters.principalSignatureValue,
		qrDataUrls,
		usersByAcademicYear,
	]);

	const allQrReady =
		attestations.length > 0 && attestations.every((item) => item.qrDataUrl);

	// ── Download ───────────────────────────────────────────────────────────────

	const handleDownload = useCallback(async () => {
		if (attestations.length === 0) return;
		setDownloading(true);
		try {
			const blob = await pdf(
				<AttestationDocument data={attestations} school={school} />,
			).toBlob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			const classSlug = (filters.className || '')
				.replace(/[^A-Za-z0-9]+/g, '_')
				.replace(/^_+|_+$/g, '');
			link.href = url;
			link.download = classSlug
				? `Attestations_${classSlug}_${filters.academicYear}.pdf`
				: `Attestations_${filters.academicYear}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error('Attestation PDF generation failed:', e);
			alert('Could not generate the attestation PDF. Please try again.');
		} finally {
			setDownloading(false);
		}
	}, [attestations, school, filters.className, filters.academicYear]);

	// ── Filter view ────────────────────────────────────────────────────────────

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
						config={attestationFilterConfig}
					/>
				)}
			</div>
		);
	}

	// ── Preview view ──────────────────────────────────────────────────────────

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
				<button
					type="button"
					onClick={handleDownload}
					disabled={downloading || !allQrReady}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Download className="h-4 w-4" />
					{downloading ? 'Preparing…' : 'Download PDF'}
				</button>
			</div>

			{/* PDF preview */}
			<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
				{attestations.length > 0 ? (
					<Suspense
						fallback={
							<div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
								Loading certificates preview…
							</div>
						}
					>
						<PDFViewer width="100%" height="900">
							<AttestationDocument data={attestations} school={school} />
						</PDFViewer>
					</Suspense>
				) : (
					<div className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">
						No certificates to preview.
					</div>
				)}
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
