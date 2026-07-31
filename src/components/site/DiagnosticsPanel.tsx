/**
 * Tanılama ve Performans Paneli (Faz 4).
 * ------------------------------------------------------------------
 * Canlı veriye bağlıdır; hiçbir gösterge sabit/uydurma değildir:
 *  - RTT: ping/pong ölçümleri (diagnostics deposu)
 *  - Hop dağılımı: doğrulanmış zarf başlıklarından
 *  - RSSI/SNR: bağlı taşıyıcı modem satırlarından
 *  - Spektrum bütçesi: paket zamanlayıcının %1 görev döngüsü sayacı
 *  - Failover sıralaması: skor motoru (kalite/gecikme/maliyet)
 * Dışa aktarılan JSON gövde (payload) İÇERMEZ.
 */

import { useMemo } from "react";
import { Activity, Download, Gauge, Radio, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDiagnostics } from "@/lib/diagnostics";
import { useNodeRuntime } from "@/lib/node-runtime";
import { useCarrierScheduler } from "@/lib/carrier-scheduler";
import { activeDataCarrier, carrierRanking, useCarrierBridge } from "@/lib/carrier-bridge";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-xl">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DiagnosticsPanel({ compact = false }: { compact?: boolean }) {
  const diag = useDiagnostics();
  const node = useNodeRuntime();
  const sched = useCarrierScheduler();
  const bridge = useCarrierBridge();

  const links = useMemo(() => Object.values(bridge.links), [bridge.links]);
  const ranking = useMemo(() => carrierRanking(2), [bridge.links, sched.usedMs]);
  const active = activeDataCarrier();

  const hops = Object.entries(diag.hopHistogram)
    .map(([k, v]) => ({ hop: Number(k), count: v }))
    .sort((a, b) => a.hop - b.hop);
  const hopMax = Math.max(1, ...hops.map((h) => h.count));

  const dutyPct = Math.round(sched.ratio * 100);
  const dutyTone = dutyPct >= 90 ? "text-destructive" : dutyPct >= 60 ? "text-amber-500" : "";

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        <Metric
          label="RTT (ort.)"
          value={diag.rttAvg === null ? "—" : `${diag.rttAvg} ms`}
          hint={diag.rttP95 === null ? "ölçüm yok" : `p95 ${diag.rttP95} ms`}
        />
        <Metric
          label="Teslim oranı"
          value={diag.txAttempts ? `%${Math.round(diag.deliveryRatio * 100)}` : "—"}
          hint={`${diag.txDelivered}/${diag.txAttempts} gönderim`}
        />
        <Metric
          label="Kuyruk"
          value={String(diag.queued)}
          hint={
            diag.oldestQueueAgeMs
              ? `en eski ${Math.round(diag.oldestQueueAgeMs / 1000)} sn`
              : "bekleyen yok"
          }
        />
        <Metric
          label="Eşler"
          value={String(node.peers.length)}
          hint={`${node.peers.filter((p) => p.direct).length} doğrudan`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Gauge className="size-4" /> BTK spektrum bütçesi (%1 görev döngüsü)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={dutyPct} />
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span className={dutyTone}>
              {(sched.usedMs / 1000).toFixed(1)} sn / {(sched.budgetMs / 1000).toFixed(0)} sn — %{dutyPct}
            </span>
            <span>
              {sched.region} · kuyruk {sched.queued} · gönderilen {sched.sent} · beklemeye alınan{" "}
              {sched.blocked}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{sched.limitNote}</p>
          {sched.nextWindowAt && (
            <p className="text-[11px] text-amber-500">
              Bütçe doldu — pencere {new Date(sched.nextWindowAt).toLocaleTimeString("tr-TR")} itibarıyla
              açılıyor. Paketler atılmadı, öncelik sırasıyla bekliyor.
            </p>
          )}
        </CardContent>
      </Card>

      {!compact && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4" /> Hop dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hops.length === 0 && (
                <p className="text-xs text-muted-foreground">Henüz doğrulanmış paket alınmadı.</p>
              )}
              {hops.map((h) => (
                <div key={h.hop} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-mono text-muted-foreground">{h.hop} atlama</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${(h.count / hopMax) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono">{h.count}</span>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-muted-foreground">
                Röle edilen {diag.relayed} · imzasız düşürülen {diag.rxDropped}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Signal className="size-4" /> Taşıyıcı bağlantı kalitesi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {links.length === 0 && (
                <p className="text-xs text-muted-foreground">Bağlı fiziksel taşıyıcı yok (IP üzerinden).</p>
              )}
              {links.map((l) => (
                <div key={l.carrier} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono uppercase">{l.carrier}</span>
                  <span className="text-muted-foreground">
                    RSSI {l.rssi ?? "—"} dBm · SNR {l.snr ?? "—"} dB · kayıp {l.lossPct ?? 0}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="size-4" /> Failover sıralaması
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {ranking.map((r) => (
            <div key={r.carrier} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2">
                <span className="font-medium">{r.name}</span>
                {active === r.carrier && <Badge className="text-[10px]">aktif</Badge>}
              </span>
              <span className="text-muted-foreground">
                skor {r.score.toFixed(3)} · {r.latencyMs} ms ·{" "}
                {r.costPerMb ? `${r.costPerMb} ₺/MB` : "ücretsiz"} · {r.reason}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const report = {
            uretim: new Date().toISOString(),
            not: "Gövde (payload) içermez — yalnız sayaç ve başlık türevi ölçümler.",
            dugum: { nodeId: node.nodeId, esler: node.peers.length, kuyruk: diag.queued },
            olcumler: diag,
            spektrum: sched,
            failover: ranking,
          };
          const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `tedbirge-tanilama-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        }}
      >
        <Download className="mr-2 size-4" /> Tanılama raporunu indir (JSON)
      </Button>
    </div>
  );
}

export default DiagnosticsPanel;
