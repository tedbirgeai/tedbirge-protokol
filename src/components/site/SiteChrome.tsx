import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { AiAdvisor } from "@/components/site/AiAdvisor";
import brandMark from "@/assets/tedbirge-mark.png.asset.json";

const navGroups = [
  {
    label: "Protokol",
    items: [
      { to: "/", label: "Genel Bakış", hint: "Tedbirge Protocol'e giriş" },
      { to: "/protokol", label: "7 Katmanlı Mimari", hint: "Trust · Edge · Loop · Off-Grid · Sense · Console · Relay" },

      { to: "/urun", label: "Ürün", hint: "Yetenekler ve mimari" },
      { to: "/demo", label: "Demo", hint: "Tarayıcıda canlı ağ" },
    ],
  },
  {
    label: "Çözümler",
    items: [
      { to: "/tasiyicilar", label: "Taşıyıcılar", hint: "9 fiziksel taşıyıcı" },
      { to: "/afet-kamu", label: "Afet & Kamu", hint: "Kriz haberleşmesi" },
    ],
  },
  {
    label: "Güven & Uyum",
    items: [
      { to: "/mevzuat", label: "Regülasyon", hint: "Spektrum ve yasal çerçeve" },
      { to: "/guvenlik", label: "Güvenlik", hint: "Uçtan uca şifreleme ve sıfır-bilgi" },
    ],
  },
  {
    label: "Başlangıç",
    items: [
      { to: "/chat", label: "Sohbet & Görüşme", hint: "Mesaj, dosya, sesli ve görüntülü arama" },
      { to: "/kur", label: "Kolay Kurulum", hint: "2 tıkla ağa katıl" },
      { to: "/saha", label: "Saha", hint: "Ücretsiz saha erişimi" },
      { to: "/rehber", label: "Rehber", hint: "Mühendislik notları" },
    ],
  },
  {
    label: "Ticari",
    items: [
      { to: "/fiyatlandirma", label: "Fiyatlandırma", hint: "Resilience-as-a-Service paketleri" },
      { to: "/dokumanlar", label: "Dokümanlar", hint: "Teknik ve kurumsal belgeler" },
    ],
  },
] as const;


type NavItem = (typeof navGroups)[number]["items"][number];

function NavGroup({
  label,
  items,
  activePath,
}: {
  label: string;
  items: readonly NavItem[];
  activePath: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupActive = items.some((i) =>
    i.to === "/" ? activePath === "/" : activePath.startsWith(i.to),
  );

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[13px] font-medium transition-colors hover:text-primary ${
          groupActive ? "text-primary" : "text-foreground"
        }`}
      >
        {label}
        <span aria-hidden className="text-[9px] leading-none opacity-70">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 w-64 overflow-hidden rounded-sm border border-border bg-background pt-1 shadow-xl"
        >
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-foreground transition-colors hover:bg-secondary hover:text-primary"
              activeProps={{ className: "block px-4 py-3 bg-secondary/60 text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthAffordance() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        to="/giris"
        className="hidden text-sm font-medium text-foreground transition-colors hover:text-primary sm:block"
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
        className="hidden text-sm font-medium text-foreground transition-colors hover:text-primary sm:block"
        activeProps={{ className: "hidden text-sm font-medium text-primary sm:block" }}
      >
        Panel
      </Link>
      <button
        onClick={handleSignOut}
        className="hidden text-sm font-medium text-foreground transition-colors hover:text-primary sm:block"
      >
        Çıkış
      </button>
    </div>
  );
}

function MobileMenu({ activePath }: { activePath: string }) {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setOpen(false);
  }, [activePath]);

  async function handleSignOut() {
    setOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/giris", replace: true });
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menüyü aç"
        className="rounded-sm border border-border/70 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {open ? "Kapat" : "Menü"}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background px-6 py-6 shadow-xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                  {group.label}
                </p>
                <ul className="mt-3 space-y-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="block rounded-sm px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                        activeProps={{
                          className:
                            "block rounded-sm px-2 py-2 text-sm font-medium text-primary bg-secondary/60",
                        }}
                        activeOptions={{ exact: item.to === "/" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                Hesap
              </p>
              <ul className="mt-3 space-y-1">
                {loading ? null : user ? (
                  <>
                    <li>
                      <Link
                        to="/panel"
                        onClick={() => setOpen(false)}
                        className="block rounded-sm px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                      >
                        Panel
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={handleSignOut}
                        className="block w-full rounded-sm px-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                      >
                        Çıkış
                      </button>
                    </li>
                  </>
                ) : (
                  <li>
                    <Link
                      to="/giris"
                      onClick={() => setOpen(false)}
                      className="block rounded-sm px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                    >
                      Giriş
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <Link
            to="/iletisim"
            onClick={() => setOpen(false)}
            className="mt-6 block rounded-sm bg-primary px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground"
          >
            Pilot Başlat
          </Link>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const activePath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/kurumsal" className="flex shrink-0 items-center gap-2.5">
          <img
            src={brandMark.url}
            alt="Tedbirge Protokol logosu"
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full object-cover shadow-[0_0_18px_-4px_var(--color-primary)]"
          />
          <span className="whitespace-nowrap font-mono text-sm font-semibold tracking-[0.2em] text-foreground">
            TEDBİRGE PROTOCOL
          </span>

        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Ana menü">
          {navGroups.map((group) => (
            <NavGroup
              key={group.label}
              label={group.label}
              items={group.items}
              activePath={activePath}
            />
          ))}
        </nav>

        <div className="ml-4 flex items-center gap-3 pl-4 lg:border-l lg:border-border/60">
          <AuthAffordance />
          <span aria-hidden className="hidden h-5 w-px bg-border/70 sm:block" />
          <LanguageSwitcher />

          <Link
            to="/chat"
            className="hidden rounded-sm bg-primary px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90 sm:block"
          >
            Sohbete Katıl
          </Link>

          <Link
            to="/iletisim"
            className="hidden rounded-sm border border-border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary lg:block"
          >
            Pilot Başlat
          </Link>

          <MobileMenu activePath={activePath} />
        </div>
      </div>
    </header>
  );
}


function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
      {children}
    </p>
  );
}

const footerLinkClass =
  "block text-foreground/85 transition-colors hover:text-primary focus-visible:text-primary";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <p className="font-mono text-sm font-semibold tracking-[0.2em]">TEDBİRGE PROTOCOL</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Kurumsal bağlantı sürekliliği platformu: uçtan uca şifreli, kurulum gerektirmeyen,
              internet kesildiğinde de çalışan yedi katmanlı mimari.
            </p>

          </div>

          <div className="min-w-0">
            <FooterHeading>Protokol</FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/protokol" className={footerLinkClass}>7 katmanlı mimari</Link></li>
              <li><Link to="/urun" className={footerLinkClass}>Yetenekler</Link></li>

              <li><Link to="/hibrit-model" className={footerLinkClass}>Hibrit model</Link></li>
              <li><Link to="/tasiyicilar" className={footerLinkClass}>Taşıyıcılar</Link></li>
              <li><Link to="/afet-kamu" className={footerLinkClass}>Afet & Kamu</Link></li>
              <li><Link to="/karsilastirma" className={footerLinkClass}>Karşılaştırma</Link></li>
              <li><Link to="/demo" className={footerLinkClass}>Canlı demo</Link></li>
            </ul>
            <FooterHeading>
              <span className="mt-6 block">Ticari</span>
            </FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/fiyatlandirma" className={footerLinkClass}>Fiyatlandırma</Link></li>
              <li><Link to="/dokumanlar" className={footerLinkClass}>Dokümanlar</Link></li>
            </ul>
          </div>

          <div className="min-w-0">
            <FooterHeading>Başlangıç & Saha</FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/kur" className={footerLinkClass}>Kolay kurulum sihirbazı</Link></li>
              <li><Link to="/katil" className={footerLinkClass}>Ağa katıl (karşılama)</Link></li>
              <li><Link to="/saha" className={footerLinkClass}>Saha erişimi (ücretsiz)</Link></li>
              <li><Link to="/kapsama" className={footerLinkClass}>Kapsama planlayıcı</Link></li>
              <li><Link to="/saha-raporu" className={footerLinkClass}>Saha test raporu</Link></li>
              <li><Link to="/kablosuz-sarj" className={footerLinkClass}>Kablosuz şarj & enerji</Link></li>
            </ul>
            <FooterHeading>
              <span className="mt-6 block">Geliştirici</span>
            </FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/rehber" className={footerLinkClass}>Rehber</Link></li>
              <li><Link to="/api-dokumantasyon" className={footerLinkClass}>Telemetri API'si</Link></li>
              <li><a href="/tedbirge-teknik-ozet.md" download className={footerLinkClass}>Teknik özet (.md)</a></li>
              <li>
                <a
                  href="https://github.com/tedbirgeai/tedbirge-protokol"
                  target="_blank"
                  rel="noreferrer"
                  className={footerLinkClass}
                >
                  Kaynak kod
                </a>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <FooterHeading>Uyum & Regülasyon</FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/mevzuat" className={footerLinkClass}>Regülasyon merkezi</Link></li>
              <li><Link to="/uyumluluk" className={footerLinkClass}>Spektrum & uyum</Link></li>
              <li><Link to="/sertifikasyon" className={footerLinkClass}>Sertifikasyon & test</Link></li>
              <li><Link to="/turkiye-mevzuat" className={footerLinkClass}>Türkiye mevzuatı</Link></li>
              <li><Link to="/izinler" className={footerLinkClass}>Devlet izinleri</Link></li>
              <li><Link to="/pilot-panosu" className={footerLinkClass}>Pilot uyum panosu</Link></li>
              <li><Link to="/ihracat-uyum" className={footerLinkClass}>İhracat kontrolü</Link></li>
              <li><Link to="/yasal" className={footerLinkClass}>Sözleşme ekleri (örnek şablon)</Link></li>

              <li><Link to="/guvenlik" className={footerLinkClass}>Güvenlik & tehdit modeli</Link></li>
            </ul>
          </div>

          <div className="min-w-0">
            <FooterHeading>Kurumsal</FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/hakkimizda" className={footerLinkClass}>Hakkımızda</Link></li>
              <li><Link to="/iletisim" className={footerLinkClass}>İletişim</Link></li>
              <li><Link to="/panel" className={footerLinkClass}>Müşteri paneli</Link></li>
              <li><Link to="/en" className={footerLinkClass}>English overview</Link></li>
            </ul>
            <FooterHeading>
              <span className="mt-6 block">Yasal</span>
            </FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/kosullar" className={footerLinkClass}>Kullanım Koşulları</Link></li>
              <li><Link to="/gizlilik" className={footerLinkClass}>Gizlilik Bildirimi</Link></li>
              <li><Link to="/iade" className={footerLinkClass}>İade Politikası</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Tedbirge Protocol · Mehmet DİNÇ (Tedbirge Protokol)</span>
          <span>Uçtan uca şifreli · Sıfır-bilgi · Doğrulanmış düğüm</span>

        </div>
      </div>
    </footer>
  );
}


const CRUMB_LABELS: Record<string, string> = {
  protokol: "7 Katmanlı Mimari",
  urun: "Ürün",
  demo: "Demo",
  tasiyicilar: "Taşıyıcılar",
  "afet-kamu": "Afet & Kamu",
  mevzuat: "Regülasyon",
  guvenlik: "Güvenlik",
  chat: "Sohbet & Görüşme",
  sohbet: "Sohbet",
  kur: "Kolay Kurulum",
  katil: "Ağa Katıl",
  saha: "Saha",
  rehber: "Rehber",
  fiyatlandirma: "Fiyatlandırma",
  dokumanlar: "Dokümanlar",
  panel: "Panel",
  yonetim: "Yönetim",
  enerji: "Enerji & Saha",
  kapsama: "Kapsama",
  "hibrit-model": "Hibrit Model",
  karsilastirma: "Karşılaştırma",
  uyumluluk: "Uyum",
  sertifikasyon: "Sertifikasyon",
  "turkiye-mevzuat": "Türkiye Mevzuatı",
  izinler: "İzinler",
  "ihracat-uyum": "İhracat Uyumu",
  yasal: "Yasal",
  gizlilik: "Gizlilik",
  kosullar: "Koşullar",
  iletisim: "İletişim",
  hakkimizda: "Hakkımızda",
  "saha-raporu": "Saha Raporu",
  "pilot-panosu": "Pilot Panosu",
  "kablosuz-sarj": "Kablosuz Şarj",
  "api-dokumantasyon": "Telemetri API'si",
  cevrimdisi: "Çevrimdışı",
  giris: "Giriş",
  kayit: "Kayıt",
  kurumsal: "Kurumsal",
  iade: "İade",
};

function crumbLabel(segment: string) {
  return (
    CRUMB_LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/^\p{Ll}/u, (c) => c.toUpperCase())
  );
}

/** 0 sürtünmeli gezinme: her alt sayfada geri düğmesi + ekmek kırıntısı. */
function BackBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  return (
    <nav
      aria-label="Sayfa yolu"
      className="border-b border-border/60 bg-background/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-2.5">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
            else void navigate({ to: "/" });
          }}
          className="rounded-sm border border-border px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          ← Geri
        </button>
        <ol className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <li>
            <Link to="/" className="transition-colors hover:text-primary">
              Ana sayfa
            </Link>
          </li>
          {segments.map((seg, i) => {
            const last = i === segments.length - 1;
            const href = `/${segments.slice(0, i + 1).join("/")}`;
            return (
              <li key={href} className="flex items-center gap-1.5">
                <span aria-hidden>/</span>
                {last ? (
                  <span className="text-foreground">{crumbLabel(seg)}</span>
                ) : (
                  <Link to={href as string as never} className="transition-colors hover:text-primary">
                    {crumbLabel(seg)}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PaymentTestModeBanner />
      <SiteHeader />
      <BackBar />
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
