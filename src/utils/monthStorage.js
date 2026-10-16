// Month data manager supporting preloaded historical months and user-uploaded new months
import { PRELOADED_MONTHS } from '../data/allMonthsData.js';

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
    return customMonths[monthKey];
  } catch (err) {
    console.error('Failed to save new month:', err);
    return null;
  }
}

export function deleteCustomMonth(monthKey) {
  try {
    const customMonths = getCustomMonths();
    delete customMonths[monthKey];
    localStorage.setItem(STORAGE_CUSTOM_MONTHS, JSON.stringify(customMonths));
    return true;
  } catch (err) {
    return false;
  }
}

export function getSelectedMonthKey() {
  return localStorage.getItem(STORAGE_SELECTED_MONTH) || '2569-09';
}

export function setSelectedMonthKey(key) {
  localStorage.setItem(STORAGE_SELECTED_MONTH, key);
}
