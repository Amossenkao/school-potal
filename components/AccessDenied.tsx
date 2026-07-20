import React from 'react';
import { ShieldX, ArrowLeft, Scissors } from 'lucide-react';

interface AccessDeniedProps {
	title?: string;
	message?: string;
	description?: string;
	showBackButton?: boolean;
}

export default function AccessDenied({
	title = 'Access Denied',
	message = "You don't have permission to access this page.",
	description = '',
	showBackButton = true,
}: AccessDeniedProps) {
	const handleGoBack = () => {
		window.history.back();
	};

	return (
		<div className="min-h-[60vh] bg-background flex items-center justify-center px-4">
			{/* keyframes for the stamp — respects prefers-reduced-motion via the motion-safe: variant below */}
			<style>{`
				@keyframes am-stamp-slam {
					0% { opacity: 0; transform: scale(1.6) rotate(4deg); }
					55% { opacity: 1; transform: scale(0.92) rotate(-11deg); }
					78% { transform: scale(1.05) rotate(-6deg); }
					100% { opacity: 1; transform: scale(1) rotate(-8deg); }
				}
			`}</style>

			<div
				className="relative w-full max-w-md overflow-hidden rounded-sm border border-border bg-card px-8 py-10 shadow-sm
					rotate-[-1deg] transition-transform duration-300 ease-out hover:rotate-0"
			>
				{/* watermark, quiet and low-opacity, reinforces "official document" without competing with the stamp */}
				<span
					aria-hidden="true"
					className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 rotate-[-8deg] select-none
						text-[5rem] font-black uppercase leading-none tracking-tighter text-foreground/[0.035] sm:text-[6.5rem]"
				>
					Denied
				</span>

				{/* form id tag, top-left corner */}
				<div className="mb-8 flex items-center justify-between">
					<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
						Form SM-403 · Access Log
					</span>
					<span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
						No. {Math.floor(Math.random() * 900000 + 100000)}
					</span>
				</div>

				<div className="flex flex-col items-center text-center">
					{/* the stamp */}
					<div
						className="mb-6 flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-double border-destructive text-destructive
							rotate-[-8deg] opacity-100 motion-safe:[animation:am-stamp-slam_0.6s_cubic-bezier(0.34,1.56,0.64,1)_0.05s_both]"
					>
						<div className="flex flex-col items-center gap-1">
							<ShieldX className="h-8 w-8" strokeWidth={2.5} />
							<span className="text-[9px] font-black uppercase tracking-[0.25em]">
								Denied
							</span>
						</div>
					</div>

					<h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						{title}
					</h1>

					<p className="text-base text-muted-foreground sm:text-lg">
						{message}
					</p>
				</div>

				{description && (
					<div className="relative mt-8 border-t border-dashed border-border pt-6">
						<Scissors
							aria-hidden="true"
							className="absolute -top-[9px] left-0 h-[18px] w-[18px] -translate-x-1/2 rotate-90 bg-card text-muted-foreground/40"
						/>
						<p className="text-center text-sm text-muted-foreground">
							<span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
								Note:
							</span>
							{description}
						</p>
					</div>
				)}

				{showBackButton && (
					<div className="mt-8 flex justify-center">
						<button
							onClick={handleGoBack}
							className="relative inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground
								transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
						>
							<span
								aria-hidden="true"
								className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-border bg-background"
							/>
							<ArrowLeft className="h-4 w-4" />
							Go Back
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
