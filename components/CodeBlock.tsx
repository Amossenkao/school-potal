import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { Check, Copy } from 'lucide-react';

export default function CodeBlock({
	language,
	code,
}: {
	language: string;
	code: string;
}) {
	const [html, setHtml] = useState<string>('');
	const [isCopied, setIsCopied] = useState(false);

	useEffect(() => {
		async function highlight() {
			try {
				const out = await codeToHtml(code, {
					lang: language || 'text',
					theme: 'github-dark',
				});
				setHtml(out);
			} catch (error) {
				const fallback = await codeToHtml(code, {
					lang: 'text',
					theme: 'github-dark',
				});
				setHtml(fallback);
			}
		}
		highlight();
	}, [code, language]);

	const handleCopy = () => {
		navigator.clipboard.writeText(code).catch(console.error);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<div className="my-3 rounded-lg overflow-hidden border border-border/50 bg-[#24292e]">
			{/* Header bar with Copy Button */}
			<div className="flex items-center justify-between px-4 py-2 bg-black/40">
				<span className="text-xs font-mono text-gray-400">
					{language || 'text'}
				</span>
				<button
					type="button"
					onClick={handleCopy}
					className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-gray-100 transition-colors"
					aria-label="Copy code"
				>
					{isCopied ? (
						<Check size={13} className="text-emerald-400" />
					) : (
						<Copy size={13} />
					)}
					{isCopied ? 'Copied!' : 'Copy code'}
				</button>
			</div>

			{/* Code Content */}
			{html ? (
				<div
					className="overflow-x-auto p-4 text-sm [&>pre]:!bg-transparent"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className="p-4 text-sm overflow-x-auto text-gray-300">
					<code>{code}</code>
				</pre>
			)}
		</div>
	);
}
