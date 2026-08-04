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
//
// NEDEN ARTIK DOSYA YOLU DÖNÜYOR (2026-08-04 performans ölçümü): burası eskiden data URI
// döndürüyordu ve sosyal medya sekmesi açılışta donuyordu. Ölçüm: 1.072 görsel / 89 MB,
// ortalama 85 KB — ve hepsi 40x40 pikselde gösteriliyor. Liste 700 satıra kadar çıktığı
// için tek açılışta ~42 MB SENKRON disk okuması (ana süreci kilitler), %33 şişmiş base64
// olarak IPC'den geçiş ve renderer'da bayt bayt çözme yapılıyordu. Artık:
//   1. Görsel bir kez küçültülür (128 px, ~85 KB → ~5 KB).
//   2. Buradan yalnız DOSYA YOLU döner; <img> özel protokol üzerinden diskten okur.
//      Base64, IPC yükü ve renderer'daki çözme döngüsü tamamen ortadan kalkar.
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const https = require('https')
const crypto = require('crypto')
const { app, nativeImage } = require('electron')

const INDIRME_ZAMAN_ASIMI_MS = 20 * 1000
const AZAMI_BOYUT = 8 * 1024 * 1024 // kötü niyetli/hatalı dev yanıtlara karşı tavan
const KUCUK_GENISLIK = 128 // liste 40 px, detay başlığı 44 px → 2x ekranda bile net
const KUCUK_KALITE = 78
// Bulunamayan görseli her istekte yeniden indirmeye çalışmak listeyi kilitliyordu
// (Messenger profil fotoğrafları Meta izni olmadığı için HER ZAMAN boş döner).
// Başarısızlık bu süre boyunca hatırlanır.
const YOK_HATIRLAMA_MS = 30 * 60 * 1000

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

// Aynı görsel için uçuşan istekler tek işe indirgenir. Liste 700 satır çizerken aynı
// gönderi iki kez istenebilir; onsuz aynı dosya iki kez indirilirdi.
const _ucusan = new Map()
const _bulunamayan = new Map() // anahtar -> son başarısızlık zamanı

let _klasor = null
function klasor() {
  if (!_klasor) {
    _klasor = path.join(app.getPath('userData'), 'sosyal-gorseller')
    fs.mkdirSync(_klasor, { recursive: true })
  }
  return _klasor
}

function damga(anahtar) {
  return crypto.createHash('sha1').update(String(anahtar)).digest('hex')
}
// Tam boy dosya adı DEĞİŞMEDİ — mevcut 89 MB'lık önbellek geçerli kalır, hiçbir
// görsel yeniden indirilmez; ilk istekte yalnız küçük sürümü türetilir.
function dosyaYolu(anahtar) { return path.join(klasor(), damga(anahtar) + '.img') }
function kucukYolu(anahtar) { return path.join(klasor(), damga(anahtar) + '.k.img') }

async function varMi(yol) {
  try { await fsp.access(yol); return true } catch { return false }
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

// Tam boy dosyadan küçük sürüm üretir. Üretilemezse (bozuk/desteklenmeyen içerik)
// null döner ve çağıran tam boyu servis eder — görsel kaybolmaz, sadece büyük kalır.
async function kucukUret(kaynakYol, hedefYol) {
  try {
    const ham = await fsp.readFile(kaynakYol)
    const img = nativeImage.createFromBuffer(ham)
    if (img.isEmpty()) return null
    // Zaten küçükse yeniden kodlamak boşuna kalite kaybı; olduğu gibi bırak.
    const kucuk = img.getSize().width > KUCUK_GENISLIK
      ? img.resize({ width: KUCUK_GENISLIK, quality: 'good' })
      : img
    const veri = kucuk.toJPEG(KUCUK_KALITE)
    if (!veri || !veri.length) return null
    await fsp.writeFile(hedefYol, veri)
    return hedefYol
  } catch {
    return null
  }
}

// Görselin YEREL DOSYA YOLUNU verir; yoksa indirir. URL ölmüşse (403/404) `tazeleyici`
// ile Meta'dan yeni URL istenir ve bir kez daha denenir.
//
// boyut: 'kucuk' (liste/avatar) | 'tam' (detay panelindeki büyük gönderi görseli)
// tazeleyici: async () => yeniUrl | null  — çağıran verir (gönderi ve profil için farklı).
// Dönüş: mutlak dosya yolu ya da null (hiç bulunamadı).
async function gorselDosyasi(anahtar, url, tazeleyici, boyut = 'kucuk') {
  if (!anahtar) return null
  const tamYol = dosyaYolu(anahtar)
  const kucYol = kucukYolu(anahtar)
  const istenen = boyut === 'tam' ? tamYol : kucYol

  // En sık yol: dosya zaten yerinde. Ne ağa ne kuyruğa girmeden dön.
  if (await varMi(istenen)) return istenen

  const sonHata = _bulunamayan.get(anahtar)
  if (sonHata && Date.now() - sonHata < YOK_HATIRLAMA_MS) return null

  const isAnahtari = `${anahtar}|${boyut}`
  if (_ucusan.has(isAnahtari)) return _ucusan.get(isAnahtari)

  const is = (async () => {
    // Tam boy elde varsa yalnız küçültme gerekiyordur — indirmeye gerek yok.
    // (Mevcut 89 MB'lık önbellek küçük sürümlerini bu yoldan kazanır.)
    if (await varMi(tamYol)) {
      return (await kucukUret(tamYol, kucYol)) || tamYol
    }

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

    if (!sonuc.veri) { _bulunamayan.set(anahtar, Date.now()); return null }
    _bulunamayan.delete(anahtar)

    try { await fsp.writeFile(tamYol, sonuc.veri) } catch { return null }
    if (boyut === 'tam') return tamYol
    return (await kucukUret(tamYol, kucYol)) || tamYol
  })()

  _ucusan.set(isAnahtari, is)
  try { return await is } finally { _ucusan.delete(isAnahtari) }
}

// Önbellek boyutu (Ayarlar'da göstermek / temizlemek için).
function onbellekDurum() {
  try {
    const dosyalar = fs.readdirSync(klasor())
    let bayt = 0
    for (const d of dosyalar) {
      try { bayt += fs.statSync(path.join(klasor(), d)).size } catch { /* yarışta silinmiş olabilir */ }
    }
    // .k.img küçük sürümler ayrı dosya; "kaç görsel" derken çift saymayalım.
    const adet = dosyalar.filter(d => !d.endsWith('.k.img')).length
    return { adet, bayt }
  } catch { return { adet: 0, bayt: 0 } }
}

module.exports = { gorselDosyasi, onbellekDurum }
