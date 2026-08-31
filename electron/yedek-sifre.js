// PAROLALI YEDEK
//
// Yedek dosyası veritabanının birebir kopyasıdır: tüm müşteri verisi (ad,
// telefon, adres) ve API secret'ları içinde. Masaüstünde ya da USB'de şifresiz
// duran bir .db, veritabanının kendisi kadar risklidir — hatta daha fazlası,
// çünkü yedekler dolaşır.
//
// Şema (tek dosya):
//   [ 9 bayt sihirli başlık ][ 16 tuz ][ 12 IV ][ 16 GCM etiketi ][ şifreli veri ]
//
// - scrypt: paroladan anahtar türetir; kaba kuvvet denemesini pahalı kılar.
// - AES-256-GCM: hem şifreler HEM bütünlüğü doğrular; dosya bozulur ya da
//   kurcalanırsa çözme başarısız olur (sessiz bozuk geri yükleme olmaz).
// - Tuz ve IV her seferinde rastgele: aynı veri iki kez şifrelenince farklı
//   çıktı verir, yani "yedek değişmiş mi" bilgisi bile sızmaz.

const crypto = require('crypto')

const BASLIK = Buffer.from('TNCYEDEK1', 'utf8')
const TUZ_UZ = 16
const IV_UZ = 12
const ETIKET_UZ = 16
const ANAHTAR_UZ = 32
const DOSYA_UZANTISI = 'tncyedek'

// scrypt maliyeti: N=2^15 tipik bir masaüstünde ~100 ms sürer. Kullanıcı için
// fark edilmez, saldırgan için milyonlarca denemeyi imkânsız kılar.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

function anahtarTuret(parola, tuz) {
  return crypto.scryptSync(Buffer.from(parola, 'utf8'), tuz, ANAHTAR_UZ, SCRYPT)
}

function parolaDogrula(parola) {
  if (typeof parola !== 'string' || !parola.length) {
    throw new Error('Yedek parolasi bos olamaz')
  }
}

/** Bir dosyanın bizim şifreli formatımız olup olmadığını başlıktan anlar. */
function sifreliMi(buf) {
  return Buffer.isBuffer(buf) && buf.length > BASLIK.length && buf.subarray(0, BASLIK.length).equals(BASLIK)
}

/** @param {Buffer} veri @param {string} parola @returns {Buffer} */
function sifrele(veri, parola) {
  parolaDogrula(parola)
  const tuz = crypto.randomBytes(TUZ_UZ)
  const iv = crypto.randomBytes(IV_UZ)
  const anahtar = anahtarTuret(parola, tuz)
  const sifreleyici = crypto.createCipheriv('aes-256-gcm', anahtar, iv)
  const govde = Buffer.concat([sifreleyici.update(veri), sifreleyici.final()])
  return Buffer.concat([BASLIK, tuz, iv, sifreleyici.getAuthTag(), govde])
}

/** @param {Buffer} paket @param {string} parola @returns {Buffer} */
function coz(paket, parola) {
  parolaDogrula(parola)
  if (!sifreliMi(paket)) {
    throw new Error('Bu dosya sifreli bir yedek degil')
  }
  let o = BASLIK.length
  const tuz = paket.subarray(o, (o += TUZ_UZ))
  const iv = paket.subarray(o, (o += IV_UZ))
  const etiket = paket.subarray(o, (o += ETIKET_UZ))
  const govde = paket.subarray(o)

  const cozucu = crypto.createDecipheriv('aes-256-gcm', anahtarTuret(parola, tuz), iv)
  cozucu.setAuthTag(etiket)
  try {
    return Buffer.concat([cozucu.update(govde), cozucu.final()])
  } catch {
    // GCM doğrulaması yanlış parolayı da bozuk dosyayı da aynı hatayla verir;
    // kullanıcıya en olası nedeni söylüyoruz.
    throw new Error('Parola hatali ya da yedek dosyasi bozulmus')
  }
}

module.exports = { sifrele, coz, sifreliMi, DOSYA_UZANTISI, BASLIK }
