const TOKEN_SCHEMA_VERSION = 1;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (input: Uint8Array) => {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(input).toString('base64');
	}
	let binary = '';
	for (const byte of input) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
};

const fromBase64 = (input: string) => {
	if (typeof Buffer !== 'undefined') {
		return new Uint8Array(Buffer.from(input, 'base64'));
	}
	const binary = atob(input);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
};

const toBase64Url = (input: Uint8Array | string) => {
	const bytes = typeof input === 'string' ? encoder.encode(input) : input;
	return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (input: string) => {
	const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
	const withPadding =
		normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
	return fromBase64(withPadding);
};

const createSigningKey = async (secret: string) =>
	crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify'],
	);

const signMessage = async (message: string, secret: string) => {
	const key = await createSigningKey(secret);
	return crypto.subtle.sign('HMAC', key, encoder.encode(message));
};

const verifyMessage = async (
	message: string,
	signature: ArrayBuffer,
	secret: string,
) => {
	const key = await createSigningKey(secret);
	return crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));
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

export const createStreamToken = async (
	payload: Omit<StreamTokenPayload, 'v' | 'iat' | 'exp'>,
	options: {
		secret: string;
		expiresInSeconds: number;
		nowMs?: number;
	},
) => {
	const nowSeconds = Math.floor((options.nowMs ?? Date.now()) / 1000);
	const fullPayload: StreamTokenPayload = {
		v: TOKEN_SCHEMA_VERSION,
		...payload,
		iat: nowSeconds,
		exp: nowSeconds + options.expiresInSeconds,
	};
	const header = { alg: 'HS256', typ: 'JWT' };
	const encodedHeader = toBase64Url(JSON.stringify(header));
	const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
	const unsignedToken = `${encodedHeader}.${encodedPayload}`;
	const signature = await signMessage(unsignedToken, options.secret);
	return `${unsignedToken}.${toBase64Url(new Uint8Array(signature))}`;
};

export const verifyStreamToken = async (
	token: string,
	secret: string,
	nowMs = Date.now(),
) => {
	const parts = String(token || '').split('.');
	if (parts.length !== 3) {
		return { valid: false as const, reason: 'malformed' };
	}
	const [encodedHeader, encodedPayload, encodedSignature] = parts;
	const unsignedToken = `${encodedHeader}.${encodedPayload}`;

	const signature = Uint8Array.from(fromBase64Url(encodedSignature)).buffer;
	const isSignatureValid = await verifyMessage(unsignedToken, signature, secret);
	if (!isSignatureValid) {
		return { valid: false as const, reason: 'invalid-signature' };
	}

	try {
		const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload)));
		if (!payload || payload.v !== TOKEN_SCHEMA_VERSION) {
			return { valid: false as const, reason: 'invalid-schema' };
		}
		if (!payload.exp || Math.floor(nowMs / 1000) >= Number(payload.exp)) {
			return { valid: false as const, reason: 'expired' };
		}
		return {
			valid: true as const,
			payload: payload as StreamTokenPayload,
		};
	} catch {
		return { valid: false as const, reason: 'invalid-payload' };
	}
};
