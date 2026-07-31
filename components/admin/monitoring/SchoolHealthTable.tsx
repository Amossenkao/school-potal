import type { MonitoringDashboardData } from './types';

export default function SchoolHealthTable({ data }: { data: MonitoringDashboardData }) {
	const schools = data.errors?.affectedSchools ?? [];

	return (
		<div className="rounded-xl border border-gray-200 bg-card p-5 dark:border-gray-800">
			<h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Tenant-Aware Monitoring</h2>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead className="text-xs uppercase text-gray-400">
						<tr>
							<th className="pb-3 font-semibold">School</th>
							<th className="pb-3 font-semibold">Errors</th>
							<th className="pb-3 font-semibold">Module</th>
							<th className="pb-3 font-semibold">Status</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
						{schools.length === 0 ? (
							<tr>
								<td className="py-4 text-gray-500" colSpan={4}>No tenant-specific incidents reported.</td>
							</tr>
						) : (
							schools.map((school) => (
								<tr key={school}>
									<td className="py-3 font-medium text-gray-900 dark:text-white">{school}</td>
									<td className="py-3 text-gray-600 dark:text-gray-300">{data.errors?.last24Hours ?? 0}</td>
									<td className="py-3 text-gray-600 dark:text-gray-300">Application</td>
									<td className="py-3">
										<span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Needs review</span>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
