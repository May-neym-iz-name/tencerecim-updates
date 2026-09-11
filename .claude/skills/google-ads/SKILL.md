---
name: google-ads
description: Tencerecim Google Ads işlerinin ZORUNLU ön adımı. Kampanya açma/düzenleme/durdurma, teklif stratejisi seçimi, tROAS/tCPA hedefi belirleme, bütçe değiştirme, anahtar kelime ve negatif kelime işleri, arama terimi temizliği, dönüşüm takibi kurulumu/teşhisi, Merchant Center feed, PMax/Shopping/Search/Demand Gen yapısı, Google Ads API, performans yorumlama ve "reklam işe yarıyor mu" sorularında kullan. Turkce tetikleyiciler - google ads, kampanya, teklif, tROAS, tCPA, butce, anahtar kelime, negatif kelime, arama terimi, donusum takibi, PMax, Shopping, Search kampanyasi, Merchant Center, feed, reklam performansi, ROAS dustu, gosterim payi.
---

# Google Ads — Tencerecim

## İlk hamle (atlanmaz)

**`docs/google-ads-reference.md` dosyasını oku.** 12 bölüm; ilgili bölümü aç, ezberden konuşma.
Bu skill o dosyanın yerine geçmez — ona **giden kapıdır** ve karar disiplinini dayatır.

| Bölüm | Ne zaman |
|---|---|
| §1 Ölçüm hiyerarşisi + veri sağlığı kapısı | **Her karardan önce** |
| §2 Kampanya tipleri | Hangi tip? · yapı kurma |
| §3 Teklif stratejileri + eşikler | Hangi strateji? · geçiş vakti mi? |
| §4 Hedef ROAS aritmetiği | tROAS/tCPA sayısı (5 adım) |
| §5 Dönüşüm takibi | Kurulum/arıza · Ads↔GA4 farkı |
| §6 Merchant Center / feed | PMax veya Shopping'e dokunurken |
| §7 Tarihli değişiklikler | **Bir mekaniğe dayanmadan önce** |
| §8 Tencerecim'e özel riskler | Hesap durumu · Limited Ad Serving |
| §9 Karar kuralları + izleme temposu | Bütçe/hedef değişimi |
| §10 Negatif kelime kuralları | Arama terimi temizliği |
| §11-12 Ölçülemeyenler + kırmızı bayraklar | Test önerisi · şüpheli çıkarım |

## Karar vermeden önce sorulacak 3 soru

1. **Hangi basamaktan konuşuyorum?** Panel ROAS'ı 6. basamaktır — pacing göstergesi, karar
   dayanağı değil. 4. basamağın altıyla bütçe kararı verilmez.
2. **Bu rakam gerçek mi?** Dönüşüm değeri gerçek bir **ikas siparişine** karşılık geliyor mu?
   ≥2x fark = performans sorunu değil **ölçüm arızası**. Termometre bozukken ilaç verme.
3. **Pencere yeterli mi?** Karar penceresi **30 gün** (tercihen 60). Dönüşüm gecikmesi
   ölçülmediyse son N günün verisi zaten eksiktir.

## Sert kurallar (ihlal edilmez)

- **tROAS/tCPA yasağı** — brüt marj + ölçüm şişkinliği + dönüşüm gecikmesi ölçülmeden hedef
  konmaz. Üçü de eksik → Maximize Clicks/Conversions ile veri biriktir.
- **Bütçe ve hedef aynı anda değişmez.** Hedef ≤%10-15/seferde → 3-4 hafta dokunma.
  Bütçe ≤%20-30, 3-4 günde bir.
- **Geniş eşleme yalnız Smart Bidding ile.** Manual CPC / Maximize Clicks + broad = bütçe yakar.
- **Yalnız makro dönüşüm "Birincil."** (Satın Alma). Sepete ekleme/görüntüleme ikincil.
- **50 dönüşüm/ay eşiği kampanya başınadır** — tutamayacaksan bölme.
- **Benchmark hedef değildir.** Referans: kendi marjından türeyen başabaş + kendi 90 günlük ortalaman.
- **Negatif kelime:** geniş eşleme negatif ÖNERME; tam/öbek eşleme kullan; **gerçek Arama
  Terimleri Raporu'ndan** çıkar, tahminden değil.
- **Panelde geri alınamaz işlem** (kampanya silme, hedef/bütçe değişimi, dönüşüm eylemi
  değiştirme) öncesi kullanıcıdan onay al.

## Devralınan bilginin sınırı

`~/.claude/skills/reklam-karar-bilimi` **başka bir reklamverene** ait (Asaf Gastro, Ticimax,
yüksek biletli B2B). **Yöntemi devral, sayıları ASLA:** o hesabın marjı, şişkinlik
katsayısı, hedef ROAS'ı ve Ticimax sipariş kaydı — hiçbiri bizim değil. Tencerecim = düşük biletli tüketici
e-ticareti, ikas altyapısı.

## Nihai ölçüt

```
Aylık brüt kâr (ciro × marj) − reklam harcaması > 0
```
Platform ROAS'ı **gösterge**; bu **gerçek**.

## Bakım

`docs/google-ads-reference.md` §7 hızlı bayatlar. Tarihi geçmiş bir maddeye dayanacaksan
kaynağı aç, teyit et, dosyadaki damgayı güncelle.
