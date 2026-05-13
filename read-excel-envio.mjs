import XLSX from 'xlsx';
import fs from 'fs';

const wb = XLSX.read(fs.readFileSync('C:\\Users\\fierr\\Dropbox\\1.- FLOTILLA JUPAFI CONSULTORES\\FLOTILLA JUPAFI CONSULTORES ADMON.xlsm'), { type: 'buffer' });

// Hoja Envio Cuentas
const ws = wb.Sheets['Envio Cuentas'];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log('=== HOJA: Envio Cuentas ===');
console.log(`Total filas: ${raw.length}`);
raw.slice(0, 40).forEach((r, i) => {
  if (r.some(c => c !== '')) console.log(`Fila ${i+1}: ${JSON.stringify(r)}`);
});

// Hoja Seguros
const wsSeg = wb.Sheets['Seguros'];
if (wsSeg) {
  const rawSeg = XLSX.utils.sheet_to_json(wsSeg, { header: 1, defval: '' });
  console.log('\n=== HOJA: Seguros ===');
  rawSeg.slice(0, 20).forEach((r, i) => {
    if (r.some(c => c !== '')) console.log(`Fila ${i+1}: ${JSON.stringify(r)}`);
  });
} else {
  console.log('\nNo existe hoja "Seguros"');
  console.log('Hojas disponibles:', wb.SheetNames.join(', '));
}
