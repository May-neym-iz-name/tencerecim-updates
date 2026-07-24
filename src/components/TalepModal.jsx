// İptal/iade talebi inceleme ve onay modalı.
// Asıl işi: müşterinin TAM OLARAK ne talep ettiğini göstermek. Talep paket bazlıdır;
// çok kalemli bir siparişte yalnız bir paket talepte olabilir. Bu bilgi olmadan
// personel tüm siparişi iade edebilir (canlı örnek: 2.670 yerine 7.970 TL).
import { useState } from 'react'

const para = n => (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺'

const IADE_KARGO = { CARGO: 'Kargo ile', CUSTOMER: 'Müşteri getirecek', STORE: 'Mağazadan' }

export default function TalepModal({
  siparis, detay, yukleniyor, hata, mesgul,
  onKapat, onOnayla, onIadeTamamla, onTalepKapat,
}) {
  const [kapatmaAcik, setKapatmaAcik] = useState(false)
  const [not, setNot] = useState('')

  const iptalTalebi = detay?.talepli?.some(p => p.durum === 'CANCEL_REQUESTED')
  const onaylanmis = detay?.asama?.asama === 'onaylandi'
  // Detay gelmediyse KÖR ONAY yaptırma: neyin iade edileceği bilinmiyor.
  const aksiyonAcik = !yukleniyor && !hata && detay?.talepli?.length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={onKapat}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800">
            {iptalTalebi ? 'İptal' : 'İade'} Talebi — Sipariş #{siparis.siparis_no}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{siparis.musteri_ad}</p>
        </div>

        <div className="p-5 space-y-4">
          {yukleniyor && <p className="text-sm text-gray-500">Talep detayı ikas'tan alınıyor…</p>}

          {hata && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <p className="font-semibold">Talep detayı alınamadı</p>
              <p className="text-xs mt-1">{hata}</p>
              <p className="text-xs mt-2">
                Hangi ürünlerin talep edildiği bilinmediği için onay işlemleri kapalı.
                İkas panelinden kontrol edin.
              </p>
            </div>
          )}

          {detay?.talepli?.map(p => (
            <div key={p.paketNo} className="rounded-lg border-2 border-red-200 bg-red-50 p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-red-800">Paket {p.paketNo}</span>
                <span className="text-xs text-red-600">
                  {p.durum === 'CANCEL_REQUESTED' ? 'İptal Talebi' : 'İade Talebi'}
                </span>
              </div>
              {p.kalemler.map(k => (
                <div key={k.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-gray-800">{k.ad}</span>
                  <span className="text-gray-600 whitespace-nowrap ml-3">{k.miktar} ad · {para(k.tutar)}</span>
                </div>
              ))}
              {(p.notu || p.iadeKargo) && (
                <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-700 space-y-0.5">
                  {p.notu && <p>Müşteri notu: {p.notu}</p>}
                  {p.iadeKargo && <p>İade yöntemi: {IADE_KARGO[p.iadeKargo] || p.iadeKargo}</p>}
                </div>
              )}
            </div>
          ))}

          {detay?.talepli?.length > 0 && (
            <p className="text-right font-bold text-gray-800">
              Talep toplamı: {para(detay.talepToplami)}
            </p>
          )}

          {/* Talep dışı kalemler: yanlış ürünü iade etmeyi önleyen bağlam. */}
          {detay?.talepDisi?.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-400 mb-1">Bu siparişte talep dışı:</p>
              {detay.talepDisi.map(k => (
                <div key={k.id} className="flex justify-between text-xs text-gray-400 py-0.5">
                  <span>{k.ad}</span>
                  <span className="whitespace-nowrap ml-3">{k.miktar} ad · {para(k.tutar)}</span>
                </div>
              ))}
            </div>
          )}

          {onaylanmis && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 text-sm text-yellow-800">
              Bu talep onaylandı, ürünün gelmesi bekleniyor.
              {detay.asama.kullanici && <span className="text-xs"> ({detay.asama.kullanici} · {detay.asama.tarih})</span>}
            </div>
          )}
        </div>

        <div className="p-5 border-t space-y-2">
          {!kapatmaAcik && (
            <>
              {iptalTalebi ? (
                <button onClick={onIadeTamamla} disabled={!aksiyonAcik || !!mesgul}
                  className="w-full bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
                  ✅ İptali Onayla — siparişi ikas'ta iptal et
                </button>
              ) : (
                <>
                  {!onaylanmis && (
                    <button onClick={onOnayla} disabled={!aksiyonAcik || !!mesgul}
                      className="w-full bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                      ✅ Onayla — ürün bekleniyor
                      <span className="block text-[11px] font-normal opacity-80">Para iadesi yapılmaz, stok değişmez</span>
                    </button>
                  )}
                  <button onClick={onIadeTamamla} disabled={!aksiyonAcik || !!mesgul}
                    className="w-full bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                    💰 Ürün geldi — iadeyi tamamla
                    <span className="block text-[11px] font-normal opacity-80">Para iadesi + stok geri ekleme</span>
                  </button>
                </>
              )}
              <button onClick={() => setKapatmaAcik(true)} disabled={!!mesgul}
                className="w-full border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                🚫 Talebi Kapat
              </button>
            </>
          )}

          {kapatmaAcik && (
            <div className="space-y-2">
              <label className="block text-sm text-gray-700">
                Kapatma sebebi <span className="text-red-600">*</span>
                <textarea value={not} onChange={e => setNot(e.target.value)} rows={2}
                  placeholder="Örn: müşteri telefonla vazgeçti"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </label>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                İkas API'si talep reddetmeyi desteklemiyor. Bu işlem talebi yalnız
                uygulamada kapatır — ikas panelinden de reddetmeniz gerekir.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setKapatmaAcik(false); setNot('') }}
                  className="flex-1 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Vazgeç</button>
                <button onClick={() => onTalepKapat(not)} disabled={!not.trim() || !!mesgul}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
                  {mesgul === 'talep-kapat' ? '…' : 'Talebi Kapat'}
                </button>
              </div>
            </div>
          )}

          <button onClick={onKapat} className="w-full text-gray-500 text-sm py-1 hover:text-gray-700">Vazgeç</button>
        </div>
      </div>
    </div>
  )
}
