import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { satisApi, lokasyonGondericiApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import KargoFormu from '../components/KargoFormu'

// Satış ekranından alınan ön siparişler (stok düşmeyen peşin ödemeli satışlar).
// Ürün geldiğinde buradan UPS kargosu oluşturulur ve durum ilerletilir.
const DURUM_ETIKET = {
  bekliyor: { ad: '🕐 Bekliyor', renk: 'bg-amber-100 text-amber-800' },
  kargolandi: { ad: '📦 Kargolandı', renk: 'bg-blue-100 text-blue-800' },
  teslim: { ad: '✓ Teslim Edildi', renk: 'bg-green-100 text-green-800' },
  iptal: { ad: '✕ İptal', renk: 'bg-red-100 text-red-700' },
}

export default function OnSiparisler() {
  const { yetkiVar } = useAuth()
  const [durum, setDurum] = useState('bekliyor')
  const [liste, setListe] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kargoAcik, setKargoAcik] = useState(false)
  const [kargoBaslangic, setKargoBaslangic] = useState(null)
  const [kargoSatisId, setKargoSatisId] = useState(null)

  const yonetebilir = yetkiVar('on_siparis_yap')
  const kargoYetkisi = yetkiVar('kargo_yonet')

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    try {
      setListe(await satisApi.onSiparisler({ durum: durum || undefined }))
    } catch (e) { toast.error(e.message || 'Ön siparişler yüklenemedi') }
    finally { setYukleniyor(false) }
  }, [durum])

  useEffect(() => { yukle() }, [yukle])

  async function durumYaz(id, yeni) {
    try {
      await satisApi.onSiparisDurum(id, yeni)
      toast.success('Durum güncellendi')
      yukle()
    } catch (e) { toast.error(e.message || 'Durum güncellenemedi') }
  }

  async function iptalEt(s) {
    if (!window.confirm(`${s.fis_no} numaralı ön sipariş iptal edilsin mi? (Stok etkilenmez)`)) return
    try {
      await satisApi.iptal(s.id)
      toast.success('Ön sipariş iptal edildi')
      yukle()
    } catch (e) { toast.error(e.message || 'İptal edilemedi') }
  }

  // Kargo formunu müşterinin kayıtlı adresiyle ön doldur (il/ilçe adı → UPS kodu).
  // Kalıp: src/pages/OnlineSiparisler.jsx:187-211 ile aynı; bağ satisId üzerinden kurulur.
  async function kargoAc(s) {
    let ilIlce = { ilKodu: null, il: s.musteri_il || '', ilceKodu: null, ilce: s.musteri_ilce || '' }
    try { ilIlce = await lokasyonGondericiApi.ilIlceBul(s.musteri_il, s.musteri_ilce) } catch { /* bulunamazsa kullanıcı formdan seçer */ }
    setKargoSatisId(s.id)
    setKargoBaslangic({
      aliciAd: s.musteri_adi || '',
      aliciTelefon: s.musteri_telefon || '',
      aliciEmail: s.musteri_email || '',
      aliciAdres: s.musteri_adres || '',
      ilKodu: ilIlce.ilKodu, il: ilIlce.il, ilceKodu: ilIlce.ilceKodu, ilce: ilIlce.ilce,
      odemeTipi: 2, // gönderici öder
      musteriId: s.musteri_id || null,
      satisId: s.id,
      faturaNo: s.fis_no,
      referans: s.fis_no || '',
      aciklama: `Ön sipariş ${s.fis_no}`,
      gondericiLokasyonId: s.lokasyon_id || null,
    })
    setKargoAcik(true)
  }

  async function kargoTamamlandi() {
    setKargoAcik(false)
    if (kargoSatisId) await durumYaz(kargoSatisId, 'kargolandi')
    setKargoSatisId(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-bold">🕐 Ön Siparişler</h2>
        <select value={durum} onChange={e => setDurum(e.target.value)}
          className="text-sm border rounded-lg px-2 py-1.5">
          <option value="bekliyor">Bekleyenler</option>
          <option value="kargolandi">Kargolananlar</option>
          <option value="teslim">Teslim edilenler</option>
          <option value="iptal">İptal edilenler</option>
          <option value="">Tümü</option>
        </select>
        <button onClick={yukle} className="text-sm text-gray-500 hover:text-gray-800">↻ Yenile</button>
      </div>

      {yukleniyor && <p className="text-sm text-gray-400">Yükleniyor…</p>}
      {!yukleniyor && liste.length === 0 && (
        <p className="text-sm text-gray-400">Bu filtrede ön sipariş yok.</p>
      )}

      <div className="space-y-2">
        {liste.map(s => {
          const d = DURUM_ETIKET[s.on_siparis_durum || 'bekliyor'] || DURUM_ETIKET.bekliyor
          const iptalEdilmis = s.durum === 'iptal'
          return (
            <div key={s.id} className="border rounded-xl p-3 bg-white">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{s.fis_no}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${d.renk}`}>{d.ad}</span>
                <span className="text-xs text-gray-500">{s.tarih}</span>
                <span className="ml-auto font-bold text-sm">₺{Number(s.genel_toplam || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600">
                {s.musteri_adi || 'Müşteri seçilmemiş'}
                {s.musteri_telefon ? ` · ${s.musteri_telefon}` : ''}
                {` · ${s.odeme_tipi}`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {s.kalemler.map(k => `${k.urun_adi} ×${k.miktar}`).join(', ')}
              </div>
              {s.on_siparis_not && <div className="text-xs text-amber-700 mt-1">📝 {s.on_siparis_not}</div>}
              {s.takip_no && <div className="text-xs text-blue-700 mt-1">📦 {s.takip_no}{s.kargo_durum ? ` — ${s.kargo_durum}` : ''}</div>}

              {!iptalEdilmis && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {kargoYetkisi && s.on_siparis_durum !== 'teslim' && (
                    <button onClick={() => kargoAc(s)}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                      📦 Kargo Oluştur
                    </button>
                  )}
                  {yonetebilir && s.on_siparis_durum !== 'teslim' && (
                    <button onClick={() => durumYaz(s.id, 'teslim')}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      ✓ Teslim Edildi
                    </button>
                  )}
                  {yetkiVar('satis_iptal') && (
                    <button onClick={() => iptalEt(s)}
                      className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      ✕ İptal
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <KargoFormu acik={kargoAcik} kapat={() => { setKargoAcik(false); setKargoSatisId(null) }}
        baslangic={kargoBaslangic} onTamam={kargoTamamlandi} />
    </div>
  )
}
