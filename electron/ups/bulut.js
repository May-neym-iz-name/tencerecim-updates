// Kargo Worker istemcisi — uygulama ↔ Cloudflare köprüsü.
//
// NE İŞE YARAR: UPS'e sorma işi artık Worker'da (cloudflare/kargo-worker), 7/24.
// Bu modül iki yönü taşır:
//   itListe(...)      uygulama → Worker  "şu takip numaralarını yokla"
//   durumlariCek(...) Worker → uygulama  "son okumamdan beri ne değişti"
//
// YORUMLAMA BURADA DEĞİL: dönen ham UPS alanları takip.js'e verilir, durumCevir/bildirim/
// ikas bildirimi hepsi orada kalır (docs/cloudflare-plani.md §3 "altın kural").
//
// NOT: Electron 22 = Node 16 → global fetch YOK. Yerleşik https modülü kullanılır.
// (Worker tarafı tam tersi: orada node:https yok, fetch var. İki taraf aynı işi
// iki farklı API ile yapmak zorunda — birini diğerine kopyalamayın.)
const https = require('https')
const { _ayarlariGetir } = require('../db/ups-ayarlar')

const ZAMAN_ASIMI_MS = 20000

// Basit HTTPS JSON çağrısı. { status, json } döner.
function istek(yontem, url, anahtar, govde) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const veri = govde === undefined ? null : Buffer.from(JSON.stringify(govde), 'utf8')
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: yontem,
      headers: {
        Authorization: 'Bearer ' + anahtar,
        ...(veri ? { 'Content-Type': 'application/json', 'Content-Length': veri.length } : {}),
      },
      timeout: ZAMAN_ASIMI_MS,
    }, (res) => {
      let metin = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { metin += c })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(metin) } catch {}
        resolve({ status: res.statusCode, json })
      })
    })
    // timeout tek başına isteği KESMEZ, yalnız olayı tetikler — destroy şart,
    // yoksa Worker cevap vermediğinde tur sonsuza kadar asılı kalır.
    req.on('timeout', () => req.destroy(new Error(`zaman aşımı (${ZAMAN_ASIMI_MS / 1000}s)`)))
    req.on('error', reject)
    if (veri) req.write(veri)
    req.end()
  })
}

/**
 * Bulut köprüsü ayarları. Her ikisi de doluysa köprü AÇIK sayılır.
 * ups_ayarlar PC'ler arası senkronlanır (db/ayar-senk.js) — bir PC'de kurulan
 * köprü diğerlerinde de kendiliğinden açılır, bu istenen davranış.
 */
function ayar() {
  const a = _ayarlariGetir()
  const url = String(a.bulut_url || '').trim().replace(/\/+$/, '')
  const anahtar = String(a.bulut_anahtar || '').trim()
  return { url, anahtar, acik: Boolean(url && anahtar) }
}

/**
 * Yoklanacak takip numaralarını Worker'a bildirir.
 * Worker listeyi birleştirir (INSERT ON CONFLICT) — her PC kendi listesini itebilir,
 * biri diğerinin numarasını düşürmez.
 * @param {string[]} takipler
 */
async function itListe(takipler) {
  const { url, anahtar, acik } = ayar()
  if (!acik) throw new Error('Bulut köprüsü kurulu değil (bulut_url / bulut_anahtar boş)')
  const benzersiz = [...new Set((takipler || []).map(t => String(t || '').trim()).filter(Boolean))]
  if (!benzersiz.length) return { alinan: 0 }

  // Worker tek çağrıda en fazla 500 alıyor; uzun listeyi parçala.
  let alinan = 0
  for (let i = 0; i < benzersiz.length; i += 500) {
    const { status, json } = await istek('POST', `${url}/kargo/izle`, anahtar, { takipler: benzersiz.slice(i, i + 500) })
    if (status !== 200) throw new Error(`Worker liste itme hatası (HTTP ${status})${json?.hata ? ': ' + json.hata : ''}`)
    alinan += Number(json?.alinan) || 0
  }
  return { alinan }
}

/**
 * İmleçten sonra durumu DEĞİŞEN kayıtları çeker.
 * @param {string} since ISO damga. Boşsa baştan alır.
 * @returns {Promise<{kayitlar: object[], imlec: string}>}
 */
async function durumlariCek(since) {
  const { url, anahtar, acik } = ayar()
  if (!acik) throw new Error('Bulut köprüsü kurulu değil (bulut_url / bulut_anahtar boş)')
  const q = encodeURIComponent(since || '1970-01-01T00:00:00.000Z')
  const { status, json } = await istek('GET', `${url}/kargo/durumlar?since=${q}&limit=500`, anahtar)
  if (status !== 200) throw new Error(`Worker durum çekme hatası (HTTP ${status})${json?.hata ? ': ' + json.hata : ''}`)
  return { kayitlar: json?.kayitlar || [], imlec: json?.imlec || since || '' }
}

/** Sağlık kontrolü — Ayarlar ekranındaki "Bağlantıyı test et" için. */
async function saglik() {
  const { url, anahtar, acik } = ayar()
  if (!acik) return { ok: false, hata: 'Worker adresi veya anahtar girilmemiş' }
  try {
    const { status, json } = await istek('GET', `${url}/saglik`, anahtar)
    if (status !== 200) return { ok: false, hata: `HTTP ${status}` }
    // Token yanlışsa Worker yine 200 döner ama ayrıntı VERMEZ (açık uçtan iş hacmi
    // sızdırmamak için). Ayrıntının yokluğu = anahtar tutmadı.
    if (json?.izlenenToplam === undefined) return { ok: false, hata: 'Paylaşılan anahtar geçersiz' }
    return { ok: true, ...json }
  } catch (e) {
    return { ok: false, hata: e.message }
  }
}

module.exports = {
  // '_' önekliler IPC kanalı sayılmaz (main.js:304) — takip.js bunları doğrudan çağırır.
  _ayar: ayar,
  _itListe: itListe,
  _durumlariCek: durumlariCek,
  _saglik: saglik,

  // Ayarlar ekranındaki "Bağlantıyı Test Et" düğmesi.
  'ups:bulut-test': async () => saglik(),
}
