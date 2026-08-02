const DB_NAME = 'school-domain-cache';
const DB_VERSION = 2;
const STORE_NAME = 'domains';
const SYNC_META_STORE = 'sync-meta';
const OUTBOX_STORE = 'outbox';
const APPLIED_EVENTS_STORE = 'applied-events';

export type CachedDomain =
	| 'users'
	| 'grades'
	| 'calendar'
	| 'schedules'
	| 'gradeRequests'
	| 'attendance'
	| 'teacherAttendance';

type DomainRecord = {
	key: string;
	domain: CachedDomain;
	academicYear: string;
	value: unknown;
	updatedAt: number;
};

export type SyncCursor = {
	key: string;
	domain: CachedDomain;
	academicYear: string;
	seq: number;
	updatedAt: number;
};

export type AppliedEvent = {
	eventId: string;
	domain: CachedDomain | string;
	academicYear: string;
	seq?: number;
	appliedAt: number;
};

export type OutboxEntry = {
	id: string;
	url: string;
	method: string;
	headers: Record<string, string>;
	body: string;
	status: 'pending' | 'in-flight' | 'dead';
	attemptCount: number;
	lastAttemptAt: number;
	nextRetryAt?: number;
	lastError?: string;
	createdAt: number;
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
			if (!db.objectStoreNames.contains(SYNC_META_STORE)) {
				db.createObjectStore(SYNC_META_STORE, { keyPath: 'key' });
			}
			if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
				db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains(APPLIED_EVENTS_STORE)) {
				db.createObjectStore(APPLIED_EVENTS_STORE, { keyPath: 'eventId' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
};

const runWithLock = async <T>(
	lockName: string,
	fn: () => Promise<T>,
): Promise<T> => {
	if (
		typeof navigator === 'undefined' ||
		typeof navigator.locks === 'undefined'
	) {
		return fn();
	}
	return navigator.locks.request(lockName, async () => fn());
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

	await runWithLock(`school-domain-cache:write:${buildKey(domain, academicYear)}`, async () => {
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

export const clearDomainSnapshots = async (academicYear?: string) => {
	const db = await openDb();
	if (!db) return;

	if (!academicYear) {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			tx.objectStore(STORE_NAME).clear();
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		return;
	}

	const prefix = `:${academicYear}`;
	await runWithLock('school-domain-cache:clear-year', async () => {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.openCursor();
			request.onsuccess = () => {
				const cursor = request.result;
				if (!cursor) {
					resolve();
					return;
				}
				if (cursor.value?.key?.endsWith?.(prefix)) {
					cursor.delete();
				}
				cursor.continue();
			};
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	});
};

export const getDomainCursor = async (
	domain: CachedDomain,
	academicYear: string,
): Promise<number> => {
	const db = await openDb();
	if (!db) return 0;

	return await new Promise((resolve, reject) => {
		const tx = db.transaction(SYNC_META_STORE, 'readonly');
		const store = tx.objectStore(SYNC_META_STORE);
		const request = store.get(`cursor:${buildKey(domain, academicYear)}`);
		request.onsuccess = () => {
			const cursor = request.result as SyncCursor | undefined;
			resolve(typeof cursor?.seq === 'number' ? cursor.seq : 0);
		};
		request.onerror = () => reject(request.error);
	});
};

export const setDomainCursor = async (
	domain: CachedDomain,
	academicYear: string,
	seq: number,
) => {
	const db = await openDb();
	if (!db) return;

	await runWithLock('school-domain-cache:cursor', async () => {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(SYNC_META_STORE, 'readwrite');
			const store = tx.objectStore(SYNC_META_STORE);
			const record: SyncCursor = {
				key: `cursor:${buildKey(domain, academicYear)}`,
				domain,
				academicYear,
				seq,
				updatedAt: Date.now(),
			};
			store.put(record);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	});
};

export const getAllSyncCursors = async (): Promise<SyncCursor[]> => {
	const db = await openDb();
	if (!db) return [];

	return await new Promise((resolve, reject) => {
		const tx = db.transaction(SYNC_META_STORE, 'readonly');
		const store = tx.objectStore(SYNC_META_STORE);
		const request = store.getAll();
		request.onsuccess = () => {
			const records = Array.isArray(request.result) ? request.result : [];
			resolve(
				records.filter(
					(record): record is SyncCursor =>
						typeof record?.key === 'string' &&
						record.key.startsWith('cursor:') &&
						typeof record?.seq === 'number',
				),
			);
		};
		request.onerror = () => reject(request.error);
	});
};

export const clearSyncCursors = async (academicYear?: string) => {
	const db = await openDb();
	if (!db) return;

	if (!academicYear) {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(SYNC_META_STORE, 'readwrite');
			tx.objectStore(SYNC_META_STORE).clear();
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		return;
	}

	const prefix = `cursor:${academicYear}`;
	await runWithLock('school-domain-cache:clear-cursors', async () => {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(SYNC_META_STORE, 'readwrite');
			const store = tx.objectStore(SYNC_META_STORE);
			const request = store.openCursor();
			request.onsuccess = () => {
				const cursor = request.result;
				if (!cursor) {
					resolve();
					return;
				}
				if (cursor.value?.key?.endsWith?.(prefix)) {
					cursor.delete();
				}
				cursor.continue();
			};
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	});
};

export const isEventApplied = async (
	eventId: string,
): Promise<boolean> => {
	const db = await openDb();
	if (!db) return false;

	return await new Promise((resolve, reject) => {
		const tx = db.transaction(APPLIED_EVENTS_STORE, 'readonly');
		const store = tx.objectStore(APPLIED_EVENTS_STORE);
		const request = store.get(eventId);
		request.onsuccess = () => {
			resolve(Boolean(request.result));
		};
		request.onerror = () => reject(request.error);
	});
};

export const markEventApplied = async (
	event: Omit<AppliedEvent, 'appliedAt'>,
) => {
	const db = await openDb();
	if (!db) return;

	await runWithLock('school-domain-cache:applied-events', async () => {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(APPLIED_EVENTS_STORE, 'readwrite');
			const store = tx.objectStore(APPLIED_EVENTS_STORE);
			const record: AppliedEvent = { ...event, appliedAt: Date.now() };
			store.put(record);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	});
};

export const enqueueOutbox = async (entry: Omit<OutboxEntry, 'status' | 'attemptCount' | 'lastAttemptAt' | 'createdAt'>) => {
	const db = await openDb();
	if (!db) return null;

	const record: OutboxEntry = {
		...entry,
		status: 'pending',
		attemptCount: 0,
		lastAttemptAt: 0,
		createdAt: Date.now(),
	};

	await runWithLock('school-domain-cache:outbox', async () => {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(OUTBOX_STORE, 'readwrite');
			tx.objectStore(OUTBOX_STORE).put(record);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	});

	return record.id;
};

export const getOutboxEntries = async (): Promise<OutboxEntry[]> => {
	const db = await openDb();
	if (!db) return [];

	return await new Promise((resolve, reject) => {
		const tx = db.transaction(OUTBOX_STORE, 'readonly');
		const store = tx.objectStore(OUTBOX_STORE);
		const request = store.getAll();
		request.onsuccess = () => {
			resolve(Array.isArray(request.result) ? request.result : []);
		};
		request.onerror = () => reject(request.error);
	});
};

export const updateOutboxEntry = async (
	id: string,
	patch: Partial<Omit<OutboxEntry, 'id'>>,
) => {
	const db = await openDb();
	if (!db) return;

	await runWithLock('school-domain-cache:outbox', async () => {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(OUTBOX_STORE, 'readwrite');
			const store = tx.objectStore(OUTBOX_STORE);
			const getRequest = store.get(id);
			getRequest.onsuccess = () => {
				const entry = getRequest.result as OutboxEntry | undefined;
				if (!entry) {
					resolve();
					return;
				}
				store.put({ ...entry, ...patch });
			};
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	});
};

export const removeOutboxEntry = async (id: string) => {
	const db = await openDb();
	if (!db) return;

	await runWithLock('school-domain-cache:outbox', async () => {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(OUTBOX_STORE, 'readwrite');
			tx.objectStore(OUTBOX_STORE).delete(id);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	});
};

export const clearOutbox = async () => {
	const db = await openDb();
	if (!db) return;

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(OUTBOX_STORE, 'readwrite');
		tx.objectStore(OUTBOX_STORE).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
};
