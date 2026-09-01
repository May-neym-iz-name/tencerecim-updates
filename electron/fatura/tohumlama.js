// Fatura stoğu AÇILIŞ BAKİYESİ hazırlığı (Faz 2 / Task 9) — SAF mantık, IO yok.
//
// NEDEN: fatura stoğu sıfırdan başlarsa Faz 2 açıldığı gün her ürün "fatura
// stoğu yok" diye kilitlenir. Açılış, alış faturalarının zaten durduğu
// Bizimhesap'tan alınır.
//
// KAYNAK (01.09.2026 kullanıcı kararı): Bizimhesap `products[].quantity`.
// Canlıda doğrulandı: bu alan iki deponun (Pendik + Gölcük) `inventory`
// toplamına BİREBİR eşit (3.437 = 3.437, 266 üründe sıfır fark) — yani tek
// çağrı yeterli, depo depo gezmeye gerek yok.
//
// Eşleştirme YALNIZ SKU ile: Bizimhesap'ın `code` alanı bizim SKU'muzdur
// ([[sku-tek-kaynak-kurali]]). Ad ile eşleştirme yapılmaz — yanlış ürüne açılış
// bakiyesi yazmak, sonradan o ürüne haksız fatura kesilmesine yol açar.

const anahtar = (s) => String(s == null ? '' : s).trim().toUpperCase()

/**
 * @param {Array<{code: string, quantity: number|string, title: string}>} bizimhesapUrunler
 * @param {Array<{sku: string, senk_id: string|null, ad: string}>} yerelUrunler
 * @returns {{kalemler: Array<{urun_senk_id: string, miktar: number}>, rapor: object}}
 */
function tohumKalemleriKur(bizimhesapUrunler, yerelUrunler) {
  const yerel = new Map()
  for (const y of (yerelUrunler || [])) {
    const a = anahtar(y.sku)
    if (a) yerel.set(a, y)
  }

  const toplamlar = new Map()   // senk_id -> adet
  const rapor = {
    eslesen: 0,
    stoksuz: 0,                 // Bizimhesap'ta miktarı yok/0 — açılış yazılmaz
    kodsuz: [],                 // Bizimhesap ürününde stok kodu boş
    bizdeYok: [],               // SKU uygulamada yok
    senkBekleyen: [],           // yerel ürünün bulut kimliği (senk_id) yok
    toplamAdet: 0,
  }

  for (const u of (bizimhesapUrunler || [])) {
    const kod = anahtar(u.code)
    if (!kod) { rapor.kodsuz.push(u.title || '(adsız)'); continue }

    // qty/quantity metin olarak dönüyor (canlı yanıt); fatura stoğu ADET tutar.
    const miktar = Math.floor(Number(u.quantity))
    if (!Number.isFinite(miktar) || miktar <= 0) { rapor.stoksuz++; continue }

    const y = yerel.get(kod)
    if (!y) { rapor.bizdeYok.push(`${String(u.code).trim()} — ${u.title || ''}`.trim()); continue }
    if (!y.senk_id) {
      // Sessizce atlamak yerine söyle: senkron tamamlanınca tekrar çalıştırılabilir.
      if (!rapor.senkBekleyen.includes(`${y.sku} — ${y.ad}`)) {
        rapor.senkBekleyen.push(`${y.sku} — ${y.ad}`)
      }
      continue
    }

    // Aynı SKU birden çok Bizimhesap satırında gelebilir (varyant/mükerrer kayıt).
    toplamlar.set(y.senk_id, (toplamlar.get(y.senk_id) || 0) + miktar)
    rapor.eslesen++
    rapor.toplamAdet += miktar
  }

  const kalemler = [...toplamlar.entries()].map(([urun_senk_id, miktar]) => ({ urun_senk_id, miktar }))
  return { kalemler, rapor }
}

module.exports = { tohumKalemleriKur, _anahtar: anahtar }
