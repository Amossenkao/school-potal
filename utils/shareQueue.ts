export type ShareQueueItem = {
	id: string;
	fileName: string;
	reportType: string;
	createdBy: string;
	createdAt: string;
};

const DB_NAME = 'school-portal';
const DB_VERSION = 1;
const QUEUE_STORE = 'report_share_queue';
const BLOB_STORE = 'report_share_blobs';

const isIndexedDbAvailable = () =>
	typeof window !== 'undefined' && 'indexedDB' in window;

const generateId = () => {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `share_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const openDb = (): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		if (!isIndexedDbAvailable()) {
			reject(new Error('IndexedDB is not available.'));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(QUEUE_STORE)) {
				db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains(BLOB_STORE)) {
				db.createObjectStore(BLOB_STORE);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const withStore = async <T>(
	storeName: string,
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
) => {
	const db = await openDb();
	return new Promise<T>((resolve, reject) => {
		const tx = db.transaction(storeName, mode);
		const store = tx.objectStore(storeName);
		const request = run(store);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		tx.onabort = () => reject(tx.error);
		tx.oncomplete = () => db.close();
	});
};

const putItem = async <T>(
	storeName: string,
	value: T,
	key?: IDBValidKey,
) => {
	await withStore(storeName, 'readwrite', (store) =>
		key !== undefined ? store.put(value, key) : store.put(value),
	);
};

const getItem = async <T>(storeName: string, key: IDBValidKey) =>
	withStore(storeName, 'readonly', (store) => store.get(key)) as Promise<T>;

const getAllItems = async <T>(storeName: string) =>
	withStore(storeName, 'readonly', (store) => store.getAll()) as Promise<T[]>;

const deleteItem = async (storeName: string, key: IDBValidKey) => {
	await withStore(storeName, 'readwrite', (store) => store.delete(key));
};

export const enqueueShareRequest = async ({
	blob,
	fileName,
	reportType,
	createdBy,
}: {
	blob: Blob;
	fileName: string;
	reportType: string;
	createdBy: string;
}) => {
	if (!isIndexedDbAvailable()) return null;
	const id = generateId();
	const createdAt = new Date().toISOString();
	await putItem(BLOB_STORE, blob, id);
	await putItem(QUEUE_STORE, { id, fileName, reportType, createdBy, createdAt });
	return id;
};

export const consumeQueuedShareRequests = async (
	handler: (item: ShareQueueItem, blob: Blob) => Promise<boolean>,
) => {
	if (!isIndexedDbAvailable()) return 0;
	const items = await getAllItems<ShareQueueItem>(QUEUE_STORE);
	let processed = 0;
	for (const item of items) {
		try {
			const blob = await getItem<Blob>(BLOB_STORE, item.id);
			if (!blob) {
				await deleteItem(QUEUE_STORE, item.id);
				continue;
			}
			const success = await handler(item, blob);
			if (success) {
				await deleteItem(QUEUE_STORE, item.id);
				await deleteItem(BLOB_STORE, item.id);
				processed += 1;
			}
		} catch {
			// Keep the item in queue for a future retry.
		}
	}
	return processed;
};
