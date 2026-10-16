import React from 'react';
import { Coins, Truck, TrendingUp, AlertCircle, Clock } from 'lucide-react';

export default function DashboardStats({ summary, onFilterChange, currentStatusFilter }) {
  const {
    totalVehicles,
    totalRewards,
    avgReward,
    qualifiedCount,
    withRewardCount,
    vehiclesWithDefects,
    totalPendingDeductions
  } = summary;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      
      {/* 1. Total Rewards */}
      <div 
        onClick={() => onFilterChange('status', currentStatusFilter === 'has_reward' ? 'all' : 'has_reward')}
        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs hover:border-slate-300 ${
          currentStatusFilter === 'has_reward' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/70'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">ยอดเงินรางวัลรวม</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Coins className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ฿{totalRewards.toLocaleString()}
        </div>
        <p className="text-[11px] text-emerald-600 font-medium mt-1">
          จ่ายรางวัล {withRewardCount} จาก {totalVehicles} คัน
        </p>
      </div>

      {/* 2. Total Vehicles */}
      <div 
        onClick={() => onFilterChange('status', 'all')}
        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs hover:border-slate-300 ${
          currentStatusFilter === 'all' ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200/70'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">จำนวนรถทั้งหมด</span>
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <Truck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {totalVehicles} <span className="text-sm font-normal text-slate-400">คัน</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          ผ่านเกณฑ์ส่ง {qualifiedCount} คัน
        </p>
      </div>

      {/* 3. Average Reward */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">เฉลี่ยต่อคัน</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ฿{avgReward.toLocaleString()}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          เฉลี่ยคันที่ได้ ฿{withRewardCount > 0 ? Math.round(totalRewards / withRewardCount).toLocaleString() : 0}
        </p>
      </div>

      {/* 4. Vehicles with Issues */}
      <div 
        onClick={() => onFilterChange('status', currentStatusFilter === 'with_defects' ? 'all' : 'with_defects')}
        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs hover:border-slate-300 ${
          currentStatusFilter === 'with_defects' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/70'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">มีหัวข้อตกเกณฑ์/ถูกหัก</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
          {vehiclesWithDefects} <span className="text-sm font-normal text-slate-400">คัน</span>
        </div>
        <p className="text-[11px] text-amber-600 font-medium mt-1">
          {totalPendingDeductions > 0 ? `มียอดรอหักเดือนถัดไป ฿${totalPendingDeductions.toLocaleString()}` : 'ไม่มีค้างรอหัก'}
        </p>
      </div>

    </div>
  );
}
