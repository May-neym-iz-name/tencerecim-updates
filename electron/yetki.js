// Arka uç (main process) yetki kontrolü.
// Renderer giriş yaptığında aktif profili buraya gönderir (auth:profil-ayarla).
// Hassas IPC handler'ları yetkiKontrol/lokasyonKontrol ile korunur — savunma derinliği.
// NOT: src/auth/izinler.js (frontend ESM) ile AYNI mantık; burada CJS kopyası tutulur.

// Personel rolünün varsayılan açık yetkileri (izinler.js ile birebir aynı tutulmalı)
const PERSONEL_VARSAYILAN = new Set([
  'satis_yap',
  'satis_gecmisi_goruntule',
  'urun_goruntule',
  'stok_goruntule',
  'stok_sayim',
  'musteri_goruntule',
  'musteri_duzenle',
  'kargo_yonet',
])

// Renderer'dan gelen aktif kullanıcı profili (rol + izinler + izinli_lokasyonlar).
let aktifProfil = null

function yetkiVar(profil, kod) {
  if (!profil || !profil.aktif) return false
  const ozel = profil.izinler
  if (ozel && Object.prototype.hasOwnProperty.call(ozel, kod)) return !!ozel[kod]
  switch (profil.rol) {
    case 'super_admin': return true
    case 'yonetici': return kod !== 'kullanici_yonetimi'
    case 'personel': return PERSONEL_VARSAYILAN.has(kod)
    case 'ozel': return false
    default: return false
  }
}

function lokasyonErisim(profil, lokasyonId) {
  if (!profil || !profil.aktif) return false
  if (profil.rol === 'super_admin') return true
  const list = profil.izinli_lokasyonlar
  if (!list || list.length === 0) return true
  return list.includes(Number(lokasyonId))
}

// Yetki yoksa hata fırlatır (main.js sarmalayıcısı bunu {ok:false} olarak renderer'a iletir).
function yetkiKontrol(kod) {
  if (!yetkiVar(aktifProfil, kod)) {
    throw new Error('Bu işlem için yetkiniz yok')
  }
}

function lokasyonKontrol(lokasyonId) {
  if (!lokasyonErisim(aktifProfil, lokasyonId)) {
    throw new Error('Bu lokasyonda işlem yapma yetkiniz yok')
  }
}

module.exports = {
  // IPC dışı yardımcılar (main.js _ önekli kanalları atlar).
  _yetkiKontrol: yetkiKontrol,
  _lokasyonKontrol: lokasyonKontrol,

  'auth:profil-ayarla': (profil) => { aktifProfil = profil || null; return { ok: true } },
  'auth:profil-temizle': () => { aktifProfil = null; return { ok: true } },
}
