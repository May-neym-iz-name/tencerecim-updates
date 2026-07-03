// Kargo takip yardımcıları.

// UPS Türkiye takip sayfası derin linki. target="_blank" ile açıldığında
// Electron yeni bir pencere (uygulama içi) açar — sistem tarayıcısı değil.
export function upsTakipUrl(takipNo) {
  const no = String(takipNo || '').trim()
  if (!no) return null
  return `https://www.ups.com/track?loc=tr_TR&tracknum=${encodeURIComponent(no)}&requester=ST`
}

// Verilen firma + takip no + (varsa ikas'tan gelen) hazır link için en uygun
// takip URL'sini döndürür. Hazır link varsa onu kullan; yoksa firma UPS (veya
// belirsiz) ise UPS URL'si üret. Başka firma + link yoksa null.
export function takipUrl({ takipNo, link, firma } = {}) {
  if (link && String(link).trim()) return String(link).trim()
  const f = String(firma || '').trim().toUpperCase()
  if (!f || f.includes('UPS')) return upsTakipUrl(takipNo)
  return null
}
