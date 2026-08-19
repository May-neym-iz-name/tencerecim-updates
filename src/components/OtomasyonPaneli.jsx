// Gönderi başına otomatik yorum cevabı paneli. Gönderi detayında (sağ panel) görünür.
//
// v1.2.173: otomasyon GÖNDERİ BAZLI oldu. Ürünler doğrudan katalogdan seçilir ve açıklama
// gönderiye özel yazılır. Eskiden şablon bağlanıyordu; şablon paylaşımlı olduğu için 3 ürünlü
// bir gönderide müşteriye 3 ayrı ürün açıklaması gidiyordu. Şablonlar SİLİNMEDİ — mesajlaşmada
// elle cevapta kullanılmaya devam ediyor; taşınmamış eski otomasyonlar da çalışır (salt görüntü).
import { useState, useEffect, useCallback } from 'react'
import { sosyalApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { senkTetikle } from '../lib/veriSenk'
import OtomasyonUrunSecici from './OtomasyonUrunSecici'
import toast from 'react-hot-toast'

const VARSAYILAN_YANIT = 'Bizler ile iletişime geçtiğiniz için teşekkür ederiz, DM\'den detaylı bilgi verilmiştir.'
const MAKS_KARAKTER = 1000 // Meta özel mesaj sınırı (electron/meta/sablon-mesaj.js ile aynı)

export default function OtomasyonPaneli({ konu }) {
  // Otomasyon toplu DM tetikler → ayrı yetki. Sosyal medyayı kullanan personel yorumları
  // elle cevaplar ama otomasyonu açamaz. Arayüz gizler, backend ayrıca reddeder (derinlik).
  const { yetkiVar } = useAuth()
  const yonetebilir = yetkiVar('sosyal_otomasyon_yonet')
  const [oto, setOto] = useState(null)
  const [yurutucu, setYurutucu] = useState(null)
  const [urunler, setUrunler] = useState([])
  const [aciklama, setAciklama] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [yanit, setYanit] = useState(VARSAYILAN_YANIT)
  const [onizleme, setOnizleme] = useState(null)
  const [secici, setSecici] = useState(false)
  const [mesgul, setMesgul] = useState(false)

  useEffect(() => {
    if (!konu?.konu_id) return
    sosyalApi.otomasyonGetir({ konu_id: konu.konu_id }).then(o => {
      setOto(o)
      setUrunler(o?.urunler || [])
      setAciklama(o?.ozel_aciklama ?? '')
      setWhatsapp(o?.whatsapp ?? '')
      setYanit(o?.acik_yanit_metni ?? VARSAYILAN_YANIT)
    }).catch(() => {})
  }, [konu?.konu_id])

  // Otomasyonu hangi PC yürütüyor? Durum ortak ama yürütme tek PC'de (çift DM kilidi).
  useEffect(() => { sosyalApi.yurutucuDurum().then(setYurutucu).catch(() => {}) }, [])

  // Canlı önizleme. Metni GÖNDERİMLE AYNI üreticiden alır (backend'de gonderiMesajiOlustur)
  // → burada görülen, müşteriye giden metnin ta kendisidir; iki yol asla ayrışamaz.
  const onizlemeTazele = useCallback(() => {
    if (!urunler.length && !aciklama.trim()) return setOnizleme(null)
    sosyalApi.gonderiOnizleme({
      aciklama, whatsapp,
      urunler: urunler.map(u => ({ urun_id: u.urun_id, set_id: u.set_id, ozel_fiyat: u.ozel_fiyat, ozel_ad: u.ozel_ad })),
    }).then(setOnizleme).catch(() => setOnizleme(null))
  }, [urunler, aciklama, whatsapp])

  useEffect(() => {
    const t = setTimeout(onizlemeTazele, 300)
    return () => clearTimeout(t)
  }, [onizlemeTazele])

  const kaydet = async (aktif) => {
    // Açarken KAÇ KİŞİYE gideceğini göster — körlemesine tetiklenmesin.
    if (aktif && !oto?.aktif) {
      if (!urunler.length && !aciklama.trim()) {
        return toast.error('Önce ürün ekleyin veya bir açıklama yazın.')
      }
      // 1000 karakteri aşan mesaj çalıştırıcı tarafından GÖNDERİLMEZ (kesik fiyat mesajı
      // müşteriye gitmesin). Otomasyonun sessizce hiçbir şey yapmaması yerine burada uyar.
      if (onizleme?.asildi) {
        return toast.error(`Mesaj ${onizleme.karakter} karakter — 1000 sınırını aşıyor, kısaltın.`)
      }
      const { sayi } = await sosyalApi.otomasyonAdaySayisi({ konu_id: konu.konu_id })
      if (sayi > 0 && !confirm(
        `Bu gönderide ${sayi} kişiye mesaj gidecek (son 7 gündeki cevaplanmamış yorumlar).\n\nOnaylıyor musunuz?`
      )) return
    }
    setMesgul(true)
    try {
      await sosyalApi.otomasyonKaydet({
        konu_id: konu.konu_id, platform: konu.platform, aktif,
        acik_yanit_metni: yanit,
        ozel_aciklama: aciklama,
        whatsapp,
        urunler: urunler.map(u => ({ urun_id: u.urun_id, set_id: u.set_id, ozel_fiyat: u.ozel_fiyat, ozel_ad: u.ozel_ad })),
        // Şablon bağları YALNIZCA gönderi gerçekten yeni modele geçtiyse kaldırılır.
        // Koşulsuz [] göndermek, henüz taşınmamış bir gönderiyi sadece açıp kapatan
        // kullanıcının şablonlarını sessizce siler → otomasyon boş mesajla çalışamaz hale gelirdi.
        // undefined = "dokunma" (bkz. otomasyonKaydet'teki sablon_idler || []).
        sablon_idler: (urunler.length || aciklama.trim()) ? [] : undefined,
      })
      // Değişikliği HEMEN buluta it: yürütücü PC başka bir makine olabilir ve kapatmayı
      // görene kadar mesaj göndermeye devam eder. 60 sn'lik tur beklenirse bir tur daha
      // DM gidebilir; anında push penceresi birkaç saniyeye indirir.
      senkTetikle()
      const o = await sosyalApi.otomasyonGetir({ konu_id: konu.konu_id })
      setOto(o)
      setUrunler(o?.urunler || [])
      toast.success(aktif ? 'Otomasyon açıldı' : 'Otomasyon kapatıldı')
    } catch (e) { toast.error(e.message) }
    finally { setMesgul(false) }
  }

  const ekle = (u) => {
    const ayni = urunler.some(x =>
      (u.urun_id && x.urun_id === u.urun_id) || (u.set_id && x.set_id === u.set_id))
    if (ayni) return toast.error('Bu ürün zaten ekli.')
    setUrunler(l => [...l, u]); setSecici(false)
  }
  const cikar = (i) => setUrunler(l => l.filter((_, x) => x !== i))
  // Gönderiye özel fiyat. Boş bırakılırsa kataloğun canlı fiyatı kullanılır (zam kendiliğinden
  // yansır); yazılırsa o gönderide bu fiyat geçerli olur — kampanya ya da kataloğu 0 olan ürün için.
  const fiyatDegis = (i, deger) => setUrunler(l => l.map((u, x) => x === i ? { ...u, ozel_fiyat: deger } : u))
  // Gönderiye özel görünen ad. Katalog adları depo dili (BÜYÜK HARF, litre/ölçü ekleri);
  // müşteriye giden mesajda daha okunaklı bir ad yazılabilsin. Boş = kataloğun adı.
  const adDegis = (i, deger) => setUrunler(l => l.map((u, x) => x === i ? { ...u, ozel_ad: deger } : u))
  const acik = !!oto?.aktif
  // Eski modelde kalmış gönderi: şablon bağlı ama henüz ürün seçilmemiş.
  const eskiModel = !!oto?.sablonlar?.length && !urunler.length

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

      {eskiModel && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-2">
          Bu gönderi eski şablon düzeninde: <b>{oto.sablonlar.map(s => s.ad).join(', ')}</b>.
          Ürünleri aşağıdan ekleyip kaydedince yeni düzene geçer.
        </p>
      )}

      <label className="text-[11px] font-semibold text-gray-600">Ürünler</label>
      <div className="space-y-1 mb-2 mt-1">
        {urunler.map((u, i) => (
          <div key={`${u.tip}-${u.urun_id || u.set_id}`} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
            {u.set_id && <span className="text-[10px] text-violet-600" title="Set">📦</span>}
            <input value={u.ozel_ad ?? ''} onChange={e => adDegis(i, e.target.value)} disabled={!yonetebilir}
              placeholder={u.katalog_adi || u.ad}
              title="Mesajda görünecek ad. Boş = kataloğun adı."
              className="text-xs flex-1 min-w-0 border rounded px-1 py-0.5 disabled:bg-gray-100" />
            {/* Mesajda SESSİZCE eksik kalacak satırlar burada uyarılır: link yoksa sipariş
                satırı, fiyat 0 ise fiyat satırı hiç yazılmaz (bkz. sablon-mesaj.js fiyatYaz). */}
            {!u.web_link && (
              <span className="text-[10px] text-amber-600" title="Web sitesi linki tanımlı değil — mesajda sipariş linki yazılmayacak">linksiz</span>
            )}
            {!Number(u.ozel_fiyat) && !Number(u.fiyat) && (
              <span className="text-[10px] text-red-600 font-medium" title="Katalogda fiyat 0 — mesajda fiyat satırı yazılmayacak. Ürün kartından fiyatı girin.">fiyatsız</span>
            )}
            <input type="number" step="0.01" disabled={!yonetebilir}
              value={u.ozel_fiyat ?? ''} onChange={e => fiyatDegis(i, e.target.value)}
              placeholder={Number(u.fiyat) ? Number(u.fiyat).toLocaleString('tr-TR') : 'fiyat'}
              title="Boş = kataloğun canlı fiyatı. Yazarsanız bu gönderide bu fiyat geçerli olur."
              className="w-20 border rounded px-1 py-0.5 text-[11px] text-right shrink-0 disabled:bg-gray-100" />
            <span className="text-[11px] text-gray-400 shrink-0">TL</span>
            {yonetebilir && (
              <button onClick={() => cikar(i)} className="text-gray-400 text-xs hover:text-red-500">✕</button>
            )}
          </div>
        ))}
        {yonetebilir && (
          <button onClick={() => setSecici(true)} className="text-blue-600 text-xs font-medium hover:underline">
            + Ürün ekle
          </button>
        )}
      </div>

      <label className="text-[11px] font-semibold text-gray-600">Gönderi açıklaması</label>
      <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} rows={3} disabled={!yonetebilir}
        placeholder="Bu gönderiye özel metin — DM'de bir kez yazılır."
        className="w-full border rounded-lg px-2 py-1.5 text-xs mt-1 mb-2 disabled:bg-gray-100 disabled:text-gray-500" />

      <label className="text-[11px] font-semibold text-gray-600">WhatsApp (mesajın sonunda tek satır)</label>
      <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} disabled={!yonetebilir}
        placeholder="0555 123 45 67"
        className="w-full border rounded-lg px-2 py-1.5 text-xs mt-1 mb-2 disabled:bg-gray-100 disabled:text-gray-500" />

      {onizleme?.metin && (
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-gray-600">Gidecek mesaj</label>
            <span className={`text-[10px] ${onizleme.asildi ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
              {onizleme.karakter}/{MAKS_KARAKTER}
            </span>
          </div>
          <pre className="whitespace-pre-wrap bg-white border rounded-lg px-2 py-1.5 text-[11px] mt-1 max-h-48 overflow-auto font-sans">
            {onizleme.metin}
          </pre>
          {onizleme.asildi && (
            <p className="text-[11px] text-red-600 mt-1">
              Sınır aşıldı — bu haliyle mesaj GÖNDERİLMEZ. Açıklamayı kısaltın veya ürün çıkarın.
            </p>
          )}
        </div>
      )}

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
            <h4 className="font-bold mb-3">Ürün Seç</h4>
            <OtomasyonUrunSecici onSec={ekle} kapat={() => setSecici(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
