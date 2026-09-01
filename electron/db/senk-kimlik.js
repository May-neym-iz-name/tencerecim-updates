// Yerel senk_id ile bulut uuid'sini KIYASLANABİLİR hale getirir.
//
// 🔴 NEDEN GEREKLİ (01.09.2026'da canlıda yaşandı): yerel SQLite `senk_id`'yi
// 32 haneli TİRESİZ metin olarak üretiyor:
//     8e109721a3730efcfcf45126842f5606
// Postgres'in `uuid` tipi bu metni kabul ediyor ama depolarken/döndürürken
// KANONİK TİRELİ biçime çeviriyor:
//     8e109721-a373-0efc-fcf4-5126842f5606
//
// Kıyaslama Postgres'in İÇİNDE yapıldığı sürece (RPC'ler, stok düşümü) sorun yok;
// ikisi de uuid. Ama JS tarafında `Map.get()` ile eşleştirince HİÇBİR ZAMAN
// tutmuyor — fatura stoğu bulutta 238 satır olduğu hâlde ekranda her ürün 0
// görünüyordu ve hata hiçbir yerde patlamıyordu, sessizce yanlış cevap veriyordu.
//
// Kural: bulut kimliğiyle yerel kimliği eşleştiren HER yerde iki tarafa da bunu uygula.

/**
 * @param {string|null|undefined} deger
 * @returns {string} tiresiz, küçük harfli kimlik; geçersizse ''
 */
function kimlikAnahtari(deger) {
  if (deger == null) return ''
  return String(deger).trim().toLowerCase().replace(/-/g, '')
}

/** Anahtarları normalize edilmiş Map kurar. */
function kimlikHaritasi(satirlar, anahtarAlani, deger) {
  const harita = new Map()
  for (const s of satirlar || []) {
    const a = kimlikAnahtari(s && s[anahtarAlani])
    if (a) harita.set(a, typeof deger === 'function' ? deger(s) : s)
  }
  return harita
}

module.exports = { kimlikAnahtari, kimlikHaritasi }
