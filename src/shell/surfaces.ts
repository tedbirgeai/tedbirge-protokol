/**
 * KABUK YÜZEYLERİ (Surfaces)
 * ------------------------------------------------------------------
 * Faz A: modallar/sayfa üstü paneller artık tek tek `useState` ile
 * değil, kabuğun yüzey yığını üzerinden açılır. Yığın olduğu için
 * birden fazla yüzey aynı anda açık kalabilir — davranış öncekiyle
 * birebir aynıdır, yalnız sahiplik kabuğa geçmiştir.
 */

export type SurfaceId =
  | "contacts"
  | "search"
  | "profile"
  | "qr"
  | "settings"
  | "newContact"
  | "newChat"
  | "newCall"
  | "dialpad"
  | "schedule"
  | "callLink"
  | "emergency"
  | "gallery"
  /** Faz C: .tbapp uygulama yöneticisi, röle ayarı, ağ durumu. */
  | "apps"
  | "relay"
  | "meshStatus";

export type SurfaceApi = {
  /** Açık yüzeylerin yığını (en son açılan sonda). */
  stack: SurfaceId[];
  isOpen: (id: SurfaceId) => boolean;
  open: (id: SurfaceId) => void;
  close: (id: SurfaceId) => void;
  /** `setXOpen(boolean)` çağrılarının doğrudan karşılığı. */
  set: (id: SurfaceId, value: boolean) => void;
  closeAll: () => void;
};
