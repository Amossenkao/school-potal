export type Block =
	| { type: 'text'; content: string }
	| { type: 'code'; language: string; content: string }
	| { type: 'table'; headers: string[]; rows: string[][] }
	| { type: 'json'; data: any };

export function parseMessage(content: string): Block[] {
	const trimmed = content.trim();

	// 1. JSON DETECTION (Whole message)
	try {
		if (
			(trimmed.startsWith('{') || trimmed.startsWith('[')) &&
			(trimmed.endsWith('}') || trimmed.endsWith(']'))
		) {
			return [{ type: 'json', data: JSON.parse(trimmed) }];
		}
	} catch {}

	const blocks: Block[] = [];

	// 2. CODE BLOCK DETECTION
	const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
	let lastIndex = 0;
	let match;

	while ((match = codeRegex.exec(content))) {
		// Capture text before the code block
		if (match.index > lastIndex) {
			blocks.push({
				type: 'text',
				content: content.slice(lastIndex, match.index),
			});
		}
		blocks.push({
			type: 'code',
			language: match[1] || 'text',
			content: match[2].trim(),
		});
		lastIndex = codeRegex.lastIndex;
	}

	// Capture remaining text after the last code block
	if (lastIndex < content.length) {
		blocks.push({
			type: 'text',
			content: content.slice(lastIndex),
		});
	}

	// 3. TABLE DETECTION (Processed within the extracted text blocks)
	const finalBlocks: Block[] = [];
	const tableRegex =
		/(\|.*\|[\s\S]*?\n)(\|[-: ]+\|[\s\S]*?\n)(\|.*\|[\s\S]*?)(?=\n\n|$)/g;

	for (const block of blocks) {
		if (block.type !== 'text') {
			finalBlocks.push(block);
			continue;
		}

		let tLast = 0;
		let tMatch;
		while ((tMatch = tableRegex.exec(block.content))) {
			if (tMatch.index > tLast) {
				finalBlocks.push({
					type: 'text',
					content: block.content.slice(tLast, tMatch.index),
				});
			}

			const tableText = tMatch[0];
			const lines = tableText
				.split('\n')
				.filter((l) => l.trim().startsWith('|'));

			if (lines.length >= 3) {
				const headers = lines[0]
					.split('|')
					.map((h) => h.trim())
					.filter(Boolean);
				const rows = lines.slice(2).map((line) =>
					line
						.split('|')
						.map((c) => c.trim())
						.filter(Boolean),
				);
				finalBlocks.push({ type: 'table', headers, rows });
			} else {
				finalBlocks.push({ type: 'text', content: tMatch[0] });
			}
			tLast = tableRegex.lastIndex;
		}

		if (tLast < block.content.length) {
			finalBlocks.push({
				type: 'text',
				content: block.content.slice(tLast),
			});
		}
	}

	// Filter out empty text blocks
	return finalBlocks.filter(
		(b) => b.type !== 'text' || b.content.trim() !== '',
	);
}
