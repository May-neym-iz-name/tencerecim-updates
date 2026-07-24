import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { bildirimApi } from '../api/ipc'
import { useSayfalama } from '../hooks/useSayfalama'
import Sayfalama from '../components/Sayfalama'
import BildirimKarti from '../components/BildirimKarti'

export default function Bildirimler() {
  const navigate = useNavigate()
  const [onemliler, setOnemliler] = useState([])
  const [tumu, setTumu] = useState([])

  const yukle = useCallback(async () => {
    try {
      const [ol, liste] = await Promise.all([
        bildirimApi.onemliler(),
        bildirimApi.liste({ sayfa: 1, boyut: 500 }), // istemci tarafı sayfalama (emsal: diğer listeler)
      ])
      setOnemliler(ol)
      setTumu(liste.bildirimler)
    } catch (e) {
      toast.error(e.message)
    }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const bildirimAc = async (b) => {
    try {
      if (!b.okundu) await bildirimApi.okundu(b.id)
    } catch { /* okundu yazımı kritik değil */ }
    if (b.ikas_siparis_id) navigate('/online-siparisler?talep=1')
    else yukle()
  }

  const tumunuOku = async () => {
    try {
      await bildirimApi.tumunuOku()
      toast.success('Tüm bildirimler okundu işaretlendi')
      yukle()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const { dilim, sayfa, setSayfa, boyut, setBoyut, toplam, toplamSayfa } = useSayfalama(tumu, 50)
  const okunmamisOnemli = onemliler.filter(b => !b.okundu)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">🔔 Bildirimler</h1>
        <button onClick={tumunuOku} className="text-sm text-blue-600 hover:underline">
          Tümünü okundu işaretle
        </button>
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-red-700 mb-2">
          ⚠️ İptal / İade Talepleri {okunmamisOnemli.length > 0 && `(${okunmamisOnemli.length} yeni)`}
        </h2>
        {onemliler.length === 0 ? (
          <p className="text-sm text-gray-400 border rounded-xl px-4 py-6 text-center">
            Bekleyen iptal/iade talebi yok.
          </p>
        ) : (
          <div className="space-y-2">
            {onemliler.map(b => <BildirimKarti key={b.id} bildirim={b} onTikla={bildirimAc} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Tüm Bildirimler</h2>
        {toplam === 0 ? (
          <p className="text-sm text-gray-400 border rounded-xl px-4 py-6 text-center">Bildirim yok.</p>
        ) : (
          <>
            <div className="space-y-2">
              {dilim.map(b => <BildirimKarti key={b.id} bildirim={b} onTikla={bildirimAc} />)}
            </div>
            <Sayfalama
              sayfa={sayfa} toplamSayfa={toplamSayfa} boyut={boyut}
              setSayfa={setSayfa} setBoyut={setBoyut} toplam={toplam}
            />
          </>
        )}
      </section>
    </div>
  )
}
