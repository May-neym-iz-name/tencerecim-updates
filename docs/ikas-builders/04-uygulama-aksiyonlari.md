# 04 — Uygulama Aksiyonları (Panele Buton Ekleme)

> Kaynak: `/docs/app-development/admin-app/app-actions`
> Kanıt seviyesi: **Belgeli** · ⚠️ Yalnızca **Admin App** için (Özel uygulamada YOK)

Uygulama aksiyonları sayesinde kendi uygulamanız ikas Yönetim Panelinin içindeki
ekranlara **kendi butonunu** ekler.

## Belgede verilen örnek senaryolar

- Sipariş detayındaki aksiyonla **siparişe fatura oluşturma**
- Paket aksiyonuyla **paketin içindeki ürünleri kargo entegrasyonuna gönderme**
- Ürün aksiyonuyla **ürünü pazaryerine veya harici sisteme gönderme**

> 🔴 Bu üç örnek, Tencerecim'in bugün PC uygulamasında **elle** yaptığı üç iştir.

---

## Aksiyon tipleri — hangisini seçmeli?

| Tür | Kullanım alanı |
|---|---|
| **iframe** | Kullanıcı etkileşimi, çok adımlı akış, görsel arayüz gereksinimi |
| **API** | Arka plan işlemi, toplu/otomasyon, anlık başarılı/başarısız yanıt |

- **iframe (embedded UI):** ikas paneli içinde sayfanız iframe olarak açılır.
  `actionRunId`, `idList`, `userLocale` parametreleri URL'e eklenir.
- **API (server-to-server):** ikas, uygulamanızın endpoint'ine **imzalı POST** gönderir.

Tanımlama yeri: **Partners paneli → uygulama detayları**.

---

## Aksiyonların göründüğü yerler

| Sayfa | Aksiyon adı | Konum |
|---|---|---|
| Ürün Düzenleme `/product/edit/:id` | Ürün Genel Aksiyon | Üst sağ **(︙)** menüsü |
| Sipariş `/order/view/:id` | Sipariş Genel Aksiyon | Üst sağ **(︙)** menüsü |
| Sipariş `/order/view/:id` | Sipariş **Paket** Aksiyonu | Her paket kartının altındaki aksiyon listesi |
| Sipariş Listesi `/order` | Sipariş Listesi **Toplu** Aksiyon | Tablo üstü "İşlemler" → Bulk Operations |

---

## Query parametreleri

| Aksiyon | Parametreler |
|---|---|
| Ürün Detay | `idList=<productId>` |
| Sipariş Detay | `idList=<orderId>` |
| Sipariş Paketi | `orderId=<orderId>` + `orderPackageId`, `orderLineItemIds=a,b`, `quantityMap=<JSON string>` |
| Sipariş Listesi | `idList=<orderId1,orderId2,...>` |

Notlar:
- Base URL her zaman `action.redirectUrl` olur
- `idList` **virgülle** ayrılır
- `quantityMap` bir **JSON string**'dir; URL içinde encode edilmesi tavsiye edilir

---

## Akışlar

### API Action
1. ikas imzalı `POST` gönderir (`signature`, `data`)
2. Endpoint'te **imza doğrulanır**, `data` parse edilir
3. Yetkili uygulama için OAuth/erişim bilgisi alınır
4. ikas GraphQL API ile veri çekilir/işlenir
5. Yapılandırılmış JSON yanıt döndürülür

### iframe Action
1. ikas sayfanızı `actionRunId`, `idList`, `userLocale` ile iframe'de açar
2. App Bridge ile JWT alınır, backend'e gönderilir
3. Backend JWT'yi doğrular, GraphQL çağrılarını yapar
4. Frontend dönen veriyi gösterir

---

## Güvenlik

### API aksiyonlarında imza doğrulaması ZORUNLUDUR

```javascript
import crypto from 'crypto';

function validateWebhookSignature(data: string, received: string, secret: string) {
  const expected = crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
  return expected === received;
}
```

### iframe aksiyonlarında JWT doğrulaması

```javascript
// Frontend: App Bridge ile token al
const token = await TokenHelpers.getTokenForiframeApp();

// Backend: isteği doğrula
const user = getUserFromRequest(request);
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### En iyi uygulamalar
- Token/secret değerlerini **asla loglamayın**
- API çağrılarını **her zaman backend üzerinden** yapın
- **Rate limiting** uygulayın

---

## Lokalizasyon

Aksiyonlar `userLocale` parametresiyle çok dilli çalışır (`tr`, `en`).

---

## Hızlı test

### API Action (curl)

```bash
SECRET="your-app-secret"
DATA='{"actionRunId":"test-123","idList":["order-id"],"userLocale":"en"}'
SIGNATURE=$(echo -n "$DATA" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

curl -X POST http://localhost:3000/api/ikas/actions/order-detail \
  -H "Content-Type: application/json" \
  -d "{\"signature\":\"$SIGNATURE\",\"authorizedAppId\":\"your-app-id\",\"merchantId\":\"your-merchant-id\",\"data\":\"$DATA\"}"
```

### iframe Action (tarayıcı)

```
http://localhost:3000/ikas/actions/order-detail?actionRunId=test-123&idList=order-id&userLocale=tr
```

---

## Örnek proje

CLI'da **"Dashboard Actions App"** şablonu seçilirse örnek iframe ve API aksiyonları
hazır gelir. Tam örnek:
https://github.com/ikascom/ikas-app-examples/tree/main/examples/dashboard-actions-app

---

## Sık karşılaşılan sorunlar

| Hata | Neden | Çözüm |
|---|---|---|
| `401 Invalid signature` (API) | Secret yanlış veya `data` UTF-8 ile imzalanmıyor | Secret'ı doğrula, algoritmanın `sha256` olduğunu kontrol et |
| `Unauthorized` (iframe) | App Bridge'den token gelmiyor / backend JWT doğrulaması yanlış | Token akışını ve doğrulamayı kontrol et |
| GraphQL hatası | Şema/izinler yanlış veya sorgu değişti | İzinleri kontrol et, codegen'i yeniden çalıştır |
| Toplu işlemde yavaşlık | İstekler sıralı işleniyor | Backend'de paralelleştir, retry stratejisi uygula |
| iframe veri gelmiyor | App Bridge token'ı backend'e iletilmiyor | Token akışını kontrol et |
