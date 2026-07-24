# İptal/İade Talebi Görünürlüğü — Tasarım Dokümanı

**Tarih:** 2026-07-24
**Durum:** Onaylandı
**Konu:** Yayındaki Bildirim Merkezi'ni (v1.2.130) genişletme: iptal/iade talepleri ana ekranda ve Online Siparişler'de fark edilir olsun; mevcut (geçmiş) talepler de bildirimlere düşsün.

## Amaç

Kullanıcı bir iptal/iade talebi geldiğini **aramadan fark etmeli** ve tek tıkla
ilgili siparişlere ulaşmalı. Ayrıca özellik yayınlanmadan önce oluşmuş ve hâlâ
bekleyen talepler de bildirimlerde görünmeli.

## Kararlar (netleştirildi)

- **Ana ekran:** tıklanabilir KPI kartı (sayı).
- **Talep kapsamı:** yalnız **bekleyen** talepler — `REFUND_REQUESTED` ve
  `CANCEL_REQUESTED` (sipariş `durum` VEYA paket `kargo_durumu` alanında).
  Kabul/red (`REFUND_REQUEST_ACCEPTED`, `*_REJECTED`) bu sayıma dahil DEĞİL.
- **Online Siparişler:** pasif filtre açılırı değil, **dikkat çeken bildirim
  butonu** — kullanıcı aramadan görsün.

## 1. Ana Ekran KPI Kartı

`electron/db/panel.js` + `src/pages/Panel.jsx`:

- Panel verisine `bekleyenTalepSayisi` eklenir:
  `online_siparisler`'de `durum IN (...)` VEYA `kargo_durumu IN (...)` olan
  (bekleyen talep) sipariş adedi.
- Mevcut KPI kartlarının yanına **"İptal/İade Talebi"** kartı: sayı; >0 ise
  kırmızı, 0 ise gri.
- Tıklama (yetki `online_siparis_goruntule`) → `/online-siparisler?talep=1`.

## 2. Online Siparişler — Bildirim Butonu

`src/pages/OnlineSiparisler.jsx`:

- Sayfa üstünde **belirgin kırmızı bildirim butonu**:
  `🔔 <N> İptal/İade Talebi — görüntülemek için tıklayın`
- **Yalnız N > 0 iken görünür** (0 ise hiç render edilmez). Varlığı tek başına
  uyarıdır; sürekli duran bir buton gürültüye dönüşür ve fark edilmez.
- Kırmızı zemin + hafif `animate-pulse` ile göze çarpar.
- **Tıklama** → `talepFiltre` açılır, liste yalnız bekleyen talepli siparişleri
  gösterir; buton "aktif" görünür. Tekrar tıklayınca filtre kalkar.
- Sayı, sayfada **zaten yüklü** siparişlerden hesaplanır (ek sorgu/IPC yok).
- Sayfa açılışında URL'de `?talep=1` varsa filtre **otomatik aktif** gelir
  (`useSearchParams`) → Panel kartından ve bildirimden filtreli giriş.
- Mevcut "Filtreleri temizle" davranışı `talepFiltre`'yi de sıfırlar.

**Filtre koşulu (tek kaynak, paylaşılan yardımcı):**
`bekleyenTalepMi(siparis)` = `[durum, kargo_durumu]` içinde
`REFUND_REQUESTED` veya `CANCEL_REQUESTED` var mı.

## 3. Mevcut Talepler Bildirimlerde

`electron/ikas/bildirim-uret.js`:

- **Tek seferlik geri-tarama** `mevcutTalepleriBildir(db)`: yerel
  `online_siparisler` tablosunda bekleyen talep durumundaki siparişler taranır,
  her biri için mevcut `_ekle` ile bildirim üretilir. `INSERT OR IGNORE` +
  `dedup_anahtar` sayesinde mükerrer olmaz.
- `senk_durum` tablosunda `'bildirim_talep_backfill'` bayrağıyla **bir kez**
  koşar (emsal: `kargolar_restamp`).
- `ilkKurulum` koruması AYNEN kalır: o, ilk **ikas toplu import**ını korur; bu
  tarama YEREL tablodan çalışır ve yalnız *bekleyen* talepleri alır.
- Çağrı yeri: ikas sipariş çekiminin başında (mevcut periyodik akış).

**Neden gerekli:** bildirim algılaması her çekimde çalışır ama çekim
`updatedAt` imleciyle **artımlıdır**. v1.2.130'dan önce talep durumuna geçmiş
ve o gün bu yana güncellenmemiş siparişler yeniden çekilmez → hiç bildirim
üretmezler. Yerel tabloyu bir kez taramak bu boşluğu kapatır.

## 4. Bildirimden Filtreli Geçiş

`src/pages/Bildirimler.jsx`: iptal/iade bildirimine (veya "Siparişe Git")
tıklanınca `/online-siparisler` yerine **`/online-siparisler?talep=1`**.

## Test

vitest (saf fonksiyon deseni — DB/electron'suz):
- `bekleyenTalepMi`: `REFUND_REQUESTED`/`CANCEL_REQUESTED` durumu `durum` veya
  `kargo_durumu` alanındayken true; kabul/red ve sıradan durumlarda false;
  null/boş alanlarda patlamaz.
- Mevcut `bildirim-uret.test.js` korunur.

## Dosya Listesi

**Yeni:**
- `src/utils/talep.js` (`BEKLEYEN_TALEP_DURUMLARI`, `bekleyenTalepMi`) + testi

**Düzenlenecek:**
- `electron/db/panel.js` (`bekleyenTalepSayisi`)
- `src/pages/Panel.jsx` (KPI kartı)
- `src/pages/OnlineSiparisler.jsx` (bildirim butonu + `talepFiltre` + `?talep=1`)
- `src/pages/Bildirimler.jsx` (filtreli navigasyon)
- `electron/ikas/bildirim-uret.js` (`mevcutTalepleriBildir` geri-tarama)
- `electron/ikas/index.js` (geri-taramayı çekim başında bir kez çağır)

## Kapsam Dışı (YAGNI)

Talebi uygulama içinden onaylama/reddetme (ikas'a yazma), talep başına not,
kabul/red durumlarının sayıma dahil edilmesi, e-posta/WhatsApp bildirimi.
