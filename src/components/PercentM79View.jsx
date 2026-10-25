import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  RotateCw, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Award, 
  Layers, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { RAW_PERCENT_M79_CSV } from '../data/percentM79Data.js';
import { parsePercentM79Data } from '../utils/percentM79Parser.js';
import { idbSetItem, idbGetItem } from '../utils/idbStorage.js';

export default function PercentM79View() {
  const [csvData, setCsvData] = useState(() => {
    try {
      const cached = localStorage.getItem('sprinkle_percent_m79_csv');
      if (cached && cached.length > 500) return cached;
    } catch (e) {}
    return RAW_PERCENT_M79_CSV;
  });

  // Hydrate from IndexedDB (bypasses 5MB limit)
  useEffect(() => {
    idbGetItem('sprinkle_percent_m79_csv').then(saved => {
      if (saved && saved.length > 500) {
        setCsvData(saved);
      }
    });
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);
  const [activeGroupTab, setActiveGroupTab] = useState('all'); // 'all', 'g1', 'g2', 'g3', 'g4', 'g5'

  // Parse percent data
  const data = useMemo(() => {
    return parsePercentM79Data(csvData);
  }, [csvData]);

  // Sync from Google Sheets live
  const handleSyncFromSheet = async () => {
    setIsRefreshing(true);
    setSyncNotice(null);
    try {
      const url = 'https://docs.google.com/spreadsheets/d/1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc/export?format=csv&gid=1329010069';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 500) throw new Error('ข้อมูลจากชีตไม่สมบูรณ์');

      setCsvData(text);
      await idbSetItem('sprinkle_percent_m79_csv', text);
      try {
        localStorage.setItem('sprinkle_percent_m79_csv', text);
      } catch (e) {
        // LocalStorage quota reached, safely ignored since saved in IndexedDB
      }
      setSyncNotice({ type: 'success', msg: 'ซิงค์ข้อมูลเปอร์เซ็นต์ M7-9 ล่าสุดเรียบร้อยแล้ว!' });
    } catch (err) {
      setSyncNotice({ type: 'error', msg: `ซิงค์ไม่สำเร็จ: ${err.message}` });
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  if (!data) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p>ไม่สามารถประมวลผลข้อมูลเปอร์เซ็นต์ M7-9 ได้</p>
      </div>
    );
  }

  const { overview, groups } = data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <BarChart3 className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-indigo-100 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ผลประเมินรายไตรมาส Q3 (M7-M9: ก.ค. - ก.ย. 2569)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              เปอร์เซ็นต์ M7-9 (เปรียบเทียบผลงาน 3 เดือน)
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
              เปรียบเทียบค่าเฉลี่ยคะแนนคิดเป็น % และผลรวมเงินรางวัลของทุกสาขา แยกตามหัวข้อประเมิน 5 กลุ่มงานตลอดไตรมาส M7 (ก.ค.), M8 (ส.ค.), M9 (ก.ย.) และ Grand Total
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromSheet}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-white text-indigo-950 hover:bg-indigo-50 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRefreshing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลชีต'}</span>
            </button>
            <a
              href="https://docs.google.com/spreadsheets/d/1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc/edit?gid=1329010069#gid=1329010069"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors"
              title="เปิด Google Sheets ต้นทาง"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {syncNotice && (
          <div className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            syncNotice.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncNotice.msg}</span>
          </div>
        )}
      </div>

      {/* 4 Periods Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overview.map((item, idx) => {
          const isGrandTotal = item.periodId === 'total';
          return (
            <div 
              key={item.periodId}
              className={`p-5 rounded-2xl border transition-all ${
                isGrandTotal 
                  ? 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-indigo-800 shadow-md'
                  : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isGrandTotal ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-100 text-slate-700'
                }`}>
                  {item.label}
                </span>
                <Calendar className={`w-4 h-4 ${isGrandTotal ? 'text-indigo-400' : 'text-slate-400'}`} />
              </div>

              {/* Overall Percentage */}
              <div className="space-y-1 mb-4">
                <span className={`text-[11px] font-medium block ${isGrandTotal ? 'text-indigo-200' : 'text-slate-400'}`}>
                  คิดเป็น % เฉลี่ยภาพรวม
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className={`text-2xl font-black ${
                    isGrandTotal ? 'text-amber-300' : 'text-slate-900'
                  }`}>
                    {item.overallPercent.toFixed(2)}%
                  </h3>
                  <span className={`text-xs font-semibold ${
                    item.overallPercent >= 88 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {item.overallPercent >= 88 ? 'เกณฑ์มาตรฐาน' : 'ต้องปรับปรุง'}
                  </span>
                </div>
              </div>

              {/* Total Rewards */}
              <div className={`pt-3 border-t ${isGrandTotal ? 'border-indigo-800/80' : 'border-slate-100'} space-y-1`}>
                <div className="flex justify-between text-xs">
                  <span className={isGrandTotal ? 'text-indigo-300' : 'text-slate-400'}>เงินรางวัลรวม:</span>
                  <strong className={`font-mono font-black ${isGrandTotal ? 'text-white' : 'text-indigo-900'}`}>
                    ฿{item.totalReward.toLocaleString()}
                  </strong>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className={isGrandTotal ? 'text-indigo-300' : 'text-slate-400'}>เงินพิเศษ:</span>
                  <span className={`font-mono font-medium ${isGrandTotal ? 'text-indigo-200' : 'text-slate-600'}`}>
                    ฿{item.specialBonus.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Group Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs font-bold border-b border-slate-200">
        <button
          onClick={() => setActiveGroupTab('all')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeGroupTab === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          ทั้งหมด (5 กลุ่มงาน)
        </button>

        <button
          onClick={() => setActiveGroupTab('g1')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeGroupTab === 'g1'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          กลุ่ม 1: จัดส่งตรงเวลา
        </button>

        <button
          onClick={() => setActiveGroupTab('g2')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeGroupTab === 'g2'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          กลุ่ม 2: งานบริการ
        </button>

        <button
          onClick={() => setActiveGroupTab('g3')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeGroupTab === 'g3'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          กลุ่ม 3: เอกสารและผลิตภัณฑ์
        </button>

        <button
          onClick={() => setActiveGroupTab('g4')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeGroupTab === 'g4'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          กลุ่ม 4: ภาพลักษณ์แบรนด์
        </button>

        <button
          onClick={() => setActiveGroupTab('g5')}
          className={`px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
            activeGroupTab === 'g5'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          กลุ่ม 5: พัฒนายอดขาย/ภาพรวม
        </button>
      </div>

      {/* --- GROUP 1 TABLE --- */}
      {(activeGroupTab === 'all' || activeGroupTab === 'g1') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span>{groups.g1.title}</span>
            </h3>
            <span className="text-xs text-slate-500">1.1 - 1.8</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4 text-left">เดือน / รอบการประเมิน</th>
                  <th className="py-3 px-3 text-right">1.1 จัดส่งตรงเวลา</th>
                  <th className="py-3 px-3 text-right">1.2 ตกรอบส่งสุทธิ</th>
                  <th className="py-3 px-3 text-right">1.3 ข้อร้องเรียน 01</th>
                  <th className="py-3 px-3 text-right">1.4 (001) ไม่ครบ</th>
                  <th className="py-3 px-3 text-right">1.4 (38) ไม่จริง</th>
                  <th className="py-3 px-3 text-right">1.5 GPS</th>
                  <th className="py-3 px-3 text-right">1.6 ส่งซ้ำ</th>
                  <th className="py-3 px-3 text-right">1.7 ส่งด่วน</th>
                  <th className="py-3 px-3 text-right">1.8 ประเภทรับน้ำ</th>
                  <th className="py-3 px-4 text-right bg-sky-50 text-sky-900">เฉลี่ย % กลุ่ม 1</th>
                  <th className="py-3 px-4 text-right bg-indigo-50 text-indigo-900 font-black">รวมเงินรางวัลกลุ่ม 1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.g1.periods.map(p => {
                  const isTotal = p.id === 'total';
                  return (
                    <tr key={p.id} className={isTotal ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50/60'}>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.label}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg1_1.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg1_2.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg1_3.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum001.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum38.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg1_5.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg1_6.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg1_7.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg1_8.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right font-mono font-bold bg-sky-50/60 text-sky-900">
                        {p.avgGroup1.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black bg-indigo-50/60 text-indigo-900">
                        ฿{p.rewardGroup1.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- GROUP 2 TABLE --- */}
      {(activeGroupTab === 'all' || activeGroupTab === 'g2') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>{groups.g2.title}</span>
            </h3>
            <span className="text-xs text-slate-500">2.1 - 2.8</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4 text-left">เดือน / รอบการประเมิน</th>
                  <th className="py-3 px-3 text-right">2.1 ตรงเวลานัด</th>
                  <th className="py-3 px-3 text-right">2.2 ร้องเรียนเท็จ</th>
                  <th className="py-3 px-3 text-right">2.3 สมาชิกยกเลิก</th>
                  <th className="py-3 px-3 text-right">2.4 คำชม</th>
                  <th className="py-3 px-3 text-right">2.5 พึงพอใจ</th>
                  <th className="py-3 px-3 text-right">2.6 เสริมน้ำนอกรอบ</th>
                  <th className="py-3 px-3 text-right">2.7 เสริมน้ำนอกพื้นที่</th>
                  <th className="py-3 px-3 text-right">2.8 ติดตามย้ายรอบ</th>
                  <th className="py-3 px-4 text-right bg-emerald-50 text-emerald-900">เฉลี่ย % กลุ่ม 2</th>
                  <th className="py-3 px-4 text-right bg-indigo-50 text-indigo-900 font-black">รวมเงินรางวัลกลุ่ม 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.g2.periods.map(p => {
                  const isTotal = p.id === 'total';
                  return (
                    <tr key={p.id} className={isTotal ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50/60'}>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.label}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg2_1.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg2_2.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum2_3.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg2_4.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg2_5.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg2_6.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.sum2_7.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg2_8.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right font-mono font-bold bg-emerald-50/60 text-emerald-900">
                        {p.avgGroup2.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black bg-indigo-50/60 text-indigo-900">
                        ฿{p.rewardGroup2.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- GROUP 3 TABLE --- */}
      {(activeGroupTab === 'all' || activeGroupTab === 'g3') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>{groups.g3.title}</span>
            </h3>
            <span className="text-xs text-slate-500">3.1 - 3.8</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4 text-left">เดือน / รอบการประเมิน</th>
                  <th className="py-3 px-3 text-right">3.1 Prepaid</th>
                  <th className="py-3 px-3 text-right">3.2 SPD ถูกต้อง</th>
                  <th className="py-3 px-3 text-right">3.3 คูปองค้าง &gt;7วัน</th>
                  <th className="py-3 px-3 text-right">3.4 Postpaid</th>
                  <th className="py-3 px-3 text-right">3.5 คืนน้ำ</th>
                  <th className="py-3 px-3 text-right">3.6 กำจัดได้</th>
                  <th className="py-3 px-3 text-right">3.6 กำจัดไม่ได้</th>
                  <th className="py-3 px-3 text-right">3.7 สั่งคูปอง</th>
                  <th className="py-3 px-3 text-right">3.8 ขาดคูปอง</th>
                  <th className="py-3 px-4 text-right bg-amber-50 text-amber-900">เฉลี่ย % กลุ่ม 3</th>
                  <th className="py-3 px-4 text-right bg-indigo-50 text-indigo-900 font-black">รวมเงินรางวัลกลุ่ม 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.g3.periods.map(p => {
                  const isTotal = p.id === 'total';
                  return (
                    <tr key={p.id} className={isTotal ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50/60'}>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.label}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg3_1.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg3_2.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum3_3.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg3_4.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum3_5}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600">{p.sum3_6_1}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum3_6_2}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum3_7}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum3_8}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold bg-amber-50/60 text-amber-900">
                        {p.avgGroup3.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black bg-indigo-50/60 text-indigo-900">
                        ฿{p.rewardGroup3.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- GROUP 4 TABLE --- */}
      {(activeGroupTab === 'all' || activeGroupTab === 'g4') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span>{groups.g4.title}</span>
            </h3>
            <span className="text-xs text-slate-500">4.1 - 4.7</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4 text-left">เดือน / รอบการประเมิน</th>
                  <th className="py-3 px-3 text-right">4.1 สะอาด</th>
                  <th className="py-3 px-3 text-right">4.2 พร้อม</th>
                  <th className="py-3 px-3 text-right">4.3 แต่งกาย</th>
                  <th className="py-3 px-3 text-right">4.4 ร้องเรียน 05-36</th>
                  <th className="py-3 px-3 text-right">4.5 ร้องเรียน 94</th>
                  <th className="py-3 px-3 text-right">4.6 คืนน้ำในวัน</th>
                  <th className="py-3 px-3 text-right">4.7 ขับขี่ปลอดภัย</th>
                  <th className="py-3 px-4 text-right bg-purple-50 text-purple-900">เฉลี่ย % กลุ่ม 4</th>
                  <th className="py-3 px-4 text-right bg-indigo-50 text-indigo-900 font-black">รวมเงินรางวัลกลุ่ม 4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.g4.periods.map(p => {
                  const isTotal = p.id === 'total';
                  return (
                    <tr key={p.id} className={isTotal ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50/60'}>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.label}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg4_1.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg4_2.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg4_3.toFixed(2)}%</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum4_4}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum4_5}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">{p.sum4_6}</td>
                      <td className="py-3 px-3 text-right font-mono">{p.avg4_7.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right font-mono font-bold bg-purple-50/60 text-purple-900">
                        {p.avgGroup4.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black bg-indigo-50/60 text-indigo-900">
                        ฿{p.rewardGroup4.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- GROUP 5 TABLE --- */}
      {(activeGroupTab === 'all' || activeGroupTab === 'g5') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>{groups.g5.title}</span>
            </h3>
            <span className="text-xs text-slate-500">5.1 - 5.2 และสรุปภาพรวม</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4 text-left">เดือน / รอบการประเมิน</th>
                  <th className="py-3 px-4 text-right">5.1 หาสมาชิกใหม่ (ราย)</th>
                  <th className="py-3 px-4 text-right">5.2 หนังสือเตือน (ใบ)</th>
                  <th className="py-3 px-4 text-right bg-slate-100 text-slate-800">คิดเป็น % ทั้งหมด</th>
                  <th className="py-3 px-4 text-right text-emerald-700 font-bold">เงินพิเศษ</th>
                  <th className="py-3 px-4 text-right bg-indigo-50 text-indigo-900 font-black">รวมเงินรางวัลทั้งสิ้น</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.g5.periods.map(p => {
                  const isTotal = p.id === 'total';
                  return (
                    <tr key={p.id} className={isTotal ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50/60'}>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.label}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{p.sum5_1} ราย</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600">{p.sum5_2} ใบ</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50">
                        {p.overallPercent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        ฿{p.specialBonus.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-indigo-900 bg-indigo-50/60 text-sm">
                        ฿{p.totalReward.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
