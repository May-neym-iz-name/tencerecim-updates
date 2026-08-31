// Fatura alt sisteminin Supabase yazma yolu.
// NEDEN AYRI: fatura tabloları senkron motoruna GİRMEZ (son-yazan-kazanır bayat
// bakiyeyi buluta yazardı). Bu modül doğrudan REST/RPC konuşur.
//
// NEDEN https.request (fetch DEĞİL): Electron 22'nin ana sürecinde Node 16.17
// çalışır, global fetch Node 18'de geldi — main process'te fetch YOK. Desen
// oturum-canli.js'teki istek()'ten alındı.
const https = require('https')
const { SUPABASE_URL, SUPABASE_KEY } = require('../oturum-canli')

const ZAMAN_ASIMI_MS = 20000

class FaturaHatasi extends Error {
  constructor(mesaj, kod, ayrinti, status) {
    super(mesaj)
    this.name = 'FaturaHatasi'
    this.kod = kod            // 'cakisma' | 'yetersiz_stok' | 'dogrulama' | 'ag' | 'bilinmeyen' | 'oturum'
    this.ayrinti = ayrinti
    this.status = status
  }
}

function basliklar(jwt, postMu) {
  if (!jwt) throw new FaturaHatasi('Oturum bulunamadı, fatura işlemi yapılamaz', 'oturum', null, null)
  const h = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${jwt}`,
    'Accept': 'application/json',
  }
  if (postMu) h['Content-Type'] = 'application/json'
  return h
}

// Postgres hata kodunu bizim sınıfımıza çevirir.
// Sınıflandırma sırası: cakisma > yetersiz_stok/dogrulama > oturum > ag (belirsiz) > bilinmeyen
function hataSinifla(govde, status) {
  if (govde?.code === '23505') return 'cakisma'
  // İki ayrı iş hatası — aynı koda düşürülürse tüketici ham Postgres metnini
  // yeniden ayrıştırmak zorunda kalır (kod alanının varlık sebebini iptal eder).
  if (typeof govde?.message === 'string' && govde.message.includes('YETERSIZ_STOK')) {
    return 'yetersiz_stok'
  }
  if (typeof govde?.message === 'string' && govde.message.includes('SATIR_TOPLAM_UYUSMUYOR')) {
    return 'dogrulama'
  }
  // Jeton süresi dolmuş/geçersiz — main'in kendi jetonu tazelemesi lazım, kullanıcı
  // ham "JWT expired" görmemeli (bkz. task-5 incelemesi bulgu 6).
  if (status === 401) return 'oturum'
  // 5xx veya gövde ayrıştırılamadı → sonuç belirsiz, telafi yapma
  if (status >= 500 || govde == null) return 'ag'
  return 'bilinmeyen'
}

// Kullanıcıya gösterilecek Türkçe mesaj. 'oturum' özel karşılanır: ham sunucu
// metni ("JWT expired") yerine anlaşılır bir yönlendirme gösterilir.
function mesajUret(kod, mesajHam) {
  if (kod === 'oturum') return 'Oturumunuz sona erdi, lütfen tekrar giriş yapın'
  return 'Sunucu hatası: ' + mesajHam
}

// Ortak https isteği: yol + method + başlıklar + (opsiyonel) gövde.
// Çözümlenen değer { status, govde } — govde JSON ayrıştırılamazsa null.
// Zaman aşımı ve ağ hatası AYNI şekilde reddedilir ('ag' koduyla main tarafta
// sınıflanır) — ikisi de "sunucuya ulaşamadım" demek.
function istekYap(yol, method, headers, gövdeMetni) {
  return new Promise((cozumle, reddet) => {
    const url = new URL(yol, SUPABASE_URL)
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers,
        timeout: ZAMAN_ASIMI_MS,
      },
      (res) => {
        let ham = ''
        res.on('data', (p) => { ham += p })
        res.on('end', () => {
          let govde = null
          try { govde = ham ? JSON.parse(ham) : null } catch { govde = null }
          cozumle({ status: res.statusCode, govde })
        })
      },
    )
    req.on('timeout', () => {
      req.destroy(new Error('Sunucu zamanında yanıt vermedi'))
    })
    req.on('error', (e) => {
      const zamanAsimiMi = e.message === 'Sunucu zamanında yanıt vermedi'
      const mesaj = zamanAsimiMi ? e.message : 'Sunucuya ulaşılamadı: ' + e.message
      reddet(new FaturaHatasi(mesaj, 'ag', e, null))
    })
    if (gövdeMetni != null) req.write(gövdeMetni)
    req.end()
  })
}

async function rpc(ad, govde, jwt) {
  // jwt kontrolü önce — oturum hatası doğrudan throw olsun
  const basliklar_ = basliklar(jwt, true)
  const gövdeMetni = JSON.stringify(govde || {})
  const { status, govde: veri } = await istekYap(`/rest/v1/rpc/${ad}`, 'POST', basliklar_, gövdeMetni)
  if (status < 200 || status >= 300) {
    const mesajHam = veri?.message || 'Sunucu hatası'
    const kod = hataSinifla(veri, status)
    throw new FaturaHatasi(mesajUret(kod, mesajHam), kod, veri, status)
  }
  return veri
}

/**
 * Supabase REST SELECT sorgusu (okuma).
 * @param {string} tablo - Tablo adı
 * @param {string} sorgu - URL sorgu dizesi (kaçırma sorumluluğu çağırana ait)
 * @param {string} jwt - Kimlik doğrulama tokeni
 * @returns {Promise<Array>} Sonuç satırları
 */
async function sec(tablo, sorgu, jwt) {
  // jwt kontrolü önce — oturum hatası doğrudan throw olsun
  const basliklar_ = basliklar(jwt, false)
  const { status, govde: veri } = await istekYap(`/rest/v1/${tablo}?${sorgu}`, 'GET', basliklar_, null)
  if (status < 200 || status >= 300) {
    const mesajHam = veri?.message || 'Sunucu hatası'
    const kod = hataSinifla(veri, status)
    throw new FaturaHatasi(mesajUret(kod, mesajHam), kod, veri, status)
  }
  return veri
}

module.exports = { rpc, sec, FaturaHatasi }
