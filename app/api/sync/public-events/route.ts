import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyStreamToken } from '@/lib/streamToken';
import type { SyncEvent } from '@/lib/realtimeSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SSE_HEADERS = {
	'Content-Type': 'text/event-stream; charset=utf-8',
	'Cache-Control': 'no-cache, no-transform',
	Connection: 'keep-alive',
	'X-Accel-Buffering': 'no',
} as const;

const KEEP_ALIVE_MS = 25_000;
const PUBLIC_CHANNEL_PREFIX = 'sync:tenant-public:';

const normalizeChannelName = (channel: unknown) =>
	String(channel || '')
		.trim()
		.toLowerCase();

const resolveToken = (request: NextRequest) => {
	const fromQuery = String(request.nextUrl.searchParams.get('token') || '').trim();
	if (fromQuery) return fromQuery;
	const authHeader = String(request.headers.get('authorization') || '').trim();
	if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
	return authHeader.slice('bearer '.length).trim();
};

export async function GET(request: NextRequest) {
	try {
		const secret = String(process.env.SYNC_STREAM_JWT_SECRET || '').trim();
		if (!secret) {
			return NextResponse.json(
				{
					success: false,
					message: 'SYNC_STREAM_JWT_SECRET is missing.',
				},
				{ status: 500 },
			);
		}

		const token = resolveToken(request);
		if (!token) {
			return NextResponse.json(
				{ success: false, message: 'Missing stream token.' },
				{ status: 401 },
			);
		}
		const verification = await verifyStreamToken(token, secret);
		if (!verification.valid) {
			return NextResponse.json(
				{
					success: false,
					message: 'Invalid stream token.',
					reason: verification.reason,
				},
				{ status: 401 },
			);
		}

		const channels = Array.from(
			new Set(
				(verification.payload.channels || [])
					.map((channel) => normalizeChannelName(channel))
					.filter(
						(channel) =>
							Boolean(channel) && channel.startsWith(PUBLIC_CHANNEL_PREFIX),
					),
			),
		);
		if (channels.length === 0) {
			return NextResponse.json(
				{ success: false, message: 'No public channels in stream token.' },
				{ status: 401 },
			);
		}

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
						console.warn('[sync-public-events] Failed to enqueue chunk:', error);
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
					tenantKey: verification.payload.tenantKey,
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
		console.error(
			'[sync-public-events] Failed to start public sync stream:',
			error,
		);
		return NextResponse.json(
			{ success: false, message: 'Failed to initialize public sync stream.' },
			{ status: 500 },
		);
	}
}
