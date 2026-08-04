/**
 * ÖNİZLEME REHBERİ (fallback)
 * ------------------------------------------------------------------
 * Cihaz rehberi okunamadığında (masaüstü tarayıcı, önizleme ortamı)
 * sohbet listesi boş kalmasın diye kullanılan örnek kişiler.
 * Yalnızca bu cihazda tutulur, ağa gönderilmez.
 */

export type DemoContact = { id: string; name: string; phone: string; note: string };

export const DEMO_CONTACTS: DemoContact[] = [
  { id: "demo_self", name: "Mehmet Dinç (Siz)", phone: "+905412031609", note: "Kendinize mesaj gönderin" },
  { id: "demo_hasan", name: "Hasan Otay", phone: "+905321112233", note: "Rehberinizden eşleşti" },
  { id: "demo_sennur", name: "Şennur Dinç", phone: "+905331112233", note: "Rehberinizden eşleşti" },
  { id: "demo_ekin", name: "Ekin Dinç", phone: "+905351112233", note: "Rehberinizden eşleşti" },
  { id: "demo_emine", name: "Emine Kardeşim", phone: "+905361112233", note: "Rehberinizden eşleşti" },
];
