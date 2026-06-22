// Uygulama sürümünü renderer'a verir (kenar çubuğunda göstermek için).
const { app } = require('electron')

module.exports = {
  'app:surum': () => app.getVersion(),
}
