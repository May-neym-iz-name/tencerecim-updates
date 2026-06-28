import { Component } from 'react'

// Render sırasında bir hata olursa tüm uygulamanın beyaz ekrana düşmesini önler;
// kullanıcıya anlaşılır mesaj + kurtarma seçenekleri gösterir. React error
// boundary'leri sınıf bileşeni olmak zorundadır.
export default class HataSiniri extends Component {
  constructor(props) {
    super(props)
    this.state = { hata: null }
  }

  static getDerivedStateFromError(hata) {
    return { hata }
  }

  componentDidCatch(hata, bilgi) {
    // Geliştirme/teşhis için konsola yaz.
    console.error('[HataSiniri] yakalanan render hatası:', hata, bilgi?.componentStack)
  }

  render() {
    if (!this.state.hata) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6 max-w-md text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Bir şeyler ters gitti</h2>
          <p className="text-sm text-gray-500 mb-4">
            Bu ekran beklenmedik bir hatayla karşılaştı. Veriler güvende — sayfayı yenileyerek devam edebilirsiniz.
          </p>
          <p className="text-[11px] text-gray-400 break-words mb-4 font-mono bg-gray-50 rounded p-2">
            {String(this.state.hata?.message || this.state.hata)}
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => { this.setState({ hata: null }) }}
              className="px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">Tekrar Dene</button>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">Uygulamayı Yenile</button>
          </div>
        </div>
      </div>
    )
  }
}
