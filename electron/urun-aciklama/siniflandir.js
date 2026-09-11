// ROZET SINIFLANDIRMASI — saf, test edilebilir.
//
// Rozetler müşteriye verilen SÖZDÜR. Yanlış rozet iade doğurur.
// Bu yüzden üçü de kanıta bağlı: ad/kategori metni (çelik, outlet) veya
// doğrulanmış veri haritası (indüksiyon). Marka bazında varsayım YOK.

// Çelik/paslanmaz mı — ve KALİTESİ belirtilmiş mi?
//
// 11.09 DÜZELTMESİ: eskiden tek bir true/false döndürüyordu ve şablon her çelik
// üründe "★ 304 / 18-10 Çelik" rozetini basıyordu. Bu bir YÜKSELTMEDİR: kaynakta
// yalnız "paslanmaz çelik" yazan ürüne 304/18-10 demek doğrulanmamış kalite
// iddiasıdır (Falez Bella servis setlerinde yakalandı).
//
// Dönen:
//   'kesin' → 304 veya 18/10 açıkça geçiyor  → "★ 304 / 18-10 Çelik"
//   'genel' → yalnız çelik/paslanmaz geçiyor → "★ Paslanmaz Çelik"
//   false   → çelik değil                    → rozet yok
function celikMi(ad = '', kategoriler = [], ekMetin = '') {
  const metin = (ad + ' ' + kategoriler.join(' ') + ' ' + ekMetin).toLocaleLowerCase('tr')
  if (/\b304\b|18\/10|18-10/.test(metin)) return 'kesin'
  if (/çelik|paslanmaz|inox/.test(metin)) return 'genel'
  return false
}

// Outlet / 2. kalite / teşhir üründe garanti rozeti YAZILMAZ.
function garantiVarMi(ad = '', kategoriler = [], etiketler = []) {
  const metin = (ad + ' ' + kategoriler.join(' ') + ' ' + etiketler.join(' ')).toLocaleLowerCase('tr')
  return !/outlet|2\.?\s*kalite|teşhir|hasarlı/.test(metin)
}

// İndüksiyon: YALNIZ doğrulanmış haritadan. Eşleşme yoksa 'bilinmiyor' → rozet YOK.
// Sıra kesinlikten kabaya: ürün id → model adı → marka.
function induksiyonDurum(urun, harita = {}) {
  if (!urun) return 'bilinmiyor'
  if (harita[urun.id] === 'evet' || harita[urun.id] === 'hayir') return harita[urun.id]

  const ad = (urun.name || '').toLocaleLowerCase('tr')
  for (const m of (harita.modeller || [])) {
    if (m && m.eslesme && ad.includes(String(m.eslesme).toLocaleLowerCase('tr'))) return m.durum
  }

  const marka = (urun.marka || (urun.brand && urun.brand.name) || '').toLocaleLowerCase('tr')
  const mh = harita.markalar || {}
  for (const k of Object.keys(mh)) {
    if (marka && marka.includes(k.toLocaleLowerCase('tr'))) return mh[k]
  }
  return 'bilinmiyor'
}

// ikas ürün nesnesinden rozet bayraklarını kurar.
function rozetler(urun, induksiyonHaritasi = {}) {
  const ad = urun.name || ''
  const kategoriler = (urun.categories || []).map(c => c.name || c)
  const etiketler = (urun.tags || []).map(t => t.name || t)
  return {
    celik: celikMi(ad, kategoriler),
    garanti: garantiVarMi(ad, kategoriler, etiketler),
    induksiyon: induksiyonDurum(urun, induksiyonHaritasi),
  }
}

module.exports = { celikMi, garantiVarMi, induksiyonDurum, rozetler }
