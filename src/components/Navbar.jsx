import React from 'react';
import { 
  Truck, 
  RotateCw, 
  Plus, 
  BarChart2, 
  Calendar,
  Layers, 
  ChevronDown, 
  ShieldCheck, 
  Database, 
  TrendingUp, 
  ClipboardCheck,
  Trophy,
  BarChart3,
  Sparkles
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
  pendingUsersCount = 0, 
  onOpenDataManager, 
  selectedBranch = 'all', 
  branches = [] 
}) {
  // Format branch label compactly so 18 branches don't stretch the header
  const branchDisplayLabel = selectedBranch !== 'all'
    ? `สาขา ${selectedBranch}`
    : (branches.length > 3 
        ? `ครบทั้ง ${branches.length} สาขาปฏิบัติการ` 
        : (branches.length > 0 ? `สาขา ${branches.join(', ')}` : `สาขา ${meta?.branch || 'รามอินทรา'}`));

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print shadow-xs">
      
      {/* TIER 1: BRAND, COMPACT BRANCH & MONTH PICKER */}
      <div className="border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 gap-3">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Sprinkle</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[11px] sm:text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                    รางวัลมาตรฐาน
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  {branchDisplayLabel}
                </p>
              </div>
            </div>

            {/* Middle & Right: Month Selector + Add Month + Sync */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Month Selector Pill */}
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={selectedMonthKey}
                  onChange={(e) => onSelectMonth(e.target.value)}
                  className="pl-8 pr-7 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 transition-colors cursor-pointer appearance-none focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                >
                  {allMonths.map((m, idx) => (
                    <option key={m.key} value={m.key}>
                      {m.label} {idx === 0 ? '(ล่าสุด)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
              </div>

              {/* Upload New Month Button */}
              {(currentUser?.role === 'office' || currentUser?.role === 'admin' || currentUser?.role === 'supervisor') && (
                <button
                  onClick={onOpenUploadNewMonth}
                  title="นำเข้าไฟล์เดือนใหม่ (เฉพาะรหัสออฟฟิศ/แอดมิน)"
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มเดือน</span>
                </button>
              )}

              {/* Sync button */}
              <button
                onClick={onRefreshFromSheet}
                disabled={isRefreshing}
                title="ซิงค์ข้อมูลชีต"
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* TIER 2: STREAMLINED NAVIGATION TABS (7 TABS - FIT ALL SCREENS) */}
      <div className="bg-slate-50/90 border-b border-slate-200/80 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar text-xs font-medium">
            
            {/* GROUP 1: OPERATIONAL TABS */}
            {/* Tab 1: ตรวจรายคัน */}
            <button
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200 ring-1 ring-sky-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'single' ? 'text-sky-500' : 'text-slate-400'}`} />
              <span>ตรวจรายคัน</span>
            </button>

            {/* Tab 2: ภาพรวมทุกคัน */}
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'vehicles'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200 ring-1 ring-sky-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Truck className={`w-3.5 h-3.5 ${activeTab === 'vehicles' ? 'text-sky-500' : 'text-slate-400'}`} />
              <span>ภาพรวม<span className="hidden sm:inline">ทุกคัน</span></span>
            </button>

            {/* Tab 3: สถิติสาขา */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200 ring-1 ring-sky-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart2 className={`w-3.5 h-3.5 ${activeTab === 'analytics' ? 'text-sky-500' : 'text-slate-400'}`} />
              <span>สถิติ<span className="hidden sm:inline">สาขา</span></span>
            </button>

            {/* Divider */}
            <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />

            {/* GROUP 2: EXECUTIVE & REPORTS TABS */}
            {/* Tab 4: เปรียบเทียบผู้บริหาร */}
            <button
              onClick={() => setActiveTab('executive')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="เปรียบเทียบผู้บริหาร (ข้ามสาขา / ข้ามเดือน)"
            >
              <TrendingUp className={`w-3.5 h-3.5 ${activeTab === 'executive' ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>เปรียบเทียบ<span className="hidden md:inline">ผู้บริหาร</span></span>
            </button>

            {/* Tab 5: ตรวจสอบบันทึกข้อมูล */}
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="ตรวจสอบการบันทึกข้อมูลของทุกสาขา"
            >
              <ClipboardCheck className={`w-3.5 h-3.5 ${activeTab === 'audit' ? 'text-white' : 'text-slate-400'}`} />
              <span>ตรวจบันทึก<span className="hidden md:inline">ข้อมูล</span></span>
            </button>

            {/* Divider */}
            <div className="h-4 w-px bg-slate-300 mx-1 shrink-0" />

            {/* Tab 6: เปอร์เซ็นต์ M7-9 */}
            <button
              onClick={() => setActiveTab('percent_m79')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'percent_m79'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-indigo-800 hover:text-indigo-950 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/60'
              }`}
              title="ผลการประเมินแยก 5 กลุ่มงานไตรมาส Q3 (M7 - M9)"
            >
              <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'percent_m79' ? 'text-white' : 'text-indigo-600'}`} />
              <span>เปอร์เซ็นต์ M7-9</span>
            </button>

            {/* Tab 7: รวมมาตรฐานยอดเยี่ยม 2569 */}
            <button
              onClick={() => setActiveTab('excellence_annual')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'excellence_annual'
                  ? 'bg-amber-500 text-amber-950 font-black shadow-xs ring-1 ring-amber-400'
                  : 'text-amber-900 hover:text-amber-950 bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 font-bold'
              }`}
              title="สรุปผลคะแนนและเงินรางวัลมาตรฐานทั้งปี 2569 รายคัน"
            >
              <Trophy className={`w-3.5 h-3.5 ${activeTab === 'excellence_annual' ? 'text-amber-950' : 'text-amber-600'}`} />
              <span>มาตรฐานยอดเยี่ยม <span className="hidden sm:inline">2569</span></span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </button>

            {/* Tab 8: คะแนนแยกกลุ่มงาน (Looker Data) */}
            <button
              onClick={() => setActiveTab('looker_scores')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'looker_scores'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs ring-1 ring-emerald-400'
                  : 'text-emerald-900 hover:text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 font-semibold'
              }`}
              title="ผลคะแนนแยก 4 กลุ่มงานตลอดทั้ง 9 เดือน ครบทั้ง 18 สาขา (Looker Data)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'looker_scores' ? 'text-white' : 'text-emerald-600'}`} />
              <span>คะแนนกลุ่มงาน 69</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-200/60 text-emerald-800 font-bold hidden sm:inline">Looker</span>
            </button>

          </nav>
        </div>
      </div>

    </header>
  );
}
