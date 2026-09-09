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
| `POST /meta/veri-silme` | **yok** (HMAC) | Meta Data Deletion Callback — `signed_request` doğrulanır, kuyruğa yazılır |
| `GET /meta/veri-silme/durum?kod=` | **yok** | kullanıcıya gösterilen durum sayfası (Meta şartı) |
| `GET /meta/veri-silme/bekleyenler?since=ISO` | Bearer | imleçten sonraki talepler (durum filtresi YOK — çok-PC) |
| `POST /meta/veri-silme/tamam` | Bearer | `{"sonuclar":[{"onay_kodu":"…","silinen":0}]}` |

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


## Meta veri silme geri çağrısı (Data Deletion Callback)

**Neden:** Callback URL tanımlı değilse Meta her silme talebini App Dashboard'a
**Urgent uyarı** olarak düşürür ve listeyi elle indirip yerel DB'de aramak gerekir
(09.09.2026'da iki kez oldu: 25.08 ve 07.09 — 33 kimlik, hiçbiri DB'de yoktu).

**İş bölümü kargo/ikas ile aynı:** kişisel veri yalnız mağaza PC'sinin yerel
SQLite'ındadır, bulutta kopyası yoktur. Worker imzayı doğrular ve kuyruk tutar;
silmeyi uygulama yapar.

```
Meta ──POST /meta/veri-silme──► D1.veri_silme_talepleri (bekliyor)
uygulama ──GET  /meta/veri-silme/bekleyenler──► yerel sosyal_mesajlar silme
uygulama ──POST /meta/veri-silme/tamam───────► D1 (silindi)
kullanıcı ──GET /meta/veri-silme/durum?kod=──► durum sayfası
```

### Kurulum

```bash
# 1) Yeni tabloyu uygula (dosya idempotent, mevcut tablolara dokunmaz)
npx wrangler d1 execute tencerecim-kargo --remote --file=schema.sql

# 2) Uygulama gizli anahtarı — App Dashboard > App settings > Temel > "App secret"
#    DEĞERİ KOMUT SATIRINA YAZMA, wrangler soracak:
npx wrangler secret put META_APP_SECRET

# 3) Yayına al
npx wrangler deploy

# 4) Doğrula: imzasız istek 400 dönmeli (503 dönerse secret girilmemiş demektir)
curl -X POST https://tencerecim-kargo.<subdomain>.workers.dev/meta/veri-silme   -d 'signed_request=sahte.imza'
```

Sonra App Dashboard > App settings > **Temel** > **User data deletion** açılır kutusunu
"Data deletion callback URL" yap, alana şunu yaz ve kaydet (⚠ Gelişmiş sayfasındaki
metin bu alanı anıyor ama alan orada DEĞİL, Temel'de — 09.09.2026 ölçüldü):

```
https://tencerecim-kargo.<subdomain>.workers.dev/meta/veri-silme
```

### Uygulama tarafı — `electron/meta/veri-silme.js`
Saatte bir tur (`main.js metaVeriSilmeBaslat`): imleçten sonraki talepleri çeker,
`sosyal_mesajlar` (`gonderen_id`/`konu_id`/`ozel_mesaj_alici`) + `kupon_dagitim.alici_id`
siler, `tamam` der, imleci ilerletir. İmleç PC'ye özel (`yerel_ayarlar.meta_veri_silme_imlec`)
çünkü sosyal_mesajlar senkronlanmıyor — her PC kendi kopyasını kendisi siler.
`ust_id` BİLEREK silme ölçütü değil (yorum kimliği, kişi değil) — testte sabit.
