const STORAGE_KEY = "offline-first-demo-records";

function readRecords() {
  try {
    const rawRecords = localStorage.getItem(STORAGE_KEY);
    return rawRecords ? JSON.parse(rawRecords) : [];
  } catch (error) {
    console.warn("No se pudieron leer los registros locales", error);
    return [];
  }
}

export function getRecords() {
  return readRecords();
}

export function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return records;
}

export function addRecord(record) {
  const records = getRecords();
  const nextRecords = [record, ...records];
  return saveRecords(nextRecords);
}

export function updateRecord(record) {
  const nextRecords = getRecords().map((currentRecord) =>
    currentRecord.id === record.id ? record : currentRecord
  );
  return saveRecords(nextRecords);
}

export function markRecordAsDeleted(id, updatedAt) {
  const nextRecords = getRecords().map((record) =>
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

export function removeDeletedSyncedRecords() {
  const nextRecords = getRecords().filter(
    (record) =>
      !(record.estado === "eliminado" && record.syncStatus === "sincronizado")
  );

  return saveRecords(nextRecords);
}
