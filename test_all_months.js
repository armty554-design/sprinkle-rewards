import { PRELOADED_MONTHS } from './src/data/allMonthsData.js';
import { parseCSVData } from './src/utils/parser.js';

console.log('Testing parsing of all months:');
for (const [key, obj] of Object.entries(PRELOADED_MONTHS)) {
  try {
    const parsed = parseCSVData(obj.csv);
    console.log(`Month: ${key.padEnd(8)} | Label: ${obj.label.padEnd(16)} | Vehicles: ${parsed.vehicles.length} | Total Rewards: ${parsed.summary.totalRewards.toLocaleString()} บาท | Month in data: ${parsed.meta.month}`);
  } catch (err) {
    console.error(`Failed on ${key}:`, err.message);
  }
}
