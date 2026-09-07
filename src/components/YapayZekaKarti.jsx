import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { aiApi } from '../api/ipc'

// Gemini anahtarı — yorum yanıtı önerisi için.
//
// Anahtar DİSKTE şifreli durur (DPAPI) ve buraya bir daha DÜZ olarak dönmez;
// girilmişse '********' görünür. Bu maske kaydedilirse mevcut değer korunur,
// yani "kaydet"e basmak anahtarı silmez.
//
// SENKRONLANMAZ: şifreli değer başka PC'de çözülemez, her PC kendi anahtarını girer.
export default function YapayZekaKarti() {
  const [ayar, setAyar] = useState({ gemini_anahtar: '', hazir: false })
  const [kaydediyor, setKaydediyor] = useState(false)

  useEffect(() => { aiApi.ayarGetir().then(setAyar).catch(() => {}) }, [])

  async function kaydet() {
    setKaydediyor(true)
    try {
      const y = await aiApi.ayarKaydet({ gemini_anahtar: ayar.gemini_anahtar })
      const h = await aiApi.hazir()
      setAyar({ ...y, hazir: h.hazir })
      toast.success('Kaydedildi')
    } catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
    finally { setKaydediyor(false) }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-[15px] font-semibold text-marka-900">Yapay Zekâ (Gemini)</h3>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          ayar.hazir ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {ayar.hazir ? 'Anahtar girildi' : 'Anahtar yok'}
        </span>
      </div>
      <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
        YouTube yorumlarına <b>yanıt taslağı</b> üretmek için kullanılır. Üretilen metin
        doğrudan yayınlanmaz; yanıt kutusuna düşer, göndermeye siz karar verirsiniz.
      </p>

      <label className="block text-[13px] font-medium text-gray-700 mb-1">API anahtarı</label>
      <input
        type="password"
        value={ayar.gemini_anahtar || ''}
        onChange={e => setAyar(a => ({ ...a, gemini_anahtar: e.target.value }))}
        placeholder="AIza…"
        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-marka-400 focus:ring-2 focus:ring-marka-50" />
      <p className="text-[12px] text-gray-400 mt-1.5">
        Google AI Studio → <b>Get API key</b> adresinden alınır. Anahtar bu bilgisayarda
        şifreli saklanır ve diğer mağaza bilgisayarlarına <b>kopyalanmaz</b> — her birine ayrı girilir.
      </p>

      <button onClick={kaydet} disabled={kaydediyor}
        className="mt-4 bg-marka-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-marka-700 disabled:opacity-50 transition-colors">
        {kaydediyor ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </div>
  )
}
