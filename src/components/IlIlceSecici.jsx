import { useEffect, useMemo, useState } from 'react'
import { upsApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'

// UPS il/ilçe (semt) seçici. Değer olarak il_kodu ve ilce_kodu döndürür.
// Artık aranabilir: uzun il/ilçe listelerinde kaydırmak yerine yazarak bulunur.
// props: ilKodu, ilceKodu, onChange({ ilKodu, il, ilceKodu, ilce })
export default function IlIlceSecici({ ilKodu, ilceKodu, onChange, disabled }) {
  const [iller, setIller] = useState([])
  const [ilceler, setIlceler] = useState([])

  useEffect(() => { upsApi.iller().then(setIller).catch(() => {}) }, [])

  useEffect(() => {
    if (!ilKodu) { setIlceler([]); return }
    upsApi.ilceler(Number(ilKodu)).then(setIlceler).catch(() => {})
  }, [ilKodu])

  const ilSecenekleri = useMemo(() => iller.map(i => ({ deger: i.il_kodu, etiket: i.il })), [iller])
  const ilceSecenekleri = useMemo(() => ilceler.map(i => ({ deger: i.ilce_kodu, etiket: i.ilce })), [ilceler])

  function ilSec(kod) {
    const il = iller.find(i => String(i.il_kodu) === String(kod))
    onChange({ ilKodu: kod ? Number(kod) : null, il: il?.il || '', ilceKodu: null, ilce: '' })
  }

  function ilceSec(kod) {
    const ilce = ilceler.find(i => String(i.ilce_kodu) === String(kod))
    const il = iller.find(i => String(i.il_kodu) === String(ilKodu))
    onChange({ ilKodu: ilKodu ? Number(ilKodu) : null, il: il?.il || '', ilceKodu: kod ? Number(kod) : null, ilce: ilce?.ilce || '' })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <AranabilirSecici secenekler={ilSecenekleri} deger={ilKodu || ''} onChange={ilSec}
        placeholder="İl ara / seç" disabled={disabled} />
      <AranabilirSecici secenekler={ilceSecenekleri} deger={ilceKodu || ''} onChange={ilceSec}
        placeholder="İlçe / semt ara / seç" disabled={disabled || !ilKodu} />
    </div>
  )
}
