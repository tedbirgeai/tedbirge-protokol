import {
  Activity,
  Bell,
  Boxes,
  Radio,
  BookUser,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  Laptop,
  Lock,
  MessageSquare,
  Megaphone,
  Pencil,
  QrCode,
  Search,
  Share2,
  Sparkle,
  Star,
  UserCog,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { pressFeedback } from "@/lib/chat/sounds";

type Item = {
  id: string;
  label: string;
  icon: typeof Lock;
  onClick: () => void;
  right?: string;
  badge?: number;
};

/**
 * "SİZ" SEKMESİ
 * ------------------------------------------------------------------
 * WhatsApp profil ekranının birebir karşılığı: üstte arama · karekod ·
 * düzenle, ortada durum baloncuğu + büyük avatar ve ad, altında
 * gruplanmış ayar kartları. Her satır var olan ekranı açar; yeni iş
 * mantığı eklenmez.
 *
 * ÖNEMLİ: kabuk kaydırılabilir, kartlar `shrink-0` olduğu için asla
 * ezilmez veya üst üste binmez (mobil · tablet · masaüstü aynı).
 */
export function MePanel({
  name,
  avatar,
  personId,
  about,
  soundOff,
  onAvatarPick,
  onProfile,
  onQr,
  onSearch,
  onContacts,
  onLists,
  onBroadcast,
  onSettings,
  onPairing,
  onToggleSound,
  onSelfNote,
  onNotifications,
  onSubscription,
  onStorage,
  onHelp,
  onInvite,
  onApps,
  onRelay,
  onMeshStatus,
  planLabel,
  deviceCount,
  chatCount,
  version,
}: {
  name: string;
  avatar?: string | undefined;
  personId: string;
  about?: string;
  soundOff: boolean;
  onAvatarPick: () => void;
  onProfile: () => void;
  onQr: () => void;
  onSearch: () => void;
  onContacts: () => void;
  onLists: () => void;
  onBroadcast: () => void;
  onSettings: () => void;
  onPairing: () => void;
  onToggleSound: () => void;
  onSelfNote: () => void;
  onNotifications: () => void;
  onSubscription: () => void;
  onStorage: () => void;
  onHelp: () => void;
  onInvite: () => void;
  /** Faz C: kabuk ekranları. */
  onApps?: () => void;
  onRelay?: () => void;
  onMeshStatus?: () => void;
  planLabel: string;
  deviceCount?: number;
  chatCount?: number;
  version: string;
}) {
  const groupZero: Item[] = [
    { id: "plan", label: "Abonelikler", icon: Sparkle, onClick: onSubscription, right: planLabel },
  ];
  const groupOne: Item[] = [
    { id: "contacts", label: "Rehber", icon: BookUser, onClick: onContacts },
    { id: "lists", label: "Listeler", icon: Star, onClick: onLists },
    { id: "broadcast", label: "Toplu mesajlar", icon: Megaphone, onClick: onBroadcast },
    { id: "starred", label: "Yıldızlı", icon: Star, onClick: onSelfNote },
    ...(deviceCount !== undefined
      ? [
          {
            id: "devices",
            label: "Bağlı cihazlar",
            icon: Laptop,
            onClick: onPairing,
            badge: deviceCount,
          } as Item,
        ]
      : [{ id: "devices", label: "Bağlı cihazlar", icon: Laptop, onClick: onPairing } as Item]),
  ];
  const groupTwo: Item[] = [
    { id: "account", label: "Hesap", icon: UserCog, onClick: onSettings },
    { id: "privacy", label: "Gizlilik", icon: Lock, onClick: onSettings },
    ...(chatCount !== undefined
      ? [
          {
            id: "chats",
            label: "Sohbetler",
            icon: MessageSquare,
            onClick: onSettings,
            badge: chatCount,
          } as Item,
        ]
      : [{ id: "chats", label: "Sohbetler", icon: MessageSquare, onClick: onSettings } as Item]),
    { id: "notify", label: "Bildirimler", icon: Bell, onClick: onNotifications },
    { id: "storage", label: "Depolama ve veriler", icon: Database, onClick: onStorage },
    {
      id: "sound",
      label: soundOff ? "Sesler kapalı" : "Sesler açık",
      icon: soundOff ? VolumeX : Volume2,
      onClick: onToggleSound,
    },
  ];
  const groupShell: Item[] = [
    ...(onApps ? [{ id: "apps", label: "Uygulamalar", icon: Boxes, onClick: onApps } as Item] : []),
    ...(onRelay ? [{ id: "relay", label: "Röle", icon: Radio, onClick: onRelay } as Item] : []),
    ...(onMeshStatus
      ? [{ id: "mesh", label: "Ağ durumu", icon: Activity, onClick: onMeshStatus } as Item]
      : []),
  ];
  const groupThree: Item[] = [
    { id: "help", label: "Yardım", icon: CircleHelp, onClick: onHelp },
    { id: "invite", label: "Arkadaşlarını davet et", icon: Share2, onClick: onInvite },
  ];

  function renderGroup(items: Item[]) {
    return (
      <ul
        className="shrink-0 overflow-hidden rounded-2xl"
        style={{ background: "var(--wa-panel)" }}
      >
        {items.map((it, i) => (
          <li key={it.id} style={i === 0 ? undefined : { borderTop: "1px solid var(--wa-border)" }}>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                it.onClick();
              }}
              className="wa-press flex min-h-14 w-full items-center gap-4 px-4 text-left"
              style={{ color: "var(--wa-text)" }}
            >
              <it.icon className="h-6 w-6 shrink-0" style={{ color: "var(--wa-text)" }} />
              <span className="shrink-0 truncate text-[17px]">{it.label}</span>
              <span className="min-w-0 flex-1" />
              {it.right && (
                <span
                  className="min-w-0 truncate text-[13px]"
                  style={{ color: "var(--wa-muted)" }}
                >
                  {it.right}
                </span>
              )}
              {typeof it.badge === "number" && it.badge > 0 && (
                <span
                  className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold text-white"
                  style={{ background: "var(--wa-muted)" }}
                >
                  {it.badge}
                </span>
              )}
              <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--wa-muted)" }} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2"
      style={{
        background: "var(--wa-panel-soft)",
        // Alt sekme çubuğu ve ev çubuğu için ek boşluk: son kart kesilmez.
        paddingBottom: "calc(var(--wa-tabbar-h, 56px) + env(safe-area-inset-bottom) + 32px)",
      }}
    >
      {/* Üst eylemler: ara · karekod · düzenle */}
      <div className="flex shrink-0 items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            onSearch();
          }}
          className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
          aria-label="Ara"
        >
          <Search className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              onQr();
            }}
            className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
            aria-label="QR kodu"
          >
            <QrCode className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              onProfile();
            }}
            className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
            aria-label="Profili düzenle"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Durum baloncuğu + avatar + ad */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <span
          className="rounded-2xl px-4 py-2 text-[15px]"
          style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
        >
          {about?.trim() || "Müsait"}
        </span>
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            onAvatarPick();
          }}
          className="wa-press rounded-full"
          aria-label="Profil fotoğrafını değiştir"
        >
          <Avatar name={name} src={avatar} size={112} />
        </button>
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            onProfile();
          }}
          className="wa-press flex items-center gap-1"
          style={{ color: "var(--wa-text)" }}
        >
          <span className="text-[26px] font-bold leading-tight">{name}</span>
          <ChevronDown className="h-5 w-5" />
        </button>
        <p className="flex items-center gap-2 text-[13px]" style={{ color: "var(--wa-muted)" }}>
          <QrCode className="h-4 w-4" aria-hidden />
          {personId}
        </p>
      </div>

      {renderGroup(groupZero)}
      {renderGroup(groupOne)}
      {renderGroup(groupTwo)}
      {groupShell.length > 0 && renderGroup(groupShell)}
      {renderGroup(groupThree)}

      <p className="shrink-0 pt-1 text-center text-[12px]" style={{ color: "var(--wa-muted)" }}>
        Tedbirge · v{version}
      </p>
    </div>
  );
}
