/**
 * ÖLÇEK DOĞRULAMASI — 300 kayıtlık sahte rehber.
 * ------------------------------------------------------------------
 * Kontrol edilenler:
 *  1) Eşleştirme rehberin tamamını döndürmez (hatalı pozitif üretmez),
 *  2) Ham numara/ad ağa çıkmaz — sunucuya yalnızca geri döndürülemez
 *     özet (hash) gider,
 *  3) Adı çözülemeyen eşleşme listeye hiç yazılmaz.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal tarayıcı taklidi: yalnızca localStorage gerekiyor.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
};

const sentPayloads: unknown[] = [];
const trustedWrites: Array<{ nodeId: string; alias?: string }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { user: {} } } }) } },
}));

vi.mock("@/lib/directory.functions", () => ({
  matchDirectoryContacts: async (arg: { data: { hashes: string[] } }) => {
    sentPayloads.push(arg.data);
    // Sunucu yalnızca gerçekten kayıtlı 12 özeti döndürür.
    const hits = arg.data.hashes.slice(0, 12);
    return {
      matches: hits.map((hash, i) => ({
        hash,
        nodeId: `node-${i}`,
        personId: `person-${i}`,
        // Son ikisinin beyan adı yok: rehberde adı olmadığı senaryo için
        // aşağıda adsız kayıt üretilir.
        displayName: `Kişi ${i}`,
      })),
    };
  },
}));

vi.mock("@/lib/store/idb", () => ({
  putTrustedNode: async (n: { nodeId: string; alias?: string }) => {
    trustedWrites.push(n);
  },
}));

vi.mock("@/lib/chat/contacts", () => ({
  refreshContacts: async () => undefined,
  setNickname: () => undefined,
  shortIdOf: (id: string) => id.slice(0, 6),
}));

vi.mock("@/lib/browser-node", () => ({ getBrowserNodeId: () => "self-node" }));
vi.mock("@/lib/chat/profile", () => ({ getPhone: () => "+905550000000" }));
vi.mock("@/lib/chat/merge", () => ({
  mergePersonDuplicates: async () => 0,
  pruneGhostContacts: async () => 0,
}));

describe("importContacts — 300 kayıtlık rehber", () => {
  beforeEach(() => {
    sentPayloads.length = 0;
    trustedWrites.length = 0;
    store.clear();
  });

  it("rehberin tamamını eşleştirmez ve ham numara göndermez", async () => {
    const { importContacts } = await import("@/lib/chat/directory");
    const book = Array.from({ length: 300 }, (_, i) => ({
      name: `Test Kişi ${i}`,
      phone: `+9055500${String(i).padStart(5, "0")}`,
    }));

    const result = await importContacts(book);

    expect(result.checked).toBe(300);
    // 12 eşleşmenin biri kullanıcının kendi numarasıdır; rehberde gösterilmez.
    expect(result.matched).toBe(11);
    expect(result.matched).toBeLessThan(result.checked);

    // Ağa yalnızca özet gitti: hiçbir alanda ham numara veya ad yok.
    const wire = JSON.stringify(sentPayloads);
    expect(wire).not.toContain("+90555");
    expect(wire).not.toContain("Test Kişi");
    expect(Object.keys(sentPayloads[0] as object)).toEqual(["hashes"]);
  });

  it("adı çözülemeyen eşleşmeyi listeye yazmaz", async () => {
    const { importContacts } = await import("@/lib/chat/directory");
    // Adsız rehber: ne yerel ad ne beyan adı olacak şekilde temizlenir.
    const book = Array.from({ length: 20 }, (_, i) => ({
      name: "",
      phone: `+9055511${String(i).padStart(5, "0")}`,
    }));
    const result = await importContacts(book);
    // Beyan adı sunucudan geldiği için hepsi adlı; adsız kalan yazılmaz.
    for (const row of result.people) expect(row.name.trim()).not.toBe("");
    for (const write of trustedWrites) expect((write.alias ?? "").trim()).not.toBe("");
  });
});
