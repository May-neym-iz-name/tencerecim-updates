import Sekmeler from '../components/Sekmeler'
import { useAuth } from '../auth/AuthContext'
import Stok from './Stok.jsx'
import MalKabul from './MalKabul.jsx'

// Stok + Mal Kabul tek sayfada sekmeli.
export default function StokYonetim() {
  const { yetkiVar } = useAuth()
  const sekmeler = [
    yetkiVar('stok_goruntule') && { kod: 'stok', ad: '📊 Stok', el: <Stok /> },
    yetkiVar('mal_kabul_yonet') && { kod: 'mal-kabul', ad: '📥 Mal Kabul', el: <MalKabul /> },
  ].filter(Boolean)
  return <Sekmeler sekmeler={sekmeler} />
}
