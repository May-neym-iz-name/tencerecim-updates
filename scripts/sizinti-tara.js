// PUBLIC REPO SIZINTI TARAYICISI
//
// Repo herkese açık. .gitignore yalnızca *takip edilmeyen* dosyaları korur ve
// yalnızca bildiği desenleri bilir; bir dosya bir kez `git add`lendikten sonra
// ignore kuralı onu artık durduramaz ve geçmişten silmek zordur. Bu tarayıcı
// commit'ten ÖNCE çalışır ve .gitignore'un unuttuğunu yakalamayı hedefler, bu
// yüzden kendi bağımsız desen listesini tutar.
//
// İki kural ailesi:
//   1) YOL    — dosya nerede duruyor / uzantısı ne (şirket verisi klasörleri).
//   2) İÇERİK — dosyanın içinde anahtar, parola, TC kimlik, IBAN var mı.
//
// Yanlış alarm en az kaçırmak kadar zararlıdır: kullanıcı `--no-verify`
// alışkanlığı edinirse bariyer tamamen işlevsiz kalır. Bu yüzden desenler
// "gerçek anahtar biçimi" arar, "anahtar kelimesi" değil.

// ── Yardımcılar ────────────────────────────────────────────────────────────

// Türkçe harf katlama: toLowerCase('tr') Node'da güvenilmez, elle katlıyoruz.
const TR = { 'İ': 'i', 'I': 'i', 'ı': 'i', 'Ş': 's', 'ş': 's', 'Ğ': 'g', 'ğ': 'g', 'Ü': 'u', 'ü': 'u', 'Ö': 'o', 'ö': 'o', 'Ç': 'c', 'ç': 'c' }
function katla(s) {
  return String(s).replace(/[İIıŞşĞğÜüÖöÇç]/g, (h) => TR[h]).toLowerCase()
}

function parcalar(yol) {
  return katla(yol).split(/[\\/]+/).filter(Boolean)
}

// ── 1) YOL KURALLARI ───────────────────────────────────────────────────────

// Şirket verisi klasörleri. Yolun HERHANGİ bir parçası eşleşirse ihlal.
const GIZLI_KLASORLER = [
  'faturalar', 'hepsiburada', 'trendyol', 'mal kabul', 'urun-eslestirme',
  'urun girisi', 'tedarikciden listeler', 'ups gonderi hesaplama',
  'ups kargo entegrasyonu', 'reklam-kampanyalari', 'ecc-kaynak',
  'bizimhesap-ugyulama-ikas-urunler',
].map(katla)

// Ticari/kişisel veri taşıyan dosya uzantıları.
const VERI_UZANTILARI = ['xlsx', 'xls', 'xlsm', 'csv', 'db', 'sqlite', 'accdb', 'pdf']

// İçeriği taranmayacak ikili dosyalar (tarasak anlamsız eşleşme üretir).
const IKILI_UZANTILAR = [
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'bmp', 'webp', 'pdf', 'zip', 'rar', '7z',
  'exe', 'dll', 'node', 'woff', 'woff2', 'ttf', 'otf', 'mp4', 'mp3', 'xlsx', 'xls', 'db',
]

function uzanti(yol) {
  const ad = parcalar(yol).pop() || ''
  const i = ad.lastIndexOf('.')
  return i < 0 ? '' : ad.slice(i + 1)
}

/**
 * Dosya YOLU tek başına ihlal mi? İhlalse sebep metni, değilse null.
 */
function yolIhlali(yol) {
  const p = parcalar(yol)
  const ad = p[p.length - 1] || ''

  if (/^\.env(\.|$)/.test(ad)) return 'ortam dosyasi (.env) — API anahtarlari icerir'

  for (const k of GIZLI_KLASORLER) {
    if (p.includes(k)) return `sirket verisi klasoru: ${k}`
  }

  const uz = uzanti(yol)
  if (VERI_UZANTILARI.includes(uz)) return `veri dosyasi (.${uz}) — fiyat/musteri/fatura icerebilir`

  // Kök dizindeki jpeg/jpg = taranmış belge (irsaliye, fatura fotoğrafı).
  // Alt klasördeki görseller uygulama varlık dosyası olabilir, onlara dokunma.
  if (p.length === 1 && (uz === 'jpeg' || uz === 'jpg')) {
    return 'kok dizinde taranmis belge gorseli olabilir'
  }

  return null
}

// ── 2) İÇERİK KURALLARI ────────────────────────────────────────────────────

// TC kimlik no checksum'u. Bu olmadan "11 haneli sayı" kuralı her barkod/id
// listesinde yanlış alarm verirdi.
function tcGecerli(no) {
  const d = String(no).split('').map(Number)
  if (d.length !== 11 || d[0] === 0) return false
  const tek = d[0] + d[2] + d[4] + d[6] + d[8]
  const cift = d[1] + d[3] + d[5] + d[7]
  if ((tek * 7 - cift + 100) % 10 !== d[9]) return false
  const toplam = d.slice(0, 10).reduce((a, b) => a + b, 0)
  return toplam % 10 === d[10]
}

// Sıra önemli: en spesifik kural önce, sebep mesajı o kuraldan gelir.
const ICERIK_KURALLARI = [
  {
    sebep: 'JWT benzeri token (Supabase/Meta/ikas oturum jetonu)',
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/,
  },
  {
    // sb_publishable_ istemciye gömülmesi NORMAL olan anahtar; sadece gizli olanı yakala.
    sebep: 'Supabase gizli anahtari (sb_secret_)',
    re: /\bsb_secret_[A-Za-z0-9_-]{10,}/,
  },
  {
    sebep: 'GitHub erisim jetonu',
    re: /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/,
  },
  {
    sebep: 'Odeme saglayici canli anahtari (sk_live)',
    re: /\b[sr]k_live_[A-Za-z0-9]{10,}/,
  },
  {
    sebep: 'duz metin gizli anahtar/parola atamasi',
    // Anahtar adı + ':' veya '=' + tırnak içinde en az 16 karakterlik sabit değer.
    // Değişken referansı ("client_secret: ayarlar.x") tırnaksız olduğu için geçer.
    re: /\b(client_secret|api_secret|api_key|apikey|access_token|refresh_token|password|passwd|sifre|parola|secret)\b["']?\s*[:=]\s*["'][^"'\s${}]{16,}["']/i,
  },
  {
    sebep: 'TC kimlik numarasi (kisisel veri — KVKK)',
    re: /\b[1-9][0-9]{10}\b/,
    dogrula: tcGecerli,
  },
  {
    sebep: 'IBAN',
    re: /\bTR[0-9]{24}\b/,
  },
]

/**
 * Dosya İÇERİĞİNDE ihlal arar. [{satir, sebep}] döner.
 * Satırda `sizinti-tara: yok-say` yorumu varsa o satır atlanır (bilerek
 * örnek/test verisi barındıran satırlar için kaçış yolu).
 */
function icerikIhlalleri(yol, metin) {
  if (IKILI_UZANTILAR.includes(uzanti(yol))) return []
  if (typeof metin !== 'string' || metin.indexOf(String.fromCharCode(0)) >= 0) return []

  const bulunanlar = []
  const satirlar = metin.split(/\r?\n/)
  satirlar.forEach((satir, i) => {
    if (satir.includes('sizinti-tara: yok-say')) return
    for (const kural of ICERIK_KURALLARI) {
      const m = satir.match(kural.re)
      if (!m) continue
      if (kural.dogrula && !kural.dogrula(m[0])) continue
      bulunanlar.push({ satir: i + 1, sebep: kural.sebep })
    }
  })
  return bulunanlar
}

// ── 3) TOPLU TARAMA ────────────────────────────────────────────────────────

/**
 * @param {string[]} dosyalar taranacak yollar
 * @param {(yol:string)=>string|undefined} oku içeriği döner; okunamazsa undefined
 * @returns {{dosya:string,satir:number,sebep:string}[]}
 */
function tara(dosyalar, oku) {
  const sonuc = []
  for (const dosya of dosyalar) {
    const yolSebep = yolIhlali(dosya)
    if (yolSebep) {
      // Yol zaten ihlalse içeriği taramaya gerek yok; tek ve net mesaj daha iyi.
      sonuc.push({ dosya, satir: 0, sebep: yolSebep })
      continue
    }
    let icerik
    try { icerik = oku(dosya) } catch { icerik = undefined }
    // Okunamayan dosya = commit'te silinmiş dosya. Sessizce atla.
    if (icerik === undefined || icerik === null) continue
    for (const i of icerikIhlalleri(dosya, icerik)) {
      sonuc.push({ dosya, satir: i.satir, sebep: i.sebep })
    }
  }
  return sonuc
}

module.exports = { yolIhlali, icerikIhlalleri, tara, tcGecerli }

// ── CLI ────────────────────────────────────────────────────────────────────
// Kullanım:
//   node scripts/sizinti-tara.js <dosya> [dosya...]   belirtilen dosyaları tara
//   node scripts/sizinti-tara.js --tumu               tüm takipli dosyaları tara
if (require.main === module) {
  const fs = require('fs')
  const { execFileSync } = require('child_process')

  let dosyalar = process.argv.slice(2)
  if (dosyalar[0] === '--tumu') {
    dosyalar = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
  } else if (dosyalar[0] === '--stdin') {
    // pre-commit kancasi dosya adlarini NUL ile ayirarak verir: bosluklu ve
    // Turkce karakterli dosya adlari bozulmadan gelsin diye.
    const ham = fs.readFileSync(0, 'utf8')
    const AYIRAC = new RegExp('[' + String.fromCharCode(0) + String.fromCharCode(10) + String.fromCharCode(13) + ']')
    dosyalar = ham.split(AYIRAC).map((s) => s.trim()).filter(Boolean)
  }
  if (!dosyalar.length) process.exit(0)

  const oku = (yol) => {
    try { return fs.readFileSync(yol, 'utf8') } catch { return undefined }
  }
  const ihlaller = tara(dosyalar, oku)
  if (!ihlaller.length) process.exit(0)

  console.error('\n\x1b[41m\x1b[97m  SIZINTI RISKI — COMMIT DURDURULDU  \x1b[0m\n')
  for (const i of ihlaller) {
    const yer = i.satir ? `${i.dosya}:${i.satir}` : i.dosya
    console.error(`  \x1b[31mX\x1b[0m ${yer}`)
    console.error(`      ${i.sebep}`)
  }
  console.error([
    '',
    '  Bu repo PUBLIC. Yukaridaki dosyalar internete acilir ve gecmisten',
    '  silinmesi zordur.',
    '',
    '  Yapilacak:',
    '    1) Dosya sirket verisiyse -> .gitignore\'a ekle, sonra:',
    '                                 git restore --staged <dosya>',
    '    2) Anahtar/parola ise     -> .env\'e tasi, koddan cikar',
    '    3) Yanlis alarm ise       -> satir sonuna: // sizinti-tara: yok-say',
    '    4) Bilerek gecmek gerekiyorsa: git commit --no-verify',
    '',
  ].join('\n'))
  process.exit(1)
}
