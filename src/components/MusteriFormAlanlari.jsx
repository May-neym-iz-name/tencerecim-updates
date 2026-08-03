import { useEffect, useRef, useState } from 'react'
import { lokasyonGondericiApi } from '../api/ipc'
import { telefonGoster, telefonHam, sadeceRakam } from '../lib/girdiMaske'
import IlIlceSecici from './IlIlceSecici'

// Müşteri formu alanları — Satış ve Müşteriler sayfaları AYNI bileşeni kullanır.
// Daha önce iki sayfada birebir kopya vardı ve ayrışmışlardı (il/ilçe Satış'ta
// zorunlu, Müşteriler'de değil; ikisi de serbest metindi). İl/ilçe artık UPS
// listesinden seçilir: elle yazılan il/ilçe kargo formunda koda çevrilemiyor
// ve kullanıcı adresi ikinci kez seçmek zorunda kalıyordu.
const ALANLAR = [
  [['ad', 'Ad *', true], ['soyad', 'Soyad *', true]],
  [['telefon', 'Telefon', false], ['email', 'E-posta', false]],
  [['tc_kimlik', 'TC Kimlik No', false], ['vergi_no', 'Vergi No', false]],
  [['vergi_dairesi', 'Vergi Dairesi', false], ['unvan', 'Ünvan (Kurumsal)', false]],
  [['adres', 'Adres', false]],
  [['iskonto_orani', 'Sabit İskonto Oranı (%)', false]],
]

const MASKELI = ['telefon', 'tc_kimlik', 'vergi_no']

// Maskeli alanlar depoda ham rakam durur; ekranda biçimli gösterilir.
function maskele(name, deger) {
  if (name === 'telefon') return telefonHam(deger)
  if (name === 'tc_kimlik') return sadeceRakam(deger, 11)
  if (name === 'vergi_no') return sadeceRakam(deger, 10)
  return deger
}

// props: form, setForm, ilZorunlu (varsayılan false), ilkAlanaOdaklan
export default function MusteriFormAlanlari({ form, setForm, ilZorunlu = false, ilkAlanaOdaklan = false }) {
  // IlIlceSecici UPS kodlarıyla çalışır, müşteri kartında ise il/ilçe ADI durur.
  // Kayıtlı bir müşteri düzenlenirken adlar bir kez koda çevrilir.
  const [kodlar, setKodlar] = useState({ ilKodu: null, ilceKodu: null })
  const cozulenAd = useRef(null)

  useEffect(() => {
    const anahtar = `${form.il || ''}|${form.ilce || ''}`
    if (cozulenAd.current === anahtar) return
    cozulenAd.current = anahtar
    if (!form.il) { setKodlar({ ilKodu: null, ilceKodu: null }); return }
    let iptal = false
    lokasyonGondericiApi.ilIlceBul(form.il, form.ilce || '')
      .then(r => { if (!iptal && r?.ilKodu) setKodlar({ ilKodu: r.ilKodu, ilceKodu: r.ilceKodu || null }) })
      .catch(() => { /* eşleşmezse kullanıcı listeden seçer */ })
    return () => { iptal = true }
  }, [form.il, form.ilce])

  function ilIlceSec({ ilKodu, il, ilceKodu, ilce }) {
    // Effect'in seçimi tekrar çözmeye çalışmaması için anahtarı önden damgala.
    cozulenAd.current = `${il || ''}|${ilce || ''}`
    setKodlar({ ilKodu, ilceKodu })
    setForm(f => ({ ...f, il: il || '', ilce: ilce || '' }))
  }

  return (
    <>
      {ALANLAR.map((satir, i) => (
        <div key={i} className={`grid gap-3 ${satir.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {satir.map(([name, label, zorunlu], j) => (
            <div key={name}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input name={name} required={zorunlu}
                value={name === 'telefon' ? telefonGoster(form.telefon) : (form[name] ?? '')}
                autoFocus={ilkAlanaOdaklan && i === 0 && j === 0}
                type={name === 'iskonto_orani' ? 'number' : 'text'}
                min={name === 'iskonto_orani' ? 0 : undefined}
                max={name === 'iskonto_orani' ? 100 : undefined}
                inputMode={MASKELI.includes(name) ? 'numeric' : undefined}
                placeholder={name === 'telefon' ? '(5xx) xxx xx xx' : name === 'tc_kimlik' ? '11 hane' : name === 'vergi_no' ? '10 hane' : undefined}
                maxLength={name === 'telefon' ? 15 : name === 'tc_kimlik' ? 11 : name === 'vergi_no' ? 10 : undefined}
                onChange={e => {
                  const deger = maskele(name, e.target.value)
                  setForm(f => ({ ...f, [name]: deger }))
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
      ))}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          İl / İlçe {ilZorunlu && '*'}
        </label>
        <IlIlceSecici ilKodu={kodlar.ilKodu} ilceKodu={kodlar.ilceKodu} onChange={ilIlceSec} />
        {form.il && !kodlar.ilKodu && (
          <p className="text-xs text-amber-600 mt-1">
            Kayıtlı il/ilçe ({form.il}{form.ilce ? ' / ' + form.ilce : ''}) UPS listesinde bulunamadı — listeden yeniden seçin.
          </p>
        )}
      </div>
    </>
  )
}
