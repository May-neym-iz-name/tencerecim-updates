# 08 — Rate Limit ve Engelleme Kuralları

> Kaynak: `/docs/admin-api/rate-limits`
> Kanıt seviyesi: **Belgeli** · 🔴 **Bu sayfa operasyonel olarak en kritik olanıdır**

---

## Genel istek limiti

> **10 saniyede maksimum 50 istek.**

Aşılırsa **429 Too Many Requests** döner.

---

## Hata oranı limiti

**1 saatlik pencerede hata oranı %25'i aşarsa** sistem otomatik olarak **1 saatlik
engel** uygular; tüm sonraki istekler reddedilir.

---

## API çağrısı engelleme kuralları (3 kademe)

| Engel süresi | Koşul |
|---|---|
| **30 dakika** | Hata oranı ≥ **%60** **ve** 1 saat içinde > **300** istek |
| **12 saat** | Hata oranı ≥ **%60** **ve** 1 gün içinde > **3.000** istek |
| **KALICI** | Hata oranı ≥ **%60** **ve** 5 gün içinde > **9.000** istek |

---

## Webhook engelleme kuralları (daha sıkı)

| Engel süresi | Koşul |
|---|---|
| **15 dakika** | Hata oranı ≥ **%70** **ve** 30 dakika içinde > **10** istek |
| **1 saat** | Hata oranı ≥ **%70** **ve** 3 saat içinde > **60** istek |
| **KALICI** | Hata oranı ≥ **%70** **ve** 1 gün içinde > **240** istek |

---

## Belgenin önerdikleri

1. **API yanıtlarını loglayın** — hataları tespit edin
2. Sorunlu istekleri **düzeltin**
3. 🔴 **Webhook'lar downstream iş akışını çalıştırmadan ÖNCE 200 döndürsün**

---

## 🔴 Tencerecim için doğrudan sonuçlar

| Bizim işimiz | Risk | Alınacak önlem |
|---|---|---|
| Toplu ürün açıklama işi (424 ürün) | 10sn/50 istek sınırı | İstekler arasına gecikme; batch kullan |
| Kanal stok senkronu (otomatik tur) | Tekrarlayan hata → **kalıcı engel** | Hata oranını ölç, %60'ı asla gördürme |
| Webhook köprüsü (Cloudflare Worker) | %70 hata → **1 günde kalıcı engel** | Worker **önce 200 dönsün**, işi sonra yapsın |
| Yeniden deneme döngüleri | Hata oranını şişirir | Üstel geri çekilme (exponential backoff) |

> Hafızadaki **[Yeniden Deneme Kilidi]** dersiyle birleştirin: kör retry hem UNIQUE
> kilidi hem de **kalıcı API engeli** üretebilir.
