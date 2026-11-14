import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  Trophy, 
  TrendingUp, 
  MapPin, 
  Truck, 
  Coins, 
  CheckCircle2, 
  ChevronRight,
  Building2
} from 'lucide-react';

export default function BranchAnalytics({ data, onSelectVehicle, onFilterByDefect }) {
  const { meta, summary, topDefects, vehicles = [] } = data;
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  const branches = useMemo(
    () => Array.from(new Set(vehicles.map(v => v.general?.branch).filter(Boolean))).sort(),
    [vehicles]
  );

  useEffect(() => {
    if (selectedBranch !== 'ALL' && !branches.includes(selectedBranch)) {
      setSelectedBranch('ALL');
    }
  }, [branches, selectedBranch]);

  const filteredVehicles = useMemo(() => {
    if (selectedBranch === 'ALL') return vehicles;
    return vehicles.filter(v => v.general?.branch === selectedBranch);
  }, [vehicles, selectedBranch]);

  const branchDisplayLabel = selectedBranch === 'ALL'
    ? (branches.length > 1 ? `ทุกสาขา (${branches.length} สาขา)` : (branches[0] || meta.branch))
    : `สาขา ${selectedBranch}`;

  const activeSummary = useMemo(() => {
    const totalVehicles = filteredVehicles.length;
    const totalRewards = filteredVehicles.reduce((sum, v) => sum + (v.totals?.totalReward || 0), 0);
    const avgReward = totalVehicles > 0 ? Math.round(totalRewards / totalVehicles) : 0;
    const qualifiedCount = filteredVehicles.filter(v => v.general?.qualified).length;
    const avgPercent = (key) => totalVehicles > 0
      ? Math.round((filteredVehicles.reduce((sum, v) => sum + (v.groups?.[key]?.percent || 0), 0) / totalVehicles) * 10) / 10
      : 0;
    const avgScore = (key) => totalVehicles > 0
      ? Math.round((filteredVehicles.reduce((sum, v) => sum + (v.groups?.[key]?.score || 0), 0) / totalVehicles) * 10) / 10
      : 0;

    const levelCounts = {};
    filteredVehicles.forEach(v => {
      const lv = v.totals?.overallLevel || 'ไม่ระบุ';
      levelCounts[lv] = (levelCounts[lv] || 0) + 1;
    });

    if (selectedBranch === 'ALL' && summary && totalVehicles === summary.totalVehicles) {
      return {
        ...summary,
        qualifiedCount,
        groupAverages: {
          g1: { score: avgScore('group1'), percent: avgPercent('group1') },
          g2: { score: avgScore('group2'), percent: avgPercent('group2') },
          g3: { score: avgScore('group3'), percent: avgPercent('group3') },
          g4: { score: avgScore('group4'), percent: avgPercent('group4') }
        },
        levelCounts
      };
    }

    return {
      totalVehicles,
      totalRewards,
      avgReward,
      qualifiedCount,
      groupAverages: {
        g1: { score: avgScore('group1'), percent: avgPercent('group1') },
        g2: { score: avgScore('group2'), percent: avgPercent('group2') },
        g3: { score: avgScore('group3'), percent: avgPercent('group3') },
        g4: { score: avgScore('group4'), percent: avgPercent('group4') }
      },
      levelCounts
    };
  }, [filteredVehicles, selectedBranch, summary]);

  const activeTopDefects = useMemo(() => {
    if (selectedBranch === 'ALL' && Array.isArray(topDefects)) {
      return topDefects;
    }
    const map = {};
    filteredVehicles.forEach(v => {
      (v.defects || []).forEach(d => {
        const key = `${d.code}|${d.title}`;
        if (!map[key]) {
          map[key] = {
            code: d.code,
            title: d.title,
            severity: d.severity,
            count: 0,
            cars: []
          };
        }
        map[key].count++;
        map[key].cars.push(v.general.carCode);
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredVehicles, selectedBranch, topDefects]);

  // Group by zone
  const zoneStats = {};
  filteredVehicles.forEach(v => {
    const z = v.general.zone || 'ไม่ระบุ';
    if (!zoneStats[z]) {
      zoneStats[z] = {
        name: z,
        count: 0,
        totalRewards: 0,
        vehicles: []
      };
    }
    zoneStats[z].count++;
    zoneStats[z].totalRewards += v.totals.totalReward;
    zoneStats[z].vehicles.push(v);
  });

  const zoneList = Object.values(zoneStats).map(z => ({
    ...z,
    avgReward: z.count > 0 ? Math.round(z.totalRewards / z.count) : 0
  })).sort((a, b) => b.totalRewards - a.totalRewards);

  // Sorted leaderboard
  const leaderboard = [...filteredVehicles].sort((a, b) => b.totals.totalReward - a.totals.totalReward);
  const maxReward = Math.max(leaderboard[0]?.totals.totalReward || 1, 1);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sky-300 text-xs font-semibold uppercase tracking-wider">
              <BarChart3 className="w-4 h-4" />
              <span>ภาพรวมและสถิติวิเคราะห์ • {branchDisplayLabel}</span>
            </div>
            <h2 className="text-2xl font-bold mt-1 tracking-tight">
              การประเมินผลคะแนนและรางวัล ประจำเดือน {meta.month}
            </h2>
            <p className="text-xs text-sky-200 mt-1">
              วิเคราะห์สาเหตุและจุดบกพร่องที่พบบ่อย พร้อมอันดับผลงานของรถทุกคัน ({activeSummary.totalVehicles.toLocaleString()} คัน • ผ่านเกณฑ์ 3,000 ถัง {activeSummary.qualifiedCount.toLocaleString()} คัน)
            </p>
            {branches.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-sky-200 font-medium">
                  <Building2 className="w-3.5 h-3.5" />
                  เลือกดูสาขา:
                </span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  aria-label="เลือกสาขาในหน้าสถิติสาขา"
                  className="bg-slate-900/60 hover:bg-slate-900/80 text-white border border-white/25 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
                >
                  <option value="ALL" className="text-slate-900">ทุกสาขา ({branches.length} สาขา)</option>
                  {branches.map(b => (
                    <option key={b} value={b} className="text-slate-900">{b}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 shrink-0">
            <div>
              <span className="text-[11px] text-sky-200 block">
                {selectedBranch === 'ALL' ? 'รวมเงินรางวัลที่แสดง' : `รวมเงินรางวัลสาขา ${selectedBranch}`}
              </span>
              <strong className="text-2xl font-black text-white">฿{activeSummary.totalRewards.toLocaleString()}</strong>
            </div>
            <div className="border-l border-white/20 pl-4">
              <span className="text-[11px] text-sky-200 block">เฉลี่ยต่อคัน</span>
              <strong className="text-xl font-bold text-sky-300">฿{activeSummary.avgReward.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Group Averages & Level Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'กลุ่ม 1 จัดส่งตรงเวลา', avg: activeSummary.groupAverages.g1, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
          { label: 'กลุ่ม 2 งานบริการ', avg: activeSummary.groupAverages.g2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'กลุ่ม 3 เอกสาร & ผลิตภัณฑ์', avg: activeSummary.groupAverages.g3, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'กลุ่ม 4 ภาพลักษณ์แบรนด์', avg: activeSummary.groupAverages.g4, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' }
        ].map(item => (
          <div key={item.label} className={`rounded-xl p-3.5 border ${item.bg}`}>
            <span className="text-[11px] font-semibold text-slate-600 block truncate">{item.label}</span>
            <div className={`text-xl font-black mt-1 ${item.color}`}>
              {item.avg.percent}%
            </div>
            <span className="text-[11px] text-slate-500">
              เฉลี่ย {item.avg.score} คะแนน
            </span>
          </div>
        ))}

        <div className="rounded-xl p-3.5 border bg-white border-slate-200">
          <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">สัดส่วนระดับผลประเมินรวม</span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(activeSummary.levelCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([lv, count]) => (
                <span
                  key={lv}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    lv.includes('<')
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : lv.includes('>= 95') || lv.includes('≥ 95') || lv.includes('>=95')
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}
                >
                  {lv}: {count}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Grid: Top Common Defects & Zone Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TOP COMMON DEFECTS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>หัวข้อที่ตกเกณฑ์ / ถูกหักบ่อยที่สุด ({branchDisplayLabel})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                จุดที่พนักงานขับรถหลุดมาตรฐานมากที่สุด ซึ่งส่งผลต่อการถูกหักเงินรางวัล
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {activeTopDefects.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center">
                ไม่พบรถที่ตกเกณฑ์หรือมีรายการหักในกลุ่มที่เลือก
              </div>
            ) : activeTopDefects.slice(0, 6).map((defect, idx) => {
              const denom = activeSummary.totalVehicles || 1;
              const failPercent = Math.round((defect.count / denom) * 100);
              const displayedCars = defect.cars.slice(0, 18);
              const extraCarsCount = defect.cars.length - displayedCars.length;

              return (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-all"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-800 shrink-0">
                        {defect.code}
                      </span>
                      <strong className="text-slate-800 text-sm truncate">{defect.title}</strong>
                    </div>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                      ตก {defect.count} คัน ({failPercent}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                    <div 
                      className={`h-full rounded-full ${
                        defect.severity === 'danger' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${failPercent}%` }}
                    />
                  </div>

                  {/* List of car codes with this defect */}
                  <div className="flex flex-wrap items-center gap-1 mt-1 text-[11px] text-slate-500">
                    <span>เบอร์รถที่ตก:</span>
                    {displayedCars.map((car, cIdx) => (
                      <span key={`${car}-${cIdx}`} className="px-1.5 py-0.2 bg-white rounded border border-slate-200 font-mono text-slate-700 font-semibold">
                        {car}
                      </span>
                    ))}
                    {extraCarsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-slate-100 rounded border border-slate-200 text-slate-600 font-semibold">
                        +{extraCarsCount} คัน
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ZONE PERFORMANCE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-sky-500" />
                  <span>เปรียบเทียบผลงานแยกตามเขตจัดส่ง</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ยอดเงินรางวัลและสถิติตามเขตพื้นที่การดูแล
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {zoneList.map(zone => (
                <div key={zone.name} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{zone.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{zone.count} คัน</span>
                  </div>
                  <div className="text-lg font-black text-emerald-600 mt-1">
                    ฿{zone.totalRewards.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    เฉลี่ย ฿{zone.avgReward.toLocaleString()}/คัน
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-sky-50 rounded-xl p-4 border border-sky-200 text-xs text-sky-900">
            <h4 className="font-bold flex items-center gap-1.5 mb-1 text-sky-950">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              <span>สรุปภาพรวมผู้ตรวจการและธุรการ</span>
            </h4>
            <p>
              มีหัวหน้าโลจิสติกส์และธุรการร่วมดูแลประสานงานผลคะแนนในระบบ หากต้องการพิมพ์รายงานส่งให้พนักงานขับรถรายบุคคล สามารถคลิกที่เบอร์รถหรือกดปุ่มพิมพ์สลิปในหน้ารายเบอร์รถได้ทันที
            </p>
          </div>
        </div>

      </div>

      {/* LEADERBOARD TABLE / RANKING */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>อันดับเงินรางวัลสูงสุดประจำเดือน (Leaderboard)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดอันดับตามเงินรางวัลสุทธิที่ได้รับจริงของรถทุกคัน
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {leaderboard.map((v, idx) => {
            const pct = Math.max(0, Math.round((v.totals.totalReward / maxReward) * 100));
            const hasReward = v.totals.totalReward > 0;

            return (
              <div 
                key={v.id}
                onClick={() => onSelectVehicle(v)}
                className="p-3 rounded-xl border border-slate-100 hover:border-sky-300 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                {/* Rank & Car */}
                <div className="flex items-center space-x-3 w-48 shrink-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                    idx === 1 ? 'bg-slate-300 text-slate-800' :
                    idx === 2 ? 'bg-amber-600 text-white' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {v.general.carCode}
                    </span>
                    <span className="text-xs text-slate-500 block truncate max-w-[120px]">
                      {v.general.fullName}
                    </span>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="flex-1 hidden sm:block px-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>{v.general.branch ? `${v.general.branch} • ` : ''}{v.general.zone} • {v.general.carType}</span>
                    <span>คะแนน {v.totals.totalScore} ({v.totals.totalPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        hasReward ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Reward amount & Defects count */}
                <div className="text-right shrink-0">
                  <span className={`text-base font-bold ${hasReward ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ฿{v.totals.totalReward.toLocaleString()}
                  </span>
                  <div className="text-[11px]">
                    {v.defects.length > 0 ? (
                      <span className="text-amber-600 font-medium">ตก {v.defects.length} หัวข้อ</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">ผ่านครบ</span>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
