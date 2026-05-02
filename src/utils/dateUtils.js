export function nowIso() {
  return new Date().toISOString();
}

export function formatDate(value) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
