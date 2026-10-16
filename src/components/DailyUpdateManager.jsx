import React, { useState } from 'react';
import { 
  Calendar, 
  Upload, 
  RotateCw, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet, 
  Download, 
  History, 
  Trash2, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DailyUpdateManager({ 
  currentMeta, 
  summary, 
  historyList, 
  onLoadSnapshot, 
  onSaveTodaySnapshot, 
  onDeleteSnapshot, 
  onFileUpload, 
  onSyncGoogleSheet, 
  isSyncing,
  csvRaw 
}) {
  const [note, setNote] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Export current data to CSV or Excel
  const handleExportCSV = () => {
    const blob = new Blob([csvRaw], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายงานคะแนนรางวัล_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.SheetNames[0];
          const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
          onFileUpload(csvText, `อัปโหลดรายวัน: ${file.name}`);
        } catch (err) {
          alert('ไม่สามารถอ่านไฟล์ Excel ได้: ' + err.message);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (evt) => {
        try {
          const csvText = evt.target?.result;
          onFileUpload(csvText, `อัปโหลดรายวัน: ${file.name}`);
        } catch (err) {
          alert('ไม่สามารถอ่านไฟล์ CSV ได้: ' + err.message);
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sky-300 text-xs font-semibold uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>ระบบอัปเดตข้อมูลคะแนนและรางวัลประจำวัน</span>
            </div>
            <h2 className="text-2xl font-bold mt-1 tracking-tight">
              อัปเดตและติดตามผลงานรายวัน ({currentMeta.branch})
            </h2>
            <p className="text-xs text-sky-200 mt-1">
              รองรับการอัปโหลดไฟล์อัปเดตประจำวัน หรือดึงข้อมูลล่าสุดจากสำนักงานใหญ่ พร้อมบันทึกประวัติย้อนหลัง
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onSyncGoogleSheet}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังซิงค์...' : 'ดึงข้อมูลสดจากชีตวันนี้'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 transition-colors border border-white/15"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: UPLOAD & SNAPSHOT (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Daily Upload Area */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-600" />
              <span>อัปโหลดไฟล์อัปเดตคะแนนประจำวัน</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              เมื่อได้รับไฟล์ Excel (`.xlsx`) หรือ `.csv` ใหม่จากสำนักงานใหญ่ สามารถลากไฟล์มาวางที่นี่เพื่ออัปเดตระบบทันที
            </p>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-sky-500 bg-sky-50/50 scale-[1.01]' 
                  : 'border-slate-300 hover:border-sky-400 bg-slate-50/50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                ลากไฟล์มาวางที่นี่ หรือคลิกปุ่มด้านล่างเพื่อเลือกไฟล์
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                รองรับไฟล์ตาราง Excel (.xlsx, .xls) และ .csv ทุกเวอร์ชัน
              </p>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs cursor-pointer transition-colors shadow-xs">
                <Upload className="w-4 h-4" />
                <span>เลือกไฟล์อัปเดตจากคอมพิวเตอร์</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Save Today Snapshot Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>บันทึกสถานะคะแนนประจำวันนี้ (Save Snapshot)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              บันทึกจุดเวลาของข้อมูลปัจจุบัน เพื่อใช้เปรียบเทียบการเปลี่ยนแปลงในแต่ละวัน
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="ระบุหมายเหตุ เช่น 'อัปเดตคะแนนตัดรอบวันที่ 16 เย็น'..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 w-full"
              />
              <button
                onClick={() => {
                  onSaveTodaySnapshot(note || 'บันทึกอัปเดตประจำวัน');
                  setNote('');
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึก Snapshot วันนี้</span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: HISTORY & SNAPSHOTS TIMELINE (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-sky-600" />
                <span>ประวัติการอัปเดตแต่ละวัน ({historyList.length})</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              คลิกที่ประวัติเพื่อสลับดูข้อมูลผลงานและเงินรางวัลในแต่ละวันย้อนหลังได้ทันที
            </p>

            {historyList.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {historyList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-sky-300 hover:bg-sky-50/40 bg-slate-50/70 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <strong className="text-xs text-slate-900">{item.displayDate}</strong>
                        {idx === 0 && (
                          <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                            ล่าสุด
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {item.note || item.source}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => onLoadSnapshot(item)}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <span>เปิดดู</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteSnapshot(item.id)}
                        title="ลบประวัติตัวนี้"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                ยังไม่มีการบันทึกประวัติ Snapshot ระบบจะบันทึกให้อัตโนมัติเมื่อมีการอัปโหลดไฟล์ใหม่
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
