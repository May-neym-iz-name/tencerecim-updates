# Stok Sayımı Yeniden Tasarımı — 2026-08-11

Onaylanan tasarım (Yaklaşım B): Sayım, Stok Durumu'ndan ayrı sekmeye taşınır;
hareket-farkındalıklı tamamlama + fark kontrol ekranı + üç sayım modu.

## Kullanıcı kararları
- Hem parça parça hem tam sayım desteklenecek.
- Sayım sırasında satış DEVAM EDER → tamamlama fark (delta) uygular, mutlak yazmaz.
- Beklenen miktar sayım sırasında GÖRÜNÜR (kör sayım istenmedi).
- Tamamla → önce FARK RAPORU ekranı (yalnız farklı kalemler, büyük fark vurgusu,
  satır başına "yeniden say"), sonra "Stoklara İşle".
- Sayılmayan kalemler DOKUNULMAZ ve raporda açıkça belirtilir.
- Parça sayım: hem serbest okutma (Hızlı) hem marka/kategori seçimli (Kapsamlı).

## Ekran yapısı
`Stok` sayfası iki alt sekme: **📋 Stok Durumu** (mevcut tablo aynen) ve **🔢 Sayım**.
Sayım sekmesi: aktif sayım yoksa mod kartları (Hızlı / Kapsamlı / Tam, mağaza seçimiyle)
+ geçmiş sayımlar listesi (tıklayınca fark raporu). Aktif sayım varsa sayım ekranı.

## Modlar
- **Hızlı:** boş liste; okutulan/aranan ürün `sayim:kalem-ekle` ile eklenir (beklenen =
  o anki stok), +1 sayılır. Kapsam = yalnız listeye girenler.
- **Kapsamlı:** marka ve/veya kategori seçilir; yalnız o kalemler yüklenir.
- **Tam:** mağazadaki tüm aktif ürünler (mevcut davranış).

## Hareket-farkındalıklı tamamlama (kritik)
Kalemin `beklenen_miktar`ı kaleme eklendiği ANIN stoğudur. Tamamlarken:
`miktar = max(0, miktar + (sayilan - beklenen))` — mutlak yazım YOK. Sayım sürerken
düşen satış/sipariş korunur. 0'a kırpılanlar sayılıp kullanıcıya bildirilir.

## Fark kontrol ekranı
Tamamla → panel: yalnız farklı kalemler |fark| azalan sırada; büyük fark (|fark|≥3 veya
beklenenin ≥%50'si) kırmızı vurgulu; satır başına "Yeniden say" (`sayim:kalem-sifirla`);
özet: "X sayıldı, Y fark, Z kalem dokunulmayacak". "Stoklara İşle" → `sayim:tamamla`.

## Veri / API
- `stok_sayimlar` + `tip` ('hizli'|'kapsamli'|'tam', DEFAULT 'tam') ve `kapsam` (JSON metni)
  kolonları (migrate try/catch ALTER kalıbı). Sayımlar YEREL kalır — senk-sema'ya EKLENMEZ.
- Yeni IPC: `sayim:kalem-ekle`, `sayim:kalem-sifirla`, `sayim:listele`, `sayim:iptal`
  (iptal artık DB'de `durum='iptal'` işaretler; eskiden öksüz 'devam_ediyor' kalıyordu).
- `sayim:tamamla` delta uygular; ikas push korunur.
- Sayım çekirdeği `electron/db/stok-sayim.js`'e ayrılır (db enjekte edilebilir → test).

## Test
`electron/db/stok-sayim.test.js` (node:sqlite adaptörü, urunler.test.js kalıbı):
delta uygulama, satış-sırasında-sayım senaryosu, 0 kırpma, hızlı mod kalem ekleme,
kalem sıfırlama, iptal, sayılmayanların korunması.
