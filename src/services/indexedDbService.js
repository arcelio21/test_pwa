const DB_NAME = "offline-first-demo-db";
const DB_VERSION = 1;
const STORE_NAME = "records";
const LEGACY_STORAGE_KEY = "offline-first-demo-records";

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function runTransaction(mode, operation) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = operation(store);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function migrateLegacyLocalStorageRecords() {
  const rawRecords = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!rawRecords) return;

  try {
    const legacyRecords = JSON.parse(rawRecords);
    const currentRecords = await getRecords();

    if (Array.isArray(legacyRecords) && currentRecords.length === 0) {
      await saveRecords(legacyRecords);
    }

    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn("No se pudieron migrar los registros desde localStorage", error);
  }
}

export async function initializeRecordStorage() {
  await openDatabase();
  await migrateLegacyLocalStorageRecords();
}

export async function getRecords() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecords(records) {
  await runTransaction("readwrite", (store) => {
    store.clear();
    records.forEach((record) => store.put(record));
  });

  return records;
}

export async function addRecord(record) {
  await runTransaction("readwrite", (store) => {
    store.put(record);
  });

  return getRecords();
}

export async function updateRecord(record) {
  await runTransaction("readwrite", (store) => {
    store.put(record);
  });

  return getRecords();
}

export async function markRecordAsDeleted(id, updatedAt) {
  const records = await getRecords();
  const nextRecords = records.map((record) =>
    record.id === id
      ? {
          ...record,
          estado: "eliminado",
          actualizadoEn: updatedAt,
          syncStatus: "pendiente"
        }
      : record
  );

  return saveRecords(nextRecords);
}

export async function approveRecord(id, updatedAt) {
  const records = await getRecords();
  const nextRecords = records.map((record) =>
    record.id === id && record.estado !== "eliminado"
      ? {
          ...record,
          estado: "aprobado",
          actualizadoEn: updatedAt,
          syncStatus: "pendiente"
        }
      : record
  );

  return saveRecords(nextRecords);
}

export async function removeDeletedSyncedRecords() {
  const records = await getRecords();
  const nextRecords = records.filter(
    (record) =>
      !(record.estado === "eliminado" && record.syncStatus === "sincronizado")
  );

  return saveRecords(nextRecords);
}
