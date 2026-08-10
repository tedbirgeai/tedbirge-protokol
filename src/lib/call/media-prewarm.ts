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

const DENIED_KEY = "tedbirge.call.media-denied";

/** Kullanıcı izni daha önce reddettiyse tekrar tekrar sorulmaz. */
export function mediaPermissionDenied(): boolean {
  try {
    return window.localStorage.getItem(DENIED_KEY) === "1";
  } catch {
    return false;
  }
}

function markDenied(denied: boolean) {
  try {
    if (denied) window.localStorage.setItem(DENIED_KEY, "1");
    else window.localStorage.removeItem(DENIED_KEY);
  } catch {
    /* gizli mod */
  }
}

/**
 * İzni yalnızca kullanıcı arama başlattığında veya kamera/mikrofon
 * düğmesine bastığında ister. Reddedilirse hata fırlatmaz; arama sesli
 * moda düşer ve izin bir daha kendiliğinden sorulmaz.
 */
export async function prewarmMedia(force = false): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  const { mic, cam } = await mediaPermissionState();
  if (mic === "granted" && cam === "granted") {
    markDenied(false);
    return true;
  }
  if (mic === "denied" && cam === "denied") {
    markDenied(true);
    return false;
  }
  if (!force && mediaPermissionDenied()) return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stopAll(stream);
  } catch {
    // Görüntü reddedildiyse en azından mikrofon izni alınsın.
    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopAll(audioOnly);
    } catch {
      markDenied(true);
      return false;
    }
  }
  markDenied(false);
  try {
    window.localStorage.setItem(DONE_KEY, "1");
  } catch {
    /* gizli mod */
  }
  return true;
}

/**
 * Kabuk açılışında çağrılır. Artık kendiliğinden izin penceresi açmaz;
 * yalnızca mevcut izin durumunu okur. İzin, arama/kamera eylemiyle istenir.
 */
export function bootMediaPrewarm(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  void mediaPermissionState();
}
