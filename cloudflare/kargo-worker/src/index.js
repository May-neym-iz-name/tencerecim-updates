// Tencerecim kargo Worker'ı — UPS takip yoklayıcısı (7/24).
//
// NEDEN VAR: Bugün her mağaza PC'si 10 dakikada bir UPS'e soruyor (electron/main.js:172)
// ve uygulama kapalıyken hiç sormuyor. Gece teslim olan kargo sabah biri programı açana
// kadar "yolda" görünüyor. Bu Worker o boşluğu kapatır.
//
// İŞ BÖLÜMÜ (kritik — docs/cloudflare-plani.md §3 "altın kural"):
//   Worker  : "UPS'e sor" — ağ işi, kimlik bilgisi, 7/24 çalışma.
//   Uygulama: "yorumla ve yaz" — durumCevir, yerel DB yazımı, ikas bildirimi,
//             bildirim merkezi, telafi turu. Hepsi electron/ups/takip.js'te KALIR.
//
// Worker yoklanacak listeyi ÜRETEMEZ: liste yerel SQLite'taki kargolar +
// online_siparisler birleşiminden çıkıyor (takip.js:94 _bekleyenKargolar) ve bulutta
// karşılığı yok. Bu yüzden akış üç parçalı:
//   1) uygulama açıkken listeyi POST /kargo/izle ile iter
//   2) Worker cron ile UPS'e sorar, sonucu D1'e yazar
//   3) uygulama GET /kargo/durumlar?since=... ile değişenleri okur ve uygular
//
// ÜCRETSİZ PLAN SINIRLARI (tasarımı bunlar belirledi):
//   - 50 alt-istek / çağrı  → tur başına en fazla ~45 UPS sorgusu yapılabilir
//   - 10 ms CPU / çağrı     → XML regex ayrıştırma partisi küçük tutulmalı
// Bu yüzden tur başına PARTI_BOYUTU kadar (varsayılan 15) numara yoklanır ve cron
// 5 dakikada bir çalışır → saatte ~180 sorgu. Ölçülen ~93 açık kargo için fazlasıyla
// yeterli. Workers Paid'e (5 $/ay) geçilirse PARTI_BOYUTU tek seferde yükseltilebilir.

import { trackingLogin, trackLast } from './ups-soap.js'

// docs/ups-api-reference.md §1 — teslim edildiğinin TEK doğru işareti.
// Worker'ın yaptığı yegâne yorum bu: teslim = terminal = bir daha sorma.
const TESLIM = 2

// Uygulama listeyi bu süre boyunca hiç itmediyse numara düşer. Uygulamadaki
// PENCERE_GUN (takip.js:27) ile aynı: uygulama zaten 30 günden eskisini itmiyor.
const TTL_GUN = 35

// UPS'e ardışık çağrılar arası nezaket beklemesi (takip.js:28 ile aynı).
// Worker'da bekleme CPU harcamaz, yalnız duvar saati geçer (cron sınırı 15 dk).
const CAGRI_ARASI_MS = 200

const bekle = (ms) => new Promise(r => setTimeout(r, ms))
const simdi = () => new Date().toISOString()

// Sabit süreli karşılaştırma: token uzunluğu/önekinden bilgi sızdırmaz.
function tokenGecerli(basligi, beklenen) {
  if (!beklenen) return false
  const verilen = String(basligi || '').replace(/^Bearer\s+/i, '')
  if (verilen.length !== beklenen.length) return false
  let fark = 0
  for (let i = 0; i < verilen.length; i++) fark |= verilen.charCodeAt(i) ^ beklenen.charCodeAt(i)
  return fark === 0
}

function json(veri, durum = 200) {
  return new Response(JSON.stringify(veri), {
    status: durum,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta "signed_request" doğrulaması (Data Deletion Callback).
//
// Meta gövdede `signed_request` diye tek bir alan gönderir: "<imza>.<yük>", ikisi de
// base64url. Yük çözülünce { user_id, algorithm, issued_at } JSON'u çıkar.
//
// İMZA DOĞRULANMADAN HİÇBİR ŞEY YAPILMAZ. Bu uç kimliksiz olmak ZORUNDA (Meta bizim
// bearer'ımızı göndermez), dolayısıyla tek koruma imzadır: uygulama gizli anahtarını
// bilmeyen biri geçerli imza üretemez. ikas webhook'undaki "gizli yol" hilesine burada
// gerek yok — Meta imzayı BELGELİYOR, ikas belgelemiyordu.
function b64urlCoz(dizge) {
  const b64 = String(dizge || '').replace(/-/g, '+').replace(/_/g, '/')
  const ikili = atob(b64 + '='.repeat((4 - b64.length % 4) % 4))
  const bayt = new Uint8Array(ikili.length)
  for (let i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i)
  return bayt
}

// crypto.subtle.verify sabit sürelidir; elle karşılaştırma yapılmaz.
async function imzaGecerliMi(yukMetni, imzaB64, gizliAnahtar) {
  const kod = new TextEncoder()
  const anahtar = await crypto.subtle.importKey(
    'raw', kod.encode(gizliAnahtar), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  try {
    return await crypto.subtle.verify('HMAC', anahtar, b64urlCoz(imzaB64), kod.encode(yukMetni))
  } catch { return false }
}

// signed_request'i çöz ve DOĞRULA. Başarısızsa null döner — çağıran ayrım yapmaz,
// her başarısızlık aynı cevabı alır (hangi adımda düştüğünü sızdırmanın anlamı yok).
async function signedRequestCoz(signed, gizliAnahtar) {
  const parca = String(signed || '').split('.')
  if (parca.length !== 2) return null
  const [imza, yuk] = parca
  if (!await imzaGecerliMi(yuk, imza, gizliAnahtar)) return null
  let veri = null
  try { veri = JSON.parse(new TextDecoder().decode(b64urlCoz(yuk))) } catch { return null }
  // Meta ileride algoritmayı değiştirirse SESSİZCE kabul etmeyelim: doğruladığımız
  // şey HMAC-SHA256'dır, yük başka bir şey iddia ediyorsa doğrulama anlamsızdır.
  if (String(veri?.algorithm || '').toUpperCase() !== 'HMAC-SHA256') return null
  const kimlik = String(veri?.user_id || '').trim()
  if (!/^[0-9]{5,32}$/.test(kimlik)) return null
  return { kimlik, issued_at: veri.issued_at }
}

// ikas sipariş id'si UUID benzeri bir dizgedir. Açık uçtan gelen gövdeye
// güvenmiyoruz; yalnız biçimi tutan bir id kabul edilir ve o bile yetkili
// veri sayılmaz — kaydı uygulama ikas'tan kendi çeker.
const ID_DESENI = /^[A-Za-z0-9-]{8,64}$/

// Dakikada en fazla bu kadar olay kuyruğa girer. Gerçek trafiğin çok üstünde
// (yoğun günde bile saatte birkaç sipariş), yani meşru olay sınıra takılmaz.
// Amaç: gizli yolu ele geçiren birinin uygulamayı sonsuz ikas çekimine
// zorlamasını engellemek.
const OLAY_DAKIKA_TAVANI = 60

// Son dakikada kaç olay yazıldı? D1'den sayarız — Worker örnekleri arasında
// paylaşılan tek durum orası (bellekteki sayaç her izolatta ayrı olurdu).
async function olayTavaniAsildiMi(env) {
  const sinir = new Date(Date.now() - 60 * 1000).toISOString()
  const r = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM ikas_olaylar WHERE alinma_zaman > ?1'
  ).bind(sinir).first()
  return (r?.n || 0) >= OLAY_DAKIKA_TAVANI
}

/**
 * Bir yoklama turu. UPS'e sorar, sonucu D1'e yazar.
 * Uygulamanın yerel DB'sine DOKUNMAZ, ikas'a bildirim GÖNDERMEZ — o işler uygulamanın.
 * @returns {Promise<object>} tur özeti (sağlık/hata ayıklama için)
 */
async function yoklamaTuru(env) {
  const parti = Math.max(1, Math.min(45, Number(env.PARTI_BOYUTU) || 15))
  const ozet = { parti, sorgulanan: 0, degisen: 0, teslim: 0, agdaDegil: 0, hatalar: [] }

  // SQLite'ta NULL varsayılan olarak önce sıralanır → hiç sorulmamışlar başa gelir,
  // ardından en eski sorulan. (aktif, son_sorgu) indeksi bu sorguyu karşılar.
  const { results } = await env.DB
    .prepare('SELECT takip_no FROM izlenen WHERE aktif = 1 ORDER BY son_sorgu ASC LIMIT ?')
    .bind(parti).all()

  if (!results.length) return ozet

  const session = await trackingLogin({
    musteriKodu: env.UPS_MUSTERI_KODU,
    kullaniciKodu: env.UPS_KULLANICI_KODU,
    sifre: env.UPS_SIFRE,
  })

  // Tüm yazımlar tur sonunda tek batch'te. DİKKAT: bunun sebebi 50 sınırı DEĞİL —
  // ücretsiz planda 50 yalnız DIŞ isteklere (UPS) uygulanır, Cloudflare servislerine
  // (D1) ayrı ve bol bir bütçe var (1000/çağrı). Batch'in gerçek faydası: tur ortasında
  // hata alırsak yarım yazılmış durum bırakmamak ve D1'e gidiş-dönüşü azaltmak.
  const yazimlar = []
  const damgala = env.DB.prepare('UPDATE izlenen SET son_sorgu = ? WHERE takip_no = ?')
  const durumYaz = env.DB.prepare(`
    INSERT INTO durumlar (takip_no, durum_kodu, aciklama, aciklama2, sube, ups_zaman, sorgu_zaman, degisim_zaman)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
    ON CONFLICT(takip_no) DO UPDATE SET
      durum_kodu = excluded.durum_kodu,
      aciklama = excluded.aciklama, aciklama2 = excluded.aciklama2,
      sube = excluded.sube, ups_zaman = excluded.ups_zaman,
      sorgu_zaman = excluded.sorgu_zaman,
      -- 'IS' kullanılıyor ('=' değil): SQLite'ta NULL = NULL yanlış döner, o yüzden
      -- kodu bilinmeyen satırlar her turda "değişti" sanılır ve uygulama boşuna işlerdi.
      degisim_zaman = CASE WHEN durumlar.durum_kodu IS excluded.durum_kodu
                           THEN durumlar.degisim_zaman ELSE excluded.degisim_zaman END`)

  for (const { takip_no } of results) {
    ozet.sorgulanan++
    const zaman = simdi()
    let d = null
    try {
      d = await trackLast(session, takip_no)
    } catch (e) {
      // Kod 13 = TRACKING NUMBER NOT FOUND: etiket kesilmiş ama koli UPS ağına hiç
      // girmemiş. HATA DEĞİL, beklenen durum (takip.js:205 — ölçümde 93'ün 19'u böyleydi).
      if (String(e.message).includes('kod 13')) ozet.agdaDegil++
      else ozet.hatalar.push(`${takip_no}: ${e.message}`)
      yazimlar.push(damgala.bind(zaman, takip_no))
      await bekle(CAGRI_ARASI_MS)
      continue
    }

    const kod = d.durumKodu === null || d.durumKodu === '' ? null : Number(d.durumKodu)
    yazimlar.push(durumYaz.bind(takip_no, Number.isFinite(kod) ? kod : null,
      d.aciklama, d.aciklama2, d.sube, d.zaman, zaman))
    yazimlar.push(damgala.bind(zaman, takip_no))

    if (kod === TESLIM) {
      ozet.teslim++
      // Terminal durum: bir daha UPS'e sorulmaz. Uygulama sonucu okuyana kadar
      // durumlar tablosunda bekler — aktif=0 yalnız YOKLAMAYI durdurur, veriyi silmez.
      yazimlar.push(env.DB.prepare('UPDATE izlenen SET aktif = 0 WHERE takip_no = ?').bind(takip_no))
    }
    await bekle(CAGRI_ARASI_MS)
  }

  if (yazimlar.length) await env.DB.batch(yazimlar)
  return ozet
}

// TTL süresi dolmuş kayıtları temizler. Ayrı tutuluyor: yoklama turunun alt-istek
// bütçesini yemesin diye günde bir kez (gece 03:15 cron'u) çalışır.
async function temizle(env) {
  const sinir = new Date(Date.now() - TTL_GUN * 86400_000).toISOString()
  const sonuc = await env.DB.batch([
    env.DB.prepare('DELETE FROM izlenen WHERE son_gorulme < ?').bind(sinir),
    env.DB.prepare('DELETE FROM durumlar WHERE takip_no NOT IN (SELECT takip_no FROM izlenen)'),
  ])
  // Olaylar tüketildikten sonra değersizdir; 7 gün fazlasıyla yeterli
  // (en uzun mutabakat penceresi 5 dk). Tablo sınırsız büyümesin.
  const olay = await env.DB.prepare(
    'DELETE FROM ikas_olaylar WHERE alinma_zaman < ?1'
  ).bind(new Date(Date.now() - 7 * 86400_000).toISOString()).run()
  return {
    silinenIzlenen: sonuc[0].meta.changes,
    silinenDurum: sonuc[1].meta.changes,
    silinenOlay: olay.meta.changes,
  }
}

export default {
  async fetch(istek, env) {
    const url = new URL(istek.url)
    const yetkili = tokenGecerli(istek.headers.get('authorization'), env.PAYLASILAN_ANAHTAR)

    // ikas → Worker. KİMLİKSİZ olmak ZORUNDA: ikas bizim bearer'ımızı göndermez ve
    // imza başlığı belgelemez (docs/ikas-api-reference.md:154). Koruma üç katman:
    //   1) tahmin edilemez gizli yol (IKAS_WEBHOOK_YOLU secret'ı)
    //   2) gövdeye güvenilmez — yalnız id alınır, kayıt ikas'tan uygulama çeker
    //   3) dakika tavanı
    // HER DURUMDA 200 DÖNER: ikas 200 dışında bir cevapta 3 denemeden sonra o
    // teslimattan tamamen vazgeçer. Düşen olayı 5 dk'lık mutabakat turu yakalar.
    if (istek.method === 'POST' && env.IKAS_WEBHOOK_YOLU &&
        url.pathname === `/ikas/webhook/${env.IKAS_WEBHOOK_YOLU}`) {
      let govde = null
      try { govde = await istek.json() } catch {}
      // ikas gövdesi: { merchantId, scope, data }
      // ⚠ `data` bir NESNE DEĞİL, JSON METNİDİR (2026-07-31'de teşhis ucuyla ölçüldü).
      // `govde.data.id` okumak bu yüzden hep boş dönüyordu ve gerçek siparişler
      // "gecersiz-id" deyip sessizce eleniyordu. Metinse önce ayrıştır.
      let veri = govde?.data
      if (typeof veri === 'string') { try { veri = JSON.parse(veri) } catch { veri = null } }
      const siparisId = String(veri?.id || govde?.id || govde?.orderId || '').trim()
      const konu = String(govde?.scope || govde?.topic || 'bilinmeyen').slice(0, 64)
      if (!ID_DESENI.test(siparisId)) {
        // TEŞHİS: id'yi çıkaramadıysak gövde biçimi beklediğimizden farklı demektir.
        // Sessizce atmak "ikas hiç göndermedi" ile "gönderdi ama biz eledik" arasındaki
        // farkı ölçülemez yapardı — ham gövdeyi saklayıp GET /ikas/ham ile okuyoruz.
        await env.DB.prepare(
          'INSERT INTO ikas_ham (govde, alinma_zaman) VALUES (?1, ?2)'
        // 2000 karakter YETMİYORDU: ikas gövdesi siparişin tamamını taşıyor ve
        // kesilen metin ayrıştırılamıyordu (id'yi görmek için tam gövde gerekti).
        ).bind(JSON.stringify(govde || null).slice(0, 20000), simdi()).run()
        return json({ ok: true, atlandi: 'gecersiz-id' })
      }
      if (await olayTavaniAsildiMi(env)) return json({ ok: true, atlandi: 'tavan' })
      await env.DB.prepare(
        'INSERT INTO ikas_olaylar (siparis_id, konu, alinma_zaman) VALUES (?1, ?2, ?3)'
      ).bind(siparisId, konu, simdi()).run()
      return json({ ok: true })
    }

    // ── Meta Data Deletion Callback ───────────────────────────────────────────
    // App Dashboard > App settings > Gelişmiş > "Data Deletion Callback URL".
    // Tanımlı olmadığı sürece Meta her silme talebini **Urgent uyarı** olarak düşürür
    // ve listeyi elle indirip yerel DB'de aramak gerekir (09.09.2026: 25.08 + 07.09).
    //
    // KİMLİKSİZ ama korumasız DEĞİL: gövdedeki signed_request uygulama gizli
    // anahtarıyla HMAC-SHA256 imzalıdır, imza tutmazsa istek 400 ile düşer.
    //
    // Meta'nın beklediği cevap KESİN bir şekildir: { url, confirmation_code }.
    // `url` kullanıcının talebinin durumunu görebileceği SAYFA olmalıdır (aşağıdaki
    // GET ucu) — Meta bu adresi kullanıcıya gösterir, erişilemezse başvuru reddedilir.
    if (istek.method === 'POST' && url.pathname === '/meta/veri-silme') {
      if (!env.META_APP_SECRET) return json({ hata: 'yapilandirilmadi' }, 503)

      // Meta form-encoded gönderir; JSON gönderen istemcilere de açık olsun diye
      // ikisi de denenir. Ham gövde bir kez okunur (Request gövdesi tek kullanımlık).
      const ham = await istek.text()
      let signed = null
      try { signed = new URLSearchParams(ham).get('signed_request') } catch {}
      if (!signed) { try { signed = JSON.parse(ham)?.signed_request } catch {} }

      const cozum = await signedRequestCoz(signed, env.META_APP_SECRET)
      // İmza tutmadıysa 400. ikas'taki "her durumda 200 dön" kuralı BURAYA UYGULANMAZ:
      // orada 200 dışında cevap teslimatı tamamen düşürüyordu; Meta ise imzasız isteği
      // zaten kendi göndermez, 200 dönmek sahte isteği onaylamak olurdu.
      if (!cozum) return json({ hata: 'imza gecersiz' }, 400)

      const onayKodu = crypto.randomUUID().replace(/-/g, '')
      await env.DB.prepare(`
        INSERT INTO veri_silme_talepleri (onay_kodu, kimlik, gelis_zaman, durum)
        VALUES (?1, ?2, ?3, 'bekliyor')`
      ).bind(onayKodu, cozum.kimlik, simdi()).run()

      // url.origin: Meta'nın bize ulaştığı konak. Sabit yazılsaydı özel alan adına
      // geçildiğinde sessizce eski adrese işaret ederdi.
      return json({
        url: `${url.origin}/meta/veri-silme/durum?kod=${onayKodu}`,
        confirmation_code: onayKodu,
      })
    }

    // Durum sayfası — KİMLİKSİZ olmak zorunda: bunu açan kişi bizim kullanıcımız
    // değil, verisini sildiren kişidir; elinde yalnız onay kodu vardır.
    // Kod dışında hiçbir şey sızdırmaz: kimliğin kendisi GÖSTERİLMEZ.
    if (istek.method === 'GET' && url.pathname === '/meta/veri-silme/durum') {
      const kod = String(url.searchParams.get('kod') || '').trim()
      const kayit = /^[a-f0-9]{32}$/.test(kod)
        ? await env.DB.prepare(
            'SELECT durum, gelis_zaman, islem_zaman FROM veri_silme_talepleri WHERE onay_kodu = ?1'
          ).bind(kod).first()
        : null
      const govde = !kayit
        ? '<h1>Kayıt bulunamadı</h1><p>Onay kodunu kontrol edin.</p>'
        : kayit.durum === 'silindi'
          ? `<h1>Veriniz silindi</h1><p>Talep: ${kayit.gelis_zaman}<br>Tamamlanma: ${kayit.islem_zaman}</p>`
          : `<h1>Talebiniz alındı</h1><p>Talep: ${kayit.gelis_zaman}<br>Durum: işleniyor.</p>`
      return new Response(
        `<!doctype html><meta charset="utf-8"><title>Veri silme durumu</title>` +
        `<body style="font-family:system-ui;max-width:36rem;margin:3rem auto;padding:0 1rem">` +
        `${govde}<p style="color:#666">Onay kodu: ${kod || '—'}</p><p>Tencerecim</p></body>`,
        { status: kayit ? 200 : 404, headers: { 'content-type': 'text/html; charset=utf-8' } })
    }

    // Sağlık ucu: token'sız yalnız "ayaktayım" der. Ayrıntı (kaç kayıt, son tur)
    // yetki ister — açık uçtan iş hacmi sızdırmanın anlamı yok.
    if (url.pathname === '/saglik') {
      if (!yetkili) return json({ ok: true })
      const { results } = await env.DB.batch([
        env.DB.prepare('SELECT COUNT(*) AS n FROM izlenen WHERE aktif = 1'),
        env.DB.prepare('SELECT COUNT(*) AS n FROM izlenen'),
        env.DB.prepare('SELECT MAX(sorgu_zaman) AS z FROM durumlar'),
      ]).then(r => ({ results: r.map(x => x.results[0]) }))
      return json({
        ok: true, zaman: simdi(),
        izlenenAktif: results[0].n, izlenenToplam: results[1].n, sonSorgu: results[2].z,
      })
    }

    if (!yetkili) return json({ hata: 'yetkisiz' }, 401)

    // Uygulama → Worker: "şunları yokla". Tam listeyi gönderir, Worker birleştirir.
    if (url.pathname === '/kargo/izle' && istek.method === 'POST') {
      let govde
      try { govde = await istek.json() } catch { return json({ hata: 'gecersiz json' }, 400) }
      const takipler = [...new Set((govde?.takipler || [])
        .map(t => String(t || '').trim()).filter(Boolean))].slice(0, 500)
      if (!takipler.length) return json({ eklenen: 0 })

      const zaman = simdi()
      const ekle = env.DB.prepare(`
        INSERT INTO izlenen (takip_no, son_gorulme, eklenme, aktif) VALUES (?1, ?2, ?2, 1)
        ON CONFLICT(takip_no) DO UPDATE SET son_gorulme = excluded.son_gorulme`)
      // DİKKAT: çakışmada aktif EZİLMEZ. Teslim olmuş bir numarayı uygulama listesinde
      // tutmaya devam ederse (örn. ikas'a bildirim henüz başarılı olmadıysa) aktif=1'e
      // dönerdi ve sonsuza dek UPS'e sorulurdu.
      await env.DB.batch(takipler.map(t => ekle.bind(t, zaman)))
      return json({ alinan: takipler.length })
    }

    // Worker → uygulama: son okumadan beri durumu DEĞİŞENLER.
    // '>=' bilinçli: aynı milisaniyede yazılan satırlar '>' ile atlanabilirdi.
    // Aynı satırın tekrar gelmesi zararsız — uygulamadaki yazımlar zaten idempotent
    // (takip.js:193 WHERE koşulları aynı damgayı ikinci kez basmaz).
    if (url.pathname === '/kargo/durumlar' && istek.method === 'GET') {
      const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z'
      const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get('limit')) || 500))
      const { results } = await env.DB.prepare(`
        SELECT takip_no, durum_kodu, aciklama, aciklama2, sube, ups_zaman, sorgu_zaman, degisim_zaman
        FROM durumlar WHERE degisim_zaman >= ?1 ORDER BY degisim_zaman ASC LIMIT ?2`)
        .bind(since, limit).all()
      return json({ kayitlar: results, imlec: results.length ? results[results.length - 1].degisim_zaman : since })
    }

    // Worker → uygulama. '>=' değil '>' kullanılır: imleç son okunan satırın
    // alinma_zaman'ı, aynı satırı tekrar vermek gereksiz. Aynı milisaniyede iki
    // olay yazılırsa id sırası ayırır (kargo/durumlar'dan farklı: orada satır
    // başına tek kayıt var, burada aynı siparişin birden çok olayı olabilir).
    if (url.pathname === '/ikas/olaylar' && istek.method === 'GET') {
      const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z'
      const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 200))
      const { results } = await env.DB.prepare(`
        SELECT id, siparis_id, konu, alinma_zaman FROM ikas_olaylar
        WHERE alinma_zaman > ?1 ORDER BY alinma_zaman ASC, id ASC LIMIT ?2`)
        .bind(since, limit).all()
      return json({
        kayitlar: results,
        imlec: results.length ? results[results.length - 1].alinma_zaman : since,
      })
    }

    // TEŞHİS ucu: işlenemeyen webhook gövdeleri. ikas'ın gerçekte ne gönderdiğini
    // görmek için — belge gövde şemasını vermiyor. Boş dönmesi "ikas hiç ulaşmadı"
    // demektir; dolu dönmesi "ulaştı ama biçimi farklı" demektir.
    if (url.pathname === '/ikas/ham' && istek.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, govde, alinma_zaman FROM ikas_ham ORDER BY id DESC LIMIT 20'
      ).all()
      return json({ kayitlar: results })
    }

    // Elle tetikleme — canlı doğrulama ve "şimdi bak" düğmesi için.
    // Uygulama → "imleçten sonraki silme taleplerini ver".
    // Silmeyi Worker YAPAMAZ: kişisel veri (sosyal_mesajlar) yalnız mağaza PC'sinin
    // yerel SQLite'ındadır, bulutta kopyası yoktur. Worker sadece kuyruk tutar.
    //
    // ⚠ NEDEN durum FİLTRESİ YOK — ÇOK-PC KURALI: sosyal_mesajlar senkronlanmıyor
    // (bkz. schema.sql'deki not ve db/senk-sema.js SIRA), yani AYNI kişinin verisi
    // her PC'de AYRI duruyor. "durum='bekliyor'" filtresi olsaydı ilk işleyen PC
    // satırı kapatır, ikinci PC o talebi HİÇ GÖRMEZDİ ve o PC'de veri kalırdı.
    // Bu yüzden kargo/ikas ile aynı desen: her PC kendi imlecini tutar, satır ortak
    // kalır. `durum` yalnız kullanıcıya gösterilen durum sayfası içindir.
    if (url.pathname === '/meta/veri-silme/bekleyenler' && istek.method === 'GET') {
      const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z'
      const { results } = await env.DB.prepare(`
        SELECT onay_kodu, kimlik, gelis_zaman FROM veri_silme_talepleri
        WHERE gelis_zaman > ?1 ORDER BY gelis_zaman LIMIT 500`).bind(since).all()
      const kayitlar = results || []
      return json({
        talepler: kayitlar,
        // İmleç SON SATIRIN damgası; boş turda çağıranın gönderdiği imleç aynen döner.
        imlec: kayitlar.length ? kayitlar[kayitlar.length - 1].gelis_zaman : since,
      })
    }

    // Uygulama → "bunları yerelde işledim".
    // silinen = 0 MEŞRUDUR ve 'silindi' sayılır: 09.09 ölçümünde Meta'nın verdiği
    // 33 kimliğin hiçbiri yerel DB'de yoktu. "Kayıt yoktu" da tamamlanmış bir
    // silmedir; ayrı bir durum açmak kuyruğu sonsuza kadar dolu tutardı.
    if (url.pathname === '/meta/veri-silme/tamam' && istek.method === 'POST') {
      let govde
      try { govde = await istek.json() } catch { return json({ hata: 'gecersiz json' }, 400) }
      const kayitlar = (govde?.sonuclar || [])
        .filter(k => /^[a-f0-9]{32}$/.test(String(k?.onay_kodu || '')))
        .slice(0, 500)
      if (!kayitlar.length) return json({ guncellenen: 0 })
      const zaman = simdi()
      // Yalnız 'bekliyor' satırı güncellenir → İLK bildiren PC damgayı koyar, ikinci
      // PC'nin bildirimi sessizce geçer. Durum sayfası "işlendi mi" der, "kaç PC'de
      // işlendi" demez; kullanıcıya gösterilecek doğru bilgi budur.
      const guncelle = env.DB.prepare(`
        UPDATE veri_silme_talepleri SET durum = 'silindi', islem_zaman = ?2, silinen = ?3
        WHERE onay_kodu = ?1 AND durum = 'bekliyor'`)
      await env.DB.batch(kayitlar.map(k =>
        guncelle.bind(k.onay_kodu, zaman, Number(k.silinen) || 0)))
      return json({ guncellenen: kayitlar.length })
    }

    if (url.pathname === '/kargo/yokla' && istek.method === 'POST') {
      return json(await yoklamaTuru(env))
    }

    return json({ hata: 'bulunamadi' }, 404)
  },

  async scheduled(olay, env) {
    // Gece temizliği ayrı cron; yoklamanın alt-istek bütçesini paylaşmaz.
    //
    // waitUntil KULLANILMIYOR ve hata YUTULMUYOR — ikisi de bilinçli:
    // 1) scheduled() dönen promise'i çalışma zamanı zaten bekler (cron duvar saati
    //    sınırı 15 dk; 30 sn'lik waitUntil tavanı yalnız HTTP tetikli Worker'lara ait).
    //    Tur ~25 sn sürüyor, fazlasıyla içeride.
    // 2) Hatayı yakalayıp yutarsak Cron Trigger "Past Events" tablosu her turu BAŞARILI
    //    gösterir; UPS günlerce cevap vermese bile panelde yeşil görünür. Bırakıyoruz ki
    //    fırlasın ve tur BAŞARISIZ damgalansın. Veri kaybı olmaz: bir sonraki tur
    //    kaldığı yerden devam eder (son_sorgu damgası sırayı korur).
    //    Bu, projedeki bilinen "sessiz hata göstergesi" zaafını burada tekrarlamamak için.
    if (olay.cron === '15 3 * * *') {
      await temizle(env)
      return
    }
    await yoklamaTuru(env)
  },
}
