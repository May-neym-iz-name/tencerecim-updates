// Tıklanabilir tablo başlığı: aktif sütunda ▲/▼ ok, diğerlerinde soluk ⇅ ipucu.
// Kullanım: <SiraliBaslik k="satis_fiyati" {...sr}>Satış</SiraliBaslik> (sr = useSiralama dönüşü)
export default function SiraliBaslik({ k, anahtar, siraYon, sirala, children, className = '', align = 'left' }) {
  const aktif = anahtar === k
  const ok = aktif ? (siraYon === 'asc' ? '▲' : '▼') : '⇅'
  return (
    <th className={`px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap select-none cursor-pointer hover:text-gray-900 text-${align} ${className}`}
      onClick={() => sirala(k)} title="Sırala">
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`text-[10px] ${aktif ? 'text-blue-600' : 'text-gray-300'}`}>{ok}</span>
      </span>
    </th>
  )
}
