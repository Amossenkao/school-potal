'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
	BadgeCheck,
	CalendarDays,
	Fingerprint,
	GraduationCap,
	ShieldCheck,
	User,
} from 'lucide-react';
import type SchoolProfile from '@/types/schoolProfile';
import { getClassMetaById } from '@/app/api/chat/utils';
import {
	buildStudentFullName,
	buildVerificationPayload,
	normalizeStudentId,
} from './verification';

interface DigitalIdCardProps {
	student: any;
	school: SchoolProfile | null;
	academicYear: string;
}

const formatDate = (value: string | undefined, fallback = '—') => {
	if (!value) return fallback;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
};

const getAcademicYearEnd = (academicYear: string) => {
	const match = String(academicYear).match(/(\d{4})/g);
	const endYear =
		match && match.length >= 2 ? Number(match[match.length - 1]) : NaN;
	if (!Number.isNaN(endYear)) return new Date(endYear, 5, 30);
	return null;
};

export default function DigitalIdCard({
	student,
	school,
	academicYear,
}: DigitalIdCardProps) {
	const [qrDataUrl, setQrDataUrl] = useState('');
	const [qrError, setQrError] = useState(false);
	const [logoError, setLogoError] = useState(false);
	const [photoError, setPhotoError] = useState(false);

	const fullName = useMemo(() => buildStudentFullName(student) || '—', [student]);
	const studentId = useMemo(
		() => normalizeStudentId(student?.studentId, student?.id, student?._id),
		[student],
	);
	const photoUrl = useMemo(
		() => student?.profilePictureUrl || student?.avatar || '',
		[student],
	);
	const className =
		student?.className ||
		student?.currentClass?.className ||
		student?.class?.name ||
		'';
	const classMeta = useMemo(() => {
		if (!className) return null;
		const meta = getClassMetaById(
			school?.academicConfig?.classLevels,
			className,
		);
		return meta;
	}, [school, className]);
	const classLevel = classMeta?.className || className || '—';
	const enrollmentStatus =
		typeof student?.enrollmentStatus === 'string' && student.enrollmentStatus
			? student.enrollmentStatus.charAt(0).toUpperCase() +
				student.enrollmentStatus.slice(1)
			: 'Active';

	const schoolName = school?.identity?.name || 'School';
	const schoolInitials =
		school?.identity?.initials || school?.identity?.shortName || 'SCH';
	const schoolSlogan = school?.identity?.slogan || '';
	const schoolLogo = school?.branding?.logoUrl || '';
	const prefixedStudentId = useMemo(() => {
		if (!studentId) return '—';
		const prefix = school?.identity?.studentIdPrefix || '';
		if (!prefix) return studentId;
		return studentId.startsWith(prefix) ? studentId : `${prefix}-${studentId}`;
	}, [studentId, school]);

	const issuedAt = useMemo(() => new Date().toISOString(), []);
	const validUntil = useMemo(() => {
		const end = getAcademicYearEnd(academicYear);
		return end ? end.toISOString() : '';
	}, [academicYear]);

	const statusBadge = useMemo(() => {
		const isActive = ['active', 'enrolled', 'true'].includes(
			String(student?.enrollmentStatus || '').toLowerCase(),
		) || !student?.enrollmentStatus;
		return {
			label: isActive ? 'Verified Student' : 'Inactive',
			active: isActive,
		};
	}, [student]);

	useEffect(() => {
		let cancelled = false;
		setQrError(false);
		buildVerificationPayload(school, student, academicYear)
			.then((payload) => {
				if (cancelled || !payload) {
					setQrError(true);
					return null;
				}
				return QRCode.toDataURL(JSON.stringify(payload), {
					errorCorrectionLevel: 'M',
					margin: 1,
					width: 192,
					color: {
						dark: '#111827',
						light: '#FFFFFF',
					},
				});
			})
			.then((dataUrl) => {
				if (cancelled || !dataUrl) return;
				setQrDataUrl(dataUrl);
			})
			.catch(() => {
				if (!cancelled) setQrError(true);
			});
		return () => {
			cancelled = true;
		};
	}, [school, student, academicYear]);

	useEffect(() => {
		setLogoError(false);
	}, [schoolLogo]);

	useEffect(() => {
		setPhotoError(false);
	}, [photoUrl]);

	return (
		<div className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			{/* Top band */}
			<div className="bg-gradient-to-r from-primary to-primary/80 px-5 pb-6 pt-5 text-primary-foreground">
				<div className="flex items-start gap-3">
					{schoolLogo && !logoError ? (
						<img
							src={schoolLogo}
							alt={schoolName}
							className="h-10 w-10 flex-shrink-0 rounded-full object-contain"
							onError={() => setLogoError(true)}
						/>
					) : (
						<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 font-bold text-primary-foreground">
							{schoolInitials.slice(0, 2).toUpperCase()}
						</div>
					)}
					<div className="min-w-0">
						<p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] opacity-90">
							{schoolName}
						</p>
						<p className="truncate text-[9px] uppercase tracking-[0.2em] opacity-60">
							{schoolSlogan || school?.identity?.shortName || 'Official ID'}
						</p>
					</div>
				</div>
				<div className="mt-3 flex items-center gap-1.5">
					<ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
					<p className="text-[11px] font-semibold uppercase tracking-[0.22em]">
						Student Identification Card
					</p>
				</div>
			</div>

			{/* Body */}
			<div className="-mt-6 px-5 pb-5">
				{/* Photo + name */}
				<div className="flex items-end gap-4">
					<div className="h-[88px] w-[88px] flex-shrink-0 overflow-hidden rounded-xl border-4 border-card bg-muted shadow">
						{photoUrl ? (
							<img
								src={photoUrl}
								alt={fullName}
								className="h-full w-full object-cover"
								onError={() => setPhotoError(true)}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
								<User className="h-8 w-8 text-primary/60" />
							</div>
						)}
					</div>
					<div className="min-w-0 pb-1">
						<p className="truncate text-lg font-bold leading-tight text-foreground">
							{fullName}
						</p>
						<p
							className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
								statusBadge.active
									? 'bg-emerald-500/10 text-emerald-600'
									: 'bg-destructive/10 text-destructive'
							}`}
						>
							<BadgeCheck className="h-3 w-3" />
							{statusBadge.label}
						</p>
					</div>
				</div>

				{/* Details */}
				<div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-muted/40 p-4">
					<div className="col-span-2">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Student ID
						</p>
						<p className="mt-0.5 truncate font-mono text-sm font-semibold text-foreground">
							{prefixedStudentId}
						</p>
					</div>
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Class
						</p>
						<p className="mt-0.5 truncate text-sm font-medium text-foreground">
							{classLevel}
						</p>
					</div>
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Academic Year
						</p>
						<p className="mt-0.5 truncate text-sm font-medium text-foreground">
							{academicYear || '—'}
						</p>
					</div>
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Gender
						</p>
						<p className="mt-0.5 truncate text-sm font-medium text-foreground">
							{student?.gender || '—'}
						</p>
					</div>
					<div>
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Date of Birth
						</p>
						<p className="mt-0.5 truncate text-sm font-medium text-foreground">
							{formatDate(student?.dateOfBirth)}
						</p>
					</div>
					<div className="col-span-2">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Enrollment
						</p>
						<p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
							<GraduationCap className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
							{enrollmentStatus}
						</p>
					</div>
				</div>

				{/* QR */}
				<div className="mt-4 flex items-center gap-4 rounded-xl border border-border p-3">
					<div className="h-[92px] w-[92px] flex-shrink-0 overflow-hidden rounded-lg bg-white p-1">
						{qrDataUrl && !qrError ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={qrDataUrl}
								alt="Verification QR code"
								className="h-full w-full"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<Fingerprint className="h-8 w-8 text-muted-foreground/50" />
							</div>
						)}
					</div>
					<div className="min-w-0">
						<p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
							<Fingerprint className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
							QR Verification
						</p>
						<p className="mt-1 text-[11px] leading-snug text-muted-foreground">
							Scan to verify this student ID&apos;s authenticity and validity.
						</p>
						<p className="mt-1.5 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
							<ShieldCheck className="h-3 w-3 text-emerald-500" />
							Signed fingerprint
						</p>
					</div>
				</div>

				{/* Validity footer */}
				<div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
					<span className="inline-flex items-center gap-1">
						<CalendarDays className="h-3 w-3" />
						Issued {formatDate(issuedAt)}
					</span>
					{validUntil && (
						<span className="inline-flex items-center gap-1">
							<ShieldCheck className="h-3 w-3" />
							Valid until {formatDate(validUntil)}
						</span>
					)}
				</div>
			</div>

			{/* Bottom strip */}
			<div className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-2.5">
				<span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
					{school?.identity?.shortName || schoolName}
				</span>
				<span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground">
					{prefixedStudentId}
				</span>
			</div>
		</div>
	);
}
