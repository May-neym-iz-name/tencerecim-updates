# Güvenlik

Bu depo **PUBLIC**. Buraya giren her şey internete açılır ve geçmişten silinmesi
zordur. Bu belge korumaların ne olduğunu, nasıl çalıştığını ve neyin bilinçli
olarak açık bırakıldığını anlatır.

---

## 1. Sızıntı koruması (commit öncesi)

### Nasıl çalışır

`git commit` çalıştırdığında `.githooks/pre-commit` devreye girer ve
**yalnızca o commit'te değişen dosyaları** `scripts/sizinti-tara.js`'e verir.
Tarayıcı iki şey arar:

| Kural | Ne yakalar |
|-------|-----------|
| **Yol** | `FATURALAR/`, `TRENDYOL/`, `URUN-ESLESTIRME/` gibi şirket verisi klasörleri; `.xlsx` `.db` `.csv` `.pdf` gibi veri uzantıları; `.env`; kök dizindeki taranmış belge görselleri |
| **İçerik** | JWT token, `sb_secret_` (Supabase gizli anahtarı), GitHub jetonu, `sk_live_`, düz metin parola/secret ataması, **geçerli TC kimlik numarası**, IBAN |

İhlal bulunursa commit **durur** ve ne yapılacağı ekrana yazılır.

### Neden `.gitignore` yetmiyor

`.gitignore` yalnızca *takip edilmeyen* dosyaları korur ve yalnızca **bildiği**
desenleri bilir. Yarın açılacak yeni bir şirket-verisi klasörünü bilmez. Ayrıca
`git add -f` ignore kuralını atlar — kanca onu bile yakalar (test edildi).

### Yanlış alarm çıkarsa

Satır sonuna şu yorumu ekle:

```js
const ornek = "sk_live_ornek_anahtar"  // sizinti-tara: yok-say
```

Kalıcı bir desen sorunu varsa `scripts/sizinti-tara.js` içindeki kuralı düzelt
ve `scripts/sizinti-tara.test.js`'e o durumu ekleyen bir test yaz.

**Yanlış alarm, kaçırmak kadar zararlıdır**: kullanıcı `--no-verify` alışkanlığı
edinirse bariyer tamamen işlevsiz kalır. Bu yüzden desenler "gerçek anahtar
biçimi" arar, "anahtar kelimesi" değil — örneğin `service_role` *kelimesi*
alarm vermez, ama gerçek bir `sb_secret_...` anahtarı verir.

### Bilerek geçmek

```bash
git commit --no-verify
```

Bu bir kilit değil, kemer. Ama kullanmadan önce iki kez düşün.

### Kurulum (yeni PC'de)

`npm install` yeterli — `postinstall` kancayı kendiliğinden kurar. Elle:

```bash
npm run guvenlik:kur
```

### Tüm depoyu tarama

```bash
npm run guvenlik:tara       # sadece sızıntı taraması
npm run guvenlik:denetle    # sızıntı taraması + npm audit (yayın öncesi kapı)
```

---

## 2. Tedarik zinciri (dışarıdan gelen kod)

### Bağımlılık kilitleme

`package.json`'daki tüm sürümler **tam sürüme sabitlenmiştir** (`^` yok).
`^` bir `npm update` sırasında beklenmedik yeni sürüm çeker; bu, bir bağımlılık
ele geçirildiğinde zararlı kodun sessizce gelmesi demektir.

Sürüm yükseltmek artık bilinçli bir karar: `package.json`'ı elle düzenle,
`npm install` çalıştır, `npm test` ve `npm run guvenlik:denetle` ile doğrula.

### Bilinen açık: `xlsx` (SheetJS)

`npm audit` şu an **1 high** bulgu veriyor:

```
xlsx  *  Prototype Pollution + ReDoS   (npm registry'deki 0.18.5 terk edilmiş)
```

Bu **gerçek bir risk**: uygulama tedarikçilerden gelen Excel dosyalarını
(`electron/db/excel-import.js`) ayrıştırıyor — yani *güvenilmeyen girdi*.

SheetJS npm registry'den ayrıldı; yamalı sürüm kendi CDN'lerinde. Düzeltme:

```bash
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npm test
```

Bu komut **henüz çalıştırılmadı** (kayıt dışı kaynaktan kurulum onay ister).
Çalıştırıldığında `npm run guvenlik:denetle` yeşile döner.

### `js-yaml` — kapatıldı

`electron-updater`'ın çektiği `js-yaml@4.2.0` DoS açığı vardı.
`package.json > overrides` ile `4.3.2`'ye sabitlendi.

### `electron@22` — bilinçli olarak eski

Electron 22 artık güvenlik yaması almıyor. **Kasıtlı olarak korunuyor**: mağaza
PC'lerinin işletim sistemi daha yeni Electron sürümlerini desteklemiyor
(Electron 23+ Windows 7/8/8.1 desteğini kaldırdı).

Risk azaltıcılar zaten yerinde:
- `contextIsolation: true`, `nodeIntegration: false`
- Üretimde DevTools ve varsayılan menü kapalı
- Dış bağlantılar `setWindowOpenHandler` ile engellenip harici tarayıcıya
  yönlendiriliyor
- Uygulama rastgele web sitesi açmıyor; yalnızca kendi arayüzünü yüklüyor

**Bu karar unutulmuş bir eski sürüm değildir.** Mağaza PC'leri yenilendiğinde
Electron'u yükseltin.

---

## 3. Uygulama içi (Faz B–D)

Bu bölümler ilgili fazlar tamamlandıkça doldurulacak. Tasarım:
`docs/superpowers/specs/2026-08-31-guvenlik-sertlestirme-design.md`

- **Faz D** — KVKK dışa aktarım denetim kaydı

### Faz C — Diskteki secret'lar + parolalı yedek (TAMAMLANDI)

**C1 — Secret alanları diskte şifreli.** `userData/tencerecim.db` düz SQLite;
içinde ikas `client_secret`, UPS `sifre` ve Meta `app_secret` / `sayfa_token`
düz metin duruyordu. Artık bu alanlar Windows DPAPI (Electron `safeStorage`) ile
şifrelenip `gzl1:` önekiyle saklanıyor. Dosya başka bir makineye kopyalanırsa
çözülemez.

> ⚠️ **En kritik tuzak:** `ikas_ayarlar` ve `ups_ayarlar` Supabase'e
> **senkronlanıyor** (`ayar-senk.js`). Şifreli değer buluta giderse diğer PC onu
> ASLA çözemez (DPAPI makineye/kullanıcıya bağlıdır) ve entegrasyonlar sessizce
> ölür. Bu yüzden şifreleme **yalnızca diskte**: `ayar-senk.topla()` çözerek
> okur, `uygula()` şifreleyerek yazar. Yeni bir secret alanı eklerken
> `gizli-alan.js > HASSAS_ANAHTARLAR`'a ekleyin ve senkron yollarının hâlâ düz
> metin taşıdığını doğrulayın.

Geçiş açılışta tek seferde yapılır (`database.js > init`), en fazla 4 satıra
dokunur, tekrar çalıştırmak güvenlidir. Çözülemeyen değer boş döner —
bozuk secret'la API'ye gitmektense "ayar girilmemiş" davranışı doğrudur.

Şifrelenecek alanlar bilerek **dar** tutuldu: `store_name`, `client_id`,
`kullanici_kodu` gibi tanımlayıcılar tek başlarına erişim vermez, şifrelemek
senkron kırma riskini boşuna artırırdı.

**C2 — Parolalı yedek.** `yedek:olustur` artık parola ister ve
`.tncyedek` üretir: `scrypt` (N=32768) ile paroladan anahtar türetilir,
`AES-256-GCM` ile şifrelenir. GCM aynı zamanda bütünlüğü doğrular — bozulmuş
ya da kurcalanmış yedek sessizce geri yüklenemez. Tuz ve IV her seferinde
rastgeledir.

- Arayüz parolayı **iki kez** sorar: yanlış yazılan parola kurtarılamaz bir
  yedek demektir; "şifremi unuttum" yolu YOKTUR.
- Şifrelenmemiş ara dosya kullanıcının klasörüne asla yazılmaz (geçici dizinde
  oluşturulup hemen silinir).
- Eski şifresiz `.db` yedekleri geri yüklenebilir kalır.

**Dosyalar:** `electron/db/gizli-alan.js` (+13 test),
`electron/db/gizli-alan-canli.js`, `electron/yedek-sifre.js` (+9 test),
`electron/yedek.js`, `src/pages/Ayarlar.jsx`.

### Faz B — Oturum doğrulama (TAMAMLANDI)

**Eski davranış:** Renderer, main process'e `{rol:'super_admin', aktif:true}`
gibi bir nesne gönderiyordu ve main ona koşulsuz güveniyordu. Renderer'a
erişebilen biri (DevTools, enjekte edilmiş kod) tek satırla tüm müşteri
verisine ve API secret'larına ulaşabiliyordu.

**Yeni davranış:** Renderer artık bir *iddia* değil, bir *kanıt* gönderir —
Supabase `access_token`. Main process bu jetonla Supabase'e kendisi sorar:

1. `GET /auth/v1/user` → jeton geçerli mi, kullanıcı kim
2. `GET /rest/v1/profiles?id=eq.<uid>` → **rol buradan okunur**

Renderer'ın gönderdiği hiçbir yetki alanı okunmaz. Jeton geçersizse (401)
hiçbir yetki oluşmaz ve giriş reddedilir.

**Çevrimdışı çalışma:** Başarılı her doğrulama `safeStorage` (Windows DPAPI) ile
şifrelenip `userData/oturum-onbellek.bin`'e yazılır. İnternet yokken bu önbellek
**en fazla 12 saat** kullanılabilir. Kurallar:

- Önbellek yalnızca **aynı** kullanıcı için geçerlidir (jetondaki `sub` ile
  eşleşmezse kullanılmaz) — başka personel onunla giremez.
- Çevrimdışı kullanım süreyi **uzatmaz**; aksi halde hiç internete çıkmayan bir
  makine sonsuza dek eski yetkiyle çalışırdı.
- Çıkışta önbellek silinir.
- Jeton 401 dönerse önbellek silinir.

**Dosyalar:** `electron/oturum-dogrula.js` (saf mantık, 14 test),
`electron/oturum-canli.js` (https + DPAPI bağlantıları), `electron/yetki.js`.

**Test-only kaçış:** `yetki._profilYazTestIcin()` doğrulamayı atlar ama `_`
önekli olduğu için main.js onu IPC'ye **hiç kaydetmez** — renderer çağıramaz.

---

## 4. Geçmiş durumu

2026-08-31 taraması: `git log --all --diff-filter=A` ile deponun **tüm
geçmişinde** bir kez bile eklenmiş dosyalar tarandı. Şirket verisi klasörleri,
`.env`, `.db`, `.xlsx` — hiçbiri geçmişte yok. Takipli 251 dosyada anahtar
deseni yok. **Bugüne kadar sızıntı olmamıştır.**

(2026-08-15'te `UPS KARGO ENTEGRASYONU/` `git filter-repo` ile geçmişten
temizlenmişti — o temizlik hâlâ geçerli.)
