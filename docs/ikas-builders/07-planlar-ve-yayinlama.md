# 07 — Plan Yönetimi, Satış ve Uygulama Yayınlama

> Kaynak: `/docs/app-development/admin-app/plans` · `/admin-app/build-publish` · `/admin-app/allowed-app` · `/admin-app/app-analytics`
> Kanıt seviyesi: **Belgeli** · Yalnızca **Admin App** için

---

## 1. Planlar (para kazanma altyapısı)

ikas, uygulama satışı için **uçtan uca** altyapı sağlar: satın alma, faturalama ve
ödeme süreçleri otomatik yürür.

**Panel:** `partners.ikas.com/admin/application-details/{{app_client_id}}/plans`

### Plan türleri

| Tür | Kural |
|---|---|
| **Ücretsiz** | Plan oluşturmaya gerek yok, yayınlama sırasında ayarlanır |
| **Ücretli** | Bölge başına **en fazla 4 plan**; opsiyonel deneme süresi |
| **Freemium** | 1 ücretsiz + en fazla 3 ücretli kademe |

### Para birimi ve bölge

- Para birimleri: **TRY, EUR, USD**
- Aylık ve yıllık fiyat tanımlanır
- 🔴 **Her bölge yalnızca kendi para birimindeki planlarla eşleştirilebilir**
- 🔴 **TRY bölgesi yalnızca YILLIK faturalamayı destekler**
- 🔴 **Plan fiyatı sıfır olamaz**

### Lisans oranlı fiyatlandırma

Mağaza sahibi, kalan ikas lisans süresine oranla öder:

```
(Kalan Gün / 365 × Yıllık Ücret) + KDV
```

### Deneme süresi

🔴 **Bir bölge içinde yalnızca TEK plan deneme süresi içerebilir.**
Geliştirici kurulum tarihini kendisi takip edip deneme bitince erişimi kısıtlamalıdır.

### Entegrasyon — iki yol

**A) Webhook:** `store/app/payment` bildirimi gelir. Gövdede
`storeAppListingSubscriptionKey` ile hangi planın alındığı ve lisans detayı öğrenilir.

**B) `getMerchantLicence` query:** `appSubscriptions` dizisi döner. Aktif abonelik
kontrolü:
```
status === 'ACTIVE' && deleted === false
```

Abonelik silindiğinde `store/app/deleted` webhook'u tetiklenir.

### Plan test akışı

```
plan oluştur → bölge yapılandır → izinli mağaza ekle → kur
  → plan seç → webhook geldi mi doğrula → query yanıtını doğrula
```

### Diğer notlar
- Plan değişiklikleri **anında** uygulanır — **açıklamalar hariç** (onaya girer)
- Gelir takibi Analytics panelinde; hak edişler ayrı yönetilir

---

## 2. Uygulama Yayınlama

**Panel:** `https://partners.ikas.com/admin/application-details/{{client_id}}/publishing`

### 5 ön koşul

1. **Partner Hesabı** — oluşturulmuş, uygulama bu hesaba eklenmiş
2. **Doğrulama** — Partner hesabı doğrulanmış
3. **Geliştirme tamamlanmış** — OAuth akışı doğru çalışıyor
4. **ikas Arayüzü** — panel içinde uygulamaya gidilebilecek yönlendirmeler var
5. **Test Ortamı** — **en az 2 geliştirme mağazasında** kurulu ve test edilmiş

### 5 aşamalı süreç

#### Aşama 1 — Planları belirleme
Ücretliyse planlar önceden hazır olmalı. Ücretsizse atlanır.

#### Aşama 2 — Bölgeleri belirleme
İki yol var:

- **Özel Yayınlama** — belirli bölgeler, özel planlar
- **Hızlı Yayınlama** — tüm dünya / minimum düzenleme
  - *Ücretsiz Yayınla:* tüm bölgelere ücretsiz plan eklenir
  - *Planları Belirle:* bölgeler açılır, planları siz eklersiniz (her bölgede ≥1 plan şart)

**Bölge Ekle formu alanları:**

| Alan | Anlamı |
|---|---|
| Bölge Adı | Sadece partner arayüzünde görünür, ayırt etmek için |
| Bölge | Hangi para birimi + hangi ülkeler |
| Ülkeler | Satışta olacak ülkeler — **bir ülke yalnızca bir bölgede** olabilir |
| Planlar | Bölgeye eklenecek planlar |

#### Aşama 3 — Uygulama detayları
- **Uygulama Kategorisi** — mağazada hangi kategoride listeleneceği
- **Desteklenen Diller** — varsayılanlar: Türkçe, İngilizce, Almanca, Fransızca, Felemenkçe

#### Aşama 4 — Mağaza içeriği

İki grup: **Varsayılan Bilgiler** ve **Çeviriler** (TR, EN, DE). Alanlar aynıdır:

| Alan | Açıklama |
|---|---|
| Uygulama Logosu | Mağazada görünen logo (konfigürasyon ikonundan bağımsız) |
| Uygulama Mağaza Adı | Mağazada görünecek ad |
| Özet Açıklama | Ana sayfa / arama sonuçlarındaki kısa metin |
| Detaylı Açıklama | Detay sayfasındaki tam anlatım |
| Kaynaklar (ops.) | Rehber, dokümantasyon, destek bağlantıları |
| Görseller ve Videolar | Arayüz ve özellik tanıtımı |
| Plan Açıklamaları | Planların mağaza adları ve açıklamaları |

> Tamamen ücretsiz uygulamalarda plan açıklaması zorunlu değildir.

#### Aşama 5 — Yayınlama tercihi

**Herkese Açık**
- Tüm ikas kullanıcıları mağazada görür ve indirir
- 🔴 **ikas ekipleri tarafından incelenir** — partner hesabı **doğrulanmış** olmalı
- İnceleme süresi ekip yoğunluğuna göre değişir
- Acil durum e-posta/telefon üzerinden iletişime geçilebilir
- Olumsuzsa: yayınlama sayfasına eksikleri içeren bilgilendirme notu eklenir
- Olumluysa: yayınlanır + bilgilendirme e-postası

**Gizli**
- Mağazalarda **kullanılabilir** ama **Uygulama Mağazası'nda listelenmez**
- Yalnızca paylaşılan **kurulum bağlantısıyla** yüklenir
- 🔴 **ikas tarafından incelenmez** — hızlı yol
- Sonradan Herkese Açık'a geçmek isterseniz incelemeye gönderilir
  (daha önce açık yayınlanmış olanlar **çok daha hızlı** onaylanır)
- **Acil durumda** yeni kurulumu durdurmak için uygulamayı Gizli'ye çekebilirsiniz

**Gizli uygulama kurulum bağlantıları:**
```
TR: https://apps.ikas.com/tr/uygulama/{{app_id}}
EN: https://apps.ikas.com/apps/{{app_id}}
DE: https://apps.ikas.com/de/apps/{{app_id}}
```

> 🔴 **Tencerecim için en uygun yol GİZLİ YAYINLAMA'dır** — inceleme yok, sadece
> kendi mağazamıza kurarız, üstelik Admin App'in tüm yeteneklerine (aksiyonlar,
> iframe, App Bridge) kavuşuruz.

---

## 3. İzin Verilen Mağazalar

Uygulamayı yayınlamadan **belirli mağazalarla** paylaşma yöntemi.

**Ne için:**
- Kurulum sürecini test etmek
- Farklı mağaza yapılandırmalarında özellikleri denemek
- Partner mağazalarının uygulamayı kurabilmesi

**Üç yöntem:**

1. **Geliştirme ve Müşteri Mağazaları** — sizin kontrolünüzde, kolayca eklenir:
   mağaza seç/oluştur → uygulama detay sayfası → İzin Verilen Mağazalar → "Mağaza Ekle"
2. **Erişim Mağazaları** — sizin olmayan mağazalar: önce partner olarak
   **"Uygulama Kullanım İzni"** talep edilir; mağaza kabul edince aynı adımlar
3. **Kaldırma** — tabloda seçip "Uygulamadan Çıkar"

🔴 **Kritik not:** *"Bir mağazayı izinli listeden çıkarmak, uygulama zaten kuruluysa
kullanımı engellemez — kaldırma yalnızca o mağazadan gelecek YENİ kurulumları engeller."*

---

## 4. Uygulama Performansı (Analytics)

**Panel:** `https://partners.ikas.com/admin/application-details/{{client_id}}/analytics`

Varsayılan görünüm kurulum verisidir; sağ üstteki **"Satış Metriklerini Göster"**
butonuyla gelir verisi açılır.

| Bileşen | İçerik |
|---|---|
| **Kurulum Grafiği** | *Kurulu Mağazalar* (kümülatif) ve *Kurulum & Kaldırma* (yeşil=kurulum, kırmızı=kaldırma) sekmeleri |
| **Toplam Gelir Grafiği** | Satış metrikleri açıkken görünür; dönemdeki toplam gelir |
| **Mağaza Kurulum Tablosu** | Mağaza Adı · Kurulum Tarihi · Durum (Kurulu/Kaldırıldı + kaldırma tarihi) |

Satış metrikleri açıkken tabloda her satır için **satın alınan plan** ve **ödeme tutarı**
görünür; tooltip'te ödeme döngüsü ve satın alma zamanı yer alır.
