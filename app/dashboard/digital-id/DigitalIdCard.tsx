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
import { getFirstSchoolAddressLines } from '@/utils/schoolAddresses';
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

	const fullName = useMemo(
		() => buildStudentFullName(student) || '—',
		[student],
	);
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

	// Address lines from school profile
	const schoolAddressLines = getFirstSchoolAddressLines(school?.contact?.addresses);

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
		const isActive =
			['active', 'enrolled', 'true'].includes(
				String(student?.enrollmentStatus || '').toLowerCase(),
			) || !student?.enrollmentStatus;
		return {
			label: isActive ? 'Active' : 'Inactive',
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
					width: 128,
					color: {
						dark: '#1A1400',
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

	const LogoBadge = () => {
		if (schoolLogo && !logoError) {
			return (
				<img
					src={schoolLogo}
					alt={schoolName}
					className="h-7 w-7 flex-shrink-0 rounded-md object-contain"
					style={{ boxShadow: '0 1px 6px rgba(212,175,55,0.5)' }}
					onError={() => setLogoError(true)}
				/>
			);
		}
		return (
			<div
				className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[8px] font-bold tracking-tight"
				style={{
					background: 'linear-gradient(135deg, #D4AF37, #F5D87A, #B8960C)',
					color: '#111007',
					boxShadow: '0 1px 6px rgba(212,175,55,0.5)',
				}}
			>
				{schoolInitials.slice(0, 3).toUpperCase()}
			</div>
		);
	};

	return (
		/*
		 * Card dimensions: 340 × 214 px — CR80 credit card ratio (85.6 × 53.98 mm)
		 * Overflow hidden clips the decorative layers to the rounded corners.
		 */
		<div
			className="relative overflow-hidden"
			style={{
				width: 340,
				height: 214,
				borderRadius: 14,
				background: '#FFFDF5',
				boxShadow:
					'0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(180,140,0,0.18)',
				fontFamily: "'Space Grotesk', sans-serif",
			}}
		>
			{/* ── Decorative layers (z-index 1–4, behind content at z-5) ────────── */}

			{/* Top gold accent bar */}
			<div
				className="pointer-events-none absolute inset-x-0 top-0 z-[8]"
				style={{
					height: 4,
					background:
						'linear-gradient(90deg, #1A1400 0%, #D4AF37 35%, #F5D87A 60%, #D4AF37 80%, #1A1400 100%)',
				}}
			/>

			{/* Right gold accent strip */}
			<div
				className="pointer-events-none absolute inset-y-0 right-0 z-[6]"
				style={{
					width: 3,
					background:
						'linear-gradient(180deg, #1A1400 0%, #D4AF37 40%, #F5D87A 70%, #D4AF37 100%)',
				}}
			/>

			{/* Holographic shimmer */}
			<div
				className="pointer-events-none absolute inset-0 z-[10] animate-pulse"
				style={{
					background:
						'linear-gradient(115deg, transparent 0%, rgba(212,175,55,0.07) 30%, transparent 50%, rgba(212,175,55,0.04) 70%, transparent 100%)',
					borderRadius: 14,
					animationDuration: '7s',
				}}
			/>

			{/* Black header band */}
			<div
				className="pointer-events-none absolute inset-x-0 top-0 z-[2]"
				style={{ height: 63, background: '#111007' }}
			/>

			{/* Subtle inner glow on header */}
			<div
				className="pointer-events-none absolute inset-x-0 top-0 z-[3]"
				style={{
					height: 63,
					background:
						'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 100%)',
				}}
			/>

			{/* Gold hairline separating header from body */}
			<div
				className="pointer-events-none absolute inset-x-0 z-[4]"
				style={{
					top: 63,
					height: 1,
					background:
						'linear-gradient(90deg, transparent 0%, #D4AF37 20%, #F5D87A 50%, #D4AF37 80%, transparent 100%)',
				}}
			/>

			{/* Diagonal security-paper hatching on card body */}
			<div
				className="pointer-events-none absolute inset-x-0 bottom-0 z-[1]"
				style={{
					top: 64,
					backgroundImage:
						'repeating-linear-gradient(-55deg, transparent, transparent 18px, rgba(212,175,55,0.025) 18px, rgba(212,175,55,0.025) 19px)',
				}}
			/>

			{/* ── Content (z-5) ───────────────────────────────────────────────────── */}
			<div
				className="relative z-[5] flex h-full flex-col"
				style={{ paddingBottom: 11 }}
			>
				{/* Header — logo | school name + address | logo */}
				<div
					className="flex items-center justify-center gap-2"
					style={{
						padding: '10px 14px 8px',
						height: 63,
						boxSizing: 'border-box',
					}}
				>
					<LogoBadge />

					<div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
						<p
							className="truncate text-center font-bold uppercase tracking-widest"
							style={{
								fontSize: 8.5,
								color: '#F5D87A',
								lineHeight: 1,
								letterSpacing: '0.14em',
							}}
						>
							{schoolName}
						</p>
						<p
							className="text-center"
							style={{
								fontSize: 6.5,
								color: 'rgba(212,175,55,0.55)',
								lineHeight: 1.6,
								letterSpacing: '0.04em',
							}}
						>
							{schoolAddressLines.length > 0
								? schoolAddressLines.slice(0, 3).map((line: string, idx: number, arr: string[]) => (
									<span key={idx}>
										{line}
										{idx < arr.length - 1 && <br />}
									</span>
								))
								: (
									<>
										{'12 Academy Drive, Sinkor'}
										<br />
										{'Monrovia, Montserrado County'}
										<br />
										{'Liberia, West Africa'}
									</>
								)}
						</p>
					</div>

					<LogoBadge />
				</div>

				{/* Main — photo column + info column */}
				<div
					className="flex flex-1 gap-[11px]"
					style={{ padding: '9px 14px 0' }}
				>
					{/* Photo column */}
					<div className="flex flex-shrink-0 flex-col gap-[5px]">
						{/* Photo frame */}
						<div
							className="flex items-center justify-center overflow-hidden"
							style={{
								width: 60,
								height: 68,
								borderRadius: 7,
								background: '#F5EEC8',
								border: '1px solid rgba(212,175,55,0.3)',
								boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.15)',
							}}
						>
							{photoUrl && !photoError ? (
								<img
									src={photoUrl}
									alt={fullName}
									className="h-full w-full object-cover"
									onError={() => setPhotoError(true)}
								/>
							) : (
								<User
									className="h-6 w-6"
									style={{ color: '#B8960C', opacity: 0.5 }}
								/>
							)}
						</div>

						{/* Status pill */}
						<div
							className="flex items-center justify-center gap-[3px]"
							style={{
								padding: '2px 5px',
								borderRadius: 3,
								background: statusBadge.active
									? 'rgba(16,185,129,0.08)'
									: 'rgba(239,68,68,0.08)',
								border: `0.5px solid ${statusBadge.active ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.3)'}`,
							}}
						>
							<span
								className="block rounded-full"
								style={{
									width: 4,
									height: 4,
									background: statusBadge.active ? '#059669' : '#DC2626',
									animation: 'pulse 2s ease-in-out infinite',
								}}
							/>
							<span
								className="font-bold uppercase tracking-wider"
								style={{
									fontSize: 6.5,
									color: statusBadge.active ? '#059669' : '#DC2626',
									letterSpacing: '0.1em',
								}}
							>
								{statusBadge.label}
							</span>
						</div>
					</div>

					{/* Info column */}
					<div className="flex min-w-0 flex-1 flex-col justify-between">
						<div>
							{/* Student name */}
							<p
								className="truncate font-bold"
								style={{
									fontSize: 14,
									color: '#111007',
									lineHeight: 1.15,
									letterSpacing: '-0.01em',
								}}
							>
								{fullName}
							</p>

							{/* Grade · Gender */}
							<p
								className="mt-0.5 flex gap-[5px]"
								style={{
									fontSize: 8.5,
									color: '#8A7430',
									letterSpacing: '0.05em',
								}}
							>
								<span>{classLevel}</span>
								<span>·</span>
								<span>{student?.gender || '—'}</span>
							</p>
						</div>

						{/* Fields grid */}
						<div className="mt-1.5 grid grid-cols-2" style={{ gap: '5px 8px' }}>
							<div className="flex flex-col gap-px">
								<span
									className="font-bold uppercase"
									style={{
										fontSize: 6,
										color: '#B8960C',
										opacity: 0.7,
										letterSpacing: '0.14em',
									}}
								>
									Class
								</span>
								<span
									className="truncate font-semibold"
									style={{ fontSize: 9, color: '#1A1400' }}
								>
									{classLevel}
								</span>
							</div>

							<div className="flex flex-col gap-px">
								<span
									className="font-bold uppercase"
									style={{
										fontSize: 6,
										color: '#B8960C',
										opacity: 0.7,
										letterSpacing: '0.14em',
									}}
								>
									Academic Year
								</span>
								<span
									className="truncate font-semibold"
									style={{ fontSize: 9, color: '#1A1400' }}
								>
									{academicYear || '—'}
								</span>
							</div>

							<div className="flex flex-col gap-px">
								<span
									className="font-bold uppercase"
									style={{
										fontSize: 6,
										color: '#B8960C',
										opacity: 0.7,
										letterSpacing: '0.14em',
									}}
								>
									Date of Birth
								</span>
								<span
									className="truncate font-semibold"
									style={{ fontSize: 9, color: '#1A1400' }}
								>
									{formatDate(student?.dateOfBirth)}
								</span>
							</div>

							<div className="flex flex-col gap-px">
								<span
									className="font-bold uppercase"
									style={{
										fontSize: 6,
										color: '#B8960C',
										opacity: 0.7,
										letterSpacing: '0.14em',
									}}
								>
									Enrollment
								</span>
								<span
									className="flex items-center gap-1 truncate font-semibold"
									style={{ fontSize: 9, color: '#1A1400' }}
								>
									{enrollmentStatus}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Footer — student ID number + validity + QR */}
				<div
					className="flex items-center justify-between"
					style={{
						marginTop: 8,
						padding: '7px 14px 0',
						borderTop: '0.5px solid rgba(212,175,55,0.2)',
					}}
				>
					{/* ID number */}
					<div className="flex flex-col gap-px">
						<span
							className="font-bold uppercase"
							style={{
								fontSize: 6,
								color: '#B8960C',
								opacity: 0.7,
								letterSpacing: '0.14em',
							}}
						>
							Student ID
						</span>
						<span
							className="font-bold"
							style={{
								fontFamily: "'Space Mono', monospace",
								fontSize: 11,
								color: '#1A1400',
								letterSpacing: '0.04em',
							}}
						>
							{prefixedStudentId}
						</span>
					</div>

					{/* Validity + QR */}
					<div className="flex items-center gap-[6px]">
						{validUntil && (
							<div className="flex flex-col items-end gap-0.5">
								<span
									className="uppercase"
									style={{
										fontSize: 6,
										color: '#B8960C',
										opacity: 0.7,
										letterSpacing: '0.12em',
									}}
								>
									Valid until
								</span>
								<span
									className="font-bold"
									style={{
										fontFamily: "'Space Mono', monospace",
										fontSize: 7.5,
										color: '#1A1400',
									}}
								>
									{formatDate(validUntil)}
								</span>
							</div>
						)}

						{/* QR code box */}
						<div
							className="flex items-center justify-center"
							style={{
								width: 38,
								height: 38,
								background: '#fff',
								borderRadius: 4,
								border: '0.5px solid rgba(212,175,55,0.25)',
								padding: 3,
								boxSizing: 'border-box',
							}}
						>
							{qrDataUrl && !qrError ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={qrDataUrl}
									alt="Verification QR code"
									className="h-full w-full"
								/>
							) : (
								<Fingerprint
									className="h-5 w-5"
									style={{ color: 'rgba(180,140,0,0.35)' }}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
