import { connectToSchoolMeshDb } from '@/lib/mongoose';

import { getUptimeStatus } from './betterstack';
import { getCloudflareHealth } from './cloudflare';
import { getMongoHealth } from './mongodb';
import { getReleaseHealth } from './sentry';
import { getLatestDeploymentStatus } from './vercel';
import type { HealthSummary, MonitoringProviderState } from './types';

function providerState(
	provider: MonitoringProviderState['provider'],
	status: MonitoringProviderState['status'],
	message?: string,
): MonitoringProviderState {
	return {
		provider,
		status,
		message,
		checkedAt: new Date().toISOString(),
	};
}

export async function getDatabaseHealth() {
	try {
		const connection = await connectToSchoolMeshDb();
		return connection.readyState === 1 ? 'healthy' as const : 'warning' as const;
	} catch {
		return 'critical' as const;
	}
}

export async function getHealthSummary(): Promise<HealthSummary> {
	const providers: MonitoringProviderState[] = [];
	const database = await getDatabaseHealth();

	try {
		const mongoHealth = await getMongoHealth();
		providers.push(providerState('mongodb', mongoHealth.status, mongoHealth.message));
	} catch (error) {
		providers.push(providerState('mongodb', 'error', error instanceof Error ? error.message : 'MongoDB unavailable'));
	}

	try {
		const releaseHealth = await getReleaseHealth();
		providers.push(providerState('sentry', releaseHealth.status === 'connected' ? 'connected' : 'unconfigured'));
	} catch (error) {
		providers.push(providerState('sentry', 'error', error instanceof Error ? error.message : 'Sentry unavailable'));
	}

	try {
		const uptime = await getUptimeStatus();
		providers.push(providerState('betterstack', uptime.percentage > 0 ? 'connected' : 'unconfigured'));
	} catch (error) {
		providers.push(providerState('betterstack', 'error', error instanceof Error ? error.message : 'Better Stack unavailable'));
	}

	try {
		const cloudflare = await getCloudflareHealth();
		providers.push(providerState('cloudflare', cloudflare.status, cloudflare.message));
	} catch (error) {
		providers.push(providerState('cloudflare', 'error', error instanceof Error ? error.message : 'Cloudflare unavailable'));
	}

	try {
		const deployment = await getLatestDeploymentStatus();
		providers.push(providerState('vercel', deployment.status === 'unconfigured' ? 'unconfigured' : 'connected'));
	} catch (error) {
		providers.push(providerState('vercel', 'error', error instanceof Error ? error.message : 'Vercel unavailable'));
	}

	const storageProvider = providers.find((provider) => provider.provider === 'cloudflare');
	const monitoringProviders = providers.filter((provider) => provider.provider !== 'mongodb');
	const hasCriticalProvider = providers.some((provider) => provider.status === 'error');

	return {
		application: hasCriticalProvider || database === 'critical' ? 'critical' : 'healthy',
		database,
		storage: storageProvider?.status === 'connected' ? 'healthy' : 'warning',
		monitoring: monitoringProviders.some((provider) => provider.status === 'connected') ? 'connected' : 'unconfigured',
		providers,
	};
}
