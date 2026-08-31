# BizimHesap API — Tam Referans

> Kaynak: https://apidocs.bizimhesap.com — indirilme tarihi: 2026-08-31


---

<!-- KAYNAK: https://apidocs.bizimhesap.com/master.md -->

> For the complete documentation index, see [llms.txt](https://apidocs.bizimhesap.com/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://apidocs.bizimhesap.com/master.md).

# Genel Bilgiler

**Entegrasyon API Dökümanı**

{% content-ref url="/pages/-Lljptf4Lg-gqHZdEZ79" %}
[Sipariş / Fatura Ekleme](/addinvoice.md)
{% endcontent-ref %}

{% content-ref url="/pages/-Llkw0IbOw6wTm-9UAVS" %}
[Ürün Listesi Alma](/products.md)
{% endcontent-ref %}

{% content-ref url="/pages/-LlkxEZZZxO7uM7dWbLd" %}
[Depoların Listesi Alma](/warehouses.md)
{% endcontent-ref %}

{% content-ref url="/pages/-LlkyGv6mgg-OC8q29Qx" %}
[Depo Stoğu Getirme](/inventory.md)
{% endcontent-ref %}


---

<!-- KAYNAK: https://apidocs.bizimhesap.com/addinvoice.md -->

> For the complete documentation index, see [llms.txt](https://apidocs.bizimhesap.com/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://apidocs.bizimhesap.com/addinvoice.md).

# Sipariş / Fatura Ekleme

{% hint style="success" %}
<https://bizimhesap.com/api/b2b/addinvoice>
{% endhint %}

{% tabs %}
{% tab title="İstek Parametreleri" %}

| Parametre       | Tip          | Açıklama                                      |
| --------------- | ------------ | --------------------------------------------- |
| **FirmID**      | \[string]    | Bizimhesap tarafından verilecek özel tekil ID |
| **InvoiceNo**   | \[string]    | Faturanın belge numarası (isteğe bağlı)       |
| **InvoiceType** | \[string]    | Fatura tipi (3:Satış, 5:Alış)                 |
| **Note**        | \[string]    | Fatura açıklaması (isteğe bağlı)              |
| **Dates**       | \[object]    | **Tarih Bilgisi**                             |
| -> InvoiceDate  | \[Date]      | Fatura tarihi                                 |
| -> DeliveryData | \[Date]      | Teslimat tarihi (opsiyonel)                   |
| -> DueDate      | \[Date]      | Ödeme Vadesi                                  |
| **customers**   | \[object]    | **Müşteri Bilgisi**                           |
| -> CustomerId   | \[string]    | Müşterinin kaynak sistemdeki ID’si            |
| -> Title        | \[string]    | Müşterinin isim/ünvanı                        |
| -> Address      | \[string]    | Fatura adresi                                 |
| -> TaxOffice    | \[string]    | Müşteri vergi dairesi (opsiyonel)             |
| -> TaxNo        | \[string]    | Müşteri vergi veya TC kimlik no (opsiyonel)   |
| -> Email        | \[string]    | Müşteri e-posta adresi (opsiyonel)            |
| -> Phone        | \[string]    | Müşteri telefonu (opsiyonel)                  |
| **Details\[]**  | \[object\[]] | **Ürün Bilgisi**                              |
| -> ProductId    | \[string]    | Ürünün kaynak sistemdeki ID’si                |
| -> ProductName  | \[string]    | Ürün/hizmet adı                               |
| -> Note         | \[string]    | Satır açıklaması (opsiyonel)                  |
| -> Barcode      | \[string]    | Ürünün barkodu (opsiyonel)                    |
| -> TaxRate      | \[decimal]   | KDV oranı                                     |
| -> Quantity     | \[decimal]   | Miktar                                        |
| -> UnitPrice    | \[decimal]   | Birim fiyat                                   |
| -> GrossPrice   | \[decimal]   | Brüt tutar (miktar x birim fiyat)             |
| -> Discount     | \[string]    | İndirim tutarı                                |
| -> Net          | \[decimal]   | Net tutar (indirim sonrası, vergisiz)         |
| -> Tax          | \[decimal]   | Vergi tutarı                                  |
| -> Total        | \[decimal]   | Toplam (net + vergi)                          |
| **Amounts**     | \[object]    | **Tutar Bilgisi**                             |
| -> Currency     | \[string]    | Fatura para birimi (TL, USD, EUR, CHF, GBP)   |
| -> Gross        | \[decimal]   | Faturanın brüt toplamı                        |
| -> Discount     | \[decimal]   | Faturadaki toplam indirim tutarı              |
| -> Net          | \[decimal]   | Faturanın net toplamı (vergisiz)              |
| -> Tax          | \[decimal]   | Faturadaki toplam vergi tutarı                |
| -> Total        | \[decimal]   | Fatura dip toplamı                            |
| {% endtab %}    |              |                                               |

{% tab title="Request" %}

```markup
{  
   "firmId":"485E152158494BE590B5F72403398765",
   "invoiceNo":"A123121",
   "invoiceType":3,
   "note":"özel sipariş",
   "dates":{  
      "invoiceDate":"2017-07-08T18:45:52.516+03:00",
      "dueDate":"2017-07-08T18:45:52.516+03:00",
      "deliveryDate":"2017-07-08T18:45:52.516+03:00"
   },
   "customer":{  
      "customerId":6761,
      "title":"Deneme Müşterisi Ltd. Şti.",
      "taxOffice":"Koparan VD",
      "taxNo":"1234567890",
      "email":"deneme@hotmail.com",
      "phone":"5320000001",
      "address":"Örnek Mah. Deneme sok No1/2 İstanbul"
   },
   "amounts":{  
      "currency":"TL",
      "gross":"2,400.00",
      "discount":"0.00",
      "net":"2,400.00",
      "tax":"432.00",
      "total":"2,832.00"
   },
   "details":[  
      {  
         "productId":13372,
         "productName":"deneme ürünü",
         "note":"36 beden",
         "barcode":"8690123456789",
         "taxRate":"18.00",
         "quantity":2,
         "unitPrice":"1200.00",
         "grossPrice":"2,400.00",
         "discount":"0.00",
         "net":"2,400.00",
         "tax":"432.00",
         "total":"2,400.00"
      }
   ]
}
```

{% endtab %}

{% tab title="Response" %}
{% hint style="success" %}
Başarılı
{% endhint %}

```
{  
   "error":"",
   "guid":"AB13123123CD12323",
   "url":"https://bizimhesap.com/........"
}
```

{% hint style="danger" %}
Hatalı
{% endhint %}

```
{  
   "error":"Hatalı para birimi",
   "guid":"",
   "url":""
}
```

{% endtab %}
{% endtabs %}


---

<!-- KAYNAK: https://apidocs.bizimhesap.com/products.md -->

> For the complete documentation index, see [llms.txt](https://apidocs.bizimhesap.com/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://apidocs.bizimhesap.com/products.md).

# Ürün Listesi Alma

{% hint style="success" %}
<https://bizimhesap.com>/api/b2b/products
{% endhint %}

{% tabs %}
{% tab title="Request" %}

| Header          | Type   | Value                            |
| --------------- | ------ | -------------------------------- |
| Key(Required)   | String | BZMHB2B724018943908D0B82491F203F |
| Token(Required) | String | Hesabınıza ait token             |
| {% endtab %}    |        |                                  |

{% tab title="Response" %}
{% hint style="success" %}
Başarılı
{% endhint %}

```
```

{% hint style="danger" %}
Hatalı
{% endhint %}

```
```

{% endtab %}
{% endtabs %}


---

<!-- KAYNAK: https://apidocs.bizimhesap.com/warehouses.md -->

> For the complete documentation index, see [llms.txt](https://apidocs.bizimhesap.com/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://apidocs.bizimhesap.com/warehouses.md).

# Depoların Listesi Alma

{% hint style="success" %}
<http://bizimhesap.com>/api/b2b/warehouses
{% endhint %}

{% tabs %}
{% tab title="Request" %}

| Header          | Type   | Value                            |
| --------------- | ------ | -------------------------------- |
| Key(Required)   | String | BZMHB2B724018943908D0B82491F203F |
| Token(Required) | String | Hesabınıza ait token             |
| {% endtab %}    |        |                                  |

{% tab title="Response" %}
{% hint style="success" %}
Başarılı
{% endhint %}

```
```

{% hint style="danger" %}
Hatalı
{% endhint %}

```
```

{% endtab %}
{% endtabs %}


---

<!-- KAYNAK: https://apidocs.bizimhesap.com/inventory.md -->

> For the complete documentation index, see [llms.txt](https://apidocs.bizimhesap.com/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://apidocs.bizimhesap.com/inventory.md).

# Depo Stoğu Getirme

{% hint style="success" %}
<http://bizimhesap.com>/api/b2b/inventory/{depo-id}
{% endhint %}

{% tabs %}
{% tab title="Request" %}

| Header          | Path Parameter      | Type   | Value                                   |
| --------------- | ------------------- | ------ | --------------------------------------- |
|                 | {depo-id}(Required) | String | Warehouse servisinden alınan depo kodu. |
| Key(Required)   |                     | String | BZMHB2B724018943908D0B82491F203F        |
| Token(Required) |                     | String | Hesabınıza ait token                    |
| {% endtab %}    |                     |        |                                         |

{% tab title="Response" %}
{% hint style="success" %}
Başarılı
{% endhint %}

```
```

{% hint style="danger" %}
Hatalı
{% endhint %}

```
```

{% endtab %}
{% endtabs %}

