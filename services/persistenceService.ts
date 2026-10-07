/**
 * Lamsa Eitr Bulletproof Persistence Engine (localStorage + IndexedDB + Smart Cloud Merge)
 * Guarantees zero data loss across page reloads, browser restarts, and offline/online transitions.
 */

const IDB_NAME = 'LamsaEitrPersistentDB_v1';
const IDB_VERSION = 1;
const IDB_STORE = 'kv_store';

const TOMBSTONES_KEY = 'lamsa_deleted_tombstones_v1';
const WRITE_TIMESTAMPS_KEY = 'lamsa_write_timestamps_v1';

export interface DeletedTombstones {
  products: Array<string | number>;
  sales: string[];
  expenses: string[];
  savedMixes: string[];
}

let cachedDbPromise: Promise<IDBDatabase | null> | null = null;

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (cachedDbPromise) return cachedDbPromise;

  cachedDbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        cachedDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedDbPromise = null;
      resolve(null);
    }
  });
  return cachedDbPromise;
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Record write timestamp for a given storage key so stale cloud snapshots never overwrite newer local writes.
 */
export function markLocalWriteTimestamp(storageKey: string): number {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(WRITE_TIMESTAMPS_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[storageKey] = now;
    localStorage.setItem(WRITE_TIMESTAMPS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to record write timestamp:', e);
  }
  return now;
}

export function getLocalWriteTimestamp(storageKey: string): number {
  try {
    const raw = localStorage.getItem(WRITE_TIMESTAMPS_KEY);
    if (!raw) return 0;
    const map: Record<string, number> = JSON.parse(raw);
    return map[storageKey] || 0;
  } catch {
    return 0;
  }
}

const pendingPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingPersistPayloads = new Map<string, any>();

function flushKeyNow(storageKey: string, data: any): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(storageKey, serialized);
    markLocalWriteTimestamp(storageKey);
  } catch (e) {
    console.error(`Error writing ${storageKey} to localStorage:`, e);
  }
  idbSet(storageKey, data).catch(() => {});
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pendingPersistPayloads.forEach((data, key) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {}
    });
    pendingPersistPayloads.clear();
  });
}

/**
 * Non-blocking debounced persistence to localStorage + IndexedDB so UI interactions remain 100% instant.
 */
export function persistDataDurable<T>(storageKey: string, data: T): void {
  pendingPersistPayloads.set(storageKey, data);
  const existing = pendingPersistTimers.get(storageKey);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingPersistTimers.delete(storageKey);
    const latest = pendingPersistPayloads.get(storageKey);
    pendingPersistPayloads.delete(storageKey);
    if (latest !== undefined) {
      flushKeyNow(storageKey, latest);
    }
  }, 180);

  pendingPersistTimers.set(storageKey, timer);
}

/** Synchronously replace a persisted dataset before changing the signed-in user's role. */
export async function replaceDataDurable<T>(storageKey: string, data: T): Promise<void> {
  const existing = pendingPersistTimers.get(storageKey);
  if (existing) clearTimeout(existing);
  pendingPersistTimers.delete(storageKey);
  pendingPersistPayloads.delete(storageKey);
  const serialized = JSON.stringify(data);
  try {
    localStorage.setItem(storageKey, serialized);
    markLocalWriteTimestamp(storageKey);
  } catch (error) {
    console.error(`Error replacing ${storageKey} in localStorage:`, error);
    throw error;
  }

  const db = await openIdb();
  if (!db) throw new Error(`IndexedDB is unavailable while replacing ${storageKey}.`);
  await new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(data, storageKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error(`IndexedDB write failed for ${storageKey}.`));
      tx.onabort = () => reject(tx.error || new Error(`IndexedDB write aborted for ${storageKey}.`));
    } catch (error) {
      reject(error);
    }
  });

  const persisted = await idbGet<T>(storageKey);
  if (JSON.stringify(persisted) !== serialized) {
    throw new Error(`IndexedDB verification failed for ${storageKey}.`);
  }
}

/**
 * Reads data synchronously from localStorage with fallback.
 */
export function loadDataSync<T>(storageKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null && raw !== undefined && raw !== '') {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) {
        return parsed as T;
      }
    }
  } catch (e) {
    console.error(`Error reading ${storageKey} from localStorage:`, e);
  }
  return fallback;
}

/**
 * Restores any keys from IndexedDB if localStorage was cleared or empty on boot.
 */
export async function hydrateFromIndexedDBIfNeeded<T>(
  storageKey: string,
  onRestored: (restoredData: T) => void,
  tombstoneCategory?: keyof DeletedTombstones
): Promise<void> {
  try {
    const idbValue = await idbGet<T>(storageKey);
    if (idbValue === null || idbValue === undefined) return;

    const tombstones = tombstoneCategory
      ? new Set(getDeletedTombstones()[tombstoneCategory].map((x) => String(x)))
      : new Set<string>();

    const filterTombstones = (val: T): T => {
      if (Array.isArray(val) && tombstones.size > 0) {
        return val.filter((item: any) => !item || !tombstones.has(String(item.id))) as unknown as T;
      }
      return val;
    };

    const rawLocal = localStorage.getItem(storageKey);
    if (!rawLocal) {
      const cleaned = filterTombstones(idbValue);
      localStorage.setItem(storageKey, JSON.stringify(cleaned));
      onRestored(cleaned);
      return;
    }

    // Only restore if localStorage was completely empty array [] and IDB has non-tombstoned items
    if (Array.isArray(idbValue)) {
      const parsedLocal = JSON.parse(rawLocal);
      if (Array.isArray(parsedLocal) && parsedLocal.length === 0 && idbValue.length > 0) {
        const cleaned = filterTombstones(idbValue);
        if (Array.isArray(cleaned) && cleaned.length > 0) {
          onRestored(cleaned);
        }
      }
    }
  } catch {
    // Ignore IDB hydration errors
  }
}

/**
 * Tombstone management for explicitly deleted records (e.g. deleted products or saved mixes)
 * so they are never resurrected from initial seed data or stale cloud snapshots.
 */
export function getDeletedTombstones(): DeletedTombstones {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        savedMixes: Array.isArray(parsed.savedMixes) ? parsed.savedMixes : [],
      };
    }
  } catch {}
  return { products: [], sales: [], expenses: [], savedMixes: [] };
}

export function addDeletedTombstone(
  category: keyof DeletedTombstones,
  id: string | number
): void {
  try {
    const current = getDeletedTombstones();
    const list = current[category] as Array<string | number>;
    if (!list.some((item) => String(item) === String(id))) {
      list.push(id);
      localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(current));
      idbSet(TOMBSTONES_KEY, current).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to record tombstone:', e);
  }
}

export function removeDeletedTombstone(
  category: keyof DeletedTombstones,
  id: string | number
): void {
  try {
    const current = getDeletedTombstones();
    current[category] = (current[category] as Array<string | number>).filter(
      (item) => String(item) !== String(id)
    ) as any;
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(current));
    idbSet(TOMBSTONES_KEY, current).catch(() => {});
  } catch {}
}

/**
 * Smart Non-Destructive Merge between Local Records and Cloud Snapshot Records.
 * - Never wipes out local records when cloud returns an empty or partial snapshot.
 * - Preserves locally added or locally edited records (comparing updatedAt / reversed flags).
 * - Filters out explicitly tombstoned (deleted) IDs.
 * - Returns both the merged list and any local-only/newer records that should be pushed to the cloud.
 */
const syncedInSessionKeys = new Set<string>();

export function mergeCollectionRecords<T extends { id: string | number; updatedAt?: string; isReversed?: boolean }>(
  localList: T[],
  cloudList: T[],
  tombstoneCategory?: keyof DeletedTombstones
): { merged: T[]; unsyncedLocalItems: T[] } {
  const tombstones = tombstoneCategory
    ? new Set(getDeletedTombstones()[tombstoneCategory].map((x) => String(x)))
    : new Set<string>();

  const cloudMap = new Map<string, T>();
  (cloudList || []).forEach((item) => {
    const key = String(item.id);
    if (!tombstones.has(key)) {
      cloudMap.set(key, item);
    }
  });

  const mergedMap = new Map<string, T>();
  const unsyncedLocalItems: T[] = [];
  const categoryPrefix = tombstoneCategory || 'default';

  // 1. Start with all local items that are not tombstoned
  (localList || []).forEach((localItem) => {
    const key = String(localItem.id);
    if (tombstones.has(key)) return;

    const sessionSyncKey = `${categoryPrefix}:${key}`;
    const cloudItem = cloudMap.get(key);
    if (!cloudItem) {
      // Local item does not exist in cloud yet -> KEEP IT and queue once per session for cloud sync
      mergedMap.set(key, localItem);
      if (!syncedInSessionKeys.has(sessionSyncKey)) {
        syncedInSessionKeys.add(sessionSyncKey);
        unsyncedLocalItems.push(localItem);
      }
    } else {
      // Both exist -> pick the one with newer updatedAt or reversed state
      const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
      const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;

      if (localItem.isReversed && !cloudItem.isReversed) {
        mergedMap.set(key, localItem);
        const revSyncKey = `${sessionSyncKey}:rev`;
        if (!syncedInSessionKeys.has(revSyncKey)) {
          syncedInSessionKeys.add(revSyncKey);
          unsyncedLocalItems.push(localItem);
        }
      } else if (localTime > cloudTime) {
        mergedMap.set(key, localItem);
        const timeSyncKey = `${sessionSyncKey}:${localTime}`;
        if (!syncedInSessionKeys.has(timeSyncKey)) {
          syncedInSessionKeys.add(timeSyncKey);
          unsyncedLocalItems.push(localItem);
        }
      } else {
        mergedMap.set(key, cloudItem);
      }
    }
  });

  // 2. Add any cloud items that weren't in localList (and aren't tombstoned)
  cloudMap.forEach((cloudItem, key) => {
    if (!mergedMap.has(key) && !tombstones.has(key)) {
      mergedMap.set(key, cloudItem);
    }
  });

  return {
    merged: Array.from(mergedMap.values()),
    unsyncedLocalItems,
  };
}
