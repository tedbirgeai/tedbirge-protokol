import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { describeNode, startNode, useNodeRuntime } from "@/lib/node-runtime";

const TITLE = "Ağa Hoş Geldiniz — Tedbirge Güvenli Mesh Düğümü";
const DESC =
  "Yakınınızdaki Tedbirge güvenli haberleşme ağına tek dokunuşla katılın. Kurulum, kayıt veya ödeme gerekmez; bağlantı uçtan uca şifrelidir.";
const CANONICAL = "https://tedbirge-gateway.lovable.app/katil";

export const Route = createFileRoute("/katil")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: Portal,
});

/** Captive-portal karşılama ekranı: tek dokunuşla zincire katılım. */
function Portal() {
  const state = useNodeRuntime();
  const status = describeNode(state);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.classList.add("bg-background");
  }, []);

  async function join() {
    setBusy(true);
    try {
      await startNode();
    } finally {
      setBusy(false);
    }
  }

  const joined = state.running;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="grid-bg absolute inset-0 opacity-50" aria-hidden />
      <div className="relative w-full max-w-md rounded-sm border border-border bg-card/70 p-7 backdrop-blur">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
          Tedbirge Güvenli Mesh Düğümü
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Ağa hoş geldiniz</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Bu ağ, izole ve uçtan uca şifreli bir kriz/haberleşme ağıdır. Katılmak için tek dokunuş
          yeterli; hesap, ödeme veya uygulama kurulumu istenmez.
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-sm border border-border bg-background/60 px-4 py-3">
          <span
            className={`h-3 w-3 rounded-full ${
              !joined
                ? "bg-destructive"
                : status.directPeers > 0
                  ? "bg-primary animate-pulse"
                  : "bg-amber-400"
            }`}
            aria-hidden
          />
          <p className="text-sm text-foreground">{joined ? status.text : "Henüz katılmadınız"}</p>
        </div>

        <button
          type="button"
          onClick={join}
          disabled={busy || joined}
          className="mt-5 w-full rounded-sm bg-primary px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {joined ? "Ağa katıldınız" : busy ? "Bağlanıyor…" : "Ağa katıl"}
        </button>

        {joined && (
          <div className="mt-4 grid gap-2 text-sm">
            <Link to="/kur" className="text-primary hover:underline">
              Kurulum sihirbazını aç →
            </Link>
            <Link to="/saha" className="text-primary hover:underline">
              Saha araçlarını aç →
            </Link>
          </div>
        )}

        <p className="mt-6 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
          Bu ağ üzerinden genel internet (web, sosyal medya) dağıtılmaz; trafik izole edilir. Bu
          nedenle düğüm sahibi 5651 sayılı kanun kapsamında erişim sağlayıcı konumuna düşmez.{" "}
          <Link to="/mevzuat" className="text-primary hover:underline">
            Ayrıntılı uyum bilgisi
          </Link>
        </p>
      </div>
    </div>
  );
}
