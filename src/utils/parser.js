import Papa from 'papaparse';

export function cleanNum(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function cleanText(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function getColNum(r, colIdx) {
  if (colIdx === null || colIdx === undefined || colIdx < 0) return 0;
  return cleanNum(r[colIdx]);
}

function getColText(r, colIdx) {
  if (colIdx === null || colIdx === undefined || colIdx < 0) return '';
  return cleanText(r[colIdx]);
}

/**
 * Dynamically builds a mapping of column headers from rows 1 and 2 of the CSV.
 * This guarantees resilience against column additions, deletions, or shifts across different months.
 */
export function buildDynamicColMap(rows) {
  const h1 = rows[1] || [];
  const h2 = rows[2] || [];
  const numCols = Math.max(h1.length, h2.length);

  const colMap = {
    // Top-level totals
    totalScore: null,
    totalPercent: null,
    totalReward: null,
    pendingDeduction: null,
    specialBonus: null,
    unhandledDeduction36: null,
    zone: null,
    carType: null,
    overallLevel: null,
    g1Level: null,
    g2Level: null,
    g3Level: null,
    g4Level: null,

    // Group totals
    g1Score: null,
    g1Percent: null,
    g1Reward: null,
    g2Score: null,
    g2Percent: null,
    g2Reward: null,
    g3Score: null,
    g3Percent: null,
    g3Reward: null,
    g4Score: null,
    g4Percent: null,
    g4Reward: null,

    // Item-level columns dictionary
    items: {}
  };

  const itemCodes = [
    '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8',
    '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8',
    '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8',
    '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7',
    '5.1', '5.2'
  ];

  itemCodes.forEach(c => {
    colMap.items[c] = {};
  });

  let currentH1 = '';

  for (let c = 0; c < numCols; c++) {
    const s1 = cleanText(h1[c]).replace(/\s+/g, ' ');
    const s2 = cleanText(h2[c]).replace(/\s+/g, ' ');
    if (s1) currentH1 = s1;

    // Ignore end comparison columns (e.g. "ของเดิม", "ผลต่าง" in Jan 2569)
    if (s1.includes('ของเดิม') || s1.includes('ผลต่าง')) continue;

    // Totals
    if (s2 === 'รวมเงินรางวัล' && colMap.totalReward === null) colMap.totalReward = c;
    if (s2 === 'รวมคะแนนทั้งหมด' && colMap.totalScore === null) colMap.totalScore = c;
    if (s2 === 'เปอร์เซ็นต์ทั้งหมด' && colMap.totalPercent === null) colMap.totalPercent = c;
    if (s2.includes('รอหัก') && colMap.pendingDeduction === null) colMap.pendingDeduction = c;
    if (s2.includes('กรณีมีข้อ 3.6') && colMap.unhandledDeduction36 === null) colMap.unhandledDeduction36 = c;
    if (s2.includes('รางวัลพิเศษ') && colMap.specialBonus === null) colMap.specialBonus = c;

    // Meta & Levels
    if (s2.startsWith('เขต') && colMap.zone === null) colMap.zone = c;
    if (s2 === 'ประเภทรถ' && colMap.carType === null) colMap.carType = c;
    if (s2 === 'รวมทุกกลุ่มงาน' && colMap.overallLevel === null) colMap.overallLevel = c;
    if (s2 === 'กลุ่มงานจัดส่ง' && colMap.g1Level === null) colMap.g1Level = c;
    if (s2 === 'กลุ่มงานบริการ' && colMap.g2Level === null) colMap.g2Level = c;
    if (s2 === 'กลุ่มงานเอกสารและผลิตภัณฑ์' && colMap.g3Level === null) colMap.g3Level = c;
    if (s2 === 'กลุ่มงานภาพลักษณ์แบรนด์' && colMap.g4Level === null) colMap.g4Level = c;

    // Group summaries
    if (s2 === 'คะแนนรวม 1') colMap.g1Score = c;
    if (s2 === 'เปอร์เซ็นต์ 1') colMap.g1Percent = c;
    if (s2 === 'รางวัล 1') colMap.g1Reward = c;

    if (s2 === 'คะแนนรวม 2') colMap.g2Score = c;
    if (s2 === 'เปอร์เซ็นต์ 2') colMap.g2Percent = c;
    if (s2 === 'รางวัล 2') colMap.g2Reward = c;

    if (s2 === 'คะแนนรวม 3') colMap.g3Score = c;
    if (s2 === 'เปอร์เซ็นต์ 3') colMap.g3Percent = c;
    if (s2 === 'รางวัล 3') colMap.g3Reward = c;

    if (s2 === 'คะแนนรวม 4') colMap.g4Score = c;
    if (s2 === 'เปอร์เซ็นต์ 4') colMap.g4Percent = c;
    if (s2 === 'รางวัล 4') colMap.g4Reward = c;

    // Group 5 reward (labeled 'รางวัล' located before total score)
    if (s2 === 'รางวัล' && c > 130 && c < 160 && !colMap.items['5.1'].reward) {
      colMap.items['5.1'].reward = c;
    }

    // Specific sub-items
    // 1.4: 001 ส่งไม่ครบ, 38 ทำรายการไม่ตรง
    if (s2.includes('1.4') || s1.includes('1.4')) {
      if (s2.includes('001') || (s2.includes('ผลงาน') && colMap.items['1.4'].result1 === undefined)) colMap.items['1.4'].result1 = c;
      else if (s2.includes('1.4.1') || (s2.includes('คะแนน') && colMap.items['1.4'].score1 === undefined)) colMap.items['1.4'].score1 = c;
      else if (s2.includes('38') || (s2.includes('ผลงาน') && colMap.items['1.4'].result1 !== undefined && colMap.items['1.4'].result2 === undefined)) colMap.items['1.4'].result2 = c;
      else if (s2.includes('1.4.2') || (s2.includes('คะแนน') && colMap.items['1.4'].score1 !== undefined && colMap.items['1.4'].score2 === undefined)) colMap.items['1.4'].score2 = c;
      else if (s2.includes('รางวัล')) colMap.items['1.4'].reward = c;
      continue;
    }

    // 3.6: ตรวจสอบสิ่งปลอมปน (กำจัดได้, กำจัดไม่ได้, ไม่ร่วมมือ)
    if (s2.includes('3.6') || s1.includes('3.6')) {
      if (s2.includes('กำจัดได้') || s2.includes('3.6.1')) colMap.items['3.6'].cleanable = c;
      else if (s2.includes('กำจัดไม่ได้') || s2.includes('3.6.2')) colMap.items['3.6'].uncleanable = c;
      else if ((s2.includes('ไม่') && s2.includes('ร่วมมือ')) || s2.includes('3.6.3')) colMap.items['3.6'].uncooperative = c;
      else if (s2.includes('คะแนน') && colMap.items['3.6'].score === undefined) colMap.items['3.6'].score = c;
      else if (s2.includes('รางวัล') && colMap.items['3.6'].reward === undefined) colMap.items['3.6'].reward = c;
      continue;
    }

    // General matching by code in H2 or H1
    for (const code of itemCodes) {
      if (s2.includes(code) || (currentH1.startsWith(code) && !s2.includes('คะแนนรวม') && !s2.includes('เปอร์เซ็นต์ ') && !s2.includes('รางวัล '))) {
        if (s2.includes('ผลงาน') && colMap.items[code].result === undefined) colMap.items[code].result = c;
        else if (s2.includes('คะแนน') && colMap.items[code].score === undefined) colMap.items[code].score = c;
        else if (s2.includes('เปอร์เซ็นต์') && colMap.items[code].percent === undefined) colMap.items[code].percent = c;
        else if ((s2.includes('รางวัล') || s2.includes('2.10')) && colMap.items[code].reward === undefined) colMap.items[code].reward = c;
      }
    }
  }

  // Safety fallbacks if any standard column is not found
  if (colMap.totalReward === null) colMap.totalReward = 155;
  if (colMap.totalScore === null) colMap.totalScore = colMap.totalReward - 4;
  if (colMap.totalPercent === null) colMap.totalPercent = colMap.totalScore + 1;
  if (colMap.zone === null) colMap.zone = colMap.totalReward + 2;

  return colMap;
}

export function parseCSVData(csvText) {
  const result = Papa.parse(csvText, {
    skipEmptyLines: false,
  });

  const rows = result.data;
  if (!rows || rows.length < 4) {
    throw new Error('รูปแบบไฟล์ไม่ถูกต้อง หรือข้อมูลไม่เพียงพอ');
  }

  const title = cleanText(rows[0][0]) || 'รายงานผลคะแนนรางวัลมาตรฐานจัดส่ง';
  
  // Build dynamic column map for this CSV
  const colMap = buildDynamicColMap(rows);

  const vehicles = [];
  let branchName = '';
  let monthName = '';

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 20) continue;
    
    // Stop if we hit the summary rows
    const col8 = cleanText(r[8]).toLowerCase();
    const col0 = cleanText(r[0]);
    const carCode = cleanText(r[3]);

    if (col8 === 'sum' || col8.includes('ข้อมูลจาก link') || col8.includes('รวม')) {
      break;
    }

    // Must have a valid car code (e.g. 13101, 13L11, 13S01)
    if (!carCode || carCode.length < 3 || isNaN(parseInt(carCode[0]))) {
      continue;
    }

    if (!branchName && col0) branchName = col0;
    if (!monthName && r[1]) monthName = cleanText(r[1]);

    const vehicle = parseDriverRow(r, i, colMap);
    vehicles.push(vehicle);
  }

  // Calculate branch statistics
  const totalVehicles = vehicles.length;
  const totalRewards = vehicles.reduce((sum, v) => sum + v.totals.totalReward, 0);
  const avgReward = totalVehicles > 0 ? Math.round(totalRewards / totalVehicles) : 0;
  const qualifiedCount = vehicles.filter(v => v.general.qualified).length;
  const withRewardCount = vehicles.filter(v => v.totals.totalReward > 0).length;
  const vehiclesWithDefects = vehicles.filter(v => v.defects.length > 0).length;
  const totalPendingDeductions = vehicles.reduce((sum, v) => sum + v.totals.pendingDeduction, 0);

  // Top defect items across branch
  const defectCounts = {};
  vehicles.forEach(v => {
    v.defects.forEach(d => {
      const key = `${d.code} - ${d.title}`;
      if (!defectCounts[key]) {
        defectCounts[key] = {
          code: d.code,
          title: d.title,
          category: d.category,
          count: 0,
          severity: d.severity,
          cars: []
        };
      }
      defectCounts[key].count++;
      defectCounts[key].cars.push(v.general.carCode);
    });
  });

  const topDefects = Object.values(defectCounts).sort((a, b) => b.count - a.count);

  return {
    meta: {
      title,
      branch: branchName || 'รามอินทรา',
      month: monthName || 'รายงานประจำเดือน',
      parsedAt: new Date().toISOString()
    },
    summary: {
      totalVehicles,
      totalRewards,
      avgReward,
      qualifiedCount,
      withRewardCount,
      vehiclesWithDefects,
      totalPendingDeductions
    },
    topDefects,
    vehicles
  };
}

function parseDriverRow(r, rowIndex, colMap) {
  const branch = cleanText(r[0]);
  const month = cleanText(r[1]);
  const empId = cleanText(r[2]);
  const carCode = cleanText(r[3]);
  const firstName = cleanText(r[4]);
  const lastName = cleanText(r[5]);
  const fullName = `${firstName} ${lastName}`.trim();
  const qualified = cleanText(r[6]).toUpperCase() === 'YES';
  const position = cleanText(r[8]) || 'ผู้ประกอบการ';
  const distance = cleanNum(r[9]);
  const totalMembers = cleanNum(r[10]);
  const totalDelivered = cleanNum(r[11]);
  const bottlesPerMember = cleanNum(r[12]);
  const metersPerBottle = cleanNum(r[13]);
  const groupNumber = cleanText(r[14]);

  const zoneCol = colMap.zone !== null ? colMap.zone : 157;
  const zone = getColText(r, zoneCol) || 'ไม่ระบุ';
  const supervisorLogisticsId = getColText(r, zoneCol + 1);
  const supervisorLogisticsName = getColText(r, zoneCol + 2);
  const supervisorAdminId = getColText(r, zoneCol + 3);
  const supervisorAdminName = getColText(r, zoneCol + 4);
  const remark = getColText(r, zoneCol + 5);
  
  const carType = colMap.carType !== null 
    ? getColText(r, colMap.carType) 
    : (position.includes('พนักงาน') ? 'รถ S' : 'รถ ผปก.');

  // Group levels
  const g1Level = getColText(r, colMap.g1Level) || '-';
  const g2Level = getColText(r, colMap.g2Level) || '-';
  const g3Level = getColText(r, colMap.g3Level) || '-';
  const g4Level = getColText(r, colMap.g4Level) || '-';
  const overallLevel = getColText(r, colMap.overallLevel) || '-';

  const it = colMap.items;

  // Group 1: จัดส่ง
  const group1 = {
    name: 'กลุ่มงานจัดส่ง',
    score: getColNum(r, colMap.g1Score),
    percent: getColNum(r, colMap.g1Percent),
    reward: getColNum(r, colMap.g1Reward),
    level: g1Level,
    items: [
      {
        code: '1.1',
        name: 'จัดส่งตรงเวลา',
        target: 'เต็ม 25',
        fullScore: 25,
        result: getColText(r, it['1.1'].result),
        score: getColNum(r, it['1.1'].score),
        percent: getColNum(r, it['1.1'].percent),
        reward: getColNum(r, it['1.1'].reward),
        status: getColNum(r, it['1.1'].percent) >= 95 ? 'pass' : getColNum(r, it['1.1'].percent) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '1.2',
        name: 'ตกรอบส่งสุทธิ',
        target: 'เต็ม 25',
        fullScore: 25,
        result: getColText(r, it['1.2'].result),
        score: getColNum(r, it['1.2'].score),
        percent: getColNum(r, it['1.2'].percent),
        reward: getColNum(r, it['1.2'].reward),
        status: getColNum(r, it['1.2'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '1.3',
        name: 'ข้อร้องเรียน 01',
        target: 'เต็ม 20',
        fullScore: 20,
        result: getColText(r, it['1.3'].result) + ' ครั้ง',
        score: getColNum(r, it['1.3'].score),
        percent: getColNum(r, it['1.3'].percent),
        reward: getColNum(r, it['1.3'].reward),
        status: getColNum(r, it['1.3'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '1.4',
        name: 'ส่งไม่ครบจำนวน (001) / ทำรายการไม่ตรงความเป็นจริง (38)',
        target: 'หักคะแนน/เงิน',
        fullScore: 0,
        result: `ส่งไม่ครบ ${getColNum(r, it['1.4'].result1)} ครั้ง, ทำรายการไม่ตรง ${getColNum(r, it['1.4'].result2)} ครั้ง`,
        rawResult1: getColNum(r, it['1.4'].result1),
        rawResult2: getColNum(r, it['1.4'].result2),
        score: getColNum(r, it['1.4'].score1) + getColNum(r, it['1.4'].score2),
        score1: getColNum(r, it['1.4'].score1),
        score2: getColNum(r, it['1.4'].score2),
        percent: null,
        reward: getColNum(r, it['1.4'].reward),
        status: getColNum(r, it['1.4'].result1) === 0 && getColNum(r, it['1.4'].result2) === 0 && getColNum(r, it['1.4'].reward) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '1.5',
        name: 'GPS ไม่เกิน 100 เมตร',
        target: 'เต็ม 15',
        fullScore: 15,
        result: getColText(r, it['1.5'].result) + '%',
        rawResult: getColNum(r, it['1.5'].result),
        score: getColNum(r, it['1.5'].score),
        percent: getColNum(r, it['1.5'].percent),
        reward: getColNum(r, it['1.5'].reward),
        status: getColNum(r, it['1.5'].percent) >= 95 ? 'pass' : getColNum(r, it['1.5'].percent) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '1.6',
        name: 'ตกรอบส่งซ้ำ',
        target: 'เต็ม 10',
        fullScore: 10,
        result: getColText(r, it['1.6'].result) + '%',
        rawResult: getColNum(r, it['1.6'].result),
        score: getColNum(r, it['1.6'].score),
        percent: getColNum(r, it['1.6'].percent),
        reward: getColNum(r, it['1.6'].reward),
        status: getColNum(r, it['1.6'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '1.7',
        name: 'ส่งด่วน 3 วัน',
        target: 'เต็ม 10',
        fullScore: 10,
        result: getColText(r, it['1.7'].result) + '%',
        score: getColNum(r, it['1.7'].score),
        percent: getColNum(r, it['1.7'].percent),
        reward: getColNum(r, it['1.7'].reward),
        status: getColNum(r, it['1.7'].percent) >= 95 ? 'pass' : getColNum(r, it['1.7'].percent) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '1.8',
        name: 'ประเภทการรับน้ำ',
        target: 'เต็ม 15',
        fullScore: 15,
        result: getColText(r, it['1.8'].result) + '%',
        rawResult: getColNum(r, it['1.8'].result),
        score: getColNum(r, it['1.8'].score),
        percent: getColNum(r, it['1.8'].percent),
        reward: getColNum(r, it['1.8'].reward),
        status: getColNum(r, it['1.8'].percent) >= 95 ? 'pass' : getColNum(r, it['1.8'].percent) >= 85 ? 'warning' : 'fail'
      }
    ]
  };

  // Group 2: บริการ
  const group2 = {
    name: 'กลุ่มงานบริการ',
    score: getColNum(r, colMap.g2Score),
    percent: getColNum(r, colMap.g2Percent),
    reward: getColNum(r, colMap.g2Reward),
    level: g2Level,
    items: [
      {
        code: '2.1',
        name: 'จัดส่งตรงเวลานัดหมาย',
        target: 'เต็ม 30',
        fullScore: 30,
        result: getColText(r, it['2.1'].result) + '%',
        score: getColNum(r, it['2.1'].score),
        percent: getColNum(r, it['2.1'].percent),
        reward: getColNum(r, it['2.1'].reward),
        status: getColNum(r, it['2.1'].percent) >= 95 ? 'pass' : 'fail'
      },
      {
        code: '2.2',
        name: 'ข้อร้องเรียน 01 ที่เป็นเท็จ',
        target: 'เต็ม 15',
        fullScore: 15,
        result: getColText(r, it['2.2'].result) + ' ครั้ง',
        score: getColNum(r, it['2.2'].score),
        percent: getColNum(r, it['2.2'].percent),
        reward: getColNum(r, it['2.2'].reward),
        status: getColNum(r, it['2.2'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '2.3',
        name: 'สมาชิกยกเลิกเนื่องจากบริการ',
        target: '-35 ถึง -55/ราย',
        fullScore: 0,
        result: getColText(r, it['2.3'].result) + ' ราย',
        rawResult: getColNum(r, it['2.3'].result),
        score: getColNum(r, it['2.3'].score),
        percent: null,
        reward: getColNum(r, it['2.3'].reward),
        status: getColNum(r, it['2.3'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '2.4',
        name: 'คำชมสมาชิกใหม่',
        target: 'เต็ม 15',
        fullScore: 15,
        result: getColText(r, it['2.4'].result),
        score: getColNum(r, it['2.4'].score),
        percent: getColNum(r, it['2.4'].percent),
        reward: getColNum(r, it['2.4'].reward),
        status: getColNum(r, it['2.4'].percent) >= 85 ? 'pass' : 'warning'
      },
      {
        code: '2.5',
        name: 'ความพึงพอใจหลังการจัดส่ง',
        target: 'เต็ม 15',
        fullScore: 15,
        result: getColText(r, it['2.5'].result) + '%',
        score: getColNum(r, it['2.5'].score),
        percent: getColNum(r, it['2.5'].percent),
        reward: getColNum(r, it['2.5'].reward),
        status: getColNum(r, it['2.5'].percent) >= 95 ? 'pass' : 'warning'
      },
      {
        code: '2.6',
        name: 'เสริมน้ำนอกรอบ 02 (คะแนนเสริม)',
        target: 'คะแนนเสริม',
        fullScore: 4,
        result: `${getColText(r, it['2.6'].result)} รายการ`,
        score: getColNum(r, it['2.6'].score),
        percent: null,
        reward: 0,
        status: 'pass'
      },
      {
        code: '2.7',
        name: 'เสริมน้ำนอกพื้นที่ 01 (คะแนนเสริม)',
        target: 'คะแนนเสริม',
        fullScore: 0,
        result: getColText(r, it['2.7'].result) + ' รายการ',
        score: getColNum(r, it['2.7'].score),
        percent: null,
        reward: 0,
        status: 'pass'
      },
      {
        code: '2.8',
        name: 'ติดตามการจัดส่งหลังย้ายรอบถาวร',
        target: 'หักคะแนนหากตก',
        fullScore: 0,
        result: getColText(r, it['2.8'].result) + '%',
        score: getColNum(r, it['2.8'].score),
        percent: null,
        reward: 0,
        status: getColNum(r, it['2.8'].score) >= 0 ? 'pass' : 'fail'
      }
    ]
  };

  // Group 3: เอกสารและผลิตภัณฑ์
  const group3 = {
    name: 'กลุ่มงานเอกสารและผลิตภัณฑ์',
    score: getColNum(r, colMap.g3Score),
    percent: getColNum(r, colMap.g3Percent),
    reward: getColNum(r, colMap.g3Reward),
    level: g3Level,
    items: [
      {
        code: '3.1',
        name: 'จัดส่งคูปองพร้อมเก็บเงิน Prepaid',
        target: 'เต็ม 30',
        fullScore: 30,
        result: getColText(r, it['3.1'].result) + '%',
        score: getColNum(r, it['3.1'].score),
        percent: getColNum(r, it['3.1'].percent),
        reward: getColNum(r, it['3.1'].reward),
        status: getColNum(r, it['3.1'].percent) >= 95 ? 'pass' : getColNum(r, it['3.1'].percent) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '3.2',
        name: 'ทำรายการถูกต้องตามขั้นตอน (spd)',
        target: 'เต็ม 10',
        fullScore: 10,
        result: getColText(r, it['3.2'].result) + ' รายการ',
        rawResult: getColNum(r, it['3.2'].result),
        score: getColNum(r, it['3.2'].score),
        percent: getColNum(r, it['3.2'].percent),
        reward: getColNum(r, it['3.2'].reward),
        status: getColNum(r, it['3.2'].result) === 0 ? 'pass' : getColNum(r, it['3.2'].percent) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '3.3',
        name: 'เก็บคูปองค้างเก่าเกิน 7 วัน',
        target: 'เต็ม 10',
        fullScore: 10,
        result: getColText(r, it['3.3'].result) + ' รายการ',
        rawResult: getColNum(r, it['3.3'].result),
        score: getColNum(r, it['3.3'].score),
        percent: getColNum(r, it['3.3'].percent),
        reward: getColNum(r, it['3.3'].reward),
        status: getColNum(r, it['3.3'].result) === 0 ? 'pass' : getColNum(r, it['3.3'].percent) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '3.4',
        name: 'เก็บเงินตรงรอบฝากเก็บ (Postpaid)',
        target: 'เต็ม 10',
        fullScore: 10,
        result: getColText(r, it['3.4'].result) + '%',
        score: getColNum(r, it['3.4'].score),
        percent: getColNum(r, it['3.4'].percent),
        reward: getColNum(r, it['3.4'].reward),
        status: getColNum(r, it['3.4'].score) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '3.5',
        name: 'รับคืนตัวอย่างคุณภาพน้ำ',
        target: '-10/ครั้ง',
        fullScore: 0,
        result: getColText(r, it['3.5'].result) + ' ครั้ง',
        score: getColNum(r, it['3.5'].score),
        percent: null,
        reward: getColNum(r, it['3.5'].reward),
        status: getColNum(r, it['3.5'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '3.6',
        name: 'ตรวจสอบสิ่งปลอมปน',
        target: '-5/ถัง',
        fullScore: 0,
        result: `กำจัดได้ ${getColNum(r, it['3.6'].cleanable)}, ไม่ได้ ${getColNum(r, it['3.6'].uncleanable)}, ไม่ร่วมมือ ${getColNum(r, it['3.6'].uncooperative)}`,
        cleanable: getColNum(r, it['3.6'].cleanable),
        uncleanable: getColNum(r, it['3.6'].uncleanable),
        uncooperative: getColNum(r, it['3.6'].uncooperative),
        score: getColNum(r, it['3.6'].score),
        percent: null,
        reward: getColNum(r, it['3.6'].reward),
        status: getColNum(r, it['3.6'].uncleanable) === 0 && getColNum(r, it['3.6'].score) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '3.7',
        name: 'สมาชิกปฏิเสธรับคูปอง (หัวข้อ 11)',
        target: '-5/ครั้ง',
        fullScore: 0,
        result: getColText(r, it['3.7'].result) + ' ครั้ง',
        score: getColNum(r, it['3.7'].score),
        percent: null,
        reward: getColNum(r, it['3.7'].reward),
        status: getColNum(r, it['3.7'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '3.8',
        name: 'สมาชิกร้องเรียนไม่มีคูปอง',
        target: 'ร้องเรียน',
        fullScore: 0,
        result: getColText(r, it['3.8'].result) + ' ครั้ง',
        score: getColNum(r, it['3.8'].score),
        percent: null,
        reward: getColNum(r, it['3.8'].reward),
        status: getColNum(r, it['3.8'].result) === 0 ? 'pass' : 'fail'
      }
    ]
  };

  // Group 4: ภาพลักษณ์แบรนด์
  const group4 = {
    name: 'กลุ่มงานภาพลักษณ์แบรนด์',
    score: getColNum(r, colMap.g4Score),
    percent: getColNum(r, colMap.g4Percent),
    reward: getColNum(r, colMap.g4Reward),
    level: g4Level,
    items: [
      {
        code: '4.1',
        name: 'ความสะอาดของรถจัดส่งสินค้า',
        target: 'ดีมาก/ผ่าน',
        fullScore: 15,
        result: getColText(r, it['4.1'].result),
        score: getColNum(r, it['4.1'].score),
        percent: getColNum(r, it['4.1'].percent),
        reward: getColNum(r, it['4.1'].reward),
        status: getColText(r, it['4.1'].result) === 'ดีมาก' ? 'pass' : getColText(r, it['4.1'].result) === 'ผ่าน' ? 'warning' : 'fail'
      },
      {
        code: '4.2',
        name: 'ความพร้อมของรถจัดส่งสินค้า',
        target: 'ดีมาก/ผ่าน',
        fullScore: 15,
        result: getColText(r, it['4.2'].result),
        score: getColNum(r, it['4.2'].score),
        percent: getColNum(r, it['4.2'].percent),
        reward: getColNum(r, it['4.2'].reward),
        status: getColText(r, it['4.2'].result) === 'ดีมาก' ? 'pass' : getColText(r, it['4.2'].result) === 'ผ่าน' ? 'warning' : 'fail'
      },
      {
        code: '4.3',
        name: 'การแต่งกายถูกต้องตามระเบียบ',
        target: 'ดีมาก/ผ่าน',
        fullScore: 15,
        result: getColText(r, it['4.3'].result),
        score: getColNum(r, it['4.3'].score),
        percent: getColNum(r, it['4.3'].percent),
        reward: getColNum(r, it['4.3'].reward),
        status: getColText(r, it['4.3'].result) === 'ดีมาก' ? 'pass' : getColText(r, it['4.3'].result) === 'ผ่าน' ? 'warning' : 'fail'
      },
      {
        code: '4.4',
        name: 'ข้อร้องเรียนพฤติกรรม (36, 05)',
        target: '-5 ถึง -15/ครั้ง',
        fullScore: 0,
        result: getColText(r, it['4.4'].result) + ' ครั้ง',
        rawResult: getColNum(r, it['4.4'].result),
        score: getColNum(r, it['4.4'].score),
        percent: getColNum(r, it['4.4'].percent),
        reward: 0,
        status: getColNum(r, it['4.4'].result) === 0 && getColNum(r, it['4.4'].score) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '4.5',
        name: 'ข้อร้องเรียนเรียกร้องค่าเสียหาย (94)',
        target: '-35 ถึง -55/ครั้ง',
        fullScore: 0,
        result: getColText(r, it['4.5'].result) + ' ครั้ง',
        rawResult: getColNum(r, it['4.5'].result),
        score: getColNum(r, it['4.5'].score),
        percent: getColNum(r, it['4.5'].percent),
        reward: 0,
        status: getColNum(r, it['4.5'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '4.6',
        name: 'ไม่กลับมาคืนน้ำภายในวันโดยไม่มีเหตุอันควร',
        target: '6 สาเหตุ',
        fullScore: 0,
        result: getColText(r, it['4.6'].result) + ' ครั้ง',
        score: getColNum(r, it['4.6'].score),
        percent: null,
        reward: getColNum(r, it['4.6'].reward),
        status: getColNum(r, it['4.6'].result) === 0 ? 'pass' : 'fail'
      },
      {
        code: '4.7',
        name: 'ขับขี่ปลอดภัยและการเกิดอุบัติเหตุ',
        target: 'เต็ม 15',
        fullScore: 15,
        result: getColText(r, it['4.7'].result) + '%',
        rawResult: getColNum(r, it['4.7'].result),
        score: getColNum(r, it['4.7'].score),
        percent: getColNum(r, it['4.7'].percent),
        reward: getColNum(r, it['4.7'].reward),
        status: getColNum(r, it['4.7'].score) >= 15 ? 'pass' : 'fail'
      }
    ]
  };

  // Group 5 & Other
  const g5Score = getColNum(r, it['5.1'].score) + getColNum(r, it['5.2'].score);
  const g5Reward = getColNum(r, it['5.1'].reward);

  const group5 = {
    name: 'กลุ่ม 5 และเงินพิเศษ',
    score: g5Score,
    reward: g5Reward,
    items: [
      {
        code: '5.1',
        name: 'หาสมาชิกใหม่',
        target: '1 ราย 5, 2 ขึ้นไป 10',
        result: getColText(r, it['5.1'].result) + ' ราย',
        score: getColNum(r, it['5.1'].score),
        reward: g5Reward
      },
      {
        code: '5.2',
        name: 'หนังสือเตือน',
        target: '-30/ใบ',
        result: getColText(r, it['5.2'].result) + ' ใบ',
        rawResult: getColNum(r, it['5.2'].result),
        score: getColNum(r, it['5.2'].score),
        reward: 0
      }
    ]
  };

  // Totals
  const totalScore = getColNum(r, colMap.totalScore);
  const totalPercent = getColNum(r, colMap.totalPercent);
  const specialBonus = getColNum(r, colMap.specialBonus);
  const unhandledDeduction36 = getColNum(r, colMap.unhandledDeduction36);
  const totalReward = getColNum(r, colMap.totalReward);
  const pendingDeduction = getColNum(r, colMap.pendingDeduction);

  const totals = {
    totalScore,
    totalPercent,
    specialBonus,
    unhandledDeduction36,
    totalReward,
    pendingDeduction,
    overallLevel
  };

  const general = {
    branch,
    month,
    empId,
    carCode,
    firstName,
    lastName,
    fullName,
    qualified,
    position,
    distance,
    totalMembers,
    totalDelivered,
    bottlesPerMember,
    metersPerBottle,
    groupNumber,
    zone,
    supervisorLogisticsId,
    supervisorLogisticsName,
    supervisorAdminId,
    supervisorAdminName,
    remark,
    carType
  };

  // Generate defects list
  const defects = generateDefects(general, totals, group1, group2, group3, group4, group5);

  return {
    id: `${carCode}_${rowIndex}`,
    general,
    totals,
    groups: {
      group1,
      group2,
      group3,
      group4,
      group5
    },
    defects
  };
}

function generateDefects(gen, totals, g1, g2, g3, g4, g5) {
  const defects = [];

  // General qualification check
  if (!gen.qualified) {
    defects.push({
      category: 'คุณสมบัติ',
      code: 'GEN',
      severity: 'danger',
      title: 'ยอดส่งไม่ถึงเกณฑ์ หรืออายุงานไม่ครบ',
      detail: `ยอดส่งจริง ${gen.totalDelivered.toLocaleString()} ถัง (เกณฑ์ขั้นต่ำ 3,000 ถัง) ส่งผลให้ไม่ได้รับเงินรางวัลมาตรฐานในเดือนนี้`,
      impact: 'ไม่ได้รับเงินรางวัลมาตรฐาน'
    });
  }

  if (gen.remark) {
    defects.push({
      category: 'หมายเหตุ',
      code: 'REM',
      severity: 'warning',
      title: 'หมายเหตุจากสำนักงานใหญ่',
      detail: gen.remark,
      impact: '-'
    });
  }

  // Group 1 level
  if (g1.level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: 'G1',
      severity: 'danger',
      title: 'กลุ่มงานจัดส่งตกเกณฑ์มาตรฐาน (< 85%)',
      detail: `คะแนนรวมกลุ่มจัดส่งได้ ${g1.score} คะแนน (${g1.percent}%) ต่ำกว่าเกณฑ์มาตรฐาน 85%`,
      impact: `เงินรางวัลกลุ่ม 1: ${g1.reward} บาท`
    });
  }

  // 1.1 จัดส่งตรงเวลา
  const item11 = g1.items.find(i => i.code === '1.1');
  if (item11 && (item11.percent < 85 || item11.score === 0)) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.1',
      severity: item11.score === 0 ? 'danger' : 'warning',
      title: 'จัดส่งตรงเวลาหลุดเกณฑ์',
      detail: `ผลงานทำได้ ${item11.result} (ได้ ${item11.score}/25 คะแนน, ${item11.percent}%)`,
      impact: item11.reward > 0 ? `รางวัล ${item11.reward} บาท` : 'พลาดเงินรางวัลหัวข้อนี้'
    });
  }

  // 1.2 ตกรอบส่งสุทธิ
  const item12 = g1.items.find(i => i.code === '1.2');
  if (item12 && (cleanNum(item12.result) > 0 || item12.score < 25)) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.2',
      severity: 'warning',
      title: 'มีอัตราตกรอบส่งสุทธิ',
      detail: `มีตกรอบส่งสุทธิ ${item12.result}% (ได้ ${item12.score}/25 คะแนน)`,
      impact: `รางวัล 1.2: ${item12.reward} บาท`
    });
  }

  // 1.3 ข้อร้องเรียน 01
  const item13 = g1.items.find(i => i.code === '1.3');
  if (item13 && (cleanNum(item13.result) > 0 || item13.score < 20)) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.3',
      severity: 'danger',
      title: 'มีข้อร้องเรียน 01',
      detail: `พบข้อร้องเรียนจำนวน ${item13.result} (ได้ ${item13.score}/20 คะแนน)`,
      impact: 'เสียคะแนนกลุ่มจัดส่ง'
    });
  }

  // 1.4 ส่งไม่ครบ / ไม่ตรง
  const item14 = g1.items.find(i => i.code === '1.4');
  if (item14 && (item14.rawResult1 > 0 || item14.rawResult2 > 0 || item14.reward < 0)) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.4',
      severity: 'danger',
      title: 'ส่งไม่ครบตามจำนวน (001) หรือทำรายการไม่ตรง (38)',
      detail: `ส่งไม่ครบ ${item14.rawResult1} ครั้ง, ทำรายการไม่ตรง ${item14.rawResult2} ครั้ง (หักคะแนน ${item14.score})`,
      impact: `โดนหักเงินรางวัล ${item14.reward} บาท`
    });
  }

  // 1.5 GPS
  const item15 = g1.items.find(i => i.code === '1.5');
  if (item15 && (item15.percent < 90 || item15.score < 15)) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.5',
      severity: 'warning',
      title: 'GPS เกิน 100 เมตร',
      detail: `ผลงานทำได้ ${item15.result} (ได้ ${item15.score}/15 คะแนน, ${item15.percent}%)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // 1.6 ตกรอบส่งซ้ำ
  const item16 = g1.items.find(i => i.code === '1.6');
  if (item16 && cleanNum(item16.rawResult) > 0) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.6',
      severity: 'warning',
      title: 'มีตกรอบส่งซ้ำ',
      detail: `ตกรอบส่งซ้ำ ${item16.result} (ได้ ${item16.score}/10 คะแนน)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // 1.8 ประเภทการรับน้ำ
  const item18 = g1.items.find(i => i.code === '1.8');
  if (item18 && item18.score < 15) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.8',
      severity: 'warning',
      title: 'ประเภทการรับน้ำหลุดเกณฑ์',
      detail: `ผลงาน ${item18.result} (ได้ ${item18.score}/15 คะแนน)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // Group 2 level
  if (g2.level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 2 บริการ',
      code: 'G2',
      severity: 'danger',
      title: 'กลุ่มงานบริการตกเกณฑ์มาตรฐาน (< 85%)',
      detail: `คะแนนรวมกลุ่มบริการได้ ${g2.score} คะแนน (${g2.percent}%)`,
      impact: `เงินรางวัลกลุ่ม 2: ${g2.reward} บาท`
    });
  }

  // 2.3 ยกเลิกบริการ
  const item23 = g2.items.find(i => i.code === '2.3');
  if (item23 && item23.rawResult > 0) {
    defects.push({
      category: 'กลุ่ม 2 บริการ',
      code: '2.3',
      severity: 'danger',
      title: 'สมาชิกขอยกเลิกบริการ',
      detail: `มีสมาชิกยกเลิกจำนวน ${item23.rawResult} ราย (หัก ${item23.score} คะแนน)`,
      impact: 'ถูกหักคะแนนหนัก (-35 ถึง -55/ราย)'
    });
  }

  // 2.8 ติดตามย้ายรอบ
  const item28 = g2.items.find(i => i.code === '2.8');
  if (item28 && item28.score < 0) {
    defects.push({
      category: 'กลุ่ม 2 บริการ',
      code: '2.8',
      severity: 'warning',
      title: 'ติดตามการจัดส่งหลังย้ายรอบถาวรถูกหักคะแนน',
      detail: `ผลงาน ${item28.result} (หักคะแนน ${item28.score})`,
      impact: `หักคะแนนกลุ่มบริการ ${item28.score} คะแนน`
    });
  }

  // Group 3 level
  if (g3.level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: 'G3',
      severity: 'danger',
      title: 'กลุ่มงานเอกสารและผลิตภัณฑ์ตกเกณฑ์มาตรฐาน (< 85%)',
      detail: `คะแนนรวมกลุ่ม 3 ได้ ${g3.score} คะแนน (${g3.percent}%) ต่ำกว่าเกณฑ์มาตรฐาน`,
      impact: `เงินรางวัลกลุ่ม 3: ${g3.reward} บาท`
    });
  }

  // 3.2 spd
  const item32 = g3.items.find(i => i.code === '3.2');
  if (item32 && item32.rawResult > 0) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: '3.2',
      severity: 'warning',
      title: 'ทำรายการผิดขั้นตอน (spd)',
      detail: `พบรายการไม่ถูกต้อง ${item32.rawResult} รายการ (ได้ ${item32.score}/10 คะแนน)`,
      impact: 'หักคะแนนขั้นตอน spd'
    });
  }

  // 3.3 คูปองค้างเก่า
  const item33 = g3.items.find(i => i.code === '3.3');
  if (item33 && item33.rawResult > 0) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: '3.3',
      severity: 'warning',
      title: 'เก็บคูปองค้างเก่าเกิน 7 วัน',
      detail: `พบคูปองค้างเก่าเกิน 7 วัน ${item33.rawResult} รายการ (ได้ ${item33.score}/10 คะแนน)`,
      impact: 'หักคะแนนคูปองค้างเก่า'
    });
  }

  // 3.4 Postpaid
  const item34 = g3.items.find(i => i.code === '3.4');
  if (item34 && item34.score < 0) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: '3.4',
      severity: 'danger',
      title: 'เก็บเงินตรงรอบฝากเก็บ (Postpaid) โดนหักคะแนน',
      detail: `ผลงานทำได้ ${item34.result} (โดนหักคะแนน ${item34.score})`,
      impact: `หักคะแนน ${item34.score} คะแนน`
    });
  }

  // 3.6 สิ่งปลอมปน
  const item36 = g3.items.find(i => i.code === '3.6');
  if (item36 && (item36.uncleanable > 0 || item36.score < 0 || item36.reward < 0)) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: '3.6',
      severity: 'danger',
      title: 'ตรวจสอบสิ่งปลอมปนมีปัญหา',
      detail: `กำจัดไม่ได้ ${item36.uncleanable} ถัง, ไม่ร่วมมือ ${item36.uncooperative} ถัง (คะแนน ${item36.score})`,
      impact: item36.reward < 0 ? `หักเงิน ${item36.reward} บาท` : 'หักคะแนนสิ่งปลอมปน'
    });
  }

  // Group 4 level
  if (g4.level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: 'G4',
      severity: 'danger',
      title: 'กลุ่มงานภาพลักษณ์แบรนด์ตกเกณฑ์มาตรฐาน (< 85%)',
      detail: `คะแนนรวมกลุ่ม 4 ได้ ${g4.score} คะแนน (${g4.percent}%) ต่ำกว่าเกณฑ์มาตรฐาน`,
      impact: `เงินรางวัลกลุ่ม 4: ${g4.reward} บาท`
    });
  }

  // 4.1 ความสะอาดรถ
  const item41 = g4.items.find(i => i.code === '4.1');
  if (item41 && (item41.result === 'ผ่าน' || item41.result === 'ไม่ได้ตรวจ' || item41.result === 'ไม่ผ่าน')) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.1',
      severity: item41.result === 'ไม่ผ่าน' || item41.result === 'ไม่ได้ตรวจ' ? 'danger' : 'warning',
      title: `ความสะอาดรถได้ระดับ "${item41.result}"`,
      detail: `ความสะอาดของรถได้ระดับ ${item41.result} (ได้ ${item41.score}/15 คะแนน, ไม่ถึงระดับ "ดีมาก")`,
      impact: 'พลาดเงินรางวัลหัวข้อนี้ (200 บาท)'
    });
  }

  // 4.3 แต่งกาย
  const item43 = g4.items.find(i => i.code === '4.3');
  if (item43 && (item43.result === 'ผ่าน' || item43.result === 'ไม่ได้ตรวจ' || item43.result === 'ไม่ผ่าน')) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.3',
      severity: item43.result === 'ไม่ผ่าน' ? 'danger' : 'warning',
      title: `การแต่งกายถูกต้องได้ระดับ "${item43.result}"`,
      detail: `การแต่งกายได้ระดับ ${item43.result} (ได้ ${item43.score}/15 คะแนน, ไม่ถึงระดับ "ดีมาก")`,
      impact: 'พลาดเงินรางวัลหัวข้อนี้ (140 บาท)'
    });
  }

  // 4.4 ข้อร้องเรียนพฤติกรรม
  const item44 = g4.items.find(i => i.code === '4.4');
  if (item44 && (item44.rawResult > 0 || item44.score < 0)) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.4',
      severity: 'danger',
      title: 'มีข้อร้องเรียน (36, 05) พฤติกรรมไม่เหมาะสม',
      detail: `พบข้อร้องเรียนพฤติกรรม ${item44.rawResult} ครั้ง (หัก ${item44.score} คะแนน)`,
      impact: 'ถูกหักคะแนนพฤติกรรม'
    });
  }

  // 4.5 ข้อร้องเรียนค่าเสียหาย
  const item45 = g4.items.find(i => i.code === '4.5');
  if (item45 && item45.rawResult > 0) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.5',
      severity: 'danger',
      title: 'มีข้อร้องเรียน (94) เรียกร้องค่าเสียหาย',
      detail: `พบข้อร้องเรียนเรียกร้องค่าเสียหาย ${item45.rawResult} ครั้ง`,
      impact: 'ถูกหักคะแนนรุนแรง (-35 ถึง -55/ครั้ง)'
    });
  }

  // 4.7 อุบัติเหตุ
  const item47 = g4.items.find(i => i.code === '4.7');
  if (item47 && item47.score < 15) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.7',
      severity: 'danger',
      title: 'ขับขี่ปลอดภัยและการเกิดอุบัติเหตุไม่ผ่านเกณฑ์',
      detail: `คะแนนความปลอดภัยได้ ${item47.score}/15 คะแนน (ผลงาน ${item47.result})`,
      impact: 'เสียคะแนนความปลอดภัย'
    });
  }

  // 5.2 หนังสือเตือน
  const item52 = g5.items.find(i => i.code === '5.2');
  if (item52 && item52.rawResult > 0) {
    defects.push({
      category: 'กลุ่ม 5 อื่นๆ',
      code: '5.2',
      severity: 'danger',
      title: 'มีหนังสือเตือน (Warning Letter)',
      detail: `ได้รับหนังสือเตือน ${item52.rawResult} ใบ (หักคะแนน ${item52.score})`,
      impact: 'หัก -30 คะแนน/ใบ'
    });
  }

  // ยอดรอหักเดือนถัดไป
  if (totals.pendingDeduction > 0) {
    defects.push({
      category: 'เงินรางวัล',
      code: 'DED',
      severity: 'danger',
      title: 'มียอดค้างรอหักในเดือนถัดไป',
      detail: `ยอดหักติดลบสะสมในเดือนนี้ไม่พอหัก จึงมียอดรอหักเดือนถัดไป ${totals.pendingDeduction.toLocaleString()} บาท`,
      impact: `รอหักเดือนถัดไป ${totals.pendingDeduction.toLocaleString()} บาท`
    });
  }

  return defects;
}
