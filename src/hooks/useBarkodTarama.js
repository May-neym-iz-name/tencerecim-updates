import { useEffect, useRef } from 'react'

// Barkod okuyucudan gelen taramayı YAKALAR ve hedef arama kutusuna yazar.
//
// Ne sorunu çözüyor:
//  1) Her okutmada kutudaki ESKİ metin kalıyordu; kullanıcı elle silmek zorundaydı.
//  2) Kutu seçili değilken (ör. listede gezinirken) okutulan barkod hiçbir yere gitmiyordu.
//
// NASIL ÇALIŞIR — barkod okuyucu bir klavyedir; farkı HIZIDIR. İnsan en hızlı yazışta bile
// tuşlar arası ~100 ms'nin altına zor iner; okuyucu ~5-20 ms'de basar. Bu yüzden karar
// tuş ARALIĞINA bakılarak verilir, kısayollara veya normal yazmaya dokunulmaz.
//
// Akış: ilk birkaç tuş normal akar (henüz tarama mı bilinmiyor). ESIK tuşa hızlı ardarda
// basıldıysa "tarama" kararı verilir → o andan itibaren tuşlar YUTULUR (preventDefault),
// biriktirilir ve sonunda kutuya TEK SEFERDE yazılır. Böylece eski içerik de silinmiş olur
// (kutuyu biz baştan yazıyoruz), sızan ilk birkaç karakter de üzerine yazılarak yok olur.
//
// Sonlandırma: çoğu okuyucu sonda Enter basar. Basmayanlar için SESSIZLIK_MS kadar tuş
// gelmezse yine yazılır — "Enter eki kapalı" okuyucularda da çalışsın diye.

const ARA_MS = 45          // tuşlar arası bu süreden hızlıysa "makine" sayılır
const ESIK = 3             // kaç hızlı tuştan sonra tarama olduğuna karar verilir
const MIN_UZUNLUK = 4      // bundan kısa diziler barkod sayılmaz (yanlış tetiklemeyi önler)
const SESSIZLIK_MS = 220   // Enter göndermeyen okuyucular için bekleme

// Odakta yazı yazılan bir alan var mı? (Kendi hedefimiz hariç — oraya yazmak zaten amacımız.)
function baskaAlandaYaziliyor(hedef) {
  const a = document.activeElement
  if (!a || a === hedef) return false
  if (a.isContentEditable) return true
  const t = a.tagName
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'
}

/**
 * @param {object} p
 * @param {{current: HTMLElement|null}} p.ref - yazılacak input
 * @param {(kod: string) => void} p.onKod - okunan kod (kutu değerini BURADA set edin)
 * @param {boolean} [p.aktif] - false ise dinleyici hiç kurulmaz (ör. modal açıkken)
 */
export function useBarkodTarama({ ref, onKod, aktif = true }) {
  // onKod her render'da değişebilir; dinleyiciyi baştan kurmamak için ref'te tutulur.
  const onKodRef = useRef(onKod)
  useEffect(() => { onKodRef.current = onKod }, [onKod])

  useEffect(() => {
    if (!aktif) return

    let tampon = ''
    let sonTus = 0
    let devraldi = false      // tarama kararı verildi mi?
    let zamanlayici = null

    const sifirla = () => {
      tampon = ''
      devraldi = false
      clearTimeout(zamanlayici)
    }

    const yaz = () => {
      const kod = tampon
      sifirla()
      if (kod.length < MIN_UZUNLUK) return
      // Kutuyu seçili hale getir: kullanıcı fareyle tıklamadan okutabilsin.
      ref.current?.focus()
      onKodRef.current(kod)   // eski içerik yerine TAMAMEN bunu yaz
    }

    const tusaBasildi = (e) => {
      // Kısayollara dokunma (Ctrl+C, Alt+Tab...). Okuyucu bunları basmaz.
      if (e.ctrlKey || e.altKey || e.metaKey) return
      // Başka bir yazı alanında yazılıyorsa hiç karışma — asıl "klavyeyi bozmama" güvencesi.
      if (baskaAlandaYaziliyor(ref.current)) return

      const simdi = performance.now()
      const hizli = simdi - sonTus <= ARA_MS
      if (!hizli) sifirla()   // yeni dizi başlıyor
      sonTus = simdi

      if (e.key === 'Enter') {
        if (devraldi) { e.preventDefault(); yaz() } else sifirla()
        return
      }
      if (e.key.length !== 1) return   // Shift, ok tuşları, F1... göz ardı

      tampon += e.key

      if (!devraldi && tampon.length >= ESIK && hizli) devraldi = true
      if (devraldi) {
        // Tuşu yut: kutuya tek tek düşmesin, sonunda toplu yazılacak.
        e.preventDefault()
        clearTimeout(zamanlayici)
        zamanlayici = setTimeout(yaz, SESSIZLIK_MS)
      }
    }

    // capture: alanlara ulaşmadan önce görelim (yutabilmek için şart).
    window.addEventListener('keydown', tusaBasildi, true)
    return () => {
      window.removeEventListener('keydown', tusaBasildi, true)
      clearTimeout(zamanlayici)
    }
  }, [ref, aktif])
}
