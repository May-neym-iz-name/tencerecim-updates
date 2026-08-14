import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { onlineSiparisApi, ikasApi, lokasyonGondericiApi, lokasyonApi, sistemApi, whatsappLink, barkodApi } from '../api/ipc'
import { KARGO_YAZICI_KEY, yaziciAyarOku, kargoOlcuOku } from '../lib/yaziciAyarlari'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { bekleyenTalepMi, urunBekleniyorMu } from '../utils/talep'
import TalepModal from '../components/TalepModal'
import { takipUrl } from '../lib/kargo'
import { kargoEtiketHtml } from '../lib/kargoEtiket'
import { barkodSvg } from '../lib/barkod'
import logo from '../assets/logo.png'
import KargoFormu from '../components/KargoFormu'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { useSiralama } from '../hooks/useSiralama'
import { useDebounce } from '../hooks/useDebounce'
import SiraliBaslik from '../components/SiraliBaslik'

const PARA = (n, b = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: b || 'TRY' }).format(Number(n) || 0)

const TARIH = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('tr-TR') } catch { return iso }
}

// Order status (OrderStatusEnum) — sipariş yaşam döngüsü. "Hazırlandı/Kargoya hazır/
// Teslim edildi" burada DEĞİL, orderPackageStatus'tadır (bkz. KARGO_ETIKET).
const DURUM_ETIKET = {
  CREATED: 'Oluşturuldu', DRAFT: 'Taslak', CANCELLED: 'İptal', PARTIALLY_CANCELLED: 'Kısmen İptal',
  REFUNDED: 'İade Edildi', PARTIALLY_REFUNDED: 'Kısmen İade',
  REFUND_REQUESTED: 'İade Talebi', REFUND_REJECTED: 'İade Reddedildi',
  WAITING_UPSELL_ACTION: 'Upsell Bekliyor',
}

// OrderPaymentStatusEnum (ikas tam liste): PAID, WAITING, PARTIALLY_PAID, FAILED, OVER_PAID, REFUNDED.
// OVER_PAID = iade sonrası sipariş tutarı düşer, tahsil edilen ödeme aynı kalır → "fazla ödeme".
// (PENDING savunmacı alias.)
const ODEME_ETIKET = {
  PAID: 'Ödendi', WAITING: 'Bekliyor', PENDING: 'Bekliyor', PARTIALLY_PAID: 'Kısmen Ödendi', FAILED: 'Başarısız',
  OVER_PAID: 'Fazla Ödeme', REFUNDED: 'İade Edildi',
}
const odemeRengi = (d) => d === 'PAID' ? 'bg-emerald-100 text-emerald-700'
  : (d === 'REFUNDED' || d === 'FAILED' || d === 'CANCELLED') ? 'bg-red-100 text-red-700'
  : (d === 'OVER_PAID') ? 'bg-purple-100 text-purple-700'
  : 'bg-amber-100 text-amber-700'

// ikas orderPackageStatus (kargo/paket durumu) — "Kargoya Hazır", "Teslim Edildi" buradan gelir.
const KARGO_ETIKET = {
  // ikas terminolojisi: FULFILLED = paket oluşturuldu/kargolandı ("hazırlandı" DEĞİL —
  // eski çeviri olduğundan geri bir aşama gibi okunuyordu, tutarsızlık hissi veriyordu).
  UNFULFILLED: 'Hazırlanmadı', FULFILLED: 'Kargolandı (ikas)', PARTIALLY_FULFILLED: 'Kısmen Kargolandı (ikas)',
  READY_FOR_SHIPMENT: 'Kargoya Hazır', PARTIALLY_READY_FOR_SHIPMENT: 'Kısmen Kargoya Hazır',
  READY_FOR_PICK_UP: 'Teslim Almaya Hazır',
  DELIVERED: 'Teslim Edildi', PARTIALLY_DELIVERED: 'Kısmen Teslim', UNABLE_TO_DELIVER: 'Teslim Edilemedi',
  CANCELLED: 'İptal', PARTIALLY_CANCELLED: 'Kısmen İptal', CANCEL_REQUESTED: 'İptal Talebi', CANCEL_REJECTED: 'İptal Reddedildi',
  REFUNDED: 'İade Edildi', PARTIALLY_REFUNDED: 'Kısmen İade', REFUND_REQUESTED: 'İade Talebi',
  REFUND_REQUEST_ACCEPTED: 'İade Kabul', REFUND_REJECTED: 'İade Reddedildi',
}
const kargoRengi = (d) => (d === 'DELIVERED' || d === 'READY_FOR_PICK_UP') ? 'bg-emerald-100 text-emerald-700'
  : (d === 'READY_FOR_SHIPMENT' || d === 'FULFILLED' || d === 'PARTIALLY_FULFILLED' || d === 'PARTIALLY_READY_FOR_SHIPMENT' || d === 'PARTIALLY_DELIVERED') ? 'bg-blue-100 text-blue-700'
  : (d === 'CANCELLED' || d === 'REFUNDED' || d === 'UNABLE_TO_DELIVER' || d === 'PARTIALLY_CANCELLED') ? 'bg-red-100 text-red-700'
  : 'bg-gray-100 text-gray-600'

// gonderildi_tarihi YALNIZ UPS takip yoklayıcısı basar (koli gerçekten UPS ağına girince —
// ups/takip.js). Doluysa ve ikas gerçek bir ilerleme (Teslim/İptal/İade) bildirmediyse
// "Gönderildi" gösterilir. Eskiden etiket oluşturmak da bu damgayı basıyordu; kaldırıldı.
const GONDERILDI_EZILEBILIR = new Set([
  'UNFULFILLED', 'FULFILLED', 'PARTIALLY_FULFILLED', 'READY_FOR_SHIPMENT', 'PARTIALLY_READY_FOR_SHIPMENT',
])
function kargoGoster(s) {
  const d = s.kargo_durumu
  const gonderildi = !!s.gonderildi_tarihi
  if (gonderildi && (!d || GONDERILDI_EZILEBILIR.has(d)))
    return { etiket: 'Gönderildi', renk: 'bg-teal-100 text-teal-700' }
  if (d) return { etiket: KARGO_ETIKET[d] || d, renk: kargoRengi(d) }
  return null
}

export default function OnlineSiparisler() {
  // Talep onay/kapatma iz kaydı için işlemi yapan kişi (emsal: MalKabul.jsx, Giderler.jsx).
  const { profil } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''
  const [siparisler, setSiparisler] = useState([])
  const [toplam, setToplam] = useState(0)
  const [arama, setArama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [secili, setSecili] = useState(null)
  const [cekiliyor, setCekiliyor] = useState(false)
  const [kargoAcik, setKargoAcik] = useState(false)
  const [kargoBaslangic, setKargoBaslangic] = useState(null)
  const [islemMesgul, setIslemMesgul] = useState('')
  const [adresDuzenle, setAdresDuzenle] = useState(null) // { siparis, shipping }
  const [iadeModal, setIadeModal] = useState(null) // { siparis, kalemler, secimler, refundShipping, bildir }
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [tarihBas, setTarihBas] = useState('')
  const [tarihBit, setTarihBit] = useState('')
  const [odemeFiltre, setOdemeFiltre] = useState('')
  const [durumFiltre, setDurumFiltre] = useState('')
  const [kargoFiltre, setKargoFiltre] = useState('')
  // İptal/iade talebi bildirim butonu: açıkken yalnız bekleyen talepli siparişler.
  // URL'de ?talep=1 ile gelinirse (Ana Ekran kartı / bildirim) otomatik açılır.
  const [aramaParams] = useSearchParams()
  const [talepFiltre, setTalepFiltre] = useState(aramaParams.get('talep') === '1')
  // Yerel talep aşamaları (ikas'a yazılamayan onay/kapatma bilgisi). Sipariş başına
  // sorgu N+1 olurdu → tek seferde alınır.
  const [asamalar, setAsamalar] = useState({})
  const [talepModal, setTalepModal] = useState(null)   // { siparis, detay, yukleniyor, hata }

  const asamalariYukle = useCallback(() => {
    ikasApi.talepAsamalari().then(setAsamalar).catch(() => {})
  }, [])
  useEffect(() => { asamalariYukle() }, [asamalariYukle])

  useEffect(() => { lokasyonApi.listele().then(setLokasyonlar).catch(() => {}) }, [])

  // sessiz=true: arka plan tazelemesi — yükleme göstergesini ve hata toast'ını atlar
  // (kullanıcı bir şey istemedi; her 90 sn'de bir spinner titremesi veya ağ hatası
  // toast'ı yağmuru olmasın).
  // Arama DEBOUNCE'lu: her tuş vuruşunda ayrı IPC + DB sorgusu atılmasın (her sorgu
  // satır başına kargo alt sorgusu koşuyor ve main process senkron bloklanıyor).
  const geciktirilmisArama = useDebounce(arama, 300)

  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setYukleniyor(true)
    try {
      const r = await onlineSiparisApi.listele({ arama: geciktirilmisArama, boyut: 0 })
      setSiparisler(r.siparisler)
      setToplam(r.toplam)
    } catch (e) {
      if (!sessiz) toast.error('Siparişler yüklenemedi: ' + e.message)
    }
    finally { if (!sessiz) setYukleniyor(false) }
  }, [geciktirilmisArama])

  // Tarih + ödeme + durum filtreleri (istemci tarafı).
  // useMemo ŞART: bunlar her render'da (her tuş vuruşunda) binlerce kayıt üzerinde
  // filter + 3 ayrı Set kurulumu yapıyordu → arama kutusu gözle görülür geciktiriyordu.
  const filtreliSiparisler = useMemo(() => siparisler.filter(s => {
    if (tarihBas || tarihBit) {
      const gun = (s.siparis_tarihi || '').slice(0, 10) // YYYY-MM-DD
      if (tarihBas && gun < tarihBas) return false
      if (tarihBit && gun > tarihBit) return false
    }
    if (odemeFiltre && s.odeme_durumu !== odemeFiltre) return false
    if (durumFiltre && s.durum !== durumFiltre) return false
    if (kargoFiltre && s.kargo_durumu !== kargoFiltre) return false
    if (talepFiltre && !bekleyenTalepMi(s, asamalar[s.ikas_siparis_id])) return false
    return true
  }), [siparisler, tarihBas, tarihBit, odemeFiltre, durumFiltre, kargoFiltre, talepFiltre, asamalar])

  // Bildirim butonu sayısı: TÜM yüklü siparişlerden (filtreden bağımsız) — ek sorgu yok.
  const talepSayisi = useMemo(
    () => siparisler.filter(s => bekleyenTalepMi(s, asamalar[s.ikas_siparis_id])).length,
    [siparisler, asamalar])
  // Onaylanmış, ürünü beklenen talepler — bildirim butonunda ayrıca gösterilir.
  const bekleyenUrunSayisi = useMemo(
    () => siparisler.filter(s => bekleyenTalepMi(s, asamalar[s.ikas_siparis_id])
                              && urunBekleniyorMu(asamalar[s.ikas_siparis_id])).length,
    [siparisler, asamalar])

  // Mevcut siparişlerde geçen ödeme/sipariş/kargo durumlarını filtre seçeneği olarak sun.
  const odemeSecenekleri = useMemo(
    () => [...new Set(siparisler.map(s => s.odeme_durumu).filter(Boolean))], [siparisler])
  const durumSecenekleri = useMemo(
    () => [...new Set(siparisler.map(s => s.durum).filter(Boolean))], [siparisler])
  const kargoSecenekleri = useMemo(
    () => [...new Set(siparisler.map(s => s.kargo_durumu).filter(Boolean))], [siparisler])
  const sr = useSiralama(filtreliSiparisler, {
    deger: (s, k) => k === 'teslimat' ? [s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ') : s[k],
  })
  const { dilim: sayfaSiparisler, ...sayfalama } = useSayfalama(sr.sirali, 50)

  useEffect(() => { yukle() }, [yukle])

  // Arka plan ikas çekimi (main.js, 90 sn) bir şey değiştirdiğinde listeyi sessizce tazele.
  // Olmadan: main SQLite'ı günceller ama açık ekran ilk açılıştaki fotoğrafta kalır —
  // durumlar "otomatik güncellenmiyor" şikayetinin sebebi buydu.
  // NOT: `yukle`yi doğrudan dinleyici olarak VERME — olay payload'ı ilk parametreye geçer
  // ve sessiz=payload olur. Açık sarmalayıcı şart.
  useEffect(() => {
    window.api.on('ikas:siparis-degisti', () => yukle(true))
    return () => window.api.removeAllListeners('ikas:siparis-degisti')
  }, [yukle])

  async function detayAc(id) {
    try { setSecili(await onlineSiparisApi.getir(id)) }
    catch (e) { toast.error('Detay açılamadı: ' + e.message) }
  }

  async function kargoOlustur(s) {
    // Teslimat il/ilçe adını UPS koduna çevir (bulunamazsa kullanıcı formdan seçer).
    let ilIlce = { ilKodu: null, il: s.teslimat_il || '', ilceKodu: null, ilce: s.teslimat_ilce || '' }
    try { ilIlce = await lokasyonGondericiApi.ilIlceBul(s.teslimat_il, s.teslimat_ilce) } catch {}
    // Varsayılan gönderici mağaza: kalemlerin düştüğü ilk lokasyon.
    const ilkLok = (s.kalemler || []).find(k => k.lokasyon_id)?.lokasyon_id || null
    setKargoBaslangic({
      aliciAd: s.musteri_ad || '',
      aliciTelefon: s.musteri_telefon || '',
      aliciEmail: s.musteri_email || '',
      aliciAdres: s.teslimat_adres || '',
      ilKodu: ilIlce.ilKodu, il: ilIlce.il, ilceKodu: ilIlce.ilceKodu, ilce: ilIlce.ilce,
      odemeTipi: 2, // gönderici öder (ücretsiz kargo)
      aciklama: `Online sipariş #${s.siparis_no}`,
      referans: s.siparis_no || '',
      musteriId: s.musteri_id || null,
      onlineSiparisId: s.id,
      gondericiLokasyonId: ilkLok,
      // Sipariş kapıda ödemeli ve henüz ödenmemişse tahsilat tutarını önceden doldur.
      ...(/kap[ıi]da/i.test(s.odeme_yontemi || '') && s.odeme_durumu !== 'PAID'
        ? { kapidaOdeme: true, kapidaOdemeTutar: Math.round(Number(s.toplam) || 0), kapidaOdemeTipi: 1 }
        : {}),
    })
    setKargoAcik(true)
  }

  // Kargo etiketi: sipariş verisini derle (ikas'tan zenginleştir) → önizleme penceresi.
  async function kargoEtiketYazdir(id) {
    const bekle = toast.loading('Kargo etiketi hazırlanıyor…')
    try {
      const veri = await onlineSiparisApi.etiketVeri(id)
      let svg = null
      try { if (veri.takip_no) svg = barkodSvg(veri.takip_no) } catch { svg = null }
      let logoData = null
      try {
        const blob = await (await fetch(logo)).blob()
        logoData = await new Promise(r => {
          const fr = new FileReader()
          fr.onload = () => r(fr.result); fr.onerror = () => r(null)
          fr.readAsDataURL(blob)
        })
      } catch { logoData = null }
      // DÜZEN OTOMATİK SEÇİLİR: Ayarlar'da kargo yazıcısı tanımlıysa termal düzen
      // (dikey barkod, Ayarlar'daki ölçüde — 100×135 vb.) üretilip önizlemesiz doğrudan
      // basılır; tanımlı değilse eski A4 düzeni önizleme penceresinde açılır.
      const yazici = yaziciAyarOku(KARGO_YAZICI_KEY)
      if (yazici) {
        const olcu = kargoOlcuOku()
        const html = kargoEtiketHtml({ ...veri, barkodSvg: svg, logo: logoData }, { termal: true, ...olcu })
        await barkodApi.yazdir(html, yazici, { genislikMm: olcu.genislikMm, yukseklikMm: olcu.yukseklikMm })
        toast.success('Etiket yazıcıya gönderildi.', { id: bekle })
      } else {
        const html = kargoEtiketHtml({ ...veri, barkodSvg: svg, logo: logoData })
        await onlineSiparisApi.etiketOnizle(html, `Kargo Etiketi ${veri.siparis_no || ''}`)
        toast.success('Önizleme açıldı.', { id: bekle })
      }
    } catch (e) {
      toast.error('Etiket oluşturulamadı: ' + e.message, { id: bekle })
    }
  }

  // ikas'a "kargolandı" + takip no bildir (siparişin oluşturulmuş kargosundan).
  async function ikasKargola(s) {
    const takip = (s.kargolar || []).find(k => k.durum !== 'iptal' && k.takip_no)?.takip_no || s.kargo_takip_no
    if (!takip) { toast.error('Önce bu sipariş için kargo oluşturun.'); return }
    setIslemMesgul('kargola')
    try {
      // bildir:false — müşteriye "kargoya verildi" bildirimi koli UPS ağına girince
      // otomatik gider (UPS takip yoklayıcısı + ikas köprüsü). Erken bildirim, hiç
      // çıkmamış gönderiler için müşteriyi yanıltıyordu.
      await ikasApi.siparisKargola({ id: s.id, takipNo: takip, kargoFirma: 'UPS', bildir: false })
      toast.success('Takip no ikas siparişine işlendi. "Gönderildi" ve müşteri bildirimi UPS teyidiyle otomatik gelecek.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('ikas bildirimi başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function ikasIptal(s) {
    if (!confirm(`#${s.siparis_no} siparişi ikas'ta iptal edilecek ve stok geri eklenecek. Emin misiniz?`)) return
    setIslemMesgul('iptal')
    try {
      await ikasApi.siparisIptal({ id: s.id, restock: true })
      toast.success('Sipariş iptal edildi.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('İptal başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  // Bekleyen ödemeyi (havale/EFT) ikas'ta onaylar → ödeme durumu "Ödendi" olur.
  async function ikasOdemeOnayla(s) {
    if (!confirm(`#${s.siparis_no} siparişinin ödemesi "Ödendi" olarak işaretlensin mi? (Havale/EFT tahsilatı onaylandığında kullanın.)`)) return
    setIslemMesgul('odeme')
    try {
      const r = await ikasApi.siparisOdemeOnayla({ id: s.id })
      toast.success(r?.zatenOdenmis ? 'Ödeme zaten alınmış olarak güncellendi.' : 'Ödeme alındı olarak işaretlendi.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('Ödeme onayı başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  // Siparişin paketlerini ikas'ta "teslim edildi" işaretler.
  async function ikasTeslim(s) {
    if (!confirm(`#${s.siparis_no} siparişi ikas'ta "Teslim Edildi" olarak işaretlensin mi?`)) return
    setIslemMesgul('teslim')
    try {
      await ikasApi.siparisPaketDurum({ id: s.id, durum: 'DELIVERED' })
      toast.success('Sipariş teslim edildi olarak işaretlendi.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('Teslim işaretleme başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  // Kargolamayı (fulfillment) geri alır — yanlış kargolama düzeltme.
  async function ikasKargoIptal(s) {
    if (!confirm(`#${s.siparis_no} siparişinin kargolama işlemi ikas'ta geri alınacak. Devam edilsin mi?`)) return
    setIslemMesgul('kargo-iptal')
    try {
      await ikasApi.siparisKargoIptal({ id: s.id })
      toast.success('Kargolama geri alındı.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('Kargolama geri alınamadı: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  // İade ekranını açar: ikas_kalem_id + güncel fiyatlar için tazele, taze kalemleri yükle.
  // talepKalemleri: talepten gelindiğinde yalnız talep edilen ikas kalem id'leri (Set).
  // ASIL KORUMA BURASI — personel müşterinin istemediği ürünü iade etmesin diye
  // varsayılan seçim talebe daraltılır (canlı örnek: 2.670 yerine 7.970 TL riski).
  // Verilmezse eski davranış: hepsi tam adet seçili.
  async function iadeAc(s, talepKalemleri = null) {
    setIslemMesgul('iade-hazirla')
    try {
      await ikasApi.siparisTazele(s.id)
      const taze = await onlineSiparisApi.getir(s.id)
      const kalemler = (taze.kalemler || []).filter(k => k.ikas_kalem_id)
      if (!kalemler.length) { toast.error('İade edilebilir kalem bulunamadı (ikas kalem ID yok).'); return }
      const secimler = {}
      kalemler.forEach(k => {
        const talepte = !talepKalemleri || talepKalemleri.has(k.ikas_kalem_id)
        secimler[k.ikas_kalem_id] = talepte ? (Number(k.miktar) || 0) : 0
      })
      setIadeModal({ siparis: taze, kalemler, secimler, refundShipping: false, bildir: true })
    } catch (e) { toast.error('İade ekranı açılamadı: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  // Talep modalını aç: detay ikas'tan gelir. Gelmezse modal AÇILIR ama onay
  // butonları kapalı kalır — neyin iade edileceğini bilmeden onay verilmemeli.
  async function talepAc(s) {
    setTalepModal({ siparis: s, detay: null, yukleniyor: true, hata: null })
    try {
      const detay = await ikasApi.talepDetay({ id: s.id })
      setTalepModal({ siparis: s, detay, yukleniyor: false, hata: null })
    } catch (e) {
      setTalepModal({ siparis: s, detay: null, yukleniyor: false, hata: e.message })
    }
  }

  async function talepOnayla() {
    setIslemMesgul('talep-onay')
    try {
      await ikasApi.talepOnayla({ id: talepModal.siparis.id, kullanici })
      toast.success('Talep onaylandı — ürün bekleniyor')
      asamalariYukle(); setTalepModal(null)
    } catch (e) { toast.error('Onay başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function talepKapatIslemi(not) {
    setIslemMesgul('talep-kapat')
    try {
      await ikasApi.talepKapat({ id: talepModal.siparis.id, not, kullanici })
      toast.success('Talep kapatıldı — ikas panelinden de reddetmeyi unutmayın')
      asamalariYukle(); setTalepModal(null)
    } catch (e) { toast.error('Kapatma başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  // Talepten iade/iptale geçiş: talep edilen kalemler SEÇİLİ gelir — asıl koruma bu.
  async function talepIadeTamamla() {
    const s = talepModal.siparis
    const iptalTalebi = talepModal.detay?.talepli?.some(p => p.durum === 'CANCEL_REQUESTED')
    const talepKalemIdleri = new Set((talepModal.detay?.talepli || []).flatMap(p => p.kalemler.map(k => k.id)))
    setTalepModal(null)
    if (iptalTalebi) { ikasIptal(s); return }
    await iadeAc(s, talepKalemIdleri)
  }

  async function iadeOnayla() {
    const secimler = Object.entries(iadeModal.secimler)
      .map(([ikasKalemId, miktar]) => ({ ikasKalemId, miktar: Number(miktar) || 0 }))
      .filter(x => x.miktar > 0)
    if (!secimler.length) { toast.error('İade için en az bir ürün/adet seçin.'); return }
    setIslemMesgul('iade')
    try {
      const r = await ikasApi.siparisIade({
        id: iadeModal.siparis.id, restock: true,
        refundShipping: iadeModal.refundShipping, bildir: iadeModal.bildir, secimler,
      })
      toast.success(r.tamIade ? 'Tam iade işlendi.' : `Kısmi iade işlendi (${r.iadeKalemSayisi} kalem).`)
      setIadeModal(null)
      if (secili) await detayAc(secili.id)
      await yukle()
    } catch (e) { toast.error('İade başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function adresAc(s) {
    setIslemMesgul('adres')
    try {
      const { shippingAddress } = await ikasApi.siparisAdresGetir(s.id)
      setAdresDuzenle({ siparis: s, shipping: shippingAddress || {} })
    } catch (e) { toast.error('Adres alınamadı: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function adresKaydet() {
    setIslemMesgul('adres-kaydet')
    try {
      await ikasApi.siparisAdres({ id: adresDuzenle.siparis.id, shippingAddress: adresDuzenle.shipping })
      toast.success('Adres güncellendi.')
      setAdresDuzenle(null)
      if (secili) await detayAc(secili.id)
      await yukle()
    } catch (e) { toast.error('Adres güncellenemedi: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function kalemLokasyonDegistir(kalem, lokasyonId) {
    try {
      await onlineSiparisApi.kalemLokasyon(kalem.id, lokasyonId ? Number(lokasyonId) : null)
      toast.success('Çıkış mağazası güncellendi.')
      if (secili) await detayAc(secili.id)
    } catch (e) { toast.error('Mağaza değiştirilemedi: ' + e.message) }
  }

  async function siparisTazele(s) {
    setIslemMesgul('tazele')
    try {
      const r = await ikasApi.siparisTazele(s.id)
      toast.success(`Sipariş tazelendi (${r.kalemSayisi} kalem).`)
      await detayAc(s.id)
    } catch (e) { toast.error('Tazeleme başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  function senkSonucMesaji(r) {
    const p = []
    if (r.kaydedilen) p.push(`${r.kaydedilen} yeni`)
    if (r.guncellenen) p.push(`${r.guncellenen} durum güncellendi`)
    if (r.stokDusulen) p.push(`${r.stokDusulen} stoktan düşüldü`)
    return p.length ? p.join(', ') : 'değişiklik yok'
  }

  async function siparisCek() {
    setCekiliyor(true)
    try {
      const r = await ikasApi.siparisCek()
      if (r.ilkKurulum) toast.success(`İlk senkron: ${r.kaydedilen} sipariş kaydedildi (stok düşülmedi).`)
      else toast.success(`Senkron tamam: ${senkSonucMesaji(r)}.`)
      await yukle()
    } catch (e) { toast.error('Sipariş çekme hatası: ' + e.message) }
    finally { setCekiliyor(false) }
  }

  // Tüm sipariş geçmişini yeniden çeker → mevcut siparişlerin durum/ödeme/kargo
  // bilgisini ikas'taki güncel haliyle geri doldurur (stok düşülmez, güvenli).
  async function durumlariYenile() {
    if (!confirm('Tüm siparişlerin durumu (kargoya hazır / teslim edildi vb.) ikas\'tan yeniden çekilecek. Bu işlem biraz sürebilir, stok düşülmez. Devam edilsin mi?')) return
    setCekiliyor(true)
    try {
      const r = await ikasApi.siparisGecmisCek()
      toast.success(`Durumlar yenilendi: ${senkSonucMesaji(r)}.`)
      await yukle()
    } catch (e) { toast.error('Durum yenileme hatası: ' + e.message) }
    finally { setCekiliyor(false) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Online Siparişler</h2>
          <p className="text-sm text-gray-500">Web sitesinden (ikas) gelen siparişler — toplam {toplam}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={durumlariYenile} disabled={cekiliyor}
            className="border border-amber-600 text-amber-700 px-4 py-2 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50"
            title="Tüm siparişlerin durum/ödeme/kargo bilgisini ikas'tan yeniden çeker (stok düşülmez).">
            ♻️ Durumları Yenile
          </button>
          <button onClick={siparisCek} disabled={cekiliyor}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50"
            title="İlk çekimde tüm sipariş geçmişini getirir, sonraki çekimlerde yalnızca yeni/güncellenen siparişleri.">
            {cekiliyor ? 'Çekiliyor…' : '🔄 Siparişleri Çek'}
          </button>
        </div>
      </div>

      {/* İptal/iade talebi bildirimi: YALNIZ talep varsa görünür — varlığı tek başına
          uyarıdır. Sürekli duran bir buton gürültüye döner ve fark edilmez. */}
      {talepSayisi > 0 && (
        <button
          onClick={() => setTalepFiltre(v => !v)}
          className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 mb-4 text-left transition-colors ${
            talepFiltre
              ? 'bg-red-600 border-red-700 text-white'
              : 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100 animate-pulse'
          }`}
        >
          <span className="text-xl">🔔</span>
          <span className="flex-1">
            <span className="font-bold">
              {talepSayisi} İptal/İade Talebi
              {bekleyenUrunSayisi > 0 && ` · ${bekleyenUrunSayisi} ürün bekleniyor`}
            </span>
            <span className={`block text-xs ${talepFiltre ? 'text-red-100' : 'text-red-600'}`}>
              {talepFiltre ? 'Yalnız talepler gösteriliyor — tümünü görmek için tıklayın' : 'Görüntülemek için tıklayın'}
            </span>
          </span>
        </button>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Sipariş no, müşteri adı veya telefon ara…"
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-md" />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">Başlangıç
            <input type="date" value={tarihBas} onChange={e => setTarihBas(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">Bitiş
            <input type="date" value={tarihBit} onChange={e => setTarihBit(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">Ödeme Durumu
            <select value={odemeFiltre} onChange={e => setOdemeFiltre(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white">
              <option value="">Tümü</option>
              {odemeSecenekleri.map(d => (
                <option key={d} value={d}>{ODEME_ETIKET[d] || d}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">Sipariş Durumu
            <select value={durumFiltre} onChange={e => setDurumFiltre(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white">
              <option value="">Tümü</option>
              {durumSecenekleri.map(d => (
                <option key={d} value={d}>{DURUM_ETIKET[d] || d}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">Kargo Durumu
            <select value={kargoFiltre} onChange={e => setKargoFiltre(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white">
              <option value="">Tümü</option>
              {kargoSecenekleri.map(d => (
                <option key={d} value={d}>{KARGO_ETIKET[d] || d}</option>
              ))}
            </select>
          </label>
          {(tarihBas || tarihBit || odemeFiltre || durumFiltre || kargoFiltre || talepFiltre) && (
            <button onClick={() => { setTarihBas(''); setTarihBit(''); setOdemeFiltre(''); setDurumFiltre(''); setKargoFiltre(''); setTalepFiltre(false) }}
              className="text-xs text-gray-500 border rounded-lg px-2 py-1.5 hover:bg-gray-50">Temizle</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <SiraliBaslik k="siparis_no" {...sr}>Sipariş No</SiraliBaslik>
              <SiraliBaslik k="siparis_tarihi" {...sr}>Tarih</SiraliBaslik>
              <SiraliBaslik k="musteri_ad" {...sr}>Müşteri</SiraliBaslik>
              <SiraliBaslik k="teslimat" {...sr}>Teslimat</SiraliBaslik>
              <SiraliBaslik k="odeme_durumu" {...sr}>Ödeme</SiraliBaslik>
              <SiraliBaslik k="durum" {...sr}>Durum</SiraliBaslik>
              <SiraliBaslik k="toplam" align="right" {...sr}>Tutar</SiraliBaslik>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {yukleniyor ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Yükleniyor…</td></tr>
            ) : filtreliSiparisler.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                {siparisler.length === 0 ? 'Henüz sipariş yok. "Siparişleri Çek" ile ikas\'tan getirin.' : 'Filtreyle eşleşen sipariş yok.'}
              </td></tr>
            ) : sayfaSiparisler.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{s.siparis_no}</td>
                <td className="px-4 py-2.5 text-gray-600">{TARIH(s.siparis_tarihi)}</td>
                <td className="px-4 py-2.5">
                  <div>{s.musteri_ad || '—'}</div>
                  <div className="text-xs text-gray-400">{s.musteri_telefon}</div>
                </td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{[s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-4 py-2.5">
                  {s.durum === 'CANCELLED'
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">İptal</span>
                    : <span className={`text-xs px-2 py-0.5 rounded-full ${odemeRengi(s.odeme_durumu)}`}>{ODEME_ETIKET[s.odeme_durumu] || s.odeme_durumu || '—'}</span>}
                  {s.odeme_yontemi && <span className="block text-[10px] text-gray-400 mt-0.5">{s.odeme_yontemi}</span>}
                </td>
                <td className="px-4 py-2.5">
                  {(() => { const g = kargoGoster(s); return g
                    ? <span className={`text-xs px-2 py-0.5 rounded-full ${g.renk}`}>{g.etiket}</span>
                    : <span className={`text-xs px-2 py-0.5 rounded-full ${s.durum === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{DURUM_ETIKET[s.durum] || s.durum}</span> })()}
                  {/* Onaylanmış talep: ürünün gelmesi bekleniyor. İkas'ta karşılığı yok,
                      bu bilgi yalnız yerel talep_durumlari'ndan gelir. */}
                  {urunBekleniyorMu(asamalar[s.ikas_siparis_id]) && (
                    <span className="block mt-0.5 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 w-fit">
                      Ürün Bekleniyor
                    </span>
                  )}
                  {!s.stok_dusuldu && <span className="block text-[10px] text-gray-400 mt-0.5">stok düşülmedi</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{PARA(s.toplam, s.para_birimi)}</td>
                <td className="px-4 py-2.5 text-right">
                  {s.kargo_takip_no && <span className="block text-[10px] text-emerald-600 mb-0.5" title="Kargo takip no">📦 {s.kargo_takip_no}</span>}
                  <button onClick={() => detayAc(s.id)} className="text-blue-600 hover:underline text-xs">Detay</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      {secili && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSecili(null)}>
          <div className="bg-gray-50 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Başlık */}
            <div className="flex items-start justify-between px-6 py-4 bg-white border-b">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-800">Sipariş #{secili.siparis_no}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${secili.durum === 'CANCELLED' ? 'bg-red-100 text-red-700' : secili.durum === 'REFUNDED' ? 'bg-purple-100 text-purple-700' : secili.durum === 'FULFILLED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {DURUM_ETIKET[secili.durum] || secili.durum}
                  </span>
                  {secili.durum !== 'CANCELLED' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${odemeRengi(secili.odeme_durumu)}`}>
                      {ODEME_ETIKET[secili.odeme_durumu] || secili.odeme_durumu || '—'}
                    </span>
                  )}
                  {(() => { const g = kargoGoster(secili); return g && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${g.renk}`}>{g.etiket}</span>
                  ) })()}
                </div>
                <p className="text-xs text-gray-400 mt-1">{TARIH(secili.siparis_tarihi)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => kargoEtiketYazdir(secili.id)}
                  className="bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-slate-800 whitespace-nowrap">
                  🖨 Kargo Etiketi
                </button>
                <button onClick={() => setSecili(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
              </div>
            </div>

            {/* Kaydırılabilir gövde */}
            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">

              {/* Bilgi kartları */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Müşteri</p>
                  <p className="text-sm font-medium text-gray-800">{secili.musteri_ad || '—'}</p>
                  {secili.musteri_telefon && <p className="text-xs text-gray-500">{secili.musteri_telefon}</p>}
                  {secili.musteri_email && <p className="text-xs text-gray-500 break-all">{secili.musteri_email}</p>}
                </div>
                <div className="bg-white rounded-xl border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Teslimat</p>
                  <p className="text-sm text-gray-700">{secili.teslimat_adres || '—'}</p>
                  <p className="text-xs text-gray-500">{[secili.teslimat_ilce, secili.teslimat_il].filter(Boolean).join(' / ')}</p>
                </div>
                <div className="bg-white rounded-xl border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Ödeme</p>
                  <p className="text-sm text-gray-700">{ODEME_ETIKET[secili.odeme_durumu] || secili.odeme_durumu || '—'}</p>
                  {secili.odeme_yontemi && <p className="text-xs text-gray-500">{secili.odeme_yontemi}</p>}
                </div>
                {(secili.fatura_unvan || secili.fatura_vergi_no || secili.fatura_tc) && (
                  <div className="bg-white rounded-xl border p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Fatura</p>
                    {secili.fatura_unvan && <p className="text-sm text-gray-700">{secili.fatura_unvan}</p>}
                    {secili.fatura_vergi_no && <p className="text-xs text-gray-500">VN: {secili.fatura_vergi_no} {secili.fatura_vergi_dairesi && `· ${secili.fatura_vergi_dairesi}`}</p>}
                    {secili.fatura_tc && <p className="text-xs text-gray-500">TC: {secili.fatura_tc}</p>}
                  </div>
                )}
              </div>

              {/* Ürünler */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left text-xs">
                    <tr>
                      <th className="px-3 py-2 font-medium">Ürün</th>
                      <th className="px-3 py-2 font-medium text-center w-14">Adet</th>
                      <th className="px-3 py-2 font-medium w-40">Çıkış Mağazası</th>
                      <th className="px-3 py-2 font-medium text-right w-24">Birim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(secili.kalemler || []).map(k => (
                      <tr key={k.id} className="border-t">
                        <td className="px-3 py-2">
                          {k.urun_adi}
                          {!k.urun_id && <span className="block text-[10px] text-amber-600">⚠ yerel ürün eşleşmedi</span>}
                        </td>
                        <td className="px-3 py-2 text-center">{k.miktar}</td>
                        <td className="px-3 py-2">
                          <select
                            value={k.lokasyon_id || ''}
                            onChange={e => kalemLokasyonDegistir(k, e.target.value)}
                            className={`border rounded-lg px-2 py-1 text-xs w-full bg-white ${k.lokasyon_id ? 'text-gray-700' : 'text-amber-600 border-amber-300'}`}>
                            <option value="">— Seçilmedi —</option>
                            {lokasyonlar.map(l => (
                              <option key={l.id} value={l.id}>{l.ad}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{PARA(k.birim_fiyat, secili.para_birimi)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-600">Toplam</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">{PARA(secili.toplam, secili.para_birimi)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ikas kargo takip (ikas tarafında girilmiş takip no) */}
              {secili.kargo_takip_no && (
                <div className="bg-white rounded-xl border p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">ikas Kargo Takip</p>
                  <span className="text-gray-700 font-medium">{secili.kargo_firma ? `${secili.kargo_firma}: ` : ''}{secili.kargo_takip_no}</span>
                  {takipUrl({ takipNo: secili.kargo_takip_no, link: secili.kargo_takip_link, firma: secili.kargo_firma }) && (
                    <a href={takipUrl({ takipNo: secili.kargo_takip_no, link: secili.kargo_takip_link, firma: secili.kargo_firma })}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs ml-2">takip et ↗</a>
                  )}
                  {secili.musteri_telefon && (
                    <button onClick={() => {
                      const mesaj = `Merhaba, ${secili.siparis_no} numaralı siparişiniz kargoya verildi. ` +
                        `${secili.kargo_firma || 'Kargo'} takip no: ${secili.kargo_takip_no}` +
                        (secili.kargo_takip_link ? `\nTakip: ${secili.kargo_takip_link}` : '')
                      const link = whatsappLink(secili.musteri_telefon, mesaj)
                      if (link) sistemApi.linkAc(link).catch(e => toast.error(e.message))
                    }}
                      className="ml-3 text-green-700 hover:underline text-xs font-medium">💬 WhatsApp ile gönder</button>
                  )}
                </div>
              )}

              {/* Kargo */}
              <div className="bg-white rounded-xl border p-3 flex items-center justify-between">
                <div className="text-sm">
                  {(secili.kargolar || []).filter(k => k.durum !== 'iptal').length > 0 ? (
                    <span className="text-emerald-700 font-medium">
                      📦 Kargo: {secili.kargolar.filter(k => k.durum !== 'iptal').map(k => k.takip_no).join(', ')}
                    </span>
                  ) : (
                    <span className="text-gray-400">Henüz kargo oluşturulmadı</span>
                  )}
                </div>
                <button onClick={() => kargoOlustur(secili)}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap">
                  📦 Kargo Oluştur
                </button>
              </div>
            </div>

            {/* Alt eylem çubuğu */}
            <div className="px-6 py-3 bg-white border-t">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2">ikas Sipariş İşlemleri</p>
              <div className="space-y-2">
                {/* Üst satır: normal işlemler */}
                <div className="flex flex-wrap gap-2">
                <button onClick={() => siparisTazele(secili)} disabled={!!islemMesgul}
                  className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-slate-700 disabled:opacity-50"
                  title="Durum ve kalem bilgilerini ikas'tan yeniden çeker (iptal/iade için kalem ID'lerini doldurur)">
                  {islemMesgul === 'tazele' ? '…' : '🔁 Tazele'}
                </button>
                {!['PAID', 'OVER_PAID', 'REFUNDED'].includes(secili.odeme_durumu) && (
                  <button onClick={() => ikasOdemeOnayla(secili)} disabled={!!islemMesgul}
                    className="bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-cyan-700 disabled:opacity-50"
                    title="Bekleyen ödemeyi (havale/EFT) ikas'ta 'Ödendi' olarak onaylar">
                    {islemMesgul === 'odeme' ? '…' : '💰 Ödeme Alındı'}
                  </button>
                )}
                <button onClick={() => ikasKargola(secili)} disabled={!!islemMesgul}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50">
                  🚚 Kargolandı Bildir
                </button>
                <button onClick={() => ikasTeslim(secili)} disabled={!!islemMesgul}
                  className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-800 disabled:opacity-50"
                  title="Siparişin ikas paketlerini 'Teslim Edildi' olarak işaretler">
                  {islemMesgul === 'teslim' ? '…' : '✅ Teslim Edildi'}
                </button>
                <button onClick={() => ikasKargoIptal(secili)} disabled={!!islemMesgul}
                  className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-700 disabled:opacity-50"
                  title="Yanlış kargolamayı ikas'ta geri alır (fulfillment iptali)">
                  {islemMesgul === 'kargo-iptal' ? '…' : '↺ Kargoyu Geri Al'}
                </button>
                <button onClick={() => adresAc(secili)} disabled={!!islemMesgul}
                  className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50">
                  ✏️ Adres Düzenle
                </button>
                </div>
                {/* Talep varsa giriş noktası: hangi ürünlerin talep edildiğini gösterip
                    onay/kapatma sunar. Geri alınamaz butonların ÜSTÜNDE — doğru yol bu. */}
                {bekleyenTalepMi(secili, asamalar[secili.ikas_siparis_id]) && (
                  <div className="pt-2">
                    <button onClick={() => talepAc(secili)} disabled={!!islemMesgul}
                      className="w-full bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                      {urunBekleniyorMu(asamalar[secili.ikas_siparis_id])
                        ? '📦 Talep — ürün bekleniyor, incele'
                        : '🔎 Talebi İncele'}
                    </button>
                  </div>
                )}
                {/* Alt satır: geri alınamaz işlemler — üstten ayraçla ayrı */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 self-center mr-1">Geri alınamaz:</span>
                <button onClick={() => ikasIptal(secili)} disabled={!!islemMesgul}
                  className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-orange-700 disabled:opacity-50">
                  ✖ İptal Et
                </button>
                <button onClick={() => iadeAc(secili)} disabled={!!islemMesgul}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700 disabled:opacity-50">
                  {islemMesgul === 'iade-hazirla' ? '…' : '↩ İade Et'}
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {adresDuzenle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setAdresDuzenle(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Teslimat Adresi Düzenle</h3>
            <p className="text-xs text-gray-400 mb-3">İl/ilçe ikas'taki haliyle korunur ({adresDuzenle.shipping.city?.name} / {adresDuzenle.shipping.district?.name}). Metin alanlarını düzenleyebilirsiniz.</p>
            {['firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2', 'postalCode'].map(alan => (
              <input key={alan} value={adresDuzenle.shipping[alan] || ''}
                onChange={e => setAdresDuzenle(a => ({ ...a, shipping: { ...a.shipping, [alan]: e.target.value } }))}
                placeholder={{ firstName: 'Ad', lastName: 'Soyad', phone: 'Telefon', addressLine1: 'Adres', addressLine2: 'Adres 2', postalCode: 'Posta Kodu' }[alan]}
                className="border rounded px-2 py-1.5 text-sm w-full mb-2" />
            ))}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setAdresDuzenle(null)} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">İptal</button>
              <button onClick={adresKaydet} disabled={islemMesgul === 'adres-kaydet'}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {islemMesgul === 'adres-kaydet' ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {talepModal && (
        <TalepModal
          siparis={talepModal.siparis} detay={talepModal.detay}
          yukleniyor={talepModal.yukleniyor} hata={talepModal.hata} mesgul={islemMesgul}
          onKapat={() => setTalepModal(null)}
          onOnayla={talepOnayla}
          onIadeTamamla={talepIadeTamamla}
          onTalepKapat={talepKapatIslemi}
        />
      )}

      {iadeModal && (() => {
        const pb = iadeModal.siparis.para_birimi
        const iadeToplam = iadeModal.kalemler.reduce(
          (t, k) => t + (Number(k.birim_fiyat) || 0) * (Number(iadeModal.secimler[k.ikas_kalem_id]) || 0), 0)
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            onClick={() => islemMesgul !== 'iade' && setIadeModal(null)}>
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b">
                <h3 className="text-lg font-bold text-gray-800">İade — Sipariş #{iadeModal.siparis.siparis_no}</h3>
                <p className="text-xs text-gray-400 mt-0.5">İade edilecek ürünleri ve adetleri seçin. Hepsi tam adet seçiliyse tam iade yapılır; aksi halde kısmi iade.</p>
              </div>
              <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
                {iadeModal.kalemler.map(k => {
                  const max = Number(k.miktar) || 0
                  const sec = Number(iadeModal.secimler[k.ikas_kalem_id]) || 0
                  return (
                    <div key={k.ikas_kalem_id} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 truncate">{k.urun_adi}</div>
                        <div className="text-xs text-gray-400">{PARA(k.birim_fiyat, pb)} × {max} adet</div>
                      </div>
                      <input type="number" min={0} max={max} value={sec}
                        onChange={e => {
                          const v = Math.max(0, Math.min(max, Number(e.target.value) || 0))
                          setIadeModal(m => ({ ...m, secimler: { ...m.secimler, [k.ikas_kalem_id]: v } }))
                        }}
                        className="w-16 border rounded-lg px-2 py-1 text-sm text-center" />
                      <div className="w-24 text-right text-sm font-medium">{PARA((Number(k.birim_fiyat) || 0) * sec, pb)}</div>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Toplam iade tutarı</span>
                  <span className="font-bold text-lg text-red-600">{PARA(iadeToplam, pb)}</span>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={iadeModal.refundShipping}
                    onChange={e => setIadeModal(m => ({ ...m, refundShipping: e.target.checked }))} />
                  Kargo ücretini de iade et
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={iadeModal.bildir}
                    onChange={e => setIadeModal(m => ({ ...m, bildir: e.target.checked }))} />
                  Müşteriye bildirim gönder
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setIadeModal(null)} disabled={islemMesgul === 'iade'}
                    className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-50">Vazgeç</button>
                  <button onClick={iadeOnayla} disabled={islemMesgul === 'iade' || iadeToplam <= 0}
                    className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                    {islemMesgul === 'iade' ? 'İade ediliyor…' : '↩ İade Et'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <KargoFormu acik={kargoAcik} baslangic={kargoBaslangic}
        kapat={() => setKargoAcik(false)}
        onTamam={async (kargo) => {
          setKargoAcik(false)
          // Online sipariş kargosuysa takip no'yu ikas'a işle (bildirimsiz). "Gönderildi"
          // durumu ve müşteri bildirimi, koli UPS ağına girince yoklayıcıdan otomatik gelir.
          const sipId = kargoBaslangic?.onlineSiparisId
          if (sipId && kargo?.takip_no) {
            try {
              await ikasApi.siparisKargola({ id: sipId, takipNo: kargo.takip_no, kargoFirma: 'UPS', bildir: false })
              toast.success('Takip no ikas siparişine işlendi. "Gönderildi" UPS teyidiyle otomatik güncellenecek.')
            } catch (e) { toast.error('ikas bildirimi yapılamadı (kargo yine de oluştu): ' + e.message) }
          }
          if (secili) await detayAc(secili.id)
          await yukle()
        }} />
    </div>
  )
}
