import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/giris")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Giriş — Tedbirge Protokol Müşteri Paneli" },
      {
        name: "description",
        content:
          "Tedbirge müşteri paneline giriş yapın; lisanslarınızı, abonelik durumunuzu ve pilot başvurularınızı yönetin.",
      },
      { property: "og:title", content: "Tedbirge — Giriş" },
      { property: "og:description", content: "Tedbirge müşteri paneli girişi ve hesap oluşturma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/giris" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const target = next && next.startsWith("/") ? next : "/panel";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target, replace: true });
    });
  }, [navigate, target]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target, replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { full_name: fullName, organization },
          },
        });
        if (error) throw error;
        setInfo("Hesabınız oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunuzu kontrol edin.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      sessionStorage.setItem("tedbirge_auth_next", target);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Google ile giriş başarısız oldu.");
        return;
      }
      if (result.redirected) return;
      navigate({ to: target, replace: true });
    } catch {
      setError("Google ile giriş başarısız oldu.");
    }
  }

  return (
    <SitePage>
      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <SectionLabel>Müşteri paneli</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Lisans, abonelik ve pilotlarınız tek yerde
          </h1>
          <p className="mt-5 text-muted-foreground">
            Community sürümünü ücretsiz kullanmaya başlayın veya Enterprise aboneliğinizi
            panelden yönetin. Düğüm lisans anahtarınız hesabınıza bağlı olarak üretilir.
          </p>
        </div>

        <div className="rounded-sm border border-border bg-card/50 p-8">
          <div className="flex gap-2 font-mono text-xs uppercase tracking-[0.15em]">
            <button
              onClick={() => setMode("signin")}
              className={`rounded-sm px-3 py-2 ${mode === "signin" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
            >
              Giriş
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`rounded-sm px-3 py-2 ${mode === "signup" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
            >
              Kayıt
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <Field label="Ad soyad" value={fullName} onChange={setFullName} required />
                <Field label="Kurum" value={organization} onChange={setOrganization} />
              </>
            )}
            <Field label="E-posta" type="email" value={email} onChange={setEmail} required />
            <Field label="Parola" type="password" value={password} onChange={setPassword} required />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-primary">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-sm bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "İşleniyor…" : mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> veya <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full rounded-sm border border-border px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
          >
            Google ile devam et
          </button>
        </div>
      </section>
    </SitePage>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
