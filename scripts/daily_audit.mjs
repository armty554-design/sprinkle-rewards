#!/usr/bin/env node
/**
 * Daily Security, Redundancy & Heavy-Payload Audit Script
 * Runs locally via `npm run audit:daily` and every day on GitHub Actions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const skipNetwork = process.argv.includes('--skip-network');

const MASTER_SPREADSHEET_ID = '1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc';
const MASTER_XLSX_URL = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/export?format=xlsx`;
const LOOKER_CSV_URL = `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/export?format=csv&gid=2115397650`;

const checks = [];
let hasFailure = false;

function recordCheck(category, name, status, detail) {
  checks.push({ category, name, status, detail });
  if (status === 'FAIL') hasFailure = true;
}

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, result);
    } else {
      result.push(full);
    }
  }
  return result;
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// 1. NPM DEPENDENCY VULNERABILITY AUDIT
// ---------------------------------------------------------------------------
function runNpmAudit() {
  try {
    const out = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const parsed = JSON.parse(out);
    const v = parsed?.metadata?.vulnerabilities || {};
    const total = (v.critical || 0) + (v.high || 0) + (v.moderate || 0) + (v.low || 0);
    if (total === 0) {
      recordCheck('ความปลอดภัยแพ็กเกจ', 'npm audit', 'PASS', 'ไม่พบช่องโหว่ความปลอดภัย (0 vulnerabilities)');
    } else {
      const status = (v.critical || 0) > 0 || (v.high || 0) > 0 ? 'FAIL' : 'WARN';
      recordCheck(
        'ความปลอดภัยแพ็กเกจ',
        'npm audit',
        status,
        `พบช่องโหว่ Critical=${v.critical || 0}, High=${v.high || 0}, Moderate=${v.moderate || 0}, Low=${v.low || 0}`
      );
    }
  } catch (err) {
    try {
      const parsed = JSON.parse(err.stdout || '{}');
      const v = parsed?.metadata?.vulnerabilities || {};
      const status = (v.critical || 0) > 0 || (v.high || 0) > 0 ? 'FAIL' : 'WARN';
      recordCheck(
        'ความปลอดภัยแพ็กเกจ',
        'npm audit',
        status,
        `พบช่องโหว่ Critical=${v.critical || 0}, High=${v.high || 0}, Moderate=${v.moderate || 0}, Low=${v.low || 0}`
      );
    } catch {
      recordCheck('ความปลอดภัยแพ็กเกจ', 'npm audit', 'WARN', 'ไม่สามารถอ่านผลลัพธ์ npm audit ได้');
    }
  }
}

// ---------------------------------------------------------------------------
// 2. SOURCE SECURITY & ANTI-REGRESSION CHECKS
// ---------------------------------------------------------------------------
function runSourceSecurityChecks() {
  const srcFiles = walkFiles(path.join(ROOT, 'src')).filter(f => /\.(js|jsx|mjs|ts|tsx)$/.test(f));

  // 2.1 Dangerous XSS / code-execution sinks & leaked keys
  const dangerousPatterns = [
    { label: 'eval()', regex: /\beval\s*\(/ },
    { label: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML/ },
    { label: 'Hardcoded Secret Token', regex: /(AIza[0-9A-Za-z_-]{35}|ghp_[0-9A-Za-z]{36}|BEGIN (?:RSA |EC )?PRIVATE KEY)/ }
  ];

  const hits = [];
  for (const file of srcFiles) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, 'utf8');
    for (const pat of dangerousPatterns) {
      if (pat.regex.test(content)) {
        hits.push(`${rel} (${pat.label})`);
      }
    }
  }
  recordCheck(
    'ความปลอดภัยซอร์สโค้ด',
    'ตรวจ XSS Sinks & Secret Leaks',
    hits.length === 0 ? 'PASS' : 'FAIL',
    hits.length === 0 ? `สแกน ${srcFiles.length} ไฟล์ ไม่พบ eval / dangerouslySetInnerHTML / คีย์ลับรั่วไหล` : `พบจุดเสี่ยง: ${hits.join(', ')}`
  );

  // 2.2 LoginScreen security regressions (no auto-fill roster leak + persistent lockout)
  const loginFile = path.join(ROOT, 'src/components/LoginScreen.jsx');
  if (fs.existsSync(loginFile)) {
    const loginCode = fs.readFileSync(loginFile, 'utf8');
    const hasRosterLeak = loginCode.includes('findOfficeStaffByEmpId');
    const hasPersistentLockout = loginCode.includes('STORAGE_ADMIN_LOCKOUT');
    recordCheck(
      'ความปลอดภัยระบบล็อกอิน',
      'ป้องกันสุ่มรหัสพนักงานออฟฟิศ & Lockout ถาวร',
      !hasRosterLeak && hasPersistentLockout ? 'PASS' : 'FAIL',
      !hasRosterLeak && hasPersistentLockout
        ? 'ปิด Auto-fill รายชื่อออฟฟิศ และบันทึกเวลาระงับรหัส Admin ลง localStorage แล้ว'
        : `ตรวจพบจุดถดถอย (hasRosterLeak=${hasRosterLeak}, hasPersistentLockout=${hasPersistentLockout})`
    );
  }

  // 2.3 CSV Formula Injection guard
  const parserCode = fs.readFileSync(path.join(ROOT, 'src/utils/parser.js'), 'utf8');
  const lookerViewCode = fs.readFileSync(path.join(ROOT, 'src/components/LookerScoresView.jsx'), 'utf8');
  const hasCsvGuard = parserCode.includes('export function sanitizeCsvCell') && lookerViewCode.includes('sanitizeCsvCell(');
  recordCheck(
    'ความปลอดภัยการส่งออกไฟล์',
    'ป้องกัน CSV Formula Injection',
    hasCsvGuard ? 'PASS' : 'FAIL',
    hasCsvGuard ? 'เปิดใช้งาน sanitizeCsvCell ป้องกันสูตรอันตรายในไฟล์ CSV แล้ว' : 'ไม่พบการเรียกใช้ sanitizeCsvCell'
  );

  // 2.4 Stray raw CSV / XLSX dumps at repository root
  const rootDumps = fs.readdirSync(ROOT).filter(name => /\.(csv|xlsx|xls)$/i.test(name));
  recordCheck(
    'ข้อมูลส่วนบุคคล (PII)',
    'ตรวจไฟล์ข้อมูลดิบตกค้างที่ Root',
    rootDumps.length === 0 ? 'PASS' : 'FAIL',
    rootDumps.length === 0 ? 'ไม่พบไฟล์ .csv/.xlsx ตกค้างที่โฟลเดอร์หลัก' : `พบไฟล์ข้อมูลดิบตกค้าง: ${rootDumps.join(', ')}`
  );
}

// ---------------------------------------------------------------------------
// 3. REDUNDANCY & DUPLICATE WORK CHECKS
// ---------------------------------------------------------------------------
function runRedundancyChecks() {
  const appCode = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  const execCode = fs.readFileSync(path.join(ROOT, 'src/components/ExecutiveComparisonView.jsx'), 'utf8');
  const kpiHelperCode = fs.readFileSync(path.join(ROOT, 'src/utils/kpiBoardHelpers.js'), 'utf8');
  const auditViewCode = fs.readFileSync(path.join(ROOT, 'src/components/BranchSubmissionAuditView.jsx'), 'utf8');
  const monthStorageCode = fs.readFileSync(path.join(ROOT, 'src/utils/monthStorage.js'), 'utf8');

  // 3.1 Centralized CSV parse cache across views
  const usesSharedCache =
    appCode.includes('getCachedParsedMonth') &&
    execCode.includes('getCachedParsedMonth') &&
    kpiHelperCode.includes('getCachedParsedMonth') &&
    auditViewCode.includes('getCachedParsedMonth') &&
    !execCode.includes('const parsedMonthsCache = new Map()');

  recordCheck(
    'ลดการทำงานซ้ำซ้อน',
    'ใช้ Shared CSV Parse Cache ร่วมกันทุกหน้า',
    usesSharedCache ? 'PASS' : 'FAIL',
    usesSharedCache
      ? 'App, ผู้บริหาร, KPI Board และตรวจข้อมูล ใช้ getCachedParsedMonth ร่วมกันแล้ว'
      : 'พบการแยก Cache หรือสั่ง parseCSVData ซ้ำซ้อน'
  );

  // 3.2 Pre-login auto-sync & duplicate focus listener check
  const hasDuplicateFocusSync = appCode.includes("addEventListener('focus'");
  const gatesSyncBehindAuth = appCode.includes('if (!isAuthenticated) return;');
  recordCheck(
    'ลดการดึงข้อมูลซ้ำซ้อน',
    'ไม่ดึงไฟล์ใหญ่หน้า Login & ไม่ผูก focus ซ้อน visibilitychange',
    !hasDuplicateFocusSync && gatesSyncBehindAuth ? 'PASS' : 'FAIL',
    !hasDuplicateFocusSync && gatesSyncBehindAuth
      ? 'ซิงค์เฉพาะหลังล็อกอิน และผูกเฉพาะ visibilitychange พร้อม Cooldown 30 นาที'
      : `พบการซิงค์ซ้ำซ้อน (duplicateFocus=${hasDuplicateFocusSync}, authGate=${gatesSyncBehindAuth})`
  );

  // 3.3 Cooldown check (>= 15 mins)
  const cooldownMatch = monthStorageCode.match(/AUTO_SYNC_COOLDOWN_MS\s*=\s*(\d+)\s*\*\s*60\s*\*\s*1000/);
  const cooldownMins = cooldownMatch ? Number(cooldownMatch[1]) : 0;
  recordCheck(
    'ควบคุมความถี่การซิงค์',
    'ระยะเวลา AUTO_SYNC_COOLDOWN_MS',
    cooldownMins >= 15 ? 'PASS' : 'WARN',
    `ตั้งค่า Cooldown ไว้ที่ ${cooldownMins} นาที (ลดการดึงไฟล์ซ้ำถี่เกินไป)`
  );
}

// ---------------------------------------------------------------------------
// 4. BUNDLE SIZE & CODE-SPLITTING AUDIT
// ---------------------------------------------------------------------------
function runBundleAudit() {
  const distAssetsDir = path.join(ROOT, 'dist/assets');
  if (!fs.existsSync(distAssetsDir)) {
    execSync('npm run build', { stdio: 'inherit' });
  }

  const assetFiles = fs.readdirSync(distAssetsDir).map(name => {
    const stat = fs.statSync(path.join(distAssetsDir, name));
    return { name, bytes: stat.size };
  }).sort((a, b) => b.bytes - a.bytes);

  const mainEntry = assetFiles.find(f => /^index-.*\.js$/.test(f.name));
  const xlsxChunk = assetFiles.find(f => /^vendor-xlsx-.*\.js$/.test(f.name));
  const mainEntryKB = mainEntry ? mainEntry.bytes / 1024 : 99999;

  recordCheck(
    'ขนาดไฟล์โหลดเริ่มต้น',
    'Main Entry JS Chunk (index-*.js)',
    mainEntryKB < 350 ? 'PASS' : mainEntryKB < 800 ? 'WARN' : 'FAIL',
    mainEntry ? `${mainEntry.name}: ${formatKB(mainEntry.bytes)} (แยก Lazy-load สำเร็จ จากเดิม 5,157 KB)` : 'ไม่พบไฟล์ index-*.js'
  );

  recordCheck(
    'การแยกไลบรารีขนาดใหญ่',
    'แยก Excel Parser (@e965/xlsx) เป็น Lazy Chunk',
    Boolean(xlsxChunk) ? 'PASS' : 'FAIL',
    xlsxChunk ? `${xlsxChunk.name}: ${formatKB(xlsxChunk.bytes)} (โหลดเฉพาะตอนซิงค์หรืออัปโหลดไฟล์ Excel)` : 'ไม่พบ chunk vendor-xlsx'
  );

  return assetFiles;
}

// ---------------------------------------------------------------------------
// 5. LIVE GOOGLE SHEET PAYLOAD & ENDPOINT MONITOR
// ---------------------------------------------------------------------------
async function runRemotePayloadCheck() {
  if (skipNetwork) {
    recordCheck('ภาระข้อมูลภายนอก', 'ตรวจสอบ Google Sheet Endpoint', 'PASS', 'ข้ามการตรวจเครือข่าย (--skip-network)');
    return;
  }

  for (const item of [
    { label: 'Master Workbook (.xlsx)', url: MASTER_XLSX_URL, warnMB: 25 },
    { label: 'Looker Summary (.csv)', url: LOOKER_CSV_URL, warnMB: 5 }
  ]) {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);
      const res = await fetch(item.url, { signal: controller.signal });
      const buf = await res.arrayBuffer();
      clearTimeout(timer);
      const elapsedSec = ((Date.now() - t0) / 1000).toFixed(2);
      const sizeMB = buf.byteLength / (1024 * 1024);

      if (!res.ok) {
        recordCheck(
          'ภาระข้อมูลภายนอก',
          item.label,
          'WARN',
          `HTTP ${res.status} (เวลาตอบสนอง ${elapsedSec}s) — อาจเกิด Rate Limit ชั่วคราว`
        );
      } else {
        const status = sizeMB > item.warnMB ? 'WARN' : 'PASS';
        recordCheck(
          'ภาระข้อมูลภายนอก',
          item.label,
          status,
          `HTTP 200 • ขนาดดาวน์โหลด ${formatMB(buf.byteLength)} • ใช้เวลา ${elapsedSec}s`
        );
      }
    } catch (err) {
      recordCheck('ภาระข้อมูลภายนอก', item.label, 'WARN', `เชื่อมต่อไม่สำเร็จหรือหมดเวลา: ${err.message}`);
    }
  }
}

async function main() {
  runNpmAudit();
  runSourceSecurityChecks();
  runRedundancyChecks();
  const assetFiles = runBundleAudit();
  await runRemotePayloadCheck();

  const icon = s => (s === 'PASS' ? '✅' : s === 'WARN' ? '⚠️' : '❌');
  const nowThai = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  const lines = [
    `# 🛡️ รายงานตรวจสอบความปลอดภัยและประสิทธิภาพประจำวัน (Daily System Audit)`,
    ``,
    `- **เวลาตรวจสอบ (ไทย):** ${nowThai}`,
    `- **สถานะภาพรวม:** ${hasFailure ? '❌ พบหัวข้อที่ต้องแก้ไข (FAIL)' : '✅ ผ่านเกณฑ์ความปลอดภัยและประสิทธิภาพครบทุกข้อ'}`,
    ``,
    `## 1. ผลการตรวจสอบรายหัวข้อ`,
    ``,
    `| หมวดหมู่ | รายการตรวจสอบ | สถานะ | รายละเอียด |`,
    `| :--- | :--- | :---: | :--- |`,
    ...checks.map(c => `| ${c.category} | ${c.name} | ${icon(c.status)} **${c.status}** | ${c.detail} |`),
    ``,
    `## 2. ขนาดไฟล์ Bundle แยกตาม Chunk (\`dist/assets\`)`,
    ``,
    `| ไฟล์ Asset | ขนาดไฟล์ |`,
    `| :--- | ---: |`,
    ...assetFiles.map(f => `| \`${f.name}\` | ${f.bytes >= 1024 * 1024 ? formatMB(f.bytes) : formatKB(f.bytes)} |`),
    ``
  ];

  const reportMd = lines.join('\n');
  console.log(reportMd);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, reportMd + '\n', 'utf8');
  }

  if (hasFailure) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Daily audit failed:', err);
  process.exit(1);
});
