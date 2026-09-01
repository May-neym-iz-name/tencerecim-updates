import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import toast from 'react-hot-toast'
import { faturaStokApi, urunlerApi, tedarikciApi } from '../api/ipc'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { usePersistentState } from '../hooks/usePersistentState'
import { eslesirMi } from '../utils/arama'
import { useAuth } from '../auth/AuthContext'
import AlisFaturaFormu from '../components/AlisFaturaFormu'

// Fatura stoğu: muhasebesel stok (tek havuz, lokasyon YOK). Gerçek stoktan
// AYRIDIR ve ayrı olması normaldir — mal irsaliyeyle gelir, faturası sonra gelir.
// Tasarım: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md
//
// "Durum" ve "Alış Faturaları" (Task 8) görünümleri canlıdır — "Hareketler"
// sekmesi sonraki adımda (Task 9) doldurulacak.
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
//
// Hareketler sekmesi de aynı ilkeyi izler: hareketler({ limit }) bir kez
// çekilir, arama istemcide filtrelenir. `kaynak_tip` bulut değeri Türkçeye
// burada çevrilir — okuma katmanı (Task 5) İngilizce/teknik değeri olduğu
// gibi döndürür.
const KAYNAK_ETIKETLERI = {
  alis_faturasi: 'Alış faturası',
  satis_faturasi: 'Satış faturası',
  duzeltme: 'Düzeltme',
  iade: 'İade',
  telafi: 'Telafi',
}

function hareketTarihiGoster(iso) {
  if (!iso) return '—'
  const t = new Date(iso)
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleString('tr-TR')
}

export default function FaturaStogu() {
  const { yetkiVar } = useAuth()
  const duzenleYetkisi = yetkiVar('fatura_stok_duzenle')

  const [sekme, setSekme] = usePersistentState('fatura_stok_sekme', 'durum')
  const [arama, setArama] = usePersistentState('fatura_stok_arama', '')
  // Varsayılan HEPSİNİ göster. Eskiden varsayılan "yalnız eksik" idi ve tohumlamadan
  // sonra ekran boş görünüyordu: tohumlanmış üründe fatura stoğu > gerçek stok olduğu
  // için hiçbiri süzgece takılmıyordu (01.09 kullanıcı bildirimi). Anahtar adı BİLEREK
  // değişti — eski kayıtlı 'true' okunmasın, yoksa düzeltme kullanıcıya ulaşmaz.
  const [sadeceEksik, setSadeceEksik] = usePersistentState('fatura_stok_eksik_v2', false)

  const [satirlar, setSatirlar] = useState(null) // null = henüz veri gelmedi (yükleniyor/hata ayrımı için)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)

  // --- Alış Faturaları sekmesi ---
  const [alisArama, setAlisArama] = usePersistentState('fatura_stok_alis_arama', '')
  const [alisFaturalar, setAlisFaturalar] = useState(null) // null = henüz veri gelmedi
  const [alisYukleniyor, setAlisYukleniyor] = useState(false)
  const [alisHata, setAlisHata] = useState(null)
  const [acikDetay, setAcikDetay] = useState(null) // açık satırın senk_id'si
  const [kalemlerMap, setKalemlerMap] = useState({}) // senk_id -> kalemler
  const [kalemYukleniyor, setKalemYukleniyor] = useState(null) // yüklenen satırın senk_id'si

  const [formAcik, setFormAcik] = useState(false)
  const [formVeriYukleniyor, setFormVeriYukleniyor] = useState(false)
  const [urunler, setUrunler] = useState(null)
  const [tedarikciler, setTedarikciler] = useState(null)

  // --- Hareketler sekmesi ---
  const [hareketArama, setHareketArama] = usePersistentState('fatura_stok_hareket_arama', '')
  // Bizimhesap'tan açılış bakiyesi (Faz 2 / Task 9). Sunucu tarafı idempotent:
  // bakiyesi zaten olan ürüne DOKUNMAZ, ikinci basış hiçbir şeyi katlamaz.
  // --- KONTROL BEKLİYOR (Task 8) ---------------------------------------------
  // durum='belirsiz' faturalar: sağlayıcıya ulaşılamadığı için sonuç doğrulanamadı.
  // 🔴 Stok İADE EDİLMEDİ (spec §⑤) — fatura karşı tarafta oluşmuş olabilir; kararı
  // insan verir. Liste boş değilse mükerrer fatura riski birikiyor demektir.
  const [belirsizler, setBelirsizler] = useState(null)
  const [belirsizYukleniyor, setBelirsizYukleniyor] = useState(false)
  const [belirsizMesgul, setBelirsizMesgul] = useState('')
  const [guidGirdi, setGuidGirdi] = useState({})

  const belirsizYukle = useCallback(async () => {
    setBelirsizYukleniyor(true)
    try { setBelirsizler(await faturaStokApi.belirsizler()) }
    catch (e) { toast.error(e.message); setBelirsizler([]) }
    finally { setBelirsizYukleniyor(false) }
  }, [])
  useEffect(() => { if (sekme === 'belirsiz') belirsizYukle() }, [belirsizYukle, sekme])

  async function belirsizKarar(satir, kesilmis) {
    setBelirsizMesgul(satir.senk_id)
    try {
      await faturaStokApi.belirsizKarar({
        senk_id: satir.senk_id,
        kesilmis,
        guid: kesilmis ? (guidGirdi[satir.senk_id] || '').trim() : null,
      })
      toast.success(kesilmis ? 'Fatura kesilmiş olarak işaretlendi.' : 'Stok iade edildi, sipariş yeniden faturalanabilir.')
      await belirsizYukle()
    } catch (e) { toast.error(e.message) }
    finally { setBelirsizMesgul('') }
  }

  const [tohumMesgul, setTohumMesgul] = useState(false)
  const [tohumSonuc, setTohumSonuc] = useState(null)
  async function tohumla() {
    setTohumMesgul(true)
    setTohumSonuc(null)
    try {
      const r = await faturaStokApi.tohumla()
      setTohumSonuc(r)
      toast.success(`${r.yazilan} ürüne açılış bakiyesi yazıldı (${r.toplam_adet} adet).`)
      await yukle()
    } catch (e) { toast.error('Tohumlama başarısız: ' + e.message) }
    finally { setTohumMesgul(false) }
  }

  const [hareketler, setHareketler] = useState(null) // null = henüz veri gelmedi
  const [hareketYukleniyor, setHareketYukleniyor] = useState(false)
  const [hareketHata, setHareketHata] = useState(null)

  const alisYukle = useCallback(async () => {
    setAlisYukleniyor(true)
    setAlisHata(null)
    try {
      const veri = await faturaStokApi.alisListele({})
      setAlisFaturalar(veri)
    } catch (e) {
      setAlisHata(e.message)
      toast.error(e.message)
    } finally {
      setAlisYukleniyor(false)
    }
  }, [])

  useEffect(() => { if (sekme === 'alis') alisYukle() }, [alisYukle, sekme])

  const alisFaturalarGorunur = useMemo(() => {
    if (!alisFaturalar) return []
    return alisFaturalar.filter(f => eslesirMi([f.fatura_no, f.tedarikci_adi].filter(Boolean).join(' '), alisArama))
  }, [alisFaturalar, alisArama])

  const { dilim: alisDilim, ...alisSayfalama } = useSayfalama(alisFaturalarGorunur)
  const alisVeriGeldi = alisFaturalar !== null

  async function detayAc(senkId) {
    if (acikDetay === senkId) { setAcikDetay(null); return }
    setAcikDetay(senkId)
    if (kalemlerMap[senkId]) return
    setKalemYukleniyor(senkId)
    try {
      const kalemler = await faturaStokApi.alisKalemler(senkId)
      setKalemlerMap(onceki => ({ ...onceki, [senkId]: kalemler }))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setKalemYukleniyor(null)
    }
  }

  async function formuAc() {
    setFormVeriYukleniyor(true)
    try {
      const [urunSonuc, tedarikciSonuc] = await Promise.all([
        urunlerApi.listele({ boyut: 0 }),
        tedarikciApi.listele(),
      ])
      setUrunler(urunSonuc.urunler)
      setTedarikciler(tedarikciSonuc)
      setFormAcik(true)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setFormVeriYukleniyor(false)
    }
  }

  const hareketYukle = useCallback(async () => {
    setHareketYukleniyor(true)
    setHareketHata(null)
    try {
      const veri = await faturaStokApi.hareketler({ limit: 200 })
      setHareketler(veri)
    } catch (e) {
      setHareketHata(e.message)
      toast.error(e.message)
    } finally {
      setHareketYukleniyor(false)
    }
  }, [])

  useEffect(() => { if (sekme === 'hareket') hareketYukle() }, [hareketYukle, sekme])

  const hareketlerGorunur = useMemo(() => {
    if (!hareketler) return []
    return hareketler.filter(h => eslesirMi([h.urun_adi, h.sku, h.aciklama, h.kullanici].filter(Boolean).join(' '), hareketArama))
  }, [hareketler, hareketArama])

  const { dilim: hareketDilim, ...hareketSayfalama } = useSayfalama(hareketlerGorunur)
  const hareketVeriGeldi = hareketler !== null

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    setHata(null)
    try {
      // Arama sunucu tarafında uygulanmıyor (ölü parametre kaldırıldı,
      // bkz. electron/db/fatura-stok.js): filtre aşağıda istemcide yapılır.
      // 🔴 Sunucudan HER ZAMAN tam liste çekilir; "yalnız eksik" süzgeci istemcide
      // uygulanır. Sebep: süzgeç sunucuda uygulanınca ARAMA, elenmiş satırlarda
      // arıyordu — kullanıcı var olan bir ürünü arayıp boş sonuç görüyor ve ürünün
      // sistemde olmadığını sanıyordu (01.09 kullanıcı bildirimi).
      const veri = await faturaStokApi.durum({ sadece_eksik: false })
      setSatirlar(veri)
    } catch (e) {
      setHata(e.message)
      toast.error(e.message)
    } finally {
      setYukleniyor(false)
    }
  }, [])

  useEffect(() => { if (sekme === 'durum') yukle() }, [yukle, sekme])

  const aramaVar = String(arama || '').trim().length > 0

  const satirlarGorunur = useMemo(() => {
    if (!satirlar) return []
    return satirlar.filter(s => {
      if (!eslesirMi([s.urun_adi, s.sku, s.barkod].filter(Boolean).join(' '), arama)) return false
      // Kullanıcı bir şey ARADIĞINDA niyeti "o ürünü göster"dir; süzgeç susturulur.
      if (aramaVar) return true
      return !sadeceEksik || s.fark < 0
    })
  }, [satirlar, arama, aramaVar, sadeceEksik])

  // Süzgecin kaç satırı gizlediği: boş ekranı "ürün yok" sanmayı önler.
  const gizlenen = useMemo(() => {
    if (!satirlar || aramaVar || !sadeceEksik) return 0
    return satirlar.length - satirlarGorunur.length
  }, [satirlar, satirlarGorunur, aramaVar, sadeceEksik])

  const { dilim, ...sayfalama } = useSayfalama(satirlarGorunur)

  // Veri hiç gelmediyse (null) boş tablo "eksik ürün yok" ile karıştırılmasın.
  const veriGeldi = satirlar !== null

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">🧾 Fatura Stoğu</h2>

      <div className="flex gap-1 mb-4 border-b">
        {[['durum', '📊 Durum'], ['alis', '📥 Alış Faturaları'], ['hareket', '🔀 Hareketler'], ['belirsiz', '⚠️ Kontrol Bekliyor']]
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
            <button type="button" onClick={tohumla} disabled={tohumMesgul}
              title="Bizimhesap'taki stok, fatura stoğuna AÇILIŞ BAKİYESİ olarak yazılır. Bakiyesi olan ürüne dokunulmaz."
              className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-50">
              {tohumMesgul ? 'Alınıyor…' : "📥 Bizimhesap Açılış Bakiyesi"}
            </button>
          </div>

          {tohumSonuc && (
            <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
              <b>{tohumSonuc.yazilan}</b> ürüne açılış bakiyesi yazıldı ({tohumSonuc.toplam_adet} adet).
              {tohumSonuc.atlanan > 0 && <> {tohumSonuc.atlanan} ürün atlandı (bakiyesi zaten vardı).</>}
              {tohumSonuc.rapor?.bizdeYok?.length > 0 && (
                <details className="mt-1 text-amber-800">
                  <summary className="cursor-pointer text-xs underline">
                    Bizimhesap'ta olup uygulamada bulunmayan {tohumSonuc.rapor.bizdeYok.length} stok kodu
                  </summary>
                  <ul className="text-xs mt-1 max-h-40 overflow-auto list-disc pl-4">
                    {tohumSonuc.rapor.bizdeYok.map(x => <li key={x}>{x}</li>)}
                  </ul>
                </details>
              )}
              {tohumSonuc.rapor?.senkBekleyen?.length > 0 && (
                <details className="mt-1 text-red-700">
                  <summary className="cursor-pointer text-xs underline">
                    {tohumSonuc.rapor.senkBekleyen.length} ürünün bulut kimliği yok — senkron sonrası tekrar çalıştırın
                  </summary>
                  <ul className="text-xs mt-1 max-h-40 overflow-auto list-disc pl-4">
                    {tohumSonuc.rapor.senkBekleyen.map(x => <li key={x}>{x}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          {!yukleniyor && !hata && satirlar && (
            <p className="text-xs text-gray-500 mb-2">
              {satirlar.filter(s => s.fatura_miktar > 0).length} üründe fatura stoğu kayıtlı ·
              toplam {satirlar.reduce((t, s) => t + (Number(s.fatura_miktar) || 0), 0)} adet ·
              listede {satirlarGorunur.length} / {satirlar.length} ürün
            </p>
          )}

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
                  {aramaVar
                    ? 'Aramayla eşleşen ürün yok.'
                    : sadeceEksik
                      ? 'Faturası eksik ürün yok — tüm siparişlere fatura kesilebilir.'
                      : 'Gösterilecek ürün yok.'}
                </p>
              )}
              {gizlenen > 0 && (
                <p className="text-center text-xs text-gray-400 pb-3">
                  {gizlenen} ürün "yalnız faturası eksik olanlar" süzgeci yüzünden gizli.
                  Arama yaptığınızda süzgeç uygulanmaz.
                </p>
              )}
              <Sayfalama {...sayfalama} />
            </>
          )}
        </>
      )}

      {sekme === 'alis' && (
        <>
          <div className="flex gap-3 items-center mb-3 flex-wrap">
            <input value={alisArama} onChange={e => setAlisArama(e.target.value)}
              placeholder="Fatura no veya tedarikçi ara" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
            <button type="button" onClick={alisYukle} disabled={alisYukleniyor}
              className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-50">
              🔄 Tekrar Dene
            </button>
            {duzenleYetkisi && (
              <button type="button" onClick={formuAc} disabled={formVeriYukleniyor}
                className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {formVeriYukleniyor ? 'Yükleniyor…' : '➕ Alış Faturası Gir'}
              </button>
            )}
          </div>

          {alisYukleniyor && (
            <p className="text-center text-gray-400 py-8">Yükleniyor…</p>
          )}

          {!alisYukleniyor && alisHata && (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium mb-1">Veri alınamadı</p>
              <p className="text-gray-500 text-sm">{alisHata}</p>
              <button type="button" onClick={alisYukle}
                className="mt-3 px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">
                Tekrar dene
              </button>
            </div>
          )}

          {!alisYukleniyor && !alisHata && alisVeriGeldi && (
            <>
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b">
                  <th className="py-2">Fatura No</th><th>Tedarikçi</th>
                  <th>Tarih</th><th className="text-right">Genel Toplam</th>
                </tr></thead>
                <tbody>
                  {alisDilim.map(f => (
                    <Fragment key={f.senk_id}>
                      <tr onClick={() => detayAc(f.senk_id)}
                        className="border-b cursor-pointer hover:bg-gray-50">
                        <td className="py-2">{f.fatura_no}</td>
                        <td className="text-gray-600">{f.tedarikci_adi}</td>
                        <td className="text-gray-600">{f.fatura_tarihi}</td>
                        <td className="text-right font-medium">{Number(f.genel_toplam).toFixed(2)} TL</td>
                      </tr>
                      {acikDetay === f.senk_id && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={4} className="p-3">
                            {kalemYukleniyor === f.senk_id && (
                              <p className="text-gray-400 text-center py-2">Kalemler yükleniyor…</p>
                            )}
                            {kalemYukleniyor !== f.senk_id && (
                              <table className="w-full text-xs">
                                <thead><tr className="text-left border-b">
                                  <th className="py-1">Ürün</th><th className="text-right">Miktar</th>
                                  <th className="text-right">Birim Fiyat</th><th className="text-right">KDV %</th>
                                  <th className="text-right">Satır Toplam</th>
                                </tr></thead>
                                <tbody>
                                  {(kalemlerMap[f.senk_id] || []).map(k => (
                                    <tr key={k.senk_id}>
                                      <td className="py-1">{k.urun_adi}</td>
                                      <td className="text-right">{k.miktar}</td>
                                      <td className="text-right">{Number(k.birim_fiyat).toFixed(2)}</td>
                                      <td className="text-right">%{k.kdv_orani}</td>
                                      <td className="text-right">{Number(k.satir_toplam).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {alisDilim.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  {alisArama ? 'Aramayla eşleşen fatura yok.' : 'Henüz alış faturası girilmemiş.'}
                </p>
              )}
              <Sayfalama {...alisSayfalama} />
            </>
          )}
        </>
      )}

      {sekme === 'hareket' && (
        <>
          <div className="flex gap-3 items-center mb-3 flex-wrap">
            <input value={hareketArama} onChange={e => setHareketArama(e.target.value)}
              placeholder="Ürün, SKU, açıklama veya kullanıcı ara" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
            <button type="button" onClick={hareketYukle} disabled={hareketYukleniyor}
              className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-50">
              🔄 Tekrar Dene
            </button>
          </div>

          {hareketYukleniyor && (
            <p className="text-center text-gray-400 py-8">Yükleniyor…</p>
          )}

          {!hareketYukleniyor && hareketHata && (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium mb-1">Veri alınamadı</p>
              <p className="text-gray-500 text-sm">{hareketHata}</p>
              <button type="button" onClick={hareketYukle}
                className="mt-3 px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">
                Tekrar dene
              </button>
            </div>
          )}

          {!hareketYukleniyor && !hareketHata && hareketVeriGeldi && (
            <>
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b">
                  <th className="py-2">Tarih</th><th>Ürün</th><th>Kaynak</th>
                  <th className="text-right">Miktar</th><th>Açıklama</th><th>Kullanıcı</th>
                </tr></thead>
                <tbody>
                  {hareketDilim.map(h => (
                    <tr key={h.senk_id} className="border-b">
                      <td className="py-2 text-gray-600">{hareketTarihiGoster(h.senk_guncelleme)}</td>
                      <td>{h.urun_adi}{h.sku && <span className="text-gray-400 text-xs ml-1">({h.sku})</span>}</td>
                      <td className="text-gray-600">{KAYNAK_ETIKETLERI[h.kaynak_tip] || h.kaynak_tip}</td>
                      <td className={`text-right font-semibold ${h.miktar < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {h.miktar > 0 ? `+${h.miktar}` : h.miktar}
                      </td>
                      <td className="text-gray-600">{h.aciklama || '—'}</td>
                      <td className="text-gray-500">{h.kullanici || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hareketDilim.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  {hareketArama ? 'Aramayla eşleşen hareket yok.' : 'Henüz hiç fatura stoğu hareketi yok.'}
                </p>
              )}
              <Sayfalama {...hareketSayfalama} />
            </>
          )}
        </>
      )}

      {/* Form yalnız açıkken mount edilir — AlisFaturaFormu state'i (tedarikçi,
          fatura no, kalemler) sadece İLK render'da useState ile okur, `acik`
          sonradan false olduğunda state sıfırlanmaz. Koşullu mount + `key`
          ile her açılışta bileşen sıfırdan kurulur, önceki faturanın
          kalemleri bir sonraki girişe sızmaz (bkz. MalKabul.jsx aynı desen). */}
      {sekme === 'belirsiz' && (
        <>
          <div className="flex gap-3 items-center mb-3 flex-wrap">
            <p className="text-sm text-gray-500 flex-1">
              Bu faturalarda Bizimhesap'a ulaşılamadı ve sonuç <b>doğrulanamadı</b>.
              Fatura orada oluşmuş olabilir; bu yüzden stok iade EDİLMEDİ. Bizimhesap'ta kontrol edip karar verin.
            </p>
            <button type="button" onClick={belirsizYukle} disabled={belirsizYukleniyor}
              className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-50">
              🔄 Tekrar Dene
            </button>
          </div>

          {belirsizYukleniyor && <p className="text-center text-gray-400 py-8">Yükleniyor…</p>}

          {!belirsizYukleniyor && belirsizler && belirsizler.length === 0 && (
            <p className="text-center text-gray-500 py-8">Kontrol bekleyen fatura yok.</p>
          )}

          {!belirsizYukleniyor && belirsizler && belirsizler.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-2.5">Tarih</th>
                    <th className="px-4 py-2.5">Sipariş</th>
                    <th className="px-4 py-2.5">Hata</th>
                    <th className="px-4 py-2.5">Karar</th>
                  </tr>
                </thead>
                <tbody>
                  {belirsizler.map(b => (
                    <tr key={b.senk_id} className="border-t align-top">
                      <td className="px-4 py-2.5 whitespace-nowrap">{hareketTarihiGoster(b.tarih)}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{b.kanal_siparis_id}</span>
                        <span className="block text-xs text-gray-400">{b.kanal}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs">{b.hata_mesaji || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <input value={guidGirdi[b.senk_id] || ''}
                            onChange={e => setGuidGirdi(g => ({ ...g, [b.senk_id]: e.target.value }))}
                            placeholder="Bizimhesap fatura kimliği (guid)"
                            className="border rounded px-2 py-1 text-xs w-56" />
                          <button type="button" disabled={belirsizMesgul === b.senk_id}
                            onClick={() => belirsizKarar(b, true)}
                            className="px-3 py-1 rounded text-xs bg-emerald-600 text-white disabled:opacity-50">
                            Kesilmiş
                          </button>
                          <button type="button" disabled={belirsizMesgul === b.senk_id}
                            onClick={() => belirsizKarar(b, false)}
                            className="px-3 py-1 rounded text-xs border hover:bg-gray-50 disabled:opacity-50"
                            title="Stok iade edilir, siparişe yeniden fatura kesilebilir">
                            Kesilmemiş
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {duzenleYetkisi && formAcik && (
        <AlisFaturaFormu
          acik={formAcik}
          kapat={() => setFormAcik(false)}
          kaydedildi={alisYukle}
          urunler={urunler || []}
          tedarikciler={tedarikciler || []}
        />
      )}
    </div>
  )
}
