# Google Ads — Tencerecim Referansı

> **Damga:** 04.09.2026 taraması. Kaynaklar: `~/.claude/skills/ads*` kütüphanesi (13.04.2026),
> `reklam-karar-bilimi` skill'i (20.07.2026) + Ağustos–Eylül 2026 web doğrulaması.
> **Bayatlama uyarısı:** §7'deki tarihli değişiklikler HIZLI bayatlar — karara dayanak yapmadan
> önce kaynağı aç. Geri kalan yavaş bayatlar.

## ⚠️ Devralınan bilginin sınırı

`reklam-karar-bilimi` skill'i **başka bir reklamveren için** kalibre edilmiş (Asaf Gastro —
endüstriyel mutfak ekipmanı, Ticimax, yüksek biletli B2B; kendi ölçümleriyle kalibre).

| Devralınır | Devralınmaz |
|---|---|
| Ölçüm hiyerarşisi, karar kuralları, deney tasarımı, hedef aritmetiği **yöntemi** | O hesabın marjı, şişkinlik katsayısı, hedef ROAS'ı ve kampanya kimlikleri |
| "Neyi ölçemezsin" analizi | "Yüksek biletli B2B" tavsiye sıralaması (PMax %30-40 vb.) |

**Tencerecim farkı:** düşük biletli tüketici e-ticareti (tencere/tava), ikas altyapısı,
yüksek adet potansiyeli. Bu, PMax/Shopping ağırlığını **artıran** bir profildir.
Kendi marjımız ve kendi şişkinlik katsayımız **henüz ölçülmedi** — §4'e bak.

---

## 1. Ölçüm hiyerarşisi — her kararın çapası

```
0. VERİ SAĞLIĞI KAPISI                ← önce buradan geç
1. Deney (geo / aç-kapa holdout)      ← tek nedensel kanıt
2. Toplam iş sonucu (MER, brüt kâr)   ← manipüle edilemez
3. MMM                                 ← bizde yok (2-3 yıl veri ister)
4. DDA (veri-güdümlü atıf)             ← kredi paylaştırma sezgiseli
5. Son tık                             ← sadece tarihsel
6. Panel ROAS'ı                        ← PACING göstergesi, karar dayanağı DEĞİL
```

**Kural:** Bir kararı savunurken hangi basamaktan konuştuğunu söyle. 4. basamağın altıyla
bütçe kararı verilmez. Gözlemsel yöntemler deneysel gerçekten sistematik ve büyük sapar
(Gordon vd. 2019, 15 RCT).

### 0. basamak — veri sağlığı kapısı
Bir rakama dayanarak karar vermeden önce:
1. **Bu dönüşüm değeri gerçek bir siparişe karşılık geliyor mu?** → ikas sipariş listesinde ara.
2. **Smart Bidding'i eğiten dönüşüm eylemi DOĞRU olan mı?** → birden fazla satın alma eylemi
   varsa hangisi "sayımda"?
3. **Kullanıcının verdiği olguyu çürütmeyi dene** → GA4/ikas'tan doğrula.

> Panel rakamı ile gerçek sipariş arasında **≥2x fark** varsa bu performans sorunu değil
> **ölçüm arızasıdır. Termometre bozukken hastaya ilaç verme.**

---

## 2. Kampanya tipleri

| Tip | İşlev | Envanter | Zorunlu girdi |
|---|---|---|---|
| **Search** | Beyan edilmiş talebi yakalar | Arama + ortaklar | Anahtar kelime, RSA |
| **AI Max for Search** | Search'ün keywordless genişletmesi | Search ile aynı | Güçlü negatif liste + iyi LP |
| **Performance Max** | Tüm envanter, hedef-odaklı otomasyon | Search, Shopping, Display, YouTube, Gmail, Discover, Maps | Varlık grubu, **feed**, kitle sinyali, dönüşüm verisi |
| **Standard Shopping** | Ürün listeleme + kontrol/şeffaflık | Arama, Shopping sekmesi | Merchant Center feed |
| **Demand Gen** | Talep *yaratma* (üst huni) | YouTube+Shorts, Discover, Gmail, +GDN | Görsel (1.91:1, 4:5, 1:1), video, kitle |
| **Display** | 🔴 **Tasfiye ediliyor** (Oca 2027 yeni açılamaz) | Site/uygulama ağı | — |
| **Smart / Local / VAC** | **ölü** | — | — |

### Bizim profilimiz için önerilen sıralama (düşük biletli tüketici e-ticareti)
1. **Search — markalı**, ayrı kampanya, bütçesi asla kısıtlanmayan, PMax'te brand exclusion ile
   korunmuş. *(Önce artımsallık sorusu: rakip bizim marka kelimemize giriyor mu? Girmiyorsa
   organik tıklamayı satın alıyor olabiliriz — Blake vd. 2015, eBay'de marka aramasının kısa
   vadeli artımsal faydası **sıfır** çıktı.)*
2. **PMax / Shopping — katalog motoru.** Düşük bilette asıl hacim buradan gelir.
   Ön koşulu **feed kalitesi**: garbage in, garbage out.
3. **Search — jenerik** ("granit tencere seti", "döküm tava") — feed'in yakalayamadığı niyet.
4. **Demand Gen** — %10-15, huninin üstü. Ölçüsü assisted conversion, doğrudan ROAS değil.

### Bilinen tuzaklar
- **PMax marka aramasını yer** (Optmyzr, 503 hesap, Şub 2025: hesapların **%91,45'inde**
  Search-PMax çakışması, exact match'te bile). Çözüm: PMax'te **brand exclusions** +
  markalı trafiği ayrı Search kampanyasına kilitle.
- **PMax'te negatif kelimeler yalnız Search ve Shopping envanterine uygulanır** —
  YouTube/Display/Gmail israfını durdurmaz.
- **PMax kitle sinyali hedefleme DEĞİL, tohumdur.** Sert hedefleme gerekiyorsa Demand Gen.
- **Search'te kitle varsayılanı: Observation** (gözlem), Targeting değil.
- **Aşırı bölümleme veriyi açlıktan öldürür** — 50 dönüşüm/ay eşiği **kampanya başınadır**.
  Az sayıda, kalın kampanya.

---

## 3. Teklif stratejileri ve veri eşikleri

| Strateji | Ne yapar | Gereken aylık dönüşüm | Ne zaman |
|---|---|---|---|
| Manual CPC | Teklifi sen koyarsın | 0 | Yeni hesap, teşhis |
| Maximize Clicks | Bütçeyi tıklamaya çevirir, değere kör | 0 | Sadece veri toplama fazı (2-4 hafta) |
| Maximize Conversions | Adet maksimize eder | ~15+ | Hedef koyacak veri yokken köprü |
| Maximize Conversion Value | Ciro maksimize eder | ~15-30 | Bütçe sabit, ciro odaklı |
| tCPA | Hedef edinme maliyeti | Google 30/30 gün; pratikte 50+ | Sipariş değerleri benzerse |
| **tROAS** | Hedef değer/maliyet | **50+ değerli dönüşüm/30 gün** | Sipariş değeri değişkense |

- **ECPC tamamen kaldırıldı** (Mart 2025). Kalırsa FAIL.
- **PMax** her zaman Maximize Conversions / Max Conv Value kullanır.
- **tROAS bir ORTALAMA hedefidir, taban değil** → 30 günlük pencerede değerlendir.
- **tROAS'ı yükseltmek kârlılık artırmaz, envanteri daraltır.** Teklif değil kısıt verirsin.
- **Enflasyonda tCPA bozulur** (nominal TL hedef reel olarak sürekli sıkışır); **tROAS daha doğru araç.**

### Geçiş tetikleyicileri
| Nereden | Nereye | Tetik |
|---|---|---|
| Max Clicks | Max Conversions | 30 günde 15+ dönüşüm |
| Max Conversions | tCPA | CPA std. sapması <%20 (14 gün) + 30+ dönüşüm |
| tCPA | tROAS | 50+ dönüşüm + dinamik değer var |

### Öğrenme fazı
Açılışta/ciddi değişimde 1-2 hafta, tam oturma 4-6 hafta.
**Sarsan olaylar:** hedefi %15-20'den fazla değiştirmek · bütçeyi sert değiştirmek ·
kampanyayı durdurup açmak · dönüşüm eylemini/sayım yöntemini değiştirmek · yapıyı yeniden kurmak.

---

## 4. Hedef ROAS aritmetiği — KANONİK PROSEDÜR

**Adım 0 — Kâr köprüsü kurulu mu?**
`purchase.value` **kâr** taşıyorsa hedef ~%125 mertebesindedir (tROAS = POAS) ve şişkinlik
düzeltmesi gerekmez. Ciro taşıyorsa devam et.

**Adım 1 — Başabaş:** `Başabaş ROAS = 1 / brüt marj`

**Adım 2 — Kâr payını ekle (HAM hedef):**

| Kullanıcı ne diyorsa | Formül |
|---|---|
| *"cironun %5'i kâr kalsın"* | `1 / (marj − pay)` |
| *"başabaşın %25 üstünde çalışayım"* | `Başabaş × 1,25` |

İkisi farklı sorulardır, farklı sayı verirler — karıştırma.

**Adım 3 — 🚨 Google terimine çevir (ATLANAMAZ):**
```
PANELE YAZILACAK = Ham hedef × ölçüm şişkinliği
```
Ham sayıyı panele yazarsan başabaşın ALTINA düşersin.

**Adım 4 — Hedefe kademeli git:** Adım 3 **varış noktasıdır**. Adım büyüklüğü:
fiili ROAS'ın en fazla **%10-15** üstü, sonra **3-4 hafta dokunma**.
*(İstisna: kâr köprüsüne geçiş — birim değişimi, tek hamlede yapılır.)*

**Adım 5 — 17 Ağu 2026 kontrolü:** Kampanya "bütçesiyle sınırlı" ise artık hedefin üstünde
performans göstermeyip **hedefe yakınsar** → hedefi düşük koymanın maliyeti arttı.

```
POAS = (Ciro × marj) / harcama      → 1,0 = başabaş
```

### 🔴 Tencerecim'de HENÜZ ÖLÇÜLMEMİŞ olanlar
| Girdi | Durum | Nasıl ölçülür |
|---|---|---|
| Brüt marj | ❌ bilinmiyor | Alış fiyatı verisi uygulamada VAR (bkz. hafıza: alis-fiyati-calismasi) → ürün kırılımlı ağırlıklı marj hesapla |
| Ölçüm şişkinliği | ❌ bilinmiyor | `Google Ads conversion value ÷ GA4 value` (aynı dönem) |
| Dönüşüm gecikmesi | ❌ bilinmiyor | Ads > Dönüşümler > gecikme raporu |

**Bu üçü ölçülmeden tROAS hedefi konmaz.** Ölçülene kadar Maximize Conversions / Max Conv Value.

### İki ayrı şişkinlik — karıştırma, üst üste binerler
| Tür | Nedir | Nasıl ölçülür |
|---|---|---|
| **Ölçüm şişkinliği** | Google kendi değerini GA4 gerçeğinden şişik raporlar | GAds ÷ GA4 |
| **Artımsallık şişkinliği** | Reklam olmasa da gelecek satışa kredi yazılır | Sadece **deneyle** |

Artımsallık şişkinliği ölçülmediği sürece gerçek başabaş hesapladığından **yüksektir** →
hedefi cömert tutmak muhafazakâr değil, **doğrudur**.

### 💎 En büyük kaldıraç — kâr köprüsü
`purchase.value` alanına **ciro değil brüt kâr** yaz. tROAS doğrudan POAS olur, hedef ~%125'e
iner, sistem düşük marjlı ürünlere bütçe kaydırmayı bırakır.
- ⚠️ `conversion value rules` bunu **YAPAMAZ** (yalnız kitle/konum/cihaz/koşulsuz destekler) →
  marj **mutlaka olay değerinde** gelmeli.
- **Kod gerektirmeyen ikame:** feed'de `custom_label_0 = marj_kusagi` → listing group'a farklı tROAS.
- **Geçiş bir ayar değil, ölçü biriminin değişmesidir:** öğrenme fazını sıfırlar, tek hamlede
  yapılır, öncesinde 30 günlük taban çizgisi yazılır, sonrasında 3-4 hafta dokunulmaz.

---

## 5. Dönüşüm takibi — zorunlu yığın

```
1. Google tag (gtag.js) → tüm sayfalar
2. Enhanced Conversions → hash'li birinci-taraf veri (~%10 daha fazla ölçülen dönüşüm)
3. Consent Mode v2 (Advanced) → AB/EEA zorunlu; global sinyal kurtarma için önerilir
4. Sunucu taraflı (sGTM / API) → veri dayanıklılığı
5. Değer ataması → e-ticarette dinamik değer
```

**Kurallar:**
- Google Ads **yerel** takibi bidding için BİRİNCİL (gerçek zamanlı). GA4 içe aktarımı yalnız gözlem.
- **İkisini birden sayma** = çift sayım.
- Yalnız **makro** dönüşüm (Satın Alma) "Birincil" olsun. Sepete ekleme vb. ikincil.
- **Atıf:** yalnız **DDA** ve **son tık** kaldı (Eyl 2025). Kural bazlı modeller kaldırıldı.
  DDA'da kal ama **nedensel sanma** — bizim ölçeğimizde model büyük ölçüde Google'ın toplu
  önselinden gelir, "kendi verinden öğreniyor" iddiası doğru değil.
- **Dönüşüm penceresi:** e-ticaret 7-30 gün. Gecikme medyanı >14 günse 60-90 güne çıkar.
- **Customer Match:** Arama/YouTube'da yayın için ≥1.000 aktif üye; üyelik süresi max 540 gün.
- **⚖️ KVKK:** Customer Match/ECL = hash'li telefon/e-posta **yüklemek**. Consent Mode v2 web
  tarafını çözer, **yükleme tarafının hukuki dayanağını çözmez.** Ön koşuldur.

### Ads ile GA4 neden tutmaz (%10-30 fark NORMAL)
| Sebep | Detay |
|---|---|
| Tarih ataması | Ads **tıklama gününe**, GA4 **dönüşüm gününe** yazar |
| Pencere | Ads varsayılan 30 gün; GA4 90 gün |
| View-through | Ads sayar, **GA4'te bu kavram YOK** (PMax farkının büyük kısmı buradan) |
| Cihaz arası | Ads Google oturumlu kullanıcıları birleştirir |

**Tek doğru kaynak ikisi de değil: ikas sipariş kaydı.**

---

## 6. Merchant Center / feed — PMax ve Shopping'in ön koşulu

- **Feed kalitesi = kampanya kalitesi.** Optimize edilmemiş feed'le PMax çalıştırmak
  e-ticaretin 1 numaralı hatası.
- Ürün başlığı kalıbı: `[Marka] + [Ürün Adı] + [Özellik] + [Ebat/Renk]`
- `google_product_category` ve `product_type` doldurulmalı (çoğu hesapta boş kalır — en büyük
  tek kaldıraç budur).
- `custom_label_0..4` → marj kuşağı / çok satan / sezon / fiyat rekabeti segmentasyonu.
- **Görsel:** min **500×500 px** zorunluluğu **31 Oca 2027**'de yürürlüğe giriyor.
- **Stokta olmayan ürün:** landing page'de buy button **görünür şekilde gri ve tıklanamaz**
  olmalı (Mart 2026 politikası) — gizlemek yetmez.
- **Content API for Shopping 18 Ağu 2026'da kapandı** → **Merchant API v1**. Ancak
  **scheduled fetch / manuel yükleme / Google Sheets bu kapsamın DIŞINDA** — ikas feed'i
  scheduled fetch ile veriliyorsa etkilenmez.
- Ücretsiz organik listeler **aynı feed'i** kullanır → feed düzeltmesi ücretsiz trafiği de açar.

---

## 7. 🔴 Tarihli değişiklikler — yürürlük takvimi

### Yürürlüğe girmiş (zemin gerçeği)
| Tarih | Değişiklik | Etki |
|---|---|---|
| Mar 2025 | ECPC tamamen kaldırıldı | Kalırsa FAIL |
| Mar 2025 | PMax negatif kelime limiti 100 → **10.000** (kampanya seviyesi) | İsraf kontrolü mümkün |
| Eyl 2025 | Atıfta yalnız **DDA + son tık** kaldı | Kural bazlı modeller yok |
| Nis 2026 | **AI Max for Search** genel kullanıma açıldı | Search'ün keywordless genişletmesi |
| Nis 2026 | VAC → Demand Gen göçü tamamlandı | VAC artık yok |
| 2026 | PMax **kanal-seviyesi raporlama + tam arama terimi raporu** | Kara kutu açıldı |
| **3 Ağu 2026** | Yeni **Campaign-level Broad Match** ve legacy **ACA** oluşturma kapandı | — |
| **17 Ağu 2026** | **Bütçesiyle sınırlı** tROAS/tCPA kampanyaları artık hedefin üstünde performans göstermeyip **hedefe yakınsıyor** | Hedefi düşük koymanın maliyeti arttı → §4 Adım 5 |
| **18 Ağu 2026** | Content API for Shopping kapandı → **Merchant API v1** | Scheduled fetch etkilenmez |
| **Ağu 2026** | **Limited Ad Serving** politikası **tüm Google Ads yüzeylerine** genişledi | ⚠️ §8'e bak |

### Yaklaşan — aksiyon gerektirir
| Tarih | Değişiklik |
|---|---|
| **1-30 Eyl 2026 (ŞU AN)** | Campaign-level Broad Match + ACA kampanyaları **AI Max'e otomatik göç** ediyor |
| **Eyl 2026** | Search ve PMax'in Search kısmından **manuel dil hedefleme ayarı kaldırılıyor** |
| **30 Eyl 2026** | Alkol politikası güncellemesi (bizi ilgilendirmiyor) |
| **15 Oca 2027** | Legacy DSA'lar için hatırlatma bildirimleri |
| **31 Oca 2027** | Feed görselleri için **500×500 px** minimum zorunlu |
| **1-28 Şub 2027** | **DSA → AI Max otomatik göçü**; yeni DSA ad grubu oluşturma kalkıyor |
| **Oca 2027** | Yeni **Display kampanyası açılamaz** |
| **2027** | Display kampanyaları Demand Gen'e otomatik göç |
| **Eyl 2027** | Eski Google Ads API sürümleri legacy desteğini kaybeder |

---

## 8. ⚠️ Tencerecim'e özel riskler ve durum

### Limited Ad Serving riski — YÜKSEK
Ağustos 2026'da bu politika tüm yüzeylere genişledi. Google "niteliksiz reklamveren" saydığı
hesapların gösterimlerini kısıtlıyor. Değerlendirme kriterleri: **kullanıcı geri bildirimi,
hesap geçmişi, doğrulama durumu, politika uyumu, sektör.**

**Bizim profilimiz tam da risk grubunda:** yeni doğrulanmış hesap + neredeyse sıfır geçmiş
(son 7 günde ₺16,64 harcama) + uzun süre askıda kalmış hesap.

**Nitelikli olmanın yolu:** tüm politikalara uy · reklamveren doğrulamasını tamamla ·
olumlu kullanıcı etkileşimi biriktir · Search'te **net markalama** ve alan adını başlığa sabitle.
Kısıtlanırsan hesap içi bildirim gelir, itiraz formu var.

### Hesabın bilinen durumu (04.09.2026)
- Hesap: **102-997-8368** (info@resiftencerecim.com), MCC **185-656-5607** altında bağlı
- Geliştirici jetonu: **Explorer** seviyesi (prod hacim için Basic/Standard başvurusu gerekir)
- 2 kampanya var, **ikisi de duraklatılmış**: "TENCERECİM STORE TIKLANMA", "TENCERECİM SATIŞ REKLAM - 1"
- Açık görev: **"Confirmation of advertising funding source required"** (Politika > Hesap)
- Dönüşüm takibi: GA4 `G-5P91KDSH9K` + Measurement Protocol ikas'a bağlı; `conversionTrackingId`
  hesapta mevcut (17189310793), `hasConversionTracking: true`
- 🔴 GTM'de **fazladan 2 dönüşüm işlemi Birincil takılı** (begin_checkout, view_item) —
  KALDIRILMALI (bkz. hafıza: gtm-donusum-takibi). Bu doğrudan §5 "yalnız makro birincil" ihlali.
- 🔴 Site performansı: mobil PageSpeed **39**, LCP **18,7 sn** (bkz. hafıza: cls-mobil-sorunu).
  Landing page deneyimi Kalite Puanı'nın 3 bileşeninden biri → **reklam maliyetini doğrudan
  şişirir** (düşük LP puanı → %400'e varan ek TBM).
- 🔴 Yasal metin eksikleri: KVKK aydınlatma + çerez politikası + iletişim sayfası YOK,
  iade adresi yanlış (Pendik). **Google politika riski.**

---

## 9. Karar kuralları (operasyonel)

| Durum | Kural |
|---|---|
| "Bütçeyle sınırlı" + Kayıp GP (bütçe) yüksek | **Bütçeyi artır, hedefe dokunma** |
| Kayıp GP (sıralama) yüksek, bütçe boş kalıyor | Hedefi gevşet veya kaliteyi (LP/feed/başlık) düzelt |
| İkisi de düşük, GP %80+ | Kanal doygun — bütçe artışı boşa gider, yeni kanal gerek |
| Hedef değişikliği | Tek seferde **≤%10-15**, sonra **3-4 hafta dokunma** |
| Bütçe değişikliği | 3-4 günde bir **≤%20-30** |
| Bütçe ve hedefi **aynı anda** değiştirmek | ❌ ASLA — hangisinin etki ettiğini bir daha öğrenemezsin |
| Yeni hedef nereye | Fiili ROAS'ın en fazla %10-15 üstüne |
| Kampanya kapatma | Hedef CPA'nın **3 katı** harcandı ve 0 dönüşüm ("3x kill rule") |
| Karar penceresi | **30 gün, tercihen 60.** Haftalık ROAS'a tepki verme |
| Kampanya bölme | Her kampanya ayrı ayrı 50+ dönüşüm/ay tutamıyorsa **bölme** |
| Paylaşılan bütçe | Az kampanyalı hesapta **KULLANMA** — teşhis kabiliyetini öldürür |

### İzleme temposu
| Tempo | Bakılacak | Aksiyon |
|---|---|---|
| **Günlük (5 dk)** | Harcama pacing, feed/onay hatası, takip kırıldı mı | Yalnız **arıza** için. Performans için **ASLA** |
| **Haftalık** | Arama terimleri, negatifler, MER | Küçük düzeltmeler; **hedefe dokunma** |
| **Aylık** | ROAS, brüt kâr > harcama mı, sipariş adedi, marka/marka-dışı | **Bütçe ve tROAS kararları burada** |
| **Çeyreklik** | Kanal karması, holdout, **marj yeniden hesabı** | Yapısal değişiklik |

**Tepki VERME (gürültü):** tek günlük ROAS dalgalanması · 3 günlük dönüşüm düşüşü · tek büyük
siparişin yarattığı sıçrama · PMax varlık performans etiketleri · hafta sonu düşüşü.

---

## 10. Negatif anahtar kelime kuralları (kötü negatif kampanyayı öldürür)

- **ASLA geniş eşleme negatif önerme** (açıkça gerekçelendirilmedikçe) — çok geniş bloklar.
- Belirli alakasız sorgular için **tam eşleme** `[kelime]`.
- Alakasız niyet kalıpları için **öbek eşleme** `"kelime"`.
- Negatifleri **gerçek Arama Terimleri Raporu'ndan** çıkar, tahminden değil.
- Temalı listelere ayır: Bilgi amaçlı (nasıl yapılır, nedir) · İş arayan (iş ilanı, maaş) ·
  Rakip (bilerek hariç tutulacaksa) · Bedava niyeti (ücretsiz, bedava).
- **Paylaşılan negatif listeleri** hesap seviyesinde uygula, sadece kampanya seviyesinde değil.
- Mevcut negatifleri **aşırı bloklama** için gözden geçir.

**Bizim ürün grubumuz için niyet sınıfları:**
| Kalıp | Niyet | Aksiyon |
|---|---|---|
| `marka+model`, `fiyat`, `kaç para` | Satın alma | En yüksek değer |
| `nedir`, `nasıl`, `tarif`, `yemek` | Bilgi | **Negatif** (tencere reklamında "yemek tarifi" israftır) |
| `ikinci el`, `kiralık` | Uyumsuz | **Negatif** |
| `yedek parça`, `sap`, `kapak` | Farklı ürün | Ayrı kampanya |

---

## 11. Bu ölçekte YAPILAMAYACAK ölçümler

| Yöntem | Neden | Yerine |
|---|---|---|
| Klasik A/B testi (dönüşüm oranı) | %1,0→%1,2'yi ölçmek ~85.000 tık ister | Aç-kapa holdout |
| ROAS A/B testi | Gelir varyansı devasa | Aylık brüt kâr trendi |
| MMM (Meridian/Robyn) | 2-3 yıl haftalık çok-kanallı veri ister | Bugün veri biriktirmeye başla |
| Kullanıcı düzeyinde ROAS güven aralığı | Lewis & Rao (QJE 2015): >10M kişi-hafta | Çeyreklik kâr |

**Tek uygulanabilir nedensel yöntem: aç-kapa / geo holdout** — ama ancak **kaba bir etkiyi**
(~%50 mertebesi) ayırt eder. "%15 mi %25 mi" sorusunu **cevaplayamaz**.

**⚠️ Deney öncesi hijyen kapısı:** dönüşüm takibi **≥30 gün kesintisiz doğrulanmadan**
holdout başlatma. Takip ölüyken yapılan test "reklam işe yaramıyor" der; oysa ölçüm ölmüştür.

**En ucuz araç:** sipariş sonrası tek soru — *"Bizi nasıl buldunuz?"* ve
*"Bize ulaşmadan önce bu ürünü almaya karar vermiş miydiniz?"* (artımsallığın düz Türkçesi).

---

## 12. Kırmızı bayraklar — dur ve yeniden düşün

- **"ROAS düştü, hedefi düşürelim"** → Düşük marjda ucuz çöp trafiği satın almaktır.
  Önce bütçe-kısıtlı mı teklif-kısıtlı mı teşhis et.
- **"Bu hafta kötü gitti"** → Haftalık veri karar vermez. 30 gün.
- **"Panel %X ROAS diyor"** → 6. basamak. Hangi basamaktan konuştuğunu söyle.
- **"Benchmark'a göre TBM'imiz yüksek"** → Benchmark'lar ABD/USD/Search ağırlıklı, Türkiye
  yapısal olarak farklı. Tek geçerli referans: **kendi marjından türeyen başabaş + kendi
  90 günlük ortalaman.**
- **"Marka kampanyası çok iyi ROAS veriyor"** → Marka aramasının kısa vadeli artımsal faydası
  eBay deneyinde **sıfır** çıktı (Blake vd. 2015).
- **"Ortalama ROAS'ı yüksek, bütçe ekleyelim"** → Karar **marjinal** ROAS'la verilir.
  Ortalaması en yüksek kampanya çoğu zaman marjinali en düşük olandır.
- **Broad match + Manual CPC** → Kritik. Smart Bidding'e geç veya tam eşlemeye dön.
- **tCPA, fiili CPA'nın %50'sinin altında** → Gerçekçi olmayan hedef, hacmi boğar.

---

## Nihai ölçüt

```
Aylık brüt kâr (ciro × marj) − reklam harcaması > 0
```
Platform ROAS'ı bir **gösterge**; bu ise **gerçektir**.
