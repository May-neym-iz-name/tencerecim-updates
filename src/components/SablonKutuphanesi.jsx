// Şablon listesi. Düzenle/sil HER ZAMAN görünür (yetki varsa); onSec verilirse bunlara ek
// olarak "Ekle" çıkar (otomasyon paneli böyle kullanır).
// Eskiden onSec varsa yalnız "Ekle", yoksa yalnız düzenle/sil vardı — ama bileşen tek yerden,
// hep onSec ile çağrıldığı için düzenle/sil hiç ekrana gelmiyordu (ölü kod). v1.2.111'de açıldı.
import { useState, useEffect } from 'react'
import { sosyalApi } from '../api/ipc'
import { eslesirMi } from '../utils/arama'
import { useAuth } from '../auth/AuthContext'
import SablonFormu from './SablonFormu'
import toast from 'react-hot-toast'

export default function SablonKutuphanesi({ onSec = null, kapat = null }) {
  const { yetkiVar } = useAuth()
  const yonetebilir = yetkiVar('sosyal_otomasyon_yonet')
  const [liste, setListe] = useState([])
  const [ara, setAra] = useState('')
  const [formda, setFormda] = useState(null) // null=kapalı, {tur}=yeni, {id..}=düzenle
  const [menuAcik, setMenuAcik] = useState(false)

  const yukle = () => sosyalApi.sablonlar().then(setListe).catch(e => toast.error(e.message))
  useEffect(() => { yukle() }, [])

  // Şablon gönderim anında okunur (electron/db/sosyal-otomasyon.js → _sablonlariCoz), yani
  // AÇIK otomasyondaki bir şablonu değiştirmek sıradaki mesajları anında etkiler. Sessiz olmasın.
  const kaydet = async (v) => {
    const n = v.id ? (liste.find(s => s.id === v.id)?.aktif_otomasyon_sayisi || 0) : 0
    if (n > 0 && !confirm(
      `Bu şablon ${n} açık otomasyonda kullanılıyor.\n\n` +
      'Değişiklik, sıradaki mesajlara hemen yansıyacak.\n\nDevam edilsin mi?'
    )) return
    try {
      await sosyalApi.sablonKaydet(v)
      toast.success('Şablon kaydedildi'); setFormda(null); yukle()
    } catch (e) { toast.error(e.message) }
  }

  // Silme daha riskli: otomasyon "açık" kalır ama şablonsuz kalırsa hiçbir mesaj gitmez
  // (otomasyon.js sessizce atlar) — kullanıcı otomasyonu çalışıyor sanır.
  const sil = async (s) => {
    const n = s.aktif_otomasyon_sayisi || 0
    const uyari = n > 0
      ? `"${s.ad}" şablonu ${n} AÇIK otomasyonda kullanılıyor.\n\n` +
        'Silersen o otomasyonlardan çıkarılır. Otomasyonun başka şablonu kalmazsa ' +
        'açık görünmeye devam eder ama kimseye mesaj göndermez.\n\nYine de silinsin mi?'
      : `"${s.ad}" şablonu silinsin mi?`
    if (!confirm(uyari)) return
    try { await sosyalApi.sablonSil(s.id); toast.success('Şablon silindi'); yukle() }
    catch (e) { toast.error(e.message) }
  }

  // Kelime bazlı + Türkçe duyarsız (bkz. src/utils/arama.js).
  const suz = liste.filter(s => eslesirMi(`${s.ad} ${s.urun_adi || ''} ${s.serbest_metin || ''}`, ara))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input value={ara} onChange={e => setAra(e.target.value)} placeholder="🔍 Şablon ara…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        {yonetebilir && (
          <div className="relative">
            <button onClick={() => setMenuAcik(m => !m)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap">+ Yeni ▾</button>
            {menuAcik && (
              <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 w-44 overflow-hidden">
                <button onClick={() => { setFormda({ tur: 'urun' }); setMenuAcik(false) }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">💰 Ürün şablonu</button>
                <button onClick={() => { setFormda({ tur: 'genel' }); setMenuAcik(false) }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">📝 Genel şablon</button>
              </div>
            )}
          </div>
        )}
        {kapat && <button onClick={kapat} className="text-gray-400 px-2">✕</button>}
      </div>

      {!suz.length && (
        <p className="text-sm text-gray-400 py-8 text-center">
          {liste.length ? 'Aramaya uyan şablon yok.' : 'Henüz şablon yok. "+ Yeni" ile ekleyin.'}
        </p>
      )}

      <div className="space-y-2">
        {suz.map(s => (
          <div key={s.id} className="border rounded-xl p-3 flex items-center gap-3 hover:bg-gray-50">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{s.ad}</div>
              <div className="text-xs text-gray-500 truncate">
                {s.tur === 'genel' ? (
                  <><span className="text-violet-600">📝 Genel</span>
                    <span className="text-gray-400"> · {(s.serbest_metin || '').split('\n')[0].slice(0, 60)}</span></>
                ) : (<>
                  {s.kaynak_tipi === 'set' && <span title="Set">📦 </span>}
                  {s.urun_adi}
                  {s.fiyat != null
                    ? <span className="text-gray-400"> · {Number(s.fiyat).toLocaleString('tr-TR')} TL (sabit)</span>
                    : s.kaynak_fiyati != null
                      ? <span className="text-emerald-600"> · {Number(s.kaynak_fiyati).toLocaleString('tr-TR')} TL (canlı)</span>
                      : <span className="text-amber-600"> · fiyat yok</span>}
                </>)}
              </div>
            </div>
            {yonetebilir && <>
              <button onClick={() => setFormda(s)} title="Düzenle"
                className="text-gray-400 hover:text-blue-600 text-base px-1">✏️</button>
              <button onClick={() => sil(s)} title="Sil"
                className="text-gray-400 hover:text-red-600 text-base px-1">🗑</button>
            </>}
            {onSec && (
              <button onClick={() => onSec(s)} className="text-blue-600 text-sm font-medium whitespace-nowrap">Ekle</button>
            )}
          </div>
        ))}
      </div>

      {formda && <SablonFormu sablon={formda.id ? formda : { tur: formda.tur || 'urun' }}
        onKapat={() => setFormda(null)} onKaydet={kaydet} />}
    </div>
  )
}
