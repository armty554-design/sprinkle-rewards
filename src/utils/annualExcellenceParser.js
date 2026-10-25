import Papa from 'papaparse';

export const BRANCH_CODE_MAP = {
  '10': 'บางพลี',
  '11': 'สุขุมวิท 50',
  '12': 'วังน้อย',
  '13': 'รามอินทรา',
  '14': 'ราษฎร์บูรณะ',
  '15': 'สำโรง',
  '16': 'กรุงเทพกรีฑา',
  '17': 'บางบัวทอง',
  '18': 'ประชาชื่น',
  '20': 'พระราม 2',
  '30': 'ปทุมธานี',
  '40': 'บุคคโล',
  '50': 'พระราม 3',
  '60': 'ปากเกร็ด',
  '70': 'กิ่งแก้ว',
  '80': 'พุทธมณฑลสาย 1',
  '90': 'ประเวศ',
  '98': 'ดอนเมือง'
};

export const THAI_MONTH_SHORT_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_MONTH_FULL_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === 'none' || val === 'None') return 0;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function parseAnnualExcellenceData(csvText) {
  if (!csvText) {
    return {
      drivers: [],
      stats: {
        totalDrivers: 0,
        totalAnnualReward: 0,
        avgScorePercent: 0,
        avgDeliveryVolume: 0,
        perfectEligibilityCount: 0
      },
      branches: [],
      vehicleTypes: []
    };
  }

  const parsed = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = parsed.data || [];

  if (rows.length < 3) {
    return {
      drivers: [],
      stats: { totalDrivers: 0, totalAnnualReward: 0, avgScorePercent: 0, avgDeliveryVolume: 0, perfectEligibilityCount: 0 },
      branches: [],
      vehicleTypes: []
    };
  }

  // Row 0 has Thai month labels (e.g. มกราคม 2568, กุมภาพันธ์ 2568...)
  // Row 1 has headers (ID, รหัสพนักงาน, เบอร์รถ, ...)
  const dataRows = rows.slice(2);

  const drivers = [];
  const branchSet = new Set();
  const typeSet = new Set();

  dataRows.forEach((r, idx) => {
    const id = String(r[0] || '').trim();
    const empId = String(r[1] || '').trim();
    const carCode = String(r[2] || '').trim();
    const firstName = String(r[3] || '').trim();
    const lastName = String(r[4] || '').trim();

    // Check valid driver row: must have carCode or empId
    if (!carCode || !empId) return;

    // Deduce branch name
    const prefix2 = carCode.substring(0, 2);
    const branchName = BRANCH_CODE_MAP[prefix2] || 'ไม่ระบุสาขา';
    branchSet.add(branchName);

    // Monthly data 1..12
    const months = [];
    let recordedMonthsCount = 0;
    let actualEligibleCount = 0;

    for (let m = 1; m <= 12; m++) {
      const baseCol = 5 + (m - 1) * 5;
      const volRaw = r[baseCol];
      const scoreRaw = r[baseCol + 1];
      const pctRaw = r[baseCol + 2];
      const rewardRaw = r[baseCol + 3];
      const eligRaw = r[baseCol + 4];

      const isRecorded = volRaw !== undefined && volRaw !== '' && String(volRaw).trim() !== 'none' && String(volRaw).trim() !== 'None';
      const isEligible = String(eligRaw).trim() === '1' || eligRaw === 1;

      if (isRecorded) {
        recordedMonthsCount++;
        if (isEligible) actualEligibleCount++;
      }

      months.push({
        monthNumber: m,
        shortName: THAI_MONTH_SHORT_NAMES[m - 1],
        fullName: THAI_MONTH_FULL_NAMES[m - 1],
        deliveryVolume: parseNum(volRaw),
        totalScore: parseNum(scoreRaw),
        scorePercent: parseNum(pctRaw),
        reward: parseNum(rewardRaw),
        isEligible,
        isRecorded
      });
    }

    // Summary columns
    const avgVolume = parseNum(r[65]);
    const avgScore = parseNum(r[66]);
    const avgPercent = parseNum(r[67]);
    const totalAnnualReward = parseNum(r[68]);
    const eligibleMonthsCount = parseInt(r[69], 10) || actualEligibleCount;
    const workgroup = String(r[70] || '').trim();
    const vehicleType = String(r[71] || '').trim() || 'ผปก.';

    typeSet.add(vehicleType);

    drivers.push({
      id: id || `${empId}_${carCode}_${idx}`,
      empId,
      carCode,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      branch: branchName,
      workgroup,
      vehicleType,
      months,
      recordedMonthsCount,
      summary: {
        avgVolume,
        avgScore,
        avgPercent,
        totalAnnualReward,
        eligibleMonthsCount
      }
    });
  });

  // Calculate aggregated stats
  const totalDrivers = drivers.length;
  const totalAnnualReward = drivers.reduce((sum, d) => sum + d.summary.totalAnnualReward, 0);
  const avgScorePercent = totalDrivers > 0
    ? drivers.reduce((sum, d) => sum + d.summary.avgPercent, 0) / totalDrivers
    : 0;
  const avgDeliveryVolume = totalDrivers > 0
    ? drivers.reduce((sum, d) => sum + d.summary.avgVolume, 0) / totalDrivers
    : 0;
  
  // Candidates with full eligibility (e.g. eligible in all 9 recorded months)
  const perfectEligibilityCount = drivers.filter(d => d.summary.eligibleMonthsCount >= 9).length;

  return {
    drivers,
    stats: {
      totalDrivers,
      totalAnnualReward,
      avgScorePercent: parseFloat(avgScorePercent.toFixed(2)),
      avgDeliveryVolume: Math.round(avgDeliveryVolume),
      perfectEligibilityCount
    },
    branches: Array.from(branchSet).sort(),
    vehicleTypes: Array.from(typeSet).sort()
  };
}
