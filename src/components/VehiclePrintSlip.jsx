import React, { useEffect } from 'react';
import { Printer, X, AlertTriangle } from 'lucide-react';

export default function VehiclePrintSlip({ vehicle, onClose }) {
  if (!vehicle) return null;

  const { general, totals, groups, defects } = vehicle;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const isNegativeTotal = totals.totalReward < 0;
  const isZeroTotal = totals.totalReward === 0;

  const renderRewardCell = (reward) => {
    if (reward < 0) {
      return <span className="font-bold text-rose-600">-฿{Math.abs(reward).toLocaleString()}</span>;
    }
    if (reward > 0) {
      return <span className="font-bold text-emerald-700">฿{reward.toLocaleString()}</span>;
    }
    return <span className="text-slate-400">฿0</span>;
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 p-3 sm:p-6 flex justify-center items-start min-h-screen"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container - items-start ensures top is never pushed off-screen */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-4 sm:my-8 overflow-hidden border border-slate-200 flex flex-col relative">
        
        {/* Sticky Top Bar (Pinned to top on scroll, hidden on print) */}
        <div className="sticky top-0 z-20 p-3 sm:p-4 bg-slate-900/95 backdrop-blur-md text-white flex items-center justify-between no-print shadow-md">
          <span className="text-xs sm:text-sm font-semibold flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-400" />
            <span>ใบสรุปผลคะแนนและเงินรางวัลมาตรฐาน (ตัวอย่างก่อนพิมพ์)</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>สั่งพิมพ์ / PDF</span>
            </button>
            <button
              onClick={onClose}
              aria-label="ปิดหน้านี้"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-6 sm:p-10 text-slate-900 bg-white" id="printable-slip">
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
              <p className="mb-1"><span className="text-slate-500">สาขา:</span> <strong className="text-slate-900">{general.branch} ({general.zone}) {general.groupNumber ? `• กลุ่ม ${general.groupNumber}` : ''}</strong></p>
              <p className="mb-1"><span className="text-slate-500">ยอดส่งน้ำจริง:</span> <strong className="text-slate-900">{general.totalDelivered.toLocaleString()} ถัง</strong></p>
              <p className="mb-1"><span className="text-slate-500">หัวหน้าโลจิสติกส์:</span> <strong className="text-slate-900">{general.supervisorLogisticsName || '-'}</strong></p>
            </div>
          </div>

          {/* Big Reward Box - with Red style for negative amounts */}
          <div className={`p-4 rounded-xl border-2 flex justify-between items-center mb-6 ${
            isNegativeTotal 
              ? 'bg-rose-50 border-rose-500' 
              : isZeroTotal 
                ? 'bg-slate-50 border-slate-300' 
                : 'bg-emerald-50 border-emerald-500'
          }`}>
            <div>
              <span className={`text-xs font-semibold uppercase ${
                isNegativeTotal ? 'text-rose-800' : isZeroTotal ? 'text-slate-600' : 'text-emerald-800'
              }`}>
                {isNegativeTotal ? 'รวมเงินรางวัลสุทธิที่ได้รับ (มียอดติดลบ)' : 'รวมเงินรางวัลสุทธิที่ได้รับ'}
              </span>
              <div className={`text-3xl font-black tracking-tight mt-0.5 ${
                isNegativeTotal ? 'text-rose-600' : isZeroTotal ? 'text-slate-600' : 'text-emerald-700'
              }`}>
                {isNegativeTotal 
                  ? `-฿${Math.abs(totals.totalReward).toLocaleString()} บาท` 
                  : `฿${totals.totalReward.toLocaleString()} บาท`
                }
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-600 block">คะแนนรวมทั้งหมด</span>
              <span className={`text-xl font-black block ${totals.totalPercent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {totals.totalScore} คะแนน ({totals.totalPercent}%)
              </span>
              <div className="text-xs text-slate-600 mt-0.5">
                ระดับประเมิน: <strong className={totals.overallLevel.includes('<') ? 'text-rose-600' : 'text-emerald-700'}>{totals.overallLevel}</strong>
              </div>
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
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group1.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group1.score}</td>
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group1.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group1.percent}%</td>
                  <td className={`p-2 text-center border-r border-slate-200 font-semibold ${groups.group1.level.includes('<') ? 'text-rose-700' : 'text-emerald-700'}`}>{groups.group1.level}</td>
                  <td className="p-2 text-right">{renderRewardCell(groups.group1.reward)}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-200 font-medium">2. กลุ่มงานบริการ</td>
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group2.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group2.score}</td>
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group2.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group2.percent}%</td>
                  <td className={`p-2 text-center border-r border-slate-200 font-semibold ${groups.group2.level.includes('<') ? 'text-rose-700' : 'text-emerald-700'}`}>{groups.group2.level}</td>
                  <td className="p-2 text-right">{renderRewardCell(groups.group2.reward)}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-200 font-medium">3. กลุ่มงานเอกสารและผลิตภัณฑ์</td>
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group3.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group3.score}</td>
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group3.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group3.percent}%</td>
                  <td className={`p-2 text-center border-r border-slate-200 font-semibold ${groups.group3.level.includes('<') ? 'text-rose-700' : 'text-emerald-700'}`}>{groups.group3.level}</td>
                  <td className="p-2 text-right">{renderRewardCell(groups.group3.reward)}</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-200 font-medium">4. กลุ่มงานภาพลักษณ์แบรนด์</td>
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group4.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group4.score}</td>
                  <td className={`p-2 text-right border-r border-slate-200 font-bold ${groups.group4.percent >= 85 ? 'text-emerald-700' : 'text-rose-700'}`}>{groups.group4.percent}%</td>
                  <td className={`p-2 text-center border-r border-slate-200 font-semibold ${groups.group4.level.includes('<') ? 'text-rose-700' : 'text-emerald-700'}`}>{groups.group4.level}</td>
                  <td className="p-2 text-right">{renderRewardCell(groups.group4.reward)}</td>
                </tr>
                {totals.specialBonus !== 0 && (
                  <tr>
                    <td className="p-2 border-r border-slate-200 font-medium">5. เงินพิเศษ / อื่นๆ</td>
                    <td className="p-2 text-right border-r border-slate-200">-</td>
                    <td className="p-2 text-right border-r border-slate-200">-</td>
                    <td className="p-2 text-center border-r border-slate-200">-</td>
                    <td className="p-2 text-right">{renderRewardCell(totals.specialBonus)}</td>
                  </tr>
                )}
                {totals.pendingDeduction > 0 && (
                  <tr className="bg-rose-50 text-rose-800">
                    <td className="p-2 border-r border-slate-200 font-bold" colSpan={4}>ยอดคงค้างรอหักเดือนถัดไป (เนื่องจากรางวัลติดลบ)</td>
                    <td className="p-2 text-right font-black text-rose-700">-฿{totals.pendingDeduction.toLocaleString()}</td>
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

        {/* Bottom Actions Bar (Convenient close & print buttons on mobile/long screens) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>ปิดหน้านี้ (ESC)</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์ / บันทึก PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
}
