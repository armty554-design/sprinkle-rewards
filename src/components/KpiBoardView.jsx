import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  ChevronRight,
  Printer,
  Search,
  Trophy,
  AlertTriangle,
  Sparkles,
  Filter,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';
import {
  KPI_GROUPS,
  KPI_METRICS,
  METRIC_BY_KEY,
  extractVehicleKpiRow,
  aggregateKpiRows,
  computeMonthlyKpiTrend,
  formatMetricValue,
} from '../utils/kpiBoardHelpers';

const TIER_PILL_CLASS = {
  blue: 'bg-sky-50 text-sky-700 border-sky-200 font-bold',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
  red: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  neutral: 'bg-slate-50 text-slate-400 border-slate-100',
};

const CASE_CAT_COLORS = {
  delivery: { bar: '#ef4444', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'จัดส่ง (001/38/01)' },
  doc: { bar: '#f97316', badge: 'bg-orange-50 text-orange-700 border-orange-200', label: 'เอกสารฯ (spd/คูปอง/3.5–3.8)' },
  service_brand: { bar: '#8b5cf6', badge: 'bg-violet-50 text-violet-700 border-violet-200', label: 'บริการ/ภาพลักษณ์/วินัย' },
};

export default function KpiBoardView({
  data,
  allMonthsList = [],
  selectedMonthKey,
  onSelectMonth,
  selectedBranch: controlledBranch = 'all',
  onSelectBranch,
  subTab: controlledSubTab,
  onSelectSubTab,
  onSelectVehicle,
}) {
  const vehicles = data?.vehicles || [];

  // Branch state (controlled via App.jsx for URL deep-link sync)
  const [internalBranch, setInternalBranch] = useState('all');
  const selectedBranch = controlledBranch !== undefined ? controlledBranch : internalBranch;
  const setBranch = (next) => {
    const val = !next || String(next).toLowerCase() === 'all' ? 'all' : next;
    if (typeof onSelectBranch === 'function') onSelectBranch(val);
    else setInternalBranch(val);
  };

  // Sub-tab state: 'overview' | 'monthly'
  const [internalSubTab, setInternalSubTab] = useState('overview');
  const subTab = controlledSubTab === 'monthly' ? 'monthly' : controlledSubTab === 'overview' ? 'overview' : internalSubTab;
  const setSubTab = (next) => {
    if (typeof onSelectSubTab === 'function') onSelectSubTab(next);
    else setInternalSubTab(next);
  };

  // Local interactive filters
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [chartGroupFilter, setChartGroupFilter] = useState('g1');
  const [selectedMetricKey, setSelectedMetricKey] = useState('1.1');
  const [chartSort, setChartSort] = useState('desc'); // 'desc' | 'asc' | 'code'
  const [allBranchChartMode, setAllBranchChartMode] = useState('branches'); // 'branches' | 'cars'
  const [hoveredBarIdx, setHoveredBarIdx] = useState(null);

  // Table state
  const [tableGroupFilter, setTableGroupFilter] = useState('all'); // 'all' | 'g1'..'g5'
  const [tableRowFilter, setTableRowFilter] = useState('all'); // 'all' | 'fail' | 'cases' | 'blue25' | 'score95'
  const [tableSearch, setTableSearch] = useState('');
  const [showAllTableRows, setShowAllTableRows] = useState(false);

  // Extract all vehicle KPI rows once per month
  const allRows = useMemo(() => vehicles.map(extractVehicleKpiRow), [vehicles]);

  const branches = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.branch).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th')),
    [allRows]
  );

  // Validate branch selection when month switches
  useEffect(() => {
    if (branches.length > 0 && selectedBranch !== 'all' && !branches.includes(selectedBranch)) {
      setBranch('all');
    }
  }, [branches, selectedBranch]);

  // Filter by branch first to compute available zones in this branch
  const branchRows = useMemo(() => {
    if (selectedBranch === 'all') return allRows;
    return allRows.filter((r) => r.branch === selectedBranch);
  }, [allRows, selectedBranch]);

  const availableZones = useMemo(() => {
    const counts = new Map();
    for (const r of branchRows) {
      const bucket = r.isTruckS ? 'รถ S' : r.zone;
      counts.set(bucket, (counts.get(bucket) || 0) + 1);
    }
    const order = (z) => {
      if (z === 'รถ S') return 99;
      const m = z.match(/\d+/);
      return m ? parseInt(m[0], 10) : 50;
    };
    return Array.from(counts.entries())
      .sort((a, b) => order(a[0]) - order(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [branchRows]);

  useEffect(() => {
    if (zoneFilter !== 'ALL' && !availableZones.some((z) => z.name === zoneFilter)) {
      setZoneFilter('ALL');
    }
  }, [availableZones, zoneFilter]);

  useEffect(() => {
    setShowAllTableRows(false);
    setHoveredBarIdx(null);
  }, [selectedBranch, zoneFilter, selectedMonthKey, tableRowFilter, tableSearch]);

  // Active filtered rows (branch + zone)
  const activeRows = useMemo(() => {
    if (zoneFilter === 'ALL') return branchRows;
    if (zoneFilter === 'รถ S') return branchRows.filter((r) => r.isTruckS);
    return branchRows.filter((r) => !r.isTruckS && r.zone === zoneFilter);
  }, [branchRows, zoneFilter]);

  const agg = useMemo(() => aggregateKpiRows(activeRows), [activeRows]);

  // Active metric for main bar chart
  const activeMetric = METRIC_BY_KEY[selectedMetricKey] || KPI_METRICS[0];
  const chartGroupMetrics = useMemo(() => {
    if (chartGroupFilter === 'all') return KPI_METRICS;
    return KPI_METRICS.filter((m) => m.group === chartGroupFilter);
  }, [chartGroupFilter]);

  // Ensure selected metric is visible when user picks a group tab
  const handleSelectChartGroup = (gid) => {
    setChartGroupFilter(gid);
    if (gid !== 'all' && activeMetric.group !== gid) {
      const first = KPI_METRICS.find((m) => m.group === gid);
      if (first) setSelectedMetricKey(first.key);
    }
  };

  // Build Main Comparison Bar Chart data (18 branches when All Branches selected, or every vehicle when single branch selected)
  const isShowingBranchesChart = selectedBranch === 'all' && allBranchChartMode === 'branches' && agg.branchSummaries.length > 1;

  const mainChartBars = useMemo(() => {
    const m = activeMetric;
    if (isShowingBranchesChart) {
      const items = agg.branchSummaries
        .map((b) => {
          const val = b.metrics[m.key];
          return {
            id: b.branch,
            label: b.branch,
            subLabel: `${b.count} คัน`,
            value: val,
            display: formatMetricValue(m, val),
            tier:
              val === null
                ? 'neutral'
                : m.kind === 'percent_high'
                ? val >= (m.blueLine ?? 95)
                  ? 'blue'
                  : val >= (m.stdLine ?? 85)
                  ? 'green'
                  : 'red'
                : m.kind === 'percent_low'
                ? val <= 0.01
                  ? 'blue'
                  : val <= (m.stdLine ?? 1)
                  ? 'green'
                  : 'red'
                : m.kind === 'count_zero'
                ? val === 0
                  ? 'blue'
                  : 'red'
                : m.kind === 'grade'
                ? val >= 90
                  ? 'blue'
                  : val >= 70
                  ? 'green'
                  : 'red'
                : val > 0
                ? 'blue'
                : 'neutral',
            isBranch: true,
            branchName: b.branch,
          };
        })
        .filter((x) => x.value !== null);

      if (chartSort === 'desc') items.sort((a, b) => b.value - a.value);
      else if (chartSort === 'asc') items.sort((a, b) => a.value - b.value);
      else items.sort((a, b) => a.label.localeCompare(b.label, 'th'));
      return items;
    }

    const items = activeRows
      .map((r) => {
        const cell = r.cells[m.key];
        return {
          id: r.id,
          label: r.carCode,
          subLabel: `${r.fullName} (${r.branch} • ${r.isTruckS ? 'รถ S' : r.zone})`,
          value: cell?.isMissing ? null : cell?.value ?? null,
          display: cell?.display || '-',
          tier: cell?.tier || 'neutral',
          vehicle: r.vehicle,
        };
      })
      .filter((x) => x.value !== null);

    if (chartSort === 'desc') items.sort((a, b) => b.value - a.value);
    else if (chartSort === 'asc') items.sort((a, b) => a.value - b.value);
    else items.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

    // Cap at 35 bars in multi-branch car mode to keep labels crisp
    return selectedBranch === 'all' ? items.slice(0, 35) : items;
  }, [activeMetric, isShowingBranchesChart, agg.branchSummaries, activeRows, chartSort, selectedBranch]);

  const mainChartMax = useMemo(() => {
    if (activeMetric.kind === 'percent_high' || activeMetric.kind === 'grade') return 100;
    const maxVal = Math.max(...mainChartBars.map((b) => b.value || 0), 1);
    return maxVal * 1.15;
  }, [activeMetric, mainChartBars]);

  // Stacked case bars (per branch when All Branches, or per car with cases when single branch)
  const stackedCaseBars = useMemo(() => {
    if (isShowingBranchesChart) {
      return [...agg.branchSummaries]
        .filter((b) => b.totalCases > 0)
        .sort((a, b) => b.totalCases - a.totalCases)
        .map((b) => ({
          id: b.branch,
          label: b.branch,
          subLabel: `${b.count} คัน • รวม ${b.totalCases} เคส`,
          total: b.totalCases,
          delivery: b.casesByCategory.delivery,
          doc: b.casesByCategory.doc,
          service_brand: b.casesByCategory.service_brand,
          branchName: b.branch,
        }));
    }
    return [...activeRows]
      .filter((r) => r.totalCases > 0)
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 26)
      .map((r) => ({
        id: r.id,
        label: r.carCode,
        subLabel: `${r.fullName} (${r.branch}) • รวม ${r.totalCases} เคส`,
        total: r.totalCases,
        delivery: r.casesByCategory.delivery,
        doc: r.casesByCategory.doc,
        service_brand: r.casesByCategory.service_brand,
        vehicle: r.vehicle,
      }));
  }, [isShowingBranchesChart, agg.branchSummaries, activeRows]);

  const stackedCaseMax = useMemo(
    () => Math.max(...stackedCaseBars.map((b) => b.total), 1),
    [stackedCaseBars]
  );

  // Table filtered columns & rows
  const tableColumns = useMemo(() => {
    if (tableGroupFilter === 'all') return KPI_METRICS;
    return KPI_METRICS.filter((m) => m.group === tableGroupFilter);
  }, [tableGroupFilter]);

  const filteredTableRows = useMemo(() => {
    return activeRows.filter((r) => {
      if (tableRowFilter === 'fail' && r.redCount === 0) return false;
      if (tableRowFilter === 'cases' && r.totalCases === 0) return false;
      if (tableRowFilter === 'blue25' && r.blueCount < 25) return false;
      if (tableRowFilter === 'score95' && r.totalPercent < 95) return false;
      if (tableSearch.trim()) {
        const q = tableSearch.trim().toLowerCase();
        if (
          !r.carCode.toLowerCase().includes(q) &&
          !r.fullName.toLowerCase().includes(q) &&
          !r.empId.toLowerCase().includes(q) &&
          !r.branch.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [activeRows, tableRowFilter, tableSearch]);

  const visibleTableRows = showAllTableRows ? filteredTableRows : filteredTableRows.slice(0, 40);

  // Monthly comparison trend (computed lazily only when monthly sub-tab is opened)
  const monthlyTrend = useMemo(() => {
    if (subTab !== 'monthly') return [];
    return computeMonthlyKpiTrend(allMonthsList, selectedBranch, zoneFilter);
  }, [subTab, allMonthsList, selectedBranch, zoneFilter]);

  const currentMonthLabel =
    allMonthsList.find((m) => m.key === selectedMonthKey)?.label || selectedMonthKey;
  const branchTitle =
    selectedBranch === 'all' ? `ทุกสาขา (${branches.length} สาขา)` : `สาขา ${selectedBranch}`;

  const barFillForTier = (tier) => {
    if (tier === 'blue') return '#0ea5e9';
    if (tier === 'green') return '#10b981';
    if (tier === 'red') return '#f43f5e';
    return '#94a3b8';
  };

  return (
    <div className="space-y-5">
      {/* HEADER + BRANCH / MONTH / ZONE FILTER BAR */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
              <Activity className="w-3.5 h-3.5" />
              <span>ตารางกราฟ KPI ผลงานรางวัลมาตรฐาน (ครบทั้ง 36 หัวข้อ)</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5 tracking-tight">
              {branchTitle} • ประจำเดือน {currentMonthLabel}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              วิเคราะห์ผลปฏิบัติงานจริงจากช่องผลงานทุกกลุ่มงาน (1.1–5.2) • กำลังแสดง{' '}
              <strong className="text-slate-800">{agg.count} คัน</strong>
              {zoneFilter !== 'ALL' ? ` (เฉพาะ ${zoneFilter})` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {/* Sub-tab toggle */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setSubTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  subTab === 'overview'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>ภาพรวมรายเดือน</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  subTab === 'monthly'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>เปรียบเทียบรายเดือน</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>พิมพ์</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Branch + Month + Zone Pills */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 pt-3 border-t border-slate-100 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">สาขา:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setBranch(e.target.value)}
                aria-label="เลือกสาขา"
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer pr-1"
              >
                <option value="all">ทุกสาขา ({branches.length} สาขา)</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    สาขา {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">เดือน:</span>
              <select
                value={selectedMonthKey}
                onChange={(e) => onSelectMonth(e.target.value)}
                aria-label="เลือกเดือน"
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer pr-1"
              >
                {allMonthsList.map((m, idx) => (
                  <option key={m.key} value={m.key}>
                    {m.label} {idx === 0 ? '(ล่าสุด)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Zone / Truck S Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 md:ml-auto">
            <button
              type="button"
              onClick={() => setZoneFilter('ALL')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                zoneFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด ({branchRows.length})
            </button>
            {availableZones.map((z) => (
              <button
                key={z.name}
                type="button"
                onClick={() => setZoneFilter(z.name)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                  zoneFilter === z.name
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {z.name} ({z.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* TAB 1: MONTHLY KPI OVERVIEW                                          */}
      {/* ==================================================================== */}
      {subTab === 'overview' && (
        <>
          {/* 6 KPI SUMMARY CARDS (2 rows x 3 cols) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <KpiSummaryCard
              title="1.1 จัดส่งตรงเวลาเฉลี่ย"
              value={agg.totalsRow['1.1']?.display || '-'}
              sub={`ได้คะแนนเต็ม ${agg.totalsRow['1.1']?.blueN || 0} / ${agg.totalsRow['1.1']?.validN || 0} คัน`}
              accent="sky"
            />
            <KpiSummaryCard
              title="2.1 เวลานัดหมายเฉลี่ย"
              value={agg.totalsRow['2.1']?.display || '-'}
              sub={`ได้คะแนนเต็ม ${agg.totalsRow['2.1']?.blueN || 0} / ${agg.totalsRow['2.1']?.validN || 0} คัน`}
              accent="emerald"
            />
            <KpiSummaryCard
              title="1.5 GPS ≤ 100 ม. เฉลี่ย"
              value={agg.totalsRow['1.5']?.display || '-'}
              sub={`ได้คะแนนเต็ม ${agg.totalsRow['1.5']?.blueN || 0} / ${agg.totalsRow['1.5']?.validN || 0} คัน`}
              accent="violet"
            />
            <KpiSummaryCard
              title="1.8 ตรงประเภทน้ำเฉลี่ย"
              value={agg.totalsRow['1.8']?.display || '-'}
              sub={`ได้คะแนนเต็ม ${agg.totalsRow['1.8']?.blueN || 0} / ${agg.totalsRow['1.8']?.validN || 0} คัน`}
              accent="amber"
            />
            <KpiSummaryCard
              title="เคสปัญหารวม (1.2 ตกรอบเฉลี่ย)"
              value={`${agg.totalCases.toLocaleString()} เคส`}
              sub={`ตกรอบสุทธิเฉลี่ย ${agg.totalsRow['1.2']?.display || '-'} • พบเคสใน ${agg.carsWithCases} คัน`}
              accent="rose"
            />
            <KpiSummaryCard
              title="เงินรางวัลรวม & คะแนนเฉลี่ย"
              value={`฿${agg.totalReward.toLocaleString()}`}
              sub={`คะแนนรวมเฉลี่ย ${agg.avgPercent.toFixed(2)}% • ได้เต็ม ≥25 ข้อ: ${agg.highBlueCars} คัน`}
              accent="slate"
            />
          </section>

          {/* TOP 5 RANKINGS & URGENT IMPROVEMENT (3 CARDS) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top 5 On-time */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-sky-500" />
                  <span>Top 5 จัดส่งตรงเวลาสูงสุด (1.1)</span>
                </h2>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">ดีเด่น</span>
              </div>
              <div className="space-y-2">
                {agg.top5OnTime.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectVehicle?.(r.vehicle)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-sky-50/70 border border-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {r.carCode} • {r.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.branch} • {r.isTruckS ? 'รถ S' : r.zone}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg shrink-0">
                      {r.cells['1.1']?.display}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Urgent Improvement */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>กลุ่มต้องเร่งปรับปรุง (1.1 ต่ำสุด)</span>
                </h2>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">ติดตามด่วน</span>
              </div>
              <div className="space-y-2">
                {agg.urgentCars.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectVehicle?.(r.vehicle)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-rose-50/70 border border-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {r.carCode} • {r.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.branch} • {r.isTruckS ? 'รถ S' : r.zone} • {r.totalCases} เคส
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg shrink-0">
                      {r.cells['1.1']?.display}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top 5 Overall Score */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Top 5 คะแนนรวมสูงสุด</span>
                </h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">ยอดเยี่ยม</span>
              </div>
              <div className="space-y-2">
                {agg.top5Overall.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectVehicle?.(r.vehicle)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-50/70 border border-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {r.carCode} • {r.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.branch} • ฿{r.totalReward.toLocaleString()} • เสริมน้ำ {r.cells['2.6']?.display || '0'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg shrink-0">
                      {r.totalPercent.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* INTERACTIVE 36-METRIC COMPARISON BAR CHART */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                  <span>กราฟเปรียบเทียบรายหัวข้อ: {activeMetric.key} {activeMetric.label}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isShowingBranchesChart
                    ? 'แสดงค่าเฉลี่ย/ผลรวมแยก 18 สาขา (คลิกแท่งสาขาเพื่อเจาะดูรายเบอร์รถในสาขานั้น)'
                    : selectedBranch === 'all'
                    ? 'แสดงรายเบอร์รถสูงสุด/ต่ำสุด 35 คัน (คลิกแท่งเพื่อดูสลิปรายคัน)'
                    : `แสดงรายเบอร์รถครบทุกคันในสาขา ${selectedBranch} (คลิกแท่งเพื่อเปิดสลิปรายคัน)`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 no-print">
                {selectedBranch === 'all' && agg.branchSummaries.length > 1 && (
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAllBranchChartMode('branches')}
                      className={`px-2.5 py-1 rounded-md cursor-pointer ${
                        allBranchChartMode === 'branches' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      เทียบ 18 สาขา
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllBranchChartMode('cars')}
                      className={`px-2.5 py-1 rounded-md cursor-pointer ${
                        allBranchChartMode === 'cars' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      รายเบอร์รถ
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={chartSort}
                    onChange={(e) => setChartSort(e.target.value)}
                    aria-label="เรียงลำดับกราฟ"
                    className="bg-transparent font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                  >
                    <option value="desc">เรียงจากมาก → น้อย</option>
                    <option value="asc">เรียงจากน้อย → มาก</option>
                    <option value="code">เรียงตามรหัส / ชื่อ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Group Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 no-print">
              <button
                type="button"
                onClick={() => handleSelectChartGroup('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  chartGroupFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ทุกกลุ่ม (36)
              </button>
              {KPI_GROUPS.map((g) => {
                const cnt = KPI_METRICS.filter((m) => m.group === g.id).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectChartGroup(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      chartGroupFilter === g.id
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {g.label} ({cnt})
                  </button>
                );
              })}
            </div>

            {/* Metric Pill Buttons */}
            <div className="flex flex-wrap gap-1.5 no-print">
              {chartGroupMetrics.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setSelectedMetricKey(m.key);
                    setHoveredBarIdx(null);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    selectedMetricKey === m.key
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700'
                  }`}
                >
                  {m.shortLabel}
                </button>
              ))}
            </div>

            {/* Interactive SVG Vertical Bar Chart */}
            {mainChartBars.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                ไม่มีข้อมูลผลงานสำหรับหัวข้อ {activeMetric.key} {activeMetric.label} ในเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="relative">
                {hoveredBarIdx !== null && mainChartBars[hoveredBarIdx] && (
                  <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-sm">
                    <span className="font-bold text-sky-300">{mainChartBars[hoveredBarIdx].label}</span>
                    <span className="text-slate-300">{mainChartBars[hoveredBarIdx].subLabel}</span>
                    <span className="font-black text-white bg-white/15 px-2 py-0.5 rounded-md">
                      {mainChartBars[hoveredBarIdx].display}
                    </span>
                  </div>
                )}
                <div className="overflow-x-auto pb-2">
                  <VerticalBarSvg
                    bars={mainChartBars}
                    maxVal={mainChartMax}
                    metric={activeMetric}
                    barFillForTier={barFillForTier}
                    hoveredIdx={hoveredBarIdx}
                    onHover={setHoveredBarIdx}
                    onBarClick={(bar) => {
                      if (bar.isBranch) setBranch(bar.branchName);
                      else if (bar.vehicle) onSelectVehicle?.(bar.vehicle);
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />
                    ได้คะแนนเต็ม / เกณฑ์สีฟ้า
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                    ผ่านมาตรฐาน
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                    ตกเกณฑ์ / มีเคสหักคะแนน
                  </span>
                  <span className="ml-auto font-semibold text-slate-700">
                    ค่าสรุปรวม: {agg.totalsRow[activeMetric.key]?.display || '-'} ({activeMetric.agg === 'avg' ? 'เฉลี่ย' : 'รวม'})
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* CASE / DEFECT CHARTS (2 COLUMNS) */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Horizontal Case Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">จำนวนเคสปัญหาแยกตามหัวข้อรางวัลมาตรฐาน</h2>
                  <p className="text-[11px] text-slate-500">รวมเฉพาะหัวข้อที่พบเคสจริง (ไม่รวม 88 Undo / QROD)</p>
                </div>
                <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  รวม {agg.totalCases.toLocaleString()} เคส
                </span>
              </div>

              {agg.caseBreakdown.length === 0 ? (
                <div className="py-10 text-center text-xs text-emerald-700 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="font-bold">ไม่พบเคสปัญหาในเงื่อนไขที่เลือก</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {agg.caseBreakdown.map((item) => {
                    const maxCase = agg.caseBreakdown[0]?.total || 1;
                    const widthPct = Math.max(4, Math.round((item.total / maxCase) * 100));
                    const cat = CASE_CAT_COLORS[item.category] || CASE_CAT_COLORS.delivery;
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate pr-2" title={item.fullLabel}>
                            {item.label}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 shrink-0">
                            <strong className="text-slate-900">{item.total.toLocaleString()}</strong> ครั้ง ({item.affectedCars} คัน)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${widthPct}%`, backgroundColor: cat.bar }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Stacked Bar Chart of Cases by Vehicle or Branch */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col">
              <div className="mb-3">
                <h2 className="text-sm font-black text-slate-900">
                  กราฟแท่งซ้อนจำนวนเคสปัญหา ({isShowingBranchesChart ? 'แยก 18 สาขา' : 'รายเบอร์รถ'})
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 mt-1.5">
                  {Object.entries(CASE_CAT_COLORS).map(([k, cfg]) => (
                    <span key={k} className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: cfg.bar }} />
                      <span>{cfg.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {stackedCaseBars.length === 0 ? (
                <div className="flex-1 py-10 text-center text-xs text-emerald-700 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-center">
                  ไม่มีรายการเคสหักคะแนนในเงื่อนไขที่เลือก
                </div>
              ) : (
                <div className="overflow-x-auto flex-1 flex items-end">
                  <StackedCaseBarSvg
                    bars={stackedCaseBars}
                    maxVal={stackedCaseMax}
                    onBarClick={(bar) => {
                      if (bar.branchName) setBranch(bar.branchName);
                      else if (bar.vehicle) onSelectVehicle?.(bar.vehicle);
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* ZONE / TRUCK-S GROUPED BAR CHART (4 CORE KPIs) */}
          {agg.zoneComparison.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    เปรียบเทียบ 4 ตัวชี้วัดหลัก แยกตามเขตและประเภทรถ
                  </h2>
                  <p className="text-xs text-slate-500">
                    เปรียบเทียบค่าเฉลี่ยรายเขต (`เขต 1–4`) และกลุ่ม `รถ S`
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-sky-500" />1.1 ตรงเวลา (%)</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />2.1 นัดหมาย (%)</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-violet-500" />1.5 GPS 100 ม. (%)</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />1.8 ประเภทน้ำ (%)</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <ZoneGroupedBarSvg zones={agg.zoneComparison} />
              </div>
            </section>
          )}

          {/* FULL 36-METRIC KPI TABLE */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-600" />
                    <span>ตารางข้อมูลผลงาน KPI ครบทั้ง {KPI_METRICS.length} หัวข้อรางวัลมาตรฐาน</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำลังแสดง <strong className="text-slate-800">{filteredTableRows.length}</strong> จาก {agg.count} คัน •
                    คลิกเบอร์รถเพื่อเปิดสลิปรายละเอียดรายคัน
                  </p>
                </div>

                {/* Search box */}
                <div className="relative w-full md:w-64 no-print">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="ค้นหาเบอร์รถ ชื่อ รหัส หรือสาขา..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 no-print">
                <span className="text-[11px] font-bold text-slate-400 mr-1 inline-flex items-center gap-1">
                  <Filter className="w-3 h-3" /> กรองรถ:
                </span>
                {[
                  { id: 'all', label: `ทั้งหมด (${agg.count})` },
                  { id: 'fail', label: `มีไม่ผ่านเกณฑ์ (${agg.carsWithFail})` },
                  { id: 'cases', label: `มีเคสปัญหา (${agg.carsWithCases})` },
                  { id: 'blue25', label: `ได้เต็ม ≥ 25 ข้อ (${agg.highBlueCars})` },
                  { id: 'score95', label: `คะแนนรวม ≥ 95% (${activeRows.filter((r) => r.totalPercent >= 95).length})` },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setTableRowFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      tableRowFilter === pill.id
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Column Group Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 no-print">
                <span className="text-[11px] font-bold text-slate-400 mr-1">กลุ่มคอลัมน์:</span>
                <button
                  type="button"
                  onClick={() => setTableGroupFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                    tableGroupFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ทุกกลุ่ม (36 ช่อง)
                </button>
                {KPI_GROUPS.map((g) => {
                  const cnt = KPI_METRICS.filter((m) => m.group === g.id).length;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setTableGroupFilter(g.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        tableGroupFilter === g.id
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {g.label} ({cnt})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 z-20 bg-slate-50 px-3 py-2.5 font-black text-slate-800 border-r border-slate-200 min-w-[185px]">
                      เบอร์รถ / ชื่อ-สกุล
                    </th>
                    <th className="px-2.5 py-2.5 font-bold text-slate-700 text-center whitespace-nowrap border-r border-slate-200">
                      คะแนนรวม
                    </th>
                    <th className="px-2.5 py-2.5 font-bold text-slate-700 text-center whitespace-nowrap border-r border-slate-200">
                      ได้เต็ม
                    </th>
                    {tableColumns.map((m) => (
                      <th
                        key={m.key}
                        title={`${m.key} ${m.label} (${m.targetHint})`}
                        className="px-2 py-2 font-bold text-slate-700 text-center whitespace-nowrap border-r border-slate-100 min-w-[92px]"
                      >
                        <div className="text-[11px] text-slate-900">{m.shortLabel}</div>
                        <div className="text-[9px] font-normal text-slate-400">{m.targetHint}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleTableRows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => onSelectVehicle?.(r.vehicle)}
                      className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-sky-50/90 px-3 py-2 border-r border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{r.carCode}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                {r.isTruckS ? 'รถ S' : r.zone}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 truncate max-w-[155px]">
                              {r.fullName}
                            </div>
                            {selectedBranch === 'all' && (
                              <div className="text-[10px] text-sky-600 font-semibold">{r.branch}</div>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-500 shrink-0" />
                        </div>
                      </td>

                      <td className="px-2.5 py-2 text-center border-r border-slate-200 whitespace-nowrap">
                        <div
                          className={`font-black text-xs ${
                            r.totalPercent >= 95
                              ? 'text-sky-700'
                              : r.totalPercent >= 85
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {r.totalPercent.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-slate-400">฿{r.totalReward.toLocaleString()}</div>
                      </td>

                      <td className="px-2.5 py-2 text-center border-r border-slate-200 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            r.blueCount >= 25
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {r.blueCount} ข้อ
                        </span>
                      </td>

                      {tableColumns.map((m) => {
                        const cell = r.cells[m.key];
                        const pillCls = TIER_PILL_CLASS[cell?.tier || 'neutral'];
                        return (
                          <td
                            key={m.key}
                            className="px-1.5 py-2 text-center border-r border-slate-100 whitespace-nowrap"
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg text-[11px] border ${pillCls}`}
                            >
                              {cell?.display || '-'}
                            </span>
                            {m.key === '1.1' && cell?.value !== null && (
                              <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, cell.value))}%`,
                                    backgroundColor: barFillForTier(cell.tier),
                                  }}
                                />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>

                {/* DARK SUMMARY FOOTER ROW (Matching Reference Apps Script) */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="sticky left-0 z-10 bg-slate-900 px-3 py-3 border-r border-slate-700 whitespace-nowrap">
                      {selectedBranch === 'all'
                        ? `รวมทั้งหมด (${agg.count} คัน)`
                        : `รวมทั้งสาขา (${agg.count} คัน)`}
                    </td>
                    <td className="px-2.5 py-3 text-center border-r border-slate-700 whitespace-nowrap">
                      <div className="text-sky-300 font-black">{agg.avgPercent.toFixed(2)}%</div>
                      <div className="text-[10px] text-slate-300">฿{agg.totalReward.toLocaleString()}</div>
                    </td>
                    <td className="px-2.5 py-3 text-center border-r border-slate-700 whitespace-nowrap text-sky-300">
                      {agg.highBlueCars} คัน
                    </td>
                    {tableColumns.map((m) => (
                      <td
                        key={m.key}
                        className="px-2 py-3 text-center border-r border-slate-800 whitespace-nowrap text-xs"
                      >
                        {agg.totalsRow[m.key]?.display || '-'}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {filteredTableRows.length > 40 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs no-print">
                <span className="text-slate-500">
                  แสดง {visibleTableRows.length} จาก {filteredTableRows.length} คัน
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllTableRows((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 cursor-pointer"
                >
                  {showAllTableRows ? 'ย่อแสดง 40 คันแรก' : `แสดงครบทั้งหมด (${filteredTableRows.length} คัน)`}
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: MONTHLY COMPARISON (TREND ACROSS 01-2569 .. 10-2569)          */}
      {/* ==================================================================== */}
      {subTab === 'monthly' && (
        <section className="space-y-4">
          {/* Multi-Line Core KPI Trend SVG */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  แนวโน้ม 4 ตัวชี้วัดหลักรายเดือน ({branchTitle})
                </h2>
                <p className="text-xs text-slate-500">
                  เปรียบเทียบผลงานต่อเนื่องทุกเดือนที่มีข้อมูลในระบบ ({monthlyTrend.length} เดือน)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-500 inline-block" />1.1 ตรงเวลา</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" />2.1 นัดหมาย</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-500 inline-block" />1.5 GPS 100 ม.</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" />1.8 ประเภทน้ำ</span>
              </div>
            </div>

            {monthlyTrend.length > 0 ? (
              <div className="overflow-x-auto">
                <MonthlyTrendLineSvg trend={monthlyTrend} activeMonthKey={selectedMonthKey} />
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">ไม่พบข้อมูลรายเดือนสำหรับเงื่อนไขที่เลือก</div>
            )}
          </div>

          {/* Monthly Comparison Table with MoM Deltas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                ตารางเปรียบเทียบผลงานรายเดือน (MoM) — {branchTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่แถวเดือนใดก็ได้เพื่อสลับไปดูรายละเอียด `ภาพรวมรายเดือน` ของเดือนนั้นทันที
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="px-3 py-2.5 font-black">เดือน</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">จำนวนรถ</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">1.1 ตรงเวลา</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">2.1 นัดหมาย</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">1.5 GPS</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">1.8 ประเภทน้ำ</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">1.2 ตกรอบ</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">3.1 Prepaid</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">เคสปัญหารวม</th>
                    <th className="px-2.5 py-2.5 text-center font-bold">คะแนนเฉลี่ย</th>
                    <th className="px-3 py-2.5 text-right font-bold">เงินรางวัลรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...monthlyTrend].reverse().map((row) => {
                    const isSelected = row.key === selectedMonthKey;
                    return (
                      <tr
                        key={row.key}
                        onClick={() => {
                          onSelectMonth?.(row.key);
                          setSubTab('overview');
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50/80 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {row.label}
                          {isSelected && (
                            <span className="ml-1.5 text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                              กำลังดู
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2.5 text-center text-slate-700">{row.count}</td>
                        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                          <span className="font-bold text-sky-700">
                            {row.m11 !== null ? `${row.m11.toFixed(2)}%` : '-'}
                          </span>
                          <DeltaBadge delta={row.delta11} suffix="%" />
                        </td>
                        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                          <span className="font-bold text-emerald-700">
                            {row.m21 !== null ? `${row.m21.toFixed(2)}%` : '-'}
                          </span>
                          <DeltaBadge delta={row.delta21} suffix="%" />
                        </td>
                        <td className="px-2.5 py-2.5 text-center font-semibold text-violet-700">
                          {row.m15 !== null ? `${row.m15.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-center font-semibold text-amber-700">
                          {row.m18 !== null ? `${row.m18.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-center font-semibold text-slate-700">
                          {row.m12 !== null ? `${row.m12.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-center font-semibold text-slate-700">
                          {row.m31 !== null ? `${row.m31.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                          <span className="font-bold text-rose-700">{row.totalCases.toLocaleString()}</span>
                          <DeltaBadge delta={row.deltaCases} invert />
                        </td>
                        <td className="px-2.5 py-2.5 text-center font-bold text-slate-800">
                          {row.avgPercent.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-emerald-700 whitespace-nowrap">
                          ฿{row.totalReward.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ========================================================================== */
/* SUB-COMPONENTS: KPI CARD & PURE RESPONSIVE SVG CHARTS                      */
/* ========================================================================== */

function KpiSummaryCard({ title, value, sub, accent = 'sky' }) {
  const styles = {
    sky: 'border-sky-100 bg-gradient-to-br from-white to-sky-50/40 text-sky-700',
    emerald: 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 text-emerald-700',
    violet: 'border-violet-100 bg-gradient-to-br from-white to-violet-50/40 text-violet-700',
    amber: 'border-amber-100 bg-gradient-to-br from-white to-amber-50/40 text-amber-700',
    rose: 'border-rose-100 bg-gradient-to-br from-white to-rose-50/40 text-rose-700',
    slate: 'border-slate-200 bg-gradient-to-br from-white to-slate-50 text-slate-900',
  }[accent];

  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${styles}`}>
      <div className="text-xs font-bold text-slate-500">{title}</div>
      <div className="text-2xl font-black tracking-tight mt-1">{value}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

function DeltaBadge({ delta, suffix = '', invert = false }) {
  if (delta === null || delta === undefined || Math.abs(delta) < 0.01) return null;
  const isGood = invert ? delta < 0 : delta > 0;
  const formatted = suffix ? `${Math.abs(delta).toFixed(1)}${suffix}` : Math.abs(Math.round(delta));
  return (
    <span
      className={`ml-1 inline-flex items-center text-[10px] font-bold ${
        isGood ? 'text-emerald-600' : 'text-rose-600'
      }`}
    >
      {delta > 0 ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
      {formatted}
    </span>
  );
}

function VerticalBarSvg({ bars, maxVal, metric, barFillForTier, hoveredIdx, onHover, onBarClick }) {
  const barW = bars.length <= 18 ? 42 : 30;
  const gap = bars.length <= 18 ? 14 : 8;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 26;
  const padBottom = 68;
  const plotH = 210;
  const plotW = Math.max(540, bars.length * (barW + gap));
  const svgW = padLeft + plotW + padRight;
  const svgH = padTop + plotH + padBottom;

  const yFor = (v) => padTop + plotH - (Math.min(maxVal, Math.max(0, v)) / Math.max(maxVal, 0.001)) * plotH;
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxVal * t);

  return (
    <svg width={svgW} height={svgH} className="block select-none">
      {/* Y-Axis gridlines */}
      {gridTicks.map((tick, idx) => {
        const y = yFor(tick);
        const lbl = metric.unit === '%' || metric.kind === 'grade' ? `${Math.round(tick)}%` : Math.round(tick);
        return (
          <g key={idx}>
            <line x1={padLeft} x2={svgW - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
              {lbl}
            </text>
          </g>
        );
      })}

      {/* Standard & Blue threshold dashed lines for percent metrics */}
      {metric.stdLine !== undefined && metric.stdLine <= maxVal && (
        <line
          x1={padLeft}
          x2={svgW - padRight}
          y1={yFor(metric.stdLine)}
          y2={yFor(metric.stdLine)}
          stroke="#10b981"
          strokeWidth="1.25"
          strokeDasharray="5 4"
        />
      )}
      {metric.blueLine !== undefined && metric.blueLine > 0 && metric.blueLine <= maxVal && (
        <line
          x1={padLeft}
          x2={svgW - padRight}
          y1={yFor(metric.blueLine)}
          y2={yFor(metric.blueLine)}
          stroke="#0284c7"
          strokeWidth="1.25"
          strokeDasharray="5 4"
        />
      )}

      {/* Bars */}
      {bars.map((bar, idx) => {
        const x = padLeft + idx * (barW + gap) + gap / 2;
        const y = yFor(bar.value || 0);
        const h = Math.max(2, padTop + plotH - y);
        const isHovered = hoveredIdx === idx;
        return (
          <g
            key={bar.id}
            className="cursor-pointer"
            onMouseEnter={() => onHover?.(idx)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onBarClick?.(bar)}
          >
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={5}
              fill={barFillForTier(bar.tier)}
              opacity={hoveredIdx === null || isHovered ? 1 : 0.45}
            />
            <text
              x={x + barW / 2}
              y={y - 5}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="700"
              fill="#334155"
            >
              {bar.display}
            </text>
            <text
              x={x + barW / 2}
              y={padTop + plotH + 14}
              textAnchor="end"
              fontSize="10"
              fontWeight={isHovered ? '800' : '600'}
              fill={isHovered ? '#0284c7' : '#475569'}
              transform={`rotate(-35 ${x + barW / 2} ${padTop + plotH + 14})`}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedCaseBarSvg({ bars, maxVal, onBarClick }) {
  const barW = bars.length <= 16 ? 26 : 20;
  const gap = 8;
  const padLeft = 32;
  const padRight = 12;
  const padTop = 20;
  const padBottom = 64;
  const plotH = 175;
  const plotW = Math.max(360, bars.length * (barW + gap));
  const svgW = padLeft + plotW + padRight;
  const svgH = padTop + plotH + padBottom;
  const scale = (v) => (v / Math.max(maxVal, 1)) * plotH;

  return (
    <svg width={svgW} height={svgH} className="block select-none">
      {[0, 0.5, 1].map((t, i) => {
        const val = Math.round(maxVal * t);
        const y = padTop + plotH - scale(val);
        return (
          <g key={i}>
            <line x1={padLeft} x2={svgW - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={padLeft - 5} y={y + 3} textAnchor="end" fontSize="9.5" fill="#94a3b8" fontWeight="600">
              {val}
            </text>
          </g>
        );
      })}

      {bars.map((bar, idx) => {
        const x = padLeft + idx * (barW + gap) + gap / 2;
        const hDel = scale(bar.delivery);
        const hDoc = scale(bar.doc);
        const hSrv = scale(bar.service_brand);
        const baseY = padTop + plotH;
        const yDel = baseY - hDel;
        const yDoc = yDel - hDoc;
        const ySrv = yDoc - hSrv;

        return (
          <g key={bar.id} className="cursor-pointer" onClick={() => onBarClick?.(bar)}>
            <title>{bar.subLabel}</title>
            {bar.delivery > 0 && <rect x={x} y={yDel} width={barW} height={hDel} fill="#ef4444" rx={2} />}
            {bar.doc > 0 && <rect x={x} y={yDoc} width={barW} height={hDoc} fill="#f97316" rx={2} />}
            {bar.service_brand > 0 && <rect x={x} y={ySrv} width={barW} height={hSrv} fill="#8b5cf6" rx={2} />}
            <text x={x + barW / 2} y={ySrv - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#334155">
              {bar.total}
            </text>
            <text
              x={x + barW / 2}
              y={baseY + 12}
              textAnchor="end"
              fontSize="9.5"
              fontWeight="600"
              fill="#475569"
              transform={`rotate(-35 ${x + barW / 2} ${baseY + 12})`}
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ZoneGroupedBarSvg({ zones }) {
  const series = [
    { key: 'm11', color: '#0ea5e9', label: '1.1 ตรงเวลา' },
    { key: 'm21', color: '#10b981', label: '2.1 นัดหมาย' },
    { key: 'm15', color: '#8b5cf6', label: '1.5 GPS' },
    { key: 'm18', color: '#f59e0b', label: '1.8 ประเภทน้ำ' },
  ];

  // Dynamic floor so differences between 60%–100% read cleanly
  const allVals = zones.flatMap((z) => series.map((s) => z[s.key] || 0));
  const minFloor = Math.max(0, Math.min(60, Math.floor((Math.min(...allVals) - 5) / 10) * 10));
  const span = Math.max(10, 100 - minFloor);

  const barW = 24;
  const innerGap = 5;
  const groupW = series.length * (barW + innerGap) + 28;
  const padLeft = 42;
  const padRight = 20;
  const padTop = 22;
  const padBottom = 38;
  const plotH = 190;
  const plotW = Math.max(520, zones.length * groupW);
  const svgW = padLeft + plotW + padRight;
  const svgH = padTop + plotH + padBottom;

  const yFor = (v) => padTop + plotH - ((Math.max(minFloor, Math.min(100, v)) - minFloor) / span) * plotH;
  const ticks = [minFloor, minFloor + span * 0.25, minFloor + span * 0.5, minFloor + span * 0.75, 100];

  return (
    <svg width={svgW} height={svgH} className="block select-none">
      {ticks.map((t, i) => {
        const y = yFor(t);
        return (
          <g key={i}>
            <line x1={padLeft} x2={svgW - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
              {Math.round(t)}%
            </text>
          </g>
        );
      })}

      {zones.map((z, gi) => {
        const gx = padLeft + gi * groupW + 14;
        return (
          <g key={z.name}>
            {series.map((s, si) => {
              const val = z[s.key] || 0;
              const x = gx + si * (barW + innerGap);
              const y = yFor(val);
              const h = Math.max(2, padTop + plotH - y);
              return (
                <g key={s.key}>
                  <title>{`${z.name} • ${s.label}: ${val.toFixed(2)}%`}</title>
                  <rect x={x} y={y} width={barW} height={h} rx={4} fill={s.color} />
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">
                    {val.toFixed(0)}%
                  </text>
                </g>
              );
            })}
            <text
              x={gx + (series.length * (barW + innerGap)) / 2 - 2}
              y={padTop + plotH + 20}
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill="#1e293b"
            >
              {z.name} ({z.count})
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MonthlyTrendLineSvg({ trend, activeMonthKey }) {
  const lines = [
    { key: 'm11', color: '#0ea5e9', label: '1.1 ตรงเวลา' },
    { key: 'm21', color: '#10b981', label: '2.1 นัดหมาย' },
    { key: 'm15', color: '#8b5cf6', label: '1.5 GPS' },
    { key: 'm18', color: '#f59e0b', label: '1.8 ประเภทน้ำ' },
  ];

  const vals = trend.flatMap((t) => lines.map((l) => t[l.key]).filter((v) => v !== null && v !== undefined));
  const minFloor = Math.max(0, Math.min(70, Math.floor((Math.min(...vals, 70) - 5) / 10) * 10));
  const span = Math.max(10, 100 - minFloor);

  const stepX = 82;
  const padLeft = 44;
  const padRight = 28;
  const padTop = 20;
  const padBottom = 38;
  const plotH = 200;
  const plotW = Math.max(560, Math.max(1, trend.length - 1) * stepX);
  const svgW = padLeft + plotW + padRight;
  const svgH = padTop + plotH + padBottom;

  const xFor = (i) =>
    trend.length <= 1 ? padLeft + plotW / 2 : padLeft + (i / (trend.length - 1)) * plotW;
  const yFor = (v) => padTop + plotH - ((Math.max(minFloor, Math.min(100, v)) - minFloor) / span) * plotH;
  const ticks = [minFloor, minFloor + span * 0.5, 100];

  return (
    <svg width={svgW} height={svgH} className="block select-none">
      {ticks.map((t, i) => {
        const y = yFor(t);
        return (
          <g key={i}>
            <line x1={padLeft} x2={svgW - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
              {Math.round(t)}%
            </text>
          </g>
        );
      })}

      {lines.map((l) => {
        const pts = trend
          .map((t, i) => (t[l.key] !== null && t[l.key] !== undefined ? `${xFor(i)},${yFor(t[l.key])}` : null))
          .filter(Boolean);
        if (pts.length === 0) return null;
        return (
          <g key={l.key}>
            <polyline fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts.join(' ')} />
            {trend.map((t, i) => {
              const v = t[l.key];
              if (v === null || v === undefined) return null;
              const isAct = t.key === activeMonthKey;
              return (
                <circle key={t.key} cx={xFor(i)} cy={yFor(v)} r={isAct ? 5 : 3.5} fill="#fff" stroke={l.color} strokeWidth={2.5}>
                  <title>{`${t.label} • ${l.label}: ${v.toFixed(2)}%`}</title>
                </circle>
              );
            })}
          </g>
        );
      })}

      {trend.map((t, i) => (
        <text
          key={t.key}
          x={xFor(i)}
          y={padTop + plotH + 22}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight={t.key === activeMonthKey ? '800' : '600'}
          fill={t.key === activeMonthKey ? '#0284c7' : '#475569'}
        >
          {t.shortLabel}
        </text>
      ))}
    </svg>
  );
}
