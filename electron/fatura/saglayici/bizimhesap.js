// Bizimhesap sağlayıcı adaptörü. Fatura belgesini oluşturan taraf burasıdır.
// Sağlayıcı DEĞİŞİRSE yalnız bu dosya değişir (spec: sağlayıcı adaptör arkasında).
// Uç nokta ve alan adları: docs/bizimhesap-api-reference.md
//
// NEDEN https.request (fetch DEĞİL): Electron 22'nin ana süreci Node 16.17
// çalıştırır, global fetch Node 18'de geldi. Desen: electron/fatura/bulut.js.
//
// 01.09.2026 kod incelemesi sonrası (2 Critical + 4 High): 4xx artık başarı
// sayılmıyor, kopan yanıt Promise'i asılı bırakmıyor, sayısal alanlar ve zorunlu
// müşteri/tarih alanları doğrulanıyor, set kuruş dağıtımı için satir_toplam
// arayüze eklendi.
const https = require('https')
const { yuvarla } = require('../../db/satis-hesapla')

const HOST = 'bizimhesap.com'
const YOL = '/api/b2b/addinvoice'
const YOL_URUNLER = '/api/b2b/products'
// Dokümanda AÇIKÇA yazılı sabit entegrasyon anahtarı (herkes için aynı, gizli
// değil): docs/bizimhesap-api-reference.md "Ürün Listesi Alma". Hesaba özel olan
// Token başlığıdır.
const B2B_KEY = 'BZMHB2B724018943908D0B82491F203F'
const SOKET_BOSTA_MS = 30000     // soket BOŞTA kalma sınırı (https option.timeout)
const TOPLAM_SURE_MS = 45000     // isteğin toplam ömrü — aşağıdaki nedene bak
const FATURA_TIPI_SATIS = 3      // 3 = Satış, 5 = Alış

class SaglayiciHatasi extends Error {
  constructor(mesaj, kod, ayrinti) {
    super(mesaj)
    this.name = 'SaglayiciHatasi'
    // 'is_hatasi'    → fatura KESİNLİKLE oluşmadı, telafi (stok iadesi) yapılabilir
    // 'yapilandirma' → kimlik/yetki sorunu, yine KESİN başarısızlık
    // 'ag'           → sonuç BELİRSİZ, telafi YAPILMAZ, insan kontrolüne düşer
    this.kod = kod
    this.ayrinti = ayrinti
  }
}

function _sayi(deger, alan, urunAdi) {
  // Number(null) === 0 ve Number('') === 0 — bu iki değer "belirtilmemiş"
  // demektir, sıfır demek DEĞİL. Ayrı ele alınmazsa KDV oranı boş gelen bir
  // kalem sessizce %0 KDV'li faturalanır.
  const n = (deger === null || deger === undefined || deger === '') ? NaN : Number(deger)
  if (!Number.isFinite(n)) {
    // JSON.stringify NaN'ı null'a çevirir; kontrol edilmezse tutarı null olan
    // bir fatura ağa çıkar ve sağlayıcı bunu 0 TL sayabilir.
    throw new SaglayiciHatasi(
      `Kalemin ${alan} değeri sayı değil, faturaya yazılamaz: ${urunAdi || '(adsız ürün)'}`, 'is_hatasi')
  }
  return n
}

// Bizimhesap yükünü kurar.
//
// KDV KONVANSİYONU: bizim fiyatlarımız KDV DAHİL (bkz. db/satis-hesapla.js),
// Bizimhesap dokümanındaki örnek ise KDV HARİÇ fiyatlama gösteriyor
// (gross 2400 + tax 432 -> total 2832). Köprü: unitPrice/grossPrice/total =
// KDV'li tutar, tax fiyattan ayrıştırılır, net = total - tax. Üçlü kendi içinde
// tutarlıdır (net + tax = total).
// 🔴 DOĞRULANMADI: Bizimhesap sunucusu bu alanları yeniden hesaplıyorsa fatura
// %KDV kadar şişebilir. firmId gelince İLK İŞ 1 TL'lik deneme faturasıyla
// amounts.gross / details[].total alanlarını tutar tutar karşılaştırmak.
//
// YUVARLAMA SIRASI: önce birim fiyat, sonra çarpım. RPC fatura_kes_basla aynı
// sırayla yeniden doğruluyor; sıra bozulursa SATIR_TOPLAM_UYUSMUYOR ile geçerli
// fatura reddedilir.
function _yukOlustur(fatura, ayarlar) {
  if (!ayarlar || !ayarlar.firmId) {
    throw new SaglayiciHatasi('Bizimhesap firmId tanımlı değil (Ayarlar > Fatura)', 'yapilandirma')
  }
  if (!fatura || !fatura.tarih) {
    throw new SaglayiciHatasi('Fatura tarihi boş, fatura kesilemez', 'is_hatasi')
  }
  const m = fatura.musteri || {}
  if (!m.unvan) {
    // Doküman Title'ı opsiyonel işaretlemiyor; boş geçilirse Bizimhesap ya reddeder
    // ya da isimsiz bir müşteri kaydı açar (spec §③ guard 3).
    throw new SaglayiciHatasi('Müşteri ünvanı boş, fatura kesilemez', 'is_hatasi')
  }

  let kdvToplam = 0
  let genelToplam = 0
  const details = (fatura.kalemler || []).map(k => {
    if (!k.sku) {
      throw new SaglayiciHatasi(`Ürünün SKU'su yok, faturaya yazılamaz: ${k.ad}`, 'is_hatasi')
    }
    const miktar = _sayi(k.miktar, 'miktar', k.ad)
    if (miktar <= 0) {
      throw new SaglayiciHatasi(`Kalemin miktarı sıfır veya negatif: ${k.ad}`, 'is_hatasi')
    }
    const oran = _sayi(k.kdv_orani, 'KDV oranı', k.ad)
    if (oran < 0) {
      throw new SaglayiciHatasi(`Kalemin KDV oranı negatif: ${k.ad}`, 'is_hatasi')
    }
    const birimFiyat = yuvarla(_sayi(k.birim_fiyat, 'birim fiyat', k.ad))
    if (birimFiyat < 0) {
      throw new SaglayiciHatasi(`Kalemin birim fiyatı negatif: ${k.ad}`, 'is_hatasi')
    }

    // satir_toplam OPSİYONEL: set çözmede kuruş artığı KASTEN son bileşene
    // atanır (spec §③), o yüzden satır toplamı miktar × birim fiyattan bir kuruş
    // sapabilir. Verilmişse fatura BİZİM kaydımızla aynı tutarı taşısın diye o
    // kullanılır; sapma RPC'nin toleransıyla AYNI sınırda denetlenir.
    const hesaplanan = yuvarla(miktar * birimFiyat)
    let satirToplam = hesaplanan
    if (k.satir_toplam != null) {
      const verilen = yuvarla(_sayi(k.satir_toplam, 'satır toplamı', k.ad))
      const sinir = Math.max(0.01, yuvarla(0.005 * miktar))
      if (yuvarla(Math.abs(verilen - hesaplanan)) > sinir) {
        throw new SaglayiciHatasi(
          `Kalemin satır toplamı miktar × birim fiyat ile uyuşmuyor: ${k.ad} ` +
          `(${verilen} ≠ ${hesaplanan})`, 'is_hatasi')
      }
      satirToplam = verilen
    }

    const kdv = yuvarla(satirToplam * oran / (100 + oran))
    kdvToplam += kdv
    genelToplam += satirToplam
    return {
      productId: k.sku,              // ← mükerrer ürün açılmasını önleyen alan
      productName: k.ad,
      note: k.not || '',
      barcode: k.barkod || '',
      taxRate: oran,
      quantity: miktar,
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
  return {
    firmId: ayarlar.firmId,
    invoiceNo: fatura.fatura_no || '',
    invoiceType: FATURA_TIPI_SATIS,
    note: fatura.not || '',
    dates: { invoiceDate: fatura.tarih, dueDate: fatura.tarih },
    customer: {
      customerId: m.id != null ? m.id : '',
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

function _istek(yuk, secenek) {
  const { yol = YOL, yontem = 'POST', ekBasliklar = null } = secenek || {}
  return new Promise((cozumle, reddet) => {
    const govde = yuk == null ? '' : JSON.stringify(yuk)
    let bitti = false
    let sayac = null
    const kapat = () => { if (sayac) { clearTimeout(sayac); sayac = null } }
    const coz = (d) => { if (bitti) return; bitti = true; kapat(); cozumle(d) }
    const red = (e) => { if (bitti) return; bitti = true; kapat(); reddet(e) }
    // Her ağ arızası BELİRSİZ sonuçtur: istek sunucuya ulaşmış ve fatura kesilmiş
    // OLABİLİR. Mesaj kesinlik iddia etmez; çağıran 'ag' kodunda telafi YAPMAZ.
    const agHatasi = (mesaj, e) => red(new SaglayiciHatasi(
      'Bizimhesap ile bağlantı tamamlanamadı, işlemin sonucu doğrulanamadı: ' + mesaj, 'ag', e))

    const req = https.request(
      {
        hostname: HOST,
        path: yol,
        method: yontem,
        headers: Object.assign({
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(govde),
        }, ekBasliklar || {}),
        timeout: SOKET_BOSTA_MS,
      },
      (res) => {
        let ham = ''
        res.on('data', p => { ham += p })
        res.on('end', () => coz({ status: res.statusCode, ham }))
        // 🔴 Yanıt başlıkları geldikten SONRA soket koparsa req 'error' yaymaz ve
        // res 'end' yaymaz — bu üç dinleyici olmadan Promise sonsuza dek asılı
        // kalır, fatura satırı kalıcı olarak 'kuyrukta' çakılır ve kullanıcı
        // hiçbir şey görmez. (01.09 incelemesi C2, gerçek sunucuyla doğrulandı.)
        res.on('aborted', () => agHatasi('yanıt yarıda kesildi'))
        res.on('error', (e) => agHatasi((e && e.message) || 'yanıt hatası', e))
        res.on('close', () => agHatasi('bağlantı yanıt tamamlanmadan kapandı'))
      }
    )
    req.on('timeout', () => { req.destroy(new Error('soket zaman aşımı')) })
    req.on('error', (e) => agHatasi((e && e.message) || 'bağlantı hatası', e))
    // option.timeout yalnız soket BOŞTA kalma süresidir: DNS'i kapsamaz ve sunucu
    // 25 sn'de bir bayt damlatırsa saat hiç dolmaz. Toplam ömür sınırı ayrı gerekir.
    sayac = setTimeout(() => {
      try { req.destroy(new Error('süre sınırı')) } catch { /* zaten kapalı */ }
      agHatasi(`süre sınırı aşıldı (${TOPLAM_SURE_MS} ms)`)
    }, TOPLAM_SURE_MS)
    if (typeof sayac.unref === 'function') sayac.unref()

    req.write(govde)
    req.end()
  })
}

async function faturaGonder(fatura, ayarlar) {
  const yuk = _yukOlustur(fatura, ayarlar)
  const { status, ham } = await _istek(yuk)
  let veri = null
  try { veri = ham ? JSON.parse(ham) : null } catch { veri = null }

  // 5xx / okunamayan gövde: sunucu isteği almış ve işlemiş OLABİLİR → BELİRSİZ.
  if (status >= 500 || veri == null) {
    throw new SaglayiciHatasi(
      'Bizimhesap yanıtı okunamadı, işlemin sonucu doğrulanamadı', 'ag', { status, ham })
  }
  // 401/403: kimlik/yetki. Fatura KESİNLİKLE oluşmadı — telafi güvenle çalışır.
  if (status === 401 || status === 403) {
    throw new SaglayiciHatasi(
      'Bizimhesap kimlik doğrulaması reddetti — firmId/Token hatalı olabilir (Ayarlar > Fatura)',
      'yapilandirma', { status, ham })
  }
  // Diğer 4xx: istek reddedildi, fatura oluşmadı. Bu kontrol OLMAZSA gövdesi
  // JSON olan bir 400/404 yanıtı "başarılı" sayılır ve sipariş kalıcı olarak
  // faturalanamaz hale gelir (01.09 incelemesi C1).
  if (status < 200 || status >= 300) {
    throw new SaglayiciHatasi(
      `Bizimhesap isteği reddetti (HTTP ${status})`, 'is_hatasi', { status, ham })
  }
  // Bizimhesap 200 döndürüp gövdedeki error alanıyla iş hatası bildirir.
  if (veri.error) {
    throw new SaglayiciHatasi('Bizimhesap faturayı reddetti: ' + veri.error, 'is_hatasi', veri)
  }
  // 200 + error boş ama guid yok: beklenmeyen gövde. Fatura oluşmuş olabilir de
  // olmayabilir de — kesinlik iddia etmeden BELİRSİZ'e düşer.
  if (!veri.guid) {
    throw new SaglayiciHatasi(
      'Bizimhesap yanıtı fatura kimliği (guid) taşımıyor, işlemin sonucu doğrulanamadı',
      'ag', { status, ham })
  }
  return { guid: veri.guid, url: veri.url, hamYanit: veri }
}

// Kimlik bilgilerini SALT OKUNUR uçla dener — fatura KESMEZ, hiçbir şey yazmaz.
// Kullanıcı "Bağlantıyı Sına" dediğinde çalışır; amaç yanlış anahtarı fatura
// kesme anında değil, ayar ekranında yakalamak.
async function baglantiSina(ayarlar) {
  const token = ayarlar && ayarlar.token
  if (!token) {
    throw new SaglayiciHatasi('Bizimhesap Token tanımlı değil (Ayarlar > Fatura)', 'yapilandirma')
  }
  const { status, ham } = await _istek(null, {
    yol: YOL_URUNLER,
    yontem: 'GET',
    ekBasliklar: { Key: B2B_KEY, Token: token },
  })
  if (status === 401 || status === 403) {
    throw new SaglayiciHatasi('Bizimhesap Token kabul etmedi — panelden kopyaladığın API Key doğru mu?', 'yapilandirma')
  }
  if (status < 200 || status >= 300) {
    throw new SaglayiciHatasi(`Bizimhesap ürün listesi alınamadı (HTTP ${status})`, 'is_hatasi', { status })
  }
  let veri = null
  try { veri = ham ? JSON.parse(ham) : null } catch { veri = null }

  // 🔴 B2B GET uçlarının yanıt biçimi addinvoice'tan FARKLI (01.09'da canlı
  // yanıttan okundu, tahmin DEĞİL):
  //   { resultCode: 1, errorText: '', data: { products: [...] } }
  // Başarı kodu 1'dir — 0 varsayılsaydı her başarılı çağrı hata sayılırdı.
  if (veri && veri.errorText) {
    throw new SaglayiciHatasi('Bizimhesap reddetti: ' + veri.errorText, 'is_hatasi', { resultCode: veri.resultCode })
  }
  if (veri && veri.resultCode != null && Number(veri.resultCode) !== 1) {
    throw new SaglayiciHatasi(`Bizimhesap beklenmeyen sonuç kodu döndürdü (${veri.resultCode})`, 'is_hatasi',
      { resultCode: veri.resultCode })
  }
  // firmId'yi bu uç doğrulamaz (onu yalnız addinvoice kullanır) — girilmiş mi
  // bilgisini ayrıca döndür ki kullanıcı eksiği görsün.
  const liste = (veri && veri.data && veri.data.products) || []
  return {
    ok: true,
    urunSayisi: Array.isArray(liste) ? liste.length : null,
    firmIdGirilmis: Boolean(ayarlar && ayarlar.firm_id),
  }
}

module.exports = { faturaGonder, baglantiSina, SaglayiciHatasi, _yukOlustur }
