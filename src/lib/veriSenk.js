// Çok-PC veri senkronu (renderer orkestratörü). Yerel değişiklikleri Supabase
// senk_kayitlar tablosuna gönderir, uzak değişiklikleri çekip yerele uygular.
// Yerel okuma/yazma electron IPC (electron/db/senk-veri.js) üzerinden yapılır.
import { supabase } from './supabase'
import { etiketleriYukle } from './etiketDepo'

const invoke = async (channel, ...args) => {
  if (!window.api) throw new Error('Electron API bulunamadı')
  const r = await window.api.invoke(channel, ...args)
  if (!r.ok) throw new Error(r.error)
  return r.data
}

// FK bağımlılık sırası — TEK KAYNAK backend (senk-sema.js). Backend'den çekilir ki
// senkrona tablo eklenince renderer listesi eskimesin (kargolar bug'ının kök nedeni).
// Backend erişilemezse bu yedek kullanılır.
const SIRA_YEDEK = [
  'markalar', 'tedarikciler', 'kategoriler', 'musteriler', 'urunler', 'urun_stoklar',
  'satislar', 'satis_kalemleri', 'satis_odemeler',
  'kasa_oturumlar', 'giderler', 'sabit_giderler', 'mal_kabuller', 'mal_kabul_kalemleri',
  'kargolar',
  'istek_listeleri', 'istek_listesi_kalemleri',
]
let siraCache = null
async function siraAl() {
  if (!siraCache) {
    try {
      const r = await invoke('veri-senk:sira')
      siraCache = Array.isArray(r) && r.length ? r : SIRA_YEDEK
    } catch { siraCache = SIRA_YEDEK }
  }
  return siraCache
}
const SAYFA = 1000

// Bir pull sayfasını değerlendirir: hangi satırlar bu turda alınır, imleç nereye gider,
// döngü biter mi. Saf fonksiyon — ağ yok, test edilebilir (veriSenk.test.js).
//
// Sözleşme: imleç "bu değerden ÖNCESİ tamamen işlendi, bu değerin KENDİSİ yeniden
// çekilir" demektir → sorgu .gte kullanır. Örtüşme zararsızdır ('uygula' idempotent).
export function sayfaIsle(data, sayfaBoyu) {
  const ilkTs = data[0].yuklenme
  const sonTs = data[data.length - 1].yuklenme

  // Sayfa dolmadı → sunucuda başka satır yok, hepsini al.
  if (data.length < sayfaBoyu) return { alinacak: data, cursor: sonTs, bitti: true }

  // Sayfa dolu → son damgalı grup yarım kalmış OLABİLİR (push aynı damgayı 500 satıra
  // birden basar). O grubu bu turda ALMA; imleci ona kur, sonraki sorgu grubu bütün
  // hâlde yeniden çeksin. Eski kod burada .gt ile ilerleyip kalanı kalıcı kaybediyordu.
  if (ilkTs !== sonTs) {
    return { alinacak: data.filter(r => r.yuklenme !== sonTs), cursor: sonTs, bitti: false }
  }

  // Tüm sayfa TEK damgadan ibaret: grup sayfa boyundan büyük, imleci ona kursak sonsuz
  // döngü olurdu. Grubu alıp damgayı geçiyoruz — kayıp riski YALNIZ bu durumda sürer.
  // (Ölçüm 2026-07: en büyük grup 500, sayfa 1000 → bugün erişilebilir değil.)
  return {
    alinacak: data,
    cursor: sonTs + '0', // string olarak bir tık ileri: aynı damga tekrar çekilmesin
    bitti: false,
    uyari: `Veri senkron: ${sonTs} damgasında ${sayfaBoyu}+ kayıt var — sayfalama bu grubu bölebilir.`,
  }
}

let calisiyor = false
let tekrarIstendi = false

// Durum değişikliği (iptal/iade vb.) sonrası anında senkron tetikler. Zaten bir
// tur çalışıyorsa, o turdan hemen sonra bir tur daha koşulmasını garanti eder
// (değişikliğin bu turda kaçırılmaması için). Supabase'i şişirmez — aynı upsert.
export function senkTetikle() {
  veriSenk().catch(() => {})
}

// Tek bir tam senkron turu (push + pull). Aynı anda tek tur çalışır.
export async function veriSenk() {
  if (calisiyor) { tekrarIstendi = true; return { atlandi: true } }
  calisiyor = true
  try {
    // --- PUSH: imleçten beri değişen yerel satırları yükle ---
    const { deger: pushImlec } = await invoke('veri-senk:imlec-al', { anahtar: 'push' })
    const { degisen, enYeni } = await invoke('veri-senk:degisenler', { since: pushImlec || '' })
    let gonderilen = 0
    for (const [tablo, rows] of Object.entries(degisen)) {
      for (let i = 0; i < rows.length; i += 500) {
        const dilim = rows.slice(i, i + 500).map(r => ({ tablo, senk_id: r.senk_id, veri: r.veri, guncelleme: r.guncelleme }))
        const { error } = await supabase.from('senk_kayitlar').upsert(dilim, { onConflict: 'tablo,senk_id' })
        if (error) throw new Error(error.message)
        gonderilen += dilim.length
      }
    }
    if (enYeni && enYeni !== (pushImlec || '')) await invoke('veri-senk:imlec-yaz', { anahtar: 'push', deger: enYeni })

    // Bir kerelik: kargolar senkrona sonradan eklendi. Önceki sürümde bu satırlar
    // Supabase'den çekilmiş ama uygulanmadan pull imleci ilerlemiş olabilir → bir
    // defa imleci sıfırlayıp tümünü yeniden çek (apply idempotent: son-yazan-kazanır).
    const { deger: kargoReset } = await invoke('veri-senk:imlec-al', { anahtar: 'kargolar_reset' })
    if (!kargoReset) {
      await invoke('veri-senk:imlec-yaz', { anahtar: 'pull', deger: '' })
      await invoke('veri-senk:imlec-yaz', { anahtar: 'kargolar_reset', deger: '1' })
    }

    // Bir kerelik: eski .gt sayfalaması aynı yuklenme damgasını paylaşan grupların
    // ortasında bölünüp kalan satırları KALICI olarak atlıyordu (aşağıdaki PULL notuna
    // bak). Bu PC'de hangi satırların düştüğü bilinemez — tek güvenli telafi, imleci bir
    // defa sıfırlayıp tüm geçmişi yeniden çekmek. Güvenli: 'uygula' idempotent ve
    // son-yazan-kazanır, yereldeki TAZE veri bayat bulut sürümüyle EZİLMEZ.
    // Maliyet: tek seferlik ~28 sayfa (27.7 bin kayıt), sonraki turlar normal.
    const { deger: sayfalamaReset } = await invoke('veri-senk:imlec-al', { anahtar: 'sayfalama_onarim_2026_07' })
    if (!sayfalamaReset) {
      await invoke('veri-senk:imlec-yaz', { anahtar: 'pull', deger: '' })
      await invoke('veri-senk:imlec-yaz', { anahtar: 'sayfalama_onarim_2026_07', deger: '1' })
    }

    // --- PULL: yuklenme imlecinden (sunucu saati) beri tüm uzak değişiklikler ---
    //
    // İMLEÇ ANLAMI: "bu değerden ÖNCESİ tamamen işlendi; bu değerin KENDİSİ yeniden
    // çekilir" → .gte kullanılır, .gt DEĞİL. Nedeni sessiz kalıcı veri kaybıydı:
    // push 500'lük dilimler hâlinde upsert ettiği için bir dilimin TÜM satırları AYNI
    // yuklenme damgasını alır (ölçüm: 152 grup aynı damgayı paylaşıyor, en büyüğü 500).
    // Eski kod sayfa sonunda cursor'ı son satırın damgasına set edip .gt ile devam
    // ediyordu → sayfa bir grubun ORTASINDA bittiyse o gruptaki kalan satırlar BİR DAHA
    // HİÇ ÇEKİLMİYORDU. (Vaka: 46 ürünlük 09:21:43 batch'inden 2 ürün Gölcük'e hiç
    // ulaşmadı.) Üstelik tek kolonlu order aynı damgalı satırlarda sıra garantisi
    // vermez — hangi satırın düşeceği PC'den PC'ye değişirdi. senk_id ikincil sıralama
    // sırayı deterministik yapar. 'uygula' idempotent olduğu için örtüşme zararsızdır.
    const { deger: pullImlec } = await invoke('veri-senk:imlec-al', { anahtar: 'pull' })
    let cursor = pullImlec || '1970-01-01T00:00:00.000Z'
    const tum = []
    for (;;) {
      const { data, error } = await supabase.from('senk_kayitlar')
        .select('tablo, senk_id, veri, guncelleme, yuklenme')
        .gte('yuklenme', cursor)
        .order('yuklenme', { ascending: true }).order('senk_id', { ascending: true })
        .limit(SAYFA)
      if (error) throw new Error(error.message)
      if (!data?.length) break
      const adim = sayfaIsle(data, SAYFA)
      tum.push(...adim.alinacak)
      cursor = adim.cursor
      if (adim.uyari) console.warn(adim.uyari)
      if (adim.bitti) break
    }

    // Tüm delta'yı tabloya göre grupla; FK sırasında uygula (parent önce).
    const grup = {}
    for (const r of tum) (grup[r.tablo] ||= []).push(r)

    // Önceki turlarda FK'sı çözülemediği için bekleyen kayıtlar: uzak delta boş olsa da
    // yeniden denenmeli. İmleç ilerlemiş olduğu için bu satırlar Supabase'den BİR DAHA
    // ÇEKİLMEZ; tek şansları yerel kuyruk. Ebeveyn bu turda gelmiş ya da yerelde başka
    // yoldan oluşmuş olabilir. (bekleyen-tablolar eski sürümde yok → boş kabul et.)
    let bekleyenTablolar = []
    try { bekleyenTablolar = await invoke('veri-senk:bekleyen-tablolar') } catch { /* eski backend */ }
    const denenecek = new Set([...Object.keys(grup), ...bekleyenTablolar.map(b => b.tablo)])

    let alinan = 0
    if (denenecek.size) {
      const SIRA = await siraAl()
      // Tek tablonun hatası TÜM pull'u kilitlemesin: her tablo ayrı denenir, hata
      // toplanır. İmleç yalnız hepsi başarılıysa ilerler — başarısız tablo varsa
      // sonraki turda aynı delta yeniden çekilir (apply idempotent, veri kaybolmaz).
      // (17 Temmuz vakası: sosyal_otomasyon_sablonlar "no such column: id" hatası
      // fiyat/kargo dahil her şeyin çekimini 5 gün durdurdu.)
      const hatalar = []
      let bekleyenKalan = 0
      for (const tablo of SIRA) {
        if (!denenecek.has(tablo)) continue
        try {
          const sonuc = await invoke('veri-senk:uygula', { tablo, kayitlar: grup[tablo] || [] })
          alinan += sonuc.uygulanan
          bekleyenKalan += sonuc.bekleyen || 0
        } catch (err) {
          hatalar.push(`${tablo}: ${err.message}`)
          console.error(`Veri senkron uygula (${tablo}):`, err.message)
        }
      }
      // İmleç yalnız gerçek delta çekildiyse ve hata yoksa ilerler. Bekleyen kayıtlar
      // imleci GERİ ÇEKMEZ: onlar artık yerel kuyrukta güvende, imleci geri almak tüm
      // geçmişi her turda yeniden indirmek olurdu.
      if (hatalar.length === 0 && tum.length) {
        await invoke('veri-senk:imlec-yaz', { anahtar: 'pull', deger: cursor })
      }
      if (bekleyenKalan) console.warn(`Veri senkron: ${bekleyenKalan} kayıt ebeveyni gelmediği için bekliyor.`)
    }

    // Bu PC'de oluşan yeni etiketleri Storage'a yükle (PC'ler arası basım). Sync'i
    // yavaşlatmasın diye fire-and-forget; hata olursa sonraki turda tekrar dener.
    etiketleriYukle().catch(() => {})

    return { gonderilen, alinan }
  } finally {
    calisiyor = false
    // Tur sırasında yeni bir değişiklik tetiklendiyse hemen bir tur daha koş.
    if (tekrarIstendi) { tekrarIstendi = false; setTimeout(() => veriSenk().catch(() => {}), 150) }
  }
}
