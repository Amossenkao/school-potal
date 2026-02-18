import mongoose, { Connection } from 'mongoose';
// Adjust the import path to where your schema and type are defined
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import SchoolProfile from '@/types/schoolProfile';
import { headers } from 'next/headers';
import { redis } from '@/lib/redis';

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

const parsePoolSize = (value: string | undefined, fallback: number) => {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_POOL_SIZE = parsePoolSize(process.env.MONGODB_MAX_POOL_SIZE, 5);
const SERVER_SELECTION_TIMEOUT_MS = parsePoolSize(
	process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
	5000
);
const MAX_IDLE_TIME_MS = parsePoolSize(process.env.MONGODB_MAX_IDLE_TIME_MS, 30000);

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
		if (createdConnection) {
			try {
				await createdConnection.close();
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
export const getTenantConnection = async (): Promise<Connection | null> => {
	let host = (await headers()).get('host') || undefined;
	host = host?.split(':')[0];

	const school = await getSchoolProfile();
	if (!school?.dbName) {
		console.log('School not found for host:', host);
		return null;
	}

	return getTenantConnectionByDbName(school.dbName);
};

/**
 * Retrieves a school's profile from the central 'tenants' database, with Redis caching.
 * @returns The profile document, or null if not found or an error occurs.
 */
export const getSchoolProfile = async (
	options: { bypassCache?: boolean } = {},
): Promise<any> => {
	const hostHeader = await headers();
	let host = hostHeader.get('host') || undefined;
	host = host?.split(':')[0];

	if (!host) {
		console.error('Host is undefined, cannot fetch school profile.');
		return null;
	}

	const cacheKey = `school_profile:${host}`;

	try {
		// 1. Try to get the profile from Redis cache
		if (!options.bypassCache) {
			const cachedProfile = await redis.get(cacheKey);
			if (cachedProfile) {
				try {
					return typeof cachedProfile === 'string'
						? JSON.parse(cachedProfile)
						: cachedProfile;
				} catch (error) {
					console.warn('Failed to parse cached school profile:', error);
					return cachedProfile;
				}
			}
		}

		// 2. If not in cache, fetch from DB
		const connection = await connectToTenantsDb();

		const ProfileModel =
			connection.models.Profile ||
			connection.model<SchoolProfile>('Profile', SchoolProfileSchema);

		const profile = await ProfileModel.findOne({ host }).lean().exec();

		if (profile) {
			// 3. Store in Redis cache for future requests (e.g., for 24 hours)
			await redis.set(cacheKey, JSON.stringify(profile), {
				ex: 60 * 60 * 24 * 30,
			});
			console.log(`[Cache] SET for ${host}`);
		}

		return profile;
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

	await Promise.all(allPromises);
	connections.clear();
	connectionPromises.clear();
	tenantsDbConnection = null;
	tenantsDbConnectionPromise = null;
	console.log('All MongoDB connections closed.');
};
