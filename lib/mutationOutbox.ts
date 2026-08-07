// lib/mutationOutbox.ts
// Page-owned offline mutation capture. Wires the sync-engine outbox writer so
// mutations that fail at the network layer (or are attempted while offline
// without service-worker coverage) are queued with a stable idempotency key
// and replayed by flushOutboxOnce once connectivity returns. The server's
// idempotency layer dedupes the replay when the original request actually
// applied, giving at-least-once delivery with exactly-once effect.

import { enqueueOutbox } from '@/utils/domainSyncCache';
import { requestOutboxFlush } from '@/lib/outboxSync';

const IDEMPOTENCY_HEADERS = ['x-idempotency-key', 'x-offline-sync-id'];

const randomId = () =>
	typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const ensureMutationIdempotencyKey = (headers: Headers): string => {
	for (const name of IDEMPOTENCY_HEADERS) {
		const value = headers.get(name);
		if (value && String(value).trim()) return String(value).trim();
	}
	const key = `sync-${randomId()}`;
	headers.set('x-idempotency-key', key);
	return key;
};

const headersToRecord = (headers: Headers): Record<string, string> => {
	const record: Record<string, string> = {};
	headers.forEach((value, key) => {
		record[key] = value;
	});
	return record;
};

/**
 * Enqueues a mutation into the page-owned outbox and returns a 202 so call
 * sites treat it like the service worker's offline-queue response. The
 * request is expected to already carry an idempotency key (see
 * ensureMutationIdempotencyKey) so the outbox replay dedupes against the
 * original attempt.
 */
export const queueOfflineMutation = async (
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> => {
	try {
		const request =
			input instanceof Request ? input : new Request(input, init);
		const id = ensureMutationIdempotencyKey(request.headers);
		const body = await request.clone().text();
		await enqueueOutbox({
			id,
			url: request.url,
			method: request.method,
			headers: headersToRecord(request.headers),
			body,
		});
		requestOutboxFlush();
		return new Response(JSON.stringify({ queued: true, queueId: id }), {
			status: 202,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.warn('Failed to queue offline mutation to outbox:', error);
		return new Response(
			JSON.stringify({
				message:
					'You are offline. Please connect to the internet and try again.',
			}),
			{ status: 503, headers: { 'Content-Type': 'application/json' } },
		);
	}
};
