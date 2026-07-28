import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Genel Bakış" },
  { to: "/urun", label: "Platform" },
  { to: "/fiyatlandirma", label: "Fiyatlandırma" },
  { to: "/dokumanlar", label: "Dokümanlar" },
];

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary">
        <span className="size-3 rounded-full border-2 border-accent bg-primary" />
      </span>
      <span className="text-base font-bold tracking-tight">
        tedbirge<span className="text-accent">.</span>ai
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="text-foreground">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-sm font-semibold text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://www.tedbirge.ai"
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:block"
          >
            Online İşlemler
          </a>
          <Link
            to="/iletisim"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Demo Talep Et
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <BrandMark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Tedbirge Saha Ağı (Aetheris çekirdeği); trafik ve iş kazası dosyalarında delilin
            kaza yerinden hukuk bürosuna kadar kesintisiz, KVKK uyumlu ve sıfır-bilgi
            prensibiyle taşınmasını sağlayan tescilli altyapıdır.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Platform
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/urun" className="text-muted-foreground hover:text-primary">Yetenekler</Link></li>
            <li><Link to="/fiyatlandirma" className="text-muted-foreground hover:text-primary">Fiyatlandırma</Link></li>
            <li><Link to="/dokumanlar" className="text-muted-foreground hover:text-primary">Dokümanlar</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Kurumsal
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/iletisim" className="text-muted-foreground hover:text-primary">İletişim</Link></li>
            <li>
              <a href="https://www.tedbirge.ai" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                tedbirge.ai
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Tedbirge® — tescilli markadır.</span>
          <span className="font-mono">KVKK uyumlu · Ed25519 · AES-256-GCM</span>
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">{children}</p>
  );
}
