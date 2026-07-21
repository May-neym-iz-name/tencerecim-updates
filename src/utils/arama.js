// Türkçe duyarsız, KELİME BAZLI arama — ön yüz (ESM) kopyası.
//
// Bu dosya electron/db/tr-arama.js'in İKİZİDİR ve onunla AYNI kalmalıdır.
// Neden iki kopya: Electron ana süreci CJS (require), Vite/React ise ESM (import)
// istiyor; tek dosya ikisinde birden paylaşılamıyor. Aynı kaldıklarını
// src/utils/arama-paritesi.test.js doğrular (emsal: yetki.js / izinler.js paritesi).
//
// Ayrıntılı gerekçe (Türkçe "I sorunu" ve kelime sırası) için ikiz dosyaya bakın.
// Özet: "LINES" → toLocaleLowerCase('tr') ile "lınes" olur ve "LİNES"i BULAMAZ,
// bu yüzden locale yerine harf KATLAMA kullanıyoruz.

const HARF = {
  'ı': 'i', 'İ': 'i', 'I': 'i',
  'ş': 's', 'Ş': 's',
  'ğ': 'g', 'Ğ': 'g',
  'ü': 'u', 'Ü': 'u',
  'ö': 'o', 'Ö': 'o',
  'ç': 'c', 'Ç': 'c',
  'â': 'a', 'Â': 'a', 'î': 'i', 'Î': 'i', 'û': 'u', 'Û': 'u',
}

export function trNormal(s) {
  if (s == null) return ''
  let out = ''
  for (const ch of String(s)) out += (HARF[ch] !== undefined ? HARF[ch] : ch)
  return out.toLowerCase()
}

export function kelimeler(s) {
  return trNormal(s).split(/\s+/).filter(Boolean)
}

/**
 * Metin, aramanın TÜM kelimelerini (sıradan bağımsız) içeriyor mu?
 * Birden çok alanda aramak için alanları boşlukla birleştirip verin:
 *   eslesirMi([u.ad, u.barkod, u.sku].join(' '), arama)
 */
export function eslesirMi(metin, arama) {
  const ks = kelimeler(arama)
  if (!ks.length) return true
  const hedef = trNormal(metin)
  return ks.every((k) => hedef.includes(k))
}
