// Month data manager supporting preloaded detailed monthly sheets (01-2569 .. 09-2569) and automatic live sync (10-2569..12-2569+),
// plus high-capacity IndexedDB storage for saving all 18 branches across multiple months without 5MB quota errors.
import { PRELOADED_MONTHS } from '../data/allMonthsData.js';
import { idbSaveMonth, idbGetAllMonths, idbDeleteMonth } from './idbStorage.js';
import Papa from 'papaparse';
import { isLookerFormat, buildLookerColMap, splitLookerCsvByMonth, LOOKER_GID } from './lookerParser.js';
import { normalizeDetailedSheetRows } from './parser.js';
import { extractMonthlySheetsFromBuffer, MASTER_SPREADSHEET_ID, MASTER_XLSX_URL } from './sheetWorkbookSync.js';

const STORAGE_CUSTOM_MONTHS = 'sprinkle_custom_months';
const STORAGE_SELECTED_MONTH = 'sprinkle_selected_month';
const STORAGE_LOOKER_VERSION = 'sprinkle_full_sheets69_reset_v2';
const LOOKER_CLEAN_VERSION = 'sheets69_full_v2';
const STORAGE_LAST_AUTO_SYNC = 'sprinkle_last_auto_sync_ts';
export const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

// In-memory cache & active sync lock
let customMonthsCache = null;
let isInitialized = false;
let activeWorkbookSyncPromise = null;

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
 * Returns epoch ms timestamp of last successful remote workbook sync (or 0 if never).
 */
export function getLastAutoSyncTime() {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_AUTO_SYNC);
    const val = parseInt(raw || '0', 10);
    return Number.isFinite(val) ? val : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Checks whether enough time has passed since the last sync to re-fetch Google Sheets automatically.
 */
export function shouldAutoSync(cooldownMs = AUTO_SYNC_COOLDOWN_MS) {
  const last = getLastAutoSyncTime();
  return !last || (Date.now() - last) >= cooldownMs;
}

/**
 * Safely persists custom months into localStorage if size allows; if 5MB quota is exceeded,
 * falls back to keeping newest / non-preloaded months first while IndexedDB keeps all months.
 */
function trySyncToLocalStorage(monthsObj) {
  try {
    localStorage.setItem(STORAGE_CUSTOM_MONTHS, JSON.stringify(monthsObj));
  } catch (err) {
    try {
      // Prioritize newest months (e.g. 10-2569..12-2569) so startup stays instant before IndexedDB resolves
      const sortedKeys = Object.keys(monthsObj).sort().reverse();
      const partial = {};
      for (const k of sortedKeys) {
        partial[k] = monthsObj[k];
        const serialized = JSON.stringify(partial);
        if (serialized.length > 2_500_000) {
          delete partial[k];
          break;
        }
      }
      localStorage.setItem(STORAGE_CUSTOM_MONTHS, JSON.stringify(partial));
    } catch (e2) {
      console.info('LocalStorage quota exceeded (5MB limit). Data is securely persisted in IndexedDB.');
    }
  }
}

function getLatestPreloadedKey() {
  const keys = Object.keys(PRELOADED_MONTHS).sort();
  return keys[keys.length - 1] || '2569-09';
}

/**
 * Removes all previously cached/uploaded monthly & daily datasets from IndexedDB and localStorage
 * so only the clean Looker 69 dataset remains.
 */
export async function clearAndResetToLookerMonths({ dispatch = true } = {}) {
  try {
    const idbMonths = await idbGetAllMonths();
    if (idbMonths) {
      for (const key of Object.keys(idbMonths)) {
        await idbDeleteMonth(key);
      }
    }
  } catch (err) {
    console.warn('Error clearing IDB custom months:', err);
  }

  customMonthsCache = {};
  localStorage.removeItem(STORAGE_CUSTOM_MONTHS);
  localStorage.removeItem('sprinkle_current_data');
  localStorage.removeItem('sprinkle_daily_history');
  localStorage.removeItem('sprinkle_looker_clean_reset_v1');
  localStorage.removeItem(STORAGE_LAST_AUTO_SYNC);
  const latestKey = getLatestPreloadedKey();
  localStorage.setItem(STORAGE_SELECTED_MONTH, latestKey);
  localStorage.setItem(STORAGE_LOOKER_VERSION, LOOKER_CLEAN_VERSION);

  if (dispatch) {
    window.dispatchEvent(new Event('sprinkle_months_updated'));
  }
  return latestKey;
}

/**
 * Initialize storage on app startup:
 * 1. Performs a one-time clean reset of old cached months on upgrade to Looker 69
 * 2. Loads custom/synced months from IndexedDB into memory cache
 * 3. Migrates any localStorage items to IndexedDB
 */
export async function initStorage() {
  getCustomMonths();

  try {
    let hasUpdates = false;

    if (localStorage.getItem(STORAGE_LOOKER_VERSION) !== LOOKER_CLEAN_VERSION) {
      await clearAndResetToLookerMonths({ dispatch: false });
      hasUpdates = true;
    } else {
      const idbMonths = await idbGetAllMonths();

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
    }

    isInitialized = true;
    const prevSaved = localStorage.getItem(STORAGE_SELECTED_MONTH);
    const resolvedSelected = getSelectedMonthKey();
    if (prevSaved !== resolvedSelected) {
      hasUpdates = true;
    }
    if (hasUpdates) {
      window.dispatchEvent(new Event('sprinkle_months_updated'));
    }
    return true;
  } catch (err) {
    console.warn('initStorage failed:', err);
    return false;
  }
}

/**
 * Syncs all months parsed from the live Looker 69 CSV export into storage + IndexedDB.
 */
export async function syncLookerMonthsToStorage(lookerCsvText) {
  const monthsMap = splitLookerCsvByMonth(lookerCsvText);
  const syncedKeys = Object.keys(monthsMap).sort();
  if (syncedKeys.length === 0) {
    return { syncedKeys: [], monthsMap: {} };
  }

  const customMonths = getCustomMonths();
  const now = new Date().toISOString();

  for (const key of syncedKeys) {
    const item = monthsMap[key];
    const monthObj = {
      key,
      label: item.label,
      gid: LOOKER_GID,
      source: 'looker69',
      isLooker: true,
      csv: item.csv,
      uploadedAt: now,
      note: `ข้อมูลครบทั้ง ${item.branches.length} สาขา จาก Looker 69 (${item.vehicleCount} คัน, รางวัลรวม ฿${item.totalReward.toLocaleString()})`
    };
    customMonths[key] = monthObj;
    await idbSaveMonth(monthObj);
  }

  customMonthsCache = customMonths;
  trySyncToLocalStorage(customMonths);
  localStorage.setItem(STORAGE_LOOKER_VERSION, LOOKER_CLEAN_VERSION);

  const latestSyncedKey = syncedKeys[syncedKeys.length - 1];
  const currentSelected = getSelectedMonthKey();
  if (!syncedKeys.includes(currentSelected) && latestSyncedKey) {
    setSelectedMonthKey(latestSyncedKey);
  }

  window.dispatchEvent(new Event('sprinkle_months_updated'));
  return { syncedKeys, monthsMap };
}

/**
 * Syncs all detailed monthly sheets (`01-2569` .. `12-2569`+) parsed from an XLSX ArrayBuffer
 * of the master Google Sheet into IndexedDB / storage, skipping duplicates identical to PRELOADED_MONTHS
 * and automatically selecting newly added future months.
 */
export async function syncWorkbookMonthsToStorage(arrayBuffer, { autoSelectNew = true } = {}) {
  const monthsMap = extractMonthlySheetsFromBuffer(arrayBuffer);
  const syncedKeys = Object.keys(monthsMap).sort();
  if (syncedKeys.length === 0) {
    return { syncedKeys: [], addedKeys: [], updatedKeys: [], hasChanges: false, monthsMap: {}, syncedAt: Date.now() };
  }

  const beforeKeys = new Set(getAllMonths().map(m => m.key));
  const prevLatest = getAllMonths()[0]?.key || '';
  const customMonths = { ...getCustomMonths() };
  const nowIso = new Date().toISOString();
  const addedKeys = [];
  const updatedKeys = [];
  let customModified = false;

  for (const key of syncedKeys) {
    const item = monthsMap[key];
    const preloadedCsv = PRELOADED_MONTHS[key]?.csv;
    const existingCustom = customMonths[key];
    const effectivePrevCsv = existingCustom?.csv || preloadedCsv || '';

    if (!beforeKeys.has(key)) {
      addedKeys.push(key);
    } else if (effectivePrevCsv !== item.csv) {
      updatedKeys.push(key);
    }

    if (preloadedCsv && item.csv === preloadedCsv) {
      // Matches bundled preloaded month byte-for-byte; remove any stale custom override
      if (existingCustom) {
        delete customMonths[key];
        await idbDeleteMonth(key);
        customModified = true;
      }
      continue;
    }

    if (!existingCustom || existingCustom.csv !== item.csv) {
      const monthObj = {
        key,
        label: item.label,
        sheetName: item.sheetName,
        spreadsheetId: MASTER_SPREADSHEET_ID,
        source: 'sheets_01_09',
        csv: item.csv,
        uploadedAt: nowIso,
        note: `ข้อมูลครบทั้ง ${item.branches.length} สาขา จากแผ่นงาน ${item.sheetName} (${item.vehicleCount} คัน, รางวัลรวม ฿${item.totalReward.toLocaleString()})`
      };
      customMonths[key] = monthObj;
      await idbSaveMonth(monthObj);
      customModified = true;
    }
  }

  if (customModified) {
    customMonthsCache = customMonths;
    trySyncToLocalStorage(customMonths);
  }

  const syncedAt = Date.now();
  localStorage.setItem(STORAGE_LOOKER_VERSION, LOOKER_CLEAN_VERSION);
  localStorage.setItem(STORAGE_LAST_AUTO_SYNC, String(syncedAt));

  const latestSyncedKey = syncedKeys[syncedKeys.length - 1];
  const currentSelected = getSelectedMonthKey();
  const newestAddedKey = addedKeys.length > 0 ? addedKeys[addedKeys.length - 1] : '';

  if (newestAddedKey && autoSelectNew && (!syncedKeys.includes(currentSelected) || currentSelected === prevLatest || newestAddedKey > currentSelected)) {
    setSelectedMonthKey(newestAddedKey);
  } else if (!syncedKeys.includes(currentSelected) && latestSyncedKey) {
    setSelectedMonthKey(latestSyncedKey);
  }

  const hasChanges = addedKeys.length > 0 || updatedKeys.length > 0 || customModified;
  if (hasChanges) {
    window.dispatchEvent(new Event('sprinkle_months_updated'));
  }

  return { syncedKeys, addedKeys, updatedKeys, hasChanges, monthsMap, syncedAt };
}

/**
 * Fetches the live Google Sheet `.xlsx` workbook and syncs all monthly tabs (`01-2569`..`12-2569`+).
 * Coalesces concurrent calls and honors the cooldown unless `force: true`.
 */
export async function syncMasterWorkbookFromRemote({ force = false, maxAgeMs = AUTO_SYNC_COOLDOWN_MS, autoSelectNew = true } = {}) {
  if (!force && !shouldAutoSync(maxAgeMs)) {
    return {
      skipped: true,
      syncedKeys: getAllMonths().map(m => m.key).sort(),
      addedKeys: [],
      updatedKeys: [],
      hasChanges: false,
      syncedAt: getLastAutoSyncTime()
    };
  }

  if (activeWorkbookSyncPromise) {
    return activeWorkbookSyncPromise;
  }

  activeWorkbookSyncPromise = (async () => {
    const res = await fetch(`${MASTER_XLSX_URL}&_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const result = await syncWorkbookMonthsToStorage(buffer, { autoSelectNew });
    return { ...result, skipped: false };
  })();

  try {
    return await activeWorkbookSyncPromise;
  } finally {
    activeWorkbookSyncPromise = null;
  }
}

// Get list of all available months (Preloaded 01-2569..09-2569 + User uploaded/synced)
export function getAllMonths() {
  const customMonths = getCustomMonths();

  // Combine preloaded Looker 69 months and synced/custom updates
  const all = { ...PRELOADED_MONTHS, ...customMonths };

  // Normalize and clean each month
  const monthMap = new Map();
  Object.keys(all).forEach(k => {
    const item = all[k];
    if (!item || !item.csv) return;
    const rawKey = String(item.key || k);
    // Ignore internal cache keys that do not represent monthly delivery tables
    if (rawKey.startsWith('sprinkle_') || rawKey.includes('sync_time')) return;

    const normKey = normalizeMonthKey(rawKey);
    const cleanLabel = formatThaiMonthLabel(item.label || rawKey);
    monthMap.set(normKey, {
      ...item,
      key: normKey,
      label: cleanLabel
    });
  });

  // Sort descending chronologically (e.g. 2569-09, 2569-08, ..., 2569-01)
  const sorted = Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  return sorted;
}

export function getMonthData(monthKey) {
  const latestKey = getLatestPreloadedKey();
  if (!monthKey || String(monthKey).startsWith('sprinkle_') || String(monthKey).includes('sync_time')) {
    return getMonthData(latestKey);
  }

  const normKey = normalizeMonthKey(monthKey);
  const customMonths = getCustomMonths();
  if (customMonths[normKey] && customMonths[normKey].csv) return customMonths[normKey];
  if (customMonths[monthKey] && customMonths[monthKey].csv) return customMonths[monthKey];

  if (PRELOADED_MONTHS[normKey] && PRELOADED_MONTHS[normKey].csv) return PRELOADED_MONTHS[normKey];
  if (PRELOADED_MONTHS[monthKey] && PRELOADED_MONTHS[monthKey].csv) return PRELOADED_MONTHS[monthKey];

  // Fallback to latest valid month
  const all = getAllMonths();
  return all.find(m => m && m.csv) || all[0] || null;
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
    let hasBadKeys = false;
    Object.keys(parsed).forEach(k => {
      const item = parsed[k];
      if (!item) return;
      const rawKey = String(item.key || k);
      if (rawKey.startsWith('sprinkle_') || rawKey.includes('sync_time') || !item.csv) {
        hasBadKeys = true;
        return;
      }
      const normKey = normalizeMonthKey(rawKey);
      const cleanLabel = formatThaiMonthLabel(item.label || rawKey);

      sanitized[normKey] = {
        ...item,
        key: normKey,
        label: cleanLabel
      };
    });

    if (hasBadKeys) {
      trySyncToLocalStorage(sanitized);
    }

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

    const existingIsLooker = isLookerFormat(existingRows);
    const newIsLooker = isLookerFormat(newRows);

    if (existingIsLooker !== newIsLooker) {
      // Replace incompatible legacy format only when uploading fresh Looker data; avoid mixing 170-col rows into 49-col headers
      if (newIsLooker) {
        return saveNewMonth(normKey, cleanLabel, branchCsv, note);
      }
      console.warn('Cannot merge 170-col rows directly into 49-col Looker month without replacing schema.');
      return null;
    }

    let combinedRows = [];
    let branchesFound = [];

    if (existingIsLooker && newIsLooker) {
      const col = buildLookerColMap(existingRows[0]);
      const newCol = buildLookerColMap(newRows[0]);
      const vehicleMap = new Map();

      const validRow = (r, cIdx) => {
        const car = (r?.[cIdx] || '').toString().trim();
        return Boolean(car);
      };

      existingRows.slice(1).filter(r => validRow(r, col.carCode)).forEach(r => {
        const key = `${(r[col.branch] || '').toString().trim()}_${(r[col.carCode] || '').toString().trim()}`;
        vehicleMap.set(key, r);
      });

      newRows.slice(1).filter(r => validRow(r, newCol.carCode)).forEach(r => {
        const key = `${(r[newCol.branch] || '').toString().trim()}_${(r[newCol.carCode] || '').toString().trim()}`;
        vehicleMap.set(key, r);
      });

      combinedRows = [existingRows[0], ...Array.from(vehicleMap.values())];
      branchesFound = Array.from(new Set(Array.from(vehicleMap.values()).map(r => (r[col.branch] || '').toString().trim()).filter(Boolean)));
    } else {
      // Full 170-col merge (normalize raw sheet numbering/No1/No2 headers if present)
      const normExisting = normalizeDetailedSheetRows(existingRows);
      const normNew = normalizeDetailedSheetRows(newRows);
      const rawHeaderRows = normExisting.length >= 3 ? normExisting.slice(0, 3) : normNew.slice(0, 3);
      const headerRows = rawHeaderRows.map(r => trimRowColumns(r));

      const sliceBeforeSummary = (rowsArr) => {
        const out = [];
        for (let i = 3; i < rowsArr.length; i++) {
          const r = rowsArr[i];
          if (!r) continue;
          const col8 = String(r[8] || '').trim().toLowerCase();
          if (col8 === 'sum' || col8.includes('ข้อมูลจาก link') || col8.includes('รวม')) break;
          const c = (r[3] || '').toString().trim();
          if (c && c.length >= 3 && !isNaN(parseInt(c[0], 10))) {
            out.push(r);
          }
        }
        return out;
      };

      const existingVehicles = sliceBeforeSummary(normExisting);
      const newVehicles = sliceBeforeSummary(normNew);

      const vehicleKey = (r) => `${(r[0] || '').toString().trim()}_${(r[3] || '').toString().trim()}`;
      const vehicleMap = new Map();

      existingVehicles.forEach(r => {
        vehicleMap.set(vehicleKey(r), trimRowColumns(r));
      });

      newVehicles.forEach(r => {
        vehicleMap.set(vehicleKey(r), trimRowColumns(r));
      });

      combinedRows = [
        ...headerRows,
        ...Array.from(vehicleMap.values())
      ];
      branchesFound = Array.from(new Set(Array.from(vehicleMap.values()).map(r => (r[0] || '').toString().trim()).filter(Boolean)));
    }

    const mergedCsv = Papa.unparse(combinedRows, { newline: '\r\n' });

    const customMonths = getCustomMonths();
    const monthObj = {
      key: normKey,
      label: cleanLabel,
      isLooker: existingIsLooker,
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
  if (!csvText || typeof csvText !== 'string') return { count: 0, branches: [], totalReward: 0 };
  try {
    const parsed = Papa.parse(csvText, { skipEmptyLines: false });
    const rows = parsed.data || [];

    if (isLookerFormat(rows)) {
      const col = buildLookerColMap(rows[0]);
      const vehicles = rows.slice(1).filter(r => r && String(r[col.carCode] || '').trim().length > 0);
      const branches = Array.from(new Set(vehicles.map(r => String(r[col.branch] || '').trim()).filter(Boolean))).sort();
      let totalReward = 0;
      vehicles.forEach(r => {
        const val = parseFloat(String(r[col.totalReward] || '0').replace(/,/g, '').trim());
        if (!isNaN(val)) totalReward += val;
      });
      return {
        count: vehicles.length,
        branches,
        totalReward
      };
    }

    const normRows = normalizeDetailedSheetRows(rows);
    const vehicles = [];
    for (let i = 3; i < normRows.length; i++) {
      const r = normRows[i];
      if (!r) continue;
      const col8 = String(r[8] || '').trim().toLowerCase();
      if (col8 === 'sum' || col8.includes('ข้อมูลจาก link') || col8.includes('รวม')) break;
      const c = (r[3] || '').toString().trim();
      if (c && c.length >= 3 && !isNaN(parseInt(c[0], 10))) {
        vehicles.push(r);
      }
    }
    const branches = Array.from(new Set(vehicles.map(r => (r[0] || '').toString().trim()).filter(Boolean))).sort();

    // Total reward column from row 2 ('รวมเงินรางวัล')
    let totalReward = 0;
    const h2 = normRows[2] || [];
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
  const saved = localStorage.getItem(STORAGE_SELECTED_MONTH);
  // Before async IndexedDB hydration finishes, preserve valid YYYY-MM selection (e.g. 2569-10..2569-12)
  if (!isInitialized && saved && /^25\d{2}-\d{2}$/.test(saved)) {
    return saved;
  }
  const all = getAllMonths();
  const validKeys = new Set(all.map(m => m.key));
  if (!saved || saved.startsWith('sprinkle_') || saved.includes('sync_time') || (validKeys.size > 0 && !validKeys.has(saved))) {
    const fallback = all[0]?.key || getLatestPreloadedKey();
    localStorage.setItem(STORAGE_SELECTED_MONTH, fallback);
    return fallback;
  }
  return saved;
}

export function setSelectedMonthKey(key) {
  localStorage.setItem(STORAGE_SELECTED_MONTH, key);
}
