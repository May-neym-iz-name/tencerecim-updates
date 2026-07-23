# İstek Listesi (Tedarikçi Sipariş Listesi) — Tasarım Dokümanı

**Tarih:** 2026-07-23
**Durum:** Onay bekliyor
**Konu:** Stok alanına, tedarikçilerden tedarik edilecek ürünlerin şube-bazlı istek listelerini oluşturma, kaydetme (bulut senkron) ve logolu PDF alma özelliği.

## Amaç

Kullanıcı, bir **şube** ve bir **tedarikçi** için tedarik etmek istediği ürünlerin
listesini oluşturur, kaydeder ve PDF olarak alır. Kayıtlı listeler PC'ler/şubeler
arasında bulut senkron olur; PDF her PC'de uygulama tarafından yerel üretilir.

## Kararlar (netleştirildi)

- **Liste kapsamı:** Şube + tedarikçi başına ayrı liste (bir liste = bir şube + bir tedarikçi).
- **Ürün ekleme:** Tüm ürünler aranabilir (tedarikçiyle sınırlı değil); serbest eklenir.
- **Senkron:** Kayıtlı listeler Supabase ile senkron (mevcut jenerik `senk_kayitlar` mekanizması). PDF senkronlanmaz, her PC yerel üretir.
- **PDF içeriği:** Logomuz + şube adı/adresi + tedarikçi adı + tarih; tablo = Sıra No · Ürün Tam Adı · Adet.
- **Yetki:** Mevcut `mal_kabul_yonet` koduna bağlı (yeni yetki kodu yok → yeni Supabase adımı yok).

## Veri Modeli

İki yeni yerel SQLite tablosu; mevcut jenerik senkrona kaydedilir.

**`istek_listeleri`** (başlık):

| kolon | tip | açıklama |
|---|---|---|
| `id` | INTEGER PK | |
| `lokasyon_id` | INTEGER | şube (düz kolon — her PC aynı seed, `satislar` emsali) |
| `tedarikci_id` | INTEGER | FK → tedarikciler |
| `baslik` | TEXT | ör. "Merkez — Saflon — 23.07.2026" |
| `tarih` | TEXT | liste tarihi (ISO) |
| `olusturma_tarihi` | TEXT | `datetime('now','localtime')` |
| `senk_id`, `senk_guncelleme` | TEXT | senkron altyapısı (senk-sema ekler) |

**`istek_listesi_kalemleri`** (satırlar):

| kolon | tip | açıklama |
|---|---|---|
| `id` | INTEGER PK | |
| `istek_id` | INTEGER | FK → istek_listeleri (zorunlu) |
| `urun_id` | INTEGER | FK → urunler (nullable-çözülür) |
| `urun_adi` | TEXT | **anlık kopya** — PDF bunu kullanır (satis_kalemleri.set_adi emsali) |
| `miktar` | INTEGER | adet |
| `senk_id`, `senk_guncelleme` | TEXT | senkron altyapısı |

`urun_adi` anlık kopyalanır: senkronda `urun_id` çözülemese bile (FK yarışı,
[[senkron-fk-yarisi]]) PDF tam ürün adını basar; `alici_ad`/`set_adi` deseni.

## Senkron

`electron/db/senk-sema.js`:
- `TABLOLAR`'a iki tablo eklenir, `sonradanEklendi: true`:
  - `istek_listeleri`: `kolonlar: ['lokasyon_id','baslik','tarih','olusturma_tarihi']`, `fk: { tedarikci_id:'tedarikciler' }`, `dogal: []`.
  - `istek_listesi_kalemleri`: `kolonlar: ['urun_adi','miktar']`, `fk: { istek_id:'istek_listeleri', urun_id:'urunler' }`, `zorunluFk: ['istek_id']`, `dogal: []`.
- `SIRA`'ya FK sırasına uygun eklenir: `tedarikciler`/`urunler`'den sonra, kalemler parent'tan sonra (ör. `...'mal_kabul_kalemleri', 'istek_listeleri', 'istek_listesi_kalemleri', 'kargolar'`).
- `src/lib/veriSenk.js` `SIRA_YEDEK`'e aynı iki tablo eklenir (backend tek kaynak; yedek tutarlı kalsın).

Gerçek bulut yükleme mevcut `senk_kayitlar` üzerinden; bespoke Supabase tablosu gerekmez.

## Arayüz

### Sekme (`src/pages/StokYonetim.jsx`)

`Sekmeler` dizisine: `yetkiVar('mal_kabul_yonet') && { kod: 'istek-listesi', ad: '📝 İstek Listesi', el: <IstekListesi /> }`.

### Sayfa (`src/pages/IstekListesi.jsx`) — iki görünüm

1. **Liste görünümü (varsayılan):** kayıtlı listeler (şube + tedarikçi + tarih +
   kalem sayısı), kullanıcının erişebildiği şubelere göre filtreli. "Yeni İstek
   Listesi" butonu; her satırda Aç/Düzenle · PDF · Sil.
2. **Düzenleme görünümü:** Şube seçimi (erişilebilir şubeler) + Tedarikçi seçimi
   (`AranabilirSecici`) + ürün ekleme (aranabilir, tüm ürünler, `arama.js` Türkçe
   arama) → adet gir → Ekle. Eklenen kalemler tabloda (tam ad + adet + düzelt/sil).
   "Kaydet" (senkrona girer) ve "PDF İndir".

**Kart/tablo bileşeni** `src/components/IstekListesiKalemleri.jsx` (saf sunum) —
dosyalar < 800 satır.

### IPC

`electron/db/istek-listesi.js` → `src/api/ipc.js` `istekApi`:
- `istek:listele` `() => Liste[]` (şube filtresi renderer'da yetkiye göre)
- `istek:getir` `(id) => { ...liste, kalemler:[] }`
- `istek:kaydet` `({ id?, lokasyon_id, tedarikci_id, baslik, kalemler:[{urun_id, urun_adi, miktar}] }) => { id }`
- `istek:sil` `(id) => { ok }`
- `istek:pdf` `(id) => { kaydedildi:boolean, yol?:string }` (electron/istek-pdf.js'e delege)

Handler'lar `mal_kabul_yonet` + şube için `lokasyonKontrol` ile korunur (savunma derinliği, [[guvenlik-mimarisi]]).

## PDF Üretimi

`electron/istek-pdf.js` — `fis-yazdir.js` desenini izler:
- Gizli `BrowserWindow` + `htmlYukle(win, html)` + **`webContents.printToPDF()`** → PDF `Buffer`.
- `dialog.showSaveDialog` ile kullanıcı konumu seçer; buffer dosyaya yazılır.
  Varsayılan ad: `istek-<sube>-<tedarikci>-<tarih>.pdf`.
- **İçerik:** üstte base64 gömülü **logo** (`electron/assets/istek-logo.png`);
  başlık = şube adı + adresi (`lokasyon_gonderici`), tedarikçi adı, tarih; tablo =
  Sıra No · Ürün Tam Adı · Adet; alt = toplam kalem/adet.
- HTML üreten saf fonksiyon `_istekHtml(liste)` ayrı tutulur → DB'siz test edilir.

`printToPDF` yazıcıya değil buffer'a render eder → "PDF al" = dosya kaydet, yazıcı
diyaloğu çıkmaz. Logo base64 gömülü: renderer asset yolu main'den okunamaz, gömülü
veri PDF'i kendine yeterli kılar.

## Test

vitest:
- `electron/istek-pdf.test.js`: `_istekHtml(liste)` — şube adresi, tedarikçi,
  tüm kalemlerin tam adı + adedi HTML'de geçiyor; boş liste; uzun ad; HTML kaçış
  (ürün adında `<`/`&`). DB'siz (emsal raporlar.test.js).
- CRUD + senkron: build + elle doğrulama (better-sqlite3 ABI'si vitest'te DB testini engeller).

## Dosya Listesi

**Yeni:**
- `src/pages/IstekListesi.jsx`
- `src/components/IstekListesiKalemleri.jsx`
- `electron/db/istek-listesi.js`
- `electron/istek-pdf.js` + `electron/istek-pdf.test.js`
- `electron/assets/istek-logo.png` (logo kopyası)

**Düzenlenecek:**
- `electron/db/database.js` (iki CREATE TABLE)
- `electron/db/senk-sema.js` (`TABLOLAR` + `SIRA`)
- `src/lib/veriSenk.js` (`SIRA_YEDEK`)
- `electron/main.js` (IPC modül kaydı)
- `src/api/ipc.js` (`istekApi`)
- `src/pages/StokYonetim.jsx` (yeni sekme)

## Kapsam Dışı (YAGNI)

Tedarikçiye otomatik e-posta/WhatsApp gönderimi, sipariş durum takibi
(taslak/gönderildi/teslim), mal kabulle otomatik eşleştirme, ürün bazlı not alanı,
PDF'te SKU/mevcut stok kolonları (kullanıcı yalnız ad+adet istedi). Altyapı
ileride eklemeye açık.
