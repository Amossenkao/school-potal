import type { DeploymentSummary } from './types';

const VERCEL_API_BASE = 'https://api.vercel.com';

function hasVercelConfig() {
	return Boolean(process.env.VERCEL_TOKEN && (process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME));
}

async function vercelFetch<T>(path: string): Promise<T | null> {
	if (!hasVercelConfig()) return null;

	const response = await fetch(`${VERCEL_API_BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
			'Content-Type': 'application/json',
		},
		next: { revalidate: 60 },
	});

	if (!response.ok) {
		throw new Error(`Vercel API request failed with ${response.status}`);
	}

	return response.json() as Promise<T>;
}

export async function getLatestDeploymentStatus(): Promise<DeploymentSummary> {
	const projectId = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME;
	const teamId = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : '';
	const payload = await vercelFetch<any>(`/v6/deployments?projectId=${projectId}&limit=10${teamId}`);
	const deployments = Array.isArray(payload?.deployments) ? payload.deployments : [];
	const latest = deployments[0];
	const history = deployments.map((deployment: any) => ({
		id: String(deployment.uid || deployment.id),
		status: String(deployment.state || 'unknown').toLowerCase(),
		url: deployment.url ? `https://${deployment.url}` : undefined,
		createdAt: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : undefined,
	}));

	return {
		status: latest ? String(latest.state || 'unknown').toLowerCase() : hasVercelConfig() ? 'unknown' : 'unconfigured',
		version: process.env.NEXT_PUBLIC_APP_VERSION || latest?.meta?.githubCommitSha,
		url: latest?.url ? `https://${latest.url}` : undefined,
		createdAt: latest?.createdAt ? new Date(latest.createdAt).toISOString() : undefined,
		buildFailures: history.filter((deployment) => ['error', 'failed', 'canceled'].includes(deployment.status)).length,
		history,
	};
}

export async function getBuildFailures() {
	const deployment = await getLatestDeploymentStatus();
	return deployment.buildFailures;
}

export async function getDeploymentHistory() {
	const deployment = await getLatestDeploymentStatus();
	return deployment.history;
}
