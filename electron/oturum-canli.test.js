// Supabase URL + publishable anahtar İKİ dosyada tekrarlanıyor:
//   src/lib/supabase.js   (renderer, vite ile paketleniyor)
//   electron/oturum-canli.js (main process, CJS)
//
// Ortak modül paylaşamıyorlar. Biri değişip diğeri unutulursa main process
// oturumu HİÇ doğrulayamaz ve herkes çevrimdışı moda düşer — sessiz ve
// teşhisi zor bir arıza. Bu test o kaymayı yakalar.
//
// (Aynı sınıf hata yetki kodlarında gerçekten yaşandı: bkz. yetki-paritesi.test.js)
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')

function sabitleriOku(dosya) {
  const metin = fs.readFileSync(path.resolve(__dirname, '..', dosya), 'utf8')
  const url = metin.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)
  const key = metin.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)['"]/)
  return { url: url && url[1], key: key && key[1] }
}

describe('Supabase sabit paritesi', () => {
  it('renderer ve main process ayni projeye baglanir', () => {
    const renderer = sabitleriOku('src/lib/supabase.js')
    const main = sabitleriOku('electron/oturum-canli.js')

    expect(renderer.url).toBeTruthy()
    expect(main.url).toBe(renderer.url)
    expect(main.key).toBe(renderer.key)
  })

  it('main process GIZLI anahtar tasimaz', () => {
    const metin = fs.readFileSync(path.resolve(__dirname, 'oturum-canli.js'), 'utf8')
    expect(metin).not.toMatch(/sb_secret_/)
    expect(metin).not.toMatch(/service_role/)
  })
})
