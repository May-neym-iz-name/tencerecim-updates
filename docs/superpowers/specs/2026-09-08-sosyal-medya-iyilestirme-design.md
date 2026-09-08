# Sosyal Medya İyileştirme — Tasarım (08.09.2026)

**Karar:** Ayrı sosyal medya uygulaması İPTAL. Sosyal medya alanı mevcut mağaza programında
(Electron + React, `src/pages/SosyalMedya.jsx`, `electron/meta/*`, `electron/db/sosyal-*.js`)
derli toplu ve kullanımı kolay hale getirilecek. `Desktop\tencerecim-sosyal` projesine dokunulmaz.

**Bağlı dış engel:** DM yanıtı 24 saatle sınırlı. Human Agent özelliği için Meta App Review
başvurusu 08.09.2026'da gönderildi (submission 1551959169432965, ~20 gün). Onay gelince kod
değişikliği gerekmez; `index.js` zaten kod 10'da `HUMAN_AGENT` etiketiyle yeniden dener.

## Kapsam — 6 başlık

### 1. Niyet ayrımı ve iki yollu otomasyon

**Veri.** `sosyal_mesajlar.niyet TEXT` — değerler: `fiyat` · `soru` · `etiket` · `ovgu` ·
`emoji` · `gurultu` · NULL (sınıflanmamış). `senk-sema.js`'e **aynı commit'te** eklenir
(sosyal_mesajlar senkronlanmıyor ama şema listesi ve testler tutarlı kalmalı).

**Sınıflayıcı.** `electron/db/niyet.js` — saf fonksiyon `niyetBul(metin) → niyet`. Kural
tabanlı, model yok. Türkçe harf katlaması (`tr-arama.js`'teki `trNormal`) + fiyat iskeleti
`f[iy]{1,2}[aoy]?[st]` (*fiyqt, fiyst, foyat* yakalar) + "kaç para / ne kadar / ücret /
tl / lira" kalıpları. **Fiyat tarafı GENİŞ**: fiyat ile soru arasında tereddütte `fiyat`
kazanır (hata asimetrik: fiyat sorusu "soru" sayılırsa müşteri cevapsız kalır; tersi ucuz).
Sıra: boş/yalnız emoji → `emoji`; yalnız `@etiket` → `etiket`; fiyat kalıbı → `fiyat`;
soru işareti veya soru kalıbı ("var mı, nerede, nasıl, kaç, hangi, uygun mu") → `soru`;
övgü kalıbı ("harika, süper, ellerinize sağlık") → `ovgu`; kalan → `gurultu`.

**Yazım.** Çekim anında `_upsertMesaj` yeni satırda `niyet` yazar (yalnız `tur='yorum'`,
`yon='gelen'`). Geçmiş için tek seferlik toplu iş `niyetToplu()` (Ayarlar → Sosyal → "Geçmişi
sınıfla" düğmesi; 133 bin satır, tek transaction, ~saniyeler).

**Otomasyon kapısı.** `_adaylar()` iki grup döner: `niyet='fiyat'` → mevcut ürün kartı akışı
(değişmez); `niyet='soru'` → yeni **soru yanıtı** DM'i. Diğer niyetlere hiçbir şey gitmez.
**Seçim 6B — tek genel metin.** Metin ve aç/kapat anahtarı `meta_ayarlar` anahtar-değer
tablosunda: `soru_yaniti_metin`, `soru_yaniti_aktif` ('0'/'1', varsayılan '0' = kapalı).
Ayarlar → Sosyal'de düzenlenir (ayarlar Supabase üzerinden senkronlanır, `ayar-senk.js`
kalıbı). Gönderi panelinde yalnız "bu gönderide fiyat dışı sorulara yanıt gönderme"
kutusu → `sosyal_otomasyonlar.soru_yaniti_kapali INTEGER DEFAULT 0`; **`senk-sema.js` aynı
commit'te**. Varsayılan metin: *"Merhaba, sorunuzu aldık 🙏 Temsilcimiz en kısa sürede size
dönecek."* Yayında **kapalı** başlar.

**Meta kısıtı.** Yoruma özel yanıt (private reply) yorum başına TEK seferliktir. Soru
yanıtı DM'i bu hakkı harcar; temsilcinin devam DM'i aynı konuşmaya `recipient.id` ile
gider (index.js:443 akışı). Bu yüzden soru yanıtı gönderildiğinde dönen `recipient_id`
(IGSID) yorum satırına `ozel_mesaj_alici` olarak yazılır (mevcut alan varsa o kullanılır).

### 2. "Sorular" sekmesi

**Seçim 1A — liste görünümü.** Sosyal Medya sayfasında yeni üst sekme **Sorular** (rozetli): yalnız `tur='yorum' AND yon='gelen' AND
niyet='soru' AND durum IN ('yeni','okundu')`. Satır: gönderi görseli + başlığı
(`sosyal_gonderiler`), kişi adı (ayrı satır, kalın, `marka-900`), soru metni, zaman, "🤖
teşekkür gitti" rozeti (`ozel_mesaj_tarihi` doluysa). Cevaplanınca (`durum='cevaplandi'`)
listeden düşer.

Satır eylemleri: **DM'den yanıtla** (varsayılan; konuşma paneli açılır, gönderim
`index.js` DM yolu: RESPONSE → kod 10'da HUMAN_AGENT → ikisi de düşerse `_pencereHatasi` +
"yoruma açık yanıt yaz" kısayolu) · **Yoruma açık yanıt** · **Okundu** · **Üstlen**.

### 3. Rozet: yalnız fiyat dışı yeni yorum

Instagram yorum rozeti `OKUNMAMIS_SAYAC` yerine `niyet='soru'` koşullu sayaç kullanır
(`sosyal-filtre.js`'e `SORU_OKUNMAMIS_SAYAC`). Fiyat/etiket/övgü yorumları rozeti
şişirmez. Eski "Yorumlar" görünümü kalır (tüm yorumlar, süzgeçle).

### 4. Gelen mesajlar: "Bana atananlar"

**Seçim 2A.** Konuşma listesinin en üstünde bölümlü anahtar **Tümü (n)** · **Bana
atananlar (n)**, kendi sayaçlarıyla. Satırın sağında üzerine gelince beliren **Üstlen**
(atanmışsa **Bırak**); mevcut `atanan_kullanici` + `konuAta`. Yeni tablo yok.

### 5. Boş balonlar

- **Bizim ürün kartımız:** kart gönderiminde (otomasyon + elle) yerel kayda
  `ek_tur='urun_karti'`, `ek_baslik` = ilk ürün adı (+ "ve N ürün"), `ek_gorsel` = ilk
  ürün görseli, `ek_link` = ilk ürün linki, `metin` = kartın alt başlığı, `ham_ek` = kart
  yükünün tamamı (tüm ürünler). **Seçim 3B — tam kart:** balon Instagram'daki görünümün
  aynısını çizer (büyük görsel 240px, ad, fiyat satırı, "Siteden Al" düğmesi); birden çok
  ürün yatay karusel, ilk kart tam, kalanlar "+N" kısaltmalı. Çekimde Meta'dan dönen kendi kart mesajımız
  (`attachments.template`) tanınırsa aynı `ek_tur`'a eşlenir.
- **Ölü hikaye:** `ek_tur IN ('hikaye_yanit','hikaye_bahsi')` ve görsel yüklenemezse
  (img onError) balonda "📖 Hikayeye yanıt" başlığı + "hikaye silinmiş" yazılı gri yer
  tutucu kutu + varsa müşteri metni. Metin yoksa balon yine bu etiketle dolu kalır.
- **Bilinmeyen tipler:** `mesajEki()` null döndüğünde ve `message` boşsa ham JSON
  `sosyal_mesajlar.ham_ek` (yeni TEXT sütun, senk dışı) alanına yazılır; bir hafta sonra
  ölçülüp yeni `ek_tur` değerleri eklenir. Balonda "📎 İçerik görüntülenemiyor" gösterilir.

### 6. Kaynak süzgeci

**Seçim 4B.** Süzgeç çubuğunun sağında açılır kutu **Kaynak: Tümü ▾** (Hikaye yanıtı ·
Gönderi paylaşımı · Normal). "Tümü" seçiliyken liste kaynağa göre **gruplu başlıklarla**
(📖 HİKAYE YANITLARI (n) · 🔁 GÖNDERİ PAYLAŞIMLARI (n) · 💬 NORMAL (n)) gösterilir; tek
kaynak seçilince düz liste. SQL: konuşmanın herhangi bir gelen mesajında ilgili `ek_tur`
(`MAX(CASE WHEN ek_tur IN (...) THEN 1 ELSE 0 END)`), `sosyal-filtre.js`'e eklenir; konuşma sorgusu `kaynak` sütunu döner, gruplama arayüzde.

### 7. Temsilci elle ürün kartı gönderir

**Seçim 5B.** Sohbet panelinin sağında kalıcı dar panel **Hızlı ürünler** (200px): üstte
arama kutusu (mevcut `OtomasyonUrunSecici` arama mantığı, sunucuda), altında son
gönderilen 5 ürün/set (`sosyal_mesajlar` `ek_tur='urun_karti'` kayıtlarından türetilir,
ayrı tablo yok). Bir ürüne tıklayınca kart hemen gider (onay yok, geri alınamaz olduğu
için satırda 1 sn "Gönderildi ✓" geri bildirimi). Panel Ayarlar'dan gizlenebilir. Seçilen ürünler `kartMesajiOlustur()` ile aynı yükle DM'e (`recipient.id`) veya
yorum sekmesinden yoruma özel yanıt (`recipient.comment_id`) olarak gider. Fiyat siteden ve
indirimli (sellPrice değil, hafıza: ig-yorum-karti). Gönderim madde 5 kaydıyla balonda görünür.
Kart ile metin aynı mesajda gitmez (ölçüldü); metin varsa ayrı ikinci mesaj olarak gider.

## Veri değişiklikleri (tek liste)

| Tablo | Sütun | Not |
|---|---|---|
| sosyal_mesajlar | niyet TEXT | senk dışı tablo, ama senk-sema.js listesi + testler |
| sosyal_mesajlar | ham_ek TEXT | bilinmeyen ek tipleri için |
| sosyal_otomasyonlar | soru_yaniti_kapali INTEGER DEFAULT 0 | **senk-sema.js aynı commit** |
| meta_ayarlar | soru_yaniti_metin, soru_yaniti_aktif (anahtar-değer) | ayar senkronu |

`ALTER TABLE ... ADD COLUMN` try/catch kalıbı (database.js:779 emsali).

## Test

- `niyet.test.js`: kalıp testleri + **gerçek veri dağılım testi** (89.409 yorumluk
  fikstürden örneklenmiş 500 satır; fiyat payı %60-66 bandında) + mutasyon testi (iskelet
  bozulunca kırmızı).
- `sosyal-otomasyon.test.js`: `_adaylar` yalnız fiyat/soru döner; etiket/övgü dönmez.
- `sosyal-filtre.test.js`: soru sayacı, kaynak süzgeci, bana-atanan.
- `kart-mesaj.test.js`: elle gönderim yükü otomasyonla birebir aynı.
- `sosyal-mesajlar.test.js`: kart kaydı `ek_tur='urun_karti'`.

## Yayın sırası (her biri ayrı patch)

1. Niyet sütunu + sınıflayıcı + toplu iş + aday kapısı (soru yanıtı KAPALI).
2. Sorular sekmesi + rozet + Bana atananlar.
3. Boş balonlar + kaynak süzgeci.
4. Elle ürün kartı.

## Arayüz

**Kullanıcı seçimleri (08.09): 1A 2A 3B 4B 5B 6B** — önizleme dosyasındaki işaretli
varyantlar. Palet `tailwind.config.js`: zemin beyaz, `marka-900` mürekkep, `krem-400` yalnız vurgu.
Ad metinle aynı satırda değil (hafıza: sosyal-medya-arayuz). Seçenekli HTML önizleme
`docs/superpowers/specs/2026-09-08-sosyal-medya-onizleme.html` — kullanıcı bölüm bölüm seçer,
seçimler bu dosyaya işlenir.
