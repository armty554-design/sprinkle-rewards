import fs from 'fs';

const sheets = [
  { month: '2569-01', label: 'มกราคม 2569', gid: '915862523' },
  { month: '2569-02', label: 'กุมภาพันธ์ 2569', gid: '628722540' },
  { month: '2569-03', label: 'มีนาคม 2569', gid: '901405963' },
  { month: '2569-04', label: 'เมษายน 2569', gid: '1652161346' },
  { month: '2569-05', label: 'พฤษภาคม 2569', gid: '744519543' },
  { month: '2569-06', label: 'มิถุนายน 2569', gid: '185158721' },
  { month: '2569-07', label: 'กรกฎาคม 2569', gid: '478654429' },
  { month: '2569-08', label: 'สิงหาคม 2569', gid: '731550016' },
  { month: '2569-09', label: 'กันยายน 2569', gid: '1535795255' }
];

const sheetId = '1iRRkVS5mc9BfuKvEIsWN6l946zE7HKMEmmun0iIdXFs';

async function downloadAll() {
  const monthsData = {};

  for (const s of sheets) {
    console.log(`Downloading ${s.label} (${s.month}, gid: ${s.gid})...`);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${s.gid}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed ${s.month}: HTTP ${res.status}`);
        continue;
      }
      const csv = await res.text();
      monthsData[s.month] = {
        key: s.month,
        label: s.label,
        gid: s.gid,
        csv: csv
      };
      console.log(`✓ ${s.label} downloaded (${csv.length} bytes)`);
    } catch (err) {
      console.error(`Error downloading ${s.month}:`, err.message);
    }
  }

  // Write to src/data/allMonthsData.js
  const code = `export const PRELOADED_MONTHS = ${JSON.stringify(monthsData, null, 2)};\n`;
  fs.writeFileSync('src/data/allMonthsData.js', code, 'utf8');
  console.log('Saved src/data/allMonthsData.js successfully!');
}

downloadAll();
