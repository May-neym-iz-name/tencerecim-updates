// Yetki (izin) hesaplama mantığı — rol varsayılanları + kullanıcıya özel override'lar.
// NOT: electron/yetki.js (main process, CJS) ile AYNI mantık; iki liste birebir aynı
// tutulmalı. (2026-07-17'de kaymışlardı: burada sosyal_medya_yonet vardı, orada yoktu →
// personel sekmeyi görüyor ama kaydedince "yetkiniz yok" yiyordu.)

// Personel rolünün varsayılan açık yetkileri
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
  // 'sosyal_otomasyon_yonet' BİLEREK yok — bkz. electron/yetki.js'teki aynı not.
  'sosyal_medya_yonet',
  // 'on_siparis_yap' BİLEREK yok — bkz. electron/yetki.js'teki aynı not.
  'fatura_stok_goruntule',
  // 'fatura_kes' BİLEREK yok — e-fatura/e-arşiv'e geri alınamaz fatura kesiyor;
  // sağlayıcı API'sinde fatura silme uç noktası yok. Yönetici onayı zorunlu.
  // 'fatura_stok_duzenle' BİLEREK yok — muhasebesel stok bakiyesini değiştirir,
  // yanlış kullanımda fatura stoğu sessizce bozulur — kime açılacağına yönetici karar verir.
])

/**
 * Kullanıcının belirli bir yetkisi var mı?
 * Öncelik: kullanıcıya özel izinler (override) > rol varsayılanı.
 */
export function yetkiVar(profil, kod) {
  if (!profil || !profil.aktif) return false

  // Kullanıcıya özel override (true/false) varsa onu uygula
  const ozel = profil.izinler
  if (ozel && Object.prototype.hasOwnProperty.call(ozel, kod)) {
    return !!ozel[kod]
  }

  switch (profil.rol) {
    case 'super_admin':
      return true
    case 'yonetici':
      return kod !== 'kullanici_yonetimi'
    case 'personel':
      return PERSONEL_VARSAYILAN.has(kod)
    case 'ozel':
      return false // tamamen override'lara bağlı
    default:
      return false
  }
}

/**
 * Kullanıcı bu lokasyona erişebilir mi?
 * izinli_lokasyonlar null/boş => tüm lokasyonlar.
 */
export function lokasyonErisim(profil, lokasyonId) {
  if (!profil || !profil.aktif) return false
  if (profil.rol === 'super_admin') return true
  const list = profil.izinli_lokasyonlar
  if (!list || list.length === 0) return true
  return list.includes(Number(lokasyonId))
}

/** Kullanıcının erişebildiği lokasyonları filtreler. */
export function erisilebilirLokasyonlar(profil, lokasyonlar) {
  if (!profil) return []
  if (profil.rol === 'super_admin') return lokasyonlar
  const list = profil.izinli_lokasyonlar
  if (!list || list.length === 0) return lokasyonlar
  return lokasyonlar.filter(l => list.includes(Number(l.id)))
}
