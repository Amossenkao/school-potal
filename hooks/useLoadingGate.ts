'use client';

import { useEffect, useState } from 'react';

export const LOADING_POLICY = {
	spinnerDelayMs: 280,
	routeSpinnerDelayMs: 320,
	authTimeoutMs: 4500,
	offlineRestoreTimeoutMs: 5000,
	redirectTimeoutMs: 4500,
	loginBootstrapTimeoutMs: 1400,
} as const;

type UseLoadingGateOptions = {
	active: boolean;
	delayMs?: number;
	timeoutMs?: number;
};

export function useLoadingGate({
	active,
	delayMs = LOADING_POLICY.spinnerDelayMs,
	timeoutMs,
}: UseLoadingGateOptions) {
	const [show, setShow] = useState(false);
	const [timedOut, setTimedOut] = useState(false);

	useEffect(() => {
		if (!active) {
			setShow(false);
			setTimedOut(false);
			return;
		}

		setTimedOut(false);

		const showTimer = window.setTimeout(() => setShow(true), delayMs);
		const timeoutTimer =
			typeof timeoutMs === 'number' && timeoutMs > 0
				? window.setTimeout(() => setTimedOut(true), timeoutMs)
				: null;

		return () => {
			window.clearTimeout(showTimer);
			if (timeoutTimer) {
				window.clearTimeout(timeoutTimer);
			}
		};
	}, [active, delayMs, timeoutMs]);

	return { show, timedOut };
}
