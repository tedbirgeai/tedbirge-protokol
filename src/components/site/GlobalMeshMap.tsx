/**
 * Küresel Mesh Haritası (KVKK uyumlu / coarse geolocation).
 * ------------------------------------------------------------------
 * Hiçbir düğümün GPS koordinatı, IP'si veya adresi kullanılmaz.
 * Konum bilgisi yalnızca kayıt sırasında beyan edilen KABA BÖLGE
 * kodudur (TR, EU, US, UK, GCC, APAC, JP, OTHER). Haritada düğümler
 * bölge kümesi olarak, sabit bölge merkezine göre çizilir; kişi veya
 * cihaz düzeyinde konum çıkarımı yapılamaz.
 */

import { useMemo, useState } from "react";

type MapDevice = {
  id: string;
  node_id: string;
  region: string;
  carrier: string | null;
  status: string;
  last_seen_at: string | null;
};

/** Bölge kodu → kaba (ülke/kıta merkezli) koordinat. Cihaz konumu DEĞİLDİR. */
const REGION_CENTERS: Record<string, { name: string; lat: number; lon: number }> = {
  TR: { name: "Türkiye", lat: 39.0, lon: 35.0 },
  EU: { name: "Avrupa", lat: 50.0, lon: 10.0 },
  UK: { name: "Birleşik Krallık", lat: 54.0, lon: -2.5 },
  US: { name: "Kuzey Amerika", lat: 39.0, lon: -98.0 },
  GCC: { name: "Körfez", lat: 24.5, lon: 47.0 },
  APAC: { name: "Asya-Pasifik", lat: 1.5, lon: 110.0 },
  JP: { name: "Japonya", lat: 36.0, lon: 138.0 },
  OTHER: { name: "Diğer bölgeler", lat: -20.0, lon: 25.0 },
};

const W = 720;
const H = 360;

/** Equirectangular projeksiyon — yalnız görselleştirme amaçlı. */
function project(lat: number, lon: number) {
  return { x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

function isOnline(d: MapDevice) {
  if (d.status !== "active" || !d.last_seen_at) return false;
  return Date.now() - new Date(d.last_seen_at).getTime() < 10 * 60 * 1000;
}

export function GlobalMeshMap({ devices }: { devices: MapDevice[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const clusters = useMemo(() => {
    const map = new Map<string, { code: string; total: number; online: number; carriers: Set<string> }>();
    for (const d of devices) {
      const code = REGION_CENTERS[d.region] ? d.region : "OTHER";
      const c = map.get(code) ?? { code, total: 0, online: 0, carriers: new Set<string>() };
      c.total += 1;
      if (isOnline(d)) c.online += 1;
      if (d.carrier) c.carriers.add(d.carrier);
      map.set(code, c);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [devices]);

  const maxTotal = Math.max(1, ...clusters.map((c) => c.total));
  const active = clusters.find((c) => c.code === selected) ?? null;

  return (
    <div className="rounded-sm border border-border bg-card/50 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Küresel mesh haritası
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Bölge kümeleri · anonim ızgara</h2>
        </div>
        <span className="rounded-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          KVKK · konum yalnızca bölge seviyesinde
        </span>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-sm border border-border bg-background/70">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[320px] w-full"
          role="img"
          aria-label="Bölge seviyesinde kümelenmiş küresel düğüm haritası"
        >
          {/* Enlem/boylam ızgarası — kaba konum çözünürlüğünü görselleştirir */}
          {Array.from({ length: 13 }, (_, i) => (i * W) / 12).map((x) => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} className="stroke-border/40" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 7 }, (_, i) => (i * H) / 6).map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} className="stroke-border/40" strokeWidth="0.5" />
          ))}

          {clusters.map((c) => {
            const center = REGION_CENTERS[c.code];
            const { x, y } = project(center.lat, center.lon);
            const r = 14 + (c.total / maxTotal) * 20;
            const live = c.online > 0;
            return (
              <g
                key={c.code}
                className="cursor-pointer"
                onClick={() => setSelected(selected === c.code ? null : c.code)}
              >
                {/* Yaklaşık yarıçap sapması — tam konum değil, belirsizlik alanı */}
                <circle cx={x} cy={y} r={r + 16} className="fill-primary/5 stroke-primary/20" strokeDasharray="3 5" />
                {live && (
                  <circle cx={x} cy={y} r={r} className="fill-primary/20">
                    <animate attributeName="r" values={`${r};${r + 12};${r}`} dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r * 0.5}
                  className={live ? "fill-primary" : "fill-muted stroke-border"}
                  strokeWidth="1"
                />
                <text x={x} y={y + 4} textAnchor="middle" className="fill-background font-mono text-[11px] font-bold">
                  {c.total}
                </text>
                <text
                  x={x}
                  y={y + r + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[10px] uppercase"
                >
                  {c.code}
                </text>
              </g>
            );
          })}
        </svg>

        {clusters.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Henüz kayıtlı düğüm yok — bir düğüm kaydolduğunda bölge kümesi belirir.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-sm border border-border bg-background/70 p-4 text-sm">
        {active ? (
          <p>
            <span className="font-medium text-foreground">
              Bu bölgede ({REGION_CENTERS[active.code].name}) {active.online} aktif Tedbirge düğümü mevcut
            </span>{" "}
            <span className="text-muted-foreground">
              — toplam {active.total} kayıtlı düğüm · şifreli overlay aktif ·{" "}
              {active.carriers.size ? `${active.carriers.size} taşıyıcı türü` : "taşıyıcı beyanı yok"}
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            Bir bölge kümesine tıklayın. Tam GPS koordinatı, IP veya adres hiçbir zaman saklanmaz ve gösterilmez;
            gösterim yalnızca kaba bölge kodu üzerinden yapılır.
          </p>
        )}
      </div>
    </div>
  );
}

export default GlobalMeshMap;
