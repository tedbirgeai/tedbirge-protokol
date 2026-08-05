/* eslint-disable no-undef */
/**
 * Tedbirge — bildirim servis çalışanı eklentisi.
 * ------------------------------------------------------------------
 * Workbox tarafından üretilen sw.js içine importScripts ile eklenir.
 * Uygulama tamamen kapalıyken bile push olayı burada karşılanır;
 * yalnızca jenerik metin gösterilir (içerik sunucuya çıkmaz).
 */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const isCall = data.kind === "call";
  const title = data.title || (isCall ? "Gelen arama" : "Yeni mesaj");
  const body = data.body || (isCall ? "Tedbirge üzerinden sizi arıyor." : "Şifreli mesajınız var.");
  const url = data.url || "/chat";

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || (isCall ? "tedbirge-call" : "tedbirge-chat"),
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [400, 200, 400, 200, 400] : [180, 80, 180],
    data: { url, kind: data.kind || "message" },
    actions: isCall
      ? [
          { action: "answer", title: "Cevapla" },
          { action: "dismiss", title: "Reddet" },
        ]
      : [{ action: "open", title: "Aç" }],
  };

  event.waitUntil(
    (async () => {
      // Uygulama önde açıksa çift bildirim göstermeyelim; sekmeyi uyandırmak yeter.
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const visible = clientList.find((c) => c.visibilityState === "visible");
      for (const client of clientList) {
        client.postMessage({ type: "tedbirge-push", kind: data.kind || "message" });
      }
      if (visible) return;
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = (event.notification.data && event.notification.data.url) || "/chat";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "tedbirge-push-open", url });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});

/* ------------------------------------------------------------------
 * ARKA PLAN EŞİTLEME (Background Sync)
 * Ağ geri geldiğinde tarayıcı bu olayı tetikler; açık sekmelere
 * "kuyruğu boşalt" mesajı gider. Sekme yoksa bir sonraki açılışta
 * kuyruk zaten kendiliğinden işlenir.
 * ------------------------------------------------------------------ */
async function wakeClientsForSync() {
  const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of list) client.postMessage({ type: "tedbirge-sync" });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "tedbirge-outbox") event.waitUntil(wakeClientsForSync());
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "tedbirge-outbox") event.waitUntil(wakeClientsForSync());
});
