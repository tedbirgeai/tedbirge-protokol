/**
 * AĞ DURUMU EKRANI
 * ------------------------------------------------------------------
 * Kabuğun sahip olduğu düğüm durumunu okunur biçimde gösterir:
 * bağlantı, komşu sayısı, kuyruk, keşif yöntemi ve röle durumu.
 */

import { Activity } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShell } from "@/shell/ShellProvider";
import { describeNode } from "@/lib/node-runtime";
import { isRelayEnabled } from "@/shell/relay";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function MeshStatusDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { node } = useShell();
  const s = describeNode(node);
  const discovery =
    node.discovery === "local" ? "Yerel ağ" : node.discovery === "none" ? "Yok" : "Bulut";

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" aria-hidden />
            Ağ durumu
          </DialogTitle>
          <DialogDescription>{s.text}</DialogDescription>
        </DialogHeader>

        <div>
          <Row label="Düğüm" value={node.running ? "Çalışıyor" : "Kapalı"} />
          <Row label="Bağlantı" value={node.online ? "Çevrimiçi" : "Çevrimdışı"} />
          <Row label="Doğrudan komşu" value={String(s.directPeers)} />
          <Row label="Görünen düğüm" value={String(node.peers.length)} />
          <Row label="Bekleyen paket" value={String(s.queued)} />
          <Row label="Keşif" value={discovery} />
          <Row label="Gecikme" value={node.rttMs === null ? "—" : `${node.rttMs} ms`} />
          <Row label="Röle" value={isRelayEnabled() ? "Açık" : "Kapalı"} />
          <Row label="Kimlik" value={node.nodeId || "—"} />
        </div>

        {node.error && <p className="text-xs text-destructive">{node.error}</p>}
      </DialogContent>
    </Dialog>
  );
}
