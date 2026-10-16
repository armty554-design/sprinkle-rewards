import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Calendar, Link2, RotateCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseCSVData } from '../utils/parser';

export default function UploadNewMonthModal({ onClose, onMonthAdded }) {
  const [monthKey, setMonthKey] = useState('');
  const [monthLabel, setMonthLabel] = useState('');
  const [note, setNote] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState('file'); // 'file' or 'sheet'
  const [sheetUrl, setSheetUrl] = useState('');

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsLoading(true);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.SheetNames[0];
          const text = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
          processCsv(text, file.name);
        } catch (err) {
          setError('ไม่สามารถอ่านไฟล์ Excel ได้: ' + err.message);
          setIsLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
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

  const processCsv = (text, fileName) => {
    try {
      const parsed = parseCSVData(text);
      setCsvContent(text);
      setPreview(parsed);
      
      // Auto deduce month from data or filename
      if (!monthLabel && parsed.meta.month) {
        setMonthLabel(parsed.meta.month);
      }
      if (!monthKey) {
        // Try to generate 2569-10 format
        const match = (parsed.meta.month || fileName).match(/([0-9]{4})[-_]([0-9]{2})/);
        if (match) {
          setMonthKey(`${match[1]}-${match[2]}`);
        } else {
          setMonthKey(`month_${Date.now()}`);
        }
      }
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
    const finalKey = monthKey.trim() || `month_${Date.now()}`;
    const finalLabel = monthLabel.trim() || preview?.meta?.month || finalKey;

    onMonthAdded(finalKey, finalLabel, csvContent, note);
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

          {/* Preview Card if File loaded */}
          {preview && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>ตรวจพบข้อมูลเรียบร้อยแล้ว:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[11px]">สาขา</span>
                  <strong className="text-slate-900">{preview.meta.branch}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">จำนวนรถ</span>
                  <strong className="text-slate-900">{preview.summary.totalVehicles} คัน</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ยอดเงินรางวัลรวม</span>
                  <strong className="text-emerald-700">฿{preview.summary.totalRewards.toLocaleString()}</strong>
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
