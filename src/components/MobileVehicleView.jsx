import React, { useState } from 'react';
import { 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  Printer, 
  Truck, 
  User, 
  Clock, 
  Layers, 
  ChevronRight,
  LogOut,
  Calendar
} from 'lucide-react';

export default function MobileVehicleView({ 
  vehicle, 
  allVehicles, 
  onSelectVehicle, 
  currentUser, 
  onLogout,
  currentMonthLabel,
  allMonths,
  selectedMonthKey,
  onSelectMonth,
  onPrint
}) {
  const [mobileTab, setMobileTab] = useState('summary'); // 'summary', 'defects', 'all_items'
  const [expandedGroup, setExpandedGroup] = useState('g1');

  if (!vehicle) return null;

  const { general, totals, groups, defects } = vehicle;
  const hasReward = totals.totalReward > 0;
  const hasDefects = defects.length > 0;
  const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'admin';

  const groupList = [
    { key: 'g1', group: groups.group1, title: '1. กลุ่มงานจัดส่ง', score: groups.group1.score },
    { key: 'g2', group: groups.group2, title: '2. กลุ่มงานบริการ', score: groups.group2.score },
    { key: 'g3', group: groups.group3, title: '3. กลุ่มงานเอกสาร & ผลิตภัณฑ์', score: groups.group3.score },
    { key: 'g4', group: groups.group4, title: '4. ภาพลักษณ์แบรนด์', score: groups.group4.score },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex flex-col">
      
      {/* Mobile Top App Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {general.carCode}
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 leading-tight">
              {general.fullName}
            </h2>
            <div className="text-[11px] text-slate-400">
              รหัส {general.empId} • {general.zone}
            </div>
          </div>
        </div>

        {/* Month Selector & Logout */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={selectedMonthKey}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="py-1 pl-2.5 pr-6 text-xs font-bold bg-slate-100 text-slate-800 rounded-lg border-0 appearance-none cursor-pointer"
            >
              {allMonths.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label.replace(' 2569', '')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={onLogout}
            title="ออกจากระบบ"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Supervisor Switcher if logged in as supervisor */}
      {isSupervisor && (
        <div className="bg-sky-50 px-4 py-2 border-b border-sky-100 flex items-center justify-between text-xs text-sky-900">
          <span className="font-medium">สลับดูเบอร์รถ:</span>
          <select
            value={vehicle.id}
            onChange={(e) => {
              const found = allVehicles.find(v => v.id === e.target.value);
              if (found) onSelectVehicle(found);
            }}
            className="py-1 px-2.5 rounded-lg bg-white border border-sky-200 text-slate-900 font-bold text-xs"
          >
            {allVehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.general.carCode} - {v.general.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Content Area */}
      <main className="p-4 space-y-4 flex-1">
        
        {/* TAB 1: SUMMARY / PAY STATEMENT */}
        {mobileTab === 'summary' && (
          <div className="space-y-4">
            
            {/* Big Net Reward Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                เงินรางวัลสุทธิประจำเดือน ({currentMonthLabel})
              </span>
              <div className={`text-4xl font-black mt-1 tracking-tight ${
                hasReward ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                ฿{totals.totalReward.toLocaleString()}
              </div>

              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs text-slate-500 font-medium">
                  คะแนนรวม: <strong className="text-slate-800">{totals.totalScore}</strong> ({totals.totalPercent}%)
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {totals.overallLevel}
                </span>
              </div>

              {!general.qualified && (
                <div className="mt-3 text-xs bg-rose-50 text-rose-700 font-medium py-1.5 px-3 rounded-xl border border-rose-200 inline-block">
                  ยอดส่งไม่ถึงเกณฑ์ 3,000 ถัง (ส่งได้ {general.totalDelivered.toLocaleString()} ถัง)
                </div>
              )}
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[11px]">ยอดส่งจริง</span>
                <strong className="text-slate-800 text-sm font-bold">{general.totalDelivered.toLocaleString()} ถัง</strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[11px]">สมาชิก</span>
                <strong className="text-slate-800 text-sm font-bold">{general.totalMembers.toLocaleString()} ราย</strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-slate-400 block text-[11px]">ระยะทาง</span>
                <strong className="text-slate-800 text-sm font-bold">{general.distance.toLocaleString()} กม.</strong>
              </div>
            </div>

            {/* Pending deduction alert */}
            {totals.pendingDeduction > 0 && (
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-xs text-rose-900 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span className="font-semibold">ยอดค้างรอหักเดือนถัดไป:</span>
                </div>
                <strong className="text-sm font-bold text-rose-700">฿{totals.pendingDeduction.toLocaleString()} บ.</strong>
              </div>
            )}

            {/* Summary card for defects */}
            <div 
              onClick={() => setMobileTab('defects')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                hasDefects 
                  ? 'bg-amber-50/70 border-amber-200' 
                  : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {hasDefects ? (
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                    {hasDefects ? `พบรายการที่ตกเกณฑ์ / ถูกหัก (${defects.length} ข้อ)` : 'ผ่านเกณฑ์ครบทุกหัวข้อ'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {hasDefects ? 'แตะที่นี่เพื่อดูรายละเอียดว่าโดนหักข้อไหนบ้าง' : 'ทำผลงานได้ดีเยี่ยม'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Group rewards mini cards */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs space-y-2">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                เงินรางวัลแยกตามกลุ่มงาน
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600">1. กลุ่มงานจัดส่ง</span>
                  <strong className="text-emerald-700 font-bold">฿{groups.group1.reward.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600">2. กลุ่มงานบริการ</span>
                  <strong className="text-emerald-700 font-bold">฿{groups.group2.reward.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600">3. กลุ่มงานเอกสาร &amp; ผลิตภัณฑ์</span>
                  <strong className="text-emerald-700 font-bold">฿{groups.group3.reward.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600">4. กลุ่มงานภาพลักษณ์แบรนด์</span>
                  <strong className="text-emerald-700 font-bold">฿{groups.group4.reward.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Print Slip Button */}
            <button
              onClick={() => onPrint(vehicle)}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์สลิปผลงาน (PDF)</span>
            </button>

          </div>
        )}

        {/* TAB 2: DEFECTS ONLY (จุดที่ตก) */}
        {mobileTab === 'defects' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <h3 className="font-bold text-sm text-slate-900">
                รายการที่ตกเกณฑ์ / ถูกหักคะแนน
              </h3>
              <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                ตก {defects.length} ข้อ
              </span>
            </div>

            {hasDefects ? (
              defects.map((d, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border ${
                    d.severity === 'danger'
                      ? 'bg-white border-rose-200 shadow-2xs'
                      : 'bg-white border-amber-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                      d.severity === 'danger' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      ข้อ {d.code}
                    </span>
                    <strong className={`text-xs font-bold ${
                      d.severity === 'danger' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {d.impact}
                    </strong>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900">{d.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{d.detail}</p>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-slate-800">ไม่มีรายการตกเกณฑ์</h4>
                <p className="text-xs text-slate-400 mt-1">เบอร์รถนี้ผ่านเกณฑ์มาตรฐานครบถ้วน</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALL EVALUATION ITEMS (ACCORDION CARDS) */}
        {mobileTab === 'all_items' && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 mb-2 px-1">
              แจกแจงเกณฑ์ประเมินครบทุกข้อ (1.1 ถึง 4.7)
            </h3>

            {groupList.map(({ key, group, title, score }) => {
              const isExpanded = expandedGroup === key;

              return (
                <div key={key} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                  
                  {/* Group accordion header */}
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? '' : key)}
                    className="w-full p-4 text-left flex items-center justify-between bg-slate-50/50"
                  >
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-800">{title}</h4>
                      <span className="text-[11px] text-slate-400">
                        {score} คะแนน • รางวัล ฿{group.reward.toLocaleString()}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Items list */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 p-2">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="p-3 text-xs flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800">{item.code}</span>
                              <span className="font-medium text-slate-800">{item.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              เกณฑ์: {item.target} • ผลงาน: <strong className="text-slate-700">{item.result}</strong>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-bold text-xs text-slate-800">
                              {item.score} คะแนน
                            </div>
                            {item.reward !== undefined && (
                              <div className={`text-[11px] font-bold ${item.reward < 0 ? 'text-rose-600' : item.reward > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                {item.reward < 0 ? `-฿${Math.abs(item.reward)}` : `฿${item.reward.toLocaleString()}`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200/80 px-4 py-2 z-40 flex items-center justify-around shadow-lg">
        
        {/* Tab 1: สรุปรางวัล */}
        <button
          onClick={() => setMobileTab('summary')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors ${
            mobileTab === 'summary' ? 'text-sky-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Coins className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">สรุปรางวัล</span>
        </button>

        {/* Tab 2: จุดที่ตก */}
        <button
          onClick={() => setMobileTab('defects')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors relative ${
            mobileTab === 'defects' ? 'text-rose-600 font-bold' : 'text-slate-400'
          }`}
        >
          <AlertTriangle className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">จุดที่ตก</span>
          {hasDefects && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
          )}
        </button>

        {/* Tab 3: ทุกข้อ */}
        <button
          onClick={() => setMobileTab('all_items')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors ${
            mobileTab === 'all_items' ? 'text-sky-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">เกณฑ์ทุกข้อ</span>
        </button>

      </nav>

    </div>
  );
}
