import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kargoApi } from '../api/ipc'
import { upsTakipUrl } from '../lib/kargo'

const SERVIS = { 1: 'Express Plus 09:00', 3: 'Standart', 4: 'Express 10:30', 5: 'Express 12:00', 6: 'Express Saver' }
const ODEME = { 1: 'Alıcı öder', 2: 'Gönderen öder' }

function Satir({ etiket, deger, vurgu }) {
  if (deger === null || deger === undefined || deger === '') return null
  return (
    <div className="flex py-1.5 border-b border-gray-50 text-sm">
      <span className="w-40 flex-shrink-0 text-gray-500">{etiket}</span>
      <span className={`flex-1 ${vurgu ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>{deger}</span>
    </div>
  )
}

// Kargo detay modalı: kaydın TÜM bilgileri. UPS gönderileri oluşturulduktan sonra
// API üzerinden DÜZENLENEMEZ — değişiklik gerekirse iptal edilip yeniden oluşturulur
// (bu bilgi altta kullanıcıya gösterilir).
export default function KargoDetayModal({ acik, kapat, kargoId }) {
  const [k, setK] = useState(null)
  const [koliler, setKoliler] = useState(null) // null=yüklenmedi, []=hata/yok, [nolar]
  const [koliYukleniyor, setKoliYukleniyor] = useState(false)

  useEffect(() => {
    if (!acik || !kargoId) { setK(null); setKoliler(null); return }
    kargoApi.detay(kargoId).then(setK).catch(e => { toast.error(e.message); kapat() })
  }, [acik, kargoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Çok kolili gönderi: her kolinin ayrı takip numarası UPS'ten sorgulanır.
  useEffect(() => {
    if (!k || !k.takip_no || (k.koli_adedi || 1) <= 1) return
    setKoliYukleniyor(true)
    kargoApi.koliler(k.takip_no)
      .then(setKoliler)
      .catch(() => setKoliler([])) // UPS erişilemezse bölüm sessizce not gösterir
      .finally(() => setKoliYukleniyor(false))
  }, [k])

  if (!acik) return null

  const iade = k?.tip === 'iade'
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={kapat}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold text-gray-800">📦 Kargo Detayı</h3>
          {k && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${iade ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {iade ? '↩ İADE (müşteriden mağazaya)' : 'Gönderi'}
            </span>
          )}
          {k?.durum === 'iptal' && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">İptal</span>}
        </div>

        {!k ? (
          <p className="text-sm text-gray-400 py-8 text-center">Yükleniyor…</p>
        ) : (
          <>
            <Satir etiket="Takip No" vurgu deger={k.takip_no ? (
              <a href={upsTakipUrl(k.takip_no)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {k.takip_no} ↗
              </a>
            ) : '—'} />
            <Satir etiket="Durum" deger={k.durum === 'iptal' ? 'İptal edildi' : 'Oluşturuldu'} />
            <Satir etiket="Son UPS Durumu" deger={k.son_durum} />
            <Satir etiket="Son Durum Zamanı" deger={k.son_durum_tarihi} />
            <Satir etiket="Oluşturma" deger={k.olusturma_tarihi} />

            <p className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">
              {iade ? 'İade Eden Müşteri (paketin alındığı adres)' : 'Alıcı'}
            </p>
            <Satir etiket="Ad" vurgu deger={k.alici_ad} />
            <Satir etiket="Telefon" deger={k.alici_telefon} />
            <Satir etiket="Adres" deger={k.alici_adres} />
            <Satir etiket="İl / İlçe" deger={[k.il, k.ilce].filter(Boolean).join(' / ') || [k.il_kodu, k.ilce_kodu].filter(Boolean).join(' / ')} />
            <Satir etiket="Kayıtlı Müşteri" deger={[k.musteri_ad, k.musteri_soyad].filter(Boolean).join(' ')} />

            {/* Çok kolili gönderi: her kolinin ayrı takip numarası */}
            {(k.koli_adedi || 1) > 1 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">
                  Koli Takip Numaraları ({k.koli_adedi} koli)
                </p>
                {koliYukleniyor && <p className="text-xs text-gray-400 py-1">UPS'ten sorgulanıyor…</p>}
                {!koliYukleniyor && koliler && koliler.length > 0 && koliler.map((no, i) => (
                  <div key={no} className="flex py-1.5 border-b border-gray-50 text-sm">
                    <span className="w-40 flex-shrink-0 text-gray-500">Koli {i + 1}{no === k.takip_no ? ' (ana)' : ''}</span>
                    <a href={upsTakipUrl(no)} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono text-xs">{no} ↗</a>
                  </div>
                ))}
                {!koliYukleniyor && koliler && koliler.length === 0 && (
                  <p className="text-xs text-gray-400 py-1">Koli numaraları alınamadı (UPS bağlantısı gerekli).</p>
                )}
              </>
            )}

            <p className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">Gönderi Bilgileri</p>
            <Satir etiket={iade ? 'Teslim Mağazası' : 'Çıkış Mağazası'} deger={k.lokasyon_ad} />
            <Satir etiket="Koli Adedi" deger={k.koli_adedi} />
            <Satir etiket="Ağırlık" deger={k.agirlik ? `${k.agirlik} kg` : null} />
            <Satir etiket="Servis" deger={SERVIS[k.servis_seviyesi] || k.servis_seviyesi} />
            <Satir etiket="Ödeme" deger={ODEME[k.odeme_tipi] || k.odeme_tipi} />
            <Satir etiket="Açıklama" deger={k.aciklama} />
            <Satir etiket="İkas Sipariş" deger={k.ikas_siparis_id} />
            <Satir etiket="Bağlı Satış No" deger={k.satis_id} />

            <p className="mt-4 text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5">
              ℹ️ UPS gönderileri oluşturulduktan sonra düzenlenemez (UPS API kısıtı).
              Bilgilerde değişiklik gerekiyorsa gönderiyi <b>iptal edip</b> yeni gönderi oluşturun.
            </p>
          </>
        )}

        <div className="flex justify-end pt-4">
          <button onClick={kapat} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">Kapat</button>
        </div>
      </div>
    </div>
  )
}
