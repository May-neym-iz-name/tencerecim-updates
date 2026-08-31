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

- **Faz B** — main process'in renderer'ın rol beyanına güvenmesi (yetki sahteciliği)
- **Faz C** — yerel veritabanındaki API secret'larının şifrelenmesi + parolalı yedek
- **Faz D** — KVKK dışa aktarım denetim kaydı

---

## 4. Geçmiş durumu

2026-08-31 taraması: `git log --all --diff-filter=A` ile deponun **tüm
geçmişinde** bir kez bile eklenmiş dosyalar tarandı. Şirket verisi klasörleri,
`.env`, `.db`, `.xlsx` — hiçbiri geçmişte yok. Takipli 251 dosyada anahtar
deseni yok. **Bugüne kadar sızıntı olmamıştır.**

(2026-08-15'te `UPS KARGO ENTEGRASYONU/` `git filter-repo` ile geçmişten
temizlenmişti — o temizlik hâlâ geçerli.)
