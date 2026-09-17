// TENCERECİM AKILLI ARAMA — Cloudflare Worker
//
// Akış: sorgu → (Workers AI ile gömme) + (BM25) → hibrit alaka kapısı →
//       davranış sıralaması (satın alma > sepet > görüntülenme) → JSON
//
// ÜCRETSİZ PLAN SINIRLARI, tasarımı belirleyenler:
//   • İstek başına 10 ms CPU → vektörler int8, tek geçişte taranıyor
//   • Worker kodu 3 MB   → indeks statik VARLIK olarak taşınıyor (sınıra dahil değil)
//   • 100.000 istek/gün  • Workers AI 10.000 neuron/gün
import { kelimeDizini, vektorArama, hibrit, populerlikPuanlari, siralaDavranisla } from './arama.js'

// Isolate ömrü boyunca yaşayan hazırlık. İlk istek biraz yavaş, sonrakiler değil.
let hazir = null

async function hazirla(env) {
  if (hazir) return hazir
  const al = async (yol) => {
    const r = await env.VERI.fetch(new Request('https://veri/' + yol))
    if (!r.ok) throw new Error(`indeks varlığı okunamadı: ${yol} (${r.status})`)
    return r
  }
  const [meta, sozluk, dizinBin, pop, bin] = await Promise.all([
    al('urunler.json').then(r => r.json()),
    al('sozluk.txt').then(r => r.text()),
    al('dizin.bin').then(r => r.arrayBuffer()),
    al('populerlik.json').then(r => r.json()),
    al('vektor.bin').then(r => r.arrayBuffer()),
  ])
  hazir = {
    urunler: meta.urunler,
    boyut: meta.boyut,
    sahip: Int16Array.from(meta.sahip),
    bayt: new Int8Array(bin),
    kelime: kelimeDizini(sozluk, dizinBin),
    puanlar: populerlikPuanlari(pop),
    pop,
  }
  hazir.vektor = vektorArama(hazir.bayt, hazir.boyut, hazir.sahip, hazir.urunler.length, meta.olcek)
  hazir.model = meta.model
  hazir.gorselKok = meta.gorselKok || ''
  return hazir
}

/*
 * CORS. IZINLI_KOKEN VİRGÜLLE AYRILMIŞ BİR LİSTEDİR ve isteğin kendi kökeni
 * listedeyse aynen geri yansıtılır.
 *
 * ⚠️ Neden liste: tek köken yazmıştım (www'lu hal) ama mağaza www'suz adreste
 * çalışıyor. Tarayıcı için bunlar FARKLI köken; istek sessizce engellendi ve
 * hata yalnızca "Failed to fetch" dedi. www'lu/www'suz ayrımı, izin
 * listelerinde en sık yapılan ve en geç fark edilen hatadır.
 */
const kokenSec = (request, env) => {
  const gelen = request.headers.get('Origin') || ''
  const izinli = String(env.IZINLI_KOKEN || '').split(',').map(x => x.trim()).filter(Boolean)
  if (!izinli.length) return '*'
  return izinli.includes(gelen) ? gelen : izinli[0]
}

const basliklar = (request, env) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': kokenSec(request, env),
  'Vary': 'Origin',
  'Cache-Control': 'public, max-age=60',
})

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...basliklar(request, env), 'Access-Control-Allow-Headers': 'Content-Type' } })
    }
    // Tema eklentisi buradan servis edilir. Tek kaynak olmasının sebebi:
    // ikas paneline kod GÖMÜLMEZ, sadece bu adrese <script> etiketi konur —
    // böylece güncelleme için panele girmek gerekmez, worker'ı yeniden yüklemek yeter.
    if (url.pathname === '/akilli-arama.js') {
      const r = await env.VERI.fetch(new Request('https://veri/akilli-arama.js'))
      return new Response(r.body, {
        headers: {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          // 5 dk: acil bir düzeltme gerekirse mağaza uzun süre eski dosyada kalmasın.
          'Cache-Control': 'public, max-age=300',
        },
      })
    }
    if (url.pathname !== '/ara') return new Response('yok', { status: 404 })

    const q = (url.searchParams.get('q') || '').trim().slice(0, 120)
    const adet = Math.min(Number(url.searchParams.get('adet') || 8), 20)
    if (q.length < 2) return new Response(JSON.stringify({ sonuclar: [] }), { headers: basliklar(request, env) })

    try {
      const ix = await hazirla(env)
      // Gömme ağ işi — CPU bütçesinden düşmez.
      const ai = await env.AI.run('@cf/baai/bge-m3', { text: [q] })
      const qVec = ai?.data?.[0]
      if (!qVec) throw new Error('gömme boş döndü')

      const kl = ix.kelime(q)
      const al = ix.vektor(qVec)
      const kapsama = ix.kelime.kapsama(q)

      // ALAKA KAPISI. Anlamsal arama HER ZAMAN bir sıralama üretir — hiçbir ürün
      // yakın olmasa bile "en yakın" vardır. Taban koymazsak "bisiklet lastiği"
      // arayan müşteriye üç tencere gösteririz. Tek eşik yetmiyor (ölçüldü:
      // gerçek "duduklu tencere" 0,471 < alakasız "bisiklet lastiği" 0,497),
      // çünkü yazım hatalarını kelime tarafı kurtarıyor, anlam tarafı değil.
      // İki sinyalden BİRİ yeterli — 18 sorguluk denemede 18/18 doğru.
      const esikKapsama = Number(env.ESIK_KAPSAMA ?? 0.5)
      const esikBenzerlik = Number(env.ESIK_BENZERLIK ?? 0.55)
      const enYakin = al.length ? al[0].p : 0
      if (kapsama < esikKapsama && enYakin < esikBenzerlik) {
        return new Response(JSON.stringify({ sorgu: q, sonuclar: [] }), { headers: basliklar(request, env) })
      }

      const hb = hibrit(kl, al, { kapsama })
      const sirali = siralaDavranisla(hb, ix.urunler, ix.puanlar, {
        kuvvet: Number(env.POP_KUVVET ?? 0.5),
        bant: Number(env.POP_BANT ?? 0.5),
      })

      // Arama terimini kaydet — üçüncü davranış sinyaliniz burada doğar.
      // D1 bağlı değilse sessizce atlanır: kayıt tutamamak aramayı düşürmemeli.
      if (env.DB) {
        ctx.waitUntil(env.DB.prepare(
          'INSERT INTO arama_kayit (terim, sonuc_adet, tarih) VALUES (?, ?, datetime("now"))'
        ).bind(q, sirali.length).run().catch(() => {}))
      }

      return new Response(JSON.stringify({
        sorgu: q,
        // Görsel adresi tarayıcıda kurulur: 401 uzun URL yerine kısa kimlik +
        // tek ortak kök gider. Boyut seçimini de istemci yapar (retina için 2x).
        gorselKok: ix.gorselKok,
        sonuclar: sirali.slice(0, adet).map(x => {
          const u = ix.urunler[x.i]
          return { ad: u.ad, slug: u.slug, marka: u.marka, kategori: u.kategori,
                   fiyat: u.fiyat, gorsel: u.gorsel || null }
        }),
      }), { headers: basliklar(request, env) })
    } catch (e) {
      // Arama çökerse site bozulmamalı: boş sonuç + 200. Tema JS'i paneli açmaz,
      // müşteri Enter'a basıp ikas'ın kendi aramasına düşer.
      console.error('arama hatası:', e.message)
      return new Response(JSON.stringify({ sonuclar: [], hata: true }), { headers: basliklar(request, env) })
    }
  },
}
