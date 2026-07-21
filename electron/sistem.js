// Sistem yardımcıları: dış bağlantıyı (WhatsApp, takip linki vb.) varsayılan
// tarayıcı/uygulamada açar.
const { shell, BrowserWindow } = require('electron')

module.exports = {
  // Electron'un Windows'taki bilinen hatası: window.confirm()/alert() sonrası
  // renderer'daki input alanları odak alamaz hale gelir (uygulama yeniden
  // açılana kadar hiçbir kutuya yazılamaz). Pencereye blur+focus yaptırmak
  // kilidi çözer. Renderer her confirm/alert sonrası bu kanalı çağırır.
  'sistem:odak-tazele': async () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    if (win) { win.blur(); win.focus() }
    return { ok: true }
  },
  'sistem:link-ac': async (url) => {
    const u = String(url || '')
    // Yalnızca güvenli şemalar (https/http/mailto/tel/whatsapp).
    if (!/^(https?|mailto|tel|whatsapp):/i.test(u)) throw new Error('Geçersiz bağlantı')
    await shell.openExternal(u)
    return { ok: true }
  },
}
