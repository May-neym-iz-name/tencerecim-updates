// Bildirim sesi: yeni bildirim gelince kısa bir "ding" çalar. Harici ses dosyası
// gerektirmez — Web Audio API ile iki-tonlu (yükselen) kısa bir zil üretir.
// Ses çalınamazsa (autoplay kısıtı vb.) sessizce yutulur; görsel rozet zaten var.
let ctx = null

export function bildirimSesiCal() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    // A5 → D6: kısa, yükselen iki-tonlu bildirim zili.
    const notalar = [880, 1174.66]
    notalar.forEach((frek, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frek
      const t = now + i * 0.15
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.3)
    })
  } catch {
    /* ses çalınamazsa görsel bildirim yeterli */
  }
}
