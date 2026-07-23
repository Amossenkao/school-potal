'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

export default function SuperAdminLoginPage() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [showPw, setShowPw] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const fillDemo = () => {
		setUsername('admin');
		setPassword('admin');
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'login',
					role: 'system_admin',
					username,
					password,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data?.error || 'Invalid credentials. Please try again.');
				return;
			}

			window.location.href = '/superadmin';
		} catch {
			setError('Something went wrong. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen bg-[#FAFBFC]">
			{/* Left branding panel */}
			<div className="hidden w-1/2 bg-[#111827] lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
				<div className="max-w-md text-center">
					<Link href="/" className="inline-block">
						<Image
							src="/images/SchoolMesh.png"
							alt="SchoolMesh"
							width={64}
							height={64}
							className="mx-auto mb-6 h-16 w-16 rounded-2xl object-contain"
							priority
						/>
					</Link>
					<Link href="/" className="inline-block">
						<h1 className="text-3xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
							School<span className="text-[#465fff]">Mesh</span>
						</h1>
					</Link>
					<p className="mt-3 text-gray-400 text-sm leading-relaxed">
						Platform administration portal for managing schools, tenants, and system configuration.
					</p>
					<div className="mt-10 flex items-center justify-center gap-8 text-xs text-gray-500">
						<div className="flex flex-col items-center gap-1">
							<span className="text-lg font-bold text-white">250+</span>
							<span>Schools</span>
						</div>
						<div className="h-8 w-px bg-white/10" />
						<div className="flex flex-col items-center gap-1">
							<span className="text-lg font-bold text-white">10K+</span>
							<span>Students</span>
						</div>
						<div className="h-8 w-px bg-white/10" />
						<div className="flex flex-col items-center gap-1">
							<span className="text-lg font-bold text-white">99.9%</span>
							<span>Uptime</span>
						</div>
					</div>
				</div>
			</div>

			{/* Right form panel */}
			<div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
				<div className="w-full max-w-sm">
					{/* Mobile logo */}
				<div className="mb-8 flex items-center gap-2.5 lg:hidden">
					<Link href="/" className="flex items-center gap-2.5">
						<Image
							src="/images/SchoolMesh.png"
							alt="SchoolMesh"
							width={36}
							height={36}
							className="h-9 w-9 rounded-lg object-contain"
							priority
						/>
						<span className="text-lg font-bold tracking-tight text-[#111827]">
							School<span className="text-[#465fff]">Mesh</span>
						</span>
					</Link>
				</div>

					<div className="mb-8">
						<p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#465fff]">
							Admin Access
						</p>
						<h2 className="text-2xl font-bold tracking-tight text-[#111827]">
							Sign in to dashboard
						</h2>
						<p className="mt-2 text-sm text-gray-500">
							Enter your platform credentials to continue.
						</p>
					</div>

					{error && (
						<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className="flex flex-col gap-5">
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="sa-username"
								className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Username
							</label>
							<input
								id="sa-username"
								type="text"
								required
								autoComplete="username"
								placeholder="Enter your username"
								value={username}
								onChange={(e) => { setUsername(e.target.value); setError(''); }}
								disabled={isLoading}
								className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 disabled:opacity-50"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="sa-password"
								className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
							>
								Password
							</label>
							<div className="relative">
								<input
									id="sa-password"
									type={showPw ? 'text' : 'password'}
									required
									autoComplete="current-password"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => { setPassword(e.target.value); setError(''); }}
									disabled={isLoading}
									className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#465fff] focus:ring-2 focus:ring-[#465fff]/10 disabled:opacity-50"
								/>
								<button
									type="button"
									onClick={() => setShowPw((p) => !p)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
									aria-label={showPw ? 'Hide password' : 'Show password'}
								>
									{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={isLoading || !username || !password}
							className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[#111827] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/10 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<LogIn className="h-4 w-4" />
							)}
							{isLoading ? 'Signing in...' : 'Sign in'}
						</button>

						<button
							type="button"
							onClick={fillDemo}
							className="w-full rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
						>
							Use Demo Credentials
						</button>
					</form>

					<p className="mt-8 text-center text-xs text-gray-400">
						&copy; {new Date().getFullYear()} SchoolMesh. All rights reserved.
					</p>
				</div>
			</div>
		</div>
	);
}
