// "Sorular" sekmesi sol listesi (08.09.2026, kullanıcı seçimi 1A: liste görünümü).
// Fiyat DIŞI (niyet='soru') yorumlar; hangi gönderide, kim, ne sordu, teşekkür DM'i gitti mi.
// Temsilci cevaplayana kadar burada bekler — kullanıcı: "temsilci bu kullanıcıyı kendi
// bulmamalı, biz mesaj göndersek dahi ayrı bir yerde listelenmeli".
import SosyalGorsel from './SosyalGorsel'
import { adSadelestir } from '../utils/ad'

function zaman(t) {
  if (!t) return ''
  const d = new Date(t), fark = (Date.now() - d.getTime()) / 1000
  if (fark < 60) return 'az önce'
  if (fark < 3600) return `${Math.floor(fark / 60)}d`
  if (fark < 86400) return `${Math.floor(fark / 3600)}s`
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
}

export default function SorularListesi({ sorular, seciliId, onSec, onUstlen, onOkundu, kullanici }) {
  if (!sorular.length) {
    return <div className="p-8 text-sm text-gray-400 text-center">Bekleyen fiyat dışı soru yok 🎉</div>
  }
  return (
    <div className="divide-y divide-gray-100">
      {sorular.map(s => {
        const aktif = seciliId === s.id
        return (
          <button key={s.id} type="button" onClick={() => onSec(s)}
            className={`w-full text-left flex gap-3 px-3 py-2.5 border-l-[3px] transition-colors
              ${aktif ? 'bg-marka-50 border-krem-400' : 'border-transparent hover:bg-gray-50'}`}>
            <SosyalGorsel konuId={s.konu_id} className="w-14 h-14 rounded-md object-cover flex-shrink-0 bg-gray-100"
              yedek={<div className="w-14 h-14 rounded-md bg-gray-100 flex-shrink-0" />} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                {/* AD ayrı satırda, kalın, marka-900 (tasarım kuralı: ad metinle aynı satırda olmaz) */}
                <div className={`text-[15px] leading-tight truncate ${s.durum === 'yeni' ? 'font-bold text-marka-900' : 'font-semibold text-gray-800'}`}>
                  {adSadelestir(s.gonderen_ad || 'Müşteri', 28)}
                </div>
                <div className="text-[11px] text-gray-400 whitespace-nowrap">{zaman(s.mesaj_tarihi)}</div>
              </div>
              <div className="text-[12px] text-marka-400 truncate">{s.gonderi_baslik || 'Gönderi'}</div>
              <div className="text-[13px] text-gray-800 mt-0.5 line-clamp-2">{s.metin}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {s.ozel_mesaj_tarihi
                  ? <span className="text-[11px] px-1.5 py-0.5 rounded border border-krem-200 bg-krem-50 text-krem-600">🤖 Teşekkür gitti</span>
                  : <span className="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">⏳ teşekkür sırada</span>}
                {s.atanan_kullanici && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">👤 {s.atanan_kullanici}</span>
                )}
                {!s.atanan_kullanici && kullanici && (
                  <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onUstlen(s) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onUstlen(s) } }}
                    className="text-[11px] px-2 py-0.5 rounded border border-gray-200 hover:bg-white cursor-pointer">Üstlen</span>
                )}
                {s.durum === 'yeni' && (
                  <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); onOkundu(s) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onOkundu(s) } }}
                    className="text-[11px] px-2 py-0.5 rounded border border-gray-200 hover:bg-white cursor-pointer">Okundu</span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
