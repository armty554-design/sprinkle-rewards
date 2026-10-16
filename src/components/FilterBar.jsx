import React from 'react';
import { Search, X, Filter, ArrowUpDown } from 'lucide-react';

export default function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedZone,
  setSelectedZone,
  selectedType,
  setSelectedType,
  selectedStatus,
  setSelectedStatus,
  sortBy,
  setSortBy,
  zones,
  types,
  totalFiltered,
  totalAll,
  onReset
}) {
  const isFiltered = searchQuery || selectedZone !== 'all' || selectedType !== 'all' || selectedStatus !== 'all';

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs mb-6 no-print">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเบอร์รถ (เช่น 13101, 13L11), ชื่อคนขับ หรือรหัสพนักงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zone filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 hidden sm:inline">เขต:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="text-xs sm:text-sm py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">ทุกเขต</option>
              {zones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Car type filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 hidden sm:inline">ประเภท:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs sm:text-sm py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">ทุกประเภทรถ</option>
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 hidden sm:inline">สถานะ:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs sm:text-sm py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-sky-500"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="has_reward">ได้รับเงินรางวัล (&gt; 0)</option>
              <option value="no_reward">ไม่ได้รับรางวัล (0 บ.)</option>
              <option value="with_defects">มีหัวข้อตกเกณฑ์/ถูกหัก</option>
              <option value="clean">ไม่มีข้อบกพร่อง</option>
              <option value="pending_deduction">มียอดรอหักเดือนถัดไป</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 hidden sm:inline">เรียง:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs sm:text-sm py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-sky-500 font-medium"
            >
              <option value="reward_desc">รางวัล: มากไปน้อย</option>
              <option value="reward_asc">รางวัล: น้อยไปมาก</option>
              <option value="score_desc">คะแนนรวม: สูงสุด</option>
              <option value="car_asc">เบอร์รถ: น้อยไปมาก</option>
              <option value="defects_desc">ข้อที่ตก: มากสุด</option>
            </select>
          </div>

          {/* Reset button */}
          {isFiltered && (
            <button
              onClick={onReset}
              className="text-xs py-2 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Count Status Bar */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          แสดงผล <strong className="text-slate-800 font-semibold">{totalFiltered}</strong> จากทั้งหมด {totalAll} คัน
        </span>
        {isFiltered && (
          <span className="text-sky-600 font-medium">กำลังใช้ตัวกรองข้อมูล</span>
        )}
      </div>
    </div>
  );
}
