# Kod İncelemesi — 2026-07-18

Kapsam: 110 dosya / 17.069 satır (`electron/` 7.665 + `src/` 9.404)
Yöntem: 4 paralel uzman incelemesi (mantık, React, güvenlik, performans). Her bulgu kod okunarak doğrulandı; doğrulanamayan iddialar rapordan çıkarıldı.

## Özet

| Seviye | Adet | Alan |
|---|---|---|
| 🔴 KRİTİK | 4 | Güvenlik (2), Performans (2) |
| 🟠 YÜKSEK | 6 | Mantık (2), Güvenlik (2), React (2) |
| 🟡 ORTA | 4 | Performans (3), Mantık (1) |

**Canlıya çıkmadan önce mutlaka:** G-1, G-2 (güvenlik) ve M-1, M-2 (para iadesi).

---

# 🔴 KRİTİK

## G-1 — API secret'ları herhangi bir kullanıcıya açık

**Dosya:** `electron/db/ayar-senk.js:103-106`

**Sorun:** `ayar-senk:topla` ve `ayar-senk:uygula` IPC kanallarında hiç `yetkiKontrol()` yok. `topla()` fonksiyonu `ups_ayarlar` ve `ikas_ayarlar` tablolarının tüm anahtar/değerlerini döndürüyor: ikas `client_secret`, UPS şifresi, Meta `sayfa_token`.

**Neden:** Personel rolündeki bir çalışan DevTools konsolundan tek satırla tüm API kimlik bilgilerini düz metin alabilir:
```js
await window.api.invoke('ayar-senk:topla')
```
Bu bilgilerle ikas mağazasına doğrudan API çağrısı yapılabilir (stok/fiyat/sipariş okuma-yazma), UPS hesabından sahte gönderi oluşturulabilir.

**Çözüm:**
```js
// electron/db/ayar-senk.js — dosya sonu
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

module.exports = {
  _topla: topla,
  _uygula: uygula,

  'ayar-senk:topla': () => {
    yetkiKontrol('ayarlar_duzenle')   // secret döndüren uç — yetki ŞART
    return topla()
  },
  'ayar-senk:uygula': (veri) => {
    yetkiKontrol('ayarlar_duzenle')
    return uygula(veri)
  },
}
```

---

## G-2 — Yetki sistemi tamamen aşılabilir (renderer'a koşulsuz güven)

**Dosya:** `electron/yetki.js:25-38, 62-63` + `electron/main.js:85-90`

**Sorun:** `auth:profil-ayarla` kanalı, renderer'ın gönderdiği `{rol, izinler, aktif}` nesnesini doğrulamadan `aktifProfil`'e yazıyor. Sonraki tüm `yetkiKontrol()` çağrıları bu değere bakıyor. Prod build'de varsayılan Electron menüsü kapatılmamış → DevTools erişilebilir.

**Neden:** Personel DevTools'tan şunu yazarak süper yönetici olur:
```js
await window.api.invoke('auth:profil-ayarla', { aktif: true, rol: 'super_admin' })
```
Fiyat değiştirme, kasa/gider silme, kullanıcı yönetimi, tüm lokasyonlar açılır. Yetki mimarisinin tamamı (dün eklenen `sosyal_otomasyon_yonet` dahil) bu yolla delinir.

**Çözüm (2 katman):**

Katman 1 — DevTools ve menüyü prod'da kapat:
```js
// electron/main.js — createWindow() içinde
const { Menu } = require('electron')

function createWindow() {
  if (!isDev) Menu.setApplicationMenu(null)   // varsayılan menüyü kaldır

  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,                        // prod'da DevTools kapalı
    },
  })

  // Klavye kısayolunu da engelle (Ctrl+Shift+I / F12)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isDev) return
    const k = String(input.key || '').toLowerCase()
    if (k === 'f12' || (k === 'i' && (input.control || input.meta) && input.shift)) {
      event.preventDefault()
    }
  })

  // ... geri kalan aynı
}
```

Katman 2 — profil beyanını doğrula: `auth:profil-ayarla`, girişte Supabase'den alınan oturum jetonuyla birlikte gelmeli; main process jetonu doğrulamadan profili kabul etmemeli. (Daha büyük bir değişiklik; Katman 1 acil kazanç.)

---

## P-1 — `Urunler.jsx`: her tuş vuruşunda 2755 ürün tam tablo taraması

**Dosya:** `src/pages/Urunler.jsx:69-74` + `electron/db/urunler.js:60-89`

**Sorun:** `urunlerApi.listele({ boyut: 0 })` ile TÜM aktif ürünler (2755 satır, 3 JOIN) çekiliyor; filtreleme/sıralama/sayfalama istemcide yapılıyor. Arama input'unda debounce yok — `arama` state'i `yukle`'nin bağımlılığında olduğu için her harfte yeni sorgu.

**Neden:** `LIKE '%...%'` index kullanamaz → tam tablo taraması. better-sqlite3 **senkron** olduğu için main process bloklanır, UI donar. Her aramada IPC'den ~1-2 MB JSON geçer. "tencere kapağı" yazan kullanıcı 15 ayrı bloklayıcı sorgu tetikler.

**Çözüm:**
```js
// src/hooks/useDebounce.js (YENİ)
import { useState, useEffect } from 'react'

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
```
```jsx
// src/pages/Urunler.jsx
const debouncedArama = useDebounce(arama, 300)

const yukle = useCallback(async () => {
  setYukleniyor(true)
  try {
    const r = await urunlerApi.listele({
      arama: debouncedArama,
      marka_id: filtreMarka || undefined,
      kategori_id: filtreKategori || undefined,
      sayfa: sayfaNo,
      boyut: 50,              // boyut:0 KALDIRILDI — sunucu tarafı sayfalama
    })
    setUrunler(r.urunler)
    setToplam(r.toplam)
  } catch (e) { toast.error(e.message) }
  finally { setYukleniyor(false) }
}, [debouncedArama, filtreMarka, filtreKategori, sayfaNo])
```
Not: Sıralama tıklamaları sunucu tarafı `ORDER BY` eşlemesi ister (`useSiralama` istemci sıralamasından vazgeçilmeli). Bu ayrı bir orta ölçekli adım; önce arama+sayfalama taşınmalı.

---

## P-2 — `OnlineSiparisler.jsx`: aynı `boyut:0` deseni + satır başına alt sorgu

**Dosya:** `src/pages/OnlineSiparisler.jsx:100` + `electron/db/online-siparisler.js:5-27`

**Sorun:** Tüm online siparişler `boyut: 0` ile çekiliyor; her satır için korelasyonlu alt sorgu (`kargolar`'dan son takip no) çalışıyor. Bu, her 90 saniyelik arka plan tazelemede de tekrarlanıyor.

**Neden:** N sipariş = N alt sorgu, tek ana sorgu içinde. Filtreler (tarih/ödeme/durum/kargo) SQL'de değil istemcide `filter()` ile uygulanıyor.

**Çözüm:**
```js
// electron/db/online-siparisler.js
'online-siparis:listele': ({ arama, sayfa = 1, boyut = 50, tarihBas, tarihBit, odeme, durum, kargo } = {}) => {
  const db = getDb()
  let where = 'WHERE 1=1'
  const params = []
  if (arama) {
    where += ' AND (s.siparis_no LIKE ? OR s.musteri_ad LIKE ? OR s.musteri_telefon LIKE ?)'
    params.push(`%${arama}%`, `%${arama}%`, `%${arama}%`)
  }
  if (tarihBas) { where += ' AND date(s.siparis_tarihi) >= ?'; params.push(tarihBas) }
  if (tarihBit) { where += ' AND date(s.siparis_tarihi) <= ?'; params.push(tarihBit) }
  if (odeme)    { where += ' AND s.odeme_durumu = ?';          params.push(odeme) }
  if (durum)    { where += ' AND s.durum = ?';                 params.push(durum) }
  if (kargo)    { where += ' AND s.kargo_durumu = ?';          params.push(kargo) }

  const toplam = db.prepare(`SELECT COUNT(*) n FROM online_siparisler s ${where}`).get(...params).n
  const sorgu = `
    SELECT s.*, (
      SELECT k.takip_no FROM kargolar k
      WHERE (k.online_siparis_id = s.id OR (k.ikas_siparis_id IS NOT NULL AND k.ikas_siparis_id = s.ikas_siparis_id))
        AND k.durum != 'iptal'
      ORDER BY k.id DESC LIMIT 1
    ) AS kargo_takip_no
    FROM online_siparisler s ${where}
    ORDER BY s.siparis_tarihi DESC LIMIT ? OFFSET ?`
  params.push(boyut, (sayfa - 1) * boyut)
  return { toplam, siparisler: db.prepare(sorgu).all(...params) }
},
```
Ayrıca index eklenmeli:
```sql
CREATE INDEX IF NOT EXISTS idx_kargolar_online_siparis ON kargolar(online_siparis_id);
CREATE INDEX IF NOT EXISTS idx_kargolar_ikas_siparis ON kargolar(ikas_siparis_id, durum);
```

---

# 🟠 YÜKSEK

## M-1 — İade'de kargo ücreti her zaman 0 (kolon şemada yok)

**Dosya:** `electron/ikas/index.js:791`

**Sorun:** `Number(sip.kargo_tutari)` kullanılıyor ama `online_siparisler` tablosunda **`kargo_tutari` kolonu hiç yok** — ne `createTables()`'ta ne `migrate()`'te. Kargo ücreti yalnızca `kargo-etiket:veri` handler'ında canlı çekiliyor, hiçbir yere yazılmıyor.

**Neden:** Kullanıcı "kargo ücretini de iade et" seçtiğinde `undefined → 0` olur, iade tutarı kargo bedeli olmadan hesaplanır. ikas'a `refundShipping: true` gönderilir ama `orderRefundTransactions` toplamı eksiktir → müşteriye eksik para iadesi ya da tutar uyuşmazlığı hatası. **Özellik sessizce çalışmıyor.**

**Çözüm:** İade anında canlı çek:
```js
'ikas:siparis-iade': async ({ id, restock = true, refundShipping = false, bildir = true, secimler = null }) => {
  const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
  const db = getDb()
  let sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
  if (!sip) throw new Error('Sipariş bulunamadı')
  await tazeleSiparisKalemleri(db, id)
  sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
  const kalemler = db.prepare(
    'SELECT * FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL').all(id)
  if (!kalemler.length) throw new Error('İade edilebilir kalem bulunamadı (ikas tarafında sipariş kalemi yok).')

  // Kargo ücreti DB'de TUTULMUYOR (kolon yok) → ikas'tan canlı çek.
  let kargoTutari = 0
  if (refundShipping) {
    const d = await graphql(
      `query($f: StringFilterInput){ listOrder(id:$f, pagination:{page:1,limit:1}){ data { shippingLines { price } } } }`,
      { f: { eq: sip.ikas_siparis_id } })
    kargoTutari = (d?.listOrder?.data?.[0]?.shippingLines || [])
      .reduce((s, l) => s + (Number(l.price) || 0), 0)
  }

  // ... mevcut iade seçim mantığı aynı ...

  const kalemToplam = orderRefundLines.reduce(
    (s, l) => s + (Number(l.price) || 0) * (Number(l.quantity) || 0), 0)
  const iadeTutari = Math.round((kalemToplam + (refundShipping ? kargoTutari : 0)) * 100) / 100

  // ... geri kalan aynı ...
}
```

---

## M-2 — Kısmi iade: aynı ödeme işlemine ikinci kez iade atanabilir

**Dosya:** `electron/ikas/index.js:798-808`

**Sorun:** `zatenIade` yalnızca **sipariş geneli** toplam iadeyi biliyor; hangi SALE işlemine ne kadar iade uygulandığı izlenmiyor. Döngü her SALE'in `t.amount`'ını hiç iade edilmemiş gibi kabul ediyor.

**Neden — somut senaryo:** SALE A=100₺, B=50₺. İlk kısmi iadede A'ya 80₺ atanır (A'nın kalanı artık 20₺). İkinci kısmi iadede kod yine A'yı ilk sırada değerlendirir ve `min(kalan, 100)` hesaplar — A'nın gerçek kalanının 20₺ olduğunu bilmez. ikas "amount exceeds transaction" ile reddeder, **ikinci kısmi iade tamamen başarısız olur.**

**Çözüm:**
```js
if (iadeTutari > 0) {
  const txVeri = await graphql(
    `query($o:String!){ listOrderTransactions(orderId:$o, includeAll:true){ id amount type status relatedTransactionId } }`,
    { o: sip.ikas_siparis_id })
  const txlar = txVeri?.listOrderTransactions || []
  const satislar = txlar.filter(t => t.type === 'SALE' && t.status === 'SUCCESS')

  // REFUND'ları bağlı olduğu SALE'e göre topla — sipariş geneli DEĞİL, işlem bazlı.
  const iadeEdilen = new Map()
  for (const t of txlar) {
    if (t.type === 'REFUND' && t.status === 'SUCCESS' && t.relatedTransactionId) {
      iadeEdilen.set(t.relatedTransactionId,
        (iadeEdilen.get(t.relatedTransactionId) || 0) + (Number(t.amount) || 0))
    }
  }

  let kalan = iadeTutari
  for (const t of satislar) {
    if (kalan <= 0.001) break
    const kalanPay = Math.round(((Number(t.amount) || 0) - (iadeEdilen.get(t.id) || 0)) * 100) / 100
    if (kalanPay <= 0) continue                     // bu işlem tamamen iade edilmiş
    const pay = Math.round(Math.min(kalan, kalanPay) * 100) / 100
    if (pay > 0) {
      orderRefundTransactions.push({ transactionId: t.id, amount: pay, refundToStoreCredit: false })
      kalan -= pay
    }
  }
}
```
⚠️ `relatedTransactionId` alan adı ikas şemasında doğrulanmalı (yer tutucu).

---

## G-3 — Dinamik kolon adı enjeksiyonu

**Dosya:** `electron/db/musteriler.js:26-32`, `electron/db/lokasyonlar.js:16`, `electron/db/lokasyon-gonderici.js:55-58`, `electron/db/ayar-senk.js:65,70,73`

**Sorun:** Değerler parametrize (`@key`) ama **kolon adları** renderer'dan gelen `Object.keys(veri)` ile doğrudan SQL'e giriyor. Whitelist yok.

**Neden:** Kolon adı yerine ifade/subquery enjekte edilerek sorgu semantiği bozulabilir; en azından DB hatası tetiklenip `main.js:259-261` üzerinden ham `err.message` renderer'a döner → şema keşfi.

**Çözüm:**
```js
// electron/db/musteriler.js
const IZINLI_KOLONLAR = new Set([
  'ad', 'soyad', 'telefon', 'email', 'tc_kimlik', 'vergi_no', 'vergi_dairesi',
  'unvan', 'adres', 'il', 'ilce', 'iskonto_orani', 'aktif',
])

function guvenliKolonlar(veri) {
  const kolonlar = Object.keys(veri)
  for (const k of kolonlar) {
    if (!IZINLI_KOLONLAR.has(k)) throw new Error(`Geçersiz alan: ${k}`)
  }
  return kolonlar
}

'musteriler:olustur': (veri) => {
  yetkiKontrol('musteri_duzenle')
  const db = getDb()
  const cols = guvenliKolonlar(veri)
  const r = db.prepare(
    `INSERT INTO musteriler (${cols.join(', ')}) VALUES (${cols.map(k => '@' + k).join(', ')})`
  ).run(veri)
  return db.prepare('SELECT * FROM musteriler WHERE id = ?').get(r.lastInsertRowid)
},
```
Aynı desen diğer üç dosyaya da uygulanmalı. Ek olarak `main.js` genel hata yakalayıcısı prod'da ham `err.message` yerine genel mesaj dönmeli, detayı log'a yazmalı.

---

## G-4 — `lokasyonlar:olustur/guncelle` yetki kontrolsüz

**Dosya:** `electron/db/lokasyonlar.js:8, 14`

**Sorun:** Diğer CRUD handler'larının aksine bu ikisinde `yetkiKontrol()` yok.

**Neden:** Personel yeni lokasyon ekleyebilir veya mevcut lokasyonun `ikas_lokasyon_id` eşleşmesini değiştirebilir → stok senkronu yanlış ikas lokasyonuna gider, stok karışır.

**Çözüm:**
```js
'lokasyonlar:olustur': (veri) => {
  yetkiKontrol('ayarlar_duzenle')
  // ... mevcut gövde
},
'lokasyonlar:guncelle': ({ id, ...veri }) => {
  yetkiKontrol('ayarlar_duzenle')
  // ... mevcut gövde
},
```

---

## R-1 — `AuthContext` value memoize edilmemiş

**Dosya:** `src/auth/AuthContext.jsx:54-65`

**Sorun:** `value` nesnesi ve `yetkiVar`/`lokasyonErisim`/`erisilebilirLokasyonlar` her render'da yeni referansla üretiliyor.

**Neden:** Bu fonksiyonlar `Satis.jsx`, `App.jsx` gibi yerlerde `useEffect`/`useCallback` bağımlılığında kullanılıyor. Kararsız referans ya effect'lerin gereksiz yeniden kurulmasına ya da bağımlılığın eksik bırakılıp stale closure'a yol açıyor. Ayrıca `useAuth()` kullanan tüm bileşenler gereksiz re-render oluyor.

**Çözüm:**
```jsx
import { createContext, useContext, useState, useCallback, useMemo } from 'react'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  // giris, cikis useCallback tanımları aynı kalır

  const yetkiVarFn = useCallback((kod) => yetkiVar(profil, kod), [profil])
  const lokasyonErisimFn = useCallback((id) => lokasyonErisim(profil, id), [profil])
  const erisilebilirLokasyonlarFn = useCallback(
    (lokasyonlar) => erisilebilirLokasyonlar(profil, lokasyonlar), [profil])

  const value = useMemo(() => ({
    user, profil, girisYapildi: !!profil, giris, cikis,
    yetkiVar: yetkiVarFn,
    lokasyonErisim: lokasyonErisimFn,
    erisilebilirLokasyonlar: erisilebilirLokasyonlarFn,
  }), [user, profil, giris, cikis, yetkiVarFn, lokasyonErisimFn, erisilebilirLokasyonlarFn])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

---

## R-2 — `Satis.jsx` başlangıç effect'inde eksik bağımlılık

**Dosya:** `src/pages/Satis.jsx:92-104`

**Sorun:** Boş `[]` dep array içinde `erisilebilirLokasyonlar` kullanılıyor.

**Neden:** `profil` asenkron geldiği için ilk çağrı eski/boş profille hesaplanabilir → kullanıcı yetkili olduğu lokasyonu göremez.

**Çözüm:** (R-1 düzeltmesinden sonra)
```jsx
useEffect(() => {
  lokasyonApi.listele().then(lok => {
    const erisilebilir = erisilebilirLokasyonlar(lok)
    setLokasyonlar(erisilebilir)
    if (erisilebilir.length) {
      setSecilenLokasyonId(prev =>
        (prev && erisilebilir.some(l => l.id === prev)) ? prev : erisilebilir[0].id)
    }
  })
  markaApi.listele().then(setMarkalar)
  setApi.listele().then(setSetler).catch(() => {})
}, [erisilebilirLokasyonlar])
```

---

# 🟡 ORTA

## P-3 — `sonrakiStokKodu`: markanın tüm ürünlerini çekip JS'te regex

**Dosya:** `electron/db/urunler.js:32-46`

**Sorun:** Her yeni ürün eklemede markanın TÜM SKU'ları çekilip JS döngüsünde regex'leniyor. Lava'da 3925, Rollers'ta 1784 ürün var.

**Çözüm:**
```js
function sonrakiStokKodu(db, marka_id) {
  if (!marka_id) return null
  const row = db.prepare(`
    SELECT sku,
      CAST(substr(sku, instr(sku, '.', instr(sku, '.') + 1) + 1) AS INTEGER) AS num
    FROM urunler
    WHERE marka_id = ? AND sku LIKE 'TNC.%.%'
    ORDER BY num DESC
    LIMIT 1
  `).get(marka_id)
  if (!row) return null
  const m = /^TNC\.([A-Za-z0-9ÇĞİÖŞÜçğıöşü]+)\.(\d+)$/.exec(String(row.sku).trim())
  if (!m) return null
  const hane = Math.max(m[2].length, 5)
  return `TNC.${m[1]}.${String(row.num + 1).padStart(hane, '0')}`
}
```
Ek: `CREATE INDEX IF NOT EXISTS idx_urunler_marka_sku ON urunler(marka_id, sku);`

## P-4 — `OnlineSiparisler.jsx` filtreleri memoize edilmemiş

**Dosya:** `src/pages/OnlineSiparisler.jsx:110-125`

`filtreliSiparisler` ve üç `Set` her render'da yeniden hesaplanıyor. `useMemo` ile sarılmalı (P-2 kalıcı çözümüne kadar ara adım).

## M-3 — Çoklu lokasyonlu iadede tek `stockLocationId`

**Dosya:** `electron/ikas/index.js:776`

Farklı mağazalardan karşılanan kalemler ikas'a tek lokasyonla gönderiliyor → ikas'ta yanlış mağazaya restock. Lokasyona göre gruplayıp ayrı `refundOrderLine` çağrıları yapılmalı.

## P-5 — `merchantIdAl` cache'i hiç invalidate edilmiyor

**Dosya:** `electron/ikas/index.js:103-111` — Düşük risk, bilgi amaçlı. Aksiyon gerekmiyor.

---

# ✅ Temiz çıkanlar

- `.env` gitignore'da, repoya secret sızmamış
- `contextIsolation: true`, `nodeIntegration: false`, preload minimal ve `contextBridge` doğru
- Hiçbir HTTPS çağrısında `rejectUnauthorized: false` yok
- `urunler.js`, `satislar.js`, `stok.js`'te SQL parametrizasyonu ve yetki kontrolü tutarlı
- Yedekleme native dialog kullanıyor (path traversal yok), `ayarlar_duzenle` ile korunuyor
- Polling döngüleri (`main.js:108-184`) `calisiyor` bayrağıyla üst üste binmeye karşı korumalı; `clearInterval` eksikliği burada sızıntı değil (uygulama ömrü boyunca çalışmaları gerekiyor)
- `OnlineSiparisler.jsx`, `SosyalMedya.jsx`, `Kargo.jsx`'te listener'lar doğru temizleniyor
- `onClick` event tuzağı yok; `Satis.jsx:260-261`'de ona karşı açık savunma var
- `electron/ups/takip.js`, `electron/meta/otomasyon.js` savunmacı ve titiz yazılmış

# Kapsam notu

`src/pages/Ayarlar.jsx` (709 satır) ve `src/pages/Urunler.jsx` (380) satır satır incelenmedi — ikinci turda ele alınabilir.
