<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const delaySeconds = 60;
const scheduledNotificationKey = "offline-demo-scheduled-notification-at";
const countdown = ref(0);
const message = ref("");
const visualNotification = ref("");
let timeoutId = null;
let intervalId = null;

const isScheduled = computed(() => countdown.value > 0);

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

async function showNotification() {
  const body = "Test de notificacion: esta es una notificacion simulada de la app.";
  countdown.value = 0;
  message.value = "Notificacion de prueba ejecutada.";
  visualNotification.value = body;
  clearScheduledNotification();

  if ("Notification" in window) {
    const permission = Notification.permission;

    if (permission === "granted") {
      const options = {
        body,
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

function scheduleTimers(targetTime) {
  clearTimers();
  const remainingSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));

  if (remainingSeconds === 0) {
    showNotification();
    return;
  }

  countdown.value = remainingSeconds;

  intervalId = window.setInterval(() => {
    const nextRemainingSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
    countdown.value = nextRemainingSeconds;

    if (nextRemainingSeconds === 0) {
      clearTimers();
      showNotification();
    }
  }, 1000);

  timeoutId = window.setTimeout(() => {
    clearTimers();
    showNotification();
  }, remainingSeconds * 1000);
}

async function scheduleNotification() {
  visualNotification.value = "";

  const permission = await requestNotificationPermission();
  const targetTime = Date.now() + delaySeconds * 1000;
  localStorage.setItem(scheduledNotificationKey, String(targetTime));

  if (permission === "granted") {
    message.value = "Notificacion programada para dentro de 1 minuto. Puedes dejar la pestana en segundo plano.";
  } else if (permission === "denied") {
    message.value = "Notificacion programada para dentro de 1 minuto. El navegador bloqueo permisos, se mostrara aviso visual.";
  } else {
    message.value = "Notificacion programada para dentro de 1 minuto. Este navegador no soporta Notification API.";
  }

  scheduleTimers(targetTime);
}

onMounted(() => {
  const storedTargetTime = Number(localStorage.getItem(scheduledNotificationKey));

  if (storedTargetTime && storedTargetTime > Date.now()) {
    message.value = "Hay una notificacion pendiente programada.";
    scheduleTimers(storedTargetTime);
  } else if (storedTargetTime) {
    showNotification();
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

    <button type="button" class="full-width" :disabled="isScheduled" @click="scheduleNotification">
      Programar notificacion de prueba
    </button>

    <p v-if="message" class="sync-message">{{ message }}</p>
    <div v-if="visualNotification" class="visual-notification">
      {{ visualNotification }}
    </div>
  </section>
</template>
