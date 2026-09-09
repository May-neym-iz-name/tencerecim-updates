// Hediye kuponu mesajı — şablon + ikas kampanyası + kupon → metin. SAF (sablon-mesaj.js deseni).
// Sınır 1000 karakter: aşarsa KESMİYORUZ, asildi=true (yarım kupon mesajı gitmesin).
const MAKS_KARAKTER = 1000

const VARSAYILAN_SABLON = [
  'Merhaba! 🎁 Size özel hediye kuponunuz hazır.',
  '',
  'Kupon kodu: {kod}',
  'İndirim: {indirim}',
  'Son kullanım: {bitis}',
  'Minimum sepet tutarı: {min_tutar}',
  '',
  'Nasıl kullanılır?',
  '1) {site} adresine girin, ürünlerinizi sepete ekleyin.',
  '2) Ödeme sayfasında "İndirim kodu" kutusuna kodu yazıp "Uygula"ya basın.',
  '3) İndirim sepet toplamından düşer.',
  '',
  'Kod tek kullanımlıktır. Sorunuz olursa buradan yazabilirsiniz.',
].join('\n')

const tl = (n) => `${Number(n).toLocaleString('tr-TR')} TL`

function indirimMetni(k) {
  if (!k) return ''
  const fd = k.fixedDiscount || {}
  switch (k.type) {
    case 'RATIO': return fd.amount != null ? `%${Number(fd.amount).toLocaleString('tr-TR')}` : 'İndirim'
    case 'FIXED_AMOUNT': return fd.amount != null ? tl(fd.amount) : 'İndirim'
    case 'FREE_SHIPPING': return 'Ücretsiz kargo'
    case 'BUY_X_THEN_GET_Y': {
      const b = k.buyXThenGetY || {}; const x = b.buyX || {}; const y = b.getY || {}
      if (Number(y.discountRatio) === 100) return `${x.amount} al ${y.amount} bedava`
      return `${x.amount} al ${y.amount} tanesi %${y.discountRatio} indirimli`
    }
    default: return k.title || 'İndirim'
  }
}

function tarihTr(ms) {
  if (!ms) return ''
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

function kuponMesaji({ sablonMetni, kampanya, kupon, site }) {
  const fd = (kampanya && kampanya.fixedDiscount) || {}
  const degerler = {
    kod: (kupon && kupon.code) || '',
    indirim: indirimMetni(kampanya),
    bitis: tarihTr(kampanya && kampanya.dateRange && kampanya.dateRange.end),
    min_tutar: fd.priceRange && fd.priceRange.min != null ? tl(fd.priceRange.min) : '',
    site: site || '',
  }
  const satirlar = String(sablonMetni || '').split('\n').filter(satir => {
    // Satırdaki yer tutuculardan biri boş değer alıyorsa satırı at (bitişsiz kampanyada "Son kullanım:" kalmasın).
    const bosVar = ['bitis', 'min_tutar'].some(k => satir.includes(`{${k}}`) && !degerler[k])
    return !bosVar
  })
  const metin = satirlar.join('\n').replace(/\{(kod|indirim|bitis|min_tutar|site)\}/g, (_, k) => degerler[k])
  return { metin, asildi: metin.length > MAKS_KARAKTER }
}

module.exports = { MAKS_KARAKTER, VARSAYILAN_SABLON, indirimMetni, kuponMesaji }
