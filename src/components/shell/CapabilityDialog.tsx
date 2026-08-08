/**
 * YETKİ ONAY EKRANI
 * ------------------------------------------------------------------
 * Bir uygulama çalışmadan önce istediği yetenekler sade Türkçe olarak
 * gösterilir. Kullanıcı tek tek kapatabilir; onaylanmayan yetenek
 * uygulamaya asla verilmez.
 */

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Capability } from "@/kernel/capabilities";
import { CAPABILITY_LABELS } from "@/shell/permissions";

export function CapabilityDialog({
  open,
  appName,
  requested,
  onCancel,
  onApprove,
}: {
  open: boolean;
  appName: string;
  requested: Capability[];
  onCancel: () => void;
  onApprove: (granted: Capability[]) => void;
}) {
  const [allowed, setAllowed] = useState<Capability[]>(requested);

  useEffect(() => {
    if (open) setAllowed(requested);
  }, [open, requested]);

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onCancel() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            {appName} izin istiyor
          </DialogTitle>
          <DialogDescription>
            Bu uygulama aşağıdaki yetkileri istiyor. Onaylamadığınız hiçbir yetki verilmez.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {requested.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Uygulama hiçbir yetki istemiyor; yalnız kendi içinde çalışır.
            </li>
          )}
          {requested.map((cap) => {
            const info = CAPABILITY_LABELS[cap];
            const on = allowed.includes(cap);
            return (
              <li key={cap} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{info.title}</p>
                  <p className="text-xs text-muted-foreground">{info.detail}</p>
                </div>
                <Switch
                  checked={on}
                  onCheckedChange={(v) =>
                    setAllowed((prev) => (v ? [...new Set([...prev, cap])] : prev.filter((c) => c !== cap)))
                  }
                  aria-label={info.title}
                />
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
          <Button onClick={() => onApprove(allowed)}>Onayla ve çalıştır</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
