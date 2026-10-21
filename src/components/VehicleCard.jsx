import React from 'react';
import { 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Coins, 
  ChevronRight, 
  User, 
  MapPin, 
  Package, 
  Printer, 
  Clock,
  ShieldAlert
} from 'lucide-react';

export default function VehicleCard({ vehicle, onSelect, onPrint }) {
  const { general, totals, defects } = vehicle;
  const hasReward = totals.totalReward > 0;
  const hasDefects = defects.length > 0;
  const hasPending = totals.pendingDeduction > 0;

  // Grade color
  const getGradeBadge = (level) => {
    if (level === '95% ขึ้นไป') {
      return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full">ดีเยี่ยม (≥95%)</span>;
    }
    if (level === '90 - 94.99%') {
      return <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-2 py-0.5 rounded-full">ดี (90-94%)</span>;
    }
    if (level === '85 - 89.99%') {
      return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">มาตรฐาน (85-89%)</span>;
    }
    return <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2 py-0.5 rounded-full">ตกเกณฑ์ (&lt;85%)</span>;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Header: Car Code, Type, Zone */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
                {general.carCode}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors">
                    {general.fullName}
                  </h3>
                  {!general.qualified && (
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      ยอดส่งต่ำกว่าเกณฑ์
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5 flex-wrap gap-y-1">
                  {general.branch && (
                    <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200/60 px-1.5 py-0.2 rounded text-[10px]">
                      สาขา {general.branch}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    รหัส {general.empId}
                  </span>
                  <span>•</span>
                  <span>{general.carType}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 font-medium text-slate-700">
                    <MapPin className="w-3 h-3 text-sky-500" />
                    {general.zone}
                  </span>
                  {general.groupNumber && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        กลุ่ม {general.groupNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Grade */}
            <div>
              {getGradeBadge(totals.overallLevel)}
            </div>
          </div>
        </div>

        {/* Reward & Score Highlight */}
        <div className="p-4 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">เงินรางวัลสุทธิ</span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-2xl font-black tracking-tight ${
                totals.totalReward < 0 ? 'text-rose-600' : totals.totalReward > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {totals.totalReward < 0 ? `-฿${Math.abs(totals.totalReward).toLocaleString()}` : `฿${totals.totalReward.toLocaleString()}`}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block mb-0.5">คะแนนรวม ({totals.totalPercent}%)</span>
            <div className={`font-black text-base ${totals.totalPercent >= 85 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {totals.totalScore} <span className="text-xs font-normal text-slate-500">คะแนน</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 py-2.5 px-3 text-center text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">ยอดส่งจริง</span>
            <strong className="text-slate-700 font-semibold">{general.totalDelivered.toLocaleString()} ถัง</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">สมาชิก</span>
            <strong className="text-slate-700 font-semibold">{general.totalMembers.toLocaleString()} ราย</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">ระยะทาง</span>
            <strong className="text-slate-700 font-semibold">{general.distance.toLocaleString()} กม.</strong>
          </div>
        </div>

        {/* Pending Deduction Warning */}
        {hasPending && (
          <div className="bg-rose-50 px-4 py-2 border-b border-rose-100 flex items-center justify-between text-xs text-rose-700 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              มียอดค้างรอหักเดือนถัดไป
            </span>
            <span className="font-bold">฿{totals.pendingDeduction.toLocaleString()}</span>
          </div>
        )}

        {/* Defects / Failed items section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              {hasDefects ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>ตกหัวข้อ / โดนหัก ({defects.length} รายการ)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-700">ผ่านเกณฑ์มาตรฐานครบถ้วน</span>
                </>
              )}
            </span>
          </div>

          {hasDefects ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {defects.slice(0, 3).map((d, idx) => (
                <div 
                  key={idx} 
                  className={`text-xs p-2 rounded-lg border flex items-start justify-between gap-2 ${
                    d.severity === 'danger' 
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] px-1.5 py-0.2 rounded bg-white/80 border border-current">
                        {d.code}
                      </span>
                      <span className="font-medium truncate">{d.title}</span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-0.5 line-clamp-1">{d.detail}</p>
                  </div>
                  {d.impact && d.impact !== '-' && (
                    <span className="text-[11px] font-bold shrink-0 self-center">
                      {d.impact}
                    </span>
                  )}
                </div>
              ))}
              {defects.length > 3 && (
                <p className="text-[11px] text-center text-slate-500 pt-1">
                  และอีก {defects.length - 3} หัวข้อ...
                </p>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ทำผลงานได้ยอดเยี่ยม ไม่มีหัวข้อถูกหักหรือตกเกณฑ์</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => onPrint(vehicle)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors text-xs font-medium flex items-center gap-1"
          title="พิมพ์ใบสรุปผลงาน"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">พิมพ์สลิป</span>
        </button>

        <button
          onClick={() => onSelect(vehicle)}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium flex items-center gap-1 transition-all shadow-2xs"
        >
          <span>ดูรายละเอียดเต็ม</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
