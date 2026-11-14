import Papa from 'papaparse';
import { cleanNum, cleanText } from './parser.js';

export const LOOKER_SPREADSHEET_ID = '1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc';
export const LOOKER_GID = '2115397650';
export const LOOKER_CSV_URL = `https://docs.google.com/spreadsheets/d/${LOOKER_SPREADSHEET_ID}/export?format=csv&gid=${LOOKER_GID}`;

const THAI_MONTH_NAMES = {
  '01': 'มกราคม',
  '02': 'กุมภาพันธ์',
  '03': 'มีนาคม',
  '04': 'เมษายน',
  '05': 'พฤษภาคม',
  '06': 'มิถุนายน',
  '07': 'กรกฎาคม',
  '08': 'สิงหาคม',
  '09': 'กันยายน',
  '10': 'ตุลาคม',
  '11': 'พฤศจิกายน',
  '12': 'ธันวาคม'
};

function normHeader(cell) {
  return String(cell || '').replace(/\s+/g, ' ').trim();
}

export function normalizeLookerMonthKey(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    let y = parseInt(m[1], 10);
    if (y < 2400) y += 543;
    return `${y}-${m[2].padStart(2, '0')}`;
  }
  return null;
}

export function formatLookerMonthLabel(monthKey) {
  const [y, mm] = String(monthKey || '').split('-');
  if (!y || !mm) return String(monthKey || '');
  return `${THAI_MONTH_NAMES[mm] || mm} ${y}`;
}

export function computeOverallLevel(totalPercent) {
  if (totalPercent >= 95) return '95% ขึ้นไป';
  if (totalPercent >= 90) return '90 - 94.99%';
  if (totalPercent >= 85) return '85 - 89.99%';
  return '< 85%';
}

function getGroupStatus(level, percent) {
  const lvl = String(level || '').trim();
  if (lvl.includes('<') || (!lvl && percent < 85)) return 'fail';
  if (lvl.includes('95') || percent >= 95) return 'pass';
  return 'warning';
}

/**
 * Detects whether parsed CSV rows follow the 49-column single-header
 * "Looker ผลคะแนนแยกกลุ่มงาน69" schema rather than the legacy 170-column sheet.
 */
export function isLookerFormat(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || !Array.isArray(rows[0])) return false;
  const hdr = rows[0].map(normHeader);
  return (
    hdr.includes('สาขา') &&
    hdr.includes('เดือน') &&
    hdr.includes('เบอร์รถ') &&
    hdr.includes('คะแนนรวม 1') &&
    hdr.includes('เปอร์เซ็นต์ 1') &&
    hdr.includes('รางวัล 1') &&
    !hdr.includes('คะแนน 1.1')
  );
}

/**
 * Maps normalized Looker header titles to column indices with safe fallbacks
 * matching the standard 49-column layout.
 */
export function buildLookerColMap(headerRow) {
  const idx = new Map();
  headerRow.forEach((cell, i) => {
    const key = normHeader(cell);
    if (key && !idx.has(key)) idx.set(key, i);
  });

  const pick = (names, fallback) => {
    for (const name of names) {
      if (idx.has(name)) return idx.get(name);
    }
    return fallback;
  };

  return {
    branch: pick(['สาขา'], 2),
    month: pick(['เดือน'], 3),
    empId: pick(['รหัสพนักงาน'], 4),
    carCode: pick(['เบอร์รถ'], 5),
    firstName: pick(['ชื่อ'], 6),
    lastName: pick(['สกุล'], 7),
    qualified: pick(['อายุงานครบ 1 เดือน / ยอดส่ง < 3000 ถัง'], 8),
    position: pick(['ตำแหน่ง'], 10),
    distance: pick(['ระยะทาง'], 11),
    totalMembers: pick(['จำนวนสมาชิก'], 12),
    totalDelivered: pick(['จำนวนยอดส่ง'], 13),
    bottlesPerMember: pick(['ถัง/ราย'], 14),
    metersPerBottle: pick(['เมตร/ถัง'], 15),
    groupNumber: pick(['กลุ่ม'], 16),
    g1Score: pick(['คะแนนรวม 1'], 17),
    g1Percent: pick(['เปอร์เซ็นต์ 1'], 18),
    g1Reward: pick(['รางวัล 1'], 19),
    g2Score: pick(['คะแนนรวม 2'], 20),
    g2Percent: pick(['เปอร์เซ็นต์ 2'], 21),
    g2Reward: pick(['รางวัล 2'], 22),
    g3Score: pick(['คะแนนรวม 3'], 23),
    g3Percent: pick(['เปอร์เซ็นต์ 3'], 24),
    g3Reward: pick(['รางวัล 3'], 25),
    g4Score: pick(['คะแนนรวม 4'], 26),
    g4Percent: pick(['เปอร์เซ็นต์ 4'], 27),
    g4Reward: pick(['รางวัล 4'], 28),
    totalScore: pick(['รวมคะแนนทั้งหมด'], 29),
    totalPercent: pick(['เปอร์เซ็นต์ทั้งหมด'], 30),
    specialBonus: pick(['เงินพิเศษ'], 31),
    deduction36: pick(['กรณีมีข้อ 3.6 และจำนวนเงินหักไม่่พอ', 'กรณีมีข้อ 3.6 และจำนวนเงินหักไม่พอ'], 32),
    totalReward: pick(['รวมเงินรางวัล'], 33),
    pendingDeduction: pick(['รอหักเดือน ถัดไป', 'รอหักเดือนถัดไป'], 34),
    zone: pick(['เขต (ให้ใส่คำว่าเขตด้วย)'], 35),
    supervisorLogisticsId: pick(['รหัสพนักงาน หัวหน้าโลจิสติกส์'], 36),
    supervisorLogisticsName: pick(['ผู้รับผิดชอบ หัวหน้าโลจิสติกส์ (ชื่อ-สกุล ไม่ต้องระบุคำนำหน้า)'], 37),
    supervisorAdminId: pick(['รหัสพนักงาน หัวหน้าธุรการ/ธุรการ'], 38),
    supervisorAdminName: pick(['ผู้รับผิดชอบ ธุรการ (ชื่อ-สกุล ไม่ต้องระบุคำนำหน้า)'], 39),
    remark: 40,
    g1Level: pick(['กลุ่มงานจัดส่ง'], 42),
    g2Level: pick(['กลุ่มงานบริการ'], 43),
    g3Level: pick(['กลุ่มงานเอกสารและผลิตภัณฑ์'], 44),
    g4Level: pick(['กลุ่มงานภาพลักษณ์แบรนด์'], 45),
    zoneCode: pick(['Zone'], 46),
    incentivePerBottle: pick(['Delivery Standard Incentive (Baht/Bottle)'], 47),
    carType: pick(['รถ'], 48)
  };
}

function buildSummaryGroup({ name, itemCode, itemName, score, percent, reward, level }) {
  const lvl = cleanText(level);
  const status = getGroupStatus(lvl, percent);
  return {
    name,
    score,
    percent,
    reward,
    level: lvl || computeOverallLevel(percent),
    items: [
      {
        code: itemCode,
        name: itemName,
        target: 'เกณฑ์มาตรฐาน ≥ 85%',
        fullScore: null,
        isGroupSummary: true,
        result: lvl || `${percent}%`,
        score,
        percent,
        reward,
        status
      }
    ]
  };
}

/**
 * Parses a single row from the Looker 49-column CSV into the application's
 * normalized vehicle record structure.
 */
export function parseLookerRow(r, rowIndex, col, generateDefectsFn) {
  const firstName = cleanText(r[col.firstName]);
  const lastName = cleanText(r[col.lastName]);
  const rawMonth = cleanText(r[col.month]);
  const normMonth = normalizeLookerMonthKey(rawMonth);

  const general = {
    rowIndex,
    branch: cleanText(r[col.branch]),
    month: normMonth ? formatLookerMonthLabel(normMonth) : rawMonth,
    monthKey: normMonth || rawMonth,
    empId: cleanText(r[col.empId]),
    carCode: cleanText(r[col.carCode]),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    qualified: cleanText(r[col.qualified]).toUpperCase() === 'YES',
    position: cleanText(r[col.position]),
    distance: cleanNum(r[col.distance]),
    totalMembers: cleanNum(r[col.totalMembers]),
    totalDelivered: cleanNum(r[col.totalDelivered]),
    bottlesPerMember: cleanNum(r[col.bottlesPerMember]),
    metersPerBottle: cleanNum(r[col.metersPerBottle]),
    groupNumber: cleanText(r[col.groupNumber]),
    zone: cleanText(r[col.zone]),
    zoneCode: cleanText(r[col.zoneCode]),
    incentivePerBottle: cleanNum(r[col.incentivePerBottle]),
    supervisorLogisticsId: cleanText(r[col.supervisorLogisticsId]),
    supervisorLogisticsName: cleanText(r[col.supervisorLogisticsName]),
    supervisorAdminId: cleanText(r[col.supervisorAdminId]),
    supervisorAdminName: cleanText(r[col.supervisorAdminName]),
    remark: cleanText(r[col.remark]),
    carType: cleanText(r[col.carType]) || 'รถ ผปก.',
    isSummaryOnly: true
  };

  const group1 = buildSummaryGroup({
    name: 'กลุ่มงานจัดส่ง',
    itemCode: '1.1',
    itemName: 'จัดส่งตรงเวลา และมาตรฐานกลุ่มงานจัดส่ง (คะแนนรวม 1)',
    score: cleanNum(r[col.g1Score]),
    percent: cleanNum(r[col.g1Percent]),
    reward: cleanNum(r[col.g1Reward]),
    level: r[col.g1Level]
  });

  const group2 = buildSummaryGroup({
    name: 'กลุ่มงานบริการ',
    itemCode: '2',
    itemName: 'สรุปคะแนนกลุ่มงานบริการ (คะแนนรวม 2)',
    score: cleanNum(r[col.g2Score]),
    percent: cleanNum(r[col.g2Percent]),
    reward: cleanNum(r[col.g2Reward]),
    level: r[col.g2Level]
  });

  const group3 = buildSummaryGroup({
    name: 'กลุ่มงานเอกสารและผลิตภัณฑ์',
    itemCode: '3',
    itemName: 'สรุปคะแนนกลุ่มงานเอกสารและผลิตภัณฑ์ (คะแนนรวม 3)',
    score: cleanNum(r[col.g3Score]),
    percent: cleanNum(r[col.g3Percent]),
    reward: cleanNum(r[col.g3Reward]),
    level: r[col.g3Level]
  });

  const group4 = buildSummaryGroup({
    name: 'กลุ่มงานภาพลักษณ์แบรนด์',
    itemCode: '4',
    itemName: 'สรุปคะแนนกลุ่มงานภาพลักษณ์แบรนด์ (คะแนนรวม 4)',
    score: cleanNum(r[col.g4Score]),
    percent: cleanNum(r[col.g4Percent]),
    reward: cleanNum(r[col.g4Reward]),
    level: r[col.g4Level]
  });

  const specialBonus = cleanNum(r[col.specialBonus]);
  const group5 = {
    name: 'กลุ่ม 5 และเงินพิเศษ',
    score: 0,
    reward: specialBonus,
    items: []
  };

  const totalScore = cleanNum(r[col.totalScore]);
  const totalPercent = cleanNum(r[col.totalPercent]);
  const unhandledDeduction36 = cleanNum(r[col.deduction36]);
  const totalReward = cleanNum(r[col.totalReward]);
  const pendingDeduction = cleanNum(r[col.pendingDeduction]);

  const totals = {
    totalScore,
    totalPercent,
    specialBonus,
    unhandledDeduction36,
    totalReward,
    pendingDeduction,
    overallLevel: computeOverallLevel(totalPercent)
  };

  const defects = generateDefectsFn(general, totals, group1, group2, group3, group4, group5, false);

  if (unhandledDeduction36 !== 0) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร (ข้อ 3.6)',
      code: '3.6',
      severity: 'danger',
      title: 'หักเงินกรณีข้อ 3.6 และจำนวนเงินหักไม่พอ',
      detail: `ยอดปรับลดกรณีข้อ 3.6: ${unhandledDeduction36.toLocaleString()} บาท`,
      impact: `ปรับลด ${unhandledDeduction36.toLocaleString()} บาท`
    });
  }

  return {
    id: `${general.carCode}-${general.empId}-${rowIndex}`,
    general,
    groups: { group1, group2, group3, group4, group5 },
    totals,
    defects,
    isSummaryOnly: true
  };
}

/**
 * Parses a Looker 49-column CSV matrix into `{ vehicles, meta, summary, topDefects }`.
 */
export function parseLookerCSVData(rows, generateDefectsFn) {
  const col = buildLookerColMap(rows[0]);
  const vehicles = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 10) continue;
    const carCode = cleanText(r[col.carCode]);
    if (!carCode) continue;
    vehicles.push(parseLookerRow(r, i, col, generateDefectsFn));
  }

  const branchSet = Array.from(new Set(vehicles.map(v => v.general.branch).filter(Boolean)));
  const branchLabel = branchSet.length > 1 ? `ทุกสาขา (${branchSet.length} สาขา)` : (branchSet[0] || '');
  const monthLabel = vehicles[0]?.general?.month || 'รายงานประจำเดือน';

  const totalVehicles = vehicles.length;
  const qualifiedCount = vehicles.filter(v => v.general.qualified).length;
  const withRewardCount = vehicles.filter(v => v.totals.totalReward > 0).length;
  const vehiclesWithDefects = vehicles.filter(v => v.defects.length > 0).length;
  const totalRewards = vehicles.reduce((sum, v) => sum + v.totals.totalReward, 0);
  const pendingDeductions = vehicles.reduce((sum, v) => sum + v.totals.pendingDeduction, 0);
  const avgScore = totalVehicles > 0
    ? Number((vehicles.reduce((sum, v) => sum + v.totals.totalScore, 0) / totalVehicles).toFixed(2))
    : 0;
  const avgPercent = totalVehicles > 0
    ? Number((vehicles.reduce((sum, v) => sum + v.totals.totalPercent, 0) / totalVehicles).toFixed(2))
    : 0;
  const avgReward = totalVehicles > 0 ? Math.round(totalRewards / totalVehicles) : 0;

  const defectCounts = {};
  vehicles.forEach(v => {
    v.defects.forEach(d => {
      const key = `${d.code}:${d.title}`;
      if (!defectCounts[key]) {
        defectCounts[key] = {
          code: d.code,
          title: d.title,
          category: d.category,
          severity: d.severity,
          count: 0,
          cars: []
        };
      }
      defectCounts[key].count++;
      defectCounts[key].cars.push(v.general.carCode);
    });
  });
  const topDefects = Object.values(defectCounts).sort((a, b) => b.count - a.count);

  return {
    vehicles,
    meta: {
      title: `${monthLabel}_ผลคะแนนแยกกลุ่มงาน (Looker 69)`,
      branch: branchLabel,
      branches: branchSet,
      month: monthLabel,
      parsedAt: new Date().toISOString(),
      isLegacyEra: false,
      isSummaryOnly: true,
      source: 'looker69'
    },
    summary: {
      totalVehicles,
      qualifiedCount,
      qualifiedPercent: totalVehicles > 0 ? Math.round((qualifiedCount / totalVehicles) * 100) : 0,
      withRewardCount,
      vehiclesWithDefects,
      totalRewards,
      pendingDeductions,
      totalPendingDeductions: pendingDeductions,
      totalComplaints: 0,
      avgScore,
      avgPercent,
      avgReward,
      isSummaryOnly: true
    },
    topDefects
  };
}

/**
 * Splits a multi-month Looker 49-column CSV export into per-month CSV payloads
 * keyed by Buddhist Era `YYYY-MM` (e.g. `2569-01` .. `2569-09`).
 */
export function splitLookerCsvByMonth(csvText) {
  if (!csvText || typeof csvText !== 'string') return {};
  const parsed = Papa.parse(csvText, { skipEmptyLines: false });
  const rows = parsed.data || [];
  if (!isLookerFormat(rows)) return {};

  const headerRow = rows[0];
  const col = buildLookerColMap(headerRow);
  const byMonth = new Map();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 10) continue;
    const carCode = cleanText(r[col.carCode]);
    const monthKey = normalizeLookerMonthKey(r[col.month]);
    if (!carCode || !monthKey) continue;

    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey).push(r);
  }

  const result = {};
  for (const monthKey of Array.from(byMonth.keys()).sort()) {
    const mRows = byMonth.get(monthKey);
    const branches = Array.from(new Set(mRows.map(r => cleanText(r[col.branch])).filter(Boolean)));
    const totalReward = mRows.reduce((sum, r) => sum + cleanNum(r[col.totalReward]), 0);
    const csv = Papa.unparse([headerRow, ...mRows], { newline: '\r\n' });
    result[monthKey] = {
      key: monthKey,
      label: formatLookerMonthLabel(monthKey),
      gid: LOOKER_GID,
      source: 'looker69',
      isLooker: true,
      vehicleCount: mRows.length,
      branches,
      totalReward,
      csv
    };
  }
  return result;
}
