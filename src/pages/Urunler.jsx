import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { urunlerApi, markaApi, tedarikciApi, kategoriApi, excelApi } from '../api/ipc'
import BarkodModal from '../components/BarkodModal'

const BOSH = { ad: '', barkod: '', sku: '', marka_id: '', kategori_id: '', tedarikci_id: '', aciklama: '', alis_fiyati: '', satis_fiyati: '', kdv_orani: 20 }

// Kategorileri ağaç sırasına dizip her birinin derinliğini (girinti için) hesaplar.
function kategoriHiyerarsik(kategoriler) {
  return [...kategoriler]
    .sort((a, b) => (a.tam_yol || a.ad).localeCompare(b.tam_yol || b.ad, 'tr'))
    .map(k => ({ ...k, derinlik: ((k.tam_yol || '').match(/>/g) || []).length }))
}

function InlineEkle({ label, onEkle }) {
  const [deger, setDeger] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (!deger.trim()) return
    await onEkle(deger.trim())
    setDeger('')
  }
  return (
    <form onSubmit={submit} className="flex gap-1 mt-1">
      <input value={deger} onChange={e => setDeger(e.target.value)} placeholder={`Yeni ${label}...`}
        className="flex-1 border rounded px-2 py-1 text-xs" />
      <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">+</button>
    </form>
  )
}

export default function Urunler() {
  const [urunler, setUrunler] = useState([])
  const [toplam, setToplam] = useState(0)
  const [arama, setArama] = useState('')
  const [filtreMarka, setFiltreMarka] = useState('')
  const [filtreKategori, setFiltreKategori] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState(BOSH)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [markalar, setMarkalar] = useState([])
  const [tedarikciler, setTedarikciler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [excelSonuc, setExcelSonuc] = useState(null)
  const [barkodUrun, setBarkodUrun] = useState(null)

  const yukle = useCallback(async () => {
    try {
      const r = await urunlerApi.listele({ arama, marka_id: filtreMarka || undefined, kategori_id: filtreKategori || undefined, boyut: 0 })
      setUrunler(r.urunler); setToplam(r.toplam)
    } catch (e) { toast.error(e.message) }
  }, [arama, filtreMarka, filtreKategori])

  const yukleYardimcilar = useCallback(async () => {
    const [m, t, k] = await Promise.all([markaApi.listele(), tedarikciApi.listele(), kategoriApi.listele()])
    setMarkalar(m); setTedarikciler(t); setKategoriler(k)
  }, [])

  useEffect(() => { yukle() }, [yukle])
  useEffect(() => { yukleYardimcilar() }, [yukleYardimcilar])

  function handleDuzenle(u) {
    setForm({ ad: u.ad||'', barkod: u.barkod||'', sku: u.sku||'', marka_id: u.marka_id||'', kategori_id: u.kategori_id||'', tedarikci_id: u.tedarikci_id||'', aciklama: u.aciklama||'', alis_fiyati: u.alis_fiyati||'', satis_fiyati: u.satis_fiyati||'', kdv_orani: u.kdv_orani||20 })
    setDuzenlenenId(u.id); setFormAcik(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const veri = { ...form, marka_id: form.marka_id || null, kategori_id: form.kategori_id || null, tedarikci_id: form.tedarikci_id || null, alis_fiyati: parseFloat(form.alis_fiyati)||0, satis_fiyati: parseFloat(form.satis_fiyati), kdv_orani: parseInt(form.kdv_orani)||20 }
    try {
      if (duzenlenenId) await urunlerApi.guncelle(duzenlenenId, veri)
      else await urunlerApi.olustur(veri)
      toast.success(duzenlenenId ? 'Ürün güncellendi' : 'Ürün eklendi')
      setFormAcik(false); setDuzenlenenId(null); setForm(BOSH); yukle()
    } catch (e) { toast.error(e.message) }
  }

  async function handleSil(id) {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    try { await urunlerApi.sil(id); toast.success('Ürün silindi'); yukle() } catch (e) { toast.error(e.message) }
  }

  async function handleExcelYukle() {
    setExcelYukleniyor(true); setExcelSonuc(null)
    try {
      const dosya = await excelApi.dosyaSec()
      if (!dosya) { setExcelYukleniyor(false); return }
      toast('Excel dosyası içe aktarılıyor...', { icon: '⏳' })
      const sonuc = await excelApi.urunYukle(dosya)
      setExcelSonuc(sonuc)
      toast.success(`${sonuc.eklenen} ürün eklendi, ${sonuc.guncellenen} güncellendi`)
      yukle(); yukleYardimcilar()
    } catch (e) { toast.error(e.message) }
    setExcelYukleniyor(false)
  }

  async function markaEkle(ad) {
    try { await markaApi.olustur(ad); await yukleYardimcilar(); toast.success('Marka eklendi') } catch (e) { toast.error(e.message) }
  }
  async function tedarikciEkle(ad) {
    try { await tedarikciApi.olustur({ ad }); await yukleYardimcilar(); toast.success('Tedarikçi eklendi') } catch (e) { toast.error(e.message) }
  }
  async function kategoriEkle(ad) {
    try { await kategoriApi.olustur({ ad }); await yukleYardimcilar(); toast.success('Kategori eklendi') } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-800">Ürünler</h2>
        <div className="flex gap-2">
          <button onClick={handleExcelYukle} disabled={excelYukleniyor}
            className="flex items-center gap-1.5 border border-green-600 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 text-sm disabled:opacity-50">
            {excelYukleniyor ? '⏳ Yükleniyor...' : '📥 Excel İçe Aktar'}
          </button>
          <button onClick={() => { setForm(BOSH); setDuzenlenenId(null); setFormAcik(true) }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm">
            + Yeni Ürün
          </button>
        </div>
      </div>

      {excelSonuc && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex-shrink-0">
          <span className="font-medium">İçe aktarma tamamlandı:</span> {excelSonuc.eklenen} eklendi, {excelSonuc.guncellenen} güncellendi
          {excelSonuc.hatali > 0 && <span className="text-red-600 ml-2">, {excelSonuc.hatali} hatalı</span>}
          <button onClick={() => setExcelSonuc(null)} className="ml-3 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex gap-2 mb-3 flex-shrink-0 flex-wrap">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün, barkod veya SKU ara..." className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
        <select value={filtreMarka} onChange={e => setFiltreMarka(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Tüm Markalar</option>
          {markalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
        </select>
        <select value={filtreKategori} onChange={e => setFiltreKategori(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white max-w-56">
          <option value="">Tüm Kategoriler</option>
          {kategoriHiyerarsik(kategoriler).map(k => (
            <option key={k.id} value={k.id}>{'   '.repeat(k.derinlik)}{k.ad}</option>
          ))}
        </select>
        {(filtreMarka || filtreKategori || arama) && (
          <button onClick={() => { setFiltreMarka(''); setFiltreKategori(''); setArama('') }} className="text-xs text-gray-500 hover:text-red-600 px-2">✕ Temizle</button>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-lg border overflow-auto flex-1">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              {['Ürün Adı', 'Barkod', 'Marka', 'Kategori', 'Tedarikçi', 'Alış', 'Satış', 'KDV', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {urunler.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium max-w-xs truncate" title={u.ad}>{u.ad}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{u.barkod||'—'}</td>
                <td className="px-3 py-2 text-xs">{u.marka_adi||'—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500 max-w-[160px] truncate" title={u.kategori_yol}>{u.kategori_yol||'—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{u.tedarikci_adi||'—'}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">₺{(u.alis_fiyati||0).toFixed(2)}</td>
                <td className="px-3 py-2 font-semibold text-green-700 whitespace-nowrap">₺{u.satis_fiyati?.toFixed(2)}</td>
                <td className="px-3 py-2 text-gray-500">%{u.kdv_orani}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => setBarkodUrun(u)} className="text-gray-600 hover:underline text-xs mr-2" title="Barkod etiketi bas">🏷️ Barkod</button>
                  <button onClick={() => handleDuzenle(u)} className="text-blue-600 hover:underline text-xs mr-2">Düzenle</button>
                  <button onClick={() => handleSil(u.id)} className="text-red-500 hover:underline text-xs">Sil</button>
                </td>
              </tr>
            ))}
            {urunler.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Ürün bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-1.5 flex-shrink-0">Toplam: {toplam} ürün</div>

      {/* Form Modal */}
      {formAcik && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">{duzenlenenId ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ürün Adı *</label>
                  <input required value={form.ad} onChange={e => setForm(f=>({...f,ad:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>

                {/* Marka */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marka</label>
                  <select value={form.marka_id} onChange={e => setForm(f=>({...f,marka_id:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Seçin —</option>
                    {markalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
                  </select>
                  <InlineEkle label="marka" onEkle={markaEkle} />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                  <select value={form.kategori_id} onChange={e => setForm(f=>({...f,kategori_id:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Seçin —</option>
                    {kategoriHiyerarsik(kategoriler).map(k => (
                      <option key={k.id} value={k.id}>{'   '.repeat(k.derinlik)}{k.ad}</option>
                    ))}
                  </select>
                  <InlineEkle label="kategori" onEkle={kategoriEkle} />
                </div>

                {/* Tedarikçi */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tedarikçi</label>
                  <select value={form.tedarikci_id} onChange={e => setForm(f=>({...f,tedarikci_id:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Seçin —</option>
                    {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                  </select>
                  <InlineEkle label="tedarikçi" onEkle={tedarikciEkle} />
                </div>

                {[['barkod','Barkod','text'],['sku','SKU Kodu','text'],['alis_fiyati','Alış Fiyatı (₺)','number'],['satis_fiyati','Satış Fiyatı (₺) *','number'],['kdv_orani','KDV Oranı (%)','number']].map(([name,label,type]) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input type={type} step={type==='number'?'0.01':undefined} required={name==='satis_fiyati'}
                      value={form[name]} onChange={e => setForm(f=>({...f,[name]:e.target.value}))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                ))}

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
                  <textarea value={form.aciklama} onChange={e => setForm(f=>({...f,aciklama:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">{duzenlenenId ? 'Güncelle' : 'Ekle'}</button>
                <button type="button" onClick={() => { setFormAcik(false); setDuzenlenenId(null) }} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {barkodUrun && (
        <BarkodModal urun={barkodUrun} onKapat={() => setBarkodUrun(null)} />
      )}
    </div>
  )
}
