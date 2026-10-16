// Employee registration & Admin approval management utility

const STORAGE_USERS_KEY = 'sprinkle_registered_users';
const STORAGE_STRICT_MODE_KEY = 'sprinkle_require_approval_strict';

// Initial seed demo requests so admin can test the approval flow immediately
const INITIAL_USERS = [
  {
    id: 'reg_demo_1',
    empId: '50991',
    fullName: 'สมชาย จัดส่งดี',
    phone: '089-111-2233',
    carCode: 'รถ 201',
    branch: 'สาขา 1 (สนญ.)',
    groupNumber: '2',
    role: 'driver',
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    registeredAt: '16 ต.ค. 2569 16:30',
    note: 'พนักงานขับรถสายส่งใหม่ ขอเข้าดูผลคะแนน'
  },
  {
    id: 'reg_demo_2',
    empId: '50992',
    fullName: 'ประวิทย์ ขยันส่ง',
    phone: '081-999-8877',
    carCode: 'รถ 203',
    branch: 'สาขา 1 (สนญ.)',
    groupNumber: '3',
    role: 'driver',
    status: 'pending',
    registeredAt: '16 ต.ค. 2569 17:05',
    note: 'ส่งคำขอผ่านมือถือ'
  }
];

export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to get registered users:', err);
    return [];
  }
}

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
    (u.empId && u.empId.toLowerCase() === q) || 
    (u.carCode && u.carCode.toLowerCase() === q)
  ) || null;
}

export function registerUser({ empId, fullName, phone, carCode = '', branch = 'สาขา 1 (สนญ.)', groupNumber = '', note = '' }) {
  const users = getRegisteredUsers();
  const cleanEmpId = empId.trim();
  const cleanFullName = fullName.trim();
  const cleanPhone = phone.trim();

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
        message: `รหัสพนักงาน ${cleanEmpId} ได้ส่งคำขอไว้แล้วเมื่อ ${existing.registeredAt} (อยู่ระหว่างรอแอดมินอนุมัติ)`
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
      phone: cleanPhone,
      carCode: carCode.trim(),
      branch,
      groupNumber,
      note: note.trim(),
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
    phone: cleanPhone,
    carCode: carCode.trim(),
    branch,
    groupNumber,
    role: 'driver',
    status: 'pending', // always pending until admin approves
    registeredAt: thaiDate,
    approvedAt: null,
    approvedBy: null,
    rejectReason: null,
    note: note.trim()
  };

  const updatedUsers = [newUser, ...users];
  saveRegisteredUsers(updatedUsers);

  return {
    success: true,
    message: 'ลงทะเบียนสำเร็จ! ข้อมูลของคุณถูกส่งไปยังผู้ดูแลระบบเรียบร้อยแล้ว กรุณารอแอดมินอนุมัติก่อนเข้าใช้งาน',
    user: newUser
  };
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

export function rejectUser(userId, reason = 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง', adminName = 'ผู้ดูแลระบบ') {
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
