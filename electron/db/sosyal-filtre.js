// Sosyal medya gelen kutusu süzgeçleri — saf SQL parçacığı üreticisi.
// electron/db bağımlılığı olmadığı için test edilebilir (emsal: ikas/adres.js).
//
// durum ÜÇ değerlidir ve iki AYRI soruyu yanıtlar:
//   yeni       = ne okundu ne cevaplandı        → okunmamış
//   okundu     = elle okundu işaretlendi, cevapsız
//   cevaplandi = yanıtlandı (uygulamadan ya da telefondan; _yanitlananlariKapat süpürür)
// Bu yüzden "cevapsız" (yeni + okundu) ile "okunmamış" (yalnız yeni) aynı şey DEĞİLDİR —
// canlı ölçümde 14.730 yorum "okundu ama hâlâ cevapsız" durumdaydı.
const CEVAPSIZ_SAYAC = "SUM(CASE WHEN durum IN ('yeni','okundu') AND yon='gelen' THEN 1 ELSE 0 END)"
const OKUNMAMIS_SAYAC = "SUM(CASE WHEN durum='yeni' AND yon='gelen' THEN 1 ELSE 0 END)"

// Koşullar gruplanmış sayılara baktığı için WHERE'e değil HAVING'e eklenir.
// `having` ve `p` (parametre nesnesi) yerinde güncellenir.
function listeFiltreleri({ cevapDurumu, okunma, atama, kullanici } = {}, having, p) {
  if (cevapDurumu === 'cevapsiz') having.push('cevapsiz > 0')
  else if (cevapDurumu === 'cevaplandi') having.push('cevapsiz = 0')

  if (okunma === 'okunmamis') having.push('okunmamis > 0')
  else if (okunma === 'okunmus') having.push('okunmamis = 0')

  if (atama === 'bana') { having.push('MAX(atanan_kullanici) = @kullanici'); p.kullanici = kullanici || '' }
  else if (atama === 'atanmamis') having.push('MAX(atanan_kullanici) IS NULL')

  return having
}

module.exports = { listeFiltreleri, CEVAPSIZ_SAYAC, OKUNMAMIS_SAYAC }
