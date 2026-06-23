const LOOPBACK_HOSTS = new Set([
	'localhost',
	'127.0.0.1',
	'::1',
	'0:0:0:0:0:0:0:1',
	'0.0.0.0',
]);

export const normalizeHost = (value?: string | null): string | undefined => {
	let host = String(value || '')
		.trim()
		.toLowerCase();
	if (!host) return undefined;

	if (host.includes('://')) {
		try {
			host = new URL(host).host.toLowerCase();
		} catch {
			// Keep raw value if URL parsing fails.
		}
	}

	const pathIndex = host.indexOf('/');
	if (pathIndex >= 0) {
		host = host.slice(0, pathIndex);
	}

	if (host.startsWith('[')) {
		const closingBracket = host.indexOf(']');
		if (closingBracket > 0) {
			const ipv6Host = host.slice(1, closingBracket);
			const suffix = host.slice(closingBracket + 1);
			if (!suffix || /^:\d+$/.test(suffix)) {
				host = ipv6Host;
			}
		}
	} else {
		const firstColon = host.indexOf(':');
		const lastColon = host.lastIndexOf(':');
		if (firstColon > -1 && firstColon === lastColon) {
			const maybePort = host.slice(lastColon + 1);
			if (/^\d+$/.test(maybePort)) {
				host = host.slice(0, lastColon);
			}
		}
	}

	if (LOOPBACK_HOSTS.has(host)) {
		return 'localhost';
	}

	return host || undefined;
};

export const isLocalHost = (value?: string | null) =>
	normalizeHost(value) === 'localhost';
