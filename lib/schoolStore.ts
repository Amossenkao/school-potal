// lib/school.ts
import type { SchoolProfile, FeatureKey } from '@/types/schoolProfile';
import { PLAN_FEATURES, DEFAULT_ROLE_ACCESS } from '@/types/schoolProfile';
import { upstairs } from '@/app/school-profiles/upstairs';

// In a real application, you would fetch this from your database
// This is a mock implementation for demonstration
const schoolProfiles: Record<string, SchoolProfile> = {
	'upstairs-christian-academy': upstairs,
	// Add more schools here...
};

// Host mapping data - in production this would come from database
const schoolHostMappings = [
	{
		id: 'school_1',
		name: 'Upstairs Christian Academy',
		subdomain: 'uca',
		dbName: 'uca',
		profileId: 'upstairs-christian-academy',
	},
	{
		id: 'school_2',
		name: 'Samore Christian Academy',
		subdomain: 'samore',
		dbName: 'samore',
		profileId: 'samore-christian-academy',
	},
];

/**
 * Find school by host/subdomain (legacy function)
 */
export async function findSchoolByHost(host: string | null) {
	try {
		if (!host) {
			return schoolHostMappings[0];
		}

		const subdomain = host.split('.')[0];

		// If no subdomain detected (like localhost), return default
		if (subdomain === host) {
			return schoolHostMappings[0];
		}

		return (
			schoolHostMappings.find((school) => school.subdomain === subdomain) ||
			null
		);
	} catch (error) {
		console.error('Error finding school by host:', error);
		return null;
	}
}

/**
 * Get full school profile by host/subdomain
 */
export async function getSchoolProfileByHost(
	host: string | null
): Promise<SchoolProfile | null> {
	try {
		const hostMapping = await findSchoolByHost(host);
		if (!hostMapping) {
			return null;
		}

		return await getSchoolProfile(hostMapping.profileId);
	} catch (error) {
		console.error('Error getting school profile by host:', error);
		return null;
	}
}

/**
 * Get school profile by ID or slug
 */
export async function getSchoolProfile(
	schoolId: string
): Promise<SchoolProfile | null> {
	try {
		// In a real implementation, this would be a database query
		// For now, we'll use the mock data
		const profile =
			schoolProfiles[schoolId] || schoolProfiles['upstairs-christian-academy'];

		if (!profile) {
			console.warn(`School profile not found for ID: ${schoolId}`);
			return null;
		}

		// Validate and normalize the profile
		return validateAndNormalizeProfile(profile);
	} catch (error) {
		console.error('Error fetching school profile:', error);
		return null;
	}
}

/**
 * Get all available school profiles (for multi-tenant selection)
 */
export async function getAllSchoolProfiles(): Promise<SchoolProfile[]> {
	try {
		const profiles = Object.values(schoolProfiles);
		return profiles.map((profile) => validateAndNormalizeProfile(profile));
	} catch (error) {
		console.error('Error fetching all school profiles:', error);
		return [];
	}
}

/**
 * Get all school host mappings
 */
export async function getAllSchoolHostMappings(): Promise<SchoolHostMapping[]> {
	return schoolHostMappings;
}

/**
 * Get host mapping by profile ID
 */
export async function getHostMappingByProfileId(
	profileId: string
): Promise<SchoolHostMapping | null> {
	return (
		schoolHostMappings.find((mapping) => mapping.profileId === profileId) ||
		null
	);
}

/**
 * Validate and normalize a school profile
 */
function validateAndNormalizeProfile(profile: SchoolProfile): SchoolProfile {
	// Ensure required features based on subscription plan
	const planFeatures =
		PLAN_FEATURES[profile.subscriptionPlan] || PLAN_FEATURES.basic;

	// Filter enabled features to only include those allowed by the plan
	const validEnabledFeatures = profile.enabledFeatures.filter((feature) =>
		planFeatures.includes(feature)
	);

	// Ensure role access doesn't exceed plan limits
	const normalizedRoleAccess = { ...profile.roleFeatureAccess };

	Object.keys(normalizedRoleAccess).forEach((role) => {
		normalizedRoleAccess[role].features = normalizedRoleAccess[
			role
		].features.filter((feature) => validEnabledFeatures.includes(feature));
	});

	// Add default role access for any missing roles
	Object.keys(DEFAULT_ROLE_ACCESS).forEach((role) => {
		if (!normalizedRoleAccess[role]) {
			normalizedRoleAccess[role] = {
				features: DEFAULT_ROLE_ACCESS[role].features.filter((feature) =>
					validEnabledFeatures.includes(feature)
				),
			};
		}
	});

	return {
		...profile,
		enabledFeatures: validEnabledFeatures,
		roleFeatureAccess: normalizedRoleAccess,
	};
}

/**
 * Check if a school's subscription is active
 */
export function isSubscriptionActive(profile: SchoolProfile): boolean {
	if (!profile.subscriptionExpiry) {
		return true; // Assume active if no expiry date
	}

	return new Date() < new Date(profile.subscriptionExpiry);
}

/**
 * Get features available for a subscription plan
 */
export function getPlanFeatures(plan: string): FeatureKey[] {
	return PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
}

/**
 * Update school profile (for admin use)
 */
export async function updateSchoolProfile(
	schoolId: string,
	updates: Partial<SchoolProfile>
): Promise<SchoolProfile | null> {
	try {
		const currentProfile = await getSchoolProfile(schoolId);
		if (!currentProfile) {
			throw new Error('School profile not found');
		}

		// In a real implementation, this would update the database
		const updatedProfile = {
			...currentProfile,
			...updates,
		};

		// Validate the updated profile
		const validatedProfile = validateAndNormalizeProfile(updatedProfile);

		// Mock: Update in-memory store (in real app, save to database)
		schoolProfiles[schoolId] = validatedProfile;

		return validatedProfile;
	} catch (error) {
		console.error('Error updating school profile:', error);
		return null;
	}
}

/**
 * Create a new school profile with default settings
 */
export async function createSchoolProfile(basicInfo: {
	name: string;
	shortName: string;
	initials: string;
	logoUrl: string;
	subscriptionPlan: 'basic' | 'standard' | 'premium';
	subdomain?: string;
	address?: string;
}): Promise<SchoolProfile> {
	const planFeatures = getPlanFeatures(basicInfo.subscriptionPlan);
	const profileId = generateSchoolId(basicInfo.name);

	const newProfile: SchoolProfile = {
		id: profileId,
		name: basicInfo.name,
		shortName: basicInfo.shortName,
		initials: basicInfo.initials,
		logoUrl: basicInfo.logoUrl,
		slogan: 'Excellence in Education',
		description: `${basicInfo.name} provides quality education for all students.`,
		tagline: "Building tomorrow's leaders today",
		yearFounded: new Date().getFullYear(),
		subscriptionPlan: basicInfo.subscriptionPlan,
		enabledFeatures: planFeatures,
		roleFeatureAccess: DEFAULT_ROLE_ACCESS,
		dynamicNavItems: [], // Will be populated based on features
		whyChoose: [],
		facilities: [],
		team: [],
		address: [],
		phones: [],
		emails: [],
		hours: [],
		quickLinks: [],
		academicLinks: [],
		footerLinks: [],
		classLevels: {},
	};

	// Create host mapping if subdomain provided
	if (basicInfo.subdomain) {
		const newHostMapping: SchoolHostMapping = {
			id: `school_${Date.now()}`,
			name: basicInfo.name,
			shortName: basicInfo.shortName,
			subdomain: basicInfo.subdomain,
			address: basicInfo.address || '',
			dbName: basicInfo.subdomain.toLowerCase(),
			profileId: profileId,
		};

		schoolHostMappings.push(newHostMapping);
	}

	// In a real implementation, save to database
	schoolProfiles[profileId] = newProfile;

	return newProfile;
}

/**
 * Generate a unique school ID from school name
 */
function generateSchoolId(schoolName: string): string {
	return schoolName
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, '')
		.replace(/\s+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Get school profile by domain (enhanced version with better domain handling)
 */
export async function getSchoolProfileByDomain(
	domain: string
): Promise<SchoolProfile | null> {
	try {
		// Try the host-based approach first
		const profileFromHost = await getSchoolProfileByHost(domain);
		if (profileFromHost) {
			return profileFromHost;
		}

		// Fallback to direct domain mappings
		const domainMappings: Record<string, string> = {
			'upstairs.edu.lr': 'upstairs-christian-academy',
			'localhost:3000': 'upstairs-christian-academy', // For development
			// Add more direct domain mappings...
		};

		const schoolId = domainMappings[domain];
		if (!schoolId) {
			return null;
		}

		return await getSchoolProfile(schoolId);
	} catch (error) {
		console.error('Error fetching school by domain:', error);
		return null;
	}
}

/**
 * Check if a feature is enabled for a school
 */
export function isFeatureEnabledForSchool(
	profile: SchoolProfile,
	feature: FeatureKey
): boolean {
	// Check subscription status
	if (!isSubscriptionActive(profile)) {
		return false;
	}

	// Check if feature is enabled
	return profile.enabledFeatures.includes(feature);
}

/**
 * Get available roles for a school
 */
export function getAvailableRoles(profile: SchoolProfile): string[] {
	return Object.keys(profile.roleFeatureAccess);
}

/**
 * Get school database name by host (useful for multi-tenant database selection)
 */
export async function getSchoolDbNameByHost(
	host: string | null
): Promise<string | null> {
	const hostMapping = await findSchoolByHost(host);
	return hostMapping?.dbName || null;
}

/**
 * Export for use in other parts of the application
 */
export {
	type SchoolProfile,
	type FeatureKey,
	type SchoolHostMapping,
	PLAN_FEATURES,
	DEFAULT_ROLE_ACCESS,
};

// Export the legacy function as default for backward compatibility
export default findSchoolByHost;
