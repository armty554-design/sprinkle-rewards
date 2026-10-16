import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Link2, Check, AlertCircle, RotateCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function UploadModal({ onClose, onDataLoaded, defaultSheetUrl }) {
  const [sheetUrl, setSheetUrl] = useState(defaultSheetUrl || 'https://docs.google.com/spreadsheets/d/1iRRkVS5mc9BfuKvEIsWN6l946zE7HKMEmmun0iIdXFs/edit?gid=1535795255#gid=1535795255');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle local file upload (CSV or XLSX)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsLoading(true);

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.SheetNames[0];
          const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
          
          onDataLoaded(csvText, file.name);
          setSuccessMsg(`โหลดข้อมูลจาก ${file.name} เรียบร้อยแล้ว`);
          setTimeout(() => {
            onClose();
          }, 800);
        } catch (err) {
          setError('ไม่สามารถอ่านไฟล์ Excel ได้: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (evt) => {
        try {
          const csvText = evt.target?.result;
          onDataLoaded(csvText, file.name);
          setSuccessMsg(`โหลดข้อมูลจาก ${file.name} เรียบร้อยแล้ว`);
          setTimeout(() => {
            onClose();
          }, 800);
        } catch (err) {
          setError('ไม่สามารถอ่านไฟล์ CSV ได้: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  // Handle Google Sheet sync via direct export URL
  const handleSyncFromUrl = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Parse Sheet ID and gid
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error('ไม่พบ Google Sheet ID ใน URL ที่ระบุ');
      }
      const sheetId = match[1];

      let gid = '0';
      const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
      if (gidMatch) {
        gid = gidMatch[1];
      }

      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

      const res = await fetch(exportUrl);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('ติดสิทธิ์ความเป็นส่วนตัว (401/403) กรุณาตรวจสอบว่าเปิดสิทธิ์ "ทุกคนที่มีลิงก์มีสิทธิ์ดู" แล้ว');
        }
        throw new Error(`ไม่สามารถดาวน์โหลดชีตได้ (HTTP ${res.status})`);
      }

      const csvText = await res.text();
      onDataLoaded(csvText, `Google Sheet (${gid})`);
      setSuccessMsg('ดึงข้อมูลจาก Google Sheet เรียบร้อยแล้ว!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจากชีต');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">นำเข้าข้อมูลรางวัลประจำเดือน</h3>
              <p className="text-xs text-slate-400">อัปโหลดไฟล์ Excel/CSV หรือซิงค์จาก Google Sheet</p>
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
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Option 1: Direct File Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              วิธีที่ 1: อัปโหลดไฟล์ Excel หรือ CSV จากเครื่อง
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-sky-500 hover:bg-sky-50/30 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
              <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-sky-100 text-slate-500 group-hover:text-sky-600 flex items-center justify-center mb-2 transition-colors">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-slate-800 group-hover:text-sky-600">
                คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
              </span>
              <span className="text-xs text-slate-400 mt-1">
                รองรับไฟล์ .xlsx, .xls และ .csv
              </span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="hidden"
              />
            </label>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute">หรือ</span>
          </div>

          {/* Option 2: Sync from Google Sheet URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              วิธีที่ 2: ดึงสดจาก Google Sheet URL
            </label>
            <div className="space-y-2">
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="วางลิงก์ Google Sheet..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleSyncFromUrl}
                disabled={isLoading || !sheetUrl}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'กำลังดึงข้อมูลจาก Google Sheet...' : 'ดึงข้อมูลจากชีตนี้'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
          >
            ยกเลิก
          </button>
        </div>

      </div>
    </div>
  );
}
