// YouTube günlük yükleme kuyruğu: sıralama ve takvim mantığı.
//
// SAF MODÜL — dosya/ağ/DB'ye dokunmaz. Sebebi: sıralama kuralları bu işin tek
// gerçek iş mantığı; testi kolay olsun diye I/O dışarıda bırakıldı.
//
// KURALLAR (kullanıcı kararı, 2026-09-07):
//   1. Instagram kalite puanı AZALAN sırada.
//   2. Aynı ürün ailesi arasında EN AZ 3 slot boşluk.
//   3. Aynı marka PEŞ PEŞE gelmesin.
//
// NEDEN 3. KURAL "peş peşe" ile sınırlı: marka için de 3 slot aralık istendi,
// ama kapasite yetmiyor. k adet videoyu N slot arayla dizmek en az
// (k-1)*(N+1)+1 slot ister; en yoğun marka havuzun yaklaşık %40'ını tuttuğu
// için N=3 gereken slot sayısı eldekinin çok üzerine çıkıyor. Marka kuralı
// için matematiksel tavan N=1'dir. Kural sessizce kırpılmadı: ölçüldü,
// tavana oturtuldu ve kullanıcıya söylendi.
//
// Bu tavan VERİYE BAĞLIDIR. Havuzun marka dağılımı dengelenirse (yoğun markanın
// payı düşerse) AILE_ARALIK mantığının aynısı markaya da uygulanabilir.

// Marka ÜRÜN ADINDAN türetilir, SKU önekinden DEĞİL.
// NEDEN: 'TNC.SET.00019' önekindeki SET bir marka değil, "set" demek — o ürün
// Sofram markalı. Ayrıca DB'deki urunler.marka bu liste için işe yaramaz:
// listede aralıklı kodlar var ('TNC.SFR.00015-00033') ve bunların yalnızca
// küçük bir kısmı urunler tablosunda birebir eşleşiyor (2026-09-07 ölçümü).
const MARKALAR = [
  'Maxx Doria', 'Sofram', 'Fagor', 'Gülsan', 'Falez', 'Saflon', 'Taşhan',
  'Alev', 'CEM', 'Altınbaşak', 'Bürme', 'Bigatti', 'Magefesa',
]

// Marka adı MARKALAR'da YAZILDIĞI GİBİ döner — büyük harfe çevrilmez.
// NEDEN: Türkçe büyük harf çevrimi 'i' harfini 'İ' yapar; 'Maxx Doria' →
// 'MAXX DORİA' olur ve marka adı bozulur. Karşılaştırma zaten küçük harfte
// yapılıyor, çıktıyı ayrıca büyütmenin hiçbir faydası yok, riski var.
function markaBul(urunAdi) {
  const ad = String(urunAdi || '').toLocaleLowerCase('tr')
  for (const m of MARKALAR) {
    if (ad.startsWith(m.toLocaleLowerCase('tr'))) return m
  }
  return 'Diğer'
}

// SKU kuyruğundaki numaraları küme olarak çıkarır.
//   'TNC.FGR.00009/10/11'  -> {9,10,11}
//   'TNC.SFR.00015-00033'  -> {15..33}  (aralık)
function skuNumaralari(sku) {
  const parcalar = String(sku || '').split('.')
  if (parcalar.length < 3) return new Set()
  const kuyruk = parcalar.slice(2).join('.')
  const s = new Set()
  for (const par of kuyruk.split(/[/,]/)) {
    const p = par.trim()
    const aralik = /^(\d+)-(\d+)$/.exec(p)
    if (aralik) {
      const bas = Number(aralik[1])
      const bit = Number(aralik[2])
      // Ters yazılmış aralık veri hatasıdır; sessizce boş dönmek yerine düzeltilir.
      for (let i = Math.min(bas, bit); i <= Math.max(bas, bit); i++) s.add(i)
    } else if (/^\d+$/.test(p)) {
      s.add(Number(p))
    }
  }
  return s
}

function skuMarkaKodu(sku) {
  const p = String(sku || '').split('.')
  return p.length > 1 ? p[1] : '?'
}

/**
 * Aynı ürünün farklı SKU yazımlarını TEK aileye toplar.
 * 'TNC.FGR.00009/10/11' ile 'TNC.FGR.00011' aynı Fagor düdüklü tencere ailesidir:
 * numara kümeleri kesişiyor ve SKU marka kodu aynı. Birleşim-bulma (union-find).
 */
function aileHaritasi(skular) {
  const ebeveyn = new Map()
  const bul = (x) => {
    while (ebeveyn.get(x) !== x) {
      ebeveyn.set(x, ebeveyn.get(ebeveyn.get(x)))
      x = ebeveyn.get(x)
    }
    return x
  }
  const tekil = [...new Set(skular)].sort()
  for (const s of tekil) ebeveyn.set(s, s)
  for (let i = 0; i < tekil.length; i++) {
    for (let j = i + 1; j < tekil.length; j++) {
      const a = tekil[i]
      const b = tekil[j]
      if (skuMarkaKodu(a) !== skuMarkaKodu(b)) continue
      const na = skuNumaralari(a)
      let kesisir = false
      for (const n of skuNumaralari(b)) {
        if (na.has(n)) { kesisir = true; break }
      }
      if (!kesisir) continue
      const ra = bul(a)
      const rb = bul(b)
      if (ra !== rb) ebeveyn.set(ra, rb)
    }
  }
  const harita = new Map()
  for (const s of tekil) harita.set(s, bul(s))
  return harita
}

const AILE_ARALIK = 3

/**
 * Videoları kurallara göre dizer.
 * @param {Array<{reel_kod:string, kalite:number, sku:string, urun:string}>} videolar
 * @returns {Array} aynı nesneler + {marka, aile} eklenmiş, sıralanmış
 */
function kuyrukSirala(videolar) {
  const aile = aileHaritasi(videolar.map(v => v.sku))
  const havuz = videolar
    .map(v => ({ ...v, marka: markaBul(v.urun), aile: aile.get(v.sku) }))
    // Eşit puanda sıra KARARLI olmalı: reel_kod'a göre kırılır. Yoksa her
    // çalıştırmada farklı takvim çıkar ve "plan değişmedi" iddiası çökerdi.
    .sort((a, b) => (b.kalite - a.kalite) || String(a.reel_kod).localeCompare(String(b.reel_kod)))

  const plan = []
  const kalanlar = [...havuz]

  // Kademeli gevşetme: önce iki kural, sonra yalnız aile, sonra zorunlu.
  // Havuz tükendiğinde kural sağlanamaz — o zaman kademe AÇIKÇA sırayla denenir,
  // sessizce kural kırmak yerine en az zarar veren seçilir.
  while (kalanlar.length) {
    let secili = -1
    for (let kademe = 1; kademe <= 3 && secili < 0; kademe++) {
      for (let i = 0; i < kalanlar.length; i++) {
        const v = kalanlar[i]
        if (kademe < 3) {
          const sonAileler = plan.slice(-AILE_ARALIK).map(x => x.aile)
          if (sonAileler.includes(v.aile)) continue
        }
        if (kademe === 1 && plan.length && plan[plan.length - 1].marka === v.marka) continue
        secili = i
        break
      }
    }
    const idx = secili < 0 ? 0 : secili
    plan.push(kalanlar[idx])
    kalanlar.splice(idx, 1)
  }
  return plan
}

/** Planı doğrular. İddia değil ÖLÇÜM döndürür; çağıran karar verir. */
function planDogrula(plan) {
  let aileIhlal = 0
  let markaIhlal = 0
  for (let i = 0; i < plan.length; i++) {
    for (let j = Math.max(0, i - AILE_ARALIK); j < i; j++) {
      if (plan[i].aile === plan[j].aile) aileIhlal++
    }
    if (i > 0 && plan[i].marka === plan[i - 1].marka) markaIhlal++
  }
  return { adet: plan.length, aileIhlal, markaIhlal }
}

// ---------------------------------------------------------------------------
// ÇEŞİTLİLİK SIRALAMASI (kullanıcı kararı 2026-09-11)
//
// NEDEN KALİTE PUANI TERK EDİLDİ: puan sırası aynı ürünü tekrar tekrar öne
// çıkardı. 18 yayınlanan videonun 4'ü Sofram 9'lu kase seti, 4'ü Maxx Doria
// Steel Fusion çıktı — kanal tek ürünü anlatır oldu. Yeni kural ÇEŞİTLİLİK:
//   1. Ürünü daha önce YouTube'a yüklenmiş video ELENİR.
//   2. Instagram gönderisi YENILIK_AY aydan eskiyse ELENİR.
//   3. Aynı üründen yalnız EN YENİ Instagram gönderisi kalır.
//   4. Sıralama MARKA DÖNÜŞÜMLÜ: her turda her markadan bir ürün; hem marka
//      sırası hem marka içi sıra Instagram tarihine göre YENİDEN ESKİYE.
//
// HAVUZ TÜKENİRSE SESSİZCE ESKİYE DÖNÜLMEZ: fonksiyon boş plan + tukendi=true
// döner, çağıran durur ve kullanıcıya söyler (kullanıcı kararı 2026-09-11).
// "Kural sağlanamadı" ile "kural değişti" birbirine karıştırılmamalı.
// Yenilik penceresi AY cinsinden. 12.09'da 9'dan 18'e cikarildi (kullanici
// karari). OLCULDU: 9 ayda havuzda 4 aday kaliyordu (2 gunluk yayin), 18 ayda
// 14 (7 gun). 12 ay HIC fark etmiyordu (yine 4), 24 ay yalnizca 1 video
// ekliyordu. Yani pencereyi daraltmak tazeligi artirmiyor, havuzu kurutuyor.
const YENILIK_AY = 18

// Ürün adını karşılaştırma için normalleştirir.
// Türkçe küçültme ŞART: düz toLowerCase 'GRANİT' -> 'granİt' üretir ve
// 'granit' ile eşleşmez; aynı ürün yüklenmemiş sanılır (bkz. hafıza: turkce-arama).
function urunAnahtari(urun) {
  return String(urun || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr')
}

// 'simdi'den ay kadar geriye gider. Gün SABİT tutulur; 9 ay tam dolan gün
// hâlâ GEÇERLİDİR (sınır içeride). Ay sonu taşması JS'in kendi normalizasyonuna
// bırakılır — 31 Mayıs eksi 3 ay = 28/29 Şubat yerine 2/3 Mart olur; bu iş için
// bir günlük kayma önemsiz, karmaşık ay-sonu mantığı ise sessiz hata kaynağı.
function esikTarihi(simdi, ay) {
  const d = new Date(simdi.getTime())
  d.setUTCMonth(d.getUTCMonth() - ay)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Havuzdan yayına uygun adayları seçer ve çeşitlilik kuralına göre dizer.
 *
 * @param {Array<{reel_kod:string, urun:string, ig_tarih:string, sku:string}>} videolar
 * @param {{yuklenmisUrunler?:string[], simdi?:Date, yenilikAy?:number}} secenekler
 * @returns {{plan:Array, elenen:{urunYuklenmis:number,tarihYok:number,tarihEski:number,mukerrerUrun:number}, tukendi:boolean}}
 *
 * İDDİA DEĞİL ÖLÇÜM döndürür: kaç videonun neden elendiği sayılır, kararı
 * çağıran verir (planDogrula ile aynı felsefe).
 */
function cesitliSirala(videolar, secenekler = {}) {
  const {
    yuklenmisUrunler = [],
    yuklenmisSkular = [],
    simdi = new Date(),
    yenilikAy = YENILIK_AY,
  } = secenekler

  // KIMLIK ONCE SKU AILESI, sonra ad.
  // NEDEN: urun adi SERBEST METINDIR. Ayni Saflon tenceresi listede hem
  // 'Saflon Titanyum 34 cm Karniyarik' hem 'Saflon Titanyum Karniyarik
  // (Dolma) 28/30/32/34' diye yaziliydi; ad eslestirmesi bunlari AYRI urun
  // sandi ve ayni urun ust uste iki slota dusuyordu (12.09'da olculdu).
  // SKU cakismasi ise veriye dayalidir: aileHaritasi 00249'u 00240/244/247/249
  // ile birlestirir. Ad yalnizca SKU yokken kullanilir (ornegin katalogda
  // kayitli olmayan urunler).
  const tumSkular = videolar.map(v => v.sku).concat(yuklenmisSkular).filter(Boolean)
  const aileler = aileHaritasi(tumSkular)
  const kimlik = (v) => {
    const a = v.sku ? aileler.get(v.sku) : null
    return a ? 'aile:' + a : 'ad:' + urunAnahtari(v.urun)
  }

  const yasakli = new Set(yuklenmisUrunler.map(u => 'ad:' + urunAnahtari(u)))
  for (const sku of yuklenmisSkular) {
    const a = aileler.get(sku)
    if (a) yasakli.add('aile:' + a)
  }
  const esik = esikTarihi(simdi, yenilikAy)
  const elenen = { urunYuklenmis: 0, tarihYok: 0, tarihEski: 0, mukerrerUrun: 0 }

  // 1-2. Eleme. Sıra ÖNEMLİ: önce "zaten yüklendi", sonra tarih. Böylece aynı
  // video iki kez sayılmaz ve sayımlar toplanabilir kalır.
  const aday = []
  for (const v of videolar) {
    // Hem aile hem ad yasagi bakilir: SKU'su olmayan bir video ADIYLA,
    // adi baska yazilmis bir video AILESIYLE yakalanir.
    if (yasakli.has(kimlik(v)) || yasakli.has('ad:' + urunAnahtari(v.urun))) {
      elenen.urunYuklenmis++; continue
    }
    const t = v.ig_tarih ? new Date(v.ig_tarih) : null
    if (!t || Number.isNaN(t.getTime())) { elenen.tarihYok++; continue }
    if (t.getTime() < esik.getTime()) { elenen.tarihEski++; continue }
    aday.push({ ...v, marka: markaBul(v.urun), _ts: t.getTime() })
  }

  // 3. Ürün başına tek video: en yeni kazanır. Eşit tarihte reel_kod kırar —
  // yoksa her çalıştırmada başka video seçilir ve plan kararsız olur.
  const enIyi = new Map()
  for (const v of aday) {
    const k = kimlik(v)
    const mevcut = enIyi.get(k)
    if (!mevcut) { enIyi.set(k, v); continue }
    elenen.mukerrerUrun++
    const dahaIyi = v._ts > mevcut._ts
      || (v._ts === mevcut._ts && String(v.reel_kod).localeCompare(String(mevcut.reel_kod)) < 0)
    if (dahaIyi) enIyi.set(k, v)
  }

  // 4. Marka dönüşümlü dizim.
  const markaKovalari = new Map()
  for (const v of enIyi.values()) {
    if (!markaKovalari.has(v.marka)) markaKovalari.set(v.marka, [])
    markaKovalari.get(v.marka).push(v)
  }
  const kovaSirala = (a, b) => (b._ts - a._ts)
    || String(a.reel_kod).localeCompare(String(b.reel_kod))
  for (const kova of markaKovalari.values()) kova.sort(kovaSirala)

  // Marka sırası: en yeni ürünü olan marka önce. Eşitlikte marka adı kırar.
  const markaSirasi = [...markaKovalari.keys()].sort((a, b) =>
    (markaKovalari.get(b)[0]._ts - markaKovalari.get(a)[0]._ts)
    || a.localeCompare(b, 'tr'))

  const plan = []
  for (let tur = 0; ; tur++) {
    let kondu = false
    for (const m of markaSirasi) {
      const v = markaKovalari.get(m)[tur]
      if (!v) continue
      const { _ts, ...temiz } = v
      plan.push(temiz)
      kondu = true
    }
    if (!kondu) break
  }

  return { plan, elenen, tukendi: plan.length === 0 }
}

const YAYIN_SAATLERI = [9, 15]
const SAAT_DILIMI = 'Europe/Istanbul'

// İstanbul yerel saatinin UTC'den farkını DAKİKA olarak ölçer.
// NEDEN '+3' SABİTİ YAZILMIYOR: sabit yazmak, saat dilimi kuralı değişirse
// (Türkiye 2016'da yaz saatini kaldırdı — kural yine değişebilir) sessizce
// yanlış saate yayınlar. Intl'e sordurmak her zaman günceldir.
function istanbulUtcFarkiDk(tarih) {
  const b = new Intl.DateTimeFormat('en-US', {
    timeZone: SAAT_DILIMI,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(tarih).reduce((o, p) => (o[p.type] = p.value, o), {})
  const yerelMs = Date.UTC(+b.year, +b.month - 1, +b.day, +(b.hour % 24), +b.minute, +b.second)
  return Math.round((yerelMs - tarih.getTime()) / 60000)
}

/** İstanbul'da 'gün saat:00' anını UTC Date olarak verir. */
function slotAni(yil, ay, gun, saat) {
  const tahmin = new Date(Date.UTC(yil, ay - 1, gun, saat, 0, 0))
  const fark = istanbulUtcFarkiDk(tahmin)
  const kesin = new Date(tahmin.getTime() - fark * 60000)
  // Fark, geçiş günlerinde kayabilir; bir kez daha düzeltilir.
  const fark2 = istanbulUtcFarkiDk(kesin)
  return fark2 === fark ? kesin : new Date(tahmin.getTime() - fark2 * 60000)
}

/**
 * 'simdi'den SONRAKİ boş yayın slotlarını üretir.
 *
 * GEÇMİŞ SLOT ATLANIR: YouTube publishAt'i geçmişe koymaz ve davranışı
 * tutarsızdır — kimi zaman videoyu private bırakır, kimi zaman anında yayınlar.
 * Belirsize güvenmek yerine bu fonksiyon geçmiş slotu hiç üretmez; çağıran
 * taraf "anında public" dalını bilerek seçer.
 */
function slotUret(simdi, adet) {
  const slotlar = []
  const b = new Intl.DateTimeFormat('en-CA', { timeZone: SAAT_DILIMI }).format(simdi).split('-')
  const yil = +b[0]
  const ay = +b[1]
  const gun = +b[2]
  for (let g = 0; slotlar.length < adet && g < 400; g++) {
    const t = new Date(Date.UTC(yil, ay - 1, gun + g))
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(t).split('-')
    for (const saat of YAYIN_SAATLERI) {
      if (slotlar.length >= adet) break
      const an = slotAni(+p[0], +p[1], +p[2], saat)
      if (an.getTime() > simdi.getTime()) slotlar.push(an)
    }
  }
  return slotlar
}

module.exports = {
  MARKALAR,
  AILE_ARALIK,
  YAYIN_SAATLERI,
  SAAT_DILIMI,
  markaBul,
  skuNumaralari,
  aileHaritasi,
  kuyrukSirala,
  cesitliSirala,
  YENILIK_AY,
  planDogrula,
  slotUret,
  slotAni,
}
