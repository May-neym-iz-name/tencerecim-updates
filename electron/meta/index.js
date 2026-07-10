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

// Facebook Sayfa gönderilerindeki yorumlar. Son gönderileri + gömülü yorumları çeker.
async function cekFacebookYorumlar() {
  const sayfaId = client._sayfaId()
  if (!sayfaId) return 0
  let n = 0
  // comments.order(reverse_chronological): en YENİ yorumlar önce gelsin. Varsayılan
  // kronolojik sırada (en eski önce) sürekli yorum alan gönderilerde yeni yorumlar hep
  // 50'lik pencerenin dışında kalıp polling'e hiç düşmüyordu.
  const res = await client.get(`${sayfaId}/feed`, {
    fields: 'id,message,created_time,full_picture,permalink_url,comments.order(reverse_chronological).limit(50){id,message,from,created_time}',
    limit: 40,
  })
  for (const gonderi of res.data || []) {
    // Gönderinin kendisini kaydet (yorumu olmasa bile listede görünsün).
    _upsertMesaj({
      platform: 'facebook', tur: 'gonderi', harici_id: 'g_' + gonderi.id, konu_id: gonderi.id,
      yon: 'giden', metin: gonderi.message || '', mesaj_tarihi: gonderi.created_time,
      konu_baslik: gonderi.message || '(görsel gönderi)', konu_gorsel: gonderi.full_picture, konu_link: gonderi.permalink_url,
    })
    for (const y of gonderi.comments?.data || []) {
      _upsertMesaj({
        platform: 'facebook', tur: 'yorum', harici_id: y.id,
        konu_id: gonderi.id, gonderen_id: y.from?.id, gonderen_ad: y.from?.name || 'Facebook kullanıcısı',
        metin: y.message, yon: 'gelen', mesaj_tarihi: y.created_time,
        konu_baslik: gonderi.message || '(görsel gönderi)', konu_gorsel: gonderi.full_picture, konu_link: gonderi.permalink_url,
      })
      n++
    }
  }
  return n
}

// Instagram gönderilerindeki yorumlar.
async function cekInstagramYorumlar() {
  const igId = client._igId()
  if (!igId) return 0
  let n = 0
  // Hafif sorgu: media + gömülü comments 20. 'from' alanı KASITLI istenmez: IG yorumlarında
  // 'from' izni (instagram_manage_comments + App Review) yoksa alanı istemek isteğin
  // tamamını hataya düşürüp gömülü olduğu /media çağrısını kırıyor → hiç IG yorumu düşmüyordu.
  // Yorumcu adı 'username'den, metin 'text'ten geliyor; cevaplama comment_id ile çalışır, id gerekmez.
  const res = await client.get(`${igId}/media`, {
    fields: 'id,caption,timestamp,media_url,thumbnail_url,permalink,comments.limit(20){id,text,username,timestamp}',
    limit: 25,
  })
  for (const medya of res.data || []) {
    // Gönderinin kendisini kaydet (yorumu olmasa bile listede görünsün).
    _upsertMesaj({
      platform: 'instagram', tur: 'gonderi', harici_id: 'g_' + medya.id, konu_id: medya.id,
      yon: 'giden', metin: medya.caption || '', mesaj_tarihi: medya.timestamp,
      konu_baslik: medya.caption || '(görsel gönderi)', konu_gorsel: medya.thumbnail_url || medya.media_url, konu_link: medya.permalink,
    })
    for (const y of medya.comments?.data || []) {
      _upsertMesaj({
        platform: 'instagram', tur: 'yorum', harici_id: y.id,
        konu_id: medya.id, gonderen_id: y.from?.id, gonderen_ad: y.username || 'Instagram kullanıcısı',
        metin: y.text, yon: 'gelen', mesaj_tarihi: y.timestamp,
        konu_baslik: medya.caption || '(görsel gönderi)', konu_gorsel: medya.thumbnail_url || medya.media_url, konu_link: medya.permalink,
      })
      n++
    }
  }
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
        fields: 'id,message,from,created_time', limit: 10,
      })
    } catch { continue }
    // Müşteri = mesajlarda bizim taraf DIŞINDAKİ ilk gönderen.
    const musteri = (mesajlar.data || []).map(m => m.from).find(f => f && !bizIdler.has(f.id)) || {}
    for (const m of mesajlar.data || []) {
      const bizden = bizIdler.has(m.from?.id)
      _upsertMesaj({
        platform: igMi ? 'instagram' : 'facebook', tur: 'dm',
        harici_id: m.id, konu_id: konusmaId,
        gonderen_id: bizden ? musteri.id : (m.from?.id || musteri.id),
        gonderen_ad: bizden ? (musteri.name || musteri.username || 'Müşteri') : (m.from?.name || m.from?.username || musteri.name || 'Müşteri'),
        metin: m.message, yon: bizden ? 'giden' : 'gelen', mesaj_tarihi: m.created_time,
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

// --- DERİN ÇEKME: TÜM gönderiler + TÜM yorumlar (kademeli sayfalama) --------
// Normal tur son ~25-40 gönderiyi çeker; bu fonksiyon cursor sayfalamayla TÜM
// gönderileri ve her gönderinin TÜM yorumlarını alır. Güvenlik sınırları var
// (sonsuz döngü / kota koruması). Manuel tetiklenir (arka plan polling'de DEĞİL).
const MAKS_SAYFA = 60          // gönderi listesi max sayfa (60×25 = ~1500 gönderi)
const MAKS_YORUM_SAYFA = 80    // gönderi başına yorum max sayfa (80×50 = 4000 yorum)

// Meta hız-sınırı / geçici hata kodları: bunlarda DURMA, bekleyip AYNI sayfayı tekrar dene.
// 4=uygulama, 17=kullanıcı, 32=sayfa throttle; 613=özel limit; 1=veri azalt; 2=geçici.
const HIZ_SINIRI_KODLARI = new Set([1, 2, 4, 17, 32, 613])
function bekle(ms) { return new Promise(r => setTimeout(r, ms)) }
function hizSiniriMi(e) {
  const m = /kod (\d+)/.exec(e && e.message || '')
  return !!m && HIZ_SINIRI_KODLARI.has(Number(m[1]))
}

// Bir uç noktanın tüm sayfalarını cursor ile gezer; her sayfada isleyici(data) çağırır.
// Hız sınırında sayfayı bırakmaz: artan beklemeyle (2s,4s,6s,8s) 4 kez tekrar dener; ancak
// gerçek hata (ör. geçersiz alan) veya denemeler bitince eldekiyle durur. Böylece binlerce
// yorumlu gönderilerde Meta throttle'ı yüzünden yarıda kesilme olmaz.
async function tumSayfalar(path, params, isleyici, maksSayfa) {
  let after = null, sayfa = 0
  while (sayfa < maksSayfa) {
    const p = { ...params }
    if (after) p.after = after
    let json, denendi = 0
    for (;;) {
      try { json = await client.get(path, p, { timeout: 30000, deneme: 2 }); break }
      catch (e) {
        if (hizSiniriMi(e) && denendi < 4) { denendi++; await bekle(2000 * denendi); continue }
        return sayfa // gerçek hata veya deneme bitti → eldekiyle dur
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

async function tumYorumlariCek() {
  const sonuc = { gonderi: 0, yorum: 0, hatalar: [] }
  const igId = client._igId()
  const sayfaId = client._sayfaId()

  // --- Instagram: tüm media → her media'nın tüm yorumları ---
  if (igId) {
    try {
      const medyalar = []
      await tumSayfalar(`${igId}/media`, { fields: 'id,caption,timestamp,media_url,thumbnail_url,permalink', limit: 25 },
        d => { for (const m of d) medyalar.push(m) }, MAKS_SAYFA)
      for (const medya of medyalar) {
        _upsertMesaj({ platform: 'instagram', tur: 'gonderi', harici_id: 'g_' + medya.id, konu_id: medya.id,
          yon: 'giden', metin: medya.caption || '', mesaj_tarihi: medya.timestamp,
          konu_baslik: medya.caption || '(görsel gönderi)', konu_gorsel: medya.thumbnail_url || medya.media_url, konu_link: medya.permalink })
        sonuc.gonderi++
        // replies.limit(50): üst yorumların YANITLARINI da çek. comments_count yanıtları da
        // sayar; yanıtları çekmeyince program eksik görünüyordu. ust_id = yanıtlanan yorum id.
        const igKtx = { konu_baslik: medya.caption || '(görsel gönderi)', konu_gorsel: medya.thumbnail_url || medya.media_url, konu_link: medya.permalink }
        await tumSayfalar(`${medya.id}/comments`, { fields: 'id,text,username,timestamp,replies.limit(50){id,text,username,timestamp}', limit: 50 },
          d => { for (const y of d) {
            _upsertMesaj({ platform: 'instagram', tur: 'yorum', harici_id: y.id, konu_id: medya.id,
              gonderen_ad: y.username || 'Instagram kullanıcısı', metin: y.text, yon: 'gelen', mesaj_tarihi: y.timestamp, ...igKtx }); sonuc.yorum++
            for (const r of y.replies?.data || []) {
              _upsertMesaj({ platform: 'instagram', tur: 'yorum', harici_id: r.id, konu_id: medya.id, ust_id: y.id,
                gonderen_ad: r.username || 'Instagram kullanıcısı', metin: r.text, yon: 'gelen', mesaj_tarihi: r.timestamp, ...igKtx }); sonuc.yorum++
            }
          } },
          MAKS_YORUM_SAYFA)
      }
    } catch (e) { sonuc.hatalar.push('IG: ' + e.message) }
  }

  // --- Facebook: tüm feed → her gönderinin tüm yorumları ---
  if (sayfaId) {
    try {
      const gonderiler = []
      await tumSayfalar(`${sayfaId}/feed`, { fields: 'id,message,created_time,full_picture,permalink_url', limit: 25 },
        d => { for (const g of d) gonderiler.push(g) }, MAKS_SAYFA)
      for (const g of gonderiler) {
        _upsertMesaj({ platform: 'facebook', tur: 'gonderi', harici_id: 'g_' + g.id, konu_id: g.id,
          yon: 'giden', metin: g.message || '', mesaj_tarihi: g.created_time,
          konu_baslik: g.message || '(görsel gönderi)', konu_gorsel: g.full_picture, konu_link: g.permalink_url })
        sonuc.gonderi++
        // comments.limit(50): FB'de bir yorumun YANITLARI alt 'comments' kenarındadır; onları da çek.
        const fbKtx = { konu_baslik: g.message || '(görsel gönderi)', konu_gorsel: g.full_picture, konu_link: g.permalink_url }
        await tumSayfalar(`${g.id}/comments`, { fields: 'id,message,from,created_time,comments.limit(50){id,message,from,created_time}', limit: 50, order: 'reverse_chronological' },
          d => { for (const y of d) {
            _upsertMesaj({ platform: 'facebook', tur: 'yorum', harici_id: y.id, konu_id: g.id,
              gonderen_id: y.from?.id, gonderen_ad: y.from?.name || 'Facebook kullanıcısı', metin: y.message, yon: 'gelen', mesaj_tarihi: y.created_time, ...fbKtx }); sonuc.yorum++
            for (const r of y.comments?.data || []) {
              _upsertMesaj({ platform: 'facebook', tur: 'yorum', harici_id: r.id, konu_id: g.id, ust_id: y.id,
                gonderen_id: r.from?.id, gonderen_ad: r.from?.name || 'Facebook kullanıcısı', metin: r.message, yon: 'gelen', mesaj_tarihi: r.created_time, ...fbKtx }); sonuc.yorum++
            }
          } },
          MAKS_YORUM_SAYFA)
      }
    } catch (e) { sonuc.hatalar.push('FB: ' + e.message) }
  }
  return sonuc
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

// Yorumdan kullanıcıya ÖZEL mesaj (Meta Business Suite'teki "Send message").
// {comment_id}/private_replies: herkese açık yoruma tek seferlik özel DM gönderir
// (24 saat penceresi kuralına takılmaz). FB'de pages_messaging ile çalışır;
// IG'de instagram_manage_messages + App Review gerekir.
async function yorumdanMesaj({ id, metin, kullanici }) {
  const row = getDb().prepare('SELECT * FROM sosyal_mesajlar WHERE id = ?').get(id)
  if (!row) throw new Error('Yorum bulunamadı.')
  if (row.tur !== 'yorum') throw new Error('Bu yalnızca yorumlar için kullanılabilir.')
  if (!metin || !metin.trim()) throw new Error('Mesaj boş olamaz.')
  try {
    if (row.platform === 'instagram') {
      // IG: {ig_id}/messages + recipient.comment_id (instagram_manage_messages + App Review gerekir).
      const igId = client._igId()
      if (!igId) throw new Error('Instagram bağlı değil.')
      await client.post(`${igId}/messages`, {
        recipient: JSON.stringify({ comment_id: row.harici_id }),
        message: JSON.stringify({ text: metin.trim() }),
      })
    } else {
      // FB: {page_id}/messages + recipient.comment_id (güncel Messenger Private Replies).
      // Eski {comment_id}/private_replies iç içe yorum / bazı gönderilerde kod 100 veriyordu;
      // messages uç noktası daha güvenilir ve IG ile aynı desen.
      const sayfaId = client._sayfaId()
      await client.post(`${sayfaId}/messages`, {
        recipient: JSON.stringify({ comment_id: row.harici_id }),
        message: JSON.stringify({ text: metin.trim() }),
      })
    }
  } catch (e) {
    if (row.platform === 'instagram') {
      throw new Error('Instagram özel mesajı için App Review onayı gerekiyor (instagram_manage_messages). FB yorumlarında şimdi çalışır. Ayrıntı: ' + e.message)
    }
    // FB'de tipik nedenler: yoruma zaten bir kez özel yanıt verilmiş (yorum başına tek hak),
    // yorum 7 günden eski, ya da paylaşılan/reklam gönderisi. Ayrıntıyı kullanıcıya göster.
    throw new Error('Özel mesaj gönderilemedi. Not: Her yoruma yalnızca 1 kez ve yorum 7 günden yeniyse özel mesaj gönderilebilir. Ayrıntı: ' + e.message)
  }
  getDb().prepare("UPDATE sosyal_mesajlar SET cevaplayan_kullanici = ? WHERE id = ?").run(kullanici || null, id)
  return { ok: true }
}

module.exports = {
  // Polling için (main.js) — private, main.js '_' öneki ile IPC'ye kaydetmez.
  _tumunuCek: tumunuCek,

  'meta:kurulum': () => client.kurulumTamamla(),
  'meta:durum': () => client.durum(),
  'meta:sonDurum': () => _sonDurumGetir(),
  'meta:cek': () => tumunuCek(),
  'meta:tum-yorumlar': () => tumYorumlariCek(),
  'meta:yorumCevapla': (arg) => yorumCevapla(arg),
  'meta:mesajCevapla': (arg) => mesajCevapla(arg),
  'meta:yorumdanMesaj': (arg) => yorumdanMesaj(arg),
}
