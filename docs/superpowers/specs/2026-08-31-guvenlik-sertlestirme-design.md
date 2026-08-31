# Güvenlik Sertleştirme — Tasarım (2026-08-31)

## Amaç

İki ayrı riski kapatmak:

1. **Dışarı sızma** — repo PUBLIC. Şirket verisi (fatura, fiyat, müşteri) ve API
   anahtarları GitHub'a gitmemeli. Bugüne kadar sızıntı YOK (`git log --all
   --diff-filter=A` ile doğrulandı), ama koruma tamamen insan disiplinine bağlı.
2. **İçeriden/cihazdan sızma (KVKK)** — programı çalıştırabilen biri, rolü ne
   olursa olsun, tüm müşteri verisine ve API secret'larına ulaşabiliyor; yerel
   veritabanı şifresiz.

Dört faz, sırayla: A → B → C → D. Her faz kendi başına yayınlanabilir.

---

## Faz A — Repo sızıntı kancası + tedarik zinciri

### Sorun

`.gitignore` yalnızca **takip edilmeyen** dosyaları korur ve yalnızca bildiği
desenleri bilir. Yeni bir şirket-verisi klasörü açıldığında ilk `git add` onu
public'e taşır; `.gitignore`'a sonradan eklemek geçmişten silmez.

Ayrıca: `npm audit` hiç çalışmıyor, bağımlılıklar `^` ile gevşek, `electron@22`
güvenlik yaması almıyor.

### Çözüm

**A1 — `scripts/sizinti-tara.js`**: saf Node, bağımlılıksız tarayıcı. Verilen
dosya listesini iki kurala göre inceler:

- *Yol kuralı*: şirket-verisi klasör/uzantı desenleri (FATURALAR, TRENDYOL,
  `.xlsx`, `.db`, `.env`, taranmış belge görselleri…). `.gitignore`'daki
  listeden bağımsız, **kendi** beyaz/kara listesi vardır — çünkü asıl amaç
  `.gitignore`'un unuttuğunu yakalamak.
- *İçerik kuralı*: dosya içinde anahtar/parola deseni (JWT `eyJ...`,
  `service_role`, `sk_live`, `client_secret`, `password: "..."`, TC kimlik no
  gibi 11 haneli sayı bloğu, IBAN).

Çıktı: bulunan her ihlal için `dosya:satır — sebep`. İhlal varsa exit 1.

**A2 — `.githooks/pre-commit`**: `git diff --cached --name-only` çıktısını A1'e
verir. İhlal varsa commit'i **durdurur** ve nasıl geçileceğini yazar
(`git commit --no-verify` bilinçli kaçış yolu olarak kalır — kanca bir kilit
değil, bir kemer).

Kanca `core.hooksPath=.githooks` ile devreye girer; bu ayar repoya girmediği
için `npm run guvenlik:kur` betiği tek seferde kurar ve `postinstall`'da
otomatik çalışır. Diğer PC'lerde de kendiliğinden kurulur.

**A3 — `npm run guvenlik:denetle`**: `npm audit --omit=dev --audit-level=high`
+ A1'i **tüm takipli dosyalar** üzerinde çalıştırır. Yayın öncesi kapı.

**A4 — Bağımlılık kilitleme**: `package.json`'daki `^` işaretleri kaldırılıp
tam sürüme sabitlenir (`package-lock.json` zaten var, ama `^` bir `npm update`
sırasında beklenmedik sürüm çeker). `electron@22` bilinçli olarak KALIR
(Windows 7/8 mağaza PC'leri destekleniyor) — bu karar `docs/` içinde
gerekçesiyle yazılır ki "unutulmuş eski sürüm" sanılmasın.

### Test

`scripts/sizinti-tara.test.js` (vitest): temiz dosya geçer; FATURALAR yolu
yakalanır; içinde JWT olan `.js` yakalanır; `supabase/KURULUM.md`'deki
`service_role` **kelimesi** (anahtarın kendisi değil) yanlış alarm vermez.

---

## Faz B — Yetki sahteciliğini kapatma

### Sorun

`electron/yetki.js`, renderer'ın `auth:profil-ayarla` ile gönderdiği
`{rol, izinler, aktif}` nesnesine koşulsuz güvenir. Renderer'a erişebilen biri
`{rol: 'super_admin'}` gönderip tüm müşteri verisini ve API secret'larını
çekebilir. DevTools kapatmak yalnızca ilk bariyer.

### Çözüm

Renderer artık **iddia** göndermez, yalnızca **kanıt** gönderir:
`auth:profil-ayarla({ access_token })`.

Main process (`electron/oturum-dogrula.js`, `https` modülü ile — `ikas/client.js`
ile aynı desen):

1. `GET /auth/v1/user` → token geçerli mi, `uid` kim.
2. `GET /rest/v1/profiles?id=eq.<uid>&select=rol,izinler,izinli_lokasyonlar,aktif`
   → **rolün kendisi Supabase'den okunur**, renderer'dan değil.
3. Sonuç `aktifProfil` olarak yazılır ve `{ uid, profil, dogrulanma: Date.now() }`
   olarak `safeStorage` ile şifrelenip `userData/oturum-onbellek.bin`'e konur.

**Çevrimdışı davranış**: Supabase'e ulaşılamıyorsa önbellekteki son
**doğrulanmış** profil kullanılır — ama yalnızca 12 saat. Süre dolmuşsa profil
`null` kalır, yani hiçbir yetki yok. Önbellek, o an girilen e-postanın
uid'siyle eşleşmiyorsa kullanılmaz (başka personel giremez).

Token doğrulanamıyorsa (401) önbellek de silinir.

### Test

`electron/oturum-dogrula.test.js`: geçerli token → Supabase'den gelen rol
kullanılır; renderer `{rol:'super_admin'}` göndermeye çalışsa bile o alan
okunmaz; ağ hatası + taze önbellek → önbellek kullanılır; ağ hatası + 12 saati
geçmiş önbellek → yetki yok; 401 → önbellek silinir.

---

## Faz C — Yerel DB secret şifreleme + parolalı yedek

### Sorun

`userData/tencerecim.db` düz SQLite. İçinde müşteri ad/telefon/adresi ve
ikas `client_secret`, UPS şifresi, Meta token'ı düz metin duruyor. Bilgisayar
çalınır veya dosya kopyalanırsa doğrudan KVKK ihlali. `yedek:olustur` da
şifresiz `.db` üretir.

### Çözüm

Tüm veritabanını şifrelemek (SQLCipher) `better-sqlite3` değişimi demek —
kapsam dışı. Bunun yerine **iki hedefli** koruma:

**C1 — Secret sütunları**: `ikas_ayarlar`, `ups_ayarlar`, `meta_ayarlar`
tablolarındaki anahtar/şifre/token sütunları `safeStorage.encryptString` ile
şifrelenip base64 olarak yazılır. Okuma tarafında tek bir `cozOku()` helper'ı
şeffaf çözer. Migration: açılışta düz metin görülen satırlar bir kez şifrelenir
(`sifreli:` öneki ile ayırt edilir — çift şifreleme olmaz).

Bu Windows DPAPI'ye dayanır: dosya başka kullanıcıya/PC'ye kopyalanırsa
çözülemez. `electron/auth.js` zaten aynı mekanizmayı kullanıyor.

**C2 — Parolalı yedek**: `yedek:olustur` artık kullanıcıdan parola ister ve
`.db` yerine AES-256-GCM ile şifrelenmiş `.tncyedek` üretir (Node `crypto`,
scrypt ile anahtar türetme). `yedek:geri-yukle` parolayı sorar. Eski `.db`
yedekleri geri yüklenebilir kalır (geriye dönük uyum).

### Test

`electron/yedek-sifre.test.js`: şifrele→çöz round-trip; yanlış parola
çözemez; bozulmuş dosya GCM etiketinden yakalanır.
`electron/db/gizli-alan.test.js`: düz metin satır migrate edilir, ikinci
çalıştırmada tekrar şifrelenmez.

---

## Faz D — KVKK dışa aktarım denetim kaydı

### Sorun

Müşteri verisi programdan Excel, PDF ve yedek olarak çıkabiliyor. KVKK'nın
"kim, ne zaman, hangi veriyi dışarı çıkardı" sorusuna bugün cevap yok.

### Çözüm

Yeni yerel tablo `disa_aktarim_log`: `(id, tarih, kullanici_email, uid, tur,
kapsam, kayit_sayisi, dosya_adi)`. Yazma noktaları: Excel dışa aktarımları,
istek/talep PDF üretimi, `yedek:olustur`, müşteri listesi dışa aktarımı.

Kayıt **yerel** kalır (bulut senkronu yok — log'un kendisi kişisel veri
içerebilir; ayrıca senkron kuyruğunu şişirir). Ayarlar > Güvenlik altında
son 500 kayıt listelenir, yalnızca `ayarlar_duzenle` yetkisiyle görünür.

Log silinemez (uygulama içinden silme arayüzü yok).

### Test

`electron/db/disa-aktarim-log.test.js`: kayıt yazılır, listelenir, yetkisiz
okuma reddedilir.

---

## Kapsam dışı (bilinçli)

- Tüm veritabanının SQLCipher ile şifrelenmesi — `better-sqlite3` değişimi gerektirir.
- İki faktörlü kimlik doğrulama.
- `electron@22`'den yükseltme — mağaza PC'lerinin işletim sistemi desteği nedeniyle.
- Geçmiş git temizliği — geçmiş zaten temiz, yapılacak bir şey yok.
