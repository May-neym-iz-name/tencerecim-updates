import Sekmeler from '../components/Sekmeler'
import { useAuth } from '../auth/AuthContext'
import Stok from './Stok.jsx'
import MalKabul from './MalKabul.jsx'
import IstekListesi from './IstekListesi.jsx'
import FaturaStogu from './FaturaStogu.jsx'

// Stok + Mal Kabul + İstek Listesi + Fatura Stoğu tek sayfada sekmeli.
export default function StokYonetim() {
  const { yetkiVar } = useAuth()
  const sekmeler = [
    yetkiVar('stok_goruntule') && { kod: 'stok', ad: '📊 Stok', el: <Stok /> },
    yetkiVar('mal_kabul_yonet') && { kod: 'mal-kabul', ad: '📥 Mal Kabul', el: <MalKabul /> },
    yetkiVar('mal_kabul_yonet') && { kod: 'istek-listesi', ad: '📝 İstek Listesi', el: <IstekListesi /> },
    yetkiVar('fatura_stok_goruntule') && { kod: 'fatura-stok', ad: '🧾 Fatura Stoğu', el: <FaturaStogu /> },
  ].filter(Boolean)
  return <Sekmeler sekmeler={sekmeler} />
}
