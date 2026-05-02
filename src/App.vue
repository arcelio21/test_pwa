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
  getRecords,
  markRecordAsDeleted,
  updateRecord
} from "./services/localStorageService";
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

function loadRecords() {
  records.value = getRecords();
}

function createRecordId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function handleSaveRecord(payload) {
  const timestamp = nowIso();

  if (editingRecord.value) {
    const updatedRecord = {
      ...editingRecord.value,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      actualizadoEn: timestamp,
      syncStatus: "pendiente"
    };

    updateRecord(updatedRecord);
    editingRecord.value = null;
    syncMessage.value = "Cambios guardados localmente. Pendiente de sincronizar.";
    loadRecords();
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

  addRecord(record);
  syncMessage.value = "Registro creado localmente. Pendiente de sincronizar.";
  loadRecords();
}

function handleEditRecord(record) {
  editingRecord.value = { ...record };
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleDeleteRecord(id) {
  markRecordAsDeleted(id, nowIso());
  if (editingRecord.value?.id === id) {
    editingRecord.value = null;
  }
  syncMessage.value = "Registro marcado como eliminado. Pendiente de sincronizar.";
  loadRecords();
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

onMounted(() => {
  loadRecords();
  window.addEventListener("online", updateBrowserConnectionStatus);
  window.addEventListener("offline", updateBrowserConnectionStatus);
  window.addEventListener("pwa-update-available", handlePwaUpdate);
  window.addEventListener("pwa-offline-ready", handlePwaOfflineReady);
});

onUnmounted(() => {
  window.removeEventListener("online", updateBrowserConnectionStatus);
  window.removeEventListener("offline", updateBrowserConnectionStatus);
  window.removeEventListener("pwa-update-available", handlePwaUpdate);
  window.removeEventListener("pwa-offline-ready", handlePwaOfflineReady);
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
        <NotificationTester />
        <section class="panel info-panel">
          <p class="eyebrow">Notas tecnicas</p>
          <h2>Cache y datos</h2>
          <p>
            El Service Worker cachea archivos de la app. Los registros de esta demo viven en
            localStorage para que persistan al recargar.
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
