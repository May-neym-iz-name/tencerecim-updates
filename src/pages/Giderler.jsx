import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { giderApi, lokasyonApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { useSiralama } from '../hooks/useSiralama'
import SiraliBaslik from '../components/SiraliBaslik'

const PARA = (n) => `₺${(Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const KATEGORILER = ['Kira', 'Elektrik/Su/Doğalgaz', 'Personel', 'Nakliye', 'Pazarlama', 'Bakım/Onarım', 'Vergi/SGK', 'Diğer']
const BUGUN = () => new Date().toISOString().slice(0, 10)
const AY_BASI = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }

export default function Giderler() {
  const { profil, erisilebilirLokasyonlar } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [form, setForm] = useState({ lokasyon_id: '', tarih: BUGUN(), kategori: 'Kira', aciklama: '', tutar: '', odeme_tipi: 'nakit' })
  const [filtre, setFiltre] = useState({ lokasyon_id: '', baslangic: AY_BASI(), bitis: BUGUN() })
  const [liste, setListe] = useState([])
  const sr = useSiralama(liste)
  const [toplam, setToplam] = useState(0)
  const [mesgul, setMesgul] = useState(false)
  const [sabitler, setSabitler] = useState([])
  const [sabitAcik, setSabitAcik] = useState(false)
  const [sabitForm, setSabitForm] = useState({ lokasyon_id: '', kategori: 'Kira', aciklama: '', tutar: '', odeme_tipi: 'nakit' })

  useEffect(() => { lokasyonApi.listele().then(l => setLokasyonlar(erisilebilirLokasyonlar(l))) }, [])

  const sabitYukle = useCallback(async () => {
    try { setSabitler(await giderApi.sabitListele()) } catch {}
  }, [])
  useEffect(() => { sabitYukle() }, [sabitYukle])

  async function sabitEkle(e) {
    e.preventDefault()
    if (!sabitForm.tutar || parseFloat(sabitForm.tutar) <= 0) { toast.error('Tutar girin'); return }
    try {
      await giderApi.sabitEkle({ ...sabitForm, lokasyon_id: sabitForm.lokasyon_id || null, tutar: parseFloat(sabitForm.tutar) })
      toast.success('Sabit gider eklendi')
      setSabitForm(f => ({ ...f, aciklama: '', tutar: '' }))
      await sabitYukle()
    } catch (e) { toast.error(e.message) }
  }
  async function sabitSil(id) {
    if (!confirm('Sabit gider şablonu silinsin mi?')) return
    try { await giderApi.sabitSil(id); await sabitYukle() } catch (e) { toast.error(e.message) }
  }
  async function sabitUygula(id) {
    try {
      await giderApi.sabitUygula({ id, tarih: form.tarih, kullanici })
      toast.success('Gidere işlendi'); await yukle()
    } catch (e) { toast.error(e.message) }
  }
  async function sabitTumunuUygula() {
    if (!sabitler.length) return
    if (!confirm(`${sabitler.length} sabit gider ${form.tarih} tarihiyle eklenecek. Devam?`)) return
    try {
      const r = await giderApi.sabitUygula({ idler: sabitler.map(s => s.id), tarih: form.tarih, kullanici })
      toast.success(`${r.eklenen} sabit gider eklendi`); await yukle()
    } catch (e) { toast.error(e.message) }
  }

  const yukle = useCallback(async () => {
    try {
      const r = await giderApi.listele({
        lokasyon_id: filtre.lokasyon_id || undefined,
        baslangic: filtre.baslangic || undefined, bitis: filtre.bitis || undefined, boyut: 200,
      })
      setListe(r.giderler); setToplam(r.toplamTutar)
    } catch (e) { toast.error(e.message) }
  }, [filtre])
  useEffect(() => { yukle() }, [yukle])

  async function ekle(e) {
    e.preventDefault()
    if (!form.tutar || parseFloat(form.tutar) <= 0) { toast.error('Tutar girin'); return }
    setMesgul(true)
    try {
      await giderApi.ekle({ ...form, lokasyon_id: form.lokasyon_id || null, tutar: parseFloat(form.tutar), kullanici })
      toast.success('Gider eklendi')
      setForm(f => ({ ...f, aciklama: '', tutar: '' }))
      await yukle()
    } catch (e) { toast.error(e.message) }
    setMesgul(false)
  }

  async function sil(id) {
    if (!confirm('Gider silinsin mi?')) return
    try { await giderApi.sil(id); toast.success('Silindi'); await yukle() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Giderler</h2>

      {/* Ekleme formu */}
      <form onSubmit={ekle} className="bg-white rounded-2xl border p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mağaza</label>
          <select value={form.lokasyon_id} onChange={e => setForm(f => ({ ...f, lokasyon_id: e.target.value }))}
            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">Genel</option>
            {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tarih</label>
          <input type="date" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))}
            className="w-full border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
          <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white">
            {KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tutar (₺)</label>
          <input type="number" step="0.01" value={form.tutar} onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))}
            placeholder="0,00" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ödeme</label>
          <select value={form.odeme_tipi} onChange={e => setForm(f => ({ ...f, odeme_tipi: e.target.value }))}
            className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="nakit">Nakit</option><option value="kart">Kart</option><option value="havale">Havale</option>
          </select>
        </div>
        <button type="submit" disabled={mesgul}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          + Ekle
        </button>
        <div className="col-span-2 md:col-span-6">
          <input value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
            placeholder="Açıklama (opsiyonel)" className="w-full border rounded-lg px-3 py-1.5 text-sm" />
        </div>
      </form>

      {/* Sabit (tekrarlayan) giderler */}
      <div className="bg-white rounded-2xl border">
        <button onClick={() => setSabitAcik(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left">
          <span className="font-medium text-gray-700">🔁 Sabit Giderler ({sabitler.length})</span>
          <span className="flex items-center gap-2">
            {sabitler.length > 0 && (
              <span onClick={e => { e.stopPropagation(); sabitTumunuUygula() }}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">
                Tümünü {form.tarih} tarihine ekle
              </span>
            )}
            <span className="text-gray-400">{sabitAcik ? '▲' : '▼'}</span>
          </span>
        </button>

        {sabitAcik && (
          <div className="border-t p-4 space-y-3">
            <p className="text-xs text-gray-500">
              Kira, maaş gibi her ay tekrarlayan giderleri buraya bir kez tanımlayın; "Ekle" ile seçili tarihe (yukarıdaki tarih) tek tıkla işleyin.
            </p>

            {/* Şablon listesi */}
            {sabitler.length > 0 && (
              <div className="divide-y border rounded-xl">
                {sabitler.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{s.kategori}</span>
                      {s.aciklama && <span className="text-gray-500"> · {s.aciklama}</span>}
                      <span className="text-gray-400"> · {s.lokasyon_adi || 'Genel'} · {s.odeme_tipi}</span>
                    </div>
                    <span className="font-semibold text-red-600 whitespace-nowrap">{PARA(s.tutar)}</span>
                    <button onClick={() => sabitUygula(s.id)}
                      className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded hover:bg-emerald-700 whitespace-nowrap">+ Ekle</button>
                    <button onClick={() => sabitSil(s.id)} className="text-gray-300 hover:text-red-500">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Yeni şablon ekleme */}
            <form onSubmit={sabitEkle} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
              <select value={sabitForm.lokasyon_id} onChange={e => setSabitForm(f => ({ ...f, lokasyon_id: e.target.value }))}
                className="border rounded-lg px-2 py-1.5 text-sm bg-white">
                <option value="">Genel</option>
                {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
              </select>
              <select value={sabitForm.kategori} onChange={e => setSabitForm(f => ({ ...f, kategori: e.target.value }))}
                className="border rounded-lg px-2 py-1.5 text-sm bg-white">
                {KATEGORILER.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <input value={sabitForm.aciklama} onChange={e => setSabitForm(f => ({ ...f, aciklama: e.target.value }))}
                placeholder="Açıklama" className="border rounded-lg px-2 py-1.5 text-sm" />
              <input type="number" step="0.01" value={sabitForm.tutar} onChange={e => setSabitForm(f => ({ ...f, tutar: e.target.value }))}
                placeholder="Tutar ₺" className="border rounded-lg px-2 py-1.5 text-sm" />
              <select value={sabitForm.odeme_tipi} onChange={e => setSabitForm(f => ({ ...f, odeme_tipi: e.target.value }))}
                className="border rounded-lg px-2 py-1.5 text-sm bg-white">
                <option value="nakit">Nakit</option><option value="kart">Kart</option><option value="havale">Havale</option>
              </select>
              <button type="submit" className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-800">+ Şablon</button>
            </form>
          </div>
        )}
      </div>

      {/* Filtre + toplam */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Mağaza</label>
          <select value={filtre.lokasyon_id} onChange={e => setFiltre(f => ({ ...f, lokasyon_id: e.target.value }))}
            className="border rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">Tümü</option>
            {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
          <input type="date" value={filtre.baslangic} onChange={e => setFiltre(f => ({ ...f, baslangic: e.target.value }))}
            className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
          <input type="date" value={filtre.bitis} onChange={e => setFiltre(f => ({ ...f, bitis: e.target.value }))}
            className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Toplam Gider</p>
          <p className="text-xl font-bold text-red-600">{PARA(toplam)}</p>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <SiraliBaslik k="tarih" {...sr}>Tarih</SiraliBaslik>
              <SiraliBaslik k="kategori" {...sr}>Kategori</SiraliBaslik>
              <SiraliBaslik k="aciklama" {...sr}>Açıklama</SiraliBaslik>
              <SiraliBaslik k="lokasyon_adi" {...sr}>Mağaza</SiraliBaslik>
              <SiraliBaslik k="odeme_tipi" {...sr}>Ödeme</SiraliBaslik>
              <SiraliBaslik k="tutar" align="right" {...sr}>Tutar</SiraliBaslik>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sr.sirali.map(g => (
              <tr key={g.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-1.5 text-gray-500">{g.tarih}</td>
                <td className="px-3 py-1.5">{g.kategori || '—'}</td>
                <td className="px-3 py-1.5 text-gray-600">{g.aciklama || '—'}</td>
                <td className="px-3 py-1.5 text-gray-500">{g.lokasyon_adi || 'Genel'}</td>
                <td className="px-3 py-1.5 text-gray-500">{g.odeme_tipi}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-red-600">{PARA(g.tutar)}</td>
                <td className="px-3 py-1.5 text-center">
                  <button onClick={() => sil(g.id)} className="text-gray-300 hover:text-red-500">✕</button>
                </td>
              </tr>
            ))}
            {liste.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Gider kaydı yok</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
