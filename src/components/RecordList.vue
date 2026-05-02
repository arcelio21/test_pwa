<script setup>
import { formatDate } from "../utils/dateUtils";

defineProps({
  records: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(["edit", "delete"]);

function syncLabel(record) {
  if (record.estado === "eliminado" && record.syncStatus === "pendiente") {
    return "Eliminado pendiente";
  }

  const labels = {
    pendiente: "Pendiente de sincronizar",
    sincronizado: "Sincronizado",
    error: "Error"
  };

  return labels[record.syncStatus] || record.syncStatus;
}
</script>

<template>
  <section class="panel record-list-panel" aria-label="Lista de registros">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Datos guardados en localStorage</p>
        <h2>Lista de registros</h2>
      </div>
      <span class="counter">{{ records.length }} total</span>
    </div>

    <div v-if="records.length === 0" class="empty-state">
      <h3>No hay registros todavia</h3>
      <p>Crea el primer registro para probar persistencia local y sincronizacion simulada.</p>
    </div>

    <ul v-else class="record-list">
      <li
        v-for="record in records"
        :key="record.id"
        :class="['record-card', { deleted: record.estado === 'eliminado', approved: record.estado === 'aprobado' }]"
      >
        <div class="record-card-main">
          <div>
            <h3>{{ record.titulo }}</h3>
            <p>{{ record.descripcion || "Sin descripcion." }}</p>
          </div>
          <div class="status-stack">
            <span :class="['badge', record.estado]">{{ record.estado }}</span>
            <span :class="['badge', record.syncStatus]">{{ syncLabel(record) }}</span>
          </div>
        </div>

        <dl class="record-meta">
          <div>
            <dt>Creado</dt>
            <dd>{{ formatDate(record.creadoEn) }}</dd>
          </div>
          <div>
            <dt>Actualizado</dt>
            <dd>{{ formatDate(record.actualizadoEn) }}</dd>
          </div>
        </dl>

        <div class="button-row">
          <button
            type="button"
            class="secondary"
            :disabled="record.estado === 'eliminado'"
            @click="emit('edit', record)"
          >
            Editar
          </button>
          <button
            type="button"
            class="danger"
            :disabled="record.estado === 'eliminado'"
            @click="emit('delete', record.id)"
          >
            Eliminar
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
