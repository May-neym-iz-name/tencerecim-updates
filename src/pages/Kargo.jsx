import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kargoApi, upsApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import KargoFormu from '../components/KargoFormu'

const DURUM_RENK = {
  olusturuldu: 'bg-blue-100 text-blue-700',
  iptal: 'bg-red-100 text-red-700',
}

export default function Kargo() {
  const { yetkiVar } = useAuth()
  const iptalYetkisi = yetkiVar('kargo_iptal')
  const [kargolar, setKargolar] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [filtre, setFiltre] = useState({ takip: '', musteri: '', bas: '', bit: '' })

  function filtreAlan(k, v) { setFiltre(f => ({ ...f, [k]: v })) }
  function filtreTemizle() { setFiltre({ takip: '', musteri: '', bas: '', bit: '' }) }

  const gosterilen = kargolar.filter(k => {
    if (filtre.takip && !(k.takip_no || '').toLowerCase().includes(filtre.takip.toLowerCase())) return false
    if (filtre.musteri && !(k.alici_ad || '').toLowerCase().includes(filtre.musteri.toLowerCase())) return false
    const gun = (k.olusturma_tarihi || '').slice(0, 10) // YYYY-MM-DD
    if (filtre.bas && gun && gun < filtre.bas) return false
    if (filtre.bit && gun && gun > filtre.bit) return false
    return true
  })

  function yenile() {
    setYukleniyor(true)
    kargoApi.listele().then(setKargolar).catch(e => toast.error(e.message)).finally(() => setYukleniyor(false))
  }
  useEffect(yenile, [])

  async function takip(takipNo) {
    if (!takipNo) return
    const bekle = toast.loading('Takip sorgulanıyor…')
    try {
      const d = await kargoApi.takip(takipNo)
      toast.success(`${takipNo}: ${d.aciklama || 'Durum bilgisi alındı'}`, { id: bekle })
      yenile()
    } catch (e) { toast.error(e.message, { id: bekle }) }
  }

  async function iptal(k) {
    if (!confirm(`${k.takip_no} numaralı gönderiyi iptal etmek istediğinize emin misiniz?`)) return
    const bekle = toast.loading('İptal ediliyor…')
    try {
      await kargoApi.iptal(k.id)
      toast.success('Gönderi iptal edildi', { id: bekle })
      yenile()
    } catch (e) { toast.error(e.message, { id: bekle }) }
  }

  async function etiketBas(k) {
    try {
      const pngler = await kargoApi.etiket(k.id)
      if (!pngler.length) { toast.error('Bu gönderinin kayıtlı etiketi yok'); return }
      const ayar = await upsApi.ayarGetir()
      await kargoApi.etiketYazdir(pngler, ayar?.etiket_yazici || undefined)
      toast.success('Etiket yazıcıya gönderildi')
    } catch (e) { toast.error('Etiket yazdırılamadı: ' + e.message) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">📦 Kargo</h2>
        <div className="flex gap-2">
          <button onClick={() => setFormAcik(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Yeni Gönderi</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">Takip No
          <input value={filtre.takip} onChange={e => filtreAlan('takip', e.target.value)}
            placeholder="Takip no ara" className="border rounded px-2 py-1.5 text-sm w-40 mt-0.5 block" />
        </label>
        <label className="text-xs text-gray-500">Müşteri / Alıcı
          <input value={filtre.musteri} onChange={e => filtreAlan('musteri', e.target.value)}
            placeholder="Alıcı adı ara" className="border rounded px-2 py-1.5 text-sm w-40 mt-0.5 block" />
        </label>
        <label className="text-xs text-gray-500">Başlangıç
          <input type="date" value={filtre.bas} onChange={e => filtreAlan('bas', e.target.value)}
            className="border rounded px-2 py-1.5 text-sm mt-0.5 block" />
        </label>
        <label className="text-xs text-gray-500">Bitiş
          <input type="date" value={filtre.bit} onChange={e => filtreAlan('bit', e.target.value)}
            className="border rounded px-2 py-1.5 text-sm mt-0.5 block" />
        </label>
        <button onClick={filtreTemizle} className="text-xs text-gray-500 hover:text-gray-800 underline pb-2">Temizle</button>
        <span className="text-xs text-gray-400 pb-2 ml-auto">{gosterilen.length} / {kargolar.length} gönderi</span>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Takip No</th>
              <th className="px-3 py-2 font-medium">Alıcı</th>
              <th className="px-3 py-2 font-medium">Adres</th>
              <th className="px-3 py-2 font-medium">Durum</th>
              <th className="px-3 py-2 font-medium">Son Durum</th>
              <th className="px-3 py-2 font-medium">Tarih</th>
              <th className="px-3 py-2 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {gosterilen.map(k => (
              <tr key={k.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{k.takip_no || '—'}</td>
                <td className="px-3 py-2">{k.alici_ad}</td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[180px] truncate">{[k.ilce, k.il].filter(Boolean).join(', ')}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${DURUM_RENK[k.durum] || 'bg-gray-100 text-gray-600'}`}>
                    {k.durum === 'iptal' ? 'İptal' : 'Oluşturuldu'}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{k.son_durum || '—'}</td>
                <td className="px-3 py-2 text-gray-400 text-xs">{(k.olusturma_tarihi || '').slice(0, 16)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => takip(k.takip_no)} className="text-blue-600 hover:underline text-xs mr-2">Takip</button>
                  <button onClick={() => etiketBas(k)} className="text-gray-600 hover:underline text-xs mr-2">Etiket</button>
                  {k.durum !== 'iptal' && iptalYetkisi && (
                    <button onClick={() => iptal(k)} className="text-red-600 hover:underline text-xs">İptal</button>
                  )}
                </td>
              </tr>
            ))}
            {gosterilen.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                {yukleniyor ? 'Yükleniyor…' : (kargolar.length ? 'Filtreye uyan gönderi yok.' : 'Henüz kargo gönderisi yok.')}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <KargoFormu acik={formAcik} kapat={() => setFormAcik(false)} onTamam={yenile} />
    </div>
  )
}
