<script setup>
import { computed } from "vue";

const props = defineProps({
  records: {
    type: Array,
    required: true
  },
  isOnline: {
    type: Boolean,
    required: true
  },
  isSyncing: {
    type: Boolean,
    required: true
  },
  message: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["sync"]);

const totals = computed(() => {
  const pending = props.records.filter((record) => record.syncStatus === "pendiente").length;
  const synced = props.records.filter((record) => record.syncStatus === "sincronizado").length;
  const deletedPending = props.records.filter(
    (record) => record.estado === "eliminado" && record.syncStatus === "pendiente"
  ).length;

  return {
    total: props.records.length,
    pending,
    synced,
    deletedPending
  };
});
</script>

<template>
  <section class="panel sync-panel" aria-label="Panel de sincronizacion">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Supabase simulado</p>
        <h2>Sincronizacion</h2>
      </div>
      <span :class="['connection-pill', isOnline ? 'online' : 'offline']">
        {{ isOnline ? "Conectado" : "Sin conexion" }}
      </span>
    </div>

    <div class="stats-grid">
      <article>
        <span>{{ totals.total }}</span>
        <p>Total</p>
      </article>
      <article>
        <span>{{ totals.pending }}</span>
        <p>Pendientes</p>
      </article>
      <article>
        <span>{{ totals.synced }}</span>
        <p>Sincronizados</p>
      </article>
      <article>
        <span>{{ totals.deletedPending }}</span>
        <p>Eliminados pendientes</p>
      </article>
    </div>

    <button
      type="button"
      class="full-width"
      :disabled="!isOnline || isSyncing || totals.pending === 0"
      @click="emit('sync')"
    >
      {{ isSyncing ? "Sincronizando..." : "Sincronizar ahora" }}
    </button>

    <p v-if="!isOnline" class="sync-note">No se puede sincronizar sin conexion.</p>
    <p v-if="message" class="sync-message">{{ message }}</p>
  </section>
</template>
