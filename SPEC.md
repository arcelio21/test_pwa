# Especificacion funcional - Demo Offline First

## Objetivo

Crear una PWA de demostracion en Vue 3 que funcione offline-first para registros locales, permita altas, ediciones y eliminaciones logicas, y simule sincronizacion con Supabase cuando exista conexion.

## Flujo de usuario

1. El usuario abre la app y ve el estado de conexion.
2. Crea un registro con titulo obligatorio y descripcion opcional.
3. El registro se guarda en `IndexedDB` con estado de sincronizacion `pendiente`.
4. El usuario puede editar el registro; al guardar vuelve a quedar `pendiente`.
5. El usuario puede eliminarlo; la eliminacion es logica hasta sincronizar.
6. Si la app esta conectada, el usuario presiona "Sincronizar ahora".
7. La app simula una subida o borrado en Supabase con Promises y demoras.
8. Los registros sincronizados quedan marcados como `sincronizado`.
9. Los registros eliminados y sincronizados se remueven definitivamente del almacenamiento local.
10. El usuario puede programar una notificacion local que se dispara luego de 15 segundos.

## Modelo de datos

```js
{
  id: "string",
  titulo: "string",
  descripcion: "string",
  estado: "activo" | "aprobado" | "eliminado",
  creadoEn: "string",
  actualizadoEn: "string",
  syncStatus: "pendiente" | "sincronizado" | "error"
}
```

## Reglas de sincronizacion

- Solo se sincronizan registros con `syncStatus = "pendiente"`.
- Si `estado = "activo"`, se simula una subida a Supabase.
- Si `estado = "aprobado"`, se simula una subida a Supabase con el cambio pendiente.
- Si `estado = "eliminado"`, se simula una eliminacion en Supabase.
- Cada operacion tarda aproximadamente 1 segundo por registro.
- Si la sincronizacion es correcta, el registro activo pasa a `sincronizado`.
- Si el registro estaba eliminado, se borra localmente tras sincronizar.
- Si ocurre un error simulado, el registro queda con `syncStatus = "error"`.

## Reglas PWA

- La PWA usa `vite-plugin-pwa` y Workbox.
- El Service Worker es generado por el plugin, no escrito manualmente.
- `registerType` queda en `prompt` para permitir aviso de nueva version.
- La app requiere HTTPS en produccion para Service Workers.
- En `localhost` funciona para desarrollo.
- En GitHub Pages funciona porque el sitio se sirve con HTTPS.

## Estrategia de caching

- Cache Storage / Service Worker: guarda archivos de la aplicacion, iconos, scripts, estilos e imagenes.
- `IndexedDB`: guarda los registros de la demo y puede ser usado por Vue y el Service Worker.
- Imagenes e iconos: `CacheFirst`.
- JS y CSS: `StaleWhileRevalidate`.
- Peticiones simuladas a Supabase: no usan red real ni se cachean como datos remotos.
- Los registros no se guardan en Cache Storage para evitar tratar datos dinamicos como assets estaticos.

## Casos borde

- Titulo vacio: no se permite guardar.
- Sin conexion: se deshabilita la sincronizacion.
- Cambio de conexion real: se escuchan eventos `online` y `offline`.
- Pruebas locales: se agregan controles para simular conexion y desconexion.
- Notificaciones bloqueadas o no soportadas: se muestra aviso visual dentro de la app.
- Recarga de pagina: los registros persisten desde `IndexedDB`.
- Eliminacion offline: el registro queda marcado hasta sincronizar.
- Nueva version PWA: se muestra accion manual para actualizar.
