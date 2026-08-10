/**
 * DAHİLİ GÜVENLİK ÖZETİ (Web-OS)
 * ------------------------------------------------------------------
 * Kurumsal /guvenlik sayfasına çıkmadan, düğümün kendi güvenlik
 * durumunu Dark Cyber temada gösterir. Tüm veriler cihazda üretilir.
 */

import { useEffect, useState } from "react";
import { Fingerprint, Lock, ShieldCheck, Users } from "lucide-react";

import { useNodeRuntime } from "@/lib/node-runtime";
import { listEvents, type EventRecord } from "@/lib/store/idb";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#090e18] p-3">
      <div className="mb-2 flex items-center gap-2 font-osmono text-[11px] font-bold uppercase tracking-wider text-slate-300">
        <span className="text-emerald-400">{icon}</span>
        {title}
      </div>
      <div className="space-y-1 font-osmono text-[11px]">{children}</div>
    </section>
  );
}

function Row({ k, v, tone = "text-slate-200" }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="shrink-0 text-slate-500">{k}</span>
      <span className={`min-w-0 break-all text-right ${tone}`}>{v}</span>
    </div>
  );
}

export function SecurityPanel() {
  const node = useNodeRuntime();
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    void listEvents().then((rows) => setEvents(rows.slice(-12).reverse()));
  }, []);

  const verified = node.peers.filter((p) => p.verified).length;

  return (
    <div className="my-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
      <Section icon={<Lock className="h-3.5 w-3.5" />} title="Şifreleme durumu">
        <Row k="KANAL:" v="Uçtan uca şifreli (E2EE)" tone="text-emerald-400" />
        <Row k="PAKET ŞİFRESİ:" v="AES-256-GCM" />
        <Row k="ANAHTAR DEĞİŞİMİ:" v="X25519 · her eş için ayrı oturum" />
        <Row k="İMZA:" v="Sıfır-bilgi doğrulama · imzasız paket düşürülür" />
        <Row
          k="DÜŞÜRÜLEN İMZASIZ PAKET:"
          v={String(node.droppedUnsigned)}
          tone={node.droppedUnsigned ? "text-amber-400" : "text-emerald-400"}
        />
      </Section>

      <Section icon={<Fingerprint className="h-3.5 w-3.5" />} title="Cihaz kimliği">
        <Row k="DÜĞÜM KİMLİĞİ:" v={node.nodeId || "—"} />
        <Row k="PARMAK İZİ:" v={node.fingerprint || "üretiliyor"} tone="text-cyan-400" />
        <p className="pt-1 text-[10px] leading-relaxed text-slate-500">
          Parmak izini karşı tarafla yüz yüze karşılaştırdığınızda kanalın araya
          girme (MITM) girişimine kapalı olduğunu doğrulamış olursunuz.
        </p>
      </Section>

      <Section icon={<Users className="h-3.5 w-3.5" />} title="Eş güven rozetleri">
        <Row k="TOPLAM EŞ:" v={String(node.peers.length)} />
        <Row k="DOĞRULANMIŞ:" v={String(verified)} tone="text-emerald-400" />
        <Row
          k="BEKLEYEN:"
          v={String(node.peers.length - verified)}
          tone={node.peers.length - verified ? "text-amber-400" : undefined}
        />
        {node.peers.length === 0 ? (
          <p className="text-slate-600">Henüz eş yok — sinyal bekleniyor.</p>
        ) : (
          node.peers.map((p) => (
            <div key={p.nodeId} className="flex items-center justify-between gap-2 py-0.5">
              <span className="truncate text-slate-300">{p.nodeId}</span>
              <span className={p.verified ? "text-emerald-400" : "text-amber-400"}>
                {p.verified ? "doğrulanmış" : "beklemede"}
              </span>
            </div>
          ))
        )}
      </Section>

      <Section icon={<ShieldCheck className="h-3.5 w-3.5" />} title="Yerel güvenlik günlüğü">
        {events.length === 0 ? (
          <p className="text-slate-600">Kayıt yok.</p>
        ) : (
          events.map((e, i) => (
            <div key={`${e.at}-${i}`} className="flex items-start justify-between gap-3 py-0.5">
              <span className="min-w-0 truncate text-slate-300">
                <span className="text-cyan-400">{e.kind}</span> · {e.detail}
              </span>
              <span className="shrink-0 text-slate-600">
                {new Date(e.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}
        <p className="pt-1 text-[10px] leading-relaxed text-slate-500">
          Günlük yalnızca bu cihazda tutulur; hiçbir kayıt sunucuya gönderilmez.
        </p>
      </Section>
    </div>
  );
}
