import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  User, 
  Calendar, 
  Search, 
  Copy, 
  Printer, 
  Upload, 
  ExternalLink, 
  FileSpreadsheet, 
  Filter, 
  Sparkles, 
  ChevronRight, 
  Users, 
  Clock, 
  Check, 
  ShieldCheck,
  TrendingUp,
  RotateCw
} from 'lucide-react';
import { getOperationalBranches, getBranchOfficeStaff } from '../data/officeStaffData';
import { formatThaiMonthLabel } from '../utils/monthStorage';
import { parseCSVData } from '../utils/parser';

// Local cache for historical month parsed vehicles by branch
const monthBranchMapCache = new Map();

function getBranchPresenceInMonth(monthObj) {
  if (!monthObj || !monthObj.csv) return new Map();
  const cacheKey = `${monthObj.key}_${monthObj.csv.length}`;
  if (monthBranchMapCache.has(cacheKey)) {
    return monthBranchMapCache.get(cacheKey);
  }

  try {
    const parsed = parseCSVData(monthObj.csv);
    const branchMap = new Map(); // branchName -> { count, totalReward, qualifiedCount }
    (parsed.vehicles || []).forEach(v => {
      const b = (v.general.branch || '').trim();
      if (!b) return;
      if (!branchMap.has(b)) {
        branchMap.set(b, {
          count: 0,
          totalReward: 0,
          qualifiedCount: 0,
          vehicles: []
        });
      }
      const entry = branchMap.get(b);
      entry.count++;
      entry.totalReward += (v.totals?.totalReward || 0);
      if (v.general.qualified) entry.qualifiedCount++;
      entry.vehicles.push(v);
    });

    monthBranchMapCache.set(cacheKey, branchMap);
    return branchMap;
  } catch (err) {
    console.error(`Error checking branch presence in month ${monthObj.key}:`, err);
    return new Map();
  }
}

export default function BranchSubmissionAuditView({
  data,
  allMonthsList = [],
  selectedMonthKey,
  onSelectMonth,
  currentUser,
  onOpenUploadModal,
  onFilterBranchAndNavigate
}) {
  // 1. Operational branches derived exclusively from office staff data (excluding 'สำนักงาน')
  const operationalBranches = useMemo(() => {
    return getOperationalBranches();
  }, []);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'submitted', 'pending'
  const [auditViewMode, setAuditViewMode] = useState('current'); // 'current' (งวดปัจจุบัน), 'matrix' (ตารางทุกเดือน)
  const [copySuccess, setCopySuccess] = useState(false);

  // Current month label
  const currentMonthObj = useMemo(() => {
    return allMonthsList.find(m => m.key === selectedMonthKey) || allMonthsList[0] || { key: selectedMonthKey, label: selectedMonthKey };
  }, [allMonthsList, selectedMonthKey]);

  const currentMonthLabel = formatThaiMonthLabel(currentMonthObj.label || selectedMonthKey);

  // Current vehicles mapped by branch
  const currentBranchVehiclesMap = useMemo(() => {
    const map = new Map();
    if (!data?.vehicles) return map;

    data.vehicles.forEach(v => {
      const b = (v.general.branch || '').trim();
      if (!b) return;
      if (!map.has(b)) {
        map.set(b, []);
      }
      map.get(b).push(v);
    });

    return map;
  }, [data]);

  // Comprehensive branch audit list for current month
  const branchAuditList = useMemo(() => {
    return operationalBranches.map(branchName => {
      const officeStaff = getBranchOfficeStaff(branchName);
      const vehicles = currentBranchVehiclesMap.get(branchName) || [];
      const isSubmitted = vehicles.length > 0;

      // Calculate branch metrics if submitted
      let totalVehicles = vehicles.length;
      let totalRewards = 0;
      let avgReward = 0;
      let qualifiedCount = 0;
      let qualifiedPercent = 0;
      let pendingDeductions = 0;
      let defectCount = 0;

      if (isSubmitted) {
        totalRewards = vehicles.reduce((s, v) => s + (v.totals?.totalReward || 0), 0);
        avgReward = Math.round(totalRewards / totalVehicles);
        qualifiedCount = vehicles.filter(v => v.general.qualified).length;
        qualifiedPercent = Math.round((qualifiedCount / totalVehicles) * 100);
        pendingDeductions = vehicles.reduce((s, v) => s + (v.totals?.pendingDeduction || 0), 0);
        defectCount = vehicles.reduce((s, v) => s + (v.defects?.length || 0), 0);
      }

      // Group office staff by role
      const manager = officeStaff.find(s => s.position.includes('ผู้จัดการ')) || null;
      const logisticsSupervisors = officeStaff.filter(s => s.position.includes('โลจิสติกส์'));
      const adminSupervisors = officeStaff.filter(s => s.position.includes('ธุรการ'));
      const otherStaff = officeStaff.filter(s => 
        s !== manager && 
        !logisticsSupervisors.includes(s) && 
        !adminSupervisors.includes(s)
      );

      return {
        branchName,
        isSubmitted,
        totalVehicles,
        totalRewards,
        avgReward,
        qualifiedCount,
        qualifiedPercent,
        pendingDeductions,
        defectCount,
        officeStaff,
        manager,
        logisticsSupervisors,
        adminSupervisors,
        otherStaff
      };
    });
  }, [operationalBranches, currentBranchVehiclesMap]);

  // Filtered audit list based on search and status
  const filteredAuditList = useMemo(() => {
    return branchAuditList.filter(item => {
      // Status filter
      if (statusFilter === 'submitted' && !item.isSubmitted) return false;
      if (statusFilter === 'pending' && item.isSubmitted) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBranch = item.branchName.toLowerCase().includes(q);
        const matchStaff = item.officeStaff.some(s => 
          s.fullName.toLowerCase().includes(q) || 
          s.empId.toLowerCase().includes(q) ||
          s.position.toLowerCase().includes(q)
        );
        if (!matchBranch && !matchStaff) return false;
      }

      return true;
    });
  }, [branchAuditList, statusFilter, searchQuery]);

  // Overall Statistics for current month
  const stats = useMemo(() => {
    const total = branchAuditList.length;
    const submitted = branchAuditList.filter(b => b.isSubmitted).length;
    const pending = total - submitted;
    const submissionRate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    const totalLoggedFleet = branchAuditList.reduce((s, b) => s + b.totalVehicles, 0);
    const totalLoggedRewards = branchAuditList.reduce((s, b) => s + b.totalRewards, 0);

    return {
      total,
      submitted,
      pending,
      submissionRate,
      totalLoggedFleet,
      totalLoggedRewards
    };
  }, [branchAuditList]);

  // Cross-Month Matrix Data (for matrix view mode)
  const matrixData = useMemo(() => {
    if (auditViewMode !== 'matrix') return null;

    // Use recent up to 8 months
    const targetMonths = allMonthsList.slice(0, 8);

    const monthMaps = targetMonths.map(mObj => {
      return {
        monthKey: mObj.key,
        monthLabel: formatThaiMonthLabel(mObj.label || mObj.key),
        branchMap: getBranchPresenceInMonth(mObj)
      };
    });

    const rows = operationalBranches.map(branchName => {
      const records = monthMaps.map(m => {
        const branchEntry = m.branchMap.get(branchName);
        return {
          monthKey: m.monthKey,
          hasData: !!branchEntry,
          count: branchEntry?.count || 0,
          reward: branchEntry?.totalReward || 0
        };
      });

      const totalMonthsSubmitted = records.filter(r => r.hasData).length;

      return {
        branchName,
        records,
        totalMonthsSubmitted
      };
    });

    return {
      months: monthMaps,
      rows
    };
  }, [operationalBranches, allMonthsList, auditViewMode]);

  // Copy Follow-up message for LINE / Chat
  const handleCopyFollowUp = () => {
    const pendingBranches = branchAuditList.filter(b => !b.isSubmitted);
    const submittedBranches = branchAuditList.filter(b => b.isSubmitted);

    let text = `📢 แจ้งเตือนการตรวจสอบและบันทึกข้อมูลรางวัลมาตรฐานจัดส่ง\n`;
    text += `ประจำเดือน: ${currentMonthLabel}\n`;
    text += `สรุปภาพรวม: บันทึกข้อมูลแล้ว ${stats.submitted}/${stats.total} สาขา (${stats.submissionRate}%)\n\n`;

    if (pendingBranches.length > 0) {
      text += `⚠️ สาขาที่ยังไม่ได้บันทึกข้อมูล (${pendingBranches.length} สาขา):\n`;
      pendingBranches.forEach((b, idx) => {
        const lead = b.manager?.fullName || b.logisticsSupervisors[0]?.fullName || 'เจ้าหน้าที่สาขา';
        const pos = b.manager ? 'ผจก.สาขา' : b.logisticsSupervisors[0] ? 'หน.โลจิสติกส์' : 'ผู้รับผิดชอบ';
        text += `${idx + 1}. สาขา${b.branchName} (${pos}: ${lead})\n`;
      });
      text += `\n`;
    }

    if (submittedBranches.length > 0) {
      text += `✅ สาขาที่บันทึกข้อมูลเรียบร้อยแล้ว (${submittedBranches.length} สาขา):\n`;
      submittedBranches.forEach((b, idx) => {
        text += `${idx + 1}. สาขา${b.branchName} (${b.totalVehicles} คัน | ฿${b.totalRewards.toLocaleString()})\n`;
      });
    }

    text += `\nกรุณาเร่งบันทึกข้อมูลเข้าระบบเพื่อความถูกต้องในการจ่ายเงินรางวัลพนักงาน ขอบคุณครับ`;

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        
        {/* Glow Effects */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Branch Submission Audit
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-medium text-slate-300">
                ข้อมูล 19 สาขาปฏิบัติการ (อิงข้อมูลพนักงานออฟฟิศ ยกเว้นสำนักงาน)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-sky-400 shrink-0" />
              <span>ตรวจสอบการบันทึกข้อมูลของทุกสาขา</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              ติดตามและตรวจสอบสถานะการบันทึกข้อมูลผลคะแนนและเงินรางวัลมาตรฐานจัดส่งของแต่ละสาขาประจำงวด 
              พร้อมรายชื่อผู้รับผิดชอบ (ผจก.สาขา, หัวหน้าโลจิสติกส์, ธุรการ) เพื่อการติดตามทวงถามอย่างแม่นยำ
            </p>
          </div>

          {/* Quick Actions & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
            
            {/* Copy Follow-up message for LINE */}
            <button
              onClick={handleCopyFollowUp}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                copySuccess 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
              title="คัดลอกรายชื่อสาขาที่ยังไม่ส่งข้อมูลเพื่อส่ง LINE ติดตาม"
            >
              {copySuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4 text-sky-300" />}
              <span>{copySuccess ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอกข้อความทวงส่ง'}</span>
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-300" />
              <span className="hidden sm:inline">พิมพ์รายงาน</span>
            </button>

            {/* Upload Button */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'supervisor' || currentUser?.role === 'office') && (
              <button
                onClick={onOpenUploadModal}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>นำเข้าไฟล์สาขา</span>
              </button>
            )}

          </div>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] text-slate-400 font-medium block">สาขาทั้งหมด</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats.total} สาขา
            </div>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              สาขาปฏิบัติการทั่วประเทศ
            </span>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] text-slate-400 font-medium block">บันทึกข้อมูลแล้ว</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
              {stats.submitted} สาขา ({stats.submissionRate}%)
            </div>
            {/* Progress mini bar */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.submissionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] text-slate-400 font-medium block">ยังไม่บันทึกข้อมูล (รอส่ง)</span>
            <div className={`text-xl sm:text-2xl font-black mt-0.5 ${stats.pending > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {stats.pending} สาขา
            </div>
            <span className="text-[10px] text-amber-200 block mt-0.5">
              {stats.pending > 0 ? 'ต้องติดตามเร่งบันทึก' : 'ครบถ้วนทุกสาขาแล้ว!'}
            </span>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-[11px] text-slate-400 font-medium block">ยอดรถที่บันทึกแล้วในระบบ</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {stats.totalLoggedFleet} คัน
            </div>
            <span className="text-[10px] text-sky-300 block mt-0.5">
              รวมเงินรางวัล ฿{stats.totalLoggedRewards.toLocaleString()}
            </span>
          </div>

        </div>

      </div>

      {/* 2. CONTROLS STRIP (MONTH SELECTOR, SEARCH, FILTER, VIEW SWITCHER) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสาขา หรือชื่อพนักงาน..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>ยังไม่บันทึก ({stats.pending})</span>
            </button>
            <button
              onClick={() => setStatusFilter('submitted')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'submitted'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>บันทึกแล้ว ({stats.submitted})</span>
            </button>
          </div>

        </div>

        {/* Right: Month Selector & View Mode Switcher */}
        <div className="flex items-center space-x-3">
          
          {/* Month selector dropdown */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonthKey}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="py-1.5 pl-2 pr-7 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 cursor-pointer focus:ring-2 focus:ring-sky-500/20"
            >
              {allMonthsList.map(m => (
                <option key={m.key} value={m.key}>
                  {formatThaiMonthLabel(m.label || m.key)}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher (Current Month List vs Multi-Month Matrix) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setAuditViewMode('current')}
              className={`px-3 py-1 rounded-lg transition-all ${
                auditViewMode === 'current'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              งวดปัจจุบัน
            </button>
            <button
              onClick={() => setAuditViewMode('matrix')}
              className={`px-3 py-1 rounded-lg transition-all ${
                auditViewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ตารางทุกเดือน
            </button>
          </div>

        </div>

      </div>

      {/* ============================================================== */}
      {/* MODE 1: CURRENT MONTH AUDIT CARD GRID & TABLE                  */}
      {/* ============================================================== */}
      {auditViewMode === 'current' && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              แสดง <strong>{filteredAuditList.length}</strong> จากทั้งหมด {operationalBranches.length} สาขา
            </span>
            <span>
              ข้อมูลประจำงวด: <strong>{currentMonthLabel}</strong>
            </span>
          </div>

          {/* Grid of Branch Audit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredAuditList.map((branch) => {
              return (
                <div 
                  key={branch.branchName}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between ${
                    branch.isSubmitted 
                      ? 'border-emerald-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md' 
                      : 'border-slate-200 shadow-xs hover:border-rose-200 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Card Top: Branch Name & Submission Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                          branch.isSubmitted 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-lg tracking-tight">
                            สาขา {branch.branchName}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            เจ้าหน้าที่ออฟฟิศ {branch.officeStaff.length} ท่าน
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {branch.isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>บันทึกแล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>ยังไม่บันทึก</span>
                        </span>
                      )}
                    </div>

                    {/* Content Section: Depends on whether submitted */}
                    {branch.isSubmitted ? (
                      /* SUBMITTED METRICS */
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">จำนวนรถในสาขา</span>
                            <strong className="text-sm font-black text-slate-900">{branch.totalVehicles} คัน</strong>
                            <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">
                              ผ่านเกณฑ์ {branch.qualifiedPercent}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">เงินรางวัลรวม</span>
                            <strong className="text-sm font-black text-emerald-800">
                              ฿{branch.totalRewards.toLocaleString()}
                            </strong>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              เฉลี่ย ฿{branch.avgReward.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Extra indicators */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                          <span>รถที่มีข้อบกพร่อง: <strong className="text-slate-800">{branch.defectCount} ข้อ</strong></span>
                          {branch.pendingDeductions > 0 && (
                            <span className="text-rose-600 font-bold">
                              รอหัก: ฿{branch.pendingDeductions.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* PENDING: SHOW RESPONSIBLE PERSONS TO CHASE */
                      <div className="mt-4 space-y-2.5">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <span>ผู้รับผิดชอบประจำสาขา (สำหรับติดตาม)</span>
                            <Users className="w-3 h-3" />
                          </div>

                          {/* Branch Manager */}
                          {branch.manager ? (
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded-sm mr-1">
                                  ผจก.สาขา
                                </span>
                                <span className="font-bold text-slate-800">{branch.manager.fullName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">รหัส {branch.manager.empId}</span>
                            </div>
                          ) : null}

                          {/* Logistics Supervisor */}
                          {branch.logisticsSupervisors.length > 0 ? (
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded-sm mr-1">
                                  หน.โลจิสติกส์
                                </span>
                                <span className="font-bold text-slate-800">{branch.logisticsSupervisors[0].fullName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">รหัส {branch.logisticsSupervisors[0].empId}</span>
                            </div>
                          ) : null}

                          {/* Admin Supervisor */}
                          {branch.adminSupervisors.length > 0 ? (
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded-sm mr-1">
                                  ธุรการบริการ
                                </span>
                                <span className="font-bold text-slate-800">{branch.adminSupervisors[0].fullName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">รหัส {branch.adminSupervisors[0].empId}</span>
                            </div>
                          ) : null}

                          {branch.officeStaff.length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">
                              ไม่พบรายชื่อในทะเบียนพนักงานออฟฟิศ
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    {branch.isSubmitted ? (
                      <button
                        onClick={() => onFilterBranchAndNavigate && onFilterBranchAndNavigate(branch.branchName)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>ตรวจผลงานสาขา {branch.branchName}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={onOpenUploadModal}
                        className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>นำเข้าข้อมูลสาขานี้</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {filteredAuditList.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-base">ไม่พบสาขาตามเงื่อนไขที่เลือก</h4>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น 'ทั้งหมด'</p>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: MULTI-MONTH SUBMISSION MATRIX TABLE                    */}
      {/* ============================================================== */}
      {auditViewMode === 'matrix' && matrixData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sky-500" />
                <span>ตารางติดตามการบันทึกข้อมูลย้อนหลังทุกเดือน (Cross-Month Audit Grid)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ตรวจสอบความต่อเนื่องในการส่งข้อมูลของทั้ง 19 สาขา ย้อนหลังแต่ละงวด
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-3 px-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[140px]">
                    สาขาปฏิบัติการ
                  </th>
                  {matrixData.months.map(m => (
                    <th key={m.monthKey} className="py-3 px-3 font-bold text-slate-800 text-center min-w-[100px]">
                      {m.monthLabel}
                    </th>
                  ))}
                  <th className="py-3 px-3 font-bold text-slate-800 text-center bg-slate-100/60">
                    ความสมบูรณ์
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.rows.map((row) => {
                  return (
                    <tr key={row.branchName} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white">
                        {row.branchName}
                      </td>
                      
                      {row.records.map((rec) => {
                        return (
                          <td key={rec.monthKey} className="py-3 px-3 text-center">
                            {rec.hasData ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>{rec.count} คัน</span>
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-400">
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-center font-bold text-slate-700 bg-slate-50/50">
                        {row.totalMonthsSubmitted}/{matrixData.months.length} เดือน
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINT-ONLY AUDIT SUMMARY SHEET FOOTER */}
      <div className="hidden print:block mt-12 pt-6 border-t border-slate-300 text-xs">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="h-14 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">เจ้าหน้าที่ธุรการ / ผู้ตรวจสอบ</p>
            <p className="text-slate-500 text-[10px]">วันที่: ........................................</p>
          </div>
          <div>
            <div className="h-14 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">หัวหน้าส่วนงานข้อมูลโลจิสติกส์</p>
            <p className="text-slate-500 text-[10px]">วันที่: ........................................</p>
          </div>
          <div>
            <div className="h-14 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">ผู้จัดการฝ่ายปฏิบัติการจัดส่ง</p>
            <p className="text-slate-500 text-[10px]">วันที่: ........................................</p>
          </div>
        </div>
      </div>

    </div>
  );
}
