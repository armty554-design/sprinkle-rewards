// Month data manager supporting preloaded historical months, user-uploaded new months,
// and high-capacity IndexedDB storage for saving all 18 branches across multiple months without 5MB quota errors.
import { PRELOADED_MONTHS } from '../data/allMonthsData.js';
import { ALL_18_BRANCHES_MONTH_2569_09 } from '../data/all18BranchesData.js';
import { idbSaveMonth, idbGetMonth, idbGetAllMonths, idbDeleteMonth } from './idbStorage.js';
import Papa from 'papaparse';

const STORAGE_CUSTOM_MONTHS = 'sprinkle_custom_months';
const STORAGE_SELECTED_MONTH = 'sprinkle_selected_month';

// In-memory cache for fast synchronous access
let customMonthsCache = null;
let isInitialized = false;

export const THAI_MONTH_NAMES = [
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

/**
 * Normalizes any month key format to standard chronological YYYY-MM (e.g. "10-2567" -> "2567-10", "2569-09" -> "2569-09")
 */
export function normalizeMonthKey(str) {
  if (!str) return '';
  const s = String(str).trim();
  // Pattern 1: YYYY-MM (e.g. 2569-09, 2569_09, 2569/9)
  const m1 = s.match(/(25[0-9]{2})[-_/]([0-9]{1,2})/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}`;

  // Pattern 2: MM-YYYY (e.g. 10-2567, 9-2568, 01-2568)
  const m2 = s.match(/([0-9]{1,2})[-_/](25[0-9]{2})/);
  if (m2) return `${m2[2]}-${m2[1].padStart(2, '0')}`;

  // Pattern 3: AD year like 2024-10
  const m3 = s.match(/(20[0-9]{2})[-_/]([0-9]{1,2})/);
  if (m3) return `${parseInt(m3[1], 10) + 543}-${m3[2].padStart(2, '0')}`;

  return s;
}

/**
 * Converts any month string or key into clean standard Thai month name (e.g. "2569-09" -> "กันยายน 2569", "10-2567" -> "ตุลาคม 2567")
 */
export function formatThaiMonthLabel(str) {
  if (!str) return '';
  const normKey = normalizeMonthKey(str);
  const match = normKey.match(/(25[0-9]{2})-([0-9]{2})/);
  if (match) {
    const y = match[1];
    const m = parseInt(match[2], 10);
    if (m >= 1 && m <= 12) {
      return `${THAI_MONTH_NAMES[m]} ${y}`;
    }
  }

  // If already contains Thai month name, strip unwanted prefixes like "ข้อมูลรางวัลเดือน"
  let clean = String(str).replace(/ข้อมูลรางวัลเดือน\s*/g, '').replace(/ข้อมูลรางวัล\s*/g, '').trim();
  return clean || str;
}

/**
 * Trims empty trailing columns from a row to drastically reduce CSV memory/storage footprint
 */
function trimRowColumns(row, minKeep = 145) {
  if (!Array.isArray(row)) return row;
  let lastNonEmpty = row.length - 1;
  while (lastNonEmpty >= minKeep && (!row[lastNonEmpty] || String(row[lastNonEmpty]).trim() === '')) {
    lastNonEmpty--;
  }
  return row.slice(0, lastNonEmpty + 1);
}

/**
 * Safely persists custom months into localStorage if size allows, without failing if quota is exceeded.
 */
function trySyncToLocalStorage(monthsObj) {
  try {
    localStorage.setItem(STORAGE_CUSTOM_MONTHS, JSON.stringify(monthsObj));
  } catch (err) {
    // LocalStorage quota exceeded (5MB limit reached) - safely fall back to IndexedDB
    console.info('LocalStorage quota exceeded (5MB limit). Data is securely persisted in IndexedDB.');
  }
}

/**
 * Initialize storage on app startup:
 * 1. Loads from IndexedDB
 * 2. Seeds month 2569-09 with all 18 branches if not present or incomplete
 * 3. Migrates any localStorage items to IndexedDB
 */
export async function initStorage() {
  getCustomMonths();

  try {
    const idbMonths = await idbGetAllMonths();
    let hasUpdates = false;

    // Merge IDB into memory cache
    if (idbMonths && Object.keys(idbMonths).length > 0) {
      Object.keys(idbMonths).forEach(k => {
        const item = idbMonths[k];
        if (item && item.key) {
          if (!customMonthsCache[item.key] || (item.uploadedAt && item.uploadedAt > (customMonthsCache[item.key].uploadedAt || ''))) {
            customMonthsCache[item.key] = item;
            hasUpdates = true;
          }
        }
      });
    }

    // Migrate any cached months into IndexedDB
    Object.keys(customMonthsCache).forEach(k => {
      if (!idbMonths || !idbMonths[k]) {
        idbSaveMonth(customMonthsCache[k]);
      }
    });

    // Seed 2569-09 with ALL 18 BRANCHES if not already complete (382 vehicles)
    const m09 = customMonthsCache['2569-09'] || PRELOADED_MONTHS['2569-09'];
    const stats09 = m09 && m09.csv ? getMonthQuickStats(m09.csv) : { count: 0, branches: [] };
    if (stats09.branches.length < 18) {
      const all18Month = {
        key: '2569-09',
        label: 'กันยายน 2569',
        csv: ALL_18_BRANCHES_MONTH_2569_09,
        uploadedAt: new Date().toISOString(),
        note: 'ข้อมูลครบทั้ง 18 สาขาปฏิบัติการ (382 คัน, รางวัลรวม 850,070 บาท)'
      };
      customMonthsCache['2569-09'] = all18Month;
      await idbSaveMonth(all18Month);
      trySyncToLocalStorage(customMonthsCache);
      hasUpdates = true;
    }

    isInitialized = true;
    if (hasUpdates) {
      window.dispatchEvent(new Event('sprinkle_months_updated'));
    }
    return true;
  } catch (err) {
    console.warn('initStorage failed:', err);
    return false;
  }
}

// Get list of all available months (Preloaded + User uploaded)
export function getAllMonths() {
  const customMonths = getCustomMonths();
  
  // Combine preloaded and custom
  const all = { ...PRELOADED_MONTHS, ...customMonths };

  // Make sure 2569-09 defaults to all 18 branches if not overridden in custom
  if (!customMonths['2569-09']) {
    all['2569-09'] = {
      key: '2569-09',
      label: 'กันยายน 2569',
      csv: ALL_18_BRANCHES_MONTH_2569_09,
      note: 'ข้อมูลครบทั้ง 18 สาขาปฏิบัติการ (382 คัน)'
    };
  }
  
  // Normalize and clean each month
  const monthMap = new Map();
  Object.keys(all).forEach(k => {
    const item = all[k];
    if (!item) return;
    const normKey = normalizeMonthKey(item.key || k);
    const cleanLabel = formatThaiMonthLabel(item.label || item.key || k);
    monthMap.set(normKey, {
      ...item,
      key: normKey,
      label: cleanLabel
    });
  });

  // Sort descending chronologically (e.g. 2569-09, 2569-08, ..., 2567-10)
  const sorted = Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  return sorted;
}

export function getMonthData(monthKey) {
  const normKey = normalizeMonthKey(monthKey);
  const customMonths = getCustomMonths();
  if (customMonths[normKey]) return customMonths[normKey];
  if (customMonths[monthKey]) return customMonths[monthKey];

  if (normKey === '2569-09' || monthKey === '2569-09') {
    return {
      key: '2569-09',
      label: 'กันยายน 2569',
      csv: ALL_18_BRANCHES_MONTH_2569_09,
      note: 'ข้อมูลครบทั้ง 18 สาขาปฏิบัติการ (382 คัน)'
    };
  }

  if (PRELOADED_MONTHS[normKey]) return PRELOADED_MONTHS[normKey];
  if (PRELOADED_MONTHS[monthKey]) return PRELOADED_MONTHS[monthKey];
  
  // Fallback to latest
  const all = getAllMonths();
  return all[0] || null;
}

export function getCustomMonths() {
  if (customMonthsCache !== null) {
    return customMonthsCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_MONTHS);
    if (!raw) {
      customMonthsCache = {};
      return customMonthsCache;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      customMonthsCache = {};
      return customMonthsCache;
    }

    const sanitized = {};
    Object.keys(parsed).forEach(k => {
      const item = parsed[k];
      if (!item) return;
      const normKey = normalizeMonthKey(item.key || k);
      const cleanLabel = formatThaiMonthLabel(item.label || item.key || k);

      sanitized[normKey] = {
        ...item,
        key: normKey,
        label: cleanLabel
      };
    });

    customMonthsCache = sanitized;
    return customMonthsCache;
  } catch (err) {
    customMonthsCache = {};
    return customMonthsCache;
  }
}

export function saveNewMonth(monthKey, label, csvText, note = '') {
  try {
    const normKey = normalizeMonthKey(monthKey) || `month_${Date.now()}`;
    const cleanLabel = formatThaiMonthLabel(label || normKey);
    const customMonths = getCustomMonths();

    // Optimize CSV by trimming trailing empty columns
    let processedCsv = csvText;
    try {
      const parsed = Papa.parse(csvText, { skipEmptyLines: false });
      if (parsed.data && parsed.data.length > 0) {
        const trimmedRows = parsed.data.map(r => trimRowColumns(r));
        processedCsv = Papa.unparse(trimmedRows);
      }
    } catch (e) {
      processedCsv = csvText;
    }

    const monthObj = {
      key: normKey,
      label: cleanLabel,
      csv: processedCsv,
      uploadedAt: new Date().toISOString(),
      note: note || 'อัปโหลดโดยผู้ใช้'
    };

    customMonths[normKey] = monthObj;
    customMonthsCache = customMonths;

    // Asynchronously save to IndexedDB (unlimited storage)
    idbSaveMonth(monthObj);

    // Try saving to localStorage for fallback
    trySyncToLocalStorage(customMonths);

    setSelectedMonthKey(normKey);
    window.dispatchEvent(new Event('sprinkle_months_updated'));
    return monthObj;
  } catch (err) {
    console.error('Failed to save new month:', err);
    return null;
  }
}

/**
 * Merge a branch's CSV records into an existing month (e.g. merge Bangplee into 2569-09 that already has Ramintra)
 * Prevents duplicate cars within the same branch and preserves all existing branch data.
 * Saves directly into IndexedDB so all 18 branches can be saved simultaneously.
 */
export function mergeBranchIntoMonth(monthKey, branchCsv, label = '', note = '') {
  try {
    const normKey = normalizeMonthKey(monthKey) || `month_${Date.now()}`;
    const cleanLabel = formatThaiMonthLabel(label || normKey);
    const existingMonth = getMonthData(normKey);
    if (!existingMonth || !existingMonth.csv) {
      return saveNewMonth(normKey, cleanLabel, branchCsv, note);
    }

    const existingParsed = Papa.parse(existingMonth.csv, { skipEmptyLines: false });
    const newParsed = Papa.parse(branchCsv, { skipEmptyLines: false });

    const existingRows = existingParsed.data || [];
    const newRows = newParsed.data || [];

    // Use headers from existing or new
    const rawHeaderRows = existingRows.length >= 3 ? existingRows.slice(0, 3) : newRows.slice(0, 3);
    const headerRows = rawHeaderRows.map(r => trimRowColumns(r));

    // Existing vehicle rows
    const existingVehicles = existingRows.slice(3).filter(r => {
      const c = (r[3] || '').toString().trim();
      return c && c.length >= 3 && !isNaN(parseInt(c[0]));
    });

    // New vehicle rows
    const newVehicles = newRows.slice(3).filter(r => {
      const c = (r[3] || '').toString().trim();
      return c && c.length >= 3 && !isNaN(parseInt(c[0]));
    });

    // Distinguish by branch + carCode so cars across different branches don't collide
    const vehicleKey = (r) => `${(r[0] || '').toString().trim()}_${(r[3] || '').toString().trim()}`;
    const vehicleMap = new Map();

    existingVehicles.forEach(r => {
      vehicleMap.set(vehicleKey(r), trimRowColumns(r));
    });

    newVehicles.forEach(r => {
      vehicleMap.set(vehicleKey(r), trimRowColumns(r));
    });

    const combinedRows = [
      ...headerRows,
      ...Array.from(vehicleMap.values())
    ];

    const mergedCsv = Papa.unparse(combinedRows);
    const branchesFound = Array.from(new Set(Array.from(vehicleMap.values()).map(r => (r[0] || '').toString().trim()).filter(Boolean)));

    const customMonths = getCustomMonths();
    const monthObj = {
      key: normKey,
      label: cleanLabel,
      csv: mergedCsv,
      uploadedAt: new Date().toISOString(),
      note: note || `รวมข้อมูลสาขา (${branchesFound.length} สาขา: ${branchesFound.join(', ')}) เรียบร้อย`
    };

    customMonths[normKey] = monthObj;
    customMonthsCache = customMonths;

    // Asynchronously save to IndexedDB (unlimited storage capacity)
    idbSaveMonth(monthObj);

    // Try sync to localStorage for fallback
    trySyncToLocalStorage(customMonths);

    setSelectedMonthKey(normKey);
    window.dispatchEvent(new Event('sprinkle_months_updated'));
    return monthObj;
  } catch (err) {
    console.error('Failed to merge branch into month:', err);
    return null;
  }
}

export function deleteCustomMonth(monthKey) {
  try {
    const customMonths = getCustomMonths();
    delete customMonths[monthKey];
    customMonthsCache = customMonths;

    // Delete from IndexedDB
    idbDeleteMonth(monthKey);

    // Sync to localStorage
    trySyncToLocalStorage(customMonths);

    window.dispatchEvent(new Event('sprinkle_months_updated'));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Quick analysis of month CSV to return vehicle count, branches, and rewards
 */
export function getMonthQuickStats(csvText) {
  if (!csvText) return { count: 0, branches: [], totalReward: 0 };
  try {
    const parsed = Papa.parse(csvText, { skipEmptyLines: false });
    const rows = parsed.data || [];
    const vehicles = rows.slice(3).filter(r => {
      const c = (r[3] || '').toString().trim();
      return c && c.length >= 3 && !isNaN(parseInt(c[0]));
    });
    const branches = Array.from(new Set(vehicles.map(r => (r[0] || '').toString().trim()).filter(Boolean))).sort();
    
    // Total reward is typically around column 140 or colMap totalReward
    let totalReward = 0;
    // Inspect row 2 to find index of 'รวมเงินรางวัล'
    const h2 = rows[2] || [];
    let rewardCol = h2.findIndex(c => String(c).trim() === 'รวมเงินรางวัล');
    if (rewardCol === -1) rewardCol = 140;

    vehicles.forEach(r => {
      const val = parseFloat(String(r[rewardCol] || '0').replace(/,/g, ''));
      if (!isNaN(val)) totalReward += val;
    });

    return {
      count: vehicles.length,
      branches,
      totalReward
    };
  } catch (e) {
    return { count: 0, branches: [], totalReward: 0 };
  }
}

export function getSelectedMonthKey() {
  return localStorage.getItem(STORAGE_SELECTED_MONTH) || '2569-09';
}

export function setSelectedMonthKey(key) {
  localStorage.setItem(STORAGE_SELECTED_MONTH, key);
}
