/**
 * DERLEME DAMGASI
 * ------------------------------------------------------------------
 * Her yayın için benzersiz bir kimlik. Ayarlar > Hakkında bölümünde
 * görünür; ekrandaki uygulamanın hangi paket olduğu tek bakışta bellidir.
 * Sürüm kilidi de bu damgayı kullanır: damga değiştiğinde eski önbellek
 * ve hayalet kayıtlar bir kez temizlenir.
 */

declare const __TEDBIRGE_BUILD_ID__: string | undefined;

function readBuildId(): string {
  try {
    return typeof __TEDBIRGE_BUILD_ID__ === "string" && __TEDBIRGE_BUILD_ID__
      ? __TEDBIRGE_BUILD_ID__
      : "dev";
  } catch {
    return "dev";
  }
}

/** Ham derleme kimliği (ISO zaman damgası ya da "dev"). */
export const BUILD_ID = readBuildId();

/** Kullanıcıya gösterilen kısa sürüm etiketi. */
export const BUILD_LABEL = (() => {
  if (BUILD_ID === "dev") return "geliştirme";
  // 2026-08-06T02:14:33.000Z → 06.08.2026 02:14
  const d = new Date(BUILD_ID);
  if (Number.isNaN(d.getTime())) return BUILD_ID.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
})();
