import { PartItem } from "../types";

const DB_NAME = "ukonesera_wms_db";
const DB_VERSION = 1;
const STORE_NAME = "warehouse_parts";
const STORAGE_KEY = "ukonesera_wms_db_v2026";

/**
 * Open or initialize IndexedDB for large storage capacity
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save all drafts into IndexedDB asynchronously
 */
export async function saveDraftsToIndexedDB(drafts: PartItem[]): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Clear existing and rewrite
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const item of drafts) {
      store.put(item);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return true;
  } catch (err) {
    console.warn("IndexedDB save failed:", err);
    return false;
  }
}

/**
 * Load all drafts from IndexedDB
 */
export async function loadDraftsFromIndexedDB(): Promise<PartItem[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    return null;
  }
}

/**
 * Safe local storage saver that handles quota limits seamlessly
 */
export function safeSaveToLocalStorage(drafts: PartItem[]): void {
  try {
    // 1. Try saving full drafts
    const serialized = JSON.stringify(drafts);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e: any) {
    // 2. If quota exceeded, strip heavy images for localStorage while IndexedDB preserves them
    try {
      console.warn("localStorage quota exceeded, saving trimmed version to localStorage");
      const lightDrafts = drafts.map((d) => ({
        ...d,
        listingData: {
          ...d.listingData,
          zdjecia: (d.listingData.zdjecia || []).map((img) =>
            img.length > 500 ? img.slice(0, 100) + "..." : img
          ),
        },
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightDrafts));
    } catch (innerErr) {
      console.warn("Could not save to localStorage, continuing with in-memory and IndexedDB", innerErr);
    }
  }

  // Also persist full state into IndexedDB in background
  saveDraftsToIndexedDB(drafts).catch(() => {});
}

/**
 * Safe initial loader from localStorage
 */
export function safeLoadFromLocalStorage(): PartItem[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error reading from localStorage:", e);
  }
  return null;
}
