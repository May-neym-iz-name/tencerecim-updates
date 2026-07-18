import { useState, useEffect } from 'react'

/**
 * Değeri geciktirerek döndürür — arama kutularında her tuş vuruşunda sorgu atılmasını önler.
 *
 * Neden gerekli: arama state'i doğrudan yükleme fonksiyonunun bağımlılığındaysa "tencere"
 * yazmak 7 ayrı IPC + tam tablo sorgusu tetikler. better-sqlite3 senkron çalıştığı için
 * bunların her biri main process'i bloklar ve UI donar.
 *
 * @param {*} deger geciktirilecek değer
 * @param {number} gecikme ms (varsayılan 300)
 */
export function useDebounce(deger, gecikme = 300) {
  const [geciken, setGeciken] = useState(deger)

  useEffect(() => {
    const id = setTimeout(() => setGeciken(deger), gecikme)
    return () => clearTimeout(id)   // her değişimde önceki zamanlayıcı iptal
  }, [deger, gecikme])

  return geciken
}
