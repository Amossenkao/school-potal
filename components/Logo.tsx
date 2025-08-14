'use client';

import { useSchoolStore } from '@/store/schoolStore';

export default function Logo() {
	const currentSchool = useSchoolStore((state) => state.school);

	return (
		<div className="flex items-center gap-3 cursor-pointer">
			<div className="h-12 w-12 flex items-center justify-center">
				<img src={currentSchool?.logoUrl} />
			</div>
			<div>
				<h1 className="text-xl font-bold hidden lg:block">
					{currentSchool.shortName}
				</h1>
				<h1 className="text-xl font-bold lg:hidden">
					{currentSchool.initials}
				</h1>
				<p className="text-xs text-muted-foreground hidden sm:block">
					{currentSchool?.slogan || 'Excellence in Education'}
				</p>
			</div>
		</div>
	);
}
