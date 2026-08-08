/**
 * AĞ DURUMU EKRANI
 * ------------------------------------------------------------------
 * Kabuğun sahip olduğu düğüm durumunu okunur biçimde gösterir:
 * bağlantı, komşu sayısı, kuyruk, keşif yöntemi, röle durumu ve
 * (Faz E) çalışan çekirdek sağlayıcısı ile yerel çekirdek ölçümleri.
 */

import { useEffect, useState } from "react";
import { Activity, Cpu } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useShell } from "@/shell/ShellProvider";
import { describeNode } from "@/lib/node-runtime";
import { isRelayEnabled } from "@/shell/relay";
import {
  activeKernelProvider,
  onKernelProviderChange,
  preferredKernelProvider,
  setPreferredKernelProvider,
} from "@/kernel/boot";
import { kernelMetrics, onKernelTelemetry } from "@/kernel/telemetry";
import { kernelHealth, onKernelHealth } from "@/kernel/supervisor";

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

  const [, force] = useState(0);
  const [wantWasm, setWantWasm] = useState(false);

  useEffect(() => {
    setWantWasm(preferredKernelProvider() === "wasm");
  }, [open]);

  useEffect(() => {
    const bump = () => force((n) => n + 1);
    const offA = onKernelTelemetry(bump);
    const offB = onKernelProviderChange(bump);
    const offC = onKernelHealth(bump);
    return () => {
      offA();
      offB();
      offC();
    };
  }, []);

  const m = kernelMetrics();
  const provider = activeKernelProvider();
  const h = kernelHealth();
  const healthText =
    h.health === "healthy" ? "Sağlıklı" : h.health === "recovering" ? "Onarılıyor" : "Arızalı";

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="wa wa-scope flex max-h-[88dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-y-auto sm:w-full">
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

        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Cpu className="h-4 w-4" aria-hidden />
            Çekirdek
          </div>
          <Row
            label="Çalışan sağlayıcı"
            value={provider === "wasm" ? "Yerel çekirdek (Wasm)" : "Standart çekirdek"}
          />
          <Row label="Gönderilen paket" value={String(m.sent)} />
          <Row label="Başarısız" value={String(m.failed)} />
          <Row label="Ortalama süre" value={`${m.avgSendMs} ms`} />
          <Row label="Dayanıklılık" value={healthText} />
          <Row label="Yeniden deneme" value={String(h.retries)} />
          <Row
            label="Son onarım"
            value={h.lastRecoveryAt ? new Date(h.lastRecoveryAt).toLocaleTimeString("tr-TR") : "—"}
          />
          {m.lastError && <Row label="Son hata" value={m.lastError} />}

          <label className="mt-3 flex items-start justify-between gap-3">
            <span className="text-sm">
              Hızlandırılmış çekirdeği dene
              <span className="mt-1 block text-xs text-muted-foreground">
                Cihazda yerel çekirdek modülü varsa yönlendirme onunla yapılır; yoksa uygulama
                kesintisiz standart çekirdekte kalır.
              </span>
            </span>
            <Switch
              checked={wantWasm}
              onCheckedChange={(v) => {
                setWantWasm(v);
                void setPreferredKernelProvider(v ? "wasm" : "ts");
              }}
            />
          </label>
        </div>

        {node.error && <p className="text-xs text-destructive">{node.error}</p>}
      </DialogContent>
    </Dialog>
  );
}
