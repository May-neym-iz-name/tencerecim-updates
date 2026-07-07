const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

// Ürün her lokasyonda 0 stokla görünsün ki Stok ekranında bulunabilsin.
function stokSatirlariOlustur(db, urunId) {
  const lokasyonlar = db.prepare('SELECT id FROM lokasyonlar').all()
  const ekle = db.prepare('INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok) VALUES (?, ?, 0, 0)')
  for (const l of lokasyonlar) ekle.run(urunId, l.id)
}

// EAN-13 kontrol hanesi: ilk 12 haneden hesaplanır (soldan; tek konum x1, çift konum x3).
function ean13KontrolHanesi(ilk12) {
  let toplam = 0
  for (let i = 0; i < 12; i++) {
    toplam += Number(ilk12[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return String((10 - (toplam % 10)) % 10)
}

// Mağaza içi (kısıtlı dolaşım) barkodu üretir. EAN-13 önekleri 20-29 dahili kullanım için
// ayrılmıştır → gerçek üretici barkodlarıyla asla çakışmaz. Çekirdek olarak ürün id'si gömülür
// (benzersiz); çakışma olursa (olmamalı) rastgele çekirdekle yeniden dener.
function magazaBarkoduUret(cekirdek) {
  const govde = ('29' + String(cekirdek).padStart(10, '0')).slice(0, 12)
  return govde + ean13KontrolHanesi(govde)
}

const URUN_SELECT = `
  SELECT u.*, m.ad as marka_adi, k.tam_yol as kategori_yol, t.ad as tedarikci_adi
  FROM urunler u
  LEFT JOIN markalar m ON u.marka_id = m.id
  LEFT JOIN kategoriler k ON u.kategori_id = k.id
  LEFT JOIN tedarikciler t ON u.tedarikci_id = t.id
`

module.exports = {
  'urunler:listele': ({ arama, kategori_id, marka_id, sayfa = 1, boyut = 100 } = {}) => {
    const db = getDb()
    let where = 'WHERE u.aktif = 1'
    const params = []
    if (arama) {
      where += ' AND (u.ad LIKE ? OR u.barkod LIKE ? OR u.sku LIKE ?)'
      params.push(`%${arama}%`, `%${arama}%`, `%${arama}%`)
    }
    if (kategori_id) {
      // Seçilen kategori + tüm alt kategorilerindeki ürünleri kapsa (tam_yol prefix eşleşmesi).
      const kat = db.prepare('SELECT tam_yol FROM kategoriler WHERE id = ?').get(kategori_id)
      if (kat && kat.tam_yol) {
        where += ' AND u.kategori_id IN (SELECT id FROM kategoriler WHERE tam_yol = ? OR tam_yol LIKE ?)'
        params.push(kat.tam_yol, kat.tam_yol + '>%')
      } else {
        where += ' AND u.kategori_id = ?'
        params.push(kategori_id)
      }
    }
    if (marka_id) { where += ' AND u.marka_id = ?'; params.push(marka_id) }
    const toplam = db.prepare(`SELECT COUNT(*) as n FROM urunler u ${where}`).get(...params).n
    // boyut <= 0 => sınırsız (tüm ürünler). Aksi halde sayfalama uygulanır.
    if (!boyut || boyut <= 0) {
      const sorgu = `${URUN_SELECT} ${where} ORDER BY u.ad`
      return { toplam, urunler: db.prepare(sorgu).all(...params) }
    }
    const sorgu = `${URUN_SELECT} ${where} ORDER BY u.ad LIMIT ? OFFSET ?`
    params.push(boyut, (sayfa - 1) * boyut)
    return { toplam, urunler: db.prepare(sorgu).all(...params) }
  },

  'urunler:getir': (id) => {
    return getDb().prepare(`${URUN_SELECT} WHERE u.id = ? AND u.aktif = 1`).get(id)
  },

  'urunler:barkodla': (barkod) => {
    const deger = String(barkod || '').trim()
    if (!deger) return undefined
    // Barkod ya da SKU ile eşleştir; olası baştaki/sondaki boşlukları yok say.
    return getDb().prepare(
      `${URUN_SELECT} WHERE (TRIM(u.barkod) = ? OR TRIM(u.sku) = ?) AND u.aktif = 1`
    ).get(deger, deger)
  },

  'urunler:olustur': (veri) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const { ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani } = veri

    // Yumuşak silme (aktif=0) nedeniyle aynı barkod/SKU pasif bir üründe kalmış olabilir.
    // UNIQUE kısıtını ihlal etmemek için: pasif eşleşme varsa onu güncelleyip yeniden aktive et.
    const cakisan = (barkod && db.prepare('SELECT * FROM urunler WHERE barkod = ?').get(barkod))
                 || (sku && db.prepare('SELECT * FROM urunler WHERE sku = ?').get(sku))
    if (cakisan) {
      if (cakisan.aktif) {
        throw new Error(`Bu ${barkod && cakisan.barkod === barkod ? 'barkod' : 'SKU'} zaten aktif bir üründe kullanılıyor`)
      }
      db.prepare(`
        UPDATE urunler SET ad=?, barkod=?, sku=?, marka_id=?, kategori_id=?, tedarikci_id=?,
        aciklama=?, alis_fiyati=?, satis_fiyati=?, kdv_orani=?, aktif=1, guncelleme_tarihi=datetime('now','localtime')
        WHERE id=?
      `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null,
         aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20, cakisan.id)
      stokSatirlariOlustur(db, cakisan.id)
      return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(cakisan.id)
    }

    const r = db.prepare(`
      INSERT INTO urunler (ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null, aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20)
    stokSatirlariOlustur(db, r.lastInsertRowid)
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(r.lastInsertRowid)
  },

  'urunler:guncelle': ({ id, ...veri }) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const { ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani } = veri
    // Satış fiyatı değişiyorsa ayrıca fiyat_degistir yetkisi gerekir.
    const mevcut = db.prepare('SELECT satis_fiyati, alis_fiyati FROM urunler WHERE id = ?').get(id)
    if (mevcut && Number(mevcut.satis_fiyati) !== Number(satis_fiyati)) {
      yetkiKontrol('fiyat_degistir')
    }
    // Fiyat (satış/alış) değişti mi → ikas'a arka planda gönder.
    const fiyatDegisti = mevcut &&
      (Number(mevcut.satis_fiyati) !== Number(satis_fiyati) || Number(mevcut.alis_fiyati) !== Number(alis_fiyati))
    try {
      db.prepare(`
        UPDATE urunler SET ad=?, barkod=?, sku=?, marka_id=?, kategori_id=?, tedarikci_id=?,
        aciklama=?, alis_fiyati=?, satis_fiyati=?, kdv_orani=?, guncelleme_tarihi=datetime('now','localtime')
        WHERE id=?
      `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null,
         aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20, id)
    } catch (e) {
      if (String(e.message).includes('UNIQUE') && e.message.includes('barkod')) throw new Error('Bu barkod başka bir üründe kullanılıyor')
      if (String(e.message).includes('UNIQUE') && e.message.includes('sku')) throw new Error('Bu SKU başka bir üründe kullanılıyor')
      throw e
    }
    if (fiyatDegisti) {
      try { require('../ikas/ekstra')._pushFiyatArkaPlan([id]) } catch {}
    }
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(id)
  },

  // Barkodsuz bir ürün için otomatik, benzersiz mağaza içi barkod (EAN-13) üretir.
  'urunler:barkodUret': (id) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const urun = db.prepare('SELECT id, barkod FROM urunler WHERE id = ? AND aktif = 1').get(id)
    if (!urun) throw new Error('Ürün bulunamadı')
    if (urun.barkod && String(urun.barkod).trim()) throw new Error('Bu ürünün zaten bir barkodu var')

    const barkodVar = db.prepare('SELECT 1 FROM urunler WHERE barkod = ?')
    let barkod = magazaBarkoduUret(urun.id)
    // Çakışma teorik olarak imkânsız (29 öneki + benzersiz id); yine de savunmacı kontrol.
    let deneme = 0
    while (barkodVar.get(barkod)) {
      barkod = magazaBarkoduUret(Math.floor(Math.random() * 1e10))
      if (++deneme > 20) throw new Error('Benzersiz barkod üretilemedi, tekrar deneyin')
    }
    db.prepare(`UPDATE urunler SET barkod = ?, guncelleme_tarihi = datetime('now','localtime') WHERE id = ?`).run(barkod, id)
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(id)
  },

  'urunler:sil': (id) => {
    yetkiKontrol('urun_sil')
    getDb().prepare('UPDATE urunler SET aktif = 0 WHERE id = ?').run(id)
    return { mesaj: 'Ürün silindi' }
  },

  'urunler:stok': (urun_id) => {
    return getDb().prepare(`
      SELECT us.*, l.ad as lokasyon_adi
      FROM urun_stoklar us JOIN lokasyonlar l ON us.lokasyon_id = l.id
      WHERE us.urun_id = ?
    `).all(urun_id)
  },
}
