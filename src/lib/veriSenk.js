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

    // --- PULL: yuklenme imlecinden (sunucu saati) beri tüm uzak değişiklikler ---
    const { deger: pullImlec } = await invoke('veri-senk:imlec-al', { anahtar: 'pull' })
    let cursor = pullImlec || '1970-01-01T00:00:00.000Z'
    const tum = []
    for (;;) {
      const { data, error } = await supabase.from('senk_kayitlar')
        .select('tablo, senk_id, veri, guncelleme, yuklenme')
        .gt('yuklenme', cursor).order('yuklenme', { ascending: true }).limit(SAYFA)
      if (error) throw new Error(error.message)
      if (!data?.length) break
      tum.push(...data)
      cursor = data[data.length - 1].yuklenme
      if (data.length < SAYFA) break
    }

    let alinan = 0
    if (tum.length) {
      // Tüm delta'yı tabloya göre grupla; FK sırasında uygula (parent önce).
      const grup = {}
      for (const r of tum) (grup[r.tablo] ||= []).push(r)
      const SIRA = await siraAl()
      // Tek tablonun hatası TÜM pull'u kilitlemesin: her tablo ayrı denenir, hata
      // toplanır. İmleç yalnız hepsi başarılıysa ilerler — başarısız tablo varsa
      // sonraki turda aynı delta yeniden çekilir (apply idempotent, veri kaybolmaz).
      // (17 Temmuz vakası: sosyal_otomasyon_sablonlar "no such column: id" hatası
      // fiyat/kargo dahil her şeyin çekimini 5 gün durdurdu.)
      const hatalar = []
      for (const tablo of SIRA) {
        if (grup[tablo]?.length) {
          try {
            const sonuc = await invoke('veri-senk:uygula', { tablo, kayitlar: grup[tablo] })
            alinan += sonuc.uygulanan
          } catch (err) {
            hatalar.push(`${tablo}: ${err.message}`)
            console.error(`Veri senkron uygula (${tablo}):`, err.message)
          }
        }
      }
      if (hatalar.length === 0) {
        await invoke('veri-senk:imlec-yaz', { anahtar: 'pull', deger: cursor })
      }
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
