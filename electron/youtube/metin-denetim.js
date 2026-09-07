// Yayin oncesi metin denetimi — MUTLAK IDDIA avcisi.
//
// NEDEN VAR: yasak, metni ureten istemde yaziliydi ve model ONA UYMADI
// (2026-09-07: "Cizilmez ve Yapismaz Hibrit Teknoloji", "Patlama Riski Olmayan
// Tasarim"). Dahasi kural, betik yenilenirken eski dosyada unutulmustu.
// Istem bir RICADIR; bu modul bir KAPIDIR. Model istemi ihlal edebilir, regex edemez.
//
// Metinler gercek bir isletmenin herkese acik kanalinda yayinlanir: dogrulanmamis
// mutlak iddia yaniltici reklamdir.
//
// SAF MODUL: I/O yok, ag yok. Tek isi metne bakip bulgu listesi dondurmek.

/**
 * Turkce duyarli harf katlama.
 * Duz toLowerCase() 'I' harfini 'i' yapar ve "CIZILMEZ" kalibi kacar;
 * 'İ' ise noktali kalir. Once Turkce'ye ozgu iki harf elle esitlenir.
 */
function katla(metin) {
  return String(metin || '')
    .replace(/I/g, 'ı')
    .replace(/İ/g, 'i')
    .toLocaleLowerCase('tr')
}

// Yasak GOVDELER acikca sayilir — EK KALIBINA gore arama YAPILMAZ.
// '-maz' ekine gore arasaydik "paslanmaz celik" (malzeme adi) ve "yapismaz
// yuzey" (sektorun standart terimi) da yakalanirdi. Ikisi de mesru.
const YASAKLAR = [
  // Mutlak dayaniklilik — olculemez, urun bunu vaat etmiyor.
  { kalip: /çizilme(z|yen)/, sinif: 'dayaniklilik', oneri: '"çizilmeye dayanıklı" de' },
  // Ayni iddianin dolayli kalibi: "cizilme ... YAPMAZ". Ilk liste bunu kacirdi
  // ve "Cizilme ve Yapisma Yapmaz" basligi denetimden gecti (07.09).
  // Iddia ayni; yalnizca fiil degismis.
  { kalip: /çizilme( ve yapışma)? yapma(z|yan)/, sinif: 'dayaniklilik', oneri: '"çizilmeye dirençli" de' },
  { kalip: /kırılma(z|yan)/, sinif: 'dayaniklilik', oneri: '"darbeye dayanıklı" de' },
  { kalip: /(^|\W)yanma(z|yan)/, sinif: 'dayaniklilik', oneri: '"yüksek ısıya dayanıklı" de' },
  { kalip: /bozulma(z|yan)/, sinif: 'dayaniklilik', oneri: '"uzun ömürlü" de' },
  { kalip: /deforme olma(z|yan)/, sinif: 'dayaniklilik', oneri: '"formunu korur" de' },
  { kalip: /ömür boyu/, sinif: 'dayaniklilik', oneri: 'süre vaat etme' },
  // 07.09'da modelin urettigi ve ILK listeyi asan iddialar. Ucu de olculemez:
  // "Kararmaz, leke tutmaz ve koku yapmaz celik yapisiyla..."
  { kalip: /kararma(z|yan)/, sinif: 'dayaniklilik', oneri: '"parlaklığını korur" de' },
  { kalip: /leke tutma(z|yan)/, sinif: 'dayaniklilik', oneri: '"kolay temizlenir" de' },
  { kalip: /koku (yapma(z|yan)|tutma(z|yan))/, sinif: 'dayaniklilik', oneri: 'koku iddiası yazma' },

  // Guvenlik iddiasi — en agiri. Yanlis cikarsa zarar fiziksel olur.
  { kalip: /patlama(z|yan)/, sinif: 'guvenlik', oneri: 'güvenlik vaadi verme' },
  { kalip: /patlama riski (olmayan|yok)/, sinif: 'guvenlik', oneri: 'emniyet mekanizmasını TARIF et, risk yok deme' },
  { kalip: /risksiz|tehlikesiz/, sinif: 'guvenlik', oneri: 'güvenlik vaadi verme' },
  { kalip: /(sağlığa )?zararsız/, sinif: 'saglik', oneri: 'sağlık iddiası yazma' },
  { kalip: /kanserojen değil/, sinif: 'saglik', oneri: 'sağlık iddiası yazma' },

  // Abarti — dogrulanamaz ustunluk.
  { kalip: /(türkiye'?nin|dünya(nın)?) en /, sinif: 'abarti', oneri: 'üstünlük iddiası yazma' },
  { kalip: /(^|\W)en iyi(si)?(\W|$)/, sinif: 'abarti', oneri: 'üstünlük iddiası yazma' },
  { kalip: /eşsiz|rakipsiz|mükemmel|efsane/, sinif: 'abarti', oneri: 'ürünü TARIF et, övme' },

  // Kesinlik zarflari — cumleyi mutlak iddiaya cevirirler.
  { kalip: /(^|\W)asla(\W|$)/, sinif: 'kesinlik', oneri: '"asla" yerine koşulu yaz' },
  { kalip: /%\s?100/, sinif: 'kesinlik', oneri: 'oran iddiası yazma' },
  { kalip: /garantili sonuç|kesin sonuç/, sinif: 'kesinlik', oneri: 'sonuç vaat etme' },
]

/** Metindeki yasak iddialari bulur. Bulunan ifadeyi de dondurur ki rapor somut olsun. */
function yasakBul(metin) {
  const k = katla(metin)
  const bulgular = []
  for (const y of YASAKLAR) {
    const m = k.match(y.kalip)
    if (m) bulgular.push({ ifade: m[0].trim(), sinif: y.sinif, oneri: y.oneri })
  }
  return bulgular
}

/**
 * Bir YouTube metnini butun olarak denetler.
 * Etiketler de taranir: etiket de yayinlanan metindir.
 */
function denetle(metin = {}) {
  const parcalar = [
    ['baslik', metin.baslik],
    ['aciklama', metin.aciklama],
    ['etiketler', (metin.etiketler || []).join(' ')],
  ]
  const bulgular = []
  for (const [alan, deger] of parcalar) {
    for (const b of yasakBul(deger)) bulgular.push({ alan, ...b })
  }
  return { temiz: bulgular.length === 0, bulgular }
}

/** Raporu tek satirlik okunur metne cevirir. */
function ozet(bulgular) {
  return bulgular
    .map(b => `${b.alan}: "${b.ifade}" (${b.sinif}) → ${b.oneri}`)
    .join('; ')
}

module.exports = { katla, yasakBul, denetle, ozet, YASAKLAR }
