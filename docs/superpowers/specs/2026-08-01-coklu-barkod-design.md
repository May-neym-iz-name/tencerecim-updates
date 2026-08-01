# Çoklu Barkod + Ön Siparişte Elle Fiyat — Tasarım Dokümanı

Tarih: 2026-08-01
Durum: onaylandı, uygulama planı bekliyor
Dal: `feat/on-siparis` üzerine devam (ön sipariş ile birlikte tek yayında çıkacak)

## 1. Problem

**(a) Çoklu barkod.** Bir ürünün kutusunda tedarikçinin bastığı barkod var, rafta bizim
bastığımız 29'lu dahili barkod var, depoda tedarikçinin eski barkodlu kutuları da duruyor.
Bugün `urunler.barkod` tek bir değer tutuyor; hangisi kayıtlıysa yalnız o okutulabiliyor,
diğerleri okutulunca "ürün bulunamadı" geliyor.

**(b) Ön siparişte elle fiyat.** Katalogda fiyatı 0 olan yüzlerce ürün var (Lava, Rollers,
Maxx Doria importlarından). Ön sipariş genelde tam da bu ürünlere geliyor ve doğru fiyatla
satış girilemiyor.

## 2. Kararlar

| Karar | Seçim | Gerekçe |
|---|---|---|
| Barkod saklama | `urunler.barkod` KALIR + ayrı takma ad tablosu | Aşağıdaki §3.1 |
| Kaç ek barkod | Sınırsız | Tablo zaten satır bazlı; sayı sınırlamak keyfi olurdu |
| Etikete hangisi basılır | Her zaman birincil (`urunler.barkod`) | Takma adlar tedarikçinin zaten bastığı barkodlar |
| Elle fiyat kapsamı | Yalnız ön siparişte | Normal satışta suistimal/yanlış giriş riski |
| Koli çarpanı, varyant | Kapsam dışı | Ayrı projeler (§7) |

## 3. Çoklu barkod

### 3.1 Neden `urunler.barkod` kaldırılmıyor

`electron/db/senk-sema.js:24`'te `urunler` tablosunun tanımı:

```js
urunler: { kolonlar: [...,'barkod','sku',...], fk: {...}, dogal: ['barkod','sku'] }
```

`dogal` = **doğal anahtar**: iki PC arasında "bu kayıt aynı ürün mü?" sorusu barkoda bakarak
cevaplanıyor. `urunler.barkod`'u kaldırıp yerine liste koymak bu eşleştirmeyi kırar ve
senkronda ürün çoğalmasına yol açar. Ayrıca `electron/ikas/ekstra.js:182` ikas eşleştirmesi de
bu kolona bakıyor.

Bu yüzden: **`urunler.barkod` = BİRİNCİL barkod**, davranışı hiç değişmez. Ek barkodlar ayrı
tabloda **takma ad** olarak durur ve yalnızca "bulma" yollarına eklenir.

### 3.2 Veri modeli

`electron/db/database.js` içindeki `migrate()`'e yeni tablo:

```sql
CREATE TABLE IF NOT EXISTS urun_barkodlar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
  barkod TEXT NOT NULL UNIQUE,
  aciklama TEXT,
  olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
)
```

`barkod` UNIQUE: aynı barkod iki ürüne bağlanamaz. Ek olarak, bir takma ad **başka bir ürünün
birincil barkodu** da olamaz — bu kontrol yazma sırasında yapılır (§3.4).

### 3.3 Okutunca bulma — dokunulacak üç yer

| # | Yer | Şu anki davranış | Olacak |
|---|---|---|---|
| 1 | `electron/db/urunler.js:121-128` `urunler:barkodla` | `WHERE TRIM(barkod)=? OR TRIM(sku)=?` | + `urun_barkodlar` üzerinden eşleşme |
| 2 | `electron/db/urunler.js:82` `urunler:listele` arama ifadesi | ad + barkod + sku + marka | + o ürünün takma adları |
| 3 | `src/pages/Stok.jsx:198` stok sayımı | JS'te `k.barkod === kod` tam eşleşme | eşleşme yoksa `urunlerApi.barkodla(kod)` ile çözüp `urun_id` üzerinden bul |

**3 numara bu tasarımın en sinsi noktasıdır.** Stok sayım ekranı okutulan kodu sunucuya
sormuyor; ekranda yüklü sayım kalemleri içinde JS ile arıyor. Orası düzeltilmezse takma ad
barkod satışta çalışır ama **sayımda sessizce çalışmaz** — kullanıcı "ürün sayımda yok" sanır.

Bu üç yol dışında barkod yalnızca **gösterim** amaçlı SELECT ediliyor (`stok.js:9,50,74`,
`malkabul.js:69`, `satislar.js:293`, `raporlar.js:177`, `panel.js:78`); oralarda değişiklik
gerekmez — birincil barkod gösterilmeye devam eder.

### 3.4 Yazma kuralları

`urun_barkodlar`'a bir barkod eklenirken reddedilir:

- boş/whitespace ise
- aynı barkod başka bir ürünün takma adıysa (UNIQUE zaten engeller, hata mesajı Türkçe olmalı)
- aynı barkod herhangi bir ürünün **birincil** barkoduysa (`urunler.barkod`)
- aynı ürünün kendi birincil barkoduyla aynıysa (anlamsız tekrar)

Silme serbesttir. Ürün silinince takma adlar `ON DELETE CASCADE` ile gider.

### 3.5 Etiket basma

`src/components/BarkodModal.jsx:13` (`const deger = urun.barkod || urun.sku || ''`) **değişmez**.
Etikete her zaman birincil barkod basılır. Takma adlar tedarikçinin kutuya zaten bastığı
barkodlardır; onları yeniden basmanın anlamı yok.

### 3.6 Arayüz

`src/pages/Urunler.jsx` ürün düzenleme formuna **"Ek Barkodlar"** alanı:

- Mevcut takma adlar liste halinde, her birinin yanında sil (✕) düğmesi
- Alt satırda "barkod + açıklama" girişi ve "Ekle" düğmesi
- Barkod okuyucuyla da doldurulabilir (alan odaktayken okutma)
- Yalnızca `urun_duzenle` yetkisi olana görünür

Yeni ürün eklerken bu alan pasiftir (ürün id'si henüz yok); ürün kaydedildikten sonra
düzenlemeye girilerek eklenir. Bu bilinçli bir sadeleştirme — iç içe form karmaşası
yaratmamak için (bkz. `sablon-turu-genel` notundaki +buton tuzağı).

### 3.7 Çok-PC senkron

`electron/db/senk-sema.js` içindeki `TABLOLAR`'a eklenir:

```js
urun_barkodlar: { kolonlar: ['barkod','aciklama'], fk: { urun_id: 'urunler' }, dogal: ['barkod'] }
```

ve `SIRA` dizisine `urunler`'den SONRA gelecek şekilde yerleştirilir (FK bağımlılığı).

Ön sipariş çalışmasında öğrenilen ders: yeni tablo senkron listesine eklenmezse diğer PC'de
takma adlar hiç görünmez ve orada okutma çalışmaz.

## 4. Ön siparişte elle fiyat

Backend **zaten hazır**: `electron/db/satislar.js:55` her kalemde
`(kalem.birim_fiyat ?? urun.satis_fiyati)` diyor — gönderilen fiyatı kabul ediyor. Yapılacak iş
tamamen `src/pages/Satis.jsx` içinde:

- Sepet satırında fiyat kutusu, **yalnız `onSiparis === true` iken** açılır
- Boş bırakılırsa ürünün kayıtlı fiyatı kullanılır (mevcut davranış)
- Girilen fiyat yalnızca o satışa geçer; `urunler.satis_fiyati` **değişmez**
- Kutucuk kapatılırsa girilen elle fiyatlar temizlenir (yanlışlıkla normal satışa sızmasın)
- Sepet toplamı elle fiyata göre anında güncellenir

Ödeme farkı yüzdesi (`odeme_oran`) elle fiyata da mevcut kurala göre uygulanır — ayrı bir
istisna yapılmaz.

## 5. Etkilenmeyecekler

`electron/barkod-yazdir.js` · `src/lib/barkod.js` · ikas senkronu · raporlar · kasa · fiş ·
`urunler.barkod`'un tüm mevcut davranışı · `src/pages/OnlineSiparisler.jsx`

## 6. Test planı

`electron/db/urunler.test.js` (yeni, `node:sqlite` enjeksiyonlu — kalıp
`electron/db/satislar.test.js`):

1. Takma ad barkod okutulunca doğru ürün bulunur
2. Birincil barkod hâlâ bulunur (regresyon)
3. SKU ile bulma hâlâ çalışır (regresyon)
4. Aynı barkod iki ürüne takma ad olarak eklenemez
5. Başka ürünün **birincil** barkodu takma ad olarak eklenemez
6. Ürünün kendi birincil barkodu takma ad olarak eklenemez
7. Boş/whitespace barkod eklenemez
8. Takma ad silinince o barkod artık ürünü bulmaz
9. Ürün arama takma ad barkodla da sonuç döndürür

Elle doğrulama: ürüne ek barkod tanımla → satış ekranında okut (bulmalı) → stok sayımında
okut (bulmalı) → mal kabulde ara (bulmalı) → etiket bas (birincil barkod basmalı).

Ön sipariş elle fiyat: fiyatı 0 olan ürünle ön sipariş al, fiyat gir, fişte ve satış
geçmişinde girilen fiyatın göründüğünü, ürün kartındaki fiyatın değişmediğini doğrula.

## 7. Kapsam dışı — sonra değerlendirilecek

- **Koli çarpanı**: barkoda "adet" verip koli okutunca N adet eklemek
- **Ürün varyantı**: aynı ürünün renkleri ayrı stok tutsun (KAHVE/GRİ) — bu barkod işi
  DEĞİL, ayrı stok birimi işi ve tek başına bir proje
- ikas `barcodeList` dizisinden (`electron/ikas/ekstra.js:203-207`) takma adları otomatik çekme
- Excel içe aktarmadaki "Barkod Listesi" sütununu (`electron/db/excel-import.js:76`) çoklu okuma
- Takma adların Excel dışa aktarımında gösterilmesi
