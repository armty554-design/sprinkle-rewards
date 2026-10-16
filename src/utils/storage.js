// Storage manager for daily updates, snapshots and custom edits

const STORAGE_KEY_CURRENT = 'sprinkle_current_data';
const STORAGE_KEY_HISTORY = 'sprinkle_daily_history';

export function saveCurrentData(csvText, metadata = {}) {
  try {
    const entry = {
      id: 'snapshot_' + Date.now(),
      date: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      source: metadata.source || 'ไฟล์อัปโหลด',
      note: metadata.note || 'อัปเดตประจำวัน',
      csvText
    };

    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(entry));

    // Append to history list
    const history = getDailyHistory();
    // Add to front, keep last 30 daily snapshots
    const updatedHistory = [entry, ...history.filter(h => h.id !== entry.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

    return entry;
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    return null;
  }
}

export function getCurrentData() {
  try {
    const val = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!val) return null;
    return JSON.parse(val);
  } catch (err) {
    return null;
  }
}

export function getDailyHistory() {
  try {
    const val = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!val) return [];
    return JSON.parse(val);
  } catch (err) {
    return [];
  }
}

export function deleteSnapshot(id) {
  try {
    const history = getDailyHistory().filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    return history;
  } catch (err) {
    return [];
  }
}
