import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Pause, Play, Plus, SkipBack, SkipForward, Trash2 } from "lucide-react";

type Track = { id: string; name: string; url: string };

/**
 * MÜZİK — tOS yerleşik uygulaması
 * ------------------------------------------------------------------
 * Cihazdaki ses dosyalarını çalar. Dosyalar yalnızca bellekte açılır,
 * hiçbir sunucuya yüklenmez (sıfır-bulut ilkesi).
 */
export function MusicApp() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = tracks[index] ?? null;

  useEffect(
    () => () => {
      for (const t of tracks) URL.revokeObjectURL(t.url);
    },
    [tracks],
  );

  const add = (files: FileList | null) => {
    if (!files) return;
    const next: Track[] = [...files]
      .filter((f) => f.type.startsWith("audio/"))
      .map((f) => ({ id: `${f.name}_${f.size}`, name: f.name, url: URL.createObjectURL(f) }));
    setTracks((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (playing) el.pause();
    else void el.play();
  };

  const step = (delta: number) => {
    if (tracks.length === 0) return;
    setIndex((i) => (i + delta + tracks.length) % tracks.length);
    setPlaying(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <label
        className="wa-press flex cursor-pointer items-center gap-2 self-start rounded-full px-4 py-2 text-[14px] font-semibold text-white"
        style={{ background: "var(--wa-accent)" }}
      >
        <Plus className="h-4 w-4" /> Şarkı ekle
        <input
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
      </label>

      <div
        className="flex items-center gap-3 rounded-2xl p-3"
        style={{ background: "var(--wa-panel-soft)" }}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "var(--wa-accent-soft)", color: "var(--wa-accent)" }}
        >
          <Music className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px]" style={{ color: "var(--wa-text)" }}>
            {current?.name ?? "Parça seçilmedi"}
          </span>
          <span className="block text-[12px]" style={{ color: "var(--wa-muted)" }}>
            {tracks.length} parça · cihazda çalıyor
          </span>
        </span>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Önceki"
          className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
          style={{ color: "var(--wa-muted)" }}
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Duraklat" : "Çal"}
          className="wa-press flex h-11 w-11 items-center justify-center rounded-full text-white"
          style={{ background: "var(--wa-accent)" }}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Sonraki"
          className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
          style={{ color: "var(--wa-muted)" }}
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      <audio
        ref={audioRef}
        src={current?.url}
        autoPlay={playing}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => step(1)}
        controls
        className="w-full"
      />

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {tracks.map((t, i) => (
          <li key={t.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setPlaying(true);
              }}
              className="wa-press min-h-11 min-w-0 flex-1 truncate px-2 text-left text-[14px]"
              style={{ color: i === index ? "var(--wa-accent)" : "var(--wa-text)" }}
            >
              {t.name}
            </button>
            <button
              type="button"
              aria-label="Kaldır"
              onClick={() => setTracks((prev) => prev.filter((p) => p.id !== t.id))}
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: "var(--wa-muted)" }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {tracks.length === 0 && (
          <li className="px-2 py-6 text-center text-[13px]" style={{ color: "var(--wa-muted)" }}>
            Henüz parça yok. Cihazınızdan ses dosyası ekleyin.
          </li>
        )}
      </ul>
    </div>
  );
}

/** Dosya adından basit süre/etiket türetimi gerekirse buradan genişletilir. */
export function useTrackCount(tracks: unknown[]) {
  return useMemo(() => tracks.length, [tracks]);
}
