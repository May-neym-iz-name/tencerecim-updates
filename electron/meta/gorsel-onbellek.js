// Sosyal medya görselleri için KALICI yerel önbellek.
//
// NEDEN: Meta'nın media_url/thumbnail_url/profile_pic adresleri imzalı ve SÜRELİDİR.
// Ölçüm (2026-08-03): bugünkü URL'ler HTTP 206 dönerken 2025 ve 2022 tarihli kayıtlı
// URL'ler HTTP 403 döndü → eski gönderilerin görselleri listede kırık çıkıyordu.
// URL'i DB'de tazelemek yetmez, birkaç gün sonra yine ölür. Bu yüzden görsel bir kez
// diske indirilir ve bir daha ağa çıkılmaz; gönderi Meta'da silinse bile elde kalır.
//
// Dosyalar userData/sosyal-gorseller/ altında; anahtar (konu_id / kullanıcı id) sha1'lenir
// çünkü Meta kimlikleri dosya adında güvenli olmayan karakterler içerebilir.
const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')
const { app } = require('electron')

const INDIRME_ZAMAN_ASIMI_MS = 20 * 1000
const AZAMI_BOYUT = 8 * 1024 * 1024 // kötü niyetli/hatalı dev yanıtlara karşı tavan

// İNDİRME KUYRUĞU: liste ekranı tek seferde yüzlerce satır çizdiği için görseller
// aynı anda istenir. Sınırsız bırakılırsa yüzlerce eşzamanlı HTTPS isteği açılır →
// ağ tıkanır ve Meta hız sınırına takılır. Aynı anda en fazla bu kadar indirme yapılır
// (zaten diskte olanlar kuyruğa hiç girmez, anında döner).
const AZAMI_ESZAMANLI = 4
let _aktif = 0
const _bekleyen = []

function siraBekle() {
  if (_aktif < AZAMI_ESZAMANLI) { _aktif++; return Promise.resolve() }
  return new Promise(cb => _bekleyen.push(cb))
}
function sirayiBirak() {
  const sonraki = _bekleyen.shift()
  if (sonraki) sonraki()      // yerimizi devrediyoruz, _aktif aynı kalır
  else _aktif--
}

let _klasor = null
function klasor() {
  if (!_klasor) {
    _klasor = path.join(app.getPath('userData'), 'sosyal-gorseller')
    fs.mkdirSync(_klasor, { recursive: true })
  }
  return _klasor
}

function dosyaYolu(anahtar) {
  return path.join(klasor(), crypto.createHash('sha1').update(String(anahtar)).digest('hex') + '.img')
}

// Tek indirme denemesi. Başarılıysa Buffer, HTTP hatasındaysa durum kodu döner.
// Yönlendirmeler izlenir (Meta CDN 302 kullanabilir).
function indir(url, kalanYonlendirme = 3) {
  return new Promise((cb) => {
    let istek
    try {
      istek = https.get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && kalanYonlendirme > 0) {
          res.resume()
          return indir(res.headers.location, kalanYonlendirme - 1).then(cb)
        }
        if (res.statusCode !== 200) { res.resume(); return cb({ hataKodu: res.statusCode }) }
        const parcalar = []
        let boyut = 0
        res.on('data', (p) => {
          boyut += p.length
          if (boyut > AZAMI_BOYUT) { res.destroy(); return cb({ hataKodu: 'ÇOK_BÜYÜK' }) }
          parcalar.push(p)
        })
        res.on('end', () => cb({ veri: Buffer.concat(parcalar) }))
      })
    } catch { return cb({ hataKodu: 'GEÇERSİZ_URL' }) }
    istek.on('error', (e) => cb({ hataKodu: e.code || 'AĞ' }))
    istek.setTimeout(INDIRME_ZAMAN_ASIMI_MS, () => { istek.destroy(); cb({ hataKodu: 'ZAMANAŞIMI' }) })
  })
}

// Görseli yerelden verir; yoksa indirir. URL ölmüşse (403/404) `tazeleyici` ile Meta'dan
// yeni URL istenir ve bir kez daha denenir. Dönüş: data URI ya da null (hiç bulunamadı).
//
// tazeleyici: async () => yeniUrl | null  — çağıran verir (gönderi ve profil için farklı).
async function gorselGetir(anahtar, url, tazeleyici) {
  if (!anahtar) return null
  const yol = dosyaYolu(anahtar)
  try {
    if (fs.existsSync(yol)) return dataUri(fs.readFileSync(yol))
  } catch { /* okunamıyorsa yeniden indirmeyi dene */ }

  await siraBekle()
  let sonuc
  try {
    sonuc = url ? await indir(url) : { hataKodu: 'URL_YOK' }
    // Ölü/eksik URL → Meta'dan taze adres iste (gönderi hâlâ duruyorsa gelir).
    // Ölçüm (2026-08-03): 2022 tarihli 403'lük URL'ler bu yolla 200 dönüp kurtarıldı.
    if (!sonuc.veri && tazeleyici) {
      let tazeUrl = null
      try { tazeUrl = await tazeleyici() } catch { /* tazelenemezse görsel yok sayılır */ }
      if (tazeUrl && tazeUrl !== url) sonuc = await indir(tazeUrl)
    }
  } finally { sirayiBirak() }
  if (!sonuc.veri) return null

  try { fs.writeFileSync(yol, sonuc.veri) } catch { /* disk yazılamazsa da görseli göster */ }
  return dataUri(sonuc.veri)
}

// Renderer <img src> için: dev sunucusu http:// üzerinden çalıştığından file:// engellenir,
// bu yüzden veri gömülü URI kullanılır (küçük küçük resimler, boyut sorun değil).
function dataUri(buf) {
  return `data:${mimeTuru(buf)};base64,${buf.toString('base64')}`
}

// Uzantıya değil İÇERİĞE bak: Meta URL'lerinde uzantı çoğu zaman yok/yanıltıcı.
function mimeTuru(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50) return 'image/png'
  if (buf.length > 12 && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp'
  if (buf.length > 6 && buf.slice(0, 3).toString() === 'GIF') return 'image/gif'
  return 'image/jpeg'
}

// Önbellek boyutu (Ayarlar'da göstermek / temizlemek için).
function onbellekDurum() {
  try {
    const dosyalar = fs.readdirSync(klasor())
    let bayt = 0
    for (const d of dosyalar) {
      try { bayt += fs.statSync(path.join(klasor(), d)).size } catch { /* yarışta silinmiş olabilir */ }
    }
    return { adet: dosyalar.length, bayt }
  } catch { return { adet: 0, bayt: 0 } }
}

module.exports = { gorselGetir, onbellekDurum }
