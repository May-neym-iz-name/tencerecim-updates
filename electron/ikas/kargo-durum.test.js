// Kargo durumu → ikas köprüsünün KARAR mantığı.
// Bu modül müşteriye e-posta/SMS gönderilmesini tetikler: yanlış karar = yanlış bildirim.
// Kararı G/Ç'den ayırdığımız için burada mock yok (emsal: ups/takip.js durumCevir testi).
import { describe, test, expect } from 'vitest'
import kargoDurum from './kargo-durum.js'

const { _bildirimKarari: karar, _IKAS_KARSILIGI: KARSILIK } = kargoDurum

describe('UPS durumu → ikas paket durumu eşlemesi', () => {
  test('gönderildi → FULFILLED, müşteriye bildirim gider', () => {
    expect(karar('gonderildi', null)).toEqual({
      gonder: true, status: 'FULFILLED', bildir: true,
    })
  })

  test('teslim → DELIVERED, müşteriye bildirim gider', () => {
    expect(karar('teslim', null)).toEqual({
      gonder: true, status: 'DELIVERED', bildir: true,
    })
  })

  test('özel durum → UNABLE_TO_DELIVER yazılır ama BİLDİRİM GİTMEZ', () => {
    // UPS "özel durum"u (StatusCode 3) çoğunlukla geçicidir: adreste bulunamadı,
    // ertesi gün tekrar denenecek. Her denemede müşteriye "teslim edilemedi" maili
    // atmak panik yaratır. Durum ikas paneline yazılır, personel görür.
    expect(karar('ozel', null)).toEqual({
      gonder: true, status: 'UNABLE_TO_DELIVER', bildir: false,
    })
  })

  test("'yok' (koli ağa girmemiş) ikas'a HİÇ gitmez", () => {
    // Etiket kesilmiş ama koli UPS'e verilmemiş. ikas'a bildirmek müşteriye
    // gerçekte yola çıkmamış bir kargo için bildirim göndermek olurdu.
    expect(karar('yok', null)).toEqual({ gonder: false, atlandi: 'karsiligi-yok' })
  })

  test('bilinmeyen durum sessizce atlanır, çökmez', () => {
    expect(karar('zirva', null).gonder).toBe(false)
    expect(karar(undefined, null).gonder).toBe(false)
  })

  test('eşleme tablosu yalnız ikas OrderPackageStatusEnum değerleri içerir', () => {
    // docs/ikas-api-reference.md satır 209-229. Uydurma bir değer ikas 400 verir.
    const GECERLI = ['FULFILLED', 'DELIVERED', 'UNABLE_TO_DELIVER', 'READY_FOR_SHIPMENT', 'UNFULFILLED']
    for (const v of Object.values(KARSILIK)) expect(GECERLI).toContain(v)
  })
})

describe('mükerrer bildirim koruması', () => {
  test('aynı durum ikinci kez GÖNDERİLMEZ', () => {
    // Yoklayıcı 30 dakikada bir çalışır (main.js UPS_TAKIP_ARALIGI_MS). Bu koruma
    // olmasa müşteri aynı kargo bildirimini günde 48 kez alırdı — bu modülün
    // en kritik davranışı.
    expect(karar('gonderildi', 'FULFILLED')).toEqual({
      gonder: false, atlandi: 'zaten-bildirildi',
    })
    expect(karar('teslim', 'DELIVERED').gonder).toBe(false)
  })

  test('teslim edilmiş sipariş GERİ SARILMAZ', () => {
    // UPS teslimden sonra ara hareket kodu döndürebiliyor. Koruma olmasa ikas'ta
    // teslim edilmiş sipariş "kargolandı"ya döner ve müşteriye İKİNCİ bir kargo
    // bildirimi giderdi.
    expect(karar('gonderildi', 'DELIVERED')).toEqual({
      gonder: false, atlandi: 'teslim-geri-alinmaz',
    })
    expect(karar('ozel', 'DELIVERED').gonder).toBe(false)
  })

  test('durum İLERLERSE gönderilir', () => {
    expect(karar('teslim', 'FULFILLED')).toMatchObject({ gonder: true, status: 'DELIVERED' })
    expect(karar('gonderildi', 'UNABLE_TO_DELIVER')).toMatchObject({ gonder: true, status: 'FULFILLED' })
    expect(karar('teslim', 'UNABLE_TO_DELIVER')).toMatchObject({ gonder: true, status: 'DELIVERED' })
  })

  test('hiç bildirilmemiş sipariş (null) her zaman gönderilir', () => {
    // Bu, özellik açılmadan önce kargolanmış eski siparişleri kendiliğinden telafi eder.
    expect(karar('gonderildi', null).gonder).toBe(true)
    expect(karar('teslim', undefined).gonder).toBe(true)
  })
})
