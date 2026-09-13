import { useSearchParams } from 'react-router-dom'
import Sekmeler from '../components/Sekmeler'
import { useAuth } from '../auth/AuthContext'
import OnlineSiparisler from './OnlineSiparisler.jsx'
import OnSiparisler from './OnSiparisler.jsx'
import TrendyolSiparisler from './TrendyolSiparisler.jsx'

// Web siparişleri (ikas) + Trendyol siparişleri + mağazadan alınan ön siparişler.
// Kanallar AYRI sekmelerde: Trendyol'un birimi pakettir ve alanları ikas'tan farklıdır.
// ?sekme=on-siparis ile doğrudan ön sipariş sekmesi açılabilir.
export default function SiparisMerkezi() {
  const { yetkiVar } = useAuth()
  const [params] = useSearchParams()
  const sekmeler = [
    yetkiVar('online_siparis_goruntule') && { kod: 'online', ad: '🛍️ Online Siparişler', el: <OnlineSiparisler /> },
    yetkiVar('online_siparis_goruntule') && { kod: 'trendyol', ad: '🧡 Trendyol', el: <TrendyolSiparisler /> },
    yetkiVar('satis_gecmisi_goruntule') && { kod: 'on-siparis', ad: '🕐 Ön Siparişler', el: <OnSiparisler /> },
  ].filter(Boolean)
  return <Sekmeler sekmeler={sekmeler} aktifKod={params.get('sekme')} />
}
