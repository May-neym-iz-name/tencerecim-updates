// ÜRETİLEN METNİN DOĞRULUK DENETİMİ — saf, ağa çıkmaz.
//
// Gemini'ye "kaynakta olmayanı yazma" demek yeterli DEĞİLDİR; talimat bir dilek,
// denetim bir ölçümdür. Bu dosya yazılan metni kaynağa karşı sınar.
//
// TEMEL KURAL: yeni metindeki her DOĞRULANABİLİR İDDİA kaynakta (ürün açıklaması
// + ürün adı) desteklenmelidir. Desteklenmiyorsa uydurmadır ve bildirilir.
//
// Neyi denetliyoruz, neyi denetlemiyoruz — dürüst sınır:
//  ✔ SAYILAR (34, 7 lt, 304, 18/10) — ölçü/kapasite/kalite uydurması en tehlikelisi
//  ✔ TEKNİK İDDİA SÖZCÜKLERİ (indüksiyon, garanti, paslanmaz, bulaşık makinesi...)
//  ✘ Üslup, akıcılık, pazarlama sıfatı — bunlar doğruluk sorunu değil, insan bakar.
// Yani "bulgu yok" = "uydurma SAYI/İDDİA yok" demektir, "metin kusursuz" demek DEĞİL.

// Denetlenen teknik iddialar. Kaynakta geçmiyorsa yazılamaz.
const IDDIA_SOZCUKLERI = [
  'indüksiyon', 'induksiyon',
  'garanti',
  'paslanmaz', 'çelik', 'inox',
  'bulaşık makinesi', 'bulasik makinesi',
  'fırına', 'fırın', 'firina',
  'bpa',
  'teflon', 'granit', 'döküm', 'dokum',
  'mikrodalga',
]

// Türkçe küçük harfe çevirir (I/İ tuzağı).
const kucuk = (s) => String(s || '').toLocaleLowerCase('tr')

// ROZET SATIRINI ÇIKARIR — denetim yalnız GEMINI METNİNE bakmalı.
//
// 11.09: geriye dönük denetim 10 üründe de "garanti desteksiz" dedi. Yanlış alarmdı:
// "2 Yıl Garanti" Gemini'nin yazdığı bir şey değil, sınıflandırmadan gelen ROZET.
// Rozetler kaynaktan değil mağaza politikasından türer, kaynağa karşı denetlenemez.
// (Canlı yazma kapısı zaten yalnız Gemini alanlarına bakıyor; bu yalnız `dogrula` içindir.)
function rozetleriCikar(html) {
  return String(html || '').replace(/<div style="display:flex[\s\S]*?<\/div>\s*$/i, ' ')
}

// HTML'i düz metne indirger.
function duzMetin(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// Metindeki sayıları çıkarır. "18/10" ve "35x25" gibi bileşikler parçalarına ayrılır,
// çünkü kaynakta "35x25" yazarken metinde "35 cm" geçmesi meşrudur.
function sayilar(metin) {
  const bulunan = new Set()
  for (const eslesme of String(metin || '').matchAll(/\d+(?:[.,]\d+)?/g)) {
    const ham = eslesme[0].replace(',', '.')
    const n = Number(ham)
    if (!Number.isFinite(n)) continue
    // 1 ve 2 gibi küçük sayılar ("1 adet", "2 kulp") gürültü üretir; ölçü değiller.
    if (n <= 2) continue
    bulunan.add(n)
  }
  return bulunan
}

/**
 * Üretilen metni kaynağa karşı denetler.
 * @param {string} uretilen  Gemini'nin ürettiği düz metin (seo + bölümler)
 * @param {string} kaynak    Orijinal ürün açıklaması (HTML olabilir)
 * @param {string} ad        Ürün adı — ölçüler çoğu zaman burada
 * @returns {{temiz: boolean, bulgular: string[]}}
 */
function denetle(uretilen, kaynak, ad = '') {
  const yeni = duzMetin(uretilen)
  const dayanak = duzMetin(kaynak) + ' ' + String(ad || '')
  const dayanakKucuk = kucuk(dayanak)
  const bulgular = []

  // 1) SAYI DENETİMİ
  const dayanakSayilar = sayilar(dayanak)
  for (const n of sayilar(yeni)) {
    if (!dayanakSayilar.has(n)) {
      bulgular.push(`UYDURMA SAYI: "${n}" yeni metinde var, kaynakta ve ürün adında YOK`)
    }
  }

  // 2) TEKNİK İDDİA DENETİMİ
  const yeniKucuk = kucuk(yeni)
  for (const soz of IDDIA_SOZCUKLERI) {
    if (yeniKucuk.includes(soz) && !dayanakKucuk.includes(soz)) {
      bulgular.push(`DESTEKSİZ İDDİA: "${soz}" yeni metinde geçiyor, kaynakta YOK`)
    }
  }

  // 3) FİYAT/KAMPANYA SIZINTISI — hiçbir koşulda yazılmamalı.
  // DİKKAT: \b kullanılmaz — JS regex'inde ü/ç/ş kelime karakteri SAYILMAZ,
  // "\bücretsiz" hiçbir zaman eşleşmez (11.09'da test bunu yakaladı).
  // "tl" için sayı/boşluk bağlamı aranır ki "kontrol" gibi sözcükler eşleşmesin.
  if (/\d\s*(tl|₺)|₺|indirim|kampanya|ücretsiz kargo|ucretsiz kargo|bedava/i.test(yeni)) {
    bulgular.push('FİYAT/KAMPANYA İFADESİ: açıklamada fiyat veya kampanya sözü olmamalı')
  }

  return { temiz: bulgular.length === 0, bulgular }
}

module.exports = { denetle, duzMetin, sayilar, rozetleriCikar, IDDIA_SOZCUKLERI }
