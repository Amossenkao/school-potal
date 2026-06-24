'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
	CheckCircle,
	AlertCircle,
	FileText,
	Loader2,
	User,
	School,
	ShieldCheck,
	Calendar,
	Hash,
	Award,
	TrendingUp,
	GraduationCap,
} from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import { useSchoolStore } from '@/store/schoolStore';
import { generateYearlyReportPdf } from '@/app/dashboard/shared/YearlyReport';
import QRCode from 'qrcode';

// ── types ──────────────────────────────────────────────────────────────────

interface VerifiedStudentData {
	studentId: string;
	firstName: string;
	lastName: string;
	className: string;
	academicYear: string;
	yearlyAverage: number | null;
	yearlyRank: number | null;
	classStudentCount: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

const generateStudentQrCodeDataUrl = (url: string): Promise<string> =>
	QRCode.toDataURL(url, {
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 256,
		color: { dark: '#111111', light: '#FFFFFF' },
	});

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const buffer = await res.arrayBuffer();
		const b64 = Buffer.from(buffer).toString('base64');
		const contentType = res.headers.get('content-type') || 'image/png';
		return `data:${contentType};base64,${b64}`;
	} catch {
		return null;
	}
};

// ── main content ───────────────────────────────────────────────────────────

function VerifyContent() {
	const searchParams = useSearchParams();
	const id = searchParams.get('id');
	const academicYear = searchParams.get('academicYear');

	const currentSchool = useSchoolStore((state) => state.school);

	const [student, setStudent] = useState<VerifiedStudentData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isBlobLoading, setIsBlobLoading] = useState(false);
	const [cachedPayload, setCachedPayload] = useState<any>(null);
				const getDisplayClassName = (name: string) => {
					// Keep kindergarten classes intact
					if (
						['k-i', 'k-ii', 'k-1', 'k-2'].includes(name.toLocaleLowerCase())
					) {
						return name;
					}

					// Remove AM/PM suffixes
					if (name.endsWith(' AM') || name.endsWith(' PM')) {
						return name.slice(0, -3);
					}

					// For classes like Grade 11-A, Grade 11-B, etc.
					if (name.includes('-')) {
						return name.split('-')[0];
					}

					return name;
				};
	useEffect(() => {
		if (!id || !academicYear) {
			setError('Invalid verification link. Missing required parameters.');
			setLoading(false);
			return;
		}

		const verifyStudent = async () => {
			try {
				const res = await fetch(
					'/api/reports/verify?id=' +
						id +
						'&academicYear=' +
						encodeURIComponent(academicYear),
				);
				const data = await res.json();

				if (!res.ok) throw new Error(data.message || 'Verification failed');

				setCachedPayload(data);

				const nameParts = String(data.studentData.studentName ?? '').split(' ');
				setStudent({
					studentId: data.studentData.studentId,
					firstName: nameParts[0] ?? '',
					lastName: nameParts.slice(1).join(' ') ?? '',
					className: getDisplayClassName(data.className ?? data.reportFilters?.className ?? ''),
					academicYear: data.reportFilters.academicYear,
					yearlyAverage: data.studentData.yearlyAverage,
					yearlyRank: data.studentData.ranks?.yearly ?? null,
					classStudentCount: data.classStudentCount ?? 0,
				});
			} catch (err: any) {
				setError(
					err.message ||
						'An unexpected error occurred while verifying the record.',
				);
			} finally {
				setLoading(false);
			}
		};

		verifyStudent();
	}, [id, academicYear]);

	const handleViewReport = async () => {
		if (!id || !academicYear) return;
		setIsBlobLoading(true);

		try {
			const payload =
				cachedPayload ??
				(await (async () => {
					const res = await fetch(
						'/api/reports/verify?id=' +
							id +
							'&academicYear=' +
							encodeURIComponent(academicYear),
					);
					if (!res.ok) throw new Error('Failed to fetch document data');
					return res.json();
				})());

			const {
				studentData,
				className,
				classSubjects,
				reportFilters,
				school,
				classStudentCount,
			} = payload;

			// Use window.location.href — this IS the verify page, so it's already
			// the exact URL we want the QR code to point to. No template literal needed.
			const verifyPageUrl = window.location.href;

			const [logoUrl, logoUrl2, qrCodeDataUrl] = await Promise.all([
				school?.logoUrl
					? fetchImageAsBase64(school.logoUrl)
					: Promise.resolve(null),
				school?.logoUrl2
					? fetchImageAsBase64(school.logoUrl2)
					: Promise.resolve(null),
				generateStudentQrCodeDataUrl(verifyPageUrl),
			]);

			const studentDataWithQr = { ...studentData, qrCodeDataUrl };

			const pdfBytes = await generateYearlyReportPdf({
				studentsData: [studentDataWithQr],
				className: getDisplayClassName(className),
				classSubjects,
				reportFilters,
				classStudentCount,
				school: {
					...school,
					logoUrl: logoUrl ?? undefined,
					logoUrl2: logoUrl2 ?? undefined,
				},
			});

			const blob = new Blob([pdfBytes], { type: 'application/pdf' });
			const blobUrl = URL.createObjectURL(blob);
			window.open(blobUrl, '_blank');
			setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
		} catch (err) {
			console.error('PDF Generation failed:', err);
			alert('Could not generate the report document. Please try again.');
		} finally {
			setIsBlobLoading(false);
		}
	};

	// ── render ───────────────────────────────────────────────────────────

	if (loading) {
		return (
			<PageLoading variant="school" message="Verifying official record..." />
		);
	}

	return (
		<>
			<div className="fixed top-4 right-4 z-50">
				<ThemeToggleButton />
			</div>

			{/*
			 * Outer shell: fills the viewport exactly, no overflow.
			 * py-4 gives a small breathing room top/bottom without introducing
			 * a scrollbar on desktop. On very short screens the card itself
			 * will scroll naturally via overflow-y-auto on the inner scroll root.
			 */}
			<div className="h-screen bg-background flex items-center justify-center px-4 py-4 overflow-y-auto">
				<div className="w-full max-w-4xl bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col lg:flex-row">
					{/* ── Mobile Header ─────────────────────────────────── */}
					<div className="lg:hidden flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border bg-muted/30">
						<div className="w-12 h-12 flex items-center justify-center overflow-hidden flex-shrink-0">
							{currentSchool?.logoUrl ? (
								<img
									src={currentSchool.logoUrl}
									alt="School logo"
									className="w-full h-full object-contain"
								/>
							) : (
								<School className="w-6 h-6 text-muted-foreground" />
							)}
						</div>
						<div>
							<p className="text-sm font-semibold text-foreground leading-snug">
								{currentSchool?.shortName || 'School'}
							</p>
							<p className="text-xs text-muted-foreground mt-0.5 leading-snug">
								Official Document Verification
							</p>
						</div>
					</div>

					{/* ── Desktop Left Identity Strip ───────────────────── */}
					<aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 border-r border-border bg-muted/30 px-6 py-6 gap-5">
						<div className="flex flex-col items-center gap-3">
							<div className="w-24 h-24 flex items-center justify-center">
								{currentSchool?.logoUrl ? (
									<img
										src={currentSchool.logoUrl}
										alt="School logo"
										className="w-full h-full object-contain drop-shadow-sm"
									/>
								) : (
									<School className="w-12 h-12 text-muted-foreground" />
								)}
							</div>
							<div className="text-center">
								<h2 className="text-base font-bold text-foreground leading-snug">
									{currentSchool?.name || 'School Name'}
								</h2>
								<p className="text-xs text-muted-foreground mt-1 leading-snug">
									{currentSchool?.tagline || 'Excellence in Education'}
								</p>
							</div>
						</div>

						<div className="h-px bg-border w-full" />

						<div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
							<ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
									Secure System
								</p>
								<p className="text-xs font-medium text-foreground">
									Cryptographic Verification
								</p>
							</div>
						</div>

						<div className="mt-auto text-[10px] text-muted-foreground/60 leading-relaxed text-center">
							<p>
								&copy; {new Date().getFullYear()}{' '}
								{currentSchool?.name || 'School'}.<br />
								All Rights Reserved.
							</p>
						</div>
					</aside>

					{/* ── Right Content Area ────────────────────────────── */}
					<div className="flex-1 flex flex-col px-5 py-6 sm:px-8 sm:py-8 justify-center">
						{error || !student ? (
							/* ── Error state ──────────────────────────────── */
							<div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center text-center">
								<div className="w-16 h-16 sm:w-20 sm:h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-5">
									<AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
								</div>
								<h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
									Verification Failed
								</h2>
								<p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-7">
									{error ||
										'The requested document could not be found or the link is invalid.'}
								</p>
								<button
									onClick={() => (window.location.href = '/')}
									className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-all"
								>
									Return to Homepage
								</button>
							</div>
						) : (
							/* ── Success state ────────────────────────────── */
							<div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-md mx-auto">
								{/* Badge */}
								<div className="flex flex-col items-center text-center mb-5 sm:mb-7">
									<div className="w-14 h-14 sm:w-18 sm:h-18 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-3 border border-emerald-500/20">
										<CheckCircle className="h-7 w-7 sm:h-9 sm:w-9 text-emerald-600 dark:text-emerald-400" />
									</div>
									<p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">
										Authentic Record
									</p>
									<h2 className="text-2xl sm:text-3xl font-bold text-foreground">
										Successfully Verified
									</h2>
								</div>

								{/* Detail cards */}
								<div className="flex flex-col gap-3 mb-5 sm:mb-7">
									{/* Student name — full width */}
									<div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/40 border border-border rounded-2xl">
										<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
											<User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
										</div>
										<div className="min-w-0">
											<p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
												Student Name
											</p>
											<p className="text-base sm:text-lg font-bold text-foreground truncate">
												{student.firstName} {student.lastName}
											</p>
										</div>
									</div>

									{/* Row: System ID + Class */}
									<div className="grid grid-cols-2 gap-3">
										<div className="p-3 sm:p-4 bg-muted/40 border border-border rounded-2xl flex flex-col gap-1">
											<div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
												<Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
												<p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
													Student ID
												</p>
											</div>
											<p className="text-xs sm:text-sm font-semibold text-foreground truncate">
												{student.studentId}
											</p>
										</div>

										<div className="p-3 sm:p-4 bg-muted/40 border border-border rounded-2xl flex flex-col gap-1">
											<div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
												<GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
												<p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
													Class
												</p>
											</div>
											<p className="text-xs sm:text-sm font-semibold text-foreground truncate">
												{student.className || '—'}
											</p>
										</div>
									</div>

									{/* Academic year — full width */}
									<div className="p-3 sm:p-4 bg-muted/40 border border-border rounded-2xl flex items-center gap-3">
										<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
											<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
										</div>
										<div className="min-w-0">
											<p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
												Academic Year
											</p>
											<p className="text-xs sm:text-sm font-semibold text-foreground">
												{student.academicYear}
											</p>
										</div>
									</div>

									{/* Row: Yearly Average + Class Rank */}
									<div className="grid grid-cols-2 gap-3">
										<div className="p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col gap-1">
											<div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
												<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
												<p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-primary truncate">
													Yearly Avg
												</p>
											</div>
											<p className="text-lg sm:text-xl font-bold text-foreground">
												{student.yearlyAverage != null
													? student.yearlyAverage
													: 'N/A'}
											</p>
										</div>

										<div className="p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col gap-1">
											<div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
												<Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
												<p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-primary truncate">
													Class Rank
												</p>
											</div>
											{student.yearlyRank != null ? (
												<p className="font-bold text-foreground leading-tight">
													<span className="text-lg sm:text-xl">
														#{student.yearlyRank}
													</span>
													{student.classStudentCount > 0 && (
														<span className="text-[11px] sm:text-xs font-medium text-muted-foreground ml-1 whitespace-nowrap">
															of {student.classStudentCount}
														</span>
													)}
												</p>
											) : (
												<p className="text-lg sm:text-xl font-bold text-foreground">
													N/A
												</p>
											)}
										</div>
									</div>
								</div>

								{/* View report button */}
								<button
									onClick={handleViewReport}
									disabled={isBlobLoading}
									className="w-full flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								>
									{isBlobLoading ? (
										<Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
									) : (
										<FileText className="w-4 h-4 sm:w-5 sm:h-5" />
									)}
									{isBlobLoading
										? 'Generating Secure Document...'
										: 'View Official Report'}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

export default function VerifyPage() {
	return (
		<Suspense
			fallback={
				<PageLoading
					variant="school"
					message="Initializing secure connection..."
				/>
			}
		>
			<VerifyContent />
		</Suspense>
	);
}
