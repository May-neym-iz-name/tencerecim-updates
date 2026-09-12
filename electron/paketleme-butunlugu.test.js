// PAKETLEME BÜTÜNLÜĞÜ — kurulu uygulamada çözülemeyecek require'ları yakalar.
//
// NEDEN VAR (12.09, sürüm 1.2.208): electron/urun-aciklama/toplu.js tepe seviyede
// require('../../URUN-ESLESTIRME/_gorsel-guvence') yapıyordu. package.json
// build.files yalnız dist/ electron/ node_modules/ paketler — URUN-ESLESTIRME/
// KASTEN dışarıdadır (ticari veri, public repo). Kurulu uygulamada o yol yok:
//
//   Error: Cannot find module '../../URUN-ESLESTIRME/_gorsel-guvence'
//
// main.js açılışta topluKipMi() için bu modülü yüklüyordu, hata whenReady
// zincirinde yutuluyordu → PENCERE HİÇ AÇILMADI, ekranda hiçbir mesaj yoktu.
//
// BU HATA npm run dev İLE ÜRETİLEMEZ: depoda URUN-ESLESTIRME/ electron/'un
// yanındadır, yol çözülür, her şey çalışır. Yalnız app.asar içinde kaybolur.
// Bu yüzden test davranışı değil DEĞİŞMEZİ ölçer: paketlenen ağacın dışına
// tepe seviyeden require edilmez.
//
// Kapsam-aşırı bağ yasak değildir — TEMBEL olmak zorundadır (fonksiyon içinde
// require). Öyle olduğunda modülün yüklenmesi patlamaz; yalnız o yolu gerçekten
// kullanan iş, modülün var olduğu depo içinden çalıştırıldığında istenir.

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const KOK = path.join(__dirname, '..')

// electron-builder'ın paketlediği tepe seviye klasörler (package.json build.files).
const PAKETLENEN = ['dist', 'electron', 'node_modules']

function jsDosyalari(dizin) {
  const cikti = []
  for (const ad of fs.readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, ad.name)
    if (ad.isDirectory()) {
      cikti.push(...jsDosyalari(tam))
    } else if (ad.name.endsWith('.js') && !ad.name.endsWith('.test.js')) {
      cikti.push(tam)
    }
  }
  return cikti
}

// Satır tepe seviyede mi? Girinti yoksa (veya yalnız yorum/odak dışı) modül
// yüklenirken çalışır. Fonksiyon gövdesindeki require girintili olur.
// Kaba ama bu kod tabanının biçimiyle güvenilir: tepe seviye require'lar
// daima 0. kolondan başlar.
function tepeSeviyeRequireYollari(kaynak) {
  const yollar = []
  for (const satir of kaynak.split(/\r?\n/)) {
    if (/^\s/.test(satir)) continue // girintili → fonksiyon içi, tembel
    if (satir.trimStart().startsWith('//')) continue
    const m = satir.match(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)
    if (!m) continue
    for (const p of m) {
      const y = p.match(/['"](\.[^'"]+)['"]/)[1]
      yollar.push(y)
    }
  }
  return yollar
}

describe('paketleme bütünlüğü', () => {
  const dosyalar = jsDosyalari(path.join(KOK, 'electron'))

  it('electron/ altında en az birkaç dosya taranıyor (test boşa dönmesin)', () => {
    // Mutasyon koruması: jsDosyalari bozulup [] dönerse aşağıdaki test
    // sessizce YEŞİL olurdu. Bu satır onu kırmızıya çevirir.
    expect(dosyalar.length).toBeGreaterThan(50)
  })

  it('hiçbir modül paketlenmeyen bir klasöre TEPE SEVİYEDEN require etmez', () => {
    const ihlaller = []

    for (const dosya of dosyalar) {
      const kaynak = fs.readFileSync(dosya, 'utf8')
      for (const isteneYol of tepeSeviyeRequireYollari(kaynak)) {
        const cozulen = path.resolve(path.dirname(dosya), isteneYol)
        const gore = path.relative(KOK, cozulen)

        // Kökün dışına çıkan (../ ile depo dışı) veya paketlenmeyen bir
        // tepe seviye klasöre giren her yol ihlaldir.
        const tepeKlasor = gore.split(path.sep)[0]
        const kokDisi = gore.startsWith('..')
        if (kokDisi || !PAKETLENEN.includes(tepeKlasor)) {
          ihlaller.push(`${path.relative(KOK, dosya)} → ${isteneYol} (çözülen: ${gore})`)
        }
      }
    }

    expect(ihlaller).toEqual([])
  })
})
