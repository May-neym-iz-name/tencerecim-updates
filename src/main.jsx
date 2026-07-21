import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Electron'un Windows'taki bilinen hatası: window.confirm()/alert() kapandıktan
// sonra input alanları odak alamaz olur — uygulama yeniden açılana kadar hiçbir
// metin kutusuna yazılamaz. Tek noktadan çözüm: her confirm/alert sonrası ana
// sürece "pencere odağını tazele" (blur+focus) dedirtilir. Böylece 20+ çağrı
// yerini değiştirmeye gerek kalmaz.
for (const ad of ['confirm', 'alert']) {
  const yerli = window[ad].bind(window)
  window[ad] = (...args) => {
    const sonuc = yerli(...args)
    try { window.api?.invoke('sistem:odak-tazele') } catch { /* dev tarayıcısında api yok */ }
    return sonuc
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
