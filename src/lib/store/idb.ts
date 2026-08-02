/**
 * Kalıcı yerel depolama (IndexedDB) — Local-First katmanın temeli.
 * ------------------------------------------------------------------
 * Hedef: 30 güne kadar internetsiz (off-grid) çalışma. localStorage'ın
 * ~5 MB / senkron sınırı yerine IndexedDB kullanılır; anahtarlar
 * non-extractable CryptoKey olarak saklanabilir.
 *
 * Depolar:
 *   outbox — gönderilmeyi bekleyen mesh zarfları (öncelikli budama)
 *   inbox  — görülmüş paket kimlikleri (mükerrer/idempotency kontrolü)
 *   keys   — düğüm anahtar malzemesi (CryptoKey nesneleri)
 *   peers  — eş genel anahtarları ve parmak izleri
 *   events — kesinti/olay günlüğü ve saha ölçümleri
 *
 * Tüm fonksiyonlar yalnızca tarayıcıda anlamlıdır; SSR sırasında
 * güvenli biçimde boş sonuç döner.
 */

export const DB_NAME = "tedbirge";
export const DB_VERSION = 3;

/** 0 = acil/güvenlik, 1 = kontrol, 2 = kullanıcı mesajı, 3 = telemetri. */
export type Priority = 0 | 1 | 2 | 3;

export type StoredPacket = {
  pktId: string;
  priority: Priority;
  ts: number;
  attempts: number;
  /** Serileştirilmiş MeshEnvelope v2 (gövde şifreli). */
  env: unknown;
};

export type SeenRecord = { pktId: string; ts: number };

export type PeerRecord = {
  peerId: string;
  /** Ed25519/ECDSA doğrulama anahtarı (base64, raw/spki). */
  verifyKey?: string;
  /** ECDH genel anahtarı (base64 raw). */
  publicKey?: string;
  fingerprint?: string;
  verified?: boolean;
  /** Kullanıcının parmak izini elle onayladığı an (epoch ms). */
  verifiedAt?: number;
  /** İlk görüldüğünde kaydedilen Ed25519 anahtarı — TOFU sabitlemesi. */
  knownSignPublic?: string;
  /** Anahtar değişimi tespit edildiği an (epoch ms). */
  keyChangedAt?: number;
  lastSeen: number;
};

export type KeyRecord = {
  nodeId: string;
  /** Cihaz anahtarı (KEK) — non-extractable, dışa aktarılamaz. */
  kek?: CryptoKey;
  /** KEK ile şifrelenmiş kök gizli (seed). */
  sealedSeed?: { iv: string; ct: string };
  signPublic?: string;
  boxPublic?: string;
  alg: string;
  createdAt: number;
};

/** Ed25519 imzalı çevrimdışı lisans belirteci (afet anında yerel doğrulama). */
export type OfflineLicenseRecord = {
  /** Lisans anahtarı ya da "local" varsayılan kaydı. */
  id: string;
  /** İmzalı yük (JSON, base64 kodlu). */
  payload: string;
  /** Ed25519 imzası (base64). */
  signature: string;
  /** İmzalayan düğümün doğrulama anahtarı (base64). */
  signPublic: string;
  issuedAt: number;
  expiresAt: number;
};

export type EventRecord = {
  id?: number;
  ts: number;
  kind: string;
  detail: string;
};

export function idbAvailable() {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (!idbAvailable()) return Promise.reject(new Error("IndexedDB yok"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("outbox")) {
        const s = db.createObjectStore("outbox", { keyPath: "pktId" });
        s.createIndex("priority_ts", ["priority", "ts"]);
        s.createIndex("ts", "ts");
      }
      if (!db.objectStoreNames.contains("inbox")) {
        const s = db.createObjectStore("inbox", { keyPath: "pktId" });
        s.createIndex("ts", "ts");
      }
      if (!db.objectStoreNames.contains("keys")) db.createObjectStore("keys", { keyPath: "nodeId" });
      if (!db.objectStoreNames.contains("peers")) db.createObjectStore("peers", { keyPath: "peerId" });
      if (!db.objectStoreNames.contains("events"))
        db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains("licenses")) db.createObjectStore("licenses", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB açılamadı"));
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB işlemi başarısız"));
      }),
  );
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

/* ----------------------------- outbox ----------------------------- */

export function putPacket(pkt: StoredPacket) {
  return safe(
    tx<IDBValidKey>("outbox", "readwrite", (s) => s.put(pkt) as IDBRequest<IDBValidKey>).then(() => true),
    false,
  );
}

export function getPackets(): Promise<StoredPacket[]> {
  return safe(
    tx<StoredPacket[]>("outbox", "readonly", (s) => s.getAll() as IDBRequest<StoredPacket[]>).then((rows) =>
      rows.sort((a, b) => a.priority - b.priority || a.ts - b.ts),
    ),
    [],
  );
}

export function deletePacket(pktId: string) {
  return safe(
    tx<undefined>("outbox", "readwrite", (s) => s.delete(pktId) as IDBRequest<undefined>).then(() => true),
    false,
  );
}

export function countPackets(): Promise<number> {
  return safe(tx<number>("outbox", "readonly", (s) => s.count()), 0);
}

/* ------------------------- inbox / idempotency ------------------------- */

export async function alreadySeen(pktId: string): Promise<boolean> {
  const row = await safe(
    tx<SeenRecord | undefined>("inbox", "readonly", (s) => s.get(pktId) as IDBRequest<SeenRecord | undefined>),
    undefined,
  );
  return Boolean(row);
}

export function markSeen(pktId: string) {
  return safe(
    tx<IDBValidKey>("inbox", "readwrite", (s) =>
      s.put({ pktId, ts: Date.now() } satisfies SeenRecord) as IDBRequest<IDBValidKey>,
    ).then(() => true),
    false,
  );
}

/** 30 günden eski görülmüş kayıtları temizler. */
export async function pruneSeen(maxAgeMs = 30 * 24 * 3600_000) {
  const rows = await safe(
    tx<SeenRecord[]>("inbox", "readonly", (s) => s.getAll() as IDBRequest<SeenRecord[]>),
    [],
  );
  const cutoff = Date.now() - maxAgeMs;
  const stale = rows.filter((r) => r.ts < cutoff);
  for (const r of stale) {
    await safe(
      tx<undefined>("inbox", "readwrite", (s) => s.delete(r.pktId) as IDBRequest<undefined>).then(() => undefined),
      undefined,
    );
  }
  return stale.length;
}

/* ------------------------------ keys ------------------------------ */

export function putKeyRecord(rec: KeyRecord) {
  return safe(
    tx<IDBValidKey>("keys", "readwrite", (s) => s.put(rec) as IDBRequest<IDBValidKey>).then(() => true),
    false,
  );
}

export function getKeyRecord(nodeId: string): Promise<KeyRecord | undefined> {
  return safe(
    tx<KeyRecord | undefined>("keys", "readonly", (s) => s.get(nodeId) as IDBRequest<KeyRecord | undefined>),
    undefined,
  );
}

/* -------------------- çevrimdışı lisans belirteçleri -------------------- */

export function putOfflineLicense(rec: OfflineLicenseRecord) {
  return safe(
    tx<IDBValidKey>("licenses", "readwrite", (s) => s.put(rec) as IDBRequest<IDBValidKey>).then(() => true),
    false,
  );
}

export function getOfflineLicense(id: string): Promise<OfflineLicenseRecord | undefined> {
  return safe(
    tx<OfflineLicenseRecord | undefined>("licenses", "readonly", (s) =>
      s.get(id) as IDBRequest<OfflineLicenseRecord | undefined>,
    ),
    undefined,
  );
}

export function listOfflineLicenses(): Promise<OfflineLicenseRecord[]> {
  return safe(
    tx<OfflineLicenseRecord[]>("licenses", "readonly", (s) => s.getAll() as IDBRequest<OfflineLicenseRecord[]>),
    [],
  );
}

/* ------------------------------ peers ------------------------------ */

export function putPeer(rec: PeerRecord) {
  return safe(
    tx<IDBValidKey>("peers", "readwrite", (s) => s.put(rec) as IDBRequest<IDBValidKey>).then(() => true),
    false,
  );
}

export function getPeer(peerId: string): Promise<PeerRecord | undefined> {
  return safe(
    tx<PeerRecord | undefined>("peers", "readonly", (s) => s.get(peerId) as IDBRequest<PeerRecord | undefined>),
    undefined,
  );
}

export function listPeers(): Promise<PeerRecord[]> {
  return safe(tx<PeerRecord[]>("peers", "readonly", (s) => s.getAll() as IDBRequest<PeerRecord[]>), []);
}

/* ------------------------------ events ------------------------------ */

export function appendEvent(kind: string, detail: string) {
  return safe(
    tx<IDBValidKey>("events", "readwrite", (s) =>
      s.add({ ts: Date.now(), kind, detail } satisfies EventRecord) as IDBRequest<IDBValidKey>,
    ).then(() => true),
    false,
  );
}

export function listEvents(): Promise<EventRecord[]> {
  return safe(
    tx<EventRecord[]>("events", "readonly", (s) => s.getAll() as IDBRequest<EventRecord[]>).then((r) =>
      r.sort((a, b) => b.ts - a.ts),
    ),
    [],
  );
}

/* ---------------------------- storage kotası ---------------------------- */

export type StorageEstimateInfo = { usage: number; quota: number; ratio: number; persisted: boolean };

export async function storageInfo(): Promise<StorageEstimateInfo> {
  const empty = { usage: 0, quota: 0, ratio: 0, persisted: false };
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return empty;
  try {
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    return { usage, quota, ratio: quota ? usage / quota : 0, persisted };
  } catch {
    return empty;
  }
}

/** Tarayıcıdan kalıcı depolama izni ister (30 günlük off-grid için gerekir). */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/* ------------------------- localStorage göçü ------------------------- */

const LEGACY_QUEUE_KEY = "tedbirge.browser-node.queue";

/**
 * Eski localStorage kuyruğunu (200 paket sınırı) bir kez IndexedDB'ye taşır.
 * Taşıma sonrası localStorage anahtarı silinir; ikinci kez çalışmaz.
 */
export async function migrateLegacyQueue(): Promise<number> {
  if (typeof window === "undefined" || !idbAvailable()) return 0;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LEGACY_QUEUE_KEY);
  } catch {
    return 0;
  }
  if (!raw) return 0;
  let items: Array<{ id?: string; at?: number; kind?: string }> = [];
  try {
    items = JSON.parse(raw) as typeof items;
  } catch {
    items = [];
  }
  let moved = 0;
  for (const env of items) {
    const pktId = env.id ?? `legacy-${moved}-${Date.now()}`;
    const ok = await putPacket({
      pktId,
      priority: env.kind === "telemetry" ? 3 : 1,
      ts: env.at ?? Date.now(),
      attempts: 0,
      env,
    });
    if (ok) moved += 1;
  }
  try {
    window.localStorage.removeItem(LEGACY_QUEUE_KEY);
  } catch {
    /* private mode */
  }
  return moved;
}
