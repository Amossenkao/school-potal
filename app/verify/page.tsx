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
} from 'lucide-react';
import { PageLoading } from '@/components/loading';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import { useSchoolStore } from '@/store/schoolStore';

// Make sure to import your existing PDF generator function!
// import { generateYearlyReportPdf } from '@/lib/pdf/generateYearlyReportPdf';

interface VerifiedStudentData {
	studentId: string;
	firstName: string;
	lastName: string;
	academicYear: string;
}

function VerifyContent() {
	const searchParams = useSearchParams();
	const id = searchParams.get('id');
	const academicYear = searchParams.get('academicYear');

	const currentSchool = useSchoolStore((state) => state.school);

	const [student, setStudent] = useState<VerifiedStudentData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isBlobLoading, setIsBlobLoading] = useState(false);

	useEffect(() => {
		if (!id || !academicYear) {
			setError('Invalid verification link. Missing required parameters.');
			setLoading(false);
			return;
		}

		const verifyStudent = async () => {
			try {
				// We are using the verify-data endpoint designed to return the raw JSON
				const res = await fetch(
					`/api/reports/verify-data?id=${id}&academicYear=${encodeURIComponent(academicYear)}`,
				);
				const data = await res.json();

				if (!res.ok) throw new Error(data.message || 'Verification failed');

				// Extract basic info for the UI
				setStudent({
					studentId: data.studentData.studentId,
					firstName: data.studentData.studentName.split(' ')[0] || '', // Fallback split if first/last aren't separated
					lastName:
						data.studentData.studentName.split(' ').slice(1).join(' ') || '',
					academicYear: data.reportFilters.academicYear,
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
			const response = await fetch(
				`/api/reports/verify-data?id=${id}&academicYear=${encodeURIComponent(academicYear)}`,
			);

			if (!response.ok) throw new Error('Failed to fetch report data');

			const { studentData, className, classSubjects, reportFilters, school } =
				await response.json();

			// Generate the PDF bytes using your existing frontend function
			/*
      const pdfBytes = await generateYearlyReportPdf({
        studentsData: [studentData],
        className,
        classSubjects,
        reportFilters,
        school, 
      });
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      */

			// Temporary alert until generateYearlyReportPdf is imported and uncommented
			alert(
				'PDF generation triggered. Uncomment the PDF generation logic in the code to view the blob.',
			);
		} catch (err) {
			console.error('PDF Generation failed:', err);
			alert('Could not generate the report document. Please try again.');
		} finally {
			setIsBlobLoading(false);
		}
	};

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

			<div className="min-h-screen bg-background flex flex-col">
				<div className="flex-grow flex flex-col">
					<div className="flex-grow flex items-center justify-center px-4 py-10">
						<div className="w-full max-w-4xl bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col lg:flex-row">
							{/* Mobile Header */}
							<div className="lg:hidden flex items-center gap-4 px-6 pt-6 pb-4 border-b border-border bg-muted/30">
								<div className="flex items-center gap-3">
									<div className="w-16 h-16 flex items-center justify-center overflow-hidden flex-shrink-0">
										{currentSchool?.logoUrl ? (
											<img
												src={currentSchool.logoUrl}
												alt={`${currentSchool.shortName || 'School'} logo`}
												className="w-full h-full object-contain"
											/>
										) : (
											<School className="w-7 h-7 text-muted-foreground" />
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
							</div>

							{/* Desktop Left Identity Strip */}
							<aside className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 border-r border-border bg-muted/30 px-8 py-8 gap-6 relative overflow-hidden">
								<div className="flex flex-col gap-4 relative z-10">
									<div className="w-32 h-32 flex items-center justify-center mx-auto mb-2">
										{currentSchool?.logoUrl ? (
											<img
												src={currentSchool.logoUrl}
												alt={`${currentSchool.shortName || 'School'} logo`}
												className="w-full h-full object-contain drop-shadow-sm"
											/>
										) : (
											<School className="w-16 h-16 text-muted-foreground" />
										)}
									</div>
									<div className="text-center">
										<h2 className="text-lg font-bold text-foreground leading-snug">
											{currentSchool?.name || 'School Name'}
										</h2>
										<p className="text-sm text-muted-foreground mt-1 leading-snug">
											{currentSchool?.tagline || 'Excellence in Education'}
										</p>
									</div>
								</div>

								<div className="h-px bg-border w-full my-2" />

								<div className="flex flex-col gap-3">
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
								</div>

								<div className="mt-auto text-[10px] text-muted-foreground/60 leading-relaxed text-center">
									<p>
										&copy; {new Date().getFullYear()}{' '}
										{currentSchool?.name || 'School'}.<br />
										All Rights Reserved.
									</p>
								</div>
							</aside>

							{/* Right Content Area */}
							<div className="flex-1 flex flex-col px-6 py-8 sm:px-10 sm:py-12 min-h-[520px] justify-center relative">
								{error || !student ? (
									<div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center text-center">
										<div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
											<AlertCircle className="h-10 w-10 text-destructive" />
										</div>
										<h2 className="text-2xl font-bold text-foreground mb-2">
											Verification Failed
										</h2>
										<p className="text-sm text-muted-foreground max-w-sm mb-8">
											{error ||
												'The requested document could not be found or the link is invalid.'}
										</p>
										<button
											onClick={() => (window.location.href = '/')}
											className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-all"
										>
											Return to Homepage
										</button>
									</div>
								) : (
									<div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-md mx-auto">
										<div className="flex flex-col items-center text-center mb-8">
											<div className="w-20 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
												<CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
											</div>
											<p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
												Authentic Record
											</p>
											<h2 className="text-3xl font-bold text-foreground">
												Successfully Verified
											</h2>
										</div>

										<div className="flex flex-col gap-4 mb-8">
											{/* Student Name Card */}
											<div className="flex items-center gap-4 p-4 bg-muted/40 border border-border rounded-2xl">
												<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
													<User className="w-6 h-6 text-primary" />
												</div>
												<div className="min-w-0">
													<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
														Student Name
													</p>
													<p className="text-lg font-bold text-foreground truncate">
														{student.firstName} {student.lastName}
													</p>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-4">
												{/* ID Card */}
												<div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col gap-1">
													<div className="flex items-center gap-2 mb-1">
														<Hash className="w-4 h-4 text-muted-foreground" />
														<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
															System ID
														</p>
													</div>
													<p className="font-semibold text-foreground truncate">
														{student.studentId}
													</p>
												</div>

												{/* Academic Year Card */}
												<div className="p-4 bg-muted/40 border border-border rounded-2xl flex flex-col gap-1">
													<div className="flex items-center gap-2 mb-1">
														<Calendar className="w-4 h-4 text-muted-foreground" />
														<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
															Academic Year
														</p>
													</div>
													<p className="font-semibold text-foreground truncate">
														{student.academicYear}
													</p>
												</div>
											</div>
										</div>

										<button
											onClick={handleViewReport}
											disabled={isBlobLoading}
											className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
										>
											{isBlobLoading ? (
												<Loader2 className="w-5 h-5 animate-spin" />
											) : (
												<FileText className="w-5 h-5" />
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
