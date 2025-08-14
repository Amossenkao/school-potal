import mongoose, { Connection } from 'mongoose';
import findSchoolByHost from './schoolStore';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
	throw new Error('Please define the MONGODB_URI environment variable.');
}

// Store connections per tenant
const connections: Map<string, Connection> = new Map();

export const getTenantConnection = async (
	host: string | null
): Promise<Connection | null> => {
	if (!host) {
		console.log('Host is required');
		return null;
	}

	const school = await findSchoolByHost(host);
	if (!school?.dbName) {
		console.log('School not found for host:', host);
		return null;
	}

	// Check if we already have a connection for this tenant
	if (connections.has(school.dbName)) {
		const existingConnection = connections.get(school.dbName)!;
		if (existingConnection.readyState === 1) {
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

// Cleanup function (call this when shutting down)
export const closeAllConnections = async () => {
	const closePromises = Array.from(connections.values()).map((conn) =>
		conn.close()
	);
	await Promise.all(closePromises);
	connections.clear();
};
