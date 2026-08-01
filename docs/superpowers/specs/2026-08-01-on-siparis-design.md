# Ön Sipariş — Tasarım Dokümanı

Tarih: 2026-08-01
Durum: onaylandı, uygulama planı bekliyor
Kapsam notu: **geçici özellik.** Kalıcı hale gelirse Bölüm 8'deki maddeler yeniden değerlendirilir.

## 1. Problem

Müşteri mağazada bulunmayan bir ürünü sipariş ediyor ve **ödemenin tamamını** peşin veriyor
(nakit / havale / kart). Ürün tedarikçiden gelince müşteriye kargolanıyor.

Bugün bu işlem normal satış olarak giriliyor; satış stoğu düşürdüğü için olmayan stok eksiye
doğru itiliyor ve ikas'a yanlış stok push ediliyor. İhtiyaç: **stok düşürmeyen satış.**

## 2. Kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Ciro/kasa ne zaman işlensin | **Ödeme alınınca** | Para fiilen kasaya giriyor; gün sonu kasa sayımı tutmalı |
| Stok ne zaman düşsün | **Hiç düşmesin** | Ürün zaten stokta yok |
| Mal kabul entegrasyonu | **Kapsam dışı** | Geçici özellik; sonra değerlendirilecek |
| Takip | Ayrı liste + kargo oluşturma | Kullanıcı isteği |
| İade | **Kapsam dışı** (İptal kullanılacak) | İade akışı stok artırıyor |

## 3. Veri modeli

`satislar` tablosuna `migrate()` içinde üç idempotent ALTER
(`electron/db/database.js`, satır ~500 bloğunun devamı):

```sql
ALTER TABLE satislar ADD COLUMN on_siparis INTEGER DEFAULT 0
ALTER TABLE satislar ADD COLUMN on_siparis_durum TEXT
ALTER TABLE satislar ADD COLUMN on_siparis_not TEXT
```

`on_siparis_durum` değerleri: `'bekliyor'` → `'kargolandi'` → `'teslim'`, ayrıca `'iptal'`.

### Neden yeni tablo değil, neden `tip` kolonu değil

Ön sipariş **her yönüyle normal bir satıştır**; tek farkı stok kolunun atlanması. Bu yüzden
ayrı tablo gereksiz karmaşıklık olurdu (fiş, KDV, iskonto, parçalı ödeme, müşteri bağlama
mantığının tamamı ikizlenirdi).

Mevcut `satislar.tip` kolonuna (`'satis'` / `'iade'`) yeni bir değer eklemek de yanlış olur:

- `SatisGecmisi.jsx:182` rozet mantığı `s.tip==='iade' ? 'iade' : s.durum` — yeni tip rozeti bozar
- `satislar.js:148` iade kaynak doğrulaması `COALESCE(tip,'satis')='satis'` istiyor
- `satislar.js:185`, iade/iptal akışları `tip` üzerinden dallanıyor

Ayrı bayrak kolonu bunların hiçbirine dokunmaz. Ciro sorguları (`panel.js:13-20`,
`raporlar.js:41-53`) `COALESCE(tip,'satis')!='iade'` kullandığı için ön sipariş **kendiliğinden
ciroya dahil olur** — istenen davranış budur.

Özelliği geri almak gerekirse: satış ekranındaki kutucuk gizlenir, kolonlar zararsız durur.

## 4. Satış akışı

### 4.1 `src/pages/Satis.jsx`

- Sepet alanına **"Ön Sipariş (stok düşülmez)"** kutucuğu + yanına serbest not girişi
- Kutucuk yalnızca `on_siparis_yap` yetkisi olan kullanıcıya görünür
- İşaretliyken stok yetersiz uyarısı gösterilmez
- `satisOlustur` (satır 263) payload'ına `onSiparis: 1` ve `onSiparisNot` eklenir
- Satış tamamlanınca kutucuk sıfırlanır (kalıcı state değil — yanlışlıkla açık kalmamalı)

### 4.2 `electron/db/satislar.js` → `satislar:olustur`

`veri.onSiparis` doğruysa üç noktada dallanma:

| Satır | Normal satış | Ön sipariş |
|---|---|---|
| 48-53 | stok yeterlilik kontrolü | atlanır |
| 85-86 | `UPDATE urun_stoklar SET miktar=MAX(0,miktar-?)` | atlanır |
| 98 | `ikasPush(urunIdler)` | atlanır |
| 77 civarı INSERT | — | `on_siparis=1, on_siparis_durum='bekliyor', on_siparis_not` |

`satis_kalemleri` kaydı normal satıştaki gibi yazılır (85-86 dışındaki her şey aynı transaction).

### 4.3 İptal — kritik

`satislar:iptal` (`satislar.js:219`) iptal edilen satışın stoğunu **geri ekler**. Ön siparişte
stok hiç düşülmediği için bu, olmayan stoğu şişirir ve ikas'a yanlış stok push eder.

Bu yüzden `satislar:iptal` içinde de aynı koşul: `on_siparis=1` ise stok geri ekleme ve
`ikasPush` atlanır, yalnızca `durum='iptal'` yazılır ve `on_siparis_durum='iptal'` olur.

**Bu özelliğin en sinsi hata noktasıdır; testte açıkça doğrulanacak.**

### 4.4 İade — kapsam dışı

`satislar:iade` stok artırıyor (`satislar.js:171,179`) ve kaynak satışta `tip='satis'` şartı arıyor
(`satislar.js:148`). Ön sipariş satışları bu akışa **girmez** — `SatisGecmisi.jsx:185`'teki iade
butonu `on_siparis=1` satırlarda gizlenir. Para iadesi gerekirse İptal yolu kullanılır.

## 5. Yetki

Yeni yetki kodu: **`on_siparis_yap`** — "Ön sipariş alma (stok düşmeden satış)".

Bu akış stok kontrolünü bilerek atladığı için `satis_yap` ile birlikte verilmez; ayrı yetkidir.
Yoksa her personel stok güvenilirliğini sessizce bozabilir.

Dört nokta (proje kuralı):

1. `src/auth/izinler.js` — `PERSONEL_VARSAYILAN` listesine **eklenmez** (varsayılan kapalı)
2. `electron/yetki.js` — aynı liste, birebir kopya
3. `supabase/09_on_siparis_yetki.sql` — `yetki_kodlari`'na insert (`08_sosyal_yetkiler.sql` kalıbı)
4. `src/auth/yetki-paritesi.test.js:31-41` — `TUM_KODLAR` dizisine eklenir

Backend kontrolü: `satislar:olustur` içinde `veri.onSiparis` varsa `yetkiKontrol('on_siparis_yap')`.
Yeni IPC uçları da (`satislar:on-siparisler`, `satislar:on-siparis-durum`) bu yetkiyi ister.

## 6. Ön Siparişler sekmesi

`src/pages/OnlineSiparisler.jsx` bugün 934 satırlık, **sekmesiz** tek liste sayfası. Projede
hazır `src/components/Sekmeler.jsx` var ve `src/pages/SatisFinans.jsx:13-18` kalıbıyla
kullanılıyor.

### Yapı

- İnce bir sarmalayıcı sayfa `Sekmeler` ile iki sekme sunar:
  - **Online Siparişler** — mevcut `OnlineSiparisler.jsx` içeriği, tek satırı değişmeden
  - **Ön Siparişler** — yeni `src/pages/OnSiparisler.jsx`
- Sarmalayıcı, mevcut dosyanın büyüklüğünü artırmaz; yeni sayfa ayrı dosyada kalır

### Yeni IPC uçları — `electron/db/satislar.js`

| Kanal | İş |
|---|---|
| `satislar:on-siparisler` | `WHERE on_siparis=1`; kalemler + `kargolar.satis_id` üzerinden takip no ve kargo durumu JOIN'lenir; durum filtresi parametresi alır |
| `satislar:on-siparis-durum` | `on_siparis_durum` günceller (`kargolandi` / `teslim`) |

### `src/pages/OnSiparisler.jsx`

Sütunlar: fiş no · tarih · müşteri · tutar · ödeme tipi · durum rozeti · not · takip no

Filtre: durum (`bekliyor` / `kargolandi` / `teslim` / `iptal` / hepsi) + tarih aralığı.
Varsayılan görünüm **bekleyenler**.

Aksiyonlar:

- **Kargo Oluştur** — mevcut `src/components/KargoFormu.jsx` açılır, `satisId` ile bağlanır
  (`Satis.jsx:753-766` çağrısının aynısı). Müşterinin il/ilçesi `lokasyonGondericiApi.ilIlceBul`
  ile UPS koduna çevrilip ön doldurulur (`OnlineSiparisler.jsx:187-211` kalıbı).
  `onTamam` → `on_siparis_durum='kargolandi'`
- **Teslim Edildi** — `on_siparis_durum='teslim'`
- **İptal** — mevcut `satislar:iptal` (4.3'teki korumayla)

Kargo kaydı `kargolar.satis_id` ile bağlanır; `online_siparis_id` ve `ikas_siparis_id` NULL kalır
(`electron/ups/kargo.js:184-190`). Bu, satış ekranından oluşturulan kargolarla aynı davranıştır.

## 7. Dokunulmayacaklar

Aşağıdaki dosyalar **hiç değişmez** — ön sipariş bilinçli olarak normal satış gibi davranır:

- `electron/db/panel.js` (Dashboard cirosu)
- `electron/db/raporlar.js` (7 rapor, `magazaDurumKosulu:41-53`)
- `electron/db/kasa.js` (nakit özeti)
- `electron/fis-yazdir.js`

`src/pages/SatisGecmisi.jsx`'e yalnızca **"Ön Sipariş" rozeti** eklenir ve `on_siparis=1`
satırlarda iade butonu gizlenir (4.4).

## 8. Kapsam dışı — sonra değerlendirilecek

- **Mal kabul zinciri**: ürün gelince stoğa giriş → teslimde düşüm. Kullanıcı "şu an gerek yok,
  değerlendirmeye al" dedi. Kalıcı özelliğe dönerse ilk buraya bakılmalı.
- **Çok-PC senkron**: `electron/db/senk-sema.js` güncellenmiyor → ön sipariş hangi PC'de
  alındıysa orada görünür. İki mağazada da alınacaksa kapsama girer.
- Dashboard "bekleyen ön sipariş" kartı
- Ön sipariş iadesi (para iadesi bugün İptal ile yapılır)
- Müşteriye otomatik WhatsApp bildirimi ("ürününüz geldi")

## 9. Test planı

Birim/entegrasyon (mevcut vitest kurulumu, `node:sqlite` enjeksiyonlu — bkz. senkron testleri):

1. Ön sipariş satışı `urun_stoklar.miktar`'ı **değiştirmez**
2. Ön sipariş satışı `ikasPush` **çağırmaz** (mock ile doğrulanır)
3. Stok 0 olan üründe ön sipariş **hata vermez**; normal satış hata verir
4. **Ön sipariş iptali stoğu artırmaz** (4.3 — en kritik test)
5. Normal satış iptali stoğu hâlâ artırır (regresyon)
6. Ön sipariş satışı günlük ciroya ve kasa nakit özetine **girer**
7. `on_siparis_yap` yetkisi olmayan kullanıcı ön sipariş oluşturamaz
8. `yetki-paritesi.test.js` geçer

Elle doğrulama: ön sipariş al → Ön Siparişler sekmesinde görünür → kargo oluştur → takip no
listede görünür ve durum `kargolandi` olur → Teslim Edildi → `teslim`.

## 10. Geri alma

Satış ekranındaki kutucuğu ve sekmeyi kaldırmak yeterli. Kolonlar ve mevcut kayıtlar zararsız
durur; hiçbir mevcut sorgu bu kolonlara bağımlı değildir.
