<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import NotificationTester from "./components/NotificationTester.vue";
import RecordForm from "./components/RecordForm.vue";
import RecordList from "./components/RecordList.vue";
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
const pwaUpdateAvailable = ref(false);
const pwaOfflineReady = ref(false);
const updateServiceWorker = ref(null);
const activeTab = ref("home");
const showSplash = ref(true);

const activeRecords = computed(() =>
  [...records.value].sort((a, b) => new Date(b.actualizadoEn) - new Date(a.actualizadoEn))
);
const stats = computed(() => ({
  total: records.value.length,
  pending: records.value.filter((record) => record.syncStatus === "pendiente").length,
  synced: records.value.filter((record) => record.syncStatus === "sincronizado").length,
  approved: records.value.filter((record) => record.estado === "aprobado").length
}));

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
  window.setTimeout(() => {
    showSplash.value = false;
  }, 1200);
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
  <div v-if="showSplash" class="splash-screen">
    <img src="/icons/icon-192.png" alt="Offline Demo" width="92" height="92" />
    <h1>Offline Demo</h1>
    <p>Preparando datos locales</p>
  </div>

  <main class="mobile-shell">
    <header class="mobile-topbar">
      <button :class="['connection-chip', isOnline ? 'online' : 'offline']" type="button">
        {{ isOnline ? "Conectado" : "Sin conexion" }}
      </button>
      <div class="app-mark">
        <img src="/icons/icon-192.png" alt="" width="34" height="34" />
        <span>Offline Demo</span>
      </div>
    </header>

    <div v-if="pwaUpdateAvailable" class="update-banner">
      <span>Nueva version disponible.</span>
      <button type="button" @click="refreshPwa">Actualizar</button>
    </div>

    <div v-if="pwaOfflineReady" class="offline-ready">
      La app esta lista para cargar recursos basicos sin conexion despues de esta visita.
    </div>

    <section v-if="activeTab === 'home'" class="screen-stack">
      <section class="home-hero">
        <p class="eyebrow">PWA offline-first</p>
        <h1>Gestiona registros locales y prueba aprobaciones desde notificaciones.</h1>
      </section>

      <section class="quick-stats">
        <article>
          <span>{{ stats.total }}</span>
          <p>Todos</p>
        </article>
        <article>
          <span>{{ stats.pending }}</span>
          <p>Pendientes</p>
        </article>
        <article>
          <span>{{ stats.approved }}</span>
          <p>Aprobados</p>
        </article>
      </section>

      <NotificationTester :records="records" />

      <section class="panel info-panel">
        <p class="eyebrow">Almacenamiento</p>
        <h2>IndexedDB + Service Worker</h2>
        <p>
          Los registros viven en IndexedDB para que la app y el Service Worker puedan aprobar en
          segundo plano desde la notificacion.
        </p>
      </section>
    </section>

    <section v-if="activeTab === 'todos'" class="screen-stack">
      <div class="screen-title">
        <p class="eyebrow">Registros</p>
        <h1>Todos</h1>
      </div>
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
    </section>

    <section v-if="activeTab === 'profile'" class="screen-stack">
      <div class="profile-card">
        <img src="/icons/icon-192.png" alt="" width="76" height="76" />
        <h1>Perfil demo</h1>
        <p>Entorno local para probar PWA, notificaciones e IndexedDB sin backend real.</p>
      </div>

      <section class="panel profile-list">
        <div>
          <span>Total de registros</span>
          <strong>{{ stats.total }}</strong>
        </div>
        <div>
          <span>Pendientes</span>
          <strong>{{ stats.pending }}</strong>
        </div>
        <div>
          <span>Sincronizados</span>
          <strong>{{ stats.synced }}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{{ isOnline ? "Online" : "Offline" }}</strong>
        </div>
      </section>

      <p v-if="syncMessage" class="sync-message">{{ syncMessage }}</p>
    </section>

    <nav class="bottom-nav" aria-label="Navegacion principal">
      <button :class="{ active: activeTab === 'home' }" type="button" @click="activeTab = 'home'">
        <span>H</span>
        Home
      </button>
      <button :class="{ active: activeTab === 'todos' }" type="button" @click="activeTab = 'todos'">
        <span>T</span>
        Todos
      </button>
      <button :class="{ active: activeTab === 'profile' }" type="button" @click="activeTab = 'profile'">
        <span>P</span>
        Profile
      </button>
    </nav>
  </main>
</template>
