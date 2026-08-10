/**
 * MOBİL GÖRÜNÜM SABİTLEME (viewport)
 * ------------------------------------------------------------------
 * iOS/Android klavyesi açıldığında tarayıcı görünür alanı küçültür ama
 * `100dvh` her cihazda doğru güncellenmez; kabuk kayar ve titrer.
 * Burada gerçek `visualViewport` yüksekliği `--wa-vh`, klavye yüksekliği
 * `--wa-keyboard` değişkenine yazılır. CSS zaten bu değişkenleri okur.
 *
 * Yalnızca tarayıcıda çalışır; SSR sırasında hiçbir şey yapmaz.
 */

let stop: (() => void) | null = null;

export function syncViewportUnits(): () => void {
  if (typeof window === "undefined") return () => {};
  if (stop) return stop;

  const root = document.documentElement;
  let frame = 0;

  const apply = () => {
    frame = 0;
    const vv = window.visualViewport;
    const height = Math.round(vv?.height ?? window.innerHeight);
    const keyboard = Math.max(0, Math.round(window.innerHeight - height));
    root.style.setProperty("--wa-vh", `${height}px`);
    root.style.setProperty("--wa-keyboard", `${keyboard}px`);
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(apply);
  };

  apply();
  const vv = window.visualViewport;
  vv?.addEventListener("resize", schedule);
  vv?.addEventListener("scroll", schedule);
  window.addEventListener("orientationchange", schedule);
  window.addEventListener("resize", schedule);

  stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    vv?.removeEventListener("resize", schedule);
    vv?.removeEventListener("scroll", schedule);
    window.removeEventListener("orientationchange", schedule);
    window.removeEventListener("resize", schedule);
    stop = null;
  };
  return stop;
}
