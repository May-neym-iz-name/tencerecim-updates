import { useSearchParams } from 'react-router-dom'
import Sekmeler from '../components/Sekmeler'
import { useAuth } from '../auth/AuthContext'
import OnlineSiparisler from './OnlineSiparisler.jsx'
import OnSiparisler from './OnSiparisler.jsx'

// Web siparişleri (ikas) + mağazadan alınan ön siparişler tek sayfada sekmeli.
// ?sekme=on-siparis ile doğrudan ön sipariş sekmesi açılabilir.
export default function SiparisMerkezi() {
  const { yetkiVar } = useAuth()
  const [params] = useSearchParams()
  const sekmeler = [
    yetkiVar('online_siparis_goruntule') && { kod: 'online', ad: '🛍️ Online Siparişler', el: <OnlineSiparisler /> },
    yetkiVar('satis_gecmisi_goruntule') && { kod: 'on-siparis', ad: '🕐 Ön Siparişler', el: <OnSiparisler /> },
  ].filter(Boolean)
  return <Sekmeler sekmeler={sekmeler} aktifKod={params.get('sekme')} />
}
