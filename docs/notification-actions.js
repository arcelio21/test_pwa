self.addEventListener("notificationclick", (event) => {
  const notificationData = event.notification.data || {};
  const registroId = notificationData.registroId;
  const appUrl = notificationData.url || self.registration.scope;

  event.notification.close();

  event.waitUntil(handleNotificationClick(event.action, registroId, appUrl));
});

async function handleNotificationClick(action, registroId, appUrl) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  const appClient = windowClients.find((client) =>
    client.url.startsWith(self.registration.scope)
  );

  if (action === "aprobar" && registroId) {
    if (appClient) {
      await appClient.focus();
      appClient.postMessage({
        type: "APPROVE_REQUEST_FROM_NOTIFICATION",
        registroId
      });
      return;
    }

    const approveUrl = new URL(appUrl);
    approveUrl.searchParams.set("approve", registroId);
    await clients.openWindow(approveUrl.href);
    return;
  }

  if (appClient) {
    await appClient.focus();
    return;
  }

  await clients.openWindow(appUrl);
}
