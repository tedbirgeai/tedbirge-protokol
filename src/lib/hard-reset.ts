/**
 * Tek seferlik yerel depo sıfırlama.
 *
 * Eski sürümlerden kalan mükerrer kişi/konuşma kayıtlarını ve hafıza
 * birikintilerini kullanıcı siteye girdiği an temizler, ardından sayfayı
 * tertemiz bir veritabanıyla yeniden yükler. Bayrak localStorage'a yazılır,
 * bu yüzden yalnızca bir kez çalışır.
 */
const PURGE_FLAG = "v2_db_purged_final";

export function runOneTimePurge(): boolean {
  if (typeof window === "undefined") return false;

  let done = true;
  try {
    done = window.localStorage.getItem(PURGE_FLAG) === "true";
  } catch {
    return false;
  }
  if (done) return false;

  const finish = () => {
    try {
      window.localStorage.clear();
      window.localStorage.setItem(PURGE_FLAG, "true");
    } catch {
      /* depo kullanılamıyorsa sessizce geç */
    }
    window.location.reload();
  };

  try {
    window.sessionStorage.clear();
  } catch {
    /* yok say */
  }

  const idb = window.indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };

  if (typeof idb?.databases === "function") {
    idb
      .databases()
      .then((dbs) => {
        for (const db of dbs) {
          if (db?.name) window.indexedDB.deleteDatabase(db.name);
        }
      })
      .catch(() => undefined)
      .finally(finish);
  } else {
    // databases() desteklemeyen tarayıcılar için bilinen depoları sil.
    for (const name of ["tedbirge", "tedbirge-mesh", "tedbirge-chat", "keyval-store"]) {
      try {
        window.indexedDB.deleteDatabase(name);
      } catch {
        /* yok say */
      }
    }
    finish();
  }

  return true;
}
