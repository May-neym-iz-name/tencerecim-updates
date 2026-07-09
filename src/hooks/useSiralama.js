import { useState, useMemo } from 'react'

// İstemci tarafı sütun sıralaması. Başlığa tıklayınca: yok → artan → azalan → yok.
// deger(satir, anahtar) opsiyonel: iç içe/türetilmiş alanları çıkarır (örn. marka adı).
// Türkçe metinlerde localeCompare('tr'), sayı ve tarihlerde doğal karşılaştırma.
export function useSiralama(veri, { baslangic = null, yon = 'asc', deger } = {}) {
  const liste = Array.isArray(veri) ? veri : []
  const [anahtar, setAnahtar] = useState(baslangic)
  const [siraYon, setSiraYon] = useState(yon)

  // Başlık tıklaması: aynı sütun → yön çevir → üçüncü tıkta sıralamayı kaldır.
  function sirala(k) {
    if (anahtar !== k) { setAnahtar(k); setSiraYon('asc'); return }
    if (siraYon === 'asc') { setSiraYon('desc'); return }
    setAnahtar(null); setSiraYon('asc') // sıralamayı kapat (orijinal sıra)
  }

  const al = (satir) => (deger ? deger(satir, anahtar) : satir[anahtar])

  const sirali = useMemo(() => {
    if (!anahtar) return liste
    const kat = siraYon === 'asc' ? 1 : -1
    const kopya = [...liste]
    kopya.sort((a, b) => {
      let x = al(a), y = al(b)
      // Boşlar en sona (yön ne olursa olsun).
      const xBos = x === null || x === undefined || x === ''
      const yBos = y === null || y === undefined || y === ''
      if (xBos && yBos) return 0
      if (xBos) return 1
      if (yBos) return -1
      // Sayısal karşılaştırma (fiyat/stok/adet).
      const xn = typeof x === 'number' ? x : Number(String(x).replace(',', '.'))
      const yn = typeof y === 'number' ? y : Number(String(y).replace(',', '.'))
      if (!Number.isNaN(xn) && !Number.isNaN(yn) && String(x).trim() !== '' && String(y).trim() !== '') {
        return (xn - yn) * kat
      }
      return String(x).localeCompare(String(y), 'tr', { numeric: true }) * kat
    })
    return kopya
  }, [liste, anahtar, siraYon]) // eslint-disable-line react-hooks/exhaustive-deps

  return { sirali, anahtar, siraYon, sirala }
}
