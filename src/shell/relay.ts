/**
 * RÖLE AYARI VE YASAL BEYAN
 * ------------------------------------------------------------------
 * Röle varsayılan olarak açıktır: cihazınız başkalarının şifreli
 * paketlerini taşıyabilir. Kapatılabilir olduğu için beyan metni
 * ayarla aynı ekranda gösterilir (/yasal ile aynı metin).
 */

const KEY = "tedbirge.shell.relay";

export const RELAY_LEGAL_TITLE = "Röle beyanı";

export const RELAY_LEGAL_TEXT = [
  "Röle açıkken cihazınız, yakınındaki diğer Tedbirge düğümlerinin uçtan uca şifreli paketlerini taşıyabilir. Bu paketlerin içeriği cihazınızda çözülemez, saklanmaz ve okunamaz; yalnız bir sonraki düğüme iletilir.",
  "Taşınan trafik internete çıkarılmaz. Tedbirge Protocol bir internet dağıtıcısı, VPN veya vekil sunucu değildir; röle yalnız Tedbirge ağı içindeki iletim içindir.",
  "Röleyi istediğiniz an kapatabilirsiniz. Kapalıyken cihazınız yalnız kendi mesajlarını gönderir ve alır; ağın kapsama alanı buna karşılık daralır.",
  "Taşınan paket sayısı dışında hiçbir kayıt tutulmaz; kim ile kim arasında olduğu cihazınızda bilinmez.",
].join("\n\n");

export function isRelayEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setRelayEnabled(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}
