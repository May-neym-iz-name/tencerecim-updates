# tencerecim-kargo — UPS takip Worker'ı

Cloudflare planının (`docs/cloudflare-plani.md`) **Adım 0 + Adım 1**'i.
UPS gönderi durumlarını 7/24 yoklar; uygulama kapalıyken de çalışır.

## Ne yapar, ne yapmaz

| Worker'ın işi | Uygulamanın işi (değişmez) |
|---|---|
| UPS'e "bu numara nerede?" diye sormak | `durumCevir` ile yorumlamak |
| Sonucu D1'e yazmak | Yerel SQLite'a yazmak (`kargolar`, `online_siparisler`) |
| Kimlik bilgisini saklamak (Secret) | ikas'a durum bildirmek (`ikas/kargo-durum.js`) |
| | Bildirim merkezi + telafi turu |

Worker **yoklanacak listeyi üretemez** — o liste yerel SQLite'taki `kargolar` +
`online_siparisler` birleşiminden çıkar (`electron/ups/takip.js:94`). Bu yüzden akış
üç parçalıdır:

```
uygulama ──POST /kargo/izle──►  D1.izlenen
                                    │
                            cron (5 dk) → UPS
                                    │
                                D1.durumlar
                                    │
uygulama ──GET /kargo/durumlar?since=…──► yerel yazım + ikas bildirimi
```

## Uçlar

| Uç | Yetki | Ne yapar |
|---|---|---|
| `GET /saglik` | yok | `{ok:true}` |
| `GET /saglik` | Bearer | kayıt sayıları + son sorgu zamanı |
| `POST /kargo/izle` | Bearer | `{"takipler":["1Z…","1Z…"]}` — izleme listesini birleştirir |
| `GET /kargo/durumlar?since=ISO` | Bearer | son okumadan beri **durumu değişenler** |
| `POST /kargo/yokla` | Bearer | bir turu elle tetikler (test için) |
| `POST /ikas/webhook/<gizli-yol>` | **yok** | ikas webhook alıcısı — olay kuyruğuna yazar |
| `GET /ikas/olaylar?since=ISO` | Bearer | son okumadan beri gelen ikas olayları |

### ikas webhook ucu neden kimliksiz?

ikas bizim bearer'ımızı göndermez ve imza başlığı belgelemez
(`docs/ikas-api-reference.md:154`). Uç zorunlu olarak açıktır. Koruma üç katman:
tahmin edilemez gizli yol (`IKAS_WEBHOOK_YOLU` secret'ı), gövdeye güvenmemek
(yalnız sipariş id'si alınır, kaydı uygulama ikas'tan çeker) ve dakikada 60 olay
tavanı.

**Bu uç her durumda 200 döner** — geçersiz id'de bile. ikas 200 dışında bir cevapta
3 denemeden sonra o teslimattan tamamen vazgeçer; düşen olayı uygulamanın 5 dk'lık
mutabakat turu yakalar.

`/ikas/olaylar` imleci `>` kullanır (kargo tarafındaki `>=`'den farklı): aynı siparişin
birden çok olayı olabildiği için tüketilen satırın tekrar gelmesine gerek yok.

`since` imleci: yanıttaki `imlec` alanını saklayıp bir sonraki isteğe verin.
Sınır `>=` olduğu için aynı kayıt tekrar gelebilir — zararsızdır, uygulamadaki
yazımlar zaten idempotenttir (`takip.js:193`).

## Ücretsiz plan sınırları — tasarımı bunlar belirledi

| Sınır | Değer | Sonuç |
|---|---|---|
| Alt-istek / çağrı | **50** | tur başına en fazla ~45 UPS sorgusu |
| CPU / çağrı | **10 ms** | XML ayrıştırma partisi küçük tutulmalı |
| Cron tetikleyici / hesap | 5 | 2 kullanıyoruz |
| Cron duvar saati | 15 dk | bol bol yeter |

Bu yüzden `PARTI_BOYUTU = 15` ve cron 5 dakikada bir → saatte ~180 sorgu.
Ölçülen ~93 açık kargo için fazlasıyla yeterli.

**Workers Paid'e ($5/ay) geçilirse** sınırlar 10.000 alt-istek / 30 sn CPU olur;
`PARTI_BOYUTU` tek hamlede 45+'e çıkarılabilir ve cron 10 dakikaya seyreltilebilir.

## Kurulum

> **Hesap:** `Info@resiftencerecim.com` (`9c347c235d3503fc66bfb2666ff5be33`).
> Bu PC'deki wrangler varsayılan olarak **başka bir hesaba** (`Info@asafgastro.com`)
> bağlı — kuruluma başlamadan hesabı değiştirin, yoksa Worker yanlış hesaba gider.

```powershell
cd cloudflare\kargo-worker
npm install -D wrangler@latest

# 1) Doğru hesaba geç ve DOĞRULA
npx wrangler login
npx wrangler whoami        # "Info@resiftencerecim.com" yazmalı

# 2) D1 veritabanı — çıktıdaki database_id'yi wrangler.jsonc'a yapıştır
npx wrangler d1 create tencerecim-kargo
npx wrangler d1 execute tencerecim-kargo --remote --file ./schema.sql

# 3) Sırlar (değerler sorulunca girilir, komut satırına YAZILMAZ)
npx wrangler secret put UPS_MUSTERI_KODU
npx wrangler secret put UPS_KULLANICI_KODU
npx wrangler secret put UPS_SIFRE
npx wrangler secret put PAYLASILAN_ANAHTAR   # uygulama ile Worker arasındaki bearer
npx wrangler secret put IKAS_WEBHOOK_YOLU    # ikas webhook URL'indeki gizli yol segmenti

# 4) Yayına al ve doğrula
npx wrangler deploy
curl https://tencerecim-kargo.<subdomain>.workers.dev/saglik
```

`IKAS_WEBHOOK_YOLU`, `PAYLASILAN_ANAHTAR`'dan **farklı** bir değer olmalı — biri
sızarsa diğeri sağlam kalsın.

Değeri komut geçmişine düşürmeden yüklemek için dosyadan boruyla verin
(`wrangler secret put ... < dosya`); komut satırına yazarsanız kabuk günlüğünde kalır.

Rastgele değer üretmek:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

Aynı değer uygulamada da saklanır (UPS ayarları gibi, `ups_ayarlar` tablosunda).

## Canlı doğrulama listesi

- [ ] `wrangler whoami` doğru hesabı gösteriyor
- [ ] `/saglik` token'sız `{ok:true}` dönüyor
- [ ] `/saglik` token'la sayıları dönüyor
- [ ] `POST /kargo/izle` ile bir gerçek takip no gönderilip `POST /kargo/yokla`
      çağrıldığında `sorgulanan: 1` ve `durumlar` tablosunda satır oluşuyor
- [ ] Teslim edilmiş bilinen bir gönderi için `durum_kodu = 2` geliyor
      (`docs/ups-api-reference.md §1`)
- [ ] `wrangler tail` ile cron turunun 5 dakikada bir çalıştığı görülüyor
- [ ] Bir turun CPU süresi 10 ms sınırının altında kalıyor (observability)

## Geri dönüş

Worker'ı kapatmak veri kaybettirmez: uygulamadaki 10 dakikalık yerel tur
(`electron/main.js:172`) kaldırılmaz, yalnız seyreltilir. Sorun çıkarsa aralığı
eski değerine döndürmek yeterlidir — Worker'a hiç dokunmadan sistem eski haline döner.
