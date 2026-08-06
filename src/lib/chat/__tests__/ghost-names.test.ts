import { beforeEach, describe, expect, it } from "vitest";
import {
  NICK_KEY,
  ALIAS_KEY,
  purgePlaceholderNames,
  resolveDisplayName,
  writeClaimedName,
  writeNickname,
} from "@/lib/chat/name-resolver";
import { isNamed, safeTitleOf } from "@/lib/chat/safe-title";
import { isTechnicalLabel } from "@/lib/chat/display-name";

describe("hayalet ad koruması", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("nötr yer tutucu ad olarak saklanmaz", () => {
    writeNickname("peer1", "Tedbirge kullanıcısı");
    writeClaimedName("peer1", "Bilinmeyen kişi");
    expect(resolveDisplayName("peer1")).toBe("");
    expect(isNamed({ id: "c1", members: ["peer1"] })).toBe(false);
    expect(isTechnicalLabel(safeTitleOf({ id: "c1", members: ["peer1"] }))).toBe(true);
  });

  it("eski sürümden kalan yer tutucular temizlenir", () => {
    window.localStorage.setItem(NICK_KEY, JSON.stringify({ p1: "Tedbirge kullanıcısı" }));
    window.localStorage.setItem(ALIAS_KEY, JSON.stringify({ p1: "Anonim", p2: "Ekin Dinç" }));
    expect(purgePlaceholderNames()).toBe(2);
    expect(resolveDisplayName("p1")).toBe("");
    expect(resolveDisplayName("p2")).toBe("Ekin Dinç");
  });

  it("gerçek ad gelince kayıt görünür olur", () => {
    writeNickname("peer2", "Tedbirge kullanıcısı");
    expect(isNamed({ id: "c2", members: ["peer2"] })).toBe(false);
    writeNickname("peer2", "TÜRKAN DİNÇ");
    expect(safeTitleOf({ id: "c2", members: ["peer2"] })).toBe("TÜRKAN DİNÇ");
    expect(isNamed({ id: "c2", members: ["peer2"] })).toBe(true);
  });
});
