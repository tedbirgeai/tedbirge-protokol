/**
 * Tek seferlik yerel depo sıfırlama.
 *
 * Eski sürümlerden kalan mükerrer kişi/konuşma kayıtlarını ve hafıza
 * birikintilerini kullanıcı siteye girdiği an temizler, ardından sayfayı
 * tertemiz bir veritabanıyla yeniden yükler.
 *
 * Kritik: bayrak silme işleminden ÖNCE yazılır. Aksi halde silme isteği
 * açık bir bağlantı yüzünden bloke olursa sayfa hiç yenilenmez, veritabanı
 * "kapanıyor" durumunda kilitlenir ve tüm yerel yazmalar sessizce başarısız
 * olur (mesajlar kaybolur, rehber boş görünür).
 */
const PURGE_FLAG = "v2_db_purged_final";
const KNOWN_DBS = ["tedbirge", "tedbirge-mesh", "tedbirge-chat", "keyval-store"];

function dropDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      const req = window.indexedDB.deleteDatabase(name);
      req.onsuccess = done;
      req.onerror = done;
      // Başka sekme/bağlantı tutuyorsa sonsuza kadar bekleme.
      req.onblocked = done;
    } catch {
      done();
    }
    window.setTimeout(done, 3000);
  });
}

export function runOneTimePurge(): boolean {
  if (typeof window === "undefined") return false;

  let done = true;
  try {
    done = window.localStorage.getItem(PURGE_FLAG) === "true";
  } catch {
    return false;
  }
  if (done) return false;

  // Bayrağı ve temizliği önce uygula: yenileme yapılamasa bile bu kod
  // bir daha çalışmaz, böylece veritabanı ikinci kez silinmeye çalışılmaz.
  try {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.localStorage.setItem(PURGE_FLAG, "true");
  } catch {
    /* depo kullanılamıyorsa sessizce geç */
  }

  const idb = window.indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };

  const names =
    typeof idb?.databases === "function"
      ? idb
          .databases()
          .then((dbs) => dbs.map((d) => d?.name).filter((n): n is string => !!n))
          .catch(() => KNOWN_DBS)
      : Promise.resolve(KNOWN_DBS);

  void names
    .then((list) => Promise.all(list.map(dropDatabase)))
    .catch(() => undefined)
    .finally(() => {
      window.location.reload();
    });

  return true;
}
