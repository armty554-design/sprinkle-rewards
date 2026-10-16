import React, { useState } from 'react';
import { X, Save, Edit3, AlertTriangle, CheckCircle2, Coins } from 'lucide-react';

export default function DailyEditModal({ vehicle, onClose, onSaveAdjustment }) {
  if (!vehicle) return null;

  const { general, totals, defects } = vehicle;
  const [adjustedReward, setAdjustedReward] = useState(totals.totalReward);
  const [adjustedScore, setAdjustedScore] = useState(totals.totalScore);
  const [dailyNote, setDailyNote] = useState('');
  const [addDefectTitle, setAddDefectTitle] = useState('');
  const [addDefectImpact, setAddDefectImpact] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    onSaveAdjustment({
      carCode: general.carCode,
      newReward: parseFloat(adjustedReward) || 0,
      newScore: parseFloat(adjustedScore) || 0,
      note: dailyNote,
      newDefect: addDefectTitle ? {
        category: 'บันทึกประจำวัน',
        code: 'DAILY',
        severity: 'warning',
        title: addDefectTitle,
        detail: dailyNote || 'บันทึกอัปเดตประจำวันโดยหัวหน้างาน',
        impact: addDefectImpact || 'ปรับคะแนน/รางวัล'
      } : null
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm">
              {general.carCode}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">บันทึก/ปรับปรุงข้อมูลประจำวัน</h3>
              <p className="text-xs text-slate-400">{general.fullName} ({general.zone})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เงินรางวัลสุทธิ (บาท)
              </label>
              <input
                type="number"
                value={adjustedReward}
                onChange={(e) => setAdjustedReward(e.target.value)}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คะแนนรวมทั้งหมด
              </label>
              <input
                type="number"
                step="0.5"
                value={adjustedScore}
                onChange={(e) => setAdjustedScore(e.target.value)}
                className="w-full py-2 px-3 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เพิ่มหัวข้อที่ตกเกณฑ์ / บันทึกข้อบกพร่องของวันนี้ (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น ข้อร้องเรียนบริการ, ตกรอบส่ง, ความสะอาดรถไม่ผ่าน..."
              value={addDefectTitle}
              onChange={(e) => setAddDefectTitle(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ผลกระทบ / ยอดเงินที่หัก (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น หัก -100 บาท, พลาดรางวัล 200 บาท..."
              value={addDefectImpact}
              onChange={(e) => setAddDefectImpact(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หมายเหตุประจำวัน / คำอธิบายเพิ่มเติม
            </label>
            <textarea
              rows={2}
              placeholder="บันทึกรายละเอียดเหตุผลการปรับปรุง..."
              value={dailyNote}
              onChange={(e) => setDailyNote(e.target.value)}
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
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกการปรับปรุง</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
