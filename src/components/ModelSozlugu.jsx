import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { modelSozlukApi, setApi } from '../api/ipc'

// Model Sözlüğü — satış ekranındaki Marka > Ana Tip > MODEL gezinmesinin kaynağı.
//
// Bu ekran olmadan sözlük ilk tohumlamada DONAR ve "Diğer" oranı hiç düşmez
// (ölçüm 14.09: 2.906 ürünün 602'si, %20,7'si "Diğer"de). Spec §7'nin gerekçesi bu.
//
// Model çözümlemesi SUNUCUDA yapılır (electron/db/model-coz.js); burada yalnız
// sözlük düzenlenir ve etkisi canlı sayaçtan izlenir.

const DIGER = 'Diğer'

export default function ModelSozlugu() {
  const [ozet, setOzet] = useState([])
  const [markaId, setMarkaId] = useState(null)
  const [detay, setDetay] = useState(null)      // { modeller, sayac }
  const [digerler, setDigerler] = useState([])
  const [yeniAd, setYeniAd] = useState('')
  const [tohum, setTohum] = useState(null)      // { marka, urun_sayisi, adaylar[] }
  const [secililer, setSecililer] = useState(new Set())
  const [setOneri, setSetOneri] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)

  const ozetYukle = useCallback(() => {
    modelSozlukApi.ozet().then(setOzet).catch(e => toast.error(e.message))
  }, [])
  useEffect(() => { ozetYukle() }, [ozetYukle])

  const detayYukle = useCallback((id) => {
    if (!id) return
    setYukleniyor(true)
    Promise.all([modelSozlukApi.listele(id), modelSozlukApi.digerUrunler(id)])
      .then(([d, dg]) => { setDetay(d); setDigerler(dg) })
      .catch(e => toast.error(e.message))
      .finally(() => setYukleniyor(false))
  }, [])

  function markaSec(id) {
    setMarkaId(id); setTohum(null); setSecililer(new Set()); setYeniAd('')
    detayYukle(id)
  }

  // Her yazma işleminden sonra HEM detay HEM özet tazelenir: sayaç canlı olmazsa
  // kullanıcı sözlüğe ekleme yapmanın "Diğer"i düşürüp düşürmediğini göremez ve
  // bu ekranın tek amacı o geri bildirimdir.
  function tazele() { detayYukle(markaId); ozetYukle() }

  async function ekle(e) {
    e?.preventDefault()
    const ad = yeniAd.trim()
    if (!ad) return
    try {
      const r = await modelSozlukApi.ekle({ marka_id: markaId, model_adi: ad })
      setYeniAd('')
      toast.success(r.canlandirildi ? `"${ad}" yeniden etkinleştirildi` : `"${ad}" eklendi`)
      tazele()
    } catch (err) { toast.error(err.message) }
  }

  async function oncelikDegistir(m, delta) {
    try {
      await modelSozlukApi.guncelle({ id: m.id, oncelik: (m.oncelik || 0) + delta })
      tazele()
    } catch (err) { toast.error(err.message) }
  }

  async function sil(m) {
    try { await modelSozlukApi.sil(m.id); toast.success(`"${m.model_adi}" silindi`); tazele() }
    catch (err) { toast.error(err.message) }
  }

  async function tohumAc() {
    try {
      const t = await modelSozlukApi.tohumOnizleme(markaId)
      setTohum(t)
      // Varsayılan seçim: zaten sözlükte OLMAYAN adaylar. Kullanıcı listeyi görmeden
      // "hepsini ekle" yapamaz — gürültülü sözlük spec §9.2'de kabul edilmiş bir risk.
      setSecililer(new Set(t.adaylar.filter(a => !a.zaten_var).map(a => a.model_adi)))
    } catch (err) { toast.error(err.message) }
  }

  async function tohumUygula() {
    try {
      const r = await modelSozlukApi.tohumla({ marka_id: markaId, modeller: [...secililer] })
      toast.success(`${r.eklenen} model eklendi — ${r.diger} ürün hâlâ "${DIGER}"de`)
      setTohum(null); tazele()
    } catch (err) { toast.error(err.message) }
  }

  async function setOneriAc() {
    try { setSetOneri(await setApi.markaOnizleme()) }
    catch (err) { toast.error(err.message) }
  }

  async function setOneriUygula() {
    const idler = setOneri.filter(o => !o.mevcut_marka_id && o.onerilen_marka_id).map(o => o.id)
    if (!idler.length) { toast('Yazılacak set yok'); return }
    try {
      const r = await setApi.markaUygula(idler)
      toast.success(`${r.yazilan} setin markası yazıldı`)
      setSetOneri(null); ozetYukle()
    } catch (err) { toast.error(err.message) }
  }

  const secilenMarka = ozet.find(o => o.id === markaId)
  const toplam = ozet.reduce((t, o) => t + o.toplam, 0)
  const toplamDiger = ozet.reduce((t, o) => t + o.diger, 0)

  return (
    <div className="flex-1 flex gap-4 overflow-hidden">

      {/* SOL: marka listesi + genel kapsama */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden">
        <div className="mb-2 rounded-lg border border-gray-200 bg-white p-3 flex-shrink-0">
          <div className="text-xs text-gray-500 mb-1">Genel kapsama</div>
          <div className="text-lg font-bold text-gray-800">
            %{toplam ? (((toplam - toplamDiger) / toplam) * 100).toFixed(1) : '0.0'}
          </div>
          <div className="text-xs text-gray-500">{toplamDiger} / {toplam} ürün &quot;{DIGER}&quot;de</div>
          <button onClick={setOneriAc}
            className="mt-2 w-full text-xs text-purple-700 border border-purple-200 bg-purple-50 rounded px-2 py-1 hover:bg-purple-100">
            🎁 Setlerin markasını doldur…
          </button>
        </div>
        <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
          {ozet.map(o => (
            <button key={o.id} onClick={() => markaSec(o.id)}
              className={`w-full text-left px-3 py-2 border-b last:border-b-0 text-sm hover:bg-gray-50 ${markaId === o.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}>
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-gray-800 truncate">{o.ad}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{o.toplam}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1.5 rounded bg-gray-100 overflow-hidden">
                  <div className="h-full bg-green-500"
                    style={{ width: `${o.toplam ? (o.eslesen / o.toplam) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-gray-500 tabular-nums">
                  {o.toplam ? Math.round((o.eslesen / o.toplam) * 100) : 0}%
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{o.model_sayisi} model · {o.diger} &quot;{DIGER}&quot;de</div>
            </button>
          ))}
        </div>
      </div>

      {/* SAĞ: seçili markanın sözlüğü */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!markaId && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Soldan bir marka seçin.
          </div>
        )}

        {markaId && (
          <>
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-800">{secilenMarka?.ad}</h3>
              {detay && (
                <span className="text-xs text-gray-500">
                  {detay.sayac.eslesen} eşleşti ·{' '}
                  <span className="text-orange-600 font-medium">{detay.sayac.diger} &quot;{DIGER}&quot;de</span>
                </span>
              )}
              <button onClick={tohumAc}
                className="ml-auto text-xs border border-blue-200 bg-blue-50 text-blue-700 rounded px-2.5 py-1 hover:bg-blue-100">
                ✨ Adlardan model öner
              </button>
            </div>

            <form onSubmit={ekle} className="flex gap-2 mb-3 flex-shrink-0">
              <input value={yeniAd} onChange={e => setYeniAd(e.target.value)}
                placeholder="Model adı (örn. Venüs, Black Line)"
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">Ekle</button>
            </form>

            <div className="flex-1 flex gap-4 overflow-hidden">
              {/* Sözlük */}
              <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-3 py-2">Model</th>
                      <th className="px-2 py-2 w-20">Ürün</th>
                      <th className="px-2 py-2 w-28"
                        title="Aynı ürün adında iki model adayı geçerse YÜKSEK öncelikli kazanır — öncelik uzunluktan ÖNCE gelir">
                        Öncelik
                      </th>
                      <th className="px-2 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {yukleniyor && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Yükleniyor…</td></tr>}
                    {!yukleniyor && detay?.modeller.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-xs">
                        Bu markada henüz model yok — “✨ Adlardan model öner” ile başlayın.
                      </td></tr>
                    )}
                    {detay?.modeller.map(m => (
                      <tr key={m.id} className={`border-t ${m.aktif ? '' : 'opacity-40'}`}>
                        <td className="px-3 py-1.5 font-medium text-gray-800">{m.model_adi}</td>
                        <td className="px-2 py-1.5 text-gray-500 tabular-nums">{m.urun_sayisi}</td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => oncelikDegistir(m, -1)}
                              className="w-5 h-5 rounded border text-xs text-gray-500 hover:bg-gray-50">−</button>
                            <span className="w-5 text-center tabular-nums text-xs">{m.oncelik || 0}</span>
                            <button onClick={() => oncelikDegistir(m, 1)}
                              className="w-5 h-5 rounded border text-xs text-gray-500 hover:bg-gray-50">+</button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => sil(m)} title="Sil" className="text-gray-300 hover:text-red-600">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* "Diğer"de kalanlar — sözlüğe ne eklenmesi gerektiği BURADAN görülür */}
              <div className="w-80 flex-shrink-0 overflow-auto rounded-lg border border-orange-200 bg-orange-50/40">
                <div className="sticky top-0 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 border-b border-orange-200">
                  &quot;{DIGER}&quot;de kalan {digerler.length} ürün
                </div>
                {digerler.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">Hepsi eşleşti 🎉</div>
                )}
                {digerler.map(u => (
                  <div key={u.id} className="px-3 py-1.5 text-xs text-gray-700 border-b border-orange-100 last:border-b-0">
                    {u.ad}
                    {u.sku && <span className="text-gray-400 ml-1">· {u.sku}</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tohumlama önizlemesi */}
      {tohum && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setTohum(null)}>
          <div className="bg-white rounded-xl w-[560px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b">
              <div className="font-semibold text-gray-800">{tohum.marka} — model önerileri</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {tohum.urun_sayisi} ürün adında en az 3 kez geçen; tip, renk, ölçü ve malzeme
                olmayan kelimeler. Listeyi <b>gözden geçirin</b> — bu bir tahmindir,
                sözlüğe körlemesine yazılmaz.
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {tohum.adaylar.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">Aday bulunamadı.</div>
              )}
              {tohum.adaylar.map(a => (
                <label key={a.model_adi}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 ${a.zaten_var ? 'opacity-40' : ''}`}>
                  <input type="checkbox" disabled={a.zaten_var} checked={secililer.has(a.model_adi)}
                    onChange={e => {
                      const y = new Set(secililer)
                      if (e.target.checked) y.add(a.model_adi); else y.delete(a.model_adi)
                      setSecililer(y)
                    }} />
                  <span className="text-sm text-gray-800 flex-1">{a.model_adi}</span>
                  <span className="text-xs text-gray-400">{a.gecis} üründe</span>
                  {a.zaten_var && <span className="text-xs text-gray-400">zaten var</span>}
                </label>
              ))}
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={() => setTohum(null)} className="px-3 py-1.5 text-sm text-gray-600">Vazgeç</button>
              <button onClick={tohumUygula} disabled={!secililer.size}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium disabled:opacity-40">
                {secililer.size} modeli ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set marka geri doldurma önizlemesi */}
      {setOneri && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setSetOneri(null)}>
          <div className="bg-white rounded-xl w-[640px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b">
              <div className="font-semibold text-gray-800">Setlerin markasını doldur</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Set adının <b>baş kısmı</b> marka adıyla eşleştirilir. Markası zaten dolu olan
                setlere <b>dokunulmaz</b>; eşleşmeyen set elle bırakılır. Setler satış ekranında
                markalarının altındaki “Set” dalında çıkar — markasız set orada görünmez.
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {setOneri.map(o => (
                <div key={o.id} className="flex items-center gap-2 px-2 py-1.5 border-b last:border-b-0 text-sm">
                  <span className="w-28 flex-shrink-0 text-xs font-medium">
                    {o.mevcut_marka_id ? <span className="text-gray-400">zaten dolu</span>
                      : o.onerilen_marka ? <span className="text-green-700">→ {o.onerilen_marka}</span>
                        : <span className="text-orange-600">eşleşmedi</span>}
                  </span>
                  <span className="flex-1 text-gray-700 truncate" title={o.ad}>{o.ad}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end items-center">
              <span className="text-xs text-gray-500 mr-auto">
                {setOneri.filter(o => !o.mevcut_marka_id && o.onerilen_marka_id).length} sete yazılacak
              </span>
              <button onClick={() => setSetOneri(null)} className="px-3 py-1.5 text-sm text-gray-600">Vazgeç</button>
              <button onClick={setOneriUygula}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg font-medium">Yaz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
