import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  Printer, 
  ChevronRight, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Truck, 
  Coins, 
  ShieldAlert, 
  Sparkles, 
  Layers, 
  Info, 
  FileSpreadsheet,
  PlusCircle,
  FileText,
  X,
  Search,
  User,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { getCachedParsedMonth } from '../utils/parser.js';
import { formatThaiMonthLabel } from '../utils/monthStorage.js';

const COMPLAINT_CODES = ['1.3', '2.2', '2.3', '2.5', '2.6', '4.4', '4.5'];

function isComplaintDefect(d) {
  if (!d) return false;
  return COMPLAINT_CODES.includes(d.code) || Boolean(d.title?.includes('ข้อร้องเรียน'));
}

function extractComplaintRecords(vehicles = []) {
  const records = [];
  vehicles.forEach(v => {
    (v.defects || []).forEach(d => {
      if (isComplaintDefect(d)) {
        records.push({
          id: `${v.id}_${d.code}_${records.length}`,
          branch: v.general?.branch || '-',
          carCode: v.general?.carCode || '-',
          fullName: v.general?.fullName || '-',
          empId: v.general?.empId || '-',
          position: v.general?.position || '-',
          zone: v.general?.zone || '-',
          groupNumber: v.general?.groupNumber || '',
          supervisorLogisticsName: v.general?.supervisorLogisticsName || '',
          code: d.code,
          category: d.category || '',
          title: d.title || 'ข้อร้องเรียน',
          detail: d.detail || '',
          impact: d.impact || '',
          severity: d.severity || 'danger',
          totalPercent: v.totals?.totalPercent ?? 0,
          totalReward: v.totals?.totalReward ?? 0,
          vehicle: v
        });
      }
    });
  });
  return records;
}

export default function ExecutiveComparisonView({
  data,
  allMonthsList = [],
  selectedMonthKey,
  onSelectMonth,
  currentUser,
  onOpenUploadModal,
  onOpenDataManager,
  subTab: controlledSubTab,
  onSelectSubTab,
  trendBranchFilter: controlledTrendBranch,
  onSelectTrendBranch,
  onSelectVehicle,
}) {
  // Interactive Complaint Drill-down Modal state
  const [complaintModal, setComplaintModal] = useState(null); // { title, subtitle, branchFilter, codeFilter, search, records }

  const openComplaintModal = ({ title, subtitle = '', records = [], defaultBranch = 'all' }) => {
    setComplaintModal({
      title,
      subtitle,
      branchFilter: defaultBranch,
      codeFilter: 'all',
      search: '',
      records,
    });
  };

  // Sub-tabs in Executive View
  const [internalSubTab, setInternalSubTab] = useState('branches'); // 'branches', 'trend', 'head2head'
  const subTab = controlledSubTab || internalSubTab;
  const setSubTab = (next) => {
    if (typeof onSelectSubTab === 'function') {
      onSelectSubTab(next);
    } else {
      setInternalSubTab(next);
    }
  };
  
  // Head-to-Head month selectors
  const [h2hMonthA, setH2hMonthA] = useState(() => {
    return allMonthsList[1]?.key || allMonthsList[0]?.key || selectedMonthKey;
  });
  const [h2hMonthB, setH2hMonthB] = useState(() => {
    return selectedMonthKey || allMonthsList[0]?.key;
  });

  // Filter branch for trend view ('all' or specific branch)
  const [internalTrendBranch, setInternalTrendBranch] = useState('all');
  const trendBranchFilter = controlledTrendBranch || internalTrendBranch;
  const setTrendBranchFilter = (next) => {
    const val = !next || next === 'ALL' ? 'all' : next;
    if (typeof onSelectTrendBranch === 'function') {
      onSelectTrendBranch(val);
    } else {
      setInternalTrendBranch(val);
    }
  };

  // 1. EXTRACT BRANCHES FROM CURRENT MONTH
  const currentBranches = useMemo(() => {
    if (!data?.vehicles) return [];
    return Array.from(new Set(data.vehicles.map(v => v.general.branch).filter(Boolean))).sort();
  }, [data]);

  // 2. COMPUTE METRICS FOR EACH BRANCH IN CURRENT MONTH
  const branchComparisonData = useMemo(() => {
    if (!data?.vehicles || data.vehicles.length === 0) return [];

    return currentBranches.map(branchName => {
      const bVehicles = data.vehicles.filter(v => v.general.branch === branchName);
      const totalVehicles = bVehicles.length;
      if (totalVehicles === 0) return null;

      const totalRewards = bVehicles.reduce((sum, v) => sum + (v.totals?.totalReward || 0), 0);
      const avgReward = Math.round(totalRewards / totalVehicles);
      const eligibleCount = bVehicles.filter(v => v.general.qualified).length;
      const eligiblePercent = Math.round((eligibleCount / totalVehicles) * 100);
      const passCount = bVehicles.filter(v => Number(v.totals?.totalPercent || 0) >= 85).length;
      const passPercent = Math.round((passCount / totalVehicles) * 100);
      const withRewardCount = bVehicles.filter(v => (v.totals?.totalReward || 0) > 0).length;
      const withRewardPercent = Math.round((withRewardCount / totalVehicles) * 100);
      const totalPendingDeductions = bVehicles.reduce((sum, v) => sum + (v.totals?.pendingDeduction || 0), 0);
      
      const cleanCars = bVehicles.filter(v => !v.defects || v.defects.length === 0).length;
      const cleanPercent = Math.round((cleanCars / totalVehicles) * 100);
      const totalDefectsCount = bVehicles.reduce((sum, v) => sum + (v.defects?.length || 0), 0);
      const avgDefectsPerCar = (totalDefectsCount / totalVehicles).toFixed(1);

      // Group performance
      const g1Scores = bVehicles.map(v => v.groups?.group1?.percent || 0);
      const g2Scores = bVehicles.map(v => v.groups?.group2?.percent || 0);
      const g3Scores = bVehicles.map(v => v.groups?.group3?.percent || 0);
      const g4Scores = bVehicles.map(v => v.groups?.group4?.percent || 0);

      const avgG1 = Math.round(g1Scores.reduce((a, b) => a + b, 0) / totalVehicles);
      const avgG2 = Math.round(g2Scores.reduce((a, b) => a + b, 0) / totalVehicles);
      const avgG3 = Math.round(g3Scores.reduce((a, b) => a + b, 0) / totalVehicles);
      const avgG4 = Math.round(g4Scores.reduce((a, b) => a + b, 0) / totalVehicles);

      // Warning letters count & detailed complaints
      let warningLetters = 0;
      let damageClaimsCount = 0;
      const complaintRecords = extractComplaintRecords(bVehicles);
      const complaintsCount = complaintRecords.length;

      bVehicles.forEach(v => {
        (v.defects || []).forEach(d => {
          if (d.code === '5.2' || d.title?.includes('หนังสือเตือน')) warningLetters++;
          if (d.code === '4.5' || d.title?.includes('เรียกร้องค่าเสียหาย')) damageClaimsCount++;
        });
      });

      // Car type breakdown
      const fourWheelers = bVehicles.filter(v => v.general.carType?.includes('4') || v.general.carCode?.length === 5 && !v.general.carCode?.includes('L') && !v.general.carCode?.includes('S'));
      const sixWheelers = bVehicles.filter(v => v.general.carType?.includes('6') || v.general.carCode?.includes('L') || v.general.carCode?.includes('S'));

      // Weighted Executive Performance Index (0 - 100)
      const performanceIndex = Math.min(100, Math.round(
        (eligiblePercent * 0.4) + 
        (Math.min(100, (avgReward / 3500) * 100) * 0.3) + 
        (cleanPercent * 0.3)
      ));

      return {
        branchName,
        totalVehicles,
        totalRewards,
        avgReward,
        eligibleCount,
        eligiblePercent,
        passCount,
        passPercent,
        withRewardCount,
        withRewardPercent,
        totalPendingDeductions,
        cleanCars,
        cleanPercent,
        totalDefectsCount,
        avgDefectsPerCar,
        avgG1,
        avgG2,
        avgG3,
        avgG4,
        warningLetters,
        complaintsCount,
        complaintRecords,
        damageClaimsCount,
        fourWheelCount: fourWheelers.length,
        fourWheelAvgReward: fourWheelers.length > 0 ? Math.round(fourWheelers.reduce((s, v) => s + v.totals.totalReward, 0) / fourWheelers.length) : 0,
        sixWheelCount: sixWheelers.length,
        sixWheelAvgReward: sixWheelers.length > 0 ? Math.round(sixWheelers.reduce((s, v) => s + v.totals.totalReward, 0) / sixWheelers.length) : 0,
        performanceIndex,
        vehicles: bVehicles
      };
    }).filter(Boolean).sort((a, b) => b.performanceIndex - a.performanceIndex);
  }, [data, currentBranches]);

  // Overall Company Summary for Current Month
  const companySummary = useMemo(() => {
    if (!branchComparisonData || branchComparisonData.length === 0) return null;
    const totalVehicles = branchComparisonData.reduce((s, b) => s + b.totalVehicles, 0);
    const totalRewards = branchComparisonData.reduce((s, b) => s + b.totalRewards, 0);
    const avgReward = totalVehicles > 0 ? Math.round(totalRewards / totalVehicles) : 0;
    const passCount = branchComparisonData.reduce((s, b) => s + b.passCount, 0);
    const passPercent = totalVehicles > 0 ? Math.round((passCount / totalVehicles) * 100) : 0;
    const totalPendingDeductions = branchComparisonData.reduce((s, b) => s + b.totalPendingDeductions, 0);
    const totalComplaints = branchComparisonData.reduce((s, b) => s + b.complaintsCount, 0);
    const allComplaintRecords = branchComparisonData.flatMap(b => b.complaintRecords || []);
    const totalWarnings = branchComparisonData.reduce((s, b) => s + b.warningLetters, 0);

    return {
      totalBranches: branchComparisonData.length,
      totalVehicles,
      totalRewards,
      avgReward,
      passCount,
      passPercent,
      totalPendingDeductions,
      totalComplaints,
      allComplaintRecords,
      totalWarnings,
      isSummaryOnly: Boolean(data?.meta?.isSummaryOnly),
      topBranch: branchComparisonData[0] || null
    };
  }, [branchComparisonData, data]);

  // 3. MULTI-MONTH HISTORICAL TREND DATA (lazily computed only when 'trend' sub-tab is opened)
  const historicalTrendData = useMemo(() => {
    if (subTab !== 'trend' || !allMonthsList || allMonthsList.length === 0) return [];

    return allMonthsList.map(mObj => {
      const parsed = getCachedParsedMonth(mObj);
      if (!parsed || !parsed.vehicles || parsed.vehicles.length === 0) return null;

      let vehicles = parsed.vehicles;
      if (trendBranchFilter !== 'all') {
        vehicles = vehicles.filter(v => v.general.branch === trendBranchFilter);
      }

      const totalVehicles = vehicles.length;
      if (totalVehicles === 0) return null;

      const totalRewards = vehicles.reduce((sum, v) => sum + (v.totals?.totalReward || 0), 0);
      const avgReward = Math.round(totalRewards / totalVehicles);
      const passCount = vehicles.filter(v => Number(v.totals?.totalPercent || 0) >= 85).length;
      const passPercent = Math.round((passCount / totalVehicles) * 100);
      const totalPendingDeductions = vehicles.reduce((sum, v) => sum + (v.totals?.pendingDeduction || 0), 0);
      const defectCount = vehicles.reduce((sum, v) => sum + (v.defects?.length || 0), 0);

      // Get branches represented in this month
      const branchesInMonth = Array.from(new Set(vehicles.map(v => v.general.branch).filter(Boolean)));

      return {
        key: mObj.key,
        label: formatThaiMonthLabel(mObj.label || mObj.key),
        totalVehicles,
        totalRewards,
        avgReward,
        passCount,
        passPercent,
        totalPendingDeductions,
        defectCount,
        branches: branchesInMonth
      };
    }).filter(Boolean);
  }, [subTab, allMonthsList, trendBranchFilter]);

  // Compute MoM Delta for Trend
  const trendWithDelta = useMemo(() => {
    return historicalTrendData.map((item, idx) => {
      const prevMonth = historicalTrendData[idx + 1]; // next in array is chronologically older
      let rewardDelta = 0;
      let rewardDeltaPercent = 0;
      let passRateDelta = 0;

      if (prevMonth && prevMonth.totalRewards > 0) {
        rewardDelta = item.totalRewards - prevMonth.totalRewards;
        rewardDeltaPercent = Math.round(((item.totalRewards - prevMonth.totalRewards) / prevMonth.totalRewards) * 100);
        passRateDelta = item.passPercent - prevMonth.passPercent;
      }

      return {
        ...item,
        rewardDelta,
        rewardDeltaPercent,
        passRateDelta,
        hasPrev: !!prevMonth
      };
    });
  }, [historicalTrendData]);

  // Max reward for trend bar visual scaling
  const maxTrendReward = useMemo(() => {
    if (trendWithDelta.length === 0) return 1;
    return Math.max(...trendWithDelta.map(t => t.totalRewards), 1);
  }, [trendWithDelta]);

  // 4. HEAD-TO-HEAD MONTH A VS MONTH B DATA (lazily computed only when 'head2head' sub-tab is opened)
  const h2hData = useMemo(() => {
    if (subTab !== 'head2head') return null;
    const monthAObj = allMonthsList.find(m => m.key === h2hMonthA);
    const monthBObj = allMonthsList.find(m => m.key === h2hMonthB);

    const parsedA = getCachedParsedMonth(monthAObj);
    const parsedB = getCachedParsedMonth(monthBObj);

    if (!parsedA || !parsedB) return null;

    const calcSummary = (parsed) => {
      const vList = parsed.vehicles || [];
      const totalVehicles = vList.length;
      const totalRewards = vList.reduce((sum, v) => sum + (v.totals?.totalReward || 0), 0);
      const avgReward = totalVehicles > 0 ? Math.round(totalRewards / totalVehicles) : 0;
      const passCount = vList.filter(v => Number(v.totals?.totalPercent || 0) >= 85).length;
      const passPercent = totalVehicles > 0 ? Math.round((passCount / totalVehicles) * 100) : 0;
      const cleanCount = vList.filter(v => !v.defects || v.defects.length === 0).length;
      const pendingDeductions = vList.reduce((sum, v) => sum + (v.totals?.pendingDeduction || 0), 0);
      const totalDefects = vList.reduce((sum, v) => sum + (v.defects?.length || 0), 0);
      const complaintRecords = extractComplaintRecords(vList);
      const totalComplaints = complaintRecords.length;
      const totalWarnings = vList.reduce((sum, v) => {
        return sum + (v.defects || []).filter(d => d.code === '5.2' || d.title?.includes('หนังสือเตือน')).length;
      }, 0);

      return {
        totalVehicles,
        totalRewards,
        avgReward,
        passCount,
        passPercent,
        cleanCount,
        pendingDeductions,
        totalDefects,
        totalComplaints,
        complaintRecords,
        totalWarnings,
        isSummaryOnly: Boolean(parsed.meta?.isSummaryOnly)
      };
    };

    const sumA = calcSummary(parsedA);
    const sumB = calcSummary(parsedB);

    return {
      monthA: {
        key: h2hMonthA,
        label: formatThaiMonthLabel(monthAObj?.label || h2hMonthA),
        summary: sumA
      },
      monthB: {
        key: h2hMonthB,
        label: formatThaiMonthLabel(monthBObj?.label || h2hMonthB),
        summary: sumB
      },
      delta: {
        totalVehicles: sumB.totalVehicles - sumA.totalVehicles,
        totalRewards: sumB.totalRewards - sumA.totalRewards,
        totalRewardsPercent: sumA.totalRewards > 0 ? Math.round(((sumB.totalRewards - sumA.totalRewards) / sumA.totalRewards) * 100) : 0,
        avgReward: sumB.avgReward - sumA.avgReward,
        passPercent: sumB.passPercent - sumA.passPercent,
        pendingDeductions: sumB.pendingDeductions - sumA.pendingDeductions,
        totalDefects: sumB.totalDefects - sumA.totalDefects,
        totalComplaints: sumB.totalComplaints - sumA.totalComplaints,
        totalWarnings: sumB.totalWarnings - sumA.totalWarnings
      }
    };
  }, [subTab, allMonthsList, h2hMonthA, h2hMonthB]);

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP EXECUTIVE HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Executive Intelligence Suite
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-medium text-slate-300">
                ประจำงวด {formatThaiMonthLabel(data.meta.month || selectedMonthKey)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-sky-400 shrink-0" />
              <span>ศูนย์ข้อมูลเปรียบเทียบสำหรับผู้บริหาร</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              เครื่องมือวิเคราะห์เชิงเปรียบเทียบข้ามสาขา (Cross-Branch) และแนวโน้มรายเดือน (Month-over-Month) 
              สนับสนุนการตัดสินใจเชิงกลยุทธ์ ตรวจสอบการใช้จ่ายงบประมาณรางวัล และติดตามมาตรฐานการบริการ
            </p>
          </div>

          {/* Quick Actions & Month Switcher */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 no-print">
            
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer backdrop-blur-xs"
              title="พิมพ์รายงานสรุปผลงานระดับผู้บริหาร"
            >
              <Printer className="w-4 h-4 text-sky-300" />
              <span>พิมพ์รายงานผู้บริหาร</span>
            </button>

            {/* Sub-tab switcher pill */}
            <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center text-xs font-bold">
              <button
                onClick={() => setSubTab('branches')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  subTab === 'branches'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>เปรียบเทียบสาขา</span>
              </button>

              <button
                onClick={() => setSubTab('trend')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  subTab === 'trend'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>แนวโน้มข้ามเดือน</span>
              </button>

              <button
                onClick={() => setSubTab('head2head')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  subTab === 'head2head'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>เปรียบเทียบ 2 เดือน</span>
              </button>
            </div>
          </div>
        </div>

        {/* Executive Summary Counters Strip */}
        {companySummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">งบประมาณเงินรางวัลรวม</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                ฿{companySummary.totalRewards.toLocaleString()}
              </div>
              <span className="text-[10px] text-sky-300 block mt-0.5">
                เฉลี่ย ฿{companySummary.avgReward.toLocaleString()} / คัน
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">อัตราผ่านเกณฑ์มาตรฐาน (≥85%)</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
                {companySummary.passPercent}%
              </div>
              <span className="text-[10px] text-slate-300 block mt-0.5">
                ผ่าน {companySummary.passCount} จาก {companySummary.totalVehicles} คัน
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">สาขาที่เข้าร่วมประเมิน</span>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {companySummary.totalBranches} สาขา
              </div>
              <span className="text-[10px] text-slate-300 block mt-0.5 truncate">
                {branchComparisonData.map(b => b.branchName).join(', ')}
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">ยอดรอหักในเดือนถัดไป</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                ฿{companySummary.totalPendingDeductions.toLocaleString()}
              </div>
              {companySummary.isSummaryOnly ? (
                <span className="text-[10px] text-amber-200/90 block mt-0.5">
                  ข้อมูลสรุปรายกลุ่ม (Looker 69) — ไม่มีข้อมูลข้อร้องเรียน/ใบเตือนรายข้อ
                </span>
              ) : (
                <div className="text-[10px] text-slate-300 flex flex-wrap items-center gap-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() => openComplaintModal({
                      title: 'รายละเอียดข้อร้องเรียนทั้งหมด (ทุกสาขา)',
                      subtitle: `ประจำงวด ${formatThaiMonthLabel(data.meta.month || selectedMonthKey)} • รวม ${companySummary.totalComplaints} รายการ`,
                      records: companySummary.allComplaintRecords,
                      defaultBranch: 'all'
                    })}
                    className="inline-flex items-center gap-0.5 text-amber-300 hover:text-amber-200 underline decoration-amber-400/60 underline-offset-2 font-bold cursor-pointer"
                    title="คลิกเพื่อดูรายละเอียดข้อร้องเรียนทั้งหมด"
                  >
                    <span>ข้อร้องเรียน {companySummary.totalComplaints} ครั้ง</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <span>| เตือน {companySummary.totalWarnings} ใบ</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* VIEW 1: CROSS-BRANCH COMPARISON                                */}
      {/* ============================================================== */}
      {subTab === 'branches' && (
        <div className="space-y-6">

          {/* Banner if only 1 branch is loaded in current month */}
          {branchComparisonData.length === 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                    ปัจจุบันเดือนนี้มีข้อมูล 1 สาขา ({branchComparisonData[0].branchName})
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    คุณสามารถนำเข้าข้อมูลสาขาอื่น (เช่น บางพลี, สุขุมวิท 50) เข้ามาในเดือนนี้ผ่านปุ่ม "จัดการข้อมูล" หรือ "เพิ่มเดือนใหม่" (เลือกโหมดรวมสาขา) เพื่อเปรียบเทียบสาขาเคียงข้างกันได้ทันที หรือคลิกดูแท็บ "แนวโน้มข้ามเดือน"
                  </p>
                </div>
              </div>

              {(currentUser?.role === 'admin' || currentUser?.role === 'supervisor' || currentUser?.role === 'office') && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onOpenDataManager}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>จัดการข้อมูลสาขา</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Section: Top Branch Podium & Side-by-Side Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>อันดับและประสิทธิภาพผลงานรายสาขา</span>
                </h2>
                <p className="text-xs text-slate-500">
                  เปรียบเทียบอัตราผ่านเกณฑ์ (≥85%) ยอดจ่ายรางวัลเฉลี่ย และคะแนนมาตรฐานการปฏิบัติงานของแต่ละสาขา
                </p>
              </div>
            </div>

            {/* Grid of Branch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {branchComparisonData.map((branch, idx) => {
                const isChampion = idx === 0 && branchComparisonData.length > 1;

                return (
                  <div 
                    key={branch.branchName}
                    className={`bg-white rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                      isChampion 
                        ? 'border-amber-300 shadow-lg ring-2 ring-amber-400/20' 
                        : 'border-slate-200/90 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Champion ribbon if rank 1 */}
                    {isChampion && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-400 text-slate-950 font-black text-[10px] px-3 py-1 rounded-bl-xl shadow-2xs flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>สาขาผลงานอันดับ 1</span>
                      </div>
                    )}

                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                              idx === 0 ? 'bg-amber-100 text-amber-800' :
                              idx === 1 ? 'bg-slate-200 text-slate-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              #{idx + 1}
                            </span>
                            <h3 className="font-black text-slate-900 text-xl tracking-tight">
                              สาขา {branch.branchName}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            จำนวนกองรถ {branch.totalVehicles} คัน (4 ล้อ: {branch.fourWheelCount} | 6 ล้อ: {branch.sixWheelCount})
                          </p>
                        </div>
                      </div>

                      {/* Main KPI Stats */}
                      <div className="grid grid-cols-2 gap-3 mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">เงินรางวัลรวม</span>
                          <strong className="text-base font-black text-slate-900">
                            ฿{branch.totalRewards.toLocaleString()}
                          </strong>
                          <span className="text-[10px] text-sky-600 block mt-0.5">
                            เฉลี่ย ฿{branch.avgReward.toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">อัตราผ่านเกณฑ์ (≥85%)</span>
                          <strong className={`text-base font-black ${
                            branch.passPercent >= 90 ? 'text-emerald-600' :
                            branch.passPercent >= 80 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {branch.passPercent}%
                          </strong>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            ผ่าน {branch.passCount}/{branch.totalVehicles} คัน
                          </span>
                        </div>
                      </div>

                      {/* Group Performance Radar / Bars */}
                      <div className="mt-5 space-y-2.5">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          คะแนนเฉลี่ย 4 กลุ่มงาน:
                        </span>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-500">1. จัดส่งตรงเวลา & ตกรอบ</span>
                            <span className="font-bold text-slate-800">{branch.avgG1}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${branch.avgG1 >= 90 ? 'bg-sky-500' : branch.avgG1 >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, branch.avgG1)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-500">2. บริการ & ความสะอาด</span>
                            <span className="font-bold text-slate-800">{branch.avgG2}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${branch.avgG2 >= 90 ? 'bg-emerald-500' : branch.avgG2 >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, branch.avgG2)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-500">3. เอกสาร คูปอง & Postpaid</span>
                            <span className="font-bold text-slate-800">{branch.avgG3}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${branch.avgG3 >= 90 ? 'bg-indigo-500' : branch.avgG3 >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, branch.avgG3)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-500">4. ภาพลักษณ์ & วินัยจราจร</span>
                            <span className="font-bold text-slate-800">{branch.avgG4}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${branch.avgG4 >= 90 ? 'bg-purple-500' : branch.avgG4 >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, branch.avgG4)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Operational Alerts & Risk indicators */}
                      {data?.meta?.isSummaryOnly ? (
                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>โหมดข้อมูล: สรุปรายกลุ่ม (Looker 69)</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            ไม่มีแยกรายข้อ 1.1–4.7
                          </span>
                        </div>
                      ) : (
                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => openComplaintModal({
                              title: `รายละเอียดข้อร้องเรียน • สาขา ${branch.branchName}`,
                              subtitle: `ประจำงวด ${formatThaiMonthLabel(data.meta.month || selectedMonthKey)} • พบ ${branch.complaintsCount} รายการ`,
                              records: companySummary?.allComplaintRecords || branch.complaintRecords,
                              defaultBranch: branch.branchName
                            })}
                            className={`flex items-center gap-1.5 px-2.5 py-1 -ml-2 rounded-xl transition-all cursor-pointer ${
                              branch.complaintsCount > 0
                                ? 'bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 shadow-2xs'
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                            title="คลิกเพื่อดูรายละเอียดข้อร้องเรียนของสาขานี้"
                          >
                            <AlertTriangle className={`w-4 h-4 ${branch.complaintsCount > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                            <span className="text-slate-600 font-medium">ข้อร้องเรียน:</span>
                            <strong className={branch.complaintsCount > 0 ? 'text-amber-700 underline decoration-amber-400/70 underline-offset-2' : 'text-slate-700'}>
                              {branch.complaintsCount} ครั้ง
                            </strong>
                            {branch.complaintsCount > 0 && (
                              <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                            )}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className={`w-4 h-4 ${branch.warningLetters > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
                            <span className="text-slate-600 font-medium">ใบเตือน:</span>
                            <strong className={branch.warningLetters > 0 ? 'text-rose-600' : 'text-slate-700'}>
                              {branch.warningLetters} ใบ
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pending deduction bottom indicator */}
                    {branch.totalPendingDeductions > 0 && (
                      <div className="mt-4 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-[11px] flex items-center justify-between">
                        <span className="font-semibold">ยอดรอหักเดือนถัดไป:</span>
                        <strong className="font-black">฿{branch.totalPendingDeductions.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Side-by-Side Detailed Benchmark Matrix Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-500" />
                  <span>ตารางเปรียบเทียบตัวชี้วัดทุกด้าน (Executive Cross-Branch Matrix)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เปรียบเทียบตัวเลขละเอียดทุกมิติระหว่างสาขา พร้อมระบุสาขาผู้นำในแต่ละหมวด
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="py-3 px-4 font-bold text-slate-700 w-1/4">ตัวชี้วัดผลการดำเนินงาน</th>
                    {branchComparisonData.map(b => (
                      <th key={b.branchName} className="py-3 px-4 font-bold text-slate-900 text-right">
                        สาขา {b.branchName}
                      </th>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <th className="py-3 px-4 font-bold text-sky-900 bg-sky-50/60 text-right">
                        รวมทุกสาขา / ค่าเฉลี่ย
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  
                  {/* Fleet Size */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">จำนวนรถทั้งหมด (คัน)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-medium text-slate-700">
                        {b.totalVehicles} คัน
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-black text-sky-900 bg-sky-50/40">
                        {companySummary?.totalVehicles} คัน
                      </td>
                    )}
                  </tr>

                  {/* Standard Pass Rate (>= 85%) */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">อัตราผ่านเกณฑ์ ≥85% (%)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold ${
                          b.passPercent >= 90 ? 'bg-emerald-100 text-emerald-800' :
                          b.passPercent >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.passPercent}%
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {b.passCount}/{b.totalVehicles} คัน
                        </span>
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-bold text-sky-900 bg-sky-50/40">
                        {companySummary?.passPercent}%
                        <span className="text-[10px] text-sky-700/70 font-medium block mt-0.5">
                          {companySummary?.passCount}/{companySummary?.totalVehicles} คัน
                        </span>
                      </td>
                    )}
                  </tr>

                  {/* Total Rewards */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">ยอดเงินรางวัลรวม (บาท)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-black text-slate-900">
                        ฿{b.totalRewards.toLocaleString()}
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-black text-sky-900 bg-sky-50/40">
                        ฿{companySummary?.totalRewards.toLocaleString()}
                      </td>
                    )}
                  </tr>

                  {/* Avg Reward / Car */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">เงินรางวัลเฉลี่ยต่อคัน (บาท)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-bold text-sky-700">
                        ฿{b.avgReward.toLocaleString()}
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-black text-sky-900 bg-sky-50/40">
                        ฿{companySummary?.avgReward.toLocaleString()}
                      </td>
                    )}
                  </tr>

                  {/* Clean Cars Rate */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">สัดส่วนรถไม่ถูกหักเลย (Clean Fleet)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-medium text-slate-700">
                        {b.cleanCars} คัน ({b.cleanPercent}%)
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-medium text-sky-900 bg-sky-50/40">
                        -
                      </td>
                    )}
                  </tr>

                  {/* G1 Score */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">กลุ่ม 1 จัดส่งตรงเวลา (เฉลี่ย %)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-medium text-slate-700">
                        {b.avgG1}%
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-medium text-sky-900 bg-sky-50/40">
                        {Math.round(branchComparisonData.reduce((s, b) => s + b.avgG1, 0) / branchComparisonData.length)}%
                      </td>
                    )}
                  </tr>

                  {/* G2 Score */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">กลุ่ม 2 งานบริการ (เฉลี่ย %)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-medium text-slate-700">
                        {b.avgG2}%
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-medium text-sky-900 bg-sky-50/40">
                        {Math.round(branchComparisonData.reduce((s, b) => s + b.avgG2, 0) / branchComparisonData.length)}%
                      </td>
                    )}
                  </tr>

                  {/* G3 Score */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">กลุ่ม 3 เอกสาร & สต็อก (เฉลี่ย %)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-medium text-slate-700">
                        {b.avgG3}%
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-medium text-sky-900 bg-sky-50/40">
                        {Math.round(branchComparisonData.reduce((s, b) => s + b.avgG3, 0) / branchComparisonData.length)}%
                      </td>
                    )}
                  </tr>

                  {/* G4 Score */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">กลุ่ม 4 ภาพลักษณ์ & ปลอดภัย (เฉลี่ย %)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-medium text-slate-700">
                        {b.avgG4}%
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-medium text-sky-900 bg-sky-50/40">
                        {Math.round(branchComparisonData.reduce((s, b) => s + b.avgG4, 0) / branchComparisonData.length)}%
                      </td>
                    )}
                  </tr>

                  {/* Complaints Count */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <button
                        type="button"
                        onClick={() => !data?.meta?.isSummaryOnly && openComplaintModal({
                          title: 'รายละเอียดข้อร้องเรียนทั้งหมด (ทุกสาขา)',
                          subtitle: `ประจำงวด ${formatThaiMonthLabel(data.meta.month || selectedMonthKey)} • รวม ${companySummary?.totalComplaints || 0} รายการ`,
                          records: companySummary?.allComplaintRecords || [],
                          defaultBranch: 'all'
                        })}
                        className="inline-flex items-center gap-1 text-left font-semibold text-slate-800 hover:text-amber-700 cursor-pointer"
                        title="คลิกเพื่อดูรายละเอียดข้อร้องเรียนทั้งหมด"
                      >
                        <span>ข้อร้องเรียนทั้งหมด (ครั้ง)</span>
                        {!data?.meta?.isSummaryOnly && <ChevronRight className="w-3.5 h-3.5 text-amber-600" />}
                      </button>
                    </td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-bold text-amber-700">
                        {data?.meta?.isSummaryOnly ? (
                          <span className="text-xs font-medium text-slate-400">ไม่มีข้อมูลรายข้อ (Looker)</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openComplaintModal({
                              title: `รายละเอียดข้อร้องเรียน • สาขา ${b.branchName}`,
                              subtitle: `ประจำงวด ${formatThaiMonthLabel(data.meta.month || selectedMonthKey)} • พบ ${b.complaintsCount} รายการ`,
                              records: companySummary?.allComplaintRecords || b.complaintRecords,
                              defaultBranch: b.branchName
                            })}
                            className={`inline-flex items-center justify-end gap-0.5 px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                              b.complaintsCount > 0
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 underline decoration-amber-400 underline-offset-2'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                            title={`คลิกเพื่อดูข้อร้องเรียนสาขา ${b.branchName}`}
                          >
                            <span>{b.complaintsCount} ครั้ง</span>
                          </button>
                        )}
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-bold text-amber-900 bg-sky-50/40">
                        {data?.meta?.isSummaryOnly ? (
                          <span className="text-xs font-medium text-slate-400">-</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openComplaintModal({
                              title: 'รายละเอียดข้อร้องเรียนทั้งหมด (ทุกสาขา)',
                              subtitle: `ประจำงวด ${formatThaiMonthLabel(data.meta.month || selectedMonthKey)} • รวม ${companySummary?.totalComplaints || 0} รายการ`,
                              records: companySummary?.allComplaintRecords || [],
                              defaultBranch: 'all'
                            })}
                            className="inline-flex items-center justify-end gap-0.5 px-2 py-0.5 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 underline decoration-amber-500 underline-offset-2 cursor-pointer"
                            title="คลิกเพื่อดูรายละเอียดข้อร้องเรียนทั้งหมดทุกสาขา"
                          >
                            <span>{companySummary?.totalComplaints} ครั้ง</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Warning Letters */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">หนังสือเตือนพนักงาน (ใบ)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-bold text-rose-600">
                        {data?.meta?.isSummaryOnly ? (
                          <span className="text-xs font-medium text-slate-400">ไม่มีข้อมูลรายข้อ (Looker)</span>
                        ) : (
                          `${b.warningLetters} ใบ`
                        )}
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-bold text-rose-800 bg-sky-50/40">
                        {data?.meta?.isSummaryOnly ? (
                          <span className="text-xs font-medium text-slate-400">-</span>
                        ) : (
                          `${companySummary?.totalWarnings} ใบ`
                        )}
                      </td>
                    )}
                  </tr>

                  {/* Pending Deductions */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">ยอดรอหักเดือนถัดไป (บาท)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-black text-rose-600">
                        ฿{b.totalPendingDeductions.toLocaleString()}
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-black text-rose-800 bg-sky-50/40">
                        ฿{companySummary?.totalPendingDeductions.toLocaleString()}
                      </td>
                    )}
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Strategic Executive Commentary */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md">
            <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4" />
              <span>บทวิเคราะห์และข้อเสนอแนะเชิงบริหาร (Executive Strategic Insights)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>จุดเด่นประจำงวด</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {companySummary?.topBranch ? (
                    <>
                      สาขา <strong>{companySummary.topBranch.branchName}</strong> ครองอันดับ 1 ด้วยอัตราผ่านเกณฑ์มาตรฐาน (≥85%) <strong>{companySummary.topBranch.passPercent}%</strong> ({companySummary.topBranch.passCount}/{companySummary.topBranch.totalVehicles} คัน) และยอดเงินรางวัลเฉลี่ย <strong>฿{companySummary.topBranch.avgReward.toLocaleString()}</strong> ต่อคัน สะท้อนถึงการควบคุมวินัยจัดส่งและบริการที่ได้มาตรฐาน
                    </>
                  ) : 'ภาพรวมผลงานทุกสาขาอยู่ในเกณฑ์ควบคุม'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>จุดที่ต้องเฝ้าระวัง</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  พบยอดเงินรอหักในเดือนถัดไปรวม <strong>฿{companySummary?.totalPendingDeductions.toLocaleString()} บาท</strong> โดยเฉพาะการทำรายการ spd ผิดขั้นตอน และข้อร้องเรียนด้านบริการ ควรให้หัวหน้างานติดตามการหักคืนอย่างเคร่งครัด
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-1.5">
                  <Layers className="w-4 h-4" />
                  <span>ข้อสั่งการแนะนำ</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  กำชับหัวหน้างานและธุรการประจำสาขา ตรวจสอบการบันทึกคูปองค้างเก่า (3.3) และการส่งใบเตือน (5.2) ให้เสร็จสิ้นก่อนวันที่ 4 ของทุกเดือน เพื่อความถูกต้องและยุติธรรมในการคำนวณเงินรางวัล
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: MULTI-MONTH HISTORICAL TREND                          */}
      {/* ============================================================== */}
      {subTab === 'trend' && (
        <div className="space-y-6">
          
          {/* Controls: Branch Filter */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">ตัวกรองสาขาสำหรับแนวโน้ม:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setTrendBranchFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    trendBranchFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  รวมทุกสาขา
                </button>
                {currentBranches.map(b => (
                  <button
                    key={b}
                    onClick={() => setTrendBranchFilter(b)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      trendBranchFilter === b
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    สาขา {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              พบข้อมูลย้อนหลังทั้งหมด <strong>{trendWithDelta.length}</strong> เดือน
            </div>
          </div>

          {/* Visual Month-over-Month Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Latest Month Snapshot */}
            {trendWithDelta[0] && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  เดือนล่าสุด ({trendWithDelta[0].label})
                </span>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  ฿{trendWithDelta[0].totalRewards.toLocaleString()}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {trendWithDelta[0].rewardDelta >= 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      +{trendWithDelta[0].rewardDelta.toLocaleString()} บาท ({trendWithDelta[0].rewardDeltaPercent > 0 ? `+${trendWithDelta[0].rewardDeltaPercent}%` : '0%'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      {trendWithDelta[0].rewardDelta.toLocaleString()} บาท ({trendWithDelta[0].rewardDeltaPercent}%)
                    </span>
                  )}
                  <span className="text-xs text-slate-400">เทียบเดือนก่อน</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  กองรถ {trendWithDelta[0].totalVehicles} คัน | ผ่านเกณฑ์ (≥85%) {trendWithDelta[0].passPercent}% ({trendWithDelta[0].passCount}/{trendWithDelta[0].totalVehicles} คัน)
                </p>
              </div>
            )}

            {/* Peak Payout Month */}
            {trendWithDelta.length > 0 && (() => {
              const peakMonth = [...trendWithDelta].sort((a, b) => b.totalRewards - a.totalRewards)[0];
              return (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    เดือนที่จ่ายรางวัลสูงสุด (Peak Month)
                  </span>
                  <div className="text-2xl font-black text-emerald-600 mt-2">
                    ฿{peakMonth.totalRewards.toLocaleString()}
                  </div>
                  <div className="mt-3 text-xs font-bold text-slate-800">
                    {peakMonth.label}
                  </div>
                  <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                    เฉลี่ย ฿{peakMonth.avgReward.toLocaleString()} / คัน | ผ่านเกณฑ์ (≥85%) {peakMonth.passPercent}% ({peakMonth.passCount}/{peakMonth.totalVehicles} คัน)
                  </p>
                </div>
              );
            })()}

            {/* Overall Fleet Size & Health */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                สถิติความต่อเนื่องของข้อมูล
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {trendWithDelta.length} งวดประเมิน
              </div>
              <div className="mt-3 text-xs text-slate-600">
                ครอบคลุมตั้งแต่ {trendWithDelta[trendWithDelta.length - 1]?.label} ถึง {trendWithDelta[0]?.label}
              </div>
              <p className="text-xs text-sky-600 mt-3 pt-3 border-t border-slate-100 font-medium">
                พร้อมรองรับการเปรียบเทียบข้ามปี (2567 - 2569)
              </p>
            </div>

          </div>

          {/* Historical MoM Trend Table with Spark Bars */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <div className="mb-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-500" />
                <span>ตารางแนวโน้มผลงานและงบประมาณรางวัลย้อนหลัง (Month-over-Month History)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ติดตามการเปลี่ยนแปลงของยอดจ่ายเงินรางวัล อัตราผ่านเกณฑ์ (≥85%) และความผันแปรของผลงานในแต่ละงวด
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="py-3 px-4 font-bold text-slate-700">เดือน / งวดประเมิน</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-center">จำนวนรถ</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-center">อัตราผ่านเกณฑ์ (≥85%)</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">เงินรางวัลรวม</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">เฉลี่ย / คัน</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-right">ผลต่างเทียบเดือนก่อน</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-center">การเติบโต</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-center no-print">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trendWithDelta.map((row) => {
                    const isSelected = row.key === selectedMonthKey;

                    return (
                      <tr 
                        key={row.key} 
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isSelected ? 'bg-sky-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <strong className="text-slate-900">{row.label}</strong>
                            {isSelected && (
                              <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.2 rounded-full font-bold">
                                เดือนปัจจุบัน
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-700">
                          {row.totalVehicles} คัน
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            row.passPercent >= 90 ? 'bg-emerald-100 text-emerald-800' :
                            row.passPercent >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.passPercent}%
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {row.passCount}/{row.totalVehicles} คัน
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-slate-900 text-sm">
                            ฿{row.totalRewards.toLocaleString()}
                          </div>
                          {/* Mini visual bar */}
                          <div className="w-24 ml-auto bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                            <div 
                              className="bg-sky-500 h-full rounded-full"
                              style={{ width: `${Math.round((row.totalRewards / maxTrendReward) * 100)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-sky-700">
                          ฿{row.avgReward.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {row.hasPrev ? (
                            <span className={`inline-flex items-center gap-1 font-bold ${
                              row.rewardDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {row.rewardDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {row.rewardDelta >= 0 ? `+฿${row.rewardDelta.toLocaleString()}` : `-฿${Math.abs(row.rewardDelta).toLocaleString()}`}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {row.hasPrev ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              row.rewardDeltaPercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {row.rewardDeltaPercent >= 0 ? `+${row.rewardDeltaPercent}%` : `${row.rewardDeltaPercent}%`}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center no-print">
                          <button
                            onClick={() => onSelectMonth(row.key)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-500 hover:text-white text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            เปิดดู
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: HEAD-TO-HEAD (2 MONTHS COMPARISON)                     */}
      {/* ============================================================== */}
      {subTab === 'head2head' && (
        <div className="space-y-6">
          
          {/* Month Pickers for Head-to-Head */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-sky-500" />
              <span>เลือก 2 เดือนเพื่อเปรียบเทียบเคียงข้าง (Head-to-Head Comparison)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  เดือนที่ 1 (เดือนฐาน / ก่อนหน้า):
                </label>
                <select
                  value={h2hMonthA}
                  onChange={(e) => setH2hMonthA(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 cursor-pointer focus:ring-2 focus:ring-sky-500/20"
                >
                  {allMonthsList.map(m => (
                    <option key={m.key} value={m.key}>
                      {formatThaiMonthLabel(m.label || m.key)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200">
                <label className="text-xs font-bold text-sky-900 block mb-2">
                  เดือนที่ 2 (เดือนเปรียบเทียบ / ปัจจุบัน):
                </label>
                <select
                  value={h2hMonthB}
                  onChange={(e) => setH2hMonthB(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-sky-300 text-xs sm:text-sm font-semibold text-sky-950 cursor-pointer focus:ring-2 focus:ring-sky-500/20"
                >
                  {allMonthsList.map(m => (
                    <option key={m.key} value={m.key}>
                      {formatThaiMonthLabel(m.label || m.key)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Head to Head Table */}
          {h2hData && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-black text-slate-900">
                  ผลการเปรียบเทียบ: {h2hData.monthA.label} เทียบกับ {h2hData.monthB.label}
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="py-3 px-4 font-bold text-slate-700">ตัวชี้วัด</th>
                      <th className="py-3 px-4 font-bold text-slate-900 text-right">{h2hData.monthA.label}</th>
                      <th className="py-3 px-4 font-bold text-sky-900 text-right bg-sky-50/50">{h2hData.monthB.label}</th>
                      <th className="py-3 px-4 font-bold text-slate-900 text-right">ผลต่าง (Delta)</th>
                      <th className="py-3 px-4 font-bold text-slate-700 text-center">ทิศทาง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    
                    {/* Fleet */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">จำนวนรถที่ส่งงาน</td>
                      <td className="py-3 px-4 text-right text-slate-700">{h2hData.monthA.summary.totalVehicles} คัน</td>
                      <td className="py-3 px-4 text-right font-bold text-sky-900 bg-sky-50/30">{h2hData.monthB.summary.totalVehicles} คัน</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {h2hData.delta.totalVehicles >= 0 ? `+${h2hData.delta.totalVehicles}` : h2hData.delta.totalVehicles} คัน
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-slate-500 font-medium">-</span>
                      </td>
                    </tr>

                    {/* Total Rewards */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">ยอดเงินรางวัลรวม</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ฿{h2hData.monthA.summary.totalRewards.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sky-900 bg-sky-50/30">
                        ฿{h2hData.monthB.summary.totalRewards.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        <span className={h2hData.delta.totalRewards >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {h2hData.delta.totalRewards >= 0 ? `+฿${h2hData.delta.totalRewards.toLocaleString()}` : `-฿${Math.abs(h2hData.delta.totalRewards).toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          h2hData.delta.totalRewardsPercent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {h2hData.delta.totalRewardsPercent >= 0 ? `+${h2hData.delta.totalRewardsPercent}%` : `${h2hData.delta.totalRewardsPercent}%`}
                        </span>
                      </td>
                    </tr>

                    {/* Avg Reward */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">เงินรางวัลเฉลี่ยต่อคัน</td>
                      <td className="py-3 px-4 text-right text-slate-700">฿{h2hData.monthA.summary.avgReward.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-sky-900 bg-sky-50/30">฿{h2hData.monthB.summary.avgReward.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={h2hData.delta.avgReward >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {h2hData.delta.avgReward >= 0 ? `+฿${h2hData.delta.avgReward.toLocaleString()}` : `-฿${Math.abs(h2hData.delta.avgReward).toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {h2hData.delta.avgReward >= 0 ? (
                          <span className="text-emerald-600 font-bold">ดีขึ้น ↗</span>
                        ) : (
                          <span className="text-rose-600 font-bold">ลดลง ↘</span>
                        )}
                      </td>
                    </tr>

                    {/* Standard Pass % (>= 85%) */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">อัตราผ่านเกณฑ์ ≥85% (%)</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {h2hData.monthA.summary.passPercent}%{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({h2hData.monthA.summary.passCount}/{h2hData.monthA.summary.totalVehicles})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sky-900 bg-sky-50/30">
                        {h2hData.monthB.summary.passPercent}%{' '}
                        <span className="text-[10px] text-sky-700/70 font-normal">
                          ({h2hData.monthB.summary.passCount}/{h2hData.monthB.summary.totalVehicles})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={h2hData.delta.passPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {h2hData.delta.passPercent >= 0 ? `+${h2hData.delta.passPercent}%` : `${h2hData.delta.passPercent}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {h2hData.delta.passPercent >= 0 ? (
                          <span className="text-emerald-600 font-bold">ผ่านเพิ่มขึ้น</span>
                        ) : (
                          <span className="text-rose-600 font-bold">ผ่านลดลง</span>
                        )}
                      </td>
                    </tr>

                    {/* Pending Deductions */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">ยอดรอหักเดือนถัดไป (บาท)</td>
                      <td className="py-3 px-4 text-right text-rose-600 font-bold">฿{h2hData.monthA.summary.pendingDeductions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-rose-700 font-bold bg-sky-50/30">฿{h2hData.monthB.summary.pendingDeductions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={h2hData.delta.pendingDeductions <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {h2hData.delta.pendingDeductions >= 0 ? `+฿${h2hData.delta.pendingDeductions.toLocaleString()}` : `-฿${Math.abs(h2hData.delta.pendingDeductions).toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {h2hData.delta.pendingDeductions <= 0 ? (
                          <span className="text-emerald-600 font-bold">ลดลง (ดี)</span>
                        ) : (
                          <span className="text-rose-600 font-bold">เพิ่มขึ้น (เสี่ยง)</span>
                        )}
                      </td>
                    </tr>

                    {/* Complaints */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">ข้อร้องเรียนทั้งหมด</td>
                      <td className="py-3 px-4 text-right">
                        {h2hData.monthA.summary.isSummaryOnly ? (
                          <span className="text-xs text-slate-400">ไม่มีข้อมูลรายข้อ (Looker)</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openComplaintModal({
                              title: `รายละเอียดข้อร้องเรียน • ${h2hData.monthA.label}`,
                              subtitle: `รวมทั้งหมด ${h2hData.monthA.summary.totalComplaints} รายการ`,
                              records: h2hData.monthA.summary.complaintRecords || [],
                              defaultBranch: 'all'
                            })}
                            className="inline-flex items-center justify-end gap-0.5 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold underline decoration-amber-400 underline-offset-2 cursor-pointer"
                            title={`คลิกเพื่อดูรายละเอียดข้อร้องเรียนเดือน ${h2hData.monthA.label}`}
                          >
                            <span>{h2hData.monthA.summary.totalComplaints} ครั้ง</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold bg-sky-50/30">
                        {h2hData.monthB.summary.isSummaryOnly ? (
                          <span className="text-xs font-normal text-slate-400">ไม่มีข้อมูลรายข้อ (Looker)</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openComplaintModal({
                              title: `รายละเอียดข้อร้องเรียน • ${h2hData.monthB.label}`,
                              subtitle: `รวมทั้งหมด ${h2hData.monthB.summary.totalComplaints} รายการ`,
                              records: h2hData.monthB.summary.complaintRecords || [],
                              defaultBranch: 'all'
                            })}
                            className="inline-flex items-center justify-end gap-0.5 px-2 py-0.5 rounded-lg bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 font-bold underline decoration-amber-500 underline-offset-2 cursor-pointer"
                            title={`คลิกเพื่อดูรายละเอียดข้อร้องเรียนเดือน ${h2hData.monthB.label}`}
                          >
                            <span>{h2hData.monthB.summary.totalComplaints} ครั้ง</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {(h2hData.monthA.summary.isSummaryOnly || h2hData.monthB.summary.isSummaryOnly) ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          `${h2hData.delta.totalComplaints >= 0 ? `+${h2hData.delta.totalComplaints}` : h2hData.delta.totalComplaints} ครั้ง`
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(h2hData.monthA.summary.isSummaryOnly || h2hData.monthB.summary.isSummaryOnly) ? (
                          <span className="text-xs text-slate-400">ข้อมูลสรุปรายกลุ่ม</span>
                        ) : h2hData.delta.totalComplaints <= 0 ? (
                          <span className="text-emerald-600 font-bold">ลดลง</span>
                        ) : (
                          <span className="text-rose-600 font-bold">เพิ่มขึ้น</span>
                        )}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* INTERACTIVE COMPLAINT DETAILS MODAL                            */}
      {/* ============================================================== */}
      {complaintModal && (() => {
        const allRecords = complaintModal.records || [];
        const modalBranches = Array.from(new Set(allRecords.map(r => r.branch).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th'));
        const modalCodes = Array.from(new Set(allRecords.map(r => r.code).filter(Boolean))).sort();

        const filteredRecords = allRecords.filter(r => {
          if (complaintModal.branchFilter !== 'all' && r.branch !== complaintModal.branchFilter) return false;
          if (complaintModal.codeFilter !== 'all' && r.code !== complaintModal.codeFilter) return false;
          if (complaintModal.search.trim()) {
            const q = complaintModal.search.toLowerCase().trim();
            const match =
              r.carCode.toLowerCase().includes(q) ||
              r.fullName.toLowerCase().includes(q) ||
              r.empId.toLowerCase().includes(q) ||
              r.branch.toLowerCase().includes(q) ||
              r.zone.toLowerCase().includes(q) ||
              r.title.toLowerCase().includes(q) ||
              r.detail.toLowerCase().includes(q) ||
              r.code.toLowerCase().includes(q);
            if (!match) return false;
          }
          return true;
        });

        const uniqueCarsCount = new Set(filteredRecords.map(r => `${r.branch}_${r.carCode}`)).size;
        const codeCounts = filteredRecords.reduce((acc, r) => {
          acc[r.code] = (acc[r.code] || 0) + 1;
          return acc;
        }, {});

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print"
            onClick={() => setComplaintModal(null)}
          >
            <div
              className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-5 py-4 sm:px-6 sm:py-5 text-white flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      {complaintModal.title}
                    </h3>
                    <p className="text-xs text-amber-100 mt-0.5">
                      {complaintModal.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setComplaintModal(null)}
                  className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter & Summary Bar */}
              <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={complaintModal.search}
                      onChange={(e) => setComplaintModal(prev => ({ ...prev, search: e.target.value }))}
                      placeholder="ค้นหาเบอร์รถ, ชื่อ, รหัส, เขต..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  {/* Branch selector */}
                  <select
                    value={complaintModal.branchFilter}
                    onChange={(e) => setComplaintModal(prev => ({ ...prev, branchFilter: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="all">ทุกสาขา ({allRecords.length} รายการ)</option>
                    {modalBranches.map(b => {
                      const count = allRecords.filter(r => r.branch === b).length;
                      return (
                        <option key={b} value={b}>
                          สาขา {b} ({count} รายการ)
                        </option>
                      );
                    })}
                  </select>

                  {/* Complaint code selector */}
                  <select
                    value={complaintModal.codeFilter}
                    onChange={(e) => setComplaintModal(prev => ({ ...prev, codeFilter: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="all">ทุกหัวข้อร้องเรียน</option>
                    {modalCodes.map(c => (
                      <option key={c} value={c}>
                        ข้อ {c} ({allRecords.filter(r => r.code === c).length} รายการ)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Summary Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold">
                      แสดง {filteredRecords.length} รายการ ({uniqueCarsCount} คัน)
                    </span>
                    {Object.entries(codeCounts).map(([code, cnt]) => (
                      <span
                        key={code}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-[11px]"
                      >
                        ข้อ {code}: <strong className="text-rose-600">{cnt}</strong>
                      </span>
                    ))}
                  </div>
                  {(complaintModal.branchFilter !== 'all' || complaintModal.codeFilter !== 'all' || complaintModal.search) && (
                    <button
                      type="button"
                      onClick={() => setComplaintModal(prev => ({ ...prev, branchFilter: 'all', codeFilter: 'all', search: '' }))}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
              </div>

              {/* Complaint Records List */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
                {filteredRecords.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-slate-800">ไม่พบรายการข้อร้องเรียนตามเงื่อนไขที่เลือก</h4>
                    <p className="text-xs text-slate-400 mt-1">สาขาหรือหมวดหมู่นี้ไม่มีรถที่ถูกร้องเรียนในงวดนี้</p>
                  </div>
                ) : (
                  filteredRecords.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-amber-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        {/* Top row: Car code, Name, Branch, Zone */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-black text-xs">
                            {item.carCode}
                          </span>
                          <strong className="text-sm font-black text-slate-900">
                            {item.fullName}
                          </strong>
                          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                            สาขา {item.branch}
                          </span>
                          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.zone}
                          </span>
                          {item.groupNumber && (
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              กลุ่ม {item.groupNumber}
                            </span>
                          )}
                        </div>

                        {/* Employee ID & Supervisor metadata */}
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                          <span>รหัสพนักงาน: <strong className="text-slate-600">{item.empId}</strong> ({item.position})</span>
                          {item.supervisorLogisticsName && (
                            <>
                              <span>•</span>
                              <span>หัวหน้าสายงาน: <strong className="text-slate-600">{item.supervisorLogisticsName}</strong></span>
                            </>
                          )}
                          <span>•</span>
                          <span>คะแนนรวมทั้งเดือน: <strong className={item.totalPercent >= 85 ? 'text-emerald-600' : 'text-rose-600'}>{item.totalPercent}%</strong> (รางวัล ฿{Number(item.totalReward || 0).toLocaleString()})</span>
                        </div>

                        {/* Complaint Item Title & Detail */}
                        <div className="pt-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                              ข้อ {item.code}
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-rose-700">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1 font-medium">
                            {item.detail}
                          </p>
                          {item.impact && (
                            <span className="inline-block mt-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                              ผลกระทบ: {item.impact}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Drill-down to full vehicle score card if handler provided */}
                      {typeof onSelectVehicle === 'function' && item.vehicle && (
                        <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setComplaintModal(null);
                              onSelectVehicle(item.vehicle);
                            }}
                            className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>ดูผลคะแนนรถคันนี้</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  คลิกที่ปุ่ม "ดูผลคะแนนรถคันนี้" เพื่อตรวจสอบรายละเอียดคะแนนรายข้อทั้งหมดของพนักงาน
                </span>
                <button
                  type="button"
                  onClick={() => setComplaintModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PRINT-ONLY EXECUTIVE SIGNATURE FOOTER */}
      <div className="hidden print:block mt-12 pt-6 border-t border-slate-300 text-xs">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="h-14 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">ผู้จัดทำรายงาน / เจ้าหน้าที่วิเคราะห์</p>
            <p className="text-slate-500 text-[10px]">วันที่: ........................................</p>
          </div>
          <div>
            <div className="h-14 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">ผู้จัดการแผนกโลจิสติกส์ & จัดส่ง</p>
            <p className="text-slate-500 text-[10px]">วันที่: ........................................</p>
          </div>
          <div>
            <div className="h-14 border-b border-slate-400 mb-2"></div>
            <p className="font-bold">ผู้อำนวยการสายงานปฏิบัติการ (COO)</p>
            <p className="text-slate-500 text-[10px]">วันที่: ........................................</p>
          </div>
        </div>
      </div>

    </div>
  );
}
