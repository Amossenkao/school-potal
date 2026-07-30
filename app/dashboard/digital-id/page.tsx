'use client';

import { Shield } from 'lucide-react';

export default function DigitalIdPage() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4">
			<div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card/90 px-8 py-10 text-center shadow-sm">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
					<Shield className="h-8 w-8 text-primary" />
				</div>
				<h1 className="text-2xl font-bold text-foreground">Digital ID</h1>
				<p className="max-w-sm text-muted-foreground">
					This feature is coming soon. You will be able to generate and manage digital IDs here.
				</p>
			</div>
		</div>
	);
}
