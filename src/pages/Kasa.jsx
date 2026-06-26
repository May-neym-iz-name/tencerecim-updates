import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { kasaApi, lokasyonApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'

const PARA = (n) => `₺${(Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const TARIH = (t) => t ? new Date(t).toLocaleString('tr-TR') : '—'

export default function Kasa() {
  const { profil, erisilebilirLokasyonlar } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [lokId, setLokId] = useState(null)
  const [oturum, setOturum] = useState(null)
  const [gecmis, setGecmis] = useState([])
  const [acilisNakit, setAcilisNakit] = useState('')
  const [sayilanNakit, setSayilanNakit] = useState('')
  const [notlar, setNotlar] = useState('')
  const [mesgul, setMesgul] = useState(false)

  useEffect(() => {
    lokasyonApi.listele().then(l => {
      const er = erisilebilirLokasyonlar(l)
      setLokasyonlar(er)
      if (er.length) setLokId(er[0].id)
    })
  }, [])

  const yukle = useCallback(async () => {
    if (!lokId) return
    try {
      const [o, g] = await Promise.all([kasaApi.acik(lokId), kasaApi.gecmis({ lokasyon_id: lokId, limit: 30 })])
      setOturum(o); setGecmis(g)
    } catch (e) { toast.error(e.message) }
  }, [lokId])
  useEffect(() => { yukle() }, [yukle])

  async function kasaAc() {
    if (acilisNakit === '' || isNaN(parseFloat(acilisNakit))) {
      toast.error('Kasadaki açılış tutarını girin (0 ise 0 yazın).'); return
    }
    setMesgul(true)
    try {
      await kasaApi.ac({ lokasyon_id: lokId, acilis_nakit: parseFloat(acilisNakit) || 0, kullanici })
      toast.success('Kasa açıldı'); setAcilisNakit(''); await yukle()
    } catch (e) { toast.error(e.message) }
    setMesgul(false)
  }

  async function kasaKapat() {
    if (!confirm('Kasa kapatılsın mı?')) return
    setMesgul(true)
    try {
      const r = await kasaApi.kapat({ id: oturum.id, sayilan_nakit: parseFloat(sayilanNakit) || 0, notlar, kullanici })
      const fark = Number(r.fark) || 0
      toast.success(fark === 0 ? 'Kasa kapatıldı — tam tuttu' : `Kasa kapatıldı — fark: ${PARA(fark)}`)
      setSayilanNakit(''); setNotlar(''); await yukle()
    } catch (e) { toast.error(e.message) }
    setMesgul(false)
  }

  const beklenen = oturum?.beklenen || 0
  const sayilanFark = oturum && sayilanNakit !== '' ? (parseFloat(sayilanNakit) || 0) - beklenen : null

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Kasa / Vardiya</h2>
        <select value={lokId || ''} onChange={e => setLokId(Number(e.target.value))}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white">
          {lokasyonlar.map(l => <option key={l.id} value={l.id}>🏪 {l.ad}</option>)}
        </select>
      </div>

      {oturum ? (
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-emerald-700">🟢 Kasa Açık</h3>
            <span className="text-xs text-gray-400">Açılış: {TARIH(oturum.acilis_tarihi)} · {oturum.acan || '—'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Ozet baslik="Açılış Nakiti" deger={PARA(oturum.acilis_nakit)} />
            <Ozet baslik="Nakit Satış" deger={PARA(oturum.nakitSatis)} renk="text-green-700" />
            <Ozet baslik="Nakit Gider" deger={PARA(oturum.nakitGider)} renk="text-red-600" />
            <Ozet baslik="Beklenen Nakit" deger={PARA(oturum.beklenen)} renk="text-blue-700" />
          </div>
          <div className="border-t pt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sayılan Nakit (kasadaki gerçek tutar)</label>
              <input type="number" step="0.01" value={sayilanNakit} onChange={e => setSayilanNakit(e.target.value)}
                placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm" />
              {sayilanFark !== null && (
                <p className={`text-xs mt-1 font-medium ${Math.abs(sayilanFark) < 0.005 ? 'text-green-600' : sayilanFark > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  Fark: {PARA(sayilanFark)} {Math.abs(sayilanFark) < 0.005 ? '(tam tuttu)' : sayilanFark > 0 ? '(fazla)' : '(eksik)'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Not (opsiyonel)</label>
              <input value={notlar} onChange={e => setNotlar(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={kasaKapat} disabled={mesgul}
            className="mt-4 bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
            🔒 Kasayı Kapat
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold text-gray-700 mb-3">⚪ Kasa Kapalı — Yeni Vardiya Aç</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1">Açılış Nakiti (kasadaki başlangıç tutarı)</label>
              <input type="number" step="0.01" value={acilisNakit} onChange={e => setAcilisNakit(e.target.value)}
                placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={kasaAc} disabled={mesgul || !lokId || acilisNakit === ''}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              🟢 Kasa Aç
            </button>
          </div>
        </div>
      )}

      {/* Geçmiş */}
      <div className="bg-white rounded-2xl border p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Geçmiş Vardiyalar</h3>
        {gecmis.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">Kayıt yok.</p> : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Açılış</th>
                  <th className="text-left px-3 py-2 font-medium">Kapanış</th>
                  <th className="text-right px-3 py-2 font-medium">Beklenen</th>
                  <th className="text-right px-3 py-2 font-medium">Sayılan</th>
                  <th className="text-right px-3 py-2 font-medium">Fark</th>
                </tr>
              </thead>
              <tbody>
                {gecmis.map(o => (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-1.5 text-gray-500">{TARIH(o.acilis_tarihi)}</td>
                    <td className="px-3 py-1.5 text-gray-500">{TARIH(o.kapanis_tarihi)}</td>
                    <td className="px-3 py-1.5 text-right">{PARA(o.beklenen_nakit)}</td>
                    <td className="px-3 py-1.5 text-right">{PARA(o.sayilan_nakit)}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${Math.abs(o.fark) < 0.005 ? 'text-green-600' : 'text-red-600'}`}>{PARA(o.fark)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Ozet({ baslik, deger, renk = 'text-gray-800' }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{baslik}</p>
      <p className={`text-lg font-bold mt-0.5 ${renk}`}>{deger}</p>
    </div>
  )
}
