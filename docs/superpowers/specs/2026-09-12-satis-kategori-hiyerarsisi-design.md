# Satış ekranı kategori hiyerarşisi — Marka → Ana Tip → Model → Ürün

**Tarih:** 2026-09-12
**Durum:** tasarım onaylandı, uygulama planı bekliyor
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
  oncelik INTEGER DEFAULT 0,      -- eşit uzunlukta eşleşmede sıralama
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
2. markanın aktif sözlüğünü ürün adında ara    → EN UZUN eşleşme kazanır
                                                  (eşitlikte oncelik DESC)
3. hiçbiri                                      → "Diğer"
```

Karşılaştırma `electron/db/tr-arama.js` `trNormal()` ile yapılır — Türkçe harf
katlaması (i/ı/İ/I, ş, ğ, ü, ö, ç) zaten orada çözülmüş ve ürün aramasıyla aynı
davranışı verir ([[turkce-arama]]).

**En uzun eşleşme neden şart:** Lava'da `FOLK SABLE GRİ` gibi adlar var ve
`folk` ile `sable` ikisi de sözlükte olabilir. Kural olmadan hangisinin
kazanacağı sorgu sırasına kalır. Sözlükte `folk sable` kaydı varsa o kazanır;
yoksa `folk` ve `sable` arasında `oncelik` karar verir. Böylece "Sable ayrı bir
model mi, Folk'un bir yüzeyi mi" sorusunu **veri** cevaplar, kod değil.

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

1. **451 ürün (%15,5) başlangıçta "Diğer"de.** Sözlük ayıklanınca düşer, ama ilk
   sürümde bu dal dolu olacak.
2. **Rollers (145) ve Lines (692) sözlükleri gürültülü** — 96 ve 214 sözde model.
   Bu iki markada sözlük ayıklanana kadar model düzeyi işe yaramaz; uyarlanır
   derinlik burada kurtarmaz çünkü kart sayısı **fazla**, az değil.
3. **Lacena ve Taç'ta hiç model yok.** Uyarlanır derinlik model düzeyini atlar.
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
