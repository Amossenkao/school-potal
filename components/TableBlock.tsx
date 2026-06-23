import React from 'react';

export default function TableBlock({
	headers,
	rows,
}: {
	headers: string[];
	rows: string[][];
}) {
	return (
		<div className="overflow-x-auto my-3 rounded-lg border border-border">
			<table className="w-full text-sm text-left">
				<thead className="bg-muted/50 text-muted-foreground border-b border-border">
					<tr>
						{headers.map((h, i) => (
							<th key={i} className="px-4 py-2 font-medium">
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{rows.map((row, i) => (
						<tr key={i} className="hover:bg-muted/20 transition-colors">
							{row.map((cell, j) => (
								<td key={j} className="px-4 py-2 text-foreground">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
