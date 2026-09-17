# 01 — ikas Uygulama Platformu: Türler ve Yetenekler

> Kaynak: https://builders.ikas.com/docs/app-development
> Çekim tarihi: 14.09.2026 · Kanıt seviyesi: **Belgeli**

ikas yalnızca bir e-ticaret altyapısı değil; geliştiricilerin mağaza sahipleri için
çözüm üretebileceği bir **uygulama platformudur**.

## Platformun sunduğu 5 şey

| Yetenek | Açıklama |
|---|---|
| **Admin GraphQL API** | Ürün, sipariş, müşteri, envanter verisine erişim |
| **Webhook** | Gerçek zamanlı olay bildirimi (polling yok) |
| **Uygulama Aksiyonları** | Yönetim Paneli ekranlarına kendi butonunu ekleme |
| **App Bridge** | iframe ↔ ana panel iletişimi (token alma, yönlendirme) |
| **ikas CLI** | Proje iskeleti, tünel, OAuth uygulaması otomatik kurulum |

---

## İki uygulama türü

### A) Admin Uygulaması (Public App)

- ikas **Uygulama Mağazası** üzerinden yayınlanır
- **Next.js ile geliştirilmelidir** (zorunlu tavsiye)
- ikas Admin Paneli **içinde iframe olarak** çalışır
- **OAuth2 Authorization Code Flow** kullanır
- Ücretli/ücretsiz plan + deneme süresi desteği var
- **Partner hesabı gerekir**

### B) Özel Uygulama (Private App)

- **Tek mağazaya özgüdür**
- **Partner hesabı GEREKMEZ** — mağaza panelinden doğrudan oluşturulur
- **OAuth2 Client Credentials Flow** kullanır
- **Yalnızca API tabanlıdır** — UI/iframe desteği YOK
- Basit kurulum

### Karşılaştırma tablosu (belgeden aynen)

| Özellik | Admin App | Özel App |
|---|:---:|:---:|
| Webhook | ✅ | ✅ |
| iframe render | ✅ | ❌ |
| App Bridge | ✅ | ❌ |
| Actions (panel aksiyonları) | ✅ | ❌ |

---

## 🔴 Tencerecim için kritik çıkarım

**Bugün kullandığımız model = Özel Uygulama (Private App).**
PC uygulamamız `client_credentials` ile token alıp GraphQL'e yazıyor.

Bu yüzden hafızadaki **[ikas Kimlik Script Engeli]** kuralı geçerli:
Özel uygulama **panel arayüzüne hiçbir şey ekleyemez** — ne buton, ne sayfa, ne aksiyon.
Panelde görünmek istiyorsak **Admin App'e geçmek zorunludur** (Partner hesabı + Next.js + OAuth).

Ayrıntılı karar tablosu: [`90-TENCERECIM-NE-YAPABILIRIZ.md`](90-TENCERECIM-NE-YAPABILIRIZ.md)
