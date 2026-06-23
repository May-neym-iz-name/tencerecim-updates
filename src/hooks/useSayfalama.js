import { useState, useEffect, useMemo } from 'react'

// İstemci tarafı sayfalama: bir diziyi sayfalara böler, sayfa boyutunu kullanıcı
// seçer. Filtre/veri değişince güvenli şekilde geçerli sayfaya sıkıştırır.
export const SAYFA_BOYUT_SECENEKLERI = [25, 50, 100, 250]

export function useSayfalama(veri, varsayilanBoyut = 50) {
  const liste = Array.isArray(veri) ? veri : []
  const [sayfa, setSayfa] = useState(1)
  const [boyut, setBoyutRaw] = useState(varsayilanBoyut)

  const toplam = liste.length
  const toplamSayfa = Math.max(1, Math.ceil(toplam / boyut))
  const aktifSayfa = Math.min(sayfa, toplamSayfa)

  // Geçerli sayfa toplam sayfa sayısını aşarsa düzelt.
  useEffect(() => {
    if (sayfa > toplamSayfa) setSayfa(toplamSayfa)
  }, [toplamSayfa, sayfa])

  const setBoyut = (b) => { setBoyutRaw(Number(b) || varsayilanBoyut); setSayfa(1) }

  const dilim = useMemo(() => {
    const bas = (aktifSayfa - 1) * boyut
    return liste.slice(bas, bas + boyut)
  }, [liste, aktifSayfa, boyut])

  return { dilim, sayfa: aktifSayfa, setSayfa, boyut, setBoyut, toplam, toplamSayfa }
}
