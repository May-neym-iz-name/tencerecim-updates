import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { faturaStokApi } from '../api/ipc'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { usePersistentState } from '../hooks/usePersistentState'
import { eslesirMi } from '../utils/arama'

// Fatura stoğu: muhasebesel stok (tek havuz, lokasyon YOK). Gerçek stoktan
// AYRIDIR ve ayrı olması normaldir — mal irsaliyeyle gelir, faturası sonra gelir.
// Tasarım: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md
//
// Bu görevde YALNIZ "Durum" görünümü canlıdır — "Alış Faturaları" ve
// "Hareketler" sekmeleri sonraki adımlarda (Task 8/9) doldurulacak.
//
// 🔴 fatura-stok:durum verisi AĞ ÜZERİNDEN (Supabase) geliyor — yerel SQLite
// değil. Bu yüzden: (1) yavaş olabilir → yükleniyor göstergesi şart,
// (2) hata verebilir → hatayı toast + tablo alanında ayrıca göster, aksi
// halde kullanıcı "veri gelmedi"yi "eksik ürün yok" sanır.
//
// Arama sunucuda DEĞİL — electron/db/fatura-stok.js:durumBirlestir JS'te
// filtreliyor. Yani her tuş vuruşunda IPC + ağ çağrısı yapmak israf olurdu.
// Bunun yerine: veriyi yalnız `sadeceEksik` değişince bir kez çekiyoruz,
// aramayı ise istemcide (ortak eslesirMi ile) filtreliyoruz. Debounce yerine
// bu yaklaşım seçildi çünkü zaten elimizdeki listeyi filtrelemek anlık ve
// ağ turu gerektirmiyor.
export default function FaturaStogu() {
  const [sekme, setSekme] = usePersistentState('fatura_stok_sekme', 'durum')
  const [arama, setArama] = usePersistentState('fatura_stok_arama', '')
  const [sadeceEksik, setSadeceEksik] = usePersistentState('fatura_stok_eksik', true)

  const [satirlar, setSatirlar] = useState(null) // null = henüz veri gelmedi (yükleniyor/hata ayrımı için)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    setHata(null)
    try {
      // Arama sunucu tarafında uygulanmıyor: burada boş bırakılır, filtre
      // aşağıda istemcide yapılır.
      const veri = await faturaStokApi.durum({ arama: '', sadece_eksik: sadeceEksik })
      setSatirlar(veri)
    } catch (e) {
      setHata(e.message)
      toast.error(e.message)
    } finally {
      setYukleniyor(false)
    }
  }, [sadeceEksik])

  useEffect(() => { if (sekme === 'durum') yukle() }, [yukle, sekme])

  const satirlarGorunur = useMemo(() => {
    if (!satirlar) return []
    return satirlar.filter(s => eslesirMi([s.urun_adi, s.sku, s.barkod].filter(Boolean).join(' '), arama))
  }, [satirlar, arama])

  const { dilim, ...sayfalama } = useSayfalama(satirlarGorunur)

  // Veri hiç gelmediyse (null) boş tablo "eksik ürün yok" ile karıştırılmasın.
  const veriGeldi = satirlar !== null

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">🧾 Fatura Stoğu</h2>

      <div className="flex gap-1 mb-4 border-b">
        {[['durum', '📊 Durum'], ['alis', '📥 Alış Faturaları'], ['hareket', '🔀 Hareketler']]
          .map(([k, l]) => (
            <button key={k} onClick={() => setSekme(k)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sekme === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
      </div>

      {sekme === 'durum' && (
        <>
          <div className="flex gap-3 items-center mb-3 flex-wrap">
            <input value={arama} onChange={e => setArama(e.target.value)}
              placeholder="Ürün, SKU veya barkod ara" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
            <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
              <input type="checkbox" checked={sadeceEksik} onChange={e => setSadeceEksik(e.target.checked)} />
              Yalnız faturası eksik olanlar
            </label>
            <button type="button" onClick={yukle} disabled={yukleniyor}
              className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-50">
              🔄 Tekrar Dene
            </button>
          </div>

          {yukleniyor && (
            <p className="text-center text-gray-400 py-8">Yükleniyor…</p>
          )}

          {!yukleniyor && hata && (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium mb-1">Veri alınamadı</p>
              <p className="text-gray-500 text-sm">{hata}</p>
              <button type="button" onClick={yukle}
                className="mt-3 px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">
                Tekrar dene
              </button>
            </div>
          )}

          {!yukleniyor && !hata && veriGeldi && (
            <>
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b">
                  <th className="py-2">Ürün</th><th>SKU</th>
                  <th className="text-right">Fatura Stoğu</th>
                  <th className="text-right">Gerçek Stok</th>
                  <th className="text-right">Fark</th>
                </tr></thead>
                <tbody>
                  {dilim.map(s => (
                    <tr key={s.urun_id} className="border-b">
                      <td className="py-2">{s.urun_adi}</td>
                      <td className="text-gray-500">{s.sku || '—'}</td>
                      <td className="text-right">{s.fatura_miktar}</td>
                      <td className="text-right">{s.gercek_miktar}</td>
                      <td className={`text-right font-semibold ${s.fark < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {s.fark > 0 ? `+${s.fark}` : s.fark}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dilim.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  {sadeceEksik
                    ? 'Faturası eksik ürün yok — tüm siparişlere fatura kesilebilir.'
                    : 'Aramayla eşleşen ürün yok.'}
                </p>
              )}
              <Sayfalama {...sayfalama} />
            </>
          )}
        </>
      )}

      {sekme !== 'durum' && (
        <p className="text-gray-500 py-4">Bu görünüm sonraki adımda doldurulacak.</p>
      )}
    </div>
  )
}
