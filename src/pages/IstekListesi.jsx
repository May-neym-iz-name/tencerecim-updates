import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { istekApi, lokasyonApi, tedarikciApi, urunlerApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import AranabilirSecici from '../components/AranabilirSecici'

const bugun = () => new Date().toISOString().slice(0, 10)

export default function IstekListesi() {
  const { erisilebilirLokasyonlar } = useAuth()
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [tedarikciler, setTedarikciler] = useState([])
  const [listeler, setListeler] = useState([])
  const [duzenleme, setDuzenleme] = useState(null) // null=liste görünümü; obje=düzenleme

  useEffect(() => {
    lokasyonApi.listele().then(l => setLokasyonlar(erisilebilirLokasyonlar(l))).catch(() => {})
    tedarikciApi.listele().then(setTedarikciler).catch(() => {})
  }, [])

  const listeleriYukle = useCallback(async () => {
    try { setListeler(await istekApi.listele()) } catch (e) { toast.error(e.message) }
  }, [])
  useEffect(() => { listeleriYukle() }, [listeleriYukle])

  const yeni = () => setDuzenleme({
    id: null, lokasyon_id: lokasyonlar[0]?.id || null, tedarikci_id: '', tarih: bugun(), kalemler: [],
  })

  const ac = async (id) => {
    try {
      const l = await istekApi.getir(id)
      setDuzenleme({
        id: l.id, lokasyon_id: l.lokasyon_id, tedarikci_id: l.tedarikci_id || '', tarih: l.tarih || bugun(),
        kalemler: l.kalemler.map(k => ({ urun_id: k.urun_id, ad: k.urun_adi, miktar: k.miktar })),
      })
    } catch (e) { toast.error(e.message) }
  }

  const sil = async (id) => {
    if (!window.confirm('Bu istek listesi silinsin mi?')) return
    try { await istekApi.sil(id); toast.success('Silindi'); listeleriYukle() } catch (e) { toast.error(e.message) }
  }

  const pdf = async (id) => {
    try {
      const r = await istekApi.pdf(id)
      if (r.kaydedildi) toast.success('PDF kaydedildi')
    } catch (e) { toast.error(e.message) }
  }

  if (duzenleme) {
    return <Duzenle
      taslak={duzenleme} lokasyonlar={lokasyonlar} tedarikciler={tedarikciler}
      onKapat={() => setDuzenleme(null)}
      onKaydedildi={(id) => { setDuzenleme(null); listeleriYukle(); pdf(id) }}
    />
  }

  const tedAd = (id) => tedarikciler.find(t => t.id === id)?.ad || '—'
  const lokAd = (id) => lokasyonlar.find(l => l.id === id)?.ad || listeler.find(x => x.lokasyon_id === id)?.lokasyon_adi || '—'

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📝 İstek Listeleri</h2>
        <button onClick={yeni} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Yeni İstek Listesi
        </button>
      </div>

      <div className="bg-white rounded-2xl border p-4">
        {listeler.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Henüz istek listesi yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Şube</th>
                <th className="text-left px-3 py-2 font-medium">Tedarikçi</th>
                <th className="text-left px-3 py-2 font-medium">Tarih</th>
                <th className="text-center px-3 py-2 font-medium">Kalem</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {listeler.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.lokasyon_adi || lokAd(l.lokasyon_id)}</td>
                  <td className="px-3 py-2">{l.tedarikci_adi || tedAd(l.tedarikci_id)}</td>
                  <td className="px-3 py-2 text-gray-500">{l.tarih || '—'}</td>
                  <td className="px-3 py-2 text-center">{l.kalem_sayisi}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => ac(l.id)} className="text-blue-600 hover:underline mr-3">Aç</button>
                    <button onClick={() => pdf(l.id)} className="text-emerald-600 hover:underline mr-3">PDF</button>
                    <button onClick={() => sil(l.id)} className="text-red-500 hover:underline">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// Düzenleme görünümü (MalKabul deseni; fiyatsız + kaydet/PDF).
function Duzenle({ taslak, lokasyonlar, tedarikciler, onKapat, onKaydedildi }) {
  const [lokId, setLokId] = useState(taslak.lokasyon_id)
  const [tedarikciId, setTedarikciId] = useState(taslak.tedarikci_id)
  const [tarih, setTarih] = useState(taslak.tarih)
  const [kalemler, setKalemler] = useState(taslak.kalemler)
  const [arama, setArama] = useState('')
  const [sonuc, setSonuc] = useState([])
  const [mesgul, setMesgul] = useState(false)
  const [stoklar, setStoklar] = useState({}) // { urun_id: seçili şubedeki miktar }
  const aramaRef = useRef()

  // Eklenen kalemlerin seçili şubedeki mevcut stok adetlerini çek.
  const stokAnahtar = kalemler.map(k => k.urun_id).filter(Boolean).join(',')
  useEffect(() => {
    const idler = kalemler.map(k => k.urun_id).filter(Boolean)
    if (!lokId || idler.length === 0) { setStoklar({}); return }
    istekApi.stoklar({ lokasyon_id: lokId, urun_idler: idler }).then(setStoklar).catch(() => {})
  }, [lokId, stokAnahtar])

  const araFn = useCallback(async (deger) => {
    setArama(deger)
    if (deger.length < 2) { setSonuc([]); return }
    try { const r = await urunlerApi.listele({ arama: deger, boyut: 8 }); setSonuc(r.urunler) } catch {}
  }, [])

  function kalemEkle(urun) {
    setKalemler(prev => prev.some(k => k.urun_id === urun.id) ? prev : [...prev, { urun_id: urun.id, ad: urun.ad, miktar: 1 }])
    setArama(''); setSonuc([]); aramaRef.current?.focus()
  }
  const kalemGuncelle = (urun_id, miktar) => setKalemler(prev => prev.map(k => k.urun_id === urun_id ? { ...k, miktar } : k))
  const kalemSil = (urun_id) => setKalemler(prev => prev.filter(k => k.urun_id !== urun_id))

  async function kaydet() {
    if (!lokId) { toast.error('Şube seçin'); return }
    if (!tedarikciId) { toast.error('Tedarikçi seçin'); return }
    if (!kalemler.length) { toast.error('En az bir ürün ekleyin'); return }
    setMesgul(true)
    try {
      const r = await istekApi.kaydet({
        id: taslak.id, lokasyon_id: lokId, tedarikci_id: tedarikciId, tarih,
        baslik: null,
        kalemler: kalemler.map(k => ({ urun_id: k.urun_id, urun_adi: k.ad, miktar: parseInt(k.miktar, 10) || 0 })),
      })
      toast.success('İstek listesi kaydedildi')
      onKaydedildi(r.id)
    } catch (e) { toast.error(e.message) }
    setMesgul(false)
  }

  const toplamAdet = kalemler.reduce((t, k) => t + (parseInt(k.miktar, 10) || 0), 0)

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onKapat} className="text-sm text-gray-500 hover:text-gray-800">← Geri</button>
        <h2 className="text-2xl font-bold text-gray-800">{taslak.id ? 'İstek Listesi Düzenle' : 'Yeni İstek Listesi'}</h2>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Şube *</label>
            <select value={lokId || ''} onChange={e => setLokId(Number(e.target.value))}
              className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white">
              {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tedarikçi *</label>
            <AranabilirSecici secenekler={tedarikciler.map(t => ({ deger: t.id, etiket: t.ad }))}
              deger={tedarikciId} onChange={v => setTedarikciId(v)} placeholder="Tedarikçi ara / seç" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarih</label>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div className="relative">
          <input ref={aramaRef} value={arama} onChange={e => araFn(e.target.value)}
            placeholder="🔍 Ürün adı ile ara, eklemek için tıkla..."
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

        {kalemler.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ürün</th>
                  <th className="text-center px-3 py-2 font-medium w-28">Mevcut Stok</th>
                  <th className="text-center px-3 py-2 font-medium w-28">Adet</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {kalemler.map(k => (
                  <tr key={k.urun_id} className="border-t">
                    <td className="px-3 py-1.5">{k.ad}</td>
                    <td className="px-3 py-1.5 text-center text-gray-500">{stoklar[k.urun_id] ?? 0}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="number" min="1" value={k.miktar}
                        onChange={e => kalemGuncelle(k.urun_id, e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-sm text-center" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button onClick={() => kalemSil(k.urun_id)} className="text-gray-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan={2} className="px-3 py-2 text-right font-semibold text-gray-600">Toplam Adet</td>
                  <td className="px-3 py-2 text-center font-bold text-gray-800">{toplamAdet}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={kaydet} disabled={mesgul || !kalemler.length}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {mesgul ? 'Kaydediliyor…' : '✓ Kaydet & PDF Al'}
          </button>
          <button onClick={onKapat} className="px-5 py-2 rounded-lg text-sm border hover:bg-gray-50">İptal</button>
        </div>
      </div>
    </div>
  )
}
