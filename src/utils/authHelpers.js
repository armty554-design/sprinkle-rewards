// Centralized authentication, role-resolution, and RBAC isolation helpers

export const AUTH_SESSION_VERSION = 2;

export const ALLOWED_MANAGEMENT_TABS = [
  'single',
  'vehicles',
  'analytics',
  'kpi_board',
  'executive',
  'audit',
  'excellence_annual',
  'looker_scores',
];

export const RESTRICTED_SELF_TABS = ['single'];

// SHA-256 hex digest of default admin passphrase (override in production with VITE_ADMIN_PASSWORD_HASH)
const DEFAULT_ADMIN_PASSWORD_HASH =
  '2cbc09d9dece0f2698535fe39d011ae97bf93bba999d4c8af8935431dd35a3f7';

export function isSelfOnlyRole(user) {
  return user?.role === 'contractor' || user?.role === 'driver';
}

export function isManagementRole(user) {
  return (
    user?.role === 'admin' ||
    user?.role === 'supervisor' ||
    user?.role === 'office'
  );
}

export function getAllowedTabs(user) {
  return isManagementRole(user) ? ALLOWED_MANAGEMENT_TABS : RESTRICTED_SELF_TABS;
}

export function canAccessTab(user, tabKey) {
  return getAllowedTabs(user).includes(tabKey);
}

export function isValidSessionUser(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.sessionVersion !== AUTH_SESSION_VERSION) return false;
  const empId = String(user.empId || '').trim();
  if (!empId) return false;
  return (
    user.role === 'admin' ||
    user.role === 'supervisor' ||
    user.role === 'office' ||
    user.role === 'contractor' ||
    user.role === 'driver'
  );
}

export function filterVehiclesForUser(vehicles = [], user) {
  if (!Array.isArray(vehicles)) return [];
  if (!user) return [];
  if (isManagementRole(user)) return vehicles;
  if (isSelfOnlyRole(user)) {
    const myEmpId = String(user.empId || '').trim();
    if (!myEmpId) return [];
    return vehicles.filter(
      (v) => String(v?.general?.empId || '').trim() === myEmpId
    );
  }
  return [];
}

export function resolveVehiclePositionRole(vehicle) {
  const pos = String(vehicle?.general?.position || '').trim();
  const carType = String(vehicle?.general?.carType || '').trim();
  if (pos === 'ผู้ประกอบการ' || pos === 'พี่สปริงเคิล' || carType.includes('ผปก')) {
    return { role: 'contractor', roleLabel: 'ผู้ประกอบการ (ผปก.)' };
  }
  return { role: 'driver', roleLabel: 'พนักงานขับรถ' };
}

/**
 * Pure-JS SHA-256 fallback for environments without globalThis.crypto.subtle (e.g. non-HTTPS HTTP).
 */
function sha256PureJs(ascii) {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = (sha256PureJs.h = sha256PureJs.h || []);
  const k = (sha256PureJs.k = sha256PureJs.k || []);
  let primeCounter = k[lengthProperty];

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii[lengthProperty]; i++) {
    const j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (let j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

export async function computeSha256Hex(text) {
  const input = String(text ?? '');
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(input);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fall through to pure JS implementation
    }
  }
  const utf8Bytes = unescape(encodeURIComponent(input));
  return sha256PureJs(utf8Bytes);
}

export async function verifyAdminPassword(password) {
  if (!password) return false;
  const expectedHash =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_PASSWORD_HASH) ||
    DEFAULT_ADMIN_PASSWORD_HASH;
  const digest = await computeSha256Hex(String(password));
  return digest === String(expectedHash).trim().toLowerCase();
}

function* iterateMonthVehicleListsLazily(currentVehicles = [], allMonths = [], parseCSVFn) {
  if (Array.isArray(currentVehicles) && currentVehicles.length > 0) {
    yield currentVehicles;
  }
  if (Array.isArray(allMonths) && typeof parseCSVFn === 'function') {
    for (const m of allMonths) {
      if (!m?.csv) continue;
      try {
        const parsed = parseCSVFn(m);
        const list = parsed?.vehicles;
        if (Array.isArray(list) && list.length > 0 && list !== currentVehicles) {
          yield list;
        }
      } catch {
        // Ignore unparseable month blobs during credential scan
      }
    }
  }
}

/**
 * Resolves login strictly by Employee ID (`empId`), NEVER by `carCode` and NEVER via weak hardcoded backdoors.
 * Checks already-parsed `currentVehicles` FIRST (0ms, zero CSV re-parse) before lazily scanning older months.
 */
export function resolveLoginCredential({
  inputId,
  currentVehicles = [],
  allMonths = [],
  findRegisteredUserFn,
  isStrictModeFn,
  parseCSVFn,
}) {
  const query = String(inputId || '').trim();
  if (!query) {
    return { status: 'error', message: 'กรุณาระบุรหัสพนักงาน' };
  }

  // Explicitly require password challenge if 'admin' is typed; never allow passwordless backdoors
  if (query.toLowerCase() === 'admin') {
    return { status: 'require_admin_password' };
  }

  // 1. Registered / Office staff check
  if (typeof findRegisteredUserFn === 'function') {
    const registered = findRegisteredUserFn(query);
    if (registered) {
      if (registered.status === 'pending') {
        return {
          status: 'error',
          message: `⚠️ รหัสพนักงาน ${registered.empId} อยู่ระหว่างรอแอดมินอนุมัติการเข้าใช้งาน (ตำแหน่ง: ${registered.position || 'ออฟฟิศ'}) กรุณาติดต่อผู้ดูแลระบบ`,
        };
      }
      if (registered.status === 'rejected') {
        return {
          status: 'error',
          message: `❌ คำขอลงทะเบียนไม่ผ่านการอนุมัติ: ${registered.rejectReason || 'กรุณาติดต่อผู้ดูแลระบบ'}`,
        };
      }
      if (registered.status === 'approved') {
        return {
          status: 'ok',
          user: {
            role: 'office',
            empId: registered.empId,
            name: registered.fullName,
            title: `${registered.position || 'เจ้าหน้าที่จัดการ'} (${registered.branch || 'สนญ.'})`,
            branch: registered.branch,
            sessionVersion: AUTH_SESSION_VERSION,
          },
        };
      }
    }
  }

  // 2. Strict Mode gate
  if (typeof isStrictModeFn === 'function' && isStrictModeFn()) {
    return {
      status: 'error',
      message:
        '🔒 ระบบเปิดโหมดความปลอดภัยเข้มงวด: รหัสนี้ยังไม่ได้รับการอนุมัติจากแอดมิน กรุณากดปุ่ม "สมัครเข้าใช้งานสำหรับพนักงาน สำหรับออฟฟิศที่เข้าจัดการ"',
    };
  }

  // 3. Check current vehicles first (instant, 0 CSV parses), then scan older months lazily only if not found
  const matchSupervisorInList = (list) => {
    const sup = list.find(
      (v) =>
        String(v?.general?.supervisorLogisticsId || '').trim() === query ||
        String(v?.general?.supervisorAdminId || '').trim() === query
    );
    if (!sup) return null;
    const isLogistics = String(sup.general.supervisorLogisticsId || '').trim() === query;
    return {
      status: 'ok',
      user: {
        role: 'supervisor',
        empId: query,
        name: isLogistics ? sup.general.supervisorLogisticsName : sup.general.supervisorAdminName,
        title: isLogistics ? 'หัวหน้าโลจิสติกส์' : 'หัวหน้าธุรการ',
        sessionVersion: AUTH_SESSION_VERSION,
      },
    };
  };

  const matchEmployeeInList = (list) => {
    const matched = list.find(
      (v) => String(v?.general?.empId || '').trim() === query
    );
    if (!matched) return null;
    const { role, roleLabel } = resolveVehiclePositionRole(matched);
    return {
      status: 'ok',
      user: {
        role,
        roleLabel,
        empId: String(matched.general.empId).trim(),
        name: matched.general.fullName,
        position: matched.general.position || '',
        carType: matched.general.carType || '',
        branch: matched.general.branch || '',
        sessionVersion: AUTH_SESSION_VERSION,
      },
    };
  };

  // Fast path: check already-parsed current month first for both supervisor and employee!
  if (Array.isArray(currentVehicles) && currentVehicles.length > 0) {
    const supNow = matchSupervisorInList(currentVehicles);
    if (supNow) return supNow;
    const empNow = matchEmployeeInList(currentVehicles);
    if (empNow) return empNow;
  }

  // Fallback path (only for employees/supervisors absent from current month): lazily inspect historical months
  const parseHelper = (m) => {
    if (typeof parseCSVFn !== 'function' || !m?.csv) return null;
    const res = parseCSVFn(m);
    if (res?.vehicles?.length) return res;
    return parseCSVFn(m.csv);
  };

  for (const list of iterateMonthVehicleListsLazily([], allMonths, parseHelper)) {
    const supResult = matchSupervisorInList(list);
    if (supResult) return supResult;
  }

  for (const list of iterateMonthVehicleListsLazily([], allMonths, parseHelper)) {
    const empResult = matchEmployeeInList(list);
    if (empResult) return empResult;
  }

  return {
    status: 'error',
    message: 'ไม่พบรหัสพนักงานนี้ในระบบ (กรุณาตรวจสอบรหัสพนักงานของท่าน)',
  };
}
