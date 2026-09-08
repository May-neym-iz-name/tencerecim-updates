import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { sosyalApi, metaApi, youtubeApi, aiApi } from '../api/ipc'
import { eslesirMi } from '../utils/arama'
import { adSadelestir, adBasHarfi } from '../utils/ad'
import { bulutaYukle } from '../lib/ayarSenk'
import { useAuth } from '../auth/AuthContext'
import OtomasyonPaneli from '../components/OtomasyonPaneli'
import YoutubeIstatistik from '../components/YoutubeIstatistik'
import SablonKutuphanesi from '../components/SablonKutuphanesi'
import SosyalGorsel from '../components/SosyalGorsel'
import SorularListesi from '../components/SorularListesi'
import UrunKartiBalonu from '../components/UrunKartiBalonu'
import { useGorunurAralik } from '../hooks/useGorunurAralik'

// Üst sekmeler — Meta Business Suite düzeni. mod: 'karma'|'dm'|'yorum'
const SEKMELER = [
  { kod: 'hepsi', ad: 'Tüm mesajlar', mod: 'karma', sayacKey: 'hepsi' },
  { kod: 'messenger', ad: 'Messenger', mod: 'dm', platform: 'facebook', sayacKey: 'messenger' },
  { kod: 'instagram', ad: 'Instagram', mod: 'dm', platform: 'instagram', sayacKey: 'instagram_dm' },
  // Fiyat DIŞI yorumlar (niyet='soru'): temsilci cevaplayana kadar burada bekler (08.09.2026).
  { kod: 'sorular', ad: 'Sorular', mod: 'sorular', sayacKey: 'sorular' },
  { kod: 'fb_yorum', ad: 'Facebook yorumları', mod: 'yorum', platform: 'facebook', sayacKey: 'fb_yorum' },
  { kod: 'ig_yorum', ad: 'Instagram yorumları', mod: 'yorum', platform: 'instagram', sayacKey: 'ig_yorum' },
  // YouTube yorumları AYNI tabloda durur (platform='youtube', tur='yorum'), bu yüzden
  // süzgeçler/atama/sayaç ek iş olmadan çalışır. Yalnız ÇEKME ve YANITLAMA farklı API.
  { kod: 'yt_yorum', ad: 'YouTube yorumları', mod: 'yorum', platform: 'youtube', sayacKey: 'yt_yorum' },
]

// Personelin tek dokunuşla ekleyebileceği hazır yanıtlar (mağaza sık kullanılan cevaplar).
// Yalnızca ilk kurulumda tohum olarak kullanılır; asıl liste meta_ayarlar.hizli_yanitlar'da
// (JSON dizi) saklanır ve personel açılır menüden ekleyip/silebilir.
const VARSAYILAN_YANITLAR = [
  'Merhaba, size nasıl yardımcı olabiliriz? 😊',
  'İlginiz için teşekkürler! En kısa sürede dönüş yapacağız.',
  'Ürünümüz stoklarımızda mevcuttur. 🙌',
  'Fiyat ve sipariş için bize DM’den ulaşabilirsiniz.',
  'Siparişiniz hazırlanıyor, kargoya verilince bilgilendireceğiz. 📦',
  'Değerli yorumunuz için teşekkür ederiz! ❤️',
]

// meta_ayarlar.hizli_yanitlar değerini güvenle diziye çevirir (bozuk/boşsa varsayılana döner).
function yanitlariCoz(deger) {
  if (!deger) return VARSAYILAN_YANITLAR
  try {
    const arr = JSON.parse(deger)
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x.trim()) : VARSAYILAN_YANITLAR
  } catch { return VARSAYILAN_YANITLAR }
}

// Token dolmadan bu kadar gün önce sarı uyarı göster.
const TOKEN_UYARI_GUN = 10

// Gelen kutusu filtreleri. "Cevapsız" ile "Okunmamış" AYNI şey değildir:
// durum='yeni' okunmamış, 'okundu' okundu ama hâlâ cevapsız, 'cevaplandi' kapanmış.
// Bu yüzden ikisi ayrı süzgeç (ölçüm: 14.730 yorum "okundu ama cevapsız" durumda).
const CEVAP_SECENEK = [
  { kod: 'hepsi', ad: 'Tümü' },
  { kod: 'cevapsiz', ad: 'Cevapsız' },
  { kod: 'cevaplandi', ad: 'Cevaplanmış' },
]
const OKUNMA_SECENEK = [
  { kod: 'hepsi', ad: 'Tümü' },
  { kod: 'okunmamis', ad: 'Okunmamış' },
  { kod: 'okunmus', ad: 'Okunmuş' },
]
const ATAMA_SECENEK = [
  { kod: 'hepsi', ad: 'Herkes' },
  { kod: 'bana', ad: 'Bana atanan' },
  { kod: 'atanmamis', ad: 'Atanmamış' },
]

const IG_IKON = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14"><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#f9ce34"/><stop offset="0.5" stop-color="#ee2a7b"/><stop offset="1" stop-color="#6228d7"/></linearGradient></defs><circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.2" fill="#fff"/></svg>')

function zaman(t) {
  if (!t) return ''
  const d = new Date(t), fark = (Date.now() - d.getTime()) / 1000
  if (fark < 60) return 'az önce'
  if (fark < 3600) return `${Math.floor(fark / 60)}d`
  if (fark < 86400) return `${Math.floor(fark / 3600)}s`
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

// META 24 SAAT YANIT PENCERESİ.
//
// Müşterinin son mesajından itibaren 24 saat içinde DM ile yanıt verilebilir. Süre
// dolduktan sonra uygulamadan yanıt GÖNDERİLEMEZ — Meta API "(#10)" ile reddeder.
// 7 güne uzatan HUMAN_AGENT etiketi `human_agent` iznine bağlı ve bu uygulamada YOK
// (ölçüldü: token'da 14 izin var, o yok); izin App Review onayı ister.
//
// Bu yüzden tek savunma ERKEN UYARI: personel süre dolmadan görsün. Ölçüm (2026-08-04):
// 125 konuşma yanıtsız kalmıştı ve bir kısmı pencereyi 30 dakikayla kaçırmıştı.
const PENCERE_SAAT = 24
// 8 saat: mağazanın vardiya düzenine göre seçildi (kullanıcı kararı, 2026-08-04).
// Kırmızıya döndüğünde aynı vardiya içinde yetişilebilecek kadar süre kalmış olur.
const UYARI_SAAT = 8

// Kalan süreyi döndürür. null = rozet gösterme (yanıtlanmış ya da gelen mesaj yok).
function yanitSuresi(satir) {
  // Yalnız DM: yorumlarda böyle bir pencere yok, orada her zaman yanıt verilebilir.
  if (satir.kind !== 'dm' || !satir.son_gelen) return null
  if (!satir.cevapsiz) return null // yanıtlanmışsa geri sayıma gerek yok
  const gecen = (Date.now() - new Date(satir.son_gelen).getTime()) / 3600000
  const kalan = PENCERE_SAAT - gecen
  if (kalan <= 0) return { doldu: true }
  return { doldu: false, kalan, acil: kalan <= UYARI_SAAT }
}

function YanitSuresi({ satir }) {
  const s = yanitSuresi(satir)
  if (!s) return null
  if (s.doldu) {
    return (
      <span title="24 saatlik yanıt penceresi doldu — uygulamadan yanıt gönderilemez. Instagram uygulamasından veya Meta Business Suite'ten elle yanıtlayın."
        className="inline-flex items-center gap-1 mt-1 text-[10px] text-gray-600 bg-gray-100 rounded-full px-1.5 py-0.5">
        ⌛ süre doldu
      </span>
    )
  }
  const metin = s.kalan >= 1 ? `${Math.floor(s.kalan)} saat kaldı` : `${Math.ceil(s.kalan * 60)} dk kaldı`
  return (
    <span title="Meta'nın 24 saatlik yanıt penceresinde kalan süre. Dolduktan sonra uygulamadan yanıt gönderilemez."
      className={`inline-flex items-center gap-1 mt-1 text-[10px] rounded-full px-1.5 py-0.5 ${
        s.acil ? 'text-red-700 bg-red-50 font-semibold' : 'text-amber-700 bg-amber-50'}`}>
      {s.acil ? '⏰' : '⏳'} {metin}
    </span>
  )
}

// Süzgeç çipi — seçili durumda dolu, değilken sade. Renk süzgeç grubunu ayırt ettirir.
const CIP_RENK = {
  amber: 'bg-amber-500 border-amber-500',
  blue: 'bg-blue-600 border-blue-600',
  emerald: 'bg-emerald-600 border-emerald-600',
}
function FiltreCip({ secili, onClick, renk, pasif, children }) {
  return (
    <button type="button" onClick={onClick} disabled={pasif}
      className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors disabled:opacity-40
        ${secili ? `${CIP_RENK[renk]} text-white font-medium` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
      {children}
    </button>
  )
}

// konuId verilirse Instagram DM'lerinde müşterinin profil fotoğrafı gösterilir.
// Facebook Messenger'da Meta profil fotoğrafına izin vermiyor ((#3) capability hatası),
// orada harf-avatar kalır — bu bir eksiklik değil, platform kısıtı.
function Avatar({ ad, platform, boyut = 40, konuId }) {
  // Harf SADELEŞMİŞ addan alınır: ham tanıtıcıda baştaki "@" avatarda
  // görünüp bütün müşterileri birbirinin aynısı yapıyordu.
  const harf = adBasHarfi(ad)
  const harfAvatar = (
    <div className="w-full h-full rounded-full bg-marka-50 border border-marka-100 flex items-center justify-center text-marka-900 font-semibold"
      style={{ fontSize: boyut * 0.4 }}>{harf}</div>
  )
  const rozet = { width: boyut * 0.36, height: boyut * 0.36 }
  return (
    <div className="relative flex-shrink-0" style={{ width: boyut, height: boyut }}>
      <SosyalGorsel konuId={platform === 'instagram' ? konuId : null} tur="profil"
        className="w-full h-full rounded-full object-cover bg-gray-100" yedek={harfAvatar} />
      {/* Messenger rozetinde eskiden src="" olan bir <img> vardı; boş src tarayıcıyı
          sayfanın kendisine istek atmaya zorluyordu (her satırda bir kez). Düz div yeter. */}
      {platform === 'instagram' && (
        <img src={IG_IKON} alt="" className="absolute -bottom-0.5 -right-0.5 rounded" style={rozet} />
      )}
      {platform === 'facebook' && (
        <div className="absolute -bottom-0.5 -right-0.5 rounded" style={{ ...rozet, background: '#1877f2' }} />
      )}
      {platform === 'youtube' && (
        <div className="absolute -bottom-0.5 -right-0.5 rounded-[3px] flex items-center justify-center"
          style={{ ...rozet, background: '#ff0000' }}>
          <div style={{ width: 0, height: 0, marginLeft: 1,
            borderTop: `${rozet.height * 0.18}px solid transparent`,
            borderBottom: `${rozet.height * 0.18}px solid transparent`,
            borderLeft: `${rozet.width * 0.3}px solid white` }} />
        </div>
      )}
    </div>
  )
}

export default function SosyalMedya() {
  const { profil } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''

  const [sekmeKod, setSekmeKod] = useState('hepsi')
  const sekme = SEKMELER.find(s => s.kod === sekmeKod)
  const [sayaclar, setSayaclar] = useState({})
  const [arama, setArama] = useState('')
  // Arama kutusu her tuş vuruşunda 500 gönderi + 200 konuşma sorgusunu baştan
  // çalıştırıyordu (ilişkili alt sorgularla birlikte) → yazarken gözle görülür takılma.
  // Kutu anında yanıt vermeye devam eder, sorgu yalnız yazma durunca çalışır.
  const [aramaGec, setAramaGec] = useState('')
  useEffect(() => {
    const z = setTimeout(() => setAramaGec(arama), 300)
    return () => clearTimeout(z)
  }, [arama])
  const [tarihBas, setTarihBas] = useState('') // tarih filtresi (YYYY-MM-DD)
  const [tarihBit, setTarihBit] = useState('')
  const [cevapDurumu, setCevapDurumu] = useState('hepsi')
  const [okunma, setOkunma] = useState('hepsi')
  const [atama, setAtama] = useState('hepsi')
  // Son N gün kısayolu → başlangıç tarihini ayarlar (bitiş boş = bugüne kadar).
  const sonGun = (n) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1))
    setTarihBas(d.toISOString().slice(0, 10)); setTarihBit('')
  }
  const [liste, setListe] = useState([])          // sol: gönderiler veya konuşmalar
  const [seciliKonu, setSeciliKonu] = useState(null) // seçili gönderi/konuşma (konu_id + meta)
  const [mesajlar, setMesajlar] = useState([])    // orta: seçili konunun mesajları/yorumları
  const [taslak, setTaslak] = useState('')
  const [ozelMesaj, setOzelMesaj] = useState(null) // yorumdan mesaj gönderilecek yorum (id)
  const [ozelTaslak, setOzelTaslak] = useState('')
  const [cekiliyor, setCekiliyor] = useState(false)
  const [mesgul, setMesgul] = useState(false)
  const [durum, setDurum] = useState(null)       // bağlantı durumu (token günü, kurulu mu)
  const [sonDurum, setSonDurum] = useState(null) // son arka plan senkron turunun özeti
  const [hizliYanitlar, setHizliYanitlar] = useState(VARSAYILAN_YANITLAR) // personel hazır yanıtları
  const kaydirmaRef = useRef(null)
  // O an AÇIK olan konuşmanın kimliği. Geciken mesaj isteklerinin, kullanıcı başka
  // konuşmaya geçtikten sonra ekranı ezmesini engeller (bkz. mesajlariTazele).
  const acikKonuRef = useRef(null)

  // Hazır yanıtları ayarlardan yükle (meta_ayarlar.hizli_yanitlar).
  useEffect(() => {
    metaApi.ayarGetir().then(a => setHizliYanitlar(yanitlariCoz(a?.hizli_yanitlar))).catch(() => {})
  }, [])

  // Ekle/sil sonrası: önce ekranı güncelle, sonra yerel'e yaz (gizli anahtarlara
  // dokunmaz), sonra diğer PC'ler görsün diye buluta yükle (Ayarlar deseniyle aynı).
  const hizliKaydet = useCallback(async (yeniListe) => {
    setHizliYanitlar(yeniListe)
    try {
      await metaApi.ayarKaydet({ hizli_yanitlar: JSON.stringify(yeniListe) })
      bulutaYukle().catch(() => {}) // sessiz: yerel kayıt yeterli, bulut fırsatçı
    } catch (e) { toast.error('Hazır yanıt kaydedilemedi: ' + e.message) }
  }, [])

  const sayaclariYukle = useCallback(() => { sosyalApi.sayaclar({ kullanici }).then(setSayaclar).catch(() => {}) }, [kullanici])

  // Bağlantı + son senkron durumunu yükle (token uyarısı ve sessiz hata göstergesi için).
  const durumYukle = useCallback(() => {
    metaApi.durum().then(setDurum).catch(() => {})
    metaApi.sonDurum().then(setSonDurum).catch(() => {})
  }, [])
  // Arka planda tur atlanır, öne gelince anında tazelenir (useGorunurAralik).
  useGorunurAralik(durumYukle, 60 * 1000)

  // Sol liste: sekme moduna göre gönderiler / konuşmalar / karma.
  const listeYukle = useCallback(async () => {
    try {
      const pf = sekme.platform || 'hepsi'
      const tf = {
        baslangic: tarihBas || undefined, bitis: tarihBit || undefined,
        cevapDurumu, okunma, atama, kullanici,
      }
      let sonuc = []
      if (sekme.mod === 'sorular') {
        sonuc = (await sosyalApi.sorular({ arama: aramaGec, atama, kullanici })).map(x => ({ ...x, kind: 'soru' }))
      } else if (sekme.mod === 'yorum') {
        sonuc = (await sosyalApi.gonderiler({ platform: pf, arama: aramaGec, ...tf })).map(x => ({ ...x, kind: 'yorum' }))
      } else if (sekme.mod === 'dm') {
        sonuc = (await sosyalApi.konusmalar({ platform: pf, arama: aramaGec, ...tf })).map(x => ({ ...x, kind: 'dm' }))
      } else {
        const [g, k] = await Promise.all([
          sosyalApi.gonderiler({ platform: 'hepsi', arama: aramaGec, ...tf }),
          sosyalApi.konusmalar({ platform: 'hepsi', arama: aramaGec, ...tf }),
        ])
        sonuc = [...g.map(x => ({ ...x, kind: 'yorum' })), ...k.map(x => ({ ...x, kind: 'dm' }))]
          .sort((a, b) => String(b.son_zaman || '').localeCompare(String(a.son_zaman || '')))
      }
      setListe(sonuc)
    } catch (e) { toast.error('Liste yüklenemedi: ' + e.message) }
  }, [sekme, aramaGec, tarihBas, tarihBit, cevapDurumu, okunma, atama, kullanici])

  useEffect(() => { listeYukle(); sayaclariYukle() }, [listeYukle, sayaclariYukle])
  useEffect(() => { setSeciliKonu(null); setMesajlar([]) }, [sekmeKod])

  // AÇIK konuşmanın mesajlarını yeniden yükler. Seçime ve yazılmakta olan taslağa
  // DOKUNMAZ — "tazele" ile "yeni konuşma seç" bilerek ayrı tutulur.
  //
  // NEDEN AYRI (2026-08-03 hatası): yanıt gönderdikten sonra tazeleme için konuSec()
  // çağrılıyordu; konuSec seçimi ve taslağı sıfırladığı için, gönderim ağda sürerken
  // kullanıcı başka müşteriye geçip yazmaya başlarsa geciken yanıt ekranı ZORLA eski
  // konuşmaya geri alıp yazılan metni siliyordu. Hızlı yanıt verirken birebir bu oluyordu.
  const mesajlariTazele = useCallback(async (konuId) => {
    const hedef = konuId || acikKonuRef.current
    if (!hedef) return
    try {
      const m = await sosyalApi.konu(hedef)
      // Yanıt gecikirken kullanıcı başka konuşmaya geçmiş olabilir → geç geleni yut.
      if (acikKonuRef.current !== hedef) return
      setMesajlar(m)
    } catch (e) { toast.error(e.message) }
  }, [])

  async function konuSec(satir) {
    if (!satir) return
    acikKonuRef.current = satir.konu_id
    setSeciliKonu(satir)
    setTaslak(''); setOzelMesaj(null)
    setMesajlar([]) // önceki konuşmanın mesajları yeni başlığın altında görünmesin
    // BİLEREK okundu YAPMIYORUZ: mesaj yanıtlanana (veya elle işaretlenene) kadar
    // "okunmadı" kalmalı — sadece açıp bakmak rozeti söndürmesin (istek 2026-07-28).
    await mesajlariTazele(satir.konu_id)
  }

  // Elle "okundu" işaretleme: yanıt gerektirmeyen konuşmalar için (yoksa rozet hiç sönmez).
  async function okunduIsaretle() {
    try {
      const m = await sosyalApi.konu(seciliKonu.konu_id)
      const yeniler = m.filter(x => x.durum === 'yeni' && x.yon === 'gelen')
      for (const y of yeniler) await sosyalApi.durumGuncelle({ id: y.id, durum: 'okundu' }).catch(() => {})
      toast.success('Okundu işaretlendi')
      sayaclariYukle(); listeYukle(); mesajlariTazele()
    } catch (e) { toast.error(e.message) }
  }

  useEffect(() => {
    if (kaydirmaRef.current && seciliKonu?.kind === 'dm') kaydirmaRef.current.scrollTop = kaydirmaRef.current.scrollHeight
  }, [mesajlar, seciliKonu])

  async function cek() {
    setCekiliyor(true)
    try {
      // YouTube sekmesindeyken Meta'yı çekmek yanlış olurdu: kullanıcı gördüğü
      // listenin tazelenmesini bekler. Kaynak, açık sekmenin platformudur.
      if (sekme?.platform === 'youtube') {
        const r = await youtubeApi.yorumCek()
        toast.success(`${r.satir} yorum güncellendi (${r.konu} konu)`)
        listeYukle(); sayaclariYukle(); mesajlariTazele()
        return
      }
      const r = await metaApi.cek()
      const toplam = (r.fbYorum || 0) + (r.igYorum || 0) + (r.fbDm || 0) + (r.igDm || 0)
      toast.success(`${toplam} öğe güncellendi`)
      listeYukle(); sayaclariYukle(); durumYukle()
      mesajlariTazele()
    } catch (e) { toast.error('Çekme hatası: ' + e.message) }
    finally { setCekiliyor(false) }
  }


  // Konuşmayı/gönderiyi personele ata (boş = atamayı bırak). "Kim neye bakıyor" takibi.
  async function banaAta(konu, kaldir = false) {
    try {
      await sosyalApi.ataKonu({ konu_id: konu.konu_id, kullanici: kaldir ? '' : kullanici })
      toast.success(kaldir ? 'Atama kaldırıldı' : `Size atandı`)
      setSeciliKonu(s => s && s.konu_id === konu.konu_id ? { ...s, atanan: kaldir ? null : kullanici } : s)
      listeYukle()
    } catch (e) { toast.error(e.message) }
  }

  // Gönderim ağda sürerken kullanıcı başka konuşmaya geçebilir. Taslak kutusu bu yüzden
  // yanıt BEKLENMEDEN boşaltılır; gönderim başarısız olursa metin yalnızca HÂLÂ aynı
  // konuşmadaysak geri konur (yoksa yeni konuşmada yazılanı ezerdi).
  function taslagiGeriKoy(hedefKonu, metin, setici) {
    if (acikKonuRef.current === hedefKonu) setici(metin)
  }

  // DM sohbetine yanıt: son gelen mesajın id'siyle cevapla.
  async function dmGonder() {
    if (!taslak.trim()) return
    const songelen = [...mesajlar].reverse().find(m => m.yon === 'gelen')
    if (!songelen) { toast.error('Yanıtlanacak gelen mesaj yok.'); return }
    const hedefKonu = seciliKonu?.konu_id
    const metin = taslak
    setTaslak('')
    setMesgul(true)
    try {
      await metaApi.mesajCevapla({ id: songelen.id, metin, kullanici })
      toast.success('Mesaj gönderildi')
      mesajlariTazele(hedefKonu)
      // Yanıt konuşmanın okunmamışlarını kapattı → rozet ve sol liste ANINDA tazelensin
      // (eskiden konuyu açmak okundu yapıp tazeliyordu; artık yanıt anı tetikler).
      sayaclariYukle(); listeYukle()
    } catch (e) {
      toast.error('Gönderilemedi: ' + e.message)
      taslagiGeriKoy(hedefKonu, metin, setTaslak)
    }
    finally { setMesgul(false) }
  }

  // Yorumun KENDİSİ geçilir, yalnız id değil: yanıtın hangi API'ye gideceğini
  // satırdaki platform belirler. Sadece id geçseydi burada tekrar sorgu gerekirdi.
  async function yorumCevapla(yorum) {
    if (!taslak.trim()) return
    const hedefKonu = seciliKonu?.konu_id
    const metin = taslak
    setTaslak('')
    setMesgul(true)
    try {
      if (yorum.platform === 'youtube') {
        // YouTube'da yanıt, yorumun YEREL id'siyle değil harici_id ile verilir.
        // Durum ve "kim yanıtladı" işaretini modül yazar (Meta'daki gibi).
        await youtubeApi.yorumYanitla({ harici_id: yorum.harici_id, metin, kullanici })
      } else {
        await metaApi.yorumCevapla({ id: yorum.id, metin, kullanici })
      }
      toast.success('Yoruma yanıt verildi')
      mesajlariTazele(hedefKonu)
      sayaclariYukle(); listeYukle()
    } catch (e) {
      toast.error('Gönderilemedi: ' + e.message)
      taslagiGeriKoy(hedefKonu, metin, setTaslak)
    }
    finally { setMesgul(false) }
  }

  async function ozelMesajGonder() {
    if (!ozelTaslak.trim() || !ozelMesaj) return
    const hedefKonu = seciliKonu?.konu_id
    const metin = ozelTaslak
    const hedefYorum = ozelMesaj
    setOzelMesaj(null); setOzelTaslak('')
    setMesgul(true)
    try {
      const r = await metaApi.yorumdanMesaj({ id: hedefYorum, metin, kullanici })
      // konusmaId dolduysa mesaj DM sekmesindeki konuşmaya da işlendi; boşsa konuşma
      // çözülemedi (mesaj yine de gitti) → polling sonra yakalar, kullanıcıyı yanıltma.
      toast.success(r?.konusmaId
        ? 'Özel mesaj gönderildi (konuşma Instagram sekmesine eklendi)'
        : 'Özel mesaj gönderildi (konuşma birazdan Instagram sekmesine düşecek)')
      mesajlariTazele(hedefKonu) // "Mesaj gönderildi" işareti hemen görünsün
      sayaclariYukle(); listeYukle()
    } catch (e) {
      toast.error('Gönderilemedi: ' + e.message)
      if (acikKonuRef.current === hedefKonu) { setOzelMesaj(hedefYorum); setOzelTaslak(metin) }
    }
    finally { setMesgul(false) }
  }

  // --- "Sorular" sekmesi eylemleri (08.09.2026) ---
  // Soru satırı seçilince sağda gönderinin yorumları açılır ama yalnız BU yorum ve yanıtları
  // gösterilir (YorumGorunum'a süzülmüş liste geçilir).
  async function soruSec(s) {
    acikKonuRef.current = s.konu_id
    setSeciliKonu({ ...s, kind: 'soru', konu_baslik: s.gonderi_baslik, konu_link: s.gonderi_link })
    setTaslak(''); setOzelMesaj(null); setMesajlar([])
    await mesajlariTazele(s.konu_id)
  }
  async function soruUstlen(s) {
    try {
      await sosyalApi.ata({ id: s.id, kullanici })
      toast.success('Size atandı'); listeYukle()
    } catch (e) { toast.error(e.message) }
  }
  async function soruOkundu(s) {
    try {
      await sosyalApi.durumGuncelle({ id: s.id, durum: 'okundu' })
      sayaclariYukle(); listeYukle()
    } catch (e) { toast.error(e.message) }
  }
  // "DM'den yanıtla": teşekkür DM'i (private reply) gittiyse Meta recipient_id döndürmüştü
  // (ozel_mesaj_alici). O kimlikle konuşma bulunur ve DM görünümü açılır. Yoksa yorum başına
  // tek olan özel-yanıt hakkı henüz kullanılmamıştır → önce "yoruma özel mesaj" gönderilmeli.
  async function dmDenYanitla(s) {
    if (!s.ozel_mesaj_alici) {
      toast.error('Bu müşteriyle henüz DM yok. Önce "Yoruma özel mesaj" gönderin, sonra DM\'den devam edebilirsiniz.')
      return
    }
    try {
      const k = (await sosyalApi.konusmalar({ platform: s.platform })).find(x => x.gonderen_id === s.ozel_mesaj_alici)
      if (!k) { toast.error('Konuşma henüz çekilmedi; "↻ Yenile" deyip tekrar deneyin.'); return }
      await konuSec({ ...k, kind: 'dm', soruKaynak: s })
    } catch (e) { toast.error(e.message) }
  }

  const tokenGun = durum?.token_gun_kaldi
  const tokenUyari = durum?.kurulu && tokenGun != null && tokenGun <= TOKEN_UYARI_GUN

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Token süresi dolmak üzere uyarısı — dolarsa tüm çekme/cevaplama durur. */}
      {tokenUyari && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 flex items-center gap-2">
          <span>⚠️</span>
          <span className="flex-1">
            Meta bağlantı token’ı <b>{tokenGun <= 0 ? 'doldu' : `${tokenGun} gün sonra dolacak`}</b>.
            Kesintisiz çalışması için <b>Ayarlar → Sosyal Medya</b>’dan yeni token girip “Kurulumu Tamamla” yapın.
          </span>
        </div>
      )}

      {/* Üst sekmeler */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b overflow-x-auto">
        {SEKMELER.map(s => {
          const n = sayaclar[s.sayacKey] || 0
          const aktif = s.kod === sekmeKod
          return (
            <button key={s.kod} onClick={() => setSekmeKod(s.kod)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors
                ${aktif
                  ? 'border-krem-400 text-marka-900 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-marka-900'}`}>
              {s.ad}
              {n > 0 && <span className="bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{n}</span>}
            </button>
          )
        })}
        {/* Sessiz hata göstergesi: arka plan senkronu console'a yutuyordu; artık son turun
            durumu burada görünür (yeşil = sorunsuz, kırmızı = hata; üzerine gelince ayrıntı). */}
        {sonDurum?.zaman && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 flex-shrink-0"
            title={sonDurum.hata ? `Son senkron hatası:\n${sonDurum.hata}` : 'Son senkron sorunsuz'}>
            <span className={`w-2 h-2 rounded-full ${sonDurum.hata ? 'bg-red-500' : 'bg-emerald-500'}`} />
            Senkron: {zaman(sonDurum.zaman)}
          </span>
        )}
        <button onClick={cek} disabled={!!cekiliyor}
          className={`${sonDurum?.zaman ? 'ml-2' : 'ml-auto'} text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex-shrink-0`}>
          {cekiliyor === true ? 'Çekiliyor…' : '↻ Yenile'}
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* SOL: liste */}
        <div className="w-[340px] flex-shrink-0 border-r flex flex-col">
          <div className="p-3 space-y-2">
            {/* Tümü / Bana atananlar — bölümlü anahtar (08.09.2026, seçim 2A). DM ve karma
                modda atama çiplerinin yerini alır; aynı `atama` state'ini kullanır. */}
            {(sekme.mod === 'dm' || sekme.mod === 'karma') && (
              <div className="inline-flex border border-marka-100 rounded-lg overflow-hidden text-[13px]">
                {[['hepsi', 'Tümü', sayaclar[sekme.sayacKey] || 0], ['bana', 'Bana atananlar', sayaclar.bana || 0]].map(([kod, ad, n]) => (
                  <button key={kod} type="button" onClick={() => setAtama(kod)} disabled={kod === 'bana' && !kullanici}
                    className={`px-3.5 py-1.5 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40
                      ${atama === kod ? 'bg-marka-900 text-white' : 'text-marka-400 hover:bg-gray-50'}`}>
                    {ad}
                    {n > 0 && <span className={`text-[10px] rounded-full px-1.5 ${atama === kod ? 'bg-red-600 text-white' : 'bg-marka-100 text-marka-400'}`}>{n}</span>}
                  </button>
                ))}
              </div>
            )}
            <input value={arama} onChange={e => setArama(e.target.value)} placeholder="🔍  Ara"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-marka-400 focus:ring-2 focus:ring-marka-50" />
            {/* Tarih filtresi: gönderileri/konuşmaları tarihe göre süz. */}
            <div className="flex items-center gap-1">
              <input type="date" value={tarihBas} onChange={e => setTarihBas(e.target.value)} title="Başlangıç"
                className="flex-1 min-w-0 border rounded px-1.5 py-1 text-xs" />
              <span className="text-gray-400 text-xs">–</span>
              <input type="date" value={tarihBit} onChange={e => setTarihBit(e.target.value)} title="Bitiş"
                className="flex-1 min-w-0 border rounded px-1.5 py-1 text-xs" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <button onClick={() => sonGun(7)} className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">Son 7 gün</button>
              <button onClick={() => sonGun(30)} className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">Son 30 gün</button>
              {(tarihBas || tarihBit) && (
                <button onClick={() => { setTarihBas(''); setTarihBit('') }} className="px-2 py-0.5 text-red-500 hover:underline">✕ Temizle</button>
              )}
            </div>

            {/* Durum süzgeçleri: "cevapsız" günlük iş listesi, "okunmamış" ise henüz
                bakılmamışlar. Aynı veriden gelmezler (durum üç değerli). */}
            <div className="flex flex-wrap gap-1">
              {CEVAP_SECENEK.map(o => (
                <FiltreCip key={o.kod} secili={cevapDurumu === o.kod}
                  onClick={() => setCevapDurumu(o.kod)} renk="amber">{o.ad}</FiltreCip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {OKUNMA_SECENEK.map(o => (
                <FiltreCip key={o.kod} secili={okunma === o.kod}
                  onClick={() => setOkunma(o.kod)} renk="blue">{o.ad}</FiltreCip>
              ))}
            </div>
            {/* Yorum modunda atama çipleri kalır (DM/karma'da yukarıdaki anahtar var). */}
            {sekme.mod !== 'dm' && sekme.mod !== 'karma' && (
              <div className="flex flex-wrap gap-1">
                {ATAMA_SECENEK.map(o => (
                  <FiltreCip key={o.kod} secili={atama === o.kod}
                    onClick={() => setAtama(o.kod)} renk="emerald"
                    pasif={o.kod === 'bana' && !kullanici}>{o.ad}</FiltreCip>
                ))}
              </div>
            )}
            {(cevapDurumu !== 'hepsi' || okunma !== 'hepsi' || atama !== 'hepsi') && (
              <button onClick={() => { setCevapDurumu('hepsi'); setOkunma('hepsi'); setAtama('hepsi') }}
                className="text-[11px] text-red-500 hover:underline">✕ Süzgeçleri temizle</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {liste.length === 0 && (
              sekmeKod === 'instagram' && sonDurum?.igDmEngel ? (
                // IG conversations uç noktası ağır → bazen timeout/kod 1 döner; App Review değil.
                <div className="m-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1.5">
                  <p className="font-semibold">⏳ Instagram DM'ler yükleniyor…</p>
                  <p>Instagram'ın mesaj listesi uç noktası yavaş çalışıyor (her istek ~25 sn). Birkaç kez
                    <b> "↻ Yenile"</b> demen ya da otomatik senkronu beklemen gerekebilir — mesajlar geldikçe burada listelenir.</p>
                  <p className="text-amber-600">Facebook Messenger ve tüm yorumlar normal çalışıyor.</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center p-8">Kayıt yok.<br />"↻ Yenile" ile çekin.</p>
              )
            )}
            {sekme.mod === 'sorular' && (
              <SorularListesi sorular={liste} seciliId={seciliKonu?.kind === 'soru' ? seciliKonu.id : null}
                onSec={soruSec} onUstlen={soruUstlen} onOkundu={soruOkundu} kullanici={kullanici} />
            )}
            {sekme.mod !== 'sorular' && liste.map(satir => {
              const secili = seciliKonu?.konu_id === satir.konu_id
              const baslik = satir.kind === 'yorum' ? (satir.konu_baslik || '(gönderi)') : adSadelestir(satir.kisi || 'Müşteri', 28)
              // Yorum satırında ASIL kimlik son yorumcudur; gönderi adı bağlamdır.
              // Bu yüzden ad ayrı ve belirgin, gönderi adı ikincil yazılır.
              const sonKisi = satir.kind === 'yorum' ? adSadelestir(satir.son_yorumcu || '', 22) : ''
              return (
                <button key={satir.kind + satir.konu_id} onClick={() => konuSec(satir)}
                  className={`group w-full text-left px-3 py-3 flex gap-3 items-start border-l-[3px] transition-colors
                    ${secili ? 'bg-marka-50 border-krem-400' : 'border-transparent hover:bg-gray-50'}`}>
                  {satir.kind === 'yorum'
                    ? <SosyalGorsel konuId={satir.konu_id} className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100"
                        yedek={<Avatar ad={baslik} platform={satir.platform} />} />
                    : <Avatar ad={baslik} platform={satir.platform} konuId={satir.konu_id} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      {/* AD ÖNCE ve BELİRGİN: listede aranan şey "kim yazdı"dır,
                          hangi videoya yazdığı ikinci sorudur. */}
                      <span className={`text-[15px] leading-tight truncate flex-1 ${satir.okunmamis ? 'font-bold text-marka-900' : 'font-semibold text-gray-800'}`}>
                        {sonKisi || baslik}
                      </span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{zaman(satir.son_zaman)}</span>
                    </div>
                    {satir.kind === 'yorum'
                      ? (
                        <p className="text-[12px] text-gray-500 truncate mt-0.5">
                          {baslik}
                          <span className="text-gray-400"> · {satir.yorum_sayisi} yorum</span>
                        </p>
                      )
                      : <p className={`text-[13px] truncate mt-0.5 ${satir.okunmamis ? 'text-gray-700' : 'text-gray-500'}`}>{satir.son_metin || ''}</p>}
                    <div className="flex items-center gap-1 flex-wrap">
                      <YanitSuresi satir={satir} />
                      {satir.atanan && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">
                          👤 {satir.atanan}
                        </span>
                      )}
                    </div>
                  </div>
                  {satir.okunmamis > 0 && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />}
                  {/* Üstlen / Bırak — yalnız DM satırında, üzerine gelince (seçim 2A). */}
                  {satir.kind === 'dm' && kullanici && (
                    <span role="button" tabIndex={-1}
                      onClick={e => { e.stopPropagation(); banaAta(satir, satir.atanan === kullanici) }}
                      className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 flex-shrink-0 mt-0.5 transition-opacity">
                      {satir.atanan === kullanici ? 'Bırak' : 'Üstlen'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ORTA + SAĞ: detay */}
        {!seciliKonu ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Soldan bir gönderi veya konuşma seçin.</div>
        ) : seciliKonu.kind === 'dm' ? (
          <DmGorunum konu={seciliKonu} mesajlar={mesajlar} taslak={taslak} setTaslak={setTaslak}
            gonder={dmGonder} mesgul={mesgul} kaydirmaRef={kaydirmaRef}
            banaAta={banaAta} kullanici={kullanici} okunduIsaretle={okunduIsaretle}
            hizliYanitlar={hizliYanitlar} hizliKaydet={hizliKaydet} />
        ) : seciliKonu.kind === 'soru' ? (
          // Sorular sekmesi: gönderinin yorumlarından YALNIZ seçili soru ve yanıtları.
          // Üstte "DM'den yanıtla"; altta mevcut yorum görünümü (açık yanıt + yoruma özel mesaj).
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-krem-50 text-[12px] text-marka-900">
              <span className="font-semibold">❓ Fiyat dışı soru</span>
              <span className="text-marka-400 truncate">· {seciliKonu.gonderi_baslik || 'Gönderi'}</span>
              <button type="button" onClick={() => dmDenYanitla(seciliKonu)}
                className="ml-auto bg-marka-900 text-white text-xs font-medium px-3 py-1 rounded-full hover:bg-marka-700">
                DM'den yanıtla
              </button>
            </div>
            <YorumGorunum konu={seciliKonu}
              yorumlar={mesajlar.filter(y => y.id === seciliKonu.id || y.ust_id === seciliKonu.harici_id)}
              taslak={taslak} setTaslak={setTaslak}
              cevapla={yorumCevapla} mesgul={mesgul}
              ozelMesaj={ozelMesaj} setOzelMesaj={setOzelMesaj} ozelTaslak={ozelTaslak} setOzelTaslak={setOzelTaslak}
              ozelGonder={ozelMesajGonder} banaAta={banaAta} kullanici={kullanici} okunduIsaretle={okunduIsaretle}
              hizliYanitlar={hizliYanitlar} hizliKaydet={hizliKaydet} />
          </div>
        ) : (
          <YorumGorunum konu={seciliKonu} yorumlar={mesajlar} taslak={taslak} setTaslak={setTaslak}
            cevapla={yorumCevapla} mesgul={mesgul}
            ozelMesaj={ozelMesaj} setOzelMesaj={setOzelMesaj} ozelTaslak={ozelTaslak} setOzelTaslak={setOzelTaslak}
            ozelGonder={ozelMesajGonder} banaAta={banaAta} kullanici={kullanici} okunduIsaretle={okunduIsaretle}
            hizliYanitlar={hizliYanitlar} hizliKaydet={hizliKaydet} />
        )}
      </div>
    </div>
  )
}

// Atama kontrolü: atanmışsa kimin baktığını gösterir + kaldır; değilse "Bana ata".
function AtamaButonu({ konu, banaAta, kullanici }) {
  const atanan = konu.atanan
  if (atanan) {
    const bende = atanan === kullanici
    return (
      <div className="ml-auto flex items-center gap-2 text-xs flex-shrink-0">
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 rounded-full px-2 py-1">
          👤 {atanan}{bende ? ' (siz)' : ''}
        </span>
        <button onClick={() => banaAta(konu, true)} className="text-gray-400 hover:text-gray-600" title="Atamayı kaldır">✕</button>
      </div>
    )
  }
  return (
    <button onClick={() => banaAta(konu)}
      className="ml-auto flex-shrink-0 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-3 py-1.5">
      Bana ata
    </button>
  )
}

// Şablon seçici: otomasyon şablon kütüphanesini mesajlaşmada da kullanılır kılar.
// Tıklanınca metin OTOMASYONLA AYNI üreticiden (canlı fiyatla) gelir ve yanıt kutusuna eklenir.
function SablonSecici({ onSec }) {
  const [acik, setAcik] = useState(false)
  const [sablonlar, setSablonlar] = useState(null) // null = henüz yüklenmedi
  const [arama, setArama] = useState('')
  const [yonet, setYonet] = useState(false) // şablon kütüphanesi modalı (oluştur/düzenle/sil)
  const aramaRef = useRef(null)
  const ac = () => {
    setAcik(a => !a)
    if (sablonlar === null) sosyalApi.sablonlar().then(setSablonlar).catch(() => setSablonlar([]))
  }
  // Kütüphane kapanınca listeyi tazele — orada eklenen/düzenlenen şablon seçicide hemen görünsün.
  const yonetKapat = () => {
    setYonet(false)
    sosyalApi.sablonlar().then(setSablonlar).catch(() => {})
  }
  // Kutu açılınca imleç doğrudan aramaya gitsin — personel yazmaya başlayabilsin.
  useEffect(() => { if (acik) aramaRef.current?.focus() }, [acik])
  // Kapanışta aramayı temizle: bir sonraki açılışta eski süzgeç kalmasın.
  useEffect(() => { if (!acik) setArama('') }, [acik])

  // Arama ŞABLON ADI + ÜRÜN ADI üzerinde çalışır: personel bazen şablonu adıyla
  // ("kargo bilgisi"), bazen içindeki ürünle ("granit tencere") arıyor.
  // eslesirMi ortak Türkçe aramadır — harfleri KATLAR, yani "celik" yazan
  // "ÇELİK"i bulur ve kelime sırası önemsizdir (bkz. src/utils/arama.js).
  const suzulmus = (sablonlar || []).filter(
    s => !arama.trim() || eslesirMi(`${s.ad || ''} ${s.urun_adi || ''}`, arama)
  )
  const sec = async (s) => {
    try {
      const r = await sosyalApi.sablonMetin(s.id)
      if (r?.metin) onSec(r.metin)
      if (r?.asildi) toast('Dikkat: mesaj 1000 karakteri aşıyor, göndermeden kısaltın.', { icon: '⚠️' })
      setAcik(false)
    } catch (e) { toast.error(e.message) }
  }
  return (
    <div className="relative inline-block">
      <button type="button" onClick={ac} className="text-xs text-violet-600 hover:underline ml-3">
        📦 Şablonlar
      </button>
      {acik && (
        <div className="absolute bottom-full mb-1 left-0 z-10 w-80 bg-white border rounded-lg shadow-lg p-1 max-h-72 flex flex-col">
          <div className="px-1.5 py-1 text-[11px] font-semibold text-gray-500 flex-shrink-0 flex items-center justify-between">
            <span>
              Otomasyon şablonları
              {sablonlar?.length > 0 && (
                <span className="font-normal text-gray-400"> · {suzulmus.length}/{sablonlar.length}</span>
              )}
            </span>
            <button type="button" onClick={() => { setAcik(false); setYonet(true) }}
              className="text-violet-600 hover:underline font-normal">⚙️ Yönet</button>
          </div>
          {/* Arama kutusu listenin ÜSTÜNDE sabit kalır (flex-shrink-0), liste kayar. */}
          {sablonlar?.length > 0 && (
            <input
              ref={aramaRef}
              value={arama}
              onChange={e => setArama(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setAcik(false) } }}
              placeholder="Şablon veya ürün ara…"
              className="flex-shrink-0 mx-1 mb-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
          )}
          <div className="overflow-y-auto">
          {sablonlar === null && <p className="text-[11px] text-gray-400 px-2 py-1.5">Yükleniyor…</p>}
          {sablonlar?.length === 0 && (
            <p className="text-[11px] text-gray-400 px-2 py-1.5">Şablon yok. "⚙️ Yönet" ile ekleyebilirsiniz.</p>
          )}
          {sablonlar?.length > 0 && suzulmus.length === 0 && (
            <p className="text-[11px] text-gray-400 px-2 py-1.5">"{arama}" ile eşleşen şablon yok.</p>
          )}
          {suzulmus.map(s => (
            <button key={s.id} type="button" onClick={() => sec(s)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-violet-50 text-gray-700">
              <span className="font-medium">{s.ad}</span>
              {s.tur === 'genel'
                ? <span className="text-gray-400"> · genel</span>
                : <span className="text-gray-400"> · {s.urun_adi}{(s.fiyat ?? s.kaynak_fiyati) ? ` · ${Number(s.fiyat ?? s.kaynak_fiyati).toLocaleString('tr-TR')} TL` : ''}</span>}
            </button>
          ))}
          </div>
        </div>
      )}
      {/* Şablon kütüphanesi modalı — mesajlaşmadan ayrılmadan oluştur/düzenle/sil.
          (13.08 isteği: şablon yönetimi yalnız yorum otomasyon panelindeydi.) */}
      {yonet && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={yonetKapat}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-auto p-5"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">📦 Şablon Kütüphanesi</h3>
            <SablonKutuphanesi kapat={yonetKapat} />
          </div>
        </div>
      )}
    </div>
  )
}

// Hazır yanıt seçici: tıklanınca metni yanıt kutusuna ekler. Düzenle modunda
// satır silme (×) ve alttaki kutudan yeni yanıt ekleme yapılabilir.
function HizliYanitlar({ onSec, yanitlar = [], onKaydet }) {
  const [acik, setAcik] = useState(false)
  const [duzenle, setDuzenle] = useState(false)
  const [yeni, setYeni] = useState('')

  const ekle = () => {
    const t = yeni.trim()
    if (!t) return
    if (yanitlar.includes(t)) { setYeni(''); return } // aynısı varsa tekrar ekleme
    onKaydet?.([...yanitlar, t])
    setYeni('')
  }
  const sil = (i) => onKaydet?.(yanitlar.filter((_, idx) => idx !== i))

  return (
    <div className="relative mb-2">
      <button type="button" onClick={() => setAcik(a => !a)} className="text-xs text-blue-600 hover:underline">
        ⚡ Hazır yanıtlar
      </button>
      {acik && (
        <div className="absolute bottom-full mb-1 left-0 z-10 w-80 bg-white border rounded-lg shadow-lg p-1 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between px-1.5 py-1">
            <span className="text-[11px] font-semibold text-gray-500">Hazır yanıtlar</span>
            <button type="button" onClick={() => setDuzenle(d => !d)}
              className="text-[11px] text-blue-600 hover:underline">
              {duzenle ? 'Bitti' : '✎ Düzenle'}
            </button>
          </div>
          {yanitlar.length === 0 && (
            <p className="text-[11px] text-gray-400 px-2 py-1.5">Henüz hazır yanıt yok. Aşağıdan ekleyin.</p>
          )}
          {yanitlar.map((t, i) => (
            <div key={i} className="group flex items-center gap-1">
              <button type="button" disabled={duzenle}
                onClick={() => { onSec(t); setAcik(false) }}
                className="flex-1 text-left text-xs px-2 py-1.5 rounded hover:bg-blue-50 text-gray-700 disabled:hover:bg-transparent disabled:cursor-default">
                {t}
              </button>
              {duzenle && (
                <button type="button" onClick={() => sil(i)} title="Sil"
                  className="text-gray-400 hover:text-red-600 px-1.5 text-sm flex-shrink-0">×</button>
              )}
            </div>
          ))}
          {duzenle && (
            <div className="flex items-center gap-1 mt-1 p-1 border-t">
              <input value={yeni} onChange={e => setYeni(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ekle() } }}
                placeholder="Yeni hazır yanıt…"
                className="flex-1 text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <button type="button" onClick={ekle} disabled={!yeni.trim()}
                className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 flex-shrink-0">Ekle</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Mesaj eki (hikaye yanıtı / paylaşılan gönderi / görsel-video) balon içinde gösterilir.
// Hikaye CDN linki hikaye silinince (24 saat) ölür → görsel yüklenmezse etiket yine kalır.
const EK_ETIKET = {
  hikaye_yanit: '📖 Hikayeye yanıt verdi',
  hikaye_bahsi: '📖 Hikayede bahsetti',
  paylasim: '🔗 Gönderi paylaştı',
  gorsel: '📷 Görsel',
  video: '🎬 Video',
  dosya: '📎 Dosya',
  sablon: '🛍️ Ürün kartı',                 // Meta'dan çekilen kendi kartımız (eko benimsenmediyse)
  bilinmeyen: '📎 İçerik görüntülenemiyor', // ham_ek'te saklı; ölçülüp yeni tip eklenecek
}
const HIKAYE_TURLERI = new Set(['hikaye_yanit', 'hikaye_bahsi'])
function MesajEki({ m, bizden }) {
  // Hikaye CDN linki hikaye silinince (24 saat) ölür → görsel yerine "hikaye silinmiş" yer
  // tutucu (08.09.2026). Eskiden img gizleniyor, metin de yoksa balon BOŞ kalıyordu.
  const [olu, setOlu] = useState(false)
  if (!m.ek_tur) return null
  const etiket = EK_ETIKET[m.ek_tur] || '📎 Ek'
  const hikaye = HIKAYE_TURLERI.has(m.ek_tur)
  const ic = (
    <div className={`rounded-xl overflow-hidden mb-1 ${bizden ? 'bg-marka-700/60' : 'bg-white border border-gray-300'}`}>
      {m.ek_gorsel && !olu && (
        <img src={m.ek_gorsel} alt="" loading="lazy"
          className="max-h-52 w-full object-cover"
          onError={() => setOlu(true)} />
      )}
      {hikaye && (olu || !m.ek_gorsel) && (
        <div className="w-[120px] h-[80px] m-2 rounded-md bg-marka-50 flex items-center justify-center text-[12px] text-marka-400">
          hikaye silinmiş
        </div>
      )}
      <div className={`px-2.5 py-1.5 text-xs ${bizden ? 'text-marka-50' : 'text-gray-600'}`}>
        {etiket}{m.ek_baslik && !etiket.includes(m.ek_baslik) ? ` — ${m.ek_baslik}` : ''}
      </div>
    </div>
  )
  return m.ek_link
    ? <a href={m.ek_link} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">{ic}</a>
    : ic
}

// --- DM görünümü: sohbet balonları ---
function DmGorunum({ konu, mesajlar, taslak, setTaslak, gonder, mesgul, kaydirmaRef, banaAta, kullanici, okunduIsaretle, hizliYanitlar, hizliKaydet }) {
  const kisi = adSadelestir(
    [...mesajlar].reverse().find(m => m.yon === 'gelen')?.gonderen_ad || konu.kisi || 'Müşteri',
  )
  const ekle = (t) => setTaslak(v => v && v.trim() ? `${v.trim()} ${t}` : t)
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-white">
        <Avatar ad={kisi} platform={konu.platform} boyut={40} konuId={konu.konu_id} />
        <div className="text-[17px] font-bold text-marka-900 truncate tracking-tight">{kisi}</div>
        <AtamaButonu konu={konu} banaAta={banaAta} kullanici={kullanici} />
        {okunduIsaretle && (
          <button type="button" onClick={okunduIsaretle} title="Yanıt vermeden okunmadı rozetini kapat"
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 hover:underline flex-shrink-0">
            ✓ Okundu işaretle
          </button>
        )}
      </div>
      <div ref={kaydirmaRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-kagit">
        {mesajlar.map(m => {
          const bizden = m.yon === 'giden'
          // Bizim ürün kartımız: balon yerine Instagram'daki gibi tam kart (seçim 3B).
          if (m.ek_tur === 'urun_karti') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%]">
                  <UrunKartiBalonu m={m} />
                  <div className="text-[10px] mt-1 text-right text-gray-400">{zaman(m.mesaj_tarihi)}{m.cevaplayan_kullanici ? ` · ${m.cevaplayan_kullanici}` : ''}</div>
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className={`flex ${bizden ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap
                ${bizden
                  ? 'bg-marka-900 text-white rounded-br-md'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm'}`}>
                <MesajEki m={m} bizden={bizden} />
                {m.metin}
                <div className={`text-[10px] mt-1 ${bizden ? 'text-white/60' : 'text-gray-400'}`}>{zaman(m.mesaj_tarihi)}{m.cevaplayan_kullanici ? ` · ${m.cevaplayan_kullanici}` : ''}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="p-3 border-t">
        <div className="flex items-center">
          <HizliYanitlar onSec={ekle} yanitlar={hizliYanitlar} onKaydet={hizliKaydet} />
          <div className="mb-2"><SablonSecici onSec={ekle} /></div>
        </div>
        <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-marka-400 focus-within:ring-2 focus-within:ring-marka-50 transition-colors">
          <textarea value={taslak} onChange={e => setTaslak(e.target.value)} rows={1}
            // İçerik uzadıkça kutu kendiliğinden büyür (maks ~14 satır, sonrası kaydırma) —
            // sabit yükseklikte üstteki satırlar görünmez kalıyordu.
            ref={el => {
              if (!el) return
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 320)}px`
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder() } }}
            placeholder={`${konu.platform === 'instagram' ? 'Instagram' : 'Messenger'}'da yanıtla…`}
            className="flex-1 bg-transparent resize-none text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none overflow-y-auto"
            style={{ maxHeight: 320 }} />
          <button onClick={gonder} disabled={mesgul || !taslak.trim()}
            className="bg-marka-900 text-white text-sm font-medium px-5 py-1.5 rounded-full hover:bg-marka-700 disabled:opacity-40 transition-colors">Gönder</button>
        </div>
      </div>
    </div>
  )
}

// --- Yorum görünümü: orta yorum listesi + sağ gönderi önizleme ---
function YorumGorunum({ konu, yorumlar, taslak, setTaslak, cevapla, mesgul, ozelMesaj, setOzelMesaj, ozelTaslak, setOzelTaslak, ozelGonder, banaAta, kullanici, okunduIsaretle, hizliYanitlar, hizliKaydet }) {
  // Üst (kök) yorumlar = gelen ve bir üst yoruma bağlı OLMAYANLAR. Yanıtlar (ust_id dolu)
  // burada değil, ait oldukları yorumun altında iç içe gösterilir. Üstü yüklü değilse
  // (nadir) yorum yine kök olarak görünsün diye hariciSet kontrolü yapılır.
  const hariciSet = new Set(yorumlar.map(y => y.harici_id))
  const ustler = yorumlar.filter(y => y.yon === 'gelen' && (!y.ust_id || !hariciSet.has(y.ust_id)))
  const [cevapId, setCevapId] = useState(null) // yalnızca bu yorumun yanıt kutusu açık
  const [uretiliyor, setUretiliyor] = useState(null) // yanıt önerisi üretilen yorumun id'si
  const [uyari, setUyari] = useState('')             // denetime takılan ifadeler
  const ekle = (t) => setTaslak(v => v && v.trim() ? `${v.trim()} ${t}` : t)

  // Yoruma yanıt ÖNERİSİ üretir ve kutuya yazar. GÖNDERMEZ.
  //
  // Kullanıcı "butona basınca yanıt versin" dedi; araya tek bir onay adımı
  // koyuyorum çünkü metin herkese açık kanalda mağazayı temsil ediyor ve aynı
  // model bu projede daha önce olmayan özellik uydurdu. Metin kutuya hazır
  // düşüyor, göndermek tek tık.
  async function yanitUret(y) {
    setUretiliyor(y.id)
    setUyari('')
    try {
      const r = await aiApi.yorumYanitOner({ harici_id: y.harici_id })
      setTaslak(r.metin)
      if (!r.temiz) setUyari(r.ozet)
      else toast.success(`Yanıt hazır (${r.model})`)
    } catch (e) {
      toast.error('Üretilemedi: ' + e.message)
    } finally { setUretiliyor(null) }
  }
  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 border-r">
        {/* Gönderi başlığı */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-white">
          <SosyalGorsel konuId={konu.konu_id} className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-marka-900 truncate">{konu.konu_baslik || 'Gönderi'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{konu.yorum_sayisi} yorum</p>
          </div>
          <div className="ml-auto flex items-center gap-3 flex-shrink-0">
            <AtamaButonu konu={konu} banaAta={banaAta} kullanici={kullanici} />
            {okunduIsaretle && (
              <button type="button" onClick={okunduIsaretle} title="Yanıt vermeden okunmadı rozetini kapat"
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline">✓ Okundu işaretle</button>
            )}
            {konu.konu_link && <a href={konu.konu_link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-marka-900 font-medium hover:underline">Gönderiyi aç ↗</a>}
          </div>
        </div>
        {/* Yorumlar */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-kagit">
          {ustler.map(y => {
            // Bu yorumun altındaki TÜM yanıtlar: müşteri yanıtları (gelen) + bizim yanıtlarımız (giden), zaman sırasıyla.
            const cocuklar = yorumlar.filter(r => r.ust_id === y.harici_id)
              .sort((a, b) => (a.mesaj_tarihi || '').localeCompare(b.mesaj_tarihi || ''))
            return (
              <div key={y.id} className="flex gap-3">
                <Avatar ad={y.gonderen_ad} platform={konu.platform} boyut={34} />
                <div className="min-w-0 flex-1">
                  {/* AD, metinle AYNI satırda değil: satır içi ad, uzun yorumların
                      arasında kayboluyordu. Ayrı satır + koyu marka rengi ile
                      "kim yazdı" bir bakışta okunuyor. */}
                  <p className="text-[14px] font-bold text-marka-900 leading-tight mb-1" title={y.gonderen_ad}>
                    {adSadelestir(y.gonderen_ad)}
                  </p>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3.5 py-2.5 inline-block max-w-full shadow-sm">
                    <span className="text-[14px] leading-relaxed text-gray-900 whitespace-pre-wrap">{y.metin}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 pl-1">
                    <span>{zaman(y.mesaj_tarihi)}</span>
                    <button onClick={() => { setCevapId(cevapId === y.id ? null : y.id); setTaslak(''); setOzelMesaj(null); setUyari('') }}
                      className="text-marka-900 hover:underline font-semibold">Yanıtla</button>
                    {/* YouTube'da ÖZEL MESAJ API'si YOKTUR — Instagram/Messenger'daki DM yarısı
                        buraya taşınamaz. Düğme görünseydi metaApi.yorumdanMesaj çağrılır ve
                        her denemede hataya düşerdi. Yanıt yalnızca yorum altına yazılabilir. */}
                    {y.platform === 'youtube' ? (
                      <span className="text-gray-400" title="YouTube özel mesaj API'si sunmuyor; yanıt yalnızca yorum altına yazılabilir.">
                        mesaj yok
                      </span>
                    ) : y.ozel_mesaj_tarihi ? (
                      <span className="text-blue-600" title={`Özel mesaj gönderildi: ${zaman(y.ozel_mesaj_tarihi)} (yorum başına tek hak)`}>
                        💬 Mesaj gönderildi
                      </span>
                    ) : (
                      <>
                        <button onClick={() => { setOzelMesaj(y.id); setOzelTaslak(''); setCevapId(null) }} className="text-blue-600 hover:underline font-medium">Mesaj gönder</button>
                        {/* Otomasyon denedi ve başarısız oldu → sessizce kaybolmasın, sebebi görünsün. */}
                        {y.ozel_mesaj_hata && (
                          <span className="text-red-500" title={`${y.ozel_mesaj_deneme} deneme — son hata: ${y.ozel_mesaj_hata}`}>
                            ⚠ gönderilemedi
                          </span>
                        )}
                      </>
                    )}
                    {y.cevaplayan_kullanici && <span className="text-emerald-600">✓ {y.cevaplayan_kullanici}</span>}
                  </div>
                  {/* Yanıtlar: bizimkiler marka renginde, müşteri yanıtları girintili yorum olarak. */}
                  {cocuklar.map(r => r.yon === 'giden' ? (
                    <div key={r.id} className="mt-2 ml-4 flex gap-2 items-start">
                      <span className="text-marka-400 text-sm leading-6">↳</span>
                      <div className="bg-marka-900 text-white rounded-2xl rounded-tl-md px-3.5 py-2 text-[13px] leading-relaxed">
                        <span className="block text-[10px] uppercase tracking-wide text-white/50 mb-0.5">Yanıtınız</span>
                        {r.metin}
                      </div>
                    </div>
                  ) : (
                    <div key={r.id} className="mt-2 ml-4 flex gap-2">
                      <Avatar ad={r.gonderen_ad} platform={konu.platform} boyut={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-marka-900 leading-tight mb-0.5">{adSadelestir(r.gonderen_ad)}</p>
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2 inline-block max-w-full">
                          <span className="text-[13px] leading-relaxed text-gray-900 whitespace-pre-wrap">{r.metin}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 pl-1">{zaman(r.mesaj_tarihi)}</div>
                      </div>
                    </div>
                  ))}
                  {/* Yoruma yanıt kutusu — yalnızca "Yanıtla" ile açılır */}
                  {cevapId === y.id && (
                    <div className="mt-2">
                      <div className="flex items-center">
                        <HizliYanitlar onSec={ekle} yanitlar={hizliYanitlar} onKaydet={hizliKaydet} />
                        <div className="mb-2"><SablonSecici onSec={ekle} /></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input value={taslak} onChange={e => setTaslak(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') cevapla(y) }}
                          placeholder="Herkese açık yanıt yaz…"
                          className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-marka-400 focus:ring-2 focus:ring-marka-50" />
                        {/* YouTube'da yanıt önerisi: model yorumu okuyup taslak yazar.
                            DOĞRUDAN GÖNDERMEZ — metin kutuya düşer, gönderme kararı sizde.
                            Sebebi ölçülmüş: aynı model 07.09'da olmayan "titanyum gövde"
                            ve "çizilmez" yazdı. Burası herkese açık bir kanal. */}
                        {y.platform === 'youtube' && (
                          <button type="button" onClick={() => yanitUret(y)} disabled={uretiliyor === y.id}
                            title="Yoruma göre yanıt taslağı üret (göndermez)"
                            className="text-[13px] font-medium px-3 py-1.5 rounded-full border border-krem-400 bg-krem-50 text-krem-600 hover:bg-krem-200 disabled:opacity-50 whitespace-nowrap transition-colors">
                            {uretiliyor === y.id ? 'Yazıyor…' : '✨ Yanıt üret'}
                          </button>
                        )}
                        <button onClick={() => cevapla(y)} disabled={mesgul || !taslak.trim()}
                          className="bg-marka-900 text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-marka-700 disabled:opacity-40 whitespace-nowrap transition-colors">Gönder</button>
                      </div>
                      {uyari && (
                        <p className="mt-1.5 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                          ⚠ Üretilen metinde denetime takılan ifade var, göndermeden düzeltin:<br />{uyari}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Özel mesaj (private reply) kutusu */}
                  {ozelMesaj === y.id && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-[11px] text-blue-700 mb-1">💬 {y.gonderen_ad} kullanıcısına özel mesaj:</p>
                      <SablonSecici onSec={t => setOzelTaslak(v => v && v.trim() ? `${v.trim()} ${t}` : t)} />
                      <div className="flex items-center gap-2">
                        <input value={ozelTaslak} onChange={e => setOzelTaslak(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') ozelGonder() }}
                          placeholder="Özel mesaj…" className="flex-1 border rounded-full px-3 py-1.5 text-sm focus:outline-none" />
                        <button onClick={ozelGonder} disabled={mesgul || !ozelTaslak.trim()}
                          className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-full disabled:opacity-40">Gönder</button>
                        <button onClick={() => setOzelMesaj(null)} className="text-gray-400 text-sm">✕</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* SAĞ: gönderi önizleme + otomasyon */}
      <div className="w-[340px] flex-shrink-0 p-4 bg-gray-50 overflow-y-auto hidden lg:block space-y-3">
        <div>
          {/* Tek görsel ve tam genişlikte gösteriliyor → küçültülmüş sürüm bulanık kalır. */}
          <SosyalGorsel konuId={konu.konu_id} boyut="tam" className="w-full rounded-lg object-cover mb-3"
            yedek={<div className="w-full aspect-square rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 mb-3">Görsel yok</div>} />
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{konu.konu_baslik}</p>
          <p className="text-xs text-gray-400 mt-2">{konu.yorum_sayisi} yorum</p>
          {konu.konu_link && <a href={konu.konu_link} target="_blank" rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-blue-600 hover:underline">Gönderiyi görüntüle ↗</a>}
        </div>
        {/* OtomasyonPaneli yoruma OZEL MESAJ (DM) gonderir; YouTube'da ozel mesaj API'si
            YOKTUR. Panel orada da cizilirse acilabilir hale gelir ve yurutucu her turda
            YouTube yorum kimlikleriyle Meta Graph'a istek atip basarisiz olur.
            Ayni aile: v1.2.196'da gizlenen "Mesaj gonder" dugmesi. Backend de ayrica
            reddeder (sosyal-otomasyon.js) — arayuze tek basina guvenilmez. */}
        {konu.platform === 'youtube'
          ? <YoutubeIstatistik konu={konu} />
          : <OtomasyonPaneli konu={konu} />}
      </div>
    </>
  )
}
