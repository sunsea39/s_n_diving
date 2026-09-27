self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'N×S_Diving', {
      body: data.body ?? '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url ?? '/s_n_diving/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/s_n_diving/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const matching = windows.find((client) => new URL(client.url).pathname.startsWith('/s_n_diving/'));
      if (!matching) return clients.openWindow(url);
      // Bring the open tab forward and move it to the notified page.
      return matching.focus().then((client) => (client.navigate ? client.navigate(url) : client));
    })
  );
});
