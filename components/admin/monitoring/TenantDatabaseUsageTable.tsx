'use client';

import { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, Search } from 'lucide-react';

interface TenantUsage {
	schoolId: string;
	schoolName?: string;
	databaseName?: string;
	storage?: string;
	storageBytes?: number;
	documents?: number;
	collections?: number;
	collectedAt?: string;
}

type SortKey = 'school' | 'storage';

export default function TenantDatabaseUsageTable({
	tenants = [],
	selectedSchoolId,
	onSelect,
}: {
	tenants: TenantUsage[];
	selectedSchoolId?: string;
	onSelect?: (schoolId: string) => void;
}) {
	const [query, setQuery] = useState('');
	const [sortKey, setSortKey] = useState<SortKey>('storage');

	const rows = useMemo(() => {
		const filtered = tenants.filter((tenant) => {
			const searchable = `${tenant.schoolName || ''} ${tenant.schoolId} ${tenant.databaseName || ''}`.toLowerCase();
			return searchable.includes(query.trim().toLowerCase());
		});

		return filtered.sort((a, b) => {
			if (sortKey === 'school') {
				return (a.schoolName || a.schoolId).localeCompare(b.schoolName || b.schoolId);
			}
			return (b.storageBytes ?? 0) - (a.storageBytes ?? 0);
		});
	}, [tenants, query, sortKey]);

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Tenant Database Usage</h2>
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
						<input
							className="w-full rounded-lg border border-gray-200 bg-transparent py-1.5 pl-8 pr-3 text-sm dark:border-gray-800"
							placeholder="Search school..."
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
					<select
						className="rounded-lg border border-gray-200 bg-transparent px-2 py-1.5 text-sm dark:border-gray-800"
						value={sortKey}
						onChange={(event) => setSortKey(event.target.value as SortKey)}
					>
						<option value="storage">Sort by size</option>
						<option value="school">Sort by school</option>
					</select>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead className="text-xs uppercase text-gray-400">
						<tr>
							<th className="pb-3 font-semibold">School</th>
							<th className="pb-3 font-semibold">Database</th>
							<th className="pb-3 text-right font-semibold">Documents</th>
							<th className="pb-3 text-right font-semibold">Database Size</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
						{rows.length === 0 ? (
							<tr>
								<td className="py-4 text-gray-500" colSpan={4}>
									No database metrics collected yet. Trigger a monitoring refresh to start collecting.
								</td>
							</tr>
						) : (
							rows.map((tenant) => {
								const isSelected = tenant.schoolId === selectedSchoolId;
								return (
									<tr
										key={tenant.schoolId}
										className={`cursor-pointer transition ${isSelected ? 'bg-[#465fff]/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
										onClick={() => onSelect?.(tenant.schoolId)}
									>
										<td className="py-3">
											<p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
												<ArrowDownWideNarrow className="h-3.5 w-3.5 text-gray-300" />
												{tenant.schoolName || tenant.schoolId}
											</p>
										</td>
										<td className="py-3 font-mono text-xs text-gray-500">{tenant.databaseName || '—'}</td>
										<td className="py-3 text-right text-gray-600 dark:text-gray-300">
											{(tenant.documents ?? 0).toLocaleString()}
										</td>
										<td className="py-3 text-right font-semibold text-gray-900 dark:text-white">
											{tenant.storage ?? '0 B'}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
