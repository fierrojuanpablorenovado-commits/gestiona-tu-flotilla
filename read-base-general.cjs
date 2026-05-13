const XLSX = require('xlsx')
const fs   = require('fs')
const wb   = XLSX.read(fs.readFileSync('C:\\Users\\fierr\\Dropbox\\1.- FLOTILLA JUPAFI CONSULTORES\\FLOTILLA JUPAFI CONSULTORES ADMON.xlsm'), { type: 'buffer' })

const ws  = wb.Sheets['Base General']
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

// Mostrar filas con datos reales (no vacías)
console.log(`Total filas: ${raw.length}`)
const dataRows = raw.filter((r, i) => i >= 4 && r[0] && r[0] !== '' && r[0] !== 'Vehiculo / Modelo / Año')
console.log(`Filas con datos: ${dataRows.length}\n`)

// Mostrar todas las filas de datos
dataRows.forEach((r, i) => {
  console.log(`${i+1}. Vehiculo="${r[0]}" | Semana="${r[3]}" | Chofer="${r[4]}" | Renta=${r[5]} | DiDi=${r[6]} | Cont=${r[7]} | Imp=${r[8]} | Saldo=${r[10]} | Monto=${r[11]} | Km=${r[12]}`)
})
