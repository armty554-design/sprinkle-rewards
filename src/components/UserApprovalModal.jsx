import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck, 
  UserX, 
  Search, 
  ShieldCheck, 
  Phone, 
  Truck, 
  Trash2, 
  AlertTriangle,
  RefreshCw,
  Layers,
  Check
} from 'lucide-react';
import { 
  getRegisteredUsers, 
  approveUser, 
  rejectUser, 
  deleteUser, 
  isStrictModeEnabled, 
  setStrictModeEnabled 
} from '../utils/userManagement';

export default function UserApprovalModal({ isOpen, onClose, currentAdminName = 'ผู้ดูแลระบบ', onUsersChanged }) {
  const [users, setUsers] = useState(() => getRegisteredUsers());
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [strictMode, setStrictMode] = useState(() => isStrictModeEnabled());
  const [rejectingUserId, setRejectingUserId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

  const refreshUsers = () => {
    const list = getRegisteredUsers();
    setUsers(list);
    if (onUsersChanged) onUsersChanged(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshUsers();
      setStrictMode(isStrictModeEnabled());
    }
  }, [isOpen]);

  const handleApprove = (userId, name) => {
    const updated = approveUser(userId, currentAdminName);
    setUsers(updated);
    if (onUsersChanged) onUsersChanged(updated);
    showNotice(`อนุมัติสิทธิ์การเข้าใช้งานให้ "${name}" สำเร็จ`, 'success');
  };

  const handleOpenRejectModal = (userId) => {
    setRejectingUserId(userId);
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectingUserId) return;
    const target = users.find(u => u.id === rejectingUserId);
    const updated = rejectUser(rejectingUserId, rejectReason || 'ข้อมูลไม่ถูกต้องหรือไม่ได้รับอนุญาต', currentAdminName);
    setUsers(updated);
    if (onUsersChanged) onUsersChanged(updated);
    showNotice(`ปฏิเสธคำขอของ "${target?.fullName || 'พนักงาน'}" แล้ว`, 'info');
    setRejectingUserId(null);
  };

  const handleDelete = (userId, name) => {
    if (window.confirm(`ต้องการลบรายการของ "${name}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = deleteUser(userId);
      setUsers(updated);
      if (onUsersChanged) onUsersChanged(updated);
      showNotice(`ลบข้อมูล "${name}" เรียบร้อยแล้ว`, 'info');
    }
  };

  const handleApproveAllPending = () => {
    const pendingList = users.filter(u => u.status === 'pending');
    if (pendingList.length === 0) return;
    if (window.confirm(`ยืนยันการอนุมัติพนักงานที่รออยู่ทั้งหมด ${pendingList.length} คน?`)) {
      pendingList.forEach(u => approveUser(u.id, currentAdminName));
      refreshUsers();
      showNotice(`อนุมัติพนักงานทั้งหมด ${pendingList.length} คนเรียบร้อยแล้ว`, 'success');
    }
  };

  const handleToggleStrictMode = (e) => {
    const val = e.target.checked;
    setStrictMode(val);
    setStrictModeEnabled(val);
    showNotice(val ? 'เปิดโหมดเข้มงวด: ต้องได้รับอนุมัติจากแอดมินก่อนทุกคน' : 'ปิดโหมดเข้มงวด: พนักงานที่มีในระบบเดิมเข้าใช้งานได้ปกติ', 'info');
  };

  const showNotice = (msg, type = 'success') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (u.status !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const empId = (u.empId || '').toLowerCase();
        const name = (u.fullName || '').toLowerCase();
        const car = (u.carCode || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        if (!empId.includes(q) && !name.includes(q) && !car.includes(q) && !phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [users, activeTab, searchQuery]);

  const pendingCount = users.filter(u => u.status === 'pending').length;
  const approvedCount = users.filter(u => u.status === 'approved').length;
  const rejectedCount = users.filter(u => u.status === 'rejected').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">จัดการและอนุมัติสิทธิ์เข้าใช้งาน</h2>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full animate-pulse">
                    รออนุมัติ {pendingCount} คน
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                ระบบตรวจสอบและอนุมัติพนักงานขนส่ง Sprinkle Delivery Rewards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            actionNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-sky-50 text-sky-800 border-b border-sky-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice.msg}</span>
          </div>
        )}

        {/* Security Strict Mode Toggle & Controls */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={handleToggleStrictMode}
              className="w-4 h-4 text-sky-600 rounded-sm border-slate-300 focus:ring-sky-500"
            />
            <span className="text-slate-700 font-medium">
              <strong>บังคับอนุมัติทุกคน (Strict Mode):</strong> พนักงานทุกคนต้องสมัครและได้รับการอนุมัติจึงจะล็อกอินได้
            </span>
          </label>

          {activeTab === 'pending' && pendingCount > 1 && (
            <button
              onClick={handleApproveAllPending}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>อนุมัติทั้งหมด ({pendingCount})</span>
            </button>
          )}
        </div>

        {/* Tabs and Search Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>รออนุมัติ</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'approved'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>อนุมัติแล้ว</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {approvedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'rejected'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-rose-500" />
              <span>ปฏิเสธ/ระงับ</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                {rejectedCount}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหารหัส, ชื่อ, เบอร์รถ, โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* User Cards List */}
        <div className="p-5 overflow-y-auto space-y-3 grow bg-slate-50/50">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-2">
                <Layers className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">ไม่มีรายการในแท็บนี้</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'pending' ? 'ไม่มีคำขอที่รอการอนุมัติอยู่ในขณะนี้' : 'ยังไม่มีข้อมูล'}
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* User Info */}
                <div className="space-y-1.5 grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-black bg-sky-100 text-sky-800">
                      รหัส {u.empId}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {u.fullName}
                    </h3>
                    {u.carCode && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                        <Truck className="w-3 h-3 text-sky-500" />
                        {u.carCode}
                      </span>
                    )}
                    {u.groupNumber && (
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        กลุ่ม {u.groupNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {u.phone && (
                      <a 
                        href={`tel:${u.phone}`} 
                        className="flex items-center gap-1 hover:text-sky-600 transition-colors"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{u.phone}</span>
                      </a>
                    )}
                    <span>•</span>
                    <span>สาขา: {u.branch || 'สาขา 1 (สนญ.)'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      สมัครเมื่อ: {u.registeredAt}
                    </span>
                  </div>

                  {u.note && (
                    <div className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-600 mt-1">
                      <strong className="text-slate-700">หมายเหตุ:</strong> {u.note}
                    </div>
                  )}

                  {/* Status Badges for Approved / Rejected */}
                  {u.status === 'approved' && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>อนุมัติแล้วเมื่อ {u.approvedAt} โดย {u.approvedBy}</span>
                    </div>
                  )}

                  {u.status === 'rejected' && (
                    <div className="text-[11px] text-rose-700 flex items-center gap-1.5 font-medium pt-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>ปฏิเสธเมื่อ {u.rejectedAt} (เหตุผล: {u.rejectReason || 'ไม่ได้ระบุ'})</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {u.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(u.id, u.fullName)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติ</span>
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(u.id)}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-colors active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ปฏิเสธ</span>
                      </button>
                    </>
                  )}

                  {u.status === 'approved' && (
                    <>
                      <button
                        onClick={() => handleOpenRejectModal(u.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors"
                        title="ระงับสิทธิ์การใช้งาน"
                      >
                        ระงับสิทธิ์
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.fullName)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบออกจากระบบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {u.status === 'rejected' && (
                    <>
                      <button
                        onClick={() => handleApprove(u.id, u.fullName)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors"
                      >
                        เปลี่ยนเป็นอนุมัติ
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.fullName)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบออกจากระบบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            รวมทั้งหมด {users.length} รายการ (อนุมัติแล้ว {approvedCount} คน)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* Reject Reason Confirmation Prompt */}
      {rejectingUserId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>ระบุเหตุผลในการปฏิเสธ</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              พนักงานจะเห็นเหตุผลนี้เมื่อพยายามเข้าสู่ระบบ
            </p>
            <input
              type="text"
              placeholder="เช่น ไม่พบชื่อในแผนก หรือข้อมูลไม่ถูกต้อง"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setRejectingUserId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
