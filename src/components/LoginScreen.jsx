import React, { useState } from 'react';
import { 
  Truck, 
  ArrowRight, 
  User, 
  AlertCircle, 
  UserPlus, 
  ArrowLeft, 
  Clock, 
  Building2,
  Briefcase,
  BadgeCheck
} from 'lucide-react';
import { 
  registerOfficeUser, 
  findRegisteredUser, 
  isStrictModeEnabled 
} from '../utils/userManagement';

export default function LoginScreen({ vehicles = [], onLogin, currentMonthLabel }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'success'
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState('');
  
  // Registration Form State (Office Management only: รหัส, ชื่อ, นามสกุล, ตำแหน่ง, สาขา)
  const [regEmpId, setRegEmpId] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPosition, setRegPosition] = useState('');
  const [regBranch, setRegBranch] = useState('สาขา 1 (สนญ.)');
  const [registeredUserObj, setRegisteredUserObj] = useState(null);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    const query = inputId.trim();
    if (!query) {
      setError('กรุณาระบุรหัสพนักงาน หรือเบอร์รถ');
      return;
    }

    // 1. Admin login bypass
    if (query.toLowerCase() === 'admin' || query === '1111' || query === '0000' || query === '99999') {
      onLogin({
        role: 'admin',
        empId: 'ADMIN',
        name: 'ผู้ดูแลระบบสาขา',
        title: 'ผู้จัดการ / แอดมิน'
      });
      return;
    }

    // 2. Check registered office staff list for approval status
    const registered = findRegisteredUser(query);
    if (registered) {
      if (registered.status === 'pending') {
        setError(`⚠️ รหัสพนักงาน ${registered.empId} อยู่ระหว่างรอแอดมินอนุมัติการเข้าใช้งาน (ตำแหน่ง: ${registered.position || 'ออฟฟิศ'}) กรุณาติดต่อผู้ดูแลระบบ`);
        return;
      }
      if (registered.status === 'rejected') {
        setError(`❌ คำขอลงทะเบียนไม่ผ่านการอนุมัติ: ${registered.rejectReason || 'กรุณาติดต่อผู้ดูแลระบบ'}`);
        return;
      }
      if (registered.status === 'approved') {
        onLogin({
          role: 'office',
          empId: registered.empId,
          name: registered.fullName,
          title: `${registered.position || 'เจ้าหน้าที่จัดการ'} (${registered.branch || 'สนญ.'})`,
          branch: registered.branch
        });
        return;
      }
    }

    // 3. If Strict Mode is enabled, unapproved users cannot login
    if (isStrictModeEnabled()) {
      setError('🔒 ระบบเปิดโหมดความปลอดภัยเข้มงวด: รหัสนี้ยังไม่ได้รับการอนุมัติจากแอดมิน กรุณากดปุ่ม "สมัครเข้าใช้งานสำหรับพนักงาน สำหรับออฟฟิศที่เข้าจัดการ"');
      return;
    }

    // 4. Default mode: check matching driver vehicle by empId or carCode in CSV
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

    // 5. Check matching supervisor in CSV
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

    setError('ไม่พบรหัสพนักงาน หรือเบอร์รถนี้ในระบบ');
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!regEmpId.trim()) {
      setError('กรุณาระบุรหัสพนักงาน');
      return;
    }
    if (!regFirstName.trim()) {
      setError('กรุณาระบุชื่อ');
      return;
    }
    if (!regLastName.trim()) {
      setError('กรุณาระบุนามสกุล');
      return;
    }
    if (!regPosition.trim()) {
      setError('กรุณาระบุตำแหน่ง');
      return;
    }
    if (!regBranch.trim()) {
      setError('กรุณาระบุสาขา');
      return;
    }

    const res = registerOfficeUser({
      empId: regEmpId,
      firstName: regFirstName,
      lastName: regLastName,
      position: regPosition,
      branch: regBranch
    });

    if (!res.success) {
      setError(res.message);
      return;
    }

    setRegisteredUserObj(res.user);
    setMode('success');
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

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 max-w-md w-full p-6 sm:p-8 transition-all">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">เข้าสู่ระบบ</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ระบุรหัสพนักงานของคุณ หรือเบอร์รถเพื่อเข้าใช้งานระบบ
              </p>
            </div>

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
                className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-500/25 active:scale-[0.99] cursor-pointer"
              >
                <span>เข้าสู่ระบบ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2.5 text-slate-400 font-medium">สำหรับเจ้าหน้าที่</span>
              </div>
            </div>

            {/* Register Button: "สมัครเข้าใช้งานสำหรับพนักงาน สำหรับออฟฟิศที่เข้าจัดการ" */}
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200/90 transition-all cursor-pointer leading-tight text-center"
            >
              <UserPlus className="w-4 h-4 text-sky-500 shrink-0" />
              <span>สมัครเข้าใช้งานสำหรับพนักงาน สำหรับออฟฟิศที่เข้าจัดการ</span>
            </button>
          </>
        )}

        {/* 2. REGISTER MODE (เฉพาะ: รหัส, ชื่อ, นามสกุล, ตำแหน่ง, สาขา) */}
        {mode === 'register' && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  สมัครเข้าใช้งานสำหรับพนักงาน
                </h2>
                <p className="text-xs text-sky-600 font-medium mt-0.5">
                  สำหรับออฟฟิศที่เข้าจัดการระบบ (ต้องรอแอดมินอนุมัติ)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="กลับหน้าเข้าสู่ระบบ"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* 1. รหัสพนักงาน */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสพนักงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ระบุรหัสพนักงาน"
                  value={regEmpId}
                  onChange={(e) => setRegEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                  autoFocus
                />
              </div>

              {/* 2. ชื่อ & 3. นามสกุล */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุชื่อจริง"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="ระบุนามสกุล"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </div>
              </div>

              {/* 4. ตำแหน่ง */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ตำแหน่ง <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ระบุตำแหน่งงาน"
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </div>
              </div>

              {/* 5. สาขา */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  สาขา <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                    required
                  >
                    <option value="สาขา 1 (สนญ.)">สาขา 1 (สนญ.)</option>
                    <option value="สาขา 2 (บางพลี)">สาขา 2 (บางพลี)</option>
                    <option value="สาขา 3 (พุทธมณฑล)">สาขา 3 (พุทธมณฑล)</option>
                    <option value="สาขา 4 (รังสิต)">สาขา 4 (รังสิต)</option>
                    <option value="สำนักงานใหญ่">สำนักงานใหญ่</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="w-1/3 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/25 transition-all cursor-pointer"
                >
                  <span>ส่งคำขอสมัคร</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </>
        )}

        {/* 3. SUCCESS / PENDING NOTICE MODE */}
        {mode === 'success' && registeredUserObj && (
          <div className="text-center py-2 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                ส่งคำขอลงทะเบียนสำเร็จ!
              </h2>
              <div className="inline-block mt-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                สถานะ: รอแอดมินอนุมัติสิทธิ์การเข้าจัดการ
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">รหัสพนักงาน:</span>
                <strong className="text-slate-800">{registeredUserObj.empId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ชื่อ - นามสกุล:</span>
                <strong className="text-slate-800">{registeredUserObj.fullName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ตำแหน่ง:</span>
                <strong className="text-slate-800">{registeredUserObj.position}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">สาขา:</span>
                <strong className="text-slate-800">{registeredUserObj.branch}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ยื่นคำขอเมื่อ:</span>
                <span className="text-slate-700">{registeredUserObj.registeredAt}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              ข้อมูลของคุณได้ส่งเข้าสู่ระบบแล้ว เมื่อผู้ดูแลระบบ (แอดมิน) อนุมัติสิทธิ์ คุณจะสามารถนำรหัสพนักงานนี้เข้าสู่ระบบเพื่อจัดการข้อมูลได้ทันที
            </p>

            <button
              type="button"
              onClick={() => {
                setInputId(registeredUserObj.empId);
                setMode('login');
                setError('');
              }}
              className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/25 transition-all cursor-pointer"
            >
              <span>กลับสู่หน้าเข้าสู่ระบบ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-slate-400">
          บริษัท สปริงเคิล คอมมูนิเคชั่นส์ จำกัด • แผนกโลจิสติกส์
        </p>
      </div>

    </div>
  );
}
