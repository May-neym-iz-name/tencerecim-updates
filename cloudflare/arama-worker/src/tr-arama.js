// Türkçe arama normalizasyonu. Prototipteki ara-cekirdek-v2.mjs ile AYNI mantık
// olmak zorunda — burada farklılaşırsa yereldeki test sonuçları canlıyı temsil etmez.
//
// Harf KATLAMA şart: toLocaleLowerCase('tr') yetmez, "duduklu" ile "düdüklü"
// ancak ü→u, ı→i katlanınca eşleşir. Müşteri şapkasız yazıyor.
export const trNormal = (s) => String(s || '')
  .toLocaleLowerCase('tr')
  .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
  .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, ' ').trim()

// Anlamsız bağlaçlar. Katalogda geçmeyen tek bir "ve" AND aramasında tüm
// sonucu siliyordu — bu liste o tuzağın kalıcı çözümü.
export const DOLGU = new Set('ve ile için icin bir bu su o da de mi bana en cok gibi lazim'.split(' '))
