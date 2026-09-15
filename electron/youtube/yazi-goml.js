// Videoya "DETAYLAR AÇIKLAMADA" seridi gomer (kullanici karari 2026-09-10).
//
// 🔴 NEDEN BU DOSYA BIR KURAL DELIYOR
// Projenin YouTube kolunda "ffmpeg YOK" kurali vardi: Instagram videoyu zaten
// yeniden kodladi, araya bir kodlama daha koymak IKINCI kayipli tur olur.
// Kullanici 10.09'da yaziyi videonun UZERINDE istedi ve bedeli bilerek kabul etti.
// Zarari kucultmek icin: ses -c:a copy (hic dokunulmaz), goruntu crf 18 (gorsel
// olarak kayipsiza yakin), preset slow. Kaynak dosya SILINMEZ.
//
// 🔴 NEDEN SABIT BIR Y KONUMU YOK
// 12 video olculdu: 10'unda y=940 altinda, 3'unde y=1040 altinda icerik var
// (Instagram'in kendi altyazi bandi). Tek sabit konum bir yerde mutlaka
// mevcut yazinin ustune biner. Bu yuzden bant VIDEO BASINA secilir: alt bolgede
// en SAKIN 74 piksellik pencere bulunur.

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const GENISLIK = 720
const YUKSEKLIK = 1280

// Serit olculeri
const SERIT_YUK = 74
const SERIT_GEN = 640
const SERIT_X = 40

// Arama penceresi.
// TABAN=1120: seridin ALT kenari bundan asagi inmez. Altta 160 px birakir;
// YouTube Shorts arayuzu (baslik + kanal satiri) orayi kapatir.
// UST=860: bunun ustu artik "video ortasi", kullanici yaziyi ALTTA istedi.
// ⚠️ 1046'ya kadar inme izni OLCUMDEN geldi: DaIHE_uIMgq'de Instagram'in
// IKI SATIRLIK altyazisi ~1005'e kadar iniyor. Pencere 966'da bitince en sakin
// bant bile altyazinin ustune biniyordu (olculdu: puan 0,935 ve alt satir ortuldu).
const SHORTS_TABAN = 1120
const ARAMA_UST = 860
const ARAMA_ALT = SHORTS_TABAN - SERIT_YUK   // seridin UST kenari icin en alt deger

// Marka renkleri (hafiza: tema-renk-paleti) — lacivert zemin, krem yazi/cerceve.
const ZEMIN = '0x052238'
const KREM = '0xecdf93'

// fontconfig YOK (WinGet ffmpeg): font= kullanmak SEGFAULT verir, fontfile= zorunlu.
const FONT = 'C:/Windows/Fonts/ariblk.ttf'

/**
 * Verilen satir enerjilerinde en SAKIN SERIT_YUK'luk pencerenin ust kenarini bulur.
 *
 * SAF FONKSIYON: I/O yok. enerji[y] = o satirdaki yatay kenar orani (0..1).
 * Beraberlikte EN ALTTAKI pencere secilir — kullanici yaziyi "altta" istedi,
 * esit derecede sakin iki bant varsa alttaki tercih edilir.
 */
function bandSec(enerji, secenek = {}) {
  const ust = secenek.ust != null ? secenek.ust : ARAMA_UST
  const alt = secenek.alt != null ? secenek.alt : ARAMA_ALT
  const h = secenek.yukseklik != null ? secenek.yukseklik : SERIT_YUK
  if (alt < ust) throw new Error('bandSec: arama penceresi ters (' + ust + '..' + alt + ')')

  let enIyiY = null
  let enIyiPuan = Infinity
  for (let y = ust; y <= alt; y++) {
    let toplam = 0
    for (let i = 0; i < h; i++) toplam += enerji[y + i] || 0
    // '<=' : esitlikte ALTTAKI kazanir.
    if (toplam <= enIyiPuan) {
      enIyiPuan = toplam
      enIyiY = y
    }
  }
  return { y: enIyiY, puan: enIyiPuan }
}

/** Tek karenin alt bolgesinde satir bazli yatay kenar orani. */
function kareEnerjisi(ham, secenek = {}) {
  const g = secenek.genislik || GENISLIK
  const y0 = secenek.baslangic != null ? secenek.baslangic : ARAMA_UST
  const y1 = secenek.bitis != null ? secenek.bitis : YUKSEKLIK
  const esik = secenek.esik != null ? secenek.esik : 55
  const enerji = new Float64Array(y1)
  for (let y = y0; y < y1; y++) {
    let sayac = 0
    const satir = y * g
    for (let x = 1; x < g; x++) {
      if (Math.abs(ham[satir + x] - ham[satir + x - 1]) > esik) sayac++
    }
    enerji[y] = sayac / g
  }
  return enerji
}

/** Birden cok karenin enerjisini birlestirir: bir an bile doluysa DOLU sayilir. */
function enerjileriBirlestir(kareler) {
  const sonuc = new Float64Array(YUKSEKLIK)
  for (const k of kareler) {
    for (let y = 0; y < k.length; y++) if (k[y] > sonuc[y]) sonuc[y] = k[y]
  }
  return sonuc
}

function sureOku(dosya) {
  const c = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=duration', '-of', 'csv=p=0', dosya])
  const d = parseFloat(c.toString().trim())
  if (!(d > 0)) throw new Error('sure okunamadi: ' + dosya)
  return d
}

function boyutOku(dosya) {
  const c = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', dosya])
  const [g, y] = c.toString().trim().split('x').map(Number)
  return { genislik: g, yukseklik: y }
}

/** Videodan N kare orneklyip serit icin en sakin bandi secer. */
function bandOlc(dosya, ornek = 8) {
  const boyut = boyutOku(dosya)
  if (boyut.genislik !== GENISLIK || boyut.yukseklik !== YUKSEKLIK) {
    throw new Error('beklenmeyen boyut ' + boyut.genislik + 'x' + boyut.yukseklik +
      ' — serit olculeri 720x1280 icin ayarli: ' + dosya)
  }
  const d = sureOku(dosya)
  const kareler = []
  for (let i = 1; i <= ornek; i++) {
    const t = (d * i) / (ornek + 1)
    const ham = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', dosya,
      '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
      { maxBuffer: 1 << 26 })
    if (ham.length >= GENISLIK * YUKSEKLIK) kareler.push(kareEnerjisi(ham))
  }
  if (!kareler.length) throw new Error('hic kare okunamadi: ' + dosya)
  return bandSec(enerjileriBirlestir(kareler))
}

/** drawbox+drawtext suzgeci. Windows yol tuzagi: ':' kacirilir. */
function suzgecKur(y, metinDosya) {
  const f = FONT.replace(/:/g, '\\:')
  const m = metinDosya.replace(/\\/g, '/').replace(/:/g, '\\:')
  return [
    `drawbox=x=${SERIT_X}:y=${y}:w=${SERIT_GEN}:h=${SERIT_YUK}:color=${ZEMIN}@0.92:t=fill`,
    `drawbox=x=${SERIT_X}:y=${y}:w=${SERIT_GEN}:h=${SERIT_YUK}:color=${KREM}@0.95:t=3`,
    // expansion=none SART: drawtext '%' isaretini genisletme sanip yaziyi HIC basmaz.
    `drawtext=fontfile='${f}':textfile='${m}':expansion=none:` +
    `fontcolor=${KREM}:fontsize=38:x=(w-text_w)/2:y=${y + 18}`,
  ].join(',')
}

/**
 * Seridi videoya gomer. Cikti dosyasinin yolunu doner.
 * Kaynak dosyaya DOKUNULMAZ.
 */
function yaziGom(girdi, cikti, secenek = {}) {
  const metin = secenek.metin || 'DETAYLAR AÇIKLAMADA'
  const band = secenek.y != null ? { y: secenek.y, puan: null } : bandOlc(girdi)

  // Metni dosyadan vermek Turkce ve kacis derdini bitirir (hafiza: reel-video-yazi-duzenleme).
  const metinDosya = path.join(path.dirname(cikti), '.yazi-' + path.basename(cikti) + '.txt')
  fs.writeFileSync(metinDosya, metin, 'utf8')

  // Yarim dosya birakmamak icin once gecici ada yaz (indir.js ile ayni desen).
  const parca = cikti + '.parca'
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', girdi,
      '-vf', suzgecKur(band.y, metinDosya),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      // -f mp4 SART: gecici ad '.parca' ile bittigi icin ffmpeg bicimi
      // uzantidan cikaramaz ve "Unable to choose an output format" der.
      '-c:a', 'copy', '-movflags', '+faststart', '-f', 'mp4', parca], { stdio: 'inherit' })

    // GERI OKU: "hata gelmedi" bir dogrulama degildir.
    const dGirdi = sureOku(girdi)
    const dCikti = sureOku(parca)
    if (Math.abs(dGirdi - dCikti) > 0.15) {
      throw new Error('sure sapti: girdi ' + dGirdi.toFixed(2) + ' sn, cikti ' + dCikti.toFixed(2) + ' sn')
    }
    const b = boyutOku(parca)
    if (b.genislik !== GENISLIK || b.yukseklik !== YUKSEKLIK) {
      throw new Error('cikti boyutu degisti: ' + b.genislik + 'x' + b.yukseklik)
    }
    fs.renameSync(parca, cikti)
  } finally {
    try { fs.unlinkSync(metinDosya) } catch (_) {}
    try { if (fs.existsSync(parca)) fs.unlinkSync(parca) } catch (_) {}
  }
  return { cikti, y: band.y, puan: band.puan }
}

module.exports = {
  bandSec, kareEnerjisi, enerjileriBirlestir, bandOlc, suzgecKur, yaziGom,
  SERIT_YUK, SERIT_GEN, SERIT_X, ARAMA_UST, ARAMA_ALT, SHORTS_TABAN, FONT,
}
