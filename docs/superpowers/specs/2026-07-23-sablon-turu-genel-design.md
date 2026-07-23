# Şablon Türü: Ürün / Genel — Tasarım

Tarih: 2026-07-23
Durum: Onaylandı (implementasyon planı bekliyor)

## Amaç

Sosyal medya otomasyon şablonları bugün yalnız "ürün fiyatı soran" senaryoya
hizmet ediyor: sabit alanlar (ürün adı, açıklama, fiyat, link, WhatsApp) ve sabit
mesaj biçimi ("Merhaba, … Fiyat: … Whatsapp Sipariş Hattı: …"). Fiyat sormayan,
daha geniş kapsamlı içerikler (tarif çağrısı, kampanya duyurusu, yönlendirme vb.)
için kullanıcının **kendi metnini** yazabileceği ikinci bir şablon türü gerekiyor.

## Kararlar (kullanıcı onaylı)

1. **İki tür:** ekranda `💰 Ürün şablonu` ve `📝 Genel şablon`.
2. **Genel davranışı:** metnin TAMAMI aynen gider. "Merhaba/Fiyat/WhatsApp"
   biçimi hiç uygulanmaz; kutuya yazılan metin ne ise müşteriye o gider (yalnız
   1000 karakter sınırı kontrol edilir).
3. **Tek tür kuralı:** bir gönderi otomasyonuna ya birden çok ürün şablonu
   (birleşir) YA DA **tek bir** genel şablon bağlanır. Karışık bağlamaya izin yok.
4. **Genel şablon saf metin:** link/WhatsApp gibi ek opsiyonel alan yok.

## Veri Modeli

`sosyal_sablonlar` tablosuna iki kolon eklenir (electron/db/database.js:566):

- `tur TEXT NOT NULL DEFAULT 'urun'` — değerler: `'urun'` | `'genel'`
- `serbest_metin TEXT` — genel türün mesaj gövdesi (ürün türünde NULL)

Migration, mevcut `set_id` eklemesindeki desenle (database.js:600):

```js
try { db.exec("ALTER TABLE sosyal_sablonlar ADD COLUMN tur TEXT NOT NULL DEFAULT 'urun'") } catch {}
try { db.exec("ALTER TABLE sosyal_sablonlar ADD COLUMN serbest_metin TEXT") } catch {}
```

Mevcut satırlar otomatik `tur='urun'` olur — geriye dönük tam uyumlu.

`urun_adi` kolonu şemada `NOT NULL`. Genel türde ürün adı anlamlı değil; kayıt
sırasında `urun_adi=''` (boş string) yazılır (NOT NULL'ı ihlal etmez), UI türe
göre bunu göstermez.

### Senkron (KRİTİK)

`electron/db/senk-sema.js:34` — `sosyal_sablonlar.kolonlar` listesine `'tur'` ve
`'serbest_metin'` eklenir. Eklenmezse yeni kolonlar PC'ler arası senkronlanmaz
ve özellik sessizce tek PC'de kalır.

## Mesaj Üretimi

### `_sablonlariCoz` (electron/db/sosyal-otomasyon.js:14)

SELECT'e `s.tur, s.serbest_metin` eklenir.

### `mesajOlustur` (electron/meta/sablon-mesaj.js:52)

Dallanma:

- Liste **tümüyle `genel`** ise: `serbest_metin` değerleri aynen kullanılır.
  Tek genel varsa metin doğrudan odur. (Tek-tür kuralı gereği pratikte tek genel
  olur; savunmacı olarak birden çoksa boş satırla alt alta birleşir.) Selamlama,
  fiyat/link/whatsapp biçimi UYGULANMAZ. 1000 karakter aşımı `asildi=true`.
- Aksi halde (ürün türü): mevcut akış aynen korunur.

Karışık liste kayıt ve panel katmanında engellendiği için normalde oluşmaz;
`mesajOlustur` yine de "hepsi genel mi?" testine göre güvenli dallanır.

## Doğrulama — `sosyal:sablonKaydet` (electron/db/sosyal-otomasyon.js:88)

Girdiye `tur` ve `serbest_metin` eklenir.

- `tur === 'genel'`: `ad` ve `serbest_metin` zorunlu (boş olamaz), `serbest_metin`
  ≤ 1000 karakter. Kayıtta `urun_id=null, set_id=null, urun_adi='', aciklama=null,
  fiyat=null, link=null, whatsapp=null, tur='genel', serbest_metin=<metin>`.
- `tur === 'urun'` (varsayılan): mevcut doğrulama aynen (ad + urun_adi zorunlu,
  urun_id/set_id birlikte olamaz), `tur='urun', serbest_metin=null`.

INSERT ve UPDATE ifadeleri iki yeni kolonu içerir.

## Arayüz

### SablonKutuphanesi (src/components/SablonKutuphanesi.jsx)

- `+ Yeni` butonu iki seçenekli küçük menüye dönüşür: `💰 Ürün şablonu` →
  `setFormda({ tur: 'urun' })`, `📝 Genel şablon` → `setFormda({ tur: 'genel' })`.
- Liste satırı: `tur==='genel'` olan şablonda `📝 Genel` rozeti gösterilir; fiyat
  satırı (canlı/sabit/yok) yerine metnin ilk satırından kısa bir önizleme.
- Düzenle: mevcut şablonun `tur` değeri forma taşınır.

### SablonFormu (src/components/SablonFormu.jsx)

Türe göre dallanır (`sablon?.tur` veya yeni-oluşturmada geçilen `tur`):

- **Genel mod:** yalnız *Şablon adı* + büyük *Mesaj metni* (textarea) alanları.
  Sağda canlı önizleme = metnin aynen kendisi, karakter sayacı (1000 sınırı,
  aşımda kırmızı + Kaydet kilidi). Ürün/fiyat/link/whatsapp alanları görünmez.
- **Ürün mod:** bugünkü form birebir korunur.

Önizleme mantığı basit (metnin kendisi) olduğundan sablon-mesaj.js ile biçim
eşleşmesi derdi genel modda yoktur.

### OtomasyonPaneli (src/components/OtomasyonPaneli.jsx)

`ekle(s)` fonksiyonunda tek-tür kuralı:

- Ekli listede farklı `tur` varsa → toast: "Bu gönderide {ürün/genel} şablonu var,
  karıştıramazsınız."
- Genel eklenmek isteniyorsa ve liste boş değilse (tek genel kuralı) → toast uyarı.
- Yani: genel yalnız liste boşken; ürün yalnız ekli hiç genel yokken eklenebilir.

Ekli şablon satırında da `tur==='genel'` için `📝 Genel` etiketi.

Backend `sosyal:otomasyonKaydet` de karışık/çok-genel listeyi reddeder (derinlik):
bağlanan `sablon_idler`'in türleri tek olmalı ve genelse tek olmalı.

## Test

`electron/meta/sablon-mesaj.test.js`:

- Tek genel şablon → çıktı `serbest_metin` ile birebir aynı, selamlama/fiyat yok.
- Genel + 1000 karakter aşımı → `asildi=true`.
- Ürün şablonları (mevcut senaryolar) davranışı değişmez — regresyon.

`electron/db` doğrulama testleri (varsa mevcut desene uygun):

- Genel'de `serbest_metin` boşsa hata.
- Ürün'de mevcut zorunluluklar korunur.

## Kapsam Dışı (YAGNI)

- Genel şablonda değişken/yer tutucu (placeholder) yok — saf metin.
- Genel şablonda link/WhatsApp/fiyat opsiyonel alanları yok.
- Ürün + genel karışık mesaj birleştirme yok (bilinçli olarak engellendi).
