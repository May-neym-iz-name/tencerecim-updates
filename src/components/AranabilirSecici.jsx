import { useEffect, useMemo, useRef, useState } from 'react'
import { eslesirMi } from '../utils/arama'

// Aranabilir seçici (combobox): uzun listelerde kaydırmak yerine yazarak filtrele + seç.
// Klavye: ↑/↓ gezin, Enter seç, Esc kapat. Dış tıklama kapatır.
//
// props:
//   secenekler: [{ deger, etiket }]  — deger seçildiğinde onChange'e döner
//   deger: mevcut seçili değer (secenekler'deki deger ile eşleşir)
//   onChange(deger, secenek): seçim yapılınca çağrılır (temizlemede deger='' )
//   placeholder, disabled, className: standart alanlar
//   bosSecenek: true ise başa "temizle" seçeneği eklenir (varsayılan true)
export default function AranabilirSecici({
  secenekler = [], deger, onChange, placeholder = 'Ara veya seç…',
  disabled = false, className = '', bosSecenek = true,
}) {
  const [acik, setAcik] = useState(false)
  const [sorgu, setSorgu] = useState('')
  const [vurgu, setVurgu] = useState(0)
  const sarmalRef = useRef(null)
  const listeRef = useRef(null)

  const seciliEtiket = useMemo(() => {
    const s = secenekler.find(x => String(x.deger) === String(deger))
    return s ? s.etiket : ''
  }, [secenekler, deger])

  // Kelime bazlı + Türkçe duyarsız (bkz. src/utils/arama.js). Eskiden toLocaleLowerCase('tr')
  // ile TEK PARÇA aranıyordu; "LINES" yazan "LİNES"i bulamıyordu (tr locale I → ı yapar)
  // ve kelimeleri ürün adındaki sırayla yazmak zorunluydu.
  const filtreli = useMemo(() => {
    if (!sorgu.trim()) return secenekler
    return secenekler.filter(x => eslesirMi(x.etiket, sorgu))
  }, [secenekler, sorgu])

  // Dış tıklama → kapat ve sorguyu sıfırla (girdi seçili etikete döner).
  useEffect(() => {
    if (!acik) return
    const kapat = (e) => { if (sarmalRef.current && !sarmalRef.current.contains(e.target)) { setAcik(false); setSorgu('') } }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [acik])

  // Açılınca vurguyu seçili öğeye getir.
  useEffect(() => { if (acik) setVurgu(0) }, [acik, sorgu])

  // Vurgulanan öğeyi görünür tut.
  useEffect(() => {
    if (acik && listeRef.current) {
      const el = listeRef.current.children[vurgu]
      if (el) el.scrollIntoView({ block: 'nearest' })
    }
  }, [vurgu, acik])

  function sec(secenek) {
    onChange(secenek ? secenek.deger : '', secenek || null)
    setAcik(false); setSorgu('')
  }

  function tusla(e) {
    if (disabled) return
    if (!acik && (e.key === 'ArrowDown' || e.key === 'Enter')) { setAcik(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setVurgu(v => Math.min(v + 1, filtreli.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setVurgu(v => Math.max(v - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtreli[vurgu]) sec(filtreli[vurgu]) }
    else if (e.key === 'Escape') { setAcik(false); setSorgu('') }
  }

  return (
    <div ref={sarmalRef} className={`relative ${className}`}>
      <input
        type="text"
        disabled={disabled}
        value={acik ? sorgu : seciliEtiket}
        placeholder={seciliEtiket || placeholder}
        onChange={e => { setSorgu(e.target.value); if (!acik) setAcik(true) }}
        onFocus={() => !disabled && setAcik(true)}
        onKeyDown={tusla}
        className="w-full border rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {/* Ok / temizle göstergesi */}
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▾</span>

      {acik && !disabled && (
        <div ref={listeRef} className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto bg-white border rounded-lg shadow-lg text-sm">
          {bosSecenek && (
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => sec(null)}
              className="w-full text-left px-3 py-1.5 text-gray-400 hover:bg-gray-50 italic">— Seçimi kaldır —</button>
          )}
          {filtreli.length === 0 && (
            <p className="px-3 py-2 text-gray-400">Sonuç yok</p>
          )}
          {filtreli.map((s, i) => (
            <button key={String(s.deger)} type="button"
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setVurgu(i)}
              onClick={() => sec(s)}
              className={`w-full text-left px-3 py-1.5 ${i === vurgu ? 'bg-blue-50' : ''} ${String(s.deger) === String(deger) ? 'font-semibold text-blue-700' : 'text-gray-700'} hover:bg-blue-50`}>
              {s.etiket}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
