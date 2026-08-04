import { useEffect, useRef } from 'react'

/**
 * setInterval'in görünürlük duyarlı hâli.
 *
 * Pencere simge durumundayken ya da arka plandayken tur ATLANIR; kullanıcı geri
 * döndüğü anda beklemeden bir tur çalışır.
 *
 * Neden gerekli (2026-08-04 optimizasyon ölçümü): mağaza PC'si uygulamayı gün boyu
 * açık ama çoğu zaman arka planda tutuyor. Rozet sayaçları ve veri senkronu 30-60
 * saniyede bir çalışmaya devam ediyor, her tur bir IPC + SQLite okuması demek.
 * Kimsenin bakmadığı bir rozeti tazelemenin faydası yok — ama geri dönüldüğünde
 * BAYAT olması da kabul edilemez, bu yüzden atlama ile "dönüşte anında tazele"
 * birlikte gelir.
 *
 * @param {() => void} is        Her turda çalışacak iş (en güncel hâli kullanılır)
 * @param {number} ms            Turlar arası süre
 * @param {boolean} aktif        false ise hiç kurulmaz (yetki yoksa vb.)
 * @param {number} ilkGecikmeMs  İlk turu geciktir (açılışta yığılmayı önlemek için)
 */
export function useGorunurAralik(is, ms, aktif = true, ilkGecikmeMs = 0) {
  // İş fonksiyonu her render'da yeniden oluşabilir; zamanlayıcıyı bu yüzden
  // yeniden kurmak istemiyoruz. Ref ile en güncel hâline ulaşırız — bayat closure
  // tuzağına düşmeden. (Yazma render sırasında değil, effect içinde.)
  const isRef = useRef(is)
  useEffect(() => { isRef.current = is })

  useEffect(() => {
    if (!aktif) return

    const gorunurMu = () => document.visibilityState === 'visible'
    const calistir = () => { if (gorunurMu()) isRef.current() }

    let zamanlayici = null
    let ilkTur = null
    const baslat = () => {
      calistir()
      zamanlayici = setInterval(calistir, ms)
    }
    if (ilkGecikmeMs > 0) ilkTur = setTimeout(baslat, ilkGecikmeMs)
    else baslat()

    // Arka plandayken atlanan turların telafisi: öne gelir gelmez tazele.
    document.addEventListener('visibilitychange', calistir)

    return () => {
      if (ilkTur) clearTimeout(ilkTur)
      if (zamanlayici) clearInterval(zamanlayici)
      document.removeEventListener('visibilitychange', calistir)
    }
  }, [ms, aktif, ilkGecikmeMs])
}
