<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import ConnectionStatus from "./components/ConnectionStatus.vue";
import NotificationTester from "./components/NotificationTester.vue";
import RecordForm from "./components/RecordForm.vue";
import RecordList from "./components/RecordList.vue";
import SyncPanel from "./components/SyncPanel.vue";
import { nowIso } from "./utils/dateUtils";
import {
  addRecord,
  approveRecord,
  getRecords,
  initializeRecordStorage,
  markRecordAsDeleted,
  updateRecord
} from "./services/indexedDbService";
import { syncPendingRecords } from "./services/syncService";

const records = ref([]);
const editingRecord = ref(null);
const isSyncing = ref(false);
const syncMessage = ref("");
const isOnline = ref(navigator.onLine);
const isConnectionSimulated = ref(false);
const pwaUpdateAvailable = ref(false);
const pwaOfflineReady = ref(false);
const updateServiceWorker = ref(null);

const activeRecords = computed(() =>
  [...records.value].sort((a, b) => new Date(b.actualizadoEn) - new Date(a.actualizadoEn))
);

async function loadRecords() {
  records.value = await getRecords();
}

function createRecordId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function handleSaveRecord(payload) {
  const timestamp = nowIso();

  if (editingRecord.value) {
    const updatedRecord = {
      ...editingRecord.value,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      actualizadoEn: timestamp,
      syncStatus: "pendiente"
    };

    await updateRecord(updatedRecord);
    editingRecord.value = null;
    syncMessage.value = "Cambios guardados localmente. Pendiente de sincronizar.";
    await loadRecords();
    return;
  }

  const record = {
    id: createRecordId(),
    titulo: payload.titulo,
    descripcion: payload.descripcion,
    estado: "activo",
    creadoEn: timestamp,
    actualizadoEn: timestamp,
    syncStatus: "pendiente"
  };

  await addRecord(record);
  syncMessage.value = "Registro creado localmente. Pendiente de sincronizar.";
  await loadRecords();
}

function handleEditRecord(record) {
  editingRecord.value = { ...record };
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleDeleteRecord(id) {
  await markRecordAsDeleted(id, nowIso());
  if (editingRecord.value?.id === id) {
    editingRecord.value = null;
  }
  syncMessage.value = "Registro marcado como eliminado. Pendiente de sincronizar.";
  await loadRecords();
}

async function aprobarRegistro(registroId) {
  const record = records.value.find((currentRecord) => currentRecord.id === registroId);

  if (!record || record.estado === "eliminado") {
    syncMessage.value = "No se pudo aprobar el registro solicitado.";
    return;
  }

  await approveRecord(registroId, nowIso());
  syncMessage.value = "Registro aprobado. Pendiente de sincronizar.";
  await loadRecords();
}

function handleServiceWorkerMessage(event) {
  if (event.data?.type === "APPROVE_REQUEST_FROM_NOTIFICATION") {
    aprobarRegistro(event.data.registroId);
  }

  if (event.data?.type === "RECORD_APPROVED_IN_BACKGROUND") {
    syncMessage.value = "Registro aprobado desde la notificacion. Pendiente de sincronizar.";
    loadRecords();
  }
}

async function approveFromQueryParam() {
  const url = new URL(window.location.href);
  const registroId = url.searchParams.get("approve");

  if (!registroId) return;

  await aprobarRegistro(registroId);
  url.searchParams.delete("approve");
  window.history.replaceState({}, "", url);
}

async function handleSync() {
  if (!isOnline.value || isSyncing.value) return;

  isSyncing.value = true;
  syncMessage.value = "Sincronizando cambios pendientes con Supabase simulado...";

  try {
    const result = await syncPendingRecords();
    records.value = result.records;
    syncMessage.value = result.message;
  } catch (error) {
    console.error(error);
    syncMessage.value = "Ocurrio un error durante la sincronizacion simulada.";
  } finally {
    isSyncing.value = false;
  }
}

function updateBrowserConnectionStatus() {
  if (!isConnectionSimulated.value) {
    isOnline.value = navigator.onLine;
  }
}

function simulateOffline() {
  isConnectionSimulated.value = true;
  isOnline.value = false;
}

function simulateOnline() {
  isConnectionSimulated.value = true;
  isOnline.value = true;
}

function useBrowserStatus() {
  isConnectionSimulated.value = false;
  isOnline.value = navigator.onLine;
}

function handlePwaUpdate(event) {
  updateServiceWorker.value = event.detail.updateSW;
  pwaUpdateAvailable.value = true;
}

function handlePwaOfflineReady() {
  pwaOfflineReady.value = true;
}

function refreshPwa() {
  updateServiceWorker.value?.(true);
}

onMounted(async () => {
  await initializeRecordStorage();
  await loadRecords();
  await approveFromQueryParam();
  window.addEventListener("online", updateBrowserConnectionStatus);
  window.addEventListener("offline", updateBrowserConnectionStatus);
  window.addEventListener("pwa-update-available", handlePwaUpdate);
  window.addEventListener("pwa-offline-ready", handlePwaOfflineReady);
  navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);
});

onUnmounted(() => {
  window.removeEventListener("online", updateBrowserConnectionStatus);
  window.removeEventListener("offline", updateBrowserConnectionStatus);
  window.removeEventListener("pwa-update-available", handlePwaUpdate);
  window.removeEventListener("pwa-offline-ready", handlePwaOfflineReady);
  navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
});
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Vue 3 + Vite + Workbox</p>
        <h1>Demo Offline First</h1>
        <p>
          CRUD local con sincronizacion simulada hacia Supabase y soporte PWA instalable.
        </p>
      </div>
      <img src="/icons/icon-192.png" alt="Icono Offline Demo" width="72" height="72" />
    </header>

    <div v-if="pwaUpdateAvailable" class="update-banner">
      <span>Nueva version disponible.</span>
      <button type="button" @click="refreshPwa">Actualizar</button>
    </div>

    <div v-if="pwaOfflineReady" class="offline-ready">
      La app esta lista para cargar recursos basicos sin conexion despues de esta visita.
    </div>

    <ConnectionStatus
      :is-online="isOnline"
      :is-simulated="isConnectionSimulated"
      @simulate-offline="simulateOffline"
      @simulate-online="simulateOnline"
      @use-browser-status="useBrowserStatus"
    />

    <section class="content-grid">
      <div class="main-column">
        <RecordForm
          :editing-record="editingRecord"
          @save="handleSaveRecord"
          @cancel="editingRecord = null"
        />
        <RecordList
          :records="activeRecords"
          @edit="handleEditRecord"
          @delete="handleDeleteRecord"
        />
      </div>

      <aside class="side-column">
        <SyncPanel
          :records="records"
          :is-online="isOnline"
          :is-syncing="isSyncing"
          :message="syncMessage"
          @sync="handleSync"
        />
        <NotificationTester :records="records" />
        <section class="panel info-panel">
          <p class="eyebrow">Notas tecnicas</p>
          <h2>Cache y datos</h2>
          <p>
            El Service Worker cachea archivos de la app. Los registros de esta demo viven en
            IndexedDB para que Vue y el Service Worker puedan compartirlos.
          </p>
          <p>
            En produccion, los Service Workers requieren HTTPS. GitHub Pages ya sirve los sitios
            con HTTPS y localhost funciona para desarrollo.
          </p>
        </section>
      </aside>
    </section>
  </main>
</template>
