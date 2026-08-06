import { beforeEach, describe, expect, it } from "vitest";

// Node ortamında yerel depolama taklidi (modüller window.localStorage okur).
const store = new Map<string, string>();
const localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
(globalThis as unknown as { window: unknown }).window = { localStorage };
import {
  idsOfPerson,
  linkNodeToPerson,
  nameKeyOf,
  repairCrossLinks,
  resolvePhoneHash,
  writePhoneHash,
  PHONE_HASH_KEY,
} from "@/lib/chat/name-resolver";

const PERSON_MAP_KEY = "tedbirge.chat.personMap";

function seedHash(id: string, hash: string) {
  const raw = JSON.parse(localStorage.getItem(PHONE_HASH_KEY) ?? "{}") as Record<string, string>;
  raw[id] = hash;
  localStorage.setItem(PHONE_HASH_KEY, JSON.stringify(raw));
}

describe("numara çıpalı kimlik", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("farklı numaraya çıpalı iki düğüm aynı kişiye bağlanmaz", () => {
    seedHash("node-turkan", "hash-turkan");
    seedHash("node-hasan", "hash-hasan");
    linkNodeToPerson("node-turkan", "node-hasan");
    expect(nameKeyOf("node-turkan")).toBe("node-turkan");
    expect(idsOfPerson("node-turkan")).not.toContain("node-hasan");
  });

  it("aynı numaraya sahip cihazlar tek kişide birleşir", () => {
    seedHash("node-a", "hash-1");
    seedHash("node-b", "hash-1");
    linkNodeToPerson("node-b", "node-a");
    expect(nameKeyOf("node-b")).toBe("node-a");
    expect(idsOfPerson("node-a").sort()).toEqual(["node-a", "node-b"]);
  });

  it("başka numaraya çıpalı kimliğin özeti ezilmez", () => {
    seedHash("node-x", "hash-x");
    seedHash("node-y", "hash-y");
    localStorage.setItem(PERSON_MAP_KEY, JSON.stringify({ "node-y": "node-x" }));
    writePhoneHash("node-x", "hash-x");
    expect(resolvePhoneHash("node-y")).toBe("hash-y");
  });

  it("geçmişteki çapraz bağlantı onarılır", () => {
    seedHash("node-1", "hash-1");
    seedHash("node-2", "hash-2");
    localStorage.setItem(PERSON_MAP_KEY, JSON.stringify({ "node-2": "node-1" }));
    expect(repairCrossLinks()).toBe(1);
    expect(JSON.parse(localStorage.getItem(PERSON_MAP_KEY) ?? "{}")).toEqual({});
  });
});
