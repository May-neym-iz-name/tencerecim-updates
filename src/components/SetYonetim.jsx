import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { setApi, urunlerApi, markaApi, kategoriApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'
import Sayfalama from './Sayfalama'
import SiraliBaslik from './SiraliBaslik'
import { useBarkodTarama } from '../hooks/useBarkodTarama'
import { useDebounce } from '../hooks/useDebounce'
import { useSayfalama } from '../hooks/useSayfalama'
import { useSiralama } from '../hooks/useSiralama'

// Kendi setlerimizi yönetme: mevcut ürünlerden set oluştur, tek SET fiyatı belirle.
// Satışta set seçilince bileşenler fişe girer ama yalnızca set fiyatı geçerli olur.
export default function SetYonetim({ baslangicArama = '' }) {
  const [setler, setSetler] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState(null) // set kaydı ya da null (yeni)
  // Arama SUNUCUDA (set adı + bileşen ürün adları) — ürün aramasıyla aynı Türkçe mantığı.
  const [arama, setArama] = useState(baslangicArama)
  const geciktirilmisArama = useDebounce(arama, 250)

  const yukle = useCallback(() => {
    setApi.listele({ arama: geciktirilmisArama.trim() || undefined })
      .then(setSetler).catch(e => toast.error(e.message))
  }, [geciktirilmisArama])
  useEffect(() => { yukle() }, [yukle])

  // Bileşen sayısı/adı üzerinden de sıralanabilsin diye türetilmiş alan verilir.
  const sr = useSiralama(setler, {
    deger: (s, k) => k === 'parca' ? s.bilesenler.reduce((t, b) => t + b.miktar, 0) : s[k],
  })
  const { dilim: sayfaSetler, ...sayfalama } = useSayfalama(sr.sirali, 50)

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

      <div className="flex gap-2 items-center mb-3">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="🔍 Set adı veya içindeki ürün adıyla ara..."
          className="border rounded-lg px-3 py-2 text-sm flex-1" />
        {arama && <button onClick={() => setArama('')} className="text-xs text-gray-500 hover:text-red-600 px-2">✕ Temizle</button>}
        <span className="text-xs text-gray-400 whitespace-nowrap">{setler.length} set</span>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <SiraliBaslik k="ad" {...sr}>Set Adı</SiraliBaslik>
              <SiraliBaslik k="sku" {...sr}>Stok Kodu</SiraliBaslik>
              <SiraliBaslik k="barkod" {...sr}>Barkod</SiraliBaslik>
              <SiraliBaslik k="fiyat" {...sr}>Set Fiyatı</SiraliBaslik>
              <SiraliBaslik k="parca" {...sr}>İçerik</SiraliBaslik>
              <th className="px-3 py-2 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {sayfaSetler.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50 align-top">
                <td className="px-3 py-2 font-medium text-gray-800">
                  🎁 {s.ad}
                  {s.marka_adi && <span className="ml-2 text-[10px] text-gray-400">{s.marka_adi}</span>}
                </td>
                {/* Eksik kod = pazaryeri/fatura eşleşmesi kopuk demek → göze batsın. */}
                <td className="px-3 py-2 text-xs font-mono text-gray-600">
                  {s.sku || <span className="text-amber-600 font-sans">eksik</span>}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-gray-600">
                  {s.barkod || <span className="text-amber-600 font-sans">eksik</span>}
                </td>
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
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                {arama.trim()
                  ? `"${arama.trim()}" için set bulunamadı.`
                  : 'Henüz set yok. "+ Set Oluştur" ile mevcut ürünlerden set hazırlayın.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      {formAcik && <SetFormu set={duzenlenen} kapat={() => setFormAcik(false)} onTamam={() => { setFormAcik(false); yukle() }} />}
    </div>
  )
}

// Set oluşturma/düzenleme modalı: ad + set fiyatı + marka/kategori filtreli
// ürün listesinden ekleme (sol: filtreli ürün havuzu, sağ: set içeriği).
function SetFormu({ set, kapat, onTamam }) {
  const [ad, setAd] = useState(set?.ad || '')
  const [fiyat, setFiyat] = useState(set?.fiyat || '')
  const [webLink, setWebLink] = useState(set?.web_link || '')
  // v1.2.180 — setin "ürün" alanları. SKU ve barkod OTOMATİK ÜRETİLMEZ: setin kodu
  // ikas ve bizimhesap'ta zaten var, üçünün birebir aynı olması şart. Burada üretilen
  // bir kod dördüncü, uyumsuz bir kimlik yaratırdı.
  const [sku, setSku] = useState(set?.sku || '')
  const [barkod, setBarkod] = useState(set?.barkod || '')
  const [kdv, setKdv] = useState(set?.kdv_orani ?? '')
  const [aciklama, setAciklama] = useState(set?.aciklama || '')
  const [markaId, setMarkaId] = useState(set?.marka_id || '')
  const [kategoriId, setKategoriId] = useState(set?.kategori_id || '')
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
      // Ürün alanları HER ZAMAN gönderilir (boş string dahil) — sunucu tarafı
      // "gönderilmedi = dokunma, boş gönderildi = temizle" ayrımı yapıyor. Boş
      // göndermeseydik yanlış girilmiş bir SKU'yu silmek mümkün olmazdı.
      const veri = {
        ad: ad.trim(),
        fiyat: Number(fiyat),
        web_link: webLink.trim(),
        sku: sku.trim(),
        barkod: barkod.trim(),
        kdv_orani: kdv,
        aciklama: aciklama.trim(),
        marka_id: markaId || null,
        kategori_id: kategoriId || null,
        kalemler: kalemler.map(k => ({ urun_id: k.urun_id, miktar: k.miktar })),
      }
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

          {/* Setin "ürün" kimliği. Bu alanlar pazaryeri ilanı ve faturada ürünle
              AYNI şeyleri istiyor; set ayrı bir kayıt olduğu için burada tutuluyor.
              SKU/barkod kutuları bilerek boş açılır — kod ikas ve bizimhesap'tan
              KOPYALANIR, burada üretilmez ([[sku-tek-kaynak-kurali]]). */}
          <div className="grid grid-cols-4 gap-2 mb-3 flex-shrink-0">
            <label className="text-xs text-gray-500">Stok Kodu (SKU)
              <input value={sku} onChange={e => setSku(e.target.value)}
                placeholder="TNC.SET.00001" className="border rounded px-2 py-1.5 text-sm w-full mt-0.5 font-mono" />
            </label>
            <label className="text-xs text-gray-500">Barkod
              <input value={barkod} onChange={e => setBarkod(e.target.value)}
                placeholder="2900000000000" className="border rounded px-2 py-1.5 text-sm w-full mt-0.5 font-mono" />
            </label>
            <label className="text-xs text-gray-500">KDV %
              <input type="number" min="0" max="100" step="1" value={kdv} onChange={e => setKdv(e.target.value)}
                placeholder="bileşenlerden" className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
            </label>
            {/* Setin web sitesi sayfası. Sosyal medya otomasyonunda "Online Sipariş
                Hattı" satırı olarak gider. ikas'tan otomatik çekilemez — set ikas'ta
                ayrı ürün değil, bizim paketimiz. */}
            <label className="text-xs text-gray-500">Web Sitesi Linki
              <input type="url" value={webLink} onChange={e => setWebLink(e.target.value)}
                placeholder="https://tencerecim.store/..." className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
            <label className="text-xs text-gray-500 block">Marka
              <div className="mt-0.5">
                <AranabilirSecici secenekler={markalar.map(m => ({ deger: m.id, etiket: m.ad }))}
                  deger={markaId} onChange={setMarkaId} placeholder="Marka seçilmedi" />
              </div>
            </label>
            <label className="text-xs text-gray-500 block">Kategori
              <div className="mt-0.5">
                <AranabilirSecici secenekler={kategoriler.map(k => ({ deger: k.id, etiket: k.tam_yol || k.ad }))}
                  deger={kategoriId} onChange={setKategoriId} placeholder="Kategori seçilmedi" />
              </div>
            </label>
          </div>

          {/* Pazaryeri ilan metninin kaynağı. Set içeriğini ADDAN türetmek yanlış
              sonuç veriyor — açıklama tek güvenilir kaynak ([[urun-terimleri]]). */}
          <label className="text-xs text-gray-500 mb-3 flex-shrink-0 block">Açıklama
            <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} rows={2}
              placeholder="Setin içeriği ve pazaryeri ilan metni…"
              className="border rounded px-2 py-1.5 text-sm w-full mt-0.5 resize-none" />
          </label>

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
