/**
 * KATILIM KUYRUĞU VE OTONOM REHBER EŞİTLEME
 * ------------------------------------------------------------------
 * Çevrimdışı katılan kullanıcı da dizinde görünür: katılım kaydı cihazda
 * kuyruğa alınır, ağ/oturum geldiği anda phone_accounts'a yazılır.
 * Rehber eşitlemesi uygulama ön plana geldiğinde ve 6 saatte bir sessizce
 * tekrarlanır; başarısızlıkta üstel geri çekilmeyle yeniden denenir.
 *
 * KVKK: kuyrukta ham telefon numarası tutulmaz — yalnızca kişi/düğüm
 * kimliği ve kullanıcının kendi seçtiği görünen ad saklanır.
 */

const QUEUE_KEY = "tedbirge.chat.enrollQueue";
const LAST_SYNC_KEY = "tedbirge.chat.lastDirectorySync";

/** 6 saatlik sessiz yeniden eşitleme aralığı. */
export const RESYNC_INTERVAL_MS = 6 * 60 * 60_000;

export type PendingEnrollment = {
  personId: string;
  nodeId: string;
  displayName?: string;
  queuedAt: number;
};

function readQueue(): PendingEnrollment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingEnrollment) : null;
  } catch {
    return null;
  }
}

function writeQueue(value: PendingEnrollment | null) {
  try {
    if (value) window.localStorage.setItem(QUEUE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* gizli mod / kota */
  }
}

/** Katılım kaydını kuyruğa alır (çevrimdışıyken de kaybolmaz). */
export function queueEnrollment(entry: Omit<PendingEnrollment, "queuedAt">): void {
  writeQueue({ ...entry, queuedAt: Date.now() });
}

export function pendingEnrollment(): PendingEnrollment | null {
  return readQueue();
}

/**
 * Kuyruğu boşaltır. Oturum yoksa veya yazma başarısızsa kayıt kuyrukta
 * kalır ve bir sonraki denemede tekrar gönderilir.
 */
export async function flushEnrollment(): Promise<"sent" | "queued" | "empty"> {
  const pending = readQueue();
  if (!pending) return "empty";
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) return "queued";
    const { syncMyDirectoryEntry } = await import("@/lib/directory.functions");
    const res = await syncMyDirectoryEntry({
      data: {
        personId: pending.personId,
        nodeId: pending.nodeId,
        ...(pending.displayName ? { displayName: pending.displayName } : {}),
      },
    });
    if (!res.ok) return "queued";
    writeQueue(null);
    return "sent";
  } catch {
    return "queued";
  }
}

export function lastDirectorySync(): number {
  try {
    return Number(window.localStorage.getItem(LAST_SYNC_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function markSynced() {
  try {
    window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    /* gizli mod */
  }
}

/* --------------------- otonom zamanlayıcı --------------------- */

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = 60_000; // ilk hata sonrası 1 dk
const MAX_BACKOFF_MS = 60 * 60_000; // en fazla 1 saat

/** Tek tur: kuyruğu boşalt + rehberi yeniden eşleştir. */
export async function runDirectorySync(force = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!force && Date.now() - lastDirectorySync() < RESYNC_INTERVAL_MS) return true;
  try {
    const flushed = await flushEnrollment();
    const { autoSyncContacts } = await import("@/lib/chat/directory");
    const result = await autoSyncContacts();
    const ok = flushed !== "queued" && result.source !== "none";
    if (ok) markSynced();
    return ok;
  } catch {
    return false;
  }
}

function schedule(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void runDirectorySync(true).then((ok) => {
      if (ok) {
        backoffMs = 60_000;
        schedule(RESYNC_INTERVAL_MS);
      } else {
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
        schedule(backoffMs);
      }
    });
  }, delay);
}

/**
 * Uygulama açılışında bir kez çağrılır: ön plana gelişte, ağ dönüşünde ve
 * 6 saatte bir sessizce eşitler; hata hâlinde üstel geri çekilir.
 */
export function startDirectorySync(): () => void {
  if (typeof window === "undefined" || started) return () => undefined;
  started = true;

  const onForeground = () => {
    if (document.visibilityState !== "visible") return;
    void runDirectorySync(false);
  };
  const onOnline = () => void runDirectorySync(true);

  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("online", onOnline);
  schedule(3_000);

  return () => {
    started = false;
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onForeground);
    window.removeEventListener("online", onOnline);
  };
}
