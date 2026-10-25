// Native IndexedDB storage wrapper for Sprinkle Rewards System
// Eliminates the 5MB browser localStorage quota limit, enabling unlimited branch & month storage.

const DB_NAME = 'sprinkle_rewards_db';
const DB_VERSION = 1;
const STORE_MONTHS = 'custom_months';

let dbInstance = null;

export function openDatabase() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_MONTHS)) {
          db.createObjectStore(STORE_MONTHS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB failed to open, falling back to in-memory/localStorage:', event.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception:', err);
      resolve(null);
    }
  });
}

export async function idbSaveMonth(monthObj) {
  if (!monthObj || !monthObj.key) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MONTHS, 'readwrite');
      const store = tx.objectStore(STORE_MONTHS);
      const req = store.put(monthObj);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('idbSaveMonth error:', req.error);
        resolve(false);
      };
    } catch (err) {
      console.warn('idbSaveMonth exception:', err);
      resolve(false);
    }
  });
}

export async function idbGetMonth(monthKey) {
  if (!monthKey) return null;
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MONTHS, 'readonly');
      const store = tx.objectStore(STORE_MONTHS);
      const req = store.get(monthKey);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

export async function idbGetAllMonths() {
  const db = await openDatabase();
  if (!db) return {};

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MONTHS, 'readonly');
      const store = tx.objectStore(STORE_MONTHS);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = {};
        const items = req.result || [];
        items.forEach(item => {
          if (item && item.key) {
            result[item.key] = item;
          }
        });
        resolve(result);
      };
      req.onerror = () => resolve({});
    } catch (err) {
      resolve({});
    }
  });
}

export async function idbDeleteMonth(monthKey) {
  if (!monthKey) return false;
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MONTHS, 'readwrite');
      const store = tx.objectStore(STORE_MONTHS);
      const req = store.delete(monthKey);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
}

// Generic Key-Value persistence over IndexedDB (bypasses 5MB localStorage limit)
export async function idbSetItem(key, value) {
  if (!key) return false;
  return idbSaveMonth({ key, value, updatedAt: new Date().toISOString() });
}

export async function idbGetItem(key) {
  if (!key) return null;
  const item = await idbGetMonth(key);
  return item ? (item.value !== undefined ? item.value : item) : null;
}

