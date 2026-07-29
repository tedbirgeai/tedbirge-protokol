import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { AiAdvisor } from "@/components/site/AiAdvisor";

const nav = [
  { to: "/", label: "Genel Bakış" },
  { to: "/urun", label: "Ürün" },
  { to: "/tasiyicilar", label: "Taşıyıcılar" },
  { to: "/afet-kamu", label: "Afet & Kamu" },
  { to: "/mevzuat", label: "Regülasyon" },
  { to: "/guvenlik", label: "Güvenlik" },
  { to: "/demo", label: "Demo" },
  { to: "/saha", label: "Saha" },

  { to: "/fiyatlandirma", label: "Fiyatlandırma" },
  { to: "/dokumanlar", label: "Dokümanlar" },
  { to: "/rehber", label: "Rehber" },
];



function AuthAffordance() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        to="/giris"
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
      >
        Giriş
      </Link>
    );
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/giris", replace: true });
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/panel"
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
      >
        Panel
      </Link>
      <button
        onClick={handleSignOut}
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
      >
        Çıkış
      </button>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-sm border border-primary/40 bg-primary/10">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_2px_var(--color-primary)]" />
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground">
            TEDBİRGE GATEWAY
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-[13px] text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-4 flex items-center gap-3 pl-4 lg:border-l lg:border-border/60">
          <AuthAffordance />
          <span aria-hidden className="hidden h-5 w-px bg-border/70 sm:block" />
          <LanguageSwitcher />

          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Pilot Başlat
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <p className="font-mono text-sm font-semibold tracking-[0.2em]">TEDBİRGE GATEWAY</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Taşıyıcı-bağımsız, sıfır-bilgi tünel geçidi ve mesh SDK'sı. Tek statik binary,
            dış bağımlılık yok, off-grid çalışır.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Ürün</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/urun" className="text-muted-foreground hover:text-foreground">Yetenekler</Link></li>
            <li><Link to="/hibrit-model" className="text-muted-foreground hover:text-foreground">Hibrit model</Link></li>
            <li><Link to="/tasiyicilar" className="text-muted-foreground hover:text-foreground">Taşıyıcılar</Link></li>
            <li><Link to="/afet-kamu" className="text-muted-foreground hover:text-foreground">Afet & Kamu</Link></li>
            <li><Link to="/karsilastirma" className="text-muted-foreground hover:text-foreground">Karşılaştırma</Link></li>
            <li><Link to="/fiyatlandirma" className="text-muted-foreground hover:text-foreground">Fiyatlandırma</Link></li>
            <li><Link to="/dokumanlar" className="text-muted-foreground hover:text-foreground">Dokümanlar</Link></li>
            <li><Link to="/kapsama" className="text-muted-foreground hover:text-foreground">Kapsama planlayıcı</Link></li>
            <li><Link to="/demo" className="text-muted-foreground hover:text-foreground">Canlı demo</Link></li>
            <li><Link to="/saha" className="text-muted-foreground hover:text-foreground">Saha erişimi (ücretsiz)</Link></li>
            <li><Link to="/rehber" className="text-muted-foreground hover:text-foreground">Rehber</Link></li>
            <li><Link to="/api-dokumantasyon" className="text-muted-foreground hover:text-foreground">Telemetri API'si</Link></li>
            <li><Link to="/saha-raporu" className="text-muted-foreground hover:text-foreground">Saha test raporu</Link></li>
            <li><a href="/tedbirge-teknik-ozet.md" download className="text-muted-foreground hover:text-foreground">Teknik özet (.md)</a></li>


          </ul>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Şirket & uyum</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/hakkimizda" className="text-muted-foreground hover:text-foreground">Hakkımızda</Link></li>
            <li><Link to="/mevzuat" className="text-muted-foreground hover:text-foreground">Regülasyon merkezi</Link></li>
            <li><Link to="/uyumluluk" className="text-muted-foreground hover:text-foreground">Spektrum & uyum</Link></li>
            <li><Link to="/sertifikasyon" className="text-muted-foreground hover:text-foreground">Sertifikasyon & test</Link></li>
            <li><Link to="/turkiye-mevzuat" className="text-muted-foreground hover:text-foreground">Türkiye mevzuatı</Link></li>
            <li><Link to="/izinler" className="text-muted-foreground hover:text-foreground">Devlet izinleri</Link></li>
            <li><Link to="/pilot-panosu" className="text-muted-foreground hover:text-foreground">Pilot uyum panosu</Link></li>

            <li><Link to="/ihracat-uyum" className="text-muted-foreground hover:text-foreground">İhracat kontrolü</Link></li>
            <li><Link to="/guvenlik" className="text-muted-foreground hover:text-foreground">Güvenlik & tehdit modeli</Link></li>
            <li><Link to="/en" className="text-muted-foreground hover:text-foreground">English overview</Link></li>

            <li><Link to="/iletisim" className="text-muted-foreground hover:text-foreground">İletişim</Link></li>
            <li><Link to="/panel" className="text-muted-foreground hover:text-foreground">Müşteri paneli</Link></li>

            <li>
              <a href="https://github.com/tedbirgeai/aetheris" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                Kaynak kod
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Yasal</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/kosullar" className="text-muted-foreground hover:text-foreground">Kullanım Koşulları</Link></li>
            <li><Link to="/gizlilik" className="text-muted-foreground hover:text-foreground">Gizlilik Bildirimi</Link></li>
            <li><Link to="/iade" className="text-muted-foreground hover:text-foreground">İade Politikası</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Tedbirge Protokol · Mehmet DİNÇ (Tedbirge Gateway)</span>
          <span>v0.6a-turnkey · Ed25519 · AES-256-GCM</span>
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <AiAdvisor />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{children}</p>
  );
}
