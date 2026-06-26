import Sekmeler from '../components/Sekmeler'
import { useAuth } from '../auth/AuthContext'
import SatisGecmisi from './SatisGecmisi.jsx'
import Kasa from './Kasa.jsx'
import Giderler from './Giderler.jsx'

// Satış Geçmişi + Kasa + Giderler tek sayfada sekmeli.
export default function SatisFinans() {
  const { yetkiVar } = useAuth()
  const sekmeler = [
    yetkiVar('satis_gecmisi_goruntule') && { kod: 'gecmis', ad: '📋 Satış Geçmişi', el: <SatisGecmisi /> },
    yetkiVar('kasa_kullan') && { kod: 'kasa', ad: '💰 Kasa', el: <Kasa /> },
    yetkiVar('gider_yonet') && { kod: 'gider', ad: '🧾 Giderler', el: <Giderler /> },
  ].filter(Boolean)
  return <Sekmeler sekmeler={sekmeler} />
}
