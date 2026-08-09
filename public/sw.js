// Liquifi service worker — handles web push + notification clicks.
// Served from /sw.js (public/). Registered by components/notifications/PushSubscriber.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const { title, body, url } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Liquifi", {
      body: body || "",
      data: { url: url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  const scope = self.registration.scope;

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && new URL(client.url).pathname !== new URL(targetUrl, scope).pathname) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      await clients.openWindow(targetUrl);
    })(),
  );
});

// Browser re-subscribes on its own after a key rotation; persist the new endpoint.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const subscription = event.newSubscription;
      if (!subscription) return;

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        console.error("[sw] failed to persist re-subscription", response.status);
      }
    })(),
  );
});
