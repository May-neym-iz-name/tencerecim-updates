# Tencerecim Mağaza Programı — Yapılanlar / Geliştirme Notları

> Son güncelleme: 2026-06-23

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
