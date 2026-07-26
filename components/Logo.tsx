'use client';

import { useSchoolStore } from '@/store/schoolStore';

export default function Logo() {
	const currentSchool = useSchoolStore((state) => state.school);
	const schoolName = currentSchool?.identity.shortName || currentSchool?.identity.name || '';
	const schoolInitials = currentSchool?.identity.initials || '';

	return (
		<div className="flex items-center gap-3 cursor-pointer">
			<div className="h-12 w-12 flex items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/40">
				{currentSchool?.branding.logoUrl ? (
					<img src={currentSchool.branding.logoUrl} alt={`${schoolName || 'School'} logo`} className="h-full w-full object-cover" />
				) : null}
			</div>
			<div className="min-w-0">
				{schoolName ? (
					<>
						<h1 className="text-xl font-bold hidden lg:block truncate">
							{schoolName}
						</h1>
						<h1 className="text-xl font-bold lg:hidden truncate">
							{schoolInitials || schoolName}
						</h1>
						<p className="text-xs text-muted-foreground hidden lg:block truncate">
							{currentSchool?.identity.slogan || currentSchool?.identity.slogan || 'Excellence in Education'}
						</p>
					</>
				) : (
					<div className="flex flex-col gap-2">
						<div className="h-4 w-24 animate-pulse rounded bg-muted" />
						<div className="hidden h-3 w-28 animate-pulse rounded bg-muted lg:block" />
					</div>
				)}
			</div>
		</div>
	);
}
