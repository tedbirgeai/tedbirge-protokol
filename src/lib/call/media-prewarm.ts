/**
 * SIFIR-PENCERE ARAMA (Zero-Prompt Calls)
 * ------------------------------------------------------------------
 * Mikrofon/kamera izni arama anında değil, uygulama açılışında bir kez
 * istenir. İzin alındıktan sonra akış hemen kapatılır (kamera ışığı
 * yanmaz); tarayıcı izni hatırladığı için arama başlarken pencere
 * çıkmaz ve bağlantı doğrudan kurulur.
 *
 * Hiçbir görüntü/ses kaydedilmez, hiçbir yere gönderilmez.
 */

const DONE_KEY = "tedbirge.call.media-prewarmed";

type PermState = "granted" | "denied" | "prompt" | "unknown";

let started = false;

async function queryPermission(name: "camera" | "microphone"): Promise<PermState> {
  try {
    const perms = navigator.permissions as
      | { query: (d: { name: string }) => Promise<{ state: PermState }> }
      | undefined;
    if (!perms?.query) return "unknown";
    const res = await perms.query({ name });
    return res.state;
  } catch {
    return "unknown";
  }
}

/** İzinlerin şu anki durumu (arayüzde rozet göstermek için). */
export async function mediaPermissionState(): Promise<{ mic: PermState; cam: PermState }> {
  const [mic, cam] = await Promise.all([queryPermission("microphone"), queryPermission("camera")]);
  return { mic, cam };
}

function stopAll(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

/**
 * İzni bir kez alır. Zaten verilmişse hiçbir şey yapmaz.
 * Tarayıcılar izin penceresini yalnızca kullanıcı etkileşiminden sonra
 * gösterdiği için, ilk dokunuşta yeniden denenir.
 */
export async function prewarmMedia(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  const { mic, cam } = await mediaPermissionState();
  if (mic === "granted" && cam === "granted") return true;
  if (mic === "denied" && cam === "denied") return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stopAll(stream);
  } catch {
    // Görüntü reddedildiyse en azından mikrofon izni alınsın.
    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopAll(audioOnly);
    } catch {
      return false;
    }
  }
  try {
    window.localStorage.setItem(DONE_KEY, "1");
  } catch {
    /* gizli mod */
  }
  return true;
}

/**
 * Kabuk açılışında çağrılır: izin verilmişse sessiz geçer, verilmemişse
 * kullanıcının ilk dokunuşunda tek seferlik izin ister.
 */
export function bootMediaPrewarm(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  void (async () => {
    const { mic, cam } = await mediaPermissionState();
    if (mic === "granted" && cam === "granted") return;

    const once = () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      void prewarmMedia();
    };
    window.addEventListener("pointerdown", once, { once: true });
    window.addEventListener("keydown", once, { once: true });
  })();
}
