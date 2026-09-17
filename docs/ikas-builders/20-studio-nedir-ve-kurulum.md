# 20 — ikas Studio: Nedir, Nasıl Kurulur

> Kaynak: `/docs/ikas-studio/*` (overview, choose-path, quick-start/*, code/*)
> Kanıt seviyesi: **Belgeli** · 🟡 **BETA / Erken Erişim**

---

## 🔴 ÖNCE BUNU OKU — iki farklı tema sistemi var

| | **Mevcut ikas teması** | **ikas Studio** |
|---|---|---|
| Bizdeki doküman | `docs/ikas/tema/` (279 sayfa Storefront Theme JS API) | **bu klasör** |
| Bizim skill | `~/.claude/skills/ikas-tema` | — |
| Teknoloji | Tema JS API + panel ayarları + özel CSS/JS | **Preact + JavaScript + CSS** |
| Düzenleme | ikas paneli → Tema ayarları | ikas Studio editörü (no-code) **veya** yerel IDE |
| Durum | Canlı, tencerecim.store bunu kullanıyor | **Beta** |

**Bunları karıştırmayın.** Studio, tencerecim.store'un bugünkü temasını düzenlemek için
kullanılan araç *değildir*; **sıfırdan yeni bir tema** üretme platformudur.

---

## ikas Studio nedir?

Tema geliştirme platformu. **Üç çalışma kipi** var:

| Kip | Ne için |
|---|---|
| **İçerik (Content)** | Sayfaları gerçek sitedeki gibi önizleme; bölüm/bileşen yönetimi. Tasarım detayı değil, **içerik** odaklı. Element düzeyinde düzenleme YOK. |
| **Tasarım (Design)** | Canvas arayüzü; katman yapısı, element özellikleri, stil ayarları. **Tam görsel kontrol.** |
| **Blueprint** | Kod yerine **düğüm (node) bağlayarak** akış kurma. Veri, olay, değişken, fonksiyon tanımlama. |

Her üç kip **aynı alt yapıyı** paylaşır — aynı sayfa yapısı, katman sistemi, bölüm/bileşen
mantığı. Fark odaktadır.

---

## Beta durumu

> *"ikas Studio'nun beta sürecine hoş geldiniz!"*

- Geri bildirim vermek isteyen **kullanıcı, tasarımcı ve yazılımcılara** açık
- **ikas Builders Slack kanalı** üzerinden sorun bildirme / deneyim paylaşma
- Geliştiriciler Studio'yu hemen kullanıp temalarını mağazalara yayınlayabiliyor
- ⚠️ *"Beta durumdadır, olgunlaştıkça iş akışı ve özellikler değişebilir."*

---

## Başlangıç adımları

1. **ikas Partners hesabı oluştur**
2. **Geliştirici mağazası (developer store) kur**
3. **Tema oluştur:**
   - Panelde sol menü → **Temalar**
   - Daha önce oluşturulmuş geliştirici mağazasını seç
   - Mevcut bir ikas Studio projesini kullan **veya** yeni proje başlat
   - "Yeni Tema" bölümünde tema adını gir
   - Oluşunca **Kaynaklar (Resources)** sekmesi açılır
   - Sağ üstteki **"ikas Studio'ya Git"** → kaynak mağazaya otomatik giriş yapılır, tema açılır

---

## İki geliştirme yolu

> *"Tema geliştirmeye no-code editör veya kod ile devam etme yolunu seçin."*

### Yol A — No-code editör (ikas'ın önerdiği başlangıç)
Figma/Framer'dan gelen tasarımcılar için görsel üretim akışı.
> *"No-code editör ile başlamanızı öneriyoruz."*

Temel ikas kavramlarını (bölüm, bileşen, element, veri) öğretir.

### Yol B — Kod modu
**Preact** bileşenlerini kendi editörünüzde, yerel geliştirme ortamında yazma.

🔴 **İkisi tek temada birlikte çalışır.** Kilitlenmezsiniz — bazı bölümleri görsel kurup
bazılarını kodlayabilirsiniz. Seçim sadece başlangıç noktasını belirler.

---

## Kod modu — kurulum

### Teknoloji yığını
**Preact + JavaScript + CSS**

🔴 **Kısıt:** *"Harici paket kurulumu şu anda desteklenmiyor."* Yalnızca proje şablonuyla
gelen bağımlılıklar kullanılabilir.

⚠️ Kod ile geliştirilen bileşenlerde **ayrı Tasarım veya Blueprint kipi yoktur** — tüm
tasarım ve mantık Preact bileşeninde yönetilir.

### 4 adımda kurulum

**1. CLI kur**
```bash
npm install ikas -g
```

**2. Tema komutunu al**
partners.ikas.com → temanı seç → **Kod** sekmesi → kişisel komut:
```bash
ikas theme init -e <tema-ozel-url>
```
🔴 *"Komutun sonundaki URL seçtiğiniz temaya ve mağazaya göre otomatik üretilir"* —
**her zaman panelden alın**, başka yerden kopyalamayın.

**3. Geliştirme sunucusunu başlat**
```bash
cd <proje-adi>
ikas theme dev
```

**4. Bağlantıyı tamamla**
Açılan sekmede sayfanın altındaki **Connect** butonuna tıkla.

Sonraki oturumlarda sadece `ikas theme dev` yeterli — geliştirme mağazası otomatik açılır.

### Farklı mağazaya bağlama
```bash
ikas theme link -e <studio-tema-url>
```

---

## Proje yapısı

```
my-theme/
├── .cursor/
│   └── mcp.json
├── .cursorrules
├── .gitignore
├── .mcp.json
├── CLAUDE.md               ← ikas, Claude Code'u resmen destekliyor
├── README.md
├── ikas.config.json        ⚠️ OTOMATİK — elleme
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── components/
    │   └── <Component>/
    │       ├── index.tsx   ← Preact kodu buraya
    │       ├── styles.css  ← bileşene özel stil
    │       └── types.ts    ⚠️ OTOMATİK — elleme
    ├── hooks/              ← tema genelinde paylaşılan Preact hook'ları
    ├── sub-components/     ← bileşenler arası yeniden kullanılan UI parçaları
    ├── utils/              ← ortak yardımcı fonksiyonlar
    ├── global-types.ts     ⚠️ OTOMATİK — elleme
    ├── global.css          ← global tema stilleri
    ├── ikas-component-utils.d.ts  ⚠️ OTOMATİK — elleme
    └── components/index.ts ⚠️ OTOMATİK — elleme
```

🔴 *"Manuel müdahale tutarsızlığa ve derleme hatasına yol açabilir."*

---

## AI Asistanı (Cursor + ikas MCP)

Proje kökündeki `.cursor/mcp.json` hazır gelir. Cursor'da projeyi açınca ikas MCP
bağlantısını otomatik tanır. Bağlantı aktifse sohbette istediğiniz bölüm/bileşeni
tarif edersiniz, gerekli dosyalar otomatik üretilir.

MCP aktifken asistan **bölümlere, bileşenlere ve veri modellerine doğrudan erişir**.

🟢 **Claude Code skill kütüphanesi:** https://github.com/ikascom/ikas-cc-skills/

---

## Temayı yayınlama (Kod modu)

**Adım 1 — Partner paneline gönder**
Studio editöründe sol alttaki **"Temayı Yönet"** butonu. Yayınlamadan önce zorunlu.
Bu sırada mağazalar temayı kurduğunda hangi sayfa, bölüm ve bileşenlerin görüneceğini
seçersiniz. Sonra **"Partner'e Git"** ile tema detay sayfasına geçilir.

**Adım 2 — Mağazalarla paylaş**
partners.ikas.com → temanı aç → güncelleme paylaş + **changelog** gir (mağazalar kurulum
veya güncelleme sırasında bunu görür).

**Adım 3 — Yayınlama**
Onaylı mağazaları ekle → tema o mağazaların temalar bölümünde görünür.
🔴 Önce **yetkili mağazalara erişim almanız** gerekir.

> **Yakında:** tema satışı (para kazanma) özelliği.

---

## Tema Yönetimi (sürümleme)

Tema sürümleme, yayınlama ve yönetim işlemleri buradan yürür.

- Bölüm ve bileşenleriniz listelenir; tıklayıp detayına girer, düzenler, son güncelleme
  tarihini görürsünüz
- **İki tür güncelleme:**
  1. **Sayfa güncellemeleri** — tema düzenleme bölümündeki değişiklikler doğrudan gönderilir
  2. **Sürüm güncellemeleri** — bölüm/bileşen ekleme ve değişiklikleri yeni sürüm olarak dağıtılır
- Güncelleme açıklaması: tümü için ortak **veya** her bölüm/bileşen için ayrı açıklama

---

## Sürüm notları (belgedeki son kayıtlar)

### v2.9.0 — 3 Eylül 2026
- **Hazır Sayfalar:** hesap ve üyelik sayfaları artık **ikas tarafından CDN üzerinden** sağlanıyor — ayrıca geliştirmeye gerek yok
- **AI Agent araçları:** hazır sayfa yönetimi, bölüm/sayfa silme
- **Hediye kartı** satır desteği (sepette)
- Yeni hata kodu: `MAX_QUANTITY_PER_CART_LIMIT_REACHED`
- `withRoutePrefix` artık mutlak URL, `mailto:` ve `tel:` bağlantılarını değiştirmeden bırakıyor

### v2.8.0 — 6 Ağustos 2026
- Global header/footer bölümleri için **paylaşılan prop değerleri**
- Sayfa bölümlerini **sürükle-bırak** ile sıralama

### v2.7.0 — 27 Temmuz 2026
- **Stoğa gelince haber ver** bildirimleri
- Sepet miktar limitleri
- Kampanya hediye satırları

### v2.6.1 — 10 Temmuz 2026
- Yeni **"Font Style"** prop tipi
- **COLOR** prop doğrulaması + tema rengine bağlama
