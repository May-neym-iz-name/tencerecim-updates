// İNDÜKSİYON VERİ HARİTASI YÜKLEYİCİ
//
// Bundled seed (induksiyon-veri.json) + kullanıcı verisi (userData/induksiyon-veri.json)
// birleştirilir; kullanıcı verisi seed'i geçersiz kılar. Böylece yeni doğrulamalar
// kod sürümü beklemeden eklenebilir. Eşleşme yoksa 'bilinmiyor' → rozet yazılmaz.

const fs = require('fs')
const path = require('path')

function seedYukle() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'induksiyon-veri.json'), 'utf8')) }
  catch { return { urunler: {}, markalar: {}, modeller: [] } }
}

function kullaniciDosyaYolu() {
  try {
    const { app } = require('electron')
    return path.join(app.getPath('userData'), 'induksiyon-veri.json')
  } catch { return null }
}

function kullaniciYukle() {
  const p = kullaniciDosyaYolu()
  if (!p) return null
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null }
}

// induksiyonDurum'un beklediği biçimde birleşik harita döndürür:
//   { [urunId]: 'evet'|'hayir', markalar: {...}, modeller: [{eslesme,durum}] }
function harita() {
  const s = seedYukle()
  const k = kullaniciYukle() || {}
  return {
    ...(s.urunler || {}), ...(k.urunler || {}),
    markalar: { ...(s.markalar || {}), ...(k.markalar || {}) },
    modeller: [...(k.modeller || []), ...(s.modeller || [])], // kullanıcı önce (öncelik)
  }
}

module.exports = { harita, seedYukle }
