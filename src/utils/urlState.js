// URL Deep-Linking state parser, builder, and RBAC sanitizer
import { isManagementRole, isSelfOnlyRole, canAccessTab } from './authHelpers.js';
import { normalizeMonthKey } from './monthStorage.js';

export const VALID_TABS = [
  'single',
  'vehicles',
  'analytics',
  'executive',
  'audit',
  'excellence_annual',
  'looker_scores',
];

export const VALID_MOBILE_TABS = [
  'summary',
  'defects',
  'all_items',
  'executive',
  'audit',
];

export const RESTRICTED_MOBILE_TABS = ['summary', 'defects', 'all_items'];

export const VALID_EXEC_SUBTABS = ['branches', 'trend', 'head2head'];

const PATH_TAB_ALIASES = {
  single: 'single',
  vehicles: 'vehicles',
  analytics: 'analytics',
  executive: 'executive',
  audit: 'audit',
  excellence: 'excellence_annual',
  excellence_annual: 'excellence_annual',
  looker: 'looker_scores',
  looker_scores: 'looker_scores',
};

/**
 * Normalizes Vite BASE_URL so both root ('/') and subpath ('/sprinkle-rewards/') deployments work cleanly.
 */
export function normalizeBasePath(basePath = import.meta?.env?.BASE_URL || '/') {
  let b = String(basePath || '/').trim();
  if (!b.startsWith('/')) b = `/${b}`;
  if (!b.endsWith('/')) b = `${b}/`;
  return b;
}

/**
 * Parses URL search parameters (and optional clean path aliases) into structured deep-link state.
 */
export function parseUrlState(
  search = '',
  pathname = '/',
  basePath = import.meta?.env?.BASE_URL || '/'
) {
  const params = new URLSearchParams(search || '');
  const normBase = normalizeBasePath(basePath);
  const rawPath = String(pathname || '/');
  let strippedPath = rawPath;
  if (normBase !== '/') {
    const baseNoTrail = normBase.slice(0, -1);
    if (rawPath === baseNoTrail || rawPath.startsWith(normBase)) {
      strippedPath = rawPath.slice(baseNoTrail.length) || '/';
    }
  }
  const cleanPath = strippedPath
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();

  const rawTab = String(params.get('tab') || '').trim();
  const aliasTab = PATH_TAB_ALIASES[cleanPath] || null;
  const candidateTab = rawTab || aliasTab || null;
  const tab = candidateTab && VALID_TABS.includes(candidateTab) ? candidateTab : null;

  const rawMonth = String(params.get('month') || '').trim();
  const normMonth = rawMonth ? normalizeMonthKey(rawMonth) : '';
  const month = /^25[0-9]{2}-[0-9]{2}$/.test(normMonth) ? normMonth : null;

  const rawCar = String(params.get('car') || '').trim();
  const car = rawCar || null;

  const rawBranch = String(params.get('branch') || '').trim();
  const branch =
    rawBranch && rawBranch.toLowerCase() !== 'all' ? rawBranch : null;

  const rawSubtab = String(params.get('subtab') || '').trim();
  const subtab = VALID_EXEC_SUBTABS.includes(rawSubtab) ? rawSubtab : null;

  const rawMtab = String(params.get('mtab') || '').trim();
  const mtab = VALID_MOBILE_TABS.includes(rawMtab) ? rawMtab : null;

  const hasParams = Boolean(
    tab || month || car || branch || subtab || mtab
  );

  return {
    tab,
    month,
    car,
    branch,
    subtab,
    mtab,
    hasParams,
  };
}

/**
 * Enforces RBAC isolation on parsed URL state before applying it to an authenticated session.
 */
export function sanitizeUrlStateForUser(
  parsedState,
  user,
  { visibleVehicles = [], availableMonthKeys = [] } = {}
) {
  const safeInput = parsedState || {};
  const validMonth =
    safeInput.month &&
    (availableMonthKeys.length === 0 || availableMonthKeys.includes(safeInput.month))
      ? safeInput.month
      : null;

  if (!user) {
    return {
      tab: safeInput.tab || 'single',
      month: validMonth,
      car: safeInput.car || null,
      branch: safeInput.branch || null,
      subtab: safeInput.subtab || 'branches',
      mtab: safeInput.mtab || 'summary',
    };
  }

  // Self-only roles (ผปก. / พนักงานขับรถ) cannot access management tabs, other branches, or other drivers' cars
  if (isSelfOnlyRole(user)) {
    const matchedOwnCar =
      safeInput.car && Array.isArray(visibleVehicles)
        ? visibleVehicles.find(
            (v) =>
              String(v?.general?.carCode || '').trim() === safeInput.car ||
              String(v?.id || '').trim() === safeInput.car
          )
        : null;

    const resolvedCar =
      matchedOwnCar?.general?.carCode ||
      visibleVehicles[0]?.general?.carCode ||
      null;

    const safeMtab = RESTRICTED_MOBILE_TABS.includes(safeInput.mtab)
      ? safeInput.mtab
      : 'summary';

    return {
      tab: 'single',
      month: validMonth,
      car: resolvedCar,
      branch: null,
      subtab: null,
      mtab: safeMtab,
    };
  }

  // Management roles (admin / supervisor / office)
  const safeTab =
    safeInput.tab && canAccessTab(user, safeInput.tab) ? safeInput.tab : 'single';

  let resolvedCar = null;
  if (safeInput.car) {
    if (Array.isArray(visibleVehicles) && visibleVehicles.length > 0) {
      const matched = visibleVehicles.find(
        (v) =>
          String(v?.general?.carCode || '').trim() === safeInput.car ||
          String(v?.id || '').trim() === safeInput.car
      );
      resolvedCar = matched?.general?.carCode || visibleVehicles[0]?.general?.carCode || null;
    } else {
      resolvedCar = safeInput.car;
    }
  }

  // Derive mobile tab coherently if coming from a desktop executive/audit link
  let safeMtab = 'summary';
  if (safeTab === 'executive') {
    safeMtab = 'executive';
  } else if (safeTab === 'audit') {
    safeMtab = 'audit';
  } else if (safeInput.mtab && VALID_MOBILE_TABS.includes(safeInput.mtab)) {
    safeMtab = safeInput.mtab;
  }

  return {
    tab: safeTab,
    month: validMonth,
    car: resolvedCar,
    branch: safeInput.branch || null,
    subtab: safeInput.subtab || 'branches',
    mtab: safeMtab,
  };
}

/**
 * Builds canonical relative URL ("/?tab=..." or "/sprinkle-rewards/?tab=...") omitting defaults and disallowed params.
 */
export function buildCanonicalUrl(
  state = {},
  user = null,
  basePath = import.meta?.env?.BASE_URL || '/'
) {
  const normBase = normalizeBasePath(basePath);
  const canManage = isManagementRole(user);
  const effectiveTab =
    canManage && state.tab && canAccessTab(user, state.tab) ? state.tab : 'single';

  const params = new URLSearchParams();
  params.set('tab', effectiveTab);

  if (state.month) {
    params.set('month', state.month);
  }

  if (effectiveTab === 'single' && state.car) {
    params.set('car', state.car);
  }

  if (canManage) {
    if (
      (effectiveTab === 'analytics' ||
        effectiveTab === 'vehicles' ||
        effectiveTab === 'executive') &&
      state.branch &&
      String(state.branch).toLowerCase() !== 'all'
    ) {
      params.set('branch', state.branch);
    }

    if (effectiveTab === 'executive' && state.subtab && state.subtab !== 'branches') {
      params.set('subtab', state.subtab);
    }
  }

  if (
    state.mtab &&
    state.mtab !== 'summary' &&
    effectiveTab === 'single' &&
    (canManage ? VALID_MOBILE_TABS.includes(state.mtab) : RESTRICTED_MOBILE_TABS.includes(state.mtab))
  ) {
    params.set('mtab', state.mtab);
  }

  const qs = params.toString();
  return qs ? `${normBase}?${qs}` : normBase;
}
