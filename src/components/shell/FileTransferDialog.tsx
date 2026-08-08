/**
 * DOSYA AKTARIMI EKRANI (P2P)
 * ------------------------------------------------------------------
 * Sürükle-bırak ile seçilen dosya doğrudan hedef düğüme gönderilir.
 * Aktarım durumu (yüzde, hata, tamamlanma) canlı gösterilir; gelen
 * dosyalar kullanıcı indirene kadar yalnız cihazda durur.
 */

import { useEffect, useState } from "react";
import { Download, FileUp, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShell } from "@/shell/ShellProvider";
import {
  bootFileTransfer,
  clearTransfer,
  listTransfers,
  onTransferChange,
  sendFileToPeer,
  type Transfer,
} from "@/lib/p2p/file-transfer";

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileTransferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { node } = useShell();
  const [items, setItems] = useState<Transfer[]>([]);
  const [peer, setPeer] = useState("");
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    bootFileTransfer();
    setItems(listTransfers());
    return onTransferChange(() => setItems(listTransfers()));
  }, []);

  useEffect(() => {
    if (open && !peer && node.peers[0]) setPeer(node.peers[0].nodeId);
  }, [open, peer, node.peers]);

  async function send(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!peer) {
      toast.error("Önce hedef cihazı seçin.");
      return;
    }
    try {
      await sendFileToPeer(peer, f);
      toast.success(`${f.name} gönderildi.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dosya gönderilemedi.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="wa wa-scope flex max-h-[88dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" aria-hidden />
            Dosya aktarımı
          </DialogTitle>
          <DialogDescription>
            Dosyalar buluta kopyalanmaz; parçalara bölünüp doğrudan seçtiğiniz cihaza uçtan uca
            şifreli gönderilir.
          </DialogDescription>
        </DialogHeader>

        <label className="block text-sm">
          Hedef cihaz
          <select
            value={peer}
            onChange={(e) => setPeer(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background p-2 text-sm"
          >
            <option value="">Seçin…</option>
            {node.peers.map((p) => (
              <option key={p.nodeId} value={p.nodeId}>
                {p.nodeId}
                {p.verified ? " · doğrulanmış" : ""}
              </option>
            ))}
          </select>
        </label>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void send(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm"
          style={drag ? { borderColor: "var(--wa-accent)" } : undefined}
        >
          <UploadCloud className="h-6 w-6" aria-hidden />
          Dosyayı buraya sürükleyin ya da seçmek için dokunun
          <span className="text-xs text-muted-foreground">En çok 16 MB</span>
          <input type="file" className="hidden" onChange={(e) => void send(e.target.files)} />
        </label>

        <ul className="space-y-2">
          {items.length === 0 && (
            <li className="text-sm text-muted-foreground">Henüz aktarım yok.</li>
          )}
          {items.map((t) => (
            <li key={t.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{sizeLabel(t.size)}</span>
                {t.dataUrl && (
                  <a href={t.dataUrl} download={t.name} aria-label="İndir">
                    <Download className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  aria-label="Listeden kaldır"
                  onClick={() => clearTransfer(t.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${t.percent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.dir === "out" ? "Gönderiliyor" : "Alınıyor"} · {t.peer} ·{" "}
                {t.status === "tamam"
                  ? "Tamamlandı"
                  : t.status === "hata"
                    ? (t.error ?? "Hata")
                    : `%${t.percent}`}
              </p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
