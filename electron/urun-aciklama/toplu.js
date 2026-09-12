// TOPLU AÇIKLAMA DÖNÜŞTÜRME — arayüzü yok, tek seferlik toplu iş.
//
// ÇALIŞTIRMA (uygulama içinden, çünkü ikas/Gemini secret'ları DPAPI şifreli ve
// bağımsız Node betiği token alamıyor — bkz. [[ikas-kimlik-script-engeli]]):
//
//   set TNC_ACIKLAMA=plan   && npm run dev     → hiçbir şeye dokunmaz, listeler
//   set TNC_ACIKLAMA=uygula && npm run dev     → ikas'a YAZAR
//   set TNC_ACIKLAMA_LIMIT=1                   → yalnız ilk N ürün (ilk denemede 1 yap)
//
// Windows'ta Electron GUI süreci stdout'u kabuğa yazmaz; sonuç DOSYAYA yazılır.
//
// GÜVENLİK KAPILARI (hiçbiri seçimlik değil):
//  - saveProduct YAMA DEĞİL, tam değiştirmedir → ürün tüm alanlarıyla okunur,
//    yalnız description değiştirilir, hepsi aynen geri yazılır.
//  - Görsel listesi güvenilir okunamadıysa o ürüne DOKUNULMAZ (_gorsel-guvence).
//  - Yazımdan sonra geri okunur; açıklama dışında bir alan değiştiyse veya görsel
//    kaybı varsa çalışma DURUR.
//  - Yazımdan önce eski açıklamaların tamamı yedek dosyasına alınır.

const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const { graphql } = require('../ikas/client')
const { _ayarlariGetir: aiAyarlar } = require('../db/ai-ayarlar')
// KAPSAM-AŞIRI BAĞ — TEPE SEVİYEDE require ETME.
// _gorsel-guvence depoda URUN-ESLESTIRME/ altındadır ve electron-builder onu
// PAKETLEMEZ (package.json build.files: yalnız dist/ electron/ node_modules/).
// Tepe seviyede require edilirse bu modülün YÜKLENMESİ kurulu uygulamada patlar;
// main.js açılışta topluKipMi() için bu modülü yüklediği için 1.2.208 sürümünde
// pencere hiç açılmadı (whenReady içinde yakalanmamış promise reddi, sessiz).
// Tembel yükleme: yalnız toplu iş gerçekten çalışırken, yani modülün var olduğu
// depo içinden çalıştırıldığında istenir. Bulunamazsa AÇIKÇA patlar — görsel
// koruması sessizce atlanmaz.
let _gorsel
function GORSEL_YUKLE() {
  if (!_gorsel) _gorsel = require('../../URUN-ESLESTIRME/_gorsel-guvence')
  return _gorsel
}
const sablon = require('./sablon')
const metin = require('./metin')
const { rozetler } = require('./siniflandir')
const induksiyon = require('./induksiyon')
const denetim = require('./denetim')

// Şablonla yazılmış açıklamaların işareti. Yeniden çalıştırmada atlanır,
// böylece iş yarıda kalırsa baştan başlanabilir ve Gemini kotası boşa gitmez.
const IMZA = '<!--tnc-sablon-v1-->'

// ikas-sku-yaz-2026-08-31.js'te kanıtlanmış alan listesi. Eksiltme:
// okunmayan alan geri yazılamaz, saveProduct onu SİLER.
const ALANLAR = `
  id name type description shortDescription weight vendorId googleTaxonomyId maxQuantityPerCart
  brand { id name } categories { id name } salesChannels { id status } tags { id name }
  metaData { id pageTitle description slug }
  productVariantTypes { variantTypeId order variantValueIds }
  variants { id sku isActive barcodeList weight
    prices { priceListId sellPrice buyPrice currency discountPrice }
    images { imageId isMain order isVideo }
    variantValueIds { variantTypeId variantValueId } }
`

// Okunan ürünü ProductInput'a çevirir. yeniAciklama verilmezse mevcut korunur.
function girdi(u, yeniAciklama) {
  return {
    id: u.id, name: u.name, type: u.type,
    vendorId: u.vendorId || undefined,
    description: yeniAciklama != null ? yeniAciklama : u.description,
    shortDescription: u.shortDescription,
    weight: u.weight ?? undefined,
    googleTaxonomyId: u.googleTaxonomyId ?? undefined,
    maxQuantityPerCart: u.maxQuantityPerCart ?? undefined,
    brandId: u.brand?.id ?? undefined,
    categoryIds: (u.categories || []).map(c => c.id),
    salesChannels: (u.salesChannels || []).map(s => ({ id: s.id, status: s.status })),
    tagIds: (u.tags || []).map(g => g.id),
    metaData: u.metaData?.slug ? {
      id: u.metaData.id, slug: u.metaData.slug,
      pageTitle: u.metaData.pageTitle, description: u.metaData.description,
    } : undefined,
    productVariantTypes: u.productVariantTypes || [],
    variants: u.variants.map(v => ({
      id: v.id, isActive: v.isActive, sku: v.sku,
      barcodeList: v.barcodeList || [],
      weight: v.weight ?? undefined,
      images: GORSEL_YUKLE().gorseller(v, u.name),
      // priceListId'li satırlar saveProduct'a verilirse "multiple default prices"
      // hatası çıkar; verilmezse silinme riski var → iskelet karşılaştırması yakalar.
      // FİYAT DEĞİŞTİRMİYORUZ: okunan değer aynen geri yazılıyor ([[fiyat-kaynak-kurali]]).
      prices: (v.prices || []).filter(p => !p.priceListId)
        .map(p => ({ sellPrice: p.sellPrice, buyPrice: p.buyPrice, currency: p.currency, discountPrice: p.discountPrice })),
      variantValueIds: (v.variantValueIds || []).map(x => ({ variantTypeId: x.variantTypeId, variantValueId: x.variantValueId })),
    })),
  }
}

// FİYAT LİSTESİ SATIRLARINI GERİ YAZ.
//
// 11.09 ÖLÇÜLDÜ — girdi() priceListId'li satırları göndermiyor (gönderirse ikas
// "multiple default prices" diyor), saveProduct da gönderilmeyeni SİLİYOR.
// İlk sürümde bu adım YOKTU: iki üründe Trendyol/Hepsiburada fiyat satırları silindi.
// saveProduct'tan sonra bu çağrı ŞART; atlanırsa pazaryeri fiyatları kaybolur.
async function fiyatListeleriniGeriYaz(urunId, oncekiVaryantlar) {
  const listeBazli = new Map()   // priceListId -> [{productId, variantId, price}]
  for (const v of oncekiVaryantlar) {
    for (const p of (v.prices || [])) {
      if (!p.priceListId) continue
      if (!listeBazli.has(p.priceListId)) listeBazli.set(p.priceListId, [])
      listeBazli.get(p.priceListId).push({
        productId: urunId, variantId: v.id,
        price: {
          sellPrice: p.sellPrice, buyPrice: p.buyPrice,
          currency: p.currency, discountPrice: p.discountPrice,
        },
      })
    }
  }
  for (const [priceListId, variantPriceInputs] of listeBazli) {
    await graphql(
      `mutation($input:SaveVariantPricesInput!){ saveVariantPrices(input:$input) }`,
      { input: { priceListId, variantPriceInputs } })
  }
  return listeBazli.size
}

// description DIŞINDA hiçbir şey değişmemeli. Karşılaştırma otomatik, göz kararı değil.
function iskelet(u) {
  const k = JSON.parse(JSON.stringify(u))
  delete k.description
  return JSON.stringify(k)
}

// Hangi alanın değiştiğini SÖYLEYEN karşılaştırma. "bir alan değişti" demek
// teşhis ettirmiyordu (11.09) — kapı durdurmakla kalmayıp kanıtı da vermeli.
// Dönen: farkları anlatan satır dizisi (boşsa fark yok).
function farklar(a, b, yol = '', bulunan = []) {
  if (bulunan.length >= 10) return bulunan            // ilk 10 fark yeter
  if (a === b) return bulunan
  const tip = (x) => Array.isArray(x) ? 'dizi' : x === null ? 'null' : typeof x
  if (tip(a) !== tip(b)) {
    bulunan.push(`${yol || '(kök)'}: ${tip(a)} → ${tip(b)}`)
    return bulunan
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) bulunan.push(`${yol}: ${a.length} öğe → ${b.length} öğe`)
    for (let i = 0; i < Math.max(a.length, b.length); i++) farklar(a[i], b[i], `${yol}[${i}]`, bulunan)
    return bulunan
  }
  if (a && typeof a === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      farklar(a[k], b[k], yol ? `${yol}.${k}` : k, bulunan)
    }
    return bulunan
  }
  bulunan.push(`${yol}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`)
  return bulunan
}

async function urunOku(id) {
  const r = await graphql(
    `query($f:StringFilterInput){ listProduct(id:$f,pagination:{page:1,limit:1}){ data { ${ALANLAR} } } }`,
    { f: { eq: id } })
  const u = r?.listProduct?.data?.[0]
  if (!u) throw new Error('ürün okunamadı: ' + id)
  return u
}

async function tumUrunler() {
  const hepsi = []
  for (let sayfa = 1; ; sayfa++) {
    const r = await graphql(
      `query($p:Int){ listProduct(pagination:{page:$p,limit:50}){ hasNext data { ${ALANLAR} } } }`,
      { p: sayfa })
    hepsi.push(...(r?.listProduct?.data || []))
    if (!r?.listProduct?.hasNext) break
  }
  return hepsi
}

// Yedeklerden ORİJİNAL açıklamaları toplar (urunId -> ilk görülen açıklama).
// Yedek dosyaları eskiden yeniye taranır; İLK kayıt gerçek orijinaldir, sonrakiler
// zaten şablonlanmış metni taşıyabilir.
//
// Neden gerekli: şablonu güncelleyip ürünü YENİDEN yazarken, mevcut açıklama artık
// şablonun kendisidir. Onu Gemini'ye kaynak diye vermek bilgi kaybettirir (özet
// üstüne özet). Kaynak her zaman ilk orijinal olmalı.
function orijinalAciklamalar() {
  const dizin = path.join(app.getPath('userData'), 'aciklama-yedek')
  const harita = new Map()
  let dosyalar = []
  try { dosyalar = fs.readdirSync(dizin).filter(f => f.endsWith('.json')).sort() } catch { return harita }
  for (const d of dosyalar) {
    let kayitlar = []
    try { kayitlar = JSON.parse(fs.readFileSync(path.join(dizin, d), 'utf8')) } catch { continue }
    for (const k of kayitlar) {
      if (!k || !k.id || harita.has(k.id)) continue
      const a = String(k.description || '')
      if (!a.trim() || a.includes(IMZA)) continue      // şablonlanmış metin orijinal değildir
      harita.set(k.id, a)
    }
  }
  return harita
}

// GÜVENLİ YAZMA — metnin NEREDEN geldiğinden bağımsız tek yol.
//
// Metni Gemini de üretmiş olabilir, elle de yazılmış olabilir; kapılar aynıdır.
// İki ayrı yazma yolu tutmak, birinde düzeltilen hatanın diğerinde kalması demektir.
//
// Sırayla: doğruluk denetimi → rozetler → şablon → saveProduct → fiyat listelerini
// geri yaz → geri oku → iskelet + görsel + açıklama doğrula.
// Dönen: { durum: 'yazildi'|'atlandi', bulgular?, yeni? }
async function guvenliYaz({ u, bilgi, kaynakMetin, harita, gunluk = () => {} }) {
  const etiket = `${u.name} (${u.id})`

  // Metin uydurma sayı/iddia taşıyorsa ürüne DOKUNULMAZ.
  const uretilenMetin = [bilgi.seo, bilgi.icerik, bilgi.malzeme, bilgi.saglik].join(' ')
  const kontrol = denetim.denetle(uretilenMetin, kaynakMetin, u.name)
  if (!kontrol.temiz) return { durum: 'atlandi', bulgular: kontrol.bulgular, uretilen: uretilenMetin }

  // Rozetler metinden DEĞİL, sınıflandırmadan gelir.
  const bayrak = rozetler(u, harita, kaynakMetin)
  const yeni = IMZA + '\n' + sablon.uret({ ...bilgi, ...bayrak })

  // Görsel kapısı burada da devrede: girdi() okunamayan görselde fırlatır.
  await graphql(`mutation($input:ProductInput!){ saveProduct(input:$input){ id } }`,
    { input: girdi(u, yeni) })

  // saveProduct fiyat listesi satırlarını sildi; HEMEN geri yaz. Sıra önemli:
  // geri okuma denetimi bundan sonra çalışmalı, yoksa kendi sildiğimizi yakalar.
  await fiyatListeleriniGeriYaz(u.id, u.variants)

  // "Hata vermedi" doğrulama değildir — geri oku ve karşılaştır.
  const sonra = await urunOku(u.id)
  if (iskelet(sonra) !== iskelet(u)) {
    throw new Error('açıklama DIŞINDA alan değişti:\n    - '
      + farklar(JSON.parse(iskelet(u)), JSON.parse(iskelet(sonra))).join('\n    - '))
  }
  GORSEL_YUKLE().gorselDogrula(u, sonra, etiket)
  if (String(sonra.description || '') !== yeni) {
    throw new Error('açıklama yazıldı ama geri okunan metin farklı')
  }
  return { durum: 'yazildi', yeni }
}

async function calistir({ mod, limit, gunluk }) {
  const anahtar = (aiAyarlar().gemini_anahtar || '').trim()
  if (!anahtar) throw new Error('Gemini anahtarı girilmemiş (Ayarlar > Yapay Zeka).')

  gunluk('ürünler okunuyor…')
  const urunler = await tumUrunler()
  gunluk(`ikas'ta ${urunler.length} ürün.`)

  // TNC_ACIKLAMA_YENIDEN=1 → şablonu değiştirdiğimizde önceden yazılanları da tazele.
  const yeniden = process.env.TNC_ACIKLAMA_YENIDEN === '1'
  const orijinaller = yeniden ? orijinalAciklamalar() : new Map()

  const adaylar = urunler.filter(u => {
    const d = String(u.description || '').trim()
    if (!d) return false                       // dağıtılacak bilgi yok
    if (d.includes(IMZA)) {
      // Zaten dönüşmüş. Tazeleme kipinde yalnız ORİJİNALİ elimizde olanı yeniden yaz;
      // yoksa dokunma (şablonun üstüne şablon üretmek bilgi kaybettirir).
      return yeniden && orijinaller.has(u.id)
    }
    return true
  })
  gunluk(`aday: ${adaylar.length}`
    + (yeniden ? ` (tazeleme AÇIK — yedekte orijinali olan ${orijinaller.size} ürün dahil)` : ' (boş ve zaten dönüşmüş olanlar hariç)'))

  const hedefler = limit > 0 ? adaylar.slice(0, limit) : adaylar

  // Doğrulanmış indüksiyon haritası bir kez yüklenir (seed + userData birleşimi).
  const haritaOnbellek = induksiyon.harita()

  // YEDEK — yazmadan önce, her koşulda.
  const yedekDizin = path.join(app.getPath('userData'), 'aciklama-yedek')
  fs.mkdirSync(yedekDizin, { recursive: true })
  const yedekYol = path.join(yedekDizin, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(yedekYol, JSON.stringify(
    hedefler.map(u => ({ id: u.id, name: u.name, description: u.description })), null, 2), 'utf8')
  gunluk(`yedek: ${yedekYol}`)

  const sonuc = { yazildi: 0, atlandi: 0, hata: 0, satirlar: [], suphe: [] }

  for (const u of hedefler) {
    const etiket = `${u.name} (${u.id})`
    try {
      // Kaynak metin: tazelemede yedekteki ORİJİNAL, normalde ikas'taki mevcut.
      const kaynakMetin = orijinaller.get(u.id) || u.description
      const { bilgi, uyari } = await metin.bolumleriUret({
        ad: u.name, marka: u.brand?.name, mevcut: kaynakMetin, anahtar,
        gunluk: (s) => gunluk(`   … ${etiket}: ${s}`),
      })
      if (uyari) { sonuc.atlandi++; gunluk(`⚠ ATLANDI ${etiket} — ${uyari}`); continue }

      if (mod === 'plan') {
        const bayrak = rozetler(u, haritaOnbellek, kaynakMetin)
        sonuc.satirlar.push({
          ad: u.name, id: u.id, eski: u.description,
          yeni: IMZA + '\n' + sablon.uret({ ...bilgi, ...bayrak }),
        })
        gunluk(`· plan ${etiket} — SEO ${bilgi.seo.length} krkt`)
        continue
      }

      const r = await guvenliYaz({ u, bilgi, kaynakMetin, harita: haritaOnbellek, gunluk })
      if (r.durum === 'atlandi') {
        sonuc.atlandi++
        gunluk(`⚠ ATLANDI ${etiket} — doğruluk denetimi:\n    · ${r.bulgular.join('\n    · ')}`)
        sonuc.suphe.push({ ad: u.name, id: u.id, bulgular: r.bulgular, uretilen: r.uretilen })
        continue
      }
      sonuc.yazildi++
      gunluk(`✔ ${etiket} — SEO ${bilgi.seo.length} krkt`)
    } catch (e) {
      sonuc.hata++
      gunluk(`✘ HATA ${etiket} — ${e.message}`)
      // Alan kaybı/görsel kaybı sessizce geçilmez: hasar iddiası varsa çalışmayı durdur.
      if (/KAYBI|DIŞINDA/.test(e.message)) { gunluk('!! DURDURULDU — HASAR ŞÜPHESİ'); break }
      // Günlük kota bittiyse kalan ürünler için denemenin ANLAMI YOK; turu bitir.
      // Yazılanlar imzalı olduğu için sonraki tur kaldığı yerden devam eder.
      if (metin.kotaMi(e)) {
        gunluk('!! DURDURULDU — GEMINI GÜNLÜK KOTASI BİTTİ. Kota yenilenince aynı komutu '
          + 'tekrar çalıştır; yazılanlar imzalı olduğu için kaldığı yerden devam eder.')
        sonuc.kotaBitti = true
        break
      }
    }
  }
  return { ...sonuc, yedekYol }
}

// main.js'ten çağrılır. Sonucu dosyaya yazar (Electron GUI stdout'u kabuğa vermez).
//
// 11.09 DERSİ: bu kipler tek seferlik TOPLU İŞTİR, oturum değil. İş bitince süreç
// kendini kapatmazsa pencere açık kalır ve her çalıştırma bir örnek biriktirir
// (bir oturumda 9 tane birikti). Bittiğinde app.quit() ŞART.
const KIPLER = ['plan', 'uygula', 'oku', 'denetle', 'fiyat', 'onar', 'dogrula', 'kaynak', 'dosyadan']

// main.js bunu açılışta sorar: toplu iş mi, normal açılış mı?
// Toplu iş ise pencere AÇILMAZ (bkz. main.js'teki 11.09 dersi).
function topluKipMi() { return KIPLER.includes(process.env.TNC_ACIKLAMA) }

async function envIleCalistir() {
  const mod = process.env.TNC_ACIKLAMA
  if (!KIPLER.includes(mod)) return              // normal açılış — hiçbir şey yapma
  try {
    await _kipiCalistir(mod)
  } finally {
    // Kip ne olursa olsun, hata alsa bile: bu bir toplu iştir, süreç burada biter.
    app.quit()
  }
}

async function _kipiCalistir(mod) {

  // TEŞHİS KİPİ: TNC_ACIKLAMA=oku TNC_ACIKLAMA_ID=<ürün id> → ürünü olduğu gibi döker.
  // Kapı ateşlendiğinde "hasar var mı" sorusunu ölçmek için; hiçbir şey yazmaz.
  if (mod === 'oku') {
    const id = process.env.TNC_ACIKLAMA_ID
    const yol = path.join(app.getPath('userData'), 'aciklama-oku.json')
    try {
      // İKİ KEZ okunur: aradaki fark YAZMADAN doğar, yani o alan ikas tarafında
      // oynaktır (normalleştirme/zaman damgası) ve kapıyı boş yere ateşliyordur.
      const a = await urunOku(id)
      const b = await urunOku(id)
      fs.writeFileSync(yol, JSON.stringify({
        urun: a,
        ikiOkumaArasiFark: farklar(JSON.parse(iskelet(a)), JSON.parse(iskelet(b))),
      }, null, 2), 'utf8')
    } catch (e) {
      fs.writeFileSync(yol, JSON.stringify({ hata: e.message }, null, 2), 'utf8')
    }
    return
  }

  // ONARIM: TNC_ACIKLAMA=onar → 11.09'da silinen fiyat listesi satırlarını geri yazar.
  // Değerler 31.08 tarihli ikas yedeğinden (URUN-ESLESTIRME/ikas-urunler-2026-08-31.json);
  // ayrıca mağaza geneli oran deseniyle (HB ~1,1746 · TY ~1,14) çapraz doğrulandı.
  // TEK SEFERLİKTİR — iş bittikten sonra bu blok silinebilir.
  if (mod === 'onar') {
    const ONARIM = [
      { urunId: 'e80c2542-3614-4fb7-9214-5af58dd7a9e3', varyantId: '86b3d0d3-36aa-4d6c-973a-f225aeb57eb6',
        satirlar: [
          { priceListId: '679dd41d-3a5e-4d73-932f-558e21883cbe', sellPrice: 3249, currency: 'TRY' },  // TRENDYOL
          { priceListId: '0e7e6642-0d64-4f4d-adf1-84b38c8d01e4', sellPrice: 3348, currency: 'TRY' },  // HEPSİBURADA
        ] },
      { urunId: 'd183e886-3938-483a-a569-fd9893763556', varyantId: '6c36c134-008b-4f70-8247-9697df3b3f66',
        satirlar: [
          { priceListId: '0e7e6642-0d64-4f4d-adf1-84b38c8d01e4', sellPrice: 3583, currency: 'TRY' },  // HEPSİBURADA
        ] },
    ]
    const yol = path.join(app.getPath('userData'), 'aciklama-onarim.json')
    const rapor = []
    for (const o of ONARIM) {
      for (const s of o.satirlar) {
        try {
          await graphql(`mutation($input:SaveVariantPricesInput!){ saveVariantPrices(input:$input) }`, {
            input: {
              priceListId: s.priceListId,
              variantPriceInputs: [{
                productId: o.urunId, variantId: o.varyantId,
                price: { sellPrice: s.sellPrice, buyPrice: null, currency: s.currency, discountPrice: null },
              }],
            },
          })
          rapor.push({ urunId: o.urunId, liste: s.priceListId, fiyat: s.sellPrice, sonuc: 'yazildi' })
        } catch (e) {
          rapor.push({ urunId: o.urunId, liste: s.priceListId, fiyat: s.sellPrice, sonuc: 'HATA: ' + e.message })
        }
      }
      // Geri oku ve gerçekten oturdu mu doğrula — "hata vermedi" yeterli değil.
      try {
        const u = await urunOku(o.urunId)
        rapor.push({ urunId: o.urunId, dogrulama: (u.variants[0].prices || []) })
      } catch (e) { rapor.push({ urunId: o.urunId, dogrulama: 'okunamadi: ' + e.message }) }
    }
    fs.writeFileSync(yol, JSON.stringify(rapor, null, 2), 'utf8')
    return
  }

  // KAYNAK DÖKÜMÜ: TNC_ACIKLAMA=kaynak → metni ELLE yazmak için ürün listesi.
  // Gemini çağırmaz, hiçbir şey yazmaz. Henüz dönüştürülmemiş ürünleri döker.
  if (mod === 'kaynak') {
    const yol = path.join(app.getPath('userData'), 'aciklama-kaynak.json')
    const atla = Number(process.env.TNC_ACIKLAMA_ATLA || 0) || 0
    const limit = Number(process.env.TNC_ACIKLAMA_LIMIT || 0) || 0
    try {
      const orijinaller = orijinalAciklamalar()
      const yeniden = process.env.TNC_ACIKLAMA_YENIDEN === '1'
      let liste = (await tumUrunler()).filter(u => {
        const d = String(u.description || '').trim()
        if (!d) return false
        if (d.includes(IMZA)) return yeniden && orijinaller.has(u.id)
        return true
      })
      if (atla) liste = liste.slice(atla)
      if (limit) liste = liste.slice(0, limit)
      fs.writeFileSync(yol, JSON.stringify(liste.map(u => ({
        id: u.id,
        ad: u.name,
        marka: u.brand && u.brand.name,
        kategoriler: (u.categories || []).map(c => c.name),
        etiketler: (u.tags || []).map(t => t.name),
        sku: (u.variants || []).map(v => v.sku).filter(Boolean),
        kaynak: denetim.duzMetin(orijinaller.get(u.id) || u.description),
      })), null, 2), 'utf8')
    } catch (e) {
      fs.writeFileSync(yol, JSON.stringify({ hata: e.message }, null, 2), 'utf8')
    }
    return
  }

  // ELLE YAZILMIŞ METİNLERİ YAZ: TNC_ACIKLAMA=dosyadan
  //
  // Girdi: userData/aciklama-girdi.json = [{id, seo, icerik, malzeme, saglik}]
  // Metni kim yazarsa yazsın (Gemini ya da elle) AYNI güvenli yoldan geçer:
  // doğruluk denetimi → rozetler → şablon → saveProduct → fiyat geri yaz → doğrula.
  // Gemini'ye hiç gitmez, dolayısıyla KOTA HARCAMAZ.
  if (mod === 'dosyadan') {
    const girdiYol = path.join(app.getPath('userData'), 'aciklama-girdi.json')
    const cikti = path.join(app.getPath('userData'), 'aciklama-toplu-dosyadan.log')
    const satirlar = []
    const gunluk = (s) => { satirlar.push(s); fs.writeFileSync(cikti, satirlar.join('\n'), 'utf8') }
    gunluk(`== ELLE YAZILMIŞ METİNLER — ${new Date().toISOString()}`)
    try {
      const kayitlar = JSON.parse(fs.readFileSync(girdiYol, 'utf8'))
      gunluk(`girdi: ${kayitlar.length} ürün (${girdiYol})`)
      const orijinaller = orijinalAciklamalar()
      const harita = induksiyon.harita()
      let yazildi = 0, atlandi = 0, hata = 0

      // Yedek — yazmadan önce, her koşulda.
      const yedekDizin = path.join(app.getPath('userData'), 'aciklama-yedek')
      fs.mkdirSync(yedekDizin, { recursive: true })

      for (const k of kayitlar) {
        const etiket = k.id
        try {
          const u = await urunOku(k.id)
          const kaynakMetin = orijinaller.get(u.id) || u.description
          fs.writeFileSync(
            path.join(yedekDizin, `${new Date().toISOString().replace(/[:.]/g, '-')}-${u.id}.json`),
            JSON.stringify([{ id: u.id, name: u.name, description: u.description }], null, 2), 'utf8')

          const bilgi = {
            seo: String(k.seo || ''), icerik: String(k.icerik || ''),
            malzeme: String(k.malzeme || ''), saglik: String(k.saglik || ''),
          }
          const uzunlukUyari = metin.seoDenetle(bilgi.seo)
          if (uzunlukUyari) {
            atlandi++; gunluk(`⚠ ATLANDI ${u.name} — ${uzunlukUyari}`); continue
          }
          const r = await guvenliYaz({ u, bilgi, kaynakMetin, harita, gunluk })
          if (r.durum === 'atlandi') {
            atlandi++
            gunluk(`⚠ ATLANDI ${u.name} — doğruluk denetimi:\n    · ${r.bulgular.join('\n    · ')}`)
            continue
          }
          yazildi++
          gunluk(`✔ ${u.name} — SEO ${bilgi.seo.length} krkt`)
        } catch (e) {
          hata++
          gunluk(`✘ HATA ${etiket} — ${e.message}`)
          if (/KAYBI|DIŞINDA/.test(e.message)) { gunluk('!! DURDURULDU — HASAR ŞÜPHESİ'); break }
        }
      }
      gunluk(`\n== BİTTİ: yazıldı ${yazildi}, atlandı ${atlandi}, hata ${hata}`)
    } catch (e) {
      gunluk(`\n== ÇALIŞMA HATASI: ${e.stack || e.message}`)
    }
    return
  }

  // GERİYE DÖNÜK DOĞRULUK DENETİMİ: TNC_ACIKLAMA=dogrula
  // Yazılmış (imzalı) her ürünü yedekteki ORİJİNALİNE karşı sınar. Hiçbir şey yazmaz,
  // Gemini çağırmaz (kota harcamaz). Çıktı: aciklama-dogrulama.json
  if (mod === 'dogrula') {
    const yol = path.join(app.getPath('userData'), 'aciklama-dogrulama.json')
    try {
      const orijinaller = orijinalAciklamalar()
      const urunler = await tumUrunler()
      const rapor = []
      for (const u of urunler) {
        const d = String(u.description || '')
        if (!d.includes(IMZA)) continue                  // yalnız bizim yazdıklarımız
        const kaynak = orijinaller.get(u.id)
        if (!kaynak) {
          rapor.push({ ad: u.name, id: u.id, durum: 'ORİJİNAL YOK — denetlenemedi' })
          continue
        }
        // Rozetler kaynaktan türemez → denetimden ÖNCE çıkarılır.
        const k = denetim.denetle(denetim.rozetleriCikar(d), kaynak, u.name)
        rapor.push({
          ad: u.name, id: u.id,
          slug: u.metaData && u.metaData.slug,
          durum: k.temiz ? 'TEMİZ' : 'BULGU VAR',
          bulgular: k.bulgular,
          orijinal: denetim.duzMetin(kaynak),
          yeni: denetim.duzMetin(d),
        })
      }
      fs.writeFileSync(yol, JSON.stringify(rapor, null, 2), 'utf8')
    } catch (e) {
      fs.writeFileSync(yol, JSON.stringify({ hata: e.message }, null, 2), 'utf8')
    }
    return
  }

  // FİYAT DÖKÜMÜ: TNC_ACIKLAMA=fiyat → fiyat listeleri + her varyantın fiyat satırları.
  // 11.09 hasarını ölçmek ve onarmak için; hiçbir şey yazmaz.
  if (mod === 'fiyat') {
    const yol = path.join(app.getPath('userData'), 'aciklama-fiyat.json')
    try {
      const l = await graphql(`query{ listPriceList { id name currencyCode } }`, {})
      const urunler = await tumUrunler()
      fs.writeFileSync(yol, JSON.stringify({
        listeler: l?.listPriceList || [],
        urunler: urunler.map(u => ({
          id: u.id, ad: u.name,
          varyantlar: u.variants.map(v => ({ id: v.id, sku: v.sku, prices: v.prices })),
        })),
      }, null, 2), 'utf8')
    } catch (e) {
      fs.writeFileSync(yol, JSON.stringify({ hata: e.message }, null, 2), 'utf8')
    }
    return
  }

  // TUR DENETİMİ: TNC_ACIKLAMA=denetle TNC_ACIKLAMA_ID=<id>
  // Ürünü okur, AÇIKLAMAYI DEĞİŞTİRMEDEN aynen geri yazar, geri okur ve karşılaştırır.
  // İçerik açısından işlemsizdir; amacı saveProduct'ın hangi alanı kendiliğinden
  // değiştirdiğini görmek. Kapı ateşlendiğinde suçluyu bu bulur.
  if (mod === 'denetle') {
    const id = process.env.TNC_ACIKLAMA_ID
    const yol = path.join(app.getPath('userData'), 'aciklama-denetle.json')
    try {
      const once = await urunOku(id)
      await graphql(`mutation($input:ProductInput!){ saveProduct(input:$input){ id } }`,
        { input: girdi(once, null) })       // null → mevcut açıklama korunur
      // Bu kip de saveProduct çağırıyor → fiyat listesi satırlarını o da siler.
      // 11.09'da bu kip "fark yok" dedi, çünkü o üründe silinecek satır ZATEN kalmamıştı;
      // yani sonuç yanıltıcıydı. Telafi burada da şart.
      await fiyatListeleriniGeriYaz(id, once.variants)
      const sonra = await urunOku(id)
      fs.writeFileSync(yol, JSON.stringify({
        ad: once.name,
        aciklamaAyniMi: String(once.description || '') === String(sonra.description || ''),
        farklar: farklar(JSON.parse(iskelet(once)), JSON.parse(iskelet(sonra))),
      }, null, 2), 'utf8')
    } catch (e) {
      fs.writeFileSync(yol, JSON.stringify({ hata: e.message }, null, 2), 'utf8')
    }
    return
  }

  if (mod !== 'plan' && mod !== 'uygula') return

  const limit = Number(process.env.TNC_ACIKLAMA_LIMIT || 0) || 0
  const cikti = path.join(app.getPath('userData'), `aciklama-toplu-${mod}.log`)
  const satirlar = []
  const gunluk = (s) => { satirlar.push(s); fs.writeFileSync(cikti, satirlar.join('\n'), 'utf8') }

  gunluk(`== TOPLU AÇIKLAMA — kip: ${mod}${limit ? `, limit: ${limit}` : ''} — ${new Date().toISOString()}`)
  try {
    const s = await calistir({ mod, limit, gunluk })
    gunluk(`\n== BİTTİ: yazıldı ${s.yazildi}, atlandı ${s.atlandi}, hata ${s.hata}`)
    if (mod === 'plan') {
      const planYol = path.join(app.getPath('userData'), 'aciklama-plan.json')
      fs.writeFileSync(planYol, JSON.stringify(s.satirlar, null, 2), 'utf8')
      gunluk(`plan dosyası: ${planYol}`)
    }
  } catch (e) {
    gunluk(`\n== ÇALIŞMA HATASI: ${e.stack || e.message}`)
  }
  gunluk(`\nÇıktı: ${cikti}`)
}

module.exports = { calistir, envIleCalistir, topluKipMi, girdi, iskelet, farklar, IMZA, ALANLAR }
