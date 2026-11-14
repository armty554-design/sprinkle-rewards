import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  AlertTriangle,
  Trophy,
  MapPin,
  Truck,
  Coins,
  ChevronRight,
  ChevronDown,
  Building2,
  Search,
  Award,
  CheckCircle2,
} from 'lucide-react';

export default function BranchAnalytics({
  data,
  onSelectVehicle,
  selectedBranch: controlledBranch,
  onSelectBranch,
}) {
  const { meta, topDefects, vehicles = [] } = data;
  const [internalBranch, setInternalBranch] = useState('ALL');
  const selectedBranch =
    controlledBranch !== undefined
      ? !controlledBranch || String(controlledBranch).toLowerCase() === 'all'
        ? 'ALL'
        : controlledBranch
      : internalBranch;
  const setSelectedBranch = (nextBranch) => {
    const normalized =
      !nextBranch || String(nextBranch).toLowerCase() === 'all'
        ? 'ALL'
        : nextBranch;
    if (typeof onSelectBranch === 'function') {
      onSelectBranch(normalized === 'ALL' ? 'all' : normalized);
    } else {
      setInternalBranch(normalized);
    }
  };
  const [breakdownMode, setBreakdownMode] = useState('branch'); // 'branch' | 'zone'
  const [expandedDefectKey, setExpandedDefectKey] = useState(null);
  const [showAllDefects, setShowAllDefects] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('top'); // 'top' | 'risk'
  const [boardSearch, setBoardSearch] = useState('');
  const [showAllRows, setShowAllRows] = useState(false);

  const branches = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.general?.branch).filter(Boolean))).sort(),
    [vehicles]
  );

  useEffect(() => {
    if (branches.length > 0 && selectedBranch !== 'ALL' && !branches.includes(selectedBranch)) {
      setSelectedBranch('ALL');
    }
  }, [branches, selectedBranch]);

  useEffect(() => {
    setShowAllRows(false);
    setExpandedDefectKey(null);
    if (selectedBranch !== 'ALL') {
      setBreakdownMode('zone');
    }
  }, [selectedBranch]);

  const filteredVehicles = useMemo(() => {
    if (selectedBranch === 'ALL') return vehicles;
    return vehicles.filter((v) => v.general?.branch === selectedBranch);
  }, [vehicles, selectedBranch]);

  const branchDisplayLabel =
    selectedBranch === 'ALL'
      ? branches.length > 1
        ? `ทุกสาขา (${branches.length} สาขา)`
        : branches[0] || meta?.branch || 'ภาพรวม'
      : `สาขา ${selectedBranch}`;

  const vehicleByCarCode = useMemo(() => {
    const map = new Map();
    filteredVehicles.forEach((v) => {
      if (v.general?.carCode) map.set(v.general.carCode, v);
    });
    return map;
  }, [filteredVehicles]);

  const stats = useMemo(() => {
    const total = filteredVehicles.length;
    const totalRewards = filteredVehicles.reduce((s, v) => s + (v.totals?.totalReward || 0), 0);
    const avgReward = total > 0 ? Math.round(totalRewards / total) : 0;
    const qualifiedCount = filteredVehicles.filter((v) => v.general?.qualified).length;

    let excellentCount = 0; // >= 95%
    let midCount = 0; // 85% - 94.99%
    let riskCount = 0; // < 85%

    filteredVehicles.forEach((v) => {
      const pct = Number(v.totals?.totalPercent || 0);
      if (pct >= 95) excellentCount++;
      else if (pct >= 85) midCount++;
      else riskCount++;
    });

    const avgPercent = (key) =>
      total > 0
        ? Math.round(
            (filteredVehicles.reduce((s, v) => s + (v.groups?.[key]?.percent || 0), 0) / total) *
              10
          ) / 10
        : 0;

    const avgScore = (key) =>
      total > 0
        ? Math.round(
            (filteredVehicles.reduce((s, v) => s + (v.groups?.[key]?.score || 0), 0) / total) *
              10
          ) / 10
        : 0;

    return {
      total,
      totalRewards,
      avgReward,
      qualifiedCount,
      excellentCount,
      excellentPct: total > 0 ? Math.round((excellentCount / total) * 100) : 0,
      midCount,
      midPct: total > 0 ? Math.round((midCount / total) * 100) : 0,
      riskCount,
      riskPct: total > 0 ? Math.round((riskCount / total) * 100) : 0,
      groups: [
        { key: 'g1', label: '1. จัดส่งตรงเวลา', avgPct: avgPercent('group1'), avgScore: avgScore('group1'), bar: 'bg-sky-500', text: 'text-sky-700' },
        { key: 'g2', label: '2. งานบริการ', avgPct: avgPercent('group2'), avgScore: avgScore('group2'), bar: 'bg-emerald-500', text: 'text-emerald-700' },
        { key: 'g3', label: '3. เอกสาร & ผลิตภัณฑ์', avgPct: avgPercent('group3'), avgScore: avgScore('group3'), bar: 'bg-indigo-500', text: 'text-indigo-700' },
        { key: 'g4', label: '4. ภาพลักษณ์แบรนด์', avgPct: avgPercent('group4'), avgScore: avgScore('group4'), bar: 'bg-violet-500', text: 'text-violet-700' },
      ],
    };
  }, [filteredVehicles]);

  const activeTopDefects = useMemo(() => {
    if (selectedBranch === 'ALL' && Array.isArray(topDefects)) {
      return topDefects;
    }
    const map = {};
    filteredVehicles.forEach((v) => {
      (v.defects || []).forEach((d) => {
        const key = `${d.code}|${d.title}`;
        if (!map[key]) {
          map[key] = {
            code: d.code,
            title: d.title,
            severity: d.severity,
            count: 0,
            cars: [],
          };
        }
        map[key].count++;
        map[key].cars.push(v.general.carCode);
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredVehicles, selectedBranch, topDefects]);

  const branchComparison = useMemo(() => {
    const map = {};
    vehicles.forEach((v) => {
      const b = v.general?.branch || 'ไม่ระบุสาขา';
      if (!map[b]) {
        map[b] = { name: b, count: 0, totalRewards: 0, excellentCount: 0, riskCount: 0, totalPercentSum: 0 };
      }
      map[b].count++;
      map[b].totalRewards += v.totals?.totalReward || 0;
      const pct = Number(v.totals?.totalPercent || 0);
      map[b].totalPercentSum += pct;
      if (pct >= 95) map[b].excellentCount++;
      if (pct < 85) map[b].riskCount++;
    });
    return Object.values(map)
      .map((b) => ({
        ...b,
        avgReward: b.count > 0 ? Math.round(b.totalRewards / b.count) : 0,
        avgPercent: b.count > 0 ? Math.round((b.totalPercentSum / b.count) * 10) / 10 : 0,
        excellentPct: b.count > 0 ? Math.round((b.excellentCount / b.count) * 100) : 0,
      }))
      .sort((a, b) => b.avgPercent - a.avgPercent);
  }, [vehicles]);

  const zoneComparison = useMemo(() => {
    const map = {};
    filteredVehicles.forEach((v) => {
      const z = v.general?.zone || 'ไม่ระบุเขต';
      if (!map[z]) {
        map[z] = { name: z, count: 0, totalRewards: 0, excellentCount: 0, totalPercentSum: 0 };
      }
      map[z].count++;
      map[z].totalRewards += v.totals?.totalReward || 0;
      const pct = Number(v.totals?.totalPercent || 0);
      map[z].totalPercentSum += pct;
      if (pct >= 95) map[z].excellentCount++;
    });
    return Object.values(map)
      .map((z) => ({
        ...z,
        avgReward: z.count > 0 ? Math.round(z.totalRewards / z.count) : 0,
        avgPercent: z.count > 0 ? Math.round((z.totalPercentSum / z.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.totalRewards - a.totalRewards);
  }, [filteredVehicles]);

  const leaderboardRows = useMemo(() => {
    let base =
      leaderboardTab === 'risk'
        ? filteredVehicles.filter((v) => (v.totals?.totalPercent || 0) < 85 || (v.defects?.length || 0) > 0)
        : filteredVehicles;

    if (boardSearch.trim()) {
      const q = boardSearch.trim().toLowerCase();
      base = base.filter(
        (v) =>
          v.general?.carCode?.toLowerCase().includes(q) ||
          v.general?.fullName?.toLowerCase().includes(q) ||
          v.general?.branch?.toLowerCase().includes(q)
      );
    }

    return [...base].sort((a, b) => {
      if (leaderboardTab === 'risk') {
        const diffPct = (a.totals?.totalPercent || 0) - (b.totals?.totalPercent || 0);
        if (diffPct !== 0) return diffPct;
        return (b.defects?.length || 0) - (a.defects?.length || 0);
      }
      const diffReward = (b.totals?.totalReward || 0) - (a.totals?.totalReward || 0);
      if (diffReward !== 0) return diffReward;
      return (b.totals?.totalPercent || 0) - (a.totals?.totalPercent || 0);
    });
  }, [filteredVehicles, leaderboardTab, boardSearch]);

  const displayedBoardRows = showAllRows ? leaderboardRows : leaderboardRows.slice(0, 10);
  const displayedDefects = showAllDefects ? activeTopDefects : activeTopDefects.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* 1. CLEAN HEADER + BRANCH PICKER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-700">
            <BarChart3 className="w-4 h-4" />
            <span>สถิติสาขา • {branchDisplayLabel}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            ภาพรวมผลคะแนนและเงินรางวัล เดือน {meta?.month}
          </h2>
        </div>

        {branches.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              aria-label="เลือกสาขาในหน้าสถิติสาขา"
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
            >
              <option value="ALL">ทุกสาขา ({branches.length} สาขา)</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  สาขา {b}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. FOUR SCANNABLE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>เงินรางวัลรวม</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            ฿{stats.totalRewards.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            เฉลี่ย <strong className="text-emerald-700">฿{stats.avgReward.toLocaleString()}</strong> / คัน
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>จำนวนรถที่ประเมิน</span>
            <Truck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {stats.total.toLocaleString()} <span className="text-sm font-semibold text-slate-500">คัน</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            ผ่านเกณฑ์ ≥ 3,000 ถัง <strong className="text-slate-700">{stats.qualifiedCount.toLocaleString()} คัน</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>ระดับดีเยี่ยม (≥ 95%)</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1.5">
            {stats.excellentCount.toLocaleString()} <span className="text-sm font-semibold">คัน</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            คิดเป็น <strong className="text-emerald-700">{stats.excellentPct}%</strong> ของรถทั้งหมด
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLeaderboardTab('risk')}
          className="text-left bg-white rounded-2xl border border-rose-200/80 hover:border-rose-300 p-4 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>กลุ่มต้องติดตาม (&lt; 85%)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1.5">
            {stats.riskCount.toLocaleString()} <span className="text-sm font-semibold">คัน</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            คิดเป็น <strong className="text-rose-600">{stats.riskPct}%</strong> (คลิกดูรายชื่อด้านล่าง)
          </p>
        </button>
      </div>

      {/* 3. GROUP AVERAGES + SCORE DISTRIBUTION BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 4 Groups */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4">คะแนนเฉลี่ยแยก 4 กลุ่มงาน</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {stats.groups.map((g) => (
              <div key={g.key} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">{g.label}</span>
                  <span className={`font-black text-sm ${g.text}`}>{g.avgPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${g.bar}`}
                    style={{ width: `${Math.min(100, Math.max(0, g.avgPct))}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  เฉลี่ย {g.avgScore} คะแนน
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Clean Stacked Level Distribution */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">สัดส่วนระดับผลงานทั้งกลุ่ม</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แบ่งตามเกณฑ์คะแนนรวมรายคัน ({stats.total} คัน)
            </p>

            {/* Stacked Progress Bar */}
            <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex mt-5 mb-4">
              {stats.excellentPct > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${stats.excellentPct}%` }}
                  title={`95% ขึ้นไป: ${stats.excellentCount} คัน`}
                />
              )}
              {stats.midPct > 0 && (
                <div
                  className="bg-sky-400 h-full transition-all"
                  style={{ width: `${stats.midPct}%` }}
                  title={`85 - 94.99%: ${stats.midCount} คัน`}
                />
              )}
              {stats.riskPct > 0 && (
                <div
                  className="bg-rose-400 h-full transition-all"
                  style={{ width: `${stats.riskPct}%` }}
                  title={`ต่ำกว่า 85%: ${stats.riskCount} คัน`}
                />
              )}
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="flex items-center gap-2 font-semibold text-emerald-900">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                95% ขึ้นไป (ดีเยี่ยม)
              </span>
              <strong className="text-emerald-800">{stats.excellentCount} คัน ({stats.excellentPct}%)</strong>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-50/60 border border-sky-100">
              <span className="flex items-center gap-2 font-semibold text-sky-900">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                85 – 94.99% (ผ่านมาตรฐาน)
              </span>
              <strong className="text-sky-800">{stats.midCount} คัน ({stats.midPct}%)</strong>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
              <span className="flex items-center gap-2 font-semibold text-rose-900">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                ต่ำกว่า 85% (ต้องติดตาม)
              </span>
              <strong className="text-rose-700">{stats.riskCount} คัน ({stats.riskPct}%)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BRANCH / ZONE COMPARISON & TOP DEFECTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Branch or Zone Comparison */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500" />
              <h3 className="font-bold text-slate-900 text-sm">
                {breakdownMode === 'branch' && selectedBranch === 'ALL'
                  ? 'เปรียบเทียบผลงานรายสาขา'
                  : 'เปรียบเทียบผลงานรายเขต (Zone)'}
              </h3>
            </div>

            {selectedBranch === 'ALL' && branches.length > 1 && (
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setBreakdownMode('branch')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    breakdownMode === 'branch' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  รายสาขา
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownMode('zone')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    breakdownMode === 'zone' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  รายเขต
                </button>
              </div>
            )}
          </div>

          {breakdownMode === 'branch' && selectedBranch === 'ALL' && branches.length > 1 ? (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-[11px] text-slate-400 border-b border-slate-100 sticky top-0 bg-white">
                  <tr>
                    <th className="text-left py-2 font-semibold">สาขา (คลิกเพื่อดูเจาะจง)</th>
                    <th className="text-right py-2 font-semibold">รถ</th>
                    <th className="text-right py-2 font-semibold">เฉลี่ย %</th>
                    <th className="text-right py-2 font-semibold">เฉลี่ย/คัน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchComparison.map((b) => (
                    <tr
                      key={b.name}
                      onClick={() => setSelectedBranch(b.name)}
                      className="hover:bg-sky-50/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 font-bold text-slate-800">{b.name}</td>
                      <td className="py-2.5 text-right text-slate-500">{b.count}</td>
                      <td className="py-2.5 text-right font-bold text-sky-700">{b.avgPercent}%</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        ฿{b.avgReward.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {zoneComparison.map((zone) => (
                <div key={zone.name} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{zone.name}</span>
                    <span className="text-slate-500 font-medium">{zone.count} คัน</span>
                  </div>
                  <div className="text-lg font-black text-emerald-600 mt-1">
                    ฿{zone.totalRewards.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>เฉลี่ย ฿{zone.avgReward.toLocaleString()}/คัน</span>
                    <span className="font-semibold text-sky-700">{zone.avgPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clean Top Defects Accordion */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">หัวข้อที่ตกเกณฑ์บ่อยที่สุด</h3>
            </div>
            {activeTopDefects.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllDefects((p) => !p)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
              >
                {showAllDefects ? 'ย่อเหลือ 5 อันดับ' : `ดูทั้งหมด (${activeTopDefects.length})`}
              </button>
            )}
          </div>

          {displayedDefects.length === 0 ? (
            <div className="p-6 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs font-medium text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span>ไม่พบรถที่ตกเกณฑ์หรือมีรายการหักในกลุ่มที่เลือก</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedDefects.map((defect) => {
                const key = `${defect.code}|${defect.title}`;
                const denom = stats.total || 1;
                const failPct = Math.round((defect.count / denom) * 100);
                const isOpen = expandedDefectKey === key;

                return (
                  <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono font-bold text-slate-700 shrink-0">
                          {defect.code}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{defect.title}</span>
                      </div>
                      <span className="font-bold text-amber-700 shrink-0">
                        {defect.count} คัน ({failPct}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${defect.severity === 'danger' ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${failPct}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedDefectKey(isOpen ? null : key)}
                        className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                      >
                        <span>{isOpen ? 'ซ่อนรายชื่อ' : `ดู ${defect.cars.length} คัน`}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-slate-200/70">
                        {defect.cars.map((car, idx) => {
                          const matchedV = vehicleByCarCode.get(car);
                          return (
                            <button
                              key={`${car}-${idx}`}
                              type="button"
                              onClick={() => matchedV && onSelectVehicle && onSelectVehicle(matchedV)}
                              className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 rounded border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                            >
                              {car}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. COMPACT LEADERBOARD (TOP 10 / RISK FOCUS) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold self-start">
            <button
              type="button"
              onClick={() => {
                setLeaderboardTab('top');
                setShowAllRows(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                leaderboardTab === 'top' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>อันดับสูงสุด</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLeaderboardTab('risk');
                setShowAllRows(false);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                leaderboardTab === 'risk' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>กลุ่มต้องติดตาม ({stats.riskCount})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเบอร์รถ ชื่อ หรือสาขา..."
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayedBoardRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ไม่พบรายการตามเงื่อนไขที่เลือก
            </div>
          ) : (
            displayedBoardRows.map((v, idx) => {
              const hasReward = (v.totals?.totalReward || 0) > 0;
              const pct = Number(v.totals?.totalPercent || 0);

              return (
                <div
                  key={v.id}
                  onClick={() => onSelectVehicle && onSelectVehicle(v)}
                  className="py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        leaderboardTab === 'top' && idx === 0
                          ? 'bg-amber-400 text-amber-950'
                          : leaderboardTab === 'top' && idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : leaderboardTab === 'top' && idx === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 group-hover:text-sky-600 text-sm">
                          {v.general.carCode}
                        </span>
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {v.general.fullName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {v.general.branch ? `${v.general.branch} • ` : ''}
                        {v.general.zone} • คะแนน {pct}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-sm font-bold ${hasReward ? 'text-emerald-600' : 'text-slate-400'}`}>
                        ฿{(v.totals?.totalReward || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px]">
                        {v.defects.length > 0 ? (
                          <span className="text-amber-600 font-medium">ตก {v.defects.length} ข้อ</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">ผ่านครบ</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {leaderboardRows.length > 10 && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowAllRows((p) => !p)}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {showAllRows
                ? 'ย่อแสดง 10 อันดับแรก'
                : `ดูทั้งหมด (${leaderboardRows.length} คัน)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
