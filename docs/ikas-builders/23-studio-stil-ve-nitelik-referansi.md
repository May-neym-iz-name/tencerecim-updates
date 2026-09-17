# 23 — ikas Studio: Stil ve Nitelik Referansı

> Kaynak: `/docs/ikas-studio/content-and-design/elements/style/*` ve `/elements/attribute/*`
> Kanıt seviyesi: **Belgeli (dizin düzeyi)** — her alt sayfa ayrı ayrı çekilmedi,
> ihtiyaç anında ilgili URL'den okuyun.

---

## Stil kategorileri (18 sayfa)

Tasarım kipinde bir elementi seçtiğinizde sağ panelde açılan stil grupları:

| Grup | URL ucu | İçerik |
|---|---|---|
| **Layout** | `/style/layout` | display, flex/grid yönü, hizalama, gap |
| **Size** | `/style/size` | width, height, min/max |
| **Spacing** | `/style/spacing` | margin, padding |
| **Position** | `/style/position` | static/relative/absolute/fixed/sticky, top/left/right/bottom, z-index |
| **Flex Child** | `/style/flex-child` | flex-grow, flex-shrink, flex-basis, align-self |
| **Grid Child** | `/style/grid-child` | grid-column, grid-row, alan yerleşimi |
| **Typography** | `/style/typography` | font, boyut, ağırlık, satır yüksekliği, harf aralığı, hizalama |
| **Background** | `/style/background` | renk, görsel, gradyan |
| **Border** | `/style/border` | kenarlık, köşe yuvarlaklığı |
| **Effects** | `/style/effects` | gölge, opaklık, blend |
| **Transform** | `/style/transform` | translate, rotate, scale, skew |
| **Transition** | `/style/transition` | süre, gecikme, easing |
| **Animation** | `/style/animation` | animasyon bağlama |
| **Scroll** | `/style/scroll` | kaydırma davranışı |
| **Visibility** | `/style/visibility` | görünürlük kontrolü |
| **Preview** | `/style/preview` | önizleme ayarları |
| **Other** | `/style/other` | diğer CSS özellikleri |

🔴 **SSS'de geçen tuzaklar** (belgede soru olarak listelenmiş):
- Gradyan arka plan çakışmaları
- Metin gradyan renk sorunları
- **"Göster" ile "Görünürlük" farkı** (`display` vs `visibility`)
- Konum (position) değeri değişince stillerin etkilenmesi
- Yerleşim tipi (layout type) değişince stillerin bozulması

---

## Nitelikler (Attributes)

Elementin HTML/ikas özel davranışını belirleyen ayarlar.

### HTML nitelikleri (11 sayfa)

| Nitelik | URL ucu | Ne için |
|---|---|---|
| `text` | `/attribute/html/text` | Metin içeriği |
| `tag` | `/attribute/html/tag` | Hangi HTML etiketi (`div`, `h1`, `section`...) |
| `link` | `/attribute/html/link` | Bağlantı hedefi |
| `image` | `/attribute/html/image` | Görsel kaynağı, alt metni |
| `video` | `/attribute/html/video` | Video kaynağı ve kontroller |
| `iframe` | `/attribute/html/iframe` | Gömülü çerçeve |
| `input` | `/attribute/html/input` | Form girdisi |
| `textarea` | `/attribute/html/textarea` | Çok satırlı girdi |
| `select` | `/attribute/html/select` | Açılır liste |
| `checkbox` | `/attribute/html/checkbox` | Onay kutusu |
| `date` | `/attribute/html/date` | Tarih seçici |

🔴 SSS'de geçen tuzak: **İç içe link (nested link) hatası** — bir bağlantının içine
başka bağlantı koymak geçersiz HTML üretir.

### ikas özel nitelikleri (6 sayfa)

| Nitelik | URL ucu | Ne için |
|---|---|---|
| `icon` | `/attribute/ikas/icon` | İkon seçimi |
| `slider` | `/attribute/ikas/slider` | Slider davranışı (otomatik oynatma, döngü, ok/nokta) |
| `infinite-scroller` | `/attribute/ikas/infinite-scroller` | Sonsuz kaydırma |
| `marquee` | `/attribute/ikas/marquee` | Kayan yazı şeridi |
| `overlay` (fixed) | `/attribute/ikas/overlay/fixed` | Ekrana sabit overlay (modal, drawer) |
| `overlay` (relative) | `/attribute/ikas/overlay/relative` | Elemente göre konumlu overlay (dropdown, tooltip) |

🟢 **Overlay**, sepet açılır paneli / mega menü gibi yapıların temelidir —
belgedeki header örneği bunu kullanıyor.

🔴 SSS'de geçen tuzaklar:
- **Infinite Slider özellikleri**
- **Tasarım kipinde slider'ın çalışmaması** (önizleme sınırı)

---

## Sık Sorulan Sorular — başlık listesi

Belgede 24 soru listeleniyor. ⚠️ **Cevaplar bu çekimde alınamadı**; ihtiyaç olursa
https://builders.ikas.com/docs/ikas-studio/support/faq adresinden okuyun.

1. İçerik kipinde element düzenleme
2. Sayfa oluşturma kısıtları
3. Sayfa silme sorunları
4. Ödeme sayfası sınırlamaları
5. Element görünürlük sorunları
6. Header/Footer otomatik ekleme davranışı
7. Bileşen kırılma noktası kısıtı
8. Yerleşim tipi değişiminin stillere etkisi
9. Bölüm önizleme boyutu
10. Gradyan arka plan çakışmaları
11. Metin gradyan rengi sorunları
12. "Göster" ile "Görünürlük" farkı
13. Konum (position) değeri değişiklikleri
14. Snap Align görünürlüğü
15. Animasyon tanımları
16. Bileşen durum (state) kısıtları
17. Fonksiyon veri tipi erişimi
18. Stil alanı ikonları
19. Liste adlandırma kuralları
20. Fonksiyon bağlama yetenekleri
21. İç içe bağlantı hatası
22. Infinite Slider özellikleri
23. Tasarım kipinde slider çalışmaması
24. Sepete ekle butonu sorunları
25. Tema yayınlama sorunları
26. Varsayılan dil ayarları

Ayrıca: `/docs/ikas-studio/support/errors` (hata kodları) ve
`/docs/ikas-studio/support/shortcuts` (klavye kısayolları) sayfaları var.
