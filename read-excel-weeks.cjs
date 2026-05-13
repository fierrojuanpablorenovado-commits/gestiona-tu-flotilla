const XLSX = require('xlsx')
const fs   = require('fs')

const wb   = XLSX.read(fs.readFileSync('C:\\Users\\fierr\\Dropbox\\1.- FLOTILLA JUPAFI CONSULTORES\\FLOTILLA JUPAFI CONSULTORES ADMON.xlsm'), { type: 'buffer' })
console.log('Hojas:', wb.SheetNames.join(', '))

// ── Explorar hoja "Calcular Didi" que tiene cuentas por chofer ──
const ws  = wb.Sheets['Calcular Didi']
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

// Mostrar primeras 100 filas para entender estructura
console.log('\n=== Calcular Didi — primeras 120 filas ===')
for (let i = 0; i < Math.min(120, raw.length); i++) {
  const row = raw[i]
  if (row.some(c => c !== '')) console.log(`F${i+1}:`, JSON.stringify(row.slice(0, 15)))
}
