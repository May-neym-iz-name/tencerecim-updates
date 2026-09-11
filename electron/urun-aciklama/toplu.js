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
const GORSEL = require('../../URUN-ESLESTIRME/_gorsel-guvence')
const sablon = require('./sablon')
const metin = require('./metin')

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
      images: GORSEL.gorseller(v, u.name),
      // priceListId'li satırlar saveProduct'a verilirse "multiple default prices"
      // hatası çıkar; verilmezse silinme riski var → iskelet karşılaştırması yakalar.
      // FİYAT DEĞİŞTİRMİYORUZ: okunan değer aynen geri yazılıyor ([[fiyat-kaynak-kurali]]).
      prices: (v.prices || []).filter(p => !p.priceListId)
        .map(p => ({ sellPrice: p.sellPrice, buyPrice: p.buyPrice, currency: p.currency, discountPrice: p.discountPrice })),
      variantValueIds: (v.variantValueIds || []).map(x => ({ variantTypeId: x.variantTypeId, variantValueId: x.variantValueId })),
    })),
  }
}

// description DIŞINDA hiçbir şey değişmemeli. Karşılaştırma otomatik, göz kararı değil.
function iskelet(u) {
  const k = JSON.parse(JSON.stringify(u))
  delete k.description
  return JSON.stringify(k)
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

async function calistir({ mod, limit, gunluk }) {
  const anahtar = (aiAyarlar().gemini_anahtar || '').trim()
  if (!anahtar) throw new Error('Gemini anahtarı girilmemiş (Ayarlar > Yapay Zeka).')

  gunluk('ürünler okunuyor…')
  const urunler = await tumUrunler()
  gunluk(`ikas'ta ${urunler.length} ürün.`)

  const adaylar = urunler.filter(u => {
    const d = String(u.description || '').trim()
    if (!d) return false                  // dağıtılacak bilgi yok
    if (d.includes(IMZA)) return false     // zaten dönüştürülmüş
    return true
  })
  gunluk(`aday: ${adaylar.length} (boş açıklamalı ve zaten dönüşmüş olanlar hariç)`)

  const hedefler = limit > 0 ? adaylar.slice(0, limit) : adaylar

  // YEDEK — yazmadan önce, her koşulda.
  const yedekDizin = path.join(app.getPath('userData'), 'aciklama-yedek')
  fs.mkdirSync(yedekDizin, { recursive: true })
  const yedekYol = path.join(yedekDizin, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(yedekYol, JSON.stringify(
    hedefler.map(u => ({ id: u.id, name: u.name, description: u.description })), null, 2), 'utf8')
  gunluk(`yedek: ${yedekYol}`)

  const sonuc = { yazildi: 0, atlandi: 0, hata: 0, satirlar: [] }

  for (const u of hedefler) {
    const etiket = `${u.name} (${u.id})`
    try {
      const { bilgi, uyari } = await metin.bolumleriUret({
        ad: u.name, marka: u.brand?.name, mevcut: u.description, anahtar,
      })
      if (uyari) { sonuc.atlandi++; gunluk(`⚠ ATLANDI ${etiket} — ${uyari}`); continue }

      const yeni = IMZA + '\n' + sablon.uret(bilgi)

      if (mod === 'plan') {
        sonuc.satirlar.push({ ad: u.name, id: u.id, eski: u.description, yeni })
        gunluk(`· plan ${etiket} — SEO ${bilgi.seo.length} krkt`)
        continue
      }

      // Görsel kapısı burada da devrede: girdi() okunamayan görselde fırlatır.
      const g = girdi(u, yeni)
      await graphql(`mutation($input:ProductInput!){ saveProduct(input:$input){ id } }`, { input: g })

      // "Hata vermedi" doğrulama değildir — geri oku ve karşılaştır.
      const sonra = await urunOku(u.id)
      if (iskelet(sonra) !== iskelet(u)) {
        throw new Error('açıklama DIŞINDA bir alan değişti — ikas panelinden kontrol et')
      }
      GORSEL.gorselDogrula(u, sonra, etiket)
      if (String(sonra.description || '') !== yeni) {
        throw new Error('açıklama yazıldı ama geri okunan metin farklı')
      }

      sonuc.yazildi++
      gunluk(`✔ ${etiket} — SEO ${bilgi.seo.length} krkt`)
    } catch (e) {
      sonuc.hata++
      gunluk(`✘ HATA ${etiket} — ${e.message}`)
      // Alan kaybı/görsel kaybı sessizce geçilmez: hasar iddiası varsa çalışmayı durdur.
      if (/KAYBI|DIŞINDA/.test(e.message)) { gunluk('!! DURDURULDU'); break }
    }
  }
  return { ...sonuc, yedekYol }
}

// main.js'ten çağrılır. Sonucu dosyaya yazar (Electron GUI stdout'u kabuğa vermez).
async function envIleCalistir() {
  const mod = process.env.TNC_ACIKLAMA           // 'plan' | 'uygula'
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

module.exports = { calistir, envIleCalistir, girdi, iskelet, IMZA, ALANLAR }
