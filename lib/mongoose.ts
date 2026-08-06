import mongoose, { Connection } from 'mongoose';
// Adjust the import path to where your schema and type are defined
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import SchoolProfile from '@/types/schoolProfile';
import { headers } from 'next/headers';
import { redis } from '@/lib/redis';
import { isLocalHost, normalizeHost } from '@/utils/host';
import { migrateSchoolProfileToInstallments } from '@/utils/migrateFeeInstallments';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
	throw new Error('Please define the MONGODB_URI environment variable.');
}

// Store connections for individual tenants
const connections: Map<string, Connection> = new Map();
const connectionPromises: Map<string, Promise<Connection>> = new Map();
// A dedicated connection for the central 'tenants' database
let tenantsDbConnection: Connection | null = null;
let tenantsDbConnectionPromise: Promise<Connection> | null = null;
// A dedicated connection for the 'schoolmesh' database (company admin + school profiles)
let schoolMeshDbConnection: Connection | null = null;
let schoolMeshDbConnectionPromise: Promise<Connection> | null = null;

type SchoolProfileCacheEntry = {
	value: any;
	expiresAt: number;
};

const schoolProfileInMemoryCache = new Map<string, SchoolProfileCacheEntry>();
// This process-local Map is invalidated only on the serverless instance that
// handles a given write (see clearSchoolProfileMemoryCache/setSchoolProfileMemoryCache
// in app/api/school/route.ts). Every other warm instance keeps serving its own
// stale copy — including gating decisions like system.isActive in proxy.ts and
// the login route — until this TTL naturally lapses. A long TTL here previously
// meant a school toggled inactive could still let users log in / stay logged in
// on other instances for up to that long. Keep this short so staleness
// self-heals in seconds once Redis (kept fresh on every write) is consulted again.
const SCHOOL_PROFILE_MEMORY_TTL_MS = (() => {
	const raw = process.env.SCHOOL_PROFILE_MEMORY_TTL_MS;
	if (!raw) return 20 * 1000; // 20 seconds default
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 10 * 60 * 1000;
})();

const readMemoryCachedSchoolProfile = (cacheKey: string) => {
	const entry = schoolProfileInMemoryCache.get(cacheKey);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		schoolProfileInMemoryCache.delete(cacheKey);
		return null;
	}
	return entry.value;
};

const writeMemoryCachedSchoolProfile = (cacheKey: string, value: any) => {
	schoolProfileInMemoryCache.set(cacheKey, {
		value,
		expiresAt: Date.now() + SCHOOL_PROFILE_MEMORY_TTL_MS,
	});
};

export const setSchoolProfileMemoryCache = (
	host: string,
	value: any,
	options: { ttlMs?: number } = {},
) => {
	const cacheKey = `school_profile:${normalizeHost(host)}`;
	const ttlMs =
		typeof options.ttlMs === 'number' && options.ttlMs > 0
			? options.ttlMs
			: SCHOOL_PROFILE_MEMORY_TTL_MS;
	schoolProfileInMemoryCache.set(cacheKey, {
		value,
		expiresAt: Date.now() + ttlMs,
	});
};

export const clearSchoolProfileMemoryCache = (host?: string | null) => {
	if (!host) {
		schoolProfileInMemoryCache.clear();
		return;
	}
	const cacheKey = `school_profile:${normalizeHost(host)}`;
	schoolProfileInMemoryCache.delete(cacheKey);
};

const parsePoolSize = (value: string | undefined, fallback: number) => {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_POOL_SIZE = parsePoolSize(process.env.MONGODB_MAX_POOL_SIZE, 8);
const SERVER_SELECTION_TIMEOUT_MS = parsePoolSize(
	process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
	2500,
);
const MAX_IDLE_TIME_MS = parsePoolSize(
	process.env.MONGODB_MAX_IDLE_TIME_MS,
	10000,
);

/**
 * Establishes and caches a connection to the central 'tenants' database.
 * Call this once when your application starts.
 * @returns A Mongoose Connection object for the 'tenants' database.
 */
export const connectToTenantsDb = async (): Promise<Connection> => {
	// Return the existing connection if it's already established
	if (tenantsDbConnection && tenantsDbConnection.readyState === 1) {
		return tenantsDbConnection;
	}
	if (tenantsDbConnectionPromise) {
		return tenantsDbConnectionPromise;
	}

	if (tenantsDbConnection && tenantsDbConnection.readyState === 2) {
		tenantsDbConnectionPromise = tenantsDbConnection
			.asPromise()
			.then(() => tenantsDbConnection as Connection)
			.finally(() => {
				tenantsDbConnectionPromise = null;
			});
		return tenantsDbConnectionPromise;
	}

	try {
		tenantsDbConnectionPromise = (async () => {
			tenantsDbConnection = mongoose.createConnection(MONGODB_URI, {
				dbName: 'tenants',
				maxPoolSize: MAX_POOL_SIZE,
				minPoolSize: 0,
				maxIdleTimeMS: MAX_IDLE_TIME_MS,
				serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
			});

			await new Promise<void>((resolve, reject) => {
				tenantsDbConnection!.once('connected', () => {
					console.log("✅ Successfully connected to central 'tenants' database.");
					resolve();
				});
				tenantsDbConnection!.once('error', (err) => {
					console.error("❌ Error connecting to 'tenants' database:", err);
					reject(err);
				});
			});

			return tenantsDbConnection as Connection;
		})();

		return await tenantsDbConnectionPromise;
	} catch (err) {
		console.error("MongoDB connection error for 'tenants' database:", err);
		if (tenantsDbConnection) {
			try {
				await tenantsDbConnection.close();
			} catch {
				// Ignore close errors during failed connection bootstrap.
			}
		}
		tenantsDbConnection = null;
		throw err;
	} finally {
		tenantsDbConnectionPromise = null;
	}
};

/**
 * Establishes and caches a connection to the central 'schoolmesh' database.
 * This database stores company admins (superadmin role) and school profiles.
 * @returns A Mongoose Connection object for the 'schoolmesh' database.
 */
export const connectToSchoolMeshDb = async (): Promise<Connection> => {
	if (schoolMeshDbConnection && schoolMeshDbConnection.readyState === 1) {
		return schoolMeshDbConnection;
	}
	if (schoolMeshDbConnectionPromise) {
		return schoolMeshDbConnectionPromise;
	}

	if (schoolMeshDbConnection && schoolMeshDbConnection.readyState === 2) {
		schoolMeshDbConnectionPromise = schoolMeshDbConnection
			.asPromise()
			.then(() => schoolMeshDbConnection as Connection)
			.finally(() => {
				schoolMeshDbConnectionPromise = null;
			});
		return schoolMeshDbConnectionPromise;
	}

	try {
		schoolMeshDbConnectionPromise = (async () => {
			schoolMeshDbConnection = mongoose.createConnection(MONGODB_URI, {
				dbName: 'schoolmesh',
				maxPoolSize: MAX_POOL_SIZE,
				minPoolSize: 0,
				maxIdleTimeMS: MAX_IDLE_TIME_MS,
				serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
			});

			await new Promise<void>((resolve, reject) => {
				schoolMeshDbConnection!.once('connected', () => {
					console.log("✅ Successfully connected to central 'schoolmesh' database.");
					resolve();
				});
				schoolMeshDbConnection!.once('error', (err) => {
					console.error("❌ Error connecting to 'schoolmesh' database:", err);
					reject(err);
				});
			});

			return schoolMeshDbConnection as Connection;
		})();

		return await schoolMeshDbConnectionPromise;
	} catch (err) {
		console.error("MongoDB connection error for 'schoolmesh' database:", err);
		if (schoolMeshDbConnection) {
			try {
				await schoolMeshDbConnection.close();
			} catch {
				// Ignore close errors during failed connection bootstrap.
			}
		}
		schoolMeshDbConnection = null;
		throw err;
	} finally {
		schoolMeshDbConnectionPromise = null;
	}
};

const getOrCreateTenantConnectionByDbName = async (
	dbName: string,
): Promise<Connection> => {
	if (!dbName) {
		throw new Error('A tenant database name is required.');
	}

	const existingConnection = connections.get(dbName);
	if (existingConnection) {
		if (existingConnection.readyState === 1) {
			return existingConnection;
		}
		if (existingConnection.readyState === 2) {
			return existingConnection.asPromise().then(() => existingConnection);
		}
		if (existingConnection.readyState === 0 || existingConnection.readyState === 3) {
			connections.delete(dbName);
		}
	}

	const inFlightConnection = connectionPromises.get(dbName);
	if (inFlightConnection) {
		return inFlightConnection;
	}

	let createdConnection: Connection | null = null;
	const connectionPromise = (async () => {
		const connection = mongoose.createConnection(MONGODB_URI, {
			dbName,
			maxPoolSize: MAX_POOL_SIZE,
			minPoolSize: 0,
			maxIdleTimeMS: MAX_IDLE_TIME_MS,
			serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
		});
		createdConnection = connection;

		await new Promise<void>((resolve, reject) => {
			connection.once('connected', () => {
				console.log(`Connected to database: ${dbName}`);
				resolve();
			});
			connection.once('error', reject);
		});

		connections.set(dbName, connection);
		return connection;
	})();

	connectionPromises.set(dbName, connectionPromise);

	try {
		return await connectionPromise;
	} catch (error) {
		const connectionToClose = createdConnection;
		if (connectionToClose) {
			try {
				await connectionToClose.close();
			} catch {
				// Ignore close errors during failed connection bootstrap.
			}
		}
		connections.delete(dbName);
		throw error;
	} finally {
		connectionPromises.delete(dbName);
	}
};

/**
 * Establishes a connection to an individual tenant's database by dbName.
 * @returns A Mongoose Connection object for the specific tenant database.
 */
export const getTenantConnectionByDbName = async (
	dbName: string,
): Promise<Connection | null> => {
	try {
		return await getOrCreateTenantConnectionByDbName(dbName);
	} catch (err) {
		console.error(`MongoDB connection error for ${dbName}:`, err);
		return null;
	}
};

/**
 * Establishes a connection to an individual tenant's database based on request host.
 * @returns A Mongoose Connection object for the specific tenant database.
 */
export const getTenantConnection = async (
	hostOverride?: string | null,
): Promise<Connection | null> => {
	const host =
		normalizeHost(hostOverride) || normalizeHost((await headers()).get('host'));
	const school = await getSchoolProfile({ host });
	if (!school?.system.dbName) {
		console.log('School not found for host:', host);
		return null;
	}

	return getTenantConnectionByDbName(school.system.dbName);
};

/**
 * Retrieves a school's profile from the central 'schoolmesh' database, with Redis caching.
 * @returns The profile document, or null if not found or an error occurs.
 */
export const getSchoolProfile = async (
	options: {
		bypassCache?: boolean;
		/**
		 * Skip the process-local memory cache but still read Redis.
		 *
		 * The memory cache is per serverless instance and is refreshed only on
		 * the instance that handled a write, so every other warm instance keeps
		 * serving a stale `system.isActive` until its TTL lapses. Redis is
		 * rewritten on every profile write (see syncSchoolProfileCache), so
		 * skipping just the memory layer gives a current answer without the
		 * Mongo round-trip that `bypassCache` forces.
		 */
		skipMemoryCache?: boolean;
		host?: string | null;
	} = {},
): Promise<any> => {
	const host =
		normalizeHost(options.host) ||
		normalizeHost((await headers()).get('host'));

	if (!host) {
		console.error('Host is undefined, cannot fetch school profile.');
		return null;
	}

	const cacheKey = `school_profile:${host}`;

	try {
		// 1. Try in-memory cache first
		if (!options.bypassCache && !options.skipMemoryCache) {
			const memoryCached = readMemoryCachedSchoolProfile(cacheKey);
			if (memoryCached) {
				return migrateSchoolProfileToInstallments(memoryCached);
			}
		}

		// 2. Try to get the profile from Redis cache
		if (!options.bypassCache) {
			const cachedProfile = await redis.get(cacheKey);
			if (cachedProfile) {
				try {
					const parsedProfile =
						typeof cachedProfile === 'string'
							? JSON.parse(cachedProfile)
							: cachedProfile;
					const migrated = migrateSchoolProfileToInstallments(parsedProfile);
					writeMemoryCachedSchoolProfile(cacheKey, migrated);
					return migrated;
				} catch (error) {
					console.warn('Failed to parse cached school profile:', error);
					const migrated = migrateSchoolProfileToInstallments(cachedProfile);
					writeMemoryCachedSchoolProfile(cacheKey, migrated);
					return migrated;
				}
			}
		}

		// 3. If not in cache, fetch from schoolmesh database
		const connection = await connectToSchoolMeshDb();

		const ProfileModel =
			connection.models.SchoolProfile ||
			connection.model<SchoolProfile>('SchoolProfile', SchoolProfileSchema);

		let profile = await ProfileModel.findOne({ 'system.host': host }).lean().exec();
		if (!profile && process.env.NODE_ENV !== 'production') {
			const devTenantHost = normalizeHost(process.env.DEV_TENANT_HOST);
			const devTenantDbName = String(process.env.DEV_TENANT_DB_NAME || '').trim();

			if (devTenantHost) {
				profile = await ProfileModel.findOne({ 'system.host': devTenantHost }).lean().exec();
			}
			if (!profile && devTenantDbName) {
				profile = await ProfileModel.findOne({
					'system.dbName': devTenantDbName,
				})
					.lean()
					.exec();
			}
			if (!profile && isLocalHost(host)) {
				const tenantProfiles = await ProfileModel.find({}).limit(2).lean().exec();
				if (tenantProfiles.length === 1) {
					profile = tenantProfiles[0];
				} else if (tenantProfiles.length > 1) {
					console.warn(
						`[dev] Multiple tenant profiles found for local host "${host}". Set DEV_TENANT_HOST or DEV_TENANT_DB_NAME.`,
					);
				}
			}
		}

		if (profile) {
			const migrated = migrateSchoolProfileToInstallments(profile);
			// 4. Store in Redis cache for future requests (e.g., for 24 hours)
			await redis.set(cacheKey, JSON.stringify(migrated), {
				ex: 60 * 60 * 24 * 30,
			});
			console.log(`[Cache] SET for ${host}`);
			writeMemoryCachedSchoolProfile(cacheKey, migrated);
		}

		return migrateSchoolProfileToInstallments(profile);
	} catch (error) {
		console.error(`Error fetching school profile for host ${host}:`, error);
		return null;
	}
};

/**
 * Closes all active MongoDB connections. Call this during graceful shutdown.
 */
export const closeAllConnections = async () => {
	const tenantConnections = Array.from(connections.values()).map((conn) =>
		conn.close(),
	);

	const allPromises = [...tenantConnections];

	if (tenantsDbConnection) {
		allPromises.push(tenantsDbConnection.close());
	}

	if (schoolMeshDbConnection) {
		allPromises.push(schoolMeshDbConnection.close());
	}

	await Promise.all(allPromises);
	connections.clear();
	connectionPromises.clear();
	tenantsDbConnection = null;
	tenantsDbConnectionPromise = null;
	schoolMeshDbConnection = null;
	schoolMeshDbConnectionPromise = null;
	console.log('All MongoDB connections closed.');
};
