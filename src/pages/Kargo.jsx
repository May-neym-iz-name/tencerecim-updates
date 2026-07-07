import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kargoApi, sistemApi, whatsappLink } from '../api/ipc'
import { upsTakipUrl } from '../lib/kargo'
import { senkTetikle } from '../lib/veriSenk'
import { etiketIndir } from '../lib/etiketDepo'
import { useAuth } from '../auth/AuthContext'
import KargoFormu from '../components/KargoFormu'
import KargoDetayModal from '../components/KargoDetayModal'
import Sayfalama from '../components/Sayfalama'

// UPS kurye rezervasyon sayfası — takip penceresi gibi program içi pencerede açılır.
const UPS_PICKUP_URL = 'https://apps.ups.com.tr/PickupRequest'
import { useSayfalama } from '../hooks/useSayfalama'
import { usePersistentState } from '../hooks/usePersistentState'

const DURUM_RENK = {
  olusturuldu: 'bg-blue-100 text-blue-700',
  iptal: 'bg-red-100 text-red-700',
}

export default function Kargo() {
  const { yetkiVar, lokasyonErisim } = useAuth()
  const iptalYetkisi = yetkiVar('kargo_iptal')
  const [kargolar, setKargolar] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [filtre, setFiltre] = useState({ takip: '', musteri: '', bas: '', bit: '', lokasyon: '' })
  const [secili, setSecili] = useState(() => new Set()) // toplu basım için seçili kargo id'leri
  const [basiliyor, setBasiliyor] = useState(false)
  const [detayId, setDetayId] = useState(null)
  const [iadeBaslangic, setIadeBaslangic] = useState(null) // listeden iade: müşteri bilgileri dolu form

  // UPS kurye rezervasyon sayfasını program içi pencerede aç (takip gibi).
  function kuryeCagir() { window.open(UPS_PICKUP_URL, '_blank') }

  // Listedeki bir kargonun müşterisi için iade gönderisi formunu (bilgiler dolu) aç.
  function iadeOlustur(k) {
    setIadeBaslangic({
      iade: true,
      aliciAd: k.alici_ad || '',
      aliciTelefon: k.alici_telefon || '',
      aliciAdres: k.alici_adres || '',
      ilKodu: k.il_kodu || null, il: k.il || '',
      ilceKodu: k.ilce_kodu || null, ilce: k.ilce || '',
      musteriId: k.musteri_id || null,
      gondericiLokasyonId: k.lokasyon_id || null, // teslim mağazası: kargonun çıkış mağazası varsayılan
    })
    setFormAcik(true)
  }
  const [sayfaBasina, setSayfaBasina] = usePersistentState('kargo_etiket_sayfa_basina', 1) // 1|2|4

  function filtreAlan(k, v) { setFiltre(f => ({ ...f, [k]: v })) }
  function filtreTemizle() { setFiltre({ takip: '', musteri: '', bas: '', bit: '', lokasyon: '' }) }

  // Filtre açılırında gösterilecek lokasyonlar (görünür kargolardan türetilir).
  const filtreLokasyonlar = [...new Map(
    kargolar.filter(k => k.lokasyon_id != null).map(k => [k.lokasyon_id, k.lokasyon_ad || `#${k.lokasyon_id}`])
  )].sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'tr'))

  const gosterilen = kargolar.filter(k => {
    // Lokasyon kapsamı: kullanıcı yalnızca yetkili olduğu mağazanın gönderilerini
    // görür (lokasyonsuz/eski kayıtlar herkese açık). Yönetici/admin hepsini görür.
    if (k.lokasyon_id != null && !lokasyonErisim(k.lokasyon_id)) return false
    if (filtre.lokasyon && String(k.lokasyon_id ?? '') !== filtre.lokasyon) return false
    if (filtre.takip && !(k.takip_no || '').toLowerCase().includes(filtre.takip.toLowerCase())) return false
    if (filtre.musteri && !(k.alici_ad || '').toLowerCase().includes(filtre.musteri.toLowerCase())) return false
    const gun = (k.olusturma_tarihi || '').slice(0, 10) // YYYY-MM-DD
    if (filtre.bas && gun && gun < filtre.bas) return false
    if (filtre.bit && gun && gun > filtre.bit) return false
    return true
  })

  const { dilim: sayfaKargolar, ...sayfalama } = useSayfalama(gosterilen, 50)

  function yenile() {
    setYukleniyor(true)
    kargoApi.listele().then(setKargolar).catch(e => toast.error(e.message)).finally(() => setYukleniyor(false))
  }
  useEffect(yenile, [])

  function whatsappGonder(k) {
    if (!k.alici_telefon) { toast.error('Bu gönderide alıcı telefonu yok.'); return }
    const url = upsTakipUrl(k.takip_no)
    const mesaj = `Merhaba ${k.alici_ad || ''}, siparişiniz kargoya verildi. ` +
      `UPS takip no: ${k.takip_no}` + (url ? `\nTakip: ${url}` : '')
    const link = whatsappLink(k.alici_telefon, mesaj)
    if (!link) { toast.error('Geçersiz telefon numarası.'); return }
    sistemApi.linkAc(link).catch(e => toast.error(e.message))
  }

  async function iptal(k) {
    if (!confirm(`${k.takip_no} numaralı gönderiyi iptal etmek istediğinize emin misiniz?`)) return
    const bekle = toast.loading('İptal ediliyor…')
    try {
      await kargoApi.iptal(k.id)
      toast.success('Gönderi iptal edildi', { id: bekle })
      yenile()
      senkTetikle() // durum değişikliğini anında Supabase'e gönder
    } catch (e) { toast.error(e.message, { id: bekle }) }
  }

  async function etiketBas(k) {
    try {
      let pngler = await kargoApi.etiket(k.id)
      // Yerelde yoksa (başka PC'de oluşturuldu) → Supabase Storage'dan indir.
      if (!pngler.length && k.etiket_storage_yol) {
        const bekle = toast.loading('Etiket indiriliyor…')
        try { pngler = await etiketIndir(k.etiket_storage_yol) }
        finally { toast.dismiss(bekle) }
      }
      if (pngler.length) {
        await kargoApi.etiketOnizle(pngler, Number(sayfaBasina) || 1)
        toast.success('Önizleme açıldı')
      } else if (k.etiket_link) {
        // Son çare: UPS linki (güvenilmez, oturum/sürede geçersiz olabilir).
        sistemApi.linkAc(k.etiket_link).catch(e => toast.error(e.message))
        toast.success('UPS etiket sayfası açıldı')
      } else {
        toast.error('Bu gönderinin etiketi bu bilgisayarda yok ve Storage\'a henüz yüklenmemiş. Etiketi oluşturan bilgisayar senkronladıktan sonra tekrar deneyin.')
      }
    } catch (e) { toast.error('Etiket açılamadı: ' + e.message) }
  }

  // Toplu basım için seçilebilir kargolar: iptal olmayan + takip no'lu.
  const secilebilir = gosterilen.filter(k => k.durum !== 'iptal' && k.takip_no)
  const tumuSecili = secilebilir.length > 0 && secilebilir.every(k => secili.has(k.id))

  function secimDegistir(id) {
    setSecili(prev => {
      const y = new Set(prev)
      y.has(id) ? y.delete(id) : y.add(id)
      return y
    })
  }
  function tumunuSec() {
    setSecili(tumuSecili ? new Set() : new Set(secilebilir.map(k => k.id)))
  }

  async function topluEtiketBas() {
    const idler = [...secili]
    if (!idler.length) { toast.error('Etiket basmak için kargo seçin'); return }
    setBasiliyor(true)
    const bekle = toast.loading(`${idler.length} kargonun etiketi hazırlanıyor…`)
    try {
      const { pngler, kargoSayisi, etiketSayisi } = await kargoApi.etiketToplu(idler)
      if (!pngler.length) { toast.error('Seçili kargoların kayıtlı etiketi yok', { id: bekle }); return }
      await kargoApi.etiketOnizle(pngler, Number(sayfaBasina) || 1)
      toast.success(`${kargoSayisi} kargo · ${etiketSayisi} etiket önizlemede açıldı`, { id: bekle })
      setSecili(new Set())
    } catch (e) { toast.error('Toplu etiket yazdırılamadı: ' + e.message, { id: bekle }) }
    finally { setBasiliyor(false) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">📦 Kargo</h2>
        <div className="flex gap-2">
          {secili.size > 0 && (
            <button onClick={topluEtiketBas} disabled={basiliyor}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
              🖨️ {basiliyor ? 'Basılıyor…' : `Seçili Etiketleri Bas (${secili.size})`}
            </button>
          )}
          <button onClick={kuryeCagir}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700"
            title="UPS kurye rezervasyon sayfasını aç">🚚 Kurye Çağır</button>
          <button onClick={() => { setIadeBaslangic(null); setFormAcik(true) }}
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
        <label className="text-xs text-gray-500">Lokasyon (çıkış)
          <select value={filtre.lokasyon} onChange={e => filtreAlan('lokasyon', e.target.value)}
            className="border rounded px-2 py-1.5 text-sm bg-white mt-0.5 block w-40">
            <option value="">Tümü</option>
            {filtreLokasyonlar.map(([id, ad]) => <option key={id} value={String(id)}>{ad}</option>)}
          </select>
        </label>
        <button onClick={filtreTemizle} className="text-xs text-gray-500 hover:text-gray-800 underline pb-2">Temizle</button>
        {/* Sağ küme: sayaç + etiket düzeni (hem tekli hem toplu basımda geçerli) */}
        <div className="ml-auto flex items-end gap-3">
          <span className="text-xs text-gray-400 pb-2 whitespace-nowrap">{gosterilen.length} / {kargolar.length} gönderi</span>
          <label className="text-xs text-gray-500" title="Etiket önizlemesinde sayfa başına kaç etiket dizilsin">🖨️ Etiket/sayfa
            <select value={sayfaBasina} onChange={e => setSayfaBasina(Number(e.target.value))}
              className="border rounded px-2 py-1.5 text-sm bg-white mt-0.5 block w-28">
              <option value={1}>1 · Termal</option>
              <option value={2}>2 · A4</option>
              <option value={4}>4 · A4</option>
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={tumuSecili} onChange={tumunuSec}
                  title="Filtreye uyan (iptal olmayan) tüm kargoları seç" disabled={!secilebilir.length} />
              </th>
              <th className="px-3 py-2 font-medium">Takip No</th>
              <th className="px-3 py-2 font-medium">Alıcı</th>
              <th className="px-3 py-2 font-medium">Adres</th>
              <th className="px-3 py-2 font-medium">Lokasyon</th>
              <th className="px-3 py-2 font-medium">Durum</th>
              <th className="px-3 py-2 font-medium">Tarih</th>
              <th className="px-3 py-2 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {sayfaKargolar.map(k => (
              <tr key={k.id} className={`border-t hover:bg-gray-50 ${secili.has(k.id) ? 'bg-emerald-50' : ''}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={secili.has(k.id)} onChange={() => secimDegistir(k.id)}
                    disabled={k.durum === 'iptal' || !k.takip_no} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {k.takip_no
                    ? <a href={upsTakipUrl(k.takip_no)} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline" title="UPS takip penceresini aç">{k.takip_no} ↗</a>
                    : '—'}
                </td>
                <td className="px-3 py-2">{k.alici_ad}</td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[180px] truncate">{[k.ilce, k.il].filter(Boolean).join(', ')}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{k.lokasyon_ad || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${DURUM_RENK[k.durum] || 'bg-gray-100 text-gray-600'}`}>
                    {k.durum === 'iptal' ? 'İptal' : 'Oluşturuldu'}
                  </span>
                  {k.tip === 'iade' && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700" title="İade gönderisi: müşteriden mağazaya">↩ İade</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-400 text-xs">{(k.olusturma_tarihi || '').slice(0, 16)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setDetayId(k.id)} className="text-blue-600 hover:underline text-xs mr-2 font-medium">Detay</button>
                  {k.tip !== 'iade' && (
                    <button onClick={() => iadeOlustur(k)}
                      className="text-purple-700 hover:underline text-xs mr-2 font-medium"
                      title="Bu müşteri için iade gönderisi oluştur (bilgiler otomatik dolar)">↩ İade</button>
                  )}
                  {k.tip === 'iade' && k.durum !== 'iptal' && (
                    <button onClick={kuryeCagir}
                      className="text-amber-700 hover:underline text-xs mr-2 font-medium"
                      title="UPS kurye rezervasyon sayfasını aç">🚚 Kurye</button>
                  )}
                  <button onClick={() => whatsappGonder(k)} className="text-green-700 hover:underline text-xs mr-2 font-medium">💬 WhatsApp</button>
                  <button onClick={() => etiketBas(k)} className="text-gray-600 hover:underline text-xs mr-2">Etiket</button>
                  {k.durum !== 'iptal' && iptalYetkisi && (
                    <button onClick={() => iptal(k)} className="text-red-600 hover:underline text-xs">İptal</button>
                  )}
                </td>
              </tr>
            ))}
            {gosterilen.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                {yukleniyor ? 'Yükleniyor…' : (kargolar.length ? 'Filtreye uyan gönderi yok.' : 'Henüz kargo gönderisi yok.')}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      <KargoFormu acik={formAcik} baslangic={iadeBaslangic}
        kapat={() => { setFormAcik(false); setIadeBaslangic(null) }}
        onTamam={(kargo) => {
          yenile(); senkTetikle()
          // İade barkodu oluşturuldu → UPS kurye rezervasyon sayfasını program içi pencerede aç.
          if (kargo?.tip === 'iade') kuryeCagir()
        }} />
      <KargoDetayModal acik={detayId != null} kapat={() => setDetayId(null)} kargoId={detayId} />
    </div>
  )
}
