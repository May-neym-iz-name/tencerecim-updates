// Kargo etiketi ÖNİZLEME penceresinin preload'ı. Ana pencerenin preload'ından ayrı ve
// dar tutulur: önizleme, kullanıcıya HTML gösteren ayrı bir pencere — oraya tüm IPC
// yüzeyini (api.invoke) açmak gereksiz geniş yetki olurdu. Sadece "PDF kaydet" gerekli.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('tncEtiket', {
  // Ana süreç {ok, data} sarmalıyla döner (bkz. main.js handler kaydı) — burada açılır.
  pdfKaydet: async () => {
    const c = await ipcRenderer.invoke('kargo-etiket:pdf')
    if (!c || c.ok === false) throw new Error((c && c.error) || 'PDF kaydedilemedi')
    return c.data
  },
})
