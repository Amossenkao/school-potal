import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseMessage } from '@/lib/parseMessage';
import CodeBlock from './CodeBlock';
import TableBlock from './TableBlock';

export default function SmartRenderer({ content }: { content: string }) {
	const blocks = parseMessage(content);

	return (
		<div className="flex flex-col gap-1 w-full max-w-full">
			{blocks.map((block, i) => {
				switch (block.type) {
					case 'code':
						return (
							<CodeBlock
								key={i}
								language={block.language}
								code={block.content}
							/>
						);

					case 'table':
						return (
							<TableBlock key={i} headers={block.headers} rows={block.rows} />
						);

					case 'json':
						return (
							<pre
								key={i}
								className="my-3 bg-zinc-950 text-green-400 p-4 rounded-lg overflow-x-auto text-sm border border-zinc-800"
							>
								{JSON.stringify(block.data, null, 2)}
							</pre>
						);

					default:
						return (
							<div
								key={i}
								className="prose prose-sm max-w-none text-inherit dark:prose-invert prose-p:leading-relaxed prose-pre:p-0"
							>
								<ReactMarkdown remarkPlugins={[remarkGfm]}>
									{block.content}
								</ReactMarkdown>
							</div>
						);
				}
			})}
		</div>
	);
}
