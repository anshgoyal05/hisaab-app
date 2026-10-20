import { openDB, IDBPDatabase } from 'idb';
import { apiRequest } from './api.js';

const DB_NAME = 'hisaab_offline_db';
const STORE_NAME = 'pending_mutations';

interface PendingMutation {
  id: string; // client UUID
  type: 'CREATE_TRANSACTION' | 'RECORD_SETTLEMENT';
  payload: any;
  createdAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Enqueues a mutation into IndexedDB when offline.
 */
export async function enqueueOfflineMutation(
  type: 'CREATE_TRANSACTION' | 'RECORD_SETTLEMENT',
  payload: any
): Promise<void> {
  const db = await getDb();
  const mutation: PendingMutation = {
    id: payload.clientId,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };

  await db.put(STORE_NAME, mutation);
}

/**
 * Returns all pending mutations queued in IndexedDB.
 */
export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function getPendingMutationCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_NAME);
}

/**
 * Synchronizes all pending mutations with the backend API.
 * Automatically de-duplicates through the client_id idempotency guarantee.
 */
export async function syncOfflineQueue(
  onSynced?: (count: number) => void
): Promise<number> {
  if (!navigator.onLine) return 0;

  const db = await getDb();
  const pending = await db.getAll(STORE_NAME);

  if (pending.length === 0) return 0;

  let syncedCount = 0;

  for (const item of pending) {
    try {
      if (item.type === 'CREATE_TRANSACTION') {
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });
      } else if (item.type === 'RECORD_SETTLEMENT') {
        await apiRequest('/settlements', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });
      }

      // Successfully synced or already recorded idempotently: remove from queue
      await db.delete(STORE_NAME, item.id);
      syncedCount++;
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        // Still offline: pause sync
        break;
      }
      // If validation error, log and remove to prevent poison pill blocking queue
      console.error('Failed to sync offline item:', item, err);
      await db.delete(STORE_NAME, item.id);
    }
  }

  if (onSynced && syncedCount > 0) {
    onSynced(syncedCount);
  }

  return syncedCount;
}

/**
 * Clears the offline database and all stored data upon user logout.
 */
export async function clearOfflineDatabase(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}
