import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { stokApi, lokasyonApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { eslesirMi } from '../utils/arama'
import { useSiralama } from '../hooks/useSiralama'
import SiraliBaslik from '../components/SiraliBaslik'
import StokSayim from '../components/StokSayim'
import { usePersistentState } from '../hooks/usePersistentState'

// Stok sayfası: 2026-08-11 yeniden tasarımıyla iki alt sekmeye ayrıldı —
// 📋 Stok Durumu (görüntüleme/düzeltme) ve 🔢 Sayım (StokSayim.jsx).
// Gerekçe + kararlar: docs/superpowers/specs/2026-08-11-stok-sayim-design.md
export default function Stok() {
  const { erisilebilirLokasyonlar, yetkiVar } = useAuth()
  const duzenleYetkisi = yetkiVar('stok_duzenle')
  const sayimYetkisi = yetkiVar('stok_sayim')

  const [sekme, setSekme] = usePersistentState('stok_sekme', 'durum')
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [stoklar, setStoklar] = useState([])
  // Arama/filtre KALICI: sekmeler arasında gezinince sıfırlanmaz (cihaza özel).
  const [arama, setArama] = usePersistentState('stok_arama', '')
  const [dusukStok, setDusukStok] = usePersistentState('stok_dusuk_filtre', false)
  const [duzenleModal, setDuzenleModal] = useState(null)
  const [acikLokasyonlar, setAcikLokasyonlar] = useState([])

  const yukle = useCallback(async () => {
    try { setStoklar(await stokApi.listele({})) } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { yukle() }, [yukle, sekme]) // sayımdan dönünce güncel stok görünsün
  useEffect(() => { lokasyonApi.listele().then(lok => setLokasyonlar(erisilebilirLokasyonlar(lok))) }, [])

  function lokasyonAcKapat(lokId) {
    setAcikLokasyonlar(prev => prev.includes(lokId) ? prev.filter(id => id !== lokId) : [...prev, lokId])
  }

  function magazaStoklari(lokId) {
    return stoklar.filter(s => s.lokasyon_id === lokId).filter(s =>
      eslesirMi([s.urun_adi, s.barkod, s.sku].filter(Boolean).join(' '), arama)
    ).filter(s => !dusukStok || s.miktar <= s.minimum_stok)
  }

  async function stokGuncelle(e) {
    e.preventDefault()
    try {
      await stokApi.guncelle({ urun_id: duzenleModal.urun_id, lokasyon_id: duzenleModal.lokasyon_id, miktar: parseInt(duzenleModal.yeni_miktar) })
      toast.success('Stok güncellendi')
      setDuzenleModal(null)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  const sekmeler = (
    <div className="flex gap-1 mb-4 border-b">
      {[['durum', '📋 Stok Durumu'], ...(sayimYetkisi ? [['sayim', '🔢 Sayım']] : [])].map(([k, l]) => (
        <button key={k} onClick={() => setSekme(k)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sekme === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          {l}
        </button>
      ))}
    </div>
  )

  if (sekme === 'sayim' && sayimYetkisi) {
    return (
      <div className="p-5">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Stok</h2>
        {sekmeler}
        <StokSayim lokasyonlar={lokasyonlar} />
      </div>
    )
  }

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Stok</h2>
      {sekmeler}

      {/* Genel arama + düşük stok filtresi */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün adı, stok kodu veya barkod ara (tüm mağazalar)..." className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
        <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
          <input type="checkbox" checked={dusukStok} onChange={e => setDusukStok(e.target.checked)} />
          <span className="text-red-600 font-medium">⚠ Düşük Stok</span>
        </label>
      </div>

      {/* Her mağaza ayrı bölüm */}
      <div className="space-y-6">
        {lokasyonlar.map(lok => {
          const acik = arama.trim() !== '' || acikLokasyonlar.includes(lok.id)
          const adet = magazaStoklari(lok.id).length
          return (
            <section key={lok.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b flex-wrap">
                <h3 className="flex items-center gap-2 font-bold text-gray-800">
                  🏪 {lok.ad}
                  <span className="text-xs font-normal text-gray-400">({adet} ürün)</span>
                </h3>
                <button type="button" onClick={() => lokasyonAcKapat(lok.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    acik ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                         : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                  📋 Stok Durumu
                </button>
              </div>
              {acik && <StokTablosu satirlar={magazaStoklari(lok.id)} duzenleYetkisi={duzenleYetkisi}
                onDuzenle={s => setDuzenleModal({ ...s, yeni_miktar: s.miktar })} />}
            </section>
          )
        })}
        {lokasyonlar.length === 0 && (
          <div className="text-center py-10 text-gray-400">Erişebileceğiniz bir mağaza yok.</div>
        )}
      </div>

      {/* Stok düzenleme modalı */}
      {duzenleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold mb-1">{duzenleModal.urun_adi}</h3>
            <p className="text-sm text-gray-500 mb-4">{lokasyonlar.find(l => l.id === duzenleModal.lokasyon_id)?.ad}</p>
            <form onSubmit={stokGuncelle} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Mevcut Miktar</label>
                <input type="number" value={duzenleModal.yeni_miktar} min="0" autoFocus
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

// Normal stok tablosu (bir mağaza için)
function StokTablosu({ satirlar, duzenleYetkisi, onDuzenle }) {
  const sr = useSiralama(satirlar, { deger: (s, k) => k === 'urun_adi' ? s.urun_adi : s[k] })
  const { dilim, ...sayfalama } = useSayfalama(sr.sirali, 50)
  return (
    <>
    <table className="w-full text-sm">
      <thead className="bg-white border-b">
        <tr>
          <SiraliBaslik k="urun_adi" {...sr}>Ürün</SiraliBaslik>
          <SiraliBaslik k="barkod" {...sr}>Barkod</SiraliBaslik>
          <SiraliBaslik k="kategori" {...sr}>Kategori</SiraliBaslik>
          <SiraliBaslik k="miktar" {...sr}>Miktar</SiraliBaslik>
          <SiraliBaslik k="minimum_stok" {...sr}>Min.</SiraliBaslik>
          <th className="text-left px-4 py-2.5 font-medium text-gray-600">Durum</th>
          <th className="px-4 py-2.5"></th>
        </tr>
      </thead>
      <tbody>
        {dilim.map((s) => {
          const kritik = s.miktar <= s.minimum_stok
          return (
            <tr key={s.id ?? `${s.urun_id}-${s.lokasyon_id}`} className={`border-b ${kritik && s.miktar === 0 ? 'bg-red-50' : kritik ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
              <td className="px-4 py-2.5 font-medium">{s.urun_adi}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.barkod || '—'}</td>
              <td className="px-4 py-2.5 text-gray-500">{s.kategori || '—'}</td>
              <td className="px-4 py-2.5 font-bold text-lg">{s.miktar}</td>
              <td className="px-4 py-2.5 text-gray-400">{s.minimum_stok}</td>
              <td className="px-4 py-2.5">
                {s.miktar === 0
                  ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Tükendi</span>
                  : kritik
                  ? <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Düşük</span>
                  : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Normal</span>}
              </td>
              <td className="px-4 py-2.5">
                {duzenleYetkisi && (
                  <button onClick={() => onDuzenle(s)} className="text-blue-600 hover:underline text-xs">Düzenle</button>
                )}
              </td>
            </tr>
          )
        })}
        {satirlar.length === 0 && (
          <tr><td colSpan={7} className="text-center py-8 text-gray-400">Stok kaydı bulunamadı</td></tr>
        )}
      </tbody>
    </table>
    <div className="px-2"><Sayfalama {...sayfalama} /></div>
    </>
  )
}
