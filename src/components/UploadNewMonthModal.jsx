import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Calendar, Link2, RotateCw, Briefcase, ShieldCheck, Layers, GitMerge } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseCSVData } from '../utils/parser';
import { formatThaiMonthLabel, normalizeMonthKey } from '../utils/monthStorage';

export default function UploadNewMonthModal({ onClose, onMonthAdded, currentUser }) {
  const [monthKey, setMonthKey] = useState('');
  const [monthLabel, setMonthLabel] = useState('');
  const [note, setNote] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState('file'); // 'file' or 'sheet'
  const [sheetUrl, setSheetUrl] = useState('');

  // Multi-sheet Excel state
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' (default) or 'replace'
  const [fileName, setFileName] = useState('');

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsLoading(true);
    setFileName(file.name);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'binary' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames || []);

          // Pick the best sheet: prefer 2569-09 or latest or first
          const targetSheet = (wb.SheetNames || []).find(s => s === '2569-09') || wb.SheetNames[wb.SheetNames.length - 1] || wb.SheetNames[0];
          setSelectedSheetName(targetSheet);

          if (targetSheet && wb.Sheets[targetSheet]) {
            const text = XLSX.utils.sheet_to_csv(wb.Sheets[targetSheet]);
            processCsv(text, file.name, targetSheet);
          } else {
            setIsLoading(false);
          }
        } catch (err) {
          setError('ไม่สามารถอ่านไฟล์ Excel ได้: ' + err.message);
          setIsLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheetName('');
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result;
          processCsv(text, file.name);
        } catch (err) {
          setError('ไม่สามารถอ่านไฟล์ CSV ได้: ' + err.message);
          setIsLoading(false);
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handleSheetSwitch = (sheetName) => {
    if (!workbook || !workbook.Sheets[sheetName]) return;
    setSelectedSheetName(sheetName);
    setIsLoading(true);
    try {
      const text = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      processCsv(text, fileName, sheetName);
    } catch (err) {
      setError('ไม่สามารถแปลงข้อมูลแผ่นงานนี้ได้: ' + err.message);
      setIsLoading(false);
    }
  };

  const processCsv = (text, fName, sheetName = '') => {
    try {
      const parsed = parseCSVData(text);
      setCsvContent(text);
      setPreview(parsed);
      
      // Auto deduce clean month key and Thai label
      const sourceStr = sheetName || parsed.meta.month || fName;
      const normKey = normalizeMonthKey(sourceStr);
      const cleanLabel = formatThaiMonthLabel(sourceStr);

      setMonthKey(normKey || `month_${Date.now()}`);
      setMonthLabel(cleanLabel || parsed.meta.month || normKey);
    } catch (err) {
      setError('ข้อมูลในไฟล์ไม่ตรงตามรูปแบบ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sheet sync
  const handleSheetFetch = async () => {
    if (!sheetUrl) return;
    setError('');
    setIsLoading(true);

    try {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error('ไม่พบ Sheet ID');
      const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      const exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ไม่สามารถดาวน์โหลดได้`);
      
      const text = await res.text();
      processCsv(text, `Sheet_${gid}`);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheet: ' + err.message);
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!csvContent) {
      setError('กรุณาเลือกไฟล์ข้อมูลเดือนใหม่');
      return;
    }
    const finalKey = normalizeMonthKey(monthKey.trim()) || `month_${Date.now()}`;
    const finalLabel = formatThaiMonthLabel(monthLabel.trim() || preview?.meta?.month || finalKey);

    const uploaderInfo = currentUser?.name 
      ? ` (อัพโหลดโดย: ${currentUser.name}${currentUser.empId ? ` [${currentUser.empId}]` : ''})` 
      : '';
    const finalNote = (note ? `${note}${uploaderInfo}` : `อัพโหลดโดย: ${currentUser?.name || 'แอดมิน'}`).trim();

    onMonthAdded(finalKey, finalLabel, csvContent, finalNote, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">นำเข้าข้อมูลรางวัลประจำเดือนใหม่</h3>
              <p className="text-xs text-slate-400">อัปโหลดไฟล์ Excel / CSV ประจำเดือนที่ได้รับจากสำนักงานใหญ่</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Office Staff Uploader Identity */}
          {currentUser && (
            <div className="p-3 bg-sky-50/80 border border-sky-100 rounded-xl flex items-center justify-between text-xs text-sky-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-700 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-sky-700 font-medium block">เจ้าหน้าที่ออฟฟิศผู้อัปโหลด:</span>
                  <strong className="text-slate-900">{currentUser.name}</strong>
                  <span className="text-slate-500 ml-1.5">(รหัส {currentUser.empId} • {currentUser.title || currentUser.position || 'ฝ่ายจัดการ'}{currentUser.branch ? ` • ${currentUser.branch}` : ''})</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-sky-200/70 text-sky-900 font-bold text-[10px] shrink-0">
                สิทธิ์อัพโหลด
              </span>
            </div>
          )}

          {/* Month Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อเดือนที่แสดง (Label)
              </label>
              <input
                type="text"
                placeholder="เช่น ตุลาคม 2569, พฤศจิกายน 2569..."
                value={monthLabel}
                onChange={(e) => setMonthLabel(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                รหัสเดือน (Key)
              </label>
              <input
                type="text"
                placeholder="เช่น 2569-10, 2569-11..."
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Upload Method Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab('file')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                tab === 'file' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              อัปโหลดไฟล์ (Excel / CSV)
            </button>
            <button
              type="button"
              onClick={() => setTab('sheet')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                tab === 'sheet' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              ดึงจาก Google Sheet URL
            </button>
          </div>

          {tab === 'file' ? (
            /* File Drop Area */
            <div>
              <label className="border-2 border-dashed border-slate-300 hover:border-sky-500 hover:bg-sky-50/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-800">
                  คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ Excel/CSV มาวางที่นี่
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  รองรับ .xlsx, .xls, .csv
                </span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            /* Google Sheet URL */
            <div className="space-y-2">
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="วางลิงก์ Google Sheet ของเดือนใหม่..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleSheetFetch}
                disabled={isLoading || !sheetUrl}
                className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลชีต'}</span>
              </button>
            </div>
          )}

          {/* Multi-Sheet Selector for Excel files */}
          {sheetNames.length > 1 && (
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>ตรวจพบแผ่นงานในไฟล์ทั้งหมด {sheetNames.length} แผ่นงาน:</span>
                </span>
                <span className="text-[11px] text-indigo-600">เลือกแผ่นงานที่ต้องการนำเข้า</span>
              </div>
              <select
                value={selectedSheetName}
                onChange={(e) => handleSheetSwitch(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-lg border border-indigo-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    แผ่นงาน: {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Import Mode Selector: Merge vs Replace */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              รูปแบบการนำเข้าข้อมูลสาขา
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  importMode === 'merge'
                    ? 'border-sky-500 bg-sky-50/80 text-sky-950 font-bold ring-2 ring-sky-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <GitMerge className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-bold">รวมข้อมูลสาขา (แนะนำ)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  เพิ่มข้อมูลสาขานี้เข้าไปในเดือนที่มีอยู่แล้วโดยไม่ลบสาขาเดิม (ดูพร้อมกันได้หลายสาขา)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  importMode === 'replace'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-bold ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <RotateCw className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold">แทนที่ข้อมูลเดิม / สร้างใหม่</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                  บันทึกทับข้อมูลเดือนนี้ทั้งหมด หรือสร้างเป็นเดือนใหม่แยกต่างหาก
                </p>
              </button>
            </div>
          </div>

          {/* Preview Card if File loaded */}
          {preview && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>ตรวจพบข้อมูลเรียบร้อยแล้ว:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">สาขาที่ตรวจพบ</span>
                  <strong className="text-slate-900 font-bold text-sm text-sky-700">
                    {preview.meta.branch || 'ไม่ระบุ'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">จำนวนรถ</span>
                  <strong className="text-slate-900 font-bold text-sm">{preview.summary.totalVehicles} คัน</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ยอดเงินรางวัลรวม</span>
                  <strong className="text-emerald-700 font-bold text-sm">฿{preview.summary.totalRewards.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              หมายเหตุเพิ่มเติม (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น 'ข้อมูลปรับยอดสิ้นเดือน', 'รอบทดลอง'..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!csvContent}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกและเปิดดูข้อมูลเดือนนี้</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
