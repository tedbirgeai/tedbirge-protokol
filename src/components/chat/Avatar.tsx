/**
 * ORTAK AVATAR BİLEŞENİ
 * ------------------------------------------------------------------
 * Sohbet listesi, alt sekme çubuğu ve profil ekranı aynı avatarı
 * kullanır. Yalnızca görsel katmandır.
 */

const AVATAR_COLORS = ["#0a7cff", "#00a884", "#e0736d", "#7f66ff", "#f2a33c", "#0fb2c4", "#c2599a"];

export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 9973;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  size = 52,
  src,
}: {
  name: string;
  size?: number;
  src?: string | undefined;
}) {
  if (src)
    return (
      <img
        src={src}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}
