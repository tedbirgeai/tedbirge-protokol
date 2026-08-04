import { useEffect, useState } from "react";
import {
  BRIDGEABLE_CARRIERS,
  connectBluetoothCarrier,
  connectGatewayCarrier,
  connectSerialCarrier,
  disconnectCarrier,
  gatewayCertUrl,
  gatewayUrl,
  normalizeGatewayUrl,
  refreshBridgeSupport,
  setBridgeLicense,
  setGatewayUrl,
  useCarrierBridge,
  type CarrierId,
} from "@/lib/carrier-bridge";
import { useCarrierScheduler, schedulerRegion } from "@/lib/carrier-scheduler";
import { carrierSubscribed, dataPlaneReady, setCarrierSubscription } from "@/lib/carrier-bridge";

const box = "rounded-sm border border-border bg-card/60 p-5";
const label = "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground";

/**
 * Taşıyıcı köprüsü kartı: kullanıcıda hâlihazırda bulunan LoRa/HaLow/TVWS/
 * WiGig/FSO/uydu modemini tarayıcıdan mesh'e bağlar. Tedbirge donanım üretmez,
 * direk dikmez; mevcut radyoyu hibrit taşıyıcıya dönüştürür.
 */
export function CarrierBridgeCard({ licenseKey }: { licenseKey?: string }) {
  const { links, supported } = useCarrierBridge();
  const [busy, setBusy] = useState<CarrierId | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [gwUrl, setGwUrl] = useState(gatewayUrl());
  const [editingGw, setEditingGw] = useState(false);
  const [gwDraft, setGwDraft] = useState(gatewayUrl());
  const [gwError, setGwError] = useState<string | null>(null);

  useEffect(() => {
    refreshBridgeSupport();
    setGwUrl(gatewayUrl());
    setGwDraft(gatewayUrl());
  }, []);
  useEffect(() => {
    setBridgeLicense(licenseKey);
  }, [licenseKey]);

  const saveGateway = () => {
    try {
      const next = setGatewayUrl(gwDraft);
      setGwUrl(next);
      setGwDraft(next);
      setGwError(null);
      setEditingGw(false);
    } catch (e) {
      setGwError(e instanceof Error ? e.message : "Adres geçersiz.");
    }
  };

  const run = async (id: CarrierId, fn: () => Promise<void>) => {
    setBusy(id);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Bağlantı kurulamadı.";
      setMsg(text.includes("No port selected") ? "Cihaz seçilmedi." : text);
    } finally {
      setBusy(null);
    }
  };

  const liveCount = Object.keys(links).length;
  const spectrum = useCarrierScheduler();
  const dutyPct = Math.min(100, Math.round(spectrum.ratio * 100));


  return (
    <div className={box}>
      <p className={label}>Taşıyıcı köprüsü</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Mevcut modemini taşıyıcıya bağla</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{liveCount} köprü açık</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Hibrit model: direk dikmiyoruz, kablo döşemiyoruz, uydu fırlatmıyoruz. Cihazınıza takılı
        hazır modemi (USB/BLE) tarayıcıdan okuyup gerçek ölçümünü mesh'e taşıyoruz. Bağlanan
        taşıyıcı panoda anında <span className="text-foreground">aktif</span> olur.
      </p>

      {!supported.serial && (
        <p className="mt-3 rounded-sm border border-border bg-background/60 p-3 font-mono text-[11px] text-muted-foreground">
          Bu tarayıcıda USB (Web Serial) desteği yok. Masaüstü Chrome/Edge kullanın; Android'de BLE
          köprüsü çalışır, iOS'ta yalnızca Wi-Fi/hücresel taşıyıcı desteklenir.
        </p>
      )}
      {msg && (
        <p className="mt-3 rounded-sm border border-destructive/40 bg-destructive/10 p-3 font-mono text-[11px]">
          {msg}
        </p>
      )}

      {/* Spektrum bütçesi — BTK/ETSI görev döngüsü yazılımsal tavanı */}
      <div className="mt-5 rounded-sm border border-border bg-background/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={label}>Spektrum bütçesi · bölge {schedulerRegion()}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            %{dutyPct} kullanıldı · kuyruk {spectrum.queued} · engellenen {spectrum.blocked}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-secondary">
          <div
            className={`h-full ${dutyPct > 90 ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${dutyPct}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {spectrum.limitNote}
          {spectrum.nextWindowAt
            ? ` · bütçe doldu, sonraki yayın penceresi ${new Date(spectrum.nextWindowAt).toLocaleTimeString("tr-TR")}`
            : ""}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {BRIDGEABLE_CARRIERS.map((c) => {
          const link = links[c.id];
          const live = !!link;
          return (
            <div
              key={c.id}
              className={`rounded-sm border p-4 ${
                live ? "border-primary/60 bg-primary/5" : "border-border bg-background/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px]">{c.name}</span>
                <span
                  className={`font-mono text-[10px] uppercase ${
                    link?.simulated ? "text-amber-500" : live ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link?.simulated ? "sanal mod" : live ? "bağlı" : "bağlı değil"}
                </span>
              </div>
              {link?.simulated && (
                <p className="mt-2 rounded-sm border border-amber-500/40 bg-amber-500/5 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  ⚠️ Yerel geçit aranıyor… ({gwUrl}) — Sanal Mod Aktif. Fiziksel geçit ağa
                  girdiğinde gerçek ölçüme otomatik geçilir.
                </p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{c.hint}</p>

              {c.requiresSubscription && (
                <label className="mt-3 flex items-start gap-2 rounded-sm border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] leading-relaxed">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={carrierSubscribed(c.id)}
                    onChange={(e) => setCarrierSubscription(c.id, e.target.checked)}
                  />
                  <span className="text-muted-foreground">
                    Bu taşıyıcı için geçerli bir <strong>operatör hattı/aboneliğim</strong> olduğunu ve
                    kullanımın ilgili operatör sözleşmesine uygun olduğunu beyan ederim. Beyan
                    işaretlenmeden veri düzlemi açılmaz.
                    {c.costPerMb > 0 && ` Yaklaşık taşıma maliyeti: ${c.costPerMb} ₺/MB.`}
                  </span>
                </label>
              )}

              {live && (
                <dl className="mt-3 grid grid-cols-2 gap-1 font-mono text-[11px]">
                  <dt className="text-muted-foreground">RSSI</dt>
                  <dd>{link.rssi ?? "—"} dBm</dd>
                  <dt className="text-muted-foreground">SNR</dt>
                  <dd>{link.snr ?? "—"} dB</dd>
                  <dt className="text-muted-foreground">Kare</dt>
                  <dd>{link.frames}</dd>
                  <dt className="text-muted-foreground">Panele yazım</dt>
                  <dd>{link.uploaded}</dd>
                  <dt className="text-muted-foreground">Mesh RX/TX</dt>
                  <dd>
                    {link.rxPackets ?? 0} / {link.txPackets ?? 0}
                  </dd>
                  <dt className="text-muted-foreground">Veri düzlemi</dt>
                  <dd className={dataPlaneReady(c.id) ? "text-primary" : "text-muted-foreground"}>
                    {dataPlaneReady(c.id) ? "aktif" : "yalnız ölçüm"}
                  </dd>
                </dl>
              )}
              {live && link.error && (
                <p className="mt-2 font-mono text-[10px] text-destructive">{link.error}</p>
              )}
              {live && !licenseKey && (
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  Demo modu: ölçüm yerelde okunuyor, panoya yazmak için lisans gerekir.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {!live && c.transport.includes("wss") && (
                  <button
                    type="button"
                    disabled={busy === c.id}
                    onClick={() => void run(c.id, () => connectGatewayCarrier(gwUrl))}
                    className="rounded-sm border border-primary/60 px-3 py-1.5 font-mono text-[11px] text-primary disabled:opacity-40"
                  >
                    Geçide bağlan
                  </button>
                )}
                {!live &&
                  c.transport.includes("serial") && (
                    <button
                      type="button"
                      disabled={busy === c.id || !supported.serial}
                      onClick={() => run(c.id, () => connectSerialCarrier(c.id))}
                      className="rounded-sm border border-primary/60 px-3 py-1.5 font-mono text-[11px] text-primary disabled:opacity-40"
                    >
                      USB ile bağla
                    </button>
                  )}
                {!live && c.transport.includes("bluetooth") && (
                  <button
                    type="button"
                    disabled={busy === c.id || !supported.bluetooth}
                    onClick={() => run(c.id, () => connectBluetoothCarrier(c.id))}
                    className="rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] disabled:opacity-40"
                  >
                    Bluetooth ile bağla
                  </button>
                )}
                {live && (
                  <button
                    type="button"
                    onClick={() => void disconnectCarrier(c.id)}
                    className="rounded-sm border border-border px-3 py-1.5 font-mono text-[11px]"
                  >
                    Bağlantıyı kes
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
