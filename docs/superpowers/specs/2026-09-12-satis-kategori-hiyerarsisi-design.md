# Satış ekranı kategori hiyerarşisi — Marka → Ana Tip → Model → Ürün

**Tarih:** 2026-09-12
**Durum:** ✅ **UYGULANDI — v1.2.216 (2026-09-14).** §5 sıralama kuralı uygulama
sırasında düzeltildi; §2.2 kapsama sayısı yeniden ölçüldü (aşağı bak).

**Uygulama haritası**

| Ne | Nerede | Test |
|---|---|---|
| Ana tip haritası (48→21) | `electron/db/ana-tip.js` | `ana-tip.test.js` (9) |
| Model çözümleme | `electron/db/model-coz.js` | `model-coz.test.js` (20) |
| Sözlük tohumlama | `electron/db/model-sozluk-tohum.js` | `model-sozluk-tohum.test.js` (14) |
| Şema + geri doldurma | `electron/db/database.js` `migrate()` | canlı kopyada doğrulandı |
| Sözlük IPC | `electron/db/marka-modelleri.js` | — |
| Ürün/set çözümlemesi | `urunler.js` `modelleriCozumle`, `setler.js` `setModelleriCozumle` | `urunler.test.js` (+9) |
| Senkron | `electron/db/senk-sema.js` | `senk-sema.test.js` (+6) |
| Gezinme mantığı | `src/utils/satis-hiyerarsi.js` | `satis-hiyerarsi.test.js` (21) |
| Satış ekranı | `src/pages/Satis.jsx` | canlı doğrulandı |
| Model Sözlüğü ekranı | `src/components/ModelSozlugu.jsx` | canlı doğrulandı |

Kritik satırların tamamı **mutasyon testinden** geçirildi (satır bozulunca test kırmızı oluyor).
**Kapsam:** satış (kasa) ekranı gezinme mantığı + onu besleyen veri modeli

---

## 1. Amaç

Satış ekranındaki gezinme bugün **Marka → Kategori → Ürün** şeklinde. Kategoriler
malzeme ile ürün tipini birleştirdiği için (`Demir Döküm Tekli Tencereler`,
`Granit Tencere Setleri`) marka altında 20'ye yakın kart çıkıyor ve aynı tipteki
ürünler malzemeye göre dağılmış durumda.

Yeni gezinme:

```
Marka  →  Ana Tip  →  Model (yoksa "Diğer")  →  Ürün
```

Örnek: `Sofram → Tencere → Venüs → Sofram Venüs 22 cm Derin Tencere`

Ayrıca kendi setlerimiz satış ekranında markaların yanındaki ayrı mor
`🎁 Setlerimiz` kartından çıkarılıp, ait oldukları markanın altındaki `Set` ana
tipine taşınacak — tedarikçi setleriyle aynı yerde listelenecekler.

### Kullanıcı kararları (bu spec'in dayanağı)

1. **Malzeme ekseni navigasyonda YER ALMAYACAK.** Demir Döküm / Granit / Çelik /
   Seramik / Titanyum ayrımının `Tencere` dalında 984 ürünü tek listede
   birleştireceği ölçülerek bildirildi; kullanıcı hiyerarşinin yalnız
   **Marka, Ürün Tipi, Model** olmasına karar verdi.
2. **Model kaynağı melez:** ürün adından otomatik türetilir, elle düzeltilebilir.
   Yalnız elle giriş (2.901 ürün) ve yalnız otomatik türetme (düzeltilemez)
   seçenekleri reddedildi.

---

## 2. Ölçülen mevcut durum

Bütün sayılar canlı veritabanından (`%APPDATA%\tencerecim\tencerecim.db`,
2026-09-12) okunmuştur; hiçbiri tahmin değildir.

| Ölçüm | Değer |
|---|---|
| Aktif ürün | 2.901 |
| Kategori | 48 (**tamamı tek düzey**, `ust_kategori_id` hiç kullanılmamış) |
| Kategorisi olmayan aktif ürün | 167 |
| Aktif kendi setimiz | 23 |
| Kendi setlerinde `kategori_id` dolu | **0 / 23** |
| Kendi setlerinde `marka_id` dolu | **2 / 23** (yalnız Gülsan'ın ikisi) |
| `urunler` tablosunda `model` kolonu | **yok** |

### 2.1 Model, ürün adının içinde ve konumu markaya göre DEĞİŞİYOR

```
Sofram Venüs 18 cm Derin Tencere      → marka, MODEL, ölçü, biçim, tip
YUVARLAK TENCERE Ç20 FOLK BEYAZ       → biçim, tip, ölçü, MODEL, renk   (Lava)
```

Lava'nın ürün adları markayla başlamıyor ve model **ortada**. Bu yüzden
"markadan sonraki kelimeler modeldir" varsayımıyla yazılan konumsal ayrıştırma
Lava'nın 543 tencereninde yalnız `YUVARLAK` / `ÇOK AMAÇLI` biçim kelimelerini
buluyordu. Konumsal ayrıştırma **reddedildi**; yerine marka başına model sözlüğü
ve adın herhangi bir yerinde eşleştirme kullanılacak.

### 2.2 Sözlük yaklaşımının ölçülmüş kapsaması

Marka başına, ürün adlarında ≥3 kez geçen ve tip/biçim/renk/ölçü/malzeme/marka
kelimesi olmayan sözcükler model adayı sayılarak ölçüldü:

| | Değer |
|---|---|
| Model bulunan ürün | **2.450 / 2.901 (%84,5)** |
| "Diğer"e düşen | **451 (%15,5)** |

> **🔴 UYGULAMA ÖLÇÜMÜ (14.09) — geçerli sayı bu:** gerçekleşen kapsama
> **2.273 / 2.906 = %78,2**, "Diğer"de **633 ürün (%21,8)**.
>
> Bu bir gerileme DEĞİL, farklı bir durak listesinin sonucu. Yukarıdaki %84,5
> ölçümünde `kizartma`, `sapli`, `matik`, `pilav`, `turkuaz` gibi tip/biçim/renk
> kelimeleri de "model" sayılıyordu. Uygulanan tohumlayıcı ek olarak 3 harften kısa
> ve **rakam içeren** token'ları da eler (Lava'nın `c28` kodu ÇAP bilgisidir).
> Etki: LİNES sözlüğü 214 → **76**, ROLLERS 96 → **5**, LAVA 28 → **14** girdi.
>
> Takas bilinçli: **yanlış model sessiz bir hatadır, eksik model görünür bir hata.**
> Sözlükte `spatula` olsaydı ürünler sessizce yanlış dala düşerdi; olmayınca ürün
> "Diğer"de görünür ve Model Sözlüğü ekranı onu listeler. Kesinlik tarafına yaslanıldı.

Marka bazında:

| Marka | Ürün | Model bulunan | % | Not |
|---|---|---|---|---|
| LAVA | 721 | 569 | 79 | trendy 98, glaze 60, folk 59, sable 46, majolica 30 |
| LİNES | 692 | 670 | 97 | 214 farklı "model" — **gürültülü, ayıklanmalı** |
| SAFLON | 298 | 158 | 53 | flavia 37, bestinox 29, vision 19, bella 14 |
| MAXX DORIA | 289 | 289 | 100 | |
| FALEZ | 250 | 229 | 92 | black line 42, creamy 36, vento 25, serafit 18 |
| SOFRAM | 204 | 191 | 94 | soft 62, atlas 20, nesta 12, luna 10, venüs 8 |
| ROLLERS | 145 | 145 | 100 | 96 farklı "model" — **çatal-kaşık, gürültülü** |
| GÜLSAN | 112 | 75 | 67 | |
| FAGOR | 69 | 60 | 87 | |
| BIGATTI | 54 | 54 | 100 | |
| LACENA | 19 | 0 | 0 | **hiç model bulunamıyor** |
| TAÇ | 19 | 0 | 0 | **hiç model bulunamıyor** |

> **Ölçüm dürüstlüğü notu:** ilk ölçüm %97,8 kapsama vermişti. Yanlıştı — sözlüğe
> markanın kendi adı da girmişti (ürün adı "Sofram …" diye başladığı için) ve
> eşleşme modeli değil markayı yakalıyordu. Marka kelimeleri hariç tutulunca
> gerçek sayı %84,5 çıktı. Spec'te geçen tek geçerli sayı budur.

---

## 3. Ana tip haritası (48 → 21)

Toplam korunumu doğrulandı: **2.734 haritalanan + 167 kategorisiz = 2.901 = gerçek
aktif ürün.** Haritada karşılığı olmayan kategori sayısı 0.

| Ana Tip | Ürün | Kaynak kategoriler |
|---|---|---|
| Tencere | 995 | Demir Döküm / Granit / Çelik / Seramik / Titanyum Tekli Tencereler, Mega Granitler, Mega Çelikler |
| Tava | 389 | Demir Döküm / Granit / Seramik / Titanyum / Çelik Tavalar |
| Çatal Kaşık Bıçak | 253 | Kaşık Çatal Bıçak, Bıçaklar |
| Çaydanlık | 203 | Çaydanlık Takımları |
| **Set** | 172 | Demir Döküm / Granit / Çelik / Seramik / Titanyum Tencere Setleri |
| Yemek & Servis Takımı | 160 | Yemek Takımları, Kahvaltı Takımları, Servis & Sunum |
| Izgara | 104 | Demir Döküm Izgaralar, Izgaralar |
| Düdüklü | 97 | Klasik Düdüklüler, Matik Düdüklüler, Süper Hızlı Pişiriciler |
| Sahan | 82 | Demir Döküm / Granit / Titanyum / Çelik Sahanlar |
| Mutfak Gereçleri | 78 | Mutfak Gereçleri, Rende Kapları, Süzgeçler |
| Bardak & Fincan | 41 | Bardak & Fincan |
| Güveç | 34 | Güveçler, Demir Döküm Güveçler |
| Termos | 21 | Termoslar |
| Yedek Parça | 20 | Yedek Parçalar |
| Kaçerola | 18 | Kaçerola |
| Fırın Kabı | 17 | Fırın Tepsileri, Tart Kalıpları |
| Cezve | 16 | Cezveler |
| Karıştırma & Saklama Kabı | 13 | Karıştırma ve Saklama Kapları |
| Sütlük | 12 | Sütlük |
| Kase | 9 | Kaseler |
| Outlet | 0 | OUTLET |

Kategorisi olmayan 167 ürün `Diğer` ana tipine düşer (21'e ek, sanal dal).

**Gözden geçirilecek noktalar.** Her birinin bir **varsayılanı** var; kullanıcı
spec incelemesinde değiştirmezse uygulama varsayılanla ilerler ve hiçbir madde
uygulamayı bloke etmez.

| Nokta | Varsayılan | Değiştirilirse |
|---|---|---|
| `Mega Granitler` (4) + `Mega Çelikler` (7) | `Tencere` sayılır — Mega Boy bir **ölçü**dür, tip değil ([[ikas-kategori-agaci]]: "Mega Boy otomatik OLAMAZ") | ayrı `Mega Boy` ana tipi açılır |
| `Bıçaklar` (11) | `Çatal Kaşık Bıçak` içine katılır | ayrı `Bıçak` ana tipi açılır |
| `Outlet` (0 ürün) | ana tip olarak **korunur** ama ürünü olmadığı için satış ekranında kart çıkmaz | haritadan düşürülür |
| `Karıştırma & Saklama Kabı` | tek ana tip kalır | ikiye bölmek için **önce 13 ürünlük kategoriyi bölmek** gerekir; ana tip haritası tek başına yetmez |

---

## 4. Veri modeli

Mevcut hiçbir alan bozulmuyor; ürünlerin `kategori_id`'sine **dokunulmuyor**
(yeni bitirilen ikas kategori ağacı ve 42/42 SEO çalışması etkilenmez).

### 4.1 `kategoriler.ana_tip TEXT`

48 satıra bölüm 3'teki ana tip yazılır. Kategori↔ürün bağı değişmez; yalnız
"bu kategori hangi genel tipe ait" bilgisi eklenir.

### 4.2 `marka_modelleri` (yeni tablo)

```sql
CREATE TABLE marka_modelleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marka_id INTEGER NOT NULL REFERENCES markalar(id),
  model_adi TEXT NOT NULL,
  oncelik INTEGER DEFAULT 0,      -- eşleşme sıralaması; UZUNLUKTAN ÖNCE gelir (bkz. §5)
  aktif INTEGER DEFAULT 1,
  UNIQUE(marka_id, model_adi)
);
```

Bölüm 2.2'deki frekans analiziyle **tohumlanır**, sonra Model Sözlüğü ekranından
ayıklanır. Tohumlama tek seferlik bir migration adımıdır, otomatik tekrar etmez.

### 4.3 `urunler.model TEXT` ve `setler.model TEXT`

Elle geçersiz kılma alanı; normalde NULL. Doluysa sözlüğü yener. Ürün **adına
dokunmadan** düzeltme yapılabilmesi için şart: ad ikas ve muhasebeyle eşleşmek
zorunda ([[sku-tek-kaynak-kurali]], [[fiyat-kaynak-kurali]] ile aynı gerekçe).

Kolon **iki tabloya da** eklenir. `setler` atlanırsa bölüm 5'teki çözümleme
setlerde elle düzeltilemez hale gelir — setlerin adı da ikas ve bizimhesap ile
eşleşmek zorunda olduğu için orada da adı değiştirmek bir çözüm değildir.

`COALESCE` ile yazılmaz: boş gönderilen model "dokunma" sayılırsa yanlış girilmiş
bir modeli temizlemek imkânsız olur. `veri[k] !== undefined` filtresi kullanılır —
`setler.js`'te aynı tuzak için alınmış karar ([[setlerimiz]], "İki tuzak" / 1).

### 4.4 Setler

- Ana tip **daima `Set`** — `setler` tablosuna kategori alanı gerekmez, mevcut
  boş `kategori_id` kolonu olduğu gibi bırakılır.
- `marka_id` boş olan 21 set için **tek seferlik geri doldurma**: set adının baş
  kısmı marka adıyla eşleştirilir (`Sofram Atlas…` → SOFRAM). Yazmadan önce
  eşleşme listesi kullanıcıya gösterilir ve onayı alınır; eşleşmeyen set elle
  bırakılır.
- Model çözümlemesi ürünlerle **aynı** sözlükten geçer.

### 4.5 Senkron

`ana_tip`, `model` ve `marka_modelleri` senkron kolon listelerine eklenmelidir.
Atlanırsa bir PC'de girilen model diğerine hiç ulaşmaz — bu tuzak daha önce
`setler.web_link`'te yaşandı ([[setlerimiz]] içindeki "Bonus düzeltme"). Yeni
kolon açarken **yazan tüm kod yollarını say** kuralı geçerli.

---

## 5. Model çözümleme

Tek fonksiyon, tek yerde, test edilebilir. Sıra sabittir:

```
1. urunler.model (veya setler.model) dolu mu   → onu kullan
2. markanın aktif sözlüğünü ürün adında ara    → oncelik DESC, sonra EN UZUN,
                                                  sonra ad (kararlı sıra)
3. hiçbiri                                      → "Diğer"
```

**Düzeltme (2026-09-14, uygulama sırasında ölçüldü).** Bu spec ilk hâlinde "EN UZUN
eşleşme kazanır, eşitlikte oncelik" diyordu. **Yanlıştı ve kendi örneğini çözemiyordu:**
`FOLK SABLE` adında `folk` (6 krkt) ile `sable` (7 krkt) **eşit uzunlukta değil**, o
yüzden uzunluk önce gelseydi `sable` daima kazanır ve `oncelik` bu senaryoda hiç
devreye girmezdi. Model Sözlüğü ekranından "Sable, Folk'un bir yüzeyidir" demek
imkânsız olurdu — geriye 2.906 ürüne tek tek elle model girmek kalırdı ki bu §1'de
**reddedilen** seçenektir. Kullanıcı kararı: **öncelik uzunluktan önce gelir.**
Testi: `electron/db/model-coz.test.js`, "öncelik UZUNLUĞU yener".

Karşılaştırma `electron/db/tr-arama.js` `trNormal()` ile yapılır — Türkçe harf
katlaması (i/ı/İ/I, ş, ğ, ü, ö, ç) zaten orada çözülmüş ve ürün aramasıyla aynı
davranışı verir ([[turkce-arama]]).

**Kararlı sıra neden şart:** Lava'da `FOLK SABLE GRİ` gibi adlar var ve `folk` ile
`sable` ikisi de sözlükte olabilir. Kural olmadan hangisinin kazanacağı sorgu sırasına
kalır. Sıra şudur: önce **öncelik** (sözlük ekranından elle verilir), sonra **uzunluk**
(`folk sable` birleşik kaydı ikisini de yener), sonra **ad**. Böylece "Sable ayrı bir
model mi, Folk'un bir yüzeyi mi" sorusunu **veri** cevaplar, kod değil — ve cevap
sözlük ekranından değiştirilebilir.

---

## 6. Satış ekranı gezinme

`src/pages/Satis.jsx` — bugün `gorunum` şu ternary ile belirleniyor (satır 365):

```js
const gorunum = aramaModu ? 'urun'
  : secilenMarka === '__setler__' ? 'setler'
  : !secilenMarka ? 'marka'
  : (!secilenKategori && (markaKategorileri.length > 0)) ? 'kategori'
  : 'urun'
```

Yeni hâlinde düzey sırası **marka → anatip → model → urun** olur.

### 6.1 Uyarlanır derinlik

Bir düzeyde **tek** kart kalıyorsa o düzey atlanır ve doğrudan bir alt düzeye
geçilir. Bu yeni bir fikir değil: mevcut kod markanın kategorisi yoksa kategori
düzeyini zaten atlıyor. Aynı desen sürdürülür.

Gerekçe ölçülmüş: Lacena ve Taç'ta hiç model yok (19+19 ürün) — onlarda model
düzeyi tek "Diğer" kartı olur ve kullanıcıyı boşa bir dokunuşa zorlar.

### 6.2 `__setler__` kartı kaldırılır

Mor `🎁 Setlerimiz` kartı ve `gorunum === 'setler'` dalı kaldırılır. Setler
markalarının altındaki `Set` ana tipinde, tedarikçi setleriyle birlikte çıkar.

**Korunacak davranışlar** (bunlar bozulmamalı):
- Arama modunda setler ürün grid'inin üstünde ayrı bölümde listeleniyor —
  aynen kalır. Bu davranış v1.2.151'de bir hata düzeltmesiyle kazanıldı,
  `gorunum` ternary'sine dokunulmadan eklenmişti; geri gitmemeli.
- Barkod okutunca önce ürün, bulunamazsa set aranıyor (`barkodSorgu`).
- Set sepete tek kalem olarak giriyor, `setiAc()` bileşenlere açıyor.
- "Sonuç yok" mesajı setleri de hesaba katıyor.

---

## 7. Model Sözlüğü yönetim ekranı

Ürünler sekmesine yeni alt sekme (mevcut "🎁 Setler" sekmesinin yanına).

- Marka seç → o markanın model listesi (ad, öncelik, aktif)
- Ekle / düzenle / sil / öncelik değiştir
- **Canlı sayaç:** "bu markada 569 ürün eşleşti, 152'si Diğer'de"
- "Diğer"de kalan ürünleri listeleyen bir görünüm — sözlüğe ne eklenmesi
  gerektiği buradan görülür

Bu ekran %15,5'lik "Diğer" oranını düşürmenin tek yolu. Onsuz sözlük ilk
tohumlamada donar.

---

## 8. Test

| Ne | Nasıl |
|---|---|
| Ana tip haritası | 48/48 kategori eşleşir; `2.734 + 167 = 2.901` toplam korunumu doğrulanır (bu spec'teki ölçümün aynısı testte sabitlenir) |
| Model çözümleme sırası | elle > sözlük > "Diğer"; her basamak ayrı test |
| En uzun eşleşme | `FOLK SABLE` örneği; `folk sable` kaydı varken ve yokken |
| Türkçe katlama | `VENÜS` / `venüs` / `VENUS` aynı modele düşer |
| Uyarlanır derinlik | tek kartlı düzey atlanır; çok kartlı düzey atlanmaz |
| Set yerleşimi | markası çözülen set doğru dala düşer; çözülemeyen set kaybolmaz |
| Korunan davranışlar | arama modunda set bölümü, barkodla set, `setiAc()` |

Her kritik satır için **mutasyon testi** yapılır: satır bozulunca test kırmızı
olmuyorsa test boştur ([[mutasyon-testi]]).

---

## 9. Riskler ve kabul edilmiş ödünler

1. **633 ürün (%21,8) başlangıçta "Diğer"de** (ölçüm 14.09; ilk tahmin 451 / %15,5 idi).
   Sözlük ayıklanınca düşer, ama ilk sürümde bu dal dolu olacak. Ayrıca sözlük
   **tohumlanana kadar** oran %100'dür — tohumlama kullanıcı onayıyla yapılır,
   otomatik değildir.
2. **Rollers (145) ve Lines (692) sözlükleri gürültülü** — 96 ve 214 sözde model.
   Bu iki markada sözlük ayıklanana kadar model düzeyi işe yaramaz; uyarlanır
   derinlik burada kurtarmaz çünkü kart sayısı **fazla**, az değil.
3. **Lacena ve Taç'ta hiç model yok.** Uyarlanır derinlik model düzeyini atlar.
   Canlı doğrulandı (14.09): sözlük boşken LAVA > Tencere'ye girildiğinde model düzeyi
   atlandı ve 543 ürün doğrudan listelendi — kullanıcı boşa dokunuş yapmadı.
4. **Dört düzey kasada dokunuş sayısını artırır.** Uyarlanır derinlik hafifletir,
   tamamen gidermez. Hızlı satış için barkod ve arama yolları değişmiyor.
5. **Malzeme ayrımı navigasyondan çıkıyor.** `Tencere` dalında 984 ürün malzemeye
   göre ayrışmadan listelenir. Kullanıcıya ölçülerek bildirildi, kararı bu.
   İleride istenirse ürün listesine bir süzgeç düğmesi olarak eklenebilir —
   bu spec'in kapsamı dışında.

---

## 10. Kapsam dışı

- ikas kategori ağacına dokunmak (42 kategori + SEO tamamlandı, bozulmayacak)
- Ürünler sekmesindeki kategori/marka CRUD ekranları
  ([[yapilacak-kategori-marka-duzenleme]] ayrı iş)
- Malzeme süzgeci
- Stok sayım / mal kabul ekranları (setler oralarda bilerek yok)

---

## 11. Tohumlama sonucu (2026-09-15, kullanıcıyla birlikte yapıldı)

Sözlük canlı veritabanına yazıldı: **202 kayıt / 11 marka**. Kapsama **%0 → %91,8**
(2.668 / 2.906 ürün). 21 setin `marka_id`'si geri dolduruldu (23/23 eşleşti,
markası boş set kalmadı).

### 11.1 🔴 Üçüncü düzeyin adı "model", işlevi ÜRÜNÜ BULMAK

Kullanıcı kararı (15.09): *"olmayan noktalarda kategori gibi genel sınıflandırmalar
kullanabiliriz… Önemli olan kullanıcıların barkodu okutamadığı senaryoda ürünü
rahatça bulabilmesi."*

Bu, §5'i genişletir: sözlük yalnız **seri adı** taşımak zorunda değildir. Model
olmayan markalarda o markada ürünleri **gerçekten ayıran** eksen kullanılır.
Hangi eksenin ayırdığı marka marka **ölçüldü**, tahmin edilmedi:

| Marka | Kazanan eksen | Kapsama |
|---|---|---|
| SAFLON | MALZEME (granit 59, titanyum 47, seramik 25) | %85 |
| BIGATTI | GEREÇ TÜRÜ (spatula 12, kaşık, kepçe, kevgir) | %87 |
| LACENA | RENK (lacivert 8, pembe 6) | %79 |
| TAÇ | BİÇİM (karnıyarık 7, derin 4) | %58 |
| GÜLSAN | MALZEME (granit 24, çelik 24, döküm 13) | %91 |

SAFLON, BIGATTI, TAÇ ve LACENA'da eşik ve uzunluk filtresi kapatılarak kelime
kelime tarandı: **model adı diye bir şey yok**, ürünler kulp/renk/ölçü/tip ile
adlandırılmış. Oradaki "Diğer" eksik sözlük değil, **doğru cevaptı**.

⚠️ Bu, §1.1'in "malzeme ekseni navigasyonda YER ALMAYACAK" kararını **bozmaz**:
malzeme *ana tip* düzeyine girmedi (Tencere dalı hâlâ 995 ürün, malzemeye
bölünmüyor). Yalnız modeli olmayan markaların *model* düzeyinde etiket olarak
kullanıldı.

### 11.2 Üç öncelik katmanı

`oncelik` alanı üç katmana ayrıldı — §5'teki "öncelik uzunluktan önce gelir"
kuralı bunu mümkün kılıyor:

| Katman | Öncelik | Ne | Örnek |
|---|---|---|---|
| üstün | 20 | kasiyerin ürüne **bakarak gördüğü** ayırt edici | LAVA renkleri, ROLLERS parça türü |
| model | 10 | markanın gerçek seri adı | Flavia, Atlas, Black Line |
| genel | 0 | modelsiz ürünler için genel sınıflandırma | Granit, Spatula, Lacivert |

**LAVA'da renk seri adını YENER.** Gerekçe ölçüldü: Lava'nın serileri
(Trendy/Folk/Glaze/Sable/Majolika) **yüzey desenleridir** — kasiyer ürüne bakarak
hangisi olduğunu ayırt edemez, ama rengini anında görür. Renksiz hâlde
`Tencere › Trendy` yaprağı **175 ürün** (kasiyer 35 satır kaydırır); renkle en
büyük yaprak **65**. Aynı gerekçeyle ROLLERS'ta parça türü (çatal/kaşık/bıçak)
seri adını yener.

### 11.3 Kasiyer ölçütü: yaprak boyutu

Gerçek ölçüt kapsama yüzdesi değil, **kasiyerin gördüğü son listedeki ürün sayısı**:

| | Değer |
|---|---|
| Toplam yaprak (marka › ana tip › model) | **417** |
| Ortanca yaprak boyutu | **4 ürün** |
| ≤10 ürünlük yaprak | 347 (%83) |
| 40'tan kalabalık yaprak | **6** |
| En büyük yaprak | **65** (LAVA › Tencere › Siyah) — tohumlama öncesi 175 |

### 11.4 Tohumlama sırasında bulunan gerçek hata

Ürün adlarında `(LBS-0100)` gibi stok kodları var. Tokenizer doğrudan noktalamadan
böldüğü için `lbs` + `0100` çıkıyordu; `0100` rakam diye eleniyor ama **`lbs` temiz
bir kelime gibi görünüp sözlüğe MODEL olarak giriyordu**. Aynı kusur LST, LTK, LCM,
GVC kodlarında da vardı. Düzeltme: önce boşluktan bölünür, **içinde rakam geçen
kelime KODDUR** ve parçalarının hiçbiri aday olamaz. (`923f7c2`)

### 11.5 🔔 Açık kalan: 172 ürün KATEGORİSİZ

Kategorisi olmayan 172 aktif ürün ana tip düzeyinde "Diğer"e düşüyor. Dağılım:

| Marka | Kategorisiz |
|---|---|
| **GÜLSAN** | **112 (markanın TAMAMI)** |
| **TAÇ** | **19 (markanın TAMAMI)** |
| FALEZ | 12 |
| diğer | 29 |

GÜLSAN ve TAÇ'ta ana tip düzeyi tek "Diğer" kartıdır, yani **hiç iş görmüyor** —
tüm yük model düzeyinde. Genel etiketler bunu telafi eder ama **asıl çözüm kategori
atamasıdır**. Bu spec'in kapsamı dışında, ayrı iş ([[yapilacak-kategori-marka-duzenleme]]).
