import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { urunlerApi, satisApi, musteriApi, lokasyonApi, markaApi, setApi, fisApi, kasaApi } from '../api/ipc'
import { telefonHatasi, tcHatasi, vergiHatasi } from '../lib/girdiMaske'
import { useAyarlar } from '../ayarlar/AyarlarContext'
import { useAuth } from '../auth/AuthContext'
import { usePersistentState } from '../hooks/usePersistentState'
import KargoFormu from '../components/KargoFormu'
import MusteriFormAlanlari from '../components/MusteriFormAlanlari'
import { senkTetikle } from '../lib/veriSenk'

const MUSTERI_BOSH = {
  ad: '', soyad: '', telefon: '', email: '', tc_kimlik: '', vergi_no: '',
  vergi_dairesi: '', unvan: '', adres: '', il: '', ilce: '', iskonto_orani: '',
}

// Elle girilen fiyatı sayıya çevirir; geçersiz/boş/negatif ise null döner
// (o zaman ürünün kayıtlı fiyatı geçerlidir). Ekran hesabı (efektifFiyat) ve
// satış payload'ı AYNI bu fonksiyondan geçer — ikisi ayrışırsa kullanıcı
// gördüğünden farklı bir tutarı kaydeder ve bunu fark etmez.
function elleFiyatSayi(k) {
  const n = Number(String(k.elleFiyat ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Set kartı — hem "Setlerimiz" tam listesinde hem arama sonuçlarında AYNI görünüm ve
// tıklama davranışı kullanılsın diye tekilleştirildi (kopyala-yapıştır yerine).
function SetKart({ s, sepetKalem, onClick }) {
  return (
    <button onClick={onClick} title={s.bilesenler.map(b => b.ad).join(', ')}
      className={`relative text-left rounded-xl border p-2.5 transition-all hover:shadow-md active:scale-95 flex flex-col ${sepetKalem ? 'border-purple-400 bg-purple-50 shadow-sm' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
      {sepetKalem && (
        <span className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold z-10">
          {sepetKalem.miktar}
        </span>
      )}
      <div className="text-xs text-purple-500 mb-1">🎁 Set · {s.bilesenler.length} ürün</div>
      <div className="text-xs font-medium text-gray-800 leading-snug mb-2 flex-1"
        style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '3.6em' }}>
        {s.ad}
      </div>
      <div className="text-sm font-bold text-purple-700 mt-auto">₺{Number(s.fiyat).toFixed(2)}</div>
      <div className="text-xs text-gray-400">Set fiyatı</div>
    </button>
  )
}

export default function Satis() {
  // Ürün browser — hiyerarşik gezinme: Markalar → Kategoriler → Ürünler (hepsi kart).
  const [urunler, setUrunler] = useState([])
  const [urunArama, setUrunArama] = useState('')
  const [secilenKategori, setSecilenKategori] = useState('') // ''=seçilmedi | 'tumu' | 'yok' | kategori id
  const [secilenMarka, setSecilenMarka] = useState('')       // ''=marka kartları görünümü
  const [markalar, setMarkalar] = useState([])
  const [setler, setSetler] = useState([]) // kendi setlerimiz (tek set fiyatlı paketler)
  const [urunYukleniyor, setUrunYukleniyor] = useState(false)

  // Lokasyon (seçim kalıcı — sekme değişince kaybolmasın)
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [secilenLokasyonId, setSecilenLokasyonId] = usePersistentState('satis_lokasyon', null)

  // Barkod
  const [barkodInput, setBarkodInput] = useState('')
  const barkodRef = useRef()

  // Müşteri (seçili müşteri kalıcı)
  const [musteriArama, setMusteriArama] = useState('')
  const [musteriSonuclari, setMusteriSonuclari] = useState([])
  const [secilenMusteri, setSecilenMusteri] = usePersistentState('satis_musteri', null)
  const [musteriFormAcik, setMusteriFormAcik] = useState(false)
  const [musteriForm, setMusteriForm] = useState(MUSTERI_BOSH)
  const [musteriKayitYukleniyor, setMusteriKayitYukleniyor] = useState(false)

  // Sepet (kalıcı — başka sekmeye geçip dönünce kaybolmasın)
  const [sepet, setSepet] = usePersistentState('satis_sepet', [])
  const [manuelIskonto, setManuelIskonto] = usePersistentState('satis_iskonto', 0) // değeri ayar tipine göre % veya ₺
  const [odemeTipi, setOdemeTipi] = usePersistentState('satis_odeme_tipi', 'nakit')
  const [islemde, setIslemde] = useState(false)

  // Kargo (satış sonrası UPS gönderisi)
  const { yetkiVar, erisilebilirLokasyonlar, lokasyonErisim } = useAuth()
  const navigate = useNavigate()
  const kargoYetkisi = yetkiVar('kargo_yonet')
  const [kargoFormAcik, setKargoFormAcik] = useState(false)
  const [sonSatis, setSonSatis] = useState(null) // { satisId, fisNo, musteri }

  // Ön sipariş: stokta olmayan ürün için peşin ödemeli satış. Stok düşülmez.
  // KALICI DEĞİL — her satıştan sonra sıfırlanır ki yanlışlıkla açık kalmasın.
  const [onSiparis, setOnSiparis] = useState(false)
  const [onSiparisNot, setOnSiparisNot] = useState('')
  const onSiparisYetkisi = yetkiVar('on_siparis_yap')

  // Uygulama ayarları (müşteri zorunlu mu, indirim tipi)
  const { ayarlar, kaydet: ayarKaydet } = useAyarlar()
  const iskontoTipi = ayarlar.iskonto_tipi || 'oran'
  const musteriZorunlu = !!ayarlar.musteri_zorunlu
  // Ödeme tipine göre yüzdesel fiyat farkı (Ayarlar > Satış'tan girilir).
  const odemeOran = Number(ayarlar[`odeme_oran_${odemeTipi}`]) || 0

  // Kasa zorunluluğu: nakit satış için seçili mağazada açık kasa (vardiya) olmalı.
  const kasaZorunlu = !!ayarlar.kasa_zorunlu_nakit
  const [kasaAcik, setKasaAcik] = useState(null) // null=bilinmiyor, true/false
  const kasaKontrol = useCallback(async (lid) => {
    if (!lid) { setKasaAcik(null); return }
    try { setKasaAcik(!!(await kasaApi.acik(lid))) } catch { setKasaAcik(null) }
  }, [])
  // Mağaza ya da ödeme tipi değişince kasa durumunu tazele (nakit + zorunlu iken).
  useEffect(() => {
    if (kasaZorunlu && secilenLokasyonId) kasaKontrol(secilenLokasyonId)
  }, [kasaZorunlu, secilenLokasyonId, odemeTipi, kasaKontrol])
  const kasaNakitEngel = kasaZorunlu && odemeTipi === 'nakit' && kasaAcik === false

  // Parçalı (karma) ödeme modalı.
  const [parcaliAcik, setParcaliAcik] = useState(false)
  const [parcali, setParcali] = useState({ nakit: '', kart: '', havale: '' })

  // Başlangıç yüklemesi
  useEffect(() => {
    lokasyonApi.listele().then(lok => {
      // Yalnızca kullanıcının erişebildiği lokasyonları göster (izinli_lokasyonlar).
      const erisilebilir = erisilebilirLokasyonlar(lok)
      setLokasyonlar(erisilebilir)
      // Kalıcı seçim hâlâ geçerliyse koru; değilse ilk erişilebilir lokasyona düş.
      if (erisilebilir.length) {
        setSecilenLokasyonId(prev => (prev && erisilebilir.some(l => l.id === prev)) ? prev : erisilebilir[0].id)
      }
    })
    markaApi.listele().then(setMarkalar)
    // erisilebilirLokasyonlar bağımlılıkta OLMALI: profil asenkron geliyor, boş [] ile
    // yalnız mount'ta çalışsaydı ilk hesap eski/boş profille yapılır ve kullanıcı yetkili
    // olduğu lokasyonu göremezdi. (AuthContext'te useCallback ile stabil hâle getirildi,
    // bu yüzden yalnız profil değiştiğinde yeniden çalışır.)
  }, [erisilebilirLokasyonlar])

  // Ürün listesini yükle. Arama modunda tüm ürünlerde arar; gezinmede seçili
  // markanın ürünleri gelir (kategori kartları da bu listeden türetilir).
  // Setler AYNI arama terimiyle, aynı debounce içinde yüklenir (ikinci zamanlayıcı yok) —
  // aramaya bir karakter yazılınca setler de yeniden filtrelenip görünsün.
  const urunleriYukle = useCallback(async () => {
    setApi.listele({ arama: urunArama || undefined }).then(setSetler).catch(() => {})
    if (!urunArama.trim() && (!secilenMarka || secilenMarka === '__setler__')) { setUrunler([]); return } // marka/set kartları görünümü
    setUrunYukleniyor(true)
    try {
      const r = await urunlerApi.listele({
        arama: urunArama || undefined,
        marka_id: (!urunArama.trim() && secilenMarka) || undefined,
        // 'tumu'/'yok' özel değerleri backend'e gitmez (yok filtresi aşağıda client-side)
        kategori_id: /^\d+$/.test(secilenKategori) ? secilenKategori : undefined,
        boyut: 0, // sınırsız — tüm ürünler listelensin
      })
      setUrunler(r.urunler)
    } catch {}
    setUrunYukleniyor(false)
  }, [urunArama, secilenMarka, secilenKategori])

  useEffect(() => {
    const t = setTimeout(urunleriYukle, 200)
    return () => clearTimeout(t)
  }, [urunleriYukle])

  // Müşteri arama
  const musteriAraFn = useCallback(async (deger) => {
    setMusteriArama(deger)
    if (secilenMusteri) return
    if (deger.length >= 2) {
      try { const r = await musteriApi.listele({ arama: deger, boyut: 6 }); setMusteriSonuclari(r.musteriler) }
      catch {}
    } else { setMusteriSonuclari([]) }
  }, [secilenMusteri])

  // Barkod
  async function barkodSorgu(e) {
    e.preventDefault()
    if (!barkodInput.trim()) return
    try {
      const urun = await urunlerApi.barkodla(barkodInput.trim())
      if (urun) sepeteEkle(urun)
      else toast.error('Barkod bulunamadı')
    } catch { toast.error('Ürün bulunamadı') }
    setBarkodInput('')
  }

  function sepeteEkle(urun) {
    setSepet(prev => {
      const mevcut = prev.find(k => k.urun_id === urun.id)
      if (mevcut) return prev.map(k => k.urun_id === urun.id ? { ...k, miktar: k.miktar + 1 } : k)
      return [...prev, { urun_id: urun.id, ad: urun.ad, satis_fiyati: urun.satis_fiyati, kdv_orani: urun.kdv_orani, miktar: 1, kalem_iskonto: 0 }]
    })
    toast.success(`${urun.ad.substring(0, 30)} eklendi`, { duration: 900, position: 'bottom-right' })
  }

  // Set sepete eklenir: TEK kalem, SET fiyatı. urun_id 'set:ID' (ürünlerle çakışmaz);
  // satışta bileşenlere açılır (stok bileşenlerden düşer, fişte set fiyatı görünür).
  function setSepeteEkle(s) {
    if (!s.bilesenler?.length) { toast.error('Bu setin içeriği boş.'); return }
    const key = 'set:' + s.id
    setSepet(prev => {
      const mevcut = prev.find(k => k.urun_id === key)
      if (mevcut) return prev.map(k => k.urun_id === key ? { ...k, miktar: k.miktar + 1 } : k)
      return [...prev, {
        urun_id: key, tip: 'set', set_id: s.id, ad: '🎁 ' + s.ad,
        satis_fiyati: Number(s.fiyat), kdv_orani: s.bilesenler[0]?.kdv_orani ?? 20,
        miktar: 1, kalem_iskonto: 0,
        bilesenler: s.bilesenler.map(b => ({ urun_id: b.urun_id, ad: b.ad, miktar: b.miktar, kdv_orani: b.kdv_orani, satis_fiyati: b.satis_fiyati })),
      }]
    })
    toast.success(`${s.ad} seti eklendi`, { duration: 900, position: 'bottom-right' })
  }

  // Set kalemini bileşen ürün kalemlerine açar: set fiyatı bileşenlere ürün fiyatı
  // oranında (fiyatlar 0 ise adet bazlı eşit) dağıtılır; kuruş farkı son kaleme yazılır.
  function setiAc(k) {
    const setFiyat = k.satis_fiyati // 1 set için
    const toplamAdet = k.bilesenler.reduce((t, b) => t + b.miktar, 0)
    const tabanToplam = k.bilesenler.reduce((t, b) => t + (b.satis_fiyati > 0 ? b.satis_fiyati * b.miktar : 0), 0)
    let dagitilan = 0
    return k.bilesenler.map((b, i) => {
      const son = i === k.bilesenler.length - 1
      const pay = son ? (setFiyat - dagitilan)
        : (tabanToplam > 0 ? setFiyat * (b.satis_fiyati * b.miktar) / tabanToplam : setFiyat * b.miktar / toplamAdet)
      const birim = Math.round((pay / b.miktar) * 100) / 100
      if (!son) dagitilan += birim * b.miktar
      return {
        urun_id: b.urun_id,
        miktar: b.miktar * k.miktar,
        birim_fiyat: birim,
        iskonto_orani: efektifIskonto(k),
        set_adi: k.ad.replace(/^🎁\s*/, ''),
      }
    })
  }

  function miktarDegistir(urun_id, miktar) {
    if (miktar <= 0) { setSepet(prev => prev.filter(k => k.urun_id !== urun_id)); return }
    setSepet(prev => prev.map(k => k.urun_id === urun_id ? { ...k, miktar } : k))
  }

  // Müşteri kaydet (Müşteriler sayfasıyla aynı form; ad/soyad/il/ilçe zorunlu)
  async function musteriKaydet(e) {
    e.preventDefault()
    if (!musteriForm.ad.trim() || !musteriForm.soyad.trim() || !musteriForm.il.trim() || !musteriForm.ilce.trim()) {
      toast.error('Ad, soyad, il ve ilçe zorunludur')
      return
    }
    // Sabit uzunluklu alan denetimleri (boş = geçerli, doluysa tam uzunluk).
    const maskeHata = telefonHatasi(musteriForm.telefon) || tcHatasi(musteriForm.tc_kimlik) || vergiHatasi(musteriForm.vergi_no)
    if (maskeHata) { toast.error(maskeHata); return }
    setMusteriKayitYukleniyor(true)
    try {
      const veri = Object.fromEntries(
        Object.entries(musteriForm)
          .filter(([, v]) => String(v).trim() !== '')
          .map(([k, v]) => [k, k === 'iskonto_orani' ? (parseFloat(v) || 0) : (typeof v === 'string' ? v.trim() : v)])
      )
      const yeniMusteri = await musteriApi.olustur(veri)
      setSecilenMusteri({ ...veri, id: yeniMusteri.id })
      setMusteriArama(`${veri.ad} ${veri.soyad}`.trim())
      setMusteriFormAcik(false)
      setMusteriForm(MUSTERI_BOSH)
      toast.success('Müşteri eklendi ve seçildi')
    } catch (e) { toast.error(e.message) }
    setMusteriKayitYukleniyor(false)
  }

  // Hesaplamalar
  // Ön siparişte elle girilen satır fiyatı (yalnız normal kalemler, set hariç) toplamlarda
  // ürünün kayıtlı fiyatının yerine geçer; geçersiz/boş değer kayıtlı fiyata düşer.
  const efektifFiyat = (k) => (onSiparis && k.tip !== 'set' ? (elleFiyatSayi(k) ?? k.satis_fiyati) : k.satis_fiyati)
  // Brüt toplam (iskontosuz) — TL indirimi yüzdeye çevirmek için
  const brutToplam = sepet.reduce((t, k) => t + efektifFiyat(k) * k.miktar, 0)
  const musteriIskonto = secilenMusteri?.iskonto_orani || 0
  // Manuel indirimi yüzdeye çevir (ayar 'tutar' ise TL → %)
  const manuelYuzde = iskontoTipi === 'tutar'
    ? (brutToplam > 0 ? Math.min(100, (manuelIskonto / brutToplam) * 100) : 0)
    : (manuelIskonto || 0)
  const genelIskontoYuzde = Math.max(musteriIskonto, manuelYuzde)

  const efektifIskonto = (k) => Math.max(k.kalem_iskonto || 0, genelIskontoYuzde)
  const kalemToplam = (k) => efektifFiyat(k) * k.miktar * (1 - efektifIskonto(k) / 100)
  const toplamKDVsiz = sepet.reduce((t, k) => t + kalemToplam(k) * 100 / (100 + k.kdv_orani), 0)
  const toplamKDV = sepet.reduce((t, k) => t + kalemToplam(k) * k.kdv_orani / (100 + k.kdv_orani), 0)
  const toplamIskonto = sepet.reduce((t, k) => t + efektifFiyat(k) * k.miktar * efektifIskonto(k) / 100, 0)
  const genelToplam = sepet.reduce((t, k) => t + kalemToplam(k), 0)

  // Ödeme tipi farkını (kart/havale/nakit %) iskontolu toplamların ÜZERİNE uygula.
  const odemeCarpani = Math.max(0, 1 + odemeOran / 100)
  const araToplamSon = toplamKDVsiz * odemeCarpani
  const kdvToplamSon = toplamKDV * odemeCarpani
  const genelToplamSon = genelToplam * odemeCarpani
  const odemeFarki = genelToplamSon - genelToplam

  // odemelerArg verilirse parçalı (karma) ödeme: [{ odeme_tipi, tutar }] ve fiyat
  // farkı (odeme_oran) uygulanmaz; aksi halde tek ödeme (seçili odemeTipi).
  async function satisOlustur(odemelerArg = null) {
    // Güvence: yalnızca dizi parçalı ödeme sayılır (onClick event'i vb. yok sayılır).
    odemelerArg = Array.isArray(odemelerArg) ? odemelerArg : null
    if (!secilenLokasyonId) { toast.error('Lokasyon seçin'); return }
    if (!lokasyonErisim(secilenLokasyonId)) { toast.error('Bu lokasyonda işlem yapma yetkiniz yok'); return }
    if (sepet.length === 0) { toast.error('Sepet boş'); return }
    if (musteriZorunlu && !secilenMusteri) { toast.error('Bu satış için müşteri seçilmesi zorunludur'); return }
    // Nakit kontrolü: tek ödemede nakit, parçalıda nakit kısmı varsa kasa açık olmalı.
    const nakitVar = odemelerArg ? odemelerArg.some(o => o.odeme_tipi === 'nakit' && o.tutar > 0) : odemeTipi === 'nakit'
    if (kasaZorunlu && nakitVar && kasaAcik === false) { toast.error('Nakit satış için önce Kasa açın (Satış & Kasa > Kasa).'); return }
    setIslemde(true)
    try {
      const satis = await satisApi.olustur({
        lokasyon_id: secilenLokasyonId,
        musteri_id: secilenMusteri?.id || null,
        odeme_tipi: odemelerArg ? (odemelerArg.length > 1 ? 'karma' : odemelerArg[0].odeme_tipi) : odemeTipi,
        genel_iskonto: genelIskontoYuzde,
        odeme_oran: odemelerArg ? 0 : odemeOran,
        odemeler: odemelerArg || undefined,
        stok_zorla: !!ayarlar.stok_yetersiz_satis,
        // Ön siparişte backend stok kontrolünü ve stok düşümünü atlar.
        on_siparis: onSiparis || undefined,
        on_siparis_not: onSiparis ? (onSiparisNot.trim() || null) : undefined,
        // Set kalemleri bileşen ürünlere açılır (set fiyatı dağıtılmış birim_fiyat + set_adi);
        // normal kalemler olduğu gibi gider.
        kalemler: sepet.flatMap(k => k.tip === 'set'
          ? setiAc(k)
          : [{
              urun_id: k.urun_id, miktar: k.miktar, iskonto_orani: efektifIskonto(k),
              // Ön siparişte elle girilen fiyat yalnız bu satışa geçer; ürün kartı değişmez.
              ...(onSiparis && elleFiyatSayi(k) != null ? { birim_fiyat: elleFiyatSayi(k) } : {}),
            }]),
      })
      toast.success(onSiparis
        ? `✓ Ön sipariş alındı (stok düşülmedi) — Fiş: ${satis.fis_no}`
        : `✓ Satış tamamlandı — Fiş: ${satis.fis_no}`)
      senkTetikle() // yeni satışı anında Supabase'e gönder
      // Kargo butonu için bu satışı ve müşterisini sakla (sepet temizlenmeden önce).
      setSonSatis({ satisId: satis.id, fisNo: satis.fis_no, musteri: secilenMusteri })
      setSepet([]); setSecilenMusteri(null); setMusteriArama(''); setManuelIskonto(0)
      setParcaliAcik(false); setParcali({ nakit: '', kart: '', havale: '' })
      setOnSiparis(false); setOnSiparisNot('')
      barkodRef.current?.focus()
      // Fişi yazdır (hata olursa satışı engellemesin)
      fisApi.yazdir(satis.id).catch(err => toast.error(`Fiş yazdırılamadı: ${err.message}`))
    } catch (e) { toast.error(e.message || 'Satış hatası', { duration: 6000 }) }
    finally { setIslemde(false) }
  }

  const sepetteVar = (id) => sepet.find(k => k.urun_id === id)

  // --- Hiyerarşik gezinme görünümü: marka → kategori → ürün ---
  const aramaModu = urunArama.trim().length > 0
  // Seçili markanın ürünlerinden kategori kartları türetilir (kategorisizler 'yok').
  const markaKategorileri = (!aramaModu && secilenMarka && !secilenKategori)
    ? [...new Map(urunler.filter(u => u.kategori_id).map(u => [u.kategori_id, u.kategori_yol || u.kategori || 'Kategori'])).entries()]
        .sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'tr'))
    : []
  const kategorisizVar = !aramaModu && secilenMarka && !secilenKategori && urunler.some(u => !u.kategori_id)
  // Görünüm: arama → ürün; marka seçilmedi → marka kartları; '__setler__' → set
  // kartları; marka seçildi ve kategorileri varsa → kategori kartları; sonra ürünler.
  const gorunum = aramaModu ? 'urun'
    : secilenMarka === '__setler__' ? 'setler'
    : !secilenMarka ? 'marka'
    : (!secilenKategori && (markaKategorileri.length > 0)) ? 'kategori'
    : 'urun'
  // Ürün görünümünde gösterilecek liste ('yok' = kategorisiz ürünler, client-side).
  const gosterilecekUrunler = (gorunum === 'urun' && secilenKategori === 'yok')
    ? urunler.filter(u => !u.kategori_id) : urunler
  const secilenMarkaAdi = secilenMarka === '__setler__' ? 'Setlerimiz'
    : (markalar.find(m => String(m.id) === String(secilenMarka))?.ad || '')
  const secilenKategoriEtiketi = secilenKategori === 'tumu' ? 'Tüm Ürünler'
    : secilenKategori === 'yok' ? 'Kategorisiz'
    : (markaKategorileri.find(([id]) => String(id) === secilenKategori)?.[1]
       || urunler.find(u => String(u.kategori_id) === secilenKategori)?.kategori_yol || '')

  function markaSec(id) { setSecilenMarka(String(id)); setSecilenKategori('') }
  function geriGit() {
    if (secilenKategori) setSecilenKategori('')
    else setSecilenMarka('')
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* ===== SOL: Ürün Browser ===== */}
      <div className="flex-1 flex flex-col overflow-hidden border-r">

        {/* Üst bar */}
        <div className="bg-white border-b px-3 py-2 flex gap-2 items-center flex-shrink-0">
          <select value={secilenLokasyonId || ''} onChange={e => setSecilenLokasyonId(Number(e.target.value))}
            className="border rounded-lg px-2.5 py-1.5 text-sm bg-white text-gray-700 font-medium flex-shrink-0">
            {lokasyonlar.map(l => <option key={l.id} value={l.id}>🏪 {l.ad}</option>)}
          </select>
          <form onSubmit={barkodSorgu} className="flex gap-1.5 flex-shrink-0">
            <input ref={barkodRef} value={barkodInput} onChange={e => setBarkodInput(e.target.value)}
              placeholder="📷 Barkod..." className="border rounded-lg px-3 py-1.5 text-sm w-36" autoFocus />
            <button type="submit" className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Ekle</button>
          </form>
          <input value={urunArama} onChange={e => setUrunArama(e.target.value)}
            placeholder="🔍 Ürün ara..." className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
        </div>

        {/* Gezinme şeridi: Markalar → Kategori → Ürünler (arama modunda gizli) */}
        {!aramaModu && (secilenMarka || secilenKategori) && (
          <div className="bg-white border-b px-3 py-2 flex gap-2 items-center flex-shrink-0 text-sm">
            <button onClick={geriGit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium">
              ← Geri
            </button>
            <button onClick={() => { setSecilenMarka(''); setSecilenKategori('') }}
              className="text-gray-400 hover:text-blue-600 text-xs">Markalar</button>
            {secilenMarkaAdi && (
              <>
                <span className="text-gray-300">›</span>
                <button onClick={() => setSecilenKategori('')}
                  className={`text-xs ${secilenKategori ? 'text-gray-400 hover:text-blue-600' : 'font-semibold text-gray-800'}`}>
                  {secilenMarkaAdi}
                </button>
              </>
            )}
            {secilenKategori && (
              <>
                <span className="text-gray-300">›</span>
                <span className="text-xs font-semibold text-gray-800">{secilenKategoriEtiketi || 'Ürünler'}</span>
              </>
            )}
          </div>
        )}

        {/* Kart alanı: markalar / kategoriler / ürünler — hepsi aynı kart tasarımı */}
        <div className="flex-1 overflow-auto p-3">
          {urunYukleniyor && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Yükleniyor...</div>
          )}

          {/* MARKA kartları */}
          {!urunYukleniyor && gorunum === 'marka' && (
            <>
              {markalar.length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Marka bulunamadı</div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {setler.length > 0 && (
                  <button onClick={() => { setSecilenMarka('__setler__'); setSecilenKategori('') }}
                    className="text-left rounded-xl border border-purple-200 bg-purple-50 p-2.5 transition-all hover:shadow-md hover:border-purple-400 active:scale-95 flex flex-col">
                    <div className="text-xs text-purple-400 mb-1">Kendi Setlerimiz</div>
                    <div className="text-sm font-semibold text-purple-800 leading-snug mb-2 flex-1"
                      style={{ minHeight: '2.4em' }}>🎁 Setlerimiz</div>
                    <div className="text-xs text-purple-600 mt-auto">{setler.length} set ›</div>
                  </button>
                )}
                {markalar.map(m => (
                  <button key={m.id} onClick={() => markaSec(m.id)} title={m.ad}
                    className="text-left rounded-xl border border-gray-200 bg-white p-2.5 transition-all hover:shadow-md hover:border-blue-300 active:scale-95 flex flex-col">
                    <div className="text-xs text-gray-400 mb-1">Marka</div>
                    <div className="text-sm font-semibold text-gray-800 leading-snug mb-2 flex-1"
                      style={{ minHeight: '2.4em' }}>🏷️ {m.ad}</div>
                    <div className="text-xs text-blue-600 mt-auto">Ürünlere git ›</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* SET kartları — tıklayınca set tek kalem (set fiyatıyla) sepete girer */}
          {gorunum === 'setler' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {setler.map(s => (
                <SetKart key={s.id} s={s} sepetKalem={sepetteVar('set:' + s.id)} onClick={() => setSepeteEkle(s)} />
              ))}
              {setler.length === 0 && (
                <div className="col-span-full flex items-center justify-center h-32 text-gray-400 text-sm">
                  Henüz set yok — Ürünler › 🎁 Setler sekmesinden oluşturun.
                </div>
              )}
            </div>
          )}

          {/* Arama modunda eşleşen setler, ürün grid'inin ÜSTÜNDE ayrı bir bölüm olarak
              gösterilir — gorunum ternary'sine dokunmadan (hiyerarşik gezinme bozulmasın). */}
          {aramaModu && setler.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1.5">🎁 Setler</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {setler.map(s => (
                  <SetKart key={s.id} s={s} sepetKalem={sepetteVar('set:' + s.id)} onClick={() => setSepeteEkle(s)} />
                ))}
              </div>
            </div>
          )}

          {/* KATEGORİ kartları (seçili markanın ürünlerinden türetilir) */}
          {!urunYukleniyor && gorunum === 'kategori' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              <button onClick={() => setSecilenKategori('tumu')}
                className="text-left rounded-xl border border-gray-200 bg-white p-2.5 transition-all hover:shadow-md hover:border-blue-300 active:scale-95 flex flex-col">
                <div className="text-xs text-gray-400 mb-1">{secilenMarkaAdi}</div>
                <div className="text-sm font-semibold text-gray-800 leading-snug mb-2 flex-1" style={{ minHeight: '2.4em' }}>📦 Tüm Ürünler</div>
                <div className="text-xs text-blue-600 mt-auto">{urunler.length} ürün ›</div>
              </button>
              {markaKategorileri.map(([id, yol]) => (
                <button key={id} onClick={() => setSecilenKategori(String(id))} title={yol}
                  className="text-left rounded-xl border border-gray-200 bg-white p-2.5 transition-all hover:shadow-md hover:border-blue-300 active:scale-95 flex flex-col">
                  <div className="text-xs text-gray-400 mb-1">Kategori</div>
                  <div className="text-sm font-semibold text-gray-800 leading-snug mb-2 flex-1"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em' }}>
                    📂 {yol}
                  </div>
                  <div className="text-xs text-blue-600 mt-auto">
                    {urunler.filter(u => String(u.kategori_id) === String(id)).length} ürün ›
                  </div>
                </button>
              ))}
              {kategorisizVar && (
                <button onClick={() => setSecilenKategori('yok')}
                  className="text-left rounded-xl border border-gray-200 bg-white p-2.5 transition-all hover:shadow-md hover:border-blue-300 active:scale-95 flex flex-col">
                  <div className="text-xs text-gray-400 mb-1">Kategori</div>
                  <div className="text-sm font-semibold text-gray-800 leading-snug mb-2 flex-1" style={{ minHeight: '2.4em' }}>📁 Diğer (kategorisiz)</div>
                  <div className="text-xs text-blue-600 mt-auto">{urunler.filter(u => !u.kategori_id).length} ürün ›</div>
                </button>
              )}
            </div>
          )}

          {/* ÜRÜN kartları — arama modunda "sonuç yok" mesajı SETLERİ de hesaba katar:
              set eşleşmişse (yukarıda ayrıca render edilir) burada çelişkili bir
              "bulunamadı" mesajı göstermeyiz. Arama modu DIŞINDaki (kategori gezinme)
              davranış değişmedi. */}
          {!urunYukleniyor && gorunum === 'urun' && gosterilecekUrunler.length === 0 && (!aramaModu || setler.length === 0) && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              {aramaModu ? 'Aramanızla eşleşen ürün ya da set bulunamadı' : 'Ürün bulunamadı'}
            </div>
          )}
          {gorunum === 'urun' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {gosterilecekUrunler.map(u => {
              const sepetKalem = sepetteVar(u.id)
              return (
                <button key={u.id} onClick={() => sepeteEkle(u)} title={u.ad}
                  className={`relative text-left rounded-xl border p-2.5 transition-all hover:shadow-md active:scale-95 flex flex-col ${sepetKalem ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  {/* Sepet sayacı */}
                  {sepetKalem && (
                    <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold z-10">
                      {sepetKalem.miktar}
                    </span>
                  )}
                  {/* Marka / kategori */}
                  <div className="text-xs text-gray-400 mb-1 truncate w-full pr-5">
                    {u.marka_adi || u.kategori_yol || '—'}
                  </div>
                  {/* Ürün adı — sabit 2 satır yüksekliği */}
                  <div className="text-xs font-medium text-gray-800 leading-snug mb-2 flex-1"
                    style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '3.6em' }}>
                    {u.ad}
                  </div>
                  {/* Fiyat */}
                  <div className="text-sm font-bold text-green-700 mt-auto">₺{u.satis_fiyati?.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">KDV %{u.kdv_orani}</div>
                </button>
              )
            })}
          </div>
          )}
        </div>
      </div>

      {/* ===== SAĞ: Sepet + Ödeme ===== */}
      <div className="w-80 flex flex-col bg-white flex-shrink-0">

        {/* Müşteri alanı */}
        <div className="border-b p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Müşteri</span>
            <button onClick={() => { setMusteriFormAcik(true); setMusteriForm(MUSTERI_BOSH) }}
              className="text-xs text-blue-600 hover:underline font-medium">+ Yeni Müşteri</button>
          </div>
          {secilenMusteri ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
              <div>
                <div className="text-sm font-medium text-blue-800">{secilenMusteri.ad} {secilenMusteri.soyad}</div>
                {secilenMusteri.iskonto_orani > 0 && (
                  <div className="text-xs text-green-600 font-medium">%{secilenMusteri.iskonto_orani} sabit iskonto</div>
                )}
              </div>
              <button onClick={() => { setSecilenMusteri(null); setMusteriArama(''); setMusteriSonuclari([]) }}
                className="text-gray-400 hover:text-red-500 text-base ml-2">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={musteriArama} onChange={e => musteriAraFn(e.target.value)}
                placeholder="Ad, telefon ile ara..." className="w-full border rounded-lg px-3 py-1.5 text-sm" />
              {musteriSonuclari.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-xl z-20 mt-1 max-h-44 overflow-auto">
                  {musteriSonuclari.map(m => (
                    <button key={m.id} onClick={() => { setSecilenMusteri(m); setMusteriArama(`${m.ad} ${m.soyad}`); setMusteriSonuclari([]) }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0">
                      <span className="font-medium">{m.ad} {m.soyad}</span>
                      {m.telefon && <span className="text-gray-400 ml-2 text-xs">{m.telefon}</span>}
                      {m.iskonto_orani > 0 && <span className="text-green-600 ml-1.5 text-xs font-medium">%{m.iskonto_orani}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sepet listesi */}
        <div className="flex-1 overflow-auto">
          {sepet.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none">
              <div className="text-4xl mb-2">🛒</div>
              <div className="text-sm">Ürüne tıklayarak sepete ekle</div>
            </div>
          ) : (
            <div className="divide-y">
              {sepet.map(k => (
                <div key={k.urun_id} className={`px-3 py-2.5 ${k.tip === 'set' ? 'bg-purple-50/50' : ''}`}>
                  <div className="flex justify-between items-start gap-1 mb-1.5">
                    <span className="text-xs font-medium text-gray-800 leading-tight flex-1 line-clamp-2">{k.ad}</span>
                    <button onClick={() => setSepet(p => p.filter(i => i.urun_id !== k.urun_id))}
                      className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0 ml-1 mt-0.5">✕</button>
                  </div>
                  {/* Set içeriği — fiyatsız bileşen listesi (yalnız set fiyatı geçerli) */}
                  {k.tip === 'set' && (
                    <div className="mb-1.5 pl-2 border-l-2 border-purple-200">
                      {k.bilesenler.map(b => (
                        <div key={b.urun_id} className="text-[11px] text-gray-500 leading-snug">
                          • {b.ad}{b.miktar > 1 ? ` ×${b.miktar}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg overflow-hidden flex-shrink-0">
                      <button onClick={() => miktarDegistir(k.urun_id, k.miktar - 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 text-sm font-bold">−</button>
                      <span className="px-2 text-sm font-semibold min-w-[1.5rem] text-center">{k.miktar}</span>
                      <button onClick={() => miktarDegistir(k.urun_id, k.miktar + 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 text-sm font-bold">+</button>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">%</span>
                      <input type="number" min="0" max="100" step="0.5"
                        value={k.kalem_iskonto || ''} placeholder={genelIskontoYuzde ? genelIskontoYuzde.toFixed(0) : '0'}
                        onChange={e => setSepet(prev => prev.map(i => i.urun_id === k.urun_id ? { ...i, kalem_iskonto: parseFloat(e.target.value) || 0 } : i))}
                        className="w-12 border rounded px-1.5 py-1 text-xs text-center" />
                    </div>
                    {/* Ön sipariş: satır fiyatı elle girilebilir (boş = ürünün kayıtlı fiyatı). Set kalemlerinde açılmaz. */}
                    {onSiparis && k.tip !== 'set' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">₺</span>
                        <input type="text" inputMode="decimal"
                          value={k.elleFiyat ?? ''} placeholder={k.satis_fiyati.toFixed(2)}
                          onChange={e => {
                            const deger = e.target.value
                            setSepet(prev => prev.map(i => i.urun_id === k.urun_id ? { ...i, elleFiyat: deger } : i))
                          }}
                          className="w-16 border border-amber-300 rounded px-1.5 py-1 text-xs text-center" />
                      </div>
                    )}
                    <div className="ml-auto text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-800">₺{kalemToplam(k).toFixed(2)}</div>
                      {efektifIskonto(k) > 0 && <div className="text-xs text-green-600">-%{efektifIskonto(k)}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alt: Özet + Ödeme + Buton */}
        <div className="border-t bg-gray-50 p-3 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">Genel İndirim</span>
            {/* %/₺ tipi seçici (kullanıcı tercihi, yerelde saklanır) */}
            <div className="flex border rounded-lg overflow-hidden flex-shrink-0">
              {[['oran', '%'], ['tutar', '₺']].map(([val, sembol]) => (
                <button key={val} type="button"
                  onClick={() => { ayarKaydet('iskonto_tipi', val); setManuelIskonto(0) }}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${iskontoTipi === val ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {sembol}
                </button>
              ))}
            </div>
            <input type="number" min="0" max={iskontoTipi === 'tutar' ? undefined : 100}
              step={iskontoTipi === 'tutar' ? '1' : '0.5'} value={manuelIskonto || ''}
              onChange={e => setManuelIskonto(parseFloat(e.target.value) || 0)}
              placeholder="0" className="w-20 border rounded-lg px-2 py-1 text-xs text-center ml-auto" />
            <span className="text-xs text-gray-400">{iskontoTipi === 'tutar' ? '₺' : '%'}</span>
          </div>
          {musteriIskonto > 0 && (
            <p className="text-[11px] text-green-600 -mt-1.5">Müşteri sabit iskontosu: %{musteriIskonto}</p>
          )}

          <div className="bg-white rounded-lg border p-2.5 space-y-1">
            <div className="flex justify-between text-xs text-gray-500"><span>Ara Toplam</span><span>₺{araToplamSon.toFixed(2)}</span></div>
            {toplamIskonto > 0 && <div className="flex justify-between text-xs text-green-600"><span>İskonto</span><span>-₺{toplamIskonto.toFixed(2)}</span></div>}
            {Math.abs(odemeFarki) >= 0.005 && (
              <div className={`flex justify-between text-xs ${odemeFarki >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                <span>Ödeme farkı ({odemeOran > 0 ? '+' : ''}%{odemeOran})</span>
                <span>{odemeFarki >= 0 ? '+' : '-'}₺{Math.abs(odemeFarki).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500"><span>KDV</span><span>₺{kdvToplamSon.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-bold border-t pt-1.5 mt-1"><span>Toplam</span><span className="text-green-700">₺{genelToplamSon.toFixed(2)}</span></div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {[['nakit', '💵', 'Nakit'], ['kart', '💳', 'Kart'], ['havale', '🏦', 'Havale']].map(([val, icon, label]) => {
              const oran = Number(ayarlar[`odeme_oran_${val}`]) || 0
              return (
                <button key={val} onClick={() => setOdemeTipi(val)}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${odemeTipi === val ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {icon} {label}
                  {oran !== 0 && <span className={`block text-[10px] font-semibold ${odemeTipi === val ? 'text-gray-300' : oran > 0 ? 'text-orange-500' : 'text-green-600'}`}>{oran > 0 ? '+' : ''}%{oran}</span>}
                </button>
              )
            })}
          </div>

          {onSiparisYetkisi && (
            <div className={`rounded-lg border px-3 py-2 transition-colors ${onSiparis ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={onSiparis} onChange={e => {
                    const acik = e.target.checked
                    setOnSiparis(acik)
                    // Kutucuk kapatılınca elle girilen fiyatlar temizlenir (normal satışa sızmasın).
                    if (!acik) setSepet(prev => prev.map(i => i.elleFiyat !== undefined ? { ...i, elleFiyat: undefined } : i))
                  }}
                  className="w-4 h-4 accent-amber-600" />
                <span className="text-xs font-semibold text-gray-700">🕐 Ön Sipariş <span className="font-normal text-gray-500">(stok düşülmez)</span></span>
              </label>
              {onSiparis && (
                <input type="text" value={onSiparisNot} onChange={e => setOnSiparisNot(e.target.value)}
                  placeholder="Not (ör. tedarikçiden 10 gün)"
                  className="mt-2 w-full text-xs border border-amber-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400" />
              )}
            </div>
          )}

          <button type="button" onClick={() => { setParcali({ nakit: '', kart: '', havale: '' }); setParcaliAcik(true) }}
            disabled={sepet.length === 0}
            className="w-full text-xs font-medium text-gray-600 border border-dashed border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 disabled:opacity-40">
            ➗ Parçalı Ödeme (nakit + kart + havale)
          </button>

          {musteriZorunlu && !secilenMusteri && sepet.length > 0 && (
            <button type="button" onClick={() => { setMusteriForm(MUSTERI_BOSH); setMusteriFormAcik(true) }}
              className="w-full text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg py-1.5 hover:bg-amber-100 transition-colors">
              ⚠️ Satış için müşteri seçimi zorunlu — Müşteri Ekle ›
            </button>
          )}
          {kasaNakitEngel && (
            <button type="button" onClick={() => navigate('/satis-gecmisi?sekme=kasa')}
              className="w-full text-[11px] font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg py-1.5 hover:bg-red-100 transition-colors">
              🔒 Nakit satış için kasa kapalı — Kasayı Aç ›
            </button>
          )}
          <button onClick={() => satisOlustur()} disabled={islemde}
            className={`w-full text-white py-3 rounded-xl font-bold disabled:opacity-50 text-sm transition-colors ${
              onSiparis ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {islemde ? '⏳ İşleniyor...' : `${onSiparis ? '🕐 Ön Siparişi Kaydet' : '✓ Satışı Tamamla'}  ₺${genelToplamSon.toFixed(2)}`}
          </button>

          {sepet.length > 0 && (
            <button onClick={() => setSepet([])}
              className="w-full border border-red-200 text-red-500 py-1.5 rounded-lg text-xs hover:bg-red-50">
              🗑 Sepeti Temizle
            </button>
          )}

          {/* Son satış için UPS kargo gönderisi */}
          {kargoYetkisi && sonSatis && sepet.length === 0 && (
            <button onClick={() => setKargoFormAcik(true)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 text-sm transition-colors">
              📦 Son Satış İçin UPS Kargo Gönder ({sonSatis.fisNo})
            </button>
          )}
        </div>
      </div>

      {/* ===== Parçalı (Karma) Ödeme Modal ===== */}
      {parcaliAcik && (() => {
        const sum = (parseFloat(parcali.nakit) || 0) + (parseFloat(parcali.kart) || 0) + (parseFloat(parcali.havale) || 0)
        const kalan = genelToplam - sum
        const tamam = Math.abs(kalan) < 0.005 && sum > 0
        const alanlar = [['nakit', '💵 Nakit'], ['kart', '💳 Kart'], ['havale', '🏦 Havale']]
        const kalaniYaz = (alan) => setParcali(p => ({ ...p, [alan]: ((parseFloat(p[alan]) || 0) + kalan).toFixed(2) }))
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => !islemde && setParcaliAcik(false)}>
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-base font-bold">Parçalı Ödeme</h3>
                <button onClick={() => setParcaliAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Toplam <b className="text-gray-700">₺{genelToplam.toFixed(2)}</b> tutarını ödeme tiplerine bölün. (Parçalı ödemede ödeme farkı yüzdesi uygulanmaz.)</p>

              <div className="space-y-2">
                {alanlar.map(([alan, etiket]) => (
                  <div key={alan} className="flex items-center gap-2">
                    <label className="text-sm w-24 flex-shrink-0">{etiket}</label>
                    <input type="number" step="0.01" min="0" value={parcali[alan]}
                      onChange={e => setParcali(p => ({ ...p, [alan]: e.target.value }))}
                      placeholder="0,00" className="flex-1 border rounded-lg px-2 py-1.5 text-sm text-right" />
                    <button type="button" onClick={() => kalaniYaz(alan)} disabled={Math.abs(kalan) < 0.005}
                      className="text-[11px] text-blue-600 hover:underline disabled:opacity-30 flex-shrink-0 w-12">kalanı</button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t text-sm">
                <span className="text-gray-500">Girilen: <b>₺{sum.toFixed(2)}</b></span>
                <span className={kalan > 0.005 ? 'text-orange-600' : kalan < -0.005 ? 'text-red-600' : 'text-green-600'}>
                  {kalan > 0.005 ? `Kalan: ₺${kalan.toFixed(2)}` : kalan < -0.005 ? `Fazla: ₺${(-kalan).toFixed(2)}` : '✓ Tam'}
                </span>
              </div>

              <button onClick={() => {
                const odemeler = alanlar
                  .map(([alan]) => ({ odeme_tipi: alan, tutar: parseFloat(parcali[alan]) || 0 }))
                  .filter(o => o.tutar > 0)
                satisOlustur(odemeler)
              }} disabled={!tamam || islemde}
                className="w-full mt-4 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 text-sm">
                {islemde ? '⏳ İşleniyor...' : `✓ Satışı Tamamla  ₺${genelToplam.toFixed(2)}`}
              </button>
            </div>
          </div>
        )
      })()}

      {/* ===== UPS Kargo Modal ===== */}
      <KargoFormu
        acik={kargoFormAcik}
        kapat={() => setKargoFormAcik(false)}
        baslangic={sonSatis ? {
          aliciAd: sonSatis.musteri ? `${sonSatis.musteri.ad} ${sonSatis.musteri.soyad || ''}`.trim() : '',
          aliciTelefon: sonSatis.musteri?.telefon || '',
          aliciEmail: sonSatis.musteri?.email || '',
          aliciAdres: sonSatis.musteri?.adres || '',
          musteriId: sonSatis.musteri?.id || null,
          satisId: sonSatis.satisId,
          faturaNo: sonSatis.fisNo,
        } : null}
        onTamam={() => setSonSatis(null)}
      />

      {/* ===== Yeni Müşteri Modal ===== */}
      {musteriFormAcik && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setMusteriFormAcik(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold">Yeni Müşteri Ekle</h3>
              <button onClick={() => setMusteriFormAcik(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={musteriKaydet} className="space-y-3">
              <MusteriFormAlanlari form={musteriForm} setForm={setMusteriForm} ilZorunlu ilkAlanaOdaklan />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={musteriKayitYukleniyor}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50">
                  {musteriKayitYukleniyor ? 'Kaydediliyor...' : 'Kaydet & Seç'}
                </button>
                <button type="button" onClick={() => setMusteriFormAcik(false)}
                  className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
