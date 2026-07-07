import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { sosyalApi, metaApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'

// Üst sekmeler — Meta Business Suite düzeni. mod: 'karma'|'dm'|'yorum'
const SEKMELER = [
  { kod: 'hepsi', ad: 'Tüm mesajlar', mod: 'karma', sayacKey: 'hepsi' },
  { kod: 'messenger', ad: 'Messenger', mod: 'dm', platform: 'facebook', sayacKey: 'messenger' },
  { kod: 'instagram', ad: 'Instagram', mod: 'dm', platform: 'instagram', sayacKey: 'instagram_dm' },
  { kod: 'fb_yorum', ad: 'Facebook yorumları', mod: 'yorum', platform: 'facebook', sayacKey: 'fb_yorum' },
  { kod: 'ig_yorum', ad: 'Instagram yorumları', mod: 'yorum', platform: 'instagram', sayacKey: 'ig_yorum' },
]

// Personelin tek dokunuşla ekleyebileceği hazır yanıtlar (mağaza sık kullanılan cevaplar).
const HIZLI_YANITLAR = [
  'Merhaba, size nasıl yardımcı olabiliriz? 😊',
  'İlginiz için teşekkürler! En kısa sürede dönüş yapacağız.',
  'Ürünümüz stoklarımızda mevcuttur. 🙌',
  'Fiyat ve sipariş için bize DM’den ulaşabilirsiniz.',
  'Siparişiniz hazırlanıyor, kargoya verilince bilgilendireceğiz. 📦',
  'Değerli yorumunuz için teşekkür ederiz! ❤️',
]

// Token dolmadan bu kadar gün önce sarı uyarı göster.
const TOKEN_UYARI_GUN = 10

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

function Avatar({ ad, platform, boyut = 40 }) {
  const harf = (ad || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="relative flex-shrink-0" style={{ width: boyut, height: boyut }}>
      <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-semibold"
        style={{ fontSize: boyut * 0.4 }}>{harf}</div>
      {platform && (
        <img src={platform === 'instagram' ? IG_IKON : ''} alt=""
          className="absolute -bottom-0.5 -right-0.5 rounded"
          style={{ width: boyut * 0.36, height: boyut * 0.36, background: platform === 'facebook' ? '#1877f2' : 'transparent' }} />
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
  const kaydirmaRef = useRef(null)

  const sayaclariYukle = useCallback(() => { sosyalApi.sayaclar().then(setSayaclar).catch(() => {}) }, [])

  // Bağlantı + son senkron durumunu yükle (token uyarısı ve sessiz hata göstergesi için).
  const durumYukle = useCallback(() => {
    metaApi.durum().then(setDurum).catch(() => {})
    metaApi.sonDurum().then(setSonDurum).catch(() => {})
  }, [])
  useEffect(() => {
    durumYukle()
    const i = setInterval(durumYukle, 60 * 1000)
    return () => clearInterval(i)
  }, [durumYukle])

  // Sol liste: sekme moduna göre gönderiler / konuşmalar / karma.
  const listeYukle = useCallback(async () => {
    try {
      const pf = sekme.platform || 'hepsi'
      let sonuc = []
      if (sekme.mod === 'yorum') {
        sonuc = (await sosyalApi.gonderiler({ platform: pf, arama })).map(x => ({ ...x, kind: 'yorum' }))
      } else if (sekme.mod === 'dm') {
        sonuc = (await sosyalApi.konusmalar({ platform: pf, arama })).map(x => ({ ...x, kind: 'dm' }))
      } else {
        const [g, k] = await Promise.all([
          sosyalApi.gonderiler({ platform: 'hepsi', arama }),
          sosyalApi.konusmalar({ platform: 'hepsi', arama }),
        ])
        sonuc = [...g.map(x => ({ ...x, kind: 'yorum' })), ...k.map(x => ({ ...x, kind: 'dm' }))]
          .sort((a, b) => String(b.son_zaman || '').localeCompare(String(a.son_zaman || '')))
      }
      setListe(sonuc)
    } catch (e) { toast.error('Liste yüklenemedi: ' + e.message) }
  }, [sekme, arama])

  useEffect(() => { listeYukle(); sayaclariYukle() }, [listeYukle, sayaclariYukle])
  useEffect(() => { setSeciliKonu(null); setMesajlar([]) }, [sekmeKod])

  async function konuSec(satir) {
    setSeciliKonu(satir)
    setTaslak(''); setOzelMesaj(null)
    try {
      const m = await sosyalApi.konu(satir.konu_id)
      setMesajlar(m)
      // Yeni gelenleri okundu yap.
      const yeniler = m.filter(x => x.durum === 'yeni' && x.yon === 'gelen')
      for (const y of yeniler) await sosyalApi.durumGuncelle({ id: y.id, durum: 'okundu' }).catch(() => {})
      if (yeniler.length) { sayaclariYukle(); listeYukle() }
    } catch (e) { toast.error(e.message) }
  }

  useEffect(() => {
    if (kaydirmaRef.current && seciliKonu?.kind === 'dm') kaydirmaRef.current.scrollTop = kaydirmaRef.current.scrollHeight
  }, [mesajlar, seciliKonu])

  async function cek() {
    setCekiliyor(true)
    try {
      const r = await metaApi.cek()
      const toplam = (r.fbYorum || 0) + (r.igYorum || 0) + (r.fbDm || 0) + (r.igDm || 0)
      toast.success(`${toplam} öğe güncellendi`)
      listeYukle(); sayaclariYukle(); durumYukle()
      if (seciliKonu) konuSec(seciliKonu)
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

  // DM sohbetine yanıt: son gelen mesajın id'siyle cevapla.
  async function dmGonder() {
    if (!taslak.trim()) return
    const songelen = [...mesajlar].reverse().find(m => m.yon === 'gelen')
    if (!songelen) { toast.error('Yanıtlanacak gelen mesaj yok.'); return }
    setMesgul(true)
    try {
      await metaApi.mesajCevapla({ id: songelen.id, metin: taslak, kullanici })
      toast.success('Mesaj gönderildi'); setTaslak(''); konuSec(seciliKonu)
    } catch (e) { toast.error('Gönderilemedi: ' + e.message) }
    finally { setMesgul(false) }
  }

  async function yorumCevapla(yorumId) {
    if (!taslak.trim()) return
    setMesgul(true)
    try {
      await metaApi.yorumCevapla({ id: yorumId, metin: taslak, kullanici })
      toast.success('Yoruma yanıt verildi'); setTaslak(''); konuSec(seciliKonu)
    } catch (e) { toast.error('Gönderilemedi: ' + e.message) }
    finally { setMesgul(false) }
  }

  async function ozelMesajGonder() {
    if (!ozelTaslak.trim() || !ozelMesaj) return
    setMesgul(true)
    try {
      await metaApi.yorumdanMesaj({ id: ozelMesaj, metin: ozelTaslak, kullanici })
      toast.success('Kullanıcıya özel mesaj gönderildi'); setOzelMesaj(null); setOzelTaslak('')
    } catch (e) { toast.error('Gönderilemedi: ' + e.message) }
    finally { setMesgul(false) }
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
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg whitespace-nowrap border-b-2 -mb-px transition-colors
                ${aktif ? 'border-blue-600 text-blue-600 font-semibold bg-blue-50/40' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
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
        <button onClick={cek} disabled={cekiliyor}
          className={`${sonDurum?.zaman ? 'ml-2' : 'ml-auto'} text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex-shrink-0`}>
          {cekiliyor ? 'Çekiliyor…' : '↻ Yenile'}
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* SOL: liste */}
        <div className="w-[340px] flex-shrink-0 border-r flex flex-col">
          <div className="p-3">
            <input value={arama} onChange={e => setArama(e.target.value)} placeholder="🔍  Ara"
              className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
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
            {liste.map(satir => {
              const secili = seciliKonu?.konu_id === satir.konu_id
              const baslik = satir.kind === 'yorum' ? (satir.konu_baslik || '(gönderi)') : (satir.kisi || 'Müşteri')
              const altYazi = satir.kind === 'yorum'
                ? `${satir.son_yorumcu || ''}${satir.son_yorumcu ? ' · ' : ''}${satir.yorum_sayisi} yorum`
                : (satir.son_metin || '')
              return (
                <button key={satir.kind + satir.konu_id} onClick={() => konuSec(satir)}
                  className={`w-full text-left px-3 py-2.5 flex gap-3 items-start border-l-2 ${secili ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50'}`}>
                  {satir.kind === 'yorum' && satir.konu_gorsel
                    ? <img src={satir.konu_gorsel} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100" />
                    : <Avatar ad={baslik} platform={satir.platform} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm truncate flex-1 ${satir.okunmamis ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{baslik}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{zaman(satir.son_zaman)}</span>
                    </div>
                    <p className={`text-xs truncate ${satir.okunmamis ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{altYazi}</p>
                    {satir.atanan && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">
                        👤 {satir.atanan}
                      </span>
                    )}
                  </div>
                  {satir.okunmamis > 0 && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />}
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
            banaAta={banaAta} kullanici={kullanici} />
        ) : (
          <YorumGorunum konu={seciliKonu} yorumlar={mesajlar} taslak={taslak} setTaslak={setTaslak}
            cevapla={yorumCevapla} mesgul={mesgul}
            ozelMesaj={ozelMesaj} setOzelMesaj={setOzelMesaj} ozelTaslak={ozelTaslak} setOzelTaslak={setOzelTaslak}
            ozelGonder={ozelMesajGonder} banaAta={banaAta} kullanici={kullanici} />
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

// Hazır yanıt seçici: tıklanınca metni yanıt kutusuna ekler.
function HizliYanitlar({ onSec }) {
  const [acik, setAcik] = useState(false)
  return (
    <div className="relative mb-2">
      <button type="button" onClick={() => setAcik(a => !a)} className="text-xs text-blue-600 hover:underline">
        ⚡ Hazır yanıtlar
      </button>
      {acik && (
        <div className="absolute bottom-full mb-1 left-0 z-10 w-80 bg-white border rounded-lg shadow-lg p-1 max-h-60 overflow-y-auto">
          {HIZLI_YANITLAR.map((t, i) => (
            <button key={i} type="button" onClick={() => { onSec(t); setAcik(false) }}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-blue-50 text-gray-700">{t}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- DM görünümü: sohbet balonları ---
function DmGorunum({ konu, mesajlar, taslak, setTaslak, gonder, mesgul, kaydirmaRef, banaAta, kullanici }) {
  const kisi = [...mesajlar].reverse().find(m => m.yon === 'gelen')?.gonderen_ad || konu.kisi || 'Müşteri'
  const ekle = (t) => setTaslak(v => v && v.trim() ? `${v.trim()} ${t}` : t)
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center gap-3 px-5 py-3 border-b">
        <Avatar ad={kisi} platform={konu.platform} boyut={38} />
        <div className="font-semibold text-gray-800 truncate">{kisi}</div>
        <AtamaButonu konu={konu} banaAta={banaAta} kullanici={kullanici} />
      </div>
      <div ref={kaydirmaRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-gray-50/50">
        {mesajlar.map(m => {
          const bizden = m.yon === 'giden'
          return (
            <div key={m.id} className={`flex ${bizden ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap
                ${bizden ? 'bg-violet-600 text-white rounded-br-md' : 'bg-gray-200 text-gray-800 rounded-bl-md'}`}>
                {m.metin}
                <div className={`text-[10px] mt-1 ${bizden ? 'text-violet-200' : 'text-gray-400'}`}>{zaman(m.mesaj_tarihi)}{m.cevaplayan_kullanici ? ` · ${m.cevaplayan_kullanici}` : ''}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="p-3 border-t">
        <HizliYanitlar onSec={ekle} />
        <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2">
          <textarea value={taslak} onChange={e => setTaslak(e.target.value)} rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder() } }}
            placeholder={`${konu.platform === 'instagram' ? 'Instagram' : 'Messenger'}'da yanıtla…`}
            className="flex-1 bg-transparent resize-none text-sm focus:outline-none max-h-24" />
          <button onClick={gonder} disabled={mesgul || !taslak.trim()}
            className="bg-violet-600 text-white text-sm px-4 py-1.5 rounded-full hover:bg-violet-700 disabled:opacity-40">Gönder</button>
        </div>
      </div>
    </div>
  )
}

// --- Yorum görünümü: orta yorum listesi + sağ gönderi önizleme ---
function YorumGorunum({ konu, yorumlar, taslak, setTaslak, cevapla, mesgul, ozelMesaj, setOzelMesaj, ozelTaslak, setOzelTaslak, ozelGonder, banaAta, kullanici }) {
  const gelenler = yorumlar.filter(y => y.yon === 'gelen')
  const [cevapId, setCevapId] = useState(null) // yalnızca bu yorumun yanıt kutusu açık
  const ekle = (t) => setTaslak(v => v && v.trim() ? `${v.trim()} ${t}` : t)
  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 border-r">
        {/* Gönderi başlığı */}
        <div className="flex items-center gap-3 px-5 py-3 border-b">
          {konu.konu_gorsel && <img src={konu.konu_gorsel} alt="" className="w-11 h-11 rounded object-cover bg-gray-100" />}
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{konu.konu_baslik || 'Gönderi'}</p>
            <p className="text-xs text-gray-400">{konu.yorum_sayisi} yorum{konu.konu_link ? '' : ''}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 flex-shrink-0">
            <AtamaButonu konu={konu} banaAta={banaAta} kullanici={kullanici} />
            {konu.konu_link && <a href={konu.konu_link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline">Gönderiyi aç ↗</a>}
          </div>
        </div>
        {/* Yorumlar */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {gelenler.map(y => {
            const yanitlar = yorumlar.filter(r => r.yon === 'giden' && r.ust_id === y.harici_id)
            return (
              <div key={y.id} className="flex gap-3">
                <Avatar ad={y.gonderen_ad} platform={konu.platform} boyut={34} />
                <div className="min-w-0 flex-1">
                  <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
                    <span className="font-semibold text-sm text-gray-800">{y.gonderen_ad}</span>{' '}
                    <span className="text-sm text-gray-700">{y.metin}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 pl-2">
                    <span>{zaman(y.mesaj_tarihi)}</span>
                    <button onClick={() => { setCevapId(cevapId === y.id ? null : y.id); setTaslak(''); setOzelMesaj(null) }} className="hover:text-gray-800 font-medium">Yanıtla</button>
                    <button onClick={() => { setOzelMesaj(y.id); setOzelTaslak(''); setCevapId(null) }} className="text-blue-600 hover:underline font-medium">Mesaj gönder</button>
                    {y.cevaplayan_kullanici && <span className="text-emerald-600">✓ {y.cevaplayan_kullanici}</span>}
                  </div>
                  {yanitlar.map(r => (
                    <div key={r.id} className="mt-2 ml-2 text-sm text-gray-600 bg-violet-50 rounded-lg px-3 py-1.5">
                      <b>Yanıtınız:</b> {r.metin}
                    </div>
                  ))}
                  {/* Yoruma yanıt kutusu — yalnızca "Yanıtla" ile açılır */}
                  {cevapId === y.id && (
                    <div className="mt-2">
                      <HizliYanitlar onSec={ekle} />
                      <div className="flex items-center gap-2">
                        <input value={taslak} onChange={e => setTaslak(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') cevapla(y.id) }}
                          placeholder="Herkese açık yanıt yaz…" className="flex-1 border rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        <button onClick={() => cevapla(y.id)} disabled={mesgul || !taslak.trim()}
                          className="text-blue-600 text-sm font-medium disabled:opacity-40">Gönder</button>
                      </div>
                    </div>
                  )}
                  {/* Özel mesaj (private reply) kutusu */}
                  {ozelMesaj === y.id && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-[11px] text-blue-700 mb-1">💬 {y.gonderen_ad} kullanıcısına özel mesaj:</p>
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
      {/* SAĞ: gönderi önizleme */}
      <div className="w-[300px] flex-shrink-0 p-4 bg-gray-50 overflow-y-auto hidden lg:block">
        {konu.konu_gorsel
          ? <img src={konu.konu_gorsel} alt="" className="w-full rounded-lg object-cover mb-3" />
          : <div className="w-full aspect-square rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 mb-3">Görsel yok</div>}
        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{konu.konu_baslik}</p>
        <p className="text-xs text-gray-400 mt-2">{konu.yorum_sayisi} yorum</p>
        {konu.konu_link && <a href={konu.konu_link} target="_blank" rel="noopener noreferrer"
          className="inline-block mt-3 text-xs text-blue-600 hover:underline">Gönderiyi görüntüle ↗</a>}
      </div>
    </>
  )
}
