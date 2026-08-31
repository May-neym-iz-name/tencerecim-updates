# Fatura Entegrasyonu ve Trendyol Siparişleri — 2026-08-31

Onaylanan tasarım (Yaklaşım A): kanal-bağımsız bir fatura çekirdeği + ince kanal
adaptörleri. Trendyol siparişleri Siparişler'e ayrı sekme olarak girer; ikas ve
Trendyol siparişlerine uygulamadan fatura kesilir; fatura stoğu Stok Yönetimi'ne
yeni bir sekme olarak eklenir.

Fatura belgesi **Bizimhesap** üzerinden kesilir (kullanıcı beyanı: GİB tarafını
Bizimhesap hallediyor). Sağlayıcı adaptör arkasındadır — ileride Mikro ERP veya
bağımsız entegratöre geçilirse yalnız o dosya değişir.

## Kullanıcı kararları

1. **Fatura stoğu olmayan ürüne fatura KESİLEMEZ.** Buton kilitli, sipariş
   "fatura stoğu bekliyor" durumunda kalır. Geçiş/zorlama izni YOK.
2. **Fatura stoğu TEK HAVUZ** (şirket geneli, lokasyon bazlı değil).
3. **Setler faturaya bileşen bileşen yazılır**; set fiyatı bileşenlere dağıtılır.
4. **Trendyol sipariş yakalama hibrit**: webhook tetikler, `getShipmentPackages` çeker.
5. **Sekme bildirim rozeti her PC/kullanıcı için ayrı**; görüntülenene kadar yanar.
6. Trendyol'da işlem sırası **önce fatura, sonra kargo etiketi**.
7. Faturalı/faturasız ayrımı kullanıcı tarafından filtrelenebilir olmalı.
8. **Fatura senkronu kusursuz olmalı**: aynı siparişe iki kez fatura kesilemez ve
   fatura kesilince stok tüm PC'lerde düşer. (Bu şart ⑤'teki mimariyi belirledi.)

## Açık maddeler (karara bağlanmadı)

- **Trendyol kargo etiketi:** Trendyol siparişleri Trendyol'un anlaşmalı kargosuyla
  gider ve etiket `createCommonLabel`/`getCommonLabel` ile alınır. Mevcut
  `electron/ups/` altyapısı bu siparişlerde devrede olmaz. Kullanıcıya soruldu,
  cevap alınmadı. Uygulama öncesi netleşmeli.
- **Alış faturasının Bizimhesap'a yazılmaması** (§4) tasarımcı önerisidir; kullanıcı
  itiraz etmedi ama açıkça onaylamadı da. Tedarikçi e-faturası GİB üzerinden
  Bizimhesap'a kendiliğinden düşmüyorsa bu karar değişmeli.
- **Bizimhesap `addinvoice`'un GİB'e gönderdiği** ve dönen `url`'in kalıcı olduğu
  doğrulanmadı. 1 TL'lik deneme faturasıyla teyit edilecek.
- Trendyol'da `Created → Invoiced` doğrudan geçişi kabul ediliyor mu, yoksa
  `Picking` şart mı — dokümante edilmemiş, stage ortamında ölçülecek.

## ① Veri modeli

### Yerel (SQLite, her PC'de)

```
trendyol_siparisler
  id, paket_id TEXT UNIQUE          -- shipmentPackageId
  siparis_no, siparis_tarihi
  paket_durumu TEXT                 -- Created/Picking/Invoiced/Shipped/...
  kargo_firma, kargo_takip_no, kargo_son_tarih
  musteri_ad, musteri_il, musteri_ilce, musteri_adres
  fatura_unvan, fatura_vergi_no, fatura_vergi_dairesi, fatura_tc
  toplam
  goruldu INTEGER DEFAULT 0         -- PC bazlı rozet; SENKRON KAPSAMI DIŞINDA
  olusturma_tarihi

trendyol_siparis_kalemleri
  id, siparis_id, urun_id, barkod, urun_adi
  miktar, birim_fiyat, satir_id     -- orderLineId (bölme/iade için şart)
```

`online_siparisler` tablosuna DOKUNULMAZ. Trendyol ayrı tabloda çünkü
`ikas_siparis_id TEXT UNIQUE NOT NULL` kolonu kargo çapraz-PC bağı, senkron ve
bildirimler tarafından taşınıyor; nullable yapmak üç sistemi birden riske atar.

### Ortak (Supabase / Postgres — faturanın ASIL nüshası)

```
kesilen_faturalar
  id, kanal TEXT, kanal_siparis_id TEXT
  online_siparis_id, belge_tipi TEXT        -- 'e_arsiv' | 'e_fatura'
  belge_tipi_kaynak TEXT                    -- 'tahmin' | 'saglayici'
  saglayici TEXT DEFAULT 'bizimhesap'
  saglayici_guid, saglayici_url, fatura_no
  toplam, tarih
  durum TEXT, hata_mesaji TEXT
  UNIQUE(kanal, kanal_siparis_id)           -- MÜKERRER FATURA ENGELİ
```

`kanal` şimdilik `'ikas'` ve `'trendyol'` değerlerini alır. `'magaza'` (kasa satışı)
kolon tanımında yer tutar ama **bu fazın kapsamında değildir**.

`durum` değerleri (durum makinesi, §5):

```
kuyrukta -> saglayici_ok -> pdf_alindi -> pazaryeri_yuklendi -> tamam
                |
                +-> hata        (iş hatası; stok iade edilir)
                +-> belirsiz    (yanıt yok; stok iade EDİLMEZ, insan kontrolü)
```

ikas kanalında `pazaryeri_yuklendi` adımı yoktur; `pdf_alindi` sonrası doğrudan
`tamam` olunur.

```
kesilen_fatura_kalemleri
  id, kesilen_fatura_id, urun_id, urun_adi
  miktar, birim_fiyat, kdv_orani, satir_toplam
  set_id INTEGER                            -- bileşen hangi setten geldi

fatura_stok
  urun_id PRIMARY KEY, miktar INTEGER NOT NULL DEFAULT 0, guncelleme_tarihi

fatura_stok_hareketler
  id, urun_id, miktar INTEGER                -- + giriş, − çıkış
  kaynak_tip TEXT                            -- 'alis_faturasi'|'satis_faturasi'|'duzeltme'|'iade'|'telafi'
  kaynak_id, aciklama, kullanici, tarih

alis_faturalari
  id, tedarikci_id, fatura_no, fatura_tarihi
  ara_toplam, kdv_toplam, genel_toplam
  mal_kabul_id INTEGER NULL                  -- fiziksel girişle bağ, ZORUNLU DEĞİL
  notlar, kullanici, olusturma_tarihi
  UNIQUE(tedarikci_id, fatura_no)

alis_fatura_kalemleri
  id, alis_fatura_id, urun_id, urun_adi
  miktar, birim_fiyat, kdv_orani, satir_toplam
```

**Ruling-5 ile GÜNCELLENDİ:** Yerel SQLite'ta bu tabloların aynası TUTULMAZ —
okuma da yazma da doğrudan Supabase REST/RPC ile yapılır (bkz.
`electron/fatura/okuma.js`, `bulut.js`, `alis.js`). Sebep: senkron motoru
varlık başına tablo değil TEK `senk_kayitlar` tablosu üzerinden çalışıyor, bu
yüzden gerçek Postgres tabloları (`fatura_stok`, `alis_faturalari`, ...) pull
ile zaten yerel SQLite'a inmiyor — "salt-okunur ayna" tutmak ayrı bir
senkron/pull mekanizması gerektirirdi ki bu da §⑤'te iptal edilen tasarımdı.
Karar anında (durumBirlestir) bu yüzden zaten aynaya değil, canlı bulut
sorgusuna bakılıyor.

`mal_kabul_id`'nin nullable olması bilinçli: "mal geldi fatura gelmedi" ve "fatura
geldi mal gelmedi" durumlarının ikisi de gerçek ve ikisi de temsil edilebilmeli.

## ② Trendyol sipariş akışı ve sekme

### Yerleşim

`SiparisMerkezi.jsx`'e üçüncü sekme (`OnlineSiparisler.jsx` dosyasına dokunulmadan):

```
Siparişler
├── 🛍️ Online Siparişler (ikas)   [rozet]
├── 🟠 Trendyol                    [rozet]   ← YENİ (TrendyolSiparisler.jsx)
└── 🕐 Ön Siparişler
```

`Sekmeler.jsx`'e `rozet` alanı eklenir. Rozet = `goruldu = 0` sipariş adedi.
Satır ekranda görününce `goruldu = 1` yazılır — yalnız o PC'de.

### Veri akışı

Trendyol dokümanı hibridi resmen öneriyor ("webhook teslimi garanti değildir,
mevcut API'lerle destekleyin"). `electron/ikas/bulut.js` deseninin aynısı:

```
Trendyol --webhook--> Cloudflare Worker --> "şu paket değişti"
                                              |
                        her PC periyodik olarak okur
                                              v
                     getShipmentPackages ile çeker -> yerel DB -> rozet
                                              ^
                    emniyet yoklaması (webhook kaçarsa)
```

İlgili limitler: sipariş paketi çekme **30 istek/dk**; webhook başarısızsa Trendyol
**5 dk'da bir** yeniden dener; tek abonelik 13 statünün hepsini kapsar; webhook
adresinde "Trendyol", "Dolap", "Localhost" geçemez; azami 15 webhook.

### İşlem hattı

Her satırda o an yapılması gereken **tek birincil buton**:

| Paket durumu | Buton | Kilit |
|---|---|---|
| `Created` | 🧾 Fatura Kes | Fatura stoğu yetersizse kilitli + eksik ürünler listelenir |
| `Invoiced` | 🏷️ Kargo Etiketi Al | — |
| `Shipped` | — (takip no görünür) | — |
| `Cancelled` / `Returned` | iade akışı (sonraki faz) | — |

Filtreler: `Tümü · Fatura Bekliyor · Fatura Stoğu Yok · Kargo Bekliyor · Kargolandı`.
Varsayılan sıralama yapılacak işe ve kargo son tarihine göre.

### Fatura kesme adım zinciri

```
1. fatura_kes_basla() RPC        -> sahiplen + fatura stoğunu düş (atomik, §5)
2. Bizimhesap addinvoice          -> guid + url
3. Fatura PDF'i alınır
4. Trendyol uploadInvoiceFile     -> PDF yüklenir
5. Trendyol updatePackage: Picking
6. Trendyol updatePackage: Invoiced (+ params.invoiceNumber)
7. durum = 'tamam'
```

**`uploadInvoiceFile`, `sendInvoiceLink`'e tercih edilir.** Link göndermek, o adresi
10 yıl ayakta tutma sorumluluğunu bize yükler; PDF yüklemek saklamayı Trendyol'a
geçirir ve ileride sağlayıcı değişse bile eski faturalar kırılmaz.

5. ve 6. adım ayrı tutulur çünkü zorunlu geçiş dokümante edilmemiş; stage ortamında
doğrudan geçiş kabul ediliyorsa 5. adım atlanır.

## ③ Fatura kesme akışı

### Set çözme ve fiyat dağıtımı

Fiyatlar KDV **dahil** (`satis-hesapla.js`: `kdv = tutar × oran / (100 + oran)`).

```
pay_i    = (satis_fiyati_i × miktar_i) / Σ(satis_fiyati_j × miktar_j)
brüt_i   = yuvarla(set_fiyatı × set_adedi × pay_i)
brüt_son = set_toplamı − Σ(diğer bileşenler)      -- kuruş farkı son satıra
```

Satır matematiği için **mevcut `electron/db/satis-hesapla.js` kullanılır**, yeni
hesaplayıcı yazılmaz. Gerekçe: mağaza satışıyla fatura arasında yuvarlama farkı
doğmasın.

Ağırlıklı dağıtım zorunlu, çünkü bileşenlerin KDV oranları farklı olabilir; eşit
bölmek beyan edilen KDV'yi yanlış çıkarır.

### Fatura stoğu guard'ı

Fatura kesmeyi bloklayan üç koşul:

1. Herhangi bir bileşenin fatura stoğu yetersiz — **hangi üründen ne kadar eksik
   olduğu tek tek gösterilir**, genel "yetersiz" mesajı yeterli değil.
2. Kalemlerden birinin **SKU'su boş** (Bizimhesap mükerrer ürün açar).
3. Siparişin **fatura kimlik bilgisi eksik**.

### Belge tipi kararı

e-Fatura / e-Arşiv ayrımını **biz vermiyoruz**. GİB mükellef sorgulama servisimiz
yok (MikroAPI kapalı, Bizimhesap'ta böyle bir uç nokta yok). Eksiksiz vergi kimliği
gönderilir (kurumsalda `taxNo` + `taxOffice`, bireyselde TCKN); Bizimhesap doğru
belge tipini seçer.

⚠️ `addinvoice` yanıtı yalnız `{error, guid, url}` döndürüyor — **belge tipini
bildirmiyor**. Bu yüzden `kesilen_faturalar.belge_tipi` sağlayıcı yanıtından
doldurulamaz. İlk sürümde alan, vergi kimliğinden **tahmin** edilerek yazılır
(10 hane VKN → `e_fatura` adayı, 11 hane TCKN → `e_arsiv` adayı) ve
`belge_tipi_kaynak = 'tahmin'` olarak işaretlenir. Deneme faturasında Bizimhesap'ın
gerçek belge tipini bir yerden (yanıt, `url` içeriği veya arayüz) okuyabildiğimiz
görülürse alan kesin değere çevrilir. Tahmini kesin bilgi gibi raporlamayız.

### Bizimhesap eşleştirme

`addinvoice` eşleşmeyen ürünü **sessizce yeni ürün olarak açar**. Koruma:
`productId` alanına **her zaman kendi SKU'muz** gönderilir (Bizimhesap'ta 2.851 SKU
zaten yüklü), `barcode` da beraberinde. SKU'suz ürün guard tarafından zaten kesilir.

### ikas tarafı yerleşimi

`OnlineSiparisler.jsx`'e cerrahi dokunuş:

1. Satır sonunda durum göstergeli tek buton:
   `🧾 Fatura Kes` (gri) → `✓ Faturalı` (yeşil, PDF açar) → `🔒 Fatura Stoğu Yok` (kırmızı)
2. Üstte filtre çipleri: `Tümü · Faturasız · Faturalı · Fatura Stoğu Yok`
3. Toplu seçim ile çoklu fatura kesme (Trendyol sekmesinde de aynısı)

## ④ Fatura Stoğu sekmesi

`StokYonetim.jsx`'e dördüncü sekme: **🧾 Fatura Stoğu**. İçinde üç görünüm:

- **📊 Durum** — ürün bazında `Fatura Stoğu | Gerçek Stok | Fark`. Varsayılan filtre
  `🔴 Faturası eksik olanlar`. Negatif fark = o ürün satılırsa fatura kesilemeyecek;
  erken uyarı işlevi görür.
- **📥 Alış Faturaları** — tedarikçi faturaları listesi, satır açılınca kalemleri.
- **🔀 Hareketler** — fatura stoğunun her giriş/çıkışının dökümü.

### Alış faturası girişi

1. **Elle giriş** (`AranabilirSecici` ile ürün seçimi).
2. **Mal kabulden devral** — `mal_kabuller`de zaten `tedarikci_id` + `fatura_no` var.
   Mal kabul kaydına "Bu mal kabulden alış faturası oluştur" düğmesi eklenir;
   kalemler ve miktarlar hazır gelir, kullanıcı fiyat/KDV teyit eder.
3. **e-Fatura XML içe aktarma** — sonraki faz.

### Alış faturası Bizimhesap'a YAZILMAZ

Tedarikçinin e-faturası GİB üzerinden Bizimhesap'a kendiliğinden düşer. Bir de
`addinvoice` ile `invoiceType: 5` gönderirsek aynı alış iki kez kaydolur; alış
tutarı, KDV beyanı ve kâr hesabı şişer.

Kural: **satış faturası** → Bizimhesap'a yazılır (yazarı biziz). **Alış faturası**
→ yalnız yerelde/ortak DB'de tutulur, fatura stoğunu doldurmak için.

Genel ilke: *bir kaydın birden fazla yazarı varsa, tekilleştirmeyi damgayla değil
sorumluluk ayrımıyla çöz.*

### Yetkiler

`izinler.js` + `yetki.js` + Supabase `yetki_kodlari` — üçüne birden:

- `fatura_kes`
- `fatura_stok_goruntule`
- `fatura_stok_duzenle`

## ⑤ Fatura senkronu — güçlü tutarlılık

Kullanıcı şartı: aynı siparişe iki kez fatura kesilemez ve fatura kesilince stok
tüm PC'lerde düşer. Eventual senkron bunu **vaat edemez** (yalnız yakınsama vaat
eder). Bu yüzden faturanın asıl nüshası Supabase'dedir; karar anında yerel aynaya
bakılmaz.

### Atomik sahiplenme + stok düşümü

`fatura_kes_basla(kanal, siparis_id, kalemler[])` Postgres fonksiyonu:

```sql
BEGIN
  -- 1) Sahiplen. UNIQUE ihlali (23505) = başkası aldı -> ÇIK
  INSERT INTO kesilen_faturalar (kanal, kanal_siparis_id, durum)
  VALUES (:kanal, :siparis, 'kuyrukta');

  -- 2) Koşullu düşüm. Etkilenen satır 0 ise stok yetmemiştir -> ROLLBACK
  UPDATE fatura_stok SET miktar = miktar - :gerekli
   WHERE urun_id = :urun AND miktar >= :gerekli;

  -- 3) Hareket kaydı
  INSERT INTO fatura_stok_hareketler (...);
COMMIT
```

Kontrol ve düşüm tek UPDATE'e gömülür; ayrı SELECT + UPDATE yazılmaz (araya başka
işlem girebilir). Sahiplenme uygulama kontrolüyle değil **veritabanı kısıtıyla**
yapılır. Sonuç: her PC fatura kesebilir, tek-PC kısıtına gerek yoktur.

### Hata sonrası telafi

| Sonuç | `kesilen_faturalar.durum` | Fatura stoğu |
|---|---|---|
| Başarılı (`error` boş) | `gonderildi` → `tamam` | Düşük kalır |
| İş hatası (`error` dolu) | `hata` | **İade edilir** (telafi hareketi) |
| Ağ hatası / yanıt yok | **`belirsiz`** | **İade EDİLMEZ** |
| Trendyol `409` | başarı sayılır | Düşük kalır |

`belirsiz` ayrı bir durumdur çünkü faturanın oluşup oluşmadığı bilinmiyordur.
Otomatik stok iadesi, fatura gerçekte oluştuysa stoğu şişirir ve aynı ürüne
yeniden fatura kesilmesine yol açar. Bu satırlar **"🔍 Kontrol Bekliyor"**
listesine düşer; kullanıcı Bizimhesap'ta bakıp "kesilmiş"/"kesilmemiş" der.

Sahiplenmeden sonra çöken PC'nin bıraktığı `kuyrukta` satırları da otomatik serbest
bırakılmaz — aynı kontrol listesine düşer.

Fatura hataları `bildirimler` tablosuna `onem = 'yuksek'` ile yazılır.

### Çevrimdışı

Supabase'e erişilemiyorsa fatura kesilemez; buton bunu açıkça söyler. Satış, kargo,
stok işlemleri etkilenmez. Bilinçli taviz: yanlış olmaktansa yapılamaz olmak yeğdir.

### Senkron kapsamı

⚠️ Mevcut senkron motoru (`senk-veri.js`) **son-yazan-kazanır upsert** yapar. Fatura
tabloları bu motora normal şekilde eklenirse, bir PC'nin bayat yerel kopyası
Supabase'deki doğru bakiyeyi **ezebilir** — mükerrer fatura engelinin altını oyar.

Bu yüzden fatura tabloları **çift yönlü senkrona girmez**:

- **Senkron motoruna hiç girmez** (ne pull ne push):
  `kesilen_faturalar`, `kesilen_fatura_kalemleri`, `fatura_stok`,
  `fatura_stok_hareketler`, `alis_faturalari`, `alis_fatura_kalemleri`
  → **Ruling-5 ile GÜNCELLENDİ:** yerel aynı bir "salt-okunur ayna" da
  tutulmuyor; hem okuma hem yazma doğrudan Supabase REST/RPC ile yapılır
  (`electron/fatura/okuma.js`, `bulut.js`). Sebep: senkron motoru varlık
  başına ayrı tablo değil TEK `senk_kayitlar` tablosunu pull/push ediyor, bu
  yüzden gerçek Postgres tabloları (`fatura_stok` vb.) zaten hiçbir pull ile
  yerel SQLite'a inmiyor — "yalnız-çekme aynası" fikri bu motorla uyumsuzdu.
- Senkron **tamamen dışında**: `trendyol_siparisler`, `trendyol_siparis_kalemleri`
  (operasyonel + `goruldu` PC bazlı olmalı)

**İPTAL EDİLDİ:** `senk-sema.js`'e `yalnizCekme: true` bayrağı eklenmedi —
yukarıdaki sebeple gereksiz kaldı; fatura tabloları `senk-sema.js`'e hiç
girmiyor.

## Modül yapısı

```
electron/fatura/
  index.js          -- IPC yüzeyi
  cekirdek.js       -- kanal-bağımsız: guard, set çözme, satır üretimi, durum makinesi
  stok.js           -- fatura stoğu okuma/yazma (Supabase RPC)
  saglayici/
    bizimhesap.js   -- addinvoice + PDF alma (sağlayıcı adaptörü)
  kanal/
    ikas.js         -- ikas siparişi -> fatura girdisi
    trendyol.js     -- Trendyol paketi -> fatura girdisi
electron/trendyol/
  index.js          -- API istemcisi, sipariş çekme, statü yazma, etiket
  bulut.js          -- Worker'dan "değişti" sinyali okuma
```

Sağlayıcı ve kanal adaptör arkasında: yeni pazaryeri = yeni `kanal/` dosyası;
sağlayıcı değişimi = yalnız `saglayici/` dosyası.

## Test

- **Trendyol stage ortamı** + `createTestOrder` / `updateTestOrderStatus` ile uçtan
  uca senaryo (gerçek sipariş beklemeden).
- **Bizimhesap**: test ortamı yok → 1 TL'lik gerçek deneme faturası.
- Birim testleri: set fiyat dağıtımı (kuruş farkı dahil), fatura stoğu guard'ı,
  durum makinesi geçişleri, `belirsiz` sonrası telafi yapılmaması.

## Uygulama sırası (öneri)

1. Supabase migration (`12_fatura_*.sql`) + `fatura_kes_basla` RPC
2. `electron/fatura/` çekirdek + Bizimhesap adaptörü + testler
3. Fatura Stoğu sekmesi + alış faturası girişi + mal kabulden devralma
4. ikas'a "Fatura Kes" + filtreler (mevcut sayfaya cerrahi dokunuş)
5. `electron/trendyol/` istemci + Trendyol sekmesi + rozet
6. Webhook (Worker uç noktası + Trendyol aboneliği) + emniyet yoklaması
7. Kargo etiketi (açık madde çözüldükten sonra)
