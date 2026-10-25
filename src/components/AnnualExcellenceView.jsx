import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Filter, 
  RotateCw, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Building2, 
  Coins, 
  Award, 
  User, 
  Calendar, 
  TrendingUp,
  FileSpreadsheet,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { RAW_ANNUAL_EXCELLENCE_CSV } from '../data/annualExcellenceData.js';
import { parseAnnualExcellenceData } from '../utils/annualExcellenceParser.js';
import { idbSetItem, idbGetItem } from '../utils/idbStorage.js';

export default function AnnualExcellenceView() {
  const [csvData, setCsvData] = useState(() => {
    // Check localStorage cache or fallback to bundled snapshot
    try {
      const cached = localStorage.getItem('sprinkle_annual_excellence_csv');
      if (cached && cached.length > 500) return cached;
    } catch (e) {}
    return RAW_ANNUAL_EXCELLENCE_CSV;
  });

  // Hydrate from IndexedDB (bypasses 5MB limit)
  useEffect(() => {
    idbGetItem('sprinkle_annual_excellence_csv').then(saved => {
      if (saved && saved.length > 500) {
        setCsvData(saved);
      }
    });
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedEligibility, setSelectedEligibility] = useState('all');
  const [sortBy, setSortBy] = useState('reward_desc');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);

  // Parse data
  const parsedData = useMemo(() => {
    return parseAnnualExcellenceData(csvData);
  }, [csvData]);

  const { drivers, stats, branches, vehicleTypes } = parsedData;

  // Filtered and sorted drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const car = d.carCode.toLowerCase();
        const name = d.fullName.toLowerCase();
        const empId = d.empId.toLowerCase();
        if (!car.includes(q) && !name.includes(q) && !empId.includes(q)) return false;
      }
      if (selectedBranch !== 'all' && d.branch !== selectedBranch) return false;
      if (selectedType !== 'all' && d.vehicleType !== selectedType) return false;
      if (selectedEligibility === 'perfect' && d.summary.eligibleMonthsCount < 9) return false;
      if (selectedEligibility === 'partial' && (d.summary.eligibleMonthsCount === 0 || d.summary.eligibleMonthsCount >= 9)) return false;
      if (selectedEligibility === 'none' && d.summary.eligibleMonthsCount > 0) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'reward_desc') return b.summary.totalAnnualReward - a.summary.totalAnnualReward;
      if (sortBy === 'reward_asc') return a.summary.totalAnnualReward - b.summary.totalAnnualReward;
      if (sortBy === 'percent_desc') return b.summary.avgPercent - a.summary.avgPercent;
      if (sortBy === 'volume_desc') return b.summary.avgVolume - a.summary.avgVolume;
      if (sortBy === 'car_asc') return a.carCode.localeCompare(b.carCode, undefined, { numeric: true });
      return 0;
    });
  }, [drivers, searchQuery, selectedBranch, selectedType, selectedEligibility, sortBy]);

  // Sync from Google Sheets live
  const handleSyncFromSheet = async () => {
    setIsRefreshing(true);
    setSyncNotice(null);
    try {
      const url = 'https://docs.google.com/spreadsheets/d/1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc/export?format=csv&gid=1363027079';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 500) throw new Error('ข้อมูลจากชีตไม่สมบูรณ์');

      setCsvData(text);
      await idbSetItem('sprinkle_annual_excellence_csv', text);
      try {
        localStorage.setItem('sprinkle_annual_excellence_csv', text);
      } catch (e) {
        // LocalStorage quota reached, safely ignored since saved in IndexedDB & memory
      }
      setSyncNotice({ type: 'success', msg: 'ซิงค์ข้อมูลมาตรฐานยอดเยี่ยม 2569 ล่าสุดเรียบร้อยแล้ว!' });
    } catch (err) {
      setSyncNotice({ type: 'error', msg: `ซิงค์ไม่สำเร็จ: ${err.message}` });
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <Trophy className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>ภาพรวมมาตรฐานทั้งปี 2569 (ม.ค. - ธ.ค.)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              รวมมาตรฐานยอดเยี่ยม 2569
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
              ศูนย์รวมผลคะแนนและเงินรางวัลมาตรฐานจัดส่งประจำปี 2569 ของพนักงานและผู้ประกอบการทุกสาขา ติดตามความต่อเนื่องการได้สิทธิ์ตลอดทั้ง 12 เดือน
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromSheet}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span>{isRefreshing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลชีต'}</span>
            </button>
            <a
              href="https://docs.google.com/spreadsheets/d/1GdiQEkdAUT8JLMQEnaFOlV6o5goWm2j_v1HXney7hZc/edit?gid=1363027079#gid=1363027079"
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Annual Rewards */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">ผลรวมเงินรางวัลทั้งปี</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              ฿{stats.totalAnnualReward.toLocaleString()}
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold">สะสมตลอดทั้งปี</span>
          </div>
        </div>

        {/* Total Drivers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">จำนวนรถ/คนขับในระบบ</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.totalDrivers} <span className="text-xs font-normal text-slate-400">คัน</span>
            </h3>
            <span className="text-[11px] text-sky-600 font-semibold">ครบทั้ง 18 สาขา</span>
          </div>
        </div>

        {/* Average Score % */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">ค่าเฉลี่ยคิดเป็น % ทั้งปี</span>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600">
              {stats.avgScorePercent}%
            </h3>
            <span className="text-[11px] text-slate-400">เป้าหมายมาตรฐาน 85%+</span>
          </div>
        </div>

        {/* Full Eligibility Candidates */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">มีสิทธิ์ต่อเนื่องทุกเดือน</span>
            <h3 className="text-xl sm:text-2xl font-black text-purple-700">
              {stats.perfectEligibilityCount} <span className="text-xs font-normal text-slate-400">คัน</span>
            </h3>
            <span className="text-[11px] text-purple-600 font-semibold">ผู้มีสิทธิ์ยอดเยี่ยม 9 เดือน+</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเบอร์รถ, ชื่อคนขับ หรือรหัสพนักงาน..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Stats count */}
          <div className="text-xs text-slate-500 font-medium px-2 shrink-0">
            แสดงผล <strong>{filteredDrivers.length}</strong> จาก {drivers.length} คัน
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">สาขา:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">ทุกสาขา ({branches.length})</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">ประเภทรถ:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">ทั้งหมด</option>
              {vehicleTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Eligibility Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">สิทธิ์โครงการ:</span>
            <select
              value={selectedEligibility}
              onChange={(e) => setSelectedEligibility(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">ทั้งหมด</option>
              <option value="perfect">มีสิทธิ์ครบทุกเดือน (9+ เดือน)</option>
              <option value="partial">มีสิทธิ์บางเดือน (1-8 เดือน)</option>
              <option value="none">ไม่มีสิทธิ์เลย (0 เดือน)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 ml-auto">
            <span className="text-slate-500 font-medium">เรียงตาม:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="reward_desc">เงินรางวัลรวมสูงสุด</option>
              <option value="reward_asc">เงินรางวัลรวมต่ำสุด</option>
              <option value="percent_desc">% คะแนนเฉลี่ยสูงสุด</option>
              <option value="volume_desc">ยอดส่งเฉลี่ยสูงสุด</option>
              <option value="car_asc">เบอร์รถ (น้อยไปมาก)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Driver Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-center">อันดับ</th>
                <th className="py-3.5 px-4">เบอร์รถ / พนักงาน</th>
                <th className="py-3.5 px-4">สาขา</th>
                <th className="py-3.5 px-4 text-center">ประเภทรถ</th>
                <th className="py-3.5 px-4 text-right">ยอดส่งเฉลี่ย</th>
                <th className="py-3.5 px-4 text-right">คะแนนเฉลี่ย</th>
                <th className="py-3.5 px-4 text-right">คิดเป็น %</th>
                <th className="py-3.5 px-4 text-center">มีสิทธิ์ร่วมโครงการ</th>
                <th className="py-3.5 px-4 text-right">รวมเงินรางวัลทั้งปี</th>
                <th className="py-3.5 px-4 text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map((driver, index) => {
                const isPerfect = driver.summary.eligibleMonthsCount >= 9;
                return (
                  <tr
                    key={driver.id}
                    className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                    onClick={() => setSelectedDriver(driver)}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {index === 0 && <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px]">1st</span>}
                      {index === 1 && <span className="inline-block px-2 py-0.5 rounded-full bg-slate-300 text-slate-900 font-black text-[10px]">2nd</span>}
                      {index === 2 && <span className="inline-block px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-[10px]">3rd</span>}
                      {index > 2 && index + 1}
                    </td>

                    {/* Driver & Car */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {driver.carCode}
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-bold group-hover:text-amber-800 transition-colors">
                            {driver.fullName}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-mono">
                            รหัส: {driver.empId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {driver.branch}
                      </span>
                    </td>

                    {/* Car Type */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        driver.vehicleType === 'ผปก.' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {driver.vehicleType}
                      </span>
                    </td>

                    {/* Avg Volume */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                      {driver.summary.avgVolume > 0 ? driver.summary.avgVolume.toLocaleString() : '-'}
                    </td>

                    {/* Avg Score */}
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                      {driver.summary.avgScore > 0 ? driver.summary.avgScore.toFixed(2) : '-'}
                    </td>

                    {/* Avg Percent */}
                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        driver.summary.avgPercent >= 95
                          ? 'bg-emerald-50 text-emerald-700'
                          : driver.summary.avgPercent >= 85
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {driver.summary.avgPercent > 0 ? `${driver.summary.avgPercent.toFixed(2)}%` : '-'}
                      </span>
                    </td>

                    {/* Eligible Months */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isPerfect
                          ? 'bg-emerald-100 text-emerald-800 font-black'
                          : driver.summary.eligibleMonthsCount > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isPerfect && <Award className="w-3 h-3 text-emerald-600" />}
                        <span>{driver.summary.eligibleMonthsCount} / {driver.recordedMonthsCount || 9} เดือน</span>
                      </span>
                    </td>

                    {/* Total Annual Reward */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-amber-900 text-sm">
                      {driver.summary.totalAnnualReward > 0 
                        ? `฿${driver.summary.totalAnnualReward.toLocaleString()}`
                        : <span className="text-slate-300 font-normal">฿0</span>}
                    </td>

                    {/* Action button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDriver(driver);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="ดูรายละเอียดทั้ง 12 เดือน"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver 12-Month Drilldown Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-white text-amber-900 font-black text-xs">
                    เบอร์รถ {selectedDriver.carCode}
                  </span>
                  <span className="text-xs text-amber-100">
                    สาขา {selectedDriver.branch} ({selectedDriver.vehicleType})
                  </span>
                </div>
                <h3 className="text-xl font-black">{selectedDriver.fullName}</h3>
                <p className="text-xs text-amber-100 font-mono">รหัสพนักงาน: {selectedDriver.empId}</p>
              </div>

              <button
                onClick={() => setSelectedDriver(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary Cards */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block font-medium">รวมเงินรางวัลทั้งปี</span>
                <strong className="text-base sm:text-lg font-black text-amber-800">
                  ฿{selectedDriver.summary.totalAnnualReward.toLocaleString()}
                </strong>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block font-medium">คิดเป็น % เฉลี่ย</span>
                <strong className="text-base sm:text-lg font-black text-emerald-600">
                  {selectedDriver.summary.avgPercent.toFixed(2)}%
                </strong>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block font-medium">ยอดส่งเฉลี่ย</span>
                <strong className="text-base sm:text-lg font-black text-slate-800">
                  {selectedDriver.summary.avgVolume.toLocaleString()}
                </strong>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block font-medium">มีสิทธิ์เข้าร่วมโครงการ</span>
                <strong className="text-base sm:text-lg font-black text-purple-700">
                  {selectedDriver.summary.eligibleMonthsCount} / 9 เดือน
                </strong>
              </div>
            </div>

            {/* 12 Months Breakdown Grid */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>ผลงานรายเดือน (มกราคม - ธันวาคม 2569)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedDriver.months.map((m) => {
                  return (
                    <div 
                      key={m.monthNumber}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        !m.isRecorded
                          ? 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60'
                          : m.isEligible
                          ? 'bg-white border-amber-200 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <strong className="text-xs font-bold text-slate-800">
                          {m.monthNumber}. {m.fullName}
                        </strong>
                        {m.isRecorded ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            m.isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {m.isEligible ? '✓ มีสิทธิ์' : 'ไม่มีสิทธิ์'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">ยังไม่มีข้อมูล</span>
                        )}
                      </div>

                      {m.isRecorded ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">ยอดส่ง:</span>
                            <span className="font-mono font-bold text-slate-700">{m.deliveryVolume.toLocaleString()} ถัง</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">คะแนน:</span>
                            <span className="font-mono font-bold text-slate-700">{m.totalScore.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">คิดเป็น %:</span>
                            <span className={`font-mono font-bold ${
                              m.scorePercent >= 95 ? 'text-emerald-600' : m.scorePercent >= 85 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {m.scorePercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                            <span className="text-slate-600">เงินรางวัล:</span>
                            <span className="font-mono text-amber-900 font-black">฿{m.reward.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 py-4 text-center">ไม่มีบันทึกข้อมูลเดือนนี้</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDriver(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
