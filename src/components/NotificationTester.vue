<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const delaySeconds = 15;
const scheduledNotificationKey = "offline-demo-scheduled-notification-at";
const props = defineProps({
  records: {
    type: Array,
    required: true
  }
});

const countdown = ref(0);
const message = ref("");
const selectedRegistroId = ref("");
const visualNotification = ref("");
let timeoutId = null;
let intervalId = null;

const isScheduled = computed(() => countdown.value > 0);
const approvalCandidates = computed(() =>
  props.records.filter((record) => record.estado !== "eliminado")
);
const selectedRecord = computed(() =>
  approvalCandidates.value.find((record) => record.id === selectedRegistroId.value)
);

function clearTimers() {
  if (timeoutId) {
    window.clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

function clearScheduledNotification() {
  localStorage.removeItem(scheduledNotificationKey);
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }

  return Notification.permission;
}

function getAppUrl() {
  const appUrl = new URL(window.location.pathname, window.location.origin);
  appUrl.search = "";
  appUrl.hash = "";
  return appUrl.href;
}

function readScheduledNotification() {
  try {
    const storedValue = localStorage.getItem(scheduledNotificationKey);
    return storedValue ? JSON.parse(storedValue) : null;
  } catch (error) {
    console.warn("No se pudo leer la notificacion programada", error);
    return null;
  }
}

async function showNotification(registroId) {
  const record = props.records.find((currentRecord) => currentRecord.id === registroId);
  const body = record
    ? `Test de notificacion: aprobar "${record.titulo}".`
    : "Test de notificacion: esta es una notificacion simulada de la app.";

  countdown.value = 0;
  message.value = "Notificacion de prueba ejecutada.";
  visualNotification.value = body;
  clearScheduledNotification();

  if ("Notification" in window) {
    const permission = Notification.permission;

    if (permission === "granted") {
      const options = {
        body,
        actions: [
          {
            action: "aprobar",
            title: "Aprobar"
          }
        ],
        data: {
          registroId,
          url: getAppUrl()
        },
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png",
        tag: "offline-demo-test",
        renotify: true
      };

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification("Offline Demo", options);
          return;
        } catch (error) {
          console.warn("No se pudo mostrar desde el Service Worker", error);
        }
      }

      try {
        new Notification("Offline Demo", options);
      } catch (error) {
        console.warn("No se pudo mostrar la notificacion del navegador", error);
      }
      return;
    }
  }
}

function scheduleTimers(targetTime, registroId) {
  clearTimers();
  const remainingSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));

  if (remainingSeconds === 0) {
    showNotification(registroId);
    return;
  }

  countdown.value = remainingSeconds;

  intervalId = window.setInterval(() => {
    const nextRemainingSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
    countdown.value = nextRemainingSeconds;

    if (nextRemainingSeconds === 0) {
      clearTimers();
      showNotification(registroId);
    }
  }, 1000);

  timeoutId = window.setTimeout(() => {
    clearTimers();
    showNotification(registroId);
  }, remainingSeconds * 1000);
}

async function scheduleNotification() {
  if (!selectedRegistroId.value) {
    message.value = "Crea o selecciona un registro antes de programar la notificacion.";
    return;
  }

  visualNotification.value = "";

  const permission = await requestNotificationPermission();
  const targetTime = Date.now() + delaySeconds * 1000;
  localStorage.setItem(
    scheduledNotificationKey,
    JSON.stringify({
      targetTime,
      registroId: selectedRegistroId.value
    })
  );

  if (permission === "granted") {
    message.value = "Notificacion programada para dentro de 15 segundos. Puedes dejar la pestana en segundo plano.";
  } else if (permission === "denied") {
    message.value = "Notificacion programada para dentro de 15 segundos. El navegador bloqueo permisos, se mostrara aviso visual.";
  } else {
    message.value = "Notificacion programada para dentro de 15 segundos. Este navegador no soporta Notification API.";
  }

  scheduleTimers(targetTime, selectedRegistroId.value);
}

watch(
  approvalCandidates,
  (records) => {
    if (!records.some((record) => record.id === selectedRegistroId.value)) {
      selectedRegistroId.value = records[0]?.id || "";
    }
  },
  { immediate: true }
);

onMounted(() => {
  const scheduledNotification = readScheduledNotification();
  const storedTargetTime = Number(scheduledNotification?.targetTime);
  const storedRegistroId = scheduledNotification?.registroId;

  if (storedTargetTime && storedTargetTime > Date.now()) {
    message.value = "Hay una notificacion pendiente programada.";
    selectedRegistroId.value = storedRegistroId || selectedRegistroId.value;
    scheduleTimers(storedTargetTime, storedRegistroId);
  } else if (storedTargetTime) {
    showNotification(storedRegistroId);
  }
});

onBeforeUnmount(clearTimers);
</script>

<template>
  <section class="panel notification-panel" aria-label="Prueba de notificaciones">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Notificacion local</p>
        <h2>Prueba programada</h2>
      </div>
      <span v-if="isScheduled" class="counter">{{ countdown }}s</span>
    </div>

    <p class="muted">
      Funciona mientras la app siga abierta o en segundo plano. Si cierras la app por completo,
      una PWA sin backend no puede ejecutar el temporizador hasta que vuelvas a abrirla.
    </p>

    <label class="select-label">
      Registro para aprobar
      <select v-model="selectedRegistroId" :disabled="isScheduled || approvalCandidates.length === 0">
        <option value="" disabled>Selecciona un registro</option>
        <option
          v-for="record in approvalCandidates"
          :key="record.id"
          :value="record.id"
        >
          {{ record.titulo }} - {{ record.estado }}
        </option>
      </select>
    </label>

    <button
      type="button"
      class="full-width"
      :disabled="isScheduled || !selectedRecord"
      @click="scheduleNotification"
    >
      Programar notificacion de prueba
    </button>

    <p v-if="message" class="sync-message">{{ message }}</p>
    <div v-if="visualNotification" class="visual-notification">
      {{ visualNotification }}
    </div>
  </section>
</template>
