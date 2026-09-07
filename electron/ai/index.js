// Yapay zeka modülü — IPC kanalları.
//
// Üretilen metin DOĞRUDAN YAYINLANMAZ: 'temiz' bayrağı ve bulgularla birlikte
// döner, göndermeye arayüz (ve kullanıcı) karar verir. Bkz. yorum-yanit.js.
const yorumYanit = require('./yorum-yanit')
const { _hazirMi } = require('../db/ai-ayarlar')

module.exports = {
  // Ucuz: ağa çıkmaz, anahtar girilmiş mi ona bakar.
  'ai:hazir': () => ({ hazir: _hazirMi() }),

  // Bir YouTube yorumuna yanıt önerisi üretir.
  'ai:yorumYanitOner': (p) => yorumYanit.yanitOner(p || {}),
}
