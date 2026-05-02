<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

const delaySeconds = 60;
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

async function showNotification() {
  const body = "Test de notificacion: esta es una notificacion simulada de la app.";
  countdown.value = 0;
  message.value = "Notificacion de prueba ejecutada.";

  if ("Notification" in window) {
    let permission = Notification.permission;

    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission === "granted") {
      new Notification("Offline Demo", {
        body,
        icon: "./icons/icon-192.png"
      });
      return;
    }
  }

  visualNotification.value = body;
}

function scheduleNotification() {
  clearTimers();
  visualNotification.value = "";
  countdown.value = delaySeconds;
  message.value = "Notificacion programada para dentro de 1 minuto.";

  intervalId = window.setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1);
  }, 1000);

  timeoutId = window.setTimeout(() => {
    clearTimers();
    showNotification();
  }, delaySeconds * 1000);
}

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
      Usa Notification API si el navegador da permiso. Si no, muestra un aviso visual en la app.
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
