// Hızlı Ürünler panelinin altı: temsilci havuzdan hediye kuponu gönderir (09.09.2026).
// Tık → kuponlu kampanyalar (boşta kaç kod) → seçim → tek mesaj (kupon + nasıl kullanılır şablonu).
// Gönderim geri alınamaz; kod dağıtım kaydına yazılır. Son seçilen kampanya localStorage'da.
import { useEffect, useState } from 'react'
import { sosyalApi, metaApi } from '../api/ipc'
import toast from 'react-hot-toast'

const SON_KAMPANYA_KEY = 'kupon_son_kampanya'
const GERI_BILDIRIM_MS = 1500

export default function KuponGonder({ hedef, kullanici, onGonderildi }) {
  const [acik, setAcik] = useState(false)
  const [havuz, setHavuz] = useState(null)
  const [sablonlar, setSablonlar] = useState([])
  const [sablonId, setSablonId] = useState(null)
  const [mesgul, setMesgul] = useState(false)
  const [gitti, setGitti] = useState(null)

  useEffect(() => {
    if (!acik) return
    setHavuz(null)
    sosyalApi.kuponHavuz().then(setHavuz).catch(e => { toast.error(e.message); setHavuz([]) })
    sosyalApi.kuponSablonlari().then(s => { setSablonlar(s); if (s.length && !sablonId) setSablonId(s[0].id) }).catch(() => {})
  }, [acik])

  async function gonder(k) {
    if (!hedef?.id || mesgul) return
    setMesgul(true)
    try {
      const r = await metaApi.kuponGonder({ hedef, kampanyaId: k.id, sablonId, kullanici })
      try { localStorage.setItem(SON_KAMPANYA_KEY, k.id) } catch {}
      setGitti(r.kod); setTimeout(() => { setGitti(null); setAcik(false) }, GERI_BILDIRIM_MS)
      onGonderildi?.()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  let son = null; try { son = localStorage.getItem(SON_KAMPANYA_KEY) } catch {}
  const sirali = havuz ? [...havuz].sort((a, b) => (a.id === son ? -1 : b.id === son ? 1 : 0)) : []

  return (
    <div className="mt-auto pt-2 border-t border-marka-100">
      <button type="button" onClick={() => setAcik(a => !a)} disabled={!hedef?.id}
        title={hedef?.id ? 'Havuzdan hediye kuponu gönder' : 'Önce bir konuşma ya da yorum seçin'}
        className={`w-full rounded-lg px-2 py-1.5 text-[12px] font-semibold border ${acik ? 'bg-marka-900 text-white border-marka-900' : 'bg-krem-200 text-marka-900 border-krem-400 hover:bg-krem-100'} disabled:opacity-50`}>
        🎁 Hediye kuponu gönder
      </button>
      {acik && (
        <div className="mt-2 space-y-1.5">
          {havuz === null && <div className="text-[11px] text-gray-400">ikas'tan okunuyor…</div>}
          {havuz && !havuz.length && <div className="text-[11px] text-gray-400">Kuponlu kampanya yok. Kampanyalar sekmesinden oluşturun.</div>}
          {sablonlar.length > 1 && (
            <select value={sablonId || ''} onChange={e => setSablonId(Number(e.target.value))} className="w-full border rounded-md px-1.5 py-1 text-[11px]">
              {sablonlar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
            </select>
          )}
          {sirali.map(k => (
            <button key={k.id} type="button" onClick={() => gonder(k)} disabled={mesgul || !k.havuz.bos}
              title={k.havuz.bos ? 'Tıklayınca kupon hemen gider' : 'Havuz boş — Kampanya sekmesinden kupon üretin'}
              className="w-full text-left rounded-lg border border-marka-100 p-1.5 hover:bg-marka-50 disabled:opacity-50">
              <div className="text-[12px] font-bold text-marka-900 truncate">{k.title}</div>
              <div className="text-[11px] text-marka-400">{k.indirim} · boşta {k.havuz.bos}{k.bitis ? ` · ${new Date(k.bitis).toLocaleDateString('tr-TR')}` : ''}</div>
              {gitti && <div className="text-[11px] text-emerald-600 font-semibold">Gönderildi ✓ {gitti}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
