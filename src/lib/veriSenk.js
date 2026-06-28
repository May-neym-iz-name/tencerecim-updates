// Çok-PC veri senkronu (renderer orkestratörü). Yerel değişiklikleri Supabase
// senk_kayitlar tablosuna gönderir, uzak değişiklikleri çekip yerele uygular.
// Yerel okuma/yazma electron IPC (electron/db/senk-veri.js) üzerinden yapılır.
import { supabase } from './supabase'

const invoke = async (channel, ...args) => {
  if (!window.api) throw new Error('Electron API bulunamadı')
  const r = await window.api.invoke(channel, ...args)
  if (!r.ok) throw new Error(r.error)
  return r.data
}

// FK bağımlılık sırası (senk-sema.js SIRA ile aynı): referanslar önce uygulanır.
const SIRA = ['markalar', 'tedarikciler', 'kategoriler', 'musteriler', 'urunler', 'urun_stoklar']
const SAYFA = 1000

let calisiyor = false

// Tek bir tam senkron turu (push + pull). Aynı anda tek tur çalışır.
export async function veriSenk() {
  if (calisiyor) return { atlandi: true }
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
      for (const tablo of SIRA) {
        if (grup[tablo]?.length) {
          const sonuc = await invoke('veri-senk:uygula', { tablo, kayitlar: grup[tablo] })
          alinan += sonuc.uygulanan
        }
      }
      await invoke('veri-senk:imlec-yaz', { anahtar: 'pull', deger: cursor })
    }

    return { gonderilen, alinan }
  } finally {
    calisiyor = false
  }
}
