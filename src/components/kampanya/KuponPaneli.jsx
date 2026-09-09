// Kampanyanın kuponları: liste (kod, kullanılan, limitler, kime verildi) + ekle (özel / otomatik üret) + sil.
// ikas panel diyaloğunun aynısı: Özel Kupon (kod) | Otomatik Kod Üret (ön ek + adet); limitler ikisinde de.
import { useEffect, useState } from 'react'
import { kampanyaApi } from '../../api/ipc'
import toast from 'react-hot-toast'

export default function KuponPaneli({ kampanyaId, dagitimlar = [] }) {
  const [kuponlar, setKuponlar] = useState([])
  const [secili, setSecili] = useState([])
  const [acik, setAcik] = useState(false)
  const [kf, setKf] = useState({ kip: 'uret', kod: '', onEk: 'tencerecim', adet: '10', toplamLimit: '1', musteriLimit: '1', birlesir: false })
  const [mesgul, setMesgul] = useState(false)
  const verilen = new Map(dagitimlar.map(d => [d.kupon_kodu, d]))

  const yukle = () => kampanyaApi.kuponlar(kampanyaId).then(setKuponlar).catch(e => toast.error(e.message))
  useEffect(() => { if (kampanyaId) yukle() }, [kampanyaId])

  async function ekle() {
    setMesgul(true)
    try {
      const r = await kampanyaApi.kuponEkle({ ...kf, campaignId: kampanyaId })
      toast.success(`${r.length} kupon eklendi`); setAcik(false); yukle()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }
  async function sil() {
    if (!secili.length) return
    setMesgul(true)
    try { await kampanyaApi.kuponSil(secili); toast.success('Silindi'); setSecili([]); yukle() }
    catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  const bos = kuponlar.filter(k => !(k.usageCount > 0) && !verilen.has(k.code)).length
  return (
    <section className="bg-white border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-marka-900">Kuponlar</h3>
        <span className="text-xs text-gray-500">{kuponlar.length} kupon · {bos} boşta · {kuponlar.length - bos} verildi/kullanıldı</span>
        <div className="ml-auto flex gap-2">
          {secili.length > 0 && <button onClick={sil} disabled={mesgul} className="text-sm text-red-600 px-3 py-1.5 border border-red-200 rounded-lg">Sil ({secili.length})</button>}
          <button onClick={() => setAcik(true)} className="bg-marka-900 text-white px-3 py-1.5 rounded-lg text-sm">Kupon Ekle</button>
        </div>
      </div>
      {!kuponlar.length && <p className="text-sm text-gray-400 py-4 text-center">Henüz kupon eklemediniz.</p>}
      {kuponlar.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500"><tr><th></th><th className="text-left">Kod</th><th>Kullanılan</th><th>Toplam limit</th><th>Müşteri limiti</th><th className="text-left">Verildi</th></tr></thead>
          <tbody>
            {kuponlar.map(k => { const v = verilen.get(k.code); return (
              <tr key={k.id} className="border-t">
                <td><input type="checkbox" checked={secili.includes(k.id)} onChange={e => setSecili(s => e.target.checked ? [...s, k.id] : s.filter(x => x !== k.id))} /></td>
                <td className="font-mono">{k.code}</td>
                <td className="text-center">{k.usageCount}</td>
                <td className="text-center">{k.usageLimit ?? '∞'}</td>
                <td className="text-center">{k.usageLimitPerCustomer ?? '∞'}</td>
                <td className="text-xs text-gray-500">{v ? `${v.gonderen_kullanici || '?'} · ${v.platform || ''} · ${v.tarih}` : (k.usageCount > 0 ? 'kullanıldı' : '—')}</td>
              </tr>) })}
          </tbody>
        </table>
      )}
      {acik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAcik(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold">Kupon Ekle</h4>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1"><input type="radio" checked={kf.kip === 'ozel'} onChange={() => setKf(o => ({ ...o, kip: 'ozel' }))} /> Özel Kupon</label>
              <label className="flex items-center gap-1"><input type="radio" checked={kf.kip === 'uret'} onChange={() => setKf(o => ({ ...o, kip: 'uret' }))} /> Otomatik Kod Üret</label>
            </div>
            {kf.kip === 'ozel'
              ? <input value={kf.kod} onChange={e => setKf(o => ({ ...o, kod: e.target.value }))} placeholder="Kod (ör. HOSGELDIN10)" className="w-full border rounded-lg px-3 py-2 text-sm" />
              : <div className="flex gap-2">
                  <input value={kf.onEk} onChange={e => setKf(o => ({ ...o, onEk: e.target.value }))} placeholder="Kod ön eki" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" value={kf.adet} onChange={e => setKf(o => ({ ...o, adet: e.target.value }))} placeholder="Adet" className="w-24 border rounded-lg px-3 py-2 text-sm" />
                </div>}
            <div className="text-sm space-y-1">
              <div className="font-medium">Limitler</div>
              <div className="flex items-center gap-2">Toplam kullanım <input type="number" value={kf.toplamLimit} onChange={e => setKf(o => ({ ...o, toplamLimit: e.target.value }))} placeholder="sınırsız" className="w-24 border rounded-lg px-2 py-1" /></div>
              <div className="flex items-center gap-2">Müşteri başına <input type="number" value={kf.musteriLimit} onChange={e => setKf(o => ({ ...o, musteriLimit: e.target.value }))} placeholder="sınırsız" className="w-24 border rounded-lg px-2 py-1" /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={kf.birlesir} onChange={e => setKf(o => ({ ...o, birlesir: e.target.checked }))} /> Diğer kampanyalarla birleşsin</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAcik(false)} className="px-4 py-2 text-sm text-gray-600">İptal</button>
              <button onClick={ekle} disabled={mesgul} className="bg-marka-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
