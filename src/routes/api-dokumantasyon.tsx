import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { OPENAPI_SPEC, CURL_EXAMPLE, AGENT_SNIPPET, PY_SNIPPET } from "@/lib/api-spec";
import { SITE_URL } from "@/lib/site";

const TITLE = "Telemetri API Dokümantasyonu — Tedbirge Protokol";
const DESC =
  "Tedbirge Protokol saha düğümleri için telemetri API'si: kimlik doğrulama, istek şeması, hata kodları, curl/Python/bash örnekleri ve OpenAPI 3.1 tanımı.";
const URL = `${SITE_URL}/api-dokumantasyon`;

export const Route = createFileRoute("/api-dokumantasyon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ApiDocs,
});

const ERRORS: Array<[string, string, string]> = [
  ["401", "missing_or_invalid_license", "X-Tedbirge-License başlığı yok veya biçimi hatalı."],
  ["401", "license_not_found", "Anahtar hiçbir lisansla eşleşmiyor (yenilenmiş olabilir)."],
  ["403", "license_inactive", "Lisans askıda/iptal. Panelden abonelik durumunu kontrol edin."],
  ["403", "license_expired", "Lisans dönem sonu geçmiş."],
  ["403", "device_revoked", "Düğüm panelden iptal edilmiş."],
  ["403", "node_limit_reached", "Plandaki düğüm limiti dolu; düğüm silin veya planı yükseltin."],
  ["400", "invalid_body", "Gövde şemaya uymuyor (alan tipi/uzunluk)."],
];

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-sm border border-border bg-background/70 p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
      <code>{children}</code>
    </pre>
  );
}

function ApiDocs() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-16">
          <SectionLabel>Geliştirici</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Telemetri API dokümantasyonu
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Gerçek Gateway düğümleri saha ölçümlerini bu uç noktaya bildirir. İçerik, hedef adres
            veya kullanıcı verisi kabul edilmez — yalnızca RTT, hız, paket kaybı ve bayt sayacı.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/api/public/openapi.json"
              className="rounded-sm bg-primary px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              OpenAPI 3.1 (.json)
            </a>
            <Link
              to="/panel"
              className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Lisans anahtarı al
            </Link>
            <Link
              to="/saha-raporu"
              className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Saha raporu
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-12 px-6 py-16">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Kimlik doğrulama</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Her istek <span className="font-mono text-foreground">X-Tedbirge-License</span> başlığı
            ile lisans anahtarını taşır. Anahtar sızarsa müşteri panelinden tek tıkla yenilenir;
            eski anahtarla gelen düğümler 401 alır.
          </p>
          <Code>{`X-Tedbirge-License: <lisans-anahtari>
Content-Type: application/json`}</Code>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            POST <span className="font-mono text-primary">/api/public/telemetry</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            İlk çağrıda düğüm lisansa kaydedilir (düğüm limiti kontrol edilir), sonraki çağrılarda
            <span className="font-mono text-foreground"> last_seen_at</span> güncellenir. Ölçüm
            alanlarından en az biri gönderilirse ayrıca bir telemetri örneği yazılır.
          </p>
          <Code>{CURL_EXAMPLE}</Code>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Yanıt
          </p>
          <Code>{`{ "ok": true, "device_id": "…", "recorded": true, "node_limit": 5, "region": "TR" }`}</Code>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight">Alanlar</h2>
          <div className="mt-4 overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Alan</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  OPENAPI_SPEC.components.schemas.TelemetryRequest.properties as Record<
                    string,
                    { type: string; description?: string; enum?: readonly string[] }
                  >,
                ).map(([name, def]) => (
                  <tr key={name} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-[12px]">
                      {name}
                      {name === "node_id" && (
                        <span className="ml-2 text-[10px] uppercase text-primary">zorunlu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
                      {def.type}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">
                      {def.description ?? (def.enum ? def.enum.join(" | ") : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight">Hata kodları</h2>
          <div className="mt-4 overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-card/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">HTTP</th>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Anlamı</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map(([code, key, desc]) => (
                  <tr key={key} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-[12px] text-primary">{code}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{key}</td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight">Saha ajanı (bash)</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Düğüme kopyalayın; 60 saniyede bir ölçüm gönderir. Sakarya pilotunda her düğümde
            çalıştırılması yeterlidir.
          </p>
          <Code>{AGENT_SNIPPET}</Code>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight">Python istemcisi</h2>
          <Code>{PY_SNIPPET}</Code>
        </div>

        <div className="rounded-sm border border-border bg-card/40 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Uyum notu</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            API yalnızca ölçüm metriği kabul eder; trafik içeriği, konum koordinatı veya kişisel
            veri alanı yoktur (KVKK 6698 veri minimizasyonu). Taşıyıcı ve bölge alanları,
            düğümün hangi spektrum profiliyle çalıştığını kanıtlamak için kaydedilir —{" "}
            <Link to="/mevzuat" className="text-primary hover:underline">
              regülasyon merkezi
            </Link>
            .
          </p>
        </div>
      </section>
    </SitePage>
  );
}
