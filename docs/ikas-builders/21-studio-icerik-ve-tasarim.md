# 21 — ikas Studio: İçerik ve Tasarım Kipi

> Kaynak: `/docs/ikas-studio/content-and-design/*`
> Kanıt seviyesi: **Belgeli**

---

## Kavram hiyerarşisi

```
Sayfa (Page)
 └── Bölüm (Section)          ← sayfanın bağımsız, tekrar kullanılabilir yapı taşı
      └── Bileşen (Component) ← bölümler arası paylaşılan yapı taşı
           └── Element        ← en küçük yapı birimi (Frame, Text, Image...)
                └── Liste (List) ← aynı yapının veri üzerinde tekrarlanması
```

---

## Sayfalar — 22 sayfa tipi

| # | Sayfa | # | Sayfa |
|---|---|---|---|
| 1 | Anasayfa | 12 | Favori Ürünler |
| 2 | Ürün Sayfası | 13 | Şifremi Unuttum |
| 3 | Kategori Sayfası | 14 | Şifremi Kurtar |
| 4 | Marka Sayfası | 15 | Müşteri Mail Onaylama |
| 5 | Arama Sayfası | 16 | Sepet Sayfası |
| 6 | Hesabım Sayfası | 17 | Blog Anasayfa |
| 7 | Giriş Sayfası | 18 | Blog Kategori Sayfası |
| 8 | Kayıt Sayfası | 19 | Blog Yazı Sayfası |
| 9 | Adreslerim | 20 | Bulunamadı (404) |
| 10 | Siparişlerim | 21 | Ödeme Sayfası |
| 11 | Sipariş Detay | 22 | Özel Sayfa |

🔴 **Yeni temada 3 sayfa hazır gelir:** Anasayfa, 404, Ödeme Sayfası.
Kalan 19 sayfayı geliştirici kendisi oluşturur.

> ⚠️ v2.9.0 ile hesap ve üyelik sayfaları ikas tarafından **CDN üzerinden** sağlanmaya
> başladı — bu tabloyu güncel şema karşısında doğrulayın.

---

## Bölümler (Sections)

> *"Bölüm, bir sayfanın bağımsız ve tekrar kullanılabilir yapı taşıdır."*

Her bölümün kendi verisi, stili ve iç yapısı vardır; farklı sayfalara eklendiğinde
bağımsız çalışır. Sayfalar bölümlerden oluşur.

### Bölüm oluşturma (Tasarım kipi gerekir)
1. Elementler panelinden **Frame** ekle
2. Frame'e sağ tıkla → **"Bölüm Oluştur"**
3. Modalda **ikon** ve **ad** gir
4. **Kaydet**

Sonra bölüm detay ekranına yönlendirilirsiniz; sol paneldeki **Geri** ile sayfaya dönersiniz.

### Kullanım
- **Veri yönetimi:** "Veri Ekle" modalıyla dışarıdan gelecek veri tanımlanır,
  "Veri Bağla" ile elementlere dağıtılır → aynı bölüm farklı sayfalarda farklı veriyle çalışır
- **İçerik kipinde güncelleme:** Sayfaya eklendikten sonra bölüm verisi İçerik kipinden
  güncellenebilir (örn. ürün listesi, sıralama, limit)
- **Header/Footer atama:** Bölüm header veya footer olarak işaretlenebilir; yeni sayfalara
  otomatik eklenir, **mevcut sayfalara elle eklenmelidir**
- **Duyarlılık:** Bölümler **kırılma noktalarını (breakpoint)** destekler; stil değişiklikleri
  daha küçük kırılma noktalarına **aşağı doğru miras kalır**

---

## Bileşenler (Components)

Bir kez oluşturulup **birden çok bölümde veya başka bileşende** kullanılan bağımsız yapı taşı.

### Oluşturma (Tasarım kipi)
Frame veya Text elementine sağ tıkla → **"Bileşen Oluştur"** → ikon ve ad gir.

### Bölümden farkları

| | Bölüm | Bileşen |
|---|---|---|
| Duyarlılık yöntemi | **Kırılma noktası ekranları** | **Koşullar** (breakpoint koşulu) |
| Görsel çeşitlilik | yok | **Varyantlar** destekler |
| Durum stilleri | — | Her varyant `:hover` ve `:active` destekler |
| İç içe | — | Bileşen içinde bileşen olabilir |

### Listelerle entegrasyon
Liste öğesi seviyesindeki bileşenler **her yinelemede otomatik veri alır** —
örn. ürün verisi ürün kartı bileşenine geçer.

---

## Elementler

| Kategori | Elementler | Not |
|---|---|---|
| **Yerleşim (Layout)** | Frame, Grid, 2 Column, 2 Row | `div` olarak render olur; `background-color`, `padding`, `gap` gibi özellikler |
| **Temel (Basic)** | Text, Image, Video, Icon, **Button**, Iframe | Button aslında frame+text ile kurulmuş stilli bir şablondur |
| **Gelişmiş (Advanced)** | Slider, Infinite Scroller, Marquee, **ikas Quick Pay** | Quick Pay müşteriyi doğrudan ödemeye götüren hazır bileşen |
| **Form** | Input, Date, Textarea, Checkbox, Select | |

- **İçerik kipi:** yalnızca sayfaya bölüm ekleme; element işlemleri kısıtlı
- **Tasarım kipi:** tüm elementlere tam erişim

### Şablonlar
Elementlerin yanı sıra hazır şablonlar: **Bölümler** (bileşen+element ile kurulmuş) ve
**Bileşenler** (element ile kurulmuş).

---

## Katmanlar (Layers)

Sayfa yapısının hiyerarşik görünümü. Her iki kipte de ana çalışma alanı.

**İçerik kipinde:**
- Sayfaya **bölüm ekleme**
- Bölümleri **sıralama**
- Bölüm içindeki bileşenleri sıralama
- Bölüm/bileşen **verisini güncelleme**
- 🔴 *"Element düzeyinde düzenleme sunmaz."*

Seçenekleri **geliştirici belirler** — kullanıcı yalnızca geliştiricinin sunduğu kadar
özelleştirebilir.

**Tasarım kipinde ek olarak:**
- **Detay görünümü** — bölüm/bileşene çift tıklayarak element düzeyine inme
- **Element yönetimi** — stil, boyut, konum vb.
- **Hiyerarşi kontrolü** — ebeveyn-çocuk ilişkileri, iç içe yapılar

---

## Listeler

> *"Listeler, aynı yapının birden fazla veri için tekrarlanmasıyla oluşan dinamik içeriklerdir."*

Örnekler: ürün listeleri, menü bağlantıları, sepet öğeleri, ürün görselleri.

### Oluşturma
Frame'e sağ tıkla → veri bağla → **liste tipi veri** seç. Modal iki alan sorar:

| Alan | Biçim | Örnek |
|---|---|---|
| **Liste Bileşen Adı** | PascalCase | `ProductList` |
| **Liste Öğe Adı** | camelCase (otomatik türetilir) | `productListItem` |

Kaydedince Katmanlar'da **yeşil göstergeyle** görünür.

### Zihinsel model
> Frame'e liste verisi bağlamak, JavaScript'teki **`Array.map()`** ile aynıdır —
> frame'in içeriği her öğe için tekrarlanır, her yinelemede veriye *Liste Öğe Adı*
> üzerinden erişilir.

### Öğe düzeyinde çalışma
Katmanlar panelinde listeye **çift tıkla** → öğe detay düzeyine in → yeni element ekle,
stil değiştir, tek tek alanları bağla.

### Desteklenen liste veri tipleri
Product List · Image List · Component List · Link List · Category List · Brand List ·
Blog List · Blog Category List · Product Attribute List

Liste verisi **döndüren fonksiyonlar** da bağlanabilir (örn. `product.getDisplayedVariantTypes`).

---

## Veriler (tasarım tarafı)

> *"Tema geliştirirken statik içerik nadiren yeterlidir. Ürünler, kategoriler, menü
> bağlantıları, sepet gibi dinamik bilgiler bölüm ve bileşenlere **veri** olarak bağlanır."*

**Üç mekanizma:** (1) bölüm/bileşene veri ekleme, (2) elemente veri bağlama,
(3) global tema ayarlarından besleme.

### Tüm veri tipleri

| Grup | Tipler |
|---|---|
| **Metin** | Text, Rich Text |
| **Stil** | Color, Font Style |
| **Sayı** | Number, Number Range |
| **Medya** | Image, Image List, Video |
| **Mantık** | Mantıksal/Anahtar (Boolean/Switch), Enum |
| **Ürün** | Product, Product List, Product Attribute, Product Attribute List |
| **Bağlantı** | Link, Link List |
| **Katalog** | Kategori, Category List, Marka, Brand List |
| **Blog** | Blog, Blog List, Blog Kategorisi, Blog Category List |
| **Yapı** | Bileşen, Component List |

Notlar:
- 🔴 **Stil veri tipleri**, "Veri Ekle" modalından değil, stil alanlarındaki **+** ikonundan eklenir
- 🔴 **Fonksiyon verileri yalnızca Blueprint kipinde** eklenir, Tasarım kipinde değil

---

## Elementlerde olaylar

### Tüm elementlerde geçerli 15 olay

| Türkçe | Kod |
|---|---|
| Tıklama | `click` |
| Çift Tıklama | `dblclick` |
| Tuş Basımı | `keypress` |
| Tuş Aşağı | `keydown` |
| Tuş Yukarı | `keyup` |
| Fare Tuşu Basıldı | `mouseDown` |
| Fare Tuşu Bırakıldı | `mouseUp` |
| Fare Üzerine Geldi | `mouseOver` |
| Fare Üzerinden Ayrıldı | `mouseOut` |
| Fare İçeri Girdi | `mouseEnter` |
| Fare Dışarı Çıktı | `mouseLeave` |
| Bağlam Menüsü | `contextMenu` |
| Odaklandı | `focus` |
| Odak Kaybı | `blur` |
| Kaydırma | `scroll` |

### Input, Select, Textarea'ya özel 3 ek olay
`input` · `change` · `select`

---

## Koşullar (Conditions)

Veri durumuna göre stil değiştirme. Tasarım kipinde: elementi seç → stil özelliğine
sağ tıkla → **"Koşul ekle"**.

**Desteklenen tipler:**
- **Boolean** — true/false durumunda tetiklenir
- **Enum** — belirli enum değerine eşitlik kontrolü
- Diğer tipler — verinin **var olup olmadığı** kontrol edilir, boolean gibi davranır
- Her koşul bir **fallback** (hiçbiri eşleşmezse uygulanacak) değer içerir

**Üç koşul kaynağı:**

| Kaynak | Açıklama |
|---|---|
| **Veri** | Bölüm/bileşen içinde tanımlı boolean veya enum |
| **Store Verisi** | ikas'ın hazır modelleri: `baseStore`, `cartStore`, `customerStore` |
| **Global Veri** | Blueprint kipinde global oluşturulan boolean/enum — uygulama geneli tasarım değişikliği |

🔴 **Kırılma noktaları da koşul olarak kullanılabilir.** Bu özellikle **bileşenler** için
önemlidir — bileşenlerin bölümlerdeki gibi kırılma noktası tasarım ekranları yoktur;
duyarlı varyasyon için breakpoint koşulu kullanılır.

---

## Animasyonlar

### 6 tetikleyici tipi

| Türkçe | Karşılık |
|---|---|
| Üzerine gel | `:hover` |
| Aktif | `:active` |
| Odaklanma | `:focus` |
| Görünür odaklanma | `:focus-visible` |
| Yer tutucu | `::placeholder` |
| **Belli ol** | `:appear` — **ikas'a özel** |

İlk beşi CSS sözde seçicileri, **"Belli ol"** ikas'ın kendi animasyon sistemidir.

### "Belli ol" — 24 hazır animasyon

| Grup | Animasyonlar |
|---|---|
| **Fade (9)** | fade, fade-up, fade-down, fade-right, fade-left, fade-up-right, fade-up-left, fade-down-right, fade-down-left |
| **Flip (4)** | flip-left, flip-right, flip-up, flip-down |
| **Zoom (11)** | zoom-in, zoom-in-up, zoom-in-down, zoom-in-left, zoom-in-right, zoom-out, zoom-out-up, zoom-out-down, zoom-out-right, zoom-out-left |

### 3 ayar

| Ayar | Ne yapar |
|---|---|
| **Eşik (Threshold)** | Animasyonun kaydırmanın hangi yüzdesinde tetikleneceği |
| **Bir Kez Oynat** | Tekrarı engeller |
| **Üstten Çık** | Element geçilirken animasyonu ters oynatır |

---

## Global Değerler

> *"Global Değerler, temanızın genelinde geçerli olan ortak tanımları tek merkezden
> yönetmenizi sağlar."*

| Kategori | İçerik | Erişim |
|---|---|---|
| **Yazı Stilleri** | Başlık, paragraf, metin biçimlendirme | Her iki kip |
| **Renkler** | Tema renk paleti | Her iki kip |
| **Tema Ayarları** | Ayar ekleme, veri tipi ve gruplarla düzenleme | Her iki kip |
| **Animasyonlar** | Tema geneli animasyon tanımları | **Yalnızca Tasarım** |
| **Kırılma Noktaları** | Duyarlı tasarım ekran eşikleri | **Yalnızca Tasarım** |

🟢 **Fayda:** Global değer güncellendiğinde onu kullanan **tüm elementlere otomatik yayılır.**

> Tencerecim notu: Hafızadaki **[Tema Renk Paleti]** (`#ecdf93` krem, header `#052238`)
> bu yapıda **Renkler** altında tek merkezden tanımlanır.

---

## Kaydedilmiş Şablonlar

Yalnızca **Tasarım kipinde**. İki sekme: **Bölümler** ve **Bileşenler**.

Üç nokta menüsü / sağ tık ile:
- **Güncelle** — ad ve ikon değiştirme
- **Sil**

Bölümlere özel: **Header Yap** / **Footer Yap** (tüm sayfalara uygulanır).

---

## Kütüphaneler

| Kütüphane | İçerik |
|---|---|
| **Satın Alınan ve Benimle Paylaşılanlar** | Pazardan alınan veya partnerlerin eklediği tema ve UI kit'ler |
| **ikas Kütüphanesi** | ikas'ın hazırladığı tema ve UI kit'ler |

🔴 **UI kit ≠ tema:** *"UI kit'ler yalnızca bölüm ve bileşenlerden oluşur"*; temalar
ise tam sayfa ve yerleşim içerir.

---

## Figma'dan içe aktarma

**"Figma to ikas"** eklentisi ile. Yalnızca **Tasarım kipinde**.

**Adımlar:**
1. Figma Community'den eklentiyi kur
2. Figma'da bir frame seç
3. Dönüştürme kipini seç (veya varsayılanı kullan)
4. **Convert**
5. **Copy**
6. ikas Studio'da **"Figma'dan İçe Aktar"** ile yapıştır
7. Düzenlemeye devam et ve canlıya al

**Koruduğu şeyler** (tipik Figma→HTML araçlarının aksine):
- Katman yapısı ve yerleşim
- Renk stilleri
- Yeniden kullanılabilir bileşenler

Kod bilgisi ve abonelik ücreti gerektirmez.

> ⚠️ Belgede **teknik sınırlar açıkça yazmıyor** (dosya boyutu, bileşen karmaşıklığı,
> animasyon desteği). Kanıt seviyesi: **Belgeli değil — ölçülmeli.**

---

## Çoklu dil / Yerelleştirme

Geliştirme sırasında bir **varsayılan dil** belirlenir, sonra **sınırsız dil** eklenir.

🔴 **Öneri:** *Tema geliştirirken varsayılan dili İNGİLİZCE yapın* — çoklu dil yönetimi
ve gelecekteki güncellemeler kolaylaşır.

### İki çeviri kategorisi

| Tür | Kim yönetir |
|---|---|
| **Bölüm ve Bileşen Çevirileri** | Sizin oluşturduğunuz içerik — **tamamen sizin kontrolünüzde** |
| **Ortak Çeviriler** | ikas'ın otomatik çevirdiği hazır metinler — isterseniz özelleştirilebilir |
