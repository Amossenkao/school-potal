import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression cover for the delta pagination cursor.
 *
 * The client used to advance its cursor (and the next `sinceSeq`) to the
 * server's `currentSeq` — the domain head — after applying only the first
 * page. Any change queued behind `hasMore` was then skipped permanently,
 * which is precisely the "client was offline for a while" case the delta
 * protocol exists to serve.
 */

const cursors = new Map<string, number>();

vi.mock('@/store/schoolStore', () => ({
	getClientSyncSeq: (domain: string, year: string) =>
		cursors.get(`${domain}:${year}`) ?? 0,
	useSchoolStore: {
		getState: () => ({
			setSyncSeqForYear: (year: string, patch: Record<string, number>) => {
				for (const [domain, seq] of Object.entries(patch)) {
					const key = `${domain}:${year}`;
					// Mirrors the store's monotonic-max semantics.
					cursors.set(key, Math.max(cursors.get(key) ?? 0, seq));
				}
			},
			mergeGradesForYear: vi.fn(),
			setGradesForYear: vi.fn(),
		}),
	},
}));

vi.mock('@/lib/syncMetrics', () => ({ reportSyncMetric: vi.fn() }));

const YEAR = '2026-2027';

/** A delta server holding `total` changes, served `pageSize` at a time. */
const makeDeltaServer = (total: number, pageSize: number) => {
	const requests: number[] = [];
	const fetchMock = vi.fn(async (url: string) => {
		const params = new URL(url, 'http://localhost').searchParams;
		const sinceSeq = Number(params.get('sinceSeq'));
		requests.push(sinceSeq);

		const changes = [];
		for (let seq = sinceSeq + 1; seq <= Math.min(sinceSeq + pageSize, total); seq++) {
			changes.push({
				seq,
				op: 'update',
				documentId: `doc-${seq}`,
				documentType: 'Grade',
				document: [{ _id: `doc-${seq}`, studentId: 's1', seq }],
				createdAt: new Date().toISOString(),
			});
		}
		const nextSeq = changes.length > 0 ? changes[changes.length - 1].seq : sinceSeq;

		return {
			ok: true,
			json: async () => ({
				success: true,
				domain: 'grades',
				academicYear: YEAR,
				sinceSeq,
				nextSeq,
				currentSeq: total,
				hasMore: nextSeq < total,
				changes,
			}),
		};
	});
	return { fetchMock, requests };
};

beforeEach(() => {
	cursors.clear();
	vi.resetModules();
});

describe('reconcileDomain delta pagination', () => {
	it('walks every page instead of jumping to the domain head', async () => {
		const { fetchMock, requests } = makeDeltaServer(1200, 500);
		vi.stubGlobal('fetch', fetchMock);
		cursors.set(`grades:${YEAR}`, 0);
		// A non-zero cursor selects the delta path; zero would snapshot instead.
		cursors.set(`grades:${YEAR}`, 1);

		const { reconcileDomain } = await import('@/lib/clientSync');
		const result = await reconcileDomain('grades', YEAR);

		expect(result.action).toBe('applied');
		// Pages must be requested from where the previous one ended: 1 → 501 → 1001.
		expect(requests).toEqual([1, 501, 1001]);
		expect(cursors.get(`grades:${YEAR}`)).toBe(1200);
	});

	it('applies every change across pages exactly once', async () => {
		const { fetchMock } = makeDeltaServer(1200, 500);
		vi.stubGlobal('fetch', fetchMock);
		cursors.set(`grades:${YEAR}`, 1);

		const applied: number[] = [];
		const { useSchoolStore } = await import('@/store/schoolStore');
		(useSchoolStore.getState as any) = () => ({
			setSyncSeqForYear: (year: string, patch: Record<string, number>) => {
				for (const [domain, seq] of Object.entries(patch)) {
					const key = `${domain}:${year}`;
					cursors.set(key, Math.max(cursors.get(key) ?? 0, seq));
				}
			},
			mergeGradesForYear: (_year: string, grades: any[]) => {
				grades.forEach((g) => applied.push(g.seq));
			},
			setGradesForYear: vi.fn(),
		});

		const { reconcileDomain } = await import('@/lib/clientSync');
		await reconcileDomain('grades', YEAR);

		expect(applied).toHaveLength(1199);
		expect(new Set(applied).size).toBe(1199);
		expect(Math.min(...applied)).toBe(2);
		expect(Math.max(...applied)).toBe(1200);
	});

	it('falls back to the highest returned seq when the server omits nextSeq', async () => {
		// Backwards compatibility: an older server returns only currentSeq.
		const requests: number[] = [];
		const fetchMock = vi.fn(async (url: string) => {
			const sinceSeq = Number(
				new URL(url, 'http://localhost').searchParams.get('sinceSeq'),
			);
			requests.push(sinceSeq);
			const changes = [];
			for (let seq = sinceSeq + 1; seq <= Math.min(sinceSeq + 2, 4); seq++) {
				changes.push({
					seq,
					op: 'update',
					documentId: `doc-${seq}`,
					document: [{ _id: `doc-${seq}`, seq }],
					createdAt: new Date().toISOString(),
				});
			}
			return {
				ok: true,
				json: async () => ({
					success: true,
					domain: 'grades',
					academicYear: YEAR,
					sinceSeq,
					currentSeq: 4,
					hasMore: sinceSeq + 2 < 4,
					changes,
				}),
			};
		});
		vi.stubGlobal('fetch', fetchMock);
		cursors.set(`grades:${YEAR}`, 0);
		cursors.set(`grades:${YEAR}`, 1);

		const { reconcileDomain } = await import('@/lib/clientSync');
		await reconcileDomain('grades', YEAR);

		expect(requests).toEqual([1, 3]);
		expect(cursors.get(`grades:${YEAR}`)).toBe(4);
	});
});
