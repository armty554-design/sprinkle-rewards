import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCw, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Award, 
  Coins, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Building2,
  Calendar
} from 'lucide-react';
import { idbGetItem, idbSetItem } from '../utils/idbStorage';

const STORAGE_KEY = 'sprinkle_looker_scores_csv';
const STORAGE_SYNC_TIME_KEY = 'sprinkle_looker_scores_sync_time';
const SPREADSHEET_ID = '1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc';
const GID_LOOKER_SCORES = '2115397650';

export default function LookerScoresView() {
  const [csvText, setCsvText] = useState('');
  const [syncTime, setSyncTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: '', msg: '' });

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, pass, fail
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Load cached CSV from IndexedDB on mount
  useEffect(() => {
    async function loadCache() {
      try {
        const cached = await idbGetItem(STORAGE_KEY);
        const time = await idbGetItem(STORAGE_SYNC_TIME_KEY);
        if (cached) {
          setCsvText(cached);
          if (time) setSyncTime(time);
        } else {
          // If no cache, auto sync from Google Sheet
          handleSync();
        }
      } catch (err) {
        console.error('Failed to load Looker scores cache:', err);
      }
    }
    loadCache();
  }, []);

  // Sync from Google Sheets CSV Export
  const handleSync = async () => {
    setIsLoading(true);
    setSyncStatus({ type: 'info', msg: 'กำลังดาวน์โหลดข้อมูล Looker ผลคะแนนแยกกลุ่มงาน...' });

    try {
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID_LOOKER_SCORES}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const text = await res.text();
      if (!text || text.length < 500) {
        throw new Error('ข้อมูลจากชีตมีขนาดเล็กผิดปกติ');
      }

      const now = new Date().toLocaleString('th-TH');
      setCsvText(text);
      setSyncTime(now);

      await idbSetItem(STORAGE_KEY, text);
      await idbSetItem(STORAGE_SYNC_TIME_KEY, now);

      setSyncStatus({ type: 'success', msg: `ซิงค์สำเร็จแล้ว (${(text.length / 1024).toFixed(1)} KB)` });
      setTimeout(() => setSyncStatus({ type: '', msg: '' }), 4000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus({ type: 'error', msg: `ซิงค์ไม่สำเร็จ: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // Parse CSV properly handling quotes and newlines
  const parsedData = useMemo(() => {
    if (!csvText) return { headers: [], rows: [], months: [], branches: [] };

    const parsedRows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentVal.trim());
        if (currentRow.some(c => c !== '')) {
          parsedRows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c !== '')) parsedRows.push(currentRow);
    }

    if (parsedRows.length === 0) return { headers: [], rows: [], months: [], branches: [] };

    const headers = parsedRows[0].map(h => h.replace(/\r?\n/g, ' '));
    const rawRows = parsedRows.slice(1);

    const monthSet = new Set();
    const branchSet = new Set();

    const formattedRows = rawRows.map((r, idx) => {
      const branch = r[2] || '';
      const month = r[3] || '';
      const empId = r[4] || '';
      const carNo = r[5] || '';
      const firstName = r[6] || '';
      const lastName = r[7] || '';
      const eligible = r[8] || '';
      const position = r[10] || '';
      const distance = r[11] || '0';
      const members = r[12] || '0';
      const deliveries = r[13] || '0';
      const bottlesPerCust = r[14] || '0';
      const metersPerBottle = r[15] || '0';
      const groupType = r[16] || '';

      // Group 1: จัดส่ง
      const scoreG1 = parseFloat(r[17]) || 0;
      const pctG1 = parseFloat(r[18]) || 0;
      const rewardG1 = parseFloat(r[19]?.replace(/,/g, '')) || 0;

      // Group 2: บริการ
      const scoreG2 = parseFloat(r[20]) || 0;
      const pctG2 = parseFloat(r[21]) || 0;
      const rewardG2 = parseFloat(r[22]?.replace(/,/g, '')) || 0;

      // Group 3: เอกสารและผลิตภัณฑ์
      const scoreG3 = parseFloat(r[23]) || 0;
      const pctG3 = parseFloat(r[24]) || 0;
      const rewardG3 = parseFloat(r[25]?.replace(/,/g, '')) || 0;

      // Group 4: ภาพลักษณ์แบรนด์
      const scoreG4 = parseFloat(r[26]) || 0;
      const pctG4 = parseFloat(r[27]) || 0;
      const rewardG4 = parseFloat(r[28]?.replace(/,/g, '')) || 0;

      // Summary
      const totalScore = parseFloat(r[29]) || 0;
      const totalPct = parseFloat(r[30]) || 0;
      const specialBonus = parseFloat(r[31]?.replace(/,/g, '')) || 0;
      const totalReward = parseFloat(r[33]?.replace(/,/g, '')) || 0;
      const zone = r[46] || '';
      const incentivePerBottle = parseFloat(r[47]) || 0;

      if (month) monthSet.add(month);
      if (branch) branchSet.add(branch);

      const isPass = totalPct >= 85;

      return {
        id: `${month}_${branch}_${carNo}_${idx}`,
        no: idx + 1,
        branch,
        month,
        empId,
        carNo,
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        eligible,
        position,
        distance,
        members,
        deliveries,
        bottlesPerCust,
        metersPerBottle,
        groupType,
        scoreG1, pctG1, rewardG1,
        scoreG2, pctG2, rewardG2,
        scoreG3, pctG3, rewardG3,
        scoreG4, pctG4, rewardG4,
        totalScore,
        totalPct,
        specialBonus,
        totalReward,
        zone,
        incentivePerBottle,
        isPass
      };
    });

    const months = Array.from(monthSet).sort();
    const branches = Array.from(branchSet).sort((a, b) => a.localeCompare(b, 'th'));

    return { headers, rows: formattedRows, months, branches };
  }, [csvText]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return parsedData.rows.filter(r => {
      if (selectedMonth !== 'all' && r.month !== selectedMonth) return false;
      if (selectedBranch !== 'all' && r.branch !== selectedBranch) return false;
      if (selectedStatus === 'pass' && !r.isPass) return false;
      if (selectedStatus === 'fail' && r.isPass) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          r.name.toLowerCase().includes(q) ||
          r.carNo.toLowerCase().includes(q) ||
          r.empId.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [parsedData.rows, selectedMonth, selectedBranch, selectedStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = filteredRows.length;
    if (totalCount === 0) {
      return {
        count: 0,
        passCount: 0,
        passRate: 0,
        avgTotalPct: 0,
        sumReward: 0,
        avgG1: 0,
        avgG2: 0,
        avgG3: 0,
        avgG4: 0
      };
    }

    let passCount = 0;
    let sumTotalPct = 0;
    let sumReward = 0;
    let sumG1 = 0;
    let sumG2 = 0;
    let sumG3 = 0;
    let sumG4 = 0;

    for (const r of filteredRows) {
      if (r.isPass) passCount++;
      sumTotalPct += r.totalPct;
      sumReward += r.totalReward;
      sumG1 += r.pctG1;
      sumG2 += r.pctG2;
      sumG3 += r.pctG3;
      sumG4 += r.pctG4;
    }

    return {
      count: totalCount,
      passCount,
      passRate: ((passCount / totalCount) * 100).toFixed(1),
      avgTotalPct: (sumTotalPct / totalCount).toFixed(2),
      sumReward,
      avgG1: (sumG1 / totalCount).toFixed(2),
      avgG2: (sumG2 / totalCount).toFixed(2),
      avgG3: (sumG3 / totalCount).toFixed(2),
      avgG4: (sumG4 / totalCount).toFixed(2)
    };
  }, [filteredRows]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Export filtered to CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const headerLine = 'ลำดับ,สาขา,เดือน,รหัสพนักงาน,เบอร์รถ,ชื่อ-สกุล,ตำแหน่ง,ยอดส่ง(ถัง),กลุ่มงานจัดส่ง(%),กลุ่มงานบริการ(%),กลุ่มงานเอกสาร(%),กลุ่มงานภาพลักษณ์(%),เปอร์เซ็นต์ทั้งหมด(%),รวมเงินรางวัล(บาท),สถานะ';
    const bodyLines = filteredRows.map(r => 
      `${r.no},"${r.branch}","${r.month}","${r.empId}","${r.carNo}","${r.name}","${r.position}",${r.deliveries},${r.pctG1},${r.pctG2},${r.pctG3},${r.pctG4},${r.totalPct},${r.totalReward},"${r.isPass ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}"`
    );
    const blob = new Blob(['\uFEFF' + [headerLine, ...bodyLines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `looker_scores_${selectedMonth}_${selectedBranch}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    ผลคะแนนแยกกลุ่มงาน 2569 (Looker Data)
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ครบ 18 สาขา 9 เดือน
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  เชื่อมต่อโดยตรงกับ Google Sheets (GID: {GID_LOOKER_SCORES}) รวมข้อมูลคะแนน 4 กลุ่มงานรายบุคคลทั้งหมด {parsedData.rows.length.toLocaleString()} รายการ
                </p>
              </div>
            </div>

            {syncTime && (
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ซิงค์ข้อมูลล่าสุดเมื่อ: <strong className="text-slate-600">{syncTime}</strong>
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'กำลังซิงค์...' : 'ซิงค์จาก Google Sheet'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredRows.length === 0}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              title="ส่งออก CSV ตามตัวกรอง"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>

            <a
              href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${GID_LOOKER_SCORES}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-200 transition-colors"
              title="เปิดชีตต้นฉบับใน Google Sheets"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatus.msg && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            syncStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            syncStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
            'bg-sky-50 text-sky-800 border border-sky-200'
          }`}>
            {syncStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> :
             syncStatus.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> :
             <RotateCw className="w-4 h-4 shrink-0 text-sky-600 animate-spin" />}
            <span>{syncStatus.msg}</span>
          </div>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Month selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              เดือน ({parsedData.months.length} เดือน)
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">ทุกเดือน (ม.ค. - ก.ย. 2569)</option>
              {parsedData.months.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Branch selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              สาขา ({parsedData.branches.length} สาขา)
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">ทุกสาขา (ครบ 18 สาขา)</option>
              {parsedData.branches.map(b => (
                <option key={b} value={b}>สาขา {b}</option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Award className="w-3 h-3 text-slate-400" />
              เกณฑ์มาตรฐาน (85%)
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pass">ผ่านเกณฑ์ (≥ 85%)</option>
              <option value="fail">ไม่ผ่านเกณฑ์ (&lt; 85%)</option>
            </select>
          </div>

          {/* Search Query */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-400" />
              ค้นหาพนักงาน / เบอร์รถ
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="พิมพ์ชื่อ, สกุล, รหัสพนักงาน, หรือเบอร์รถ..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Records */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>รายการที่แสดง</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {stats.count.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 ml-1">คน-เดือน</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            จากทั้งหมด {parsedData.rows.length.toLocaleString()} รายการ
          </p>
        </div>

        {/* Card 2: Pass Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>ผ่านเกณฑ์ (≥85%)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {stats.passRate}%
            <span className="text-xs font-normal text-slate-500 ml-1">({stats.passCount.toLocaleString()} คัน)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            คะแนนเฉลี่ยรวม {stats.avgTotalPct}%
          </p>
        </div>

        {/* Card 3: Total Rewards */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>รวมเงินรางวัล</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            ฿{stats.sumReward.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            เฉลี่ย ฿{stats.count > 0 ? Math.round(stats.sumReward / stats.count).toLocaleString() : 0} / คัน
          </p>
        </div>

        {/* Card 4: 4-Group Avg */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>เฉลี่ย 4 กลุ่มงาน</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-bold mt-1">
            <span className="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">จัดส่ง: {stats.avgG1}%</span>
            <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">บริการ: {stats.avgG2}%</span>
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">เอกสาร: {stats.avgG3}%</span>
            <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">แบรนด์: {stats.avgG4}%</span>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="font-semibold text-slate-700">
            แสดงรายการที่ <strong className="text-slate-900">{filteredRows.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> - <strong className="text-slate-900">{Math.min(page * pageSize, filteredRows.length)}</strong> จากทั้งหมด <strong className="text-slate-900">{filteredRows.length.toLocaleString()}</strong> รายการ
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">แสดงหน้าละ:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-12 text-center">#</th>
                <th className="px-3 py-3">สาขา</th>
                <th className="px-3 py-3">เดือน</th>
                <th className="px-3 py-3">เบอร์รถ</th>
                <th className="px-3 py-3">รหัสพนักงาน</th>
                <th className="px-3 py-3 min-w-[140px]">ชื่อ - สกุล</th>
                <th className="px-3 py-3">ยอดส่ง (ถัง)</th>
                <th className="px-3 py-3 text-right text-sky-700 bg-sky-50/50">จัดส่ง (%)</th>
                <th className="px-3 py-3 text-right text-indigo-700 bg-indigo-50/50">บริการ (%)</th>
                <th className="px-3 py-3 text-right text-amber-700 bg-amber-50/50">เอกสาร (%)</th>
                <th className="px-3 py-3 text-right text-purple-700 bg-purple-50/50">แบรนด์ (%)</th>
                <th className="px-3 py-3 text-right font-black text-slate-900">% รวมทั้งหมด</th>
                <th className="px-3 py-3 text-right font-black text-amber-600">เงินรางวัล (บาท)</th>
                <th className="px-3 py-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-400">
                    ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-medium">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">
                      {r.branch}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 font-medium whitespace-nowrap">
                      {r.month}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-sky-700">
                      {r.carNo}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-500">
                      {r.empId}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                      {r.name}
                      {r.position && (
                        <span className="block text-[10px] text-slate-400 font-normal">{r.position}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-medium">
                      {r.deliveries}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-sky-700 bg-sky-50/30">
                      {r.pctG1.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 bg-indigo-50/30">
                      {r.pctG2.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-700 bg-amber-50/30">
                      {r.pctG3.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-purple-700 bg-purple-50/30">
                      {r.pctG4.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-black text-slate-900">
                      <span className={`px-2 py-0.5 rounded-md ${
                        r.totalPct >= 95 ? 'bg-emerald-100 text-emerald-800' :
                        r.totalPct >= 85 ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {r.totalPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-600">
                      {r.totalReward > 0 ? `฿${r.totalReward.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.isPass ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ผ่าน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          ไม่ผ่าน
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-slate-500">
            หน้า <strong className="text-slate-800">{page}</strong> จากทั้งสิ้น <strong className="text-slate-800">{totalPages}</strong> หน้า
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Direct page buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              let pageNum = page;
              if (totalPages <= 5) {
                pageNum = idx + 1;
              } else if (page <= 3) {
                pageNum = idx + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + idx;
              } else {
                pageNum = page - 2 + idx;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    page === pageNum 
                      ? 'bg-emerald-600 text-white' 
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
