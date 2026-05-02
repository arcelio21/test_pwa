const DB_NAME = "offline-first-demo-db";
const DB_VERSION = 1;
const STORE_NAME = "records";

self.addEventListener("notificationclick", (event) => {
  const notificationData = event.notification.data || {};
  const registroId = notificationData.registroId;
  const appUrl = notificationData.url || self.registration.scope;

  event.notification.close();
  event.waitUntil(handleNotificationClick(event.action, registroId, appUrl));
});

async function handleNotificationClick(action, registroId, appUrl) {
  if (action === "aprobar" && registroId) {
    const approvedRecord = await approveRecordInIndexedDb(registroId);

    if (approvedRecord) {
      await notifyOpenClients(registroId);
      await self.registration.showNotification("Registro aprobado", {
        body: `"${approvedRecord.titulo}" quedo aprobado y pendiente de sincronizar.`,
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        tag: `approval-success-${registroId}`,
        data: {
          registroId,
          url: appUrl
        }
      });
      return;
    }

    await self.registration.showNotification("No se pudo aprobar", {
      body: "El registro no existe o ya no se puede aprobar.",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: `approval-error-${registroId}`,
      data: {
        registroId,
        url: appUrl
      }
    });
    return;
  }

  await openOrFocusApp(appUrl);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function approveRecordInIndexedDb(registroId) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(registroId);
    let approvedRecord = null;

    getRequest.onsuccess = () => {
      const record = getRequest.result;

      if (!record || record.estado === "eliminado") {
        resolve(null);
        return;
      }

      approvedRecord = {
        ...record,
        estado: "aprobado",
        actualizadoEn: new Date().toISOString(),
        syncStatus: "pendiente"
      };

      store.put(approvedRecord);
    };

    getRequest.onerror = () => reject(getRequest.error);
    transaction.oncomplete = () => resolve(approvedRecord);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function notifyOpenClients(registroId) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  windowClients
    .filter((client) => client.url.startsWith(self.registration.scope))
    .forEach((client) => {
      client.postMessage({
        type: "RECORD_APPROVED_IN_BACKGROUND",
        registroId
      });
    });
}

async function openOrFocusApp(appUrl) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  const appClient = windowClients.find((client) =>
    client.url.startsWith(self.registration.scope)
  );

  if (appClient) {
    await appClient.focus();
    return;
  }

  await clients.openWindow(appUrl);
}
