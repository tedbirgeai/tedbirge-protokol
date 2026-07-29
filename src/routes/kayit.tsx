import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/kayit")({
  head: () => ({
    meta: [
      { title: "Düğüm Kaydı (QR) — Tedbirge Gateway" },
      {
        name: "description",
        content:
          "QR kodu okutarak saha düğümünüzü Tedbirge Gateway ağına kaydedin; şifreleme anahtarı cihazınızda üretilir.",
      },
      { property: "og:title", content: "Tedbirge Gateway düğüm kaydı" },
      { property: "og:description", content: "QR ile tek adımda güvenli düğüm kaydı." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NodeEnrollPage,
});

type Claim = {
  node_id: string;
  region: string;
  carrier: string;
  role: string;
  license_key: string;
  e2ee: boolean;
  endpoints: { telemetry: string; queue: string };
};

function NodeEnrollPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t) setToken(t);
  }, []);

  async function enroll() {
    setState("working");
    setMessage(null);
    try {
      const { generateNodeKeyPair, storeNodeKey } = await import("@/lib/e2ee");
      const keys = await generateNodeKeyPair();
      const res = await fetch("/api/public/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          public_key: keys.publicKey,
          key_fingerprint: keys.fingerprint,
        }),
      });
      const body = (await res.json()) as Claim & { error?: string };
      if (!res.ok) {
        setState("error");
        setMessage(errorText(body.error));
        return;
      }
      storeNodeKey(body.node_id, keys.privateKey);
      setFingerprint(keys.fingerprint);
      setClaim(body);
      setState("done");
    } catch {
      setState("error");
      setMessage("Kayıt sırasında bağlantı hatası oluştu. İnternetinizi kontrol edip tekrar deneyin.");
    }
  }

  return (
    <SitePage>
      <section className="mx-auto max-w-2xl px-6 py-16">
        <SectionLabel>Düğüm kaydı</SectionLabel>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">QR ile düğüm ekle</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Bu sayfa panelde üretilen tek kullanımlık daveti kullanır. Şifreleme anahtar çiftiniz bu
          cihazda üretilir; <strong>özel anahtar hiçbir zaman sunucuya gönderilmez.</strong>
        </p>

        {state !== "done" && (
          <div className="mt-8 rounded-sm border border-border bg-card/50 p-6">
            <label className="block text-sm">
              <span className="text-muted-foreground">Davet anahtarı</span>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm"
              />
            </label>
            <button
              onClick={enroll}
              disabled={state === "working" || token.trim().length < 8}
              className="mt-4 w-full rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
            >
              {state === "working" ? "Kaydediliyor…" : "Düğümü kaydet"}
            </button>
            {message && <p className="mt-3 text-sm text-destructive">{message}</p>}
          </div>
        )}

        {claim && (
          <div className="mt-8 space-y-4">
            <div className="rounded-sm border border-primary/50 bg-card/50 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Kayıt tamamlandı
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{claim.node_id}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row k="Rol" v={claim.role} />
                <Row k="Taşıyıcı" v={claim.carrier} />
                <Row k="Bölge" v={claim.region} />
                <Row k="Şifreleme" v={claim.e2ee ? `Açık · ${fingerprint}` : "Kapalı"} />
              </dl>
            </div>

            <div className="rounded-sm border border-border bg-card/50 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Düğüm ajanı yapılandırması
              </p>
              <pre className="mt-4 overflow-x-auto rounded-sm border border-border bg-background p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`export TEDBIRGE_LICENSE_KEY=${claim.license_key}
export TEDBIRGE_NODE_ID=${claim.node_id}
export TEDBIRGE_TELEMETRY_URL=${claim.endpoints.telemetry}
export TEDBIRGE_QUEUE_URL=${claim.endpoints.queue}
export TEDBIRGE_E2EE=${claim.e2ee ? "true" : "false"}

tedbirge-gateway --node-id ${claim.node_id} --role ${claim.role}`}
              </pre>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Telefonu düğüm olarak değil izleme istasyonu olarak kullanıyorsanız bu komutlara
                gerek yok; düğüm panelde birkaç saniye içinde çevrimiçi görünür.
              </p>
            </div>
          </div>
        )}
      </section>
    </SitePage>
  );
}

function errorText(code?: string) {
  switch (code) {
    case "enrollment_not_found":
      return "Davet bulunamadı. Anahtarı kontrol edin.";
    case "enrollment_used":
      return "Bu davet zaten kullanılmış. Panelden yeni QR üretin.";
    case "enrollment_expired":
      return "Davetin süresi doldu. Panelden yeni QR üretin.";
    case "node_limit_reached":
      return "Lisans düğüm limiti dolu.";
    default:
      return "Kayıt tamamlanamadı. Panelden yeni bir davet üretip tekrar deneyin.";
  }
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono text-[13px]">{v}</dd>
    </div>
  );
}
