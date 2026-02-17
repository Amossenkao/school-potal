'use client';

import { useEffect } from 'react';

interface FullscreenPdfViewerProps {
	isOpen: boolean;
	pdfUrl: string | null;
	onClose: () => void;
	downloadUrl?: string | null;
}

export default function FullscreenPdfViewer({
	isOpen,
	pdfUrl,
	onClose,
	downloadUrl,
}: FullscreenPdfViewerProps) {
	const resolvedPdfUrl = pdfUrl || downloadUrl || null;

	useEffect(() => {
		if (!isOpen || !resolvedPdfUrl) return;
		if (typeof window === 'undefined') return;
		try {
			const popup = window.open(
				resolvedPdfUrl,
				'_blank',
				'noopener,noreferrer',
			);
			if (!popup) {
				window.location.assign(resolvedPdfUrl);
			}
		} catch (error) {
			console.error('Failed to open PDF in current tab:', error);
		}
		onClose();
	}, [isOpen, onClose, resolvedPdfUrl]);

	return null;
}
