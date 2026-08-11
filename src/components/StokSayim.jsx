import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { stokApi, urunlerApi, markaApi, kategoriApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'
import { eslesirMi } from '../utils/arama'
import { useBarkodTarama } from '../hooks/useBarkodTarama'
import { useDebounce } from '../hooks/useDebounce'
import { usePersistentState } from '../hooks/usePersistentState'

// Stok Sayımı sekmesi (2026-08-11 yeniden tasarım — docs/superpowers/specs/…-stok-sayim-design.md):
// üç mod (Hızlı / Kapsamlı / Tam), fark kontrol ekranı, geçmiş sayımlar.
// Tamamlama SUNUCUDA delta uygular (sayım sürerken satış düşse bile kaybolmaz).
//
// Büyük fark eşiği: |fark| >= 3 VEYA beklenenin >= %50'si → fark raporunda kırmızı.
const BUYUK_FARK = (k) =>
  Math.abs(k.fark) >= 3 || (k.beklenen_miktar > 0 && Math.abs(k.fark) >= k.beklenen_miktar * 0.5)

export default function StokSayim({ lokasyonlar }) {
  // Aktif sayım kalıcı: uygulama kapansa da devam eder (cihaza özel).
  const [aktifSayim, setAktifSayim] = usePersistentState('stok_aktif_sayim', null)
  const [farkRaporuAcik, setFarkRaporuAcik] = useState(false)
  const [gecmis, setGecmis] = useState([])
  const [gecmisDetay, setGecmisDetay] = useState(null) // sayimGetir sonucu

  const gecmisYukle = useCallback(() => {
    stokApi.sayimListele({}).then(setGecmis).catch(() => {})
  }, [])
  useEffect(() => { if (!aktifSayim) gecmisYukle() }, [aktifSayim, gecmisYukle])

  // ---- Sayım → veritabanı senkronu ----
  // UI iyimser güncellenir; DB yazımı bu effect'te. (Gerekçe: setState güncelleyicisinden
  // değer sızdırma hatası — bkz. sayim-kayit-kaybi hafızası.) Hata olursa 3 sn'de bir dener.
  const aktifSayimRef = useRef(aktifSayim)
  aktifSayimRef.current = aktifSayim
  const senkRef = useRef({ sayimId: null, yazilan: new Map(), calisiyor: false, zamanlayici: null, hataToast: false })

  const senkronla = useCallback(async () => {
    const s = senkRef.current
    if (s.calisiyor) return
    s.calisiyor = true
    try {
      for (;;) {
        const sayim = aktifSayimRef.current
        if (!sayim || sayim.id !== s.sayimId) return
        const bekleyen = sayim.kalemler.find(k =>
          k.sayilan_miktar != null && s.yazilan.get(k.urun_id) !== k.sayilan_miktar)
        if (!bekleyen) { s.hataToast = false; return }
        const deger = bekleyen.sayilan_miktar
        try {
          await stokApi.sayimKalem(sayim.id, { urun_id: bekleyen.urun_id, sayilan_miktar: deger })
          s.yazilan.set(bekleyen.urun_id, deger)
        } catch (e) {
          if (!s.hataToast) {
            s.hataToast = true
            toast.error('Sayım kaydedilemedi, yeniden denenecek: ' + e.message, { duration: 6000 })
          }
          clearTimeout(s.zamanlayici)
          s.zamanlayici = setTimeout(() => senkronla(), 3000)
          return
        }
      }
    } finally { s.calisiyor = false }
  }, [])

  useEffect(() => {
    const s = senkRef.current
    if (!aktifSayim) {
      s.sayimId = null; s.yazilan = new Map(); clearTimeout(s.zamanlayici)
      return
    }
    if (s.sayimId !== aktifSayim.id) { s.sayimId = aktifSayim.id; s.yazilan = new Map() }
    senkronla()
  }, [aktifSayim, senkronla])

  async function tumunuDByeYaz() {
    const sayim = aktifSayimRef.current
    if (!sayim) return
    const s = senkRef.current
    for (const k of sayim.kalemler) {
      if (k.sayilan_miktar == null) continue
      if (s.yazilan.get(k.urun_id) === k.sayilan_miktar) continue
      await stokApi.sayimKalem(sayim.id, { urun_id: k.urun_id, sayilan_miktar: k.sayilan_miktar })
      s.yazilan.set(k.urun_id, k.sayilan_miktar)
    }
  }

  async function baslat({ lokasyon_id, tip, marka_id, kategori_id }) {
    try {
      const r = await stokApi.sayimBaslat({ lokasyon_id, tip, marka_id, kategori_id })
      const sayim = await stokApi.sayimGetir(r.sayim_id)
      setAktifSayim({
        lokasyon_id, tip, id: sayim.id,
        kalemler: sayim.kalemler.map(k => ({ ...k, _girilen: '' })),
      })
      toast.success(tip === 'hizli'
        ? 'Hızlı sayım başladı — okuttuğunuz ürünler listeye eklenir.'
        : `Sayım başladı — ${sayim.kalemler.length} ürün.`)
    } catch (e) { toast.error(e.message) }
  }

  // Fark raporu: "Stoklara İşle" — asıl tamamlama.
  async function stoklaraIsle() {
    try {
      await tumunuDByeYaz()
      const r = await stokApi.sayimTamamla(aktifSayim.id, true)
      let mesaj = `Sayım tamamlandı — ${r.islenen} kalem işlendi.`
      if (r.kirpilan > 0) mesaj += ` ${r.kirpilan} kalem 0'ın altına düşeceği için 0'a sabitlendi.`
      toast.success(mesaj, { duration: 6000 })
      setFarkRaporuAcik(false)
      setAktifSayim(null)
    } catch (e) { toast.error(e.message) }
  }

  async function iptalEt() {
    if (!confirm('Sayımı iptal etmek istiyor musunuz? Girilen sayımlar stoğa işlenmez.')) return
    try { await stokApi.sayimIptal(aktifSayim.id) } catch { /* yerel iptal yeterli */ }
    setAktifSayim(null)
  }

  // Fark raporundan "yeniden say": DB'de sıfırla + ekranda sayımı sil.
  async function yenidenSay(urun_id) {
    try {
      await stokApi.sayimKalemSifirla(aktifSayim.id, urun_id)
      senkRef.current.yazilan.delete(urun_id)
      setAktifSayim(prev => prev && ({
        ...prev,
        kalemler: prev.kalemler.map(k => k.urun_id === urun_id
          ? { ...k, sayilan_miktar: null, fark: null, _girilen: '' } : k),
      }))
      toast('Kalem sayımdan çıkarıldı — yeniden sayabilirsiniz.', { icon: '🔁' })
    } catch (e) { toast.error(e.message) }
  }

  if (!aktifSayim) {
    return (
      <div className="space-y-6">
        <ModSecimi lokasyonlar={lokasyonlar} onBaslat={baslat} />
        <GecmisSayimlar gecmis={gecmis} onDetay={async (id) => {
          try { setGecmisDetay(await stokApi.sayimGetir(id)) } catch (e) { toast.error(e.message) }
        }} />
        {gecmisDetay && <GecmisDetayModal sayim={gecmisDetay} lokasyonlar={lokasyonlar} kapat={() => setGecmisDetay(null)} />}
      </div>
    )
  }

  return (
    <>
      <SayimEkrani aktifSayim={aktifSayim} setAktifSayim={setAktifSayim} lokasyonlar={lokasyonlar}
        onTamamla={() => setFarkRaporuAcik(true)} onIptal={iptalEt} />
      {farkRaporuAcik && (
        <FarkRaporu aktifSayim={aktifSayim} kapat={() => setFarkRaporuAcik(false)}
          onIsle={stoklaraIsle} onYenidenSay={yenidenSay} />
      )}
    </>
  )
}

// ---------- Mod seçimi ----------
function ModSecimi({ lokasyonlar, onBaslat }) {
  const [lokId, setLokId] = useState(lokasyonlar[0]?.id || '')
  useEffect(() => { if (!lokId && lokasyonlar.length) setLokId(lokasyonlar[0].id) }, [lokasyonlar])
  const [kapsamAcik, setKapsamAcik] = useState(false)
  const [markaF, setMarkaF] = useState('')
  const [kategoriF, setKategoriF] = useState('')
  const [markalar, setMarkalar] = useState([])
  const [kategoriler, setKategoriler] = useState([])

  useEffect(() => {
    markaApi.listele().then(setMarkalar).catch(() => {})
    kategoriApi.listele().then(setKategoriler).catch(() => {})
  }, [])

  const KARTLAR = [
    { tip: 'hizli', baslik: '⚡ Hızlı Sayım', aciklama: 'Boş başlar; okuttuğunuz ürünler listeye eklenir. Bir raf, bir koli, birkaç ürün — küçük kapsam için en pratik yol.' },
    { tip: 'kapsamli', baslik: '🎯 Kapsamlı Sayım', aciklama: 'Marka ve/veya kategori seçin; yalnız o ürünler listelenir. "Bu markayı bitirdim mi" takibi kolay.' },
    { tip: 'tam', baslik: '🏪 Tam Sayım', aciklama: 'Mağazadaki tüm ürünler. Dönemsel genel sayım için.' },
  ]

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold text-gray-800">Yeni Sayım Başlat</h3>
        {lokasyonlar.length > 1 && (
          <select value={lokId} onChange={e => setLokId(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm">
            {lokasyonlar.map(l => <option key={l.id} value={l.id}>🏪 {l.ad}</option>)}
          </select>
        )}
        {lokasyonlar.length === 1 && <span className="text-sm text-gray-500">🏪 {lokasyonlar[0].ad}</span>}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Sayım sırasında satış devam edebilir: tamamlarken yalnızca bulduğunuz <b>fark</b> stoğa işlenir,
        o sırada düşen satışlar kaybolmaz. Sayılmayan ürünlerin stoğuna dokunulmaz.
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        {KARTLAR.map(k => (
          <div key={k.tip} className="border rounded-xl p-4 flex flex-col hover:border-blue-300 transition-colors">
            <div className="font-semibold text-gray-800 mb-1">{k.baslik}</div>
            <p className="text-xs text-gray-500 flex-1">{k.aciklama}</p>
            {k.tip === 'kapsamli' && kapsamAcik ? (
              <div className="mt-3 space-y-2">
                <AranabilirSecici secenekler={markalar.map(m => ({ deger: m.id, etiket: m.ad }))}
                  deger={markaF} onChange={setMarkaF} placeholder="Marka (opsiyonel)" />
                <AranabilirSecici secenekler={kategoriler.map(x => ({ deger: x.id, etiket: x.tam_yol || x.ad }))}
                  deger={kategoriF} onChange={setKategoriF} placeholder="Kategori (opsiyonel)" />
                <div className="flex gap-2">
                  <button onClick={() => onBaslat({ lokasyon_id: lokId, tip: 'kapsamli', marka_id: markaF || undefined, kategori_id: kategoriF || undefined })}
                    disabled={!markaF && !kategoriF}
                    className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">Başlat</button>
                  <button onClick={() => setKapsamAcik(false)} className="border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">Vazgeç</button>
                </div>
              </div>
            ) : (
              <button onClick={() => k.tip === 'kapsamli' ? setKapsamAcik(true) : onBaslat({ lokasyon_id: lokId, tip: k.tip })}
                disabled={!lokId}
                className="mt-3 bg-emerald-600 text-white py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-40 font-medium">
                Başlat
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Aktif sayım ekranı ----------
function SayimEkrani({ aktifSayim, setAktifSayim, lokasyonlar, onTamamla, onIptal }) {
  const [arama, setArama] = useState('')
  const [barkodInput, setBarkodInput] = useState('')
  const [vurgulanan, setVurgulanan] = useState(null)
  const [sonOkutulanId, setSonOkutulanId] = useState(null)
  const [sayilanlarUstte, setSayilanlarUstte] = usePersistentState('stok_sayim_sayilanlar_ustte', false)
  const barkodRef = useRef(null)
  useEffect(() => { setTimeout(() => barkodRef.current?.focus(), 100) }, [aktifSayim.id])

  // Hızlı modda ürün adıyla arayıp ekleme (barkodu okunamayan/etiketsiz ürünler için).
  const [ekleArama, setEkleArama] = useState('')
  const gecEkleArama = useDebounce(ekleArama, 250)
  const [ekleSonuclar, setEkleSonuclar] = useState([])
  useEffect(() => {
    if (aktifSayim.tip !== 'hizli' || !gecEkleArama.trim()) { setEkleSonuclar([]); return }
    let iptal = false
    urunlerApi.listele({ arama: gecEkleArama.trim(), boyut: 0 })
      .then(r => { if (!iptal) setEkleSonuclar(r.urunler.slice(0, 8)) })
      .catch(() => {})
    return () => { iptal = true }
  }, [gecEkleArama, aktifSayim.tip])

  const lokAd = lokasyonlar.find(l => l.id === aktifSayim.lokasyon_id)?.ad || ''
  const TIP_ETIKET = { hizli: '⚡ Hızlı Sayım', kapsamli: '🎯 Kapsamlı Sayım', tam: '🏪 Tam Sayım' }

  function sonrakiSira(kalemler) {
    return Math.max(0, ...kalemler.map(k => Number(k._sira) || 0)) + 1
  }

  function kalemGir(urun_id, deger) {
    const sayi = parseInt(deger)
    setAktifSayim(prev => prev && ({
      ...prev,
      kalemler: prev.kalemler.map(k => {
        if (k.urun_id !== urun_id) return k
        const guncel = { ...k, _girilen: deger, _sira: deger === '' ? k._sira : sonrakiSira(prev.kalemler) }
        if (deger !== '' && !isNaN(sayi)) {
          guncel.sayilan_miktar = sayi
          guncel.fark = sayi - k.beklenen_miktar
        }
        return guncel
      }),
    }))
    if (deger !== '') setSonOkutulanId(urun_id)
  }

  function vurgula(urun_id) {
    setVurgulanan(urun_id)
    setTimeout(() => { document.getElementById('sayim-' + urun_id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, 50)
    setTimeout(() => setVurgulanan(v => (v === urun_id ? null : v)), 1600)
  }

  function arttir(urun_id) {
    setAktifSayim(prev => {
      if (!prev) return prev
      return {
        ...prev,
        kalemler: prev.kalemler.map(k => {
          if (k.urun_id !== urun_id) return k
          const yeni = (parseInt(k.sayilan_miktar ?? 0) || 0) + 1
          return { ...k, _girilen: String(yeni), sayilan_miktar: yeni, fark: yeni - k.beklenen_miktar,
            _sira: sonrakiSira(prev.kalemler) }
        }),
      }
    })
    setSonOkutulanId(urun_id)
    vurgula(urun_id)
  }

  // Listeye yeni kalem ekle (hızlı mod / tam modda stok kaydı olmayan ürün) ve +1 say.
  async function kalemEkleVeSay(urun_id) {
    try {
      const k = await stokApi.sayimKalemEkle(aktifSayim.id, urun_id)
      setAktifSayim(prev => {
        if (!prev) return prev
        if (prev.kalemler.some(x => x.urun_id === k.urun_id)) return prev
        return { ...prev, kalemler: [...prev.kalemler, { ...k, _girilen: '' }] }
      })
      // arttir ayrı state turunda çalışsın (ekleme önce işlensin)
      setTimeout(() => arttir(urun_id), 0)
      setEkleArama('')
    } catch (e) { toast.error(e.message) }
  }

  function barkodOkut(e) {
    e.preventDefault()
    kodIsle(barkodInput)
  }

  async function kodIsle(ham) {
    const kod = String(ham || '').trim()
    setBarkodInput('')
    if (!kod) return
    let kalem = aktifSayim.kalemler.find(k => String(k.barkod || '').trim() === kod)
    if (!kalem) {
      // Takma ad barkod ya da listede olmayan ürün → sunucuya sor.
      let urun = null
      try { urun = await urunlerApi.barkodla(kod) } catch { /* aşağıda ele alınır */ }
      if (urun) {
        kalem = aktifSayim.kalemler.find(k => k.urun_id === urun.id)
        if (!kalem) {
          // Kapsamlı sayımda kapsam dışı ürün BİLEREK eklenmez (kapsam takibi bozulmasın).
          if (aktifSayim.tip === 'kapsamli') {
            toast.error(`"${urun.ad}" bu sayımın kapsamı dışında (farklı marka/kategori).`)
            return
          }
          await kalemEkleVeSay(urun.id)
          return
        }
      }
    }
    if (!kalem) { toast.error('Ürün bulunamadı: ' + kod); return }
    arttir(kalem.urun_id)
  }

  useBarkodTarama({ ref: barkodRef, aktif: true, onKod: kodIsle })

  const sayilanSayisi = aktifSayim.kalemler.filter(k => k.sayilan_miktar != null).length

  const suzulen = aktifSayim.kalemler.filter(k =>
    eslesirMi([k.urun_adi, k.barkod, k.sku].filter(Boolean).join(' '), arama)
  )
  const kalemler = sayilanlarUstte
    ? [...suzulen].sort((a, b) => (Number(b._sira) || 0) - (Number(a._sira) || 0))
    : suzulen

  const son = sonOkutulanId != null ? aktifSayim.kalemler.find(k => k.urun_id === sonOkutulanId) : null
  const sonFark = son && son.sayilan_miktar != null ? son.sayilan_miktar - son.beklenen_miktar : null

  return (
    <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b flex-wrap">
        <h3 className="flex items-center gap-2 font-bold text-gray-800">
          {TIP_ETIKET[aktifSayim.tip] || 'Sayım'}
          <span className="text-xs font-normal text-gray-400">🏪 {lokAd}</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{sayilanSayisi}/{aktifSayim.kalemler.length} sayıldı</span>
          <button onClick={onIptal} className="border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-50">İptal</button>
          <button onClick={onTamamla} disabled={sayilanSayisi === 0}
            className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs hover:bg-green-700 disabled:opacity-40 font-medium">
            ✓ Tamamla…
          </button>
        </div>
      </div>

      <form onSubmit={barkodOkut} className="p-3 bg-blue-50 border-b flex gap-2 flex-wrap">
        <input ref={barkodRef} value={barkodInput} onChange={e => setBarkodInput(e.target.value)}
          placeholder="📷 Barkod okutun — otomatik +1 sayılır"
          className="flex-1 min-w-52 border rounded-lg px-3 py-2 text-sm" autoFocus />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+1 Ekle</button>
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="🔍 Listede ara…" className="w-48 border rounded-lg px-3 py-2 text-sm" />
      </form>

      {/* Hızlı mod: adıyla ara & listeye ekle */}
      {aktifSayim.tip === 'hizli' && (
        <div className="px-3 py-2 border-b bg-emerald-50/60 relative">
          <input value={ekleArama} onChange={e => setEkleArama(e.target.value)}
            placeholder="➕ Barkodu okunamayan ürünü adıyla arayıp ekleyin…"
            className="w-full border rounded-lg px-3 py-1.5 text-sm" />
          {ekleSonuclar.length > 0 && (
            <div className="absolute left-3 right-3 top-full -mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-64 overflow-auto">
              {ekleSonuclar.map(u => (
                <button key={u.id} type="button" onClick={() => kalemEkleVeSay(u.id)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex justify-between gap-2">
                  <span>{u.ad}</span>
                  <span className="text-emerald-600 flex-shrink-0">+ ekle & say</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {son && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-baseline gap-x-4 gap-y-1 flex-wrap">
          <span className="text-[11px] font-semibold tracking-wide text-amber-700 uppercase">Son okutulan</span>
          <span className="font-semibold text-gray-800 flex-1 min-w-40">{son.urun_adi}</span>
          <span className="text-xs text-gray-500">Sistemde <b className="text-gray-800 text-sm">{son.beklenen_miktar}</b></span>
          <span className="text-xs text-gray-500">Sayılan <b className="text-gray-800 text-sm">{son.sayilan_miktar ?? '—'}</b></span>
          <span className={`text-xs ${sonFark === null ? 'text-gray-400' : sonFark < 0 ? 'text-red-600' : sonFark > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
            Fark <b className="text-sm">{sonFark === null ? '—' : sonFark > 0 ? `+${sonFark}` : sonFark}</b>
          </span>
        </div>
      )}

      <div className="px-4 py-2 border-b bg-gray-50">
        <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={sayilanlarUstte} onChange={e => setSayilanlarUstte(e.target.checked)} />
          Sayılanlar üstte
        </label>
      </div>

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
            const fark = k.sayilan_miktar != null ? k.sayilan_miktar - k.beklenen_miktar : null
            const vurgulu = vurgulanan === k.urun_id
            return (
              <tr key={k.urun_id} id={'sayim-' + k.urun_id}
                className={`border-b transition-colors ${vurgulu ? 'bg-yellow-200' : fark !== null && fark !== 0 ? (fark < 0 ? 'bg-red-50' : 'bg-blue-50') : ''}`}>
                <td className="px-4 py-2 font-medium">{k.urun_adi}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{k.barkod || '—'}</td>
                <td className="px-4 py-2 font-bold">{k.beklenen_miktar}</td>
                <td className="px-4 py-2">
                  {/* Enter → odak barkod kutusuna döner (okuma kancası başka alan seçiliyken bilerek pasif). */}
                  <input type="number" value={k._girilen} min="0"
                    onChange={e => kalemGir(k.urun_id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); barkodRef.current?.focus() } }}
                    className="w-20 border rounded px-2 py-1 text-center text-sm" placeholder="—" />
                </td>
                <td className={`px-4 py-2 font-semibold ${fark === null ? 'text-gray-300' : fark < 0 ? 'text-red-600' : fark > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {fark === null ? '—' : fark > 0 ? `+${fark}` : fark}
                </td>
              </tr>
            )
          })}
          {kalemler.length === 0 && (
            <tr><td colSpan={5} className="text-center py-10 text-gray-400">
              {aktifSayim.tip === 'hizli'
                ? 'Liste boş — barkod okutun ya da adıyla arayıp ekleyin.'
                : 'Kalem bulunamadı.'}
            </td></tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

// ---------- Fark kontrol ekranı ----------
function FarkRaporu({ aktifSayim, kapat, onIsle, onYenidenSay }) {
  const [isleniyor, setIsleniyor] = useState(false)
  const sayilan = aktifSayim.kalemler.filter(k => k.sayilan_miktar != null)
  const farkli = sayilan
    .map(k => ({ ...k, fark: k.sayilan_miktar - k.beklenen_miktar }))
    .filter(k => k.fark !== 0)
    .sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark))
  const sayilmayan = aktifSayim.kalemler.length - sayilan.length

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={kapat}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800">Fark Kontrolü — Stoklara İşlemeden Önce</h3>
          <p className="text-sm text-gray-500 mt-1">
            <b className="text-gray-700">{sayilan.length}</b> kalem sayıldı ·{' '}
            <b className={farkli.length ? 'text-orange-600' : 'text-green-600'}>{farkli.length}</b> kalemde fark var
            {sayilmayan > 0 && <> · <b className="text-gray-700">{sayilmayan}</b> kalem sayılmadı — <u>stokları DEĞİŞMEYECEK</u></>}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Stoklara yalnızca fark işlenir; sayım sırasında yapılan satışlar korunur.
            Büyük farklar kırmızı işaretlidir — emin değilseniz "Yeniden say" ile kalemi geri alın.
          </p>
        </div>

        <div className="flex-1 overflow-auto">
          {farkli.length === 0 ? (
            <p className="text-center py-10 text-green-600 font-medium">✓ Hiç fark yok — sayım sistemle birebir uyumlu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  {['Ürün', 'Sistemde', 'Sayılan', 'Fark', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {farkli.map(k => {
                  const buyuk = BUYUK_FARK(k)
                  return (
                    <tr key={k.urun_id} className={`border-b ${buyuk ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-2 font-medium">
                        {buyuk && <span title="Büyük fark — kontrol edin" className="mr-1">⚠️</span>}
                        {k.urun_adi}
                      </td>
                      <td className="px-4 py-2">{k.beklenen_miktar}</td>
                      <td className="px-4 py-2 font-bold">{k.sayilan_miktar}</td>
                      <td className={`px-4 py-2 font-bold ${k.fark < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {k.fark > 0 ? `+${k.fark}` : k.fark}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => onYenidenSay(k.urun_id)}
                          className="text-orange-600 hover:underline text-xs whitespace-nowrap">🔁 Yeniden say</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={kapat} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">← Sayıma Dön</button>
          <button disabled={isleniyor} onClick={async () => { setIsleniyor(true); await onIsle(); setIsleniyor(false) }}
            className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 font-medium">
            {isleniyor ? 'İşleniyor…' : '✓ Stoklara İşle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Geçmiş sayımlar ----------
const DURUM_ROZET = {
  tamamlandi: ['Tamamlandı', 'bg-green-100 text-green-700'],
  iptal: ['İptal', 'bg-gray-100 text-gray-500'],
  devam_ediyor: ['Yarım kaldı', 'bg-amber-100 text-amber-700'],
}
const TIP_KISA = { hizli: '⚡ Hızlı', kapsamli: '🎯 Kapsamlı', tam: '🏪 Tam' }

function GecmisSayimlar({ gecmis, onDetay }) {
  if (!gecmis.length) return null
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 font-bold text-gray-800">Geçmiş Sayımlar</div>
      <table className="w-full text-sm">
        <thead className="bg-white border-b text-gray-600">
          <tr>
            {['Tarih', 'Mağaza', 'Tip', 'Durum', 'Sayılan', 'Farklı', ''].map((h, i) => (
              <th key={i} className="text-left px-4 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gecmis.map(s => {
            const [etiket, stil] = DURUM_ROZET[s.durum] || [s.durum, 'bg-gray-100 text-gray-500']
            return (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{s.baslangic_tarihi}</td>
                <td className="px-4 py-2">{s.lokasyon_adi}</td>
                <td className="px-4 py-2 text-xs">{TIP_KISA[s.tip] || s.tip || '🏪 Tam'}</td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${stil}`}>{etiket}</span></td>
                <td className="px-4 py-2 text-xs text-gray-500">{s.sayilan_sayisi}/{s.kalem_sayisi}</td>
                <td className={`px-4 py-2 text-xs font-semibold ${s.farkli_sayisi ? 'text-orange-600' : 'text-gray-400'}`}>{s.farkli_sayisi}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => onDetay(s.id)} className="text-blue-600 hover:underline text-xs">Rapor</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function GecmisDetayModal({ sayim, lokasyonlar, kapat }) {
  const farkli = sayim.kalemler.filter(k => k.fark != null && k.fark !== 0)
  const lokAd = lokasyonlar.find(l => l.id === sayim.lokasyon_id)?.ad || ''
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={kapat}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-800">Sayım Raporu — {lokAd}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {sayim.baslangic_tarihi} → {sayim.bitis_tarihi || '—'} · {TIP_KISA[sayim.tip] || 'Tam'} ·{' '}
            {sayim.kalemler.filter(k => k.sayilan_miktar != null).length}/{sayim.kalemler.length} sayıldı
          </p>
        </div>
        <div className="flex-1 overflow-auto">
          {farkli.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">Bu sayımda fark kaydı yok.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>{['Ürün', 'Sistemde', 'Sayılan', 'Fark'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {[...farkli].sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark)).map(k => (
                  <tr key={k.urun_id} className="border-b">
                    <td className="px-4 py-2">{k.urun_adi}</td>
                    <td className="px-4 py-2">{k.beklenen_miktar}</td>
                    <td className="px-4 py-2 font-bold">{k.sayilan_miktar}</td>
                    <td className={`px-4 py-2 font-bold ${k.fark < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {k.fark > 0 ? `+${k.fark}` : k.fark}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-3 border-t text-right">
          <button onClick={kapat} className="border px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50">Kapat</button>
        </div>
      </div>
    </div>
  )
}
