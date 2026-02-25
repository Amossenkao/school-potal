const encoder = new TextEncoder();
const decoder = new TextDecoder();

const fromBase64 = (input: string) => {
	const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
	const withPadding =
		normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
	const binary = atob(withPadding);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
};

const decodeJson = (segment: string) =>
	JSON.parse(decoder.decode(fromBase64(segment)));

const verifySignature = async (
	data: string,
	signature: Uint8Array,
	secret: string,
) => {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['verify'],
	);
	return crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
};

export type StreamTokenPayload = {
	v: number;
	sub: string;
	tenantKey: string;
	userId: string;
	channels: string[];
	iat: number;
	exp: number;
};

export const verifyStreamToken = async (
	token: string,
	secret: string,
	nowMs = Date.now(),
) => {
	try {
		const parts = String(token || '').split('.');
		if (parts.length !== 3) {
			return { valid: false as const, reason: 'malformed' };
		}

		const [encodedHeader, encodedPayload, encodedSignature] = parts;
		const header = decodeJson(encodedHeader) as { alg?: string; typ?: string };
		if (header?.alg !== 'HS256' || header?.typ !== 'JWT') {
			return { valid: false as const, reason: 'unsupported-jwt' };
		}

		const unsignedToken = `${encodedHeader}.${encodedPayload}`;
		const signature = fromBase64(encodedSignature);
		const isValid = await verifySignature(unsignedToken, signature, secret);
		if (!isValid) {
			return { valid: false as const, reason: 'invalid-signature' };
		}

		const payload = decodeJson(encodedPayload) as StreamTokenPayload;
		if (!payload || payload.v !== 1) {
			return { valid: false as const, reason: 'invalid-schema' };
		}

		const nowSeconds = Math.floor(nowMs / 1000);
		if (!payload.exp || nowSeconds >= Number(payload.exp)) {
			return { valid: false as const, reason: 'expired' };
		}

		if (
			!payload.tenantKey ||
			!payload.userId ||
			!Array.isArray(payload.channels) ||
			payload.channels.length === 0
		) {
			return { valid: false as const, reason: 'invalid-claims' };
		}

		return {
			valid: true as const,
			payload,
		};
	} catch {
		return { valid: false as const, reason: 'invalid-token' };
	}
};
