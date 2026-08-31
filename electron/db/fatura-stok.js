const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const okuma = require('../fatura/okuma')
const { eslesirMi } = require('./tr-arama')

// Fatura stoğu Supabase'de (asıl nüsha), ürün + gerçek stok yerel SQLite'ta.
// Birleştirme burada, JS tarafında yapılır. Bkz. plan Ruling-5.

// Saf birleştirme — test edilebilir olsun diye IO'dan ayrıldı. `_` önekli dışa
// aktarılır: main.js modüldeki `_` ile başlamayan HER anahtarı otomatik IPC
// kanalı olarak kaydediyor (bkz. main.js:504-506), bu saf fonksiyon renderer'a
// AÇILMAMALI.
function durumBirlestir(urunler, faturaStokSatirlari, { arama, sadece_eksik } = {}) {
  const havuz = new Map()
  for (const r of faturaStokSatirlari || []) havuz.set(r.urun_senk_id, Number(r.miktar) || 0)

  return (urunler || [])
    .map(u => {
      const fatura_miktar = (u.senk_id && havuz.get(u.senk_id)) || 0
      const gercek_miktar = Number(u.gercek_miktar) || 0
      return { ...u, fatura_miktar, gercek_miktar, fark: fatura_miktar - gercek_miktar }
    })
    .filter(s => !sadece_eksik || s.fark < 0)
    // Ortak Türkçe-duyarlı arama modülü kullanılır (bkz. tr-arama.js) — ham
    // toLocaleLowerCase('tr') "LINES" (ASCII I) yazan kullanıcının "LİNES"
    // ürününü bulamamasına yol açardı.
    .filter(s => eslesirMi([s.urun_adi, s.sku, s.barkod].filter(Boolean).join(' '), arama))
}

// Ana süreçteki aktif oturumun JWT'si. Renderer'dan ASLA alınmaz.
function jwtAl() {
  return require('../oturum-canli').aktifJwt?.() || null
}

function yerelUrunler() {
  return getDb().prepare(`
    SELECT u.id AS urun_id, u.ad AS urun_adi, u.sku, u.barkod, u.senk_id,
           COALESCE((SELECT SUM(us.miktar) FROM urun_stoklar us WHERE us.urun_id = u.id), 0)
             AS gercek_miktar
      FROM urunler u
     WHERE u.aktif = 1
     ORDER BY u.ad
  `).all()
}

module.exports = {
  _durumBirlestir: durumBirlestir,

  // Yetki kontrolü BİLEREK yok: sipariş ekranındaki "fatura stoğu yok" kilidinin
  // sebebini, fatura yetkisi olmayan kasiyer de görebilmeli.
  'fatura-stok:durum': async ({ arama, sadece_eksik } = {}) => {
    const bulut = await okuma.faturaStokGetir(jwtAl())
    return durumBirlestir(yerelUrunler(), bulut, { arama, sadece_eksik })
  },

  'fatura-stok:hareketler': async ({ urun_id, limit = 200 } = {}) => {
    yetkiKontrol('fatura_stok_goruntule')
    let urun_senk_id = null
    if (urun_id) {
      urun_senk_id = getDb().prepare('SELECT senk_id FROM urunler WHERE id = ?')
        .get(urun_id)?.senk_id || null
    }
    const satirlar = await okuma.hareketGetir({ urun_senk_id, limit }, jwtAl())
    // Ürün adını yerelden zenginleştir (bulut tarafında ad tutulmuyor).
    const adlar = new Map(getDb().prepare('SELECT senk_id, ad, sku FROM urunler WHERE senk_id IS NOT NULL')
      .all().map(u => [u.senk_id, u]))
    return satirlar.map(h => ({
      ...h,
      urun_adi: adlar.get(h.urun_senk_id)?.ad || '(bilinmeyen ürün)',
      sku: adlar.get(h.urun_senk_id)?.sku || null,
    }))
  },

  'alis-fatura:listele': async ({ tedarikci_id } = {}) => {
    yetkiKontrol('fatura_stok_goruntule')
    let tedarikci_senk_id = null
    if (tedarikci_id) {
      tedarikci_senk_id = getDb().prepare('SELECT senk_id FROM tedarikciler WHERE id = ?')
        .get(tedarikci_id)?.senk_id || null
    }
    const faturalar = await okuma.alisFaturaGetir({ tedarikci_senk_id }, jwtAl())
    const adlar = new Map(getDb().prepare('SELECT senk_id, ad FROM tedarikciler WHERE senk_id IS NOT NULL')
      .all().map(t => [t.senk_id, t.ad]))
    return faturalar.map(f => ({ ...f, tedarikci_adi: adlar.get(f.tedarikci_senk_id) || '—' }))
  },

  'alis-fatura:kalemler': async (alis_fatura_senk_id) => {
    yetkiKontrol('fatura_stok_goruntule')
    return okuma.alisKalemGetir(alis_fatura_senk_id, jwtAl())
  },

  'alis-fatura:kaydet': async (veri) => {
    yetkiKontrol('fatura_stok_duzenle')
    const alis = require('../fatura/alis')
    // urun_id → senk_id eşlemesi (bulut tarafı senk_id ile çalışır)
    const idler = {}
    for (const k of veri.kalemler) {
      const r = getDb().prepare('SELECT senk_id FROM urunler WHERE id = ?').get(k.urun_id)
      if (!r?.senk_id) throw new Error(`Ürün buluta henüz eşitlenmemiş: ${k.urun_adi}`)
      idler[k.urun_id] = r.senk_id
    }
    const ted = veri.tedarikci_id
      ? getDb().prepare('SELECT senk_id FROM tedarikciler WHERE id = ?').get(veri.tedarikci_id)
      : null
    return alis.kaydet({ ...veri, tedarikci_senk_id: ted?.senk_id || null, urunSenkIdler: idler },
                       jwtAl())
  },
}
