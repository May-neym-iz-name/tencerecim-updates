// ikas webhook aboneliğini kaydeder ve doğrular. TEK SEFERLİK kurulum aracı.
//
// Neden uygulamada buton değil: yanlışlıkla yeniden çalıştırıldığında aboneliği
// bozma riski var ve konu adları belgede kesin verilmemiş (docs/ikas-api-reference.md
// "canlıda doğrula" diyor) — deneme-yanılma gerekebilir.
//
// Kullanım (Node 18+ ile, uygulamanın İÇİNDEN değil — global fetch gerekir):
//   node scripts/ikas-webhook-kaydet.js --listele
//   node scripts/ikas-webhook-kaydet.js --kaydet <worker-adresi> <gizli-yol-dosyasi>
//   node scripts/ikas-webhook-kaydet.js --sil
//
// GİZLİ YOL DOSYADAN OKUNUR, komut satırından DEĞİL: komut satırına yazılan sır
// kabuk geçmişine ve günlüklere düşer (UPS şifresinde bu hata yapıldı).
const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('path')

// Abone olunacak konular. Kullanıcı dört olay türünü de istedi (yeni sipariş, ödeme
// durumu, iptal/iade, kargo durumu) ama ikas'ta dördü de siparişin updatedAt
// damgasını değiştirir — bu yüzden iki konu yeterli.
const KONULAR = ['store/order/created', 'store/order/updated']

function ayarlar() {
  const dbYolu = path.join(process.env.APPDATA, 'tencerecim', 'tencerecim.db')
  const db = new DatabaseSync(dbYolu, { readOnly: true })
  const satirlar = db.prepare('SELECT anahtar, deger FROM ikas_ayarlar').all()
  const a = Object.fromEntries(satirlar.map(r => [r.anahtar, r.deger]))
  if (!a.store_name || !a.client_id || !a.client_secret) {
    throw new Error('ikas kimlik bilgileri eksik (ikas_ayarlar tablosu)')
  }
  return a
}

async function token(a) {
  const r = await fetch(`https://${a.store_name}.myikas.com/api/admin/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: a.client_id,
      client_secret: a.client_secret,
    }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('token alınamadı: ' + JSON.stringify(j).slice(0, 200))
  return j.access_token
}

async function gql(t, query) {
  const r = await fetch('https://api.myikas.com/api/v1/admin/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
    body: JSON.stringify({ query }),
  })
  return r.json()
}

// Uç adresini gizlemeden yazdırmak sırrı günlüğe düşürür.
const maskele = (uc) => uc.replace(/\/ikas\/webhook\/.*/, '/ikas/webhook/***')

async function main() {
  const [komut, arg1, arg2] = process.argv.slice(2)
  const a = ayarlar()
  const t = await token(a)

  if (komut === '--listele') {
    const r = await gql(t, '{ listWebhook { id scope endpoint } }')
    const liste = r?.data?.listWebhook || []
    console.log(`kayıtlı webhook: ${liste.length}`)
    for (const w of liste) console.log(` - ${w.scope} → ${maskele(w.endpoint)}`)
    if (r.errors) console.log('hatalar:', JSON.stringify(r.errors))
    return
  }

  if (komut === '--sil') {
    const s = KONULAR.map(k => `"${k}"`).join(',')
    console.log(JSON.stringify(await gql(t, `mutation { deleteWebhook(scopes: [${s}]) }`)))
    return
  }

  if (komut === '--kaydet') {
    if (!arg1 || !arg2) throw new Error('Kullanım: --kaydet <worker-adresi> <gizli-yol-dosyasi>')
    const yol = fs.readFileSync(arg2, 'utf8').trim()
    if (!yol) throw new Error('gizli yol dosyası boş')
    const uc = `${arg1.replace(/\/+$/, '')}/ikas/webhook/${yol}`
    const s = KONULAR.map(k => `"${k}"`).join(',')
    console.log('kaydediliyor:', maskele(uc))
    const r = await gql(t,
      `mutation { saveWebhook(input: { scopes: [${s}], endpoint: "${uc}" }) { id endpoint scope } }`)
    if (r.errors) {
      console.log('HATA:', JSON.stringify(r.errors))
      console.log('Konu adı tutmadıysa KONULAR dizisini düzeltip tekrar dene.')
      process.exitCode = 1
      return
    }
    console.log('kaydedildi:', (r.data?.saveWebhook || []).length || 'cevap boş')
    console.log('--- doğrulama ---')
    const l = await gql(t, '{ listWebhook { id scope endpoint } }')
    for (const w of (l?.data?.listWebhook || [])) console.log(` - ${w.scope} → ${maskele(w.endpoint)}`)
    return
  }

  console.error('Komut yok. --listele | --kaydet <adres> <yol-dosyasi> | --sil')
  process.exitCode = 1
}

main().catch(e => { console.error(e.message); process.exitCode = 1 })
