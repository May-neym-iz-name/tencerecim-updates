// YouTube gonderisinin sag panelindeki istatistik karti.
//
// NEDEN BURADA: Meta gonderilerinde bu alanda OtomasyonPaneli durur (yoruma otomatik DM).
// YouTube'da ozel mesaj API'si YOKTUR — o panel burada calisamaz, gosterilmesi tuzaktir.
// Yeri bos birakmak yerine gonderi hakkinda gercekten olculebilen sey konuldu.
import { useState, useEffect } from 'react'
import { youtubeApi } from '../api/ipc'

// Binlik ayraci Turkce bicimde: 12.345. Intl kullanilir, elle nokta eklenmez.
const bicim = (n) => (n === null || n === undefined ? null : new Intl.NumberFormat('tr-TR').format(n))

function Kutu({ etiket, deger, not }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-lg font-semibold text-marka-900 leading-tight">
        {deger === null ? <span className="text-gray-300">—</span> : deger}
      </div>
      <div className="text-[11px] text-gray-500 mt-0.5">{etiket}</div>
      {not && <div className="text-[10px] text-gray-400 mt-0.5">{not}</div>}
    </div>
  )
}

export default function YoutubeIstatistik({ konu }) {
  const [veri, setVeri] = useState(null)
  const [durum, setDurum] = useState('yukleniyor') // yukleniyor | hazir | hata

  useEffect(() => {
    if (!konu?.konu_id) return
    let iptal = false
    setDurum('yukleniyor')
    youtubeApi.videoIstatistik({ konu_id: konu.konu_id })
      .then((r) => { if (!iptal) { setVeri(r); setDurum('hazir') } })
      // Istatistik YAN BILGIDIR: cekilemezse yorumlarla calismak durmamali,
      // bu yuzden hata sessizce karta yazilir, toast atilmaz.
      .catch(() => { if (!iptal) setDurum('hata') })
    // Konusma degisince onceki istegin gec gelen yaniti yeni videonun sayilarini
    // EZMEMELI — iptal bayragi bunun icin.
    return () => { iptal = true }
  }, [konu?.konu_id])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="text-xs font-semibold text-marka-900 mb-2">📊 Video istatistigi</div>
      {durum === 'yukleniyor' && <div className="text-xs text-gray-400 py-2">Yukleniyor…</div>}
      {durum === 'hata' && <div className="text-xs text-gray-400 py-2">Istatistik alinamadi.</div>}
      {durum === 'hazir' && (
        <>
          <div className="flex gap-2">
            <Kutu etiket="izlenme" deger={bicim(veri?.izlenme)} />
            <Kutu etiket="begeni" deger={bicim(veri?.begeni)}
              not={veri && veri.begeni === null ? 'gizli' : null} />
            <Kutu etiket="yorum" deger={bicim(veri?.yorum_adet)} />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 leading-snug">
            YouTube'da otomatik ozel mesaj gonderilemez — yanitlar yorumun altina yazilir.
          </p>
        </>
      )}
    </div>
  )
}
