// components/LazyWrapper.tsx
import { Suspense, ReactNode } from 'react';

export default function LazyWrapper({ children }: { children: ReactNode }) {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-[10rem] items-center justify-center">
					<div className="flex items-center gap-2">
						<span className="loader-dot" />
						<span className="loader-dot loader-dot-delay-1" />
						<span className="loader-dot loader-dot-delay-2" />
					</div>
				</div>
			}
		>
			{children}
		</Suspense>
	);
}
