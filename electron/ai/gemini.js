// Gemini istemcisi — metin üretimi.
//
// MODEL SIRASI: en güçlüden en zayıfa denenir ve yoğunlukta alt basamağa düşülür.
// Ölçüm (2026-09-07, YouTube açıklama üretiminde): en yeni model sürekli 503
// döndürüyor, işi pratikte gemini-3.5-flash yapıyor. Tek modele saplanmak
// "yapay zeka çalışmıyor" gibi görünen bir arıza üretiyordu.
//
// GEÇİCİ / KALICI ayrımı indir.js ile aynı disiplinde: yoğunluk (503) ve hız
// sınırı (429) alt modele geçmeyi hak eder; bozuk anahtar (401/403) ve geçersiz
// istek (400) HER modelde aynı sonucu verir, denemek boşuna beklemedir.
const https = require('https')

const HOST = 'generativelanguage.googleapis.com'
const MODELLER = ['gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-3.5-flash']
const ZAMAN_ASIMI_MS = 60000

/** Bu durum kodunda ALT MODELE geçmeye değer mi? */
function alttakiniDene(durum) {
  return durum === 503 || durum === 429 || durum === 500 || durum >= 502
}

/** Yanıttan metni çıkarır. Model bazen parçalı döner, hepsi birleştirilir. */
function metinCikar(cevap) {
  const aday = cevap && cevap.candidates && cevap.candidates[0]
  if (!aday) return ''
  // Güvenlik süzgecine takılan yanıtta content HİÇ gelmez, yalnız finishReason olur.
  // Boş string dönmek doğru: çağıran "üretilemedi" der, boş metin göndermez.
  const parcalar = (aday.content && aday.content.parts) || []
  return parcalar.map(p => p.text || '').join('').trim()
}

function istekYap({ model, anahtar, govde }) {
  return new Promise((resolve, reject) => {
    const veri = JSON.stringify(govde)
    const istek = https.request({
      host: HOST,
      method: 'POST',
      path: `/v1beta/models/${model}:generateContent`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(veri),
        // Anahtar BAŞLIKTA gider, sorgu dizesinde DEĞİL: sorgu dizesi günlüklere
        // ve proxy kayıtlarına düşer.
        'x-goog-api-key': anahtar,
      },
    }, res => {
      let g = ''
      res.setEncoding('utf8')
      res.on('data', p => { g += p })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(g) } catch { /* gövde JSON değilse null kalır */ }
        resolve({ durum: res.statusCode, json, ham: g })
      })
    })
    istek.on('error', reject)
    istek.setTimeout(ZAMAN_ASIMI_MS, () => istek.destroy(new Error('Gemini zaman asimi')))
    istek.end(veri)
  })
}

/**
 * Metin üretir. Modeller sırayla denenir; yoğunlukta alt basamağa düşülür.
 * @returns {{metin: string, model: string}}
 */
async function uret({ anahtar, istem, sicaklik = 0.7, enFazlaJeton = 500, gunluk = () => {}, _istek = istekYap }) {
  if (!anahtar) throw new Error('Gemini anahtari girilmemis. Ayarlar > Yapay Zeka bolumunden girin.')
  const govde = {
    contents: [{ role: 'user', parts: [{ text: istem }] }],
    generationConfig: { temperature: sicaklik, maxOutputTokens: enFazlaJeton },
  }
  let sonHata = 'bilinmeyen hata'
  for (const model of MODELLER) {
    const c = await _istek({ model, anahtar, govde })
    if (c.durum >= 200 && c.durum < 300) {
      const metin = metinCikar(c.json)
      if (metin) return { metin, model }
      // Boş yanıt (güvenlik süzgeci vb.) — başka model farklı davranabilir.
      sonHata = 'model bos yanit dondu'
      gunluk(`${model} bos yanit dondu, alt modele geciliyor`)
      continue
    }
    const mesaj = (c.json && c.json.error && c.json.error.message) || `HTTP ${c.durum}`
    if (!alttakiniDene(c.durum)) throw new Error(`Gemini hatasi: ${mesaj}`)
    sonHata = mesaj
    gunluk(`${model} yogun (${c.durum}), alt modele geciliyor`)
  }
  throw new Error(`Gemini yanit vermedi: ${sonHata}`)
}

module.exports = { uret, metinCikar, alttakiniDene, MODELLER }
