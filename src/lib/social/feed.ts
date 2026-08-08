/**
 * SUNUCUSUZ SOSYAL AKIŞ (Topluluk Akışı)
 * ------------------------------------------------------------------
 * Gönderiler hiçbir buluta gitmez: cihazda saklanır ve çekirdek
 * üzerinden yakındaki doğrulanmış düğümlere yayılır. Röle kapalıysa
 * yalnız doğrudan komşulara ulaşır. Gelen gönderiler yeniden
 * yayılmaz — akış fırtınası oluşmaz.
 */

import { kernel } from "@/kernel/contract";

export type FeedMedia = { name: string; mime: string; dataUrl: string };

export type FeedPost = {
  id: string;
  author: string;
  authorName: string;
  text: string;
  media?: FeedMedia;
  ts: number;
  /** Bu cihazda mı üretildi? */
  mine: boolean;
};

const KEY = "tedbirge.feed.posts";
const MAX_POSTS = 200;
export const MAX_FEED_MEDIA_BYTES = 320 * 1024;

let posts: FeedPost[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(posts.slice(0, MAX_POSTS)));
  } catch {
    /* özel mod / kota */
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    posts = raw ? (JSON.parse(raw) as FeedPost[]) : [];
  } catch {
    posts = [];
  }
}

function emit() {
  persist();
  for (const fn of listeners) fn();
}

export function listPosts(): FeedPost[] {
  load();
  return [...posts].sort((a, b) => b.ts - a.ts);
}

export function onFeedChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function add(p: FeedPost) {
  load();
  if (posts.some((x) => x.id === p.id)) return;
  posts = [p, ...posts].slice(0, MAX_POSTS);
  emit();
}

export function deletePost(id: string) {
  load();
  posts = posts.filter((p) => p.id !== id);
  emit();
}

/** Yeni gönderi: önce cihazda saklanır, sonra ağa yayılır. */
export async function publishPost(input: {
  text: string;
  authorName: string;
  media?: FeedMedia;
}): Promise<FeedPost> {
  const k = kernel();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const post: FeedPost = {
    id,
    author: k.identity().personId,
    authorName: input.authorName || "Siz",
    text: input.text.trim(),
    ...(input.media ? { media: input.media } : {}),
    ts: Date.now(),
    mine: true,
  };
  add(post);
  try {
    await k.send("app", "*", { kind: "feed.post", post: { ...post, mine: false } });
  } catch {
    /* çevrimdışı — gönderi cihazda kalır, ağ dönünce elle paylaşılabilir */
  }
  return post;
}

let booted = false;

/** Gelen gönderileri dinlemeye başlar (fikirdaş / idempotent). */
export function bootFeed() {
  if (booted || typeof window === "undefined") return;
  let k: ReturnType<typeof kernel>;
  try {
    k = kernel();
  } catch {
    window.setTimeout(bootFeed, 500);
    return;
  }
  booted = true;
  load();
  k.subscribe("app", (from, body) => {
    const b = body as { kind?: string; post?: FeedPost } | null;
    if (!b || b.kind !== "feed.post" || !b.post || typeof b.post.id !== "string") return;
    const p = b.post;
    if (typeof p.text !== "string" || p.text.length > 5000) return;
    if (p.media && (typeof p.media.dataUrl !== "string" || p.media.dataUrl.length > 700_000)) return;
    add({
      id: p.id,
      author: typeof p.author === "string" ? p.author : from,
      authorName: typeof p.authorName === "string" ? p.authorName.slice(0, 60) : "Bilinmeyen düğüm",
      text: p.text,
      ...(p.media ? { media: p.media } : {}),
      ts: typeof p.ts === "number" ? p.ts : Date.now(),
      mine: false,
    });
  });
}
