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
// "Sorular" rozeti (08.09.2026): yalnız fiyat DIŞI (niyet='soru') okunmamış yorumlar. Fiyat
// yorumlarına zaten otomasyon cevap veriyor; onlar rozeti şişirmesin (kullanıcı kararı).
const SORU_OKUNMAMIS_SAYAC = "SUM(CASE WHEN durum='yeni' AND yon='gelen' AND niyet='soru' THEN 1 ELSE 0 END)"

// Konuşmanın KAYNAĞI: gelen mesajlardan herhangi biri hikaye yanıtı/bahsi ise 'hikaye',
// değilse paylaşım varsa 'paylasim', yoksa 'normal'. Öncelik hikaye > paylaşım.
// Konuşma sorgusunda GROUP BY altında `... kaynak` olarak seçilir; süzgeç HAVING'de o ada bakar.
const KAYNAK_IFADESI = `CASE
  WHEN MAX(CASE WHEN yon='gelen' AND ek_tur IN ('hikaye_yanit','hikaye_bahsi') THEN 1 ELSE 0 END) = 1 THEN 'hikaye'
  WHEN MAX(CASE WHEN yon='gelen' AND ek_tur = 'paylasim' THEN 1 ELSE 0 END) = 1 THEN 'paylasim'
  ELSE 'normal' END`
// Beyaz liste: değer SQL'e metin olarak girer (parametre değil), bilinmeyen değer eklenmez.
const KAYNAKLAR = new Set(['hikaye', 'paylasim', 'normal'])

// Koşullar gruplanmış sayılara baktığı için WHERE'e değil HAVING'e eklenir.
// `having` ve `p` (parametre nesnesi) yerinde güncellenir.
function listeFiltreleri({ cevapDurumu, okunma, atama, kullanici, kaynak } = {}, having, p) {
  if (cevapDurumu === 'cevapsiz') having.push('cevapsiz > 0')
  else if (cevapDurumu === 'cevaplandi') having.push('cevapsiz = 0')

  if (okunma === 'okunmamis') having.push('okunmamis > 0')
  else if (okunma === 'okunmus') having.push('okunmamis = 0')

  if (atama === 'bana') { having.push('MAX(atanan_kullanici) = @kullanici'); p.kullanici = kullanici || '' }
  else if (atama === 'atanmamis') having.push('MAX(atanan_kullanici) IS NULL')

  if (kaynak && KAYNAKLAR.has(kaynak)) having.push(`kaynak = '${kaynak}'`)

  return having
}

module.exports = { listeFiltreleri, CEVAPSIZ_SAYAC, OKUNMAMIS_SAYAC, SORU_OKUNMAMIS_SAYAC, KAYNAK_IFADESI }
