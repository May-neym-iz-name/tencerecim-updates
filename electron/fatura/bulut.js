// Fatura alt sisteminin Supabase yazma yolu.
// NEDEN AYRI: fatura tabloları senkron motoruna GİRMEZ (son-yazan-kazanır bayat
// bakiyeyi buluta yazardı). Bu modül doğrudan REST/RPC konuşur.
const { SUPABASE_URL, SUPABASE_KEY } = require('../oturum-canli')

const ZAMAN_ASIMI_MS = 20000

class FaturaHatasi extends Error {
  constructor(mesaj, kod, ayrinti, status) {
    super(mesaj)
    this.name = 'FaturaHatasi'
    this.kod = kod            // 'cakisma' | 'yetersiz_stok' | 'ag' | 'bilinmeyen' | 'oturum'
    this.ayrinti = ayrinti
    this.status = status
  }
}

function basliklar(jwt) {
  if (!jwt) throw new FaturaHatasi('Oturum bulunamadı, fatura işlemi yapılamaz', 'oturum', null, null)
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  }
}

// Postgres hata kodunu bizim sınıfımıza çevirir.
// Sınıflandırma sırası: cakisma > yetersiz_stok > oturum > ag (belirsiz) > bilinmeyen
function hataSinifla(govde, status) {
  if (govde?.code === '23505') return 'cakisma'
  if (typeof govde?.message === 'string' && (govde.message.includes('YETERSIZ_STOK') || govde.message.includes('SATIR_TOPLAM_UYUSMUYOR'))) {
    return 'yetersiz_stok'
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

async function rpc(ad, govde, jwt) {
  // jwt kontrolü try dışında — oturum hatası doğrudan throw olsun
  const basliklar_ = basliklar(jwt)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ZAMAN_ASIMI_MS)
  let yanit
  try {
    yanit = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${ad}`, {
      method: 'POST', headers: basliklar_, body: JSON.stringify(govde || {}), signal: controller.signal,
    })
  } catch (e) {
    // Hem AbortError (zaman aşımı) hem gerçek ağ hatası — sonuç belirsiz, telafi yapma
    const mesaj = e.name === 'AbortError' ? 'Sunucu zamanında yanıt vermedi' : 'Sunucuya ulaşılamadı: ' + e.message
    throw new FaturaHatasi(mesaj, 'ag', e, null)
  } finally {
    clearTimeout(timeoutId)
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) {
    const mesajHam = veri?.message || 'Sunucu hatası'
    const kod = hataSinifla(veri, yanit.status)
    throw new FaturaHatasi(mesajUret(kod, mesajHam), kod, veri, yanit.status)
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
  // jwt kontrolü try dışında — oturum hatası doğrudan throw olsun
  const basliklar_ = basliklar(jwt)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ZAMAN_ASIMI_MS)
  let yanit
  try {
    yanit = await fetch(`${SUPABASE_URL}/rest/v1/${tablo}?${sorgu}`, { headers: basliklar_, signal: controller.signal })
  } catch (e) {
    // Hem AbortError (zaman aşımı) hem gerçek ağ hatası — sonuç belirsiz, telafi yapma
    const mesaj = e.name === 'AbortError' ? 'Sunucu zamanında yanıt vermedi' : 'Sunucuya ulaşılamadı: ' + e.message
    throw new FaturaHatasi(mesaj, 'ag', e, null)
  } finally {
    clearTimeout(timeoutId)
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) {
    const mesajHam = veri?.message || 'Sunucu hatası'
    const kod = hataSinifla(veri, yanit.status)
    throw new FaturaHatasi(mesajUret(kod, mesajHam), kod, veri, yanit.status)
  }
  return veri
}

module.exports = { rpc, sec, FaturaHatasi }
