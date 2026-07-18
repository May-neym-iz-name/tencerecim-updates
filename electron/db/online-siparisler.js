// Online (ikas web sitesi) siparişlerinin yerel listelenmesi ve detayı.
const { getDb } = require('./database')

module.exports = {
  // Filtreler SQL'de uygulanır (eskiden boyut:0 ile TÜM siparişler çekilip istemcide
  // filtreleniyordu — her satır için kargo alt sorgusu koştuğundan N kayıt = N alt sorgu,
  // ve sonuç IPC üzerinden bütünüyle taşınıyordu). boyut<=0 hâlâ destekleniyor ama
  // arayüz artık kullanmıyor.
  'online-siparis:listele': ({
    arama, sayfa = 1, boyut = 50,
    tarihBas, tarihBit, odeme, durum, kargo,
  } = {}) => {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params = []
    if (arama) {
      where += ' AND (s.siparis_no LIKE ? OR s.musteri_ad LIKE ? OR s.musteri_telefon LIKE ?)'
      params.push(`%${arama}%`, `%${arama}%`, `%${arama}%`)
    }
    if (tarihBas) { where += ' AND date(s.siparis_tarihi) >= ?'; params.push(tarihBas) }
    if (tarihBit) { where += ' AND date(s.siparis_tarihi) <= ?'; params.push(tarihBit) }
    if (odeme)    { where += ' AND s.odeme_durumu = ?';          params.push(odeme) }
    if (durum)    { where += ' AND s.durum = ?';                 params.push(durum) }
    if (kargo)    { where += ' AND s.kargo_durumu = ?';          params.push(kargo) }

    const toplam = db.prepare(`SELECT COUNT(*) n FROM online_siparisler s ${where}`).get(...params).n
    // Her siparişe ilişkili (varsa) en güncel kargo takip no'sunu ekle.
    const limitsiz = !boyut || boyut <= 0
    const sorgu = `
      SELECT s.*, (
        SELECT k.takip_no FROM kargolar k
        WHERE (k.online_siparis_id = s.id OR (k.ikas_siparis_id IS NOT NULL AND k.ikas_siparis_id = s.ikas_siparis_id))
          AND k.durum != 'iptal'
        ORDER BY k.id DESC LIMIT 1
      ) AS kargo_takip_no
      FROM online_siparisler s ${where} ORDER BY s.siparis_tarihi DESC ${limitsiz ? '' : 'LIMIT ? OFFSET ?'}`
    if (!limitsiz) params.push(boyut, (sayfa - 1) * boyut)
    return { toplam, siparisler: db.prepare(sorgu).all(...params) }
  },

  // Filtre açılırlarını doldurmak için: tabloda GEÇEN farklı durum değerleri.
  // Eskiden tüm siparişler istemciye çekilip Set ile türetiliyordu.
  'online-siparis:filtre-secenekleri': () => {
    const db = getDb()
    const kolon = (k) => db.prepare(
      `SELECT DISTINCT ${k} d FROM online_siparisler WHERE ${k} IS NOT NULL AND ${k} != '' ORDER BY ${k}`
    ).all().map(r => r.d)
    return { odeme: kolon('odeme_durumu'), durum: kolon('durum'), kargo: kolon('kargo_durumu') }
  },

  // Bir sipariş kaleminin çıkış (stok) lokasyonunu değiştirir. Sipariş stoktan
  // düşülmüşse, eski lokasyona stok geri eklenir, yeni lokasyondan düşülür.
  'online-siparis:kalem-lokasyon': ({ kalemId, lokasyonId }) => {
    const db = getDb()
    const kalem = db.prepare('SELECT * FROM online_siparis_kalemleri WHERE id = ?').get(kalemId)
    if (!kalem) throw new Error('Sipariş kalemi bulunamadı')
    const yeniLok = lokasyonId ? Number(lokasyonId) : null
    if (kalem.lokasyon_id === yeniLok) return { ok: true, degisti: false }

    const sip = db.prepare('SELECT stok_dusuldu FROM online_siparisler WHERE id = ?').get(kalem.siparis_id)
    const stokDusuldu = !!sip?.stok_dusuldu
    const adet = Number(kalem.miktar) || 0

    const tx = db.transaction(() => {
      if (stokDusuldu && kalem.urun_id && adet) {
        // Eski lokasyona geri ekle.
        if (kalem.lokasyon_id) {
          db.prepare('UPDATE urun_stoklar SET miktar = miktar + ? WHERE urun_id = ? AND lokasyon_id = ?')
            .run(adet, kalem.urun_id, kalem.lokasyon_id)
        }
        // Yeni lokasyondan düş (satır yoksa oluştur).
        if (yeniLok) {
          db.prepare(`INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar)
            VALUES (?, ?, 0) ON CONFLICT(urun_id, lokasyon_id) DO NOTHING`).run(kalem.urun_id, yeniLok)
          db.prepare('UPDATE urun_stoklar SET miktar = MAX(0, miktar - ?) WHERE urun_id = ? AND lokasyon_id = ?')
            .run(adet, kalem.urun_id, yeniLok)
        }
      }
      db.prepare('UPDATE online_siparis_kalemleri SET lokasyon_id = ? WHERE id = ?').run(yeniLok, kalemId)
    })
    tx()

    // Yeni lokasyon stoğu değiştiyse ikas'a arka planda push et.
    if (stokDusuldu && kalem.urun_id) {
      try { require('../ikas')._pushArkaPlan([kalem.urun_id]) } catch {}
    }
    return { ok: true, degisti: true }
  },

  'online-siparis:getir': (id) => {
    const db = getDb()
    const siparis = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!siparis) return null
    siparis.kalemler = db.prepare(`
      SELECT k.*, l.ad AS lokasyon_adi
      FROM online_siparis_kalemleri k
      LEFT JOIN lokasyonlar l ON k.lokasyon_id = l.id
      WHERE k.siparis_id = ?
    `).all(id)
    siparis.kargolar = db.prepare(
      `SELECT id, takip_no, durum FROM kargolar
       WHERE online_siparis_id = ? OR (ikas_siparis_id IS NOT NULL AND ikas_siparis_id = ?)
       ORDER BY id DESC`
    ).all(id, siparis.ikas_siparis_id)
    return siparis
  },
}
