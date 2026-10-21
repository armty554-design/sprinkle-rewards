import React from 'react';
import { 
  Truck, 
  RotateCw, 
  Plus, 
  BarChart2, 
  LayoutGrid, 
  Table as TableIcon,
  Calendar,
  Layers,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ 
  meta, 
  allMonths, 
  selectedMonthKey, 
  onSelectMonth, 
  viewMode, 
  setViewMode, 
  activeTab, 
  setActiveTab, 
  onRefreshFromSheet, 
  isRefreshing, 
  onOpenUploadNewMonth,
  currentUser,
  onOpenApprovalModal,
  pendingUsersCount = 0
}) {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-base tracking-tight">Sprinkle</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                  รางวัลมาตรฐาน
                </span>
              </div>
              <p className="text-[11px] text-slate-400">สาขา {meta.branch}</p>
            </div>
          </div>

          {/* Month Selector Pill */}
          <div className="flex items-center space-x-2">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={selectedMonthKey}
                onChange={(e) => onSelectMonth(e.target.value)}
                className="pl-8 pr-8 py-1.5 text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200/80 transition-colors cursor-pointer appearance-none focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
              >
                {allMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} {m.key === '2569-09' ? '(ล่าสุด)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Upload New Month Button (เฉพาะรหัสออฟฟิศ / แอดมิน / หัวหน้างาน) */}
            {(currentUser?.role === 'office' || currentUser?.role === 'admin' || currentUser?.role === 'supervisor') && (
              <button
                onClick={onOpenUploadNewMonth}
                title="นำเข้าไฟล์เดือนใหม่ (เฉพาะรหัสออฟฟิศ/แอดมิน)"
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เพิ่มเดือนใหม่</span>
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2">
            <div className="bg-slate-100/80 p-1 rounded-xl flex items-center text-xs font-medium">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'single'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-sky-500" />
                <span>ตรวจรายคัน</span>
              </button>

              <button
                onClick={() => setActiveTab('vehicles')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'vehicles'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span className="hidden md:inline">ภาพรวมทุกคัน</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'analytics'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">สถิติ</span>
              </button>
            </div>

            {/* Sync button */}
              <button
                onClick={onRefreshFromSheet}
                disabled={isRefreshing}
                title="ซิงค์ข้อมูลชีต"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
              </button>

              {/* User Approval Button for Admin / Supervisor / Office */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'supervisor' || currentUser?.role === 'office') && (
                <button
                  onClick={onOpenApprovalModal}
                  title="จัดการและอนุมัติพนักงาน"
                  className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1.5 transition-all border border-sky-200/80 shadow-2xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden sm:inline">อนุมัติพนักงาน</span>
                  {pendingUsersCount > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                      {pendingUsersCount}
                    </span>
                  )}
                </button>
              )}
            </div>

        </div>
      </div>
    </header>
  );
}
