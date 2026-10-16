import fs from 'fs';

function cleanNum(val) {
  if (val === undefined || val === null || val === '') return 0;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseFullCSV(text) {
  const rows = [];
  let currentRow = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        currentRow[currentRow.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      rows.push(currentRow);
      currentRow = [''];
    } else {
      currentRow[currentRow.length - 1] += c;
    }
  }
  if (currentRow.length > 1 || currentRow[0] !== '') {
    rows.push(currentRow);
  }
  return rows;
}

function analyzeDriver(r) {
  const carCode = (r[3] || '').trim();
  const firstName = (r[4] || '').trim();
  const lastName = (r[5] || '').trim();
  const qualified = r[6] === 'YES';
  const totalDelivered = cleanNum(r[11]);
  const totalReward = cleanNum(r[155]);
  const totalScore = cleanNum(r[151]);
  const totalPercent = cleanNum(r[152]);
  const pendingDeduction = cleanNum(r[156]);
  const overallLevel = (r[168] || '').trim();
  const remark = (r[162] || '').trim();

  const defects = [];

  // General qualification
  if (!qualified) {
    defects.push({
      category: 'คุณสมบัติทั่วไป',
      code: 'GEN',
      severity: 'danger',
      title: 'อายุงานไม่ครบ 1 เดือน หรือ ยอดส่ง < 3,000 ถัง',
      detail: `ยอดส่งจริง ${totalDelivered.toLocaleString()} ถัง (ต่ำกว่าเกณฑ์ 3,000 ถัง) ส่งผลให้ไม่ได้รับเงินรางวัลมาตรฐาน`,
      impact: 'ไม่ได้รับรางวัลประจำเดือน'
    });
  }

  if (remark) {
    defects.push({
      category: 'หมายเหตุ',
      code: 'REM',
      severity: 'warning',
      title: 'หมายเหตุพิเศษจากสำนักงานใหญ่',
      detail: remark,
      impact: '-'
    });
  }

  // 1. กลุ่มงานจัดส่ง
  const g1Level = (r[164] || '').trim();
  const g1Score = cleanNum(r[49]);
  const g1Reward = cleanNum(r[51]);
  if (g1Level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: 'G1',
      severity: 'danger',
      title: 'กลุ่มงานจัดส่งตกเกณฑ์ (< 85%)',
      detail: `คะแนนรวมกลุ่ม 1 ได้ ${g1Score} คะแนน (${r[50]}%) ต่ำกว่าเกณฑ์มาตรฐาน 85%`,
      impact: `เงินรางวัลกลุ่ม 1: ${g1Reward} บาท`
    });
  }

  // 1.1 จัดส่งตรงเวลา
  const s11 = cleanNum(r[16]);
  const p11 = cleanNum(r[17]);
  const res11 = cleanNum(r[15]);
  if (p11 < 85 || s11 === 0) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.1',
      severity: s11 === 0 ? 'danger' : 'warning',
      title: 'จัดส่งตรงเวลาหลุดเป้าหมาย',
      detail: `ผลงานทำได้ ${res11}% (เกณฑ์มาตรฐานเต็ม 25 คะแนน) ได้ ${s11} คะแนน (${p11}%)`,
      impact: 'พลาดเงินรางวัลหัวข้อนี้'
    });
  }

  // 1.2 ตกรอบส่งสุทธิ
  const res12 = cleanNum(r[19]);
  const s12 = cleanNum(r[20]);
  if (res12 > 0 || s12 < 25) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.2',
      severity: 'warning',
      title: 'มีอัตราตกรอบส่งสุทธิ',
      detail: `มีตกรอบส่งสุทธิ ${res12}% (ได้ ${s12}/25 คะแนน)`,
      impact: `รางวัล 1.2 ได้ ${cleanNum(r[22])} บาท`
    });
  }

  // 1.3 ข้อร้องเรียน 01
  const count13 = cleanNum(r[23]);
  const s13 = cleanNum(r[25]);
  if (count13 > 0 || s13 < 20) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.3',
      severity: 'danger',
      title: 'มีข้อร้องเรียน 01',
      detail: `พบข้อร้องเรียนจำนวน ${count13} ครั้ง (ได้ ${s13}/20 คะแนน)`,
      impact: 'เสียคะแนนและพลาดรางวัล'
    });
  }

  // 1.4 ส่งไม่ครบจำนวน & ทำรายการไม่ตรง
  const c14_1 = cleanNum(r[28]);
  const score14_1 = cleanNum(r[29]);
  const c14_2 = cleanNum(r[30]);
  const reward14 = cleanNum(r[32]);
  if (c14_1 > 0 || c14_2 > 0 || reward14 < 0) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.4',
      severity: 'danger',
      title: 'ส่งไม่ครบจำนวน (001) หรือทำรายการไม่ตรงความเป็นจริง (38)',
      detail: `ส่งไม่ครบ ${c14_1} ครั้ง, ทำรายการไม่ตรง ${c14_2} ครั้ง (หักคะแนน ${score14_1})`,
      impact: `โดนหักเงินรางวัล ${reward14} บาท`
    });
  }

  // 1.5 GPS
  const s15 = cleanNum(r[34]);
  const p15 = cleanNum(r[35]);
  if (s15 < 15 || p15 < 100) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.5',
      severity: 'warning',
      title: 'GPS เกิน 100 เมตร',
      detail: `ผลงานทำได้ ${r[33]}% (ได้ ${s15}/15 คะแนน, ${p15}%)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // 1.6 ตกรอบส่งซ้ำ
  const res16 = cleanNum(r[37]);
  const s16 = cleanNum(r[38]);
  if (res16 > 0 || s16 < 10) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.6',
      severity: 'warning',
      title: 'มีตกรอบส่งซ้ำ',
      detail: `ตกรอบส่งซ้ำ ${res16}% (ได้ ${s16}/10 คะแนน)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // 1.8 ประเภทการรับน้ำ
  const s18 = cleanNum(r[46]);
  if (s18 < 15) {
    defects.push({
      category: 'กลุ่ม 1 จัดส่ง',
      code: '1.8',
      severity: 'warning',
      title: 'ประเภทการรับน้ำหลุดเกณฑ์',
      detail: `ผลงาน ${r[45]}% (ได้ ${s18}/15 คะแนน)`,
      impact: 'พลาดคะแนนเต็ม'
    });
  }

  // 2. กลุ่มงานบริการ
  const g2Level = (r[165] || '').trim();
  if (g2Level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 2 บริการ',
      code: 'G2',
      severity: 'danger',
      title: 'กลุ่มงานบริการตกเกณฑ์ (< 85%)',
      detail: `คะแนนรวมกลุ่ม 2 ได้ ${cleanNum(r[79])} (${r[80]}%)`,
      impact: `เงินรางวัลกลุ่ม 2: ${cleanNum(r[81])} บาท`
    });
  }

  // 2.3 สมาชิกยกเลิกเนื่องจากบริการ
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

  // 2.8 ติดตามการจัดส่งหลังย้ายรอบ
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

  // 3. กลุ่มงานเอกสารและผลิตภัณฑ์
  const g3Level = (r[166] || '').trim();
  if (g3Level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 3 เอกสาร',
      code: 'G3',
      severity: 'danger',
      title: 'กลุ่มงานเอกสารและผลิตภัณฑ์ตกเกณฑ์ (< 85%)',
      detail: `คะแนนรวมกลุ่ม 3 ได้ ${cleanNum(r[112])} (${r[113]}%) ต่ำกว่าเกณฑ์มาตรฐาน`,
      impact: `เงินรางวัลกลุ่ม 3: ${cleanNum(r[114])} บาท`
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

  // 4. กลุ่มงานภาพลักษณ์แบรนด์
  const g4Level = (r[167] || '').trim();
  if (g4Level === '< 85%') {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: 'G4',
      severity: 'danger',
      title: 'กลุ่มงานภาพลักษณ์แบรนด์ตกเกณฑ์ (< 85%)',
      detail: `คะแนนรวมกลุ่ม 4 ได้ ${cleanNum(r[140])} (${r[141]}%) ต่ำกว่าเกณฑ์มาตรฐาน`,
      impact: `เงินรางวัลกลุ่ม 4: ${cleanNum(r[142])} บาท`
    });
  }

  // 4.1 ความสะอาดรถ
  const res41 = (r[115] || '').trim();
  if (res41 === 'ผ่าน' || res41 === 'ไม่ได้ตรวจ' || res41 === 'ไม่ผ่าน') {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.1',
      severity: res41 === 'ไม่ผ่าน' || res41 === 'ไม่ได้ตรวจ' ? 'danger' : 'warning',
      title: `ความสะอาดรถได้ระดับ "${res41}"`,
      detail: `ความสะอาดของรถได้ ${res41} (ได้ ${cleanNum(r[116])}/15 คะแนน, ไม่ถึงระดับ "ดีมาก")`,
      impact: 'พลาดเงินรางวัลหัวข้อนี้ (200 บาท)'
    });
  }

  // 4.3 การแต่งกาย
  const res43 = (r[123] || '').trim();
  if (res43 === 'ผ่าน' || res43 === 'ไม่ได้ตรวจ' || res43 === 'ไม่ผ่าน') {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.3',
      severity: res43 === 'ไม่ผ่าน' ? 'danger' : 'warning',
      title: `การแต่งกายถูกต้องได้ระดับ "${res43}"`,
      detail: `การแต่งกายได้ ${res43} (ได้ ${cleanNum(r[124])}/15 คะแนน, ไม่ถึงระดับ "ดีมาก")`,
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
      title: 'มีข้อร้องเรียน (36) หรือ (05) พฤติกรรมไม่เหมาะสม',
      detail: `พบข้อร้องเรียนพฤติกรรม ${c44} ครั้ง (หัก ${s44} คะแนน)`,
      impact: 'ถูกหักคะแนนพฤติกรรม'
    });
  }

  // 4.5 ข้อร้องเรียนเรียกร้องค่าเสียหาย
  const c45 = cleanNum(r[130]);
  if (c45 > 0) {
    defects.push({
      category: 'กลุ่ม 4 ภาพลักษณ์',
      code: '4.5',
      severity: 'danger',
      title: 'มีข้อร้องเรียน (94) เรียกร้องค่าเสียหายจากบริษัท',
      detail: `พบข้อร้องเรียนค่าเสียหาย ${c45} ครั้ง`,
      impact: 'ถูกหักคะแนนหนัก (-35 ถึง -55/ครั้ง)'
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
      detail: `คะแนนได้ ${s47}/15 คะแนน (ผลงาน ${r[136]}%)`,
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

  // รอหักเดือนถัดไป
  if (pendingDeduction > 0) {
    defects.push({
      category: 'เงินรางวัล',
      code: 'DED',
      severity: 'danger',
      title: 'มียอดค้างรอหักในเดือนถัดไป',
      detail: `มียอดหักติดลบสะสมที่เงินรางวัลเดือนนี้ไม่พอหัก รอหักเดือนถัดไป ${pendingDeduction} บาท`,
      impact: `รอหัก ${pendingDeduction} บาท`
    });
  }

  return {
    carCode,
    name: `${firstName} ${lastName}`,
    zone: r[157],
    totalReward,
    totalScore,
    totalPercent,
    overallLevel,
    defectsCount: defects.length,
    defects
  };
}

const raw = fs.readFileSync('sheet_data.csv', 'utf8');
const rows = parseFullCSV(raw);

console.log('--- SAMPLE VEHICLE DEFECT ANALYSIS ---');
for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  const car = (r[3] || '').trim();
  if (car && !isNaN(parseInt(car[0]))) {
    const analysis = analyzeDriver(r);
    console.log(`\n================== เบอร์รถ: ${analysis.carCode} (${analysis.name}) ==================`);
    console.log(`รางวัล: ${analysis.totalReward.toLocaleString()} บาท | คะแนนรวม: ${analysis.totalScore} (${analysis.totalPercent}%) | ประเมิน: ${analysis.overallLevel}`);
    console.log(`จำนวนหัวข้อที่ตก/ถูกหัก: ${analysis.defectsCount} หัวข้อ`);
    analysis.defects.forEach((d, idx) => {
      console.log(`  ${idx+1}. [${d.code}] ${d.title} (${d.severity}): ${d.detail} [ผลกระทบ: ${d.impact}]`);
    });
  }
}
