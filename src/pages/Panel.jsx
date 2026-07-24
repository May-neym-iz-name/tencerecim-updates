import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { panelApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'

const PARA = (n) => `₺${(Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const GUN_KISA = (g) => new Date(g + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short' })
const SAAT = (t) => t ? new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''
const ODEME_ETIKET = { nakit: '💵 Nakit', kart: '💳 Kart', havale: '🏦 Havale' }

function Kart({ baslik, deger, alt, renk = 'text-gray-800', tikla }) {
  return (
    <button onClick={tikla} disabled={!tikla}
      className={`text-left bg-white rounded-2xl border p-4 transition-shadow ${tikla ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{baslik}</p>
      <p className={`text-2xl font-bold mt-1 ${renk}`}>{deger}</p>
      {alt && <p className="text-xs text-gray-400 mt-0.5">{alt}</p>}
    </button>
  )
}

export default function Panel() {
  const [veri, setVeri] = useState(null)
  const [dusuk, setDusuk] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const navigate = useNavigate()
  const { yetkiVar } = useAuth()

  useEffect(() => {
    Promise.all([panelApi.ozet(), panelApi.dusukStok().catch(() => [])])
      .then(([o, d]) => { setVeri(o); setDusuk(d) })
      .catch(() => {})
      .finally(() => setYukleniyor(false))
  }, [])

  if (yukleniyor) return <div className="p-8 text-center text-gray-400">Yükleniyor…</div>
  if (!veri) return <div className="p-8 text-center text-gray-400">Veri alınamadı.</div>

  const enYuksekCiro = Math.max(1, ...veri.haftalik.map(h => h.ciro))

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Ana Ekran</h2>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kart baslik="Bugünkü Ciro" deger={PARA(veri.bugunGenel.ciro)} renk="text-green-700"
          alt={`${veri.bugunGenel.satis_sayisi} satış`} tikla={yetkiVar('satis_gecmisi_goruntule') ? () => navigate('/satis-gecmisi') : null} />
        <Kart baslik="Kritik Stok" deger={veri.kritikStokSayisi}
          renk={veri.kritikStokSayisi > 0 ? 'text-red-600' : 'text-gray-800'}
          alt="minimumun altında" tikla={yetkiVar('stok_goruntule') ? () => navigate('/stok') : null} />
        <Kart baslik="Bekleyen Online" deger={veri.bekleyenOnlineSayisi}
          renk={veri.bekleyenOnlineSayisi > 0 ? 'text-amber-600' : 'text-gray-800'}
          alt="kargolanmamış sipariş" tikla={yetkiVar('online_siparis_goruntule') ? () => navigate('/online-siparisler') : null} />
        <Kart baslik="İptal/İade Talebi" deger={veri.bekleyenTalepSayisi ?? 0}
          renk={(veri.bekleyenTalepSayisi ?? 0) > 0 ? 'text-red-600' : 'text-gray-800'}
          alt="bekleyen talep" tikla={yetkiVar('online_siparis_goruntule') ? () => navigate('/online-siparisler?talep=1') : null} />
        <Kart baslik="Mağaza Sayısı" deger={veri.bugun.length || '—'} alt="bugün satış yapan" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Sol: bugün mağaza kırılımı + haftalık */}
        <div className="lg:col-span-2 space-y-5">
          {/* Mağaza bazlı bugün */}
          <div className="bg-white rounded-2xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Bugün — Mağaza Kırılımı</h3>
            {veri.bugun.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Bugün henüz satış yok.</p>
            ) : (
              <div className="space-y-2">
                {veri.bugun.map(b => (
                  <div key={b.lokasyon_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">🏪 {b.lokasyon_adi}</span>
                    <span className="text-gray-400 text-xs">{b.satis_sayisi} satış</span>
                    <span className="font-semibold text-green-700 w-28 text-right">{PARA(b.ciro)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Haftalık ciro bar grafik (basit) */}
          <div className="bg-white rounded-2xl border p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Son 7 Gün Ciro</h3>
            <div className="flex items-end gap-2 h-32">
              {veri.haftalik.length === 0 && <p className="text-sm text-gray-400">Veri yok.</p>}
              {veri.haftalik.map(h => (
                <div key={h.gun} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(4, (h.ciro / enYuksekCiro) * 100)}%` }}
                    title={PARA(h.ciro)} />
                  <span className="text-[10px] text-gray-400">{GUN_KISA(h.gun)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ: son satışlar */}
        <div className="bg-white rounded-2xl border p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Son Satışlar</h3>
          {veri.sonSatislar.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Kayıt yok.</p>
          ) : (
            <div className="divide-y">
              {veri.sonSatislar.map(s => (
                <div key={s.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.musteri_adi || s.fis_no}</p>
                    <p className="text-[11px] text-gray-400 truncate">{ODEME_ETIKET[s.odeme_tipi] || s.odeme_tipi} · {s.lokasyon_adi} · {SAAT(s.tarih)}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-700 flex-shrink-0">{PARA(s.genel_toplam)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Düşük stok listesi */}
      {dusuk.length > 0 && (
        <div className="bg-white rounded-2xl border p-4">
          <h3 className="font-semibold text-red-600 mb-3">🔴 Kritik Stok ({dusuk.length})</h3>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ürün</th>
                  <th className="text-left px-3 py-2 font-medium">Mağaza</th>
                  <th className="text-center px-3 py-2 font-medium w-20">Mevcut</th>
                  <th className="text-center px-3 py-2 font-medium w-20">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {dusuk.map(d => (
                  <tr key={`${d.urun_id}-${d.lokasyon_id}`} className="border-t">
                    <td className="px-3 py-1.5">{d.urun_adi}</td>
                    <td className="px-3 py-1.5 text-gray-500">{d.lokasyon_adi}</td>
                    <td className="px-3 py-1.5 text-center font-semibold text-red-600">{d.miktar}</td>
                    <td className="px-3 py-1.5 text-center text-gray-400">{d.minimum_stok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
