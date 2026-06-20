import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { stokApi, lokasyonApi } from '../api/ipc'

export default function Stok() {
  const [stoklar, setStoklar] = useState([])
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [secilenLokasyon, setSecilenLokasyon] = useState('')
  const [dusukStok, setDusukStok] = useState(false)
  const [arama, setArama] = useState('')
  const [duzenleModal, setDuzenleModal] = useState(null)

  const yukle = useCallback(async () => {
    try {
      const r = await stokApi.listele({ lokasyon_id: secilenLokasyon || undefined, dusuk_stok: dusukStok })
      setStoklar(r)
    } catch (e) { toast.error(e.message) }
  }, [secilenLokasyon, dusukStok])

  useEffect(() => { yukle() }, [yukle])
  useEffect(() => { lokasyonApi.listele().then(setLokasyonlar) }, [])

  const filtrelenmis = stoklar.filter(s =>
    !arama || s.urun_adi?.toLowerCase().includes(arama.toLowerCase()) || s.barkod?.includes(arama)
  )

  async function stokGuncelle(e) {
    e.preventDefault()
    try {
      await stokApi.guncelle({ urun_id: duzenleModal.urun_id, lokasyon_id: duzenleModal.lokasyon_id, miktar: parseInt(duzenleModal.yeni_miktar) })
      toast.success('Stok güncellendi')
      setDuzenleModal(null)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Stok Durumu</h2>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={secilenLokasyon} onChange={e => setSecilenLokasyon(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tüm Lokasyonlar</option>
          {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
        </select>
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün ara..." className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
        <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
          <input type="checkbox" checked={dusukStok} onChange={e => setDusukStok(e.target.checked)} />
          <span className="text-red-600 font-medium">⚠ Düşük Stok</span>
        </label>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Ürün', 'Barkod', 'Kategori', 'Lokasyon', 'Miktar', 'Min.', 'Durum', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrelenmis.map((s, i) => {
              const kritik = s.miktar <= s.minimum_stok
              const lok = lokasyonlar.find(l => l.id === s.lokasyon_id)
              return (
                <tr key={i} className={`border-b ${kritik && s.miktar === 0 ? 'bg-red-50' : kritik ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-2.5 font-medium">{s.urun_adi}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.barkod || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.kategori || '—'}</td>
                  <td className="px-4 py-2.5">{lok?.ad || s.lokasyon_id}</td>
                  <td className="px-4 py-2.5 font-bold text-lg">{s.miktar}</td>
                  <td className="px-4 py-2.5 text-gray-400">{s.minimum_stok}</td>
                  <td className="px-4 py-2.5">
                    {s.miktar === 0
                      ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Tükendi</span>
                      : kritik
                      ? <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Düşük</span>
                      : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Normal</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setDuzenleModal({ ...s, yeni_miktar: s.miktar })}
                      className="text-blue-600 hover:underline text-xs">Düzenle</button>
                  </td>
                </tr>
              )
            })}
            {filtrelenmis.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Stok kaydı bulunamadı</td></tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50">{filtrelenmis.length} kayıt</div>
      </div>

      {duzenleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold mb-1">{duzenleModal.urun_adi}</h3>
            <p className="text-sm text-gray-500 mb-4">{lokasyonlar.find(l => l.id === duzenleModal.lokasyon_id)?.ad}</p>
            <form onSubmit={stokGuncelle} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Mevcut Miktar</label>
                <input type="number" value={duzenleModal.yeni_miktar} min="0"
                  onChange={e => setDuzenleModal(d => ({ ...d, yeni_miktar: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Kaydet</button>
                <button type="button" onClick={() => setDuzenleModal(null)} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
