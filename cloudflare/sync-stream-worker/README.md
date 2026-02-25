# Cloudflare Sync Stream Worker

This Worker hosts the realtime SSE stream while your main app/API stays on Vercel.

## What it does

- Accepts browser SSE connections on `/sync/events`.
- Verifies short-lived stream tokens minted by Vercel (`/api/sync/stream-token`).
- Uses a Durable Object (`SyncStreamHub`) for:
  - channel fan-out to connected clients,
  - replay buffer for reconnects (`Last-Event-ID` / `lastEventId`),
  - upstream Upstash pub/sub subscription management.

## Prerequisites

- Cloudflare account with Workers + Durable Objects enabled.
- Existing Upstash Redis instance (same one used by Vercel publishers).
- `wrangler` CLI.

## Setup

1. Install worker dependencies:

```bash
npm --prefix cloudflare/sync-stream-worker install
```

2. Authenticate Wrangler:

```bash
npx wrangler login
```

3. Set Worker secrets (Cloudflare):

```bash
npx wrangler secret put UPSTASH_REDIS_REST_URL --config cloudflare/sync-stream-worker/wrangler.toml
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN --config cloudflare/sync-stream-worker/wrangler.toml
npx wrangler secret put SYNC_STREAM_JWT_SECRET --config cloudflare/sync-stream-worker/wrangler.toml
```

`SYNC_STREAM_JWT_SECRET` must exactly match Vercel's `SYNC_STREAM_JWT_SECRET`.

4. Deploy Worker:

```bash
npm run stream:worker:deploy
```

5. Add/update Vercel environment variables:

- `NEXT_PUBLIC_SYNC_STREAM_URL=https://<your-worker-domain>`
- `SYNC_STREAM_JWT_SECRET=<same shared secret>`
- `SYNC_STREAM_TOKEN_TTL_SECONDS=120` (optional; default is 120)

6. Redeploy Vercel app.

## Local development

Run app and worker in separate terminals:

```bash
npm run dev
npm run stream:worker:dev
```

Set `NEXT_PUBLIC_SYNC_STREAM_URL` in `.env.local` to your local Worker URL (for example `http://127.0.0.1:8787`).

## Debug logging

Enable verbose realtime logs:

- Vercel/Next.js: set `SYNC_DEBUG_LOGS=true`
- Cloudflare Worker: set `SYNC_STREAM_DEBUG_LOGS=true` in `wrangler.toml` or as an environment variable/secret

Then tail worker logs:

```bash
npx wrangler tail --config cloudflare/sync-stream-worker/wrangler.toml
```

## Health endpoint

- `GET /health` returns basic liveness JSON.
