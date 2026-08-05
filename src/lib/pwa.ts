/**
 * Çevrimdışı desteği: servis çalışanı yalnızca yayınlanmış üretim sitesinde kaydolur.
 * Lovable önizleme/iframe/dev ortamlarında kayıt reddedilir ve varsa eski kayıt silinir.
 */

const SW_URL = "/sw.js";
const UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const REFRESH_MARKER = "tedbirge:sw-refreshing";

type PwaUpdateDetail = {
  state: "checking" | "available" | "reloading";
  message: string;
};

function notify(detail: PwaUpdateDetail) {
  window.dispatchEvent(new CustomEvent("tedbirge:pwa-update", { detail }));
}

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
        return url.endsWith(SW_URL);
      })
      .map((r) => r.unregister()),
  );
}

/** useEffect içinden çağrılır. */
export function setupOfflineSupport() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    void unregisterAppWorkers();
    return;
  }
  window.sessionStorage.removeItem(REFRESH_MARKER);

  let intervalId: number | undefined;
  let refreshing = false;

  const reloadOnce = () => {
    if (refreshing) return;
    refreshing = true;
    if (window.sessionStorage.getItem(REFRESH_MARKER) === "1") {
      window.sessionStorage.removeItem(REFRESH_MARKER);
      return;
    }
    window.sessionStorage.setItem(REFRESH_MARKER, "1");
    notify({ state: "reloading", message: "Yeni sürüm yüklendi — uygulama yenileniyor." });
    window.setTimeout(() => window.location.reload(), 350);
  };

  const armUpdateSignals = (registration: ServiceWorkerRegistration) => {
    const checkNow = async () => {
      try {
        await registration.update();
        if (registration.waiting && navigator.serviceWorker.controller) {
          notify({ state: "available", message: "Yeni sürüm hazır — otomatik etkinleştiriliyor." });
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch {
        // Güncelleme kontrolü ağ yokken sessizce atlanır; bir sonraki online/interval denemesi yakalar.
      }
    };

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          notify({ state: "available", message: "Yeni sürüm hazır — otomatik etkinleştiriliyor." });
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    intervalId = window.setInterval(() => void checkNow(), UPDATE_INTERVAL_MS);
    window.addEventListener("online", () => void checkNow());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void checkNow();
    });
    void checkNow();
  };

  navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

  const register = () => {
    void navigator.serviceWorker
      .register(SW_URL, { scope: "/", updateViaCache: "none" })
      .then(armUpdateSignals)
      .catch(() => {
        if (intervalId) window.clearInterval(intervalId);
      });
  };

  // React hydration çoğu mobil cihazda window.load olayından sonra tamamlanır.
  // Bu durumda yalnız load dinlemek servis çalışanını hiç kaydetmiyordu.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
