import { useEffect, useState } from 'react'
import { upsApi } from '../api/ipc'

// UPS il/ilçe (semt) seçici. Değer olarak il_kodu ve ilce_kodu döndürür.
// props: ilKodu, ilceKodu, onChange({ ilKodu, il, ilceKodu, ilce })
export default function IlIlceSecici({ ilKodu, ilceKodu, onChange, disabled }) {
  const [iller, setIller] = useState([])
  const [ilceler, setIlceler] = useState([])

  useEffect(() => { upsApi.iller().then(setIller).catch(() => {}) }, [])

  useEffect(() => {
    if (!ilKodu) { setIlceler([]); return }
    upsApi.ilceler(Number(ilKodu)).then(setIlceler).catch(() => {})
  }, [ilKodu])

  function ilSec(e) {
    const kod = e.target.value
    const il = iller.find(i => String(i.il_kodu) === kod)
    onChange({ ilKodu: kod ? Number(kod) : null, il: il?.il || '', ilceKodu: null, ilce: '' })
  }

  function ilceSec(e) {
    const kod = e.target.value
    const ilce = ilceler.find(i => String(i.ilce_kodu) === kod)
    const il = iller.find(i => String(i.il_kodu) === String(ilKodu))
    onChange({ ilKodu: ilKodu ? Number(ilKodu) : null, il: il?.il || '', ilceKodu: kod ? Number(kod) : null, ilce: ilce?.ilce || '' })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <select value={ilKodu || ''} onChange={ilSec} disabled={disabled}
        className="border rounded px-2 py-1.5 text-sm bg-white">
        <option value="">İl seçin</option>
        {iller.map(i => <option key={i.il_kodu} value={i.il_kodu}>{i.il}</option>)}
      </select>
      <select value={ilceKodu || ''} onChange={ilceSec} disabled={disabled || !ilKodu}
        className="border rounded px-2 py-1.5 text-sm bg-white">
        <option value="">İlçe / Semt seçin</option>
        {ilceler.map(i => <option key={i.ilce_kodu} value={i.ilce_kodu}>{i.ilce}</option>)}
      </select>
    </div>
  )
}
