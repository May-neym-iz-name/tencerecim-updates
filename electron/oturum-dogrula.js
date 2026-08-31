// OTURUM DOĞRULAMA — main process tarafı
//
// SORUN (2026-07-18 kod incelemesinde tespit edildi, o gün kapatılamadı):
// Renderer, `auth:profil-ayarla` ile main'e `{rol, izinler, aktif}` NESNESİ
// gönderiyordu ve main ona koşulsuz güveniyordu. Yani renderer'a erişebilen
// biri (DevTools, enjekte edilmiş kod, kötü niyetli eklenti) tek satırla
// `{rol:'super_admin'}` gönderip TÜM müşteri verisine ve API secret'larına
// ulaşabiliyordu. DevTools'u kapatmak yalnızca ilk bariyerdi.
//
// ÇÖZÜM: Renderer artık bir İDDİA değil, bir KANIT gönderir — Supabase
// access_token'ı. Main bu jetonla Supabase'e kendisi sorar ve rolü
// `profiles` tablosundan kendisi okur. Renderer'ın söylediği hiçbir yetki
// alanı okunmaz.
//
// ÇEVRİMDIŞI: Mağaza kasası internet kesintisinde durmamalı. Bu yüzden başarılı
// her doğrulama şifreli olarak yerelde saklanır ve internet yokken en fazla
// 12 SAAT kullanılabilir. Önbellek yalnızca aynı kullanıcı için geçerlidir ve
// çevrimdışı kullanım süreyi UZATMAZ — aksi halde hiç internete çıkmayan bir
// makine sonsuza dek eski yetkiyle çalışırdı.

const ONBELLEK_OMRU_MS = 12 * 60 * 60 * 1000

/**
 * JWT payload'ındaki `sub` (kullanıcı id) alanını okur.
 * İMZA DOĞRULANMAZ — bu değer yalnızca "elimdeki önbellek bu kullanıcıya mı
 * ait?" sorusunu yanıtlamak için kullanılır. Önbelleğin kendisi zaten gerçek
 * bir Supabase doğrulamasından sonra yazılmıştır.
 */
function jwtSub(token) {
  if (typeof token !== 'string') return null
  const parcalar = token.split('.')
  if (parcalar.length !== 3) return null
  try {
    const govde = JSON.parse(Buffer.from(parcalar[1], 'base64url').toString('utf8'))
    return govde && typeof govde.sub === 'string' ? govde.sub : null
  } catch {
    return null
  }
}

/**
 * Doğrulayıcı üretir. Tüm dış dünya bağımlılıkları enjekte edilir; böylece
 * test gerçek ağ/Electron olmadan davranışı sınayabilir.
 *
 * @param {object} b
 * @param {(yol:string, token:string)=>Promise<{durum:number,govde:any}>} b.istek
 * @param {()=>({uid:string,profil:object,dogrulanma:number}|null)} b.onbellekOku
 * @param {(v:object)=>void} b.onbellekYaz
 * @param {()=>void} b.onbellekSil
 * @param {()=>number} b.simdi
 * @returns {(token:string)=>Promise<{profil:object,kaynak:'supabase'|'onbellek'}|null>}
 */
function olusturDogrulayici({ istek, onbellekOku, onbellekYaz, onbellekSil, simdi }) {
  return async function dogrula(token) {
    // Renderer eski API'yi taklit edip profil nesnesi gönderirse burada durur.
    if (typeof token !== 'string' || !token) return null

    let uidCevrimici = null
    let epostaCevrimici = null
    let profil = null

    try {
      const kullanici = await istek('/auth/v1/user', token)
      if (kullanici.durum === 401 || kullanici.durum === 403) {
        // Jeton gerçekten geçersiz — çevrimdışı önbellek de artık güvenilmez.
        onbellekSil()
        return null
      }
      if (kullanici.durum !== 200 || !kullanici.govde || !kullanici.govde.id) {
        return null
      }
      uidCevrimici = kullanici.govde.id
      // E-posta yalnızca denetim kaydı için (KVKK: kim dışa aktardı).
      epostaCevrimici = kullanici.govde.email || null

      const yol = `/rest/v1/profiles?id=eq.${encodeURIComponent(uidCevrimici)}` +
        '&select=rol,izinler,izinli_lokasyonlar,aktif'
      const satirlar = await istek(yol, token)
      if (satirlar.durum !== 200 || !Array.isArray(satirlar.govde) || !satirlar.govde.length) {
        return null
      }
      profil = satirlar.govde[0]
    } catch {
      // AĞ HATASI (istek fırlattı) — çevrimdışı yola düş.
      return cevrimdisi(token)
    }

    if (!profil || !profil.aktif) return null

    onbellekYaz({ uid: uidCevrimici, eposta: epostaCevrimici, profil, dogrulanma: simdi() })
    return { profil, uid: uidCevrimici, eposta: epostaCevrimici, kaynak: 'supabase' }
  }

  function cevrimdisi(token) {
    const onbellek = onbellekOku()
    if (!onbellek || !onbellek.profil || !onbellek.uid) return null

    // Başka bir personelin önbelleğiyle giriş yapılamaz.
    if (onbellek.uid !== jwtSub(token)) return null

    if (simdi() - onbellek.dogrulanma > ONBELLEK_OMRU_MS) return null
    if (!onbellek.profil.aktif) return null

    // BİLEREK tazelemiyoruz: çevrimdışı kullanım süreyi uzatmamalı.
    return {
      profil: onbellek.profil,
      uid: onbellek.uid,
      eposta: onbellek.eposta || null,
      kaynak: 'onbellek',
    }
  }
}

module.exports = { olusturDogrulayici, jwtSub, ONBELLEK_OMRU_MS }
