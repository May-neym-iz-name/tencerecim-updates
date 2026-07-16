// Şablon listesi. onSec verilirse SEÇİCİ modda çalışır (otomasyon paneli kullanır),
// verilmezse YÖNETİM modunda (düzenle/sil).
import { useState, useEffect } from 'react'
import { sosyalApi } from '../api/ipc'
import SablonFormu from './SablonFormu'
import toast from 'react-hot-toast'

export default function SablonKutuphanesi({ onSec = null, kapat = null }) {
  const [liste, setListe] = useState([])
  const [ara, setAra] = useState('')
  const [formda, setFormda] = useState(null) // null=kapalı, {}=yeni, {id..}=düzenle

  const yukle = () => sosyalApi.sablonlar().then(setListe).catch(e => toast.error(e.message))
  useEffect(() => { yukle() }, [])

  const kaydet = async (v) => {
    try {
      await sosyalApi.sablonKaydet(v)
      toast.success('Şablon kaydedildi'); setFormda(null); yukle()
    } catch (e) { toast.error(e.message) }
  }
  const sil = async (id) => {
    if (!confirm('Şablon silinsin mi?')) return
    try { await sosyalApi.sablonSil(id); yukle() } catch (e) { toast.error(e.message) }
  }

  // Türkçe duyarlı arama (tr locale — I/ı, İ/i doğru eşleşsin).
  const suz = liste.filter(s =>
    !ara.trim() || `${s.ad} ${s.urun_adi}`.toLocaleLowerCase('tr').includes(ara.toLocaleLowerCase('tr')))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input value={ara} onChange={e => setAra(e.target.value)} placeholder="🔍 Şablon ara…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => setFormda({})} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap">
          + Yeni
        </button>
        {kapat && <button onClick={kapat} className="text-gray-400 px-2">✕</button>}
      </div>

      {!suz.length && (
        <p className="text-sm text-gray-400 py-8 text-center">
          {liste.length ? 'Aramaya uyan şablon yok.' : 'Henüz şablon yok. "+ Yeni" ile ekleyin.'}
        </p>
      )}

      <div className="space-y-2">
        {suz.map(s => (
          <div key={s.id} className="border rounded-xl p-3 flex items-center gap-3 hover:bg-gray-50">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{s.ad}</div>
              <div className="text-xs text-gray-500 truncate">
                {s.kaynak_tipi === 'set' && <span title="Set">📦 </span>}
                {s.urun_adi}
                {s.fiyat != null
                  ? <span className="text-gray-400"> · {Number(s.fiyat).toLocaleString('tr-TR')} TL (sabit)</span>
                  : s.kaynak_fiyati != null
                    ? <span className="text-emerald-600"> · {Number(s.kaynak_fiyati).toLocaleString('tr-TR')} TL (canlı)</span>
                    : <span className="text-amber-600"> · fiyat yok</span>}
              </div>
            </div>
            {onSec
              ? <button onClick={() => onSec(s)} className="text-blue-600 text-sm font-medium whitespace-nowrap">Ekle</button>
              : <>
                  <button onClick={() => setFormda(s)} className="text-gray-500 text-sm">Düzenle</button>
                  <button onClick={() => sil(s.id)} className="text-red-500 text-sm">Sil</button>
                </>}
          </div>
        ))}
      </div>

      {formda && <SablonFormu sablon={formda.id ? formda : null}
        onKapat={() => setFormda(null)} onKaydet={kaydet} />}
    </div>
  )
}
