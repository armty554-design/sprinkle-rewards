import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { cleanText, cleanNum, normalizeDetailedSheetRows } from './parser.js';

export const MASTER_SPREADSHEET_ID = '1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc';
export const MASTER_LATEST_GID = '1816567626';
export const MASTER_XLSX_URL = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/export?format=xlsx`;
export const MASTER_LATEST_SHEET_URL = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/edit?gid=${MASTER_LATEST_GID}#gid=${MASTER_LATEST_GID}`;

const THAI_MONTH_NAMES = [
  '',
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม'
];

function trimRowRight(row, width) {
  return (row || []).slice(0, width);
}

/**
 * Extracts all monthly detail tabs (`MM-25XX`, e.g. `01-2569` .. `09-2569`)
 * from an Excel workbook downloaded from the master Google Sheet,
 * normalizing headers/columns and stripping trailing empty rows/columns.
 */
export function extractMonthlySheetsFromWorkbook(workbook) {
  if (!workbook || !Array.isArray(workbook.SheetNames)) return {};

  const months = {};

  for (const sheetName of workbook.SheetNames) {
    const match = String(sheetName).trim().match(/^(\d{2})-(25\d{2})$/);
    if (!match) continue;

    const mm = match[1];
    const year = match[2];
    const mInt = parseInt(mm, 10);
    if (mInt < 1 || mInt > 12) continue;

    const monthKey = `${year}-${mm}`;
    const label = `${THAI_MONTH_NAMES[mInt]} ${year}`;
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    const normRows = normalizeDetailedSheetRows(rawRows);
    if (!normRows || normRows.length < 4) continue;

    const h1 = normRows[1] || [];
    const h2 = normRows[2] || [];
    let maxCol = 0;
    for (let c = Math.max(h1.length, h2.length) - 1; c >= 0; c--) {
      if (cleanText(h1[c]) || cleanText(h2[c])) {
        maxCol = c + 1;
        break;
      }
    }
    if (maxCol < 20) continue;

    // Exclude right-hand dashboard box columns (e.g. col 168 'จำนวนรถ' in 01-2569) past ประเภทรถ/AD ตรวจสอบ
    let contentWidth = maxCol;
    for (let c = maxCol - 1; c >= 145; c--) {
      const s2 = cleanText(h2[c]);
      if (s2 === 'จำนวนรถ') {
        // Trim any small summary table positioned past the main columns
        const beforeEmpty = !cleanText(h2[c - 1]);
        const afterReward = cleanText(h2[c + 2]) === 'รวมเงินรางวัล';
        if (beforeEmpty || afterReward) {
          contentWidth = c;
          continue;
        }
      }
      if (s2 === 'ประเภทรถ' || s2 === 'รวมทุกกลุ่มงาน' || s2.startsWith('กลุ่มงาน')) {
        break;
      }
    }

    const cleanHeaderRows = [
      trimRowRight(normRows[0], contentWidth),
      trimRowRight(normRows[1], contentWidth),
      trimRowRight(normRows[2], contentWidth)
    ];

    const rewardCol = h2.findIndex(c => cleanText(c) === 'รวมเงินรางวัล');
    const branchesSet = new Set();
    let totalReward = 0;
    const vehicleRows = [];

    for (let i = 3; i < normRows.length; i++) {
      const r = normRows[i];
      if (!r || r.length < 10) continue;
      const col8 = cleanText(r[8]).toLowerCase();
      if (col8 === 'sum' || col8.includes('ข้อมูลจาก link') || col8.includes('รวม')) break;

      const carCode = cleanText(r[3]);
      if (!carCode || carCode.length < 3 || isNaN(parseInt(carCode[0], 10))) continue;

      const trimmed = trimRowRight(r, contentWidth);
      vehicleRows.push(trimmed);

      const branch = cleanText(trimmed[0]);
      if (branch) branchesSet.add(branch);
      if (rewardCol >= 0 && rewardCol < trimmed.length) {
        totalReward += cleanNum(trimmed[rewardCol]);
      }
    }

    if (vehicleRows.length === 0) continue;

    const csv = Papa.unparse([...cleanHeaderRows, ...vehicleRows], { newline: '\r\n' });
    months[monthKey] = {
      key: monthKey,
      label,
      sheetName,
      spreadsheetId: MASTER_SPREADSHEET_ID,
      source: 'sheets_01_09',
      vehicleCount: vehicleRows.length,
      branches: Array.from(branchesSet).sort(),
      totalReward,
      csv
    };
  }

  return months;
}

/**
 * Convenience wrapper that parses an ArrayBuffer / Uint8Array XLSX workbook and extracts all monthly sheets.
 */
export function extractMonthlySheetsFromBuffer(arrayBuffer) {
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  return extractMonthlySheetsFromWorkbook(wb);
}
