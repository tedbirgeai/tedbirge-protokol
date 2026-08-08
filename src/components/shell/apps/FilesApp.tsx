import { useEffect, useState } from "react";
import { Download, FileUp, FolderOpen, Trash2 } from "lucide-react";

type LocalFile = { id: string; name: string; size: number; url: string };

function human(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * DOSYALAR — tOS dosya yöneticisi
 * ------------------------------------------------------------------
 * Cihazdaki dosyaları listeler, önizler ve P2P aktarım ekranına
 * yönlendirir. Dosyalar buluta çıkmaz; yalnızca eşler arası şifreli
 * kanaldan gönderilir.
 */
export function FilesApp({ onTransfer }: { onTransfer?: () => void }) {
  const [files, setFiles] = useState<LocalFile[]>([]);

  useEffect(
    () => () => {
      for (const f of files) URL.revokeObjectURL(f.url);
    },
    [files],
  );

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...list].map((f) => ({
      id: `${f.name}_${f.size}_${f.lastModified}`,
      name: f.name,
      size: f.size,
      url: URL.createObjectURL(f),
    }));
    setFiles((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="wa-press flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-white"
          style={{ background: "var(--wa-accent)" }}
        >
          <FolderOpen className="h-4 w-4" /> Dosya aç
          <input type="file" multiple className="hidden" onChange={(e) => add(e.target.files)} />
        </label>
        {onTransfer && (
          <button
            type="button"
            onClick={onTransfer}
            className="wa-press flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold"
            style={{ background: "var(--wa-accent-soft)", color: "var(--wa-accent)" }}
          >
            <FileUp className="h-4 w-4" /> P2P gönder
          </button>
        )}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex min-h-14 items-center gap-3 px-1"
            style={{ borderBottom: "1px solid var(--wa-border)" }}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px]" style={{ color: "var(--wa-text)" }}>
                {f.name}
              </span>
              <span className="block text-[12px]" style={{ color: "var(--wa-muted)" }}>
                {human(f.size)}
              </span>
            </span>
            <a
              href={f.url}
              download={f.name}
              aria-label={`${f.name} indir`}
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: "var(--wa-accent)" }}
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              aria-label={`${f.name} kaldır`}
              onClick={() => setFiles((prev) => prev.filter((p) => p.id !== f.id))}
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
              style={{ color: "var(--wa-muted)" }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {files.length === 0 && (
          <li className="px-2 py-6 text-center text-[13px]" style={{ color: "var(--wa-muted)" }}>
            Liste boş. Cihazınızdan dosya açın; veriler cihazda kalır.
          </li>
        )}
      </ul>
    </div>
  );
}
