// ARAMA ÇEKİRDEĞİ — saf hesap, IO yok (test edilebilir).
// Prototipteki ara-cekirdek-v2.mjs + siralama.mjs'in Worker karşılığı.
import { trNormal, DOLGU } from './tr-arama.js'

/**
 * BM25 — çevrimdışı üretilmiş DÜZ İKİLİ ters dizin üzerinden.
 *
 * ⚠️ Dizin İSTEK ANINDA KURULMAZ ve JSON'DAN OKUNMAZ. İki ölçüm bu biçimi dayattı:
 *   • ürün metinlerini istek anında kelimelere ayırmak: 29,4 ms
 *   • aynı dizini JSON olarak okumak: 6,0 ms (46.230 küçük [docId,tf] dizisi,
 *     her biri ayrı bellek tahsisi)
 * Ücretsiz planda istek başına bütçe 10 ms. Tipli dizilerde tahsis tek seferdir.
 * Veri prototipteki 9-worker-veri.mjs ile üretilir.
 *
 * @param sozluk  '
' ile ayrılmış, SIRALI terim listesi
 * @param bin     dizin.bin: [3×Int32 başlık][ofset][docId][tf][belgeUzunluk]
 */
export function kelimeDizini(sozluk, bin) {
  const bas = new Int32Array(bin, 0, 3)
  const [terimAdet, gonderiAdet, dokAdet] = bas
  let o = 12
  const ofset = new Int32Array(bin, o, terimAdet + 1); o += (terimAdet + 1) * 4
  const docId = new Int32Array(bin, o, gonderiAdet);   o += gonderiAdet * 4
  const tf = new Uint16Array(bin, o, gonderiAdet);     o += gonderiAdet * 2
  const uzunluk = new Int32Array(bin, o, dokAdet)

  const sira = new Map()
  const kelimeler = sozluk.split(String.fromCharCode(10))
  for (let i = 0; i < kelimeler.length; i++) sira.set(kelimeler[i], i)

  let toplam = 0
  for (let i = 0; i < dokAdet; i++) toplam += uzunluk[i]
  const ort = toplam / dokAdet
  const k1 = 1.5, b = 0.75

  const ara = (sorgu) => {
    const terimler = trNormal(sorgu).split(' ').filter(t => t && !DOLGU.has(t))
    const puan = new Map()
    for (const t of terimler) {
      const si = sira.get(t)
      if (si === undefined) continue
      const bas2 = ofset[si], son2 = ofset[si + 1]
      const df = son2 - bas2
      const idf = Math.log(1 + (dokAdet - df + 0.5) / (df + 0.5))
      for (let j = bas2; j < son2; j++) {
        const i = docId[j], f = tf[j]
        puan.set(i, (puan.get(i) || 0) + idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * uzunluk[i] / ort)))
      }
    }
    return [...puan.entries()].map(([i, p]) => ({ i, p })).sort((a, b2) => b2.p - a.p)
  }
  ara.kapsama = (sorgu) => {
    const t = trNormal(sorgu).split(' ').filter(x => x && !DOLGU.has(x))
    if (!t.length) return 0
    return t.filter(x => sira.has(x)).length / t.length
  }
  return ara
}

/**
 * int8 nicemlenmiş vektörlerde kosinüs araması.
 * Ürün puanı = parçalarının EN YÜKSEKİ (max havuzlama) — bir ürünün "indüksiyon"
 * geçen tek parçası, o ürünü tamamı için alakalı kılar.
 */
export function vektorArama(bayt, boyut, sahip, urunAdet, olcek) {
  return (qVec) => {
    // Sorgu da int8'e çekilir; ölçek sabiti sıralamayı etkilemez, atlanır.
    const q = new Int8Array(boyut)
    let enB = 0
    for (let d = 0; d < boyut; d++) enB = Math.max(enB, Math.abs(qVec[d]))
    for (let d = 0; d < boyut; d++) q[d] = Math.round(qVec[d] / enB * 127)

    const enIyi = new Float64Array(urunAdet).fill(-Infinity)
    const parcaAdet = sahip.length
    for (let k = 0; k < parcaAdet; k++) {
      const taban = k * boyut
      let s = 0
      for (let d = 0; d < boyut; d++) s += bayt[taban + d] * q[d]
      const u = sahip[k]
      if (s > enIyi[u]) enIyi[u] = s
    }
    // int8 nokta çarpımını GERÇEK kosinüse çevir. Sıralamayı değiştirmez ama
    // alaka eşiği ancak yorumlanabilir bir sayı üzerinden konabilir:
    // v ≈ q * olcek / 127 olduğundan  cos ≈ nokta × (olcek/127) × (enB/127).
    const k = (olcek / 127) * (enB / 127)
    const out = []
    for (let u = 0; u < urunAdet; u++) if (enIyi[u] > -Infinity) out.push({ i: u, p: enIyi[u] * k })
    return out.sort((a, b) => b.p - a.p)
  }
}

/**
 * Ağırlıklı RRF. K=10 bilinçli: literatürdeki 60, sıraları o kadar düzleştiriyor
 * ki iki listede de ortalarda olan bir ürün, tek listede birinci olanı geçiyor
 * (ölçüldü — "indüksiyonda kullanılabilir" sorgusunda tam olarak bu oldu).
 * kapsama: sorgu kelimeleri katalogda geçmiyorsa kelime aramasının oyu kısılır.
 */
export function hibrit(kelimeListe, anlamListe, { adet = 40, K = 10, aday = 50, kapsama = 1 } = {}) {
  const puan = new Map()
  const ekle = (liste, agirlik) => {
    if (agirlik <= 0) return
    for (let s = 0; s < liste.length && s < aday; s++) {
      const x = liste[s]
      puan.set(x.i, (puan.get(x.i) || 0) + agirlik / (K + s + 1))
    }
  }
  ekle(kelimeListe, kapsama)
  ekle(anlamListe, 1)
  return [...puan.entries()].sort((a, b) => b[1] - a[1]).slice(0, adet).map(([i, p]) => ({ i, p }))
}

export const AGIRLIK = { satin: 3, sepet: 2, goruntuleme: 1 }

/** Ham davranış sayılarını 0-1 puana indirger. log: 400 görüntülenme 4 satışı geçmesin. */
export function populerlikPuanlari(populerlik) {
  const ham = new Map()
  for (const id in populerlik) {
    const v = populerlik[id]
    ham.set(id, AGIRLIK.satin * Math.log1p(v.satin || 0)
             + AGIRLIK.sepet * Math.log1p(v.sepet || 0)
             + AGIRLIK.goruntuleme * Math.log1p(v.goruntuleme || 0))
  }
  let enB = 1
  for (const p of ham.values()) if (p > enB) enB = p
  const norm = new Map()
  for (const [id, p] of ham) norm.set(id, p / enB)
  return norm
}

/**
 * ÖNCE ALAKA, SONRA YILDIZLAR. Popülerlik yalnızca alaka kapısını geçmiş
 * ürünlerin sırasını değiştirir; alakasız bir çoksatan listeye giremez.
 * Verisi olmayan ürün DİBE DÜŞMEZ, sadece ödül almaz — yoksa yeni ürünler
 * görünmez olur, hiç satmaz, hiç veri toplayamaz.
 */
export function siralaDavranisla(havuz, urunler, puanlar, { kuvvet = 0.5, bant = 0.5 } = {}) {
  if (!havuz.length) return havuz
  const enIyi = havuz[0].p || 1
  return havuz.map((x) => {
    const alaka = x.p / enIyi
    const pop = puanlar.get(String(urunler[x.i].id)) || 0
    return { ...x, alaka, pop, toplam: alaka + (alaka >= bant ? kuvvet * pop : 0) }
  }).sort((a, b) => b.toplam - a.toplam)
}
