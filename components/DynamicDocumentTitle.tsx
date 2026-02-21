'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSchoolStore } from '@/store/schoolStore';

type DynamicDocumentTitleProps = {
	fallbackSchoolShortName: string;
};

const toReadablePageName = (pathname: string) => {
	if (!pathname || pathname === '/') return 'Home';
	const segments = pathname.split('/').filter(Boolean);
	const lastSegment = segments[segments.length - 1];
	if (!lastSegment) return 'Home';

	let decodedSegment = lastSegment;
	try {
		decodedSegment = decodeURIComponent(lastSegment);
	} catch {
		decodedSegment = lastSegment;
	}

	const pageName = decodedSegment
		.split(/[-_]+/g)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

	return pageName || 'Home';
};

export default function DynamicDocumentTitle({
	fallbackSchoolShortName,
}: DynamicDocumentTitleProps) {
	const pathname = usePathname();
	const school = useSchoolStore((state) => state.school);
	const schoolShortName =
		school?.shortName?.trim() || fallbackSchoolShortName.trim() || 'School';

	useEffect(() => {
		const pageName = toReadablePageName(pathname || '/');
		document.title = `${schoolShortName} | ${pageName}`;
	}, [pathname, schoolShortName]);

	return null;
}
