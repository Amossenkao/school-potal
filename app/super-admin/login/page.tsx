'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function SuperAdminLoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState('super_admin');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		let cancelled = false;
		const checkSession = async () => {
			try {
				const response = await fetch('/api/superadmin/me', {
					credentials: 'include',
				});
				if (!cancelled && response.ok) {
					router.replace('/super-admin/dashboard');
				}
			} catch {
				// Ignore initial check failures.
			}
		};
		void checkSession();
		return () => {
			cancelled = true;
		};
	}, [router]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError('');
		setIsLoading(true);
		try {
			const response = await fetch('/api/superadmin/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ username, password }),
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok || payload?.success === false) {
				setError(payload?.message || 'Unable to login.');
				return;
			}
			router.replace('/super-admin/dashboard');
		} catch {
			setError('Network error while signing in.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,#0B3A6E_0%,#06152B_45%,#030A16_100%)] px-4 py-12 text-white">
			<div className="mx-auto mt-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4C542] text-[#071D39]">
						<ShieldCheck className="h-7 w-7" />
					</div>
					<h1 className="text-2xl font-semibold">Super Admin Login</h1>
					<p className="mt-2 text-sm text-white/75">Manage schools and tenant operations from one console.</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="username" className="mb-1 block text-sm font-medium text-white/90">
							Username
						</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							className="w-full rounded-xl border border-white/25 bg-[#0A2445]/70 px-4 py-3 text-sm outline-none transition focus:border-[#F4C542]"
							required
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1 block text-sm font-medium text-white/90">
							Password
						</label>
						<div className="relative">
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="w-full rounded-xl border border-white/25 bg-[#0A2445]/70 px-4 py-3 pr-11 text-sm outline-none transition focus:border-[#F4C542]"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword((value) => !value)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70"
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					{error && <p className="text-sm text-[#FCA5A5]">{error}</p>}

					<button
						type="submit"
						disabled={isLoading}
						className="w-full rounded-xl bg-[#F4C542] px-4 py-3 text-sm font-semibold text-[#071D39] transition hover:bg-[#F8D269] disabled:opacity-70"
					>
						{isLoading ? 'Signing in...' : 'Sign In'}
					</button>
				</form>
			</div>
		</div>
	);
}
