# 22 — ikas Studio: Blueprint Kipi (Görsel Mantık)

> Kaynak: `/docs/ikas-studio/blueprint/*`
> Kanıt seviyesi: **Belgeli**

---

## Blueprint nedir?

Bölüm ve bileşenlerin **düğüm (node) alanları** üzerinden çalışan görsel geliştirme arayüzü.

> *"Burası bir bölümün veya bileşenin kodunu yazdığınız yerdir; fark, kod satırları
> yazmak yerine düğümleri sürükle-bırak ile birbirine bağlayarak akış oluşturmanızdır."*

Yani Blueprint = **kod yazmadan mantık kurma**.

---

## Düğüm ekranları

- Bölüm ve bileşenlerin **kendi düğüm alanları** vardır
- İçlerindeki **liste, olay ve fonksiyonların da ayrı düğüm ekranları** vardır
- İlgili akış, her yapının kendi düğüm arayüzünde kurulur

### `onStartBrowser` olayı

Bölüm ve bileşenlere **özel** bir olaydır. Tarayıcı render'ı **bittikten sonra** çalışır —
React'taki render sonrası effect'lere benzer.

| | Ne zaman çalışır |
|---|---|
| **Ana düğüm ekranı** | Başlatma anında (initialization) |
| **`onStartBrowser`** | Render tamamlandıktan sonra |

---

## Kapsam hiyerarşisi

### Local (yerel) düğüm yapıları

| Yapı | İçinde tanımlanabilenler |
|---|---|
| **Bölüm ve Bileşen** | Veri · Olay · Değişken · Fonksiyon |
| **Liste** | Veri · Değişken · Fonksiyon |
| **Olay** | Değişken · Fonksiyon |
| **Fonksiyon** | Veri · Değişken · Fonksiyon |

🔴 *"Her veri yalnızca tanımlandığı yapının kapsamında geçerlidir."*

### Global düğüm erişimi

Tüm düğüm ekranlarından erişilebilen yapılar:
- **Değişkenler**
- **Fonksiyonlar**
- **Tip tanımları**

Yeniden kullanılabilir akışlar ve tip yönetimi için kullanılır.

---

## Veriler (Blueprint tarafı)

> *"Veriler, bir bölüm, bileşen, liste veya fonksiyonun dışarıdan aldığı ya da kendi
> kapsamında ürettiği girdilerdir."*

Tanımlanabileceği üç yapı: **bölüm/bileşen**, **liste**, **fonksiyon**.

### Geliştirici bakışı
React bileşen **prop'larına** benzer: yapılar hangi dış veriyi kabul edeceklerini
ilan eder, tüm akışlar o bilgiyi okur.

---

## Fonksiyonlar

> *"Fonksiyonlar, yeniden kullanılabilir akış bloklarıdır."*

Girdi ve çıktıları olan, başka alanlardan çağrılabilen süreçler.

### Yapı
JavaScript fonksiyon gövdesi gibi çalışır:
- **Girdi alanları** = parametreler
- **Çıktı alanları** = dönüş değerleri

### İki kapsam tipi

| Kapsam | Nerede tanımlanır | Nereden çağrılır |
|---|---|---|
| **Local** | Belirli bir bölüm, bileşen, liste, olay veya başka fonksiyon içinde | Yalnızca o yapının kapsamında |
| **Global** | Blueprint kipindeki **Global paneli** | **Tüm düğüm ekranlarından**, tema genelinde |

Fonksiyonlar içlerinde **veri, değişken ve alt fonksiyon** tanımlayabilir.

---

## Olaylar (Blueprint tarafı)

> *"Olaylar, bir element üzerinde tanımlanan aksiyonların kod akışını içerir."*

Blueprint kipinde her olayın **kendi düğüm ekranı** vardır; olay tetiklendiğinde
çalışacak akış burada kurulur.

Olay düğüm ekranı içinde tanımlanabilenler: **değişkenler** ve **fonksiyonlar**
(yalnızca o olayın kapsamında geçerli).

🔴 Desteklenen olay tiplerinin **tam listesi tasarım tarafındadır** —
bkz. [`21-studio-icerik-ve-tasarim.md`](21-studio-icerik-ve-tasarim.md) → "Elementlerde olaylar"
(15 evrensel + 3 form olayı).

---

## Değişkenler ve Tipler

- **Değişkenler** — local (bölüm/bileşen/liste/olay/fonksiyon içinde) veya global
- **Tipler** — global kapsamda tanımlanan tip tanımları; tüm düğüm ekranlarından erişilir

> Bu iki sayfa (`blueprint/variables`, `blueprint/types`) belgede kısa geçilmiş;
> ayrıntı için Studio içindeki Global panelini inceleyin. Kanıt seviyesi: **Belgeli (yüzeysel)**

---

## Blueprint'e uygun örnek işler (belgedeki adım adım rehberler)

| Alan | Örnekler |
|---|---|
| **Header** | logo ekleme, menü bağlantıları, aksiyon ikonları, sepet ürün sayısı, sepet toplamı, sepet ürün listesi, sepete ekleme, sepetten çıkarma, overlay ekleme |
| **Ürün Listesi** | bölüm oluşturma, veri bağlama, ürün kartı bileşeni, görsel + fiyat, sepete ekle butonu ve aksiyon bağlama, ürün listesi verisini değiştirme, bölümü yeniden kullanma, mobil duyarlılık |
| **Ürün Detay** | bölüm oluşturma, metin bileşeni, fiyat bileşeni, görsel listesini slider'a bağlama, ürün slider'ı, mobil duyarlılık |
| **Varyant Seçici** | bileşen oluşturma, varyant değiştirme fonksiyonu, varyant tipi öğesi, varyant değeri öğesi |
| **Satın Alma Butonları** | Sepete Ekle, Hemen Al |
| **Adet (Quantity)** | global değişken ekleme, bileşen oluşturma, aksiyon bağlama, tasarım güncelleme |

Bu rehberler `builders.ikas.com/docs/ikas-studio/basic-examples/` altındadır ve
**bir temayı sıfırdan kurmanın adım adım yolu**dur.
