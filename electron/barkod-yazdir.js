// Ürün barkod etiketi yazdırma.
// Renderer, JsBarcode ile etiketlerin HTML'ini üretip buraya gönderir; burada gizli bir
// BrowserWindow'da yüklenip yazıcıya basılır. 45mm x 20mm OS-214 plus etiketi içindir.
const { BrowserWindow, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const { htmlYukle } = require('./html-yukle')

// Varsayılan etiket ölçüsü (renderer boyut gönderirse o kullanılır — 40x20 XP-470B vb.)
const VARSAYILAN_GENISLIK_MM = 45
const VARSAYILAN_YUKSEKLIK_MM = 20

// Geçici gizli pencere oluşturup verilen iş ile çalıştırır, sonra kapatır.
async function gizliPencereyle(is) {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } })
  try {
    return await is(win)
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

// wmic CSV çıktısını ayrıştırır. Kolonlar ALFABETİK sıralanır: Node,Default,Name.
// Yazıcı adı virgül içerebilir → Name = 2. virgülden sonrasının tamamı.
function _wmicCsvAyristir(metin) {
  const sonuc = []
  for (const ham of metin.split(/\r?\n/)) {
    const satir = ham.trim()
    if (!satir || satir.startsWith('Node,')) continue
    const ilk = satir.indexOf(',')
    const iki = satir.indexOf(',', ilk + 1)
    if (ilk < 0 || iki < 0) continue
    const varsayilan = /^true$/i.test(satir.slice(ilk + 1, iki).trim())
    const ad = satir.slice(iki + 1).trim()
    if (ad) sonuc.push({ ad, aciklama: ad, varsayilan })
  }
  return sonuc
}

// wmic yönlendirilen çıktıyı çoğu sistemde UTF-16LE (BOM'lu) yazar; düz utf8 okunursa
// her harfin arasına \0 girer ve ayrıştırma bozulur. BOM'a bakıp doğru çöz.
function _bufferCoz(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le')
  if (buf.includes(0)) return buf.toString('utf16le')
  return buf.toString('utf8')
}

// YEDEK YOL — Chromium getPrintersAsync bazı sistemlerde (özellikle Win7 + kimi termal
// yazıcı sürücüleri, 2026-08-13 mağaza kasası) yüklü yazıcıyı görmez ve BOŞ liste döner.
// Windows'un kendi envanterinden sor: önce wmic (Win7'de her zaman var, Win11'de
// kaldırılmış olabilir), o yoksa Windows PowerShell WMI (5.1 her Windows'ta var).
function _windowsYazicilari() {
  const { execFile } = require('child_process')
  const calistir = (cmd, args) => new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, encoding: 'buffer', timeout: 15000 },
      (err, stdout) => resolve(err ? null : _bufferCoz(stdout)))
  })
  return calistir('wmic', ['printer', 'get', 'Name,Default', '/format:csv'])
    .then((csv) => {
      if (csv) return _wmicCsvAyristir(csv)
      // wmic yok/başarısız → PowerShell WMI. CSV başlıksız üretilir (ConvertTo-Csv Win7
      // PS 2.0'da -NoTypeInformation ister, uğraşmaya değmez; kendimiz biçimleriz).
      return calistir('powershell.exe', ['-NoProfile', '-Command',
        "Get-WmiObject Win32_Printer | ForEach-Object { 'PC,' + $_.Default + ',' + $_.Name }"])
        .then((cikti) => (cikti ? _wmicCsvAyristir(cikti) : []))
    })
    .catch(() => [])
}

// Sistemdeki yazıcıları listeler (etiket yazıcısını seçtirmek için).
async function yazicilariGetir() {
  const liste = await gizliPencereyle(async (win) => {
    const yazicilar = await win.webContents.getPrintersAsync()
    return yazicilar.map(y => ({
      ad: y.name,
      aciklama: y.displayName || y.description || y.name,
      varsayilan: !!y.isDefault,
    }))
  })
  if (liste.length || process.platform !== 'win32') return liste
  return _windowsYazicilari()
}

// Verilen HTML etiketlerini yazdırır.
// yazici verilirse o yazıcıya sessizce basar; verilmezse sistem yazdırma diyaloğu açılır.
async function barkodYazdir({ html, yazici, genislikMm, yukseklikMm }) {
  if (!html) throw new Error('Yazdırılacak etiket içeriği boş')
  // Sayfa boyutu etiketle AYNI olmalı — 40mm etikete 45mm sayfa gönderilirse
  // bazı sürücüler (XP-470B) işi sessizce reddediyor/kaydırıyor.
  const gen = Math.round((Number(genislikMm) || VARSAYILAN_GENISLIK_MM) * 1000)
  const yuk = Math.round((Number(yukseklikMm) || VARSAYILAN_YUKSEKLIK_MM) * 1000)
  return gizliPencereyle(async (win) => {
    await htmlYukle(win, html)
    await new Promise((resolve, reject) => {
      const secenekler = {
        silent: !!yazici,
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: { width: gen, height: yuk },
      }
      if (yazici) secenekler.deviceName = yazici
      win.webContents.print(secenekler, (success, failureReason) => {
        if (!success && failureReason && failureReason !== 'cancelled') {
          reject(new Error(`Barkod yazdırma hatası: ${failureReason}`))
        } else {
          resolve()
        }
      })
    })
    return { yazdirildi: true }
  })
}

// Verilen HTML'i görünür bir pencerede açar (kargo etiketi önizleme + yazdırma).
// Pencere içindeki "Yazdır" butonu window.print() çağırır.
//
// TEK PENCERE YENİDEN KULLANILIR (2026-08-04). Eskiden her çağrı YENİ bir pencere
// açıyordu ve pencere kullanıcı elle kapatana kadar duruyordu — arka arkaya 5 etiket
// önizleyen personelde 5 renderer süreci birikiyordu (ölçülen maliyet pencere başına
// ~50 MB). main.js'teki dış bağlantı penceresiyle aynı desen: yenisini açmak
// öncekinin yerine geçer.
let onizlemePencere = null
// Açık önizlemenin önerilecek PDF adı ('kargo-etiket:pdf' bunu kullanır). Pencere
// yeniden kullanıldığı için her açılışta tazelenir.
let onizlemeDosyaAdi = ''

// Windows dosya adında yasak karakterleri atar; boşsa yedek ada düşer.
function _pdfDosyaAdi(ad) {
  const temiz = String(ad || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return (temiz || 'etiket') + '.pdf'
}

async function onizlemeAc({ html, baslik, dosyaAdi }) {
  if (!html) throw new Error('Önizlenecek içerik boş')
  // Geçici HTML dosyasının adı = belgenin adı: "Microsoft Print to PDF" kaydetme
  // kutusunu buradan doldurur (bkz. html-yukle.js).
  const adKoku = dosyaAdi || baslik
  if (onizlemePencere && !onizlemePencere.isDestroyed()) {
    await htmlYukle(onizlemePencere, html, adKoku)
    // Başlık yüklemeden SONRA: HTML'in kendi <title>'ı varsa yükleme sırasında
    // pencere başlığını ezer, önce yazsaydık kaybolurdu.
    onizlemePencere.setTitle(baslik || 'Önizleme')
    onizlemeDosyaAdi = adKoku || ''
    if (onizlemePencere.isMinimized()) onizlemePencere.restore()
    onizlemePencere.focus()
    return { acildi: true }
  }
  onizlemePencere = new BrowserWindow({
    width: 820, height: 1000, title: baslik || 'Önizleme',
    autoHideMenuBar: true,
    // Dar preload: önizleme penceresine yalnız "PDF kaydet" açılır, ana pencerenin
    // tüm IPC yüzeyi DEĞİL (bkz. onizleme-preload.js).
    webPreferences: { offscreen: false, preload: path.join(__dirname, 'onizleme-preload.js') },
  })
  onizlemePencere.on('closed', () => { onizlemePencere = null; onizlemeDosyaAdi = '' })
  await htmlYukle(onizlemePencere, html, adKoku)
  onizlemeDosyaAdi = adKoku || ''
  return { acildi: true }
}

// Önizlemedeki belgeyi doğrudan PDF'e yazar. Yazıcı iletişim kutusundan geçmediği için
// dosya adı BİZİM elimizdedir — kullanıcının şikâyeti tam buydu: "Print to PDF"
// kaydetme kutusu adı boş geliyordu.
async function onizlemePdfKaydet() {
  if (!onizlemePencere || onizlemePencere.isDestroyed()) {
    throw new Error('Önizleme penceresi kapalı.')
  }
  const sonuc = await dialog.showSaveDialog(onizlemePencere, {
    title: 'Kargo Etiketi PDF Kaydet',
    defaultPath: _pdfDosyaAdi(onizlemeDosyaAdi),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (sonuc.canceled || !sonuc.filePath) return { kaydedildi: false }
  const pdf = await onizlemePencere.webContents.printToPDF({
    printBackground: true, pageSize: 'A4', margins: { marginType: 'default' },
  })
  fs.writeFileSync(sonuc.filePath, pdf)
  // KVKK denetim kaydı: etiket müşteri adı/adresi taşır, dosya olarak programdan çıktı
  // (istek-pdf.js ile aynı desen).
  try {
    const d = require('./db/disa-aktarim-canli')
    d._kaydet({ tur: d._TURLER.PDF, kapsam: 'kargo etiketi', kayit_sayisi: null,
      dosya_adi: path.basename(sonuc.filePath) })
  } catch {}
  return { kaydedildi: true, yol: sonuc.filePath }
}

module.exports = {
  _wmicCsvAyristir,
  _bufferCoz,
  'barkod:yazicilar': () => yazicilariGetir(),
  'barkod:yazdir': ({ html, yazici, genislikMm, yukseklikMm }) => barkodYazdir({ html, yazici, genislikMm, yukseklikMm }),
  _pdfDosyaAdi,
  'kargo-etiket:onizle': ({ html, baslik, dosyaAdi }) => onizlemeAc({ html, baslik, dosyaAdi }),
  'kargo-etiket:pdf': () => onizlemePdfKaydet(),
}
