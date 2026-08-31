// Fatura alt sisteminin Supabase yazma yolu.
// NEDEN AYRI: fatura tabloları senkron motoruna GİRMEZ (son-yazan-kazanır bayat
// bakiyeyi buluta yazardı). Bu modül doğrudan REST/RPC konuşur.
const { SUPABASE_URL, SUPABASE_KEY } = require('../oturum-canli')

class FaturaHatasi extends Error {
  constructor(mesaj, kod, ayrinti) {
    super(mesaj)
    this.name = 'FaturaHatasi'
    this.kod = kod            // 'cakisma' | 'yetersiz_stok' | 'ag' | 'bilinmeyen'
    this.ayrinti = ayrinti
  }
}

function basliklar(jwt) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${jwt || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

// Postgres hata kodunu bizim sınıfımıza çevirir.
function hataSinifla(govde) {
  if (govde?.code === '23505') return 'cakisma'
  if (typeof govde?.message === 'string' && govde.message.includes('YETERSIZ_STOK')) {
    return 'yetersiz_stok'
  }
  return 'bilinmeyen'
}

async function rpc(ad, govde, jwt) {
  let yanit
  try {
    yanit = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${ad}`, {
      method: 'POST', headers: basliklar(jwt), body: JSON.stringify(govde || {}),
    })
  } catch (e) {
    throw new FaturaHatasi('Sunucuya ulaşılamadı: ' + e.message, 'ag', e)
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) throw new FaturaHatasi(veri?.message || 'Sunucu hatası', hataSinifla(veri), veri)
  return veri
}

async function sec(tablo, sorgu, jwt) {
  let yanit
  try {
    yanit = await fetch(`${SUPABASE_URL}/rest/v1/${tablo}?${sorgu}`, { headers: basliklar(jwt) })
  } catch (e) {
    throw new FaturaHatasi('Sunucuya ulaşılamadı: ' + e.message, 'ag', e)
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) throw new FaturaHatasi(veri?.message || 'Sunucu hatası', hataSinifla(veri), veri)
  return veri
}

module.exports = { rpc, sec, FaturaHatasi }
