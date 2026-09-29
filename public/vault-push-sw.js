// Push-only worker: no navigation/asset cache that can strand members on an old build.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data;
    try { data = event.data.json(); } catch { return; }
    const path = typeof data.link_path === 'string' && data.link_path.startsWith('/academy/') && !data.link_path.includes('\\') ? data.link_path : '/academy/community';
    await self.registration.showNotification(data.title || 'Vault OS', {
      body: data.body || '', icon: '/favicon.ico', tag: data.notification_id,
      data: { path }, renotify: false,
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const path = event.notification.data?.path;
    const target = new URL(typeof path === 'string' && path.startsWith('/academy/') && !path.includes('\\') ? path : '/academy/community', self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'navigate' in client) {
        await client.navigate(target); await client.focus(); return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
