// Şablon oluşturma/düzenleme. Kullanıcı KUTULARI doldurur; mesajın tamamını asla yazmaz.
// Mesaj birleştirme electron/meta/sablon-mesaj.js'te (ana süreç) — burada yalnız önizleme.
// NOT: önizleme mantığı sablon-mesaj.js ile AYNI biçimi üretmeli; biçim değişirse ikisi de
// güncellenmeli (renderer Node/CJS modülünü çağıramaz, IPC ise her tuş vuruşunda çağrı demek).
import { useState, useEffect } from 'react'
import { urunlerApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'

const MAKS_KARAKTER = 1000

function onizle({ urun_adi, aciklama, fiyat, link, whatsapp }) {
  const s = ['Merhaba! 👋', '', `🍲 ${urun_adi || '(ürün adı)'}`]
  if (aciklama) s.push(aciklama)
  const f = Number(fiyat)
  if (f) s.push(`💰 ${f.toLocaleString('tr-TR')} TL`)
  if (link) s.push(`🛒 ${link}`)
  s.push('')
  if (whatsapp) s.push(`📱 Sipariş ve bilgi: ${whatsapp}`)
  return s.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function Alan({ etiket, not, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600">{etiket}</label>
      {not && <span className="text-[11px] text-gray-400 ml-1">· {not}</span>}
      <div className="mt-1">{children}</div>
    </div>
  )
}

export default function SablonFormu({ sablon, onKapat, onKaydet }) {
  const [v, setV] = useState({
    ad: '', urun_id: null, urun_adi: '', aciklama: '', fiyat: '', link: '', whatsapp: '',
    ...(sablon || {}),
  })
  const [urunler, setUrunler] = useState([])
  // Ürün YOKKEN "üründen al" anlamsız — false başlar, yoksa fiyat kutusu kilitli kalır
  // ve kutucuk da (ürün olmadığı için) kilitli olduğundan çıkışı olmayan bir durum doğar.
  const [urundenAl, setUrundenAl] = useState(!!(sablon?.urun_id && sablon?.fiyat == null))

  // urunler:listele → { toplam, urunler }. boyut:0 = sınırsız (electron/db/urunler.js).
  useEffect(() => {
    urunlerApi.listele({ boyut: 0 }).then(r => setUrunler(r?.urunler || [])).catch(() => {})
  }, [])

  const secUrun = (id) => {
    const u = urunler.find(x => String(x.id) === String(id))
    setV(o => ({ ...o, urun_id: u ? u.id : null, urun_adi: o.urun_adi || (u?.ad || '') }))
    // Ürün seçilince canlı fiyat varsayılan olsun; ürün kaldırılınca elle yazmaya dön.
    setUrundenAl(!!u)
  }
  const secili = urunler.find(u => String(u.id) === String(v.urun_id))
  // "Üründen al" ancak gerçekten ürün bağlıysa geçerli — tek doğruluk kaynağı bu.
  const urundenAlEtkin = urundenAl && !!v.urun_id
  const etkinFiyat = urundenAlEtkin ? (secili?.satis_fiyati ?? '') : v.fiyat
  const metin = onizle({ ...v, fiyat: etkinFiyat })
  const asildi = metin.length > MAKS_KARAKTER

  const kaydet = () => onKaydet({ ...v, fiyat: urundenAlEtkin ? null : (v.fiyat || null) })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onKapat}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">{sablon?.id ? 'Şablonu Düzenle' : 'Yeni Şablon'}</h3>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-3">
            <Alan etiket="Şablon adı" not="listede göreceğin isim">
              <input value={v.ad} onChange={e => setV(o => ({ ...o, ad: e.target.value }))}
                placeholder="Çelik Kase Seti 6'lı" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="Ürün" not="bağlarsan fiyat programdan canlı gelir">
              <AranabilirSecici
                secenekler={urunler.map(u => ({ deger: u.id, etiket: `${u.ad}${u.sku ? ' · ' + u.sku : ''}` }))}
                deger={v.urun_id || ''} onChange={secUrun} placeholder="Ürün ara…" />
            </Alan>
            <Alan etiket="Ürün adı" not="mesajda görünecek ad">
              <input value={v.urun_adi} onChange={e => setV(o => ({ ...o, urun_adi: e.target.value }))}
                placeholder="Çelik Kase Seti 6'lı" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="Açıklama">
              <textarea value={v.aciklama || ''} onChange={e => setV(o => ({ ...o, aciklama: e.target.value }))}
                rows={2} placeholder="18/10 paslanmaz çelik, iç içe geçen tasarım"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="Fiyat">
              <div className="flex items-center gap-2">
                <input value={urundenAlEtkin ? (secili?.satis_fiyati ?? '') : (v.fiyat || '')}
                  disabled={urundenAlEtkin}
                  onChange={e => setV(o => ({ ...o, fiyat: e.target.value }))}
                  placeholder="1450" className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" />
                <label className={`flex items-center gap-1 text-xs whitespace-nowrap ${v.urun_id ? '' : 'text-gray-300'}`}
                  title={v.urun_id ? 'Fiyatı programdaki üründen al' : 'Önce ürün seçin'}>
                  <input type="checkbox" checked={urundenAlEtkin} disabled={!v.urun_id}
                    onChange={e => setUrundenAl(e.target.checked)} />
                  Üründen al
                </label>
              </div>
              {urundenAlEtkin
                ? <p className="text-[11px] text-emerald-600 mt-1">Fiyat üründen geliyor — zam yapınca mesaj kendiliğinden güncellenir</p>
                : <p className="text-[11px] text-gray-400 mt-1">
                    Fiyat elle yazılıyor{v.urun_id ? " — canlı fiyat için 'Üründen al'ı işaretleyin" : ''}
                  </p>}
            </Alan>
            <Alan etiket="Online sipariş linki">
              <input value={v.link || ''} onChange={e => setV(o => ({ ...o, link: e.target.value }))}
                placeholder="tencerecim.store/celik-kase-seti" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="WhatsApp sipariş hattı">
              <input value={v.whatsapp || ''} onChange={e => setV(o => ({ ...o, whatsapp: e.target.value }))}
                placeholder="0555 123 45 67" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Müşteriye gidecek mesaj</p>
            <pre className="bg-gray-50 border rounded-xl p-3 text-sm whitespace-pre-wrap font-sans h-80 overflow-auto">
              {metin}
            </pre>
            <p className={`text-xs mt-2 ${asildi ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
              {metin.length}/{MAKS_KARAKTER} karakter
              {asildi && ' — sınır aşıldı, kısaltın'}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onKapat} className="px-4 py-2 text-sm text-gray-600">İptal</button>
          <button onClick={kaydet} disabled={!v.ad?.trim() || !v.urun_adi?.trim() || asildi}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">Kaydet</button>
        </div>
      </div>
    </div>
  )
}
