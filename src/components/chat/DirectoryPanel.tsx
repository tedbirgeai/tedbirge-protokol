/**
 * REHBER PANELİ — giriş yapıldığı an sohbet listesinin altında açılan,
 * kişileri gerçek Ad Soyad ile gösteren bölüm.
 *
 * Kurallar:
 *  - Başlıkta asla teknik kimlik (mob-…, TBG-…) gösterilmez.
 *  - Kullanıcı hiçbir butona basmaz; rehber izni girişte otomatik istenir.
 *  - Eşleşme yoksa sahte kişi üretilmez; temiz bir boş durum gösterilir.
 */
import { useEffect, useMemo, useRef } from "react";
import { Radio, StickyNote, User } from "lucide-react";

import { useContacts, type Contact } from "@/lib/chat/contacts";
import { syncDeviceContacts } from "@/lib/chat/directory";
import { isTechnicalLabel } from "@/lib/chat/display-name";
import type { PeerInfo } from "@/lib/browser-node";

type Props = {
  query: string;
  peers: PeerInfo[];
  labelOf: (nodeId: string) => string;
  onOpenPeer: (nodeId: string, name?: string) => void;
  onOpenSelfNote: () => void;
  onShareInvite: () => void;
};

function Row({
  title,
  subtitle,
  tone,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  tone?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-press wa-row flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.03]"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--wa-panel-soft)", color: "var(--wa-accent)" }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[15px] font-medium"
          style={{ color: "var(--wa-text)" }}
        >
          {title}
        </span>
        <span className="block truncate text-[12px]" style={{ color: tone ?? "var(--wa-muted)" }}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}

const SYNC_FLAG = "tedbirge.chat.autoSync";

export function DirectoryPanel({
  query,
  peers,
  labelOf,
  onOpenPeer,
  onOpenSelfNote,
}: Props) {
  const book = useContacts();
  const tried = useRef(false);
  const q = query.trim().toLocaleLowerCase("tr");

  // Girişte rehberi arka planda otomatik eşitle (tek sefer, sessiz).
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    try {
      if (window.localStorage.getItem(SYNC_FLAG) === "1") return;
      window.localStorage.setItem(SYNC_FLAG, "1");
    } catch {
      /* gizli mod */
    }
    void syncDeviceContacts().catch(() => null);
  }, []);

  // KVKK: yalnızca gerçek adı bilinen (rehberde eşleşmiş) kişiler listelenir.
  // Anonim / kayıtsız düğümler arayüzde hiçbir şekilde gösterilmez.
  const contacts = useMemo(() => {
    const rows: Contact[] = book.contacts.filter(
      (c) => !isTechnicalLabel(c.nickname || c.claimedName || ""),
    );
    if (!q) return rows;
    return rows.filter((c) => c.displayName.toLocaleLowerCase("tr").includes(q));
  }, [book.contacts, q]);

  const onlineIds = useMemo(() => new Set(peers.map((p) => p.nodeId)), [peers]);
  const empty = contacts.length === 0;

  return (
    <div style={{ borderTop: "1px solid var(--wa-border)" }}>
      <p
        className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--wa-muted)" }}
      >
        Rehberiniz
      </p>

      {!q && (
        <Row
          title="Kendinize not"
          subtitle="Notlar ve bağlantılar"
          icon={<StickyNote className="h-4 w-4" />}
          onClick={onOpenSelfNote}
        />
      )}

      {contacts.map((c) => {
        const online = onlineIds.has(c.peerId);
        return (
          <Row
            key={`c_${c.peerId}`}
            title={c.displayName}
            subtitle={online ? "Çevrimiçi" : "Rehberinizden eşleşti"}
            tone={online ? "var(--wa-accent)" : undefined}
            avatar={getAvatar(c.peerId)}
            icon={online ? <Radio className="h-4 w-4" /> : <User className="h-4 w-4" />}
            onClick={() => onOpenPeer(c.peerId, c.nickname ?? c.claimedName)}
          />
        );
      })}

      {empty && (
        <p className="px-4 py-3 text-[13px]" style={{ color: "var(--wa-muted)" }}>
          Ağda eşleşen kayıtlı kişi bulunamadı.
        </p>
      )}


      <p className="px-4 pb-4 pt-3 text-[11px]" style={{ color: "var(--wa-muted)" }}>
        Numaralarınız cihazdan çıkmaz; eşleştirme yalnızca geri döndürülemez özetlerle yapılır.
      </p>
    </div>
  );
}
