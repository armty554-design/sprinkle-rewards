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
  FileText
} from 'lucide-react';
import { parseCSVData } from '../utils/parser.js';
import { formatThaiMonthLabel } from '../utils/monthStorage.js';

// Cache for parsed historical months so navigation is instant
const parsedMonthsCache = new Map();

function getCachedParsedMonth(monthObj) {
  if (!monthObj || !monthObj.csv) return null;
  const cacheKey = `${monthObj.key}_${monthObj.csv.length}`;
  if (parsedMonthsCache.has(cacheKey)) {
    return parsedMonthsCache.get(cacheKey);
  }
  try {
    const parsed = parseCSVData(monthObj.csv);
    parsedMonthsCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error(`Failed to parse month ${monthObj.key}:`, err);
    return null;
  }
}

export default function ExecutiveComparisonView({
  data,
  allMonthsList = [],
  selectedMonthKey,
  onSelectMonth,
  currentUser,
  onOpenUploadModal,
  onOpenDataManager
}) {
  // Sub-tabs in Executive View
  const [subTab, setSubTab] = useState('branches'); // 'branches', 'trend', 'head2head'
  
  // Head-to-Head month selectors
  const [h2hMonthA, setH2hMonthA] = useState(() => {
    return allMonthsList[1]?.key || allMonthsList[0]?.key || selectedMonthKey;
  });
  const [h2hMonthB, setH2hMonthB] = useState(() => {
    return selectedMonthKey || allMonthsList[0]?.key;
  });

  // Filter branch for trend view ('all' or specific branch)
  const [trendBranchFilter, setTrendBranchFilter] = useState('all');

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
      const qualifiedCount = bVehicles.filter(v => v.general.qualified).length;
      const qualifiedPercent = Math.round((qualifiedCount / totalVehicles) * 100);
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

      // Warning letters count & severe complaints
      let warningLetters = 0;
      let complaintsCount = 0;
      let damageClaimsCount = 0;

      bVehicles.forEach(v => {
        (v.defects || []).forEach(d => {
          if (d.code === '5.2' || d.title?.includes('หนังสือเตือน')) warningLetters++;
          if (['1.3', '2.5', '2.6', '4.4', '4.5'].includes(d.code) || d.title?.includes('ข้อร้องเรียน')) complaintsCount++;
          if (d.code === '4.5' || d.title?.includes('เรียกร้องค่าเสียหาย')) damageClaimsCount++;
        });
      });

      // Car type breakdown
      const fourWheelers = bVehicles.filter(v => v.general.carType?.includes('4') || v.general.carCode?.length === 5 && !v.general.carCode?.includes('L') && !v.general.carCode?.includes('S'));
      const sixWheelers = bVehicles.filter(v => v.general.carType?.includes('6') || v.general.carCode?.includes('L') || v.general.carCode?.includes('S'));

      // Weighted Executive Performance Index (0 - 100)
      const performanceIndex = Math.min(100, Math.round(
        (qualifiedPercent * 0.4) + 
        (Math.min(100, (avgReward / 3500) * 100) * 0.3) + 
        (cleanPercent * 0.3)
      ));

      return {
        branchName,
        totalVehicles,
        totalRewards,
        avgReward,
        qualifiedCount,
        qualifiedPercent,
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
    const qualifiedCount = branchComparisonData.reduce((s, b) => s + b.qualifiedCount, 0);
    const qualifiedPercent = totalVehicles > 0 ? Math.round((qualifiedCount / totalVehicles) * 100) : 0;
    const totalPendingDeductions = branchComparisonData.reduce((s, b) => s + b.totalPendingDeductions, 0);
    const totalComplaints = branchComparisonData.reduce((s, b) => s + b.complaintsCount, 0);
    const totalWarnings = branchComparisonData.reduce((s, b) => s + b.warningLetters, 0);

    return {
      totalBranches: branchComparisonData.length,
      totalVehicles,
      totalRewards,
      avgReward,
      qualifiedCount,
      qualifiedPercent,
      totalPendingDeductions,
      totalComplaints,
      totalWarnings,
      topBranch: branchComparisonData[0] || null
    };
  }, [branchComparisonData]);

  // 3. MULTI-MONTH HISTORICAL TREND DATA
  const historicalTrendData = useMemo(() => {
    if (!allMonthsList || allMonthsList.length === 0) return [];

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
      const qualifiedCount = vehicles.filter(v => v.general.qualified).length;
      const qualifiedPercent = Math.round((qualifiedCount / totalVehicles) * 100);
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
        qualifiedCount,
        qualifiedPercent,
        totalPendingDeductions,
        defectCount,
        branches: branchesInMonth
      };
    }).filter(Boolean);
  }, [allMonthsList, trendBranchFilter]);

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
        passRateDelta = item.qualifiedPercent - prevMonth.qualifiedPercent;
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

  // 4. HEAD-TO-HEAD MONTH A VS MONTH B DATA
  const h2hData = useMemo(() => {
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
      const qualifiedCount = vList.filter(v => v.general.qualified).length;
      const qualifiedPercent = totalVehicles > 0 ? Math.round((qualifiedCount / totalVehicles) * 100) : 0;
      const cleanCount = vList.filter(v => !v.defects || v.defects.length === 0).length;
      const pendingDeductions = vList.reduce((sum, v) => sum + (v.totals?.pendingDeduction || 0), 0);
      const totalDefects = vList.reduce((sum, v) => sum + (v.defects?.length || 0), 0);
      const totalComplaints = vList.reduce((sum, v) => {
        return sum + (v.defects || []).filter(d => ['1.3', '2.5', '2.6', '4.4', '4.5'].includes(d.code)).length;
      }, 0);
      const totalWarnings = vList.reduce((sum, v) => {
        return sum + (v.defects || []).filter(d => d.code === '5.2' || d.title?.includes('หนังสือเตือน')).length;
      }, 0);

      return {
        totalVehicles,
        totalRewards,
        avgReward,
        qualifiedCount,
        qualifiedPercent,
        cleanCount,
        pendingDeductions,
        totalDefects,
        totalComplaints,
        totalWarnings
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
        qualifiedPercent: sumB.qualifiedPercent - sumA.qualifiedPercent,
        pendingDeductions: sumB.pendingDeductions - sumA.pendingDeductions,
        totalDefects: sumB.totalDefects - sumA.totalDefects,
        totalComplaints: sumB.totalComplaints - sumA.totalComplaints,
        totalWarnings: sumB.totalWarnings - sumA.totalWarnings
      }
    };
  }, [allMonthsList, h2hMonthA, h2hMonthB]);

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
              <span className="text-[11px] text-slate-400 font-medium block">อัตราผ่านเกณฑ์มาตรฐาน</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
                {companySummary.qualifiedPercent}%
              </div>
              <span className="text-[10px] text-slate-300 block mt-0.5">
                ผ่าน {companySummary.qualifiedCount} จาก {companySummary.totalVehicles} คัน
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
              <span className="text-[10px] text-slate-300 block mt-0.5">
                ข้อร้องเรียน {companySummary.totalComplaints} ครั้ง | เตือน {companySummary.totalWarnings} ใบ
              </span>
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
                  เปรียบเทียบอัตราผ่านเกณฑ์ ยอดจ่ายรางวัลเฉลี่ย และคะแนนมาตรฐานการปฏิบัติงานของแต่ละสาขา
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
                          <span className="text-[10px] text-slate-400 font-semibold block">อัตราผ่านเกณฑ์</span>
                          <strong className={`text-base font-black ${
                            branch.qualifiedPercent >= 90 ? 'text-emerald-600' :
                            branch.qualifiedPercent >= 80 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {branch.qualifiedPercent}%
                          </strong>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            ผ่าน {branch.qualifiedCount}/{branch.totalVehicles} คัน
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
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className={`w-4 h-4 ${branch.complaintsCount > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                          <span className="text-slate-600 font-medium">ข้อร้องเรียน:</span>
                          <strong className={branch.complaintsCount > 0 ? 'text-amber-700' : 'text-slate-700'}>
                            {branch.complaintsCount} ครั้ง
                          </strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className={`w-4 h-4 ${branch.warningLetters > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
                          <span className="text-slate-600 font-medium">ใบเตือน:</span>
                          <strong className={branch.warningLetters > 0 ? 'text-rose-600' : 'text-slate-700'}>
                            {branch.warningLetters} ใบ
                          </strong>
                        </div>
                      </div>
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

                  {/* Qualified Rate */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">อัตราผ่านเกณฑ์ (%)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold ${
                          b.qualifiedPercent >= 90 ? 'bg-emerald-100 text-emerald-800' :
                          b.qualifiedPercent >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.qualifiedPercent}%
                        </span>
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-bold text-sky-900 bg-sky-50/40">
                        {companySummary?.qualifiedPercent}%
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
                    <td className="py-3 px-4 font-semibold text-slate-800">ข้อร้องเรียนทั้งหมด (ครั้ง)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-bold text-amber-700">
                        {b.complaintsCount} ครั้ง
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-bold text-amber-900 bg-sky-50/40">
                        {companySummary?.totalComplaints} ครั้ง
                      </td>
                    )}
                  </tr>

                  {/* Warning Letters */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">หนังสือเตือนพนักงาน (ใบ)</td>
                    {branchComparisonData.map(b => (
                      <td key={b.branchName} className="py-3 px-4 text-right font-bold text-rose-600">
                        {b.warningLetters} ใบ
                      </td>
                    ))}
                    {branchComparisonData.length > 1 && (
                      <td className="py-3 px-4 text-right font-bold text-rose-800 bg-sky-50/40">
                        {companySummary?.totalWarnings} ใบ
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
                      สาขา <strong>{companySummary.topBranch.branchName}</strong> มีอัตราผ่านเกณฑ์สูงสุดถึง <strong>{companySummary.topBranch.qualifiedPercent}%</strong> และยอดเงินรางวัลเฉลี่ย <strong>฿{companySummary.topBranch.avgReward.toLocaleString()}</strong> ต่อคัน สะท้อนถึงการควบคุมวินัยจัดส่งและบริการที่ได้มาตรฐาน
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
                  กองรถ {trendWithDelta[0].totalVehicles} คัน | ผ่านเกณฑ์ {trendWithDelta[0].qualifiedPercent}%
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
                    เฉลี่ย ฿{peakMonth.avgReward.toLocaleString()} / คัน | ผ่านเกณฑ์ {peakMonth.qualifiedPercent}%
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
                ติดตามการเปลี่ยนแปลงของยอดจ่ายเงินรางวัล อัตราผ่านเกณฑ์ และความผันแปรของผลงานในแต่ละงวด
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="py-3 px-4 font-bold text-slate-700">เดือน / งวดประเมิน</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-center">จำนวนรถ</th>
                    <th className="py-3 px-4 font-bold text-slate-700 text-center">อัตราผ่านเกณฑ์</th>
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
                            row.qualifiedPercent >= 90 ? 'bg-emerald-100 text-emerald-800' :
                            row.qualifiedPercent >= 80 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.qualifiedPercent}%
                          </span>
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

                    {/* Qualified % */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">อัตราผ่านเกณฑ์ (%)</td>
                      <td className="py-3 px-4 text-right font-bold">{h2hData.monthA.summary.qualifiedPercent}%</td>
                      <td className="py-3 px-4 text-right font-black text-sky-900 bg-sky-50/30">{h2hData.monthB.summary.qualifiedPercent}%</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={h2hData.delta.qualifiedPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {h2hData.delta.qualifiedPercent >= 0 ? `+${h2hData.delta.qualifiedPercent}%` : `${h2hData.delta.qualifiedPercent}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {h2hData.delta.qualifiedPercent >= 0 ? (
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
                      <td className="py-3 px-4 text-right">{h2hData.monthA.summary.totalComplaints} ครั้ง</td>
                      <td className="py-3 px-4 text-right font-bold bg-sky-50/30">{h2hData.monthB.summary.totalComplaints} ครั้ง</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {h2hData.delta.totalComplaints >= 0 ? `+${h2hData.delta.totalComplaints}` : h2hData.delta.totalComplaints} ครั้ง
                      </td>
                      <td className="py-3 px-4 text-center">
                        {h2hData.delta.totalComplaints <= 0 ? (
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
