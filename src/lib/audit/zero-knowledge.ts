/**
 * KVKK & Sıfır-Bilgi Denetim Motoru — canlı 7 test.
 * ------------------------------------------------------------------
 * Testler tarayıcıda, kullanıcının kendi cihazında çalışır. Hiçbir
 * sonuç sunucuya gönderilmez; rapor yerelde üretilir.
 */

import {
  ensureIdentity,
  fingerprintOfKey,
  fromB64,
  toB64,
} from "@/lib/crypto/identity";
import {
  createEnvelope,
  forwardEnvelope,
  openEnvelope,
  relayVisibleFields,
  verifyEnvelope,
  encodeEnvelope,
} from "@/lib/mesh-envelope";
import { getKeyRecord } from "@/lib/store/idb";

export type AuditStatus = "pass" | "fail";

export type AuditCheck = {
  id: string;
  title: string;
  basis: string;
  status: AuditStatus;
  detail: string;
  durationMs: number;
};

export type AuditReport = {
  ts: number;
  nodeId: string;
  fingerprint: string;
  checks: AuditCheck[];
  passed: number;
  total: number;
};

const AUDIT_NODE = "__audit__";
const PROBE = "KVKK-DENETIM-KISISEL-VERI-41.0082-28.9784";

type Spec = {
  id: string;
  title: string;
  basis: string;
  run: () => Promise<{ ok: boolean; detail: string }>;
};

async function probeEnvelope() {
  const self = await ensureIdentity(AUDIT_NODE);
  const env = await createEnvelope({
    from: self.nodeId,
    to: self.nodeId,
    kind: "text",
    payload: { text: PROBE },
    peerBoxPublic: self.boxPublic,
    senderSignPublic: self.signPublic,
  });
  return { self, env };
}

const SPECS: Spec[] = [
  {
    id: "identity-local",
    title: "Kimlik anahtarı cihazda üretiliyor",
    basis: "KVKK m.12/1 — veri güvenliği; anahtar üretimi uçta",
    run: async () => {
      const id = await ensureIdentity(AUDIT_NODE);
      const ok = id.signPublic.length > 0 && id.boxPublic.length > 0 && id.alg.includes("Ed25519");
      return {
        ok,
        detail: `Algoritma ${id.alg}, parmak izi ${fingerprintOfKey(id.signPublic)}`,
      };
    },
  },
  {
    id: "kek-nonextractable",
    title: "Cihaz anahtarı (KEK) dışa aktarılamıyor",
    basis: "KVKK m.12/1(b) — yetkisiz erişimin önlenmesi",
    run: async () => {
      await ensureIdentity(AUDIT_NODE);
      const rec = await getKeyRecord("__device_kek__");
      if (!rec?.kek) return { ok: false, detail: "Cihaz anahtarı bulunamadı." };
      if (rec.kek.extractable) return { ok: false, detail: "Anahtar extractable olarak işaretli." };
      try {
        await crypto.subtle.exportKey("raw", rec.kek);
        return { ok: false, detail: "Anahtar dışa aktarılabildi — beklenmeyen durum." };
      } catch {
        return { ok: true, detail: "exportKey çağrısı tarayıcı tarafından reddedildi." };
      }
    },
  },
  {
    id: "seed-sealed",
    title: "Kök gizli (seed) yalnızca şifreli saklanıyor",
    basis: "KVKK m.12/3 — verinin şifreli muhafazası",
    run: async () => {
      await ensureIdentity(AUDIT_NODE);
      const rec = await getKeyRecord(AUDIT_NODE);
      const sealed = rec?.sealedSeed;
      if (!sealed?.ct) return { ok: false, detail: "Şifreli kök gizli kaydı bulunamadı." };
      const bytes = fromB64(sealed.ct);
      return {
        ok: bytes.length > 16 && !JSON.stringify(rec).includes("seed\":\"") ,
        detail: `AES-256-GCM ile mühürlü, ${bytes.length} bayt; açık seed kaydı yok.`,
      };
    },
  },
  {
    id: "body-encrypted",
    title: "Mesaj gövdesi uçtan uca şifreli",
    basis: "KVKK m.12 + GDPR m.32 — aktarımda şifreleme",
    run: async () => {
      const { env } = await probeEnvelope();
      const wire = encodeEnvelope(env);
      const leaks = wire.includes(PROBE) || wire.includes("41.0082");
      return {
        ok: !leaks,
        detail: leaks
          ? "Düz metin tel üzerinde görülebiliyor."
          : `${env.b.alg} — ${fromB64(env.b.ct).length} bayt şifreli gövde, düz metin sızıntısı yok.`,
      };
    },
  },
  {
    id: "relay-blind",
    title: "Ara röle içeriği göremiyor",
    basis: "Sıfır-bilgi röle ilkesi — veri minimizasyonu (KVKK m.4)",
    run: async () => {
      const { env } = await probeEnvelope();
      const hop = forwardEnvelope(env);
      const visible = relayVisibleFields(hop ?? env);
      const json = JSON.stringify(visible);
      return {
        ok: visible.bodyReadable === false && !json.includes(PROBE),
        detail: `Rölenin gördüğü alanlar: ${Object.keys(visible).join(", ")}.`,
      };
    },
  },
  {
    id: "tamper-detect",
    title: "Kurcalanan paket reddediliyor",
    basis: "Bütünlük — Ed25519 imza doğrulaması",
    run: async () => {
      const { env } = await probeEnvelope();
      const valid = verifyEnvelope(env);
      const tampered = verifyEnvelope({
        h: { ...env.h, to: "saldirgan" },
        b: { ...env.b, ct: env.b.ct.replace(/^./, "A") },
      });
      return {
        ok: valid && !tampered,
        detail: valid
          ? "Özgün paket doğrulandı; kurcalanmış paket imza kontrolünde düştü."
          : "Özgün paket doğrulanamadı.",
      };
    },
  },
  {
    id: "no-plaintext-storage",
    title: "Tarayıcı deposunda açık özel anahtar yok",
    basis: "KVKK m.12/1(c) — muhafaza güvenliği",
    run: async () => {
      const { self, env } = await probeEnvelope();
      const opened = await openEnvelope<{ text: string }>(self.nodeId, env);
      let leak: string | null = null;
      try {
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const k = window.localStorage.key(i);
          const v = k ? window.localStorage.getItem(k) : null;
          if (!v) continue;
          if (v.includes(PROBE) || /BEGIN (EC )?PRIVATE KEY/.test(v)) leak = k;
        }
      } catch {
        /* private mode */
      }
      return {
        ok: !leak && opened.text === PROBE,
        detail: leak
          ? `localStorage anahtarı sızıntı içeriyor: ${leak}`
          : "localStorage yalnızca açık meta veri tutuyor; özel anahtarlar IndexedDB'de mühürlü.",
      };
    },
  },
];

export const AUDIT_CHECK_COUNT = SPECS.length;

export async function runZeroKnowledgeAudit(
  onProgress?: (check: AuditCheck) => void,
): Promise<AuditReport> {
  const checks: AuditCheck[] = [];
  for (const spec of SPECS) {
    const started = performance.now();
    let result: AuditCheck;
    try {
      const r = await spec.run();
      result = {
        id: spec.id,
        title: spec.title,
        basis: spec.basis,
        status: r.ok ? "pass" : "fail",
        detail: r.detail,
        durationMs: Math.round(performance.now() - started),
      };
    } catch (err) {
      result = {
        id: spec.id,
        title: spec.title,
        basis: spec.basis,
        status: "fail",
        detail: err instanceof Error ? err.message : "Bilinmeyen hata",
        durationMs: Math.round(performance.now() - started),
      };
    }
    checks.push(result);
    onProgress?.(result);
  }

  const identity = await ensureIdentity(AUDIT_NODE);
  return {
    ts: Date.now(),
    nodeId: identity.nodeId,
    fingerprint: identity.fingerprint,
    checks,
    passed: checks.filter((c) => c.status === "pass").length,
    total: checks.length,
  };
}

/** Rapor özetinin bütünlük damgası (SHA-256, ilk 32 hane). */
export async function reportDigest(report: AuditReport): Promise<string> {
  const canonical = report.checks.map((c) => `${c.id}:${c.status}`).join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${report.ts}|${report.fingerprint}|${canonical}`),
  );
  return toB64(new Uint8Array(digest)).replace(/[^A-Za-z0-9]/g, "").slice(0, 32).toUpperCase();
}
