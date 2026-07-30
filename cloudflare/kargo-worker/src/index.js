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
  return { silinenIzlenen: sonuc[0].meta.changes, silinenDurum: sonuc[1].meta.changes }
}

export default {
  async fetch(istek, env) {
    const url = new URL(istek.url)
    const yetkili = tokenGecerli(istek.headers.get('authorization'), env.PAYLASILAN_ANAHTAR)

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

    // Elle tetikleme — canlı doğrulama ve "şimdi bak" düğmesi için.
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
