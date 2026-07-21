import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { stokApi, lokasyonApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { eslesirMi } from '../utils/arama'
import { useSiralama } from '../hooks/useSiralama'
import SiraliBaslik from '../components/SiraliBaslik'
import { usePersistentState } from '../hooks/usePersistentState'

export default function Stok() {
  const { erisilebilirLokasyonlar, yetkiVar } = useAuth()
  const duzenleYetkisi = yetkiVar('stok_duzenle')
  const sayimYetkisi = yetkiVar('stok_sayim')

  const [lokasyonlar, setLokasyonlar] = useState([])
  const [stoklar, setStoklar] = useState([])
  const [arama, setArama] = useState('')
  const [dusukStok, setDusukStok] = useState(false)
  const [duzenleModal, setDuzenleModal] = useState(null)
  const [acikLokasyonlar, setAcikLokasyonlar] = useState([]) // tıklanınca açılan mağaza id'leri

  // Aktif sayım (aynı anda tek mağaza): { lokasyon_id, id, kalemler:[{...,_girilen}] }
  // Kalıcı: başka sekmeye geçilse de devam eden sayım kaybolmaz.
  const [aktifSayim, setAktifSayim] = usePersistentState('stok_aktif_sayim', null)
  const [barkodInput, setBarkodInput] = useState('')
  const [vurgulanan, setVurgulanan] = useState(null) // okutulan ürün id (kaydır+vurgula)
  const barkodRef = useRef(null)

  const yukle = useCallback(async () => {
    try {
      const r = await stokApi.listele({})
      setStoklar(r)
    } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { yukle() }, [yukle])
  useEffect(() => { lokasyonApi.listele().then(lok => setLokasyonlar(erisilebilirLokasyonlar(lok))) }, [])

  // Sayım başlayınca barkod alanına odaklan
  useEffect(() => { if (aktifSayim) setTimeout(() => barkodRef.current?.focus(), 100) }, [aktifSayim?.id])

  function lokasyonAcKapat(lokId) {
    setAcikLokasyonlar(prev => prev.includes(lokId) ? prev.filter(id => id !== lokId) : [...prev, lokId])
  }

  function magazaStoklari(lokId) {
    // Kelime bazlı + Türkçe duyarsız (bkz. src/utils/arama.js). Eskiden locale'siz
    // toLowerCase() vardı: "ÇELİK" aranınca bulunmuyordu, kelime sırası da zorunluydu.
    // SKU de kapsama alındı — Ürünler/Satış ekranlarıyla aynı davransın.
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

  async function baslatSayim(lokId) {
    if (aktifSayim) { toast.error('Önce aktif sayımı tamamlayın veya iptal edin'); return }
    try {
      const r = await stokApi.sayimBaslat({ lokasyon_id: lokId })
      const sayim = await stokApi.sayimGetir(r.sayim_id)
      setAktifSayim({ lokasyon_id: lokId, id: sayim.id, kalemler: sayim.kalemler.map(k => ({ ...k, _girilen: '' })) })
      toast.success(`Sayım başladı — ${sayim.kalemler.length} ürün. Barkod okutarak sayabilirsiniz.`)
    } catch (e) { toast.error(e.message) }
  }

  async function kalemGir(urun_id, deger) {
    setAktifSayim(prev => prev && ({ ...prev, kalemler: prev.kalemler.map(k => k.urun_id === urun_id ? { ...k, _girilen: deger } : k) }))
    if (deger !== '' && !isNaN(parseInt(deger))) {
      try {
        const r = await stokApi.sayimKalem(aktifSayim.id, { urun_id, sayilan_miktar: parseInt(deger) })
        setAktifSayim(prev => prev && ({ ...prev, kalemler: prev.kalemler.map(k => k.urun_id === urun_id ? { ...k, sayilan_miktar: parseInt(deger), fark: r.fark } : k) }))
      } catch {}
    }
  }

  // Okutulan ürünü görünür yap ve kısa süre vurgula
  function vurgula(urun_id) {
    setVurgulanan(urun_id)
    setTimeout(() => { document.getElementById('sayim-' + urun_id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, 50)
    setTimeout(() => setVurgulanan(v => (v === urun_id ? null : v)), 1600)
  }

  // Barkod okutma → ilgili ürünün sayımını otomatik +1
  function barkodOkut(e) {
    e.preventDefault()
    const kod = barkodInput.trim()
    setBarkodInput('')
    if (!kod || !aktifSayim) return
    const varMi = aktifSayim.kalemler.some(k => String(k.barkod || '').trim() === kod)
    if (!varMi) { toast.error('Bu sayımda ürün bulunamadı: ' + kod); return }
    const sayimId = aktifSayim.id
    let hedef = null
    setAktifSayim(prev => {
      if (!prev) return prev
      return {
        ...prev,
        kalemler: prev.kalemler.map(k => {
          if (String(k.barkod || '').trim() !== kod) return k
          const yeni = (parseInt(k.sayilan_miktar ?? 0) || 0) + 1
          hedef = { urun_id: k.urun_id, deger: yeni }
          return { ...k, _girilen: String(yeni), sayilan_miktar: yeni, fark: yeni - k.beklenen_miktar }
        }),
      }
    })
    if (hedef) {
      stokApi.sayimKalem(sayimId, { urun_id: hedef.urun_id, sayilan_miktar: hedef.deger }).catch(() => {})
      vurgula(hedef.urun_id)
    }
  }

  async function tamamlaSayim() {
    if (!confirm('Sayımı tamamlayıp stokları güncellemek istiyor musunuz?')) return
    try {
      await stokApi.sayimTamamla(aktifSayim.id, true)
      toast.success('Sayım tamamlandı, stoklar güncellendi!')
      setAktifSayim(null)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  function iptalSayim() {
    if (confirm('Sayımı iptal etmek istiyor musunuz? Girilen sayımlar stoğa işlenmez.')) setAktifSayim(null)
  }

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Stok</h2>

      {/* Genel arama + düşük stok filtresi */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün ara (tüm mağazalar)..." className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
        <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
          <input type="checkbox" checked={dusukStok} onChange={e => setDusukStok(e.target.checked)} />
          <span className="text-red-600 font-medium">⚠ Düşük Stok</span>
        </label>
      </div>

      {/* Her mağaza ayrı bölüm */}
      <div className="space-y-6">
        {lokasyonlar.map(lok => {
          const sayimAktif = aktifSayim?.lokasyon_id === lok.id
          // Sayım aktifse veya arama yapılıyorsa içerik her zaman açık; aksi halde tıklanınca açılır
          const acik = sayimAktif || arama.trim() !== '' || acikLokasyonlar.includes(lok.id)
          const adet = magazaStoklari(lok.id).length
          return (
            <section key={lok.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Mağaza kutucuğu başlığı */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b flex-wrap">
                <h3 className="flex items-center gap-2 font-bold text-gray-800">
                  🏪 {lok.ad}
                  <span className="text-xs font-normal text-gray-400">({adet} ürün)</span>
                </h3>
                {sayimAktif ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {aktifSayim.kalemler.filter(k => k.sayilan_miktar !== null && k.sayilan_miktar !== undefined).length}/{aktifSayim.kalemler.length} sayıldı
                    </span>
                    <button onClick={iptalSayim} className="border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-50">İptal</button>
                    <button onClick={tamamlaSayim} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs hover:bg-green-700 font-medium">✓ Tamamla & Güncelle</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => lokasyonAcKapat(lok.id)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        acik ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                             : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                      📋 Stok Durumu
                    </button>
                    {sayimYetkisi && (
                      <button onClick={() => baslatSayim(lok.id)} disabled={!!aktifSayim}
                        className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-40 font-medium">
                        🔢 Stok Sayımı
                      </button>
                    )}
                  </div>
                )}
              </div>

              {acik && (sayimAktif
                ? <SayimTablosu aktifSayim={aktifSayim} arama={arama} vurgulanan={vurgulanan}
                    barkodInput={barkodInput} setBarkodInput={setBarkodInput} barkodOkut={barkodOkut} barkodRef={barkodRef}
                    kalemGir={kalemGir} />
                : <StokTablosu satirlar={magazaStoklari(lok.id)} duzenleYetkisi={duzenleYetkisi}
                    onDuzenle={s => setDuzenleModal({ ...s, yeni_miktar: s.miktar })} />)}
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

// Aktif sayım tablosu (barkod okutma + manuel giriş)
function SayimTablosu({ aktifSayim, arama, vurgulanan, barkodInput, setBarkodInput, barkodOkut, barkodRef, kalemGir }) {
  const kalemler = aktifSayim.kalemler.filter(k =>
    eslesirMi([k.urun_adi, k.barkod, k.sku].filter(Boolean).join(' '), arama)
  )
  return (
    <div>
      <form onSubmit={barkodOkut} className="p-3 bg-blue-50 border-b flex gap-2">
        <input ref={barkodRef} value={barkodInput} onChange={e => setBarkodInput(e.target.value)}
          placeholder="📷 Barkod okutun — otomatik +1 sayılır"
          className="flex-1 border rounded-lg px-3 py-2 text-sm" autoFocus />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+1 Ekle</button>
      </form>
      <table className="w-full text-sm">
        <thead className="bg-white border-b">
          <tr>
            {['Ürün', 'Barkod', 'Sistemde', 'Sayılan', 'Fark'].map(h => (
              <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kalemler.map(k => {
            const fark = k.sayilan_miktar !== null && k.sayilan_miktar !== undefined ? k.sayilan_miktar - k.beklenen_miktar : null
            const vurgulu = vurgulanan === k.urun_id
            return (
              <tr key={k.urun_id} id={'sayim-' + k.urun_id}
                className={`border-b transition-colors ${vurgulu ? 'bg-yellow-200' : fark !== null && fark !== 0 ? (fark < 0 ? 'bg-red-50' : 'bg-blue-50') : ''}`}>
                <td className="px-4 py-2 font-medium">{k.urun_adi}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{k.barkod || '—'}</td>
                <td className="px-4 py-2 font-bold">{k.beklenen_miktar}</td>
                <td className="px-4 py-2">
                  <input type="number" value={k._girilen} min="0"
                    onChange={e => kalemGir(k.urun_id, e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-center text-sm" placeholder="—" />
                </td>
                <td className={`px-4 py-2 font-semibold ${fark === null ? 'text-gray-300' : fark < 0 ? 'text-red-600' : fark > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {fark === null ? '—' : fark > 0 ? `+${fark}` : fark}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
