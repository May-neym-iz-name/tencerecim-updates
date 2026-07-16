# UPS Otomatik Teslim Durumu — Tasarım

**Tarih:** 2026-07-16
**Durum: İPTAL — uygulanmadı. Kuru tarama özelliğin gereksiz olduğunu gösterdi.**

> ## İptal gerekçesi (2026-07-16)
>
> Kuru tarama gerçek veriyle çalıştırıldı. Sonuç: **boşluk yok, köprüye gerek yok.**
>
> Siparişe bağlı, iptal olmayan tüm gönderi kargoları (tarih sınırı yok):
> ```
> Toplam                                : 20
> UPS teslim + ikas teslim (uyumlu)     : 5    <- ikas hepsini KENDİ yazmış
> UPS teslim + ikas DEĞİL  (BOŞLUK)     : 0    <- düzeltilecek sipariş yok
> UPS numarayı tanımıyor                : 15   <- kurye okutmamış, bkz. aşağıda
> ```
> Tüm zamanlarda 333 sipariş `DELIVERED`, 330'unda ikas'ın takip no'su dolu.
> ikas'ın kendi UPS entegrasyonu takip edip durumu yazıyor; bizim polling'imiz geri çekiyor.
> Köprü, ikas ile aynı alana yazan ikinci bir yazıcı olurdu.
>
> **Yan kazanımlar:**
> - UPS takip servisi + `StatusCode='2'` eşlemesi **ampirik doğrulandı** (teslim olmuş siparişler
>   kod=2 + gerçek şube/zaman döndürdü). İleride gerekirse eşleme hazır.
> - `TRACKING NUMBER NOT FOUND (kod 13)` = kurye henüz okutmamış; hata değil.
> - Kalıcı referans `docs/ups-api-reference.md` yazıldı (kod tabloları .xls'te kilitliydi).
> - `kargolar.tip` NULL tuzağı bulundu: `tip='gonderi'` filtresi 64 eski kaydı sessizce eliyor.
> - **Yeni sorun:** siparişe bağlı 20 kargonun 15'i UPS'e hiç verilmemiş (en eskisi 13 gün).
>   Aynı sipariş için biri bizim biri ikas'ın iki irsaliye var → mükerrer irsaliye sorunu, ayrı iş.
>
> Aşağısı iptal edilen tasarımın orijinal metnidir.

---

## Problem

UPS'ten gelen teslim bilgisi hiçbir yere yansımıyor. Sonuç: teslim edilmiş siparişler ikas'ta
"Kargoya Hazır" durumunda takılı kalıyor, elle düzeltiliyor.

Mevcut durum (v1.2.108):
- `kargo:takip` IPC'si (`electron/ups/kargo.js:275`) UPS'ten durumu çekip `kargolar.son_durum`'a
  yazacak şekilde yazılmış, ama **hiçbir yerden çağrılmıyor** → kolon bugüne kadar hiç dolmadı.
- `ikas:siparis-paket-durum` (`electron/ikas/ekstra.js:274`) ikas'a `DELIVERED` yazabiliyor, ama
  yalnızca elle tetikleniyor (`OnlineSiparisler.jsx:220`).
- Bu ikisini bağlayan hiçbir kod yok.

## Çözüm

`electron/ups/durum-senk.js` — UPS takip durumunu periyodik olarak çekip teslim edilenleri ikas'a yazan köprü.

### Neden ayrı dosya

`kargo.js` zaten 368 satır (gönderi/iptal/iade/pickup). Durum senkronu ayrı bir sorumluluk: kendi
zamanlaması, kendi hata toleransı var ve `ups/` ile `ikas/` arasında köprü kuruyor. Mevcut
dosyalardan birine koymak ikisini de bulaştırır.

### Durum eşlemesi

Kaynak: `docs/ups-api-reference.md` §1.

| UPS `StatusCode` | Eylem |
|---|---|
| `2` (ALICIYA TESLİM EDİLDİ) | ikas'a `DELIVERED` yaz + yerel `kargo_durumu` güncelle |
| diğer hepsi | yalnız `kargolar.son_durum` / `son_durum_tarihi` yaz, ikas'a dokunma |

**`ProcessDescription1` metnine asla bakılmaz.** Metin iki yönden de yanıltır: `HD` kodu
("TESLİMAT SONRASI ALICI HASAR BİLDİRDİ") içinde "teslim" geçer ama `StatusCode=3`'tür;
`S7` ("ALICI KENDİSİ GELİP ALACAK") teslim değildir ama metninde "teslim" geçmez.

**Başarısızlıklar ikas'a yazılmaz** (karar). "Teslim edilemedi" çoğunlukla geçicidir (alıcı tatilde,
1. uğrama) — ikas'a yazmak siparişi yanlış kapatır, sonra kurye tekrar uğrayıp teslim eder.
Bilgi `son_durum`'da durur, Kargo sekmesinden görülür.

### Akış

Her turda:

1. **Aday seçimi (SQL):** `tip='gonderi'` AND `durum != 'iptal'` AND `takip_no` dolu AND bir ikas
   siparişine bağlı AND `olusturma_tarihi >= now - 30 gün` AND bağlı siparişin `kargo_durumu`
   terminal değil (`DELIVERED`/`CANCELLED`/`REFUNDED` değil).
2. **Tek `trackingLogin`** (`soap.js:301`), sonra sırayla `trackLast`. Session 5 dk geçerli →
   süre aşılırsa yeniden login.
3. **Her kargo için** `son_durum` + `son_durum_tarihi` yazılır (kod ne olursa olsun).
4. **`durumKodu === '2'` ise** → `updateOrderPackageStatus` ile ikas'a `DELIVERED`, ardından yerel
   `online_siparisler.kargo_durumu = 'DELIVERED'`.

### Idempotency

1. adımdaki terminal filtresi mükerrer yazımı önler. ikas'a `DELIVERED` yazılınca bir sonraki ikas
   polling'i (`main.js:94`, 90 sn) onu yerele geri getirir, o da kargoyu aday listesinden düşürür.
   Döngü kendini kapatır.

### Neden ikas'a yazmak zorunlu

`main.js:94` her 90 saniyede ikas'tan `orderPackageStatus`'u çekip yerele yazıyor
(`index.js:269-271`). Yalnız yerele yazsak 90 saniye sonra ikas'ın eski değeri ezer. ikas bu alanın
tek doğru kaynağı.

### Zamanlama

`main.js`'te, ikas polling'inin yanında, **30 dakikada bir**. Kargo durumu saatlik değişen bir şey;
her 90 saniyede onlarca SOAP sorgusu + her sorguda ayrı login gereksiz yük.

### Kuru çalıştırma (ilk tur)

İlk tarama `ikas`'a **hiçbir şey yazmaz** — ne bulduğunu raporlar (kaç kargo teslim, kaç sipariş
düzelecek). Kullanıcı listeyi onaylayınca gerçek yazım yapılır.

Bu turun ikinci faydası: **ikas'ın kendi UPS entegrasyonu zaten durum yazıyor mu** anlaşılır.
(İpucu: ikas UPS entegrasyonu takip no'yu `trackingNumber` yerine `barcode` alanına yazıyor —
`index.js:143-159`. Yani entegrasyon aktif olabilir.) Eğer ikas zaten `DELIVERED` yapıyorsa bu
köprü gereksizdir ve iptal edilir.

### Hata toleransı

Bir kargonun sorgusu patlarsa döngü devam eder, hata sayılır ve loglanır. Arka plan işi, kullanıcıyı
bloklamaz. UPS servisi tamamen kapalıysa tur sessizce biter, 30 dk sonra tekrar denenir.

## Kapsam dışı

- `kargo:pickup` (kurye çağırma) ve `kargo:etiket-yazdir` ölü kodları — ayrı iş.
- `UNABLE_TO_DELIVER` yazımı — bilinçli olarak dışarıda.
- Mağaza satışlarına bağlı kargolar (`satis_id`) — ikas siparişi olmayanlar için yazacak yer yok;
  yine de `son_durum` dolar.

## Test

- Kuru tur çıktısı gerçek UPS yanıtlarıyla doğrulanır.
- Teslim edildiği bilinen bir takip no'nun `durumKodu = '2'` döndürdüğü teyit edilir.
- Kuru turda ikas'a hiç yazılmadığı doğrulanır.
