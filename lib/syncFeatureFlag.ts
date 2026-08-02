// lib/syncFeatureFlag.ts
// Phase 5: gates the new sync engine (tabSync coordinator, outbox flush,
// realtime event dedup, checksum verification, seq-cursor negotiation)
// behind NEXT_PUBLIC_SYNC_ENGINE so existing behavior is unchanged by
// default. Safe to call from both client and server code.

export const isSyncEngineEnabled = (): boolean =>
	process.env.NEXT_PUBLIC_SYNC_ENGINE === 'true';
