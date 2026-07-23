import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kargoApi, sistemApi, whatsappLink } from '../api/ipc'
import { upsTakipUrl } from '../lib/kargo'
import { ucretHesapla, tl, desiHesapla, IL_BOLGE } from '../lib/kargoUcret'
import IlIlceSecici from '../components/IlIlceSecici'
import { senkTetikle } from '../lib/veriSenk'
import { etiketIndir } from '../lib/etiketDepo'
import { eslesirMi } from '../utils/arama'
import { useAuth } from '../auth/AuthContext'
import KargoFormu from '../components/KargoFormu'
import KargoDetayModal from '../components/KargoDetayModal'
import Sayfalama from '../components/Sayfalama'

// UPS kurye rezervasyon sayfası — takip penceresi gibi program içi pencerede açılır.
const UPS_PICKUP_URL = 'https://apps.ups.com.tr/PickupRequest'
import { useSayfalama } from '../hooks/useSayfalama'
import { useSiralama } from '../hooks/useSiralama'
import SiraliBaslik from '../components/SiraliBaslik'
import { usePersistentState } from '../hooks/usePersistentState'

const DURUM_RENK = {
  olusturuldu: 'bg-blue-100 text-blue-700',
  iptal: 'bg-red-100 text-red-700',
}

// UPS canlı durumu — YALNIZCA son_durum_kodu (StatusCode) ile karar verilir; serbest metin
// (son_durum) iki yönden de yanıltır (docs/ups-api-reference.md §1). Otomatik yoklayıcı
// (electron/ups/takip.js) bu kodu 30 dk'da bir yazar; kod null ise koli henüz UPS ağına girmemiştir.
const UPS_TESLIM = 2   // ALICIYA TESLİM EDİLDİ — tek gerçek teslim kodu
const UPS_OZEL = 3     // ÖZEL DURUM (sebep genişletilmiş tabloda)
function upsDurumBilgi(kod) {
  if (kod == null) return { etiket: 'Oluşturuldu', renk: DURUM_RENK.olusturuldu }
  const n = Number(kod)
  if (n === UPS_TESLIM) return { etiket: 'Teslim Edildi', renk: 'bg-emerald-100 text-emerald-700' }
  if (n === UPS_OZEL) return { etiket: 'Özel Durum', renk: 'bg-amber-100 text-amber-700' }
  return { etiket: 'Yolda', renk: 'bg-teal-100 text-teal-700' } // ağdaki tüm ara kodlar (1/4/6/7/…)
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
  const [gorunum, setGorunum] = useState('aktif') // 'aktif' | 'iptal' — iptaller ayrı listede
  // Kargo ücreti hesaplayıcı (2026-FLASH): il/ilçe + ölçülerden otomatik desi.
  // Yakıt oranı UPS'ten otomatik çekilir (haftalık); çekilemezse elle girilir (kalıcı).
  const [hesapAcik, setHesapAcik] = useState(false)
  const [yakitOrani, setYakitOrani] = usePersistentState('kargo_yakit_orani', 0)
  const [yakitDonem, setYakitDonem] = useState('') // otomatik çekilen dönem etiketi
  const [hesapAdres, setHesapAdres] = useState({ ilKodu: null, il: '', ilceKodu: null, ilce: '' })
  const [hesapOlcu, setHesapOlcu] = useState({ u: '', g: '', y: '' }) // 1 kolinin cm ölçüleri
  const [hesapKg, setHesapKg] = useState('')  // 1 kolinin gerçek ağırlığı
  const [hesapKoli, setHesapKoli] = useState(1)
  const [hesapKonut, setHesapKonut] = useState(true)

  // Panel açılınca güncel yakıt oranını UPS'ten çek (başarısızsa mevcut/elle kalır).
  useEffect(() => {
    if (!hesapAcik) return
    kargoApi.yakitOrani().then(r => {
      if (r?.oran != null) { setYakitOrani(r.oran); setYakitDonem(r.donem || '') }
    }).catch(() => {})
  }, [hesapAcik]) // eslint-disable-line react-hooks/exhaustive-deps

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
    // Kelime bazlı + Türkçe duyarsız (bkz. src/utils/arama.js). Eskiden toLowerCase()
    // vardı: yalnız ASCII'de duyarsız olduğu için alıcı adı "ÖMER KESKİN" iken
    // "ömer" yazan BULAMIYORDU. Artık sıra da önemsiz: "keskin ömer" de bulur.
    if (!eslesirMi(k.takip_no, filtre.takip)) return false
    if (!eslesirMi(k.alici_ad, filtre.musteri)) return false
    const gun = (k.olusturma_tarihi || '').slice(0, 10) // YYYY-MM-DD
    if (filtre.bas && gun && gun < filtre.bas) return false
    if (filtre.bit && gun && gun > filtre.bit) return false
    return true
  })

  // İptaller ayrı görünümde: filtreye uyanları duruma göre böl, seçili sekmeyi listele.
  const aktifKargolar = gosterilen.filter(k => k.durum !== 'iptal')
  const iptalKargolar = gosterilen.filter(k => k.durum === 'iptal')
  const listelenen = gorunum === 'iptal' ? iptalKargolar : aktifKargolar

  const sr = useSiralama(listelenen, {
    deger: (k, a) => a === 'adres' ? [k.ilce, k.il].filter(Boolean).join(', ')
      : a === 'tarih' ? k.olusturma_tarihi : k[a],
  })
  const { dilim: sayfaKargolar, ...sayfalama } = useSayfalama(sr.sirali, 50)

  function yenile() {
    setYukleniyor(true)
    kargoApi.listele().then(setKargolar).catch(e => toast.error(e.message)).finally(() => setYukleniyor(false))
  }
  useEffect(yenile, [])

  // Otomatik tazeleme: 30 dk'lık UPS takip yoklayıcısı bir durum yazınca main süreç
  // 'ikas:siparis-degisti' yayar (electron/main.js). Online Siparişler ekranıyla aynı desen —
  // açık Kargo listesi kendiliğinden güncel durumu gösterir. Sarmalayıcı şart: olay payload'ı
  // ilk parametreye geçer, yenile'yi doğrudan verirsek beklenmedik argümanla çağrılır.
  useEffect(() => {
    window.api.on('ikas:siparis-degisti', () => yenile())
    return () => window.api.removeAllListeners('ikas:siparis-degisti')
  }, [])

  // Elle tetik: 30 dk'yı beklemeden tüm bekleyen gönderileri UPS'ten anında sorgular.
  const [durumYenileniyor, setDurumYenileniyor] = useState(false)
  async function durumlariYenile() {
    setDurumYenileniyor(true)
    const bekle = toast.loading('UPS durumları sorgulanıyor…')
    try {
      const r = await kargoApi.takipYokla()
      yenile()
      const n = r?.degisti || 0
      toast.success(n ? `${n} gönderinin durumu güncellendi.` : 'Tüm durumlar zaten güncel.', { id: bekle })
    } catch (e) {
      toast.error('Durum sorgulanamadı: ' + e.message, { id: bekle })
    } finally { setDurumYenileniyor(false) }
  }

  function whatsappGonder(k) {
    if (!k.alici_telefon) { toast.error('Bu gönderide alıcı telefonu yok.'); return }
    const url = upsTakipUrl(k.takip_no)
    // İade ve normal gönderi farklı akış → farklı mesaj metni.
    const mesaj = k.tip === 'iade'
      ? `Merhaba ${k.alici_ad || ''}, iade kargonuz için gönderi oluşturuldu. ` +
        `Kurye adresinizden alacaktır; dilerseniz en yakın UPS şubesine de bırakabilirsiniz. ` +
        `Kargo etiketini bu mesajla birlikte paylaşıyoruz — paketin üzerine yapıştırın.` +
        `\nUPS takip no: ${k.takip_no}` + (url ? `\nTakip: ${url}` : '')
      : `Merhaba ${k.alici_ad || ''}, siparişiniz kargoya verildi. ` +
        `UPS takip no: ${k.takip_no}` + (url ? `\nTakip: ${url}` : '')
    const link = whatsappLink(k.alici_telefon, mesaj)
    if (!link) { toast.error('Geçersiz telefon numarası.'); return }
    sistemApi.linkAc(link).catch(e => toast.error(e.message))
    // İadede etiket görseli de paylaşılmak isteniyor. WhatsApp bağlantısı görsel EKLEYEMEZ
    // (yalnızca metin); bu yüzden etiketi önizlemede açarız → personel sohbete sürükleyip
    // ekleyebilir. (Otomatik görsel gönderimi WhatsApp Business API ister — ayrı faz.)
    if (k.tip === 'iade') {
      etiketBas(k)
      toast('Etiket önizlemesi açıldı — WhatsApp sohbetine sürükleyip ekleyebilirsiniz.', { icon: '🏷️' })
    }
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

  // Toplu basım için seçilebilir kargolar: görüntülenen (aktif) + takip no'lu.
  const secilebilir = listelenen.filter(k => k.durum !== 'iptal' && k.takip_no)
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
          <button onClick={durumlariYenile} disabled={durumYenileniyor}
            className="border border-teal-600 text-teal-700 px-4 py-2 rounded-lg text-sm hover:bg-teal-50 disabled:opacity-50"
            title="Tüm gönderilerin UPS durumunu (Yolda / Teslim Edildi / Özel Durum) şimdi sorgular. Durumlar zaten 30 dakikada bir otomatik güncellenir.">
            {durumYenileniyor ? '⏳ Sorgulanıyor…' : '♻️ Durumları Yenile'}
          </button>
          <button onClick={() => setHesapAcik(a => !a)}
            className={`px-4 py-2 rounded-lg text-sm border ${hesapAcik ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            title="2026 FLASH tarifesiyle tahmini gönderi ücreti hesapla">💰 Kargo Ücreti Hesapla</button>
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
          <span className="text-xs text-gray-400 pb-2 whitespace-nowrap">{listelenen.length} / {kargolar.length} gönderi</span>
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

      {/* Kargo ücreti hesaplayıcı: il/ilçe + ölçülerden OTOMATİK desi (UxGxY/3000);
          faturalanabilir = desi ile kg'den yüksek olan. 2026-FLASH parça başı tarife
          + yakıt (UPS'ten otomatik) + EHB %2,35 + konut teslimatı + KDV %20. */}
      {hesapAcik && (() => {
        const desi = desiHesapla(hesapOlcu.u, hesapOlcu.g, hesapOlcu.y)   // 1 koli
        const faturalanabilir = Math.max(desi, Number(hesapKg) || 0)      // yüksek olan
        const hazir = faturalanabilir > 0
        const u = ucretHesapla({ desi: faturalanabilir * hesapKoli, koli: hesapKoli, yakitOrani, konut: hesapKonut })
        const bolge = hesapAdres.ilKodu ? IL_BOLGE[Number(hesapAdres.ilKodu)] : null
        const kayitlar = aktifKargolar.filter(k => Number(k.agirlik) > 0)
        const listeToplam = kayitlar.reduce((a, k) => a + ucretHesapla({ desi: k.agirlik, koli: k.koli_adedi || 1, yakitOrani, konut: true }).toplam, 0)
        return (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              {/* Sol: adres */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">📍 Teslimat Adresi</p>
                <IlIlceSecici ilKodu={hesapAdres.ilKodu} ilceKodu={hesapAdres.ilceKodu}
                  onChange={(a) => setHesapAdres(a)} />
                {bolge && (
                  <p className="text-xs text-emerald-800 mt-1.5">
                    🗺️ {hesapAdres.il}: <b>{bolge[0]}</b> · tahmini teslim <b>{bolge[1]}</b>
                    <span className="text-gray-400"> (FLASH tarifesinde bölge fiyatı değiştirmez)</span>
                  </p>
                )}
              </div>
              {/* Sağ: ölçüler → otomatik desi */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">📦 1 Kolinin Ölçüleri (cm) ve Ağırlığı</p>
                {/* Etiketler placeholder'da: kutular il/ilçe seçicileriyle AYNI HİZADA durur. */}
                <div className="flex flex-wrap items-center gap-2">
                  {[['u', 'En'], ['g', 'Boy'], ['y', 'Yükseklik']].map(([k, ad]) => (
                    <input key={k} type="number" min="0" value={hesapOlcu[k]} placeholder={ad} title={`${ad} (cm)`}
                      onChange={e => setHesapOlcu(o => ({ ...o, [k]: e.target.value }))}
                      className="border rounded px-2 py-2 text-sm w-20 bg-white" />
                  ))}
                  <input type="number" min="0" step="0.1" value={hesapKg} onChange={e => setHesapKg(e.target.value)}
                    placeholder="Kg" title="1 kolinin gerçek ağırlığı (kg)"
                    className="border rounded px-2 py-2 text-sm w-20 bg-white" />
                  <input type="number" min="1" value={hesapKoli} onChange={e => setHesapKoli(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="Koli" title="Koli adedi"
                    className="border rounded px-2 py-2 text-sm w-16 bg-white" />
                </div>
                {desi > 0 && (
                  <p className="text-xs text-gray-600 mt-1.5">
                    Desi: <b>{desi.toFixed(1)}</b>{Number(hesapKg) > 0 && <> · Kg: <b>{Number(hesapKg)}</b></>} →
                    faturalanabilir: <b className="text-emerald-800">{Math.ceil(faturalanabilir)} desi/kg</b> × {hesapKoli} koli
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-emerald-200/70">
              <label className="text-xs text-gray-600" title={yakitDonem ? `UPS'ten otomatik alındı: ${yakitDonem}` : "UPS'ten alınamadı — elle girin"}>
                Yakıt % {yakitDonem ? <span className="text-emerald-700">({yakitDonem} · otomatik)</span> : <span className="text-amber-600">(elle)</span>}
                <input type="number" min="0" step="0.1" value={yakitOrani} onChange={e => { setYakitOrani(Number(e.target.value) || 0); setYakitDonem('') }}
                  className="border rounded px-2 py-1.5 text-sm mt-0.5 block w-24 bg-white" />
              </label>
              <label className="text-xs text-gray-600 flex items-center gap-1.5 pb-2">
                <input type="checkbox" checked={hesapKonut} onChange={e => setHesapKonut(e.target.checked)} />
                Konut teslimatı (+{tl(37.75)})
              </label>
              {hazir && (
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold text-emerald-800">≈ {tl(u.toplam)}</p>
                  <p className="text-[11px] text-gray-500">
                    navlun {tl(u.navlun)} + yakıt {tl(u.yakit)} + EHB {tl(u.ehb)}{u.ekler ? ` + konut ${tl(u.ekler)}` : ''} + KDV {tl(u.kdv)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/70 text-xs text-gray-600">
              <span>
                📊 Listedeki {kayitlar.length} aktif gönderi için tahmini:
                <b className="text-emerald-800"> toplam {tl(listeToplam)}</b> ·
                <b className="text-emerald-800"> ortalama {tl(kayitlar.length ? listeToplam / kayitlar.length : 0)}</b>
              </span>
              <span className="text-[11px] text-gray-400">
                Tahminidir; UPS faturası ölçüm ve haftalık yakıt oranına göre değişebilir.
                {!yakitOrani && ' ⚠️ Yakıt oranı yok.'}
              </span>
            </div>
          </div>
        )
      })()}

      {/* Aktif / İptal sekmesi: iptal edilen kargolar ayrı listede. */}
      <div className="flex items-center gap-1 mb-3">
        {[
          { kod: 'aktif', ad: 'Aktif', sayi: aktifKargolar.length },
          { kod: 'iptal', ad: 'İptal Edilenler', sayi: iptalKargolar.length },
        ].map(t => {
          const secili = gorunum === t.kod
          const iptalSekmesi = t.kod === 'iptal'
          return (
            <button key={t.kod} onClick={() => setGorunum(t.kod)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5
                ${secili
                  ? (iptalSekmesi ? 'bg-red-600 text-white' : 'bg-blue-600 text-white')
                  : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
              {t.ad}
              {t.sayi > 0 && (
                <span className={`text-[11px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center
                  ${secili ? 'bg-white/25' : (iptalSekmesi ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}`}>
                  {t.sayi}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={tumuSecili} onChange={tumunuSec}
                  title="Filtreye uyan (iptal olmayan) tüm kargoları seç" disabled={!secilebilir.length} />
              </th>
              <SiraliBaslik k="takip_no" {...sr}>Takip No</SiraliBaslik>
              <SiraliBaslik k="alici_ad" {...sr}>Alıcı</SiraliBaslik>
              <SiraliBaslik k="adres" {...sr}>Adres</SiraliBaslik>
              <SiraliBaslik k="lokasyon_ad" {...sr}>Lokasyon</SiraliBaslik>
              <SiraliBaslik k="durum" {...sr}>Durum</SiraliBaslik>
              <SiraliBaslik k="tarih" {...sr}>Tarih</SiraliBaslik>
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
                  {k.durum === 'iptal'
                    ? <span className={`px-2 py-0.5 rounded-full text-xs ${DURUM_RENK.iptal}`}>İptal</span>
                    : (() => {
                        const d = upsDurumBilgi(k.son_durum_kodu)
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${d.renk}`}
                            title={k.son_durum_tarihi ? `UPS güncelleme: ${String(k.son_durum_tarihi).slice(0, 16)}${k.son_durum ? ' — ' + k.son_durum : ''}` : 'Henüz UPS ağına girmedi'}>
                            {d.etiket}
                          </span>
                        )
                      })()}
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
            {listelenen.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                {yukleniyor ? 'Yükleniyor…'
                  : gorunum === 'iptal' ? 'İptal edilen kargo yok.'
                  : (kargolar.length ? 'Filtreye uyan gönderi yok.' : 'Henüz kargo gönderisi yok.')}
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
