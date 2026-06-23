import { SAYFA_BOYUT_SECENEKLERI } from '../hooks/useSayfalama'

// Sayfa numarası penceresi: aktif sayfanın etrafında en çok 5 numara gösterir.
function sayfaNumaralari(aktif, toplam) {
  const pencere = 2
  let bas = Math.max(1, aktif - pencere)
  let bit = Math.min(toplam, aktif + pencere)
  if (bit - bas < 4) {
    if (bas === 1) bit = Math.min(toplam, bas + 4)
    else if (bit === toplam) bas = Math.max(1, bit - 4)
  }
  const arr = []
  for (let i = bas; i <= bit; i++) arr.push(i)
  return arr
}

// Ortak sayfalama çubuğu: sayfa başına adet seçimi + aralık bilgisi + sayfa gezinme.
export default function Sayfalama({ sayfa, toplamSayfa, boyut, setSayfa, setBoyut, toplam, boyutSecenekleri = SAYFA_BOYUT_SECENEKLERI }) {
  if (!toplam) return null
  const ilk = (sayfa - 1) * boyut + 1
  const son = Math.min(sayfa * boyut, toplam)
  const numaralar = sayfaNumaralari(sayfa, toplamSayfa)

  const dugme = 'min-w-[2rem] px-2 py-1 rounded-lg text-sm border disabled:opacity-40'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <span>Sayfa başına</span>
        <select value={boyut} onChange={e => setBoyut(e.target.value)}
          className="border rounded-lg px-2 py-1 bg-white">
          {boyutSecenekleri.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="text-gray-400">·</span>
        <span>{ilk}–{son} / {toplam} kayıt</span>
      </div>

      <div className="flex items-center gap-1">
        <button className={dugme} disabled={sayfa <= 1} onClick={() => setSayfa(1)} title="İlk sayfa">«</button>
        <button className={dugme} disabled={sayfa <= 1} onClick={() => setSayfa(sayfa - 1)} title="Önceki">‹</button>
        {numaralar[0] > 1 && <span className="px-1 text-gray-400">…</span>}
        {numaralar.map(n => (
          <button key={n} onClick={() => setSayfa(n)}
            className={`${dugme} ${n === sayfa ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>
            {n}
          </button>
        ))}
        {numaralar[numaralar.length - 1] < toplamSayfa && <span className="px-1 text-gray-400">…</span>}
        <button className={dugme} disabled={sayfa >= toplamSayfa} onClick={() => setSayfa(sayfa + 1)} title="Sonraki">›</button>
        <button className={dugme} disabled={sayfa >= toplamSayfa} onClick={() => setSayfa(toplamSayfa)} title="Son sayfa">»</button>
      </div>
    </div>
  )
}
