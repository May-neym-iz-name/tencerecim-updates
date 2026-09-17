# 30 — ikas Partner Hesabı

> Kaynak: `/docs/ikas-partner/*`
> Kanıt seviyesi: **Belgeli**

Partner hesabı, birden çok mağazayı tek merkezden yönetmeyi sağlar:
> *"Geliştirme mağazaları oluşturabilir, uygulama ve tema yayınlayabilir, bağlı ikas
> mağazalarını tek merkezden yönetebilirsiniz."*

🔴 **Admin App veya tema yayınlamak için ZORUNLUDUR.** Özel uygulama için gerekmez.

---

## Hesap oluşturma — 3 adım

1. **Giriş / Kayıt** — mevcut ikas hesabıyla giriş veya yeni hesap
2. **Partner hesabı oluştur** — yeni kullanıcılar otomatik yönlendirilir;
   mevcut partner'lar "Yeni Partner Oluştur" ile ek hesap açabilir
3. **Tercihleri tamamla** — anket soruları. **Tüm sorular atlanabilir** (opsiyonel)

---

## Mağaza türleri — 3 tip

### 1. Geliştirme Mağazaları (Development Stores)

> *"Uygulama, tema veya UI kit geliştirmek isteyen geliştiriciler için tasarlanmıştır."*

| Özellik | Durum |
|---|---|
| Lisans | **Scale Plus** ile oluşturulur |
| Gerçek satış | ❌ Yapamaz |
| Devredilebilir | ❌ Başkasına aktarılamaz |
| Alan adı | Otomatik **`dev-`** öneki alır — **kaldırılamaz** |
| Örnek veri | İsteğe bağlı olarak örnek sipariş ve ürünle başlatılabilir |

### 2. Müşteri Mağazaları (Customer Stores)

Ajanslar veya mağazayı müşterisine teslim eden partnerler için.

- ikas platformunda **tam çalışan** vitrin
- Ürün yükleme yapılabilir
- **Satışa hazır**
- **Yeni sahibine devredilebilir**
- Oluştururken lisans tipi seçilir

### 3. Erişim Mağazaları (Access Stores)

> *"Geliştiricilerin, ajansların veya partnerlerin işbirliği yaptıkları ikas satıcılarına
> geliştirme ve yönetim desteği sağlayabilmeleri için kullanılır."*

Partner, birlikte çalıştığı satıcı mağazasından **panel ve geliştirici izinleri**
talep eder; mağaza kabul edince erişim açılır.

> 🟢 **Tencerecim için:** kendi mağazamız zaten bizim; Partner hesabı açarsak
> tencerecim.store'u **Erişim Mağazası** olarak bağlar, geliştirme işlerini
> `dev-` mağazasında yapıp canlıya taşırız.

---

## Partner Ayarları

### Partner Bilgileri

Uygulama/tema mağazasında içerik paylaşacaklar için zorunlu tanıtım alanları:

| Alan | Not |
|---|---|
| **Partner Adı** | Hesap oluştururken belirlenir, **değiştirilemez** |
| **Web Sitesi** | Bireysel: blog/sosyal medya · Ajans: kurumsal site/portföy |
| **Adres (Ülke / Şehir)** | Yalnızca kullanıcıya bilgi amaçlı gösterilir |

> Uygulama/tema yayınlamayacaklar bu alanları **boş bırakabilir**.

### Partner Doğrulama

İş türüne göre **belge, adres ve banka bilgisi** paylaşımı.
🔴 **Uygulama, tema veya UI Kit yayınlayan TÜM partnerler için ZORUNLU.**

**Adımlar:**
1. Doğrulama formundaki alanları doldur
2. Gerekli belgeleri ekle (şirket kaydı, banka bilgisi vb.)
3. **"İncelemeye Gönder"**

İnceleme süresi ekip yoğunluğuna göre değişir; iletişim e-posta veya telefonla kurulur.

### Geliştirici Ayarları — Varsayılan Dil

Partner'ın oluşturduğu içeriğin (plan detayları, tema açıklamaları, aksiyon etiket adları)
başlangıç dili.

Desteklenen pazar dilleri: **Türkçe · İngilizce · Almanca**

**Dil davranışı:**
- Yalnızca varsayılan dilde içerik verirseniz → tüm pazar sürümlerinde o dil görünür
- Üç dilden ikisinde çeviri varsa → o dillerde çeviri, olmayan yerde varsayılan dil görünür

### Personel Yönetimi

1. Sağ üstte **"Yeni Ekle"**
2. Ad-soyad + e-posta gir
3. Erişebileceği sayfaları ve düzenleme izinlerini tanımla
4. **Kaydet** → davet gönderilir

🔴 Davetler **2 hafta** geçerlidir. Süresi dolanlarda kişinin üzerine gelip
**"Tekrar Davet Gönder"** deyin.

---

## Partner Hak Edişleri (Payouts)

**Panel:** `https://partners.ikas.com/admin/payouts`

### Dönem yapısı

Hak edişler **aylık dönemlere** ayrılır. Bir ayın 1'i ile sonraki ayın 1'i arasındaki
satışlar o dönemin hak edişinde toplanır — **14 günlük iade penceresi** hesaba katılarak.

**Belgedeki örnekler:**
- 3 Nisan satışı → +14 gün → **17 Nisan**'da hak edilir → *1 Nisan – 1 Mayıs* dönemine girer
- 20 Nisan satışı → **4 Mayıs**'ta hak edilir → *1 Mayıs – 1 Haziran* dönemine girer

### Üç durum

| Durum | Anlamı |
|---|---|
| **Fatura Bekliyor** | Zorunlu faturalama aşaması — hak ediş detayından fatura yüklenmeli |
| **İşlem Bekliyor** | Fatura gönderildikten sonra ödeme **iki hafta sonraki Cuma**'ya planlanır (o gün resmî tatile denk gelirse bir hafta sonrası) |
| **Tamamlandı** | Partner Doğrulama'da verilen **IBAN**'a ödeme yapıldı |

🔴 **Fatura gereksinimleri:** KDV dahil olmalı ve **not kısmında IBAN** yazmalı.
Tek ve çoklu uygulama için örnek faturalar belgede mevcuttur.

---

## Lisans Yönetimi

> *"Toplu olarak satın alabileceğiniz ikas lisanslarını yönetin ve mağazalara ekleyin"*

Ajans/partner modeli için toplu lisans alıp mağazalara dağıtma ekranı.
(Belgede yalnızca ekran görüntüleriyle anlatılmış — metin detayı yok.)
