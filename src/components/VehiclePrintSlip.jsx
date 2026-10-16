import React from 'react';
import { Printer, X, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function VehiclePrintSlip({ vehicle, onClose }) {
  if (!vehicle) return null;

  const { general, totals, groups, defects } = vehicle;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden border border-slate-200">
        
        {/* Floating Top Bar (Hidden on print) */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between no-print">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-400" />
            <span>ใบสรุปผลคะแนนและเงินรางวัลมาตรฐาน (ตัวอย่างก่อนพิมพ์)</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ / บันทึก PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white" id="printable-slip">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                ใบแจ้งผลคะแนนและเงินรางวัลมาตรฐานจัดส่ง
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                SPRINKLE DELIVERY PERFORMANCE &amp; REWARDS STATEMENT
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900 px-3 py-1 bg-slate-100 rounded-lg border border-slate-300">
                {general.carCode}
              </span>
              <p className="text-xs text-slate-500 mt-1">ประจำเดือน {general.month}</p>
            </div>
          </div>

          {/* Driver & Logistics Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <div>
              <p className="mb-1"><span className="text-slate-500">ชื่อ-นามสกุล:</span> <strong className="text-slate-900 text-sm">{general.fullName}</strong></p>
              <p className="mb-1"><span className="text-slate-500">รหัสพนักงาน:</span> <strong className="text-slate-900">{general.empId}</strong></p>
              <p className="mb-1"><span className="text-slate-500">ตำแหน่ง / ประเภท:</span> <strong className="text-slate-900">{general.position} ({general.carType})</strong></p>
            </div>
            <div>
              <p className="mb-1"><span className="text-slate-500">สาขา:</span> <strong className="text-slate-900">{general.branch} ({general.zone})</strong></p>
              <p className="mb-1"><span className="text-slate-500">ยอดส่งน้ำจริง:</span> <strong className="text-slate-900">{general.totalDelivered.toLocaleString()} ถัง</strong></p>
              <p className="mb-1"><span className="text-slate-500">หัวหน้าโลจิสติกส์:</span> <strong className="text-slate-900">{general.supervisorLogisticsName || '-'}</strong></p>
            </div>
          </div>

          {/* Big Reward Box */}
          <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-500 flex justify-between items-center mb-6">
            <div>
              <span className="text-xs text-emerald-800 font-semibold uppercase">รวมเงินรางวัลสุทธิที่ได้รับ</span>
              <div className="text-3xl font-black text-emerald-700 tracking-tight mt-0.5">
                ฿{totals.totalReward.toLocaleString()} บาท
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-600 block">คะแนนรวมทั้งหมด</span>
              <span className="text-xl font-bold text-slate-900">{totals.totalScore} คะแนน ({totals.totalPercent}%)</span>
              <div className="text-xs text-slate-600 mt-0.5">ระดับประเมิน: {totals.overallLevel}</div>
            </div>
          </div>

          {/* Defects & Deductions Warning Box */}
          {defects.length > 0 && (
            <div className="mb-6 border border-amber-300 bg-amber-50 rounded-xl p-4">
              <h3 className="font-bold text-amber-900 text-xs mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>รายการหัวข้อที่ตกเกณฑ์ / ถูกหักเงิน / เสียคะแนน</span>
              </h3>
              <div className="space-y-1.5 text-xs">
                {defects.map((d, i) => (
                  <div key={i} className="flex justify-between items-start border-b border-amber-200/60 pb-1 last:border-0 last:pb-0">
                    <div>
                      <strong className="text-amber-950 font-semibold">[{d.code}] {d.title}:</strong>
                      <span className="text-slate-700 ml-1.5">{d.detail}</span>
                    </div>
                    {d.impact && d.impact !== '-' && (
                      <span className="font-bold text-rose-700 shrink-0 ml-2">{d.impact}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group Scores Breakdown Table */}
          <div className="mb-6">
            <h3 className="font-bold text-xs uppercase text-slate-700 mb-2">สรุปคะแนนและเงินรางวัลรายกลุ่มงาน</h3>
            <table className="w-full text-xs text-left border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold">
                <tr>
                  <th className="p-2 border-r border-slate-300">กลุ่มงาน</th>
                  <th className="p-2 text-right border-r border-slate-300">คะแนนที่ได้</th>
                  <th className="p-2 text-right border-r border-slate-300">เปอร์เซ็นต์</th>
                  <th className="p-2 text-center border-r border-slate-300">ระดับ</th>
                  <th className="p-2 text-right">เงินรางวัล (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2 border-r border-slate-200 font-medium">1. กลุ่มงานจัดส่ง</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group1.score}</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group1.percent}%</td>
                  <td className="p-2 text-center border-r border-slate-200">{groups.group1.level}</td>
                  <td className="p-2 text-right font-bold text-emerald-700">฿{groups.group1.reward.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-200 font-medium">2. กลุ่มงานบริการ</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group2.score}</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group2.percent}%</td>
                  <td className="p-2 text-center border-r border-slate-200">{groups.group2.level}</td>
                  <td className="p-2 text-right font-bold text-emerald-700">฿{groups.group2.reward.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-200 font-medium">3. กลุ่มงานเอกสารและผลิตภัณฑ์</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group3.score}</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group3.percent}%</td>
                  <td className="p-2 text-center border-r border-slate-200">{groups.group3.level}</td>
                  <td className="p-2 text-right font-bold text-emerald-700">฿{groups.group3.reward.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-200 font-medium">4. กลุ่มงานภาพลักษณ์แบรนด์</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group4.score}</td>
                  <td className="p-2 text-right border-r border-slate-200">{groups.group4.percent}%</td>
                  <td className="p-2 text-center border-r border-slate-200">{groups.group4.level}</td>
                  <td className="p-2 text-right font-bold text-emerald-700">฿{groups.group4.reward.toLocaleString()}</td>
                </tr>
                {totals.specialBonus > 0 && (
                  <tr>
                    <td className="p-2 border-r border-slate-200 font-medium">5. เงินพิเศษ / อื่นๆ</td>
                    <td className="p-2 text-right border-r border-slate-200">-</td>
                    <td className="p-2 text-right border-r border-slate-200">-</td>
                    <td className="p-2 text-center border-r border-slate-200">-</td>
                    <td className="p-2 text-right font-bold text-emerald-700">฿{totals.specialBonus.toLocaleString()}</td>
                  </tr>
                )}
                {totals.pendingDeduction > 0 && (
                  <tr className="bg-rose-50 text-rose-800">
                    <td className="p-2 border-r border-slate-200 font-bold" colSpan={4}>ยอดคงค้างรอหักเดือนถัดไป (เนื่องจากรางวัลติดลบ)</td>
                    <td className="p-2 text-right font-black text-rose-700">฿{totals.pendingDeduction.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <p className="font-semibold text-slate-800">({general.fullName})</p>
              <p className="text-slate-500">พนักงานขับรถ / ผู้ประกอบการ</p>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <p className="font-semibold text-slate-800">({general.supervisorLogisticsName || 'หัวหน้าโลจิสติกส์'})</p>
              <p className="text-slate-500">หัวหน้าโลจิสติกส์</p>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <p className="font-semibold text-slate-800">({general.supervisorAdminName || 'หัวหน้าธุรการ'})</p>
              <p className="text-slate-500">หัวหน้าธุรการ</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติ • พิมพ์เมื่อ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

      </div>
    </div>
  );
}
