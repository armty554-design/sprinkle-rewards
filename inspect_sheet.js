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
const allRows = parseFullCSV(raw);

const headerRow0 = allRows[0];
const headerRow1 = allRows[1];
const headerRow2 = allRows[2];

const columns = [];
for (let i = 0; i < headerRow2.length; i++) {
  columns.push({
    index: i,
    group: (headerRow1[i] || '').trim(),
    name: (headerRow2[i] || '').replace(/\r?\n/g, ' ').trim()
  });
}

// Write columns to a JSON file so we can view them completely
fs.writeFileSync('columns_summary.json', JSON.stringify(columns, null, 2), 'utf8');

// Also inspect a sample driver data in detail
const sampleDriver = allRows[3]; // Row 3 is first driver (13101 ไกรสร ศักดิ์สร้อย)
const driverObj = {};
columns.forEach(col => {
  if (sampleDriver[col.index] !== undefined && sampleDriver[col.index] !== '') {
    driverObj[`[${col.index}] ${col.group ? col.group + ' -> ' : ''}${col.name}`] = sampleDriver[col.index];
  }
});
fs.writeFileSync('sample_driver.json', JSON.stringify(driverObj, null, 2), 'utf8');
console.log('Saved columns_summary.json and sample_driver.json');
