import { parseCSVData, cleanNum, cleanText } from './parser.js';

export const KPI_GROUPS = [
  { id: 'g1', label: 'กลุ่ม 1 จัดส่ง', fullLabel: '1. กลุ่มงานจัดส่ง', color: '#0284c7', badgeBg: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'g2', label: 'กลุ่ม 2 บริการ', fullLabel: '2. กลุ่มงานบริการ', color: '#10b981', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'g3', label: 'กลุ่ม 3 เอกสารฯ', fullLabel: '3. กลุ่มงานเอกสารและผลิตภัณฑ์', color: '#8b5cf6', badgeBg: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'g4', label: 'กลุ่ม 4 ภาพลักษณ์', fullLabel: '4. กลุ่มงานภาพลักษณ์แบรนด์', color: '#f59e0b', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'g5', label: 'กลุ่ม 5 พิเศษ/วินัย', fullLabel: '5. คะแนนพิเศษและวินัย', color: '#475569', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const KPI_METRICS = [
  // Group 1 (9)
  { key: '1.1', itemCode: '1.1', group: 'g1', shortLabel: '1.1 ตรงเวลา', label: 'จัดส่งตรงเวลา', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 25 คะแนน', stdLine: 85, blueLine: 95 },
  { key: '1.2', itemCode: '1.2', group: 'g1', shortLabel: '1.2 ตกรอบสุทธิ', label: 'ตกรอบส่งสุทธิ', unit: '%', kind: 'percent_low', agg: 'avg', targetHint: '0% เต็ม 25', stdLine: 1, blueLine: 0 },
  { key: '1.3', itemCode: '1.3', group: 'g1', shortLabel: '1.3 ร้องเรียน 01', label: 'ข้อร้องเรียน 01', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'delivery', targetHint: '0 ครั้ง' },
  { key: '1.4.1', itemCode: '1.4', subField: 'rawResult1', group: 'g1', shortLabel: '1.4.1 001 ไม่ครบ', label: '001 ส่งไม่ครบตามจำนวน', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'delivery', targetHint: '0 ครั้ง' },
  { key: '1.4.2', itemCode: '1.4', subField: 'rawResult2', group: 'g1', shortLabel: '1.4.2 38 ไม่ตรงจริง', label: '38 ทำรายการจัดส่งไม่ตรงความเป็นจริง', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'delivery', targetHint: '0 ครั้ง' },
  { key: '1.5', itemCode: '1.5', group: 'g1', shortLabel: '1.5 GPS 100 ม.', label: 'GPS ไม่เกิน 100 เมตร', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 15 คะแนน', stdLine: 97.25, blueLine: 100 },
  { key: '1.6', itemCode: '1.6', group: 'g1', shortLabel: '1.6 ตกรอบซ้ำ', label: 'ตกรอบส่งซ้ำ', unit: '%', kind: 'percent_low', agg: 'avg', targetHint: '0% เต็ม 10', stdLine: 0.5, blueLine: 0 },
  { key: '1.7', itemCode: '1.7', group: 'g1', shortLabel: '1.7 ส่งด่วน 3 วัน', label: 'ส่งด่วน 3 วัน', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 10 คะแนน', stdLine: 90, blueLine: 100 },
  { key: '1.8', itemCode: '1.8', group: 'g1', shortLabel: '1.8 ประเภทน้ำ', label: 'ประเภทการรับน้ำ', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 15 คะแนน', stdLine: 97.25, blueLine: 100 },

  // Group 2 (8)
  { key: '2.1', itemCode: '2.1', group: 'g2', shortLabel: '2.1 นัดหมาย', label: 'จัดส่งตรงเวลานัดหมาย', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 30 คะแนน', stdLine: 90, blueLine: 100 },
  { key: '2.2', itemCode: '2.2', group: 'g2', shortLabel: '2.2 01 เป็นเท็จ', label: 'ข้อร้องเรียน 01 ที่เป็นเท็จ', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'service_brand', targetHint: '0 ครั้ง' },
  { key: '2.3', itemCode: '2.3', group: 'g2', shortLabel: '2.3 ยกเลิกบริการ', label: 'สมาชิกยกเลิกเนื่องจากบริการ', unit: 'ราย', kind: 'count_zero', agg: 'sum', caseCategory: 'service_brand', targetHint: '0 ราย' },
  { key: '2.4', itemCode: '2.4', group: 'g2', shortLabel: '2.4 คำชมสมาชิกใหม่', label: 'คำชมสมาชิกใหม่', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 15 คะแนน', stdLine: 85, blueLine: 100 },
  { key: '2.5', itemCode: '2.5', group: 'g2', shortLabel: '2.5 พึงพอใจหลังส่ง', label: 'ความพึงพอใจหลังการจัดส่ง', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 15 คะแนน', stdLine: 95, blueLine: 100 },
  { key: '2.6', itemCode: '2.6', group: 'g2', shortLabel: '2.6 เสริมน้ำ 02', label: 'เสริมน้ำนอกรอบ 02', unit: 'รายการ', kind: 'bonus_count', agg: 'sum', targetHint: 'คะแนนเสริม' },
  { key: '2.7', itemCode: '2.7', group: 'g2', shortLabel: '2.7 นอกพื้นที่ 01', label: 'เสริมน้ำนอกพื้นที่ 01', unit: 'รายการ', kind: 'bonus_count', agg: 'sum', targetHint: 'คะแนนเสริม' },
  { key: '2.8', itemCode: '2.8', group: 'g2', shortLabel: '2.8 ย้ายรอบถาวร', label: 'ติดตามการจัดส่งหลังย้ายรอบถาวร', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'ไม่ถูกหักคะแนน', stdLine: 90, blueLine: 100 },

  // Group 3 (10)
  { key: '3.1', itemCode: '3.1', group: 'g3', shortLabel: '3.1 คูปอง Prepaid', label: 'จัดส่งคูปองพร้อมเก็บเงิน (Prepaid)', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 30 คะแนน', stdLine: 95, blueLine: 100 },
  { key: '3.2', itemCode: '3.2', group: 'g3', shortLabel: '3.2 ผิดขั้นตอน spd', label: 'ทำรายการผิดขั้นตอน (spd)', unit: 'รายการ', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0–1 รายการเต็ม' },
  { key: '3.3', itemCode: '3.3', group: 'g3', shortLabel: '3.3 คูปองค้าง >7วัน', label: 'เก็บคูปองค้างเก่าเกิน 7 วัน', unit: 'รายการ', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0–1 รายการเต็ม' },
  { key: '3.4', itemCode: '3.4', group: 'g3', shortLabel: '3.4 เก็บเงิน Postpaid', label: 'เก็บเงินตรงรอบฝากเก็บ (Postpaid)', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: 'เต็ม 10 คะแนน', stdLine: 95, blueLine: 100 },
  { key: '3.5', itemCode: '3.5', group: 'g3', shortLabel: '3.5 คืนตัวอย่างน้ำ', label: 'รับคืนตัวอย่างคุณภาพน้ำ', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0 ครั้ง' },
  { key: '3.6.1', itemCode: '3.6', subField: 'cleanable', group: 'g3', shortLabel: '3.6.1 ปลอมปน(ได้)', label: 'สิ่งปลอมปน — กำจัดได้', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0 ครั้ง' },
  { key: '3.6.2', itemCode: '3.6', subField: 'uncleanable', group: 'g3', shortLabel: '3.6.2 ปลอมปน(ไม่ได้)', label: 'สิ่งปลอมปน — กำจัดไม่ได้', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0 ครั้ง' },
  { key: '3.6.3', itemCode: '3.6', subField: 'uncooperative', group: 'g3', shortLabel: '3.6.3 ไม่ร่วมมือ', label: 'สิ่งปลอมปน — ไม่ให้ความร่วมมือ', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0 ครั้ง' },
  { key: '3.7', itemCode: '3.7', group: 'g3', shortLabel: '3.7 ปฏิเสธคูปอง 11', label: 'สมาชิกปฏิเสธรับคูปอง (หัวข้อ 11)', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0 ครั้ง' },
  { key: '3.8', itemCode: '3.8', group: 'g3', shortLabel: '3.8 ร้องไม่มีคูปอง', label: 'สมาชิกร้องเรียนเรื่องไม่มีคูปอง', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'doc', targetHint: '0 ครั้ง' },

  // Group 4 (7)
  { key: '4.1', itemCode: '4.1', group: 'g4', shortLabel: '4.1 ความสะอาดรถ', label: 'ความสะอาดของรถจัดส่งสินค้า', unit: 'ระดับ', kind: 'grade', agg: 'avg', targetHint: 'ดีมาก / ผ่าน' },
  { key: '4.2', itemCode: '4.2', group: 'g4', shortLabel: '4.2 ความพร้อมรถ', label: 'ความพร้อมของรถจัดส่งสินค้า', unit: 'ระดับ', kind: 'grade', agg: 'avg', targetHint: 'ดีมาก / ผ่าน' },
  { key: '4.3', itemCode: '4.3', group: 'g4', shortLabel: '4.3 การแต่งกาย', label: 'การแต่งกายถูกต้องตามระเบียบ', unit: 'ระดับ', kind: 'grade', agg: 'avg', targetHint: 'ดีมาก / ผ่าน' },
  { key: '4.4', itemCode: '4.4', group: 'g4', shortLabel: '4.4 พฤติกรรม 36/05', label: 'ข้อร้องเรียนพฤติกรรม (36, 05)', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'service_brand', targetHint: '0 ครั้ง' },
  { key: '4.5', itemCode: '4.5', group: 'g4', shortLabel: '4.5 ค่าเสียหาย 94', label: 'ข้อร้องเรียนเรียกร้องค่าเสียหาย (94)', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'service_brand', targetHint: '0 ครั้ง' },
  { key: '4.6', itemCode: '4.6', group: 'g4', shortLabel: '4.6 ไม่คืนน้ำในวัน', label: 'ไม่กลับมาคืนน้ำภายในวัน (6 สาเหตุ)', unit: 'ครั้ง', kind: 'count_zero', agg: 'sum', caseCategory: 'service_brand', targetHint: '0 ครั้ง' },
  { key: '4.7', itemCode: '4.7', group: 'g4', shortLabel: '4.7 ขับขี่ปลอดภัย', label: 'ขับขี่ปลอดภัยและการเกิดอุบัติเหตุ', unit: '%', kind: 'percent_high', agg: 'avg', targetHint: '100% เต็ม 15', stdLine: 85, blueLine: 100 },

  // Group 5 (2)
  { key: '5.1', itemCode: '5.1', group: 'g5', shortLabel: '5.1 หาสมาชิกใหม่', label: 'หาสมาชิกใหม่', unit: 'ราย', kind: 'bonus_count', agg: 'sum', targetHint: '1 ราย +5, ≥2 ราย +10' },
  { key: '5.2', itemCode: '5.2', group: 'g5', shortLabel: '5.2 หนังสือเตือน', label: 'หนังสือเตือน', unit: 'ใบ', kind: 'count_zero', agg: 'sum', caseCategory: 'service_brand', targetHint: '0 ใบ' },
];

export const VOLUME_METRIC = {
  key: 'VOLUME',
  itemCode: 'VOLUME',
  group: 'volume',
  shortLabel: 'ยอดส่งจริง (ถัง)',
  label: 'จำนวนยอดส่งจริง (ถัง)',
  unit: 'ถัง',
  kind: 'volume',
  agg: 'sum',
  targetHint: 'เกณฑ์ ≥ 3,000 ถัง',
  stdLine: 3000,
};

export const METRIC_BY_KEY = {
  ...Object.fromEntries(KPI_METRICS.map((m) => [m.key, m])),
  VOLUME: VOLUME_METRIC,
};

function isMissingResultText(rawStr) {
  const s = cleanText(rawStr)
    .replace(/%|ครั้ง|รายการ|ราย|ใบ/g, '')
    .trim()
    .toLowerCase();
  return !s || s === 'ไม่มี' || s === 'none' || s === '-' || s === 'n/a' || s === 'null';
}

function parseLeadingNumber(rawStr) {
  const s = cleanText(rawStr).replace(/,/g, '');
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export function formatMetricValue(metric, val, gradeText = null) {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  if (metric.kind === 'grade') {
    if (gradeText) return gradeText;
    return `${val.toFixed(0)}%`;
  }
  if (metric.unit === '%') {
    const rounded = Math.round(val * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(2)}%`;
  }
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

/**
 * Extracts all 36 standard-reward performance ("ผลงาน") metrics for a single parsed vehicle.
 */
export function extractVehicleKpiRow(vehicle) {
  const itemMap = new Map();
  const groups = vehicle?.groups || {};
  for (const gk of ['group1', 'group2', 'group3', 'group4', 'group5']) {
    const items = groups[gk]?.items || [];
    for (const it of items) {
      if (it?.code && !itemMap.has(it.code)) {
        itemMap.set(it.code, it);
      }
    }
  }

  const cells = {};
  let blueCount = 0;
  let greenCount = 0;
  let redCount = 0;
  let validCount = 0;
  let totalCases = 0;
  const casesByCategory = { delivery: 0, doc: 0, service_brand: 0 };

  for (const m of KPI_METRICS) {
    const item = itemMap.get(m.itemCode);
    if (!item) {
      cells[m.key] = { value: null, display: '-', tier: 'neutral', isMissing: true, score: 0, fullScore: 0 };
      continue;
    }

    const fullScore = Number(item.fullScore || 0);
    const score = Number(item.score || 0);

    if (m.subField) {
      const val = cleanNum(item[m.subField]);
      const tier = val === 0 ? 'blue' : 'red';
      cells[m.key] = {
        value: val,
        display: String(val),
        tier,
        isMissing: false,
        score,
        fullScore,
      };
      validCount++;
      if (tier === 'blue') blueCount++;
      if (tier === 'red') redCount++;
      if (m.caseCategory && val > 0) {
        totalCases += val;
        casesByCategory[m.caseCategory] += val;
      }
      continue;
    }

    if (m.kind === 'grade') {
      const raw = cleanText(item.result);
      if (isMissingResultText(raw)) {
        cells[m.key] = { value: null, display: '-', tier: 'neutral', isMissing: true, score, fullScore };
      } else if (raw === 'ดีมาก') {
        cells[m.key] = { value: 100, display: 'ดีมาก', tier: 'blue', isMissing: false, score, fullScore };
        validCount++;
        blueCount++;
      } else if (raw === 'ผ่าน') {
        cells[m.key] = { value: 70, display: 'ผ่าน', tier: 'green', isMissing: false, score, fullScore };
        validCount++;
        greenCount++;
      } else {
        cells[m.key] = { value: 0, display: raw || 'ไม่ผ่าน', tier: 'red', isMissing: false, score, fullScore };
        validCount++;
        redCount++;
      }
      continue;
    }

    const rawText = cleanText(item.result);
    if (isMissingResultText(rawText)) {
      cells[m.key] = { value: null, display: '-', tier: 'neutral', isMissing: true, score, fullScore };
      continue;
    }

    const val = parseLeadingNumber(rawText);
    if (val === null) {
      cells[m.key] = { value: null, display: '-', tier: 'neutral', isMissing: true, score, fullScore };
      continue;
    }

    let tier = 'neutral';
    if (m.kind === 'percent_high') {
      if (fullScore > 0) {
        if (score >= fullScore) tier = 'blue';
        else if (score > 0) tier = 'green';
        else tier = 'red';
      } else {
        // e.g. 2.8 (score <= 0 penalty if failed)
        if (score < 0) tier = 'red';
        else if (val >= 95) tier = 'blue';
        else tier = 'green';
      }
    } else if (m.kind === 'percent_low') {
      if (val === 0 || (fullScore > 0 && score >= fullScore)) tier = 'blue';
      else if (score > 0) tier = 'green';
      else tier = 'red';
    } else if (m.kind === 'count_zero') {
      if (m.key === '3.2' || m.key === '3.3') {
        if (score >= fullScore && fullScore > 0) tier = 'blue';
        else if (score > 0) tier = 'green';
        else tier = 'red';
      } else {
        tier = val === 0 && score >= 0 ? 'blue' : 'red';
      }
      if (m.caseCategory && val > 0) {
        totalCases += val;
        casesByCategory[m.caseCategory] += val;
      }
    } else if (m.kind === 'bonus_count') {
      if (val >= 5 || (m.key === '5.1' && val >= 2)) tier = 'blue';
      else if (val > 0) tier = 'green';
      else tier = 'neutral';
    }

    cells[m.key] = {
      value: val,
      display: formatMetricValue(m, val),
      tier,
      isMissing: false,
      score,
      fullScore,
    };

    if (m.kind !== 'bonus_count') {
      validCount++;
      if (tier === 'blue') blueCount++;
      else if (tier === 'green') greenCount++;
      else if (tier === 'red') redCount++;
    } else if (tier === 'blue') {
      blueCount++;
    }
  }

  const carType = cleanText(vehicle?.general?.carType);
  const carCode = cleanText(vehicle?.general?.carCode);
  const isTruckS = carType.includes('รถ S') || /[SL]/i.test(carCode);
  const zone = cleanText(vehicle?.general?.zone) || 'ไม่ระบุเขต';

  return {
    id: vehicle.id,
    vehicle,
    carCode,
    empId: cleanText(vehicle?.general?.empId),
    fullName: cleanText(vehicle?.general?.fullName),
    branch: cleanText(vehicle?.general?.branch),
    zone,
    carType,
    isTruckS,
    groupNumber: cleanText(vehicle?.general?.groupNumber),
    totalScore: Number(vehicle?.totals?.totalScore || 0),
    totalPercent: Number(vehicle?.totals?.totalPercent || 0),
    totalReward: Number(vehicle?.totals?.totalReward || 0),
    totalDelivered: Number(vehicle?.general?.totalDelivered || 0),
    totalMembers: Number(vehicle?.general?.totalMembers || 0),
    distance: Number(vehicle?.general?.distance || 0),
    qualified: Boolean(vehicle?.general?.qualified),
    cells,
    blueCount,
    greenCount,
    redCount,
    validCount,
    totalCases,
    casesByCategory,
  };
}

/**
 * Computes summary footer row, KPI cards, rankings, defect charts, zone breakdown, and branch rollup.
 */
export function aggregateKpiRows(rows = []) {
  const count = rows.length;
  const totalsRow = {};

  for (const m of KPI_METRICS) {
    let sum = 0;
    let validN = 0;
    let blueN = 0;
    let redN = 0;
    for (const r of rows) {
      const c = r.cells[m.key];
      if (!c || c.isMissing || c.value === null) continue;
      sum += c.value;
      validN++;
      if (c.tier === 'blue') blueN++;
      if (c.tier === 'red') redN++;
    }

    const value = validN === 0 ? null : m.agg === 'avg' ? sum / validN : sum;
    totalsRow[m.key] = {
      value,
      display: formatMetricValue(m, value),
      validN,
      blueN,
      redN,
    };
  }

  const totalReward = rows.reduce((s, r) => s + r.totalReward, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.totalDelivered, 0);
  const avgDelivered = count > 0 ? Math.round(totalDelivered / count) : 0;
  const qualifiedCount = rows.filter((r) => r.qualified || r.totalDelivered >= 3000).length;
  const avgPercent = count > 0 ? rows.reduce((s, r) => s + r.totalPercent, 0) / count : 0;
  const totalCases = rows.reduce((s, r) => s + r.totalCases, 0);
  const highBlueCars = rows.filter((r) => r.blueCount >= 25).length;
  const carsWithCases = rows.filter((r) => r.totalCases > 0).length;
  const carsWithFail = rows.filter((r) => r.redCount > 0).length;

  // Top 5 on-time (1.1)
  const validOnTime = rows.filter((r) => !r.cells['1.1']?.isMissing);
  const top5OnTime = [...validOnTime]
    .sort((a, b) => (b.cells['1.1'].value ?? -1) - (a.cells['1.1'].value ?? -1))
    .slice(0, 5);

  // Urgent improvement: lowest 1.1 or highest redCount
  const urgentCars = [...validOnTime]
    .sort((a, b) => {
      const diff = (a.cells['1.1'].value ?? 999) - (b.cells['1.1'].value ?? 999);
      if (Math.abs(diff) > 0.01) return diff;
      return b.redCount - a.redCount;
    })
    .slice(0, 5);

  // Top 5 overall score + bonus (2.6)
  const top5Overall = [...rows]
    .sort((a, b) => b.totalPercent - a.totalPercent || b.totalReward - a.totalReward)
    .slice(0, 5);

  // Horizontal defect / case breakdown (all real case metrics with sum > 0)
  const caseMetrics = KPI_METRICS.filter((m) => m.caseCategory);
  const caseBreakdown = caseMetrics
    .map((m) => ({
      key: m.key,
      label: m.shortLabel,
      fullLabel: m.label,
      category: m.caseCategory,
      total: totalsRow[m.key]?.value || 0,
      affectedCars: rows.filter((r) => (r.cells[m.key]?.value || 0) > 0).length,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  // Zone / Truck-S grouped comparison for 4 core delivery/service KPIs (1.1, 2.1, 1.5, 1.8)
  const zoneBucketsMap = new Map();
  for (const r of rows) {
    const bucket = r.isTruckS ? 'รถ S' : r.zone;
    if (!zoneBucketsMap.has(bucket)) zoneBucketsMap.set(bucket, []);
    zoneBucketsMap.get(bucket).push(r);
  }
  const zoneOrder = (z) => {
    if (z === 'รถ S') return 99;
    const m = z.match(/\d+/);
    return m ? parseInt(m[0], 10) : 50;
  };
  const zoneComparison = Array.from(zoneBucketsMap.entries())
    .sort((a, b) => zoneOrder(a[0]) - zoneOrder(b[0]))
    .map(([name, list]) => {
      const avgOf = (k) => {
        const vals = list.map((x) => x.cells[k]?.value).filter((v) => v !== null && v !== undefined);
        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      };
      return {
        name,
        count: list.length,
        m11: avgOf('1.1'),
        m21: avgOf('2.1'),
        m15: avgOf('1.5'),
        m18: avgOf('1.8'),
      };
    });

  // Branch-level rollup (used when selectedBranch === 'all' so charts show clean 18-branch comparison)
  const branchMap = new Map();
  for (const r of rows) {
    const b = r.branch || 'ไม่ระบุสาขา';
    if (!branchMap.has(b)) branchMap.set(b, []);
    branchMap.get(b).push(r);
  }
  const branchSummaries = Array.from(branchMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'th'))
    .map(([branchName, list]) => {
      const metrics = {};
      for (const m of KPI_METRICS) {
        const vals = list.map((x) => x.cells[m.key]?.value).filter((v) => v !== null && v !== undefined);
        metrics[m.key] =
          vals.length === 0
            ? null
            : m.agg === 'avg'
            ? vals.reduce((s, v) => s + v, 0) / vals.length
            : vals.reduce((s, v) => s + v, 0);
      }
      return {
        branch: branchName,
        count: list.length,
        totalReward: list.reduce((s, x) => s + x.totalReward, 0),
        totalDelivered: list.reduce((s, x) => s + x.totalDelivered, 0),
        avgDelivered: list.length > 0 ? Math.round(list.reduce((s, x) => s + x.totalDelivered, 0) / list.length) : 0,
        qualifiedCount: list.filter((x) => x.qualified || x.totalDelivered >= 3000).length,
        avgPercent: list.reduce((s, x) => s + x.totalPercent, 0) / Math.max(list.length, 1),
        totalCases: list.reduce((s, x) => s + x.totalCases, 0),
        casesByCategory: {
          delivery: list.reduce((s, x) => s + x.casesByCategory.delivery, 0),
          doc: list.reduce((s, x) => s + x.casesByCategory.doc, 0),
          service_brand: list.reduce((s, x) => s + x.casesByCategory.service_brand, 0),
        },
        metrics,
      };
    });

  return {
    count,
    totalsRow,
    totalReward,
    totalDelivered,
    avgDelivered,
    qualifiedCount,
    avgPercent,
    totalCases,
    highBlueCars,
    carsWithCases,
    carsWithFail,
    top5OnTime,
    urgentCars,
    top5Overall,
    caseBreakdown,
    zoneComparison,
    branchSummaries,
  };
}

// Memoize parsed CSV months for fast Monthly Comparison tab
const parsedMonthCache = new Map();

function getCachedMonthRows(monthObj) {
  if (!monthObj?.csv) return [];
  const cacheKey = `${monthObj.key}_${monthObj.csv.length}`;
  if (parsedMonthCache.has(cacheKey)) {
    return parsedMonthCache.get(cacheKey);
  }
  try {
    const parsed = parseCSVData(monthObj.csv);
    const kpiRows = (parsed.vehicles || []).map(extractVehicleKpiRow);
    parsedMonthCache.set(cacheKey, kpiRows);
    return kpiRows;
  } catch {
    return [];
  }
}

/**
 * Computes chronological monthly KPI trend across all available months for the selected branch & zone.
 */
export function computeMonthlyKpiTrend(allMonthsList = [], selectedBranch = 'all', zoneFilter = 'ALL') {
  const chronological = [...allMonthsList].sort((a, b) => a.key.localeCompare(b.key));
  const series = chronological.map((m) => {
    let rows = getCachedMonthRows(m);
    if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'ALL') {
      rows = rows.filter((r) => r.branch === selectedBranch);
    }
    if (zoneFilter && zoneFilter !== 'ALL') {
      if (zoneFilter === 'รถ S') rows = rows.filter((r) => r.isTruckS);
      else rows = rows.filter((r) => !r.isTruckS && r.zone === zoneFilter);
    }
    const agg = aggregateKpiRows(rows);
    return {
      key: m.key,
      label: m.label,
      shortLabel: m.label.replace(' 2569', '').slice(0, 6),
      count: agg.count,
      m11: agg.totalsRow['1.1']?.value,
      m12: agg.totalsRow['1.2']?.value,
      m15: agg.totalsRow['1.5']?.value,
      m18: agg.totalsRow['1.8']?.value,
      m21: agg.totalsRow['2.1']?.value,
      m31: agg.totalsRow['3.1']?.value,
      totalCases: agg.totalCases,
      avgPercent: agg.avgPercent,
      totalReward: agg.totalReward,
      totalDelivered: agg.totalDelivered,
      avgDelivered: agg.avgDelivered,
      qualifiedCount: agg.qualifiedCount,
    };
  }).filter((p) => p.count > 0);

  return series.map((item, idx) => {
    const prev = idx > 0 ? series[idx - 1] : null;
    return {
      ...item,
      delta11: prev && item.m11 !== null && prev.m11 !== null ? item.m11 - prev.m11 : null,
      delta21: prev && item.m21 !== null && prev.m21 !== null ? item.m21 - prev.m21 : null,
      deltaCases: prev ? item.totalCases - prev.totalCases : null,
      deltaReward: prev ? item.totalReward - prev.totalReward : null,
      deltaDelivered: prev ? item.totalDelivered - prev.totalDelivered : null,
    };
  });
}
