#!/usr/bin/env node
// dist-electron/ icindeki eski kurulum dosyalarini budar, yalnizca en yeni N surumu birakir.
// Dagitim GitHub Releases uzerinden yapilir (package.json -> build.publish.provider = github),
// bu yuzden yerel kopyalar sadece ara uretim ciktisidir; silmek oto-guncellemeyi etkilemez.
//
// Kullanim:  node scripts/dist-buda.js [--tut=3] [--kuru]
//   --tut=N   kac surum birakilacak (varsayilan 3)
//   --kuru    hicbir sey silme, yalniz ne silinecegini yaz

const fs = require('fs')
const path = require('path')

const VARSAYILAN_TUT = 3
const DIZIN = path.join(__dirname, '..', 'dist-electron')
const KURULUM_DESENI = /^tencerecim-setup-(\d+)\.(\d+)\.(\d+)\.exe(\.blockmap)?$/

/**
 * Dosya adindan surumu cikarir. Bulamazsa null doner.
 * @returns {{anahtar: string, parcalar: number[]} | null}
 */
function surumuAyikla(dosyaAdi) {
  const m = KURULUM_DESENI.exec(dosyaAdi)
  if (!m) return null
  const parcalar = [Number(m[1]), Number(m[2]), Number(m[3])]
  return { anahtar: parcalar.join('.'), parcalar }
}

/**
 * Surumleri YENIDEN ESKIYE dogru siralar.
 * SAYISAL karsilastirma sarttir: metin siralamasinda '1.2.9' > '1.2.100' cikar.
 */
function surumleriSirala(surumler) {
  return [...surumler].sort((a, b) => {
    for (let i = 0; i < 3; i++) {
      if (b.parcalar[i] !== a.parcalar[i]) return b.parcalar[i] - a.parcalar[i]
    }
    return 0
  })
}

function buda({ tut = VARSAYILAN_TUT, kuru = false, dizin = DIZIN } = {}) {
  if (!fs.existsSync(dizin)) return { silinen: [], tutulan: [], bayt: 0 }

  const dosyalar = fs.readdirSync(dizin)
  const surumHaritasi = new Map() // "1.2.221" -> [dosya adlari]

  for (const dosyaAdi of dosyalar) {
    const s = surumuAyikla(dosyaAdi)
    if (!s) continue
    if (!surumHaritasi.has(s.anahtar)) surumHaritasi.set(s.anahtar, { ...s, dosyalar: [] })
    surumHaritasi.get(s.anahtar).dosyalar.push(dosyaAdi)
  }

  const sirali = surumleriSirala([...surumHaritasi.values()])
  const tutulan = sirali.slice(0, tut)
  const silinecek = sirali.slice(tut)

  let bayt = 0
  const silinen = []
  for (const surum of silinecek) {
    for (const dosyaAdi of surum.dosyalar) {
      const tamYol = path.join(dizin, dosyaAdi)
      try {
        bayt += fs.statSync(tamYol).size
        if (!kuru) fs.unlinkSync(tamYol)
        silinen.push(dosyaAdi)
      } catch (hata) {
        console.error(`[dist-buda] silinemedi: ${dosyaAdi} — ${hata.message}`)
      }
    }
  }

  return { silinen, tutulan: tutulan.map((s) => s.anahtar), bayt }
}

function mb(bayt) {
  return (bayt / 1024 / 1024).toFixed(0)
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  const tutArg = argv.find((a) => a.startsWith('--tut='))
  const tut = tutArg ? Number(tutArg.split('=')[1]) : VARSAYILAN_TUT
  const kuru = argv.includes('--kuru')

  if (!Number.isInteger(tut) || tut < 1) {
    console.error('[dist-buda] --tut en az 1 olmali')
    process.exit(1)
  }

  const sonuc = buda({ tut, kuru })
  const on = kuru ? '[KURU] ' : ''
  if (sonuc.silinen.length === 0) {
    console.log(`${on}[dist-buda] budanacak eski surum yok (tutulan: ${sonuc.tutulan.join(', ') || 'yok'})`)
  } else {
    console.log(
      `${on}[dist-buda] ${sonuc.silinen.length} dosya silindi, ${mb(sonuc.bayt)} MB kazanildi. ` +
        `Tutulan surumler: ${sonuc.tutulan.join(', ')}`
    )
  }
}

module.exports = { buda, surumuAyikla, surumleriSirala }
