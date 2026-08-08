import { useState } from "react";
import { Link2, PlayCircle } from "lucide-react";

/** YouTube bağlantısını gömme adresine çevirir; değilse null döner. */
function youtubeEmbed(url: string): string | null {
  const m =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
  return m?.[1] ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

/**
 * MEDYA — tOS yerleşik oynatıcısı
 * ------------------------------------------------------------------
 * Bağlantı yapıştırılır: YouTube ise gizlilik kipinde gömülür, doğrudan
 * video/ses bağlantısı ise cihazda oynatılır. Ayrıca cihazdaki video
 * dosyaları da açılabilir (internet gerekmez).
 */
export function MediaApp() {
  const [url, setUrl] = useState("");
  const [src, setSrc] = useState<{ kind: "embed" | "file"; value: string } | null>(null);

  const open = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const embed = youtubeEmbed(trimmed);
    setSrc(embed ? { kind: "embed", value: embed } : { kind: "file", value: trimmed });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className="flex items-center gap-2 rounded-full px-4 py-2.5"
        style={{ background: "var(--wa-panel-soft)" }}
      >
        <Link2 className="h-4 w-4 shrink-0" style={{ color: "var(--wa-muted)" }} />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && open()}
          placeholder="YouTube veya video bağlantısı"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          style={{ color: "var(--wa-text)" }}
        />
        <button
          type="button"
          onClick={open}
          className="wa-press flex h-10 items-center gap-1 rounded-full px-4 text-[14px] font-semibold text-white"
          style={{ background: "var(--wa-accent)" }}
        >
          <PlayCircle className="h-4 w-4" /> Aç
        </button>
      </div>

      <label
        className="wa-press cursor-pointer self-start text-[13px]"
        style={{ color: "var(--wa-accent)" }}
      >
        Cihazdan video seç
        <input
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setSrc({ kind: "file", value: URL.createObjectURL(file) });
          }}
        />
      </label>

      <div
        className="min-h-0 flex-1 overflow-hidden rounded-2xl"
        style={{ background: "var(--wa-panel-soft)" }}
      >
        {src?.kind === "embed" && (
          <iframe
            title="Medya oynatıcı"
            src={src.value}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full min-h-[220px] w-full border-0"
          />
        )}
        {src?.kind === "file" && (
          <video src={src.value} controls className="h-full max-h-full w-full bg-black" />
        )}
        {!src && (
          <p
            className="px-4 py-10 text-center text-[13px]"
            style={{ color: "var(--wa-muted)" }}
          >
            Bağlantı yapıştırın veya cihazınızdan bir video seçin.
          </p>
        )}
      </div>
    </div>
  );
}
