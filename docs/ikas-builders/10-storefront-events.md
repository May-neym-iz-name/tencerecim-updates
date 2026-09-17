# 10 — Storefront Events (Vitrin Olayları)

> Kaynak: `/docs/storefront-events/*`
> Kanıt seviyesi: **Belgeli** · 🟢 **Reklam/ölçüm tarafı için yüksek değerli**

Vitrinde (tencerecim.store) olan biteni JavaScript ile yakalayıp istediğiniz yere
gönderme sistemi.

---

## Temel kullanım

Sistem **tüm ikas mağazalarında otomatik olarak** `window.IkasEvents` global nesnesi
üzerinden kullanılabilir — ek kurulum gerekmez.

```javascript
window.IkasEvents.subscribe({
  id: 'my_handler_id',
  callback: function (event) {
    const { type, data } = event;
    // ...
  },
});
```

---

## 18 olay tipi — `IKAS_EVENT_TYPE`

| Olay | Ne zaman |
|---|---|
| `PAGE_VIEW` | Sayfa yüklendiğinde |
| `PRODUCT_VIEW` | Ürün detay sayfası açıldığında |
| `ADD_TO_CART` | Sepete ürün eklendiğinde |
| `REMOVE_FROM_CART` | Sepetten ürün çıkarıldığında |
| `VIEW_CART` | Sepet görüntülendiğinde |
| `BEGIN_CHECKOUT` | Ödeme süreci başladığında |
| `CHECKOUT_STEP` | Ödeme adımları arasında ilerlerken |
| `COMPLETE_CHECKOUT` | Sipariş tamamlandığında |
| `ADD_TO_WISHLIST` | Favorilere eklendiğinde |
| `SEARCH` | Arama yapıldığında |
| `VIEW_SEARCH_RESULTS` | Arama sonuçları gösterildiğinde |
| `VIEW_CATEGORY` | Kategori sayfası açıldığında |
| `CUSTOMER_REGISTER` | Yeni hesap açıldığında |
| `CUSTOMER_LOGIN` | Giriş yapıldığında |
| `CUSTOMER_LOGOUT` | Çıkış yapıldığında |
| `CUSTOMER_VISIT` | Girişli müşteri ziyaretinde |
| `CONTACT_FORM` | İletişim formu gönderildiğinde |

## 9 sayfa tipi — `IKAS_PAGE_TYPE`

`INDEX` · `CATEGORY` · `BRAND` · `PRODUCT` · `CUSTOM` · `ACCOUNT` · `CART` · `CHECKOUT` · `SEARCH`

---

## Tam örnek dosya

```javascript
function CustomEventHandler() {
  const EVENT_HANDLER_ID = 'custom_handler_' + Date.now();

  function init() {
    try {
      const myScript = document.currentScript;
      const queryParams = new URLSearchParams('?' + myScript.src.split('?')[1]);
      const apiKey = queryParams.get('publicApiKey');

      if (!apiKey) {
        console.error('API Key is required');
        return;
      }

      loadExternalScript(apiKey);

      window.IkasEvents &&
        window.IkasEvents.subscribe({
          id: EVENT_HANDLER_ID,
          callback: handleIkasEvent,
        });
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  function loadExternalScript(publicApiKey) {
    const script = document.createElement('script');
    script.src = `https://external-service.com/script.js?key=${publicApiKey}`;
    script.async = true;
    document.head.appendChild(script);
  }

  function handleIkasEvent(event) {
    const { type, data } = event;

    switch (type) {
      case IKAS_EVENT_TYPE.PRODUCT_VIEW:
        window.ExternalService.trackProduct({
          productId: data.productDetail.id,
          name: data.productDetail.name,
          price: data.productDetail.price,
        });
        break;

      case IKAS_EVENT_TYPE.ADD_TO_CART:
        window.ExternalService.trackAddToCart({
          item: {
            id: data.item.variant.productId,
            price: data.item.finalPrice,
            quantity: data.item.quantity,
          },
        });
        break;

      case IKAS_EVENT_TYPE.COMPLETE_CHECKOUT:
        window.ExternalService.trackPurchase({
          orderId: data.transaction.id,
          items: data.checkout.items.map((item) => ({
            id: item.variant.productId,
            price: item.finalPrice,
            quantity: item.quantity,
          })),
        });
        break;
    }
  }

  init();
}

CustomEventHandler();
```

### Payload şekli (örnekten çıkarım)

| Olay | Veri yolu |
|---|---|
| `PRODUCT_VIEW` | `data.productDetail.{id, name, price}` |
| `ADD_TO_CART` | `data.item.{variant.productId, finalPrice, quantity}` |
| `COMPLETE_CHECKOUT` | `data.transaction.id` + `data.checkout.items[]` |

> Kanıt seviyesi: **Çıkarım** — belgede alan alan payload şeması verilmiyor.
> Kesin alan adları için canlı vitrinde `console.log(event)` ile ölçün.

---

## Script parametreleri ile özelleştirme

Script etiketinin URL'ine query parametresi eklenerek farklı müşteri/senaryo için
aynı dosya yeniden kullanılabilir:

```html
<script src="https://cdn.example.com/handler.js?publicApiKey=ABC123"></script>
```

Dosya içinde `document.currentScript.src` üzerinden okunur (yukarıdaki örnekte var).

---

## 🟢 Tencerecim için anlamı

Hafızadaki iki açık sorun **doğrudan** bununla çözülür:

| Sorun (hafıza) | Storefront Events çözümü |
|---|---|
| **[GTM / Dönüşüm Takibi]** — 2 fazla dönüşüm Birincil takılı | Olayları kendimiz yakalayıp GTM'e **tek, doğru** `purchase` göndeririz |
| **[Yol Tarifi Takibi]** — tık ≠ ziyaret | `CONTACT_FORM`, `PAGE_VIEW` ile gerçek etkileşimi ölçeriz |
| **[GA4 Erişim ve Bulgular]** — Instagram gelirin %75'i | `COMPLETE_CHECKOUT` verisini kendi Supabase'imize yazıp **panel ROAS'ından bağımsız** 4. basamak ölçüm kurarız |

🔴 `docs/google-ads-reference.md` §1'deki **0. basamak kapısı** tam burada kapanır:
vitrinden gelen `transaction.id`'yi ikas siparişiyle eşleyip *panel ile gerçek arasındaki
farkı ölçebiliriz*.
