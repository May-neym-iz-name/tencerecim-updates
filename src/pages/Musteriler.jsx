import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { musteriApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'

const BOSH = { ad: '', soyad: '', telefon: '', email: '', tc_kimlik: '', vergi_no: '', vergi_dairesi: '', unvan: '', adres: '', il: '', ilce: '', iskonto_orani: '' }

export default function Musteriler() {
  const { yetkiVar } = useAuth()
  const duzenleYetkisi = yetkiVar('musteri_duzenle')
  const silYetkisi = yetkiVar('musteri_sil')
  const [musteriler, setMusteriler] = useState([])
  const [toplam, setToplam] = useState(0)
  const [arama, setArama] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState(BOSH)
  const [duzenlenenId, setDuzenlenenId] = useState(null)

  const yukle = useCallback(async () => {
    try {
      const r = await musteriApi.listele({ arama, boyut: 0 })
      setMusteriler(r.musteriler)
      setToplam(r.toplam)
    } catch (e) { toast.error(e.message) }
  }, [arama])

  const { dilim: sayfaMusteriler, ...sayfalama } = useSayfalama(musteriler, 50)

  useEffect(() => { yukle() }, [yukle])

  function handleDuzenle(m) {
    setForm({ ad: m.ad || '', soyad: m.soyad || '', telefon: m.telefon || '', email: m.email || '', tc_kimlik: m.tc_kimlik || '', vergi_no: m.vergi_no || '', vergi_dairesi: m.vergi_dairesi || '', unvan: m.unvan || '', adres: m.adres || '', il: m.il || '', ilce: m.ilce || '', iskonto_orani: m.iskonto_orani || '' })
    setDuzenlenenId(m.id)
    setFormAcik(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const veri = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    try {
      if (duzenlenenId) await musteriApi.guncelle(duzenlenenId, veri)
      else await musteriApi.olustur(veri)
      toast.success(duzenlenenId ? 'Müşteri güncellendi' : 'Müşteri eklendi')
      setFormAcik(false); setDuzenlenenId(null); setForm(BOSH); yukle()
    } catch (e) { toast.error(e.message) }
  }

  async function handleSil(id) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return
    try { await musteriApi.sil(id); toast.success('Müşteri silindi'); yukle() }
    catch (e) { toast.error(e.message) }
  }

  const alanlar = [
    [['ad', 'Ad *', true], ['soyad', 'Soyad *', true]],
    [['telefon', 'Telefon', false], ['email', 'E-posta', false]],
    [['tc_kimlik', 'TC Kimlik No', false], ['vergi_no', 'Vergi No', false]],
    [['vergi_dairesi', 'Vergi Dairesi', false], ['unvan', 'Ünvan (Kurumsal)', false]],
    [['adres', 'Adres', false]],
    [['il', 'İl', false], ['ilce', 'İlçe', false]],
    [['iskonto_orani', 'Sabit İskonto Oranı (%)', false]],
  ]

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-gray-800">Müşteriler</h2>
        {duzenleYetkisi && (
        <button onClick={() => { setForm(BOSH); setDuzenlenenId(null); setFormAcik(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Yeni Müşteri
        </button>
        )}
      </div>

      <input value={arama} onChange={e => setArama(e.target.value)}
        placeholder="Ad, soyad, telefon veya vergi no ara..."
        className="w-full border rounded-lg px-4 py-2.5 mb-4 text-sm" />

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Ad Soyad', 'Telefon', 'Vergi / TC', 'İl/İlçe', 'İskonto', 'ikas (Web)', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sayfaMusteriler.map(m => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <span className="font-medium">{m.ad} {m.soyad}</span>
                  {m.unvan && <span className="text-xs text-gray-400 ml-2 bg-gray-100 px-1.5 py-0.5 rounded">{m.unvan}</span>}
                </td>
                <td className="px-4 py-2.5">{m.telefon || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{m.vergi_no || m.tc_kimlik || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{m.il ? `${m.il}${m.ilce ? '/' + m.ilce : ''}` : '—'}</td>
                <td className="px-4 py-2.5 text-xs">{m.iskonto_orani > 0 ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">%{m.iskonto_orani}</span> : '—'}</td>
                <td className="px-4 py-2.5 text-xs">
                  {m.ikas_siparis_sayisi > 0
                    ? <span className="text-gray-600" title={m.ikas_son_siparis ? `Son sipariş: ${new Date(m.ikas_son_siparis).toLocaleDateString('tr-TR')}` : ''}>
                        {m.ikas_siparis_sayisi} sipariş · ₺{Number(m.ikas_toplam_harcama || 0).toLocaleString('tr-TR')}
                      </span>
                    : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {duzenleYetkisi && (
                    <button onClick={() => handleDuzenle(m)} className="text-blue-600 hover:underline text-xs mr-3">Düzenle</button>
                  )}
                  {silYetkisi && (
                    <button onClick={() => handleSil(m.id)} className="text-red-500 hover:underline text-xs">Sil</button>
                  )}
                </td>
              </tr>
            ))}
            {musteriler.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Müşteri bulunamadı</td></tr>
            )}
          </tbody>
        </table>
        <Sayfalama {...sayfalama} />
      </div>

      {formAcik && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">{duzenlenenId ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {alanlar.map((satir, i) => (
                <div key={i} className={`grid gap-3 grid-cols-${satir.length}`}>
                  {satir.map(([name, label, req]) => (
                    <div key={name}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input name={name} required={req} value={form[name]}
                        type={name === 'iskonto_orani' ? 'number' : 'text'}
                        min={name === 'iskonto_orani' ? 0 : undefined}
                        max={name === 'iskonto_orani' ? 100 : undefined}
                        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
                  {duzenlenenId ? 'Güncelle' : 'Ekle'}
                </button>
                <button type="button" onClick={() => { setFormAcik(false); setDuzenlenenId(null) }}
                  className="flex-1 border py-2 rounded-lg hover:bg-gray-50">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
