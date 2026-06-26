import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { giderApi, lokasyonApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'

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
  const [toplam, setToplam] = useState(0)
  const [mesgul, setMesgul] = useState(false)

  useEffect(() => { lokasyonApi.listele().then(l => setLokasyonlar(erisilebilirLokasyonlar(l))) }, [])

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
              <th className="text-left px-3 py-2 font-medium">Tarih</th>
              <th className="text-left px-3 py-2 font-medium">Kategori</th>
              <th className="text-left px-3 py-2 font-medium">Açıklama</th>
              <th className="text-left px-3 py-2 font-medium">Mağaza</th>
              <th className="text-left px-3 py-2 font-medium">Ödeme</th>
              <th className="text-right px-3 py-2 font-medium">Tutar</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {liste.map(g => (
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
