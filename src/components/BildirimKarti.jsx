// Tek bir bildirim satırı/kartı — saf sunum. onem='yuksek' kırmızı/turuncu vurgulu,
// okunmamışlar koyu; tıklanınca onTikla(bildirim) çağrılır (okundu + siparişe git).
const ONEM_STIL = {
  yuksek: 'border-red-300 bg-red-50',
  normal: 'border-gray-200 bg-white',
}

export default function BildirimKarti({ bildirim, onTikla }) {
  const b = bildirim
  const vurgu = ONEM_STIL[b.onem] || ONEM_STIL.normal
  const okunmadi = !b.okundu

  return (
    <button
      type="button"
      onClick={() => onTikla(b)}
      className={`w-full text-left border rounded-xl px-4 py-3 transition-colors hover:brightness-95 ${vurgu} ${okunmadi ? 'ring-1 ring-inset ring-red-200' : 'opacity-70'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm ${okunmadi ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
            {b.onem === 'yuksek' && <span className="mr-1">⚠️</span>}
            {b.baslik}
          </p>
          {b.mesaj && <p className="text-xs text-gray-500 mt-0.5 truncate">{b.mesaj}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {okunmadi && <span className="w-2 h-2 rounded-full bg-red-600" title="Okunmadı" />}
          <span className="text-[11px] text-gray-400">{(b.olusturma_tarihi || '').slice(0, 16)}</span>
        </div>
      </div>
    </button>
  )
}
