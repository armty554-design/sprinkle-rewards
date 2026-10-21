// Office staff & Management registration & Admin approval management utility
import { OFFICE_STAFF_LIST, findOfficeStaffByEmpId, OFFICE_BRANCH_LIST } from '../data/officeStaffData';

const STORAGE_USERS_KEY = 'sprinkle_registered_users';
const STORAGE_STRICT_MODE_KEY = 'sprinkle_require_approval_strict';

// Pre-approved office staff list from official IMPORTRANGE roster
const DEFAULT_OFFICE_USERS = OFFICE_STAFF_LIST.map(staff => ({
  id: 'office_' + staff.empId,
  empId: staff.empId,
  fullName: staff.fullName,
  position: staff.position,
  branch: staff.branch,
  zone: staff.zone,
  role: 'office',
  canUpload: true,
  status: 'approved',
  registeredAt: 'นำเข้าจากระบบ',
  approvedAt: 'อนุมัติอัตโนมัติ (รายชื่อออฟฟิศ)',
  approvedBy: 'ระบบ'
}));

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    const customList = raw ? JSON.parse(raw) : [];
    const validCustom = Array.isArray(customList) 
      ? customList.filter(u => u && !u.id?.startsWith('reg_demo') && u.empId !== 'OF001')
      : [];
    
    // Combine custom users (who may override or add new entries) with the 101 office staff list
    const customEmpIds = new Set(validCustom.map(u => u.empId.toLowerCase()));
    const remainingDefaults = DEFAULT_OFFICE_USERS.filter(u => !customEmpIds.has(u.empId.toLowerCase()));
    
    return [...validCustom, ...remainingDefaults];
  } catch (err) {
    console.error('Failed to get registered users:', err);
    return DEFAULT_OFFICE_USERS;
  }
}

export { findOfficeStaffByEmpId, OFFICE_BRANCH_LIST };

export function saveRegisteredUsers(users) {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    // Trigger custom event so any active component can re-render immediately
    window.dispatchEvent(new Event('sprinkle_users_updated'));
    return true;
  } catch (err) {
    console.error('Failed to save registered users:', err);
    return false;
  }
}

export function getPendingUsersCount() {
  const users = getRegisteredUsers();
  return users.filter(u => u.status === 'pending').length;
}

export function isStrictModeEnabled() {
  try {
    return localStorage.getItem(STORAGE_STRICT_MODE_KEY) === 'true';
  } catch (err) {
    return false;
  }
}

export function setStrictModeEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_STRICT_MODE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('sprinkle_users_updated'));
    return true;
  } catch (err) {
    return false;
  }
}

export function findRegisteredUser(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.find(u => 
    u.empId && u.empId.toLowerCase() === q
  ) || null;
}

export function registerOfficeUser({ empId, fullName, firstName = '', lastName = '', position, branch }) {
  const users = getRegisteredUsers();
  const cleanEmpId = empId.trim();
  const cleanFullName = (fullName || `${firstName} ${lastName}`).trim();
  const cleanPos = position.trim();
  const cleanBranch = branch.trim();

  // Check if this empId is already registered
  const existingIndex = users.findIndex(u => u.empId.toLowerCase() === cleanEmpId.toLowerCase());
  
  const now = new Date();
  const thaiDate = now.toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (existingIndex !== -1) {
    const existing = users[existingIndex];
    if (existing.status === 'pending') {
      return {
        success: false,
        message: `รหัสพนักงาน ${cleanEmpId} ได้ส่งคำขอลงทะเบียนไว้แล้ว (อยู่ระหว่างรอแอดมินอนุมัติ)`
      };
    }
    if (existing.status === 'approved') {
      return {
        success: false,
        message: `รหัสพนักงาน ${cleanEmpId} ได้รับการอนุมัติในระบบเรียบร้อยแล้ว สามารถเข้าสู่ระบบได้ทันที!`
      };
    }
    // If was rejected, update and resubmit as pending
    users[existingIndex] = {
      ...existing,
      fullName: cleanFullName,
      position: cleanPos,
      branch: cleanBranch,
      role: 'office',
      canUpload: true,
      status: 'pending',
      registeredAt: thaiDate,
      rejectReason: null
    };
    saveRegisteredUsers(users);
    return {
      success: true,
      message: 'ส่งคำขอสมัครใหม่อีกครั้งเรียบร้อยแล้ว กรุณารอแอดมินตรวจสอบและอนุมัติ',
      user: users[existingIndex]
    };
  }

  const newUser = {
    id: 'user_' + Date.now(),
    empId: cleanEmpId,
    fullName: cleanFullName,
    position: cleanPos,
    branch: cleanBranch,
    role: 'office', // Office management role with upload rights
    canUpload: true,
    status: 'pending', // always pending until admin approves
    registeredAt: thaiDate,
    approvedAt: null,
    approvedBy: null,
    rejectReason: null
  };

  const updatedUsers = [newUser, ...users];
  saveRegisteredUsers(updatedUsers);

  return {
    success: true,
    message: 'ลงทะเบียนสำเร็จ! ข้อมูลของคุณถูกส่งไปยังผู้ดูแลระบบเรียบร้อยแล้ว กรุณารอแอดมินอนุมัติก่อนเข้าใช้งาน',
    user: newUser
  };
}

export function addOfficeUserDirectly({ empId, fullName, position, branch, adminName = 'ผู้ดูแลระบบ' }) {
  const users = getRegisteredUsers();
  const cleanEmpId = empId.trim();
  const cleanFullName = fullName.trim();
  const cleanPos = position.trim();
  const cleanBranch = branch.trim();

  const now = new Date();
  const thaiDate = now.toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const existingIndex = users.findIndex(u => u.empId.toLowerCase() === cleanEmpId.toLowerCase());
  let userObj;

  if (existingIndex !== -1) {
    users[existingIndex] = {
      ...users[existingIndex],
      fullName: cleanFullName,
      position: cleanPos,
      branch: cleanBranch,
      role: 'office',
      canUpload: true,
      status: 'approved',
      approvedAt: thaiDate,
      approvedBy: adminName,
      rejectReason: null
    };
    userObj = users[existingIndex];
  } else {
    userObj = {
      id: 'user_' + Date.now(),
      empId: cleanEmpId,
      fullName: cleanFullName,
      position: cleanPos,
      branch: cleanBranch,
      role: 'office',
      canUpload: true,
      status: 'approved',
      registeredAt: thaiDate,
      approvedAt: thaiDate,
      approvedBy: adminName,
      rejectReason: null
    };
    users.unshift(userObj);
  }

  saveRegisteredUsers(users);
  return { success: true, user: userObj, users };
}

export function approveUser(userId, adminName = 'ผู้ดูแลระบบ') {
  const users = getRegisteredUsers();
  const now = new Date();
  const thaiDate = now.toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const updatedUsers = users.map(u => {
    if (u.id === userId) {
      return {
        ...u,
        status: 'approved',
        approvedAt: thaiDate,
        approvedBy: adminName,
        rejectReason: null
      };
    }
    return u;
  });

  saveRegisteredUsers(updatedUsers);
  return updatedUsers;
}

export function rejectUser(userId, reason = 'ข้อมูลไม่ครบถ้วนหรือไม่ได้รับอนุญาต', adminName = 'ผู้ดูแลระบบ') {
  const users = getRegisteredUsers();
  const now = new Date();
  const thaiDate = now.toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const updatedUsers = users.map(u => {
    if (u.id === userId) {
      return {
        ...u,
        status: 'rejected',
        rejectedAt: thaiDate,
        rejectedBy: adminName,
        rejectReason: reason
      };
    }
    return u;
  });

  saveRegisteredUsers(updatedUsers);
  return updatedUsers;
}

export function deleteUser(userId) {
  const users = getRegisteredUsers();
  const updatedUsers = users.filter(u => u.id !== userId);
  saveRegisteredUsers(updatedUsers);
  return updatedUsers;
}
