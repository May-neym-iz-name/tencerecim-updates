// Gönderi başına otomatik yorum cevabı paneli. Gönderi detayında (sağ panel) görünür.
import { useState, useEffect } from 'react'
import { sosyalApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { senkTetikle } from '../lib/veriSenk'
import SablonKutuphanesi from './SablonKutuphanesi'
import toast from 'react-hot-toast'

const VARSAYILAN_YANIT = 'Bizler ile iletişime geçtiğiniz için teşekkür ederiz, DM\'den detaylı bilgi verilmiştir.'

export default function OtomasyonPaneli({ konu }) {
  // Otomasyon toplu DM tetikler → ayrı yetki. Sosyal medyayı kullanan personel yorumları
  // elle cevaplar ama otomasyonu açamaz. Arayüz gizler, backend ayrıca reddeder (derinlik).
  const { yetkiVar } = useAuth()
  const yonetebilir = yetkiVar('sosyal_otomasyon_yonet')
  const [oto, setOto] = useState(null)
  const [yurutucu, setYurutucu] = useState(null)
  const [sablonlar, setSablonlar] = useState([])
  const [yanit, setYanit] = useState(VARSAYILAN_YANIT)
  const [secici, setSecici] = useState(false)
  const [mesgul, setMesgul] = useState(false)

  useEffect(() => {
    if (!konu?.konu_id) return
    sosyalApi.otomasyonGetir({ konu_id: konu.konu_id }).then(o => {
      setOto(o)
      setSablonlar(o?.sablonlar || [])
      setYanit(o?.acik_yanit_metni ?? VARSAYILAN_YANIT)
    }).catch(() => {})
  }, [konu?.konu_id])

  // Otomasyonu hangi PC yürütüyor? Durum ortak ama yürütme tek PC'de (çift DM kilidi).
  useEffect(() => { sosyalApi.yurutucuDurum().then(setYurutucu).catch(() => {}) }, [])

  const kaydet = async (aktif) => {
    // Açarken KAÇ KİŞİYE gideceğini göster — körlemesine tetiklenmesin.
    if (aktif && !oto?.aktif) {
      if (!sablonlar.length) return toast.error('Önce en az bir şablon ekleyin.')
      const { sayi } = await sosyalApi.otomasyonAdaySayisi({ konu_id: konu.konu_id })
      if (sayi > 0 && !confirm(
        `Bu gönderide ${sayi} kişiye mesaj gidecek (son 7 gündeki cevaplanmamış yorumlar).\n\nOnaylıyor musunuz?`
      )) return
    }
    setMesgul(true)
    try {
      await sosyalApi.otomasyonKaydet({
        konu_id: konu.konu_id, platform: konu.platform, aktif,
        acik_yanit_metni: yanit, sablon_idler: sablonlar.map(s => s.id),
      })
      // Değişikliği HEMEN buluta it: yürütücü PC başka bir makine olabilir ve kapatmayı
      // görene kadar mesaj göndermeye devam eder. 60 sn'lik tur beklenirse bir tur daha
      // DM gidebilir; anında push penceresi birkaç saniyeye indirir.
      senkTetikle()
      const o = await sosyalApi.otomasyonGetir({ konu_id: konu.konu_id })
      setOto(o)
      toast.success(aktif ? 'Otomasyon açıldı' : 'Otomasyon kapatıldı')
    } catch (e) { toast.error(e.message) }
    finally { setMesgul(false) }
  }

  const ekle = (s) => {
    if (sablonlar.some(x => x.id === s.id)) return toast.error('Bu şablon zaten ekli.')
    setSablonlar(l => [...l, s]); setSecici(false)
  }
  const cikar = (id) => setSablonlar(l => l.filter(s => s.id !== id))
  const acik = !!oto?.aktif

  return (
    <div className="border rounded-xl p-3 bg-gradient-to-br from-violet-50 to-blue-50">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">⚡ Otomasyon</span>
        <div className="flex items-center gap-2">
          {oto?.bugun_giden > 0 && (
            <span className="text-[11px] text-gray-500">Bugün {oto.bugun_giden} mesaj</span>
          )}
          <button onClick={() => kaydet(!acik)} disabled={mesgul || !yonetebilir}
            title={yonetebilir ? (acik ? 'Kapat' : 'Aç') : 'Otomasyon yetkiniz yok'}
            className={`relative w-11 h-6 rounded-full transition-colors ${acik ? 'bg-emerald-500' : 'bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${acik ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">
        {!yonetebilir
          ? (acik ? 'Bu gönderide otomasyon açık. (Değiştirme yetkiniz yok — salt görüntüleme.)'
                  : 'Otomasyon kapalı. (Değiştirme yetkiniz yok — salt görüntüleme.)')
          : acik
            ? 'Bu gönderiye gelen her yoruma otomatik DM + açık yanıt gidiyor.'
            : 'Kapalı. Açınca gelen yorumlara otomatik cevap verilir.'}
      </p>

      {/* Otomasyon durumu TÜM PC'lerde ortak; mesajları yalnız yürütücü PC gönderir.
          Bunu göstermek şart: aksi halde "açtım ama mesaj gitmiyor" gibi görünür. */}
      {yurutucu && !yurutucu.bu_pc_mi && !yurutucu.secilmedi && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2">
          ⚡ Mesajları <b>{yurutucu.yurutucu_ad || 'başka bir PC'}</b> gönderiyor.
          Buradan açıp kapatabilirsin — değişiklik birkaç saniye içinde oraya geçer.
        </p>
      )}
      {yurutucu?.bu_pc_mi && (
        <p className="text-[11px] text-emerald-700 mb-2">⚡ Mesajları bu PC gönderiyor.</p>
      )}

      <div className="space-y-1 mb-2">
        {sablonlar.map(s => (
          <div key={s.id} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
            <span className="text-xs flex-1 truncate">{s.ad}</span>
            {yonetebilir && (
              <button onClick={() => cikar(s.id)} className="text-gray-400 text-xs hover:text-red-500">✕</button>
            )}
          </div>
        ))}
        {yonetebilir && (
          <button onClick={() => setSecici(true)} className="text-blue-600 text-xs font-medium hover:underline">
            + Şablon ekle
          </button>
        )}
      </div>

      <label className="text-[11px] font-semibold text-gray-600">Açık yanıt</label>
      <textarea value={yanit} onChange={e => setYanit(e.target.value)} rows={2} disabled={!yonetebilir}
        className="w-full border rounded-lg px-2 py-1.5 text-xs mt-1 disabled:bg-gray-100 disabled:text-gray-500" />

      {yonetebilir && (
        <button onClick={() => kaydet(acik)} disabled={mesgul}
          className="mt-2 w-full bg-white border text-sm py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          Değişiklikleri kaydet
        </button>
      )}

      {secici && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSecici(false)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-lg max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}>
            <h4 className="font-bold mb-3">Şablon Seç</h4>
            <SablonKutuphanesi onSec={ekle} kapat={() => setSecici(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
