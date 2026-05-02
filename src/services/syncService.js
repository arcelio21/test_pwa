import { fakeSyncRecords } from "./fakeSupabaseService";
import { getRecords, saveRecords, removeDeletedSyncedRecords } from "./indexedDbService";

export async function syncPendingRecords() {
  const records = await getRecords();
  const pendingRecords = records.filter((record) => record.syncStatus === "pendiente");

  if (pendingRecords.length === 0) {
    return {
      records,
      syncedCount: 0,
      message: "No hay registros pendientes por sincronizar."
    };
  }

  const syncedRecords = await fakeSyncRecords(pendingRecords);
  const syncedById = new Map(syncedRecords.map((record) => [record.id, record]));

  const nextRecords = records.map((record) => syncedById.get(record.id) || record);
  await saveRecords(nextRecords);
  const cleanedRecords = await removeDeletedSyncedRecords();

  return {
    records: cleanedRecords,
    syncedCount: syncedRecords.length,
    message: "Datos sincronizados correctamente con Supabase simulado."
  };
}
