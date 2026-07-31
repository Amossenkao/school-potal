import * as Sentry from '@sentry/nextjs';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
	release: process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA,
	tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
	enabled: Boolean(process.env.SENTRY_DSN),
});
