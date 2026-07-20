// Kargo durumu → ikas köprüsünün KARAR mantığı.
// Bu modül müşteriye e-posta/SMS gönderilmesini tetikler: yanlış karar = yanlış bildirim.
// Kararı G/Ç'den ayırdığımız için burada mock yok (emsal: ups/takip.js durumCevir testi).
import { describe, test, expect } from 'vitest'
import kargoDurum from './kargo-durum.js'

const { _bildirimKarari: ham, _IKAS_KARSILIGI: KARSILIK } = kargoDurum

// Testlerin çoğu "ikas'ta çakışan bir şey yok" halini inceler. ikasDurumu'nu açıkça
// vermek istemediğimizde null (= sorgulandı, çakışma yok) geçiyoruz.
const karar = (durum, sonBildirilen, ikasDurumu = null) => ham(durum, sonBildirilen, ikasDurumu)

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
    // Bu, son 30 günün YOLDAKİ gönderilerini toplu olarak yakalar. (Zaten teslim
    // olmuş / 30 günden eski kayıtlar yoklayıcı sorgusunun dışındadır.)
    expect(karar('gonderildi', null).gonder).toBe(true)
    expect(karar('teslim', null).gonder).toBe(true)
  })
})

// 2026-07-20 OLAYI: mağaza personeli ikas panelindeki durumları ELLE güncelledi.
// O sırada yayında olan sürümde bu korumaların hiçbiri yoktu; sadece UPS kodlarının
// 'bulunamadı' dönmesi sayesinde veri bozulmadı. Aşağıdakiler o şansa güvenmemek için.
describe('personelin elle işaretlemesiyle çakışma', () => {
  test('ikas ZATEN hedefteyse hiç yazılmaz (gereksiz bildirim de olmaz)', () => {
    // Personel doğru işaretlemiş → yapacak bir şey yok.
    expect(karar('teslim', null, 'DELIVERED')).toEqual({
      gonder: false, atlandi: 'ikas-zaten-ayni',
    })
    expect(karar('gonderildi', null, 'FULFILLED').gonder).toBe(false)
  })

  test('ikas TESLİM derken UPS "yolda" diyorsa ikas GERİ DÜŞÜRÜLMEZ', () => {
    // Sebep neredeyse her zaman bizim takip numaramızın ölü olması: etiketi biz
    // kestik ama sevkiyat ikas üzerinden başka numarayla çıktı (canlı ölçüm:
    // uyumsuz 5 kaydın 5'inde de UPS "bulunamadı" dedi). Geri düşürmek DOĞRU
    // veriyi bozar ve müşteriye yanlış "kargoya verildi" mesajı gönderirdi.
    expect(karar('gonderildi', null, 'DELIVERED')).toEqual({
      gonder: false, atlandi: 'ikas-teslim-geri-alinmaz',
    })
    expect(karar('ozel', null, 'DELIVERED').gonder).toBe(false)
  })

  test('ikas bizden İLERİDEYSE düzeltilir ama BİLDİRİM GİTMEZ', () => {
    // Kullanıcı kararı: UPS kazanır, ama personelin işaretlemesini ezip üstüne
    // bir de müşteriye yanlış mesaj atmak en kötüsü olurdu.
    const r = karar('gonderildi', null, 'UNABLE_TO_DELIVER')
    expect(r).toMatchObject({ gonder: true, status: 'FULFILLED', bildir: false, cakisma: true })
  })

  test('normal İLERİ yönde bildirim gider (çakışma değil)', () => {
    expect(karar('teslim', null, 'FULFILLED')).toMatchObject({
      gonder: true, status: 'DELIVERED', bildir: true,
    })
    expect(karar('gonderildi', null, 'READY_FOR_SHIPMENT')).toMatchObject({
      gonder: true, status: 'FULFILLED', bildir: true,
    })
    expect(karar('gonderildi', null, 'UNFULFILLED').bildir).toBe(true)
  })
})

describe('iptal / iade edilmiş siparişe dokunulmaz', () => {
  // Canlı veride 19 CANCELLED + 16 REFUNDED kayıt ölçüldü. Yoklayıcının kargolar
  // dalı bunları elemiyordu → iptal edilmiş siparişe "kargolandı" yazma riski vardı.
  test.each(['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_REQUEST_ACCEPTED'])(
    'ikas %s ise hiçbir şey yazılmaz', (d) => {
      const r = karar('gonderildi', null, d)
      expect(r.gonder).toBe(false)
      expect(r.atlandi).toBe(`ikas-${d}`)
      expect(karar('teslim', null, d).gonder).toBe(false)
    })
})

describe('iki aşamalı karar (ağ çağrısından tasarruf)', () => {
  test('ikasDurumu SORULMAMIŞSA (undefined) devam kararı verilir', () => {
    // 1. aşama: ucuz yerel elemeler. Geçerse ikas sorgulanır, sonra 2. aşama.
    expect(ham('gonderildi', null, undefined)).toMatchObject({ gonder: true, sorulacak: true })
  })

  test('zaten bildirilmişse ağa HİÇ çıkılmaz', () => {
    // En önemli tasarruf: sakin durumda her turda 90+ gereksiz API isteği olurdu.
    expect(ham('gonderildi', 'FULFILLED', undefined)).toEqual({
      gonder: false, atlandi: 'zaten-bildirildi',
    })
  })
})
