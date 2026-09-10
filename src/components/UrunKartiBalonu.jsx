// Sohbette bizim gönderdiğimiz ÜRÜN KARTI — Instagram'daki görünümün aynısı (08.09.2026,
// kullanıcı seçimi 3B: tam kart). Eskiden kart DM'i boş balon olarak görünüyordu.
// Veri: ham_ek JSON { kim, elements:[{ title, subtitle, image_url, url, buttons:[{title,url}] }] }
// (kart-kayit.js). `buttons` 10.09'da eklendi — eski kayıtlarda yoktur, o zaman tek `url`
// butonuna düşülür (aşağıdaki butonlariCoz). ham_ek yoksa ek_* alanlarından tek kart. Birden çok ürün: ilk kart tam, kalanlar "+N" ile açılır.
import { useState } from 'react'

function kartlar(m) {
  try {
    const h = JSON.parse(m.ham_ek || '')
    if (Array.isArray(h?.elements) && h.elements.length) return { kim: h.kim, el: h.elements }
  } catch { /* ham_ek yok ya da bozuk → ek_* alanlarına düş */ }
  return { kim: null, el: [{ title: m.ek_baslik, subtitle: m.metin, image_url: m.ek_gorsel, url: m.ek_link }] }
}

// Kartın butonları. Yeni kayıtlarda `buttons` dolu gelir (Instagram'a giden yükün aynısı:
// 🛒 Online Sipariş + WhatsApp hatları). Eski kayıtlarda alan yok → tek site butonuna düşülür.
function butonlariCoz(k) {
  const b = Array.isArray(k.buttons) ? k.buttons.filter(x => x && x.url) : []
  if (b.length) return b.map(x => ({ title: x.title || 'Aç', url: x.url }))
  return k.url ? [{ title: 'Siteden Al', url: k.url }] : []
}

export default function UrunKartiBalonu({ m }) {
  const { kim, el } = kartlar(m)
  const [acik, setAcik] = useState(false)
  const goster = acik ? el : el.slice(0, 1)
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="text-[11px] text-marka-400">🛍️ Ürün kartı · {kim || 'otomasyon'}</div>
      <div className="flex gap-2 overflow-x-auto max-w-full">
        {goster.map((k, i) => (
          <div key={i}
            className="w-[240px] flex-shrink-0 bg-white border border-marka-100 rounded-xl overflow-hidden text-gray-900">
            <a href={k.url || undefined} target="_blank" rel="noopener noreferrer" className="block hover:opacity-95">
              {k.image_url
                ? <img src={k.image_url} alt="" loading="lazy" className="h-[120px] w-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none' }} />
                : <div className="h-[120px] bg-marka-50" />}
              <div className="px-2.5 py-2">
                <div className="font-bold text-marka-900 text-[13px] leading-tight">{k.title}</div>
                {k.subtitle && <div className="text-[12px] text-marka-400 mt-0.5">{k.subtitle}</div>}
              </div>
            </a>
            {butonlariCoz(k).map((b, j) => (
              <a key={j} href={b.url} target="_blank" rel="noopener noreferrer"
                className="block border-t border-marka-100 text-center py-1.5 text-[13px] font-semibold text-blue-600 hover:bg-marka-50">
                {b.title}
              </a>
            ))}
          </div>
        ))}
        {!acik && el.length > 1 && (
          <button type="button" onClick={() => setAcik(true)} title="Diğer ürünleri göster"
            className="w-[72px] flex-shrink-0 bg-white/70 border border-marka-100 rounded-xl text-marka-900 font-bold text-sm hover:bg-white">
            +{el.length - 1}
          </button>
        )}
      </div>
    </div>
  )
}
