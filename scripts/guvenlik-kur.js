// Git kancalarini devreye alir: core.hooksPath = .githooks
//
// Neden bir betik? core.hooksPath repo AYARIDIR, repoya commitlenmez — yani
// baska bir PC'de klonlandiginda kanca kendiliginden calismaz. Bu betik
// `postinstall`da otomatik cagrilir, boylece `npm install` yapan her makinede
// koruma kendiliginden kurulur.
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function calistir(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

try {
  // Git deposu degilse (ornegin kurulmus uygulama icinde) sessizce cik.
  calistir(['rev-parse', '--git-dir'])
} catch {
  process.exit(0)
}

const kok = path.resolve(__dirname, '..')
const kancaDizini = path.join(kok, '.githooks')
if (!fs.existsSync(kancaDizini)) process.exit(0)

let mevcut = ''
try { mevcut = calistir(['config', '--get', 'core.hooksPath']) } catch { /* ayarlanmamis */ }

if (mevcut === '.githooks') {
  console.log('[guvenlik] Git kancalari zaten kurulu (.githooks).')
  process.exit(0)
}

calistir(['config', 'core.hooksPath', '.githooks'])

// Unix'te calistirma izni gerekir; Windows'ta bu bayrak yok sayilir ama
// git-bash yine de sh ile calistirir.
try { fs.chmodSync(path.join(kancaDizini, 'pre-commit'), 0o755) } catch { /* Windows */ }

console.log('[guvenlik] Git pre-commit sizinti taramasi KURULDU (.githooks).')
