import mongoose, { Connection } from 'mongoose';
// Adjust the import path to where your schema and type are defined
import SchoolProfileSchema from '@/models/profile/SchoolProfile';
import SchoolProfile from '@/types/schoolProfile';
import { headers } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI || '';

console.log(MONGODB_URI);
if (!MONGODB_URI) {
	throw new Error('Please define the MONGODB_URI environment variable.');
}

// Store connections for individual tenants
const connections: Map<string, Connection> = new Map();
// A dedicated connection for the central 'tenants' database
let tenantsDbConnection: Connection | null = null;

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
	try {
		tenantsDbConnection = mongoose.createConnection(MONGODB_URI, {
			dbName: 'tenants',
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

		return tenantsDbConnection;
	} catch (err) {
		console.error("MongoDB connection error for 'tenants' database:", err);
		throw err;
	}
};

/**
 * Establishes a connection to an individual tenant's database.
 * @param host The hostname used to look up the tenant's database name.
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

	// Check if we already have a connection for this tenant
	if (connections.has(school.dbName)) {
		const existingConnection = connections.get(school.dbName)!;
		if (existingConnection.readyState === 1) {
			// 1 = connected
			return existingConnection;
		}
	}

	try {
		// Create new connection for this tenant
		const connection = mongoose.createConnection(MONGODB_URI, {
			dbName: school.dbName,
		});

		// Wait for connection to be established
		await new Promise<void>((resolve, reject) => {
			connection.once('connected', () => {
				console.log(`Connected to database: ${school.dbName}`);
				resolve();
			});
			connection.once('error', reject);
		});

		// Store the connection
		connections.set(school.dbName, connection);
		return connection;
	} catch (err) {
		console.error(`MongoDB connection error for ${school.dbName}:`, err);
		throw err;
	}
};

/**
 * Retrieves a school's profile from the central 'tenants' database.
 * @param host The hostname used to find the profile.
 * @returns The profile document, or null if not found or an error occurs.
 */

export const getSchoolProfile = async (): Promise<any> => {
	let host = (await headers()).get('host') || undefined;
	host = host?.split(':')[0];
	try {
		// Ensure the connection to the 'tenants' database is established
		const connection = await connectToTenantsDb();

		const ProfileModel =
			connection.models.Profile ||
			connection.model<SchoolProfile>('Profile', SchoolProfileSchema);

		const profile = await ProfileModel.findOne({ host }).lean().exec();
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
		conn.close()
	);

	const allPromises = [...tenantConnections];

	if (tenantsDbConnection) {
		allPromises.push(tenantsDbConnection.close());
	}

	await Promise.all(allPromises);
	connections.clear();
	tenantsDbConnection = null;
	console.log('All MongoDB connections closed.');
};
