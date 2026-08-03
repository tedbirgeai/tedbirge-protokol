/**
 * Bulut yedek röle istemcisi.
 * ------------------------------------------------------------------
 * Eş doğrudan bağlı değilken (kapalı cihaz, farklı ağ) şifreli zarfı
 * geçici olarak buluta bırakır; alıcı açıldığında teslim alır.
 * İçerik uçtan uca şifrelidir — bulut yalnızca taşıyıcıdır.
 */

export type RelayKeys = { nodeId: string; signPublic: string; boxPublic: string };

const ENDPOINT = "/api/public/relay";

async function call<T>(body: unknown): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function publishRelayKeys(keys: RelayKeys): Promise<boolean> {
  const res = await call<{ ok: boolean }>({ action: "publish", ...keys });
  return Boolean(res?.ok);
}

export async function lookupRelayKeys(nodeId: string): Promise<RelayKeys | null> {
  const res = await call<{ ok: boolean; found: boolean } & RelayKeys>({ action: "lookup", nodeId });
  if (!res?.ok || !res.found) return null;
  return { nodeId: res.nodeId, signPublic: res.signPublic, boxPublic: res.boxPublic };
}

export async function pushRelayEnvelopes(
  items: { pktId: string; to: string; from: string; envelope: string; priority: number }[],
): Promise<boolean> {
  if (!items.length) return false;
  const res = await call<{ ok: boolean }>({ action: "push", items });
  return Boolean(res?.ok);
}

export async function pullRelayEnvelopes(
  nodeId: string,
  ack: string[] = [],
): Promise<{ pktId: string; envelope: string }[] | null> {
  const res = await call<{ ok: boolean; items: { pktId: string; envelope: string }[] }>({
    action: "pull",
    nodeId,
    ack,
  });
  return res?.ok ? (res.items ?? []) : null;
}
