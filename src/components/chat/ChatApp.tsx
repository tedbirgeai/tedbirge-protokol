import { SyncWarningBar } from "@/components/chat/SyncStatusPanel";
import { Avatar } from "@/components/chat/Avatar";
import { MobileTabBar, type MobileTab } from "@/components/chat/MobileTabBar";
import { CallsPanel } from "@/components/chat/CallsPanel";
import { CommunitiesPanel } from "@/components/chat/CommunitiesPanel";
import { MePanel } from "@/components/chat/MePanel";
import { COMMUNITY_NODE_LIMIT } from "@/lib/paddle-catalog";
import { DesktopRail } from "@/components/chat/DesktopRail";
import { NewChatSheet } from "@/components/chat/NewChatSheet";
import { SplashScreen } from "@/components/chat/SplashScreen";
import { AiAdvisor } from "@/components/site/AiAdvisor";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  Archive,
  ArrowLeft,
  BookUser,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Forward,
  Globe,
  Home,
  Languages,
  MoreHorizontal,
  Lock,
  MapPin,
  Mic,
  Paperclip,
  Pencil,
  Phone,
  Heart,
  Pin,
  Plus,
  Reply,
  Search,
  Send,
  Siren,
  Smile,
  Square,
  Star,
  Trash2,
  Settings,
  Radio,
  RotateCw,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
  Bell,
  BellOff,
  Image as ImageIcon,
} from "lucide-react";
import {
  bootChat,
  canDeleteForEveryone,
  canEdit,
  deleteMessage,
  editMessage,
  pinMessage,
  reactToMessage,
  remainingWindow,
  sendTyping,
  sendVoiceFile,
  toggleStar,
  createGroup,
  ensureDirectConversation,
  ensureSelfConversation,
  SELF_CONV_ID,
  markRead,
  markUnread,
  clearConversation,
  removeConversation,
  conversationTargets,
  sendMedia,
  sendText,
  togglePin,
  useChat,
  useConversationMessages,
  EDIT_WINDOW_MS,
  retryMessage,
  directConvId,
} from "@/lib/chat/engine";
import { bootCalls, startCall, startConference } from "@/lib/call/engine";
import { NewCallSheet } from "@/components/chat/NewCallSheet";
import { Dialpad } from "@/components/chat/Dialpad";
import { CallLinkSheet } from "@/components/chat/CallLinkSheet";
import { ScheduleCallSheet } from "@/components/chat/ScheduleCallSheet";

import { MediaGallery } from "@/components/chat/MediaGallery";
import { lastSeenLabel } from "@/lib/chat/last-seen";
import { AppLockScreen, ChatSettingsDialog, SearchPanel } from "@/components/chat/ChatTools";
import type { SettingsTab } from "@/components/chat/ChatTools";
import { ForwardDialog } from "@/components/chat/ForwardDialog";
import { EmergencyDialog } from "@/components/chat/EmergencyDialog";
import { bootLock, useLock } from "@/lib/chat/lock";
import { startPtt, stopPtt } from "@/lib/chat/ptt";
import { ttlOf, ttlLabel } from "@/lib/chat/ephemeral";
import {
  ARCHIVE,
  assignFolder,
  createFolder,
  folderOf,
  folderTabs,
  getFolders,
  isArchived,
  onFoldersChange,
  toggleArchive,
} from "@/lib/chat/folders";
import {
  clearUnreadFlag,
  forgetFlags,
  isFavorite,
  isMarkedUnread,
  markUnreadFlag,
  onFlagsChange,
  toggleFavorite,
} from "@/lib/chat/chat-flags";
import { ChatRowMenu, type RowMenuState } from "@/components/chat/ChatRowMenu";
import { NewContactForm } from "@/components/chat/NewContactForm";

import { getPrivacy, onPrivacyChange } from "@/lib/chat/privacy";
import { cachedTranslation, translateText } from "@/lib/chat/translate";
import { startTranscript, type TranscriptSession } from "@/lib/chat/transcribe";
import { geoUri } from "@/lib/chat/location";
import { acceptPairing, beginPairing, dismissPairing, usePairing } from "@/lib/chat/pairing";
import { PairingDialog } from "@/components/chat/PairingDialog";
import { getAbout, getAlias, isOnboarded, setAlias } from "@/lib/chat/profile";
import { ProfileSheet } from "@/components/chat/ProfileSheet";
import { QrCodeSheet } from "@/components/chat/QrCodeSheet";
import { AppsDialog } from "@/components/shell/AppsDialog";
import { AppOfferHost } from "@/components/shell/AppOfferHost";
import { RelaySettingsDialog } from "@/components/shell/RelaySettingsDialog";
import { MeshStatusDialog } from "@/components/shell/MeshStatusDialog";
import { FileTransferDialog } from "@/components/shell/FileTransferDialog";
import { FeedPanel } from "@/components/shell/FeedPanel";
import { PhoneOnboarding } from "@/components/chat/PhoneOnboarding";
import { humanSize } from "@/lib/chat/media";
import {
  isSoundMuted,
  pressFeedback,
  setSoundMuted,
  unlockAudio,
  vibrate,
} from "@/lib/chat/sounds";
import { ShellProvider, useShell } from "@/shell/ShellProvider";
import { getBrowserNodeId, getPersonId, type PeerInfo } from "@/lib/browser-node";
import { listCalls } from "@/lib/chat/call-log";
import { ContactsDialog } from "@/components/chat/ContactsDialog";
import { DirectoryPanel } from "@/components/chat/DirectoryPanel";
import { contactLabel, refreshContacts, setNickname, useContacts } from "@/lib/chat/contacts";
import {
  fileToAvatarDataUrl,
  getAvatar,
  getMyAvatar,
  setMyAvatar,
  useAvatars,
} from "@/lib/chat/avatars";

import { humanName, isTechnicalLabel } from "@/lib/chat/display-name";
import { BUILD_LABEL } from "@/lib/build-id";
import { isNamed, safeTitleOf, UNKNOWN_TITLE } from "@/lib/chat/safe-title";
import {
  nameKeyOf,
  resolvePhoneHash,
  personGroupKey,
  mergeGroupsByName,
  isSelfPerson,
  resolveDisplayName,
  repairCrossLinks,
  writeNickname,
} from "@/lib/chat/name-resolver";

import { getDraft, setDraft as persistDraft } from "@/lib/chat/drafts";
import { bootLeader } from "@/lib/chat/leader";
import { bootSessions } from "@/lib/chat/sessions";
import {
  MUTE_OPTIONS,
  isMuted,
  muteConversation,
  muteUntilLabel,
  onMuteChange,
  unmuteConversation,
} from "@/lib/chat/mute";
import { IDB_BLOCKED_EVENT } from "@/lib/store/idb";

import type { ChatMessage, Conversation } from "@/lib/store/idb";

import {
  dayLabel,
  displayName,
  EMOJIS,
  MenuItem,
  MessageRow,
  timeOf,
} from "@/apps/messenger/MessageRow";

const CALLS_TAB = "__calls";
// Süzgeç çipleri: gerçek klasör değil, listeyi daraltan görünümlerdir.
const UNREAD_TAB = "__unread";
const FAV_TAB = "__fav";
const GROUPS_TAB = "__groups";

export function ChatApp() {
  return (
    <ShellProvider>
      <ChatAppInner />
    </ShellProvider>
  );
}

function ChatAppInner() {
  const shell = useShell();
  const surface = shell.surfaces;
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [newPeer, setNewPeer] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [soundOff, setSoundOff] = useState(false);
  const contactsOpen = surface.isOpen("contacts");
  const setContactsOpen = (v: boolean) => surface.set("contacts", v);
  const searchOpen = surface.isOpen("search");
  const setSearchOpen = (v: boolean) => surface.set("search", v);
  // "Siz" sekmesinden açılan profil ve karekod ekranları.
  const profileOpen = surface.isOpen("profile");
  const setProfileOpen = (v: boolean) => surface.set("profile", v);
  const qrOpen = surface.isOpen("qr");
  const setQrOpen = (v: boolean) => surface.set("qr", v);
  const [profileTick, setProfileTick] = useState(0);
  const settingsOpen = surface.isOpen("settings");
  const setSettingsOpen = (v: boolean) => surface.set("settings", v);
  // Ayarların hangi sekmeyle açılacağı ("Siz > Bildirimler" doğrudan
  // bildirim sekmesine düşer; arama sırasında izin sorulmaz).
  const [settingsTab, setSettingsTab] = useState<SettingsTab | undefined>(undefined);
  const [ptt, setPtt] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const emergencyOpen = surface.isOpen("emergency");
  const setEmergencyOpen = (v: boolean) => surface.set("emergency", v);
  const [folder, setFolder] = useState<string>("");
  const galleryOpen = surface.isOpen("gallery");
  const setGalleryOpen = (v: boolean) => surface.set("gallery", v);
  const [muteMenu, setMuteMenu] = useState(false);
  const [folderVersion, setFolderVersion] = useState(0);
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const newContactOpen = surface.isOpen("newContact");
  const setNewContactOpen = (v: boolean) => surface.set("newContact", v);
  // Tuş takımından "Ekle" ile gelen doğrulanmış numara.
  const [dialPrefill, setDialPrefill] = useState("");

  // Arama ekranları: yeni arama, tuş takımı, planlama ve arama bağlantısı.
  const newCallOpen = surface.isOpen("newCall");
  const setNewCallOpen = (v: boolean) => surface.set("newCall", v);
  const dialpadOpen = surface.isOpen("dialpad");
  const setDialpadOpen = (v: boolean) => surface.set("dialpad", v);
  const scheduleOpen = surface.isOpen("schedule");
  const setScheduleOpen = (v: boolean) => surface.set("schedule", v);
  const callLinkOpen = surface.isOpen("callLink");
  const setCallLinkOpen = (v: boolean) => surface.set("callLink", v);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [privacy, setPrivacyState] = useState(() => getPrivacy());
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<TranscriptSession | null>(null);
  const recRef = useRef<{
    rec: MediaRecorder;
    chunks: Blob[];
    timer: ReturnType<typeof setInterval>;
  } | null>(null);

  const lock = useLock();
  const chat = useChat();
  const node = shell.node;
  const messages = useConversationMessages(activeId);

  // Klasör ve gizlilik tercihleri değişince liste ve çeviri anında yenilenir.
  useEffect(() => {
    const offFolders = onFoldersChange(() => setFolderVersion((v) => v + 1));
    const offFlags = onFlagsChange(() => setFolderVersion((v) => v + 1));
    const offPrivacy = onPrivacyChange(() => setPrivacyState({ ...getPrivacy() }));
    // Rehber sessizce tazelenir: sonradan katılan tanıdıklar kendiliğinden gelir.
    let stopSync: (() => void) | undefined;
    void import("@/lib/chat/directory").then((m) => {
      stopSync = m.startContactAutoSync();
    });
    return () => {
      offFolders();
      offFlags();
      offPrivacy();
      stopSync?.();
    };
  }, []);

  useEffect(() => {
    setOnboarded(isOnboarded());
    // Aynı telefon numarasıyla açılan her tarayıcı aynı kimliğe bağlanır:
    // etkin oturum varsa katılım ekranı tekrar sorulmaz.
    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        const sessionPhone = data.session?.user?.phone;
        if (!sessionPhone) return;
        const { getAlias: readAlias, setAlias, setPhone } = await import("@/lib/chat/profile");
        const e164 = sessionPhone.startsWith("+") ? sessionPhone : `+${sessionPhone}`;
        setPhone(e164);
        setAlias(readAlias() || e164);
        setOnboarded(true);
      } catch {
        /* çevrimdışı: yerel kimlik kullanılır */
      }
    })();
    // Açılış ekranı hiçbir koşulda kilitlenmez: yerel depo yanıt vermezse
    // en geç 2.5 sn sonra arayüz yine de açılır.
    const splashGuard = window.setTimeout(() => setReady(true), 2500);
    void bootChat().then(() => {
      window.clearTimeout(splashGuard);
      setReady(true);
      bootSessions();
    });
    bootLeader();
    const onBlocked = () =>
      toast.warning("Tedbirge başka bir sekmede açık", {
        description: "Güncellemenin tamamlanması için diğer sekmeyi kapatın.",
      });
    window.addEventListener(IDB_BLOCKED_EVENT, onBlocked);
    // Gelen aramaların duyulabilmesi için sinyal dinleyicisi açılışta kurulur.
    bootCalls();
    bootLock();
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    setSoundOff(isSoundMuted());
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener(IDB_BLOCKED_EVENT, onBlocked);
    };
  }, []);

  // QR bağlantısı (…/chat?p=<kimlik>&k=<anahtar>) ile gelen kişiyi rehbere ekler.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("p");
    const k = q.get("k");
    if (!p || !k) return;
    void (async () => {
      const { importPeerFromQr } = await import("@/lib/peer-trust");
      await importPeerFromQr(p, k);
      await refreshContacts();
      toast.success("Kişi rehbere eklendi", { description: p });
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      url.searchParams.delete("k");
      window.history.replaceState(null, "", url.pathname + url.search);
    })();
  }, []);

  // Sohbet değişince yazma alanına odaklan, yanıt/emoji durumunu sıfırla.
  useEffect(() => {
    setReplyTo(null);
    setEmojiOpen(false);
    setVisibleCount(60);
    setDraft(getDraft(activeId));
    inputRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, activeId, atBottom]);

  useEffect(() => {
    if (activeId) {
      void markRead(activeId);
      clearUnreadFlag(activeId);
    }
  }, [activeId, messages.length]);

  // Taslak kalıcıdır: sohbetten çıkılsa da yazılan metin kaybolmaz.
  useEffect(() => {
    persistDraft(activeId, draft);
  }, [draft, activeId]);

  // Sessize alma değişince liste rozetleri tazelenir.
  useEffect(() => onMuteChange(() => setFolderVersion((v) => v + 1)), []);

  const pairing = usePairing();
  const contactBook = useContacts();
  useAvatars();
  const myAvatarInput = useRef<HTMLInputElement>(null);

  // Rehber, yeni eş ya da yeni sohbet göründüğünde kendini tazeler.
  useEffect(() => {
    void refreshContacts();
  }, [chat.conversations.length, node.peers?.length, pairing.trusted]);

  /** Sohbet başlığını üç katmanlı rehber adıyla gösterir. */
  const titleOf = (c: { group: boolean; title: string; members: string[] }) => safeTitleOf(c);

  const allConversations = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const rows = q
      ? chat.conversations.filter(
          (c) =>
            c.title.toLocaleLowerCase("tr").includes(q) ||
            c.lastText.toLocaleLowerCase("tr").includes(q),
        )
      : chat.conversations;
    return [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastTs - a.lastTs);
  }, [chat.conversations, query]);

  // Klasör görünümü: "" → arşivlenmemiş tümü, ARCHIVE → arşiv, diğer → klasör.
  const tabs = useMemo(() => folderTabs(), [folderVersion]);
  // Arama kaydı olan sohbetler mesajsız olsa da listede kalır.
  const callTouched = useMemo(() => {
    const set = new Set<string>();
    for (const rec of listCalls()) {
      const peer = rec.peerId ?? "";
      // Adı çözülemeyen ya da kendi cihazıma ait arama kaydı sohbet satırı açmaz.
      if (!peer) continue;
      const name = resolveDisplayName(peer).trim();
      if (!name) continue;
      if (
        isSelfPerson({
          id: peer,
          personId: nameKeyOf(peer),
          phoneHash: resolvePhoneHash(peer),
          name,
        })
      )
        continue;
      if (rec.convId) set.add(rec.convId);
      set.add(directConvId(getBrowserNodeId(), peer));
    }
    return set;
  }, [chat.conversations]);
  const conversations = useMemo(() => {
    const pseudo = folder === UNREAD_TAB || folder === FAV_TAB || folder === GROUPS_TAB;
    const rows = allConversations.filter((c) => {
      const f = folderOf(c.id);
      if (pseudo || folder === "" ? f === ARCHIVE : f !== folder) return false;
      if (folder === UNREAD_TAB && !(c.unread > 0 || isMarkedUnread(c.id))) return false;
      if (folder === FAV_TAB && !isFavorite(c.id)) return false;
      if (folder === GROUPS_TAB && !c.group) return false;
      if (c.id === SELF_CONV_ID) return true;
      // Boş sohbet listeye girmez: en az bir mesaj ya da arama kaydı şart.
      const hasActivity = Boolean(c.lastText) || c.unread > 0;
      if (!hasActivity && !callTouched.has(c.id)) return false;
      // Adı çözülemeyen kayıt hiç oluşturulmaz.
      if (!isNamed(c)) return false;
      // Son güvenlik ağı: başlık yine de nötr etikete düşüyorsa listelenmez.
      if (!c.group && isTechnicalLabel(safeTitleOf(c))) return false;
      // Kendi diğer cihazlarım ayrı sohbet satırı açmaz ("Kendinize not" hariç).
      if (
        !c.group &&
        isSelfPerson({
          id: c.members?.[0],
          personId: nameKeyOf(c.members?.[0] ?? ""),
          phoneHash: resolvePhoneHash(c.members?.[0] ?? ""),
          name: safeTitleOf(c),
        })
      )
        return false;
      return true;
    });
    // TEK KİŞİ = TEK SATIR. Aynı kişinin farklı cihazlarıyla açılmış
    // sohbetler numara çıpası/kişi kimliği üzerinden tek satırda toplanır;
    // en son hareket gören sohbet listede kalır.
    const byPerson = new Map<string, (typeof rows)[number][]>();
    const out: typeof rows = [];
    for (const c of rows) {
      const member = c.members?.[0];
      if (c.group || c.id === SELF_CONV_ID || !member) {
        out.push(c);
        continue;
      }
      // Kanonik anahtar: numara özeti → kişi kimliği → normalize ad.
      const linked = nameKeyOf(member);
      const key = personGroupKey({
        phoneHash: resolvePhoneHash(member),
        personId: linked !== member ? linked : "",
        name: safeTitleOf(c),
        fallback: member,
      });

      const bucket = byPerson.get(key);
      if (bucket) bucket.push(c);
      else byPerson.set(key, [c]);
    }
    // İkinci geçiş: aynı ad = aynı kişi (numara özeti çakışmıyorsa).
    mergeGroupsByName(
      byPerson,
      (bucket) => bucket.map((c) => safeTitleOf(c)).find((v) => v.trim()) ?? "",
      (bucket) => bucket.map((c) => resolvePhoneHash(c.members?.[0] ?? "")).find(Boolean),
    );
    // Her kişiden en son hareket gören sohbet listede kalır; diğer
    // cihazların kimlikleri üyelerde korunur (arama doğru cihaza gitsin).
    const collapsed = Array.from(byPerson.values()).map((bucket) => {
      const sorted = [...bucket].sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
      const primary = sorted[0]!;
      if (sorted.length === 1) return primary;
      // ÖNEMLİ: adı çözülen birincil cihaz kimliği daima members[0] kalır.
      // Aksi halde birleştirilmiş satırın başlığı adsız bir cihaza düşüp
      // "Tedbirge kullanıcısı" yer tutucusu olarak görünüyordu.
      const head = primary.members?.[0];
      const named =
        sorted.map((c) => c.members?.[0]).find((m) => m && resolveDisplayName(m).trim()) ?? head;
      const rest = Array.from(new Set(sorted.flatMap((c) => c.members ?? []))).filter(
        (m) => m !== named,
      );
      const members = named ? [named, ...rest] : rest;
      const title = sorted.map((c) => safeTitleOf(c)).find((t) => !isTechnicalLabel(t));
      return { ...primary, members, title: title ?? primary.title };
    });
    // SON KAPI: birleştirme sonrası başlığı yine yer tutucuya düşen satır
    // (adsız cihaz kalıntısı) listeye hiç girmez.
    return [...out, ...collapsed]
      .filter((c) => c.id === SELF_CONV_ID || c.group || !isTechnicalLabel(safeTitleOf(c)))
      .sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
  }, [allConversations, folder, folderVersion, callTouched]);

  const archivedCount = useMemo(
    () => allConversations.filter((c) => isArchived(c.id)).length,
    [allConversations, folderVersion],
  );

  // Sekme durumu: mobil alt çubuk ve masaüstü sol ray aynı değeri kullanır.
  const mobileTab = shell.app;
  const setMobileTab = shell.setApp;
  // "+" eylem sayfası (yeni sohbet / grup / not / kimlik paylaş).
  const plusOpen = surface.isOpen("newChat");
  const setPlusOpen = (v: boolean) => surface.set("newChat", v);

  // Satır menüsünü konumlandırarak açar (sağ tık / basılı tutma).
  const openRowMenu = (c: { id: string; group?: boolean }, x: number, y: number) => {
    pressFeedback();
    setRowMenu({
      convId: c.id,
      title: safeTitleOf(c as never),
      x,
      y,
      archived: isArchived(c.id),
      pinned: Boolean((c as { pinned?: boolean }).pinned),
      favorite: isFavorite(c.id),
      unread: isMarkedUnread(c.id) || Boolean((c as { unread?: number }).unread),
    });
  };
  const totalUnread = useMemo(
    () => allConversations.reduce((sum, c) => sum + (c.unread || 0), 0),
    [allConversations],
  );
  const communityRows = useMemo(
    () =>
      allConversations
        .filter((c) => c.group)
        .map((c) => ({ id: c.id, title: c.title, members: c.members?.length ?? 0 })),
    [allConversations],
  );

  const active = chat.conversations.find((c) => c.id === activeId) ?? null;
  const peers: PeerInfo[] = node.peers ?? [];
  // `profileTick` yalnızca ad değiştiğinde yeniden okumayı tetikler.
  void profileTick;
  const me = getAlias() || "Ben";
  const label = (id: string) => humanName(contactLabel(id, chat.aliases[id]), "");
  /**
   * HEDEF KİLİDİ
   * Bir sohbetin gerçek muhatabı: önce görünen adla eşleşen cihaz, sonra
   * çevrim içi cihaz, en son öğrenilen kimlik. Böylece "Ahmet"e basınca
   * "Veli" açılmaz ve arama başka kişiye gitmez.
   */
  const targetOf = (conv: { title: string; members: string[]; group?: boolean }) => {
    if (conv.group) return conv.members[0];
    const wanted = humanName(conv.title, "").toLocaleLowerCase("tr");
    const byName = wanted
      ? conv.members.find((m) => label(m).toLocaleLowerCase("tr") === wanted)
      : undefined;
    return (
      byName ?? conv.members.find((m) => peers.some((p) => p.nodeId === m)) ?? conv.members.at(-1)
    );
  };
  const activeTarget = active ? targetOf(active) : undefined;
  const activeName = active
    ? active.group
      ? active.title
      : humanName(contactLabel(activeTarget ?? active.title, active.title), UNKNOWN_TITLE)
    : "";
  const peerId = activeTarget;
  const peerOnline = Boolean(active?.members.some((m) => peers.some((p) => p.nodeId === m)));
  /** Çevrim içi / son görülme yalnızca rehberde eşleşmiş kişilerde gösterilir. */
  const peerKnown = Boolean(
    active && !active.group && !isTechnicalLabel(contactLabel(activeTarget ?? "", "")),
  );
  const nameOf = (id: string) => humanName(contactLabel(id, chat.aliases[id]), UNKNOWN_TITLE);

  const peerTyping = Boolean(activeId && Date.now() - (chat.typing[activeId] ?? 0) < 5000);
  /** Kayan pencere: çok uzun sohbetlerde yalnızca son N mesaj DOM'a basılır. */
  const shownMessages = useMemo(
    () =>
      messages.length > visibleCount ? messages.slice(messages.length - visibleCount) : messages,
    [messages, visibleCount],
  );
  const hiddenCount = messages.length - shownMessages.length;
  const activeTtl = activeId ? ttlOf(activeId) : 0;

  /** Bekleyen (henüz iletilmemiş) mesaj sayısı — tek satırlık sade durum. */
  const pendingCount = useMemo(
    () =>
      Object.values(chat.messages)
        .flat()
        .filter((m) => m.outgoing && m.status === "pending").length,
    [chat.messages],
  );

  /** Bas-konuş: basılı tutulduğu sürece canlı telsiz akışı gönderilir. */
  async function pttDown() {
    if (!active || ptt) return;
    const targets = await conversationTargets(active.id);
    const ok = await startPtt(active.id, targets);
    if (!ok) return setError("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
    setPtt(true);
  }

  async function pttUp() {
    if (!active || !ptt) return;
    setPtt(false);
    const targets = await conversationTargets(active.id);
    const file = await stopPtt(active.id, targets);
    if (file) void sendMedia(active.id, file).catch((err: Error) => setError(err.message));
  }

  function submitDraft() {
    if (!active || !draft.trim()) return;
    pressFeedback();
    // Düzenleme modunda mesaj yerinde güncellenir, yeni mesaj oluşmaz.
    if (editing) {
      const target = editing;
      const text = draft;
      setDraft("");
      setEditing(null);
      void editMessage(target.id, text).catch((err: Error) => setError(err.message));
      inputRef.current?.focus();
      return;
    }
    const message = draft;
    void sendText(
      active.id,
      message,
      replyTo
        ? {
            id: replyTo.id,
            text: replyTo.deleted ? "Silinen mesaj" : replyTo.text || replyTo.media?.name || "Ek",
            author: replyTo.outgoing ? me : displayName(active.title),
          }
        : undefined,
    ).catch((err: Error) => {
      setError(err.message || "Mesaj gönderilemedi. Yeniden deneyin.");
      setDraft((current) => current || message);
    });
    setDraft("");
    setReplyTo(null);
    setEmojiOpen(false);
    void sendTyping(active.id, false);
    inputRef.current?.focus();
  }

  /** Sesli not — basılı tutmadan tek dokunuşla başlat/bitir. */
  async function toggleRecording() {
    if (!active) return;
    pressFeedback();
    if (recRef.current) {
      recRef.current.rec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      // Transkript kayıtla eş zamanlı, tamamen cihazda üretilir.
      transcriptRef.current = startTranscript("tr-TR");
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recRef.current) clearInterval(recRef.current.timer);
        recRef.current = null;
        setRecording(false);
        setRecSecs(0);
        const session = transcriptRef.current;
        transcriptRef.current = null;
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 800) {
          void session?.stop();
          return;
        }
        const file = new File([blob], `sesli-not-${Date.now()}.webm`, { type: blob.type });
        const finish = session ? session.stop() : Promise.resolve("");
        void finish
          .catch(() => "")
          .then((text) => sendVoiceFile(active.id, file, text?.trim() || undefined))
          .catch((err: Error) => setError(err.message));
      };
      const timer = setInterval(() => setRecSecs((v) => v + 1), 1000);
      recRef.current = { rec, chunks, timer };
      rec.start();
      setRecording(true);
      vibrate(20);
    } catch {
      setError("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
    }
  }

  async function shareInvite() {
    const url = `${window.location.origin}/chat`;
    const text = `Tedbirge ile bana yazın: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: "Tedbirge", text, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* kullanıcı iptal etti */
    }
  }

  if (lock.locked) return <AppLockScreen onUnlocked={() => undefined} />;
  if (!onboarded) return <PhoneOnboarding onDone={() => setOnboarded(true)} />;
  // WhatsApp mantığı: yerel veri hazırlanana kadar yarım arayüz gösterilmez.
  if (!ready) return <SplashScreen />;

  return (
    <div
      className="wa wa-shell flex w-full flex-col"
      style={{ background: "var(--wa-panel-soft)" }}
    >
      <PairingDialog nameOf={nameOf} />
      <ForwardDialog
        message={forwardMsg}
        conversations={chat.conversations as Conversation[]}
        titleOf={titleOf}
        authorName={forwardMsg?.outgoing ? me : nameOf(forwardMsg?.from ?? "")}
        onClose={() => setForwardMsg(null)}
      />
      <MediaGallery
        open={galleryOpen}
        convId={activeId}
        title={active ? titleOf(active) : ""}
        onClose={() => setGalleryOpen(false)}
      />
      <EmergencyDialog
        open={emergencyOpen}
        convId={activeId}
        onClose={() => setEmergencyOpen(false)}
      />

      <ChatSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        convId={activeId}
        initialTab={settingsTab}
      />
      <ContactsDialog
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        onOpenChat={(pid, displayName) => {
          // Tıklanan kişi ile açılan sohbet DAİMA aynı olsun: seçilen ad
          // önce bu cihaz kimliğine sabitlenir, sohbet o adla açılır.
          const picked = (displayName || chat.aliases[pid] || "").trim();
          if (picked && !isTechnicalLabel(picked)) writeNickname(pid, picked);
          void ensureDirectConversation(pid, picked || undefined).then((c) => {
            setActiveId(c.id);
            setContactsOpen(false);
          });
        }}
      />

      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        {/* Masaüstü sol ray — mobil alt sekme çubuğunun karşılığı */}
        <DesktopRail
          value={mobileTab}
          onChange={setMobileTab}
          meName={me}
          meAvatar={getMyAvatar() || undefined}
          unread={totalUnread}
          onSettings={() => setSettingsOpen(true)}
          onApps={() => surface.open("apps")}
          onTransfer={() => surface.open("transfer")}
          onMeshStatus={() => surface.open("meshStatus")}
        />
        {/* Sol panel — profil, arama, konuşma listesi */}
        <aside
          className={`relative flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden md:w-[380px] ${activeId ? "hidden md:flex" : "flex"}`}
          style={{ background: "var(--wa-panel)", borderRight: "1px solid var(--wa-border)" }}
        >
          <SearchPanel
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            onOpenMessage={(convId, messageId) => {
              setActiveId(convId);
              setSearchOpen(false);
              setVisibleCount(5000);
              setHighlightId(messageId);
              setTimeout(() => {
                document.getElementById(`msg_${messageId}`)?.scrollIntoView({ block: "center" });
              }, 250);
            }}
          />
          {/* Mobil büyük başlık — WhatsApp yerleşimi */}
          <div
            className="flex items-center justify-between gap-2 px-4 pb-1 md:hidden"
            style={{
              background: "var(--wa-panel)",
              paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
            }}
          >
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                setSettingsOpen(true);
              }}
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--wa-panel-soft)", color: "var(--wa-text)" }}
              aria-label="Menü"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setPlusOpen(true);
                }}
                className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ background: "var(--wa-accent)" }}
                aria-label="Yeni sohbet, grup veya kimlik paylaş"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>
          <h2
            className="px-4 pb-2 text-[34px] font-extrabold leading-none tracking-tight md:hidden"
            style={{ color: "var(--wa-text)", background: "var(--wa-panel)" }}
          >
            {mobileTab === "calls"
              ? "Aramalar"
              : mobileTab === "communities"
                ? "Topluluklar"
                : mobileTab === "feed"
                  ? "Akış"
                  : mobileTab === "me"
                    ? "Siz"
                    : "Sohbetler"}
          </h2>

          <div
            className="hidden flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4 md:flex"
            style={{
              background: "var(--wa-panel-soft)",
              borderBottom: "1px solid var(--wa-border)",
              paddingTop: "calc(0.625rem + env(safe-area-inset-top))",
            }}
          >
            <button
              type="button"
              onClick={() => myAvatarInput.current?.click()}
              className="wa-press rounded-full"
              aria-label="Profil fotoğrafını değiştir"
              title="Profil fotoğrafını değiştir"
            >
              <Avatar name={me} size={40} src={getMyAvatar()} />
            </button>
            <input
              ref={myAvatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void fileToAvatarDataUrl(file)
                  .then((url) => setMyAvatar(url))
                  .catch(() => undefined);
              }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: "var(--wa-text)" }}>
                {me}
              </p>
              <p className="truncate text-[11px]" style={{ color: "var(--wa-muted)" }}>
                {pendingCount > 0 ? `${pendingCount} mesaj bekliyor` : "Bağlı"}
              </p>
            </div>
            <div
              className="order-last flex w-full items-center justify-between gap-1 border-t pt-2 sm:order-none sm:w-auto sm:justify-end sm:border-0 sm:pt-0"
              style={{ borderColor: "var(--wa-border)" }}
            >
              <Link
                to="/"
                className="flex h-12 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-medium hover:bg-black/5 sm:h-9"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Web sitesine dön"
                title="Web sitesine dön"
              >
                <Home className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
                <span className="hidden sm:inline">Web sitesi</span>
              </Link>

              <Link
                to="/kurumsal"
                className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Hakkında"
                title="Hakkında"
              >
                <Globe className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setSearchOpen(true);
                }}
                className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Mesajlarda ara"
                title="Mesajlarda ara"
              >
                <Search className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setSettingsOpen(true);
                }}
                className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Gizlilik ve yedekleme"
                title="Gizlilik ve yedekleme"
              >
                <Settings className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setContactsOpen(true);
                }}
                className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Rehber"
                title={`Rehber · ${contactBook.contacts.length} kişi`}
              >
                <BookUser className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !soundOff;
                  setSoundMuted(next);
                  setSoundOff(next);
                  if (!next) pressFeedback();
                }}
                className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
                style={{ color: "var(--wa-muted)" }}
                aria-label={soundOff ? "Sesleri aç" : "Sesleri kapat"}
                title={soundOff ? "Sesleri aç" : "Sesleri kapat"}
              >
                {soundOff ? (
                  <VolumeX className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
                ) : (
                  <Volume2 className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setPlusOpen(true);
                }}
                className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Yeni sohbet, grup veya kimlik paylaş"
              >
                <Plus className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
              </button>
            </div>
          </div>

          {/* "Uygulamayı yükle" Ayarlar > Hakkında bölümüne taşındı. */}

          <div className={`px-3 py-2 ${mobileTab === "chats" ? "" : "hidden"}`}>
            <div
              className="flex items-center gap-3 rounded-full px-4"
              style={{ background: "var(--wa-panel-soft)", height: "var(--wa-search-h, 44px)" }}
            >
              <Search
                className="h-5 w-5 shrink-0"
                style={{ color: "var(--wa-muted)" }}
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="AI'ye Sor veya Ara"
                aria-label="AI'ye sor veya sohbetlerde ara"
                className="w-full min-w-0 bg-transparent text-[16px] outline-none"
                style={{ color: "var(--wa-text)" }}
              />
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  window.dispatchEvent(
                    new CustomEvent("tedbirge:advisor", {
                      detail: query.trim() ? { prefill: query.trim() } : {},
                    }),
                  );
                }}
                className="wa-press shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold text-white"
                style={{ background: "var(--wa-accent)" }}
                aria-label="AI danışmana sor"
              >
                AI
              </button>
            </div>
          </div>

          {/* Sohbetler sekmesi içeriği */}
          <div className={`min-h-0 flex-1 flex-col ${mobileTab === "chats" ? "flex" : "hidden"}`}>
            {/* Klasör ve arşiv sekmeleri */}
            <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
              {tabs.map((t) => {
                const on = folder === t.id;
                const isArchive = t.id === ARCHIVE;
                if (isArchive && archivedCount === 0 && !on) return null;
                return (
                  <button
                    key={t.id || "all"}
                    type="button"
                    onClick={() => {
                      pressFeedback();
                      setFolder(t.id);
                    }}
                    className="wa-press shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
                    style={{
                      background: on ? "var(--wa-accent)" : "var(--wa-panel-soft)",
                      color: on ? "#fff" : "var(--wa-muted)",
                    }}
                  >
                    {isArchive ? `Arşiv${archivedCount ? ` · ${archivedCount}` : ""}` : t.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setFolder(CALLS_TAB);
                }}
                className="wa-press shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  background: folder === CALLS_TAB ? "var(--wa-accent)" : "var(--wa-panel-soft)",
                  color: folder === CALLS_TAB ? "#fff" : "var(--wa-muted)",
                }}
              >
                Aramalar
              </button>
              {[
                { id: UNREAD_TAB, label: "Okunmamış" },
                { id: FAV_TAB, label: "Favoriler" },
                { id: GROUPS_TAB, label: "Gruplar" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    setFolder(folder === chip.id ? "" : chip.id);
                  }}
                  className="wa-press shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{
                    background: folder === chip.id ? "var(--wa-accent)" : "var(--wa-panel-soft)",
                    color: folder === chip.id ? "#fff" : "var(--wa-muted)",
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {groupMode && (
              <div
                className="p-4"
                style={{
                  borderTop: "1px solid var(--wa-border)",
                  borderBottom: "1px solid var(--wa-border)",
                }}
              >
                <p className="text-xs" style={{ color: "var(--wa-muted)" }}>
                  Yakındaki cihazlar otomatik listelenir. Dokunarak sohbet açabilirsiniz.
                </p>
                <div className="mt-3 space-y-2">
                  {peers.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--wa-muted)" }}>
                      Henüz yakında cihaz yok — karekod ile davet edin.
                    </p>
                  )}
                  {peers
                    .filter(
                      (p) => !isTechnicalLabel(contactLabel(p.nodeId, chat.aliases[p.nodeId])),
                    )
                    .map((p) => {
                      const paired = Boolean(pairing.trusted[p.nodeId]);

                      return (
                        <button
                          key={p.nodeId}
                          type="button"
                          onClick={() => {
                            void ensureDirectConversation(p.nodeId, chat.aliases[p.nodeId]).then(
                              (c) => {
                                setActiveId(c.id);
                                setGroupMode(false);
                              },
                            );
                          }}
                          className="wa-press wa-row flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5"
                          style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
                        >
                          <span className="truncate">
                            {humanName(
                              contactLabel(p.nodeId, chat.aliases[p.nodeId]),
                              "Kayıtsız cihaz",
                            )}
                          </span>
                          <span
                            className="text-[11px]"
                            style={{ color: paired ? "var(--wa-accent)" : "var(--wa-muted)" }}
                          >
                            {paired ? "çevrimiçi" : "yakında"}
                          </span>
                        </button>
                      );
                    })}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={newPeer}
                    onChange={(e) => setNewPeer(e.target.value)}
                    placeholder="Grup adı veya davet kodu"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = newPeer.trim();
                      if (!value) return;
                      const known = peers.some((p) => p.nodeId === value);
                      const task = known
                        ? ensureDirectConversation(value)
                        : createGroup(
                            value,
                            peers.map((p: PeerInfo) => p.nodeId),
                          );
                      void task.then((c) => {
                        setActiveId(c.id);
                        setNewPeer("");
                        setGroupMode(false);
                      });
                    }}
                    className="rounded-lg px-3 py-2 text-white"
                    style={{ background: "var(--wa-accent)" }}
                    aria-label="Grup oluştur"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {folder === CALLS_TAB && (
              <div className="flex min-h-0 flex-1 flex-col">
                <CallsPanel
                  showHeader={false}
                  onCall={(peer, video) => {
                    void ensureDirectConversation(peer).then((c) => {
                      setActiveId(c.id);
                      void startCall(peer, video, nameOf(peer));
                    });
                  }}
                  onNewCall={() => setNewCallOpen(true)}
                  onSchedule={() => setScheduleOpen(true)}
                  onDialpad={() => setDialpadOpen(true)}
                  onFavorites={() => setContactsOpen(true)}
                />
              </div>
            )}

            <SyncWarningBar />

            <ul className={`flex-1 overflow-y-auto ${folder === CALLS_TAB ? "hidden" : ""}`}>
              {pairing.incoming.map((req) => (
                <li
                  key={`req_${req.nodeId}`}
                  className="px-4 py-3"
                  style={{ background: "var(--wa-panel-soft)" }}
                >
                  <p className="text-[13px] font-medium" style={{ color: "var(--wa-text)" }}>
                    {nameOf(req.nodeId)} cihazını hesabınıza bağlamak istiyor
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => acceptPairing(req.nodeId, chat.aliases[req.nodeId])}
                      className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                      style={{ background: "var(--wa-accent)" }}
                    >
                      Kod gir
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissPairing(req.nodeId)}
                      className="rounded-full px-3 py-1.5 text-[12px]"
                      style={{ border: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
                    >
                      Yoksay
                    </button>
                  </div>
                </li>
              ))}
              {conversations.map((c) => {
                const name = humanName(titleOf(c));
                return (
                  <li key={c.id} style={{ borderBottom: "1px solid var(--wa-border)" }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveId(c.id)}
                      onKeyDown={(e) => e.key === "Enter" && setActiveId(c.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openRowMenu(c, e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        const t = e.touches[0];
                        const x = t?.clientX ?? 0;
                        const y = t?.clientY ?? 0;
                        if (longPressRef.current) clearTimeout(longPressRef.current);
                        longPressRef.current = setTimeout(() => openRowMenu(c, x, y), 450);
                      }}
                      onTouchEnd={() => {
                        if (longPressRef.current) clearTimeout(longPressRef.current);
                      }}
                      onTouchMove={() => {
                        if (longPressRef.current) clearTimeout(longPressRef.current);
                      }}
                      className="wa-row flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-black/[0.03]"
                      style={activeId === c.id ? { background: "var(--wa-panel-soft)" } : undefined}
                    >
                      <Avatar
                        name={name}
                        src={c.group ? undefined : getAvatar(targetOf(c) ?? "")}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className="truncate text-[15px] font-medium"
                            style={{ color: "var(--wa-text)" }}
                          >
                            {c.pinned && (
                              <Pin
                                className="mr-1 inline h-3 w-3"
                                style={{ color: "var(--wa-accent)" }}
                                aria-hidden
                              />
                            )}
                            {name}
                            {isMuted(c.id) && (
                              <VolumeX
                                className="ml-1 inline h-3 w-3"
                                style={{ color: "var(--wa-muted)" }}
                                aria-hidden
                              />
                            )}
                          </p>
                          <span
                            className="shrink-0 text-[11px]"
                            style={{ color: "var(--wa-muted)" }}
                          >
                            {c.lastTs ? timeOf(c.lastTs) : ""}
                          </span>
                        </div>
                        <p className="truncate text-[13px]" style={{ color: "var(--wa-muted)" }}>
                          {c.lastText}
                        </p>
                      </div>
                      {isFavorite(c.id) && (
                        <Heart
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: "var(--wa-accent)" }}
                          aria-hidden
                        />
                      )}
                      {c.unread === 0 && isMarkedUnread(c.id) && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: "var(--wa-accent)" }}
                          aria-label="Okunmadı olarak işaretli"
                        />
                      )}
                      {c.unread > 0 && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ background: "var(--wa-accent)" }}
                        >
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
              {ready && (
                <li>
                  <DirectoryPanel
                    query={query}
                    peers={peers}
                    labelOf={nameOf}
                    onOpenPeer={(pid, name) => {
                      // KİMLİK ÇIPASI: tıklanan kişinin adı doğrudan o cihaza
                      // yazılır; açılan sohbet başlığı asla başka kişiye kaymaz.
                      repairCrossLinks();
                      const picked = humanName(name ?? chat.aliases[pid], "");
                      if (picked && !isTechnicalLabel(picked)) setNickname(pid, picked);
                      void ensureDirectConversation(pid, picked || undefined).then((c) =>
                        setActiveId(c.id),
                      );
                    }}
                    onOpenSelfNote={() => {
                      void ensureSelfConversation(`${me} (Siz)`).then((c) => setActiveId(c.id));
                    }}
                    onShareInvite={() => void shareInvite()}
                  />
                </li>
              )}
            </ul>

            <div
              className="flex items-center gap-2 px-4 py-2 text-[11px]"
              style={{ borderTop: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
            >
              <Lock className="h-3 w-3" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {pendingCount > 0
                  ? `Çevrimdışı — ${pendingCount} mesaj bekliyor`
                  : "Bağlı · uçtan uca şifreli"}
              </span>
              {/* Sürüm damgası: ekrandaki paketin hangi yayın olduğu tek bakışta bellidir. */}
              <span className="shrink-0 opacity-70" title="Uygulama sürümü">
                v{BUILD_LABEL}
              </span>
            </div>
          </div>

          {/* Aramalar sekmesi */}
          {mobileTab === "calls" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <CallsPanel
                showHeader={false}
                onCall={(peerId, video) => void startCall(peerId, video, nameOf(peerId))}
                onNewCall={() => setNewCallOpen(true)}
                onSchedule={() => setScheduleOpen(true)}
                onDialpad={() => setDialpadOpen(true)}
                onFavorites={() => setContactsOpen(true)}
              />
            </div>
          )}

          {/* Topluluklar sekmesi */}
          {mobileTab === "communities" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <CommunitiesPanel
                groups={communityRows}
                onOpen={(id) => {
                  setMobileTab("chats");
                  setActiveId(id);
                }}
                onCreate={() => {
                  setMobileTab("chats");
                  setGroupMode(true);
                }}
              />
            </div>
          )}

          {/* Topluluk / Sosyal akış sekmesi */}
          {mobileTab === "feed" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <FeedPanel meName={me} onTransfer={() => surface.open("transfer")} />
            </div>
          )}

          {/* Siz sekmesi */}
          {mobileTab === "me" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <MePanel
                name={me}
                avatar={getMyAvatar() || undefined}
                personId={getPersonId()}
                about={getAbout()}
                soundOff={soundOff}
                onAvatarPick={() => myAvatarInput.current?.click()}
                onProfile={() => setProfileOpen(true)}
                onQr={() => setQrOpen(true)}
                onSearch={() => setSearchOpen(true)}
                onContacts={() => setContactsOpen(true)}
                onLists={() => setContactsOpen(true)}
                onBroadcast={() => {
                  setMobileTab("chats");
                  setGroupMode(true);
                }}
                onSettings={() => {
                  setSettingsTab("profil");
                  setSettingsOpen(true);
                }}
                onPairing={() => {
                  setSettingsTab("profil");
                  setSettingsOpen(true);
                }}
                onNotifications={() => {
                  setSettingsTab("bildirim");
                  setSettingsOpen(true);
                }}
                onStorage={() => {
                  setSettingsTab("depolama");
                  setSettingsOpen(true);
                }}
                onHelp={() => {
                  setSettingsTab("hakkinda");
                  setSettingsOpen(true);
                }}
                onInvite={() => void shareInvite()}
                onApps={() => surface.open("apps")}
                onRelay={() => surface.open("relay")}
                onMeshStatus={() => surface.open("meshStatus")}
                onTransfer={() => surface.open("transfer")}
                onFeed={() => setMobileTab("feed")}
                onSubscription={() => window.open("/fiyatlandirma", "_blank", "noopener")}
                planLabel={`Community · ${COMMUNITY_NODE_LIMIT} cihaz ücretsiz`}
                deviceCount={Object.keys(pairing.trusted).length}
                chatCount={totalUnread}
                onToggleSound={() => setSoundOff((v) => !v)}
                onSelfNote={() => {
                  setMobileTab("chats");
                  void ensureSelfConversation(`${me} (Siz)`).then((c) => setActiveId(c.id));
                }}
                version={BUILD_LABEL}
              />
            </div>
          )}
        </aside>

        {/* Sağ panel — aktif sohbet */}
        <section
          className={`relative flex h-full min-w-0 flex-1 flex-col ${activeId ? "flex" : "hidden md:flex"}`}
        >
          {!active ? (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center"
              style={{ background: "var(--wa-panel-soft)" }}
            >
              <p className="text-lg font-medium" style={{ color: "var(--wa-text)" }}>
                Tedbirge Mesajlaşma
              </p>
              <p className="max-w-md text-sm" style={{ color: "var(--wa-muted)" }}>
                Bir sohbet seçin. Mesajlarınız internet varken bulut üzerinden, internet yokken
                yakındaki cihazlar üzerinden iletilir — siz hiçbir ayar yapmazsınız.
              </p>

              {/* Son sohbetler ve arşiv kısayolu */}
              {conversations.length > 0 && (
                <div className="w-full max-w-md text-left">
                  <p
                    className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--wa-muted)" }}
                  >
                    Son sohbetler
                  </p>
                  <ul
                    className="overflow-hidden rounded-xl"
                    style={{ background: "var(--wa-panel)" }}
                  >
                    {conversations.slice(0, 5).map((c) => (
                      <li
                        key={`recent_${c.id}`}
                        style={{ borderBottom: "1px solid var(--wa-border)" }}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveId(c.id)}
                          className="wa-press flex w-full items-center gap-3 px-3 py-2.5 text-left"
                        >
                          <Avatar name={titleOf(c)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium">
                              {titleOf(c)}
                            </span>
                            <span
                              className="block truncate text-[12px]"
                              style={{ color: "var(--wa-muted)" }}
                            >
                              {c.lastText}
                            </span>
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--wa-muted)" }}>
                            {c.lastTs ? timeOf(c.lastTs) : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {archivedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFolder(ARCHIVE)}
                  className="wa-press min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold"
                  style={{ border: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
                >
                  Arşiv · {archivedCount}
                </button>
              )}
            </div>
          ) : (
            <>
              <header
                className="grid min-h-16 grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4"
                style={{
                  background: "var(--wa-panel-soft)",
                  borderBottom: "1px solid var(--wa-border)",
                  paddingTop: "calc(0.5rem + env(safe-area-inset-top))",
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="wa-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 md:hidden"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="Listeye dön"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar name={activeName} size={44} src={getAvatar(peerId)} />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[15px] font-semibold"
                    style={{ color: "var(--wa-text)" }}
                  >
                    {activeName}
                  </p>
                  <p className="truncate text-[12px]" style={{ color: "var(--wa-muted)" }}>
                    {activeTtl > 0 ? `⏱ ${ttlLabel(activeTtl)} · ` : ""}
                    {peerTyping
                      ? "yazıyor…"
                      : active.group
                        ? "Grup"
                        : !peerKnown
                          ? "uçtan uca şifreli"
                          : peerOnline
                            ? "çevrimiçi"
                            : privacy.hideLastSeen
                              ? "uçtan uca şifreli"
                              : lastSeenLabel(peerId ?? "")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    if (active.group)
                      void startConference(
                        active.members.map((m) => ({ peerId: m, alias: nameOf(m) })),
                        false,
                        activeName,
                      );
                    else if (peerId) void startCall(peerId, false, activeName);
                  }}
                  disabled={!peerId}
                  className="wa-press flex h-13 w-13 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
                  style={{
                    color: "var(--wa-accent)",
                    background: "var(--wa-panel)",
                    borderColor: "var(--wa-border)",
                  }}
                  aria-label="Sesli ara"
                >
                  <Phone className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    if (active.group)
                      void startConference(
                        active.members.map((m) => ({ peerId: m, alias: nameOf(m) })),
                        true,
                        activeName,
                      );
                    else if (peerId) void startCall(peerId, true, activeName);
                  }}
                  disabled={!peerId}
                  className="wa-press flex h-13 w-13 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
                  style={{
                    color: "var(--wa-accent)",
                    background: "var(--wa-panel)",
                    borderColor: "var(--wa-border)",
                  }}
                  aria-label="Görüntülü ara"
                >
                  <Video className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    setGalleryOpen(true);
                  }}
                  className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="Medya ve belgeler"
                  title="Medya ve belgeler"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <div className="relative hidden lg:block">
                  <button
                    type="button"
                    onClick={() => {
                      pressFeedback();
                      setMuteMenu((v) => !v);
                    }}
                    className="wa-press flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
                    style={{ color: isMuted(active.id) ? "var(--wa-accent)" : "var(--wa-muted)" }}
                    aria-label={isMuted(active.id) ? "Sesi aç" : "Sessize al"}
                    title={isMuted(active.id) ? muteUntilLabel(active.id) : "Sessize al"}
                  >
                    {isMuted(active.id) ? (
                      <BellOff className="h-5 w-5" />
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </button>
                  {muteMenu && (
                    <div
                      className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-lg shadow-lg"
                      style={{
                        background: "var(--wa-panel)",
                        border: "1px solid var(--wa-border)",
                      }}
                    >
                      {isMuted(active.id) ? (
                        <button
                          type="button"
                          onClick={() => {
                            unmuteConversation(active.id);
                            setMuteMenu(false);
                          }}
                          className="wa-press block w-full px-3 py-2.5 text-left text-[13px]"
                          style={{ color: "var(--wa-text)" }}
                        >
                          Bildirimleri aç
                        </button>
                      ) : (
                        MUTE_OPTIONS.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => {
                              muteConversation(active.id, o.id);
                              setMuteMenu(false);
                            }}
                            className="wa-press block w-full px-3 py-2.5 text-left text-[13px]"
                            style={{ color: "var(--wa-text)" }}
                          >
                            {o.label}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void togglePin(active.id)}
                  className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="Sabitle"
                >
                  <Pin className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    toggleArchive(active.id);
                    setActiveId(null);
                  }}
                  className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label={isArchived(active.id) ? "Arşivden çıkar" : "Arşivle"}
                  title={isArchived(active.id) ? "Arşivden çıkar" : "Arşivle"}
                >
                  <Archive className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void removeConversation(active.id);
                    setActiveId(null);
                  }}
                  className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="Sohbeti sil"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </header>

              <div
                ref={scrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
                }}
                className="wa-chat-bg relative flex-1 space-y-1.5 overflow-y-auto px-4 py-4 md:px-12"
              >
                <div
                  className="mx-auto mb-3 w-fit rounded-md bg-white/70 px-3 py-1 text-[11px]"
                  style={{ color: "var(--wa-muted)" }}
                >
                  <Lock className="mr-1 inline h-3 w-3" aria-hidden /> Mesajlar uçtan uca şifrelidir
                </div>
                {/* Sabitlenmiş mesaj şeridi */}
                {active.pinnedMessageId &&
                  (() => {
                    const pm = messages.find((x) => x.id === active.pinnedMessageId);
                    if (!pm) return null;
                    return (
                      <div
                        className="sticky top-0 z-10 mx-auto mb-2 flex w-full max-w-2xl items-center gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-sm"
                        style={{ borderLeft: "3px solid var(--wa-accent)" }}
                      >
                        <Pin
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--wa-accent)" }}
                          aria-hidden
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightId(pm.id);
                            document
                              .getElementById(`msg_${pm.id}`)
                              ?.scrollIntoView({ block: "center", behavior: "smooth" });
                          }}
                          className="min-w-0 flex-1 truncate text-left text-[12.5px]"
                          style={{ color: "var(--wa-text)" }}
                        >
                          {pm.text || pm.media?.name || "Ek"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void pinMessage(active.id, null)}
                          className="wa-press rounded-full p-1"
                          style={{ color: "var(--wa-muted)" }}
                          aria-label="Sabitlemeyi kaldır"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })()}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((v) => v + 200)}
                    className="wa-press mx-auto block rounded-full bg-white/80 px-4 py-1.5 text-[12px]"
                    style={{ color: "var(--wa-muted)" }}
                  >
                    {hiddenCount} eski mesajı yükle
                  </button>
                )}
                {shownMessages.map((m, i) => {
                  const prev = shownMessages[i - 1];
                  const newDay =
                    !prev || new Date(prev.ts).toDateString() !== new Date(m.ts).toDateString();
                  return (
                    <div
                      key={m.id}
                      id={`msg_${m.id}`}
                      className={`space-y-1.5 ${highlightId === m.id ? "rounded-lg ring-2 ring-offset-2" : ""}`}
                      style={
                        highlightId === m.id
                          ? { boxShadow: "0 0 0 2px var(--wa-accent)" }
                          : undefined
                      }
                    >
                      {newDay && (
                        <div
                          className="mx-auto w-fit rounded-md bg-white/80 px-3 py-1 text-[11px] font-medium"
                          style={{ color: "var(--wa-muted)" }}
                        >
                          {dayLabel(m.ts)}
                        </div>
                      )}
                      <MessageRow
                        msg={m}
                        authorName={nameOf(m.from)}
                        showAuthor={Boolean(active.group)}
                        progress={chat.transfers[m.id]}
                        pinned={active.pinnedMessageId === m.id}
                        translateTo={privacy.autoTranslateTo || undefined}
                        onReply={setReplyTo}
                        onImage={setLightbox}
                        onEdit={(msg) => {
                          setEditing(msg);
                          setReplyTo(null);
                          setDraft(msg.text);
                          inputRef.current?.focus();
                        }}
                        onForward={setForwardMsg}
                      />
                    </div>
                  );
                })}
                {peerTyping && (
                  <div className="flex justify-start">
                    <div
                      className="wa-bubble rounded-lg px-3 py-2 shadow-sm"
                      style={{ background: "var(--wa-bubble-in)", color: "var(--wa-muted)" }}
                    >
                      <span className="wa-typing inline-flex items-center">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {!atBottom && (
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    setAtBottom(true);
                    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                  }}
                  className="wa-press absolute bottom-24 right-6 z-10 rounded-full bg-white p-2.5 shadow-lg"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="En alta git"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              )}

              {ptt && (
                <p className="px-5 pb-1 text-xs font-semibold" style={{ color: "#e03131" }}>
                  Telsiz açık — konuşun, bıraktığınızda kayıt sohbete düşer.
                </p>
              )}
              {error && (
                <p className="px-5 pb-2 text-xs" style={{ color: "#c0392b" }}>
                  {error}
                </p>
              )}

              {editing && (
                <div
                  className="wa-pop flex items-center gap-2 px-3 pt-2"
                  style={{ background: "var(--wa-panel-soft)" }}
                >
                  <div
                    className="flex-1 rounded-md border-l-[3px] px-3 py-2 text-[12.5px]"
                    style={{
                      borderColor: "var(--wa-accent)",
                      background: "var(--wa-panel)",
                      color: "var(--wa-muted)",
                    }}
                  >
                    <span className="block font-semibold" style={{ color: "var(--wa-accent)" }}>
                      Mesajı düzenle · {remainingWindow(editing, EDIT_WINDOW_MS)}
                    </span>
                    <span className="line-clamp-1 break-words">{editing.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setDraft("");
                    }}
                    className="wa-press rounded-full p-2 hover:bg-black/5"
                    style={{ color: "var(--wa-muted)" }}
                    aria-label="Düzenlemeyi iptal et"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {replyTo && (
                <div
                  className="wa-pop flex items-start gap-2 px-3 pt-2"
                  style={{ background: "var(--wa-panel-soft)" }}
                >
                  <div
                    className="flex-1 rounded-md border-l-[3px] px-3 py-2 text-[12.5px]"
                    style={{
                      borderColor: "var(--wa-accent)",
                      background: "var(--wa-panel)",
                      color: "var(--wa-muted)",
                    }}
                  >
                    <span className="block font-semibold" style={{ color: "var(--wa-accent)" }}>
                      {replyTo.outgoing ? me : activeName}
                    </span>
                    <span className="line-clamp-1 break-words">
                      {replyTo.text || replyTo.media?.name || "Ek"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="wa-press rounded-full p-2 hover:bg-black/5"
                    style={{ color: "var(--wa-muted)" }}
                    aria-label="Yanıtı iptal et"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {emojiOpen && (
                <div
                  className="wa-pop grid max-h-44 grid-cols-8 gap-1 overflow-y-auto px-3 pt-2 sm:grid-cols-12"
                  style={{ background: "var(--wa-panel-soft)" }}
                >
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        vibrate(8);
                        setDraft((d) => d + e);
                        inputRef.current?.focus();
                      }}
                      className="wa-press rounded-md py-1 text-xl hover:bg-black/5"
                      aria-label={`Emoji ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitDraft();
                }}
                className="flex w-full max-w-full flex-wrap items-center justify-between gap-1.5 overflow-x-hidden p-2 sm:flex-nowrap sm:gap-2 sm:p-2.5"
                style={{
                  background: "var(--wa-panel-soft)",
                  borderTop: "1px solid var(--wa-border)",
                  boxSizing: "border-box",
                  paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setError(null);
                    void sendMedia(active.id, file).catch((err: Error) => setError(err.message));
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    setEmojiOpen((v) => !v);
                  }}
                  className="wa-press order-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none"
                  style={{
                    color: emojiOpen ? "var(--wa-accent)" : "var(--wa-muted)",
                    background: "var(--wa-panel)",
                    borderColor: "var(--wa-border)",
                  }}
                  aria-label="Emoji ekle"
                >
                  <Smile className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    fileRef.current?.click();
                  }}
                  className="wa-press order-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none"
                  style={{
                    color: "var(--wa-muted)",
                    background: "var(--wa-panel)",
                    borderColor: "var(--wa-border)",
                  }}
                  aria-label="Dosya ekle"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    setEmergencyOpen(true);
                  }}
                  className="wa-press order-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none"
                  style={{
                    color: "#e03131",
                    background: "var(--wa-panel)",
                    borderColor: "var(--wa-border)",
                  }}
                  aria-label="Konum paylaş veya acil durum yayını"
                  title="Konum paylaş · Acil durum yayını (SOS)"
                >
                  <Siren className="h-5 w-5" />
                </button>

                {recording ? (
                  <div
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm sm:px-4"
                    style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
                  >
                    <span
                      className="wa-rec h-2.5 w-2.5 rounded-full"
                      style={{ background: "#e03131" }}
                      aria-hidden
                    />
                    <span>
                      Ses kaydediliyor · {String(Math.floor(recSecs / 60)).padStart(2, "0")}:
                      {String(recSecs % 60).padStart(2, "0")}
                    </span>
                  </div>
                ) : (
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      if (active) void sendTyping(active.id, e.target.value.length > 0);
                    }}
                    placeholder="Bir mesaj yazın"
                    className="order-1 h-12 w-full min-w-0 rounded-lg px-3 text-base outline-none sm:order-none sm:flex-1 sm:px-4 sm:text-sm"
                    style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
                  />
                )}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    void pttDown();
                  }}
                  onPointerUp={() => void pttUp()}
                  onPointerLeave={() => void pttUp()}
                  onPointerCancel={() => void pttUp()}
                  className={`wa-press order-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none ${ptt ? "wa-ring text-white" : ""}`}
                  style={{
                    color: ptt ? "#fff" : "var(--wa-muted)",
                    background: ptt ? "#e03131" : "var(--wa-panel)",
                    borderColor: "var(--wa-border)",
                  }}
                  aria-label="Bas-konuş (telsiz)"
                  title="Basılı tutun — telsiz gibi konuşun"
                >
                  <Radio className="h-5 w-5" />
                </button>
                {draft.trim() ? (
                  <button
                    type="submit"
                    className="wa-press order-6 flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-white sm:order-none"
                    style={{ background: "var(--wa-accent)" }}
                    aria-label="Gönder"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void toggleRecording()}
                    className={`wa-press order-6 flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-white sm:order-none ${recording ? "wa-ring" : ""}`}
                    style={{ background: recording ? "#e03131" : "var(--wa-accent)" }}
                    aria-label={recording ? "Kaydı bitir ve gönder" : "Sesli not kaydet"}
                  >
                    {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                )}
              </form>

              {lightbox && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
                  onClick={() => setLightbox(null)}
                  role="presentation"
                >
                  <img
                    src={lightbox}
                    alt="Büyütülmüş görsel"
                    className="max-h-full max-w-full rounded-md"
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobil alt sekme çubuğu — yalnızca liste görünümünde. */}
      {!activeId && (
        <MobileTabBar
          value={mobileTab}
          onChange={setMobileTab}
          meName={me}
          meAvatar={getMyAvatar() || undefined}
          unread={totalUnread}
        />
      )}

      {/* Faz C kabuk ekranları: uygulamalar (.tbapp), röle, ağ durumu */}
      <AppsDialog open={surface.isOpen("apps")} onClose={() => surface.close("apps")} />
      <AppOfferHost />
      <RelaySettingsDialog open={surface.isOpen("relay")} onClose={() => surface.close("relay")} />
      <MeshStatusDialog
        open={surface.isOpen("meshStatus")}
        onClose={() => surface.close("meshStatus")}
      />
      <FileTransferDialog
        open={surface.isOpen("transfer")}
        onClose={() => surface.close("transfer")}
      />

      {/* Profil ve QR kodu ekranları (mobil tam sayfa, masaüstü kart) */}
      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={me}
        avatar={getMyAvatar() || undefined}
        onAvatarPick={() => myAvatarInput.current?.click()}
        onRename={(next) => {
          setAlias(next);
          setProfileTick((v) => v + 1);
        }}
        onLinks={() => void shareInvite()}
      />
      <QrCodeSheet
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        name={me}
        avatar={getMyAvatar() || undefined}
        personId={getPersonId()}
        onShare={() => void shareInvite()}
        onScan={() => {
          setQrOpen(false);
          setContactsOpen(true);
        }}
      />

      {/* "+" eylem sayfası */}
      <NewChatSheet
        open={plusOpen}
        onClose={() => setPlusOpen(false)}
        onOpenChat={(peerId, name) => {
          setMobileTab("chats");
          void ensureDirectConversation(peerId, name || nameOf(peerId)).then((c) =>
            setActiveId(c.id),
          );
        }}
        onNewGroup={() => {
          setMobileTab("chats");
          setGroupMode(true);
        }}
        onNewContact={() => setNewContactOpen(true)}
        onNewCommunity={() => setMobileTab("communities")}
      />

      {/* Arama ekranları: yeni arama, tuş takımı, bağlantı, planlama */}
      <NewCallSheet
        open={newCallOpen}
        onClose={() => setNewCallOpen(false)}
        onCall={(peerId, video) => void startCall(peerId, video, nameOf(peerId))}
        onConference={(peerIds, video) =>
          void startConference(
            peerIds.map((peerId) => ({ peerId, alias: nameOf(peerId) })),
            video,
          )
        }
        onNewLink={() => setCallLinkOpen(true)}
        onNewContact={() => setNewContactOpen(true)}
      />
      <Dialpad
        open={dialpadOpen}
        onClose={() => setDialpadOpen(false)}
        onCall={(peerId, video) => void startCall(peerId, video, nameOf(peerId))}
        onMessage={(peerId) => {
          setMobileTab("chats");
          void ensureDirectConversation(peerId, nameOf(peerId)).then((c) => setActiveId(c.id));
        }}
        onAddContact={(phone) => {
          setDialpadOpen(false);
          setDialPrefill(phone);
          setNewContactOpen(true);
        }}
      />
      <CallLinkSheet open={callLinkOpen} onClose={() => setCallLinkOpen(false)} />
      <ScheduleCallSheet open={scheduleOpen} onClose={() => setScheduleOpen(false)} />

      {/* Elle kişi ekleme (Ad · Soyadı · Ülke · Telefon) */}
      <NewContactForm
        open={newContactOpen}
        prefillPhone={dialPrefill}
        onClose={() => {
          setNewContactOpen(false);
          setDialPrefill("");
        }}
        onSaved={(peerId, name) => {
          setMobileTab("chats");
          setDialPrefill("");
          if (name && !isTechnicalLabel(name)) setNickname(peerId, name);
          void ensureDirectConversation(peerId, name || undefined).then((c) => setActiveId(c.id));
        }}
      />

      {/* Sohbet satırı menüsü: arşiv, sabitle, favori, liste, temizle, sil */}
      <ChatRowMenu
        state={rowMenu}
        folders={getFolders().names}
        onClose={() => setRowMenu(null)}
        onArchive={() => {
          if (rowMenu) toggleArchive(rowMenu.convId);
        }}
        onPin={() => {
          if (rowMenu) void togglePin(rowMenu.convId);
        }}
        onToggleRead={() => {
          if (!rowMenu) return;
          if (rowMenu.unread) {
            clearUnreadFlag(rowMenu.convId);
            void markRead(rowMenu.convId);
          } else {
            markUnreadFlag(rowMenu.convId);
            void markUnread(rowMenu.convId);
          }
        }}
        onFavorite={() => {
          if (rowMenu) toggleFavorite(rowMenu.convId);
        }}
        onAssignList={(name) => {
          if (rowMenu) assignFolder(rowMenu.convId, name);
        }}
        onCreateList={() => {
          const name = window.prompt("Yeni liste adı")?.trim();
          if (!name || !rowMenu) return;
          createFolder(name);
          assignFolder(rowMenu.convId, name);
        }}
        onClear={() => {
          if (rowMenu) void clearConversation(rowMenu.convId);
        }}
        onDelete={() => {
          if (!rowMenu) return;
          const id = rowMenu.convId;
          forgetFlags(id);
          if (activeId === id) setActiveId(null);
          void removeConversation(id);
        }}
      />

      {/* AI danışman: arama çubuğundaki "AI'ye Sor" ile açılır. */}
      <AiAdvisor hideLauncher />
    </div>
  );
}
