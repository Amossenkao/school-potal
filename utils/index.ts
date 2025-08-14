export function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;

	try {
		const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
		return match ? decodeURIComponent(match[2]) : null;
	} catch (error) {
		console.error('Error reading cookie:', name, error);
		return null;
	}
}
