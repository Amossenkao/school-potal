import { NextRequest, NextResponse } from 'next/server';
import { getSchoolProfile } from '@/lib/mongoose';
import { redis } from '@/lib/redis';
import {
	getTenantSyncChannel,
	getUserSyncChannel,
	resolveTenantSyncKey,
	type SyncEvent,
} from '@/lib/realtimeSync';
import { authorizeUser } from '@/proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SSE_HEADERS = {
	'Content-Type': 'text/event-stream; charset=utf-8',
	'Cache-Control': 'no-cache, no-transform',
	Connection: 'keep-alive',
	'X-Accel-Buffering': 'no',
} as const;

const KEEP_ALIVE_MS = 25_000;

export async function GET(request: NextRequest) {
	try {
		const currentUser = await authorizeUser(request);
		if (!currentUser) {
			return NextResponse.json(
				{ success: false, message: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const schoolProfileRaw = await getSchoolProfile();
		const schoolProfile =
			typeof schoolProfileRaw === 'string'
				? JSON.parse(schoolProfileRaw)
				: schoolProfileRaw;
		const tenantKey = resolveTenantSyncKey({
			schoolProfile,
			tenantId: currentUser.tenantId,
			host: request.headers.get('host'),
		});
		if (!tenantKey) {
			return NextResponse.json(
				{
					success: false,
					message: 'Unable to resolve tenant channel.',
				},
				{ status: 500 },
			);
		}

		const userId = String(currentUser.userId || currentUser.id || '').trim();
		if (!userId) {
			return NextResponse.json(
				{
					success: false,
					message: 'Unable to resolve user channel.',
				},
				{ status: 500 },
			);
		}

		const channels = Array.from(
			new Set([
				getTenantSyncChannel(tenantKey),
				getUserSyncChannel(tenantKey, userId),
			]),
		);

		const encoder = new TextEncoder();
		let streamClosed = false;
		let cleanedUp = false;
		let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
		const subscriber = redis.subscribe<SyncEvent>(channels);

		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				const write = (chunk: string) => {
					if (streamClosed) return;
					try {
						controller.enqueue(encoder.encode(chunk));
					} catch (error) {
						console.warn('[sync-events] Failed to enqueue chunk:', error);
					}
				};

				const sendEvent = (eventName: string, payload: unknown) => {
					let data = '';
					try {
						data = JSON.stringify(payload);
					} catch {
						data = JSON.stringify({
							error: 'serialization_error',
							event: eventName,
						});
					}
					write(`event: ${eventName}\n`);
					write(`data: ${data}\n\n`);
				};

				const cleanup = async () => {
					if (cleanedUp) return;
					cleanedUp = true;
					streamClosed = true;

					if (keepAliveTimer) {
						clearInterval(keepAliveTimer);
						keepAliveTimer = null;
					}

					request.signal.removeEventListener('abort', abortHandler);
					subscriber.removeAllListeners();
					await subscriber.unsubscribe().catch(() => undefined);

					try {
						controller.close();
					} catch {
						// Stream may already be closed.
					}
				};

				const abortHandler = () => {
					void cleanup();
				};

				request.signal.addEventListener('abort', abortHandler, { once: true });

				subscriber.on('message', ({ channel, message }) => {
					sendEvent('sync', { channel, event: message });
				});

				subscriber.on('error', (error) => {
					sendEvent('error', {
						message: 'subscription_error',
						details: error instanceof Error ? error.message : String(error),
					});
					void cleanup();
				});

				sendEvent('ready', {
					tenantKey,
					channels,
					connectedAt: new Date().toISOString(),
				});

				keepAliveTimer = setInterval(() => {
					write(`: keepalive ${Date.now()}\n\n`);
				}, KEEP_ALIVE_MS);
			},
			cancel() {
				streamClosed = true;
				subscriber.removeAllListeners();
				void subscriber.unsubscribe().catch(() => undefined);
			},
		});

		return new Response(stream, {
			headers: SSE_HEADERS,
		});
	} catch (error) {
		console.error('[sync-events] Failed to start sync stream:', error);
		return NextResponse.json(
			{ success: false, message: 'Failed to initialize sync stream.' },
			{ status: 500 },
		);
	}
}
