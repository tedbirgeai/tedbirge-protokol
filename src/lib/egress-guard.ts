/**
 * Egress (Çıkış) Kilidi — 5651 sayılı Kanun riski sıfırlama katmanı.
 * ------------------------------------------------------------------
 * Tedbirge Overlay hiçbir koşulda genel internete NAT/Proxy yapmaz.
 * Mesh üzerinde taşınan tek şey, gövdesi uçtan uca şifreli zarftır (b.ct).
 * Bu modül, yerel geçit (OpenWrt daemon) ve tarayıcı katmanı için sert
 * kodlanmış kuralı tek yerde tutar; kural çalışma zamanında kapatılamaz.
 */

/** Sert kodlanmış: genel internete çıkış (exit node) YOKTUR. */
export const EGRESS_BLOCKED = true as const;

export const EGRESS_POLICY = {
  title: "Egress/Exit Block — kapalı devre taşıma",
  summary:
    "Tedbirge düğümleri yalnızca ağ içi şifreli zarf taşır. Genel internete NAT, proxy, DNS ya da exit-node hizmeti verilmez; bu nedenle düğüm sahibi 5651 sayılı Kanun anlamında erişim sağlayıcı sıfatını kazanmaz.",
  rules: [
    "Overlay paketleri yalnızca mesh düğümleri arasında yönlendirilir; hedefi ağ dışı olan paket üretilmez ve iletilmez.",
    "Yerel geçit (OpenWrt daemon) IP forwarding/masquerade kurallarını açmaz; yalnızca WSS zarf akışı dinler.",
    "Röle düğüm gövdeyi çözemez; yalnızca yönlendirme başlığını (from/to/kind/ttl/hops) görür.",
    "Kural derleme zamanında sabittir; arayüzden veya yapılandırmadan devre dışı bırakılamaz.",
  ],
} as const;

/** Bir hedefin overlay içinde kalıp kalmadığını doğrular. */
export function isMeshTarget(target: string): boolean {
  if (!target) return false;
  if (target === "*") return true;
  return !/^(https?:|wss?:|ftp:)|^\d{1,3}(\.\d{1,3}){3}$/i.test(target);
}

/** Egress denemesini sert biçimde reddeder (çağrı yeri asla veri taşımaz). */
export function assertNoEgress(target: string): void {
  if (!isMeshTarget(target)) {
    throw new Error(
      "Egress kilidi: Tedbirge Overlay genel internete paket taşımaz (5651 kapalı devre kuralı).",
    );
  }
}
