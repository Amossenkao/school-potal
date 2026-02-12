'use client';

import { useCallback, useEffect, useRef } from 'react';

interface FullscreenPdfViewerProps {
	isOpen: boolean;
	pdfUrl: string | null;
	title: string;
	onClose: () => void;
	downloadUrl?: string | null;
	downloadFileName?: string;
}

export default function FullscreenPdfViewer({
	isOpen,
	pdfUrl,
	title,
	onClose,
	downloadUrl,
	downloadFileName,
}: FullscreenPdfViewerProps) {
	const historyEntryActiveRef = useRef(false);

	useEffect(() => {
		if (!isOpen) return;
		if (typeof window === 'undefined') return;
		historyEntryActiveRef.current = true;
		window.history.pushState(
			{
				...(window.history.state || {}),
				__fullscreenPdfViewer: true,
				__fullscreenPdfViewerTs: Date.now(),
			},
			'',
			window.location.href,
		);

		const handlePopState = () => {
			historyEntryActiveRef.current = false;
			onClose();
		};

		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [isOpen, onClose]);

	useEffect(() => {
		if (!isOpen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isOpen]);

	const handleClose = useCallback(() => {
		if (!isOpen) return;
		if (historyEntryActiveRef.current && typeof window !== 'undefined') {
			historyEntryActiveRef.current = false;
			window.history.back();
			return;
		}
		onClose();
	}, [isOpen, onClose]);

	const handleDownload = useCallback(() => {
		if (!downloadUrl) return;
		const link = document.createElement('a');
		link.href = downloadUrl;
		if (downloadFileName) {
			link.download = downloadFileName;
		}
		document.body.appendChild(link);
		link.click();
		link.remove();
	}, [downloadFileName, downloadUrl]);

	if (!isOpen || !pdfUrl) return null;

	return (
		<div className="fixed inset-0 z-[90] bg-background flex flex-col">
			<div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
				<button
					type="button"
					onClick={handleClose}
					className="px-3 py-2 rounded border border-border bg-muted text-muted-foreground text-sm hover:bg-muted/80"
				>
					Back
				</button>
				<h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
				{downloadUrl ? (
					<button
						type="button"
						onClick={handleDownload}
						className="px-3 py-2 rounded border border-primary bg-primary text-primary-foreground text-sm hover:bg-primary/90"
					>
						Download
					</button>
				) : (
					<div className="w-[84px]" />
				)}
			</div>
			<div className="flex-1 bg-muted/30">
				<iframe
					title={title}
					className="w-full h-full"
					style={{ border: 'none' }}
					src={pdfUrl}
				/>
			</div>
		</div>
	);
}
