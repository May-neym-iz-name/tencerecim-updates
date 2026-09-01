const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const okuma = require('../fatura/okuma')
const { kimlikAnahtari, kimlikHaritasi } = require('./senk-kimlik')

// Fatura stoğu Supabase'de (asıl nüsha), ürün + gerçek stok yerel SQLite'ta.
// Birleştirme burada, JS tarafında yapılır. Bkz. plan Ruling-5.

// Saf birleştirme — test edilebilir olsun diye IO'dan ayrıldı. `_` önekli dışa
// aktarılır: main.js modüldeki `_` ile başlamayan HER anahtarı otomatik IPC
// kanalı olarak kaydediyor (bkz. main.js:504-506), bu saf fonksiyon renderer'a
// AÇILMAMALI.
// NOT: `arama` parametresi BİLEREK yok — arama artık istemcide `eslesirMi` ile
// yapılıyor (bkz. FaturaStogu.jsx), burada ikinci kez filtrelemek ölü koddu.
function durumBirlestir(urunler, faturaStokSatirlari, { sadece_eksik } = {}) {
  // 🔴 Bulut uuid'si TİRELİ, yerel senk_id TİRESİZ gelir — iki taraf da
  // normalize edilmezse hiçbir ürün eşleşmez ve ekranda her şey 0 görünür
  // (bkz. db/senk-kimlik.js; 01.09.2026'da canlıda yaşandı).
  const havuz = kimlikHaritasi(faturaStokSatirlari, 'urun_senk_id', r => Number(r.miktar) || 0)

  return (urunler || [])
    .map(u => {
      const fatura_miktar = (u.senk_id && havuz.get(kimlikAnahtari(u.senk_id))) || 0
      const gercek_miktar = Number(u.gercek_miktar) || 0
      return { ...u, fatura_miktar, gercek_miktar, fark: fatura_miktar - gercek_miktar }
    })
    .filter(s => !sadece_eksik || s.fark < 0)
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

  // Bizimhesap'tan açılış bakiyesi (Faz 2 / Task 9). İDEMPOTENT: sunucu yalnız
  // bakiyesi HİÇ OLMAYAN ürüne yazar, ikinci çalıştırma hiçbir şeyi katlamaz.
  'fatura-stok:tohumla': async () => {
    yetkiKontrol('fatura_stok_duzenle')
    const ayarlar = require('./fatura-ayarlar')._ayarlariGetir()
    const bizimhesapUrunler = await require('../fatura/saglayici/bizimhesap').urunleriGetir(ayarlar)
    const yerelUrunler = getDb().prepare(
      "SELECT sku, senk_id, ad FROM urunler WHERE aktif = 1 AND sku IS NOT NULL AND sku != ''").all()
    const { kalemler, rapor } = require('../fatura/tohumlama').tohumKalemleriKur(bizimhesapUrunler, yerelUrunler)
    if (!kalemler.length) {
      return { yazilan: 0, atlanan: 0, toplam_adet: 0, rapor }
    }
    const kimlik = require('../yetki')._aktifKimlik()
    const sonuc = await require('../fatura/bulut').rpc('fatura_stok_tohumla',
      { p_kalemler: kalemler, p_kullanici: (kimlik && kimlik.eposta) || null }, jwtAl())
    return { ...(sonuc || {}), rapor }
  },

  // Yetki kontrolü BİLEREK yok: sipariş ekranındaki "fatura stoğu yok" kilidinin
  // sebebini, fatura yetkisi olmayan kasiyer de görebilmeli.
  'fatura-stok:durum': async ({ sadece_eksik } = {}) => {
    const bulut = await okuma.faturaStokGetir(jwtAl())
    return durumBirlestir(yerelUrunler(), bulut, { sadece_eksik })
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
    const adlar = kimlikHaritasi(
      getDb().prepare('SELECT senk_id, ad, sku FROM urunler WHERE senk_id IS NOT NULL').all(),
      'senk_id')
    return satirlar.map(h => ({
      ...h,
      urun_adi: adlar.get(kimlikAnahtari(h.urun_senk_id))?.ad || '(bilinmeyen ürün)',
      sku: adlar.get(kimlikAnahtari(h.urun_senk_id))?.sku || null,
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
    const { FaturaHatasi } = require('../fatura/bulut')
    // urun_id → senk_id eşlemesi (bulut tarafı senk_id ile çalışır)
    const idler = {}
    for (const k of veri.kalemler) {
      const r = getDb().prepare('SELECT senk_id FROM urunler WHERE id = ?').get(k.urun_id)
      if (!r?.senk_id) throw new Error(`Ürün buluta henüz eşitlenmemiş: ${k.urun_adi}`)
      idler[k.urun_id] = r.senk_id
    }
    let tedarikciSenkId = null
    if (veri.tedarikci_id) {
      const ted = getDb().prepare('SELECT ad, senk_id FROM tedarikciler WHERE id = ?').get(veri.tedarikci_id)
      // Ürün kontrolündeki gibi: tedarikçi seçilmiş ama buluta eşitlenmemişse
      // faturayı SESSİZCE "tedarikçisiz" kaydetme — muhasebesel yanlış atıf olur.
      if (!ted?.senk_id) throw new Error(`Tedarikçi buluta henüz eşitlenmemiş: ${ted?.ad || veri.tedarikci_id}`)
      tedarikciSenkId = ted.senk_id
    }
    // mal_kabul_id → senk_id eşlemesi. Tedarikçi/ürünün aksine bu bağ OPSİYONEL
    // (Task 9 "mal kabulden devral" özelliği yalnız bir kolaylık, faturanın
    // muhasebesel doğruluğunu etkilemiyor) — bu yüzden senk_id yoksa faturayı
    // DURDURMUYORUZ, null geçiyoruz. Ama sessiz de kalmıyoruz: teşhis
    // edilebilsin diye logluyoruz, aksi halde neden bağın koptuğu anlaşılmaz.
    let malKabulSenkId = null
    if (veri.mal_kabul_id) {
      const mk = getDb().prepare('SELECT senk_id FROM mal_kabuller WHERE id = ?').get(veri.mal_kabul_id)
      if (mk?.senk_id) {
        malKabulSenkId = mk.senk_id
      } else {
        console.warn(`[fatura-stok] mal_kabul_id=${veri.mal_kabul_id} buluta henüz eşitlenmemiş, ` +
          `mal_kabul_senk_id NULL kaydedilecek (bağ kaybolur, fatura yine de girilir)`)
      }
    }
    // Denetim kaydı: fatura stoğunu kim değiştirdi (KVKK/muhasebe izi). Renderer'dan
    // ALINMAZ — aktif oturumun kimliği main tarafında tutulur (bkz. yetki.js).
    const kimlik = require('../yetki')._aktifKimlik()
    try {
      return await alis.kaydet({
        ...veri,
        tedarikci_senk_id: tedarikciSenkId,
        mal_kabul_senk_id: malKabulSenkId,
        kullanici: kimlik.eposta || null,
        urunSenkIdler: idler,
      }, jwtAl())
    } catch (e) {
      if (!(e instanceof FaturaHatasi)) throw e
      // Ham sunucu/Postgres metni kullanıcıya gitmesin — Türkçe, anlaşılır mesaja
      // çevrilir. Teşhis için ham ayrıntı 'cause' olarak korunur.
      let mesaj
      if (e.kod === 'cakisma') {
        mesaj = 'Bu fatura numarası bu tedarikçi için zaten girilmiş.'
      } else if (e.kod === 'dogrulama') {
        mesaj = 'Satır tutarları uyuşmuyor, lütfen miktar ve birim fiyatları kontrol edin.'
      } else if (e.kod === 'yetersiz_stok') {
        mesaj = 'Stok yetersiz, fatura kaydedilemedi.'
      } else if (e.kod === 'oturum') {
        mesaj = e.message // zaten Türkçe ve anlaşılır
      } else if (e.kod === 'ag') {
        // 'ag' hem gerçek ağ hatasını hem 20sn zaman aşımını kapsıyor — ikinci
        // durumda RPC sunucuda commit olmuş OLABİLİR (bkz. bulut.js: "sonuç
        // belirsiz, telafi yapma"). "Kaydedilmedi" demek yanlış kesinlik iddia
        // eder; gerçeği yansıtan mesaj sonucu doğrulanamadığını söyler.
        mesaj = 'Sunucuya ulaşılamadı, işlemin sonucu doğrulanamadı. Tekrar denemeden önce alış faturaları listesini kontrol edin.'
      } else {
        mesaj = e.message
      }
      const hata = new Error(mesaj)
      hata.kod = e.kod          // IPC sınırını geçmesi için (main.js err.kod || null)
      hata.cause = e            // ham ayrıntı teşhis için
      throw hata
    }
  },
}
