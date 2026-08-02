/**
 * Mesh uygulama veri yolu.
 * ------------------------------------------------------------------
 * Tarayıcı düğümünden gelen uygulama paketlerini (sohbet, arama,
 * eşitleme) ilgili motorlara dağıtır. Böylece sohbet ve arama
 * motorları birbirini içe aktarmadan aynı şifreli kanalı paylaşır.
 */

import { setMeshAppHandler } from "@/lib/browser-node";
import type { EnvelopeKind } from "@/lib/mesh-envelope";

type Sub = (from: string, body: unknown) => void;
/** Güven kapısı: false dönerse paket sessizce düşürülür (Model A). */
type Gate = (kind: EnvelopeKind, from: string, body: unknown) => boolean;

const subs = new Map<EnvelopeKind, Set<Sub>>();
let booted = false;
let gate: Gate | null = null;

export function setMeshGate(fn: Gate | null) {
  gate = fn;
}

export function onMesh(kind: EnvelopeKind, fn: Sub): () => void {
  let set = subs.get(kind);
  if (!set) {
    set = new Set();
    subs.set(kind, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}

export function bootMeshBus() {
  if (booted) return;
  booted = true;
  setMeshAppHandler((kind, from, body) => {
    if (gate && !gate(kind, from, body)) return; // eşleşmemiş cihaz → paket düşürülür
    subs.get(kind)?.forEach((fn) => {
      try {
        fn(from, body);
      } catch {
        /* tek dinleyici hatası diğerlerini durdurmaz */
      }
    });
  });
}
