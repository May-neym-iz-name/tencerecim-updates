// Otomatik stok eşitlemesinin SAF mantığı: ağ yok, DB yok → testlenebilir.
//
// İki yön vardır ve ikisi de ana kanaldan geçer:
//   1) Trendyol'da satış → ana kanaldan (ikas) O KADAR DÜŞ
//   2) Ana kanal değişti  → diğer kanalları ana kanala EŞİTLE
//
// Neden ana kanaldan geçiyor: iki kanal birbirine doğrudan yazsaydı, hangi sayının
// doğru olduğu belirsizleşir ve yazma döngüsü oluşurdu (A'yı yaz → B webhook'u tetikle
// → A'yı yaz...). Tek kaynak kuralı bunu yapısal olarak engeller.

// Bir düşüm hangi durumda "riskli"dir? Kullanıcı kararı (13.09.2026): sıradan eşitlenme
// sessizce olsun, onay YALNIZ ürün satıştan kalkacaksa sorulsun.
function riskliMi({ eski, yeni }) {
  return Number(yeni) === 0 && Number(eski) > 0
}

/**
 * Trendyol satışlarını ana kanalın stoğuna uygular.
 *
 * @param satislar   [{ paket_id, sku, miktar }]  — stok götüren, henüz düşülmemiş kalemler
 * @param anaStok    Map(sku → mevcut adet)       — ana kanaldaki güncel sayı
 * @returns { uygulanacak, bekleyen, eslesmeyen }
 *   uygulanacak: sessizce yazılır
 *   bekleyen   : ürünü satıştan kaldıracağı için ONAY bekler
 *   eslesmeyen : ana kanalda bulunamadı (sessizce yutulmaz, raporlanır)
 */
function satisEtkisi({ satislar = [], anaStok = new Map() } = {}) {
  // Aynı SKU birden çok pakette satılmış olabilir; tek yazıma indir.
  const toplam = new Map()
  const paketler = new Map()
  for (const s of satislar) {
    const sku = String(s.sku || '').trim().toUpperCase()
    const m = Math.max(0, Math.trunc(Number(s.miktar) || 0))
    if (!sku || !m) continue
    toplam.set(sku, (toplam.get(sku) || 0) + m)
    if (!paketler.has(sku)) paketler.set(sku, new Set())
    if (s.paket_id) paketler.get(sku).add(String(s.paket_id))
  }

  const uygulanacak = []
  const bekleyen = []
  const eslesmeyen = []
  for (const [sku, dusum] of toplam.entries()) {
    if (!anaStok.has(sku)) { eslesmeyen.push({ sku, dusum }); continue }
    const eski = Math.max(0, Math.trunc(Number(anaStok.get(sku)) || 0))
    // Eksiye düşmez: Trendyol'da satılan ama ana kanalda zaten 0 olan ürün
    // "daha fazla eksi" yapılamaz; 0'da kalır.
    const yeni = Math.max(0, eski - dusum)
    const satir = { sku, eski, yeni, dusum, paketler: [...(paketler.get(sku) || [])] }
    if (eski === yeni) continue                 // zaten 0, yazacak bir şey yok
    if (riskliMi(satir)) bekleyen.push(satir)
    else uygulanacak.push(satir)
  }
  return { uygulanacak, bekleyen, eslesmeyen }
}

/**
 * Ana kanal ile hedef kanal arasındaki farkları, risk ayrımıyla ikiye böler.
 * planUret'in (stok-senk-mantik) çıktısını alır.
 */
function gonderimiAyir(gonderilecek = []) {
  const otomatik = []
  const onayli = []
  for (const k of gonderilecek) {
    if (riskliMi({ eski: k.eski_miktar, yeni: k.yeni_miktar })) onayli.push(k)
    else otomatik.push(k)
  }
  return { otomatik, onayli }
}

// Ana kanal stoğunu Map'e çevirir (kanal_stok satırlarından).
function stokHaritasi(satirlar = []) {
  const m = new Map()
  for (const s of satirlar) {
    const sku = String(s.sku || '').trim().toUpperCase()
    if (sku) m.set(sku, Math.trunc(Number(s.miktar) || 0))
  }
  return m
}

module.exports = { riskliMi, satisEtkisi, gonderimiAyir, stokHaritasi }
