<script setup>
import { computed, reactive, watch } from "vue";

const props = defineProps({
  editingRecord: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["save", "cancel"]);

const form = reactive({
  titulo: "",
  descripcion: "",
  touched: false
});

const isEditing = computed(() => Boolean(props.editingRecord));
const titleError = computed(() =>
  form.touched && !form.titulo.trim() ? "El titulo es obligatorio." : ""
);

watch(
  () => props.editingRecord,
  (record) => {
    form.titulo = record?.titulo || "";
    form.descripcion = record?.descripcion || "";
    form.touched = false;
  },
  { immediate: true }
);

function resetForm() {
  form.titulo = "";
  form.descripcion = "";
  form.touched = false;
}

function submitForm() {
  form.touched = true;

  if (!form.titulo.trim()) return;

  emit("save", {
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim()
  });

  if (!isEditing.value) {
    resetForm();
  }
}

function cancelEdit() {
  resetForm();
  emit("cancel");
}
</script>

<template>
  <section class="panel" aria-label="Formulario de registros">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Registros locales</p>
        <h2>{{ isEditing ? "Editar registro" : "Agregar registro" }}</h2>
      </div>
      <button v-if="isEditing" type="button" class="ghost" @click="cancelEdit">
        Cancelar
      </button>
    </div>

    <form class="record-form" @submit.prevent="submitForm">
      <label>
        Titulo
        <input
          v-model="form.titulo"
          type="text"
          placeholder="Ej. Inspeccion de inventario"
          autocomplete="off"
          @blur="form.touched = true"
        />
      </label>
      <p v-if="titleError" class="form-error">{{ titleError }}</p>

      <label>
        Descripcion
        <textarea
          v-model="form.descripcion"
          rows="4"
          placeholder="Detalle opcional del registro"
        ></textarea>
      </label>

      <button type="submit">
        {{ isEditing ? "Guardar cambios" : "Crear registro" }}
      </button>
    </form>
  </section>
</template>
