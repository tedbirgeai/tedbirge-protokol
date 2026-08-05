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
import {
  autoSyncContacts,
  importContacts,
  parseVcards,
  saveLocalBook,
} from "@/lib/chat/directory";

import { isTechnicalLabel } from "@/lib/chat/display-name";
import { getAvatar, useAvatars } from "@/lib/chat/avatars";

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
  avatar,
  onClick,
}: {
  title: string;
  subtitle: string;
  tone?: string;
  icon: React.ReactNode;
  avatar?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-press wa-row flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-black/[0.03]"
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--wa-panel-soft)", color: "var(--wa-accent)" }}
          aria-hidden
        >
          {icon}
        </span>
      )}
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

export function DirectoryPanel({ query, peers, onOpenPeer, onOpenSelfNote }: Props) {
  const book = useContacts();
  useAvatars();
  const tried = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLocaleLowerCase("tr");

  // Her açılışta rehber sessizce yeniden eşleştirilir: yeni katılan
  // tanıdıklar kullanıcı hiçbir şey yapmadan listede belirir.
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void autoSyncContacts().catch(() => null);
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
        <div className="px-4 py-3">
          <p className="text-[13px]" style={{ color: "var(--wa-muted)" }}>
            Rehberiniz eşitleniyor. Tanıdıklarınız Tedbirge'ye katıldıkça kendiliğinden görünür.
          </p>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const r = await autoSyncContacts();
                if (r.source === "none") fileRef.current?.click();
              })();
            }}
            className="wa-press mt-2 rounded-full px-3 py-2 text-[13px] font-semibold text-white"
            style={{ background: "var(--wa-accent)" }}
          >
            Rehberimi şimdi eşitle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void file.text().then(async (text) => {
                const list = parseVcards(text);
                if (list.length === 0) return;
                saveLocalBook(list);
                await importContacts(list);
              });
            }}
          />
        </div>
      )}


      <p className="px-4 pb-4 pt-3 text-[11px]" style={{ color: "var(--wa-muted)" }}>
        Numaralarınız cihazdan çıkmaz; eşleştirme yalnızca geri döndürülemez özetlerle yapılır.
      </p>
    </div>
  );
}
