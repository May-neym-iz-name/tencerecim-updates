// Arka uç (main process) yetki kontrolü.
//
// Renderer giriş yaptığında buraya SADECE Supabase access_token'ını gönderir
// (auth:profil-ayarla). Rol ve izinler renderer'dan DEĞİL, o jetonla Supabase
// `profiles` tablosundan main tarafında okunur — bkz. oturum-dogrula.js.
// Eskiden renderer `{rol:'super_admin'}` diyebiliyordu ve main ona inanıyordu.
//
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
  'online_siparis_goruntule',
  'bildirim_goruntule',
  'kasa_kullan',
  // Personel sosyal medyayı kullanabilir (yorum/DM görüntüleme + elle cevap).
  // 'sosyal_otomasyon_yonet' BİLEREK yok: otomasyon tek tıkla yüzlerce kişiye DM
  // gönderir, o yüzden varsayılan kapalı — kime açılacağına yönetici karar verir.
  'sosyal_medya_yonet',
  // 'on_siparis_yap' BİLEREK yok: ön sipariş stok yeterlilik kontrolünü ATLAR
  // (stokta olmayan ürün satılır). Yanlış kullanılırsa stok güvenilirliği sessizce
  // bozulur — kime açılacağına yönetici karar verir.
  // Fatura yetkileri
  'fatura_stok_goruntule',
  'fatura_stok_duzenle',
  'fatura_kes',
])

// Supabase'den DOĞRULANMIŞ aktif kullanıcı profili (rol + izinler + izinli_lokasyonlar).
let aktifProfil = null
// Denetim kaydı için kimlik (KVKK: kim dışa aktardı). Yetkiyi etkilemez.
let aktifKimlik = { uid: null, eposta: null }

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

// Kodlardan HERHANGİ BİRİ varsa geçer (OR). Örn. kargo durumunu hem "ön sipariş yapabilen"
// hem de "kargo yönetebilen" personel işaretleyebilsin — kargoyu oluşturan kişi durumunu da
// yazabilmeli, aksi halde kargo çıkar ama sipariş "Bekliyor"da sessizce kalır.
function yetkiKontrolBirden(kodlar) {
  if (!kodlar.some((kod) => yetkiVar(aktifProfil, kod))) {
    throw new Error('Bu işlem için yetkiniz yok')
  }
}

module.exports = {
  // IPC dışı yardımcılar (main.js _ önekli kanalları atlar).
  _yetkiKontrol: yetkiKontrol,
  _yetkiKontrolBirden: yetkiKontrolBirden,
  _lokasyonKontrol: lokasyonKontrol,

  // SADECE TEST İÇİN. Doğrulamayı atlayarak profil yazar; yetki paritesi testi
  // (src/auth/yetki-paritesi.test.js) iki tarafın aynı cevabı verdiğini böyle
  // ölçer. `_` önekli kanallar main.js tarafından IPC'ye HİÇ kaydedilmez, yani
  // renderer bunu çağıramaz — gerçek yol her zaman auth:profil-ayarla'dır.
  _profilYazTestIcin: (profil) => { aktifProfil = profil || null },

  // Denetim kaydı için: o an giriş yapmış kullanıcının kimliği.
  _aktifKimlik: () => aktifKimlik,

  // Girdi: { access_token }. Profil BURADAN gelmez — Supabase'den doğrulanır.
  // Doğrulanamazsa aktifProfil null kalır, yani hiçbir yetki yoktur.
  'auth:profil-ayarla': async (girdi) => {
    const token = girdi && typeof girdi === 'object' ? girdi.access_token : girdi
    const { dogrula } = require('./oturum-canli')
    const sonuc = await dogrula(typeof token === 'string' ? token : null)
    aktifProfil = sonuc ? sonuc.profil : null
    aktifKimlik = sonuc ? { uid: sonuc.uid || null, eposta: sonuc.eposta || null } : { uid: null, eposta: null }
    return {
      ok: !!sonuc,
      // Renderer bu bilgiyi kullanıcıya "çevrimdışı moddasınız" uyarısı
      // göstermek için kullanır; yetkiyi etkilemez.
      kaynak: sonuc ? sonuc.kaynak : null,
    }
  },

  'auth:profil-temizle': () => {
    aktifProfil = null
    aktifKimlik = { uid: null, eposta: null }
    // Çıkış yapan kullanıcının çevrimdışı önbelleği de düşsün: aksi halde
    // internet kesikken 12 saat boyunca onun yetkisiyle girilebilirdi.
    try { require('./oturum-canli').onbellekSil() } catch { /* test ortami */ }
    return { ok: true }
  },
}
