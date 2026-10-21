import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Coins, 
  User, 
  MapPin, 
  Truck, 
  Clock, 
  Package, 
  Award, 
  XCircle, 
  HelpCircle,
  FileText
} from 'lucide-react';

export default function VehicleDetailModal({ vehicle, onClose, onPrint }) {
  if (!vehicle) return null;

  const { general, totals, groups, defects } = vehicle;
  const [activeGroupTab, setActiveGroupTab] = useState('defects'); // 'defects', 'g1', 'g2', 'g3', 'g4', 'g5'

  const hasReward = totals.totalReward > 0;
  const hasDefects = defects.length > 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-xs font-medium border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ผ่านเกณฑ์
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs font-medium border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            เตือน/หลุดเป้า
          </span>
        );
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md text-xs font-medium border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            ตกเกณฑ์/ถูกหัก
          </span>
        );
      default:
        return (
          <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md text-xs font-medium border border-slate-200">
            -
          </span>
        );
    }
  };

  const getGroupLevelBadge = (level) => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
              {general.carCode}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {general.fullName}
                </h2>
                <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full">
                  {general.position}
                </span>
                {general.groupNumber && (
                  <span className="bg-amber-400/20 text-amber-200 border border-amber-400/40 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    กลุ่ม {general.groupNumber}
                  </span>
                )}
                {!general.qualified && (
                  <span className="bg-rose-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    ไม่ผ่านเกณฑ์ส่งขั้นต่ำ
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1">
                <span>รหัสพนักงาน: <strong>{general.empId}</strong></span>
                <span>•</span>
                <span>ประเภท: <strong>{general.carType}</strong></span>
                <span>•</span>
                <span>สาขา: <strong>{general.branch}</strong> ({general.zone}{general.groupNumber ? ` • กลุ่ม ${general.groupNumber}` : ''})</span>
                <span>•</span>
                <span>หัวหน้าโลจิสติกส์: <strong>{general.supervisorLogisticsName || '-'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPrint(vehicle)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="พิมพ์ใบสรุปผลงาน"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Financial Summary Banner */}
        <div className="bg-gradient-to-r from-sky-50 via-slate-50 to-indigo-50 border-b border-slate-200 p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Reward */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">เงินรางวัลรวมสุทธิ</span>
              <div className={`text-2xl sm:text-3xl font-black mt-0.5 ${
                totals.totalReward < 0 ? 'text-rose-600' : totals.totalReward > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {totals.totalReward < 0 ? `-฿${Math.abs(totals.totalReward).toLocaleString()}` : `฿${totals.totalReward.toLocaleString()}`}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">ประจำเดือน {general.month}</span>
            </div>

            {/* Total Score */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">คะแนนรวมทั้งหมด</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-0.5">
                {totals.totalScore}
              </div>
              <div className="flex items-center justify-between text-xs mt-0.5">
                <span className="text-slate-500 font-medium">{totals.totalPercent}%</span>
                {getGroupLevelBadge(totals.overallLevel)}
              </div>
            </div>

            {/* Volume delivered */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">ยอดส่งน้ำจริง</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">
                {general.totalDelivered.toLocaleString()} <span className="text-xs font-normal text-slate-500">ถัง</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                สมาชิก {general.totalMembers.toLocaleString()} ราย ({general.bottlesPerMember} ถัง/ราย)
              </span>
            </div>

            {/* Distance & Meters/Bottle */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">ระยะทาง &amp; เมตร/ถัง</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5">
                {general.distance.toLocaleString()} <span className="text-xs font-normal text-slate-500">กม.</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                เฉลี่ย {general.metersPerBottle} เมตร/ถัง
              </span>
            </div>
          </div>

          {/* Pending Deduction alert */}
          {totals.pendingDeduction > 0 && (
            <div className="mt-3 bg-rose-100 border border-rose-300 rounded-xl p-3 flex items-center justify-between text-rose-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-rose-600" />
                <span className="text-xs sm:text-sm font-semibold">
                  มีจำนวนเงินรอหักเดือนถัดไปเนื่องจากเงินรางวัลเดือนนี้ติดลบไม่พอหัก
                </span>
              </div>
              <span className="text-base font-bold">
                ฿{totals.pendingDeduction.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="bg-white px-4 border-b border-slate-200 flex space-x-1 sm:space-x-2 overflow-x-auto text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveGroupTab('defects')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeGroupTab === 'defects'
                ? 'border-rose-600 text-rose-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${hasDefects ? 'text-amber-500' : 'text-slate-400'}`} />
            <span>หัวข้อที่ตก/ถูกหัก</span>
            <span className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
              hasDefects ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {defects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveGroupTab('g1')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeGroupTab === 'g1'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>กลุ่ม 1 จัดส่ง</span>
            <span className="text-xs opacity-70">({groups.group1.score} คะแนน)</span>
          </button>

          <button
            onClick={() => setActiveGroupTab('g2')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeGroupTab === 'g2'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>กลุ่ม 2 บริการ</span>
            <span className="text-xs opacity-70">({groups.group2.score} คะแนน)</span>
          </button>

          <button
            onClick={() => setActiveGroupTab('g3')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeGroupTab === 'g3'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>กลุ่ม 3 เอกสาร</span>
            <span className="text-xs opacity-70">({groups.group3.score} คะแนน)</span>
          </button>

          <button
            onClick={() => setActiveGroupTab('g4')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeGroupTab === 'g4'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{groups.group4?.name ? groups.group4.name.replace('กลุ่มงาน', 'กลุ่ม 4 ') : 'กลุ่ม 4 ภาพลักษณ์'}</span>
            <span className="text-xs opacity-70">({groups.group4.score} คะแนน)</span>
          </button>

          <button
            onClick={() => setActiveGroupTab('g5')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeGroupTab === 'g5'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>พิเศษ &amp; สรุป</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* TAB 0: DEFECTS / FAILED ITEMS SUMMARY */}
          {activeGroupTab === 'defects' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span>รายการหัวข้อที่ตกเกณฑ์ / ถูกหักคะแนน / หลุดเป้าหมาย</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    สรุปสาเหตุและรายการที่ส่งผลกระทบต่อเงินรางวัลของเบอร์รถ {general.carCode} ในเดือนนี้
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                  พบทั้งหมด {defects.length} รายการ
                </span>
              </div>

              {hasDefects ? (
                <div className="space-y-3">
                  {defects.map((d, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                        d.severity === 'danger'
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg font-bold text-xs shrink-0 ${
                          d.severity === 'danger' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {d.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/80 border border-current">
                              {d.category}
                            </span>
                            <h5 className="font-bold text-sm">{d.title}</h5>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {d.detail}
                          </p>
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/50">
                        <span className="text-[11px] text-slate-500 block">ผลกระทบ</span>
                        <span className={`text-sm font-bold ${
                          d.severity === 'danger' ? 'text-rose-700' : 'text-amber-800'
                        }`}>
                          {d.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg">ยอดเยี่ยม! ผ่านเกณฑ์ครบทุกหัวข้อ</h4>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    เบอร์รถนี้ไม่มีรายการตกเกณฑ์หรือโดนหักคะแนน ทำผลงานได้ตามมาตรฐานครบถ้วน
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: GROUP 1 (DELIVERY) */}
          {activeGroupTab === 'g1' && (
            <GroupTable 
              group={groups.group1} 
              getStatusBadge={getStatusBadge} 
              getLevelBadge={getGroupLevelBadge}
            />
          )}

          {/* TAB 2: GROUP 2 (SERVICE) */}
          {activeGroupTab === 'g2' && (
            <GroupTable 
              group={groups.group2} 
              getStatusBadge={getStatusBadge} 
              getLevelBadge={getGroupLevelBadge}
            />
          )}

          {/* TAB 3: GROUP 3 (DOCUMENTS) */}
          {activeGroupTab === 'g3' && (
            <GroupTable 
              group={groups.group3} 
              getStatusBadge={getStatusBadge} 
              getLevelBadge={getGroupLevelBadge}
            />
          )}

          {/* TAB 4: GROUP 4 (BRAND IMAGE) */}
          {activeGroupTab === 'g4' && (
            <GroupTable 
              group={groups.group4} 
              getStatusBadge={getStatusBadge} 
              getLevelBadge={getGroupLevelBadge}
            />
          )}

          {/* TAB 5: GROUP 5 & SUMMARY */}
          {activeGroupTab === 'g5' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h4 className="font-bold text-slate-900 text-sm mb-3">กลุ่ม 5: พิเศษ / หนังสือเตือน / อื่นๆ</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">5.1 หาสมาชิกใหม่</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {groups.group5.items[0].result} (คะแนน: {groups.group5.items[0].score})
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">5.2 หนังสือเตือน</span>
                    <div className="text-base font-bold text-slate-800 mt-0.5">
                      {groups.group5.items[1].result} (หักคะแนน: {groups.group5.items[1].score})
                    </div>
                  </div>
                </div>
              </div>

              {/* Final calculation review */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <h4 className="font-bold text-slate-900 text-sm mb-3">สรุปผลการคำนวณเงินรางวัล</h4>
                <div className="space-y-2 text-sm divide-y divide-slate-100">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600">รางวัลกลุ่ม 1 (จัดส่ง):</span>
                    <strong className="text-slate-800">฿{groups.group1.reward.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600">รางวัลกลุ่ม 2 (บริการ):</span>
                    <strong className="text-slate-800">฿{groups.group2.reward.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600">รางวัลกลุ่ม 3 (เอกสารและผลิตภัณฑ์):</span>
                    <strong className="text-slate-800">฿{groups.group3.reward.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600">รางวัลกลุ่ม 4 (ภาพลักษณ์แบรนด์):</span>
                    <strong className="text-slate-800">฿{groups.group4.reward.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-600">รางวัลพิเศษ / อื่นๆ:</span>
                    <strong className="text-slate-800">฿{totals.specialBonus.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between py-2 text-base font-bold bg-slate-50 px-3 rounded-lg border border-slate-200">
                    <span className="text-slate-900">รวมเงินรางวัลสุทธิ:</span>
                    <span className="text-emerald-600">฿{totals.totalReward.toLocaleString()}</span>
                  </div>
                  {totals.pendingDeduction > 0 && (
                    <div className="flex justify-between py-2 text-sm font-bold bg-rose-50 px-3 rounded-lg border border-rose-200 text-rose-700">
                      <span>ยอดรอหักเดือนถัดไป:</span>
                      <span>฿{totals.pendingDeduction.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => onPrint(vehicle)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>พิมพ์ใบสรุปผลงาน (Slip)</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}

function GroupTable({ group, getStatusBadge, getLevelBadge }) {
  return (
    <div className="space-y-4">
      {/* Group header card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h4 className="font-bold text-slate-900 text-base">{group.name}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            คะแนนรวมกลุ่ม: <strong className="text-slate-800">{group.score} คะแนน</strong> ({group.percent}%)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div>
            <span className="text-xs text-slate-500 block text-right">ผลประเมินกลุ่ม</span>
            {getLevelBadge(group.level)}
          </div>
          <div className="border-l border-slate-200 pl-3">
            <span className="text-xs text-slate-500 block text-right">เงินรางวัลกลุ่ม</span>
            <span className="text-base font-bold text-emerald-600">฿{group.reward.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-2.5 px-3">รหัส</th>
                <th className="py-2.5 px-3">หัวข้อการประเมิน</th>
                <th className="py-2.5 px-3">เกณฑ์/เป้าหมาย</th>
                <th className="py-2.5 px-3 text-right">ผลงานที่ทำได้</th>
                <th className="py-2.5 px-3 text-right">คะแนน</th>
                <th className="py-2.5 px-3 text-right">เปอร์เซ็นต์</th>
                <th className="py-2.5 px-3 text-right">รางวัล/ยอดหัก</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {group.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-800">{item.code}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{item.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{item.target}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{item.result}</td>
                  <td className="py-2.5 px-3 text-right font-medium">
                    <span className={item.score < 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                      {item.score}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                    {item.percent !== null ? `${item.percent}%` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    {item.reward !== undefined ? (
                      <span className={item.reward < 0 ? 'text-rose-600' : item.reward > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                        {item.reward < 0 ? `-฿${Math.abs(item.reward)}` : `฿${item.reward.toLocaleString()}`}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
