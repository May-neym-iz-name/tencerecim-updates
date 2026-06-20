import { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { urunlerApi, satisApi, musteriApi, lokasyonApi, markaApi, kategoriApi } from '../api/ipc'

const MUSTERI_BOSH = { ad: '', soyad: '', telefon: '', iskonto_orani: '' }

export default function Satis() {
  // Ürün browser
  const [urunler, setUrunler] = useState([])
  const [urunArama, setUrunArama] = useState('')
  const [secilenKategori, setSecilenKategori] = useState('')
  const [secilenMarka, setSecilenMarka] = useState('')
  const [kategoriler, setKategoriler] = useState([])
  const [markalar, setMarkalar] = useState([])
  const [urunYukleniyor, setUrunYukleniyor] = useState(false)
  const [kategoriAcik, setKategoriAcik] = useState(false)
  const kategoriRef = useRef()

  // Lokasyon
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [secilenLokasyonId, setSecilenLokasyonId] = useState(null)

  // Barkod
  const [barkodInput, setBarkodInput] = useState('')
  const barkodRef = useRef()

  // Müşteri
  const [musteriArama, setMusteriArama] = useState('')
  const [musteriSonuclari, setMusteriSonuclari] = useState([])
  const [secilenMusteri, setSecilenMusteri] = useState(null)
  const [musteriFormAcik, setMusteriFormAcik] = useState(false)
  const [musteriForm, setMusteriForm] = useState(MUSTERI_BOSH)
  const [musteriKayitYukleniyor, setMusteriKayitYukleniyor] = useState(false)

  // Sepet
  const [sepet, setSepet] = useState([])
  const [genelIskonto, setGenelIskonto] = useState(0)
  const [odemeTipi, setOdemeTipi] = useState('nakit')
  const [islemde, setIslemde] = useState(false)

  // Başlangıç yüklemesi
  useEffect(() => {
    lokasyonApi.listele().then(lok => {
      setLokasyonlar(lok)
      if (lok.length) setSecilenLokasyonId(lok[0].id)
    })
    markaApi.listele().then(setMarkalar)
    kategoriApi.listele().then(setKategoriler)
  }, [])

  // Kategori dropdown dışına tıklanınca kapat
  useEffect(() => {
    function handler(e) {
      if (kategoriRef.current && !kategoriRef.current.contains(e.target)) setKategoriAcik(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Müşteri iskontosu otomatik uygula
  useEffect(() => {
    if (secilenMusteri?.iskonto_orani > 0) setGenelIskonto(secilenMusteri.iskonto_orani)
    else setGenelIskonto(0)
  }, [secilenMusteri])

  // Ürün listesini yükle (filtreler değişince)
  const urunleriYukle = useCallback(async () => {
    setUrunYukleniyor(true)
    try {
      const r = await urunlerApi.listele({
        arama: urunArama || undefined,
        marka_id: secilenMarka || undefined,
        kategori_id: secilenKategori || undefined,
        boyut: 48,
      })
      setUrunler(r.urunler)
    } catch {}
    setUrunYukleniyor(false)
  }, [urunArama, secilenMarka, secilenKategori])

  useEffect(() => {
    const t = setTimeout(urunleriYukle, 200)
    return () => clearTimeout(t)
  }, [urunleriYukle])

  // Müşteri arama
  const musteriAraFn = useCallback(async (deger) => {
    setMusteriArama(deger)
    if (secilenMusteri) return
    if (deger.length >= 2) {
      try { const r = await musteriApi.listele({ arama: deger, boyut: 6 }); setMusteriSonuclari(r.musteriler) }
      catch {}
    } else { setMusteriSonuclari([]) }
  }, [secilenMusteri])

  // Barkod
  async function barkodSorgu(e) {
    e.preventDefault()
    if (!barkodInput.trim()) return
    try {
      const urun = await urunlerApi.barkodla(barkodInput.trim())
      if (urun) sepeteEkle(urun)
      else toast.error('Barkod bulunamadı')
    } catch { toast.error('Ürün bulunamadı') }
    setBarkodInput('')
  }

  function sepeteEkle(urun) {
    setSepet(prev => {
      const mevcut = prev.find(k => k.urun_id === urun.id)
      if (mevcut) return prev.map(k => k.urun_id === urun.id ? { ...k, miktar: k.miktar + 1 } : k)
      return [...prev, { urun_id: urun.id, ad: urun.ad, satis_fiyati: urun.satis_fiyati, kdv_orani: urun.kdv_orani, miktar: 1, kalem_iskonto: 0 }]
    })
    toast.success(`${urun.ad.substring(0, 30)} eklendi`, { duration: 900, position: 'bottom-right' })
  }

  function miktarDegistir(urun_id, miktar) {
    if (miktar <= 0) { setSepet(prev => prev.filter(k => k.urun_id !== urun_id)); return }
    setSepet(prev => prev.map(k => k.urun_id === urun_id ? { ...k, miktar } : k))
  }

  // Müşteri kaydet
  async function musteriKaydet(e) {
    e.preventDefault()
    if (!musteriForm.ad.trim()) return
    setMusteriKayitYukleniyor(true)
    try {
      const veri = {
        ad: musteriForm.ad.trim(),
        soyad: musteriForm.soyad.trim(),
        telefon: musteriForm.telefon.trim(),
        iskonto_orani: parseFloat(musteriForm.iskonto_orani) || 0,
      }
      const yeniMusteri = await musteriApi.olustur(veri)
      setSecilenMusteri({ ...veri, id: yeniMusteri.id })
      setMusteriArama(`${veri.ad} ${veri.soyad}`.trim())
      setMusteriFormAcik(false)
      setMusteriForm(MUSTERI_BOSH)
      toast.success('Müşteri eklendi ve seçildi')
    } catch (e) { toast.error(e.message) }
    setMusteriKayitYukleniyor(false)
  }

  // Hesaplamalar
  const efektifIskonto = (k) => Math.max(k.kalem_iskonto || 0, genelIskonto)
  const kalemToplam = (k) => k.satis_fiyati * k.miktar * (1 - efektifIskonto(k) / 100)
  const toplamKDVsiz = sepet.reduce((t, k) => t + kalemToplam(k) * 100 / (100 + k.kdv_orani), 0)
  const toplamKDV = sepet.reduce((t, k) => t + kalemToplam(k) * k.kdv_orani / (100 + k.kdv_orani), 0)
  const toplamIskonto = sepet.reduce((t, k) => t + k.satis_fiyati * k.miktar * efektifIskonto(k) / 100, 0)
  const genelToplam = sepet.reduce((t, k) => t + kalemToplam(k), 0)

  async function satisOlustur() {
    if (!secilenLokasyonId) { toast.error('Lokasyon seçin'); return }
    if (sepet.length === 0) { toast.error('Sepet boş'); return }
    setIslemde(true)
    try {
      const satis = await satisApi.olustur({
        lokasyon_id: secilenLokasyonId,
        musteri_id: secilenMusteri?.id || null,
        odeme_tipi: odemeTipi,
        genel_iskonto: genelIskonto,
        kalemler: sepet.map(k => ({ urun_id: k.urun_id, miktar: k.miktar, iskonto_orani: efektifIskonto(k) })),
      })
      toast.success(`✓ Satış tamamlandı — Fiş: ${satis.fis_no}`)
      setSepet([]); setSecilenMusteri(null); setMusteriArama(''); setGenelIskonto(0)
      barkodRef.current?.focus()
    } catch (e) { toast.error(e.message || 'Satış hatası') }
    setIslemde(false)
  }

  const secilenKategoriAdi = kategoriler.find(k => String(k.id) === secilenKategori)?.tam_yol || null
  const sepetteVar = (id) => sepet.find(k => k.urun_id === id)

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* ===== SOL: Ürün Browser ===== */}
      <div className="flex-1 flex flex-col overflow-hidden border-r">

        {/* Üst bar */}
        <div className="bg-white border-b px-3 py-2 flex gap-2 items-center flex-shrink-0">
          <select value={secilenLokasyonId || ''} onChange={e => setSecilenLokasyonId(Number(e.target.value))}
            className="border rounded-lg px-2.5 py-1.5 text-sm bg-white text-gray-700 font-medium flex-shrink-0">
            {lokasyonlar.map(l => <option key={l.id} value={l.id}>🏪 {l.ad}</option>)}
          </select>
          <form onSubmit={barkodSorgu} className="flex gap-1.5 flex-shrink-0">
            <input ref={barkodRef} value={barkodInput} onChange={e => setBarkodInput(e.target.value)}
              placeholder="📷 Barkod..." className="border rounded-lg px-3 py-1.5 text-sm w-36" autoFocus />
            <button type="submit" className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Ekle</button>
          </form>
          <input value={urunArama} onChange={e => setUrunArama(e.target.value)}
            placeholder="🔍 Ürün ara..." className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
        </div>

        {/* Filtre bar: Kategori dropdown + Marka pills */}
        <div className="bg-white border-b px-3 py-2 flex gap-3 items-center flex-shrink-0">

          {/* Kategori — custom dropdown */}
          <div className="relative flex-shrink-0" ref={kategoriRef}>
            <button
              onClick={() => setKategoriAcik(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors min-w-[160px] ${secilenKategori ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
              <span className="text-gray-400">📂</span>
              <span className="flex-1 text-left truncate max-w-[140px]">
                {secilenKategoriAdi || 'Tüm Kategoriler'}
              </span>
              {secilenKategori && (
                <span onClick={e => { e.stopPropagation(); setSecilenKategori('') }}
                  className="ml-1 text-blue-400 hover:text-red-500 text-xs font-bold">✕</span>
              )}
              {!secilenKategori && <span className="text-gray-400 text-xs">▼</span>}
            </button>

            {kategoriAcik && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-2xl z-30 w-72 max-h-80 overflow-auto">
                <div className="p-2 border-b">
                  <button onClick={() => { setSecilenKategori(''); setKategoriAcik(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!secilenKategori ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
                    Tüm Kategoriler
                  </button>
                </div>
                <div className="p-2 space-y-0.5">
                  {/* Ana kategoriler ve alt kategoriler gruplu */}
                  {kategoriler.filter(k => !k.ust_id).map(ana => {
                    const altlar = kategoriler.filter(k => k.ust_id === ana.id)
                    return (
                      <div key={ana.id}>
                        <button
                          onClick={() => { setSecilenKategori(String(ana.id)); setKategoriAcik(false) }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${secilenKategori === String(ana.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-800'}`}>
                          {ana.ad}
                        </button>
                        {altlar.map(alt => (
                          <button key={alt.id}
                            onClick={() => { setSecilenKategori(String(alt.id)); setKategoriAcik(false) }}
                            className={`w-full text-left pl-7 pr-3 py-1.5 rounded-lg text-xs transition-colors ${secilenKategori === String(alt.id) ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                            └ {alt.ad}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dikey ayraç */}
          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          {/* Marka — yatay kaydırılabilir pills */}
          <div className="flex-1 overflow-x-auto flex gap-1.5 items-center pb-0.5" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setSecilenMarka('')}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${!secilenMarka ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}>
              Tümü
            </button>
            {markalar.map(m => (
              <button key={m.id} onClick={() => setSecilenMarka(secilenMarka === String(m.id) ? '' : String(m.id))}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${secilenMarka === String(m.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}>
                {m.ad}
              </button>
            ))}
          </div>
        </div>

        {/* Ürün Grid */}
        <div className="flex-1 overflow-auto p-3">
          {urunYukleniyor && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Yükleniyor...</div>
          )}
          {!urunYukleniyor && urunler.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Ürün bulunamadı</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {urunler.map(u => {
              const sepetKalem = sepetteVar(u.id)
              return (
                <button key={u.id} onClick={() => sepeteEkle(u)} title={u.ad}
                  className={`relative text-left rounded-xl border p-2.5 transition-all hover:shadow-md active:scale-95 flex flex-col ${sepetKalem ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  {/* Sepet sayacı */}
                  {sepetKalem && (
                    <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold z-10">
                      {sepetKalem.miktar}
                    </span>
                  )}
                  {/* Marka / kategori */}
                  <div className="text-xs text-gray-400 mb-1 truncate w-full pr-5">
                    {u.marka_adi || u.kategori_yol || '—'}
                  </div>
                  {/* Ürün adı — sabit 2 satır yüksekliği */}
                  <div className="text-xs font-medium text-gray-800 leading-snug mb-2 flex-1"
                    style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '3.6em' }}>
                    {u.ad}
                  </div>
                  {/* Fiyat */}
                  <div className="text-sm font-bold text-green-700 mt-auto">₺{u.satis_fiyati?.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">KDV %{u.kdv_orani}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ===== SAĞ: Sepet + Ödeme ===== */}
      <div className="w-80 flex flex-col bg-white flex-shrink-0">

        {/* Müşteri alanı */}
        <div className="border-b p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Müşteri</span>
            <button onClick={() => { setMusteriFormAcik(true); setMusteriForm(MUSTERI_BOSH) }}
              className="text-xs text-blue-600 hover:underline font-medium">+ Yeni Müşteri</button>
          </div>
          {secilenMusteri ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
              <div>
                <div className="text-sm font-medium text-blue-800">{secilenMusteri.ad} {secilenMusteri.soyad}</div>
                {secilenMusteri.iskonto_orani > 0 && (
                  <div className="text-xs text-green-600 font-medium">%{secilenMusteri.iskonto_orani} sabit iskonto</div>
                )}
              </div>
              <button onClick={() => { setSecilenMusteri(null); setMusteriArama(''); setMusteriSonuclari([]) }}
                className="text-gray-400 hover:text-red-500 text-base ml-2">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={musteriArama} onChange={e => musteriAraFn(e.target.value)}
                placeholder="Ad, telefon ile ara..." className="w-full border rounded-lg px-3 py-1.5 text-sm" />
              {musteriSonuclari.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-xl z-20 mt-1 max-h-44 overflow-auto">
                  {musteriSonuclari.map(m => (
                    <button key={m.id} onClick={() => { setSecilenMusteri(m); setMusteriArama(`${m.ad} ${m.soyad}`); setMusteriSonuclari([]) }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0">
                      <span className="font-medium">{m.ad} {m.soyad}</span>
                      {m.telefon && <span className="text-gray-400 ml-2 text-xs">{m.telefon}</span>}
                      {m.iskonto_orani > 0 && <span className="text-green-600 ml-1.5 text-xs font-medium">%{m.iskonto_orani}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sepet listesi */}
        <div className="flex-1 overflow-auto">
          {sepet.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none">
              <div className="text-4xl mb-2">🛒</div>
              <div className="text-sm">Ürüne tıklayarak sepete ekle</div>
            </div>
          ) : (
            <div className="divide-y">
              {sepet.map(k => (
                <div key={k.urun_id} className="px-3 py-2.5">
                  <div className="flex justify-between items-start gap-1 mb-1.5">
                    <span className="text-xs font-medium text-gray-800 leading-tight flex-1 line-clamp-2">{k.ad}</span>
                    <button onClick={() => setSepet(p => p.filter(i => i.urun_id !== k.urun_id))}
                      className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0 ml-1 mt-0.5">✕</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg overflow-hidden flex-shrink-0">
                      <button onClick={() => miktarDegistir(k.urun_id, k.miktar - 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 text-sm font-bold">−</button>
                      <span className="px-2 text-sm font-semibold min-w-[1.5rem] text-center">{k.miktar}</span>
                      <button onClick={() => miktarDegistir(k.urun_id, k.miktar + 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 text-sm font-bold">+</button>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">%</span>
                      <input type="number" min="0" max="100" step="0.5"
                        value={k.kalem_iskonto || ''} placeholder={String(genelIskonto || '0')}
                        onChange={e => setSepet(prev => prev.map(i => i.urun_id === k.urun_id ? { ...i, kalem_iskonto: parseFloat(e.target.value) || 0 } : i))}
                        className="w-12 border rounded px-1.5 py-1 text-xs text-center" />
                    </div>
                    <div className="ml-auto text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-800">₺{kalemToplam(k).toFixed(2)}</div>
                      {efektifIskonto(k) > 0 && <div className="text-xs text-green-600">-%{efektifIskonto(k)}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alt: Özet + Ödeme + Buton */}
        <div className="border-t bg-gray-50 p-3 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">Genel İskonto</span>
            <input type="number" min="0" max="100" step="0.5" value={genelIskonto || ''}
              onChange={e => setGenelIskonto(parseFloat(e.target.value) || 0)}
              placeholder="0" className="w-16 border rounded-lg px-2 py-1 text-xs text-center ml-auto" />
            <span className="text-xs text-gray-400">%</span>
          </div>

          <div className="bg-white rounded-lg border p-2.5 space-y-1">
            <div className="flex justify-between text-xs text-gray-500"><span>Ara Toplam</span><span>₺{toplamKDVsiz.toFixed(2)}</span></div>
            {toplamIskonto > 0 && <div className="flex justify-between text-xs text-green-600"><span>İskonto</span><span>-₺{toplamIskonto.toFixed(2)}</span></div>}
            <div className="flex justify-between text-xs text-gray-500"><span>KDV</span><span>₺{toplamKDV.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-bold border-t pt-1.5 mt-1"><span>Toplam</span><span className="text-green-700">₺{genelToplam.toFixed(2)}</span></div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {[['nakit', '💵', 'Nakit'], ['kart', '💳', 'Kart'], ['havale', '🏦', 'Havale']].map(([val, icon, label]) => (
              <button key={val} onClick={() => setOdemeTipi(val)}
                className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${odemeTipi === val ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          <button onClick={satisOlustur} disabled={islemde || sepet.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 text-sm transition-colors">
            {islemde ? '⏳ İşleniyor...' : `✓ Satışı Tamamla  ₺${genelToplam.toFixed(2)}`}
          </button>

          {sepet.length > 0 && (
            <button onClick={() => setSepet([])}
              className="w-full border border-red-200 text-red-500 py-1.5 rounded-lg text-xs hover:bg-red-50">
              🗑 Sepeti Temizle
            </button>
          )}
        </div>
      </div>

      {/* ===== Yeni Müşteri Modal ===== */}
      {musteriFormAcik && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setMusteriFormAcik(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold">Yeni Müşteri Ekle</h3>
              <button onClick={() => setMusteriFormAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={musteriKaydet} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ad *</label>
                  <input required value={musteriForm.ad} onChange={e => setMusteriForm(f => ({ ...f, ad: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Soyad</label>
                  <input value={musteriForm.soyad} onChange={e => setMusteriForm(f => ({ ...f, soyad: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input value={musteriForm.telefon} onChange={e => setMusteriForm(f => ({ ...f, telefon: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="05xx xxx xx xx" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sabit İskonto Oranı (%)</label>
                <input type="number" min="0" max="100" value={musteriForm.iskonto_orani}
                  onChange={e => setMusteriForm(f => ({ ...f, iskonto_orani: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={musteriKayitYukleniyor}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
                  {musteriKayitYukleniyor ? 'Kaydediliyor...' : 'Kaydet & Seç'}
                </button>
                <button type="button" onClick={() => setMusteriFormAcik(false)}
                  className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
