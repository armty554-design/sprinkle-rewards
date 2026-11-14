import React, { useState, useMemo } from 'react';
import { 
  X, 
  Database, 
  FileSpreadsheet, 
  Upload, 
  GitMerge, 
  Calendar, 
  Building2, 
  Check, 
  Trash2, 
  ArrowRight, 
  Layers, 
  Coins, 
  Truck, 
  Sparkles,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  RotateCw
} from 'lucide-react';
import { 
  getAllMonths, 
  deleteCustomMonth, 
  setSelectedMonthKey,
  getMonthQuickStats
} from '../utils/monthStorage';

export default function AdminDataManagerModal({
  isOpen,
  onClose,
  currentMonthKey,
  onSelectMonth,
  onOpenUploadModal,
  currentUser,
  currentMonthData,
  onDataChanged,
  onSyncAllFromLooker,
  onResetToLooker,
  isSyncingLooker
}) {
  const [activeTab, setActiveTab] = useState('months'); // 'months', 'branch_stats'
  const [notice, setNotice] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Month list with analyzed stats
  const monthsList = useMemo(() => {
    const list = getAllMonths();
    return list.map(m => {
      const stats = getMonthQuickStats(m.csv);
      return {
        ...m,
        stats
      };
    });
  }, [isOpen, notice, currentMonthKey]);

  const showNotice = (msg, type = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4500);
  };

  if (!isOpen) return null;

  const busy = isProcessing || isSyncingLooker;

  const handleSyncLookerClick = async () => {
    if (!onSyncAllFromLooker) return;
    setIsProcessing(true);
    try {
      await onSyncAllFromLooker();
      showNotice('ซิงค์ข้อมูลทุกเดือนทุกสาขาจาก Looker 69 เรียบร้อยแล้ว!', 'success');
    } catch (err) {
      showNotice('เกิดข้อผิดพลาดในการซิงค์: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetLookerClick = async () => {
    if (!onResetToLooker) return;
    if (!window.confirm('ต้องการล้างแคชข้อมูลที่เคยลงไว้ทั้งหมดในเครื่อง และรีเซ็ตเป็นข้อมูลชุด Looker 69 ใช่หรือไม่?')) return;
    setIsProcessing(true);
    try {
      await onResetToLooker();
      showNotice('ล้างแคชข้อมูลเก่าและรีเซ็ตเป็น Looker 69 เรียบร้อยแล้ว', 'info');
    } catch (err) {
      showNotice('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMonth = (mKey, label) => {
    if (window.confirm(`ต้องการลบรายการเดือน "${label || mKey}" ออกจากระบบใช่หรือไม่?`)) {
      const ok = deleteCustomMonth(mKey);
      if (ok) {
        showNotice(`ลบข้อมูลเดือน ${label || mKey} เรียบร้อยแล้ว`, 'info');
        if (mKey === currentMonthKey) {
          const fallback = monthsList.find(x => x.key !== mKey)?.key || '2569-09';
          onSelectMonth(fallback);
        }
        if (onDataChanged) onDataChanged();
      } else {
        showNotice('ไม่สามารถลบข้อมูลเดือนนี้ได้', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg sm:text-xl text-white">การจัดการข้อมูลและสาขา (Data Management)</h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-300 font-bold text-[10px]">
                  แอดมิน
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดการฐานข้อมูลจากแผ่นงาน "Looker ผลคะแนนแยกกลุ่มงาน69" ครบทั้ง 18 สาขา และอัปโหลดข้อมูลรายเดือน
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Notice */}
        {notice && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
            notice.type === 'error' ? 'bg-rose-50 text-rose-800 border-b border-rose-200' :
            notice.type === 'info' ? 'bg-slate-100 text-slate-800 border-b border-slate-200' :
            'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
          }`}>
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice.msg}</span>
          </div>
        )}

        {/* Top Summary Banner */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-400 block text-[11px]">เดือนในระบบ</span>
              <strong className="text-slate-800 font-extrabold text-sm">{monthsList.length} เดือน</strong>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[11px]">เดือนปัจจุบัน</span>
              <strong className="text-sky-700 font-extrabold text-sm">{currentMonthKey}</strong>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[11px]">สาขาในเดือนปัจจุบัน</span>
              {(() => {
                const branches = currentMonthData?.vehicles
                  ? Array.from(new Set(currentMonthData.vehicles.map(v => v.general.branch).filter(Boolean)))
                  : [];
                const display = branches.length > 3
                  ? `ครบ ${branches.length} สาขา`
                  : (branches.join(', ') || '-');
                return (
                  <strong title={branches.join(', ')} className="text-slate-800 font-extrabold text-sm">
                    {display}
                  </strong>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenUploadModal();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>+ นำเข้าไฟล์ / Google Sheet</span>
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-slate-200 px-6 bg-white gap-2">
          <button
            onClick={() => setActiveTab('months')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'months'
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>รายการเดือนในระบบ ({monthsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('branch_stats')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'branch_stats'
                ? 'border-sky-500 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>ภาพรวมและสถิติสาขา</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: ALL MONTHS LIST */}
          {activeTab === 'months' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>คลิก "เลือกดูเดือนนี้" เพื่อสลับข้อมูล หรือกดซิงค์จาก Looker 69 เพื่อดึงข้อมูลทุกเดือนทุกสาขาล่าสุด</span>
                <span className="font-semibold text-slate-700">ทั้งหมด {monthsList.length} เดือน</span>
              </div>

              {/* Looker 69 Live Sync & Reset Banner */}
              <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <h4 className="font-bold text-sm">ซิงค์ข้อมูลทุกเดือนทุกสาขาจาก Looker 69 (Google Sheet)</h4>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                      49 คอลัมน์ • 18 สาขา
                    </span>
                  </div>
                  <p className="text-xs text-sky-100 leading-relaxed">
                    ดึงข้อมูลล่าสุดจากแผ่นงาน <strong>"Looker ผลคะแนนแยกกลุ่มงาน69"</strong> ครบทั้ง 18 สาขาปฏิบัติการ และอัปเดตทุกเดือน (`2569-01` – ปัจจุบัน) พร้อมกันทันที (กันยายน 2569: 382 คัน, รางวัลรวม ฿846,180)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <button
                    onClick={handleSyncLookerClick}
                    disabled={busy}
                    className="px-4 py-2.5 bg-white text-sky-800 hover:bg-sky-50 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-4 h-4 text-sky-600 ${busy ? 'animate-spin' : ''}`} />
                    <span>{busy ? 'กำลังซิงค์...' : 'ซิงค์ทุกเดือนจาก Looker'}</span>
                  </button>
                  <button
                    onClick={handleResetLookerClick}
                    disabled={busy}
                    title="ล้างข้อมูลแคชที่เคยบันทึกค้างและรีเซ็ตเป็นชุด Looker 69"
                    className="px-3 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างแคชรีเซ็ต</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {monthsList.map((m) => {
                  const isCurrent = m.key === currentMonthKey;
                  const branches = m.stats.branches.length > 0 ? m.stats.branches : ['รามอินทรา'];

                  return (
                    <div 
                      key={m.key} 
                      className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent ? 'bg-sky-50/50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-sm font-bold text-slate-900">{m.label}</strong>
                          <span className="text-xs text-slate-400 font-mono">({m.key})</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-500 text-white font-bold text-[10px]">
                              ใช้งานอยู่
                            </span>
                          )}
                        </div>

                        {/* Branch Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">สาขา:</span>
                          {branches.map(b => (
                            <span 
                              key={b} 
                              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-[11px] text-sky-800 shadow-2xs"
                            >
                              {b}
                            </span>
                          ))}
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-600 font-semibold">{m.stats.count} คัน</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-emerald-700 font-bold">฿{m.stats.totalReward.toLocaleString()}</span>
                        </div>

                        {m.note && (
                          <p className="text-[11px] text-slate-400 italic">
                            หมายเหตุ: {m.note}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {!isCurrent ? (
                          <button
                            onClick={() => {
                              setSelectedMonthKey(m.key);
                              onSelectMonth(m.key);
                              showNotice(`สลับมาดูข้อมูลเดือน ${m.label} เรียบร้อยแล้ว`, 'success');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            เลือกดูเดือนนี้
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-bold text-sky-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>เปิดดูอยู่</span>
                          </span>
                        )}

                        <button
                          onClick={() => {
                            onClose();
                            onOpenUploadModal();
                          }}
                          title="อัปโหลดสาขาอื่นเพิ่มเข้าไปในเดือนนี้"
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-600 hover:text-sky-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <GitMerge className="w-3 h-3 text-sky-500" />
                          <span className="hidden sm:inline">+ รวมสาขา</span>
                        </button>

                        {/* Delete custom uploaded month */}
                        {m.key.startsWith('month_') || (m.uploadedAt && m.source !== 'looker69') ? (
                          <button
                            onClick={() => handleDeleteMonth(m.key, m.label)}
                            title="ลบเดือนนี้"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BRANCH STATS & BREAKDOWN */}
          {activeTab === 'branch_stats' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600">
                สถิติแยกตามสาขาในเดือนที่เปิดดูอยู่ (<strong>{currentMonthKey}</strong>):
              </div>

              {currentMonthData?.vehicles ? (
                (() => {
                  const branchMap = {};
                  currentMonthData.vehicles.forEach(v => {
                    const b = v.general.branch || 'ไม่ระบุ';
                    if (!branchMap[b]) {
                      branchMap[b] = {
                        branch: b,
                        vehicles: [],
                        totalReward: 0,
                        qualifiedCount: 0,
                        withRewardCount: 0
                      };
                    }
                    branchMap[b].vehicles.push(v);
                    branchMap[b].totalReward += v.totals.totalReward;
                    if (v.general.qualified) branchMap[b].qualifiedCount++;
                    if (v.totals.totalReward > 0) branchMap[b].withRewardCount++;
                  });

                  const branchesList = Object.values(branchMap);

                  return (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4">สาขา</th>
                            <th className="py-2.5 px-4 text-center">จำนวนรถ</th>
                            <th className="py-2.5 px-4 text-center">ผ่านเกณฑ์</th>
                            <th className="py-2.5 px-4 text-center">ได้รับรางวัล</th>
                            <th className="py-2.5 px-4 text-right">ยอดเงินรางวัลรวม</th>
                            <th className="py-2.5 px-4 text-right">เฉลี่ยต่อคัน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {branchesList.map(item => {
                            const avg = item.vehicles.length > 0 
                              ? Math.round(item.totalReward / item.vehicles.length) 
                              : 0;

                            return (
                              <tr key={item.branch} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-2">
                                    <Building2 className="w-4 h-4 text-sky-600" />
                                    <strong className="text-slate-900 font-bold text-sm">
                                      สาขา {item.branch}
                                    </strong>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-800">
                                  {item.vehicles.length} คัน
                                </td>
                                <td className="py-3 px-4 text-center text-slate-600">
                                  {item.qualifiedCount} / {item.vehicles.length}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                                    {item.withRewardCount} คัน
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-extrabold text-emerald-700 text-sm">
                                  ฿{item.totalReward.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-700">
                                  ฿{avg.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  ไม่มีข้อมูลในเดือนนี้
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>การรวมข้อมูลสาขาจะไม่ลบสาขาที่มีอยู่เดิม และจัดเก็บไว้ในเครื่องอย่างปลอดภัย</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
