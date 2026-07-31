/**
 * E2EE röle izolasyon testleri.
 * ------------------------------------------------------------------
 * Kanıtlanan davranışlar:
 *  1. Hedef düğüm gövdeyi açabilir.
 *  2. Ara röle (üçüncü düğüm) gövdeyi AÇAMAZ.
 *  3. Şifreli metin düz metin sızdırmaz.
 *  4. Rölenin gördüğü alanlar yalnızca yönlendirme başlığıdır.
 *  5. Gövde kurcalanırsa imza doğrulaması BAŞARISIZ olur.
 *  6. Röle TTL/hops günceller ama imzayı bozamaz.
 *  7. pktId deterministiktir (mükerrer paket engelleme).
 */

import { describe, expect, it } from "vitest";
import { ensureIdentity } from "@/lib/crypto/identity";
import {
  createEnvelope,
  forwardEnvelope,
  openEnvelope,
  packetId,
  relayVisibleFields,
  verifyEnvelope,
  encodeEnvelope,
  decodeEnvelope,
} from "@/lib/mesh-envelope";

const SECRET = "SAHA-KOORDINAT-41.0082-28.9784-GIZLI";

async function actors() {
  const alice = await ensureIdentity("test-alice");
  const bob = await ensureIdentity("test-bob");
  const mallory = await ensureIdentity("test-mallory");
  return { alice, bob, mallory };
}

async function envelopeAliceToBob() {
  const { alice, bob } = await actors();
  const env = await createEnvelope({
    from: alice.nodeId,
    to: bob.nodeId,
    kind: "text",
    payload: { text: SECRET, ts: 1 },
    peerBoxPublic: bob.boxPublic,
    senderSignPublic: alice.signPublic,
  });
  return { alice, bob, env };
}

describe("MeshEnvelope v2 — uçtan uca şifreleme ve röle izolasyonu", () => {
  it("hedef düğüm gövdeyi açabilir", async () => {
    const { bob, env } = await envelopeAliceToBob();
    const body = await openEnvelope<{ text: string }>(bob.nodeId, env);
    expect(body.text).toBe(SECRET);
  });

  it("ara röle (üçüncü düğüm) gövdeyi açamaz", async () => {
    const { env } = await envelopeAliceToBob();
    const { mallory } = await actors();
    await expect(openEnvelope(mallory.nodeId, env)).rejects.toBeDefined();
  });

  it("şifreli metin düz metin sızdırmaz", async () => {
    const { env } = await envelopeAliceToBob();
    const wire = encodeEnvelope(env);
    expect(wire).not.toContain(SECRET);
    expect(wire).not.toContain("41.0082");
    expect(env.b.ct.length).toBeGreaterThan(0);
  });

  it("rölenin gördüğü alanlar yalnızca yönlendirme başlığıdır", async () => {
    const { env } = await envelopeAliceToBob();
    const visible = relayVisibleFields(env);
    expect(Object.keys(visible).sort()).toEqual(
      ["bodyBytes", "bodyReadable", "from", "hops", "kind", "lamport", "to", "ttl"].sort(),
    );
    expect(visible.bodyReadable).toBe(false);
    expect(JSON.stringify(visible)).not.toContain(SECRET);
  });

  it("imza geçerlidir ve gövde kurcalanırsa reddedilir", async () => {
    const { env } = await envelopeAliceToBob();
    expect(verifyEnvelope(env)).toBe(true);

    const tampered = { h: { ...env.h }, b: { ...env.b, ct: env.b.ct.replace(/^./, "A") } };
    expect(verifyEnvelope(tampered)).toBe(false);
  });

  it("başlık alanları (to/kind) değiştirilirse imza reddedilir", async () => {
    const { env } = await envelopeAliceToBob();
    const rerouted = { h: { ...env.h, to: "saldirgan-dugum" }, b: env.b };
    expect(verifyEnvelope(rerouted)).toBe(false);
  });

  it("röle yalnızca TTL/hops günceller; imza ve gövde korunur", async () => {
    const { bob, env } = await envelopeAliceToBob();
    const hop1 = forwardEnvelope(env);
    expect(hop1).not.toBeNull();
    expect(hop1!.h.ttl).toBe(env.h.ttl - 1);
    expect(hop1!.h.hops).toBe(1);
    expect(hop1!.h.sig).toBe(env.h.sig);
    expect(hop1!.b.ct).toBe(env.b.ct);
    expect(verifyEnvelope(hop1!)).toBe(true);

    const body = await openEnvelope<{ text: string }>(bob.nodeId, hop1!);
    expect(body.text).toBe(SECRET);
  });

  it("TTL tükendiğinde paket röle edilmez", async () => {
    const { env } = await envelopeAliceToBob();
    const dead = { h: { ...env.h, ttl: 1 }, b: env.b };
    expect(forwardEnvelope(dead)).toBeNull();
  });

  it("pktId deterministiktir ve mükerrer engellemeye uygundur", async () => {
    const { env } = await envelopeAliceToBob();
    expect(packetId(env.h.from, env.h.lamport, env.b.ct)).toBe(env.h.pktId);
    const decoded = decodeEnvelope(encodeEnvelope(env));
    expect(decoded?.h.pktId).toBe(env.h.pktId);
  });

  it("aynı içerik iki kez şifrelendiğinde farklı şifreli metin üretir (efemer anahtar)", async () => {
    const a = await envelopeAliceToBob();
    const b = await envelopeAliceToBob();
    expect(a.env.b.ct).not.toBe(b.env.b.ct);
    expect(a.env.b.epk).not.toBe(b.env.b.epk);
    expect(a.env.h.pktId).not.toBe(b.env.h.pktId);
  });
});
