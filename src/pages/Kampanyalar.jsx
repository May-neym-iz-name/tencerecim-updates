// Kampanya sekmesi (v1.2.204): ikas kampanyaları + kuponları. Yerel tablo yok, her açılışta ikas'tan.
// Sol: liste. Sağ: form (ikas panel bölüm sırası) + kupon paneli (yalnız kaydedilmiş kuponlu kampanyada).
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kampanyaApi } from '../api/ipc'
import KampanyaFormu, { BOS_FORM } from '../components/kampanya/KampanyaFormu'
import KuponPaneli from '../components/kampanya/KuponPaneli'

const TUR_SIMGE = { RATIO: '％', FIXED_AMOUNT: '₺', FREE_SHIPPING: '🚚', BUY_X_THEN_GET_Y: '🎁' }
const tarih = (ms) => ms ? new Date(ms).toLocaleDateString('tr-TR') : ''

export default function Kampanyalar() {
  const [liste, setListe] = useState([])
  const [ara, setAra] = useState('')
  const [sozlukler, setSozlukler] = useState(null)
  const [form, setForm] = useState(null)
  const [dagitimlar, setDagitimlar] = useState([])
  const [mesgul, setMesgul] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)

  const listeYukle = () => kampanyaApi.liste().then(setListe).catch(e => toast.error(e.message)).finally(() => setYukleniyor(false))
  useEffect(() => { listeYukle(); kampanyaApi.sozlukler().then(setSozlukler).catch(e => toast.error('Sözlükler alınamadı: ' + e.message)) }, [])

  async function ac(k) {
    try {
      const r = await kampanyaApi.getir(k.id)
      setForm(r.form)
      setDagitimlar(k.hasCoupon ? await kampanyaApi.dagitimlar(k.id) : [])
    } catch (e) { toast.error(e.message) }
  }
  async function kaydet() {
    setMesgul(true)
    try {
      const r = await kampanyaApi.kaydet(form)
      if (r.farklar.length) toast(`Kaydedildi ama ikas şu alanları farklı okudu: ${r.farklar.join(', ')}`, { icon: '⚠️', duration: 8000 })
      else toast.success('Kampanya kaydedildi ve doğrulandı')
      await listeYukle()
      const r2 = await kampanyaApi.getir(r.id); setForm(r2.form)
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }
  async function sil() {
    if (!form?.id || !window.confirm(`"${form.baslik}" kampanyası ikas'tan silinsin mi? Kuponları da silinir.`)) return
    setMesgul(true)
    try { await kampanyaApi.sil(form.id); toast.success('Silindi'); setForm(null); listeYukle() }
    catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  const suz = liste.filter(k => !ara.trim() || k.title.toLocaleLowerCase('tr').includes(ara.trim().toLocaleLowerCase('tr')))

  return (
    <div className="flex h-full">
      <aside className="w-80 border-r bg-white flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-marka-900 flex-1">🎯 Kampanyalar</h2>
            <button onClick={() => { setForm(BOS_FORM()); setDagitimlar([]) }} className="bg-marka-900 text-white px-3 py-1.5 rounded-lg text-sm">+ Ekle</button>
          </div>
          <input value={ara} onChange={e => setAra(e.target.value)} placeholder="🔍 Kampanya ara…" className="w-full border rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex-1 overflow-auto">
          {yukleniyor && <p className="text-sm text-gray-400 p-4">ikas'tan okunuyor…</p>}
          {!yukleniyor && !suz.length && <p className="text-sm text-gray-400 p-4">Kampanya yok.</p>}
          {suz.map(k => (
            <button key={k.id} onClick={() => ac(k)}
              className={`w-full text-left px-3 py-2.5 border-b hover:bg-krem-100 ${form?.id === k.id ? 'bg-krem-200' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg w-6 text-center">{TUR_SIMGE[k.type] || '•'}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{k.title.trim()}</div>
                  <div className="text-xs text-gray-500">{k.hasCoupon ? '🎟 kuponlu' : 'otomatik'} · kullanılan {k.usageCount}{k.dateRange?.end ? ` · bitiş ${tarih(k.dateRange.end)}` : ''}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-4">
        {!form ? (
          <div className="text-gray-400 text-sm p-8 text-center">Soldan bir kampanya seçin ya da "+ Ekle" ile yeni oluşturun.</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-2 sticky top-0 bg-gray-50 py-2 z-10">
              <h2 className="font-bold text-lg text-marka-900 flex-1">{form.id ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</h2>
              {form.id && <button onClick={sil} disabled={mesgul} className="text-sm text-red-600 px-3 py-2">Sil</button>}
              <button onClick={() => setForm(null)} className="text-sm text-gray-600 px-3 py-2">Kapat</button>
              <button onClick={kaydet} disabled={mesgul} className="bg-marka-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">{mesgul ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
            <KampanyaFormu form={form} setForm={setForm} sozlukler={sozlukler} />
            {form.id && form.kuponlu && <KuponPaneli kampanyaId={form.id} dagitimlar={dagitimlar} />}
            {!form.id && form.kuponlu && <p className="text-xs text-gray-500">Kuponlar kampanya kaydedildikten sonra eklenir.</p>}
          </div>
        )}
      </main>
    </div>
  )
}
