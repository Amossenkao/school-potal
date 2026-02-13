const DB_NAME = 'school-domain-cache';
const DB_VERSION = 1;
const STORE_NAME = 'domains';

export type CachedDomain =
	| 'users'
	| 'grades'
	| 'calendar'
	| 'schedules'
	| 'gradeRequests';

type DomainRecord = {
	key: string;
	domain: CachedDomain;
	academicYear: string;
	value: unknown;
	updatedAt: number;
};

const isIndexedDbAvailable =
	typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const openDb = async (): Promise<IDBDatabase | null> => {
	if (!isIndexedDbAvailable) return null;
	return await new Promise((resolve, reject) => {
		const request = window.indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
};

const buildKey = (domain: CachedDomain, academicYear: string) =>
	`${domain}:${academicYear}`;

export const setDomainSnapshot = async (
	domain: CachedDomain,
	academicYear: string,
	value: unknown,
) => {
	const db = await openDb();
	if (!db) return;

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const record: DomainRecord = {
			key: buildKey(domain, academicYear),
			domain,
			academicYear,
			value,
			updatedAt: Date.now(),
		};
		store.put(record);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
};

export const getAllDomainSnapshots = async (): Promise<DomainRecord[]> => {
	const db = await openDb();
	if (!db) return [];

	return await new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const request = store.getAll();
		request.onsuccess = () => {
			resolve(Array.isArray(request.result) ? request.result : []);
		};
		request.onerror = () => reject(request.error);
	});
};

export const clearDomainSnapshots = async () => {
	const db = await openDb();
	if (!db) return;
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
};
