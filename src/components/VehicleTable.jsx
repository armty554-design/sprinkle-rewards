import React from 'react';
import { ChevronRight, Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function VehicleTable({ vehicles, onSelect, onPrint }) {
  const getLevelBadge = (level) => {
    if (level === '95% ขึ้นไป') {
      return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">≥95%</span>;
    }
    if (level === '90 - 94.99%') {
      return <span className="bg-sky-100 text-sky-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">90-94%</span>;
    }
    if (level === '85 - 89.99%') {
      return <span className="bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">85-89%</span>;
    }
    return <span className="bg-rose-100 text-rose-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">&lt;85%</span>;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="py-3 px-4">เบอร์รถ</th>
              <th className="py-3 px-4">พนักงานขับรถ</th>
              <th className="py-3 px-3">เขต</th>
              <th className="py-3 px-3">ประเภท</th>
              <th className="py-3 px-3 text-right">ยอดส่ง (ถัง)</th>
              <th className="py-3 px-3 text-center">จัดส่ง</th>
              <th className="py-3 px-3 text-center">บริการ</th>
              <th className="py-3 px-3 text-center">เอกสาร</th>
              <th className="py-3 px-3 text-center">ภาพลักษณ์</th>
              <th className="py-3 px-3 text-center">คะแนนรวม</th>
              <th className="py-3 px-4 text-center">หัวข้อที่ตก</th>
              <th className="py-3 px-4 text-right">เงินรางวัลสุทธิ</th>
              <th className="py-3 px-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((v) => {
              const { general, totals, groups, defects } = v;
              const hasReward = totals.totalReward > 0;
              const hasDefects = defects.length > 0;

              return (
                <tr 
                  key={v.id} 
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => onSelect(v)}
                >
                  {/* Car Code */}
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {general.carCode}
                    </span>
                    {general.branch && (
                      <span className="block text-[10px] text-sky-700 font-semibold">
                        {general.branch}
                      </span>
                    )}
                  </td>

                  {/* Driver Name & ID */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{general.fullName}</div>
                    <div className="text-xs text-slate-400">รหัส {general.empId}</div>
                  </td>

                  {/* Zone & Group */}
                  <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                    <div>{general.zone}</div>
                    {general.groupNumber && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mt-0.5">
                        กลุ่ม {general.groupNumber}
                      </span>
                    )}
                  </td>

                  {/* Car Type */}
                  <td className="py-3 px-3 text-xs text-slate-500">
                    {general.carType}
                  </td>

                  {/* Delivered Bottles */}
                  <td className="py-3 px-3 text-right font-medium text-slate-800">
                    {general.totalDelivered.toLocaleString()}
                  </td>

                  {/* Group 1 level */}
                  <td className="py-3 px-3 text-center">
                    {getLevelBadge(groups.group1.level)}
                  </td>

                  {/* Group 2 level */}
                  <td className="py-3 px-3 text-center">
                    {getLevelBadge(groups.group2.level)}
                  </td>

                  {/* Group 3 level */}
                  <td className="py-3 px-3 text-center">
                    {getLevelBadge(groups.group3.level)}
                  </td>

                  {/* Group 4 level */}
                  <td className="py-3 px-3 text-center">
                    {getLevelBadge(groups.group4.level)}
                  </td>

                  {/* Total score & % */}
                  <td className="py-3 px-3 text-center">
                    <div className={`font-black text-sm ${totals.totalPercent >= 85 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {totals.totalScore}
                    </div>
                    <div className={`text-xs font-bold ${totals.totalPercent >= 85 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {totals.totalPercent}%
                    </div>
                  </td>

                  {/* Defects Count */}
                  <td className="py-3 px-4 text-center">
                    {hasDefects ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>ตก {defects.length} ข้อ</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>ครบ</span>
                      </span>
                    )}
                  </td>

                  {/* Net Reward */}
                  <td className="py-3 px-4 text-right">
                    <span className={`text-base font-bold ${
                      totals.totalReward < 0 ? 'text-rose-600' : totals.totalReward > 0 ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {totals.totalReward < 0 ? `-฿${Math.abs(totals.totalReward).toLocaleString()}` : `฿${totals.totalReward.toLocaleString()}`}
                    </span>
                    {totals.pendingDeduction > 0 && (
                      <div className="text-[11px] text-rose-500 font-medium">
                        รอหัก ฿{totals.pendingDeduction.toLocaleString()}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => onPrint(v)}
                        title="พิมพ์ใบสรุปผลงาน"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelect(v)}
                        title="ดูรายละเอียดเต็ม"
                        className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
