const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { kelimeKosulu } = require('./tr-arama')

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

// Marka-bazlı otomatik stok kodu: TNC.<MARKA_KISA>.<00001> şablonu.
// Markanın mevcut ürünlerindeki TNC.X.N kodlarından şablonu öğrenir (en yüksek
// numara + 1). Marka için henüz hiç TNC kodu yoksa null döner → ilk kodu kullanıcı
// bir kez elle girer (örn. TNC.SFL.00001), sonrakiler otomatik türetilir.
// En yüksek numaralı TEK satırı SQL'de bulur — eskiden markanın TÜM ürünleri JS'e çekilip
// regex ile taranıyordu (Lava'da 3925, Rollers'ta 751 satır, her ürün eklemede).
// rtrim(sku,'0123456789') sondaki rakamları soyar → 'TNC.LAV.' ; replace ile sayı kısmı kalır.
// (SQLite'ın instr() fonksiyonu 3 argüman almadığı için bu yol kullanıldı.)
// Doğrulama: 13 markanın 13'ünde de eski JS mantığıyla birebir aynı kodu üretiyor.
function sonrakiStokKodu(db, marka_id) {
  if (!marka_id) return null
  const satir = db.prepare(`
    SELECT sku, CAST(replace(sku, rtrim(sku, '0123456789'), '') AS INTEGER) AS num
    FROM urunler
    WHERE marka_id = ? AND sku LIKE 'TNC.%'
    ORDER BY num DESC
    LIMIT 1
  `).get(marka_id)
  if (!satir) return null
  const m = /^TNC\.([A-Za-z0-9ÇĞİÖŞÜçğıöşü]+)\.(\d+)$/.exec(String(satir.sku).trim())
  if (!m) return null
  const hane = Math.max(m[2].length, 5)
  return `TNC.${m[1]}.${String(satir.num + 1).padStart(hane, '0')}`
}

const URUN_SELECT = `
  SELECT u.*, m.ad as marka_adi, k.tam_yol as kategori_yol, t.ad as tedarikci_adi,
    (SELECT COALESCE(SUM(us.miktar), 0) FROM urun_stoklar us WHERE us.urun_id = u.id) AS toplam_stok
  FROM urunler u
  LEFT JOIN markalar m ON u.marka_id = m.id
  LEFT JOIN kategoriler k ON u.kategori_id = k.id
  LEFT JOIN tedarikciler t ON u.tedarikci_id = t.id
`

module.exports = {
  // durum: 'aktif' (varsayılan) | 'pasif'. Pasifler YALNIZCA Ürünler sekmesindeki
  // Pasif alanından istenir; satış/stok/set gibi tüm diğer çağrılar varsayılanla
  // (aktif) çalışmaya devam eder — pasif ürün hiçbir yerde görünmez.
  'urunler:listele': ({ arama, kategori_id, marka_id, sayfa = 1, boyut = 100, durum = 'aktif' } = {}) => {
    const db = getDb()
    let where = durum === 'pasif' ? 'WHERE u.aktif = 0' : 'WHERE u.aktif = 1'
    const params = []
    // ALAKA SIRASI: aramanın tüm kelimeleri ÜRÜN ADINDA geçenler öne. Sayı içeren
    // aramalarda ("24 cm") sayı barkod/SKU rakamlarıyla da eşleşir (tüm Sofram
    // barkodları "...24..." içerir); alfabetik sırada 12-22 cm ürünler 8'lik sayfayı
    // doldurup asıl ürünü dışarı itiyordu.
    let sira = 'u.ad'
    const siraParams = []
    if (arama) {
      // KELİME BAZLI + Türkçe duyarsız. Eskiden tek parça LIKE'tı: "çelik tencere kulp"
      // ancak bu sıra ve boşluklarla BİREBİR geçiyorsa eşleşiyordu, ayrıca "ÇELİK"
      // büyük yazılınca hiç bulunmuyordu (LIKE yalnız ASCII'de duyarsız).
      // Marka adı da aranır: ürün adında marka geçmese bile "lava tencere" çalışsın.
      const k = kelimeKosulu("u.ad || ' ' || COALESCE(u.barkod,'') || ' ' || COALESCE(u.sku,'') || ' ' || COALESCE(m.ad,'')", arama)
      where += k.sql
      params.push(...k.params)
      const kAd = kelimeKosulu('u.ad', arama)
      if (kAd.sql) {
        sira = `(CASE WHEN 1=1${kAd.sql} THEN 0 ELSE 1 END), u.ad`
        siraParams.push(...kAd.params)
      }
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
    // markalar JOIN'i ŞART: WHERE artık m.ad'ı da arıyor (URUN_SELECT'te zaten var,
    // burada eksikti → "no such column: m.ad" verirdi).
    const toplam = db.prepare(
      `SELECT COUNT(*) as n FROM urunler u LEFT JOIN markalar m ON u.marka_id = m.id ${where}`
    ).get(...params).n
    // boyut <= 0 => sınırsız (tüm ürünler). Aksi halde sayfalama uygulanır.
    if (!boyut || boyut <= 0) {
      const sorgu = `${URUN_SELECT} ${where} ORDER BY ${sira}`
      return { toplam, urunler: db.prepare(sorgu).all(...params, ...siraParams) }
    }
    const sorgu = `${URUN_SELECT} ${where} ORDER BY ${sira} LIMIT ? OFFSET ?`
    return { toplam, urunler: db.prepare(sorgu).all(...params, ...siraParams, boyut, (sayfa - 1) * boyut) }
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

  // Marka seçilince formda gösterilecek otomatik stok kodu önerisi.
  'urunler:sonraki-stok-kodu': (marka_id) => sonrakiStokKodu(getDb(), marka_id),

  'urunler:olustur': (veri) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    let { ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani } = veri
    // SKU boş bırakıldıysa marka şablonundan otomatik türet (TNC.XXX.00001+).
    if ((!sku || !String(sku).trim()) && marka_id) {
      sku = sonrakiStokKodu(db, marka_id)
    }

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

  // Aktif/pasif geçişi (Ürünler > Pasif Ürünler alanı). Pasife alma = yumuşak
  // gizleme; aktifleştirme barkod/SKU çakışması yaratmaz (UNIQUE zaten korur).
  'urunler:aktiflik': ({ id, aktif }) => {
    yetkiKontrol('urun_duzenle')
    getDb().prepare("UPDATE urunler SET aktif = ?, guncelleme_tarihi = datetime('now','localtime') WHERE id = ?")
      .run(aktif ? 1 : 0, id)
    return { mesaj: aktif ? 'Ürün aktifleştirildi' : 'Ürün pasife alındı' }
  },

  'urunler:stok': (urun_id) => {
    return getDb().prepare(`
      SELECT us.*, l.ad as lokasyon_adi
      FROM urun_stoklar us JOIN lokasyonlar l ON us.lokasyon_id = l.id
      WHERE us.urun_id = ?
    `).all(urun_id)
  },
}
