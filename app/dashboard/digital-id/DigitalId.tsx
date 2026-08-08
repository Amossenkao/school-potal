'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Printer, ShieldCheck, X } from 'lucide-react';
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
import DigitalIdCard from './DigitalIdCard';

const ensurePrintStyles = (): HTMLStyleElement | null => {
	if (typeof document === 'undefined') return null;
	const existing = document.getElementById('digital-id-print-styles');
	if (existing) return existing as HTMLStyleElement;
	const style = document.createElement('style');
	style.id = 'digital-id-print-styles';
	style.textContent = `@media print {
	body > *:not(#digital-id-print-root) { display: none !important; }
	#digital-id-print-root { display: block !important; }
	html, body { background: #ffffff !important; }
}`;
	document.head.appendChild(style);
	return style;
};

export default function DigitalIdPage() {
	const school = useSchoolStore((state) => state.school);
	const usersByAcademicYear = useSchoolStore(
		(state) => state.usersByAcademicYear,
	);
	const setUsersForYear = useSchoolStore((state) => state.setUsersForYear);
	const user = useAuth((state) => state.user);
	const isStudent = isStudentRole(user?.role);

	const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_DOCUMENT_FILTERS);
	const [students, setStudents] = useState<any[]>([]);
	const [step, setStep] = useState<'filter' | 'ids'>('filter');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		const style = ensurePrintStyles();
		return () => {
			style?.remove();
		};
	}, []);

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
				setStep('ids');
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

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	if (step === 'filter') {
		return (
			<div className="px-4 pb-4">
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
						Student Digital IDs
					</h1>
					<p className="text-sm text-muted-foreground">
						{students.length} card{students.length === 1 ? '' : 's'} ·{' '}
						{filters.academicYear}
					</p>
				</div>
				<button
					type="button"
					onClick={handlePrint}
					className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					<Printer className="h-4 w-4" />
					Print IDs
				</button>
			</div>

			{/* Verification note */}
			<div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
				<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
				<p className="text-xs leading-relaxed text-muted-foreground">
					Each card includes a scannable QR code carrying a signed
					verification payload tied to the school&apos;s fingerprint. Scanners
					can confirm the student, school, and academic year directly from the
					code — no database lookup required.
				</p>
			</div>

			{/* Cards */}
			<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{students.map((student, index) => (
					<DigitalIdCard
						key={student?.studentId || student?.id || student?._id || index}
						student={student}
						school={school}
						academicYear={filters.academicYear}
					/>
				))}
			</div>

			{/* Print-only root: rendered at document.body so other UI is hidden while printing */}
			{typeof document !== 'undefined' &&
				createPortal(
					<div
						id="digital-id-print-root"
						className="hidden bg-white p-8 print:block"
					>
						<div className="grid grid-cols-2 gap-6">
							{students.map((student, index) => (
								<DigitalIdCard
									key={`print-${student?.studentId || student?.id || student?._id || index}`}
									student={student}
									school={school}
									academicYear={filters.academicYear}
								/>
							))}
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
