const XLSX = require('xlsx')
const fs   = require('fs')
const wb   = XLSX.read(fs.readFileSync('C:\\Users\\fierr\\Dropbox\\1.- FLOTILLA JUPAFI CONSULTORES\\FLOTILLA JUPAFI CONSULTORES ADMON.xlsm'), { type: 'buffer' })

// Explorar "Envio Cuentas"
const wsE = wb.Sheets['Envio Cuentas']
const rawE = XLSX.utils.sheet_to_json(wsE, { header: 1, defval: '' })
console.log('\n=== Envio Cuentas — primeras 200 filas ===')
for (let i = 0; i < Math.min(200, rawE.length); i++) {
  const row = rawE[i]
  if (row.some(c => c !== '')) console.log(`F${i+1}:`, JSON.stringify(row.slice(0, 12)))
}

// Explorar "Base General"
const wsBG = wb.Sheets['Base General']
if (wsBG) {
  const rawBG = XLSX.utils.sheet_to_json(wsBG, { header: 1, defval: '' })
  console.log('\n=== Base General — primeras 100 filas ===')
  for (let i = 0; i < Math.min(100, rawBG.length); i++) {
    const row = rawBG[i]
    if (row.some(c => c !== '')) console.log(`F${i+1}:`, JSON.stringify(row.slice(0, 15)))
  }
}
