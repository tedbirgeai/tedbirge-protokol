/**
 * RÖLE AYARI EKRANI
 * ------------------------------------------------------------------
 * Anahtar ile yasal beyan aynı ekranda durur; kullanıcı neyi
 * açtığını/kapattığını okumadan karar vermez.
 */

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { isRelayEnabled, setRelayEnabled, RELAY_LEGAL_TEXT, RELAY_LEGAL_TITLE } from "@/shell/relay";

export function RelaySettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (open) setOn(isRelayEnabled());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" aria-hidden />
            Röle
          </DialogTitle>
          <DialogDescription>
            Röle açıkken cihazınız komşu düğümlerin şifreli paketlerini taşıyarak ağın kapsamasını
            genişletir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Paket taşımaya izin ver</p>
            <p className="text-xs text-muted-foreground">
              {on ? "Açık — varsayılan" : "Kapalı — kapsama daralır"}
            </p>
          </div>
          <Switch
            checked={on}
            onCheckedChange={(v) => {
              setOn(v);
              setRelayEnabled(v);
            }}
            aria-label="Röle"
          />
        </div>

        <section className="max-h-64 overflow-y-auto rounded-lg bg-muted/40 p-3">
          <h3 className="mb-2 text-sm font-semibold">{RELAY_LEGAL_TITLE}</h3>
          {RELAY_LEGAL_TEXT.split("\n\n").map((p) => (
            <p key={p.slice(0, 24)} className="mb-2 text-xs leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      </DialogContent>
    </Dialog>
  );
}
