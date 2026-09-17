# 31 — Özel Uygulama (Private App)

> Kaynak: `/docs/app-development/private-app/*`
> Kanıt seviyesi: **Belgeli** · 🟢 **Tencerecim'in BUGÜN kullandığı model**

Tek mağazaya özgü entegrasyon. **Partner hesabı gerekmez.**

---

## Oluşturma

1. Mağaza panelinde **Uygulamalar → Uygulamalarım**
2. **Yeni özel uygulama oluştur**
3. `client_id` ve `client_secret` verilir

🔴 **`client_secret` yalnızca BİR KEZ gösterilir.** Kopyalama ve kaydetmeyi
**aynı adımda** yapın (bkz. `~/.claude/rules/ecc/common/api-verification.md` §7).

---

## Kimlik doğrulama — Client Credentials

```http
POST https://api.myikas.com/api/admin/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={{client_id}}&client_secret={{client_secret}}
```

Dönen `access_token` Bearer olarak kullanılır:

```http
POST https://api.myikas.com/api/v2/admin/graphql
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

- `expires_in` **saniye** cinsindedir; dolunca yeni token alınır
- 🔴 `client_secret` asla paylaşılmaz, koda gömülmez
- 🔴 Token'ı **URL'e / sorgu dizesine koymayın**, yetkilendirme başlığı kullanın

---

## Yapabilecekleri / yapamayacakları

| Yetenek | Durum |
|---|---|
| Admin GraphQL API (okuma + yazma) | ✅ |
| Webhook alma | ✅ |
| Panel içinde iframe sayfası | ❌ |
| App Bridge | ❌ |
| Panele aksiyon butonu ekleme | ❌ |
| Uygulama Mağazası'nda yayınlanma | ❌ (zaten amaç değil) |

---

## Postman koleksiyonu

https://documenter.getpostman.com/view/17621802/2sAYJ7eyUq

**Kurulum:**
1. Postman **Collection Variables**'a `client_id` ve `client_secret` gir
2. **Authentication** klasöründeki *Access Token Creation* isteğiyle Bearer token üret
3. Admin API örneklerindeki **Authentication** sekmesine token'ı yapıştır

> Belgedeki uyarı: *"Postman istekleri örnektir"* — tam filtre, alan ve şema için
> canlı GraphQL arayüzünü kullanın: https://api.myikas.com/api/v2/admin/graphql

---

## Örnek: Webhook Listener (Özel Uygulama)

Belgede `/ornek-uygulamalar/custom-app-webhook-listener` altında basit bir servis
örneği var: `store/order/created` gibi webhook olaylarını dinleyen temel şablon.

> Bizim karşılığımız: `cloudflare/` altındaki webhook köprüsü Worker'ı.

---

## 🔴 Tencerecim için sınır

Hafızadaki **[ikas Kimlik Script Engeli]** kaydı buradan gelir:
özel uygulama panele **hiçbir arayüz ekleyemez**. Panelde buton/sayfa istiyorsak
tek yol **Admin App + Gizli Yayınlama**'dır — bkz.
[`90-TENCERECIM-NE-YAPABILIRIZ.md`](90-TENCERECIM-NE-YAPABILIRIZ.md).
