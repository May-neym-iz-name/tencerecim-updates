import { useState } from 'react'

// Üstte sekme çubuğu + altta aktif sekme içeriği (Ayarlar'daki sekme görünümü gibi).
// sekmeler: [{ kod, ad, el }] — yetkiye göre önceden filtrelenmiş gelir.
export default function Sekmeler({ sekmeler }) {
  const [aktif, setAktif] = useState(sekmeler[0]?.kod)
  if (!sekmeler.length) return null
  const akt = sekmeler.find(s => s.kod === aktif) || sekmeler[0]
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 border-b bg-white px-4 pt-3 flex-shrink-0 overflow-x-auto">
        {sekmeler.map(s => (
          <button key={s.kod} onClick={() => setAktif(s.kod)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              akt.kod === s.kod ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {s.ad}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{akt.el}</div>
    </div>
  )
}
