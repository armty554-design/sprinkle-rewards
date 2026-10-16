const fs = require('fs');

function parseFullCSV(text) {
  const rows = [];
  let currentRow = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        currentRow[currentRow.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      rows.push(currentRow);
      currentRow = [''];
    } else {
      currentRow[currentRow.length - 1] += c;
    }
  }
  if (currentRow.length > 1 || currentRow[0] !== '') {
    rows.push(currentRow);
  }
  return rows;
}

const raw = fs.readFileSync('sheet_data.csv', 'utf8');
const rows = parseFullCSV(raw);

console.log('List of drivers and vehicles:');
for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  const car = r[3];
  const name = (r[4] || '') + ' ' + (r[5] || '');
  const reward = r[155];
  const totalScore = r[151];
  const totalPercent = r[152];
  const zone = r[157];
  const carType = r[169];
  if (car && car.trim() && !isNaN(parseInt(car[0]))) {
    console.log(`Car: ${car.padEnd(7)} | Name: ${name.padEnd(25)} | Zone: ${(zone||'').padEnd(6)} | Reward: ${(reward||'0').padStart(7)} บาท | Score: ${totalScore} (${totalPercent}%) | Type: ${carType}`);
  }
}
