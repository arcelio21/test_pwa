<script setup>
defineProps({
  isOnline: {
    type: Boolean,
    required: true
  },
  isSimulated: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(["simulate-offline", "simulate-online", "use-browser-status"]);
</script>

<template>
  <section class="panel connection-panel" aria-label="Estado de conexion">
    <div>
      <p class="eyebrow">Estado de conexion</p>
      <h2 :class="['connection-title', isOnline ? 'online' : 'offline']">
        {{ isOnline ? "Conectado a Internet" : "Sin conexion" }}
      </h2>
      <p class="muted">
        {{ isSimulated ? "Estado simulado manualmente para pruebas locales." : "Estado detectado por el navegador." }}
      </p>
    </div>

    <div class="button-row">
      <button type="button" class="secondary" @click="emit('simulate-offline')">
        Simular sin conexion
      </button>
      <button type="button" class="secondary" @click="emit('simulate-online')">
        Simular conexion
      </button>
      <button type="button" class="ghost" @click="emit('use-browser-status')">
        Usar navegador
      </button>
    </div>
  </section>
</template>
