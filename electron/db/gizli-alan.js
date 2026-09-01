// YEREL VERİTABANINDAKİ SECRET'LARIN ŞİFRELENMESİ
//
// Sorun: userData/tencerecim.db düz SQLite. İçinde ikas client_secret, UPS
// şifresi ve Meta sayfa token'ı düz metin duruyordu. Bilgisayar çalınır ya da
// dosya kopyalanırsa hepsi okunabilir.
//
// Çözüm: bu alanlar DİSKTE Windows DPAPI (Electron safeStorage) ile şifrelenir.
// DPAPI anahtarı Windows kullanıcısına bağlıdır — dosya başka bir makineye
// kopyalanırsa çözülemez.
//
// ⚠️ KRİTİK TUZAK: ikas_ayarlar ve ups_ayarlar Supabase'e SENKRONLANIYOR
// (ayar-senk.js). Şifreli değer buluta giderse diğer PC onu ASLA çözemez ve
// entegrasyonlar sessizce ölür. Bu yüzden:
//   - Şifreleme yalnızca diskte olur.
//   - TÜM okuma yolları coz() ile geçer, yani uygulama hep düz metin görür.
//   - Buluta giden değer de bu yüzden düz metindir (bulut RLS ile korunur).
//
// Şifrelenecek alanlar bilerek DAR tutulur: gereksiz her alan senkron kırma
// riskini artırır, güvenlik kazancı ise sıfırdır.

const ONEK = 'gzl1:'

// Tablo -> şifrelenecek anahtarlar. Yalnızca GERÇEK secret'lar.
// store_name, client_id, kullanici_kodu gibi tanımlayıcılar bilerek dışarıda:
// tek başlarına erişim vermezler.
const HASSAS_ANAHTARLAR = {
  ikas_ayarlar: ['client_secret'],
  ups_ayarlar: ['sifre'],
  meta_ayarlar: ['app_secret', 'sayfa_token'],
  // firm_id de secret: addinvoice'un TEK kimlik dogrulamasi odur — eline gecen
  // herkes bizim hesabimiza fatura kesebilir.
  fatura_ayarlar: ['firm_id', 'token'],
}

function sifreliMi(deger) {
  return typeof deger === 'string' && deger.startsWith(ONEK)
}

/**
 * Düz metni şifreler. Zaten şifreliyse dokunmaz (çift şifreleme = veri kaybı).
 * Şifreleme kullanılamıyorsa değeri OLDUĞU GİBİ döndürür — kullanıcının
 * ayarını kaybetmektense düz saklamak yeğdir.
 */
function sifrele(duz, kripto) {
  if (!duz || typeof duz !== 'string') return duz
  if (sifreliMi(duz)) return duz
  if (!kripto.kullanilabilir()) return duz
  try {
    return ONEK + kripto.sifrele(duz).toString('base64')
  } catch {
    return duz
  }
}

/**
 * Şifreliyse çözer. Düz metinse olduğu gibi döner (geçiş dönemi: henüz
 * şifrelenmemiş satırlar okunabilir kalmalı).
 * Çözülemezse (dosya başka PC'den geldi) BOŞ döner — yanlış/bozuk bir secret'la
 * API'ye gitmektense "ayar girilmemiş" davranışı doğrudur.
 */
function coz(deger, kripto) {
  if (!sifreliMi(deger)) return deger
  try {
    return kripto.coz(Buffer.from(deger.slice(ONEK.length), 'base64'))
  } catch {
    return ''
  }
}

/** Bir anahtar-değer objesindeki hassas alanları çözer (okuma yolu). */
function objeCoz(tablo, obj, kripto) {
  const anahtarlar = HASSAS_ANAHTARLAR[tablo] || []
  if (!anahtarlar.length) return obj
  const kopya = { ...obj }
  for (const a of anahtarlar) {
    if (a in kopya) kopya[a] = coz(kopya[a], kripto)
  }
  return kopya
}

/** Tek bir anahtar-değer çiftini yazmadan önce şifreler (yazma yolu). */
function yazmaDegeri(tablo, anahtar, deger, kripto) {
  const anahtarlar = HASSAS_ANAHTARLAR[tablo] || []
  return anahtarlar.includes(anahtar) ? sifrele(deger, kripto) : deger
}

/**
 * Tek seferlik geçiş: tablodaki düz metin secret'ları şifreler.
 * Kaç satır şifrelendiğini döner. Tekrar çalıştırmak güvenlidir (önek kontrolü).
 */
function tabloyuSifrele(db, tablo, kripto) {
  const anahtarlar = HASSAS_ANAHTARLAR[tablo] || []
  if (!anahtarlar.length || !kripto.kullanilabilir()) return 0

  const yerTutucu = anahtarlar.map(() => '?').join(',')
  const satirlar = db
    .prepare(`SELECT anahtar, deger FROM ${tablo} WHERE anahtar IN (${yerTutucu})`)
    .all(...anahtarlar)

  const guncelle = db.prepare(`UPDATE ${tablo} SET deger = ? WHERE anahtar = ?`)
  let sayi = 0
  for (const s of satirlar) {
    if (!s.deger || sifreliMi(s.deger)) continue
    const yeni = sifrele(s.deger, kripto)
    if (yeni === s.deger) continue // şifreleme başarısız — dokunma
    guncelle.run(yeni, s.anahtar)
    sayi++
  }
  return sayi
}

/** Tüm hassas tabloları geçirir; { tablo: sayi } döner. */
function tumunuSifrele(db, kripto) {
  const sonuc = {}
  for (const tablo of Object.keys(HASSAS_ANAHTARLAR)) {
    try {
      sonuc[tablo] = tabloyuSifrele(db, tablo, kripto)
    } catch {
      // Tablo henüz yoksa (eski DB) sessizce geç.
      sonuc[tablo] = 0
    }
  }
  return sonuc
}

module.exports = {
  ONEK,
  HASSAS_ANAHTARLAR,
  sifreliMi,
  sifrele,
  coz,
  objeCoz,
  yazmaDegeri,
  tabloyuSifrele,
  tumunuSifrele,
}
