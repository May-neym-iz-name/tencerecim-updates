import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kargoApi, lokasyonApi, musteriApi, lokasyonGondericiApi } from '../api/ipc'
import { telefonGoster, telefonHam, telefonHatasi } from '../lib/girdiMaske'
import IlIlceSecici from './IlIlceSecici'

const BOS = {
  aliciAd: '', aliciTelefon: '', aliciCep: '', aliciEmail: '', aliciAdres: '',
  ilKodu: null, il: '', ilceKodu: null, ilce: '', postaKodu: '',
  koliAdedi: 1, agirlik: 1, aciklama: '', servisSeviyesi: 3, odemeTipi: 2,
  faturaNo: '', referans: '', musteriId: null, satisId: null,
  gondericiLokasyonId: null, onlineSiparisId: null,
  iade: false, // true → İADE gönderisi: paket müşteriden mağazaya (UPS'te taraflar ters çevrilir)
  kapidaOdeme: false, kapidaOdemeTutar: '', kapidaOdemeTipi: 1, // kapıda ödeme (tahsilatlı gönderi)
}

// UPS gönderi oluşturma formu (modal). baslangic ile ön-doldurulabilir.
// onTamam(kargo) gönderi başarıyla oluşunca çağrılır.
export default function KargoFormu({ acik, kapat, baslangic, onTamam }) {
  const [form, setForm] = useState(BOS)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [magazalar, setMagazalar] = useState([])
  // Alıcı adına yazıldıkça çıkan kayıtlı müşteri önerileri.
  const [oneriler, setOneriler] = useState([])
  const [oneriGoster, setOneriGoster] = useState(false)

  useEffect(() => {
    if (acik) {
      setForm({ ...BOS, ...(baslangic || {}) })
      setOneriler([]); setOneriGoster(false)
      lokasyonApi.listele().then(setMagazalar).catch(() => {})
    }
  }, [acik, baslangic])

  // Esc ile kapat. Dış alana tek tık artık kapatmadığı için (yanlışlıkla kapanıp
  // doldurulan form siliniyordu) klavyeyle hızlı çıkış yolu şart.
  useEffect(() => {
    if (!acik) return
    const tus = (e) => { if (e.key === 'Escape') kapat() }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [acik, kapat])

  // Alıcı adı yazıldıkça kayıtlı müşterileri ara (debounce). Sadece kullanıcı
  // yazarken (oneriGoster) çalışır; müşteri seçilince tekrar tetiklenmez.
  useEffect(() => {
    if (!oneriGoster) return
    const q = form.aliciAd.trim()
    if (q.length < 2) { setOneriler([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await musteriApi.listele({ arama: q, boyut: 8 })
        setOneriler(r.musteriler || [])
      } catch { setOneriler([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [form.aliciAd, oneriGoster])

  if (!acik) return null

  function alan(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Seçilen kayıtlı müşterinin bilgilerini forma otomatik doldurur.
  async function musteriSec(m) {
    setOneriGoster(false)
    setOneriler([])
    const tel = String(m.telefon || '').replace(/\D/g, '').replace(/^0/, '')
    const cep = tel.startsWith('5') ? tel : ''
    setForm(f => ({
      ...f,
      aliciAd: `${m.ad || ''} ${m.soyad || ''}`.trim(),
      aliciEmail: m.email || f.aliciEmail,
      aliciAdres: m.adres || f.aliciAdres,
      aliciCep: cep || f.aliciCep,
      aliciTelefon: cep ? f.aliciTelefon : (tel || f.aliciTelefon),
      musteriId: m.id,
    }))
    // İl/ilçe adlarını UPS kodlarına çevirip seçicileri de doldur.
    if (m.il) {
      try {
        const r = await lokasyonGondericiApi.ilIlceBul(m.il, m.ilce || '')
        if (r?.ilKodu) {
          setForm(f => ({ ...f, ilKodu: r.ilKodu, il: r.il || m.il, ilceKodu: r.ilceKodu || null, ilce: r.ilce || m.ilce || '' }))
        }
      } catch { /* il/ilçe bulunamazsa kullanıcı elle seçer */ }
    }
  }

  async function gonder(e) {
    e.preventDefault()
    if (!form.aliciAd.trim()) { toast.error('Alıcı adı zorunlu'); return }
    if (!form.aliciAdres.trim()) { toast.error('Alıcı adresi zorunlu'); return }
    if (!form.ilKodu || !form.ilceKodu) { toast.error('İl ve ilçe/semt seçin'); return }
    if (!form.aliciTelefon.trim() && !form.aliciCep.trim()) { toast.error('Telefon veya cep numarası girin'); return }
    // Dolu telefonlar tam 10 hane olmalı: (5xx) xxx xx xx.
    const telHata = telefonHatasi(form.aliciTelefon) || telefonHatasi(form.aliciCep, 'Cep telefonu')
    if (telHata) { toast.error(telHata); return }
    const kapidaTutar = Number(form.kapidaOdemeTutar) || 0
    if (form.kapidaOdeme && !form.iade && kapidaTutar <= 0) {
      toast.error('Kapıda ödeme için tahsil edilecek tutarı girin'); return
    }

    setGonderiliyor(true)
    try {
      const kargo = await kargoApi.olustur({
        ...form,
        kapidaOdemeTutar: form.kapidaOdeme && !form.iade ? kapidaTutar : 0,
      })
      toast.success(`✓ ${form.iade ? 'İade gönderisi' : 'Kargo'} oluşturuldu — Takip No: ${kargo.takip_no}`)
      // Etiketi önizleme penceresinde aç (hata olursa gönderiyi engellemesin).
      if (kargo.barkodPng?.length) {
        kargoApi.etiketOnizle(kargo.barkodPng, 1)
          .catch(err => toast.error('Etiket önizleme açılamadı: ' + err.message))
      }
      onTamam?.(kargo)
      kapat()
    } catch (err) {
      toast.error(err.message || 'Kargo oluşturulamadı')
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    // Dış alana TEK tık kapatmaz: uzun kargo formu doldurulurken yanlışlıkla dışarı
    // tıklamak girilen her şeyi siliyordu. Kapatmak için çift tık (ya da ✕ / Esc).
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onDoubleClick={kapat}>
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-auto p-5" onDoubleClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4 gap-3">
          <h3 className="text-lg font-bold text-gray-800">
            {form.iade ? '↩ UPS İade Gönderisi' : '📦 UPS Kargo Gönderisi'}
          </h3>
          <button type="button" onClick={kapat} title="Kapat (Esc)"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <p className="text-[11px] text-gray-400 -mt-2 mb-3">Kapatmak için ✕, Esc ya da dışarıya çift tıklayın.</p>
        <form onSubmit={gonder} className="space-y-3">
          {/* İade modu: taraflar ters çevrilir — paket müşteriden alınıp mağazaya gelir. */}
          <label className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer
            ${form.iade ? 'bg-purple-50 border-purple-300 text-purple-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <input type="checkbox" checked={form.iade} onChange={e => alan('iade', e.target.checked)} />
            <span><b>İade gönderisi</b> — paket müşteriden alınıp mağazaya gönderilir (taraflar otomatik ters çevrilir)</span>
          </label>

          {magazalar.length > 0 && (
            <label className="block text-sm">
              <span className="font-medium text-gray-600">{form.iade ? 'Teslim Mağazası (iadenin geleceği yer)' : 'Gönderici Mağaza'}</span>
              <select value={form.gondericiLokasyonId || ''} onChange={e => alan('gondericiLokasyonId', e.target.value ? Number(e.target.value) : null)}
                className="border rounded px-2 py-1.5 text-sm w-full mt-1 bg-white">
                <option value="">Varsayılan (Ayarlar'daki gönderici)</option>
                {magazalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
              </select>
            </label>
          )}

          <p className="text-sm font-medium text-gray-600">
            {form.iade ? 'İade Eden Müşteri (paketin alınacağı adres)' : 'Alıcı Bilgileri'}
          </p>
          <div className="relative">
            <input value={form.aliciAd}
              onChange={e => { alan('aliciAd', e.target.value); setOneriGoster(true) }}
              onFocus={() => { if (form.aliciAd.trim().length >= 2) setOneriGoster(true) }}
              onBlur={() => setTimeout(() => setOneriGoster(false), 150)}
              autoComplete="off"
              placeholder="Alıcı adı soyadı *" className="border rounded px-2 py-1.5 text-sm w-full" />
            {oneriGoster && oneriler.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-auto">
                {oneriler.map(m => (
                  <li key={m.id}>
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => musteriSec(m)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50">
                      <span className="font-medium text-gray-800">{`${m.ad || ''} ${m.soyad || ''}`.trim()}</span>
                      {(m.telefon || m.il) && (
                        <span className="text-gray-400 ml-2 text-xs">
                          {[m.telefon, m.il && (m.ilce ? `${m.il}/${m.ilce}` : m.il)].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={telefonGoster(form.aliciTelefon)} onChange={e => alan('aliciTelefon', telefonHam(e.target.value))}
              inputMode="numeric" maxLength={15}
              placeholder="(5xx) xxx xx xx" className="border rounded px-2 py-1.5 text-sm" />
            <input value={telefonGoster(form.aliciCep)} onChange={e => alan('aliciCep', telefonHam(e.target.value))}
              inputMode="numeric" maxLength={15}
              placeholder="Cep (5xx) xxx xx xx" className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <input value={form.aliciEmail} onChange={e => alan('aliciEmail', e.target.value)}
            placeholder="E-posta (opsiyonel)" className="border rounded px-2 py-1.5 text-sm w-full" />
          <textarea value={form.aliciAdres} onChange={e => alan('aliciAdres', e.target.value)}
            placeholder="Açık adres *" rows={2} className="border rounded px-2 py-1.5 text-sm w-full" />
          <IlIlceSecici ilKodu={form.ilKodu} ilceKodu={form.ilceKodu}
            onChange={({ ilKodu, il, ilceKodu, ilce }) => setForm(f => ({ ...f, ilKodu, il, ilceKodu, ilce }))} />

          <p className="text-sm font-medium text-gray-600 pt-2">Paket Bilgileri</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-gray-500">Koli adedi
              <input type="number" min="1" value={form.koliAdedi} onChange={e => alan('koliAdedi', Number(e.target.value))}
                className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
            </label>
            <label className="text-xs text-gray-500">Ağırlık (kg)
              <input type="number" min="0.1" step="0.1" value={form.agirlik} onChange={e => alan('agirlik', Number(e.target.value))}
                className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
            </label>
            <label className="text-xs text-gray-500">Ödeme
              <select value={form.odemeTipi} onChange={e => alan('odemeTipi', Number(e.target.value))}
                className="border rounded px-2 py-1.5 text-sm w-full mt-0.5 bg-white">
                <option value={2}>Gönderen öder</option>
                <option value={1}>Alıcı öder</option>
              </select>
            </label>
          </div>
          {/* Kapıda ödeme: UPS tahsilatlı gönderi (ValueOfGoods). İadede anlamsız → gizli. */}
          {!form.iade && (
            <div className={`rounded-lg border px-3 py-2 space-y-2 ${form.kapidaOdeme ? 'bg-amber-50 border-amber-300' : 'border-gray-200'}`}>
              <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                <input type="checkbox" checked={form.kapidaOdeme} onChange={e => alan('kapidaOdeme', e.target.checked)} />
                <span><b>Kapıda ödeme</b> — tutar teslimatta UPS tarafından tahsil edilir</span>
              </label>
              {form.kapidaOdeme && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-500">Tahsil edilecek tutar (TL)
                    <input type="number" min="1" step="1" value={form.kapidaOdemeTutar}
                      onChange={e => alan('kapidaOdemeTutar', e.target.value)}
                      placeholder="Örn: 1250" className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
                  </label>
                  <label className="text-xs text-gray-500">Tahsilat şekli
                    <select value={form.kapidaOdemeTipi} onChange={e => alan('kapidaOdemeTipi', Number(e.target.value))}
                      className="border rounded px-2 py-1.5 text-sm w-full mt-0.5 bg-white">
                      <option value={1}>Nakit</option>
                      <option value={3}>Kredi kartı (tek çekim)</option>
                      <option value={2}>Çek</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500">Servis
              <select value={form.servisSeviyesi} onChange={e => alan('servisSeviyesi', Number(e.target.value))}
                className="border rounded px-2 py-1.5 text-sm w-full mt-0.5 bg-white">
                <option value={3}>Standart</option>
                <option value={1}>Express Plus 09:00</option>
                <option value={4}>Express 10:30</option>
                <option value={5}>Express 12:00</option>
                <option value={6}>Express Saver</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">Açıklama
              <input value={form.aciklama} onChange={e => alan('aciklama', e.target.value)}
                placeholder="Koli içeriği" className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={kapat} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">İptal</button>
            <button type="submit" disabled={gonderiliyor}
              className={`${form.iade ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50`}>
              {gonderiliyor ? 'Oluşturuluyor…' : (form.iade ? '↩ İade Gönderisi Oluştur & Etiket Bas' : 'Gönderi Oluştur & Etiket Bas')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
