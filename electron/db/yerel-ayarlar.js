// BU PC'YE ÖZEL anahtar-değer deposu.
//
// ups_ayarlar / ikas_ayarlar / uygulama_ayarlar PC'ler arası senkronlanır (ayar-senk.js).
// Buradakiler senkronlanMAZ. Cihaza bağlı olan, diğer PC'de anlamı olmayan ya da
// PC başına ayrı ilerlemesi gereken değerler buraya yazılır.
//
// DİKKAT: buraya yazdığın bir anahtarı sonradan ayar-senk.js'e eklemek, o anahtarın
// tüm PC'lerde tek değere çökmesi demektir — imleç türü değerlerde bu sessiz veri
// kaybı üretir. Ekleme kararını verirken "her PC'de farklı olması gerekiyor mu?" diye sor.
const { getDb } = require('./database')

/** @returns {string} kayıt yoksa varsayilan */
function getir(anahtar, varsayilan = '') {
  const s = getDb().prepare('SELECT deger FROM yerel_ayarlar WHERE anahtar = ?').get(anahtar)
  return s?.deger ?? varsayilan
}

function yaz(anahtar, deger) {
  getDb().prepare(
    'INSERT INTO yerel_ayarlar (anahtar, deger) VALUES (?, ?) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  ).run(anahtar, deger === null || deger === undefined ? '' : String(deger))
}

module.exports = { _getir: getir, _yaz: yaz }
