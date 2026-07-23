# Bildirim Merkezi — Tasarım Dokümanı

**Tarih:** 2026-07-23
**Durum:** Onay bekliyor
**Konu:** İptal/iade taleplerini ve genel olayları toplayan bir bildirim merkezi.

## Amaç

Müşterilerin ikas üzerinden oluşturduğu **iptal ve iade talepleri** personele
otomatik olarak bildirim şeklinde düşmeli. Yapı, ileride başka olayları (yeni
sipariş, düşük stok, kargo vb.) da toplayabilecek **genel bir bildirim merkezi**
olacak; iptal/iade talepleri ise ayrıca ve daha belirgin gösterilecek.

## Mimari İlkesi

ikas **tek gerçek kaynak**. Her PC, mevcut ikas çekimi sırasında bildirimleri
kendi yerelinde üretir. Bulut senkronu **gerekmez** — bu, uygulamanın mevcut
çok-PC mimarisiyle uyumludur (ayarlar buluttan senkron, operasyonel veri her PC
yerel). Her PC aynı ikas durumundan aynı bildirimi bağımsız üretir; okundu
durumu her PC'de yereldir.

## Veri Modeli

Yeni yerel SQLite tablosu: `bildirimler`

| kolon | tip | açıklama |
|---|---|---|
| `id` | INTEGER PK | otomatik |
| `tip` | TEXT | `iptal_talebi`, `iade_talebi`, `iade_kabul`, `iade_red` (genişletilebilir) |
| `baslik` | TEXT | örn. "İade talebi — Sipariş #1234" |
| `mesaj` | TEXT | müşteri adı, tutar, sebep vb. detay |
| `onem` | TEXT | `yuksek` (iptal/iade) / `normal` (diğer) |
| `ikas_siparis_id` | TEXT NULL | ilgili sipariş; genel bildirimlerde boş |
| `dedup_anahtar` | TEXT UNIQUE | `ikas_siparis_id + tip + durum` |
| `okundu` | INTEGER | 0/1, yerel okundu durumu |
| `olusturma_tarihi` | TEXT | ISO zaman damgası |

`dedup_anahtar` UNIQUE constraint + `INSERT OR IGNORE`: aynı olay her çekimde
tekrar bildirilmez. Durum değişirse (talep → kabul) farklı `dedup_anahtar`
oluşur ve yeni bildirim düşer.

## Algılama Mantığı

**Konum:** `electron/ikas/index.js` içindeki mevcut `upsertSiparisler` döngüsü.
Sipariş durumları zaten burada tazeleniyor; ayrı sorgu/servis yok. Mevcut çekim
sorgusu `status` ve `orderPackageStatus` alanlarını zaten getiriyor — talep
durumları veride mevcut, ekstra API çağrısı gerekmez.

**Durum → tip eşlemesi** (ikas `OrderStatusEnum` / `OrderPackageStatusEnum`):

| ikas durumu | tip | önem |
|---|---|---|
| `CANCEL_REQUESTED` | `iptal_talebi` | yuksek |
| `REFUND_REQUESTED` | `iade_talebi` | yuksek |
| `REFUND_REQUEST_ACCEPTED` | `iade_kabul` | normal |
| `REFUND_REJECTED` / `CANCEL_REJECTED` | `iade_red` | normal |

**Yeni modül:** `electron/ikas/bildirim-uret.js` — saf, tek amaçlı.
Girdi = sipariş nesnesi + db handle; çıktı = 0 veya 1 bildirim (`INSERT OR
IGNORE`). `upsertSiparisler` içine gömülmez (o dosya zaten büyük) → bağımsız
test edilebilir.

**İlk kurulum koruması:** `upsertSiparisler` içindeki mevcut `ilkKurulum`
bayrağı kullanılır. İlk toplu çekimde geçmiş talepler toplu bildirim olarak
DÜŞMEZ; yalnızca ilk kurulumdan sonraki durum değişiklikleri bildirim olur.

## Arayüz

### Menü ve Rozet (`src/App.jsx`)

Yeni nav öğesi: `{ to: '/bildirimler', label: '🔔 Bildirimler', yetki:
'bildirim_goruntule', el: <Bildirimler /> }` — Online Siparişler'in altında.

Rozet, mevcut `sosyalRozet` deseninin aynısı: 30 sn'de bir okunmamış sayısını
çeken `useEffect` + NavLink'te kırmızı badge.

### Sayfa (`src/pages/Bildirimler.jsx`)

İki bölümlü:

1. **"⚠️ İptal / İade Talepleri"** (üstte, belirgin): `onem='yuksek'`
   bildirimleri kırmızı/turuncu kartlar. Her kartta müşteri, sipariş no, tutar,
   "Siparişe Git" butonu. Okunmamışlar koyu vurgulu.
2. **"Tüm Bildirimler"** (altta): kronolojik liste, sayfalı (mevcut
   `Sayfalama.jsx` + `useSayfalama`).

**Etkileşimler:**
- Bildirime / "Siparişe Git"e tıklama → `okundu=1` + `/online-siparisler`.
- "Tümünü okundu işaretle" butonu.
- Okundu durumu yereldir (bulut senkronu yok — tasarım gereği).

**Container/presentational ayrımı:** `Bildirimler.jsx` veriyi çeker; kart
(`src/components/BildirimKarti.jsx`) saf sunum. Dosyalar < 800 satır.

### IPC Uçları

`src/api/ipc.js` + electron handler'ları:
- `bildirim:liste` (sayfalı)
- `bildirim:sayac` (okunmamış adet)
- `bildirim:okundu(id)`
- `bildirim:tumunuOku`

## Yetki

Yeni yetki kodu: `bildirim_goruntule`.

- **İki dosyada** tanımlanır: `src/auth/izinler.js` + `yetki.js` (yetki mantığı
  tekrarlanır — parite testi mevcut).
- **Supabase `yetki_kodlari`** tablosuna eklenmezse "Özel" rolde toggle
  görünmez → `supabase/09_bildirim_yetki.sql` üretilip **yayından önce
  çalıştırılmalı**.
- Varsayılan: süper admin / yönetici / personel görebilir.

## Test

vitest:
- `bildirim-uret.test.js`: durum→tip eşlemesi; dedup (aynı durum tekrar
  bildirmez); `ilkKurulum`'da üretmez; talep→kabul geçişinde yeni bildirim.
- `yetki-paritesi.test.js`: `bildirim_goruntule` iki kaynakta da var.
- Saf modül + mock db (CJS require mock tuzağından kaçınmak için).

## Dosya Listesi

**Yeni:**
- `electron/ikas/bildirim-uret.js` + `bildirim-uret.test.js`
- `electron/db/bildirimler.js` (tablo + CRUD)
- `src/pages/Bildirimler.jsx`
- `src/components/BildirimKarti.jsx`
- `supabase/09_bildirim_yetki.sql`

**Düzenlenecek:**
- `electron/ikas/index.js` (upsert döngüsüne üretim bağlanır)
- `electron/db/senk-sema.js` / migration (yeni tablo)
- IPC kayıt dosyası + `src/api/ipc.js`
- `src/App.jsx` (nav öğesi + rozet)
- `src/auth/izinler.js` + `yetki.js` (+ parite testi)

## Kapsam Dışı (YAGNI)

Yeni sipariş / düşük stok / kargo bildirimleri. Altyapı (`tip`, `onem`) bunları
destekler; şimdi üretilmez. İleride yalnızca yeni bir üretici eklenir.
