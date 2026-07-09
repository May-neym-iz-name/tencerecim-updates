import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { malKabulApi, lokasyonApi, tedarikciApi, urunlerApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { useSiralama } from '../hooks/useSiralama'
import SiraliBaslik from '../components/SiraliBaslik'
import AranabilirSecici from '../components/AranabilirSecici'

const PARA = (n) => `₺${(Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const TARIH = (t) => t ? new Date(t).toLocaleString('tr-TR') : '—'

export default function MalKabul() {
  const { profil, erisilebilirLokasyonlar } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [tedarikciler, setTedarikciler] = useState([])
  const [lokId, setLokId] = useState(null)
  const [tedarikciId, setTedarikciId] = useState('')
  const [faturaNo, setFaturaNo] = useState('')
  const [notlar, setNotlar] = useState('')
  const [kalemler, setKalemler] = useState([]) // { urun_id, ad, miktar, birim_maliyet }
  const [arama, setArama] = useState('')
  const [sonuc, setSonuc] = useState([])
  const [mesgul, setMesgul] = useState(false)
  const [gecmis, setGecmis] = useState([])
  const sr = useSiralama(gecmis)
  const aramaRef = useRef()

  useEffect(() => {
    lokasyonApi.listele().then(l => { const er = erisilebilirLokasyonlar(l); setLokasyonlar(er); if (er.length) setLokId(er[0].id) })
    tedarikciApi.listele().then(setTedarikciler).catch(() => {})
  }, [])

  const gecmisYukle = useCallback(async () => {
    try { const r = await malKabulApi.listele({ boyut: 20 }); setGecmis(r.kayitlar) } catch {}
  }, [])
  useEffect(() => { gecmisYukle() }, [gecmisYukle])

  const araFn = useCallback(async (deger) => {
    setArama(deger)
    if (deger.length < 2) { setSonuc([]); return }
    try { const r = await urunlerApi.listele({ arama: deger, boyut: 8 }); setSonuc(r.urunler) } catch {}
  }, [])

  function kalemEkle(urun) {
    setKalemler(prev => {
      if (prev.some(k => k.urun_id === urun.id)) return prev
      return [...prev, { urun_id: urun.id, ad: urun.ad, miktar: 1, birim_maliyet: urun.alis_fiyati || 0 }]
    })
    setArama(''); setSonuc([]); aramaRef.current?.focus()
  }
  function kalemGuncelle(urun_id, alan, deger) {
    setKalemler(prev => prev.map(k => k.urun_id === urun_id ? { ...k, [alan]: deger } : k))
  }
  function kalemSil(urun_id) { setKalemler(prev => prev.filter(k => k.urun_id !== urun_id)) }

  const toplam = kalemler.reduce((t, k) => t + (parseFloat(k.miktar) || 0) * (parseFloat(k.birim_maliyet) || 0), 0)

  async function kaydet() {
    if (!lokId) { toast.error('Mağaza seçin'); return }
    if (!kalemler.length) { toast.error('En az bir ürün ekleyin'); return }
    setMesgul(true)
    try {
      await malKabulApi.olustur({
        lokasyon_id: lokId, tedarikci_id: tedarikciId || null, fatura_no: faturaNo || null, notlar, kullanici,
        kalemler: kalemler.map(k => ({ urun_id: k.urun_id, miktar: parseInt(k.miktar, 10) || 0, birim_maliyet: parseFloat(k.birim_maliyet) || 0 })),
      })
      toast.success('Mal kabul kaydedildi, stok güncellendi')
      setKalemler([]); setFaturaNo(''); setNotlar(''); setTedarikciId('')
      await gecmisYukle()
    } catch (e) { toast.error(e.message) }
    setMesgul(false)
  }

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Mal Kabul (Stok Girişi)</h2>

      <div className="bg-white rounded-2xl border p-4 space-y-4">
        {/* Başlık alanları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mağaza *</label>
            <select value={lokId || ''} onChange={e => setLokId(Number(e.target.value))}
              className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white">
              {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tedarikçi</label>
            <AranabilirSecici secenekler={tedarikciler.map(t => ({ deger: t.id, etiket: t.ad }))}
              deger={tedarikciId} onChange={v => setTedarikciId(v)} placeholder="Tedarikçi ara / seç" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fatura/İrsaliye No</label>
            <input value={faturaNo} onChange={e => setFaturaNo(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
            <input value={notlar} onChange={e => setNotlar(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </div>
        </div>

        {/* Ürün ara/ekle */}
        <div className="relative">
          <input ref={aramaRef} value={arama} onChange={e => araFn(e.target.value)}
            placeholder="🔍 Ürün adı / barkod ile ara, eklemek için tıkla..."
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          {sonuc.length > 0 && (
            <div className="absolute z-20 left-0 right-0 bg-white border rounded-lg shadow-xl mt-1 max-h-56 overflow-auto">
              {sonuc.map(u => (
                <button key={u.id} onClick={() => kalemEkle(u)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0 flex justify-between">
                  <span>{u.ad}</span>
                  <span className="text-gray-400 text-xs">{u.barkod || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kalemler */}
        {kalemler.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ürün</th>
                  <th className="text-center px-3 py-2 font-medium w-24">Miktar</th>
                  <th className="text-center px-3 py-2 font-medium w-32">Birim Maliyet</th>
                  <th className="text-right px-3 py-2 font-medium w-28">Tutar</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {kalemler.map(k => (
                  <tr key={k.urun_id} className="border-t">
                    <td className="px-3 py-1.5">{k.ad}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="number" min="1" value={k.miktar}
                        onChange={e => kalemGuncelle(k.urun_id, 'miktar', e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-sm text-center" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="number" step="0.01" value={k.birim_maliyet}
                        onChange={e => kalemGuncelle(k.urun_id, 'birim_maliyet', e.target.value)}
                        className="w-28 border rounded px-2 py-1 text-sm text-center" />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium">{PARA((parseFloat(k.miktar) || 0) * (parseFloat(k.birim_maliyet) || 0))}</td>
                    <td className="px-3 py-1.5 text-center">
                      <button onClick={() => kalemSil(k.urun_id)} className="text-gray-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-600">Toplam Maliyet</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-800">{PARA(toplam)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <button onClick={kaydet} disabled={mesgul || !kalemler.length}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {mesgul ? 'Kaydediliyor…' : '✓ Mal Kabul Et & Stoğa Ekle'}
        </button>
      </div>

      {/* Geçmiş */}
      <div className="bg-white rounded-2xl border p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Son Mal Kabuller</h3>
        {gecmis.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">Kayıt yok.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <SiraliBaslik k="tarih" {...sr}>Tarih</SiraliBaslik>
                <SiraliBaslik k="lokasyon_adi" {...sr}>Mağaza</SiraliBaslik>
                <SiraliBaslik k="tedarikci_adi" {...sr}>Tedarikçi</SiraliBaslik>
                <SiraliBaslik k="fatura_no" {...sr}>Fatura No</SiraliBaslik>
                <SiraliBaslik k="kalem_sayisi" align="center" {...sr}>Kalem</SiraliBaslik>
                <SiraliBaslik k="toplam_maliyet" align="right" {...sr}>Maliyet</SiraliBaslik>
              </tr>
            </thead>
            <tbody>
              {sr.sirali.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-1.5 text-gray-500">{TARIH(m.tarih)}</td>
                  <td className="px-3 py-1.5">{m.lokasyon_adi}</td>
                  <td className="px-3 py-1.5 text-gray-500">{m.tedarikci_adi || '—'}</td>
                  <td className="px-3 py-1.5 text-gray-500">{m.fatura_no || '—'}</td>
                  <td className="px-3 py-1.5 text-center">{m.kalem_sayisi}</td>
                  <td className="px-3 py-1.5 text-right font-medium">{PARA(m.toplam_maliyet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
