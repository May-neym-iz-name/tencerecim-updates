// GÖRSEL GÜVENCESİ (uygulama içi kopya) — kaynak: URUN-ESLESTIRME/_gorsel-guvence.js
// ikas'a ürün yazan her yolun ORTAK kapısı. saveProduct'ta variants.images TAM LİSTE
// DEĞİŞTİRMEdir; boş/eksik gönderilirse görseller SESSİZCE silinir. Kural: görsel listesi
// güvenilir okunmadıysa o ürüne HİÇ DOKUNULMAZ (fırlat, çağıran atlar).

class GorselOkunamadi extends Error {
  constructor(mesaj, baglam) {
    super(`GÖRSEL KAPISI [${baglam || 'bilinmeyen ürün'}]: ${mesaj} → ikas'a HİÇBİR ŞEY YAZILMADI.`)
    this.name = 'GorselOkunamadi'
  }
}

function denetle(ham, baglam) {
  if (!Array.isArray(ham)) {
    throw new GorselOkunamadi(`görsel listesi dizi değil (${ham === null ? 'null' : typeof ham})`, baglam)
  }
  ham.forEach((g, i) => {
    if (!g || typeof g !== 'object') throw new GorselOkunamadi(`${i}. görsel kaydı boş`, baglam)
    if (!g.imageId) throw new GorselOkunamadi(`${i}. görselin imageId'si yok`, baglam)
    if (typeof g.isMain !== 'boolean') throw new GorselOkunamadi(`${i}. görselin isMain'i okunmadı`, baglam)
    if (typeof g.order !== 'number') throw new GorselOkunamadi(`${i}. görselin order'ı okunmadı`, baglam)
  })
  return ham
}

// saveProduct / ProductImageInput biçimi (imageId ile).
function gorseller(v, baglam) {
  return denetle(v && v.images, baglam).map((g) => ({
    imageId: g.imageId,
    isMain: g.isMain,
    order: g.order,
    isVideo: g.isVideo ?? undefined,
  }))
}

// YAZMA SONRASI doğrulama: herhangi bir varyant görsel KAYBETTİYSE fırlatır.
function gorselDogrula(once, sonra, baglam) {
  const say = (u) => new Map((u?.variants || []).map((v) => [v.id, Array.isArray(v.images) ? v.images.length : null]))
  const a = say(once); const b = say(sonra)
  for (const [vid, oncekiAdet] of a) {
    if (oncekiAdet === null) continue
    const sonrakiAdet = b.get(vid)
    if (sonrakiAdet === null || sonrakiAdet === undefined) {
      throw new Error(`GÖRSEL KAYBI [${baglam}] varyant ${vid}: yazma sonrası görsel listesi okunamadı`)
    }
    if (sonrakiAdet < oncekiAdet) {
      throw new Error(`GÖRSEL KAYBI [${baglam}] varyant ${vid}: ${oncekiAdet} → ${sonrakiAdet}. ELLE geri yüklenmeli.`)
    }
  }
}

module.exports = { gorseller, gorselDogrula, GorselOkunamadi }
