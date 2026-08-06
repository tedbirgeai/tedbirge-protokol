/**
 * GÜVENLİ SAYFA TAZELEME
 * ------------------------------------------------------------------
 * Yeni sürüm geldiğinde sayfa yenilenir; ancak kullanıcı bir forma
 * yazıyorsa (katılım ekranı, mesaj kutusu, kişi formu) yenileme
 * ERTELENİR. Aksi halde yazarken ekran tazeleniyor ve girilen bilgi
 * kayboluyordu.
 */

const IDLE_MS = 12_000;
let lastTyped = 0;
let armed = false;
let pending = false;

function markTyping() {
  lastTyped = Date.now();
}

function arm() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  window.addEventListener("keydown", markTyping, true);
  window.addEventListener("input", markTyping, true);
  window.addEventListener("compositionupdate", markTyping, true);
}

/** Kullanıcı şu anda bir alana yazıyor mu? */
export function isUserTyping(): boolean {
  if (typeof document === "undefined") return false;
  if (Date.now() - lastTyped < IDLE_MS) return true;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Kullanıcı yazmayı bırakana kadar bekleyip sayfayı bir kez yeniler.
 * Sekme arka plandaysa da beklenir (görünür olunca uygulanır).
 */
export function safeReload(delayMs = 350): void {
  if (typeof window === "undefined" || pending) return;
  pending = true;
  arm();
  const attempt = () => {
    if (isUserTyping() || document.visibilityState === "hidden") {
      window.setTimeout(attempt, 3000);
      return;
    }
    window.location.reload();
  };
  window.setTimeout(attempt, delayMs);
}
