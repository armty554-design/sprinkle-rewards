import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Filter, 
  Clock, 
  ArrowRight,
  User
} from 'lucide-react';

export default function SingleVehicleView({ 
  vehicles, 
  selectedVehicleId, 
  onSelectVehicle, 
  onPrint,
  currentMonthLabel 
}) {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [filterDefectsOnly, setFilterDefectsOnly] = useState(false);
  const [activeGroupFilter, setActiveGroupFilter] = useState('all');

  const zones = useMemo(() => {
    return Array.from(new Set(vehicles.map(v => v.general.zone).filter(Boolean))).sort();
  }, [vehicles]);

  const filteredList = useMemo(() => {
    return vehicles.filter(v => {
      if (zoneFilter !== 'all' && v.general.zone !== zoneFilter) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        const car = v.general.carCode.toLowerCase();
        const name = v.general.fullName.toLowerCase();
        return car.includes(q) || name.includes(q);
      }
      return true;
    });
  }, [vehicles, search, zoneFilter]);

  const currentVehicle = useMemo(() => {
    if (!selectedVehicleId) return filteredList[0] || vehicles[0];
    return vehicles.find(v => v.id === selectedVehicleId) || filteredList[0] || vehicles[0];
  }, [vehicles, selectedVehicleId, filteredList]);

  const currentIndex = filteredList.findIndex(v => v?.id === currentVehicle?.id);

  const handlePrev = () => {
    if (currentIndex > 0) onSelectVehicle(filteredList[currentIndex - 1]);
  };

  const handleNext = () => {
    if (currentIndex < filteredList.length - 1) onSelectVehicle(filteredList[currentIndex + 1]);
  };

  if (!currentVehicle) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-100">
        ไม่พบข้อมูลเบอร์รถในเดือนนี้
      </div>
    );
  }

  const { general, totals, groups, defects } = currentVehicle;
  const hasReward = totals.totalReward > 0;
  const hasDefects = defects.length > 0;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ผ่านเกณฑ์
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            เตือน/หลุดเป้า
          </span>
        );
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full text-xs font-medium">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            ตกเกณฑ์/ถูกหัก
          </span>
        );
      default:
        return <span className="text-slate-300">-</span>;
    }
  };

  const allGroups = [
    { key: 'g1', group: groups.group1, title: '1. กลุ่มงานจัดส่ง (เต็ม 120 คะแนน)' },
    { key: 'g2', group: groups.group2, title: '2. กลุ่มงานบริการ (เต็ม 75 คะแนน)' },
    { key: 'g3', group: groups.group3, title: '3. กลุ่มงานเอกสารและผลิตภัณฑ์ (เต็ม 60 คะแนน)' },
    { key: 'g4', group: groups.group4, title: '4. กลุ่มงานภาพลักษณ์แบรนด์ (เต็ม 60 คะแนน)' },
  ];

  const displayedGroups = activeGroupFilter === 'all' 
    ? allGroups 
    : allGroups.filter(g => g.key === activeGroupFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Clean Vehicle Selector (4 cols) */}
      <div className="lg:col-span-4 space-y-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-2xs">
          
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 text-sm">เลือกรถ</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {filteredList.length} คัน
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">{currentMonthLabel}</span>
          </div>

          {/* Search & Zone */}
          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาเบอร์รถ หรือชื่อคนขับ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-sky-500 transition-colors"
              />
            </div>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-700 cursor-pointer"
            >
              <option value="all">ทุกเขต ({vehicles.length} คัน)</option>
              {zones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Vehicle List */}
          <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {filteredList.map((v) => {
              const isSelected = v.id === currentVehicle.id;
              const hasIssues = v.defects.length > 0;

              return (
                <button
                  key={v.id}
                  onClick={() => onSelectVehicle(v)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-sky-50/60 border-sky-400 shadow-2xs'
                      : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {v.general.carCode}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {v.general.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {v.general.zone} • {v.general.carType}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-sm font-bold block ${
                      v.totals.totalReward < 0 ? 'text-rose-600' : v.totals.totalReward > 0 ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {v.totals.totalReward < 0 ? `-฿${Math.abs(v.totals.totalReward).toLocaleString()}` : `฿${v.totals.totalReward.toLocaleString()}`}
                    </span>
                    {hasIssues ? (
                      <span className="text-[10px] text-amber-600 font-medium">
                        ตก {v.defects.length} ข้อ
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-medium">
                        ผ่านครบ
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: Clean Single Vehicle Details (8 cols) */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* NAVIGATOR BAR */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/70 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="p-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ก่อนหน้า</span>
            </button>
            <span className="text-xs text-slate-500 px-1 font-medium">
              คันที่ {currentIndex + 1} จาก {filteredList.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex >= filteredList.length - 1}
              className="p-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onPrint(currentVehicle)}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>พิมพ์สลิป</span>
          </button>
        </div>

        {/* HERO CARD - Clean White Minimalist Style */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-2xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Left: Driver and Car info */}
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200/70 text-sky-700 font-extrabold text-2xl flex items-center justify-center shrink-0">
                {general.carCode}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {general.fullName}
                  </h2>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                    {general.position}
                  </span>
                  {!general.qualified && (
                    <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
                      ส่ง &lt; 3,000 ถัง
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                  <span>รหัส: {general.empId}</span>
                  <span>•</span>
                  <span>{general.carType}</span>
                  <span>•</span>
                  <span>{general.branch} ({general.zone})</span>
                  <span>•</span>
                  <span>หัวหน้า: {general.supervisorLogisticsName || '-'}</span>
                </div>
              </div>
            </div>

            {/* Right: Net Reward */}
            <div className="sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
              <span className="text-xs text-slate-400 font-medium block">
                รวมเงินรางวัลสุทธิ ({currentMonthLabel})
              </span>
              <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-0.5 ${
                totals.totalReward < 0 ? 'text-rose-600' : totals.totalReward > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {totals.totalReward < 0 ? `-฿${Math.abs(totals.totalReward).toLocaleString()}` : `฿${totals.totalReward.toLocaleString()}`}
              </div>
              <div className="flex flex-wrap items-center sm:justify-end gap-1.5 text-xs text-slate-500 mt-1.5 font-medium">
                <span>คะแนนรวม:</span>
                <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                  totals.totalPercent >= 95 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : totals.totalPercent >= 85 
                      ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {totals.totalScore} คะแนน ({totals.totalPercent}%)
                </span>
                <span className="text-slate-300">•</span>
                <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                  totals.overallLevel.includes('<') || totals.totalPercent < 85
                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  ผลประเมิน: {totals.overallLevel}
                </span>
              </div>
            </div>

          </div>

          {/* Quick stats divider row */}
          <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-100 text-center text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">ยอดส่งจริง</span>
              <strong className="text-slate-700 text-sm font-semibold">{general.totalDelivered.toLocaleString()} ถัง</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">สมาชิก</span>
              <strong className="text-slate-700 text-sm font-semibold">{general.totalMembers.toLocaleString()} ราย</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">ระยะทาง</span>
              <strong className="text-slate-700 text-sm font-semibold">{general.distance.toLocaleString()} กม.</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">เฉลี่ยเมตร/ถัง</span>
              <strong className="text-slate-700 text-sm font-semibold">{general.metersPerBottle} ม./ถัง</strong>
            </div>
          </div>

          {/* Pending deduction banner if any */}
          {totals.pendingDeduction > 0 && (
            <div className="mt-4 p-3 bg-rose-50/70 rounded-xl border border-rose-200/60 flex items-center justify-between text-xs text-rose-800">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>มียอดหักติดลบสะสม รอหักเดือนถัดไป</span>
              </span>
              <strong className="font-bold text-rose-700 text-sm">฿{totals.pendingDeduction.toLocaleString()} บาท</strong>
            </div>
          )}

        </div>

        {/* 🔴 SUMMARY OF DEFECTS / ISSUES (ตกหัวข้อไหนบ้าง) */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-800 text-sm">
                หัวข้อที่ตกเกณฑ์ / โดนหักเงินรางวัล
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                hasDefects ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {hasDefects ? `ตก ${defects.length} ข้อ` : 'ผ่านครบ'}
              </span>
            </div>
            <span className="text-xs text-slate-400">สรุปเฉพาะจุดบกพร่อง</span>
          </div>

          {hasDefects ? (
            <div className="divide-y divide-slate-100">
              {defects.map((d, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start space-x-2.5">
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] shrink-0 mt-0.5 ${
                      d.severity === 'danger' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {d.code}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800 text-xs sm:text-sm">
                        {d.title}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {d.detail}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`font-bold text-xs ${
                      d.severity === 'danger' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {d.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-emerald-700 bg-emerald-50/50 rounded-xl flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>เบอร์รถนี้ผ่านเกณฑ์มาตรฐานครบถ้วน ไม่มีรายการถูกหักคะแนนหรือตกเกณฑ์</span>
            </div>
          )}
        </div>

        {/* 📋 COMPLETE ITEM-BY-ITEM EVALUATION (แจกแจงเกณฑ์แต่ละข้อ) */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-2xs overflow-hidden">
          
          {/* Header & Filter Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                แจกแจงเกณฑ์ประเมินครบทุกข้อ (1.1 ถึง 4.7)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ผลงานจริง, คะแนนที่ได้รับ และยอดเงินรางวัลรายข้อ
              </p>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setFilterDefectsOnly(!filterDefectsOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  filterDefectsOnly
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{filterDefectsOnly ? 'แสดงเฉพาะข้อที่ตก' : 'แสดงครบทุกข้อ'}</span>
              </button>
            </div>
          </div>

          {/* Group Filter Pills */}
          <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveGroupFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeGroupFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ทั้งหมด
            </button>
            {allGroups.map(g => (
              <button
                key={g.key}
                onClick={() => setActiveGroupFilter(g.key)}
                className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                  activeGroupFilter === g.key
                    ? 'bg-sky-500 text-white font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {g.group.name}
              </button>
            ))}
          </div>

          {/* Clean Tables */}
          <div className="divide-y divide-slate-100">
            {displayedGroups.map(({ key, group, title }) => (
              <CleanGroupSection
                key={key}
                group={group}
                title={title}
                renderStatusBadge={renderStatusBadge}
                filterDefectsOnly={filterDefectsOnly}
              />
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}

function CleanGroupSection({ group, title, renderStatusBadge, filterDefectsOnly }) {
  const displayedItems = filterDefectsOnly
    ? group.items.filter(item => item.status === 'fail' || item.status === 'warning')
    : group.items;

  if (filterDefectsOnly && displayedItems.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Group Header */}
      <div className="px-5 py-3 bg-slate-50/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800 text-xs sm:text-sm">{title}</span>
          <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${
            group.percent >= 85 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-100 text-rose-800 border border-rose-200'
          }`}>
            {group.score} คะแนน ({group.percent}%) • {group.level}
          </span>
        </div>
        <div className={`font-bold text-xs sm:text-sm ${
          group.reward < 0 ? 'text-rose-600' : group.reward > 0 ? 'text-emerald-600' : 'text-slate-400'
        }`}>
          {group.reward < 0 ? `-฿${Math.abs(group.reward).toLocaleString()}` : `฿${group.reward.toLocaleString()}`} บาท
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-100 bg-white">
            <tr>
              <th className="py-2.5 px-4 w-12">รหัส</th>
              <th className="py-2.5 px-4">หัวข้อ</th>
              <th className="py-2.5 px-3">เกณฑ์เต็ม</th>
              <th className="py-2.5 px-3 text-right">ผลงานจริง</th>
              <th className="py-2.5 px-3 text-right">คะแนน</th>
              <th className="py-2.5 px-3 text-right">%</th>
              <th className="py-2.5 px-4 text-right">รางวัล/ยอดหัก</th>
              <th className="py-2.5 px-4 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {displayedItems.map((item, idx) => (
              <tr 
                key={idx} 
                className={`transition-colors hover:bg-slate-50/50 ${
                  item.status === 'fail' ? 'bg-rose-50/20' : ''
                }`}
              >
                <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.code}</td>
                <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                <td className="py-3 px-3 text-slate-400">{item.target}</td>
                <td className="py-3 px-3 text-right font-bold text-slate-800">{item.result}</td>
                <td className="py-3 px-3 text-right">
                  {renderItemScoreBadge(item)}
                </td>
                <td className="py-3 px-3 text-right text-xs">
                  {item.percent !== null ? (
                    <span className={`font-bold ${
                      item.percent >= 95 ? 'text-emerald-700' : item.percent >= 85 ? 'text-sky-700' : 'text-rose-600'
                    }`}>
                      {item.percent}%
                    </span>
                  ) : '-'}
                </td>
                <td className="py-3 px-4 text-right font-bold">
                  {item.reward !== undefined ? (
                    <span className={item.reward < 0 ? 'text-rose-600' : item.reward > 0 ? 'text-emerald-600' : 'text-slate-300'}>
                      {item.reward < 0 ? `-฿${Math.abs(item.reward)}` : `฿${item.reward.toLocaleString()}`}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-3 px-4 text-center">
                  {renderStatusBadge(item.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderItemScoreBadge(item) {
  const { score, fullScore, status } = item;

  if (score < 0) {
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
        {score}
      </span>
    );
  }

  if (fullScore > 0) {
    if (score >= fullScore) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {score}
        </span>
      );
    }
    if (score > 0) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          {score}
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
        {score}
      </span>
    );
  }

  if (score > 0) {
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        +{score}
      </span>
    );
  }

  if (status === 'fail') {
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
        {score}
      </span>
    );
  }

  return (
    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold text-slate-700 bg-slate-100">
      {score}
    </span>
  );
}
