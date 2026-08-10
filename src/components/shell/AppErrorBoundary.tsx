/**
 * UYGULAMA HATA SINIRI (App Error Boundary)
 * ------------------------------------------------------------------
 * Web-OS kabuğu ile içindeki uygulamaları birbirinden yalıtır: bir iç
 * panel (ayarlar, güvenlik, ağ, video) çökerse masaüstü ayakta kalır,
 * yalnız o pencere hata kartına düşer ve tek tıkla yeniden yüklenir.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { title?: string; children: ReactNode };
type State = { error: Error | null; key: number };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kabuğu düşürmeden yalnız konsola bildir.
    console.error("[web-os] pencere hatası:", error, info.componentStack);
  }

  private reset = () => this.setState((s) => ({ error: null, key: s.key + 1 }));

  render() {
    const { error } = this.state;
    if (!error) return <div key={this.state.key}>{this.props.children}</div>;
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
        <p className="font-medium">{this.props.title ?? "Bu pencere yüklenemedi"}</p>
        <p className="mt-1 text-amber-200/70">
          Masaüstü çalışmaya devam ediyor. Pencereyi yeniden açmayı deneyin.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-3 rounded-md border border-amber-400/40 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/10"
        >
          Yeniden yükle
        </button>
      </div>
    );
  }
}
