import React, { useState } from 'react';
import { Truck, ArrowRight, User, AlertCircle } from 'lucide-react';

export default function LoginScreen({ vehicles, onLogin, currentMonthLabel }) {
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    const query = inputId.trim();
    if (!query) {
      setError('กรุณาระบุรหัสพนักงาน หรือเบอร์รถ');
      return;
    }

    // Check if matching driver by empId or carCode
    const matchedVehicle = vehicles.find(v => 
      v.general.empId === query || 
      v.general.carCode.toLowerCase() === query.toLowerCase()
    );

    if (matchedVehicle) {
      onLogin({
        role: 'driver',
        empId: matchedVehicle.general.empId,
        carCode: matchedVehicle.general.carCode,
        name: matchedVehicle.general.fullName,
        vehicleId: matchedVehicle.id
      });
      return;
    }

    // Check if matching supervisor by empId
    const matchedSupervisor = vehicles.find(v => 
      v.general.supervisorLogisticsId === query || 
      v.general.supervisorAdminId === query
    );

    if (matchedSupervisor) {
      const isLogistics = matchedSupervisor.general.supervisorLogisticsId === query;
      onLogin({
        role: 'supervisor',
        empId: query,
        name: isLogistics ? matchedSupervisor.general.supervisorLogisticsName : matchedSupervisor.general.supervisorAdminName,
        title: isLogistics ? 'หัวหน้าโลจิสติกส์' : 'หัวหน้าธุรการ'
      });
      return;
    }

    // Allow 'admin' or '99999' as manager bypass
    if (query.toLowerCase() === 'admin' || query === '1111' || query === '0000') {
      onLogin({
        role: 'admin',
        empId: 'ADMIN',
        name: 'ผู้ดูแลระบบสาขา',
        title: 'ผู้จัดการ / แอดมิน'
      });
      return;
    }

    setError('ไม่พบรหัสพนักงาน หรือเบอร์รถนี้ในระบบ กรุณาตรวจสอบอีกครั้ง');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-sky-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-500/20">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Sprinkle Delivery Rewards
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          ระบบตรวจสอบผลคะแนนและเงินรางวัลมาตรฐานจัดส่ง ({currentMonthLabel})
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 max-w-md w-full p-6 sm:p-8">
        
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">เข้าสู่ระบบ</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ระบุรหัสพนักงานของคุณ หรือเบอร์รถเพื่อดูผลงานและเงินรางวัล
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              รหัสพนักงาน หรือ เบอร์รถ
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ระบุรหัสพนักงาน หรือเบอร์รถ"
                value={inputId}
                onChange={(e) => {
                  setInputId(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 font-medium tracking-wide placeholder:font-normal placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/25 active:scale-[0.99]"
          >
            <span>เข้าสู่ระบบ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Footer */}
      <p className="text-[11px] text-slate-400 mt-6 text-center">
        บริษัท สปริงเคิล คอมมูนิเคชั่นส์ จำกัด • แผนกโลจิสติกส์
      </p>

    </div>
  );
}
