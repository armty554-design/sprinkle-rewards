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

export function parseCSVData(csvText) {
  const result = Papa.parse(csvText, {
    skipEmptyLines: false,
  });

  const rows = result.data;
  if (!rows || rows.length < 4) {
    throw new Error('รูปแบบไฟล์ไม่ถูกต้อง หรือข้อมูลไม่เพียงพอ');
  }

  // Row 0 usually contains title e.g. 2569-09_ผลคะแนนรางวัลมาตรฐานจัดส่ง
  const title = cleanText(rows[0][0]) || 'รายงานผลคะแนนรางวัลมาตรฐานจัดส่ง';
  
  // Extract driver rows
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

    if (col8 === 'sum' || col8.includes('ข้อมูลจาก link')) {
      break;
    }

    // Must have a valid car code (e.g. 13101, 13L11, 13S01)
    if (!carCode || carCode.length < 3 || isNaN(parseInt(carCode[0]))) {
      continue;
    }

    if (!branchName && col0) branchName = col0;
    if (!monthName && r[1]) monthName = cleanText(r[1]);

    const vehicle = parseDriverRow(r, i);
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
      month: monthName || 'กันยายน 2026',
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

function parseDriverRow(r, rowIndex) {
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

  const zone = cleanText(r[157]) || 'ไม่ระบุ';
  const supervisorLogisticsId = cleanText(r[158]);
  const supervisorLogisticsName = cleanText(r[159]);
  const supervisorAdminId = cleanText(r[160]);
  const supervisorAdminName = cleanText(r[161]);
  const remark = cleanText(r[162]);
  const carType = cleanText(r[169]) || (position.includes('พนักงาน') ? 'รถ S' : 'รถ ผปก.');

  // Group levels
  const g1Level = cleanText(r[164]) || '-';
  const g2Level = cleanText(r[165]) || '-';
  const g3Level = cleanText(r[166]) || '-';
  const g4Level = cleanText(r[167]) || '-';
  const overallLevel = cleanText(r[168]) || '-';

  // Group 1: จัดส่ง
  const group1 = {
    name: 'กลุ่มงานจัดส่ง',
    score: cleanNum(r[49]),
    percent: cleanNum(r[50]),
    reward: cleanNum(r[51]),
    level: g1Level,
    items: [
      {
        code: '1.1',
        name: 'จัดส่งตรงเวลา',
        target: 'เต็ม 25',
        fullScore: 25,
        result: cleanText(r[15]),
        score: cleanNum(r[16]),
        percent: cleanNum(r[17]),
        reward: cleanNum(r[18]),
        status: cleanNum(r[17]) >= 95 ? 'pass' : cleanNum(r[17]) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '1.2',
        name: 'ตกรอบส่งสุทธิ',
        target: 'เต็ม 25',
        fullScore: 25,
        result: cleanText(r[19]),
        score: cleanNum(r[20]),
        percent: cleanNum(r[21]),
        reward: cleanNum(r[22]),
        status: cleanNum(r[19]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '1.3',
        name: 'ข้อร้องเรียน 01',
        target: 'เต็ม 20',
        fullScore: 20,
        result: cleanText(r[23]) + ' ครั้ง',
        score: cleanNum(r[25]),
        percent: cleanNum(r[26]),
        reward: cleanNum(r[27]),
        status: cleanNum(r[23]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '1.4',
        name: 'ส่งไม่ครบจำนวน (001) / ทำรายการไม่ตรงความเป็นจริง (38)',
        target: 'หักคะแนน/เงิน',
        fullScore: 0,
        result: `ส่งไม่ครบ ${cleanNum(r[28])} ครั้ง, ทำรายการไม่ตรง ${cleanNum(r[30])} ครั้ง`,
        score: cleanNum(r[29]) + cleanNum(r[31]),
        percent: null,
        reward: cleanNum(r[32]),
        status: cleanNum(r[28]) === 0 && cleanNum(r[30]) === 0 && cleanNum(r[32]) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '1.5',
        name: 'GPS ไม่เกิน 100 เมตร',
        target: 'เต็ม 15',
        fullScore: 15,
        result: cleanText(r[33]) + '%',
        score: cleanNum(r[34]),
        percent: cleanNum(r[35]),
        reward: cleanNum(r[36]),
        status: cleanNum(r[35]) >= 95 ? 'pass' : cleanNum(r[35]) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '1.6',
        name: 'ตกรอบส่งซ้ำ',
        target: 'เต็ม 10',
        fullScore: 10,
        result: cleanText(r[37]) + '%',
        score: cleanNum(r[38]),
        percent: cleanNum(r[39]),
        reward: cleanNum(r[40]),
        status: cleanNum(r[37]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '1.7',
        name: 'ส่งด่วน 3 วัน',
        target: 'เต็ม 10',
        fullScore: 10,
        result: cleanText(r[41]) + '%',
        score: cleanNum(r[42]),
        percent: cleanNum(r[43]),
        reward: cleanNum(r[44]),
        status: cleanNum(r[43]) >= 95 ? 'pass' : cleanNum(r[43]) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '1.8',
        name: 'ประเภทการรับน้ำ',
        target: 'เต็ม 15',
        fullScore: 15,
        result: cleanText(r[45]) + '%',
        score: cleanNum(r[46]),
        percent: cleanNum(r[47]),
        reward: cleanNum(r[48]),
        status: cleanNum(r[47]) >= 95 ? 'pass' : cleanNum(r[47]) >= 85 ? 'warning' : 'fail'
      }
    ]
  };

  // Group 2: บริการ
  const group2 = {
    name: 'กลุ่มงานบริการ',
    score: cleanNum(r[79]),
    percent: cleanNum(r[80]),
    reward: cleanNum(r[81]),
    level: g2Level,
    items: [
      {
        code: '2.1',
        name: 'จัดส่งตรงเวลานัดหมาย',
        target: 'เต็ม 30',
        fullScore: 30,
        result: cleanText(r[52]) + '%',
        score: cleanNum(r[53]),
        percent: cleanNum(r[54]),
        reward: cleanNum(r[55]),
        status: cleanNum(r[54]) >= 95 ? 'pass' : 'fail'
      },
      {
        code: '2.2',
        name: 'ข้อร้องเรียน 01 ที่เป็นเท็จ',
        target: 'เต็ม 15',
        fullScore: 15,
        result: cleanText(r[56]) + ' ครั้ง',
        score: cleanNum(r[58]),
        percent: cleanNum(r[59]),
        reward: cleanNum(r[60]),
        status: cleanNum(r[56]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '2.3',
        name: 'สมาชิกยกเลิกเนื่องจากบริการ',
        target: '-35 ถึง -55/ราย',
        fullScore: 0,
        result: cleanText(r[61]) + ' ราย',
        score: cleanNum(r[62]),
        percent: null,
        reward: cleanNum(r[63]),
        status: cleanNum(r[61]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '2.4',
        name: 'คำชมสมาชิกใหม่',
        target: 'เต็ม 15',
        fullScore: 15,
        result: cleanText(r[64]),
        score: cleanNum(r[65]),
        percent: cleanNum(r[66]),
        reward: cleanNum(r[67]),
        status: cleanNum(r[66]) >= 85 ? 'pass' : 'warning'
      },
      {
        code: '2.5',
        name: 'ความพึงพอใจหลังการจัดส่ง',
        target: 'เต็ม 15',
        fullScore: 15,
        result: cleanText(r[68]) + '%',
        score: cleanNum(r[69]),
        percent: cleanNum(r[70]),
        reward: cleanNum(r[71]),
        status: cleanNum(r[70]) >= 95 ? 'pass' : 'warning'
      },
      {
        code: '2.6',
        name: 'เสริมน้ำนอกรอบ 02 (คะแนนเสริม)',
        target: 'คะแนนเสริม',
        fullScore: 4,
        result: `${cleanText(r[72])} รายการ (${cleanText(r[73])}%)`,
        score: cleanNum(r[74]),
        percent: null,
        reward: 0,
        status: 'pass'
      },
      {
        code: '2.7',
        name: 'เสริมน้ำนอกพื้นที่ 01 (คะแนนเสริม)',
        target: 'คะแนนเสริม',
        fullScore: 0,
        result: cleanText(r[75]) + ' รายการ',
        score: cleanNum(r[76]),
        percent: null,
        reward: 0,
        status: 'pass'
      },
      {
        code: '2.8',
        name: 'ติดตามการจัดส่งหลังย้ายรอบถาวร',
        target: 'หักคะแนนหากตก',
        fullScore: 0,
        result: cleanText(r[77]) + '%',
        score: cleanNum(r[78]),
        percent: null,
        reward: 0,
        status: cleanNum(r[78]) >= 0 ? 'pass' : 'fail'
      }
    ]
  };

  // Group 3: เอกสารและผลิตภัณฑ์
  const group3 = {
    name: 'กลุ่มงานเอกสารและผลิตภัณฑ์',
    score: cleanNum(r[112]),
    percent: cleanNum(r[113]),
    reward: cleanNum(r[114]),
    level: g3Level,
    items: [
      {
        code: '3.1',
        name: 'จัดส่งคูปองพร้อมเก็บเงิน Prepaid',
        target: 'เต็ม 30',
        fullScore: 30,
        result: cleanText(r[82]) + '%',
        score: cleanNum(r[83]),
        percent: cleanNum(r[84]),
        reward: cleanNum(r[85]),
        status: cleanNum(r[84]) >= 95 ? 'pass' : cleanNum(r[84]) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '3.2',
        name: 'ทำรายการถูกต้องตามขั้นตอน (spd)',
        target: 'เต็ม 10',
        fullScore: 10,
        result: cleanText(r[86]) + ' รายการ',
        score: cleanNum(r[87]),
        percent: cleanNum(r[88]),
        reward: cleanNum(r[89]),
        status: cleanNum(r[86]) === 0 ? 'pass' : cleanNum(r[88]) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '3.3',
        name: 'เก็บคูปองค้างเก่าเกิน 7 วัน',
        target: 'เต็ม 10',
        fullScore: 10,
        result: cleanText(r[90]) + ' รายการ',
        score: cleanNum(r[91]),
        percent: cleanNum(r[92]),
        reward: cleanNum(r[93]),
        status: cleanNum(r[90]) === 0 ? 'pass' : cleanNum(r[92]) >= 85 ? 'warning' : 'fail'
      },
      {
        code: '3.4',
        name: 'เก็บเงินตรงรอบฝากเก็บ (Postpaid)',
        target: 'เต็ม 10',
        fullScore: 10,
        result: cleanText(r[94]) + '%',
        score: cleanNum(r[95]),
        percent: cleanNum(r[96]),
        reward: cleanNum(r[97]),
        status: cleanNum(r[95]) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '3.5',
        name: 'รับคืนตัวอย่างคุณภาพน้ำ',
        target: '-10/ครั้ง',
        fullScore: 0,
        result: cleanText(r[98]) + ' ครั้ง',
        score: cleanNum(r[99]),
        percent: null,
        reward: cleanNum(r[100]),
        status: cleanNum(r[98]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '3.6',
        name: 'ตรวจสอบสิ่งปลอมปน',
        target: '-5/ถัง',
        fullScore: 0,
        result: `กำจัดได้ ${cleanNum(r[101])}, ไม่ได้ ${cleanNum(r[102])}, ไม่ร่วมมือ ${cleanNum(r[103])}`,
        score: cleanNum(r[104]),
        percent: null,
        reward: cleanNum(r[105]),
        status: cleanNum(r[102]) === 0 && cleanNum(r[104]) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '3.7',
        name: 'สมาชิกปฏิเสธรับคูปอง (หัวข้อ 11)',
        target: '-5/ครั้ง',
        fullScore: 0,
        result: cleanText(r[106]) + ' ครั้ง',
        score: cleanNum(r[107]),
        percent: null,
        reward: cleanNum(r[108]),
        status: cleanNum(r[106]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '3.8',
        name: 'สมาชิกร้องเรียนไม่มีคูปอง',
        target: 'ร้องเรียน',
        fullScore: 0,
        result: cleanText(r[109]) + ' ครั้ง',
        score: cleanNum(r[110]),
        percent: null,
        reward: cleanNum(r[111]),
        status: cleanNum(r[109]) === 0 ? 'pass' : 'fail'
      }
    ]
  };

  // Group 4: ภาพลักษณ์แบรนด์
  const group4 = {
    name: 'กลุ่มงานภาพลักษณ์แบรนด์',
    score: cleanNum(r[140]),
    percent: cleanNum(r[141]),
    reward: cleanNum(r[142]),
    level: g4Level,
    items: [
      {
        code: '4.1',
        name: 'ความสะอาดของรถจัดส่งสินค้า',
        target: 'ดีมาก/ผ่าน',
        fullScore: 15,
        result: cleanText(r[115]),
        score: cleanNum(r[116]),
        percent: cleanNum(r[117]),
        reward: cleanNum(r[118]),
        status: cleanText(r[115]) === 'ดีมาก' ? 'pass' : cleanText(r[115]) === 'ผ่าน' ? 'warning' : 'fail'
      },
      {
        code: '4.2',
        name: 'ความพร้อมของรถจัดส่งสินค้า',
        target: 'ดีมาก/ผ่าน',
        fullScore: 15,
        result: cleanText(r[119]),
        score: cleanNum(r[120]),
        percent: cleanNum(r[121]),
        reward: cleanNum(r[122]),
        status: cleanText(r[119]) === 'ดีมาก' ? 'pass' : cleanText(r[119]) === 'ผ่าน' ? 'warning' : 'fail'
      },
      {
        code: '4.3',
        name: 'การแต่งกายถูกต้องตามระเบียบ',
        target: 'ดีมาก/ผ่าน',
        fullScore: 15,
        result: cleanText(r[123]),
        score: cleanNum(r[124]),
        percent: cleanNum(r[125]),
        reward: cleanNum(r[126]),
        status: cleanText(r[123]) === 'ดีมาก' ? 'pass' : cleanText(r[123]) === 'ผ่าน' ? 'warning' : 'fail'
      },
      {
        code: '4.4',
        name: 'ข้อร้องเรียนพฤติกรรม (36, 05)',
        target: '-5 ถึง -15/ครั้ง',
        fullScore: 0,
        result: cleanText(r[127]) + ' ครั้ง',
        score: cleanNum(r[128]),
        percent: cleanNum(r[129]),
        reward: 0,
        status: cleanNum(r[127]) === 0 && cleanNum(r[128]) >= 0 ? 'pass' : 'fail'
      },
      {
        code: '4.5',
        name: 'ข้อร้องเรียนเรียกร้องค่าเสียหาย (94)',
        target: '-35 ถึง -55/ครั้ง',
        fullScore: 0,
        result: cleanText(r[130]) + ' ครั้ง',
        score: cleanNum(r[131]),
        percent: cleanNum(r[132]),
        reward: 0,
        status: cleanNum(r[130]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '4.6',
        name: 'ไม่กลับมาคืนน้ำภายในวันโดยไม่มีเหตุอันควร',
        target: '6 สาเหตุ',
        fullScore: 0,
        result: cleanText(r[133]) + ' ครั้ง',
        score: cleanNum(r[134]),
        percent: null,
        reward: cleanNum(r[135]),
        status: cleanNum(r[133]) === 0 ? 'pass' : 'fail'
      },
      {
        code: '4.7',
        name: 'ขับขี่ปลอดภัยและการเกิดอุบัติเหตุ',
        target: 'เต็ม 15',
        fullScore: 15,
        result: cleanText(r[136]) + '%',
        score: cleanNum(r[137]),
        percent: cleanNum(r[138]),
        reward: cleanNum(r[139]),
        status: cleanNum(r[137]) >= 15 ? 'pass' : 'fail'
      }
    ]
  };

  // Group 5 & Other
  const group5 = {
    name: 'กลุ่ม 5 และเงินพิเศษ',
    score: cleanNum(r[144]) + cleanNum(r[149]),
    reward: cleanNum(r[150]),
    items: [
      {
        code: '5.1',
        name: 'หาสมาชิกใหม่',
        target: '1 ราย 5, 2 ขึ้นไป 10',
        result: cleanText(r[143]) + ' ราย',
        score: cleanNum(r[144]),
        reward: cleanNum(r[150])
      },
      {
        code: '5.2',
        name: 'หนังสือเตือน',
        target: '-30/ใบ',
        result: cleanText(r[145]) + ' ใบ',
        score: cleanNum(r[149]),
        reward: 0
      }
    ]
  };

  // Totals
  const totalScore = cleanNum(r[151]);
  const totalPercent = cleanNum(r[152]);
  const specialBonus = cleanNum(r[153]);
  const unhandledDeduction36 = cleanNum(r[154]);
  const totalReward = cleanNum(r[155]);
  const pendingDeduction = cleanNum(r[156]);

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
  const defects = generateDefects(general, totals, group1, group2, group3, group4, r);

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

function generateDefects(gen, totals, g1, g2, g3, g4, r) {
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
  const item11 = g1.items[0];
  if (item11.percent < 85 || item11.score === 0) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.1',
      severity: item11.score === 0 ? 'danger' : 'warning',
      title: 'จัดส่งตรงเวลาหลุดเกณฑ์',
      detail: `ผลงานทำได้ ${item11.result}% (ได้ ${item11.score}/25 คะแนน, ${item11.percent}%)`,
      impact: item11.reward > 0 ? `รางวัล ${item11.reward} บาท` : 'พลาดเงินรางวัลหัวข้อนี้'
    });
  }

  // 1.2 ตกรอบส่งสุทธิ
  const item12 = g1.items[1];
  if (cleanNum(r[19]) > 0 || item12.score < 25) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.2',
      severity: 'warning',
      title: 'มีอัตราตกรอบส่งสุทธิ',
      detail: `มีตกรอบส่งสุทธิ ${r[19]}% (ได้ ${item12.score}/25 คะแนน)`,
      impact: `รางวัล 1.2: ${item12.reward} บาท`
    });
  }

  // 1.3 ข้อร้องเรียน 01
  const item13 = g1.items[2];
  if (cleanNum(r[23]) > 0 || item13.score < 20) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.3',
      severity: 'danger',
      title: 'มีข้อร้องเรียน 01',
      detail: `พบข้อร้องเรียนจำนวน ${r[23]} ครั้ง (ได้ ${item13.score}/20 คะแนน)`,
      impact: 'เสียคะแนนกลุ่มจัดส่ง'
    });
  }

  // 1.4 ส่งไม่ครบ / ไม่ตรง
  const c14_1 = cleanNum(r[28]);
  const c14_2 = cleanNum(r[30]);
  const r14 = cleanNum(r[32]);
  if (c14_1 > 0 || c14_2 > 0 || r14 < 0) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.4',
      severity: 'danger',
      title: 'ส่งไม่ครบตามจำนวน (001) หรือทำรายการไม่ตรง (38)',
      detail: `ส่งไม่ครบ ${c14_1} ครั้ง, ทำรายการไม่ตรง ${c14_2} ครั้ง (หักคะแนน ${cleanNum(r[29])})`,
      impact: `โดนหักเงินรางวัล ${r14} บาท`
    });
  }

  // 1.5 GPS
  const item15 = g1.items[4];
  if (item15.percent < 90 || item15.score < 15) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.5',
      severity: 'warning',
      title: 'GPS เกิน 100 เมตร',
      detail: `ผลงานทำได้ ${r[33]}% (ได้ ${item15.score}/15 คะแนน, ${item15.percent}%)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // 1.6 ตกรอบส่งซ้ำ
  if (cleanNum(r[37]) > 0) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.6',
      severity: 'warning',
      title: 'มีตกรอบส่งซ้ำ',
      detail: `ตกรอบส่งซ้ำ ${r[37]}% (ได้ ${cleanNum(r[38])}/10 คะแนน)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // 1.8 ประเภทการรับน้ำ
  if (cleanNum(r[46]) < 15) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.8',
      severity: 'warning',
      title: 'ประเภทการรับน้ำหลุดเกณฑ์',
      detail: `ผลงาน ${r[45]}% (ได้ ${cleanNum(r[46])}/15 คะแนน)`,
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
  const c23 = cleanNum(r[61]);
  if (c23 > 0) {
    defects.push({
      category: 'กลุ่ม 2 บริการ',
      code: '2.3',
      severity: 'danger',
      title: 'สมาชิกขอยกเลิกบริการ',
      detail: `มีสมาชิกยกเลิกจำนวน ${c23} ราย (หัก ${cleanNum(r[62])} คะแนน)`,
      impact: 'ถูกหักคะแนนหนัก (-35 ถึง -55/ราย)'
    });
  }

  // 2.8 ติดตามย้ายรอบ
  const s28 = cleanNum(r[78]);
  if (s28 < 0) {
    defects.push({
      category: 'กลุ่ม 2 บริการ',
      code: '2.8',
      severity: 'warning',
      title: 'ติดตามการจัดส่งหลังย้ายรอบถาวรถูกหักคะแนน',
      detail: `ผลงาน ${r[77]}% (หักคะแนน ${s28})`,
      impact: `หักคะแนนกลุ่มบริการ ${s28} คะแนน`
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
  const c32 = cleanNum(r[86]);
  if (c32 > 0) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: '3.2',
      severity: 'warning',
      title: 'ทำรายการผิดขั้นตอน (spd)',
      detail: `พบรายการไม่ถูกต้อง ${c32} รายการ (ได้ ${cleanNum(r[87])}/10 คะแนน)`,
      impact: 'หักคะแนนขั้นตอน spd'
    });
  }

  // 3.3 คูปองค้างเก่า
  const c33 = cleanNum(r[90]);
  if (c33 > 0) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: '3.3',
      severity: 'warning',
      title: 'เก็บคูปองค้างเก่าเกิน 7 วัน',
      detail: `พบคูปองค้างเก่าเกิน 7 วัน ${c33} รายการ (ได้ ${cleanNum(r[91])}/10 คะแนน)`,
      impact: 'หักคะแนนคูปองค้างเก่า'
    });
  }

  // 3.4 Postpaid
  const s34 = cleanNum(r[95]);
  if (s34 < 0) {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: '3.4',
      severity: 'danger',
      title: 'เก็บเงินตรงรอบฝากเก็บ (Postpaid) โดนหักคะแนน',
      detail: `ผลงานทำได้ ${r[94]}% (โดนหักคะแนน ${s34})`,
      impact: `หักคะแนน ${s34} คะแนน`
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
  const res41 = cleanText(r[115]);
  if (res41 === 'ผ่าน' || res41 === 'ไม่ได้ตรวจ' || res41 === 'ไม่ผ่าน') {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.1',
      severity: res41 === 'ไม่ผ่าน' || res41 === 'ไม่ได้ตรวจ' ? 'danger' : 'warning',
      title: `ความสะอาดรถได้ระดับ "${res41}"`,
      detail: `ความสะอาดของรถได้ระดับ ${res41} (ได้ ${cleanNum(r[116])}/15 คะแนน, ไม่ถึงระดับ "ดีมาก")`,
      impact: 'พลาดเงินรางวัลหัวข้อนี้ (200 บาท)'
    });
  }

  // 4.3 แต่งกาย
  const res43 = cleanText(r[123]);
  if (res43 === 'ผ่าน' || res43 === 'ไม่ได้ตรวจ' || res43 === 'ไม่ผ่าน') {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.3',
      severity: res43 === 'ไม่ผ่าน' ? 'danger' : 'warning',
      title: `การแต่งกายถูกต้องได้ระดับ "${res43}"`,
      detail: `การแต่งกายได้ระดับ ${res43} (ได้ ${cleanNum(r[124])}/15 คะแนน, ไม่ถึงระดับ "ดีมาก")`,
      impact: 'พลาดเงินรางวัลหัวข้อนี้ (140 บาท)'
    });
  }

  // 4.4 ข้อร้องเรียนพฤติกรรม
  const c44 = cleanNum(r[127]);
  const s44 = cleanNum(r[128]);
  if (c44 > 0 || s44 < 0) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.4',
      severity: 'danger',
      title: 'มีข้อร้องเรียน (36, 05) พฤติกรรมไม่เหมาะสม',
      detail: `พบข้อร้องเรียนพฤติกรรม ${c44} ครั้ง (หัก ${s44} คะแนน)`,
      impact: 'ถูกหักคะแนนพฤติกรรม'
    });
  }

  // 4.5 ข้อร้องเรียนค่าเสียหาย
  const c45 = cleanNum(r[130]);
  if (c45 > 0) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.5',
      severity: 'danger',
      title: 'มีข้อร้องเรียน (94) เรียกร้องค่าเสียหาย',
      detail: `พบข้อร้องเรียนเรียกร้องค่าเสียหาย ${c45} ครั้ง`,
      impact: 'ถูกหักคะแนนรุนแรง (-35 ถึง -55/ครั้ง)'
    });
  }

  // 4.7 อุบัติเหตุ
  const s47 = cleanNum(r[137]);
  if (s47 < 15) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.7',
      severity: 'danger',
      title: 'ขับขี่ปลอดภัยและการเกิดอุบัติเหตุไม่ผ่านเกณฑ์',
      detail: `คะแนนความปลอดภัยได้ ${s47}/15 คะแนน (ผลงาน ${r[136]}%)`,
      impact: 'เสียคะแนนความปลอดภัย'
    });
  }

  // 5.2 หนังสือเตือน
  const c52 = cleanNum(r[145]);
  if (c52 > 0) {
    defects.push({
      category: 'กลุ่ม 5 อื่นๆ',
      code: '5.2',
      severity: 'danger',
      title: 'มีหนังสือเตือน (Warning Letter)',
      detail: `ได้รับหนังสือเตือน ${c52} ใบ (หักคะแนน ${cleanNum(r[149])})`,
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
