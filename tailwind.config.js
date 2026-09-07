/*
 * Marka paleti — mağaza kimliğinden türetildi:
 *   lacivert #052238  (site başlığının rengi) → mürekkep/birincil eylem
 *   krem     #ecdf93  (sitenin ana rengi)     → yalnız VURGU, zemin değil
 *
 * Kural: zemin BEYAZ kalır. Lacivert metin ve birincil düğmede, krem ise
 * seçili satır/sekme gibi küçük işaretlerde kullanılır. Renkli zemin
 * büyüdükçe metin okunurluğu düşüyor ve panel "tema" gibi görünüyor —
 * burası günlerce bakılan bir çalışma ekranı, dekor değil.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        marka: {
          50: '#f3f6f9',   // seçili satır zemini (lacivertin en açık tonu)
          100: '#e3eaf1',  // ayraç/kenarlık
          400: '#4a6b88',  // ikincil metin
          700: '#123a5c',  // düğme üzerine gelme
          900: '#052238',  // MÜREKKEP: başlık, birincil düğme, kendi mesajımız
        },
        krem: {
          50: '#fdfaef',   // çok hafif vurgu zemini
          200: '#f6eec9',  // seçili sekme alt çizgisi zemini
          400: '#ecdf93',  // MARKA VURGUSU
          600: '#c9b45c',  // krem üzerine okunur metin
        },
        kagit: '#fcfcfb',  // sohbet alanı — beyazdan bir tık sıcak
      },
    },
  },
  plugins: [],
}
