import Papa from 'papaparse';

function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === 'none') return 0;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function parsePercentM79Data(csvText) {
  if (!csvText) return null;

  const parsed = Papa.parse(csvText, { skipEmptyLines: false });
  const rows = parsed.data || [];

  if (rows.length < 35) return null;

  // Month names mapping
  const monthLabels = {
    'July 2026': 'กรกฎาคม 2569 (M7)',
    'August 2026': 'สิงหาคม 2569 (M8)',
    'September 2026': 'กันยายน 2569 (M9)',
    'Grand Total': 'รวมไตรมาส (Grand Total)'
  };

  // Helper to extract 4 periods (July, August, September, Grand Total)
  const extractPeriods = (startRow) => {
    return [
      { id: 'm7', key: 'July 2026', label: monthLabels['July 2026'], row: rows[startRow] || [] },
      { id: 'm8', key: 'August 2026', label: monthLabels['August 2026'], row: rows[startRow + 1] || [] },
      { id: 'm9', key: 'September 2026', label: monthLabels['September 2026'], row: rows[startRow + 2] || [] },
      { id: 'total', key: 'Grand Total', label: monthLabels['Grand Total'], row: rows[startRow + 3] || [] }
    ];
  };

  // --- GROUP 1 (Delivery & Routes) ---
  // Starts at row 0, data rows 2..5
  const g1Periods = extractPeriods(2).map(p => ({
    ...p,
    avg1_1: parseNum(p.row[1]),
    avg1_2: parseNum(p.row[2]),
    avg1_3: parseNum(p.row[3]),
    sum001: parseNum(p.row[4]),
    sum38: parseNum(p.row[5]),
    avg1_5: parseNum(p.row[6]),
    avg1_6: parseNum(p.row[7]),
    avg1_7: parseNum(p.row[8]),
    avg1_8: parseNum(p.row[9]),
    avgGroup1: parseNum(p.row[10]),
    reward1_1: parseNum(p.row[15]),
    reward1_2: parseNum(p.row[16]),
    reward1_3: parseNum(p.row[17]),
    reward1_4: parseNum(p.row[18]),
    reward1_5: parseNum(p.row[19]),
    reward1_6: parseNum(p.row[20]),
    reward1_7: parseNum(p.row[21]),
    reward1_8: parseNum(p.row[22]),
    rewardGroup1: parseNum(p.row[23])
  }));

  // --- GROUP 2 (Service) ---
  // Starts at row 8, data rows 10..13
  const g2Periods = extractPeriods(10).map(p => ({
    ...p,
    avg2_1: parseNum(p.row[1]),
    avg2_2: parseNum(p.row[2]),
    sum2_3: parseNum(p.row[3]),
    avg2_4: parseNum(p.row[4]),
    avg2_5: parseNum(p.row[5]),
    avg2_6: parseNum(p.row[6]),
    sum2_7: parseNum(p.row[7]),
    avg2_8: parseNum(p.row[8]),
    avgGroup2: parseNum(p.row[9]),
    reward2_1: parseNum(p.row[15]),
    reward2_2: parseNum(p.row[16]),
    reward2_3: parseNum(p.row[17]),
    reward2_4: parseNum(p.row[18]),
    reward2_5: parseNum(p.row[19]),
    rewardGroup2: parseNum(p.row[20])
  }));

  // --- GROUP 3 (Documents & Product) ---
  // Starts at row 16, data rows 18..21
  const g3Periods = extractPeriods(18).map(p => ({
    ...p,
    avg3_1: parseNum(p.row[1]),
    avg3_2: parseNum(p.row[2]),
    sum3_3: parseNum(p.row[3]),
    avg3_4: parseNum(p.row[4]),
    sum3_5: parseNum(p.row[5]),
    sum3_6_1: parseNum(p.row[6]),
    sum3_6_2: parseNum(p.row[7]),
    sum3_6_3: parseNum(p.row[8]),
    sum3_7: parseNum(p.row[9]),
    sum3_8: parseNum(p.row[10]),
    avgGroup3: parseNum(p.row[11]),
    reward3_1: parseNum(p.row[15]),
    reward3_2: parseNum(p.row[16]),
    reward3_3: parseNum(p.row[17]),
    reward3_4: parseNum(p.row[18]),
    reward3_5: parseNum(p.row[19]),
    reward3_6: parseNum(p.row[20]),
    reward3_7: parseNum(p.row[21]),
    reward3_8: parseNum(p.row[22]),
    rewardGroup3: parseNum(p.row[23])
  }));

  // --- GROUP 4 (Brand Image) ---
  // Starts at row 24, data rows 26..29
  const g4Periods = extractPeriods(26).map(p => ({
    ...p,
    avg4_1: parseNum(p.row[1]),
    avg4_2: parseNum(p.row[2]),
    avg4_3: parseNum(p.row[3]),
    sum4_4: parseNum(p.row[4]),
    sum4_5: parseNum(p.row[5]),
    sum4_6: parseNum(p.row[6]),
    avg4_7: parseNum(p.row[7]),
    avgGroup4: parseNum(p.row[8]),
    reward4_1: parseNum(p.row[15]),
    reward4_2: parseNum(p.row[16]),
    reward4_6: parseNum(p.row[17]),
    reward4_7: parseNum(p.row[18]),
    rewardGroup4: parseNum(p.row[19])
  }));

  // --- GROUP 5 (Development & Overall Totals) ---
  // Starts at row 32, data rows 34..37
  const g5Periods = extractPeriods(34).map(p => ({
    ...p,
    sum5_1: parseNum(p.row[1]),
    sum5_2: parseNum(p.row[2]),
    overallPercent: parseNum(p.row[3]),
    specialBonus: parseNum(p.row[12]),
    totalReward: parseNum(p.row[13])
  }));

  // Summary Overview per period
  const overview = ['m7', 'm8', 'm9', 'total'].map(periodId => {
    const g1 = g1Periods.find(p => p.id === periodId);
    const g2 = g2Periods.find(p => p.id === periodId);
    const g3 = g3Periods.find(p => p.id === periodId);
    const g4 = g4Periods.find(p => p.id === periodId);
    const g5 = g5Periods.find(p => p.id === periodId);

    return {
      periodId,
      key: g1.key,
      label: g1.label,
      overallPercent: g5.overallPercent,
      specialBonus: g5.specialBonus,
      totalReward: g5.totalReward,
      groupPercentages: {
        g1: g1.avgGroup1,
        g2: g2.avgGroup2,
        g3: g3.avgGroup3,
        g4: g4.avgGroup4
      },
      groupRewards: {
        g1: g1.rewardGroup1,
        g2: g2.rewardGroup2,
        g3: g3.rewardGroup3,
        g4: g4.rewardGroup4
      }
    };
  });

  return {
    overview,
    groups: {
      g1: { title: 'กลุ่มงาน 1: การจัดส่งตรงเวลาและรอบส่ง', periods: g1Periods },
      g2: { title: 'กลุ่มงาน 2: งานบริการ', periods: g2Periods },
      g3: { title: 'กลุ่มงาน 3: เอกสารและผลิตภัณฑ์', periods: g3Periods },
      g4: { title: 'กลุ่มงาน 4: ภาพลักษณ์และวินัย', periods: g4Periods },
      g5: { title: 'กลุ่มงาน 5: พัฒนายอดขายและสรุปภาพรวม', periods: g5Periods }
    }
  };
}
