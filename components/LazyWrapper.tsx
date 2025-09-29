// components/LazyWrapper.tsx
import { Suspense, ReactNode } from 'react';

export default function LazyWrapper({ children }: { children: ReactNode }) {
	return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
