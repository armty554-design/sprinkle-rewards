// Month data manager supporting preloaded historical months and user-uploaded new months
import { PRELOADED_MONTHS } from '../data/allMonthsData.js';
import Papa from 'papaparse';

const STORAGE_CUSTOM_MONTHS = 'sprinkle_custom_months';
const STORAGE_SELECTED_MONTH = 'sprinkle_selected_month';

// Get list of all available months (Preloaded + User uploaded)
export function getAllMonths() {
  const customMonths = getCustomMonths();
  
  // Combine preloaded and custom
  const all = { ...PRELOADED_MONTHS, ...customMonths };
  
  // Sort descending by month key (e.g. 2569-09, 2569-08, ...)
  const sortedKeys = Object.keys(all).sort().reverse();
  
  return sortedKeys.map(key => all[key]);
}

export function getMonthData(monthKey) {
  const customMonths = getCustomMonths();
  if (customMonths[monthKey]) return customMonths[monthKey];
  if (PRELOADED_MONTHS[monthKey]) return PRELOADED_MONTHS[monthKey];
  
  // Fallback to latest
  const all = getAllMonths();
  return all[0] || null;
}

export function getCustomMonths() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_MONTHS);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

export function saveNewMonth(monthKey, label, csvText, note = '') {
  try {
    const customMonths = getCustomMonths();
    customMonths[monthKey] = {
      key: monthKey,
      label: label || monthKey,
      csv: csvText,
      uploadedAt: new Date().toISOString(),
      note: note || 'อัปโหลดโดยผู้ใช้'
    };
    localStorage.setItem(STORAGE_CUSTOM_MONTHS, JSON.stringify(customMonths));
    setSelectedMonthKey(monthKey);
    window.dispatchEvent(new Event('sprinkle_months_updated'));
    return customMonths[monthKey];
  } catch (err) {
    console.error('Failed to save new month:', err);
    return null;
  }
}

/**
 * Merge a branch's CSV records into an existing month (e.g. merge Bangplee into 2569-09 that already has Ramintra)
 * Prevents duplicate cars within the same branch and preserves all existing branch data.
 */
export function mergeBranchIntoMonth(monthKey, branchCsv, label = '', note = '') {
  try {
    const existingMonth = getMonthData(monthKey);
    if (!existingMonth || !existingMonth.csv) {
      return saveNewMonth(monthKey, label || monthKey, branchCsv, note);
    }

    const existingParsed = Papa.parse(existingMonth.csv, { skipEmptyLines: false });
    const newParsed = Papa.parse(branchCsv, { skipEmptyLines: false });

    const existingRows = existingParsed.data || [];
    const newRows = newParsed.data || [];

    // Use headers from existing or new
    const headerRows = existingRows.length >= 3 ? existingRows.slice(0, 3) : newRows.slice(0, 3);

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
      vehicleMap.set(vehicleKey(r), r);
    });

    newVehicles.forEach(r => {
      vehicleMap.set(vehicleKey(r), r);
    });

    const combinedRows = [
      ...headerRows,
      ...Array.from(vehicleMap.values())
    ];

    const mergedCsv = Papa.unparse(combinedRows);
    const branchesFound = Array.from(new Set(Array.from(vehicleMap.values()).map(r => (r[0] || '').toString().trim()).filter(Boolean)));

    const customMonths = getCustomMonths();
    customMonths[monthKey] = {
      key: monthKey,
      label: label || existingMonth.label || monthKey,
      csv: mergedCsv,
      uploadedAt: new Date().toISOString(),
      note: note || `รวมข้อมูลสาขา (${branchesFound.join(', ')}) เรียบร้อย`
    };

    localStorage.setItem(STORAGE_CUSTOM_MONTHS, JSON.stringify(customMonths));
    setSelectedMonthKey(monthKey);
    window.dispatchEvent(new Event('sprinkle_months_updated'));
    return customMonths[monthKey];
  } catch (err) {
    console.error('Failed to merge branch into month:', err);
    return null;
  }
}

export function deleteCustomMonth(monthKey) {
  try {
    const customMonths = getCustomMonths();
    delete customMonths[monthKey];
    localStorage.setItem(STORAGE_CUSTOM_MONTHS, JSON.stringify(customMonths));
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
