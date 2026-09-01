// Bizimhesap sağlayıcı adaptörü. Fatura belgesini oluşturan taraf burasıdır.
// Sağlayıcı DEĞİŞİRSE yalnız bu dosya değişir (spec: sağlayıcı adaptör arkasında).
// Uç nokta ve alan adları: docs/bizimhesap-api-reference.md
//
// NEDEN https.request (fetch DEĞİL): Electron 22'nin ana süreci Node 16.17
// çalıştırır, global fetch Node 18'de geldi. Desen: electron/fatura/bulut.js.
const https = require('https')
const { yuvarla } = require('../../db/satis-hesapla')

const HOST = 'bizimhesap.com'
const YOL = '/api/b2b/addinvoice'
const ZAMAN_ASIMI_MS = 30000
const FATURA_TIPI_SATIS = 3          // 3 = Satış, 5 = Alış

class SaglayiciHatasi extends Error {
  constructor(mesaj, kod, ayrinti) {
    super(mesaj)
    this.name = 'SaglayiciHatasi'
    this.kod = kod                   // 'is_hatasi' | 'ag' | 'yapilandirma'
    this.ayrinti = ayrinti
  }
}

// Bizimhesap yükünü kurar.
//
// KDV KONVANSİYONU: bizim fiyatlarımız KDV DAHİL (bkz. db/satis-hesapla.js),
// Bizimhesap dokümanındaki örnek ise KDV hariç fiyatlama gösteriyor. Köprü:
// unitPrice/grossPrice/total = KDV'li tutar, tax fiyattan ayrıştırılır,
// net = total - tax. Üçlü kendi içinde tutarlıdır (net + tax = total).
//
// YUVARLAMA SIRASI: önce birim fiyat, sonra çarpım. RPC fatura_kes_basla aynı
// sırayla yeniden doğruluyor; sıra bozulursa SATIR_TOPLAM_UYUSMUYOR ile geçerli
// fatura reddedilir.
function _yukOlustur(fatura, ayarlar) {
  if (!ayarlar || !ayarlar.firmId) {
    throw new SaglayiciHatasi('Bizimhesap firmId tanımlı değil (Ayarlar > Fatura)', 'yapilandirma')
  }
  let kdvToplam = 0
  let genelToplam = 0
  const details = (fatura.kalemler || []).map(k => {
    if (!k.sku) {
      throw new SaglayiciHatasi(`Ürünün SKU'su yok, faturaya yazılamaz: ${k.ad}`, 'is_hatasi')
    }
    const birimFiyat = yuvarla(Number(k.birim_fiyat))
    const satirToplam = yuvarla(Number(k.miktar) * birimFiyat)
    const oran = Number(k.kdv_orani)
    const kdv = yuvarla(satirToplam * oran / (100 + oran))
    kdvToplam += kdv
    genelToplam += satirToplam
    return {
      productId: k.sku,              // ← mükerrer ürün açılmasını önleyen alan
      productName: k.ad,
      note: k.not || '',
      barcode: k.barkod || '',
      taxRate: oran,
      quantity: Number(k.miktar),
      unitPrice: birimFiyat,
      grossPrice: satirToplam,
      discount: 0,
      net: yuvarla(satirToplam - kdv),
      tax: kdv,
      total: satirToplam,
    }
  })
  kdvToplam = yuvarla(kdvToplam)
  genelToplam = yuvarla(genelToplam)
  const m = fatura.musteri || {}
  return {
    firmId: ayarlar.firmId,
    invoiceNo: fatura.fatura_no || '',
    invoiceType: FATURA_TIPI_SATIS,
    note: fatura.not || '',
    dates: { invoiceDate: fatura.tarih, dueDate: fatura.tarih },
    customer: {
      customerId: m.id,
      title: m.unvan,
      taxOffice: m.vergi_dairesi || '',
      taxNo: m.vergi_no || m.tc || '',
      email: m.eposta || '',
      phone: m.telefon || '',
      address: m.adres || '',
    },
    amounts: {
      currency: 'TL',
      gross: genelToplam,
      discount: 0,
      net: yuvarla(genelToplam - kdvToplam),
      tax: kdvToplam,
      total: genelToplam,
    },
    details,
  }
}

function _istek(yuk) {
  return new Promise((cozumle, reddet) => {
    const govde = JSON.stringify(yuk)
    const req = https.request(
      {
        hostname: HOST,
        path: YOL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(govde),
        },
        timeout: ZAMAN_ASIMI_MS,
      },
      (res) => {
        let ham = ''
        res.on('data', p => { ham += p })
        res.on('end', () => cozumle({ status: res.statusCode, ham }))
      }
    )
    req.on('timeout', () => { req.destroy(new Error('zaman aşımı')) })
    // Ağ hatası: fatura KESİLMİŞ DE OLABİLİR. Mesaj kesinlik iddia etmez;
    // çağıran taraf 'ag' kodunda telafi YAPMAZ, insan kontrolüne düşer.
    req.on('error', (e) => reddet(new SaglayiciHatasi(
      'Bizimhesap sunucusuna ulaşılamadı, işlemin sonucu doğrulanamadı: ' + e.message, 'ag', e)))
    req.write(govde)
    req.end()
  })
}

async function faturaGonder(fatura, ayarlar) {
  const yuk = _yukOlustur(fatura, ayarlar)
  const { status, ham } = await _istek(yuk)
  let veri = null
  try { veri = ham ? JSON.parse(ham) : null } catch { veri = null }

  // Bizimhesap 200 döndürüp gövdedeki error alanıyla iş hatası bildirir.
  // Okunamayan gövde/5xx = sonuç BELİRSİZ → 'ag'.
  if (status >= 500 || veri == null) {
    throw new SaglayiciHatasi(
      'Bizimhesap yanıtı okunamadı, işlemin sonucu doğrulanamadı', 'ag', { status, ham })
  }
  if (veri.error) {
    throw new SaglayiciHatasi('Bizimhesap faturayı reddetti: ' + veri.error, 'is_hatasi', veri)
  }
  return { guid: veri.guid, url: veri.url, hamYanit: veri }
}

module.exports = { faturaGonder, SaglayiciHatasi, _yukOlustur }
