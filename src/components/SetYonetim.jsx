import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { setApi, urunlerApi, markaApi, kategoriApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'
import { useBarkodTarama } from '../hooks/useBarkodTarama'

// Kendi setlerimizi yönetme: mevcut ürünlerden set oluştur, tek SET fiyatı belirle.
// Satışta set seçilince bileşenler fişe girer ama yalnızca set fiyatı geçerli olur.
export default function SetYonetim() {
  const [setler, setSetler] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState(null) // set kaydı ya da null (yeni)

  function yukle() { setApi.listele().then(setSetler).catch(e => toast.error(e.message)) }
  useEffect(yukle, [])

  async function sil(s) {
    if (!confirm(`"${s.ad}" seti silinsin mi? (Ürünler etkilenmez)`)) return
    try { await setApi.sil(s.id); toast.success('Set silindi'); yukle() } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Kendi setleriniz — satışta tek <b>set fiyatı</b> geçerli olur; fişte bileşen ürünler fiyatsız listelenir, stok bileşenlerden düşer.
        </p>
        <button onClick={() => { setDuzenlenen(null); setFormAcik(true) }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm flex-shrink-0">
          + Set Oluştur
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Set Adı</th>
              <th className="px-3 py-2 font-medium">Set Fiyatı</th>
              <th className="px-3 py-2 font-medium">İçerik</th>
              <th className="px-3 py-2 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {setler.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50 align-top">
                <td className="px-3 py-2 font-medium text-gray-800">🎁 {s.ad}</td>
                <td className="px-3 py-2 font-bold text-green-700">₺{Number(s.fiyat).toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {s.bilesenler.map(b => `${b.ad}${b.miktar > 1 ? ` ×${b.miktar}` : ''}`).join(' + ') || '—'}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => { setDuzenlenen(s); setFormAcik(true) }}
                    className="text-blue-600 hover:underline text-xs mr-2">Düzenle</button>
                  <button onClick={() => sil(s)} className="text-red-600 hover:underline text-xs">Sil</button>
                </td>
              </tr>
            ))}
            {setler.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                Henüz set yok. "+ Set Oluştur" ile mevcut ürünlerden set hazırlayın.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {formAcik && <SetFormu set={duzenlenen} kapat={() => setFormAcik(false)} onTamam={() => { setFormAcik(false); yukle() }} />}
    </div>
  )
}

// Set oluşturma/düzenleme modalı: ad + set fiyatı + marka/kategori filtreli
// ürün listesinden ekleme (sol: filtreli ürün havuzu, sağ: set içeriği).
function SetFormu({ set, kapat, onTamam }) {
  const [ad, setAd] = useState(set?.ad || '')
  const [fiyat, setFiyat] = useState(set?.fiyat || '')
  const [kalemler, setKalemler] = useState(set?.bilesenler?.map(b => ({ urun_id: b.urun_id, ad: b.ad, miktar: b.miktar })) || [])
  const [arama, setArama] = useState('')
  // Barkod okuyucu: kutuya tıklamadan okutulabilsin, her okutmada eskisi silinsin.
  const aramaRef = useRef(null)
  useBarkodTarama({ ref: aramaRef, onKod: setArama })
  const [markaF, setMarkaF] = useState('')     // marka filtresi
  const [kategoriF, setKategoriF] = useState('') // kategori filtresi
  const [markalar, setMarkalar] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [liste, setListe] = useState([])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    markaApi.listele().then(setMarkalar).catch(() => {})
    kategoriApi.listele().then(setKategoriler).catch(() => {})
  }, [])

  // Ürün havuzu: marka/kategori filtresi + arama — debounce'lu, her zaman listeli.
  useEffect(() => {
    const t = setTimeout(() => {
      urunlerApi.listele({
        arama: arama.trim() || undefined,
        marka_id: markaF || undefined,
        kategori_id: kategoriF || undefined,
        boyut: 0,
      }).then(r => setListe(r.urunler)).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [arama, markaF, kategoriF])

  function ekle(u) {
    setKalemler(k => k.some(x => x.urun_id === u.id)
      ? k.map(x => x.urun_id === u.id ? { ...x, miktar: x.miktar + 1 } : x)
      : [...k, { urun_id: u.id, ad: u.ad, miktar: 1 }])
  }
  function miktar(urun_id, m) {
    if (m <= 0) { setKalemler(k => k.filter(x => x.urun_id !== urun_id)); return }
    setKalemler(k => k.map(x => x.urun_id === urun_id ? { ...x, miktar: m } : x))
  }
  const setteki = (id) => kalemler.find(k => k.urun_id === id)

  async function kaydet(e) {
    e.preventDefault()
    if (!ad.trim()) { toast.error('Set adı girin'); return }
    if (!(Number(fiyat) > 0)) { toast.error('Set fiyatı girin'); return }
    if (kalemler.length === 0) { toast.error('Sete en az bir ürün ekleyin'); return }
    setKaydediliyor(true)
    try {
      const veri = { ad: ad.trim(), fiyat: Number(fiyat), kalemler: kalemler.map(k => ({ urun_id: k.urun_id, miktar: k.miktar })) }
      if (set?.id) await setApi.guncelle({ id: set.id, ...veri })
      else await setApi.olustur(veri)
      toast.success(set?.id ? 'Set güncellendi' : 'Set oluşturuldu')
      onTamam()
    } catch (err) { toast.error(err.message) }
    finally { setKaydediliyor(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={kapat}>
      <div className="bg-white rounded-xl w-full max-w-5xl h-[88vh] flex flex-col p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex-shrink-0">🎁 {set?.id ? 'Seti Düzenle' : 'Yeni Set Oluştur'}</h3>
        <form onSubmit={kaydet} className="flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-4 gap-2 mb-3 flex-shrink-0">
            <label className="col-span-3 text-xs text-gray-500">Set Adı *
              <input value={ad} onChange={e => setAd(e.target.value)} autoFocus
                placeholder="Örn: Çeyiz Paketi 12 Parça" className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
            </label>
            <label className="text-xs text-gray-500">Set Fiyatı (₺) *
              <input type="number" min="0" step="0.01" value={fiyat} onChange={e => setFiyat(e.target.value)}
                placeholder="0,00" className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
            </label>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            {/* SOL: filtreli ürün havuzu */}
            <div className="flex flex-col min-h-0 border rounded-lg overflow-hidden">
              <div className="p-2 border-b bg-gray-50 space-y-2 flex-shrink-0">
                <input ref={aramaRef} value={arama} onChange={e => setArama(e.target.value)}
                  placeholder="🔍 Ürün / barkod ara…" className="border rounded px-2 py-1.5 text-sm w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <AranabilirSecici secenekler={markalar.map(m => ({ deger: m.id, etiket: m.ad }))}
                    deger={markaF} onChange={v => setMarkaF(v)} placeholder="Tüm Markalar" />
                  <AranabilirSecici secenekler={kategoriler.map(k => ({ deger: k.id, etiket: k.tam_yol || k.ad }))}
                    deger={kategoriF} onChange={v => setKategoriF(v)} placeholder="Tüm Kategoriler" />
                </div>
              </div>
              <div className="flex-1 overflow-auto divide-y">
                {liste.map(u => {
                  const k = setteki(u.id)
                  return (
                    <button key={u.id} type="button" onClick={() => ekle(u)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${k ? 'bg-purple-50' : 'hover:bg-blue-50'}`}>
                      <span className="flex-1 text-gray-800 leading-snug">{u.ad}</span>
                      {k
                        ? <span className="bg-purple-600 text-white rounded-full px-2 py-0.5 text-[10px] font-bold flex-shrink-0">sette ×{k.miktar}</span>
                        : <span className="text-blue-600 flex-shrink-0">+ ekle</span>}
                    </button>
                  )
                })}
                {liste.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Ürün bulunamadı.</p>}
              </div>
              <div className="px-3 py-1.5 border-t bg-gray-50 text-[11px] text-gray-400 flex-shrink-0">{liste.length} ürün listelendi — tıklayarak ekle</div>
            </div>

            {/* SAĞ: set içeriği */}
            <div className="flex flex-col min-h-0 border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b bg-purple-50 text-xs font-semibold text-purple-800 flex-shrink-0">
                🎁 Set İçeriği ({kalemler.reduce((t, k) => t + k.miktar, 0)} parça)
              </div>
              <div className="flex-1 overflow-auto divide-y">
                {kalemler.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Soldan ürün seçin.</p>}
                {kalemler.map(k => (
                  <div key={k.urun_id} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-xs text-gray-800 flex-1 leading-snug">{k.ad}</span>
                    <div className="flex items-center border rounded-lg overflow-hidden flex-shrink-0">
                      <button type="button" onClick={() => miktar(k.urun_id, k.miktar - 1)}
                        className="px-2 py-0.5 text-gray-500 hover:bg-gray-100 text-sm font-bold">−</button>
                      <span className="px-2 text-sm font-semibold min-w-[1.5rem] text-center">{k.miktar}</span>
                      <button type="button" onClick={() => miktar(k.urun_id, k.miktar + 1)}
                        className="px-2 py-0.5 text-gray-500 hover:bg-gray-100 text-sm font-bold">+</button>
                    </div>
                    <button type="button" onClick={() => miktar(k.urun_id, 0)}
                      className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 flex-shrink-0">
            <button type="button" onClick={kapat} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">İptal</button>
            <button type="submit" disabled={kaydediliyor}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {kaydediliyor ? 'Kaydediliyor…' : (set?.id ? 'Güncelle' : 'Seti Oluştur')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
