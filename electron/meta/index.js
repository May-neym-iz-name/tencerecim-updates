// Meta ağ katmanı: Facebook + Instagram yorum/DM çekme ve cevaplama.
// client.js Graph çağrılarını yapar; sosyal-mesajlar.js yerel önbelleğe yazar.
// Polling main.js'ten çağrılır (ikas sipariş polling deseni; public webhook gerekmez).
const client = require('./client')
const { getDb } = require('../db/database')
const { _upsertMesaj } = require('../db/sosyal-mesajlar')

// Son çekme turunun özeti (arka plan polling + manuel). UI "sessiz hata göstergesi"
// bunu okur: arka planda 120 sn'de bir çalışan senkron hataları console'a yutuyordu;
// artık en son turun zamanı/sonucu/hatası burada tutulur, kullanıcı isterse görür.
let _sonDurum = { zaman: null, sonuc: null, hata: null }
function _sonDurumGetir() { return _sonDurum }

// --- ÇEKME -----------------------------------------------------------------

// Polling kapsamı: eski gönderiler kalıcı içeriktir ve aylar sonra bile yeni yorum alır
// (keşfetten gelen trafik). Tek sayfalık (25-40 gönderi) tarama bunları kaçırıyordu; artık
// sayfalama ile son ~150 gönderi taranır. Sayfalama tumSayfalar üzerinden yapılır → Meta
// "kod 1" (veri azalt) dediğinde sayfa boyutu otomatik küçülür.
const POLL_GONDERI_LIMIT = 25
const POLL_MAKS_SAYFA = 6 // 6 × 25 ≈ 150 gönderi

// Facebook Sayfa gönderilerindeki yorumlar (+ yorum yanıtları).
async function cekFacebookYorumlar() {
  const sayfaId = client._sayfaId()
  if (!sayfaId) return 0
  let n = 0
  // comments.order(reverse_chronological): en YENİ yorumlar önce gelsin. Varsayılan
  // kronolojik sırada (en eski önce) sürekli yorum alan gönderilerde yeni yorumlar hep
  // pencerenin dışında kalıp polling'e hiç düşmüyordu.
  // İç comments.limit(25): bir yorumun YANITLARI. Müşteri sorusu çoğu zaman yanıt olarak
  // geliyor; yanıtlar çekilmeyince bu sorular gelen kutusuna hiç düşmüyordu.
  await tumSayfalar(`${sayfaId}/feed`, {
    fields: 'id,message,created_time,full_picture,permalink_url,' +
      'comments.order(reverse_chronological).limit(25){id,message,from,created_time,comments.limit(25){id,message,from,created_time}}',
    limit: POLL_GONDERI_LIMIT,
  }, (data) => {
    for (const gonderi of data) {
      // Gönderinin kendisini kaydet (yorumu olmasa bile listede görünsün).
      const ktx = {
        konu_baslik: gonderi.message || '(görsel gönderi)',
        konu_gorsel: gonderi.full_picture, konu_link: gonderi.permalink_url,
      }
      _upsertMesaj({
        platform: 'facebook', tur: 'gonderi', harici_id: 'g_' + gonderi.id, konu_id: gonderi.id,
        yon: 'giden', metin: gonderi.message || '', mesaj_tarihi: gonderi.created_time, ...ktx,
      })
      for (const y of gonderi.comments?.data || []) {
        _upsertMesaj({
          platform: 'facebook', tur: 'yorum', harici_id: y.id, konu_id: gonderi.id,
          gonderen_id: y.from?.id, gonderen_ad: y.from?.name || 'Facebook kullanıcısı',
          metin: y.message, yon: 'gelen', mesaj_tarihi: y.created_time, ...ktx,
        })
        n++
        for (const r of y.comments?.data || []) {
          _upsertMesaj({
            platform: 'facebook', tur: 'yorum', harici_id: r.id, konu_id: gonderi.id, ust_id: y.id,
            gonderen_id: r.from?.id, gonderen_ad: r.from?.name || 'Facebook kullanıcısı',
            metin: r.message, yon: 'gelen', mesaj_tarihi: r.created_time, ...ktx,
          })
          n++
        }
      }
    }
  }, POLL_MAKS_SAYFA)
  return n
}

// Instagram gönderilerindeki yorumlar (+ yorum yanıtları).
async function cekInstagramYorumlar() {
  const igId = client._igId()
  if (!igId) return 0
  let n = 0
  // 'from' alanı KASITLI istenmez: IG yorumlarında 'from' izni yoksa alanı istemek isteğin
  // tamamını hataya düşürüp gömülü olduğu /media çağrısını kırıyor → hiç IG yorumu düşmüyordu.
  // Yorumcu adı 'username'den, metin 'text'ten gelir.
  // IG comments EN YENİ üst-seviye yorumları döndürür (doğrulandı) → order parametresi gerekmez.
  // replies.limit(25): yanıtlar; müşteri soruları sıkça yanıt olarak geliyor.
  await tumSayfalar(`${igId}/media`, {
    fields: 'id,caption,timestamp,media_url,thumbnail_url,permalink,' +
      'comments.limit(25){id,text,username,timestamp,replies.limit(25){id,text,username,timestamp}}',
    limit: POLL_GONDERI_LIMIT,
  }, (data) => {
    for (const medya of data) {
      const ktx = {
        konu_baslik: medya.caption || '(görsel gönderi)',
        konu_gorsel: medya.thumbnail_url || medya.media_url, konu_link: medya.permalink,
      }
      _upsertMesaj({
        platform: 'instagram', tur: 'gonderi', harici_id: 'g_' + medya.id, konu_id: medya.id,
        yon: 'giden', metin: medya.caption || '', mesaj_tarihi: medya.timestamp, ...ktx,
      })
      for (const y of medya.comments?.data || []) {
        _upsertMesaj({
          platform: 'instagram', tur: 'yorum', harici_id: y.id, konu_id: medya.id,
          gonderen_ad: y.username || 'Instagram kullanıcısı',
          metin: y.text, yon: 'gelen', mesaj_tarihi: y.timestamp, ...ktx,
        })
        n++
        for (const r of y.replies?.data || []) {
          _upsertMesaj({
            platform: 'instagram', tur: 'yorum', harici_id: r.id, konu_id: medya.id, ust_id: y.id,
            gonderen_ad: r.username || 'Instagram kullanıcısı',
            metin: r.text, yon: 'gelen', mesaj_tarihi: r.timestamp, ...ktx,
          })
          n++
        }
      }
    }
  }, POLL_MAKS_SAYFA)
  return n
}

// IG conversations uç noktası ÇOK ağır: büyük limit → "reduce data" (kod 1), yanıt 20+ sn.
// Bu yüzden IG için küçük limit + uzun timeout + savunmacı sayfalama kullanılır.
const IG_KONUSMA_LIMIT = 1   // KANITLANDI: limit 1 ~25 sn'de döner; 2+ timeout/kod 1 riski
const IG_MAX_SAYFA = 5       // tur başına en fazla sayfa (her sayfa ~25 sn)
const IG_LISTE_OPTS = { timeout: 60000, deneme: 1 } // uzun timeout, retry yok (60 sn zaten pahalı)

// IG konuşma id'lerini savunmacı çeker: sayfalama sık kod 1 verir → hata olunca eldekiyle döner.
// Idempotent upsert + 120 sn polling sayesinde yeni gelen DM'ler zamanla yakalanır.
async function igKonusmaIdleri(sayfaId) {
  const idler = []
  let after = null
  for (let sayfa = 0; sayfa < IG_MAX_SAYFA; sayfa++) {
    const params = { platform: 'instagram', fields: 'id', limit: IG_KONUSMA_LIMIT }
    if (after) params.after = after
    let r
    try {
      r = await client.get(`${sayfaId}/conversations`, params, IG_LISTE_OPTS)
    } catch (e) {
      // "reduce data" (kod 1) → aynı sayfayı limit 1 ile bir kez daha dene, olmazsa dur.
      if (IG_KONUSMA_LIMIT > 1 && /kod 1\b/.test(e.message)) {
        try { r = await client.get(`${sayfaId}/conversations`, { ...params, limit: 1 }, IG_LISTE_OPTS) }
        catch { break }
      } else break
    }
    const d = r.data || []
    for (const k of d) idler.push(k.id)
    after = r.paging?.cursors?.after
    if (!after || d.length === 0) break
  }
  return idler
}

// DM mesaj alanları: metin dışı içerik (hikaye yanıtı, paylaşılan gönderi, görsel/video)
// attachments/shares/story alanlarında gelir — istenmezse mesaj BOŞ görünür.
// 'story' yalnız IG'de geçerli; FB isteğine eklenirse alan hatası verir.
const DM_ALANLAR = 'id,message,from,created_time,' +
  'attachments{id,mime_type,name,image_data,video_data,file_url},shares{link,name,description}'
const DM_ALANLAR_IG = DM_ALANLAR + ',story'

// Mesajın metin dışı ekini ayrıştırır → sosyal_mesajlar.ek_* alanları (yoksa null).
// Öncelik: hikaye (IG'ye özgü, en ayırt edici) → paylaşım → medya eki.
// NOT: Hikaye CDN linki hikaye 24 saat sonra silinince ölür; UI bunu bilerek gösterir.
function mesajEki(m) {
  const hikaye = m.story?.reply_to?.link || m.story?.mention?.link
  if (hikaye) {
    const bahis = !m.story?.reply_to?.link
    return {
      ek_tur: bahis ? 'hikaye_bahsi' : 'hikaye_yanit',
      ek_baslik: bahis ? 'Hikayede bahsetti' : 'Hikayeye yanıt',
      ek_gorsel: hikaye, ek_link: hikaye,
    }
  }
  const p = m.shares?.data?.[0]
  if (p && (p.link || p.name || p.description)) {
    return {
      ek_tur: 'paylasim', ek_baslik: p.name || p.description || 'Gönderi paylaşımı',
      ek_gorsel: null, ek_link: p.link || null,
    }
  }
  const a = m.attachments?.data?.[0]
  if (a) {
    const gorsel = a.image_data?.url || a.image_data?.preview_url || a.video_data?.preview_url || null
    return {
      ek_tur: a.video_data ? 'video' : (a.image_data ? 'gorsel' : 'dosya'),
      ek_baslik: a.name || null,
      ek_gorsel: gorsel,
      ek_link: a.video_data?.url || a.file_url || gorsel,
    }
  }
  return null
}

// Konuşmalardan (DM) mesajları çeker. platform: undefined=Facebook, 'instagram'=IG.
async function cekMesajlar(platform) {
  const sayfaId = client._sayfaId()
  if (!sayfaId) return 0
  const igMi = platform === 'instagram'
  // Bizim taraf kimlikleri: FB'de sayfa_id, IG'de mesajların 'from'u IG hesabı id'si olur.
  const bizIdler = new Set([sayfaId, igMi ? client._igId() : null].filter(Boolean))

  // 1) Konuşma id listesi. IG ağır olduğundan özel akış; FB tek hafif istek.
  let konusmaIdleri
  if (igMi) {
    konusmaIdleri = await igKonusmaIdleri(sayfaId)
  } else {
    const liste = await client.get(`${sayfaId}/conversations`, { fields: 'id', limit: 10 })
    konusmaIdleri = (liste.data || []).map(k => k.id)
  }

  let n = 0
  for (const konusmaId of konusmaIdleri) {
    // 2) Her konuşmanın mesajlarını AYRI, hafif istekle çek (bu çağrı hızlı, ~3-4 sn).
    let mesajlar
    try {
      mesajlar = await client.get(`${konusmaId}/messages`, {
        fields: igMi ? DM_ALANLAR_IG : DM_ALANLAR, limit: 10,
      })
    } catch {
      // Zengin alanlar reddedilirse (alan adı/izin) TEMEL alanlarla devam et —
      // ek içerik kaybolur ama DM akışı asla durmaz.
      try {
        mesajlar = await client.get(`${konusmaId}/messages`, {
          fields: 'id,message,from,created_time', limit: 10,
        })
      } catch { continue }
    }
    // Müşteri = mesajlarda bizim taraf DIŞINDAKİ ilk gönderen.
    let musteri = (mesajlar.data || []).map(m => m.from).find(f => f && !bizIdler.has(f.id)) || {}
    // Çekilen pencerede hiç gelen mesaj yoksa (ör. otomasyonun başlattığı DM) gönderenlerden
    // müşteri bulunamaz ve ad "Müşteri" kalırdı → konuşma katılımcılarından bizim taraf
    // olmayanı al. Yalnız bu durumda ek istek atılır (küçük ve hızlı bir çağrı).
    if (!musteri.id) {
      try {
        const kat = await client.get(konusmaId, { fields: 'participants' })
        musteri = (kat.participants?.data || []).find(p => p && !bizIdler.has(p.id)) || {}
      } catch { /* ad 'Müşteri' olarak kalır, akış bozulmaz */ }
    }
    for (const m of mesajlar.data || []) {
      const bizden = bizIdler.has(m.from?.id)
      _upsertMesaj({
        platform: igMi ? 'instagram' : 'facebook', tur: 'dm',
        harici_id: m.id, konu_id: konusmaId,
        gonderen_id: bizden ? musteri.id : (m.from?.id || musteri.id),
        gonderen_ad: bizden ? (musteri.name || musteri.username || 'Müşteri') : (m.from?.name || m.from?.username || musteri.name || 'Müşteri'),
        metin: m.message, yon: bizden ? 'giden' : 'gelen', mesaj_tarihi: m.created_time,
        ...(mesajEki(m) || {}),
      })
      n++
    }
  }
  return n
}

// IG DM son hata kaydı (UI göstergesi için). IG conversations ağır → bazen timeout/kod 1
// döner; hata olsa da diğer kaynakları etkilemez, sadece burada tutulur.
let _igDmSonHata = null

// Tam bir çekme turu. Her kaynak bağımsız try — biri patlarsa diğerleri sürer.
async function tumunuCek() {
  const sonuc = { fbYorum: 0, igYorum: 0, fbDm: 0, igDm: 0, hatalar: [], igDmEngel: null }
  const gorevler = [
    ['fbYorum', () => cekFacebookYorumlar()],
    ['igYorum', () => cekInstagramYorumlar()],
    ['fbDm', () => cekMesajlar()],
    // IG DM: dev modda çalışır ama IG conversations uç noktası ağır (~25 sn/istek).
    // Hata (timeout/kod 1) olsa bile turu bozmaz; son hata _igDmSonHata'da raporlanır.
    ['igDm', async () => {
      if (!client._igId()) return 0
      try {
        const n = await cekMesajlar('instagram')
        _igDmSonHata = null
        return n
      } catch (e) {
        _igDmSonHata = e.message
        return 0
      }
    }],
  ]
  for (const [ad, fn] of gorevler) {
    try { sonuc[ad] = await fn() } catch (e) { sonuc.hatalar.push(`${ad}: ${e.message}`) }
  }
  // Otomasyon: yorumlar çekildikten SONRA çalışır (yeni yorumlar bu turda yakalansın).
  // Hata turu bozmaz — çekme işi otomasyondan bağımsız sürmeli.
  try {
    const { _otomasyonCalistir } = require('./otomasyon')
    sonuc.otomasyon = await _otomasyonCalistir()
  } catch (e) {
    sonuc.hatalar.push(`otomasyon: ${e.message}`)
  }

  // Son tur özetini sakla (UI durum satırı okur). IG DM App Review'a kadar sessizce
  // atlandığı için hatalara girmez → yanlış "hata var" sinyali vermez; ayrı alanda raporlanır.
  sonuc.igDmEngel = _igDmSonHata
  _sonDurum = {
    zaman: new Date().toISOString(),
    sonuc,
    hata: sonuc.hatalar.length ? sonuc.hatalar.join(' | ') : null,
    igDmEngel: sonuc.igDmEngel,
  }
  return sonuc
}

// --- SAYFALAMA YARDIMCILARI (polling turları bunu kullanır) -----------------
// Meta hız-sınırı / geçici hata kodları: bunlarda DURMA, bekleyip AYNI sayfayı tekrar dene.
// 4=uygulama, 17=kullanıcı, 32=sayfa throttle; 613=özel limit; 1=veri azalt; 2=geçici.
const HIZ_SINIRI_KODLARI = new Set([1, 2, 4, 17, 32, 613])
function bekle(ms) { return new Promise(r => setTimeout(r, ms)) }
function hizSiniriMi(e) {
  const m = /kod (\d+)/.exec(e && e.message || '')
  return !!m && HIZ_SINIRI_KODLARI.has(Number(m[1]))
}

// Meta kod 1 = "Please reduce the amount of data you're asking for". Sunucu yüküne göre
// RASTGELE gelir (aynı sorgu bir denemede patlar, sonrakinde döner). Aynı sorguyu tekrar
// denemek işe yaramaz — istenen sayfa boyutunu küçültmek gerekir.
function veriAzaltMi(e) { return /kod 1\b/.test(e && e.message || '') }

const MIN_LIMIT = 5

// Bir uç noktanın tüm sayfalarını cursor ile gezer; her sayfada isleyici(data) çağırır.
// Dayanıklılık: kod 1'de sayfa boyutunu yarıya indirip dener (MIN_LIMIT'e kadar), diğer
// hız-sınırı kodlarında artan beklemeyle 4 kez tekrar dener. İLK sayfa hiç alınamazsa
// hatayı FIRLATIR — eskiden sessizce 0 dönüyordu ve çekim "başarılı ama boş" görünüyordu.
async function tumSayfalar(path, params, isleyici, maksSayfa) {
  let after = null, sayfa = 0
  let limit = Number(params.limit) || 25
  while (sayfa < maksSayfa) {
    let json = null, denendi = 0
    for (;;) {
      const p = { ...params, limit }
      if (after) p.after = after
      try { json = await client.get(path, p, { timeout: 30000, deneme: 2 }); break }
      catch (e) {
        denendi++
        if (veriAzaltMi(e) && limit > MIN_LIMIT) {
          limit = Math.max(MIN_LIMIT, Math.floor(limit / 2))
          await bekle(1000)
          continue
        }
        if (hizSiniriMi(e) && denendi <= 4) { await bekle(2000 * denendi); continue }
        if (sayfa === 0) throw e // hiç veri alamadan bittik → sessiz "0 kayıt" yerine hatayı bildir
        return sayfa            // kısmi veri aldık → eldekiyle dur
      }
    }
    const data = json?.data || []
    if (!data.length) break
    isleyici(data)
    after = json?.paging?.cursors?.after || null
    if (!after) break
    sayfa++
  }
  return sayfa
}

// --- CEVAPLAMA -------------------------------------------------------------

// Yorumu (FB veya IG) yerel id ile bulup Meta'ya cevap yazar, gideni önbelleğe işler.
// kullanici: cevaplayan personel adı ("kim cevapladı" takibi).
async function yorumCevapla({ id, metin, kullanici }) {
  const row = getDb().prepare('SELECT * FROM sosyal_mesajlar WHERE id = ?').get(id)
  if (!row) throw new Error('Yorum bulunamadı.')
  if (!metin || !metin.trim()) throw new Error('Cevap metni boş olamaz.')
  // Facebook ve Instagram farklı uç nokta ister:
  //   FB yorum cevabı → {comment_id}/comments   IG yorum cevabı → {comment_id}/replies
  const ucNokta = row.platform === 'instagram' ? 'replies' : 'comments'
  const cevap = await client.post(`${row.harici_id}/${ucNokta}`, { message: metin.trim() })
  getDb().prepare(
    "UPDATE sosyal_mesajlar SET durum = 'cevaplandi', cevaplayan_kullanici = ? WHERE id = ?"
  ).run(kullanici || null, id)
  if (cevap.id) {
    _upsertMesaj({
      platform: row.platform, tur: 'yorum', harici_id: cevap.id, konu_id: row.konu_id,
      ust_id: row.harici_id, gonderen_ad: `${kullanici || 'Mağaza'} (yanıt)`, metin: metin.trim(),
      yon: 'giden', mesaj_tarihi: new Date().toISOString(),
    })
  }
  return { ok: true }
}

// DM cevabı: {page_id}/messages ile alıcıya (gonderen_id) mesaj gönderir.
async function mesajCevapla({ id, metin, kullanici }) {
  const row = getDb().prepare('SELECT * FROM sosyal_mesajlar WHERE id = ?').get(id)
  if (!row) throw new Error('Mesaj bulunamadı.')
  if (!row.gonderen_id) throw new Error('Alıcı kimliği yok (DM cevabı gönderilemez).')
  if (!metin || !metin.trim()) throw new Error('Cevap metni boş olamaz.')
  const sayfaId = client._sayfaId()
  const govde = {
    recipient: JSON.stringify({ id: row.gonderen_id }),
    message: JSON.stringify({ text: metin.trim() }),
  }
  try {
    // Normal yanıt: müşterinin son mesajından itibaren 24 saat içinde geçerli.
    await client.post(`${sayfaId}/messages`, { ...govde, messaging_type: 'RESPONSE' })
  } catch (e) {
    // Kod 10 = 24 saat penceresi dışında. İnsan temsilci (HUMAN_AGENT) etiketiyle tekrar dene:
    // müşteri hizmetleri yanıtlarına 7 güne kadar izin verir (bu uygulamanın kullanım amacı).
    if (/kod 10\b/.test(e.message)) {
      try {
        await client.post(`${sayfaId}/messages`, { ...govde, messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' })
      } catch (e2) {
        throw new Error('Mesaj gönderilemedi: müşterinin son mesajından 24 saat (insan temsilci etiketiyle 7 gün) geçmiş. Müşteri yeni bir mesaj atınca yanıtlanabilir. Ayrıntı: ' + e2.message)
      }
    } else throw e
  }
  getDb().prepare(
    "UPDATE sosyal_mesajlar SET durum = 'cevaplandi', cevaplayan_kullanici = ? WHERE id = ?"
  ).run(kullanici || null, id)
  _upsertMesaj({
    platform: row.platform, tur: 'dm', harici_id: `giden_${Date.now()}_${id}`, konu_id: row.konu_id,
    gonderen_id: row.gonderen_id, gonderen_ad: `${kullanici || 'Mağaza'} (yanıt)`, metin: metin.trim(),
    yon: 'giden', mesaj_tarihi: new Date().toISOString(),
  })
  return { ok: true }
}

// Yorumdan kullanıcıya ÖZEL mesaj — Messenger Private Replies (Business Suite'teki "Send message").
// Herkese açık yoruma tek seferlik özel DM gönderir; 24 saat penceresi kuralına takılmaz.
//
// FB ve IG AYNI uç noktayı kullanır: POST {PAGE_ID}/messages + recipient.comment_id.
// Meta dokümanı açıkça "the Facebook Page ID, NOT the Instagram User ID" diyor — IG yorumu için de
// Sayfa ID'si kullanılır. {ig_id}/messages Instagram Login akışına aittir; biz Facebook Login +
// Sayfa token'ı kullanıyoruz.
//
// İzinler: instagram_manage_comments + pages_messaging (ikisi de token'da var).
// App Review GEREKMEZ — Meta: "App Review is not required if your app is exclusively for a
// business you own or manage". Sayfa/IG hesabı bizim.
//
// TARİHÇE (2026-07-16): IG dalı {ig_id}/messages'a POST ediyordu → Meta izin hatası veriyordu →
// bu "instagram_manage_messages için App Review şart" sanıldı ve aylarca boşuna onay beklendi.
// Sorun izin değil, YANLIŞ UÇ NOKTAYDI.
async function yorumdanMesaj({ id, metin, kullanici }) {
  const row = getDb().prepare('SELECT * FROM sosyal_mesajlar WHERE id = ?').get(id)
  if (!row) throw new Error('Yorum bulunamadı.')
  if (row.tur !== 'yorum') throw new Error('Bu yalnızca yorumlar için kullanılabilir.')
  if (!metin || !metin.trim()) throw new Error('Mesaj boş olamaz.')
  const sayfaId = client._sayfaId()
  if (!sayfaId) throw new Error('Sayfa bağlı değil (Ayarlar > Sosyal Medya).')
  let yanit
  try {
    yanit = await client.post(`${sayfaId}/messages`, {
      recipient: JSON.stringify({ comment_id: row.harici_id }),
      message: JSON.stringify({ text: metin.trim() }),
    })
  } catch (e) {
    // SEBEP UYDURMA — Meta'nın hatasını olduğu gibi göster, olası sebepleri yalnızca ipucu olarak sun.
    throw new Error(
      'Özel mesaj gönderilemedi. Sık sebepler: bu yoruma zaten bir kez mesaj gönderilmiş ' +
      '(yorum başına tek hak), yorum 7 günden eski, ya da paylaşılan/reklam gönderisi. ' +
      'Meta\'nın hatası: ' + e.message
    )
  }
  // Meta yanıtı: { recipient_id, message_id }. recipient_id = kullanıcının bize özel kimliği (IGSID).
  // Şekli platforma göre değişebiliyor → ham yanıtı logla (teşhis için; konuşma çözülemezse buraya bakılır).
  console.log('[meta] özel mesaj yanıtı:', JSON.stringify(yanit))
  const aliciId = yanit?.recipient_id || null
  const mesajId = yanit?.message_id || yanit?.id || null

  getDb().prepare(
    "UPDATE sosyal_mesajlar SET cevaplayan_kullanici = ?, ozel_mesaj_tarihi = datetime('now','localtime') WHERE id = ?"
  ).run(kullanici || null, id)

  // Gönderdiğimizi gelen kutusuna da yaz — yoksa mesaj Instagram'a gider ama programda izi olmaz
  // (mesajCevapla bunu yapıyordu, burası atlıyordu → "konuşma düşmüyor" şikayeti).
  //
  // konu_id için gerçek konuşma id'si gerekir. Tüm IG konuşma listesini taramak ÇOK ağır
  // (~25 sn/sayfa, sık kod 1) — ama recipient_id elimizde olduğu için user_id filtresiyle
  // TEK konuşmayı hedefli sorgulayabiliyoruz. Bu ucuz.
  // NOT: filtresiz konuşma LİSTESİ Advanced Access ister (kod 2534084 "görevi olmayan
  // kullanıcılarla çok fazla konuşma" → 27 sn timeout). Ama user_id ile TEK konuşma
  // sorgusu Advanced Access istemez ve ~1.6 sn'de döner (2026-07-16 canlı doğrulandı).
  let konusmaId = null
  if (!aliciId) {
    console.warn('[meta] yanıtta recipient_id yok → konuşma çözülemiyor. Ham yanıt:', JSON.stringify(yanit))
  } else {
    try {
      const k = await client.get(`${sayfaId}/conversations`, {
        fields: 'id',
        user_id: aliciId,
        ...(row.platform === 'instagram' ? { platform: 'instagram' } : {}),
      }, { timeout: 30000, deneme: 1 })
      konusmaId = k?.data?.[0]?.id || null
      if (!konusmaId) console.warn('[meta] konuşma sorgusu boş döndü. user_id=' + aliciId)
    } catch (e) {
      // Mesaj GİTTİ; yalnız yerel kayıt eksik kalıyor → hatayı yutma, göster.
      console.error('[meta] konuşma çözülemedi (mesaj yine de gitti). user_id=' + aliciId + ' hata: ' + e.message)
    }
  }
  if (konusmaId) {
    _upsertMesaj({
      platform: row.platform, tur: 'dm',
      harici_id: mesajId || `giden_${Date.now()}_${id}`,
      konu_id: konusmaId,
      gonderen_id: aliciId,
      gonderen_ad: row.gonderen_ad || 'Müşteri',
      metin: metin.trim(), yon: 'giden', mesaj_tarihi: new Date().toISOString(),
    })
  }
  return { ok: true, konusmaId, aliciId }
}

module.exports = {
  // Polling için (main.js) — private, main.js '_' öneki ile IPC'ye kaydetmez.
  _tumunuCek: tumunuCek,

  'meta:kurulum': () => client.kurulumTamamla(),
  'meta:durum': () => client.durum(),
  'meta:sonDurum': () => _sonDurumGetir(),
  'meta:cek': () => tumunuCek(),
  'meta:yorumCevapla': (arg) => yorumCevapla(arg),
  'meta:mesajCevapla': (arg) => mesajCevapla(arg),
  'meta:yorumdanMesaj': (arg) => yorumdanMesaj(arg),
}
