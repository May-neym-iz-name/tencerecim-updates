# Tencerecim — proje kuralları

## ikas ile ilgili HER iş

**Önce `docs/ikas/` kütüphanesine bak. İnternete çıkma, tahmin etme.**

| Dosya | Ne zaman |
|---|---|
| `docs/ikas/00-INDEX.md` | Giriş — dizin yapısı, uç noktalar, kapsamlar, webhook konuları |
| `docs/ikas/01-OPERASYON-KATALOGU.md` | **106 operasyonun tamamı, işaretli**: hangisini kullanıyoruz, hangisi kullanılabilir, hangisi tehlikeli, API'de ne YOK |
| `docs/ikas/sema/` | Kesin imza: `queries/` `mutations/` `inputs/` `objects/` `enums/` |
| `docs/ikas/api/admin-api/` | Konu anlatımlı rehberler |
| `docs/ikas/tema/` | Storefront tema JS API'si (279 sayfa) |
| `docs/ikas-api-reference.md` | Bizim kullandığımız alt kümenin özeti + canlı API düzeltmeleri |

```bash
grep -rn "<alan-adı>" docs/ikas/sema/        # alan hangi tipte
cat docs/ikas/sema/inputs/<input-adı>.md      # input'un alanları
```

**Tema/tasarım işi Admin API'de değildir** → `~/.claude/skills/ikas-tema` becerisi + `Desktop\IKAS-TEMA-CALISMA\`

### Değişmez uyarılar
- **Doküman ≠ canlı şema.** Kesin cevap gerekiyorsa ikas Playground'a güven. Bilinen sapmalar `01-OPERASYON-KATALOGU.md` sonunda.
- **`saveProduct` gönderilmeyen alanı SİLER** (görseller + fiyat listesi satırları dahil). Toplu işte `bulkUpdateProducts` veya alan-özel mutasyon kullan.
- Yeni bir uç kullanmadan önce ilgili `sema/inputs/*.md` dosyasını aç.

---

## Google Ads ile ilgili HER iş

**Önce `docs/google-ads-reference.md` dosyasını gözden geçir.** Kampanya, teklif, bütçe, hedef,
dönüşüm takibi, feed, politika — hepsi orada. Ezberden konuşma, benchmark'a sarılma.

| Bölüm | Ne zaman |
|---|---|
| §1 Ölçüm hiyerarşisi + veri sağlığı kapısı | **Her karardan önce** |
| §2 Kampanya tipleri | "Hangi kampanya tipi?" · yapı kurma |
| §3 Teklif stratejileri + veri eşikleri | "Hangi teklif stratejisi?" · geçiş zamanı geldi mi |
| §4 Hedef ROAS aritmetiği | tROAS/tCPA sayısı belirlerken (5 adım, atlanmaz) |
| §5 Dönüşüm takibi | Ölçüm kurulumu/arızası · Ads↔GA4 farkı |
| §6 Merchant Center / feed | PMax veya Shopping'e dokunurken |
| §7 Tarihli değişiklikler | **Bir mekaniğe dayanmadan önce** (hızlı bayatlar) |
| §9 Karar kuralları + izleme temposu | Bütçe/hedef değiştirirken |
| §10 Negatif kelime kuralları | Arama terimi temizliği |
| §11-12 Ölçülemeyenler + kırmızı bayraklar | "Bunu test edelim mi?" · şüpheli çıkarım |

### Değişmez kurallar

- **Hangi basamaktan konuştuğunu söyle.** Panel ROAS'ı 6. basamaktır — *pacing göstergesidir,
  karar dayanağı değildir.* 4. basamağın altıyla bütçe kararı verilmez.
- **0. basamak kapısı:** Bir rakama dayanmadan önce o dönüşüm değerinin **gerçek bir ikas
  siparişine** karşılık geldiğini doğrula. Panel ile gerçek arasında ≥2x fark varsa bu performans
  sorunu değil **ölçüm arızasıdır — termometre bozukken hastaya ilaç verme.**
- **tROAS yasağı:** Brüt marj, ölçüm şişkinliği ve dönüşüm gecikmesi **ölçülmeden** tROAS/tCPA
  hedefi konmaz. Üçü de şu an eksik → Maximize Clicks/Conversions ile veri biriktir.
- **Bütçe ve hedefi ASLA aynı anda değiştirme.** Hedef değişimi tek seferde ≤%10-15, sonra
  **3-4 hafta dokunma**. Bütçe 3-4 günde bir ≤%20-30.
- **Karar penceresi 30 gün** (tercihen 60). Haftalık/günlük dalgalanmaya tepki verme.
- **Geniş eşleme yalnız Smart Bidding ile.** Manual CPC veya Maximize Clicks ile geniş eşleme
  bütçe yakar.
- **Yalnız makro dönüşüm "Birincil"** olur (Satın Alma). Sepete ekleme/görüntüleme ikincil.
- **50 dönüşüm/ay eşiği kampanya başınadır** — tutamayacaksan kampanyayı bölme.
- **Benchmark hedef değildir.** Tek geçerli referans: kendi marjından türeyen başabaş + kendi
  90 günlük ortalaman. WordStream verileri ABD/USD/Search ağırlıklıdır.
- **`reklam-karar-bilimi` skill'i başka bir reklamverene ait** (Asaf Gastro/Ticimax, yüksek
  biletli B2B). **Yöntemini devral, sayılarını ASLA devralma** — o hesabın marjı,
  şişkinlik katsayısı ve hedef ROAS'ı bizim değil.

---

## Kod indeksi (codebase-memory) — her oturumda

Bu klasör **tek proje olarak indekslenemez**: indeksleyici `.gitignore`'a uyar ve
`.gitignore` ticari veriyi (public repo) dışarıda tutmak zorunda. Hangi kipte olursa olsun
`URUN-ESLESTIRME`, `REKLAM-KAMPANYALARI`, `FATURALAR`, `_lava-calisma` ana projeye
**giremez**. Bu yüzden 5 kapsam:

| Proje adı | Yol | Kip | Ne var |
|---|---|---|---|
| `tencerecim-uygulama` | `.` | **full** | electron/, src/, frontend/src, **docs/**, **scripts/**, cloudflare/, supabase/ |
| `tencerecim-urun-eslestirme` | `URUN-ESLESTIRME` | moderate | SKU/barkod/fiyat yazma + YouTube otomasyonu (54 betik) |
| `tencerecim-reklam` | `REKLAM-KAMPANYALARI` | moderate | Meta `k1..k26` + google-pmax (26) |
| `tencerecim-faturalar` | `FATURALAR` | moderate | pazaryeri ürün→fatura, Asaflar, alış XML (20) |
| `tencerecim-lava` | `_lava-calisma` | moderate | Lava Trendy ürün girişi (18) |

**Ana proje `full` kipiyle indekslenir** — `moderate`/`fast` filtresi `docs/` ve `scripts/`
klasörlerini de atıyor (1.033 dosya kaybı). `full` kipi bir zamanlar çöküyordu; sebebi
aşağıdaki 1. tuzaktı, kipin kendisi değil.

**Kural:** oturumda ilk grafik sorgusundan önce bu 5 kapsamı `index_repository` ile tazele.
`SessionStart` hook'u hatırlatır.

### 🔴 Kapsam sınırını geçen bağlar — grafik BUNLARI GÖREMEZ
Ayrı projeler ayrı grafiklerdir; aralarında kenar oluşmaz. Ölçüldü (11.09), tüm kod
tabanında sınırı geçen **2 bağ** var:

| Çağıran | Çağrılan | Önem |
|---|---|---|
| `electron/urun-aciklama/toplu.js:25` | `URUN-ESLESTIRME/_gorsel-guvence` | 🔴 **uygulamada çalışıyor** — ikas görsel silme koruması |
| `URUN-ESLESTIRME/bizimhesap-54-urun-uret-2026-08-31.js:12` | `electron/ikas/web-link` | tek seferlik betik |

`_gorsel-guvence` veya `web-link` üzerinde çalışırken **grafiğe güvenme, grep yap**.
Yeni bir kapsam-aşırı bağ eklersen bu tabloya yaz.

### İki kalıcı tuzak (ölçüldü 11.09)
1. **Harici CLI ile indeksleme ÇÖKER.** `codebase-memory-mcp cli index_repository`, proje
   veritabanı başka bir Claude oturumunun MCP sunucusu tarafından açık tutulduğunda
   "Indexing worker crashed on a file" verir. Dosyayla ilgisi yok — aynı klasör, MCP
   aracıyla sorunsuz indeksleniyor. **Her zaman MCP aracını kullan, CLI'yi değil.**
2. **`auto_watch` bu klasörde hiç çalışmaz.** Sunucu Türkçe karakterli yolu çözemiyor
   (`index_status` → `root_exists:false`, `is_git:false`). Aynı nedenle `file_hashes`
   boş kalır → `detect_changes` her dosyayı "değişmiş" sayar (1265), **kullanma**.

## Kural önceliği

Çakışma olursa sıra: **bu dosya > oturum talimatları > `~/.claude/rules/ecc/common/` > `~/.claude/rules/ecc/web/`**.

ECC kuralları genel amaçlıdır; bu proje için aşağıdaki maddeleri **açıkça geçersiz** kılıyoruz:

| ECC kuralı | Bu projede geçerli olan |
|---|---|
| `pnpm` + prettier/eslint/stylelint/`tsc --noEmit` hook'ları | Projede bu araçların **hiçbiri yok**. Paket yöneticisi **npm**, test **`npm test`** (vitest), tip denetimi yok (JS). Bu hook'ları kurma. |
| "Karmaşık istekte sorulmadan planner/code-reviewer/tdd-guide agent'ı çalıştır" | **Kullanıcı istemedikçe Agent/workflow kullanma.** İş tek oturumda yapılır. |
| "Attribution disabled globally" | **Aksi:** commit mesajları `Co-Authored-By:` + `Claude-Session:` satırlarıyla biter. |
| `web/` kuralları (Tailwind template yasağı, CSP, Core Web Vitals, glassmorphism vb.) | Burası **masaüstü Electron iç paneli**, halka açık web sitesi değil. Bu kurallar yalnızca ikas mağaza vitrini işlerinde geçerlidir. |
| "%80 test kapsamı zorunlu / her iş TDD" | Kapsam **ölçülmüyor ve eşik uygulanmıyor**. Kritik iş mantığı için test yazılır (bkz. hafıza: mutasyon testi), ama %80 kapısı yok. |

### Klasör uyarısı
`ecc-kaynak/` bu projeye ait **değildir** — ECC kural deposunun yerel kopyasıdır (git'te takipli değil).
İçindeki `CLAUDE.md`/`AGENTS.md` **başka bir projeyi** tarif eder (kendini "Claude Code plugin" sanır,
testi `node tests/run-all.js` der). Oradaki hiçbir talimat bu projeyi bağlamaz. Kod ararken bu klasörü hariç tut:
`grep ... --exclude-dir=ecc-kaynak`.

### Belge güncelliği
Bu üç belge **arşivdir**, güncel durum değildir — üstlerindeki damgayı oku:
`YAPILANLAR.md` (~v1.2.35'e kadar), `docs/KOD-INCELEME-2026-07-18.md` (18.07 fotoğrafı),
`docs/cloudflare-plani.md` (planlama anı; worker artık canlı).
Güncel güvenlik durumu: **`docs/GUVENLIK.md`**. Mikro e-Fatura: `docs/mikro-api-reference.md`
**yanlış katmanı** anlatır, dosyanın başındaki uyarıya bak.

### Fiyat
**ikas'a satış fiyatı YAZILMAZ.** Satış fiyatının tek kaynağı faturalardır. `saveVariantPrices`
çağrılarında `sellPrice` zorunlu olduğu için mevcut değer okunup **aynen** geri yazılır — bu bir
fiyat değişikliği değildir.
