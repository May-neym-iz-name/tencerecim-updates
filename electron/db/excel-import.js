const { getDb } = require('./database')
const { dialog } = require('electron')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

function getOrCreateMarka(ad) {
  if (!ad) return null
  const db = getDb()
  const existing = db.prepare('SELECT id FROM markalar WHERE UPPER(ad)=UPPER(?)').get(ad.trim())
  if (existing) return existing.id
  return db.prepare('INSERT OR IGNORE INTO markalar (ad) VALUES (?)').run(ad.trim()).lastInsertRowid ||
    db.prepare('SELECT id FROM markalar WHERE UPPER(ad)=UPPER(?)').get(ad.trim()).id
}

function getOrCreateTedarikci(ad) {
  if (!ad) return null
  const db = getDb()
  const existing = db.prepare('SELECT id FROM tedarikciler WHERE UPPER(ad)=UPPER(?)').get(ad.trim())
  if (existing) return existing.id
  return db.prepare('INSERT OR IGNORE INTO tedarikciler (ad) VALUES (?)').run(ad.trim()).lastInsertRowid ||
    db.prepare('SELECT id FROM tedarikciler WHERE UPPER(ad)=UPPER(?)').get(ad.trim()).id
}

function getOrCreateKategori(tamYol) {
  if (!tamYol) return null
  const db = getDb()
  const parcalar = tamYol.split('>')
  let ust_id = null
  let son_id = null
  for (const parca of parcalar) {
    const ad = parca.trim()
    const parent_check = ust_id === null ? 'ust_kategori_id IS NULL' : 'ust_kategori_id=?'
    const params = ust_id === null ? [ad] : [ad, ust_id]
    const existing = db.prepare(`SELECT id FROM kategoriler WHERE ad=? AND ${parent_check}`).get(...params)
    if (existing) {
      son_id = existing.id
    } else {
      const tam = ust_id
        ? (db.prepare('SELECT tam_yol FROM kategoriler WHERE id=?').get(ust_id)?.tam_yol || '') + '>' + ad
        : ad
      const r = db.prepare('INSERT OR IGNORE INTO kategoriler (ad, ust_kategori_id, tam_yol) VALUES (?,?,?)').run(ad, ust_id, tam)
      son_id = r.lastInsertRowid || db.prepare(`SELECT id FROM kategoriler WHERE ad=? AND ${parent_check}`).get(...params).id
    }
    ust_id = son_id
  }
  return son_id
}

module.exports = {
  'excel:urun-yukle': async (dosyaYolu) => {
    yetkiKontrol('excel_ice_aktar')
    const db = getDb()
    let XLSX
    try { XLSX = require('xlsx') } catch { throw new Error('xlsx paketi bulunamadı. npm install xlsx çalıştırın.') }

    const wb = XLSX.readFile(dosyaYolu)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const satirlar = XLSX.utils.sheet_to_json(ws)

    // Pendik ve Gölcük lokasyon ID'leri
    const lokPendik = db.prepare("SELECT id FROM lokasyonlar WHERE ad LIKE '%Pendik%'").get()
    const lokGolcuk = db.prepare("SELECT id FROM lokasyonlar WHERE ad LIKE '%Gölcük%' OR ad LIKE '%Golcuk%'").get()
    const pendikId = lokPendik?.id || 1
    const golcukId = lokGolcuk?.id || 2

    let eklenen = 0, guncellenen = 0, hatali = 0
    const hatalar = []

    const importFn = db.transaction(() => {
      for (const satir of satirlar) {
        try {
          const ad = satir['İsim']?.toString().trim()
          if (!ad) continue

          const satisFiyati = parseFloat(satir['Satış Fiyatı']) || 0
          const alisFiyati = parseFloat(satir['Alış Fiyatı']) || 0
          const barkod = satir['Barkod Listesi']?.toString().trim() || null
          const sku = satir['SKU']?.toString().trim() || null
          const ikas_urun_id = satir['Ürün Grup ID']?.toString().trim() || null
          const ikas_varyant_id = satir['Varyant ID']?.toString().trim() || null

          const marka_id = getOrCreateMarka(satir['Marka'])
          const tedarikci_id = getOrCreateTedarikci(satir['Tedarikçi'])

          // Kategori: birden fazla olabilir (; ile ayrılmış), ilkini al
          const kategoriHam = satir['Kategoriler']?.toString().split(';')[0].trim()
          const kategori_id = getOrCreateKategori(kategoriHam)

          const stokPendik = parseInt(satir['Stok:Tencerecim Pendik']) || 0
          const stokGolcuk = parseInt(satir['Stok:Tencerecim Gölcük']) || 0

          // Mevcut ürünü ikas_varyant_id ile ara
          const mevcut = ikas_varyant_id
            ? db.prepare('SELECT id FROM urunler WHERE ikas_varyant_id=?').get(ikas_varyant_id)
            : null

          let urun_id
          if (mevcut) {
            db.prepare(`UPDATE urunler SET ad=?, alis_fiyati=?, satis_fiyati=?, marka_id=?, kategori_id=?,
              tedarikci_id=?, barkod=COALESCE(NULLIF(?,''), barkod), sku=COALESCE(NULLIF(?,''), sku),
              ikas_urun_id=?, guncelleme_tarihi=datetime('now','localtime') WHERE id=?`)
              .run(ad, alisFiyati, satisFiyati, marka_id, kategori_id, tedarikci_id, barkod, sku, ikas_urun_id, mevcut.id)
            urun_id = mevcut.id
            guncellenen++
          } else {
            const r = db.prepare(`INSERT OR IGNORE INTO urunler
              (ad, barkod, sku, marka_id, kategori_id, tedarikci_id, alis_fiyati, satis_fiyati, ikas_urun_id, ikas_varyant_id)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
              .run(ad, barkod, sku, marka_id, kategori_id, tedarikci_id, alisFiyati, satisFiyati, ikas_urun_id, ikas_varyant_id)
            if (r.changes === 0) {
              // barkod/sku çakışması — barkod/sku'suz ekle
              const r2 = db.prepare(`INSERT OR IGNORE INTO urunler
                (ad, marka_id, kategori_id, tedarikci_id, alis_fiyati, satis_fiyati, ikas_urun_id, ikas_varyant_id)
                VALUES (?,?,?,?,?,?,?,?)`)
                .run(ad, marka_id, kategori_id, tedarikci_id, alisFiyati, satisFiyati, ikas_urun_id, ikas_varyant_id)
              urun_id = r2.lastInsertRowid
            } else {
              urun_id = r.lastInsertRowid
            }
            eklenen++
          }

          if (!urun_id) continue

          // Stok güncelle
          for (const [lokId, miktar] of [[pendikId, stokPendik], [golcukId, stokGolcuk]]) {
            db.prepare(`INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar)
              VALUES (?,?,?) ON CONFLICT(urun_id, lokasyon_id) DO UPDATE SET miktar=excluded.miktar`)
              .run(urun_id, lokId, miktar)
          }
        } catch (e) {
          hatali++
          hatalar.push(`${satir['İsim']}: ${e.message}`)
        }
      }
    })

    importFn()
    return { eklenen, guncellenen, hatali, hatalar: hatalar.slice(0, 10) }
  },

  'excel:dosya-sec': async () => {
    const result = await dialog.showOpenDialog({
      title: 'Excel Dosyası Seçin',
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    })
    if (result.canceled) return null
    return result.filePaths[0]
  },
}
