# Tencerecim Mağaza Programı — Yapılanlar / Geliştirme Notları

> Son güncelleme: 2026-06-23

---

## Sayfalama (tüm sekmeler) + Online Sipariş Tarih Filtresi (v1.2.35)

- **Ortak sayfalama**: `src/hooks/useSayfalama.js` (istemci tarafı dilimleme) + `src/components/Sayfalama.jsx` (sayfa başına adet seçimi 25/50/100/250, aralık bilgisi, sayfa gezinme). Tüm liste sekmelerine eklendi: Ürünler, Stok (her mağaza kendi içinde), Müşteriler, Kargo, Online Siparişler. Satış Geçmişi mevcut sunucu sayfalamasına sayfa-boyutu seçimi eklendi (ortak bileşene geçirildi).
- **Online Sipariş tarih filtresi**: başlangıç/bitiş gün filtresi (sipariş tarihine göre, istemci tarafı). "Siparişleri Çek" artık tümünü çekiyor (`boyut:0`), filtre+sayfalama istemcide.
- Backend: `online-siparis:listele` ve `musteriler:listele` `boyut<=0` → limitsiz (tümünü döndür) desteği eklendi.

---

## İptal Et — refund'a otomatik düşme (v1.2.34)

ikas'ta sadece `cancelOrderLine`, `refundOrderLine`, `cancelFulfillment` var. Bazı sipariş durumlarında `cancelOrderLine` reddediliyor ama `refundOrderLine` çalışıyor (kullanıcı: ödenmemiş siparişte iade oldu, iptal olmadı).
- "İptal Et" artık önce `cancelOrderLine` deniyor; ikas reddederse otomatik `refundOrderLine`'a düşüyor (restock korunur). Böylece buton her durumda iptal+stok iadesi yapıyor.
- restock isteniyor ama stok lokasyonu yoksa refund'a düşmeden asıl cancel hatasını gösterir.

---

## İptal/İade Fiyat Uyuşmazlığı Düzeltmesi (v1.2.33)

İptal/iade ödenmemiş temiz siparişte bile çalışmıyordu. Kök neden: ikas'ta bazı siparişlerde `finalUnitPrice` **null** geliyor (gerçek fiyat `price`/`finalPrice` alanında), bu yüzden pull yereldeki `birim_fiyat`'ı **0** kaydediyordu. İptal/iade ikas'a `price: 0` gönderince ikas gerçek fiyatla (örn. 1100) uyuşmadığı için işlemi reddediyordu.
- `birimFiyatHesapla()` eklendi: `finalUnitPrice ?? price ?? finalPrice/adet`. Pull + tazele bunu kullanıyor; sorgulara `price finalPrice` eklendi.
- İptal/iade artık işlemden önce **her zaman ikas'tan tazeliyor** (güncel kalem ID + doğru fiyat), böylece yereldeki eski/sıfır fiyat sorun çıkarmıyor.
- (Teşhis: canlı sipariş #6471373222 ikas'ta CREATED/WAITING ama finalUnitPrice=null, price=1100 → yerel birim_fiyat=0'dı.)

---

## Tek Buton "Siparişleri Çek" — İlk Seferde Tüm Geçmiş (v1.2.32)

Kullanıcı isteği: tek butonla, ilk çekimde tüm geçmiş gelsin.
- Cihaza özel `gecmis_cekildi` bayrağı eklendi (`ikas_ayarlar`; ayar senkronundan hariç). Bu PC'de geçmiş hiç çekilmemişse "Siparişleri Çek" **tüm siparişleri** getirir (gt:0, stok DÜŞÜLMEZ, durumlar tazelenir), sonra bayrağı işaretler; sonraki çekimler yalnızca yeni siparişleri getirir (stok düşülür).
- Artık `ilkKurulum = !gecmis_cekildi` (önceden `!son_siparis_senk`'ti — bu yüzden bir kez senkronlamış PC eski siparişleri çekemiyordu).
- İkinci "Tüm Geçmişi Çek" butonu UI'dan kaldırıldı (sadeleştirme); backend handler bayrağı da sıfırlayacak şekilde duruyor (ileride gerekirse).

---

## Sipariş Durum Tazeleme + Geçmiş Çekme + Detay Tasarımı (v1.2.31)

- **Durum güncellenmiyor bug'ı**: `pullSiparisler` `INSERT OR IGNORE` ile mevcut siparişleri atlıyordu → ikas'ta iptal/iade edilen sipariş yerelde "CREATED" kalıyordu. Artık var olan siparişlerin **durum + ödeme durumu tazeleniyor**; iptal/iade tespit edilirse ve stok düşülmüşse **yerel stok geri ekleniyor**. Manuel "🔁 Tazele" butonu da durum/stok güncelliyor (TEK_SIPARIS_SORGU'ya `orderPaymentStatus` eklendi).
- **"⏬ Tüm Geçmişi Çek" butonu**: `son_siparis_senk` cihaza özel olduğundan, daha önce senkron yapmış PC eski siparişleri bir daha çekemiyordu. Yeni buton damgayı sıfırlayıp tüm geçmişi yeniden çeker (`ikas:siparis-gecmis-cek`; stok düşülmez, mevcutlar mükerrer eklenmez, eski durumlar tazelenir). Eski PC'lerde #... gibi kaçan siparişleri getirmek için kullanılır.
- **Detay modalı yeniden tasarlandı**: dağınık düz metin yerine sticky başlık (durum+ödeme rozetleri), 2'li bilgi kartları (müşteri/teslimat/ödeme/fatura), düzenli ürün tablosu (tfoot toplam, çıkış mağazası dropdown vurgulu), ayrı kargo kartı ve alt eylem çubuğu.

---

## ikas Sipariş İşlemleri — Şema Düzeltmeleri (v1.2.30)

v1.2.29'da hata mesajları gerçek sebebi gösterince ortaya çıkan ikas şema uyumsuzlukları giderildi:
- **Adres düzenle**: ikas `AddressInput` zorunlu `isDefault: Boolean!` istiyor → `adresTemizle()` artık `isDefault` ekliyor.
- **İade**: `OrderRefundInput` zorunlu `stockLocationId: String!` istiyor (geri yükleme lokasyonu) → kalemin seçili çıkış mağazasının ikas lokasyonu gönderiliyor (`kalemIkasLokId`). Lokasyon belirlenemezse anlaşılır hata.
- **Anlaşılır hata mesajları**: ikas'ın şifreli iş-kuralı kodları Türkçeye çevriliyor (`client.js` HATA_CEVIRI): `not_eligible_for_update/refund/cancel` → durumu açıklayan mesaj.
- NOT: `not_eligible_for_*` hataları kod değil **sipariş durumu** kaynaklı (ödeme tamamlanmamış / zaten işlenmiş sipariş). Uygun durumdaki gerçek bir siparişte test edilmeli.

---

## Online Sipariş İşlemleri Düzeltme + Stok Lokasyon Seçimi (v1.2.29)

Online Siparişler'de iptal/iade/kargola/adres hatalarının kök nedenleri giderildi:
- **Kalem ID eksik (iptal/iade)**: `ikas_kalem_id` kolonu sonradan eklendiği için eski siparişlerde NULL'dı; "Siparişleri Çek" idempotent olduğundan backfill etmiyordu. Çözüm: `tazeleSiparisKalemleri()` — tek siparişin kalemlerini ikas'tan yeniden çekip kurar (manuel lokasyon atamasını korur). İptal/iade/kargola, kalem ID yoksa **otomatik tazeler**. Ayrıca manuel "🔁 Siparişi Tazele" butonu eklendi (`ikas:siparis-tazele`).
- **HTTP 400 gizli hata**: `client.js` artık GraphQL hata gövdesini 400'de de okuyup gerçek ikas mesajını gösteriyor (önce yutuyordu).
- **fulfillOrder/updateOrderAddresses sağlamlaştırma**: null `trackingLink` gönderilmiyor; adres input'u `adresTemizle()` ile temizleniyor (boş scalar'lar atılır, geo nesneleri `{id,name}`'e indirilir).
- **Stok lokasyon seçimi**: Sipariş detayında her kalem için çıkış mağazası dropdown'ı. `online-siparis:kalem-lokasyon` lokasyonu değiştirir; sipariş stoktan düşülmüşse eski lokasyona geri ekler, yeni lokasyondan düşer + ikas'a push eder.
- NOT: Yazma işlemleri (kargola/adres) canlı test edilmedi; kalan 400 olursa artık gerçek ikas hata mesajı görünecek.

---

## Ayar Senkronu — PC'ler arası (v1.2.28)

Ayarlar artık Supabase üzerinden PC'ler arası senkronlanır (büyük veri DEĞİL).
- Supabase tablosu `uygulama_ayarlar` (anahtar-değer jsonb, ~5 satır → şişmez): `supabase/04_ayar_senk.sql` çalıştırılmalı.
- Senkronlanan: UPS ayarları, ikas kimlik+otomatik_senk (son_siparis_senk hariç — cihaza özel), mağaza gönderici adresleri, lokasyon↔ikas eşleşmesi, genel app ayarları (müşteri zorunlu vb.).
- Akış: girişte `buluttanAl()` (App.jsx) → yerel'e uygula; ayar kaydedince `bulutaYukle()` (Ayarlar.jsx) → son-yazan kazanır.
- Modüller: `electron/db/ayar-senk.js` (topla/uygula), `src/lib/ayarSenk.js` (Supabase ↔ yerel).
- NOT: Ürün/satış/stok/sipariş/kargo KAYITLARI senkronlanmaz (Supabase'i şişirmemek için); bunlar hâlâ PC-yerel.

---

## ikas Sipariş İşlemleri + Ayarlar Sekmeli + Kargo Filtre (v1.2.27)

- **ikas sipariş işlemleri** (Online Siparişler detayında):
  - **Kargolandı bildir**: `fulfillOrder` — takip no + UPS firma, müşteriye bildirim. Kargo oluşturulunca UPS takip no otomatik ikas siparişine işlenir.
  - **İptal**: `cancelOrderLine` (tüm kalemler, restock) + yerel stok geri eklenir, durum CANCELLED.
  - **İade**: `refundOrderLine` (restock + opsiyonel kargo iadesi) — para iadesi ikas/banka tarafında kontrol edilmeli.
  - **Adres düzenleme**: `updateOrderAddresses` — adres ikas'tan tazelenir (il/ilçe geo ID korunur), metin alanları düzenlenir.
  - Sipariş kalemi ikas ID'si pull'da yakalanır (`online_siparis_kalemleri.ikas_kalem_id`). Yetki: `ikas_yonet`.
- **Ayarlar sekmeli**: Mağazalar / Satış / Kargo-UPS / ikas sekmeleri (her şey alt alta değil).
- **Kargo filtreleri**: takip no, müşteri/alıcı adı, tarih aralığı (istemci tarafı).
- NOT: Sipariş yazma işlemleri canlı mağazada test edilemedi (güvenlik); gerçek bir siparişte doğrulanmalı.

---

## Online Siparişler — Kargo Entegrasyonu + Ödeme/Fatura (v1.2.24–1.2.25)

- **Ödeme bilgisi** (1.2.24): sipariş çekiminde `paymentMethods` + `orderPaymentStatus` alınır; ödeme durumu (Ödendi/Bekliyor) ve yöntemi (Havale/EFT) listede+detayda gösterilir.
- **Müşteri adres+fatura** (1.2.24): `musteriUpsert` teslimat adresi (adres/il/ilçe) ve fatura (ünvan/vergi no/vergi dairesi/TC) bilgisini ana `musteriler` kaydına yazar; mevcut müşterinin boş alanları doldurulur.
- **Kargo entegrasyonu** (1.2.25): Online Siparişler detayında "Kargo Oluştur" → `KargoFormu` siparişten ön-doldurulur (alıcı, adres, il/ilçe ad→UPS kodu `ups:il-ilce-bul` ile). `odemeTipi=2` (gönderici öder).
  - **Mağaza-bazlı gönderici**: yeni `lokasyon_gonderici` tablosu + Ayarlar'da her mağaza için ayrı çıkış adresi. `kargo:olustur` `gondericiLokasyonId` ile o mağazanın adresini kullanır (UPS hesabı ortak). Modül: `electron/db/lokasyon-gonderici.js`.
  - `kargolar.online_siparis_id` ile kargo-sipariş bağlantısı; takip no listede ve detayda görünür.
- Node 16 (Electron 22) fetch düzeltmesi: `electron/ikas/client.js` `https` modülü kullanır (1.2.23).

---

## ikas — Online Siparişler + Müşteri + Lokasyon-bazlı Stok (v1.2.22)

1.2.21'in genişletilmiş hali — gerçek beklentiyi karşılar:
- **Online Siparişler ekranı**: yeni `online_siparisler`/`online_siparis_kalemleri` tabloları + `src/pages/OnlineSiparisler.jsx` sekmesi (sipariş no, tarih, müşteri, teslimat, durum, tutar, detay modalı). Yetki: `online_siparis_goruntule` (personel dahil).
- **Müşteri saklama**: sipariş müşterisi telefon/e-posta ile eşleştirilip ana `musteriler` listesine eklenir (`musteriUpsert`).
- **Lokasyon-bazlı stok**: online sipariş, ikas'ta hangi mağazadan düştüyse (`orderLineItem.stockLocationId`) yerel olarak da o mağazadan düşülür. Tek-lokasyon ayarı kaldırıldı. İki mağaza da otomatik eşitlenir.
- **Geçmiş**: yalnızca web sitesi siparişleri (`salesChannel.type===1`). İlk senkronda tüm geçmiş kaydedilir ama **stok düşülmez** (sadece görüntüleme); sonraki yeni siparişler stoktan düşer. `online_siparisler.ikas_siparis_id UNIQUE` ile idempotent.
- DB modülü: `electron/db/online-siparisler.js` (listele/getir).

---

## ikas E-Ticaret Entegrasyonu (v1.2.21)

İki yönlü stok senkronu, ikas Admin GraphQL API (OAuth client-credentials).

- **Kimlik/ayarlar**: `electron/db/ikas-ayarlar.js` (`ikas_ayarlar` anahtar-değer tablosu; secret renderer'a maskeli döner). Ayarlar > "ikas E-Ticaret Entegrasyonu" bölümünden girilir; yalnızca yerel `.db`'de saklanır.
- **API istemcisi**: `electron/ikas/client.js` — token cache (4 saat) + `graphql()`. Endpoint: `https://api.myikas.com/api/v1/admin/graphql`, token: `https://{store}.myikas.com/api/admin/oauth/token`.
- **Senkron çekirdeği**: `electron/ikas/index.js`
  - **Eşleştirme yok**: ürünler Excel içe-aktarımda `ikas_urun_id`/`ikas_varyant_id` ile zaten dolu; birleştirme anahtarı `ikas_varyant_id`. Lokasyonlar ada göre otomatik eşlenir (`ikas:test`/`ikas:lokasyon-esle`).
  - **Push (yerel→ikas)**: `saveProductStockLocations` mutation; satış/iptal/stok düzenleme/sayım sonrası arka planda (`_pushArkaPlan`, otomatik_senk açıksa). Yerel stok mutlak kaynaktır.
  - **Pull (ikas→yerel)**: `listOrder(orderedAt:{gt:Timestamp})` polling; açılıştan 10 sn sonra + her 5 dk (`main.js`). Yeni siparişler `online_lokasyon_id`'den düşülür, `ikas_islenen_siparisler` ile idempotent. İlk kurulumda geçmiş işlenmez (başlangıç=şimdi). CANCELLED siparişler atlanır.
- **Yetki**: `ikas_yonet` (Supabase `yetki_kodlari`'na eklendi — `supabase/01_auth_rbac.sql` yeniden çalıştırılmalı).
- **Not**: ikas Excel'inde barkod/SKU neredeyse boş (3/360) — bu yüzden barkod eşleştirme yerine `ikas_varyant_id` kullanılır.

---

Bu dosya, programda şu ana kadar yapılan her şeyin kaydıdır. Yeni bir geliştirme yapıldığında buraya eklenmelidir.

---

## 1. Proje Nedir?

Tencerecim için **Windows masaüstü mağaza yönetim programı**.

- **İşletme**: 1 e-ticaret sitesi (ikas) + 2 fiziksel mağaza
- **Amaç**: Stok takibi, satış fişi, müşteri yönetimi, stok sayımı, fiyat/barkod etiket basımı (ileride)

---

## 2. Teknik Yapı

| Konu | Seçim |
|------|-------|
| Uygulama tipi | Electron 22.3.27 masaüstü uygulaması (Windows 7+) |
| Arayüz | React 18 + Tailwind CSS + React Router (HashRouter) |
| Bundler | Vite 5 |
| Veritabanı | SQLite (better-sqlite3) — `userData/tencerecim.db` |
| Kurulum dosyası | NSIS installer (x64 + ia32) → `dist-electron/` |
| Güncelleme | electron-updater + GitHub Releases |
| Arayüz dili | Türkçe |

### Proje yapısı
```
tencerecim-mağaza-programı/
├── electron/
│   ├── main.js          # Ana süreç + IPC + auto-updater
│   ├── preload.js       # contextBridge
│   └── db/              # SQLite modülleri
│       ├── database.js, urunler.js, musteriler.js, satislar.js,
│       ├── stok.js, lokasyonlar.js, markalar.js, tedarikciler.js,
│       └── kategoriler.js, excel-import.js
├── src/                 # React frontend (Satis, Urunler, Stok,
│                        #   StokSayim, Musteriler, Ayarlar, SatisGecmisi)
├── build/icon.ico
├── package.json         # electron-builder + publish config
└── YAPILANLAR.md        # bu dosya
```

---

## 3. GitHub Otomatik Güncelleme Sistemi (KURULDU — 2026-06-20)

### Repo
- **Adres**: https://github.com/May-neym-iz-name/tencerecim-updates (public)
- `package.json` → `build.publish`: provider=github, owner=May-neym-iz-name, repo=tencerecim-updates

### Önemli ayar: `artifactName`
`package.json` → `build.artifactName`: `tencerecim-setup-${version}.${ext}`

**Neden zorunlu:** Bu ayar olmazsa electron-builder boşluklu/Türkçe karakterli dosya adı
üretir ("Tencerecim Mağaza Setup.exe"), GitHub bunu noktalı bir ada çevirir
("Tencerecim.Magaza.Setup.exe") ama `latest.yml` farklı bir ad arar → **auto-update sessizce bozulur.**
Temiz ASCII ad ile dosya adı, `latest.yml` ve GitHub asset adı hep aynı olur.

### Auto-updater kodu (`electron/main.js`)
- Uygulama açıldıktan 3 saniye sonra GitHub'ı kontrol eder
- Yeni sürüm varsa arka planda indirir
- İndirme bitince **"Şimdi Güncelle / Sonra"** diyaloğu gösterir
- "Şimdi Güncelle" → yeniden başlar ve günceller

### Token
- `gh auth` ile giriş yapılı (May-neym-iz-name, repo yetkisi var)
- Build/release için ekstra token gerekmez

### İlk release
- **v1.0.0** yayında → `tencerecim-setup-1.0.0.exe` (143 MB) + `latest.yml` + `.blockmap`

---

## 4. Yeni Sürüm Nasıl Yayınlanır? (3 adım)

1. `package.json` içinde `version`'ı artır (örn `1.0.0` → `1.0.1`)
2. Terminalde: `npm run build`
3. Terminalde:
   ```
   gh release create v1.0.1 ^
     dist-electron/tencerecim-setup-1.0.1.exe ^
     dist-electron/tencerecim-setup-1.0.1.exe.blockmap ^
     dist-electron/latest.yml ^
     --repo May-neym-iz-name/tencerecim-updates ^
     --title "v1.0.1" --notes "Değişiklik notu"
   ```

Sonuç: Kurulu tüm bilgisayarlar bir sonraki açılışta otomatik güncellenir.

---

## 5. Geliştirme Fazları (yönetici planı)

- [x] **Faz 1 — Sağlamlaştırma:** Satış hesaplaması saf modüle çıkarıldı
  (`electron/db/satis-hesapla.js`), fiş no çakışma bug'ı giderildi (artık sıralı:
  F202606210001...), vitest + 11 test eklendi (`npm test`).
- [x] **Faz 2 — Satış fişi yazdırma:** `electron/fis-yazdir.js`. Satış sonrası
  otomatik yazdırır + Satış Geçmişi'nden yeniden yazdırma. 80mm termal ve A4 uyumlu.
- [~] **Faz 3 — Kimlik doğrulama + yetkilendirme + senkron:**
  - [x] Supabase bağlantısı (`src/lib/supabase.js`), giriş ekranı (`Giris.jsx`)
  - [x] "Beni hatırla" — e-posta+şifre OS-şifreli saklanır (`electron/auth.js`, safeStorage)
  - [x] Rol/yetki sistemi (`src/auth/`): süper yönetici / yönetici / personel / özel + lokasyon kısıtı + 17 granüler yetki
  - [x] Yetkiye göre menü gizleme, çıkış (`App.jsx`)
  - [x] Kullanıcı/yetki yönetim ekranı (`Kullanicilar.jsx`) — süper yönetici ayarlar
  - [x] Supabase şeması: `supabase/01_auth_rbac.sql` (profiles, yetki_kodlari, RLS, trigger)
  - [ ] Sayfa içi lokasyon filtreleme (örn. Gölcük kullanıcısı sadece Gölcük'ü seçebilsin)
  - [ ] Veri senkronu (ürün/stok/müşteri/satış) — `supabase/02_*.sql` + senkron motoru
  - Mimari: yerel-öncelikli + olay-tabanlı senkron (sürekli polling YOK)
  - Süper yönetici: info@resiftencerecim.com | Hesaplar Supabase panelinden açılır, yetkiler uygulamadan
- [ ] **Faz 4 — ikas e-ticaret entegrasyonu:** ikas API anahtarı gerekiyor.
- [ ] Fiyat / barkod etiket yazıcısı (yazıcı alınınca)
- [ ] `frontend/` ölü kopya klasörü silinecek (güvenlik filtresi engelledi, kullanıcı onayı bekliyor)

---

## 6. ECC Geliştirici Araçları

`affaan-m/ecc` reposundaki skill ve geliştirici notları bu klasördeki `ecc-kaynak/`
altına klonlandı (referans/okuma için). ECC skill, agent ve kuralları ayrıca
`~/.claude/` altında global olarak kuruludur, yani tüm projelerde aktiftir.
