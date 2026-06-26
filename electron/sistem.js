// Sistem yardımcıları: dış bağlantıyı (WhatsApp, takip linki vb.) varsayılan
// tarayıcı/uygulamada açar.
const { shell } = require('electron')

module.exports = {
  'sistem:link-ac': async (url) => {
    const u = String(url || '')
    // Yalnızca güvenli şemalar (https/http/mailto/tel/whatsapp).
    if (!/^(https?|mailto|tel|whatsapp):/i.test(u)) throw new Error('Geçersiz bağlantı')
    await shell.openExternal(u)
    return { ok: true }
  },
}
