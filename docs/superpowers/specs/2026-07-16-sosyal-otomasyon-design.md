# Gönderi Bazlı Otomatik Yorum Cevabı — Tasarım

**Tarih:** 2026-07-16
**Durum:** onaylandı, uygulanacak

## Problem

Instagram gönderilerine gelen yorumların büyük kısmı fiyat sorusu (günde 64-213 yorum, son 7 günde
837 yorum / 687 tekil kişi). Bunlar elle cevaplanıyor ya da hiç cevaplanmıyor.

Meta'nın kendi "Yorumdan mesaja" otomasyonu bu ihtiyacı **karşılayamıyor**:
- Kapsamı **hesap geneli** — gönderi seçilemiyor (arayüzde böyle bir alan yok, ekran görüntüsüyle doğrulandı)
- Kural başına **tek mesaj** — farklı ürün gönderilerine farklı fiyat yazılamıyor
- Fiyat metne gömülü — zam yapılınca kurallar elle güncellenmeli

Programın avantajı: **ürünleri ve fiyatları biliyor**. Şablon ürüne bağlanırsa fiyat gönderim anında
veritabanından okunur; zam yapılınca otomasyon kendiliğinden güncel kalır. Meta'nın aracı bunu yapamaz.

## Ön koşul (çözüldü)

Yoruma özel mesaj gönderme **çalışıyor** — App Review gerekmiyor (2026-07-16, gerçek müşteride
doğrulandı). Bkz. [[yorumdan-mesaj-uc-noktasi]]. DM gelen kutusu listesi Advanced Access ister ama
bu özellik ona ihtiyaç duymaz.

## Meta'nın sınırları (tasarımı belirleyen kurallar)

| Kural | Etki |
|---|---|
| Yorum başına **tek** özel mesaj | Bir gönderideki tüm ürünler **tek mesajda** birleşmeli |
| Mesaj **~1000 karakter** | Gönderi başına pratik olarak ~4 ürün |
| Yorum **7 günden yeni** olmalı | Eski yorumlar kapsam dışı (doğal sınır) |
| Özel yanıt **saatte 750** çağrı | Hız kısıtı şart |

**Kritik:** Bu sınırlar teknik limitler, nezaket kuralları değil. Kod bunların *içinde* kalarak da
687 kişiyi rahatsız edebilir. Kapsam kurallarını kendimiz koyuyoruz.

## Kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Açılınca geçmiş yorumlar | **Tüm cevaplanmamışlara gider** (7 gün penceresi) | Bu kişiler fiyat sormuş, cevap alamamış — gecikmiş hizmet |
| Aynı kişi çok yorum atarsa | **Gönderi başına tek DM** | 837 yorum → 687 kişi; spam görüntüsünü engeller |
| Çoklu ürün | **Tek mesajda alt alta** | Meta yorum başına tek mesaja izin veriyor |
| Açık yanıt | **Yalnız DM başarılıysa** | "DM'den bilgi verilmiştir" yalan olmasın |
| Fiyat kaynağı | **Ürüne bağlı varsayılan, elle yazma da mümkün** | Canlı fiyat + kampanya/set esnekliği |
| Link & WhatsApp | **Şablonda ayrı ayrı** | Ürüne özel yönlendirme |
| Otomasyon paneli | **Gönderi detayında** | Bağlam orada |
| Hız kısıtı | **Saatte 500** | 750 tavanının altında pay bırakır (yorum başına 2 çağrı + polling'in kendi çağrıları) |

## Veri modeli

Şablon kütüphanesi otomasyondan **ayrı** — şablonun ömrü gönderiden uzun (yeni çelik kase
gönderisinde aynı şablon tekrar seçilir).

```sql
sosyal_sablonlar            -- tekrar kullanılabilir kütüphane
  id INTEGER PK
  ad TEXT NOT NULL          -- "Çelik Kase Seti 6'lı" (listede görünen isim)
  urun_id INTEGER → urunler(id)   -- NULL olabilir
  urun_adi TEXT             -- mesajda görünen ad
  aciklama TEXT
  fiyat REAL                -- NULL ise urun_id'den canlı okunur
  link TEXT
  whatsapp TEXT
  aktif INTEGER DEFAULT 1
  olusturma_tarihi TEXT

sosyal_otomasyonlar         -- gönderi başına
  id INTEGER PK
  platform TEXT             -- 'instagram' | 'facebook'
  konu_id TEXT UNIQUE       -- gönderi (medya) id
  aktif INTEGER DEFAULT 0
  acik_yanit_metni TEXT
  baslangic_tarihi TEXT     -- açıldığı an
  olusturma_tarihi TEXT

sosyal_otomasyon_sablonlar  -- bağlantı: bir gönderi ↔ birden çok şablon
  otomasyon_id INTEGER → sosyal_otomasyonlar(id)
  sablon_id INTEGER → sosyal_sablonlar(id)
  sira INTEGER
```

**`fiyat` NULL'ın anlamı:** NULL = "ürüne sor" (canlı fiyat), dolu = "bunu yaz" (kampanya/set fiyatı).
Ayrı bir `fiyat_tipi` bayrağı YOK — NULL'ın kendisi anlam taşıyor; iki alan senkron tutma derdi olmaz.

**İşlenmişlik takibi:** mevcut `sosyal_mesajlar.ozel_mesaj_tarihi` kolonu kullanılır (bu oturumda
eklendi). Yeni tablo gerekmez.

## Mesaj oluşturma

Kullanıcı kutuları doldurur, program birleştirir. Kullanıcı mesajın tamamını asla yazmaz.

```
🍲 Çelik Kase Seti 6'lı
18/10 paslanmaz çelik, iç içe geçen tasarım
💰 1.450 TL
🛒 tencerecim.store/celik-kase-seti

🍲 Granit Tencere Seti 7 Parça
...

📱 Sipariş ve bilgi: 0555 123 45 67
```

- Selamlama ve WhatsApp **bir kez** (1000 karakteri israf etmemek için)
- **WhatsApp tekilleştirme:** seçili şablonların numaraları AYNIYSA sonda bir kez; FARKLIYSA her
  ürünün altında ayrı
- Fiyat: `sablon.fiyat ?? (urun_id → urunler.satis_fiyati)`. İkisi de yoksa fiyat satırı yazılmaz.
- Karakter sayacı arayüzde; 1000 aşılırsa **kaydetmeden önce** uyarır (kesik mesaj gitmesin)

## Çalıştırıcı

Yeni dosya: `electron/meta/otomasyon.js` (~150 satır). Ayrı dosya çünkü `meta/index.js` zaten
çekme/gönderme ile dolu ve bu iş kendi zamanlamasına + kendi güvenlik kurallarına sahip.

Mevcut 120 sn'lik polling turuna eklenir — yorumlar çekildikten **sonra** çalışır (`tumunuCek` sonrası).

**Aday seçimi:**
```
konu_id ∈ (aktif otomasyonu olan gönderiler)
yon = 'gelen'
gonderen_ad != 'tenceremtava'          -- KRİTİK, aşağıya bak
ozel_mesaj_tarihi IS NULL
mesaj_tarihi >= now - 7 gün
AND NOT EXISTS (aynı konu_id + aynı gonderen_ad + ozel_mesaj_tarihi dolu)   -- kişi başına tek
```

**Sıra:** DM gönder → başarılıysa açık yanıt yaz → `ozel_mesaj_tarihi` damgala.
DM başarısızsa hiçbir şey yazılmaz.

**Sonsuz döngü riski (KRİTİK):** Yazdığımız açık yanıt bir sonraki polling turunda **yorum olarak
geri çekiliyor**. `gonderen_ad != 'tenceremtava'` filtresi olmazsa otomasyon kendi yanıtına cevap
verir, ona da cevap verir. Bu filtre isteğe bağlı değil.

**Tekilleştirme neden `gonderen_ad` ile:** IG yorumlarında `from` alanı istenemiyor (tüm çekimi kırıyor
— bkz. [[meta-yorum-cekme-tuzaklari]]), bu yüzden `gonderen_id` her zaman NULL. Elimizde yalnız
`username` var; Instagram'da benzersiz olduğu için güvenli.

**Hız kısıtı:** saatte 500, **hesap geneli** (gönderi başına değil — Meta'nın sınırı IG hesabı başına).
Sayaç bellekte tutulur (kayan pencere); sınıra gelince tur biter, kalanlar sonraki turda işlenir.
En kötü durumda (tüm gönderiler aynı anda açılırsa) 687 kişilik birikim ~1,5 saatte tamamlanır.

**Hata toleransı:** bir yorum patlarsa döngü devam eder, hata loglanır. Arka plan işi, kullanıcıyı
bloklamaz.

## Arayüz

**a) Sosyal Medya → gönderi detayı → yeni "⚡ Otomasyon" bölümü**
```
┌─ ⚡ Otomasyon ────────────────────────────┐
│  ○──● Açık          Bugün 42 mesaj gitti │
│  Ürünler (2):                             │
│   ⋮⋮ Çelik Kase Seti 6'lı           [×]  │
│   ⋮⋮ Granit Tencere 7 Parça         [×]  │
│   [+ Şablon ekle]                         │
│  Açık yanıt:                              │
│   [Bizler ile iletişime geçtiğiniz…]      │
│  Önizleme ▾   412/1000 karakter          │
└───────────────────────────────────────────┘
```

**Açma onayı:** Aç'a basınca *"Bu gönderide N kişiye mesaj gidecek (son 7 gün). Onaylıyor musun?"*
N, **o gönderiye özel** aday sorgusundan gelir (aşağıdaki aday seçimi filtresinin `COUNT`'u) — hesap
geneli rakam değil. Onaylanmadan `aktif=1` yazılmaz.

(Referans: hesap genelinde son 7 günde 687 tekil kişi var; tek bir gönderininki bunun bir alt kümesi.
En hareketli gönderi bugün 1 saatte 213 yorum aldı, yani tek gönderi bile birkaç yüz kişi olabilir.)

**b) Yeni "Şablonlar" alt-sekmesi** — kütüphane yönetimi (liste, ara, yeni, düzenle, sil).

Şablon formu:
```
Şablon adı  [ Çelik Kase Seti 6'lı        ]
Ürün        [ 🔍 ürün ara…      ] [temizle]   ← AranabilirSecici.jsx
Ürün adı    [ Çelik Kase Seti 6'lı        ]
Açıklama    [ 18/10 paslanmaz çelik…      ]
Fiyat       [ 1.450 ]  ☑ Üründen al
Online link [ tencerecim.store/…          ]
WhatsApp    [ 0555 123 45 67              ]
Önizleme: 187/1000                [Kaydet]
```

Uzun liste seçicilerinde mevcut `AranabilirSecici.jsx` kullanılır (proje deseni).

## Kapsam dışı

- Anahtar kelime filtresi — istenmedi; aktif gönderideki HER yoruma cevap gider
- Facebook otomasyonu — şema `platform` alanı taşıyor ama ilk sürüm yalnız Instagram
- Zamanlama (belirli saatlerde çalış) — YAGNI
- DM gelen kutusu — Advanced Access bekliyor, ayrı iş

## Test

- Şablon → mesaj birleştirme birim testi (fiyat NULL/dolu, WhatsApp aynı/farklı, 1000 sınırı)
- Aday seçimi SQL testi (kendi yorumumuz hariç mi, kişi başına tek mi, 7 gün)
- Canlı: `burakgulmuyor` test hesabından yorum → otomasyon açık gönderide DM + açık yanıt
- Sonsuz döngü kontrolü: otomasyonun kendi açık yanıtına cevap vermediği doğrulanır
