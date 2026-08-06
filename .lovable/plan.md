# Budama (hayalet kayıt) işinin kapatılması

Kod tabanını uçtan uca okudum. Ekrandaki "Tedbirge kullanıcısı" satırının neden hâlâ görünebildiğine dair bulgular ve kalan işler aşağıda.

## Bulgular (doğrulanmış)

1. **Budama yalnızca bir kez, açılışta çalışıyor.**
   `runSelfHeal()` sadece sohbet motoru başlarken (`src/lib/chat/engine.ts:1558`) ve Eşitleme panelinden elle tetikleniyor. Uygulama açıkken gelen veri budamayı tekrar çalıştırmıyor.

2. **Eşitleme/kasa geri yükleme sonrası budama yok.**
   `src/lib/chat/history-sync.ts` ve `src/lib/chat/vault.ts` içinde `pruneGhostConversations` / `pruneCallLog` çağrısı yok. Başka bir cihazdan gelen delta paketi silinen hayalet sohbeti geri getiriyor; bir sonraki açılışa kadar listede kalıyor.

3. **`ensureDirectConversation` ad koruması taşımıyor.**
   `src/lib/chat/call-log.ts` adı çözülemeyen eş için sohbet açmıyor (doğru), ama motorun kendisi (mesh mesajı, davet, çağrı sinyali) adsız eş için doğrudan sohbet kaydı açabiliyor. Yani kaynak kapatılmamış; sadece bir yol kapatılmış.

4. **Sürüm kilidi / önbellek temizliği kodda yok.**
   `src/lib` altında sürüm damgası veya önbellek sıfırlama mantığı bulunmuyor. Telefondaki PWA eski paketi çalıştırdığı sürece eski hayalet satır ekranda kalmaya devam eder.

5. Liste filtreleri (`ChatApp.tsx` `conversations`, `CallHistory.tsx`, `safe-title.ts`) doğru yazılmış; sorun filtrede değil, **verinin geri gelmesinde ve budamanın tekrar çalışmamasında**.

## Yapılacaklar

1. **Sürekli budama**: `pruneGhostConversations` + `pruneCallLog` + `pruneGhostContacts` tek bir `sweepGhosts()` fonksiyonunda toplanacak; açılışta, sekme öne alındığında, ağ geri geldiğinde ve her eşitleme/kasa geri yüklemesi bitiminde çağrılacak (en fazla 30 sn'de bir).
2. **Kaynağı kapatma**: `ensureDirectConversation` adsız/teknik etiketli eş için kalıcı sohbet kaydı oluşturmayacak; ad öğrenilene kadar kayıt geçici tutulacak, ad gelince gerçek adıyla açılacak.
3. **Eşitleme kancası**: `history-sync` delta uygulaması ve `vault` geri yüklemesi sonrası budama zorunlu hale gelecek; içe aktarılan adsız sohbet/arama kaydı hiç yazılmayacak.
4. **Sürüm kilidi**: uygulama sürümü yerel depoda tutulacak; sürüm değişince eski sohbet listesi önbelleği ve servis çalışanı önbelleği bir kez temizlenip sayfa tazelenecek — kullanıcı elle "tam yenileme" yapmak zorunda kalmayacak.
5. **Doğrulama**: hayalet senaryoları için birim testi (adsız eşten gelen delta → liste boş kalmalı), `tsgo --noEmit` 0 hata, testler yeşil, ardından yayın.

## Teknik notlar

- Dokunulacak dosyalar: `src/lib/chat/merge.ts`, `src/lib/chat/call-log.ts`, `src/lib/chat/engine.ts`, `src/lib/chat/history-sync.ts`, `src/lib/chat/vault.ts`, `src/lib/pwa.ts`, `src/components/chat/ChatApp.tsx`.
- Mevcut filtre mantığı korunacak; yalnızca veri katmanı ve tetikleyiciler değişecek.
- Sürüm kilidi yalnızca önbellek/liste temizliği yapar; mesajlar, rehber ve kimlik silinmez.
