# Kargo Durum Bildirimleri + Anlık Köşe Kutusu — Tasarım (2026-07-28)

## Amaç
Kargo durum değişiklikleri ("Teslim Edildi", "Özel Durum/Sorun") Bildirimler alanına
kendiliğinden düşsün; hangi sekmede olursa olsun köşede anlık bir kutu belirsin,
rozet artsın ve YALNIZ önemlilerde ses çalsın (asafchat'teki akıcı his).

## Kararlar (kullanıcıyla netleştirildi)
- Bildirim üretilen olaylar: **teslim** (normal önem) + **özel durum/sorun** (yüksek önem).
  "Gönderildi" ve ara durumlar bildirim ÜRETMEZ (kalabalık olur).
- Ses: yalnız YÜKSEK önemli okunmamış sayısı artınca (iptal/iade talepleri + kargo sorunları).
  Rutin teslimler sessiz rozet.
- Görünüm: sağ üstte beliren kutu; tıklayınca Bildirimler sekmesi açılır.
- UPS yoklama aralığı 30 dk → **10 dk** (asafchat'in kendi cron'u 30 dk — bununla ondan taze).
  Cloudflare merkezi yoklayıcı BİLİNÇLİ ertelendi (YAGNI): tazelik kazandırmaz, tek gerçek
  avantajı "uygulama kapalıyken birikme" ve mağazada gün boyu en az bir PC açık.

## Mimari
1. **Üretim** (`electron/ups/takip.js`): yoklayıcı bir kargoyu teslim/özel'e çevirdiğinde
   `bildirimler` tablosuna kayıt ekler. Dedup anahtarı `kargo:<takip_no>:<durum>` —
   INSERT OR IGNORE ile aynı olay iki kez bildirilmez (elle "Durumları Yenile" dahil).
   `bildirimler` tablosu senkronsuz/yereldir; her PC kendi yoklamasından kendi bildirimini
   üretir → iki PC'de de ses/rozet çalışır, çifte kayıt sorunu yoktur.
2. **Anlık iletim**: yoklama turu yeni bildirim eklediyse main süreci tüm pencerelere
   `bildirim:yeni` olayı gönderir (`{adet, yuksek, ornekler}`). Elle tetiklenen turda da
   aynı yol çalışır. Electron yoksa (testler) sessizce atlanır.
3. **Görünüm** (`src/App.jsx`): `bildirim:yeni` dinlenir → rozet/sayaç anında tazelenir +
   köşede react-hot-toast özel kutusu gösterilir (tıkla → `#/bildirimler`).
   `bildirim:sayac` artık `{toplam, yuksek}` döner; ses kararı `yuksek` artışına bakar
   (eski davranış: her artışta ses — iptal/iade hepsi yüksek olduğu için fiilen aynıydı).
   30 sn'lik sayaç yoklaması emniyet ağı olarak kalır.

## Kapsam dışı
- Cloudflare Worker merkezi yoklayıcı (ihtiyaç doğarsa 2. etap; üretim mantığı aynı kalır)
- Windows işletim sistemi bildirimi
- ikas iptal/iade bildirimlerinin üretim yolu (değişmiyor; yalnız ses kuralı ortaklaşıyor)

## Test
- Bildirim üretim yardımcının birim testleri (dedup, önem, yalnız teslim/özel)
- Mevcut takip/bildirim testleri kırılmadan geçmeli
